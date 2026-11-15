# 第 14 轮 · 缺陷 finder 发现（findings-bug）

- 侦察员：r14-bug（只读产品代码）
- 时间：2026-11-16 05:01–05:33（Asia/Shanghai）
- 环境：Windows 11、Node 24.21、dev server `http://localhost:5173`、CDP `http://127.0.0.1:9222`（Edge headless，带扩展）、v0.27.0
- 方法：CDP 浏览器实测（清 localStorage/IndexedDB 后冷启动）；用注入的 `showDirectoryPicker` 桩模拟真实文件夹；`host-smoke` / `save-acceptance` 跑 Windows WebView2 宿主。
- 证据：`shots/round-14/`；探针脚本在 `.tmp/r14/probe1..7.mjs`、`.tmp/r14/host-save-run.mjs`。

## 结论

本轮找到 1 条已发布的数据损坏缺陷（P0，B1），1 条首次使用主按钮失败（P1，B2），以及首次使用身份、P3/P4 延后项、导出菜单语义三类问题。桥接层未发现回归：宿主 smoke 4/4、宿主保存 3/3、无宿主/Chrome 扩展环境零报错；401/断网/取消/写失败/导出失败的文案与可恢复动作都可用。

| 编号 | 优先级 | 一句话 | 状态 |
| --- | --- | --- | --- |
| B1 | P0 | 文件夹里「＋ 新建」后按 Ctrl+S，正文写进上一个文件，新文件留空 | 已复现（0.27.0 已发布行为） |
| B2 | P1 | 首屏直接点「分析本段（模拟）」就出现「有 1 条没能在正文里定位，已丢弃」 | 已复现 |
| B3 | P1 | 新建空文档后，左侧文件树仍写「现在打开的是示例」；空文档无提示 | 已复现 |
| B4 | P2 | P3/P4 延后项仍缺：无 tablist/aria-selected；切页签丢展开态与滚动；空文件夹无提示 | 已复现 |
| B5 | P3 | 导出菜单是 `role=menu`，四个子项却没有 `role=menuitem` | 已复现 |

---

## B1（P0）文件夹里新建文件后 Ctrl+S，内容覆盖上一个文件

**现象**

真实文件夹里打开 `a.md`，点文件树头「＋ 新建」。新文件 `未命名.md` 建好并打开，顶栏写「未命名.md」。输入 `NEW-DOC-MARKER` 后按 Ctrl+S：

- 写入发生在 `a.md`。`a.md` 的原文 `# A / 原文 A。` 被 `NEW-DOC-MARKER` 覆盖。
- 新建的 `未命名.md` 仍是 0 字节。
- 顶栏文档名变回 `a.md`，提示「已保存 a.md」，dirty=false。

用户以为在写新文件，实际改了别人的文件，且界面事后把标题改成被覆盖的文件名。属于静默数据损坏。

**复现**

1. 清 localStorage，打开 `localhost:5173`。
2. 用目录选择桩提供文件夹：`a.md`（`# A`）、`b.md`（`# B`）。点「打开文件夹…」。
3. 点 `a.md` 打开，再点「＋ 新建」，在正文输入任意文字，按 Ctrl+S。
4. 检查磁盘桩：`a.md` 变成新输入的文字，`未命名.md` 为空。
5. 不按 Ctrl+S，只等 4 秒：默认开启的自动保存走同一条路径，同样写 `a.md`。

**证据**

- `.tmp/r14/probe6.mjs` 输出：
  - `files: [["a.md","NEW-DOC-MARKER"],["未命名.md",""], …]`
  - `writes: ["a.md", ".sidelight/drafts/a.md"]`
  - `toasts: ["已保存 a.md"]`，`docName: "a.md"`。
- 截图 `shots/round-14/new-then-save.png`。
- `.tmp/r14/probe7.mjs`（不按 Ctrl+S，等 4.2 秒）：`files: [["a.md","NEW-DOC-MARKER"],["未命名.md",""]]`，`toasts: ["已保存 a.md"]`，`docName: "a.md"`。自动保存同样中招。
- 代码根因：
  - `src/App.tsx:1930-1936`：`startNewDocument` 先 `loadIntoEditor('', name, file)`，紧接着 `await refreshTree()`。
  - `src/App.tsx:1690-1718`：`refreshTree` 的 `activeFile` 是创建时的闭包值（还是 `a.md`），刷新后用 path 找回 `a.md`，执行 `setActiveFile(rebound)` 和 `saveTargetRef.current = { handle: rebound.handle, … }`（1712-1713）。
  - `src/App.tsx:2043-2051`：`performCommit` 优先用 `saveTargetRef.current`，于是写到 `a.md`。
  - 该 rebind 逻辑在 round 12 引入（`git blame` → `971e1ca`），round 13 仍在，0.27.0 已发布。

**影响**

- 数据损坏：覆盖同目录另一个已存在的 Markdown 文件。撤销只在编辑器内，磁盘已被改写。默认自动保存开启，停笔 2 秒就会自己发生（probe7 实测 4.2 秒内经自动保存写入 `a.md`）。
- 覆盖面：真实文件夹里「先打开过任意文件、再新建」的用户，第一次保存必中；是发布版行为，不是本轮改动引入。
- 与 `findings-ux.md` 的 U1 是同一问题；本报告补上宿主/文件夹实测与代码根因。

**建议**

- `refreshTree` 不用闭包里的 `activeFile`。增加 `activeFileRef`（`loadIntoEditor` 同步写），rebind 时读当前值。
- 更小的改法：`startNewDocument` 调用 `refreshTree({ skipRebind: true })`，因为新文件句柄已知，刷新只更新树。rename 仍需要现有 rebind。
- 增加回归测试：临时目录桩下「打开 a → 新建 → 输入 → Ctrl+S」，断言写入目标是新文件名，`a.md` 字节不变。

**难度**

S（约 5–10 行）。风险在 rename 共用同一函数，改参数时要保留 `skipPath` 行为。

---

## B2（P1）首屏主按钮「分析本段（模拟）」一按就报丢批注

**现象**

清空 localStorage 后首次打开，光标不在正文（`document.activeElement` 是 BODY，选区在文首标题「侧灯」）。直接点顶栏的「分析本段（模拟）」：

- 右侧只出现 1 条批注。
- 上方出现错误色提示：「有 1 条没能在正文里定位，已丢弃。」
- 没有 toast，没有解释为什么丢。

同一文档改成「选中正文一段再按 Ctrl+Enter」则正常：3 条批注、0 条丢弃、无提示。所以这是「段落模式 + 短标题」特有的路径，而它恰好是首屏最显眼的按钮。

**复现**

1. 清 localStorage，刷新 `localhost:5173`，不要点正文。
2. 点「分析本段（模拟）」，等 2.5 秒。
3. 读右侧批注栏的 `.rail-notice`。

**证据**

- `.tmp/r14/probe5.mjs` A 段输出：`notices: ["有 1 条没能在正文里定位，已丢弃。"]`，`cards: 1`。
- 同一路径在 probe1 重复出现（首屏截图 `shots/round-14/first-open-simulated.png`）。
- 代码：`src/lib/ai.ts:248-287` 的 `mockItems` 对短段落取两次同一句（第一条 `clip(first,22)`、第三条 `clip(pool[2] ?? first,12)`，当只有一句时二者都是「侧灯」）；`resolveAnnotations` 顺序消费区间，第二条同句无法定位，计入 `unresolved`。`src/App.tsx:1071-1075` 把 `unresolved` 显示为「有 N 条没能在正文里定位，已丢弃」。

**影响**

首次使用时，用户第一个动作就收到失败文案，且只拿到 1/3 的示例批注。模拟模式是本轮「没配 Key 也能看懂」的主要演示，这一条直接削弱可信度。仅影响无 Key 的模拟路径，不影响真模型。

**建议**

- `mockItems` 去重：第三条 quote 若与第一条重合，改用下一条句子；没有下一条就不发第三条。
- 单句/过短段落直接返回 1 条评价，不生成重复 quote。
- 或在 `unresolved > 0 && simulated` 时不显示「已丢弃」，改成「这段太短，选中一段正文再试」。
- 加一条 `mockItems` 单测：单句输入只产生唯一 quote。

**难度**

S（10–15 行，含单测）。

---

## B3（P1）新建空文档后，文件树仍说「现在打开的是示例」

**现象**

首次打开（无工作区）时，三处文案：

- 顶栏：`示例 · 未命名.md`
- 文件树：「现在打开的是示例」/「打开一个文件夹后，保存会写回原文件」/「打开文件夹…」
- 右栏：「未配置 API Key，下面是本地模拟批注，不调用模型」

点「文件 → 新建」后：

- 顶栏变 `未命名.md`，正文 0 字，没有 placeholder，没有任何「从这里开始写」的提示。
- 文件树原文不动，仍写「现在打开的是示例」。
- 状态栏只有 `0 字`。

也就是说，空白新文档 + 「现在打开的是示例」同时成立，用户无法判断自己在示例里还是在新文档里。

**复现**

1. 清 localStorage，刷新首屏，记录文件树文案。
2. 文件菜单 → 新建。
3. 对比顶栏、正文、文件树三处文案。

**证据**

- `.tmp/r14/probe1.mjs` 的 `after-new` 与 `.tmp/r14/probe3.mjs` 的 `new empty doc`：`docName: "未命名.md"`、`tree: "现在打开的是示例…"`、`editorHtml` 只有空段落、`placeholder: null`。
- 截图 `shots/round-14/first-new-empty-doc.png`、`shots/round-14/first-open-after-new.png`。
- 代码：`src/components/FileTree.tsx:205-218` 的 `!workspace` 分支写死「现在打开的是示例」，不接收文档身份。
- 关联死代码：`src/lib/workspace.ts:368` 的 `demoWorkspace()`（示例文集，5 个文件）从未被调用；`src/App.tsx:63` 只导入不使用；因此 `FileTree.tsx:334,340` 的 `workspace.demo` 徽章与说明也不可达。首屏永远只有「单篇示例 + 打开文件夹」，README/简报说的「示例工作区」不存在。

**影响**

本轮主题是首次使用。新建后的第一屏没有下一步，且左侧给出与当前文档相反的描述。示例工作区（5 篇）已经写好却从未显示，用户也拿不到「文件树长什么样」的演示。

**建议**

- 给 `FileTree` 传 `documentKind: 'sample' | 'blank' | 'none'` 或直接传 `docName`，让空态文案跟当前文档一致；空白文档加一行输入提示（`data-placeholder` 或 CSS `:empty::before`）。
- 决定 `demoWorkspace()` 的去留：要么在无工作区时挂载它（同时保留「示例」徽章与「不写盘」说明），要么删掉函数、`demo` 字段和两处不可达分支。不要继续留着两套「示例」口径。

**难度**

S–M。挂载示例文集要处理 `demoTexts` 内存读写与「保存会另存为」的既有分支；只改文案是 S。

---

## B4（P2）P3/P4 延后项仍未达标

**现象**

1. 侧栏「文件 / 大纲」是两个普通 `<button>`：`role`、`aria-selected` 都是 null，页面里 `[role="tablist"]` 数量为 0。焦点在「文件」上按右箭头没有反应，焦点不切到「大纲」。
2. 切到「大纲」再切回「文件」后：
   - 只有当前文件祖先目录（`第一章`）自动展开。
   - 其它已展开目录（`好深`、`层`、`空目录`、`批量`）全部折叠。
   - 文件树 `scrollTop` 从 148 变 0。
   - 选中文件 `一.md` 保留，焦点留在「文件」页签按钮上。
3. 展开空目录「空目录」后，`<div class="tree-group"></div>` 是空的，没有任何「这个文件夹里没有 Markdown 文件」提示。

**复现**

1. 用目录选择桩提供：`第一章/一.md`、`第一章/二.md`、空目录 `空目录`、`好深/层/深处.md`、`批量/` 24 个文件。
2. 打开文件夹，展开 `第一章`、`空目录`、`好深`、`层`、`批量`，打开 `一.md`，把树滚到底。
3. 点「大纲」，再点「文件」，对比展开项与 `scrollTop`。

**证据**

- `.tmp/r14/probe2.mjs` 输出：
  - `before tab switch`: `expanded: ["第一章","好深","层","空目录","批量"]`, `scrollTop: 148`, `active: "一.md"`。
  - `after back to files`: 只有 `第一章` 为 `aria-expanded="true"`，其余 false，`scrollTop: 0`，`active: "一.md"`。
  - 空目录：`<div class="tree-group"></div>`，无文本。
  - `tabs: [{role:null, sel:null},{role:null, sel:null}]`，`tablist: 0`；`ArrowRight` 后 `activeElement` 仍是「文件」。
- 截图 `shots/round-14/tree-before-tab-switch.png`、`shots/round-14/tree-after-tab-switch.png`、`shots/round-14/tree-empty-folder.png`、`shots/round-14/tree-outline-tab.png`。
- 代码：`src/App.tsx:3802-3845` 用条件渲染，切页签时 `FileTree` 被卸载；`src/components/FileTree.tsx:69` 的 `expanded` 是组件内 state；`319-323` 渲染空 `tree-group`；`402-404` 的「没有 Markdown 文件」只在根级 `nodes.length === 0` 时出现。
- 与 `findings-ux.md` U4 同题；本报告补上展开项/滚动量的量化证据。

**影响**

页签切换丢上下文：用户在大纲看完再回文件树，之前展开的目录全没了，滚动回顶部。屏幕阅读器拿不到页签语义与选中状态。空目录看起来像坏了。三项都在 STATE 的延后清单里，本轮要求收尾。

**建议**

- 页签：`role="tablist"` + 每个按钮 `role="tab"`、`aria-selected`、`aria-controls`；roving tabindex，左右箭头切换，Home/End 到两端。
- 展开态：把 `expanded` 提到 App（或把 `FileTree` 用 `hidden` 保持挂载），切页签不卸载；同法保留 `file-tree-list` 的 `scrollTop`（切走前记录、切回后恢复）。
- 空目录：`node.children.length === 0` 时在 `tree-group` 里渲染「这个文件夹里没有 Markdown 文件」，用 `role="none"` 的提示行，不进 treeitem 序列。
- 体积：首屏只剩 27 B，`role`/`aria-*` 会加字节。先量 `vite build` 的 gzip 差值；超预算时从别处省（例如 B3 的 `demoWorkspace` 死代码虽已被 tree-shake，仍需实测确认没有残留）。

**难度**

M（三处一起改约 60–100 行；主要风险是体积与树焦点环）。

---

## B5（P3）导出菜单缺 `role=menuitem`

**现象**

「导出 ▾」弹层是 `role="menu"`，四个子项 `HTML`、`Markdown`、`纯文本`、`打印 / PDF` 却是裸 `<button>`，`role` 为 null。屏幕阅读器进入菜单后听不到「菜单项 1/4」，也不知道当前项。文件菜单 `FileMenu` 的同类项都带 `role="menuitem"`，两处实现不一致。

**复现**

1. 首屏点「导出 ▾」。
2. 读 `.export-menu` 与子按钮的 role。

**证据**

- `.tmp/r14/probe4.mjs` C 段：`menuRole: "menu"`，四个 `role: null`。
- 代码：`src/App.tsx:3525-3589` 的菜单容器有 `role="menu"`，子项没有 `role="menuitem"`；键盘处理在容器 `onKeyDown` 自己实现（3530-3550），和 `src/components/FileMenu.tsx:103-131` 重复一套方向键/Home/End/Tab 逻辑。

**影响**

仅影响辅助技术语义与键盘可预期性；鼠标与现有方向键可用。属于发布前可访问性收尾，不影响数据。

**建议**

- 四个按钮加 `role="menuitem"`；打开时把焦点放到第一项（FileMenu 已这样做，导出菜单没有）。
- 把两处方向键/Home/End/Tab 逻辑抽成一个 `useMenuKeys(itemsSelector)`，减少重复。

**难度**

S（约 10 行 + 一个 hook 抽取可另算）。

---

## 桥接回归（已验，无回归）

### Windows 宿主

- `host-smoke`（`shots/round-14/t3-window.png`，2026-11-16 05:07）：4/4 PASS。
  - 窗口标题 `host-argv.md — Sidelight`；`.ProseMirror` 存在，控制台 0 错误。
  - argv 标记行进入正文；恰好重载一次；页面稳定。
  - 单实例：第二进程 exit 0，窗口仍为 1。
- `save-acceptance` 宿主段（`.tmp/r14/host-save-run.mjs`，05:12）：3/3 PASS。PASS 行之后关闭 CDP 的清理步骤以退出码 1 结束，输出里没有 FAIL。
  - picker 落盘内容含正文；提示「已保存 示例 · 未命名.md」；dirty=false。
- 说明：宿主跑的是 `host/bin/Sidelight.exe`（82,944 B）。它启动时加载 `host/bin/www/index.html`，该目录与 `dist` 的 `index-*.js` 哈希相同（04:48 的 0.27.0 产物）；`save-acceptance` 随后把 WebView 页面导到 `localhost:5173`，所以保存段测的是当前源码。本轮只侦察、不构建，二者都不是本轮改动后的构建。
- 未跑 `draft-acceptance`、`recent-acceptance` 的宿主段：`.tmp/host-a` 是 04:11 的旧 fixture（exe hash 与 `host/bin` 不同），跑它只能证明旧构建；重启宿主与关窗对话框需要更长时间，30 分钟预算内没做。

### 无宿主 / Chrome 扩展环境

- 页面里 `window.chrome` 是 object（Edge 带扩展），`chrome.webview` 与 `window.webkit` 都是 undefined，`window.__sidelightReceive` 不存在。
- `getHostTransport()`（`src/lib/hostBridge.ts:21-43`）按顺序取 `chrome.webview` → `webkit.messageHandlers.sidelight`，都没有返回 null；8 次探针中控制台无宿主相关错误。
- 最近列表在浏览器里整段不渲染（`FileMenu` 收 `recent=null`），`loadRecent` 在无 transport 时提前返回，不发 `/__recent` 请求。
- macOS 桥接线序静态核对：`host-mac/Sources/SidelightMac/App.swift:62` 注入 `__sidelightReceive` 并派发 `sidelight-host` 事件，和 `hostBridge.ts:39-41` 监听的事件名一致。macOS 真机未验（本机 Windows）。

### 错误路径（已验，文案与恢复动作可用）

| 场景 | 文案 | 恢复动作 | 结果 |
| --- | --- | --- | --- |
| 401 | 「API Key 无效或没有权限。下一步：打开设置检查 Key 和接口地址。」 | 「打开设置」+ 关闭 | PASS |
| 接口不可达 | 「连不上接口地址。下一步：检查网络，或确认设置里的「接口地址」没填错。」 | 「打开设置」+ 关闭 | PASS |
| 保存对话框取消 | 「已取消保存。」 | dirty 保持 true | PASS |
| 写盘失败 | 「保存失败：磁盘已满。改动还在，可以再试一次。」 | dirty 保持 true | PASS |
| 导出失败 | 「导出失败：配额不足。改动还在，可以再试一次。」 | 关闭 | PASS |
| 空文档按 Ctrl+Enter | 「先选中一段文字，再按 Ctrl + Enter。」 | 无 | 代码已读，未点验 |
| 没配搜索 Key 点「联网核对」 | 「先在设置里选一个搜索服务并填 Key。」 | 无 | 代码已读，未点验（模拟批注卡片在） |

## 未验证（及原因）

1. **文件被删/改名后再保存**：`src/App.tsx:1723-1727` 有「已不在磁盘上…保存只能另存为」的提示，但本次没在桩里模拟「打开后删除」。下一轮用目录桩：打开 `a.md` → 从桩里删 `a.md` → 点刷新/保存。
2. **草稿恢复失败**：浏览器 localStorage 草稿损坏、`.sidelight` 只读目录两条路径没造。宿主 `draft-acceptance` 未跑（见上）。
3. **关窗三选一**：需要真实 Alt+F4/`window.close`，headless CDP 下没做。
4. **最近文件**：宿主 `/__recent` + 真实 `recent.json` 未跑；浏览器桩路径（open/remove/clear/undo）未跑本轮脚本。
5. **导出菜单键盘实录**：只验证 DOM 语义，未用屏幕阅读器。

## 优化机会（≤3）

1. **清掉 `demoWorkspace` 死路径**：`workspace.ts:290-381` 的 `DEMO_FILES`/`demoWorkspace` 无调用点；`FileTree` 的 `demo` 徽章/说明与 `App` 的 `demo` 判断因此不可达。删掉或真正挂载，二选一；留着会让「示例」出现两套实现。S。
2. **菜单键盘逻辑去重**：`FileMenu.tsx:103-131` 与 `App.tsx:3530-3550` 各写一套方向键/Home/End/Tab；抽 `useMenuKeys` 时顺手补 B5 的 `menuitem` 语义。S。
3. **`styles.css` 布局定义重复**：`.doc-layout` 在 239、1791、2180 定义三次，`.margin-rail` 在 727、2185 两次，靠后覆盖靠前。合并成一处，减少窄窗/打印样式互相覆盖的风险。S。

## 证据索引

- 首屏与新建：`first-open.png`、`first-open-file-menu.png`、`first-open-settings.png`、`first-open-simulated.png`、`first-new-empty-doc.png`、`first-open-after-new.png`
- 分析失败：`first-analyze-selection.png`（正常路径）、`analyze-401.png`、`analyze-network-error.png`
- 保存/导出：`save-cancelled.png`、`save-write-failure.png`、`export-failure.png`、`new-then-save.png`
- 侧栏树：`tree-before-tab-switch.png`、`tree-after-tab-switch.png`、`tree-empty-folder.png`、`tree-outline-tab.png`、`outline-tab.png`
- 宿主：`t3-window.png`
- 探针：`.tmp/r14/probe1.mjs`（首屏/菜单/设置/模拟）、`probe2.mjs`（页签/树/空目录）、`probe3.mjs`（首屏/空文档/保存/导出）、`probe4.mjs`（分析/401/导出）、`probe5.mjs`（默认分析/401/焦点）、`probe6.mjs`（新建后 Ctrl+S）、`probe7.mjs`（新建后等自动保存）、`host-smoke-r14.mjs`、`host-save-run.mjs`
