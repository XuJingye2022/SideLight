# Typora 0.11.18 可借鉴交互研究报告

- 日期：2026-11-16
- 样本：`D:\Downloads\Typora_Free_Download-0.11.18\typora_0.11.18_64bit_setup.exe`（只读，未安装到系统）
- 解包位置：`.tmp/typora-ref`（375 个文件，217.6 MB）
- 证据截图：`shots/typora/`（只截屏，未复制图标、主题、代码）
- 范围：只记录可借鉴的行为与键位。不做代码或资源移植。

## 1. 技术栈与关键文件

结论：**Electron 13.6.1（Chromium 91）**，不是 CEF，也不是系统 WebView。安装器是 **Inno Setup 6.0.0**（setup data 6.0.0），所以 `7z` 不能解；本机无 7z，改用 `innoextract 1.9` 解包。没有静默安装，没有改系统关联。

| 文件 | 大小 | 作用 |
| :--- | :--- | :--- |
| `app/Typora.exe` | 130 MiB | Electron 主程序（x64，FileVersion 0.11.18） |
| `app/version` | 6 B | `13.6.1`，Electron 版本 |
| `app/resources/app.asar` | 189 KB | 主进程 JS（`atom.js`、`License.js`、`menu.js`、`WindowController.js`；内容是加密/混淆的） |
| `app/resources/app.asar.unpacked/main.node` | 600 KB | 主进程原生入口 |
| `app/resources/lib.asar` | 6.1 MiB | 第三方库（含 CodeMirror、Mermaid、MathJax 等） |
| `app/resources/node_modules.asar` | 10 MiB | Node 侧依赖 |
| `app/resources/appsrc/window/frame.js` | 1.5 MiB | 渲染层主体脚本 |
| `app/resources/window.html` | 82.6 KB | 主窗口 DOM（侧栏、大纲、搜索、模板都在里面） |
| `app/resources/page-dist`、`style/themes` | — | 偏好设置页与内置主题（未使用） |
| `app/resources/Docs/*.md` | 17 篇 | 官方内置文档（Markdown Reference、Table Editing、Quick Start 等） |

补充事实：控制台输出 `MathJax is loaded, but not yet initialized`。**0.11.18 的公式用 MathJax**，不是 KaTeX。Mermaid 内置，直接渲染。源码模式基于 CodeMirror（左栏行号、语法高亮）。

## 2. 运行方式与限制（重要）

安装目录可以直接跑，但有三个坑，都来自实测：

1. 本机环境变量 `ELECTRON_RUN_AS_NODE=1`。不清理时 Typora 被当成 Node 运行，报 `bad option` 后退出码 1。
2. 必须给独立配置目录：`Typora.exe --user-data-dir=<目录> <文件>`。不给时会因 `SingletonLock` 失败而**静默退出（码 0）**，不弹窗。
3. 0.11.18 是过期 beta：`License.js` 会写 `InstallDate` 并校验。首次运行（全新 user-data-dir）能正常开窗；复用旧 profile 时可能十几秒后自行退出。这是版本的时间炸弹，和我们要研究的行为无关。

结论：**能跑，能截图，能实测键位**。但自动化注入的 Enter/Esc 语义与真人按键不完全一致（见第 8 节），个别交互标 UNVERIFIED。

## 3. 对写作者最有用的功能（12 项）

| # | 功能 | 实测观察 | 证据 | Sidelight 现状 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 实时预览 | 行内样式边打边渲染；块级在 Enter 或失焦后渲染；标记符号在光标进入时才显形 | `01`、`02` | 已有 |
| 2 | 文件树 / 文件列表 / 大纲 | 侧栏顶部两个页签「文件 / 大纲」；文件侧栏可切「文件树 / 文件列表」两种形态；大纲带当前章节高亮 | `67`、`06`（菜单）、`91` | 已有树与大纲，不能切列表形态，不能折叠大纲 |
| 3 | 源码模式 | Ctrl+/ 整窗切换，左侧行号、语法高亮，底栏按钮变成「退出源代码模式」 | `61`、`39` | 有，但无键位 |
| 4 | 专注 / 打字机 | F8 专注：非当前段压暗，顶部出现提示条「专注模式已开启 / 可以在 视图 菜单中关闭」，带「不再显示」勾选 | `65`、`66` | 已有，无提示条 |
| 5 | 表格 | 输入表头行再 Enter 即建表（文档）；表头悬浮工具条、可拖拽调列宽、Tab 走格、Ctrl+Enter 加行（文档） | 文档 `Docs/Table Editing.md` | 有工具条，无键盘走格/加行 |
| 6 | 图片 | 粘贴或拖入；可设相对路径、`./assets`、`${filename}.assets` 三种落盘规则；可经 PicGo 上传 | 设置页文案 | 已有插入与 `assets/`，无落盘规则选择 |
| 7 | 数学公式 | 新行输入 `$$` 再 Enter 直接得到块级公式框，顶部工具条「公式」浮出；渲染用 MathJax | `81`、`02` | 已有，`$$`+Enter 行为一致 |
| 8 | 链接 | Ctrl+K 不开模态框：原选区变成链接文字，就地叠一个 URL 输入位（`[]()` 形式） | `50`、`30` | 有「点链接弹编辑框」，没有「选中文字按 Ctrl+K 变链接」 |
| 9 | 查找 | Ctrl+F 在**窗口顶部拉一条通栏查找条**，含 Aa 大小写、整词、上下箭头、关闭 | `63` | 已有查找替换面板，位置与形态不同 |
| 10 | 快速打开 | Ctrl+P 弹出「按文件名查找」浮层，列出文件名 + 完整路径，输入即过滤 | `64` | 无 |
| 11 | 导出 / 导入 | 文件菜单「导出」二级菜单：PDF / HTML / Word 等；依赖 Pandoc；打印 Alt+Shift+P | `03`（菜单）、设置页文案 | 有 HTML/Markdown/纯文本/打印，无 Pandoc 链 |
| 12 | 字数 | 状态栏右下「186 词」「9 / 195 词」随选中变化；偏好里可永远显示 | `01`、`02`、`03` | 已有字数与阅读时间 |

附带观察：frontmatter 在预览里显示成 YAML 代码块（不是隐藏）；脚注、引用式链接定义、Mermaid 流程图都直接渲染；状态栏左下角是「源码模式」图标。这些 Sidelight 大多已有或按设计不同（frontmatter 单独保存）。

## 4. 键盘表（Windows）

来源优先级：菜单截图（`03`、`06`）> 实测 > 内置文档。`UNVERIFIED` 表示没在本次跑通。

| 动作 | 键位 | 验证 |
| :--- | :--- | :--- |
| 新建 / 新建窗口 | Ctrl+N / Ctrl+Shift+N | 菜单 |
| 打开 / 打开文件夹 | Ctrl+O / 菜单项 | 菜单 |
| 快速打开 | Ctrl+P | 实测 `64` |
| 保存 / 另存为 | Ctrl+S / Ctrl+Shift+S | 菜单 + 实测 `70` 另存为对话框 |
| 打印 | Alt+Shift+P | 菜单 |
| 偏好设置 / 关闭窗口 | Ctrl+, / Ctrl+W | 菜单 |
| 查找 | Ctrl+F | 实测 `63` |
| 源码模式 | Ctrl+/ | 实测 `61` |
| 专注模式 / 打字机模式 | F8 / F9 | 实测 `65`、`66` |
| 全屏 | F11 | 菜单 |
| 显示/隐藏侧边栏 | Ctrl+Shift+L | 实测 `67` |
| 大纲 / 文档列表 / 文件树 | Ctrl+Shift+1 / 2 / 3 | 菜单；`1` 部分实测 |
| 侧栏搜索 | Ctrl+Shift+F | 菜单 |
| 放大 / 缩小 / 实际大小 | Ctrl+Shift+= / Ctrl+Shift+- / Ctrl+Shift+9 | 菜单 |
| 应用内窗口切换 | Ctrl+Tab | 菜单 |
| 开发者工具 | Shift+F12 | 菜单 |
| 标题 1–6 / 正文 | Ctrl+1…6 / Ctrl+0 | Ctrl+1 实测（`63` 变 H1）；2–6、0 按官方文档 |
| 插入行内链接 | Ctrl+K | 实测 `50`（就地 URL 输入位） |
| 块级公式 | 空行输入 `$$` 再 Enter | 实测 `81` |
| 行内公式 | `$…$` | 文档；本次被块级公式吞并，UNVERIFIED |
| 表格：建表 / 走格 / 加行 / 删行 | 表头行 + Enter / Tab / Ctrl+Enter / Ctrl+L | 文档；本次未跑通，UNVERIFIED |
| 粘贴为纯文本 / 复制为 Markdown | Ctrl+Shift+V / Ctrl+Shift+C | 内置 Quick Start，UNVERIFIED |

焦点顺序观察：菜单栏 → 编辑区；侧栏用快捷键直达页签，不靠 Tab 循环。查找条出现后焦点在输入框，Esc 关闭并把焦点还给正文。链接与公式都是**就地浮层**，不打断正文焦点。

## 5. 与 Sidelight 对比

### 5.1 缺失且值得做

| 能力 | 用户价值 | 成本 | 1 轮内 |
| :--- | :--- | :--- | :--- |
| Ctrl+P 快速打开（文件名模糊匹配 + 路径） | 大文件夹里少点很多次树；写作高频 | M | 可以 |
| Ctrl+K 把选中文字变成链接 | 写完再补链接是常态；现在只能点工具条 | S | 可以（需宿主放开加速键） |
| 表格键盘：Tab/Shift+Tab 走格、Ctrl+Enter 下方加行 | 纯键盘写作不离开主键区 | S | 可以 |
| 标题快捷键 Ctrl+1…6、Ctrl+0 | 比点 H1/H2 按钮快 | S | 可以 |
| 源码模式 Ctrl+/ | 现在只能点按钮 | S | 可以 |
| 侧栏直达 Ctrl+Shift+1/2/3、Ctrl+Shift+L | 大纲与文件树切换更顺 | S | 可以 |
| 字数点击展开明细（词/字符/行/选区内） | 长文进度判断 | S | 可以 |
| 大纲折叠 | 长文层级多时有用 | S | 可以 |
| Mermaid 渲染 | 技术写作刚需，Typora 已内置 | L（按需 chunk + 导出 + 清洗） | 不建议本轮 |

### 5.2 已有但更难用

| 现状 | Typora 做法 | 差距 |
| :--- | :--- | :--- |
| 文件/视图快捷键普遍是 `Ctrl+Alt+*` | `Ctrl+N/O/S/Shift+S/P/F` 直给 | WebView2 默认吞掉浏览器加速键，Sidelight 只能绕。**建议宿主设 `AreBrowserAcceleratorKeysEnabled=false`**，再回收常用组合 |
| 源码模式只有按钮 | Ctrl+/ | 差一个键位 |
| 专注/打字机静默开启 | 首次开启弹一条可关闭的提示 | 差一次引导 |
| 查找是面板 | 顶部通栏查找条 + 大小写/整词开关 | 形态差异，非功能缺失 |
| 表格只有工具条 | 键盘走格与加行 | 差键盘路径 |
| 大纲平铺 | 可折叠、可钉住 | 差折叠 |
| 另存为 Ctrl+Alt+S | Ctrl+Shift+S | 可随宿主加速键方案一起改 |
| 导出直接给格式清单 | 导出二级菜单 + 记住上次选项 | 小差距 |

### 5.3 不建议做

- **MathJax**：Sidelight 的按需 KaTeX 更轻、首屏更小。不要换。
- **Pandoc 导入/导出链**：重依赖，违反「不为一个功能引一个库」。
- **主题商店 / 自定义 CSS 主题体系**：维护面大，Sidelight 明暗已够。
- **自动更新器**：Typora 的 updater 是它自己的发布链，Sidelight 没有签名分发，不照搬。
- **原生 7 菜单栏**：Sidelight 顶栏 + File 菜单 + 快捷键对话框已覆盖；再堆菜单只增加移植成本。
- **加密/混淆 app.asar**：与研究无关，也不该学。
- **文件树 / 文件列表双形态**：一棵树够用，先做 Ctrl+P。
- **跨文件全局搜索**：`docs/typora-gap.md` 已列 P2，本轮不碰。

## 6. 优先级 Top 8

1. **Ctrl+P 快速打开**（M，可 1 轮）— 复用现有文件树索引与 `search` 模块；空查询列最近文件，输入后模糊匹配文件名与路径。
2. **表格键盘走格与加行**（S，可 1 轮）— Tab/Shift+Tab 在单元格间移动，Ctrl+Enter 在当前行下方插行，Ctrl+L 删当前行；Tiptap 表格命令已有基础。
3. **标题快捷键**（S，可 1 轮）— Ctrl+1…6 设标题级别，Ctrl+0 回正文；与现有 H1/H2 按钮共用一条命令。
4. **Ctrl+K 插入链接**（S，可 1 轮，需宿主配合）— 有选区时把文字变链接并选中 URL 位；无选区时插 `[]()`；与现有「点链接弹编辑框」衔接。
5. **源码模式 Ctrl+/**（S，可 1 轮）— 与现有四种视图互斥逻辑复用，Esc 退出。
6. **侧栏直达键**（S，可 1 轮）— Ctrl+Shift+1 大纲、2 文件列表（若有）、3 文件树、Ctrl+Shift+L 开关侧栏。
7. **字数点击明细**（S，可 1 轮）— 点状态栏字数弹出词/字符/行/选区内四项；数据已有 `wordcount` 模块。
8. **Mermaid 渲染**（L，不建议本轮）— 按需 chunk 加载，导出时保留源码，未知语法降级为代码块并提示。

排序理由：前 7 项都改动小、回归面窄、用户每天碰；第 8 项收益大但要引库、要管导出与安全，单独一轮做。

## 7. 证据截图（`shots/typora/`）

| 文件 | 内容 |
| :--- | :--- |
| `01-live-preview.png` | 首次打开的实时预览（frontmatter、标题、表格、任务、状态栏字数） |
| `02-window-maximized.png` | 最大化全文：Mermaid、代码块、块级公式、图片、脚注、引用式链接 |
| `03-menu-file.png` | 文件菜单与全部快捷键标注 |
| `06-menu-view.png` | 视图菜单：侧栏/大纲/文件列表/文件树/搜索/源码/专注/打字机/全屏/缩放 |
| `50-ctrl-k-link-field.png` | Ctrl+K 就地链接编辑（无模态框） |
| `61-source-mode.png` | Ctrl+/ 源码模式：行号 + 退出按钮 |
| `63-find.png` | Ctrl+F 顶部通栏查找条 |
| `64-quick-open.png` | Ctrl+P 快速打开浮层（文件名 + 路径） |
| `65-focus-mode.png` | F8 专注模式 + 首次提示条 |
| `67-sidebar.png` | 侧栏「文件 / 大纲」页签与大纲高亮 |
| `70-save-as.png` | Ctrl+Shift+S 系统另存为对话框 |
| `39-source-mode.png`、`41`–`48`、`71` | 早期整轮测试的补充帧 |

## 8. 未验证与已知偏差

- 自动化用 SendKeys 注入，Ctrl+K 之后 Enter 不会像真人那样退出链接编辑，导致后续输入被链接文字吞掉（`61` 里的 `[$$]` 等就是证据）。因此**链接提交键、公式退出键、表格 Tab** 标 UNVERIFIED，只记录「入口行为」。
- 跑测试时屏幕上出现过一次 `typora_0.11.18_64bit_setup.exe` 的 UAC 提示，不是本流程启动的安装（本流程从未运行安装器），也未点任何按钮；`shots/typora/8x`、`9x` 里能看到它，这些帧不作为证据。
- 未测：导出二级菜单的具体格式、图片落盘规则、Pandoc 导入、主题切换、自动保存/恢复的实际恢复路径、Mermaid 代码块编辑态。
- 0.11.18 是 2021 年的 beta，行为只作参考；新版权限与导出能力更强，不要按老版下结论。

## 9. 对 Sidelight 的两条硬约束

1. **键位先过宿主这一关**。WebView2 默认开启浏览器加速键，Ctrl+P/F/S/K 可能被浏览器层截走。要复用 Typora 键位，先在 Windows 宿主关闭 `AreBrowserAcceleratorKeysEnabled`，macOS 的 WKWebView 另行验证。宿主改动要单独一轮并回归输入法与快捷键。
2. **不要为了键位引库**。快速打开与模糊匹配可手写；表格、标题、链接都用 Tiptap 现成命令；Mermaid 是本清单里唯一需要新依赖的项，按 AGENTS 的体积底线单独评估。

调研过程中未复制 Typora 的任何图标、主题、代码或文档原文；只保留截图与行为记录。
