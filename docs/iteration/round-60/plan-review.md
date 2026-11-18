# 第 60 轮计划审查（critic，revision 1）

审 `plan.md`（revision 1），只读。起点 HEAD `5384410`=startSha，工作区只有 BACKLOG 改动与 round-60/、shots/ 未跟踪。首版原文存 `.tmp/r60-plan-review-rev0.md`。**结论 PASS**：R1–R6 全修，新发现 6 条 P2；红线无违反（schema/保存链/批注/依赖/release 未动）。

## 上一版落地
- R1 ✓ `plan.md:24` 第 (3) 步改事务判定（命中缓存标题区间才 `build()`，否则 `set.map()` 映射），门槛改相对口径（基线 `.tmp/r61-b1-before.json`，p50 差 ≤ 改前 60%，残值只记），无绝对 ms 门槛。
- R2 ✓ 同条第 (1) 步先处理 `tocResync` 再判 `docChanged`，单测第 2 条覆盖（`tocRender.ts:109` 早返回已核）。
- R3 ✓ `plan.md:27`（a）改 `Decoration.node`+`is-revealed`，CSS 只隐非选区；验收加「光标在内可见、Backspace 能删」。
- R4 ✓ `plan.md:31` `listTabbable` 单算、不复用 `tabbablePath`（`FileTree.tsx:141` 会回退 `nearestAncestor`）；外层 div 补 `ref`/`onKeyDown`（`:460-461` 现无，`:491-495` 只在树分支）。
- R5 ✓ 断言 `'35 项|缺 7 项|36 项有|6 项缺'`=0（`README.md:97`、`AGENTS.md:74` 各 1），`packaging/README.md:43` 同步；39/4 与表自洽（有 36 行、缺 6 行，移 3 拆 1）。
- R6 ✓ B2 预览用同一遍 DOM 的顶层标题，用例加引用内标题；A2 写明 Ctrl+Z 在点回正文后断言（`App.tsx:5352-5357` 已核）。
- A3 实测：`-PreflightOnly` 改前输出 `UNVERIFIED …0.31.1.0`、`summary: preflight（1 UNVERIFIED）`、exit 0；`-Setup host\bin\Sidelight.exe -PreflightOnly` 为 0 UNVERIFIED、exit 0。两条验收数字可复现。

## 新发现（P2，6 条）
1. B2 的 `is-revealed` 只写在「未 docChanged」分支会复现 R3：造出 `[TOC]` 的那笔事务同时 docChanged+selectionSet，按 `plan.md:24` 走第 (3) 步，不算揭示类 → 段落当场隐藏，此后每键仍走 (3) 永不露出。修：apply 末尾（build/map 之后）统一按 `transaction.selection` 算一次；单测加一笔 docChanged+selectionSet。
2. B1 的停笔 300 ms resync 无条件全量 `build()`：1 MB 592 条 ≈ +29 ms（`findings-code` F1 的 90/61），每次停笔一次长任务；而它又是「正文变标题」进目录的唯一路径。验收「标题改即更新」没写是哪一种。修：只在「上次构建后有未重建的 docChanged」时派 meta；验收分「改已有标题（即时）/正文变标题（等 400 ms）」。
3. B3 对比度口径与实测不符：`findings-ui` F1 的首行悬停底是实色 `rgb(238,224,194)`（首行即当前文件，`styles.css:658` 用不透明 `--accent-wash`），按 plan 的 70% 合成算 4.494、实色 4.457，都压 4.5；且 `themes.test.ts:63` 要求 `--ink-faint` 比 `--ink-soft` 浅，亮度可用区间仅 0.114–0.129。修：按最坏底（实色）取 `#6f6047` 之类并留余量，验收同量 hover 与 is-active 两行。
4. A2 用「dirty 真」测不到 F1 症状：改前 dirty 时 `requestLoad` 已走 `:2434-2440` 的 same 分支，`sl-parse-done`/`scrollTop` 改前就绿；3.4 s 冻结只在干净文档（自动保存已落盘）发生。修：加干净文档用例，断言 `getFile` 不增、`innerText` 长度不变；dirty 用例只守「改动没丢」。
5. A 轮门禁只写 `npm test`，但 A1/A2 改 `.tsx`；`npm test` 是 40 条 `node --experimental-strip-types src/lib/*.test.ts` 链，不含 `tsc`（`npm run build` 才查类型）。修：A 轮门禁写 `npm run build` 或 `npm run verify`。
6. B1 的「单测 2 条」现在没有缝：`tocRender.test.ts` 只测纯函数 `buildTocDecorations`，`createToc` 返回 Tiptap `Extension`，拿不到插件 state。修：导出插件工厂（`createTocPlugin`）或抽纯函数 `tocNextState(tr, prev)`，测试用 `EditorState.create({schema, plugins})` 不碰 DOM。

备注：`docs/typora-gap.md:85-87` 的「建议的下一批」仍把 TOC/全局搜索/文件列表列为待做，A3 改计数时同批顺掉；A3 的 TOC 行别写内部轮次 id「B2」。
