# 第 108 轮计划审查（r2，复审修订版）

**结论：PASS**。上一版 CR-1～CR-5 全部修掉；无 P0/P1；4 条 P2，按 PASS-WITH-NOTES 收。H-1 建议开工前先改一句，否则新机械门 `npm test` 必红（不判 P1：红在实现期自曝、自纠约 1 分钟，不进 tester 的验收轮）。上一版原文存档 `plan-review-r1.md`。

## 旧 5 条：逐条已修
- **CR-1（P1）体积**：plan.md:12 三上限改「改前值 + 预算」：门 ≤315,183（+10）、chunk ≤6,825（+63）、合计 ≤322,010（+75）；315,183+6,825 = 322,008 ≤ 322,010 自洽。未照抄 315,240 而取 315,183，理由成立（315,240+6,825 = 322,065 会越合计）。独立复核：门 **315,173**、chunk gzip9 **6,762**（raw 19,086）、真实首载 **321,935**（超硬线 1,935），与计划三数逐项相同。
- **CR-2（P1）读屏**：选 ②。步骤 1 双属性（off/polite + `aria-busy={busy}`）；风险 3 改显式已知后果（收流后最坏完全听不到、不声称修复播报完整性、另立 B-237），验收 ⑦ 同记。
- **CR-3**：验收 ④ 改在 `.rail-chat-turn.is-assistant` 内计 1，另断 2 turn / 1 assistant。
- **CR-4**：机械门收到 role="log" 开标签内部 + `role="log"` 恰 1；意图已修，切片起点写错见 H-1。
- **CR-5**：收口要求 test.md 记实测三数、下一轮 scribe 更正 BRIEF；本轮不动 BRIEF。

## 新漏洞（全 P2）
- **H-1（建议先修）** 机械门切片「`role="log"` 到下一个 `>`」不含 `rail-chat-log`：`className="rail-chat-log"` 在 `role="log"` **之前**（`src/components/MarginRail.tsx:704`）。探针 `.tmp/r108-critic-probe.cjs` 实测 `hasRailChatLog:false`（输出 `.tmp/r108-critic-probe.json`）→ 照计划写必红。修：起点改 `<div className="rail-chat-log"`（同探针 `altHasAll:true`，三条断言都在），或只断「`role="log"` 恰 1 + `className="rail-chat-log"` 恰 1」。
- **H-2** 「合计 +≤70」与上限 +75 差 5 B；若 tester 兼断净增 ≤70，落在上限内的实现（门 +10、chunk +63）会红。修：预算写 +≤75，或删「+≤70」只留 ≤322,010。
- **H-3** 风险 1 说法不成立：用户 turn 与 `setBusy(true)` 同一次 commit（`MarginRail.tsx:186-191`），属性与 childList 同批变 off，读屏连用户那句也不播。修：改写成「用户刚发的那句也不播报（影响可接受）」并记 test.md，免得下轮当回归或当证据。
- **H-4** mock 预条件不稳：57270 是持久 profile，若存过假 Key（第 96 轮用过），`streamChat` 走远端 401、characterData=0 假红。修：流式前断言 `.rail-chat-mock` 存在（`:702` 仅 `!hasKey` 渲染），否则清 `localStorage['sidelight.settings.v1']` 重载，或照 r96 自写假 SSE。

## 判为没问题
- 范围/红线：只 `MarginRail.tsx` 两属性 + `chat.test.ts` +1 条（12→13；全链 62 文件 872→873）；不碰 CSS/App/ai.ts/main bundle，无新依赖，不 push，版本不动。
- 类型：`aria-live` 的 'off'|'polite' 可赋；`aria-busy` 收 boolean（React 序列化 "true"/"false"），build 不因类型红。
- 回归：`r96:98` 只取 log 节点、无 aria 断言；`r104` 0 命中 aria-live/aria-busy；src 里 `aria-live` 共 3 处（App:6332、GlobalSearch:101、MarginRail:704），无测试断言该 log 的属性。
- 体积：两属性 raw +约 32 B，gzip9 余 63 B 够；门只受懒 chunk 哈希影响。`host/bin/` 在 .gitignore，build 镜像 www 不污染 `git diff --stat`。
- 25 分钟可行：约 10 行改动 + 1 条机械门 + 现成 e2e 模板。
