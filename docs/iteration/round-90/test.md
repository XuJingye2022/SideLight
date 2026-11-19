# 第 90 轮测试报告：行内公式就地编辑（A1/A2，用户反馈 #1）

- 轮前 `5c3b832d3af085809fb909ec88a072b7819e26a9`；dev `http://localhost:5175`（HTTP 200），未重启。
- 真机：CDP 9222–9226 不可用（按用户口径未反覆重试）；走 ego 浏览器 Chrome/Edge CDP `http://127.0.0.1:57270`（`ego_doctor` 报 `browser.json port=57270`，`/json/version` 200），驱动 ego 标签页 target `B738B7BC…`。
- 只读 `plan.md`、`git diff`、`BACKLOG.md`；**未读 `impl.md`**；真机断言全部自写脚本 `.tmp/e2e-r90-tester-a1a2.mjs`，日志 `.tmp/r90-tester-e2e.log`。
- **判定：PASS**（门禁、A1/A2 验收项、回归均独立复跑通过）。

## 门禁
- `npm test`：**55 文件 727 条 0 fail**（基线 54/724；新增 `mathNodeView.test.ts` 3 条），日志 `.tmp/r90-test.log`。
- `npm run verify`：**PASS**，首屏 gzip **309,470 B**（改前 309,074 B，净 +396 B；预算 310,000，距硬线 10,530）。`.tmp/r90-verify.log`
- `npm run roundtrip`：rich **7/9** + source **9/9**、firstSaveBlocked 1/9（同第 88/89 轮），报告未变。`.tmp/r90-roundtrip.log`

## A1 行内公式就地编辑（7/7 过）
自写 E2E 先清空正文，用输入规则手打 `lead $\alpha$ tail` 造公式（atom 1、`data-latex=\alpha`）：
1. 点公式 → `.sl-math-inline-input` **1** 且 `activeElement`=input、`.math-inline`（旧浮层）**0**、`.katex` `display:none`；`.sl-math-inline-edit` 文本 `$$`（首尾都是 `$`）、atom `::after` content=`none`。
2. 输入 `^2` + Enter → `data-latex=\alpha^2`、atom 内 `.katex` **1**（display inline）、输入框 0、焦点在 `.ProseMirror` 且非 `.stats-trigger`。
3. 再点开打 `ZZ` + Esc → `data-latex` 还原 `\alpha^2`、输入框 0、`.sl-math-reveal` 0、`sl-parse-done` **2→2**、焦点留正文。
4. `Ctrl+S`（假 `showSaveFilePicker` → OPFS）：写 1 次，落盘正文 `lead $\alpha^2+1$ tail`，除公式文本外无改动；再用假 `showOpenFilePicker` 指回同一份文件、`Ctrl+Alt+O` 重开：atom 1、KaTeX 1、`sl-math-reveal` **0**（重开不露 `$…$`）。截图 `shots/round-90/a1-inline-edit.png`。

## A2 插入入口改走新编辑 + 删死代码（7/7 过）
1. 工具栏 `.menu-trigger` → 「公式」：`.sl-math-inline-input` 1 且聚焦、浮层 0、atom +1；打 `x` + Enter → atom 1（latex=x）、输入框 0；`Ctrl+Z` **一次**回到基线（atom 增量 0）。
2. `Ctrl+M`：输入框 1 聚焦（临时空 atom）；Esc → atom 回基线、输入框 0、`.sl-math-reveal` 0、焦点在正文（B-157 空 atom 删除路径）。
3. `Ctrl+Shift+M`（块级，B1 前仍浮层）：blockMath +1 且 `.math-inline` 1；Esc → blockMath 回基线、浮层 0（未因删 `mathDraft` 而坏）。
4. 静态：`mathDraft|MathDraftPreview` 在 `src` **0** 命中（HEAD 对照 `App.tsx` 2 处）；`src/components/MathDraftPreview.tsx` 已删除；`sl-math-inline-input` 3 处（NodeView/CSS/脚本）。

## 回归
- `scripts/keyboard-acceptance.mjs http://localhost:5175`（`SIDELIGHT_CDP=…57270`）：**52/52** exit 0，含「Ctrl+M 打开行内公式编辑（`.sl-math-inline-input` 1）/ 输入公式 Enter 后正文出现公式 / 公式 Esc 取消不改正文」。`.tmp/r90-keyboard.log`；跑完已 `git checkout -- shots/round-05/`（无残留改动）。
- 清理死代码未破坏轮廓：删 `MathDraftPreview` 后 `tsc`（verify 内含）通过。

## UNVERIFIED / 口径
- **A2「verify 增量 ≤ A1」不可独立拆分**：两项同处一个工作树 diff，只能给合计净增 **+396 B**（309,074 → 309,470，≤310,000，距硬线 10,530）；A1 单项增量与 A2 删除量未分测。
- 「重开」用假 FSA（OPFS 文件 + 打开文件路径）验证，非真实磁盘/宿主 WebView2；原生打印、真实 IME 与本轮无关未跑。
- 「点公式」由真实鼠标点击（坐标点按 atom 中心）触发；Playwright 对 atom 的 `locator.click()` 被 KaTeX 子节点命中判定拦下，故改用坐标点击，对 NodeView `mousedown` 行为等价。
