# 第 49 轮计划审查（critic，只读）

- 审查对象：`docs/iteration/round-49/plan.md`（3 任务：T1 命名 HTML 实体保真 / T2 四条 CSS / T3 中文 `--` → `——`）
- 轮前 `startSha=57e2a81`；本审查**未改产品代码**（只写 `.tmp/critic-r49-*` 探针，末尾列出）
- 结论：**REVISE**（1 条 P1 + 5 条 P2）。T1 的方案骨架可行、计划给的 6 条单测在补丁副本上全绿；但「原文对照」的粒度仍是「整篇出现过」，`src/lib/html.ts:18-19` 注释承诺的保真面在一种常见文件里**没修好**，并有反向改字节的残余面。其余 5 条是验收口径、实现指令与条数算术的问题，逐条给修法。

## 0. 先说核对通过的（执行者不用再查）

| 计划点 | 核对结果 | 证据 |
| :--- | :--- | :--- |
| 根因：序列化器把 `&` 写成 `&amp;`，解析层不认命名实体 | **成立**。实跑当前 `repairHtml('甲&amp;nbsp;乙','甲&nbsp;乙')` → `"甲&amp;nbsp;乙"`（一字未改） | `node --input-type=module` 直读 `src/lib/html.ts`，见本文件 §3 |
| `source` 已在手、`:22`；`&amp;` 分支 `:39-45`；`ENTITY_AHEAD` `:11` | 全部对上 | `src/lib/html.ts:11,21-24,39-52` |
| 计划 §步骤3 的代码片段 | 复制 `html.ts` 打补丁后：既有 **24/24** 测试绿、计划 **6/6** 单测绿 | `.tmp/critic-r49-html-probe.ts` + `.tmp/critic-r49-html.test.ts` + `.tmp/critic-r49-probe.mjs` |
| `serializeDocument.ts:54-55` 传 `original` | 对（`repairHtml(..., options.original ?? null)` 在 `:55`）；另有 `App.tsx:1051/1099/2105/2840` 与草稿派生 `:924-926` 都传了 | `read` 核对 |
| `App.tsx:925-926` 是「保存链」 | **是措辞问题**：那是 300 ms 的草稿派生（`deriveTimerRef`）不是保存链；实质（传了 `original`）没错，所以不需要改代码，计划措辞改一下即可 | `App.tsx:920-932` |
| T2 的 4 处主题块行号（`:1-33` / `:36-62` / `:65-93` / `:2012-2036`） | 全对；`--mark-wash` 在四处都已存在（`:14` `:50` `:80` `:2029`） | `src/styles.css` |
| T2 的目标数值 | 算过：浅色 `#f0e0bd` 与代码底 `#e8f0ed` RGB 距离 **51.2**、与纸底 **53.3**（阈值 40）；深色 `#453618` 与 `#22302e` **41.8**、与纸底 **57.2**（阈值 30）；mark 内文字对比度 ≈ **9.3:1**（深）/ **10.6:1**（浅）；mermaid 错误 `--danger` 深色 `#e8917f` on `#1c1f23` = **6.85:1**、浅色 `#b4453a` on `#fffdf8` = **5.38:1** | 手算（sRGB→线性→相对亮度） |
| 查找条 / 表格条各 7 个按钮、改前 23 px | 对：`FindBar.tsx:79,88,97,100,103,128,131`；`App.tsx:4958-4981` 7 个；`findings-ui.md:134` 7×23 px | 计数 |
| T2 的 ui N5 判断（全局 hover 规则本来就会生效） | **理由成立**：`button:hover:not(:disabled)`（`:137-140`，特异性 0-2-1）> `.sidebar-tabs button`（`:1438-1444`，0-1-1）；复测要求正确 | `src/styles.css` |
| T3 一行改法、`CJK` 在 `:23`、`|` 守卫在 `:85` | 对；`smartTyping.test.ts` 现有 **15 条**，无一条与「中文后 `--` → `——`」冲突（`:34`/`:84`/`:113` 都是无 CJK 上下文） | `read` + 计数 |
| T3 的 HR 回归风险 | 对：`@tiptap/extension-horizontal-rule/dist/index.js:62` = `/^(?:---|—-|___\s|\*\*\*\s)$/`；基线 `a1-dash-space {"hr":1}` 在 finder 日志里 | `node_modules` + `.tmp/r49-typora-a.log` |
| 验收 `rich 5/7、source 7/7` | 与现报告一致；`fixtures/markdown/*.md` **0 处**实体 → T1 不会动这份报告 | `docs/roundtrip-report.md:13-14`；`Select-String` 0 命中 |
| 基线 294,123 B / 414 条 / v0.32.1 / `## Unreleased（第 29–44 轮）` | 全部对上；CHANGELOG 正文确含 44–48 五节 → 标题改 29–49 正确 | `STATE.md:55`、`package.json:3`、`docs/CHANGELOG.md:5,162-208` |
| 体积 | 不存在破线风险：`html.ts` 净增约 8–10 行、CSS 约 40–80 B gzip | 估 |

## 1. 漏洞

### R49-1（**P1**）T1 的「原文对照」按「整篇出现过」判，不是按出现次数判：含字面 `&amp;` 的文件里 F1 **没修好**，混排文档还会反向改字节

计划的 §步骤3 明确保留旧守卫（`plan.md:57`「其余 kind 分支与『原文写过整条实体就保持』的旧守卫保持不变」），而这条守卫在 `src/lib/html.ts:41` 是**先于** `kind` 判断执行的：

```ts
if (source !== null && source.includes(whole)) return whole   // whole 对 amp 就是 '&amp;'
```

后果两条，都用**按计划补丁改过的副本**实测（`.tmp/critic-r49-html-probe.ts` + `.tmp/critic-r49-probe.mjs`）：

| 用例 | 输入 | 补丁后实际 | 期望 |
| :--- | :--- | :--- | :--- |
| 7 同文件含字面 `&amp;`（粘贴来的 URL `?a=1&amp;b=2` 就是这个形状） | md `甲&amp;nbsp;乙\n链接 https://x/?a=1&amp;b=2\n`，原文 `甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n` | **`甲&amp;nbsp;乙…`（没修）** | `甲&nbsp;乙…` |
| 8 混排：原文有真 `&nbsp;`，作者又手打了字面 `&nbsp;` | md `甲&amp;nbsp;乙\n\n&amp;nbsp;`，原文 `甲&nbsp;乙\n` | `甲&nbsp;乙\n\n&nbsp;`（**新打的字面实体被解成实体**） | `甲&nbsp;乙\n\n&amp;nbsp;` |

- 用例 7 是真实形状：从网页复制来的链接查询串、粘贴的 HTML 片段里 `&amp;` 很常见；这种文件里 F1（P1 数据安全）**仍然每次保存静默改写**。计划的验收种子 `e1`–`e6`（`.tmp/e2e-r49-ent.mjs:7-12`）**没有一条**覆盖它，既有 24 条单测也全绿（`html.test.ts:121-127` 全传 `null`），所以「F1 修完」会是假绿。
- 用例 8 是反向改字节：把作者手打的字面 6 个字符变成一条实体（Sidelight 编辑器里看不出，GitHub/Typora 上渲染会变），与 F1 同一类，只是方向相反。
- **修法（已验证）**：把「是否出现过」换成「出现几次」，并把旧守卫收窄到**不是实体形状**的那一支：

```ts
// 扫描一次：realCount 记 source 里 `&<名>;` 的出现次数（`&amp;<名>;` 里的 <名> 天然不计入，正则先吃掉 &amp;）
// 每条命中的 &amp;<名>;：仅当 decoded[名] < realCount[名] 时解成 &，否则保持整条
// 名字就叫 amp 的实体不参与计数（`&amp;amp;` 是「讲转义」的文档，保持）
// 旧守卫 source.includes(whole) 只在 ahead === undefined（不是实体形状）时生效
```

  实测副本 `.tmp/critic-r49-html-probe2.ts`：既有 **24/24** 绿、计划 **6/6** 绿、用例 7/8 转绿，且「讲转义」三例仍保持不变（`&amp;amp;`、原文只有 `&amp;nbsp;`、原文有字面 `&` + 新打字面 `&lt;`），表格种子 `| a&nbsp;b |` 也逐字节还原。代价约 8 行，比原方案只多 2 行。
- 计数建议用 `mapOutsideCode(source, ...)` 来数（否则围栏/行内代码里的 `&nbsp;` 会充数，把正文里新打的字面实体解掉，与 `e3`/`e4` 同一场景）。
- 单测补 2 条（用例 7、8 各一），并把 CHANGELOG 里「命名实体保真」的口径写成「按出现次数对照原文」。

### R49-2（P2）T2 的「`pre` 无横向溢出（`scrollWidth === clientWidth`）」口径不成立

`src/styles.css:633-641` 的 `.doc-body pre` 明确写了 `overflow-x: auto`——**代码块横向滚动是设计**，任何一行长代码都会让 `scrollWidth > clientWidth`，这条断言要么在正常功能上假红（执行者可能因此把字号改回去、T2 白做），要么在种子行都短时无条件通过（等于没测）。「字号变大后长代码行更早折行」（`plan.md:170`）也不准确：`pre` 默认不换行，是滚动。

- 修法：改成 (a) `pre` 的计算样式 `overflow-x` 仍是 `auto`（保住功能），(b) 页面级没有横向滚动条：`document.documentElement.scrollWidth <= clientWidth + 1`，(c) 用固定短行种子（每行 ≤ 60 字符）在 1440/1024 两档断言 `pre.scrollWidth === pre.clientWidth`，并在报告里同时记一条长行种子的 `scrollWidth`（只记录、不卡线）。

### R49-3（P2）T2 不采用 ui N3 建议的 `--mark-wash`，但没写为什么；执行者按 finder 改会验收红

`findings-ui.md:76` 给的建议是 `.doc-body mark { background: var(--mark-wash) }`（该 token 四处主题块都已存在：`:14` `:50` `:80` `:2029`）。计划改成新建 `--mark-bg`（`plan.md:131-136`）+ 一处「不要动 `--mark-wash`」（`:142`），但没给理由，而且 `:142` 括号里的理由不实：`--mark-wash` 全文件只有两处使用——`.note-kind-revision`（`:1044`）与 `.risk-banner`（`:1805`）；`.find-hit`（`:1908`）用的是 `--mark` 系，不是 `--mark-wash`。

- 事实上计划的取舍是对的：`--mark-wash` 浅色 `#f7ecdc` 与纸底 `#f6f4ee` 的 RGB 距离只有 **≈19.8**、亮度比 ≈1.01——按计划自己「≥40」的验收会直接红；复用它还会让 `<mark>` 与批注卡「修订」标记同色。
- 修法：在 `:131` 前加一句「ui N3 建议的 `--mark-wash` 对纸底距离 ≈19.8 < 40，且与批注卡修订色撞色，故新建 `--mark-bg`；`--mark-wash` 未使用在 `.find-hit`」。若不写，执行者很可能照 finding 改，然后花时间对付假红。

### R49-4（P2）typora F4/F5 在计划里 0 命中；STATE 第 48 轮 ② 顺延了但没给理由

- **typora F4（表格列宽把手不可发现）与 F5（图片落盘规则/选项）既不做也进不了顺延清单**：`plan.md` 全文 grep `列宽`/`把手`/`落盘`/`assets` = **0 命中**。§5 是下一轮唯一的交接面，漏两条就真的消失了（`:239` 的「48-F5 表格条浮层化」是第 48 轮 ui 的 F5，不是 typora F5）。
- **STATE ②**（`STATE.md:65`「ui F4 占位符：`.editor-placeholder` 补 font-family/size/line-height 3 行 + 计算样式 E2E」）**确实在顺延清单里**（`plan.md:239` 的「48-F4（占位符字体字号）」是同一项，这点我核对了，计划没错），但它和 T2 是同一个文件、同一类活，T2 却在做别的 4 条 CSS。不吃 ② 是 planner 的权力，但 §5 也没说为什么排到下一轮。
- 修法（二选一）：(a) 把 48-F4 折进 T2——3 行 CSS + 1 条计算样式断言，约 2 分钟，能让 T2 一次覆盖 STATE 的 ②；(b) 在 §5 的 UI 第二批那条后面补一句「本轮不做 48-F4 的原因」，并补上 typora F4/F5 两条顺延（F4 要先定把手的可见性方案，F5 涉及产品选项）。

### R49-5（P2）测试条数算术错：不是 423，是 422

`plan.md:72` 写「+7 条」，`:73-78` 只列了 **6** 条；`:93` 写「T1 +7 个 `test()`、T3 +2 个 → ≈423」，按现值 414 + 6 + 2 = **422**。既有 `html.test.ts` 实测 **24 条**（计划 `:101` 的「24 条」正确），`smartTyping.test.ts` **15 条**（计划 `:199` 正确）。

- 修法：要么补第 7 条（建议就用 R49-1 的混排用例），要么把 `:72`/`:93` 改成 +6/422；README/AGENTS 的计数仍按 tester 实测填（计划这点没写错）。

### R49-6（P2）三个「复制 finder 脚本」的指令与脚本实际不符，照抄会覆盖已有证据、也拿不到计划要求的截图

- `.tmp/e2e-r49-ent.mjs` **没有**可改的截图前缀：`OUT = 'shots/round-49'`（`:5`），截图名写死 `bug-b3-menu.png`/`bug-b4-outline.png` 等（`:95,108,126,133`），**实体那一段（`:64-83`）一张图都不截、也不数表格数**；照 `plan.md:53` 原样跑会重跑 b3/b4 两段（覆盖 finder 证据）且拿不到 `impl-t1-source-after.png`（`:108` 要求的图脚本里不存在）。
- `.tmp/e2e-r49-ui-c.mjs` 用的是 `SHOTS` 常量（`:173,203,229`），不是 `OUT`；帮助函数 `parseColor/blend/ratio/contrast` 在 `:236-248`（计划 `:146` 的描述正确）。
- `.tmp/e2e-r49-typora-a.mjs` 的打字助手可用（`:54-85`），`plan.md:200` 的描述正确。
- 修法：把 `plan.md:53` 写成具体编辑——「删掉 `b3-new-file`/`b4-outline-collapse` 两段；`OUT` 保持目录、截图名改 `impl-t1-*`；在 e1 之后加 `Ctrl+/` 截 `impl-t1-source-after.png`；`textInfo` 加 `table: root.querySelectorAll('table').length`」。`plan.md:146` 把 `OUT` 改成 `SHOTS`。

## 2. 非阻塞意见（不改也能做，但建议写进 `impl.md`）

1. **数字实体口径的用户可见一句话**：计划只在 CHANGELOG 写限制（`plan.md:71`），但 `README.md:43` 是对外承诺「打开→保存不再把正文…写成实体」。建议在 README「现在不能做什么」（`:89` 附近）补半句：`&#8212;` 这类数字实体会被解码成字符，字节变、渲染不变。
2. **35 分钟预算偏乐观**：T2 自己就要浅/深两遍 + 6 张截图 + ui N5 复测（8–10 分钟），T1 要 6 个种子 × 两次重载 + 1 MB 计时。建议现在就定：T2 截图砍到 3 张（mark 浅/深、目标尺寸），复用 finder 的改前图做对照；28 分钟砍 T3 的规则保留。
3. **`plan.md:237` 的「F3 的 KaTeX 移进 html 分支」标签错**：`findings-code.md:110` 的 F3 是「全部替换 1 MB 冻结」，KaTeX 属于 F4（`findings-code.md:119`，复核第 48 轮 F2/F3）。按计划做时别把两件事混一起。
4. **别改 finder 的报告**：`plan.md:125` 要求「在 `findings-ui.md` 对应条目标已复核」。findings 是 finder 的证据，改它会让下一轮分不清是谁的读数。结论写进 `impl.md` 即可。
5. **`roles/planner.md` 还写着 286,000 B**（计划 `:29` 已正确按 `common.md:6` 的 310,000/320,000 执行）——角色文件不是产品文档，单独修一次即可，别在本轮动。
6. **47-F9 只断言高度**：WCAG 2.2 的目标尺寸是 24×24，最窄的按钮是 `Aa`/`ab`（宽约 32 px，本来够），顺手把宽度也断言进去，免得下一轮重开。

## 3. 复验手段（本审查实跑的东西）

| 做什么 | 命令/文件 | 结果 |
| :--- | :--- | :--- |
| 复现 F1 根因 | `node --input-type=module` 直读 `src/lib/html.ts` | `repairHtml('甲&amp;nbsp;乙','甲&nbsp;乙')` → `甲&amp;nbsp;乙`（未修） |
| 打计划 §步骤3 补丁跑回归 | `.tmp/critic-r49-html-probe.ts` + `critic-r49-html.test.ts`（原测抄一份只改 import） | 24/24 绿 |
| 跑计划的 6 条单测 + 残余面 | `.tmp/critic-r49-probe.mjs` | 6/6 绿；用例 7/8 **红**（R49-1） |
| 验证修法（计数 + 守卫收窄） | `.tmp/critic-r49-html-probe2.ts` + `critic-r49-probe2.mjs` + `critic-r49-html2.test.ts` | 24/24 + 9/9 + 讲转义 4 例全绿 |
| 行号/正则/token/按钮数/报告数字 | `read` + `Select-String` | 见 §0 表 |

探针文件都在 `.tmp/`，没有改 `src/`、没有跑 dev server、没有连 CDP。
