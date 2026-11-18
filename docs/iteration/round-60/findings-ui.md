# 第 60 轮 界面与可访问性侦察（finder-ui）

HEAD `5384410`（= startSha），dev `5175`，CDP 9226（每步 `node .tmp/reset.mjs 9226`），只读。1440×900 / 1024×700，浅色 / 深色 / 暖纸；对比度按 WCAG（<18.66 px 需 4.5:1），computed 值 + 截图像素双证。脚本 `.tmp/e2e-r60-ui-{a,b,hover,px}.mjs`，读数同名 json；截图 `shots/round-60/search-dark-1440.png`、`file-list-1024.png`。

## F1（P1，外观）暖纸下悬停文件列表行，10.5 px 相对路径 4.45:1（AA 要 4.5）

- 位置：`.file-list-row:hover` `src/styles.css:629-631`（悬停底）、`.file-list-path` `:651-655`（`--ink-faint`，10.5 px）；暖纸 `--ink-faint:#736349` `:77`、`--accent-wash:#eee0c2` `:82`。
- 证据：悬停行渲染像素 **rgb(238,224,194)**（= `--accent-wash` 实为不透明，未按 70% 混），文字 #736349 → **4.45:1**；未悬停底 rgb(240,228,204) → 4.62:1（刚好过）。浅色悬停 4.58、深色 5.20、暖纸 4.45。文件名 `--ink-soft` 4.89 仍过线。
- 附带：悬停底与 `.file-list-row.is-active`（`:657-659`）同色，悬停与「当前文件」只能靠字色区分。
- 建议：悬停底降到 `color-mix(..., 45%, transparent)`，或悬停时路径改 `--ink-soft`；`is-active` 换另一种底。

## F2（P1，可访问性）列表态丢掉树的键盘导航：无 `role` / roving tabindex，方向键无效，30 文件 = 30 个 Tab 站

- 位置：`src/components/FileTree.tsx:465-490` 列表分支——外层 div 只有 `aria-label="文件列表"`（通用 div 上不生效）、无 `role`，行是无 `tabIndex` 的 button；树分支才有 `role="tree"` `:496`、`onKeyDown` `:501`、roving `:269`。
- 证据（`.tmp/r60-ui-b.json`）：树态 29 行仅 1 个 `tabindex=0`（余 `-1`），真实 `ArrowDown` 焦点 文1.md → 文2.md；切列表后 `role=null`、行 `tabindex=null`、30 文件 = **30 个可聚焦行**，真实 `ArrowDown`/`End` 焦点不动（`.tmp/r60-ui-a.json` `listKeys`）。
- 影响：键盘/读屏用户切到列表态失去「一个 Tab 站 + 方向键」既有模式（`FileTree.tsx:225`），大工作区要按 N 次 Tab 穿过侧栏。
- 建议：列表态复用 roving（`ArrowUp/Down/Home/End` + 单 `tabindex=0`），外层给 `role="list"` 让 `aria-label` 生效。

## F3（P2）树/列表两钮 25×21、36×21，低于本项目自己的 24×24 口径

`.tree-view-toggle button { padding: 2px 6px; font-size: 11px }` `src/styles.css:588-595`，`gap:2px` `:585`；实测 25×21 / 36×21，间距不满足 2.5.8 豁免；同侧栏文件行高 24 px，头行这两钮最矮。项目已有三处 `min-height:24px`（`:1830-1833`、`:2142-2143`、`:2293-2294`）。建议并入既存 B-110，补 `min-height:24px` 且 gap 加到 4 px。

## F4（P2）列表态根目录文件把文件名显示两遍

行内 `file.name` + `relativePath(file.path)`（`FileTree.tsx:472-479`），`relativePath()` 对无 `/` 的路径原样返回（`src/lib/workspace.ts:366-369`）→ 根文件「甲.md / 甲.md」，41 px 行高一半重复。建议相等时不渲染路径行。

## 正向证据

- 1024×700：搜索框 620×530（bottom 615）在窗内，结果列表内部滚动（9,200/321），无横向溢出；列表态侧栏 `scrollWidth-clientWidth=0`；顶栏 7 钮 `elementFromPoint` 全命中。
- 焦点：`Ctrl+Shift+F` 焦点进输入框；输入框或结果行 `Esc` 都只关框并把焦点送回 `.ProseMirror`；结果行 `Enter` 打开乙.md、焦点在 `.find-input`、词已回填。
- 静止态对比度三主题全过（列表路径 4.66/4.62/6.58，搜索路径 5.23/5.27/6.26，切换钮 4.83/4.80/6.80）；`aria-pressed` 正确。

## 其他观察（不计数）

搜索结果无方向键选中，真实 Tab 序「输入框 → 搜索 → 结果… → 关闭」，200 条时 200 个 Tab 站（`Shift+Tab` 可直接到「关闭」）；空查询回车无反馈。

## 未验证

真宿主 WebView2（本机 INIT-FAIL）下这两个界面；1,000 文件工作区的列表态 Tab 数（按 30 文件推算）。
