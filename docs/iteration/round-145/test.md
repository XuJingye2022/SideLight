# 第 145 轮（A 轮）独立验收（tester）

结论：**PASS**。A1「新建/保存闭环」与 A2「保存失败提示」全过；门禁绿；无回归。未读 `impl.md`。

- 轮前 startSha：`f8543dc461daade289df482843c1a6262000553a`；验收对象：`App.tsx`、`FileTree.tsx`、`lib/saveError.ts`、`lib/saveError.test.ts`、`styles.css` 的未提交改动（5 文件 +181/−202）。

## 1 门禁（各一次）

- `npm run verify` exit 0 **PASS**：门 gzip **318,454 B** / 常驻 **4,484 B** / 真实首载 **322,938 B**，`headroom=none`（第 144 轮起只记录；144 轮三数 318,723 / 4,487 / 323,210）。
- `npm test` **73 文件 1018 条 0 fail**（逐文件求和；144 轮 1013，本轮 +5）。
- `roundtrip` 不跑：diff 未动编辑器/序列化。日志 `.tmp/verify-r145.log`、`.tmp/test-r145.log`。

## 2 静态核验（改前 >0 → 改后 0）

`git grep -n <pat> -- src/`：`ensureWorkspaceWritable`、`applyFolderReadOnly`、`folderProbeEpochRef`、`tree-readonly-badge|READONLY_BADGE_ID` 改后均 **0 命中（exit 1）**；改前对照 `git show startSha:src/...` 有定义 + 2 处调用、徽标 span 与 `aria-describedby`、`.tree-readonly-badge` 块。
`folderReadOnly` 只剩新测试断言，产品源码 0。入口统一：`onNew={newFileInWorkspace}`、`customId==='newDocument'` 分支调 `newFileInWorkspace()`、旧 `const newDocument = useCallback(` 已删。`saveError.ts`：`isWriteDenied` 覆盖 5 个写类名；`InvalidState`/`Security` 改 `writeReasonOf`、不再拼 `error.message`；四条写类各带 `SANDBOX_HINT`（「正常桌面」）。

## 3 E2E（假 FSA，从零复验）

`.tmp/e2e-r145-tester.mjs`（自写；沿用 144 轮假 FSA + stub `showSaveFilePicker`；1440×900；`autoSave:false`；先 `reset.mjs 60843`）：**33/33 PASS、0 pageerror**（`.tmp/r145-tester-e2e2.log`）。

- **R1 可写**：菜单「新建」→ `create:未命名.md` 恰 1、树行 `is-active`、toast「已新建 未命名.md」、picker 0；`Ctrl+Alt+N` → `create:未命名 2.md`、picker 仍 0、标题跟随。
- **R2/R3 只读**（`getFileHandle` 抛 `NoModificationAllowedError`）：菜单「新建」→ `FAILW:create:未命名.md` 恰 1 → toast「新建失败：这个位置不允许写入。已打开空白文档；按「另存为」选一个能写的位置。」（含原因与出路、无 W3C 英文）、标题框打开且**聚焦**、假 FS 仍只有 `Main.md`；页面全文无「只读」、`.tree-readonly-badge` 0、`.tree-write-warning` 0。改名「读书笔记」→ `Ctrl+S` → picker 1 次、`suggestedName=读书笔记.md`、真写入含正文；再 `Ctrl+S` → picker 0、写盘 +1；只读文件夹未出现 `未命名.md`。
- **R4 单文件拒写**（`main_bak.md` 的 `createWritable` 抛同错）：改字 `Ctrl+S` → toast 含 `main_bak.md` /「系统不允许改写」/「另存为」/「正常桌面」，无英文、错误态 + 「另存为」按钮；磁盘字节未变、0 次 write；点「另存为」→ picker `suggestedName=main_bak.md`。
- **R5 无文件夹**：「新建」= 空白 `未命名.md`（不建文件、不开 picker）；打字后 `Ctrl+S` → picker 1 次、内容 = 正文、假 FS 0 文件。
- **R6 可写已有文件**：打开 `a.md` 改字 `Ctrl+S` → picker 0 次、`write:a.md` 1 次且含新句。

## 4 回归

`scripts/keyboard-acceptance.mjs http://localhost:5175`（`SIDELIGHT_CDP` 指本轮 CDP）：**52/52 PASS**（含 `Ctrl+Alt+N`/`Ctrl+Alt+E`、保存失败 `role=alert` 含「正常桌面」）。跑完已 `git checkout -- shots/round-05/`（`.tmp/r145-kb.log`）。

## 5 截图（≤2）

`shots/round-145/new-in-readonly.png`（只读新建失败 toast + 标题框聚焦，树头无徽标）、`shots/round-145/save-failure.png`（单文件拒写 toast 中文 + 「另存为」）。已人工复核。

## 6 环境偏差（记录，不判产品）

- 开工时 **5175 无监听**（`Invoke-WebRequest` 与 `node fetch` 双口径失败、无 `LISTEN`），与「dev server 在 5175」不符；为跑 E2E，tester 起 `npx vite --port 5175 --strictPort`（背景 job），未改代码、未重启既有服务（不存在）。
- **57270 无监听**（`reset.mjs` `ECONNREFUSED`）；本轮 ego Edge 以 `--remote-debugging-port=0` 启动，实际端口取自 `<profile>/DevToolsActivePort` = **60843**，E2E 用 `SIDELIGHT_CDP=http://127.0.0.1:60843`。
- 观察（不判 FAIL）：`createWorkspaceFile` 失败时 `newDocumentForNaming()` 的 info 提示被随后的错误提示立即覆盖，用户只看到错误条；按 plan 文案即如此。

## 7 未验与 BACKLOG

- UNVERIFIED：真 WebView2 宿主、真实 Low IL 桌面双击、真实 FSA（本轮假句柄）、真实中文 IME、macOS 宿主。
- `BACKLOG.md` 不改：A1/A2 是用户反馈项、无对应 ID；**B-273 仍 `open`**（plan 明确 deferred，本轮「无落点先试写」下外部删除+刷新后 `Ctrl+S` 行为未变，未复验）。
