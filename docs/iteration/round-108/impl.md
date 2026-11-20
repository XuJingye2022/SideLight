# 第 108 轮执行报告（A1）

状态：**A1 DONE**（唯一，回滚 0）。起跑 `a8ffa57`。

## 改动
- `src/components/MarginRail.tsx:704`（1 行）：静态 `aria-live="polite"` → `aria-live={busy ? 'off' : 'polite'} aria-busy={busy}`；`role="log"`/`aria-label`/`ref`/结构不动。
- `src/lib/chat.test.ts`：+1 条源码机械门（`readFileSync` 读 `MarginRail.tsx`，按 `<div className="rail-chat-log"` 切到下一个 `>`，断动态 live、`aria-busy={busy}`、不含静态 polite、`role="log"`/`className` 各恰 1；起点按 H-1 改）。12 → 13 条。
- 无 CSS/App/ai.ts 改动；`git diff --stat` 只这 2 文件。

## 静态（改前→改后）
`aria-live="polite"` 1 行(:704) → **0**；`busy ? 'off'` 0 → **1**；`aria-busy={busy}` 0 → **1**。红/绿对照 `.tmp/r108-red-probe.mjs`(+`.log`)。

## 门禁
| 项 | 改前 | 改后 | 上限 |
| :--- | ---: | ---: | ---: |
| 门 gzip | 315,173 | **315,171** | ≤315,183 |
| MarginRail chunk raw / gzip9 | 19,086 / 6,762 | 19,108 / **6,778** | ≤6,825 |
| 合计 | 321,935 | **321,949** | ≤322,010 |

- `npx tsc --noEmit` exit 0；`npm test` **62 文件 873 条 0 fail**（改前 872，chat.test.ts 12→13，`.tmp/r108-npm-test.log`）。
- `npm run verify` PASS（门 315,171，raw 1,022,573）；`node scripts/measure-first-screen.mjs --max 315183` exit 0（headroom 12）。
- chunk `dist/assets/MarginRail-D54bhGqh.js` raw 19,108 / gzip9 6,778（`gzipSync level:9`）。

## 真机 `.tmp/e2e-r108-a1-live.mjs`（ego CDP 57270、1440×900、5175、无 Key mock）**17/17**、0 pageerror（`.tmp/r108-e2e-a1-live.json`）
- characterData **16** 条（childList 3、attributes 4）；**15** 条落在 `off`+`true`；第 16 条与末批属性切换同批（t=2592）＝计划允许的 ≤1 条，**不判红**。
- 时间线：首属性 off+true t=2259 早于首 characterData t=2279；末 polite+false t=2592；首/末 polite 各 1 条。
- 恰 2 条 `.rail-chat-turn`、`.is-assistant` 1 条；`.is-assistant` 内「看看这一段」**1** 次；回复 48 字、以「（模拟回复）你问的是「看看这一段」。」开头、无累积。
- 焦点回 `.rail-chat-input`、发送钮 disabled、`role`/`aria-label` 不变。
- 回归：`.tmp/r96-tester-a1a2.mjs` **42/42**、`.tmp/r104-tester-indep.mjs` **25/25**。
- 截图 `shots/round-108/chat-live-off.png`（40,204 B，流式中：用户气泡 + assistant 半截「（模拟回复）」，截图时 live=off / busy=true）。截中途靠页面侧把 mock 的 20 ms 计时器拖到 130 ms，产品代码不动。

## 给 test.md（CR-2 ②/CR-5）
- 门 **315,171** / chunk **6,778** / 合计 **321,949**；`BRIEF:8` 与用户参数的 312,423 / 余 7,577 是第 93 轮旧数（实测 315,173 / 4,827）。320,000 硬线已被 B-229 超 **1,935**，本轮净 **+14 B**，未新增破线口径。
- **已知后果（显式接受）**：off 期间累积文本多数读屏不缓存、切回 polite 不重播 → 收流后不播报整条回复，最坏完全听不到。本轮只说「流式期间不再逐字播报」，**不声称修复播报完整性**（建议立 B-237）。H-3：`setBusy(true)` 与用户 turn 同批，用户刚发那句也不播报（影响可接受）。真读屏无 AT → **UNVERIFIED**，只做 DOM 契约。

## CHANGELOG 一行建议
`- 对话流式回复期间不再逐字播报：aria-live 随 busy 切 off/polite，另带 aria-busy。`

## 新踩坑
1. 本机 `Get-Content` 读 LF 文件少算行（`MarginRail.tsx` 895 个 `\n` 只给 872 行，行号偏 20+）：核行号用 `Select-String`/node/`read`；`Tee-Object` 仍写 UTF-16LE，`npm test` 日志要 `toString('utf16le')`。
2. `.tmp/r96-tester-a1a2.mjs` 与 `.tmp/r104-tester-indep.mjs` 会覆盖已跟踪历史截图 `shots/round-96/rail-chat.png`、`shots/round-104/instruction-kept.png`，跑完必须 `git checkout --` 还原（同 `keyboard-acceptance` 的既有坑）。
3. 机械门切片起点只能是 `className="rail-chat-log"`：`role="log"` 在其后，从 role 起切不含 className（H-1）。

## 返修记录（executor-fix，第 108 轮）

- `test.md` **无 FAIL 项**（判定 PASS），失败清单为空 → **未改任何产品代码**；返修前工作树即与 `8bd39b5` 一致（`git status --porcelain` 0 行），`git show --stat HEAD` 只含本轮 11 个文件。
- 按角色复跑门禁（零改动基线复核，本机）：
  - `npx tsc --noEmit` exit 0（无输出，`.tmp/r108fix-tsc.log`）。
  - `npm test` **62 文件 873 条 0 fail**（`.tmp/r108fix-test.log`；`ℹ fail 0` 62 行、`ℹ tests` 求和 873），与 `test.md` 一致。
  - `npm run verify` **PASS**：门 gzip **315,171 B**、raw 1,022,573、headroom 4,829、max 320,000（`.tmp/r108fix-verify.log`）；超内部预算 5,171 B 只 WARN。
  - `npm run roundtrip` **未跑**：本轮零改动，未动编辑器/序列化（与 `test.md` 同口径）。
- 范围外未处理（不属失败清单）：**B-238**（`aria-live="off"` 期间累积文本不重播整条回复，P2 已登记）、**B-229**（门 315,171 + 常驻 `MarginRail` chunk 6,778 = 321,949，超硬线 **1,949 B**，仍 `open`）——留给根代理/后续轮，本轮不改体积口径。
