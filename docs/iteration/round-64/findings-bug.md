# 第 64 轮 缺陷猎人（finder-bug）

结论：**本轮无新 P0/P1（actionable 0）**。5 条用户路径实跑全绿；delta 复核 B-120 / B-132 / B-133 通过。

- 报告目录 `docs/iteration/round-64/`；原始数据 `.tmp/r64-finder.json`、`.tmp/r64-finder-extra.json`
- 脚本：`.tmp/e2e-r64-finder.mjs`（路径 1–5）、`.tmp/e2e-r64-finder-extra.mjs`（补充），均走 9222
- 环境：dev `http://localhost:5175`、CDP 9222，前置 `node .tmp/reset.mjs 9222`；假工作区用 `.tmp/r51-fsa.mjs`
- 本轮只读，未改产品代码

## 路径与结果

| # | 路径 | 步骤 | 结果 |
| :--- | :--- | :--- | :--- |
| 1 | 输入 → 保存 → 重开 | `note.md` 末尾打 `XQZ` → `Ctrl+S` → 切 `other.md` → 切回 | toast「已保存 note.md」；写盘 20 字符，磁盘尾 `第一段。XQZ`；重开含 `XQZ`；保存链 `getFile→createWritable→write→close→getFile`（后一次不读全文） |
| 2 | 文件树 新建/重命名/删除/撤销/刷新 | 树头「新建文件」→ 写 `新建内容NY` → 保存 → 右键重命名 `renamed` → 删除 → 撤销 → 刷新 | 新建 `未命名.md`；改名后 `renamed.md` 且内容在；删除 toast「已移到回收站：renamed.md」；撤销恢复全文；刷新 toast「已恢复 renamed.md」 |
| 3 | 键盘与焦点 | `Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`+`Esc`、列表 `Tab`/`Shift+Tab` | 链接/公式编辑器各出 1 个，`Esc` 后 `input` 消失且焦点在 `.ProseMirror`（`tag=DIV`）；快速打开输入 `note` 回车打开 `note.md`；查找 `1 / 1`，一次 `Esc` 只关查找（`.find-bar` 0、无源码态、焦点在正文）；列表缩进嵌套 `[1,0]`，`Shift+Tab` 回 `[0,0]` |
| 4 | 错误路径 | 坏 Mermaid 围栏 `graph TD; A-->B(((`；无句柄新文档保存 | 错误 widget 类 `mermaid-preview ProseMirror-widget is-error`，说明「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，`body` 下 0 个 mermaid 残留、正文无回退；新文档 `Ctrl+S` toast「已保存到 未命名.md」，根目录出现 6 字符文件 |
| 5 | 1 MB 载入/滚动/保存 | 1,048,655 B 夹具（11,806 顶层节点，尾标唯一）载入 → 滚到底 → 末尾打字 → `Ctrl+S` | 载入 620 ms、滚动 905 ms（`atBottom=true`）、保存 52 ms；`write` 368,771 字符（全文一次）、磁盘尾 `尾标MBxy`，无丢字/卡死 |

## delta 复核（均已 fixed，本轮通过）

- B-120：100 KB 文档停笔 3.6 s 窗口内 **1 次 write 36,007 字符**、`drafts` 写 **0** 次；`scrollTop` 在窗口后仍在底部（自动保存不重置阅读位置）。
- B-132/B-133：在已打开文档末尾手打 `[TOC]` → `nav.sl-toc` 1、该段 `toc-source is-revealed`（光标在内，高 33）；保存磁盘末行 `[TOC]`；切走再回 → `nav` 1、`toc-source` 高 0。

## 已排除的假阳性（避免误报）

- 删除后未在 `__fsState` 找到 trash：是取证过滤写法错（`includes('/.sidelight/trash/')` 少了前导斜杠）。补测 `.tmp/r64-finder-extra.json` 的 `q3_trashFiles`：`.sidelight/trash/20261118-101827-ce1p1q-other.md` 内容含「另一篇」，回收站落盘正常。
- 无句柄新文档停笔 4.2 s 不落盘、无草稿文件：**设计如此**，`src/App.tsx:3555-3558`（「首次手动保存前绝不自动写盘」＋ 无 file target 直接返回）；草稿兜底只走宿主（`hostDoc.ready`）。不是缺陷。
- `Ctrl+N` 在浏览器不生效：产品键位是 `Ctrl+Alt+N`，`src/components/ShortcutsDialog.tsx:14,98` 已写明浏览器保留；不是缺陷。

## 已知项未重复计数

- 重命名成功 toast 仍是刷新文案（B-208，deferred）。
- 删除确认框干净分支只说用文件管理器恢复、不提应用内撤销（B-212，deferred）。

## UNVERIFIED

- 宿主形态（WebView2 `INIT-FAIL`）：草稿兜底、`/__doc` 写回、关窗三选一。
- 真实中文输入法、真实 5.5 MiB 超大文件拒绝分支。
- 1 MB 载入 620 ms 与 B-115 的 44,446 块夹具不同源，不可直接比较；未重测切源码。
