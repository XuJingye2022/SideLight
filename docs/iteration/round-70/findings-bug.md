# 第 70 轮 缺陷侦察报告（finder-bug）

结论：新 **P1 1 条**（F1），新 P0 0 条。已核对 5 条用户路径，4 条正常（负结果见 §2）。

## F1（P1）删除正在编辑的文件时，若「下一个文件」读不出来，删除流程中途抛错：不切文档、撤销入口不出现、标题停在已删文档

**复现**（假工作区）：
1. 工作区放 `a.md`、`b.md`、`big.md`（6 MiB，超过 5.5 MiB 上限）。
2. 打开 `b.md`，正文打「脏Q」，等 700 ms。
3. b.md 行菜单 →「删除（移到回收站）」→ 点「移到回收站」。

**期望**：切到下一个可读文件（此处 `a.md`；`big.md` 应跳过或退到空白文档），提示「已移到回收站：b.md」并带「撤销」。

**实际**（`.tmp/r70-bug-c.json`，确认后 24 次采样 / 2.9 s）：
- 树里 `b.md` 消失，trash 写入 `…-b.md`（9 B）与 `…-b.md.current.md`（11 B，脏正文），但**没有撤销**：`undoAny:false`，toast 只有「已刷新：新增 0 个，消失 1 个」。
- 标题仍是 `b.md — Sidelight`，`.is-active` 为 null，脏标记消失；编辑器仍是 `乙 第二篇脏Q`。
- 控制台未捕获错误：`Error: 文件太大，暂不支持（上限 5.5 MiB）。`
- 之后按 `Ctrl+S` 把正文写成**新的根目录 `未命名.md`**（`.tmp/r70-bug-b.json`：树多出 `未命名.md`、toast「已保存到 未命名.md」、vfs 中 `未命名.md` 11 B）。正文没丢（trash 留了 `.current.md`），但用户会以为 b.md 还在，再保存就多出一个新文件。

**对照**（同脚本去掉 `big.md`，`.tmp/e2e-r70-bug-c-control.mjs` / `.tmp/r70-bug-c-control.json`）：确认后 120 ms toast 已是「已移到回收站：b.md」+ 撤销，文档切到 `a.md`，`undoAny:true`。差别只在「下一个文件」能否读出。

**根因**：`removeFile` 用 `files[index + 1] ?? files[index - 1]` 选下一个文件（`src/App.tsx:2864-2867`），删除后直接 `readNode(rebound)`（`:2882`）；`readNode` 对 >5.5 MiB 文件直接 `throw`（`src/lib/workspace.ts:292-299`）。抛错前 `setActiveFile(null)` / `setDirty(false)` 已执行（`:2877-2879`），而「已移到回收站 + 撤销」的 `setNotice`（`:2889`）被跳过，函数以未处理 rejection 结束。任何 `readNode` 失败（超大、读不到、权限失效）都会走到这条。

**建议**：选下一个文件时跳过读不出的项（`readNode` 包 try/catch，失败继续找下一个；全失败 `loadIntoEditor('', '未命名.md', null)`），并保证「删除成功 + 撤销」的 notice 不受切换失败影响。

## 2. 已核对正常的路径（负结果）

1. 输入→保存→切走→切回：`a.md` 写入 13 字符，切回正文含新增字（`.tmp/r70-bug-a.json` 的 saveA / reopenA）。
2. 脏文件重命名 `b.md→c.md`：未保存的「脏字Z」留在编辑器，`Ctrl+S` 写 `c.md`，未复活 `b.md`（afterDirtyRename / saveAfterDirtyRename）。
3. 保存竞态：`Ctrl+S` 后立刻切到 `c.md`，`a.md` 仍完整写入「…RACE」，`c.md` 未被污染（saveRace）。
4. 键盘：`Ctrl+K` 聚焦 `.link-editor-input`、`Esc` 回 `.ProseMirror`（ProseMirror-focused）；`Ctrl+P` 聚焦 `.quick-open-input`、`Esc` 回正文；`Ctrl+F` 输入后 `Esc` 回正文（ctrlK / ctrlPEsc / ctrlFEsc）。
5. 超大文件：树里点 `big.md` 只出「超过 5.5 MiB」toast，正文不变；坏 Mermaid：无错误遮罩残留，代码块旁提示「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，`body` 下无游离 `pre`（`.tmp/r70-bug-b.json` 的 bigFile / badMermaid）。

## 3. 未验证

- 表格 Tab / `Ctrl+Enter`：本轮选择器 `.toolbar button` 0 命中，未测（UNVERIFIED，不计）。
- 删除后「撤销」在真实 FSA 下的恢复效果未跑（假 VFS 的 `move`/`removeEntry` 足以触发 F1 主体）。
- 1 MB 载入 / 滚动 / 保存未重测，沿用第 64/65 轮结论。

## 4. 计数

- 新 P0 0 条；新 P1 1 条（F1）。
- P2 观察与 B-142 同根（撤销只挂单条 toast），只补证据。
