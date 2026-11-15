# 第 05 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-05/plan.md`（基线 `11c3348`，v0.17.0）。
审查方式：读计划、三份 findings、`src/App.tsx` 键盘段、`src/components/FileMenu.tsx`、`src/components/useDialogFocus.ts`、`src/lib/export.ts`、`src/lib/math.ts`、`scripts/vite-woff2-only.mjs`、`scripts/acceptance.mjs`、`index.html`；未改产品文件、未 commit。
审查日期：2026-11-15。

## 结论：**REVISE**

H1（浏览器保留键 + Tiptap 删除线没真正解绑）、H3（导出公式的正则按错属性顺序写）、H4（字体插件先检查后删除，构建直接红）是 blocker；H2/H5/H6 会把验收做假或让并行测试互相干扰。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 把 `Ctrl+N`/`Ctrl+O`/`Ctrl+Shift+S`/`Ctrl+Shift+E`/`F1` 当普通页面键；这些在 Chrome/Edge 里是浏览器级快捷键，headless CDP 不会触发，计划却只用 CDP 验收，也没标 UNVERIFIED。更硬的一条：计划只「在现有 shortcutExtension 里加 `Mod-Shift-x`」，但 Tiptap 的 Strike 仍注册着 `Mod-Shift-s`；`Ctrl+Shift+S` 会同时触发删除线和另存为 | `plan.md:12-18,23`；`findings-bug.md:7,145`（浏览器级键未验）；`node_modules/@tiptap/extension-strike/dist/index.js:59-60`（`Mod-Shift-s`）；`App.tsx:369-382`（shortcutExtension 只有 `Mod-Enter`）；`plan.md:30` 只把 `?` 的输入冲突写进风险 | 用 `StarterKit.configure({ strike: false })` + 自定义 `Strike`（`Mod-Shift-x`）真正解绑 `Mod-Shift-s`；浏览器保留键另给替代键或显式 UNVERIFIED + 有头 Edge/宿主真人验收；`?` 明确只在 `event.target` 非输入/可编辑区时触发 | T1 |
| H2 | major | T2 只给 `html[data-theme='dark']` 写 `color-scheme: dark`；当主题是「跟随系统」且系统深色时，`data-theme='system'`，`color-scheme` 仍是 `:root` 的 `light`，原生下拉/滚动条不会跟随——目标里的「原生控件跟随」不成立。首屏白帧验收用 `page.screenshot` 序列，抓不到首帧前的白闪，计划自己也只能标 UNVERIFIED | `plan.md:41`（`color-scheme` 只在 data-theme dark）、`:44`（screenshot 序列）；`styles.css:26`（变量在 media 里，`:root` 无 color-scheme）；`findings-bug.md:53-59`（纯白帧 255 用 `Page.startScreencast` 抓到） | 深色 `color-scheme` 同时写在 media 选择器里：`@media (prefers-color-scheme: dark){ html:not([data-theme='light']){color-scheme:dark} }`；白帧用 `Page.startScreencast` 抓帧+亮度阈值，或明确 UNVERIFIED 并给出人工补法 | T2 |
| H3 | blocker | T3 的 `replaceMathHtml` / `mathToPlainText` 正则按 `<span data-type="inline-math" data-latex="…">` 的属性顺序写，但 Tiptap 实际导出的 HTML 是 `<span data-latex="E=mc^2" data-type="inline-math"></span>`；按计划正则匹配不到，导出 HTML 仍是空 span、TXT 仍丢公式。单测若按计划顺序构造 HTML 会假绿 | `plan.md:56`（属性顺序）；`findings-bug.md:40`（实际 `data-latex` 在前）；`src/lib/export.ts:126-146`（bodyHtml 直接拼）；`plan.md:59`（单测构造） | 正则只依赖 `data-latex` 与 `data-type` 两个属性（顺序无关），或先 `DOMParser` 再替换；单测用**真实 `editor.getHTML()` 输出**（含两种属性顺序）做 fixture；TXT 同样处理 | T3 |
| H4 | blocker | T5 把 `EXPECTED_FACES` 改成 16，却写「在 `checkFaces` 之后按名删 4 个 face」。现插件顺序是「重写 → `checkFaces` → 删资产」；`checkFaces` 仍数到 20 个 `@font-face`，会抛「@font-face 数为 20，期望 16」，T5 的 `.tmp/build-b` 直接失败 | `plan.md:87-88`；`scripts/vite-woff2-only.mjs:62-78`（`checkFaces` 按 `EXPECTED_FACES` 计数）、`:97-102`（先 replace 再 check）、`:104-106`（之后才删 woff）；`plan.md:91` 验收 16 | 删除 4 个 face 必须在 `checkFaces` 之前（或 `checkFaces` 接受「删除后的 16」）；同时断言 4 个被删 face 名与 2 个被删 woff2 资产不在产物里；`acceptance.mjs` 的 `faces===16` 保留 | T5 |
| H5 | major | T4 把 `chunkSizeWarningLimit` 提到 900，注释写了「不拆 KaTeX」，但 README 没有一行说明，等于把告警藏进配置文件；`shot.mjs` 默认改 `.tmp/shots/shot.png` 会让 AGENTS/README 里旧的「`npm run shot` 直接出证据」路径失效（计划已改 AGENTS/README，但验收只查字符串）；0.18.0 与 CHANGELOG 由 T4 同改，没有人核对 `package-lock.json` 仍是 0.8.0 | `plan.md:71-75`；`AGENTS.md` 第 3 节；`README.md` 命令清单；`package.json:3`；`package-lock.json:3`（0.8.0） | README 加一行「为什么 900 不拆」；AGENTS/README 的 shot 用法改成 `--out` 并保留旧图；T4 明确 CHANGELOG 0.18.0 与 package.json 同源，`package-lock` 版本随根代理 build 时更新或显式忽略 | T4 |
| H6 | major | 并行隔离只到文件，没到 CDP：T1/T2/T3 的验收都在 dev 5173 + CDP 9222，T5 的 `font-probe.mjs` 也写 CDP 9222（`plan.md:89`）。A 组还在改 `src`/主题/keyboard，B 组同时清 localStorage、切页面、抓 `document.fonts`，会互相踩页面与焦点；`shot.mjs` 的默认路径改动又让 A 组的旧截图命令行为变化。构建纪律只分了 `.tmp/build-a`/`.tmp/build-b`，没分 CDP profile/端口 | `plan.md:4,89`；`plan.md:5`（font-probe CDP 9222）；`scripts/font-probe` 未写端口隔离；`scripts/useDialogFocus`/keyboard 验收（A） | T5 改 CDP 9224 或独立 `--remote-debugging-port`；A/B 的验收脚本各自 `newContext` 并清 localStorage；构建纪律补「CDP 端口按组隔离」；T4 的 shot 改动先于 A 的截图验收完成 | T5/T1-T3 |

---

## H1（blocker）浏览器保留键与 Tiptap 删除线

**浏览器保留键。** 计划 `:12` 把 `Ctrl+N`、`Ctrl+O`、`Ctrl+Shift+S`、`Ctrl+Shift+E`、`F1` 都当普通页面快捷键，验收 `:23` 用 Playwright/CDP 派发。findings-bug `:7` 明写「headless 的 CDP 键盘事件不触发浏览器级快捷键，只能验证产品有没有 `preventDefault`；宿主 WebView2 的默认行为本轮未跑」，`:145` 把「浏览器级 Ctrl+N/Ctrl+Shift+S/Ctrl+F 默认行为」列为未验证。计划没有把这四个键标 UNVERIFIED，也没有准备替代键。

**Tiptap 删除线没有真正解绑。** 计划 `:12` 说「删除线改 `Ctrl+Shift+X`（在现有 `shortcutExtension` 里加 `Mod-Shift-x`）」。但 `shortcutExtension`（`App.tsx:369-382`）只有 `Mod-Enter`；删除线的 `Mod-Shift-s` 来自 `StarterKit` 内的 `@tiptap/extension-strike`（其 `addKeyboardShortcuts` 返回 `Mod-Shift-s`）。只加一个新键不会移除旧键，`Ctrl+Shift+S` 仍会 `toggleStrike`，同时全局 window 监听又会执行另存为——两个动作叠加。

**最小修法**：`StarterKit.configure({ strike: false })`，再用 `Strike.extend({ addKeyboardShortcuts: () => ({ 'Mod-Shift-x': ... }) })`，或直接把自定义扩展的 `priority`/`addKeyboardShortcuts` 覆盖并关闭 Strike；验收要断言 `Ctrl+Shift+S` 后正文无 `<s>`（现在 `App.tsx:1427` 只判 `mod && key==='s'`，计划 `:21` 已写此断言，但实现路径不成立）。浏览器保留键另给替代键（如 `Ctrl+Alt+N/O`）或标 UNVERIFIED，加一条有头 Edge/宿主真人验收。

**`?`/F1**：计划 `:17` 让 `?`/`F1` 打开一览，`:30` 只在风险里说「避免在输入框中触发」；步骤与验收没有输入态用例。`?` 是正文常用字符，必须在 `event.target` 为 input/textarea/contenteditable 时跳过，并补一条「在正文里打 `?` 不弹一览」的断言。

## H2（major）主题：系统深色的原生控件与白帧

计划 `:41`：

```css
:root { color-scheme: light }
html[data-theme='dark'] { color-scheme: dark }
@media (prefers-color-scheme: dark) { html:not([data-theme='light']) { ...变量... } }
```

深色变量在 media 里覆盖，但 `color-scheme` 只在 `data-theme='dark'` 时变 dark。`theme='system'` 时 `data-theme='system'`，系统深色下变量变深、`color-scheme` 仍是 light → 原生 `<select>` 弹层、滚动条仍是浅色。用户目标「原生控件跟随」不成立。修：把 `color-scheme: dark` 也放进 media 选择器（`html:not([data-theme='light'])`）。

**白帧测法**：计划 `:44` 用 `page.screenshot` 序列替代 `Page.startScreencast`，理由是避免解码依赖；但 `page.screenshot` 会等页面稳定、抓不到首帧前的白闪。findings-bug `:53-59` 是用 `Page.startScreencast` 抓到亮度 255 的纯白帧。按现计划，脚本很可能「没看到白帧」而误判 PASS。修：用 screencast 帧 + 亮度阈值，或明确标 UNVERIFIED 并写人工补法；不能把「抓不到」写成「已修」。

## H3（blocker）导出公式的正则属性顺序

findings-bug `:40` 的实际 HTML：

```html
<span data-latex="E=mc^2" data-type="inline-math"></span>
```

计划 `:56` 的正则按 `data-type` 在前、`data-latex` 在后写。Tiptap 的 `renderHTML` 输出顺序由扩展决定（当前是 `data-latex` 在前），按计划正则匹配不到，`replaceMathHtml` 不替换，导出 HTML 仍是空 span，TXT 仍丢公式。单测若按计划里的字符串顺序构造 fixture，会假绿；真实 `export-math-acceptance` 才会红。

修：正则只匹配 `data-latex` 和 `data-type` 两个属性（顺序无关），或先用 `DOMParser` 把 `bodyHtml` 变 DOM 再替换；单测 fixture 直接用 `editor.getHTML()` 的真实输出，并覆盖行内、块级两种形态。`mathToPlainText` 同样处理。

## H4（blocker）字体插件先 check 后 delete

当前 `scripts/vite-woff2-only.mjs`：

1. `:97-101` 重写所有 `@font-face`；
2. `:102` `checkFaces(css)` 按 `EXPECTED_FACES` 数 `@font-face`；
3. `:104-106` 才删 ttf/woff 资产。

T5 计划 `:87` 把 `EXPECTED_FACES` 改成 16，却写「在 `checkFaces` 之后按名删 4 个 face」。`checkFaces` 会先数到 20，抛 `@font-face 数为 20，期望 16`，`.tmp/build-b` 失败；`acceptance.mjs:82` 的 `faces===16` 根本跑不到。

修：先删 `DROPPED_FACES` 的 `@font-face` 块与对应 woff2 引用，再 `checkFaces`（expected 16），最后删 ttf/woff 资产；并在插件里断言 4 个被删名字不在 CSS、2 个 woff2 资产不在 bundle。`KaTeX_Size3` 的 data URI 不动。

## H5（major）T4 的构建口径与截图默认路径

- `chunkSizeWarningLimit: 900` 是显式口径，注释写了「KaTeX 因 Tiptap 扩展静态 import 留在主 chunk、本轮不拆」，但 README 没有一行解释；未来新增依赖撞 900 时不会再报警，读者只能翻 `vite.config.ts`。README 加一行「为什么是 900、为什么不拆」即可。
- `shot.mjs` 默认改 `.tmp/shots/shot.png`，计划已同步 AGENTS/README；但验收只 `Select-String` 字符串，没有跑一次不带 `--out` 的默认路径；补一条「默认路径生成 `.tmp/shots/shot.png`，且 `git status` 无 `shots/` 变更」。
- `package.json` 0.18.0 与 CHANGELOG 由 T4 同改，这条归属清楚；`package-lock.json` 还是 0.8.0，T4 不碰，根代理最终 build 时要么同步要么在报告里写明不阻塞。

## H6（major）CDP 9222 被 A 组和 T5 共用

计划 `:4` 说 A 的验收在 dev 5173 + CDP 9222；T5 的 `font-probe.mjs`（`:89`）也写 CDP 9222，且要清 localStorage、切页面、读 `document.fonts`。A 组 T1/T2/T3 同时在做键盘/主题/导出验收，两组会互相踩页面、焦点与 localStorage，出现「单独跑绿、并行跑红」的假失败。构建纪律只隔离了 `.tmp/build-a`/`.tmp/build-b`，没隔离 CDP profile/端口。

修：T5 用 9224 或自己起独立 `--remote-debugging-port` 的 profile；A/B 验收脚本各自 `newContext`、清 localStorage、关页面；在构建纪律里写「CDP 端口按组隔离，不共用 9222」。

## 逐项核对记录

### T1
- 键位与焦点：`Ctrl+Shift+S` 的现有 bug（`App.tsx:1427` 只判 `mod && s`）确认；FileMenu 无方向键/焦点转移（`FileMenu.tsx:18-63`）确认；`useDialogFocus` 的 `inert` 逻辑（`useDialogFocus.ts:29-38`）在加 `<main>` 后会 inert 主列，符合模态预期；skip link 放 `.app` 首子元素可行。
- 风险：浏览器保留键与 Tiptap Strike 未解绑（H1）；`?` 输入态（H1）。
- 验收：CDP 能验 `preventDefault` 与产品动作，不能验 Chrome 新窗口/保存网页；需标 UNVERIFIED。

### T2
- `index.html` 内联脚本读 `sidelight.settings.v1` 与 `src/lib/settings.ts:17` 一致；`theme` 缺省 `'system'` 兼容旧数据。
- 系统主题实时：现有 `@media (prefers-color-scheme: dark)` 已能跟随（findings-bug `:78`），计划保留。
- `data-theme`/media 双选择器：变量层没问题；`color-scheme` 漏 media（H2）。白帧截图测法不足（H2）。

### T3
- `applySource` 的导出前置（`plan.md:56`）与 `export.ts` 的 `buildHtmlDocument` 结构可接；MathML 输出自包含，Chromium 157 可读；编辑器 KaTeX HTML 与导出 MathML 的视觉差异可接受，建议在 `impl-a` 记录一次对照截图。
- 关键失败：正则属性顺序与真实 HTML 不符（H3），按现计划导出仍空。
- TXT：`mathToPlainText` 的 `$latex$` 回填方向对；需覆盖块级 `$$…$$` 与 `&amp;` 解码。

### T4
- `chunkSizeWarningLimit` 只改告警线，不改产物；注释理由够用，README 缺一行（H5）。
- `shot.mjs --out` 与默认 `.tmp/shots` 的改法可行；AGENTS/README 已列，验收补默认路径（H5）。
- 版本 0.18.0 与 CHANGELOG 同属 T4，归属清楚；`package-lock` 仍 0.8.0 需根代理收尾。

### T5
- 4 个 face 的删除逻辑与 `EXPECTED_FACES`/`acceptance` 的耦合已看到，但顺序反了（H4）。
- `font-probe` 的 10 个样本若不含 `\mathbf{\mathfrak{…}}` 一类嵌套，删 face 的结论不能外推到所有文档；脚本应把「被删 face 未请求」与「Regular 仍加载」分开打印，并在 README 写明只影响装饰字形。
- README 已要求「只影响安装包/dist，不影响首屏」，方向对。

### 通用
- 文件归属：A 组 T1/T2/T3 都改 `src/App.tsx`，同 builder 串行；`index.html`/`styles.css` 也串行；B 组 T4/T5 改 `README.md` 串行；`vite.config.ts` 只 T4、`package.json` 只 T4。零并发重叠成立。
- 构建纪律：A `.tmp/build-a`、B `.tmp/build-b`；根代理最终 build；成立。缺口是 CDP 端口未隔离（H6）。
- 独立复现：T1 的浏览器级键、T2 的白帧、T5 的字体样本都依赖人工/真机；计划已部分标 UNVERIFIED，需把 H1/H2 的降级写清楚。

## 做对的地方（别改过头）

1. T1 把「焦点还原」抽到 `useDialogFocus` 并覆盖 FileMenu/ShortcutsDialog，方向对；`inert` 已证明能挡背景，不要退回只写 `aria-modal`。
2. T2 用 `index.html` 同步内联脚本 + `<meta color-scheme>` 解决首帧，是正确路线；只差 `color-scheme` 的 media 分支与白帧测法。
3. T5 只删 A 档 4 个装饰 face、保留 Regular/AMS/Math/Size/SansSerif-Regular 的边界是对的；`font-probe` 先测后删的做法也应保留。

---

### 附：本次审查证据

- `node_modules/@tiptap/extension-strike/dist/index.js:59-60`：`Mod-Shift-s` 仍在。
- `App.tsx:369-382`：`shortcutExtension` 只注册 `Mod-Enter`。
- `findings-bug.md:40`：真实导出片段 `<span data-latex="E=mc^2" data-type="inline-math"></span>`。
- `scripts/vite-woff2-only.mjs:62-78,97-106`：先 `checkFaces`（20）后删资产。
- `styles.css:26` 与 `plan.md:41`：`color-scheme` 只在 data-theme dark。
- `plan.md:4,89`：A 与 T5 都用 CDP 9222。
- 未改产品文件、未 commit；截图/日志未新增。
