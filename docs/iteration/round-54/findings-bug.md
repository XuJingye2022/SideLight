# 第 54 轮 缺陷猎人（finder-bug）

判定：**无新 P0/P1**。2 条 P2（1 条新 + 1 条口径修正）；另 B-109 复现成功。startSha `b01a4e6` 未变；dev 5175 + CDP 9222（每段前 `node .tmp/reset.mjs 9222`）；假工作区 `.tmp/r51-fsa.mjs`；四条批量实测 console/pageerror 均 0 条。

## P2-1 「全部替换」全程静默：无提示、无替换计数

- 复现：打开文件夹 → 正文里 Ctrl+F → 输入 `cat`（计数 `1 / 8`）→ 替换为 `DOG` → 点「全部替换」。
- 实际：计数条直接变「无结果」，**无任何 toast、无「替换了 8 处」**；3 次独立实测都是 `toastAfter=null`（`.tmp/r54-bug-{a,b,d}.json`）。紧跟的 Ctrl+S 才以「已保存 lat.md」间接证明写过盘；磁盘确为新文本。
- 期望 vs 实际：一次替换 8 处却零反馈。
- 证据：`src/components/FindBar.tsx:131-133`（钮只调 `onReplaceAll`）；`src/App.tsx:1956-2050` 的 `replaceEvery` 无 `show()`。→ BACKLOG `B-211`（deferred）。

## P2-2 设置面板页脚：B-108「切字」已不复现，残项只剩 78 px 溢出与缺底部内边距

- 1440×900：`.dialog` y 20–880（高 860），`scrollHeight 936 / clientHeight 858`（溢出 78），`.dialog-actions` y 823–859，**完整在框内、距框底 21 px**（sticky 生效）；1000×620：框 20–600，页脚 543–579，同样在框内；滚到底（scrollTop 358）仍可见。截图 `shots/round-54/settings-620.png`。
- 期望 vs 实际：B-108 写的「页脚切字 / 页脚出框」测不到；真实残项是整框溢出 78 px、`.dialog` 无底部内边距，内容滚到页脚下方时被 sticky 底板压住（打磨级）。
- 证据：`src/styles.css:1202-1211`（`.dialog` max-height/overflow/无 padding-bottom）、`:1254-1263`（`.dialog-actions` sticky）；`.tmp/r54-bug-a.json` s1。→ B-108 行补证据，建议 planner 改验收口径为「页脚始终可见 + 缺底部内边距」，勿按「切字」修。

## P2-3 主题 radiogroup 方向键仍无效（B-109 复现）

- 复现：设置 → Tab 到「浅色」→ ArrowRight。
- 实际：焦点仍是「浅色」（`afterArrowFocus`），三项 `aria-checked` 不变（跟随系统仍 true），三个 `role=radio` 无 `tabindex`（全进 Tab 序）。
- 证据：`src/components/SettingsDialog.tsx:43-68`；`.tmp/r54-bug-a.json` s1。→ B-109 仍 open（补证据）。

## 五条路径（均通过，留正向证据）

1. **设置预览/取消**：点「深色」→ `data-theme=dark`（body 背景 `rgb(21,23,26)`）→ 取消 → 回 `system`、背景回 `rgb(246,244,238)`；Esc 关面板焦点回「设置」钮。
2. **查找开关语义**：拉丁文 `cat` 8 处 → Aa 6 → Aa+ab 2 → ab 4，与 `\b`（只认 ASCII 词边界）预期一致；关查找再开保持开关与查询词。
3. **全部替换保真**：`<mark>` / `<kbd>` / `&nbsp;` / `&copy;` 保存逐字节不变，`&amp;(nbsp|copy);` 0 命中；撤销后再存回原文。证据 `.tmp/r54-bug-d.json`。
4. **源码模式编辑 → 立刻导出 HTML**：导出含新句、无旧句（`exportHasNew=true` / `exportHasOld=false`，`.tmp/r54-export-src.html`）；源码里 Ctrl+F 开条且锁替换（「源码模式下不支持查找定位与替换…」），预览同理（「预览是只读视图…」）。
5. **表格 / 任务列表 / 拖入**：单元格打 `# ` 仍是 `<p># </p>`、`h1/h2/h3` 0 个，保存写 `甲AA<br>#`；任务项 Enter 续项 2→3 且位置正确；拖入 `.md` 只提示「不会直接打开」，正文与树都不变（B-003 仍 open）。Ctrl+S 写盘计数 `getFile 2 / writable 1 / close 1`。

## UNVERIFIED

- 只读 / 占用导致的写回失败提示；真实中文 IME；WebView2 宿主内同一批路径。
- 1 MB 载入/保存本轮未重测（第 53 轮 1,631 ms / 100 ms）；本轮不涉性能改动。

脚本 `.tmp/e2e-r54-bug-{a,b,c,d}.mjs`；原始日志 `.tmp/r54-bug-{a,b,c,d}.log` 与 `.json`；截图 `shots/round-54/settings-620.png`、`shots/round-54/find-latin.png`。
