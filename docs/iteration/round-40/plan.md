# 第 40 轮计划（planner）

- 轮次：40 · 轮前 `startSha=504dedd22b1133c7629bc1a437ca24b8a8889322`（`504dedd` = 当前 HEAD）· 报告目录 `docs/iteration/round-40/` · CDP 端口 9222
- 输入（全部已读）：`docs/iteration/round-40/findings-{bug,typora,ship,code,ui}.md`、`plan-review.md`、`STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`git log -8`、`docs/iteration/round-39/plan.md`
- 角色边界：planner 只读，除本文件外不改任何文件。产品代码由执行代理按本文实施。
- 版本政策：**本轮不发版**。不 bump `package.json`（仍 `0.32.1`），CHANGELOG 写进 `## Unreleased（第 29–40 轮，未发版）` 一节末尾（`docs/CHANGELOG.md:5`，标题由「29–39」改成「29–40」，见 revision=2）。
- 计划者实测（只读探针，未改产品代码）：`.tmp/planner-r40-probe{,2,3,4,5,6,7}.mjs`、第一版修订的 `.tmp/rev40-probe-shapes.mjs`、`.tmp/rev40-probe-stability.mjs`、`.tmp/rev40-scratch-{plan,fix,callsite,candidateB}.ts`，以及 **revision=2 新增**的 `.tmp/rev40b-{probe-htmlcodeaware,probe-mathsafe,probe-final,probe-gate}.mjs`（输出同名 `.txt`）与 `.tmp/rev40b-scratch-codeScan.ts`（tsc exit 0）。本文件里标「实测」的结论都来自这些探针；执行代理可以直接复跑（`.tmp/` 已被 git 忽略，不会进仓库）。

> **revision=1（planner-revision · 2026-11-17）** — 按 `docs/iteration/round-40/plan-review.md` 的 3 条 P1 + 3 条 P2 逐条修订。**任务结构不变**（仍是 T1/T2/T3 三个任务，没有新增任务、没有扩大范围）。逐条：
> - **H1（P1）** `repairTildes` 不再全文 `replace(/\\~/g,'~')`，改成**围栏 + 行内代码感知**（revision=2 起改为 `codeScan.ts` 的 `mapOutsideCode`，见下），代码围栏与行内代码里的 `\~` 不再被改；新增单测锁住（§T1 改动 1、测试、风险①）。
> - **H2（P1）** `collapseBlankParagraphs` 改为**只对正文**调用（`joinFootnotes(collapseBlankParagraphs(reused), footnotes)`），并把规则从「压所有连续空行 + 无条件去文首尾空行」收窄成「**含整行 `&nbsp;` 的空行段截断到第一个 `&nbsp;` 之前**」；脚注块、`# 标题\n\n\n\n正文。`、围栏内、用户手写 `&nbsp;` 一律不动（§T3 改动 1/2/3、验收 2）。
> - **H3（P1）** 计划原来给的 `manager:{instance:{use:(config:unknown)=>unknown}}` 照抄**过不了 tsc**：实测不仅 `TS2339: Property 'lexer'…`，而且**在真实调用点还会 `TS2345`（`MarkdownManager` 赋不进去）**——只补 `this` 类型也修不好。改成从 `MarkdownManager['instance']['use']` 的**参数类型反推** marked 的 extension 配置，`del` 只返回 `Del | false`（实测与「返回 text token」14 例输出逐条相同），`this.lexer` 由 marked 自己的 `.d.ts` 校验（§T1 改动 1）。
> - **H4（P2）** 删除线的 DOM 是 **`<s>` 不是 `del`**（`node_modules/@tiptap/extension-strike/dist/index.js:32-38` 的 `renderHTML` 返回 `["s", …]`），验收第 3 条的 `del` 计数改成 `.ProseMirror s` + `textContent`（§T1 验收 3）。
> - **H5（P2）** 删掉 `App.tsx:1136` 的 `document.title='Sidelight'` 后，`scripts/host-save-acceptance.mjs:249/272/360` 三条断言过期；本轮 T3 里同步改（改成与同一次读取的 `docName` 比对），并写明验证命令（§T3 改动 4b）。
> - **H6（P2）** 预算与砍法提前：T1 必做两条 P1（tilde + HTML 注释），`[toc]` 降为**余量项**；T2 截图 4 → 3；`tsc` / `npm test` 在任务过程中先跑（§5、§4）。
> - 另外并入 `plan-review.md` §三 的事实纠正：`:721` 只有**一行** `document.title`（不是两行）、`html.test.ts` 既有 **10 条**（不是 4 条）、T1 之后 `App.tsx` 行号会漂移（按内容定位）、`repairToc` 只按整行锚定（CHANGELOG 措辞改成「整行 `[toc]`」）、「未闭合 `~~`」本轮已补实测。

> **revision=2（planner-revision · 2026-11-17，第二次修订）** — 按 `docs/iteration/round-40/plan-review.md`（revision=1 复审：2 P1 + 4 P2）逐条修订。**任务结构不变**（仍是 T1/T2/T3；不新增任务、不扩大范围），新增代码只落在 T1：一个新纯模块 `src/lib/codeScan.ts` + 两条 repair + 两处调用点。本轮修订自跑只读探针：`.tmp/rev40b-probe-{htmlcodeaware,mathsafe,final,gate}.{mjs,txt}`（纯 import 产品模块，未改产品代码）与一次 `tsc`（`.tmp/rev40b-scratch-codeScan.ts`，exit 0）。下面标「实测（rev2）」的都出自这些输出。逐条：
> - **H7（P1）** `html.ts:1` 只放宽字符类会把**用户原文里的字面实体**改成真注释/真标签：围栏、行内代码、正文「要写成 `&lt;!--` 备注 `--&gt;` 才不会变注释」三类今天 SAME、放宽后 DIFF（且最后一类存盘后该段渲染消失）。按审查 1 号修法：`repairHtml(markdown, original?)` ① 代码/公式感知（与 `repairTildes` 共用新模块 `codeScan.ts`）；② `!` 分支只在 `original` 里存在**同一条未转义片段**时还原（`original.includes('<' + inner + '>')`），`original` 缺失不做 `!` 分支；两处调用点都传原文（`serializeDocument.ts:52` 的 `options.original`、`App.tsx:900` 的 `rawTextRef.current`；**在 App 里 original 要先读、再算 body**）。实测（rev2）：5 类字面实体全部 SAME、真注释/真 DOCTYPE 全部 SAME、`a &lt; b` 不动、`original=null` 与今天逐字节相同；顺带修好「围栏里的字面 `&lt;kbd&gt;` / `&lt;!DOCTYPE html&gt;`」两条今天 DIFF 的字节；`html.test.ts` 既有 10 条全绿。
> - **H8（P1）** `fenceMap` 只认行首空白后的围栏，不认块引用前缀，`> ```js … \~ … ``` ` 今天 SAME、套修法后 DIFF。修法：`codeScan.ts` 的 `mapOutsideCode` 判围栏前先 `replace(/^(?: {0,3}> ?)+/, '')`（只用于判定，输出用原行）；单测补 1 条引用块围栏；风险①改写；两条 repair 共用一份实现（不再各写一份）。
> - **H8b（同一类的回归，实测（rev2）新发现）**：`repairTildes` 还会改**公式里的 `\~`** —— `$a \~ b$`、`$\~{n}$`（KaTeX 的 tilde accent）、多行 `$$` 块三种今天 SAME，不护就 DIFF（`.tmp/rev40b-probe-mathsafe.txt` 的 `noMath` 列）。修法：`mapOutsideCode(..., protectMath)` 跳过行内 `$…$` 与 `$$` 块公式，`repairTildes` 传 `true`；`repairHtml` 不传（保持今天的字节行为）。实测加上这一段后**所有公式用例与今天逐字节相同**，正文 `\~` 仍照修、引用块围栏仍 SAME。
> - **H9（P2）** T3 单测第 5 条期望多一个换行（照抄必红，执行代理最坏会去「修」函数补换行、破坏 `applyTrailingNewlines` 的尾部口径）：期望改成 `"# 标题\n\n正文。\n\n\n"`（**3 个换行**），备注末尾空行由调用方 `applyTrailingNewlines` 收（§T3 测试 5）。
> - **H10（P2）** T1 的 E2E 种子/断言/截图绑死了余量项 `[toc]`（砍掉余量项后必红）：必做种子去掉 `[toc]` 行、断言只覆盖注释与单波浪号、截图更名 `p1-tilde-comment.png`；`[toc]` 单独一条**可选**断言（做了余量项才加）+ 可选截图 `p1-toc.png`；§5 砍法补「砍 `[toc]` 时同步删种子/断言/截图里的 `[toc]`」。
> - **H11（P2）** T3 证据只引 `.tmp/rev40-probe-stability.mjs` 的「A: truncate-at-nbsp」（函数名 `truncateAtNbsp`）；`rev40-probe-shapes.mjs` 的 §2/§7 是另一条 `narrowCollapse`（会删文首 `\n\n`，正是 H2 要保留的字节），已在探针 §2/§7 前加一行「已被方案 A 取代，别照抄」，§T3 第 1 步写明「与本文件 §T3 代码块逐字一致」。
> - **H12（P2）** §5 顺延顺序写死（4 步，超时按序执行，不许自行决定），并把 H7/H8/H8b 的实测工时算进基线。
> - 并入审查 §三 的一处建议：`docs/CHANGELOG.md:5` 的标题「第 29–39 轮」改「第 29–40 轮」（本轮条目就挂在这一节下，不改旧条目）。

## 0. 一句话

5 份发现共 **28 条**（bug 2 / typora 6 / ship 4 / code 6 / ui 10），其中 P1 共 **4 条**（typora#1 单波浪号、typora#2 HTML 注释、ui#1 预览无排版、code#1 1 MB parse 222 s）。本轮做 **3 个任务**（T3 是 35 分钟预算内的追加项，砍法见 §5），全部落在「用户当场看见或文件当场被改坏」的路径上：两处保存字节损坏（P1×2）、只读预览排版全丢（P1，连续第 3 轮顺延后必须做）、以及两条字节/身份 P2（`&nbsp;` 空段落、窗口标题不跟随当前文档）。**不动 `release/`、不 push、不发版。**

## 1. 取舍说明（为什么是这 3 个）

| 候选 | 本轮处理 | 理由 |
| :--- | :--- | :--- |
| typora#1 `H~2~O` 存成 `H~~2~~O`（P1，数据损坏） | **T1** | 打开已有稿再保存就改坏字节，是本轮最重的可信问题；修法已用探针验证（`manager.instance.use` 覆盖 marked 的 `del`，实测 11/12 例逐字节相等，唯一 DIFF 是计划已声明不修的多行注释） |
| typora#2 `<!-- -->` 存成 `&lt;!-- --&gt;`（P1，数据损坏） | **T1** | 字符类一格加 `!`，但必须配「代码感知 + 原文判定」（H7）才不带新回归；修复面与 #1 同一条链（共用 `codeScan.ts`），合一个任务最省验证成本 |
| typora#3 `[toc]` 存成 `\[toc\]`（P2） | **T1 余量项** | 与 callout 标记同一类「序列化器加的转义」，`escapes.ts` 已有同型函数与测试，顺手 3 行；但它是 P2，按 H6 降到「两条 P1 全绿且还有 ≥5 分钟再做」 |
| ui#1 预览没有排版容器（P1，第 39 轮 F1 仍未修） | **T2** | 只读视图是「交付物」，现在字体/行高/限宽/表格/引用全丢；纯 CSS + 一个 class 改名，无数据风险 |
| ui#4 字数明细面板 941px（P2，2 轮未修） | **T2** | 两行样式（`maxWidth` + `overflow-wrap`），与 T2 同一个截图脚本 |
| bug#2 空段落写成字面 `&nbsp;`（P2，字节污染） | **T3** | 污染 `.md`、别的渲染器会看见 `&nbsp;`；纯函数 + 单测，探针已验证「含 `&nbsp;` 的空行段 → 1 个空段落」在开头/中间/末尾三种位置都稳定 |
| bug#1 标题不跟随当前文档（P2） | **T3** | 一个 effect 统一标题来源 + 删 4 处手写 + 删 1 行重复 `show`；与本轮 E2E 同一脚本 |
| ui#2 Mermaid 切主题不重绘（P2，新） | 顺延 | 要改缓存键 + 主题监听 + 配色接 CSS 变量，M；与第 38 轮遗留「SVG id 按实例唯一」同属 Mermaid 批次，单独一轮 |
| ui#5 设置末段被 sticky 页脚压住（P2） | 顺延 | 需要先判定 sticky 与滚动容器的关系并量两个视口，比 T2 的另两项风险高；与 ui#6 焦点环一起做 |
| ui#3 单句段落误报「模型没按约定格式回」（P2，新） | 顺延 | 属模拟流协议（`ai.ts` 单句分支补 `meta`），与真模型路径文案要一起定，单独立项 |
| ui#6–#10 焦点框 / 表格工具条 / 插入菜单语义 / 按下态 / 命中区 | 顺延 | 纯外观与可访问性，排在数据与预览后面；焦点环与 F5 同批 |
| typora#4 表格对齐与行列重排（P2） | 顺延 | 碰表格序列化 + `tableReuse` 签名，回归面大，需要独立验收空间 |
| typora#5 复制为 Markdown（P2） | 顺延 | 碰剪贴板，要单独 e2e 判据（跨块选区未测，见 findings-typora §10） |
| typora#6 `docs/typora-gap.md` 计数 11→15（P2 文档） | 顺延 | 纯文档；等 T1/T2 的能力变化定稿后与 README 计数一次改，避免同轮改两遍 |
| ship S1 setup.exe 用 NSIS 默认图标（P2） | 顺延 | 要重打安装包并提取图标（隔离根打包约 8–10 分钟），本轮预算不够 |
| ship S2 `verify-installer.ps1:77` 中止（P2） | 顺延 | 与 S1 同一批「打包脚本」小任务，一次做只跑一次打包 |
| ship S3 WebView2 运行时文案、S4 `SHA256SUMS` 写死版本 | 顺延 | 纯文案，2 分钟能改，但**本轮不做**：T1–T3 已占满预算，且这两条要与 S1/S2 一起进同一份发布文档复核（下一轮 5 分钟小任务） |
| code#1 1 MB 多段落载入 222 s（P1）/ code#2–#6 | 顺延 | 第 39 轮才把 parse 段定位到 108.5 s（单遍）；下一步必须先拆 parse 内部三段（3 处 DEV 埋点）再决定动不动第三方库，取数一次 4 分钟起，**不能塞进本轮**。下一轮单独立项，数据直接用 `round-40/findings-code.md` 的 F1 表 |
| 第 38/39 轮遗留：Mermaid SVG id、表格 `colwidth` 导出、宿主 `/__asset` | 顺延 | 与第 39 轮判断一致；宿主相关沙箱验不了 |

> 排序依据（`AGENTS.md` §4 / `common.md`）：**稳定性 > 核心功能 > 体积优化 > 节省 Token > 工作速度**。T1、T3 属数据安全，T2 属用户可见收益，没有「加能力」项，也没有内部重构项。

## 2. 全局约定（三个任务都适用）

- 环境：dev server 固定 `http://localhost:5175`（不另起、不重启；`5173` 是僵尸 server）。CDP 只用 9222；**不启动 Edge、不 kill msedge、不 `browser.close()` 整个浏览器**。每次 E2E 前 `node .tmp/reset.mjs 9222`。
- 自写 Playwright 脚本放 `.tmp/e2e-r40-tN-*.mjs`，连接方式抄 `scripts/acceptance.mjs`（`chromium.connectOverCDP('http://127.0.0.1:9222')`）；结尾 `page.close()` 后 `process.exit(0)`。截图在脚本里 `page.screenshot({ path: 'shots/round-40/…' })`；**不要用 `scripts/shot.mjs`**（它是固定交互脚本，会改文档并依赖 9222 的单一标签页）。
- **行号会漂移**：T1 要在 `App.tsx:75-77` 附近加 import、并在 `setMarkdown` 里加一行，T3 要动的 `:1084/:1136/:2333/:2512-2513/:2614` 全在它后面（≥ +2 行）。**T3 动手时按内容定位**（`document.title`、「已新建 …」的 `show(...)`、`docNameRef.current =`），不要按本文的行号硬改。
- 构建纪律（`STATE.md` 决策 2026-11-15）：执行期**不要跑 `npm run build`**（写 `dist/` 会和根代理撞）；类型检查用 `npx tsc --noEmit`，要产物用 `npx vite build --outDir .tmp/build-r40`；首屏门用 `node scripts/measure-first-screen.mjs --dir .tmp/build-r40 --target 310000`。最终 `npm run build` 由根代理串行跑。
- 只读代码得出的结论不算证据：每条验收贴命令输出、日志路径或截图。测不了写 UNVERIFIED。
- 不 push、不建 Release、不改 `release/`；不新增运行时依赖。
- 产出：执行代理写 `docs/iteration/round-40/impl.md`（每个任务一节：改动、红/绿证据、门禁输出、**「做了 / 砍了 / 顺延」三栏（H12）**、UNVERIFIED）；**不改 `docs/iteration/STATE.md`**（由根代理更新）。
- 本轮**不改** `docs/typora-gap.md` 与 README/AGENTS 的能力计数（`typora#6` 是顺延项，见 §1）；只在 CHANGELOG 写本轮修复，避免计数与下一轮文档任务打架。
- CHANGELOG：每个任务完成后在 `docs/CHANGELOG.md` 的 `## Unreleased（第 29–40 轮，未发版）` 末尾加 2–4 行，不改旧条目（标题「29–39」顺手改「29–40」，本轮条目就挂在这节下）。
- 体积：首屏 gzip 现状 **290,021 B**（内部 310,000 / 硬线 320,000）。本次预期增量 < 1,000 B（CSS 改名 ±0、两个纯函数模块 + 少量 import，gzip 预计 +300–500 B）。**不得为压数字砍功能**；超硬线 320,000 才是失败。注：`roles/planner.md` 里写的「≤286,000 B 是硬门」是**过期口径**（第 35 轮已换挡，现状 290,021 B 就已高于它）；本计划按 `common.md`（2026-11-17 产品负责人）与 `STATE.md` 的 310,000 / 320,000 执行。
- 门禁（收官串行）：`npx tsc --noEmit` → `npm test` → `npm run roundtrip`（必须仍是 `rich 5/7 source 7/7`）→ `npx vite build --outDir .tmp/build-r40` + `measure-first-screen.mjs`。**`tsc` 与 `npm test` 在任务过程中就各跑一次**（H6），不要等三个任务全写完。

---

## T1（P1×2 + 余量 P2，数据保护）单波浪号、HTML 注释（+ 余量 `[toc]`）：打开→保存不再改坏这些字节

**用户收益**：Typora 迁移用户最常见的写法（`H~2~O` 下标、`<!-- 备注 -->` 注释，余量项里的 `[toc]` 目录标记）现在只要打开再 `Ctrl+S` 就被改写成 `H~~2~~O`、`&lt;!-- --&gt;`、`\[toc\]`。T1 后这些字节逐字节不变；`~~删除线~~` 不受影响，**代码围栏、行内代码、引用块围栏、公式里的 `~`/`\~` 一个字节都不动**，用户原文里本来就是字面实体（讲转义的段落、代码样例）也不会被改成真标签。**这是本轮唯一会改用户文件字节的修复，P1 优先级最高。**

**证据（第 40 轮真跑）**：`docs/iteration/round-40/findings-typora.md` §1/§2/§3；截图 `shots/round-40/t1-rich-literal.png`、`t2-source-after-parse.png`。计划者探针实测（当前 HEAD）：

| 输入 | 现在保存成 | 探针 |
| :--- | :--- | :--- |
| `H~2~O 与 ~~删除线~~。` | `H~~2~~O 与 ~~删除线~~。` | `.tmp/planner-r40-probe.mjs` A 行 |
| `温度 25~ 度。`（未配对单个 `~`） | `温度 25\~ 度。` | 同文件 I 行（**本轮顺带修**） |
| `<!-- 给编辑看的备注 -->` | `&lt;!-- 给编辑看的备注 --&gt;` | 同文件 D 行 |
| `[toc]` | `\[toc\]` | 同文件 E 行 |

整链改前/改后对照（`.tmp/rev40-probe-shapes.mjs` §6，含 `repairFootnoteRefs`/`repairMath`/`reuseTables`/`applyTrailingNewlines`）：E2E 种子两条今天都是 `DIFF`（`&lt;!-- 给编辑看的备注 --&gt;` / `\[toc\]` / `H\~2\~O`），套上本计划的修法后两条都是 `SAME`。

**根因（已核实）**
- 单波浪号：marked（`@tiptap/markdown@3.34.0` 内置 17.0.6）按 GFM 允许**单个 `~`** 成删除线，解析成 `strike` 后序列化写 `~~`。序列化器还会把正文里所有普通 `~` 转义成 `\~`（探针 I 行），所以还要一条「把 `\~` 还成 `~`」的 repair。
- 注释：`src/lib/html.ts:1` 的 `ESCAPED_TAG = /&lt;(\/?[a-zA-Z][^&\n]*?)&gt;/g` 只认字母与 `/`；解析前 `escapeHtmlForParse`（`html.ts:22`）已经把 `<!` 转成 `&lt;!`，还原时匹配不到。
- `[toc]`：marked 把它当普通文字，序列化器把 `[` 转义；与 callout 的 `\[!note\]` 完全同型，`src/lib/escapes.ts` 里已有同型还原函数。

**改动文件 / 函数**

1. **新增 `src/lib/codeScan.ts`（共享 helper，H7+H8）与 `src/lib/tilde.ts`**（都是纯模块，Node 可单测）。先写 1a 再写 1b：两条 repair 共用 1a，别再各写一份。

   **1a. `src/lib/codeScan.ts` 按下面这份逐字写**（已实测 `npx tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck --allowImportingTsExtensions .tmp/rev40b-scratch-codeScan.ts` → **exit 0**；字节行为见 1b 末的实测（rev2））：

   ```ts
   import { fenceMap } from './risk.ts'

   /** 块引用前缀：`> ```js` 也是围栏。判定前先去掉（只用于判定，输出仍用原行） */
   const BLOCKQUOTE_PREFIX = /^(?: {0,3}> ?)+/
   const INLINE_CODE = /(`+)([\s\S]*?)\1/g
   /** 行内公式：`$` 后不能是空白、`$` 前不能是空白（与 math.ts 的 isMathBody 同一口径） */
   const INLINE_MATH = /(?<!\\)\$(?=\S)[^$\n]*?\S\$/g
   const BLOCK_MATH = /^\s*\$\$/

   /**
    * 逐行跳过代码围栏、行内代码（`protectMath` 时再跳过公式），只把剩下的片段交给 fn。
    * 围栏/代码/公式里的内容一个字节都不动：repairTildes 与 repairHtml 共用这一份实现。
    */
   export function mapOutsideCode(
     markdown: string,
     fn: (segment: string) => string,
     protectMath = false,
   ): string {
     const lines = markdown.split('\n')
     const stripped = lines.map((line) => line.replace(BLOCKQUOTE_PREFIX, ''))
     const fences = fenceMap(stripped.join('\n'))
     // fenceMap 会把孤立的 \r 也当换行；行数对不上时退化成「不认围栏」
     const fenced = fences.length === lines.length ? fences.map((item) => item.fenced) : lines.map(() => false)
     let inBlockMath = false
     return lines
       .map((line, index) => {
         if (fenced[index]) return line
         const text = stripped[index].trim()
         if (inBlockMath) {
           if (text.endsWith('$$')) inBlockMath = false
           return line
         }
         if (protectMath && BLOCK_MATH.test(stripped[index])) {
           if (!text.slice(2).includes('$$')) inBlockMath = true
           return line
         }
         return mapOutsideInlineSpans(line, fn, protectMath)
       })
       .join('\n')
   }

   function mapOutsideInlineSpans(line: string, fn: (segment: string) => string, protectMath: boolean): string {
     const spans: [number, number][] = []
     for (const match of line.matchAll(INLINE_CODE)) {
       const at = match.index ?? 0
       spans.push([at, at + match[0].length])
     }
     if (protectMath) {
       for (const match of line.matchAll(INLINE_MATH)) {
         const at = match.index ?? 0
         if (spans.some(([start, end]) => at >= start && at < end)) continue
         spans.push([at, at + match[0].length])
       }
     }
     spans.sort((a, b) => a[0] - b[0])
     let out = ''
     let last = 0
     for (const [start, end] of spans) {
       if (start < last) continue
       out += fn(line.slice(last, start)) + line.slice(start, end)
       last = end
     }
     return out + fn(line.slice(last))
   }
   ```

   - 语义：**围栏内（含引用块围栏）、行内代码内一律不交给 `fn`**；`protectMath=true` 时**公式内也不交**（`repairTildes` 传 true，`repairHtml` 不传）；其余片段逐行交。拆分与拼回都用 `split('\n')` / `join('\n')`：CRLF 文本里 `\r` 留在行尾，原样保留。
   - `fenceMap` 的语义（`risk.ts:36-46`）：围栏标记行本身 `fenced:false`、围栏内的行 `fenced:true`；标记行的判定正则只认行首空白，所以 1a 先去掉 `> ` 前缀（H8）。
   - 退化分支（`fences.length !== lines.length`，只在孤立 `\r` 时触发）保留：退化成「不认围栏」。
   - 唯一已知边界：**代码内容里自己写一行 `> ``` `**（代码样例讲 markdown）会让围栏提前闭合，之后的 `\~` 被还成 `~`（实测（rev2）：`"```\n> ```\nx \\~ y\n```"` → `"```\n> ```\nx ~ y\n```"`）。不在本轮范围，写进风险①。

   **1b. `src/lib/tilde.ts`**：tokenizer 部分按下面这份写（签名上一版已实测 `.tmp/rev40-scratch-candidateB.ts` → exit 0，真实 `MarkdownManager` 调用点也编译通过）：

   ```ts
   import type { MarkdownManager } from '@tiptap/markdown'

   import { mapOutsideCode } from './codeScan.ts'

   /** marked 的 extension 配置类型：从 @tiptap/markdown 的公开 getter 反推，不手写第二份（写错就 tsc 红） */
   type MarkedExtensionConfig = Parameters<MarkdownManager['instance']['use']>[0]

   const installed = new WeakSet<object>()

   /** 只让成对的 ~~…~~ 当删除线；单个 ~ 一律交回 marked 的 text 规则（GFM 默认允许单 ~） */
   export function disableSingleTildeStrike(manager: Pick<MarkdownManager, 'instance'>): void {
     if (installed.has(manager)) return
     installed.add(manager)
     const config: MarkedExtensionConfig = {
       tokenizer: {
         del(src: string) {
           const pair = /^~~(?=[^\s~])([\s\S]*?[^\s~])~~(?=[^~]|$)/.exec(src)
           if (pair) return { type: 'del', raw: pair[0], text: pair[1], tokens: this.lexer.inlineTokens(pair[1]) }
           // 单个 ~ / 未闭合 ~~：不消费，交回 marked 的后续规则（text 会吃掉这个字符）
           return false
         },
       },
     }
     manager.instance.use(config)
   }
   ```

   - **为什么是这个签名（H3）**：`config` 不能写 `unknown`。实测两种写法都红：只加 `this` 类型时 `.tmp/rev40-scratch-plan.ts`（照抄审查报告里的签名）报 `TS2339: Property 'lexer' does not exist …`、exit 1；即使把 `this` 补上，`.tmp/rev40-scratch-callsite.ts` 在**真实调用点**报 `TS2345: Argument of type 'MarkdownManager' is not assignable …`（`unknown` 返回值不满足 marked 的 `false | Del | undefined`）。上面这份用 `Parameters<…>` 反推，`this` 由 marked 的 `_Tokenizer` 类型给（`node_modules/marked/lib/marked.d.ts:348-373` 的 `lexer: _Lexer`、`inlineTokens(src, tokens?) → Token[]`），**不需要 `as any` / `@ts-ignore`**。
   - **不返回 `{ type: 'text' }`**：原计划在「单个 `~`」分支返回 text token，但 marked 的 `TokenizerObject` 只允许 `false | Del | undefined`。实测两种写法在 14 组输入上输出**逐条相同**（`.tmp/rev40-probe-shapes.mjs` §5：单波浪号 / 成对删除线 / 未配对 / 多个未配对 / `~~abc` / `~~~x~~~` / 行内代码 / 围栏代码 / 链接文字 / 加粗里 / `a~b~c` / `25℃~30℃` / 用户写死的 `\~` / 围栏里写死的 `\~`，每例 0–3 ms 结束，无死循环），所以去掉它，换 tsc 绿。
   - `installed` 用 `WeakSet<object>` 去重：`setMarkdown` 每次载入都会调，重复注册会让 tokenizer 越套越深。

   同文件再加 `repairTildes`——**只有一行**，代码感知与公式保护都在 1a 的 `mapOutsideCode` 里（H8/H8b）：

   ```ts
   /** 把「不在围栏、行内代码、公式里」的 \~ 还成 ~（序列化器会把正文里的 ~ 转义） */
   export function repairTildes(markdown: string): string {
     return mapOutsideCode(markdown, (segment) => segment.replace(/\\~/g, '~'), true)
   }
   ```

   - **为什么要 `protectMath=true`（H8b，实测（rev2））**：序列化器会把公式里的 `~` 转义成 `\~`（今天 `$a ~ b$` 存成 `$a \~ b$`，`DIFF`），所以不带保护的 `repairTildes` 会把用户**手写的** `\~` 也还成 `~`：`$\~{n}$`（KaTeX 的 tilde accent，`katex.renderToString('\\~{n}')` 可渲染）今天 SAME、不护就变 `$~{n}$`（公式语义变了），多行 `$$` 块同理。`.tmp/rev40b-probe-mathsafe.txt` 的 `math` 列：加上公式保护后 4 类公式用例（行内 `\~` / 行内 `~` / `\~{n}` / 多行 `$$` 块）与今天逐字节一致；价格写法 `$5 到 $10` 不会被当公式（`isMathBody` 的空白口径），正文 `\~` 仍照修。
   - **代价**：公式里的 `~` 仍会被序列化器写成 `\~`（今天已如此，本轮不修，写进 §6 UNVERIFIED）。
   - 实测（rev2，`.tmp/rev40b-probe-final.txt`）：顶层围栏 `\~` SAME、**引用块围栏 `\~` SAME**（H8）、引用块行内代码 SAME、行内代码 SAME、行内公式 `\~` SAME、`$\~{n}$` SAME、多行 `$$` 块 SAME；正文 `温度 25\~ 度。` → `温度 25~ 度。`（要修的）；**未闭合反引号**（只有开头反引号、没有收尾）会被当正文还原 —— 可接受，写进风险⑧。

2. `src/App.tsx` 的 `setMarkdown`（当前 `:974-996`，`manager` 在 `:979`、`manager.parse` 在 `:984`）：拿到 manager 之后、**`parse` 之前**加一行 `disableSingleTildeStrike(manager)`（import 放 `:75-77` 那一组）。**必须在 parse 前**，否则第一次载入仍是删除线。
3. `src/lib/html.ts`：**两条修法一起做（H7）**，`hasHtml` / `escapeHtmlForParse` 不动（`html.test.ts` 既有 10 条必须仍绿，尤其 `:18-20` 的 `a &lt; b`）：

   ```ts
   import { mapOutsideCode } from './codeScan.ts'

   const ESCAPED_TAG = /&lt;(\/?[a-zA-Z!][^&\n]*?)&gt;/g

   /**
    * 还原被转义的行内 HTML。代码围栏、行内代码里的字节不动（H7）。
    * `!` 开头的（注释、DOCTYPE）只在原文里真的写过同一条时还原：
    * 用户原文里是字面实体（讲转义的段落、代码样例）时不能改成真标签。
    */
   export function repairHtml(markdown: string, original?: string | null): string {
     const source = typeof original === 'string' ? original : null
     return mapOutsideCode(markdown, (segment) =>
       segment.replace(ESCAPED_TAG, (whole: string, inner: string) => {
         if (inner.startsWith('!') && (source === null || !source.includes(`<${inner}>`))) return whole
         return `<${inner}>`
       }),
     )
   }
   ```

   - 字符类与 `escapeHtmlForParse` 的 `[a-zA-Z/!]` 对齐；**不要**顺手加 `?`（`escapeHtmlForParse` 压根不转义 `<?`，还原它没有对应的输入）。
   - `original` 缺失（`null`/`undefined`）时**不做 `!` 分支** = 与今天逐字节相同（实测（rev2）`.tmp/rev40b-probe-final.txt` 的「original 为 null 时不做 ! 分支」SAME）。新建文档第一次保存会走到这个分支，行为与今天一致，不是回归。
   - **为什么不只靠 `original` 判定**：`original` 是全篇 `includes` 判定，同一篇里既写真注释又用同一段文字讲转义（`<!-- 备注 -->` 与 `&lt;!-- 备注 --&gt;` 文本相同）时会把讲转义那段也改成真注释；代码/公式感知把「围栏、行内代码、公式」这一大类先摘掉，剩下的碰撞概率极低，写进风险⑩。
4. 两个 repair 链都要加（**漏一处就会「草稿/基线与保存字节不一致」**），且**两处都要把原文传进 `repairHtml` 的第二个参数**（H7）：
   - `src/lib/serializeDocument.ts:52`：`repairCalloutMarkers(repairHtml(repairMath(repairTildes(repairFootnoteRefs(raw))), options.original ?? null))`；
   - `src/App.tsx:900`（`onUpdate` 的 300 ms 派生链，写草稿的那份）：**先把 `const original = rawTextRef.current` 从下一行提到 body 那行之前**，再写
     `const body = repairCalloutMarkers(repairHtml(repairMath(repairTildes(repairFootnoteRefs(current.getMarkdown()))), original))`
     （现在 `:901` 才读 `original`，顺序颠倒会拿到 `undefined`，`!` 分支恒不还原）。
5. **余量项 `[toc]`（只有还余 ≥5 分钟才做）**：`src/lib/escapes.ts` 追加
   ```ts
   /** 编辑器会把整行的 [toc] 序列化成 \[toc\]；只还原整行（行内出现的见 \[toc\] 说明不动） */
   export function repairToc(markdown: string): string {
     return markdown.replace(/^([ \t]*)\\\[([Tt][Oo][Cc])\\\][ \t]*$/gm, '$1[$2]')
   }
   ```
   然后在 `serializeDocument.ts:52` 与 `App.tsx:900` 两条链的最外层再套 `repairToc(…)`。**做不了就整条顺延**，impl.md 写明「`[toc]` 未做，第 41 轮接」，不要半做（只改一条链）。
6. 测试（`node:test` + `node:assert/strict`，风格照 `src/lib/tableCellBreaks.test.ts`）：
   - 新增 `src/lib/tilde.test.ts`（**必做 ≥13 条**）。用与 `scripts/roundtrip.mjs:4-28` 相同的扩展列表构造 `new MarkdownManager({ extensions })`（`StarterKit, ReusableTable, TableRow, TableHeader, TableCell, TaskList, TaskItem`，表格扩展的 `renderMarkdown` 也要照抄），调 `disableSingleTildeStrike(manager)` 后断言：
     1. `H~2~O` 解析后 `strike` 节点数 0，`serialize` 输出含 `H~2~O` 且不含 `~~`；
     2. `~~删除线~~` 仍是 strike；
     3. `温度 25~ 度。` 经 `repairTildes` 回到原文（`25\~` → `25~`）；
     4. **`~~~` 围栏内的 `\~` 原样**（`repairTildes('~~~\nconst re = /\\~/\n~~~\n')` 逐字节相同）；
     5. **反引号围栏内的 `\~` 原样**；
     6. **行内代码 `` `a\~b` `` 原样**；
     7. 围栏里 `let a = ~b` / `b~2~d` 经整链不被改写（`serialize` 输出 SAME）；
     8. `~~abc`（未闭合）不抛错、输出 `~~abc`；
     9. 链接文字 `[H~2~O](https://example.com)` 不变；
     10. 同一个 manager 调两次 `disableSingleTildeStrike` 不抛错、输出不变；
     11. **引用块围栏 `\~` 逐字节原样（H8）**：`repairTildes('> ```js\n> const re = /\\~/\n> ```\n')` 相同；再加一条嵌套 `> > ```js` 同型（实测（rev2）两条都 SAME）；
     12. **行内公式 `\~` 原样（H8b）**：`repairTildes('公式 $a \\~ b$ 与 $\\~{n}$。\n')` 逐字节相同；
     13. **多行 `$$` 块里的 `\~` 原样（H8b）**：`repairTildes('$$\na \\~ b\n$$\n')` 逐字节相同；再加一条 `repairTildes('价格 $5 到 $10，约 25\\~ 度。')` = `'价格 $5 到 $10，约 25~ 度。'`（价格不是公式，正文照修）。
   - **不要写「新建一个 manager 应该不带覆盖」这类断言**：`MarkdownManager` 未注入 marked 时用的是全局默认实例（`node_modules/@tiptap/markdown/dist/index.d.ts:33`），第一次 `use` 之后所有 manager 都受影响（`plan-review.md` §三.6）。
   - `src/lib/html.test.ts` 追加 **3 条（H7，全部要带第二个参数）**：
     1. 围栏里的字面实体原样：`repairHtml('```\n&lt;!-- 备注 --&gt;\n```\n', '<!-- 备注 -->\n')` 逐字节不变（**原文别处有真注释也不能动围栏里的实体**，这条才真正锁住代码感知）；
     2. 正文里的字面实体原样：`repairHtml('写成 &lt;!-- 备注 --&gt; 才不会变注释。\n', '写成 &lt;!-- 备注 --&gt; 才不会变注释。\n')` 不变；
     3. 真注释还原：`repairHtml('&lt;!-- 给编辑看的备注 --&gt;\n', '<!-- 给编辑看的备注 -->\n')` → `'<!-- 给编辑看的备注 -->\n'`；同型再加 `<!DOCTYPE html>` 一条（原文有）。
     **既有 10 条必须仍绿**（`:18-20` 的 `a &lt; b` 不还原、`:52-57` 的往返断言是底线；它们都不传第二个参数，`!` 分支不生效）。实测（rev2）：`.tmp/rev40b-probe-final.txt` 这 8 个断言全部符合预期。
   - 若做了余量项：`src/lib/escapes.test.ts` 追加 **3 条**：`\[toc\]` → `[toc]`、`\[TOC\]` → `[TOC]`、行内 `见 \[toc\] 说明` 不变。既有 6 条仍绿。
7. `package.json:15` 的 `test` 脚本末尾追加 `&& node --experimental-strip-types src/lib/tilde.test.ts`（**不要重排既有 25 个文件的顺序**）。
8. CHANGELOG（`## Unreleased` 末尾，2–4 行）：「打开→保存不再改写 `H~2~O`（单波浪号）与 `<!-- -->`；`~~删除线~~`、代码围栏/行内代码里的 `~`/`\~`、公式里的 `\~` 不变；原文里本来就是字面实体（讲转义的段落、代码样例）也不会被改成真标签」。做了余量项再加一句「（整行）`[toc]` 不再被转义」。顺手把 `docs/CHANGELOG.md:5` 的标题「第 29–39 轮」改成「第 29–40 轮」（**不改旧条目**）。

**实施步骤**：先写「改前基线」探针（不改产品代码，只用现有导出）：`.tmp/r40-t1-before.mjs` 用 `MarkdownManager` + `escapeHtmlForParse` + `protectMathPairs` + `serializeDocument` 跑下面验收第 3 条的**必做种子**与「末尾加一个字」的变体，输出必须是 2 条 `DIFF`（计划者已用 `.tmp/planner-r40-probe7.mjs` 实测：`&lt;!-- 给编辑看的备注 --&gt;` / `H~~2~~O`，把原样输出贴 impl.md）。→ 写 `codeScan.ts` + `tilde.ts` + `html.ts`（**先 codeScan，两条 repair 都 import 它**）→ 接进两处链与 `setMarkdown`（App 那条注意 original 先读）→ 单测 → 改后同一份逻辑写成 `.tmp/r40-t1-after.mjs`（import 新的 `disableSingleTildeStrike`/`repairTildes`/`repairHtml`），断言 **2 条 PASS（要修的两类）+ 3 条 SAME（围栏里字面实体、正文里字面实体、行内代码里字面实体）**。→ 起 CDP 做应用内 E2E（下条）→ 截图 → CHANGELOG。（实测（rev2）：这 3 条 SAME 用 `.tmp/rev40b-probe-final.txt` 的 `repairHtml` 段可复现；整链的 2 条 PASS 见 `.tmp/rev40b-probe-htmlcodeaware.txt` 的 `fixed` 列。）

**验收标准**

1. `node --experimental-strip-types src/lib/tilde.test.ts`、`… src/lib/html.test.ts` 全过（tilde ≥13 条 + html 新增 3 条；做了余量项再加 escapes 3 条）。
2. 改前/改后对照（有牙）：`.tmp/r40-t1-before.mjs` 输出 2 条 `DIFF`（贴原样输出），`.tmp/r40-t1-after.mjs` 输出 2 条 `PASS` + 3 条字面实体 `SAME`。**不允许只贴改后**（第 35 轮教训）。
3. 应用内 E2E（假工作区，`import { installFakeWorkspace, openFolder, readFakeFile } from './r30-fsa.mjs'`，流程抄 `.tmp/e2e-r40-bug-h.mjs`）：
   - **必做种子**（H10：不含 `[toc]`，砍余量项时不用改）`样张.md` 逐字节 = `# 标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。\n`；
   - 打开后正文里 **`.ProseMirror s` 元素数 = 1**（只有「删除线」），`document.querySelector('.ProseMirror s')?.textContent === '删除线'`；**`H~2~O` 的 `2` 不在 `<s>` 里**。⚠️ **不要数 `del`**：本项目 `Strike` 的 `renderHTML` 返回 `["s", …]`（`node_modules/@tiptap/extension-strike/dist/index.js:32-38`），`.ProseMirror del` 恒为 0，数它必然假红/假绿（H4）。兼容写法：`.ProseMirror s, .ProseMirror del`。
   - 点最后一个正文段落（`.ProseMirror > p` 的最后一个，即「末尾段。」）→ `page.keyboard.press('End')` → 打字 `改`（变成 `末尾段。改`）；
   - `Ctrl+/` 进源码态（此时 `dirty:true`，源码框显示**序列化结果**；未编辑时显示文件原文，不能用来证明修复）：`.source-editor` 的值含 `H~2~O`、`<!-- 给编辑看的备注 -->`，且 **不含** `&lt;!--`、`H~~2~~O`；截 `p1-source-bytes.png`；再 `Ctrl+/` 回富文本；
   - **必须做一次真实保存**：`Ctrl+S` → `readFakeFile(page, '样张.md')` **逐字节 = 种子把 `末尾段。` 换成 `末尾段。改`**；同时断言保存结果 `includes('H~2~O')`、`includes('<!-- 给编辑看的备注 -->')`，且 **0 处** `&lt;!--`、`~~2~~`。如果 headless 下 `End` 没把 caret 送到行尾（落点不同），字节断言改成「内容断言 + 保存前后 diff 只有那一处 `改`」并贴 diff，不允许跳过保存；
   - **`[toc]` 可选断言（只有做了余量项才加，H10）**：种子里追加 `[toc]\n\n` 一行 → 源码态含 `[toc]` 且不含 `\[toc\]` → 保存后 `includes('\n[toc]\n')` → 截图 `p1-toc.png`。没做余量项就整条不写，别留红断言。
   - 控制台 0 error。
4. 回归：`npm run roundtrip` 仍 `rich 5/7 source 7/7`（`fixtures/markdown` 里没有 `~`、没有反引号、没有 `&lt;`，实查 0 命中）；`npm test` 全过、条数 = 320 + 本轮新增（以实际输出为准，写进 impl.md）。
5. 截图（H10 更名）：`shots/round-40/p1-tilde-comment.png`（富文本里 `H~2~O` 无删除线、注释是字面）、`p1-source-bytes.png`（源码态：`H~2~O` / 单行注释原样，无 `&lt;!--`、`~~2~~`）；做了余量项再加 `p1-toc.png`。
6. `npx tsc --noEmit` exit 0。

**门禁**：`npx tsc --noEmit`、`npm test`、`npm run roundtrip`。

**风险**：
① **代码围栏、行内代码、公式里的 `~` / `\~` 不能变**：**顶层围栏、行内代码、引用块围栏（H8）、行内公式与 `$$` 块（H8b）已覆盖**，实测（rev2）今天 SAME、改后仍 SAME（`.tmp/rev40b-probe-final.txt`）；单测第 4/5/6/7/11/12/13 条必须锁住。**不在范围**：代码内容本身含仿围栏行（代码样例里又写 `> ``` `，实测（rev2）它会让围栏提前闭合）、列表项里的围栏（今天 DIFF/改后 DIFF，未被修法进一步改坏）、4 空格缩进代码块。
② 只能让 `~~` 成删除线：`~~abc`（未闭合）实测 SAME、0–3 ms 结束，不会抛错或只吃掉一半 `~`；`return false` 不会让 marked 死循环（14 组输入全部正常结束）。
③ 单行注释以外的**多行注释仍还原不了**（`<!--\n…\n-->` 会被拆成多段，行式正则跨不过；实测 `DIFF`），本轮只保证单行，写进 UNVERIFIED。
④ 注释里有 `&` 时仍还原不了（正则排 `&`，为保住 `a &lt; b` 不误伤）。
⑤ `repairTildes` 会把**正文里**字面 `\~` 的写法也还原成 `~`（`\~` 在 Markdown 里本就等于 `~`，语义等价；**代码与公式里的不再动**），CHANGELOG 记一句。
⑥ 依赖 `manager.instance.use`（marked 17 公共 API）+ `this.lexer`：类型由 marked 自带（`marked.d.ts:348-373`），升级 `@tiptap/markdown`/`marked` 时 `tsc` 或单测会先红。
⑦ `~~~x~~~`（行首三波浪号）本来就被当 `~~~` 围栏（CommonMark 行为，今天也一样，整链输出是一段反引号围栏包着 `x~~~`），不是本轮回归，**不要写进预期断言**。
⑧ 未闭合反引号（`` `a\~b `` 没有收尾）会被当正文，`\~` 会被还原；可接受。
⑨ **公式保护只覆盖「行内 `$…$`」与「`$$` 块」**（H8b）：行内判定沿用 `math.ts` 的 `isMathBody` 空白口径（`$5 到 $10` 不算公式）；`repairHtml` 不传 `protectMath`，保持今天 `$a<b$` 这类写法的字节行为（实测（rev2）SAME）。
⑩ **`repairHtml` 的 `original` 是全篇 `includes` 判定**（H7）：文本不同时能正确区分——实测（rev2，`.tmp/rev40b-probe-gate.txt`）`写成 &lt;!-- 备注 --&gt;；真注释是 <!-- 给编辑看 -->。` 今天 DIFF、改后 **SAME**；但同一篇里既写了一条真注释、又用**同一段文字**讲转义（`<!-- 备注 -->` 与 `&lt;!-- 备注 --&gt;`）时，讲转义那段也会被改成真注释（实测（rev2）`fixed DIFF`，渲染上该段会变成不可见注释）。两种情况今天也都是 DIFF（真注释被转义），本轮只是没有把它们一起修好，写进 §6 UNVERIFIED。
⑪ `original === null`（新建文档第一次保存、`:186-188` 的 `serializeBody` 死路径）时**不做 `!` 分支** = 与今天逐字节相同（实测（rev2）SAME）；这是保守选择，不是回归。
⑫ 性能：`mapOutsideCode` 每次调用多一遍逐行扫描（`fenceMap` + 每行两条正则），保存链与 300 ms 草稿链各一次；量级与既有 `repairFootnoteRefs` 相同，1 MB 文档本轮不实测（写进 §6 UNVERIFIED）。

---

## T2（P1，用户可见）只读预览恢复正文排版：字体、行高、36rem 限宽、表格、引用

**用户收益**：点「预览」现在是另一套排版——标题变成无衬线 32px、正文 16px 无行高、表格 189px 无边框、引用无边线、容器 1212px 贴住侧栏。T2 后预览与编辑态同一套排版（Source Han Serif、17px/1.95、36rem 限宽、表格边框与表头底色、引用左边线）。**这是连续第 3 轮顺延的 P1，必须做。**

**证据**：`docs/iteration/round-40/findings-ui.md` F1；`shots/round-40/r40-ui-10-preview-light.png`、`r40-ui-27-preview-dark.png`；实测数值见 `.tmp/r40-ui-log.txt` 的 `PREVIEW` / `PREVIEW_DARK`。代码：`src/components/PreviewPane.tsx:58-75` 只渲染 `.doc-column.preview-column > article.ProseMirror.preview-pane`，**没有 `.doc-layout`**；`article` 类名没有 `.editor`；全部排版规则挂在 `.editor` 作用域（`src/styles.css:559-754`）。调用点 `src/App.tsx:4884` 也没有外层 `.doc-layout`（`.doc-scroll` 在 `:4809`）。

**改动文件 / 函数**

1. `src/App.tsx:798`：`attributes: { class: 'editor doc-body', … }`（编辑器保留 `.editor`，脚本仍能用）。
2. `src/styles.css`：把**正文排版块**（`:559-752` 共 31 行选择器）与图片两条（`:1780`、`:1787`）的 `.editor` 前缀改成 `.doc-body`；**保留** `:1508` 的 `.focus-mode .editor .is-dimmed` 与 `:1934`（`@media print` 里的 `.editor { max-width:none }`）不动。改名口径：只改 `.editor` 后紧跟空格 / `{` / `:` 的位置（正则 `\.editor(?![-\w])`），不要碰 `.editor-placeholder`（`:267`）。
3. `src/components/PreviewPane.tsx:58-75`：两个 return 都包一层布局并加 `doc-body`：
   ```tsx
   <div className="doc-layout preview-layout">
     <div className="doc-column preview-column">
       <article className="ProseMirror doc-body preview-pane" contentEditable={false} … />
     </div>
   </div>
   ```
   （公式未就绪分支同样包 `.doc-layout.preview-layout > .doc-column.preview-column`。）
4. `src/styles.css:2313` 的「只读预览」段里追加（放在 `.preview-column` 规则附近均可）：
   ```css
   .doc-layout.preview-layout { grid-template-columns: minmax(0, 36rem); }
   .preview-layout .preview-column { padding-bottom: 0; }
   ```
   **必须写两个类**（`.doc-layout.preview-layout`，0,2,0）：`:2399` 的 `@media (max-width:1119px) .doc-layout { grid-template-columns: minmax(0,1fr); padding: 32px 20px 160px }` 是一层类（0,1,0），同权重且在后，会盖掉单层类写法。`.doc-layout` 本身是 `grid; justify-content:center; padding:52px 32px 220px`（`:253-260`），所以单列 36rem 会居中。
5. `src/components/StatsDetail.tsx:18-32` 的 `panelStyle` 加 `maxWidth: '360px'`；`:119` 的长句加 `overflowWrap: 'anywhere'`（只用现有内联样式，不新造类）。目标：1440 下 `941×285` → 约 `360×285`；1024 下不再盖住 92% 宽度。

**验收标准**

1. E2E 量测（新脚本 `.tmp/e2e-r40-t2-preview.mjs`，1440×900 与 1024×700 两档）：
   - 预览态 `.doc-layout.preview-layout` 存在 1 个，`.preview-column` 宽度 **576 ± 2 px**；
   - `.preview-pane h1`：`fontFamily` 含 `Source Han Serif SC`、`fontSize ≈ 31.45px`、`lineHeight/fontSize ≈ 1.35`；
   - `.preview-pane p`：`fontSize 17px`、`lineHeight ≈ 33.15px`（与编辑态同值，脚本里同时读编辑态两列做对比）；
   - `.preview-pane table` 宽度 ≈ 576（±2），`th` 的 `borderWidth` = 1px 且 `backgroundColor` 非透明；`.preview-pane blockquote` 的 `borderLeftWidth` = 2px、`paddingLeft` = 16px；
   - 1024 视口：`.preview-column` 仍 576 ± 2，`documentElement.scrollWidth === clientWidth`（无横向溢出）；顺带记 `scrollHeight`（`.preview-layout .preview-column { padding-bottom: 0 }` 之后 1024 不该被 160px 底部留白撑出多余滚动）。
2. 编辑态不回归：同一脚本读编辑态 `.editor` 的 h1/p 数值，与第 40 轮 findings 的 `TYPO`（h1 31.45/1.35、p 17/33.15）一致；编辑态 `document.querySelectorAll('.editor').length === 1`（`.editor` 仍是脚本的稳定选择器）；`Ctrl+/` 源码态、`Ctrl+F` 查找、`Esc` 焦点回正文不受影响。
3. 字数面板：1440 与 1024 下 `.stats-detail` 宽度 ≤ 360（实测写进 impl.md），面板内「合计/字符/段」不再相隔 900px；`role=dialog`、`aria-label=字数明细`、Esc 关闭后焦点回 `.stats-trigger`（第 30 轮行为不变）。
4. 截图（**3 张**，H6）：`shots/round-40/p2-preview-light.png`、`p2-preview-1024.png`、`p2-edit-unchanged.png`（编辑态对照）。深色预览本轮不单独截图，写进 UNVERIFIED（`.doc-body` 用的都是主题变量 `--font-read`/`--ink`/`--accent-wash`，深色自动跟随）。
5. `npx tsc --noEmit` exit 0；`npm test` 条数不变（本任务不加单测）。

**门禁**：`npx tsc --noEmit`、`npm test`、`npx vite build --outDir .tmp/build-r40` + `measure-first-screen.mjs`（CSS 改名不应有可见增量）。

**风险**：
① `.editor` 是验收脚本的稳定选择器（`scripts/acceptance.mjs:42` 等 20+ 处），**不能删** `.editor` 类；
② `.doc-body` 改名要一次改全（半改会出现「预览里代码块仍无背景」这类半修复），验收时用 `Select-String -Path src/styles.css -Pattern '\.editor(?![-\w])'` 检查只剩 `:1508`、`:1934` 两处（改前对照 **35 行**，两次输出都贴）；
③ 预览的表格 HTML 来自 `editor.getHTML()`，`.tableWrapper` 与 `table` 都在，别在预览里加 `.column-resize-handle` 相关规则（预览没有 widget）；
④ 深色主题只用既有变量，不要写死颜色；
⑤ 预览插图与相对路径解析已有自订阅逻辑（第 38 轮），本次只加类名，不动它。

---

## T3（P2，数据 + 身份；预算内追加项，见 §5）连续空段落不再写成字面 `&nbsp;`；窗口/标签标题始终跟随当前文档

**用户收益**：(a) 在标题前或正文中间连按两次 Enter 再保存，`.md` 里会多一行字面 `&nbsp;`（别的渲染器直接显示这一行）。T3 后这类空段落收成 1 个空段落，字节不再被污染。(b) 改过一次文件名后，以后打开任何文档，浏览器标签/宿主窗口标题都停在改名前那篇的新名字（实测打开 `乙.md` 时是 `键改.md — Sidelight`）。T3 后标题只有一个来源。

**证据**：`docs/iteration/round-40/findings-bug.md` §1/§2；`.tmp/e2e-r40-bug-h.log` 的 `## h1-bytes` = `"\n\n&nbsp;\n\n# 标题\n\n正文。\n"`、`## g1-bytes`（只按一次 Enter 不触发）；`.tmp/e2e-r40-bug-d.log` 的 `## d22-switch-title`；截图 `shots/round-40/p1-empty-paragraph.png`、`p2-tree.png`。

计划者/修订者实测（**H11：只引 `.tmp/rev40-probe-stability.mjs` 的「A: truncate-at-nbsp」段，函数名 `truncateAtNbsp`（`rev40-probe-stability.mjs:44`）**；`.tmp/rev40-probe-shapes.mjs` §1 只是序列化器原始形状，它的 §2/§7 是**另一条** `narrowCollapse`（会删掉文首 `\n\n`，别照抄，探针里已加作废标注）：

```
序列化器原样输出（把 N 个空段落塞进 [h1, p] 文档）：
  开头 x1 = "\n\n# 标题\n\n正文。"                     开头 x2 = "\n\n&nbsp;\n\n# 标题\n\n正文。"
  中间 x1 = "# 标题\n\n\n\n正文。"                     中间 x2 = "# 标题\n\n\n\n&nbsp;\n\n正文。"
  末尾 x1 = "# 标题\n\n正文。\n\n"                     末尾 x2 = "# 标题\n\n正文。\n\n\n\n&nbsp;"
按本计划的收窄规则（只删「含 &nbsp; 的空行段」）：
  开头 x2/x3 → "\n\n# 标题\n\n正文。"  （== 开头 x1 的字节）
  中间 x2/x3 → "# 标题\n\n\n\n正文。"  （== 中间 x1 的字节）
  末尾 x2/x3 → 尾部被 applyTrailingNewlines 收成 "# 标题\n\n正文。"
  两次连续保存字节不变（save2 === save1，三种位置 × 1/2/3 个空段落全部 stable）
今天 SAME、改后必须仍 SAME：`# 标题\n\n\n\n正文。`、脚注块内 `\n\n\n`、围栏内 4 个空行。
```

**改动文件 / 函数**

1. 新增 `src/lib/blankParagraphs.ts`（纯函数，可 Node 单测）。**规则按下面这份写**（H2 的修法；实现见 `.tmp/rev40-probe-stability.mjs:44` 的 `truncateAtNbsp`（方案 A），**与本文件 §T3 代码块逐字一致**；`rev40-probe-shapes.mjs` 的 §2/§7 是另一条 `narrowCollapse`，已标作废，别照抄）：

   ```ts
   const NBSP_LINE = /^[ \t]*&nbsp;[ \t]*$/i
   const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/
   const isBlank = (line: string) => line.trim() === ''

   /**
    * 围栏外：把「含整行 &nbsp; 的空行段」截断到第一个 &nbsp; 之前——连续空段落因此收成 1 个空段落，
    * 不再往 .md 里写 &nbsp;。段里没有空行（用户手写的 &nbsp; 段落）、围栏内、其它多空行一律不动。
    */
   export function collapseBlankParagraphs(body: string): string {
     const lines = body.split('\n')
     const out: string[] = []
     let fence: string | null = null
     let index = 0
     while (index < lines.length) {
       const line = lines[index]
       const marker = FENCE_LINE.exec(line)
       if (fence) {
         out.push(line)
         if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null
         index += 1
         continue
       }
       if (marker) {
         fence = marker[1]
         out.push(line)
         index += 1
         continue
       }
       if (isBlank(line) || NBSP_LINE.test(line)) {
         let end = index
         let hasBlank = false
         let firstNbsp = -1
         while (end < lines.length && (isBlank(lines[end]) || NBSP_LINE.test(lines[end])) && !FENCE_LINE.test(lines[end])) {
           if (isBlank(lines[end])) hasBlank = true
           if (firstNbsp < 0 && NBSP_LINE.test(lines[end])) firstNbsp = end
           end += 1
         }
         const stop = hasBlank && firstNbsp >= 0 ? firstNbsp : end
         for (let cursor = index; cursor < stop; cursor += 1) out.push(lines[cursor])
         index = end
         continue
       }
       out.push(line)
       index += 1
     }
     return out.join('\n')
   }
   ```

   - **不要再做原来的三件事**：不压「围栏外所有连续空行」，不 `replace(/^\n+/,'')`，不 `replace(/\n+$/,'')`（H2：无条件去文首尾空行会把只按一次 Enter 的文首 `\n\n` 删掉，而那条今天逐字节 SAME）。尾部仍由 `applyTrailingNewlines`（`serializeDocument.ts:34`）收。
   - 档位一致性：1 个空段落的形状（`\n\n` / `\n\n\n\n`）今天 SAME，收窄后 2+ 个空段落落到同一形状，所以「按两次 Enter」与「按一次 Enter」保存后字节相同、且二次保存稳定。

2. `src/lib/serializeDocument.ts:54`：`const body = joinFootnotes(collapseBlankParagraphs(reused), footnotes)`（**只对正文**；脚注原文一个字节都不经过它，`footnotes.ts:47-51` 的「块内空行不能丢」保持）。其余不动，`applyTrailingNewlines` 仍在 `:60` 最后。
3. 新增 `src/lib/blankParagraphs.test.ts`（**≥8 条**，全部是纯函数断言，逐字节比）：
   1. 开头 x2：`"\n\n&nbsp;\n\n# 标题\n\n正文。"` → `"\n\n# 标题\n\n正文。"`；
   2. 开头 x3：`"\n\n&nbsp;\n\n&nbsp;\n\n# 标题\n\n正文。"` → `"\n\n# 标题\n\n正文。"`；
   3. 中间 x2：`"# 标题\n\n\n\n&nbsp;\n\n正文。"` → `"# 标题\n\n\n\n正文。"`；
   4. 中间 x3：`"# 标题\n\n\n\n&nbsp;\n\n&nbsp;\n\n正文。"` → `"# 标题\n\n\n\n正文。"`；
   5. 末尾 x2：`"# 标题\n\n正文。\n\n\n\n&nbsp;"` → `"# 标题\n\n正文。\n\n\n"`（**3 个换行，H9**：把 §T3 的函数 1:1 抄出来跑，实际输出就是 3 个换行，见 `.tmp/critic-r40-collapse.txt` 的 `actual`；上一版写 4 个换行会照抄必红。末尾空行由调用方 `applyTrailingNewlines` 收，本函数**不要**去补换行）；
   6. **`"# 标题\n\n\n\n正文。"`（无 `&nbsp;`）原样**（H2 对照，今天 SAME）；
   7. 围栏内 4 个空行原样（```` ``` ```` 围栏）＋ **`"~~~\nA\n\n\n\nB\n~~~\n"` 原样**（同一函数内的 `~~~` 分支；注意整链里序列化器会把 `~~~` 围栏改写成反引号围栏，这条只能测纯函数）；
   8. 围栏内字面 `&nbsp;` 行原样；用户手写孤立 `&nbsp;` 段落（段内无空行，`"第一段。\n&nbsp;\n第二段。"`）原样；脚注块内两个空行原样（`"正文[^1]。\n\n[^1]: 第一段\n\n\n    第二段\n"`）；
   9. 普通文档不变、输出不含 `&nbsp;` 子串。
4. 标题单一来源（`src/App.tsx`；**按内容定位，行号会因 T1 漂移**）：
   - 把 `:719-722` 那个 effect 收成「只更新 `hostDocRef`」：删掉 **`:721` 那一行** `document.title = hostDoc?.ready ? … : 'Sidelight'`（**只有一行**，删前对照：`plan-review.md` §三.3）、保留 `:720` 的 `hostDocRef.current = hostDoc`；
   - 新增 effect（放在 `:704-706` 的 `docNameRef` 同步 effect 附近，并写注释「标题只在这里写」）：

     ```ts
     useEffect(() => {
       document.title = `${docName} — Sidelight`
     }, [docName])
     ```

     说明：`docName` 恒为字符串（`const [docName, setDocName] = useState(initial.name)`，`App.tsx:491`），所以不需要空值分支。
   - 删除 4 处手写标题：`:1084`（宿主 payload 载入）、`:1136`（宿主不可用）、`:2333`（改名成功）、`:2614`（另存为）；
   - 删除 `:2512-2513` 两行完全重复的「已新建 …」`show(...)`，保留一行（改前对照见验收第 4 条）。
   - **4b（H5，必做）**：`scripts/host-save-acceptance.mjs` 的三条断言改成与同一次读取的 `docName` 比对（`stateOf` 已经同时返回 `title` 与 `docName`，`:96-99`）：

     ```js
     // :249（404）与 :272（超过 6 MB）
     check('标题跟随当前文档名', info.title === `${info.docName} — Sidelight`, info.title)
     // :360（保存中切文档）
     check('保存中切文档：标题跟随当前文档名', afterSwitch.title === `${afterSwitch.docName} — Sidelight`, afterSwitch.title)
     ```
     不改 `:128`（`host-doc.md — Sidelight`）与 `:406`（`crlf-bom.md — Sidelight`）：这两条在新单源下仍然成立。验证命令：`node scripts/host-save-acceptance.mjs http://localhost:5175 browser`（它连 CDP 9222，`--only browser` 只跑浏览器段）。⚠️ 这个脚本会往 **`shots/round-06/`**（已跟踪目录）写截图，跑完必须 `git checkout -- shots/round-06/`。
5. `package.json:15` 追加 `&& node --experimental-strip-types src/lib/blankParagraphs.test.ts`。
6. CHANGELOG：两条 —— 「连续空段落保存后收成 1 个空段落，不再往 `.md` 写 `&nbsp;`（文首、正文中间同理；只按一次 Enter 的写法字节不变）」「窗口/标签标题始终跟随当前文档」。

**验收标准**

1. `node --experimental-strip-types src/lib/blankParagraphs.test.ts` 全过（≥8 条）；`npm test` 全过、条数 = 320 + T1 新增 + T3 新增（写进 impl.md）。
2. 改前/改后对照（`&nbsp;`，用现有 `.tmp/e2e-r40-bug-h.mjs`）：
   - 改前 `## h1-bytes` = `"\n\n&nbsp;\n\n# 标题\n\n正文。\n"`（findings 已存，先贴）；
   - 改后同脚本 `readFakeFile` 结果 **逐字节 = `"\n\n# 标题\n\n正文。\n"`**，且 `includes('&nbsp;') === false`，`## h0-dom` 里那两个空段落仍在 DOM。**注意：这条不再是「等于种子 `# 标题\n\n正文。\n`」**——那条期望（findings-bug:77 与本计划上一版验收）要求把文首空行全删掉，会把今天逐字节 SAME 的「只按一次 Enter → `\n\n`」也一起改掉；本轮只保证「不写 `&nbsp;` + 连续空段落收成 1 个空段落」。改后的字节等于「只按一次 Enter」的字节（探针 `开头 x1 == 开头 x2`），这是可对比、可复现的口径。
   - **二次保存稳定**：在改后的文件上重开（同一假 FS）→ `Ctrl+S` → 字节与第一次保存相同（探针 save2 === save1）。
   - 追加中间位置：种 `甲.md = '# 标题\n\n正文。\n'` → 光标放标题与正文之间 → Enter×2 → `Ctrl+S` → 字节 = **`"# 标题\n\n\n\n正文。\n"`**（1 个空段落的形状），0 处 `&nbsp;`。
   - 围栏回归：种 `围栏.md`，内容为「反引号围栏（每边三个反引号）+ `A` + 4 个空行 + `B`」→ 打开 → `Ctrl+S` → 围栏内 4 个空行不被压缩（字节等于种子）。
   - 脚注回归（H2 对照）：种 `脚注.md = '正文[^1]。\n\n[^1]: 第一段\n\n\n    第二段\n'` → 打开 → `Ctrl+S` → 整篇逐字节等于种子（脚注块内 `\n\n\n` 不被压；今天就是 SAME，改后必须仍 SAME）。
3. 标题（假工作区）：打开 `键.md` → 重命名 `键改.md` → 打开 `乙.md` → `document.title === '乙.md — Sidelight'`（改前 `键改.md — Sidelight`，findings `## d22-switch-title`）；`Ctrl+N` 新建后 `document.title === '未命名.md — Sidelight'`；`.doc-name` 文本与标题前缀一致（`stateOf` 式读取）。
4. 死代码：`Select-String -Path src/App.tsx -Pattern 'show\(.已新建 \$\{name\}'` → **1 行**（改前 2 行，先贴改前对照；用 `.` 代替反引号，避免 PowerShell 反引号转义；不要用 `show\(.已新建` 这个宽口径——它会连 `:2394` 的「已新建文件夹」一起算成 3 行）。改完再跑 `git grep -n "document.title" -- src` → **只剩新 effect 一处**（改前 5 处：721/1084/1136/2333/2614）。
5. 截图：`shots/round-40/p3-empty-paragraph-fixed.png`（源码态无 `&nbsp;`）、`p3-title-follows-doc.png`（标签标题 + 树里当前文档）。
6. `npx tsc --noEmit` exit 0。

**门禁**：`npx tsc --noEmit`、`npm test`、`npm run roundtrip`（`frontmatter.test.ts` 与 fixtures 会同时验证空行口径）。

**风险**：
① 围栏识别要覆盖反引号围栏与 `~~~` 围栏，围栏内的空行与字面 `&nbsp;` **绝不能删**（单测锁）；删掉围栏内空行等于改代码块内容。
② 「连续空段落」在文件里不可表示（Markdown 本来也无法表示多个连续空段落，第 22 轮已对**尾部**做过同样处理）：本轮把开头/中间也收成 1 个空段落，CHANGELOG 必须写明（H2）。
③ 有 frontmatter 的文档，正文开头空行由 `joinFrontmatter` 的 `leading` 恢复，别把这条逻辑一起删（roundtrip 会抓）；`original === null`（`serializeDocumentBody`，仅 `App.tsx:186` 的死代码 `serializeBody` 会走到）时末尾换行不再由 `applyTrailingNewlines` 补，本轮不改这个死路径，impl.md 记一句。
④ 标题改动不要碰 `window.__slState` 与宿主标题同步（`host/Program.cs` 没有 `document.title→Form.Text`，宿主窗口标题本轮验不了）；`appliesHostPayload` 的 `docName` 与 `hostDoc.fileName` 在 `fileName` 缺失时会取不同值（`App.tsx:1070` vs `:1073`），属既有行为，impl.md 的 UNVERIFIED 点名。
⑤ 删掉 `:1136` 后，宿主不可用/404/超限状态的标题变成 `未命名.md — Sidelight`——这是「一个来源」的必然结果；对应 3 条脚本断言已在改动 4b 同步改，截图里确认可接受即可。

---

## 3. 交付清单

| # | 交付 | 主要文件 | 截图 |
| :--- | :--- | :--- | :--- |
| T1 | 单波浪号 / HTML 注释（+ 余量 `[toc]`）保真 | `src/lib/codeScan.ts`（共享 helper，H7+H8+H8b）、`src/lib/tilde.ts`(+test)、`src/lib/html.ts`(+test)、`src/lib/escapes.ts`(+test，余量)、`src/App.tsx:75-77,900,setMarkdown`、`src/lib/serializeDocument.ts:52`、`package.json:15` | `p1-tilde-comment.png`、`p1-source-bytes.png`（余量项另加 `p1-toc.png`） |
| T2 | 预览排版容器 + 字数面板宽度 | `src/styles.css:559-752,1780,1787,2313`、`src/components/PreviewPane.tsx:58-75`、`src/App.tsx:798`、`src/components/StatsDetail.tsx:18-32,119` | `p2-preview-light.png`、`p2-preview-1024.png`、`p2-edit-unchanged.png` |
| T3 | `&nbsp;` 空段落 + 标题跟随当前文档 | `src/lib/blankParagraphs.ts`(+test)、`src/lib/serializeDocument.ts:54`、`src/App.tsx:704-722,1084,1136,2333,2512-2513,2614`、`scripts/host-save-acceptance.mjs:249,272,360`、`package.json:15` | `p3-empty-paragraph-fixed.png`、`p3-title-follows-doc.png` |

## 4. 收官门禁（执行代理串行跑，输出贴 impl.md）

```bash
npx tsc --noEmit                              # 任务过程中先跑一次（H6），别等最后
npm test                                      # 25 文件 320 条 + 本轮新增（tilde / blankParagraphs / html / 余量 escapes）
npm run roundtrip                             # 必须 rich 5/7 source 7/7
npx vite build --outDir .tmp/build-r40
node scripts/measure-first-screen.mjs --dir .tmp/build-r40 --target 310000   # 期望 ~290,000–290,600 B；硬线 320,000
```
安装包本轮不重打（`release/` 不动）；首屏以内部 310,000 B 为准，超了先报实测与理由，不许删功能换绿。

## 5. 时间预算与砍法（H6 + H12 修订）

- 35 分钟口径的**基线交付是 T1 + T2**：
  - T1 ≈ 22 分钟（必做 = 单波浪号 + HTML 注释两条 P1：新模块 `codeScan.ts`（围栏/行内代码/公式 + 引用块前缀，H7+H8+H8b）、`tilde.ts`、`html.ts` 两处修法、两处链、`setMarkdown` 一行、tilde ≥13 条 + html 3 条单测、改前/改后探针各 2 分钟、应用内假工作区 E2E + 2 张截图 5 分钟、CHANGELOG）。
  - T2 ≈ 15 分钟（33 处选择器改名 + `PreviewPane` 两个 return + 2 条 CSS + `StatsDetail` 2 行 + **新写双视口量测脚本 ≈8 分钟** + 3 张截图）。
  合计 ≈ 37 分钟，加门禁 ≈ 40–42 分钟。**若按 35 分钟硬线执行**：基线取「T1 + T2 的 1440 量测与 2 张截图（≈12 分钟）」≈ **34 分钟**，把 T2 的 1024 视口量化、`StatsDetail` 宽度与第 3 张编辑态截图**不计入基线**（归顺延第 2 步），跑完再做余量。**超时按下面的顺延顺序执行，不许自行决定顺序**（H12）：
  1. 先砍 `[toc]`（P2）：**同步删掉种子/断言/截图里的 `[toc]`**（H10），impl.md 记「`[toc]` 未做，第 41 轮接」；
  2. 再砍 T2 的 1024 视口量化（只截图 + 记一条「未量测」）与 `StatsDetail` 宽度那 2 行样式（第 41 轮补）；
  3. T3 整段顺延（到第 22/25 分钟还没开始就不做；只剩 6–8 分钟时只做 `&nbsp;` 那半段，标题那半段顺延）；
  4. html 这半段若在 H7 的修法上卡住 >8 分钟 → **整条顺延第 41 轮，只交单波浪号**（H7 的回归不许带上线）；同理 H8b 的公式保护卡住 → **连 `repairTildes` 一起顺延**（可以只交 html 那半段，但不能交会改公式 `\~` 的 `repairTildes`），不许只交一半。
- **T1 与 T2 的预览部分不砍**（两条 P1）；T2 的深色截图已砍到 UNVERIFIED（3 张足够）。
- 任何情况下不删验收项（除上面写明的余量项/顺延项）、不删功能换体积绿。
- impl.md 按「做了 / 砍了 / 顺延」三栏写清（H12），顺延项必须点名「下一轮接哪条」。

## 6. UNVERIFIED（本轮注定测不了，验收报告要写清）

- **宿主窗口标题**：`host/Program.cs` 没有 `document.title → Form.Text` 的同步代码（findings-bug 已核），本轮只验浏览器标签；宿主 `host-smoke` 里加一条留待后续。
- **`scripts/host-save-acceptance.mjs` 改完未跑**（若没跑）：写清命令 `node scripts/host-save-acceptance.mjs http://localhost:5175 browser` 与「跑完 `git checkout -- shots/round-06/`」。
- **真实磁盘写回**：E2E 用假 FSA 句柄 + 源码态字节；真 `Ctrl+S` 写盘（含 BOM/CRLF）仍按既有宿主路径，本轮不覆盖。
- **多行 HTML 注释**（`<!--\n…\n-->`）：行式还原跨不过换行，实测 DIFF，本轮不修。
- **注释内含 `&`**：为保住 `a &lt; b`，还原正则排除 `&`，本轮不修。
- **有 `&`/多行的注释在真实文档里的分布**：没有样本统计。
- **正文里字面 `\~`**：`repairTildes` 会把它还原成 `~`（语义等价），本轮不单独验证；代码、行内代码、引用块围栏、公式里的 `\~` 已由单测锁住。
- **公式里的 `~` 仍会被转义成 `\~`**：序列化器今天就把 `$a ~ b$` 写成 `$a \~ b$`；本轮只保证 `repairTildes` **不再改公式里的 `\~`**（H8b），这个转义本身不修，未单独验证。
- **同一段文字既是真注释又讲转义**（H7）：`repairHtml` 的 `original` 是全篇 `includes` 判定，同一篇里文本完全相同的两种写法区分不了——实测（rev2，`.tmp/rev40b-probe-gate.txt`）`<!-- 备注 -->` +「写成 `&lt;!-- 备注 --&gt;` 才不会变注释」这一段改后仍是 `DIFF`（讲转义那段变成真注释）；文本不同时已修好（同文件另一例 `fixed SAME`）。
- **1 MB 文档的 `mapOutsideCode` 耗时**：未测。它给保存链与 300 ms 草稿链各加一遍逐行扫描（`fenceMap` + 每行两条正则），量级与既有 `repairFootnoteRefs` 相同。
- **代码围栏/行内代码里的「真」HTML 标签**（`<kbd>Ctrl</kbd>` 这类代码样例）：今天就被 `escapeHtmlForParse` 改成 `&lt;kbd>Ctrl&lt;/kbd>`（`>` 没被转义成 `&gt;`，`repairHtml` 匹配不到），实测今天 DIFF、改后仍 DIFF（未进一步变坏）；本轮只保证**字面实体**不再被改成真标签，这一条不修。
- **列表项里的围栏代码、代码内容里含仿围栏行**：不在本轮范围（见 T1 风险①），引用块围栏已覆盖。
- **深色主题下的预览排版**：本轮只截浅色 + 1024（3 张），深色跟随主题变量，未单独量测。
- **真机 125%/150%/200% 缩放、真实 IME、屏幕阅读器实录、macOS**：与第 38/39 轮一致。
- **生产包口径的首屏与运行**：本轮只跑 `vite build` 的 gzip 门与 dev server E2E。

## 7. 给 critic 的核对点

1. T1 的 `disableSingleTildeStrike` 是否用「`Parameters<MarkdownManager['instance']['use']>[0]` + `return false`」这份签名（`npx tsc --noEmit` 绿、无 `as any`）、是否**只在 parse 前调用**、是否有 WeakSet 去重（管理器对象级）。
2. T1 的两条 repair 是否**共用 `src/lib/codeScan.ts` 的 `mapOutsideCode`**：`repairTildes` 传 `protectMath=true`、`repairHtml` 不传；`mapOutsideCode` 是否先去掉 `> ` 前缀再 `fenceMap`（H8）、是否保留行数不一致的退化分支、是否跳过行内 `$…$` 与 `$$` 块（H8b）。单测第 4/5/6/7/11/12/13 条是否在；`repairTildes` 是否同时进了 `serializeDocument.ts:52` 与 `App.tsx:900` 两条链（漏一处 → 草稿与保存字节不一致）。
3. T1 的 `repairHtml` 是否 ① 代码感知（围栏 + 行内代码）、② `!` 分支只在 `original.includes('<'+inner+'>')` 时还原、③ `original` 缺失不做 `!` 分支；两个调用点是否都传了原文（`serializeDocument.ts:52` 的 `options.original ?? null`、`App.tsx:900` 在算 body **之前**读 `rawTextRef.current`）；`hasHtml` / `escapeHtmlForParse` 是否没动（`html.test.ts` 既有 **10 条**必须仍绿，尤其 `a &lt; b`），新增的 3 条是否都带第二个参数。
4. T1 验收是否用 `.ProseMirror s`（不是 `del`）+ `textContent === '删除线'`。
5. T2 的 `.editor` → `.doc-body` 是否**保留 `.editor` 类**（脚本依赖）、改名后 `styles.css` 里 `.editor` 是否只剩 `:1508`、`:1934` 两处（改前 35 行）；`.preview-layout` 是否用两个类写（否则被 `:2399` 的媒体查询盖掉）。
6. T2 是否只碰样式与 `PreviewPane` 的包裹层，没有动 `assetResolve`/`assetImage`/KaTeX 的既有逻辑。
7. T3 的 `collapseBlankParagraphs` 是否**只作用于正文**（`joinFootnotes(collapseBlankParagraphs(reused), footnotes)`）、是否只处理「含整行 `&nbsp;` 的空行段」、是否**不再**压其它连续空行与文首尾空行；`applyTrailingNewlines` 是否仍在最后一步（`frontmatter.test.ts` 与 roundtrip 会抓）；脚注块字节是否仍逐字节 SAME。
8. T3 的标题是否只有一个写入点、`git grep -n "document.title" -- src` 是否只剩 1 处、`:2512-2513` 重复 `show` 是否删净、`hostDocRef` 的同步是否保留；`host-save-acceptance.mjs` 的三条断言是否已同步。
9. 三个任务是否仍在预算内；§5 的顺延顺序（H12 四步：先砍 `[toc]` 含种子/断言/截图 → 再砍 T2 的 1024 量化与字数面板宽度 → T3 整段顺延（或只做 `&nbsp;` 半段）→ H7/H8b 卡住就整条顺延）是否**按序**执行、有没有偷偷砍掉别的验收项；impl.md 是否有「做了/砍了/顺延」三栏。
10. 是否遵守「不发版、不 bump 版本、CHANGELOG 写 `## Unreleased`（标题改 29–40）、不 push、不改 `release/`」。
