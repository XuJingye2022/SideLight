# 第 138 轮 impl（executor）

## 任务状态

| 任务 | 档 | 状态 |
| :--- | :--- | :--- |
| 联网核对默认自动（P1，AI） | 快车道 | **DONE** |

B-229 / B-253 不在本轮由我做。

## 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/autoVerify.ts` | **新增**：`VerifyState`、`VERIFY_CONCURRENCY=2`、`verifyQuery`（搜索词单源）、`autoVerifyTargets`（按 id 去重）、`runVerifyPool`（限并发、单条抛错不打断）。纯函数，不 import `search.ts`（它仍是惰性 chunk） |
| `src/lib/autoVerify.test.ts` | **新增 13 条**：`verifyQuery` 3、去重 2、池子 5（每条约一次/顺序/峰值 2/limit 夹取/空数组/抛错不打断）、接线静态门 3（App 恰 1 处 `autoVerify(freshTargets)` 且不 await、`search.ts` 仍只动态 import；MarginRail 无 `verifyingId`、3 处读状态、「重新核对」恰 1 处、有出处不渲染按钮） |
| `src/App.tsx` | `verifyingId` → `verifyStates: Record<id,'verifying'\|'failed'>`；抽 `verifyOne`（手动/自动同一条搜索，`silent` 控提示）；新 `autoVerify`（无 Key return → 全标 verifying → 跑池子）；`runAnalysis` 收尾（未中止）调 `autoVerify(freshTargets)`，分段与全文总评两条落卡路径都记 |
| `src/components/MarginRail.tsx` | 入参改 `verifyStates`；`(annotation.sources?.length ?? 0) === 0` 才渲染按钮，字样 `核对中…` / `重新核对` / `联网核对` |
| `package.json` | `npm test` 链尾挂 `autoVerify.test.ts` |

`src/lib/ai.ts` 没改：搜索在惰性 chunk `search.ts`（不能静态 import），纯函数单开模块。

## 命令结果

- `npx tsc --noEmit` exit 0；`autoVerify.test.ts` **13/13**
- `npm test` exit 0：**70 文件 968 条 0 fail**（`.tmp/r138-npm-test.log`）
- `npm run verify` exit 0 PASS：门 gzip **315,611**（raw 1,024,210、headroom 4,389）、常驻 `MarginRail-DANUDNjd.js` gzip9 **7,838**、真实首载 **323,449**（超硬线 3,449，归 B-229，默认门仍 PASS）；对第 137 轮同 commit 基线 315,286 / 7,795 / 323,081 净 **+325 / +43 / +368 B**（`.tmp/r138-verify.log`）
- `roundtrip` 不跑（未动编辑器/序列化）

真机 `.tmp/e2e-r138-auto-verify.mjs`（ego CDP 57270；模型走本地模拟、搜索用假 fetch 拦 `api.tavily.com`，350 ms + 401 分支）**14/14**、0 pageerror/console error（`.tmp/r138-e2e-auto-verify.json`）：

- **A 有 Key**：分析收尾（按钮已回「分析本段」）时第一笔搜索才开跑（正文不等搜索）；3 卡同屏「核对中…」且禁用、0 出处；3 条各自动挂出处且**0 次点击**；请求 3 次、**并发峰值 2**；成功卡无按钮；搜索词 = 原文 + 批注。
- **B 401**：另起一段分析，新卡留「重新核对」、无出处，提示「搜索 Key 无效（401）…」，前 3 条不受影响。
- **C 无 Key**：**0 请求**，卡片留禁用的「联网核对」，无出处。

## 截图

`shots/round-138/auto-verify-{checking,sources}.png`。

## 偏差与残余

- 同窗口重跑会复用 id 且保留旧 `sources`（卡面不变），但仍按 `freshTargets` 再搜一次（多一次配额）；不按 sources 跳过是有意的（新解析对象没有 sources，判不准）。
- UNVERIFIED：真实搜索服务（只验假 fetch 的 200/401）、真 WebView2 宿主、真实中文 IME。

## CHANGELOG 一行建议

> 联网核对默认自动：配了搜索 Key 时分析结束自动核对出处（并发 2），卡片显示「核对中…」→ 出处；成功不留按钮，失败或没搜到才留「重新核对」，无 Key 跳过、不阻塞正文。

## 新踩坑

1. PowerShell 正则替换改含中文的 `.tmp/*.mjs` 会整份写成乱码（pwsh 7 也踩）——`.tmp` 脚本只用 write/edit。
2. `.tmp/*.json` 是真 UTF-8，但 `Get-Content -Raw | ConvertFrom-Json` 按 ANSI 读成乱码并报语法错——用 `[Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes(...))`。
3. 验「失败留重新核对」不能在同一段落重跑（复用 id + 保留旧出处），要另起一段拿新 id。
