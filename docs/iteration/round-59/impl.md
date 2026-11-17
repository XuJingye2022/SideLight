# 第 59 轮 executor 实现报告

startSha `339a4787`；未 commit/push、未动 `release/` 与版本号。`round-59/plan.md` 不存在（只有 `findings-delta.md`），按派单任务实现 B1/B2。

| 任务 | 状态 | 说明 |
| :--- | :--- | :--- |
| B1 B-104 全局搜索 MVP | DONE | 纯函数 + 收集层 + 懒加载对话框 + 快捷键 + 单测 + E2E |
| B2 B-102 文件列表侧栏 | DONE | 树/列表两态 + 相对路径 + E2E |

## B1

- `src/lib/globalSearch.ts`（新）：`searchWorkspace(docs,query,limits)` 纯函数，1 起算行列/片段，`maxResults/maxFiles/maxBytes/caseSensitive`，超限 `truncated`、超 1 MiB 计 `oversized`；`collectDocs(files,limits)` 逐个 `readNode` + `catch` 跳过，按 UTF-8 字节跳过 >1 MiB，超 200 文件记 `capped`。
- `src/lib/globalSearch.test.ts`（新，9 条）：行列号、CRLF、同行多次、200 条截断、>1 MiB（ASCII+1 B、40 万汉字 1.2 MB）、大小写、空查询/正则特殊字符、collectDocs 跳过与 capped。
- `src/components/GlobalSearch.tsx`（新，lazy）：`useDialogFocus`、回车搜索、「相对路径:行号」+ 片段、`aria-live` 状态行。
- `src/App.tsx`：`Ctrl+Shift+F`（无工作区提示「先打开文件夹…」不开框）；Esc 置顶关框 + rAF 焦点回正文/源码框；`dialogOpen`/`productCombo` 同步；点结果 `openWorkspaceFile` + `setQuery` + `setFindOpen(true)`。
- `src/lib/workspace.ts`：`relativePath()`（结果行与列表态共用）；`styles.css`：`.global-search-*`；`ShortcutsDialog.tsx` 加键位；`package.json` test +1。

## B2

- `FileTree.tsx`：`view/onViewChange`；头部「树/列表」`aria-pressed`；列表态 `flattenFiles` 平铺 `button`（文件名 + 相对路径、`aria-current`、`is-active`），容器 `aria-label="文件列表"`；树态保留 `role="tree"` 与方向键导航，展开态不丢。
- `App.tsx`：`fileView`（会话内）；`styles.css`：`.tree-view-toggle`、`.file-list-*`（两级省略、`overflow-x:hidden`）。
- 已知限制：列表态无右键删除/重命名（行菜单只在树行）。

## 门禁

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | 0 error（`.tmp/r59-tsc.log`） |
| `npm test` | **40 文件 504 条 0 fail**（改前 39/495；`.tmp/r59-npm-test.log`） |
| `npm run verify` | PASS；首屏 gzip **299,727 B**，余 20,273（`.tmp/r59-verify.log`） |
| `npm run roundtrip` | 未跑：未改编辑器/序列化 |

验收写「37→39」是第 58 轮 A2 前的数；本轮实测 39→40 个文件（+9 条）。

## E2E（9222，先 reset）

- `.tmp/e2e-r58-b1-search.mjs`（`.tmp/r59-b1-search.json`）**7/7 true、0 error**：无工作区 toast 含「先打开文件夹」且不开框；VFS 两层展开 3 文件；搜「灯火」3 条，行号 `衬景/深层/丙.md:5`、`衬景/乙.md:3`、`甲.md:3`；Esc 后框关、`activeElement` 在 `.ProseMirror`；点第 2 条开 `乙.md`、查找条 `1 / 1`。
- `.tmp/e2e-r58-b2-flat.mjs`（`.tmp/r59-b2-flat.json`）**8/8 true**：3 行皆 `BUTTON` 且含相对路径；Tab 可进首行；点第 2 行标题/正文变 `乙.md` 且行高亮；切回树 3 文件；1000×620 `docOverflow=0`、列表 `scrollWidth-clientWidth=0`。

截图：`shots/round-59/global-search.png`、`shots/round-59/file-list.png`。

## CHANGELOG 建议

- 新增：`Ctrl+Shift+F` 跨文件全局搜索（相对路径:行号，点结果打开文件并回填查找条）。
- 新增：文件侧栏「树 / 列表」两态，列表态平铺相对路径。

## 新坑

1. 关全局搜索只靠 `useDialogFocus` 还原焦点会落到顶栏「文件」钮：Esc 后要 rAF `focusEditor()`/`focusSourceEditor()`。
2. `flattenFiles` 是「目录在前」的顺序（本轮 丙→乙→甲）：E2E「第 2 条」不是按文件名排序的第 2 个。
3. 列表态头部多两个切换钮，Tab 多 4 站：脚本循环按 Tab 到 `.file-list-row` 为止，写死次数会假红。
