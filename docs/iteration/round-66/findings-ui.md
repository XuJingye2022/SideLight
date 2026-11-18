# 第 66 轮 UI 与可访问性侦察（finder-ui）

结论：**本轮 0 条新 P0/P1**（actionable_count 0 / p0p1_count 0）。两条 P2 已入 BACKLOG：
B-141（新）与 B-110（补证据）。原始数据：`.tmp/r66-ui-audit.json`、`.tmp/r66-ui-audit2.json`、`.tmp/r66-ui-rail.json`。

## 1. 三主题对比度矩阵（0 处不达标）

测量方法：探针读 computed `color`，自元素向上逐层合成背景（含 alpha），按 WCAG 相对亮度算比值；
普通文本门槛 4.5:1、大字 3:1。脚本 `.tmp/e2e-r66-ui-audit.mjs`、`.tmp/e2e-r66-ui-audit2.mjs`（1440×900）。

| 区域 | light | dark | sepia |
| :--- | :--- | :--- | :--- |
| 正文段落 | 14.88 | 14.42 | 10.77 |
| 标题 h2 | 14.88 | 14.42 | 10.77 |
| 编辑视图目录条目 `.sl-toc-item` | 5.95 | 6.96 | 5.73 |
| 预览目录条目 `:hover` 首条 | 7.40 | 7.67 | 6.53 |
| 查找条说明 `.find-note` | 6.16 | 7.92 | 5.27 |
| 设置面板标签 | 16.1 | 13.28 | 11.83 |
| 字数面板最低一行 | 5.23 | 通过 | 通过 |
| 状态栏 chips / 大纲行 / 文件树行 / 表格单元格 | 通过 | 通过 | 通过 |

目录只用 `var(--accent)` + `var(--paper-raised)`，三主题各自取值（`src/styles.css:907-952`），最低 5.73 仍过 4.5。

## 2. 真点控件与布局（全部通过）

- 1024×700：`scrollWidth-clientWidth = 0`（编辑态与预览态都 0）；越界元素 0 个。
- 预览目录 1024：nav x=328 w=576 right=904（视口 1024 内），4 条条目 w=546 h=28，无横向溢出。
- 预览目录键盘：4 个条目都是 `button`、`tabIndex=0`，`:focus-visible` 描边 2px `rgb(43,109,100)`。
- 字数面板三主题：打开后最低一行 5.23:1，面板 360×325 在 900 高视口内（bottom 860），Escape 关闭。

## 3. P2 发现（已入池，不阻塞）

### B-141（新，deferred）页边批注卡不可键盘聚焦，只能鼠标读

`article.note` 既无 `tabindex` 也无 `role`，`document.querySelector('article.note').focus()` 后
`activeElement` 仍是 `BUTTON`（卡片未被聚焦）。键盘用户能用 Tab 到卡内三个动作钮，但读不到
「第 1 处 / 引文 / note」这一组上下文，也无 Enter 跳句。
证据：`.tmp/r66-ui-rail.json`（`cardTag` `ARTICLE.note note-evaluation`、`cardFocusable.tabIndex=-1`、
`role=null`）；`src/components/MarginRail.tsx:110`。截图 `shots/round-66/annotation-rail.png`。

### B-110 补证据：批注卡动作钮 22px 高（门槛 24×24）

实测「知道了」54×22、「追问」42×22、「联网核对」66×22，与既有 B-110 的 `21×24`/`22×24` 同一类。
证据：`.tmp/r66-ui-audit2.json` 的 `cases.annotation.buttons`；`src/components/MarginRail.tsx:151-190`、
`src/styles.css:1369`（`.note-actions button`）。

## 4. 未验 / 不计

- `.rail-close` 实测 `display:none`（1440 宽），未判缺陷：可能是窄窗才露的响应式分支，未验证窄窗口径。
- Mermaid 三主题观感（B-122 已 open，不重复计）。
- 真实屏幕阅读器播报（无真机，只验 DOM 语义）。
