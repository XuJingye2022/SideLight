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
npm run verify     # build + 首屏 gzip 字节门；build 只保证能构建，改过 src/ 就要跑这条
npm test           # 测试文件与条数以 npm test 输出为准（第 50 轮记 33 个文件、432 条）：上下文、批注、大纲、字数、frontmatter、行差分、图片命名、图片解析缓存、表格单元格 `<br>`、表格范围、保存基线、查找、脚注、HTML、callout、导出、公式、缓存、搜索、错误文案、删除撤销、设置、提示词、KaTeX 惰性、智能标点、Mermaid 惰性、单波浪号、空段落合并、替换区间
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
- 不新增运行时依赖，除非省下的代码比依赖大；产品负责人批准的功能依赖（如 Mermaid）在 README 记理由与体积。

轻量仍是体验指标：不加后台常驻、启动不联网；同功能取最小实现。优先级：**稳定性 > 核心功能 > 体积优化 > 节省 Token > 工作速度**。安装包硬线 **50,000,000 B**（内部预算 **45,000,000 B**），首屏 gzip 内部 **310,000 B** / 硬线 **320,000 B**。不要为了省几 KB 砍能提升体验的功能。

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

当前 0.32.1，Windows + macOS 桌面应用：C# WebView2 宿主（`host/`，Windows）与 Swift/AppKit/WKWebView 宿主（`host-mac/`，Universal：arm64 + x86_64，macOS 13+）加载同一份 `dist`；per-user NSIS 安装包与便携 zip、macOS zip 在 `release/`（不进版本控制，打包脚本在 `packaging/` 与 `host-mac/build.sh`）。文件树、可折叠大纲、状态栏字数明细（点字数看中日韩字/拉丁词/合计/字符/句/段/阅读时间与选区计数，打开后焦点进面板）与随选区显示的「选区 N 字」、源码/预览/专注/打字机、页边批注与采纳、逐条追问、联网核对、长文批注定位、点正文链接就地编辑、链接与公式就地编辑、列表内 Tab/Shift+Tab 缩进、智能标点与自动配对（设置里可关）、AI 提示词拆分（格式与安全规则内置 system，设置只改作者偏好，旧 `analysisPrompt` 迁移不丢）、Esc 后焦点回正文（预览/源码/快速打开；查找框开着时一个 Esc 只关查找）、Mermaid 图表（```mermaid 围栏惰性渲染，首屏 0 B，首次见图才下载；HTML 导出与预览面板不含图；切主题会重绘，含跟随系统）、frontmatter/脚注/行内 HTML/callout/公式保真、保存前对比（含脚注定义丢失拦截，自动保存也拦）、`.sidelight` 缓存、图片插入、查找替换、字号缩放、导出、表格工具条（含表头边界拖拽改列宽）都能跑；第 44 轮补：无序列表里打 `- [ ] ` / `- [x] ` 直接建任务项、保存写回 `- [ ] `，深色主题下打印 / 另存 PDF 用浅底深字。第 47 轮补：行内 HTML 白名单渲染（`<kbd>` / `<mark>` / `<sub>` / `<sup>` 四种不带属性、成对、同一行的标签在编辑视图与预览里显示真样式，保存写回原标签、往返逐字节不变）、反引号行内代码里的 `--` / `...` / 引号 / 半角标点不再被智能标点改写、Mermaid 语法错误的图不再残留 `body` 下。第 49 轮补：命名 HTML 实体（`&nbsp;` / `&copy;` / `&hellip;`）打开→保存不再被二次转义成 `&amp;…`（按原文出现次数对照、只数代码外、`&amp;<名>;` 讲转义时该名字保守保持；表格单元格与整行 `&nbsp;` 同一路径）、`<mark>` 高亮改用新 token `--mark-bg`（浅/深/跟随系统/打印四处，与纸底距离 53.3 / 57.2）、代码块字号 12.72 → 15.3 px（不低于行内代码 14.79 px）、Mermaid 错误提示改走 `--danger`（深色 3.03:1 → 6.92:1）、查找条与表格工具条 7+7 个按钮 `min-height: 24px`、中文上下文里 `--` 出 `——`（紧邻汉字才出，空格隔开的 `甲 -- 乙` 仍是一个 `—`）。测试 33 个文件 432 条。第 40 轮补：单波浪号 `H~2~O` 与 `<!-- 注释 -->` 打开→保存逐字节不变（`~~删除线~~` 仍生效，围栏/行内代码/引用块围栏/公式里的 `~` 不动）、只读预览恢复正文排版（36rem 限宽、表格边框、引用边线，与编辑态同字号）、连续空段落不再写 `&nbsp;`、窗口/标签标题始终跟随当前文档。第 41 轮补：正文、围栏与行内代码里的 `<` `>` `&` 打开→保存逐字节不变（单遍实体解码 + `&amp;` 前视守卫 + 块首 `&gt;` 守卫）、查找条加「区分大小写 / 整词」两个开关（`Aa`/`ab`，会话内）、切换/关窗确认框与设置面板开着时自动保存不写盘。第 42 轮补：预览（只读）视图里查找替换整体锁住（与源码模式同一语义，命中计数不再显示）、正文里按 `Esc` 把焦点移到正文之后的状态栏字数入口（正向出口，组合输入期间不夺焦）、工具栏格式按钮有 `aria-pressed` 与按下态、表格工具条删除三项用危险色并与插入组分开、正文焦点指示线钉在滚动容器（`docs/iteration/round-42/test.md`）、退出源码不再整篇重解析（`sl-parse-done` 不增加）＋ 三个全文 repair 加精确守卫 ＋ 保存链补 10 条单测。CI 有 Linux gate、Windows 宿主与安装包、macOS 宿主三组 job，Windows/macOS 宿主已转必过；发布走 `.github/workflows/release.yml`（tag `v*` 或手动 `tag` + `publish`）；macOS 默认 ad-hoc，配了 Apple secrets 时同一条流水线签名 + 公证并重打 zip；`install-verify` 仍只手动触发。

新建与另存为已能走完「新建 → 写 → 保存 → 再打开」：顶栏「文件」菜单（新建/另存为/关闭文档/打开文件/打开文件夹）、文件树头「＋ 新建文件」、首次启动是一篇空的 `未命名.md`、有工作区且无句柄时 `Ctrl+S` 直接在根目录建 `未命名.md`/`未命名 2.md`（显式另存为仍走系统 picker）、保存成功有持久提示；双击 `.md` 由宿主打开后可直接写回原文件（宿主 `/__doc` + `postMessage`，原子替换，编码/换行保留）；`.md` 只加「打开方式」候选（安装时 opt-in、默认不勾、不改默认程序）；宿主文档有草稿兜底（`draft-save` 写 `.sidelight/drafts/`，`/__draft` 只读），关窗有未保存改动时问「取消 / 存草稿 / 丢弃」；宿主记住最近 8 篇（`/__recent` 只回哈希 id，可清除/撤销/移除）；没动过的表格整块写回原文；含引用式链接定义的文档默认源码模式打开；KaTeX 惰性加载（首屏 gzip **294,913 B**，预算内部 310,000 B / 硬线 320,000 B，距硬线余 25,087 B）；保存成功后不再写陈旧草稿（停计时器 + 推进代际），超过 5.5 MiB 的文件被拒时提示说清「仍在哪一篇」；文件树右键可删除（移到工作区 `.sidelight/trash/`），撤销恢复原内容（含删除前的未保存改动），同目录重命名（只接受 `.md`/`.markdown`，目标存在拒绝，缓存迁新键，最近记录不迁移）；侧栏页签支持键盘切换（`tablist`），文件树有展开态与空文件夹提示；重开恢复上次文件夹/文件/批注（IndexedDB 只存句柄，权限三态，失败退化为最近打开）；Typora 式快速键（Ctrl+K/M/P、Ctrl+1–6/0、Ctrl+/、表格 Tab/Ctrl+Enter、列表 Tab/Shift+Tab 缩进、侧栏 Ctrl+Shift+1/3/L）；搜索支持 Tavily/博查/DeepSeek；不能移动/复制/删目录，无应用内恢复。未验：中文输入法（浏览器与宿主）、真模型与真实搜索接口（无 key）、安装后的 HKCU 卸载项/开始菜单/真人双击/SmartScreen、WebView2 缺失分支（仅静态检查）、写回（文件占用/只读/网络盘/中文路径/真人双击）、勾选关联后「打开方式」是否出现与卸载是否残留、真人交互安装、数据保真拦截的真实文档样本、真实 Alt+F4/注销/关机下的关窗、真实 IME 组合输入下的关窗、`save-draft` 写失败（只读目录）的可见错误路径、真人重启后的最近列表、`recent.json` 写失败、网络盘失效、卸载保留 `%LOCALAPPDATA%\Sidelight`、日志迁移、表格复用只保证行内字节、真实宿主源码保存字节、真实 WebView2 冷启动、离线时 KaTeX chunk 失败、CLI 下 `npm test` 看不到 alias、文件树删除的真人右键与确认框、从 trash 手动恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除同一文件、真人右键重命名与确认框、大小写两段式失败后的临时名、网络盘/OneDrive 占位文件下的改名、macOS 真机（本机是 Windows，未运行过）、WKWebView 下的真实 IME 与拖放、真实 Intel Mac 运行、Rosetta、真实签名/公证、图标真机显示、⌘C/⌘V/⌘Z、P2 延后项（骨架 role/aria-busy、批注卡 Enter 跳句、正文开头 Tab 回环）、memo/B4/B5/2 MB 进度条、100 KB 与 1 MB 的逐键 p95 未测（1 MB 载入已测 1284 ms）、真实重开权限、150%/200% 缩放屏、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话已丢弃批注不可恢复。质量报告里的 22 条问题已全部修完（见 [质量报告](docs/qa-report.md) 顶部）；对 Typora 的差距见 [差距表](docs/typora-gap.md)，当前 32 项有、9 项缺。

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
- **智能标点会改键盘输入本身**：`handleTextInput` 命中要 `return true`，不命中必须 `return false`（返回 `true` 会截断后面的输入规则，反引号→内联代码、`---`→分隔线都会坏）。新增输入规则后先跑 `keyboard-acceptance`：它会在中文后打 `?`，现在上屏 `？`，断言已改成两种都接受（第 33 轮）。
- **首次启动不要加载示例文档**：示例只要是 dirty 状态，`Ctrl+N` 新建会先弹「切换文档」三选一，用户会以为新建坏了；首启必须是空白 `未命名.md`。
- **长开的 CDP 会话可能执行 App.tsx 的中间版本**：dev server 的 `/src/App.tsx` 已是新版、磁盘也是新版，但页面里跑的还是 HMR 没应用的那一版（第 29 轮就这样：草稿守卫是新版，超大文件提示还是旧版）。判「产品没修」前先 dump 实时 handler：`document.querySelector('.file-tree')` 的 `__reactFiber$*` 向上找 `memoizedProps.onOpenFile.toString()`；与源码不符就重启 dev server，别改产品代码。反过来也会变新：第 30 轮计划写成「dev server 交付旧模块」记了 UNVERIFIED，验收时同一 URL 已是新模块（`tooLargeNote` 2 处 → 3 处）——「测不到」的结论在开测前也要重测一次。
- **`scripts/export-acceptance.mjs` 结尾的 `browser.close()` 会断掉 CDP 连接；删掉它以后 CDP 连接会吊住 Node 进程不退**：改这类脚本时用末尾 `process.exit(...)` 收尾（第 30 轮实测：`connectOverCDP` 下 `browser.close()` 后 9222 的 Edge 进程仍 UP，只是 Playwright 断连）。`keyboard-acceptance.mjs` 仍带 `browser.close()`，安排在最后跑最稳。
- **带中文的手写 e2e 脚本不要用 PowerShell 字符串替换改**：`Get-Content -Raw | -replace | Set-Content` 会把 UTF-8 中文读成 ANSI 再写回，脚本里选择器全变乱码。改 `.tmp/*.mjs` 用 write/edit 工具。
- **在 PowerShell 命令里用中文正则去 `-match` 抓文本会静默假阴**：`$c = (Invoke-WebRequest 'http://localhost:5175/src/components/StatsDetail.tsx').Content; $c -match '中日韩字'` 返回 False，不是模块陈旧——控制台按 ANSI 解码 UTF-8，中文字面量与会话解码不一致。判「dev server 交付旧模块」前先用 ASCII 标记（`panelRef`、`sinkListItem`、`openLinkRef.current = `）或 `-match '\u4e2d\u65e5\u97e9\u5b57'` 复核；读中文用 `read` 工具，不要用 `Get-Content`。
- **`scripts/keyboard-acceptance.mjs` 会覆盖 3 张已跟踪的历史截图 `shots/round-05/`**：它对 `shots/round-05/t1-skip.png` 等路径写盘，跑完 `git status` 会多出改动。按计划跑完立刻 `git checkout -- shots/round-05/` 还原，别把它当本轮证据提交。同类的还有 **`scripts/fidelity-acceptance.mjs` 写 `shots/round-10/`（3 张）**（第 39 轮实测），跑完一样要 `git checkout -- shots/round-10/`。
- **`Select-String -Pattern` 是 .NET 正则，`git grep` 默认 POSIX BRE**：写 `-Pattern '820000\|850000'` 匹配的是字面竖线，恒 0 命中——要写多模式（逗号分隔 = 或，如 `'820,?000','850,?000'`，`?` 同时抓有/无千分位两种写法）；`git grep` 要显式 `-nE` 才有真 `|`。每条「0 命中」验收都必须先贴改前 >0 的正向对照（第 35 轮 P1）。
- **原生命令参数里的 `"` 在 PowerShell 下会被吃掉，单引号也救不了**：`git grep -nF 'RMDir /r "$INSTDIR\www"' -- packaging/installer.nsi` 在改后仍 **0 命中、exit 1**（git 实际收到去掉双引号的模式），会被当成「改动没落地」。含 `"` 的模式改用 PowerShell 原生 `Select-String -Path <文件> -Pattern '…' -SimpleMatch`（无传参层），并用同文件另一行同类模式作正向对照；只有不含 `"` 的模式（如 `'^Icon "'` 之外）才适合交给 `git grep`（第 45 轮）。
- **文档里写死的安装包字节，要在最后一次 `npm run build` 之后量**：第 45 轮先编了 setup（1,304,596 B）后改 CSS 重建 `dist`（+83 B），三个文档里的字节与 `www` 目录字节全部过期；用最终 `dist` 连编两次同值（1,304,634 B）才算数。改完 `src/` 后重量的顺序是 `npm run verify` → `installer.ps1 -AssocDryRun` → 抄数字（第 45 轮）。第 46 轮起 `README.md`/`packaging/README.md` 不再写死字节，只留「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」；同轮给 `installer.ps1`/`portable.ps1` 加了 payload 版本门（`host\bin\Sidelight.exe` 的 FileVersion 必须等于 `package.json`）。
- **PowerShell 的 `param()` 必须是脚本第一条语句**：放到 `$ErrorActionPreference = 'Stop'` 之后是语法错误（不是运行时错误，`Parser::ParseFile` 会报、PowerShell 直接拒绝运行）。第 46 轮给 `verify-installer.ps1` 加 `-Setup`/`-PreflightOnly` 时踩到；注释块在 `param()` 之前是允许的。
- **ProseMirror 插件的 `view` 是插件 spec 的顶层字段，不是 `props.view`**：`props` 只收 EditorProps（`decorations`、`handleKeyDown`…），把 `view` 写进 `props` 会被静默忽略——插件永远不调用它，装饰也就永远不重建（第 46 轮 Mermaid 切主题重绘时必须用 `new Plugin({ view(editorView) {…} })`）。
- **`Decoration.widget` 的 `spec.key` 不变时 ProseMirror 会复用旧 DOM**：改了缓存键但没改 widget key，看起来像「渲染没更新」。key 要带上会变的那一维（第 46 轮用 `mermaid-${renderKey}@${pos}`：只带 hash 时同一文档两个相同代码块会撞 key）。
- **`powershell -NoProfile -Command "…"` 的双引号会先展开变量**：套壳跑 `$e=$null; [Parser]::ParseFile(…, [ref]$null, [ref]$e); $e.Count` 会被展开成 `=; …[ref], [ref]); .Count`，实测 exit 1 加三条假报错。语法解析在当前会话直跑，或外层用**单引号**（第 35 轮）。
- **源码模式里 `.ProseMirror` 不在 DOM**：`focusEditor()` 是空操作，输入框卸载后焦点掉 `body`；预览 pane 是 `contentEditable=false` 且无 `tabindex`，`.focus()` 同样无效。Esc 收尾按模式分派焦点，别一律 `focusEditor()`（第 35 轮）。
- **`FindBar` 的 Esc 必须 `stopPropagation()`**：它先关自己，同一个 Esc 继续冒泡到 window 的 Escape 分支时 `findOpen` 已是 `false`，于是连带退出源码/预览——一次按键两个动作。新增「Esc 关某 UI」时先看 window 分支的闭包快照（第 35 轮）。
- **`scripts/measure-first-screen.mjs` 的位置参数解析会把 `--flag` 的值当目录**：`--target 280000` 曾让 `280000` 当 `--dir` → `readFileSync` ENOENT。新增 flag 时同步改 `positional` 的过滤（跳过 `--` flag 及其后一个值）（第 35 轮）。
- **`Select-String` 数「正文段落里的 `br`」会把表格单元格里的算进去**：`.ProseMirror p br` 也命中 `td`/`th` 内的段落（单元格内容也是 `p`），第 39 轮差一点把 T1 判成「正文 `<br>` 也被换成换行」。要按「正文」口径数就加过滤：`[...document.querySelectorAll('.ProseMirror p br')].filter((b) => !b.closest('td, th'))`。
- **DEV 埋点是 `performance.mark`，dev 下每个 name 两条**：`src/main.tsx` 是 `<StrictMode>`，首次载入的 effect 跑两遍，5 个标签共 **10 条 mark**（第 39 轮 1 MB 实测 `[sl-load-start, sl-parse-done, sl-dispatch-done, sl-serialize-done, sl-sync-done] × 2`）。读数按 name 取**最后一条**（`.at(-1)`）算单遍，先等条数连续两次不变再取；不要 `clearMarks`（同名两条是两遍的物证），也不要拿这 5 个标签测逐键/切模式（会与整篇载入混在一起）。
- **`escapeHtmlForParse` 的围栏判定比 CommonMark 宽**：`mapOutsideCode` 把任意缩进、任意长度的 ``` 都当围栏，marked 只认 ≤3 空格缩进，于是「4 空格缩进的开栏 + 下一行裸 HTML」里那行不再转义、被当 HTML 块（第 41 轮实测丢标签；改前是保留实体文本）。要改就用 CommonMark 严格围栏判定（收尾行不带 info string）；`fenceMap` 同时被 `risk.ts` 的往返/损失判定用，别只改一处。
- **按文本节点整节点 `replaceWith` 做批量替换，会把该节点里的页边批注区间一起映射塌**：第 50 轮实测「全部替换」后 `.annot` 1 → 0、store 被清空，而正文长度与 `Ctrl+Z` 都看不出坏。被批注盖住的文本节点要退回逐条替换（`src/App.tsx` 的 `replaceEvery`）；判「批注没坏」只信真跑批注的脚本（`.tmp/e2e-r50-impl-t2-ann.mjs`），别用静态 grep 代替。
- **`PluginKey` 的 `key` 带 `$` 后缀**：`new PluginKey('sidelightFind')` 实际值是 `sidelightFind$`（`createKey`），用 `spec.key === 'sidelightFind'` 找插件会 0 命中，随后的 `setMeta(undefined, …)` 静默无效——两次读数一样就会错判「装饰不是瓶颈」。要写 `spec.key?.key?.startsWith('sidelightFind')` 并先断言拿到插件，拿不到就记 UNVERIFIED。
- **不要过度设限**：要求"安装包尽可能小"，结果自己设置了上限，反而很多能增加体验的功能没做。记住：**稳定性>核心功能>体积优化>节省Token>工作速度**。
- **marked 的 tokenizer 不能靠 `return false` 关掉单个 `~` 的删除线**：`manager.instance.use({ tokenizer: { del() { return false } } })` 之后 marked 会落回基础 GFM 规则，`H~2~O` 仍是 strike（第 40 轮实现实测）。要改就用行内扩展把「不成对的单个 `~`」当 `text` token（`src/lib/tilde.ts` 的 `loneTildeText`）；`WeakSet` 只按 manager 去重，但同一进程里多个 manager 重复 `use()` 不报错（已测）。单测 + 应用内 E2E 都要跑，别只信 tsc。
- **正文 Tab 缩进的 E2E 断言会被载入期点击假阴**：文档刚载入时先 `page.click(段落)`、再插 `page.evaluate` 读状态、然后才按 `Tab`，ProseMirror 的选中位置会被重置到文首 `1/1`，`Tab` 就落进 `src/App.tsx` 的 skip-link 分支（`from === 1 && to === 1` → `return false`），浏览器默认动作把焦点移走 → 断言读到 `tabDelta:0`、连 `Esc` 也不命中（第 42 轮 tester 实测；产品代码没问题）。点击后停 200–250 ms 再按键；先把基线读完再点、点完立刻按键也行。
- **Tiptap 输入规则里 `\s$` 会把 Enter 也算成空格**：`@tiptap/core` 的 `inputRulesPlugin.handleKeyDown` 在 Enter 上用 `text: "\n"` 调 runner，`/\[ \]\s$/` 这类规则会被回车复用（转换触发、换行被吃）。末尾要匹配真正输入的字符就写字面空格；`src/lib/taskListInput.ts` 的 `TASK_MARKER` 是这么写的（第 44 轮）。
- **E2E 不要点 `.doc-column .ProseMirror` 容器中心**：编辑器底部永远有一个尾随空段落，点容器中心常把光标放进它，后续 `Enter` / 打字都落在列表外，看起来像「任务项按 Enter 不续项」的假红（第 44 轮 tester 实测）。要点段落就点 `.ProseMirror p` 或目标结构里的具体 `p`，点完停 200–250 ms。

