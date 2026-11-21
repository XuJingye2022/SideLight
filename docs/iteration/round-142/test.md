# 第 142 轮验收（tester）：保存/新建闭环（A 轮）

判定 **PASS**。基线 HEAD `e7a2753`（轮前 startSha），验收时工作区 6 个 `src/` 文件已改、未提交。方法：读 `plan.md` 的 A1/A2 验收 + `git diff`，未读 `impl.md`；A2 跑交付脚本后另写独立探针（自建假 FSA，不复用执行方夹具）。

## 1. 门禁（真跑）

| 门 | 结果 |
| :--- | :--- |
| `npm test` | exit 0，**72 文件 1003 条 0 fail**（141 轮 999；`saveError.test.ts` 20→24） |
| `npm run verify` | exit 0 **PASS**：门 **317,638 B** / 常驻 `MarginRail` **4,478 B** / 真实首载 **322,116 B**，硬线 325,000 余 2,884（≤本轮线 323,500）；对 141 轮 321,950 净 **+166 B** |
| `roundtrip` | 不跑（未动编辑器/序列化，与 plan 一致） |

日志：`.tmp/r142-tester-npmtest.log`、`.tmp/r142-tester-verify.log`。

## 2. A1 静态门（先贴改前对照）

- `git grep -nE 'error\.message|second\.message' -- src/lib/trash.ts`：**改后 0 命中（exit 1）**；改前对照用 `git show HEAD:src/lib/trash.ts` 落到临时文件后 `Select-String` 数得 **11 行**：68 / 71 / 115 / 128 / 135 / 207 / 217 / 221 / 255 / 414 / 417（全部 `${error instanceof Error ? error.message : '未知错误'}` 形状）。
- `writeReasonOf(` 在 `trash.ts` **11 处**；`git diff -- src/lib/saveError.ts` 只有新增块（`describeSaveFailure` 与 `messageOf` 逐行未动）。
- `App.tsx` 的 `ensureWorkspaceWritable`（`:2938-2952`）只剩 `setTrashReason(...)`，无 `setNotice` / `kind:'error'`；`createWorkspaceFile` catch：`await startNewDocument()` → `writeReasonOf` + 「另存为」+ `persist:true`，不写 `saveTargetRef`；`createFolder` 用 `writeReasonOf`。
- `FileTree.tsx:459` 与 `TreeActions.tsx:209` 的 `disabled={Boolean(trashReason)}` 已删，`title`/`aria-describedby` 保留；警示行含「保存会失败」「另存为」；`TreeActions` 的死 prop `trashReason` 已清（全文件 0 命中）。

## 3. A2 端到端（ego CDP 57270、1440×900、先 `node .tmp/reset.mjs 57270`）

- 交付脚本 `node .tmp/e2e-r142-a.mjs`：**30/30 PASS、allPass:true、pageErrors 0**（`.tmp/r142-a.json`、日志 `.tmp/r142-tester-e2e-a.log`）。关键行：打开文件夹后 `.toast` **0**、`.tree-file` **1**、`.tree-new-main` `disabled=false`、警示行「无法创建回收站：这个位置不允许写入。能打开也能编辑，保存会失败：请用「文件 → 另存为」换一个位置。」；＋新建 → `.doc-name`=`未命名.md` + 中文「保存失败/新建失败…另存为」；无句柄 `Ctrl+S` → `保存失败：…「未命名.md」…请用「另存为」换一个位置。`；打开 `Main.md` 后 `Ctrl+S` → 中文 + 文件名、磁盘 `Main.md` 字节未变、草稿只试写 `.sidelight/drafts` 被拒（`ops` 有 `FAILW:.sidelight`、`files` 无 drafts）；另存为 reject → 中文 + 无动作钮。
- 执行方脚本自带 dev server 新鲜度门（`fetch /src/lib/saveError.ts`、`/src/App.tsx`、`/src/components/FileTree.tsx`），排除 Vite 混合版本。
- **独立探针** `.tmp/r142-tester-indep.mjs`（自建夹具：`getDirectoryHandle(create)` 抛 `NoModificationAllowedError`、`createWritable` 抛同错、读与枚举正常）：**17/17 PASS、0 pageerror**（`.tmp/r142-tester-indep.json`）。断言含：打开后 `.file-tree` 1 / `.tree-file` 1 / `.toast` **0**；`＋新建` `disabled=false`；警示行中文且无 `An attempt|filesystem|...Error`；新建后 `未命名.md` 且正文可键入；无句柄 `Ctrl+S` 中文「保存失败」+「另存为」+ 文件名、无英文；打开磁盘 `甲.md` 后 `Ctrl+S` 中文、磁盘字节未变、`ops` 全为 `deny:`、全程 0 pageerror。
- 回归 `.tmp/e2e-r141-save.mjs`（已删旧 ③④）：**13/13 PASS、0 FAIL、pageErrors 0**（`.tmp/r142-tester-e2e-r141.log`）。
- 截图 `shots/round-142/folder-unwritable.png`（1440×900）：树 `r142-ws` 列出 `Main.md`、警示行中文三句、`＋ 新建` 亮、无 toast。我复核过该状态，与两条脚本读数一致。

## 4. 观察（不判 FAIL）

- 新建失败会先 `startNewDocument()` 把正文换成空白 `未命名.md`：若上游脏文本确认走「丢弃」分支，编辑器里的未保存文字不会回到正文。这是 plan「不留死路」的既定代价；本轮未实测脏文本 + 拒写组合。
- `openFolder` 的 picker catch 仍用 `messageOf`（plan 明确留下一轮）。
- `trash.ts` 的 `NotAllowedError` 文案从「没有写入这个文件夹的权限，删除不可用。」缩成「没有写入这个文件夹的权限。」（拼接句仍完整）。

## 5. UNVERIFIED

真 WebView2 宿主、真实中文 IME、真实 Low IL 桌面双击保存；`e2e-r141-save.mjs` 的 ③④ 删除后，原「打开时常驻提示」断言由 `e2e-r142-a.mjs` 覆盖。

## 6. 收尾

`docs/CHANGELOG.md` 0.32.2 段加一条；STATE 追加第 142 轮记录；BACKLOG 新增 **B-269 → fixed**（本轮无旧行）；commit 后 HEAD 与 `e7a2753` 不同。未改 README/AGENTS，未 push，未动 `release/`。
