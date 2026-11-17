# 第 58 轮 executor 实现报告

startSha `25146504`；未 commit/push、未动 `release/`、版本号。

| 任务 | 状态 | 说明 |
| :--- | :--- | :--- |
| A1 智能标点不改链接目标 / 行内 HTML 标签里的引号（B-123） | DONE | 代码 + 单测 + E2E + BACKLOG |
| A2 TOC MVP（B-106） | DONE | `[TOC]` 渲染 + 点击跳转 + 源码保真；emoji 未做 |

## A1

- `smartTyping.ts:47-56` `inLinkDestOrHtmlTag()`：`/(?:\]\([^)\n]*|<\/?[A-Za-z][^>\n]*)$/`，锚定行尾，未收尾的 `](…)` / `<tag …` 才命中。
- `smartInput()`（`:78-84`）在反引号守卫后整键放行；**关闭括号的 `skip` 留在守卫之前**，否则自动补的 `)` 会多打一个（见坑 2）。
- 单测 +6（共 23）：链接目标首/尾直引号、`<img src=` 与 `width=` 后引号为 null、反向 `甲 < 乙，我说`→`”`、加空格→`“”`（CJK 后产品语义是关闭引号，故拆两条证明守卫没误命中）、`)` 仍 skip、`don't`/行内代码/表格行不变。
- BACKLOG：P1 补 B-123（fixed）；Deferred 补 B-124（手打链接保存时 `\[乙\]` 转义，只丢语义）。

## A2

- `toc.ts`（新）：`hasTocMarker` / `isTocParagraph` / `tocParagraphPositions` / `tocEntries`（复用 `outline.ts:18`）。
- `tocRender.ts`（新）：`buildTocDecorations()` 纯函数 + `createToc()`；widget `side:-1`、key=`toc@${pos}-${标题签名}`（R3）；**没有目录时只在改动可能造出 `[TOC]` 时重建**，1 MB 逐键不扫全篇。
- `escapes.ts:26-52` `repairTocMarkers()`：整行还原 `\[toc\]`；原文出现 `\[TOC\]` 整篇不还原；围栏 / `$$` 段跳过；CRLF 行尾原样。
- `serializeDocument.ts:45-55` 抽出 `applyRepairs()`，保存链 `:68` 与 `App.tsx:1012` 草稿链共用。
- `App.tsx`：`jumpToRef`（`:557`）+ `tocExtension`（`:811-816`）+ 扩展表 `:873` + `jumpTo` 后 effect；`styles.css:801-861` `.sl-toc`（只用既有 token，三套主题自动跟随）。
- R2 取方案②：原文只有转义写法时不挂 widget。`package.json` test +2 条（`toc.test.ts`、`tocRender.test.ts`）；`escapes.test` +5、`serializeDocument.test` +2。
- 已知限制：原文同时有 `[TOC]` 与 `\[TOC\]` 时整篇不还原。B-106 已补证据。

## 门禁

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | 0 error |
| `npm test` | **39 个文件、495 条、0 fail**（改前 37/473；`.tmp/r58-a2-npm-test.log`） |
| `npm run verify` | PASS；首屏 gzip **298,647 B** / 余量 21,353 B（`.tmp/r58-a2-verify.log`） |
| `npm run roundtrip` | rich 6/8、source 8/8，与改前同（04/06 旧差异；`.tmp/r58-a2-roundtrip.log`） |

## E2E

- `.tmp/e2e-r58-a1-typo.mjs`：逐字符输入 `[乙](https://example.com "标题")`、`<img … width="300">`；编辑器与草稿都是直引号、无 U+201C/U+201D，草稿含 `"标题"` 与 `width="300"`；8/8 true、0 console error。
- `.tmp/e2e-r58-a2-toc.mjs`：三标题 + `[TOC]` → `.sl-toc` 3 条（1/2/3 级）、点第 2 条落 `H2 第一节`、草稿 `^[TOC]$` 且无 `\[TOC\]`；VFS 打开 `\[TOC\]` 文档不挂目录，非标记行改一字后 `Ctrl+S` 落盘 = 原文只做那处替换；9/9 true、0 error。
- 补充 `.tmp/r58-a2-toc-open.mjs`：文件打开的 `[TOC]` 文档挂目录，删标记后 widget 消失。

截图：`shots/round-58/toc-editor.png`。

## CHANGELOG 建议

- 新增：`[TOC]` 独占一段时在上方渲染可点击目录；保存写回 `[TOC]`，`\[TOC\]` 字节不变。
- 修复：链接目标与行内 HTML 标签里的直引号不再被智能标点改写。

## 新坑

1. TOC 修复快路径不能要求闭合 `]`：序列化写 `\[TOC\]`（`]` 前还有 `\`），`/\[toc\]/i` 恒不命中；用 `/\[toc/i`。
2. 链接目标守卫里「已配对关闭符越过」必须在守卫前，否则 `)` 多打一个。
3. 往 `package.json` test 串尾加条目：`workspace.test.ts"` 的 `"` 是 JSON 串收尾引号，插在它之后会写出非法 JSON；要插在引号前。另 `step.slice.content` 是 `Fragment` 不是 `Node`（TS2339），显式标注 `{ content: Fragment }`。
