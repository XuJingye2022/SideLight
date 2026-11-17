# 第 58 轮 finder-ui 报告

- 轮前 startSha `25146504de52bcd3b0fd0a84b2cc36e1d1e8baa0`（只读，未改产品代码）。
- 环境：dev `http://localhost:5175`（未重启）；CDP 9226，每段前 `node .tmp/reset.mjs 9226`；1440×900 与 1024×700。
- 脚本 `.tmp/e2e-r58-ui-{a..g}.mjs`；日志 `.tmp/r58-ui-{a..g}.log`、`.tmp/r58-ui-{a..f}.json`。

## 结论：0 条新 P0/P1，1 条新 P2（B-122）

探针含正向对照，避免「全绿=没测到」：注入 `#dcdcdc`/`#fff` 判红 **1.37**、`#767676`/`#fff` 判过 **4.54**（`.tmp/r58-ui-b.json` `control`）。

## 矩阵：11 个状态 0 违例

- 扫描 3 主题（`data-theme`，与 `src/App.tsx:769` 同一机制）× 11 态（base/settings/find/toast/outline/stats/tablebar）：TreeWalker 取文本节点，累乘祖先 `opacity` 合成前景，向上取首个不透明底色，算 WCAG 比值；门槛 4.5/3，禁用控件豁免。
- 最低比值：light **4.83**、dark **6.26–6.8**、sepia **4.79–4.8**，均过线。最低项为顶栏 `.doc-name`、侧栏页签、`.outline-empty`/`.rail-empty-sub`（11.5px）、`.stats-trigger`、`.status-chip-quiet`。B-118 修复未回退。
- 1024×700：`scrollWidth-clientWidth` = **0**，无出屏控件。
- 大纲五级：缩进 0/10/20/30 px（采到前四级），末级无 ▾，`overflowX` = 0。
- 字数面板：`role=dialog` `aria-label="字数明细"` `tabindex=-1`，打开后焦点进面板；1024×700 时 `x16 y335 360×325 bottom660` 全在视口内；`Esc` 只关面板。
- ARIA：`.stats-trigger` 关时 `aria-expanded=false aria-haspopup=dialog`，开后补 `aria-controls=stats-detail`；文件/导出菜单 `aria-expanded` + `aria-haspopup=menu`，`role=menu` + `menuitem`，无缺口。
- Mermaid 1024：SVG 722 px 在 756 px 正文列内，列与 `pre` 无横向溢出；dark 走 mermaid dark（节点 `#1f2020`、描边 `#ccc`、底 `#1c1f23`），无白底闪烁。

## F1 [P2] 暖纸主题下 Mermaid 仍用浅色（紫）配色

- 实测：sepia 节点填充 `rgb(236,236,255)`、描边 `rgb(147,112,219)`，与 light 逐值相同；dark 整表切 `rgb(31,32,32)`/`rgb(204,204,204)`（`.tmp/r58-ui-e.json`）。说明只做 light↔dark 两档，暖纸（第 55 轮 B-105）落 light 档。
- 截图：`shots/round-58/mermaid-sepia-1440.png`（米黄纸底上一块淡紫流程图）、`shots/round-58/mermaid-dark-1440.png`（深色正确）。
- 文字仍 ≥4.5:1，属观感不一致，P2，已记 B-122。
- 建议：按 `data-theme` 传 mermaid `themeVariables`，sepia 覆盖 `primaryColor`/`primaryBorderColor`/`lineColor` 为纸/墨 token，随第 46 轮切主题重绘重算。

## UNVERIFIED

- 批注卡：无 API Key，未找到不调模型的本地注入路径，未渲染未截图；其对比度与窄窗溢出未测。
- Typora 对照：`shots/typora/92-outline.png`、`93-wordcount-popup.png` 被安装器 UAC 对话框遮挡，看不到侧栏与字数弹窗，无法比对，需重拍。
- hover 反馈、焦点环、表格条 disabled 态：第 56 轮已验，本轮未复测。

## 已排除的假象

探针 B 里「大纲为空」「代码块多出正文」是未 `reset` 导致草稿接续 + 点容器中心（第 44 轮坑）的脚本假象，不计产品缺陷；加 `# 标题一` 后大纲实时出项已由探针 C 证伪。
