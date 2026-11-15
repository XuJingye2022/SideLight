# 第 04 轮 · 缺陷侦察（finder: bug）

日期：2026-11-15 19:27–19:40。基线 `db4f617`（v0.17.0），源文件未改。环境：Windows 11、Node 24.21、dev `http://localhost:5173`、CDP `9222`；宿主 `host/bin/Sidelight.exe` 用 `host/build.ps1` 重建一次（只读 `dist`，未跑 `npm run build`），宿主 CDP 用 9333 / 9334。

方法：全部用 Playwright/CDP 脚本现场复现。文件夹句柄用 OPFS 目录句柄或自定义句柄桩替换 `showDirectoryPicker` / `showOpenFilePicker`，保存路径与写回内容用真实句柄读写验证；宿主用 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333` 驱动。脚本在 `.tmp/r4-*.mjs`，日志在 `.tmp/r4-*.log`。**未改 `src/`、`host/`。**

| 编号 | 问题 | 影响 | 难度 |
| :--- | :--- | :--- | :--- |
| B1 | 无磁盘路径时 `Ctrl+S` 静默下载，不确认、不给真实落点、`dirty` 永不清零；下载被取消也报「已下载」 | 高 | 中 |
| B2 | 打开文件夹 / 试用示例之后，界面再无「打开文件夹 / 打开文件」入口 | 高 | 低 |
| B3 | 源码模式下导出 HTML 与纯文本，导出的是旧内容，仍提示成功 | 中高 | 低 |
| B4 | 没有「新建 / 另存为」；保存文件名被示例名污染（`示例 · 未命名.md`、`开始写.md`） | 中 | 中 |
| B5 | 撤销回保存时的内容后 `dirty` 仍为 true；脏标记从不与内容比对 | 中 | 低 |

---

## B1 无磁盘路径时 `Ctrl+S` 静默下载：不确认、落点不可靠、`dirty` 永不清零

**现象**

- 首屏示例文档（`示例 · 未命名.md`）或宿主 `Sidelight.exe some.md` 打开的文档没有 `FileSystemFileHandle`。按 `Ctrl+S`（或点「保存」）后立刻触发浏览器下载，文件名直接取文档名，没有目录选择、没有「另存为」、没有落点确认。
- 下载完成后才出现 toast：「这篇还没有磁盘路径。副本已下载到「下载」文件夹；要写回原文件，先用「打开文件夹」打开它所在目录。」（`role=status`，6 秒消失，没有「选择位置」或「打开文件夹」按钮）
- `dirty` 故意保持 true（`src/App.tsx:1129`），顶栏脏点永亮；此后每次切换文档都弹「有未保存的改动」，每次 `Ctrl+S` 都重新下载。
- 文案固定写死「已下载」，`saveBlob` 无法判断下载结果（`src/App.tsx:1087-1098`）。宿主里 CDP 观测到下载被取消（`downloadProgress state=canceled, receivedBytes=0`）时，页面照样报成功。
- 已打开文档（走 `loadIntoEditor`）首次保存会弹「保存前对比」对话框，但那张框只讲 Markdown 规范化差异，与「存到哪里」无关；首屏示例连这张框也没有。
- 宿主 argv 打开的 `some.md` 保存前后 **SHA256 完全相同**，确认不会写回原文件。

**复现**

1. `http://localhost:5173` → 清 localStorage → 在正文末尾打字 → `Ctrl+S`。
2. 观察到下载文件 `示例 · 未命名.md`（579 B，内容含刚打的字），toast 见上，`window.__slState.dirty === true`。
3. 再按两次 `Ctrl+S`：CDP 记到 3 次 `Page.downloadWillBegin`。
4. 宿主：`host/bin/Sidelight.exe .tmp/r4-argv/some.md` → 打字 → `Ctrl+S`；`some.md` 哈希不变，`Page.downloadProgress` 为 `canceled`、`receivedBytes=0`，磁盘上找不到副本（`%USERPROFILE%\Downloads` 不存在），toast 仍说已下载。

**证据**

- `.tmp/r4-save.log`：`PASS 无句柄 Ctrl+S 落盘到下载目录 ([{"n":"示例 · 未命名.md","size":583}])`、`PASS 保存后 dirty 仍为 true`、`PASS 提示只说明落点，没有「选择位置/另存为」按钮 (action buttons=0)`。
- `.tmp/r4-save2.log`：`# 三次 Ctrl+S：文件数 1/1/1，downloadWillBegin 事件 3/3/3`。
- `.tmp/r4-host-argv.log`：`FAIL 宿主里 Ctrl+S 写回 some.md（哈希不变即为不写回） (before=965d3c26dab0 after=965d3c26dab0)`、`PASS 原文件仍只有原文（未被写回）`、`PASS 宿主页提示说明落点`。
- `.tmp/r4-host-dl.log`：`# Ctrl+S 后目录： []`、`[["willBegin","probe.md"],["progress","canceled",0,46]]`；同页直接下载的对照组（不 revoke、立即 revoke）也被取消 → 取消不是 revoke 时序造成的，是宿主下载通道本身。
- 截图：`shots/round-04/r4-save-download-toast.png`、`shots/round-04/r4-host-argv.png`。
- 源码：`src/App.tsx:1086-1098`（`saveBlob` 无失败路径）、`1125-1133`（固定成功文案 + `setDirty(true)`）、`src/lib/workspace.ts:225-233`（无句柄写盘只抛错，没有「另存为」出口）。

**影响**

- 用户以为已存盘，实际只是多了一份下载副本；`dirty` 永远亮，关闭/切换时一直弹确认，用户会学会忽略确认。
- 宿主要求 `some.md` 这类既有文件永远写不回；用 argv 打开再改，只能拿到下载副本，且宿主下载可能被取消而界面仍报成功。
- 副本名是 `示例 · 未命名.md`，带「示例 ·」前缀，不像用户自己的文件。

**建议**

- 无句柄保存改走一次「另存为」：`showSaveFilePicker` 拿句柄后写回并 `setDirty(false)`；不支持或用户取消时给「选择文件夹 / 打开文件夹」的明确下一步，不要直接下载。
- 必须下载时，先确认再下载，并给出可复制的绝对落点（宿主可给 `%USERPROFILE%\Downloads`）；文案改成「已发起下载」，或下载失败时改报错。`saveBlob` 增加失败返回（可用 `download` 事件或先探测 `anchor` 点击结果，至少不要在无法确认时宣称成功）。
- `dirty` 增加第三种状态（如「已下载副本，未写回」），不要让脏点一直亮。

**难度**：中。`showSaveFilePicker` 在 WebView2 的可用性需要实测；需要新增「无句柄但有名字」的文档态与另存为流程（与 B4 共用）。

---

## B2 打开文件夹 / 试用示例之后，再也没有「打开文件夹 / 打开文件」入口

**现象**

- 「打开文件夹 / 打开文件 / 试用示例」只渲染在 `workspace == null` 的空状态里（`src/components/FileTree.tsx:112-131`）。`App.tsx:1964-1965` 把两个回调传给了 `FileTree`，但 `FileTree` 在工作区存在时不渲染这两个按钮，也没有别处调用它们。
- 一旦打开文件夹或点「试用示例」，这三个按钮全部消失，顶栏、菜单、文件树头部都没有替代入口（页面 22 个按钮里 0 个匹配）。想换一个文件夹、或点完示例后想打开自己的稿子，只能刷新页面（或重启宿主）。
- 示例态侧栏只有「示例文集 · 收起箭头 · 5 个示例文件」。

**复现**

1. `http://localhost:5173` → 点「试用示例」→ 在侧栏、顶栏、菜单里找「打开文件夹 / 打开文件」→ 不存在。
2. 或先点「打开文件夹」（OPFS 句柄桩）打开一个文件夹 → 同样找不到换文件夹的入口。
3. 刷新页面后入口回来（`workspace` 是 `useState(null)`，不持久化）。

**证据**

- `.tmp/r4-evidence.log`：`FAIL 示例打开后仍有「打开文件夹」（需求） (匹配=无)`、`FAIL 示例打开后仍有「打开文件」（需求） (匹配=无)`、`# 示例态侧栏文字："示例文集 | ‹ | 开始写.md | 关于侧灯.md | 交稿前看一眼.md | 带元数据的笔记.md | 参考与出处.md"`。
- `.tmp/r4-undo-ws.log`：`FAIL 工作区打开后仍有「打开文件夹」入口（需求） (匹配=无；按钮总数=22)`。
- 截图：`shots/round-04/r4-demo-no-open-entry.png`、`shots/round-04/r4-folder-no-reopen.png`。
- 源码：`src/components/FileTree.tsx:112-131`、`src/App.tsx:1958-1975`。

**影响**

- 第一屏的主按钮里有「试用示例」，用户点进去就进不了自己的文件，只能刷新；这与「新建缺失」叠加成死路：进示例 → 没有新建 → 没有打开别的文件。
- 宿主里 argv 打开的是单文件（`workspace == null`），入口还在；但用户一旦点「打开文件夹」，同样回不去。

**建议**

- 把「打开文件夹 / 打开文件」提到顶栏或常驻菜单（文件树头部再加一个「打开其他文件夹」），空状态保留引导文案。
- 顺手把 `workspace` 的打开入口与「新建」并列，形成「新建 / 打开文件 / 打开文件夹」三件套（见 B4）。

**难度**：低。只动 `FileTree`/顶栏接线，不改数据流。

---

## B3 源码模式下导出 HTML 与纯文本导出的是旧内容，仍提示成功

**现象**

- 在「源码」模式里改正文（textarea），点「导出 → HTML」或「导出 → 纯文本」，导出的文件不含源码里的新内容；只有「导出 → Markdown」是对的。
- 原因：`exportAs` 的 HTML 分支用 `editor.getHTML()`、纯文本分支用 `editor.getText()`，二者都是编辑器里的旧内容；Markdown 分支走 `currentMarkdown()`，它在源码模式下返回 `sourceText`。导出成功 toast 照常显示「已导出 xxx.html」。
- 这正是「引用式链接 / 表格对齐」等保真修正在引导用户去源码模式的路径，导出会静默丢最新改动。

**复现**

1. `http://localhost:5173` → 打字 → 点「源码」→ 在 textarea 末尾输入 `源码独有标记-SOURCE-ONLY。`
2. 导出 → HTML，打开 `示例 · 未命名.html` 搜该标记 → 没有（3194 B，仍是旧的正文）。
3. 导出 → 纯文本，搜该标记 → 没有（579 B）。
4. 导出 → Markdown，搜该标记 → 有。

**证据**

- `.tmp/r4-save.log`：`FAIL 源码模式下导出 HTML 含源码里的新内容 (示例 · 未命名.html；文件里 没有该标记)`、`FAIL 源码模式下导出纯文本含源码里的新内容 (示例 · 未命名.txt)`、`PASS 源码模式下导出 Markdown 含源码里的新内容 (示例 · 未命名.md)`。
- 下载文件：`.tmp/r4-dl/示例 · 未命名.html`（3194 B）、`.tmp/r4-dl/示例 · 未命名.txt`。
- 源码：`src/App.tsx:1380-1411`（HTML `editor.getHTML()` 在 1394，纯文本 `editor.getText()` 在 1405）、`1141-1146`（`currentMarkdown` 才是源码感知的）。

**影响**

- 数据丢失型导出：用户以为导出了最新稿。源码模式又是修格式保真的官方引导路径，触发概率不低。
- 导出文件名本身正确（`exportName` 换扩展名），错的是内容。

**建议**

- 导出统一走 `currentMarkdown()`：Markdown 直接写；HTML 用同一份 Markdown 渲染成 HTML（现有导出/预览管线可复用）；纯文本从同一份 Markdown 去标记。
- 或在源码模式导出前先按「切回编辑」规则把 `sourceText` 落回编辑器，再取 `editor.getHTML()/getText()`，并加一条测试。

**难度**：低。单文件、单函数，附一条回归测试即可。

---

## B4 没有「新建 / 另存为」，保存文件名被示例名污染

**现象**

- 全页没有「新建」「新建文档」「空白文档」「另存为」（`document.body.innerText` 0 命中）。唯一的「新文档」是「试用示例」，它打开的是示例文集里的 `开始写.md`，有示例正文。
- 首屏文档名固定 `示例 · 未命名.md`（`src/App.tsx:77`），清空正文后保存，下载名就是 `示例 · 未命名.md`。
- 在「试用示例」的 `开始写.md` 里写自己的字再保存，下载名是 `开始写.md`——示例文件名成了用户的文件名。
- 没有句柄时也无法另存为（见 B1），用户对文件名没有任何控制权。

**复现**

1. `http://localhost:5173` → 看侧栏与顶栏（无「新建」）。
2. 清空正文 → 打字 → `Ctrl+S` → 下载 `示例 · 未命名.md`。
3. 点「试用示例」→ 在 `开始写.md` 里打字 → `Ctrl+S`（先过「保存前对比」）→ 下载 `开始写.md`。

**证据**

- `.tmp/r4-save.log`：`PASS 界面没有「新建 / 另存为」入口 (none)`、`PASS 文件名 (name=示例 · 未命名.md)`；`.tmp/r4-save2.log`：`PASS 已打开文档首次 Ctrl+S 先弹「保存前对比」`、`PASS 示例文档保存落盘 (开始写.md)`。
- 源码：`src/App.tsx:77`（`DEMO_DOC_NAME`）、`src/lib/workspace.ts:235-308`（示例文件名）、`src/lib/export.ts:152-156`（`exportName` 只在有名字时换扩展名，不会给「未命名」兜底以外的名字，因为 `docName` 从不缺）。

**影响**

- 简报里「新建 → 写 → 保存 → 再打开」的第一环缺失；用户只能清空示例冒充新文档，文件名不可控、不可另存，交付时还要自己改名。
- 与 B2 组合成死路：示例进得去、出不来，也没有新文档。

**建议**

- 加「新建」：空白正文 + 文档名 `未命名.md` + `dirty=false`，首次保存走另存为（与 B1 共用一条通道）。
- 示例文件名与用户文件名分开：从示例保存时默认名改为 `未命名.md` 或让用户先命名，不要沿用 `开始写.md` / `示例 · 未命名.md`。

**难度**：中。需要「无句柄文档」的状态定义与另存为流程，和 B1 同一套改动。

---

## B5 撤销回保存时的内容后 `dirty` 仍为 true；脏标记从不与内容比对

**现象**

- 打字后 `dirty=true`，`Ctrl+Z` 回到刚打开（或刚保存）时的内容，顶栏脏点仍亮、`window.__slState.dirty` 仍为 true。
- 任何 update 都无条件 `setDirty(true)`（`src/App.tsx:413-416`），没有和 `originalText` 比较；源码模式的 `setDirty(true)` 同理（`App.tsx:892-901`）。
- 后果：切换文档多一次确认、关闭前多一次确认，宿主转发前的 dirty 检查（`host/Program.cs:566`）也会多问一次。
- 对比：有句柄保存成功后 `dirty=false` 正确；保存失败后 `dirty` 保持 true 正确（`role=alert` 提示可操作）。

**复现**

1. `http://localhost:5173`（示例）→ 打字 → `Ctrl+Z` 回到原状 → 看顶栏脏点与 `window.__slState.dirty`（仍 true）。
2. 或打开文件夹里的 `a.md` → 改一行 → `Ctrl+Z` → `dirty` 仍 true。

**证据**

- `.tmp/r4-save2.log`：`FAIL 撤销回原状后 dirty 自动变 false（需求） (实际 dirty=true)`；同一次运行里 `PASS 一次 Ctrl+Z 就能整段撤回（不被拆成单字）`。
- `.tmp/r4-undo-ws.log`：`PASS 有句柄保存后 dirty=false`、`PASS 保存失败后 dirty 仍为 true`，与撤销场景对照。
- 源码：`src/App.tsx:413-416`、`892-901`、`1129`、`1697`（脏点渲染）。

**影响**

- 脏点不可信，用户会忽略它；切换/退出确认变噪音；宿主把「有改动」当成必须确认的条件，也会误报。
- 与 B1 叠加时更糟：无句柄保存后 `dirty` 永远 true，即使一次下载都没成功。

**建议**

- 在 `onUpdate` 里比较当前 Markdown 与 `originalText`（含换行风格规范化），相等时 `setDirty(false)`；无句柄下载后不要用 `dirty=true` 表达「未写回」，另加状态。
- 源码模式同样比较 `sourceText` 与基线。

**难度**：低。单处判断，附一条测试（打字 → 撤销 → dirty=false）。

---

## 已检查、未发现缺陷（供 planner 跳过）

| 检查项 | 结果 | 证据 |
| :--- | :--- | :--- |
| 有文件夹句柄时保存 | **写回原文件**，不新建文件、不下载；`b.md` 不动；`dirty=false`；`.sidelight` 缓存写在文档同级 | `.tmp/r4-undo-ws.log`：写回 `a.md`、`b.md` 未变、`before=0 after=0`、`dirty=false`、目录条目 `b.md,a.md,.sidelight` |
| 「打开文件」单文件句柄保存 | **写回原文件**，不下载，`dirty=false` | `.tmp/r4-evidence.log`：`单文件打开后保存写回原文件`、`单文件保存不下载 (下载数=1)` |
| 多文档切换 | 未保存时弹「这篇还有没保存的改动 / 切到「b.md」之前，要先把当前这篇存下来吗？」；「放弃改动」真的丢弃（切回 `a.md` 看不到 `DIRTY-A`）；`b.md` 不沾 `a.md` 的改动与脏标记 | `.tmp/r4-undo-ws.log` |
| 批注跟文档 | `a.md` 分析出 1 条 → 切 `b.md` 后 0 条 → 切回 `a.md` 恢复 1 条；切文档时 `loadIntoEditor` 清空批注并中止在跑的请求 | `.tmp/r4-evidence.log`，截图 `shots/round-04/r4-annotations-per-doc.png` |
| 保存失败语义 | toast 为 `role=alert`：「保存失败：The request is not allowed。改动还在，可以再试一次。」；`dirty` 保持 true；正文改动还在 | `.tmp/r4-undo-ws.log`（自定义句柄让 `createWritable` 抛 `NotAllowedError`） |
| 导出文件名 | HTML / Markdown / 纯文本分别 `示例 · 未命名.html` / `.md` / `.txt`，`<title>` 用文档名，内容对应当前文档（源码模式除外，见 B3） | `.tmp/r4-save.log` |
| 输入法（见下节） | 组合上屏、组合中保存、撤销粒度均正常 | `.tmp/r4-ime.log`、`.tmp/r4-ime2.log` |

## 输入法结论（浏览器，CDP `Input.imeSetComposition`）

**没有发现缺陷，但只是模拟组合事件，不是真实 IME。**

- 正文、标题、代码块、表格单元格、源码 textarea 五处组合后 `Input.insertText` 上屏都正确，没有丢字、没有重复（`PASS 标题里输入法上屏正确 ("IME 标题侧灯")`、`代码块里输入法上屏正确 ("const a = 汉字")`、`表格单元格里输入法上屏正确 ("格表")`、`源码 textarea 里输入法上屏正确`）。
- 组合未上屏时按 `Ctrl+S`：保存内容包含正在组合的原文（示例里保存到的是拼音 `weishangping`），上屏后不重复 → 组合期间保存不丢字，但会把未上屏的拼音写进文件（用户主动保存，可接受）。
- 组合未上屏时按 `Esc`：不会误切源码/预览模式，正文不丢；模拟环境下 Esc 不取消组合，残留拼音（真实 IME 的 Esc 由输入法处理，**未验证**）。
- 组合未上屏时点「设置」：对话框能打开，正文未丢（模拟环境下组合以拼音留在正文，真实 IME 行为**未验证**）。
- 撤销：一次 `Ctrl+Z` 撤回整个上屏词，**没有拆成单字**；紧邻的普通打字会被同一次撤销带走，属 ProseMirror 正常的历史分组（第二次 `Ctrl+Z` 精确回到基线，`# 第二次 Ctrl+Z 后是否还含 AAA：false；与基线相同=true`）。

## 未验证

- 真实中文输入法（微软拼音）候选窗、`Esc` 取消组合、组合中切窗口的行为：CDP 只能注入组合事件，没有真实 IME 进程。
- 宿主里真实 WebView2 下载通道：本次用 CDP `Browser.setDownloadBehavior` 重定向后，所有下载（含页面内直接 blob 下载的对照组）都是 `canceled/0 字节`；宿主没有 `DownloadStarting` 处理器，真实用户侧是弹保存框还是直接落盘 **未验证**。可验证方法：不设 CDP 下载重定向，用真实鼠标点一次保存，观察 `%USERPROFILE%\Downloads` 与 WebView2 下载提示。
- 无句柄保存后按提示「打开文件夹」再点同名文件的端到端循环（预期会再下载一次、磁盘版本覆盖编辑）：只分别验证了各段行为，没有端到端跑。
- 示例保存/download 在真实 Chrome 默认下载目录里的重名规则（本环境是 CDP 重定向目录，连续三次 `Ctrl+S` 只留一份同名文件）。

## 代码优化机会（最多 3 条）

1. **统一保存/导出通道**：`saveBlob`（`App.tsx:1086-1098`）、`commitSave`（1100-1139）、`exportAs`（1380-1412）各自拼 blob、名字与类型，Blob 下载与「是否可写回」的判断分散在三处。抽一个 `writeOut(target, name, content)`，顺带修掉 B3 的源码模式分支和 B1 的成功文案。
2. **`onUpdate` 每个按键都整篇序列化 + `localStorage` 写盘**（`App.tsx:413-440`：`getMarkdown` → 四处 repair → `joinFrontmatter` → `JSON.stringify` → `localStorage.setItem`）。`.sidelight` 草稿有 800 ms 防抖，但 localStorage 没有；长文下这是热点。加同样的防抖/空闲回调，并顺带做到 B5 的 dirty 比较。
3. **文件树入口只在空状态**（`FileTree.tsx:112-131`）：把「打开文件夹 / 打开文件」变成常驻动作（顶栏或树头部），同时去掉 `App.tsx` 里「空状态才给入口」的分支，顺带修 B2。

---

### 复现脚本

```text
node .tmp/r4-save.mjs        # 无句柄保存 / 导出文件名与内容 / 源码模式导出 / 新建入口 / 撤销 dirty
node .tmp/r4-save2.mjs       # 连续 Ctrl+S / 示例保存 / 撤销 / 多文档切换（前半段在本轮环境里因选择器超时中断，结论以 r4-undo-ws 为准）
node .tmp/r4-ime.mjs         # 输入法：正文、组合中 Ctrl+S、Esc、设置对话框
node .tmp/r4-ime2.mjs        # 输入法：标题、代码块、表格、源码、撤销粒度
node .tmp/r4-host-argv.mjs   # 宿主 argv 打开 + Ctrl+S 哈希验证（需 host/build.ps1）
node .tmp/r4-host-dl.mjs     # 宿主下载通道诊断（downloadProgress）
node .tmp/r4-undo-ws.mjs     # 撤销粒度 / 文件夹写回 / 多文档 / 保存失败 / 换文件夹死路
node .tmp/r4-evidence.mjs    # toast 截图 / 示例后无入口 / 单文件写回 / 批注跟文档
```
