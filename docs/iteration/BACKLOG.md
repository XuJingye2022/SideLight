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
| B-001 | open | 视图 | 整页视图缩放（Ctrl+滚轮 + 重置；正文字号已有） | `docs/typora-gap.md:56` | 差距表 |
| B-002 | open | 视图 | 全屏 | `docs/typora-gap.md:57` | 差距表 |
| B-003 | open | 文件 | 拖入 `.md` / 文件夹直接打开（现在只提示，不打开） | `docs/typora-gap.md:64`；第 43 轮 | 差距表 |
| B-004 | open | 宿主 | `/__asset`：WebView2 单文件打开时相对路径图片 | STATE 第 38 轮 | 38 |
| B-005 | open | 测试 | `scripts/data-safety-acceptance.mjs` 的 `.editor` 过期选择器 | STATE 待办 | 41 |
| B-006 | open | 保存 | F1 保存先整篇读回旧文件 / 无改动也写；F4 一次停笔写 4 份全文 | `docs/iteration/round-50/test.md` | 50 |
| B-007 | open | 表格 | 单元格里手打 `# ` / `> ` / `- ` 仍造块级节点，存盘丢结构 | `docs/iteration/round-48/test.md` | 48 |

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
| B-108 | open | 界面 | 设置面板 sticky 页脚切字（ui U5） | `docs/iteration/round-50/test.md` | 50 |

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
