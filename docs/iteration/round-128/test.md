# 第 128 轮测试报告（tester 独立验收）

轮前 `1c582d1`；工作树 = A1 的 4 份 `src` 改动 + BACKLOG 1 行（未读 `impl.md`，只读 `plan.md`、`git diff`、`BACKLOG.md`）。**判定：PASS**。

## 1 门禁（改后当前树）

- `npm test`：**66 文件 931 条 0 fail**（改前 930，+1 为新增静态门；逐文件 `pass` 汇总求和，日志 `.tmp/r128-tester-npmtest.log`）。
- `npm run verify -- --max 316500`：**exit 0 PASS**，首屏 gzip **315,824 B**（raw 1,024,765、files 3、headroom 676、余硬线 3,676）；对轮前 `1c582d1`/第 127 轮实测 **315,796** 净 **+28 ≤100**。
- 常驻 `dist/assets/MarginRail-CamDycNv.js` raw **22,271** / gzip9 **7,866**（改前 raw 22,092 / gzip9 7,847，净 **+19 ≤150**）。
- 三数合计 **323,690**（315,824+7,866），超首屏硬线 **3,690**，**B-229 仍 `open`**（只记）；`BACKLOG.md` B-229 行已含本轮三数与轮列 128，逐值与实测相同，无需改。
- 未跑 `roundtrip`（未动编辑器/序列化）。

## 2 A1 静态验收

- `note-field-label`：`MarginRail.tsx` **2** 处（:626「紧急度」、:643「状态」，均是 `className="note-field-label"` 字面量）；`styles.css` **1** 条规则（`.note-field-label {`），无注释混淆。
- 新静态门在 `annotations.test.ts` 末（注释先摘再数）读 `MarginRail.tsx` 得 `['紧急度','状态']`、`styles.css` 恰 1 条；`npm test` 通过、日志含该用例名。
- `git diff --stat`：`MarginRail.tsx` +2、`annotations.test.ts` +27/−4、`annotations.ts` +23/−11、`styles.css` +14/−2、`BACKLOG.md` 1 行；**恰 4 个 src 文件、0 新增文件**（`.tmp/` 已忽略；`docs/iteration/round-128/`、`shots/round-128/` 是报告与证据）。
- 内部 value / 类名 / 存盘字段零改动：diff 只碰两张 `*_LABELS` 表与两处注释、两枚 span、`.note-head` 的 `gap` 与 1 条新规则；`ANNOTATION_PRIORITIES`、`REVIEW_STATUSES`、`normalizePriority`、`normalizeReviewStatus`、`parseAnnotationStore`、两 select 的 className/aria-label 无任何 diff 行。

## 3 A2 真机（自写 `.tmp/r128-tester-note-fields.mjs`；ego CDP 57270、1440×900 + 1024×700、假 FSA、无 Key 造 3 张模拟卡）

**41/41 PASS、0 pageerror**（`.tmp/r128-tester-note-fields.json`）。先量 `.note-head` clientWidth **M=294**（±1、三卡同值），下述断言全用该实测值。

- 结构：每卡恰 2 枚标签（共 6）、文本逐卡 `['紧急度','状态']`、`label.nextElementSibling` 分别是对应 `select.note-priority`/`select.note-status`、DOM 序「紧急度→priority→状态→status」；两标签 `aria-hidden="true"`，select 的 `aria-label` 仍「第 N 处紧急度 / 第 N 处状态」。
- 可见性 8 项（6 枚全过）：宽 **30**（紧急度，≥30）/ **20**（状态，≥20）、高 **14**（≥10）、computed `font-size:10px`、`display`≠none、`visibility:visible`、`opacity:1`、单 rect、`rect.right ≤ head 内容右缘`、中心 `elementFromPoint` 命中标签。
- 文案：紧急度值 `none/low/medium/high/urgent`、文案 **无/低/中/高/急**、默认「无」；状态值 `open/in-progress/resolved/wont-fix`、文案 **待处理/处理中/已解决/不修复**、默认「待处理」。
- 几何：模拟合计 **276.84×3**、正式 **280.8×3**（计划 280.76，差 0.04，在 ±1 内；均 ≤ M−3=291）；head 高 **24 ≤26**、head 横溢 0、子项中线极差 0；栏宽 **320**；3 卡 [128,279.5]/[292,462.25]/[474,625.5] 互不重叠、末卡底 **625.5 ≤** `.rail-overall` **638.19**、卡片横溢 0。
- 1024×700 抽屉：栏 340、`.note`/`.note-head` 横溢全 0、`.margin-rail`/`.doc-scroll` 横向溢出 0、0 pageerror；卡头内容宽 **271**（纵向滚动条占 ~15 px）、3 卡卡头折两行（模拟 52 / 正式 44）——按验收只记录，不判 FAIL。
- 截图 `shots/round-128/note-field-labels-tester.png`（本轮共 2 张，另一张为执行方 `note-field-labels.png`）。

## 4 回归

- `.tmp/e2e-r95-a2-priority.mjs` **29/29、0 FAIL**（改动仅 `:11` LABELS 中文化 + `:231` 说明文字，门未放宽）。
- `.tmp/e2e-r97-a1-status.mjs` **44/44**（`:12` 中文四态、`:296` 说明文字、`:304` 负向词表改中文；单行门 6b `headHeight≤26/headOverflow≤0/topSpread≤1` 未删、未放宽）。

## 5 观察 / UNVERIFIED

- 正式态合计实测 280.8 vs 计划 280.76（+0.04，在 ±1 内）；偏差不判 FAIL。
- 1024 抽屉卡头折两行是计划漏算滚动条（估 282 / 实测 271）的记录项，无横溢。
- 真机走 ego 浏览器 CDP 57270（CDP 9222–9226 按环境提示不可用）；真 WebView2 宿主、真实中文 IME、原生打印与本次改动无交互，未跑。
- UNVERIFIED：macOS 字体宽度下卡头余量（本机 CJK 字宽同源 Windows；若更宽只多两行、不横溢）。
