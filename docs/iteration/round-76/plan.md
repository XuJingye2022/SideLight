# 第 76 轮计划（单轮，3 任务）— **rev.2**

rev.2：按 lead 仲裁换批次（H5）；A1 改 DOM-free 纯函数 + 单测闭环（H2、H3）；附录砍掉（H6）；H1、H4 随 B-142 取消。任务数、单轮结构与门禁不变。

轮参数：round=76 / nn=76 / 报告 `docs/iteration/round-76` / CDP 9222–9226 / startSha `cb51682`（=HEAD，已核）。dev 只用 `localhost:5175`；**每任务只准试一次 9222–9226**，连不上改单测/构建/静态检查并记 UNVERIFIED。门禁 `build`、`npm test`（不动序列化，免 roundtrip）、`verify` 首屏 ≤310,000 B（现 303,043 B）。

## 批次（H5）

用户口径「BACKLOG 10 条 P2 逐条清，每 3 条一批」。10 条 = B-103/106/107/109/110/111/121/122/126/134（`BACKLOG.md:62-83` open 行）；本批 **B-134 + B-122 + B-111**，都能单测/静态闭环。B-142、B-211 不在 10 条内且属 Deferred（`:102`、`:107`），本轮不做；rev.1 已被本文件覆盖、未留档，旧任务清单见 `plan-review.md` H1/H4/H5。

## A1（B-134）HTML 导出带目录、去掉字面 `[TOC]`

问题：`App.tsx:4817` 用 `editor.getHTML()`；目录是 `Decoration.widget`（`tocRender.ts:163-169`），`[TOC]` 段写成字面 `<p>[TOC]</p>`。
修法：
1. `src/lib/export.ts` 加 `buildExportToc(doc, original?)` → `{ ids, nav } | null`：条目 `tocEntries`（`toc.ts:44`）、标记数 `tocParagraphPositions(doc).length`（`:35`）、`tocShouldRender`（`:78`）；无标题/无标记/全转义时 null。nav 用 `escapeHtml`（`export.ts:13`），条目 `<a class="sl-toc-item" data-level="N" href="#sl-toc-k">`。
2. 同文件加 `applyExportTocHtml(bodyHtml, toc)`：深度 0 扫串（void 标签不减深度），第 k 个顶层 `<h1–h6>` 插 `id="sl-toc-k"`，顶层 `<p>` 文字为 `[TOC]` 的整块换 nav；顶层标题数与 `ids.length` 不等时原样返回。
3. `App.tsx:4816-4824`：`buildExportToc(editor.state.doc, originalText)` + `applyExportTocHtml(editor.getHTML(), toc)`，其余入参不变。
4. `STYLES`（`export.ts:78-159`）加 `nav.sl-toc`（`a[data-level]` 分级缩进、深色块换色），不加 `<link>`/`<script>`。
加载（H3）：两函数留在 `export.ts`，不新建 `exportDom.ts`；它已懒加载（`App.tsx:4790`；`PreviewPane.tsx:6` 只引它且 PreviewPane 是 lazy chunk），App 顶部不许加静态 import。
验收：`export.test.ts` +6（多标题 id/nav/href；无标题 null；无标记 null 且不加 id；`\[TOC\]` 全转义 null 留字面；`<blockquote><h2>` 不计入；`<b>`/`&` 已转义），doc fixture 照 `tocRender.test.ts:10-22`。`npm test` 绿（536 → **547**，+11 含 A2）、`build`/`verify` 绿。UNVERIFIED：浏览器真实导出的锚点与外观；脚本 `.tmp/e2e-r76-a1-export-toc.mjs` 只交付。风险：无标记时留字面 `[TOC]`（与编辑视图一致）。

## A2（B-122）暖纸下 Mermaid 暖色配色

问题：`resolveMermaidTheme`（`mermaidLazy.ts:57-61`）不认 sepia，落到 `default` → 节点 `rgb(236,236,255)`、描边 `rgb(147,112,219)`；`configure`（`:72-83`）只传 `theme`。
修法：
1. `MermaidTheme = 'dark' | 'default' | 'sepia'`；`resolveMermaidTheme('sepia', …)` 恒 `'sepia'`；`mermaidLazy.ts:31` 与 `mermaidPreview.ts:20` 的缓存类型同步放宽。
2. 纯函数 `mermaidConfig(theme)`：dark/default 保持 `{ theme }`；sepia 返回 `{ theme: 'base', themeVariables }`，全取 `BUILTIN_THEMES`（`themes.ts:11-47`）sepia 值：`background`=--paper、`primaryColor`/`mainBkg`/`edgeLabelBackground`=--paper-raised、`primaryBorderColor`/`nodeBorder`/`clusterBorder`=--line-strong、`primaryTextColor`/`textColor`=--ink、`lineColor`=--ink-soft、`clusterBkg`=--panel。
3. `configure` 改传 `mermaidConfig(theme)`；切主题重 initialize 与键 `${theme}|${hash}`（`:126-137`、`mermaidPreview.ts:102`）不动。
验收：`mermaidLazy.test.ts` +5（sepia + 系统深色仍 sepia；default/dark 不带 themeVariables；sepia 与 `BUILTIN_THEMES` 逐项同；对比度 ≥4.5 用 `themes.ts:81`；`renderDiagram(code,'sepia')` 假 loader 收到 base+vars、同主题不重复、切回 default 重来）——`renderDiagram` 加可选第二参，不传仍走 `mermaidTheme()`。静态对照：`Select-String node_modules\mermaid\dist\chunks\mermaid.core\*.mjs -Pattern 'primaryBorderColor'` ≥1（实测 40）；改前 `git grep -n sepia -- src/lib/mermaidLazy.ts` **0 命中**（已核）。`verify` 首屏 ≤310,000 B、`npm test` 绿。UNVERIFIED：真机 SVG 颜色。

## A3（B-111）差距表补导出格式差距

问题：`typora-gap.md:30` 导出行只写 HTML/Markdown/纯文本/打印，Typora 另有 Word/Epub/LaTeX/图片（Pandoc）；「缺的」表（`:51-71`）无对应行。
修法：①`:30` 补「共 4 种；比 Typora 少 Word / Epub / LaTeX / 图片 4 种（B-111）」；②缺表新增 `### 导出（1）` + `| Word / Epub / LaTeX / 图片导出 | 无 | P2 | 需 Pandoc 或自研，依赖与体积按红线 6 待批 |`，表头 `缺的（5）` 改 `（6）`；③`README.md:102` 缺 5→6 项、`AGENTS.md:74` 5→6 项缺（STATE/BRIEF 交 scribe）；④A1 只改 `:49` 单元格文案，A3 在 A1 后跑计数。
验收：`node .tmp/r58-docs-check.mjs` → 39/39/6/6/6 且各子节 declared=actual（改前实测 39/5、2/1/2、5）；`git grep -nE '缺 5 项|5 项缺' -- README.md AGENTS.md` **0 命中 exit 1**（改前 2：README:102、AGENTS:74），`缺 6 项|6 项缺` 2 命中。纯文档不跑 build。

## 未验与不做

- B-157（P0）仍 open：第 3 次未验（CDP 无监听）；机制侧 `mathInput.test.ts` 已覆盖三条出口。rev.1 附录按 H6 砍掉（`.tmp/e2e-r75-a1.mjs` 从未交付）。
- A1 浏览器半边、A2 真机 SVG 在 CDP 连不上时记 UNVERIFIED；单测 + 构建 + 静态检查是主证据。
- 不 push / 不建 Release / 不改 `release/` / 不发版；不新增运行时依赖；不做 B-142、B-211 及其余 7 条 P2；不改序列化与内核。
