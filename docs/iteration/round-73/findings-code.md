# 第 73 轮 finder-code

**3 条 P1**（CDP 9225 实测）+ 1 条调研。脚本 `.tmp/e2e-r73-finder.mjs`、`.tmp/e2e-r73-toc.mjs`。查重：BACKLOG 无同条；F2 是 B-130 的回归。

## F1（P1）待办列表行距过大、复选框偏低
- `src/styles.css:1029-1053`：`li{display:flex;align-items:flex-start}`、`li>label{margin-top:7px}`、复选框 14px。
- 漏网：`src/styles.css:777` 的 `.doc-body li > p{margin:0}` 只匹配直子，任务项是 `li > div > p`，吃到 `:763` 的 `p{margin:0 0 1em}` → 实测 `margin-bottom:17px`。
- 17px、1440×900：li 高 **50.14px**（行盒 33.15 + 17 + li 外边距 3.06）；复选框中心 **216.23**、首行文字中心 **208.73**，低 **7.5px**；19px 档低 **8.5px**（7px 写死）。截图 `shots/round-73/tasklist.png`。

修复（`:1029-1053`）：`li{margin:0}`；`li > div > p{margin:0}`；`li > label{flex:none;margin:0;display:flex;align-items:center;height:1.95em}`。预期 li 高 33.15（−33.9%），中心差 ≤1px（17/19px 两档）。
回归：`- [ ] ` 输入规则与 Enter 续项、保存写回、字号两档、深色/打印、列表 Tab、单元格内任务项。

## F2（P1）TOC 标记段 `display:none`，方向键进不去
- `src/styles.css:956-958`：`.toc-source:not(.is-revealed){display:none}`。
- `src/lib/tocRender.ts:82-87` 只判 `from ∈ [from,to]`；`:266-275` 的选区分支正确，但光标落不进去。
- 实测：`# 一级标题`+`[TOC]`+`正文段落。`，widget 1 个，`.toc-source` display:none / 高 0 / 类名恒 `toc-source`；ArrowUp×4 + ArrowDown×2 全不变。无行盒 → 方向键跳过 → `revealed` 恒 −1；标记行看不到也进不去。

修复：`revealedIndex` 加相邻层（`from === range.from-1` 或 `range.to+1` 也返回 index）；露出时 `display:block;margin:0`。
回归：`tocRender.test.ts`、`[TOC]` 保存字节不变、widget 不重复、源码/预览两态、1 MB 逐键不扫全篇。

## F3（P1）公式没有源码露出
- 节点来自 `@tiptap/extension-mathematics` 3.34.0：`contenteditable=false` 的 `.tiptap-mathematics-render`，源码只在 `data-latex`，正文无 `$$`。
- 实测：`data-latex="a^2+b^2"`；ArrowDown×2 后类变 `ProseMirror-selectednode`，文本仍是 KaTeX，`innerText` 不含 `$$`。源码编辑只有 `src/App.tsx:5114`、`:5242` 的浮层（截图 `shots/round-73/code-toc-math.png`）。

修复：装饰插件在 `NodeSelection` 命中数学节点时加 `math-source`；CSS 藏子树、`::before{content:"$$" attr(data-latex) "$$"}`（行内用 `$`）。不动 `data-latex` 与序列化。
回归：`export.test.ts`/`math.test.ts`、KaTeX 惰性 0 B、复制粘贴、保存字节。

## F4（调研，P2）Typora 的 `==` 与 `$$`
`appsrc/window/frame.js`（偏移 336912、779945）+ `style/base.css`：
- 高亮：导出 `<mark>inner</mark>` 丢定界符；编辑 `decorate()` 输出 `<span class='md-pair-s'><span class='md-meta md-before'>==</span><mark>…</mark><span class='md-meta md-after'>==</span></span>`，`.md-expand mark .md-meta{opacity:.3!important}` 展开显形。
- 行内公式：`.md-expand .md-inline-math-container>.MathJax{display:none!important}` + `>script{display:inline}`，展开即换回 `<script>` 里的原始 LaTeX。
- 行间公式（40546-41081）：`contenteditable='false'` 的 `md-math-block md-rawblock`；就绪时容器 `math-jax-postprocess`，未就绪时 `math-jax-preprocess` 里是字面 `$$<br/>源码<br/>$$`；源码在模型 `text`，`data-math-tag-before/after/labels` 保标签。CSS `.math-jax-preprocess{opacity:.5;font-family:var(--monospace)}`。
- 旁证：`.md-task-list-item>input{margin-top:calc(1em - 10px)}` 跟随字号，与 F1 同解。
- 方案：`==`（默认关）已逐字节保真，缺的只是定界符露出——`Decoration.inline` 在命中/紧邻时插两个 `==` widget（复用 F2 判定），默认关 0 字节；公式用 F3 的 CSS 方案，不必搬 `<script>` 切换（`data-latex` 已是源码，0 B）。

## 未验证
真实 IME 方向键、F2 露出的滚动跳动、F3 行内公式边缘。
