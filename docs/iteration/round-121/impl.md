# 第 121 轮执行报告（executor）

状态：A1 DONE、A2 DONE；门禁全绿。起点 `b93b791`，未 commit；CSS 未用 `git checkout` 还原（备份 `.tmp/r121-styles.edited.css`）。

## A1｜B-251 两处可点高度 ≥24（src/styles.css）

- `.rail-diff-close`（现 :1443，HEAD :1442）与 `.rail-goal-retry`（现 :3434，HEAD :3431）各 +1 行注释 + `min-height: 24px`；宽 / padding / 字号未动。
- `git diff -U0 -- src/styles.css`：**+4 / −0**；`min-height: 24px` **10→12**；`git show HEAD:` 两块内 min-height **False/False**（0 处）。

## A2｜机械门（src/lib/touchTargets.test.ts +34 行）

- 新 `singleRule`（恰 1 块）+ `assertTapTarget`（min-height/height ≥24、块内无 width/min-width）；追加 2 条。
- HEAD 树（CSS 未改）：`.tmp/r121-red-head.log` tests 5 / pass 3 / **fail 2**。
- A1 后：`.tmp/r121-green.log` tests 5 / **pass 5**。
- `npx tsc --noEmit` exit 0（`.tmp/r121-tsc.log`）；`npm test` **64 文件 909 条 0 fail**（907→909；`.tmp/r121-test.log`）。

## A2｜真机（ego CDP 57270、1440×900、`.tmp/e2e-r121-targets.mjs` **24/24 PASS**，`.tmp/r121-targets.json`）

- ① `.rail-diff-close` **23.6×24**（宽为取整差；改前 24×19）；sheet **109 ≤ 721**（0.8×900+1）；Esc 关、inert 0、焦点回 `.rail-diff-open`。
- ② 在审面板关闭钮 **23.6×24**；sheet 109 ≤ 721；点钮关、inert 0。
- ③ `.rail-goal-retry` **72×24**（改前 72×18.6）；`.rail-goal` 高 **34**（改前 28.6）；retry.top **214 ≤** label.bottom **235.3**；goal / rail 横溢 **0**；2 卡 [296,467.5] / [480,631.5] 不重叠；末卡底 **631.5 ≤** 整体评价顶 **644.2**。
- ④ 注入 `min-height:0 !important`：close **18.8**（第 119 轮记 19 为取整）、retry **18.6**、goal **28.6**；撤掉回 **24 / 24 / 34**。
- ⑤ 119 行夹具（scrollH 2,398 / clientH 540）：关闭钮 Tab→`.rail-diff-rows`（focus-visible）、ArrowDown `scrollTop 40 > 0`、scrollH>clientH；长 sheet **611 ≤ 721**。
- ⑥ 0 pageerror / 0 console error。截图 `shots/round-121/targets-goal.png`、`shots/round-121/targets-diff.png`。

## 体积（两个口径）

- 门 `measure-first-screen.mjs --max 315600` **PASS**：**315,546 → 315,553 B**（距硬线 320,000 余 **4,447**）；CSS raw 52,653→**52,685（+32）**、gzip 10,125→**10,131（+6）**。
- 真实首载（B-229 口径 = 门 + 常驻 chunk）：**322,965 → 322,967**（`MarginRail-C8Yy3L3b.js` gzip9 **7,414**；chunk 内嵌首屏 CSS 文件名随本批哈希变化，比第 120 轮记的 7,419 少 5 B）；仍超硬线 **2,967 B**，B-229 仍 `open`、本轮不动。
- 源码净增 2 文件 +38 行（styles.css +4、test +34）；测试不进包 = 0 B。

## 观察（不阻塞，不入池）

- mock 3 张长评价卡时末卡底 793.5 > sticky 整体评价顶 779.4：既有排布上限（改前同样重叠），本轮 +5.4 px 未改变量级；「末卡底 ≤ 整体评价顶」用 r94/97 同口径 2 卡夹具验。

## CHANGELOG 建议

- 修复：侧灯「对比 / 在审」的关闭钮与「判错了，重来」可点高度补到 24×24（B-251）。

## 新踩坑（3）

1. **Vite dev 按块失效**：连续两次改同一 CSS，`GET /src/styles.css` 已含第一块新规则、第二块仍是旧字节（`min-height: 24px` 11/12）。touch 该文件后恢复；真机断言前先读 computed 值。
2. **改 CSS 也会改懒 chunk**：`MarginRail-*.js` 内嵌首屏 CSS 文件名，CSS 哈希一变 chunk 内容与哈希就变（gzip 7,419→7,414）；「门 + 常驻 chunk」不能简单按 +6 推。
3. **sticky 整体评价会压末卡**：3 张长 mock 卡时末卡底超过面板顶；量这条要用短卡 / 2 卡夹具，否则误判成本轮回归。
