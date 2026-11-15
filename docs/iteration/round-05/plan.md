# 第 05 轮 · 计划（rev2）

基线 `11c3348`（v0.17.0）。5 个任务：A 组（builder，UI）T1→T2→T3 串行；B 组（builder2，构建/体积）T4→T5 串行，可并行于 A。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`；B 用 `npx vite build --outDir .tmp/build-b`。**CDP 按组隔离**：A 用 `http://127.0.0.1:9222`，B 用 `:9224`；每个验收脚本自己 `browser.newContext()`、清 `localStorage`、结束关页，不共用页面与焦点。`package.json` 只归 T4（0.18.0）；`package-lock.json` B 不手改，由根代理 `npm install --package-lock-only` 同步。截图一律显式 `--out shots/round-05/…`，不依赖默认路径。

## T1 键盘与焦点：冲突、快捷键、菜单模型、skip link（U1/U2/H1）｜A 组（builder，先做）

- **目标**：只用键盘能走完「新建 → 写 → 保存 → 导出」；`Ctrl+Shift+S` 不再给正文划删除线、也不再被产品当作保存；文件菜单有方向键与键位列、动作后焦点归还；第一下 Tab 直达正文；有一页快捷键一览。
- **为什么现在**：B2 实测 `Ctrl+Shift+S` 既给正文加 `<s>` 又走保存（`App.tsx:1427` 没判 `shiftKey`）；Tiptap `Strike` 自带 `Mod-Shift-s`，只加新键解不掉旧键；U1 实测 23 次 Tab 才进正文、无 skip link、菜单/导出/取消确认框都把焦点丢给 `<body>`；U2 实测 `aria-keyshortcuts` 全站 0、菜单无键位列。**键位改用浏览器不保留的组合**，避免 `Ctrl+N/O/Shift+S/Shift+E` 被浏览器抢走。
- **文件**：`src/App.tsx`、`src/components/FileMenu.tsx`、`src/components/useDialogFocus.ts`、`src/components/ShortcutsDialog.tsx`（新）、`src/styles.css`、`index.html`、`scripts/keyboard-acceptance.mjs`（新）
- **步骤**
  1. 新键位（**只绑这些**）：保存 `Ctrl+S`（`!shiftKey` 且 `!altKey`）、另存为 `Ctrl+Alt+S`、新建 `Ctrl+Alt+N`、打开文件 `Ctrl+Alt+O`、打开文件夹 `Ctrl+Alt+Shift+O`、导出菜单 `Ctrl+Alt+E`；`Ctrl+N/O/Shift+S/Shift+E` 一律不绑。导出菜单打开后焦点进第一项。
  2. **真正解绑删除线**：`StarterKit.configure({ strike: false })`，另写一个 `Strike` 扩展只注册 `Mod-Shift-x`（`addKeyboardShortcuts` 只返回这一条），确认 `Ctrl+Shift+S` 上没有任何产品动作（既不删线也不另存）。
  3. `dialogOpen` 时已注册快捷键仍 `preventDefault()`，只是不执行动作（避免浏览器「保存网页」）；`Esc` 逻辑不变。
  4. `FileMenu`：打开后焦点进第一项；`ArrowUp/Down/Home/End` 循环；`Tab`/`Shift+Tab` 关闭并把焦点还给触发器；外点关闭；每项右侧 `<kbd>` + `aria-keyshortcuts`；动作后焦点按动作归还（新建 → 正文，其余 → 触发器）。导出菜单复用同一套（补 `aria-haspopup`/`aria-expanded`）。
  5. `useDialogFocus` 兜底：`opener` 已卸载时聚焦 `[data-focus-fallback]`，没有则第一个 `.file-menu-trigger`，绝不落到 `<body>`。
  6. skip link 与地标：`.app` 第一个可聚焦元素 `<a class="skip-link" href="#editor">跳到正文</a>`（`:focus` 才显示），正文列包 `<main id="editor" tabindex="-1">`。
  7. 快捷键一览：`ShortcutsDialog.tsx`（复用 `.dialog` + `useDialogFocus`），顶栏「?」按钮与 `?` 打开（**只在 `event.target` 不是 input/textarea/contenteditable 时**；不用 F1，F1 是浏览器帮助键），设置里加同入口。清单只列真实键位：新建 Ctrl+Alt+N、打开文件 Ctrl+Alt+O、打开文件夹 Ctrl+Alt+Shift+O、保存 Ctrl+S、另存为 Ctrl+Alt+S、导出菜单 Ctrl+Alt+E、查找 Ctrl+F（Ctrl+H 同义，写明）、批注 Ctrl+Enter、粗体/斜体 Ctrl+B/I、删除线 Ctrl+Shift+X、行内代码 Ctrl+E、预览 Ctrl+Shift+P、字号 Ctrl+=/−/0、Esc；并注明「Ctrl+N/O/Shift+S 被浏览器保留，未绑定」。
- **验收（`node scripts/keyboard-acceptance.mjs` 全 PASS）**
  1. `Tab#1` 是 skip link，`Enter` 后焦点在 `#editor`/`.ProseMirror` 内（从顶到正文 1 次 Tab）。
  2. `Ctrl+Alt+S`：打桩 picker 调用 1→2、正文无 `<s>`、`docName` 变化、`dirty=false`；`Ctrl+S` 仍写回当前文件、picker 不增。
  3. `Ctrl+Shift+S`：正文无 `<s>`、picker 调用不增、不出现「已保存/已取消」新提示（产品不接管该键）；浏览器自身是否弹「另存网页」**标 UNVERIFIED**（CDP 不触发浏览器级快捷键）。
  4. `Ctrl+Alt+N`：干净文档得到空 `未命名.md`、`dirty=false`；脏文档先弹确认。`Ctrl+Alt+O`/`Ctrl+Alt+Shift+O` 分别调用两个 picker 桩。
  5. `Ctrl+Alt+E` 打开导出菜单，焦点在第一项；`ArrowDown`+`Enter` 触发一次下载。
  6. 文件菜单：焦点进首项、`ArrowDown` 移动、`Esc` 后回「文件」按钮；选「另存为」后回触发器。
  7. 从菜单项打开设置（opener 随菜单卸载）→ `Esc` 后焦点不是 `<body>`。
  8. `?` 打开一览、`Esc` 关闭归还焦点；**在正文输入 `?` 不弹一览**（只在非编辑区触发）。
  9. **纯键盘 E2E**：`Ctrl+Alt+N` → 输入 `键盘链路-KB` → `Ctrl+S`（打桩）→ `Ctrl+Alt+E` → `ArrowDown`+`Enter` → 下载的 HTML 含 `键盘链路-KB`；全程不点鼠标。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/keyboard-acceptance.mjs`
- **风险与回退**：`Ctrl+Alt+*` 在部分键盘布局上与 AltGr 冲突（欧洲布局），中文/美式键盘不受影响，写进一览脚注；删除线键位变更会改肌肉记忆；`<main>` 会改变 `useDialogFocus` 的 `inert` 兄弟节点集合，需复跑第 4 轮三个 acceptance 脚本。回退：`git checkout -- src/ index.html` 并删 `ShortcutsDialog.tsx`、脚本。
- **难度** M ｜ **量级** 220–300 行

## T2 主题：三档、持久化、首屏不闪、原生控件跟随（U3/H2）｜A 组（builder，T1 后）

- **目标**：设置首行三档「浅色 / 深色 / 跟随系统」，立即预览、保存后持久；深色刷新不再白闪；**「跟随系统」在系统深色时原生下拉与滚动条也是深色**。
- **为什么现在**：B4 实测深色 reload 抓到亮度 255 的纯白帧（根因 `index.html` 无内联背景、`styles.css` 无 `color-scheme`）；U3 实测没有手动主题、`documentElement.dataset` 为空、`color-scheme` 计算值 `normal`，系统深色下原生 `<select>` 弹层与滚动条仍浅色。
- **文件**：`index.html`、`src/lib/settings.ts`、`src/components/SettingsDialog.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/theme-acceptance.mjs`（新）
- **步骤**
  1. `Settings` 加 `theme: 'light' | 'dark' | 'system'`（默认 `'system'`）；`loadSettings` 对旧数据缺字段时按 `'system'`。
  2. `index.html`：`<meta name="color-scheme" content="light dark">`；`<head>` 内联 `<style>html{background:#f6f4ee}@media (prefers-color-scheme:dark){html{background:#15171a}}html[data-theme='dark']{background:#15171a}html[data-theme='light']{background:#f6f4ee}</style>`；紧跟同步内联脚本读 `sidelight.settings.v1` 的 `theme` 写 `document.documentElement.dataset.theme`，必须在 `<script type="module">` 之前。
  3. `styles.css`：`:root { color-scheme: light }`；`html[data-theme='dark'] { color-scheme: dark }`；**跟随系统也要深色**：`@media (prefers-color-scheme: dark) { html:not([data-theme='light']) { color-scheme: dark } }`；深色变量用「`html[data-theme='dark']` + `@media (prefers-color-scheme: dark) { html:not([data-theme='light']) }`」两个选择器、颜色表只写一份；引用块竖线提到 `color-mix(in srgb, var(--accent) 55%, var(--line-strong))`。
  4. 设置对话框首行加三段控件（`role="radiogroup"` + `aria-checked`），点选立即改 `documentElement.dataset.theme`（预览），保存写入 settings，取消则还原打开时的值。
  5. `App.tsx` 挂载时按 `settings.theme` 同步一次 `documentElement.dataset.theme`。
  6. `scripts/theme-acceptance.mjs`：三档切换 + reload 持久化；`colorScheme` 断言：深色档为 `dark`、**系统深色 + `data-theme='system'` 也为 `dark`**、浅色档为 `light`；白帧用 CDP `Page.startScreencast` 抓 reload 前 4 帧并算亮度，出现亮度 > 200 的整帧即 FAIL；**screencast 拿不到帧就标 UNVERIFIED**（不用 `page.screenshot` 序列冒充）。
- **验收**：脚本全 PASS 或按条 UNVERIFIED；截图 `shots/round-05/t2-light-1440.png`、`t2-dark-1440.png`、`t2-dark-settings.png`、`t2-system-dark.png`；`index.html` 内联脚本在模块脚本之前（按源码顺序断言）；深色下正文/代码块/批注对比度 ≥4.5（复算 `--ink-faint`/`--mark` 两对）。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/theme-acceptance.mjs`
- **风险与回退**：screencast 依赖临时 profile，可能抓不到帧 → 标 UNVERIFIED 并写人工补法（有头 Edge 刷新录屏）；深色变量合错会让浅色变深，两套截图兜住。回退：`git checkout -- src/ index.html` 并删脚本。
- **难度** M ｜ **量级** 160–220 行

## T3 导出公式保真：HTML 用 MathML、TXT 保留 LaTeX 源（B3/H3）｜A 组（builder，T2 后）

- **目标**：含公式的文档导出 HTML 后公式可见且不依赖字体/CSS（MathML），导出 TXT 保留 `$latex$` 原文；补单测。
- **为什么现在**：B3 实测导出 HTML 里公式是空 `<span data-latex="E=mc^2" data-type="inline-math"></span>`（实际属性顺序是 `data-latex` 在前），导出的 TXT 公式整段消失。
- **文件**：`src/lib/export.ts`、`src/lib/math.ts`、`src/lib/export.test.ts`、`src/App.tsx`（只改 TXT 导出的一处调用）、`scripts/export-math-acceptance.mjs`（新）
- **步骤**
  1. `math.ts` 加纯函数（不 import katex）：用**属性顺序无关**的匹配 `/<(span|div)\b([^>]*\bdata-type="(inline|block)-math"[^>]*)>([\s\S]*?)<\/\1>/g`，再从捕获的属性串里取 `data-latex="…"`；取不到就原样保留（不误删）。`replaceMathHtml(html, renderMathml)` 与 `mathToPlainText(html)` 共用这个提取器；实体先解码（`&quot;` `&amp;` `&#39;`）。
  2. `export.ts` 静态 `import katex from 'katex'`（本轮不拆包），`renderMathml(latex, display)` 用 `katex.renderToString(latex, { output: 'mathml', throwOnError: false, displayMode: display })`；失败返回 `<code>$latex$</code>` 原文，并始终保留 `data-latex` 便于复制。
  3. `buildHtmlDocument` 拼 `bodyHtml` 前调 `replaceMathHtml`；TXT 分支在 `App.tsx` 改传 `editor.getHTML()` 给新增的 `buildPlainText(html)`（内部 `mathToPlainText`），不再用 `editor.getText()`。
  4. `export.test.ts` 加三组，**fixture 用真实 `editor.getHTML()` 输出**（实施时从 dev 页面 dump 行内与块级两种，原样贴进测试并注明来源），覆盖：属性顺序为 `data-latex` 在前；MathML 结果含 `<math`；非法 latex 回退含 `$bad$`；TXT 含 `$E=mc^2$` 与 `$$…$$`。
- **验收**：`npm test` 全绿（文件数仍 16，断言数约 180）；`node scripts/export-math-acceptance.mjs`（dev + CDP，独立 context）导出含行内与块级公式的文档，断言 HTML 含 `<math` 与 `E=mc^2`、不含空 `data-latex` span，TXT 含 `$E=mc^2$`，文件名跟文档名；截图 `shots/round-05/t3-export-mathml.png`。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/export-math-acceptance.mjs`
- **风险与回退**：MathML 在 Chromium 157 原生支持，其它阅读器可能不渲染（保留 `data-latex` 与原文回退）；`export.ts` 引 katex 后 Node 测试会加载 CJS，需确认 `node --experimental-strip-types` 可跑。回退：`git checkout -- src/` 并删新脚本。
- **难度** S–M ｜ **量级** 130–190 行

## T4 构建口径 + shot 参数 + 版本与文档数字（S3/S5/H5）｜B 组（builder2，先做）

- **目标**：显式声明 chunk 警告线并在 README 写明「为什么不拆 KaTeX」；`npm run shot` 不再覆盖第 1 轮证据；版本 0.18.0 与文档数字一致。
- **为什么现在**：S1 实测 KaTeX 有 5 个静态入口，第 5 个在 `@tiptap/extension-mathematics`（`index.js:2`），只改三个组件一个字节都不会降——本轮明确不拆；S5 实测 `shot.mjs:41` 固定覆盖 `shots/round-01/t1-currency.png`（该图被 6 份文档引用、已被覆盖两次）；S3 说主 chunk 840.6 KB，500 KB 默认线长期报警。
- **文件**：`vite.config.ts`、`scripts/shot.mjs`、`package.json`、`AGENTS.md`、`README.md`、`docs/CHANGELOG.md`
- **步骤**
  1. `vite.config.ts` 加 `build.chunkSizeWarningLimit: 900` + 注释：KaTeX 因 Tiptap 扩展静态 import 留在主 chunk（本轮不拆；拆需 alias 到惰性 shim + 删 `main.tsx` 的 CSS 静态 import + 改 woff2 插件 + 组件异步化，属独立 spike）；840.6 KB 是首屏必需，900 留 7% 余量。注释同时写明**不设** `manualChunks`（桌面本地读盘零收益）、不动 `cssCodeSplit`、`sourcemap` 保持默认。
  2. `README.md` 的「依赖与体积」加一行：「**为什么不拆 KaTeX**：`@tiptap/extension-mathematics` 顶层静态 `import katex`，扩展在编辑器首帧就要注册，拆包必须换 shim 并异步化三处渲染，0.18.0 不做；警告线 900 是为此显式设定。」
  3. `scripts/shot.mjs`：解析 `--out`，默认改 `.tmp/shots/shot.png`（`.tmp/` 已忽略），`mkdirSync(dirname(out),{recursive:true})`，用法写进文件头；`AGENTS.md` 第 3 节与 README 命令清单改成 `node scripts/shot.mjs --out shots/round-NN/x.png`。
  4. `package.json` 只改 `"version": "0.18.0"`；`package-lock.json` **不手改**，由根代理 `npm install --package-lock-only` 同步（仍在 0.8.0 不阻塞本轮，写进 `impl-b.md`）。
  5. `docs/CHANGELOG.md` 加 `## 0.18.0 — 2026-11-15`：键盘可达、主题三档、导出公式 MathML/TXT 保留源码、构建口径、字体体积；数字 `[TBD]` 由根代理回填。
- **验收**：`npx tsc --noEmit` 0 错；`npx vite build --outDir .tmp/build-b` 成功且日志无 `Some chunks are larger than 900 kB`、主 chunk 在 900 kB 内；`node -e "console.log(require('./package.json').version)"` = `0.18.0`；`node scripts/shot.mjs`（**不带 `--out`**）生成 `.tmp/shots/shot.png` 且 `git status --porcelain` 无 `shots/` 变更；`node scripts/shot.mjs --out shots/round-05/t4-shot.png` 生成指定文件；`Select-String vite.config.ts -SimpleMatch 'chunkSizeWarningLimit: 900'` ≥1；`Select-String README.md -SimpleMatch '为什么不拆 KaTeX'` ≥1；`Select-String docs/CHANGELOG.md -SimpleMatch '## 0.18.0 — 2026-11-15'` ≥1。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-b; node scripts/shot.mjs; node scripts/shot.mjs --out shots/round-05/t4-shot.png`
- **风险与回退**：`chunkSizeWarningLimit` 只改告警线；默认截图路径变化会让旧文档「`npm run shot` 直接出证据」失效（AGENTS/README 已同步）；CHANGELOG `[TBD]` 必须回填。回退：`git checkout -- vite.config.ts scripts/shot.mjs package.json AGENTS.md README.md docs/CHANGELOG.md`。
- **难度** S ｜ **量级** 70–100 行

## T5 字体裁剪：删 4 个装饰 face（S4/H4/H6）｜B 组（builder2，T4 后）

- **目标**：只删 A 档 4 个 face（Fraktur-Bold、Caligraphic-Bold、SansSerif-Bold、SansSerif-Italic，共 42,504 B），字体从 256,168 B / 19 文件降到 213,664 B / 15 文件；只减小 `dist` 与安装包，不改首屏；给出「这些 face 不被请求」的实测证据。
- **为什么现在**：S4 用 CDP 跑了 10 个公式样本，这 4 个 face 只在 `\mathbf{\mathfrak{…}}` 一类嵌套里出现；`EXPECTED_FACES = 20` 与 `acceptance.mjs:82` 的 `faces === 20` 是两处必须同步的耦合。**注意插件顺序**：现在先 `checkFaces` 后删资产，直接改 `EXPECTED_FACES` 会抛「20，期望 16」。
- **文件**：`scripts/vite-woff2-only.mjs`、`scripts/acceptance.mjs`、`scripts/font-probe.mjs`（新）、`README.md`（体积段）
- **步骤**
  1. `vite-woff2-only.mjs` 顺序改成：解析出所有 `@font-face` → **先按 `DROPPED_FACES`（4 个名字）删块并记下其 woff2 URL** → 重写剩余 face 为 woff2-only → **再** `checkFaces`（`EXPECTED_FACES = 16`）→ 删 ttf/woff 与被删 face 的 woff2 资产 → 断言：4 个被删 face 名不在 CSS、对应 woff2 资产不在 bundle；`KaTeX_Size3` 的内联 data URI 不动。
  2. `scripts/acceptance.mjs` 的 `faces === 20` 改 16（同段字体加载断言不变）。
  3. `scripts/font-probe.mjs`：用 **CDP 9224 + 独立 `browser.newContext()`**，输入 S4 的 10 个公式样本，读 `document.fonts` 与 woff2 请求；**分两段打印**「被删 face 未请求」与「Regular 族仍加载」；若任一被删 face 被请求，脚本 exit 1。
  4. `README.md` 体积段：字体 256,168 B / 19 文件 → 213,664 B / 15 文件（另 1 个 face 内联），并写明「只影响安装包与 dist，不影响首屏（字体本就按需下载）；删的是装饰族的粗/斜体，Regular 全部保留」。
- **验收**：`npx vite build --outDir .tmp/build-b` 后：woff2 合计 = 213,664 B、文件数 = 15；`@font-face` 计数 = 16；`Select-String scripts/vite-woff2-only.mjs -SimpleMatch 'EXPECTED_FACES = 16','DROPPED_FACES'` 各 ≥1；`node scripts/font-probe.mjs` 两段全 PASS 且 exit 0；`npm test` 0 失败。
- **门禁**：`npx vite build --outDir .tmp/build-b; node scripts/font-probe.mjs; npm test`
- **风险与回退**：删掉的 face 若被真实文档命中会**静默换字形**（不报错），所以只做 A 档、不动 Regular；`font-probe` 显示任一被删 face 被请求就回退该 face 并写进 `impl-b.md`；B/C 档不做。回退：`git checkout -- scripts/ README.md`。
- **难度** S ｜ **量级** 80–110 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/components/FileMenu.tsx`、`src/components/useDialogFocus.ts`、`src/components/ShortcutsDialog.tsx`、`src/styles.css`、`index.html`、`scripts/keyboard-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/lib/settings.ts`、`src/components/SettingsDialog.tsx`、`src/styles.css`、`index.html`、`scripts/theme-acceptance.mjs` |
| T3 | A（builder，T2 后） | `src/lib/export.ts`、`src/lib/math.ts`、`src/lib/export.test.ts`、`src/App.tsx`、`scripts/export-math-acceptance.mjs` |
| T4 | B（builder2，先做） | `vite.config.ts`、`scripts/shot.mjs`、`package.json`、`AGENTS.md`、`README.md`、`docs/CHANGELOG.md` |
| T5 | B（builder2，T4 后） | `scripts/vite-woff2-only.mjs`、`scripts/acceptance.mjs`、`scripts/font-probe.mjs`、`README.md`（体积段） |

- 两组零重叠：A 只碰 `src/`、`index.html` 与两个新验收脚本；B 只碰 `vite.config.ts`、`scripts/`、`package.json` 与文档。**`vite.config.ts` 只归 T4，`package.json` 只归 T4（0.18.0）**；`README.md` 由 T4 → T5 串行交接（T5 只改体积段）；`npm test` 文件数保持 16。
- CDP 隔离：A 用 9222、B 用 9224，各自 `newContext()` 并清 `localStorage`；`shot.mjs` 的默认路径改动不阻塞 A（A 的截图一律显式 `--out`）。
- 跨组依赖：T5 用 `.tmp/build-b` 验证，不与 A 的 `.tmp/build-a` 冲突；根代理最终跑一次 `npm run build`、`npm install --package-lock-only`，并回填 CHANGELOG 的 `[TBD]`。
- 报告：A 组 `docs/iteration/round-05/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-05/t*-*.png`。

## 本轮不做（写进下轮建议）

**KaTeX 拆包/按需加载**：S1 证明第 5 个静态入口在 `@tiptap/extension-mathematics`，要拆必须加 `resolve.alias` 到惰性 shim、删 `main.tsx` 的 CSS 静态 import、改 `vite-woff2-only.mjs`（CSS 会变 2 份，现版本直接 throw）、把 `PreviewPane` 的 `useMemo` 改成加载后重画，还要把 acceptance/shot/qa16/qa18 的固定等待改成等选择器——是一条独立 spike，本轮只把警告线说清并在 README 写明「为什么不拆」。宿主 IPC 写回、`.md` 关联、`App.tsx` 重构、`shots/` 实际移出（根代理做）同样不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 全程键盘可用：`Ctrl+Alt+N` 新建、`Ctrl+Alt+S` 另存为、`?` 看快捷键、Tab 第一下就跳到正文；`Ctrl+Shift+S` 不再给正文划线；文件菜单有方向键与键位列。
2. 设置里能选「浅色 / 深色 / 跟随系统」，重开还记得，深色刷新不再白闪；「跟随系统」遇到系统深色时下拉与滚动条也是深色。
3. 导出含公式的 HTML 打开就能看见公式（MathML，不依赖字体），导出 TXT 保留 `$E=mc^2$` 原文。

## 风险最高的任务

**T1**。它同时改全局按键、Tiptap 删除线注册、菜单键盘模型、对话框焦点还原与 DOM 地标：`StarterKit.configure({strike:false})` + 自定义 `Strike` 如果漏一处，`Ctrl+Shift+S` 仍可能「划删除线 + 另存」双动作；菜单与对话框的焦点还原有 3 条已知断点。缓解是第 3 条验收（无 `<s>`、picker 不增、无提示）加纯键盘 E2E，并复跑第 4 轮三个 acceptance 脚本。浏览器自身是否抢 `Ctrl+Shift+S` 与 `Ctrl+Alt+*` 在无头环境测不了，标 UNVERIFIED，补法是安装版真人按键。

## 下一轮建议主题

**KaTeX 按需加载 spike + 宿主内键盘/主题实测**：用一天做 S2 的五文件 shim 方案（先只加 alias 与 shim，再看 chunk），并把本轮键盘与主题搬进宿主 WebView2 真机验一遍（Alt/F10/Esc 是否被吞、深色首帧）；之后清安装四项 UNVERIFIED 与 `.md` 关联决策。
