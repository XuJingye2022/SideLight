# 第 8 轮缺陷侦察（finder: r8-bug）

主题：自动保存 / 关闭保护 / 最近文件。只侦察，未改 `src/`、`host/`、`dist/`。
- 仓库 `D:\Documents\SidelightProgram`，HEAD `94ceeda`（产品代码 `d65164a`，0.20.0）。宿主 exe `host/bin/Sidelight.exe` 构建于 22:50，晚于 `host/Program.cs`（21:23），所以下面的宿主结论适用于当前源码。
- 运行时证据：CDP `9222` → `http://localhost:5173`。脚本 `.tmp/r8-bug/probe.mjs`（草稿/宿主模式/IME/配额）、`.tmp/r8-bug/close-probe.mjs`（关闭保护）；日志 `probe.log`、`close-probe.log`。
- 未验证项在各条里单独标注。

## 结论摘要

1. **宿主文档的改动没有任何持久落点**：页面不写 localStorage 草稿，也没有 `.sidelight` 草稿（宿主模式没有文件夹句柄），宿主关窗又没有 dirty 检查。关窗 = 整场编辑永久丢失（B1）。
2. 浏览器没有 `beforeunload` 保护；页面里唯一的 beforeunload 监听是 Vite 的 `willUnload` 标志（不拦关窗）。实测 dirty=true 关页无任何提示（B2）。
3. IME 组合期间 `onUpdate` 已经触发，草稿里已经出现半成品；自动保存若照抄草稿的触发点，会把未上屏的拼音写进磁盘（B3）。
4. 自动保存必须复用 `requestSave` 的差异门，否则会静默写掉引用式链接/表格，直接回退第 7 轮的修复；浏览器 FSA 路径又没有任何外部修改检查（B4）。
5. `.sidelight/drafts` 只写不读；6 MB 文档的 localStorage 草稿会 QuotaExceededError 且被静默吞掉。草稿兜底目前是纸面上的（B5）。

## 1. 自动保存风险清单（正确行为）

| # | 情形 | 正确行为 |
| :-- | :--- | :--- |
| 1 | 正常编辑后停顿（debounce 800–2000 ms） | 写；状态栏「已自动保存 HH:MM」 |
| 2 | 撤销/重做回到保存基线（`dirty=false`） | 不写（App.tsx:582 已按基线算 dirty） |
| 3 | 差异门 `losses>0` 且本次文档未确认 | **不写**；状态栏改「需手动保存」，点保存走确认 |
| 4 | IME 组合中 | 不写；`compositionend` 后再延 300–500 ms（B3） |
| 5 | 宿主写回在飞时再次触发 | 只留最新一份（已有 `pendingHostSave` 模式，App.tsx:1752-1755） |
| 6 | 切文档 / 新建 | 先 flush 或明确放弃；切之前已有 `waitForHostSave`（App.tsx:1396） |
| 7 | 关窗 / 关页 | 先 flush；失败或来不及则询问（第 3 节） |
| 8 | 导出 Markdown/HTML | 不写盘、不动 dirty 与基线（导出只读 `currentMarkdown()`） |
| 9 | 6 MB 大文件 | 写盘允许，但必须节流 + 不在输入路径同步序列化；草稿要另有落点（B5） |
| 10 | 外部修改过（mtime/size 变） | 暂停自动保存，提示选择「重载/覆盖/另存为」；宿主已返回 `PATH_CHANGED`，FSA 没有（B4） |
| 11 | 只读 / argv 只读 / 无句柄 | 不自动写；Ctrl+S 仍走另存为 |
| 12 | 保存失败（占用/磁盘满/权限） | 保留 dirty，状态栏红色「自动保存失败」+ 重试，连续失败退避，不静默 |
| 13 | 宿主 10 s 无回包 | 保留 dirty（App.tsx:1764-1771 已有超时） |
| 14 | 刚打开、没有改动 | 不写（`dirty=false`，宿主 `text == meta.Text` 也会直接返回 OK） |

## 2. 现状（实测）

- **何时写**：`onUpdate` 每按一次键就同步写一次 localStorage（`sidelight.doc.v1`，整篇正文 + name + savedAt）。实测打 11 个字符 = 11 次写，单次 0.1–0.2 ms（短文档）。
- **写到哪**：非宿主文档 → localStorage；宿主文档 → **哪也不写**（App.tsx:589-596 明确跳过；`.sidelight/drafts` 需要文件夹句柄，App.tsx:598-609）。
- **刷新能否恢复**：普通文档能，实测刷新后正文保留、状态栏出现「草稿 22:59」，但 `dirty=false`（恢复即基线，关页不会再提醒，也没有句柄）。宿主模式实测刷新后正文回到文件原样，打的字消失。
- **有句柄时是否自动写盘**：否。全仓库没有自动保存代码（只有草稿写盘，800 ms debounce，`.sidelight/drafts/<key>.md`）。
- **关窗时发生什么**：浏览器——无提示，dirty 状态直接消失（仅 localStorage 草稿兜底）；宿主——`form.FormClosed` 只写日志（Program.cs:131），`FormClosing` 不存在，`dirty` 只在 argv 转发时读（Program.cs:1061-1119），所以静默关闭。
- 打字期间状态栏没有保存状态（`chips: []`），只有保存成功后的持久提示。

## 3. 关闭保护

**浏览器**：源码无 `beforeunload`（`src/` 全量 grep 0 命中）。实测页面有 1 个 beforeunload 监听，函数体是 `() => { willUnload = true; }`——Vite HMR 客户端的，不拦。`window.onbeforeunload` 为 null。dirty=true 时 `page.close({runBeforeUnload:true})` 没有任何 dialog。加保护：`dirty && !autosavePending` 时 `preventDefault(); returnValue=''`；由于 beforeunload 只能「留/走」，必须配自动保存兜底。

**宿主**：无 `FormClosing`。要加确认时三条路径的实现：
- **Save**：`FormClosing` 里 `e.Cancel = true`，`ExecuteScriptAsync` 读 `__slState.dirty`，再发一条 `type:'ask-save'`（或复用 save 消息）让页面用当前正文回 `save-result`；宿主收到 `ok` 后置 `closeAfterSave=true` 再 `form.Close()`。不能用 `.Result` 阻塞 UI 线程（WebView2 回调也在 UI 线程，会死锁）。
- **Discard**：不能直接关。先让页面把正文交给宿主，宿主写 `.sidelight/drafts/<cacheKey>.md`（AGENTS.md 允许的落点），记一条「放弃时留了草稿」，下次打开询问恢复；否则和 B1 一样是永久丢失。
- **Cancel**：`e.Cancel = true`，什么都不做。
- 边界：`dirty` 读回 `-1/unknown`（页面未挂载）时按 Cancel 处理；`saving` 中关窗要等回包；转发（argv）已有 Yes/No 提示（Program.cs:1107-1118），关窗应与之共用文案与 dirty 读取。

## 4. 最近文件（设计风险，功能未实现，未验证）

- **页面拿不到路径**：`/__doc` 只回 `fileName`（Program.cs:490-506），宿主注释明确「页面永远拿不到路径」（Program.cs:40）。所以纯渲染进程的最近列表在宿主模式无法重开文件。
- 建议键与归属：宿主自己维护（`%LOCALAPPDATA%\Sidelight\recent.json`，或复用 pipe），页面只显示；浏览器路径用 `sidelight.recent.v1` 存 `{name, path, at}`，上限 8。argv 打开应记入（这是主入口），按规范化全路径去重，大小写不敏感。
- **路径失效**：打开前 `File.Exists`；失败给可操作提示（「文件不在了：从列表移除 / 用打开文件重新定位」），并立即清理该条。
- **隐私**：文件名可能敏感（辞职信.md）。只存本地、不联网；提供「清除最近文件」入口（文件菜单内，点后立即重写存储）；不要把正文或摘要写进最近条目。
- 不要把最近文件放进 `sidelight.doc.v1`（那个键已经存整篇正文，见 B5）。

## 5. 失败面

| 失败 | 现在的表现 | 用户能否看见/恢复 |
| :--- | :--- | :--- |
| 宿主写回磁盘满 | 所有 `IOException` 都映射成 `FILE_LOCKED`（Program.cs:656）→「文件正被别的程序占用」，文案错了 | 能看见但原因错；dirty 保留。未验证（要真填满盘） |
| 宿主文件被占用 | `FILE_LOCKED`，保留 dirty | 能看见，可重试 |
| 宿主外部修改 | `PATH_CHANGED`，拒绝写回 | 能看见，文案可操作 |
| 浏览器 FSA 外部修改 | `writeNode` 直接 `createWritable`+write，无 mtime/size 比对（workspace.ts:240-248） | **看不见**：静默覆盖别人的改动 |
| 浏览器权限被撤销 | `createWritable` 抛 NotAllowedError →「保存失败：…」 | 能看见；自动保存需要同样的可见反馈 |
| 自动保存失败 | 目前不存在；草稿写失败 `writeCache` 只回 false（cache.ts:86-110），调用方不看（App.tsx:606） | 看不见 |
| localStorage 配额 | 6 MB `setItem` 实测 `QuotaExceededError`，被空 catch 吞（App.tsx:593-595） | 看不见 |

## 缺陷 B1–B5（按影响排序）

### B1 宿主文档：没有草稿、关窗不查 dirty，关窗即永久丢失

**现象/风险（已用宿主模式实测；真实宿主进程关窗未验证）**
宿主模式（argv 双击 .md）下，`hostModeRef=true` 让 `onUpdate` 跳过 localStorage（App.tsx:589-596）；`.sidelight` 草稿要求 `file.path && workspace && !demo`（App.tsx:598-609），宿主文档没有文件夹句柄，所以哪里都不写。宿主侧只有 `form.FormClosed += Log`（Program.cs:131），没有 `FormClosing`；`dirty` 只在转发新文件时读（Program.cs:1061-1119）。用户打一整篇，点 X，进程退出，改动消失且没有任何提示。

**复现/验证**
- `.tmp/r8-bug/probe.mjs` 阶段 2：用 stub `/__doc` 进宿主模式，打「宿主里打的字。」→ `writes: []`、`lsKeys` 只有无关键、`slState.dirty=true`；`reload` 后 `keptTyped: false`，正文回到文件原样。
- 代码：`App.tsx:589-609`、`host/Program.cs:129-131`、`1061-1119`。
- 真实宿主未验证：启动 `host/bin/Sidelight.exe .tmp\r8-bug\host-probe.md`（带 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9225`）→ CDP 打字 → `PostMessage WM_CLOSE` → `host.log` 与文件内容。本轮启动尝试被 shell 阻塞，未完成。

**影响**：最高。桌面主流程（双击 .md）里一次误关 = 整场写作丢失，且用户此前被「保存成功提示 / 草稿」暗示有保护。

**建议**
1. 宿主 `FormClosing` 做 dirty 检查（第 3 节三路径），`e.Cancel` + 异步保存，不用 `.Result`。
2. 页面对宿主文档也维持一份可恢复草稿：宿主收到正文后写 `.sidelight/drafts/<cacheKey>.md`（同级目录），下次打开或下次启动时询问「恢复未保存的改动 / 忽略」；这需要页面在 `pagehide`/定时器里把正文发给宿主，或宿主在 dirty 时主动 flush。
3. 至少先做 1；2 是 Discard 路径的安全网。

**难度**：中（宿主异步关闭 + 草稿落点 + 恢复询问）。

### B2 浏览器没有关闭保护；恢复出来的草稿被标成「干净」

**现象/风险（已验证）**
`src/` 里没有 `beforeunload`。实测 dirty=true 关页无 dialog；页面唯一监听是 Vite 的 `willUnload`。刷新靠 localStorage 草稿恢复，但恢复后 `dirty=false`、没有句柄，下一次关页不再提醒；「已保存」与「恢复的草稿」在状态上无法区分。

**复现/验证**
- `.tmp/r8-bug/close-probe.mjs`：`listenerSource: "() => { willUnload = true; }"`、`dirtyBeforeClose.dirty=true`、`dialogsOnClose: []`。
- `probe.log` 阶段 1：刷新后 `keptTyped: true`、`chips: ["草稿 22:59"]`、`slState.dirty=false`。

**影响**：高。浏览器（dev/便携以外的使用方式）里误关标签或刷新会丢掉 FSA 句柄；恢复后用户以为已经安全。

**建议**
- `dirty && !autosavePending` 时挂 `beforeunload`；有可写句柄时优先靠自动保存把 dirty 清掉，beforeunload 只兜「保存中/保存失败」窗口。
- 恢复草稿后不要立刻 `dirty=false`：保持「未保存到文件」状态（另设 `recovered` 标记），保存仍走另存为并给可见提示。

**难度**：低–中。

### B3 IME 组合期间 `onUpdate` 已触发，自动保存会写半成品

**现象/风险（已验证，CDP 组合事件；真实系统输入法未验证）**
`Input.imeSetComposition('组合中')` 后、`insertText` 提交前，草稿里已经出现「组合中」，`dirty=true`，并发生 1 次 localStorage 写。自动保存若照抄草稿的触发条件（`onUpdate` + debounce），停顿超过 debounce 就会把未上屏的拼音/半成品写进磁盘文件。

**复现/验证**：`.tmp/r8-bug/probe.mjs` 阶段 3：`duringComposition.newWrites=1`、`draftHasComposition=true`、`draftTail="…基线。组合中"`。

**影响**：中–高。中文用户主场景；写盘后外部工具/同步盘会看到乱码式半成品，崩溃时文件里也是半成品。

**建议**：自动保存判定加 `editor.view.composing === false`，并在 `compositionstart` 时清掉待触发的定时器、`compositionend` 后重新计时（300–500 ms）。草稿写盘同样应加这个门。

**难度**：低。

### B4 自动保存会绕过差异门；浏览器路径没有外部修改检查

**现象/风险（代码核对；自动保存未实现，运行时未验证）**
四条保存路径现在统一走 `requestSave`（App.tsx:1691-1716），`losses>0 && !saveWarned` 时弹确认。自动保存若直接调 `performCommit`/`writeNode`，就会绕过这个门，把引用式链接定义、表格规范化等删除静默写盘——正好回退第 7 轮的主修复。另：宿主写回有 mtime+size 校验（Program.cs:613-617，`PATH_CHANGED`），浏览器 `writeNode`（workspace.ts:240-248）没有；同一文件在别的编辑器里改过，自动保存会无提示覆盖。

**复现/验证**
- 代码：`requestSave` 的 losses 分支、`performCommit` 入口无 losses 参数；`writeNode` 全文无 mtime 比较。
- 未验证：自动保存尚未实现，无法跑出实际覆盖行为；可在实现后用两个窗口同开一个 FSA 文件验证。

**影响**：高。静默改写正文比丢改动更隐蔽，且违背上一轮的验收项。

**建议**
- 自动保存必须走同一个 `requestSave('auto')`：`losses>0` → 不写，状态栏「需手动保存」；`saveWarned` 只对当前文档生效。
- 打开时记 `{mtime, size}`（FSA：`getFile().lastModified` + `size`）；每次自动写前比对，不一致 → 暂停自动保存并提示三选一（重载/覆盖/另存为），宿主沿用 `PATH_CHANGED` 文案。

**难度**：中–高。

### B5 草稿兜底是纸面的：只写不读、6 MB 静默失败、保存后仍显示「草稿」

**现象/风险（已验证）**
1. `.sidelight/drafts` 只在 App.tsx:606 写、1571-1572 删；`readCache` 全仓库只用于 annotations（App.tsx:1313），草稿从不读回。
2. 6 MB 文档：localStorage `setItem` 抛 QuotaExceededError，被空 catch 吞（App.tsx:593-595）；FSA 草稿仍写，但没人读 → 崩溃后无恢复入口。
3. 保存成功后 `finishSaved` 把整篇正文再写回 localStorage 并带 `savedAt`（App.tsx:1566）；下次启动 `draftShown=initial.savedAt>0`，给已保存的文档显示「草稿 HH:MM」。

**复现/验证**
- `probe.log` 阶段 1 `quota: {ok:false, name:"QuotaExceededError"}`；刷新后 `chips:["草稿 22:59"]`。
- 代码位置同上；`readCache(..., 'draft', ...)` 0 命中。

**影响**：中–高。自动保存失败时，用户以为「至少还有草稿」，实际没有；同时整篇正文长期留在 localStorage，属于隐私面。

**建议**
- 打开文件时（有句柄且非宿主）读一次 `.sidelight/drafts/<key>.md`，与磁盘正文不同则询问恢复/丢弃；宿主模式由宿主写同一位置（B1）。
- 草稿写失败要让状态可见（`writeCache` 返回值传到状态栏）。
- 保存成功后不要把整篇正文留在 `sidelight.doc.v1`：改存 `{name, savedAt:0}` 或删键；「草稿」标签只在确有未保存正文时出现。

**难度**：中。

## 优化机会（3 条）

1. **三处重复的草稿持久化**：`onUpdate`（App.tsx:586-596）、源码模式 effect（1226-1236）、`loadIntoEditor`（1384）、`finishSaved`（1566）各写一遍 `sidelight.doc.v1`，其中三处是整篇 `JSON.stringify`。抽一个 `persistDraft(text)` 并挪到 debounce/空闲，能顺手解决 6 MB 的输入卡顿与配额静默失败。
2. **草稿写盘每次重算目录**：定时器里 `parentDirectory(space, file.path)`（App.tsx:605）每次逐级 `getDirectoryHandle`；已有 `cacheDirFor()`，复用即可，且可在切文档时 `clearTimeout(draftTimerRef)` 避免旧闭包多写一次。
3. **`cacheKey` 40 字符截断会撞键**：`cache.ts:37` 截断后不同文件可能同名（如两个长中文标题前半相同），草稿互相覆盖；用短哈希后缀（4–6 位）即可，`cache.test.ts` 已有覆盖。

---
证据文件：`.tmp/r8-bug/probe.mjs`、`probe.log`、`close-probe.mjs`、`close-probe.log`。未验证项：真实宿主进程关窗、真实系统 IME、磁盘满、FSA 外部修改竞态、最近文件（功能未实现）。
