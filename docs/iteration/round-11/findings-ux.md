# 第 11 轮 · 体验与界面发现（KaTeX 惰性加载）

- 侦察时间：2026-11-16 01:50–02:05
- 环境：`http://localhost:5173`（dev，Vite），CDP `127.0.0.1:9223`，viewport 1440×900，`Network.setCacheDisabled`。
- 基线：commit `4878030`，0.23.0。KaTeX 仍在首 chunk（`dist/assets/index-*.js` 1,137,183 B），**惰性实现尚不存在**。
- 方法：在当前构建里用真实 DOM 量测「排版态 ↔ 加载前态」的往返，用 `PerformanceObserver('layout-shift')` 取真实 CLS；用 `file://` 加载 `katex.min.js`（272,756 B）+ CSS 量惰性路径耗时；导出走真实 UI 下载后打开。数据在 `.tmp/ux/*.log`、`.tmp/ux/layout.json`、`.tmp/ux/export.html`、`.tmp/ux/export.pdf`。

**结论先说**：今天正文与公式在同一帧出现（161.6 ms 时就位，FCP 172 ms），惰性化会在两者之间插入 **27–102 ms** 的空窗。这个空窗用「裸 `$latex$`」填会明显闪且带来 0.021–0.053 的 CLS；用灰 chip 填只能缓解观感，不能消除重排。**唯一能做到 0 闪烁 0 位移的做法是：含公式的文档先 `await ensureKatex()` 再画正文，并用 120 ms 超时兜底。**

---

## U1 首屏：正文先画、公式后到 → 裸 LaTeX 闪一下并重排（影响最大）

**证据**

- 现状无闪烁：`editorDom` / 首段文字 / 首个 `.katex` 都在 **161.6 ms**，FCP **172 ms**（`.tmp/ux/probe-visual.log`）。
- 惰性窗口：`katex.min.js` 从 `file://` 冷加载 + 执行 **89.9 ms**，热缓存 **16.7 ms**；CSS `link` **39–117 ms**；首次渲染到 `document.fonts.ready` 再 **8–9 ms**。从开始加载到字体就绪合计 **27–102 ms ≈ 1.6–6 帧**（`.tmp/ux/probe-latency.log`、`.tmp/ux/lazy-file.html`）。
- 加载前态截图 `shots/round-11/u2-placeholder-raw-paper.png`：整篇像源码；首段从 2 行变 4 行（66.3 → 132.6 px），文档高 1045 → 1143 px（+98 px）。
- 真实 layout-shift：13 个公式的论文式文档 **CLS 0.053**（5 个公式的小文档 0.021），`hadRecentInput:false`（`.tmp/ux/probe-doc.log`）。
- 行内公式裸文本比排版后宽：`\hat\mu` 12.4 → 85.3 px（+588%）、`\mathbb{E}[x_i]=\mu` 82.8 → 193.5（+134%）、`\sum_{i=1}^{n} x_i` 67.3 → 168.7（+151%）。所以「裸文本换行位置不会一样」是结构性的，不是个别公式（`.tmp/ux/probe-placeholder.log`）。
- 滚动：浏览器 scroll anchoring 保住了视口内锚点（`h2` top 87.7 → 88.0 → 87.7），但 `scrollTop` 被改 300 → 323 → 257；用户不会丢位置，滚动条滑块会跳 20–40 px。

**改法**

1. 在 `setMarkdown()`（`src/App.tsx:764-781`）之前预取。`setMarkdown` 共 6 处调用：初始载入 `:793`、宿主 `/__doc` `:823`、清空 `:827/:898`、切换文件 `:1545`、恢复宿主草稿 `:2163`、源码切回富文本 `:2751`。前四类要 gate；`:2751` 是用户点「源码」切回时的重新解析，可以 `await`（17–90 ms 可接受），也可以在进入源码模式时按正文是否含 `$` 预取（更稳）。
2. 只对含公式的正文预取：用现成的 `isMathBody` / `protectMathPairs` 同款判定扫一遍 `$`，或 `/\$(?!\s)[^$\n]+(?<!\s)\$/`。无公式文档不得 await，FCP 保持 172 ms。
3. `await Promise.race([ensureKatex(), setTimeout(120)])`：正常本地路径 27–102 ms 内到，正文直接以排版态出现，CLS = 0；超时才让正文带占位（U2）先出，模块到后重画。
4. 正文比今天晚约 20–100 ms 出现（120 ms 上限内），工具栏/外框不变；仍在第 3 轮定的 300 ms 冷启动线内。
5. 若 120 ms 超时路径被走到，重画时必须通知三处：ProseMirror 节点视图、`PreviewPane`（`useMemo` 只依赖 bodyHtml，`src/components/PreviewPane.tsx:32-35`，不订阅就永远停在占位）、导出。

**难度**：M。`setMarkdown` 现在同步，调用点要改成 `await`；单测/smoke 可能要等一次微任务。

---

## U2 占位与失败：裸 LaTeX 不能当占位；CSS 失败比 JS 失败更糟

**证据**

- 灰 chip 占位截图 `shots/round-11/u2-placeholder-chip-paper.png`：观感是「正在加载」，不闪源码。首段仍是 2 行（与排版态一致），但这是运气：chip 宽度是猜的，`\hat\mu` 排版 12.4 px、裸文本 85.3 px，没有任何线性估算能同时命中（`\hat` 这类命令加字符不加宽）。
- chip 的块级高 41.6 px（2.45em）而当前块级实际只占 33.1 px → 若 U3 不修，chip 反而制造 +8.5 px/块的位移。**占位高度必须跟最终态绑定**（U3 修好后取 2.8em）。
- 失败态样式 `shots/round-11/u2-placeholder-failed-paper.png`：等宽 12 px、`--ink-faint`、虚线下划线的原文，可读、可复制，不算好看但诚实。
- **CSS 缺失时不能渲染 KaTeX HTML**：没有 `katex.min.css` 时 MathML 与 HTML 两份都画出来，截图 `shots/round-11/u2-no-katex-css.png` 里行内是 `E = mc²E = mc2`，块级多出游离的 `ca + b`；实测行内宽 128.7 px（正常 79 px）。
- 字体缺失不致命：挡住全部 woff2 后，500 ms 与 4000 ms 都是 Times 回退，文字不隐身（`shots/round-11/u2-font-blocked-500ms.png`、`u2-font-blocked-4000ms.png`）；`font-display:block` 的 3 s 隐身期被本地字体 8–9 ms 抵消。

**改法**

1. 加载中的占位（只在 U1 的 120 ms 超时后出现）：行内 `display:inline-block; min-width:2.2em; height:1.25em; border-radius:5px; background:color-mix(in srgb, var(--ink) 8%, transparent); vertical-align:-0.18em`；块级 `display:block; min-height:2.8em; margin:.6em 0`。不加 shimmer 动画（1–2 帧的东西动起来更扎眼）。
2. 失败态：等宽 code 样式 + `$latex$` 原文 + `title="公式排版没加载成功，点击重试"`；点击 chip 调 `ensureKatex()` 重试并 toast「公式排版组件没加载成功，先显示 LaTeX 原文」。不要留一块灰 chip 永不消失。
3. 渲染门槛：CSS 必须在 `link.onload` 之后才允许 `katex.render`；CSS 失败就一律走失败态，不插 KaTeX 的 HTML。字体失败不用处理。
4. 样式落点：`src/styles.css` 目前**完全没有** `.tiptap-mathematics-render` 规则（只有 `.math-preview`:1798、`.math-draft-preview`:2041）；依赖已经发出 `tiptap-mathematics-render--editable`、`block-math-error`/`inline-math-error` 类（`node_modules/@tiptap/extension-mathematics/dist/index.js:132,140-143,306,312-315`）却没人用。建议在 `.math-preview` 旁加 `.tiptap-mathematics-render.is-loading` / `.is-error` / `--editable { cursor: pointer }`。

**难度**：S（样式）+ M（loading/error/retry 状态机与重画通知）。

---

## U3 块级公式在编辑区按「行内」排版，且压住下一段（影响大，且决定占位高度）

**证据**

- `.editor [data-type="block-math"]` 高 **33.1 px**（= 一行 33.15 px），`.katex-display` 数量 **0**，`text-align:start`（`.tmp/ux/probe-visual.log`）。
- 预览里同一公式：`.katex-display` 高 39.8 px、`margin:16px 0`、居中；导出是 `<math display="block">` 高 36.2/42.9 px。三方不一致：`shots/round-11/u1-light-math-closeup.png`、`u1-preview-vs-editor-preview.png`。
- 更严重：绘制内容溢出 wrapper **2.3–3.2 px**，块后紧跟的 `<p>` 间距 **0 px**，字面压在一起；`shots/round-11/u3-math-editor.png` 里「正文继续」被积分式压住，`u3-block-overlap.png` 是同一现象的特写（`.tmp/ux/probe-overlap.mjs` 输出 collisionPx 3.2 / 2.3 / 3.2）。
- 根因：`Mathematics.configure({...})`（`src/App.tsx:638-646`）没传 `katexOptions`；扩展 NodeView 调 `katex.render(latex, el, katexOptions)` 时没传 `displayMode`（`node_modules/@tiptap/extension-mathematics/dist/index.js:139` 与 `:311`），默认 `false`。`PreviewPane.tsx:18-21` 和 `export.ts:135` 都显式传了 `displayMode: block`。
- 顶层 `katexOptions` 会同时作用于 inline 与 block（`index.js:394-400`），直接配 `displayMode:true` 会把行内公式也变成 display 态。最便宜的修法是在惰性 shim 的 `render()` 里按 `el.closest('[data-type="block-math"]')` 推断 `displayMode`；要「正确」则换本地 NodeView。
- 修好后的高度（`file://` 17 px 基准）：`\frac` 42.3、`\int` 50.9、`\sum` 60.3 px，比现在每块多 12–27 px；加上 1em 上下间距，首屏位移会显著大于今天。**所以本轮不能靠占位去追这个高度，必须靠 U1 的 gate。**

**改法**：在 `katexLazy.render` 里推断 `displayMode`；给 `.tiptap-mathematics-render[data-type="block-math"]` 加 `margin: 1em 0` 并居中。两处共约 5 行，顺带把 U2 的块级占位高度定死。

**难度**：S（shim 推断）；M（本地 NodeView，若不想依赖依赖内部结构）。

---

## U4 插入延迟：今天 1–3.5 ms，不需要 loading 态；要预取，不要 spinner

**证据**

- 点「插入 ▾ → 公式」（`window.prompt` 换成同步返回值）到 `.editor .katex` 出现：**0.9 / 1.3 / 3.5 ms**（3 次，`.tmp/ux/probe-latency.log`）。
- 点已有块级公式打开 `MathInlineEditor`：输入框聚焦 **10–14.3 ms**，预览同帧（0 ms）；输入 64 个字符的长公式，每键 input→下一帧 **4.6–15 ms**（中位 6.3），不卡（`u3-math-editor.png`）。
- 惰性后首次插入若模块未到，就是 U1 的 27–102 ms 空窗（脚本本身 17–90 ms）。

**改法**

1. 在「插入 ▾」`pointerdown`/菜单打开时 `void ensureKatex()`；编辑器里第一次输入 `$` 时也预取。人从开菜单到点公式通常 ≥200 ms，足够覆盖 chunk 加载。
2. 点「公式/公式块」时 `await ensureKatex()` 再 insert；或先 insert 再 await，但此时节点视图必须会重画。
3. 不要加 loading 态/spinner：正常路径 <15 ms，闪一下 spinner 更糟。只有 `ensureKatex()` 超时或 reject 才 toast 一次（复用 U2 的文案）。
4. 顺带记录：插入走 `window.prompt`（`src/App.tsx:3342`、`:3352`），桌面应用里是浏览器式对话框，不能预览。已有 `MathInlineEditor`（`src/components/MathInlineEditor.tsx:21`）可以复用：插空节点 → 立刻打开就地编辑器，与点公式编辑同一条路径。本轮可只预取，替换 prompt 留到下轮（M）。

**难度**：S（预取 2 处 + 1 个 await）。

---

## U5 导出与暗色：MathML 可接受，但字号/块间距与编辑区不一致；暗色无需专门处理

**证据**

- 导出 HTML 4,303 B、0 个 `<link>`、0 个 `@font-face`、4 个 `<math>`（2 block / 2 inline），直接用浏览器打开可读，Windows 下用 Cambria Math（`shots/round-11/u4-export-mathml.png`）。
- PDF：`Page.printToPDF` 50,162 B、1 页、嵌入 `MicrosoftYaHei-Bold` / `MicrosoftYaHei` / **`CambriaMath`**、有 `ToUnicode` → 公式是可选中文字，打印/PDF 不受影响；打印媒体模拟与屏幕一致（`u4-export-print-media.png`）。
- 瑕疵 1：导出公式字号 17 px（= 正文），编辑区 KaTeX 是 20.57 px（1.21em）；行内公式 63.1 px vs 79 px（窄 20%），块级也偏小。
- 瑕疵 2：相邻两个块级公式间距 **0 px**（预览里是 16 px）；`\ln 2` 导出成 `ln2`（MathML 丢函数空格）。
- 暗色：`.katex` 继承 `--ink` `#e9e6e0`，`frac-line` 用 currentColor、1 px，背景 `#15171a` → 对比 **14.7:1**；切明暗后节点尺寸不变（33.14 px / 20.57 px），不重排（`u5-dark-formulas.png`、`u5-dark-math-closeup.png`）。观感上 KaTeX 笔画比中文细，但不需要为暗色加 text-shadow/描边（会改字形宽度）。
- 惰性风险：`exportAs`（`src/App.tsx:2851-2886`）与 `buildHtmlDocument` 同步，`export.ts:135` 同步 `renderToString(output:'mathml')`；模块没到时会静默落到 `$latex$` 的 `<code>` 回退（`export.ts:133`）。

**改法**

1. 导出样式加 `span.math { font-size: 1.21em }`、`span.math-block { display:block; margin:1.2em 0; text-align:center }`（`src/lib/export.ts` 的 `STYLES`，54-128 行）。`\ln 2` 可在导出的 latex 里对 `\ln|\sin|\cos|\log` 后补 `\,`，或接受差异。
2. `exportAs` 变 async，先 `await ensureKatex()`；失败时提示「公式将以 LaTeX 原文导出」，不要静默降级。
3. 暗色不改样式；只需确认 U3 修好后块级公式的上下间距在深色下也够（1em 即可）。

**难度**：S（CSS + 导出 await）；`\ln` 空格 S。

---

## 界面代码优化机会（≤3，按收益排）

1. **四处重复的公式渲染 + 三套参数**：`PreviewPane.tsx:13-25`、`MathInlineEditor.tsx:32-39`、`MathDraftPreview.tsx:16-22`、`export.ts:131-142`。抽到 `src/lib/math.ts` 的 `renderMathHtml(latex, {display})`，惰性/占位/错误只实现一次，同时统一 U3 的 `displayMode`。约减 40 行重复，且减少本轮改漏一处渲染路径的风险。
2. **PreviewPane 用 DOM 解析整篇 HTML**：`PreviewPane.tsx:14-23` 每次 memo 都 `DOMParser` + `replaceWith`；`src/lib/math.ts:50` 的 `replaceMathHtml` 已是字符串级、已有测试。实测 40 个公式生成 78.6 KB HTML 2.5 ms，13 个公式切预览 37.9 ms；换成字符串替换可省一次 DOM 构建，代码更少。
3. **公式节点没有样式与可点提示**：`styles.css` 无 `.tiptap-mathematics-render` 规则，依赖已发出的 `--editable` / `*-math-error` 类悬空。加到 `.math-preview`（`styles.css:1798`）旁 8–12 行，覆盖 hover / cursor / loading / error / 块级间距；否则本轮占位只能写内联样式。

---

## 截图索引（`shots/round-11/`）

| 文件 | 内容 |
| --- | --- |
| `u1-typeset.png` | 当前排版态，5 个公式 |
| `u1-placeholder-raw.png` | 同一文档的加载前态（裸 LaTeX） |
| `u2-placeholder-raw-paper.png` | 论文式文档加载前态：整篇像源码，首段 4 行 |
| `u2-typeset-paper.png` | 同一文档排版态，首段 2 行（对照） |
| `u2-placeholder-chip-paper.png` | 灰 chip 占位候选 |
| `u2-placeholder-failed-paper.png` | 失败态（等宽原文 + 虚线） |
| `u2-no-katex-css.png` | CSS 缺失：公式显示两份 |
| `u2-font-blocked-500ms.png` / `u2-font-blocked-4000ms.png` | 字体缺失回退 Times，不隐身 |
| `u1-preview-vs-editor-preview.png` | 预览（居中 display 态）与编辑区（行内态）不一致 |
| `u1-light-math-closeup.png` | 编辑区块级公式特写：无间距、贴下一段 |
| `u3-block-overlap.png` | 块级公式内容溢出压住下一段 |
| `u3-math-editor.png` | 就地编辑器打开（10–14 ms），下方公式压住「正文继续」 |
| `u1-display-mode-reference.png` | 标准 display 态（`file://` 参考，42.3 px） |
| `u4-export-mathml.png` / `u4-export-print-media.png` / `u4-export-dark.png` | 导出 HTML 的屏幕/打印/暗色 |
| `u5-dark-formulas.png` / `u5-dark-math-closeup.png` | 暗色全文与特写 |

## 未验证

- 惰性构建本身不存在，闪烁是「排版态→加载前态」的等价量测，不是实际 `katexLazy` 产物。
- 真实冷盘首启：89.9 ms 是 `file://` 首次 + cache-disabled，16.7 ms 是 OS 缓存热；WebView2 真窗口未测（本机 CDP 浏览器是 Edge headless）。
- 离线/chunk 失败的注入未做，失败态用「无 CSS 页面」和「挡 woff2」模拟。
- PDF 在真人阅读器里的分页、屏幕阅读器、中文输入法下的公式编辑未测。
