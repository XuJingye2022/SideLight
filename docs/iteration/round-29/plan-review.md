# 第 29 轮 · 计划审查（critic，revision 3 复审）

- 角色：critic（只读；未改产品代码，只写本报告与 `.tmp/measure-critic-*.mjs` 测量脚本）。
- 审查对象：`docs/iteration/round-29/plan.md`（revision 3，347 行，2026-11-16 23:51）。上一版审查是本文件被覆盖前的内容（结论 REVISE，3 个 P1 + 3 个 P2）。
- 方法：逐条打开计划点到的文件核对行号与实现；在本机复跑计划自带的测量脚本；对未计的 Vite 产物开销另写三个只读测量脚本（`.tmp/measure-critic-r29.mjs`、`-t1note.mjs`、`-t2t3.mjs`、`-t3fn.mjs`）；单测 248 条、17 文件（`npm test` 复核）。
- 基线：`node scripts/measure-first-screen.mjs` → `total raw=929536 gzip=285783 files=2 max=285000` → FAIL（默认线 285000，CI 靠 `--max 286000`）；`dist/assets/index-B3_OF1Ta.js` gzip 278,712，`index-LEt1G9qz.css` 33,995 raw / 7,071 gzip。
- 结论：**REVISE**。P1-2 没修掉且升级为 P0；P1-1 的设计修法对，但验收数字仍错；P1-3 的测试手段对了、时序仍不判别。另有 T3 三个纯函数放进了静态入口模块，首屏增量被记成 0。

## 一、上一版漏洞复核（逐条）

| 编号 | 是否修掉 | 核对结果 |
| --- | --- | --- |
| P1-1 T2 用 `doc.textContent`，段数恒 1 | **设计修掉，验收数字仍错** | 计划改为 `sourceText ?? editor?.getText() ?? ''`，并已核 `@tiptap/core` 的 `getText` 默认 `blockSeparator="\n\n"`（`node_modules/@tiptap/core/dist/index.cjs` 的 `getText(options)`，已读）。但 e2e 样本 `第一段。第二段！\n\n第三段 ABC。` 只有 **一处** `\n\n`，`countText` 实测 `paragraphs=2`（命令见下），计划却写「两处 `\n\n` 分块」「段 = 3」——见 P1-1（新编号）。 |
| P1-2 T2 的 110 B 预算与设计不符 | **没修掉，升级为 P0** | 计划改成 160 B（实测 159，`.tmp/measure-js-r29i.mjs`），但该测量把源码写法追加到真实 entry JS 尾部，漏了 Vite 的两笔真实开销：懒 CSS 的 `__vite__mapDeps` 路径（+31 B）与编译后的 `AS(()=>import(…),__vite__mapDeps([…]))` 包装（比源码写法 +32 B；另含一行实际不存在的 `import{lazy,Suspense,useState}from"react"`，−25 B）。修正后 T2 ≈ **197 B**，不是 160。同时 T1 的提示净额也不是 35 B，见 P0-1。 |
| P1-3 A2 原型包装测不到 await 窗口 | **机制修掉，时序不判别** | 计划把延迟开关放进 `.tmp/r29-fsa.mjs:115-122` 的假 `getDirectoryHandle`，位置正确（`src/lib/workspace.ts:149` 的 `parentDirectory` 走该方法），比上一版可用。但两个子场景的时序都进不到守卫的「在飞窗口」：场景 2 在 1150 ms 才开延迟，此时草稿已按正常时序写完（800 ms 草稿定时器 + 300 ms derive，见 `src/App.tsx:818-857`）；`finishSaved` 自己的 `removeCache` 走同一条延迟，最后仍会把草稿删掉，**未修的实现也能 PASS**。见 P1-2（新编号）。 |
| P2-1（上一版）`writeCache` 执行中的窗口 | 补偿加了，测试到不了 | 计划在 `await writeCache` 后再判一次并 `removeCache` 补偿，方向对；但 A2 场景 2 造不出「保存完成发生在 writeCache 内部 await 中」的时序，补偿分支没有会失败的测试。并入 P1-2。 |
| P2-2（上一版）`editor` prop 类型 | 类型改了，选区初始化写法仍会红 | 计划写 `editor: Editor \| null` 是对的；但 `useState(() => { const sel = editor?.state.selection; return sel && sel.from !== sel.to ? editor.state.doc.textBetween(…) : null })` 中，`sel` 为真不能把 `editor` 收窄，`editor.state` 会 `TS18047: 'editor' is possibly 'null'`（`strictNullChecks` 下）。见 P2-1（新编号）。 |
| P2-3（上一版）单代理分支没算账 | 账写了，但 branch 3 不成立 | 三条分支的字节账写清了；但 branch 3（加 T2）按本报告修正的账是 **286,099+**，不是 285,985，且 35 min 未含报告/README/门禁。见 P2-3（新编号）。 |

## 二、新漏洞（按严重度，最多 6 条）

### P0-1 首屏账仍不闭环：三笔真实开销没算，修正后 ≥286,099 B，且 T3 纯函数放进首屏模块

**证据（本机实测，全部可复跑）**

1. **T3 三个纯函数放错模块**。计划把 `buildOutlineTree` / `expandAncestors` / `visibleActiveId` 追加进 `src/lib/outline.ts`（`plan.md:247`），并说「懒 chunk 内，零首屏成本」（`plan.md:240`）。但 `src/lib/outline.ts` 被 `src/App.tsx:71` **静态 import**（`import { activeOutlineId, extractOutline … }`），Rollup 会把该模块放进首屏 entry；懒 `Outline.tsx` 只会从 entry 复用。按计划描述写等价最小实现追加到真实 entry JS 后重算：**raw +858，gzip +298**（`.tmp/measure-critic-t3fn.mjs`）。上下文化后可能变小，但不是 0；计划 T3 首屏净额 −125 B 的账因此不成立。
2. **T2 的懒 CSS 让入口多两条 `__vite__mapDeps` 路径**：StatsDetail 有 CSS，Vite 会在 `dist/assets/index-B3_OF1Ta.js` 头部的 `__vite__mapDeps` 数组里加 JS + CSS 两个文件名。实测 **+31 B**（`.tmp/measure-critic-r29.mjs`，raw +66）。作为对照，现有 katexLoader 正是 `__vite__mapDeps([0,1])` 带两个路径（entry 头部可见）。
3. **T2 的编译写法比计划测量用的源码写法长**：源码 `lazy(()=>import("./StatsDetail.tsx").then(…))` 追加后 gzip +50；真实产物会编译成 `(0,_.lazy)(()=>AS(()=>import(\`./StatsDetail-<hash>.js\`).then(…),__vite__mapDeps([2,3])))`，同一文件里追加后 gzip +82，**差 +32 B**；计划测量里的 `import{lazy,Suspense,useState}from"react"` 在真实 bundle 不存在（React 已是 `_`，按钮编译成 `(0,_.useState)`），**多算约 25 B**。三项合计 T2 ≈ 159 − 25 + 32 + 31 = **197 B**。
4. **T1 的提示净额不是 35 B**。计划的 `.tmp/measure-js-r29h.mjs` 搜的是双引号字面量 `"文件太大，暂不支持（上限 5.5 MiB）。"`，而 dist 里两处都是反引号模板（一处 `src/lib/workspace.ts:250`、一处 `openSingleFile`，偏移 840301），脚本输出「旧提示出现次数 0」「删两处 −0」，所以「扣掉旧提示 ≈62 B」没有测到。按真实字符串重算：dist 里共 2 处，删 App 一处只省 **−24 B**；助手 + 两处调用 +97 B → **净额 +72 B**（`.tmp/measure-critic-t1note.mjs`）。T1 = 119 + 72 = **191 B**，不是 155。且实际 catch 还要加 `error instanceof Error && error.message.includes('文件太大')` 条件，只会更大。
5. **T3 的懒 CSS 搬移也不是 −49**。把 `.outline-item` 四段搬进 outline.css 后，Outline 懒 chunk 从「无 CSS」变成「有 CSS」，入口要多两条 `__vite__mapDeps`（实测 **+27 B**，`.tmp/measure-critic-r29.mjs`）并把 `AS(…,[])` 改成 `AS(…,__vite__mapDeps([…]))`（实测 **+14 B**，`.tmp/measure-critic-t2t3.mjs`）。−49 + 27 + 14 = **−8 B**，不是 −49。

**修正后的总账**

| 项 | 计划 | 实测修正 | 依据 |
| --- | --- | --- | --- |
| 基线 | 285,783 | 285,783 | `node scripts/measure-first-screen.mjs` |
| 死 CSS 5 段 | −76 | −76 | `.tmp/measure-css-r29.mjs` |
| 大纲四段搬懒 CSS | −49 | **−8** | −49 +27 +14 |
| 新增大纲列样式（行内） | 0 | 0 | 无 CSS 规则 |
| T3 三个纯函数 | 0（未列） | **+150～+298** | 放 `outline.ts` 即进首屏；`.tmp/measure-critic-t3fn.mjs` |
| `.status-count` 复位 | +12 | +12 | `.tmp/measure-css-r29b.mjs` |
| T2 首屏 JS | ≤160 | **197** | 159 −25 +32 +31 |
| T1 守卫 + 提示 | ≤155 | **191** | 119 + 72 |
| **合计** | **285,985** | **≈286,249～286,397**（即使纯函数按一半算也 >286,000） | 超出 286,000 至少 249 B；只算 T1/T2/T3-CSS 三项修正也已 **286,099**（超 99 B） |

**修法（必须按顺序）**

1. T3 三个纯函数**不要**放 `src/lib/outline.ts`；新建 `src/lib/outlineTree.ts`（只被懒 `Outline.tsx` 与 `outline.test.ts` import），`outline.ts` 保持现状。这样首屏 0 B，T3 的账才回到「CSS −8 B」。
2. 在 `.tmp/build-spike` 做一次**最小构建 spike** 再定账：给 `StatusBar` 加 dummy `lazy` + 一个带 CSS 的 dummy 组件，按 T2 的真实 prop/按钮写法量 `gzip` 差；给 T1 提示按真实反引号片段量净值。禁止再用「追加到 entry 文件尾的源码片段」当上界（本次已证明它同时会漏 Vite 包装又会多算假 import）。
3. 按 spike 结果二选一：T1 + T3 抵消（修正后 **285,890**，余 110 B）本轮做，T2 下轮；或砍 `.status-count`（−12）、StatsDetail 改行内样式（−31 mapDeps、−17 lazy CSS 差）、T1 提示短句（−8）后仍超线就回产品负责人。**不要**把 T2 硬塞进这一轮：T1（191）+ T2（197）+ T3（−8）+ 基线 + 死 CSS + `.status-count` = 286,099，超 99 B；再优化 CSS 也只能到约 286,031，仍破线。
4. 首屏核对增加一条：合并产物 `.tmp/build-a/assets/index-*.js` 里**不应出现** `buildOutlineTree` 的函数体（或 `visibleActiveId` 字符串）。

### P1-1 T2 的 e2e 样本与期望值自相矛盾：段数是 2，不是 3

**证据**

- `plan.md:210` 写「先在源码模式写 `第一段。第二段！\n\n第三段 ABC。`（两处 `\n\n` 分块）」，但该字符串只有**一处** `\n\n`；`plan.md:211` 又要求「逐行等于 `countText(...)`」且「**「段」= 3**（`doc.textContent` 口径会得到 1，必须红）」。
- 实测（`node --experimental-strip-types` 调 `src/lib/wordcount.ts`）：`countText('第一段。第二段！\n\n第三段 ABC。')` → **paragraphs=2**、chars=15、cjk+words=10；句数按 `。！？!?；;…` 切是 **3**。计划把「句 3」写成了「段 3」。
- 按计划实现，e2e 若按同一口径现算会得到 2，硬编码「段 = 3」的断言会红；若 builder 把期望改成 2，`doc.textContent` 口径仍是 1，回归点仍在（2 ≠ 1），所以修法很简单。

**修法**：二选一。(a) 样本改成三块：`第一段。第二段！\n\n第三段 ABC。\n\n第四段？`，期望 `paragraphs=4`、句数按现算；(b) 保留样本，把断言改成「段 = 2」「句 = 3」，删掉「两处 `\n\n`」与「段 = 3」的字样，并注明「段 = `countText().paragraphs`，标题行也算一块」。期望值继续由 Node 侧 `countText`/`countSentences` 现算，不手写数字。

### P1-2 A2 的时序造不出守卫的在飞窗口，未修实现也能 PASS

**证据**

- 草稿写入链：`onUpdate` 先 300 ms derive（`src/App.tsx:818-820`），再排 800 ms 草稿定时器（`:845-857`），即最后一次改动后约 **1100 ms** 才进 `parentDirectory`。
- 现有保存路径对已有句柄直接写文件：`performCommit` 用 `target.handle`（`src/App.tsx:2547-2568`），**不经过** `getDirectoryHandle`；只有 `finishSaved` 清草稿时的 `cacheDirFor()`（`:2507`、`:633-637`）与草稿的 `parentDirectory` 走延迟开关。
- 场景 2（`plan.md:148`）：「打字后等 1150 ms 再开延迟并 Ctrl+S」。等 1150 ms 时草稿已按正常时序写完（1100 ms 后全是微任务），延迟开关此时才打开，之后保存只是把已存在的草稿删掉；`finishSaved` 的 `removeCache` 虽也被延迟，但最终仍会删。**在未加任何 T1 修复的 HEAD 上，这个场景同样会通过**，不能当回归测试。
- 场景 1（`plan.md:147`）能失败，但失败原因是「clearTimeout 没做 + 定时器晚到」；只做 `clearTimeout`、不做 stale 守卫时也 PASS，所以它也证明不了守卫的 await 后判断。

**修法**：把延迟改成**一次性**（如 `window.__fsDelayGetDirOnce = 900`，`getDirectoryHandle` 读到后立刻清零），让这次延迟只被草稿的 `parentDirectory` 消费：
1. 打字；约 1000 ms 时设一次性延迟；约 1200 ms（草稿定时器已进 `parentDirectory`，正被挂住）按 `Ctrl+S`；
2. 保存完成时 `finishSaved` 走 `cacheDirFor`，一次性延迟已用掉，**不延迟**，草稿删除先完成；
3. 到 2500 ms 断言 `.sidelight/drafts/甲.md` 不存在、磁盘字节正确。
这样：只有「await 后再判 stale 并跳过」的实现才 PASS；删掉守卫（只留 clearTimeout）时草稿会在延迟结束后写回、且晚于 `finishSaved` 的删除，断言必红。再加一条负向对照：临时注释掉守卫跑一次确认红，再恢复。

### P2-1 `StatsDetail` 的选区初始化写法会挂类型门

**证据**：`plan.md:193` 的 `const sel = editor?.state.selection; return sel && sel.from !== sel.to ? editor.state.doc.textBetween(…) : null`。`editor` 是 `Editor | null`（`src/App.tsx:708` 的 `useEditor` 返回值），`sel` 为真不能让 TS 收窄 `editor`；`strictNullChecks` 下 `editor.state` 报 `TS18047`，`npx tsc --noEmit` 红。计划风险段写了「面板读选区前先判非空」，但给的代码不是。

**修法**：`const sel = editor?.state.selection; return editor && sel && sel.from !== sel.to ? editor.state.doc.textBetween(sel.from, sel.to, '\n') : null`，或直接 `editor?.state.doc.textBetween(...)` 并处理 `string | undefined`。类型擦除，首屏 0 B。

### P2-2 T1 的 `tooLargeNote` 写成「模块级」但读的是组件内 `docNameRef`

**证据**：`plan.md:127` 写「新增模块级小助手 `const tooLargeNote = (name: string) => …仍在「${docNameRef.current}」`」，但 `docNameRef` 是组件内的 `useRef(initial.name)`（`src/App.tsx:643`），模块作用域访问不到。照字面实现会 `TS2304: Cannot find name 'docNameRef'`；若改成组件内 const，则每渲染重建一个闭包（无所谓，但与「模块级」描述不一致）。

**修法**：二选一：(a) `const tooLargeNote = (name: string, current: string) => …` 放模块级，两处调用传 `docNameRef.current`；(b) 写成组件内的 `const tooLargeNote = (name: string) => …`，把表格里的「模块级」改成「组件内」。两种都不影响计划的 +97 B 片段测量口径，但要在报告里写真。

### P2-3 单代理 35 分钟：branch 3 既超时也破线

**证据**：`plan.md:43` 自估单代理全做 47 min；branch 3（T3 两步抵消 + T1 + T2）写「约 35 min」，但没算报告/README/CHANGELOG 的 4 min（`:41`）与合并后门禁（`npx tsc --noEmit` + `npm test` + `npx vite build` + 首屏测量，通常 6–10 min）。按本报告 P0 的修正账，branch 3 也是 286,099+，不是 285,985。可行的单代理路径只有 branch 1（T3 抵消 + T1，修正后 285,890，余 110 B）或 branch 2（只做 T1，285,974，余 26 B）。

**修法**：把第 1 节的分支表改成「单代理本轮只做 branch 1（T1 + T3 抵消），T2 下轮」；branch 3 删掉或标注「需另找 ≥100 B 抵消项并先做 spike」。并行两 builder 的墙钟估算可保留，但 T2 的字节上界按 P0 的 spike 结果重写。

## 三、逐项核对通过的事实（供实施复用）

| 计划主张 | 核对结果 |
| --- | --- |
| `App.tsx:845-857` 是 800 ms 草稿定时器，`:2506-2511` 在 `finishSaved` 内 | 属实；`finishSaved` 定义在 `:2444`，清理草稿的 async 块在 `:2506-2511`，确实没有 clearTimeout/代际 |
| `draftGenerationRef` 已存在，`finishSaved` 推进代际不伤宿主草稿 | 属实：`:522` 声明；宿主草稿 `:2921-2955`、回包 `:3339`；不匹配只会少清一次 pending，下次覆盖 |
| `:2091-2108` 有 `tooLarge` 分支、`:2110-2120` catch 只 setNotice | 属实；`src/lib/workspace.ts:246-255` 抛「文件太大」，`includes('文件太大')` 能命中；`picked.name` 可用 |
| `src/lib/wordcount.ts:47-57`、`TextStats` 不动 | 属实；`countText` 按 `\r?\n` 切段（`:54`），`formatStats` 用 cjk+words |
| `@tiptap/core` 的 `getText` 默认 `\n\n` | 属实（`node_modules/@tiptap/core/dist/index.cjs` 的 `getText(options)`） |
| `Editor` 可从 `@tiptap/react` 类型导入 | 属实（`node_modules/@tiptap/react/dist/index.d.ts` re-export） |
| `src/lib/outline.ts:18-32` 只有扁平数组、`Outline.tsx:25-38` 逐条渲染 | 属实；`Outline.tsx` 由 `App.tsx:32` 懒加载、`:4520-4530` Suspense |
| `.outline-item` / `:hover` / `.is-active` / `.outline-empty` 在 `styles.css:1386-1417` | 属实；页面上没有 `.outline-list` 的 CSS 规则，行内 grid 不会与既有冲突 |
| 死 CSS 5 段 0 引用 | 属实：`git grep` 只命中 `src/styles.css:172,1922,2245,2252,2259` 定义处；`.popover` 基类、`.note-kind-*`、`.annot-*` 已列不可删 |
| `status-bar` 无 `position`，面板用 fixed | 属实（`src/styles.css:1482-1493`）；全局 `button` 规则 `:125-135` 给 `font:inherit`、透明背景，`.status-count` 最小复位够用 |
| `README.md:37/51/76/96`、`FindBar.tsx:56`、`adr/0012:43`、`ci.yml:39`、`measure-first-screen.mjs:2,15` | 全部属实；`scripts/measure-first-screen.mjs:14` 支持 `--dir`，`:59-67` 超线/含 katex 或 lazy chunk 都 exit 1 |
| 测试条数 | `npm test` 实测 248 条、17 文件、exit 0；`outline.test.ts` 现有 **7 条**测试（计划写「既有 8 条断言」，不影响 248+3+3=254 的加总，但请改口） |
| 分工不重叠 | T1/T2 与 T3 的文件范围不重叠（`styles.css` 归 builder2，`.status-count` 代加）；构建纪律（`.tmp/build-a` 与 `.tmp/build-b`、合并后一次门禁）与 `STATE.md:128` 一致 |
| 硬约束 | 无违反：Tiptap schema 不动、不碰批注协议与保存差异门、缓存仍写 `.sidelight/`、无新增依赖、不跑 roundtrip（不改序列化）、不 push/不改 `release/`、不 bump 版本。**唯一违反的是首屏预算，见 P0-1** |
| 与最近改动冲突 | HEAD `853966d` 只有 docs；`src/` 无未提交改动；T1 改的 `finishSaved`/`openWorkspaceFile` 与最近轮次（28 轮）无重叠冲突 |

## 四、一个执行代理 35 分钟的判断

- **三个任务一个代理做不完**：T1（假 FSA + A2 两个时序 + 3 次重复 + 提示断言）15–18 min；T2（sentenceStats + 面板 + StatusBar + 2 张截图 + 6 个 e2e 场景 + chunk 测量）18–22 min；T3（3 个纯函数 + 3 条单测 + 组件重写 + e2e + 2 张截图）12–15 min；加上报告/README/CHANGELOG 4 min 与门禁 6–10 min，合计 **55–70 min**，不是 43 min。
- **可行的单代理路径**：branch 1（T3 的两步零交互抵消 + T1），约 20–24 min + 报告 4 min + 门禁 6 min ≈ **32–34 min**，字节修正后 285,890（余 110 B）。branch 2（只做 T1）约 15–20 min，285,974（余 26 B），更稳但少了 T3 的收益。
- **两个 builder 并行**：墙钟 25–27 min 可行，但 T2 必须等 P0-1 的 spike 重新定量后才知道能不能在这一轮做；在此之前不要把 T2 写进并行计划。

## 五、结论

**REVISE**。方向、文件行号、分工、门禁设计与硬约束都对；P1-1 的数据源设计已按上一版审查修好。但 P1-2 的字节账仍是「源码片段当上界」，实测漏了 Vite 的三笔真实开销（懒 CSS 的 mapDeps、编译后的 AS 包装、T1 提示只删掉一处字符串），并且 T3 三个纯函数被放进静态入口模块；修正后总账 **286,099～286,397 B > 286,000**，按计划自己的规则必须停下上报，不能进入实施。另有三处验收/类型问题（T2 段数、A2 时序、选区类型）与一处无会失败测试的补偿分支，需在实施前改。
