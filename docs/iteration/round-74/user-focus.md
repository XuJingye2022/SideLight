# 用户焦点 3 条：结论、证据与修复（第 73–74 轮）

三条都已修完并独立验收。改动提交 `dec7c02`（A 轮）与 `fd16784`（B 轮）。

## 1 待办列表行距过大、复选框与文字不同行 —— 已修（B-154）

- 量测（`.tmp/r73-a1.json` 改前 / `.tmp/r73-a1-after.json`、`.tmp/r74-tester-e2e.json` 改后）：`li` 高 **50.14 → 33.14 px**；连行距 **53.19 → 36.18/36.19**；`li > div > p` 下外边距 **17 → 0**；复选框中心 − 首行文字中心 **7.5 → 0.06/0.07 px**（复选框仍 14×14）。
- 根因：`li{display:flex}` 挡住行内 `p` 的 1em 下外边距折叠；`li > label{margin-top:7px}` 又按错误基线补偏移。
- 修复：`src/styles.css` 加 `ul[data-type="taskList"] li > div > p{margin:0}` 与 `li > label{display:flex;align-items:center;height:1.95em}`（用户给的 `1029-1055` 是改前行号，改后 `1046-1078`）。只挂任务列表，普通列表 `li > p` 不变。
- 截图：`shots/round-73/tasklist-fixed.png`（600×185）、`shots/round-73/tasklist-row.png`、`shots/round-74/tasklist-row.png`。回归：勾选后 `Ctrl+S` 写回 `- [x] 甲` / `- [ ] 乙` / `- [x] 丙`；End→Enter 续项 +1、`Ctrl+Z`×2 回 3 项（`round-74/findings-delta.md` §1）。

## 2 Typora 的 `==高亮==` 与 `$$…$$` 机制 —— 调研成文 + 等价实现

- 解析（`frame.js` 偏移，摘录 `.tmp/r73-typora-extract{,-2}.txt`）：高亮 @779864 是 `md-pair-s` 里 `.md-meta.md-before/after` 两段 **DOM 文本**夹 `<mark>`；行内公式 @785623/@785945 的 `.md-before/after` 放 `$`，容器另存 `<script type="math/tex">原 TeX</script>`；块级 @40246-40866 的 `mathjax-block.md-rawblock` 内容是 `$$<br/>原文<br/>$$`。`page-dist` 是设置/欢迎页，编辑器标记 0 命中。
- 渲染：一份 DOM 两层内容，光标驱动类切换——@106916 找 `closest('.md-inline-math.md-expand')`，@107068 点成品清 `.md-expand` 再加类，@117935 块级加类、@116913 失焦清除。`.md-meta` 显隐由主题 CSS 管；参考目录 54 个 CSS 无 `md-meta` → 该选择器 **UNVERIFIED**。
- 源码保真：落盘/导出从模型原文重建——@555669 把 `.mathjax-block` 改回 `$$…$$` 并用 `getNode(cid).get('text')` 填原文；@554192 清理时先删 `.md-meta, .md-content`。
- 对照：本仓库 `==` 是 Mark（`src/lib/inlineSyntax.ts:44-51`，定界符不进 doc/DOM），公式是 atom + `data-latex`，两者都缺「源码那一份」。
- 方案：① 已做（第 73 轮）`src/lib/mathReveal.ts` + `Decoration.node`，`::after` 出 `$…$` / `$$…$$`，选中即露、字节不变；② 已做（第 74 轮）`==` 复用同一工厂（`collectEqRanges` 合并 mark 相邻区间 + `Decoration.inline` + `::before/::after`）；③ **不做** Typora 式「真源文进 doc」（要改 schema、序列化、IME、撤销与粘贴，和逐字节 roundtrip 冲突）；预览/导出不改。
- 成文：`docs/iteration/round-73/typora-mechanism.md`（1,966 B）；`docs/typora-gap.md` 两条同步。

## 3 方向键移入时 TOC 与公式的标记不露出 —— 已修（B-155/B-156）

- 根因：`src/lib/tocRender.ts` 只在 `docChanged` 时重建，`is-revealed` 等不到「只移选区」的事务；公式是 atom，`Decoration.node` 只挂 NodeView 外层（`mathReveal.ts:97-101`），而 NodeView 带 `contenteditable=false`，纯 `→` 会跳过它。
- 修复：`revealedIndex(doc,sources,from,to)` 在 `!docChanged` 时也算露出集合（变了才 `composeSet`，`tocRender.ts:286-299`），相邻判据在 `:88-107`（光标在前一块末尾或后一块开头也算，depth 0 只认贴边）。
- 证据（`round-74/test.md` §用户焦点 3）：TOC 载入 **1 / revealed 0 / 高 0** → 点尾段仍 0 → **↑×1** 进正文甲 → **1 / 33.14** → **↑×2** anchor 落进 `.toc-source`（offset 5，可编辑）→ ↓×3 → **0/0**；行内 `$\alpha$` Home 后第 4 次 `→` → `.sl-math-reveal` **1**、`::after`=`"$\alpha$"`、KaTeX `none`，再 `→` → **0**；块级 `$$\beta$$` 下一段 ↑ → **1**、`::after`=`"$$\beta$$"`、内层 `none`，再 ↑ → **0**。
- 保存回路：露出过与从未露出的两次会话、同一处改动，假 FSA 读回**逐字节相同**，无 `sl-math-reveal` / `sl-eq-revealed` 泄漏。
- 回归点：`mathReveal.test.ts` 9 条（区间收集、贴边、**同 doc 换选区 10 次同一 `DecorationSet`**、非公式编辑只映射、插入才重扫、`==` 区间合并）；`tocRender.test.ts` 11 条（`withToc('一')`→0、隔一块→−1、下一块首/末→0、段内→0、resync）；收口 `.tmp/e2e-r74-b3-reveal.mjs` → `.tmp/r74-b3-reveal.json`（`allPass:true`、0 pageerror）。
- 已知边界：1 MB「移选区 20 次」实测比基线慢 216 ms（夹具无公式/无 `==`，插件走「露出集合不变 → 返回上一 state」快路径，无机制证据，只记数值）；纯 `→` 跳过公式 atom，要 `Shift+→` 或方向键成 `NodeSelection`；`==` 定界符是伪元素，不能在成品上直接编辑（改公式仍用点开或 `Ctrl+M`）。
