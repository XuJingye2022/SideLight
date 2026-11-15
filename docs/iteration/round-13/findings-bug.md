# 第 13 轮 · 缺陷侦察（finder: 缺陷）

日期：2026-11-16。仓库 `D:\Documents\SidelightProgram`，基线 `0842c3b`（产品代码 `971e1ca`，v0.25.0）。
环境：Windows 11、Node 24.21、Edge 157.0.4341.46（WebView2 同内核）、dev `http://localhost:5173`、CDP `127.0.0.1:9222`。
只读侦察：未改 `src/`、`host/`；脚本与日志在 `.tmp/r13-*.mjs`、`.tmp/r13-*.log`，截图为本次实拍。

## 方法

| 探针 | 命令 | 结果文件 |
| :--- | :--- | :--- |
| FSA `move()` 真实能力（OPFS + 原型 + 非法名 + 目录 move） | `node .tmp\r13-cap.mjs` | `.tmp\r13-cap.log` |
| 树排序/层级/长名/空目录/展开态/改名后身份与 Ctrl+S 落点（注入假文件夹） | `node .tmp\r13-tree.mjs` | `.tmp\r13-tree.log`、`shots/round-13/tree-long-name.png`、`shots/round-13/tree-expanded-files.png` |
| 真实本地句柄能否交给页面 | 查 `http://127.0.0.1:9222/json/protocol` | Edge 157 的 `Page` 域只有 `setInterceptFileChooserDialog`，**没有** `Page.handleFileChooser` |

结论先说：本环境无法把一个真实路径交给 `showDirectoryPicker`（CDP 不支持填路径），所以「本地句柄的 `move()`」**未实测**。仓库里唯一可执行的检查是假句柄（`scripts/tree-acceptance.mjs`），不是真实句柄。这是本轮最大的未验证风险。

---

## B1 `move()` 目标已存在时静默覆盖，且本地句柄无实测证据、无回退

**风险**：重命名直接调 `move()`，若目标名已存在，对方文件被覆盖且无提示。本轮若只写「move 成功即改名」，一次手误就丢一篇稿。OPFS 实测已确认覆盖行为；本地句柄无法在本环境实测。外部资料显示 `move()` 先为 OPFS 发布，目录移动一直不支持；本地文件的移动曾长期受限（未在本机复核）。若本地句柄抛 `NotSupportedError`，重命名没有任何回退（第 12 轮删除有 copy+SHA 回退，重命名没有）。

**验证方法**：
1. 在 dev 页执行 `node .tmp\r13-cap.mjs`，看 `opfsTargetExists`：先有 `y.md`（内容 `existing`），再 `z.md.move(a, 'y.md')`，返回 `ok: true`，`y.md` 内容变成 `z`。同目录、跨目录、仅改大小写都成功；`d.move()` 为 `undefined`（目录确实不能改名）。
2. 真实本地句柄：用真人点「打开文件夹」后改名，或 Windows 上手动用两个同名文件重试；本环境 CDP 不能给 picker 路径，未做。
3. 检查假句柄：`scripts/tree-acceptance.mjs:22` 的 `moveEnabled: true` 与 `:154-162` 用 `Object.defineProperty(handle,'move',…)` 手写实现；`:286` 用 `moveEnabled=false` 模拟「无 move」。第 12 轮 40/40 全部跑在这套假 FS 上。

**证据**：
- `.tmp\r13-cap.log`：`opfsSameDir {ok:true, nameAfterMove:"y.md"}`；`opfsTargetExists {ok:true, list:["y.md"], yContent:"z"}`；`opfsBadNames.slash "TypeError: Failed to execute 'move'…"`；`proto.FileSystemDirectoryHandle.move "undefined"`。
- `src/lib/trash.ts:91-93,139-147`：删除已写 `move` 失败回退；`:119` 注释「目录不提供入口」。
- `scripts/tree-acceptance.mjs:154-162`：假 `move` 只改内存 Map，不验证系统行为。

**影响**：数据丢失（目标文件被覆盖）；或功能整块不可用（本地句柄不支持时无回退）。两种都影响公开发布的可信度。

**建议**：
1. `move()` 前先用 `parent.getFileHandle(newName, { create: false })` 探测同名，存在就拒绝并提示「已存在同名文件」，绝不静默覆盖。Windows 大小写不敏感，探测与比较都不区分大小写。
2. 写完名字校验再调 `move()`：非法字符 `[<>:"/\\|?*\u0000-\u001f]`、保留名（CON/PRN/AUX/NUL/COM1-9/LPT1-9）、结尾点/空格、长度、`/`。可复用 `trash.ts:10-23` 的清洗规则，但重命名应「拒绝」而不是「清洗后静默改名」。
3. `move()` 失败时给可读原因，并明确「原文件未动」；不要退回 copy+delete 却不告知（copy 会丢句柄身份，批注/草稿键随之失配）。
4. 目录重命名继续不做，`aria` 与菜单都不给入口。

**难度**：中（探测 + 校验 + 错误文案约 60–90 行）。

---

## B2 改名当前文档后走 `refreshTree()` 会清空身份，Ctrl+S 会用旧名另存为

**风险**：`refreshTree` 按 `activeFile.path` 找新树；路径一变就 `setActiveFile(null)` + `saveTargetRef.current = null`。若实现顺序是「`move()` → `refreshTree()`」，当前文档立刻失去句柄：标题仍是旧名、`docName` 仍是旧名，下一次 Ctrl+S 弹保存对话框，`suggestedName` 是旧名。结果是磁盘上同时存在 `新名.md`（旧正文）和 `旧名.md`（新正文），且用户看到的是「已取消保存」。

**验证方法**（已实跑）：
1. `node .tmp\r13-tree.mjs`：注入假文件夹，点开 `a.md`，在磁盘层把 `a.md` 改名为 `a2.md`，点「刷新文件树」。
2. 观察：选中行 0 个；toast「『a.md』已不在磁盘上（可能已删除、改名或移走），保存只能另存为。」
3. 拦截 `showSaveFilePicker` 后按 Ctrl+S：picker 被调用 1 次，磁盘写入 0 次。
4. 打开普通工作区文件时 `document.title === "Sidelight"`；顶栏文档名是 `a.md`。

**证据**：
- `.tmp\r13-tree.log`：`afterRenameRefresh {activeRows:0, stateName:"a.md", title:"Sidelight"}`；`afterRenameCtrlS {pickerCalled:1, writes:[]}`；`afterOpenTitle:"Sidelight"`。
- `src/App.tsx:1710-1719`：`afterByPath.get(activeFile.path)` 命中失败即清空 `activeFile` 与 `saveTargetRef`。
- `src/App.tsx:1922-1930`：`finishSaved` 只按「原 path 的目录 + 新 name」重算 path，不迁移批注/草稿键，也不需要 `move()`。
- `src/App.tsx:615-618`：标题只在宿主文档时更新；`:1950` 保存后才更新；工作区打开/改名都没有标题同步点。
- `src/App.tsx:3430`：顶栏文档名取 `docName`，改名后必须显式 `setDocName`。

**影响**：用户重命名当前文档后，保存落到错误文件名，产生重复文件；标题与顶栏名称失真，易误判「没保存」。

**建议**：做一个 `adoptRenamedFile(oldNode, newName, newHandle)`：一次更新 `activeFile`（name/path）、`saveTargetRef`、`docNameRef`+`setDocName`、`document.title`、`localStorage` 里的 `name`，**先更新状态再刷新树**（或让刷新跳过刚改名的节点）。改名后 Ctrl+S 必须写新路径，不弹对话框。用假 FS 加回归断言：改名 → 光标留在原文件 → 按 Ctrl+S → 写入次数 1、路径为新名、picker 未调用。

**难度**：中（状态点多，但都是既有 setter；关键在顺序与一处统一函数）。

---

## B3 扩展名/点开头名字改名后，文件从树里静默消失

**风险**：`readDirectory` 只收 `.md`/`.markdown` 且跳过 `.` 开头的项（`src/lib/workspace.ts:62,78-81,94`）。如果允许把 `a.md` 改成 `a.txt` 或 `.a.md`，`move()` 成功、树刷新后该文件不再显示；当前文档同时按 B2 失去身份，用户既看不到文件，也写不回原路径。扩展名变化是简报点名要处理的项。

**验证方法**（已实跑）：`node .tmp\r13-tree.mjs`，把 `a2.md` 在磁盘层改名 `a2.txt`，点刷新。树里只剩「第2章.md / 第10章.md」，而 `existsOnDisk` 为 `true`。截图 `shots/round-13/tree-long-name.png` 的 toast「已刷新：新增 0 个，消失 1 个」。

**证据**：
- `.tmp\r13-tree.log`：`extensionChange {treeFiles:["第2章.md","第10章.md"], existsOnDisk:true}`。
- `src/lib/workspace.ts:78-81`：`isMarkdown` 只认两个后缀；`:94`：`name.startsWith('.')` 直接跳过。
- 现有新建流程没有此问题（`nextNewName` 固定 `.md`，`App.tsx:1840-1847`），改名输入框是第一个自由输入点。

**影响**：用户以为改名失败或文件丢失；再次打开只能靠资源管理器，且不会有任何提示。

**建议**：改名输入框只允许 `.md`/`.markdown`，扩展名省略时自动补 `.md`；拒绝 `.` 开头；拒绝后原地保留输入框并给原因。若产品决定允许其它后缀，则必须在树里显示它（与「文件树只显示 Markdown」的既有决策冲突，需要产品决定，本轮不建议打开）。

**难度**：小（校验 + 文案 + 一条测试）。

---

## B4 改名不迁移 `.sidelight` 缓存与批注键，旧键留孤儿、批注恢复不到

**风险**：草稿与批注的文件名由「当前文件名」算键。改名后：新键没有草稿/批注；旧键的 `.md`/`.json` 留在原目录，成为孤儿；重新打开改名后的文件，`restoreAnnotationsFor` 读新键为空，用户看到「批注全没了」。删除清理与保存清理都存在，唯独改名没有清理/迁移路径。

**验证方法**：
1. 代码核对：`grep -n "cacheKey(file.name)\|cacheKey(node.name)\|removeCache" src/App.tsx`，只出现在删除（`:1791-1792`）与保存（`:1965-1966`）路径。
2. 运行时（未做）：注入假 FS，打开 `a.md` 打字触发 800 ms 草稿，检查 `.sidelight/drafts/a.md`；磁盘改名后刷新再打字，确认没有新键写入、旧草稿仍在。本轮未加这一步，标「未验证」。

**证据**：
- `src/App.tsx:754-768`：每次编辑按 `cacheKey(file.name)` 写 `.sidelight/drafts`，键名来自当时 `fileRef.current`。
- `src/App.tsx:2403-2408`：自动保存失败的兜底草稿同样按 `file.name`。
- `src/App.tsx:1524`：打开文档只读 `cacheKey(file.name)` / 旧截断键，没有任何迁移。
- `src/App.tsx:1961-1967`：只有保存成功才清旧名与新名草稿；`:1788-1796`（删除）清草稿与批注。改名两条都不走。
- `src/lib/cache.ts:51-73`：键只由文件名决定。`a.md`→`a.markdown` 键相同（不迁移也碰巧正确），`a.md`→`b.md` 键不同。

**影响**：批注不可见（页边批注是本产品核心差异点）；`.sidelight/drafts`、`annotations` 累积孤儿文件，增长不可控（ADR-0013 明确「不自动清理」）；`recent.json` 里旧路径的条目也会变成打开失败（宿主无改名消息，`host/Program.cs` 只有 open/remove/clear/restore 四类）。

**建议**：改名成功后，对 `draft` 与 `annotations` 各做一次「读旧键 → 写新键 → 删旧键」（`readCache`/`writeCache`/`removeCache` 已有），失败只提示不阻断；同目录 `move()` 可用时直接 `move` 缓存文件更省。把旧名与新名都记进一次 `removeCache` 兜底，避免半途失败留两份。`recent.json` 的旧条目在本轮不改，写进文档「已知限制」。

**难度**：中（两个键 × 三个操作，需处理失败）。

---

## B5 树的细节：展开态切页签即丢；长目录名换行不截断、无 title；空目录展开无提示

**风险**：简报第 2 条要求「展开态跨页签保持」。当前 `FileTree` 在切到「大纲」时被整体卸载，`expanded` 是组件内 `useState`，切回后全部收起；`focusPath` 也一起丢，键盘导航回到活动文件。另外长目录名在 218 px 侧栏里换行成 3 行（无省略号、无 `title`），行高不齐；空目录展开后只有一个空的 `role="group"`，没有任何提示。

**验证方法**（已实跑）：`node .tmp\r13-tree.mjs`。
1. 展开「第一章」→ 子文件 `b.md` 可见（1 个）→ 点「大纲」→ 点「文件」→ `b.md` 可见数 0，`aria-expanded="false"`。
2. 长目录名：`whiteSpace:"normal"`、`textOverflow:"clip"`、`title:null`；展开「空目录」后 `groupChildren:0`、`hint:false`。
3. 截图 `shots/round-13/tree-expanded-files.png`、`shots/round-13/tree-long-name.png`（长名 3 行、箭头只在首行）。

**证据**：
- `src/App.tsx:3756-3779`：`sidebarTab === 'files' || treeCollapsed ? <FileTree/> : <Outline/>`，FileTree 被卸载。
- `src/components/FileTree.tsx:62`：`const [expanded] = useState<Set<string>>(() => new Set())`；`:67` 同款 `focusPath`。
- `src/styles.css:492-506`：`.tree-dir-name` 无 `overflow`/`text-overflow`/`min-width:0`；`:458-463` 只给 `.tree-file` 加了省略号。
- `src/components/FileTree.tsx:215`：文件行有 `title={node.path}`；目录行（`:243-253`）没有 `title`。
- `src/components/FileTree.tsx:254-258`：展开的空目录只渲染空 `div[role=group]`，无条件提示。

**影响**：用户在大纲与文件之间来回切换后要重新展开；深目录在 218 px 里被长名占满，同级行对不齐；空目录看起来像「加载失败」。

**建议**：把 `expanded`（以及 `focusPath`）提到 `App` 并随 `workspace` 变化重置，或两个面板都保留挂载、用 CSS 隐藏（注意首屏预算，lift state 更省）。目录名单行省略 + `title`（文件与目录都能看全名）；展开后子项为 0 时显示「空文件夹」一行（沿用 `.file-tree-empty` 样式）。缩进目前每层 10 px（`styles.css:444-450`），与行内 8 px padding 太接近，可加到 12–14 px 并配一条 1 px 引导线，便于看清层级。

**难度**：小到中（state 上提 + 两处样式 + 一行空提示）。

---

## 未验证（本环境做不了，别写成已修）

- 本地文件句柄的 `move()`：成功/失败、覆盖同名、仅改大小写、保留名（`con.md`）、只读与权限被撤销、跨目录。验证方法：真人用「打开文件夹」选真实目录后改名；或用带 `--auto-open-devtools` 的本地 Chrome 手动执行同一段代码。CDP 在 Edge 157 没有 `Page.handleFileChooser`，给不了路径。
- 权限撤销（`requestPermission` 到期/只读目录）下的改名错误路径与「原文件是否完好」。
- 网络盘/OneDrive 占位文件上的 `move()`。
- 中文/超长路径改名后树与 `title` 的表现。
- 批注键迁移的运行时验证（只有代码证据，见 B4）。
- 同一秒内两次改名、并发刷新与改名交错的真实时序。

## 优化机会（最多 3 条）

1. **死代码**：`fileMtimeRef` 只写不读（`src/App.tsx:522` 声明，`:1601` 清零，`:1603-1606` 写入；全仓库无读取）。删掉 5 行。
2. **路径→目录句柄有两套实现**：`src/lib/workspace.ts:138-156` 的 `parentDirectory` 与 `src/lib/trash.ts:80-89` 的 `parentForPath` 做同一件事，前者的「首段是工作区名」假设在后者重复一次。合并成一个 `directoryForPath(root, path)`，改名/删除共用。
3. **草稿写入三个入口**：`onUpdate`（`src/App.tsx:753-769`）、`writeDraftFallback`（`:2398-2418`）、宿主 `scheduleHostDraft`（`:2322-2337`）各算一次键、各写一次盘。抽一个 `persistDraft(text, {host, file})`，顺便在改名时只有一处需要改键。

## 附：本次实跑的关键输出（原文）

`opfsTargetExists`（` .tmp\r13-cap.log`）：

```
{ "ok": true, "list": ["y.md"], "yContent": "z" }
```

`afterRenameRefresh` / `afterRenameCtrlS`（`.tmp\r13-tree.log`）：

```
"afterRenameRefresh": { "activeRows": 0, "title": "Sidelight", "stateName": "a.md",
  "treeFiles": ["第2章.md","第10章.md","a2.md"] }
"afterRenameCtrlS": { "pickerCalled": 1, "writes": [] }
"extensionChange": { "treeFiles": ["第2章.md","第10章.md"], "existsOnDisk": true }
"expandedBeforeTab": 1, "expandedAfterTab": 0, "dirAriaExpandedAfterTab": "false"
"emptyDir": { "ariaExpanded": "true", "groupChildren": 0, "hint": false }
"overflow": { "longRowScrollWidth": 205, "longRowClientWidth": 205,
  "whiteSpace": "normal", "textOverflow": "clip", "title": null, "ariaLevel": "1" }
```

外部资料（未在本机复核，仅供 B1 的风险判断）：[Chrome 102 加入 `FileSystemFileHandle.move()`，仅文件、且目录不支持](https://github.com/mdn/browser-compat-data/commit/b2bf4757e721bdd7dba818521f2ddfd6e7399063)；[W3C TAG 提案：非 OPFS 的移动当时尚未支持](https://lists.w3.org/Archives/Public/public-webapps-github/2023Jan/0406.html)。
