# 第 127 轮测试报告（tester 独立验收，未读 `impl.md`）

判定：**PASS**（轮前 `e2ac1a8`，commit 后 HEAD 与轮前不同）。

## 0 门禁（一次）
- `npm test`：**66 文件 930 条 0 fail**（逐文件 pass 汇总求和；`.tmp/r127-tester-npmtest.log`）。
- `npm run verify -- --max 316000`：**exit 0 PASS**，首屏 gzip **315,796 B**（raw 1,024,697、files 3、headroom 204；内部预算 310,000 超 5,796 只 WARN）。
- 常驻 `dist/assets/MarginRail-D2G2cRcL.js` raw **22,092** / gzip9 **7,847**（对第 126 轮 7,847 不变）；B-229 口径合 **323,643**（超首屏硬线，B-229 仍 `open`，只记）。
- `roundtrip` 不跑（未动编辑器/序列化）。

## 1 A1 静态门
- `node --experimental-strip-types src/lib/touchTargets.test.ts` → **6/6 exit 0**（既有 5 + 新 1）。
- 负向：把 `.dialog-inline button` 的 `min-height: 24px` 改 `20px` → **恰 1 红 exit 1**，报文含「可点高度必须 ≥24px，现在：min-height: 20px」；改回后 **6/6 exit 0**。
- `git diff --stat`：恰 **2** 个 src 文件（`touchTargets.test.ts` +6、`styles.css` +2，共 8 insertions / 0 deletions）。
- `git diff src/styles.css`：只 **1 行注释 + 1 行 `min-height: 24px`**，0 删 0 改；块内 `padding: 2px 0` / `font-size: 11.5px` / `color` / `text-decoration` / `background` / `border` 逐字未动。
- 静态块计数：`styles.css` 里 `.dialog-inline button` 恰 **1** 条规则块（`assertTapTarget` 的 `singleRule` 已覆盖）。

## 2 A2 真机（ego CDP 57270、`reset.mjs 57270`、1440×900、dev 5175 不重启）
自写 `.tmp/e2e-r127-tester.mjs`（`--before`/`--after` 同脚本），JSON `.tmp/r127-tester-{before,after}.json`。
- **混版门**：after 相 `fetch('/src/styles.css')` 的 `.dialog-inline button` 块含 `min-height: 24px`（首试即命中，未 touch）；before 相同块无该声明（证 before 相是真旧字节，非浏览器缓存）。
- **before**（`git stash push -- src/styles.css` 后）：两钮 **69×19 / 46×19**、computed `min-height:auto`；设置面板态全应用 <24×24 扫描**恰 2 条**（就是这两钮）；`.dialog` 横溢 0、竖溢 0。
- **after**（`stash pop` + touch）：`.dialog-inline` **恰 2 钮**，「全部恢复默认」**69×24**、「恢复默认」**46×24**（宽 ±0、高恰 24）；computed `min-height: 24px`；`padding: 2px 0px`、`font-size: 11.5px`、文本逐字不变。
- **布局**：`.dialog` 横向 `scrollWidth−clientWidth` **0**（收起 / 三 details 展开两态）；默认收起态竖向溢出 **0 ≤ before 0+2**。
- **可点性**：展开「快捷键」→ 点「全部恢复默认」→ `.keybinding-status` 文本 **「已全部恢复默认」**（改前/点击前为 `""`）。
- **扫描**：设置面板态全应用 <24×24 **0 条**（默认收起态与三 details 全展开态都是 0；改前恰这 2 条）。
- **收尾**：Esc 关设置（`.dialog` 不在、焦点回 `.tiptap`）；`window.showSaveFilePicker`/`showOpenFilePicker` 调用 **0/0**（0 写盘；本页无工作区，真写盘只有这两个入口）；**0 pageerror**。
- 截图 `shots/round-127/dialog-inline-buttons.png`（430×860，两个含钮的 details 展开、两钮同框，含「已全部恢复默认」状态行）。

## 3 回归
- `keyboard-acceptance`（`http://localhost:5175`、`SIDELIGHT_CDP=57270`）：**52/52 PASS**；跑后 `git checkout -- shots/round-05/`，`git status` 只剩本轮 2 个 src 改动 + 未跟踪 `docs/iteration/round-127/`、`shots/round-127/`。

## 4 偏差（不判 FAIL）
1. 计划写「截图两个 details 展开」：实际展开含钮的「快捷键」「批注提示词」，收起「接口与模型」并把 `.dialog` 滚到两钮同框（单张 430×860 内两个钮相距约 280 px，不滚抓不齐）；两个 details 确已展开，两钮矩形另在 JSON 里。
2. before 相扫描取设置面板**默认收起态**，与第 123 轮基线口径一致（收起态两钮仍有布局盒，Chrome 可量 69×19）；after 同口径 0。
3. 「0 写盘」按 `showSaveFilePicker`/`showOpenFilePicker` 调用计数判定；其余底层写盘路径未单独插桩。

## 5 UNVERIFIED
- 真实 WebView2 宿主、真实中文 IME、原生打印/另存 PDF（与本轮无直接关系，未跑）。
- 只在 Edge 157（ego CDP 57270）上验；其它浏览器的 `<details>` 收起态子元素矩形口径未验。
