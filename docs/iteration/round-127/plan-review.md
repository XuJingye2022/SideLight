# 第 127 轮计划审查（critic，只读）· rev 1 · 结论 **PASS**

## 已核（实读源码 / 实跑命令，非转述）
- **范围不超**：`.tmp/r123-finder-ui3.json` 的 `small.settings` 恰两钮 69×19、46×19，`small.default|find|stats|filemenu` 各 0 条；`src/styles.css:3400-3407` 的 `.dialog-inline button` 无 `min-height`（3394 是容器块，两条独立规则）；两钮在 `SettingsDialog.tsx:211-222`、`:309-313`，都只是 `.dialog-inline` 的直接 `<button>`（全仓 `dialog-inline` 仅 4 处），改块即覆盖两条，不动 TSX 成立。
- **静态门可行**：`touchTargets.test.ts` 现为 5 条，`assertTapTarget` 的三条判据（`singleRule` 恰 1 块、`min-height|height` ≥24、块内不许写 `width|min-width`）都满足——按花括号深度实测该块在顶层（depth 0），`.dialog-inline button` 恰 1 块，块内只有 padding/font-size/color/text-decoration/background/border。24 改 20 只失败 `small` 那条 → 恰 1 红，报文含「可点高度必须 ≥24px」。
- **体积**：`node scripts/measure-first-screen.mjs` 现测 raw 1,024,681 / gzip **315,792** / headroom 4,208；把 `min-height:24px` 注入现成 `dist/assets/index-BuPly6m9.css`（52,680 B）实测 raw **+16 B**、gzip9 **−1 B**（10134→10133），与计划 §1 一致。`--max 316000` 留 208 B，净增 ≈0，破线风险可忽略；只加 CSS 与测试文件（不进包），无新 chunk、无新依赖，不碰任一红线。
- **基线与门禁**：HEAD `e2ac1a8` = 轮前 startSha，工作树干净（只 `?? docs/iteration/round-127/`）；`npm test` 链尾已含 `touchTargets.test.ts`，第 126 轮 66 文件 929 条 → 930 对得上。未动编辑器/序列化，不跑 `roundtrip` 正确。

## 漏洞（5 条，全 P2，不阻塞执行）

- **P2-1 before 相缺「旧字节」闸**：第 1 步的混版门只断 after；`git stash push -- src/styles.css` 后若 Vite 仍交新字节（第 54 轮同类），会把 24 当 before 写进报告，before/after 对照失效；stash 未 pop 还会丢本轮修法。
  修法：before 相同一探针反向断言该块**不含** `min-height`（不符先 touch）；stash/pop 前后各记 `git stash list` 应为 0、pop 后 `git status` 回 `M src/styles.css`；任一不成立就退回 r123 数值并在报告写「同脚本 before 未跑」。
- **P2-2 布局门槛选在恒 0 的状态**：两 details 收起时 overflow 本来就是 0（r123 `settings.dialog` sh 595 / ch 595），本轮 +2×5 px 只在展开态显现，「≤ 改前 0＋2」检不出回归。
  修法：默认收起态照记 0 作对照，另量「两个 details 都展开」的 `scrollHeight−clientHeight`，before/after 各记一次（预期 +10，容差 ≤+12）。
- **P2-3「全应用扫描」措辞超出证据**：r123 JSON 只扫了 default/find/stats/filemenu/settings 五个界面状态（四空 + settings 2 条），不是全应用。
  修法：§0 与 A2 第 5 步改口径为「同次 5 个界面状态」，或补一轮 r127 自扫描（含设置两态）后写进报告。
- **P2-4 A2 第 3 步没写「先展开两个 details」**：两钮都在默认收起的 `<details className="settings-group">` 里，不展开时 `.dialog-inline` 在 DOM 但矩形 0×0，「69×24/46×24」会假红。
  修法：量矩形/点击/截图前先 `document.querySelectorAll('details.settings-group')` 全置 `open=true` 并等一帧。
- **P2-5「点一下证明 24 高真可点」不成立**：19 px 时按元素点击也能出「已全部恢复默认」；真证据是矩形 24 与 computed `min-height:24px`。
  修法：措辞改成「矩形 24 + 按钮行为未回归」，别写「证明真可点」。

## 结论
**PASS**。计划不超范围、体积先算且实测净增 ≈0、验收可复现、门禁与基线都对得上；上面 5 条 P2 在 A1/A2 里顺手落实即可，不必退回复审。执行时守住两条否决项：`npm run verify -- --max 316000` exit 0（现 315,792）、`git diff --stat` 只两文件（`src/styles.css`、`src/lib/touchTargets.test.ts`）。
