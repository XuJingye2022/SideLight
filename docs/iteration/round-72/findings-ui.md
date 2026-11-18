# 第 72 轮界面与可访问性侦察（finder-ui）

结论：**0 条新 P0/P1**。4 条 P2 复核，均已在 BACKLOG 或建议并入 B-110。

## 方法与环境

- 1440×900 与 1024×700；CDP 9226，先 `node .tmp/reset.mjs 9226`，同一页跑完全部步骤。
- 脚本：`.tmp/e2e-r72-ui-a.mjs`（结构/溢出/Tab 走查/查找/表格条）、`.tmp/e2e-r72-ui-b.mjs`（设置/字数面板/大纲/批注）、`.tmp/e2e-r72-ui-c.mjs`（状态栏定位）、`.tmp/e2e-r72-ui-e.mjs`（对比度）。
- 原始读数：`.tmp/r72-ui-a.json`、`.tmp/r72-ui-b.json`、`.tmp/r72-ui-c.json`、`.tmp/r72-ui-d.json`。
- 截图（2 张）：`shots/round-72/ui-1024x700.png`、`shots/round-72/ui-settings-1440.png`。
- 真点控件：顶栏 6 钮、工具栏 12 钮、侧栏页签与「打开文件夹…」、查找条 7 钮、表格条 7 钮、设置 4 个主题项、字数面板、批注卡动作钮、正文段落。

## 已核正常（不报）

- 20 个可聚焦控件（第 21 站回第一项）焦点环全部 `solid 2px rgb(43,109,100)`，无控件越出视口：`.tmp/r72-ui-a.json` 的 `focusWalk`。
- 1024×700 无横向溢出：`scrollWidth=clientWidth=1024`，`.app` 1024×700，工具栏 `scrollWidth=clientWidth=1024`，表格条 `right=1024`（`narrow1024`、`narrowTableBar`）。
- 查找：6 命中，当前命中 α0.48、其余 α0.22，计数 `1 / 6`，Esc 关闭（`findMarks`）。
- 表格条 7 钮均 24 高、≥41 宽；删除三项危险色 `rgb(180,69,58)`（`tableBar`）。
- 浅色对比度抽样 5.03–7.53：`.stats-trigger` 5.03、`.find-count` 5.11、`.table-bar button` 7.52、`.doc-name` 5.09（`.tmp/r72-ui-d.json`）。
- 大纲 2 条 `role=treeitem`、`aria-level` 1/2、roving `tabindex` `0/-1`（`outline`）。
- 批注栏 260 px、2 张卡，不压正文列（正文 right=973 < rail left=996）。

## P2（复核，不新增条目）

1. 设置面板 1440×900 内容溢出 **152 px**（`scrollHeight-clientHeight`），与 B-150 记值一致；页脚未越框。证据 `.tmp/r72-ui-b.json` 的 `settings.overflow`。
2. 字数明细面板按 Tab 后焦点到 `BODY`、面板不关（B-151 复现）；Esc 关闭后焦点回 `.stats-trigger`，画出 2px 焦点环（`shots/round-72/ui-1024x700.png` 左下）。
3. 主题 4 项 `role=radio` 全无 `tabindex`，ArrowRight 后焦点索引仍 0、`aria-checked` 不变（B-109 复现）；证据 `.tmp/r72-ui-b.json` 的 `radioArrow`。
4. 点击区补证：设置「恢复默认」46×19、批注卡「判错了，重来」72×19（B-110 现有样本为 22 高）。建议并入 B-110，不新开条目。

## UNVERIFIED

- 深色 / 暖纸主题未取到数据：脚本点 `[role=radio]` 后 `data-theme` 仍是 `system`，三遍读数逐值相同（`.tmp/r72-ui-d.json`）。误拍的 `shots/round-72/ui-dark-1440.png` 已删，避免当证据。下一轮直接设 `document.documentElement.dataset.theme` 后重量。
- Mermaid 未触发（本轮未打开图）；批注卡键盘可达性未复测（B-141 既有条目）。

## 时间

15 分钟预算内未覆盖暗色/暖纸与 Mermaid 两档；空状态、设置、查找、表格条、批注卡、大纲、字数面板、1024×700 窄窗已覆盖。
