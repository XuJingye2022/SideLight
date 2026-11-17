import type { MarkdownManager } from '@tiptap/markdown'

import { mapOutsideCode } from './codeScan.ts'

const installed = new WeakSet<object>()

/**
 * GFM 默认允许**单个** `~` 当删除线：`H~2~O` 会被解析成 strike，序列化写成 `H~~2~~O`。
 * 这里注册一个行内扩展，把「不成对的单个 ~」直接当文本 token 吃掉；
 * 成对的 `~~…~~` 仍交给 marked 自己的 del 规则。
 * marked 的 use() 是包装而不是覆盖：tokenizer 返回 false 会落回基础规则（仍是删除线），所以不能用 return false。
 */
export function disableSingleTildeStrike(manager: Pick<MarkdownManager, 'instance'>): void {
  if (installed.has(manager)) return
  installed.add(manager)
  manager.instance.use({
    extensions: [
      {
        name: 'loneTildeText',
        level: 'inline',
        start(src: string) {
          const at = src.search(/(?<!~)~(?!~)/)
          return at < 0 ? undefined : at
        },
        tokenizer(src: string) {
          const lone = /^(?<!~)~(?!~)/.exec(src)
          if (!lone) return undefined
          return { type: 'text', raw: '~', text: '~' }
        },
      },
    ],
  })
}

/** 把「不在围栏、行内代码、公式里」的 \~ 还成 ~（序列化器会把正文里的 ~ 转义） */
export function repairTildes(markdown: string): string {
  return mapOutsideCode(markdown, (segment) => segment.replace(/\\~/g, '~'), true)
}
