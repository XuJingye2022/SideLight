# 第 118 轮执行记录 — B-244 对话记录区可聚焦

HEAD `8acf11a` → 工作区。状态：**A1、A2 全完成**。

## A1 加 `tabIndex={0}` + 机械门 + before/after

- 改动：`src/components/MarginRail.tsx:764` 开标签加 `tabIndex={0}`（单行 **1+/1−**、+12 字符）；
  `role`/`aria-*`/`ref` 与渲染结构不动，`styles.css` 不改。
- `src/lib/chat.test.ts` 24→**25**：同一开标签断 `tabIndex={0}`、无 `{-1}`、不按轮数条件化、`className` 恰 1 处。
  负向：`.tmp/r118-MarginRail.orig.tsx` 删该属性 → **1 红 exit 1** → 拷回 SHA256 `D747DD3C…` 同 → 25/25。
  静态全文件 `tabIndex={0}` **1→2**。
- **before**（改码前，`.tmp/r118-b244-before.json`，**7/8**，唯一 RED 是 plan R1 预期偏差）：`over:1027`、
  `clientHeight:600`、`log.attr:null`、`tabIndex:-1`、`focus()` 后 PageUp 减 **525**。**S0：空记录（未溢出）时
  Shift+Tab 落到 `BUTTON#rail-tab-chat`——键盘真到不了**；溢出后本机 Edge 157 有原生可滚容器 Tab 落点
  （B4 注入无 tabindex 可滚 div 同证），按 R1 记实测、不假绿。
- **after**（`.tmp/r118-b244-after.json`，**13/13**、0 pageerror）：`tabIndex===0`/属性 `"0"`、空态与溢出后
  Shift+Tab 都落 log、Tab 回输入框、outline **2px solid rgb(43,109,100)**、置底 PageUp **−525**/ArrowUp **−40**/
  Home→**0**/PageDown **+525**/End→**1027=max**、载入与收流后焦点都不是 log、`role`/`aria-label`/`aria-live`
  逐字不变、栏宽 **320**、横溢 **0**。截图 `shots/round-118/chat-log-focus.png`（焦点环 + 上翻中段）。
  dev 交付已核：`rail-chat-log` 片段含 `tabIndex: 0`（编译后）。
- 命令：`node --experimental-strip-types src/lib/chat.test.ts` **25/25**；`npx tsc --noEmit` exit 0。

## A2 回归 + 三数 + BACKLOG

- 回归：r96 **42/42**、r112 **10/10**、r111 **14/14**（`.tmp/r111-tester-focus.json` `allPass`）、
  e2e-r108 **17/17**、`keyboard-acceptance` **52/52**（`http://localhost:5175` + `SIDELIGHT_CDP=…:57270`）。
  注：计划写的 `.tmp/r108-tester-live.mjs` 实跑 **22/22**（17/17 是交付脚本 `e2e-r108-a1-live.mjs`），两条都跑。
  跑完 `git checkout -- shots/round-05 shots/round-96 shots/round-111 shots/round-112 shots/round-108`
  （r108 也改到），五目录 `git status --porcelain` 为空。
- 三数（基线 → 实测）：门 gzip **315,509 B**（Δ **0**，`--max 315800` exit 0 PASS、余 291；计划预期
  ≤315,539 ✓）；`MarginRail-eN3hT9po.js` raw **20,971**（+11）、gzip9 **7,391**（Δ **−1** ≤+32 ✓）；
  B-229 合计 **322,900**（Δ **−1**，超硬线 2,900，B-229 仍 open）。
- `npm test` **62 文件 897 条 0 fail**（`.tmp/r118-npm-test.log`）；`verify --max 315800` exit 0
  （`.tmp/r118-verify.log`）。
- `git diff --name-only`：`MarginRail.tsx`、`chat.test.ts`、`BACKLOG.md`；B-244 `open`→`fixed`，未新增条目、
  未动 B-229/B-233/B-238/B-246/B-248。`roundtrip` 未跑（未动编辑器 / 序列化）。

## 新踩坑（2 条）

1. **Playwright `page.screenshot()` 清掉本 CDP 会话的 `Emulation.setDeviceMetricsOverride`**：after 首跑截图后
   视口 1440×900→1280×720，`max-height:calc(100vh-300px)` 600→420，PageDown 步长 525→367、End 的 max
   1027→1207。截图挪到键盘断言之后才确定；按视口算 max-height 的断言不要中途截图。
2. **本机 Edge 157 对可滚动容器有原生 Tab 落点**：`tabIndex:-1` + `overflow-y:auto` 的记录区**溢出后**
   能 Shift+Tab 聚焦、**空态则不行**。判「Tab 到不了」要测空态，不能只看 `tabIndex` 或只测溢出态。

## CHANGELOG 建议一行

对话记录区可聚焦：Tab 进 / 出记录区，聚焦后 PageUp / PageDown / Home / End / ↑ 回看历史，2px 焦点环
