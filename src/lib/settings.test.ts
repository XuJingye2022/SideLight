import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_USER_PROMPT } from './prompt.ts'
import { promptFingerprint, LEGACY_PROMPT_FINGERPRINT, LEGACY_PROMPT_FINGERPRINT_V2 } from './settings.ts'

// 第 26–34 轮的默认提示词（795 字，整段当 system 用）：从 `git show HEAD:src/lib/prompt.ts` 原样拷来。
// 测试文件不进 bundle，不占首屏。
const V2_DEFAULT_PROMPT = "你是 Sidelight 的批注员。作者在页边要的是判断，不是代笔。\n\n输入用 <前文> <选区> <后文> 标出。只批注 <选区>，前后文只用来判断意图。先判断作者想让读者明白什么、做什么，再按这个目标检查。判断依据：标题措辞、结构、数字与出处、人称、收尾要求；三处以上指向同一件事才算有把握，否则只写 meta。\n\n硬规则：\n- 至少一条指出论证、结构、证据或读者动作的问题；只改字词不算。\n- 最多 1 条 revision；其余用 evaluation。\n- 没有值得说的，只写 meta，不凑数。\n- note 写「判断 + 依据」，不写「建议优化」。\n- quote 逐字取自选区，8–25 字，不跨段、不跨换行、不跨图片或公式；同一 quote 只用一次，几条 quote 不重叠。\n- revision 必须带非空 replacement，只替换 quote 那一段；evaluation 不带 replacement。\n- 不编事实、不换语体、不加作者没下的结论。\n\n只输出 JSON Lines，一行一个对象，不要代码围栏、解释或空行。第一行只一条意图：\n{\"kind\":\"meta\",\"note\":\"我判断这段的意图是：……\"}\n之后 2–3 条批注，按原文先后：\n{\"kind\":\"evaluation\",\"quote\":\"原文逐字片段\",\"note\":\"判断 + 依据\"}\n{\"kind\":\"revision\",\"quote\":\"原文逐字片段\",\"note\":\"判断 + 依据\",\"replacement\":\"改后文字\"}\n\n全文模式在分段批注后追加一条不锚定的总评（不写正文）：\n{\"kind\":\"overall\",\"note\":\"全文最值得改的一处，80 字内\"}\n再给最多 2 条带 quote 的 evaluation，quote 必须能在全文里逐字找到。"

const KEY = 'sidelight.settings.v1'

const makeStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
  }
}

const setup = async (stored: unknown) => {
  const storage = makeStorage()
  ;(globalThis as { localStorage?: unknown }).localStorage = storage
  if (stored !== undefined) storage.setItem(KEY, JSON.stringify(stored))
  const module = await import('./settings.ts')
  return { storage, ...module }
}

test('两个旧默认指纹形状正确，v2 常量确实对应 795 字旧默认', () => {
  assert.match(LEGACY_PROMPT_FINGERPRINT, /^\d+:[0-9a-f]+$/)
  assert.match(LEGACY_PROMPT_FINGERPRINT_V2, /^\d+:[0-9a-f]+$/)
  // 自证：抄错指纹会让老用户一直看到旧的 795 字整段文本，且格式规则被拼进 user 消息
  assert.equal(promptFingerprint(V2_DEFAULT_PROMPT), LEGACY_PROMPT_FINGERPRINT_V2)
  assert.equal(promptFingerprint(DEFAULT_USER_PROMPT) === LEGACY_PROMPT_FINGERPRINT_V2, false)
  assert.equal(promptFingerprint(DEFAULT_USER_PROMPT) === LEGACY_PROMPT_FINGERPRINT, false, '新默认不能撞 v1 指纹')
})

test('v2 旧默认升级成新默认，版本记 3', async () => {
  const { loadSettings } = await setup({ analysisPrompt: V2_DEFAULT_PROMPT, promptVersion: 2 })
  const next = loadSettings()
  assert.equal(next.userPrompt, DEFAULT_USER_PROMPT)
  assert.equal(next.promptVersion, 3)
})

test('自定义提示词原样保留，伪旧默认不被误升级', async () => {
  const custom = await setup({ analysisPrompt: '我的自定义', promptVersion: 2 })
  assert.equal(custom.loadSettings().userPrompt, '我的自定义')
  assert.equal(custom.loadSettings().promptVersion, 2)

  // 长度对、指纹不对的伪旧默认不能动
  const fake = 'x'.repeat(5967)
  const { loadSettings } = await setup({ analysisPrompt: fake })
  assert.equal(loadSettings().userPrompt, fake)
})

test('新键优先于旧键', async () => {
  const { loadSettings } = await setup({ userPrompt: '新自定义', analysisPrompt: '旧自定义' })
  assert.equal(loadSettings().userPrompt, '新自定义')
})

test('空值与缺键都回落默认，版本记 3', async () => {
  const blank = await setup({ userPrompt: '   ' })
  assert.equal(blank.loadSettings().userPrompt, DEFAULT_USER_PROMPT)
  assert.equal(blank.loadSettings().promptVersion, 3)

  const empty = await setup({})
  assert.equal(empty.loadSettings().userPrompt, DEFAULT_USER_PROMPT)
  assert.equal(empty.loadSettings().promptVersion, 3)
})

test('落盘只有新键，迁移后不再写旧键', async () => {
  const { storage, loadSettings, saveSettings } = await setup({ analysisPrompt: '我的自定义' })
  saveSettings(loadSettings())
  const saved = JSON.parse(storage.getItem(KEY) as string) as Record<string, unknown>
  assert.equal(saved.userPrompt, '我的自定义')
  assert.equal('analysisPrompt' in saved, false)
})

test('旧存档没有智能标点键时读出来是开，明确写 false 才关', async () => {
  const old = await setup({ autoSave: false })
  assert.equal(old.loadSettings().smartPunctuation, true)
  assert.equal(old.loadSettings().autoSave, false)

  const off = await setup({ smartPunctuation: false })
  assert.equal(off.loadSettings().smartPunctuation, false)
})

test('整页缩放：旧存档没有这个键读出来是 100，超出范围夹到 50–200', async () => {
  const old = await setup({ fontSize: 17 })
  assert.equal(old.loadSettings().pageZoom, 100)

  const big = await setup({ pageZoom: 320 })
  assert.equal(big.loadSettings().pageZoom, 200)

  const small = await setup({ pageZoom: 10 })
  assert.equal(small.loadSettings().pageZoom, 50)
})

test('clampPageZoom 与正文字号是两条独立的链', async () => {
  const { clampPageZoom, clampFontSize, DEFAULT_SETTINGS } = await setup({})
  assert.equal(DEFAULT_SETTINGS.pageZoom, 100)
  assert.equal(clampPageZoom(DEFAULT_SETTINGS.pageZoom + 10), 110)
  assert.equal(clampPageZoom(Number.NaN), 100)
  // 字号的上限 26 不能把整页缩放也压到 26
  assert.equal(clampFontSize(110), 26)
  assert.equal(clampPageZoom(110), 110)
})

/* ── `==高亮==` 默认开 + 旧存档一次性迁移（第 75 轮 B-158）────────────── */

test('inlineSyntax：没有存档时是开（第 75 轮起默认开）', async () => {
  const { loadSettings, DEFAULT_SETTINGS, SETTINGS_VERSION } = await setup(undefined)
  assert.equal(DEFAULT_SETTINGS.inlineSyntax, true)
  assert.equal(DEFAULT_SETTINGS.settingsVersion, SETTINGS_VERSION)
  assert.equal(loadSettings().inlineSyntax, true)
})

test('inlineSyntax：空存档 {} 也读成开', async () => {
  const { loadSettings } = await setup({})
  assert.equal(loadSettings().inlineSyntax, true)
})

test('inlineSyntax：旧存档的 false（无 settingsVersion）迁成开', async () => {
  // 第 55–74 轮的默认值是关：存下来的 false 不算用户选择
  const { loadSettings } = await setup({ inlineSyntax: false })
  assert.equal(loadSettings().inlineSyntax, true)
})

test('inlineSyntax：版本 >= 2 的 false 是显式关闭，原样保留', async () => {
  const v2 = await setup({ inlineSyntax: false, settingsVersion: 2 })
  assert.equal(v2.loadSettings().inlineSyntax, false)
  // 以后版本推到 3 也不能再把这批用户翻回开（critic P2-3）
  const v3 = await setup({ inlineSyntax: false, settingsVersion: 3 })
  assert.equal(v3.loadSettings().inlineSyntax, false)
})

test('saveSettings 恒写 settingsVersion：显式关掉的档保存后不回弹', async () => {
  const { storage, loadSettings, saveSettings } = await setup({ inlineSyntax: false, settingsVersion: 2 })
  const loaded = loadSettings()
  assert.equal(loaded.inlineSyntax, false)
  saveSettings(loaded)
  const saved = JSON.parse(storage.getItem(KEY) as string) as Record<string, unknown>
  assert.equal(saved.settingsVersion, 2)
  assert.equal(saved.inlineSyntax, false)
})
