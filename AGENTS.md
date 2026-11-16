# AGENTS.md

Sidelight：面向中文写作者的桌面 Markdown 编辑器。左边写，右边按需让 AI 补光。公开发布，Windows 首发。

读的顺序：这里 → [README.md](README.md)（现状与命令）→ 动手前读相关 `docs/adr/`。其余按需。

## 1. 角色

| 谁 | 干什么 | 不干什么 |
| :--- | :--- | :--- |
| 产品负责人（人） | 定做什么、砍什么、值不值 | 不回答技术问题 |
| 根代理 | 拆任务、派子代理、验门禁、写交接 | 不一个人闷头写完全部代码 |
| 子代理 | 实现、修复、测试、发布、核查 | 不改产品方向 |

技术问题不要问产品负责人。缺信息自己查，缺证据自己做原型量。只有四件事必须回到人：产品定位或目标用户变了；要砍或加一个用户看得见的能力；要对外承诺（发布、署名、隐私声明）；要花钱。

## 2. 调度

默认派子代理。它看不到这场对话，提示里要自带上下文：仓库路径、要改的文件、验收标准。

| 任务 | 交给 | 交付物 |
| :--- | :--- | :--- |
| 功能实现 | implementer | 代码 + 门禁通过 + 界面变了就截图 |
| 缺陷修复 | fixer | 复现步骤、修复、回归证据 |
| 测试 | tester | 测试文件 + 通过输出 |
| 版本与发布 | releaser | 版本号、CHANGELOG、安装包、校验和 |
| 事实核查 | researcher | 分节结论 + 一手链接，查不到就写未核实 |
| 代码审查 | reviewer | Standards 与 Spec 两轴报告 |

一个文件不同时交给两个子代理。并行按「互不重叠的目录」切，不按「一人一半功能」切。集成由根代理做，做完自己再跑一遍门禁。

## 3. 门禁

改完必须过：

```bash
npm run build      # 类型检查 + 打包
npm test           # 测试文件与条数以 npm test 输出为准（第 32 轮记 21 个文件、276 条）：上下文、批注、大纲、字数、frontmatter、行差分、图片命名、查找、脚注、HTML、callout、导出、公式、缓存、搜索、错误文案、删除撤销、设置、提示词、KaTeX 惰性
npm run roundtrip  # 只在改动编辑器或 markdown 序列化时跑
```

界面变了要截图：`npm run dev`，再 `node scripts/shot.mjs --out shots/round-NN/x.png`；不带 `--out` 时默认写 `.tmp/shots/shot.png`，不会覆盖历史证据。沙箱挡住浏览器就换 CDP 方式或记「未验证」，不要反复重试同一命令。页面白屏且控制台说「模块没有导出」时，先重启 dev server，别改代码——那是 Vite 的模块缓存。

## 4. 不许动的东西

- 编辑器内核是 Tiptap。换内核要新 ADR，见 [0001](docs/adr/0001-document-tree-is-the-truth.md)。
- AI 不直接写正文：修订建议只有人点「采纳」才落入正文。见 [GLOSSARY.md](GLOSSARY.md) 的「正文」与 [0003](docs/adr/0003-margin-annotations.md)。
- 意见用页边批注，不退回右侧列表，见 [0003](docs/adr/0003-margin-annotations.md)。
- 只做自带密钥，不代管请求。见 [0002](docs/adr/0002-ai-access-byo-key.md)。
- `GLOSSARY.md` 只放领域词。术语变了当场改，别攒。
- 缓存只写 `.sidelight/`：文档同级优先，打开文件夹时写工作区根目录。不要往别处放草稿或批注文件。
- 不新增运行时依赖，除非省下的代码比依赖大。加一个，在 README 记一行理由。

轻量是产品底线：不加后台常驻、启动不联网、不为一个小功能引一个库。安装包体积与冷启动时间是验收项，不达标算没做完。

## 5. 版本与发布

版本号在 `package.json`，变更记 [docs/CHANGELOG.md](docs/CHANGELOG.md)。语义化：修复 +0.0.1，功能 +0.1.0，破坏性 +1.0.0。

发布交给 releaser，任务里写全步骤：

1. 改版本号，写 CHANGELOG 当次条目。
2. `npm run build` 通过。
3. 打安装包（Windows）：先 `powershell -ExecutionPolicy Bypass -File host\build.ps1` 编 C# 宿主（需 `dist/` 与 `.tmp\wv2` 的 WebView2 SDK），再 `packaging\installer.ps1` 出 NSIS 安装包；便携包用 `packaging\portable.ps1`。产物在 `release/`，不进版本控制。
4. 打 macOS 包（需要在 macOS + Xcode CLT 上，或交给 CI）：`bash host-mac/build.sh` → `release/Sidelight-<版本>-macos-universal.zip`（默认 ad-hoc；配了 Apple secrets 时 `host-mac/sign.sh` 签名 + 公证并重打 zip）；`--self-test --require-bundle` 与 `host-mac/verify.sh` 验包。Windows 本机不能编译 macOS 宿主。
5. 跑 `packaging\verify-installer.ps1`，记下 UNVERIFIED 项（HKCU、开始菜单、默认路径、双击/SmartScreen）；产出校验和与发布说明草稿。
6. 根代理复核，交给人点发布。

## 6. 当前状态

当前 0.32.1，Windows + macOS 桌面应用：C# WebView2 宿主（`host/`，Windows）与 Swift/AppKit/WKWebView 宿主（`host-mac/`，Universal：arm64 + x86_64，macOS 13+）加载同一份 `dist`；per-user NSIS 安装包与便携 zip、macOS zip 在 `release/`（不进版本控制，打包脚本在 `packaging/` 与 `host-mac/build.sh`）。文件树、可折叠大纲、状态栏字数明细（点字数看中日韩字/拉丁词/合计/字符/句/段/阅读时间与选区计数，打开后焦点进面板）与随选区显示的「选区 N 字」、源码/预览/专注/打字机、页边批注与采纳、逐条追问、联网核对、长文批注定位、点正文链接就地编辑、链接与公式就地编辑、列表内 Tab/Shift+Tab 缩进、frontmatter/脚注/行内 HTML/callout/公式保真、保存前对比、`.sidelight` 缓存、图片插入、查找替换、字号缩放、导出、表格工具条都能跑。测试 21 个文件 276 条。CI 有 Linux gate、Windows 宿主与安装包、macOS 宿主三组 job，Windows/macOS 宿主已转必过；发布走 `.github/workflows/release.yml`（tag `v*` 或手动 `tag` + `publish`）；macOS 默认 ad-hoc，配了 Apple secrets 时同一条流水线签名 + 公证并重打 zip；`install-verify` 仍只手动触发。

新建与另存为已能走完「新建 → 写 → 保存 → 再打开」：顶栏「文件」菜单（新建/另存为/关闭文档/打开文件/打开文件夹）、文件树头「＋ 新建文件」、首次启动是一篇空的 `未命名.md`、有工作区且无句柄时 `Ctrl+S` 直接在根目录建 `未命名.md`/`未命名 2.md`（显式另存为仍走系统 picker）、保存成功有持久提示；双击 `.md` 由宿主打开后可直接写回原文件（宿主 `/__doc` + `postMessage`，原子替换，编码/换行保留）；`.md` 只加「打开方式」候选（安装时 opt-in、默认不勾、不改默认程序）；宿主文档有草稿兜底（`draft-save` 写 `.sidelight/drafts/`，`/__draft` 只读），关窗有未保存改动时问「取消 / 存草稿 / 丢弃」；宿主记住最近 8 篇（`/__recent` 只回哈希 id，可清除/撤销/移除）；没动过的表格整块写回原文；含引用式链接定义的文档默认源码模式打开；KaTeX 惰性加载（首屏 gzip 285,052 B ≤286,000（数据安全例外，STATE 记理由），余 948 B）；保存成功后不再写陈旧草稿（停计时器 + 推进代际），超过 5.5 MiB 的文件被拒时提示说清「仍在哪一篇」；文件树右键可删除（移到工作区 `.sidelight/trash/`），撤销恢复原内容（含删除前的未保存改动），同目录重命名（只接受 `.md`/`.markdown`，目标存在拒绝，缓存迁新键，最近记录不迁移）；侧栏页签支持键盘切换（`tablist`），文件树有展开态与空文件夹提示；重开恢复上次文件夹/文件/批注（IndexedDB 只存句柄，权限三态，失败退化为最近打开）；Typora 式快速键（Ctrl+K/M/P、Ctrl+1–6/0、Ctrl+/、表格 Tab/Ctrl+Enter、列表 Tab/Shift+Tab 缩进、侧栏 Ctrl+Shift+1/3/L）；搜索支持 Tavily/博查/DeepSeek；不能移动/复制/删目录，无应用内恢复。未验：中文输入法（浏览器与宿主）、真模型与真实搜索接口（无 key）、安装后的 HKCU 卸载项/开始菜单/真人双击/SmartScreen、WebView2 缺失分支（仅静态检查）、写回（文件占用/只读/网络盘/中文路径/真人双击）、勾选关联后「打开方式」是否出现与卸载是否残留、真人交互安装、数据保真拦截的真实文档样本、真实 Alt+F4/注销/关机下的关窗、真实 IME 组合输入下的关窗、`save-draft` 写失败（只读目录）的可见错误路径、真人重启后的最近列表、`recent.json` 写失败、网络盘失效、卸载保留 `%LOCALAPPDATA%\Sidelight`、日志迁移、表格复用只保证行内字节、真实宿主源码保存字节、真实 WebView2 冷启动、离线时 KaTeX chunk 失败、CLI 下 `npm test` 看不到 alias、文件树删除的真人右键与确认框、从 trash 手动恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除同一文件、真人右键重命名与确认框、大小写两段式失败后的临时名、网络盘/OneDrive 占位文件下的改名、macOS 真机（本机是 Windows，未运行过）、WKWebView 下的真实 IME 与拖放、真实 Intel Mac 运行、Rosetta、真实签名/公证、图标真机显示、⌘C/⌘V/⌘Z、P2 延后项（骨架 role/aria-busy、批注卡 Enter 跳句、正文开头 Tab 回环）、memo/B4/B5/2 MB 进度条、100 KB 与 1 MB 的逐键 p95 未测（1 MB 载入已测 1284 ms）、真实重开权限、150%/200% 缩放屏、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话已丢弃批注不可恢复。质量报告里的 22 条问题已全部修完（见 [质量报告](docs/qa-report.md) 顶部）；对 Typora 的差距见 [差距表](docs/typora-gap.md)，当前 21 项有、18 项缺。

下一步写在 README 末节。改完状态就更新那一节，别另开地方。

## 7. 交接

收工改三处：README 的「现在能做什么」与「现在不能做什么」、CHANGELOG 当次条目、被推翻的 ADR；轮次结束由根代理更新 `docs/iteration/STATE.md`。做不到的事写清楚原因，别留给下一个人猜。

## 8. 踩过的坑（改之前先看这里）

- **PowerShell 脚本必须带 UTF-8 BOM**：`host/build.ps1`、`packaging/*.ps1` 含中文；Windows PowerShell 5.1 按 ANSI 读无 BOM 文件，会报 `TerminatorExpectedAtEndOfString` 之类假语法错误。用 `[IO.File]::WriteAllText(path, text, New-Object Text.UTF8Encoding($true))` 保存。
- **版本号不要写死**：`host/build.ps1` 从 `package.json` 生成 `AssemblyVersion`；`packaging/*.ps1` 从 `package.json` 读版本。发版后核对 Release 资产文件名里的版本，v0.32.0 曾发出 0.31.1 的 Windows 包。
- **WebView2 默认吞加速键**：宿主必须设 `core.Settings.AreBrowserAcceleratorKeysEnabled = false`，否则 `Ctrl+K/P/F` 到不了页面。改完跑 `host-smoke` 的「加速键」断言。
- **WinForms 的 `System.Windows.Forms.ApplicationConfigurationSection` 会让宿主启动即报「配置系统未能初始化」**：不要往 `Sidelight.exe.config` 加这个节；高分屏只靠 `app.manifest` 的 `PerMonitorV2`。
- **`/__annotations` 没有缓存时返回 200 空 v2 store，不要 404**：404 会在控制台留错误并让 `host-smoke` 的「0 错误」失败。
- **`host-smoke` 做 FSA 前先关掉快速打开浮层**：`Ctrl+P` 测试后不按 Esc，遮罩会拦截「打开文件夹…」。
- **CDP 9333 会被遗留 Edge 占用**：宿主会连到旧页面（旧文档、pages=3）。跑 `host-smoke` 前确认 9333 无监听，必要时杀掉占用进程。
- **WebView2 数据目录**：优先 `%LOCALAPPDATA%\Sidelight\WebView2`，实际常见 `%LOCALAPPDATA%\Sidelight\EBWebView`；清数据要两个都看。遗留 `侦察-22.md` 这类假失败多来自旧数据。
- **会话恢复不自动要权限**：IndexedDB 只存 FSA 句柄；`queryPermission` 为 `prompt` 时只显示「继续上次」，点击后再 `requestPermission`。宿主文档优先，但要尝试恢复工作区树。
- **批注 v2 迁移先备份**：`.sidelight/annotations` 从数组升 `{v:2,annotations,notes}`，写前留 `.bak-*`；未定位条目不删文件，转 `unresolved`。
- **重跑批注必须整窗替换**：`replaceInWindow` 去重/复用 id；只追加会让卡片翻倍、位置错乱。
- **测试脚本选择器会过期**：DOM 改动后先改脚本再判产品失败；`data-safety` 的 `.editor`、`host-smoke` 的 `/__annotations` 404 都属此类。
- **首次启动不要加载示例文档**：示例只要是 dirty 状态，`Ctrl+N` 新建会先弹「切换文档」三选一，用户会以为新建坏了；首启必须是空白 `未命名.md`。
- **长开的 CDP 会话可能执行 App.tsx 的中间版本**：dev server 的 `/src/App.tsx` 已是新版、磁盘也是新版，但页面里跑的还是 HMR 没应用的那一版（第 29 轮就这样：草稿守卫是新版，超大文件提示还是旧版）。判「产品没修」前先 dump 实时 handler：`document.querySelector('.file-tree')` 的 `__reactFiber$*` 向上找 `memoizedProps.onOpenFile.toString()`；与源码不符就重启 dev server，别改产品代码。反过来也会变新：第 30 轮计划写成「dev server 交付旧模块」记了 UNVERIFIED，验收时同一 URL 已是新模块（`tooLargeNote` 2 处 → 3 处）——「测不到」的结论在开测前也要重测一次。
- **`scripts/export-acceptance.mjs` 结尾的 `browser.close()` 会断掉 CDP 连接；删掉它以后 CDP 连接会吊住 Node 进程不退**：改这类脚本时用末尾 `process.exit(...)` 收尾（第 30 轮实测：`connectOverCDP` 下 `browser.close()` 后 9222 的 Edge 进程仍 UP，只是 Playwright 断连）。`keyboard-acceptance.mjs` 仍带 `browser.close()`，安排在最后跑最稳。
- **带中文的手写 e2e 脚本不要用 PowerShell 字符串替换改**：`Get-Content -Raw | -replace | Set-Content` 会把 UTF-8 中文读成 ANSI 再写回，脚本里选择器全变乱码。改 `.tmp/*.mjs` 用 write/edit 工具。
- **在 PowerShell 命令里用中文正则去 `-match` 抓文本会静默假阴**：`$c = (Invoke-WebRequest 'http://localhost:5175/src/components/StatsDetail.tsx').Content; $c -match '中日韩字'` 返回 False，不是模块陈旧——控制台按 ANSI 解码 UTF-8，中文字面量与会话解码不一致。判「dev server 交付旧模块」前先用 ASCII 标记（`panelRef`、`sinkListItem`、`openLinkRef.current = `）或 `-match '\u4e2d\u65e5\u97e9\u5b57'` 复核；读中文用 `read` 工具，不要用 `Get-Content`。
- **`scripts/keyboard-acceptance.mjs` 会覆盖 3 张已跟踪的历史截图 `shots/round-05/`**：它对 `shots/round-05/t1-skip.png` 等路径写盘，跑完 `git status` 会多出改动。按计划跑完立刻 `git checkout -- shots/round-05/` 还原，别把它当本轮证据提交。

