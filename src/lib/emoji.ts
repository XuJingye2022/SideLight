import { Extension, InputRule } from '@tiptap/core'

/**
 * emoji 快捷输入（第 88 轮 B-106 的 emoji 半边；TOC 已在第 58/61/62 轮落地）。
 *
 * 只做「手打即换」：敲完整的 `:smile:` 当场变成 😄，一步可撤销。旧文档里已有的字面短码
 * **不转换**（载入是解析路径，本文不碰 marked），保存仍逐字节不变 —— 与 Typora 的
 * 「输入时替换」口径一致，也符合本仓库「保存保真」的硬规则。
 *
 * 映射固定 20 枚。体积约束（首屏 gzip 内部 310,000 B）下不引依赖、不建全量 emoji 表：
 * 手写一张小表就是这个功能的全部运行时成本。
 */

export type EmojiEntry = { name: string; emoji: string }

/** 支持的短码，顺序即文档里的书写顺序；名字只认小写 ASCII */
export const EMOJI: readonly EmojiEntry[] = [
  { name: 'smile', emoji: '😄' },
  { name: 'grin', emoji: '😁' },
  { name: 'joy', emoji: '😂' },
  { name: 'wink', emoji: '😉' },
  { name: 'thinking', emoji: '🤔' },
  { name: 'heart', emoji: '❤️' },
  { name: 'thumbsup', emoji: '👍' },
  { name: 'clap', emoji: '👏' },
  { name: 'tada', emoji: '🎉' },
  { name: 'rocket', emoji: '🚀' },
  { name: 'fire', emoji: '🔥' },
  { name: 'sparkles', emoji: '✨' },
  { name: 'star', emoji: '⭐' },
  { name: 'check', emoji: '✅' },
  { name: 'x', emoji: '❌' },
  { name: 'warning', emoji: '⚠️' },
  { name: 'bulb', emoji: '💡' },
  { name: 'memo', emoji: '📝' },
  { name: '100', emoji: '💯' },
  { name: 'wave', emoji: '👋' },
]

/**
 * 手打短码的形状：半角 `:` 与全角 `：` 都认（中文里先打 `：` 是智能标点的既有行为），
 * 尾锚定 —— 只有「正好结束在光标处」才算打完。名字里允许 `-` 与 `+` 是给以后留的
 * （`:+1:` 这类名字），当前 20 枚一个都没用上。
 */
const SHORTCODE = /[:：]([a-z0-9_+-]+):$/

/** 查表：入参是「光标前的文本」（可以带前缀），命中回名字与 emoji，否则 null */
export function emojiAt(text: string): { name: string; emoji: string } | null {
  const match = SHORTCODE.exec(text)
  if (!match) return null
  const hit = EMOJI.find((entry) => entry.name === match[1])
  return hit ? { name: hit.name, emoji: hit.emoji } : null
}

/**
 * 输入规则扩展：把刚落下的完整短码换成 emoji。
 *
 * 代码围栏与行内代码不转换由 Tiptap 的输入规则插件负责（父块 `spec.code`、相邻 code mark
 * 两种守卫），本文件不加第二份判定 —— 与 `==高亮==` 的输入规则同一条路。
 * 查不到名字时 `find` 回 null：不产生事务，字面短码原样留在正文里。
 */
export const EmojiInput = Extension.create({
  name: 'sidelightEmoji',

  addInputRules() {
    return [
      new InputRule({
        find: (text: string) => {
          const match = SHORTCODE.exec(text)
          if (!match) return null
          const hit = emojiAt(text)
          if (!hit) return null
          return { index: match.index, text: match[0] }
        },
        handler: ({ state, range, match }) => {
          const hit = emojiAt(match[0])
          if (!hit) return null
          state.tr.insertText(hit.emoji, range.from, range.to)
        },
      }),
    ]
  },
})
