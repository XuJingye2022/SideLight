# 第 63 轮执行报告（executor）

起点 `d770cad`；未 commit/push、未改 `release/`、无新依赖。门禁全绿。

## B1 1 MB 切源码基线定案（B-115）DONE（结论：只能换 `<pre>` / 虚拟化）

- 夹具：`.tmp/e2e-r53-a1.mjs` → `.tmp/e2e-r62-b1-a.mjs`（输出 `.tmp/r62-b1-a.json`，加 `__rafGap`）；`.tmp/e2e-r62-finder-115.mjs` → `.tmp/e2e-r62-b1-b.mjs`（9222，输出 `.tmp/r62-b1-b.json`）。每跑前 `reset.mjs 9222`。未触 20 分钟硬闸。
- **A 基线**（1,000,012 字符 / 44,446 块 / 7 轮 / `源码`按钮口径）：进 p50 **9,883 ms**（9,692–10,244）、退 p50 **2,050 ms**、maxRafGap 进 10,033 / 退 2,133；`inSrc.pmCount=0`（编辑器被卸载）。>1.2 s → 走 ②。
- **B 参照**（1,048,661 B / 368,771 字符 / 11,214 段，`Ctrl+/`）：进 341/932/935 ms、退 571/577/533 ms。
- **② `wrap="off"`**（只改 `src/App.tsx:5570-5575`）：A 复测进 p50 **9,867 ms**（7 轮 9,762–10,455）。对基线 9,883 只差 16 ms（两轮基线本身差 279 ms）→ 收益在噪声内，远不到 ≥50%。`wrap="off"` 已生效（`.tmp/r62-b1-wrap-check.json`）：白空格 `pre`、scrollWidth 52,020 / clientWidth 486、`scrollLeft=200` 可设；打字 4,013→4,014、切回富文本含新字；`Ctrl+S` 落盘 4,015 B（= 源码 4,014 + 文档规则补的末尾 `\n`）。三项功能正常但门槛不达标 → **回滚**（`git diff src/App.tsx` 只剩 B2 两处），结论写进 BACKLOG B-115。
- 机制：每轮进源码第一个 long task 8,638–9,141 ms（`pmCount=0`，卸载 44,446 块），textarea 排版只 ~0.5 s → **只能换 `<pre>` / 虚拟化**。

## B2 停笔不再先写整篇草稿（B-120）DONE

- `src/App.tsx:1071` FSA 草稿兜底 800 → **2500 ms**（2 s 自动保存成功会在 `:2999-3003` 清计时器并推进代际，2.5 s 只兜底结构损失/模态）；`src/App.tsx:3464` 宿主草稿 `scheduleHostDraft` 同改（plan-review H2，宿主回包 `applyHostSaveSuccess` → `clearHostDraft` 停表）。不动 `runAutoSave` / `Ctrl+S` / 2 s 自动保存。
- e2e：`.tmp/e2e-r62-b2.mjs 9222`（复制 `.tmp/e2e-r62-finder-code.mjs`，只跑 kb100 3.6 s 窗口 + `autoSave:false` 档），输出 `.tmp/r62-b2.json`，0 pageerror。
  - ① 窗口内 `autoOps`：`getFile@6764, createWritable@6764, write:36029@6764, close, getFile` → **1 次 write（kb100.md）**、`.sidelight/drafts/` **0 写**、草稿 `createWritable` 0；`autoCounts={getFile:2,text:0,writable:1,close:1}`（getFile 只取 size/mtime，`.text()` 0 次）。改前对照 36,028@6,285 + 36,029@7,190 = 72,057 B。
  - ② `saveOps`：`getFile, createWritable, write:36027, close, getFile`，**仍 1 次 write**、无整篇读（`text:0`）。
  - ③ `autoSave:false`（localStorage 置 `{"autoSave":false}` 后重载）：`autoOps` 仅 `createWritable@6085, write:36008, close`，路径 `.sidelight/drafts/kb100off.md` → **草稿仍写 1 次**、文档 0 写。
- 宿主档同改已静态核对；本机 `INIT-FAIL`，宿主草稿 **UNVERIFIED**（需宿主烟测/真机）。

## 门禁

- `npx tsc --noEmit` exit 0；`npm test` **40 文件 513 条全过**（`.tmp/r63-exec-test.log`）；`npm run verify` **PASS**，首屏 gzip **300,841 B**（预算 310,000，余 9,159；改前 300,834，+7 B）（`.tmp/r63-exec-verify.log`）
- 未跑 `roundtrip`：没改编辑器与序列化（B1 已回滚）。

## CHANGELOG 建议

`- 修复：停笔后不再先写整篇草稿，自动保存成功即停草稿计时器（B-120）。`

## 新踩的坑（3 条）

1. `wrap="off"` 收益上限被 textarea 排版锁死：1 MB 进源码的主力 long task 是卸载编辑器（8.6–9.1 s），`wrap` 只影响 ~0.5 s；判收益先看每轮第一个 long task，别把 ±300 ms 轮间噪声当优化。
2. 夹具 A 每行都短，`scrollWidth` 不会超 `clientWidth`；验横向滚动要另造单行 4,000 字文档，拿 1 MB 夹具测会假红。
3. 夹具输出固定 `.tmp/r62-b1-a.json`，复测会覆盖基线；复测档先另存（wrap 档 → `.tmp/r62-b1-a-wrapoff.json`，再重跑基线）。
