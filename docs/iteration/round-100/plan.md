# 第 100 轮计划（revision 1）：diff 对比（正文 vs 打开时）

> revision 1：按 plan-review 的 2 条 P1 + 3 条 P2 修订，范围与任务数不变、不新增任务。round=100，startSha `537c633`；只做队列第 7 条，新 ID **B-227**（tester 收口，本轮不改 BACKLOG）。参考 Review Mode 的只读面板（`review-mode/SKILL.md:99`）；Typora 无 diff。

## 0 语义与基准（P1-1、P2-6）

- 基准 = **打开/载入时的正文**。`baselineRef` 是脏标记基线：`finishSaved`（`App.tsx:3303`）每次写盘都更新，`scheduleAutoSave`（`:4003-4017`）停笔 2,000 ms 写盘，`autoSave` 默认 true（`settings.ts:67`）→ 用它必然显示「相同」。
- 新增 `openedBaselineRef`（声明在 `:656` 旁）：**写 4 处**——初始恢复 `:1351`、宿主正文 `:1394`、宿主不可用 `:1465`（`''`）、`loadIntoEditor` `:2594`（打开/新建/草稿都走它），与 `baselineRef` 同值；**不写**——写盘 `:3303`、宿主回包 `:4261`。不加 state。
- 标签「与打开时相比」；保存/自动保存**不清零**，重开该文件或新建后清零。当前正文取 `contentRef.current()`（`:666`/`:3546`）。面板只读，不改正文、不写盘、不碰批注。
- B-227 写明限制：修订级 diff 需快照存正文（`revisions.ts:18` 不存），留后续轮；空行也算 diff 行。源码态 `.source-hidden` 收成 0 尺寸、预览态整块不渲染 → 入口不可达，无需额外处理。

## 1 体积（P2-4，先算；硬线 320,000）

- planner 实测 `node scripts/measure-first-screen.mjs --dir dist --max 320000` → raw 1,020,054 / gzip **314,726** / 余 **5,274** / 3 文件 / PASS。
- 首屏净增 = **CSS ≤500 B + 入口闭包 ≤100 B gzip**（`getDiff` 闭包在 `App.tsx` 进入口 chunk，订正「唯一进首屏的是 styles.css」）→ 315,326 < 315,500。`diffView.ts` 只被懒 chunk `MarginRail` 引用，`measure-first-screen.mjs:8` 不计；真实首载多下该 chunk（现 2,327 B gzip）+ diffView（≤400 B），只记口径外。
- 门：`npm run build && node scripts/measure-first-screen.mjs --dir dist --max 315500`（`npm run verify` 参数透传本轮未验，不用 `npm run verify --max …`）；`diffView` 在 `App.tsx` 0 命中。

## 2 任务

### A1 纯函数 + 单测（B-227）
files：`src/lib/diffView.ts`（新）、`src/lib/diffView.test.ts`（新）、`package.json`（test 链尾）
- `diffView(before, after, { context = 2, maxRows = 400, maxLine = 500 })` → `{ rows: { kind: 'same'|'added'|'removed'; text: string }[]; added: number; removed: number; truncated: boolean }`；只调 `diff.ts` 的 `diffLines`，不改 diff.ts、不加依赖。
- 规则：① 无变化（含仅 CRLF/末尾换行差）→ rows `[]`、counts 0；② 每块前后各留 `context` 行 `same`，相邻重叠合并、同行只出一次；③ rows ≤ maxRows，超出截后段并置 truncated；④ counts 按全文，不受 context/maxRows 影响；⑤ 空 before 全 added、空 after 全 removed；⑥ 行超 `maxLine` 截到 500 字 +「…」（P1-2，防 1 MB 单行造大 DOM）；⑦ >4,000 行走 `diff.ts:9` 粗粒度，counts 与上限仍对。
- 验收：`node --experimental-strip-types src/lib/diffView.test.ts` 通过、≥10 条（①–⑦ + context=0 + maxRows 边界）；`npm test` **60 文件 ≥844 条** 0 fail；`git diff --stat src/lib/diff.ts` 空。

### A2 UI 接线（B-227）
files：`src/components/MarginRail.tsx`、`src/App.tsx`、`src/styles.css`
- 入口：`.rail-head` 末尾加 `button.rail-diff-open`（「对比」、`aria-haspopup="dialog"`、`title="与打开时相比"`），只在 `railTab === 'notes'` 渲染。`height:16px; padding:0 6px; font-size:10.5px; line-height:1`（覆盖全局 `button` 的 12.5px / `padding:5px 10px`）。
- **不改 `.rail-head` / `.rail-tabs` 规则块**：HEAD 实测 `.rail-head` 空态高 **15**（`.tmp/r100-planner-rail.mjs`，1440×900；`.rail-tabs` 底 − head 底 = **39** = margin 10 + 高 29）；带 3 卡时最高子元素是 `.rail-count`（`height:16px`）→ 头 16，16px 按钮不增高。新规则只加 `.rail-diff-*`。
- 面板：`createPortal` 到 `body` 的 `.rail-diff-overlay`（`fixed;inset:0`）+ `.rail-diff-sheet[role="dialog"][aria-modal="true"][tabIndex={-1}]`；仅 `diffOpen && railTab === 'notes'` 渲染，不进 `.margin-rail` 流（卡片绝对定位会被压）。
- 内容：head（「改动对比」/「与打开时相比」、`+added −removed 行`、关闭钮）+ `li.rail-diff-row.is-same|.is-added|.is-removed`（前置 `+`/`−`、`pre-wrap; overflow-wrap:anywhere`、`max-height:60vh` 可滚）。空态三支：无改动「与打开时相比，没有改动。」；`getDiff()` null「这篇还没有可对比的正文。」；truncated「改动太多，只显示前 400 行。」
- 交互：点入口现算；关闭钮/Esc/背板关闭；`useDialogFocus(diffOpen, sheetRef, '.rail-diff-overlay', true)`；Esc 用 `document.addEventListener('keydown')` + `stopPropagation()`（同 `InlinePopover.tsx:28-40`），App 的 window Esc 链不动。
- App 只加一个 prop：`getDiff={() => (openedBaselineRef.current === null ? null : { before: openedBaselineRef.current, after: contentRef.current() })}`（`:5989-6059`）；不加 state、不碰自动保存与批注。
- 验收：静态（新文件未 add，用 `Select-String` 或 `git grep --untracked`）`rail-diff` ≥2 文件、`getDiff` ≥4 处、`diffView` 在 `App.tsx` 0；`npm test` 60 文件 ≥844 条 0 fail；`npm run build` + 体积门 PASS、记 gzip 与净增；新 CSS ≤16 组、三主题可读、1440/1024 无横溢。

### A3 真机验收 + 回归（B-227）— 归 **tester**，15 分钟；⑧ 只记录（P1-2、P2-5）
files：`.tmp/e2e-r100-diff.mjs`（新）、`docs/iteration/round-100/test.md`、`shots/round-100/diff.png`
- 环境：ego CDP 57270 + `http://localhost:5175`（不重启；9222–9226 无监听，不用 `.tmp/reset.mjs`，脚本自清 storage，沿用第 95–97 轮）。1440×900。
- 夹具：假 FSA 工作区 `diff.md` = `# 对比`、`第一段保持不变。`、`第二段原文，改这里。`、`第三段保持不变。`、`other.md`；**默认设置**（清 localStorage → `autoSave:true`）；点第二段 → `.analyze-button` → 3 张 `.note`。
- 断言：① 改第二段（末加「改过。」）+ 文末 Enter 打「新增的一行。」→ 开面板：`.is-removed` **1**、`.is-added` **3**（改行 1 + 空行 1 + 新行 1）、`.is-same` ≥2、文本含「新增的一行」、计数 `+3 −1`；② 只读：`.rail-diff-sheet input, textarea, [contenteditable="true"]` **0**；③ 关闭钮 → 0；重开 Esc → 0 且焦点回 `.rail-diff-open`；关后 `[inert]` 0；④ 默认 `autoSave:true`（P1-1）：改字后等 2.6 s 并断言假 FSA 已写入，再开面板仍 +3/−1（保存不清零）；点文件树重开 `diff.md` → 空态「与打开时相比，没有改动。」；⑤⑥ 页签与几何：对话页签入口 0、切回批注 1；3 卡时 `.rail-head` 高 **≤16.5**、`.rail-tabs` 底 − `.rail-head` 底 = **39±1**（chrome 底 ≤55.5，HEAD 55）、首卡 `style.top` ≥66、3 卡不重叠、末卡底 ≤ 整体评价顶、`.rail-diff-sheet` 在 1440 与 1024 无横溢；⑦ 负作用：纯开/关面板前后 `sl-parse-done` 不增、dirty 不变、假 FSA 写 0；⑧ 1 MB `big.md`：改 1 字→开面板，**记录**到首行可见 ms，rows ≤400，`>2,000 ms` 或 `>2 s` 长任务只记基线/UNVERIFIED、不判红，0 pageerror。
- 回归：`node .tmp/e2e-r97-a1-status.mjs`（44/44）、`node .tmp/r98-tester-agent.mjs`（38/38）。截图 ≤1 张。

## 3 不做

git 对比、修订快照 schema/正文存储、双栏并排、批注迁移、新依赖、编辑器/序列化（不跑 roundtrip）、`release/`、push；版本仍 0.32.1。

## 4 风险

1. `.rail-head` 增高使卡片下移：按钮 16px、不动 head/tabs 盒模型；⑥ 用 HEAD 绝对值兜住（头 15/16、底差 39），超 16.5 收字号。首卡不取绝对等值当门：goal/提示等流内子元素随夹具变（第 97 轮 114 是另一夹具），下移由 chrome 底上界 55.5 约束。
2. portal + `useDialogFocus` 的 inert：关闭靠 hook cleanup 清掉（③⑦ 查 `[inert]` 0）。
3. 1 MB 成本来自 `contentRef` 整篇序列化：只记录（⑧），单行截断由 A1 单测守。
4. 体积超 315,500 先删 `.rail-diff-*` 装饰，不砍功能。
5. 空行也算 diff 行（夹具按 +3 −1 断言）：B-227 写明，避免下轮重报。
