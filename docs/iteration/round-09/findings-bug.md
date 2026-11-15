# 第 09 轮缺陷侦察：最近文件（宿主侧）

只侦察，未改 `src/`、`host/`、`dist/`。实测宿主用当前 `host/bin/Sidelight.exe`（2026-11-15 23:56 构建，晚于 `Program.cs`），端口 `47931`/`47932` 隔离，未占用其他 finder 的 `47821`。证据文件：`.tmp/r9-bug/probe.mjs`、`.tmp/r9-bug/probe.log`、`.tmp/r9-bug/host-header.mjs`。

读证据时注意：`probe.mjs` 用 `fetch`，undici 不允许覆盖 `Host`，所以 `probe.log` 里 `Host=localhost` 那条显示 200 是**测试方法错误**；Host 校验用 `host-header.mjs` 的 `node:http` 复测，结果 403（见下表）。`host/bin/host.log` 已被最后一次 47932 探针覆盖，完整路径样例看 `probe.log` 的 S2/S3 行。

**结论**：设计不缺 UI，缺的是「记录归属 + 重开身份 + 失效反馈」三件事的协议。最省事的两种接法（记在 `SetCurrentDoc`、点最新用 argv 重开）都会踩下面 B2/B3。

## 现状核实（实测）

| 项 | 实测结果 |
| :--- | :--- |
| 宿主是否记录打开过的文件 | 不记录。`%LOCALAPPDATA%\Sidelight` 下只有 `WebView2` 与上一轮测试残留 `probe-b`，没有 `recent.json`；`host/bin` 下除 WebView2 profile 外无 JSON。 |
| `GET /__doc` | 200，JSON 只有 `fileName`、编码/行数/大小/mtime、`text`；**无路径、无父目录**，`Cache-Control: no-store`。`Program.cs:505-521`。 |
| Host 校验 | `Host: 127.0.0.1:<port>` → 200；`localhost:<port>`、`evil.example` → 403。`Program.cs:532-537`。 |
| `GET /__recent` | 404，无 `Content-Type`，`no-store`。没有路由，落进静态分支按扩展名拒绝（`Program.cs:264-275`、`320-325`）。 |
| 浏览器里 `/__recent`、`/__doc` | dev server 200 `text/html`（SPA 回退）。页面靠 `window.chrome?.webview` 判断宿主（`App.tsx:2185`），不能靠这两个端点。 |
| 文件菜单结构 | 只有 4 条：新建 / 另存为… / 打开文件… / 打开文件夹…，无最近区（`FileMenu.tsx:10-15`）。菜单 `role="menu"`，↑↓/Home/End/Tab/Esc（`:84-106`）；`.file-menu` 已修宽度与省略号（`styles.css:319-338`），但无 `max-height`/`overflow-y`，而 `.app` 是 `overflow: hidden`（`:91-97`）——视口高 < 约 460 px 时 8 条列表的末项会被裁掉（未实测）。 |
| 第二实例转发 | 实测：`secondary mutex=Global\Sidelight` → `doc open file=b.md` → `pipe sent <完整路径>` → 主实例 `forward applied <完整路径>`，页面标题变 `b.md — Sidelight`。`Program.cs:63-98`、`1298-1303`。 |
| 转发已删除的文件 | 实测：用户界面**完全无变化**（标题仍 `b.md — Sidelight`，无横幅、无提示）；日志只有 `forward ignored <完整路径>`。`Program.cs:1349`。 |
| argv 指向不存在的文件 | 实测：页面横幅「宿主返回 409，这次没有载入正文，也没有回退到旧草稿。」+「重新载入」按钮；文件名只出现在**系统标题栏**「Sidelight — 打不开：gone.md」。`/__doc` 返回 409 `FILE_GONE`。`App.tsx:834-837`、`Program.cs:1181-1183`。 |
| 宿主日志 | 每次打开都写完整路径（`start args=`、`pipe sent`、`pipe received`、`forward ignored`、`open failed path=`），只有 `doc open file=` 用了 `SafeFileName`。`File.AppendAllText` 每行开关文件，无轮转（`Program.cs:1503-1513`）。 |
| 数据目录 | `%LOCALAPPDATA%\Sidelight\WebView2` → `%TEMP%\Sidelight\WebView2` → exe 同级。本机代理沙箱下前两级被拒（`kind=portable`）；同一目录用 pwsh 直接写却成功，说明是沙箱限制，不是普通用户 ACL（真实用户环境**未验证**）。`Program.cs:1063-1097`。 |

## 任务 1：记录设计（建议基线）

- **存哪**：`%LOCALAPPDATA%\Sidelight\recent.json`，与 `WebView2` 子目录平级。理由：卸载器 `RMDir /r "$INSTDIR"`（`installer.nsi:148`）会删 exe 同级文件，而 `%LOCALAPPDATA%\Sidelight` 明确保留（`:156`）；放 `WebView2` 里会被清理工具当缓存删。便携场景回退 exe 同级并写日志；不要默认写 `%TEMP%`（重启/清理即失）。
- **格式**：`{"v":1,"items":[{"id","path","name","dir","openedAt","size","mtime"}]}`。`path` 只留宿主；`dir` 只存父目录**最后一段**。`openedAt` 用 UTC ticks（与现有 mtime 一致），显示时转本地时间。
- **上限/去重**：8 条；键 = 规范化全路径（`Path.GetFullPath`，去 `\\?\`，`OrdinalIgnoreCase`）。同一文件再开只更新时间并置顶，不新增。打开失败（`currentDocErrorCode != null`）**不记录**。
- **排序**：`openedAt` 降序，时间相同按 path 稳定排序。
- **多实例/转发**：只有主实例写；第二实例 `SetCurrentDoc` 在互斥锁判断之前（`Program.cs:63-64` vs `:67`），不能在那里记（见 B3）。页面打开菜单时重新 `GET /__recent`；宿主没有推送通道，不做缓存。

## 任务 2：隐私与安全

- 页面只拿 `id/name/dir/openedAt/exists`；`dir` 为单段目录名，响应里不得出现盘符、`\`、`..`、正文或摘要。现有 `/__doc` 已做到「无路径」（实测），最近接口照此。
- `/__recent` 必须显式加 Host 校验（照抄 `Program.cs:532-537`）并用 `WriteResponse`（自动 `no-store`、`Connection: close`）。当前静态分支**没有 Host 校验**，新端点若挂错分支，就会被 DNS rebinding 页面按同源读到路径列表。
- `open-recent` 只收 `{id}`；出现 `path`/`fileName`/`file` 字段就拒绝（保存消息已有这套拒绝，`Program.cs:588-593`）；必须位于 `e.Source` 校验之后（`:562`）。页面拿不到路径，任何「按路径打开」等于把任意文件读写权交给渲染进程。
- 「清除最近打开」= 删记录（写空表 + 删内存），**不删文档、不删 `.sidelight/drafts`、不删 `host.log`**。清理文案要说明日志仍含历史路径（见 B1），或同时清日志。

## 任务 3：失效路径

- 分类与码：文件被删/改名/移动/变成目录/无权限/网络 IO 全部塌缩成 `FILE_GONE`（`Program.cs:427-433`）；只读是打开成功 + `readOnly=true`（`:518-519`），保存时才 `READONLY`；编码/过大是 `ENCODING`/`TOO_LARGE`。最近列表点击要把这些**分别**给文案，不要复用一个「文件不见了」。
- 用户可见结果：点失效条目 → 保留列表项、显示「`name` 打不开了：文件不存在/无权限/网络不可用」+「从列表移除」「重试」。**不要自动移除**：网络盘只是暂时离线，自动删会把用户列表清空。
- 网络盘**未验证**：`ReadDocMeta` 的 `File.ReadAllBytes` 没有超时（`:429`），转发路径还会在 UI 线程同步 `File.ReadAllText`（`:1423`）。离线 UNC 可能让窗口卡住。最近点击应在后台线程读，加 3 s 超时并返回 `NETWORK`/超时文案。
- 文件被同名替换（mtime/size 变了）：可只在打开后由 `/__doc` 的 mtime 失效保存（已有 `PATH_CHANGED`），列表不必管；这是「不做」而不是遗漏。

## 任务 4：失败面

- `recent.json` 写失败：不挡打开；内存列表继续可用；记日志；清除/写入失败时给可见提示，不能显示「已清除」而实际没落盘（否则重启后列表复活，隐私承诺破）。
- 损坏 JSON：捕获解析异常 → 备份为 `recent.json.bad-<时间>` → 空表启动 → 日志。不要静默覆盖，也不要用损坏文件挡启动。
- 并发写：单实例互斥锁保证同一用户只有一个宿主，但第二实例在锁前会跑 `SetCurrentDoc`（B3）；除此之外用 `AtomicWrite`（`Program.cs:710-745`）即可，读方不会看到半个文件。
- 目录不可写：复用 `TryDataDir` 的探针（`Program.cs:1049-1071`），失败就禁用最近区并说明原因，不要每次启动重试写文件。

## B1（高）完整路径已经写进 host.log，且日志无上限

- **现象/风险**：宿主每次打开都写 `start args=`、`pipe sent`、`pipe received`、`forward ignored`、`open failed path=`，值是完整路径（实测）。日志在 exe 同级（安装版 `%LOCALAPPDATA%\Programs\Sidelight\host.log`；便携版随 zip 走），无限增长、不轮转。用户发日志排障、或把便携目录发给别人，就泄露文档名、用户名、目录结构。
- **复现/验证**：跑一次宿主再开一个文件，读 `.tmp/r9-bug/probe.log` 的 S2/S3 日志副本（`host/bin/host.log` 已被最后一次复测覆盖）：`start args=D:\Documents\SidelightProgram\.tmp\r9-bug\b.md` / `pipe sent D:\...\b.md` / `forward ignored D:\...\b.md`。对照 `Program.cs:1503-1513`。
- **证据**：`Program.cs:1182`、`:1302`、`:1430`、`:1455`、`:1487`；`.tmp/r9-bug/probe.log` S2/S3（`pipe sent D:\...\b.md`、`forward ignored D:\...\b.md`）。`doc open` 行已用 `SafeFileName`（`:408`），说明脱敏只是没做全。
- **影响**：隐私边界「页面不拿路径」成立，但本机日志拿走全部路径；与本轮要公开的「最近文件只存本地、可清除」互相拆台。也拖慢磁盘（每次打开 6–10 行 append）。
- **建议**：所有日志路径统一 `SafeFileName` 或只留末两段；新增 `Log` 轮转（1 MB 或 7 天）；README 隐私节写明「日志可能含文件名，可删除」；`清除最近打开` 不必删日志，但文案别暗示已彻底清除。
- **难度**：低（5 处调用 + 20 行轮转）。

## B2（高）现有的「按路径打开」通道对失效文件不吭声：转发静默、argv 只给 409

- **现象/风险**：实测 (a) 第二实例转发一个已删除的 `b.md`：日志 `forward ignored`，页面标题/横幅/提示全不变，用户以为没点到；(b) argv 直接打开不存在的 `gone.md`：页面只显示「宿主返回 409，这次没有载入正文，也没有回退到旧草稿。」，不说是哪个文件、为什么、也不能从列表移除。若「点击最近条目」用「再启动一个 Sidelight 传路径」实现，就会落进这两条。
- **复现/验证**：`node .tmp/r9-bug/probe.mjs`（S3、S5 两节，原始输出在 `probe.log`）。S3：`forward ignored D:\...\b.md`，`ui={title:"b.md — Sidelight",banner:null,notice:null}`；S5：`banner="宿主返回 409，…"`，`/__doc` 409 `FILE_GONE`。
- **证据**：`Program.cs:1349`（`File.Exists` 失败只写日志）、`Program.cs:1181-1183`（只改窗口标题）、`App.tsx:834-837`（非 2xx 一律「宿主返回 <status>」）。
- **影响**：最近文件的核心场景（文件被删/改名/移动）没有可操作结果；用户无法移除死条目。
- **建议**：新增 `open-recent` 消息，宿主返回带条目的结果 `{id, ok:false, error}`；页面显示「`name` 打不开了：文件不存在/无权限/网络不可用」+「从列表移除」+「重试」；保留条目，不自动删。**不要**用转发或 argv 实现窗口内重开。
- **难度**：中（宿主消息 + 页面弹层/菜单项状态）。

## B3（高）记录点若放进 `SetCurrentDoc`，第二实例会在互斥锁之前双写；用数组索引重开会打开错文件

- **现象/风险**：(a) `Main` 在 argv 解析后立刻 `SetCurrentDoc(pendingFile)`（`Program.cs:63-64`），**之后**才判断互斥锁（`:67-98`）。第二实例也会成功打开文件并调用同一函数，然后才转发；把「写最近」放进 `SetCurrentDoc`，就会两个进程同时读改写 `recent.json`，丢条目或写坏（不用原子替换时）。(b) 页面若用列表下标重开，菜单打开期间主实例可能因转发更新文档（`OnNavigationCompleted` 只保留最后一条并重载，`:1298-1303`），下标与宿主记录错位，点击 A 打开 B；随后 `Ctrl+S` 按 `currentPath` 写回（`SaveDocument:616-623`），等于把 A 的内容写进 B。
- **复现/验证**：互斥锁顺序看 `Program.cs:63-98`；转发日志证明第二实例先 `doc open` 再 `pipe sent`（`probe.log` S3）。下标错位需实现后按「打开最近条目 A 的同时用资源管理器双击 B → 再点 A」复现；目前**未实现，属代码核实 + 设计推论**。
- **证据**：`Program.cs:63-64`、`:67-98`、`:1298-1303`、`:616-623`；`OnWebMessageReceived` 对 `path` 的拒绝（`:588-593`）。
- **影响**：写坏/丢最近记录；更严重是打开错文档后保存覆盖错文件，数据丢失。
- **建议**：唯一记录函数 `RecordOpen(path)` 只在**主实例、且打开成功后**调用（放在 `ApplyForwardAsync` / 新的 `open-recent` 成功分支，或移到互斥锁之后）；`open-recent` 只收 `{id, seq}`，`seq` 不匹配返回 `STALE` 让页面刷新；页面每次开菜单重新拉列表。
- **难度**：中（记录点 + 序号/不透明 id + 菜单数据流）。

## B4（中）宿主模式里「打开文件…」走页面 FSA，宿主拿不到路径，最近列表必然漏项

- **现象/风险**：`openSingleFile` 用 `pickFile()`（`App.tsx:1529-1542`），返回 `{name,text,handle}`，**没有绝对路径**（`workspace.ts:56-60`、`159-177`）；`loadIntoEditor` 只清 `hostDoc`（`App.tsx:1483-1485`），不给宿主发消息。宿主不知道这次打开，最近列表里没有刚打开的文件；同一个功能里「菜单打开」与「最近打开」记录口径不一致。
- **复现/验证**：代码核实（未实机点系统选择器）。宿主模式打开 argv 文件 → 文件菜单「打开文件…」选另一个 md → 菜单最近区不含它。实现后按此复现。
- **证据**：`App.tsx:1529-1542`、`:1483-1485`；`workspace.ts:56-60`、`:159-177`；`Program.cs:398-422`（唯一的打开入口）。
- **影响**：用户刚打开的文件不在最近列表，功能看起来坏了；也说明「最近打开」的语义必须写清。
- **建议**：二选一——(a) 宿主模式给宿主加 `open-file`（宿主弹 `OpenFileDialog`，成功走 `SetCurrentDoc`+记录，页面只收 `/__doc`），文件菜单在宿主模式改走它；(b) 明确限定「最近打开只含由系统打开的文件」，空态/README 写清，并接受菜单打开不记录。推荐 (a)，同时补上「另存为后 forget」的对称性。
- **难度**：中（宿主对话框 + 往返 + 和现有 FSA 路径共存）。

## B5（中）没有通用状态目录，写失败/损坏/清除策略都缺

- **现象/风险**：现有唯一的用户数据解析是 `ResolveUserDataDir()`，返回的是 `…\WebView2` 子目录，且可能退到 `%TEMP%` 或 exe 同级（`Program.cs:1063-1097`）。最近文件若图省事塞进 `WebView2` 或 exe 同级：前者会被清理工具当缓存删，后者会被卸载器删（`installer.nsi:148`），而 `%LOCALAPPDATA%\Sidelight` 是明确保留的（`:156`）。写失败没有策略可参照：日志层吞异常（`Program.cs:1503-1513`），草稿层返回错误码并有可见提示（`WriteDraft:938-959`、关窗对话框 `:861-864`）。
- **复现/验证**：本机代理沙箱下宿主写 `%LOCALAPPDATA%` 被拒、退到 `kind=portable`（`probe.log` S5），但 pwsh 直写同目录成功 → 沙箱限制，不是 ACL；真实用户可写性**未验证**。损坏 JSON/写失败/清除失败都**未实现，未验证**。
- **证据**：`Program.cs:1049-1097`、`:1503-1513`、`:938-959`；`installer.nsi:26`、`:146-156`。
- **影响**：列表跨重启丢失、清不掉（隐私承诺失效）、卸载删数据、临时目录被清空；用户看不到原因。
- **建议**：新增 `ResolveStateDir()`（`%LOCALAPPDATA%\Sidelight` → 便携标记时 exe 同级 → `%TEMP%` 并标注易失），启动时探针写并 `Log state dir=… kind=…`；`recent.json` 与 `WebView2` 分开；原子写；损坏备份 `.bad`；清除先写空表再清内存，失败给可见提示。
- **难度**：低–中（一个目录函数 + 30 行策略）。

## 优化机会（最多 3 条）

- **O1 转发仍走「整篇正文注入 localStorage + reload」，与 `/__doc` 重复，且注入用死编码**：`ApplyForwardAsync` 先 `SetCurrentDoc` 读一遍（正确识别 GBK/UTF-16），再用 `File.ReadAllText(path, Encoding.UTF8)` 读第二遍并注入（`Program.cs:1421-1425`、`1307-1332`）；`/__doc` 到达后整篇覆盖（`App.tsx:904`）。实测 argv 启动出现 **2 次** `navigation starting`（`host/bin/host.log`：`argv script added` → 导航 → `location.reload()` → 再导航），转发到 `nav completed` 约 40 ms。建议注入改用 `currentMeta.Text`；argv 路径可去掉多余 reload（脚本在 `Navigate` 前注册，React 之后才读 localStorage）。
- **O2 「按路径打开」将出现第三份实现**：`Main:63-64`、`ApplyForwardAsync:1422`、本轮 `open-recent` 会是第三处。抽 `OpenByPath(path, source)`（`Resolve`+`SetCurrentDoc`+成功记录+错误码），三处共用，避免记录点/错误文案不一致。
- **O3 日志每行 `File.AppendAllText` 开关文件，一次打开 6–10 行，无轮转**（`Program.cs:1503-1513`）。改静态 `StreamWriter` + 1 MB 轮转（与 B1 同修），顺带把路径脱敏集中到一个 `LogPath()`。

## 未验证

- 真实（非沙箱）用户环境 `%LOCALAPPDATA%\Sidelight` 可写；本机宿主被拒是代理沙箱限制（pwsh 直写同一目录成功）。
- 网络盘/只读/文件占用下点击最近条目的实际耗时与文案；`ReadDocMeta` 无超时，离线 UNC 卡 UI 是代码推论。
- 多用户/快速用户切换：`Global\Sidelight` 可能让第二个用户只能转发；跨用户 named pipe 的 ACL 未测，转发失败只写日志并 5 s 后退出（`Program.cs:1472-1500`）。
- 浏览器无宿主时 `window.chrome.webview` 为 undefined（代码已按此判断，未在 dev server 实机断言）。
- `recent.json` 本身：端点、格式、损坏/写失败/清除失败全部未实现，未验证。
