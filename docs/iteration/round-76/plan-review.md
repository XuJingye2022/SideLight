# 第 76 轮计划审查 rev.2（critic）

结论：**REVISE**。1 条 P1（A2 验收按现写法跑不通）+ 4 条 P2。A1 的 DOM-free 改法、A3 计数与红线无问题；H2/H3 已修。

## 上一版漏洞
- H1（撤销条跨工作区）、H4（静态判据假红）：本轮不做 B-142，任务已不存在。
- H2（A1 DOM 半边零验证）：已修。`applyExportTocHtml` 改纯函数、`export.test.ts` +6，不依赖 jsdom/CDP。
- H3（exportDom 加载）：已修。不新建文件，函数留在已懒加载的 `export.ts`；App 顶无静态 import（`App.tsx:4790` 唯一入口）。
- H5（批次）：已换成 B-134/B-122/B-111，均在 10 条 P2 内。

## 漏洞

**P1-1 A2 的 sepia 单测按现写法必红。** `renderDiagram(code,'sepia')` 只把主题交给 `renderDiagram`；`ensureMermaid()`→`configure()` 仍读 `mermaidTheme()`，Node 下无 `document` 恒返 `'default'`（`mermaidLazy.ts:64-69`），假 loader 收到 `{theme:'default'}`，没有 base/themeVariables。修：`configure(module, theme = mermaidTheme())`、`ensureMermaid(theme = mermaidTheme())`、`renderDiagram(code, theme = mermaidTheme())` 三处都带主题，`appliedTheme` 按 theme 比较；生产调用点不传。验收补「不传主题时 Node 仍 initialize default」。

**P2-1 基线数字过期。** 计划写 `npm test` 536→547、首屏 303,043 B；本轮实测 `npm test` **43 文件 548 条 0 fail**（blocks=43 / passSum=548），第 75 轮测首屏 **303,381 B**（`round-75/test.md:6-7`）。目标改 548→559；A2 把 `themes.ts` 拉进首屏后仍按 ≤310,000 判。

**P2-2 B-134 的差距表单元格没人改。** A3 修法④说「A1 只改 `:49` 单元格文案」，但 A1 修法/验收没有这一步；A1 落地后 `typora-gap.md:49` 仍写「导出/打印不带」，与 B-134 证据「该单元格要改」冲突。修：写进 A1 验收（改「HTML 导出带目录；打印未单独验」）；该行在「已经有的」里，A3 计数 39 不变。

**P2-3 A1 扫描器有整篇静默回退风险。** `<p>a<br>b</p>` 常见；void 判定漏 `br`/`img` 会算错深度 → 顶层标题数 ≠ `ids` 数 → 原样返回，整篇无目录且不报错。6 条验收无 `<br>` 用例，marker 判定也没写复用 `isTocMarkerText`。修：加「标题前有 `<br>` 段落仍加 id」「`<p> [toc] </p>` 也换 nav」两条，marker 判定复用 `isTocMarkerText`。

**P2-4 B-157（P0）第三轮仍零新证据。** 附录砍掉后无脚本；CDP 连不上即第三次 UNVERIFIED、P0 继续 open。修：把「点 `$\alpha$`→Esc 不出源码」「手打 `$x^2$` 后不是 NodeSelection」塞进 A1 的同一次 CDP 尝试，交付 `.tmp/e2e-r76-b157.mjs`（跑不跑都算交付）。

## 已核对
- 行号：`toc.ts:35/44/78`、`tocRender.ts:163-169`、`export.ts:13/78-159`、`App.tsx:4784/4790/4816-4824`、`mermaidLazy.ts:31/57-61/72-83/126-137`、`mermaidPreview.ts:20/102`、`themes.ts:11-47/81`、`typora-gap.md:30/49/51`、`README.md:102`、`AGENTS.md:74` 都在；`.tmp/r58-docs-check.mjs` 在，现跑 39/5、子节 2/1/2。
- `sepia` 在两份 mermaid 文件 0 命中（`git grep` exit 1）；mermaid 11.12.0 的 11 个 themeVariables 键都在（`node_modules/mermaid/dist/chunks/mermaid.core/*.mjs`）。红线：不改序列化/内核、无新依赖、导出 chunk 懒加载、版本与 `release/` 不动——无违规。CDP 未试。
