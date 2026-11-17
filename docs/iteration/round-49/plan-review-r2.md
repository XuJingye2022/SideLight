# 第 49 轮计划审查（critic，**revision 2 复审**）

- 审查对象：`docs/iteration/round-49/plan.md` **revision 2**（T1 命名实体保真 / T2 四条 CSS / T3 中文 `--` → `——`）
- 轮前 `startSha=57e2a81`；本审查**未改产品代码**（只写 `.tmp/critic-r49-*` 探针与日志、`docs/iteration/round-49/` 报告）
- 环境：`node .tmp/reset.mjs 9222` 后连 CDP **9222**（未启动 Edge、未 kill `msedge`、未 `browser.close()`）；dev server 5175 未起未重启；未 push、未碰 `release/`
- 上一版（r1）全文保留在 `docs/iteration/round-49/plan-review-r1.md`
- 结论：**REVISE**（**2 条 P1 + 1 条 P2**）。上一版 1×P1 + 5×P2 **已全部改动落地且我复跑验证通过**；但修订版**新增的 E2E 种子 `e7` 不可能通过**（与 T1 无关的链接归一化），**T3 的验收断言与它自己的规则互相矛盾**（且会推翻第 47 轮写进 CHANGELOG 的回归口径），计数法还有一处**新引入的静默改字节**形状没覆盖。

## 0. 上一版 6 条的处置核对（逐条，都实际打开/实跑过）

| 编号 | 修订版落点 | 我的核对 | 结论 |
| :--- | :--- | :--- | :--- |
| **R49-1**（P1） | plan.md:70-72、74-106（步骤 2/3）、115-124（单测 +8）、125（e7 种子）、148-151（风险） | 实跑修订版自己的探针：`node .tmp/rev-r49-probe3.mjs` → **16/16 OK**；`node .tmp/rev-r49-html3.test.ts` → **tests 24 / pass 24 / fail 0**。逐字比对 `plan.md:79-106` 与 `.tmp/rev-r49-probe3.ts:23-82`：同构。旧守卫确实只留在 `ahead === undefined` 一支（probe3.ts:70）；`amp` 名排除（:59）；计数走 `mapOutsideCode(source,…)`（:29-36）且 `&amp;<名>;` 里的名字不计入（`ENTITY_IN_SOURCE` 先吃 `&amp;`）。**用例 7/8 在 app 可达形状上成立**（e7b 见 R49-7；m1 见 R49-9） | **修好** |
| **R49-2**（P2） | plan.md:210-213（验收拆 a/b/c）、223（风险句改「横向滚动」） | `src/styles.css:633-641` 实读：`.doc-body pre` 有 `overflow-x: auto`、**没有** `white-space`——全文件 `white-space: pre-wrap` 只有 `.loss-sample`（`:1687`）与 `.math-fallback`（`:1750`），所以「pre 不换行、长行是横向滚动」的判断正确。另：`findings-ui.md:145` 写「长行按 `pre-wrap` 折行」是 finder 的误读，别照它改 | **修好**（顺手纠了一条 finder 错读） |
| **R49-3**（P2） | plan.md:179-192（新增「先定取舍」段 + 纠正使用点） | `--mark-wash` 声明四处（`:14/:50/:80/:2029`）、使用仅两处（`.note-kind-revision:1044`、`.risk-banner:1805`）；`.find-hit:1908-1914` 用 `--mark` 系。`#f7ecdc` vs `#f6f4ee` RGB 距离 ≈**19.7**（< 40），取舍理由成立 | **修好** |
| **R49-4**（P2） | plan.md:292（48-F4 理由）、294-296（typora F4/F5 进顺延） | `findings-typora.md:85-96`（把手）、`:98-106`（落盘规则）行号对；F5 归到「要产品负责人点头」符合 AGENTS §1 | **修好** |
| **R49-5**（P2） | plan.md:115、140 | `html.test.ts` 实测 **24** 个 `test(`、`smartTyping.test.ts` **15** 个；414+8+2=**424** ✅ | **修好** |
| **R49-6**（P2） | plan.md:63-68、196 | `.tmp/e2e-r49-ent.mjs`：`OUT` `:5`、`textInfo` `:52-57`、b4 段 `:85-111`、b3 段 `:113-136`、截图 `:95/:108/:126/:133`，与计划写的一致；`seeds` 的 `startsWith('e')` 循环在 `:65`（加种子确实自动进循环）；`.tmp/e2e-r49-ui-c.mjs`：`SHOTS` `:173/:203/:229`、`HELPERS_SRC()` `:235-251` | **修好** |

其它核对：`keyboard-acceptance.mjs` 的 `check(` 共 **52** 处（计划写 52/52 对）；`docs/CHANGELOG.md:5` 仍是 `## Unreleased（第 29–44 轮，未发版）`；`README.md:41/43/89/92`、`docs/typora-gap.md:28`、`STATE.md:55/65` 行号都对；`App.tsx:2646-2647`（保存后写 `rawTextRef.current`）与 `:3974-3983`（未脏时源码框显示它）都对，T1 §步骤1 ③ 的截图判据成立。

## 1. 本次新发现

### R49-7（**P1**）新增的 E2E 种子 `e7` 断言 `same:true` 不可能通过：URL 那行会被归一化成 Markdown 链接，与 T1 无关

计划 `plan.md:125` 把 `e7-literal-amp.md` 的种子写成 `'甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n'`，`:129` 要求 `same:true`、`stable2:true`，并称它是「R49-1 的 P1 回归锁」。**在真应用里跑过（CDP 9222，假 FSA，日志 `.tmp/critic-r49-e7.log`）**：

```
seed  : 甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n
loadInfo.text : 甲&nbsp;乙|链接 https://x/?a=1&b=2
disk  : 甲&amp;nbsp;乙\n链接 [https://x/?a=1&amp;b=2](https://x/?a=1&amp;b=2)\n
same:false   stable2:true
```

第二行被序列化器写成 `[url](url)`（link mark 的 markdown 渲染），所以**无论 T1 修不修，`same` 都是 false**。后果两条：
- 修完之后执行者按计划断言，会看到 P1 回归锁红，可能去查/改「链接归一化」（超范围），或把这条锁删/放松掉——本轮唯一的 P1 就没有 E2E 锁了；
- 计划 §7（`:319`）还专门写「`e7` 是 P1 的判据，必须跑」，冲突更明显。

**修法（已验证）**：把 `e7` 的种子换成**普通正文里带字面 `&amp;`** 的形状，去掉 URL：
`'甲&nbsp;乙\n价格 &amp; 单位\n'`。实测（同一日志 `e7b-prose-amp.md`）：今天 `disk = 甲&amp;nbsp;乙\n价格 &amp; 单位\n`（`same:false` 只因 F1）；把今天盘上字节喂给修订版 `repairHtml`（`.tmp/critic-r49-mixed.log` 第 1 行）→ **SAME**，即修完后 `same:true` 可达成，且它仍然检验「同文件另有字面 `&amp;` 不再挡住解码」（旧方案在这篇上 `same:false`，正是 R49-1 的机制）。R49-1 的用例 7 单测（`plan.md:123`）**保持原样**（它是字符串级、不过链接）。若想保留 URL 形状，只能断言 `same:false` 并写清归一化原因——不建议，那就不再是 P1 的字节锁。

### R49-8（**P1**）T3 的验收断言 `甲 -- 乙 → 甲 — 乙` 与计划自己的规则矛盾，还推翻第 47 轮写进 CHANGELOG 的回归口径

计划 `plan.md:240` 的改法：`const cjk = CJK.test(before) || CJK.test(after)`，`:236` 的口径写「光标前后 **4 字内**有汉字时产出 `——`」。而 `plan.md:256` 又断言「`甲 -- 乙` → `甲 — 乙`（第 47 轮口径回归）」。**这两条不能同时成立**：

- 在真编辑器里打 `甲 -- 乙`，第二根 `-` 落下时 `before = '甲 -'`（`smartTyping.ts:131` 取光标前 ≤4 字，此时文档就是 `甲 -`），`CJK.test('甲 -') === true` → 走 `——` 分支 → 上屏 `甲 —— 乙`。
- `甲 -- 乙 → 甲 — 乙` 不是计划新造的期望，是**第 47 轮已写进文档的行为**：`docs/iteration/round-47/plan.md:137`、`docs/iteration/round-47/test.md:55`、`docs/iteration/round-47/impl.md:105`、`docs/CHANGELOG.md:194`（「普通段落 `甲 -- 乙` 仍变 `甲 — 乙`（回归）」）。
- 照计划执行会这样：单测（`plan.md:248-252`）全绿，E2E 的 `甲 -- 乙` 那条**必红**；执行者要么改断言（CHANGELOG 与第 47 轮报告就变假），要么改实现去凑断言（又违反 `:236` 的 4 字口径）。两边都是错的方向。

**修法（二选一，建议 a）**：
- **a. 把口径从「前后 4 字内有汉字」收成「紧邻」**：`const cjk = CJK.test(before.slice(-2, -1)) || CJK.test(after.slice(0, 1))`。效果：`中文--中文`（before 末两字 `文-`）→ `——`；`甲-` + `-` + `乙`（after 首字 `乙`）→ `——`；`word--word` → `—`；**`甲 -- 乙` → `—`（第 47 轮口径不破）**。同时把 `plan.md:236` 的「前后 4 字内」与 `:260` 的 README 改写句、`:252` 的单测文案一起改成「紧邻汉字（或后一个字符是汉字）」。若想覆盖全角标点后的 `--`（如 `，--`），把「不是 ASCII」也算中文上下文：`/[^\x00-\x7f]/`，但要在 `:236` 写清。约 1 行代码，不增时间。
- b. 如果产品上就要「4 字内一律 `——`」（即 `甲 —— 乙`），那必须**显式推翻第 47 轮**：把 `round-47/plan.md:137`、`test.md:55`、`impl.md:105`、`CHANGELOG.md:194` 四处一起改并说明行为变更，`plan.md:256` 的断言改成 `甲 —— 乙`。**不能只改断言不改文档**。

### R49-9（**P2**）计数法在「讲转义的字面 `&amp;<名>;` 排在真实体之前」时新引入一次静默改字节（今天这行是对的）

R49-1 的修法把「原文里出现过就行」换成「按出现次数解」，但**原文里的 `&amp;<名>;`（讲转义写法）与真实 `&<名>;` 在正文里长得一模一样**（`@tiptap/markdown` 的 `decodeHtmlEntities` 把 `&amp;` 解成 `&`，`&nbsp;` 这类命名实体却保留字面，见 `node_modules/@tiptap/core/dist/index.js:4203-4219`、`node_modules/@tiptap/markdown/dist/index.js:796`），计数法只能按「先到先解」。实测（CDP 9222 + 修订版 `repairHtml` 喂应用实测串，`.tmp/critic-r49-e7.log` 与 `.tmp/critic-r49-mixed.log`）：

| 种子 | 今天盘上（改前） | 修订版修完（模拟） |
| :--- | :--- | :--- |
| m1：真实体在前<br>`甲&nbsp;乙\n\n讲转义：&amp;nbsp; 的写法\n` | `甲&amp;nbsp;乙\n\n讲转义：&amp;nbsp; 的写法\n`（第 1 行 F1） | **两行都对**（SAME） |
| m2：讲转义在前<br>`讲转义：&amp;nbsp; 的写法\n\n甲&nbsp;乙\n` | `讲转义：&amp;nbsp; 的写法\n\n甲&amp;nbsp;乙\n`（**第 1 行是对的**，第 2 行 F1） | `讲转义：&nbsp; 的写法\n\n甲&amp;nbsp;乙\n`（**第 1 行被改**：字面 6 字符变真实体；第 2 行仍错） |

也就是说 m2 形状从「1 行错」变成「2 行错」，且新增的是**反向改字节**（作者写的字面 `&nbsp;` 变成会渲染成空格的实体），正是 F1 想消灭的那类。同源问题还有一处：`repairHtml` 的 `source` 是**整个文件**，frontmatter / 脚注定义里的 `&nbsp;` 也会进 `realCount`，而 `markdown` 只有正文——两处口径不齐（罕见，但同一机制）。

**修法（3 行 + 1 条单测，不动任何已通过的用例）**：计数时**再数一份 mention**：扫描到 `&amp;<名>;` 时累加 `mentionCount[<名>]`（同一遍 `mapOutsideCode(source,…)` 里做，正则 `&amp;([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);`）；解码端在 `got < want` 之外再加一条「`mentionCount.get(body) ?? 0 === 0`」——即**该名字只要在原文里被当作转义写法提过，就保守地整条保持**。核对过：m1/m2 都不再多改字节（m1 退回今天的 1 行 F1，而 m2 第 1 行保住）；`plan.md:123` 用例 7 的 `&amp;b=2` **不是** mention（`b=2` 不满 `名字;`）→ R49-1 仍然修好；`&amp;lt;`/`&amp;nbsp;` 讲转义负例（`html.test.ts:121-127`、计划用例 4）结果不变；`amp` 名已排除不受影响。把 m2 加成第 9 条单测（+1 条，总条数变 **425**，`plan.md:140` 同步）。若不想加代码，**至少**在 `plan.md` §步骤 4 的「已知限制」、CHANGELOG 与 README（`:89`）写清「同一文件里用 `&amp;nbsp;` 讲转义、又在别处用真 `&nbsp;` 时，字节可能换位」——现在计划说「按出现次数对照」，读者会以为是逐字节保真。

## 2. 非阻塞（不改也能执行）

1. `plan.md:59` 仍把 `App.tsx:925-926` 叫「保存链」——那是 300 ms 的草稿派生（`deriveTimerRef`，`:921-932`），r1 §0 已指出；只是措辞，`original` 确实传了，不影响指令。
2. `plan.md:133`「1 MB 种子（1,000 处 `&nbsp;`）」口径不明：1,000×6 B = 6 KB，不是 1 MB。建议写「1 MB 文档，正文含 1,000 处 `&nbsp;`」。
3. `findings-ui.md:145`「长行按 `pre-wrap` 折行」是 finder 误读（见 §0 R49-2）；执行者别按它把 (c) 改成「预期待换行」。
4. T2 的「按钮宽度也 ≥24」余量只有 1 px：`r49-ui-c-log.txt` 里查找条 7 个按钮宽 **33/33/25/25/29/43/66**（最窄 25）；表格条该日志只记了高度（23），宽度引 `findings-bug.md:79` 的 53/41 px。多留一句「宽度读数照实打印」即可，别把它当卡线。
5. `tester` 验收后按实测更新 README/AGENTS 的条数（424→425，若采纳 R49-9）；`roles/planner.md` 的 286,000 B 仍建议单独修（不在本轮）。

## 3. 复验手段（本审查实跑）

| 做什么 | 命令/文件 | 结果 |
| :--- | :--- | :--- |
| 复跑修订版探针 | `node .tmp/rev-r49-probe3.mjs` | **16/16 OK** |
| 复跑既有 24 条（改后变体） | `node .tmp/rev-r49-html3.test.ts` | **24/24 pass** |
| 真应用里量 e7 与讲转义混排 | `.tmp/critic-r49-e7.mjs` → `.tmp/critic-r49-e7.log`（CDP 9222，先 `reset.mjs 9222`） | e7 `same:false`（链接归一化）；e7b/m1/m2 读数见 R49-7/R49-9 |
| 把应用实测串喂给修订版 `repairHtml` | `.tmp/critic-r49-mixed.mjs` → `.tmp/critic-r49-mixed.log` | e7b **SAME**、m1 **SAME**、m2 **DIFF**（新引入） |
| T3 规则与断言的冲突 | 直读 `smartTyping.ts:85,87,131` + `CJK.test('甲 -')` 为真 + 第 47 轮四处文档 | `甲 -- 乙` 在新规则下是 `甲 —— 乙` |
| 行号/token/按钮/文档计数 | `read` + `Select-String` + `node` 读行 | 见 §0 表与 §2 |

探针都在 `.tmp/`（`critic-r49-e7.mjs`、`critic-r49-mixed.mjs` 及其 `.log`），`src/` 与已提交文档 0 改动；`git status` 只多 `docs/iteration/round-49/`、`shots/round-49/`（与开工时相同）。
