# 第 87 轮计划审查复审（critic，revision 1）

判定：**PASS**（首轮 H1–H6 全部落地，无新 P0/P1；5 条 P2 执行时带上）。只审 A 批 B-103 的 `plan.md`（6,493 B）；B-106/B-107 的本轮计划未见，未审。

## 1 复核方法（只读，证据 `.tmp/r87-critic-rev.log`）
- 重跑 planner 探针 `r87-planner-rev-probe{.mjs,2.mjs,3.mjs,4.ts}`：序列化形态、marked token、`mapOutsideCode` 的 segment/start。
- 静态核 `src/lib/codeScan.ts:41,72`、`src/lib/inlineHtmlTags.ts:23`、`src/lib/html.ts:119-121`、`node_modules/@tiptap/extension-image/dist/index.js:28-39`（`width` 已声明、`parseHTML: img[src]`）。
- 基线：`r58-docs-check.mjs` → 39/39/6/6、子节 2/1/1/2；README:102 / AGENTS:74 / BACKLOG:69 三处文字各 1 命中；HEAD `3920617`，工作区只有 `round-87/` 未跟踪。
- `r87-critic-probe.mjs` 复跑：自定义 `renderMarkdown` 的 `<img …>` 原样进 serialize（plain 仍 `![a](…)`）；独占一行给 `html` block token。

## 2 首轮漏洞逐条核对（全修）
- **H1 修好**：`mapOutsideCode` 每行回调给整行 segment，探针 4 实测列表 `  <img>`、引用 `> <img>` 的 `start` 都在行首（行内代码后的 ` <img>` 不是）；加可选 `start/text` 判行首后只放行整行 → 两种嵌套都能建成图片节点；A1 正向 + A2 验收 4 覆盖。剩一形见 P2-1。
- **H2 修好**：A1 五负向（无 width / 单引号 / `/>` / 顺序 / 多属性）+ A2 验收 6 老文档四形「打开仍字面 → `Ctrl+S` 逐字节不变」；正向只认与规范形逐字符同构（§2）。
- **H3 修好**：A3 条件门（`plan.md:43`）：A2 未落地不动差距表与计数，只更新 BACKLOG。
- **H4 修好**：`imageWidthFromDrag(string|number, dx)` 进 `imageWidth.ts`（40–2000 夹取），A1 断言 `('320',80)`→400、`('1990',80)`→2000。
- **H5 修好**：`.sl-image{display:inline-block;line-height:0;position:relative}` + A2 验收 5「高差 ±1px」。
- **H6 修好**：`clampImageWidth(string|number)` 先 `Number()` 再判整数，单测含 `'320'`。

## 3 新发现（5 条 P2，执行时带上）
- **P2-1 引用内的列表仍退字面**：该行序列化成 `>   <img …>`（`> ` + 列表 2 空格，探针 1 `listInQuote` 实测），计划正则 `^[ \t]*(?:> ?)*` 只吃掉 `> `、剩 2 空格 → 不匹配规范形 → 转义成字面。改为逐个剥 `^(?:[ \t]*>[ \t]*)*[ \t]*`；A1 正向加一形、A2 验收 4 加「引用内列表」。不丢字节（`repairHtml` 还原），只显示退化。
- **P2-2 回退口径要写死**：`imageHtmlOf` 为 null（无 width、alt/src 带 `"`）时必须退回 `![alt](src "title")`，不能写空串；A1 补「alt 带引号 → 仍出图片 markdown，宽度丢、图不丢」。
- **P2-3 A3 不成立分支自相矛盾**（`plan.md:46`）：一处要求 `| B-103 | open` 1→0，同句又说「四条 grep 保持不变、B-103 记 deferred」。改成三条不变 + `| B-103 |` 仍 1（open/deferred 均可）。
- **P2-4 拖拽接线缺口径**：`.sl-image-handle` 的尺寸/定位/光标未写；pointermove 只挂手柄上时拖出 8 px 就断。写明 window 监听或 `setPointerCapture`，手柄 ≥8×8、`cursor:nwse-resize`、`z-index` 高于 img，A2 验收 1 按手柄中心点。
- **P2-5 §2 残余写反**：4 空格缩进被 marked 当 `code`（探针 2 `indent2`），不会成图片；真正会改字节的是顶层 1–3 空格缩进的规范形行（保存去缩进）。改写残余，或在 impl.md 记这条已知改写。

## 4 其它
- 红线：无新依赖、不换内核、不改 `release/`、版本仍 0.32.1；体积余 3,724 B，新增 <1.5 KB gzip 的估计合理。
- R1（浏览器字面回退 → B 案）仍是最贵分支；按首审结论（`img[src]` 走 schema 解析）判低概率，不必预做 B 案。
- 时间：A1+A2+A3 在 25 分钟内偏紧；A1 落地先跑单测，A2 真机先验 #2/#4，修不完按 R4 回滚 A2、A1 保留、A3 走不成立分支。
