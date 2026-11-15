# 第 12 轮 · 体验与界面发现（UX finder）

范围：文件树操作入口、删除确认、空文件夹与刷新、可访问性。只读 `src/`，未改代码。
环境：应用 `http://localhost:5173`；CDP `127.0.0.1:9223`（headless Edge 157.0.4341.46，与已装 WebView2 运行时 157.0.4341.46 同版）。真实文件夹用 OPFS 造目录 + 覆盖 `showDirectoryPicker`，照 `scripts/qa7.mjs` 的既有做法。
截图：`shots/round-12/ux-*.png`。脚本：`.tmp/r12-ux/probe*.mjs`，日志 `.tmp/r12-ux/probe*.log`。

## 结论摘要

1. 树头没有任何「新建文件夹 / 删除 / 刷新」入口，全应用搜索这些词的结果是 0。唯一的新建按钮「＋ 新建文件」只有 96px，旁边的「打开其他文件夹」在 1440/1280/1024 三档都折成两行。
2. 删除功能不存在，所以「删除确认文案」要新建。应用能写 `.sidelight/`，回收站方案可行；但浏览器拿不到绝对路径，文案只能写相对目录。
3. 空目录展开后什么都不显示（`aria-expanded` 变了，视觉零反馈）。没有刷新，外部改动完全无感。
4. 树没有 `role="tree"/"treeitem"`，没有 `aria-selected`，方向键完全无效；从页面开头按 Tab 到文件树要按 **19 次**，之后再逐个按过每个文件。
5. toast 节点是「带文本一起插入」的 live region（闲置时 `[role="status"]`/`[aria-live]` 节点数为 0），屏幕阅读器常不播报；大纲当前项没有 `aria-current`。

## U1 树头没有新建文件夹/删除/刷新入口，唯一入口还换行（影响最大）

证据
- 全应用按钮搜集：`删除|刷新|重命名|新建文件夹|trash` 命中 0 个（probe1 E 段）；代码里唯一的「移除」是最近列表的「从列表移除」（`App.tsx:2069`），不碰磁盘。文件菜单项只有新建/另存为/打开文件/打开文件夹（`src/components/FileMenu.tsx:18-23`），没有工作区操作。
- 树头动作区只有两个按钮：`src/components/FileTree.tsx:153-161`；样式 `flex: 1` + `font-size: 12px`（`src/styles.css:295-307`）。渲染尺寸各 96×42px；「打开其他文件夹」内部折行成「打开其他文件 / 夹」，1440/1280/1024 三档都这样（`ux-folder-1440.png`、`ux-folder-1280.png`、`ux-folder-1024.png`）。
- 三种状态的差异（截图对照）：

  | 状态 | 树头 | 动作区 | 列表 | 截图 |
  | --- | --- | --- | --- | --- |
  | 没打开文件夹 | 无 | 无 | 「现在打开的是示例 / 先打开一个文件夹，保存才会写回」+ 打开文件夹、打开文件、试用示例 | `ux-null-1440.png` |
  | 示例 | 示例文集 + 「示例」徽标 + `‹` | **空**（只有一行「改动不写盘，保存会另存为」） | 5 篇示例，无目录 | `ux-demo-1440.png` |
  | 文件夹 | 名字 + `‹` | ＋ 新建文件 / 打开其他文件夹 | 树 | `ux-folder-1440.png` |
  | 空文件夹 | 同上 | 同上 | 「这个文件夹里没有 Markdown 文件」 | `ux-empty-workspace-1024.png` |

- 示例态里连「新建」都没有：用户想离开示例只能自己发现顶栏「文件 ▾」。`onNewFile` 其实在示例里也能用（`App.tsx:1673-1700` 走内存分支），按钮却被藏了。
- 选中态与当前文档不一致：换文件夹后旧文档仍留在编辑器，树里没有高亮项（`ux-tree-focus-1440.png` 顶部标题是「开始写.md」，树是「长篇笔记」）。`openFolder` 只调 `setWorkspace`，不换文档（`App.tsx:1622-1633`）。

改法（建议布局，已做静态注入验证，见 `ux-proposal-header-1440.png`、`ux-proposal-header-1024.png`）

```
长篇笔记                    ‹
[ ＋ 新建 ▾ ] [ ⟳ ] [ ⋯ ]
```

- 三档宽度都是 217px（`width: 218px` 减 1px 边框），一行放得下：主按钮 141px、两个图标按钮 26×26，整块高 35px（原动作区 50px）。
- `＋ 新建 ▾` 菜单两项：新建文件（沿用 `Ctrl+Alt+N`）、新建文件夹。默认点主按钮等于新建文件。
- `⟳`：刷新文件树。`aria-label="刷新文件树"`，`title="刷新文件树（重新读取磁盘）"`。
- `⋯`：打开其他文件夹…、刷新。删除**不放这里**（没有目标对象），放行上。
- 行级操作：每行 hover / `focus-within` 显示 `⋯`，右键也开同一个菜单。菜单项：删除（移到回收站）、新建文件、新建文件夹、展开全部/收起全部。
- 示例态：动作区改为整宽一个「打开文件夹…」，保留那行「改动不写盘」；新建按钮保留（走内存分支），不要藏。
- 空文件夹态：动作区不变；空提示加第二行「用上面的「＋ 新建」建第一篇，或打开其他文件夹」。
- 换文件夹时如果当前文档不属于新文件夹：要么问一句「打开文件夹后当前文档会关闭」，要么把标题栏标成「外部文档」。至少别让树没有高亮项。
- 图标只用文字字形（`＋ ⟳ ⋯ ‹ › ▸ ▾`），与现有界面一致，不引图标库。

难度：M（约 1 个组件 + 1 段样式 + 3 个回调）。

## U2 删除确认：应用里没有删除，文案按「移到回收站 + 手动恢复」写

证据
- 没有任何删除入口（见 U1）；`src/lib/workspace.ts` 只有 `readNode / writeNode / saveAsFile`，没有删除。
- 能写 `.sidelight/`：`src/lib/cache.ts:4`（`CACHE_DIR`）、`cache.ts:96-97`（按 kind 建子目录）。`trash` 可以照同样方式加进 `SUBDIRS` 之外的新目录。
- 浏览器拿不到绝对路径；宿主也故意不给（`host/Program.cs:42`、`540` 只回 `fileName`）。所以文案不能写完整路径。
- 现有确认框的按钮顺序约定：取消 → 不保存 → 保存并切换（`保存并切换` 是 primary，位于最后，`App.tsx:3884-3893`）。

建议文案（已渲染，见 `ux-proposal-delete-1440.png`）

- 标题：`删除「第一篇 开头.md」？`
- 文件正文：`它会被移到这个文件夹的 .sidelight\trash\ 里，不会当场永久删除。要恢复：在资源管理器打开本文件夹，把 trash 里的文件移回原位。`
- 文件夹正文：`整个文件夹会移到 .sidelight\trash\ 里，包含 3 个 Markdown 文件。`（数量由树节点算，别让用户猜）
- 按钮：`[取消] [移到回收站]`。取消是 primary 且在左，焦点默认在取消上；`移到回收站` 用 `--warn` 描边（不是填充），避免把破坏性动作做成主按钮。这与「保存并切换」的顺序相反，是本轮唯一的例外，理由写在 ADR-0013。
- 删除当前文档：复用 `pendingSwitch` 的三选一（`App.tsx:361` 的类型已带 `after`；`newDocument` 就是这么拦的，`App.tsx:1703-1709`）。文案：`这篇还有没保存的改动` / `先保存，再把它移到回收站吗？` / `[取消] [不保存] [保存并删除]`。
- 删完之后：删的是当前文档 → 打开同级下一个文件；没有就切到空白的「未命名」并把标题栏清空。focus 落到被删项的下一行（列表空则落到 `＋ 新建`）。
- toast：`已移到回收站` + 「撤销」（`Notice.actions` 已支持，`App.tsx:194-204`）。撤销 = 把 trash 里的文件 `move()` 回原名；失败时给 `撤销失败：<原因>`。
- trash 文件名：`.sidelight/trash/YYYYMMDD-HHmmss-<cacheKey(名)>.<扩展名>`，用现成的 `cacheKey`（`src/lib/cache.ts:51`）挡非法字符与超长；时间戳防同名覆盖。
- 禁用范围：示例、单文件打开、没有工作区时不显示删除（不能凭空删）。

难度：M（删除逻辑 60 行内；对话框可复用 `.dialog`）。

## U3 刷新、空文件夹、外部改动：三者都没有反馈

证据
- 没有刷新入口（U1）；`readDirectory` 只在打开文件夹时跑一次（`src/lib/workspace.ts:87-107`、`113-129`）。
- 空目录展开：`aria-expanded="true"`，DOM 里零个 `.tree-file`，零个提示（`hasEmptyHint:false`），视觉上就是「▸ 空目录」变成「▾ 空目录」后下面空着（`ux-empty-dir-1440.png`）。根因是 `FileTree.tsx:56` 只在 `node.children.length > 0` 时渲染子层，没有 else 分支。
- 空工作区文案存在但只一句「这个文件夹里没有 Markdown 文件」（`FileTree.tsx:163-175`，`ux-empty-workspace-1024.png`）。
- 外部改动无感知：在资源管理器里加/删文件，树不变，也没有任何提示。

改法
- 刷新按钮读盘时：按钮 `disabled` + `aria-label` 不变、`aria-busy="true"` 给 `.file-tree-list`，图标 `opacity: .5`；完成即还原（本地目录一般 <300ms，不要加转圈动画，免得闪）。
- 刷新有差异才提示：`已刷新：新增 2 个，消失 1 个`；无差异静默（不弹 toast）。
- 当前文档在磁盘上消失：错误 toast `当前文档已不在磁盘上。保存会重新创建它。`（这条要提醒，不能静默）。
- 刷新失败（句柄失效/权限被撤）：`读不到文件夹了。请点「打开其他文件夹」重新授权。`，树保持不变，别清空。
- 空目录：`FileTree.tsx:56` 加 else，渲染 `<p className="tree-empty-dir">空文件夹</p>`，11.5px、`--ink-faint`、缩进对齐子项（样式进 `styles.css` 树段）。
- 空工作区：保留首行，补第二行引导；与树头「＋ 新建」呼应。
- 自动监测：`FileSystemObserver` 在本运行时**存在**（实测 `true`），但属实验 API，本机 OPFS 场景没验过；本轮先做手动刷新，ADR-0013 写清「不自动跟随外部改动」。

难度：S（刷新）+ S（空目录文案）。

## U4 可访问性（语义 + 键盘）：树只是「一堆按钮」，方向键无效，到树要 19 次 Tab

证据
- `.file-tree-list` 没有 `role`，行按钮 `role=null`、`aria-selected=null`，目录行有 `aria-expanded`；活动文件用 `aria-current="true"`（`FileTree.tsx:31-55`）。实测：活动项 `{cur:"true", role:null, sel:null}`。
- 方向键完全无效：聚焦「第二篇.md」后按 ↓ ← →，焦点仍在该行（前后 `document.activeElement` 文本相同）。键盘只能 Tab + Enter。
- Tab 落差：从页面开头按 Tab，到进入文件树要 19 次，这 18 个站全在顶栏与工具条里；树内还有 8 个按钮要逐个按过。唯一的 skip link 只到正文（`跳到正文` → `#editor`，`App.tsx:3201`）。
- 侧栏「文件 / 大纲」是纯 `button`：`role=null`、`aria-selected=null`、`aria-controls=null`（`App.tsx:3525-3540`）。
- 大纲：`<aside aria-label="大纲">` 里套 `<nav>`，行是按钮；当前节只有 `.is-active` 样式，`aria-current=null`（`Outline.tsx:25-36`，实测）。
- 图标按钮 label：`FindBar.tsx:58-66` 的 ↑ ↓ ✕ 只有 `title`，没有 `aria-label`。树的 `‹`/`›` 已有 `aria-label`（`FileTree.tsx:107,145`），这点合规。
- 焦点环：合规。`:focus-visible` 2px `--accent`、offset 2px（`styles.css:121-124`），树项上实测未被裁剪（`ux-tree-focus-1440.png`）。
- 对比度：合规。`.tree-dir-name` 5.94、活动项 7.4、树头按钮 6.67、`.file-tree-name` 4.66（12px 小字，均 ≥4.5）。

改法
- `.file-tree-list` → `role="tree"` + `aria-label="文件树"`；行 → `role="treeitem"` + `aria-level`（1 起）+ 目录 `aria-expanded` + 文件 `aria-selected`。活动文件去掉 `aria-current`，只用 `aria-selected`，免得读两遍。
- roving tabindex：只有活动项（没有活动项时第一项）`tabindex=0`，其余 `-1`。这样树内从 N 个 tab 站降到 1 个。
- 键位：↑↓ 上下移动，→ 展开目录/进第一子项，← 收起/回父项，Home/End 首尾，Enter 打开，Delete 触发删除确认，Shift+F10 开行菜单。
- 加第二个 skip link「跳到文件树」（`href="#file-tree"`，列表加 `id`）；或在快捷键表里给 `Ctrl+Alt+E`。两个一起做更好。
- 侧栏 tab：`role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls`，←→ 切换；面板区 `role="tabpanel"`（`App.tsx:3525-3569`）。
- `FindBar` 三个按钮补 `aria-label`（上一处 / 下一处 / 关闭查找）。
- 这些改动只碰 `FileTree.tsx`、`Outline.tsx`、`App.tsx` 的 tab 区、`FindBar.tsx`、`styles.css` 树段，不引依赖。

难度：M（roving tabindex + 键位约 60 行）。

## U5 播报与焦点：toast 是挂载即带文本的 live region，大纲当前项不说话

证据
- 闲置时页面里 `[role="status"]` 0 个、`[aria-live]` 0 个；toast 是**新建节点同时塞文本**（`{exists:true, role:"status", ariaLive:null, ariaAtomic:null, mountedWithText:true}`，`App.tsx:3693-3708`）。NVDA/VoiceOver 对「新插入的 live region」常不播报，这是可复现的已知模式。
- 大纲当前项没有 `aria-current`（同 U4）。
- 焦点去向没有统一约定：`newDocument` 新建后手动把焦点塞进 `.ProseMirror`（`App.tsx:1680,1696`），用 `requestAnimationFrame` + `querySelector`；删除/刷新是新增路径，必须自己定焦点，否则行被移除后焦点掉到 `body`。
- 对话框焦点管理已有现成钩子 `useDialogFocus`（`App.tsx:605`），删除确认应复用它。

改法
- App 根节点常驻一个视觉隐藏的播报区：`<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice?.text ?? ''}</div>`。`.toast` 保留 `role` 不影响视觉；删掉 `.toast` 的 `role` 也行。`styles.css` 需补 `.sr-only`（`position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap`），现在没有这个类。
- 错误提示仍用 `role="alert"` 的 banner，不进 sr-only 区，避免重复播报。
- 树的删除/刷新/新建之后：把 focus 显式落到目标元素（下一行 / 刷新按钮 / 新行）；对话框关闭后 focus 回触发按钮。
- 大纲活动项加 `aria-current="true"`；`.outline-list` 的 `<nav>` 加 `aria-label="文章大纲"`，或把 `<nav>` 换成 `div`（外层 aside 已有标签，两个 landmark 同名会重复）。

难度：S（约 20 行）。

## 界面优化机会（3 条）

1. **树层级缩进错位（实测，建议随 U1 一起改）**：`.tree-dir { padding-left: 10px }`（`styles.css:412-418`）让第一层子文件与根文件同 x。实测文本 x：根文件 14、一级目录名 31、一级子文件 **14**、二级目录名 41、二级子文件 24。视觉上子文件像父目录的兄弟。改法：缩进不改 `.tree-dir`，改成给子层包一个容器 `.tree-children { padding-left: 14px }`，每层 +14。证据 `ux-tree-depth-1440.png`。难度 S。
2. **长文件名换行**：`.tree-file` 没有 `white-space: nowrap`（`styles.css:420-434`），超长名从 24px 行高变 40px 两行，行高不齐；`title` 已有完整路径可兜底。改法：`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`，行内文字包一层 `span`。证据 `ux-longnames-1024.png`、`ux-folder-1024.png`。难度 S。
3. **展开态在切「文件 / 大纲」后全丢**：`expanded` 是 `FileTree` 的本地 state（`FileTree.tsx:90`），切 tab 时组件卸载（`App.tsx:3543-3569`）。实测展开 4 行 → 切回后 3 行且两个目录都 `aria-expanded="false"`。改法：`expanded` 提到 `App` 或模块级 `Map`，按工作区名清空。难度 S。

## 已核实的事实（给实施用）

- `FileSystemFileHandle.prototype.move` **存在且可用**：OPFS 上 `h.move('新名.md')` 后目录里只剩 `新名.md`，内容不变，`h.name` 变成新名。这意味着「FSA 没有 rename API」的旧说法在本运行时（WebView2 157）**已经不成立**，重命名可以做，但要写清低版本运行时降级为「另存新名 + 删除旧名」。实测：`move:"function"`。
- `FileSystemObserver` 存在（`true`），实验 API，本轮不建议用。
- `removeEntry` 存在（含 `{recursive:true}`），回收站与目录删除都能做。
- `showDirectoryPicker` / `showSaveFilePicker` 均存在。
- 焦点环与对比度现状合规（数据见 U4），本轮不要「顺手」改颜色。
- 空态/示例态/文件夹态/空文件夹态四态截图齐全（见 U1 表格）。

## 未验证

- 真机 WebView2 里的 `move()` 与右键菜单：只在本机 Edge 157 验过；宿主 157 同版但未在宿主里跑。
- 若本轮顺手做行内重命名：IME 组合态下的回车与失焦行为未验证（本轮不要求重命名）。
- 屏幕阅读器实录（NVDA/VoiceOver）：没有装，结论来自 DOM 与规范，不来自实听。
- 文件系统「外部改动」在真实盘上的时序（资源管理器里改完多久可见）：没有真实盘句柄，用的是 OPFS。
- 浏览器默认右键菜单是否已被宿主屏蔽：未验证，做自定义 `onContextMenu` 时先 `preventDefault`，再进宿主确认一次。
