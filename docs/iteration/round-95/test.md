# 第 95 轮独立验收（tester · B-222 批注五档紧急度）

结论：**PASS**（A1 数据层 + A2 卡头五档 select / 落盘 / 重开 / 重跑）。未读 `impl.md`；自写探针与 E2E，按任务验收标准从零复验。
轮前 `91fdcf2`，门禁：`npm test` **57 文件 786 条 0 fail**、`npm run verify` **PASS gzip 313,086 B ≤ 314,066**。

## A1 数据层（`annotations.ts` / `prompt.ts`）

证据 `.tmp/r95-tester-a1.ts`（自写）**8/8 PASS**（`.tmp/r95-tester-a1.log`）：
① `ANNOTATION_PRIORITIES` 恰 5 值、逐档 `normalizePriority` 原样、标签 `-`/Low/Medium/High/Urgent；
② 缺字段 / `"p0"` / 数字 / `null` / `"Urgent"` / `"URGENT"` → `none` 且条目仍在（5 组，各 1 条）；
③ 旧档数组与 `{v:2}` 两分支：条数不变、每条 `none`、`id/kind/status/from/to/quote/note/replacement/thread` 逐项相等；
④ `serializeAnnotationStore` → `parseAnnotationStore` 五档保持、`priorityManual` 往返；
⑤ `replaceInWindow`：手工 `urgent + priorityManual` 重跑 **id 复用 + urgent + 标记保留**（连跑两次也保留），未手改 `none` + fresh `high` → `high`、id 复用；窗口外 `accepted` 条目 id/priority 不动；
⑥ prompt：五档名各现（`\b` 词边界）、两条示例 `"priority":"medium"/"high"` 不同、长度 **981** ≤1500（`prompt.test.ts` 另加 1 条）。

`npm test` 明细：57 个 suite 逐文件求和 **786**（基线 778，+8 = annotations 6 + prompt 1 + themes 1）；`.tmp/r95-tester-npm-test.log`。
静态门：`git grep -nE 'priority' -- src/lib/annotations.ts` 轮前 **0**（`git grep … 91fdcf2`）→ 现 **13**（≥6）。

## A2 卡头五档 + 对比度 + 落盘/重开/重跑

**静态**：`note-priority` 轮前 **0** → 现 **8 行**（CSS 5 块 + `MarginRail.tsx:196` 1 + `themes.test.ts:150-151` 2，≥7）；`onSetPriority` 0 → **4**（类型/解构/调用/传参，≥4）。偏差：计划写「styles.css 6 条」，实现把 `none` 合进基础 `.note-priority`（5 块），聚合门与 15 对对比度仍成立（见下）。

**对比度**：自写 `.tmp/r95-tester-contrast.mjs` 独立解析 `styles.css` 三套 token（`:root` / `html[data-theme='sepia']` / `html[data-theme='dark']`）与 5 块规则，`color-mix(in srgb)` 按 sRGB 通道加权解析，WCAG 相对亮度 → **15/15 ≥4.5**，min **4.58**、max **7.67**（`.tmp/r95-tester-contrast.log`）：

| 主题 | none | low | medium | high | urgent |
| :--- | :-- | :-- | :-- | :-- | :-- |
| 浅色 | 4.582 | 7.405 | 4.627 | 4.903 | 5.361 |
| 暖纸 | 4.765 | 6.527 | 4.755 | 4.934 | 6.003 |
| 深色 | 6.475 | 7.669 | 6.669 | 4.933 | 7.515 |

**E2E**：自写 `.tmp/r95-tester-a2.mjs`（ego CDP 57270；9222–9226 无监听；自造 `__vfs` + 合成 folder drop，`getDirectoryHandle` 按「有 `path/` 前缀键」判存在——第 71 轮教训）**37/37 PASS**、0 pageerror（`.tmp/r95-tester-a2.json`）：
- 每卡恰 1 select（3/3）、默认 `none`、选项 `-|Low|Medium|High|Urgent` 逐卡齐、`aria-label` =「第 1/2/3 处紧急度」；卡片 `aria-label` 仍是「第 N 处 评价/修订：「引文」」原口径，档位词不入其中。
- 五档 `selectOption` 回读 value/class 一致，底色 5 个互不相同（`rgb(241,238,230)`/`rgb(232,240,237)`/`rgb(247,236,220)`/`color(srgb 0.948941 …)`/`rgb(180,69,58)`）。
- urgent 后栏与每卡 `scrollWidth−clientWidth` 全 0；3 卡 `[top,bottom]`=[282,434]/[446,596]/[608,760] 不重叠。
- 卡聚焦 → Tab：`activeElement`=该卡 `select`、`outline-style:solid`、`outline-width:2px`。
- 三击第 2 段（选区 = 整段）后 `selectOption('medium')` + `select` 上 Enter：`.note.is-active` 0、选区逐字不变（`stopPropagation` 生效）。
- 第 1、3 卡设 urgent → 1200 ms 后 `.sidelight/annotations/note.json` 含 `"priority":"urgent"`（3 条、2 条 urgent+`priorityManual`、1 条 none）；切 `other.md` 再切回仍是 `urgent|none|urgent`；重跑后仍 `urgent|none|urgent`、**3 条 id 逐条未变**、未手改的第 2 卡吃模型档位（none）。
- 截图 `shots/round-95/note-priority.png`（1440×900，三卡 + 两个 Urgent 红底 select，rail 320 无横溢），人工检视。

## 回归

`theme-acceptance`（`SIDELIGHT_CDP=57270`，URL 5175）**27/27 PASS**，含深色/浅色/暖纸 token 对比度、reload 保留、取消还原、白帧（`.tmp/r95-tester-theme.log`）；跑完已 `git checkout -- shots/round-05/`。未跑 roundtrip（未改编辑器/序列化）。

## 偏差与观察（不判 FAIL）

1. `replaceInWindow` 新增第 4 参 `reuse` + `App.tsx` 的 `annotationsRef` 快照（计划只写手工档位判断）：不加快照时同窗口第 2/3 条重跑每次换 id、手改档位第一次重跑后即丢；E2E 实测 3 条 id 全保留。
2. 「6 条 CSS」按 5 块落地（none 用基础规则），聚合门 8 行与 15 对对比度均过。

## UNVERIFIED

真实中文 IME 的 select 键盘操作、真 WebView2 宿主、原生打印/另存 PDF、真实 FSA 磁盘写回（本轮落盘走假 VFS）。
