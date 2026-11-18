# 问题 2：Typora 的 `==高亮==` 与公式机制（tester 补写 B1）

证据：`frame.js` 偏移（摘录 `.tmp/r73-typora-extract{,-2}.txt`）；`page-dist` 是设置/欢迎页，编辑器标记命中 0。

## 解析：定界符不丢
- 高亮 @779864：`md-pair-s` 内 `.md-meta.md-before`/`.md-meta.md-after` 两个文本 span 夹 `<mark>`，`==` 就是 DOM 文本。
- 行内公式 @785623/785945：`.md-before/.md-after.md-meta` 放 `$`，容器先放 `<script type="math/tex">原 TeX</script>`；MathJax 渲染后换成 SVG，脚本仍在。
- 块级公式 @40246-40866：`mathjax-block.md-rawblock`（`contenteditable=false`）内放 MathJax DOM 或兜底 `$$<br/>转义原文<br/>$$`；原文是节点 `text`。

## 渲染：一份 DOM 两层内容，光标切类
- @106916 `cursorChange` 找 `closest('.md-inline-math.md-expand')`；@107068 点成品先清 `.md-expand`，再给当前元素加类并选中 `<script>`；@117935 块级 `addClass('md-expand')`，@116913 失焦清除。
- `.md-meta` 显隐由主题 CSS 管；参考目录 54 个 CSS 无 `md-meta` → 具体选择器 UNVERIFIED（由类切换推断）。

## 源码保真：落盘/导出从原文重建
- @555669：导出前 `.mathjax-block` 改回 `$$<br/><span></span><br/>$$` 再从 `getNode(cid).get('text')` 填原文；`.md-inline-math` 从 `<script>` 取回 TeX。@554192 清理时先删 `.md-meta, .md-content`。

## 对照与方案
- 本仓库 `==`：`src/lib/inlineSyntax.ts:44-51` 的 Mark（`sl-eq`），定界符不进 doc/DOM；公式：atom + NodeView，原文只在 `data-latex`。两者都缺源码层。
- ①已做（A3）：`src/lib/mathReveal.ts` + `styles.css:2095-2116`，`::after{content:'$' attr(data-latex) '$'}`，选中即露、字节不变，首屏 +773 B。
- ②下一步（B2）：同一工厂扫 `eqHighlight` 区间，`::before/::after` 出 `==`；设置关时 mark 0 → `DecorationSet.empty`。
- ③不推荐：Typora 式「真源文进 doc」要改 schema/序列化/IME/撤销/粘贴，和逐字节 roundtrip 冲突。
- 预览/打印不改：Typora 导出也重建原文，本仓库序列化等价。
