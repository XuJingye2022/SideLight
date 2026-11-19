# 第 107 轮执行报告（A1 + A2 · B-236）

startSha `4fc72b2` 一致，2 任务全 PASS，回滚 0；顺序 A2.1（src/ 干净）→A1→A2.2–A2.5。

## A1 三钮 `min-height: 24px` + 机械门 PASS

- `styles.css`：`:1332-1343` 同一块 `height: 16px`→`min-height: 24px`（其余声明与两条 margin 规则不动）；`:1492-1499` `.rail-chat-reset` 加 `min-height: 24px`；`:1329-1331` 注释按 plan 逐字重写（24 / +8 / 39 / 59→67）。
- 新 `src/lib/touchTargets.test.ts` 3 test：两入口同一规则块且 ≥24、`.rail-chat-reset` 同口径 + `margin-left: auto`、`.rail-head` 不写 `height`。**3/3**。
- 门会红：共享块临时还原 `height: 16px` → test1 红，还原后 3/3。
- `package.json` 链尾加一条：**61→62** 文件。
- 静态门：`min-height: 24px` **8→10 行**、`height: 16px` **3→2 行**（剩 `:1969`、`:3635`）。

## A2 真机几何 + 历史脚本 PASS

- 新 `.tmp/e2e-r107-targets.mjs`（before|after；假 FSA + 3 卡夹具，1440×900；另 1024×700 抽屉量横溢）。
- 改前 `.tmp/r107-targets-before.json`：head 16、两钮 35×16、tabs.top 166、tabGap 39、chromeBottom 59、间距 7、右缘差 0、chatHead 21、reset 52.5×21、发送 410.1875；两视口横溢 0。
- 改后 `.tmp/r107-targets-after.json` **16/16 PASS、0 pageerror**：三钮 35×24/35×24/52.5×24（宽 ±0）、head 24（+8）、tabs.top +8=head 增量、tabGap 39（增量 0）、chromeBottom 67、间距 7、右缘差 0、chatHead 24、发送 413.1875（+3）、两视口横溢 0、抽屉三钮 24。
- A2.3 3/3：对比面板开 1→Esc 关 0、焦点回入口、[inert] 0；在审面板开 1→关闭钮关 0；「新对话」disabled→1 字→清空回 disabled。
- A2.4 7 条：r100 `:379` 24±0.5、`:424` ≤24.5、`:427` 改判 `chromeBottom−headHeight=43±1.5`、`:428` ≤24.5（`:425` 39±1 未动）；r101 `:297` 24±0.5、`:333` 24±1、`:427` head 24±1 + 入口 24±0.5。`check(` 43/57 不变。
- 重跑 r100 **43/43**、r101 **57/57**（`.tmp/r107-r10{0,1}-rerun.log`）；跑完 `git checkout -- shots/round-100/ shots/round-101/`。
- 截图：`shots/round-107/targets-notes.png`、`targets-chat.png`。

## 门禁 / 体积

- `npx tsc --noEmit` 0；`npm test` **62 文件 872 条 0 fail**；未改编辑器/序列化，未跑 roundtrip。
- `npm run build` 0；`--max 315300` **PASS**：门 gzip **315,173**（raw 1,022,573；cap 余 127、超内部预算 5,173 只 WARN），比预计多 10。
- 10 B 不是 CSS：`git stash` 两文件重建 HEAD 得 **315,158**（=critic 基线）、CSS 10,022；本轮 CSS raw +20 / gzip **+5**。Entry JS raw 恒 969,694、264 B 不同——`__vite__mapDeps` 的 chunk 名随主 CSS 哈希换掉，gzip +10（文件名抖动）。
- 常驻 `MarginRail-*.js` raw 19,086 / gzip9 **6,762** 两侧一致（只差 8 B 入口文件名）。真实首载 **321,935**，超硬线 1,935 → **B-229 仍 open**。
- `git status --short` 产品侧 3 条：`M src/styles.css`、`M package.json`、`?? src/lib/touchTargets.test.ts`；`MarginRail.tsx` 0 行。

## 偏差

- plan-review P2-1（`MarginRail.tsx:371` 注释）未改：任务书要求「MarginRail.tsx 0 改动」，改了就破 3 文件门；生产构建剥注释，只影响可读性。
- 头高不变字面不可达：head 16→24、页签及后内容下移 8px、chromeBottom 59→67，由 r100/r101 覆盖；注释已写明。抽屉 head 仍 28（`.rail-close` 撑高）。
- CHANGELOG：右侧三钮补 24×24 可点口径（35×16→35×24、52.5×21→52.5×24），`.rail-head` 16→24、页签下移 8px（底差仍 39）；新增 `touchTargets` 机械门。

## 新踩坑

1. `page.evaluate` 里对元素直接取 `.left`/`.bottom` 是 `undefined`（差值得 `NaN`），先 `getBoundingClientRect()` 存 box。
2. 重跑 r100/r101 会覆盖 `shots/round-100/`、`shots/round-101/` 里的跟踪截图；跑完 `git checkout --` 还原。
3. 主 CSS 一变，入口 JS 的 `__vite__mapDeps` chunk 名全换（gzip ±10）；别算进自己改动，用 `git stash push -- <文件>` 重建量 HEAD。
