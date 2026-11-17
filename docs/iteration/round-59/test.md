# 第 59 轮验收（tester，B 轮）

判定：**PASS**。B-104 全局搜索、B-102 文件列表两任务按验收标准从零复验通过；三条门禁全绿；回归 54/56，两条 FAIL 与第 58 轮基线同两条已知过期断言。

git：轮前 `339a4787` → 本轮 commit 后 `git rev-parse HEAD` 不同即过。

## 门禁

| 门 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run verify` | **PASS**。首屏 gzip **299,727 B**（内部 310,000 / 硬线 320,000，余 20,273；首屏 3 文件），`GlobalSearch` 独立惰性 chunk、不进首屏 | `.tmp/r59-verify.log` |
| `npm test` | **40 文件 504 条全过**（fail 0）。轮前 `339a4787` 已是 39 文件 495 条 → 本轮 **+1 文件 +9 条**（`globalSearch.test.ts`）。验收文的「37 → 39」是第 58 轮前旧计数（BRIEF 快照过期），实际增量与要求一致 | `.tmp/r59-npm-test.log` |
| `npm run roundtrip` | 未跑：diff 不碰编辑器与序列化（`serializeDocument.ts`、`escapes.ts` 0 改动） | `git diff --stat` |

## B-104 全局搜索（全过）

自写 `.tmp/e2e-r59-tester.mjs`（不复用实现脚本）：递归 `mkDir` 注入 VFS `ws59/ch1/a.md`、`ws59/ch1/sub/b.md`、`ws59/c.md`（两层子目录）。

- 树：展开 `ch1`、`sub` 后 `.tree-file` = `b.md, a.md, c.md` **3 个**。
- 搜「灯火」→ **3 条**，路径行号 `ch1/sub/b.md:3`、`ch1/a.md:3`、`c.md:1`，片段为「乙篇的灯火在此。」「第一段的灯火。」「写在最后的灯火。」，note「3 处」。三份正文的 `灯火` 确在第 3/3/1 行、列 4/6/6（列号另由单测盖）。
- 点第 2 条 → 对话框关、标题 `a.md — Sidelight`、正文「甲章 / 第一段的灯火。」、查找条开着且回填 `灯火`、`find-count` **1 / 1**、树里 `a.md` 活动、正文 1 处高亮。调用链核对 `App.tsx:2520 openGlobalSearchHit`：按 `path` 找节点 → `openWorkspaceFile` → `setQuery` → `setFindOpen(true)`。
- Esc：对话框消失、`[inert]` **7 → 0**、焦点落回 `DIV.tiptap ProseMirror…ProseMirror-focused`（`inEditor:true`，非 body）。`useDialogFocus`（`GlobalSearch.tsx:20`）的两个可见行为（inert、opener 还原）都在；Esc 只有 window 一处兜底（`App.tsx:3970`）+ 输入框内 `stopPropagation`。
- 无工作区：reload 后按 `Ctrl+Shift+F` → toast「先打开文件夹，再全局搜索（Ctrl+Shift+F）」（`App.tsx:4108`），对话框不出现。
- 单测 9 条全过：行列号（UTF-16）与 CRLF、同行多次各记一条、**200 条截断**、**> 1 MiB 跳过（UTF-8 字节，40 万汉字也跳）**、大小写开关、空查询与正则字面、`collectDocs` 坏句柄跳过后仍搜其余、`capped`、两条文件门槛互不影响。分层与验收一致：`searchWorkspace` 纯函数（`globalSearch.ts:74-120`）+ `collectDocs` 逐个 try/catch（`:126-148`）。
- 截图 `shots/round-59/global-search.png`。

## B-102 文件列表形态（全过）

自写 `.tmp/e2e-r59-tester-b2b.mjs`，1000×620，同一套 VFS。

- 切「列表」→ `.file-list-row` **3 行**，名称/相对路径：`b.md`/`ch1/sub/b.md`、`a.md`/`ch1/a.md`、`c.md`/`c.md`；`role=tree` 容器同时消失（两态互斥）；切换钮 `aria-pressed` 树=false / 列表=true。
- 点第 1 个（b.md）→ 标题 `b.md`、正文「乙 / 乙篇的灯火在此。」；再点第 2 个（a.md）→ 标题 `a.md`、正文「甲章 / 第一段的灯火。」，活动行 `aria-current="true"`。**标题与正文两次都变**（只点一次时正文恰好是上一阶段残留的 a.md，故补脚本先点 b.md 再点 a.md）。
- 切回「树」→ 3 文件原结构恢复（`role=tree` 回来、活动行 `a.md`、列表行 0），展开态保留。
- 横向：`.file-list` `scrollWidth = clientWidth = 217`，`documentElement` **1000 / 1000**（树态、列表态各量一次），无横向滚动。
- 已知限制（按验收保留）：列表态右键无菜单——右键后 `.tree-row-menu` 为 0，删除/重命名只在树态。代码 `FileTree.tsx:125,389,460`；`App.tsx:394-395,5456`。截图 `shots/round-59/file-list.png`。

## 回归

- `scripts/tree-acceptance.mjs`（`SIDELIGHT_URL=http://localhost:5175`）：**54 PASS / 2 FAIL, exit 1**。两条 FAIL 与第 58 轮基线逐字相同（`round-58/test.md:147` 记 54/56；源头第 34 轮 `test.md:100-101`）：`外部删除后 Ctrl+S 不写原路径`（刷新后键入再 `Ctrl+S` 多一次写）、`大纲顶与页签底对齐`（`display:none` 时量 rect：133.5 vs 120）。diff 不碰保存链与大纲，属既有脚本过期，非本轮回归。跑完已 `git checkout -- shots/round-16`（8 张还原，`git status` 干净）。

## UNVERIFIED / 注意

- 真实 FSA 句柄与真实磁盘写回：E2E 用合成句柄；中文 IME、宿主 WebView2 未验（本轮无宿主改动）。
- 200 文件上限与 1 MiB 跳过的 **UI 文案**只由单测与代码核对，未造 200 篇 + 超大文件的真工作区跑 UI。
- BRIEF「37 文件 473 条」与验收文「37 → 39」均为第 58 轮前快照；实际轮前 39/495、轮后 40/504。
