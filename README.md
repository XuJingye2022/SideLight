# Sidelight

你的写作，AI 在页边。左侧写作，右侧按需补光。

发布目标：面向所有中文写作者的桌面 Markdown 编辑器，Windows 首发。现有 **C# WebView2 宿主**（`host/`）、per-user 安装包与便携 zip（`release/`，打包脚本在 `packaging/`）。

## 现在能做什么

- 左侧文件树：打开文件夹、单独打开一个 `.md` 文件，或者试用内存里的示例工作区。当前文档高亮。
- 侧栏第二个页签是大纲：按标题层级列出，当前章节高亮，点一下跳过去。
- 正文编辑：标题、粗斜体、删除线、行内代码、列表、引用、代码块、链接、表格、任务列表。
- 工具栏：插入表格、代码块、引用、任务列表、分割线、链接；格式按钮与 H1、H2。
- 视图：专注模式压暗非当前块，打字机模式把光标保持在视口中部，源码模式可编辑原始 Markdown，预览模式只读渲染全文（含 frontmatter、脚注、公式）。四种视图互斥，进源码或预览会自动关掉专注与打字机。
- 点页边任一批注会选中正文里对应的句子并滚到眼前；点正文里的链接会贴着元素弹出编辑框。
- 公式：打 `$x^2$` 得到行内公式；空行打 `$$` 再回车得到块级公式。点公式就地编辑：行内展开成源码并全选、下方浮出预览；块级在原位出现输入框。
- 三种视图（编辑 / 源码 / 预览）互斥切换；离开源码时先把源码写回正文，不会丢字。
- 底部状态栏：字数、预计阅读时间，以及当前开了哪些视图模式。
- 拖选一段，点选区旁浮出的「分析」或按 `Ctrl + Enter`。AI 的批注落到页边，正文出现对应高亮。
- 批注分两型：**修订**带改写文字，可逐条「采纳」；**评价**只给判断，只有「知道了」。
- 选区超过约 1500 字时切段、逐段分析；段落本身超长时在段落内部按句子再切。长文的批注能覆盖整个选区，不会只出现在开头。
- 每条批注可以「追问」：就地展开对话，模型带着原文、批注与上下文回答，线程跟着批注存进 `.sidelight`。
- 每条批注可以「联网核对」：用配置好的搜索服务查一次，把带链接的出处列在卡片里。搜索服务可选 Tavily 或博查，用户自带 Key，默认关闭。
- 带 YAML frontmatter 的文档：元数据单独保存，拼回时逐字节一致；状态栏会标「元数据」。
- 脚注：定义块单独保存，行内 `[^1]` 引用会还原文稿里的写法，往返逐字节一致。
- 图片：工具栏「插入 → 图片」，也支持拖入与粘贴；有文件夹句柄时写进 `assets/` 并写相对路径。
- 查找替换：`Ctrl + F` 打开，命中全部高亮；`Enter` 下一处，`Shift + Enter` 上一处；可单条或全部替换。
- 行内 HTML 与 Obsidian callout：标签和 `[!note]` 按原文保留，保存时还原。
- 导出：HTML（样式内联，单文件可直接发）、Markdown、纯文本、打印存 PDF。
- 表格：光标进入表格时出现工具条，可增删行列、删整表。
- 数学公式：行内 `$E=mc^2$` 与块级 `$$…$$` 用 KaTeX 渲染；内侧不能是空白的成对 `$` 才当公式，`$5 到 $10` 在打字与载入两条路径上都保留为文字（无空格写法 `$5-$10` 仍会被当公式）。
- 字号：设置里调 12–26，`Ctrl + =` 放大、`Ctrl + -` 缩小、`Ctrl + 0` 复位。
- 打开用到引用式链接的文档时，顶部提示编辑器读不全，可一键转源码模式。
- 保存：`Ctrl + S`，有文件句柄时写回磁盘，否则下载。第一次保存会把被规范化的行列出来，你确认后才写。
- 草稿与批注存在文档同级（打开文件夹时在工作区根目录）的 `.sidelight/` 里：`drafts/<名字>.md` 与 `annotations/<名字>.json`；保存成功后删草稿，重开文档恢复批注（有磁盘句柄时，未验证）。没有磁盘句柄（示例文件）时退回浏览器本地存储。
- 设置里填接口地址、API Key、模型名，走 OpenAI 兼容协议。没填时走模拟流。

## 现在不能做什么

- 还没有自动更新、没有代码签名。安装用 `release/Sidelight-0.17.0-win-x64-setup.exe`（per-user，装到 `%LOCALAPPDATA%\Programs\Sidelight`，卸载保留用户数据），步骤见 [`packaging/README.md`](packaging/README.md)；也提供便携 zip。
- 密钥存在浏览器 localStorage，没有加密，也没有系统钥匙串。
- 引用式链接打开再保存会被改写成行内链接；打开时提示，保存前把受影响的行摆出来给你确认。
- 行内 HTML 只保真不渲染：正文里看到的是 `<kbd>` 文字，不是键盘样式。
- 图片在没打开文件夹时只能内联，不进 `assets/`。
- 还没有 Mermaid 图表、主题切换；字号只能调大小，不能换字体。
- 真模型没测过：没有 key。

与 Typora 的逐项对照在 [docs/typora-gap.md](docs/typora-gap.md)：当前已有 21 项，缺 18 项。

## 依赖与体积

打包产物约 1.34 MiB（1,400,644 B）：JS 1.0 MB、KaTeX 字体 256,168 B（19 个文件，只发 woff2）、其余是 HTML 与 CSS。

运行时依赖只有两组，都不是为省几行代码引入的：

- Tiptap 3.34 与配套扩展：编辑器内核、表格、任务列表、图片、公式。自己写不出同等质量的所见即所得。
- KaTeX：公式排版。字体是打包里唯一的体积大头，后面可按需加载（只打开有公式的文档时才加载）。

开发期另有 `playwright-core`（截图与端到端验证）与 `@types/node`（测试）。

宿主层另有 `host/`：用系统自带 `csc.exe` 编 C# 宿主，经 WebView2 SDK 加载同一份 `dist`，只在宿主层，不进运行时依赖。宿主自己起回环 HTTP 服务（固定端口 `127.0.0.1:47821`），origin 跨重启不变，首屏 FCP 296 ms；窗口、单实例、argv 打开文件、真实文件夹读写都已跑通。安装包 827,198 B，卸载不删 `%LOCALAPPDATA%\Sidelight` 里的用户数据，见 [`packaging/README.md`](packaging/README.md)、[ADR-0004](docs/adr/0004-webview2-host-before-admin.md) 与 [ADR-0005](docs/adr/0005-loopback-fixed-origin.md)。

## 跑起来

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # 16 个文件、171 条断言
npm run roundtrip # Markdown 往返损失测量，写 docs/roundtrip-report.md
npm run build     # 类型检查 + 打包
npm run shot      # 用无头浏览器跑一遍流程并截图到 shots/（需先起 dev）
npm run acceptance # 11 项验收：草稿、货币、查找、公式、字体、表格、导出、三处保真（需先起 dev + 无头浏览器）
node scripts/qa.mjs  # 缺陷探测：切换文档、设置、字号、批注漂移、空文档、专注模式（qa7、qa9–qa18 是单项探测）
```

## 目录

```text
src/
  App.tsx                 双栏骨架、分析流程、文件读写、页边定位
  components/FileTree     工作区文件树
  components/MarginRail   页边批注栏
  lib/context.ts          选区与上下文组装
  lib/annotations.ts      JSONL 解析、引文定位、位置平移（有测试）
  lib/decorations.ts      把批注画到正文上
  lib/prompt.ts           批注员的系统提示词
  lib/ai.ts               OpenAI 兼容流式客户端 + 模拟流
  lib/workspace.ts        文件夹读取、文件读写、示例工作区
fixtures/markdown/        7 个真实 .md 样本
docs/adr/                 架构决策记录
```

## 已定的技术决策

- 编辑器内核：Tiptap 3.34（ProseMirror），文档树是真相。见 [ADR 0001](docs/adr/0001-document-tree-is-the-truth.md)。
- AI 接入：用户自带密钥，协议锁 OpenAI 兼容。见 [ADR 0002](docs/adr/0002-ai-access-byo-key.md)。
- 意见形式：页边批注，锚定正文范围，修订逐条采纳。见 [ADR 0003](docs/adr/0003-margin-annotations.md)。
- 上下文：选区 + 前后各一段，上限 1500 字；没选区时取光标所在段落。
- AI 不直接写正文：每次写入都要人点一次「采纳」。

## 已知的重要问题：Markdown 往返损失

`npm run roundtrip` 把 7 个真实样本读进编辑器内核再写回，逐行对比。当前结果：3 / 7 完全保真。

frontmatter、脚注定义、行内 HTML 与公式现在逐字节保真。剩余损失是三处：引用式链接打开再保存会被改写成行内链接、表格对齐会被重排、空行会差一行。差异见 [docs/roundtrip-report.md](docs/roundtrip-report.md)。

三个兜底已经落地：未编辑不写盘、frontmatter 与 HTML 块按原文保留、保存前把格式变化给用户看。

## 下一步

按 [差距表](docs/typora-gap.md) 的排序，先堵数据损失：

1. 行内 HTML 渲染（现在是保真不渲染）。
2. 数学公式与导出。
3. 表格行列界面。

之后是主题与自定义快捷键，再套 Tauri 壳并在 WebView2 里重测中文输入法。
