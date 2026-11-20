# 第 108 轮验收（tester 独立，未读 impl.md；本次为复验）

- 轮前 startSha `a8ffa57`；A1（用户 2026-11-20 队列「对话区」残留）：流式期间关 live、收流再开 + 行作用域机械门。
- **判定 PASS**（1 条明文允许的末批偏差、1 条显式已知后果、1 条 UNVERIFIED，均不构成 FAIL）。
- 本轮先前已有一次独立验收并 commit（`8bd39b5`，22/22 + 交付脚本 17/17）；本次按同一参数从零复跑全部门禁与真机，**未改产品代码**。

## 静态（改前对照）

| 断言 | HEAD `a8ffa57` | 工作树 |
| :--- | ---: | ---: |
| `aria-live="polite"`（静态） | **1 行**（`MarginRail.tsx:704`） | **0** |
| `busy ? 'off'` | 0 | **1** |
| `aria-busy={busy}` | 0 | **1** |
| `git diff a8ffa57 --stat -- src` | — | 只 `MarginRail.tsx`（1 行改）、`chat.test.ts`（+23） |
| `git diff a8ffa57 -- src/styles.css src/App.tsx src/lib/ai.ts` | — | **空**（0 行） |

`role="log"` / `aria-label="对话记录"` 两侧各恰 1；`chat.test.ts` 的 `test(` HEAD **12** → 工作树 **13**。

## 门禁（本次重跑，括号为改前值）

| 项 | 本次结果 | 日志 |
| :--- | :--- | :--- |
| `npm test` | **62 文件 873 条 0 fail**（改前 872） | `.tmp/r108-tester2-npmtest.log` |
| 机械门负向 | HEAD 版 `MarginRail.tsx` 副本 + 同一测试 → **1 红 exit 1**，报文 `actual` 即静态 polite 开标签（门非空转） | `.tmp/r108-tester2-neg-gate.log` |
| `npm run verify` | **PASS** | `.tmp/r108-tester2-verify.log` |
| `measure-first-screen --max 315183` | **exit 0**；门 gzip **315,171 B**（raw 1,022,573、headroom 12、余硬线 4,829） | `.tmp/r108-tester2-measure.log` |
| 常驻 `MarginRail-D54bhGqh.js` gzip9 | **6,778**（raw 19,108；改前 6,762、+16、上限 6,825） | `zlib.gzipSync(level:9)` 现量 |
| **合计（门 + chunk）** | **321,949**（=315,171+6,778；改前 321,935、+14；≤322,010） | 超硬线 320,000 **1,949**（B-229 open，只记） |

## 真机（本次自写 `.tmp/r108-tester2-live.mjs`：ego CDP 57270、1440×900、5175、无 Key mock 流）

**19/19、0 pageerror**（`.tmp/r108-tester2-live.json`、`.tmp/r108-tester2-live.log`）：在 `.rail-chat-log` 装 MutationObserver 后输入「看看这一段」回车。

- characterData **16**（childList 3、attributes 4）；其中 **15 条**落在 `aria-live="off"`+`aria-busy="true"`，末批 **1 条**与 off→polite 切换同批（t=2,587 ms，验收明文允许、不判红）。
- 时间线：首个 off 事件 t=2,254 早于首条 charData t=2,274；末次 polite+busy=false t=2,587 与末条 charData 同批。
- 收流后 `aria-live="polite"`、`aria-busy="false"`；恰 **2** 条 `.rail-chat-turn`、`.is-assistant` **1** 条；assistant 文本内「看看这一段」**恰 1 次**、以「（模拟回复）你问的是「看看这一段」」开头、48 字无累积。
- 焦点回 `.rail-chat-input`、发送钮 disabled、`role=log`/`aria-label=对话记录` 不变。
- 流式中截图 `shots/round-108/chat-live-off.png`（未命名.md、半截回复 len=15、live=off/busy=true、37,864 B）。
- 交付脚本 `.tmp/e2e-r108-a1-live.mjs` 本次复跑 **17/17**、0 pageerror（`.tmp/r108-tester2-delivered-e2e.log`）；首次独立验收 22/22 见 `8bd39b5`。

## 回归

- `.tmp/r96-tester-a1a2.mjs` **42/42**、exit 0（`.tmp/r108-tester2-r96-regress.log`）；脚本会覆盖 `shots/round-96/rail-chat.png`，跑完已 `git checkout --` 还原。
- roundtrip 未跑（未动编辑器/序列化）。

## 偏差与已知后果（不判 FAIL）

1. 末批 1 条 characterData 与 off→polite 属性切换同批（React 批处理）；验收明文允许，不影响「≥10 条时 off/true」。
2. **CR-2 ② 已知后果（显式接受）**：off 期间累积文本多数读屏不缓存、切回 polite 不重播——收流后不会播报整条回复，最坏完全听不到。本轮只交付「流式期间不再逐字播报」，**不声称修复播报完整性**；另立 B-238（deferred，见 BACKLOG）。
3. 体积：门 −2 B（chunk 哈希进主包入口串）、chunk +16、合计 +14，均在上限内；超硬线 1,949 是 B-229 既有状态，本轮只记。

## UNVERIFIED

真实读屏（无 AT）：动态 `aria-live`/`aria-busy` 是否即时被采纳只做了 DOM 契约；真 WebView2 宿主、真实中文 IME、真实模型流（按任务走无 Key mock）未跑。
