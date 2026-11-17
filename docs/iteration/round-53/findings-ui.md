# 第 53 轮 界面与可访问性侦察（finder-ui）

窗口 1440x900 / 1024x700 / 1440x620 / 1280x640；CDP 9226；每段脚本前 `node .tmp/reset.mjs 9226`。
轮前 startSha `86ba2d12f4245e73831f70b93ea47cebdd5654e0`（本轮未改产品代码）。
脚本：`.tmp/e2e-r53-ui-probe.mjs` 与 `-probe2`…`-probe8.mjs`；截图 `shots/round-53/ui-outline-focus.png`（F1）与 `ui-mermaid-render-1440.png`（F2）。

## 实测通过（不是发现）

- 1024x700：`scrollWidth == clientWidth == 1024`，顶栏/工具栏/状态栏无可裁文字。B-014 只在整页缩放 >130% 出现，100% 下不出现。
- 表格条 7 按钮全 24px 高、最窄 41px 宽；1440 与 1024 下不溢出。查找条（y=84–163）与表格条（163–200）不重叠，7 个表格按钮命中测试 7/7 命中自身。
- 快捷键对话框：`role=dialog` + `aria-modal`，连按 25 次 Tab 未逃出，Esc 后焦点回「快捷键」钮。导出/文件菜单 `role=menu`，Esc 后焦点回触发钮。
- 快速打开有 `role=dialog` + `aria-label`，输入框 `aria-label`（`QuickOpen.tsx:53,62`）。侧栏页签有 `tablist`/`aria-controls`/roving tabindex 与 `tabpanel`。
- 字数明细面板 360x325，在 900/700/620/640 四种高度下底部都留 40px，不溢出。
- 大纲项有 `aria-current=location`，折叠钮有 `aria-expanded`；键盘焦圈实测 `2px solid rgb(43,109,100)`。
- 浅色 `--ink-faint #666c72` 对 `--paper #f6f4ee` ≈4.83:1，深色 ≈6.79:1，空状态达标。

## F1 [P2] 大纲折叠按钮 14x24，无 hover 反馈

- 位置：`src/components/Outline.tsx:53-69`（内联 `width:14, padding:0, border:0, background:none`）；`src/styles.css` 里 `.outline-toggle` **0 条规则**（只有 `.outline-item`，`styles.css:1505`）。
- 实测（`-probe7.mjs`）：`rect 14x24`；hover 后 `background` 仍 `rgba(0,0,0,0)`、`color` 不变，而旁边 `.outline-item:hover` 有 accent-wash。
- 间距豁免不成立：折叠钮与 `.outline-item` 紧贴（grid `14px 1fr` 无 gap），24px 直径圆会压到相邻钮。与 B-110（斜体 `I` 21x24）同类。
- 建议：`min-width: 24px`，补 `:hover` 底色。

## F2 [P2] Mermaid 预览没有可访问名称

- 位置：`src/lib/mermaidPreview.ts:78-87`——`div.mermaid-preview` 只有 class/contenteditable/dataset，无 `role`/`aria-label`。
- 实测（`-probe4.mjs`）：`role=null`；内部 SVG 只有 `role="graphics-document document"` 与 `aria-roledescription="flowchart-v2"`，`aria-label=null`、`title`/`desc` 各 0 个。读屏只听到「flowchart-v2 图形文档」，节点 A/B 无名。
- 影响有限：源 `pre>code` 仍在 DOM 可读（`codeVisible=true`），图是重复信息。
- 建议：加 `role="img"` + `aria-label`；最省事加 `aria-hidden="true"`。

## F3 [P2] 表格工具条缺分组语义

- 位置：`src/App.tsx:5195-5219`——`div.table-bar` + `span`「表格」+ 7 按钮，无 `role`/`aria-label`（只有分隔符 `aria-hidden`）。
- 实测（`-probe2.mjs`）：`role=null`、`ariaLabel=null`。读屏听到 7 个孤立按钮，没有「当前在表格里」的上下文；破坏色只对眼睛有效。
- 建议：加 `role="toolbar"` + `aria-label="表格工具"`，一行改动。

## F4 [P2，B-108 补充] 设置面板 1024x700 下滚动溢出 278px

- 实测（`-probe4.mjs`）：对话框 430x660，`scrollHeight - clientHeight = 278`；页脚 `.dialog-actions` y=623–659，框底 680，页脚下方仍露被切正文。1440x900 下是 78px，小窗翻 3.5 倍。
- 不新开条目，给 `B-108` 补「1024x700 / 278px」。

## 未测

- 深色全矩阵：只截到 Mermaid 深色单图，未逐面板过深色。
- 批注卡：本轮没有可用批注数据源（需真模型或注入 `.sidelight/annotations`），未查 hover/focus。
- `host/` 的 F11 全屏：浏览器只能触发系统全屏，无应用内证据。
