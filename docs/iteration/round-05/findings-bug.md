# 第 05 轮 · 缺陷侦察（findings-bug）

日期：2026-11-15。环境：Windows 11、Node 24.21.0、dev `http://localhost:5173`（一直 200）、CDP `http://127.0.0.1:9222`（headless Edge 157）。基线 commit `0e7fbc0`（产品代码同 `11c3348`），工作树干净。

方法：只读侦察。用 Playwright 连 CDP 派发真实键盘事件与 `Emulation.setEmulatedMedia`，不跑 `npm run build`、不装依赖、不改 `src/` 与 `host/`。截图落 `shots/round-05/`，日志落 `.tmp/r5-*.log`，临时脚本 `.tmp/r5-*.mjs`。

限制（影响结论强度）：headless 的 CDP 键盘事件不触发浏览器级快捷键（Ctrl+N 新窗口、Ctrl+S 保存网页），只能验证「产品有没有 `preventDefault`」；宿主 WebView2 的默认行为本轮未跑。凡属推断均标「未验证」。

## B1 KaTeX 按需加载被 Tiptap 扩展的静态 import 堵死（计划级阻塞）

- **现象**：只把 `PreviewPane` / `MathInlineEditor` / `MathDraftPreview` 三处 `import katex` 改成 `await import('katex')`，主 chunk 不会变小。KaTeX 还会从 `@tiptap/extension-mathematics` 静态进包，而该扩展在首屏就被 `useEditor` 使用。
- **复现**：
  1. `node_modules/@tiptap/extension-mathematics/dist/index.js:2` → `import katex from "katex"`；`:139` 与 `:311` 在 NodeView 里调 `katex.render(...)`。
  2. `src/App.tsx:11` `import { Mathematics } from '@tiptap/extension-mathematics'`，`:388` `Mathematics.configure(...)`，编辑器首帧创建。
  3. 第 4 轮产物 `dist/assets/` 只有 1 个 JS：`index-Tx6OjPkG.js` 1,098,175 B（gzip 339,281 B），没有独立 KaTeX chunk。
- **证据**：上列 file:line；`node_modules/katex/dist/katex.min.js` 272,756 B / gzip 76,086 B（实测 `zlib`）。计划的算式本身对得上：339,281 − 76,086 ≈ 263 KB gzip ≤ 265 KB——前提是 KaTeX 真能离开入口图。
- **影响**：本轮体积目标（首屏 gzip 341→≤265 KB）按「三处改动态」的做法验收会失败；更坏的情况是 build 通过、体积没降，报告却按「已完成」写。属 5 个任务里最容易误判的一条。
- **建议**（三选一，按风险从低到高）：
  1. 保留扩展，`resolve.alias` 把 `katex` 指到一个薄包装：`render(el, latex, opts)` 立即插入占位并在 `import('katex')` 完成后补渲染；`renderToString` 改为异步。主 chunk 只留包装，NodeView 不必重写。
  2. 不换扩展，自写 math node view（节点只存 latex，渲染交给懒加载模块）。首屏未加载时显示 `$latex$` 原文，加载后重渲染。
  3. 改目标口径：先只做 KaTeX CSS/字体按需（CSS 51,702 B / gzip 12,941 B，19 个 woff2 共 256,168 B），把「JS gzip ≤265」降级为下一轮，并把度量口径写成「初始请求集合内的 JS gzip」。
- **难度**：M（1 与 2 都要动扩展或别名，且要补「加载完成后重渲染」）。

## B2 `Ctrl+Shift+S` 被产品拦下，但执行的是普通保存（覆盖当前文件）

- **现象**：`Ctrl+Shift+S` 没有走「另存为」，而是和 `Ctrl+S` 一样写回当前文件；文件名不变、`dirty` 归零、picker 不再弹。
- **复现**（`.tmp/r5-focus-keys.mjs`，picker 打桩）：
  1. 打字 → `Ctrl+S` → picker 调用 1 次，拿到句柄。
  2. 再打字 → `Ctrl+Shift+S` → 事件 `prevented=true`；picker 调用仍是 **1 → 1**；文档名不变；`dirty` 归零。
- **证据**：`src/App.tsx:1427-1431` 只判 `mod && key === 's'`，没有先判 `event.shiftKey`；`Ctrl+Shift+P` 在 `:1421` 有单独分支，说明这是漏写。实测键序列：`{key:'s', ctrl:true, shift:true, prevented:true}`。
- **影响**：用户按标准「另存为」手势，得到的是静默覆盖原文件——以为在做副本，实际改的是原件。产品里「另存为…」只有鼠标路径（文件菜单），键盘用户拿不到。数据安全级别问题，比缺一个快捷键严重。
- **建议**：在 `:1427` 前加 `if (mod && event.shiftKey && key === 's') { event.preventDefault(); saveAsCopyRef.current(); return }`；提示文案保留「已保存」即可（`saveAsCopy` 已更新文件名）。补一条验收：打桩 picker 的调用次数应从 1 增到 2。
- **难度**：S。

## B3 导出的 HTML 与 TXT 静默丢公式

- **现象**：含 `$E=mc^2$` 的文档导出 HTML，公式位置是空元素；导出 TXT，公式文字完全消失（「正文一段，含公式 。」）。
- **复现**：源码模式写 `正文一段，含公式 $E=mc^2$。` → 切回 → 导出 HTML / TXT。导出文件在 `.tmp/r5-theme/katex-示例 · 未命名.html`（2,982 B）与 `katex-txt-示例 · 未命名.txt`（106 B）。
- **证据**：
  - 导出 HTML 片段：`<span data-latex="E=mc^2" data-type="inline-math"></span>`，**元素内容为空**，全文无 `.katex` 规则、无 `@font-face`，无 KaTeX 样式。
  - `src/App.tsx:1586-1588`：`bodyHtml: editor.getHTML()`；扩展的 `renderHTML` 只输出 `data-latex`（`@tiptap/extension-mathematics/dist/index.js:259-261`），不带渲染结果。
  - `src/lib/export.ts:50-124` 的 `STYLES` 没有任何公式规则。
  - TXT 走 `editor.getText()`（`App.tsx:1599`），公式是原子节点，无文本。
- **影响**：导出稿静默丢内容，用户不打开导出文件就发现不了。与本轮 KaTeX 计划直接相关：修这个 bug 就要在导出路径按需加载 KaTeX，并把样式（必要时含 base64 字体）内联进导出文件；反过来，若只做拆包不做导出，拆完仍丢公式。
- **建议**：
  1. HTML 导出：把 `[data-latex]` 节点替换为 `katex.renderToString` 结果（异步；失败时保留 `$latex$` 原文），并把 `katex.min.css` 内联进 `STYLES`；字体要么 base64（约 +256 KB/次导出）、要么 CDN（离线导出会坏）、要么改输出 MathML（体积小，但要确认浏览器支持）。
  2. TXT 导出：把公式节点的 `$latex$` 原文写回。
  3. 补测试：`export.test.ts` 加「bodyHtml 含 data-latex 时导出结果含可见公式或原 latex」。
- **难度**：M。

## B4 深色首屏 / reload 白光闪一帧，且未声明 `color-scheme`

- **现象**：深色系统下刷新，画面顺序是「旧深色页 → 纯白空白 → 深色空白 → 内容」；即有一次全屏白闪。深色下滚动条等 UA 部件仍是浅色。
- **复现**：`Emulation.setEmulatedMedia({features:[{name:'prefers-color-scheme',value:'dark'}]})` → `Page.startScreencast` → `reload`。抓到 4 帧，亮度（0–255）：`00=28.0`、`01=255.0`（纯白）、`02=23.3`、`03=28.0`。
- **证据**：`shots/round-05/dark-reload-frame-00-before.jpg`、`dark-reload-frame-01-white-flash.jpg`、`dark-reload-frame-02-after.jpg`；原始帧 `.tmp/r5-frames/*.jpg`，亮度由 `.tmp/frames-eval.py` 计算。根因侧证据：`index.html` 全文没有内联 `background`、没有 `color-scheme`；`src/main.tsx:5` 的 `import './styles.css'` 由 JS 注入；`src/styles.css:26` 只有 `@media (prefers-color-scheme: dark)` 覆盖变量，`:root` 未写 `color-scheme`（实测计算值 `normal`）。
- **影响**：深色用户每次启动、每次刷新都吃一次白闪；本轮要加「持久化主题」后更明显：若首次绘制前读不到用户选择，深色用户会先被浅色画一遍再切过去。WebView2 宿主（dist，CSS 是阻塞 `<link>`）是否同样白闪**未验证**——但缺内联背景与 `color-scheme` 两个根因在 dist 里同样存在。
- **建议**：
  1. `index.html` 加 `<meta name="color-scheme" content="light dark">`，并在 `<head>` 内联 `<style>html{background:#15171a}@media (prefers-color-scheme:light){html{background:#f6f4ee}}</style>`。
  2. 加手动主题后，在 `<head>` 放一段同步小脚本读 `localStorage` 并设 `document.documentElement.dataset.theme`，让首帧就是正确主题（不要等 React）。
  3. `styles.css` 的 `:root` 加 `color-scheme: light`，深色块加 `color-scheme: dark`，滚动条与表单控件才会跟着换。
- **难度**：S。

## B5 键盘与焦点基线：22 次 Tab 才到正文、无 skip link、0 个 `aria-keyshortcuts`；文件菜单不吃焦点

- **现象**：
  - 从页面顶部按 Tab：**第 22 次**才进正文（第 4 轮加的「文件」按钮把基线从 21 推到 22）。前 21 个停靠点：文件 → 分析 → 导出 → 保存 → 设置 → 插入 ▾ → H1/H2/B/I/S/`</>` → 专注 → 打字机 → 源码 → 预览 → 文件 → 大纲 → 打开文件夹 → 打开文件 → 试用示例。
  - 无 skip link（`a[href^="#"]` 为 0）；`[aria-keyshortcuts]` 为 0；界面上没有任何快捷键提示（除批注空态那句「选中一段，按 Ctrl + Enter」）。
  - 文件菜单：`aria-haspopup/expanded` 与 4 个 `role=menuitem` 正确，Esc 关菜单并把焦点还给「文件」按钮（PASS）；但**打开后焦点留在按钮上**（`activeInsideMenu=false`），按 `Tab` 焦点逐个走完 4 项后继续走到菜单背后的「分析本段」，**菜单仍然开着**；`ArrowDown` 不移动焦点（`role=menu` 却没有菜单键盘模型）。
  - 正面对照：设置对话框焦点锁**正常**——打开后焦点进框、背景 5 个兄弟节点加 `inert`、Tab 循环 14 次不出框、Esc 关闭后焦点回「设置」按钮、`inert` 清空。`SaveDialog` 用同一 `useDialogFocus`（静态核对，未实测）。
- **复现**：`.tmp/r5-focus-keys.mjs`；Tab 序列与菜单轨迹在 `.tmp/r5-focus-keys.log`。
- **证据**：`src/components/FileMenu.tsx:18-28`（只监听 Esc）、`:36-63`（无焦点转移、无方向键、无 Tab 处理）；`src/components/useDialogFocus.ts:17-65`（对话框那套是对的，FileMenu 没复用）；`src/App.tsx:1461-1469`。
- **影响**：键盘与读屏用户到达正文的成本高；菜单打开后 Tab 会把焦点带到视觉上被菜单遮住的按钮，且菜单不关，下一步按 Enter 会误触背后的功能。本轮「不用鼠标也能用」的第 1 项如果只补 skip link 与快捷键提示，这三处仍算没做完。
- **建议**：skip link 作为 `.app` 第一个可聚焦元素；文件菜单打开时把焦点送到第一项，`ArrowUp/Down/Home/End` 循环，`Tab`/`Shift+Tab` 关闭菜单并把焦点还给按钮，外点关闭；给工具栏按钮补 `aria-keyshortcuts` 与可见的「快捷键」一览（`aria-keyshortcuts` 与真实按键必须一致，宁缺勿错）。
- **难度**：S–M。

## 附：其他实测（不升 B，供计划参考）

1. **主题跟随系统实时生效**：不刷新页面，`prefers-color-scheme` dark↔light 双向切换，`body` 背景立即变（`rgb(246,244,238)` ↔ `rgb(21,23,26)`）。PASS。
2. **没有手动主题、没有持久化**：全页按钮/菜单/选择器搜「主题/深色/浅色/跟随系统」命中 0；`localStorage` 只有 `sidelight.doc.v1`（`trancy-mode` 是浏览器扩展噪声）；`documentElement.dataset` 为空。
3. **两套对比度实测**（WCAG 比值，文本组合全部 ≥4.5）：

   | 组合 | 浅色 | 深色 |
   | :--- | ---: | ---: |
   | 正文 ink/paper | 14.88 | 14.42 |
   | 次要 ink-soft/paper-raised | 6.67 | 7.29 |
   | 小字 ink-faint/paper | 4.83 | 6.80 |
   | 强调 accent/accent-wash | 5.22 | 5.78 |
   | 批注 mark/mark-wash | 4.63 | 6.67 |
   | 提示 note/note-wash | 5.05 | 6.38 |
   | 错误 warn/paper-raised | 6.03 | 6.17 |
   | 边框 line/paper | 1.21 | 1.31（装饰性，非文本，不适用 AA；两套都很淡，见截图） |
   | 强边框 line-strong/paper | 1.44 | 1.69 |

   深色下代码块：文字 `rgb(233,230,224)` / 底 `rgb(28,31,35)`；批注卡文字 `rgb(168,173,175)` / 底 `rgb(28,31,35)`；toast 7.29:1；设置框输入 12.4:1。均 PASS。图片未测（示例文档无图，且程序化插图片成本高，标「未验证」）。
4. **对话框开着时全局快捷键不拦**：`src/App.tsx:1419` 在 `dialogOpen` 时直接 `return`，`Ctrl+S` 的 `defaultPrevented=false`（实测）。Web 构建下会弹浏览器「保存网页」对话框；`Ctrl+F` 也落到浏览器查找。建议 `dialogOpen` 时仍对已注册的快捷键 `preventDefault()`，只是不执行动作。宿主行为未验证。
5. **`Ctrl+N` 没有实现**：`prevented=false`，不新建文档。浏览器里 Ctrl+N 是「新窗口」、WebView2 宿主里大概什么都不发生（**未验证**，headless 无法触发浏览器级快捷键）。本轮若把「新建」当核心键盘路径，需要补 `Ctrl+N` 并处理脏文档确认。
6. **`Ctrl+H` 也被拿来做查找**（`App.tsx:1432` 同时匹配 `f` 与 `h`）；`Ctrl+H` 在浏览器是历史。建议只保留 `Ctrl+F`，或接受但写进快捷键一览。
7. **`color-scheme` 计算值 `normal`**：深色下滚动条、`<select>` 下拉面板等 UA 部件不会自动转深色。CSS 已给 input/select 上了深色底，所以表单本身可读；滚动条未实测截图。
8. **11 / 11.5 / 10px 仍有硬编码小字**：`src/styles.css:546、611、926、1027、1257、1295、1302、1458、1469、1505、1530、1549、1565、1620、1627` 等，`--text-xs` 注释说「别再散写」但未执行完。不属本轮阻断项。
9. **第 4 轮回归脚本全过**（本轮未改产品代码，用于确认基线干净）：
   - `node scripts/save-acceptance.mjs` → **25/25 PASS**
   - `node scripts/filemenu-acceptance.mjs` → **31/31 PASS**
   - `node scripts/export-acceptance.mjs` → **7/7 PASS**
   - 日志 `.tmp/r5-regression.log`。副作用：`shots/round-04/t3-export.png` 被脚本重写，已 `git checkout` 还原。

## KaTeX 按需加载风险清单（本轮计划用）

入口盘点（`grep -rn katex src scripts` + 依赖包）：

| 入口 | 位置 | 现在 | 首屏加载？ |
| :--- | :--- | :--- | :--- |
| 编辑器公式渲染（node view） | `src/App.tsx:11,388` + `@tiptap/extension-mathematics/dist/index.js:2,139,311` | 静态 | **是**（编辑器首帧即用，且扩展静态 import） |
| 预览面板 | `src/components/PreviewPane.tsx:2,18` | 静态 | JS 在首屏 chunk，渲染在开预览时 |
| 公式就地编辑 | `src/components/MathInlineEditor.tsx:3,35` | 静态 | 同上 |
| 源码模式公式实时预览 | `src/components/MathDraftPreview.tsx:2,18` | 静态 | 同上 |
| 插入公式（工具栏 / 输入规则） | `Mathematics` 命令 + `MathInputRules`（`App.tsx:406`） | 静态（同 node view） | **是** |
| 首屏 CSS | `src/main.tsx:6` `import 'katex/dist/katex.min.css'` | 静态 CSS | **是**（51,702 B / gzip 12,941 B；19 个 woff2 共 256,168 B，按需下载） |
| 导出 HTML | `src/lib/export.ts`（**不** import katex） | 无渲染 | 否；当前直接丢公式（B3） |
| 导出 TXT | `App.tsx:1599` `editor.getText()` | 无 | 否；公式文本丢失 |
| 单元测试 | `src/lib/math.test.ts`（只 import `math.ts`） | 不含 katex | 不受拆包影响 |
| roundtrip | `scripts/roundtrip.mjs`（只 import `math.ts`） | 不含 katex | 不受拆包影响 |
| 验收脚本 | `scripts/acceptance.mjs:40-79`、`scripts/shot.mjs:28-39`、`scripts/qa16.mjs:100-117`、`scripts/qa18.mjs:26-56` | 立即数 `.katex` / 等 `document.fonts` | 拆包后易 flaky |

预测风险（按严重度）：

1. **目标不可达（高）**：扩展静态 import → 主 chunk 仍含 76 KB gzip，339→263 的算式不会发生。必须先解决 B1，否则整个任务白做。
2. **CSS 闪动（高）**：`katex.min.css` 若也改成按需，公式会在 CSS 到达前以无样式 DOM 出现——KaTeX 的 `.katex` 布局完全靠 CSS，裸 HTML 会塌成错位文本，视觉上比「晚半秒出现」更糟。做法：先 `await` CSS（或 `document.fonts.load`）再渲染；或用 `visibility:hidden` 占位。
3. **同步改异步的竞态（高）**：`MathInlineEditor.tsx:32-39` 在 render 体内同步 `renderToString`，`PreviewPane.tsx:32-35` 在 `useMemo` 里同步渲染。改异步后必须带「请求序号/最新 latex 比对」：快速打字、连续切文档、开关预览时，旧结果可能覆盖新结果，表现为预览闪烁或显示上一条公式。
4. **插入时模块未到（中-高）**：Tiptap NodeView 的 `render()` 是同步的；首次输入 `$x$` 时 `import('katex')` 未完成 → 节点空白。模块到达后扩展不会自动重渲染（NodeView 没有 `update` 回调，只有 `destroy`），可能一直空到下次编辑或重载。需要包装层在加载完成后手动重渲染该节点，或预取（idle 时预载）以缩小窗口。
5. **导出缺样式（中-高）**：B3 已证当前导出丢公式；修的时候如果只换 KaTeX HTML 不内联 CSS，导出文件里公式仍是乱码/空白；内联字体则每次导出多 256 KB。这是产品决策（文件大小 vs 离线可读），计划里要写清选哪条。
6. **测试与门禁 flaky（中）**：`acceptance.mjs` 在 reload 后 400 ms 就数 `.katex` 并断言 KaTeX 字体 `status === 'loaded'`；`shot.mjs` 插入后 600 ms 数节点；`qa16/qa18` 点 `.katex` 后立即找 `.popover .math-preview .katex`。拆包后这些断言会间歇 FAIL。建议统一加「等公式就绪」的钩子（例如 `window.__katexReady` Promise 或 `waitForFunction`），并把 qa16/18 纳入或明确不纳入门禁。
7. **重复注入/内存（中）**：若每次渲染都插一个 `<link>` 或多次 `await import`，模块缓存没事，但样式表会重复；应集中到单一 loader（缓存 Promise + 只注入一次 CSS）。
8. **口径问题（中）**：若用 `requestIdleCallback` 预取，chunk 仍会在首屏后几秒下载。「首屏 gzip ≤265 KB」必须定义成「初始请求集合」还是「首 5 秒」，否则 build 数字达标、用户流量没省。

## 代码优化机会（最多 3 条）

1. **`src/lib/katexLoader.ts` 单一加载点**：目前 5 个地方各自静态 import（3 个组件 + 扩展 + CSS），拆包会变成 5 处各写一遍动态加载。集中成一个模块（`ensureKatex()` 返回缓存 Promise、`ensureKatexCss()` 只注入一次、`prefetch()` 供 idle 预取），是 B1/B3 和本轮任务 3 的共同前置。
2. **文件菜单复用对话框的焦点工具**：`useDialogFocus` 已经把「记住打开者、送焦点、Tab 循环、还原」写全了。FileMenu 自己做了一个只监听 Esc 的 10 行版本，导致 B5 的三处缺口。抽一个 `usePopupFocus`（非模态版：移焦、方向键、Tab 关闭）即可，不必新写一套。
3. **导出样式与编辑器 token 去重**：`src/lib/export.ts:50-124` 硬编码了 13 处颜色/边框，和 `src/styles.css` 的变量各写一份；本轮加主题后必然漂移（导出稿的深色只覆盖了 7 条规则，表格、图片、代码块内联 code 的深色都没跟上）。抽出一份共享的 CSS 变量/片段，或至少让导出从 `:root` 变量生成。

## 未验证清单（下一轮怎么补）

| 项 | 为什么没验证 | 补法 |
| :--- | :--- | :--- |
| 浏览器级 Ctrl+N / Ctrl+Shift+S / Ctrl+F 默认行为 | headless CDP 事件不触发浏览器 accelerator | 用有头 Edge + 真人按键，或 `SendKeys` 到前台窗口；记录是否开新窗口/弹保存框 |
| 宿主 WebView2 里上述快捷键与深色首屏闪烁 | 本轮不构建、不启动宿主 | 安装包内用真实键盘测；`host/fcp-probe.mjs` 扩一项首帧背景色 |
| `SaveDialog` 的焦点锁与 Esc 还原 | 需要触发「保存前对比」状态，本轮只做了静态核对 | 造大改动触发 `pendingSave`，重复设置框那组 Tab/Esc 断言 |
| 深色下图片可读性 | 示例文档无图片，程序化插图成本高 | 用一个含图片的 `.md` 打开，截图深色下的图片边框/亮度 |
| 真实系统保存对话框、真实 IME、HKCU/双击 | 与第 4 轮相同，沙箱测不了 | 安装版真机 |

## 证据文件

- 报告：`docs/iteration/round-05/findings-bug.md`
- 日志：`.tmp/r5-focus-keys.log`、`.tmp/r5-theme-katex.log`、`.tmp/r5-flash-notes.log`、`.tmp/r5-contrast.log`、`.tmp/r5-regression.log`
- 脚本：`.tmp/r5-focus-keys.mjs`、`.tmp/r5-theme-katex.mjs`、`.tmp/r5-flash-notes.mjs`、`.tmp/r5-contrast.mjs`、`.tmp/frames-eval.py`
- 截图：`shots/round-05/theme-light.png`、`theme-dark.png`、`theme-dark-rail.png`、`theme-dark-rail-crop.png`、`theme-dark-settings.png`、`dark-code-math.png`、`focus-probe.png`、`dark-reload-frame-00-before.jpg`、`dark-reload-frame-01-white-flash.jpg`、`dark-reload-frame-02-after.jpg`
- 导出样例：`.tmp/r5-theme/katex-示例 · 未命名.html`、`.tmp/r5-theme/katex-txt-示例 · 未命名.txt`
