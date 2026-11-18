# 第 74 轮 finder-delta 回归检查

只读；dev 5175、CDP 9226（先 `reset.mjs 9226`）。startSha `dec7c02`（=HEAD，0 pageerror）。查 `dec7c02^..dec7c02` 的交互面：`src/styles.css`（B-154）、`tocRender.ts`（B-155）、`mathReveal.ts`+`App.tsx`（B-156）。

## 日志
`e2e-r74-delta.mjs`→`.tmp/r74-delta.json`；探针 `e2e-r74-probe-{blockmath,save}.mjs`→`.tmp/r74-probe-{blockmath,save}.json`。

## 1 · 待办（B-154）无回归
`li` 高 **33.14**；复选框中心−首行文字中心 **0.06 px**；基线 50.14/7.5 未回退。首项 End→Enter→打字 → 任务项 +1 且为未勾项；`Ctrl+Z`×2 回 3 项。勾选后 `Ctrl+S` 写回 `- [x] 甲` / `- [ ] 乙` / `- [x] 丙` 全对。新规则只挂 `ul[data-type="taskList"]`；普通列表 `li > p` 仍是既有 `margin:0`（`src/styles.css:777`）。

## 2 · TOC 相邻即露（B-155）无回归
载入（光标在标题一，隔 4 块）：`.toc-source` 1、`is-revealed` false、高 **0**。点尾段（标记段后一块）→ true、高 33.14；在尾段打 `Z` → Z 落进尾段、仍 true、高仍 33.14（docChanged 后不闪不跳）。点标题一 → false、高 0。`[TOC]` 仍在。

## 3 · 公式露源码（B-156）无回归
行内：Home+`Shift+→` → `.sl-math-reveal` 1、`::after`＝`"$\alpha$"`、KaTeX `none`；→ 移开 0。删行内 atom（2→1 节点）后残类 **0**、露 0；`Ctrl+Z` 回 2 节点。块级（独立探针）：尾段 ↑ → 选中 `[data-type="block-math"]`、`::after`＝`"$$\beta$$"`、`.block-math-inner` `none`；再 ↑ 移出 0；自上段 ↓ 也露。写回无装饰类，`$\alpha$` 原样。

## 边界
- **无新 P0/P1，无新回归**，不改 BACKLOG。
- 非回归：块级公式写回三行（`$$`/`\beta`/`$$`），序列化代码不在 diff 内，属既有行为。
- 作废读数：`tocWidgets` 选择器应为 `nav.sl-toc`（`tocRender.ts:58`）；块级方向键偏移已复证。
- 未跑：`npm run verify`/`npm test`；过期脚本 `keyboard-acceptance`、`data-safety`。
