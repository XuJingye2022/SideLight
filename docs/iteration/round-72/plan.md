# 第 72 轮两轮计划（planner）

- 轮次：72（nn=72）；报告目录 `docs/iteration/round-72/`
- 轮前 startSha：`4cccb03`（`round-71: B-152 delta 回归与跨目录/列表态补测全绿（无代码改动）`），`git log -4` 核对一致
- 环境：dev `http://localhost:5175`（不另起、不重启）；CDP 9222（不启 Edge、不 kill msedge）；E2E 前 `node .tmp/reset.mjs 9222`
- 输入：`BRIEF.md`、`BACKLOG.md`、本轮 5 路 Top 摘要（未读完整 findings）、`git log -4`

## 1 发现池复核（open P0/P1 计数）

| 检查 | 命令/位置 | 结果 |
| :--- | :--- | :--- |
| P0 表 | `BACKLOG.md:9-13` | 表头下 0 行，无 P0 |
| P1 表 | `BACKLOG.md:16-55` | 31 行状态全为 `fixed`，仅 `B-135`（`:43`）为 `deferred` |
| open/planned 全池 | `^\| B-\d+ \| (open\|planned) \|` → 10 命中 | 行 62/65/66/68/69/70/71/72/73/77，全部落在 `## P2（路线图，open）` 段（`:56-81`） |
| 侦察结果 | 本轮 5 路 Top | 新 P0/P1 = **0**（bug 0 / code 0 / ui 0 / ship 0 / typora 只有 P2） |

`B-135` 不计入可排 P1：状态 `deferred`，需新增运行时依赖（红线 6 须产品负责人批准），且首屏余量承不住高亮 chunk；属路线图项，不是本轮 P0/P1。

## 2 结论

停止条件成立（`common.md:34`：`任意一轮 5 路侦察合计 0 个新 P0/P1，且 BACKLOG 没有 open 的 P0/P1`）。P2 不阻塞停止（`BACKLOG.md:6`、`BRIEF.md:14`）。

**A 轮 0 任务，B 轮 0 任务。** 不派 executor / tester / scribe 修码；不改产品代码、不改 `release/`、不 push。

| 轮 | 任务数 | 说明 |
| :--- | :--- | :--- |
| A | 0 | 无 P0/P1 可排；不拿 P2 凑轮次 |
| B | 0 | 同上；A 轮无改动，B 轮 delta 回归无对象 |

## 3 本轮 P2 去向（不排任务，供 lead/scribe 归档）

| 侦察路 | P2 条目（摘要） | 池内对应 |
| :--- | :--- | :--- |
| bug | 模态挡住自动保存时写的草稿，保存成功后不清理 | 已在池：`B-153`（`:102`，deferred） |
| ui | 设置面板内容溢出 152 px | 已在池：`B-150`（`:78`，deferred） |
| ui | 字数面板 Tab 后焦点到 BODY | 已在池：`B-151`（`:79`，deferred） |
| ui | 主题 4 项 role=radio 无 tabindex、方向键不动 | 已在池：`B-109`（`:68`，open） |
| ui | 两个新小点击区（「知道了/追问/联网核对」类） | 已在池：`B-110`（`:69`，open） |
| typora | 差距表漏 Typora 下划线 `<u>` 一行 | 未入池 |
| typora | setext 标题与反斜杠硬换行保存被规范化，保存前对比不提示 | 未入池 |
| typora | 角色文件仍写「缺的 9 行」，差距表已是 5 行 | 未入池 |
| code | `settleSourceComposition` 拦退分支清掉组合标记 | 未入池 |
| code | 同一路径 `.sidelight/drafts/<名>` 保存成功后被删两次 | 未入池 |
| ship | `release/` 旧产物仍在，便携线没有同批门 | 未入池（`B-125` 只覆盖 setup 线） |
| ship | 本轮文档差值：首屏数字落后 128 B | 未入池 |

建议：未入池 7 条由 lead 交 scribe 写进 `BACKLOG.md` 的 `deferred`（带文件:行号与轮次 72），**不排代码任务**。角色文件与差距表文案两条同属文档，可与 `B-140` 一批收尾。

## 4 停止前门禁（不属任务，由 lead/tester 收口）

`BRIEF.md:16`：停之前仍要跑

```
npm run verify   # build + 首屏 gzip（红线 ~310,000 B 内部 / 320,000 B）
npm test         # 基线 40 文件 520 条
```

本轮只读侦察、无 `src/` 改动，预期与 `4cccb03` 同值；若首屏实测与 `BRIEF.md:7` 的 301,886 B 有差值，按 ship 路记录（P2，不阻断）。`npm run roundtrip` 本轮无序列化改动，不跑。

## 5 风险与未做

- 风险：把 7 条未入池 P2 误当本轮任务，会拖回「为凑轮次做 P2」——本轮明确不做。
- 未做：未读 5 份 findings 全文；未复跑 finder 的 E2E（planner 只读代码与文档）。
- 停止判定依赖本轮侦察摘要（新 P0/P1 = 0）；若 lead 复核出任何 P0/P1，需重开本轮计划。
