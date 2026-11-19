# 第 107 轮计划（revision 1 · 单轮 · 只做一条）

> revision 1：按 `plan-review.md` 修 P1-1、P2-2～P2-6，任务与范围不变。**新实测**（ego 57270/1256×808，注入探针量完即撤）：head 16→24、`.rail-tabs` top 166→174、**tabs 底 − head 底 仍 39**（原写 47 错，改它会假红）、tabs 底相对栏顶 59→67、两钮 35×24、reset 52.5×24、chatHead 21→24、发送钮 +3。
> **顺序**：A2.1 改前量测（`src/` 干净）→ A1 → A2.2–A2.5。

- 107 轮；startSha `4fc72b2`（HEAD，除 `round-107/` 干净）；backlog_id **B-236**（新建，tester 验后 `fixed`）
- 唯一问题（P2 可访问性）：`.rail-diff-open` 35×16、`.rail-review-open` 35×16、`.rail-chat-reset` 52.5×21 低于 24×24 口径
- 改前基线（1256×808；门槛只用增量）：head 16、间距 7、右缘差 0、chatHead 21、发送钮 369
- 体积：门 gzip **315,158 B**（`measure-first-screen.mjs --max 315300`；硬线余 4,842、超内部 5,158 只 WARN）；任务书 312,423/7,577 已过期

## 体积先算（硬线 320,000，只改 CSS）

| 口径 | 现在 | 预计 | 差 |
| :--- | ---: | ---: | ---: |
| 门（304,686 + 450 + CSS 10,022） | 315,158 | **315,163** | **+5** |
| 常驻 `MarginRail-*.js` | 6,762 | 6,762 | 0 |
| 真实首载（门 + chunk） | 321,920 | 321,925 | +5 |

+5：两规则落到现成 `dist` CSS 再 gzip9 实测（10,022→10,027）。注释被剥、测试不进包 → 0 B。真实首载仍超 1,925（B-229）。

## A1：三钮补 `min-height: 24px` + 机械门

改 `src/styles.css:1332-1343`、`:1492-1499`、`:1329-1331`（注释）；新增 `src/lib/touchTargets.test.ts`；`package.json` test 链尾。

1. 两钮块：`height: 16px` → **`min-height: 24px`**（其余声明与两条 margin 规则不动）。
2. `.rail-chat-reset`：`padding: 2px 8px` 后加 **`min-height: 24px`**（宽仍 52.5、高 21→24）。
3. 注释 `:1329-1331` **整段重写**（P2-3：原「16px 小钮 / 头高 15/16 与底差 39 都不动」改后为假），逐字：
   `/* 第 100 轮 B-227：只读 diff 入口，第 107 轮起 min-height 24（24×24 口径，宽仍 35）。`
   `   批注页签 head 16→24、.rail-tabs 及之后整体下移 8px（tabs 底 − head 底 仍 39、`
   `   tabs 底相对栏顶 59→67）是已知偏差；不给 .rail-head 定高；面板定位独立于 .margin-rail */`
4. `touchTargets.test.ts` 3 个 `test`（照 `mathStyle.test.ts` 切规则 + 摘注释）：两入口**同一规则块**、`min-height` ≥24（有 `height` 也须 ≥24）；`.rail-chat-reset` 同口径且 `margin-left: auto` 在；`.rail-head` **不得**写 `height`。
5. test 链尾加 `&& node --experimental-strip-types src/lib/touchTargets.test.ts`。

验收：脚本 3/3；`npm test` **869→872 条 / 62 文件** 0 fail（改前 61/869）；静态门 `min-height: 24px` 8→**10 行**、`height: 16px` 3→**2 行**（剩 `:1968`、`:3634`；别拿 0 命中当门）；`npm run build` + `--max 315300` PASS（预计 315,163）；`git diff` 只 3 文件、`MarginRail.tsx` 0 改动。

风险：10.5px 字在 24px 框里偏小（同第 79 轮口径）。**删掉「超 cap 可改 height: 24px」退路**（P2-4：测试要 min-height，退路自相矛盾；实测 +5 B、cap 余 137）。

## A2：真机几何 + 历史脚本阈值

产物：`.tmp/e2e-r107-targets.mjs`（新，`--phase before|after`）、`e2e-r100-diff.mjs`/`e2e-r101-review.mjs` 断言、`shots/round-107/targets-{notes,chat}.png`。

**A2.1 改前量测（先于 A1，`src/` 干净）**：`--phase before` → `.tmp/r107-targets-before.json`。`Emulation.setDeviceMetricsOverride` 固定 **1440×900**（1256×808 只作对照），量三钮 rect、head、tabs、间距、右缘差、chatHead、发送钮。

**A2.2 改后（同口径 `--phase after` + 差表），门槛只断增量**：三钮高 **≥24**（宽 ±1）；head **24±0.5**、增量 +8±0.5；`.rail-tabs` top 增量 = head 增量 ±0.5；**tabs 底 − head 底 增量 0（仍 39±1）**；间距 **7±0.5**、在审右缘 = head 右缘 **±1**；对话页签 chatHead **24**、reset 52.5×24、发送钮 top 增量 = chatHead 增量（+3）±1；`.margin-rail`／`.rail-head` 横溢 0（1440×900 与 1024×700 抽屉）。

**A2.3 功能回归**：点「对比」开面板 → Esc 关、焦点回入口；点「在审」开面板（空态）→ 关闭钮关；对话页签「新对话」空态 disabled → 输入 1 字 enabled → 点它清空并回 disabled。

**A2.4 历史脚本只改断言（7 条，P1-1 补齐）**
- `e2e-r100-diff.mjs`：`:379` 入口 16→**24±0.5**；`:424` head ≤16.5→**≤24.5**；`:425` tabGap **保持 39±1 不动**；`:427` 上限 59.5 改判不变量 **`chromeBottom − headHeight` = 43±1.5**（59−16 / 67−24；或 `≤67.5`）；`:428` `maxChild ≤16.5`→**≤24.5**
- `e2e-r101-review.mjs`：`:297` 入口 16→**24±0.5**；`:333` head 16±1→**24±1**；`:427` head→**24±1**、入口→**24±0.5**
- 重跑：补齐后应全绿 —— r100 **43/43**、r101 **57/57**（`check(` 数不变）；贴日志路径。其余已核（r102–r106）无写死 16/58/59.5/410.19 断言

**A2.5 证据**：截 **2 张**（P2-5：两页签互斥），脚本内 `page.screenshot`（1440×900）：`targets-notes.png`（批注页签 head+两钮）、`targets-chat.png`（对话页签 head+「新对话」）。0 pageerror。

## 不做 / 已知偏差

- 不动 TSX、不给 `.rail-head`/`.rail-tabs` 加规则、不动 margin；不做其它入口审计。
- **「保持头高不变」字面做不到**：24px 控件在非定高 flex 行里把行撑到 24（+8），`.rail-tabs` 与其后内容整体下移 8px，由 r100/r101 重跑覆盖。拒绝负 margin/伪元素扩热区（矩形仍 16）。此偏差写进 test.md 与 `:1329-1331` 注释。
- `MarginRail.tsx:371` 的 `{/* …16px 高… */}` 本轮不改（改它动常驻 chunk，与 0 B 门冲突），记 test.md。
- 抽屉（≤1119px）head 由 `.rail-close` 撑高（≈30），本轮不变高，只验三钮 ≥24 与无横溢。
- 不 push、不改 `release/`、不碰 B-229 口径。
