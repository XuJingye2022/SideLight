import { useRef } from 'react'

import { useDialogFocus } from './useDialogFocus.ts'

type Props = {
  open: boolean
  onClose: () => void
}

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: '文件',
    items: [
      ['Ctrl+Alt+N', '新建'],
      ['Ctrl+Alt+O', '打开文件'],
      ['Ctrl+Alt+Shift+O', '打开文件夹'],
      ['Ctrl+S', '保存'],
      ['Ctrl+Alt+S', '另存为'],
      ['Ctrl+Alt+E', '打开「文件 → 导出」'],
    ],
  },
  {
    title: '编辑与批注',
    items: [
      ['Ctrl+F', '查找（Ctrl+H 同义）'],
      ['Ctrl+Shift+F', '全局搜索（跨文件）'],
      ['Ctrl+P', '快速打开文件'],
      ['Ctrl+1…6 / Ctrl+0', '标题 1–6 / 正文'],
      ['Ctrl+/', '切换源码 / 编辑'],
      ['表格内 Ctrl+Enter / Ctrl+L', '下方加一行 / 删当前行'],
      ['Ctrl+Shift+1 / 3 / L', '大纲 / 文件树 / 收起侧栏'],
      ['Ctrl+K', '给选区加链接 / 编辑链接'],
      ['列表内 Tab / Shift+Tab', '缩进 / 反缩进'],
      ['Ctrl+M', '编辑或插入行内公式'],
      ['Ctrl+Shift+M', '编辑或插入块级公式'],
      ['Ctrl+Enter', '分析选中 / 本段'],
      ['Ctrl+B / Ctrl+I', '粗体 / 斜体'],
      ['Ctrl+Shift+X', '删除线'],
      ['Ctrl+E', '行内代码'],
      ['Ctrl+Shift+V', '粘贴为纯文本（浏览器原生键）'],
    ],
  },
  {
    title: '视图与字号',
    items: [
      ['Ctrl+Shift+P', '预览'],
      ['F8', '专注模式（只显示光标所在块）'],
      ['F11', '全屏（再按一次退出）'],
      ['Ctrl+Shift+= / Ctrl+Shift+-', '整页放大 / 缩小'],
      ['Ctrl+Shift+0', '整页缩放复位 100%'],
      ['Ctrl+滚轮', '整页缩放'],
      ['Ctrl+= / Ctrl+- / Ctrl+Alt+0', '字号放大 / 缩小 / 复位'],
      ['Esc', '关闭菜单 / 对话框，或退出源码与预览'],
    ],
  },
]

/**
 * 快捷键一览：顶栏「?」、设置里的入口、以及非输入区的 `?` 都开这里。
 * 清单只写真实可用的键位；浏览器原生键必须在标签里标注来源。
 */
export function ShortcutsDialog({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useDialogFocus(open, dialogRef)

  if (!open) return null

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="dialog shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="快捷键"
        aria-labelledby="shortcuts-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="shortcuts-title">快捷键</h2>
        <p className="dialog-note">全程键盘可用：Tab 第一下跳到正文，Shift+Tab 回到顶栏。</p>

        {GROUPS.map((group) => (
          <section key={group.title} className="shortcuts-group">
            <h3>{group.title}</h3>
            <dl>
              {group.items.map(([keys, label]) => (
                <div key={`${group.title}-${keys}`} className="shortcuts-row">
                  <dt>
                    <kbd>{keys}</kbd>
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <p className="dialog-note shortcuts-note">
          本表是默认键位；设置里改过的 8 条（保存 / 查找 / 全局搜索 / 快速打开 / 源码 / 预览 / 新建 / 导出）以设置为准。
          Ctrl+N / Ctrl+O / Ctrl+Shift+S 被浏览器保留（新窗口 / 打开 / 另存网页），没有绑定；欧洲键盘布局上 Ctrl+Alt+*
          可能与 AltGr 冲突。
        </p>

        <div className="dialog-actions">
          <button type="button" className="primary" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
