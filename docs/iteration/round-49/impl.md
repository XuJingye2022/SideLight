# 第 49 轮实现报告（executor）

- 轮次：`round=49`、`nn=49`；报告目录 `docs/iteration/round-49`；轮前 `startSha=57e2a81748090e63b88b1ad4f998ca3b689e347f`（`git log -1` 开工时同值）
- 输入：`plan.md` **revision 3**、`plan-review.md`（revision 3 复审，结论 REVISE，5×P2：R49-10…R49-14）、`AGENTS.md` §4/§8
- 环境：dev server `http://localhost:5175` 未起、未重启；浏览器只连 CDP **9222**（每段 E2E 前 `node .tmp/reset.mjs 9222`），未启动 Edge、未 kill `msedge`、未 `browser.close()` 整个浏览器；未 push、未改 `release/`、未动 `package.json` 版本、未新增依赖
- 结论：**T1 / T2 / T3 全部完成**，`tsc` / `test` / `roundtrip` / `verify` / `keyboard-acceptance` 全绿，E2E 三份日志见下

## 0. 任务状态

| id | 任务 | 状态 | 产品文件 |
| :--- | :--- | :--- | :--- |
| T1 | 命名 HTML 实体保存保真（P1，数据安全） | **DONE** | `src/lib/html.ts`、`src/lib/html.test.ts` |
| T2 | 高亮 / 代码块字号 / Mermaid 错误色 / 按钮 24 px（P2，CSS） | **DONE** | `src/styles.css` |
| T3 | 中文上下文里 `--` → `——`（P2） | **DONE** | `src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts` |
| 文档 | CHANGELOG / README / typora-gap | **DONE** | `docs/CHANGELOG.md`、`README.md`、`docs/typora-gap.md` |

`git diff --stat`（收工）：8 个文件、+168 / −17，全部在本轮允许清单内（`src/lib/html.ts`、`src/lib/html.test.ts`、`src/styles.css`、`src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts`、`README.md`、`docs/typora-gap.md`、`docs/CHANGELOG.md`）；未跟踪的只有 `docs/iteration/round-49/`、`shots/round-49/`。

## 1. 基线（改前）

| 项 | 实测值 | 出处 |
| :--- | :--- | :--- |
| 分支 / HEAD | `main` / `57e2a81` | `git log -1` |
| 首屏 gzip | 294,123 B（内部 310,000 / 硬线 320,000） | 第 48 轮；本轮改前复核同值 |
| 测试 | 32 文件 414 条 | 第 48 轮 |
| 版本 | 0.32.1（本轮不 bump） | `package.json:3` |
| dev server | `http://localhost:5175` 200 | E2E 全程 |

## 2. T1（P1）命名 HTML 实体保存保真

### 2.1 改动

`src/lib/html.ts` 的 `repairHtml`：

- 新增 `ENTITY_IN_SOURCE`（原文真实体）、`ENTITY_MENTION`（原文 `&amp;<名>;` 讲转义）、`PARSED_ENTITY`（解析层会解码的名字：`amp|lt|gt|quot|#数字`）。
- `source !== null` 时用 `mapOutsideCode` 扫一遍原文，得到 `realCount`（代码外真实体按**次数**）与 `mentionCount`（代码外转义写法）；再对本稿扫一遍 `draftCount`（同名 `&amp;<名>;` 的次数）。
- `&amp;` 分支：`ahead` 是实体形状时，名字若属于 `PARSED_ENTITY` → 整条保持；否则 `!mentioned && want > 0 && drafted === want` 才解回 `&`。`ahead === undefined` 那一支保留旧守卫（`source.includes(whole)`），`lt`/`gt` 两支与块首守卫一字未动。JSDoc 按新口径改写。
- 单测 `src/lib/html.test.ts` **+9 个 `test()`**（33 条：既有 24 + 9）。

**相对计划的偏差（review 的 R49-10 / R49-11，见 §6）**：

1. **R49-10**：`amp` / `lt` / `gt` / `quot` / 数字体**一律不参与**按次数解码（计划 `plan.md:94` 只排除了 `amp`）。理由：`@tiptap/core` 的 `decodeHtmlEntities` 只解这几个名字，原文里真写 `&lt;` 在正文里就是 `<`、序列化仍是 `&lt;`，**永远不产生 `&amp;lt;`**；`&amp;lt;` 只可能来自作者手打的字面文本，按 `realCount.lt` 去解一定是在改用户字节（critic 探针 A1–A4 实测 new≠old）。计划 §步骤 5 的用例 5 期望值因此改为「保持 `&amp;lt;`」（= 今天的字节），并补一条 A1 形状的回归断言。
2. **R49-11 取 (b) 更稳的那支**：解不解不看文档顺序，看**条数**——本稿同名 `&amp;<名>;` 的条数与原文真实体条数一一对应才解（`drafted === want`），否则整类保持。计划原文用 `decoded` 增量计数，会让「手打的字面实体排在真实体之前」那一处被解成真字符（critic 探针 B1：`md='&amp;nbsp;\n\n甲&amp;nbsp;乙'` → 旧方案解掉第一处）。改为条数对照后：用例 8a 的期望由 `甲&nbsp;乙\n\n&amp;nbsp;` 改为**两处都保持**（`甲&amp;nbsp;乙\n\n&amp;nbsp;`），B1 那个形状也不再有反向改字节。代价：混排文件里 F1 不修（与计划自己接受的 m1 同类），收益：任何顺序都不改用户字节。
3. `plan.md:76` 要的「改前跑一遍记读数」按计划执行（脚本改名、删 b3/b4 段），但**没有**照 `plan.md:147` 的「与改前对比 ≤ 2×」自相矛盾的那条写死判据（R49-14 #2）：1 MB 只记录改后读数。

### 2.2 E2E（CDP 9222 + 假 FSA，`.tmp/e2e-r49-impl-t1.mjs`，日志 `.tmp/r49-impl-t1.log`）

7 篇种子，全部「打开 → `Ctrl+S` → 读盘 → 用盘上字节重开 → 再 `Ctrl+S`」；`[role="dialog"]` 全程计数 **0**；`console errors: []`。

| 种子 | 改前盘上（finder） | 改后盘上 | `same` | `stable2` |
| :--- | :--- | :--- | :--- | :--- |
| `e1-nbsp.md` `甲&nbsp;乙\n` | `甲&amp;nbsp;乙\n` | `甲&nbsp;乙\n` | **true** | true |
| `e2-more.md` `甲&copy;&hellip;&#8212;乙\n` | —（预期 `same:false`） | `甲&copy;&hellip;—乙\n` | false（数字实体按 §4 口径解码，渲染不变） | true |
| `e3-inline-code.md` | — | 原样 | true | true |
| `e4-fence.md` | — | 原样 | true | true |
| `e5-table.md` `\| a&nbsp;b \|` | 表格被重排 + `a&amp;nbsp;b` | 原样（`table 1`、单元格 `a&nbsp;b`） | **true** | true |
| `e6-line-nbsp.md`（整行 `&nbsp;`） | — | 原样 | **true** | true |
| `e7-literal-amp.md` `甲&nbsp;乙\n价格 &amp; 单位\n` | `甲&amp;nbsp;乙\n价格 &amp; 单位\n`（`.tmp/critic-r49-e7.log:2`） | 原样 | **true** | true |

保存后进源码框截图 `shots/round-49/impl-t1-source-after.png`，同一脚本打印 `raw = "甲&nbsp;乙\n"`（保存后 `rawTextRef` 已写成盘上字节）。

**1 MB 读数**（`.tmp/r49-impl-bench.mjs`，日志 `.tmp/r49-impl-bench.log`，Node 内直接调 `repairHtml`，记录用、不作卡线）：源 1,048,582 B、908 处 `&nbsp;`、本稿 908 处 `&amp;nbsp;` → 一次 `repairHtml(draft, source)` 输出**与源逐字节相同**；耗时 `withSource` 13.8 / 15.2 / 16.0 ms（min/median/max，5 次），`source=null` 4.2 / 4.9 / 6.3 ms。即两份计数在 1 MB 文档上约 +9 ms/次保存。

### 2.3 回归

- `src/lib/html.test.ts` **33/33**（既有 24 条一条未改，`&amp;lt;` / `&amp;#42;` / `&amp;lt` / `A &amp; B` 全绿）。
- `src/lib/serializeDocument.test.ts`、第 41 轮 E2E 的实体种子不在本轮脚本里重跑（见 §7 UNVERIFIED 与计划 §风险的口径：`c8-实体字面.md` 走 `&lt;`/`&gt;` 两支，两支未改）。

## 3. T2（P2）四条纯 CSS

### 3.1 改动（只 `src/styles.css`）

1. 新 token `--mark-bg`：浅色 `:root` `#f0e0bd`、手动深色 `#453618`、跟随系统深色 `#453618`、打印块 `#f0e0bd`（4 处声明 + `.doc-body mark` 1 处使用 = `Select-String 'mark-bg'` **5 行**）。
2. `.doc-body mark` 的 `background` 由 `color-mix(...)` 改为 `var(--mark-bg)`（`color` / `padding` / 圆角不变）。
3. `.doc-body pre` `font-size: 0.86em → 0.9em`；`.doc-body pre code` 加 `font-size: inherit`。
4. `.find-bar button`、`.table-bar button` 各加 `min-height: 24px`（**只加最小高度**，`padding` 与配色未动）。
5. `.mermaid-preview.is-error`：`color: var(--danger)`、`border-color: color-mix(in srgb, var(--danger) 55%, var(--line))`（不再写字面色）。

### 3.2 改前 / 改后读数（`.tmp/e2e-r49-impl-t2.mjs`，日志 `.tmp/r49-impl-t2.log`；`console errors: []`）

| 项 | 改前（finder `r49-ui-c-log.txt`） | 改后（本轮实测） | 判据 |
| :--- | :--- | :--- | :--- |
| `<mark>` 底 vs 纸底（RGB 距离） | 光看亮度 1.04:1 | **53.3**（浅，`rgb(240,224,189)`）/ **57.2**（深） | ≥40 / ≥30 |
| `<mark>` 底 vs 行内代码底 | 1.01:1 | **51.2** / **41.8** | ≥40 / ≥30 |
| `<mark>` 文字对比度 | 14.29 / — | **12.55:1**（浅）/ **9.4:1**（深） | ≥4.5:1 |
| 行内 `code` 字号 | 14.79 px | 14.79 px | — |
| `pre code` 字号 | **12.72 px** | **15.3 px** | ≥ 行内且 < 正文 17 px |
| `pre` 的 `overflow-x` | `auto` | `auto` | 必须是 `auto` |
| 页面级横向滚动（1440 / 1024） | — | `1440/1440`、`1024/1024` | `scrollWidth ≤ clientWidth+1` |
| 短行种子 `pre` 两档 | — | `574/574`、`754/754` | `scrollWidth === clientWidth` |
| 长行种子（单行 ≥120 字符） | — | `574/574`（**换行，不横向滚动**，见 §6.3） | 只记录 |
| 查找条 7 按钮高 | 23 | **24 ×7** | ≥24 |
| 查找条 7 按钮宽 | 33/33/25/25/29/43/66 | 33.3/32.6/25.4/25.4/29.4/43/66 | 照实记录 |
| 表格条 7 按钮高 | 23 | **24 ×7** | ≥24 |
| 表格条 7 按钮宽 | — | 52.5×4 / 41×3 | 照实记录 |
| 两条条子溢出 | — | `scrollWidth == clientWidth`（1440 / 1024 都是） | ≤ +1 |
| Mermaid 错误提示 | 浅 5.38:1 / **深 3.03:1** | **5.36:1 / 6.92:1** | ≥4.5:1 |
| 侧栏页签 hover（R49-13 复测） | finder 记 `changed:false` | 非当前页签 hover 后 `bg rgb(232,240,237)` = `--accent-wash`、`color rgb(35,84,77)` = `--accent-ink`；当前页签仍是 `rgb(255,253,248)` | 已生效，**本轮不改 CSS** |

**ui N5 复测结论**：finder 那次 hover 的是 **idx 0 = 当前「文件」页签**（`is-active` 与全局 `button:hover:not(:disabled)` 同为 0-2-1 且 `is-active` 在后），所以「hover 无反馈」是**误判、不是缺陷**；干净页面（`[role="dialog"]`/`.settings-backdrop` 计数 0）hover 非当前「大纲」页签读数如上，全局规则本来就在生效。未改 `findings-ui.md`（review §2 #4）。

### 3.3 截图（`shots/round-49/`，全部 `impl-t2-*`）

`impl-t2-mark-light.png`（`<mark>` 与行内代码同屏）、`impl-t2-mark-dark.png`、`impl-t2-code-font.png`（代码块与行内代码同屏）、`impl-t2-targets.png`（查找条 7 按钮）、`impl-t2-mermaid-err-dark.png`、`impl-t2-tab-hover.png`。

## 4. T3（P2）中文上下文里 `--` → `——`

### 4.1 改动

`src/lib/smartTyping.ts:87` 附近：

```ts
if (inserted === '-' && last === '-') {
  // before 只有光标前 ≤4 字、末位就是第一根 -；取它前一个字符判中文上下文
  const cjk = CJK.test(before.slice(-2, -1)) || CJK.test(next)
  return { kind: 'replace', from: -1, to: 0, text: cjk ? '——' : '—' }
}
```

口径是「**紧邻**汉字」（R49-8，不是「前后 4 字」）；`CJK`、`|` 行守卫、第三根 `-` 不命中的既有逻辑都没动。单测 `src/lib/smartTyping.test.ts` **+2 个 `test()`（6 个断言）**，既有 15 条一字未改（17/17）。

### 4.2 E2E（`node .tmp/e2e-r49-impl-t3.mjs`，假 FSA，日志 `.tmp/r49-impl-t3.log`；`console errors: []`）

| 断言 | 实测 |
| :--- | :--- |
| 已有汉字的段落末尾打 `--中文`（编辑视图） | `中文——中文` |
| `Ctrl+/` 源码框 | `中文——中文\n` |
| `Ctrl+S` 后盘上（`readFakeFile`） | `中文——中文\n` |
| `word--word` | `word—word` |
| `甲 -- 乙`（第 47 轮口径回归） | `甲 — 乙` |
| 空段落 `---` + 空格 | `hr: 1` |
| 空段落 `***` + 空格 | `hr: 2` |
| 手打 `\| --- \| --- \|` | 原样 |
| 围栏里打 `--`（点进 `pre` 后 `End`） | `a--b--`（不替换） |

截图 `shots/round-49/impl-t3-em-dash.png`（编辑视图里 `中文——中文`）。

## 5. 门禁（全部实跑，输出摘录）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **32 个文件 425 条，fail 0**（414 + T1 9 + T3 2；按 `ℹ tests N` 逐文件求和） |
| `npm run roundtrip` | rich **5/7**、source **7/7**、`firstSaveBlocked 1/7`；`git status docs/roundtrip-report.md` 无改动 |
| `npm run verify` | **PASS**，首屏 gzip **294,373 B**（`files=3`、raw 951,197 B；主 chunk `index-Co4S6KZw.js` 913,822 B raw / 286,419 B gzip；内部 310,000 / 硬线 320,000，余 25,627 / 15,627 B） |
| `node .tmp/e2e-r49-impl-t1.mjs` | 7/7 篇 `same:true`（e2 例外且已写明原因）、`stable2:true`、dialog 0、console 0 |
| `node .tmp/e2e-r49-impl-t2.mjs` | 上表数值全达标、console 0 |
| `node .tmp/e2e-r49-impl-t3.mjs` | 上表全绿、console 0 |
| `node scripts/keyboard-acceptance.mjs` | **52/52 PASS**；跑完 `git checkout -- shots/round-05/` 已还原（`git status` 干净） |
| `.tmp/r49-impl-bench.mjs` | 1 MB / 908 处 `&nbsp;` 往返逐字节相同；13.8–16.0 ms |

首屏增量：294,123 → **294,373 B（+250 B）**，来自新增的三条 CSS 规则与注释文本进包的 CSS 体积（`index-CX-NHWvz.css` 36,592 B raw / 7,504 B gzip）。

## 6. 计划偏差（都写进这里，未改 `findings-*.md`、未改 `plan.md`）

1. **T1 采纳 review R49-10**（解析层会解码的名字不参与计数解码）+ **R49-11 的 (b) 支**（按条数对照代替按顺序增量）。理由与实测见 §2.1；`plan.md` 的用例 5 / 8a 期望值随之改了两处，用例总数不变（仍 +9）。这是本轮唯一的语义偏差，方向是**更保守**（宁可少解，也不改用户字节）。
2. **T1 的 1 MB 计时**只记录改后读数（Node 内 `repairHtml`），没有「改前 ≤2×」的对照——计划 `plan.md:76` 的改前跑不采 1 MB，R49-14 #2 允许二选一。
3. **T2 的长行种子不横向滚动**：实测 `pre.scrollWidth === clientWidth`（574/574、754/754），原因是 `prosemirror-view/style/prosemirror.css:15` 给 `.ProseMirror pre` 设了 `white-space: pre-wrap`（本仓库 CSS 只加了 `overflow-x: auto`，没有覆盖换行）。计划 §风险写的「`pre` 默认不换行、横向滚动」与这个构建不符（`impl-t2-mark-light.png` 里长行确实折成两行）。验收 (c) 的「短行 `scrollWidth === clientWidth`」两档都成立，长行按要求只记录。
4. **T3 的 E2E 脚本**按 R49-12 写死 `PORT=9222`、截图名 `impl-t3-*`、假 FSA 取盘；计划原文指 `.tmp/e2e-r49-typora-a.mjs` 的 `OUT`（该脚本没有 `OUT`、连的是 9223），已按 review 修正，未覆盖 finder 截图。
5. **T2 的播种方式**沿用 `e2e-r49-ui-c.mjs` 的源码框 `fill`（R49-13 #2：源码态 apply 也算载入解析），没有额外搭假 FSA；`<mark>` / `pre` / Mermaid 错误都在这种载入下渲染出来了（截图可证）。
6. **T1 的 E2E 脚本**删掉了 finder 的 b3/b4 两段（不重跑 `bug-b3-*` / `bug-b4-*`），`OUT` 仍是 `shots/round-49`，`textInfo` 加了 `table` 计数（R49-6）。
7. 计划 §步骤 5 的 `+9` 与 §7 的「425 条」按实测成立（`npm test` 输出 425）。

## 7. UNVERIFIED（本轮没测到的，逐条写清）

1. 真实宿主 WebView2 里的实体往返：本轮全在浏览器态 CDP 9222 + 假 FSA。
2. 真实磁盘 / 网络盘 / OneDrive 写回的字节（假 FSA 只存字符串）。
3. 系统级深色（`prefers-color-scheme: dark`）下 `--mark-bg` 的观感：只读到「跟随系统深色」块的声明值，没法切真实系统主题；手动 `data-theme=dark` 已读。
4. 真实彩色打印 / 另存 PDF 里 `<mark>` 的新底色（只核了打印块有 `--mark-bg` 声明）。
5. 真实中文输入法下 `--` 的产出（无 IME 自动化；E2E 是 ASCII 注入 + 汉字的 `keyboard.type`）。
6. 深色下对比度的真实感知（数值达标 ≠ 目视达标，截图已交）。
7. 1 MB 文档在**应用内**一次 `Ctrl+S` 的总耗时：只有 `repairHtml` 的 Node 读数（13.8–16.0 ms），没有端到端计时。
8. 第 41 轮 E2E 的 20 条实体种子（含 `c8-实体字面.md`）本轮没有重跑：`lt`/`gt` 两支代码一字未动，判据是 `html.test.ts` 33 条 + 本轮 7 篇 E2E。
9. `<mark>` 在 @media print 的**实际出纸**颜色（只核变量）。
10. 宿主里 `Ctrl+S` 的 5.5 MiB 上限路径与本轮实体计数的交互（未构造 5 MiB 带实体文档）。

## 8. 新踩的坑（给下一轮）

1. **`HTMLElement.click()`（`page.evaluate(() => el.click())`）只派发 click，不挪焦点与光标**：在假 FSA 载入文档后这样点段落，焦点还留在文件树的 `.tree-file` 上，随后 `page.keyboard.type(...)` 的按键全被树吃掉、正文只被 insertText 插到 offset 0（首轮 T3 E2E 得到 `中文中文` 的假红）。要么用 Playwright 的真点击 `locator.click({ position })`，要么先 `.focus()` 再点；点完读一次 `document.activeElement.className` 兜底（第 49 轮 T3）。
2. **`@tiptap/core` 的 `decodeHtmlEntities` 只解 `lt|gt|quot|amp` 与数字体**：所以「原文里的真实体次数」只对**其它命名实体**（`&nbsp;` / `&copy;` / `&hellip;` …）有意义；`&amp;lt;` 只可能来自作者手打的字面文本，按 `lt` 的计数去解就是改用户字节（review R49-10）。
3. **计数法要按「条数一一对应」判，不要按文档顺序增量解**：同名的真实体与手打的字面实体长得一样，顺序决定解哪一处 → 用户字节被反向改（review R49-11）。先数完本稿再解，成本是每篇多一遍 `mapOutsideCode`（1 MB ≈ +9 ms）。
4. **这个构建里代码块是 `white-space: pre-wrap` 换行的**（`prosemirror-view/style/prosemirror.css:15`），`.doc-body pre` 的 `overflow-x: auto` 实际不产生横向滚动；「长代码行会横向滚动」这类断言会假红/假绿，量之前先读 `getComputedStyle(pre).whiteSpace`。
5. `scripts/keyboard-acceptance.mjs` 结尾的 `browser.close()` 会断开 CDP（本轮最后一项跑，52/52），跑完必须 `git checkout -- shots/round-05/`，否则 `git status` 多 3 张已跟踪截图改动。

## 9. CHANGELOG 建议条目

已按计划写进 `docs/CHANGELOG.md`（`## Unreleased（第 29–49 轮，未发版）` 下新增 `**第 49 轮（同一未发版区间）**`：T1 / T2 / T3 / 门禁 / 已知限制 / UNVERIFIED 六段），要点：命名实体按出现次数解回、`--mark-bg`、`pre` 0.9em、`min-height: 24px`、Mermaid 错误色走 `--danger`、紧邻汉字 `--` → `——`。

## 10. 本报告用到的证据文件

- 日志：`.tmp/r49-impl-t1.log`、`.tmp/r49-impl-t2.log`、`.tmp/r49-impl-t3.log`、`.tmp/r49-impl-keyboard.log`、`.tmp/r49-impl-verify.log`、`.tmp/r49-impl-bench.log`
- 脚本：`.tmp/e2e-r49-impl-t1.mjs`、`.tmp/e2e-r49-impl-t2.mjs`、`.tmp/e2e-r49-impl-t3.mjs`、`.tmp/r49-impl-bench.mjs`（排查用 `.tmp/e2e-r49-impl-t3dbg.mjs` / `-t3dbg2.mjs` 不删）
- 截图：`shots/round-49/impl-t1-source-after.png`、`impl-t2-mark-light.png`、`impl-t2-mark-dark.png`、`impl-t2-code-font.png`、`impl-t2-targets.png`、`impl-t2-mermaid-err-dark.png`、`impl-t2-tab-hover.png`、`impl-t3-em-dash.png`
- 改前读数出处：`.tmp/r49-ent-utf8.log`（e1/e5 盘上字节）、`.tmp/r49-ui-c-log.txt`（MARK_VS_CODE / MARK_DARK / TABLE_BAR）、`.tmp/critic-r49-e7.log:2`（e7 正文种子）
