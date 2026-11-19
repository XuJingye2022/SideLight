import { CodeBlock } from '@tiptap/extension-code-block'

/**
 * 第 91 轮 B2（用户反馈 #3）：代码块显示语言并可切换。
 *
 * 上游 `CodeBlock` 只把 `language` 放在节点属性里，编辑视图里看不出来（Markdown 里是
 * ```` ```js ```` 的 info string）。这里加一个 NodeView：`pre` 右上角放语言标签（`纯文本`
 * 表示没有语言），标签上盖一个透明的原生 `<select>`，点开就能换语言（键盘也能操作）。
 *
 * 只改这一处属性：`setNodeMarkup` 不重解析全文，保存时序列化仍走上游 `renderMarkdown`
 * （```` ```js ```` → ```` ```ts ````），```js` 的往返字节不变。
 */

type LanguagePair = [value: string, label: string]

/** NodeView 里拿到的节点形状（只用 type.name 与 attrs） */
type CodeNode = { type: { name: string }; attrs: Record<string, unknown> }

/** 常用语言：够覆盖 Markdown 写作里的代码块；文件里出现的其它语言由 fillOptions 临时补进去 */
const BASE_LANGUAGES: LanguagePair[] = [
  ['', '纯文本'],
  ['js', 'js'],
  ['ts', 'ts'],
  ['python', 'python'],
  ['html', 'html'],
  ['css', 'css'],
  ['json', 'json'],
  ['bash', 'bash'],
  ['mermaid', 'mermaid'],
  ['markdown', 'markdown'],
]

/** 标签文字：没有语言时写「纯文本」，与 Typora 的语言标签同义 */
export function languageLabel(language: unknown): string {
  const value = typeof language === 'string' ? language.trim() : ''
  return value.length > 0 ? value : '纯文本'
}

/** 当前语言的可选表：常用表 +（不在表里时的）当前值，保证标签能显示原语言 */
export function languageOptions(language: unknown): LanguagePair[] {
  const value = typeof language === 'string' ? language.trim() : ''
  const list = [...BASE_LANGUAGES]
  if (value.length > 0 && !list.some(([candidate]) => candidate === value)) list.push([value, value])
  return list
}

/** 重建 `<select>` 的选项并选中当前语言（换语言后标签要立刻显示新值） */
function fillOptions(select: HTMLSelectElement, language: unknown): void {
  const value = typeof language === 'string' ? language.trim() : ''
  select.replaceChildren()
  for (const [optionValue, label] of languageOptions(value)) {
    const option = document.createElement('option')
    option.value = optionValue
    option.textContent = label
    select.append(option)
  }
  select.value = value
}

/**
 * 代码块 NodeView：`pre > (语言标签, code)`。`code` 是内容宿主，标签在 `pre` 里但不在
 * 内容宿主内，所以不会进 Markdown、也不会被 ProseMirror 当成正文。
 */
export const SidelightCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current: CodeNode = node

      const pre = document.createElement('pre')
      pre.className = 'sl-code-block'
      const code = document.createElement('code')

      const wrap = document.createElement('span')
      wrap.className = 'sl-code-lang-wrap'
      wrap.setAttribute('contenteditable', 'false')
      const chip = document.createElement('span')
      chip.className = 'sl-code-lang'
      chip.textContent = languageLabel(current.attrs.language)
      chip.title = '切换代码块语言'
      const select = document.createElement('select')
      select.className = 'sl-code-lang-select'
      select.setAttribute('aria-label', '代码块语言')
      select.title = '切换代码块语言'
      fillOptions(select, current.attrs.language)
      wrap.append(chip, select)

      const languageClassPrefix = this.options.languageClassPrefix
      const syncLanguageClass = (language: unknown): void => {
        const value = typeof language === 'string' ? language.trim() : ''
        const prefix = languageClassPrefix ?? ''
        if (prefix.length === 0) return
        for (const name of [...code.classList]) {
          if (name.startsWith(prefix)) code.classList.remove(name)
        }
        if (value.length > 0) code.classList.add(`${prefix}${value}`)
      }
      syncLanguageClass(current.attrs.language)

      const onLanguageChange = (): void => {
        const value = select.value.trim()
        const before = typeof current.attrs.language === 'string' ? current.attrs.language : ''
        if (value === before) return
        const pos = getPos()
        if (typeof pos !== 'number') return
        const view = editor.view
        const target = view.state.doc.nodeAt(pos)
        if (!target || target.type.name !== 'codeBlock') return
        // 空串回到「无语言」（上游默认 null），保存时写 ```` ``` ````
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...target.attrs, language: value || null }))
      }

      select.addEventListener('change', onLanguageChange)
      pre.append(wrap, code)

      return {
        dom: pre,
        contentDOM: code,
        update: (updated: CodeNode): boolean => {
          if (updated.type.name !== 'codeBlock') return false
          const before = typeof current.attrs.language === 'string' ? current.attrs.language : ''
          const after = typeof updated.attrs.language === 'string' ? updated.attrs.language : ''
          current = updated
          if (before !== after) {
            chip.textContent = languageLabel(after)
            syncLanguageClass(after)
            // 选项表只在「当前语言不在常用表里」时变，重建一次；用户刚选的那项也一并选中
            fillOptions(select, after)
          }
          return true
        },
        // 标签上的点击/键盘/粘贴都别交给 ProseMirror：否则点一下标签会把光标挪进代码块
        stopEvent: (event: Event) => {
          const target = event.target
          return target instanceof Node && wrap.contains(target)
        },
        destroy: () => {
          select.removeEventListener('change', onLanguageChange)
        },
      }
    }
  },
})
