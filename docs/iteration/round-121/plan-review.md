# 第 121 轮计划审查（critic）

结论：**REVISE**（1 条 P1、2 条 P2。产品方向、范围、体积与红线均无问题，改法只动验收步骤）

## 已核对成立

- 两处规则块存在且都**没有** `min-height`：`src/styles.css:1442-1448`（`.rail-diff-close`：`padding:0 6px; font-size:14px; line-height:1.2`）、`:3431-3438`（`.rail-goal-retry`）。共用类在 `src/components/MarginRail.tsx:860`（对比）与 `:914`（在审），改 1 处确实覆盖两个面板的 × 钮。
- `*{box-sizing:border-box}`（`styles.css:131`），全局 `button` 只有 1px 边框（`:170-180`），所以 `min-height:24px` 就是总高 24：`24×19→24×24`、`72×18.6→72×24` 的推法成立。
- 源码 `min-height: 24px` 现 **10** 处；dist CSS（`index-BA7NIf0p.css`，52,653 B）里 `min-height:24px` 同 10、`/*` **0** 处 —— 「加 2 行注释压缩时 0 B」成立。
- 首屏基线实测 **315,546 B**（`scripts/measure-first-screen.mjs`，headroom 4,454），测试 907 条见 `docs/iteration/round-120/test.md:9`，均与计划一致。
- 测试复用面成立：`touchTargets.test.ts` 已有 `rules()`/`declarations()`/`targetSizes()`（:26/:45/:63）与 3 条用例，追加 2 条即 909。
- E2E 参照值可查：`.tmp/r119-finder-ui.json` 的 `diffAria.closeSize [24,19]`、`reviewAria.closeTarget [24,19]`、`smallTargets` 的 `rail-goal-retry 72×18.6`。`.rail-goal` 来源链成立：`src/lib/ai.ts:284/295` mock meta → `src/App.tsx:1768 setAnalysisGoal` → `MarginRail.tsx:505`；`Mod-Enter` 走 `analyzeRef`（`App.tsx:984`）。
- 范围与红线：只加 2 条 CSS 声明 + 测试/脚本，无新依赖、无版本与发布改动，符合「本轮只做」。体积净增（+32 raw / +6 gzip）估计可信，门值 ≤315,600 距硬线仍 4,448 B。

## 漏洞

### H1｜P1｜负向控制的还原步骤会连本轮改动一起还原

A2 第 2 步在 A1 改完 CSS 后把 HEAD 版拷成 `src/styles.css`，再 `git checkout -- src/styles.css`。此刻改动**未提交**，`git checkout --` 从 index/HEAD 取回的是 `b93b791` 版：两条 `min-height` 消失，随后「5/5 绿」不可能成立（仍 2 红），必须重做 A1。计划自己的验收文字前后矛盾。

修法：负向控制改成 TDD 顺序 —— 先在 HEAD 干净工作树上加 2 条测试跑出 2 红，再改 CSS 跑 5/5 绿；或改后备份 `.tmp/r121-styles.edited.css`，用拷贝还原，验收里禁止出现 `git checkout -- src/styles.css`。

### H2｜P2｜风险里两条没有对应验收步骤

「风险」写了 `.rail-goal` 行高 28.6→34、第 120 轮 B-250 的 diff 行键盘滚动不能坏，但 A2 的 ① 只断关闭钮、③ 只断 retry 72×24 与卡片不重叠，两条风险都没有断言。

修法：③ 加 `retry.offsetTop === label.offsetTop`（或 `.rail-goal` 高度 34±1）证明 320 px 栏内不换行；① 用第 120 轮的 119 行夹具补一次「Tab 到 `.rail-diff-rows` 后 ArrowDown `scrollTop>0`」。拿不到夹具就在报告写 UNVERIFIED，别把风险当已验。

### H3｜P2｜体积只记门口径，B-229 的真实首载基数会过期

+6 B 落在首屏 `index-*.css`，B-229 的真实首载口径 322,965 → 322,971（315,552 + 常驻 chunk 7,419）。计划只记门值 315,552，不提这一格，下一条体积条目会拿旧基数比。

修法：impl/test 同时写门值 315,552 与真实口径 322,971，注明 B-229 仍 `open`、本轮不动。
