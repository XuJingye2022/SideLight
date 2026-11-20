# 第 120 轮实施记录（executor）

- 120 ｜ startSha `acd2969` ｜ 0.32.1 ｜ 未 commit。B-250「对比」长 diff 可键盘滚：A1/A2 完成

## A1 代码 + 静态门
- `MarginRail.tsx:874-875`：对比面板 ul 加 `role="list" tabIndex={0} aria-label="改动对比行"`，上一行 JSX 单行注释（不渲染文本）。
- 新 `src/lib/railDiffA11y.test.ts`（4 条 test；剥块注释与行首 `//`）：① 两处 ul ② 对比那条含三属性 ③ 在审那条无 `tabIndex` ④ 全文件 `tabIndex={0}` 恰 3 处 + `.rail-diff-rows` 仍 `max-height:60vh`/`overflow:auto`。
- `package.json:15` test 链尾 +1（63→64 文件）；`scripts/measure-first-screen.mjs:8-9` chunk 6,884→**7,419** 标「第 120 轮实测」；`src/styles.css` **0 行**（diff 空）；在审 `:934` 未动（`rail-review` 0 命中）。
- 门禁：diffstat `1 file changed, 2 insertions(+), 1 deletion(-)`；`-U0` `^-[^-]` 1 / `^+[^+]` 2；新测试 4/4；负向（禁 stash）删 `tabIndex={0}` → **2 fail/2 pass exit 1**（②④）→ 拷回 SHA256 `777DB98F…832C` 相同 → 复绿。`npm test` **64 文件 0 fail**；`verify` build+measure PASS，门 **315,546**、余 **4,454**；chunk `MarginRail-D1qNoJ-u.js` raw 21,053 / gzip9 **7,419**。
- 门 +4 B（计划要求 315,542）已 A/B：撤本轮改动重建 → **315,542**/余 4,458/chunk `MarginRail-DSGFlalk.js`（raw 20,999）；恢复后 → **315,546**/chunk `D1qNoJ-u`（raw 21,053）。两次 `total raw`=1,023,808：入口 chunk 代码 **0 差异**（同长 958,619），只 44 处懒 chunk 哈希串变（等长），gzip9 差 +4 B（先例 B-229 +9 B）。硬线余 4,454 ≥4,400。

## A2 真机（必做 7 组）
`.tmp/e2e-r120-diff-kb.mjs --phase before|after`（ego 57270、1440×900、无工作区、先清 localStorage；夹具 60 段 → 119 行/2380/540/超出 1,840）。
- before **7/7**：无 tabindex、`tabIndex -1`；Tab×8 全 `BUTTON.rail-diff-close`；关闭钮上 PageDown/PageDown/ArrowDown/End 后全 0；滚轮 400；119 行、超出 1,840。`.tmp/r120-diff-kb-before.json`。
- after **12/12**：① `tabindex="0"`/`role="list"`/`aria-label`；② 关闭钮 Tab 一次 → `activeElement===UL.rail-diff-rows` 且 `:focus-visible` true；③ solid/2px/颜色=页内探针 `outline:var(--focus-ring)` 解析值，四块（light `rgb(43,109,100)`、dark 与 auto-dark `rgb(156,203,194)`、sepia `rgb(122,90,42)`）逐块相等；④ 溢出 1,840 ≥1,000 且 ≥540；⑤ PageDown 472→944、ArrowDown 984、End 1840=max、Home 0；⑥ End 后末行底=ul 底 740.89；⑦ ul 上 Esc 关、`[inert]` 0、焦点回 `BUTTON.rail-diff-open`；⑩ 0 pageerror/console error。`.tmp/r120-diff-kb-after.json`；截图 `shots/round-120/diff-kb-scroll.png`（焦点环+末行）。
- 回归 r100 **43/43**、r101 **57/57**；脚本覆写 3 张已跟踪历史图（`shots/round-100/diff.png`、`shots/round-101/review-{list,truncated}.png`），已 `git checkout --` 还原。
- `git status` 只有：M package.json / scripts/measure-first-screen.mjs / src/components/MarginRail.tsx；?? src/lib/railDiffA11y.test.ts、shots/round-120/、docs/iteration/round-120/。

### 偏差（不判 FAIL）
- 可裁 ⑧⑨⑪ **未做**（⑨ 静态门③覆盖、⑪ 第 119 轮 tester 34/34、⑧ 需另造无改动文档）——**未验证，不算通过**。
- 门 315,546 对计划 315,542：+4 B 懒 chunk 哈希熵，见上；硬线余 4,454。
- 测试 4 条与计划一致，styles.css 检查并入第 4 条。

## 未跑
`npm run roundtrip`：未动编辑器/序列化（只 UI 组件、测试、脚本注释）。

## CHANGELOG
`- 「对比」面板的长 diff 现在可用 Tab 聚焦、PageDown/End 键盘滚动（B-250）。`

## 新踩坑
1. 懒 chunk 内容一改，入口 chunk gzip 不恒等，门漂 3–9 B（+4）；判因看「raw 相等 + 只有哈希串变」。
2. 回归脚本覆写已跟踪历史截图（r100/r101 三张），跑完立刻 `git checkout --` 还原。
3. 负向验证用「备份 + 拷回 + 比 SHA256」，别 `git stash`（会卷走计划内未提交改动）。
