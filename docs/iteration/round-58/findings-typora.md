# 第 58 轮 Typora 对照侦察（finder-typora）

HEAD `25146504`；dev 5175；CDP 9223。日志 `.tmp/r58-typora-{a,b,c,d}.log`、`.tmp/r58-docs-check.log`。截图 `shots/round-58/typora-toc-emoji-img.png`、`shots/round-58/typora-quote-source.png`。

## 差距表复核

`node .tmp/r58-docs-check.mjs`：表头「已经有的（36）」= 36 行；「缺的（6）」= 5 个子节 1/1/1/1/2 = 6 行，与 B-106/102/103/104/107 + 主题一致，**计数不过期**。唯一微旧：`docs/typora-gap.md:85-86`「建议的下一批」第 2 条仍写「自定义主题」，B-105 第 55 轮已 fixed。

## F1（P1，编辑/智能标点）智能标点先于输入规则，改坏链接/图片语法与行内 HTML 属性里的直引号

- 敲 `[乙](https://example.com "标题")` → 编辑视图 `[乙](https://example.com “标题”)`；源码模式序列化为 `\[乙\](https://example.com “标题”)`（`.tmp/r58-typora-d.log`）。链接没建成（`a` 节点 0，`.tmp/r58-typora-c.log`），方括号还被转义。
- 敲 `<img src="assets/a.png" width="300">` → `src=”assets/a.png” width=”300”`（`.tmp/r58-typora-a.log`）。从文件加载的同一行保持直引号：只有敲入路径坏。
- 代码里的 `"代码"` 没被改，说明第 47 轮守卫只覆盖代码。根因 `src/lib/smartTyping.ts:18`、`:70-71`；`src/App.tsx:880` 注释确认 `handleTextInput` 先于 inputRules。
- 影响：作者按 Typora 习惯写带标题的链接/图片，落盘前源码已被改写；将来加链接/图片输入规则也永远匹配不到直引号。
- 改法：目标区（`](` 到行尾/右括号）与 `<tag …>` 内不转换，复用「代码内不转换」的守卫；补单测，关态不变。

## F2（P2，图片 → B-103）缩放先要定写回形态；敲入图片语法不建节点

- 敲 `![](assets/a.png)` 后 `img` 节点 0 个、文字仍是字面（`.tmp/r58-typora-b.log`）。仓库没有链接/图片输入规则：`grep InputRule` 只命中 `src/lib/mathInput.ts`、`src/lib/taskListInput.ts`；`src/App.tsx:854` 只换掉 TaskItem 的规则。
- 拖入含 `![图一](assets/a.png)` 的 md：`img` 带 `data-asset-missing` 与 `title=图片未找到：assets/a.png`，与差距表的占位一致。
- 同文档 `<img src="assets/a.png" width="300">` 显示字面标签；白名单只有 4 个标签（`src/lib/inlineHtmlTags.ts:8`），无 `img`。点图片后 `[class*=resize]`=0。
- 决策点：写回 `width` 属性就要把 `img` 加进白名单（动第 47 轮的白名单与往返断言）；用 CSS 类则 markdown 无对应语法。

## F3（P2，TOC / emoji → B-106）仍是字面；缺锚点基础；emoji 全表撞首屏预算

- `[toc]` 回车后仍是段落文字，无 `.toc`；`:smile:` 原样，无 `.emoji`（`.tmp/r58-typora-a.log`）。
- 同文档 h1/h2 的 `id` 都是 `null`：TOC 要能点先要 heading id 与中文 slug（`src/lib/` 内 `headingId|slug` 0 命中）。
- Typora emoji 全表 50,393 B（`.tmp/typora-ref/resources/appsrc/editor/EmojiSearchMap.js`）；首屏余量 310,000 − 297,823 = 12,177 B，全表必须惰性 chunk 或只做常用子集。
- 建议：TOC 单做（heading 列表生成 DOM + id，不加依赖），emoji 另起一轮。

## F4（P2，侧栏 / 搜索 / 快捷键 → B-102 / B-104 / B-107）现状证据与一个实现陷阱

- 侧栏 `[role=tab]` 只 2 个：文件（`aria-controls=sidebar-files`）、大纲；无列表形态容器（`.tmp/r58-typora-a.log`）。
- `Ctrl+Shift+F` 后无对话框、无查找条（同 log）。
- 快捷键一览实测 28 行，全静态 `<kbd>`，无 input/select/自定义入口（`.tmp/r58-typora-b.log`）。
- 键位写死在 `src/App.tsx:3909` 起的 if 链；`:3914-3924` 的 `productCombo` 与派发分支是两份清单，`:4007-4010` 靠它吞浏览器默认动作。新增键漏改 `productCombo`，对话框开着时默认动作就漏网。
- 建议：自定义快捷键先抽 keymap 表（键位 → 命令 id + 展示名），同一份表喂 `productCombo`、派发、一览三处。
