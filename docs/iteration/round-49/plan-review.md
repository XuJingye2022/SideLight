# 第 49 轮计划审查（critic，**revision 3 复审**）

- 审查对象：`docs/iteration/round-49/plan.md` **revision 3**（T1 命名实体保真 / T2 四条 CSS / T3 中文 `--` → `——`）
- 轮前 `startSha=57e2a81`（`git log -1` 同值）；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-49/`、`shots/round-49/`，**产品代码 0 改动**
- 本轮未连 CDP、未启动/重启 dev server（5175 未动）、未启动浏览器、未 push、未碰 `release/`；核对手段是 `read` + Node 探针 + `npm test`（只读）
- 上一版（revision 2 复审）全文保留在 `plan-review-r2.md`；r1 仍在 `plan-review-r1.md`
- 结论：**REVISE**（**5×P2，无 P0/P1**）。上一版 2×P1 + 1×P2 **全部真的修掉了**，不是只改文字（逐条复跑/复算见 §0）。剩下 5 条里 1 条是实质数据完整性（R49-10，约 2 行 + 1 条用例改写）、1 条是已知限制（R49-11）、3 条是执行指令/证据自洽（R49-12/13/14，都是几行文字）。

## 0. 上一版 3 条的处置核对（逐条，都实际打开文件/实跑）

| 编号 | 修订版落点 | 我的核对（本轮实测） | 结论 |
| :--- | :--- | :--- | :--- |
| **R49-7**（P1） | `plan.md:139`（`e7` 新种子）、`:143`（断言）、`:380`（§10 表） | 实读 `plan.md:139`：种子已换成正文形态 `'甲&nbsp;乙\n价格 &amp; 单位\n'`，**不带 URL**。今天盘上字节有实测量：`.tmp/critic-r49-e7.log:2`（e7b-prose-amp）`disk:"甲&amp;nbsp;乙\n价格 &amp; 单位\n"`、`same:false`、`stable2:true`。把该盘上字节喂**修订版** `repairHtml`（`.tmp/rev-r49-probe4.ts`）再串真实的 `tableReuse.ts` → `blankParagraphs.ts` → `applyTrailingNewlines`（我的 `.tmp/critic-r49-e5-sim.mjs`，按 `serializeDocument.ts:53-64` 的顺序）→ **SAME**。同一模拟：e1/e5/e6/e7/e3/e4 全 **SAME**，e2 → `甲&copy;&hellip;—乙\n`（= `plan.md:144` 的期望）。即 `same:true` 现在可达成 | **修好** |
| **R49-8**（P1） | `plan.md:251/255/267/272/290/381`（口径、代码、用例、E2E、风险） | 实读 `src/lib/smartTyping.ts:62-63`：`last`/`next` 都在，`next = after.slice(0, 1)`；修订版代码 `.tmp/rev-r49-smart3.ts:87-91` 与计划逐字同构（`CJK.test(before.slice(-2, -1)) || CJK.test(next)`）。实跑 `.tmp/rev-r49-typing4.mjs`：旧口径 `甲 —— 乙`、新口径 **`甲 — 乙`**；`中文--` 两口径都 `中文——`；`word--word` 都 `word—`；空段落 `---`+空格 都 `—-`（HR 仍成立）。既有 15 条 `.tmp/rev-r49-smart3.test.ts` → **15/15**，新增 2 条 `.tmp/rev-r49-smart3-new.test.ts` → **2/2**。第 47 轮四处文档仍真（`round-47/plan.md:137` 有「再打 `甲 -- 乙` 断言仍是 `—`」、`test.md:55`、`impl.md:105`、`CHANGELOG.md:194`），不用推翻 | **修好** |
| **R49-9**（P2） | `plan.md:77-80`（mention 计数）、`:97-99`（解码条件）、`:124`（语义第 6 条）、`:138`（用例 9）、`:382` | 实读 `.tmp/rev-r49-probe4.ts:31-43`（一遍 `mapOutsideCode` 里两份计数）与 `:59-79`（`!mentioned && got < want`）；实跑 `.tmp/rev-r49-probe4.mjs` → **18/18 OK**（含 m2 用例 9、围栏/行内代码里的 mention 不计数 12/13、mention 按名字隔离 14、`&amp;amp;` 15、既有 `&amp;lt;`/`A &amp; B` 16/17）；`node .tmp/rev-r49-html4.test.ts` → **tests 24 / pass 24 / fail 0**。计划 `.tmp/rev-r49-probe4.mjs` 用例 9 的字符串与我实跑一致 | **修好** |

核对过程中另外确认的计划事实（本轮实查/实跑）：

- 基线：`npm test` 实跑 = **32 文件 414 条**（与 `plan.md:42/154` 一致）；`html.test.ts` **24**、`smartTyping.test.ts` **15** → T1 **+9**、T3 **+2** = **425** 的算术对。
- `docs/roundtrip-report.md:13-15` 实读 = **rich 5/7、source 7/7、firstSaveBlocked 1/7**（与 `plan.md:155` 一致）；`fixtures/markdown/` 7 个样本里**0 条命名/数字实体**（我逐个正则扫过），T1 改动不会改变 roundtrip 报告。
- `CHANGELOG.md:5` 仍是 `## Unreleased（第 29–44 轮，未发版）`，正文已含 45–48（`:171/:182/:191/:201`）→ `plan.md:148` 的改法对；`CHANGELOG.md:194` 的「`甲 -- 乙` 仍变 `甲 — 乙`（回归）」在。
- `README.md:41`（`--` 变 `—`）、`:89`（行内 HTML 限制条）、`:92`（`---` 出分隔线那句）、`docs/typora-gap.md:28` 都存在且与计划要改的句子对得上；`README.md:43` 是对外保真承诺，`plan.md:149` 加数字实体半句的位置对。
- T2 的行号全部对：`styles.css:1-33/36-62/65-93/2012-2036`（四个主题块）、`:660-665`（`.doc-body mark`）、`:633-641` + `:643-646`（pre / pre code）、`:1895-1898` + `:1948-1952`（两条按钮）、`:708-711`（`.mermaid-preview.is-error`）；`--mark-wash` 的**使用**确实只有 `:1044`、`:1805`，声明四处 `:14/:50/:80/:2029`；`.find-hit` `:1908-1914` 用 `--mark` 系。
- T2 的四个数值我按 CSS 变量算了一遍（`--mark-bg` 取计划值）：浅色 `#f0e0bd` 对 `--paper #f6f4ee` ≈ **53.3**、对行内 code 底 `#e8f0ed` ≈ **51.2**、文字对比 **12.6:1**；深色 `#453618` 对 `#15171a` ≈ **57.2**、对 `#22302e` ≈ **41.8**、文字 **9.4:1**；Mermaid 错误色 `var(--danger)` 浅 **5.36:1** / 深 **6.92:1**。四项验收（距离 ≥40/≥30、对比 ≥4.5）都可达，不必再调色。
- T1 的 E2E 脚本行号对：`.tmp/e2e-r49-ent.mjs` 的 `OUT:5`、`textInfo:52-57`、b4 段 `:85-111`、b3 段 `:113-136`、`startsWith('e')` 循环 `:65`；T2 的 `.tmp/e2e-r49-ui-c.mjs` 的 `SHOTS:173/:203/:229`、`HELPERS_SRC():235-251`；`scripts/acceptance.mjs:7` 确用 `connectOverCDP('http://127.0.0.1:9222')`；`.tmp/reset.mjs` 收端口参数。
- `scripts/keyboard-acceptance.mjs` 实数 **52** 个 `check(`，且全脚本 **0** 条 `--`/`—` 断言 → T3 不会破它；第 41 轮的实体种子里与 T1 相关的只有 `c8-实体字面.md`（`.tmp/e2e-r41p-t1.mjs:17`，原文 `&lt;div&gt;`）：新版走的是 `&lt;`/`&gt;` 两支（`source.includes` 守卫仍在），我按修订版手算/探针确认同字节，不算回归。

## 1. 本次新发现

### R49-10（**P2**）计数解码没排除「解析层会解码的实体名」（`lt` / `gt` / `quot` / `#数字`）：用户手打的字面 `&lt;` 会被静默改成真 `<`，而 §步骤 5 的用例 5 把这一方向写成了期望值

`@tiptap/core` 的 `decodeHtmlEntities` 只解 **`lt|gt|quot|amp` 与数字体**（`node_modules/@tiptap/core/dist/index.js` 中 `function decodeHtmlEntities`，同函数上方注释写明「single pass…」；正则 `&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|(lt|gt|quot|amp));`）。所以：

- 原文里真的 `&lt;` 在正文里是 `<`，序列化回 **`&lt;`**（走 lt 支），**永远不产生 `&amp;lt;`**；
- 反过来，markdown 里出现 `&amp;lt;` 只可能是**正文里有字面 `&lt;` 四字符**（用户手打 / 粘贴），来源是 `&amp;lt;`（mention，已被 R49-9 守住）或本次输入；
- 因此 `realCount.lt` 与 `&amp;lt;` **没有任何对应关系**。计划把 `amp` 排除、却按 `lt/gt/quot/#数字` 的次数去解 `&amp;<名>;`，解掉的一定是用户手打的字面实体文本。

实测（`.tmp/critic-r49-rev3-order.mjs`，A1–A4；`new` = `.tmp/rev-r49-probe4.ts` 修订版，`old` = 今天的 `src/lib/html.ts`）：

```
A1 md='写成 &lt; 才不会变标签，另打字面 &amp;lt; 结束'  src='写成 &lt; 才不会变标签'
   new = '写成 &lt; 才不会变标签，另打字面 &lt; 结束'        ← 手打的 4 字符变真 <（重开显示 <）
   old = '写成 &lt; 才不会变标签，另打字面 &amp;lt; 结束'
A2 = 计划 §步骤 5 用例 5 的同一形状：new 解、old 保持
A3 gt 同形；A4 数字体 &#8212; 同形（new 解、old 保持）
```

`plan.md:133` 的用例 5 断言 `repairHtml('写成 &amp;lt; 才不会变标签', '写成 &lt; 才不会变标签') === '写成 &lt; 才不会变标签'`——正是这个反向（`&amp;lt;` 被解成 `&lt;`）。用例 5 的注释「原文写 `&lt;` 时解回 `&`」也来自这个误解：原文写 `&lt;` 时正文是 `<`，序列化就是 `&lt;`，根本走不到 `&amp;` 支。

**修法（约 2 行 + 1 条用例改写）**：把 `plan.md:94` 的 `if (body !== 'amp')` 改成「`body` 属于 `amp|lt|gt|quot`，或 `body` 以 `#` 开头时**整条保持**（不参与计数解码）」——与 amp 同一分支；`plan.md:133` 的用例 5 期望改成 `写成 &amp;lt; 才不会变标签`（= 今天的字节），并补一条 A1 形状的回归断言（原文有真 `&lt;` + 手打字面 `&lt;` → 字面那处保持），`plan.md:127` 的已知限制加一句「`lt`/`gt`/`quot`/数字体在解析期会被解码，不参与按次数解码」。数字实体口径（用例 6）不受影响。

### R49-11（**P2**）混排形状只看位置：手打的字面实体排在真实体**之前**时，被解成真字符的是手打那处（今天两处都不动）

计划 `plan.md:122` 的语义第 4 条自己写的是「前 N 处解、其余保持」（位置决定），但 `plan.md:137` 用例 8 的标题写成「原文有真 `&nbsp;` 时，手打的字面实体**保持**」——只在「真实体在前」时成立；§步骤 4 的已知限制只有两条，**没有这一条**。实测（同探针 B1）：

```
md = '&amp;nbsp;\n\n甲&amp;nbsp;乙'   src = '甲&nbsp;乙'
new = '&nbsp;\n\n甲&amp;nbsp;乙'       ← 手打那处变真 &nbsp;（重开显示成空格），真实体那处仍是转义
old = '&amp;nbsp;\n\n甲&amp;nbsp;乙'   ← 今天两处都不动
```

即窄形状下新增一次反向改字节（作者要在同一篇里既写 `&nbsp;` 真实体、又手打 `&nbsp;` 字面，且手打的在前）。

**修法（二选一）**：(a) **最小**：`plan.md:127` 已知限制加第 ③ 条「同一名字既有原文实体、又有手打字面实体时，解哪一处由文档顺序决定；手打的排在前面时那一处会被解成真字符」，`plan.md:137` 标题改成「手打在真实体之后…」，并补一条 B1 用例把限制钉住（注释写明是已知限制，不是期望行为）。(b) **更稳**：本稿同一名字的 `&amp;<名>;` 总次数 ≠ 原文次数时整类保持（去掉 `decoded` 位置猜测），用例 8a 期望改成两处都保持——代价是混排文档的 F1 不修（与 m1 同类，`plan.md:127` 已接受），好处是任何顺序都不改用户字节。

### R49-12（**P2**）T3 的 E2E 复制指令指错常量、漏端口、漏取盘方式；照原文执行会覆盖 finder 截图 / 连错浏览器 / 写不出「盘上」断言

`plan.md:269` 写「复用 `.tmp/e2e-r49-typora-a.mjs` 的打字段，`OUT` 前缀改 `impl-t3-`」。实际该脚本**没有 `OUT`**：`const PORT = 9223`（`:5`）、`const SHOTS = 'shots/round-49'`（`:7`），截图名是 `r49-hr-typing.png`（`:77`）、`r49-paste-rich.png`（`:113`）、`r49-theme-dark-dialog.png`（`:207`）、`r49-a-final.png`（`:256`）。整段照抄的后果：

1. 连 **9223**（计划的 §环境事实 `plan.md:21` 与 §6 `plan.md:320` 都写 9222）；
2. 覆盖 finder 的 4 张证据（与 R49-6 修的同一类问题）；
3. `plan.md:271` 要「`Ctrl+S` 后盘上同」，但该脚本从不建工作区/句柄；浏览器态 `Ctrl+S` 在无句柄时走 `saveAsFile` → `showSaveFilePicker`（`src/lib/workspace.ts:285-286`），自动化里拿不到盘，断言不可达——T3 不像 T1/T2 那样写了假 FSA 取盘。

**修法**：把三处写死——`PORT` `:5` → 9222；`SHOTS` `:7` 保持目录、四个 `r49-*` 截图名改 `impl-t3-*`；取盘用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace`/`openFolder`/`readFakeFile` + 一个 `t3-em-dash.md` 种子（打字 → `Ctrl+S` → 读盘），或者把「盘上同」降级成源码视图断言并把「未读盘」写进 `impl.md` 的 UNVERIFIED。

### R49-13（**P2**）T2 有两条「事实」写错：N5 的 `changed:false` 不是遮罩/过渡；`<mark>` 也不是「只有从文件载入才渲染」

1. **N5**：`r49-ui-c-log.txt:5` 的 HOVER 只 hover 了 `.sidebar [role="tab"]` 的 **idx 0 = 当前「文件」页签**（同文件 `:4` 的 `STATES_BASE` 显示它 `bg: rgb(255,253,248)` = `--paper-raised`，即 `styles.css:1446` 的 `.sidebar-tabs button.is-active` 在生效）。`is-active` 与全局 `button:hover:not(:disabled)`（`:137-140`）同特异性 0-2-1 且在后，所以**当前页签 hover 不变是正确行为**，与遮罩、120 ms 过渡都无关。`plan.md:188` 与 `plan.md:230` 让 `impl.md` 写「遮罩/过渡时机」的原因，会落下一条假证据。
2. **`<mark>` 播种**：`plan.md:212` 说「`<mark>` 只有从文件载入才渲染，见 typora F1」。ui-c 的文字是**从源码框 `fill`** 进去的（`.tmp/e2e-r49-ui-c.mjs:43-48`），而 `MARK_VS_CODE`（`r49-ui-c-log.txt:2`）已经量到 `mark` 元素与底色，说明源码态 apply 也算「载入解析」，**不需要额外的假 FSA 播种**；`findings-typora.md:46` 的 F1 说的是「打字输入不渲染」，不是「只有文件载入才渲染」。

**修法**：`plan.md:188` 的原因改成「finder hover 的是当前页签（`is-active` 覆盖 hover）；复测 hover 非当前页签（`大纲`）→ 应变 `--accent-wash`」，`plan.md:230` 同步；`plan.md:212` 允许沿用 ui-c 的源码框播种（假 FSA 可选），若坚持假 FSA 就写明理由，别把它写成必要条件。

### R49-14（**P2**）验收与「门禁最后一起跑」冲突；1 MB 计时没有改前基线

1. `plan.md:158` 要求 T1「`git diff --stat` 只含 `src/lib/html.ts`、`src/lib/html.test.ts`（+ 文档）」，`plan.md:286` 要求 T3「`git diff` 只含」T3 的 5 个文件；但 `plan.md:331` 把门禁排在最后 6 min，那时 T2 的 `src/styles.css` 与 T3 的文件都已改，两条静态对照都**假红**（执行者可能以为越权改动而回退）。
2. `plan.md:147` 要「1 MB 文档…一次 `Ctrl+S` 的耗时读数（记录，不作为卡线；与改前对比 ≤ 2×）」，但 `plan.md:76` 的改前跑只记 `## e1-nbsp` 等实体读数，**没有 1 MB 改前计时**，比对没有基线；而且「记录，不作为卡线」与 `≤2×` 自相矛盾。

**修法**：(1) 两条静态对照改成「本任务阶段核对」，或在门禁后列全允许文件（`src/lib/html.ts`、`src/lib/html.test.ts`、`src/styles.css`、`src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts`、`README.md`、`docs/typora-gap.md`、`docs/CHANGELOG.md`）。(2) 1 MB 计时二选一：在 `plan.md:76` 的 before-run 里同时采集改前 1 MB 读数（同一个脚本加一篇种子），或删掉「与改前对比 ≤2×」，只写「记录改后读数（不进断言）」。

## 2. 非阻塞（不改也能执行）

1. T2 §步骤 1（`plan.md:211`）也没说把 ui-c 的 `connectOverCDP('http://127.0.0.1:9226')`（`.tmp/e2e-r49-ui-c.mjs:8`）改成 9222；§6 有通则，但照抄会连错端口（9226 若无监听会直接报错，不会污染，风险低于 T3）。
2. `plan.md:147` 的「1 MB 文档、正文含 1,000 处 `&nbsp;`」口径已按上轮 review 修好，但没写种子怎么造；按字面造即可（注意两份计数只在 `source !== null` 时跑）。
3. `plan.md:236` 的风险检查「`Select-String -Pattern 'mark-bg'` 应为 5 行」对，但 `--mark-bg` 只加在四个主题块 + 一处使用；若执行者给 `.doc-body mark` 之外再加 fallback 就会变 6 行，别把 5 当成红线而是按「4 声明 + 1 使用」核。
4. `plan.md:229` 的按钮宽度「全部 ≥24」余量只有 1 px（查找条最窄 25）：建议保留「读数照实打印、不当死卡线」的现有写法，别把它升成硬断言。
5. `docs/iteration/roles/planner.md` 的 286,000 B 旧线仍未改（上轮 review §2 #5 已提过）；本计划口径用 310,000/320,000 是对的，不影响本轮执行。

## 3. 复验手段（本审查实跑/实读）

| 做什么 | 命令/文件 | 结果 |
| :--- | :--- | :--- |
| 复跑修订版 `repairHtml` 探针（18 条） | `node .tmp/rev-r49-probe4.mjs` | **18/18 OK**（含 m2、e7b、围栏/行内代码 mention、名字隔离、`&amp;amp;`、既有 `&amp;lt;`/`A &amp; B`） |
| 既有 24 条（改后变体） | `node .tmp/rev-r49-html4.test.ts` | **tests 24 / pass 24 / fail 0** |
| 完整保存链模拟（e1–e7） | `.tmp/critic-r49-e5-sim.mjs`（变体 + 真实 `tableReuse`/`blankParagraphs`/`applyTrailingNewlines`） | e1/e5/e6/**e7**/e3/e4 **SAME**，e2 = `甲&copy;&hellip;—乙\n`（与计划期望一致） |
| 两类反向改字节探针 | `.tmp/critic-r49-rev3-order.mjs`（A1–A4、B1） | 见 R49-10 / R49-11：`new !== old`，old 保持、new 解掉 |
| T3 逐键模拟 + 单测 | `node .tmp/rev-r49-typing4.mjs`；`.tmp/rev-r49-smart3.test.ts`；`.tmp/rev-r49-smart3-new.test.ts` | 旧 `甲 —— 乙` / 新 `甲 — 乙`；15/15；2/2 |
| 基线条数 | `npm test` | **32 文件 414 条**（与计划基线一致） |
| 文档/行号/常量 | `read`：`html.ts`、`codeScan.ts`、`serializeDocument.ts`、`blankParagraphs.ts`、`tableReuse.ts`、`smartTyping.ts`、`html.test.ts`、`smartTyping.test.ts`、`styles.css:1-93/625-719/1430-1453/1890-1964/1976-2037`、`App.tsx:905-944/2636-2663/3968-3991/4984-5005`、`README.md:34-47/86-97`、`CHANGELOG.md:1-18/162-201`、`STATE.md:50-67`、`round-47/{plan,test,impl}.md`、`roundtrip-report.md`、`fixtures/markdown/` | 见 §0 列表；`findings-code.md:110/:119`、`findings-typora.md:85/:98`、`STATE.md:65` ② 与计划引用一致 |
| 环境/纪律 | `git log -1`、`git status --porcelain` | HEAD=`57e2a81`，工作树只有未跟踪的报告/截图目录；未改产品代码、未 push、未碰 `release/` |

## 4. 结论

- revision 3 **把上轮的 2×P1 + 1×P2 真修掉了**：e7 换成正文种子后，用「今天盘上字节 + 修订版 `repairHtml` + 真实 `reuseTables`/`blankParagraphs`」的完整模拟能回到 SAME；T3 的紧邻口径逐键模拟与 17 条单测全绿且与第 47 轮文档一致；R49-9 的 mention 守卫 18/18、既有 24/24。
- 剩 5 条全是 P2，但其中 **R49-10**（`lt/gt/quot/#数字` 不该参与计数解码，约 2 行 + 1 条用例改写）和 **R49-11**（顺序决定解哪一处，至少写进已知限制）建议派单前落进计划——否则 T1 修完会带一处窄的反向改字节，且用例 5 会把它锁成期望行为。R49-12/13/14 改的是执行指令的准确性与证据自洽，成本都只有几行文字。
