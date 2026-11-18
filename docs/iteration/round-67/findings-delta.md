# 第 67 轮回归检查（finder-delta）

只读。第 66 轮只改 `src/App.tsx`（`86708a1`），本检查只跑其相邻面：保存 / 撤销 / 焦点 / 键盘 / 源码态排程。E2E `.tmp/e2e-r67-delta.mjs`、`.tmp/e2e-r67-delta-ime.mjs`（CDP 9226，dev 5175 未重启，0 pageerror）。

## 无回归（3 条路径）

- A 编辑器停笔 + 撤销：打字 → chip「自动保存排队中」→ `small.md` 100,010→100,013（尾 `E`）、文档写 1 / 草稿 0、chip 回「已自动保存」；`Ctrl+Z` 后写回 100,010（撤销后的正文）且焦点仍在 `.ProseMirror`。撤销后补写是预期（此时磁盘基线=100,013），不算回归。
- B 源码打字后 176 ms 退出源码：落盘 100,011，与退出前 textarea 值逐字符相等（`diskEqualsTextarea:true`）、尾 `S`、文档写 1 / 草稿 0、焦点回编辑器。2 s 待发定时器没写旧快照。
- C 源码打字后立刻 `Ctrl+S`：文档写 1（无双写）、草稿 0、尾 `SM`。

## 新回归 1 条（P1）

**B-145 源码态自动保存无输入法组合守卫**：`composeUntilRef` 只在编辑器 DOM 上接线（`src/App.tsx:3699-3716`），`textarea.source-editor` 无 `onCompositionStart/End`（`:5643-5648`），第 66 轮新 effect（`:3672-3678`）逐键排程，`runAutoSave` 的组合门（`:3575`）对源码态恒不命中。

实测（`Input.imeSetComposition` 造 `zhong` 未提交组合，停 2.6 s）：`small.md` 100,010→100,015，文件第 0 字符起就是未提交拼音（`diskCompositionContext.ctx`），chip 已显示「已自动保存」；提交「中」后写回 100,011 自愈。旧行为源码态不写盘，故是本轮引入。
修法：在 `textarea` 上接 composition 事件也置 `composeUntilRef`（end 后 +400 ms），或排程前判 `isComposing`。

未验：真实中文 IME、1 MB 源码档。截图：无（无界面改动）。
