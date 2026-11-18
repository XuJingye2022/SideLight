import assert from 'node:assert/strict'
import test from 'node:test'

import { typedLink, type TypedLinkInput } from './linkInput.ts'

/**
 * 第 84 轮 B-124：手打 `[文本](目标 "标题")` 曾被存成 `\[文本\](目标 "标题")`（只丢语义、不丢字符）。
 * 触发点是「光标刚跨过收尾 `)`」：自动配对开着时最后那枚 `)` 是 skip（`docChanged=false`），
 * 所以判定拆成纯函数 `typedLink`，这里直接喂「光标前文本」的前后两版。
 *
 * 三个必须为 null 的负向（验收口径）：点段尾、整段粘贴、在旧字面链接里插字。
 */

/** 手打收尾的公共形状：光标前进 1 位，旧文本是新文本去掉末位 */
function typed(newText: string, opts?: { docChanged?: boolean; oldText?: string }): TypedLinkInput {
  const docChanged = opts?.docChanged ?? false
  return {
    docChanged,
    insertedLength: 1,
    oldRangeText: opts?.oldText ?? newText.slice(0, -1),
    newRangeText: newText,
  }
}

test('手打收尾（自动配对 skip）：[乙](https://example.com "标题") 命中', () => {
  const hit = typedLink(typed('[乙](https://example.com "标题")'))
  assert.deepEqual(hit, {
    text: '乙',
    href: 'https://example.com',
    title: '标题',
    match: '[乙](https://example.com "标题")',
  })
})

test('关掉自动配对（真插入收尾 )）也命中', () => {
  const hit = typedLink(typed('[乙](https://example.com)', { docChanged: true }))
  assert.equal(hit?.href, 'https://example.com')
  assert.equal(hit?.title, null)
})

test('前面还有别的字：只吃最后一整段链接', () => {
  const hit = typedLink(typed('见 [甲](https://a.com/x?y=1#z "说明")。'))
  assert.equal(hit, null, '句号在收尾 ) 之后，光标不在 ) 上 → 不算收尾')
  const hit2 = typedLink(typed('见 [甲](https://a.com/x?y=1#z "说明")'))
  assert.equal(hit2?.text, '甲')
  assert.equal(hit2?.href, 'https://a.com/x?y=1#z')
  assert.equal(hit2?.title, '说明')
})

test('标题可以是空串（"")，只保留 href', () => {
  const hit = typedLink(typed('[乙](https://example.com "")'))
  assert.equal(hit?.title, '')
  assert.equal(hit?.href, 'https://example.com')
})

test('负向 1：点段尾（光标没前进）不命中', () => {
  assert.equal(typedLink({ docChanged: false, insertedLength: 0, oldRangeText: '[乙](u)', newRangeText: '[乙](u)' }), null)
})

test('负向 1b：纯选区移动（前后同一段文本）不命中', () => {
  const same = '[乙](https://example.com)'
  assert.equal(typedLink({ docChanged: false, insertedLength: 1, oldRangeText: same, newRangeText: same }), null)
})

test('负向 2：整段粘贴（一次写入长度 ≥ 候选区长度）不命中', () => {
  const pasted = '[乙](https://example.com)'
  assert.equal(typedLink({ docChanged: true, insertedLength: pasted.length, oldRangeText: '', newRangeText: pasted }), null)
  assert.equal(
    typedLink({ docChanged: true, insertedLength: pasted.length + 3, oldRangeText: '见 ', newRangeText: `见 ${pasted}` }),
    null,
  )
})

test('负向 3：旧文档里手打的字面链接已经完整，不再重复提升', () => {
  const literal = '[乙](https://example.com)'
  // 光标停在段尾再打一个 `)`：旧区间已完整匹配 → 不转（也避免「旧文档点段尾就变」）
  assert.equal(typedLink({ docChanged: true, insertedLength: 1, oldRangeText: literal, newRangeText: `${literal})` }), null)
  assert.equal(typedLink({ docChanged: false, insertedLength: 1, oldRangeText: literal, newRangeText: `${literal})` }), null)
})

test('负向 3b：在旧字面链接里插字（新文本不再以 ) 收尾）不命中', () => {
  // 光标在 `u` 与 `)` 之间插 x：旧 `[乙](u)`，新光标前是 `[乙](ux`
  assert.equal(typedLink({ docChanged: true, insertedLength: 1, oldRangeText: '[乙](u', newRangeText: '[乙](ux' }), null)
  // 同理：插在链接文字里
  assert.equal(typedLink({ docChanged: true, insertedLength: 1, oldRangeText: '[乙]', newRangeText: '[乙x]' }), null)
})

test('负向 4：未闭合 / 收尾不是 ) 都不命中', () => {
  assert.equal(typedLink(typed('[乙](https://example.com')), null)
  assert.equal(typedLink(typed('[乙](https://example.com]')), null)
  assert.equal(typedLink(typed('[乙]https://example.com)')), null)
  assert.equal(typedLink(typed('[](https://example.com)')), null, '空链接文字不提升')
})

test('负向 5：危险目标（javascript:/data:/vbscript:）不升级成可点链接', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:msgbox']) {
    // 目标段不许括号，这里为了测协议先把括号去掉
    const target = href.replace(/[()]/g, '')
    assert.equal(typedLink(typed(`[乙](${target})`)), null, `${target} 不该变链接`)
  }
})

test('负向 6：图片语法 ![图](a.png) 不提升成链接', () => {
  assert.equal(typedLink(typed('![图](assets/a.png)')), null)
})

test('负向 7：文字里需要再转义的字符（* _ ` ~ | $ < >）保持字面', () => {
  for (const text of ['**粗**', 'a_b', 'x`y`', 'a~b', 'a|b', 'a$b', 'a<b>c']) {
    assert.equal(typedLink(typed(`[${text}](https://example.com)`)), null, `${text} 不该自动提升`)
  }
})

test('负向 8：目标里带空格或括号不命中（与 Tiptap 的保守口径一致）', () => {
  assert.equal(typedLink(typed('[乙](https://example.com/a b)')), null)
  assert.equal(typedLink(typed('[乙](https://example.com/a(1))')), null)
})

test('负向 9：未改正文但长度差不是 1（伪造的 skip）不命中', () => {
  const text = '[乙](https://example.com)'
  assert.equal(typedLink({ docChanged: false, insertedLength: 1, oldRangeText: text.slice(0, -3), newRangeText: text }), null)
  assert.equal(typedLink({ docChanged: false, insertedLength: 1, oldRangeText: null, newRangeText: text }), null)
})

test('命中时 match 是整段：插件用它从光标位置回推起点', () => {
  const hit = typedLink(typed('甲 [乙](https://example.com)'))
  assert.ok(hit)
  assert.equal(hit.match.length, '[乙](https://example.com)'.length)
  assert.equal('甲 [乙](https://example.com)'.slice(-hit.match.length), hit.match)
})
