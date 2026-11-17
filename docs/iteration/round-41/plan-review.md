# 第 41 轮计划审查（revision=2 复审，critic，只读）

- 结论：**PASS**（**0 P0 / 0 P1 / 3 P2**）。上一版的 **H7（P1）已修掉**、**H8（P2）已修掉**、**H9（P2）按上一版给的「选项 2」如实标注并升级调度方**（见 §一）。
- 审查对象：`docs/iteration/round-41/plan.md`（`revision=2 · planner-revision · 2026-11-17`，263 行全读）
- `startSha` 核对：调度给的 `25297acee40d40fec4bcbe770c416f43faaf2d7a`；`git log -1 --format=%H` 实测 `25297acee40d40fec4bcbe770c416f43faaf2d7a` ✓（`git log --oneline -1` 显示 `25297ac`）
- 上一版审查：`plan-review.md`（revision=1 复审，3 条新漏洞 H7/H8/H9；此前 revision=0 的 6 条 H1–H6 已在 revision=1 复核为「5 修 1 引新」）。本文件是 revision=2 的复审，逐条见 §一。
- 输入（实读）：`plan.md`、`src/lib/{html,codeScan,risk,serializeDocument,find,tableCellBreaks,tilde}.ts`、`src/lib/{html,find,find.test,math.test}.ts`、`src/components/FindBar.tsx`、`src/App.tsx`（自动保存区 `:3110-3260`、关窗 `:3455-3470`、切换对话框 `:5150-5179`、查找 `:418-422/:1788-1801/:4675-4693`、状态/ref 区 `:608-620`、`dirtyRef` 同步 `:725-731`、载入链 `:978-1005`）、`src/styles.css`、`package.json`、`README.md:83/101/120/158`、`docs/iteration/STATE.md:27`、`fixtures/markdown/*`、`node_modules/@tiptap/{markdown,core}/dist/index.js`、`.tmp/{rev-r41p-probe,critic-r41-marked,critic-r41-findcounts,critic-r41-entity-probe}.mjs`
- 做法：只读。未改产品代码、未起浏览器、未碰 dev server 与 `release/`、未 push。只写本文件与 `.tmp/critic-r41-{inspect,inspect2,marked2}.mjs`（`.tmp/` 已 git 忽略）
- 复跑（输出见 §四）：`node --experimental-strip-types .tmp/rev-r41p-probe.mjs`、`node .tmp/critic-r41-inspect.mjs`、`node .tmp/critic-r41-inspect2.mjs`、`node .tmp/critic-r41-marked2.mjs`

---

## 一、上一版 3 条：逐条复核（3 条都修掉，其中 H9 按上一版自己给的选项 2 处理）

| 上版漏洞 | revision=2 的处理 | 复核结论 |
| :--- | :--- | :--- |
| **H7**（P1）`&amp;` 无前视守卫：字面 `&lt;` 存成 `&amp;lt;` 后被单遍解码成 `&lt;`，重开变 `<`；且 plan ⑬ 把错误写成硬期望 | plan:9、plan:71、plan:96（`amp` 分支看 `restored.slice(offset + whole.length)` 是否匹配 `/^(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/`）、plan:110、plan:126 ⑬ 改为 4 条新期望、plan:135 风险节改写 | **修掉，且能判别**。复跑 `.tmp/rev-r41p-probe.mjs`：计划实现下 `&amp;lt;` 保持、`&amp;#42;` 保持、`A &amp; B` → `A & B`、`&amp;lt` → `&lt`、`&amp;amp;`（作者写字面 `&amp;`）保持 `&amp;amp;`；**去掉守卫则 `&amp;lt;` → `&lt;`**（⑬b 会红，§四①）。守卫的位置算术正确：`String.replace` 回调第三参就是匹配在 `restored` 里的下标，`slice(offset + whole.length)` 正好是实体后缀 ✓。"按种类整篇跳过"（plan:95）在 `original` 含 `&amp;` 时仍然生效，与守卫不冲突 ✓ |
| **H8**（P2）位置算术没有能判别它的种子（①–⑭ 全是单行，`lineStart` 恒 0 也全绿；`## t1-block-start` 是文档第一行） | plan:12、plan:73、plan:86（`lineStart` 按输入行长累加）、plan:126 ⑮⑯⑰ 三条多行单测、plan:114 新建文档先敲一行普通文字、plan:140 判别力说明 | **修掉，判别链完整**。⑮ `'```js\nx\n```\n&gt;100 人\n'` 锁「fenced 那一支也累加」：探针实测「只在普通分支累加」→ `…\n>100 人\n`（红）；⑯ `'甲\n&gt;100 人\n'` 锁 `lastIndexOf('\n', start) + 1`：`lineStart` 恒 0 → 红；⑰ 是反向锁（两种错写法都绿），plan:140 已写明它不是位置算术的判据 ✓。E2E 段先敲普通文字再敲 `>100 人`，与 ⑯ 同向 ✓ |
| **H9**（P2）43 min > 35 min，且「合计 35 min」自相矛盾 | plan:13、plan:31、plan:39、plan:262：明确写 **37–38 min 实现 + 8–10 min 门禁 = 全轮 45–48 min**，顶部写「**需调度方确认**」，并给出砍单顺序（⑨⑩ 并入对照、`## t2-saved-and-switch` 降级、多截图、T3 顺延） | **按上一版选项 2 处理，不再是「自相矛盾」**。全文已无「合计 35 min」的旧账（`grep -n "35 min"` 只剩「硬线」引用）。**剩余风险**：45–48 min 仍高于角色硬线，是否开跑由调度方（lead）拍板；若开跑，按 plan:39 的砍单顺序自保，不许把没跑过的断言写成 PASS |

---

## 二、新发现（3 条，全 P2；都不需要再走一轮修订，执行期按下面改口径即可）

### H10（P2，执行期易踩）· `lineStart` 的累加位置写成了「三个 return 分支之外」，但真实代码不是循环、是 `.map` 回调里的三个**提前 return**——照字面放到 return 之后那一行永远不执行

**问题**

- 真实结构（实读 `src/lib/codeScan.ts:19-40`）：

  ```ts
  return lines.map((line, index) => {
    if (fenced[index]) return line                       // ← 提前 return
    const text = stripped[index].trim()
    if (inBlockMath) { …; return line }                   // ← 提前 return
    if (protectMath && BLOCK_MATH.test(…)) { …; return line } // ← 提前 return
    return mapOutsideInlineSpans(line, fn, protectMath)   // ← 普通分支
  }).join('\n')
  ```

  这里没有循环体末尾可以落代码：任何「三个 return 分支之外统一 `lineStart += line.length + 1`」如果照字面写在最后一个 return 之后，就是**到不了的行**（tsc 不报错，`.map` 照跑）→ `lineStart` 恒 0 → ⑮ 红。
- 正确落法只有两种：① 在回调**最开头**（`if (fenced[index])` 之前）`const at = lineStart; lineStart += line.length + 1`；② 预先算 `starts` 数组（`acc += line.length + 1`）再取 `starts[index]`。plan:86 的「把本行起点传给 `mapOutsideInlineSpans`」对，但「三个 return 分支之外统一累加」这句会被读成 ①的**后面**，不是①的**前面**。
- 影响是时间不是正确性：⑮ 会抓住错写法（§四①），但本轮预算已经超线（45–48 min），多一轮「红 → 看代码 → 挪一行 → 重跑」约 5–10 min。

**修法**

- plan:86 改成精确落点：「在回调第一行做 `const at = lineStart; lineStart += line.length + 1`（**在 `if (fenced[index]) return line` 之前**，三支共用一个计数器）；`mapOutsideInlineSpans` 收 `at`」。或在 impl.md 里写明「用的是①，不是循环末尾累加」。
- 顺带把 plan:75 的理由改对（不影响实现）：`start + offset`（`offset` 是 `restored` 内下标、`start` 是段首绝对偏移）**不可能**越到上一行或 -1——因为 `start ≥ lineStart` 且 `offset ≥ 0`，而 `offset ≤ restored.length ≤ segment.length`，落点永远在同一行内；真正的风险是「第 1 步还原缩短文本后，`restored.slice(0, offset)` 与真实前缀不等长」，而那只影响前缀**内容**、不影响 `lineStart` 取哪一行。结论（只用 `start` 算 `lineStart`）仍是对的，照着做即可。

### H11（P2，验收口径写错）· 「4 空格缩进代码块改后仍 DIFF」与 plan 自己的第 4 步解码逻辑矛盾：按计划规则它应该变 **SAME**（显示仍坏），写成「仍 DIFF」会让执行代理把预期结果记成回归

**问题**

- plan:112 / plan:124 写「`    四空格 if (a<b)` … 改后仍 DIFF，记录字节写进已知限制，不算回归」。但 T1 第 4 步的单遍解码对**所有非围栏、非行内代码**的片段生效（plan:94），四空格缩进代码块正是普通片段：
  - `mapOutsideCode` 的 `fenceMap` 只认 `^\s*(`{3,}|~{3,})`，4 空格缩进代码块不是围栏（`src/lib/codeScan.ts:14-40` → `src/lib/risk.ts:36-46`）；
  - 因此该行的 `&lt;` 会走到解码回调，而 `original`（种子原文 `if (a<b)`）里没有 `&lt;` 字面 → 种类总开关不跳过 → 解回 `<` → 字节等于原文 → `same:true`；
  - 即使载入链仍把 `<` 转义（`escapeHtmlForParse` 不认缩进代码），编辑器里的代码文本无论是 `<` 还是 `&lt;`（取决于 `@tiptap/markdown` 对 code token 是否走 `decodeHtmlEntities`），**最终写出的都是原文 `<`**：解码回调都会把它解回去。
- 所以「仍 DIFF」几乎必然错。这不是产品缺陷（字节更好），但预期写反会让执行代理判定「改后出现意外差异」，甚至回头改代码。
- 连带：CHANGELOG 措辞（plan:141）已收窄成「围栏与行内代码」，仍然成立；已知限制要改说「**显示**仍会看到 `&lt;`（载入仍转义），但保存字节能回原样」。

**修法**

- plan:112/124 改成：「四空格缩进代码那条**记录实测 `same` 与字节**，预期 **SAME**（`repairHtml` 会把 `&lt;` 解回 `<`）；若显示成 `&lt;`，按『载入仍转义、字节不坏』写进 impl.md 已知限制」。
- 不要为了让它 DIFF 去改 `mapOutsideCode`（缩进代码识别属于下一轮与 finder-ui F1 同族，plan:253 已归位）。

### H12（P2，漏一条回归种子）· `escapeHtmlForParse` 现在靠 `fenceMap` 决定「哪些 `<` 不转义」，而 `fenceMap` 比 CommonMark/marked 宽松；plan 的回归种子只覆盖普通围栏，没有覆盖两者判不一致的形态

**问题**

- T1 之前 `escapeHtmlForParse` 是全文替换（`src/lib/html.ts:31-33`），没有围栏判定；T1 之后改由 `mapOutsideCode` 跳过围栏（`src/lib/codeScan.ts:20-27` → `src/lib/risk.ts:36-46`）。`fenceMap` 的规则是「任意缩进、任意长度、同字符即开/关」，比 marked/CommonMark 宽（marked 的围栏最多 3 空格缩进、收尾行不能带 info string）。
- 危险方向是「`fenceMap` 认为是围栏、marked 认为是正文」：此时 `<` 不再转义，marked 会把 `<div>` 一类当 HTML 块交给 `generateJSON`，schema 不认识的块可能整段丢（`src/lib/html.ts:26-30` 的注释就是这个机制），而 `splitTableCellBreaks`/`repairHtml` 都不兜。构造样例（只用在 `.tmp` 种子，不改产品）：

  ```
      ```
  <div>甲</div>
      ```
  ```

  第 1 行被 `fenceMap` 当开栏（4 空格它也认），第 2 行 `fenced=true` 不转义，但它以 0 空格开头。**实测**（`node .tmp/critic-r41-marked2.mjs`）：

  ```text
  缩进围栏加裸HTML => code["```"] | html["<div>甲</div>\n    ```\n"]
  ```

  marked 把第 2 行切成 **html token**（走 `parseHTMLToken` → `generateJSON`），而改前 `escapeHtmlForParse` 会把 `<` 转成 `&lt;`、这一行只是段落文字。`src/lib/html.ts:26-30` 的注释就是这个机制（schema 不认识的真标签可能整段丢），所以这是 T1 新引入、尚未测过的形态。
- 风险面很窄（文件里要出现「缩进 ≥4 的 ``` 行 + 后面跟裸 HTML 行」），但它是 T1 新引入的判定依赖，plan 的回归种子（`<kbd>`、`<!-- -->`、`H~2~O`、表格 `<br>`、`[x](…)`、`$a < b$`、四空格）都不覆盖它。

**修法**

- T1 第 6 步的回归种子里加一条上面的 `.tmp` 文件，断言保存后 `<div>甲</div>` 仍在、结构没少块；`impl.md` 记录实测字节。
- 若真丢块：**本轮不要改 `fenceMap`**（它同时被 `risk.ts` 的往返/损失判定用），在 impl.md 写「已知限制 + 下轮：给 `escapeHtmlForParse` 用 CommonMark 严格围栏判定（≤3 空格缩进、无 info 收尾）」，并把这条挂到 plan:253 那一行；若没丢，记「实测通过」即可，不新增任务。

---

## 三、核对通过（实查，不是只看计划文字）

- **T1 两条根因与 plan 一字不差**：`encodeHtmlEntities` 只做 `& → &amp;`、`< → &lt;`、`> → &gt;`（`node_modules/@tiptap/core/dist/index.js`）；围栏/行内代码**不转义**（`node_modules/@tiptap/markdown/dist/index.js:1086-1089` 的 `isInsideCode` 守卫），所以 plan:58 的「围栏里现在是 `if (a&lt;b)`」来自**载入**链的 `escapeHtmlForParse`，plan:65 的归因正确；plan:109 的「先只改 `escapeHtmlForParse` 围栏三条就转 `same:true`」成立（代码块内容原样写回）。
- **H7 的 `&amp;lt` 无分号期望是安全的**（上一版审查自己提过、这里闭环）：重开时文本实体解码用 `decodeHtmlEntities`，只认 `&(?:#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|(lt|gt|quot|amp));`（**必须带分号**），在 `node_modules/@tiptap/markdown/dist/index.js:794-797、924-927` 被用于 text token。所以 ⑬ 的 `repairHtml('&amp;lt', null) === '&lt'` **不会**造成「重开变 `<`」——它不在 H7 的暴露面上，照写。
- **`mapOutsideCode` 的可改点与调用点**：`src/lib/codeScan.ts:37` 是唯一入口、`:60`/`:63` 是两处 `fn(...)`；全项目只有 `src/lib/html.ts:13` 与 `src/lib/tilde.ts:37` 两个调用点（`grep -n "mapOutsideCode" src` 实测）。`repairTildes`（protectMath=true）忽略第二参即可，类型上更少参数的函数可赋给更多参数的签名 ✓。`line.length + 1` 对 CRLF 也正确（`\r` 留在行内）✓。
- **`repairHtml` 与序列化链的边界**：`src/lib/serializeDocument.ts:50-66` 的顺序是 `repairHtml(repairMath(repairTildes(repairFootnoteRefs(raw))), original)`，frontmatter/脚注在之后拼（`:58-62`），所以 T1 的解码碰不到 frontmatter 与脚注；`reuseTables`（`:57`）拿到的是已修复文本，plan 风险 1 的「加一张含 `&` 的表」口径正确。
- **表格 `<br>` 不受 T1 伤**：`src/lib/tableCellBreaks.ts:33-45` 只在单元格内、**无 marks** 的文本上拆 `<br>`；行内代码里的 `<br>` 带 code mark 会被跳过（`:35`）。`escapeHtmlForParse` 改动后单元格文本仍被转义（单元格不是围栏/行内代码）✓。
- **`html.test.ts` 现状与 plan 对得上**：`:19` 是「不是标签的转义保持原样」（要改写）；`:64-67` 是原文含 `&lt;` 的讲转义段落（继续过）；`:69-75` 是注释/DOCTYPE 的 `!` 分支（不动）；`:52-58` 的「转义后再修复能回原文」在 T1 后仍成立（`escape → 替换 > → repairHtml` 的输入含 `&gt;`，`>` 在行中不在块首 → 解码 ✓）。
- **`package.json:15`**：`scripts.test` 是 27 条显式 `&&`（末条 `blankParagraphs.test.ts`），没有 `risk.test.ts`；`src/lib/risk.ts` 已导出 `classify`（`:319`），`src/lib/risk.test.ts` **不存在**；`:276` 的 label 是「HTML 注释会被丢掉」，全项目只有这一处（`grep` 实测），改文案不会碰别的断言 ✓。追加后 28 条 = 28 个文件 ✓。
- **T2 的五个入口与真实代码一致**：`App.tsx:3156` 现状确读五个 state；`:3148` 的 `runAutoSave` 只有 `:3228` 一个调用点（2 s 计时器）；`cancelAutoSave` `:3122`、ref 赋值 `:3232-3236`；`settingsOpen` `:365`、`closeRequested`/`closeGuardOpen` `:501-502`、`dirtyRef` `:614` 且由 `:729-731` 的 effect 同步（声明顺序在自动保存区**之前**，所以并集 effect 读到的 `dirtyRef` 是本帧新值 ✓）；`setPendingSwitch` 6 处 `:2179/:2422/:2527/:2535/:2833/:2881`；对话框「取消」`:5167`、「不保存」`:5170`、「保存并切换」`:5173`；工具栏设置 `:4520`；宿主 `close-request` `:3464-3466`。**一条 effect 赋五个 ref** 的写法比五条少 4 个漏同步口子，且消掉 effect 顺序依赖 ✓。
- **T2 的 E2E 口径可复现**：`## i2` 期望「`甲.md` 等于原种子、`未命名.md` 不存在」与 `.tmp/e2e-r41-bug-i.mjs` 的现状一致（上一版已核）；`## t2-cancel-resumes` / `## t2-settings-open` 两条恢复断言正是「只测拦住不测恢复」的补口 ✓；宿主侧 UNVERIFIED + `host-smoke` 补测口径已写（plan:168/178）。
- **T3 的代码事实全部对得上**：`src/lib/find.ts:3` 只有 `caseSensitive`；`findAll` 调用点只有 `App.tsx:1794`（其余在 `find.test.ts`），effect 依赖 `:1797` 要补两个 state；`find.test.ts:7-8` 是 `INSENSITIVE`/`SENSITIVE` 两个字面量；`FindBar.tsx` 的计数格式 `${position} / ${total}` / `无结果` 在 `:67-69`；state 区 `:418-422`；`<FindBar>` 在 `:4677`；`.find-bar button` 在 `styles.css:1849`，`.is-on` 同族写法在 `:1226`/`:1268` ✓。
- **数字与文档对账**：`README.md:83`「29 项」、`:101` 句首「288,411 B（−21.0%）」与同句「当前 290,723 B」矛盾（两条按 plan 归下轮，本轮不动 ✓）、`:120`「27 个文件、345 条」、`:158`「23 个测试文件」、`STATE.md:27`「27 个文件 345 条」——四处实查一致；`package.json` `version=0.32.1` 不动 ✓。
- **roundtrip 期望不会被 T1 打破**：`fixtures/markdown/*` 里没有裸 `&`；`>` 只出现在 `01-obsidian-note.md:11-12` 的引用块标记与 `05-html-block.md:5-7` 的真标签行（原文含 `<div`/`<p` → 标签守卫放行），rich 5/7 的两条差异（引用式链接定义、task list 空行）与实体无关 ✓。
- **硬约束**：无新运行时依赖、不动 Tiptap schema、不碰 `release/`、不 push、不发版（`version` 不动，只改 `scripts.test`）✓；首屏 290,723 B，T1+T3 的 +200～600 B 估计偏窄但距内部预算 310,000 B 仍有 1.9 万 B 余量 ✓。

---

## 四、复跑记录

```text
node --experimental-strip-types .tmp/rev-r41p-probe.mjs        （planner 的 revision=2 探针，我原样复跑）
## 今天（改前）repairHtml
  H7-1 &amp;lt; => "&amp;lt;"        H7-2 &amp;#42; => "&amp;#42;"
  H7-3 A &amp; B => "A &amp; B"    H7-4 &amp;lt（无分号） => "&amp;lt"
  H7-5 &amp;amp; => "&amp;amp;"
  H8-1 围栏在前 => "```js\nx\n```\n&gt;100 人\n"   H8-2 第二行块首 => "甲\n&gt;100 人\n"
  H8-3 上一行正文 => "甲\n前文 &gt; 比较\n"
## 计划实现（H7 守卫 + H8 全分支累加）
  H7-1 => "&amp;lt;"（保持）   H7-2 => "&amp;#42;"（保持）   H7-3 => "A & B"
  H7-4 => "&lt"（无分号照解） H7-5 => "&amp;amp;"（保持）
  ⑪ &lt;div&gt; => "&lt;div&gt;"（原文也是实体 → 不还原）
  ⑫ &lt;/div&gt; => "&lt;/div&gt;"（闭合标签同一守卫）
  ③ a &gt; b => "a > b"   ④ &gt;100 人的团队。 => "&gt;100 人的团队。"（块首保持）
  ⑥ > &gt;x => "> &gt;x"   ⑦ `x` &gt;y => "`x` >y"   ⑧a - &gt;100 人 => 保持   ⑧b 1. &gt; x => 保持
  H8-1 => 保持   H8-2 => 保持   H8-3 => "甲\n前文 > 比较\n"
## 判别力（← 这条是「上一版漏洞真被锁住」的证据）
  H7 去掉 amp 守卫          => "&lt;"                        ← ⑬b 会红
  H8 只在普通分支累加 围栏在前 => "```js\nx\n```\n>100 人\n"     ← ⑮ 会红
  H8 lineStart 恒 0 第二行块首 => "甲\n>100 人\n"               ← ⑯ 会红
  H8 恒 0 / 只在普通分支 上一行正文 => 都仍是 "甲\n前文 > 比较\n" ← ⑰ 不红（反向锁，与 plan:140 一致）
```

```text
node .tmp/critic-r41-inspect.mjs   → @tiptap/markdown：:794-797 / :924-927 text 走 decodeHtmlEntities；:1086-1089 code 上下文不转义
@tiptap/core decodeHtmlEntities 正则 = /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|(lt|gt|quot|amp));/g   ← 必须带分号（H7 的 &amp;lt 期望安全）
@tiptap/core encodeHtmlEntities  = &→&amp; 、<→&lt; 、>→&gt; 三条
```

```text
node .tmp/critic-r41-marked2.mjs   （H12 的证据：fenceMap 与 marked 判不一致时的 token 形态）
  缩进围栏加裸HTML => code["```"] | html["<div>甲</div>\n    ```\n"]   ← 裸 HTML 行变成 html token
  四空格缩进代码   => code["四空格 if (a<b)"]                          ← 干净缩进代码，marked 不当正文
  普通围栏         => code["if (a<b)"]
git rev-parse HEAD → 25297acee40d40fec4bcbe770c416f43faaf2d7a（与调度给的一致）
git status --short → 只有未跟踪的 docs/iteration/round-41/ 与 shots/round-41/，无产品代码改动
```

未跑（会写仓库文件或需要 build/browser，critic 不做）：`npm test`、`npm run roundtrip`、`npm run build` / `measure-first-screen`、浏览器 E2E。执行代理按 plan §六 收官自己跑。

---

## 五、给执行代理的提醒（不改变 PASS，但能省时间）

1. **`lineStart` 放在回调开头**（H10），不要放 return 之后；⑮ 会替你抓，但抓一次要重跑。
2. **四空格缩进代码那条按「实测 same + 字节」记**（H11），别因为 plan 写「仍 DIFF」就去改 `mapOutsideCode`；本轮不改缩进代码识别。
3. **加一条「缩进 ``` + 裸 HTML」种子**（H12），只记录实测，不扩改动；真丢块写已知限制 + 下轮。
4. **`repairTildes` 是 protectMath=true 的调用点**：`lineStart` 累加若只覆盖 fenced + 普通两支，它对 `repairTildes` 的 `start` 会偏差，但 `tilde.ts:37` 忽略该参数，不影响字节；别为这个去改 tilde。
5. **预算：45–48 min 已超**，开跑前请调度方确认；执行时按 plan:39 的砍单顺序自保，**不许把没跑过的断言写成 PASS**，超时先把进展与日志写进 `impl.md`。
6. **证据卫生**：`npm run roundtrip` 会重写已跟踪的 `docs/roundtrip-report.md`，跑完看 `git diff`；本轮 T1 不应改变 rich 5/7（§三），变了先判是不是「本轮行为变更的应有结果」。`shots/round-41/` 里的 `bug-*`、finder 的 `t*` 一律不覆盖。
