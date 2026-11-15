# 第 14 轮 · 体验与界面 finder 发现

- 日期：2026-11-16
- 环境：`http://localhost:5173`（dev server，v0.27.0），CDP `127.0.0.1:9223`（headless Edge 157），viewport 1440×900 / 1280×800 / 1024×768，每次先 `localStorage.clear()` 再 reload。
- 只读：未改 `src/`、`host/`、`host-mac/`；未跑 `npm run build`、未装依赖。
- 限制：文件夹状态用注入的 `showDirectoryPicker` 替身（实现 `entries`/`getFileHandle`/`createWritable`）驱动，选文件夹的原生弹窗本身没测；最近文件用 `window.chrome.webview` stub + 路由 `/__recent` 驱动，没有真实宿主。界面、DOM、CSS 与保存逻辑是真实代码路径。全程 console 无报错。

截图都在 `shots/round-14/`。本文按用户影响从高到低排。

---

## U1（P0）文件夹里「新建」后，`Ctrl+S` 把内容写进上一个文件

**证据**

1. 打开含 `开始写.md` 的文件夹，点开 `开始写.md` → 点「＋ 新建」→ 输入「新文件的第一句。」→ `Ctrl+S`。
2. 实际结果：顶栏是 `未命名.md`，但树里高亮仍是 `开始写.md`（`shots/round-14/22-after-new-active-1440.png`）；提示条写「已保存 开始写.md」；`未命名.md` 内容为空，`开始写.md` 的原内容被整篇替换成「新文件的第一句。」。
3. 无文件夹时新建（`02-new-empty-1440.png`）不触发写错，因为 `activeFile` 是 null；**只要在当前文件夹里先开过任意文件，新建后的第一次保存就会写错**。
4. 同一状态的视觉表现：新建后新文件不在树里高亮（`aria-selected` 全在旧文件上），用户很难发现保存目标错了。

**根因（两条叠加）**

- `src/App.tsx:1934-1935`：先 `loadIntoEditor('', name, file)` 再 `await refreshTree()`。`refreshTree` 在 `src/App.tsx:1690-1718` 用闭包里的旧 `activeFile` 重绑句柄，`1709-1713` 把它写回旧文件，`saveTargetRef` 也跟着变成旧文件。随后 `performCommit` 在 `src/App.tsx:2047-2050` 用 `activeFile` 取目标，`2063` 真写盘。
- `src/App.tsx:1933`：新文件 `path: name`，没有工作区前缀（树路径是 `写作工作区/未命名.md`）。`FileTree.tsx:223` 用 `node.path === activePath` 判断高亮，所以即使不重绑也不会亮。

**改法**

- 在 `startNewDocument` 里给 `refreshTree` 传 `{ skipRebind: true }`（或在 `refreshTree` 里加一个「刚新建，不要回绑旧文档」的选项），或者把顺序改成「建句柄 → `await refreshTree()` → `loadIntoEditor()`」。
- 新文件路径用 `${space.name}/${name}`，与 `readDirectory` 生成的路径同一规则。
- 回归：开 A → 新建 → 写一句 → `Ctrl+S`，断言 A 字节不变、新文件有字、树高亮在新文件上。测试可复用 `scripts/` 里的 mock FSA（本轮 `.tmp/ux/probe7.mjs` 已有现成替身）。
- 难度：**S**（逻辑改动约 5 行）；回归脚本 **S–M**。

---

## U2（P1）第一次落笔没有入口：光标不在正文、空文档全白、`跳到正文` 跳了但不能写

**证据**

- 首屏焦点在 `BODY`（`01-first-open-1440.png`）。不点正文直接敲字：0 字变化、无脏标记；点一下正文再输入才写进去。从打开到写下第一句 = **2 个动作，第一步没有任何视觉提示**；键盘用户从初始状态要按 **22 次 Tab** 才到 `.ProseMirror`（`20-tab-focus-1440.png`；顺序：skip link → 文件 → 分析 → 导出 → ? → 保存 → 设置 → 插入 → H1/H2/B/I/S/code → 专注/打字机/源码/预览 → 文件/大纲 → 打开文件夹 → 正文）。
- `跳到正文`（`src/App.tsx:3474-3476`）按 Enter 后焦点落在 `MAIN#editor`（`src/App.tsx:3848`，`tabIndex={-1}`），不是 contenteditable。实测随后输入 0 字、`dirty=false`；再按一次 Tab 才进 `.ProseMirror` 并能输入。它把 22 次 Tab 降到「Enter + Tab」2 步，但没有把光标直接送进正文。
- 新建后的空文档（`02-new-empty-1440.png`、`13-folder-1024.png`）整块空白：没有 placeholder、没有「从这里开始」、没有标题提示。`useEditor`（`src/App.tsx:651-679`）没有 `autofocus`，全站也没有空文档占位样式（`src/styles.css` 没有 `placeholder`/`is-empty` 规则）。
- 新建后左侧仍写「现在打开的是示例 / 打开文件夹后，保存会写回原文件」（`02-new-empty-1440.png`），但顶栏已经是 `未命名.md`。该文案只看 `workspace===null`（`FileTree.tsx:205-219`），不看当前文档。

**改法**

- 首挂载后把焦点送进正文：`useEditor({ autofocus: 'start' })` 或首次 `loadIntoEditor` 后 `requestAnimationFrame(() => document.querySelector('.ProseMirror')?.focus())`。只在首次或新建时做，不要在切换查找/设置时抢焦点。
- 空正文加占位：`stats.chars===0 && viewMode==='edit'` 时在 `.doc-column` 叠一层 `pointer-events:none` 的「从这一句开始写」；不需要新依赖。
- `跳到正文` 加 `onClick`：hash 跳转后把焦点放到 `.ProseMirror`，而不是 `main`。
- 把 `FileTree` 的「现在打开的是示例」改成不依赖文档的「还没有打开文件夹」，或把文档名传进去按需显示；新建/空白文档时不再出现「示例」。
- 难度：**M**（4 处小改 + 键盘复查），新增字节约 100–250 B，受首屏预算约束。

---

## U3（P1）示例身份三处不一致，README 说的「示例工作区」实际不存在

**证据**

- 三处说法：文档名 `示例 · 未命名.md`（`src/App.tsx:89`），正文第一句「这是 Sidelight 的原型」（`src/App.tsx:118`），左侧「现在打开的是示例」（`FileTree.tsx:209`）。发布版仍称「原型」，而 `App.tsx:88` 的注释自己写着「别让三处说法互相矛盾」。
- README 第 17 行写「或者试用内存里的示例工作区」。实际 `demoWorkspace` 只有 import（`src/App.tsx:63`），全仓库没有调用点（`src/lib/workspace.ts:290-381` 的 5 个示例文件与 `demo:true` 分支永不可达）。`FileTree.tsx:334` 的「示例」徽标与 `340-341` 的「改动不写盘，保存会另存为」也永远不会渲染。
- 结果：首屏只有 1 篇示例正文，不存在可浏览的示例文件夹；「示例文集」这个名字、5 个示例文件、示例徽标全部是死代码。`shots/round-14/01-first-open-1440.png` 的树里没有任何文件行。
- 打开文件夹后旧示例不退场：`openFolder`（`src/App.tsx:1640-1660`）只 `setWorkspace`，不打开文件、不清空正文。实测点「打开文件夹…」后树变成 `写作工作区`，顶栏仍是 `示例 · 未命名.md`，正文还是示例（`05-folder-1440.png`）；切到大纲，列的还是示例的三个标题（`07-outline-1440.png`）。用户会以为文件夹没打开成功。

**改法**

- 先决定示例怎么讲，二选一：
  - **A（省字节）**：删掉不可达的 `demoWorkspace`/`DEMO_FILES` 与 `FileTree` 的 demo 分支、`.file-badge`/`.file-tree-demo-note` 样式（`styles.css:290-306`），文档名改 `示例 · 侧灯.md`，正文「原型」改发布口径，README 第 17 行同步删掉「示例工作区」。JS 里的 `demoWorkspace` 已被 tree-shake（在 `dist/assets/*.js` 里搜不到「示例文集」），省的是 `FileTree` 的 demo 分支与 CSS，**约 200–300 B gzip**（已核对构建产物；源码清理仍值得做）。
  - **B（补功能）**：首次启动且无草稿时 `setWorkspace(demoWorkspace())`，恢复 5 个示例文件与「示例」徽标；首屏会多约 1.5–2 KB gzip，必须先做 U3-A 之外的字节腾挪，或明确排到下一轮。
- `openFolder` 成功后：自动打开第一个 `.md`；或清空正文并在编辑区给「从左边选一个文件开始」的空态，同时把顶栏文档名置为「未命名」。不要留下旧示例冒充新工作区。
- 难度：**M**（文案 + 删代码是 S；自动打开/清空是 M，牵涉未保存确认）。

---

## U4（P2）侧栏页签与文件树还差最后一步（P3 + P4）

### a. 页签没有 tab 语义，方向键不切换（P3）

- `src/App.tsx:3802-3817`：`.sidebar-tabs` 是普通 `div`，两个 `button` 没有 `role="tab"`、`aria-selected`、`aria-controls`，也没有 `tabpanel`；两个按钮都是 `tabIndex=0`，所以 Tab 要停两次。
- 实测：聚焦「文件」按 `ArrowRight` 不切换；再按 Tab 走到「大纲」，页签仍停在「文件」（`.tmp/ux/probe4.mjs` 输出 `after: {focus:'大纲', active:'文件'}`）。
- 视觉正常（`styles.css:1250-1268`），缺的是语义与键盘。

**改法**：`role="tablist"` + 两个 `role="tab"`（`aria-selected`、`aria-controls`、roving `tabIndex`）+ 两个 `role="tabpanel"`；`onKeyDown` 处理 ArrowLeft/Right/Home/End，切换时同时移动焦点。难度 **M**（代码小，字节约 250–400 B gzip；先做字节腾挪）。

### b. 文件树展开态跨页签丢失（P4）

- `expanded` 是 `FileTree` 的局部 state（`src/components/FileTree.tsx:69`）；切到大纲时 `FileTree` 被整棵卸载（`src/App.tsx:3820-3845`）。
- 实测：展开 `长篇/第一卷` 后切「大纲」再切回「文件」，`长篇` 的 `aria-expanded` 回到 `false`，`第一章-初稿.md` 不可见（`06-expanded-1440.png` → `08-after-tab-switch-1440.png`）。
- 侧栏收起再展开不会丢：`treeCollapsed` 只是走 `FileTree.tsx:195-203` 的早退分支，组件没有卸载；丢状态的是切页签。

**改法**：两个面板都常驻，用 `hidden` 属性或 `display:none` 切换，不卸载 `FileTree`。这样不用把 `expanded` 提升到 App，改动最小；代价是 `<Outline>` 首次也挂载（本来就有 Suspense 懒加载，可接受）。难度 **S**（若字节超，可把 `aria-hidden` 省掉）。

### c. 空文件夹没有任何提示（P4）

- 展开空目录后只渲染 `<div role="group" class="tree-group"></div>`（`FileTree.tsx:319-323`），没有任何文字（`09-empty-folder-sidebar.png`、`09b-empty-folder-1440.png`）。
- 根目录没有 Markdown 时有「这个文件夹里没有 Markdown 文件」（`FileTree.tsx:400-404`），子目录没有等价提示。

**改法**：`open && node.children.length===0` 时渲染一行 `空文件夹`（class 复用 `.file-tree-empty` 的 12px 灰字即可）。难度 **S**，约 60–100 B gzip。

### d. 长名：树里硬切、顶栏 1024 换行（P3 视觉）

- 树行文件名没有省略号：`.tree-file` 是 `display:flex`（`styles.css:481-495`），`text-overflow:ellipsis` 加在 flex 容器上对匿名文本不生效；实测 `clientWidth=181`、`scrollWidth=586`，文字在「一个非常长的中文文件名用来测」处直接截断（`05-folder-1440.png`、`09-empty-folder-sidebar.png`）。行有 `title`，但视觉上不知道被截了。
- 顶栏 `.doc-name` 没有 `max-width`/`overflow`（`styles.css:192-200`）。1024 宽 + 长文件名时，`保存`/`设置`/`批注` 被挤到第二行最左侧（`15-long-1024.png`；实测第一行剩 `文件/分析/导出/?`，第二行从 `x=12` 起是 `保存/设置/批注`）。1440 和 1280 还在同一行（`10-long-name-1440.png`、`14-long-1280.png`）。
- 1024/1280 下没有横向滚动条（`document.scrollWidth == innerWidth`），问题是换行与截断，不是溢出。

**改法**：树行把名字包一层 `<span class="tree-name">`（`display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0`）；`.doc-name` 加 `max-width:min(42vw,460px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap`。难度 **S**，CSS 约 30–60 B gzip。

> U4 合计新增约 350–650 B gzip。首屏只剩 27 B（284,973 / 285,000），**必须同时做 O1 或 O2 的字节腾挪，不许抬线**。

---

## U5（P3）设置面板：8 个字段平铺，批注提示词像开发者页面

**证据**（`04-settings-1440.png`、`16-settings-1024.png`）

- 一屏 8 组字段，顺序是 主题 → 自动保存 → 接口地址 → API Key → 模型 → 正文字号 → 联网核对 → 批注提示词；没有分组标题，字号夹在 AI 与联网之间，视觉上找不到「外观 / 写作 / AI」的边界。
- `批注提示词`（`SettingsDialog.tsx:150-158`）默认展开一个带 `<前文> <选区> <后文>` 说明的系统提示词：textarea 88px + 恢复默认 19px + 说明与间距，约占 130px（对话框总高 845px）；首次打开设置的人会先看到它，像开发者配置页。
- 好的一面：顶部「密钥只存在这台机器的本地存储里，不会上传」、API Key 下的「未配置：分析会用本地模拟批注」都说清楚了；1024×768 时对话框 859 / 726 需要滚动，但 `.dialog-actions` 是 `position:sticky`（`styles.css:1044-1053`），「保存」始终可见（`16-settings-1024.png`）。
- 主题与字号可用：深色保存后立即生效（`24-dark-1440.png`），字号 26 保存后 `.editor` 立即 26px（`25-font26-dark-1440.png`）。设置本身不阻塞首次使用，所以排在 P3。

**改法**

- 加三组小标题：**外观**（主题、正文字号）、**写作**（自动保存）、**AI**（接口地址、API Key、模型、批注提示词）。`联网核对` 挪到 AI 组末尾或独立「可选」组。
- 把「批注提示词」折进 `<details><summary>高级：批注提示词</summary>`，默认收起；`恢复默认提示词` 跟着收进去。可见字段从 8 个降到 7 个；若把「联网核对」也收进「可选」区，降到 6 个。
- 难度：**M**（HTML 结构 + 少量 CSS，约 100–200 B gzip；文案与 `aria` 要一起改）。

---

## 最近文件与文件夹状态（任务 2 核查）

| 状态 | 实际 | 证据 |
| --- | --- | --- |
| 浏览器 / 无宿主 | 「最近打开」整段不渲染，只有 4 个文件动作 | `03-file-menu-1440.png`；`FileMenu.tsx:146` 只在 `recent` 非 null 时渲染，`App.tsx:3487` 传 `null` |
| 宿主 + 无最近记录 | 标题「最近打开」+「还没有最近打开的文件。」+「清除最近记录」 | `17-recent-empty-1440.png` |
| 宿主 + 有记录 | 每条两行：文件名 + 目录；长名在 330px 内正确省略 | `18-recent-filled-1440.png`；`recent-name` 的 `scrollWidth=521 > clientWidth=330`，显示为「…」 |
| 无文件夹 | 树空态「现在打开的是示例 / 打开文件夹后，保存会写回原文件 / [打开文件夹…]」 | `01-first-open-1440.png` |
| 有文件夹 | 树头工作区名 + `＋新建 ▾ ⟳ ⋯`；空目录无提示；展开态跨页签丢失 | `05-folder-1440.png`、`09-empty-folder-sidebar.png`、`08-after-tab-switch-1440.png` |

小问题（不单列）：空列表仍有可点的「清除最近记录」（`FileMenu.tsx:179-189`）；示例与真实文件夹的区分目前只靠树里的一句「现在打开的是示例」，`示例` 徽标（`FileTree.tsx:334`）永不可达。

## 其它观察（不单列，供 planner 取舍）

- **窄窗分析没有自动给出结果**：窗口 <1120px 时批注栏是浮层（`styles.css:2161`），但 `runAnalysis` 不调用 `openRail()`。1024×768 下点段落按 `Ctrl+Enter`，批注栏仍是 `display:none`、`.app` 没有 `rail-open`、「批注」按钮 `aria-expanded=false`（`27-analyze-1024-rail-closed.png`）。用户只看到正文高亮，得自己想到点顶栏「批注」。建议分析开始时 `openRail()`，或给一条「意见在批注栏」的提示。
- **「＋ 新建」总在根目录**：`nextNewName` 只看根目录（`src/App.tsx:1910-1938`），在 `长篇/第一卷` 下点新建也落在根目录；按钮没有说明这一点。可在按钮 title 写「新建到根目录」，或跟随当前展开/选中的目录（后者要做冲突与路径校验，难度 M）。
- **最近列表的“移除”没有入口**：协议支持 `recent-remove`（`src/App.tsx:2311-2322`），但菜单里没有单项移除按钮，只有打开失败时的错误提示能触发。小问题，发布前可顺手补。

## 验过、没有问题的

- **模拟批注说清楚了**：未配 Key 时顶部按钮是「分析本段（模拟）」，右栏固定一条「未配置 API Key，下面是本地模拟批注，不调用模型」（`MarginRail.tsx:87`），每张卡片带「模拟」chip（`MarginRail.tsx:110`）。`21-simulated-annotations-1440.png` 里 3 条意见、采纳/忽略/追问/联网核对都在，不会被误认为真模型。
- **文件菜单键盘**：打开聚焦「新建」，方向键/Home/End 可走，Esc 回触发器（实测 `file-menu-trigger`）；浏览器里不显示最近项是设计，不是漏渲染。
- **深色主题与字号**：三档切换正常，深色下正文 `rgb(233,230,224)` / 背景 `rgb(21,23,26)`；字号 26 保存后立即生效。
- **1024/1280**：无横向滚动，工具栏与编辑区不溢出；问题只在长文件名（U4-d）。
- **宿主最近不可用**：`state=disabled` 时菜单显示「没有可写状态目录。」（`26-recent-disabled-1440.png`），其他文件动作仍可用，不是白屏。此时「清除最近记录」也仍然可点（同上面最近列表的小问题）。

## 界面优化机会（≤3）

1. **把设置/快捷键对话框改成懒加载**：`src/App.tsx:30-31` 是静态 import，`SettingsDialog`（6,259 B）+ `ShortcutsDialog`（2,804 B）首屏用不到。改成 `lazy()` 估计省 1.5–2 KB gzip（实施后以 `dist` 实测为准），足够支付 U4 的 350–650 B；第一次点「设置」多一次本地 chunk 往返，可接受。
2. **删掉不可达的示例工作区**：`App.tsx:63` 的 `demoWorkspace` import、`workspace.ts:290-381` 的 `DEMO_*` 与 `demoWorkspace()`、`FileTree.tsx:334,340-341` 的 demo 分支、`styles.css:290-306` 的 `.file-badge`/`.file-tree-demo-note`。要么按 U3-B 真正接上，要么清理；现在两头都不成立。`demoWorkspace` 已被 tree-shake，清理实测只省 **约 200–300 B gzip**（FileTree 分支 + CSS），但能消掉一个永远不会为真的状态。
3. **最近列表的空态与单项移除**：空列表时隐藏或禁用「清除最近记录」；每条 hover 出「×」，走已有的 `recent-remove` 协议（`FileMenu.tsx:179-189`、`App.tsx:2311-2322`）。约 100 B，属于发布前的整齐度。

## 建议的验收顺序

1. U1 先修（数据风险），并在 `npm test` 里加一条「开 A → 新建 → 保存 → A 不变」。
2. U4 的字节腾挪先做（O1/O2），再落 P3/P4；每落一项都量 `dist` 首屏 gzip，确认 ≤285,000。
3. U2/U3 的文案与焦点改动一起验收：首屏、`Ctrl+Alt+N` 后、打开文件夹后三个状态各截一张 1440×900。
4. U5 最后做，避免与 U2/U3 同时改 `SettingsDialog` 与空态文案。
