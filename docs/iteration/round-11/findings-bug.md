# 第 11 轮缺陷侦察（KaTeX 惰性加载）

侦察人：r11-bug。只读 `src/`、`host/`、`scripts/`、`vite.config.ts`，未改产品代码。基线 commit `4878030`（0.23.0），工作树 `7aeeb92` 只加文档。日期 2026-11-16。

本轮问题全部集中在「同步 API 被异步化」这一处：`katex.render` 与 `katex.renderToString` 有 4 个同步调用点、1 个 NodeView 调用点，分布在不同生命周期里，方案必须一次说清它们各自怎么重画、怎么等。

**证据文件**

- 探针 `.tmp/r11-bug/probe.mjs`（CDP 9222，dev server 5173）：首屏请求清单、`.katex` 出现耗时、去掉 KaTeX CSS 后的真实 DOM。
- 截图 `shots/round-11/r11-bug-math-without-css.png`：无 KaTeX CSS 时公式的显示结果（MathML 与 HTML 两层同时可见，公式出现两遍）。
- 体积 spike `.tmp/r11-bug/{vite.spike.config.mjs,katexLazy.ts,measure.mjs}`，产物 `.tmp/r11-bug/dist`。**没有跑 `npm run build`**，没有写 `dist/`：用 `npx vite build --config .tmp/r11-bug/vite.spike.config.mjs` 输出到 `.tmp`，符合 STATE 的构建纪律。
- 发布视角的同一结论（独立测量，数字一致）：`findings-ship.md` 第 7–11、28–45 行。

## 总览

| 编号 | 一句话 | 影响 | 可修性 | 难度 |
| :--- | :--- | :--- | :--- | :--- |
| B1 | Tiptap NodeView 只在建节点时渲染一次，且没有 `update`；事务/dispatch 都不能触发重画，必须用 shim 内的注册表 | P0，公式显示与编辑的根基 | 可修，机制明确 | 中 |
| B2 | 对象写法的 `'^katex$'` 是普通字符串不是正则，alias 静默失效；wrapper 里 `import('katex')` 又会解析到自己 | P0，目标静默不达成或公式全坏 | 可修 | 小 |
| B4 | 三处 `renderToString` 是同步调用；shim 返回空串会**静默**降级预览与 HTML 导出，不会报错 | P1，功能悄悄退化 | 可修 | 小到中 |
| B3 | CSS 必须搬进「被动态 import 的模块」里；现在的 woff2 插件会在 2 个 CSS 资产上直接抛错，且 KaTeX CSS 不是装饰（缺了公式出现两遍） | P1，构建门禁／首屏闪烁 | 可修 | 中 |
| B5 | 现有门禁对 `.katex` 是「等 500/600 ms 再数节点」；Node 测试看不到 alias，暴露不了 shim 的错 | P2，回归防线 | 可修 | 小 |

编号只是标识；正文按上表顺序（影响从大到小）展开：B1 → B2 → B4 → B3 → B5。

一句话结论：B1 的答案是「不靠事务，靠 shim 里的元素注册表 + 订阅」；B2 必须写成数组形式的正则 alias；B4 是唯一会让功能静默坏掉的一条。

## 0. 现状清单：katex 的静态 import 与调用点

全部是**静态 import、全部进首屏 chunk**，没有任何异步入口（`grep` + `dist` 校验：`dist/assets/index-CiRTwjkA.js` 里 `katex`/`renderToString`/`katex-mathml` 均命中，且没有独立的 katex chunk）。

| 位置 | import 形式 | 调用 | 触发时机 | 同步/异步 |
| :--- | :--- | :--- | :--- | :--- |
| `src/main.tsx:6` | `import 'katex/dist/katex.min.css'` | 无 | 首帧（首屏 CSS 13,755 B gzip 里的 3,518 B 是它） | 同步 |
| `node_modules/@tiptap/extension-mathematics/dist/index.js:2` | `import katex from "katex"`（经 `src/App.tsx:12` 进 bundle） | `katex.render`，块级 `:139`、行内 `:311` | **NodeView 创建时一次**（见 B1） | 同步 |
| `src/lib/export.ts:1` | `import katex from 'katex'` | `katex.renderToString(…, {output:'mathml'})` `:135` | 导出 HTML（`App.tsx:2865`） | 同步 |
| `src/components/PreviewPane.tsx:2` | 同上 | `renderToString` `:18` | 进入预览模式、每次 `useMemo` 失效 | 同步 |
| `src/components/MathInlineEditor.tsx:3` | 同上 | `renderToString` `:35` | 就地编辑**每次按键** | 同步 |
| `src/components/MathDraftPreview.tsx:2` | 同上 | `renderToString` `:18` | 源码模式**每次按键** | 同步 |

要点：惰性化不是「把 import 改成动态 import」一件小事——上面 4 个调用点里，3 个是 UI 每次渲染都调用的同步函数；1 个（NodeView）在 Tiptap 内部、我们改不到调用点，只能改它拿到的模块对象。后文 B1–B4 就按这些入口展开。

---

## B1 NodeView 只在创建时渲染一次，没有 `update`：占位后的重画不能用事务

**现象与风险**

`@tiptap/extension-mathematics` 的 NodeView 在工厂函数里调用一次 `renderMath()` 就返回，返回对象只有 `{ dom, destroy }`：

- `node_modules/@tiptap/extension-mathematics/dist/index.js:126-161`：`renderMath()` 定义在 `:137-145`，调用点只有 `:154` 一处（紧挨 `return`），`:155-160` 的返回对象没有 `update`。
- 行内同一结构：`:301-334`，调用点 `:326`，返回 `:327-332`。

ProseMirror 侧：`node_modules/prosemirror-view/dist/index.js:1620` 只有 `spec.update` 存在时才调用它；没有就走 `super.update`（`:1490-1495`），而那里 `!node.sameMarkup(this.node)` 直接 `return false`，结果是**销毁并重建 NodeView**（`:1902-1910` 的 `updateNodeAt` 返回 false 后走重建）。

推论，三条都要写进计划：

1. **空事务 / `view.dispatch(tr)` 不会重画**。`docChanged:false` 时 `sameMarkup` 为真，NodeView 原样保留，`renderMath()` 不再执行。所以「加载完成后 dispatch 一个事务」是无效方案。
2. **改 latex 会重画，但代价是整棵 NodeView 重建**（`sameMarkup` 假）。App 目前提交编辑走 `insertContentAt`（`src/App.tsx:3146`），本来就重建；这条能救「编辑现有公式时模块未到」，但救不了「模块到时原地占位」。
3. **唯一可靠的重画入口是 shim 自己**：`render(latex, element, options)` 把 `{element, latex, options}` 记进注册表，模块 resolve 后逐条重跑 `katex.render`；元素已 `isConnected === false` 就跳过（NodeView 可能已被重建）。React 侧另给订阅（见 B4）。

**插入／编辑时模块未到的行为（按现有代码推演）**

- 工具栏插入（`src/App.tsx:3339-3358`）→ `insertContent` 创建节点 → NodeView 立即 `renderMath()` → shim 若把 `element.textContent` 清空后挂占位，**公式在到位前是零宽**。行内公式是 `span`（`index.js:304-308`），零宽就没有可点击面积，用户点不到它（点击才进就地编辑，`index.js:318-325`），`$$`+回车那条路仍可用（`src/lib/mathInput.ts:82-110` 直接打开编辑框）。
- 新建空块公式：`mathInput.ts:84` 写入 `latex: ' '`，同一帧打开 `MathInlineEditor`（`src/App.tsx:2936-2958`），编辑器预览走同步 `renderToString`（`MathInlineEditor.tsx:32-39`）——这是「模块未到就调用同步 API」的真实路径，见 B4。
- 加载失败（chunk 404 / 断网 dev）：注册表不清理、占位永远是空，**公式永久不可见且没有任何错误提示**。必须给失败态：显示 `$latex$` 原文并加一个类，比空白可恢复。

**验证方法（可复跑）**

1. 实现后把 katex chunk 请求 `route.abort()`，打开含公式文档：断言页面上没有裸 `$...$`、也没有空白块；恢复请求后点任意公式应能进入编辑。
2. 在 dev 页面控制台对公式节点手动 `element.textContent` 改脏后 `editor.view.dispatch(editor.state.tr)`（不改 doc）：`.katex` 不会回来——证明事务无效。
3. 现有代码下先插入公式再断点慢放网络，观察 NodeView 重建时是否重跑 `renderMath`（DOM 节点换了新引用）。

**证据**

- 扩展源码如上；`prosemirror-view` 的 `update` 判定如上。
- 探针实测当前行为：`katex.render` 是同步的，点击「公式」到 `.editor .katex` 出现 **79 ms**（含 prompt）；`wrapper` 的 `data-latex` 与 `.katex` 结构完整（`.tmp/r11-bug/probe.mjs` 输出）。

**影响**

不实现注册表，则「文档载入即含公式」时首帧全是占位；如果占位设计与失败态缺失，公式可能整篇不可见、不可点、不可编辑。P0。

**建议（最小实现）**

在 `src/lib/katexLazy.ts` 里：

```ts
const pending: { el: HTMLElement; latex: string; options?: unknown }[] = []
let mod: Katex | null = null
export function render(latex: string, el: HTMLElement, options?: unknown) {
  if (mod) return mod.render(latex, el, options)   // 已加载：完全同步，零行为变化
  el.textContent = ''
  pending.push({ el, latex, options })
  void load()
}
```

flush 时逐条 `try/catch`：**必须逐条**。KaTeX 的 `throwOnError` 默认是 `true`（`node_modules/katex/dist/katex.mjs:164-168`），非法 latex 会抛；一条抛出不能中断其余公式，也不能产生未处理的 rejection（验收脚本会统计 `pageerror`／console error，`scripts/acceptance.mjs:10-14`）。错误分支照抄 NodeView：显示原文 + 加 `inline-math-error`／`block-math-error`。

**难度**：中（一个文件的核心逻辑 + 失败态样式；没有架构改动）。

---

## B2 alias 写法：对象形式静默失效；wrapper 里 `import('katex')` 解析到自己

**现象与风险**

1. **`resolve.alias` 的对象形式只接受字符串键，不认正则**。`node_modules/vite/dist/node/chunks/node.js:2944-2948`（`normalizeAlias`）把 `Object.keys` 原样当 `find`，`:2950-2960` 不把字符串编译成正则；`@rollup/plugin-alias` 的匹配 `:3424-3428` 是「全等，或前缀 + `/`」。所以：

   ```ts
   resolve: { alias: { '^katex$': '/src/lib/katexLazy.ts' } }   // 永不命中，构建照旧 364,960 B，无任何报错
   ```

   必须写成数组：

   ```ts
   resolve: { alias: [{ find: /^katex$/, replacement: fileURLToPath(new URL('./src/lib/katexLazy.ts', import.meta.url)) }] }
   ```

2. 反过来，如果图省事写成字符串 `{ katex: '/src/lib/katexLazy.ts' }`，前缀规则会把 **`katex/dist/katex.min.css`** 也改写掉（`:3427-3428`）——`src/main.tsx:6` 的样式直接解析失败，dev 首屏报错。

3. 正则命中后，**wrapper 自己的动态 `import('katex')` 也会被改写到 wrapper**（alias 对所有 importer 生效，插件 `:3470-3472` 不区分 importer）。结果：dev 里 `import()` 返回自身命名空间，`render` 调自己 → 无限递归；build 里是自引用 chunk / circular 警告。必须用深路径绕开：

   ```ts
   import('katex/dist/katex.mjs')
   ```

   可行：`node_modules/katex/package.json:68` 的 `"./*": "./*"` 允许深路径；`dist/katex.mjs` 是 ESM（603,020 B）。但 `katex/dist` 下**没有 `.d.mts`**，`tsc --noEmit` 会报找不到模块；需要 `src/lib/katex-module.d.ts`（一行 `declare module 'katex/dist/katex.mjs'` + 导出类型），或者在 wrapper 里用 `import type * as Katex from 'katex'` 供类型、运行时用深路径。

**验证方法**

- 只加 alias、不改其他，跑一次 `npx vite build --outDir .tmp/x`：
  - 若首屏仍是 364,960 B 且无报错 → 命中第 1 条（字符串键）；
  - 若构建报 circular / dev 里公式栈溢出 → 命中第 3 条（wrapper 自引用）。
- 用 `.tmp/r11-bug/measure.mjs` 量首屏 gzip；命中 alias 时首屏应为 281,3xx B（见「附：体积实测」）。

**证据**

- Vite 源码行号如上；`katex` exports 如上。
- 我的 spike 用的是数组正则 + 深路径，构建通过，首屏 281,302 B，惰性 chunk 259,046 B，说明深路径方案可行（发布视角的 spike 另测得 123 个模块，`findings-ship.md:10`）。

**影响**

第 1 条是全轮最阴的失败：alias 没生效、体积没降、功能全对，验收才发现目标没达成。第 3 条则是所有公式坏掉。P0。

**难度**：小（配置 3 行 + 一个 d.ts），但**必须在计划里写死写法**，不能留给实施时自由发挥。

---

## B4 三处 `renderToString` 是同步的：返回空串会静默丢公式（导出还会假通过）

**现象与风险**

静态调用点共 4 处，全部同步：

| 位置 | 用途 | 模块未到时现在的兜底 | 结果 |
| :--- | :--- | :--- | :--- |
| `src/components/MathInlineEditor.tsx:32-39` | 就地编辑的实时预览 | `''` → 显示「（预览会出现在这里）」 | 首次输入的前几个字符没有预览，之后不会自己补 |
| `src/components/MathDraftPreview.tsx:16-23` | 源码模式浮层预览 | `if (!html) return null` | **整个浮层不出现**；用户停手后永远不出现（只在下次按键才重算） |
| `src/components/PreviewPane.tsx:13-25` | 只读预览 | `holder.innerHTML = ''` | 公式变成一个空 `span`，正文里凭空少一块 |
| `src/lib/export.ts:131-142` + `src/App.tsx:2851-2886` | HTML 导出 MathML | `!mathml.includes('<math')` → `<code class="math-fallback">` | 导出的公式退回 `$latex$` 源码；**不抛错**，用户无感 |

导出这条最危险：`renderMathml` 把「没有 `<math`」当非法 latex 处理，shim 返回 `''` 时正好命中，导出的 HTML 仍然合法、`acceptance` 仍能下到文件。现有单测的断言也不够硬——`src/lib/export.test.ts:90-96` 的 `html.includes('E=mc^2')`，回退的 `<code>` 里也有 `E=mc^2`，只有 `includes('<math')` 能抓到。浏览器侧 `scripts/export-math-acceptance.mjs:63` 有 `<math` 断言，但它不在 `npm test` 里。

**验证方法**

- 实现后拦截 katex chunk，再走「源码模式输入公式 → 切回编辑 → 导出 HTML」，看 `math-fallback`。
- 或直接用 `.tmp/r11-bug/dist`（spike 的 wrapper 只实现了注册表 flush，`renderToString` 仍返回 `''`）起 `vite preview`，打开含公式文档导出 HTML，应出现 `math-fallback`——这条在本轮未跑，交给实施/验收复现。

**建议**

1. 三个 React 组件加同一个 10 行 hook：

   ```ts
   const ready = useSyncExternalStore(subscribeKatex, () => isKatexReady())
   ```

   `ready` 变化时 `useMemo`/函数体自然重算；`MathDraftPreview` 在 `!ready` 时返回占位而不是 `null`（避免浮层位置跳动）。
2. `exportAs` 改 `async`（只有 3 个菜单调用点，`App.tsx:3246/3255/3264`，都是即发即忘的 `onClick`）：先 `const html = editor.getHTML()`，只有含 `data-type="…-math"` 才 `await ensureKatex()`，再 `buildHtmlDocument`。**`buildHtmlDocument` 保持同步**——`export.test.ts` 在 Node 里直连真 katex，一旦把它改成 async，现有 3 条 MathML 测试全要重写，而且 Node 测试环境没有 alias。
3. 文档载入时预取：`setMarkdown`（`App.tsx:764-781`）里 `if (body.includes('$')) void ensureKatex()`，放在 `manager.parse` 之前或之后都可以（不 await 就不阻塞正文）。真正的「不闪裸 LaTeX」靠 B1 的占位 + flush，不靠 `await`。

**证据**

- 组件与导出行号如上；`export.test.ts:110-117` 显示回退路径确实存在且被测试覆盖。
- 探针确认当前同步渲染：插入后 79 ms 内 `.katex` 已在 DOM 里。

**影响**

源码模式的公式浮层（Typora 习惯的核心交互之一）在「本次会话第一次用」时消失；HTML 导出可能悄悄退回源码。都是无报错的静默退化。P1。

**难度**：小到中（1 个 hook + 3 个组件各 1 行 + `exportAs` 改 async + 预取 1 行）。

---

## B3 CSS：搬错位置等于没搬；woff2 插件现在会在 2 个 CSS 资产上直接失败；缺 CSS 的公式是「两遍」

**现象与风险**

1. **优先级最高的坑：CSS import 放哪**。`src/main.tsx:6` 现在是静态 import。`katexLazy.ts` 会被 `extension-mathematics` **静态** import，所以把 `import 'katex/dist/katex.min.css'` 写在它顶层，CSS 仍然进首屏（首屏 CSS 仍是 13,755 B），体积只省 JS 部分，而且**没有任何报错**。CSS 必须写在「只有动态 import 才走到的模块」里，例如 `katexLoader.ts` 顶层同时 `import katex from 'katex/dist/katex.mjs'` 与 `import 'katex/dist/katex.min.css'`，wrapper 里 `import('./katexLoader.ts')`；或者都放进 wrapper 的 `load()` 内做动态 import。
2. **woff2 插件会挡住构建（发布视角已实测，见 `findings-ship.md:92-120`）**。`scripts/vite-woff2-only.mjs:114-118`：`cssNames.length !== 1` 直接 `throw`；惰性 chunk 带 CSS 时 Vite 会产出第二个 CSS 资产（`cssCodeSplit` 默认开）。发布视角的原始插件实验报 `[woff2-only] CSS 资产数为 2，期望 1`。即使把计数放宽成 2，`:119-125` 仍只处理 `cssNames[0]`；只要它挑到应用 CSS，`:87-90` 的 `@font-face 数为 0，期望 16` 继续挂。正确改法是遍历所有 CSS 资产，挑出含 `@font-face` 的那个做 `:131-161` 的裁剪与字体校验，另一个原样保留——发布视角的 `woff2-spike.mjs` 已验证这条改法能出 16 个 face。
3. **KaTeX CSS 不是纯装饰**。去掉样式后实测（`shots/round-11/r11-bug-math-without-css.png`）：MathML 层（`.katex-mathml`，KaTeX CSS 平时用 `clip` 把它藏起来）与 HTML 层同时可见，行内公式显示成 `𝑎²+𝑏²=𝑐² a2+b2=c2`，该元素的实测高度 45 px（正常排版下的行内高度未单独量，肉眼明显更高）。也就是说 **JS 先到、CSS 后到的那一帧比「字体晚到」难看得多**。Vite 的 `__vitePreload` 会在执行动态 chunk 前插入并等待 CSS `<link>`（`node_modules/vite/dist/node/chunks/node.js:26961-26978`，注释是 “preloading CSS and direct imports of async chunks in parallel”），所以只要 CSS 确实在动态 chunk 里，正常不会出现这一帧；但**加载失败**（本地文件缺失、磁盘错误）时必须降级：至少把 `.katex-html` 隐藏，或直接走 B1 的失败态显示原文。
4. **导出不需要 CSS**：HTML 导出用 `output:'mathml'`（`src/lib/export.ts:135`），`export-math-acceptance.mjs:72-81` 已经证明导出的文件脱离 KaTeX 资源也能看。所以 `exportAs` 的 `ensureKatex()` 不要顺手注入样式表，避免给导出路径加上不必要的等待。

**验证方法**

- `npx vite build --outDir .tmp/x`（保留原插件）：复现 `[woff2-only] CSS 资产数为 2，期望 1`（发布视角已跑，`findings-ship.md:97-104`）；改插件后确认 katex CSS 里剩 16 个 face、`assets/*.woff2` 引用都在、无 ttf/woff。
- dev 下打开含公式文档，`page.route('**/*.css')` 延迟 2 s：观察是否有「公式两遍」的帧（截图口径同 `r11-bug-math-without-css.png`）。
- 关掉 katex CSS 的 `<link>`（模拟失败）后确认公式不是空白或两遍，而是可读的降级。

**证据**

- 插件与 CSS import 行号如上；截图已落盘。
- 我的 spike 里 CSS 走的是「静态 import 被 alias 成空文件」，只覆盖 alias 与首屏体积；插件这条由发布视角实测覆盖（`findings-ship.md:92-120`，含原始插件的报错文本与改法验证），本报告不重复跑。

**影响**

构建直接失败（可见），或 CSS 留在首屏导致体积只降一半（静默），或失败时公式呈两遍／空白。P1。

**难度**：中（插件 20 行改动 + 动态 loader 模块 + 失败态样式）。

---

## B5 门禁与测试：`.katex` 靠固定等待，Node 测试看不见 alias

**现象与风险**

- `scripts/acceptance.mjs:79-83`：点「公式」→ `waitForTimeout(500)` → `count('.editor .katex') > 0`。本机惰性 chunk 约 30–80 ms，500 ms 大概率够；但这是**用超时代替就绪**，冷启动（WebView2 首读盘）或 CI 慢盘上会变成 flaky。
- `scripts/acceptance.mjs:86-102`：`document.fonts` 期望 20 个 KaTeX face（4173 时 16）。CSS 动态注入后，face 只会在注入后出现；同一条 500 ms 假设。这一条同时也是「CSS 真的进了页面」的唯一自动证据，值得保留但改成等待。
- `scripts/shot.mjs:33-38`：600 ms 后数 `.katex` 并截图。截图脚本不判 PASS/FAIL，但会拍到占位。
- `scripts/qa18.mjs:25-26`（`.katex`，800 ms）、`:39` / `:50`（`.math-draft-preview` 存在与含 `katex`）、`scripts/qa16.mjs:100-117`、`scripts/font-probe.mjs:64` 都是同类即时断言；qa18/qa16/font-probe 不在 `npm test` 里，但常被当回归脚本用。
- **Node 测试完全看不到 alias**：`vite.config.ts` 的 alias 只作用于 Vite；`npm test` 用 `node --experimental-strip-types` 直接跑 `export.test.ts`，那里解析到真 katex，MathML 断言照常通过。`math.test.ts` 根本不 import katex（`src/lib/math.test.ts:4`），也不受影响。所以「单测全绿 + 浏览器公式全坏」是可能的，这正是 B1/B4 的盲区。

**需要的「公式就绪」钩子（建议最小形态）**

1. shim 在占位元素上加 `class="math-pending"`（行内加在 `span` 上，块级加在 `inner` 或外层 `div`），flush 成功／失败后移除；失败加 `math-fallback` 并写入 `$latex$` 原文。
2. 门禁改成「等状态，不等时间」：

   ```js
   await page.waitForSelector('.editor .katex', { timeout: 15000 })
   await page.waitForFunction(() => document.querySelectorAll('.math-pending').length === 0)
   ```

   保留 `waitForTimeout` 只作为截图前的稳定期。
3. 新增两条断言：
   - 首屏没有 katex 请求：`page.on('request')` 里不得出现 `katex-*.js` / `katex-*.css`（打开无公式文档时）；
   - 阻断 katex chunk（`page.route('**/katex-*.js', r => r.abort())`）后打开含公式文档，页面文本里不得出现裸 `$…$`（这条同时守住 B1 的失败态）。
4. 建议给 wrapper 加一条 Node 单测（`katexLazy.test.ts`）：`await ensureKatex()` 后 `renderToString` 含 `<span class="katex">`；`render` 到脱离文档的元素不抛。它测不到 alias，但能锁住 flush 的同步/幂等语义；alias 只能靠构建产物断言（发布视角已有 `ParseError` 计数，`findings-ship.md:10`）。

**证据**：行号如上；探针确认当前 `.katex` 79 ms 出现、`document.fonts` 首屏已有 20 个 face（静态 CSS）。

**影响**：门禁可能假绿（单测）或假红（慢盘超时）；没有失败态断言，「公式永久空白」这种最坏情况不会被任何门禁发现。P2。

**难度**：小。

---

## 附：体积实测（与发布视角一致，供 Kill criteria 引用）

`node .tmp/r11-bug/measure.mjs`，口径 = `index.html` 引用的 JS/CSS 逐文件 gzip(level 9) 求和：

| 构建 | 首屏 JS gzip | 首屏 CSS gzip | 首屏合计 | 惰性 chunk |
| :--- | ---: | ---: | ---: | ---: |
| 当前 `dist`（0.23.0） | 351,205 | 13,755 | **364,960** | — |
| 本轮 spike（alias + CSS 移出） | 275,020 | 6,282 | **281,302** | JS 76,632 gzip |

- 目标 271,360 B，缺口 **9,942 B**（发布视角独立测得 281,471 / 缺口 10,111 B，差异来自 shim 体积与 CSS 处理）。
- **只做本轮的 alias + CSS 拆分，目标不可达**；这必须在计划阶段裁决（改验收线到 ≈275 KiB，或另找 10 KB 级的第二杠杆），不能等到实施完才发现。

## 最小可行方案（建议写进 plan）

1. `src/lib/katexLazy.ts`：默认导出 `{ render, renderToString, ensureKatex }`；动态 `import('katex/dist/katex.mjs')`，CSS 用一个只被动态 import 的 `katexLoader.ts` 静态引入；`render` 未就绪时挂占位 + 入注册表，加载后逐条 `try/catch` 重画，断开元素跳过，失败显示 `$latex$`。
2. `vite.config.ts` 用**数组正则** `{ find: /^katex$/, replacement: … }`；删 `src/main.tsx:6` 的 CSS import；加 `src/lib/katex-module.d.ts` 让深路径过 `tsc`。
3. `scripts/vite-woff2-only.mjs` 遍历全部 CSS 资产，只处理含 `@font-face` 的那个（发布视角已验证改法，`findings-ship.md:105-120`）。
4. 就绪订阅 hook + 三个同步调用点；`exportAs` 改 async，含公式才 `await ensureKatex()`；`setMarkdown` 里含 `$` 时 `void ensureKatex()` 预取。
5. 门禁改等待 `.katex` + `.math-pending` 清空；新增「首屏无 katex 请求」「阻断 chunk 不出裸 LaTeX」两条；`acceptance` 的字体检查保留但改成等 CSS 注入后再数。

## Kill criteria（任一命中就回退 alias、不发 0.24.0）

1. **体积**：按上述口径首屏 > 计划裁决后的线（若坚持 271,360，实测下限 281,302，必不达标）。
2. **自引用**：构建出现 wrapper ↔ katex 循环，或 dev 里 `renderToString` 栈溢出。
3. **不可用**：阻断 katex 请求时，含公式文档出现裸 `$…$`、空白公式区或控制台 error；恢复请求后不能自动补画。
4. **导出/预览**：HTML 导出缺 `<math`（出现 `math-fallback`），或源码模式公式浮层不出现。
5. **门禁**：woff2 插件改完后 face 数不是 16、4173 下字体加载失败，或 `acceptance` 连跑两次结果不一致（flaky 视同不过）。
6. 以上任一在 2 次修复后仍在 → `git reset --hard` 回 `4878030`，按 brief 写 ADR-0012 记录实测与回退理由。

## 优化机会（最多 3 条，不算缺陷）

1. **预览代码三份重复**：`MathInlineEditor.tsx:32-39`、`MathDraftPreview.tsx:16-23`、`PreviewPane.tsx:13-25` 都在做「try renderToString → 空串兜底」。本轮反正要加就绪判断，可抽一个 `renderMathHtml(latex, display)` 纯函数，三处共用，顺带只有一份失败策略。
2. **`vite.config.ts:26-29` 的注释已过期**：写着「KaTeX 不能拆、拆包必须 alias 到惰性 shim……0.18.0 不做」。本轮做完后这段与代码相反，实施时应改成一句「见 ADR-0012」；`scripts/vite-woff2-only.mjs:16` 的「19 文件」也与实现（删 4 个 face、15 文件）不一致。
3. **预取可以顺带合并首帧**：`setMarkdown` 检测到 `$` 后 `void ensureKatex()`，同时 dev 下打印一行 `[math] katex chunk loaded in N ms`（仅 dev）便于以后量「公式文档首帧延迟」；不加常驻、不联网，符合轻量约束。
