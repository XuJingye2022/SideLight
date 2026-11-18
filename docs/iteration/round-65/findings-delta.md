# 第 65 轮 delta 回归检查（finder-delta）

**结论：无新回归。** `ec20c99` 改动的两个交互面各真跑一条路径；26 项检查全过，0 控制台错误，未新建 BACKLOG 条目。

- 环境：dev `http://localhost:5175`、CDP `9226`（`node .tmp/reset.mjs 9226`，closed 1）。
- 证据：`.tmp/e2e-r65-delta.mjs`；读数 `.tmp/r65-delta.json`（failed `[]`）。

## A. B-115 源码态保留编辑器（保存 / 焦点 / 键盘 / 撤销 / 表格 / 公式 / Mermaid）

夹具 `mix.md`：表格 + 公式 + mermaid，`autoSave:false`。

1. `Ctrl+/` 进源码：编辑块仍挂载（`.ProseMirror:not(.preview-pane)` = 1）、`hidden` 收起、源码框可见且聚焦。
2. 源码追加「源码新增段落。」后 `Ctrl+S`：脏→干净；假 FSA 落盘 163 B，含新增段落且保留 `| 列A | 列B |` 原字节；`write` 仅 1 次 `mix.md`。
3. `Esc` 回编辑：正文含新增段落；焦点回 `.ProseMirror`；脏仍 false；`table` 1 / `.katex` 2 / Mermaid `svg` 1 全保留；编辑块不再 `hidden`。
4. 打 `REG65` 后 `Ctrl+Z`：文本 151→156→151，`REG65` 消失。

## B. B-137 大纲跟随（跟随 / 手滚 / 页签 / 跳转）

夹具 `long.md`（51 行，面板 120–872）。

1. 初始 `scrollTop=0`、当前条「甲章」在容器内。
2. 真鼠标点正文 h2「第40节」：`scrollTop=466`，当前条 rect 832–856 全在容器内。
3. 手滚 200，停 600 ms 不被抢回。
4. 切「文件」再回大纲：行 51、无报错；`scrollTop=466`（重挂载后重对齐，不属回归）。
5. 点大纲「第8节」：`scrollTop=216`，当前条 rect 122–146 在容器内。

## 备注

- 第 26 项（跳转后焦点）只记录不断言：焦点仍在正文（DIV）；不计入证据。
- 首次运行切文档被脚本自身遗留脏状态挡（确认框），补「不保存」分支后全过；脚本问题，非产品回归。
- 未验证照旧：真宿主 WebView2、真实 FSA、中文 IME、150%/200% 缩放。
