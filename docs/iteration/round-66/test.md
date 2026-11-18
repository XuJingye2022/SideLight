# 第 66 轮 A 轮（B-143 / B-144 基线）独立验收

tester 独立验收，未读 `impl.md`；只读 `plan.md`、`git diff`、`BACKLOG.md`。startSha `8314072`，验收后 commit。
工作树改动：`src/App.tsx`（+107/−59：`scheduleDraft` 抽出、`sourceDirtyNowRef`、声明在 `:3662-3667` ref 赋值之后的新 effect、`autoSaveScheduledRef` 去重）、`docs/iteration/BACKLOG.md`，新增 `docs/iteration/round-66/`、`shots/round-66/`。

## 门禁

- `npm run verify` PASS：首屏 gzip **301,073 B**（内部 310,000 / 硬线 320,000，余 18,927；`dist/assets/index-DFHSAZfB.js` 292,213 gzip）。轮前 300,980 → +93 B。
- `npm test` PASS：**40 文件 520 条 0 失败**（逐文件 `ℹ fail 0`，非零 0 条）。
- `roundtrip` 未跑（未动编辑器内核与序列化，按 common.md 规则）。
- 日志：`.tmp/r66-tester-verify.log`、`.tmp/r66-tester-test.log`。

## A1 源码态停笔也排自动保存与草稿（`.tmp/r66-tester-a1.json`）

E2E 前 `node .tmp/reset.mjs 9222`；端口 9222；dev 5175 未重启；0 pageerror。

判别式成立：改前 `.tmp/r66-finder-autosave-source.json` 同一档 `sourceModeWrote:false`、chip 恒「已自动保存 11:26」、磁盘尾无新字（100,006→100,006）；改后同档先出「自动保存排队中」再写盘。

| 档 | 结果 |
| :--- | :--- |
| 100 KB + 开 | chip「自动保存排队中」在打字结束后首个页面内轮询即命中（`chipQueuedMs` 0）；打字起点后 371 ms 仍是排队中；3.2 s 后 `small.md` 100,010→**100,011**、尾 `…ords。\nB\n`（以所打字母结）、chip 回「已自动保存 12:16」+`auto-save-ok`；`docWrites` **1** / `draftWrites` **0** |
| 1 MB + 开 | `big.md` 1,000,012→**1,000,013**（尾 `。\nQ\n`）；`sidelight.doc.v1` 仍在但 `textLen` 100,011（非整篇、<500 K 门槛）；`docWrites` 1 / `draftWrites` 0 |
| 1 MB + 关 | `big.md` 字节不变 **1,000,012**；`.sidelight/drafts/big.md` 出现，1,000,013 B，尾 `ds。\n\nR` 含新字 R；`docWrites` 0 / `draftWrites` 1 |
| 负向（新文件） | Ctrl+Alt+N 后标题 `未命名.md`；源码打 Y 等 **3,214 ms**，`__fsState` 文件集合 2→2、无新文件 |

## A2 一次停笔只写一份 + 1 MB 源码打字

- **编辑器 100 KB + 开**（`node .tmp/e2e-r62-b2.mjs 9222`）：3.6 s 停笔窗口 `autoWriteBytes` **36,029**、`autoDocWrites` **1**、`autoDraftWrites` **0**、`autoDraftCreateWritable` 0（与第 63 轮 36,029/0 同值）；**+ 关**：`docWrites` **0**、`draftWrites` **1**（36,008 B）。B-120 未退化。
- **源码 100 KB + 关**：文档 0 写、草稿 1 写（100,011 B，尾 `。\nK\n`）。
- **源码 1 MB 打 10 字（关）**两轮：p50 **2,810 / 2,818 ms**（门槛 ≤2,900；改前 2,618 → +7.3% / +7.6%）；单轮 2,917·2,810·2,742 与 2,928·2,818·2,809；long task 最大 **233 / 161 ms**（无 >1,000 ms 单条）；`big.md` 不变。
- **源码 1 MB 打 10 字（开）**两轮：3 轮各 **+10**（1,000,012→100,022→100,032→100,042），`diskEqualsTextarea:true`（整篇 1,000,042 字符与 textarea 逐字符相等，同时坐实「不写旧快照」）、尾 `dzxcvbnmasd`；`docWrites` **3** / `draftWrites` **0**（一次停笔一份）；chip「已自动保存」。
- 证据：`.tmp/r66-tester-a2.json`、`.tmp/r66-tester-a2b.json`、`.tmp/r62-b2.json`。

## 回归

`e2e-r62-b2.mjs`（draft / autosave 面，本轮改动的唯一相邻面）：通过，见上「编辑器」两腿；0 pageerror。

## 判定：PASS

- 四条验收档 + 负向全 true，判别式（改前 `sourceModeWrote:false`）成立；A2 两轮都过门槛，`diskEqualsTextarea` 用整篇逐字符相等替掉「尾串」单一断言。
- 观察（不判 FAIL，未列入验收）：① 排队中时 chip 的 class 仍是 `auto-save-ok`，只有文案区分；② 单轮打字总时长有 ±200 ms 级波动（开档一轮 p50 2,907 超门槛 7 ms，该档未设门槛，已两次复测 2,892 / 2,907）；③ 负向新文档打 Y 后未出现「未保存」状态 chip（验收未要求）。
- UNVERIFIED：真实 FSA 磁盘与真实 1 MB 文件（用 `r51-fsa` 合成工作区）；WebView2 宿主内同一路径；中文 IME 组合输入下的源码态排程；`roundtrip` 未跑。
- 截图：本轮无界面改动，未新增截图（沿用 `shots/round-66/` 的侦察图）。
