# 第 76 轮执行报告（executor）

round=76，HEAD `cb51682` 未变；按 plan rev.2 + plan-review rev.2 做 3 个任务，全 DONE。未 push、未改 `release/`、无新依赖。

## 门禁
- `npx tsc --noEmit` exit 0
- `npm test` exit 0：**43 文件 559 条 0 fail**（改前 548；A1 +6、A2 +5）
- `npm run verify` exit 0：首屏 gzip **303,664 B**（改前 303,381，+283；内部 310,000 余 6,336）
- roundtrip 未跑（不动序列化）
- 日志 `.tmp/r76-impl-{tsc,test,verify}.log`

## A1（B-134）DONE
- `export.ts:33` `buildExportToc(doc, original?)` → `{ids, nav} | null`；条目 `<a class="sl-toc-item" data-level data-toc-index href="#sl-toc-k">`，文字走 `escapeHtml`。
- `export.ts:110` `applyExportTocHtml(bodyHtml, toc)`：DOM-free 深度扫描（含 `br`/`img` 等空元素集合、注释跳过），顶层第 k 个 `<h1–h6>` 加 `id="sl-toc-k"`，顶层 `[TOC]` 段（`isTocMarkerText`）换 nav；标题数 ≠ ids 数时原样返回。
- `export.ts:258` STYLES 加 `nav.sl-toc` + `a[data-level]` 缩进，深色/打印块各补色。
- `App.tsx:4823` 接线；仍动态 import（`:4790`），未建 `exportDom.ts`、顶部无静态 import。
- `export.test.ts` +6 条（多标题 id/nav/href 与落位、无标题、无标记不加 id、`\[TOC\]` 留字面、引用块标题不计 + `<br>` 段落、`<b>`/`&` 转义 + 小写 `[toc]`），27/27 绿。
- `typora-gap.md:49` 改「HTML 导出带目录与锚点（B-134），打印未单独验」。

## A2（B-122）DONE
- `mermaidLazy.ts:56` `MermaidTheme` 加 sepia；`:64` 解析认 sepia；`:101` `mermaidConfig`（dark/default 只 `{theme}`，sepia 用 `base` + 11 个 `themes.ts` 变量）；`:109` `configure(module, theme = mermaidTheme())`；`:137`/`:163` `ensureMermaid`/`renderDiagram` 可选传主题，生产调用点不传。
- `mermaidPreview.ts:28` `renderedTheme` 放宽为 `MermaidTheme | null`。
- `mermaidLazy.test.ts` +5 条（sepia 恒 sepia、default/dark 无 vars、11 键逐项同、对比度 ≥4.5、sepia 初始化 base+vars + 同主题不重跑 + 切回 default 重跑 + 不传主题在 Node 仍 default），19/19 绿。
- 改前 `git grep -n sepia` 两份文件 0 命中；mermaid dist `primaryBorderColor` 40 命中。

## A3（B-111）DONE
- `typora-gap.md:30` 写明共 4 种 + 少 Word/Epub/LaTeX/图片（B-111）；缺表新增 `### 导出（1）`；表头 `缺的（6）`。
- `README.md:102`、`AGENTS.md:74` 缺 5→6（STATE/BRIEF 交 scribe）。
- `node .tmp/r58-docs-check.mjs` → headHave 39 / haveCount 39 / headMiss 6 / missCount 6 / missRowSum 6，子节 2/1/1/2 declared=actual；`缺 5 项|5 项缺` 0 命中 exit 1（改前 2），`缺 6 项|6 项缺` 2 命中。

## 交付脚本（已写、未跑）
- `.tmp/e2e-r76-a1-export-toc.mjs`：拦 `createObjectURL` 取真实导出 HTML，断言 nav/两个 id/2 个 href/无字面 `[TOC]`，再挂新页点第 2 条目录看 `#sl-toc-1` 与外观，截图 `shots/round-76/a1-export-toc.png`。
- `.tmp/e2e-r76-b157.mjs`（plan-review P2-4）：点公式→Esc、手打 `$x^2$` 后 `.sl-math-reveal`/`.ProseMirror-selectednode` 应 0，再打一字公式数不变。
- 未跑原因：`Get-NetTCPConnection` 实测 9222–9226 与 5175 全部无监听；只试一次、不重启服务器。

## UNVERIFIED
A1 浏览器导出/锚点跳转/外观；A2 真机 SVG 颜色与截图；B-157 第三次未验（P0 仍 open）；打印路径未单独验。

## CHANGELOG 一行建议
HTML 导出带 `[TOC]` 目录与可跳转锚点（不再写字典面标记）；暖纸主题下 Mermaid 改用暖色配色。

## 新踩坑（3 条）
1. 目录只能替换传给 `buildHtmlDocument` 的 `bodyHtml`：`hadMath` 等旁支读原串，别一起改。
2. 主题必须一路传到 `configure`：只给 `renderDiagram` 时 `ensureMermaid()` 仍读 `mermaidTheme()`，Node 下恒 default（plan-review P1-1）。
3. `export.ts` 静态 import `toc.ts` 会把 `risk.ts` 拉进预览 chunk；首屏只 +283 B（来自 `themes.ts`），改后必须重跑 verify 量数。
