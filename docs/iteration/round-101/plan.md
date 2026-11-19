# 第 101 轮计划（单轮·**修订 r1**）：Under Review 文件列表

> round=101，startSha `df57242`；只做队列第 8 条，新 ID **B-228**（补 BACKLOG、tester 收口）；参考 review-mode。
> 修订 r1：按 plan-review 修 §1 两数/降级、A2 选择器与 `aria-labelledby`、A3 ⑭⑮、test.md 偏差。任务与范围不变。

## 0 口径
- 在审 = 有 `.sidelight/annotations/<cacheKey>.json` 且 `annotations` 非空（notes-only 不入列）。
- 只读：现读盘不写盘；未落盘批注不计（600 ms 防抖，`:2121,2145`）；open 只算 `reviewStatusOf === 'open'`（旧档走 `legacyReviewStatus`），其余三档另计「共 N 条」。
- 点行 → `openWorkspaceFile`；同篇只关面板不重载（B-127，`App.tsx:2819-2827`）。
- 不做页内常驻列表（会下移卡片，r97/r100 末卡底只余 12.7 px）。

## 1 体积（硬线 320,000；两个数都记）
- 门（`measure-first-screen.mjs`，dist = r100，HEAD `df57242`）：gzip **315,022** / 余 4,978 / PASS（软线超 5,022 只 WARN；BRIEF 的 312,423/7,577 是第 93 轮旧值）。
- 真实首载 = 门 + `MarginRail` chunk（`App.tsx:20` lazy、`:5989-6000` 恒渲染；gzip **5,593**，脚本 `:8-9` 的旧值 2,327）= **320,615 B，超硬线 615 B（改动前已如此）**。
- 门预算净增 ≤978（≤316,000）；懒 chunk 净增另记进真实首载账。
- 真实首载入不入硬线交 **lead**；本轮只记数 + BACKLOG 开 **B-229**。
- 超门只砍首屏杠杆：① 删 `.rail-review-row` hover/当前行样式 ② 去 `activePath`/`aria-current`；「共 N 条」→排序→空态在懒 chunk，对门 0 B。

## 2 任务

### A1 数据层
files：`src/lib/reviewFiles.ts`、`src/lib/reviewFiles.test.ts`（新）、`package.json`（test 链尾）
- `collectReviewFiles(workspace, files, { maxFiles = 200, maxRows = 50 })` → `{ rows, scanned, capped, truncated }`，`rows = { path, name, open, total }[]`。
- 规则：`parentDirectory` null/抛错跳过；`readAnnotationStore(dir, cacheKey(name))` 只读（无 create）；`annotations` 空不入列；open 只算 open 档；open 降序、同数 path 升序；截 maxFiles 置 `capped`、截 maxRows 置 `truncated`。
- 验收：`node --experimental-strip-types src/lib/reviewFiles.test.ts` ≥10 条（open 1/total 3、旧档 accepted/dismissed 不计、notes-only 不入列、抛错跳过、201→capped、60→50+truncated、排序、create/write 0）；`npm test` **61 文件 ≥858 条** 0 fail。

### A2 UI 与接线
files：`src/components/MarginRail.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/measure-first-screen.mjs`（只改 `:8-9` 注释为 5,593）
- 入口：`.rail-head` 末尾 `button.rail-review-open`（「在审」16px、`aria-haspopup`，仅批注页签；样式并入 `.rail-diff-open`）。
- 位置：`.rail-diff-open ~ .rail-review-open{margin-left:0}`（两钮只在批注页签共现、diff 恒在前）；不用 `.rail-count ~`（空态不命中，两 auto 平分会把「对比」挤离右缘）。
- sheet（portal 到 body）：外层 `rail-diff-overlay rail-review-overlay`、内层 `rail-diff-sheet`（`max-height:80vh`，`:1360-1362`）；`role`/`aria-modal`/`tabIndex=-1`/`aria-labelledby="rail-review-title"`，标题 id 同名 `span.rail-diff-title`（「在审文件」，照 `:649,654`）；`useDialogFocus(…, '.rail-review-overlay', railTab === 'notes')`；Esc 走 document keydown + `stopPropagation()`；关闭钮 + 背板。
- 行：`ul.rail-diff-rows`（`max-height:60vh`+`overflow:auto`+`min-height:0`，`:1410-1418`）内 `li > button.rail-review-row`（`relativePath()` + open 徽标 + 「共 N 条」、`aria-current` 标当前）；提示四支（无工作区／无批注／capped／truncated）；busy「正在读…」。
- App 只加 `getReviewWorkspace`、`activePath`、`onOpenReviewFile`（找节点；同篇 return；否则 `openWorkspaceFile`）；不加 state，不碰保存/批注/diff。
- 验收：`rail-review` 0 → ≥8、`collectReviewFiles` 在 `App.tsx` 0；`npm run build` 0；新 CSS ≤4 组；1440/1024 无横溢。

### A3 真机 + 回归（tester，15 分钟；写 test.md、截图 ≤2 张到 `shots/round-101/`）
- 环境：ego CDP 57270 + `localhost:5175`、1440×900（脚本 `.tmp/e2e-r101-review.mjs`，新）；假 FSA 照 `.tmp/e2e-r100-diff.mjs:44-130`（前缀判目录 + `ops` 记写）。
- 夹具：`ws/a.md`+`a.json`（open×2+resolved×1）、`ws/sub/b.md`+`sub/b.json`（open×1+in-progress×1）、`ws/c.md`（无）；另 51 篇各 open×1。
- 断言 ≥22：① 入口 1（16px、在 head 内）；② sheet 1、焦点在内、行 2（a、sub/b；c 不在）、`aria-labelledby` 指标题；③ a open 2 / b open 1 / 含相对路径；④ 当前行 `aria-current`；⑤ 面板控件 0、ops 写 0；⑥ 点 b：面板关、切 b、parse +1；⑦ 点当前行 parse 不增；⑧ 三路关闭各 1、Esc 不触发 App 其它分支、inert 0；⑨ 无工作区空态含「打开文件夹」、行 0；⑩ Tab/Enter 到入口打开、行是 button；⑪ 1024×700 无横溢、两钮与 × 在栏内、sheet 在视口内；⑫ 首卡 top ≥66、3 卡不重叠、末卡底 ≤ 整体评价顶；⑬ 0 pageerror；⑭ 有/无 `.rail-count`：在审右缘=head 右缘±1、两钮间距 7±1（改前 diff 左移 142 px）；⑮ 51 篇：行 50 + truncated、rows 可滚到底、末行完整、sheet ≤80vh。
- 回归：`e2e-r97` 44/44、`e2e-r100` 43/43；`verify` gzip ≤316,000（记净增与首载 320,615+净增）；`npm test` 61 文件 0 fail；`roundtrip` 不跑（理由写 test.md）；CHANGELOG `29–100`→`29–101`、`changelog.test.ts` 3/3；BACKLOG 补 B-228 fixed、B-229（首载超线 615 B，候选合并 rail chunk）；test.md 记偏差：参考 `list_reviewed_files` 有 `revision_count`（`SKILL.md:228-230`），本轮只 open/total。

## 3 不做
页内常驻列表、跨文档聚合写盘、批注迁移/修订快照、diff、新依赖、编辑器/序列化、`release/`、push；版本 0.32.1；README/STATE 批末 scribe。

## 4 风险
两钮挤 head 由 ⑪/⑭ 兜住；超门按 §1 砍；diff 靠 r100 43/43
