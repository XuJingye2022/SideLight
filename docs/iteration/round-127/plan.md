# 第 127 轮计划（单轮 · P2：设置面板两条文字链钮 19 px）· rev 1 · 轮前 `e2ac1a8`

## 0 范围
只做本批唯一问题：`.dialog-inline button` 两条文字链钮「全部恢复默认」**69×19**、「恢复默认」**46×19**，补到 24×24 可点口径。
- 证据：`.tmp/r123-finder-ui3.json` 的 `small.settings`（同次全应用扫描其余 0 条 <24）；源 `src/styles.css:3400-3407` 无 `min-height`；两钮在 `src/components/SettingsDialog.tsx:212-221`、`:309-313`，共用 `.dialog-inline`。
- 只改 CSS 一处 + 一条静态门。**不改 `SettingsDialog.tsx`**（两钮已共用同一个类，改块即覆盖两条），**不加宽**（69/46 已 ≥24），不动既有 5 条断言，不回填 BACKLOG/README/CHANGELOG（scribe 收口）。
- 先例：B-110/B-236/B-251 都只加 `min-height: 24px`、宽度与字号不动；注释照 B-251 写法。

## 1 体积（先算净增）
- 任务书口径：312,423 B / 硬线 320,000 / 余 7,577。**最新实测**（第 126 轮 tester）：门 **315,792**（余 4,208）、`MarginRail-*.js` gzip9 **7,847**、B-229 合计 **323,639**（本轮不动 chunk，只记数）。
- 本轮实测净增：把 `min-height:24px` 注入现成 `dist/assets/index-BuPly6m9.css`（52,680 B）→ raw **+16 B**、gzip9 **−1 B**（Huffman 抖动）。测试文件不进包，无新 chunk。
- 预计重建后门 **315,79x ±20 B**、净增 **0（≤5 B）**：两种基线都不破线，余量 ≥4,200。
- 判据：`npm run verify -- --max 316000` exit 0；`dist` 的 `MarginRail-*.js` gzip9 记数（应仍 ≈7,847）。真超 316,000 先停手、diff 首屏清单找混进来的东西，不为体积砍功能。

## 2 A1 修 CSS + 按块静态门
files：`src/styles.css:3400-3407`、`src/lib/touchTargets.test.ts`（`src/components/SettingsDialog.tsx:212-221`、`:309-313` 只读定位）

1. `.dialog-inline button` 块加 `min-height: 24px;`，上方加一行注释（第 127 轮、69×19 / 46×19 → 24、只加可点高度）。`padding: 2px 0`、`font-size: 11.5px`、颜色与下划线**逐字不动**（全局 `box-sizing:border-box`，24 即总高）。
2. `touchTargets.test.ts` 加常量 `DIALOG_INLINE = '.dialog-inline button'`，末尾加一条 `test('设置面板两条文字链钮可点高度 ≥24，宽度不动（第 127 轮）', () => assertTapTarget(DIALOG_INLINE))`。`assertTapTarget` 已覆盖：块恰 1 条、块内 `min-height|height` ≥24、块内不写 `width|min-width`。不改 `assertTapTarget`/`singleRule`/既有 5 条；`package.json` 不动（文件已在 test 链尾）。
3. 不改 DOM、不加 `aria-*`、不改 details 默认收起（第 80 轮 B-150 的溢出口径靠它）。

验收：
- `node --experimental-strip-types src/lib/touchTargets.test.ts` → **6/6**（5＋1）exit 0。
- 负向：该块 `min-height: 24px` 改 `20px` → **恰 1 红 exit 1**，报文含「可点高度必须 ≥24px」；改回后 **6/6 exit 0**，`git diff` 回预期两文件。
- `npm test`：**66 文件 930 条 0 fail**（929→930）。
- `git diff --stat` 恰 2 个 src 文件；`git diff src/styles.css` 只有 1 行注释 + 1 行声明，0 删 0 改。

## 3 A2 真机量两条 + 回归
files：`.tmp/e2e-r127-dialog-inline.mjs`、`shots/round-127/dialog-inline-buttons.png`

环境：dev `http://localhost:5175`（不另起、不重启）、ego CDP **57270**、先 `node .tmp/reset.mjs 57270`、1440×900。

1. 混版门：`fetch('/src/styles.css')` 断 `.dialog-inline button` 块内含 `min-height: 24px`（Vite 对 `styles.css` 的 transform cache 可能交付旧字节：不符就 touch 该文件，别重启，第 54 轮）。
2. before 相：`git stash push -- src/styles.css`（只这一个文件，保留新测试）→ 同脚本量得 **69×19 / 46×19** → `git stash pop` + touch `src/styles.css`。stash 不可用就复用 `.tmp/r123-finder-ui3.json` 的 before 数值，并记「同脚本对照未跑」。
3. after 相（主验收）：开设置（按文本「设置」找钮）→ `.dialog-inline` **恰 2 钮**：「全部恢复默认」**69×24**、「恢复默认」**46×24**（宽 ±1 容差、高必须 24）；computed `min-height` = `24px`；文本不变。
4. 布局回归：`.dialog` 横向 `scrollWidth−clientWidth` **0**；默认（两 details 收起）竖向 `scrollHeight−clientHeight` ≤ 改前 **0＋2**；展开「快捷键」details 后点「全部恢复默认」→ `.keybinding-status` 文本「已全部恢复默认」（证明 24 高真可点）；Esc 关设置、0 写盘、0 pageerror。
5. 全应用扫描：复用 r123-ui3 的 `smallTargets`（1440×900、设置面板开着）→ **0 条** <24×24（改前恰这 2 条）。
6. 截图 1 张：两个 details 都展开后的 `.dialog` 整框 → `shots/round-127/dialog-inline-buttons.png`（先建目录）。
7. 回归：`keyboard-acceptance` **52/52**（跑后 `git checkout -- shots/round-05/`）。不动编辑器/序列化，**不跑 `roundtrip`**。

## 4 门禁与证据
- 报告 `docs/iteration/round-127/impl.md` ≤4 KB：命令、数值、截图路径、E2E 脚本与 JSON 路径（原始日志写 `.tmp/r127-*`）。
- 顺序：A1 → `npm test` → `npm run verify -- --max 316000` → A2 真机 → 回归。
- 不 push、不建 Release、不碰 `release/`、版本仍 0.32.1、CHANGELOG 不动（scribe 收口）。
- BACKLOG 行由 scribe 补，建议 **B-260**：现池最高 **B-258**，第 126 轮计划预留 259（本轮不改 BACKLOG）。

## 5 风险
1. `/src/styles.css` 旧字节（第 54 轮）→ 断 fetch 字节，不符就 touch，不重启 dev。
2. 两条钮默认在收起的 `<details>` 里：量矩形/点按钮前先展开；收起态只量 `.dialog` 溢出。
3. 尺寸只认 px（`pxValue` 断言 `^…px$`）：不许写 `1.5rem`。
4. 高度必须恰 24；宽度随字体回退按 ±1 记，不因此改 CSS。
5. `verify` 超 316,000 或 chunk 变化：先查 `git diff --stat`（应只有 2 个文件）再判是否回滚。
