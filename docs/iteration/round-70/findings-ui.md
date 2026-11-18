# 第 70 轮 finder-ui 报告

结论：**本轮 0 条新 P0/P1**（`actionable_count=0`、`p0p1_count=0`）。界面与可访问性量测未发现 AA 失败、窄窗溢出、焦点丢失或键盘出口缺失；只记 2 条 P2（已进 BACKLOG，不阻塞停止）。

## 采集范围与方法
- 环境：dev `http://localhost:5175`，CDP 9226，假 FSA 工作区（`.tmp/r51-fsa.mjs`），示例文档含 H1/H2/H3、TOC、表格、任务项。
- 视口 1440×900、1024×700、1000×620；主题 light / dark / sepia。
- 真点控件：工具栏钮 hover、表格单元格（出表格条）、源码钮、`Ctrl+Shift+F`、状态栏字数钮、设置钮；键盘 Esc / Tab / Shift+Tab。
- 量测项：文字对比度（fg 与有效背景合成，按 4.5:1 / 3:1 判）、命中区尺寸、焦点环、`aria-*`、焦点落点、布局溢出、`inert`。
- 脚本：`.tmp/e2e-r70-ui-survey.mjs`、`.tmp/e2e-r70-ui-followup.mjs`、`.tmp/e2e-r70-stats-focus.mjs`；原始数据 `.tmp/r70-ui-survey.json`、`.tmp/r70-ui-followup.json`。0 控制台错误、0 pageerror。

## 通过的项（有证据）
- 对比度 0 项低于门槛：编辑视图（三主题、顶栏/工具栏/正文/标题/TOC/状态栏/大纲/文件树/页签）、源码态说明条 16.1:1、设置说明 5.23–6.67:1、全局搜索；最低值 4.96（表格条「删行/删列/删表」危险色 12px），仍 ≥4.5。
- 窄窗 1024×700、1000×620：`documentElement` / `.app` 横向滚动差均为 0，越界元素 0。
- 源码态（`src/App.tsx` 视图三钮）：`源码` 钮 `aria-pressed=true`，六个格式钮 `disabled`；`textarea.source-editor` 聚焦有 `box-shadow: rgb(43,109,100) 0 0 0 2px inset`；Esc 退出后 `textarea` 卸载、焦点回 `.ProseMirror`。
- 全局搜索（`.global-search-dialog`）：620×198 全在视口内、`aria-modal=true` 且 `aria-labelledby` 有效，遮罩期 `[inert]` 6、关后 0，Esc 后焦点回正文；搜「乙」命中 3 处、提示「3 处」。
- 字数明细（`src/components/StatsDetail.tsx:62-64`）：`role=dialog` + `tabIndex=-1`，点击后 150 ms 内焦点进面板（`activeIsPanel=true`），Esc 关闭且焦点回 `.stats-trigger`。
- 表格工具条 7 钮均 24 px 高、`tabIndex=0`、非 disabled（与 B-110 的 24 px 口径同源，不重复计数）。
- 设置面板页脚在 1440×900 / 1024×700 / 1000×620 三档都在框内且在视口内（B-108 的「页脚可见」口径仍成立）。

## 新 P2（进 BACKLOG，不计 actionable）
1. **设置面板内容溢出随窗口变小放大**：`scrollHeight-clientHeight` = 1440×900 **152 px**、1024×700 **352 px**、1000×620 **432 px**（`padding-bottom` 已 20 px；页脚 sticky 仍在框内）。第 54 轮记 78 px，之后新增设置行使溢出变大；不阻塞功能，只是末段设置要滚。
   证据：`.tmp/r70-ui-followup.json` → `settingsNarrow`；`shots/round-70/ui-settings-1024x700.png`。
2. **字数明细面板的 Tab 出口落到 `BODY` 且面板不关**：面板聚焦后按 Tab，`activeElement` 变 `BODY`、面板仍开；Shift+Tab 能回 `.stats-trigger`。非模态弹层，无焦点陷阱是设计选择，但 Tab 出去后焦点不在页面内容上。
   证据：`.tmp/e2e-r70-stats-focus.mjs` 输出 `afterTab` / `afterShiftTab`；`shots/round-70/ui-stats-detail-1024x700.png`。

## 与 Typora 对照
`shots/typora/46-outline.png`、`41-find.png` 与同状态实测相比，侧栏大纲树缩进/折叠钮、查找条布局一致；未发现新的明确不一致。本轮因此没有 P0/P1。

## UNVERIFIED
- 真实屏幕阅读器播报、150%/200% 缩放屏、真实 IME 组合输入（本机无对应环境，沿用 B-201/B-203/B-204）。
- 仅测 Chromium（CDP 9226），未测 WebView2 宿主内渲染。

## 复现
```
node .tmp/reset.mjs 9226
node .tmp/e2e-r70-ui-survey.mjs 9226
node .tmp/e2e-r70-ui-followup.mjs 9226
node .tmp/e2e-r70-stats-focus.mjs 9226
```
