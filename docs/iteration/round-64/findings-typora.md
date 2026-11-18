# 第 64 轮 Typora 对照侦察（finder-typora）

- 环境：dev `http://localhost:5175`、CDP 9223、startSha `368431c`（HEAD 同）、只读，未改产品代码。
- 结论：差距表计数 **39/5 自洽**；5 项「已有」实测通过，**无新 P0/P1**；发现 3 个缺表漏项 + 1 行过期（全 P2）。

## 1. 计数核对：通过

`.tmp/r64-gapcount.mjs`（输出 `.tmp/r64-gapcount.json`）：`已经有的（39）` 实际 39 行；`缺的（5）` 实际 5 行，子节断言 2/1/2 合计 5；`README.md:101`、`AGENTS.md:74` 同为 39/5。无过期。

## 2. 实测通过项（5 条）

| 差距表行 | 实测 | 日志 |
| :--- | :--- | :--- |
| `docs/typora-gap.md:25` 字号缩放 | 17→19→18→17 px（`Ctrl+=` 两下、`Ctrl+-` 一下、`Ctrl+Alt+0` 复位） | `.tmp/r64-typora.log` |
| `:44` 视图缩放 | `Ctrl+Shift+=` 状态栏「缩放 110%」；`Ctrl+Shift+0` 回「缩放 100%」 | `.tmp/r64-typora-b.log` |
| `:41` 粘贴为纯文本 | 剪贴板写「HTML 标题+粗体/斜体，text/plain」后 `Ctrl+Shift+V`：`h1=0 strong=0 em=0`、纯文本落正文；对照 `Ctrl+V` `strong=1` | `.tmp/r64-typora.log` |
| `:15` 专注模式 | 三段文档开专注：前两段 `is-dimmed` opacity 0.28，当前段 1，`aria-pressed=true` | `.tmp/r64-typora-c3.log` |
| `:31` 表格 | 源码模式载入 `:---` / `:---:` / `---:` 表格：单元格 `text-align` left/center/right，草稿仍是 `|:---|:---:|---:|` | `.tmp/r64-typora-d.log` |

另：`Ctrl+P` 浮层可开、`Esc` 回正文（`.tmp/r64-typora-b.log`）。

## 3. Findings（全 P2）

**F1 缺表漏「下划线」**（`docs/typora-gap.md:51-71` 无此行）。Typora `resources/Docs/Markdown Reference.md` 的 `### Underlines`：「Underline is powered by raw HTML. `<u>Underline</u>` becomes 下划线」。实测 Sidelight 按字面：敲 `前<u>下划线</u>后`，编辑器 `u` 元素 0、innerHTML 为 `<p>前&lt;u&gt;下划线&lt;/u&gt;后</p>`（`.tmp/r64-typora-c3.log`）。另有 `:42` 只写四个白名单标签，未点名 `<u>`。建议缺表加一行「下划线 `<u>` | 无（按字面显示）| P2」；若做，扩行内 HTML 白名单并补往返字节测试。

**F2 缺表漏「sequence / flowchart.js 图表」**。Typora `resources/Docs/Draw Diagrams With Markdown.md:7-25` 用 ` ```sequence `（js-sequence）与 ` ```flow `（flowchart.js）两套语法；Sidelight `:34` 只写 Mermaid。实测两个围栏按普通代码块显示：`code.className = language-sequence` / `language-flow`，`svg=0`、mermaid 块 0（`.tmp/r64-typora-e.log`）。建议缺表加一行 P2；若做须再引两库，受红线 6（依赖需批准）与惰性 chunk 约束。

**F3 缺表无「拼写检查」**。`src/App.tsx:894` 硬设 `spellcheck: 'false'`，浏览器实测 `.ProseMirror` 属性 `false`（`.tmp/r64-typora-c3.log`）；Typora 有内置拼写检查（`resources/Docs/Change Log.md` 多次记 spellcheck panel / 非英语支持）。Sidelight 主动关闭，需产品决定：补一行 P2（开英文检查）或在表里写明「有意关闭，避免中文误报」。

**F4 过期行：`:33` 自动保存与草稿恢复**（第 63 轮 B-120 改过行为）。表现写「每次改动写本地草稿」，实际草稿计时器 2,500 ms（`src/App.tsx:1071`、`:3464`），自动保存成功先清计时器（`:3001-3003`）——开着自动保存时停笔不写草稿。建议改为「停笔约 2.5 s 写草稿；自动保存开启且成功时不写草稿（第 63 轮 B-120）」。

## 4. 说明

- 未做截图（结论均为命令日志，无需像素证据）。
- `.tmp/iteration/roles/finder-typora.md:7` 仍写「缺的 9 行」，当前缺表是 5 行，建议同步角色文案。
