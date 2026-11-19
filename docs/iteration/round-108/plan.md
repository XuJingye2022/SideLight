# 第 108 轮计划（单轮，round=108，nn=108）

> 修订 r1（2026-11-20，planner-revision）：按 `plan-review.md` 的 CR-1～CR-5 修；单轮结构与任务范围（A1 一条）不变。

## 元信息
- 起跑 HEAD `a8ffa57`（第 107 轮），版本 0.32.1；dev `http://localhost:5175`（不另起、不重启）；CDP 9222–9226 无监听 → 真机走 ego CDP 57270（第 79/107 轮口径）。
- 本轮只做队列「右侧双页签 → 对话区」最后一条 P2：流式回复在 `aria-live="polite"` 区逐字更新，读屏重复播报累积文本。

## 实测基线（现场量，沿用 BRIEF 会算错）
- `.rail-chat-log` = `role="log"` + `aria-live="polite"` + `aria-label="对话记录"`，无 `aria-busy`（`src/components/MarginRail.tsx:704`；ego 57270、1256×808）。
- `node scripts/measure-first-screen.mjs`（dist 第 107 轮）：**门 gzip 315,173 B**（raw 1,022,573，余硬线 4,827）；`MarginRail-*.js` raw 19,086 / **gzip9 6,762**；**真实首载 321,935，已超硬线 1,935（B-229 open）**。BRIEF:8 的 312,423 / 7,577 是第 93 轮旧数。
- 体积预算与上限（CR-1，全部「改前值+预算」）：只改懒 chunk → 门 +0～+10、chunk +20～+60、合计 +≤70。上限：门 **≤315,183**（+10）、chunk **≤6,825**（+63）、合计 **≤322,010**（+75；`315,183+6,825=322,008 ≤ 322,010` 自洽）。CR-1 的门 315,240 与其「+10」矛盾，且与 6,825 相加为 322,065 会越过合计，故取 315,183。**320,000 硬线已被 B-229 超 1,935，本轮净增 ≤70 B、不新增破线口径**；tester 按合计判、不得只报门，test.md 给门 / chunk / 合计三数。不加 CSS、不碰 main bundle。

## A1（唯一任务）流式期间关 live，收流再开
- 文件：`src/components/MarginRail.tsx:704`（2 个属性）、`src/lib/chat.test.ts`（+1 条机械门）；不改 `.rail-chat-turn` 结构（`:711-715`）、`styles.css:1503` 起样式、`ai.ts`、`App.tsx`。
- 步骤：
  1. 删静态 `aria-live="polite"`，改 `aria-live={busy ? 'off' : 'polite'}` + `aria-busy={busy}`。`busy`：`:143`，`send()` `:191` true、`:211` finally false，`resetChat`/失败/中断回 false。
  2. `role="log"`、`aria-label`、`ref`、渲染结构不动（fix_hint：不动 message 结构与样式）。
  3. `chat.test.ts` 加 1 条读源码机械门（照 `touchTargets.test.ts`）：`readFileSync('src/components/MarginRail.tsx')`，取 `role="log"` 到下一个 `>` 的开标签子串（跨行成立），断言含 `rail-chat-log`、含 `aria-busy={busy}`、匹配 `/aria-live=\{busy\s*\?\s*['"]off['"]\s*:\s*['"]polite['"]\}/`、不含静态 `aria-live="polite"`；全文件 `role="log"` 恰 1（CR-4）。
- 验收（全部可执行）：
  1. 静态（先贴改前对照）：`Select-String -Path src\components\MarginRail.tsx -Pattern 'aria-live="polite"' -SimpleMatch` 改前 1 行（:704）→ 改后 0；同命令换 `-Pattern "busy ? 'off'"` 0→1、换 `'aria-busy={busy}'` 0→1；`git diff --stat` 只这 2 文件，`git diff -- src/styles.css src/App.tsx src/lib/ai.ts` 空。
  2. 单测：`npm test` → **62 文件 873 条 0 fail**（改前 872；`chat.test.ts` 12→13）。
  3. 真机 `.tmp/e2e-r108-a1-live.mjs`（ego 57270、1440×900、5175；无 Key 走 mock：`ai.ts:234-237` 每 3 字/20 ms）：点「对话」→ 对 `.rail-chat-log` 装 MutationObserver（childList+characterData+attributes，按时间带 `aria-live`/`aria-busy`）→ 输入「看看这一段」→ Enter。断言：
      - ① characterData **≥10**（改前 finder 记 18）；
      - ② **≥10 条** characterData 时 `aria-live="off"`、`aria-busy="true"`；允许收流最后一批 ≤1 条与属性切换同批（React 19 批处理），记 test.md、不判红；
      - ③ 收流后 `aria-live="polite"`、`aria-busy="false"`；
      - ④ 恰 2 条 `.rail-chat-turn`、`.is-assistant` 1 条；**在 `.is-assistant` 文本内**「看看这一段」**恰 1 次**（用户 turn 也含，整 log 恒 2 次，CR-3）；文本以「（模拟回复）你问的是「看看这一段」」开头、无重复累积；
      - ⑤ 焦点回 `.rail-chat-input`、发送钮 disabled、`role`/`aria-label` 不变、0 pageerror；
      - ⑥ CSS 无 diff + 截图 `shots/round-108/chat-live-off.png`（流式中）；
      - ⑦ test.md 同记：门 / chunk / 合计三数；CR-2 ② 已知后果（风险 3），不得声称修复播报完整性。
  4. 门禁与体积：`npm run verify` PASS；`node scripts/measure-first-screen.mjs --max 315183` 期望 exit 0（仅门越限而合计 ≤322,010 记偏差、按合计判）；chunk gzip9 **≤6,825**；**合计 ≤322,010**。
  5. 回归：`.tmp/r96-tester-a1a2.mjs` **42/42**（`:98` 只取节点、无 live 断言）；可选 `.tmp/r104-tester-indep.mjs` 25/25。
- 风险与残余：
  1. 用户 turn 与 `setBusy(true)` 同批；该次 childList 落在 polite 只播用户那句，不算本缺陷——验收只判 characterData。
  2. 真实读屏无 AT 可验：动态 `aria-live`/`aria-busy` 是否即时采纳 → **UNVERIFIED**，只做 DOM 契约。
  3. **CR-2 ② 已知后果（显式接受）**：off 期间累积文本多数读屏不缓存、切回 polite 不重播——**收流后不会播报整条回复，最坏完全听不到**。本轮只交付「流式期间不再逐字播报」，**不声称修复播报完整性**；test.md 同记，另立条目由根代理收口登记（建议 B-237）；要「完成后播整段」另轮改（① 保留 polite 只加 `aria-busy`，或加状态区）。
  4. 体积：chunk +≤63；门只受 chunk 哈希影响（±10）；B-229 已超线，不扩范围修。
- 收口（CR-5）：test.md 写实测三数与「BRIEF:8 / 用户参数 312,423 / 7,577 是第 93 轮旧数（实际 315,173 / 4,827）」；下一轮 `BRIEF.md` 由 scribe 更正，本轮不改 BRIEF/README/STATE。

## 不做什么
- 不动 CSS、不加 visually-hidden 状态区、不改 `ai.ts`/`App.tsx`/`BRIEF.md`、不 `git stash`、不 push、不改 `release/`、不加依赖；本轮只这 1 条。
