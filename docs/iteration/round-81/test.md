# 第 81 轮 tester 验收（未读 `impl.md`）

- 轮前 `287e35f`；验收时 `git diff` 只有 `src/App.tsx`（+76/−17）。
- 环境：CDP 9222–9226 无监听（改探 1 次即止）→ 用 ego-browser CDP **54280** 的 Edge 真机页 `localhost:5175`，before/after 各用 `git stash` 切到 HEAD 与回工作区独立跑；dev 交付的 `/src/App.tsx` 每次记录 `servedHasNewCode`（before=false / after=true，排除混合版本）。
- 结论：**PASS-WITH-UNVERIFIED**（A1 机制门/值门/次门槛、A2 四个主场景与三个反例、A3 单测+静态+模块探针全过；UNVERIFIED 见下）。

## 门禁（本轮各 1 次）

- `npm test`：**45 文件 580 条 580 pass 0 fail**（`.tmp/r81-tester-npm-test.log`；日志为 UTF-16LE，按 `utf16le` 汇总）。本任务无新增测试文件，580 = 第 80 轮基线。
- `npm run verify`：**PASS**，首屏 gzip **304,124 B** ≤310,000（`dist` 已重建；`.tmp/r81-tester-verify.log`）。
- `roundtrip` 免跑：diff 只动统计数据流与草稿清理，未碰编辑器/序列化。

## A1（B-139）1 MB 源码态逐键不再算全篇字数

- 脚本 `.tmp/e2e-r81-tester-a1.mjs`（自写）；输出 `.tmp/r81-tester-a1-before.json` / `-after.json`。
- 机制门（主）：before 无 `sl-source-stats` 标记（c0..c5 全 0，机制不存在）；after **c0=1 → c1=1 → c2=1（+100 ms）→ c4=2（+600 ms）→ c5=2（+800 ms）**，即 c1−c0=0、c2−c0=0、c4−c0=1、c5−c0=1 ✅。
- 值门：after 600 ms 读值 `333,337 字 · 阅读约 1260 分钟` ≡ before 同点读值（逐字符相等）✅。
- 次门槛：每键 longTask **p50 85 → 56 ms**（门槛 ≤85−5=80）✅；max 136 → 107 只记录。`typing.totalMs` after **1,155 ms ≤1,200**（before 1,562，只作对照）→ 数据有效，无需补跑。
- 其余：`value.length` 1,000,012 → 1,000,022（+10）、`sl-parse-done` 3→3、**0 pageerror/console error** ✅。
- 静态：`countText(` 全文件仍 **5 处**（`src/App.tsx:596,1127,1166,1216,3823`）；取值处 `:6094` 为 `stats={sourceMode ? (sourceStats ?? stats) : stats}`，**0 处 `countText(`** ✅（计划里的 1119/1155/1205 是改前行号）。

## A2（B-153）保存成功与「回到基线」都清草稿（含 legacy 键）

- 脚本 `.tmp/e2e-r81-tester-a2.mjs`（自写，15 项）；输出 `.tmp/r81-tester-a2-before.json`（10/15）/ `-after.json`（**15/15**）。
- **改前对照（stash 到 HEAD）恰好复现口子**：D1' `firstZeroMs=null`（草稿一直在）、D2 Ctrl+S 后草稿仍在、L1 legacy 键仍在；D1 回归与 N1/N2/N3 反例在 HEAD 已过。
- 改后：D1 模态期间草稿 1 份 → 取消 3.5 s 后 0 且 `a.md` 12→16 B；**D1' 撤销后 331 ms 归 0（≤600）**、再等 2.5 s 仍 0；**D2 撤销后 150 ms Ctrl+S → 0**（走 `performCommit` 的「正文没变」分支，次触发选 (a)）；**L1 保存后新旧两键都不在**（主键 `…-15eb`、legacy 40 位键），再等 3.2 s 仍 0。
- 反例不回归：autoSave:false 打字 3.2 s 后草稿仍在；模拟 `state.files.set` 抛错时保存失败、草稿仍 1 份且文件未写（toast「保存失败：模拟写失败。改动还在，可以再试一次。」），恢复后 Ctrl+S 成功 → 草稿 0、文件 13→19 B；保存成功后重开同篇 0 草稿、0 草稿弹窗。**0 页面错误** ✅。
- 静态：`discardDraftFor` 声明 `:3055`（在 `finishSaved :3077` 前），先停表再 `draftGenerationRef += 1`；主触发 `:1142`（经 `discardDraftRef`），次触发 `:3195`；`finishSaved` 依赖补 `discardDraftFor`。

## A3（B-134）HTML 导出目录复核（0 改动）

- `node --experimental-strip-types src/lib/export.test.ts` **27/27 pass**（本轮复跑）。
- 静态两证：`src/lib/export.ts:33 buildExportToc` / `:110 applyExportTocHtml` 在；`src/App.tsx:4852` 动态 import、`:4885` 调用（计划 `:4793/:4826` 是旧行号，本批 diff 增加 ~59 行后顺移）。
- 真机探针（ego 页 `import('/src/lib/export.ts')`）：两个导出均为 `function`；`applyExportTocHtml(<h1>…<p>[TOC]</p><h1>…)` → `<nav class="sl-toc"` **1**、字面 `[TOC]` **0**、`id="sl-toc-k"` **2**；ids 数与标题数不等时原串原样返回。B-134 维持 `fixed`，不改代码。

## 回归

- `scripts/stale-save-acceptance.mjs`（CDP 54280 + 5175）：**4/4 PASS**（慢写回包不改标题/正文、随后 Ctrl+S 写 b.md、a.md 仍旧内容）。

## UNVERIFIED

- CDP 9222–9226 不可用（改用 ego-browser CDP 54280 真机页）；假 FSA 不是真实文件系统。
- A3 完整 UI 导出链本轮未重跑（只做单测+静态+模块探针；第 79 轮真机导出证据仍在）。
- 真实中文 IME、真实 FSA、WebView2 宿主、原生打印/另存 PDF。
