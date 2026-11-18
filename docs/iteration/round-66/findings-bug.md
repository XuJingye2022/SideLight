# 第 66 轮 · 缺陷猎人（finder-bug）发现

- 轮前 startSha `83140727bc8f21d3d8d45056ac7a82c58f39bc86`；dev `http://localhost:5175`；CDP 9222；每批前 `node .tmp/reset.mjs 9222`。
- 结论：**新 P0/P1 = 0**。4 批共 9 条用户路径实测，0 控制台错误、0 数据丢失。唯一条 P2 观察见文末。

## 路径与结果（每条留证据）

### P1 输入 → 保存 → 重开（含无句柄保存）
- 打开 `a.md`，段末打 `新增ABC` → `Ctrl+S` → toast「已保存 a.md」，假工作区落盘 `# 甲\n\n第一段。新增ABC\n\n第二段。\n`。切到 `b.md` 再切回 `a.md`，正文含 `新增ABC`（重开保真）。
- 无句柄新建：`Ctrl+Alt+N` → 标题 `未命名.md`、正文空；打字后 `Ctrl+S` → toast「已保存到 未命名.md」，工作区根新增 `未命名.md`（12 B 正文），文件树即时出现该行；再新建并保存 → `未命名 2.md`，不覆盖前一篇。
- 说明：`Ctrl+N` 本就不绑定（`src/components/ShortcutsDialog.tsx:98` 写明被浏览器保留），首测「无反应」属预期，不是缺陷。
- 证据：`.tmp/r66-finder-bug.json` A、`.tmp/r66-finder-bug3.json` T。

### P2 文件树删除 / 撤销（含删除「正在编辑的脏文档」）
- 脏正文状态下右键 `a.md` → 行菜单「重命名 / 删除（移到回收站）」→ 确认框 `aria-label="删除文件"` 走脏分支文案 → 确认。
- 结果：`.sidelight/trash/…-a.md` 21 B（盘上旧版）+ `…-a.md.current.md` 26 B（脏正文快照）成对落盘，toast「已移到回收站：a.md」带「撤销」；编辑器切到 `b.md`。
- 立刻点「撤销」→ toast「已恢复 a.md」，`a.md` 回来且内容为脏版 `# 甲\n\n第一段。\n\n第二段。脏字K\n`（符合「撤销一起搬回」）；编辑器留在 `b.md`。
- 历史隔离：切换后在新文档按 `Ctrl+Z` / `Ctrl+Shift+Z` 正文不变，存盘后 `b.md` 仍是原文，没有串味（上一篇的字没被撤进本篇）。
- 证据：`.tmp/r66-finder-bug2.json` T1、`.tmp/r66-finder-bug4.json` T。

### P3 键盘与焦点
- `Ctrl+P` → 对话框「快速打开」，输入 `c` 出 `c.md`，Enter 打开 `sub/c.md`，焦点落 `.ProseMirror`（`aria-label="正文编辑器"`，`ProseMirror-focused`）。
- `Ctrl+F` 输入 `丙` 计数 `1 / 2`，`Esc` 关查找条且焦点回正文；`Ctrl+K` 开「编辑链接」，`Esc` 后焦点回正文。
- 表格：插入 3×3 后点首格段末按 `Tab`，选区 col 0→1，`Shift+Tab` 回 col 0。
- 证据：`.tmp/r66-finder-bug.json` C、`.tmp/r66-finder-bug2.json` T4。

### P4 错误路径
- 坏 Mermaid（`graph TD / A -->`）载入：代码块原文保留、`.mermaid-preview` 显示「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」（`rgb(180, 69, 58)` 危险色）、`body > svg` = 0、坏图之后的段落仍在。
- 6 MiB 文件：toast「「huge.md」超过 5.5 MiB，仍在「b.md」」，正文仍 `b.md`；随后 `Ctrl+S` → 「没有改动，未写入。」，`huge.md` 长度不变（6,291,456 B）。
- 证据：`.tmp/r66-finder-bug2.json` T3、`.tmp/r66-finder-bug4.json` T。

### P5 大文档
1 MB 载入/滚动/保存/源码切换已由同轮 finder-code（`.tmp/e2e-r66-finder-code.mjs`）覆盖，本轮不重复；本批只复核小文档 0 错误。

## P2 观察（deferred 候选，不算 actionable）

**F1 删除文件的「撤销」只挂在一条 toast 上，后面任何 toast 都会把它顶掉，删除就失去应用内恢复入口。** 复现：`a.md` 脏时删除 → toast「已移到回收站：a.md｜撤销」→ 在切过去的 `b.md` 里打字并 `Ctrl+S` → toast 变「已保存 b.md」，`撤销` 按钮消失（`.tmp/r66-finder-bug.json` B.undoClicked=false、B.afterUndoToast）；数据不丢（trash 里成对两文件）。期望：删除的恢复入口保留到下一次文件树操作，或文件树「更多 ▾」加「恢复最近删除」。证据：`.tmp/r66-finder-bug.json` B、`.tmp/r66-finder-bug2.json` T1。
