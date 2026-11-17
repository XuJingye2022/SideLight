import type { MarkdownManager } from '@tiptap/markdown'

import { mapOutsideCode } from './codeScan.ts'
import { inlineSyntaxTokenizers } from './inlineSyntax.ts'

const installed = new WeakSet<object>()

const LONE_TILDE = {
  name: 'loneTildeText',
  level: 'inline' as const,
  start(src: string) {
    const at = src.search(/(?<!~)~(?!~)/)
    return at < 0 ? undefined : at
  },
  tokenizer(src: string) {
    const lone = /^(?<!~)~(?!~)/.exec(src)
    if (!lone) return undefined
    return { type: 'text', raw: '~', text: '~' }
  },
}

/**
 * GFM 默认允许**单个** `~` 当删除线：`H~2~O` 会被解析成 strike，序列化写成 `H~~2~~O`。
 * 这里注册一个行内扩展，把「不成对的单个 ~」直接当文本 token 吃掉；
 * 成对的 `~~…~~` 仍交给 marked 自己的 del 规则。
 * marked 的 use() 是包装而不是覆盖：tokenizer 返回 false 会落回基础规则（仍是删除线），所以不能用 return false。
 *
 * 第 55 轮起同一处还注册 `==高亮==` / `^上标^` / `~下标~` 三个 tokenizer（默认关，设置里开）。
 * marked 的 use() 对行内 tokenizer 用 unshift：数组里靠前的先进队尾，所以 loneTildeText 写在数组第一个，
 * 真正匹配时它排最后——`~c~` 先被「下标」接住，裸 `~` 才落到这里。
 */
export function disableSingleTildeStrike(
  manager: Pick<MarkdownManager, 'instance'>,
  isInlineSyntaxEnabled: () => boolean = () => false,
): void {
  if (installed.has(manager)) return
  installed.add(manager)
  manager.instance.use({
    extensions: [LONE_TILDE, ...inlineSyntaxTokenizers(isInlineSyntaxEnabled)],
  })
}

/** 把「不在围栏、行内代码、公式里」的 \~ 还成 ~（序列化器会把正文里的 ~ 转义） */
export function repairTildes(markdown: string): string {
  // 序列化器只把正文里真的 `~` 写成 `\~`：没有这个两字节就不可能有命中（第 42 轮守卫）
  if (!markdown.includes('\\~')) return markdown
  return mapOutsideCode(markdown, (segment) => segment.replace(/\\~/g, '~'), true)
}
