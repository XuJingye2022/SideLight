# 迭代发现池（BACKLOG）

规则：
- finder 只往这里加，先查重；重复条目改状态或补证据，不重复计数。
- 状态：`open` / `planned` / `fixed` / `verified` / `deferred`。
- P0/P1 必须修；P2 默认 `deferred`，不阻塞停止；带「路线图」的 P2 例外。
- 每条一行：ID、状态、区域、问题、证据（文件:行号或截图）、轮次。

## P0

| ID | 状态 | 区域 | 问题 | 证据 | 轮 |
| :--- | :--- | :--- | :--- | :--- | :--- |

## P1

| ID | 状态 | 区域 | 问题 | 证据 | 轮 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| B-001 | fixed | 视图 | 整页视图缩放（Ctrl+滚轮 + 重置；正文字号已有） | `docs/typora-gap.md:56` | 差距表 |
| B-002 | open | 视图 | 全屏 | `docs/typora-gap.md:57` | 差距表 |
| B-003 | open | 文件 | 拖入 `.md` / 文件夹直接打开（现在只提示，不打开） | `docs/typora-gap.md:64`；第 43 轮 | 差距表 |
| B-004 | open | 宿主 | `/__asset`：WebView2 单文件打开时相对路径图片 | STATE 第 38 轮 | 38 |
| B-005 | fixed | 测试 | `scripts/data-safety-acceptance.mjs` 的 `.editor` 过期选择器 | STATE 待办 | 41 |
| B-006 | fixed | 保存 | F1 保存先整篇读回旧文件 / 无改动也写；F4 一次停笔写 4 份全文 | `docs/iteration/round-50/test.md` | 50 |
| B-007 | open | 表格 | 单元格里手打 `# ` / `> ` / `- ` 仍造块级节点，存盘丢结构 | `docs/iteration/round-48/test.md` | 48 |
| B-011 | fixed | 视图 | `Ctrl+Shift+=` / `Ctrl+Shift+-` 现在也改正文字号（实测 17→18→17），与 Typora 整页缩放键位重叠；快捷键对话框只写 `Ctrl+=` / `Ctrl+-` | `src/App.tsx:3891`（`event.key === '+'`）、`src/components/ShortcutsDialog.tsx:46`；`.tmp/r51-typora-out.json` | 51 |
| B-012 | open | 宿主 | 桌面宿主无缩放/全屏钩子：`host/` 无 `ZoomFactor`/`IsZoomControlEnabled`/`FullScreen`/`F11`（0 命中），WebView2 默认 Ctrl+滚轮原生缩放会与应用内缩成双轨，全屏需宿主接 `ContainsFullScreenElementChanged` | `host/`（grep 0 命中）；`src/` 无 `requestFullscreen`（0 命中） | 51 |
| B-008 | fixed | 可访问性 | 视图模式四钮（专注/打字机/源码/预览）无 `aria-pressed`，开关状态读屏不可见（同排格式钮有） | `src/App.tsx:4956-4999`；`docs/iteration/round-51/findings-ui.md` F1 | 51 |
| B-013 | open | 性能 | 1 MB 文档载入按节点数爆炸：约 2.4 万顶层节点要 110.9 s（300 段同类文件 1.7 s），载入期主线程全忙且无提示 | `.tmp/r51-bug-log4.txt`（parse 109,661 ms）；`.tmp/r51-bug-log3.txt`（79,858 ms）；`docs/iteration/round-51/findings-bug.md` F1 | 51 |

## P2（路线图，open）

| ID | 状态 | 区域 | 问题 | 证据 | 轮 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| B-101 | open | 编辑 | `==高亮==`、`^上标^`、`~下标~` 快捷语法 | `docs/typora-gap.md:50` | 差距表 |
| B-102 | open | 视图 | 文件列表形态的侧栏 | `docs/typora-gap.md:58` | 差距表 |
| B-103 | open | 内容 | 图片缩放 | `docs/typora-gap.md:70` | 差距表 |
| B-104 | open | 查找 | 全局搜索 | `docs/typora-gap.md:75` | 差距表 |
| B-105 | open | 外观 | 主题体系（自定义主题） | `docs/typora-gap.md:82` | 差距表 |
| B-106 | open | 编辑 | TOC / emoji | `docs/typora-gap.md:50` | 差距表 |
| B-107 | open | 外观 | 自定义快捷键 | `docs/typora-gap.md:83` | 差距表 |
| B-108 | open | 界面 | 设置面板 sticky 页脚切字（ui U5）；实测整框溢出 78px、页脚 y=823–859、框底 880，滚动内容缺底部内边距 | `docs/iteration/round-50/test.md`；`docs/iteration/round-51/findings-ui.md` F4；`shots/round-51/ui-settings-clip-1440.png` | 50 |
| B-109 | open | 可访问性 | 设置主题 radiogroup 方向键无效、三项全进 Tab 序（非 roving tabindex） | `docs/iteration/round-51/findings-ui.md` F2 | 51 |
| B-110 | open | 界面 | 斜体 `I` 21×24、状态栏 `.stats-trigger` 22×24，小于 24×24（间距豁免可能成立） | `docs/iteration/round-51/findings-ui.md` F3 | 51 |
| B-111 | open | 文档 | 差距表把导出算作「已有」（只列 HTML/Markdown/纯文本/打印），漏 Typora 的 Word/Epub/LaTeX/图片 四种格式差距，「缺的 9」里无对应行 | `docs/typora-gap.md:30`；`shots/round-51/typora-export-menu.png`（实测菜单 4 项）；`.tmp/typora-ref/resources/Docs/Install and Use Pandoc.md` | 51 |

## Deferred（不阻塞停止）

| ID | 区域 | 问题 | 原因 | 轮 |
| :--- | :--- | :--- | :--- | :--- |
| B-201 | 平台 | 真实 macOS/Intel/签名/公证 | 无真机/secrets | 环境 |
| B-202 | 平台 | 真实 HKCU/开始菜单/SmartScreen | 需真人安装 | 环境 |
| B-203 | 显示 | 150%/200% 缩放屏 | 无对应屏 | 环境 |
| B-204 | 输入 | 真实中文输入法组合输入 | 无真 IME | 环境 |
| B-205 | 性能 | 1 MB 逐键 p95 | 未测 | 39 |
| B-206 | 导出 | Mermaid 图进 HTML 导出/预览面板 | 已知限制，候选 | 36 |
| B-207 | 编辑 | 多行 HTML 注释、带属性行内 HTML | 已知限制 | 40/47 |
| B-208 | 界面 | 重命名成功提示借刷新文案「已刷新：新增 1 个，消失 1 个」，无专用「已重命名」提示 | P2 打磨（`src/App.tsx:2411`） | 51 |
