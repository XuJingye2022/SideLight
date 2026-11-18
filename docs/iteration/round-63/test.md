# 第 63 轮 tester 验收（未读 `impl.md`，自跑夹具）

## 门禁
- `npm run verify` **PASS**：首屏 gzip **300,841 B**（内部 310,000 / 硬线 320,000，余 19,159）。`.tmp/r63-tester-verify.log`
- `npm test` **PASS**：**40 个文件 513 条**，0 fail（40 个 `ℹ tests` 块求和，无 `fail` 非零行）。`.tmp/r63-tester-npm-test.log`
- `npm run roundtrip` 未跑：`git diff` 只动草稿/自动保存计时器与 BACKLOG，未动编辑器与序列化。
- 回归 `scripts/stale-save-acceptance.mjs` **4/4 PASS**（慢写回包不改 b.md、随后 `Ctrl+S` 写 b.md 不写 a.md）。`.tmp/r63-tester-stale-save.log`

## B1（B-115 基线定案）PASS
- 夹具核对：`.tmp/e2e-r62-b1-a.mjs` 照第 53 轮按钮口径（点「源码」→ 等 textarea 可见），`BIG_CYCLES=7`、种子 1,000,012 字符、44,446 块，已加 `__rafGap`，输出 `.tmp/r62-b1-a.json`；`.tmp/e2e-r62-b1-b.mjs` 输出 `.tmp/r62-b1-b.json`（1 MB 载入 803 ms / 11,214 段；键盘 `Ctrl+/` 进出 3 次：进 341/932/935 ms、退 533/571/577 ms）。
- 独立重跑 A（`reset.mjs 9222` 后）：进 p50 **9,826 ms**（p95 10,015，9,730–10,015，n=7），退 p50 2,121，maxRafGap 9,866；每轮 1 条 8,584–9,026 ms long task，退出 1.6–1.9 s；100 KB 进 269 / 退 184；0 控制台错误。→ 进 >1.2 s，走 ② 分支。
- ② `wrap="off"` 独立复测（3 轮，省时；只改 `src/App.tsx:5574-5579` 加属性，跑完已还原，`git diff` 无该处残留）：进 p50 **9,601 ms**（9,443/9,601/9,710），对 9,826 只降 **2.3%**；`srcWrap=off`、`white-space: pre`、44,446 块不变、long task 仍 8.3–8.7 s。降幅远低于 50% → 按验收回滚并记「只能换 `<pre>` / 虚拟化」。证据 `.tmp/r63-tester-wrapoff.json`、`.tmp/e2e-r62-b1-a-wrapoff.json`（执行方 7 轮 p50 9,867）。
- 可编辑 / `Ctrl+S` / 横向滚动：执行方 `.tmp/r62-b1-wrap-check.json` —— wrap=off 生效（scrollWidth 52,020 vs clientWidth 486、`scrollLeft=200`）、敲 Q 后 4,013→4,014、toast「已保存 long.md」、磁盘含 Q、回富文本含 Q。②第一条已否决，回滚判据不依赖这三项；tester 未逐项重跑（见 UNVERIFIED）。
- 代码未改：`git diff` 在 `5570-5575` 无 hunk；BACKLOG B-115 记了定案并保持 `open`。**修正**：执行方记的「9,762–10,455」「降 2.9%」与证据不符——证据为 p50 9,883→9,867 = **−0.16%**、min **9,749**；判决不变，本轮已按证据改数。

## B2（B-120 停笔不再先写整篇草稿）PASS
- 独立跑 `.tmp/e2e-r62-b2.mjs`（端口 9222，`reset` 后）：kb100 停笔 3.6 s 窗口 `autoOps` = `getFile@6691` / `createWritable` / `write:36029` / `close` / `getFile`：**仅 1 次 write（kb100.md）**、`.sidelight/drafts/` **0 写**、草稿 `createWritable` **0**；`autoWriteBytes` **36,029**。改前对照（`.tmp/r62-finder-code.json`）为 36,028@6,285 + 36,029@7,190 = **72,057**。
- `saveOps` 仍 1 次 `write:36027`（5 op 与改前同）；`getFile` ×2 只取 size/mtime（`counts.text=0`，`src/App.tsx:3067-3071` 快照复用后不建全文），无整篇读。`toast`「已保存 kb100.md」。
- `autoSave:false`：草稿仍 1 次 `write .sidelight/drafts/kb100off.md:36,008`，文档 0 写。`.tmp/r63-tester-b2.json`
- 机制核对：`finishSaved` 停草稿计时器并推代际（`src/App.tsx:3000-3005`），自动保存 2 s 先回包；2500 ms 只兜底「保存被结构损失/模态挡住」。dev server 交付模块含 2 处 `}, 2500)`、无 `}, 800)`。
- 副作用（按验收接受）：`autoSave:false` 时草稿落盘由改前 ~1.1 s 变 ~2.8 s（实测 t≈6,032 ms 的写发生在停笔 2.8 s 后）。

## 判定
**PASS**。UNVERIFIED：① ② 的 wrap=off 7 轮 p50 取自执行方 `.tmp/r62-b1-a-wrapoff.json`（tester 用 3 轮复测，趋势一致）；② wrap=off 下「可编辑 / Ctrl+S 同源 / 横向滚动」三项取自执行方 `r62-b1-wrap-check.json`，未逐项重跑；③ 真实 FSA 句柄与宿主 WebView2 下的 2500 ms 兜底（假 workspace + 浏览器实跑）；④ B-115 的最终解（换 `<pre>` / 虚拟化）本轮未实现。
