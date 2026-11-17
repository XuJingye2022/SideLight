# Sidelight

[![CI](https://github.com/XuJingye2022/SideLight/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/XuJingye2022/SideLight/actions/workflows/ci.yml)

你的写作，AI 在页边。左侧写作，右侧按需补光。

发布目标：面向所有中文写作者的桌面 Markdown 编辑器。现有两套原生宿主：Windows 的 **C# WebView2 宿主**（`host/`）与 macOS 的 **Swift/AppKit/WKWebView 宿主**（`host-mac/`）。逐版本变更见 [docs/CHANGELOG.md](docs/CHANGELOG.md)。下文命令里的 `Ctrl` 在 macOS 上换成 `Cmd`（例如保存是 `Cmd + S`，撤销是 `Cmd + Z`）。

## 下载

最新版本：[github.com/XuJingye2022/SideLight/releases](https://github.com/XuJingye2022/SideLight/releases)。

- **Windows**：`Sidelight-<版本>-win-x64-setup.exe`（per-user 安装包，装到 `%LOCALAPPDATA%\Programs\Sidelight`，卸载保留用户数据）或 `Sidelight-<版本>-win-x64-portable.zip`（免安装）。
- **macOS**：`Sidelight-<版本>-macos-universal.zip`，**Universal（Apple Silicon + Intel）**，要求 macOS 13+；zip 根目录里还有 `README.txt`，一个包两种芯片都能跑。

Windows 首次安装（**先看运行时**）：

- 需要 **Microsoft WebView2 运行时**：Windows 11 自带；没有时安装器会弹提示并**中止安装**（不会装出一个打不开的程序）。先装 <https://go.microsoft.com/fwlink/p/?LinkId=2124703>，再重跑安装器。
- 双击 `Sidelight-<版本>-win-x64-setup.exe`。安装包没有代码签名，SmartScreen 会拦一次：点「更多信息」→「仍要运行」。
- 默认装到 `%LOCALAPPDATA%\Programs\Sidelight`（可改）。从开始菜单启动、卸载在「设置 → 应用」；具体步骤见 [`packaging/README.md`](packaging/README.md)（开始菜单快捷方式与 HKCU 卸载项**尚未人工验**）。卸载保留 `%LOCALAPPDATA%\Sidelight`，要彻底清掉手动删。
- 校验下载：`Get-FileHash -Algorithm SHA256 <文件>`（或 `certutil -hashfile <文件> SHA256`），与 Release 页的 `SHA256SUMS-<版本>.txt` 对照。
- 便携包：解压 `…-win-x64-portable.zip`，双击 `Sidelight.exe`，同样会被 SmartScreen 拦一次。

macOS 首次打开（未签名时按系统版本二选一，**每次更新后重做**）：

- **macOS 15 及更新**：把 App 拖进「应用程序」→ 先双击一次（提示里只有「完成」是正常的）→ 打开「系统设置 → 隐私与安全性」→ 点「仍要打开」→ 再双击 App → 点「打开」。
- **macOS 13–14**：在 Finder 里右键（或按住 Control 点）App → 选「打开」→ 再点「打开」。
- 命令行去隔离（路径含空格要加引号）：`xattr -dr com.apple.quarantine "<App 路径>"`。
- 提示「已损坏，无法打开」时先别重新下载：先核对 SHA256，再执行上面的 `xattr`，仍失败再反馈。
- 校验（macOS）：`shasum -a 256 <zip 文件>`，与 Release 页的 `SHA256SUMS-<版本>.txt` 对照。
- 签名状态见 Release 说明首行：**未签名、未公证**（ad-hoc，需按上面步骤打开）或**已签名并公证**（通常不再需要额外步骤）。
- 从 0.28.1（arm64）升级：直接覆盖安装即可，数据保留；首次打开步骤要重做。0.28.1 及更早的 arm64 包只支持 Apple Silicon；不确定芯片时看「 菜单 → 关于本机 → 芯片」。

## 现在能做什么

- 左侧文件树：打开文件夹、单独打开一个 `.md` 文件。当前文档高亮。
- 重开恢复：再打开时恢复上次的文件夹、当前文件与批注（IndexedDB 只存句柄；权限需重新授予时退化为「最近打开」，授权后 `Ctrl+S` 原地保存）。恢复出来的文档只切视图不算改动，不会再问「切换文档」（第 45 轮）。
- Typora 式快速键：`Ctrl+K` 链接、`Ctrl+M` 公式、`Ctrl+P` 快速打开、`Ctrl+1–6` 标题、`Ctrl+0` 正文、`Ctrl+/` 源码；表格里 `Tab` 走格、`Ctrl+Enter` 退出表格；列表里 `Tab` / `Shift+Tab` 缩进 / 反缩进；侧栏 `Ctrl+Shift+1` 大纲、`Ctrl+Shift+3` 文件树、`Ctrl+Shift+L` 折叠。
- 侧栏第二个页签是大纲：按标题层级列出，当前章节高亮，点一下跳过去；有子级的标题前有 ▸/▾ 可折叠，当前节被折叠时高亮最外层的折叠祖先，光标回到被折叠的子节会自动展开（折叠状态只在这次会话里，不存盘）。
- 正文编辑：标题、粗斜体、删除线、行内代码、列表、引用、代码块、链接、表格、任务列表（打 `- [ ] ` / `- [x] ` 直接建任务项，保存写回 `- [ ] `，第 44 轮）；设置里可开快捷行内语法 `==高亮==` / `^上标^` / `~下标~`（默认关，写回逐字节不变，第 55 轮）。
- 智能标点与自动配对：键盘输入时直引号按上下文变弯引号、`--` 变 `—`（紧邻汉字时出 `——`，第 49 轮）、`...` 变 `…`、中文后的半角 `, ; : ? !` 变全角；左括号与开引号补右半边、光标停在里侧，有选区时用配对标点把选区包起来。`don't`、`1990's` 的撇号与 `![图](a.png)` 的图片语法保持原样；代码块与行内代码内不转换；设置里可关（默认开，旧存档读出来也是开）。收益面是西文态 / 半角态与中英混排输入。
- 工具栏：插入表格、代码块、引用、任务列表、分割线、链接；格式按钮与 H1、H2。
- 保真：打开→保存不再把正文、围栏与行内代码里的 `<` `>` `&` 写成实体（`a < b`、`A & B`、`if (a<b)` 逐字节不变，第 41 轮）；讲转义的段落写 `&lt;div&gt;` 仍是字面实体；行首与列表标记后的 `>` 保持实体，重开不会变成引用块。
- 自动保存：切换/关窗确认框与设置面板开着时不写盘，点「取消」或关掉后自动恢复（第 41 轮）。
- 视图：专注模式压暗非当前块，打字机模式把光标保持在视口中部，源码模式可编辑原始 Markdown，预览模式只读渲染全文（含 frontmatter、脚注、公式），预览与编辑同一套排版（Source Han Serif 17px/1.95、36rem 限宽、表格边框、引用左边线；第 40 轮）。四种视图互斥，进源码或预览会自动关掉专注与打字机；离开源码时先把源码写回正文，不会丢字。进源码时光标按正文光标的位置比例落位，长文里第一次击键不会插到文首；关查找框不挪光标。`Ctrl+滚轮` 整页缩放 50–200%（`Ctrl+=` 仍是正文字号，两者分层，第 51 轮），状态栏在 ≠100% 时显示「缩放 N%」、点一下回 100%，130% 起顶栏与工具栏不再出屏（第 54 轮）；`F11` 进出全屏（第 52 轮，宿主窗口内未验）。
- 点页边任一批注会选中正文里对应的句子并滚到眼前；点正文里的链接会贴着元素弹出编辑框。
- 公式：打 `$x^2$` 得到行内公式；空行打 `$$` 再回车得到块级公式。点公式就地编辑：行内展开成源码并全选、下方浮出预览；块级在原位出现输入框。
- 底部状态栏：字数、预计阅读时间、选中时的「选区 N 字」（折叠选区即消失），以及当前开了哪些视图模式。
- 拖选一段，点选区旁浮出的「分析」或按 `Ctrl + Enter`。AI 的批注落到页边，正文出现对应高亮。
- 批注分两型：**修订**带改写文字，可逐条「采纳」；**评价**只给判断，只有「知道了」。
- 选区超过约 1500 字时切段、逐段分析；段落本身超长时在段落内部按句子再切。长文的批注能覆盖整个选区，不会只出现在开头。
- 每条批注可以「追问」：就地展开对话，模型带着原文、批注与上下文回答，线程跟着批注存进 `.sidelight`。
- 每条批注可以「联网核对」：用配置好的搜索服务查一次，把带链接的出处列在卡片里。搜索服务可选 Tavily、博查或 DeepSeek 搜索（DeepSeek 的 Key 可与模型 Key 相同），用户自带 Key，默认关闭。
- 带 YAML frontmatter 的文档：元数据单独保存，拼回时逐字节一致；状态栏会标「元数据」。
- 脚注：定义块单独保存，行内 `[^1]` 引用会还原文稿里的写法，往返逐字节一致。
- 图片：工具栏「插入 → 图片」，也支持拖入与粘贴；有文件夹句柄时写进 `assets/` 并写相对路径。打开文件夹后，相对路径图片在编辑视图与预览面板里正常显示：同目录、向下相对路径、`../`（笔记放子目录、图放仓库根）与 `%20`（文件名带空格）都支持，Markdown 里仍是 `assets/…`（第 38 轮；第 39 轮补 `../` 与 `%20` 并加占位）。打开文件夹后解析不到的图不再静默破图，显示虚线占位与「图片未找到」提示；浏览器里单文件打开（无目录句柄）与 HTML 导出仍显示不了；桌面宿主双击打开的单篇文档第 57 轮起能显示同目录相对图片（宿主新增 `/__asset`，只回 png/jpg/jpeg/webp/gif/bmp，绝对路径、`..` 与反斜杠一律 403，不加 CORS 头）。
- 查找替换：`Ctrl + F` 打开，命中全部高亮；`Enter` 下一处，`Shift + Enter` 上一处；可单条或全部替换。源码模式下不提供查找定位与替换：查找条会说明原因并把按钮置灰，不再假装替换成功（第 39 轮），要替换先按 `Ctrl + /` 切回富文本。预览（只读）视图里同样整体锁住（第 42 轮，与源码模式同一语义）：要替换先按 `Ctrl + Shift + P` 切回编辑。查找条上有 `Aa`（区分大小写）与 `ab`（整词）两个开关，按下态可切换（第 41 轮；只在会话内有效、不落盘；整词只认 ASCII 词边界，中文按原样匹配）。
- 粘贴：`Ctrl+V` 保留格式，`Ctrl+Shift+V` 粘贴为纯文本（浏览器原生键，桌面宿主未验证）。
- 行内 HTML 与 Obsidian callout：标签和 `[!note]` 按原文保留，保存时还原；`<!-- 备注 -->` 注释与 `H~2~O` 这类单波浪号现在打开→保存后逐字节不变（第 40 轮；`~~删除线~~` 仍是删除线，代码围栏、行内代码、引用块围栏与公式里的 `~` / `\~` 不动）。原文里本来就是字面实体（写转义说明的段落、代码样例）不会被改成真标签。第 47 轮起四个白名单标签在编辑视图与预览里显示真样式：不带属性、成对、同一行的 `<kbd>`（键帽）、`<mark>`（底色）、`<sub>` / `<sup>`（上下标），保存写回原标签、往返逐字节不变；带属性、单开、跨行、内容含 `<` 或 `&` 的标签仍按原文保真、不渲染。
- 连续空段落保存后收成 1 个空段落，不再往 `.md` 里写字面 `&nbsp;`（文首与正文中间同理；只按一次 `Enter` 的字节不变，围栏与脚注块内的空行不动，第 40 轮）。
- 导出：HTML（样式内联，单文件可直接发）、Markdown、纯文本、打印存 PDF（深色主题下打印 / 另存 PDF 用浅底深字，第 44 轮）。
- 表格：光标进入表格时出现工具条，可增删行列、删整表；表头边界可拖拽改列宽。
- 数学公式：行内 `$E=mc^2$` 与块级 `$$…$$` 用 KaTeX 渲染；内侧不能是空白的成对 `$` 才当公式，`$5 到 $10` 在打字与载入两条路径上都保留为文字（无空格写法 `$5-$10` 仍会被当公式）。
- Mermaid 图表：正文里的 ` ```mermaid ` 围栏会在代码块下面画成图（第 36 轮）。图是装饰：源码模式与保存写回仍是原 fence，逐字节一致；图坏了代码块原文不动，只多一句提示。渲染器首次见图才下载，首屏不含。第 46 轮起按当前主题画，切主题会重绘（跟随系统也跟随）。
- 字数：状态栏点字数弹出明细，列出中日韩字、拉丁词、合计、字符、句、段与预计阅读时间，以及当前选区内的字 / 字符 / 句。「段」按正文文本块计：段落与列表项各算 1，标题与表格不计，代码块整块算 1（编辑与源码两模式同口径）。点面板外面或按 `Esc` 关闭。
- 字号：设置里调 12–26，`Ctrl + =` 放大、`Ctrl + -` 缩小、`Ctrl + Alt + 0` 复位（`Ctrl + 0` 是正文样式）。主题有浅色、深色、跟随系统三档，第 55 轮加内置「暖纸」（`data-theme='sepia'`，清单在 `src/lib/themes.ts`）。
- 正文里按 `Esc` 离开正文，焦点落到正文之后的状态栏字数入口（正向出口，键盘陷阱已消除，第 42 轮）；正文里 `Tab` 仍是插入两个空格（第 24 轮的产品选择），组合输入（拼音候选）期间按 `Esc` 不夺焦。工具栏的格式按钮有按下态与 `aria-pressed`，表格工具条的删除三项用危险色并与插入组分开（第 42 轮）。
- 打开文档时先做一次往返比对：含引用式链接定义块（`[id]: url`）的文档直接进源码模式并说明原因；其他会被改写的写法（多行脚注等）在顶部提示差异类别，可一键转到源码模式。
- 新建与另存为：顶栏「文件」菜单有新建、另存为、打开文件、打开文件夹；文件树头有「＋ 新建文件」。没有文件句柄时保存走系统保存对话框，保存成功有持久提示。
- 拖入打开：把 `.md` / `.markdown` 拖进窗口直接打开（正文逐字载入、提示「已打开「文件名」」）；把文件夹拖进来当工作区（建文件树、就绪后 `Ctrl+S` 写回）。当前文档有未保存改动时先弹「切换文档」问一下；拖入图片仍交给正文（第 54 轮）。
- 侧栏与文件树：侧栏页签可用键盘切换（`tablist`，箭头键换页签）；文件树支持展开/折叠，空文件夹有提示。
- 文件树操作：右键文件可删除；删除是把文件移到工作区 `.sidelight/trash/`（时间戳 + 原名，重名加随机后缀），不直接抹掉。删完树自动刷新；当前文档被删会提示并清空编辑区。删除后可以撤销，恢复原内容（删除前有未保存改动时，连改动一起恢复）。右键也可重命名（同目录、只接受 `.md` / `.markdown`，目标已存在会拒绝）；改名后当前文档随新路径走，`Ctrl+S` 写新路径。
- 改名不做迁移：旧路径的最近记录会失效（下次打开提示文件不存在），缓存（草稿/批注）从旧键迁到新键，写新成功才删旧。
- 双击 `.md` 由宿主打开时可以直接写回原文件：宿主提供正文与编码元数据，保存是原子替换，BOM、换行与编码不变。
- 宿主文档有草稿兜底：编辑时写到文档同目录 `.sidelight/drafts/`，关窗时有未保存改动会问「取消 / 存草稿 / 丢弃」。草稿只存本机，不发网络；卸载不删文档目录里的 `.sidelight`。
- 最近打开：桌面版（宿主）记住最近 8 篇，可清除与撤销；浏览器里不显示。宿主模式里用「打开文件…」经页面文件选择器打开的文件不进最近列表。
- 保存：`Ctrl + S`。富文本模式下，如果保存会改写多行脚注等写法，保存会被拦下并列出差异类别、要求确认：选「改用源码模式保存」写原文，或取消。含引用式链接定义的文档切回富文本后，首次保存仍拦一次。正常编辑（改值、删行）不弹。双击打开的文档也走这道拦截。没有改动时 `Ctrl+S` 不写盘、也不再整篇读回旧文件，提示「没有改动，未写入。」（第 51 轮）。
- 草稿与批注存在文档同级（打开文件夹时在工作区根目录）的 `.sidelight/` 里：`drafts/<名字>.md` 与 `annotations/<名字>.json`；保存成功后删草稿，重开文档恢复批注（有磁盘句柄时，未验证）。没有磁盘句柄（示例文件）时退回浏览器本地存储。
- 设置里填接口地址、API Key、模型名，走 OpenAI 兼容协议。没填时走模拟流。

## 现在不能做什么

- 文件树只能删文件：不能移动、复制文件，也不能删目录；重命名只支持同目录 `.md`/`.markdown`（目标已存在会拒绝）。没有应用内「恢复」或 trash 浏览界面，恢复要在资源管理器里把文件挪回去。trash 只增不减，不自动清理，卸载也不删。
- 可访问性还有 P2 延后项：骨架的 `role="dialog"`/`aria-busy`、批注卡可聚焦并按 Enter 跳句、正文开头 Tab 回环删除，本轮不做；设置面板主题组的 radiogroup 方向键还没生效（B-109）。性能侧延后：memo 化、B4/B5、2 MB 读取进度条。1 MB 多节点文档载入 112 s → 2.9 s（第 52 轮，100 KB 1.1 s）；逐键已从 p50 126 / p95 149 ms 降到 100 KB p50 38 / p95 39、1 MB p50 148 / p95 159 ms（第 56 轮，只记基线、不设绝对门槛）；仍未达标的只剩 1 MB 切源码冻结约 1.1 s（B-115；第 53 轮返修把进源码 9.9 s 压到 1.1 s、退 2.1 s 压到 0.3 s，未过 300 ms 门槛，按规则回滚未提交）。
- 键盘与查找的四条边界（第 43 轮补第四条）：预览（只读）里查找条整体锁住，命中计数不再显示、上一处/下一处不可用（与源码模式一致）；预览与源码里工具条格式、插入命令与表格条都不可用（第 43 轮，与查找替换同一条只读口径），要改正文先按 `Ctrl+Shift+P` / `Ctrl+/` 回编辑；页边批注卡片本身不能 `Tab` 到（卡片要先用鼠标点，卡片按钮才可用）；表格工具条的贴靠位置（离表格 742 px）与行列拖拽重排仍未支持。
- 还没有自动更新。Windows 包没有代码签名，SmartScreen 会拦一次；macOS 默认 ad-hoc（未签名、未公证），配了 Apple secrets 的流水线才会签名 + 公证。装完的 HKCU 卸载项、开始菜单快捷方式、默认安装路径、真人双击与 SmartScreen，以及勾选关联后「打开方式」是否出现、卸载是否残留，尚未人工验。Windows 安装包从 [Releases 页](https://github.com/XuJingye2022/SideLight/releases)下载（per-user，装到 `%LOCALAPPDATA%\\Programs\\Sidelight`，卸载保留用户数据），步骤见 [`packaging/README.md`](packaging/README.md)；也提供便携 zip。
- `.md` 默认不关联。安装时勾选「在「打开方式」中加入 Sidelight」后，右键 `.md` 的「打开方式」里会多一项；默认程序仍要在 Windows 设置里自己选，安装器不改它。
- 密钥存在浏览器 localStorage，没有加密，也没有系统钥匙串。
- 表格：没动过的表格整块写回原文（表内字节与 02 型单空行）；改过单元格、增删行列或改对齐的表格会重新排版，且不弹保存确认；表格前后 ≥2 空行会规范化成一个。引用式链接定义块默认源码打开，写回原文；切回富文本首次保存仍拦一次。列宽不写进 Markdown，重开按内容重新均分。
- 行内 HTML 除四个白名单标签外只保真不渲染：正文里看到的是 `<kbd class="x">` 这类文字，不是键盘样式（白名单 `<kbd>` / `<mark>` / `<sub>` / `<sup>` 例外，见上）。保真的边界（第 41 轮实测）：4 空格缩进代码块里的 `<` 保存后仍是 `&lt;`；「缩进 ≥4 的 ``` + 紧跟裸 HTML 行」的混写文档会把裸 HTML 当块、标签丢；同一篇里既写字面实体（`&lt;`）又写裸 `&` 时那一类实体整篇保持。`&#8212;` 这类**数字实体**在打开时会被解码成字符，重新保存字节会变（渲染不变，第 49 轮）。
- 图片在没打开文件夹时只能内联，不进 `assets/`；浏览器里单文件打开（无目录句柄）时相对路径图片仍显示不了（桌面宿主双击单篇第 57 轮起例外，见上）。
- Mermaid 图只在编辑视图里画：预览面板与 HTML 导出仍显示围栏原文；同一文档里两段相同的代码各渲染一次。字号只能调大小，不能换字体。
- 智能标点的已知限制：中文后的 `.` 不转 `。`；反引号不配对（保住 `` `a` `` → 行内代码）；没有成对退格（空配对 `()` 要按两次退格）；中文后的 `!` 紧跟 `[` 时不转（保住 `![图](a.png)`）；空段落（或首尾没有紧邻汉字）打 `--` 仍是一个 `—`，这是为保住 `---` + 空格出分隔线；中文句子里（紧邻汉字）打 `--` 直接得 `——`，`甲 -- 乙` 这类用空格隔开的仍是 `甲 — 乙`（第 49 轮）；含 `|` 的行不把 `--` 换成 `—`（保住手打的表格分隔行）。真实中文输入法在中文态是否本来就上屏全角、智能标点在组合输入上屏那一次会不会重复转换，都没验。
- 真模型没测过：没有 key。中文输入法（组合输入、候选窗、组合期间开对话框）在浏览器与宿主里都没验。关窗只在自动化里验过：真实 Alt+F4、注销/关机、真实 IME 组合输入下的关窗，以及草稿写失败（只读目录）的可见错误，都没人工验。
- 写回只在 UTF-8 / UTF-16LE / GBK 与 **5.5 MiB（5,767,168 B）** 以内文件上验过；超过上限的提示写清「仍在『哪一篇』」，正文保留上一篇（不清空）。已验边界：**5.2 MiB 可打开、6.1 MiB 拒绝**；5.5–6 MB 之间未验。文件被占用、网络盘、中文长路径、真人双击下的保存对话框与写回都没验。

与 Typora 的逐项对照在 [docs/typora-gap.md](docs/typora-gap.md)：当前已有 35 项，缺 7 项（未含 `.md` 关联）。

## 数据与隐私

（待产品负责人确认后再作为对外承诺。以下只写当前实现的事实。）

- 最近记录在磁盘上含**完整路径**、文件名与打开时间（Windows `%LOCALAPPDATA%\Sidelight\recent.json`；macOS `~/Library/Application Support/Sidelight/recent.json`）；不上传，不写进正文，也不进导出。页面只拿哈希 `id`、**文件名**与**目录段**。
- 「清除」立即清空列表（可撤销一次）；`recent.json` 删掉，但日志与草稿不受影响。
- 日志在 Windows **安装目录**：`host.log` 只记 basename，超过 1 MB 轮转为 `host.log.1`；例外是 `navigate`/`permission` 会记**导航的完整 URL** 与权限请求 URI。删除 `host.log*` 可清；macOS 宿主不落盘日志。
- 草稿与批注在文档同目录 `.sidelight/`：草稿 `drafts/`，批注 `annotations/`；只在本机，不发网络。
- trash 只在本机：删除的文件进工作区 `.sidelight/trash/`，不发网络、不自动清理、卸载不删；要彻底清掉，手动删这个目录。
- Windows 卸载保留 `%LOCALAPPDATA%\Sidelight`（`recent.json` 与 `%LOCALAPPDATA%\Sidelight\WebView2` 配置）；要彻底清掉，卸载后手动删。
- macOS 的最近记录在 `~/Library/Application Support/Sidelight`；WebView 存储由 WebKit 决定，位置**未核实**；文档同目录 `.sidelight/`（草稿、批注、trash）与 Windows 一致。
- 换包/升级不丢数据；同一时间只保留一个 `Sidelight.app`；不要改 `CFBundleIdentifier`（改了会当成另一个应用，数据与 Gatekeeper 记录都会分叉）。
- File 菜单有打开/打开最近/关闭窗口；Edit 菜单有撤销/重做/剪切/拷贝/粘贴/全选，快捷键交给系统（macOS 用 `Cmd`）。
- 无遥测，启动不联网；联网只发生在用户点「联网核对」并配好搜索服务时。
## 依赖与体积

首屏 gzip 从 364,960 B 降到 **297,823 B（−18.4%）**：KaTeX 的 JS/CSS 拆成独立 chunk（gzip 约 84 KB：JS 76,553 B + CSS 7,365 B）按需加载，首屏不再包含；第 30 轮再把预览面板与导出模板改成按需加载，首屏又少 1,309 B；第 31 轮加链接点击与列表缩进后 +232 B；第 32 轮加选区计数与字数明细段落口径后 +291 B；第 33 轮加智能标点与自动配对后 +839 B；第 34 轮加脚注拦截与焦点回正文后 +46 B；第 35 轮拆分 AI 提示词并修 Esc 焦点后 +119 B；第 36 轮加 Mermaid 惰性渲染插件后 +2,200 B（只是插件与 shim 的静态代码，Mermaid 本体 0 B 进首屏）；第 37 轮加表格列宽拖拽与源码框 caret 落位后 +155 B（只多 CSS）；第 38 轮加工作区图片解析（`assetResolve` + `ResolvingImage` NodeView）、含 `|` 行的智能标点保护与嵌套 mermaid 收集后 +1,019 B；第 39 轮加表格单元格 `<br>` 往返、`../`/`%20` 图片解析与源码模式查找锁定后 +591 B；第 40 轮加单波浪号/HTML 注释保真、预览排版容器、`&nbsp;` 空段落与标题单源后 +702 B；第 41 轮加正文实体往返、查找大小写/整词开关与确认框期间不自动保存后 +594 B；第 42 轮加预览锁替换、Esc 正向出口、工具栏按下态、表格条分色与正文焦点指示线后 +449 B；第 43 轮加预览只读守卫、拖入文件提示与两个精确快路径（相等短路、跳过支不重算字数）后 +280 B；第 44 轮加任务列表输入规则（手打 `- [ ] `）与只读视图按钮说明后 +635 B；第 45 轮加恢复态原文（`initial.raw`）、遮罩改 `div`、开关条件渲染与 `.note-diff` 回块流后 +26 B；第 46 轮加页边让位（`railSpace`）、Mermaid 主题重绘与插件订阅后 +498 B；第 47 轮加行内 HTML 白名单渲染、行内代码智能标点守卫与 Mermaid 错误图清理后 +546 B；第 48 轮加表格内块级守卫与源码基线归一化后 +372 B；第 49 轮加命名实体保真、`<mark>` 底色 token、代码块字号、Mermaid 错误提示色与 24 px 点击区后 +250 B；第 50 轮加脚注续行渲染、导出差异门、按文本节点批量替换与 4 条 CSS 后 +540 B；第 51 轮加无改动不写盘、整页缩放与视图钮按下态后 +563 B；第 52 轮加 1 MB 载入 O(n²) 守卫（表格/任务列表 tokenizer）、F11 全屏与单元格块级标记守卫后 +579 B；第 54 轮加拖入打开（`src/lib/workspace.ts`）与状态栏缩放 chip 后 +555 B；第 55 轮加快捷行内语法（`src/lib/inlineSyntax.ts`）、主题清单与暖纸变量后 +1,046 B；第 56 轮加行内定界符守卫、逐键脏判定改停顿比对后 +63 B；第 57 轮加宿主 `/__asset` 的前端接线、暖纸弱文字与设置页脚后 +104 B。首屏口径不含启动后立刻动态 import 的常驻 chunk（如 `MarginRail-*.js`，gzip 2,327 B，第 43 轮实测），实际首载 ≈ total + 2,327 B。首屏预算内部 **310,000 B** / 硬线 **320,000 B**（2026-11-17 产品负责人放宽；原临时上限与数据安全例外作废，历史理由见 STATE），当前 297,823 B（第 57 轮改动后、2026-11-18 第 57 轮 scribe 在批末复跑 `npm run verify` 实测，距硬线余 **22,177 B**、距内部预算余 12,177 B）；安装包内部预算 **45,000,000 B** / 硬线 **50,000,000 B**（2026-11-17 第二次放宽，见 ADR-0017）。安装包与便携 zip 的具体字节每版都不同，**以 Release 页的 `SHA256SUMS-<版本>.txt` 为准**。KaTeX 字体 213,664 B（15 个文件，只发 woff2；另 1 个 face 内联）。

**KaTeX 为什么现在按需加载**：`@tiptap/extension-mathematics` 顶层静态 `import katex` 曾是首屏 365 KB 的大头；0.24.0 用 `resolve.alias` 的数组正则把裸 `katex` 指到 `src/lib/katexLazy.ts`，再让 loader 用深路径动态加载 KaTeX 的 JS 与 CSS。首屏不再含 KaTeX；265 KiB（271,360 B）不可达，实测 284,761 B（第 31 轮），原因见 [ADR-0012](docs/adr/0012-katex-lazy-loading.md)。构建仍用 `chunkSizeWarningLimit: 950`（主 chunk 以最近一次 `npm run build` 输出为准：第 57 轮 923,234 B raw（`index-C0MK7z5T.js`，gzip 289,611 B），第 52 轮 918,625 B raw）。

运行时依赖只有三组，都不是为省几行代码引入的：

- Tiptap 3.34 与配套扩展：编辑器内核、表格、任务列表、图片、公式。自己写不出同等质量的所见即所得。其中 `@tiptap/extension-strike` 被 `src/App.tsx` 直接 import，已在 dependencies 显式声明；同一模块本来就在包内，字节不变。
- KaTeX：公式排版。0.24.0 起 JS/CSS 与字体都按需加载（第一次渲染公式时才下载），首屏不再包含。
- Mermaid：图表（` ```mermaid ` 围栏）。第 36 轮起惰性加载：首屏不含，打开含图文档才下载；安装包实测见下。

开发期另有 `playwright-core`（截图与端到端验证）与 `@types/node`（测试）。

宿主层另有 `host/`：用系统自带 `csc.exe` 编 C# 宿主，经 WebView2 SDK 加载同一份 `dist`，只在宿主层，不进运行时依赖。宿主自己起回环 HTTP 服务（固定端口 `127.0.0.1:47821`），origin 跨重启不变，首屏 FCP 304 ms（**本机一次测量，非跨机承诺**）、转发 reload 52–64 ms；窗口、单实例、argv 打开文件、真实文件夹读写都已跑通。安装包与便携 zip 的字节和 SHA256 见 Release 页的 `SHA256SUMS-<版本>.txt`（内部预算 45,000,000 B，硬线 50,000,000 B），卸载不删 `%LOCALAPPDATA%\Sidelight` 里的用户数据，见 [`packaging/README.md`](packaging/README.md)、[ADR-0004](docs/adr/0004-webview2-host-before-admin.md) 与 [ADR-0005](docs/adr/0005-loopback-fixed-origin.md)。

## 跑起来

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # 37 个文件、473 条断言
npm run roundtrip # Markdown 往返损失测量，写 docs/roundtrip-report.md
npm run build     # 类型检查 + 打包
npm run verify    # build + 首屏 gzip 字节门
npm run shot      # 无头浏览器跑流程并截图（需先起 dev；默认写 .tmp/shots/shot.png，--out 指定路径）
npm run acceptance # 11 项：草稿、货币、查找、公式、字体、表格、导出、三处保真、无控制台错误（需先起 dev + 无头浏览器）
node scripts/qa.mjs  # 缺陷探测：切换文档、设置、字号、批注漂移、空文档、专注模式（qa7、qa9–qa18 是单项探测）
```

桌面宿主与安装包（Windows，需要先有 `dist/`）：

```powershell
powershell -ExecutionPolicy Bypass -File host\build.ps1           # 编宿主到 host\bin；缺 WebView2 SDK 时按脚本提示取 .tmp\wv2
node scripts/host-smoke.mjs --fsa                                  # 宿主 7 项冒烟：窗口、渲染、argv、单实例、真实写盘
powershell -ExecutionPolicy Bypass -File packaging\portable.ps1    # 便携 zip -> release\
powershell -ExecutionPolicy Bypass -File packaging\installer.ps1   # NSIS 安装包 -> release\
powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1  # 静默装/卸 + 断言
```

macOS 宿主（需要 macOS + Xcode Command Line Tools；本机是 Windows，**没有本地验过**，以 CI 的 `macos-host` job 为准）：

```bash
npm run build                       # 先出 dist/
bash host-mac/build.sh              # Universal（arm64 + x86_64）-> .app -> ad-hoc 签名 -> release/Sidelight-<ver>-macos-universal.zip
.tmp/mac/stage/Sidelight.app/Contents/MacOS/SidelightMac --self-test --require-bundle   # 6 项断言，失败退出码非 0
```

CI 用 `macos-latest` runner 构建并上传 zip（见 `.github/workflows/ci.yml` 的 `macos-host` job）。

## 目录

```text
src/
  App.tsx                 双栏骨架、分析流程、文件读写、页边定位
  main.tsx                挂载
  styles.css              全站样式（12px 小字、窄窗断点、暗色媒体查询）
  components/             文件树、大纲、页边批注、查找条、预览、设置、保存对比、状态栏、公式编辑器、浮层
  lib/                    上下文、批注、大纲、字数、frontmatter、脚注、HTML/callout、公式、导出、差分、图片命名、查找、缓存、搜索、错误文案
  lib/*.test.ts           33 个测试文件挂进 npm test（含 session / prompt / settings / katexLazy / mermaidLazy），与实现同目录
host/                     C# WebView2 宿主（Program.cs、build.ps1、冒烟与转发探针）
packaging/                NSIS 安装器、便携包、图标生成、安装/便携验收脚本
scripts/                  截图、验收、缺陷探测、往返测量、字体裁剪
fixtures/markdown/        7 个真实 .md 样本
docs/adr/                 架构决策记录（0001–0017）
docs/iteration/           每轮简报、发现、计划、实施、验收
release/                  安装包与便携 zip，不进版本控制
```

## 已定的技术决策

- 编辑器内核：Tiptap 3.34（ProseMirror），文档树是真相。见 [ADR 0001](docs/adr/0001-document-tree-is-the-truth.md)。
- AI 接入：用户自带密钥，协议锁 OpenAI 兼容。见 [ADR 0002](docs/adr/0002-ai-access-byo-key.md)。
- 意见形式：页边批注，锚定正文范围，修订逐条采纳。见 [ADR 0003](docs/adr/0003-margin-annotations.md)。
- 上下文：选区 + 前后各一段，上限 1500 字；没选区时取光标所在段落。
- AI 不直接写正文：每次写入都要人点一次「采纳」。
- 桌面壳：C#/.NET Framework + WebView2 宿主，零管理员；Tauri 2 只在拿到管理员/MSVC 或改由 CI 出包时重评估。见 [ADR 0004](docs/adr/0004-webview2-host-before-admin.md)。
- 宿主 origin：固定回环 `http://127.0.0.1:47821`，端口被占就报错退出，不换端口。见 [ADR 0005](docs/adr/0005-loopback-fixed-origin.md)。
- 写回：宿主是唯一写者，页面从 `/__doc` 拿正文与编码元数据、拿不到路径；保存走 `postMessage`，宿主用同目录临时文件 + 原子替换。见 [ADR 0006](docs/adr/0006-argv-writeback.md)。
- `.md` 关联：只加「打开方式」候选，opt-in、默认不勾、不改默认程序，只写 HKCU。见 [ADR 0007](docs/adr/0007-markdown-association.md)。
- 宿主草稿：`draft-save` 写文档同目录 `.sidelight/drafts/`，关窗问「取消 / 存草稿 / 丢弃」。见 [ADR 0008](docs/adr/0008-host-draft-and-close-guard.md)。
- 最近打开：宿主记 8 篇，`/__recent` 只回哈希 id；日志只记 basename。见 [ADR 0009](docs/adr/0009-recent-files.md)。
- 表格：签名未变的表格整块写回原文，改过的表格按编辑器规范排版。见 [ADR 0010](docs/adr/0010-table-block-reuse.md)。
- 引用式链接：含定义块的文档载入后默认源码模式，切回富文本首次保存仍拦一次。见 [ADR 0011](docs/adr/0011-source-mode-for-reference-links.md)。
- KaTeX 惰性加载：首屏不再含 KaTeX，首次渲染公式时才加载。见 [ADR 0012](docs/adr/0012-katex-lazy-loading.md)。
- 文件树只做删除：移到工作区 `.sidelight/trash/`，不提供应用内恢复，不自动清理。见 [ADR 0013](docs/adr/0013-file-tree-operations.md)。
- 文件重命名：同目录、只接受 `.md`/`.markdown`、目标存在拒绝、`move()` 唯一路径、缓存写新成功才删旧。见 [ADR 0014](docs/adr/0014-file-rename.md)。
- macOS 打包：默认 Universal（arm64 + x86_64），签名/公证可选三态，zip 内带 README。见 [ADR 0015](docs/adr/0015-macos-universal-and-signing.md)。
- 会话恢复：IndexedDB 只存句柄、权限三态、失败退化；宿主 `/__annotations` 端点。见 [ADR 0016](docs/adr/0016-session-restore.md)。
- Mermaid：**第 36 轮实现**（产品负责人 2026-11-17 批准；安装包预算已放宽到内部 45,000,000 / 硬线 50,000,000），惰性方案与体积实测见 [ADR 0017](docs/adr/0017-mermaid-lazy-loading.md)。

## 已知的重要问题：Markdown 往返损失

`npm run roundtrip` 把 7 个真实样本读进编辑器内核再写回，逐行对比。三条路径分开报：富文本 **5 / 7** 完全保真、源码路径 **7 / 7** 等值（未编辑）、富文本首次保存仍拦截 **1 / 7**（04 引用式链接）。逐样本表见 [docs/roundtrip-report.md](docs/roundtrip-report.md)。

frontmatter、脚注定义、行内 HTML 与公式逐字节保真。表格只在「没动过」时整块写回原文；引用式链接定义块默认源码打开。差异见 [docs/roundtrip-report.md](docs/roundtrip-report.md)。

三个兜底已经落地：未编辑不写盘、frontmatter 与 HTML 块按原文保留、保存前把格式变化给用户看。

## 参与贡献

- [CONTRIBUTING.md](CONTRIBUTING.md)：环境、10 分钟上手、两档门禁、提交与 PR 规矩。
- [SECURITY.md](SECURITY.md)：报告渠道（私有漏洞报告未开启时怎么报）、信任边界、Key 与日志边界。
- [PRIVACY.md](PRIVACY.md)：**草案**，数据存哪 / 是否出网 / 怎么删；承诺句待产品负责人确认。
- [AGENTS.md](AGENTS.md)：仓库纪律与门禁（内部协作也照此）。
- [GLOSSARY.md](GLOSSARY.md)：正文、批注、大纲等领域词。
- [docs/adr/](docs/adr/)：架构决策记录（0001–0017）。
- [LICENSE](LICENSE)：MIT。

## 下一步

按 [BACKLOG](docs/iteration/BACKLOG.md) 的开放项排序（稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度）：

1. 1 MB 切源码冻结约 1.1 s（B-115）：1 MB 文本进 `<textarea>` 的原生排版本身就要 0.5–1.7 s，达标得换源码显示方式（虚拟化分行或只读 `<pre>` 层）。
2. 整页缩放 130% 起横向溢出（B-014，`.app` 的 `min-width:1120px`）与缩放全程无比例提示（B-113）。
3. 1 MB 逐键 p50 126 / p95 149 ms（B-116）。
4. 设置面板 sticky 页脚切字（B-108）与主题 radiogroup 方向键（B-109）。
5. 拖入 `.md` / 文件夹直接打开（B-003；现在只提示、不打开）。
6. 宿主 `/__asset`（B-004）：WebView2 单文件打开时的相对路径图片。

之后是差距表计数复核（B-112）与自定义快捷键。桌面壳仍是 C# WebView2 宿主；Tauri 只在拿到管理员/MSVC 或改由 CI 出包时重新评估（见 [ADR-0004](docs/adr/0004-webview2-host-before-admin.md) 文末）。
