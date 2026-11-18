# 第 72 轮 · Typora 对照（finder-typora）

- 基准 HEAD `4cccb03`；dev `http://localhost:5175`；CDP 9223
- 结论：**0 条新 P0/P1**；3 个对照点与差距表计数都通过，另报 3 条 P2。
- 日志/脚本：`.tmp/r72-log.txt`、`.tmp/r72-log-u.txt`、`.tmp/r72-ref-hits.txt`、`.tmp/e2e-r72-typora[-u|-shot].mjs`
- 截图：`shots/round-72/typora-table-align-1280.png`、`shots/round-72/typora-table-align.png`

## 1. 核对结论（无缺陷）

| 对照点 | 参考 | 实测 | 判定 |
| :--- | :--- | :--- | :--- |
| 表格列对齐 | `.tmp/typora-ref/resources/Docs/Table Editing.md:68-74`（GFM `:---`/`:---:`/`---:`） | 载入后 `th`/`td` computed `text-align` = left/center/right；改字 `Ctrl+S` 落盘仍是 `\| :--- \| :---: \| ---: \|`（`tableSepKept:true`，toast「已保存 对照.md」） | 通过，差距表「表格行列」行不用改 |
| 硬换行（行尾两空格） | `Markdown Reference.md:15` | 编辑视图 `p br` 2 个；落盘保留行尾两空格 | 通过 |
| Setext 标题渲染 | `Markdown Reference.md:9-12` | `=` 下划线渲染 `<h1>`、`-` 渲染 `<h2>` | 渲染通过（保存规范化见 F2） |

差距表计数复算：`已经有的（39）`=39 行、`缺的（5）`=5 行、缺表三子节 2+1+2=5，**自洽**（B-112/B-117 计数问题已收敛）。过期的是角色文件，见 F3。

## F1（P2，文档）差距表漏行：Typora 的 `<u>` 下划线，Sidelight 显示字面标签

- Typora：`Markdown Reference.md:342-346`「Underlines … `<u>Underline</u>` becomes underlined」。
- Sidelight 白名单只有 4 标签：`src/lib/inlineHtmlTags.ts:8`（`kbd/mark/sub/sup`）。
- 实测 `u.md`（`.tmp/r72-log-u.txt`）：`u` 元素 0 个，段落文本是字面 `Typora 用 <u>下划线</u> 表示强调。`；保存不丢字节（`uKept:true`，55 B）。
- 差距表无 `下划线`/`<u>` 字样（`have_hasUnderline:false`）。

影响：用户看到标签原文，不是下划线；数据不丢。差距表「行内 HTML」行读起来像完整清单。

建议：该行补一句，或「缺的」加一行 `下划线 <u>`（P2）；若做，`u` 进白名单并补往返用例。

## F2（P2，编辑/文档）setext 标题与反斜杠硬换行被规范化，保存前对比没提示

`.tmp/r72-log.txt`（同一文档一次 `Ctrl+S`）：

- `Setext 一级`+`==========` → `# Setext 一级`；`----------` → `## Setext 二级`（下划线行被删）。
- `反斜杠换行：\` → 行尾两个空格（`backslashKept:false`）。
- 没弹对比框，toast 直接「已保存 对照.md」；长度 144→129 字符。语义没变（`<br>`、H1/H2 都在），字节与行号变了。
- 与 `docs/typora-gap.md:22`「保存前把被规范化的行列给你看」不一致——这两类规范化不进对比。按行号引用（审稿/批注）会错位。

建议：BACKLOG 记 P2，差距表「标题」行注明「setext 归一为 ATX」；或让保存前对比覆盖这两类。

## F3（P2，流程）角色文件还写「缺的 9 行」

`.tmp/iteration/roles/finder-typora.md:7`：「只报『缺的 9 行』…」，差距表已是 `## 缺的（5）`（`docs/typora-gap.md:51`）。后续 finder 按旧数找行会重报已收敛项（B-112 就是计数过期）。
建议：改成 5 行，或改写成「按 `docs/typora-gap.md` 的『缺的』一节」不写死数字。

## 未验证

- Typora 的 Resize Table 拖拽手感（`Table Editing.md:60-64`）没与 Sidelight 表头拖拽对比。
- 真 Typora.exe 未启动；对照取自其安装目录 `resources/Docs` 与 `shots`。
- 只取 3 个对照点，未跑全表。
