import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * 第 73 轮 B-156：公式 atom 选中时露出 Markdown 源码。
 *
 * 问题：行内 `$…$` 与块级 `$$…$$` 在编辑视图里只剩 KaTeX 成品，分隔符与 TeX 原文都进不了
 * DOM（`@tiptap/extension-mathematics` 的 NodeView 只把原文放在 `data-latex` 属性里）。
 * 方向键把光标移进 atom（NodeSelection）时用户看不到标记，改不了也判断不了这是公式。
 *
 * 做法与 `tocRender.ts` 的 `[TOC]` 段同一模型：文档装饰给 NodeView 的外层节点挂类，
 * 伪元素用 `attr(data-latex)` 还原 `$…$` / `$$…$$`；`sl-math-reveal` 存在时用
 * `styles.css` 把 KaTeX 成品收起，避免「α + $\alpha$」双显。
 *
 * 性能：选区每动一次都跑 apply。没有改文档时只算「哪些公式被选中」，结果不变就返回
 * 上一个 state（同一个 DecorationSet 引用）；改文档时只有「片段里有公式 / 步的替换区间
 * 命中公式 / 新造公式」才重扫全篇，其余只做位置映射（TOC 同一套快路径，第 61 轮 B1）。
 *
 * 第 74 轮 B2 复用同一套工厂：`==高亮==` 的 mark 连续区间挂 `sl-eq-revealed`，伪元素画
 * `==`；判定换成「相交或贴边」（光标停在高亮两端也算进入）。高亮是 mark 不是 atom，
 * 扫描要遍历文本节点并合并相邻区间，装饰用 `Decoration.inline`。
 */

/** 一段要露源码的区间（公式 atom 在文档里占 1 个位置宽） */
export type RevealRange = { from: number; to: number; type: string }

/** 工厂参数：B2 的 `==高亮==` 定界符露出复用同一个插件，只换 scan/decorate/touches */
export type RevealConfig = {
  key: PluginKey<RevealState>
  scan: (doc: ProseMirrorNode) => RevealRange[]
  decorate: (doc: ProseMirrorNode, ranges: RevealRange[], revealed: number[]) => DecorationSet
  /** 有改文档时：只有真碰到区间/新造区间才重扫，否则只映射 */
  touches: (transaction: Transaction, ranges: RevealRange[]) => boolean
  /** 选区与区间的判定，默认「相交」；`==` 用「相交或贴边」（光标停在定界符两侧也算） */
  hit?: (ranges: RevealRange[], from: number, to: number) => number[]
}

export type RevealState = {
  ranges: RevealRange[]
  set: DecorationSet
  /** 露出的区间下标（升序） */
  revealed: number[]
  /** 诊断计数：真正重扫文档的次数（单测用它证明「只映射、不重扫」） */
  builds: number
}

const isMathType = (name: string) => name === 'inlineMath' || name === 'blockMath'

/** 全篇公式区间；`atom:true` 的叶子节点 nodeSize 一律是 1 */
export function collectMathRanges(doc: ProseMirrorNode): RevealRange[] {
  const ranges: RevealRange[] = []
  doc.descendants((node, pos) => {
    if (!isMathType(node.type.name)) return true
    ranges.push({ from: pos, to: pos + node.nodeSize, type: node.type.name })
    return false
  })
  return ranges
}

/** 选区（或 NodeSelection）与哪些区间相交：`from < to`，块级 atom 选中时是 1 宽 */
export function revealIndexes(ranges: RevealRange[], from: number, to: number): number[] {
  const indexes: number[] = []
  ranges.forEach((range, index) => {
    if (from < range.to && to > range.from) indexes.push(index)
  })
  return indexes
}

/**
 * 相交或贴边（第 74 轮 B2）：光标是空选区时，停在 `==` 的里侧两端也算「进入」。
 * 只认「贴边」不认「隔一个字」：`from <= range.to && to >= range.from` 对
 * `from === to === range.from - 1` 为假（`to >= range.from` 不成立），移开一格就收回。
 */
export function revealIndexesTouching(ranges: RevealRange[], from: number, to: number): number[] {
  const indexes: number[] = []
  ranges.forEach((range, index) => {
    if (from <= range.to && to >= range.from) indexes.push(index)
  })
  return indexes
}

const hits = (config: RevealConfig, ranges: RevealRange[], from: number, to: number): number[] =>
  (config.hit ?? revealIndexes)(ranges, from, to)


const sameReveal = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index])

/** 公式 atom 的装饰：类挂在 NodeView 外层（wrapper 就是 `data-latex` 宿主） */
export function decorateMathReveal(
  doc: ProseMirrorNode,
  ranges: RevealRange[],
  revealed: number[],
): DecorationSet {
  if (revealed.length === 0) return DecorationSet.empty
  return DecorationSet.create(
    doc,
    revealed.map((index) => Decoration.node(ranges[index].from, ranges[index].to, { class: 'sl-math-reveal' })),
  )
}

const sliceHasMath = (slice: { content: { size: number; descendants: (f: (node: ProseMirrorNode) => boolean) => void } }) => {
  if (slice.content.size === 0) return false
  let found = false
  slice.content.descendants((node) => {
    if (isMathType(node.type.name)) found = true
    return !found
  })
  return found
}

/** 事务有没有可能改到公式：插入片段里有公式，或某一步的替换区间命中已有区间（含 setNodeMarkup） */
export function mathTouchesTransaction(transaction: Transaction, ranges: RevealRange[]): boolean {
  for (const step of transaction.steps) {
    const slice = (step as { slice?: { content: { size: number; descendants: (f: (node: ProseMirrorNode) => boolean) => void } } }).slice
    if (slice && sliceHasMath(slice)) return true
    let hit = false
    step.getMap().forEach((oldStart, oldEnd) => {
      if (hit) return
      for (const range of ranges) {
        const inside =
          oldStart === oldEnd
            ? oldStart > range.from && oldStart < range.to
            : oldStart < range.to && oldEnd > range.from
        if (inside) {
          hit = true
          return
        }
      }
    })
    if (hit) return true
  }
  return false
}

/* ── `==高亮==` 的定界符露出（第 74 轮 B2）────────────────────────────── */

const EQ_MARK = 'eqHighlight'

const hasEqMark = (node: ProseMirrorNode) => node.isText && node.marks.some((mark) => mark.type.name === EQ_MARK)

/** 高亮 mark 的连续区间；相邻文本节点（`==a**b**c==` 这种夹了别的 mark）合并成一段 */
export function collectEqRanges(doc: ProseMirrorNode): RevealRange[] {
  const ranges: RevealRange[] = []
  doc.descendants((node, pos) => {
    if (!hasEqMark(node)) return true
    const from = pos
    const to = pos + node.nodeSize
    const last = ranges[ranges.length - 1]
    if (last && last.to === from) last.to = to
    else ranges.push({ from, to, type: EQ_MARK })
    return true
  })
  return ranges
}

/** 高亮是行内 mark，装饰用 `Decoration.inline` 包文字；伪元素画在包出来的 span 上 */
export function decorateEqReveal(doc: ProseMirrorNode, ranges: RevealRange[], revealed: number[]): DecorationSet {
  if (revealed.length === 0) return DecorationSet.empty
  return DecorationSet.create(
    doc,
    revealed.map((index) => Decoration.inline(ranges[index].from, ranges[index].to, { class: 'sl-eq-revealed' })),
  )
}

const sliceHasEq = (slice: { content: { size: number; descendants: (f: (node: ProseMirrorNode) => boolean) => void } }) => {
  if (slice.content.size === 0) return false
  let found = false
  slice.content.descendants((node) => {
    if (hasEqMark(node)) found = true
    return !found
  })
  return found
}

/**
 * 事务有没有可能改到高亮区间：插入片段带 `eqHighlight` mark（在区间里打字会继承 mark），
 * 或加/删 mark 的步，或替换区间命中已有区间。三种之外逐键只映射，不扫全篇。
 */
export function eqTouchesTransaction(transaction: Transaction, ranges: RevealRange[]): boolean {
  for (const step of transaction.steps) {
    const slice = (step as { slice?: { content: { size: number; descendants: (f: (node: ProseMirrorNode) => boolean) => void } } }).slice
    if (slice && sliceHasEq(slice)) return true
    // AddMarkStep / RemoveMarkStep 带 mark 字段且不产生替换区间
    const mark = (step as { mark?: { type: { name: string } } }).mark
    if (mark?.type.name === EQ_MARK) return true
    let hit = false
    step.getMap().forEach((oldStart, oldEnd) => {
      if (hit) return
      for (const range of ranges) {
        const inside = oldStart === oldEnd ? oldStart > range.from && oldStart < range.to : oldStart < range.to && oldEnd > range.from
        if (inside) {
          hit = true
          return
        }
      }
    })
    if (hit) return true
  }
  return false
}

export const eqRevealKey = new PluginKey<RevealState>('sidelightEqReveal')

/** App 挂的第二个实例：设置开着（解析出高亮 mark）且选区进/贴边时才画 `==` */
export function eqDelimiterReveal(): Extension {
  return Extension.create({
    name: 'sidelightEqReveal',
    addProseMirrorPlugins() {
      return [
        createRangeRevealPlugin({
          key: eqRevealKey,
          scan: collectEqRanges,
          decorate: decorateEqReveal,
          touches: eqTouchesTransaction,
          hit: revealIndexesTouching,
        }),
      ]
    },
  })
}

const scanState = (config: RevealConfig, doc: ProseMirrorNode, selection: { from: number; to: number }, previous?: RevealState): RevealState => {
  const ranges = config.scan(doc)
  const revealed = hits(config, ranges, selection.from, selection.to)
  return { ranges, set: config.decorate(doc, ranges, revealed), revealed, builds: (previous?.builds ?? 0) + 1 }
}

/** 通用「区间选中/相邻即露」插件工厂；公式与 `==高亮==` 各建一个实例 */
export function createRangeRevealPlugin(config: RevealConfig): Plugin<RevealState> {
  return new Plugin<RevealState>({
    key: config.key,
    state: {
      init: (_settings, state) => scanState(config, state.doc, state.selection),
      apply(transaction, previous) {
        if (!transaction.docChanged) {
          // 只换了选区：结果不变就返回上一个 state（同一个 DecorationSet，不重建）
          const revealed = hits(config, previous.ranges, transaction.selection.from, transaction.selection.to)
          if (sameReveal(revealed, previous.revealed)) return previous
          return {
            ...previous,
            revealed,
            set: config.decorate(transaction.doc, previous.ranges, revealed),
          }
        }
        if (previous.ranges.length === 0) {
          // 没有区间：只有可能新造区间才重扫；其余逐键不扫全篇
          return config.touches(transaction, previous.ranges)
            ? scanState(config, transaction.doc, transaction.selection, previous)
            : previous
        }
        if (config.touches(transaction, previous.ranges)) {
          return scanState(config, transaction.doc, transaction.selection, previous)
        }
        // 普通正文改动：位置只映射，不重扫
        const ranges = previous.ranges.map((range) => ({
          ...range,
          from: transaction.mapping.map(range.from, 1),
          to: transaction.mapping.map(range.to, -1),
        }))
        const set = previous.set.map(transaction.mapping, transaction.doc)
        const revealed = hits(config, ranges, transaction.selection.from, transaction.selection.to)
        if (sameReveal(revealed, previous.revealed)) return { ...previous, ranges, set }
        return { ranges, set: config.decorate(transaction.doc, ranges, revealed), revealed, builds: previous.builds }
      },
    },
    props: {
      decorations: (state) => config.key.getState(state)?.set ?? null,
    },
  })
}

export const mathRevealKey = new PluginKey<RevealState>('sidelightMathReveal')

/** App 挂的扩展：插件只在编辑视图里生效，不改正文、不进序列化 */
export function mathReveal(): Extension {
  return Extension.create({
    name: 'sidelightMathReveal',
    addProseMirrorPlugins() {
      return [
        createRangeRevealPlugin({
          key: mathRevealKey,
          scan: collectMathRanges,
          decorate: decorateMathReveal,
          touches: mathTouchesTransaction,
        }),
      ]
    },
  })
}
