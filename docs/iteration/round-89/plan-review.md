# 第 89 轮计划审查（rev 2：B-107 自定义快捷键）

**结论：PASS**（rev 1 的 P1-1 / P2-2 / P2-3 已修掉；新 3 条 P2 不阻塞，开工时带上）

锚点核对通过：`App.tsx:4283-4557` keydown、8 分支 `:4417/:4437/:4445/:4450/:4460/:4483/:4502/:4524`、`dialogOpen:4287`、`commitSettings:4638`、`inlineSyntaxRef:966`、`ShortcutsDialog:14-52`、`styles.css:1532-1541`、`SettingsDialog:137/226`、`.tmp/r58-docs-check.mjs`、`.tmp/r51-fsa.mjs`、`.tmp/e2e-r80-a3-settings.mjs` 均在；`keybindings` 三处基线 grep 0；BACKLOG open 恰 1（B-107）。未碰红线（无新依赖、不动序列化，不跑 roundtrip 正确）。

## rev 1 六条复核

- **P1-1 已修**：`RESERVED_KEYBINDINGS` 取 `ShortcutsDialog:14-52` 除 8 条，另列 `Ctrl+1–6/0`、`Ctrl+H`、`Ctrl+B/I/E/Shift+X`、`Ctrl+L`、`F11`、`Ctrl+N/O/Shift+S`；`bindKey`/`resolve` 同路；A1 补 `bindKey(save,'Ctrl+K')` 拒+label、`resolve({save:'Ctrl+H'})→Ctrl+S`，条数 ≥16。我逐条对 `:4393-4556` 的硬分支（F11、`Ctrl+Alt+N/O/Shift+O/S/E`、`Ctrl+S`、`Ctrl+Shift+F`、`Ctrl+F/H`、`Ctrl+K`、`Ctrl+M/Shift+M`、`Ctrl+P`、`Ctrl+1–6/0`、`Ctrl+/`、`Ctrl+Shift+1/3/L/P`、缩放 3 条、字号 3 条）与对话框清单，被删分支的键位都在保留集里。
- **P2-2 已修**：三档先量后判、先点开首条 details、仍超把 B-150 目标改实测。补算：闭合组 ≈41 px（margin 12 + summary 6+6 + 12px 行高）；`:226` 的 `.dialog-note` 在 430 px 框宽折 2 行 ≈54 px，移进 hint 可回收；再缩 margin/padding 4×3+4×3 ≈24 px，合计 ~78 px，盖住新增组后回 ≤64 可信。口径提醒：「≤64 才过」与「仍超改目标」别同时当硬门，按先量后判。
- **P2-3 已修**：旧键一律页内 `dispatchEvent`；#3 先保存关面板再断 `Ctrl+S`；#2 补 reload 后重开文件+改脏。
- **P2-4 已修**：#1 补 `Ctrl+Shift+F` 两条、`Ctrl+Alt+N`、`Ctrl+Alt+E`。
- **P2-5 已修**：`:78`、README:231、「有」行措辞、ShortcutsDialog 说明。计数已核：现 41/4、子节 1/1/2、missRowSum 4，移走本行正是 42/42、3/3、1/1/1、missRowSum 3；README:102/AGENTS:74 确是 41/4。
- **P2-6 基本修**：基线 307,630、A1/A2 各记 verify、§4 有回滚门。残留：§4「+0.6–1.0 KB」未写 raw/gzip，按实测记。

## 新 P2（开工时带上）

**P2-7 A3#2 首句「新键写盘 1 次」会假红**：`requestSave` 对已保存普通文件早退（`App.tsx:3514-3517`「没有改动，未写入。」，0 写）；#2 接在 #1 的 `Ctrl+S` 之后是干净态，设置保存不改正文。
修法：#2 开头补「打 1 字改脏」再按新键；或先断「0 写 + 该 toast」再改脏补测。

**P2-8 改键后还有 3 处键位提示写死默认键**：`FileMenu.tsx:21/26`（新建 `Ctrl+Alt+N`、查找 `Ctrl+F`）、`App.tsx:4468/4477`（「先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」）、`App.tsx:5828`+`findBarState.ts`（「切回富文本（Ctrl+/）」）。8 条里这 4 条被改后提示即错，计划只给 ShortcutsDialog 加说明。
修法：`FileMenu` 的 `ITEMS` 按当前键位生成（2 条），或在 A3#5 与报告里明确记「提示仍用默认键位」并入 BACKLOG，别只写「8 条可改键」。

**P2-9 录制入口没写死，可能吞 Tab**：A2 只说录制态「全键 preventDefault」；若录制由聚焦进入，Tab/Shift+Tab 被吞（钮在 `useDialogFocus` 的 Tab 环里，`useDialogFocus.ts:6-13`、`:65-82`），只能靠 Esc 出。
修法：写死「录制只由点击/Enter 进入，Tab 聚焦不进入」。

## 另两条执行注意

- `.tmp/e2e-r80-a3-settings.mjs` 断 details 恰 2 组，本轮后是 3 组；当模板复用时改这条断言。
- `BACKLOG.md:73` 证据写 `docs/typora-gap.md:83`，实际在 `:72`，顺手校正。
