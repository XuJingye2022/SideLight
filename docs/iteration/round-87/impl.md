# 第 87 轮 A 批实施（B-103 图片缩放）

A1/A2/A3 done（A3 条件成立）。门禁全绿，未 commit。

## A1 宽度写回 + 解析放行

- 新增 `src/lib/imageWidth.ts`：`clampImageWidth`（`Number()` 后判整数、夹 40–2000）、`imageWidthFromDrag`、`imageHtmlOf`（规范形 `<img src alt[ title] width>`；值含 `"<>&`/换行 → null）、`imageMarkdownOf`（null 退回图片 markdown，P2-2）、`parseImageHtml`（严格全行）、`isImageHtmlLine`（剥 `^(?:[ \t]*>[ \t]*)*[ \t]*` 与行尾空白，含 P2-1 的 `>   `）。
- `assetImage.ts` 加 `renderMarkdown`；`inlineHtmlTags.ts` 的 `escapeInlineHtml` 加 `wholeLine` 整行放行（先于占位符）；`html.ts` 的 `escapeHtmlForParse` 改闭包按行首/行尾传标志。`package.json` test 链尾挂测试。
- 证据：`imageWidth.test.ts` **24/24 exit 0**（`.tmp/r87-a1-imageWidth-test.log`）；`git grep -c renderMarkdown -- src/lib/assetImage.ts` 0→1；`git grep -c isImageHtmlLine -- src/lib` 0→2 行（新文件未跟踪，commit 后 2 文件）。

## A2 拖拽改宽

- `assetImage.ts`：NodeView 外层 `div.sl-image`（img + `span.sl-image-handle`），原解析/订阅/缺图逻辑搬入；`selectNode`/`deselectNode` 切 `is-selected`；pointerdown `preventDefault`+`stopPropagation` 记起点与渲染宽，pointermove 只改 `img.style.width`，pointerup 才 `tr.setNodeMarkup(pos, …, width)`（`getPos()` 取位置，不夺光标）；400 ms 内二次 pointerdown 或 dblclick → `width:null`；destroy 清监听。
- `styles.css`：`.sl-image`（inline-block/relative/line-height:0）、`.sl-image > img`（block、max-width:100%）、`.sl-image-handle`（12×12、`nwse-resize`、`z-index:2`、默认 `opacity:0`，`:hover`/`.is-selected` 显形）。
- 真机 ego CDP 54280：`.tmp/e2e-r87-a2-image-width.mjs` **22/22 PASS**、0 错误（`.tmp/r87-a2-image-width.json`）：拖 +80 → width 482、规范形行、另一张仍 `![](…)`；重开 482、差 0 px、再存逐字节同；双击手柄后 width 消失且保存等于原文；嵌套 2 空格与 `> ` 两行规范形、重开 320/200、再存稳定；几何 242/242；老文档四形 0 节点且字节不变。截图 `shots/round-87/a2-image-width.png`、`a2-nested.png`。

## A3 文档计数（条件成立）

- `docs/typora-gap.md`：已有 39→**40**，在「工作区相对路径图片显示」后插「图片缩放」行；缺 6→**5**、删 `### 内容能力（1）`；「建议的下一批」删第 3 条。`README.md:102`、`AGENTS.md:74` 39/6→40/5；`BACKLOG.md` B-103 `open`→`fixed`。
- 证据：`node .tmp/r58-docs-check.mjs` → 40=haveCount、5=missCount、missRowSum **5**、子节 **2/1/2** declared=actual（`.tmp/r87-a3-docs-check.log`）；`'当前已有 39 项，缺 6 项' README.md` 1→**0**、新句 1；`'39 项有、6 项缺' AGENTS.md` 1→0、新句 1；`'| B-103 | open'` 1→0（`fixed` 1）；`'^3\. 图片缩放'` 1→0。

## 门禁

`npx tsc --noEmit` exit 0；`npm test` **52 文件 683 条 0 fail**（基线 51/659）；`npm run verify` PASS，首屏 gzip **307,292 B**（改前 306,276）；`npm run roundtrip` rich 7/9、source 9/9、firstSaveBlocked 1/9。日志 `.tmp/r87-a1-npm-test.log`、`.tmp/r87-a1-first-screen.log`。

## 残余与新踩坑

1. 残余：顶层 1–3 空格缩进的规范形行会成图片节点，保存时缩进被去掉；行内 `<img>`、HTML 导出与预览不缩；`README.md:231` 仍列 B-103，留批末 scribe。
2. 本机 `Test-NetConnection`/`netstat` 看不到 5175 监听，但 `fetch('http://localhost:5175/')` 返 200：判 dev server 死活只信 HTTP。
3. tiptap 的 `addNodeView()` 回调**不传 `updateAttributes`**；写节点属性用 `getPos()` + `tr.setNodeMarkup`。
4. `git grep` 不搜未跟踪文件：新文件静态门 commit 前只算旧文件命中，commit 后按文件数复核。

## CHANGELOG

`- 图片缩放（B-103，第 87 轮）：右下角拖手柄改宽度 40–2000 px（双击复原），保存写 <img … width> 行、往返逐字节稳定；没改宽度的图仍写 ![](…)。`
