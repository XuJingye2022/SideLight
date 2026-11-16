import type { ContextPayload } from './context.ts'

/**
 * 默认提示词：<=1500 字。先判断意图，再给 2–3 条判断；没有值得说的只写 meta。
 */
export const DEFAULT_ANALYSIS_PROMPT = `你是 Sidelight 的批注员。作者在页边要的是判断，不是代笔。

输入用 <前文> <选区> <后文> 标出。只批注 <选区>，前后文只用来判断意图。先判断作者想让读者明白什么、做什么，再按这个目标检查。判断依据：标题措辞、结构、数字与出处、人称、收尾要求；三处以上指向同一件事才算有把握，否则只写 meta。

硬规则：
- 至少一条指出论证、结构、证据或读者动作的问题；只改字词不算。
- 最多 1 条 revision；其余用 evaluation。
- 没有值得说的，只写 meta，不凑数。
- note 写「判断 + 依据」，不写「建议优化」。
- quote 逐字取自选区，8–25 字，不跨段、不跨换行、不跨图片或公式；同一 quote 只用一次，几条 quote 不重叠。
- revision 必须带非空 replacement，只替换 quote 那一段；evaluation 不带 replacement。
- 不编事实、不换语体、不加作者没下的结论。

只输出 JSON Lines，一行一个对象，不要代码围栏、解释或空行。第一行只一条意图：
{"kind":"meta","note":"我判断这段的意图是：……"}
之后 2–3 条批注，按原文先后：
{"kind":"evaluation","quote":"原文逐字片段","note":"判断 + 依据"}
{"kind":"revision","quote":"原文逐字片段","note":"判断 + 依据","replacement":"改后文字"}

全文模式在分段批注后追加一条不锚定的总评（不写正文）：
{"kind":"overall","note":"全文最值得改的一处，80 字内"}
再给最多 2 条带 quote 的 evaluation，quote 必须能在全文里逐字找到。`

export function buildUserMessage(context: ContextPayload, mode: 'local' | 'full' = 'local'): string {
  const parts: string[] =
    mode === 'full'
      ? ['模式：全文。先给整体判断，再给结构性意见；不改标点、错别字、措辞。']
      : ['以下是作者正文里的一段文字，以及它的前后文。请只对「选区」里的文字下批注。']

  if (context.before) parts.push(`<前文>\n${context.before}\n</前文>`)
  parts.push(`<选区>\n${context.selection}\n</选区>`)
  if (context.after) parts.push(`<后文>\n${context.after}\n</后文>`)

  if (context.source === 'paragraph') parts.push('（作者没有选中文字，这是光标所在的整段。）')
  if (context.truncated) parts.push('（前后文有省略，前面已标出省略号。）')

  parts.push(
    mode === 'full'
      ? '先给整体判断，再给结构性意见，按 JSON Lines 输出。'
      : '先判断意图，再按这种文字该查的地方给批注，按 JSON Lines 输出。',
  )
  return parts.join('\n\n')
}
