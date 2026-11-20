# 第 121 轮计划（单轮，1 个问题）· revision 1

- 修订：按 `plan-review.md` H1/H2/H3 改验收步骤与体积口径；A1/A2 范围不变。
- 轮前 startSha `b93b79154f64558d0adb61bbc9fb1e14e030939f`（= HEAD，工作树干净，只有未跟踪的 `docs/iteration/round-121/`）
- 唯一条目：B-251（P2｜可访问性）`.rail-diff-close` 与 `.rail-goal-retry` 低于 24×24

## 执行顺序（H1 的修法，硬性）

1. A2 步 1：在**未改动的 HEAD 树**上追加 2 条测试，跑 `node --experimental-strip-types src/lib/touchTargets.test.ts` → **2 红 3 绿**（存 `.tmp/r121-red-head.log`）。
2. A1：改 `src/styles.css` 的两条声明（**此刻才动 CSS**）。
3. A2 步 2：同一命令 → **5/5 绿**（`.tmp/r121-green.log`）。
4. A2 步 3 E2E → 步 4 注入对照 → 步 5 键盘回归。

**禁止用 `git checkout` 还原 `styles.css`**：改动未提交时取回的是 b93b791 版，两条声明消失（旧计划的「随后 5/5 绿」因此自相矛盾）。备份用整文件拷贝：改后先 `cp src/styles.css .tmp/r121-styles.edited.css`，还原只许 `cp` 回。

## 基线（本轮实测）

- 首屏 gzip **315,546 B**（`measure-first-screen.mjs`；JS 970,372+783 raw、CSS 52,653 raw / 10,125 gzip；合计 raw 1,023,808；余 4,454；`PASS`）。
- 测试 64 文件 907 条；`touchTargets.test.ts` 3/3；`styles.css` 的 `min-height: 24px` 10 行。

## 体积（H3：两个口径都记）

只改 2 条 CSS 声明；在现 dist CSS 上按同法复算（`.tmp/r121-planner-size.mjs`）：raw **52,653 → 52,685（+32）**、gzip **10,125 → 10,131（+6）**。

- **门值 315,546 → ≈315,552 B**：验收用 `--max 315600`，硬线余 ≈4,448。
- **真实首载 322,965 → 322,971 B**（315,552 + chunk 7,419，仍超硬线 2,971）。impl 与 test 都写这一格，注明 B-229 仍 `open`、本轮不动。
- 无 JS 变化；测试文件不进包 = 0 B。

## A1｜B-251 两处可点高度 ≥24×24（`src/styles.css`；执行顺序排在 A2 步 1 之后）

1. `:1442-1448` 的 `.rail-diff-close` 块加 `min-height: 24px;`。该类由「对比」（`MarginRail.tsx:860`）与「在审」（`:914`）共用，改 1 处覆盖两个面板的 × 钮。
2. `:3431-3438` 的 `.rail-goal-retry` 块加 `min-height: 24px;`。
3. 宽度、padding、font-size、line-height 一律不动（`*{box-sizing:border-box}`，24×19 → 24×24；72×18.6 → 72×24）。
4. 每块加 1 行注释（照 `:1329-1331` 写法，压缩时剥掉，0 B）。

验收：`git diff -U0 -- src/styles.css` 只有 `+` 行——2 条声明 + 2 行注释，`-` 行 0；`min-height: 24px` 计数 **10 → 12**，反面对照改前 `:1442`、`:3431` 两块内 `min-height` **0 处**；`npm run build` 后 `node scripts/measure-first-screen.mjs --max 315600` PASS；`npm run verify`、`npm test`。

## A2｜机械门 + 真机几何

文件：`src/lib/touchTargets.test.ts` 追加 2 条（既有 3 条不动）；新 `.tmp/e2e-r121-targets.mjs`（照 `.tmp/r107-tester-geom.mjs`）。

1. **先写测试**：复用 `rules()/declarations()/targetSizes()`，取 `.rail-diff-close`、`.rail-goal-retry` 各自的规则块（断言各**恰 1 块**），要求写 `min-height` 或 `height` 且 ≥24，并断言块内不出现 `width`/`min-width`（「宽度不动」口径）。在 HEAD 树上跑 → 2 红 3 绿。
2. A1 改完后同命令 → **5/5 绿**。
3. 真机几何（ego CDP 57270、1440×900，先 `node .tmp/reset.mjs 57270`）：
   - ① 点 `.rail-diff-open` → `.rail-diff-close` **24×24**（改前 24×19，对照 `.tmp/r119-finder-ui.json` 的 `diffAria.closeSize`）；Esc 关闭并回焦入口；`.rail-diff-sheet` 高 ≤ 0.8×innerHeight + 1。
   - ② 点 `.rail-review-open` → 同类关闭钮 **24×24**（对照 `reviewAria.closeTarget`）。
   - ③ 造 `.rail-goal`：点选一段正文 → `Ctrl+Enter`（无 Key 走 `mockItems`：`ai.ts:284,295` → `App.tsx:1768` → `MarginRail.tsx:505`）→ `.rail-goal-retry` **72×24**（改前 72×18.6）；**`.rail-goal` 高 34±1**（改前 28.6；换行必 ≥52）；另断 `retry.top ≤ label.bottom`（同一行的充分判据）；`.rail-goal` 与 `.margin-rail` 的 `scrollWidth − clientWidth = 0`、卡片互不重叠、末卡底 ≤ 整体评价顶（r94/97 口径）。
   - ④ 0 pageerror / 0 console error。
4. 「高度真来自新规则」对照（照 r79/r82 做法）：临时注入 `min-height:0 !important` → 19 / 18.6（`.rail-goal` 回 28.6），撤掉回 24 / 34。
5. **H2① 回归：第 120 轮 B-250 的键盘滚动不能坏**。照 `.tmp/e2e-r120-diff-kb.mjs` 的夹具（点首段 → 60 次短句 + `Enter` → 点 `.rail-diff-open`，得 119 行、`scrollH 2380 / clientH 540`）再造一次，断三条：① `Tab` 从 `.rail-diff-close` 落到 `.rail-diff-rows`；② `ArrowDown` 后 `scrollTop > 0`；③ `scrollHeight > clientHeight`。夹具拿不到就在 impl 写 **UNVERIFIED**，不得当已验。

验收：`npm test` 64 文件 **907 → 909 条** 0 fail；`npm run verify`；①②③ 几何值、`.rail-goal` 高、步 5 的 3 条与 UNVERIFIED 状态逐项写进 `docs/iteration/round-121/impl.md`。

## 风险（每条都有对应断言）

- `.rail-diff-head`（`align-items: baseline`）的关闭钮 19→24 会把 head 撑高 ~5 px：① 记 sheet ≤80vh，步 5 记 119 行仍超出。
- `.rail-goal` 行高 28.6 → 34（+5.4，只在有「我的理解」时出现）：③ 断高 34±1 + 不重叠 + `scrollWidth` 0。**不许写 `retry.offsetTop === label.offsetTop`**——baseline 对齐下 24 px 钮的文字盒居中，其 top 比 label 高约 2.7 px，严格等式恒假；用 `retry.top ≤ label.bottom` 或高度。
- 不加 `min-width`：关闭钮宽已 24（fix_hint「宽度不动」）。

## 本轮不做

B-229（门 + 常驻 chunk 超硬线）、B-252（暖纸徽标 4.02:1）、B-253（窄窗抽屉 z 序）各占一轮。不 push、不改 `release/`、不动版本号（0.32.1）。
