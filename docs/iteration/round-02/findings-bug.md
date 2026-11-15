# 第 02 轮 · 缺陷侦察（finder: bug）

日期：2026-11-15。仓库 `D:\Documents\SidelightProgram`，commit `7f6058e`（第 1 轮产品代码 `cb36110`）。
环境：Windows 11、Node 24.21、无管理员；dev `http://localhost:5173`；CDP 浏览器 `http://127.0.0.1:9222`；宿主 `host/bin/Sidelight.exe`（299 行 `host/Program.cs`，csc v4.0.30319 编译，无 app.config、无清单）。
方法：只读产品代码；自己写脚本（`.tmp/r2-host.mjs`、`.tmp/r2-front.mjs`、`.tmp/r2-undo*.mjs`、`.tmp/r2-www.mjs`、`.tmp/probe-*.cs`）驱动真实界面与真实宿主；每项做完 `Stop-Process Sidelight`。
未改动 `src/`、`host/`、`scripts/`。截图在 `shots/round-02/`。

## 门禁基线（本轮只跑回归，不跑 build）

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run shot` | exit 0。`katex delta: 0`、`source has inline math: true`、`source has currency: true`、`console errors: none` | `.tmp/r2-shot.log` |
| `node scripts/acceptance.mjs` | **10 / 11 PASS**，唯一 FAIL 是「无控制台错误」，报错来自浏览器扩展 `chrome-extension://nmhdhpibnnopknkmonacoephklnflpho/offscreen/off`，不是应用代码 | `.tmp/r2-acc.log` |
| `node scripts/qa7.mjs` | **7 / 7 PASS**（草稿写 `.sidelight/drafts`、批注写 `.sidelight/annotations`、保存后清草稿、重开恢复 2 张批注） | `.tmp/r2-qa7.log` |

**门禁风险（新发现）**：`scripts/acceptance.mjs:12` 只过滤 `favicon`，不过滤 `chrome-extension://`。本机 CDP 浏览器里有一个扩展在 offscreen 文档里持续抛错，于是这条「无控制台错误」随机变红。第 1 轮验收看到的是 11/11，本轮同一命令 10/11，产品无改动。建议过滤 `chrome-extension://` 与 `favicon`，或把该断言的 `errors` 限定到应用 origin。

## 一、宿主健壮性：预期 vs 实际

| # | 场景 | 预期 | 实际 | 结论 / 证据 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | 中文文件名 `中文目录/中文文件名-测试.md` | 打开，标题显示中文名 | 正文含标记，`localStorage` 的 `name` = `中文文件名-测试.md` | **PASS**（`.tmp/r2-host.mjs cjk`，`shots/round-02/host-cjk.png`） |
| 2 | 含空格路径 `带 空格 的 目录/带 空格 的 文件 名.md` | 打开 | 同上，`name` 原样保留空格 | **PASS**（同脚本 `spaces`，`host-spaces.png`） |
| 3 | >260 字符路径，`\\?\` 前缀 | 能打开 | **打不开**：`host.log` 写 `argv file missing \\?\D:\…\长路径文件.md`；窗口显示的是**上一份草稿**（`name` 仍是 `带 空格 的 文件 名.md`），无任何提示 | **FAIL**（B2） |
| 3b | >260 字符路径，普通写法（309 字符） | 至少在 `\\?\` 下能用 | 同样 `argv file missing` | **FAIL**（B2） |
| 4 | 10 MB `.md`（10,485,804 B / 124,831 行） | 打开；要么给可理解的拒绝 | **能打开**：编辑器 5,274 ms 出现，`localStorage` 文本 4,244,254 字符，正文 `2,995,944 字`，首末行都在 | **PASS**（`host-big.png`；1 MB 版 4,548 ms，`host-big1m.png`） |
| 5 | argv 带引号 / 反斜杠 / 换行 / 中文 | 原样进正文 | 8 / 8 PASS：`中文标记 ARGV-CJK-一号`、`"双引号`、`C:\Users\WINDOWS\`、换行后 `第二行` 都在；文本长度 75 = 源文件 75 字符 | **PASS**（`host-argv.png`） |
| 6 | `host/bin/www` 缺失 | 明确提示并退出（或提示怎么修） | 进程**不退出**（`title=[Sidelight]`、`MainWindowHandle` 非 0、`responding=True`），只有一个模态框；`host.log`：`INIT-FAIL System.IO.FileNotFoundException: www/index.html 不存在，先用 host/build.ps1 复制 dist。` | **FAIL**（B3） |
| 6b | 只缺 `www/index.html` | 同上 | 同上 | **FAIL**（B3） |
| 7 | 第二次启动带文件参数 | 文件转到第一个实例 | 转到了：第二进程 `exit 0`，日志 `pipe sent` → `pipe received` → `forward applied`，第一实例正文变成 `SECOND-DOC-转发标记`，进程数 1 | **PASS**（`host-second.png`） |
| 7b | 同上，但第一个实例有未保存改动 | 先提示再决定 | **静默丢弃**：改动没了，页面 `.dialog` 数 = 0，无任何提示 | **FAIL**（B1） |
| 7c | 同上，抢在第一个实例初始化完成前转发（约 120 ms 后启动第二个） | 文件仍应打开 | **丢失**：`forward applied`（17:21:53.199）早于 `argv script added`（17:21:53.222）与 `navigate`；窗口最后显示 `first.md`，第二个文件从未出现；第二进程仍 `exit 0` | **FAIL**（B1） |
| 8 | 关闭窗口后进程是否退干净 | Sidelight 与 WebView2 子进程都退出 | `CloseMainWindow()` 后：Sidelight 进程 0、`msedgewebview2`（命令行含 Sidelight 的）0；日志 `form closed` → `exit` | **PASS**（`host-second.png`，两次重复均通过） |

**环境事实（每次都发生，不是偶发）**：`host/bin/host.log` 197 行里，**每一次**启动都有
`appdata unusable: 对路径"C:\Users\WINDOWS\AppData\Local\Sidelight\WebView2\.write-probe"的访问被拒绝。 -> 退回 exe 同级 webview2-data`（最早 16:52:27，最晚 17:26:07，含第 1 轮判 PASS 的那几次）。用同代码的独立探针 `.tmp/probe-appdata.exe` 复现：`CreateDirectory ok` 但 `File.WriteAllText` 抛 `UnauthorizedAccessException`；而同一个目录用 PowerShell 写可以成功，Defender 受控文件夹访问为 0。结论：本机 `%LOCALAPPDATA%` 这条分支从未生效过，宿主一直把 WebView2 用户数据写在 `host/bin/webview2-data`。便携 zip 里这恰好能用，装到 `Program Files` 或只读目录就会在启动期失败，而失败路径就是第 6 条的模态框。

## 二、B1..B5（按影响 × 可修排序）

### B1 「再打开一个文件」会静默吃掉当前未保存的改动，启动早期还会整份丢失

- 现象：
  1. 第一个实例显示 `first.md`，用户打了一段字（未保存）。
  2. 在资源管理器里双击 `second.md`（第二个实例带参数启动）。
  3. 第一个实例直接换成 `second.md`，**没有任何「还有没保存的改动」对话框**，改动消失。
  4. 若第二个实例在第一个实例 WebView2 初始化完成前启动（约 120 ms 内），转发**完全丢失**：第一个实例最后显示 `first.md`，第二个文件从未出现，而第二个进程照样 `exit 0`。
- 复现：`node .tmp/r2-host.mjs dirty`（现象 3）、`node .tmp/r2-host.mjs race`（现象 4）。
- 证据：
  - dirty：`PASS dirty: 改动已进正文 — dialog=0`、`PASS dirty: 转发后新文档加载`、`FAIL dirty: 未保存改动是否还在 — 改动被丢弃=true 对话框=0`；截图 `shots/round-02/host-dirty.png`。
  - race：`host.log` 顺序 `17:21:53.199 forward applied` → `17:21:53.222 argv script added` → `17:21:53.222 navigate`；`localStorage` 仍是 `first.md`。
  - 代码：`host/Program.cs:207` `OpenFileIntoDoc` 无条件 `localStorage.setItem(...)` 后 `location.reload()`；管道处理在 `:241`–`:249` 直接 `BeginInvoke` 调用它，既不判断 `web.CoreWebView2` 是否就绪，也不问页面有没有未保存改动。转发期间 `ExecuteScriptAsync` 打在空白文档上，`try{}catch{}`（`:222`）把异常吞掉，所以两个失败都是静默的。
- 影响：这是桌面编辑器的核心路径（双击 `.md` 是 Windows 上的默认手势）。未保存改动凭空消失，属于数据丢失；转发丢失时用户只看到旧文档，会以为「双击没反应」。第 1 轮把「argv 与单实例」判 PASS，只覆盖了「窗口已经空闲」这一种时序。
- 建议：
  1. 转发改成「先问、再换」：宿主 `ExecuteScriptAsync` 取页面的脏标记（前端把 `dirty` 挂到 `window.__slState`），脏则用 `OpenFileIntoDoc` 走页面内确认流程，而不是直接 setItem + reload。
  2. 转发失败可重试：若 `web?.CoreWebView2 == null` 或页面还没 `DOMContentLoaded`，把 path 存进 `pendingFile`，在 `OnNavigationCompleted` 里补发（宿主已有 `pendingFile` 字段可复用）。
  3. 验收加一条「有脏改动时转发不丢字」。
- 难度：M（改宿主 + 前端暴露脏标记；不新增依赖）。

### B2 超过 260 字符的路径打不开，`\\?\` 前缀也无效；失败时显示上一份草稿

- 现象：
  1. 造一个 309 字符的绝对路径（`.tmp/r2-host/long/段落-00…/…/长路径文件.md`）。
  2. `Sidelight.exe "\\?\D:\…\长路径文件.md"` 启动：窗口正常，但显示的是**上一次的文档**（标题栏/正文档名仍是上一份 `带 空格 的 文件 名.md`）。
  3. `host.log`：`argv file missing \\?\D:\…\长路径文件.md`。普通写法（不带 `\\?\`）同样失败。
- 证据（亲自复现 + 根因探针）：
  - `.tmp/r2-host.mjs longpath` / `longpath-plain`：`FAIL … 内容进正文 — store={"name":"带 空格 的 文件 名.md","len":22}`；截图 `host-longpath.png`、`host-longpath-plain.png` 都是上一份草稿。
  - `.tmp/probe-longpath.cs`（csc 编译，无 app.config，和宿主条件一样）：
    `exists plain = False`、`exists verbatim = False`、`GetFullPath(verbatim) THREW PathTooLongException`、`switch present=True legacy=True`。
  - 给同一个探针加 `.tmp/probe-longpath.exe.config`（`supportedRuntime v4.8` + `AppContextSwitchOverrides=…UseLegacyPathHandling=false;…BlockLongPaths=false`）后：`exists verbatim = True`、`legacy=False`、`GetFiles(verbatim parent) count = 1`。
  - 代码：`host/Program.cs:88`–`:92` 的 `Resolve` 用 `Path.GetFullPath`，`:142`–`:149` 用 `File.Exists`；两者在 legacy 路径处理下对 `\\?\` 与 >260 都返回失败；`:148` 只记一行日志，没有用户可见提示。
- 影响：中文用户把笔记放在 OneDrive / `文档\项目\…` 深目录很常见，路径过 260 后双击文件「打开了但不是我这份」。数据安全上是误导：用户可能在上一份草稿里继续改并保存。第 1 轮与 STATE 都把 `\\?\` 当成解法记着，实测不成立。
- 建议：
  1. 给宿主加 `Sidelight.exe.config`（`supportedRuntime` + `AppContextSwitchOverrides`），`BuildArgvScript`/`OpenFileIntoDoc` 里对长度 ≥ 240 的路径统一加 `\\?\` 前缀；同时给 exe 加清单 `longPathAware`，让不带前缀的路径也能开。
  2. 打不开时 alert 明确写「这份文件打不开：<文件名>（路径过长）」，不要留在上一份草稿上。
  3. 验收加「300 字符路径 + `\\?\`」与「300 字符路径不带前缀」两条。
- 难度：S（app.config 是新增一个文件，`build.ps1` 里复制一次；路径前缀化是 5 行）。

### B3 启动期失败只给开发者口气的模态框，进程不退出；用户数据目录回退也是静默的

- 现象：
  1. 删掉 `www`（或只删 `www/index.html`）后启动：白窗 + 模态框，标题 `Sidelight`，进程一直活着（6.8 s 观察窗内 `alive=true`、`responding=True`）；不点掉对话框就不会退出。
  2. 唯一的文字是 `www/index.html 不存在，先用 host/build.ps1 复制 dist。`——末用户拿到的便携 zip 里没有 `build.ps1`，也没有人能跑 `npm run build`。
  3. `%LOCALAPPDATA%` 写不进时，`host.log` 只有 `appdata unusable … 退回 exe 同级 webview2-data`，界面没有任何提示。
- 复现：`node .tmp/r2-www.mjs`（A：整份 bin 复制到 `.tmp/host-no-www` 后删 `www`；B：`host/bin/www/index.html` 改名；脚本结束会还原）。
- 证据：
  - A：`t+1163ms … sidelightProcs=1 title=[Sidelight] handle=2236324 responding=True` … 6 次采样都 `ALIVE=true`；`log delta: … INIT-FAIL System.IO.FileNotFoundException: www/index.html 不存在，先用 host/build.ps1 复制 dist。`
  - B：同样 `ALIVE=true`，`log delta` 同一条消息；`after kill: procs=0`。
  - 代码：`host/Program.cs:159` `MessageBox.Show("Sidelight 宿主启动失败：" + ex.Message, "Sidelight")`，随后 `:160 form.Close()`；`ResolveUserDataDir`（`:94`–`:113`）回退时只写日志。
- 影响：发布路径是「便携 zip 双击运行」。解压不完整、杀毒软件删了 `www`、只读目录，都会走到这里；用户看到的是白窗 + 一句让开发者跑脚本的话，没有退出码、没有「重新解压」的指引，也没有日志位置提示。装到无写权限目录时同理。
- 建议：
  1. 文案改成用户向：「Sidelight 缺少运行文件（www/index.html）。请重新解压完整的 zip。日志：<exe 同级 host.log>」。
  2. 失败时 `Application.Exit()` 或返回非零退出码，不要留着白窗等用户点。
  3. 用户数据目录两段式明确化：便携模式（exe 同级 `data\`，显式、可见）与安装模式（`%LOCALAPPDATA%`）；回退时在标题栏或首启提示里说一次，别只写日志。
- 难度：S。

### B4 切到「源码」再切回来，撤销历史被清空

- 现象：
  1. 在正文末尾打 ` 打字一。`。
  2. 点「源码」，再点回「预览/编辑」。
  3. `Ctrl+Z`：没有任何反应，`打字一。` 还在。
  4. 不切源码时同样的 `Ctrl+Z` 能撤销（打字与粘贴都能）。
- 复现：`node .tmp/r2-undo3.mjs`。
- 证据：
  ```
  PASS 打字一在正文
  FAIL 切源码后 Ctrl+Z 仍能撤销「打字一」 — 尾="历史  起点。 打字一。"
  PASS 不切源码 Ctrl+Z 撤销「打字二」 — 尾="历史  起点。 打字一。"
  PASS 粘贴落在末尾 — 尾="历史 起点。 打字一。 粘贴甲 $5 到 $10。"
  PASS 粘贴后 Ctrl+Z 撤销 — 尾="历史 起点。 打字一。"
  ```
  截图 `shots/round-02/regress-undo-history.png`。代码侧：`sourceMode` 分支在 `src/App.tsx:1133`、`switchView` 在 `:1277`，切模式时编辑器区域换渲染分支，Tiptap 实例/`ProseMirror` 视图随之重建，历史栈没有迁移。
- 影响：用户「看一眼源码」是常见动作；回来后撤销静默失效，会以为软件坏了，或者反复按 `Ctrl+Z` 把更早的内容撤掉（一旦历史被重建成空栈，再按也只是无效）。不丢字，但破坏「编辑器可信」的核心预期。
- 建议：源码模式与富文本模式共用同一个 `Editor` 实例（隐藏而不是卸载），或切换前把 `editor.state` 的历史插件状态保存/恢复；至少给一条「切换视图会清空撤销历史」的可见提示。验收加「打字 → 切源码 → 切回 → Ctrl+Z 撤销」。
- 难度：M。

### B5 粘贴含 `$…$` 的文本：货币正确，但公式不会渲染

- 现象：
  1. 从别处复制 ` 粘贴片段：价格 $5 到 $10，公式 $a^2+b^2$。`，在正文末尾 `Ctrl+V`。
  2. 货币写法保留为文字（正确，是第 1 轮的修复生效）。
  3. 但 `$a^2+b^2$` 仍是字面文本，KaTeX 节点数 0 → 0，源码里也是 `$a^2+b^2$`。
- 复现：`node .tmp/r2-undo.mjs`（B 段）。
- 证据：`PASS B 粘贴进正文（光标处） — katex 0->0 尾=…公式 $a^2+b^2$。`、`B 粘贴的 … — katex 0->0、源码="# 撤销测试\n\n起点。 粘贴片段：价格 $5 到 $10，公式 $a^2+b^2$。"`；`npm run shot` 与 acceptance 用的都是「工具栏插入公式」或「打字」，没覆盖粘贴。
- 影响：粘贴是 Markdown 写作最常用的输入方式之一。用户从聊天/网页粘一段带公式的笔记，看到的是源码记号，得手动删掉再重打，否则导出 HTML 也是 `$a^2+b^2$` 字面量。不影响已有内容，属保真缺口。
- 建议：在 `handlePaste`（`src/App.tsx:325`）里，当剪贴板是 `text/plain` 且含成对 `$` 时，先走 `proseMirror` 的 markdown 解析（或对文本应用 `isMathBody` 后手动转 `inlineMath` 节点）；保持「内侧空白不成公式」的同一谓词，避免退回第 1 轮的吞字问题。验收加「粘贴 `价格 $5 到 $10 与 $a^2+b^2$`：货币留字、公式渲染」。
- 难度：M（要同时守住货币与公式两条规则）。

## 三、已验证通过、别再重复调查的项

- 宿主中文文件名、含空格路径：PASS（`host-cjk.png`、`host-spaces.png`）。
- 宿主 argv 引号/反斜杠/换行/中文原样：PASS（`host-argv.png`），`sl:argv-runs=1`、`navType=reload`。
- 10 MB `.md` 能打开（5.3 s），1 MB 4.5 s；`localStorage` 存得下（10 MB 文件对应 4.37 M 字符的 JSON）；没有崩溃、没有控制台错误（`host-big.png`、`host-big1m.png`）。**注意**：这是浏览器端 `localStorage` 草案，不是写盘；10 MB 文档的真实保存未验证。
- 第二次启动带文件能转到第一个实例（空闲时）：PASS。
- 关窗口后 Sidelight 与 WebView2 子进程都退干净、日志有 `form closed`/`exit`：PASS（两次）。
- 前端回归：`$x^2$` 成公式（katex 0→1，源码原样）、`$5 到 $10` 不吞字、真实剪贴板粘贴货币保留、打字与粘贴的 `Ctrl+Z` 都能撤销（不切源码时）。
- 空文档：`Ctrl+S` 得到 0 字节文件（`下载=空文档.md 文件长度=0`），无报错（`doc-empty.png`）。
- 只有 frontmatter 的文档：源码原样 `---\ntitle: 只有头部\ntags:\n  - a\n  - b\n---\n`，保存后字节内容相同；编辑器正文只有换行（合理，frontmatter 不进正文）（`doc-frontmatter-only.png`）。
- 10 万字文档：载入 669 ms，`Ctrl+S` 导出 296,032 B 文件（`doc-100k.png`）。
- 草稿与批注（有目录句柄时，qa7 用 OPFS 句柄模拟真实 FSA 调用）：`.sidelight/drafts/<名>.md`、`.sidelight/annotations/<名>.json` 都写入成功，保存后草稿清空，切文件再切回恢复 2 张批注。

## 四、未验证（诚实标注）

- **真实磁盘目录句柄下的 `.sidelight/` 写入**：本轮用的是 OPFS 目录句柄（与 FSA 同 API），真实磁盘只验过正文保存（第 1 轮）。补法：在宿主里用 `host/send-keys.ps1` 选中 `.tmp\r2-ann`，做批注后检查 `.tmp\r2-ann\.sidelight\annotations\*.json`。
- **批注刷新后的恢复**：`qa7` 只测了「切文件再切回」。刷新（整页重载）路径需要目录句柄，未测。
- **10 MB 文档写盘**、**长路径下的保存**（不只是打开）：需要有磁盘句柄，未测。
- **中文输入法**（STATE 已记）：未测。
- **批注在正文被大改后是否丢失**：未测。

## 五、代码优化机会（最多 3 条）

### O1 宿主里「读文件 → base64 → 写 localStorage → reload」有两份，且 KEY 跨语言重复

- 事实：`host/Program.cs:182`–`:205`（`BuildArgvScript`）与 `:207`–`:225`（`OpenFileIntoDoc`）各自拼一遍同样的 20 行 JS 字符串；`sidelight.doc.v1` 在 `host/Program.cs:15` 与 `src/App.tsx:65` 各写一遍；`scriptId`（`:22`、`:145`）只写不读，除日志外无用途。
- 收益：抽一个 `ApplyDoc(string path, bool useDocumentCreatedHook)`；B1 的脏判断、B2 的 `\\?\` 前缀、B3 的用户向错误文案都只改这一处。键名改由前端 `window.__slOpenDoc(text, name)` 暴露，宿主不再知道存储格式。
- 风险：转发时序（`OnNavigationCompleted` 补发）要一起改，需重跑 `node scripts/host-smoke.mjs` 与新的 dirty/race 两条。
- 难度：S。

### O2 `src/App.tsx` 2021 行单组件：视图切换与持久化的边界藏在一个文件里

- 事实：`src/App.tsx` 2021 行；`sourceMode` 分支散在 `:157`、`:830`、`:865`、`:1064`、`:1133`、`:1277`；Markdown 修复链与草稿 `localStorage.setItem` 在第 1 轮已记的 3 处重复没变。
- 收益：把「视图（编辑/源码/预览）」「持久化（草稿/批注/磁盘）」「工具栏」拆成三个模块后，B4（切视图丢历史）与 B5（粘贴路径）都属于能被单独测试的纯逻辑，不必靠 2000 行组件的运行时行为去验。
- 风险：拆分改动面大；按函数抽取、不换架构，每步跑 `npm run shot` + acceptance。
- 难度：M。

### O3 门禁脚本的「无控制台错误」断言太宽，会把环境噪声算成失败

- 事实：`scripts/acceptance.mjs:11`–`:13` 只排除含 `favicon` 的消息；本轮同一命令因 `chrome-extension://…/offscreen/off` 报 FAIL（10/11），产品零改动。`scripts/host-smoke.mjs:131` 同样只按 `msg.type() === 'error'` 收集。
- 收益：断言只看应用 origin 的错误（`page.url()` 或 `msg.location().url` 以 `http://localhost:5173` / `https://sidelight.local` 开头），门禁才稳定；否则第 3 轮会把这条 FAIL 误当成回归。
- 风险：过滤过窄会漏掉 WebView2 自身错误；建议同时保留一条「非应用来源错误」的软告警。
- 难度：S。
