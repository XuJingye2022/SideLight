# 第 75 轮计划（revision 1；单轮 3 任务 = 用户反馈 3 条）

> r1 按 `plan-review.md` 修 P1-1~P1-4 与 P2-1/P2-2。不新增任务、不扩范围；B 轮不属本文件。
轮前 `e5dd887`；dev 5175 UP；CDP 9222–9224 无监听 → 浏览器项 UNVERIFIED，不重试。不 push、不改 `release/`、0.32.1；首屏 310,000/320,000 B。时间盒 9+6+3+6=**24 min**。建议 scribe 入池 B-157/158/159。

## A1 点公式编辑后取消，仍露 `$…$` 源码（P0）

**候选成因与判据**：
1. 输入规则把选区留在 atom 上。判据：`applyRule` 把 handler 的 `state.tr` 原样 dispatch。结论：**不成立**（探针 `from=4`、`revealed=[]`）。
2. 关闭就地编辑不回写选区。判据：`App.tsx:5250-5254`（空 latex）与 `:6276-6282`（Esc）只 `focus()`，选区仍在 atom 上 → `revealed=[0]`。结论：**成立**。
3. KaTeX 加载失败 → 显示原文。判据：未就绪只挂 `.math-pending`（`katexLazy.ts:46`），`$…$` 只由 `.sl-math-reveal::after` 画（`styles.css:2134`）。结论：**不成立**（旧版列此候选无据，删）。

文件：`mathInput.ts` 加 `mathInputSelection(doc, atomFrom, nodeSize=1)`（`:50-53` 改用）与 `closeMathEditTransaction(state, {from,to,remove})`（`remove` 先删再落 `from`，否则落 `min(from+nodeSize, content.size)`，均 `near` 夹住）；`App.tsx` 三条出口并成一个 `finishMathEdit(mode)`（两分支 + Esc）：先 `view.dispatch()` 再 `commands.focus()`（不改选区，已核）；新增 `src/lib/mathInput.test.ts` + `package.json` test 一行。

验收：
1. 单测 5：①`mathInputSelection` 在 `ab$x^2` 成 atom 后 `from===4`，过插件后 `revealed` 为 `[]`；②NodeSelection 在 atom（已露）→ `closeMathEditTransaction(remove:false)` → `revealed` 为 `[]` 且 `selection.empty`；③`remove:true` → 光标在删点 `from`、`nodeAt(from)` 非 inlineMath、`revealed` 为 `[]`；④块级 atom keep → 不与 [2,3) 相交；⑤文末 atom keep → 夹到 `content.size`、不抛。
2. 结构断言：`git grep -c 'setMathEdit(null)' -- src/App.tsx` = **1**，在 `finishMathEdit` 内、同函数含 `closeMathEditTransaction`；`git grep -nE 'closeMathEditTransaction|mathInputSelection' -- src` ≥ 4。
3. `npm test` 0 fail；`npm run verify` PASS（记首屏新值）。
4. 浏览器 UNVERIFIED（跑 `.tmp/e2e-r75-a1.mjs`）：点 `$\alpha$` 露 1 → Esc 露 0 且 `.katex` 可见；手打 `$x^2$` 同两项。BACKLOG 不判 fixed，只记「候选成因已修、用户症状 UNVERIFIED」。

风险：删空段时 `near(...,-1)` 可能落上一段尾——只断言「不与 atom 相交」。

## A2 `==高亮==` 默认开 + 旧存档一次性迁移（P1）

现状：`e5dd887` 已改 `settings.ts:57` 与 `:122`。病根：第 55–74 轮保存过设置的用户，档里是 `inlineSyntax:false` 且无版本标记（`saveSettings` 整对象写 `:129-131`，调用点 `App.tsx:1983/2002/4470`）→ 照旧读成关。
不属本轮：`SettingsDialog.tsx:119` 自述「只作用于下次打开或拖入的文档」——重解析当前文档属新功能，交 scribe 入池。

文件：`settings.ts`（`SETTINGS_VERSION=2`、`Settings.settingsVersion`、`DEFAULT_SETTINGS` 同字段、load 按 `settingsVersion===2 ? inlineSyntax!==false : true` 并回填版本、save 恒写版本）、`settings.test.ts` +5、7 处改「默认开」：`styles.css:848`、`inlineSyntax.ts:11`、`inlineSyntax.test.ts:47`、`settings.ts:29`、`tilde.ts:28`、`App.tsx:991`、`SettingsDialog.tsx:119`。

验收：
1. `settings.test.ts` +5：①无存档→true；②`{}`→true；③`{inlineSyntax:false}`（无版本）→**true**；④`{inlineSyntax:false,settingsVersion:2}`→**false**；⑤以④为输入 `saveSettings(loadSettings())` → 重读 JSON `settingsVersion===2` 且 `inlineSyntax===false`。
2. `git grep -nF '默认关' -- src`：改前 **8** → 改后 **1**，唯一命中 = `settings.ts:119`（smartPunctuation，不动）；对照 `git grep -c '默认开' -- src` ≥ 6。
3. `npm test` 0 fail；`npm run roundtrip` 与基线一致（rich 6/8、source 8/8）。
4. 文档 3 处 + CHANGELOG 一行**派 scribe**：`README.md:41`、`AGENTS.md:72`、`docs/typora-gap.md:43`；CHANGELOG 记「默认开 + 一次性迁移」。

风险：把**显式**关掉的用户一次翻回开，impl 与 CHANGELOG 写「一次性」。首屏 0 变化。UNVERIFIED：真机 `.sl-eq` 与保存字节。

## A3 块级公式排版（P1，3 min）

基线：`styles.css:2105` `margin:1.4em 0`、`:2111` `overflow-x:auto`、`:2116` `margin:0`、`:2120` `font-size:1.08em` 均已在。已排除「间距不足」：Typora `.md-math-block` 外边距 = 段落 1rem（`typora-ref/.../base.css` 2348）＜ 我们 1.4em；参考目录无 MathJax/KaTeX，字号无法量化。
改法（唯一改动）：`:2116-2118` 改 `margin: 0 auto; width: fit-content; min-width: 100%;`（超宽可滚回左端，不超宽仍居中）。
**定案保留 1.08em**（无浏览器）：impl 写死 17 px 正文上块级 18.36 / 行内 20.57 px，差 **2.21 px**；与「是否与行内同字号」一并交 scribe 记 P2，删「二选一」。

验收：
1. 新增 `mathStyle.test.ts` +2（照 `themes.test.ts`）：按 `[^{}]*\{[^{}]*\}` 切规则，只取选择器含 `[data-type='block-math']` 且不含 `sl-math-reveal` 的块（先断言块数 = **4**），再成对断言：根块 `margin: 1.4em 0`；`.block-math-inner` `overflow-x: auto`；`.katex-display` 三项齐全；`.katex` `font-size: 1.08em`（这两条属性全文 6/2 处，必须按块断言）。
2. `npm test` 0 fail。
3. 浏览器 UNVERIFIED（跑 `.tmp/e2e-r75-a3.mjs`）：长公式 `scrollWidth>clientWidth`、`scrollLeft` 可设且回 0 时首字形在框内、根块 margin 计算值 23.8 px。

风险：打印同 DOM，`overflow:auto` 会裁长公式（impl 记一行）。

## 门禁

`npm test`（41 文件 536 条 → **43 文件 548 条**：A1 5 + A2 5 + A3 2）、`npm run verify`、`npm run roundtrip`。报告写 `docs/iteration/round-75/`（impl ≤4 KB、test ≤5 KB），原始 JSON 只写 `.tmp/`。
