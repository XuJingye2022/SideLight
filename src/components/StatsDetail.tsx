import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'

import { countSentences, countText } from '../lib/wordcount.ts'

type Props = {
  /** 当前视图的纯文本（编辑模式取正文，源码模式已剥掉 frontmatter） */
  text: string
  /** 当前选区文本；折叠选区传空串 */
  selection: string
  /** 正文段落数（见 wordcount.countParagraphs）；undefined 表示回退到「空行分段」的旧口径 */
  paragraphs?: number
  /** 文首有 YAML frontmatter：状态栏不再单列「元数据」chip，明细里报一行（第 143 轮 B2） */
  frontmatter?: boolean
  onClose: () => void
}

const number = (value: number) => value.toLocaleString('en-US')

// 颜色/底色/边框只用主题变量：深色主题下必须自动跟着变，不能写死十六进制
const panelStyle: CSSProperties = {
  position: 'fixed',
  left: '16px',
  bottom: '40px',
  zIndex: 40,
  minWidth: '240px',
  maxWidth: '360px',
  padding: '12px 14px',
  borderRadius: '10px',
  background: 'var(--paper-raised)',
  color: 'var(--ink)',
  border: '1px solid var(--line)',
  boxShadow: '0 10px 28px var(--shadow)',
  fontSize: '13px',
  lineHeight: 1.7,
}

const headingStyle: CSSProperties = {
  margin: '0 0 6px',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  color: 'var(--ink-faint)',
}

const listStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '2px 16px',
  margin: 0,
}

const termStyle: CSSProperties = { color: 'var(--ink-faint)' }
const valueStyle: CSSProperties = { justifySelf: 'end', fontVariantNumeric: 'tabular-nums' }
const dividerStyle: CSSProperties = {
  margin: '8px 0 6px',
  borderTop: '1px solid var(--line)',
}

/** 状态栏字数明细面板：点状态栏字数打开，点面板外面或按 Esc 关闭 */
export function StatsDetail({ text, selection, paragraphs, frontmatter, onClose }: Props) {
  const stats = countText(text)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // 非模态对话框：读屏只朗读已获得焦点的节点，打开后把焦点移进来
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      // 触发按钮自己负责开关，这里不能抢着关，否则两边互相打断
      if (target?.closest('.stats-trigger')) return
      if (target?.closest('.stats-detail')) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  const total = stats.cjk + stats.words
  const selected = selection.length > 0 ? countText(selection) : null
  // 面板里没有可聚焦子节点：Tab 会掉到 BODY、面板还开着（第 70 轮实测，B-151）。
  // Tab / Shift+Tab 都改成「关面板并把焦点还给触发钮」，与 App 的 Esc 分支同一落点。
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const trigger = document.querySelector<HTMLElement>('.stats-trigger')
    onClose()
    trigger?.focus()
  }
  // 中日韩字与拉丁词是两个口径，合计才是状态栏那个数：不能再让两行显示同一个值
  const rows: Array<[string, string, string]> = [
    ['中日韩字', number(stats.cjk), '汉字、日文假名、韩文谚文，逐字计，不含标点'],
    ['拉丁词', number(stats.words), '按空白与标点切分，连续字母数字算一个词'],
    ['合计', number(total), '与状态栏字数一致（中日韩字 + 拉丁词）'],
    ['字符', number(stats.chars), '不含空白'],
    ['句', number(countSentences(text)), '按句末标点与换行切分'],
    ['段', number(paragraphs ?? stats.paragraphs), paragraphs === undefined ? '空行分段的段数' : '正文段落数：段落与列表项各算 1；标题、表格不计，代码块整块算 1'],
    ['阅读', `${number(stats.minutes)} 分钟`, '按 300 字/分钟估算'],
  ]
  if (frontmatter) rows.push(['元数据', 'frontmatter', '文首有 YAML frontmatter：不计入正文统计，保存时原样写回'])

  return (
    <div
      className="stats-detail"
      id="stats-detail"
      role="dialog"
      aria-label="字数明细"
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={panelStyle}
    >
      <p style={headingStyle}>字数明细</p>
      <dl style={listStyle}>
        {rows.map(([term, value, hint]) => (
          <div key={term} style={{ display: 'contents' }}>
            <dt style={termStyle}>{term}</dt>
            <dd style={{ ...valueStyle, margin: 0 }} title={hint}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div style={dividerStyle} />
      <dl style={listStyle}>
        <dt style={termStyle}>选区</dt>
        <dd style={{ ...valueStyle, margin: 0 }}>
          {selected ? `${number(selected.cjk + selected.words)} 字 / ${number(selected.chars)} 字符 / ${number(countSentences(selection))} 句` : '未选中文本'}
        </dd>
      </dl>
      <p style={{ ...termStyle, margin: '8px 0 0', fontSize: '12px', overflowWrap: 'anywhere' }}>合计 = 中日韩字 + 拉丁词，与状态栏一致；字符数不含空白；阅读时间按 300 字/分钟估算。{paragraphs !== undefined && ' 段按正文文本块计：段落与列表项各算 1，标题与表格不计，代码块整块算 1。'}</p>
    </div>
  )
}
