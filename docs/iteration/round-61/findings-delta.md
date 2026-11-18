# 第 61 轮轮间回归检查（finder-delta，只查回归）

- 基线：HEAD `db25ce7`（第 60 轮）。运行时改动只有 `src/App.tsx:2520-2544`（`openGlobalSearchHit`）与 `src/components/GlobalSearch.tsx:31-59`（`run()` 的 `parts` 拼装 + `busyRef`）；`packaging/verify-installer.ps1`、文档改动无运行时交互面。保存 / 表格 / 公式 / Mermaid 本轮无改动，未测。
- 方法：`node .tmp/reset.mjs 9226` → `node .tmp/e2e-r61-delta.mjs 9226`（合成工作区 `a.md`/`b.md`，关自动保存），3 条路径、0 pageerror、exit 0。读数 `.tmp/r61-delta.json`，日志 `.tmp/r61-delta.log`。
- 结论：**无新回归**（`actionable_count` = 0）。

## 1. 跨文件命中（改动把 `setFindOpen(true)` 移到 `openWorkspaceFile` 之前，最易回归）✅

在 `a.md` 按 `Ctrl+Shift+F` 搜「锚点乙」→ 点命中：`__slState.name` = `b.md`、正文含「乙文档锚点乙」、查找条值「锚点乙」、`.find-count` = `1 / 2`、`sl-parse-done` +1、对话框已关。

## 2. 同篇命中后的焦点 / 键盘 / 撤销 ✅

点当前文档命中：`activeElement` = `.find-input`、`sl-parse-done` 与 `getFile` 均 0 增量、计数 `1 / 2`；查找框里按 `Enter` → `2 / 2`；点回正文 `End` 打「草稿词」在正文里，`Ctrl+Z` 后消失（撤销历史未被重载清掉）。

## 3. 全局搜索键盘闸门 + 0 命中提示 ✅

- 同一 tick 连按两次 `Enter`：只读盘一轮（`getFile` 10→12，2 个文件 = 2），闸门仍生效。
- 闸门放掉后再按 `Enter`：又搜一轮（12→14，仍「2 处」），`busyRef` 不会卡死。
- 0 命中：note「没有匹配的文本」、空态「没有结果。」（B-128 拼装分支未吞空态）。
- `Esc` 关对话框：焦点回 `.ProseMirror`（`.find-input` 已卸）。

## UNVERIFIED

源码 / 预览模式下点同篇命中（查找条锁定、不做 rAF 聚焦）本轮未跑；与第 60 轮 UNVERIFIED 项一致，非本轮改动引入。
