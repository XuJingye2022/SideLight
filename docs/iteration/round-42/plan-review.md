# 第 42 轮 · 计划审查（critic，只读）· 复审 revision 2

- 轮次：round=42，nn=42；轮前 `startSha=5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（本次 `git log -1 --format=%H` 实测 = `5b7a1f57…`；`git status --porcelain` 只有 `?? docs/iteration/round-42/`、`?? shots/round-42/`，与计划开头一句一致）。
- 开工前按要求读了 `.tmp/iteration/common.md`（56 行全文）与 `.tmp/iteration/roles/critic.md`（25 行全文）。
- 输入：`docs/iteration/round-42/plan.md`（revision 2，**396 行全文读完**）、本文件上一版（revision 1，114 行）、5 份 `findings-*.md` 的关键断言、`AGENTS.md`（§4/§8）、`roles/planner.md`、`roles/critic.md`，以及计划点到的每个文件（下面逐条给实测行号）。
- 本轮只读：未改产品代码，未跑 E2E（critic 口径是核对文件；动态项在 §六 标 UNVERIFIED 并写复现方法），未跑 `reset.mjs`、未连 CDP 9222、未启动/重启 dev server、未 push、未碰 `release/`。
- **结论：REVISE。** 上一版 **4 条 P2（R42-7–R42-10）全部落实**（§二 逐条给证据；R42-9 的旧修法经复核**确实不成立**，revision 2 换的机制正确）。新增 **4 条 P2**（§三），**没有 P0/P1**，四条都是「改一句 / 挪一步」的修法，不扩大范围、不动任务数。

---

## 一、首审 6 条（R42-1–R42-6）复核：仍成立，revision 2 未触碰

| 漏洞 | 复核结论与证据（本次实测） |
| :--- | :--- |
| R42-1 | 仍成立。`FindBar.tsx:48` `const locked = Boolean(unavailableReason)`、`:49` `disabled = locked \|\| total === 0`、`:77` `locked ? '' : …` → 锁定后计数必为空串；`plan.md:124` 的 `count === ''` 写法没变。 |
| R42-2 | 仍成立。`App.tsx:4642/4645/4648` 现有类名仍是 `italic`/`strike`/`mono`，`styles.css:1274-1285` 三条样式仍在；`plan.md:201-206` 的组合类名写法（`italic is-on` / `italic`）两态都能保住打字样式。 |
| R42-3 | 仍成立。`isComposing` 全仓只有 `App.tsx:835`、`:851`（`TreeActions.tsx:132` 另处、与 Esc 无关）；`App.tsx:3562-3617` 的 Escape 分支确认通篇无该判断 → 新分支首行守卫是唯一入口。 |
| R42-4 | 仍成立。滚动容器是 `App.tsx:4841-4844` 的 `<main class="doc-scroll">`（`styles.css:247-251` `overflow-y:auto`）；`.doc-body` 只随正文变高（`styles.css:559-565`，无 overflow/min-height）→ 内阴影必须画在 `.doc-scroll` 上。`.doc-body` 就是编辑器本体（`App.tsx:812` `attributes: { class: 'editor doc-body' }`），`:has()` 有命中对象。 |
| R42-5 | 仍成立。`StatusBar.tsx:39` `<footer class="status-bar">`、`:41-51` `<button class="stats-trigger">`；`App.tsx:5025` 无条件渲染、DOM 在 `<main>`（`:4841`）之后 → `compareDocumentPosition` 含 `FOLLOWING` 成立。 |
| R42-6 | 仍成立。`plan.md:142`、`:355-358` 的「预览里查找不显示命中数」代价记录与 README / CHANGELOG 落点都在，与 R42-1 同口径。 |

---

## 二、上一版复审 4 条（R42-7–R42-10）复核：全部落实

### R42-7（P2）6 个 `isActive` 布尔量的落点：**已写死，可执行**
- `plan.md:192` 现在写「`const run = useCallback(…)` 结束（`src/App.tsx:3796-3803`）之后、`return (`（`:4414`）之前」，并删掉了「与 `previewMode`（`:411`）同一层」。
- 实测：`App.tsx:3796-3803` = `const run = useCallback(…, [editor])`；`:4414` = `return (`；`:411` = `const previewMode = viewMode === 'preview'`；`:779` = `const editor = useEditor({`；工具栏 JSX 在 `:4632-4651`（在 `return` 内部）。
- 结论：按新落点写在 `:3804` 处引用 `editor` 合法（`:779` 已初始化），不会 TS2448/TS2454；「不要放 `:411` 附近（TDZ）」「不要在 `:4632` 的 JSX 里声明 `const`」两条理由也都成立。

### R42-8（P2）`repairHtml` 阈值：**已单列 ≤0.6 ms，与守卫成本同口径**
- `plan.md:319` 已写 `repairHtml ≤ 0.6 ms`、「0.4–0.6 属达标，不要为了压线去改守卫」；`:318` 另两条保持 ≤0.3；`:320` `guardsIncludes ≤ 0.6`。
- 实测 `.tmp/perf-round42-steps.json`（1mb 行）：`repairTildes 2.8`、`repairHtml 1.6`、`repairCalloutMarkers 0.9`、`serializeDocument 8.5`、`guardsIncludes 0.4` → 与计划引用的数字一致。
- 守卫成本成立：`src/lib/html.ts:3` 的 `ESCAPED_TAG` 必要条件含 `&lt;`…`&gt;`，`:5` 的 `ESCAPED_ENTITY` 必要条件含 `&lt;`/`&amp;`/`&gt;` 之一；`:20-22` 用 `&&` 串三条，最坏情况（三个子串都不存在）三条全跑 ≈0.3 ms，加 `typeof original` 与调用成本落 0.3–0.5 ms。

### R42-9（P2）T1 的 c2/c3：**旧修法确实不成立，新机制成立**
- 上一版 review 给的「`b.disabled = false; b.click()`」复核为**假绿**：`node_modules/react-dom/cjs/react-dom-client.development.js:3456-3496` 的 `getListener` 读的是 fiber props（`:3459`），`:3462-3483` 对 `onClick` 等 11 个事件先看 `props.disabled`，为真且元素是 `button`/`input`/`select`/`textarea` 时 `inst = true` → `:3487` `return null`。改 DOM 的 `disabled` 不改 props，`onClick` 不会跑。revision 2 换掉它是正确判断（`plan.md:52` 引的行号基本对）。
- 新机制成立：`internalPropsKey = "__reactProps$" + randomKey`（`:26841`），DOM 节点在提交时拿最新 props（`:23943` `domElement[internalPropsKey] = newProps`，普通赋值 → `Object.keys(btn)` 能枚举）；`FindBar.tsx:128` 是 `onClick={onReplace}`、`:131` 是 `onClick={onReplaceAll}`，`App.tsx:4714/4715` 把 `replaceCurrent`（`:1835`）/`replaceEvery`（`:1842`）传下去 → 直调 props 上的 `onClick` 就是调这两个函数，`if (previewMode) return` 一定被执行；取不到 key 会抛 TypeError 报红，不会假绿。
- 断言口径：预览里 `.preview-pane` 与 `.doc-column .ProseMirror` 是同一个 `<article>`（`PreviewPane.tsx:71-76` 同时带三个类），合并成一条正确。三条断言 + `## edit-handler-control` 正向对照 + `## edit-replace-click` 真按钮，既能证明守卫在、也能证明功能没被整体砍掉。种子 `第一句在正文里。第二句也在正文里。`（`.tmp/e2e-r42-bug-c.mjs:5`）含两处「正文」，与「第二处也被替换」的描述对得上。

### R42-10（P2）时间预算：**预砍 / 合并 / 重算三层都落进任务体**
- 预砍：`plan.md:297`（T3 第 5 步标「已预砍」）、`:323`（验收 6 不执行）、`:345`（§四 单列一行）、`:365`（§五 已预砍清单）。
- 合并：`:231`（`keyboard-acceptance` 本轮只跑一次）、`:324`（T3 复用、不再跑第二遍）。
- 物证合流：`:309`（`sl-parse-done` 并进 `-t3.mjs` 同一次运行）。
- 重算：`:69`（25 min + 收尾/门禁 = 32–33）、`:385-396`（摊开表）、`:369-371`（两个耗时检查点 + 砍单顺序）。执行代理不再需要临场判断。
- 残余时间风险见 §五（不进编号）。

---

## 三、本轮新发现（4 条，全 P2）

### R42-11（P2）T3 验收 2(c) 的 `dirty === false` 在 (b) 之后不可能成立

**证据**
- `plan.md:313-316` 的三段顺序是：**(a)** 打开 甲.md → `Ctrl+/` → `Ctrl+/` → `Ctrl+S`（字节等于种子）；**(b)** 进源码 → 输入 `源码改动` → `Ctrl+/` → 正文含「源码改动」；**(c)** 进源码 → 不改 → `Ctrl+/` 退出 → 标题不带 `•`、`window.__slState.dirty === false`。
- (b) 会让文档变脏：源码模式里 `App.tsx:1884-1891` 先 `setDirty(sourceText !== baselineRef.current)`，退出源码时 `applySource` 又执行 `:3825` `setDirty(sourceText.replace(/\r\n/g,'\n') !== baselineRef.current)`，而 `baselineRef` 还是 (a) 保存时的基线、不含「源码改动」。
- (c) 退出源码时 `applySource` 里新的判据是 `skipReparse`，但**无论是否跳过**都会走到 `:3825` 的 `setDirty(...)`：`normalizedSource` 含「源码改动」≠ `baselineRef`（种子）→ `dirty` 仍是 `true`，标题也带 `•`。中间没有任何保存或重开步骤。

**影响**：按字面写，2(c) 的两条断言必然红，与实现是否正确无关；执行代理很可能回头怀疑 `serializeBodyNow`/`skipReparse` 写错了，白跑一轮。

**修法**：二选一。① 把 (c) 挪到 (a) 之后、(b) 之前（同一脚本里在「未编辑」状态测「不改源码退出不置脏」）；② 在 (b) 末尾补 `Ctrl+S`（顺带断言盘上字节含「源码改动」）再跑 (c)。**另**：(c) 即使绿也证明不了「跳过重解析」——不跳过同样会把 `dirty` 算成 `false`；`sl-parse-done` 计数（验收 1a）才是唯一主判据，别把 (c) 当性能证据。

### R42-12（P2）`keyboard-acceptance` 的 52/52 取在 T3 改动之前，T3 的 `applySource` 改动没有这条回归

**证据**
- `plan.md:231` 把 `keyboard-acceptance` 安排在 **T2 验收 7**、本轮只跑一次；`plan.md:324` 要求 T3 直接复用、不再跑第二遍。
- 但 T3 改的正是 `applySource`（`App.tsx:3806-3826`）、`currentMarkdown` 拆分（`:2790-2799`）与 3 个 lib 守卫（`html.ts:20`、`tilde.ts:36`、`escapes.ts:5`）。
- `keyboard-acceptance.mjs:421-424`（「Ctrl+/ 切到源码」「Esc 退出源码回编辑」）走的正是 `switchView`（`App.tsx:3836`）→ `applySource` 这条被 T3 改过的路；它在 T2 跑，等于为改前代码取证。T3 自己的 E2E 用 `Ctrl+/` 退出（`plan.md:313-316`），不覆盖 `Esc` 退出源码。

**影响**：T3 最大的回归风险（跳过重解析后退出源码的行为）在最终门禁里只剩 T3 自写的 3 条断言 + roundtrip，`Esc` 退出这条路径没有 acceptance 证据。

**修法**：把唯一一次 `keyboard-acceptance` 挪到 §五「全部做完后串跑」里（T1–T3 改完之后），T2 验收 7 改成「结果在门禁串跑里出」；仍然只跑一次，但覆盖的是全部改完的代码。若坚持在 T2 跑，就得在 T3 门禁补跑一次（与上一版 review 的省时口径冲突，二选一）。

### R42-13（P2）T3 单测 ③「CRLF original：输出用 CRLF」与实现不符

**证据**
- `plan.md:295` ③ 写「CRLF original：输出用 CRLF」。实测 `serializeDocument` 只在**末尾换行**用原文的 EOL：`src/lib/serializeDocument.ts:32-37` `applyTrailingNewlines` 用 `original.includes('\r\n') ? '\r\n' : '\n'` 只补尾部；正文（`editor.getMarkdown()`）是 LF，`reuseTables` 还显式把序列化结果归一成 `\n`（`tableReuse.ts:104`）。整篇 CRLF 转换在 App 的 `prepareSave` 的 `withEol`（`App.tsx:2810`），不在 `serializeDocument`。
- 只有原文带 CRLF frontmatter 时输出才可能夹 CRLF（`splitFrontmatter` 保留原字节、`joinFrontmatter` 原样拼回，`frontmatter.ts:49/70-78`），正文段仍是 LF。

**影响**：照字面写 `assert.equal(out, crlfText)` 会红，而且会让人误以为序列化器坏了。

**修法**：③ 改成「original 是 CRLF 时**结尾换行**是 `\r\n`、正文仍是 `\n`」；要测整篇 CRLF，就另加一条走 `prepareSave`/`withEol` 的断言（或干脆不在本轮测，记 UNVERIFIED）。

### R42-14（P2）§六 漏了 `keyboard-acceptance` 会覆盖 `shots/round-05/` 的 3 张已跟踪截图

**证据**
- `plan.md:380` 只写了 `fidelity-acceptance` 覆盖 `shots/round-10/` 要 `git checkout`。
- `keyboard-acceptance.mjs` 也写 3 张**已跟踪**历史截图：`:144 shots/round-05/t1-skip.png`、`:260 t1-filemenu.png`、`:302 t1-shortcuts.png`（AGENTS §8 有记）；T2 验收 7 要求跑它 → `git status` 会多 3 个改动。

**影响**：收尾时容易被当成本轮证据提交，或让根代理误判工作树脏（本轮「工作树只有两个未跟踪目录」是 `plan.md:7` 自己写的前提）。

**修法**：§六 加一句「`keyboard-acceptance` 跑完 `git checkout -- shots/round-05/` 还原」，T2 验收 7 也照抄一句。

---

## 四、本轮复核过、判无问题的点（给执行代理的「别再查」清单）

- **`serializeBodyNow` 判据安全**：`sourceBaselineRef` 两个入口都 seed（`App.tsx:547` `enterSourceFor`、`:3845` `switchView`），所以「源码框没动过」= `sourceText === sourceBaselineRef.current`；有损文档（如 `docs/roundtrip-report.md:15` 的 04 引用式链接，`firstSaveBlocked` 1 个）序列化不等 → 走老路，方向安全。`App.tsx:3956` 的 exportAs 调用点行为不变。
- **跳过重解析的副作用是收益**：不再执行 `setMarkdown` 里的 `setTextSelection(0)`（`App.tsx:1010`），光标不再被重置到文首。impl.md 记一句偏差即可，不用改。
- **主性能口径下 skip 必然命中**：localStorage 恢复的文档 `rawTextRef` 为 null（初始载入 `App.tsx:1031` 不写它；写它的是 `:1076`/`:2048`/`:2608`/`:3434`）→ 进源码时 `text = currentMarkdown()`，与 `serializeBodyNow()` 同一函数，两边恒等。假工作区的 甲.md 是「标题 + 段落」，形状属 5 个完全保真样本（`docs/roundtrip-report.md` 逐样本表：只有 04/06 有变化）→ 也命中。
- **`sl-parse-done` 断言成立**：全仓只有 `App.tsx:1005` 一处（grep 1 命中），每次 `setMarkdown` 一条；`switchView` 进源码（`:3837-3847`）不调 `setMarkdown` → 1(a) 的「相等」与「改一个字 +1」都成立。StrictMode 只影响首屏那两次，不影响后续计数。
- **三个守卫都是必要条件、不会误伤**：`tilde.ts:37` 只改 `\~`；`escapes.ts:6` 正则需要字面 `\[!`；`html.ts:3/5` 两条正则的必要条件就是那三个实体子串。`rich 5/7 / source 7/7`（`docs/roundtrip-report.md:13-14`）口径不变。
- **T2 的 CSS 会生效**：`.doc-body` 就是编辑器（`App.tsx:812`）；findings-ui F5 实测它今天**已经**命中 `:focus-visible`（`outline: solid 2px rgb(43,109,100)`），所以 `.doc-body:focus-visible{outline:none}` 与 `.doc-scroll:has(…)` 都有命中对象；`styles.css` 现在 `:has(` 0 处，`vite.config.ts` 无 `cssTarget` → 不会降级。`.doc-scroll` 包住 `.doc-body`（`App.tsx:4841-4854`）。
- **新 Esc 分支收得到事件**：window 监听是冒泡（`App.tsx:3742`）；`node_modules/prosemirror-view/dist/index.js` 里 `stopPropagation` **0 处**、不处理 Escape → 正文里按 Esc 会到 window。`LinkEditor`/`MathInlineEditor` 挂在根节点（`App.tsx:5242-5277`）不在 `.ProseMirror` 内 → `.closest('.ProseMirror')` 守卫能挡住它们的 Esc。
- **`keyboard-acceptance` 的 9 处 Escape 不会被新分支打红**：`:101/:236/:265/:289/:303/:389/:409/:422/:462` 都在更早分支或非正文焦点；`:236` 即使命中，后续断言只看 `Ctrl+Alt+E` 的导出菜单，不依赖焦点。
- **T1 守卫位置合法**：`previewMode`（`:411`）早于 `replaceCurrent`（`:1835`）；`.find-count` 锁定态是空串（`FindBar.tsx:48,77`）；`Aa`/`ab` 不带 `disabled`（`:79-96`）。
- **工具栏组合类名正确**：`styles.css:1268-1272`（`.toolbar button.is-on`）与 `:1274-1285`（`italic`/`strike`/`mono`）并存，组合写法在激活/未激活两态都保住打字样式。
- **预算与脚本都在**：`.tmp/perf-round42-steps.json`、`.tmp/perf-round42-code.json`、`.tmp/e2e-r42-bug-{a,b,c}.mjs`、`r30-fsa.mjs`、`r41-cdp.mjs`、`reset.mjs`、`scripts/shot.mjs` 实测存在；`package.json:15` 实测 **28** 个 `node --experimental-strip-types`，末尾追加 = 29；`docs/CHANGELOG.md:5`、`README.md:103` 落点对。

---

## 五、时间预算（不进编号，残余风险）

- 计划 32–33 min（`plan.md:385-396`）。按本次实测的跑数成本，T3 的 10 min 偏紧：`fidelity` 19 条 + `roundtrip` 7 个样本 + `npm test` 28 个文件之外，还有 4 次性能跑（`C-1MB-4k` 载入 11 s、计划 §六 自述）+ 新写 `-t3.mjs` + 复制 2 个 perf 副本 + 10 条单测 → T3 更像 13–16 min，全轮 36–40 min。
- 不新增编号，建议二选一：① 把 §五 检查点的「T2 结束 > 22 min」降到 18 min；② 把 `impl-t2-toolbar-pressed.png` / `impl-t2-tablebar-danger-dark.png` 与 `C-1MB-4k` 从「仍可砍」改成**预砍**（超时才发现就晚了）。「不砍 T3 的 2b、单测、roundtrip」这条底线是对的。

---

## 六、本轮 UNVERIFIED（critic 侧，静态判定）

- **R42-9 的 `__reactProps$` 直调**：未真跑 evaluate；依据是 react-dom 源码（`:3456-3497`、`:26841`、`:23943`）与 FindBar/App 的 props 链。复现：预览态 evaluate 里 `btn[key].onClick()`，看 `__slState.dirty` 与 `.preview-pane` 文本。
- **T2 的 `:has()` + `:focus-visible` 实值**：未在 dev/打包 dist 实测命中与 `boxShadow`/`outline` 取值。复现：真键盘路径进正文后读 `getComputedStyle(.doc-scroll).boxShadow` 与 `.doc-body` 的 `outline-style`。
- **R42-8 的 `includes` 成本**：读的是 finder 的 `.tmp/perf-round42-steps.json`，未重跑。
- **IME（R42-3）与长文中段焦点指示**：CDP 造不出真输入法，滚动后指示器需浏览器实测；执行侧照计划在 impl.md 记 UNVERIFIED。
