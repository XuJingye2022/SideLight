# 第 62 轮两轮计划（planner · revision 1）

- 起点 `12f36e4`；dev 5175、CDP 9222（E2E 前 `node .tmp/reset.mjs 9222`）；红线同 BRIEF。
- 本轮 open P1 **5 条**：B-115、B-120、B-132、B-133、B-135（B-120 按 F2 改判，A3 移入 P1 段）；其余 P2 不排，留 deferred。
- 修订：R1–R6（B 轮加 B-120；A1/A2 串行、先 A1，A3 并行；TOC 加固砍见末行）。
- 门禁：`npm test`+`npm run verify`；B1 只测不 build。

## A 轮（≤25 分钟）

### A1 软换行段落不再整段当 `[TOC]`（B-132；P1）
文件：`src/lib/toc.ts`、`src/lib/tocRender.ts`、`src/components/PreviewPane.tsx`、`src/lib/toc.test.ts`
做法：`toc.ts` 加 `isTocMarkerText`=`/^[ \t]*\[toc\][ \t]*$/i`（无 `m`）；`isTocParagraph` 用它，`hasTocMarker`（`im`）只留原文与粘贴片段；`tocRender.ts:168` 同改；`PreviewPane.tsx:29` 用同一判定，`find`→`filter(...).forEach`。
验收（`.tmp/r62-a1-toc.log`；bug-toc/-toc2，9222）：soft.md `toc-source` 0、可见两行文字、预览 nav 0 且字面 `[TOC]` 1；first.md `sourceCount 0`、含说明文字；lower.md 1 widget/1 nav；其余 6 种子 0；保存 soft.md 只差新增字（35 B）。单测 2 条（HEAD 红）：`isTocParagraph(para('a\n[TOC]\nb'))===false`、该 doc `tocParagraphPositions===[]`。

### A2 手打 `[TOC]` 立即生效（B-133；P1）
文件：`src/lib/toc.ts`、`src/lib/tocRender.ts`、`src/App.tsx:5586`、`src/lib/escapes.ts`、两个 TOC 测试
做法：`toc.ts` 加 `escapedTocLineCount`（`escapes.ts:14` 口径，`fenceMap` 跳围栏/`$$`，先 `/\\\[toc/i` 快判）与 `hasTocSource(doc, original)`=`sources>0 && tocEntries>0 && !(escaped>=sources)`；`tocRender.ts:131` 改用它，`App.tsx:5586` 改 `editor ? hasTocSource(editor.state.doc, rawTextRef.current) : false`。
边界：围栏/公式 `\[TOC\]` 不计；混合文档保存整篇转义、重开无目录——既有规则（`escapes.ts:30`），记报告。
验收（`.tmp/r62-a2-toc.log`）：复制 `e2e-r62-toc-typed.mjs` 为 `.tmp/e2e-r62-a2-toc-typed.mjs`，仿 bug-toc 的 fake workspace（原脚本无句柄），截图存 `shots/round-62/toc-after-typed.png`（勿覆盖旧图）。note.md 手打 `[TOC]`→nav 1、条目=顶层标题数、段高 0；`Ctrl+S` 该行 `^\[TOC\]$`；重开 nav 1；预览 nav 1。escaped.md 打开/预览 nav 0、保存字节不变。混合文档当场 nav 2、两行写 `\[TOC\]`、重开 nav 0（预期）。单测 3 条：转义 1→不挂、手打 1→挂、混合→挂。

### A3 代码块高亮入差距表 + 池子卫生（B-135 文档面；P1）
文件：`typora-gap.md`、`README.md:101`、`AGENTS.md:74`、`BACKLOG.md`
做法：缺表「编辑与格式」加「代码块高亮｜无｜P1｜需惰性 chunk、待批准」；（4）→（5）、（1）→（2）；`:49` TOC 行改「不带（B-134 实测，打印同实现）」；README/AGENTS 39/4→39/5。BACKLOG：核对 `:43`（revision 已改）；界面项 B-132→B-136；删 `:66` 行尾 `\| open | 导出…` 残留（B-131 止于 `| 61 |`）；B-120 行（锚「第 56 轮报告 F2 未入池」）移入 P1 段并补 `kb100.autoOps`。
验收：`node .tmp/r58-docs-check.mjs`→39/5、sub declared=actual、missRowSum 5；`git grep -nE '缺 4 项|4 项缺' -- README.md AGENTS.md` 0 命中 exit 1（改前 2；对照 `缺 5 项|5 项缺` 2）；主证据 `git grep -nEi '\b(highlight|prism|shiki|lowlight)\b' -- src package.json` 0 命中 exit 1；对照：宽口径 15（全 `eqHighlight`）、依赖 `[]` 而 `mermaid` 有；`.tmp/r62-a3-ids.mjs` 报 dup []。无代码门；B-135 实现不排（待人批准），记 deferred、不计门。

## B 轮（≤25 分钟；先 10 分钟 delta：`npm test`、`npm run verify`、A1/A2 两条 e2e）

### B1 1 MB 切源码基线（B-115；P1）
文件：默认不改代码；②只改 `src/App.tsx:5570-5575`。
夹具：A=`e2e-r53-a1.mjs` big（1,000,012 字符/44,446 块/7 轮，9,921/2,054 ms，按钮口径）；B=`e2e-r62-finder-115.mjs` mb1（1,048,661 B/368,771 字符/11,214 段/3 轮，308–962/371–579 ms，Ctrl+/）。
做法：复制脚本保旧证据。A→`.tmp/e2e-r62-b1-a.mjs`（输出 `.tmp/r62-b1-a.json`，加 `e2e-r62-finder-115-long.mjs:33-41` 的 `__rafGap`），跑 `node .tmp/e2e-r62-b1-a.mjs r62`；B→`.tmp/e2e-r62-b1-b.mjs`（端口 9222、输出 `.tmp/r62-b1-b.json`），`node .tmp/e2e-r62-b1-b.mjs 9222`；先 reset。
判据：A 进 p50 ≤1.2 s→①；其余（含 ≥5 s）→②。
①改 B-115 口径不改码：夹具=A big（见上），进 p50 ≤1.2 s、退 p50 ≤ max(0.8 s, 本轮 A 退 p50×1.25)、maxRafGap ≤ max(1.5 s, 本轮实测×1.2)，写进 BACKLOG B-115 证据列；B 只作参照。
②加 `wrap="off"`（`styles.css:1783-1796` 无 `white-space`，生效）后复测 A：进 p50 降 ≥50%、textarea 可编辑（切回富文本含新字）、`Ctrl+S` 落盘同源（对照 `textHash`）、横向滚动可用（`scrollWidth>clientWidth` 且 `scrollLeft` 可 >0）。任一不满足即回滚，写「只能换 `<pre>`/虚拟化」进 B-115；硬闸：B1 起 20 分钟未复测完即回滚写结论。

### B2 停笔不再先写整篇草稿（B-120；P1）
文件：`src/App.tsx:1044-1070`。做法：`:1069` 的 `800`→`2500` 并注释：2 s 自动保存先跑、成功走 `:2999-3003` 清计时器；被结构损失/模态挡住时 2.5 s 兜底。不动 `runAutoSave`/`Ctrl+S`。
验收（`.tmp/r62-b2.json`）：复制 `.tmp/e2e-r62-finder-code.mjs` 为 `e2e-r62-b2.mjs`（端口 9222），只跑 kb100 的 3.6 s autoSave 窗口+关自动保存档：①仅 1 次 write（`kb100.md`）、`.sidelight/drafts/` 0 写、无草稿 `createWritable`；②`saveOps` 仍 1 次 write、无整篇 `getFile`；③`autoSave:false` 时草稿仍写 1 次。改前 `kb100.autoOps`：36,028@6285+36,029@7190=72,057≈2 倍。

未排：P2 全部（B-121/B-126/B-106/B-134/B-136…）、TOC 加固（A1/A2 测试已覆盖，且超时）、B-135 实现（待批准）、发版。
