# 问题 2：Typora 的 `==高亮==` 与公式机制

证据：`frame.js` 偏移（摘录 `.tmp/r73-typora-extract{,-2}.txt`）；`page-dist` 是设置/欢迎页，编辑器标记命中 0。

## 解析：定界符不丢
- 高亮 @779864：`md-pair-s` 内 `.md-meta.md-before/after` 两段文本夹 `<mark>`；`==` 就是 DOM 文本。
- 行内公式 @785623/785945：`.md-before/.md-after` 放 `$`，容器先放 `<script type="math/tex">原 TeX</script>`；MathJax 后换 SVG，脚本仍在。
- 块级公式 @40246-40866：`mathjax-block.md-rawblock`（`contenteditable=false`）放 MathJax DOM 或兜底 `$$<br/>原文<br/>$$`。

## 渲染：一份 DOM 两层内容，光标切类
- @106916 `cursorChange` 找 `closest('.md-inline-math.md-expand')`；@107068 点成品先清 `.md-expand` 再加类并选中 `<script>`；@117935 块级加 `.md-expand`，@116913 失焦清除。
- `.md-meta` 显隐由主题 CSS 管；参考目录 54 个 CSS 无 `md-meta` → 选择器 UNVERIFIED（由类切换推断）。

## 源码保真：落盘/导出从原文重建
- @555669 导出前把 `.mathjax-block` 改回 `$$<br/><span></span><br/>$$`，用 `getNode(cid).get('text')` 填原文；行内从 `<script>` 取回。@554192 清理时先删 `.md-meta, .md-content`。

## 对照与方案
- 本仓库 `==`：`inlineSyntax.ts:44-51` 的 Mark（`sl-eq`），定界符不进 doc/DOM；公式：atom + NodeView，原文只在 `data-latex`。两者都缺源码层。
- ①已做（第 73 轮 A3）：`mathReveal.ts` + `styles.css:2095-2117`，`::after` 出 `$…$` / `$$…$$`，选中即露、字节不变。
- ②已做（第 74 轮 B2）：同一工厂扫 `eqHighlight` 连续区间，`sl-eq-revealed` 的 `::before/::after` 出 `==`；设置关时 mark 0 → 空集。
- ③不做：Typora 式「真源文进 doc」要改 schema/序列化/IME/撤销/粘贴，与逐字节 roundtrip 冲突；预览/导出不改（Typora 导出也重建原文，本仓库序列化等价）。
