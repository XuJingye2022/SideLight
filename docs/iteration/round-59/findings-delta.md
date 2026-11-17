# 第 59 轮轮间回归检查（finder-delta）

判定：**无新回归**。只查第 58 轮 diff 触及面：`smartTyping.ts`、`escapes.ts`、`serializeDocument.ts`、`toc.ts`/`tocRender.ts`、`App.tsx`、`styles.css`。

## 路径（CDP 9226，每条前 `node .tmp/reset.mjs 9226`）

1. 表格 + `$$` 公式 + 链接标题 + `<kbd>` + `[TOC]` 同文档，改一字后 `Ctrl+S`；同脚本做撤销/重做、td 输入、目录焦点 — `.tmp/e2e-r59-delta.mjs`
2. 公式渲染 + 段首/链接目标引号 — `.tmp/e2e-r59-delta2.mjs`
3. Mermaid — `.tmp/e2e-r59-delta6.mjs`；输出 `.tmp/r59-delta-e2e.log`

## 结果（全 true，无报错）

- **保存字节保真**：VFS 落盘与期望逐字节同；`| :--- | :--- |`、`$$…$$`、`(https://example.com "标题")`、`<kbd>Ctrl</kbd>`、行尾 `[TOC]` 全保留。`applyRepairs` 重构后 300 ms 草稿链同口径：含 `^[TOC]$`、无 `\[TOC\]`、表格与公式原样。
- **撤销/重做**：`Ctrl+Z` 回 `正文一`，`Ctrl+Shift+Z` 回 `正文一二`；`.sl-toc` 恒 1、表格 3 行不变（TOC 装饰不污染历史）。
- **表格单元格**：td 里打 `# 乙` 得 `1# 乙`，`td h1/h2/blockquote/ul` = 0（第 52 轮口径）。
- **焦点**：点目录后 `activeElement` 仍是 `.ProseMirror`（widget `mousedown` preventDefault 生效）。
- **键盘**：段首 `"` → `“甲”`；中文后 `"` → `”`（既有规则，`smartTyping.test.ts:10` 同口径）；`甲 -- 乙` → `—`、`...` → `…`；链接目标引号在正文与草稿里都是直引号。
- **公式**：`[data-type="block-math"] .katex` 1、`inline-math` 1。
- **Mermaid**：`graph TD; A[开始]-->B{判断}; B-->C[结果]` 与两行写法均 `is-ready`、`svg` 1。

## 非回归观察（不入 BACKLOG）

- `graph TD; A-->B;`（单条带分号）同 HEAD 出 `is-error` 兜底；换写法即正常，本轮未改 `mermaid*`，判上游解析严格度。
- `[TOC]` 段仍可见、目录只编辑视图渲染：第 58 轮已记限制。

## 结论

0 条新回归；BACKLOG 不改。
