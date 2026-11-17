# 第 42 轮 · 计划（planner，只读）

> **revision 2**（2026-11-17，planner-revision）：按 `docs/iteration/round-42/plan-review.md` §二 的 R42-7–R42-10 逐条修掉。**R42-9 的修法换掉了**：复核 React 19 源码发现 review 给的「先把 `b.disabled = false` 再 `b.click()`」在 React 19 下根本不会调 `onClick`（`getListener` 在 `props.disabled` 为真且元素是 `button` 时直接返回 `null`，`node_modules/react-dom/cjs/react-dom-client.development.js:3456-3487`），照做只会得到「什么都没执行」的假绿；改成直接调按钮 React props 上的 `onClick`，并加编辑态正向对照。R42-10 按 review 建议把 T3 第 5 步（死符号）与验收 6 预砍、两套 acceptance 合并成一次跑。逐条对照见 §零-B；任务仍是 3 个，未扩大范围。

> **revision 1**（2026-11-17，planner-revision）：按 `docs/iteration/round-42/plan-review.md` §一 的 R42-1–R42-6 逐条修掉，并按该文件 §四 把时间预算提前落到任务体（不再等超时才砍）。逐条对照见 §零。任务仍是 3 个，未扩大范围；review §二 复核为「全部成立」的 5 处纠偏原样保留。

- 轮次：round=42，nn=42；轮前 `startSha=5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（`git log -8` 实测 HEAD = `5b7a1f5`，工作树只有 `docs/iteration/round-42/` 与 `shots/round-42/` 两个未跟踪目录）。
- 报告目录 `docs/iteration/round-42`；输入：本轮 5 份 `findings-*.md`（全部读完）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`（第 4、8 节）、`docs/CHANGELOG.md`、`docs/typora-gap.md`（全文）、`docs/iteration/typora-features.md`（§1–§4，含 §3 现状列与 §4 键盘表）、`git log -8` 与相关源码（`src/App.tsx`、`src/lib/{html,tilde,escapes,serializeDocument,tableCellBreaks}.ts`、`src/components/{FindBar,LinkEditor,MathInlineEditor,PreviewPane}.tsx`、`src/styles.css`、`package.json`、`node_modules/@tiptap/extension-hard-break/dist/index.js`）。
- 环境：dev server `http://localhost:5175`（不另起、不重启）；E2E 固定 CDP **9222**，每次先 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- 本轮不改产品代码，只写本文件；未 push、未碰 `release/`。
- **不发版**：`package.json` 的 `version` 不动（0.32.1）；CHANGELOG 写进现有 `## Unreleased（第 29–40 轮，未发版）`（`docs/CHANGELOG.md:5`）。安装包体积与 `release/` 本轮不动。

## 零、修订清单

### 零-A revision 1（R42-1–R42-6 + review §四）

| 漏洞 | 级别 | 改在哪 | 怎么改 |
| :--- | :--- | :--- | :--- |
| R42-1 | P1 | T1 验收 c1/c2/c3 | 预览锁定后 `.find-count` 恒为空串（`src/components/FindBar.tsx:48,77`），断言改成 `count === ''`，并注明「锁定后计数留空是预期」；**不给 `window.__slState` 加字段**。 |
| R42-2 | P1 | T2 第 3 步 + 验收第 4 条 | I/S/`</>` 用组合类名（`` className={`italic${italicOn ? ' is-on' : ''}`} ``），H1/H2/B 才用 `active ? 'is-on' : undefined`；验收补 3 条计算样式断言（斜体 / 删除线 / 等宽），激活与未激活两种状态都要成立。 |
| R42-3 | P1 | T2 第 1 步 | 新 Esc 分支第一行加 `if (event.isComposing || event.keyCode === 229) return`；impl.md 记 UNVERIFIED「真机 IME 复核」（CDP 造不出真 IME）。 |
| R42-4 | P2 | T2 第 2 步 + 验收第 3 条 | 指示器从 `.doc-body` 改挂滚动容器：`.doc-body:focus-visible { outline: none }` + `.doc-scroll:has(.doc-body:focus-visible) { box-shadow: inset … }`；验收加「长文滚到中段」一条（旧写法在那条必然失败）。 |
| R42-5 | P2 | T2 第 1 步 + 验收第 1 条 | 采纳 review 的方案 ②：Esc 聚焦**正文之后**第一个可聚焦控件（`.status-bar .stats-trigger`），不再回工具栏；验收断言聚焦元素在 DOM 中位于 `.editor` 之后。不优先页边卡片，理由写在 T2 第 1 步（卡片按钮是「采纳 / 忽略 / 联网核对」，误按 Enter 会改正文）。 |
| R42-6 | P2 | T1 + §五 收尾文档 | 接受全锁（与源码模式同一语义），把「预览里查找不显示命中数」记进 README「现在不能做什么」与 CHANGELOG。只锁替换需要给 `FindBar` 加第三态并重写第 39 轮的四条断言，不在本轮 5 min 预算内 → 记进 §四下轮项。 |
| review §四 | — | §一 / §五 / §七 | 把原砍单第 1、3、4 条直接写进 T2/T3 验收（H1/H2 只记录、深色只截图、`C-1MB-4k` 只跑一次不判线），估时压回 34–35 min。 |

未改：§二 对 5 处 finder 说法的纠偏（review §二 复核为全部成立）、T3 的 `serializeBodyNow` 判据（§二-1）、三个守卫、新增单测、T3 验收 2b（源码编辑仍生效）。

**revision 1 重新核过的代码事实**（都是本次 `read`/`grep` 实测，不是照抄 review）：

- `src/components/FindBar.tsx:48` `const locked = Boolean(unavailableReason)`；`:77` `locked ? '' : …` → 锁定后计数必为空串。`:49` 的 `disabled` 同时禁用 ↑/↓/替换/全部替换。
- `src/App.tsx:4642`/`:4645`/`:4648` 确实是 `className="italic"`/`"strike"`/`"mono"`；`src/styles.css:1274-1285` 对应三条样式 → 组合类名是必须的。
- `src/App.tsx:3562-3617` 的 window `Escape` 分支通篇无 `event.isComposing`；全仓只有 `:835`、`:851`（正文 Tab）用了它 → R42-3 成立。
- `src/styles.css:247-251` `.doc-scroll { overflow-y: auto }` 才是滚动容器；`:559-565` `.doc-body` 无 overflow/min-height；`:253-260` `.doc-layout { min-height: 100% }` → 顶部内阴影必须挂在 `.doc-scroll`，R42-4 成立。
- `src/App.tsx:4921` `.doc-layout`、`:5025` `<StatusBar`、`src/components/StatusBar.tsx:39` `<footer className="status-bar">`、`:43` `.stats-trigger` → 正向落点存在且在正文之后。
- `src/components/MarginRail.tsx:148-183` 卡片里是「采纳/忽略/追问/联网核对」按钮，`:106-115` 的 `<article className="note">` 无 `tabindex` → 不选卡片优先、并记 §四下轮项，两条都有依据。
- `src/App.tsx:1812-1823` `goToMatch` 只改编辑器选区 + `scrollIntoView` → 预览里 ↑/↓ 无可见效果，T1 风险 ③ 的论证成立。
- `src/styles.css` 全文**没有** `:has(`；`vite.config.ts` 没有 `cssTarget`/lightningcss → esbuild 不会降级 `:has()`，可直接用（不支持时按 T2 第 2 步 fallback）。
- `package.json:15` 逐项数有 28 个 `node --experimental-strip-types` → 末尾追加 1 个 = 29 文件；`.tmp/e2e-r42-bug-c.mjs` 存在，其第 3、4 步确实用 `page.click('.find-bar button:has-text("替换")')`（锁定后会 30 s 超时）。

### 零-B revision 2（R42-7–R42-10）

| 漏洞 | 级别 | 改在哪 | 怎么改 |
| :--- | :--- | :--- | :--- |
| R42-7 | P2 | T2 第 3 步 | 6 个布尔量的落点**写死**成「`const run = useCallback(…)` 结束（`src/App.tsx:3796-3803`）之后、`return (`（`:4414`）之前」；删掉「与 `const previewMode`（`:411`）同一层」这句锚点，并写明 :411 附近是 TDZ、`:4632` 的 JSX 里写不了 `const`。 |
| R42-8 | P2 | T3 验收 3 | `repairHtml` 单列 ≤ **0.6 ms**（守卫的第三次 `includes` 是必跑成本，与 `guardsIncludes` 同口径；改前 1.6，预计改后 0.3–0.5）；`repairTildes`/`repairCalloutMarkers` 保持 ≤0.3 ms；补「0.4–0.6 属达标，不为压线改守卫」。 |
| R42-9 | P2 | T1 验收 c2/c3 + 正向对照 | 不用 `page.click`，也不用「`b.disabled = false; b.click()`」（React 19 下不触发 `onClick`，证据见下）；改调 `__reactProps$*.onClick()`，c2 文本断言合并成只认 `.preview-pane` 一条，并加 `## edit-handler-control` 编辑态正向对照（否则 c2/c3 是假绿）。 |
| R42-10 | P2 | §一 / T3 第 5 步 / T3 验收 1(a)、6、7 / §四 / §五 / §七 | T3 第 5 步（死符号）与验收 6 预砍进 §四；`keyboard-acceptance` 只在 T2 跑一次、T3 必须复用；`sl-parse-done` 物证并进 `-t3.mjs` 同一次运行；§七 重算 32–33 min，砍单顺序重排，加两个耗时检查点。 |

**revision 2 重新核过的代码事实**（`read`/`grep` 实测）：

- **review 给的 R42-9 修法不成立**：`node_modules/react-dom/cjs/react-dom-client.development.js:3456-3487` 的 `getListener` 对 `onClick` 等 11 个事件先看 `props.disabled`，为真且元素是 `button`/`input`/`select`/`textarea` 时返回 `null` → 「DOM 上把 `disabled` 改回 `false` 再 `.click()`」连监听器都查不到，`onClick` 不会跑。`__reactProps$` 这个 key 在 `:26841` 定义（`"__reactProps$" + randomKey`），DOM 节点在 `commitUpdate` 里持有最新 props（`:23941-23943`），`Object.keys(btn)` 直接能拿到。
- 「替换」按钮是 `onClick={onReplace}`（`src/components/FindBar.tsx:128`），「全部替换」是 `:131`；App 侧 `onReplace={replaceCurrent}`（`src/App.tsx:4714`）、`onReplaceAll={replaceEvery}`（`:4715`）→ 直接调 props 上的 `onClick` 就是调 `replaceCurrent`/`replaceEvery`，守卫插在 `:1835`/`:1842` 的第一行。
- `src/App.tsx:3796-3803` 是 `const run = useCallback(…, [editor])`；`:4414` 是 `return (`；`:4632` 是工具栏 `<div className="toolbar-group">`（在 `return` 的 JSX 内部）；`:411` 是 `const previewMode`，`:779` 是 `const editor = useEditor({` → 把 6 个 `isActive` 布尔量放 `:411` 附近就是 TDZ，`npm run build` 的 `tsc --noEmit` 报 TS2448/TS2454。
- `src/lib/html.ts:20-22`：`repairHtml` 首行是 `const source = typeof original === 'string' ? original : null`，守卫插在它之后、`mapOutsideCode` 之前；`&&` 串三条 `includes`，样本里三个子串都不存在时三条全跑。`.tmp/perf-round42-steps.json` 实测 1 MB 下 `guardsIncludes`（4 次 includes）0.4 ms、`repairHtml` 1.6 ms → 三条 ≈0.3 ms。
- `src/components/PreviewPane.tsx:71-76` 的 `<article class="ProseMirror doc-body preview-pane">` 同时带三个类；`src/App.tsx:4918-4919` 预览时 `EditorContent` 不渲染 → 预览里 `.doc-column .ProseMirror` 与 `.preview-pane` 只能是同一个节点（改前日志 `.tmp/e2e-r42-bug-c.log:3` 两处同值就是这个原因，不是「测了两处」）。
- `scripts/keyboard-acceptance.mjs` 有 52 个 `check(`、`scripts/fidelity-acceptance.mjs` 有 19 个 `check(`（本次实测计数）→ 「合并成一次跑」不改断言数。

## 一、本轮选了什么、为什么

5 份报告合计 **32 条 actionable**（bug 2、typora 10、ship 5、code 5、ui 10），其中 **P1 五条**（bug 第 1 条、code F1/F2、ui F1、typora §1）。按 `roles/planner.md` 的排序（1 数据安全 → 2 用户可见收益 → 3 安装/体积/性能 → 4 内部质量）与「一个执行代理 35 分钟」的口径，取 **3 个任务**，覆盖 **3 条 P1 + 5 条 P2 廉价项**：

| id | 标题 | 级别 | 类别 | 估时 |
| :--- | :--- | :--- | :--- | ---: |
| T1 | 预览（只读）模式锁住「替换 / 全部替换」：不能再静默改正文并落盘 | **P1** | 数据安全 | 5 min |
| T2 | 键盘正向离开正文（Esc）+ 工具栏按下态 + 表格条危险色与名称 + 正文焦点指示线（钉在滚动容器） | **P1/P2** | 用户可见收益、可访问性 | 10 min |
| T3 | 退出源码不再无条件整篇重解析；3 个全文扫描型 repair 加精确守卫；保存链补单测（死符号清理延后） | **P1/P2** | 性能、内部质量 | 10 min |

估时（revision 1 已把原砍单第 1、3、4 条预砍进任务体；revision 2 再按 R42-10 预砍 T3 死符号、并把两套 acceptance 合并成一次跑）：T1 5 + T2 10 + T3 10 = **25 min**；收尾 3 min + 全部门禁串跑 4–5 min → **全轮 32–33 min（§七 摊开算），在 35 min 硬线内**。仍超时按 §五「仍可砍」的固定顺序，不得临场砍 T3 验收 2b、单测与 roundtrip。

**为什么是这三条**

- T1 是本轮唯一「用户在只读视图里找词，实际改了要保存的正文」的路径，且 `Ctrl+S` 前无任何提示（findings-bug 第 1 条）。同一功能在源码模式里是锁住的（第 39 轮做的），预览没有，属实现缺口而不是产品选择。改动 3–10 行。
- T2 的键盘出口是 WCAG 2.1.2（键盘陷阱）项，findings-ui 记 P1。revision 1 把它做成**正向**出口：Esc 后焦点落到正文之后的第一个可聚焦控件（状态栏字数入口），`Tab` 不再被正文吞掉，正文之后的状态栏从此可达；不再回工具栏（review R42-5）。页边批注卡片本身仍不在 Tab 顺序里（`.note` 无 `tabindex`），另排（§四），不在本任务承诺内。顺带的三条（工具栏按下态、表格条危险色、正文焦点指示线）都是同一批 UI 组件、同一批 CSS，单独排一轮不划算；它们也都是 P2/P3 里「改动 < 30 行、看得见」的类型。
- T3 是性能里证据最完整、风险最低的一条：`outMs ≈ parse + 0.2–0.4 s`，1 MB/4,096 段 **5,537 ms → 估计 ~400 ms**（findings-code F1 的实测表）。同时把 `serializeDocument` 的 3 个全文扫描加精确守卫（每键 −4.9 ms，1 MB），并给这条保存唯一出口补单测——第 39/40 轮已两次报过它没有单测（findings-code F4）。
- 3 个任务都碰 `src/`，所以本轮 `npm run roundtrip` 必跑（`roles/planner.md` 与 AGENTS §3）。

## 二、planner 只读复核：5 条要改的 finder 说法（执行前先看）

这 5 条直接影响任务能不能按 finder 的建议做，执行代理必须按这里的口径，不要按 finder 原文照抄。

1. **findings-code F1 的补丁判据不成立**。它建议用 `currentMarkdown()` 比「源码没改」与「正文现在是什么」，但 `src/App.tsx:2790-2799` 的 `currentMarkdown()` 在 `sourceMode` 为真时**直接返回 `sourceText`**（`:2791`）；`applySource`（`:3806`）是在离开源码、`setViewMode` 之前调用的，此时 `sourceMode` 仍为真 → 判据恒真 → **源码里的编辑会被静默丢掉**（数据丢失）。T3 必须先抽一个「不看 sourceMode 的正文序列化」`serializeBodyNow()` 再用它做判据（见 T3 第 1 步）。
2. **findings-code F4 说 `serializeDocumentBody`「只被死函数使用」不成立**。`git grep -n serializeDocumentBody` 实测 3 处活引用：`scripts/fidelity-acceptance.mjs:14`、`:43`、`:144`（另 `src/App.tsx:74` import、`:188` 死函数调用、`src/lib/serializeDocument.ts:41` 定义）。T3 只删 `serializeBody` 与 `clearSession`，**保留 `serializeDocumentBody`**。
3. **findings-ui F2 说表格条「7 个按钮无名称」不准确**：7 个按钮都有文字内容（「上插入」…「删表」），文字就是可访问名，`aria-label` 不是缺口。真正的缺口是「破坏性操作与安全操作同色」（浅色都是 `rgb(35,84,77)`）与「插入组/删除组无分组」。T2 按这个口径做，别加一堆重复的 `aria-label`。
4. **findings-typora §1 的 A 档不能照字面做**。它建议把正文 `<br>` 换成 `hardBreak`、说「序列化仍写 `<br>`」；实测 `node_modules/@tiptap/extension-hard-break/dist/index.js:29` 是 `renderMarkdown: () => \`  \n\``（两个空格 + 换行），**只有表格单元格的序列化把 hardBreak 写成 `<br>`**。照做会把 `行尾<br>换行` 首次保存写成 `行尾  \n换行`，破坏第 40/41 轮刚守住的逐字节保真。本轮不做这一条，等专门一轮用「专用 inline 节点（渲染 `<br>`、序列化写回 `<br>`）」实现；见 §四。
5. **findings-ship S3 要删/改 `release/`**（`release/SHA256SUMS.txt`），本轮硬约束是「不改 `release/`」，所以本轮只记文档、不动作；S2 的安装包图标要重打包验证，与「不改 release/」和 35 min 预算都冲突，放到下一轮发布专项；见 §四。

## 三、任务

### T1 · 预览（只读）模式锁住「替换 / 全部替换」（P1，数据安全）

**为什么**：findings-bug 第 1 条实测——预览里 `Ctrl+F` 打开查找条，`替换`/`全部替换` 都可用，点下去正文立刻改、`dirty` 变 true，退出预览按 `Ctrl+S` 就落盘；旁边没有任何说明。同一功能在源码模式是锁住的（`FindBar` 的 `unavailableReason` 机制，第 39 轮）。用户以为在只读视图里找词，实际改了要保存的正文。

**涉及文件/函数**

- `src/App.tsx:4720-4724`：`FindBar` 的 `unavailableReason` 只判 `sourceMode`。
- `src/App.tsx:1835-1840`（`replaceCurrent`）、`:1842-1854`（`replaceEvery`）：直接对编辑器文档 `insertContentAt` / `transaction.insertText/delete`，不看视图。
- `src/components/FindBar.tsx:21-23`、`:48-49`、`:60-67`、`:114-120`、`:136`：已有 `locked` 机制（有 reason 就禁用四个动作按钮、吞掉 Enter、计数留空、显示 `.find-note`），**不用改**。
- 参照：`src/App.tsx:4731-4736`（预览关闭查找条时显式不聚焦的既有注释，别动）。

**实施步骤**

1. `src/App.tsx:4720-4724` 改成三段：
   ```tsx
   unavailableReason={
     sourceMode
       ? '源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查'
       : previewMode
         ? '预览是只读视图，不支持查找与替换：切回编辑（Ctrl+Shift+P）再查'
         : undefined
   }
   ```
2. 纵深守卫（`FindBar` 的 Enter 已被 locked 吞掉，但按钮 `onReplace` 与未来调用点不认视图）：
   - `replaceCurrent`（`:1835`）与 `replaceEvery`（`:1842`）函数体第一行加 `if (previewMode) return`，两者 `useCallback` 依赖数组补 `previewMode`。
   - `previewMode` 定义在 `src/App.tsx:411`，可用。
3. `Ctrl+F` / `Ctrl+H`（`src/App.tsx:3669-3673`）**不改**：预览里仍打开查找条，显示说明，与源码模式一致。
4. 不动 `FindBar.tsx`、不动 `Ctrl+Shift+P` 的切换逻辑。

**验收标准（可执行）**

> 注意：**不要原样重跑 `.tmp/e2e-r42-bug-c.mjs`**。它的 `page.click('.find-bar button:has-text("替换")')`（日志第 `## c2` 步）会等按钮可用，锁定后 Playwright 会 30 s 超时把脚本打死，走不到 `## c4`。把它**复制**成 `.tmp/e2e-r42-impl-t1.mjs`（保留种子与假工作区），只改第 3、4 步的触发方式（改 `page.evaluate` 里直接调 React props 的 `onClick`，**不是**对 disabled 按钮 `.click()`，理由见第 1 条 c2）与 c2/c3 的文本/计数断言（见下）。

1. 改后的脚本必须打出：
   - `## c1-findbar`：`note` 非空且含「预览」；`替换` 与 `全部替换` 的 `d` 为 `true`；`Aa`/`ab` 仍 `d:false`；`count === ''`——**锁定后计数留空是预期**，与源码模式同一语义（`src/components/FindBar.tsx:48` 的 `locked`、`:77` 的 `locked ? '' : …`，review R42-1）。
   - `## c2-locked`（新）：**不要用 `page.click`，也不要用「先把 `b.disabled` 改回 `false` 再 `b.click()`」**——后者在 React 19 下不会调到 `onClick`：`getListener` 在 `props.disabled` 为真且元素是 `button` 时对 `onClick` 直接返回 `null`（`node_modules/react-dom/cjs/react-dom-client.development.js:3456-3487`），整段测试「什么都没执行」也会全绿（review R42-9 给的修法按字面做就是这种假绿，本 revision 已换掉）。用 React 挂在 DOM 节点上的 props 直接调 App 传下来的回调：
     ```js
     const btn = [...document.querySelectorAll('.find-bar button')].find((b) => b.textContent.trim() === '替换')
     const key = Object.keys(btn).find((k) => k.startsWith('__reactProps$'))
     btn[key].onClick() // 就是 src/App.tsx:4714 的 onReplace={replaceCurrent}，即 :1835 那个函数
     ```
     断言三条：`.preview-pane` 的 `innerText` 仍含「第一句在正文里」且不含「段落」（**只认 `.preview-pane` 这一条**：预览里它与 `.doc-column .ProseMirror` 是同一个 `<article>`，`src/components/PreviewPane.tsx:71-76`，写成两条会让人误以为测了两处）；`window.__slState.dirty === false`；`.find-count` 仍是 `''`。若取不到 `__reactProps$` 这个 key，这步会直接抛 TypeError 报红，**不会假绿**；下面第 2 条的 `## edit-handler-control` 再从正向证明这一招真能改到正文。
   - `## c3-locked`（新）：「全部替换」用同一招（`textContent.trim() === '全部替换'` → `src/App.tsx:4715` 的 `onReplaceAll={replaceEvery}`，守卫在 `:1842`），三条断言同 c2。
   - `## c4-saved`：退出预览 → `Ctrl+S` → `seedSame:true`（改前 `false`），`dialog:null`。
   - `## c5-source-locked`：源码模式那条说明与四个按钮的 `disabled:true` **保持原样**（回归，证明没把机制改坏）。
   - `## c6`：`乙.md` 仍是 `/^> 引用行\n> <p>html 段<\/p>\n$/`（bug 第 2 条本轮不做，行为不变即为通过）、`丙.md` `same:true`（不回归）。
2. **正向对照（没有它，c2/c3 可能是「回调根本没调到」的假绿）**：
   - `## edit-handler-control`：退回编辑（`Ctrl+Shift+P`）→ `Ctrl+F` → 填同一组查找/替换 → 停 300 ms 等 `matches` 生效 → 用**同一招** `__reactProps$.onClick()` → 正文含「段落」、`dirty:true`（证明这一招确实调到 `replaceCurrent`；这条红了，c2/c3 的绿就作废）。
   - `## edit-replace-click`：再点一次**真按钮**（编辑态按钮没锁，`page.click('.find-bar button:has-text("替换")')` 可用）→ 第二处「正文」也被替换 → `Ctrl+S` → 盘上字节含「段落」（证明只是锁了只读视图，没把功能整体砍掉）。
3. 截图：`shots/round-42/impl-t1-preview-find-locked.png`（预览 + 查找条 + 说明 + 两个灰按钮）、`impl-t1-edit-replace-click.png`（编辑态真按钮替换成功）。
4. 门禁：`npm run build`、`npm test`（此时点 28 文件 362 条，0 fail）。

**风险**：低。① 别把 `FindBar` 的 `locked` 语义改宽：`locked` 会让 `.find-count` 留空（`FindBar.tsx:48,77`），源码模式第 39 轮与本次 c1–c3 的断言都是这么写的；不要为断言给 `window.__slState` 加字段（review R42-1）。② `.find-note` 文案里必须出现「预览」两个字，方便断言。③ **已知代价**（review R42-6）：预览里整条查找条锁住，命中计数（改前 `1 / 2`）不再显示；预览里 ↑/↓ 本来对预览面板无可见效果（只动编辑器选区，`src/App.tsx:1812-1823`），所以只锁替换需要给 `FindBar` 加第三态并重写第 39 轮源码模式断言，不在本轮 5 min 预算内。按「与源码模式一致」接受，并按 §五 收尾 1/2 记进 CHANGELOG 与 README「现在不能做什么」。

---

### T2 · 键盘正向离开正文 + 工具栏按下态 + 表格条危险色 + 正文焦点指示线（P1/P2，可访问性）

**为什么**：findings-ui F1 实测——正文中段 `Tab` ×3 插入 6 个空格、焦点不动，`Esc` 也不动，只有 `Shift+Tab` 能逆向离开（WCAG 2.1.2，键盘用户按文档顺序进正文后出不去，正文**之后**的状态栏与页边区域不可达）。同批 P2/P3：工具栏 6 个格式按钮没有按下态与 `aria-pressed`（F3）、表格条删除与插入同色且无分组（F2）、空文档与正文整列被画 2px 青绿框（F5）。四条改动都在同一批组件与 CSS。revision 1 把出口做成**正向**（正文之后的第一个可聚焦控件），并在长文中段复验焦点指示（review R42-4/R42-5）。

**涉及文件/函数**

- `src/App.tsx:3562-3616`：window 的 `Escape` 分支（现到 `previewMode` 后直接 `return`）。全分支**没有** `event.isComposing`（只有正文 Tab 分支用了它，`:835`、`:851`）。
- `src/App.tsx:851-859`：正文 `Tab` 插两个空格（第 24 轮的产品选择，**保持不动**）。
- `src/App.tsx:4633-4650`：H1/H2/B/I/S/`</>` 六个按钮（I/S/`</>` 现有类名 `italic`/`strike`/`mono` 在 `:4642`/`:4645`/`:4648`）。
- `src/App.tsx:4741-4766`：表格工具条 7 个按钮。
- `src/components/StatusBar.tsx:39-51`：Esc 的正向落点 `.status-bar .stats-trigger`（无副作用：只打开只读字数面板）。
- `src/styles.css:147-150`：全局 `:focus-visible`；`:247-251` `.doc-scroll`（**滚动容器**）；`:559-565` `.doc-body`（随正文变高，无 overflow/min-height）；`:1268-1272` `.toolbar button.is-on`（**已存在，复用**）；`:1274-1285` `.italic`/`.strike`/`.mono`；`:1885-1910` `.table-bar` 与按钮；`:18`/`:54` `--danger`；`:29` `--font-mono`。
- 相关实测：`src/components/LinkEditor.tsx:69-72`、`:100-103` 与 `src/components/MathInlineEditor.tsx:56-60` 的 Escape 只 `preventDefault()`、**不 `stopPropagation()`**；`src/components/InlinePopover.tsx:28-32` 会 `stopPropagation()`。这决定 T2 第 1 步的守卫必须判「焦点在 `.ProseMirror` 里」。

**实施步骤**

1. **Esc 出口**（`src/App.tsx`）：在 `if (previewMode) { … return }`（`:3611-3615`）之后、函数末尾 `return`（`:3616`）之前插入：
   ```ts
   // 正文里 Tab 是缩进（第 24 轮）：Esc 是键盘用户按文档顺序的正向出口（WCAG 2.1.2）
   // 组合输入中按 Esc 是取消拼音候选的常规动作：不能抢焦点、不能丢正在组合的字（review R42-3）
   if (event.isComposing || event.keyCode === 229) return
   const activeElement = document.activeElement
   if (activeElement instanceof HTMLElement && activeElement.closest('.ProseMirror')) {
     // 正向：正文之后第一个可聚焦控件 = 状态栏字数入口（只打开只读面板，无副作用）
     // 不优先页边批注卡片：卡片按钮是「采纳 / 忽略 / 联网核对」，Esc 后误按 Enter 会改正文或发请求
     const next = document.querySelector<HTMLElement>('.status-bar .stats-trigger')
     if (next) {
       event.preventDefault()
       next.focus()
       return
     }
   }
   ```
   位置必须在这个分支之后：对话框/查找/菜单/源码/预览各有自己的分支，先到先得。`closest('.ProseMirror')` 守卫是必须的：`LinkEditor`/`MathInlineEditor` 的 Esc 不 `stopPropagation`，它们的 input 不在 `.ProseMirror` 里，守卫能保证不抢焦点。`isComposing` 守卫**只加在新分支里**，不要上移到 `if (event.key === 'Escape')` 顶部——那会一并改掉「查找条 / 设置 / 源码 / 预览」现有的 Esc 行为。
   落点用 `.status-bar .stats-trigger`（`src/components/StatusBar.tsx:39-51`，DOM 在正文之后：`src/App.tsx:5025`）。这是 review R42-5 的方案 ②，验收第 1 条要断言 DOM 顺序。这个 `useEffect` 的依赖数组**不用动**：新分支只读 `document`，不引入新的 state/ref。
2. **正文焦点指示线**（`src/styles.css`，`:247-251` 的 `.doc-scroll` 块之后新增；不改 `:150` 的全局 `:focus-visible`）：
   ```css
   /* 正文按键盘进入时不再套整列 2px 框；指示器钉在滚动容器顶边，长文滚到中段也可见（review R42-4） */
   .doc-body:focus-visible {
     outline: none;
   }
   .doc-scroll:has(.doc-body:focus-visible) {
     box-shadow: inset 0 2px 0 0 var(--accent);
   }
   ```
   滚动容器是 `.doc-scroll`（`overflow-y: auto`，`:247-251`），`.doc-body` 只随正文变高（`:559-565` 无 overflow/min-height），所以内阴影必须画在 `.doc-scroll` 上，否则长文滚到中段时线已滚出视口（review R42-4）。编辑器的 class 是 `editor doc-body`（`src/App.tsx:812`），预览列虽然也叫 `doc-body`（`src/components/PreviewPane.tsx:72`）但 `contentEditable=false` 且无 `tabindex`，`:focus-visible` 不会命中；源码框（`.source-editor`）不在 `.doc-body` 里。若打包后的 WebView2 不支持 `:has`（Chromium 105+ 才有；现有运行时支持），退回 `.doc-scroll:focus-within`（代价：正文里链接聚焦也画线），并写进 impl.md 的偏差记录——**不要留下「outline 去掉了、替代指示器没生效」的状态**。
3. **工具栏按下态**（`src/App.tsx:4633-4650`）：先在组件体里定义 6 个布尔量，**落点写死**：`const run = useCallback(…)` 结束（`src/App.tsx:3796-3803`）之后、`return (`（`:4414`）之前，例如紧跟 `run` 的定义之后、与 `run` 同层。**不要**放到 `const previewMode = …`（`:411`）附近——`const editor = useEditor({` 在 `:779` 才初始化，提前引用是 TDZ，`npm run build` 第一步 `tsc --noEmit` 直接报 TS2448/TS2454（review R42-7）；也不要在 `:4632` 的工具栏 JSX 里声明，那是 `return` 内部的 JSX 子节点，写不了 `const`：
   ```ts
   const heading1On = Boolean(editor?.isActive('heading', { level: 1 }))
   const heading2On = Boolean(editor?.isActive('heading', { level: 2 }))
   const boldOn = Boolean(editor?.isActive('bold'))
   const italicOn = Boolean(editor?.isActive('italic'))
   const strikeOn = Boolean(editor?.isActive('strike'))
   const codeOn = Boolean(editor?.isActive('code'))
   ```
   再改六个按钮：**H1/H2/B 用整串写法** `className={boldOn ? 'is-on' : undefined}` + `aria-pressed={boldOn}`；**I/S/`</>` 必须组合类名、保留现有类**（样式在 `src/styles.css:1274-1285`，整串替换会让斜体/删除线/等宽消失，review R42-2）：
   ```tsx
   <button type="button" className={`italic${italicOn ? ' is-on' : ''}`} aria-pressed={italicOn} onClick={() => run((chain) => chain.toggleItalic())} title="斜体">I</button>
   <button type="button" className={`strike${strikeOn ? ' is-on' : ''}`} aria-pressed={strikeOn} onClick={() => run((chain) => chain.toggleStrike())} title="删除线">S</button>
   <button type="button" className={`mono${codeOn ? ' is-on' : ''}`} aria-pressed={codeOn} onClick={() => run((chain) => chain.toggleCode())} title="行内代码">{'</>'}</button>
   ```
   样式复用 `.toolbar button.is-on`（`src/styles.css:1268-1272`，已存在，零新增 CSS）。重渲染由既有 `tick`（`src/App.tsx:1911-1929` 的 `selectionUpdate` bump）带，不需要新订阅。
4. **表格条**（`src/App.tsx:4741-4766`）：
   - 7 个按钮补 `title`：`在当前行上方插入行` / `在当前行下方插入行` / `在当前列左侧插入列` / `在当前列右侧插入列` / `删除当前行` / `删除当前列` / `删除整张表格`；**不加** `aria-label`（文字已是可访问名，见 §二-3）。
   - 三个删除按钮加 `className="is-danger"`；在「右插入」与「删行」之间插 `<span className="table-bar-sep" aria-hidden="true" />`。
   - `src/styles.css`（`.table-bar button` 一带，`:1902-1910`）加：
     ```css
     .table-bar button.is-danger { color: var(--danger); }
     .table-bar button.is-danger:hover { background: color-mix(in srgb, var(--danger) 15%, transparent); }
     .table-bar-sep { width: 1px; height: 14px; margin: 0 4px; background: color-mix(in srgb, var(--accent) 30%, var(--line)); }
     ```
5. **不做**：Tab 键行为不变（第 24 轮的产品选择）；表格条贴表格（742 px 间距）与拖拽重排不做（布局/交互改动，另排）；`aria-live` 查找计数（F8）不做，避免与 T1 的 `.find-note` 抢断言；页边批注卡片本身不是 Tab 可达（`.note` 是 `<article>`、无 `tabindex`，`src/components/MarginRail.tsx:106-115`），要补 `tabindex` 与 Enter 语义，另排（§四）。

**验收标准（可执行）**

新写 `.tmp/e2e-r42-impl-t2.mjs`（抄 `.tmp/e2e-r42-bug-a.mjs` 的假工作区；每个断言打一行 `## t2-*` JSON）：

1. 正文中段点一下 → `Tab` ×2 → `innerText` 长度 +4 且 `activeElement` 仍是 `.ProseMirror`（第 24 轮的 Tab 缩进没被改）；再按 `Escape` → `activeElement` 是 `.status-bar` 里的 `BUTTON`、class 含 `stats-trigger`；且 `.editor` 与 `document.activeElement` 的 `compareDocumentPosition` 结果含 `Node.DOCUMENT_POSITION_FOLLOWING`（**正向**出口，review R42-5）；再按一次 `Tab`，`activeElement` 不再是那个 `.stats-trigger`（焦点能继续向前走）。
2. Esc 后按 `Z`：正文长度不变（焦点确已离开正文）。
3. **焦点指示线（两条都做）**：
   - 首启空文档：先在正文里按一次 `Shift+Tab` 把焦点挪出正文（正文的 Tab 处理器对 `shiftKey` 直接 `return false`，`src/App.tsx:851`，浏览器默认动作会把焦点送回前一个可聚焦控件），再用真 `Tab` 逐次前进，直到 `document.activeElement` 是 `.ProseMirror`（最多 40 次，把次数打进日志）；断言 `.editor`（`.doc-body`）的 `outline-style` = `none`（或 `outline-width` = `0px`；不要只认 `0px`，Chromium 按实现取舍）且 `.doc-scroll` 的 `box-shadow` 含 `inset`。截图 `impl-t2-empty-focus.png`。
   - **长文中段（review R42-4 专抓）**：假工作区放一篇 3,000 段的 `长.md`（内容用 `` Array.from({ length: 3000 }, (_, i) => `第 ${i + 1} 段。`).join('\n\n') ``）。用与上一条相同的真键盘路径把焦点送进正文（`Shift+Tab` 出来 → `Tab` 循环回到 `.ProseMirror`，最多 40 次），先断言 `document.querySelector('.doc-body:focus-visible') !== null`（证明真命中了 `:focus-visible`）；为 `null` 时再试 `page.keyboard.press('Shift')` + `document.querySelector('.doc-column .ProseMirror').focus()`（键盘模态下的程序化聚焦也会匹配），仍为 `null` 就把这条记 UNVERIFIED 并写明浏览器不给 contenteditable 画 focus-visible。命中的前提下，把 `.doc-scroll.scrollTop` 设到 `scrollHeight / 2`，断言：`.doc-scroll` 的 `boxShadow` 含 `inset`、`.doc-scroll` 矩形仍与视口相交、且 `.doc-body` 的 `rect.top < 0`（正文顶部已滚出视口——旧写法把内阴影画在 `.doc-body` 上，这条必然失败）。截图 `impl-t2-focus-pinned.png`。
4. **工具栏按下态**：光标放进 `**加粗的文字**`：`B` 按钮 `aria-pressed="true"`、`className` 含 `is-on`、计算背景 ≠ 静止态；把光标移到普通段落：`aria-pressed="false"`、`className` 不含 `is-on`。B/I/S/`</>` 四个按钮各做 1 条同口径断言（共 8 条）；**H1/H2 只记录不 assert**（原砍单第 1 条已预砍）。另加 3 条计算样式（review R42-2）：I 的 `fontStyle === 'italic'`、S 的 `textDecorationLine` 含 `line-through`、`</>` 的 `fontFamily` 含 `mono`（`--font-mono` = `ui-monospace, "Cascadia Code", Consolas, monospace`，`:29`）——三条都要在**激活与未激活两种状态**下成立（激活时类名是 `italic is-on`，不是 `is-on`；整串替换会让三条同时红）。
5. 表格文档点单元格：`.table-bar` 7 个按钮 `title` 全部非空；删除三项 `color` = `rgb(180, 69, 58)`（浅色 `--danger #b4453a`）、插入四项仍是 `--accent-ink`；`.table-bar-sep` 存在 1 个。
6. 深色：切深色（设置 → 深色 → 保存）→ 只截 `impl-t2-tablebar-danger-dark.png`，**不做断言**（原砍单第 3 条已预砍）；impl.md 记下删除三项与插入四项的计算色，供人工看。
7. 回归：`node scripts/keyboard-acceptance.mjs` **52/52**，**本轮只跑这一次**（该脚本覆盖 Esc 回正文/源码/预览、Ctrl+F、Ctrl+K 等；它的 9 处 `Escape` 都不在「正文聚焦且无浮层」状态，新分支不会被它触发；它也不点 `.editor` 的焦点环，T2 的 CSS 不会让断言翻）。结果必须落进 impl.md，T3 验收 7 直接复用、不再跑第二遍（review R42-10）。
8. 截图：`shots/round-42/impl-t2-esc-out.png`（Esc 后焦点在状态栏）、`impl-t2-toolbar-pressed.png`、`impl-t2-tablebar-danger.png`（浅色）、`impl-t2-tablebar-danger-dark.png`（深色）、`impl-t2-empty-focus.png`、`impl-t2-focus-pinned.png`（长文中段）。
9. 门禁：`npm run build`、`npm test`、`npm run verify`（记下首屏新字节，差值与 `README.md:103` 的本轮 `+N B` 一起写进 impl.md）。

**风险**：中低。① Esc 分支插错位置（必须在所有对话框/浮层分支之后、末尾 `return` 之前）；② `:has` + `:focus-visible` 若不生效，指示器会整个消失（比改前更糟）——验收第 3 条两条断言专为它设，失败就按第 2 步的 fallback 改 `:focus-within` 并记偏差；③ 工具栏按下态依赖 `isActive`，须确认光标在标题里时 H1 高亮、在普通段落时不高亮（验收第 4 条只做记录）；④ I/S/`</>` 的类名必须**组合**而不是替换（review R42-2），验收第 4 条的 3 条计算样式断言专抓这一点；⑤ 组合输入守卫只加在新分支（`isComposing || keyCode === 229`），真机 IME 无法用 CDP 复现 → impl.md 记 UNVERIFIED「组合输入期间按 Esc 不夺焦、不丢拼音候选」。

---

### T3 · 退出源码不再整篇重解析 + repair 精确守卫 + 保存链单测（P1/P2，性能与内部质量）

**为什么**：findings-code F1 实测「打开长文 → `Ctrl+/` 看一眼 → `Ctrl+/` 回来」= 整篇重新 parse：1 MB/4,096 段 **5,537 ms**、1 MB/1,024 段 **1,323 ms**、100 KB **242 ms**；根因是 `applySource` 无条件 `setMarkdown`（`src/App.tsx:3814`）。findings-code F3 实测每键 `serializeDocument` 8.5 ms（1 MB），其中 `repairTildes` 2.8 + `repairHtml` 1.6 + `repairCalloutMarkers` 0.9 = **5.3 ms（62%）**，三者都没有廉价守卫；4 次 `includes` 只要 0.4 ms。findings-code F4：保存唯一出口 `serializeDocument` 无单测（28 个测试文件 0 个覆盖），3 个死符号第 39/40 轮报过仍在。

**涉及文件/函数**

- `src/App.tsx:2790-2799`（`currentMarkdown`，**sourceMode 时返回 sourceText**，见 §二-1）、`:3806-3826`（`applySource`）、`:3832-3861`（`switchView` 调 `applySource` 的时机）。
- `src/lib/tilde.ts:36-38`（`repairTildes`，`mapOutsideCode` 全文分段）、`src/lib/html.ts:20-51`（`repairHtml`，`mapOutsideCode` + 3 条正则）、`src/lib/escapes.ts:5-7`（`repairCalloutMarkers`，1 条全文正则）。
- `src/lib/serializeDocument.ts:50-66`（保存唯一出口，链顺序）。
- `src/lib/codeScan.ts` 的 `mapOutsideCode` 被 4 处共用（`tilde.ts`、`html.ts`、`risk.ts`、`escapeHtmlForParse`），**不动它**。
- 死符号：`src/App.tsx:186-189`（`serializeBody`）、`src/lib/session.ts:55`（`clearSession`）、`src/App.tsx:178`（悬空注释）；`src/lib/serializeDocument.ts:41-43` 的 `serializeDocumentBody` **保留**（见 §二-2）。**revision 2 按 R42-10 把这一项预砍出本轮**（见第 5 步与 §四），本轮不删。

**实施步骤**

1. **抽出不看视图的正文序列化**（`src/App.tsx`）：把 `currentMarkdown` 拆成两层：
   ```ts
   const serializeBodyNow = useCallback(() => {
     if (!editor) return ''
     const original = rawTextRef.current ?? originalText
     return serializeDocument(editor, {
       frontmatter: frontmatterRef.current,
       footnotes: footnotesRef.current,
       original,
     })
   }, [editor, originalText])
   const currentMarkdown = useCallback(
     () => (sourceMode ? sourceText : serializeBodyNow()),
     [sourceMode, sourceText, serializeBodyNow],
   )
   ```
2. **`applySource` 加「没改就跳过」**（`:3806-3826`），判据必须用 `serializeBodyNow()`：
   ```ts
   const normalizedSource = sourceText.replace(/\r\n/g, '\n')
   // 源码框没动过，且正文现在序列化出来就是这段文本 → 不必整篇 parse
   // 不能用 currentMarkdown()：它在 sourceMode 时返回 sourceText，判据恒真（会丢源码编辑）
   const skipReparse =
     sourceText === sourceBaselineRef.current &&
     normalizedSource === serializeBodyNow().replace(/\r\n/g, '\n')
   if (!skipReparse) {
     setMarkdown(footnoteSplit.body)
     /* 原有的批注按引文重定位（:3816-3822）整段留在 !skipReparse 分支里 */
   }
   syncDocInfo(editor)
   if (baselineRef.current !== null) setDirty(normalizedSource !== baselineRef.current)
   ```
   - `setFrontmatter`/`setFootnotes`/`frontmatterRef`/`footnotesRef` 那几个赋值放在分支外（文本没变时结果相同，且极便宜）。
   - `applySource` 的 `useCallback` 依赖数组补 `serializeBodyNow`。
   - 注释里写明「为什么不能用 currentMarkdown()」（防止下一次有人改回去）。
3. **三个精确守卫**（都是「没有对应字符就不可能有命中」，不是启发式）：
   - `src/lib/tilde.ts:36`（`repairTildes` 首行）：`if (!markdown.includes('\\~')) return markdown`（序列化器只把正文里真的 `~` 转成 `\~`；`~~删除~~` 不含 `\~`，也走快路径）。
   - `src/lib/escapes.ts:5`（`repairCalloutMarkers` 首行）：`if (!markdown.includes('\\[!')) return markdown`（正则要匹配的就是 `\[!`）。
   - `src/lib/html.ts:20`（`repairHtml` 首行，在 `const source = …` 之后、`mapOutsideCode` 之前）：
     `if (!markdown.includes('&lt;') && !markdown.includes('&amp;') && !markdown.includes('&gt;')) return markdown`
     （`ESCAPED_TAG` 必要条件含 `&lt;`、`ESCAPED_ENTITY` 必要条件含这三者之一，三条缺一不可）。
   - **不改** `repairMath`（0.2 ms）/ `repairFootnoteRefs`（0.1 ms）/ `mapOutsideCode` 本身。
4. **保存链单测**：新增 `src/lib/serializeDocument.test.ts`（`node --experimental-strip-types` 可直接跑，不引入 tiptap），用假源 `{ getMarkdown: () => md }`，≥8 条：
   - ① 无 original：正文原样、无多余尾部空行；② original 以 `\n` 结尾：输出保留同样一个换行；③ CRLF original：输出用 CRLF；④ frontmatter 选项拼在正文前（`joinFrontmatter` 的 leading 口径）；⑤ footnotes 选项拼在正文后；⑥ `repairTildes` 生效（`H\~2\~O` → `H~2~O`）；⑦ `repairCalloutMarkers` 生效（`> \[!NOTE\]` → `> [!NOTE]`）；⑧ `repairHtml` 实体还原（原文有 `&`，序列化出的 `&amp;` → `&`；原文写的是 `&amp;` 时保持）；⑨ `reuseTables`：original 里未改动的表格块字节原样复用；⑩ `collapseBlankParagraphs`：连续空段落被收掉。
   - 把该文件追加到 `package.json:15` 的 `"test"` 脚本**末尾**（`&& node --experimental-strip-types src/lib/serializeDocument.test.ts`），**别重排、别改其它文件项**；跑完 `npm test` 应为 **29 个文件、≥370 条、0 fail**（基线 28/362）。
5. **（revision 2 已预砍：本轮不做，见 §四）清死符号**。下一轮按下面执行（先 grep 证明 0 引用再删；用 `-w` 全词匹配，否则 `serializeBodyNow` 会被算成引用）：
   - `git grep -nw "serializeBody"` → 现在只有 `src/App.tsx:187` 定义（`:186`/`:189` 是注释与 `}`）→ 删函数；`src/App.tsx:74` 的 import 去掉 `serializeDocumentBody`（保留 `serializeDocument`）。
   - `git grep -n "clearSession"` → 现在只有 `src/lib/session.ts:55` 定义（自包含，只用 `openDb`/`KEY`，删了不会留孤儿 import）→ 删函数。
   - 删完再跑一次两条 grep 作为 0 命中证据（正向对照：改前各 ≥1 命中）。
   - 删 `src/App.tsx:178` 的悬空注释。
   - **不开** `noUnusedLocals`（findings-code F4 已说明会一次爆 47 个 export，另排一轮）。
6. **不做**：findings-code F2（按段数守卫，需产品定阈值、且要先修 marked 二次方）、F5（宿主脏基线口径，浏览器态测不到）、findings-typora §1（见 §二-4）。

**验收标准（可执行）**

1. **性能（主指标，两条口径一起判）**：
   - 跑之前先把 `.tmp/e2e-r42-code-perf.mjs` 与 `.tmp/e2e-r42-code-steps.mjs` 复制成 `.tmp/e2e-r42-impl-perf.mjs` / `-steps.mjs`，把输出 JSON 改成 `.tmp/perf-round42-impl*.json`：finder 的 `.tmp/perf-round42-code.json` / `-steps.json` 是本轮基线证据，别覆盖。
   - **(a) 物证：`sl-parse-done` 不增加**。`setMarkdown` 在 DEV 下打 `performance.mark('sl-parse-done')`（`src/App.tsx:1005`，全仓只此一处；StrictMode 只影响载入那两次，不影响本断言）。先记 `performance.getEntriesByName('sl-parse-done').length`，进源码（不改）→ 退出后**再记一次，必须相等**；对照：进源码改一个字再退出，计数必须 +1（证明该跑的时候还跑）。这一条比墙钟稳定，是主判据。**这段直接写进 `.tmp/e2e-r42-impl-t3.mjs`（与验收 2 同一次运行，`performance.getEntriesByName` 在页面里读），不要为它单写脚本**（review R42-10 的省时项）。
   - **(b) 墙钟**：`node .tmp/e2e-r42-impl-perf.mjs 9222`（就是上面复制的副本；别跑 finder 的原件，它的 `.tmp/perf-round42-code.json` 是本轮基线证据）（页面级 WS，见 `.tmp/r41-cdp.mjs`；每个 case 先等 `document.title` 以本篇文件名开头，见 findings-code §8-2），`sourceToggle.outMs`：
     `A-100KB-1k` ≤ **140 ms**（改前 242）、`B-1MB-1k` ≤ **650 ms**（改前 1,323）——这两个判门槛；`C-1MB-4k` **只跑一次记录、不判门槛**（原砍单第 4 条已预砍；改前 5,537 ms，剩余时间主要是 4k 段 DOM 重建 76k 节点），数字与改前对照写进 impl.md。
   - 若 `C` 载入本身要 11 s、整脚本跑不完，允许只跑 A/B，`C` 用同一脚本单独跑一次并记录；数字与改前对照一起写进 impl.md。
2. **正确性（比性能更重要）**：新写 `.tmp/e2e-r42-impl-t3.mjs`（假工作区 + `Ctrl+/` 真按键），三段断言：
   - (a) 打开 `甲.md` → `Ctrl+/` → `Ctrl+/` → `Ctrl+S` → 盘上字节**逐字节等于种子**（跳过重解析不许改字节）；
   - (b) 进源码 → 在 `.source-editor` 末尾输入 `源码改动` → `Ctrl+/` → 正文含「源码改动」（**证明源码编辑仍会被应用**；这是本任务最大的回归风险，必测）；
   - (c) 进源码 → 不改 → `Ctrl+/` 退出 → 标题不带 `•`、`window.__slState.dirty === false`。
3. **守卫收益**（`node .tmp/e2e-r42-impl-steps.mjs 9222`，即上面复制的副本；它按 `/src/lib/*.ts` 动态 import 并 5 次取中位；1 MB 样本）：
   - `repairTildes` ≤ **0.3 ms**（改前 2.8）、`repairCalloutMarkers` ≤ **0.3 ms**（改前 0.9）——这两条守卫各只有一次 `includes`。
   - `repairHtml` ≤ **0.6 ms**（改前 1.6）：它的守卫用 `&&` 串了**三次** `includes`（`&lt;` / `&amp;` / `&gt;`，`src/lib/html.ts:20-22`），样本里三个子串都不存在时三条全跑；按 `.tmp/perf-round42-steps.json` 的 `guardsIncludes`（4 次 `includes`）0.4 ms 换算，三条 ≈0.3 ms，加 `typeof original` 与调用成本落在 0.3–0.5 ms。**0.4–0.6 之间属达标，不要为了压线去改守卫**（review R42-8）。
   - `serializeDocument` 合计 ≤ **5.5 ms**（改前 8.5）；`guardsIncludes` ≤ **0.6 ms**（与 `repairHtml` 同口径）。
4. **保存链不回归**：`npm run roundtrip` → `rich 5/7`、`source 7/7`（与改前一致；diff 的两条是已知限制，不许变多）。**只跑一次**：与验收 8 的门禁串跑共用同一份输出（同一条命令、同一份代码，重复跑不增加信息）。
5. **单测**：`npm test` **29 文件、≥370 条、0 fail**；impl.md 贴汇总行。
6. **（revision 2 已预砍：本条不执行、不判，移到 §四）死符号**：`git grep -nE "serializeBody|clearSession"` → **0 命中**（`git grep` 默认 POSIX BRE，交替要写 `-E`，AGENTS §8）；正向对照（改前）各 ≥1 命中。证据口径留在 §四，下一轮照做。
7. **回归**：`node scripts/fidelity-acceptance.mjs`（19/19；它写 `shots/round-10/` 的 3 张旧截图，跑完 `git checkout -- shots/round-10/` 还原，AGENTS §8）；`keyboard-acceptance.mjs` 的 52/52 **必须复用 T2 验收 7 的结果，本轮不再跑第二遍**（review R42-10；只有 T2 因故没跑时才补跑一次）。
8. 门禁：`npm run build`、`npm run verify`（首屏 gzip ≤310,000 B 内部线）、`npm test`、`npm run roundtrip`。

**风险**：中。① 判据必须用 `serializeBodyNow()`，用 `currentMarkdown()` 会静默丢源码编辑（§二-1，验收 2b 专门抓）；② `dirty` 语义不能变：`applySource` 结尾那行 `setDirty` 要保持原样；③ 跳过时批注重定位一并跳过——正文没变，位置仍有效（安全），但 impl.md 要写明这条假设；④ 守卫如果写宽（例如 `repairTildes` 用 `includes('~')`）只是少省一点，不会错，但要用 `includes('\\~')` 才精确；⑤ 新增单测若把当前输出「照抄」死，要写明它是回归锁而不是语义规格。

## 四、本轮不做（有证据、有原因、写清下轮怎么排）

| 条目 | 来源 | 级别 | 为什么本轮不做 |
| :--- | :--- | :--- | :--- |
| 删除 `release/SHA256SUMS.txt` / 发布资产口径 | ship S3、S1 | P2 | 本轮硬约束「不改 `release/`」；S3 的修复动作本身就在 `release/`，只能下轮发布专项做（或只改 `packaging/` 脚本生成带版本号的文件）。S1 的 README/packaging 数字口径改动零风险，可与 S3 同轮做。 |
| `setup.exe` 图标（第 40/41/42 三轮未修） | ship S2 | P2 | 需要 `host\build.ps1` + `installer.ps1` 重打包并在 `.tmp` 隔离根验证图标资源（约 3–5 min），还要避开 `release/`；与 T1–T3 的门禁串跑一起会超 35 min。下轮发布专项：改 `installer.nsi` 2 行 + 隔离根出包 + `[System.Drawing.Icon]::ExtractAssociatedIcon` 对照，`release/` 不动。 |
| 打包体积逐轮台账 | ship S4 | P2 | 需改 `packaging/*.ps1`（PowerShell 必须带 UTF-8 BOM，AGENTS §8）并真实出包验证，与上一条同批做更省。 |
| 沙箱限制清单补第 4 条 | ship S5 | P2 | 纯文档，1 行；与 ship S1/S3/S4 同轮收，不占本轮执行预算。 |
| 1 MB 能否打开取决于段数 | code F2 | **P1** | 改的是载入行为（超阈值自动进源码）并需产品定阈值；根因是第 41 轮 F1 的 marked 二次方。本轮先做 F1（T3）保住「看一眼就回来」的路径，下一轮单独立项：先给 marked 二次方定位，再定阈值。 |
| 块引用后紧跟裸 HTML 被并进引用 | bug 第 2 条 | P2 | 与 typora §1 同一片解析/序列化逻辑；可行的修法要么在 parse 输入里插空行（首次保存多一个空行，仍非逐字节），要么给块级 HTML 加专用节点——需要一次专门设计 + 逐字节回归，硬塞进本轮会碰第 41 轮刚改的 `escapeHtmlForParse`。下一轮与 typora §1 同批做。 |
| 行内 HTML 与正文 `<br>` 不渲染 | typora §1 | **P1** | 见 §二-4：不能直接用 `hardBreak`（会丢 `<br>` 字节）。正确做法是专用 inline 节点 + 写回 `<br>`，约 60–90 行 + 单测 + 逐字节 E2E；本轮预算不够，且必须在 `escapeHtmlForParse` 之外实现。 |
| Mermaid 不跟随主题切换 | typora §2 | P2 | 两处缓存（`mermaidLazy.ts`、`mermaidPreview.ts`）都要清；改动 30 行、风险低，下轮第一梯队。 |
| 表格列对齐按钮 / 表头行 Enter 建表 / 图片落盘规则 / 源码行号 / Ctrl+滚轮 / 自动配对 / 智能标点 `---` | typora §3–§9 | P2 | 都是「新入口/新能力」，各 30–70 行；本轮三个任务已满 35 min，按 typora §14 的排序留到后面（§5 自动配对回归面最大，最后单独一轮）。 |
| 查找计数 live region、插入菜单 menu 语义、1024 窄窗列宽、H2/H3 行高、`:active` 态、复选框点击区 | ui F4/F6/F7/F8/F9/F10 | P2/P3 | 单条都 < 20 行，但需要各自的 E2E/截图；本轮 T2 已收同批 4 条，剩下的下轮按「用户可见收益」继续清。 |
| `typora-gap.md` 过期计数 | typora §10 | P2（文档） | 要等 typora §3（表格对齐入口）落地后一次改对计数；本轮只记证据（`Ctrl+Shift+V` 已可用、缺的少 4 行、应改为 30 有 / 15 缺 或 31 有 / 14 缺），下轮与 §3 同改。 |
| 宿主脏基线口径 | code F5 | P2 | 浏览器态拿不到 `/__doc`（findings-code §7-1），只能静态改 + 宿主真机验；属于宿主专项。 |
| 死符号清理（`serializeBody` / `clearSession` / `App.tsx:178` 悬空注释） | code F4 | P2（内部质量） | **revision 2 按 R42-10 预砍出本轮**：3 个新 E2E + 4 次性能跑 + 两套 acceptance 已占满预算，这条只值 2 min 却排在最外层。下轮照 T3 第 5 步的证据口径做：`git grep -nw "serializeBody"`（当前只有 `src/App.tsx:187` 定义）与 `git grep -n "clearSession"`（只有 `src/lib/session.ts:55` 定义）先贴正向对照，再删函数、`src/App.tsx:74` 的 import 项与 `:178` 悬空注释；`serializeDocumentBody` **保留**（活引用在 `scripts/fidelity-acceptance.mjs:14/43/144`）。 |
| 预览里查找只锁替换、保留命中计数 | review R42-6 | P2 | 需要给 `FindBar` 加第三态（锁替换但不锁计数），并重写第 39 轮源码模式的四条断言；本轮按「与源码模式一致」全锁，代价已记进 README/CHANGELOG（§五 收尾 1、2）。下轮单独立项。 |
| 页边批注卡片的键盘可达（`.note` 无 `tabindex`） | review R42-5 | P2 | 要让卡片本身进 Tab 顺序并补 Enter 语义（`src/components/MarginRail.tsx:106-115`），属 `MarginRail` 交互设计；本轮 Esc 正向出口只保证「能离开正文」，卡片可达另排。 |

## 五、统一门禁、收尾与砍单顺序

**每个任务各自跑**：任务里列出的门禁 + 该任务的 E2E 断言。**全部做完后串跑一次**（顺序照 AGENTS §3）：`npm run build` → `npm test` → `npm run verify` → `npm run roundtrip`；`data-safety`/`session`/`host-*` 这些依赖假 FSA 或宿主的套件按惯例记 UNVERIFIED（本轮改动不碰它们，除非 T3 的 `applySource` 影响 —— 影响面已由 T3 验收 2 覆盖）。

**收尾文档（执行代理做，tester 提交前复核）**：

1. `docs/CHANGELOG.md` 的 `## Unreleased` 加第 42 轮小节：T1 预览只读锁替换（**并写明「预览里查找条整体锁住，命中计数不再显示，与源码模式一致」这条可见代价**）、T2 键盘出口与工具条状态、T3 源码往返性能与守卫；写实测数字（首屏 gzip 新值、sourceToggle 改后三个数、serializeDocument 改后值、测试文件/条数）。
2. `README.md:103` 的首屏数字加「第 42 轮 +N B」：
   - 「现在能做什么」补两句：「预览（只读）视图里查找替换整体锁住，源码模式同样锁住」；「正文里按 Esc 离开正文、焦点落到状态栏字数入口（正向出口，键盘陷阱已消除）」。
   - 「现在不能做什么」补三条：① 「预览（只读）里查找不显示命中数、上一处/下一处不可用（与源码模式一致）」；② 「页边批注卡片本身不能 Tab 到（卡片要先用鼠标点）」；③ 「表格工具条的贴靠位置与行列拖拽重排仍未支持」。
3. `docs/iteration/round-42/impl.md`：每个任务的改动文件:行号、命令与原始输出、截图路径、与计划的偏差、UNVERIFIED。
4. `docs/iteration/STATE.md` **不归执行代理改**（根代理轮末统一更新）。
5. 版本号不动、`release/` 不动、不 push。

**砍单顺序（revision 2 已把该砍的预砍进任务体，执行代理不必临场判断）**：

已预砍（直接按任务体执行，不要再问）：T2 验收第 4 条的 H1/H2 只记录不 assert；T2 验收第 6 条深色只截图不断言；T3 验收 1(b) 的 `C-1MB-4k` 只跑一次不判门槛（1(a) 的 `sl-parse-done` 物证保留）；**T3 第 5 步（死符号）与验收 6 整条不做**（见 §四）；`keyboard-acceptance` 只在 T2 跑一次、T3 复用。
仍可砍（只在超出 35 min 时按顺序，不要跳着砍）：
1. T2 验收 8 的两张截图（`impl-t2-toolbar-pressed.png`、`impl-t2-tablebar-danger-dark.png`）——对应的计算断言都在，截图只是证据冗余；
2. 还超：T2 验收第 3 条「长文中段」那半条只留截图与计算值，不判 `.doc-body` 的 `rect.top < 0`；
3. 还超：T3 验收 1(b) 的 `C-1MB-4k` 完全不跑，只记改前 5,537 ms。

**这两个耗时检查点必须记**（impl.md 开头加一行 `## 耗时`）：T1 结束、T2 结束各记一次累计分钟数；**T2 结束时 > 22 min 就先执行上面第 1、2 条再进 T3**，不要等全轮跑完才发现超。

**这些不砍**：T1 的预览锁与编辑态仍可用两条（含 `## edit-handler-control` 对照）；T2 的 Esc 正向出口（含 `isComposing` 守卫）+ 第 24 轮 Tab 缩进回归 + `keyboard-acceptance` 52/52；T3 的 `serializeBodyNow` 判据 + 验收 2b（源码编辑仍生效）+ 三个守卫 + 新增单测 + roundtrip。

## 六、环境与脚本注意（本轮会重复踩）

- dev server 在 `http://localhost:5175`：不另起、不重启；`5173` 是僵尸，禁用。浏览器只用 CDP 9222，不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- 每次 E2E 前 `node .tmp/reset.mjs 9222`。`reset.mjs` 之后剩下的是 `about:blank`：`playwright-core` 的 `connectOverCDP` 可以直接 attach（`.tmp/e2e-r42-bug-*.mjs` 就是这么写的）；页面级 WS 脚本（`.tmp/r41-cdp.mjs`）要用 `newPage(PORT, URL)` 开新标签再 `openWs`。两种写法别混。
- 中文脚本用 `write`/`edit` 工具改，不要用 PowerShell `Get-Content -Raw | -replace | Set-Content`（AGENTS §8）。
- `scripts/fidelity-acceptance.mjs` 会覆盖 `shots/round-10/` 的 3 张已跟踪截图；跑完 `git checkout -- shots/round-10/`。「`data-safety-acceptance.mjs` 的 `.editor` 过期选择器」（STATE 第 41 轮优先项 ③）本轮**不在范围**，如果跑它失败先分辨脚本过期，不算回归。
- 截图统一 `shots/round-42/impl-*`，不要覆盖同目录 `bug-*`/`ship-*`/`t1-*`–`t4-*`/`r42-ui-*`。
- `npm test` 的条数以输出为准；`package.json:15` 只允许**末尾追加**新测试文件（第 41 轮踩过重排 glob 的坑）。
- 1 MB 性能脚本跑一次约 10–20 s（4k 段 case 载入 11 s），不要在同一个 profile 里同时开多个标签（`Memory.getDOMCounters` 是全渲染进程口径）。

## 七、时间预算（诚实口径）

| 任务 | 实现 | 自测/E2E | 小计 |
| :--- | ---: | ---: | ---: |
| T1 | 3 min | 2 min | 5 min |
| T2 | 6 min | 4 min | 10 min |
| T3 | 7 min | 3 min | 10 min |
| 收尾（CHANGELOG/README/impl.md） | — | — | 3 min |
| 门禁串跑（build/test/verify/roundtrip） | — | — | 4–5 min |
| **合计** | | | **32–33 min** |

在 35 min 硬线内。相对 revision 1：T1、T2 不变；T3 12 → 10 min（净 −2：死符号与验收 6 预砍 −2、`keyboard-acceptance` 只在 T2 跑一次 −2、`sl-parse-done` 物证并进 `-t3.mjs` 同一次运行 −0.5，但自测里 fidelity 19/19 必须单独跑，给回 2.5）；门禁 4–6→4–5 min（第 41 轮实测 4 min 上下）。review §四 另有更悲观的 45–55 min 估法；按本表执行并守住 §五 的两个耗时检查点：T2 结束 > 22 min 就先砍截图与长文中段断言，**别砍 T3 的验收 2b、单测与 roundtrip**。
