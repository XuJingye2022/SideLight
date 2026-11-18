# 第 66 轮 · Typora 对照（finder-typora）

- 时间：2026-11-18 11:45；HEAD `8314072`（= 轮前 startSha）
- 环境：dev `http://localhost:5175`、CDP 9223（每步前 `node .tmp/reset.mjs 9223`）
- 脚本：`.tmp/e2e-r66-typora.mjs`；原始输出 `.tmp/r66-finder-typora.json`（两次运行同值）；截图 1 张：`shots/round-66/typora-table-code.png`
- 对照点：Typora「Table Editing」的建表/列对齐/行列拖动（`.tmp/typora-ref/resources/Docs/Table Editing.md:20-26,64,70`）、`Markdown Reference.md:136`（表工具条可 resize/align/delete）、代码围栏语言高亮（`Code Fences Language Support.md`）

## F1（P2，新）差距表漏「表格编辑」三项能力，且界面只能靠源码写列对齐

实测（`.tmp/e2e-r66-typora.mjs`）：

| 对照点 | Typora | Sidelight 实测 |
| :--- | :--- | :--- |
| 敲表头行回车建表 | 有（`Table Editing.md:20-26`） | `\|甲\|乙\|` + `Enter` → `.ProseMirror table` **0**，仍是 1 段字面 `\|甲\|乙\|` |
| 工具条设列对齐 | 有（`:64`） | 表工具条 7 钮：上插入/下插入/左插入/右插入/删行/删列/删表，`alignCapable:false`（`src/App.tsx:5427-5453`） |
| 拖拽移动行列 | 有（`:70`） | 无入口 |
| 列宽拖拽（已有项） | 有 | 表头边界拖动 77 → 124 px，差异表 `:31` 成立 |

GFM 对齐语法本身保真：源码写 `| :--- | :---: | ---: |` 再切回编辑，三列表头 computed `left/center/right` 正确；缺的只是「界面设对齐」与「拖动排序/回车建表」两条便利路径。建表本身有入口：工具栏「表格」插 3×3（`src/App.tsx:5200`）。

建议：差距表「已经有」的 `:31` 行补备注，或「缺的」补一行 `| 表格列对齐 / 行列拖动排序 / 敲表头回车建表 | 无（对齐只能源码手写） | P2 |`；同时补缺表子节计数（2→3）。新建条目建议 `B-140`（P2，deferred，不阻塞停止）。

## F2（复核，不计数）代码围栏仍无语法高亮，B-135 状态不变

` ```js ` 围栏实测 `<code class="language-js">`、`span` **0**、整块 **1 种颜色** `rgb(29, 32, 35)`；与第 62 轮一致。B-135 已是 `deferred`（`STATE.md:66`：加运行时依赖需产品负责人批准，红线 6），状态维持，不新增条目。

## 差距表计数核对（不计入新条目）

`node .tmp/r58-docs-check.mjs`：`headHave 39 = haveCount 39`、`headMiss 5 = missCount 5`、子节 declared/actual = 2/2、1/1、2/2、`missRowSum 5` —— 计数自洽，无过期计数。逐行抽样核对 `:31`（Ctrl+L 删行）静态成立：`src/App.tsx:931-933`。唯一需改的是 F1 的表格行缺失。

## 已在池，不重复计数

- `:smile:` emoji、`<img width>` 图片缩放、自定义快捷键、自定义主题：缺表 P2 + `B-106`/`B-103`/`B-107`/`B-105`，本轮未复测（第 62 轮已测，状态未变）。

## 结论

新 P0/P1 **0 条**；新 P2 1 条（F1 差距表补行）。差距表计数无需修。
