# 第 87 轮计划：B-103 图片缩放（revision 1）

> revision 1：按 `plan-review.md` 的 H1–H6 修订；任务仍 A1/A2/A3，范围不扩、无砍除。

## 0 口径
- 只做 **B-103**（B-106/B-107 不碰）；报告 `docs/iteration/round-87/`，startSha `3920617`。
- 真机 dev `:5175` / ego CDP 54280；连不上交单测/静态记 UNVERIFIED，不重试。
- 门禁 `npm run verify` / `test` / `roundtrip`；不 push、不改 `release/`、版本 0.32.1。

## 1 已核实（`.tmp/r87-planner-probe.mjs`、`.tmp/r87-planner-rev-probe{,2,3,4}.mjs`）
1. image 有 `width` 且 `paintAttributes`（`assetImage.ts:10-14`）会上屏，但 `renderMarkdown` 只写 `![alt](src "title")` → 宽度丢失。
2. 独占一行 `<img …>` 给 marked `html` 块 token（`parseHTMLToken` 要 `window.DOMParser`：Node 退字面、浏览器成节点，R1）；序列化形态覆盖列表 2 空格、二级列表 4 空格、`> `、`> > `。
3. `escapeHtmlForParse`（`html.ts:119`）转义标签形 `<`，白名单只 kbd/mark/sub/sup → `<img …>` 今天全字面（探针 4 含嵌套两形）；差距表 `docs/typora-gap.md:64`。探针 4 另实测 `start` 是绝对行首，故「整行」判得出来。

## 2 写回形态（定案）
- 规范形（独占一行）：`<img src="SRC" alt="ALT"[ title="TITLE"] width="W">`，src→alt→title→width、无 `/>`；无宽度仍 `![alt](src "title")`，老文档字节不变。
- 四值匹配 `^[^"<>&]*$`；width 先 `Number()` 再判整数 40–2000（H6：值是字符串 `'320'`）；不写 height。
- 放行（H1+H2）：`isImageHtmlLine` 剥 `^[ \t]*(?:> ?)*` 与行尾空白后须与规范形逐字符同构；`escapeInlineHtml` 只在**整行**放行（可选 `start`/`text`；`escapeHtmlForParse` 传闭包）。
- 负向一律转义：无 width、单引号、`/>`、顺序不同、多属性。
- 残余（写 `impl.md`）：顶层 4 空格缩进代码块里恰好整行规范形会被当图片，与现有 `<kbd>` 同类；不扩白名单。

## 3 任务
### A1 宽度写回 + 解析放行（B-103）
files：`src/lib/imageWidth.ts`（新）、`imageWidth.test.ts`（新）、`assetImage.ts`、`inlineHtmlTags.ts`、`html.ts`、`package.json`（test 链尾）
steps：`imageHtmlOf(attrs)`（不合规 null）、`parseImageHtml(line)`（严格全行）、`isImageHtmlLine(segment)`、`clampImageWidth(string|number)`（非整数/NaN null，夹 40–2000）、`imageWidthFromDrag(string|number, dx)`（H4）；`escapeInlineHtml` 加整行放行（先于占位符）；`ResolvingImage` 加 `renderMarkdown`。
验收：
1. `node --experimental-strip-types src/lib/imageWidth.test.ts` exit 0，**≥14 条**：合规/不合规值；顺序/`/>`/单引号/无 width/多属性五负向；`'320'` 可写；`clamp('320')`、上下界、非整数；`imageWidthFromDrag('320',80)`/`('1990',80)` 得 400/2000；`manager.serialize` 有宽度出 HTML 行、无宽度仍 `![a](assets/a.png)`；`escapeHtmlForParse` 正向（顶层/`  ` 列表/4 空格二级/`> `/`> > `）原样、负向（`前文<img …>`、`` `x` <img …> ``、H2 四形）全转义。
2. 静态：`git grep -c renderMarkdown -- src/lib/assetImage.ts` **0→1**；`git grep -c isImageHtmlLine -- src/lib` **0→≥2**。
3. `npm test` 0 fail（51 文件 659 条 → **52 文件** ≥673）；`npm run verify` gzip **≤310,000 B**（记值）；`npm run roundtrip` 不退化。

### A2 拖拽改宽
files：`assetImage.ts`、`src/styles.css`
steps：NodeView 外层 `.sl-image`（`display:inline-block;line-height:0;position:relative`，H5）+ img；`selectNode`/`deselectNode` 显隐 `.sl-image-handle`；pointerdown 记起点与渲染宽、pointermove 只改样式、pointerup 才 `updateAttributes({width: String(imageWidthFromDrag(startWidth, dx))})`；双击手柄 `width:null`；手柄 `preventDefault`+`stopPropagation`（R2）。
验收（ego 54280；连不上记 UNVERIFIED）：
1. 点图 → handle 恰 1；拖 +80px → `img[width]` 出现、值 ∈[40,2000]；`Ctrl+S` 该行匹配 `^<img src="assets/a\.png" alt="[^"]*" width="\d+">$`；另一张没拖的图仍 `![…](…)`。
2. 重开 → `img[width]`=保存值、宽差 ≤1px；再 `Ctrl+S` 逐字节同。
3. 双击手柄 → `img[width]` 消失、回 `![](…)` 且逐字节等于改前原文；0 页面错误。
4. 嵌套（H1）：列表项内、引用内各一张带宽度图 → `Ctrl+S` 两行都规范形（带 2 空格 / `> `）→ 重开仍是图片节点、`img[width]` 在、再存逐字节稳定。
5. 几何（H5）：`.sl-image` 高 = img 高 ±1px。
6. 老文档（H2）：无 width/单引号/`/>`/顺序不同四行 → 打开仍字面 → `Ctrl+S` 逐字节不变。

### A3 文档计数（H3 条件门）
**A2 代码未落地（回滚/超时）→ 不动差距表与计数**，只更新 BACKLOG 证据（保持 39/6）。A2 落地但真机 UNVERIFIED 可记 `fixed` 并标 UNVERIFIED（同 B-158/B-159）。
files：`typora-gap.md`、`README.md:102`、`AGENTS.md:74`、`BACKLOG.md`
steps（条件成立）：缺表删「内容能力（1）」与唯一行；已有表 `:37` 后插「图片缩放」；表头 39→40、6→5；`建议的下一批` 第 3 条删；README/AGENTS 39/6→40/5；B-103 `open`→`fixed`。CHANGELOG/STATE 留批末。
验收（成立）：`node .tmp/r58-docs-check.mjs` → `headHave=40=haveCount`、`headMiss=5=missCount`、`sub` 2/1/2 declared=actual、`missRowSum=5`；`git grep '当前已有 39 项，缺 6 项' README.md` **1→0** 且新句 1；`git grep '39 项有、6 项缺' AGENTS.md` **1→0**；`git grep '| B-103 | open' BACKLOG.md` **1→0**；`建议的下一批` 内「图片缩放」**1→0**。不成立：四条 grep 保持不变，B-103 记 `deferred`。

## 4 风险
- **R1（最大）** 真机若走字面回退，A2 第 2/4 条必红 → B 案：`hoistImageWidth(markdown)` 在 `setMarkdown`（`App.tsx:1216`）parse 前把整行 HTML 换 `![alt](src)`、parse 后按第 i 个图片节点回填 width（纯 node 可测）。A/B 二选一，依据写 `impl.md`；A1 单测不依赖 DOM。
- R2 手柄抢事件：见 A2 steps。
- R3 体积余 3,724 B：新增 <1.5 KB gzip；超 310,000 B 先砍手柄提示文案。
- R4 回滚：`git checkout` 五文件（`assetImage.ts`/`imageWidth.ts`/`inlineHtmlTags.ts`/`html.ts`/`styles.css`）；A1/A2 分开落地，A2 回滚不动 A1。
- R5 见 §2 残余。

## 5 不做
- alt/title 编辑、百分比宽度、Typora `style="zoom"`；不改 height、不动行内 `<img>`、不加依赖。
