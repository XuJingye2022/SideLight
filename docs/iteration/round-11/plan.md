# 第 11 轮 · 计划（rev2）

基线 `4878030`（v0.23.0）。3 个任务：T1（A·builder，运行时）、T2（B·builder2，构建）、T3（B·builder2，口径/发布）。
**口径**：alias-only 首屏 gzip 实测 **281,471 B**（下限约 281,302），**265 KiB（271,360 B）不可达**（差约 10 KB；全量 stub 上限也只到 279,087）。本轮验收线 **≤285,000 B**（省约 83.5 KB / 22.9%）；「265 KiB 不可达」写进 ADR-0012 与 CHANGELOG，**不许把未达标写成达标**。
**执行顺序（串行，两组不并行跑构建）**：① T1-A 落 shim（**先不删静态 CSS**）→ ② T2 加 alias + 改 woff2 插件（**shim 不存在前 B 不 build**）→ ③ T1-B 删静态 CSS、重启 dev、跑 `math-ready-acceptance` → ④ T3 跑 `vite build` + `measure-first-screen`，通过才升 0.24.0 → ⑤ 根代理最终 build 与验收。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit`、单测（非 npm test）、dev 上的 `math-ready-acceptance`；B 用 `npx vite build --outDir .tmp/build-b` 与 `measure-first-screen.mjs`。`package.json` 只归 T3；`package-lock` 由根代理同步。

## T1 KaTeX 惰性 shim、订阅重画、非阻塞 gate、导出兜底、块级 display（B1/B2/B4/U1–U3/H1/H3/H5）｜A 组（builder）

- **目标**：`katex` 只在需要时加载；加载前固定尺寸占位、加载后自动重画；同步 API 的调用点各有确定行为；含公式文档不闪裸 `$`；块级公式在编辑区按 display 排版。
- **为什么现在**：B1 实测 NodeView 只渲染一次且无 `update`（`extension-mathematics/dist/index.js:154`、`:326`），空事务不会重画；B4 实测三处 `renderToString` 同步、返回空串会静默退化；U1 实测惰性窗口 27–102 ms、裸 LaTeX 闪且 CLS 0.021–0.053；U3 实测块级按行内排版（33.1 px）并压住下一段。
- **文件**：`src/lib/katexLazy.ts`（新）、`src/lib/katexLoader.ts`（新）、`src/lib/katex-dist.d.ts`（新）、`src/lib/katexLazy.test.ts`（新，**本轮不挂 npm test**）、`src/main.tsx`、`src/App.tsx`、`src/components/PreviewPane.tsx`、`src/components/MathInlineEditor.tsx`、`src/components/MathDraftPreview.tsx`、`src/lib/export.ts`、`src/styles.css`、`scripts/acceptance.mjs`、`scripts/shot.mjs`、`scripts/math-ready-acceptance.mjs`（新）
- **步骤**
  0. **阶段 A（先落 shim，保留 `main.tsx` 静态 CSS）**：完成下面 1–5、7、8 的代码；此阶段不跑 dev 惰性验收、不删 CSS、不 build。
  1. **模块拆分**：`katexLoader.ts` 顶层 `import katex from 'katex/dist/katex.mjs'` + `import 'katex/dist/katex.min.css'`，默认导出 `{ katex }`；只被 `katexLazy.ts` 动态 `import('./katexLoader.ts')` 触达。CSS 只能随这个动态 chunk 进入；Vite 的 preload helper 会等 `<link>` load 后才执行 chunk（`node_modules/vite/dist/node/chunks/node.js:26961-26978`），失败即 reject → 失败态。
  2. **shim（H1）**：`katexLazy.ts` 同时提供**命名导出**与 **`export default { render, renderToString, ensureKatex }`**（tiptap 与 `export.ts` 都是 `import katex from 'katex'`，alias 后必须有 default，否则 `katex.render` 为 undefined）。命名导出一并给 `isKatexReady`、`subscribe(cb)`、`onReady`。
     - `render(latex, element, options)`：未就绪 → 记 `{element, latex, options}` 进注册表、加 `math-pending` 与固定占位（行内 `inline-block;min-width:2.2em;height:1.25em`，块级 `min-height:2.8em`）、`void ensureKatex()`；加载后逐条 `try/catch` 重跑 `mod.render`，`element.isConnected === false` 跳过；成功移除 `math-pending`，失败写 `$latex$` 原文 + `math-fallback` + `title="公式排版没加载成功，点击重试"`（点击重试一次）。flush 后置 `ready=true`、通知全部 `subscribe` 订阅者、resolve `onReady`。
     - `renderToString(latex, options)`：未就绪返回 `''`（契约写明），就绪同步委托。
     - **测试注入口**：`__setLoaderForTest(loader)` 允许注入无 CSS 的假 loader；`katexLazy.test.ts` 用它，**不 import `katexLoader.ts`**（Node 不能 import CSS）。该测试本轮以 `node --experimental-strip-types src/lib/katexLazy.test.ts` 单独跑，**不挂进 `npm test`**（保持 16 文件），挂入条件写进 T3 文档。
  3. **displayMode**：`render` 里 `const displayMode = !!element.closest('[data-type="block-math"]')` 合并进 options；`styles.css` 给 `.tiptap-mathematics-render[data-type="block-math"]` 加 `margin:1em 0; text-align:center`，加 `.math-pending`/`.math-fallback` 样式。
  4. **三组件订阅**：`PreviewPane`、`MathInlineEditor`、`MathDraftPreview` 用 `useSyncExternalStore(subscribe, isKatexReady)`；未就绪渲染占位（`MathDraftPreview` 也返回占位，不返回 `null`）；未就绪**不调用** `renderToString`。
  5. **导出兜底（H5）**：`exportAs` 改 `async`，**无条件先 `await ensureKatex()`**（已就绪时是一次已 resolve 调用）；`buildHtmlDocument` 后检查输出含 `<math` 或 `math-fallback`，出现 `math-fallback` 时 toast「公式排版没加载成功，已按 LaTeX 原文导出」；导出不注入 CSS、不阻塞无公式文档。补三例：源码模式导出、块级公式导出、无效 latex（`\bad{`）导出（无效时宁可 `math-fallback` 也不抛）。
  6. **首屏 gate（H3）**：`setMarkdown` **保持同步、不 await parse**。正文命中公式判定时先 `void ensureKatex().catch(() => {})` 预取并立即 `manager.parse`；若保留 120 ms gate，必须带 `generationRef` 令牌：`await Promise.race([ensureKatex(), 120ms])` 后再校验 `token === generationRef.current`，超时/reject 都继续 parse，旧令牌结果直接丢弃，**不许旧 parse 覆盖新文档**。`setMarkdown` 的 **7 个调用点**逐个核对：`App.tsx:793`（初始载入）、`823`（`/__doc`）、`827`/`898`（清空）、`1545`（切换文件）、`2163`（恢复宿主草稿）、`2751`（源码切回）；每个都 `void` 或 `await` 并 `catch`，不允许 unhandled rejection。菜单「插入 ▾」`pointerdown` 预取。
  7. **门禁改“等状态”**：`scripts/acceptance.mjs` 的 `waitForTimeout(500)` 换成 `waitForSelector('.editor .katex')` + `waitForFunction(() => !document.querySelector('.math-pending'))`；`document.fonts` 那条等 CSS 注入后再数（face 16）；`scripts/shot.mjs` 同步改；`qa16/qa18/font-probe` 同类固定等待一并改。
  8. **`scripts/math-ready-acceptance.mjs`**：① 无公式文档首屏请求无 `katex-*.js`/`katex-*.css`；② 含公式文档 120 ms 内无裸 `$…$`、`.math-pending` 清零、16 个 KaTeX face；③ `route.abort('**/katex-*.js')` 后出现 `math-fallback` 且无裸 `$`；④ 失败后重试成功；⑤ 插入/编辑/预览/导出/打印五条路径（导出断言 `<math`）。
  9. **阶段 B（T2 合并后）**：删 `src/main.tsx:6` 静态 CSS；重启 dev（Vite 预打包缓存）；跑 `node scripts/math-ready-acceptance.mjs` 与 `node scripts/acceptance.mjs`。
- **验收（分两段）**
  - 阶段 A：`npx tsc --noEmit` 0 错；`node --experimental-strip-types src/lib/katexLazy.test.ts` 全绿（未就绪返回 `''`、注入 loader 后 `renderToString` 含 `class="katex"`、断连元素不抛、两次 `ensureKatex` 只加载一次）；`npm test` 仍 16 文件、`math.test` 13/13、`fidelity` 19/19。
  - 阶段 B（T2 后）：`math-ready-acceptance` 五组 PASS；`acceptance` **11/11** 且连跑两次一致；含公式文档 120 ms 内排版态出现、CLS≈0；块级公式有 display 排版（截图 `shots/round-11/t1-block.png`）；失败态可读可复制、点击可重试。
- **门禁**：`npx tsc --noEmit; node --experimental-strip-types src/lib/katexLazy.test.ts; node scripts/math-ready-acceptance.mjs`（阶段 B，dev 5173 + CDP 9222）
- **风险与回退**：`render` 注册表必须在 flush 后清空并跳开断开元素；`setMarkdown` 的 7 个调用点漏一个就可能在 `ensureKatex` reject 时中断 parse；`exportAs` 改 async 后三处菜单调用要 `void`。回退：`git checkout -- src/ scripts/acceptance.mjs scripts/shot.mjs` 并删新文件。
- **难度** L ｜ **量级** 300–420 行

## T2 vite alias + CSS 双资产 + woff2 插件 + 首屏测量（B2/B3/H4）｜B 组（builder2，T1 阶段 A 后）

- **目标**：`katex` 裸模块名解析到 shim（default + 命名都能用）；允许 2 个 CSS 资产且只处理含 `@font-face` 的；首屏测量统计**全部**首屏资源并给出逐 URL 字节。
- **为什么现在**：B2 实测对象写法 `'^katex$'` 永不命中、字符串前缀会误伤 `katex/dist/katex.min.css`、wrapper 内 `import('katex')` 会自引用；B3 实测现有插件在 2 个 CSS 资产时 `throw`，放宽计数后仍只处理 `cssNames[0]`；H4 指出只统计 script/stylesheet 会漏 `modulepreload`。
- **文件**：`vite.config.ts`、`scripts/vite-woff2-only.mjs`、`scripts/measure-first-screen.mjs`（新）
- **步骤**
  1. `vite.config.ts`：`resolve.alias = [{ find: /^katex$/, replacement: fileURLToPath(new URL('./src/lib/katexLazy.ts', import.meta.url)) }]`（**数组 + 正则**）；`chunkSizeWarningLimit` 保持 1200；把过期注释改成「见 ADR-0012」。
  2. `scripts/vite-woff2-only.mjs`：遍历全部 CSS 资产，找**含 `@font-face`** 的做裁剪与 16 face 校验，其余 CSS 原样保留；「CSS 资产数必须为 1」的硬失败改为「至少一个含 `@font-face`」。
  3. `scripts/measure-first-screen.mjs`（H4）：解析 `index.html` 的 `script[src]`、`link[rel=stylesheet]`、`link[rel=modulepreload]`、`link[rel=preload][as=script|style]`；逐 URL 打印 raw 与 `zlib.gzipSync(level:9)`；求和并打印省下的字节与百分比；`--max 285000` 超线 exit 1；断言 index 引用的资源里**没有** `katex`/lazy chunk 名；注释写明「与 Vite 日志 gzip 差约 1.3%，验收用脚本口径」。
  4. 构建：`npx vite build --outDir .tmp/build-b`，跑测量；T1 阶段 B 删静态 CSS 后重跑，记录前后两个数。
- **验收**
  1. 构建成功且 `node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000` exit 0，打印合计 ≤285,000（预期 281–283 KB），并列出每个首屏 URL 的 raw/gzip。
  2. 产物含独立 `katex-*.js`/`katex-*.css` chunk；index 引用集合不含它们；`modulepreload` 与 `preload` 若存在也计入且打印。
  3. woff2 插件：2 个 CSS 资产时构建不抛，`@font-face` 恰 16 个、woff2 恰 15 个（`.tmp/build-b/assets`）。
  4. `Select-String vite.config.ts -SimpleMatch 'find: /^katex$/'` ≥1；`Select-String src/lib/katexLazy.ts -SimpleMatch 'export default'` ≥1。
- **门禁**：`npx vite build --outDir .tmp/build-b; node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000`
- **风险与回退**：alias 只认数组正则；漏统计 `modulepreload` 会少算体积；插件改动必须保住 16 face/15 文件。回退：`git checkout -- vite.config.ts scripts/vite-woff2-only.mjs` 并删测量脚本。
- **难度** M ｜ **量级** 100–160 行

## T3 0.24.0 条件发版 + ADR-0012 + 口径与体积预算（S1/S2/S5/H6）｜B 组（builder2，T2 + T1 阶段 B 后）

- **目标**：**只有** `measure --max 285000` 通过且 Kill criteria 未触发，才升 0.24.0；否则保持 0.23.0 并记「尝试与回退」；ADR-0012 记录方案与实测；文档口径与实际数字一致。
- **为什么现在**：S1 证明 265 KiB 不可达；S2/S5 要求测量口径只用脚本；H6 指出条件发版必须落到 `package.json` 与 CHANGELOG，否则不达标也会写成 0.24.0。
- **文件**：`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0012-katex-lazy-loading.md`（新）、`package.json`
- **步骤**
  1. **先跑体积门**：`node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000`。exit 0 且无 Kill 命中 → 升 `"version": "0.24.0"`；否则**保持 `0.23.0`**，本任务只写 ADR-0012 与 CHANGELOG 的「尝试与回退」行，并在 `impl-b.md` 记原因。
  2. `docs/CHANGELOG.md`：通过时加 `## 0.24.0 — 2026-11-16`（首屏 364,960 → 实测值；**265 KiB/271,360 未达成、差约 10 KB、已记 ADR-0012**；CSS/字体按需；含公式首屏非阻塞预取与失败态；块级 display 修正；导出兜底；测试 [N] 文件 [M] 条；安装包 `[TBD]`）；不通过时只加一段「0.24.0 未发布：KaTeX 惰性化实测值与 Kill 结果见 ADR-0012」。
  3. README：通过时改体积段（`364,960 → 实测值（−22.9%）`；KaTeX 独立 chunk ≈77 KB gzip 按需加载）与「体积/依赖」一行；不通过时不改体积结论，只在「现在不能做什么」记「KaTeX 仍在首屏（ADR-0012 记录不可达）」。
  4. `AGENTS.md §6`：版本按实际（0.24.0 或仍 0.23.0）、状态与未验（真实 WebView2 冷启动、离线 chunk 失败、CLI 下 `npm test` 看不到 alias、`katexLazy.test.ts` 尚未挂入 `npm test`）。
  5. `docs/adr/0012-katex-lazy-loading.md`：背景（静态 import 五处、364,960 B）、决策（数组正则 alias + 深路径 loader + CSS 随动态 chunk + 注册表/订阅 + 非阻塞预取 + displayMode 推断）、**实测（281,471 B；265 KiB 不可达、差 10,111 B；全量 stub 上限 279,087）**、被否决方案（对象 alias、字符串前缀、`renderToString` 改 async、只拆组件不拆 tiptap、await parse 阻塞首屏）、Kill criteria 与结果、下一轮第二杠杆、UNVERIFIED。
- **验收**
  1. **发版门**：`measure --max 285000` exit 0 时 `node -e "console.log(require('./package.json').version)"` = `0.24.0`；exit 非 0 时**仍为 0.23.0**，且 CHANGELOG 无 `## 0.24.0` 正式条目（只有尝试记录）。
  2. 通过时 CHANGELOG 含「未达成」「271,360」「ADR-0012」，**不含**「已达标」「≤265 KiB」；README 体积数字与 `measure` 输出一致（根代理复算）。
  3. `Test-Path docs/adr/0012-katex-lazy-loading.md` = True，含「281,471」「271,360」「不可达」「Kill」；`AGENTS.md` 版本与实际一致。
  4. `npm test` 16 文件全绿（本轮不新增测试文件）；安装包预算 ≤815,000（当前 810,456），硬线 850,000 不动，字节与 SHA 由根代理回填。
- **门禁**：`node scripts/measure-first-screen.mjs --dir .tmp/build-b --max 285000; npm test` + 上述 `Select-String`
- **风险与回退**：条件发版最容易漏 `package.json`，验收第 1 条正反两分支都查；文档把「未达成」写成「接近」会误导发布。回退：`git checkout -- package.json docs/CHANGELOG.md README.md AGENTS.md` 并删 ADR-0012。
- **难度** S–M ｜ **量级** 120–180 行

## 文件归属与串行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 阶段 A | A（先做） | `src/lib/katexLazy.ts`、`src/lib/katexLoader.ts`、`src/lib/katex-dist.d.ts`、`src/lib/katexLazy.test.ts`、`src/App.tsx`、三个公式组件、`src/lib/export.ts`、`src/styles.css`、`scripts/acceptance.mjs`、`scripts/shot.mjs`、`scripts/math-ready-acceptance.mjs` |
| T2 | B（T1-A 后） | `vite.config.ts`、`scripts/vite-woff2-only.mjs`、`scripts/measure-first-screen.mjs` |
| T1 阶段 B | A（T2 后） | `src/main.tsx`（删 CSS）+ 跑验收 |
| T3 | B（T2 + T1-B 后） | `README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0012-katex-lazy-loading.md`、`package.json` |

- 零重叠：A 只碰 `src/`、两个验收脚本与新脚本；B 只碰 `vite.config.ts`、两个 `scripts/` 文件、文档与 `package.json`。`package.json` 只归 T3；`katexLazy.test.ts` 本轮不进 `npm test`（16 文件不变）。
- 串行门：T1-A（shim 落地，不删 CSS、不 build）→ T2（alias/woff2，B 首次 build）→ T1-B（删静态 CSS、重启 dev、跑 math-ready + acceptance）→ T3（体积门与条件发版）→ 根代理最终 `npm run build`、出包与回填。**两组不同时跑构建**。
- 报告：A 组 `docs/iteration/round-11/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-11/t1-*.png`。

## 本轮不做（写进下轮建议）

**导出/预览整体移出首屏**：stub 上限 279,087 B，收益 <2.4 KB。**265 KiB 是下轮第二杠杆**：替换 `@tiptap/extension-mathematics`（自带静态 katex）或更小的解析器，单独立项 + 往返测试；同时把 `katexLazy.test.ts` 挂进 `npm test` 需要先证明 Node 下无 CSS 也能跑（本轮已注入式验证，下轮再挂）。字体再裁、06 空行、`App.tsx` 拆分不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 不含公式的文档首屏不再下载 KaTeX：JS+CSS gzip 364,960 B → 约 281,500 B（−22.9%）。
2. 含公式文档打开后公式很快以排版态出现（非阻塞预取），不再闪一片 `$…$`；加载失败显示等宽原文可点击重试。
3. 块级公式在编辑区按块级排版（居中、上下留白），不再压住下一段。

## 风险最高的任务

**T1**。5 个同步调用点被拆成「占位 + 注册表 flush + 订阅重画」，`setMarkdown` 有 **7 个调用点**要逐个处理，`exportAs` 还要无条件 await 并检查 `math-fallback`：任何一处漏了，就是「公式永久空白」「导出悄悄回退源码」这类无报错的静默退化——而 Node 单测看不到 alias，真模块照常工作。缓解是 `math-ready-acceptance` 五组断言（首屏无 katex 请求、120 ms 无裸 `$`、阻断后失败态、重试、五条路径）加注入式 `katexLazy.test.ts` 锁契约。次高是 T2：alias 写成对象形式会静默不生效，只有体积实测能发现，验收第 1 条必须看到真实下降。

## 下一轮建议主题

**第二杠杆与真机验证**：立项替换 `@tiptap/extension-mathematics` 或更小的解析器，真正压到 265 KiB；把惰性化搬进真实 WebView2 冷启动与离线 chunk 失败实测；`katexLazy.test.ts` 在 Node 可跑后挂进 `npm test`；构建产物里加 `ParseError` 计数断言，再决定是否放开 `chunkSizeWarningLimit`。
