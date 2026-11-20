# 第 140 轮计划审查（critic 复审 · plan r1）

判定：**REVISE**（2 P1 / 4 P2）。基线 `adb270d`。上一版 6 条已修：P1-1（`stripLineMarkup`/`locateMarkdownLine`，验收 ③ 点名标题/列表/加粗/空行/removed；`DiffRow` 只有 kind/text，strip 是正解）、P1-2（`App.tsx:4589` 谓词加 `#diff-view`，验收 ② 含 Ctrl+Z/Ctrl+S/Ctrl+K/F 与工具栏 inert）、P1-3（reopen 钮、aria、activeElement 两条）、P1-4（折叠限 `min-width:1120px`，验收改左缘 +(railWidth+28)/2）、P2-5（`.note{right:12px}`）、P2-6（四项守卫 / ≤10 帧 / `row.text`）。

## P1-1 换篇后对比面板留在上一篇
`MarginRail.tsx:246-250` 的换篇守卫 `setDiffOn(false)` 被计划 1/29 删掉，`diffOpen` 搬到 App 后没有等价重置：`docInstance` 只在 `App.tsx:2719` 自增、只作 `docKey`（`:6185`），`requestLoad`/`loadIntoEditor` 不动面板。对比开着点文件树、「文件」菜单、拖入 `.md` 都能换篇 → `.doc-layout` 仍 hidden、面板还是上一篇的行；点行会拿新正文 `findRange` 选中错句。验收 ②③ 全在单篇内，测不到。
修：`docInstance` 变化时 `setDiffOpen(false)`（面板再加 `key={docInstance}`）；验收加「对比开着 → 点文件树另一篇 → 面板关、正文可见」。

## P1-2 静态门清单漏三处，计划 8 的「计数不变」是错的
(a) A1 计划 11 给 `.rail-resize` 写 `tabIndex=0`；`railDiffA11y.test.ts:68-73` 数三文件 `tabIndex={0}` 恰 3（现状 1+1+1）→ 变 4。改 4 并写明新增 Tab 站；删掉它就丢键盘拖宽。
(b) 同测 `:90-100` 按名单要求 MarginRail 里 `RailDiffPanel` 恰一条 lazy、静态 import 0：面板搬 App 后必须把这条挪到 `appSource`（`lazy(() => import('./components/RailDiffPanel.tsx'))`），只把 3 改 2 仍红。
(c) `chat.test.ts:521` 的 `between(app,'getChatSource=','getDiff=')` 必红：MarginRail 的 `getDiff=` 删了，新面板的 `getDiff=` 在预览块后（`:6161` 附近）早于 `getChatSource`（`:6187`），往后找不到锚点即 assert 抛。计划的测试清单要加 `chat.test.ts`，end 锚点改 `getReviewWorkspace=`。另 `railModalGate.test.ts:89` 的 `diffSource.includes('createPortal(')` 也要改，计划 8 没点名。

## P2-3 折叠后顶栏「批注」是死钮
`App.tsx:5684-5697` 走 `openRail`（`:1028`：`setRailOpen(true)` + rAF 聚焦 `.rail-close`）；宽窗 `.rail-close` 是 `display:none`（`styles.css:3663`，`:3764` 只在 ≤1119 显示），折叠又是整栏 `display:none` → 点了没反应，`aria-expanded` 还跟 `railOpen`。修：宽窗点它时 `setRailCollapsed(false)`，aria 改看折叠态；验收 ③ 加一条。

## P2-4 预览列右移 16px
`.doc-layout` 新 padding `52px 0 220px 32px` 也作用于 `PreviewPane` 根（`PreviewPane.tsx:116`/`:125` 的 `doc-layout preview-layout`）；该布局是单条固定 36rem 轨 + `justify-content:center`（`styles.css:3599`），右 padding 归 0 后整列右移 16px（1440）。修：`.preview-layout{padding-right:32px}`，或只在编辑布局去右 padding。

## P2-5 进出对比丢阅读位置
打开对比把 `.doc-layout` 收成 `hidden+source-hidden`，`main.doc-scroll` 的 scrollHeight 归 0 → scrollTop 夹到 0，Esc 回正文在文首。源码模式有 `restoreSourceScroll`（B-115）。修：进出记/还原 `scrollTop`，或验收 ① 先滚到中段再开面板并写明取舍。

## P2-6 三处小接线
(a) 本仓库 React 19（`react ^19.3.1`、`@types/react ^19.3.0`，`inert?: boolean`），计划 6 的「React 18 写 `{inert:''}`」会 tsc 红，写 `inert={diffActive}`。(b) Esc 分支读 `diffActive` 要把 `diffActive`/`closeDiff` 加进 `App.tsx:4853` 的显式依赖数组，否则闭包恒 false。(c) 调线同步漏 `AGENTS.md:38`（§3 门禁行也写着「硬线 320,000」）。

体积：调线到 325,000 已写成结论 ✓。`strip/locate` 放入口 `annotations.ts`（A3 未计，+~200–400 B），放懒 chunk 更贴合「复用懒 chunk 抵消」。
