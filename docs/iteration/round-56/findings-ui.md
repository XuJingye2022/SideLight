# 第 56 轮 finder-ui 报告

- 轮前 startSha `882eb49d87d34373720e37c968c57cb678e41557`（HEAD 未变，本角色只读，未改产品代码）。
- 环境：dev `http://localhost:5175`（未重启）；CDP 9226，每段前 `node .tmp/reset.mjs 9226`。
- 脚本：`.tmp/e2e-r56-ui-a.mjs`、`-b.mjs`、`-c.mjs`、`-d.mjs`；原始日志 `.tmp/r56-ui-{a,b,c,d}.log`。

## 结论：1 条新 P1，无 P0

## F1 [P1] 暖纸主题 12px 弱文字对比度 4.04:1 / 4.27:1，低于 AA 4.5

- 实测（CDP 探针 D，`getComputedStyle` + WCAG 相对亮度，`.tmp/r56-ui-d.log`）：
  | 主题 | `--ink-faint` 字号 12px | 在纸底 | 在侧栏底 |
  | :--- | :--- | :--- | :--- |
  | 浅色 | `#666c72` | 4.83:1 | 4.67:1 |
  | 深色 | `#9aa0a6` | 6.8:1 | — |
  | **暖纸** | **`#7a6b54`** | **4.27:1** | **4.04:1** |
- 暖纸（第 55 轮 B-105 新增）是唯一低于 4.5 的一套。受影响的可见文字都用 `--ink-faint`、`--text-xs`（12px）：
  - 状态栏「0 字」触发钮、缩放比例、自动保存/元数据 chips：`src/styles.css:1739-1743`（`.status-chip-quiet`），实测 `.stats-trigger` 4.27:1（`.tmp/r56-ui-d.log` 三套主题对照）。
  - 侧栏空状态说明「打开一个文件夹后，保存会写回原文件」：`src/styles.css:581-599`（`.file-tree-empty` / `.file-tree-empty-sub`），底色是 `--panel: #efe2c9` → 4.04:1。
- 证据截图：`shots/round-56/sepia-faint-text.png`（暖纸 1440×900 空文档，左下「0 字」与侧栏说明明显发灰）。
- 为什么漏过：`src/lib/themes.test.ts` 只断言 ink/paper 的对比度（第 55 轮记录 10.77:1），没有 faint 对 paper/panel 的用例。
- 建议改法：`src/styles.css:77` 暖纸 `--ink-faint` 由 `#7a6b54` 改 `#6b5d48`（同文件 `--ink-soft` 值；实测 paper 5.27 / panel 4.99），并在 `themes.test.ts` 加 faint↔paper、faint↔panel 两条断言，防止再回退。

## 矩阵与真点结果（无新问题，供后续轮次复用）

- 1440×900 与 1024×700：`documentElement` 横向溢出 0、纵向溢出 0；无出屏控件（`.tmp/r56-ui-a.log`）。`.app` 在 1024 下 `min-width` 计算为 0，窄窗不横向滚动。
- 弹层：设置 1440×900 框 860 高、页脚 823–859 完整可见；1024×700 内容溢出 351px、页脚仍可见（sticky 生效）。B-108 残项只剩溢出，不新增条目。
- 查找条 7 个按钮：无查询时「上一处/下一处/替换/全部替换」`disabled` + `opacity 0.4`，状态正确。
- 侧栏 `tablist`：`role=tab`，当前项 `tabindex=0` 另一项 `-1`；焦点在「文件」按 `ArrowRight` → 焦点与 `aria-selected` 都到「大纲」（`.tmp/r56-ui-c.log`）。
- 焦点环：顶栏/工具栏 17 个可聚焦钮全部 `outline: solid 2px rgb(43,109,100)`，无 `outline:none` 漏项。Tab 到正文后按 Tab 回 skip link 是 `src/App.tsx:5400-5407` 的设计（只在文首 `1/1` 时劫持）。
- 悬停：工具栏钮背景 `transparent → rgb(232,240,237)`、文字 `rgb(86,92,97) → rgb(35,84,77)`，有可见反馈。
- 表格工具条：1440 与 1024 下均 x=0、宽=视口宽、无出屏。插入菜单 9 项（表格/代码块/引用/任务列表/分割线/图片/公式/公式块/链接）。
- 中文正文：`--font-read` 衬线、17px / 33.15px 行高、`overflow-wrap: break-word`，窄窗不横向溢出。

## P2（补证据，不新增 ID）

- B-109 复现（第 54 轮记录 3 项，现在 4 项）：设置主题 radiogroup 4 个 `role=radio` 均无 `tabindex`，焦点在「浅色」按 `ArrowRight` 后焦点与 `aria-checked` 都不动（`.tmp/r56-ui-d.log` `radioArrow`）。
- B-110 复现：`I` 21×24、`.stats-trigger` 22×24（`.tmp/r56-ui-b.log`）。
- 观察（P2）：空文档占位「从这一句开始写」由编辑器内 widget 呈现，不是 `data-placeholder`；与 Typora 一致，不算问题。
