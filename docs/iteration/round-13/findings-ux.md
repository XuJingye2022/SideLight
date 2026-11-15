# 第 13 轮 · 体验与界面发现（finder-ux）

日期：2026-11-16。只读侦察，未改 `src/`、`host/`。
环境：`http://localhost:5173`，CDP `127.0.0.1:9223`，视口 1440/1280/1024。Fake FileSystem 句柄注入（脚本在 `.tmp/r13-ux/`），打开含多级目录、长名、空目录的工作区后量 DOM。
截图目录：[shots/round-13](../../../shots/round-13/)。

影响排序：重命名交互 > 当前文件在树里消失 > 层级缩进 > 空文件夹 > tablist/aria-current。

---

## U1 重命名没有入口、没有输入态、没有校验（High，M）

### 现状（实测）

三种入口都不存在：

- 行内 `⋯` 按钮在（`src/components/FileTree.tsx:223-235`），但菜单只有一项「删除（移到回收站）」（`src/components/TreeActions.tsx:132-141`）。`⋯` 默认 `opacity: 0`，只在 hover / focus-within 时出现（`src/styles.css:466-481`），且 `tabIndex={-1}`，键盘到不了。
- 右键菜单同一份代码，也只有删除。`Shift+F10`、`ContextMenu` 同样只出删除（`FileTree.tsx:141-151`、`193-206`）。
- 文件行聚焦后按 `F2`：树里不出现输入框，也没有对话框或菜单，焦点仍在行上（实测 `dialogs: 0`、可见菜单 `[]`）。

两种非模态都不可用：行内没有编辑态，也没有「重命名」对话框；删除确认是三选一对话框（`TreeActions.tsx:143-167`），重命名不应复用这个重流程。

### 建议交互（可直接进 plan）

| 项 | 建议 | 依据 |
| :--- | :--- | :--- |
| 入口 | ① 行 `⋯` 菜单首项「重命名」；② 右键同一菜单；③ 文件行聚焦时 `F2`。三者走同一个 `onStartRename(node)` | 现有 `⋯` 与右键已共用 `rowMenu`（`FileTree.tsx:65`），加一项最小改动 |
| 输入态 | **行内输入框**，替换文件名文本，不弹对话框。自动聚焦，只选中主文件名（不含 `.md`），宽度撑满 181px 文本列 | 重命名是单字段快操作；对话框会遮正文、多一次焦点跳转。提案图：[ux-proposal-rename-1440.png](../../../shots/round-13/ux-proposal-rename-1440.png) |
| 校验 | 就地显示、提交前拦截：空名 →「名字不能为空」；含 `\ / : * ? " < > \|` 或控制字符、结尾是点或空格 →「文件名不能包含 …」；同目录重名 →「这个文件夹里已有同名文件」；扩展名不是 `.md`/`.markdown` →「保留 .md 结尾，否则文件会从树里消失」并阻止提交 | 非 md 会被 `readDirectory` 过滤（`src/lib/workspace.ts:78-81`、`92-104`），改名后文件当场「消失」是最难解释的失败 |
| 键 | `Enter` 提交；`Esc` 取消并还原；失焦取消（不提交）；`event.isComposing` 时忽略 Enter；提交中禁用重复 Enter | 中文输入法回车选词会误提交，必须挡 |
| 提交前 | `await waitForCommit()` 再 `move()`；不改正文，所以**不问**未保存改动 | 删除已经这么做（`src/App.tsx:1777`），自动保存晚到会写旧句柄 |
| 提交后 | 保持该行选中（`setActiveFile(rebound)`）、保持展开与 `scrollTop`、焦点回到行；若是当前文档，同步 `docName`、顶栏标题、`saveTargetRef`；清旧名草稿与批注缓存 | 身份同步已有可抄的收尾：`App.tsx:1710-1719`（刷新重绑）、`1920-1929`（另存为换名）、`1791-1792` + `1965-1966`（按 `cacheKey` 清旧名缓存） |
| 失败 | 还原旧名，输入框保留并显示一行原因（占用/权限/不存在），不弹第二层对话框 | 与现有 `setNotice` 错误文案风格一致 |
| 不该出现的入口 | 无目录句柄的单文件、`demo` 工作区不显示「重命名」；目录行也不显示（本轮不做目录改名） | `FileSystemFileHandle.move()` 只对文件可用；本轮边界 |

### 实现与预算

- 输入态与校验放 `TreeActions.tsx`（已是 `lazy()`，`FileTree.tsx:13`）会新增一个跨组件状态；更省的做法：在 `FileTree` 里加 `renaming: {path, value, error} | null`，把输入框渲染在 `renderRow`，但**校验与提交函数做成动态 import**，保住首屏。
- 难度 M：输入 + 校验约 120 行，身份/缓存同步约 60 行，测试要覆盖空名、非法字符、重名、扩展名、Esc、当前文档改名、非当前文件改名。

---

## U2 折叠祖先或切页签后，当前文件在树里消失，树还没有 Tab 停点（High，M）

### 现状（实测）

1. 打开深文件 `项目/章节/深章.md` 后折叠 `项目`：`aria-selected="true"` 的元素数 = 0，树里看不到当前文件；顶栏标题仍是 `深章.md`。截图：[ux-active-hidden-1440.png](../../../shots/round-13/ux-active-hidden-1440.png)。
2. 切到「大纲」再切回「文件」：`expanded` 2 → 0，`scrollTop` 25 → 0，当前文件不可见，且**树内 `[tabindex="0"]` 数量 1 → 0**，键盘无法再进入树。截图：[ux-tab-back-1440.png](../../../shots/round-13/ux-tab-back-1440.png)。

原因在三处叠加：

- `expanded` 是 `FileTree` 内部状态（`FileTree.tsx:62`），页签切换把整棵树卸载（`App.tsx:3756-3779`），状态与滚动一起丢。
- 打开文件时从不展开祖先（`openWorkspaceFile` 只 `requestLoad`，`App.tsx:1679-1689`；`expanded` 初始为空）。
- `tabbablePath` 在 `focusPath` 不在可见行时回退到 `selectedPath`（`FileTree.tsx:86-87`），而 `selectedPath` 可能就是那个不可见的 `activePath`，于是没有任何行拿到 `tabIndex=0`。

### 改法

1. 展开集与滚动位置提到 `App`（`sidebarTab` 旁边，`App.tsx:322`），或两个面板都保持挂载、用 `hidden` 切换（`Outline` 是 lazy，挂载后不重读）。
2. `activePath` 变化时自动展开祖先：把 path 按 `/` 切段，逐级 `expanded.add`。这样最近文件、宿主打开、刷新重绑都能看见当前文件。
3. `tabbablePath` 兜底改成「可见则用 focusPath，否则用 activePath，仍不可见就用 `rows[0].path`」，保证树永远有一个 Tab 停点。
4. 切回「文件」后把焦点还给当前行（`rAF` + `row.focus()`，`FileTree.tsx:71-82` 已有同款逻辑）。

验收：打开深文件 → 折叠父目录 → `Tab` 仍能进树且第一行可聚焦；切页签往返 → 展开数、`scrollTop`、选中行都不变。

难度 M（状态上提 + 自动展开 + 兜底，约 60 行）。

---

## U3 层级缩进：目录每层 +10px，文件永远贴根（Medium，S）

### 现状（实测，1440 视口）

| 行 | aria-level | left(px) |
| :--- | ---: | ---: |
| 根目录 `空文件夹` | 1 | 6 |
| 根目录 `长篇项目` | 1 | 6 |
| 二级目录 `资料` | 2 | 16 |
| 三级目录 `sub` | 3 | 26 |
| 四级文件 `设定.md` | 4 | **26** |
| 二级文件 `第一章.md` / `第二章.md` | 2 | **6** |
| 根文件 `a.md` | 1 | 6 |

也就是：目录靠 `.tree-dir { padding-left: 10px }` 逐层累加（`src/styles.css:444-450`），文件行 `.tree-row` 完全没有缩进（`styles.css:452-464`）。视觉上子文件像是根目录的兄弟，层级读不出来。截图：[ux-tree-expanded-1440.png](../../../shots/round-13/ux-tree-expanded-1440.png)。

### 改法（推荐一次做对）

不要在 `.tree-dir` 上叠 padding。给每个 `treeitem` 一个统一的 `paddingLeft = 6 + (level - 1) * 14`（内联 style 或 CSS 变量），删掉 `.tree-dir` 的两条 padding 规则；`level` 渲染时已经拿到（`FileTree.tsx:182`）。这样目录、文件同一套几何，和 `aria-level` 完全一致，也顺手消掉 `visibleRows`（`FileTree.tsx:32-41`）与 `renderRow`（`181-261`）两套层级计算的重复。可选：`.tree-group` 加 1px 左引导线，深树更好扫。

三档宽度都已截图：[ux-tree-1440.png](../../../shots/round-13/ux-tree-1440.png)、[ux-tree-1280.png](../../../shots/round-13/ux-tree-1280.png)、[ux-tree-1024.png](../../../shots/round-13/ux-tree-1024.png)。

长文件名：181px 文本列 + `text-overflow: ellipsis` 正常，不换行（换行会破坏行高与扫描）。两点小修：`title` 现在是工作区全路径（`FileTree.tsx:215`），改成 `node.name` 更有用；重命名输入框必须占满这 181px，否则长名输入时看不全。1280/1024 下侧栏固定 218px，无横向溢出（`ux-tree-1280.png`、`ux-tree-1024.png`）。

难度 S（CSS 约 10 行 + 渲染去重约 20 行）。

---

## U4 空文件夹展开后是一片空白（Low-Medium，S）

### 现状（实测）

`空目录` 展开后 `<div role="group">` 存在、子元素 0、高度 0，没有任何文案；用户分不清「空」与「没加载出来」。空工作区有兜底文案（`FileTree.tsx:335-339`），空目录没有。代码在 `FileTree.tsx:254-257`：`open && <div role="group">` 无条件渲染子节点。

### 改法

`node.children.length === 0` 时在 group 内渲染 `<p className="tree-empty-dir">这个文件夹里没有 Markdown 文件</p>`，缩进对齐子级、`--ink-faint`、12px。用「没有 Markdown 文件」而不是「空文件夹」，因为只放图片/附件的目录读进来同样是 0 个子项（`workspace.ts:92-104` 会跳过非 md）。

难度 S（5 行 + 2 行 CSS）。

---

## U5 侧栏 tablist 与大纲 aria-current：仍延后，但预算够时这样补（Medium，S）

### 现状（实测）

- `.sidebar-tabs` 是普通 `div` + 两个 `button`（`App.tsx:3738-3753`）：`role`、`aria-selected`、`aria-controls`、`id` 全为 `null`；`Tab` 依次停在「文件」「大纲」两个按钮上，没有左右方向键。
- 大纲活动项只有 class（`Outline.tsx:26-35`）：`aria-current` 全为 `null`，读屏听不出当前小节。
- 视觉本身没问题：活动页签有底色 + 2px accent 下划线（`styles.css:1275-1279`），大纲活动项有 accent-wash 背景（`styles.css:1315-1319`）。截图：[ux-outline-tabs-1440.png](../../../shots/round-13/ux-outline-tabs-1440.png)、[ux-tabs-focus-1440.png](../../../shots/round-13/ux-tabs-focus-1440.png)。

### 改法与预算

- 页签：外层 `role="tablist" aria-label="侧栏"`；按钮 `role="tab"`、`aria-selected`、`id="sidebar-tab-files|outline"`、`aria-controls="sidebar-panel-files|outline"`；面板 `role="tabpanel"` + `aria-labelledby`。roving tabindex（活动 tab `0`，另一个 `-1`）+ `ArrowLeft/Right`、`Home/End`。
- 大纲：活动项 `aria-current="location"`（或 `"true"`），其余不写；活动项变化时不要动焦点。
- 预算硬线：当前首屏 **284,134 B / 285,000 B，余 866 B**（`docs/iteration/STATE.md:52`）。`role`/`aria-*`/id 约 200 B 原始、方向键处理约 250 B 原始，gzip 后预计 100–200 B，**单独做够**；但叠加 U1 的重命名逻辑就不够。所以 U1 的输入与校验必须进 lazy `TreeActions` chunk（`FileTree.tsx:13`），别放主 chunk。
- 若实测仍超 285,000 B，报告写这一段，不要写「已达标」：

> 侧栏 tablist 与大纲 `aria-current` 延后到第 14 轮：本轮首屏 X B，超出 285,000 B。键盘仍可 `Tab` + `Enter` 切换与跳转，但读屏无法播报当前页签与当前小节，按可访问性口径**不算达标**。第 14 轮先省出 ≥N B 再补，或把侧栏页签改成原生 `details`/单选结构。

难度 S（两个组件共约 30 行）。

---

## 优化机会（最多 3 条）

1. **树的层级只算一次**：`visibleRows` 生成扁平 `rows`（`FileTree.tsx:32-41`），`renderRow` 又递归一遍（`181-261`），两套 level 已经出现不一致（U3）。改成只渲染扁平 rows + 统一 `paddingLeft`，同时修缩进与键盘导航的单一数据源。
2. **重命名 UI 进 lazy chunk**：`TreeActions` 已经是按需加载（`FileTree.tsx:13`，`TreeActions.tsx:48`），把输入框、校验、提交放这里，主 chunk 不增长，U5 的预算才留得下来。
3. **`demoWorkspace` 是死代码**：`App.tsx:63` 导入但全仓库无调用；`workspace` 初始为 `null`（`App.tsx:314`），只有「无」与「真实文件夹」两态，所以 `FileTree.tsx:269`、`275-277` 的 demo 分支和 App 里 8 处 `!space.demo` 守卫都不可达（`App.tsx:756/1521/1649/1694/1740/1765/1853/2405`）。要么恢复「示例文件树」入口（对首次使用更好），要么删掉约 60 行与 5 段示例文案；不要留两套半死状态。

---

## 未验证

- `FileSystemFileHandle.move()` 的真实失败分支（占用、权限撤销、跨目录）没有 UI 可点，只做了代码与 DOM 侦察；实现后需在真实 Windows 文件夹测。
- 中文输入法下 Enter 提交、真实读屏播报未测（无 IME 自动化与读屏环境）。
- 首屏体积未在本轮重测：按 `STATE.md` 的 284,134 B 推算，U1 落地后需由根代理串行跑一次 `npm run build` 复核。
