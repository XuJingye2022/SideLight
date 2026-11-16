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
npm test           # 测试文件与条数以 npm test 输出为准（0.30.4 记 16 个文件、213 条）：上下文、批注、大纲、字数、frontmatter、行差分、图片命名、查找、脚注、HTML、callout、导出、公式、缓存、搜索、错误文案
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

当前 0.30.4，Windows + macOS 桌面应用：C# WebView2 宿主（`host/`，Windows）与 Swift/AppKit/WKWebView 宿主（`host-mac/`，Universal：arm64 + x86_64，macOS 13+）加载同一份 `dist`；per-user NSIS 安装包与便携 zip、macOS zip 在 `release/`（不进版本控制，打包脚本在 `packaging/` 与 `host-mac/build.sh`）。文件树、大纲、源码/预览/专注/打字机、页边批注与采纳、逐条追问、联网核对、长文批注定位、链接与公式就地编辑、frontmatter/脚注/行内 HTML/callout/公式保真、保存前对比、`.sidelight` 缓存、图片插入、查找替换、字号缩放、导出、表格工具条都能跑。测试 16 个文件 213 条。CI 有 Linux gate、Windows 宿主与安装包、macOS 宿主三组 job，Windows/macOS 宿主已转必过；发布走 `.github/workflows/release.yml`（tag `v*` 或手动 `tag` + `publish`）；macOS 默认 ad-hoc，配了 Apple secrets 时同一条流水线签名 + 公证并重打 zip；`install-verify` 仍只手动触发。

新建与另存为已能走完「新建 → 写 → 保存 → 再打开」：顶栏「文件」菜单（新建/另存为/打开文件/打开文件夹）、文件树头「＋ 新建文件」、没有句柄时保存走系统保存对话框、保存成功有持久提示；双击 `.md` 由宿主打开后可直接写回原文件（宿主 `/__doc` + `postMessage`，原子替换，编码/换行保留）；`.md` 只加「打开方式」候选（安装时 opt-in、默认不勾、不改默认程序）；宿主文档有草稿兜底（`draft-save` 写 `.sidelight/drafts/`，`/__draft` 只读），关窗有未保存改动时问「取消 / 存草稿 / 丢弃」；宿主记住最近 8 篇（`/__recent` 只回哈希 id，可清除/撤销/移除）；没动过的表格整块写回原文；含引用式链接定义的文档默认源码模式打开；KaTeX 惰性加载（首屏 gzip 284,903 B ≤285,000，余 97 B）；文件树右键可删除（移到工作区 `.sidelight/trash/`），同目录重命名（只接受 `.md`/`.markdown`，目标存在拒绝，缓存迁新键，最近记录不迁移）；侧栏页签支持键盘切换（`tablist`），文件树有展开态与空文件夹提示；不能移动/复制/删目录，无应用内恢复。未验：中文输入法（浏览器与宿主）、真模型与真实搜索接口（无 key）、安装后的 HKCU 卸载项/开始菜单/真人双击/SmartScreen、WebView2 缺失分支（仅静态检查）、写回（文件占用/只读/网络盘/中文路径/真人双击）、勾选关联后「打开方式」是否出现与卸载是否残留、真人交互安装、数据保真拦截的真实文档样本、真实 Alt+F4/注销/关机下的关窗、真实 IME 组合输入下的关窗、`save-draft` 写失败（只读目录）的可见错误路径、真人重启后的最近列表、`recent.json` 写失败、网络盘失效、卸载保留 `%LOCALAPPDATA%\Sidelight`、日志迁移、表格复用只保证行内字节、真实宿主源码保存字节、真实 WebView2 冷启动、离线时 KaTeX chunk 失败、CLI 下 `npm test` 看不到 alias、`katexLazy.test.ts` 尚未挂入 `npm test`、文件树删除的真人右键与确认框、从 trash 手动恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除同一文件、真人右键重命名与确认框、大小写两段式失败后的临时名、网络盘/OneDrive 占位文件下的改名、macOS 真机（本机是 Windows，未运行过）、WKWebView 下的真实 IME 与拖放、真实 Intel Mac 运行、Rosetta、真实签名/公证、图标真机显示、⌘C/⌘V/⌘Z、P2 延后项（骨架 role/aria-busy、批注卡 Enter 跳句、正文开头 Tab 回环）、memo/B4/B5/2 MB 进度条、100 KB 与 1 MB 的逐键 p95 未测（1 MB 载入已测 1284 ms）。质量报告里的 22 条问题已全部修完（见 [质量报告](docs/qa-report.md) 顶部）；对 Typora 的差距见 [差距表](docs/typora-gap.md)，当前 21 项有、18 项缺。

下一步写在 README 末节。改完状态就更新那一节，别另开地方。

## 7. 交接

收工改三处：README 的「现在能做什么」与「现在不能做什么」、CHANGELOG 当次条目、被推翻的 ADR；轮次结束由根代理更新 `docs/iteration/STATE.md`。做不到的事写清楚原因，别留给下一个人猜。
