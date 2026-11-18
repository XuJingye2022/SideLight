# 第 76 轮验收（tester）

判定：**PASS-WITH-UNVERIFIED**。3 任务按验收标准逐条复验，单测/构建/静态检查全绿；浏览器半边因 CDP 9222–9226 无监听未验（每端口探测 1 次，未重试）。
轮参数：startSha `cb51682`；dev 5175 未动；原始日志在 `.tmp/r76-tester-*`。

## 门禁
- `npm run verify`：tsc + vite build **绿**；首屏 gzip **303,664 B**（内部 310,000，余 6,336；硬线 320,000 余 16,336），末行 `files=3 … PASS`；主 chunk 939,766 raw / 297.97 kB gzip。`.tmp/r76-tester-verify.log`
- `npm test`：**43 文件 559 条 pass / 0 fail**（基线 43 文件 548 条，+11 = A1 6 + A2 5）。静态 `^test(` 口径 **536 → 547**，与验收写的 536→547 一致；「41 文件」是旧数字（第 74 轮起已 43 文件）。`.tmp/r76-tester-npm-test.log`
- 未跑 roundtrip：不动编辑器内核与序列化（App.tsx 只改导出分支）；不改 release/、不 push、版本仍 0.32.1。

## A1（B-134）HTML 导出带目录、去掉字面 `[TOC]`
- 新增 6 条（`export.test.ts` 21 → 27）全绿；交付脚本 `.tmp/e2e-r76-a1-export-toc.mjs` 存在，`node --check` 退出 0。
- 独立探针 `.tmp/r76-tester-a1.ts`（自写，不复用 impl 夹具；StarterKit 真 schema + 手写 getHTML 形状）**9/9**：多标题整串逐字符相等（`<h1 id="sl-toc-0">一</h1><nav …>…</nav><h2 id="sl-toc-1">`）；无标题 null；无标记 null 且不加 id；`\[TOC\]` 原文 null 留字面；blockquote 内 h2 不计入（顶层标题数≠条目数时整串原样返回）；`<b>`/`&` → `&lt;b&gt;&amp;`；代码块内 `[TOC]` 不动；双标记双 nav；`buildHtmlDocument` 端到端含 `nav.sl-toc` 样式、无字面 `[TOC]`、无 `<script>`。
- 静态：无 `src/lib/exportDom.ts`；App 无 `from './lib/export`（0 命中），仍 `await import`（`App.tsx:4790`）；`buildExportToc(editor.state.doc, originalText)` 在 `App.tsx:4823`。
- UNVERIFIED：真实导出的锚点跳转与外观（脚本未跑）。

## A2（B-122）暖纸 Mermaid 暖色
- 新增 5 条（`mermaidLazy.test.ts` 14 → 19）全绿。
- 独立探针 `.tmp/r76-tester-a2.ts` **11/11**：`resolveMermaidTheme('sepia',false/true)` 均 `'sepia'`，dark/light/system 口径不变；`mermaidConfig('default'/'dark')` 只有 `theme`；sepia = `theme:'base'` + 11 项**非空**且逐项等于 `BUILTIN_THEMES`；假 loader 收到 `{startOnLoad:false, securityLevel:'strict', theme:'base', themeVariables, suppressErrorRendering:true}`；同主题第二张图 0 次重 init、同代码命中缓存；切回 default 重 init、无 themeVariables、缓存按主题分开；不传主题走 default。
- 对比度（自写 WCAG，`.tmp/r76-tester-contrast.mjs`）：文字/节点 **11.83**、文字/画布 **10.77**、描边/填充 **1.81**、线/画布 5.27。
- 静态：`sepia` 在 `mermaidLazy.ts` 改前 0 命中（HEAD）→ 现 10 行；`Select-String node_modules\mermaid\dist\chunks\mermaid.core\*.mjs primaryBorderColor` = **40**（≥1）。
- UNVERIFIED：真机 SVG 颜色与截图（CDP 不可用）。

## A3（B-111）差距表补导出格式
- `node .tmp/r58-docs-check.mjs`（`.tmp/r76-tester-docs-check.log`）：`headHave 39 / haveCount 39 / headMiss 6 / missCount 6 / missRowSum 6`，子节 2/1/1/2 全部 declared=actual。改前 HEAD：`缺的（5）`、子节 2/1/2、5 行。
- `git grep -nE '缺 5 项|5 项缺' -- README.md AGENTS.md` **0 命中 exit 1**（改前 HEAD 2 命中：README:102、AGENTS:74）；`缺 6 项|6 项缺` **2 命中**。
- 改动面：`docs/typora-gap.md:30` 导出补 4 种差距、`:49` TOC 单元格、`:66-70` 新增 `### 导出（1）`、`:51` 表头 `（6）`；A1 只动 `:49` 文案，A3 计数在 A1 之后跑。

## 回归与残留
- 全量单测即回归（43 文件 0 fail）；浏览器回归脚本（keyboard/tree/theme）需 CDP，本轮 **UNVERIFIED**。
- 观察（非 FAIL）：切主题若与 mermaid 首次下载同帧，`ensureMermaid(theme)` 走 `loading` 分支不重 configure，旧主题 SVG 可能写进新主题缓存键；改前同类竞态已存在（旧码在加载完成时现取主题），影响仅一次颜色错配、重切主题自愈。
- STATE/BRIEF 的体积与条数段落交批末 scribe；本轮只给 STATE 轮次表加行。
