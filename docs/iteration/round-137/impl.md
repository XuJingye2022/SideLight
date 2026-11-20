# 第 137 轮 B-253 执行报告（快车道 / 小修）

## 任务状态

| 任务 | 档 | 状态 | 结论 |
| :--- | :--- | :--- | :--- |
| B-253 窄窗抽屉打开时确认框被遮罩盖住 | 快车道（P1 界面） | **fixed** | `.overlay` z 40 → **46**，确认框不再被抽屉/遮罩压住 |

## 改动

`src/styles.css` 一处（+3 −1）：`.overlay` 的 `z-index: 40` → `46` + 2 行注释。未改 `App.tsx` / `MarginRail.tsx`（根因是层叠，不是挂载/让位）。

- 根因：`.overlay` 是 `div.workbench` 的兄弟（挂在 `div.app` 下），而窄窗抽屉的 `.rail-backdrop`（44）与 `.margin-rail`（45）都高于 40 → 确认框右半被面板盖住、整块又被 32% 黑底遮罩压暗。`useDialogFocus` 的 inert 只挡键盘与点击，不改绘制顺序。
- 定位（CodeGraph）：`query useDialogFocus` + `callers useDialogFocus` 命中 18 处——6 个对话框组件与 App 的 6 个 `.overlay` 共用同一外层选择器；QuickOpen 走 `.quick-open-backdrop`（60）、右侧只读面板走 `.rail-diff-overlay`（60），都已在线之上，所以一条 `.overlay` 规则覆盖全部 App 级对话框。

## 证据（ego CDP 57270、1024×700、假 FSA、`autoSave:false`）

脚本 `.tmp/e2e-r137-b253.mjs --phase before|after`；JSON `.tmp/r137-b253-{before,after}.json`

- 改前 **13/14**，唯一 FAIL 是层叠 `{overlay:"40", railBackdrop:"44", marginRail:"45"}`；改后 **14/14** `{overlay:"46", …}`，0 pageerror / 0 console error。
- 几何（两相同值）：抽屉左缘 **684**，「保存并切换」622..706 → 改前 **22 px** 在抽屉下（截图可见按钮被截断）。
- 像素比（`.tmp/r137-b253-pixels.py` → `.tmp/r137-b253-pixels.json`）：抽屉空白区亮度 **253.03 → 183.69**、主钮被压的 22 px **253.03 → 108.70**、对话框主体 **169.63 → 241.00**（改前确认框本体也被 `.rail-backdrop` 压暗）。
- 交互回归：鼠标点「取消」后确认框关、抽屉仍开、`#root` 内 0 个 `[inert]`；再按 Esc 关抽屉（既有 Esc 次序，本轮不动）。
- 截图：`shots/round-137/b253-before.png`、`shots/round-137/b253-after.png`。

## 命令结果

| 门 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（`.tmp/r137-tsc.log`） |
| `npm test` | **69 文件 955 条 0 fail**（`.tmp/r137-npm-test.log`） |
| `npm run verify` | exit 0；首屏 gzip **315,286 B**（raw 1,023,265、余硬线 4,714、PASS）；常驻 `MarginRail-yBHWhYu_.js` gzip9 **7,795**，真实首载 **323,081**（超硬线 3,081，归 B-229，未修）（`.tmp/r137-verify.log`） |
| `npm run roundtrip` | 未跑（未动编辑器/序列化） |

体积：CSS 注释在生产构建被去掉，净变化 ≤ +7 B gzip（门 315,279 → 315,286），chunk 7,801 → 7,795。

## CHANGELOG 一行建议

- 窄窗抽屉打开时，确认框不再被抽屉与遮罩盖住（`.overlay` z 序 40 → 46）。

## 新踩坑（3 条）

1. **`elementFromPoint` 会骗过「谁盖住谁」**：对话框打开时 `useDialogFocus` 给 overlay 的兄弟（`div.workbench`）加 `inert`，Chrome 命中测试跳过 inert 子树——改前「点确认框 = 命中确认框」也成立，能点但看不见。判绘制顺序只信 computed `z-index` + 截图。
2. **`.overlay` 不是 `#root` 的孩子**：它是 `div.app` 下 `div.workbench` 的兄弟；`.app` / `.workbench` 都没有 stacking context，抽屉 45 与 overlay 40 才在同一层真比。
3. **压暗确认框的是 `.rail-backdrop`（44、32% 黑）不是抽屉本体**：提到 46 要同时高过 44 与 45；只处理 44 仍会被面板挡住右半。

## 残余

- Esc 次序（抽屉先于确认框）按 B-253 记录的口径未改，属既有行为，需另立条目。
- 未 commit（执行角色不提交）；`BACKLOG.md` 的 B-253 状态留给 verifier/tester 收口。
