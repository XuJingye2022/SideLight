# 第 49 轮计划（planner → planner-revision，只读）— **revision 3（第 3 次修订）**

> **revision 3（第 3 次修订，planner-revision，只读；2026-11-18）** —— 按 `docs/iteration/round-49/plan-review.md`（critic 对 revision 2 的复审，结论 **REVISE**：**2×P1 + 1×P2**）逐条修掉。**任务结构不变**：仍是 T1/T2/T3，不新增任务、不扩大范围；只改 T1 的 E2E 种子/计数法/单测、T3 的破折号口径与断言、以及相关条数与证据引用（逐条对照见文末 **§10**）。
> - **R49-7（P1）** → T1 §步骤 6：`e7` 种子从 `'甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n'` 换成**正文形态** `'甲&nbsp;乙\n价格 &amp; 单位\n'`（URL 会被序列化器写成 `[url](url)`，`same` 与 T1 无关地永远 false）。`plan.md` §步骤 5 的用例 7（**字符串级**，`https://x/?a=1&amp;b=2` 只出现在单测里）保持原样。**本修订实跑**：今天盘上 `甲&amp;nbsp;乙\n价格 &amp; 单位\n` 喂变体 → **SAME**（`.tmp/rev-r49-probe4.mjs` 用例 10）。
> - **R49-8（P1）** → T3 口径从「光标前后 4 字内有汉字」收成「**紧邻**汉字」：`const cjk = CJK.test(before.slice(-2, -1)) || CJK.test(next)`（`next` 就是既有 `:63` 的 `after.slice(0, 1)`）。效果：`中文--中文` → `——`、`甲-`+`-`+`乙` → `——`、`word--word` → `—`，而 **`甲 -- 乙` → `甲 — 乙`（第 47 轮口径不破，`round-47/{plan.md:137,test.md:55,impl.md:105}` 与 `CHANGELOG.md:194` 四处都不用改）**。**本修订实跑**：逐键模拟新旧两口径（`.tmp/rev-r49-typing4.mjs`）——旧口径 `甲 —— 乙`、新口径 `甲 — 乙`；既有 15 条单测 **15/15**。
> - **R49-9（P2）** → T1 §步骤 2/3 的计数法再数一份 `mentionCount`（原文里以 `&amp;<名>;` 讲转义的名字），解码端见到该名字就**保守地整条保持**；m2「讲转义在前」不再被反向改字节。新增单测 **+1**（m2 字节不变），T1 变 **+9**、总条数 **414 + 9 + 2 = 425**。**本修订实跑**：变体 **18/18** 用例（`.tmp/rev-r49-probe4.mjs`）+ 既有 24 条 **24/24**（`.tmp/rev-r49-html4.test.ts`）。
> - 另采纳本次 review §2 的非阻塞意见：#1 `App.tsx:925-926` 只是 300 ms 草稿派生、不是保存链（措辞改正）；#2 1 MB 口径写成「1 MB 文档、正文含 1,000 处 `&nbsp;`」；#4 按钮宽度读数照实打印、不为 1 px 余量改 padding；#5 tester 按 `npm test` 实测更新计数（约 **425**）。
> - 修订范围：**只改本文件**。未改产品代码、未连 CDP、未跑 E2E、未起/重启 dev server、未碰 `release/`、未 commit。核对手段：`read` 实读 `src/lib/html.ts`、`src/lib/codeScan.ts`、`src/lib/serializeDocument.ts`、`src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts`、`src/lib/html.test.ts`、`src/App.tsx:915-935`、`README.md:36-95`、`docs/typora-gap.md:24-32`、`docs/CHANGELOG.md:1-8/190-198`、`docs/iteration/round-47/{plan,test,impl}.md` 对应行；`node` 实跑两个只读变体、两套既有单测与两个探针（见 §10.1）。

> **revision 2（第 2 次修订，planner-revision，只读；2026-11-18）** —— 按 `docs/iteration/round-49/plan-review.md`（critic，结论 **REVISE**：1×P1 + 5×P2）逐条修掉。**任务结构不变**：仍是 T1/T2/T3，不新增任务、不扩大范围、不改产品方向；只改实现指令、验收判据、条数算术与顺延清单。本次调度点名 3 条（R49-1/R49-2/R49-3），同文件里的 R49-4/R49-5/R49-6 也会让执行代理假绿或覆盖证据，一并修掉（逐条对照见文末 **§9**）。
> - **R49-1（P1，数据安全）** → T1 §实施步骤 2/3、§步骤 5、§步骤 6、§验收、§风险：`&amp;<名>;` 从「原文整篇出现过」改成「**按出现次数**」对照；旧守卫 `source.includes(whole)` 收窄到 `ahead === undefined`（非实体形状）那一支；计数用 `mapOutsideCode(source, …)` 只数**代码外**。**本修订实跑验证过**（只读探针，未改产品代码）：既有 24/24 绿（`node .tmp/rev-r49-html3.test.ts` → `tests 24 / pass 24 / fail 0`）+ 探针 16 条用例全绿（`node .tmp/rev-r49-probe3.mjs` → **16/16 OK**，含 critic 用例 7/8、围栏/行内代码计数边界、混排计数、表格种子）。
> - **R49-2（P2）** → T2 §验收的 `pre` 断言拆成三条（`overflow-x` 仍是 `auto` / 页面级无横向滚动 / 短行种子两档 `scrollWidth === clientWidth`），长行只记录不卡线；§风险里「长代码行更早折行」改成「横向滚动」。
> - **R49-3（P2）** → T2 §改动 1 前补「为什么新建 `--mark-bg` 而不用 ui N3 建议的 `--mark-wash`」（距离 ≈19.8 < 40、与批注卡修订色撞色）；纠正 §不要动 那句里对 `--mark-wash` 使用点的错误描述。
> - **R49-4（P2）** → §5 补 typora F4/F5 两条顺延 + 写明本轮不做 STATE 48 ②（48-F4 占位符）的理由。
> - **R49-5（P2）** → T1 单测 **+7 → +8**（原 6 条 + R49-1 的用例 7/8），总条数 **414 + 8 + 2 = 424**（以 `npm test` 输出为准）。
> - **R49-6（P2）** → T1 §步骤 1/6 与 T2 §步骤 1 的「复制 finder 脚本」改成**具体编辑**（删 b3/b4 两段、`SHOTS` 不是 `OUT`、截图名 `impl-*`、`textInfo` 加表格计数），照原文跑会覆盖 finder 证据。
> - 另采纳 review §2 的非阻塞意见：#1 README 补数字实体限制半句、#2 T2 截图的砍单规则写进 §7、#3 `F3 的 KaTeX` 标签改正（应指 F4）、#4 不改 finder 报告（结论只写 `impl.md`）、#6 点击区宽度也断言。
> - 修订范围：**只改本文件**。未改产品代码、未连 CDP、未跑 E2E、未起/重启 dev server、未碰 `release/`、未 commit。核对手段：`read` 实读 `src/lib/html.ts`、`src/lib/codeScan.ts`、`src/styles.css`、`src/App.tsx:3969-3985/2646-2647`、`.tmp/e2e-r49-ent.mjs`、`.tmp/e2e-r49-ui-c.mjs`、`findings-ui.md`、`findings-code.md`、`findings-typora.md`、`STATE.md`、`README.md`，`node` 实跑本修订的只读探针。

- 轮次：`round=49`、`nn=49`；报告目录 `docs/iteration/round-49`；轮前 `startSha=57e2a81748090e63b88b1ad4f998ca3b689e347f`（`git log -1` 同值；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-49/`、`shots/round-49/`，产品代码 0 改动）。
- 环境事实：dev server `http://localhost:5175` 已在跑（**不另起、不重启**）；浏览器只用 CDP **9222**，每段 E2E 前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`；不 push、不改 `release/`；本轮**不发版**（`package.json` 不动）。
- 输入：本轮五份 `findings-*.md`（bug 2 / typora 6 / code 4 / ship 5 / ui 7）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`git log -8` 与相关源码。
- 结论：**3 个任务**，估时 29 min，留 6 min 跑门禁与写 `impl.md`。
  - 1 条 **P1 数据安全**（bug F1：命名 HTML 实体首次保存被二次转义，文件语义静默改变）。
  - 2 条用户可见（ui 的 3 条可见缺陷 + 1 条点击区尺寸合成一批纯 CSS；typora 的中文破折号）。
  - code F3（全部替换 1 MB 冻结 51.8 s，P1）与 STATE 第 48 轮 ① 顺延，理由见 §5，下一轮**第一、二项**。

## 0. 任务表

| id | 标题 | 级别 | 来源 | 用户可见 | 预估 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 命名 HTML 实体在保存时保真（`&nbsp;`/`&copy;`/`&hellip;` 不再变 `&amp;…`） | **P1** | bug F1 | 否（数据安全/保真） | 15 min |
| **T2** | 高亮可见、代码块字号、Mermaid 错误色、点击区 24 px：4 条纯 CSS（+ ui N5 复测） | P2 | ui N3/N4/N1 + 47-F9 | **是** | 8 min |
| **T3** | 中文上下文里 `--` 出 `——` | P2 | typora F3（+ui N6 关联） | **是** | 6 min |

## 1. 基线（改前必须记录，写进 `impl.md`）

| 项 | 实测值 | 出处 |
| :--- | :--- | :--- |
| 分支 / HEAD | `main` / `57e2a81`（round-48: 表格内块级守卫 + 源码基线归一化 + 文档数字订正） | `git log -1` |
| 首屏 gzip | **294,123 B**（内部 310,000 / 硬线 320,000，余 25,877 / 15,877） | 第 48 轮 `npm run verify`；ship §一 本轮复核同值 |
| 测试 | **32 文件 414 条** | 第 48 轮 `npm test` |
| 版本 | `0.32.1`（本轮**不 bump**；CHANGELOG 写 `## Unreleased`） | `package.json:3` |
| 已运行 dev server | `http://localhost:5175` 200 | finder 五份报告 |

**体积口径说明**：`roles/planner.md` 里写的「首屏 ≤286,000 B 硬门」是第 35 轮换挡前的临时上限，已被 2026-11-17 的政策取代（`.tmp/iteration/common.md:6`、`STATE.md:50/55`：内部 **310,000** / 硬线 **320,000**）。当前实际 294,123 B > 286,000，若按旧线全绿基线都会红。本轮按 **310,000（内部）/ 320,000（硬线）** 执行。

---

## T1（P1，数据安全）命名 HTML 实体在保存时保真

### 为什么

bug F1 实测：种子 `甲&nbsp;乙\n` 打开后按一次 `Ctrl+S`，盘上变成 `甲&amp;nbsp;乙\n`（多 4 字节），**没有**任何提示。`&nbsp;` 是「不换行空格」，`&amp;nbsp;` 是 6 个字面字符——文件语义变了，其它 Markdown 渲染器（GitHub/Typora/Obsidian）打开会显示字面 `&nbsp;`。表格单元格（`| a&nbsp;b |`）与用户手写的整行 `&nbsp;` 空段落同样中招，且表格还会被顺带重排。

这违反本仓库对保真的既有承诺：`src/lib/html.ts:18-19` 的注释写「原文里真的写过某条实体时，那一类整篇保持不动」，`src/lib/blankParagraphs.ts:6-7` 写「用户手写的 `&nbsp;` 段落原样」；第 40/41/47 轮对 `H~2~O`、`<!-- -->`、`<` `>` `&`、`<kbd>` 都是按「逐字节不变」修的。判 P1（不判 P0）的理由：可 `Ctrl+Z` 回编辑器，但盘上字节已改写，再保存一次又写回错误版本。

### 根因（已定位，不改别处）

- 序列化器 `@tiptap/core` 的 `encodeHtmlEntities` 把正文里每个 `&` 写成 `&amp;`；解析层不认**命名**实体（`&nbsp;`/`&copy;`/`&hellip;` 原样留在正文），所以保存链拿到 `&amp;nbsp;`。
- `src/lib/html.ts:39-52` 的 `&amp;` 分支只有「前视守卫」`ENTITY_AHEAD`（`:11`）：看到 `&amp;` 后面紧跟 `nbsp;` 就保持不动（`:42-45`）。这条守卫是为「新文档里打的字面 `&lt;`」设计的（`html.test.ts:121-127`），代价是所有命名实体都不再还原。
- 对照：标签分支（`:26-36`）有 `source.includes(...)` 的原文对照还原，`&amp;` 分支没有等价逻辑——而 `source` 早在 `:22` 就拿到了。

### 改动文件 / 函数

只改 `src/lib/html.ts` 的 `repairHtml`（约 15 行），加 `src/lib/html.test.ts` 测试。**不要**动 `escapeHtmlForParse`、`inlineHtmlTags.ts`、`ESCAPED_TAG`、`&gt;` 的块首守卫（`BLOCK_START`）、`:24` 的快路径；不要动 `src/lib/serializeDocument.ts`（保存出口 `serializeDocument.ts:54-55` 与 **300 ms 草稿派生** `App.tsx:920-932` 的 `deriveTimerRef`——后者不是保存链——都已把 `original` 传进来）。

### 实施步骤

1. **先留改前读数**：把 `.tmp/e2e-r49-ent.mjs` **复制**成 `.tmp/e2e-r49-impl-t1.mjs`（**不要原地跑** `.tmp/e2e-r49-ent.mjs`：它会把 b3/b4 两段重跑一遍，覆盖 finder 的 `shots/round-49/bug-b3-menu.png`、`bug-b3-new-file.png`、`bug-b4-outline.png`、`bug-b4-outline-back.png`）。复制后按这五处改（R49-6）：
   - ① 删掉 `b4-outline-collapse` 段（原 `:85-111`）与 `b3-new-file` 段（原 `:113-136`）；
   - ② `OUT`（原 `:5`）**保持** `'shots/round-49'` 目录（截图名自己带前缀，别改成空串或别的目录），截图名用 `impl-t1-*`；
   - ③ 在实体那段（原 `:64-83`）读到 `e1-nbsp.md` 的盘上字节之后加一张 `impl-t1-source-after.png`：`page.keyboard.press('Control+/')` 进源码 → 等 400 ms → 截图 → 再按一次 `Control+/` 回编辑视图。这张图真能当判据旁证：保存成功后 `rawTextRef.current` 被写成盘上内容（`src/App.tsx:2646-2647`），而进源码时未脏就显示它（`src/App.tsx:3974-3983`）；
   - ④ `textInfo`（原 `:52-57`）的返回值加 `table: root.querySelectorAll('table').length`（供 `e5` 断言「重开仍是 1 张表」）；
   - ⑤ 两个 `b-*` 种子（原 `:13-14`）留着无妨：实体循环只跑 `startsWith('e')`，不会碰它们。
   改完先跑一遍记改前读数：`## e1-nbsp` 等读数为 `same:false`、`disk` 含 `&amp;nbsp;`（日志 `.tmp/r49-impl-t1-before.log`）。
2. 改 `repairHtml`：`source !== null` 时**用 `mapOutsideCode(source, …)` 扫一次**（`mapOutsideCode` 文件头已 import，`src/lib/html.ts:1`），把原文每条实体 `/&([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g` 的**出现次数**记进 `realCount: Map<string, number>`；**同一遍 `mapOutsideCode` 的回调里再数一份 `mentionCount: Map<string, number>`**（正则 `/&amp;([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g`：原文里被**当作转义写法**提过的名字，R49-9）；解码端再加一个 `decoded: Map<string, number>` 记「同一个名字已经解过几次」。三个要点：
   - **只数代码外**（围栏 / 行内代码里的 `&nbsp;` 不算原文实体；否则正文里新打的字面实体会被解掉，与 `e3`/`e4` 同一场景）。回调返回 `segment` 原样即可，只借它的分段。**两份计数都只扫代码外**：围栏 / 行内代码里的 `&amp;nbsp;` 不算 mention（否则只是讲代码样例的文档会被无故挡住解码）。
   - `&amp;nbsp;` 里 `nbsp` **不会**进 `realCount`：正则先吃掉 `&amp;`，接着扫到的是 `nbsp;`，它前面没有 `&`。这是「按出现次数」能成立的关键事实，也是原方案「命名实体一律不解」能收窄成「只解原文出现过的次数」的前提。
   - **mention 守卫（R49-9）**：正文里的 `&amp;<名>;`（讲转义）与真实体 `&<名>;` **长得一样**，计数法只能「先到先解」，于是「讲转义在前」的文件会把作者写的字面实体解成真字符（反向改字节）。所以再数一份 `mentionCount`：某个名字在原文里以 `&amp;<名>;` 出现过，就**整条保持**（解码端条件加 `!mentioned`）。代价：「真实体在前 + 讲转义在后」的文件（m1）退回今天的 1 行 F1（不比今天差）；收益：「讲转义在前」的文件（m2）一个字节都不再被改。见 §步骤 5 的用例 9。
   - 顺手把 `src/lib/html.ts:18-19` 的 JSDoc 改成新口径（「原文里真的写过某条实体时，那一类整篇保持不动」→「原文里写过某条实体时，**按出现次数**对照；代码外才计数；同一文件里用 `&amp;<名>;` 讲转义时该名字保守保持」）。注释与行为不一致会变成下一轮误读的种子（第 40/41 轮的旧口径就是这么留下的）。
3. `&amp;` 分支改成（**`lt`/`gt` 两支与「原文写过这条实体就保持」的旧守卫保持不变**；旧守卫对 `amp` 只保留在 `ahead === undefined` 那一支）：
   ```ts
   // 文件头另加两条常量，和 ESCAPED_ENTITY 并列：
   // const ENTITY_IN_SOURCE = /&([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g
   // const ENTITY_MENTION = /&amp;([a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/g

   if (kind === 'amp') {
     const ahead = ENTITY_AHEAD.exec(restored.slice(offset + whole.length))?.[0] // 形如 'nbsp;'
     if (ahead !== undefined) {
       // 实体形状的 &amp;<名>;：按「原文里出现过几次」对照，不是「整篇出现过没有」
       const body = ahead.slice(0, -1)
       // 名字就叫 amp 的实体不参与计数（&amp;amp; 是讲转义的文档，保持）
       if (body !== 'amp') {
         const want = realCount.get(body) ?? 0
         const got = decoded.get(body) ?? 0
         // R49-9：原文里把这个名字当转义写法提过（&amp;<名>;），分不清是哪一处，保守地整条保持
         const mentioned = (mentionCount.get(body) ?? 0) > 0
         if (!mentioned && got < want) {
           decoded.set(body, got + 1)
           return '&'
         }
       }
       return whole
     }
     // 不是实体形状（如 `A &amp; B`、`&amp;lt`）：旧守卫只在这一支生效
     return source !== null && source.includes(whole) ? whole : '&'
   }
   // lt / gt 两支照旧：原文里真的写过这条实体时保持（旧守卫在这两支仍然生效）
   if (source !== null && source.includes(whole)) return whole
   if (kind === 'gt') {
     // 行首（含引用/列表标记之后）的 `&gt;` 解开会变成引用块标记：保持（不动）
     const prefix = markdown.slice(lineStart, start) + restored.slice(0, offset)
     return BLOCK_START.test(prefix) ? whole : '>'
   }
   return '<'
   ```
   语义六条（前四条是行为契约，后两条是本次修掉的两类假绿/反向改字节）：
   - **原文写 `&nbsp;` → 保存还是 `&nbsp;`**（`realCount.nbsp=1`，`0 < 1` 解一次）；
   - **原文写 `&amp;nbsp;`（讲转义）→ 仍是 `&amp;nbsp;`**（`realCount.nbsp=0`，保持）；
   - **没有原文（新文档）→ 保持 `&amp;nbsp;`**（不把新文档的字面实体改坏，`html.test.ts:121-127` 不动）；
   - **原文 2 处、本稿 3 处（混排）→ 前 2 处解、第 3 处保持**（R49-1 用例 8，反向改字节那一面）；
   - **同文件另有字面 `&amp;`（粘贴 URL 的 `?a=1&amp;b=2`）→ 不再挡住 `&amp;nbsp;` 的解码**（R49-1 用例 7；原方案的旧守卫 `source.includes('&amp;')` 恒真，会让 F1 在这种文件里完全没修）；
   - **原文里用 `&amp;<名>;` 讲转义 → 该名字整篇一个字节都不再被解**（R49-9：m2「讲转义在前」不再把第 1 行的字面实体解成真字符；代价是 m1「真实体在前 + 讲转义在后」退回今天的旧行为，即那 1 行 F1 不修）。
   实现参考：**已验证变体 `.tmp/rev-r49-probe4.ts`**（`&amp;` 分支与上面逐字同构，含 mention 守卫；只读探针，不进仓库；**18/18** 用例 + 既有 24 条 **24/24**）。
4. **数字实体口径（本轮定死，不改行为）**：`&#8212;` 在解析期被解码成 `—`（bug F1 的 `e2-more`），保存后字节变但**渲染不变**。要改成保真得在解析层转义 `&`，会牵动 `&amp;` 的显示口径（作者会看到字面 `&#8212;`），风险大于收益。本轮**保留现状**：在 `html.ts` 的 `&amp;` 分支上方加一行注释说明，并在 `html.test.ts` 加一条锁定测试，CHANGELOG 的已知限制写一句。
   **同机制的两条已知限制（本轮不修，写进 `impl.md` 与 CHANGELOG 的已知限制，不写 README）**：① `source` 是整个文件（含 frontmatter 与脚注定义），`markdown` 只有正文，两处口径不齐（罕见）；② mention 守卫按「名字整篇保持」，所以同一文件里既写真实体、又用 `&amp;<名>;` 讲转义时，那一类实体保持原字节——不比今天差，只是 F1 在那类文件里不修。
5. 单测（`src/lib/html.test.ts`，**+9 条**：下面 6 条 + R49-1 的用例 7/8 + R49-9 的用例 9；直接调 `repairHtml` 公开 API，不新增导出）：
   - `repairHtml('甲&amp;nbsp;乙', '甲&nbsp;乙') === '甲&nbsp;乙'`（本轮目标）
   - `repairHtml('甲&amp;copy;&amp;hellip;乙', '甲&copy;&hellip;乙') === '甲&copy;&hellip;乙'`
   - `repairHtml('甲&amp;nbsp;乙', null) === '甲&amp;nbsp;乙'`（无原文保持，回归）
   - `repairHtml('甲&amp;nbsp;乙', '讲转义：&amp;nbsp; 的写法') === '甲&amp;nbsp;乙'`（原文写的是 `&amp;nbsp;`，保持）
   - `repairHtml('写成 &amp;lt; 才不会变标签', '写成 &lt; 才不会变标签') === '写成 &lt; 才不会变标签'`（原文写 `&lt;` 时解回 `&`）
   - `repairHtml('甲—乙', '甲&#8212;乙') === '甲—乙'`（数字实体口径锁定）
   - 既有 `&amp;lt;`/`&amp;#42;`/`&amp;lt`/`A &amp; B`（`html.test.ts:121-127`）**一条都不许改**，跑绿即回归通过。
   - **（R49-1 用例 7）** `repairHtml('甲&amp;nbsp;乙\n链接 https://x/?a=1&amp;b=2\n', '甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n') === '甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n'`：同文件里的字面 `&amp;` 不再挡住解码（旧守卫在这里会返回整条 `&amp;`，F1 等于没修）。**注意 `&amp;b=2` 不是 mention**（`b=2` 不满足 `名字;`），mention 守卫不会挡住它。
   - **（R49-1 用例 8）** 一个 `test()` 两个断言：`repairHtml('甲&amp;nbsp;乙\n\n&amp;nbsp;', '甲&nbsp;乙\n') === '甲&nbsp;乙\n\n&amp;nbsp;'`（原文有真 `&nbsp;` 时，手打的字面实体**保持**，反向改字节回归）；`repairHtml('```\n甲&nbsp;乙\n```\n\n&amp;nbsp;\n', '```\n甲&nbsp;乙\n```\n\n') === '```\n甲&nbsp;乙\n```\n\n&amp;nbsp;\n'`（**只数代码外**：围栏里的 `&nbsp;` 不充数）。两条都在 `.tmp/rev-r49-probe4.mjs` 的 8a / 8b 号用例上实测通过。
   - **（R49-9 用例 9）** `repairHtml('讲转义：&amp;nbsp; 的写法\n\n甲&amp;nbsp;乙\n', '讲转义：&amp;nbsp; 的写法\n\n甲&nbsp;乙\n') === '讲转义：&amp;nbsp; 的写法\n\n甲&amp;nbsp;乙\n'`：讲转义（`&amp;nbsp;`）与真实体同文时**一个字节都不改**——第 1 行保住，第 2 行退回 F1 的已知限制（有意的保守方向；`name` 按出现、不按行序猜）。实测：`.tmp/rev-r49-probe4.mjs` 用例 9。
6. E2E（`.tmp/e2e-r49-impl-t1.mjs`，CDP 9222，假 FSA 复用 `.tmp/r30-fsa.mjs`）：沿用 finder 的 6 篇实体种子（`e1-nbsp` / `e2-more` / `e3-inline-code` / `e4-fence` / `e5-table` / `e6-line-nbsp`），**再加一篇 `e7-literal-amp.md`**（`'甲&nbsp;乙\n价格 &amp; 单位\n'`，R49-1 用例 7 的**正文形态**；加进 `seeds` 就自动进那个 `startsWith('e')` 循环，不用写新代码。**别用 URL 形状**：序列化器会把裸 URL 写成 `[url](url)`，`same` 会与 T1 无关地永远 false，见 R49-7 / `.tmp/critic-r49-e7.log`），断言：
   - `e1` `disk === '甲&nbsp;乙\n'`、`same:true`、`stable2:true`、开篇 `dirty:false`；
   - `e5`（表格）`same:true`，重开仍是 1 张表（`table 1`）、单元格文本 `a&nbsp;b`；
   - `e6`（整行 `&nbsp;` 空段落）`same:true`；
   - `e7`（正文里另有字面 `&amp;`，**不带 URL**）`same:true`、`stable2:true` —— **R49-1 的 P1 回归锁**：判据是 `disk === seed`；**改前的产品（今天）**在这篇上是 `same:false`（`disk` 第 1 行是 `&amp;nbsp;`），这一条绿才算 F1 真修完。实测今天盘上是 `甲&amp;nbsp;乙\n价格 &amp; 单位\n`，喂变体 → SAME（`.tmp/rev-r49-probe4.mjs` 用例 10）；
   - `e2` `disk === '甲&copy;&hellip;—乙\n'`（命名实体保住、数字实体按 §4 口径解码，**预期 `same:false`**，写清原因）；
   - `e3`/`e4`（行内代码 / 围栏）`same:true`（不回归）；
   - 全程 `[role="dialog"]` 计数 0（不弹「保存前确认」）；
   - **1 MB 文档、正文含 1,000 处 `&nbsp;`**（review §2 #2：1,000 × 6 B = 6 KB，不是 1 MB）一次 `Ctrl+S` 的耗时读数（记录，不作为卡线；与改前对比 ≤ 2×）。
7. CHANGELOG：`docs/CHANGELOG.md:5` 的标题由 `## Unreleased（第 29–44 轮，未发版）` 改为 `## Unreleased（第 29–49 轮，未发版）`（正文其实已含 45–48，ship F3 同一条），下面加 `**第 49 轮（同一未发版区间）**` 子段写 T1/T2/T3 三条 + 已知限制。**T1 的保真口径按 R49-1 + R49-9 写成**「按出现次数对照原文；同一文件里用 `&amp;<名>;` 讲转义时该名字保守保持、不改字节」（不是「原文出现过就不再还原」，也别写成逐字节保真）。
8. README 补半句已知限制（review §2 #1，`:43` 是对外保真承诺，不能只有 CHANGELOG 有）：在 `README.md:89`「行内 HTML 只保真不渲染」那条末尾加：`&#8212;` 这类**数字实体**在打开时会被解码成字符，重新保存字节会变（渲染不变，第 49 轮）。

### 验收标准（逐条可执行）

- `npx tsc --noEmit` → exit 0。
- `npm test` → `fail 0`，条数 = 414 + 本轮新增（T1 **+9 个 `test()`**：§步骤 5 的 6 条 + R49-1 的用例 7/8 + R49-9 的用例 9；T3 **+2 个 `test()`** ≈ **425**，以 `npm test` 输出为准，把实际条数写进 `impl.md`；tester 验收后按实测更新 README/AGENTS 的计数，review §2 #5）。
- `npm run roundtrip` → `rich 5/7、source 7/7`（`docs/roundtrip-report.md` 无 diff）。
- `npm run verify` → PASS，首屏 gzip ≤ **310,000 B**（记录具体字节与 `files=3`）。
- E2E 断言 §6 全绿，日志 `.tmp/r49-impl-t1.log`。
- 静态对照：`git diff --stat` 只含 `src/lib/html.ts`、`src/lib/html.test.ts`（+ 文档），无其它产品文件。

### 风险与回退

- `&amp;` 分支是所有含实体路径的公共出口。回归面 = `html.test.ts` 现有 24 条 + `serializeDocument.test.ts` ⑧ + 第 41 轮 20 条假 FSA 种子（`r7` 四空格缩进代码、`h12` 缩进围栏 + 裸 HTML 是**已知限制**，不算回归）。改完**先**跑 `npm test`，绿了再跑 E2E。**本修订已在只读变体上跑过**：既有 24/24（`.tmp/rev-r49-html4.test.ts`）+ 探针 18/18（`.tmp/rev-r49-probe4.mjs`，变体源码 `.tmp/rev-r49-probe4.ts`）；revision 2 的 24/24 + 16/16 与本修订同构，差异只有 mention 守卫。
- 别把 `&amp;nbsp;` 解成 U+00A0（那只是把语义再改一次）；别让 `&lt;`/`&gt;` 的既有守卫跟着变；`amp` 名必须排除在计数之外（`&amp;amp;` 是讲转义的文档）；**mention 也只按代码外计数、按名字隔离**（`&amp;copy;` 的 mention 不能挡住 `nbsp` 的解码，用例 14 实测）。
- 若 `npm test` 出现 `&amp;lt;` 相关红灯，说明新分支把「新文档打字面实体」那条路放行了：检查 `realCount` 是不是从 `source` 里取、`source === null` 时是不是空 Map，以及 `ahead === undefined` 那一支的旧守卫是否还在（那支是 `A &amp; B` / `&amp;lt` 的出口）。
- 若 `e1`/`e6`/`e7` 绿不了但 `disk` 里仍是 `&amp;nbsp;`：查 `mentionCount` 是不是把正文里的真实体也数进去了（`ENTITY_MENTION` 只该匹配 `&amp;<名>;`，`&nbsp;` 自身不匹配），以及两份计数是不是都挂在 `mapOutsideCode` 的代码外片段上。
- 计数要**多扫两遍** `source`（O(n)，只在文档含 `&amp;`/`&lt;`/`&gt;` 且 `source !== null` 时发生）：1 MB 文档的一次 `Ctrl+S` 计时（§步骤 6 最后一条，≤ 2×）就是这条的护栏。
- 回退：`git checkout -- src/lib/html.ts src/lib/html.test.ts`。

### 截图

无界面变化。E2E 只留 1 张：`shots/round-49/impl-t1-source-after.png`（保存后源码框里的 `甲&nbsp;乙`，与新脚本前缀 `impl-`，不覆盖 finder 的 `bug-f1-source-after.png`）。

---

## T2（P2，用户可见）高亮、代码块字号、Mermaid 错误色、点击区 24 px：4 条纯 CSS

### 为什么

ui 本轮量到的 3 条用户看得见的问题 + 1 条第 47 轮遗留的可访问性尺寸，都只动 `src/styles.css`，零 JS、零依赖、零懒加载影响：

| # | 现状实测 | 期望 |
| :--- | :--- | :--- |
| N3 `<mark>` | 底 `#ebf1ed`、行内代码底 `#e8f0ed`，两者 **1.01:1**；`<mark>` 对纸底 **1.04:1**（深 1.23:1）——第 47 轮刚能渲染，现在「高亮等于没生效」 | 与纸底、与代码底都肉眼可分 |
| N4 代码块字号 | `pre code` **12.72 px** < 行内 `code` **14.79 px** < 正文 **17 px**（`.doc-body pre{font-size:.86em}` 与 `.doc-body code{font-size:.87em}` 叠加） | 代码块字号不低于行内代码 |
| N1 Mermaid 错误提示 | 深色下 `#a45050` on `#1c1f23` = **3.03:1**（浅 5.38:1），低于 AA 4.5:1；写的是字面色，没走主题变量 | 深、浅都 ≥ 4.5:1 |
| 47-F9 点击区 | 查找条 7 个按钮、表格条 7 个按钮全高 **23 px**（WCAG 2.2 目标 24×24；第 47/48/49 轮连续记） | 两处按钮高 ≥ 24 px，且条不溢出 |

**ui N5（侧栏页签 hover 无反馈）本轮先复测、多半是误判，不要照它改 CSS**：`src/styles.css:137-140` 已有全局 `button:hover:not(:disabled) { background: var(--accent-wash); color: var(--accent-ink) }`，特异性 **0-2-1**，高于 `.sidebar-tabs button`（`:1438-1444`，0-1-1）；页签确实是 `<button>`（`App.tsx:4990-4998`），全局 hover 规则**本来就会生效**，且 ui 报告 §8 自己也证实同一条规则在顶栏/工具栏按钮上生效（`changed: true`）。最可能的解释是 finder 量 hover 时页面上还开着设置面板（模态遮罩吃掉指针）或读值早于 120 ms 过渡（`styles.css:134`）。复测方法：干净页面（无 dialog/遮罩）→ `hover()` 非当前页签 → **等 200 ms** → 读 `getComputedStyle`；若 `background` 变成 `--accent-wash` 的计算值（`rgb(232, 240, 237)` 浅色）则判「已生效」，把结论写进 `impl.md` 的 note。**不要改 `findings-ui.md`**（review §2 #4）：findings 是 finder 的证据，改它下一轮分不清是谁的读数。

### 改动文件 / 函数

只改 `src/styles.css`，5 处：

**先定取舍（R49-3）：为什么新建 `--mark-bg`，而不是照 `findings-ui.md:76` 用现成的 `--mark-wash`** —— 浅色 `--mark-wash` `#f7ecdc`（`:14`）与纸底 `#f6f4ee` 的 RGB 欧氏距离只有 **≈19.8**，按本节自己「≥40」的验收会当场红；而且 `--mark-wash` 是批注卡「修订」标记的底色（`.note-kind-revision`，`:1044`）与 `.risk-banner`（`:1805`）在用，复用它会让 `<mark>` 高亮与「修订」标识同色。所以新建只给 `<mark>` 用的 `--mark-bg`（执行者别按 finding 改回 `--mark-wash`，会白花时间对付假红）。

1. **加 token `--mark-bg`（四处主题块都要加，漏一处就有一档主题读不到）**：
   - 浅色 `:root`（`:1-33`）：`--mark-bg: #f0e0bd;`
   - 手动深色 `html[data-theme='dark']`（`:36-62`）：`--mark-bg: #453618;`
   - 跟随系统深色 `@media (prefers-color-scheme: dark)`（`:65-93`）：`--mark-bg: #453618;`
   - 打印 `@media print` 的主题块（`:2012-2036`）：`--mark-bg: #f0e0bd;`（打印强制浅底）
   - 允许在执行时微调这两个色值，但必须满足下面的验收数值（距离阈值优先于具体色值）。
2. `.doc-body mark`（`:660-665`）：`background: color-mix(...)` → `background: var(--mark-bg)`，`color: inherit` 与 `padding` 保留。
3. `.doc-body pre`（`:633-641`）`font-size: 0.86em` → **`0.9em`**；`.doc-body pre code`（`:643-646`）加 **`font-size: inherit`**（得到 ≈15.3 px > 行内 14.79 px）。
4. `.find-bar button`（`:1895-1898`）与 `.table-bar button`（`:1948-1952`）加 `min-height: 24px`（纯尺寸，不改配色）；**只加 `min-height`**，别改 `padding`（会改条子高度并可能换行）。
5. `.mermaid-preview.is-error`（`:708-711`）：`color: var(--danger); border-color: color-mix(in srgb, var(--danger) 55%, var(--line));`（浅色 `#b4453a` on `#fffdf8` ≈ 5.3:1，深色 `#e8917f` on `#1c1f23` ≈ 6.9:1；不再写字面色）。

**不要**动 `--mark` / `--mark-wash` / `--mark-strong`、不要动 `.doc-body kbd`、不要碰 Mermaid 的 JS 与懒加载（本任务只改错误提示的 CSS）。这三个 token 的实际使用点（本修订核过，别照原稿的笼统说法判断）：`--mark-wash` 全文件只有两处 —— `.note-kind-revision`（`:1044`）与 `.risk-banner`（`:1805`）；`.find-hit`（`:1908-1914`）用的是 `--mark` 系（22% / 48% 的 `color-mix`），**不是** `--mark-wash`。

### 实施步骤

1. 复制 `.tmp/e2e-r49-ui-c.mjs` 成 `.tmp/e2e-r49-impl-t2.mjs`（**不要原地跑 finder 脚本**，它会覆盖 `shots/round-49/r49-ui-*.png`）。注意该脚本用的是 **`SHOTS` 常量**（`:173`、`:203`、`:229`），不是 `OUT`；把这三处截图名改成 `impl-t2-*`。配色帮助函数在文件末尾的 `HELPERS_SRC()`（`:235-250`：`parseColor` / `lum` / `blend` / `bgOf` / `ratio` / `contrast` / `r`，挂在 `window.__h` 上），照它的注入方式（`page.addInitScript`）复用，别自己重写一套口径。
2. 脚本播种一篇含 `<mark>高亮</mark>`、`` `行内代码` ``、代码块、非法 mermaid 围栏的文档（假 FSA + 文件载入，`<mark>` 只有从文件载入才渲染，见 typora F1）；跑浅色与深色（`data-theme=dark`）两遍，打印每项的 `backgroundColor` / `color` / `fontSize` / 计算对比度 / RGB 距离。
3. 改 5 处 CSS；重跑脚本；按 §验收 的数值核对；把改前（finder 读数）与改后并列写进 `impl.md`。
4. **ui N5 复测（不改代码）**：新开一页（先 `Esc` 关掉任何 dialog、确认 `.settings-backdrop`/`[role="dialog"]` 计数为 0），`hover()` 非当前页签 → 等 200 ms → 读计算值。把「已生效 / 仍不生效」与读数写进 `impl.md`；若确实仍不生效，才补 `.sidebar-tabs button:hover`（放 `.is-active` 之前）并写进报告。
5. 截图 6 张（见下）。**时间到 28 min 还没改完 CSS 时砍到 3 张**：`impl-t2-mark-light.png`、`impl-t2-mark-dark.png`、`impl-t2-targets.png`，其余三项的数值仍要写进 `impl.md`（review §2 #2）。
6. CHANGELOG 加 T2 一行。

### 验收标准（E2E 断言，脚本原样打印数值）

浅色与深色各一遍（数值取 `getComputedStyle` 的 `backgroundColor`，必须是纯 `rgb(...)`，不要再引入 `color-mix` 算 `mark` 底）：

- `mark` 底 与 行内 `code` 底的 **RGB 欧氏距离** ≥ **40**（浅）/ ≥ **30**（深）；`mark` 底 与 `--paper` 的距离 ≥ **40**（浅）/ ≥ **30**（深）。改前参考：浅色 3.2 / 11.4，深色 mark 与容器底 1.03:1。
  - 用距离而不用 WCAG 亮度比：黄底高亮与米纸的亮度本来就接近，亮度比量不出「看不出来」这件事；文字可读性另用对比度卡（下一条）。
- `mark` 内文字对其底的对比度 ≥ **4.5:1**（深浅各一遍；新底色更暗，必须复算）。
- `pre code` 计算字号 ≥ 行内 `code` 字号（容差 0.1 px）且 < 正文 `p` 的 17 px。**代码块横向滚动是设计**（`.doc-body pre` 本来就有 `overflow-x: auto`，`src/styles.css:633-641`），所以**不要**断言 `pre` 无溢出（任何一行长代码都会假红，执行者可能因此把字号改回去、T2 白做）。改成三条（R49-2）：
  - (a) `getComputedStyle(pre).overflowX === 'auto'`（字号变大后功能不许丢）；
  - (b) 页面级无横向滚动条：`document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`（1440 / 1024 两档都量）；
  - (c) **固定短行种子**（每行 ≤ 60 字符）在 1440 / 1024 两档 `pre.scrollWidth === pre.clientWidth`；另用一条长行种子（单行 ≥ 120 字符）**只记录** `pre.scrollWidth` / `pre.clientWidth`（写进 `impl.md` 的改前/改后对照，不卡线）。
- 查找条 7 个按钮、表格条 7 个按钮的 `getBoundingClientRect().height` **全部 ≥ 24**（改前 23），**`.width` 也全部 ≥ 24**（WCAG 2.2 目标是 24×24；实测最窄 25 px：critic 记的查找条宽度 33/33/25/25/29/43/66，材料在 `.tmp/r49-ui-c-log.txt`）；两处条子仍不换行/不溢出（`scrollWidth <= clientWidth + 1`）。**宽度读数照实打印，不当死卡线**：余量只有 1 px，若某一档实测 < 24 就只记录并写进 `impl.md`，别为这 1 px 去改 `padding` 或字号（review §2 #4）。
- 侧栏页签 hover **只复测不改**：干净页面（无 dialog）、`hover()` 后等 200 ms，非当前页签 `background-color` 应变为 `rgb(232, 240, 237)`（浅色 `--accent-wash`）、`color` 变 `rgb(35, 84, 77)`（`--accent-ink`），当前页签 hover 后仍是 `--paper-raised`。读数照实写进 `impl.md`：**若已生效，本条不产生 CSS 改动**，并说明 finder 的 `changed:false` 为何不成立（遮罩/过渡时机）。
- `.mermaid-preview.is-error` 文字对其背景对比度 ≥ **4.5:1**（浅、深；改前 5.38 / 3.03）。
- `npx tsc --noEmit` exit 0；`npm test` 不回归（CSS 不新增测试）；`npm run verify` PASS，首屏 gzip ≤ 310,000 B（记录增量）。

### 风险与回退

- `--mark-bg` 只加两处（漏 `@media print` 或漏「跟随系统深色」）→ 打印/系统深色下高亮变成暗棕底压深字。**四个块逐个核对**：`Select-String -Path src/styles.css -Pattern 'mark-bg'` 应为 **5 行**（4 处声明 + `.doc-body mark` 里 1 处使用）。
- `min-height: 24px` 若改用 `padding` 撑高，查找条/表格条可能换行或挤掉右侧按钮——只用 `min-height`，并按验收看 `scrollWidth`。
- `pre` 默认**不换行、横向滚动**（`overflow-x: auto`），不是「字号变大后长代码行更早折行」（原稿这句不成立，R49-2）：字号变大只让长行的可滚动范围变大。两档视口都记 `preScroll`（`scrollWidth` / `clientWidth`），别只量一处；**别为了「无溢出」把字号改回去**（那样 N4 白做，回退判定也是错的方向）。
- 回退：`git checkout -- src/styles.css`。

### 截图（`shots/round-49/`，全部 `impl-t2-*` 前缀）

`impl-t2-mark-light.png`（`<mark>` 与行内代码同屏）、`impl-t2-mark-dark.png`、`impl-t2-code-font.png`（代码块与行内代码同屏）、`impl-t2-targets.png`（查找条 7 按钮，可见高度）、`impl-t2-mermaid-err-dark.png`、`impl-t2-tab-hover.png`（复测用，若判定已生效也留一张作证据）。

---

## T3（P2，用户可见）中文上下文里 `--` 出 `——`

### 为什么

typora F3：现在打 `--` 只得到**一个** `—`（半个中文破折号），要打 `----` 才凑出 `——`，没人猜得到。中文写作里破折号是常规标点（占两个汉字位，ui N6 也量到 `—` 字宽 15.13 px、两个才 30.26 px < 34 px）。这条第 41/42/43 轮连续记过（P2，`smartTyping.ts:87`），本轮做最小档：**光标紧邻处有汉字（前一个字符是汉字，或后一个字符是汉字）时产出 `——`，否则仍是一个 `—`**。口径为什么不放「前后 4 字」：第 47 轮已把「普通段落 `甲 -- 乙` 仍是 `甲 — 乙`」写进文档（`docs/iteration/round-47/plan.md:137`、`test.md:55`、`impl.md:105`、`docs/CHANGELOG.md:194`）；4 字口径在打第二根 `-` 时 `before` 是 `甲 -`（`smartTyping.ts:131` 取光标前 ≤4 字），`CJK.test('甲 -')` 为真 → 上屏 `甲 —— 乙`，与那四处直接冲突（R49-8；逐键模拟见 §10.1）。

### 改动文件 / 函数

- `src/lib/smartTyping.ts:87`（`inserted === '-' && last === '-'` 分支）：先算 `const cjk = CJK.test(before.slice(-2, -1)) || CJK.test(next)`（`next` 就是既有 `:63` 的 `after.slice(0, 1)`），`text: cjk ? '——' : '—'`。**`slice(-2, -1)` 取的是「第一根 `-` 之前那一个字符」**：进这个分支时 `last === '-'`，`before` 末位就是第一根 `-`；`before` 整体只有 ≤4 字（`:131`），不能拿它整体去测。`replace` 的 `from: -1, to: 0` 与插件里「光标落 `text.length` 之后」的既有逻辑不用改（`from-1+2` 正好在两个破折号之后）。
- **不要**改全局 `CJK`（`:23`）：它还被「中文后半角标点变全角」用，加标点类会连带改那条行为。
- `src/lib/smartTyping.test.ts` +2 个 `test()`（6 条断言）；`README.md:41`、`README.md:92`、`docs/typora-gap.md:28` 各一行；CHANGELOG 一行。

### 实施步骤

1. 改 `smartTyping.ts` 一行代码 + 一行注释（写清「紧邻汉字才出 `——`；空段落仍是一个 `—`，为保住 `---` + 空格出分隔线」）。
2. 单测：
   - `smartInput('中文-', '-', '')` → `{ kind: 'replace', from: -1, to: 0, text: '——' }`
   - `smartInput('甲-', '-', '乙')` → `'——'`（紧邻的后一个字是汉字也算中文上下文）
   - `smartInput('——', '-', '')` → `null`（第三根不连吞，回归）
   - `smartInput('word-', '-', '')` → `'—'`（英文回归）；`smartInput('| 中文-', '-', '', '| 中文-')` → `null`（表格行守卫仍在前）
   - `smartInput('甲 -', '-', '')` → `'—'`（**R49-8 的锁**：真编辑器里打 `甲 -- 乙` 第二根 `-` 时 `before` 就是 `甲 -`，空格隔开不算中文上下文；锁住第 47 轮的 `甲 -- 乙 → 甲 — 乙`，所以 `round-47` 的三份报告与 `CHANGELOG.md:194` 都不用改）
   - 既有 15 条**一条都不改**（`smartTyping.test.ts:33-40`、`:82-90`、`:103-114` 全部仍绿）。新增共 2 个 `test()`（6 个断言）。**已在本修订的变体上跑过**：既有 15/15（`.tmp/rev-r49-smart3.test.ts`）+ 新增 2/2（`.tmp/rev-r49-smart3-new.test.ts`）。
3. E2E（`.tmp/e2e-r49-impl-t3.mjs`，复用 `.tmp/e2e-r49-typora-a.mjs` 的打字段，`OUT` 前缀改 `impl-t3-`）：
   - 空段落打 `---` + 空格 → `hr:1`（**回归，必须绿**：Tiptap 的 HR 规则正则含 `—-` 兼容分支，空段落没有汉字所以仍产出 `—`）；`***` + 空格 → `hr:1`；
   - 在已有汉字的段落末尾打 `--中文` → 编辑视图 `中文——中文`、`Ctrl+/` 源码同、`Ctrl+S` 后盘上同（无 `----`、无 `—中文` 半截）；
   - `word--word` → `word—word`；`甲 -- 乙` → `甲 — 乙`（第 47 轮口径回归；**R49-8 已实测**：紧邻口径下这条与实现一致，不要在断言里改成 `甲 —— 乙`）；
   - 代码围栏里 `a--b` 原样；手打 `| --- | --- |` 原样（第 38 轮守卫回归）。
4. 文档同步（三处，各一句）：
   - `README.md:41`：`--` 变 `—` 后面补「（紧邻汉字时出 `——`）」；
   - `README.md:92`：把「空段落开头连打 `---` 会出分隔线，要打 `——` 先在前面打一个字」改成与实现一致的写法：空段落（或首尾没有紧邻汉字）打 `--` 仍是一个 `—`，这是为保住 `---` + 空格出分隔线；中文句子里（紧邻汉字）打 `--` 直接得 `——`，`甲 -- 乙` 这类用空格隔开的仍是 `甲 — 乙`；
   - `docs/typora-gap.md:28`：`--` 转破折号 → `--` 转破折号（紧邻汉字时出 `——`）。
   CHANGELOG 的 T3 行写清「紧邻汉字时 `--` 出 `——`；用空格隔开的 `甲 -- 乙` 仍是一个 `—`（第 47 轮口径）」，别照 revision 2 的「前后 4 字」写（第 47 轮四处文档因此都不用改）。

### 验收标准

- 单测 2 条新 `test()`（6 个断言）绿、既有 15 条不红（`npm test` 全绿）。
- E2E 断言全绿（日志 `.tmp/r49-impl-t3.log`）。
- `node scripts/keyboard-acceptance.mjs` → **52/52**；**放在最后跑**（它结尾会 `browser.close()` 断掉 CDP 连接，AGENTS §8），跑完立刻 `git checkout -- shots/round-05/`（该脚本会覆盖已跟踪的历史截图）。
- `npx tsc --noEmit` exit 0；`npm run verify` PASS（首屏 ≤ 310,000 B）。
- `git diff` 只含 `src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts`、`README.md`、`docs/typora-gap.md`、`docs/CHANGELOG.md`。

### 风险与回退

- HR 依赖 `—-`（`@tiptap/extension-horizontal-rule/dist/index.js:62` 的 `/^(?:---|—-|___\s|\*\*\*\s)$/`）。只有「光标紧邻处有汉字」才出 `——`；空/纯 ASCII 段落仍产出 `—`（`---` + 空格 → `—-` → HR，实测新旧口径在这条上 SAME，`.tmp/rev-r49-typing4.mjs`），E2E 的 `hr:1` 就是这条的锁。
- `|` 行守卫（`:85`）必须在新分支之前（既有顺序，不动）。
- 已知不做（写进 CHANGELOG 限制）：`a---b` → `a—-b` 的残 hyphen（第 41/42 轮的旧账）本轮不动；空段落起始的 `——` 仍需先紧邻汉字（README 已改准）；**`，--` 这类全角标点紧邻的 `--` 仍是一个 `—`**（`CJK` 只认汉字/假名/谚文，`src/lib/smartTyping.ts:23`）——要覆盖就把判据改成「非 ASCII」，属下一轮的取舍，本轮不扩。
- 回退：`git checkout -- src/lib/smartTyping.ts src/lib/smartTyping.test.ts README.md docs/typora-gap.md`。

### 截图

`shots/round-49/impl-t3-em-dash.png`（编辑视图里 `中文——中文`，源码框与正文对照）。

---

## 5. 本轮不做（顺延清单与理由，下一轮开工按此排序）

1. **code F3（P1）「全部替换」1 MB 冻结 51.8 s**：第 48 轮 F1 复核仍未修，代码没动（`App.tsx:1859-1872` 的 `Transform` 逐条 `insertText/delete`，O(n²)）。它需要**先按 `view.dispatch` 拆段计时**（第 48 轮 §6.3 的脚本坑：`button.click()` 的返回耗时会放大），再决定「预构建 `ReplaceStep`」还是「按段落合并」；本轮三个任务已占满，单开一轮做（下一轮第一项）。
2. **STATE 第 48 轮 ① 表格单元格里手打 `# ` / `> ` / `- ` 与粘贴带标题的 Markdown 仍造块级节点**（数据完整性问题）：需要先写三条探针（手打、粘贴、`Ctrl+Z`），再在 `editorProps.filterTransaction` 与 `editorProps.handleTextInput` 二选一，单独一轮做（下一轮第二项）。**未在本轮派，是因为本轮 T1 是新的 P1 数据安全，且两者都在保存/输入路径上，同一代理同一轮做会互相干扰回归判断**。
3. **typora F2（P1 缺口）`Ctrl+滚轮` 无反应 / 无全屏入口**：最小档 30 行，但要先定「只缩正文（复用 `setFontSize` + 一句 toast）」还是「整页 `--ui-scale` + `zoom`」；WebView2 下 `zoom` 未验，留一轮。
4. **typora F1 行内 HTML 打字不渲染**：输入规则 40–60 行 + 三条排除（代码块/行内代码/组合输入）+ 字节不变回归；与 T3 同属输入路径，分开做。
5. **code F1/F2（源码态逐键随文档线性上涨、一次停笔写 4 份全文）**：性能批次（优先 F1 的 `countText` memo + 与编辑态同拍防抖，可与 **F4 的 KaTeX 移进 html 分支**、源码段数共用一次计数合并成一轮）。**标签订正（review §2 #3）**：`findings-code.md:110` 的 F3 是「全部替换 1 MB 冻结」，KaTeX 那件事是 **F4**（`findings-code.md:119`），别把两件事混成一个「性能批次」。
6. **bug F2 大纲折叠不跨文档**：会话内 `Map<docKey, Set<level>>`，20 行左右，可与文档批次同轮。
7. **UI 第二批**：ui N2（Mermaid 配色跟站点色板，要先做 `themeVariables` 实验并复测懒 chunk 体积）、N6（破折号字宽，字体层未做 fallback 实验）、N7（中西文间距 `text-autospace`）；48-F1（深色表格线/分隔线，本轮 ui 的 1.00:1 读数与 CSS 里 `--line` `#2a2e33` vs 表头底 `#22302e` 对不上，**下轮先重量再改**）、48-F2（≤1119 px 正文反而变宽）、48-F3（查找条占文档流）、48-F4（占位符字体字号）、48-F5（表格条浮层化，单独一轮）、47-F2/F3/F10。ui N5（页签 hover）本轮 T2 已复测，结论只写 `impl.md`（**不改 finder 的报告**）。**48-F4（= STATE `:65` 的 ②）本轮不做，理由（R49-4）**：它是 3 行 CSS + 1 条计算样式断言，排在 T2 后面大约 2 分钟，但 T2 已有 4 条 CSS + 6 张截图 + ui N5 复测，按 35 min 硬上限再塞第 5 条会把「28 min 砍 T3」的余量吃光；下一轮第一项做（同一文件、同一批 E2E，成本不变）。
8. **发布 / 文档批次**：ship F1（exe 元数据五项）、F2（`release/` 中的旧 `SHA256SUMS.txt` 与当版 setup 不一致；本轮不动 `release/`）、F4（EstimatedSize 少算约 90 KB）、F5（3 条 C# 警告）、typora F6（两份 Typora 文档过期 + 「缺的」计数 9 → 13）、AGENTS/README 的测试计数（**由 tester 验收时按 `npm test` 实测写**，执行者不要预先填数）。
9. **typora F4 / F5（R49-4 补两条，原稿 0 命中会真的消失）**：
   - **typora F4（P2，体验）表格列宽把手不可发现，也没有「恢复默认列宽」**（`findings-typora.md:85-96`）：把手是 widget，只在 `activeHandle > -1` 时进 DOM（`src/styles.css:735-744`），鼠标要进到列边界 5 px 内才出现；列宽还不写进 Markdown。**不做的最小理由**：要先定设计方案（常显细线 / 表头 `th:hover` 提示 / 工具条加一行说明）＋「恢复列宽」要一次事务并能撤销，属于「先定方案再动手」，一轮做不完三个任务里的任何一个的一半。
   - **typora F5（P2，缺口）图片落盘规则固定 `assets/` + base36 前缀，设置里没有选项**（`findings-typora.md:98-106`）：要加 `imageFolder` / `keepImageName` 两个**用户可见选项**（设置面板现在 6 个字段，实测见 `findings-typora.md:102`）。按 AGENTS §1 这属于「加一个用户看得见的能力」，要产品负责人点头才能排，不放进技术批次。
10. **本轮明确不做**：不发版、不 bump `package.json`、不新增运行时依赖、不动 `release/`、不 commit/push（tester 验收 PASS 后提交）、不重启 dev server、不改 `host/` 与 `host-mac/`。

## 6. 公共交付物与纪律

- 执行者写 `docs/iteration/round-49/impl.md`：任务状态表、每条的改前/改后读数、计划偏差（有就写）、UNVERIFIED。**不要**改 `docs/iteration/STATE.md`（根代理更新），**不要**改其它轮次目录。
- 截图一律 `shots/round-49/impl-*.png`；**不要**覆盖 finder 已有的 `bug-*`、`code-*`、`r49-*`、`r49-ui-*`、`ship-*` 截图。
- 自写 E2E 放 `.tmp/e2e-r49-impl-*.mjs`，连接方式抄 `scripts/acceptance.mjs` 的 `chromium.connectOverCDP('http://127.0.0.1:9222')`；结尾 `page.close()` 后 `process.exit(0)`。脚本含中文用 `write`/`edit` 工具写，**不要**用 PowerShell 字符串替换（AGENTS §8 会读成 ANSI 变乱码）。
- 每段 E2E 前 `node .tmp/reset.mjs 9222`；控制台 0 error 写进 `impl.md`（`/__doc` 的 404 是浏览器态无宿主，判非缺陷）。
- 若页面白屏且控制台报「模块没有导出」：记录现象并报根代理，**本轮约束是不重启 dev server**。

## 7. 时间预算与砍任务顺序

| 项 | 分钟 |
| :--- | ---: |
| T1（含复跑 finder 脚本、单测、E2E） | 15 |
| T2（CSS + 配色/尺寸 E2E + 6 张截图） | 8 |
| T3（一行 + 单测 + E2E + 三处文档） | 6 |
| 门禁（tsc / test / roundtrip / verify / keyboard）与 `impl.md` | 6 |
| **合计** | **35** |

- 28 min 时 T1 仍不绿：只交 T1（含门禁），T2/T3 顺延，`impl.md` 写清卡在哪一步。
- T1 绿、时间紧：砍 T3（一行代码，下一轮 5 分钟可补）；T2 尽量保（纯 CSS，用户可见）。
- T2 的截图超时：砍到 3 张（`impl-t2-mark-light` / `impl-t2-mark-dark` / `impl-t2-targets`），数值照旧写 `impl.md`（见 T2 §实施步骤 5）。T1 的 E2E 别为了赶时间只跑 `e1`：`e5`（表格）与 `e7`（正文里另有字面 `&amp;` 的形态、**不带 URL**，R49-7 后的 P1 回归锁）是 P1 的判据，必须跑。

## 8. 本轮预计 UNVERIFIED（写进 `impl.md` / 测试报告）

1. 真实宿主 WebView2 里的实体往返（本轮全在浏览器态 CDP 9222 + 假 FSA）。
2. 真实磁盘/网络盘/OneDrive 写回的字节（同上，假 FSA 只存字符串）。
3. 系统级深色（`prefers-color-scheme: dark`）下 `--mark-bg` 的观感：只能读计算值，无法切真实系统主题。
4. 真实彩色打印/另存 PDF 里 `<mark>` 的新底色（`@media print` 只读计算值）。
5. 真实中文输入法下 `--` 的产出（无 IME 自动化；`view.composing` 放行路径本轮未按）。
6. 深色下对比度的真实感知（数值达标 ≠ 目视达标，截图给 reviewer 看）。
7. **R49-1 + R49-9 的计数口径只在 Node 探针上验证过**（`.tmp/rev-r49-probe4.ts`，18/18 + 既有 24/24），没在真实应用的保存链跑过：`mapOutsideCode(source, …)` 的两份计数分支由执行者的 E2E（`e1`/`e5`/`e6`/`e7`）与 `npm test` 覆盖。真实宿主 WebView2 下的同一路径仍属第 1 条 UNVERIFIED。
8. **R49-8 的「紧邻」口径只在 Node 里逐键模拟过**（`.tmp/rev-r49-typing4.mjs` 的 7 条路径 + 既有/新增单测），没在真编辑器里打键：`before` 的真实取值（`:131` 的 `textBetween`）与选区/组合输入下的路径由 T3 的 E2E 覆盖；真实中文输入法仍属第 5 条 UNVERIFIED。

## 9. 修订对照（revision 2 对 `plan-review.md` 的 6 条）

| 编号 | 级别 | 落点（本文件） | 本修订怎么改 | 核对（本轮实查） |
| --- | --- | --- | --- | --- |
| **R49-1** | P1 | T1 §实施步骤 2/3、§步骤 5（+2 条）、§步骤 6（+`e7`）、§验收、§风险 | 「原文整篇出现过」→「**按出现次数**」；旧守卫 `source.includes(whole)` 收窄到 `ahead === undefined` 一支；计数走 `mapOutsideCode(source, …)` 只数代码外；`amp` 名不参与计数；补单测用例 7/8 + E2E 种子 `e7` | 变体 `.tmp/rev-r49-probe3.ts`：16/16 用例 OK（含 critic 用例 7/8）；`.tmp/rev-r49-html3.test.ts` 既有 **24/24** 绿 |
| **R49-2** | P2 | T2 §验收第 3 条（拆 a/b/c）、§风险第 3 条 | 删掉「`pre` 无横向溢出」的假红断言，改成 `overflow-x: auto` 仍在 + 页面级无横向滚动 + 短行种子两档 `scrollWidth === clientWidth`；长行只记录；风险句改「滚动」 | `src/styles.css:633-641` 实读：`.doc-body pre { overflow-x: auto; font-size: 0.86em }` |
| **R49-3** | P2 | T2 §改动文件（新增「先定取舍」段）、§不要动 | 写明为什么新建 `--mark-bg` 而不用 `--mark-wash`（距离 ≈19.8 < 40、与批注卡修订色撞色）；纠正 `--mark-wash` 的使用点 | `Select-String`/grep：`--mark-wash` 只在 `:1044`（`.note-kind-revision`）与 `:1805`（`.risk-banner`）；`.find-hit` `:1908-1914` 用 `--mark`；`#f7ecdc` vs `#f6f4ee` 的 RGB 距离 = **19.72** |
| **R49-4** | P2 | §5 第 7 条（48-F4 理由）、新增第 9 条（typora F4/F5） | 补「本轮不做 48-F4 的原因」；把 typora F4/F5 写进顺延清单（各自带不做/不派的最小理由） | `findings-typora.md:85-96`（F4 把手）、`:98-106`（F5 落盘规则/设置）；`STATE.md:65` ② = 48-F4 占位符 |
| **R49-5** | P2 | T1 §步骤 5 标题、§验收第 2 条 | `+7 → +8`（6 条 + 用例 7/8），总条数 **414 + 8 + 2 = 424** | `html.test.ts` 实测 **24** 个 `test(`；`smartTyping.test.ts` **15** 个；414 + 10 = 424 |
| **R49-6** | P2 | T1 §步骤 1、T2 §步骤 1 | 把「复制 finder 脚本」改成具体编辑：删 `b3`/`b4` 两段、`OUT` 保持目录、截图名 `impl-t1-*`、`textInfo` 加 `table` 计数、源码截图步骤；T2 改 `SHOTS` 与 `HELPERS_SRC()` | 实读 `.tmp/e2e-r49-ent.mjs`：`OUT` 在 `:5`；b4 段 `:85-111`、b3 段 `:113-136`；finder 截图 `:95/:108/:126/:133`；`textInfo` `:52-57`。实读 `.tmp/e2e-r49-ui-c.mjs`：`SHOTS` 在 `:173/:203/:229`；`HELPERS_SRC()` `:235-250` |
| review §2 #1/#2/#3/#4/#6 | — | T1 §步骤 8（新增）、T2 §步骤 5、§5 第 5 条、T2 §为什么、T2 §验收第 4 条 | README 补数字实体半句；T2 截图砍到 3 张的规则；`F3 的 KaTeX` 标签改成 F4；不改 finder 报告；点击区宽度也断言 | `README.md:43`（对外保真承诺）、`:89`（限制条）；`findings-code.md:110`（F3）/`:119`（F4） |

**review §2 #5（`roles/planner.md` 仍写 286,000 B）本修订不动**：角色文件不是产品文档，按 review 的建议单独修一次；本计划的体积口径仍按 `common.md:6` 的 **310,000（内部）/ 320,000（硬线）**。

> **revision 3 之后的数字与形状**（本表是 revision 2 的历史记录，不逐格改写）：T1 由 **+8** 变 **+9**（R49-9 的用例 9）、总数 **414 + 9 + 2 = 425**；E2E 种子 `e7` 换成正文形态 `'甲&nbsp;乙\n价格 &amp; 单位\n'`（R49-7）；T3 口径由「前后 4 字」变「紧邻」（R49-8）。逐条见 §10。

### 9.1 本修订实跑的东西（只读，未改产品代码）

- `.tmp/rev-r49-probe3.ts`（`repairHtml` 的「按次数 + 只数代码外」变体）+ `.tmp/rev-r49-probe3.mjs`（16 条用例）→ **16/16 OK**，包括：计划 6 条、critic 用例 7/8、围栏 / 行内代码计数边界 2 条、混排「3 处只解 2 处」、表格种子、`&amp;amp;`、既有 `&amp;lt;` 与 `A &amp; B`、e2 对照。
- `.tmp/rev-r49-html3.test.ts`（critic 的 24 条原测抄一份，只改 import）→ `tests 24 / pass 24 / fail 0`。
- **沙箱坑（给执行者）**：`node --test <file>` 在本沙箱会 `spawn EPERM`（命名管道被拒），要跑单测就用 `node <file>`（`node:test` 在进程内跑），或用 `npm test`。
- 没跑：`npm test` / `npm run build` / `npm run verify` / E2E / CDP 9222 / 任何浏览器。本修订不产生产品代码改动。

### 9.2 任务量复核（角色要求）

仍是 T1 15 + T2 8 + T3 6 + 门禁 6 = **35 min**。R49-1 净增约 8 行代码 + 2 条单测 + 1 篇 E2E 种子（种子自动进既有循环，不加步骤）；R49-2/R49-3/R49-6 是断言与指令文字，不增时间；review §2 #2 的「截图砍到 3 张」写成 §7 的砍单规则。**没有新增任务，没有改任务边界，没有扩大范围。**

## 10. 修订对照（revision 3 对 `plan-review.md` 复审的 2×P1 + 1×P2）

| 编号 | 级别 | 落点（本文件） | 本修订怎么改 | 核对（本修订实查/实跑） |
| --- | --- | --- | --- | --- |
| **R49-7** | P1 | T1 §步骤 6（种子 + 断言 + 1 MB 口径）、§步骤 5 用例 7（保持）、§7 第 3 条、§9 注 | `e7-literal-amp.md` 种子 `'甲&nbsp;乙\n链接 https://x/?a=1&amp;b=2\n'` → `'甲&nbsp;乙\n价格 &amp; 单位\n'`（**正文形态，不带 URL**）；断言仍是 `same:true`、`stable2:true`，并写明判据是 `disk === seed`；字符串级用例 7 **原样保留** | critic 实测（`.tmp/critic-r49-e7.log`）：URL 形态今天盘上是 `甲&amp;nbsp;乙\n链接 [url](url)\n`（归一化，与 T1 无关）；正文形态今天盘上 `甲&amp;nbsp;乙\n价格 &amp; 单位\n`，喂变体 → **SAME**（`.tmp/rev-r49-probe4.mjs` 用例 10） |
| **R49-8** | P1 | T3 §为什么、§改动文件、§步骤 2（+1 条断言）、§步骤 3、§步骤 4（README:41/92、typora-gap:28）、§风险 | 口径「前后 4 字内有汉字」→「**紧邻**汉字」：`CJK.test(before.slice(-2, -1)) || CJK.test(next)`；同步三处文档写法；`甲 -- 乙 → 甲 — 乙` 断言保留（现在与实现一致，不必推翻第 47 轮） | 逐键模拟（`.tmp/rev-r49-typing4.mjs`）：旧口径 `甲 —— 乙`、新口径 `甲 — 乙`；`中文--中文` 两口径都 `中文——`、`word--word` 都 `word—`、空段落 `---`+空格 都 `—-`（HR 仍成立）；既有 15 条 **15/15**（`.tmp/rev-r49-smart3.test.ts`）+ 新增 2 条 **2/2**（`.tmp/rev-r49-smart3-new.test.ts`） |
| **R49-9** | P2 | T1 §步骤 2（mention 计数）、§步骤 3（代码 + 语义第 6 条）、§步骤 4（已知限制）、§步骤 5（用例 9）、§验收、§风险 | 计数法再数一份 `mentionCount`（`&amp;<名>;`），解码端 `!mentioned && got < want`；新增 1 条单测（m2 字节不变）；总条数 **414 + 9 + 2 = 425**；m1 的保守退回写成已知限制 | 变体 **18/18**（`.tmp/rev-r49-probe4.mjs`，含 m2 / m1 / 围栏与行内代码里的 mention 不计数 / mention 按名字隔离 / `&amp;amp;`）+ 既有 24 条 **24/24**（`.tmp/rev-r49-html4.test.ts`） |
| review §2 #1/#2/#4/#5 | — | T1 §改动文件（`App.tsx:925-926` 是草稿派生）、§步骤 6 末条（1 MB 口径）、T2 §验收第 4 条（宽度读数不当死卡线）、T1 §验收第 2 条（425） | 措辞与口径小修，不改指令、不增任务 | `src/App.tsx:920-932` 实读：300 ms `deriveTimerRef` 草稿派生，不是保存链；保存出口是 `src/lib/serializeDocument.ts:54-55` |

**review §2 #3（`findings-ui.md:145` 的 `pre-wrap` 误读）**：本计划 T2 §风险已按「`pre` 不换行、横向滚动」写，执行者别按 finder 那句把验收 (c) 改成「预期待换行」；**不改 `findings-ui.md`**（finders 的证据不回头改）。

### 10.1 本修订实跑的东西（只读，未改产品代码）

- `.tmp/rev-r49-probe4.ts`（`repairHtml` 的「按次数 + 只数代码外 + mention 保守」变体）+ `.tmp/rev-r49-probe4.mjs`（18 条用例）→ **18/18 OK**：计划 6 条、R49-1 用例 7/8、R49-9 的 m2、e7 正文种子、m1 保守退回、围栏/行内代码里的 mention 不计数、mention 按名字隔离、`&amp;amp;`、`&amp;lt;` 与 `A &amp; B`、e2 对照。
- `.tmp/rev-r49-html4.test.ts`（既有 24 条原测，只换 import）→ `tests 24 / pass 24 / fail 0`。
- `.tmp/rev-r49-smart3.ts`（紧邻口径变体，`.tmp/rev-r49-make-variants.mjs` 生成）+ `.tmp/rev-r49-smart3.test.ts`（既有 15 条，只换 import）→ **15/15**；`.tmp/rev-r49-smart3-new.test.ts`（新增 2 条 / 6 断言）→ **2/2**。
- `.tmp/rev-r49-smart3-old.ts`（revision 2 的 4 字口径，仅作对照）+ `.tmp/rev-r49-typing4.mjs`（逐键模拟 7 条路径）→ 见上表 R49-8 行。
- `grep` 实读 `node_modules/@tiptap/extension-horizontal-rule/dist/index.js:62`：HR 的输入规则是 `/^(?:---|—-|___\s|\*\*\*\s)$/`（T3 §风险引用的正则核对无误）。
- 没跑：`npm test` / `npm run build` / `npm run verify` / E2E / CDP 9222 / 任何浏览器。本修订不产生产品代码改动（`git status` 只多 `docs/iteration/round-49/`、`shots/round-49/` 与 `.tmp/` 探针）。
- **沙箱坑（给执行者）**：`node --test <file>` 在本沙箱会 `spawn EPERM`（命名管道被拒），要跑单测就用 `node <file>`（`node:test` 在进程内跑），或用 `npm test`。

### 10.2 任务量复核（角色要求）

仍是 T1 15 + T2 8 + T3 6 + 门禁 6 = **35 min**。R49-7 是换一个种子字符串（不加步骤、不写新代码）；R49-8 是 1 行代码 + 1 条断言 + 3 处文档词（不增时间）；R49-9 是 4 行计数 + 1 条单测（约 2 min，在 T1 的 15 min 内消化）。**没有新增任务，没有改任务边界，没有扩大范围。**
