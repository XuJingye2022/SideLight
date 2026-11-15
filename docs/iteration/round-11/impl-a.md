# 第 11 轮 · A 组 · T1 阶段 A 报告

日期：2026-11-16。范围：只做 T1 阶段 A（惰性 shim 落地），未删 `index.html`/`main.tsx` 静态 CSS、未跑 `npm run build`、未跑 dev 惰性验收（等 B 的 alias）。
边界：`src/**`、`scripts/math-ready-acceptance.mjs`、`scripts/acceptance.mjs`、`scripts/shot.mjs`。未碰 `vite.config.ts`、woff2 插件、文档、`package.json`。

## 完成项

- **新文件**
  - `src/lib/katexLazy.ts`：命名导出 + `export default { render, renderToString, ensureKatex }`（满足 alias 后 `import katex from 'katex'` 的 default 契约）；另有 `isKatexReady`、`subscribe`、`onReady`、`__setLoaderForTest`、`__getLastError`。
  - `src/lib/katexLoader.ts`：顶层 `import katex from 'katex/dist/katex.mjs'` + `import 'katex/dist/katex.min.css'`，只被 `katexLazy.ts` 动态 import。
  - `src/katex-dist.d.ts`：`katex/dist/katex.mjs` 的类型声明。
  - `src/lib/katexLazy.test.ts`：注入无 CSS 假 loader，7/7 PASS，本轮不挂 `npm test`。
  - `scripts/math-ready-acceptance.mjs`：五组验收草稿（首屏无 KaTeX、含公式排版、阻断 chunk、插入/预览/导出）。
- **shim 行为**
  - `render(latex, element, options)`：未就绪写入注册表、加 `math-pending` 与固定占位（行内 `inline-block/min-width:2.2em/height:1.25em`，块级 `min-height:2.8em`）并触发 `ensureKatex`；加载后逐条 `try/catch` flush，跳过 `isConnected === false`；成功清占位，失败写 `$latex$` + `math-fallback` + `title="公式排版没加载成功，点击重试"`，点击重试一次。
  - `renderToString`：未就绪返回 `''`（契约），就绪同步委托。
  - `displayMode`：`element.closest('[data-type="block-math"]')` 必填合并进 options。
  - loader 失败：注册表逐条转失败态并 `notify`，`ensureKatex` reject；`__setLoaderForTest` 可重置状态。
- **组件**：`PreviewPane`、`MathInlineEditor`、`MathDraftPreview` 都改用 `useSyncExternalStore(subscribe, isKatexReady)`；未就绪显示「公式排版加载中…」占位、不调用 `renderToString`；`MathDraftPreview` 未就绪也返回占位（不是 `null`）。
- **导出**：`exportAs` 改 `async`，四种导出都先 `await ensureKatex().catch(() => undefined)`；HTML 导出后检查 `math-fallback` 或「有公式但没有 `<math`」→ error toast「公式排版没加载成功，已按 LaTeX 原文导出。」；`export.ts` 改为 import shim，`export.test.ts` 注入真实 katex loader（Node 不进 CSS）以保持 16 文件测试。
- **首屏 gate**：`setMarkdown` 保持同步，正文命中 `$…$`/`$$…$$` 时先 `void ensureKatex().catch()` 预取再同步 `manager.parse`；7 个调用点都走同一个 `setMarkdown`，没有新增 await 阻塞。插入菜单 `pointerdown` 也预取。
- **样式**：`.math-pending`（透明字 + 固定尺寸背景）、`.math-fallback`（等宽原文、虚线框、可点击、`white-space: pre-wrap`）、`.math-pending-note`、`.tiptap-mathematics-render[data-type="block-math"] { display:block; margin:1em 0; text-align:center }`。
- **门禁脚本**：`acceptance.mjs` 的公式等待从 `waitForTimeout(500)` 改为 `waitForSelector('.editor .katex')` + `waitForFunction(() => !document.querySelector('.math-pending'))`，字体检查先等 ≥16 个 KaTeX face；`shot.mjs` 同样改等状态。

## 阶段 A 验收

```
npx tsc --noEmit                                  → exit 0
node --experimental-strip-types src/lib/katexLazy.test.ts → 7/7 PASS
npm test                                          → 16 个文件、205 条断言、0 失败
node scripts/fidelity-acceptance.mjs              → 19/19 PASS
node scripts/acceptance.mjs http://localhost:5173 → 11/11 PASS
```

阶段 A 的 `math-ready-acceptance`（dev 5173）如实记录为 **7/11 PASS**，失败的三条都因为 B 的 alias/静态 CSS 还没落地：

- `无公式文档首屏没有 KaTeX 请求`：失败，`main.tsx` 仍静态 import `katex/dist/katex.min.css`（阶段 B 才删）。
- `阻断 chunk 后出现 math-fallback` / `失败态不是空白`：失败，KaTeX 还在首屏 bundle，`katex-*.js` 不存在，abort 路由打不中。
- 通过：含公式排版态与占位清零、无裸 `$`、字体 face 20、菜单插入、预览 KaTeX。

## 阶段 B（B 的 alias/woff2 就绪后）

- 删掉 `src/main.tsx` 的静态 `import 'katex/dist/katex.min.css'`；KaTeX CSS 只能由 `katexLoader.ts` 随惰性 chunk 注入。`vite.config.ts` 的 `find: /^katex$/ → src/lib/katexLazy.ts` 已由 B 落地，未改。
- 重启 dev 后复跑：
  - `node scripts/math-ready-acceptance.mjs` → **11/11 PASS**：① 无公式首屏 0 个 KaTeX 请求；② 含公式排版态出现、`.math-pending` 清零、无裸 `$…$`、KaTeX face 20；③ 阻断 CSS 后 `math-fallback` 出现且原文可复制；④ 失败态可点击并重新发起加载；⑤ 菜单插入/块级 display（`display:block`、`text-align:center`）/预览/导出 HTML 含 `<math` 均 PASS。
  - `node scripts/acceptance.mjs http://localhost:5173` → **11/11 PASS**。
  - `node scripts/fidelity-acceptance.mjs` → **19/19 PASS**。
  - `npm test` → **16 个文件、205 条断言、0 失败**；`npx tsc --noEmit` → 0。
- **首屏无 KaTeX**：math-ready 第①组在 dev 用 Playwright 监听全部请求，加载无公式文档时没有 `katex*.js`/`katex*.css`/`katexLoader` 请求；`katexLazy.ts`（shim，几 KB）仍在首屏，KaTeX 本体与 CSS 只在惰性 chunk。
- **重试的边界（需要记录）**：失败态点击会**重新发起** KaTeX 加载（脚本断言到 2 次请求），但 dev 下浏览器会缓存失败的模块导入，同一页面里不刷新时可能仍停在失败态；验收里把这一条写成「可点击重试（会重新发起加载）」，没有把它写成「必然恢复排版」。生产构建的 cache-bust 重试路径（`katexLazy.ts` 的 `loadModule` 第二次尝试）本轮未在构建产物中验证，留给根代理/B 的实机。
- 截图：`shots/round-11/t1-block.png`（块级公式居中留白）、`t1-formula.png`（含公式状态）。

## 阶段 B 后仍等根代理

1. `npm run build` 与 `measure-first-screen --max 285000`（B/T3）确认最终首屏字节；dev 阶段只能证明「首屏请求不含 katex」。
2. 生产构建里的重试 cache-bust 与真实“断网/离线 chunk”路径未验；如失败，`math-fallback` 仍是可复制原文。
3. `katexLazy.test.ts` 仍未挂进 `npm test`（本轮保持 16 文件），T3 文档需记录挂入条件。

