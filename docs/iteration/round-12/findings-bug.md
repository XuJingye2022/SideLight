# 第 12 轮 · 缺陷发现（bug finder）

范围：文件树删除 / trash / 刷新 / 可访问性。只读 `src/`，未改产品代码。

环境：dev server `http://localhost:5173`；CDP `127.0.0.1:9222`；headless Edge `157.0.4341.46`，与已装 WebView2 运行时同版（注册表 `pv` = 157.0.4341.46）。

方法：原生目录选择器不能自动化，改用 `navigator.storage.getDirectory()`（OPFS）取真实 `FileSystemDirectoryHandle` 做 API 语义实验。OPFS 与本地目录共用同一套 FSA 方法，权限模型不同。凡未在真实目录上跑过的都标「未验证」。

脚本：`.tmp/r12-fsa-probe.mjs`、`r12-fsa-probe4.mjs`、`r12-move-probe.mjs`、`r12-a11y-probe.mjs`、`r12-outline3.mjs`。
截图：`shots/round-12/a11y-tree-demo.png`、`shots/round-12/outline-a11y.png`。

## 摘要

| 编号 | 影响 | 一句话 |
| :--- | :--- | :--- |
| B1 | 致命 | 删除当前文档后旧句柄仍可写，自动保存把文件**复活**；失败提示误导 |
| B2 | 高 | 文件夹删除只能永久删（绕过 trash），且会带走树里看不见的文件 |
| B3 | 高 | 没有刷新；补刷新时两处必然踩的坑已实测 |
| B4 | 中高 | trash 命名冲突**静默覆盖**旧副本；权限/目录失败时必须中止删除 |
| B5 | 中 | 树/大纲/标签页无语义，页面静止时无 live region（与 UX U4/U5 重叠） |

## B1 删除当前文档后仍可写回，自动保存把文件复活

**风险**：删除文档后，编辑器仍持有该文件的 `FileSystemFileHandle`。对已删文件调用 `createWritable()` 不报错，反而按原路径把文件建回来。

**实测**（OPFS，`r12-fsa-probe4.mjs`）：

```
before        ["live.md"]
removeEntry   ok
afterDelete   []              ← 文件确实删掉了
staleWrite    ok: wrote       ← 对已删文件的旧句柄写入成功
afterStaleWrite ["live.md"]   ← 文件回到目录
content       "autosave"
```

自动保存路径正好走这个句柄：`runAutoSave` → `performCommit`，目标取 `activeFile.handle`（`src/App.tsx:1804-1810`、`:2225`、`:2257`），2 s 防抖（`:2288`）。

**后果**：用户删除文档 → 2 s 内继续打字 → 文件回到磁盘，trash 里还有一份，两份内容不同。用户以为删了，实际没删。

**连带问题**：真实 NTFS 上旧句柄写入是否同样复活未验证。若抛 `NotFoundError`，提示是 `保存失败：A requested file or directory could not be found at the time an operation was processed。改动还在，可以再试一次。`——`reasonOf` 直接拼 DOMException 英文 message（`src/App.tsx:159-162`），且「再试一次」永远不会成功。删除后不切文档就没有任何代码取消自动保存（切文档才取消，`src/App.tsx:1571`）。

**建议**：删除成功的那一刻同时做四件事：`cancelAutoSaveRef.current()`；`setDirty(false)`；若被删的是 `activeFile`，清 `saveTargetRef`、`setActiveFile(null)`，并把编辑器标成「已从磁盘删除」（保存只能另存为）；trash 用 `move()` 而不是复制+删除（见 O1）。

**难度**：S–M（4 个状态点 + 1 条提示分支）。

## B2 文件夹删除绕过 trash，并删掉树里看不见的文件

**风险 1**：没有目录复制/移动 API。实测 `FileSystemDirectoryHandle.prototype.move === undefined`，`copy` 不存在。实现若直接 `removeEntry(name, { recursive: true })`，整个文件夹**永久删除**，trash 方案对目录完全失效。

**实测**：非空目录 `removeEntry` 不带 recursive → `DOMException:InvalidModificationError`，目录保留；带 recursive → 成功，子项消失。所以「忘记递归」是安全的失败模式，只是错误文案不可读。

**风险 2**：树只收录 `.md/.markdown` 且跳过 `.` 开头的项（`src/lib/workspace.ts:87-107`，`:94`、`:98`）。用户眼里的文件夹还可能含图片、附件、`.txt`。树上的「删除文件夹」会把这些文件一起删掉，用户看不见它们。图片功能已经会往同级 `assets/` 写文件（`parentDirectory`，`:135-153`），所以这是现实场景，不是假想。

**风险 3（反向）**：「删除根目录」结构上做不到。FSA 没有父句柄，`removeEntry` 只作用于目录内条目。真实风险是对根节点做「清空」循环。另有一个陷阱：不能把「删除选中节点」实现成 `rootHandle.removeEntry(node.name)`；那是按名字删根目录的**子项**，同名子目录会被误删。

**建议**：文件夹删除先完整递归复制到 trash，保留相对路径，任意一项失败就中止并保留原目录；做不到就明确降级为「永久删除文件夹」，确认框写清「文件夹内所有文件（包括图片）不进回收站」。不要只搬 `.md`。根节点不提供删除入口。

**难度**：M（递归复制 + 失败中止 + 确认文案）。

## B3 没有刷新；补刷新时两处必然踩的坑

**现状**：`FileTree` 的 props 没有刷新（`src/components/FileTree.tsx:5-15`），App 里没有 refresh 函数；`readDirectory` 未导出（`src/lib/workspace.ts:87`），要刷新必须先导出或复制一份。

**坑 1：一个子项消失就毁掉整次刷新。** 实测：目录被删后继续迭代它，`for await (const [name] of dir.entries())` 抛 `DOMException:NotFoundError`。`readDirectory` 对每个 entry 没有 try/catch，也没有深度上限，所以任一子目录在读取时消失、无权限、或是坏链接，整个刷新抛错，树停在旧快照，界面上表现为「点了没反应」。建议逐项 try/catch，失败的节点保留旧内容并标注读取失败。

**坑 2：刷新后 `activeFile` 的句柄不更新。** `setActiveFile` 只在 `loadIntoEditor` 里发生（`src/App.tsx:1569`）。文件被外部改名前刷新，树里的旧 path 消失；被外部删除后刷新，`activeFile` 仍指向旧句柄：再点开 → `readNode` 抛 `NotFoundError` → 英文 toast；继续编辑 → 走 B1 的复活路径。建议刷新后按 path 重新绑定句柄；找不到就把当前文档标成「磁盘上已不存在」。

**次要**：展开状态是 `FileTree` 内部 `useState`（`src/components/FileTree.tsx:90`）。刷新替换 `workspace` 不会重置它，被删目录的 path 残留（无害）；但如果实现用 `key` 重建 `FileTree`，全部展开状态会丢。新建文件现在直接 append 到 children 末尾（`src/App.tsx:1688-1692`），破坏 `collator` 排序，直到下次打开文件夹。

**难度**：S（导出函数 + 逐项兜底 + 句柄重绑）。

## B4 trash 命名冲突静默覆盖；权限/目录不可用时必须中止删除

**冲突（实测）**：`getFileHandle(name, { create: true })` 对已存在文件返回**同一个句柄**，写入直接截断。同名两次写入结果：

```
sameEntry  true
text       "SECOND"     ← 第一份内容消失
```

`<时间戳>-<名字>` 在同一秒内删两篇同名文件（不同目录），或「删 → 重建 → 再删」，就会覆盖上一份 trash 副本。时间戳到秒不够。

**其它实测**：trash 名里带 `/` → `TypeError: Name is not allowed`（把相对路径直接当名字会炸）。`.sidelight` 已被同名文件占用 → `getDirectoryHandle` 抛 `TypeMismatchError`；`cache.ts:91-101` 已经示范「返回 null、不抛」，trash 也应照做。

**权限**：`pickWorkspace` 只请求一次 `readwrite`（`src/lib/workspace.ts:121`），全仓库没有 `queryPermission` / `requestPermission`（grep 只命中 `cache.test.ts:166` 的 mock）。会话中权限被撤销或用户只给只读时，删除与写入抛 `NotAllowedError`。

**未验证**：原生选择器拒绝授权、会话中撤销权限、只读目录、网络盘（没有自动化原生选择器的手段）。

**建议**：命名用 `YYYYMMDD-HHmmss-<4 位哈希>-<原名>`；先 `create:false` 探测，冲突加序号；复制后校验字节数再删原件；任一步失败保留原件并给可操作提示；删除文件时同时 `removeCache` 清掉草稿与批注（`src/lib/cache.ts:183`）。

**缓存提醒**：`cacheKey` 只按文件名（`src/lib/cache.ts:51-58`），删除后同名重建会带回旧草稿/批注；跨目录同名文件本来就共享同一个键。

**难度**：M。

## B5 可访问性：树/大纲/标签页没有语义，静止时没有 live region

本节与 UX 报告的 U4/U5 重叠，这里只补我实测到的数据。

- 文件树是 `aside`，AX 角色 `complementary`；没有 `role="tree"/"treeitem"`，没有 `aria-selected`、`aria-level`。
- 5 个文件 + 1 个收起按钮 = **6 个 Tab 停靠点**（`tabIndex` 全为 0，没有 roving tabindex）。实测按 `ArrowDown`，焦点不动；Tab 只走到下一个文件。代码里没有任何树的键盘处理。
- 大纲：当前章节只靠 `.is-active` 类，无 `aria-current`、无 `aria-level`；条目是普通 button（`src/components/Outline.tsx:22-38`）。实测 `ArrowDown` 无效。
- 侧栏「文件 / 大纲」是普通 button，无 `role="tab"`、无 `aria-selected`、无 `aria-controls`（`src/App.tsx:3525-3539`）。屏幕阅读器听不出哪个面板被选中。
- 页面静止时 `[role="status"]` = 0、`[aria-live]` = 0、`.toast` = 0。toast 与横幅都是「节点带文本一起挂载」（`src/App.tsx:3694`、`:3593`）。屏幕阅读器对后插入的 `role="status"` 是否播报不稳定——实际播报未验证。

**修正一条待办**：AX 树里 25 个 button 全部有可访问名字，没有无名按钮；`‹`/`›` 有 `aria-label`，H1/H2/B/I/S 有文字或 `title`。待办池里「部分图标按钮缺 `aria-label`」在抽查中不成立，别把它当验收项。

**建议**：树加 `role=tree/treeitem`、`aria-selected`、roving tabindex 与方向键；大纲加 `aria-current="location"` 与 `aria-level`；标签页用 `role=tablist/tab` + `aria-selected`；toast 改成常驻 `<div aria-live="polite">`（错误用 assertive），只换文本。

**难度**：M。

## 优化机会（3 条）

**O1 用 `FileSystemFileHandle.move()` 做 trash，优先于复制+删除。**
实测 Edge 157 支持且可用：`move(trashDir, name)` 后原位置消失、trash 里有原内容；`FileSystemFileHandle.prototype.remove()` 与 `FileSystemDirectoryHandle.prototype.remove()` 也存在（空目录可删）。`move()` 是原子的，直接消掉「已复制未删原」的半完成状态。目录没有 `move`/`copy`，目录仍要递归复制或降级。注意：浏览器侧实测通过，已装 WebView2 同为 157.0.4341.46 但**未在宿主里直接验证**；实现应保留「无 `move` 时复制+删除」的回退，两条路径都要测。

**O2 抽一个 `refreshWorkspace()` 同时服务新建、删除、刷新。**
导出 `readDirectory`，在一个函数里完成「重读 → 排序 → 重新绑定 activeFile」，新建文件也走它。现在新建是手工 append（`src/App.tsx:1688-1692`），刷新要做第二套快照逻辑，两套必然分叉。

**O3 删除后清理 `.sidelight`，并考虑把 `cacheKey` 从文件名改成相对路径。**
现在同名文件串草稿与批注（`src/lib/cache.ts:51-58`）；删除不清缓存，同名重建会带回旧批注。改成相对路径会打破既有缓存键，需要双键读或迁移。
