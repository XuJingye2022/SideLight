# 第 02 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-02/plan.md`（基线 `7f6058e`，v0.16.3）。
审查方式：读计划、三份 findings、`host/Program.cs`、`host/build.ps1`、`host/send-keys.ps1`、`scripts` 与计划点名的源码；在 `.tmp/` 复跑关键检查（未改产品文件、未 commit）。
审查日期：2026-11-15。

## 结论：**REVISE**

T1 的自动化点框与脏判断、T2 的启动失败验收、T4 的便携包文件清单各有一个 blocker；T3、T4 的数字与 T5 的 ADR 读数会把一轮实施带进返工。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 的脏判断是启发式而非可靠信号；`lastAppliedText` 未覆盖初始 argv 与存盘；`send-keys.ps1` 只找 `msedgewebview2` 的 `#32770`，点不到 Sidelight 的 MessageBox；测试第 3 例在「无改动 + 初始 argv」下会弹框而不点，测试挂住；`navReady` 不在 reload 时复位 | `plan.md:12-14,16,19-21`；`App.tsx:153`（已有 `dirty`）、`:357-364`、`:1023-1059`；`send-keys.ps1:60-71`；`Program.cs:173-179,227-262`；`findings-bug.md:54-55` | 在页面暴露 `window.__slState.dirty` 并读它（或至少在初始 argv/存盘后更新 `lastAppliedText`）；`send-keys.ps1` 加 `-Process Sidelight`/按 Sidelight PID 找 `#32770`；`NavigationStarting` 置 `navReady=false`；第 3 例明确点 Yes 或先保证干净 | T1 |
| H2 | blocker | T2 的 `nowww` 验收自相矛盾：ErrorForm 60 s 看门狗，验收要求 10 s 内 exit 1；`MainWindowTitle` 可能仍是主窗 `Sidelight`；只读安装目录下数据目录三级全失败时，ErrorForm 文案仍写「缺少 www/index.html」 | `plan.md:36,38-40`；`Program.cs:159`；`findings-bug.md:36`（本机 LOCALAPPDATA 分支从未生效） | 看门狗改 8 s 或测试显式点「退出」；让 ErrorForm 成为主窗/关闭主窗；数据目录失败单独文案（写数据目录与便携回退）；增加只读 exe 目录/全回退失败的测试 | T2 |
| H3 | major | T3 的目标写「关键小字 ≥12px」，条目却把 `.rail-goal-label`/`.rail-goal-retry` 设 11px；新类 `.rail-notice-mock`/`.note-kind-mock` 没有 CSS；对比度验收只说「现算」不给公式或暗色目标；`useDialogFocus` 未做 findings 建议的 `inert`；文件表带了未使用的 `src/lib/ai.ts` | `plan.md:48,53-54,58`；`findings-ux.md:41,65,74,101-104`；`styles.css:571-575` | 把 11px 两类明确归为「非关键小字」或抬到 12px；补 mock 类样式；验收写明 WCAG 相对亮度公式、取数脚本与暗色值；加 `inert` 或说明为何不加；从文件表删 `ai.ts` | T3 |
| H4 | blocker | T4 的便携 staging 清单漏了 T2 新增的 `Sidelight.exe.config`，zip 里长路径开关会失效；ico 验收写「第 4 字节 = 5」是错的，ICO 头为 `00 00 01 00 05 00`（idCount 在偏移 4–5） | `plan.md:72,79`；`plan.md:31`（T2 新建 config）；实测 `.tmp/r2-icon/sidelight-mixed.ico` 首 6 字节 `00 00 01 00 05 00`，`byte[3]=0`、`byte[4]=5`；`findings-ship.md:84` | staging/zip 条目加 `Sidelight.exe.config` 并在验收里断言；ico 改成 `[BitConverter]::ToUInt16($b,4) -eq 5`（或 0 基 `byte[4]`），并保留第 5 条目 PNG 检查 | T4 |
| H5 | major | T4 的 staging 目标 2,351,293 B 是未含 23,724 B ico 的旧数；加 ico 后约 2,375,017 B；950,000 B 门槛没有从当前 880,260 B 加 ico/T1/T2 exe 增长后重算；`verify-portable.mjs` 只证明 spawn 后能加载，不证明资源管理器双击/SmartScreen 路径 | `plan.md:72,76-77`；`findings-ship.md:20-31,250`；当前 `host/bin` 载荷 `exe+dll=952,904` + `www=1,392,880` = 2,345,784 B | 用 `portable.ps1` 打印实际 staging/zip 并把目标改成「当前值 + 余量」；验收补一条真人双击/解压路径，或把「双击即可用」降级为「解压后 spawn 可用」 | T4 |
| H6 | major | T5 把 ADR-0004 载荷写死 2,345,784 B，但 T1/T2/T4 都会改 `Program.cs`/加图标资源，payload 会变；验收还要求 ADR 含这个固定数，与同任务「现场复算、不抄旧值」冲突；README 第 5/39 行的修改没有验收命令 | `plan.md:92-95,97`；`docs/adr/0004-...md:20`（旧值 3,165,041）；当前 payload 2,345,784 B；T2 文件 `plan.md:31`、T4 图标 `plan.md:70-71` | T5 先跑取数命令，ADR 写实际值；验收改成「ADR 含取数命令输出」而非固定 2,345,784；README 增加第 5/39 行的 `Select-String` 检查 | T5 |

---

## H1（blocker）T1 的脏判断、点框、第 3 例互相打架

**脏信号不是可靠信号。** 计划用 `ExecuteScriptAsync` 读 `localStorage['sidelight.doc.v1'].text`，与 `lastAppliedText` 比对（`plan.md:13`）。问题四层：

1. 初始 argv 的文件由 `BuildArgvScript` 写入（`Program.cs:182-205`），计划没有在此时更新 `lastAppliedText`；按 `plan.md:13` 的「空 → 一律当脏」，第一个文件刚打开、用户还没改，转发第二个文件也会弹框。
2. `Ctrl+S` 存盘后 `commitSave` 只删 `.sidelight` 的磁盘草稿（`App.tsx:1040-1042`），**不删 localStorage**；localStorage 里的 text 仍是新内容，与旧 `lastAppliedText` 不等 → 再问一次。计划自己在 `plan.md:17` 承认「可能多问一次」。
3. 从文件树打开的文件，宿主的 `lastAppliedText` 无从更新（宿主不知道 FSA 打开了什么），所以任何「树里打开 + 双击另一个」都会弹框，即使用户没改。findings-bug 的建议是让前端把 `dirty` 挂到 `window.__slState`（`findings-bug.md:54`），而 `App.tsx:153` 已有 `dirty` 状态，计划没用。
4. 反向风险：localStorage 写失败（配额/禁用，`App.tsx:357-364` 会 catch）时，脏判断只能读到旧 text；若旧 text 恰等于 `lastAppliedText`，宿主会判「不脏」并直接替换——这是真丢字的唯一缺口。

**点框脚本点不到。** `send-keys.ps1:60-71` 先用 `Get-Process msedgewebview2` 取 PID，再 `FindDialog(pid)`。T1 的 `MessageBox.Show` 属于 **Sidelight.exe**，不是 `msedgewebview2.exe`；计划只写「加 `-Dialog YesNo -Choice Yes|No`」，没写改 PID 发现逻辑。按字面加分支，`-Dialog YesNo` 仍然 `NO-DIALOG`（exit 2），`test-forward.mjs` 无法稳定点掉。

**第 3 例会挂。** 第 3 例在第一个实例里没有输入任何字符，120 ms 后起第二个（`plan.md:21`）。若 `lastAppliedText` 未在初始 argv 时设置，drain 后 `dirty=True` → 弹 MessageBox；第 3 例没有 `send-keys` 点击步骤，测试会等不到 `forward applied`。这与「三例全自动」的目标直接冲突。

**队列时序。** `OnNavigationCompleted` 只把 `navReady=true`（`plan.md:12`），没有在 `NavigationStarting` 复位。`OpenFileIntoDoc` 注入后会 `location.reload()`（`Program.cs:222`）；reload 期间 `navReady` 仍为 true，此时到的第二个转发不会被排队，`ExecuteScriptAsync` 打在正在卸载的文档上，`try/catch` 吞掉（`Program.cs:223` 附近），文件丢失。测试三例没有覆盖「reload 中再转发」。

**最小修法**：优先暴露 `window.__slState.dirty`（前端已有 `dirty`，零新依赖）；至少初始 argv 和 `commitSave` 后更新 `lastAppliedText`。`send-keys.ps1` 加 `-Process Sidelight` 或遍历所有 `#32770` 再按标题「Sidelight」筛。`NavigationStarting` 置 `navReady=false`，队列在每次 `NavigationCompleted` 重放。第 3 例明确点 Yes（或断言干净文档不弹框）；补一例「reload 中再转发」。测试至少断言 No 分支后 localStorage 的 `text` 含 `DIRTY-MARK`，而不只是正文。

---

## H2（blocker）T2 的启动失败验收无法按字面通过

- 计划 `:36` 写「关闭或 60 s 看门狗 → `Environment.Exit(1)`」；验收 `:40` 要求「10 s 内进程 exit 1」。测试没有点「退出」（`:38` 只说每例结束 `Stop-Process`），进程只会在 60 s 后退出；10 s 断言必失败。
- 标题断言：`MainWindowTitle` 返回进程的主窗口。若主 `Form` 还在（`form.Text = "Sidelight"`，`Program.cs:69`），即使 ErrorForm 标题是 `Sidelight 启动失败`，`Get-Process Sidelight` 也可能读到 `Sidelight`。计划没有说关闭主窗或让 ErrorForm 成为主窗。
- 数据目录：`plan.md:37` 的顺序是 `%LOCALAPPDATA%` → `%TEMP%` → exe 同级，但 `plan.md:36` 的 ErrorForm 文案固定写「缺少运行文件 www/index.html」。只读安装目录 + 前两级都不可写时，`ResolveUserDataDir` 最后一级 `Directory.CreateDirectory` 抛异常，`InitWebView` 的 catch 仍显示「缺少 www」——用户会去重新解压，实际是数据目录不可写。findings-bug `:36` 已证明本机 LOCALAPPDATA 分支从未成功；只测「www 缺失」不够。
- `app.manifest` 用 `csc /win32manifest:host\app.manifest` 的写法没有写条件（build.ps1 从 `host/` 运行时相对路径会错）；`Sidelight.exe.config` 的 `AppContextSwitchOverrides` 本身在 findings-bug 的探针里已被证明有效（`.tmp/probe-longpath.exe.config`：`exists verbatim=True`、`legacy=False`），这点不用重验。

**最小修法**：看门狗 8 s，或测试显式点 ErrorForm 的「退出」；标题断言改成枚举窗口/让 ErrorForm 成为主窗；数据目录失败单独文案（「无法创建 WebView2 数据目录：<路径>；便携模式请把程序放到可写目录」）；增加只读 exe 目录 + 两级回退都失败的测试，或诚实标 UNVERIFIED。

---

## H3（major）T3 的 UI 验收与目标不一致

- **字号**：目标 `plan.md:48` 写「关键小字 ≥12px」，`plan.md:53` 把 `.rail-goal-label` 与 `.rail-goal-retry` 设为 11px。findings-ux `:101-104` 确实建议 11px，但验收 `:58` 只检查 `.note-head`/`.status-bar`/`.dialog-note`，rail-goal 两类既不达标也不被检查——目标与验收脱节。
- **新类没有样式**：计划新增 `.rail-notice-mock` 与 `.note-kind-mock`（`plan.md:52`），但步骤 2 只改变量与字号，没有给这两个类写规则；`styles.css:571-575` 的 `.note-kind` 只有 padding/radius/weight，没有颜色或底色。findings-ux `:41` 要求 mock 标签用 `--line-strong` 底 + `--ink` 字（10.36:1）；不写规则时标签只是普通文字，U1 的「明写模拟」在视觉上不成立。
- **对比度验收**：`:58` 只说「用 getComputedStyle 现算 ≥4.5」，没有公式、取数脚本或暗色目标。findings-ux `:74` 有 WCAG 相对亮度脚本与整张表；暗色 `--ink-faint` 由 `#73787c` 改 `#9aa0a6`，但验收没有暗色分支。
- **焦点**：findings-ux `:65` 建议给背景加 `inert`（或 `aria-hidden`），计划 `:54` 只做四件事，没有 `inert`；Tab 陷阱能挡住键盘，但读屏仍能遍历背景，`aria-modal` 只是声明。这不是 blocker，但 U2 的 WCAG 2.4.3/4.1.2 目标没完全闭合。
- **范围**：文件表带了 `src/lib/ai.ts`（`plan.md:50`），但 U1 用的是 `settings.ts:64` 的 `hasKey`，步骤里没有 `ai.ts` 的改动。要么删掉这个文件，要么说明用途。

**最小修法**：把 11px 两类明确写成「非关键小字」并移出「≥12」目标，或抬到 12px；补 `.rail-notice-mock`/`.note-kind-mock` 规则并纳入对比度验收；验收引用 `findings-ux` 的亮度公式与暗色值；加 `inert` 或写一句「不做，仅 ARIA 声明」；删 `ai.ts`。

---

## H4（blocker）T4 的便携包漏了 T2 的配置，ico 检查写错字节

- **配置文件**：T2 新建 `host/Sidelight.exe.config`（`plan.md:31`），它是 `AppContextSwitchOverrides`（长路径开关）生效的必要文件。T4 的 staging 清单是「exe + 3 dll + `sidelight.ico` + `README.txt` + `LICENSE` + `dist`」（`plan.md:72`），**没有 `Sidelight.exe.config`**；zip 条目验收（`:78`）也只列 exe/www/ico/README/LICENSE。宿主目录里 T2 的 longpath 验收能过，但用户解压的 zip 里长路径又坏了，且 T4 的 `verify-portable` 不测长路径。
- **ico 字节**：验收 `:79` 写「ico 第 4 字节 = 5」。实测 `.tmp/r2-icon/sidelight-mixed.ico` 首 6 字节是 `00 00 01 00 05 00`：`idCount` 在偏移 4–5，`byte[3]=0`、`byte[4]=5`。按 1 基「第 4 字节」读到的是 0，验收必失败；按 0 基 `byte[4]` 才是 5。findings-ship `:84` 写的是「5 个条目、第 5 条以 `\x89P` 开头」，计划把「条目数」写成了「第 4 字节」。

**最小修法**：staging 和 zip 条目加 `Sidelight.exe.config`，并断言存在；`verify-portable.mjs` 里加一条长路径/或至少检查 config 在解压目录；ico 检查改成 `[BitConverter]::ToUInt16($b,4) -eq 5`（或 `$b[4] -eq 5` 并注明 0 基），第 5 条目 PNG 检查保留。

---

## H5（major）T4 的 staging/zip 数字与「双击可用」证据

- findings-ship `:20-31` 的 staging 2,351,293 B 是 **未含 ico** 的账（含 `LICENSE` 1,079、`host/README.md` 占位 4,430）。计划 `:72` 的 staging 明确含 `sidelight.ico`（23,724 B），`:76` 却仍写「staging ≈2,351,293 B」；实际约 2,375,017 B（README.txt 新写会略有出入）。
- 950,000 B 门槛：findings-ship `:250` 实测 zip 880,260 B（同样未含 ico）。加上 ico、T1/T2 的 exe 增长与 T4 的图标资源，zip 预计接近 900–920 KB，余量约 30–50 KB；计划没有把「当前 880,260 + 新增项」写出来，阈值是拍出来的。
- `verify-portable.mjs`（`plan.md:74`）解压后 spawn exe、连 CDP、看 `.ProseMirror` 和进程退出。这证明「解压后的载荷能跑」，不证明资源管理器双击、MOTW/SmartScreen、首次启动路径。findings-ship 的发布验收 8 条里明确有「右键解压→双击→SmartScreen」人工步骤（`:297-306`），计划把它缩成了 spawn。

**最小修法**：staging 目标改为「staging 实际字节（脚本打印）+ 允差」，不要写死 2,351,293；zip 门槛用「当前 880,260 + ico 23,724 + exe 预计增量」写一段推导，或先跑一次再定；验收补一条真人双击/SmartScreen 步骤，或把 Demo 改成「解压后 spawn 可用」。

---

## H6（major）T5 的 ADR 固定数与 README 验收缺口

- 计划 `:93` 要求 ADR-0004 写「载荷 2,345,784 B（exe + 3 dll + www）」，`:95` 验收要求 ADR 含 `2,345,784`。这个数是**当前** host/bin 的载荷（实测 `exe+dll=952,904` + `www=1,392,880` = 2,345,784），但 T1/T2 都会改 `host/Program.cs`（+代码），T4 会给 exe 加 23,724 B 图标资源；T5 跑在 T4 之后，payload 必然不同。计划 `:97` 自己写「数字必须现场复算，不抄发现里的旧值」，与固定数验收冲突。ADR `:20` 现在还是旧值 3,165,041，说明这种读数确实需要每次重算。
- README：计划 `:92` 改开头「第二版原型，跑在浏览器里」、`:39` 的「没有 Tauri 壳」，但验收 `:95` 只检查「已知的重要问题」段的 4 个词和 `3 / 7`，没有检查第 5/39 行。tester 无法从验收命令确认这两处已改，等于只验了一半的 README 改动。
- CI 三项（`timeout-minutes`、`concurrency`、`permissions`）与 findings-ship `:226` 的缺口一致，这部分通过。

**最小修法**：T5 先跑 `Get-ChildItem host\bin` + `host\bin\www` 求和，把实际 payload 写进 ADR，验收改成「ADR 含取数命令输出」或给出上限；README 验收补 `Select-String README '第二版原型' 0 命中` 与 `'没有 Tauri 壳' 0 命中`（或改成实际新措辞的 ≥1 命中）。

---

## 逐项核对记录

### T1
- 现状确认：`Program.cs:207-225` 无条件 setItem + reload；`:227-262` 管道直接 `BeginInvoke`；`:173-179` 只记日志。findings-bug `:31-32` 的时序（`forward applied` 早于 `argv script added`）与代码一致。
- 管道协议：第二实例 base64 一行（`Program.cs:264-292`），第一实例 `ReadLine`（`:239-240`），空路径忽略；T1 不改协议，只加队列，兼容。`Forward` 的 50×100 ms 重试足以等 `form.Shown` 起的 pipe server。
- 「默认否」：`Button2` 是默认 No；`#32770` 的 ID 6/7 是标准；只要 PID 发现改对，`BM_CLICK` 可稳定点。当前问题是 PID 作用域（H1）。
- 三例覆盖：No 分支、Yes 分支、初始化前队列；**不覆盖**干净文档（应不弹框）、存盘后（误报）、reload 中再转发、localStorage 写失败。第 3 例与「初始 argv 脏」冲突（H1）。
- 文件重叠：T1/T2/T4 都改 `host/Program.cs`、`build.ps1`、`host/README.md`，但同属 builder2 串行，非并发；T3 只碰 `src/`，零并发重叠成立。

### T2
- `AppContextSwitchOverrides`：findings-bug `:69` 的探针已证明 `.exe.config` 生效（`exists verbatim=True`、`legacy=False`、`GetFiles` 能读）；计划用 `supportedRuntime v4.0` + `Switch.System.IO.UseLegacyPathHandling=false;BlockLongPaths=false`，方向对。
- `csc /win32manifest`：csc 4.8 支持该选项；计划 `:34` 的写法需要改成绝对路径（`$PSScriptRoot\app.manifest`），否则从 `host/` 运行时找不到。
- 数据目录：`ResolveUserDataDir` 目前只有两级（`Program.cs:94-113`），findings-bug `:36` 证明本机 LOCALAPPDATA 分支一直失败；T2 的三级回退方向对，但只读目录全失败的分支没有文案与测试（H2）。
- 验收：`longpath` 两例、`nowww`、`datadir`；`nowww` 10 s 与 60 s 看门狗冲突（H2）；`datadir` 的 LOCALAPPDATA 分支标 UNVERIFIED，可接受但需写清「TEMP 分支才是本机实测」。

### T3
- `hasKey` 在 `settings.ts:64`，计划引用正确；`App.tsx` 已有 `dirty`，与 T1 可复用。
- 三个对话框都有 `h2`：`SettingsDialog.tsx:28`、`SaveDialog.tsx:27`、`App.tsx:1997`；加 `aria-labelledby` 可行。`useDialogFocus` 无依赖可做（keydown Tab 循环 + 记录 opener），与现有结构兼容。
- 缺口：`inert`、mock 类 CSS、11px 与「≥12」目标、对比度公式/暗色（H3）；文件表多一个 `ai.ts`。
- 结论：不是 blocker，但按现验收，tester 会放过「模拟标签没样式」与「rail-goal 11px 不达目标」。

### T4
- 混合 ico 方案可复现：findings-ship `:68-84` 的 `.tmp/r2-icon/sidelight-mixed.ico` 23,724 B，`System.Drawing.Icon` 各尺寸中心色正确；`mkico.cs` 用 csc 生成，零下载。
- 缺口：config 未进 staging（H4）；ico 字节检查写错（H4）；staging 数字未含 ico（H5）；`verify-portable` 不证双击（H5）。
- 950,000 B：当前 880,260 B + ico 23,724 B + exe 增长，余量约 30–50 KB；够但需推导，否则 T1/T2 代码一长就撞线。

### T5
- README 事实错误确认：`README.md:104,106` 确实写「三类被改坏」「还没做」，`roundtrip-report` 已保真；`:102` 已是 `3 / 7`，计划「7 个样本不动」正确。
- ADR-0004 `:20` 是旧值 3,165,041；当前 payload 2,345,784；T5 固定数会过期（H6）。
- CI 当前 `.github/workflows/ci.yml` 无 timeout/concurrency/permissions；计划三项与 findings-ship `:226` 一致。

### 通用
- 文件归属：T1/T2/T4 的 host 文件同属 builder2 串行；T3 只碰 `src/`；T5 只碰 README/ADR/ci。**并发零重叠成立**，前提是 builder2 真的按 T1→T2→T4→T5 顺序，不提前开 T4/T5。
- 构建纪律：T1/T2/T4/T5 都不跑 `npm run build`；T3 跑 `npx tsc --noEmit`、`npm test`、`npx vite build --outDir .tmp/build-a`；最终 build 由根代理串行跑。覆盖 5 个任务，成立。
- 依赖：没有新增 npm 依赖；`useDialogFocus` 新文件有理由；`src/lib/ai.ts` 是唯一的未使用文件（T3）。
- 无法被 tester 独立复现的项：T1 的对话框自动化（H1）、T2 的 `nowww` 10 s（H2）、T4 的 ico 字节检查（H4）、T4 的双击/SmartScreen（H5）。

## 做对的地方（别改过头）

1. 构建纪律把 `npm run build` 收到根代理，A/B 各自 `.tmp/build-*`，T4 只复制 `dist`——这是本轮最有效的并行保险，保留。
2. T2 用 `.exe.config` + `longPathAware` 的方向已被 findings 的探针证明有效；`Resolve` 的前缀化 + 两例验收（带/不带前缀）结构正确。
3. T3 用 `hasKey` + 一个共享 `useDialogFocus`，不引依赖、三处对话框都有 `h2`，方向对；只需要补样式、对比度公式和 `inert` 取舍。

---

### 附：本次审查用到的证据文件（均在 `.tmp/`，未改产品文件、未 commit）

- `host/Program.cs`、`host/build.ps1`、`host/send-keys.ps1`：现状核对。
- `.tmp/r2-icon/sidelight-mixed.ico`：首 6 字节 `00 00 01 00 05 00`，`byte[3]=0`、`byte[4]=5`。
- `host/bin`：`exe+dll=952,904` + `www=1,392,880` = 2,345,784 B；`host/bin/webview2-data` 12,524,913 B；`host.log` 有 `appdata unusable … 退回 exe 同级`。
- `docs/iteration/round-02/findings-*.md`：B1/B2/B3、S1/S2/S5、U1/U2/U3 的原始读数。
