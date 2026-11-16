# 第 21 轮 · 计划（rev2：只做两个 P0）

基线 v0.30.3。本轮缩到两个 P0：**C1 脚注静默损坏**（B 组）与 **D1 删除脏文件丢正文/批注**（A 组）。C2/C3/D2/D3/F4、性能、UX、安装全部延后到第 22 轮及以后，不在本计划里。版本 **0.30.4**；测试只加进既有文件，`npm test` 保持 16 文件 205 条起。
**预算**：首屏 284,766 / 285,000（余 **234 B**）。每个任务单独 `npx vite build --outDir .tmp/build-a` + `measure --max 285000`；超线先删 8 条确认死 CSS（−186 B）与多余字符串，仍超就砍 D1 的「保存后删除」分支（保留确认 + 正文入 trash），**绝不抬 285,000**；被砍项写「延后」，不许悄悄降级。

## T1 C1 脚注：续行与混合尾块（P0/B 组）

- **目标**：`extractFootnotes` 支持 4 空格/`\t` 续行与「脚注块 + `[ref]:` 混合尾部」，富文本不再把定义解析成链接、续行变代码块；保存前对「定义消失但引用还在」必弹确认。
- **为什么现在**：C1 实测「正文[^a] 与[^b]。」+ 4 空格续行，载入即 `^a` 变链接、续行变代码块、**无风险横幅**；源码即保存结果，定义全丢、`lossless? false`。根因 `src/lib/footnotes.ts:18-44` 的「到文末全是定义行」假设；`src/lib/risk.ts:127-166` 的 `footnoteLosses` 在定义整行不存在时 `continue`（findings-core C1）。
- **文件**：`src/lib/footnotes.ts`、`src/lib/risk.ts`、`src/lib/footnotes.test.ts`、`src/lib/diff.test.ts`、`scripts/data-safety-acceptance.mjs`
- **步骤**
  1. `FootnoteSplit` 改为 `blocks: Array<{ kind: 'footnote' | 'ref'; text: string; gapBefore: number }>`：`gapBefore` 记录该块与上一块之间的空行数；脚注块内允许 `^ {2,}|\t` 开头的续行（并入同一 `text`）；脚注块与 `[ref]: url` 引用定义块可同时出现在尾部，按原文顺序收集。
  2. `joinFootnotes(body, blocks)` 按 `gapBefore` 逐块拼回（脚注与引用定义各自保序、保空行）；公共签名 `extractFootnotes(body) → { body, footnotes }` 与 `joinFootnotes(body, footnotes)` 保持不变，App 只透传（类型若需调整由 A 在 T2 的 App 文件里同步，属同一文件）。
  3. `footnoteLosses`：**只在**「原文有 `[^id]:` 定义、正文仍有 `[^id]` 引用、保存后定义消失」时返回 `blocking: true`（`footnote-definition`）；用户把引用与定义一起删掉不拦。
  4. 测试（既有文件）：`footnotes.test.ts` 加多行脚注、脚注后接 `[ref]:`、脚注块在文末三种提取/拼回逐字节用例；`diff.test.ts` 加「定义消失但引用仍在 → blocking」「引用+定义一起删 → 不 blocking」；`data-safety-acceptance.mjs` 用 `throughApp` 跑多行脚注与混合尾块，断言 `identical === true` 且 `blocking` 为空（修复后）。
  5. 两次往返字节稳定：同一原文连续保存两次，输出逐字节相同（写进 `data-safety-acceptance` 或 `footnotes.test.ts`）。
- **验收**
  1. 多行脚注样本 `throughApp` **逐字节相同**；脚注+引用定义混合样本相同；`npm run roundtrip` 仍 **7/7** 不退化。
  2. 修复前 `footnoteLosses` 对该样本返回 blocking、修复后为空；「引用与定义一起删除」始终不 blocking。
  3. 连续两次保存输出相同（无漂移）。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip; node scripts/data-safety-acceptance.mjs`
- **风险与回退**：定义识别过宽会把普通 `[ref]:` 当脚注（用 `[^` 前缀严格区分）；`gapBefore` 拼错会让脚注位置/空行漂移，靠逐字节用例兜。回退：`git checkout -- src/lib/footnotes.ts src/lib/risk.ts src/lib/*.test.ts scripts/data-safety-acceptance.mjs`。
- **难度** M ｜ **量级** 130–190 行

## T2 D1 删除脏文件：正文与批注一起进 trash、撤销一起回来（P0/A 组）

- **目标**：删除当前有未保存改动的文件必须先确认并写明「正文与批注会一起删除」；删除时把当前正文写入 trash、`drafts`/`annotations` 一并移入 `.sidelight/trash/`；先写 trash 成功再删原文件，失败中止；撤销同时搬回正文与缓存。
- **为什么现在**：D1 实测在 `a.md` 打 `IMPORTANT-NEW` 后删除：确认框**无未保存提示**、trash 只有旧字节、`drafts/a.md` 与 `annotations/a.json` 被清成 `null`；撤销后文件回来但批注永久消失（findings-data D1）。根因 `src/App.tsx:1895-1973` `removeFile` 不看 `dirty`，`:1923-1931` 无条件 `removeCache`，撤销只 `restoreFromTrash` 字节；`src/components/TreeActions.tsx:284-287` 文案只讲 trash 位置。
- **文件**：`src/App.tsx`、`src/lib/trash.ts`、`src/components/TreeActions.tsx`、`scripts/tree-acceptance.mjs`
- **步骤**
  1. **新建 `pendingDelete` 状态**（`{ node, confirmKind: 'dirty' | 'clean' } | null`），不复用 `pendingSwitch.after`；渲染独立的删除确认对话框（复用 `.dialog` + `useDialogFocus`）。
  2. 脏文档（`dirtyRef.current`）删除：三选一 `保存后删除 / 直接移到回收站 / 取消`，正文写明「未保存的正文与这篇的批注会一起删除」；「保存后删除」走 `requestSave('file', { after: () => performDelete(node) })`，不经过 `pendingSwitch`；「直接移到回收站」直接 `performDelete`；「取消」清 `pendingDelete`。
  3. `performDelete`（`trash.ts` 辅助）：① 取当前编辑器正文（若是该文档），写成 `<trashName>.md`（覆盖旧字节版本）；② 把 `drafts`/`annotations` 缓存改名为 `<trashName>.draft`/`.json` 放入 `.sidelight/trash/`（命名冲突加序号，不覆盖）；③ **先确认 trash 写入成功**，再删原文件；任一步失败 → 中止删除、原文件保留、给可读错误。
  4. `restoreFromTrash`：恢复 `<trashName>.md` 后把 `.draft`/`.json` 搬回原缓存键；撤销 toast 仍 6 s，过期后不自动清 trash（与 ADR-0013 的「不自动清理」一致）。
  5. 非当前文件删除：同样搬 `drafts`/`annotations`；做不到（无目录句柄/缓存不存在）时**明确不承诺**，把确认文案改成「只移动文件本身」。
  6. `tree-acceptance.mjs` 加「删除脏文件 → 撤销 → 正文+批注都回来」用例。
- **验收（扩 `scripts/tree-acceptance.mjs`）**
  1. 脏 `a.md` 删除 → 出现三选一确认，文案含「未保存的正文与…批注」；选「保存后删除」→ 文件内容为最新正文（含 `IMPORTANT-NEW`）；选「直接移到回收站」→ trash 的 `.md` 含最新正文。
  2. 删除后 `.sidelight/trash/` 内有 `<trashName>.draft` 与 `.json`；点「撤销」→ `a.md` 回来且内容含最新正文，重开显示「从 .sidelight 恢复了 1 条批注」。
  3. trash 写入失败（假 FS 注入抛错）→ 删除中止、原文件仍在、错误可见。
  4. 非脏文件删除/撤销行为不变；`tree` 仍 **49/49**。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：顺序错（先删原文件再写 trash）会丢当前正文；缓存搬移在撤销前被清就「批注永远没了」；trash 命名冲突覆盖旧副本。回退：`git checkout -- src/App.tsx src/lib/trash.ts src/components/TreeActions.tsx scripts/tree-acceptance.mjs`。
- **难度** M ｜ **量级** 130–190 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | B（builder2，先做） | `src/lib/footnotes.ts`、`src/lib/risk.ts`、`src/lib/footnotes.test.ts`、`src/lib/diff.test.ts`、`scripts/data-safety-acceptance.mjs` |
| T2 | A（builder，并行） | `src/App.tsx`、`src/lib/trash.ts`、`src/components/TreeActions.tsx`、`scripts/tree-acceptance.mjs` |

- 零重叠：B 只碰 lib + 测试 + data-safety 脚本；A 只碰 App/trash/TreeActions + tree 脚本。`App.tsx` 对脚注类型只做透传，若 `tsc` 要求类型同步由 A 在同一文件内改。
- 顺序：T1 与 T2 并行；各自完成后跑自己的门禁与单独的 `.tmp/build-a` + measure；根代理最后 `npm run build` + `measure`，再出 0.30.4。
- 报告：A 组 `docs/iteration/round-21/impl-a.md`，B 组 `impl-b.md`；截图 `shots/round-21/t2-delete-dirty.png`。

## 预算与门禁

- 首屏 284,766 / 285,000（余 234 B）；C1 与 D1 各测一次，合并后再测一次。
- 超线处理顺序：① 删 8 条确认死 CSS（`diff-view`、`diff-line`、`diff-sign`、`diff-added`、`diff-removed`、`math-preview`、`thread-user`、`thread-assistant`，实测 −186 B）与多余字符串；② 仍超则砍 D1 的「保存后删除」分支（保留三选一里的「直接移到回收站」与正文入 trash），并在计划/报告写「延后」；**不抬 285,000**。
- 门禁：`npm run build`、`npm test`（16 文件、205 条起）、`npm run roundtrip`（7/7 不退化）、`tree` 49、`theme` 27、`keyboard` 35、`data-safety` 与 `tree` 新增断言全过。

## 本轮不做（明确延后）

**第 22 轮**：C2 公式 `&amp;`/`\\` 折叠、C3 文末 `&nbsp;` 累积、D2 浏览器草稿读回与源码模式 256 KiB 门、D3「打开文件」绕过 5.5 MiB、F4 正文 Tab 逃逸。**第 22 轮起**：perf P1/P2（1 MB 第二键冻结、100 KB 逐键 155–171 ms）、memo/B4/B5、F1/F2/F3/F5、L1–L5、I1–I5、C4/C5、D4/D5、1.0 门槛。

## 风险最高的任务

**T2（D1）**。它把删除从「移动一个文件」改成「正文 + 两个缓存一起进 trash 再撤销搬回」：顺序错一步（先删原文件再写 trash）就丢当前正文；缓存若在撤销前被清，就是「文件回来了、批注永远没了」；trash 命名冲突还可能覆盖旧副本。缓解是「脏删除 → trash 的 `.md` 含最新正文」「撤销后重开显示恢复 1 条批注」「trash 写失败则删除中止」三条硬断言。次高 T1：`gapBefore` 拼错会让脚注位置与空行漂移，靠逐字节用例兜住。

## 版本与交付

- 版本 **0.30.4**（修复；`package.json`/`package-lock` 由根代理统一升）。
- 交付：T1 修复 + 逐字节断言；T2 三选一确认 + trash 全量搬移 + 撤销恢复；`npm test` 16 文件、`roundtrip` 7/7、`tree` 49 全绿；首屏 ≤285,000。
