# 第 108 轮验收（tester 独立，未读 impl.md）

- 轮前 startSha `a8ffa57`；A1（用户 2026-11-20 队列「对话区」残留）：流式回复期间关 live、收流再开，加一条行作用域机械门。
- **判定 PASS**（1 条明文允许的末批偏差、1 条显式已知后果、1 条 UNVERIFIED，均不构成 FAIL）。

## 静态（先贴改前对照）

| 断言 | HEAD `a8ffa57` | 工作树 |
| :--- | ---: | ---: |
| `aria-live="polite"`（静态） | **1 行**（`MarginRail.tsx:704`） | **0** |
| `busy ? 'off'` | 0 | **1** |
| `aria-busy={busy}` | 0 | **1** |
| `git diff --stat` | — | 只 `MarginRail.tsx`（1 行改）、`chat.test.ts`（+23） |
| `git diff -- src/styles.css src/App.tsx src/lib/ai.ts` | — | **空** |

`role="log"`、`aria-label="对话记录"` 两侧各恰 1；`.rail-chat-turn` 结构与 `styles.css` 0 改动。

## 门禁（自跑一次）

| 项 | 结果 |
| :--- | :--- |
| `npm test` | **62 文件 873 条 0 fail**（改前 62/872；`chat.test.ts` 12→**13**，`.tmp/r108-tester-npmtest.log`） |
| 机械门负向对照 | HEAD 版 `MarginRail.tsx` 副本 + 同一测试文件 → **1 红 exit 1**，报文 `actual` 正是静态 `aria-live="polite"` 开标签（`.tmp/r108-tester-neg-gate.log`）——门非空转 |
| `npm run verify` | **PASS**（build + 首屏；`.tmp/r108-tester-verify.log`） |
| `measure-first-screen --max 315183` | **exit 0、门 gzip 315,171 B**（raw 1,022,573、headroom 12；`.tmp/r108-tester-measure.log`） |
| 常驻 `MarginRail-D54bhGqh.js` gzip9 | **6,778**（改前 6,762，+16，≤6,825）；raw 19,108 |
| **合计（门 + chunk）** | **321,949**（改前 321,935，+14，≤322,010）；超硬线 320,000 **1,949**（**B-229 仍 open**，只记） |

体积口径：BRIEF:8 / 用户参数的 312,423 / 余 7,577 是第 93 轮旧数。本轮实际：门 **315,171**（余硬线 4,829）、chunk **6,778**、合计 **321,949**；门 −2 B（chunk 哈希进主包入口字符串）、chunk +16、合计 +14，全在预算（门 +10 / chunk ≤+63 / 合计 ≤+75）内。

## 真机（自写 `.tmp/r108-tester-live.mjs`，ego CDP 57270、1440×900、5175、无 Key mock 流，**22/22**、0 pageerror，`.tmp/r108-tester-live.json`）

在 `.rail-chat-log` 上装 MutationObserver（characterData + `aria-live`/`aria-busy` 属性），再输入「看看这一段」回车；脚本两跑均 22/22。

- ① characterData **16 条**（≥10，两跑同值）；观测到 16 个文字批次 + 4 条属性事件。
- ② 第 10 条起的 7 个批次全部 `aria-live="off"` + `aria-busy="true"`；首条 characterData 也已在 off/true（busy 先于流式落地）。**末批 1 条与属性切换同批**（两跑 `t=495/498 ms`、live=polite/busy=false）——验收明文允许，按允许记录、不判红。
- ③ 收流后 `aria-live="polite"`、`aria-busy="false"`；属性时间线 live `off→polite`、busy `true→false`。
- ④ 恰 **2** 条 `.rail-chat-turn`、`.is-assistant` **1** 条；assistant 文本内「看看这一段」**恰 1 次**（整 log 2 次，不按整 log 判）；以「（模拟回复）你问的是「看看这一段」」开头，`（模拟回复）` 恰 1 次（无重复累积），全文 48 字。
- ⑤ 焦点回 `.rail-chat-input`、发送钮 disabled、`role=log`/`aria-label=对话记录` 不变、0 pageerror。
- ⑥ 流式中截图 `shots/round-108/chat-live-off.png`（tester 重拍：`t=110/111 ms`、charTotal 5，截图前后 busy=true/live=off，气泡半截「（模拟回复）你问的是「看」）；CSS 无 diff。
- 交付脚本 `.tmp/e2e-r108-a1-live.mjs` 现场复跑 **17/17**、0 pageerror（`.tmp/r108-tester-delivered-e2e.log`）。

## 回归

- `.tmp/r96-tester-a1a2.mjs` **42/42**、exit 0（`.tmp/r108-tester-r96-regress.log`）；脚本会覆盖 `shots/round-96/rail-chat.png`，跑完已 `git checkout --` 还原。
- roundtrip 未跑（未动编辑器/序列化）。

## 偏差与已知后果（不判 FAIL）

1. 末批 1 条 characterData 与 off→polite 属性切换同批（React 批处理），验收明文允许并已记录；不影响「≥10 条时 off/true」。
2. **CR-2 ② 已知后果（显式接受）**：off 期间累积文本多数读屏不缓存、切回 polite 不重播——收流后不会播报整条回复，最坏完全听不到。本轮只交付「流式期间不再逐字播报」，**不声称修复播报完整性**；按 plan 另立条目由根代理收口登记（B-238，见 BACKLOG）。
3. BACKLOG 原无本条 ID（plan 未分配）→ 本轮按 max+1 补号 **B-237** 并标 `fixed`。

## UNVERIFIED

真实读屏（无 AT）：动态 `aria-live`/`aria-busy` 是否即时被采纳只做了 DOM 契约；真 WebView2 宿主、真实中文 IME、真实模型流（本轮按任务走无 Key mock）未跑。
