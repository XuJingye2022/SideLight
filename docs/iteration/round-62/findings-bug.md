# 第 62 轮缺陷侦察（finder-bug）

- 轮前 `12f36e4`；dev 5175；CDP 9222；两条脚本 0 pageerror。
- 脚本 `.tmp/e2e-r62-bug-toc.mjs`、`.tmp/e2e-r62-bug-toc2.mjs`；日志 `.tmp/r62-bug-toc.log`、`.tmp/r62-bug-toc2.log`。
- 路径：TOC 标记检测边界（6 个种子文件）→ 保存保真 → 焦点（`Ctrl+K`、Esc）。

## F1 [P1] 软换行段落夹一行 `[TOC]`：整段文字在编辑视图与预览一起消失

**复现**（假工作区）：种子 `soft.md` = `# 甲\n\n第一行文字\n[TOC]\n第三行文字\n\n## 乙\n\n尾段。\n`（CommonMark 里是一个段落，段内软换行）。打开后 `第一行文字`、`第三行文字` 在编辑视图不可见；`Ctrl+Shift+P` 预览里同样没有这两行，目录 2 条照出。

**实际 vs 期望**：`.toc-source` 的 `textContent` 为 `第一行文字\n[TOC]\n第三行文字`，`display:none`、height 0；预览用 `marker.replaceWith(nav)` 把整个 `<p>` 换掉。期望只有「整段文字正好是 `[TOC]`」才算标记，段内其它行不得连坐。

**第二触发（更常见）**：`first.md` = `[TOC]\n这里是目录说明。` + 标题 → `.toc-source` 文本 `[TOC]\n这里是目录说明。` 被隐藏，说明文字从编辑视图消失。即「先写标记、紧接下一行写说明」这种写法会中招。

**数据风险**：磁盘不坏——改一字后 `Ctrl+S`，文件 35 B，与原文只差新增的 `改`。风险是「看不见」，作者可能重打或覆盖。

**根因**
- `src/lib/toc.ts:12-14` `hasTocMarker` = `/^[ \t]*\[toc\][ \t]*$/im`，`m` 命中 `textContent` 里任意一行；载入的软换行段落 `textContent` 带 `\n`；`:17-19` `isTocParagraph` 按整段判定。
- `src/lib/tocRender.ts:127` 收整段区间、`:100-102` 对整段挂 `toc-source`，`src/styles.css:941-950` 隐藏。
- `src/components/PreviewPane.tsx:29` 用同一正则找 `<p>`，`:43` 整段换 `<nav>`。

**建议**：段级判定改无 `m` 的精确匹配（`/^[ \t]*\[toc\][ \t]*$/i`，`m` 版只留给整篇原文扫描 `tocRender.ts:131`）；`PreviewPane.tsx:29` 同步；补两条单测（`a\n[TOC]\nb` 的 `sources.length === 0`、预览不换 nav）。

**证据**：`.tmp/r62-bug-toc.log` `editor["soft.md"]`（`sourceCount 1`、`hidden 1`、`blockHidden true`、`visibleText` 无这两行）、`preview["soft.md"]`（`navCount 1`、`itemCount 2`、`textHead` 无这两行）；`.tmp/r62-bug-toc2.log` `editor["first.md"]`（`sources[0].text="[TOC]\n这里是目录说明。"`、`hidden 1`）。

## 排除项（测了，不算缺陷）

围栏代码块、引用块 `> [TOC]`、段内非独占 `第一行[TOC]第二行`、表格单元格、行内代码 `[TOC]`、只有 `[TOC]` 无标题：一律 0 个 `.toc-source`/widget 且字面可见。小写 `[toc]` + 行尾空格正常挂目录。`Ctrl+K` 链接框 Esc 后焦点回 `.ProseMirror`。

## 未复述 / UNVERIFIED

B-120、B-115 本轮未测；B-121/B-126 属宿主。未验：真宿主、真 FSA 写回、中文 IME；Shift+Enter 手打硬换行是否造出带 `\n` 的段落（本轮只验载入路径）。
