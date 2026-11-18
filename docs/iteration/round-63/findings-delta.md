# 第 63 轮轮间回归（finder-delta）

轮前 `d770cad`（=HEAD，干净）。只查第 62 轮改到的 TOC 区间：撤销、逐键删除、焦点、保存、预览、表格/公式。B-135 只文档面，无代码改动。

## 无新 P0/P1 回归
`.tmp/e2e-r63-delta-toc.mjs 9226`（先 reset；0 pageerror；`.tmp/r63-delta-toc.log`）：
- 撤销：doc.md 手打 `[TOC]` → nav 1 / 源段 1；`Ctrl+Z` → nav 0 / 源段 0，段落回原样。
- 逐键删除：`Backspace`×5 → nav 0 / 源段 0；再打 → nav 1。
- 焦点：点条目「乙节」后焦点在编辑器，打字落 h2（`Z乙节`），可撤销。
- 保存：`Ctrl+S` 后盘上该行 `^[TOC]$`（未转义），toast 已保存。
- 预览：nav 1、条目 2、无字面；切回编辑 nav 1。
- 双标记 two.md：编辑 2 nav / 2 源段；预览 2 nav、字面 0、条目可点。
- 表格+公式 mix.md：单元格 1→19、nav 1、`.katex` 1、0 错误。

## P2 观察（非本轮回归）
先打 `[TOC]` 再打标题 → nav 0（`.tmp/e2e-r63-delta-order.mjs`、`.tmp/r63-delta-order.log`），`Ctrl+Home` 后仍 0。轮前 `57af262` 同路径（`entries===0` 先返回 emptyState 清空 sources，`previous.sources.length>0` 兜底是死码）行为一致 → 属 B-133 未覆盖的顺序，留给 B-106。

## UNVERIFIED
真 FSA/宿主；1 MB 文档预览每次 render 调 `hasTocSource` 的开销；打印目录沿用第 62 轮。

## 判定
无新回归，BACKLOG 不动。
