# 第 121 轮测试报告（tester 独立验收）

- 结论：**PASS**（1 个条目 B-251；A1 静态 / A2 机械门 + 真机几何两项任务全过，0 回滚）
- 轮前 startSha `b93b79154f64558d0adb61bbc9fb1e14e030939f`；验收时工作树改动：`src/styles.css`、`src/lib/touchTargets.test.ts`（+38/−0），`docs/iteration/round-121/`、`shots/round-121/` 未跟踪。
- 未读 `impl.md`；只核对其存在（3,777 B）与几何条目是否齐全，验证一律以自跑为准。

## A1 静态（B-251）

- `git diff -U0 -- src/styles.css`：**+4 / −0**（2 行注释 + 2 条 `min-height: 24px`），无删除行。
- `min-height: 24px` 全文件计数：HEAD（`git show HEAD:src/styles.css`）**10** → 工作树 **12**；`git show HEAD:` 两块内 `min-height` 0 处（反面对照）。
- `git diff --stat`：两文件 38 insertions(+)、0 deletions。

## A2 步 1/2：机械门

- 头树复现不碰工作树：把 `HEAD:src/styles.css` 与当前测试文件放进 `.tmp/r121-tester-headtree/`，`node --experimental-strip-types src/lib/touchTargets.test.ts` → **3 pass / 2 fail、exit 1**，失败两项恰为新加的 `.rail-diff-close`、`.rail-goal-retry`（报文「要写 min-height」）。
- 工作树同命令 → **5/5 绿**。断言含「`singleRule` 恰 1 块」「`min-height|height` ≥24」「块内禁 `width`/`min-width`」。

## 门禁

- `npm test`：**64 文件 909 条，909 pass / 0 fail**（逐文件汇总行求和；基线 907）。
- `npm run verify`：**PASS**，build 通过；首屏 gzip **315,553 B**（raw 1,023,840、files 3、距硬线 320,000 余 4,447）。
- `node scripts/measure-first-screen.mjs --max 315600`：**PASS**（余 47 B）。

## A2 步 3/4/5：真机（ego CDP 57270、1440×900）

自写 `.tmp/r121-tester-e2e.mjs` → `.tmp/r121-tester-e2e.json`：**24/24 PASS、0 pageerror / 0 console error**（先 `node .tmp/reset.mjs 57270`）。

- ① diff 关闭钮 **23.58×24**（高度即本轮 19→24；宽是子像素，r119 基线 `[24,19]` 为取整）、sheet **109 ≤ 721**（0.8×900+1）、Esc 关且 `[inert]` 0、焦点回 `.rail-diff-open`。
- ② 在审面板关闭钮 **23.58×24**、sheet 109。
- ③ `.rail-goal-retry` **72×24**；`.rail-goal` **320×34**（改前 28.6）；retry.top **214 ≤** label.bottom **235.30**；1 张卡 [296, 447.5] 无重叠；末卡底 **447.5 ≤** 整体评价顶 **460.19**；goal / `.margin-rail` 的 `scrollWidth−clientWidth` **0 / 0**。
- ④ 注入 `min-height:0 !important`：close **18.80**、retry **18.59**、goal **28.59**；撤掉回 **24 / 24 / 34**（证明高度来自新规则）。
- ⑤ 第 120 轮 B-250 回归夹具：**119 行**、`scrollHeight/clientHeight = 2380/540`、关闭钮 Tab → `UL.rail-diff-rows`、ArrowDown 后 `scrollTop 40 > 0`。
- 截图：本轮配额 2 张由执行方产出（`shots/round-121/targets-diff.png`、`targets-goal.png`），tester 不增拍，断言见 JSON。

## 回归

- `.tmp/e2e-r100-diff.mjs`：**43/43 PASS**（sheet 无横溢、1024 视口、末卡底 ≤ 整体评价顶、1 MB 400 行截断、0 控制台错误）。
- ⑤ 同时覆盖 B-250 键盘滚动。`roundtrip` 未跑（未动编辑器/序列化）。

## 体积（两个口径）

- 门 gzip **315,553 B**（plan 估 315,552，+1 为懒 chunk 哈希换名）。
- B-229 口径 = 门 + `dist/assets/MarginRail-C8Yy3L3b.js` gzip9 **7,414** = **322,967**（超首屏硬线 2,967，B-229 仍 `open`，本轮不动）。

## 偏差 / 未验

- 关闭钮宽 23.58 px ≈ 24（取整差，改前同值；B-251 fix_hint 明确「宽度不动」、只补高度）→ 不判 FAIL。
- UNVERIFIED：真实屏幕阅读器、真 WebView2 宿主、真实中文 IME、原生打印（与本轮纯 CSS 无关，未跑）。
- 失败项：无。
