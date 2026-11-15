# 第 11 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-11/plan.md`（基线 `4878030`，v0.23.0）。
审查方式：读计划、三份 findings、`src/lib/math.ts`、`src/components/MathInlineEditor.tsx`、`src/components/PreviewPane.tsx`、`src/lib/export.ts`、`vite.config.ts`、`scripts/vite-woff2-only.mjs`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（shim 缺 default export + Node 测试会 import CSS）、H2（T1/T2 互相依赖却并行）、H3（`setMarkdown` 120 ms gate 与 7 个调用点没处理）是 blocker；H4/H5/H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:14` 只列了命名导出 `ensureKatex/isKatexReady/subscribe/onReady/render/renderToString`；但 `@tiptap/extension-mathematics` 是 `import katex from "katex"`，T2 的 alias 把 `katex` 换到 `katexLazy.ts` 后，**没有 default export 时 `katex.render` 是 undefined**，公式全空。另 `katexLazy.test.ts` 走 `ensureKatex()` → 动态 `katexLoader.ts` 顶层 `import 'katex/dist/katex.min.css'`；`npm test` 是 Node，**Node 不能 import CSS**，17 个测试文件必红。 | `plan.md:14`；`findings-bug.md:271`（明确「默认导出」）；`node_modules/@tiptap/extension-mathematics/dist/index.js` 的 `import katex from "katex"`；`src/lib/export.ts:1`；`src/main.tsx:6` | `katexLazy.ts` 加 `export default { render, renderToString, ensureKatex }`；`katexLazy.test.ts` 不加载 `katexLoader` 的 CSS（mock loader 或只测注册表/纯函数），或给 Node 一个无 CSS 的 loader 分支；测试命令保持 16 文件直到真的能在 Node 跑 | T1/T3 |
| H2 | blocker | T2 的 `vite.config.ts` alias 指向 `src/lib/katexLazy.ts`，该文件由 T1 创建；B 组与 A 并行时 T2 的 `npx vite build --outDir .tmp/build-b` 会在 shim 尚不存在时失败。反过来 T1 的 `math-ready-acceptance` 在 dev 5173 上要看到 shim 生效，也需要 T2 的 alias；A 的 dev 测试在 T2 之前跑仍会加载真 katex，测不到惰性。计划 `:5` 只说 A 的 build 等 T2，没说 A 的 dev 验收也等 T2。 | `plan.md:5,21-22,73-75`；`vite.config.ts` 当前无 alias；`findings-bug.md:104-122`（alias 必须命中） | 串行：A 先落 `katexLazy.ts`，B 再加 alias/woff2；或 B 先写 alias 到临时 stub，A 再替换。A 的 `math-ready-acceptance` 明确在 T2 合并后跑，并记录 dev server 重启；验收加「构建产物里 `katex` 不在主 chunk」 | T1/T2 |
| H3 | blocker | T1 `:18` 把 `setMarkdown` 改 async，公式时 `await Promise.race([ensureKatex(), 120ms])` 再 `manager.parse`。`findings-bug.md:242` 明确建议 `void ensureKatex()` 不 await；120 ms 等待会让公式文档首屏反而慢，超时后模块才到会先 parse 占位再 flush，CLS 仍在。代码里 `setMarkdown` 有 **7 个调用点**（`App.tsx:793,823,827,898,1545,2163,2751`），计划 `:18` 写「6 个」；任一调用点没 await/没处理 reject，`ensureKatex` 拒绝时 `manager.parse` 不执行或旧文档 result 在 120 ms 后覆盖新文档。 | `plan.md:18`；`App.tsx:793,823,827,898,1545,2163,2751`；`findings-bug.md:239-242` | 不 await parse：先 `void ensureKatex().catch(...)`，`manager.parse` 立即执行，shim 占位 + flush 重画；若必须 gate，只对「含公式且当前仍是同一 generation」的 parse 加 generation token，超时/切换文档丢弃旧结果；6→7 调用点逐个核对并补 catch | T1 |
| H4 | major | T2 的 `measure-first-screen.mjs` 只统计 `index.html` 里 `<script src>`/`<link rel=stylesheet>` 的 JS/CSS；不统计 `<link rel=modulepreload>`、`<link rel=preload as=script/style>`，也不断言 index 里没有 lazy chunk。Vite 若把共享 chunk 写进 `modulepreload`，会把首屏算少；`gzip level 9` 与 Vite 日志的 1.3% 差也要写清。 | `plan.md:69-73`；`docs/index.html` 当前只有 script+stylesheet；`findings-ship.md` 的体积口径；`vite.config.ts` 无 modulePreload 配置 | measure 同时收 `script[src]`、`link[rel=stylesheet]`、`link[rel=modulepreload]`、`link[rel=preload][as=script/style]`；打印每个 URL 与 gzip size；加断言 index 不含 `katex`/lazy chunk；注释 `gzip level 9` 与 Vite 压缩日志的差异 | T2 |
| H5 | major | T1 `:17` 的 `exportAs` 只在 `editor.getHTML()` 含 `data-type="…-math"` 时 await。若判定漏（源码模式/属性顺序/`getHTML` 未包含 data-type），`buildHtmlDocument` 里的 shim `renderToString` 未就绪返回 `''`，`renderMathml` 静默退回 `<code class="math-fallback">`；`exportAs` 不检查输出，用户得到无公式的 HTML 且无提示——正是「导出静默退回」。 | `plan.md:17`；`export.ts:131-142`（fallback）；`findings-bug.md:150-168`（空串静默降级） | `exportAs` 在 build 前无条件 `await ensureKatex()`（无公式时也只是一次已 resolve 的调用），或 build 后检查 `math-fallback`/`<math` 并在失败时 toast；`export.test` 加「shim 未就绪不得被当作成功」；补源码模式导出、块级公式、无效 latex 三例 | T1 |
| H6 | major | T3 的版本门是条件句（`≤285,000` 才发 0.24.0），但 T3 步骤 6 又无条件写「版本 0.24.0：package.json 只改版本」；若 T1/T2 体积未达标、Kill criteria 已触发，T3 仍可能把包写成 0.24.0。`281,471/271,360` 的「不可达」和 `≤285,000` 的验收线要同一处写清。 | `plan.md:4,86-89`；`findings-ship.md` 的 0.24 口径 | T3 步骤 6 改成 `if measure <= 285000 then version=0.24.0 else no bump`；`CHANGELOG`/README 的 0.24 段同样条件化；`package.json` 验收加「不达标时仍 0.23.0」；`--max 285000` 由 measure 脚本返回码决定 | T3 |

---

## H1（blocker）shim 的 default export 与 Node 测试

Tiptap 的 NodeView（`node_modules/@tiptap/extension-mathematics/dist/index.js:139`、`:311`）调用：

```js
import katex from "katex"
...
katex.render(node.attrs.latex, innerWrapper, katexOptions)
```

T2 的 alias 把模块说明符 `katex` 换成 `src/lib/katexLazy.ts`。T1 `:14` 只列命名导出。若 shim 没有 `export default { render, renderToString, ensureKatex }`：

- `import katex from 'katex'` 得到 `undefined`（或空对象），`katex.render` 抛错；
- NodeView 的 `try/catch` 把 `wrapper.textContent = node.attrs.latex`，公式显示成裸 LaTeX，**不是排版态**；
- `findings-bug.md:271` 的 spike 明确写了「默认导出」，计划漏了。

第二个问题：`katexLazy.test.ts` 按计划 `await ensureKatex()` 会动态 import `katexLoader.ts`，而后者顶层 `import 'katex/dist/katex.min.css'`。`npm test` 用 Node 跑 TS，Node ESM **不认 `.css`**，测试在 import 阶段就失败；T3 还计划把测试文件数从 16 改成 17。修：

1. `katexLazy.ts` 加默认导出；
2. 测试不加载 `katexLoader` 的 CSS：用注入的 loader mock，或把 CSS 移到只在 Vite 构建时走的 `?inline`/单独的浏览器入口；Node 侧只测注册表、`render` 的占位/重画、`renderToString` 的 ready 前后语义；
3. 若暂时不能在 Node 测，保留 16 文件，把 shim 的 DOM 行为放进 `math-ready-acceptance` 的浏览器断言，别让 `npm test` 红。

## H2（blocker）T1 与 T2 的互相依赖

T2 的 alias `replacement` 指向 `src/lib/katexLazy.ts`；该文件是 T1 的新文件。B 组 `T2` 与 A 组并行：

- T2 运行 `npx vite build --outDir .tmp/build-b` 时，若 T1 还没创建文件，Vite/Rollup 解析 alias 直接失败；
- T1 的 `math-ready-acceptance` 在 dev 5173 上要看到 `.math-pending`/shim，必须 T2 的 alias 已生效；否则 Tiptap 仍加载真 katex，`ensureKatex` 永远不被调用，测试假绿/假红。

计划 `:5` 只写「A 的 `npx vite build` 依赖 T2 的 woff2 插件改动，由根代理在 T2 合并后统一跑」，没写 A 的 dev 验收也依赖 T2；也没写 T2 的 build 依赖 T1 的 shim 文件。两组「并行」在文件层面零重叠，在构建时序上不独立。

修：明确串行点：

1. A 先落 `katexLazy.ts`/`katexLoader.ts`/`katex-dist.d.ts`（不跑 build）；
2. B 加 `vite.config` alias 与 woff2 插件；
3. A 重启 dev server，跑 `math-ready-acceptance`；
4. B 跑 `.tmp/build-b` 与 measure；A 的 `.tmp/build-a` 由根代理在 T2 后统一跑。

或在 T2 先用 `katexLazy.stub.ts` 让 build 过，A 再替换；但验收不能跳过「构建产物里 `katex` 不在主 chunk」的断言。

## H3（blocker）`setMarkdown` 的 120 ms gate 与 7 个调用点

计划 `:18`：

> `setMarkdown` 改为 `async`：仅当正文命中公式判定时 `await Promise.race([ensureKatex(), 120ms 超时])`，再 `manager.parse`

findings B4 `:239-242` 的建议是：

> `void ensureKatex()` 预取，不 await，正文立即 parse；shim 先占位，模块到了 flush 重画。

两者冲突。120 ms gate 的问题：

- 公式文档首屏被硬延迟最多 120 ms；超时后 parse 仍是占位，模块晚到再 flush，CLS 没消失，只是把闪烁推迟。
- `Promise.race` 的超时 Promise 没有取消；模块在 120 ms 后 resolve 仍会触发 flush，可能重复重画。
- `ensureKatex` reject 时 `await` 抛出，`manager.parse` 不执行，正文空白；调用方没 catch 就 unhandled rejection。
- `App.tsx` 里 `setMarkdown` 有 **7 个调用点**（793/823/827/898/1545/2163/2751），计划写「6 个」；切换文件/恢复草稿/源码切回若在 120 ms 内切换，旧 parse 会覆盖新文档。

修：

1. 优先按 findings：`setMarkdown` 不 await parse；`void ensureKatex().catch(...)` 预取；占位由 shim 负责。
2. 若必须 gate，只对「公式 + 当前 generation」：`const gen = ++parseGen`；await 后 `if (gen !== parseGen) return`；`ensureKatex` reject 时 catch 并继续 parse（占位）。
3. 7 个调用点逐个核对 await/catch/void；验收覆盖「切换文件时旧 setMarkdown 不覆盖新文档」。

## H4（major）measure-first-screen 的口径

计划 `:69-73` 的 `measure` 只读 `index.html` 的 `<script src>` 与 `<link rel=stylesheet>`。用户问的三点：

- **modulepreload**：Vite 可能给共享 chunk 注入 `<link rel="modulepreload">`；不统计会少算首屏。
- **preload as=script/style**：同上。
- **gzip level 9**：findings-ship 的 281,471 与 Vite 日志有约 1.3% 差；脚本必须固定 level 9 并打印每个文件，不能混用。

修：collector 同时收 `script[src]`、`link[rel=stylesheet]`、`link[rel=modulepreload]`、`link[rel=preload][as=script]`、`link[rel=preload][as=style]`；断言 `index.html` 不含 `katex`/lazy chunk；输出每个 URL 的原始字节与 gzip 字节；注释「gzip level 9 与 Vite 默认 6 的差异」。

## H5（major）导出静默退回

`exportAs` 只在 `editor.getHTML()` 含 `data-type="…-math"` 时 await。风险：

- `getHTML()` 的公式节点属性顺序/源码模式可能漏判；漏判时 `buildHtmlDocument` 的 `renderMathml` 调 shim `renderToString`，未就绪返回 `''`，`export.ts:137` 的 `!mathml.includes('<math')` 分支静默返回 `<code class="math-fallback">`，用户拿到无公式 HTML。
- `exportAs` 不检查输出，`math-fallback` 不会触发 toast；这正是 findings B4 的「导出假通过」。
- 反向：`ensureKatex` 成功但某个 latex 非法，`throwOnError:false` 返回 `katex-error`，同样静默 fallback。

修：`exportAs` 先无条件 `await ensureKatex()`（已 ready 时是同步 resolve），再 build；build 后检查 `result.includes('<math')` 或统计 `math-fallback`，失败时 toast「部分公式未能导出为 MathML，已保留 LaTeX 原文」；`export.test` 加「shim 未 ready 不得当作成功」「无效 latex 有可见提示」两例。

## H6（major）T3 的版本门

计划 `:4` 说「验收线 ≤285,000 B；不许把未达标写成达标」；T3 步骤 6 又写「版本 0.24.0：package.json 只改版本」。这两句没有条件连接。

修：T3 步骤 6 改成：

```
if (node scripts/measure-first-screen.mjs --max 285000) {
  package.json version = 0.24.0
  CHANGELOG 加 0.24.0
} else {
  保持 0.23.0；ADR-0012 记录 281,471/271,360 不可达与回退
}
```

`package.json` 验收加「不达标时仍 `0.23.0`」；`CHANGELOG` 的 0.24.0 段同样条件化；`--max 285000` 由 measure 返回码决定，不靠人眼看。

## 逐项核对记录

### T1
- shim 的注册表 + `flush` + `try/catch` + `isConnected` 跳过 + `math-pending`，与 findings B1 的机制一致；方向对。
- `render` 的 DOM 形态与 Tiptap 匹配：块级 `innerWrapper` 的 `.closest('[data-type="block-math"]')` 能取到外层 `wrapper`；行内不会误判；方向对。
- `subscribe`/`useSyncExternalStore` 的 `getSnapshot` 是 `isKatexReady` 的稳定布尔，客户端无 SSR，方向对；`MathDraftPreview` 返回占位避免浮层跳动，方向对。
- 缺 default export（H1）、Node CSS 测试（H1）、T1/T2 时序（H2）、`setMarkdown` 120 ms（H3）、导出检查（H5）。

### T2
- alias 用数组 + 正则、深路径 `katex/dist/katex.mjs` 绕开 alias、`katex-dist.d.ts`、`vite-woff2-only` 处理 2 个 CSS 的方向对。
- T2 的 build 依赖 T1 的 shim 文件，T1 的 dev 验收依赖 T2 alias（H2）。
- measure 的 modulepreload/preload 口径要补（H4）。

### T3
- 281,471/271,360 不可达、≤285,000 验收、Kill criteria、0.24 条件，方向对；步骤 6 无条件写 0.24 是 H6。
- `npm test` 17 文件与 H1 的 Node CSS 冲突；先解决测试加载方式。

### 通用
- 文件归属：A T1 改运行时/测试；B T2/T3 改构建/文档；零并发重叠成立，但 T1/T2 有构建时序依赖（H2）。
- 构建纪律：A `npx tsc --noEmit`/dev；B `.tmp/build-b`；根代理最终 build；成立。
- 可独立复现：T1 的 shim 单测、T2 的 measure、T3 的文档检查可跑；`npm test` 受 H1 影响；真实 WebView2/离线 chunk 仍 UNVERIFIED。

## 做对的地方（别改过头）

1. T1 的 shim「注册表 + flush + 订阅」是 findings B1 唯一可靠的 NodeView 重画入口；不要退回 dispatch 事务。
2. T2 的数组正则 alias + 深路径 `katex/dist/katex.mjs` 是 findings B2 的正确写法；不要写成对象键 `'^katex$'`。
3. T3 的「265 KiB 不可达」写进 ADR/CHANGELOG、不许把未达标写成达标，是本轮最重要的口径；保留。

---

### 附：本次审查证据

- `findings-bug.md:271`（默认导出）、`:104-122`（alias）、`:150-168`（renderToString 空串）、`:239-242`（`void ensureKatex`）。
- `App.tsx:793,823,827,898,1545,2163,2751`（`setMarkdown` 7 处）；`App.tsx:2851-2865`（`exportAs`）。
- `export.ts:1,131-142`（katex 静态 import/fallback）；`main.tsx:6`（CSS）；
- `vite.config.ts` 当前无 alias；`vite-woff2-only.mjs:12/115-118`（EXPECTED_FACES 16、CSS 数 1）。
- 未改产品文件、未 commit；未生成新截图。
