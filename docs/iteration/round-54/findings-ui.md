# 第 54 轮 界面与可访问性侦察（finder-ui）

窗口 1440x900 / 1024x700；CDP 9226；每段脚本前 `node .tmp/reset.mjs 9226`。
轮前 startSha `b01a4e6ec0c3fe63233bff2dd61791de258d64d0`（HEAD 未变，本轮未改产品代码）。
脚本：`.tmp/e2e-r54-ui-probe.mjs`、`-probe2.mjs`（选中器过期中断）、`-probe3.mjs`；日志 `.tmp/r54-ui-probe.log`、`.tmp/r54-ui-probe3.log`。
截图 1 张：`shots/round-54/ui-dark-settings-1440.png`（深色设置面板）。

## 结论：无 P0/P1

深色矩阵（第 53 轮标「未测」）本轮实测通过，全部文本对比度 ≥ 4.5:1；1024x700 深色下 `scrollWidth == clientWidth == 1024`，顶栏/工具栏/状态栏 0 条裁字。`actionable_count = 0`。

## 实测通过（数字即证据）

- 深色走真实路径：设置 → 主题「深色」→ 点「保存」，`html[data-theme]` = `dark`；改完按 Esc/「取消」回落到已保存主题（`src/components/SettingsDialog.tsx:61-62`，先预览后还原的注释与实现一致）。
- 深色设置面板（`-probe.log` `dialogDark`）：430x860 面板内全部叶子节点 `low = []`，最低 `--ink-faint` 仍 ≥4.5；正文深色 14.42:1。
- 深色快捷键对话框（`-probe3.log`）：`role=dialog` + `aria-labelledby=shortcuts-title`，560x738、底 819/900 不溢出；63 个叶子节点 `low = []`；8 个 `kbd` 14.42:1。
- 深色顶栏/工具栏按钮 7.92:1，`分析本段（模拟）` 7.67:1，焦点环 `#9ccbc2`（`src/styles.css:63`）对深底 ≈9:1。
- 查找条 7 个按钮高度 24px（`Aa`/`ab`/上一处/下一处/关闭查找/替换/全部替换），与第 53 轮一致，未回退。
- 浅色空状态最低 4.83:1（状态栏 `--ink-faint`），无对比度失败项。

## F1 [P2] 顶栏快捷键入口可见文字是一个裸 `?`

- 位置：`src/App.tsx:4930-4932`——`<button aria-label="快捷键" title="快捷键">?</button>`，实测 28x28、`textContent = "?"`。
- 读屏可用（aria-label 有），但视觉上与旁边「保存」「设置」两个中文按钮不同族；「?」不表达「快捷键」，含义只能靠悬停 title。
- 建议：换 `⌨` 或直接写「快捷键」；两个字符宽，不挤出顶栏（1440 下顶栏右侧余量充足）。

## F2 [P2，B-108 补数] 1440x900 设置面板：对话框 860 高、页脚 823–859、框底 880

- 实测（`-probe.log` `settingsOpen`）：`.dialog` 430x860，`.dialog-actions` y=823–859，`innerHeight=900`，下沿余 20px。
- 本轮没找到 `.dialog-body` / `.settings-body` 滚动容器（`scroll: null`），内层溢出量无法直接量；第 53 轮 1440 记 78px、1024 记 278px，与此不矛盾。给 B-108 补「1440x900 页脚 823–859」一条即可，不新开条目。

## 未测

- 批注卡：仍无数据源（需真模型或注入 `.sidelight/annotations`），深色 hover/focus 未过。
- `::selection` 深色底：`getComputedStyle(el, '::selection')` 只回 `rgba(0,0,0,0)`，浏览器不回背景，UNVERIFIED；`src/styles.css:753` 有规则但需目视截图才能判。
- Mermaid 深色重绘、表格工具条深色：本轮未截（第 53 轮浅色已过）。
- `-probe2.mjs` 因选择器把 `.topbar button` 的可见文字当「快捷键」而中断（真实文字是 `?`），已用 `aria-label` 重跑；脚本本身不改产品。
