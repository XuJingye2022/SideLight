# 第 6 轮缺陷侦察（finder: r6-bug）

主题：宿主打开 `.md` → `Ctrl+S` 写回原文件。只侦察，未改产品代码。

- 仓库 `D:\Documents\SidelightProgram`，HEAD `d8e84a4`（`2b031e8` 之后只有 docs 变更），版本 0.18.0。
- 宿主 exe：`host/bin/Sidelight.exe`（2026-11-15 20:57 构建，源码即当前 `host/Program.cs`）。
- 验证方式：`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9336` 起宿主，用 playwright-core 连真实 WebView2 页面（同 `scripts/readonly-acceptance.mjs` 的做法）；应用侧用 CDP 9222 连 `localhost:5173`。
- 复现脚本（均可重跑）：`.tmp/round-06/host-probe.mjs`、`.tmp/round-06/browser-probe.mjs`、`.tmp/round-06/shot-banner.mjs`、`.tmp/round-06/replace-probe.ps1`。
- 证据：`.tmp/round-06/*.log`、`shots/round-06/host-*.png`、`.tmp/round-06/samples/`。

## 结论

写回本身不复杂，危险在"传正文的通道"和"信息在中途已经丢了"。按影响排序的 5 条如下。B1/B2/B3 会让写回**改错内容或毁原件**，必须在实现前定方案。

---

## B1 超过 localStorage 配额的文件静默打开上一篇旧文档；写回会把它写进新文件

**现象（已验证，宿主端到端）**
用宿主打开 `13,568,906 B` 的 `.tmp/round-06/samples/big10mb.md`：窗口显示的是**上一篇** `gbk.md` 的内容与只读横幅，文档名 `gbk.md`；`host.log` 只出现一次 `argv script added id=2` 和一次导航，没有注入脚本触发的第二次 reload；再次打开 `gbk.md` 与打开大文件得到的截图字节数相同（37,831 B，见 `host-big10mb-md.png`）。没有任何错误提示。

**根因**
1. 正文整篇经 `localStorage.setItem('sidelight.doc.v1', JSON.stringify(...))` 注入，然后 `location.reload()`（`host/Program.cs:581-605`，写入在 595-601）。
2. `localStorage` 配额在实测中约 5M 字符：浏览器里 4,000,056 字符可写，8M / 10M / 13M 均抛 `QuotaExceededError`（`.tmp/round-06/browser-probe.log`）。
3. 注入脚本外层是 `try{...}catch(e){}`（`Program.cs:584`、`604`），配额错误被吞掉，`location.reload()` 不执行（`603`），页面照常加载旧的 localStorage 文档。宿主只在 `File.Exists` 失败时改窗口标题（`Program.cs:447-458`），注入失败无任何感知。

**风险**
- 用户以为打开了新文件，看到的是旧文档；现在只能另存为，会存错内容。
- 写回实现后，`Ctrl+S` 会把**旧文档正文写进刚双击的那个文件**，直接覆盖用户数据。
- 当前也影响正常打开：任何 > 约 5M 字符的 `.md`（ASCII 5 MB 量级）都打不开。

**建议**
- 不要再让 localStorage 承载宿主→前端的正文。导航完成后由宿主 `CoreWebView2.PostWebMessageAsJson` 推 `{type:'open-doc', text}`，或 `ExecuteScriptAsync` 分块传入；`localStorage` 只留草稿。
- 打开失败必须可见：页面内错误横幅（可重试/打开文件夹）+ 窗口标题；注入脚本不要静默 catch。
- 设一个明确上限（例如 20 MB）并在启动前判断，超限给出"文件太大"的提示，不要落到"显示旧文档"。

**难度** 中（协议改动 + 前端接收 + 失败提示）。**状态** 已验证。

---

## B2 非 UTF-8 文件（GBK/ANSI）打开即乱码；写回会把 U+FFFD 永久写进原件

**现象（已验证，宿主）**
`gbk.md`（37 B，GBK 编码）打开后正文为 `GBK ���� ...`，`localStorage` 同样是替换符（`host-probe.log`，`shots/round-06/host-gbk-md.png`）。原件 SHA 未变（当前只读）。

**根因**
`File.ReadAllText(pendingFile, Encoding.UTF8)`（`host/Program.cs:449`，转发路径 `:695` 同）用 .NET 默认的替换回退解码，非法字节变成 U+FFFD，且不报错。UTF-16 只是靠 BOM 被 `StreamReader` 自动识别才正确（实测 `utf16le-bom.md` 正文正确）；无 BOM 的 UTF-16 会被当成 UTF-8 解出 NUL 与替换符（推断，未验证）。

**风险**
中文用户的存量 `.md` 有相当比例是 GBK/ANSI（编辑器、记事本旧默认）。写回一次即把整篇中文变成 `�`，且不可恢复。

**建议**
- 打开时：有 BOM 按 BOM 解码；无 BOM 用严格 UTF-8（`new UTF8Encoding(false, true)`）。严格解码失败 → 不进可写通道，横幅改「此文件不是 UTF-8，Ctrl+S 不会写回，请用另存为」，并保留原始字节不碰。
- 同时记录原始编码（UTF-8 / UTF-8 BOM / UTF-16LE+BOM / UTF-16BE+BOM）与是否可写；写回必须用同编码，UTF-16 不能静默转 UTF-8（否则外部工具与 diff 全变）。
- 建议把"是否 UTF-8"作为宿主日志一行（`open encoding=utf8-bom ok` / `open encoding=unknown refused`）。

**难度** 小（严格解码 + 判定 + 横幅）。**状态** 已验证。

---

## B3 现有保存路径已经在丢信息：BOM 丢、CRLF→LF、软换行变硬换行；argv 文档还跳过"保存前对比"

**现象（已验证，宿主 + 浏览器，字节级）**
- `crlf-bom.md`：102 B，`EF BB BF` + 4 处 CRLF，结尾 CRLF。宿主打开 → `Ctrl+S` → 另存为产物 117 B，首字节 `23 20 E6`（无 BOM），CRLF 计数 0、LF 计数 3，正文出现 `第一段：…。  \n第二段`（两个空格 + LF，硬换行）。产物里含脚本输入的一行标记，BOM 与换行的差异与这行标记无关。
- `lf.md`：87 B，同样在保存后出现 `  \n`（原文是段落内单换行，软换行）。这个差异发生在打字之前，与是否编辑无关。
- `utf16le-bom.md`：解码正确（CRLF 3 处保留在 localStorage），但另存为产物是 UTF-8。

**根因**
1. BOM 在宿主读入时被 `StreamReader` 剥掉，未记录（`Program.cs:449`）。
2. 换行风格只在 `loadIntoEditor` 里设置：`eolRef.current = text.includes('\r\n') ? 'crlf' : 'lf'`（`src/App.tsx:1069`）；而 argv 初始文档走 `initial` 状态（`App.tsx:260-292`），`eolRef` 停在默认 `'lf'`（`App.tsx:237`）→ 写回/另存一律 LF。
3. argv 文档的 `originalText` 为 `null`（`App.tsx:298`），只有 `loadIntoEditor`（`:1076`）和 `finishSaved`（`:1236`）会设置它；`saveFile` 的首次保存对比分支条件 `originalText !== null && !saveWarned`（`:1328`）因此永远不触发 → 整篇改写没有任何提示。
4. 段落内单换行在 markdown 解析→序列化后变成 `  \n`（两空格硬换行）。这是编辑器保真问题，写回会把它带进原文件。

**风险**
写回若直接写 `currentMarkdown()`（`App.tsx:1305-1310`，输出 LF）：
- CRLF 文件整篇变 LF，Git diff 显示每一行都改了；
- BOM 丢失（VS Code 等工具会当成无 BOM，PowerShell 5 读取中文可能乱码）；
- 软换行被改成硬换行，渲染结果改变（多出强制换行）；
- 用户没有确认机会（对比弹窗被跳过）。

**建议**
- 宿主在打开时记录 `{encoding, bom, eol:'crlf'|'lf'|'mixed', endsWithNewline}`，写回时以 **LF 归一化文本**为输入，再按记录还原。协议要写死："`text` 永远是 LF 归一化后的 Markdown"，避免前端传 `withEol`（`App.tsx:1268-1269`、`1343-1344` 已经同时存在 `normalized` 与 `withEol` 两个变量，实现时很容易选错，导致 `\r\r\n`）。
- 前端从宿主桥拿编码/换行元数据，初始化 `eolRef` 与 `originalText`；argv 文档首次保存也必须走"保存前对比"。
- 本轮验收以"打开后不动、直接保存，SHA 不变"为准（见附 B）。

**难度** 中。**状态** 已验证。

---

## B4 保存可重入：连按两次 Ctrl+S 发两次保存；写回时旧文本可能后落盘

**现象（已验证，应用页面）**
在应用页面（`localhost:5173`，同一份 App 代码）把 `showSaveFilePicker` 换成计数桩，连按两次 `Ctrl+S`（间隔 80 ms），桩被调用 **2 次**（`browser-probe.log`，`pickerCalls=2`）。保存过程中没有任何进行中状态，按钮和快捷键都不受限。

**根因**
`commitSave`（`App.tsx:1260-1303`）与 `saveFile`（`:1317-1338`）没有 in-flight 标记或队列；`saveAsCopy`（`:1341-1364`）同理。宿主侧也没有写盘串行化：`FormClosed` 只写日志（`Program.cs:120`），不等待挂起写盘。

**风险（写回实现后）**
- 两次写回并发：第二次先完成、第一次后完成 → 文件里是**旧文本**，而第二次成功已把 `dirty` 清掉（`finishSaved` 里 `setDirty(false)`，`App.tsx:1239`）→ 静默丢字。
- 两个临时文件同时替换同一目标；`File.Replace` 的失败/重试交错。
- 保存中退出：postMessage 结果丢失，用户以为已保存；临时文件可能残留。
- 保存中切换文档：`saveAndSwitch`（`App.tsx:1383-1394`）在 `commitSave` 完成后才 `loadIntoEditor`，若写回改成"等宿主回包"，必须保证回包与文档绑定，否则晚到的结果会清掉新文档的 dirty。

**建议**
- 前端单一 `saving` 状态：保存中再按 `Ctrl+S` 只记录"再存一次"，等当前完成后再发最新文本；`id` 用递增序号，回包 `id` 不匹配当前请求一律忽略。
- 宿主按到达顺序串行写盘（一个 `SemaphoreSlim` 或队列），同一 id 幂等；回包带 `id` 与 `seq`。
- 保存中禁用"新建/打开/切换"，或先等写回完成；关闭窗口时若有挂起写盘，等待完成或明确询问。
- 10 秒超时后前端不能自动重发第二个写，只能提示重试（重试要等宿主可能仍在写的状态结束）。

**难度** 小-中。**状态** 前端重入已验证；乱序覆盖与退出中断未验证（写回未实现）。

---

## B5 宿主路径与"可写"状态的生命周期没有承接：另存为/转发/删除后可能写错文件

**现象与证据**
1. **只读横幅会被编辑擦掉（已验证）**：用 localStorage 模拟宿主 argv 注入（浏览器里写相同 `DOC_KEY` 与 `readOnly:true`，宿主实测注入格式一致），打开后有横幅；在编辑器里打一个字，`onUpdate` 写 localStorage 时只写 `{text,name,savedAt}`（`App.tsx:479`，`loadIntoEditor:1098`、`finishSaved:1248` 同样没有 `readOnly`），刷新后 localStorage 里没有 `readOnly`，`initial.readOnly=false`（`:287`）→ 横幅消失、`__slState.readOnly=false`（实测见 `browser-probe.log`）。用户会以为已经可以写回，实际仍走另存为。若写回把可写性继续挂在 localStorage 上，这个 bug 会直接变成"状态说谎"。
2. **另存为后宿主仍记住 argv 路径（代码推导，未验证）**：`finishSaved` 只做 `setReadOnly(false)`（`:1241`）、写新落点与 localStorage，没有任何"通知宿主忘记旧路径"的协议；轮次简报的消息协议里也没有 forget/set-path 消息。
3. **转发新文件后旧路径仍在（代码推导，未验证）**：`pendingFile` 只在启动时从 argv 赋值（`Program.cs:30`、`:45`）；`BuildApplyScript` 与脚本注入只在 `InitWebView` 做一次（`:447-452`）；转发走 `ApplyForwardAsync`（`:668-707`）只写 localStorage + reload，不改 `pendingFile`。若按同一结构注入 `window.__sidelightHost`，转发后桥里的文件名/可写路径还是**第一篇**，下次 Ctrl+S 会把新文档写进旧文件。
4. **文件被删除/改名/目录传参（部分已验证）**：传一个目录作 argv，`File.Exists` 为 false → 日志 `open failed ... reason=missing`（`.tmp/round-06/shot-banner.log`），窗口标题显示"打不开"，页面无提示并显示上一旧文档。写回前若不做存在性检查，会得到 `FileNotFoundException`。

**风险**
另存为、转发、删除、改名都会让"宿主记住的路径"与"用户看到的文档"脱节；写回把当前正文写到错误文件，属于数据破坏级。

**建议**
- 宿主维护单一 `currentPath`（可空）+ `currentMeta`，每次成功打开/转发都替换；没有 currentPath 时 `save` 一律拒绝，前端回退另存为。
- 打开/转发/另存为都要更新桥：页面加载前注入的 `__sidelightHost` 只能在当前文档有效；转发后必须重建注入脚本或让前端在收到 `open-doc` 消息时同步 `{writable, fileName}`。
- 协议增加 `forget`（另存为成功后前端发，或宿主从 `save-result` 的 `newPath` 得知）；至少前端在 `finishSaved`/`loadIntoEditor` 时清空宿主状态。
- 写回前检查：路径仍在允许列表、文件存在、不是目录、不是只读属性、mtime/size 与打开时一致（外部修改）；任一失败回结构化错误码，前端给"另存为/重试/覆盖"。
- "可写"从宿主桥每次读取，不写 localStorage；横幅显示"写回 <文件名>"，路径不显示（隐私）。

**难度** 中。**状态** 横幅丢失已验证；路径生命周期为代码推导，端到端未验证。

---

## 附 A：写回失败面清单（任务 1）

"已验证"指本轮亲自跑过；"未验证"给出下一轮做法。

| # | 失败面 | 宿主必须做什么 | 本轮证据/状态 |
| --- | --- | --- | --- |
| 1 | 路径不在允许列表 | 只写内存里的 `currentPath`；消息里的 path/fileName 一律忽略；带路径的消息拒绝并记日志 | `window.__sidelightHost` 可被页面改写（见附 C），不能当授权；实现未做，未验证 |
| 2 | 文件被占用 | 捕获 `IOException`，提示"文件被其他程序占用"，保留 dirty | 已验证：目标被无共享句柄打开时 `File.Replace` → `IOException`（`replace-probe.log`）；带 `FILE_SHARE_DELETE` 时可替换 |
| 3 | 只读属性/目录只读 | 捕获 `UnauthorizedAccessException`，提示"文件是只读属性"；不要自动去掉属性；清理临时文件 | 已验证：`File.Replace` → `UnauthorizedAccessException`，原文件与临时文件都保留；临时文件必须删 |
| 4 | 磁盘满 | 捕获 `IOException`，提示"磁盘空间不足"；删临时文件，原文件不动 | 未验证；方法：用小容量 VHD 或磁盘配额，观察 `ERROR_DISK_FULL` (0x80070070)，确认回滚 |
| 5 | 超时（前端 10s） | 写盘应远小于 1s（10 MB SSD）；超时后前端不重发，提示重试；宿主写盘完成仍回包（晚到包按 id 丢弃） | 未验证；实现后注入 5s 延迟验证前端状态 |
| 6 | 超大文件（10 MB） | 打开与写回通道都必须承载；超过上限要明确拒绝 | 已验证现状打开即失败（B1，13.5 MB）；写回通道容量未验证；先量 `postMessage` 10 MB 的往返耗时 |
| 7 | 外部程序同时修改 | 记录打开时 size/mtime（必要时 hash），写回前比对，不一致提示覆盖/另存/取消 | 未验证；方法：宿主打开后外部追加一行，Ctrl+S，看是否静默覆盖 |
| 8 | 保存中再次 Ctrl+S | 前端单飞 + 队列，宿主串行 + 幂等 | 前端双发已验证（B4）；防乱序未验证 |
| 9 | 保存中退出 | 禁用关闭或等待挂起写盘；临时文件清理 | 未验证；`FormClosed` 只记日志（`Program.cs:120`） |
| 10 | argv 文件被删除/改名 | 写回前 `File.Exists` + mtime 检查，回 `FILE_GONE`，前端转另存为 | 未验证（写回未做）；目录 argv 的 `reason=missing` 已实测，提示在窗口标题而非页面 |
| 11 | 符号链接 | 检查 `ReparsePoint`，拒绝或写链接目标（需产品决策）；不要静默替换链接本身 | 未验证；本机创建符号链接需管理员，失败 |
| 12 | UNC 路径 | 临时文件必须与目标**同目录同卷**（不能放 `%TEMP%`）；捕获跨卷/网络错误，原文件不动 | 跨卷已验证：`File.Replace` → `IOException`（`replace-probe.log`）；UNC 无共享，未验证 |
| 13 | 目录作为 argv | 区分 missing / directory / denied，页面内提示 | 已验证：日志 `reason=missing`（误判），页面显示旧文档无提示 |
| 14 | 长路径（≥240） | 全程沿用 `Resolve()` 的 `\\?\` 路径；临时文件同样加前缀；`File.Replace` 用绝对路径 | 代码在 `Program.cs:134-142`；写回未验证。注意：PowerShell 里给 `File.Replace` 的备份参数传 `$null` 会被绑成空字符串并抛 `ArgumentException`（本探测踩到过）；C# 里传 `null` 合法，实现时用 3 参重载并显式 `null` |

补充：`File.Replace` 要求目标已存在（缺失 → `FileNotFoundException`）；临时文件建在不存在的目录 → `DirectoryNotFoundException`。两条都实测于 `replace-probe.log`。

## 附 B：编码与换行最小验收用例（任务 2）

样本在 `.tmp/round-06/samples/`，验收前先复制到可写目录，测完比对 SHA。

| 文件 | 原始字节 | 未修改直接写回后的预期 | 当前实际（另存为） |
| --- | --- | --- | --- |
| `crlf-bom.md` 102 B | `EF BB BF`，4×CRLF，结尾 CRLF | 字节完全一致；SHA `9BA172E8…` | 无 BOM，CRLF→LF，正文多出 `  \n` |
| `lf.md` 87 B | 无 BOM，LF，结尾 LF | 字节完全一致；SHA `4AD394D6…` | 无 BOM，LF；多出 `  \n` |
| `mixed-eol-bom.md` 109 B | BOM；CRLF 与 LF 混用；**无结尾换行** | 本轮至少保证无结尾换行不被补；混合换行建议提示后按原样保留（逐行 EOL）；SHA `DF875520…` | 未测（预计整篇按 LF） |
| `utf16le-bom.md` 52 B | `FF FE`，UTF-16LE，CRLF | 同编码写回（`FF FE` + UTF-16LE + CRLF）；SHA `08CC6D55…` | 内容正确，写回会变 UTF-8 |
| `gbk.md` 37 B | GBK，无 BOM | **拒绝写回**，提示非 UTF-8，原件不动；SHA `54E2D498…` | 打开即乱码（B2） |
| `readonly-attr.md` 54 B | UTF-8 无 BOM，带 ReadOnly 属性 | 写回失败，提示只读属性，原件不动；SHA `FF4861DA…` | 未测（写回未做） |
| `big10mb.md` 13.5 MB | UTF-8 无 BOM，LF | 打开可见、写回成功或明确拒绝 | 打开显示上一篇旧文档（B1） |

写回验收的最小断言（建议进 tester 脚本）：
1. 打开 → 不改 → Ctrl+S → 原文件 SHA 与打开前相同（BOM/EOL 全保真）。
2. 改一个字 → Ctrl+S → 只多这个字；`git diff --numstat` 为 1 行；BOM 仍在、CRLF 仍是 CRLF。
3. 保存成功后 `__slState.dirty=false`、`docName` 不变、`readOnly` 语义消失（改为 writable）、localStorage 文本是新内容且带 `savedAt`。
4. 失败（只读/占用/删除/非 UTF-8）后 `dirty` 仍为 true，提示可操作，原文件 SHA 不变。

编码判定放在宿主：BOM 表 + 严格 UTF-8 解码；换行记录 `crlf/lf/mixed` + `endsWithNewline`。前端只拿元数据，不做字节判断。

## 附 C：安全（任务 3）

- **`window.__sidelightHost` 是普通 JS 属性**，由 `AddScriptToExecuteOnDocumentCreatedAsync` 注入，页面脚本、控制台、任何 XSS 都能改写或伪造。实测宿主页面里 `typeof window.__sidelightHost === 'undefined'`（尚未实现），`typeof window.chrome.webview.postMessage === 'function'`；在页面里 `postMessage({v:1,type:'save',id:'probe-1',text:'# probe'})` 不抛错，`host.log` 无新增（`logDelta=0`）→ 当前宿主没有 `WebMessageReceived`，消息直接被丢弃。前端 grep 也没有任何 `__sidelightHost`/`postMessage` 代码。
- **结论**：桥只能用于显示与"是否有宿主"的判断，不能当授权。授权在宿主：只写 `currentPath`，绝不接受消息里的路径/文件名；校验 `e.Source` 是 `http://127.0.0.1:<port>/index.html`（拒绝 iframe 与其它 origin）；限制 `text` 长度（建议 ≤ 20 MB）；只接受已知 `id` 与 `type`；`v` 不匹配拒绝；所有拒绝写宿主日志（原因 + 字节数 + 文件名，不写正文）。
- **伪造保存结果**：页面脚本可以自己 `dispatchEvent(new MessageEvent('message', ...))`，让前端以为保存成功并清 dirty。前端必须只接受 `id` 在 pending 集合里的结果，并且只有宿主能写盘——UI 状态被伪造最多误导用户，磁盘由宿主决定。真正的缓解是 CSP + 不放任意 HTML 进 `dangerouslySetInnerHTML`。本轮静态检查：`PreviewPane.tsx:43` 的 `dangerouslySetInnerHTML` 吃的是 `editor.getHTML()`，`MathInlineEditor`/`MathDraftPreview` 吃 KaTeX 输出；markdown 里的行内 HTML 在编辑器里是转义文本（`src/lib/html.ts` 只做 `&lt;tag&gt;` 还原）。**未验证**：构造 `<img onerror>` / `<script>` 的 `.md` 经 argv 打开是否执行。下一轮用恶意样本在宿主里验证一遍。
- **用户提示**：拒绝时前端显示"写回失败：<原因>。改动还在，可重试或用另存为"，并保留 dirty；宿主日志用稳定错误码（`PATH_CHANGED`/`FILE_GONE`/`FILE_LOCKED`/`READONLY`/`NOT_UTF8`/`TOO_LARGE`/`IO`），中文文案在前端映射。

## 附 D：前端状态（任务 4，写回实现的落点）

- **成功**：`docName` 不变（宿主 `fileName`）；`dirty=false`；`baselineRef` 更新为 LF 归一化文本（与 `onUpdate` 比较口径一致，`App.tsx:471`）；`originalText` 更新为保存后的完整文本；`saveTargetRef` **保持 null**（没有 `FileSystemFileHandle`，不能塞假 target，否则 `writeNode` 会抛"没有磁盘句柄"，`src/lib/workspace.ts:240-248`）；`activeFile` 置 null 或带 `host:true` 的无句柄节点，且不能被文件树当成工作区文件；localStorage 写 `{text, name, savedAt:Date.now()}`；提示"已写回 <文件名>（N 字节）"。
- **失败**：不要调用 `finishSaved`；`dirty` 保持 true；保留 `originalText`/`baselineRef`；提示可重试；若是 `FILE_GONE`/`PATH_CHANGED`，给"另存为"按钮；若是 `FILE_LOCKED`/`READONLY`，提示关闭/检查属性，不要自动改属性。
- **另存为后**：清宿主路径（前端 + `forget` 消息）；`readOnly` 语义改为"无宿主可写"；`saveTargetRef` 指向新句柄（现有 `finishSaved` 已做），之后 Ctrl+S 走 `writeNode`，不再发 `save`。
- **转发新文件**：宿主更新 `currentPath` 与桥；前端 `loadIntoEditor` 清空旧宿主状态；旧路径立即失效（见 B5）。
- **只读横幅**：文案从"只读打开：Ctrl+S 不会写回原文件"改为"写回 <文件名>"，按钮"另存为"保留；不要用 localStorage 的 `readOnly` 决定显隐。

## 优化机会（最多 3 条）

1. **正文传输通道去重**：`BuildApplyScript`（`Program.cs:581-605`）对同一正文保留文本、base64、注入脚本三份拷贝（大文件内存放大 ≥3×），还经 `sessionStorage` + reload 二次加载。改成 `PostWebMessageAsJson` 一次传递可同时解 B1 与内存问题；转发也不必"写 localStorage 再 reload"。
2. **保存 payload 三处重复**：`commitSave`（`App.tsx:1268-1269`）、`saveAsCopy`（`:1343-1344`）、`finishSaved`（`:1220-1256`）各算一遍 `normalized`/`withEol`/localStorage，写回会再加第四处。抽 `buildSavePayload(text, eol)` 与 `applySavedState({name, target, text})`，一处决定编码/换行。
3. **可写性状态单一来源**：现在 `readOnly` state（`App.tsx:295`）、localStorage 字段（`:287`）、`__slState`（`:365`）、横幅（`:2336`）四处分散且 `loadIntoEditor`/`finishSaved` 各自 `setReadOnly(false)`（`:1092`、`:1241`）。收敛成一个 `hostDoc: {writable, name} | null`，横幅、Ctrl+S 分支、`__slState` 都从它派生。

## 未验证（下一轮怎么补）

- 写回本身（宿主 IPC、原子写、恢复 BOM/EOL）：本轮宿主源码无 `WebMessageReceived`（grep 为空），只能做失败面设计。
- `postMessage` 10 MB 的延迟/上限：host 加 handler 后，页面发 10 MB 字符串，量 `performance.now()` 与宿主日志时间。
- 磁盘满、UNC、符号链接、权限拒绝（ACL）：分别用 VHD、命名共享、管理员创建的链接、拒绝写 ACL 的目录验证。
- 恶意 `.md` 能否在宿主页面执行脚本：构造 `<script>`/`<img onerror>`/`javascript:` 链接样本，在宿主里打开看控制台与网络。
- 保存中退出/切换的端到端表现：实现后注入延迟，按键/关窗验证。

## 证据文件

- `shots/round-06/host-readonly-banner-crlf.png`：argv 打开 CRLF+BOM 文件的只读横幅（文档名 `crlf-bom.md`）。
- `shots/round-06/host-gbk-md.png`：GBK 文件乱码 + 只读横幅。
- `shots/round-06/host-big10mb-md.png`：打开 13.5 MB 文件后显示上一篇 `gbk.md`（与 GBK 截图同一画面）。
- `shots/round-06/host-crlf-bom-md.png`、`host-lf-md.png`、`host-utf16le-bom-md.png`：另存为后的文档名与正文。
- `.tmp/round-06/host-probe.log`、`browser-probe.log`、`shot-banner.log`、`replace-probe.log`：每次断言的原始输出。
- `.tmp/round-06/samples/`：样本与 SHA（见附 B）。
