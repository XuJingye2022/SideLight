# 第 97 轮 tester 验收（批注四态，B-224）

未读 `impl.md`；只读 `plan.md`、`git diff`、`BACKLOG.md`，按验收标准从零复验。

## 结论：PASS-WITH-UNVERIFIED

本轮全部验收项通过；未能覆盖的是环境类：真实中文 IME 下用键盘操作原生 select、真 WebView2 宿主、原生打印。

## 门禁（各跑一次）
- `npm test`：**58 文件 807 条 0 fail**（逐文件求和；`annotations.test.ts` 34/34，28→34）。日志 `.tmp/r97-tester-npmtest.log`。
- `npm run verify` **PASS**：raw 1,016,702 / gzip **313,688** / headroom 6,312（`.tmp/r97-tester-verify.log`）。
- `node scripts/measure-first-screen.mjs --max 315000` → **PASS exit 0**。净增 **+328 B**（轮前实测 313,360 → 313,688）；按批头 312,423 算为 +1,265 B。两种口径都 ≤1,600 B。
- 回归：`theme-acceptance` **27/27**（`SIDELIGHT_CDP=57270`，URL 参数指 5175；跑完 `git checkout -- shots/round-05/` 已还原，`.tmp/r97-tester-theme.log`）。

## 独立证据
- **数据层**：自写探针 `.tmp/r97-tester-a1.ts` **8/8**、0 fail（不复用交付单测）：四态集合与文案、迁移表 pending→open / accepted→resolved / dismissed→wont-fix、归一（非法/缺字段/大写/数字→open）、合法字段优先、两条 parse 分支都补 `reviewStatus` 且 `status` 原值与 id 不变、`v` 仍 2、四态写盘往返、`marksBody`/`isClosedReview` 真值表 6 行（含无字段旧档两行）、`resolveAnnotations` 恒写 open、`replaceInWindow` 窗口内 closed 整条保留、同键 fresh 认领 id 后条数不变且 ids 唯一、再重跑仍 1 条。
- **静态**：`REVIEW_STATUSES|reviewStatusOf|marksBody|isClosedReview|claimed` 在 `40b651f` **0 行** → 现在 **39 行**（对照 `normalizePriority` 8）；`note-status` 0→**3 文件 7 行**；`onSetReviewStatus` 0→**4**；`decorations.ts` 的 `marksBody` 2（import + 调用）、`annotations.ts` 的 `claimed` 2。
- **P2-1 未动**：`MarginRail.tsx:107`、`App.tsx:2438`/`:2453` 的 `status === 'pending'` 过滤逐字等于 HEAD（`99`/`2430`/`2445`，仅行号整体下移）。
- **E2E**：我本机前台跑 A3 脚本 `.tmp/e2e-r97-a1-status.mjs`（ego CDP 57270、1440×900）**44/44 PASS、0 pageerror**，`.tmp/r97-a1-status.json` 为本次运行结果。

## A3 七场逐项
1. 迁移：`.note` 恰 1 张、其 select=`open`；1,600 ms 后 store 仍 3 条 `open/resolved/wont-fix`，`status` 原值 `pending/accepted/dismissed`、id 不变；正文只画 open 那条。
2. 四态 select：每卡 1 个、默认 `open`、选项值 `open/in-progress/resolved/wont-fix` 与文案 `Open/In progress/Resolved/Won't fix`、`aria-label`=第 N 处状态、卡 `aria-label` 不含状态、`.note-head` 无横溢。
3. 逐档：值/`note-status-*` 跟着变；`resolved`/`wont-fix` 时 `.annot` 字符 **56→34**、不再含该条引文，`open`/`in-progress` 复原到 56；结项仍 3 卡、`is-closed` 恰 1、`border-style` 含 dashed；底色 `open==wont-fix` ≠ `in-progress` ≠ `resolved`。
4. 落盘：store 三条 `resolved/in-progress/wont-fix` 且 `status` 全 `pending`；切 `other.md` 再回 3 卡三态保留、正文只剩第 2 卡引文。
5. 重跑：仍 3 卡、三态不变、store 3 条且 **ids 唯一并与重跑前逐条相同**。
6. 几何：栏宽 **320**、`.margin-rail`/`.doc-scroll` 横溢 0、3 卡 top 114/278/460 不重叠、末卡底 **611.5 ≤ 整体评价顶 623.78**、`.note-head` 子项中线极差 0 / 高 24 / 无横溢；摘掉「模拟」徽标后（正式态）序号可见且仍单行。
7. closed 采纳：修订卡设 `wont-fix` 后 dashed + `is-closed`，点「采纳」→ 正文含 replacement、卡 3→2、store 2 条、`is-closed` 0（与 P2-2 定案一致）。
- 截图 `shots/round-97/note-status.png`：本人检视——3 卡单行卡头、第 1/3 卡虚线、正文高亮只在第 2 条引文上。

## 偏差（不判 FAIL）
1. `themes.test.ts` 另加 1 条四态 × 三主题 12 对对比度门（A1/A2 文件清单外）→ 807 而非 806；plan 写「≥806」仍达，且是加分门。
2. `.note.is-simulated .note-index{display:none}`：plan 的兜底是「仍红则无条件藏序号」，实现改成只在不带 Key 的模拟态藏（正式态序号照常）。可行替代，已写进 CHANGELOG；代价是无 Key 用户看不到「第 N 处」文字（位置信息仍在卡 `aria-label` 与卡片顺序）。
3. `.note-head` gap 8→6 + `flex-wrap` 兜底，与 plan 同款。
4. 交付 E2E 场景 4 的正向断言取 `.note-quote` 文本，修订卡取到空串 → `includes('')` 恒真；该场实质由两条负向 + `.annot` 文本内容支撑，已用场景 3 的字符数与截图独立复核。

## UNVERIFIED
- 真实中文 IME 下用键盘操作原生 select；真 WebView2 宿主；原生打印。
