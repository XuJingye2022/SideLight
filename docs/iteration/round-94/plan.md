# 第 94 轮计划（planner · rev.1）· 右侧双页签：对话 / 批注（队列第 1 条 / 轮前 `1e99d82`）

> rev.1（2026-11-20）按 `plan-review.md` 修 5 条：P1-1 chrome 底进 floor、P1-2 对齐验收改可复现式、P1-3 气泡段移出 guard、P2-1 BACKLOG 已补 B-221（planned）、P2-2 补 spacer/整体评价不重叠。对话页签只放空态 + 禁用输入；←/→ 切换；右侧宽可到 320px。

## 首屏体积（硬线 320,000；当前 312,423，余 7,577）
`MarginRail.tsx` 懒 chunk +0；`App.tsx` ≈**+140 B**；`styles.css` 8 条 **+119 B**（探针实测）；`260→320px` +0 → 合计 ≈**+260 B** → 312,68x B。门槛 `npm run verify` **≤313,000 B**（内部 310,000 只 WARN），超了先删 hint。

## A1 右侧 tablist + 对话占位 + 批注面板收口
- backlog B-221；文件 `src/components/MarginRail.tsx`（+约 60 行）、`src/App.tsx`（约 12 行）。
- 步骤：
  1. `App.tsx:456` 后加 `const [railTab, setRailTab] = useState<'chat'|'notes'>('notes')`（默认「批注」）。
  2. 布局 effect（`:2377-2430`）：顶部 `if (!editor || sourceMode) return` 与末尾气泡段（`:2417-2429`：有选区 → `coordsAtPos` → `setBubble`，否则 `setBubble(null)`）**不动**（P1-3）；只给 flowBottom/tops/railSpace 加 `if (panel && !panel.hidden)`（`panel = rail.querySelector('.rail-panel-notes')`）；chrome 底（P1-1）`flowBottom` 起点 = `max(.rail-head 底, .rail-tabs 底) − railRect.top`（≥0），再按 `panel.children` 循环（跳过 `note`/`rail-overall`/`rail-cards-space` 不变）；top 删硬底 40 改 `Math.max(natural, floor+12)`（floor 起点即 flowBottom）；`setRailSpace`/`setTops` 留 guard 内，dep 加 `railTab`。
  3. `<MarginRail>`（`:5901`）传 `railTab`/`onTabChange`；`.rail-head` 后插 `div.rail-tabs[role=tablist][aria-label="侧灯页签"]` + 两个 `button[role=tab]`（`id=rail-tab-<tab>`、`aria-selected`、`aria-controls=rail-panel-<tab>`、roving `tabIndex`、`is-active`；`onKeyDown` 只认 ←/→/Home/End → `onTabChange` + rAF 聚焦，照 `App.tsx:5710-5740`）。
  4. 现有内容（goal/notice/empty/卡/spacer/`rail-overall`）包进 `div#rail-panel-notes[role=tabpanel]`，`hidden={railTab !== 'notes'}`，**不加 `position`/`overflow`**（卡 top 仍参照 `.margin-rail`、`.rail-overall` 仍 sticky）；新增 `div#rail-panel-chat[role=tabpanel]`，`hidden={railTab !== 'chat'}`：空态复用 `.rail-empty-title/-sub` + `.rail-chat-hint`「输入框下一批接入」+ 禁用的 `.rail-chat-compose`（input + 发送钮）。禁用是刻意的。
- 验收：
  1. `npm run build` 过；`git grep -n 'role="tablist"' --untracked -- src/components/MarginRail.tsx` = 1；`git grep -nE 'railTab|rail-panel-notes|rail-panel-chat' --untracked -- src/App.tsx src/components/MarginRail.tsx` ≥ 6。
  2. E2E `.tmp/e2e-r94-a1-rail-tabs.mjs`（ego CDP 57270；`setContent` 灌 3 段夹具，每段 3 句 70–90 字、第二段第二句带逗号；先 `localStorage.clear()`+reload）。场景 A（无 Key，点第二段后点「分析本段（模拟）」）：
     - 页签：2 个 tab、默认「批注」选中、chat 面板 hidden；←/→/Home/End 换选且焦点跟；对话面板 input/button 各 1 且 disabled、Tab 不落。
     - 几何：`natural` = 锚点句首行 Range 顶 − 栏顶，`flowBottom` = `max(.rail-head 底, .rail-tabs 底, 面板内流内子元素底) − 栏顶`。① 每卡 `top === max(natural, 上卡底+12)` ±1（首卡 floor=flowBottom）② 切页签往返首卡差 ≤1 px ③ 3 卡 top 递增、`next.top ≥ prev.top+prev.offsetHeight` ④ 首卡 ≥ 页签底+2 且中心 `elementFromPoint` 命中卡片。
     - 自然位分支（reload 后分析第三段）：首卡 `top === natural ±2` 且 `natural−flowBottom ≥ 40`。
     - spacer/整体评价（P2-2）：滚到底末卡底 ≤ `.rail-overall` 顶+1，往返后差 ≤1 px。0 `pageerror`；截图 `shots/round-94/rail-tabs-notes.png`。
  3. 场景 B（无 goal/notice，P1-1）：假 Key（`sidelight.settings.v1`=`{apiKey:'e2e', baseUrl:'http://localhost:5175/__mock'}`）后 reload 并重灌夹具；`page.route('**/chat/completions')` 只回一条 evaluation（无 meta）→ `.rail-goal`/`.rail-notice`/`.rail-notice-mock` 均 0、卡 ≥1，首卡 ≥ 页签底+2 且 `top === flowBottom+12 ±1`。toast 不断言。
- 门禁：`npm run build`、`npm test`（仍 57 文件 778 条）。
- 风险：按 `rail.children` 数 → 含 spacer/整体面板；按 `panel.children` → 丢页签高、压页签 18 px；「对话」不早退 → 卡高 0、切回重叠；气泡段留 guard 内 → 气泡不更新。

## A2 宽度 320px + 页签样式
- backlog B-221；文件 `src/styles.css`（`:309` 一值 + `.rail-empty-sub` 后 `:1305` 起 8 条）。
- 步骤：`.doc-layout` `260px→320px`；加 `.rail-tabs`（flex/gap 2/`margin:10px 0 2px`/底边 `--line`）、`.rail-tabs button`（flex 1/`padding:5px 8px`/上圆角 7px/`--text-xs`/`--ink-faint`）、`is-active`（`--paper-raised`/`--ink`/`inset 0 -2px 0 var(--accent)`）、`.rail-chat-empty`/`.rail-chat-hint`/`.rail-chat-compose` 及 input/button；窄窗（≤1119px）抽屉不动。
- 验收：① `npm run verify` 过且 gzip **≤313,000 B**；② `.tmp/r94-a2-css.mjs`：`.rail-tabs` 3 条 + `.rail-chat-*` 5 条齐全，`.doc-layout` 块 = `minmax(0, 36rem) 320px` 且该块 `260px` 改后 0 命中（改前对照 1）；③ 几何（A1 落地后）：1440×900 `.margin-rail` 宽 320±1、`.doc-scroll` 无横溢，1120×800 同且 `.doc-column` ≥420，1024×700 `.margin-rail` `display:none`；④ 截图 `shots/round-94/rail-width-1120.png`。
- 门禁：`npm run verify`、`npm test`（`export.test.ts`/`mathStyle.test.ts` 读 `styles.css`，不碰 `.sl-eq`/公式规则即不红）。
- 风险：dev 的 `/src/styles.css` Vite cache 不失效（第 54 轮坑）——先比交付字节或 touch，**不重启 dev server**。

## 范围外
5 档紧急度、批注状态机、`[AGENT]` 线程、快照/diff、Under Review、真实对话。不重构、不动 `release/`、不 push、0.32.1。
