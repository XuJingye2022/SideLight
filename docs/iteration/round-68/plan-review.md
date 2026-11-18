# 第 68 轮 plan 审查（critic，revision 2）

结论 **PASS**（0 P0 / 0 P1；6 条 P2，均不阻断）。上一版 3 P1 全修，H5/H6 同修。只读复核 plan / hook / QuickOpen / `App.tsx` / `styles.css` / BACKLOG / `.tmp/r67-delta-ime.json`，未跑 E2E；`git log -1` = `ffaae68`。

## 上一版 P1 复核（3/3 已修）

- **H1** 有界窗口 + 两条兜底齐了：plan:14（`now+60_000`、blur 清零）、plan:15（`sourceMode` 变 false 的 effect 清零）、plan:18（Esc 退出后 ≤3.4 s 仍写）。`App.tsx:3578` 门、`:5684` 卸载、`:3675-3681` 排程 effect 均对上。
- **H2** 改位置无关：plan:17 `len===100_011 && count('中')===seed中数+1 && !includes('zhong')`，并记 `indexOf('中')`。有据：`r67-delta-ime.json` `seedLen:100010`、`afterCommit.diskLen:100011`。
- **H3** 取 (b)：hook 四参 `restoreFocus`（`:17`/`:29`/`:58-70`）＋删 `QuickOpen.tsx:17-19` 自聚焦＋`closeQuickOpen` 按 `viewMode` 分派（照 `:2540-2544`）＋断言改「回 `.ProseMirror`」。StrictMode 双跑下也对。
- **H5** plan:3 改「新 P1 2（B-146/B-148）＋既存 1（B-145）」，与 `findings-code.md:8`、`findings-ui.md:3` 一致。**H6** plan:10 按 `len>0` 计。

## 新 P2（不阻断）

- **P2-1 A2 的 blur 兜底反开 B-145 的「取消」口**：取消组合（接不到 `compositionend`）时 `sourceText`（React state）仍是拼音，blur 把门清零后下一次自动保存照写拼音。修：`compositionstart` 把 `sourceText` 快照进 ref；blur 后 300 ms 仍无 `compositionend` 就把快照 `setSourceText` 写回（DOM 一起回退）。**别省**：`sourceMode` 卸载清零已够 H1，blur 处可只清 `sourceComposingRef`、保留 60 s 有界门，宁可少写一次盘。
- **P2-2 A2 第 5 条与 B2 拦退同一出口**：plan:36 用「文本仍在就不拦」化解，但 CDP `imeSetComposition` 下 blur 是否判「丢字」未测。修：B2.4 加一条「重跑 `.tmp/e2e-r68-impl-a2.mjs` 第 5 条，把拦/放结果与 `textarea.value` 前后对比写进 `round-68/test.md`」，别让下一轮 delta 当回归。
- **P2-3 A3 只改 `onClose`、漏 `onSelect`**：`App.tsx:6046-6051` 仍 `setQuickOpen(false); focusEditor()`。选中含引用式链接定义的文件会切源码态，`focusEditor()` 打在 `hidden` 编辑块上静默失效 → 焦点落 body。修：`await openWorkspaceFile(node)` 之后再按新 `viewMode` 分派（复用同一 helper）。
- **P2-4 `len===100_011` 是观测复合值**：seed `100010` + 「中」3 B 应为 `100013`；r67 记录 `100011`（少 2 B 来自写回归一化，plan 未命名）。修：结果 JSON 记 `seedLen/diskLen/srcLen`，断言只留 `count('中')=+1 && !includes('zhong')`；`100_011` 当记录值，别让实现去凑。
- **P2-5 B-149 未入池、未计入头行**：BACKLOG 只有到 B-148；plan:40「BACKLOG 五项状态」只有 4 个 id。Ctrl+S 在源码组合中直写**未提交拼音**属 B-145 同级的写坏，测出来可能就是 P1。修：先落 B-149 一行（severity 写「待测」），测出写盘则按 P1 计入并同步头行计数（停止条件按 BACKLOG 记账）。
- **P2-6 时间**：A 轮 3 项 + 3 个新 E2E（A2 含 100 KB 与 1 MB 三档）25 min 偏紧，本轮只加不减。修：按 A1→A3→A2，超时先砍 B-147（P2）；A2 第 5 条并进 B1 delta。

## 已复核通过

- 行号全对：`QuickOpen.tsx:17-19/:50/:51-56/:74-77`；`styles.css:2706-2715`（`outline:none`）与模板 `:2779-2783`（`--accent` 边框 + 2px 光晕）；`App.tsx:4020-4021`、`:4034-4040`、`:4121-4124`、`:4279`、`:4281-4306`、`:702/:748`、`:3024-3029`、`:3599-3619/:3621-3630`；`.tmp/` 下 5 个被改脚本全在。
- `dialogOpen` 加 `quickOpen` 不吞 Esc（Esc 块在它之前），只吞产品键，正确。
- A1 修法与 `findings-code.md:26-31` 根因链一致，失败仍走 `:3630`；「3.4 s 再退仍 1」成立（脏按基线比对）。
- 红线未碰：无新依赖、不动 `release/`、不 push、版本 0.32.1；首屏余 18,617 B，A3 量级安全。
