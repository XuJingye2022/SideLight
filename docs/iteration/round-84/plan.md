# 第 84 轮计划（单轮 A，3 任务）— rev.2

修订（`plan-review.md` 6 条）：**H1** A3 换「行内语法输入规则」修本轮新 P1（`findings-ui.md:5-9`，暂记 **B-214**），撤回「3 条回归已全修」；**H2** A1 加「真打字」判据 + 3 负向单测；**H3** 原 A3 三门作废、改「前序落盘后文件数」；**H4** 串行 **A3→A2→A1**、同一执行者禁止并行、A1 后复核 `App.tsx:976-1019`；**H5** 首存拦 1/9；**H6** A2 断读回文件字节、宽度量 `documentElement`。

环境：起 `5760913`；dev 5175=200；CDP 9222–9226 无监听，ego 54280 可用；各试 1 次，连不上记 UNVERIFIED。日志 `.tmp/r84-*`、截图 ≤2；不 push、不改 `release/`、不加依赖、0.32.1。预检：`npm test` 47 文件、首屏 304,492 B（余 5,508）、`tsc` 0、roundtrip 6/8、首存拦 1/8；B-157 真机过，B-159 真机几何 UNVERIFIED。

## A1 B-124 手打链接存成字面（串行 3）

InputRule 收不到收尾键（收尾 `]`/`)` 走 skip：`smartTyping.ts:96-101`、`:166-170`）；探针 `.tmp/r84-planner-appendtxn.log` 证纯选区事务也调 appendTransaction。文件：新 `src/lib/linkInput.ts`（`typedLink`+`linkInputPlugin`+`LinkInput`）、`linkInput.test.ts`、`fixtures/markdown/09-link-title.md`；改 `App.tsx:1019`、`package.json`、BACKLOG:108。
① `typedLink({docChanged,insertedLength,oldRangeText,newRangeText})`：未改文档 → null；`insertedLength≥new.length`（整段写入=粘贴）→ null；`old===new`（点段尾，**H2**）→ null；`old` 已完整匹配 → null；再匹配 `/(?<!!)\[([^\[\]\n]+)\]\(([^()\s]+)(?:\s+"([^"\n]*)")?\)$/`，拒 `javascript:/data:/vbscript:`、图片、含 `` ` `` `*` `_` `<` `>` `~` `|` `$` 的文本。② plugin：判 composing、空选区、`spec.code`、link/code mark；取光标前 ≤1024 字、`insertedLength`（step slice 文本长）、`oldRangeText`（越界给 null）；命中 `addMark` 成 link，二次因已有 mark 退出。③ App 注册；09 进 roundtrip。④ 单测 ≥13（含 3 负向；带 link 序列化 = 目标行）。
验收：① 两探针字节一致 ② ≥13 条含 3 负向（点段尾/整段粘贴/旧字面链接插字）0 fail ③ `npm test` **49 文件**（A3 47+A2 1+本 1，来源：本任务加 test 链）④ roundtrip rich **7/9**、source **9/9**、首存拦 **1/9** ⑤ `verify`≤310,000 B ⑥ `git grep appendTransaction -- src` 0→≥1 ⑦ 浏览器 1 次：手打后 `Ctrl+S` 文件=该行+换行且无 `\[`，旧文档点到字面链接段尾不动。门禁 test/verify/roundtrip；风险：先 `)` 尾判再跑正则，PM 不调 appendTransaction 时退路挂 `:166-170` skip 分支。

## A2 B-142 撤销被下条通知顶掉（串行 2）

病根：`show()` 与保存提示都 `setNotice`（`App.tsx:465`、`:3211`、`:4102`），单槽 notice 是唯一恢复入口（`:2987`）。文件：`App.tsx`、`StatusBar.tsx:45`、`styles.css:1957`、新 `src/lib/restoreEntry.ts`+测试、`package.json`、BACKLOG。
① `nextRestoreEntry(current,event,payload?)`（deleted/restored/dismissed/tree-changed/workspace-changed）+`restoreLabel`。② 删除置 `{name,path,node,trashName}`；新建/重命名/开合文件夹 clear；notice、保存、打字、`refreshTree` 不清。③ 抽 `restoreDeleted()`，toast 与状态栏共用；`.status-restore`（已删除 a.md+撤销+×，`min-width:0`、省略号、按钮 24×24）。④ 单测 ≥8；B-142 fixed。
验收：① ≥8 条 0 fail ② `npm test` **48 文件**（A3 47+本 1，来源：新增 `restoreEntry.test.ts`）③ `verify`≤310,000 B ④ `restoreDeleted` 在 `App.tsx` ≥3 处、`.status-restore` 在 StatusBar 与 styles ⑤ 浏览器 1 次 4 步：删 b.md→toast+chip 同在；打字+`Ctrl+S`→toast 变「已保存」而 chip 可点；点 chip 撤销→树回 b.md、chip 消失、**读回文件字节=删除前脏正文**（**H6**，不假设切文档）；再删→新建→chip 消失 ⑥ 宽度：1000×620 **必测**（先试 `setDeviceMetricsOverride`，本浏览器不生效就记 UNVERIFIED 并写试过哪条路、不重试），1440 用当前视口，两档量页面 `documentElement.scrollWidth-clientWidth≤1` 与按钮 ≥24×24。门禁 test/verify；风险：状态栏变宽、删除后切文档（`:2966`/`:2971`）不得当 tree-changed、25 分钟不够先交必测项。

## A3 B-214 行内语法手打不渲染（串行 1，本轮新 P1）

证据：`findings-ui.md:5-9` 真机（ego 54280，HEAD）手打 `==红== 与 ^上^ 与 ~下~` 后 `.sl-eq/.sl-sup/.sl-sub` = **0/0/0**，重解析才 1/1/1；根因 `inlineSyntax.ts:99-120` 只有 `parseHTML`/`parseMarkdown`，`git grep addInputRules -- src` 0；开关默认开（`settings.ts:67`），与 B-158 无关。文件：`src/lib/inlineSyntax.ts`、`inlineSyntax.test.ts`（既有）、`App.tsx:958`、BACKLOG（补登 P1→fixed）。
① `SyntaxSpec` 加尾锚定 `typed`（Tiptap finder 拿到整块光标前文本，可做左邻守卫）：模板 `/(?<![\\=])==(?![=\s])([^=\n]+?)(?<!\s)==$/`；`^`/`~` 同形，`~` 加 `(?!~)`/`(?<!~)` 让 `~~删除线~~` 归 Strike。② `syntaxMark(spec,isEnabled)` 加 `addInputRules()`→`markInputRule({find:t=>isEnabled()?typedMatch(spec,t):null,type:this.type})`（`typedMatch` 回 `{index,text,replaceWith}`，内容必是子串不触发 warn）；`inlineSyntaxMarks(isEnabled=()=>true)`。③ `App.tsx:958` 传 `()=>inlineSyntaxRef.current`（与解析同闸门，关态手打保持字面）。④ 单测 20→≥28：**按光标状态喂前缀**（规则只在匹配结束于光标时触发，planner 已用 `.tmp/r84-rev-regex-check2.mjs` 验过下表）：正例 `==红==`/`甲==乙==`/`x^上^`/`H~2~`（不是 `H~2~O`）/`~a~ ~b~`（只吃最后一对），负例 `====`/`== a ==`/`a == b`/`2^10`/`\==a==`/`~~删除线~~`/关态全 null，另断 3 枚 syntax mark 各 1 条规则（`eqEscaped` 无）且 `find` 可喂串。
验收：① `tsc` 0 ② ≥28 条 0 fail ③ `npm test` **47 文件**（串行第 1 个、本任务不加文件；A1/A2 各 +1 后 49）④ `verify`≤310,000 B ⑤ `git grep addInputRules -- src/lib/inlineSyntax.ts` 0→≥1、`git grep markInputRule -- src` 0→≥1（对照 `taskListInput.ts:1`）⑥ **真机硬门**（H1）：手打那串后三 mark 各 **1**、`Ctrl+S` 假工作区文件=该行+换行（定界符逐字节、无 `sl-eq` 类）；连不上记 UNVERIFIED 并写试过哪条路。门禁 test/verify；风险：`markInputRule` 删定界符只留 mark（保存由 `renderMarkdown` 补回）、公式就地编辑期 `enableInputRules:false`（`App.tsx:5184`）不生效。

**合计**：`npm test` 47→**49** 文件 0 fail；`verify`≤310,000 B；roundtrip rich **7/9**、source **9/9**、首存拦 **1/9**；依赖 15+7 键不变（`git diff -- package.json` 只多 test 链两行）；收口查 `git status --short` 只多 `src/lib/{inlineSyntax,linkInput,restoreEntry}*`、`App.tsx`、`StatusBar.tsx`、`styles.css`、`package.json`、`fixtures/markdown/09-*`、`round-84/`、`BACKLOG.md`。**交下一批**：B-135 批准材料不在本轮产出，交 scribe 转交或下一批；B-135 仍 `deferred`，三任务不依赖它。
