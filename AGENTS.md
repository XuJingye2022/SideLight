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
npm test           # 测试文件与条数以 npm test 输出为准（第 86 轮记 51 个文件、659 条）：上下文、批注、大纲、字数、frontmatter、行差分、图片命名、图片解析缓存、表格单元格 `<br>`、表格范围、保存基线、查找、脚注、HTML、callout、导出（含行内语法三条样式与 `styles.css` 漂移门）、公式、缓存、搜索、错误文案、删除撤销、设置、提示词、KaTeX 惰性、智能标点、Mermaid 惰性、单波浪号、空段落合并、替换区间、行内语法（解析 + 手打 + 粘贴 + `\=` 保真）、主题清单、工作区拖入、宿主 `__asset` 路径、TOC 渲染与预览、全局搜索、工作区删除候选回退、公式与高亮露出（mathReveal）、主题单选键盘、只读查找条、字数面板焦点、删除确认文案、撤销入口、手打链接、CHANGELOG 区间、批注卡键盘（noteA11y）
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

当前 0.32.1，Windows + macOS 桌面应用：C# WebView2 宿主（`host/`，Windows）与 Swift/AppKit/WKWebView 宿主（`host-mac/`，Universal：arm64 + x86_64，macOS 13+）加载同一份 `dist`；per-user NSIS 安装包与便携 zip、macOS zip 在 `release/`（不进版本控制，打包脚本在 `packaging/` 与 `host-mac/build.sh`）。文件树、可折叠大纲、状态栏字数明细（点字数看中日韩字/拉丁词/合计/字符/句/段/阅读时间与选区计数，打开后焦点进面板）与随选区显示的「选区 N 字」、源码/预览/专注/打字机、页边批注与采纳、逐条追问、联网核对、长文批注定位、点正文链接就地编辑、链接与公式就地编辑、列表内 Tab/Shift+Tab 缩进、智能标点与自动配对（设置里可关）、AI 提示词拆分（格式与安全规则内置 system，设置只改作者偏好，旧 `analysisPrompt` 迁移不丢）、Esc 后焦点回正文（预览/源码/快速打开；查找框开着时一个 Esc 只关查找）、Mermaid 图表（```mermaid 围栏惰性渲染，首屏 0 B，首次见图才下载；HTML 导出与预览面板不含图；切主题会重绘，含跟随系统）、frontmatter/脚注/行内 HTML/callout/公式保真、保存前对比（含脚注定义丢失拦截，自动保存也拦）、`.sidelight` 缓存、图片插入、查找替换、字号缩放、导出、表格工具条（含表头边界拖拽改列宽）都能跑；第 44 轮补：无序列表里打 `- [ ] ` / `- [x] ` 直接建任务项、保存写回 `- [ ] `，深色主题下打印 / 另存 PDF 用浅底深字。第 47 轮补：行内 HTML 白名单渲染（`<kbd>` / `<mark>` / `<sub>` / `<sup>` 四种不带属性、成对、同一行的标签在编辑视图与预览里显示真样式，保存写回原标签、往返逐字节不变）、反引号行内代码里的 `--` / `...` / 引号 / 半角标点不再被智能标点改写、Mermaid 语法错误的图不再残留 `body` 下。第 49 轮补：命名 HTML 实体（`&nbsp;` / `&copy;` / `&hellip;`）打开→保存不再被二次转义成 `&amp;…`（按原文出现次数对照、只数代码外、`&amp;<名>;` 讲转义时该名字保守保持；表格单元格与整行 `&nbsp;` 同一路径）、`<mark>` 高亮改用新 token `--mark-bg`（浅/深/跟随系统/打印四处，与纸底距离 53.3 / 57.2）、代码块字号 12.72 → 15.3 px（不低于行内代码 14.79 px）、Mermaid 错误提示改走 `--danger`（深色 3.03:1 → 6.92:1）、查找条与表格工具条 7+7 个按钮 `min-height: 24px`、中文上下文里 `--` 出 `——`（紧邻汉字才出，空格隔开的 `甲 -- 乙` 仍是一个 `—`）。第 51 轮补：没有改动时 `Ctrl+S` 不写盘、也不再整篇读回旧文件（提示「没有改动，未写入。」）、整页缩放（`Ctrl+滚轮` 50–200%，`Ctrl+=` 仍是正文字号，两层不互吃）与视图四钮 `aria-pressed`。第 52 轮补：1 MB 多节点文档载入 110.9 s → 2.9 s（新增 `src/lib/markdownFastPath.ts` 给表格与任务列表 tokenizer 加 O(n²) 守卫，不加依赖）、`F11` 进出全屏（宿主 `ContainsFullScreenElementChanged` + `IsZoomControlEnabled = false`，WebView2 原生缩放不再与应用内缩放双轨）、表格单元格里手打 `# `/`> `/`- ` 不再造块级节点（`src/lib/tableScope.ts` 的 `typingBlockMarkerInCell`，保存仍是字面标记）。第 54 轮补：拖入 `.md` / 文件夹直接打开（脏文本先问「切换文档」）、整页缩放 130% 起不再横向溢出且状态栏显示「缩放 N%」（`Ctrl+Shift+=`/`-`/`0` 给提示，`Ctrl+=` 仍是字号）。第 55 轮补：设置里可开快捷行内语法 `==高亮==` / `^上标^` / `~下标~`（默认关，写回逐字节不变，`<mark>` 等四个标签仍归行内 HTML 白名单）、内置主题「暖纸」（`data-theme='sepia'`，清单在 `src/lib/themes.ts`）。第 56 轮补：行内语法加定界符守卫（`====`、`^^` 这类连续段与空格旁的单侧符号按字面）、逐键不再做全文序列化（1 MB 逐键 p50 226 → 148 ms，脏标记改成停顿 300 ms 后与保存基线比对）。第 57 轮补：宿主单文件文档的相对图片经 `/__asset` 显示（只回文档目录内 png/jpg/jpeg/webp/gif/bmp，越界与 `../` 403、不加 CORS 头）、暖纸弱文字 `--ink-faint` 提到 AA（paper 4.80 / panel 4.54）、设置面板页脚加分隔线。测试 40 个文件 524 条。第 58 轮补：智能标点不再改写链接目标与行内 HTML 标签属性里的直引号（`inLinkDestOrHtmlTag` 整键放行），正文单独一行 `[TOC]` 出目录、点条目跳标题、`\[TOC\]` 保存字节不变。第 59 轮补：`Ctrl+Shift+F` 全局搜索（工作区跨文件、懒加载对话框不进首屏、最多 200 条、>1 MiB 与读不到的文件跳过并在提示里说明）与文件侧栏「树 / 列表」两态（列表态平铺 + 相对路径，无右键菜单）。第 60 轮补：搜索 0 命中仍报跳过文件、同 tick 双 Enter 有同步闸门、点中当前文档的命中不再整篇重载（滚动位置与撤销历史保留）、发布预检按 setup FileVersion 判 Fail。第 61 轮补：TOC 逐键按事务判定重建（正文只映射位置，命中标题或 `[TOC]` 区间才重建，停笔 300 ms resync）、TOC 进只读预览且编辑视图收起标记行（光标进入才露出）、文件列表态 roving tabindex 与 `role="list"`、暖纸 `--ink-faint` 调到 `#6f6047`。第 62 轮补：TOC 的段落判定改整段口径（软换行段落里夹一行 `[TOC]` 不再把其余文字藏掉），已打开文档里手打 `[TOC]` 立即出目录（`tocShouldRender` 只挡「原文标记行全被转义」）。第 63 轮补：停笔不再先写整份草稿（两个草稿计时器 800 → 2,500 ms，自动保存成功即停表推代际），1 MB 停笔一次只写一份全文。第 64 轮补：源码模式不再卸载编辑器（编辑块 `hidden` 常驻 + `.source-hidden` 收成 0 尺寸），1 MB 进/退源码 p50 9.8 s/2.1 s → 1.2 s/0.3 s，进出保留阅读位置；侧栏大纲跟随当前章节滚动（越界才滚）。第 65 轮补：大纲改树语义（`role="tree"`/`treeitem`/`aria-level`/`aria-expanded`，roving tabindex）并支持 ↑/↓/Home/End/←/→/Enter。第 40 轮补：单波浪号 `H~2~O` 与 `<!-- 注释 -->` 打开→保存逐字节不变（`~~删除线~~` 仍生效，围栏/行内代码/引用块围栏/公式里的 `~` 不动）、只读预览恢复正文排版（36rem 限宽、表格边框、引用边线，与编辑态同字号）、连续空段落不再写 `&nbsp;`、窗口/标签标题始终跟随当前文档。第 41 轮补：正文、围栏与行内代码里的 `<` `>` `&` 打开→保存逐字节不变（单遍实体解码 + `&amp;` 前视守卫 + 块首 `&gt;` 守卫）、查找条加「区分大小写 / 整词」两个开关（`Aa`/`ab`，会话内）、切换/关窗确认框与设置面板开着时自动保存不写盘。第 42 轮补：预览（只读）视图里查找替换整体锁住（与源码模式同一语义，命中计数不再显示）、正文里按 `Esc` 把焦点移到正文之后的状态栏字数入口（正向出口，组合输入期间不夺焦）、工具栏格式按钮有 `aria-pressed` 与按下态、表格工具条删除三项用危险色并与插入组分开、正文焦点指示线钉在滚动容器（`docs/iteration/round-42/test.md`）、退出源码不再整篇重解析（`sl-parse-done` 不增加）＋ 三个全文 repair 加精确守卫 ＋ 保存链补 10 条单测。CI 有 Linux gate、Windows 宿主与安装包、macOS 宿主三组 job，Windows/macOS 宿主已转必过；发布走 `.github/workflows/release.yml`（tag `v*` 或手动 `tag` + `publish`）；macOS 默认 ad-hoc，配了 Apple secrets 时同一条流水线签名 + 公证并重打 zip；`install-verify` 仍只手动触发。第 66 轮补：源码模式的改动也参与停笔自动保存与停笔草稿（草稿三支抽成 `scheduleDraft`，源码态 `>256 KiB` 不再只有内存一份），`scheduleAutoSave` 用同步 ref 去重，1 MB 源码打字 p50 2,810–2,818 ms。第 67 轮补：1 MB 源码改字退出先绘「正在应用源码改动…」遮罩（`position:fixed` 盖视口、`data-source-applying`、`role="status"`），双 rAF + `setTimeout(0)` 后才 `applySource`；点击→遮罩 101–107 ms、4.1 s 长任务排在遮罩帧之后、总 4.44–4.55 s。第 68 轮补：源码改字后 2 s 内退出只写一次盘（`performCommit` 前清草稿计时器 + 推代际）、源码态组合输入不写盘（`sourceComposingRef` + 有界 60 s + blur/退出清零 + 源码态草稿门）、快速打开焦点困锁（`useDialogFocus` + App Esc 链 + `closeQuickOpen` 分派焦点 + 输入框焦点环）。第 69 轮补：源码态组合输入另外两个出口——`Ctrl+S` 提示「先完成候选字，再保存。」且 0 写；退出源码先 `blur` + 等 `compositionend`（≤300 ms）再读现值，只有候选字丢了才拦退。第 70 轮补：删除正在编辑的文件时，「下一个」候选读不出（>5.5 MiB 或读失败）不再中断删除——`fallbackTargets`（`src/lib/workspace.ts:367`）按删除前的树快照取候选（先往后、再往前、去重、上限 3、不回绕），`removeFile` 逐个 `readNode`、读不出就跳过，全部读不出才退回空白 `未命名.md`（提示带失败名），「已移到回收站」与「撤销」始终出现。

新建与另存为已能走完「新建 → 写 → 保存 → 再打开」：顶栏「文件」菜单（新建/另存为/关闭文档/打开文件/打开文件夹）、文件树头「＋ 新建文件」、首次启动是一篇空的 `未命名.md`、有工作区且无句柄时 `Ctrl+S` 直接在根目录建 `未命名.md`/`未命名 2.md`（显式另存为仍走系统 picker）、保存成功有持久提示；双击 `.md` 由宿主打开后可直接写回原文件（宿主 `/__doc` + `postMessage`，原子替换，编码/换行保留）；`.md` 只加「打开方式」候选（安装时 opt-in、默认不勾、不改默认程序）；宿主文档有草稿兜底（`draft-save` 写 `.sidelight/drafts/`，`/__draft` 只读），关窗有未保存改动时问「取消 / 存草稿 / 丢弃」；宿主记住最近 8 篇（`/__recent` 只回哈希 id，可清除/撤销/移除）；没动过的表格整块写回原文；含引用式链接定义的文档默认源码模式打开；KaTeX 惰性加载（首屏 gzip **309,074 B**，预算内部 310,000 B / 硬线 320,000 B，距硬线余 10,926 B、距内部预算余 926 B）；保存成功后不再写陈旧草稿（停计时器 + 推进代际），超过 5.5 MiB 的文件被拒时提示说清「仍在哪一篇」；文件树右键可删除（移到工作区 `.sidelight/trash/`），撤销恢复原内容（含删除前的未保存改动），同目录重命名（只接受 `.md`/`.markdown`，目标存在拒绝，缓存迁新键，最近记录不迁移）；侧栏页签支持键盘切换（`tablist`），文件树有展开态与空文件夹提示；重开恢复上次文件夹/文件/批注（IndexedDB 只存句柄，权限三态，失败退化为最近打开）；Typora 式快速键（Ctrl+K/M/P、Ctrl+1–6/0、Ctrl+/、表格 Tab/Ctrl+Enter、列表 Tab/Shift+Tab 缩进、侧栏 Ctrl+Shift+1/3/L）；搜索支持 Tavily/博查/DeepSeek；不能移动/复制/删目录，无应用内恢复。未验：中文输入法（浏览器与宿主）、真模型与真实搜索接口（无 key）、安装后的 HKCU 卸载项/开始菜单/真人双击/SmartScreen、WebView2 缺失分支（仅静态检查）、写回（文件占用/只读/网络盘/中文路径/真人双击）、勾选关联后「打开方式」是否出现与卸载是否残留、真人交互安装、数据保真拦截的真实文档样本、真实 Alt+F4/注销/关机下的关窗、真实 IME 组合输入下的关窗、`save-draft` 写失败（只读目录）的可见错误路径、真人重启后的最近列表、`recent.json` 写失败、网络盘失效、卸载保留 `%LOCALAPPDATA%\Sidelight`、日志迁移、表格复用只保证行内字节、真实宿主源码保存字节、真实 WebView2 冷启动、离线时 KaTeX chunk 失败、CLI 下 `npm test` 看不到 alias、文件树删除的真人右键与确认框、从 trash 手动恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除同一文件、真人右键重命名与确认框、大小写两段式失败后的临时名、网络盘/OneDrive 占位文件下的改名、macOS 真机（本机是 Windows，未运行过）、WKWebView 下的真实 IME 与拖放、真实 Intel Mac 运行、Rosetta、真实签名/公证、图标真机显示、⌘C/⌘V/⌘Z、P2 延后项（骨架 role/aria-busy、批注卡 Enter 跳句、正文开头 Tab 回环）、memo/B4/B5/2 MB 进度条、1 MB 逐键跨窗口可比性（100 KB p50 38 / p95 39 ms、1 MB p50 148 / p95 159 ms 已测，见 B-116；1 MB 载入 2.9 s 已测）、宿主 WebView2 窗口里的 `/__asset` 相对图渲染（本机 `INIT-FAIL`，只验了端点）、真实重开权限、150%/200% 缩放屏、缩放下 `.source-hidden` 与源码态切换、真实屏幕阅读器播报大纲 `tree`/`treeitem`（只验 DOM 语义）、宿主 WebView2 内 1 MB 进出源码与滚动还原、真实 FSA 与超长文档下的大纲跟随、真模型提示词质量、真实 DeepSeek 搜索（无 Key）、macOS 快捷键、旧会话已丢弃批注不可恢复。质量报告里的 22 条问题已全部修完（见 [质量报告](docs/qa-report.md) 顶部）；对 Typora 的差距见 [差距表](docs/typora-gap.md)，当前 42 项有、3 项缺。

第 72 轮只侦察（5 路 0 个新 P0/P1，按 v3 收工）；第 73–74 轮按产品负责人指定的 3 个用户问题重开两轮：任务项行高与普通列表一致（50.14 → **33.14 px**，复选框中心与首行文字中心差 7.5 → **0.06 px**，`src/styles.css` 的 `ul[data-type="taskList"] li > div > p{margin:0}` 与 `li > label` 的 flex 居中）；`[TOC]` 标记段**相邻即露**（`src/lib/tocRender.ts` 的 `revealedIndex` 收 `doc`/`from`/`to`，紧邻前块末尾或后块开头也加 `is-revealed`，`!docChanged` 时只算露出集合）；行内/块级公式**选中即露源码**（新增 `src/lib/mathReveal.ts`：`Decoration.node` 落在 NodeView 外层，`::after` 画 `$…$` / `$$…$$`，同一 `DecorationSet` 复用）；`==高亮==` 的定界符复用同一工厂（`collectEqRanges` 合并 mark 相邻区间、`Decoration.inline` + `::before/::after`，第 74 轮）。Typora 的解析/渲染/源码保真机制写在 `docs/iteration/round-73/typora-mechanism.md`（`frame.js` 偏移为证）：Typora 把 `==`、`$` 与块级原文留在 DOM 文本层、靠 `md-expand` 切源码，本仓库对应物是「装饰画源码、保存仍走序列化」。首屏 **303,043 B**、测试 **41 文件 536 条**。UNVERIFIED：Typora 主题 CSS 里 `.md-meta` 的显隐选择器（参考目录 54 个 CSS 无 `md-meta`，只由类切换推断）；1 MB 移动选区实测比基线慢 216 ms（夹具无公式、无 `==`，无机制证据，只记数值）。

第 75–86 轮（12 轮，首轮 75）是 P2 清理批：先修用户点名的 3 条回归（B-157 取消公式编辑仍露 `$…$`、B-158 `==高亮==` 默认关导致失效、B-159 行间公式排版），再按 3 条一小批把 BACKLOG 的 35 条 P2 全部改成 `fixed`（回滚 0 条）。主要落点：行内语法手打即渲染（B-214）与粘贴也渲染（B-215）、`\=` 保存保真（B-213）、手打链接存真链接（B-124）、HTML 导出带目录锚点与三条行内语法样式（B-134/B-216）、批注卡可聚焦并按 `Enter` 跳句（B-141）、删除撤销入口常驻状态栏（B-142）、替换提示（B-211）、设置分节折叠（B-150）、宿主 `host/bin/www` 镜像脚本（B-126）、CHANGELOG 区间机械门（B-140）。首屏 **306,276 B**、测试 **51 文件 659 条**、差距 39 有 / 6 缺。UNVERIFIED：CDP 9222–9226 全程无监听（真机断言走 ego 浏览器 CDP 54280，沿用第 79 轮口径）；原生打印/另存 PDF、真 WebView2 宿主、真实中文 IME 未跑；`scripts/keyboard-acceptance.mjs` 硬走僵尸 5173、`scripts/draft-acceptance.mjs` 仍按 800 ms 防抖断 T1（现 2,500 ms），两条既有脚本过期未修。

下一步写在 README 末节。改完状态就更新那一节，别另开地方。

## 7. 交接

收工改三处：README 的「现在能做什么」与「现在不能做什么」、CHANGELOG 当次条目、被推翻的 ADR；轮次结束由根代理更新 `docs/iteration/STATE.md`。做不到的事写清楚原因，别留给下一个人猜。

发现池在 `docs/iteration/BACKLOG.md`（P0/P1/P2/deferred）。P2 可以之后一点点完善，不阻塞停止。

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
- **1 MB 文本挂进 `<textarea>` 本身就是 0.5–1.7 s 的原生排版**：第 53 轮实测同一 1 MB 文本 `<textarea>` 仅布局就要 486–1,527 ms（`wrap=off` 486 ms），同文本 `<pre>` 只 153 ms；`contain` / `spellcheck` / `wrap` 都降不下来。把「1 MB 切源码 ≤300 ms」当目标就必须换源码显示方式（虚拟化或非 textarea），靠优化卸载/隐藏到不了。该轮返修未达门槛已回滚，数值留作下次 B-115 的基线。
- **`hidden` 收起布局后 `scrollTop` 归零，且 `focus()` 引起的滚动排在 rAF 之后**：要把阅读位置还原就得查两次 rAF——只查一次时 100 KB 绿、1 MB 红（第 53 轮实测，易假绿）。
- **预览面板根节点也带 `.ProseMirror` 类**：数「预览里没有编辑器」要写 `.ProseMirror:not(.preview-pane)`，直接数 `.ProseMirror` 会得到 1 条假红（`src/components/PreviewPane.tsx:79`，第 53 轮）。
- **dev server 的 Vite transform cache 对 `/src/styles.css` 不失效**：第 54 轮实测磁盘与 `dist/assets/*.css` 都已是新规则，`GET /src/styles.css`（含旧 `?t=<mtime>`）仍回旧字节，`?x=1` / `?direct` 才是新内容；WS `vite:invalidate` 两种 payload 都无效。判「CSS 改动没生效」前先比 dev server 交付字节；touch 该文件即恢复（不必重启），或 `<link href="/src/styles.css?direct">` 复挂。
- **`requestLoad` 的成功提示必须放在 `await` 之后**：`loadIntoEditor` 会 `setNotice(null)`，先 `show()` 的 toast 立刻被清掉，看起来像「打开没有反馈」（第 54 轮）。
- **`FileSystemHandle` 不能按 `kind` 收窄，合成的 `getAsFileSystemHandle()` 会 reject**：句柄变量要声明成 `FileSystemFileHandle | FileSystemDirectoryHandle | null`（否则 TS2740/TS2739）；合成 `DataTransferItem` 的那次调用返回 reject 的 Promise，取值必须 try/catch 并判 `.then`，`undefined` 与 reject 都当「没有句柄」（第 54 轮）。
- **`@tiptap/markdown` 复用全局 marked 单例，`marked.use()` 的行内 tokenizer 是 unshift**：同进程多个 manager 的 `use()` 会累积（带闸门的 tokenizer 会串味，单测只能一个 manager + 可变闸门）；后注册的排不到先注册的前面，`loneTildeText` 必须和新增 tokenizer 放同一次 `use()`、且数组第一个（第 55 轮）。
- **marked 17 的行内扩展每轮拿到的是「当前位置起的剩余串」**：`start()` 收到 `src.slice(1)`，返回下标要 +1 才是候选位，所以 `^` 锚点落在位置 0 时左向断言恒真——行内定界符的 flanking 只能做右侧，左侧靠「连续符号整段按字面吃」的守卫（第 56 轮）。
- **按「末尾标记」等 1 MB 载入会假阳**：`waitForFunction` 等的那串标记在上一档文档里也存在，立即满足；测载入必须从空白页载入并等 `sl-sync-done`（第 56 轮 perf 脚本实测）。
- **WebView2 初始化失败时 `RunErrorForm` 会挂住宿主进程**，第二次 spawn 被单实例 mutex 转发后即退，CDP 永远连不上；判宿主没起来先看 `host/bin/host.log` 的 `INIT-FAIL`（本机 `0x8000FFFF`），此时 loopback 仍可服务、`/__asset` 之类的端点结论仍有效。另：`$out = & Sidelight.exe --version` 不捕获输出（winexe 无控制台），要用 `| Out-String` 或 `cmd /c "... > file"`（第 57 轮）。
- **`.status-chip-quiet` 开局不存在**：要有选区/元数据/宿主文件名才出现；E2E 要先点段落、打字、`Shift+Home` 造选区，否则断言恒 missing（第 57 轮）。
- **性能门槛写成「≤ 改前基线的 N%」时，先确认改前基线不是 0**：第 61 轮 B-129 的 1 MB 档改前差本来就是 0 ms，「≤ 0 的 60%」字面不可达，tester 只能判门槛退化、记 UNVERIFIED。定门槛前先量改前值，差为 0 就换成「绝对值 + 机制单测」两条证据。
- **TOC 的隐藏不能只靠 CSS 给段落挂类**：第 61 轮用 `Decoration.node` 挂 `toc-source`，再按选区是否落在该段加 `is-revealed`（光标进入露出、可 Backspace 删除）；只隐 `<p>` 而不做 `is-revealed`，光标进那段就没有可见落点，用户改不了标记行。同理，预览面板的目录要另建一份（`tocActive` 由 `hasTocMarker` 给），别指望编辑器装饰跨到预览。
- **`.source-hidden` 要 `display:grid !important` + `min-height:0` + `padding:0` 三件套**：第 64 轮只写 `display:grid` 时被全局 `[hidden]{display:none!important}` 盖过，隐藏块又被 `min-height`/`padding` 撑回 272 px，看起来像「源码态没省时间」；三件套齐了才真收成 0 尺寸。常驻的只有编辑块，退出源码仍整块卸载预览。
- **1 MB 进源码的主力 long task 是卸载编辑器，不是 textarea 排版**：第 63 轮实测每轮第一条 long task 8.6–9.1 s（44,446 块被卸载），`wrap="off"` 只动 textarea 的 ~0.5 s（7 轮 p50 9,883 → 9,867，−0.16%）→ 按规则回滚；第 64 轮改「源码态保留编辑器」才把 p50 压到 1.2 s。判收益先看每轮第一条 long task，别把 ±300 ms 轮间噪声当优化。夹具每行都短时 `scrollWidth` 不会超 `clientWidth`，验横向滚动要另造单行 4,000 字的文档。
- **大纲改成 `role="tree"` 后折叠钮要 `tabIndex=-1` + `aria-hidden`，但 `aria-label` 必须留**：折叠钮进 Tab 序会让「51 条目 = 62 个 Tab 站」重现；删掉 `aria-label` 后 B-137 的 E2E 与鼠标路径按它找钮会 0 命中。折叠隐藏的是子行、被折叠的父行仍在（单测写成整行消失会红）；大纲页签按一次 Tab 就落首条 treeitem（文件树 `inert`），再按一次才离开 `.outline`。
- **Vite 会交付 App.tsx 的「混合版本」**：第 62 轮 `GET /src/App.tsx` 同时含新 import 与旧函数体，页面白屏 `hasTocMarker is not defined`，而磁盘与 `dist` 都是新代码；`(Get-Item src/App.tsx).LastWriteTime = Get-Date` 即恢复，不必重启。另：PowerShell 的 `*>` 在本机写 UTF-16LE（`ff fe`），node 读要 `toString('utf16le')`；`Out-File -Encoding utf8` 才是带 BOM 的 UTF-8。
- **源码态逐键排程不能先 `cancel` 再置 `true`**：那样每键多一帧 App 渲染（1 MB 每帧含 `countText`），1 MB 源码打字必红；要用同步 `autoSaveScheduledRef` 去重（第 66 轮）。
- **1 MB 重解析后编辑块摘掉 `hidden` 还要约 400 ms**：单次 rAF 的 `focusEditor()` 落在 `hidden` 未摘时静默失效（焦点停 `body`），要按帧重试到无 `hidden` 再 `focus()` 并还原 scroll；长任务卡主线程时 CDP `Page.captureScreenshot` 等不到遮罩（实测 4.1 s 超时），改用 `Page.startScreencast` 由合成器发帧（记得 ack）（第 67 轮）。
- **判「源码 textarea 仍在组合输入」只能在 `switchView` 入口读 `sourceComposingRef`**：Esc 链在 `switchView` 后紧跟 `focusEditor()`，textarea 先被 blur；CDP `imeSetComposition` 下 blur 会派 `compositionend`，但提交的是原始串 `zhong`，不能证明真输入法行为（第 69 轮）。切视图后立刻断言旧态也会假绿——先等 `waitForSelector('textarea.source-editor', { state: 'visible' })`（第 68 轮）。
- **提示气泡的类名是 `.toast` / `.toast-text`（`role=status`），不是 `.notice`**：按后者取文案恒空，会把「有提示」判成假红（第 69 轮）。
- **删除文件后的「下一个」候选要取删除前的树快照**：`removeFile` 在 `refreshTree()` 之后现算 `flattenFiles[index-1]` 会落错（被删项已不在树里），必须用删除前快照并排除被删 path；候选要逐个 `readNode`、读不出（>5.5 MiB 或抛错）就跳过，别让一个坏文件吞掉「已移到回收站 + 撤销」（第 70 轮，B-152）。
- **假 FSA 的 `getDirectoryHandle` 要按目录真实存在返回**：fixture 只认 `.sidelight`/`trash` 时，删子目录文件会让 `parentForPath` 抛 `NotFoundError`、toast 成「删除原文件失败」，误判产品删除失败；按 `files` 键前缀 `path + '/'` 判存在。另：列表态 `.tree-file` 不在 DOM，`snapshot().tree` 恒空，核树恢复要先切回树态（第 71 轮）。
- **公式 atom 的 NodeView 带 `contenteditable=false`，纯 `→` 会跳过它**：行内公式要 `Shift+→` 拉出选区、块级公式要 `↑`/`↓` 成 `NodeSelection`，才进得了 `Decoration.node` 的露出判据（第 73 轮）。`Decoration.node` 只对节点有效，对文本无效——`==高亮==` 是 mark，要用 `Decoration.inline` 收文本节点并**合并相邻区间**（`==a**b**c==` 是三个 text 节点，`mathReveal.ts` 的 `collectEqRanges`，第 74 轮）。
- **测「露出」类装饰别拿 `docChanged` 当唯一判据**：同一文档换选区 10 次必须拿到同一个 `DecorationSet`（`mathReveal.test.ts` 有这条），否则每次按键都在重建；`sl-parse-done` 增量只证明没重解析，证不了零重建。对照组重载后要先点进正文再按 `Ctrl+End`——焦点不在编辑器时它不动选区，新字落在文首，字节比较会假红（第 74 轮）；定位带 `==` 的段落别用 `innerText` 找 `==`（解析后是「前 高亮 后」），改按「高亮」定位。
- **tiptap `markInputRule` 的 match 必须带 `replaceWith`**：第 84 轮 B-214 的 `typedMatch` 只回 `{index,text}` 时整条规则空转——不报错、不转换，看起来像「输入规则没挂上」；补 `replaceWith` 才生效。单测要按「光标状态喂前缀」验，只验解析会漏。
- **`markPasteRule` 与输入规则共用同一份守卫**：第 86 轮 B-215 把 `typed` 的守卫复用成 `pasted`（去掉尾锚定），围栏内靠 `spec.code` 提前 return、行内代码内靠 excluded 守卫；两条已知残余别当回归——粘贴段紧邻已有 `=`（`x =` 后粘 `==红==`）看不到前一字符，`Input.insertText` 路径不转。
- **`changelog.test.ts` 是机械门：写第 N 轮小节后必须同步标题上界**：第 85 轮新门断「标题区间上界 = 正文最大轮次」，收尾写新小节却不同步标题会 1 红（报文会同时给出两个轮次）。
- **`npm run build` 链尾挂了 `scripts/host-www.mjs`**：构建会把 `dist` 镜像到 `host/bin/www`（先拷全部、`index.html` 最后，全成功才删多余；任一边缺失则跳过并 exit 0）。别手工编辑 `host/bin/www`，下一次构建会覆盖。
- **导出样式改一处要过两道门**：`export.test.ts` 既断 `STYLES` 里的声明值，又读 `src/styles.css` 做漂移门——只改导出不改 CSS（或反之）会红。

