# 第 41 轮 · 计划（planner，只读；**revision=2** = planner-revision 第二次修订）

- 轮次：round=41，nn=41；轮前 `startSha=25297acee40d40fec4bcbe770c416f43faaf2d7a`（`git log -1` 实测 `25297ac`）。
- 报告目录 `docs/iteration/round-41`；输入：本轮 5 份 `findings-*.md`（全部读完）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`git log -8` 与相关源码。
- 环境：dev server `http://localhost:5175`（不另起、不重启）；E2E 用 CDP **9222**，每次先 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- 本轮不改产品代码，只写本文件。planner 自己跑了 3 个只读探针（`.tmp/planner-r41-prose.mjs`、`-prose2.mjs`、`-prose3.mjs`，走假 FSA，不改 `src/`），发现一条比 finder 报告更宽的数据改写事实，见 T1。
- 不发版：不 bump 版本号（`package.json` 的 `version` 不动；H2 只改 `scripts.test`，见 T1）；CHANGELOG 写进现有 `## Unreleased（第 29–40 轮，未发版）`。

> **revision=2（planner-revision · 2026-11-17 第二轮，只读）** — 按同一份 `docs/iteration/round-41/plan-review.md`（revision=1 复审）的 3 条（H7 P1 / H8 P2 / H9 P2）逐条修。**任务结构不变**（仍是 T1/T2/T3，没有新增任务、没有扩大范围）。逐条：
>
> - **H7（P1）** `&amp;` 解码加**前视守卫**：`amp` 分支解码前看 `restored.slice(offset + whole.length)`，匹配 `/^(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/` 时保持 `&amp;`，否则才解。单测 ⑬ 从「`&amp;lt;` → `&lt;`」改成「**保持 `&amp;lt;`**」，另加 3 处（`&amp;#42;` 原样 / `A &amp; B` → `A & B` / `&amp;lt` → `&lt`）。本版探针 `.tmp/rev-r41p-probe.mjs`（import 真实 `src/lib/risk.ts`、`src/lib/html.ts`，只在内存里模拟计划实现）实测：改前 `&amp;lt;` 原样；计划实现后 `&amp;lt;` 仍原样；**去掉守卫则变 `&lt;`**（说明 ⑬ 能抓住这个 bug）；同时 `A &amp; B` → `A & B`、`&amp;amp;`（作者写字面 `&amp;`）保持 `&amp;amp;`。证据见 §二 rev2 补。
> - **H8（P2）** 位置算术补 3 条**多行**单测（⑮⑯⑰），并把 `lineStart` 的累加写死为「在**三个 return 分支之外**统一累加」（§三 T1 改动清单与 §二 的坑）。同一探针实测判别力：只在普通分支累加 → ⑮ 红（`repairHtml('```js\nx\n```\n&gt;100 人\n')` 变 `…\n>100 人\n`）；`lineStart` 恒 0 → ⑯ 红（`repairHtml('甲\n&gt;100 人\n')` 变 `甲\n>100 人\n`）；⑰ 是反向锁（两种错写法都不红，锁的是「上一行正文不许让守卫误保持」）。`## t1-block-start` 的新建文档改成**先敲一行普通文字再敲 `>100 人`**。
> - **H9（P2）** 预算按实测口径重算并**如实标注超线**：T1 17–18 + T2 10 + T3 10 = **实现 + 自测 37–38 min**，门禁串跑另计 8–10 → **全轮 45–48 min，超「一个执行代理 35 min」硬线，需调度方确认**（plan-review H9 选项 2；比它给的 43 min 多 2–5 min，因为本版又加了 H7/H8 的 6 处断言）。revision=1 的「合计 35 min / 移出 README 两条就保住 35 min」两句作废，改成一条**砍单顺序**（见 §一）。
> - 顺带简化（不新增内容）：T2 的五个 ref 同步从「5 条 effect」并成 **1 条**（一次赋五个 ref），把 plan-review §五-4 的 effect 顺序依赖直接消掉。
> - 本版自跑（只读）：`.tmp/rev-r41p-probe.mjs`。未改产品代码、未起浏览器、未碰 dev server 与 `release/`、未 push。

> **revision=1（planner-revision · 2026-11-17，只读）** — 按 `docs/iteration/round-41/plan-review.md` 的 6 条（3×P1 + 3×P2）逐条修。**任务结构不变**（仍是 T1/T2/T3，没有新增任务、没有扩大范围）；改动只做两件事：把不可执行/不可判真的地方改对，把加时后放不进 35 min 的顺带项移出。逐条：
>
> - **H1（P1）** `&gt;` 解码加**块首守卫**：`mapOutsideCode` 的回调加第二参数 `start`（`src/lib/codeScan.ts:14-18`；`repairTildes` 忽略它，向后兼容，全项目只有 `html.ts:13` 与 `tilde.ts:37` 两个调用点），行首到该实体只剩块级标记时保持 `&gt;`。实测：`.tmp/critic-r41-marked.mjs` 复跑 `>100 人的团队。` → blockquote、`&gt;100 人的团队。` → paragraph。守卫**比 critic 给的 `/^[ \t]*(?:>[ \t]*)*$/` 多两类前缀**（`[-*+][ \t]+`、`\d{1,9}[.)][ \t]+`）：本轮新探针 `.tmp/rev-r41-probe-listgt2.mjs` 实测 `- >100 人` 重开是「list_item 里套 blockquote」（`>` 变标记、不显示），`- &gt;100 人` 才是 list_item 里的文字——列表项首行同样是块首。多守一类只会让字节更接近今天，不会少解任何正文位置；critic 的 4 条种子照旧全过。单测 +5 条（④–⑧，含列表标记一条）、E2E +1 段（`## t1-block-start`），见 T1。
> - **H2（P1）** T1 清单加 `package.json:15`：`scripts.test` 末尾追加 `&& node --experimental-strip-types src/lib/risk.test.ts`（**别重排、别改 glob**）；T1 验收加「`npm test` 跑 28 个文件、0 fail」+ impl.md 贴汇总行；`README.md:120`、`README.md:158`、`STATE.md:27` 三处数字由 tester 按实测统一改。
> - **H3（P1）** T3 的 E2E 期望数字改对：`默认 1/4 → 只 Aa 1/2 → Aa+ab 1/1 → 只 ab 1/3 → 都关 1/4`。本轮复跑 `.tmp/critic-r41-findcounts.mjs` 实测 4 / 2 / 1 / 3 / 4；根因是 `findAll` 子串匹配（`src/lib/find.ts:17-45`），区分大小写**不顺带**做词边界。验收里写明「不要为了让断言变成 `1/1` 去把大小写改成整词」。
> - **H4（P1）** T2 的守卫**五个条件全改 ref**（`:3156` 现状全读 state）：`pendingSwitchRef`/`pendingConfirmRef`/`closeRequestedRef`/`closeGuardOpenRef`/`settingsOpenRef`；新 effect 用五者并集取消、全空且脏重排；**加**两条 E2E（点「取消」后自动保存要恢复、设置开着不写盘并在关掉后恢复），原「保存并切换」正向断言保留成第三段；宿主 `close-request` 浏览器态测不到 → UNVERIFIED + `host-smoke` 补测口径。同时改对 critic §五-2 的事实：`setPendingSwitch` 实际 6 处（不是 8 处）。
> - **H5（P2）** 标签名守卫先剥可选前导 `/` 再取名（`src/lib/html.ts:3` 的捕获组本就含 `\/?`）；原文写 `&lt;/div&gt;` 这类字面实体不再变成 `</div>`。单测 +2 条；impl.md 写明「守卫只在 `lt` 类被整篇跳过时才决定字节，否则解码兜底给出同一结果」。
> - **H6（P2）** ①「4 空格缩进代码块仍不在口径内」写进 impl.md 已知限制，CHANGELOG 措辞收窄成「围栏与行内代码」，种子加一条并注明「改后仍 DIFF，不算回归」；②`risk.ts` **删掉**围栏剔除（`:269-282` 只留 `:276` 的 label 文案），`risk.test.ts` 3 条改成锁「围栏注释 / 修复后的真注释不产生 loss、真丢注释仍拦 + label 文案」，省约 4 min。
> - 顺带改对 critic §五-2 的另一处事实：`src/styles.css` 的类名是 `.find-bar button`（`:1849`），不是 `.find-row button`。
> - 把 T3 第 5 步的两条 README 顺带项（`:83` 的 29→30、`:101` 的句首 −21.0%）移到 §五 下轮做——T1/T2 的守卫与补测加了约 8 min，先保住 35 min。本轮不做项里**没有**新增任务，只是把原任务的顺带项归位。
> - 本轮修订自跑（只读）：新探针 `.tmp/rev-r41-probe-listgt.mjs`、`-listgt2.mjs`、`-tasklist.mjs`；复跑 `.tmp/critic-r41-marked.mjs`、`.tmp/critic-r41-findcounts.mjs`。只写本文件与 `.tmp/`：未改产品代码、未起浏览器、未碰 dev server 与 `release/`、未 push。

## 一、本轮选了什么、为什么

finder 合计 34 条，全部塞进一轮不现实。按 `.tmp/iteration/roles/planner.md` 的排序（1 数据安全 → 2 用户可见收益 → 3 安装/体积/性能 → 4 内部质量）与「一个执行代理 35 分钟」的口径（**revision=2 实测账 45–48 min，已超线，见本节末段**），取 **3 个任务**：

| id | 标题 | 级别 | 类别 | 估时 |
| :--- | :--- | :--- | :--- | ---: |
| T1 | 正文与代码里的 `<` `>` `&` 保存后不再被写成实体（含 `&gt;` 的块首守卫与 `&amp;` 的前视守卫） | P1（planner 复核后按 P0 对待） | 数据安全 | 17–18 min |
| T2 | 「还有没保存的改动」对话框开着时自动保存不写盘，点「不保存」真的不写（五个条件全改 ref） | P1 | 数据安全 | 10 min |
| T3 | 查找加「区分大小写 / 整词」两个开关 | P1 | 用户可见收益 | 10 min |

估时（**revision=2 重算，按实测口径，不再写「合计 35 min」**）：T1 17–18 min（含 H7 的 4 处 amp 断言与 H8 的 3 条多行断言）、T2 10 min、T3 10 min = **实现 + 自测 37–38 min**；门禁串跑（tsc/test/verify/roundtrip + E2E）另计 **8–10 min**；**全轮 45–48 min，超「一个执行代理 35 min」硬线 → 需调度方确认**（plan-review H9 选项 2）。若必须压到 35 min，按下面的砍单顺序，**不许自行改顺序**：① ⑨⑩ 并进 E2E 对照表（`bug-h` 四条已覆盖同一口径，不再单列）→ ② `## t2-saved-and-switch` 降成「记录」不做 assert（`scripts/data-safety-acceptance.mjs:320-337` 已有「保存并切换先弹确认」的既有断言）→ ③ 多余截图（每项 1 张够用）→ ④ T3 整体顺延下一轮。**这些不砍**：①–⑦（T1 主口径）、④–⑧（块首守卫）、⑬ 的 4 条 amp 断言（H7）、⑮⑯⑰（H8 多行）、`## t2-cancel-resumes` 与 `## t2-settings-open`（H4 的两个正向恢复）。

**为什么是这三条**

- T1 是本轮唯一「打开不做任何操作、按 `Ctrl+S` 就写坏」且**零提示**的路径（findings-bug 第 1 条）。planner 复核时发现范围比报告更大（见下）。
- T2 是用户明确选择被违背（点「不保存」内容仍在盘上），findings-bug 第 2 条，改动只有几行 ref + 一个 effect。
- T3 是 5 路报告里唯一「库已支持、只差 UI」的 P1，改动小、每天用；顺带 3 行 README 公开数字对账（findings-ship S2/S3 的一半）。

## 二、planner 复核新增事实（T1 的范围比 findings-bug 第 1 条宽）

findings-bug 第 1 条只报了「代码围栏 / 行内代码里的 `<`」。planner 用假 FSA 实测发现，**序列化器对正文里每个 `&`、`<`、`>` 都写成实体，而 repair 只认得完整标签形状**，所以正文里最普通的写法也在被静默改写。三条探针原始输出（`.tmp/planner-r41-prose*.mjs`，CDP 9222，`dialog:null` 表示没有任何提示）：

| 种子（原文件字节） | 保存后字节 | `same` | 提示 |
| :--- | :--- | :--- | :--- |
| `# 比较\n\na<b 是普通比较，不是标签。\n` | `a&lt;b 是普通比较…` | false | null |
| `# 空格\n\n如果 a < b 就换行。\n` | `如果 a &lt; b 就换行。` | false | null |
| `# 数字\n\n条件 x<3 成立。\n` | `条件 x&lt;3 成立。` | false | null |
| `# 和号\n\nA & B 一起写。\n` | `A &amp; B 一起写。` | false | null |
| `# 大于\n\n如果 a > b 就换行。\n` | `如果 a &gt; b 就换行。` | false | null |
| `# 对照\n\n```js\nif (a<b) { n++ }\n```\n` | 围栏内 `if (a&lt;b)` | false | null |
| `# 实体\n\n写成 &lt;div&gt; 才是字面。\n` | `写成 <div> 才是字面。`（实体被还原成真标签） | false | null |
| `# 标签\n\n按 <kbd>Ctrl</kbd> 触发。\n` | 不变 | **true** | — |

根因两条，都在 `node_modules` 的默认行为上，不靠猜：

1. `src/lib/html.ts:31-33` 的 `escapeHtmlForParse` 全文字符替换，**没有代码感知**：围栏/行内代码里的 `<` 在 `manager.parse` 之前就变成了 `&lt;`，而 `repairHtml` 用 `mapOutsideCode` 跳过围栏，于是永久漂移（findings-bug 第 1 条的根因，已复核 `html.ts:13`）。
2. 序列化器（`node_modules/@tiptap/markdown/dist/index.js:1086-1089`）对非代码文本调 `encodeHtmlEntities`，而 `encodeHtmlEntities`（`node_modules/@tiptap/core/dist/index.js`）就是 `& → &amp;`、`< → &lt;`、`> → &gt;` 三条；`src/lib/html.ts:3` 的 `ESCAPED_TAG = /&lt;(\/?[a-zA-Z!][^&\n]*?)&gt;/g` 只还原「完整标签形状」，孤立的 `&lt;`、`&gt;`、`&amp;` 没人还原。

所以 T1 的正解不是只加 `mapOutsideCode`：**取消防实体（de-escape）也必须做**，否则 `a < b`、`A & B`、`a > b` 继续被写坏。至于 `&amp;lt;` 这类「套了两层的字面实体」，**不能**一律解（解了就是字面 4 字符变 1 个 `<`，见下面的 revision=2 补），所以解码要**单遍**、且 `amp` 分支带前视守卫。

**revision=1 补（critic H1）**：解码本身会**新引入**一条静默结构改写——序列化器把正文的 `>` 写成 `&gt;`，无守卫地解回来就是行首 `>`，重开时 marked 当引用块（`.tmp/critic-r41-marked.mjs` 复跑：`>100 人的团队。` → blockquote、`&gt;100 人的团队。` → paragraph）。今天存出来的 `&gt;` 字节因「按种类整篇跳过」不会被改坏，出问题的只有「本次会话新输入/新粘贴、原文没有 `&gt;`」的内容（新文档，或打开不带 `&gt;` 的旧文件）。列表项首行同理：`.tmp/rev-r41-probe-listgt2.mjs` 实测 `- >100 人` → list_item 里套 blockquote，`- &gt;100 人` → list_item 里的文字。所以守卫必须与解码同步落地，见 T1 改动清单与验收的块首项。

**revision=2 补（critic H7）**：单遍解码本身也会**新引入**一条静默改字。序列化器把正文每个 `&` 写成 `&amp;`，所以作者在新文档里打**字面** 4 个字符 `&lt;`，存下去是 `&amp;lt;`；单遍解码后写成 `&lt;`，重开时 marked 输出 `<p>&lt;</p>`，DOM 解析后正文只剩 `<`（4 字符变 1）。今天这版存 `&amp;lt;`、重开文本仍是 `&lt;`，所以这是 T1 新引入的改写，暴露面与 H1 相同（`.tmp/critic-r41-entity-probe.mjs`：`&amp;#42;` / `&amp;nbsp;` / `&amp;copy;` 同理）。因此 `amp` 分支要加**前视守卫**：解出来的 `&` 后面紧跟 `名字;` / `#数字;` / `#x十六进制;` 时保持 `&amp;`。本版探针 `.tmp/rev-r41p-probe.mjs` 实测（内存模拟计划实现，未改产品代码）：`&amp;lt;` 保持、`&amp;#42;` 保持、`A &amp; B` → `A & B`、`&amp;lt`（无分号）→ `&lt`、`&amp;amp;`（作者写字面 `&amp;`）保持 `&amp;amp;`；去掉守卫则 `&amp;lt;` → `&lt;`。

**revision=2 补（critic H8）**：守卫的位置算术需要**多行**种子才判别得出。①–⑭ 全是单行（`start === 0`，`lastIndexOf('\n', start) + 1` 恒 0），`## t1-block-start` 的 `>100 人` 又是新建文档第一行，两者都判别不出 `lineStart` 写错。本版探针实测两种错写法：**只在普通分支累加 `lineStart`** → ⑮ 红（`'```js\nx\n```\n&gt;100 人\n'` 变 `'```js\nx\n```\n>100 人\n'`，重开变引用块）；**`lineStart` 恒 0** → ⑯ 红（`'甲\n&gt;100 人\n'` 变 `'甲\n>100 人\n'`）。⑰ 是反向锁：两种错写法都绿，它锁的是「上一行正文不许让守卫误保持 `&gt;`」（同段正文里的 `&gt;` 必须照解）。

回调拿 `start` 时的一个坑：`lineStart` 必须按**输入** `markdown` 的行长累加，且**累加要放在三个 return 分支（fenced / blockMath / 普通）之外统一做**——只在普通分支里加，文档里围栏在前、`&gt;` 在后时前缀会带上围栏行，守卫判成非块首 → 解码 → 重开变引用块（⑮ 就是锁这个）。第 1 步的标签还原会缩短文本，用 `start + offset` 去 `lastIndexOf('\n', …)` 会错位到上一行甚至 -1。

## 三、任务

### T1（P1，数据安全）正文与代码里的 `<` `>` `&` 保存后不再被写成实体

**为什么先做**：默认工作流就是「打开 → 看一眼 → `Ctrl+S`」，这一步现在会静默改字节，且风险门看不见（`baselineLosses` 的基线是解析之后算的，改写已经发生在基线之前）。影响面：正文 `a < b`、`x<3`、`A & B`、`a > b`、围栏里的代码、行内代码里的标签，全部中招；findings-bug 第 1 条只是其中一支。revision=1 补：解码这一步本身会再引入「块首 `>` 变引用块」（见 §二 rev1 补），所以**标签守卫、单遍解码、块首守卫必须同一步落地**，不能先解后守。

**改动文件 / 函数**

- `src/lib/codeScan.ts`
  - `mapOutsideCode(markdown, fn, protectMath?)` 的 `fn` 签名加第二参数 `start`（绝对偏移）：`fn: (segment: string, start: number) => string`。`lineStart` 按**输入** `markdown` 的行长累加（`let lineStart = 0`；**三个 return 分支之外**统一 `lineStart += line.length + 1`，H8 的 ⑮ 就锁这一条），把本行起点传给 `mapOutsideInlineSpans`（内部签名加第三参数 `lineStart`，不导出），由它把 `lineStart + last` 当 `start` 交给 `fn`（`:60`、`:63` 两处调用）。
  - 兼容性：`repairTildes`（`src/lib/tilde.ts:37`）的回调忽略第二参数即可；全项目只有 `html.ts:13` 与 `tilde.ts:37` 两个调用点。
- `src/lib/html.ts`
  - `escapeHtmlForParse`：改为 `mapOutsideCode(text, segment => segment.replace(...))`，围栏（含引用块围栏）与行内代码不参与。正则本身**不改**（`a<b` 在正文里仍然先转义，靠下一步还原，避免绕开 marked 的 HTML 块判定）。
  - `repairHtml`：同一 `mapOutsideCode` 段内分两步（回调现在有 `start`）——
    1. **标签/注释还原**（现有 `ESCAPED_TAG`）。守卫按标点分两类：
       - `!` 开头（注释、DOCTYPE）：保持现在的「原文精确含 `<inner>` 才还原」，一字不动（第 40 轮承诺）。
       - 普通标签：先**剥掉可选前导 `/`** 再取标签名 `[a-zA-Z][a-zA-Z0-9-]*`（`inner` 是 `/kbd` → 名字 `kbd`），「`original === null` 或原文含 `'<'+name` 子串」才还原；取不到名字（例如 `inner` 是纯标点）时按旧行为还原。效果：原文写真标签 → 还原（属性被用户改过也照样还原）；原文写 `&lt;div&gt;` / `&lt;/div&gt;` 这种字面实体 → 原文里没有 `<div` 子串 → 保持实体（闭合标签也是这条守卫，见 H5）。**注意这条守卫单独并不决定最终字节**：第 2 步的种类跳过（原文含 `&lt;` → 整个 `lt` 类不解码）也会保住它；真正由本守卫决定结果的只有「原文含 `lt` 字面、这一类被整篇跳过」的混写文档——impl.md 要写明这一层，别把守卫当主路径，也别把 ⑪⑫ 两条单测写成「删掉守卫也能过」的样子。
    2. **单遍实体解码** `/&(amp|lt|gt);/g`（一次 `replace`，不链式三次替换）。回调 `(whole, kind, offset)` 里做三层判断，顺序不能换：
       - **按种类总开关**：`original` 里出现该实体的字面写法（`original.includes(whole)`，如原文有 `&lt;`）就跳过这一类，否则解；`original` 为 `null`（草稿链等）时一律解。这样「讲转义的段落」原文写 `&lt;!-- --&gt;` 时一个字节都不动（第 40 轮单测继续成立），而普通文档的 `a < b` / `A & B` / `a > b` 全部还原。同一篇里既写实体又写裸 `&` 的混合文档，按保守规则保持现状（写进 impl.md 的已知限制）。
       - **`amp` 的前视守卫（revision=2，H7）**：`kind === 'amp'` 时先看解出来的 `&` 会不会自成实体——`restored.slice(offset + whole.length)` 匹配 `/^(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/` 就**保持 `&amp;`**，否则才解成 `&`。`&amp;lt;` 保持（否则作者写的字面 4 字符 `&lt;` 会变成 1 个 `<`）、`&amp;#42;` 保持、`&amp;lt`（无分号）→ `&lt`、`A &amp; B` → `A & B`。理由见 §二 rev2 补；impl.md 写明「`&amp;` 只在解出来的 `&` 不会自成实体时才解」。
       - **`gt` 的块首守卫（revision=1，H1）**：前缀 = `markdown.slice(lineStart, start) + restored.slice(0, offset)`，其中 `lineStart = markdown.lastIndexOf('\n', start) + 1`、`restored` 是第 1 步的输出、`offset` 是该实体在 `restored` 里的相对位置。前缀匹配 `/^[ \t]*(?:(?:>[ \t]*)|(?:[-*+][ \t]+)|(?:\d{1,9}[.)][ \t]+))*$/` → 保持 `&gt;` 不解码。`lineStart` 只用 `start` 算，**不要**用 `start + offset`（标签还原会缩短文本、偏移错位）。`&lt;` 不需要位置守卫：重开时 `escapeHtmlForParse` 会把 `<`+字母/`/`/`!` 重新转义（`html.ts:32`）；`&amp;` 已由上面的前视守卫管住。
- `src/lib/risk.ts`
  - 只改 `:276` 的 label：「HTML 注释会被丢掉」→「HTML 注释的写法会被改动」（现状说「丢掉」，实际是写成实体）。
  - **不做** `:269-282` 的围栏剔除（critic H6b 选①）：T1 修好 `escapeHtmlForParse` 后围栏内容逐字节保留，`classify` 里 `afterTextNoCr.includes(comment)`（`risk.ts:270-272`）直接命中，围栏剔除是死代码、单测也判别不出，省约 4 min。
- `src/lib/html.test.ts`：`html.test.ts:19` 的期望改成「正文 `如果 a &lt; b` 还原成 `如果 a < b`」（这是本轮**有意的行为变更**，要在 impl.md 写明）；改写 1 条、新增 **16** 条口径（⑬ 一条含 5 处断言；部分一条里含两处断言），见验收。
- `src/lib/risk.test.ts`：**新建**（当前不存在），3 条，用导出的 `classify(before, after)`（`risk.ts:319`，纯函数）。
- `package.json`：`scripts.test`（`:15`）末尾追加 ` && node --experimental-strip-types src/lib/risk.test.ts`（**别重排、别改成 glob**；现状是 27 条 `&&` 串起来的显式清单，末尾 `blankParagraphs.test.ts`）。不追加的话 `npm test` 仍只跑 27 个文件、`risk.test.ts` 一条都不跑，`risk.ts` 的改动没有门禁。

**实施步骤**

1. 先跑复现并留证据：`node .tmp/planner-r41-prose.mjs`、`-prose2.mjs`、`-prose3.mjs`（每个前先 `node .tmp/reset.mjs 9222`），把 8 行输出粘进 `impl.md` 当「改前」；再复制 `.tmp/e2e-r41-bug-h.mjs` 为 `.tmp/e2e-r41p-t1b.mjs`（截图路径改成 `shots/round-41/t1-code-html.png`，**不要覆盖** `bug-h-code-html.png` 这轮的原始证据）并跑一遍当「改前」。
2. 只改 `codeScan.ts`（给 `fn` 加 `start`），跑 `npx tsc --noEmit` 与 `node --experimental-strip-types src/lib/html.test.ts`：应全绿（参数化本身不改字节）。这一步单独确认。
3. 改 `escapeHtmlForParse`（先只改这一处），重跑第 1 步：围栏与行内代码三条应转 `same:true`，正文 `&`/`>` 仍 `false`。别和后一步混在一起。
4. 改 `repairHtml`（标签守卫剥 `/` + 单遍解码 + `amp` 前视守卫 + `gt` 块首守卫），重跑：8 条全 `same:true`。其中 `# 实体`（`写成 &lt;div&gt; 才是字面。`）靠**两道守卫**：原文没有 `<div` 子串 → 标签不还原；原文含 `&lt;` 字面 → 该类实体不解码。`# 大于`（`a &gt; b`）必须解成 `a > b`（行中，不是块首）。同一步把 `html.test.ts` 的 ⑬ 期望改成「保持 `&amp;lt;`」（H7），并加 ⑮⑯⑰ 三条多行单测（H8）；`node --experimental-strip-types src/lib/html.test.ts` 单跑一遍。
5. 改 `risk.ts` 的 label（只一处），新建 `risk.test.ts` 3 条，`package.json:15` 末尾追加一条，跑 `node --experimental-strip-types src/lib/risk.test.ts`，再跑 `npm test`（应看到 28 个文件、0 fail；汇总行贴 impl.md）。
6. 回归种子（新写 `.tmp/e2e-r41p-t1.mjs`，截图 `shots/round-41/t1-*.png`）：`<kbd>Ctrl</kbd>`、`<!-- 单行注释 -->`、`H~2~O`、表格单元格 `<br>`、`[x](https://a.b/?x=1&y=2)`、`$a < b$`、**`    四空格 if (a<b)`（改后仍 DIFF，记录字节写进 impl.md 已知限制，不算回归）**；表格 `<br>` 必须仍显示换行（`td br` 计数不减）。
7. **块首守卫的 E2E（revision=1，H1；同一脚本里的 `## t1-block-start`）**：
   - 新文档：打开假工作区后「文件 → 新建」，**先敲一行普通文字 `第一行普通文字。` 回车**，再输入 `>100 人的团队。`（revision=2，H8：让守卫的前缀跨过一行，与 ⑯ 同向，别只测文档第一行）→ `Ctrl+S`（有工作区且无句柄时直接在根建 `未命名.md`）→ `readFakeFile('未命名.md')` 的字节含 `&gt;100 人的团队。`、且 `/^>/m` 在字节里为 false（行首没有裸 `>`）。
   - 同文档再输入一段列表项文字：回车后输入 `- ` 再输入 `>100 人` → 再 `Ctrl+S` → 字节含 `- &gt;100 人`。
   - 重开（**不要 `page.reload()`**：`installFakeWorkspace` 是 `addInitScript`，reload 会把 `__fsState` 重置回种子，`.tmp/r30-fsa.mjs:2-7`）：用「文件 → 打开文件夹…」重新选中同一个假目录，先点另一个种子文件、再点 `未命名.md`，断言 `.ProseMirror blockquote` 数 **0**、正文 `innerText` 含 `>100 人的团队。`。
   - 这条是 T1 的**护栏**，不是「改前 bug」：今天这版存的字节本来就是 `&gt;`（不加守卫，T1 会把它们解成 `>`，重开变引用块）。所以**不能写成 `same:true`**（新文档原文是空的），要按上面的字节 + 结构断言。
8. 更新 CHANGELOG `## Unreleased` 一条（措辞见风险第 6 条）。

**验收标准（可执行）**

- 改前 → 改后对照：`a<b`、`a < b`、`x<3`、`A & B`、`a > b`、围栏 `if (a<b)`、行内代码 `` `<kbd>` `` **7 条 `same:false` → `same:true`**，`dialog:null` 全程。
- `bug-h` 四条（`h1-围栏div.md`、`h2-围栏比较.md`、`h3-行内code.md`、`h4-围栏kbd.md`）全部 `same:true`、`dialog:null`。
- 回归种子 7 条全 `same:true`（含第 40 轮两条 SAME 项）；**另加一张含 `&` 的表**（风险第 1 条），断言未改动的表格整块写回原文；表格 `<br>` 用例 `td br ≥ 1` 且保存字节含 `<br>`；四空格缩进代码那条记录实际字节，改后仍 DIFF 且**不算回归**（写进 impl.md 已知限制）。
- 块首守卫（`## t1-block-start`）：新建文档**第一行是普通文字 `第一行普通文字。`**（H8：让前缀跨一行），`未命名.md` 字节含 `&gt;100 人的团队。` 与 `- &gt;100 人`、`/^>/m` 为 **false**（行首无裸 `>`）；重开后 `.ProseMirror blockquote` 数 **0**、正文含 `>100 人的团队。`。
- 单测（`html.test.ts`，改写 1 条 + 新增 **16** 条口径）：①（改 `html.test.ts:19`）正文 `如果 a &lt; b 就换一行。` → `如果 a < b 就换一行。` ②`A &amp; B` → `A & B` ③`a &gt; b` → `a > b`（行中，不是块首） ④`repairHtml('&gt;100 人的团队。', null)` 保持实体 ⑤`repairHtml('&gt; x', null)` 保持 ⑥`repairHtml('> &gt;x', null)` 保持（引用块行不解成嵌套引用） ⑦`` repairHtml('`x` &gt;y', null) `` → `` `x` >y ``（不误判行首） ⑧`repairHtml('- &gt;100 人', null)` 与 `repairHtml('1. &gt; x', null)` 都保持（列表标记也是块首，revision=1 加的） ⑨围栏里的 `&lt;kbd&gt;` 原样 ⑩行内代码里的 `&lt;` 原样 ⑪原文是 `&lt;div&gt;` 时保持实体（`repairHtml('&lt;div&gt;', '&lt;div&gt;')` 原样） ⑫`repairHtml('&lt;/div&gt;', '&lt;/div&gt;')` 原样（闭合标签守卫，H5） ⑬`repairHtml('&lt;kbd&gt;', null) === '<kbd>'`（解码兜底）+ **amp 前视守卫（H7）**：`repairHtml('&amp;lt;', null) === '&amp;lt;'`、`repairHtml('&amp;#42;', null) === '&amp;#42;'`、`repairHtml('A &amp; B', null) === 'A & B'`（正常 `&` 仍解）、`repairHtml('&amp;lt', null) === '&lt'`（不带分号照解） ⑭原文含 `&lt;` 字面时该类实体不解码（`html.test.ts:64-67` 继续通过）；原文写真 `<kbd>`、被用户改成 `&lt;kbd class="x"&gt;` 时仍还原成 `<kbd class="x">`（标签名守卫的正向） ⑮`repairHtml('```js\nx\n```\n&gt;100 人\n', null)` 保持（围栏在前，H8：锁「三个 return 分支都累加 `lineStart`」） ⑯`repairHtml('甲\n&gt;100 人\n', null)` 保持（第二行才是块首，锁 `lastIndexOf('\n', start) + 1`，`lineStart` 不许写成常数 0） ⑰`repairHtml('甲\n前文 &gt; 比较\n', null) === '甲\n前文 > 比较\n'`（上一行正文不许让守卫误保持）。
- 上面 ⑬b–⑰ 的期望值已由 `.tmp/rev-r41p-probe.mjs` 的内存模拟验过（含「去掉守卫就红」的反向对照），执行代理照抄即可；如果实测与探针不一致，以实测为准并写进 impl.md（那说明实现与计划不同，不要改断言凑绿）。
- `risk.test.ts` 3 条（用 `classify`）：①围栏里的 `<!-- x -->`（before 与 after 同字节）不产生 `html-comment` loss ②修复后的真注释 `正文 <!-- 备注 -->` 不产生 loss ③真丢注释（before 有、after 没有）仍产生 loss、`blocking:true`、`label === 'HTML 注释的写法会被改动'`（锁 `:276` 的文案）。
- 门禁：`npx tsc --noEmit` exit 0；`npm test` **28 个文件、0 fail**（`package.json:15` 的清单应是 28 条 `node --experimental-strip-types`；汇总行贴 impl.md）；`npm run roundtrip` rich 5/7 source 7/7；`npm run verify` PASS（首屏 gzip 记实测增量，内部预算 310,000 B 仍有余量）；E2E 控制台 `errors:[]`。
- 截图：`shots/round-41/t1-fence-before.png`（改前围栏显示 `&lt;`）、`t1-fence-after.png`、`t1-prose-amp.png`（`A & B` 保存后字节不变）、`t1-code-html.png`、`t1-block-start.png`（重开后是段落，`blockquote` 数 0）。

**风险与对策**

- **表格整块复用**：`reuseTables` 拿 `original` 与修复后的序列化比；解码后含 `&` 的表格会更「像」原文（复用更容易命中），但签名变化可能让某些表的首次保存行为变。对策：第 6 步回归种子里加一张含 `&` 的表，断言「未改动的表格写回原文」仍成立。
- **双解码与 `amp` 前视守卫（revision=2，H7 改写这条）**：`&amp;lt;` 这类**不能**解成 `&lt;`——作者写的是字面 4 字符 `&lt;`，解成 `&lt;` 后重开时 marked 当实体再走一遍，正文只剩 1 个 `<`（`.tmp/critic-r41-entity-probe.mjs`：`&amp;#42;` → `*`、`&amp;nbsp;` → NBSP、`&amp;copy;` → © 同理）。对策两条：① `/&(amp|lt|gt);/g` 单次 `replace`，不链式三次替换；② `amp` 分支看紧随其后的字符，匹配 `/^(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/` 时保持 `&amp;`。单测锁 `&amp;lt;` 保持、`&amp;#42;` 保持、`A &amp; B` → `A & B`、`&amp;lt` → `&lt`（四种都已用 `.tmp/rev-r41p-probe.mjs` 验过）。已知副作用：正文写 `R&D;2026` 这种「`&` + 字母 + `;`」时保持 `&amp;`，重开文本仍是 `R&D;2026`（正确，且字节更接近今天）。
- **可能误伤 `escapes.test.ts` / `export.test.ts` / `diff.test.ts` 的实体断言**：这三处断言的是导出 HTML 与 diff 文本，不经 `repairHtml`，预计不动；若红，先判「是不是本轮行为变更的应有结果」，不要改断言凑绿。
- **公式 / autolink**：`repairHtml` 现不跳公式，解码后 `$a &lt; b$` 会变 `$a < b$`（与正文同口径，可接受）；`<https://…>` 走标签守卫。对策：第 6 步种子覆盖，若会改字节就在 impl.md 写明并按「与正文一致」接受。
- **误还原成真标签**：标签名守卫是「原文没有 `<div` 就保持实体」；风险是原文里 `<div` 出现在别处（例如讲 HTML 的段落里既写真标签又讲 `&lt;div&gt;`），那两处都会还原。对策：这属混合文档的已知限制，impl.md 写明；E2E 种子加一篇「同一篇里写真 `<kbd>` 又写 `&lt;kbd&gt;`」记录实际字节，若还原造成破坏，就在守卫里加「原文该行有 `&lt;` 时按实体处理」的逐行判定（写进 impl.md 待批评者裁定，不要静默扩大改动）。
- **块首守卫的两类边界（revision=1）**：① 任务列表项首行（`- [ ] &gt;100 人`）**不**进守卫：`.tmp/rev-r41-probe-tasklist.mjs` 实测 marked 在任务项里不把 `>` 当块级标记（`- [ ] >100 人` 仍是 list_item 里的文字、不产生 blockquote），解掉安全；若执行时实测出现结构变化，就把 `(?:\[[ xX]\][ \t]+)?` 补进谓词并在 impl.md 记一笔。② 守卫只保「实体落在块首」：段落中间的 `a &gt; b` 照解，这是本轮要修的正文改写，别为守块首把正文也保住。
- **位置算术的判别力（revision=2，H8）**：`.tmp/rev-r41p-probe.mjs` 实测三种写法：正确写法 → ⑮⑯⑰ 全绿；「只在普通分支累加 `lineStart`」→ ⑮ 红（`'```js\nx\n```\n&gt;100 人\n'` 变 `'```js\nx\n```\n>100 人\n'`）；「`lineStart` 恒 0」→ ⑯ 红（`'甲\n&gt;100 人\n'` 变 `'甲\n>100 人\n'`）。⑰ 两种错写法都不红——它是**反向锁**（锁「上一行正文不许让守卫误保持」），别把它当位置算术的判据，也别因为 ⑰ 不红就以为守卫没问题。
- **CHANGELOG 措辞（H6a）**：只能写「围栏与行内代码里的 `<` `>` `&` 保存后不再被写成实体」。4 空格缩进代码块仍会被转义（`mapOutsideCode` 只认围栏与行内代码，`src/lib/codeScan.ts:14-40`），写「代码里」是过度承诺。impl.md 的已知限制写清两条：缩进代码块、任务列表项首行的 `>`（与 finder-ui F1 一起下轮处理）。
- **本轮有意改变的既有行为**：`html.test.ts:19` 的旧期望（正文 `&lt;` 原样保留）作废，正文实体改为还原成字符。若不改，「`A & B`、`a < b`、`a > b` 静默写坏」无解——planner 明确选「还原」这一边，理由是本轮实测的静默改字节范围比原报告大得多。tester 复核时按这条判，不算回归。
- **混写文档的已知限制（critic §五-5）**：`original` 里出现某实体的字面写法时，该类**整篇**跳过解码；同一篇里既写 `&lt;` 又写裸 `&` 时，裸 `&` 那一处继续留在 `&amp;`（今天也是 DIFF，不算新回归），tester 不要计回归。

---

### T2（P1，数据安全）自动保存在「还有没保存的改动」对话框开着时不写盘

**为什么**：用户点了「不保存」，内容仍留在 `甲.md` 上；对话框还挂着「还没保存」的旧文案而 `dirty` 已被清成 `false`（findings-bug 第 2 条，`.tmp/e2e-r41-bug-i.log`）。

**改动文件 / 函数**：只改 `src/App.tsx`。

- 新增 5 个 ref：`pendingSwitchRef`、`pendingConfirmRef`、`closeRequestedRef`、`closeGuardOpenRef`、`settingsOpenRef`（与 `dirtyRef`、`savingRef` 同区，`:614` 附近；后三个目前只有 state：`settingsOpen` 在 `:365`、`closeRequested`/`closeGuardOpen` 在 `:501-502`）。
- `runAutoSave` 的守卫（`:3156`）**五个条件全改读 ref**：`if (pendingConfirmRef.current !== null || pendingSwitchRef.current !== null || closeRequestedRef.current || closeGuardOpenRef.current || settingsOpenRef.current) return`。`useCallback` 依赖数组保留 state（其它分支仍在用）但不靠它做守卫。
- 新增一个 effect：这五个**任一**变真时 `cancelAutoSaveRef.current()`；**全空**时若 `dirtyRef.current` 为真再 `scheduleAutoSaveRef.current()`（否则「取消」后再也不自动保存）。
- 用 ref 同步：不要在每个 `setPendingSwitch(...)` 调用点手写 ref（全项目实际 **6 处**：`:2179`、`:2422`、`:2527`、`:2535`、`:2833`、`:2881`，容易漏），改成**一条** effect 一次赋五个 ref：`useEffect(() => { pendingSwitchRef.current = pendingSwitch; pendingConfirmRef.current = pendingConfirm; closeRequestedRef.current = closeRequested; closeGuardOpenRef.current = closeGuardOpen; settingsOpenRef.current = settingsOpen }, [pendingSwitch, pendingConfirm, closeRequested, closeGuardOpen, settingsOpen])`，声明在上面那条并集 effect **之前**。（revision=2：一条 effect 赋五个比五条少写 4 处、也少一个漏同步的口子，plan-review §五-4 的「effect 顺序依赖」直接消失。）

**实施步骤**

1. 先跑 `.tmp/e2e-r41-bug-i.mjs`（先 `node .tmp/reset.mjs 9222`），把 `## i0`、`## i1`、`## i2` 粘进 `impl.md` 当改前。
2. 加 5 个 ref + 同步 effect + 并集 effect，改守卫（五处 state 换 ref）。
3. 重跑（**复制成 `.tmp/e2e-r41p-t2.mjs`，截图改 `shots/round-41/t2-dialog-blocked.png`、`t2-after-discard.png`**，不要覆盖 `bug-i1-*.png`、`bug-i2-*.png`）。
4. 同脚本加三段（revision=1，H4；同一假工作区种子，见 `.tmp/r30-fsa.mjs`）：
   - `## t2-cancel-resumes`：打字 → 开「新建」对话框 → 点「取消」（`App.tsx:5168`）→ 等 2.6 s → `甲.md` **应含**新句子（自动保存必须恢复）；同时断言 dialog 已关。
   - `## t2-saved-and-switch`：打字 → 开「新建」→ 点「保存并切换」（`App.tsx:5174`）→ `甲.md` 含新句子、`dirty:false`、当前文档是 `未命名.md`（别为了拦而拦死显式保存）。
   - `## t2-settings-open`：打字 → 点工具栏「设置」（`App.tsx:4520`）→ 等 2.6 s → `甲.md` **不含**新句子；关设置后再等 2.6 s → **应含**（恢复）。
5. CHANGELOG 一条。
6. 宿主 `close-request` 路径浏览器态没有（没有 host）：impl.md 记 UNVERIFIED，补测口径写「`node scripts/host-smoke.mjs` 加一条：打开 `CloseGuardDialog`（或先点关闭窗口触发）后等 2.5 s 读 `/__doc`，字节应与触发前相同」。

**验收标准**

- `## i0`：`dialog` 非空、`dirty:true`。
- `## i1`（2.6 s 后）：`dialogStillOpen:true`、`dirty:true`、`甲.md` 字节 **不含**「不该被保存的一句」。
- `## i2`（点「不保存」后）：`甲.md` 字节等于原种子、`未命名.md` 不存在。
- `## t2-cancel-resumes`（点「取消」后 2.6 s）：`甲.md` **含**新句子（自动保存恢复，这条必须有，别只测「拦住」）。
- `## t2-saved-and-switch`：`甲.md` 含新句子、`dirty:false`、切到 `未命名.md`。
- `## t2-settings-open`：设置开着 2.6 s 后 `甲.md` 不含新句子；关掉后 2.6 s 应含。
- 宿主 `close-request`：UNVERIFIED（浏览器态没有 host），补测口径见步骤 6。
- 门禁：`npx tsc --noEmit` 0；`npm test` 28 个文件 0 fail；`npm run verify` PASS；E2E 控制台 0 错误。
- 截图：`shots/round-41/t2-dialog-blocked.png`（对话框开着、状态栏不出现「已自动保存」）、`t2-after-discard.png`。

**风险与对策**

- 对话框长期开着 → 自动保存一直不跑：这是**期望行为**（用户正在做选择），点「保存并切换」会显式保存；关对话框后靠新 effect 重新排队（`## t2-cancel-resumes` 就是在锁这条）。
- **五个条件一起改，别只改 `pendingSwitch`（revision=1，H4）**：缺陷根因是「计时器捕获调度那一刻的 `runAutoSave` 闭包」（`:3223-3230` + `:3206-3221`），`closeRequested` / `closeGuardOpen` / `settingsOpen` 读 state 时同一闭包陈旧问题照样成立——宿主 `close-request`（`:3464-3466`）→ 排队 effect（`:3277-3282`）打开 `CloseGuardDialog`（按钮「取消 / 保存草稿并关闭 / 放弃并关闭」，`CloseGuardDialog.tsx:44-52`）全程没有 `cancelAutoSave`，2 s 计时器会带着旧闭包写盘，用户点「放弃并关闭」时字节已经在盘上。只监听 `pending*` 的 effect 不会自愈。
- 不扩面：`shortcutsOpen` 不在 `:3156` 的守卫里（findings 没证），本轮**不动**；`saving` 的关键路径已由 `savingRef.current` 兜（`:3153`），也不动。改完 `useCallback` 依赖数组仍含这些 state，行为等价。
- 旧脚本 `.tmp/e2e-r41-bug-d.mjs` 的 `## d1-autosave-dialog` 也覆盖这条，可作第二判据（它会从「已写盘」变「未写盘」，属预期翻转，要在 impl.md 说明，不要当回归）。

---

### T3（P1，用户可见收益）查找加「区分大小写 / 整词」开关

**为什么**：`Ctrl+F` 是每天用的路径；`findAll` 与单测早已支持 `caseSensitive`，只是调用点写死 `false`（`src/App.tsx:1794`，`src/lib/find.ts:3`），整词在库里根本没有字段（findings-typora 第 1 条）。Typora 的查找条右侧有 `Aa` 与整词按钮。

**改动文件 / 函数**

- `src/lib/find.ts`：`FindOptions` 扩为 `{ caseSensitive: boolean; wholeWord: boolean }`；`findAll` 在候选命中上按「两端字符都不是 `[A-Za-z0-9_]`」过滤（中文没有词边界，整词开关对中文等于不生效——写进按钮 `title`）。
- `src/lib/find.test.ts`：现有 11 条用例不用逐条改，只改 `INSENSITIVE` / `SENSITIVE` 两个常量的字面量（各补 `wholeWord: false`）；新增 3 条。
- `src/components/FindBar.tsx`：第一行加两个 toggle 按钮 `Aa` / `ab`，带 `aria-pressed` 与 `title`（按钮文字即无障碍名）。本轮不加快捷键（宿主已关浏览器加速键，新增组合键要另测冲突）。`disabled` 行为、Esc/Enter 逻辑、`unavailableReason` 一律不动。
- `src/App.tsx`：加 `findCaseSensitive`、`findWholeWord` 两个 state（`:418-422` 一带），传进 `findAll`（`:1794`）并补依赖数组；`<FindBar>`（`:4677`）传 4 个新 props。不持久化（会话内开关，与 Typora 一致），在 impl.md 写明。
- `src/styles.css`：复用现有 **`.find-bar button`** 样式（`:1849`；critic §五-2 更正，不是 `.find-row button`），选中态加 `.is-on`（accent 底/字，与侧栏选中一致），约 6 行。
- `README.md`：**revision=1 不再由 T3 改**——`:83` 的「29 项」与 `:101` 的句首 `288,411 B（−21.0%）` 移到 §五 下轮做；只剩测试文件数/条数由 tester 按 `npm test` 实测统一改（`:120`、`:158`、`STATE.md:27`）。

**实施步骤**

1. 先跑改前证据（新脚本 `.tmp/e2e-r41p-t3.mjs`，种子 `# State\n\nstate 与 STATE，还有 states。\n`）：`Ctrl+F` 输入 `state` → `.find-count` 为 `1 / 4`，截图 `shots/round-41/t3-find-before.png`。
2. 改 `find.ts` + 单测，`node --experimental-strip-types src/lib/find.test.ts` 先单独过。
3. 改 `FindBar.tsx` + `App.tsx` + CSS，跑 `npx tsc --noEmit`。
4. 重跑脚本（**数字按 revision=1 改对，见验收的口径说明**）：默认 `1 / 4`；只点 `Aa` → `1 / 2`；再点 `ab` → `1 / 1`；再关 `Aa`（此时只剩整词）→ `1 / 3`；再关 `ab` → `1 / 4`；`aria-pressed` 随之翻转；查 `zzz` → `.find-count` 文本 `无结果`。
5. 数字对账的归属（revision=1 移出两条）：`README.md:83` 的「29 项」与 `README.md:101` 的句首 `288,411 B（−21.0%）` 移到 §五 下轮做（findings-ship S2/S3），**本轮不动**；`README.md:120`、`README.md:158`、`STATE.md:27` 的测试文件数/条数由 tester 按 `npm test` 实测统一改（T1 之后是 **28 个文件**）。
6. CHANGELOG 一条（含「区分大小写 / 整词」用户可见说明）。

**验收标准**

- E2E：`1 / 4`（默认）→ 只按 `Aa` `1 / 2` → 再按 `ab` `1 / 1` → 再关 `Aa` `1 / 3` → 再关 `ab` `1 / 4`；两个按钮 `aria-pressed="true"/"false"` 与 `.is-on` class 一致；`zzz` 时 `.find-count` 严格等于 `无结果`；Esc 仍只关查找、焦点回正文（回归第 35 轮行为）。
- 数字口径（revision=1，H3）：种子 `# State\n\nstate 与 STATE，还有 states。` 查 `state`，默认 4 处（`State`/`state`/`STATE`/`states` 里的 `state`）；`findAll` 是**子串匹配**（`src/lib/find.ts:17-45`），`caseSensitive` 只改大小写、**不做词边界**，所以只开 `Aa` 是 **2** 处（独立 `state` + `states` 里的 `state`），只开整词是 **3** 处（`states` 被过滤）。本轮复跑 `.tmp/critic-r41-findcounts.mjs` 实测 4 / 2 / 1 / 3 / 4。**不要为了让断言变成 `1 / 1` 去把区分大小写改成整词**——那是产品行为错误。
- `find.test.ts` 新增 3 条：①整词下 `state` 不命中 `states` ②整词下 `state` 命中独立单词 ③中文查询在 `wholeWord: true` 下与原行为一致（不因没有词边界而失配）。
- 替换路径不回归：`全部替换` 仍用同一个 `matches` 数组（源码模式锁定文案仍在）。
- 门禁：`npx tsc --noEmit` 0；`npm test` **28 个文件** 0 fail；`npm run verify` PASS（gzip 增量记实测）；E2E 控制台 0 错误。
- 截图：`shots/round-41/t3-find-before.png`（`1 / 4`）、`t3-find-toggles.png`（两个开关按下、`1 / 1`）。

**风险与对策**

- `.tmp/e2e-r41-typora-a.mjs` 对查找条按钮是**记录**不是 assert（critic §五-2 实查），新按钮只会改记录值，属预期，不需要迁就脚本；若别的旧脚本按「5 个按钮」断言，先改脚本再判产品（AGENTS §8）。
- `find.ts` 的 `FindOptions` 是必填两字段：全项目只有 `App.tsx:1794` 一处调用，改完 `tsc` 会指出漏改。
- 整词边界只在 ASCII 词字符上判，纯中文不受影响；按钮 `title` 要写明这条，避免用户以为开关坏了。

## 四、执行顺序、冲突与纪律

1. **顺序**：T1（`src/lib/html.ts`、`codeScan.ts`、`risk.ts`、`package.json`，不碰 `App.tsx`）→ T2（`App.tsx` 自动保存区）→ T3（`App.tsx` 查找区 + `FindBar`）。T2 与 T3 都改 `App.tsx`，**同一时间只允许一个代理动它**；一个 executor 串行做天然满足。若调度要并行，必须按「T1 独立、T2+T3 合并给同一人」切。
2. **每完成一个任务就跑该任务的门禁**，不要攒到最后。类型检查用 `npx tsc --noEmit`；需要产物用 `npx vite build --outDir .tmp/build-r41`（`dist/` 只由根代理串行构建，避免并发清空）。
3. **不要覆盖别角色证据**：`shots/round-41/` 里的 `bug-*`、`t1-table-typing.png` `t2-find.png` `t3-source-mode.png`…（finder-typora 的 `t*`）、`ship-*`、`r41-ui-*` 都是本轮只读证据。新脚本一律 `.tmp/e2e-r41p-*.mjs`，新截图一律 `shots/round-41/t1-*` / `t2-*` / `t3-*`（注意与 finder-typora 的 `t1-`…`t6-` 重名风险：用 `t1-code-html.png` 这类带后缀的名字，不要用 `t1.png`）。
4. **改 `.tmp/*.mjs` 用 write/edit 工具**，不要用 PowerShell 替换（中文会变 ANSI，AGENTS §8）。
5. **每个任务先跑「改前」再改**，把命令输出贴进 `impl.md`；任何「测不到」写 UNVERIFIED 并给补测方法。
6. **不发版**：`package.json` 的 `version` 不动（H2 只改 `scripts.test`，这是门禁落地点，不算发版）；CHANGELOG 只往 `## Unreleased` 追加；`release/` 一个字节不动；不 push。
7. 收工由 tester 更新 README（`现在能做什么/不能做什么`、首屏 gzip 实测、测试文件数/条数）、`docs/iteration/STATE.md`（轮次表第 41 行、待办池、下一轮优先）、被推翻的结论（第 40 轮「代码围栏里的真 HTML 标签不修」在 T1 后改写为已修）。

## 五、本轮不做（附理由与归属）

| 项 | 来源 | 为什么本轮不做 | 归到哪 |
| :--- | :--- | :--- | :--- |
| 1 MB 载入 110 s（marked 扩展 O(n²)，P0） | finder-code F1/F4 | 两个候选方案都要产品决策或高风险改造：①「> 256 KB 直接进源码模式 + 可见提示」改变用户可见行为（`AGENTS.md` §1：加/砍用户可见能力要产品负责人点头）；②分块 lex 的等价性（松列表、跨空行 HTML 块）未验证，属 ADR 级改动。本轮已把归因做实（99% 在 `lexer.lex`、`startBlock` 里两处 O(剩余长度)），**下轮先请产品负责人二选一** | 产品负责人裁决；裁决后单独一轮 |
| 每键整篇 `serializeDocument`（P1） | finder-code F2/F5 | 与 T2 同文件不同区，但脏检查改 ref + 150 ms 核对会碰撤销回基线的语义，回归面比 T2 大；本轮预算已超线（45–48 min），排不下 | 下一轮（可与 F1 的方案一起） |
| 每次选区变化遍历两遍（P1） | finder-code F3 | 只有行号证据、未实测，先补测再改 | 下一轮 |
| 多行 / 含 `&` 的注释与行内标签（P2） | findings-bug 第 3 条 | T1 的实体解码已顺手覆盖「含 `&` 的单行注释/标签」；剩下的多行注释是**换行归一化**（`<!-- a\nb -->` → 换行位置变化），要 source-aware 的空白对齐，M 级且有误还原风险 | 下一轮（先补 `!` 前缀守卫版设计） |
| 字数明细「句」全文值与选区值不一致（P2） | findings-bug 第 4 条 | 纯口径统一（`textBetween` vs `textContent`），但本轮 3 个任务已满；改动 2 行，下轮必做 | 下一轮 P2 第一项 |
| Tab 缩进把段落变成代码块（P1） | finder-ui F1 | 三种修法（block 属性 / 全角空格 / Tab 还给焦点）都是**可见写作行为**变更，须产品负责人定；且与 T1 的「4 空格围栏」判定同族，修完 T1 再动更稳 | 待产品负责人三选一，下一轮 |
| 主题切换不重画 Mermaid、表格工具条、焦点框、`aria-pressed`、插入菜单语义、`live region`、24×24、H2/H3 行高、1024 列宽（P2/P3） | finder-ui F2–F10 | 收益真实但都在 P2/P3，排在 3 个 P1 之后；其中「工具栏按钮没有按下态」（F5）与本轮 T3 的开关样式可共用 `.is-on` 类，下轮一起做省一次样式改动 | 下一轮 UI 批 |
| README 测试文件数 23→27、下载页缺 WebView2、`verify-installer.ps1:77` 中止、setup 图标、SHA256 写死版本（P2） | findings-ship S1/S4/S5/S6 | 全是零风险文案/脚本小修，但本轮预算已超线（45–48 min）排不进；S5 修完能把「安装 → 卸载 → 保留用户数据」从 UNVERIFIED 恢复成可用，价值最高 | 下一轮（S5 优先） |
| 表头行 + Enter 建表、Markdown 自动配对、拼写检查、源码行号、`--`→en dash、专注提示（P2） | finder-typora 2–7 | P2，且自动配对要碰输入法/列表/单波浪号三条刚修的线（finder 自己建议单独一轮） | 下一轮起按收益排序 |
| `docs/typora-gap.md` 缺项 11→15 | finder-typora 第 8 条 | 要同时改 `typora-gap.md`、`README.md:83`、`AGENTS.md` §6 三处，还要判断 4 条新行的分节，属内容判断而非机械对账；本轮 T3 已把「29→30」这一行也移出（见下表新增行），下轮一次改齐三处 | 下一轮（一次改齐三处） |
| `README.md:83` 的「已有 29 项」→30、`README.md:101` 句首 `288,411 B（−21.0%）` 与同句句尾 290,723 B 矛盾 | findings-ship S2/S3（revision=1 从 T3 第 5 步移出） | T1 的 `&gt;` 守卫 + H4 的三段补测加了约 8 min，为腾出时间先移出这两条零风险文案（**revision=2 实测账仍超线 45–48 min，见 §一**）；`docs/typora-gap.md:7` 与 `AGENTS.md` §6 本来就写 30，增量链 284,529→290,723 的算术也对，改法已备好（`:83` 改 30；`:101` 句首改成「从 364,960 B 降到 **284,529 B（第 30 轮）**」，句尾不动） | 下一轮与 S1/S4/S5/S6 一起做（S5 优先） |
| 4 空格缩进代码块里的 `<` `>` `&` 仍被转义、任务列表项首行的 `>` 不在守卫里 | critic H6a + revision=1 实测 | `mapOutsideCode` 只认围栏与行内代码（`src/lib/codeScan.ts:14-40`），缩进代码要 source-aware 的判定，与 finder-ui F1（Tab 缩进语义，须产品负责人定）同族；任务列表首行实测不产生 blockquote（`.tmp/rev-r41-probe-tasklist.mjs`），不进守卫也安全 | 下一轮，与 F1 一起 |
| 生产包 / 宿主里的同一路径复测 | findings-bug/release UNVERIFIED | 需要真机双击与宿主；本机沙箱只能静态检查 | 真机/CI |

## 六、门禁与证据清单（本轮统一口径）

- 每个任务：`npx tsc --noEmit` → `npm test` → E2E → 截图。
- 改过 `src/` 必跑 `npm run verify`（build + 首屏字节门）；T1 改了序列化/修复链，**必跑** `npm run roundtrip`（rich 5/7 source 7/7）。
- 首屏 gzip 现状 **290,723 B**（第 40 轮实测；内部预算 310,000 / 硬线 320,000，余 29,277 B）。T1+T3 预计 +200～600 B，仍在预算内；实测值由 tester 写 `README.md:101`（只改「当前 N B / 距硬线余 N B」这半句）与 `STATE.md`；句首 −21.0% 那条下轮改，见 §五。
- 测试现状 27 文件 345 条（`package.json:15` 是 27 条显式清单，不是 glob）；T1 新建 `risk.test.ts`（+3）**并把 `package.json:15` 末尾追加一条**、`html.test.ts` 改写 1 条 + 新增 16 条口径（⑬ 一条含 5 处断言，含 H7 的 4 处 amp 与 H8 的 3 条多行）、T3 +3，预计 **28 文件、约 360 条**，**以 `npm test` 输出为准**（`npm test` 应跑 28 个文件），由 tester 统一改 `README.md:120`、`README.md:158`、`STATE.md:27` 三处。
- **工时口径（revision=2）**：本轮不是 35 min 能装完的量（§一 的实测账 45–48 min），执行代理按 §一 的砍单顺序自保，**不许把没跑过的断言写成 PASS**；超出预算时优先把实际进展与日志写进 `impl.md` 再交根代理。
- 截图只进 `shots/round-41/t1-*.png`、`t2-*.png`、`t3-*.png`；finder 证据目录不动。
