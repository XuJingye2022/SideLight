# 第 51 轮 缺陷猎人报告（finder-bug）

只读侦察。环境：dev `http://localhost:5175`、CDP 9222；每条路径前 `node .tmp/reset.mjs 9222`。
命令：`node .tmp/e2e-r51-bug-1.mjs` / `-2.mjs` / `-3.mjs` / `-4.mjs`（日志 `.tmp/r51-bug-log1..4.txt`）。
已查 `docs/iteration/BACKLOG.md` 去重；B-006（保存链）、B-205（1 MB 逐键 p95）不重复计。

## F1（P1）1 MB 文档载入时长由节点数决定：约 2.4 万节点要 110.9 s

- 复现：假工作区放两个 1 MB `.md` 种子（`.tmp/e2e-r51-bug-4.mjs:6-14`），打开文件夹后点树里的文件。
  - `big2.md` 1,000,196 B，300 段（少量节点）；
  - `big.md` 1,000,012 B，约 1.2 万个 `## 小节` + 段落（约 2.4 万顶层节点）。
- 证据（`.tmp/r51-bug-log4.txt`）：`sl-load-start → sl-parse-done` 的间隔
  `fewNode.spans["sl-parse-done"] = 1,292 ms`（总就绪 1,735 ms）；
  `manyNode.spans["sl-parse-done"] = 109,661 ms`（总就绪 110,899 ms）。
  同类种子在独立的第 3 次运行里同样慢：79,858 ms（`.tmp/r51-bug-log3.txt`）。
  两轮 marks 均只有一段 parse 占满，主线程忙期间界面无提示。
- 期望 vs 实际：1 MB 应 1–2 s 可写（`AGENTS.md` 第 6 节记「1 MB 载入已测 1284 ms」；本轮 300 段实测 1.7 s 吻合）。
  实际多节点文档要 1.8 分钟，用户会以为崩溃。
- 影响：1 MB 级、几千个小节的真实笔记打不开也切不走；期间自动保存、切换、Esc 全部排队。
- 建议：按节点数而不是字节数分流——超阈值先以源码模式打开并说明原因，或把 parse 切成空闲分片并显示进度；
  改前用 `npm run build` 起静态服务量 prod 数字（本环境只允许 dev，prod 记 UNVERIFIED）。

## F2（P2）重命名成功的提示借了刷新文案

- 证据：`.tmp/r51-bug-log3.txt` 的 `tree.rename.toast.text` = 「已刷新：新增 1 个，消失 1 个」；
  文案出自刷新分支 `src/App.tsx:2411`，重命名无专用提示。期望「已重命名 a.md → a2.md」。→ deferred。

## 已验证正常（4–5 条用户路径）

| 路径 | 实测 |
| :--- | :--- |
| 键盘焦点 | Ctrl+P / Ctrl+F / Ctrl+K 三者 Esc 后 `document.activeElement` 都是 `.ProseMirror…ProseMirror-focused`；Ctrl+F 命中 `1 / 1`，Esc 只关查找条、不退视图 |
| 表格 Tab | 点首格后选区在 `td#0`；Tab → `td#1`，Shift+Tab → `td#0`；格内输入得到 `19`，未造块级节点 |
| 文件树 | ＋新建 → `未命名.md`（「已新建 未命名.md」）；a.md→a2.md 后标题与正文跟手；删除→`移到回收站` 落 `.sidelight/trash/20261118-021828-30p6v4-d.md`，「撤销」恢复原字节 `# 待删\n\n删除前的正文。\n`；刷新后树一致 |
| 保存→重开 | b.md 追加后 Ctrl+S，假 fs 为 `# 乙\n\n第二段。追加保存\n`；切走切回内容与标题都在 |
| 无句柄保存 | 文件菜单「新建」→ 未命名.md → 输入 → Ctrl+S：「已保存到 未命名.md」，文件内容 `无句柄测试` |
| 坏 Mermaid | 只出 `.mermaid-preview ProseMirror-widget is-error` + 提示文字，`body` 下只剩 `DIV`+`SCRIPT`；控制台 0 错误 |

第 1 轮用 `Ctrl+N` 测新建时被浏览器抢键（页面没换文档），改走文件菜单后通过，属环境限制不是产品缺陷。

## 未验证

- prod 构建下的 1 MB 耗时与是否仍冻结（不得另起 server）。
- 大文件保存只验到假 fs（`bigSave` len 1,000,016、含追加、提示「已保存 big.md」）；真磁盘未测。
- 表格工具条：检测选择器未命中，未分清产品还是选择器过期。
