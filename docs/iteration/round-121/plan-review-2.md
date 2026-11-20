# 第 121 轮计划审查（critic · 第 2 次，审 plan.md revision 1）

结论：**PASS**。第 1 次的 H1/H2/H3 全部修掉，无新增 P0/P1。2 条 P2 备注不阻塞。
第 1 次审查（REVISE）留档在 `docs/iteration/round-121/plan-review.md`。

## H1｜已修（负向控制不再还原本轮改动）

- 执行顺序改成 TDD：先在 HEAD 树加 2 条测试 → **2 红 3 绿**（`.tmp/r121-red-head.log`），再改 CSS → **5/5 绿**；明令禁止 `git checkout -- src/styles.css` 并写出原因，还原只许整文件拷贝。
- 基线干净：`git rev-parse HEAD` = `b93b79154f64558d0adb61bbc9fb1e14e030939f`，`git status --porcelain` 只有 1 行 `?? docs/iteration/round-121/`，`git diff` 空 → 「HEAD 树上的红」是真红。
- 两处规则块实测都没有 `min-height`/`height`（`src/styles.css:1442-1448`、`:3431-3438`），所以 2 条新测试在 HEAD 上必因「没写高度」而红，不会因「找不到规则块」而红。
- 第 ④ 步用页面注入 `min-height:0 !important`（→ 19 / 18.6）做对照，撤掉后复测 24 / 34，替掉了原来自相矛盾的「拷 HEAD 版」。

## H2｜已修（两条风险都有断言）

- 「`.rail-goal` 28.6 → 34」：③ 断高 **34±1**，另断 `retry.top ≤ label.bottom`。计划拒绝 `retry.offsetTop === label.offsetTop` 的理由成立：`.rail-goal` 是 `align-items: baseline`（`styles.css:3409`），24 px 钮的文字盒居中，其 top 比 label 高 2.7 px，严格等式恒假；34±1 已能区分单行与换行（换行 ≥52）。我按 CSS 复算：padding 10 + 行盒 max(24, 18.6) = 34，与计划一致。
- 「B-250 键盘滚动不能坏」：第 5 步断三条（Tab 从关闭钮落到 `.rail-diff-rows`、ArrowDown 后 `scrollTop>0`、`scrollHeight>clientHeight`）。夹具可查：`.tmp/e2e-r120-diff-kb.mjs` 第 70-73 行就是「60 句 → 119 行 / 2380 / 540」；`.rail-diff-rows` 确已带 `tabIndex={0}`（`src/components/MarginRail.tsx:875`），三条断言不是空闸。

## H3｜已修（两个口径都写）

- 门值 **315,546 → 315,552**（`--max 315600`）；真实首载 **322,965 → 322,971**（+ 常驻 `MarginRail-*.js` 7,419），并注明 B-229 仍 `open`、本轮不动。
- 独立复核三格全对：`node scripts/measure-first-screen.mjs` 实测 total gzip **315,546**（raw 1,023,808、CSS 52,653/10,125、余 4,454、PASS）；`gzipSync(dist/assets/MarginRail-D1qNoJ-u.js, {level:9})` = **7,419**；`.tmp/r121-planner-size.mjs` 得 raw +32、gzip **+6** → 315,552。

## P2 备注（不阻塞，执行时顺手做）

- **N1 缺截图**：AGENTS.md 要求「界面变了要截图」，第 120 轮计划也带 `shots/round-120/diff-kb-scroll.png`。本轮改了两处可点区高度，建议 A2 步 3 加 1 张 `shots/round-121/targets.png`（`.rail-goal` 行 + 对比面板头）。
- **N2 复用现成脚本**：第 5 步「照 … 再造一次」建议直接 `cp .tmp/e2e-r120-diff-kb.mjs` 改断言。夹具就在盘上，「夹具拿不到 → UNVERIFIED」这个出口本轮不该走。
