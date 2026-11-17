# 第 58 轮两轮计划（planner，revision 1）

rev1 已修 plan-review H1–H6；范围不变。startSha `2514650`；E2E 前 `node .tmp/reset.mjs 9222`；不 push、不改 `release/`、版本 0.32.1。

## A 轮（P1 先行）

### A1 智能标点不改写链接目标 / 行内 HTML 标签里的引号
- backlog：B-123（新 P1，BACKLOG 缺行，本任务补进 P1 表）
- 文件：`src/lib/smartTyping.ts`、`smartTyping.test.ts`、`docs/iteration/BACKLOG.md`
- 步骤：加 `inLinkDestOrHtmlTag(lineBefore)`：锚定正则 `<\/?[A-Za-z][^>\n]*$` 或 `\]\([^)\n]*$` 命中即在标签/链接目标内；`smartInput` 在 `hasUnclosedBacktick` 守卫后命中即 `return null`。单测：链接目标首/尾 `"`、`<img src=` 后 `"` 为 null；反向 `甲 < 乙，我说"` 仍配 `“”`；`don't`、行内代码、含 `|` 表格行不变。BACKLOG 补 B-123 行（证据 `.tmp/r58-typora-a.log`、`-d.log`、`findings-typora.md` F1）；`\[乙\]` 转义另记 P2。
- 验收：`npm test` 全绿（473+新增）；`.tmp/e2e-r58-a1-typo.mjs`（9222）逐字符输入 `[乙](https://example.com "标题")`、`<img src="assets/a.png" width="300">`，文本含直引号、无 U+201C/U+201D；序列化含 `"标题"` 与 `width="300"`。`\[` 转义（`@tiptap/markdown/dist/index.js:1100`）不算失败。门禁：`npm run verify`、`npm test`。

### A2 B-106 TOC MVP：`[TOC]` 渲染 + 点击跳转 + 源码保真
- backlog：B-106；文件：`src/lib/toc.ts`（新）、`toc.test.ts`（新）、`src/lib/tocRender.ts`（新）、`src/lib/escapes.ts`、`escapes.test.ts`、`src/lib/serializeDocument.ts`、`src/App.tsx`、`src/styles.css`、`package.json`
- 步骤：
  1. `escapes.ts` 加 `repairTocMarkers(markdown, original)`：小写 `includes('[toc]')` 快路径；原文 `\[TOC\]` 计数 > 0 整条不还原（第 49 轮实体口径）；按行切 + `fenceMap`（`risk.ts:36`）判围栏，`^\s*\\\[toc\\\]\s*$`（i）整行还原 `[TOC]`；行内代码、引用行、公式段不动。
  2. 抽 `applyRepairs(markdown, original)` 到 `serializeDocument.ts` 导出，`:54-56` 与 `App.tsx:1002-1004` 草稿链都调它（否则 drafts 仍写 `\[TOC\]`）。
  3. `toc.ts`：`isTocParagraph`（paragraph 且 trim 小写 = `[toc]`）、`tocEntries(doc)`（复用 `outline.ts:18`）。
  4. `tocRender.ts`：TOC 段落前 `Decoration.widget(pos, dom, { side: -1, key })`，渲染 `<nav class="sl-toc" aria-label="目录">` + `<button>`；`mousedown` 阻止默认，`click` 调 `onJump(entry)`；key 随文档变；不隐藏源段落。
  5. `App.tsx`：扩展列表（`:863-866`）加 Plugin，`onJump={jumpTo}`——`jumpTo(item: OutlineItem)` 不是 pos（`:4377`）；CSS 加 `.sl-toc` 与 focus 环。
  6. 单测：段落识别、条目顺序级别、`\[TOC\]` 修复、原文 `\[TOC\]` 打开→保存字节不变、围栏/行内代码不动、已是 `[TOC]` 不动。
- 验收：`npm test` 37 → 39 个文件（`test` 脚本补两条），条数报实测；`.tmp/e2e-r58-a2-toc.mjs`：三标题 + 空行 `[TOC]` → `.sl-toc` 条目 3；点第 2 条选区落在该标题；序列化含 `^[TOC]$` 不含 `\[TOC\]`；原文 `\[TOC\]` 打开→保存字节不变。
- 门禁：`npm run verify`、`npm test`、`npm run roundtrip`。超时砍法（定序）：① 砍 `.sl-toc-marker` chip 与三套 token CSS；② 改为断言选区所在标题文字。`escapes` 修复、`.sl-toc` 渲染、点击跳转不可砍。emoji 不排本轮（余量不足）。

## B 轮

### B1 B-104 全局搜索 MVP（工作区跨文件 `Ctrl+Shift+F`）
- backlog：B-104；文件：`src/lib/globalSearch.ts`（新）、`globalSearch.test.ts`（新）、`src/components/GlobalSearch.tsx`（新，懒加载）、`src/App.tsx`、`src/styles.css`、`src/components/ShortcutsDialog.tsx`、`package.json`
- 步骤：`searchWorkspace(docs: { path, text }[], query, limits)` 纯函数逐行返回 `{ path, line, column, snippet }`，限单文件 ≤1 MiB、≤200 文件、≤200 结果（超限带 `truncated`）；`collectDocs(files)` async 按 `flattenFiles`（`workspace.ts:356`）顺序 `readNode`（`:292`）并逐个 `catch` 跳过。`GlobalSearch.tsx`：`useDialogFocus`（`:1143` 同款）+ 回车搜索，结果行 `path:行号` + 片段；点结果 → `openWorkspaceFile(node)`（`:2479`）+ `setQuery` + `setFindOpen(true)`，关闭后焦点回正文。`App.tsx`：有工作区时 `Ctrl+Shift+F` 打开、`productCombo`（`:3914-3924`）同步；三态文案。
- 验收：`npm test` 37 → 39 个文件；`.tmp/e2e-r58-b1-search.mjs`（9222）按 `.tmp/e2e-r58-finder.mjs:31-150` 的 drop + 递归 `mkDir(tree)` 合成句柄（两层子目录、3 个 md）：注入 VFS → 树出 3 个文件；搜词 → 3 条、路径行号正确；点第 2 条 → 打开对应文件且查找条命中；Esc 关闭、焦点回正文；无工作区提示「先打开文件夹」。单测：行列号、200 条截断、>1 MiB 跳过、大小写。门禁：`npm run verify`、`npm test`。

### B2 B-102 文件列表形态侧栏（树 / 列表两态）
- backlog：B-102；文件：`src/components/FileTree.tsx`、`src/App.tsx`、`src/styles.css`
- 步骤：`FileTree` 头部（`:378-392`）加两态切换（树/列表，`aria-pressed`），状态放 App（会话内）；列表态用 `flattenFiles(workspace.root)` 渲染 `button` 行（相对 `path`，当前文件 `is-active`），点击走 `openWorkspaceFile`（`:2479`）。Tab 可达、`aria-label="文件列表"`、窄侧栏不溢出。
- 验收：`.tmp/e2e-r58-b2-flat.mjs` 复用 B1 的 `mkDir` 注入 VFS（两层 3 个 md）→ 切「列表」→ 3 行含相对路径 → 点第 2 个 → 标题与正文变化 → 切回「树」恢复 → 1000×620 无横向滚动。删 `.tmp/r58-ws` 一句（无此目录、reset 后无真实句柄）。
- 门禁：`npm run verify`、`npm test`。风险：列表态暂无右键删除/重命名，写成已知限制。

## 不进本轮计划
- B-115（P1）：`<textarea>` 原生排版 0.5–1.7 s，需换源码显示方式，25 分钟放不下；下一批首项。
- B-103/B-107 前置未定；P2 全 deferred：B-120、B-121、B-122、B-212、B-208。
