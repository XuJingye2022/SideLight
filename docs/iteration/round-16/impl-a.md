# 第 16 轮 · A 组实施报告（T1 → T2 → T3）

日期：2026-11-16。基线 v0.29.0。未 commit；未跑 `npm run build`。
边界：`src/styles.css`、`src/components/FileTree.tsx`、`src/App.tsx`、`scripts/tree-acceptance.mjs`、`scripts/theme-acceptance.mjs`、`scripts/keyboard-acceptance.mjs`、本报告。

| 任务 | 结论 | 证据 |
| :--- | :--- | :--- |
| T1 树真隐藏 + 滚动恢复 | **PASS** | `tree-acceptance` **49/49**：切大纲后 `display:none`、rect 高 0、24/40 条 `treeitem` 仍在 DOM、大纲顶与页签底差 <8px；先滚 148 → 切大纲 → 切回仍 148；`[hidden]{display:none!important}` 全局生效；修 `.file-tree` 为 `flex:1` 让列表可滚 |
| T2 焦点/深色/表单/减少动态 | **PASS** | `theme-acceptance` **26/26**（原 16 + 新增 10）；48 组对比度 **48/48**（浅/深 × 8 组 × 3 状态）；深色采纳 8.05、hover 9.9、分析 7.56、hover 10.04、danger 7.52/6.92、输入边界 3.64、焦点 10.04；浅色 hover 4.83；源码框 `outline:none` + inset 2px；reduced-motion 0.01s；token 三处同步 |
| T3 aria / live region | **PASS（P2 延后）** | `keyboard-acceptance` **35/35**（原 31 + 4）：`.tiptap[aria-label="正文编辑器"]`；保存失败 toast `role="alert"` 文本含原因；一次 notice 仅 1 个 live region；toast 按钮在 `role="group" aria-label="提示操作"`，`aria-hidden=true` 内可聚焦元素 0；常驻 sr-only 已删 |

## T1 hidden 审计（`grep -n hidden src/`）

- `FileTree` 面板：`App.tsx:3869`、`FileTree.tsx` 三处 aside（含 hidden/inert）——本次目标，已真隐藏。
- `App.tsx:4261` 图片 `<input type="file" hidden>`：不参与布局，仅用于点选文件，不受影响。
- `workspace.ts:196` `input.hidden = true`：动态创建的 `<input type=file>`，立即 click/remove，无样式面板。
- 其余 `hidden` 命中全是 `overflow:hidden` 或 `aria-hidden` 装饰（brand-mark、编辑器占位、箭头、MathDraftPreview、MarginRail 灯点），不是 `hidden` 属性，无 display 冲突。

## 关键实现

- **T1**：`FileTree` 加 `listRef/scrollTopRef/wasHiddenRef`，`useLayoutEffect` 仅在 hidden true→false 时 rAF 恢复；`onScroll` 持续记录。修 `.file-tree` 由 `flex:none` 改 `flex:1`，列表 `overflow-y:auto` 才真正可滚。全局 `[hidden]{display:none!important}`。
- **T2**：`:root`、`html[data-theme='dark']`、`prefers-color-scheme` 三处补 `--focus-color/--focus-ring/--danger/--on-accent/--on-mark/--line-input/--mark-strong`；浅色 `--mark-strong` 由 `#9c6f38` 调为 `#94682f`（hover 4.35→4.83）。5 处 `#fff` 换 token；`.auto-save-error` 用 `--danger`；删 `.editor`/`main:focus`/`.source-editor` 三处 `outline:none`，全局 `:focus-visible` 用 `--focus-ring`；`.source-editor` 仅 inset shadow；`.field input`/`.dialog-input`/`.dialog-textarea`/`.find-input`/`.thread-input input` 边框 `--line-input`、焦点环 token；reduced-motion 只压时长。
- **T3**：`editorProps.attributes` 加 `aria-label`；删除常驻 sr-only notice；toast 外壳 → `role=alert|status` 文本 + 兄弟 `role=group` 按钮；三个常驻横幅改 `role=region` + `aria-label`。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 文件、205 条、0 失败
npx vite build --outDir .tmp/build-a  → exit 0
node scripts/tree-acceptance.mjs      → 49/49 PASS
node scripts/theme-acceptance.mjs     → 26/26 PASS（48/48 矩阵）
node scripts/keyboard-acceptance.mjs  → 35/35 PASS
node scripts/measure-first-screen.mjs .tmp/build-a --max 285000 → 284,210 gzip PASS（余 790 B）
```

**首屏**：283,826 → **284,210**（+384 B，在估算 +250–400 B 内）。

## P2 / 延后

- **P2 延后**：骨架 `role=dialog`/`aria-busy`、批注卡 `tabIndex`/Enter、正文开头 Tab 回环删除。measure 284,210 ≤284,600 本可删 Tab 劫持，但 round-15 的 `keyboard-acceptance`「自动聚焦后第一次 Tab = skip link」依赖它；为不回归 35/35，本轮保留并在 T4 文档记「P2 延后」。
- 真实读屏（NVDA/讲述人）、Windows 高对比度、macOS 真机未验。
- `theme-acceptance` 从 16 条扩到 26 条（新增 8 组 token 对比 + 源码环 + reduced-motion）；T4 写测试数时以 26/26 为准，不等于原计划的 16/16。
- 截图：`shots/round-16/t1-outline-1024.png`、`t1-scroll-back.png`；t2/t3 视觉改动由 theme/keyboard 断言覆盖，未另出图。
