# 第 120 轮计划（planner v2，revision 1）

- 120 ｜ startSha `acd2969` ｜ 版本 0.32.1，不 push、不动 `release/`｜ dev 5175（不重启）｜ 真机 ego CDP 57270
- 唯一问题 **B-250**（P1）：「对比」长 diff 键盘只读得到第一屏。两任务同轮，不夹带别的项
- revision 1 只修 CR-1…CR-6（编号见条目），范围不变

## 体积
门 gzip **315,542**（余硬线 4,458）；`MarginRail-*.js` gzip9 **7,398**（门不含）。口述 312,423/7,577 是第 93 轮旧数，不破线。本批主 CSS 0 B、入口 JS 只换哈希 0 B、chunk ≈+30。门必须仍 315,542；门+chunk ≈322,970 超线归 B-229。

## 根因
`:874` 的 `<ul className="rail-diff-rows">` 无 `tabIndex`、行是纯 `<li>`（`:876`），面板唯一 Tab 站是关闭钮；`styles.css:1456-1464` 已 `max-height:60vh;overflow:auto`，缺的只是可聚焦（照抄 `:769` 的 B-244 改法，不新增 CSS：`:192` 全局 `:focus-visible`，sheet 不剪）。在审 `:934` 同 class 而行为 button：**不加**。

## 执行次序（CR-3，写死）
1. 写 `.tmp/e2e-r120-diff-kb.mjs`（`--phase before|after`）。
2. 跑 before：产品码一行未动（已核 HEAD `acd2969`、工作树只 `?? round-120/`、stash 空），写 `.tmp/r120-diff-kb-before.json`。
3. 做 A1（build/verify/抄注释见 A1 验收）。4. 跑 after + 截图 + 回归。
**禁止整树 stash。** 补跑 before 只许 `git stash push -- src/components/MarginRail.tsx` + `git stash pop`，以「`git stash list` 空 ＋ diffstat 回 2+/1−」复验，否则 UNVERIFIED。

## A1 代码 + 静态门
文件：`MarginRail.tsx`、`src/lib/railDiffA11y.test.ts`（新）、`package.json`（test 链尾 +1）、`scripts/measure-first-screen.mjs:8-9`。
1. `:874` 改 `<ul className="rail-diff-rows" role="list" tabIndex={0} aria-label="改动对比行">`，上一行加第 120 轮注释。
2. `styles.css` **0 行**；仅描边被剪才加 `.rail-diff-rows:focus-visible{outline-offset:-2px}`（≈+60 B，记偏差）。
3. 新测试（**CR-1**）照 `railModalGate.test.ts:23-32`：读源码后剥 `/*…*/` 与行首 `//` 再 `count()`（剥注释防字面污染）。断 4 条：① `matchAll(/<ul\b[^>]*className="rail-diff-rows"[^>]*>/g)` **恰 2 处**，按开标签后 120 字含 `diffData.rows` / `reviewRows.rows` 分派（不按行号/顺序）；② 对比那条含 `tabIndex={0}`、`role="list"`、`aria-label="改动对比行"`；③ 在审那条**不含** `tabIndex`；④ 全文件 `tabIndex={0}` 恰 **3 处**（`:538` / `:769` / 本轮）；`styles.css` 的 `.rail-diff-rows` 块仍含 `max-height: 60vh` 与 `overflow: auto`。
4. `package.json` test 链尾追加 `&& node --experimental-strip-types src/lib/railDiffA11y.test.ts`（63 → 64，已核）。

验收（CR-2）：
- `git diff --stat -- src/components/MarginRail.tsx` = **`1 file changed, 2 insertions(+), 1 deletion(-)`**（注释 1 + 属性行 1，旧行删 1）；`-U0` 里 `^-[^-]` 1、`^+[^+]` 2；`rail-review` **0 命中**（`:934` 未动）；`git diff -- src/styles.css` **空**。不按「1 处 -/+」判。
- 新测试全绿；负向：记 SHA256 → 删新 `tabIndex={0}` → **≥2 红 exit 1**（②④）→ 拷回核 SHA256 → 复跑绿。此步**禁止 `git stash`**。
- `build` PASS；`npm test` **64 文件** 0 fail；`verify` PASS、门 gzip **315,542 必须相等**（不等先查因）；余硬线 ≥4,400；chunk gzip9 记新值并已抄进 `measure-first-screen.mjs:8-9`（现写 6,884 已过期，顺手订正标「第 120 轮实测」，**CR-6**）。

## A2 真机证据 + 回归
文件：`.tmp/e2e-r120-diff-kb.mjs`、`shots/round-120/diff-kb-scroll.png`、`impl.md`。
骨架照 `.tmp/e2e-r119-finder-ui2.mjs:24-85`（ego 57270、1440×900、无工作区；先清 localStorage 再 reload，⑤ 的 1,840 才可比）。夹具同第 119 轮：点首段 → 60 次「约 20 字短句」+ `Enter` → 点 `.rail-diff-open`；行数只由段落数定（60 段 + 59 空行 = **119 行**），实测 **2380/540/超出 1,840**（`.tmp/r119-finder-ui2.json` 的 `diffOpen`，两阶段同值）；显示「没有改动」就再打 1 字。
- before 5 条：① 无 `tabindex`、`tabIndex -1`；② `Tab`×8 全停 `.rail-diff-close`；③ 关闭钮上 `PageDown/PageDown/ArrowDown/End` 后全 0；④ 滚轮 → 400；⑤ 119 行、超出 1,840±2。
- after **必做 7 组**：① `tabindex="0"` / `role="list"` / `aria-label` 非空；② `.rail-diff-close` 按 1 次 `Tab` → `activeElement === ul` 且 `:focus-visible` 真；③ `outlineStyle:solid`+`outlineWidth:2px`+`outlineColor` = 页内 `<html>` 的 `--focus-ring` 解析值（四块三色 `#2b6d64`/`#9ccbc2`×2/`#7a5a2a`，**不硬编码浅色**，**CR-4**）；④ 溢出量记实际值并断 ≥1,000 且 ≥`clientHeight`；⑤ `PageDown`×2 后 >0、`ArrowDown` 再增、`End` = `scrollHeight-clientHeight`（±1）、`Home` → 0；⑥ `End` 后末行 `rect.bottom ≤ ul.rect.bottom + 1`；⑦ `ul` 上 `Esc` 关面板、`[inert]` 0、焦点回 `.rail-diff-open`；⑩ 0 pageerror / 0 console error。
- **可裁 3 组**（**CR-5**，裁掉写偏差，不判 FAIL）：⑧ 空态 Tab 站仍 1；⑨ 在审 `ul` 无 `tabindex`、行仍 button（门③已覆盖）；⑪ 开面板按 `Ctrl+Alt+N`（`keybindings.ts:32`）仍弹「切换文档」、面板让位（B-249）。⑨⑪ 未做不许写「已验证」。
- 截图 1 张（焦点环 + 已滚到中段/末行）；回归 `.tmp/e2e-r100-diff.mjs`（43/43）、`.tmp/e2e-r101-review.mjs`（57/57）。
验收：before **5/5**；after 必做 7 组全 true、0 pageerror；两回归过；`git status` 只计划内文件+截图。

## 风险
R1 描边被剪 → `outline-offset:-2px`（+60 B）。R2 不滚 → `scrollBy`（+300 B chunk）。R3 Tab 环变 [关闭钮, ul]（`useDialogFocus.ts:75-81`），A2② 断。R4 两面板共用 class：门③ + r101 双断。R7 回归已核安全：r100 的 `controls` 只数 `input/textarea/[contenteditable="true"]`（`e2e-r100-diff.mjs:181,314`），r100/r101 的 Tab 断言不数面板内 Tab 站。UNVERIFIED：真实读屏不跑，只断 DOM 与计算值。
