# 第 75 轮计划审查 v2（critic，r1 复审）

审 `plan.md`（0:26，revision 1）。轮前 `e5dd887` = HEAD；工作树只有 `BACKLOG.md` 与 `round-75/`。无新依赖、不碰 `release/`、0.32.1 不变。9222–9226 无监听 → 浏览器项记 UNVERIFIED，不重试。**结论 REVISE**：1 条新 P1（A1 修法在文档以块级公式结尾时不生效）+ 3 条 P2。

## 上一版漏洞复核（5 条全修）
- P1-1 ✓ 题改「点公式编辑后取消」；三条候选各带判据（我复核 `katexLazy.ts:45-46` 只挂 `.math-pending`、`styles.css:2134-2144` 的 `$…$` 只由 `::after` 画）；补 state 级测试②③；验收 4 记 UNVERIFIED、BACKLOG 不判 fixed。
- P1-2 ✓ 改法写「`remove` 先删再落 `from`」，测试 ③ 覆盖。我复跑：删后 `near(from)` → TextSelection `from=2`、`revealed=[]`（`.tmp/t75-critic-near.ts`）。
- P1-3 ✓ 定案 1.08em、删「二选一」、按切片断言。实测同正则：含 `[data-type='block-math']` 且不含 `sl-math-reveal` 的块 **= 4**；`overflow-x:auto` 6 处、`font-size:1.08em` 2 处，均与计划一致。
- P1-4 ✓ 9+6+3+6=24 ≤ 25。
- P2-1 ✓ 3 处文档 + CHANGELOG 派 scribe（除历史 `STATE.md:145`、`CHANGELOG.md:264` 外正好这 3 处）；测试⑤输入带 `settingsVersion:2`；`settings.ts:119` 不动。

## 新 P1
### P1-1 A1 的 keep 分支在「文档以块级公式结尾」时不生效
`TextSelection.near($pos, 1)` 是 `Selection.near`：向前找不到文本位置会**回退到后退**，退到最后一个子节点是 atom 时返回 `NodeSelection`。实测 `.tmp/t75-critic-near.ts`：doc = 段落「前」+ blockMath（from=3，content.size=4）→ keep 落 `NodeSelection[3,4]`、`revealed:[0]`，`$$…$$` 照旧露出；对照「行内公式在段中」→ TextSelection、`revealed:[]`。文末的 `$$x$$`（`mathInput.ts:56-68` 整段替换）即命中。
验收 1 ⑤ 只断言「夹到 content.size、不抛」，不断言 `revealed` → 会假绿。
**修**：
1. keep 分支先试 `TextSelection.near($pos, -1)`（实测 docEnd → TextSelection `from=2`、`revealed=[]`），再试 forward；或 apply 后读 `revealed`，非空就改后退。
2. 验收 ⑤ 改成「文末块级公式 keep → `revealed===[]` 且落点不是 NodeSelection」；再加一条「整篇只有一条块级公式」（实测 keep 仍 `revealed:[0]`），并写明这一情形的处置。
3. 风险节补一句：`Selection.near` 会回退到 atom 上，不能只靠它。

## 新 P2
### P2-1 A2 的「7 处改默认开」是词替换，会写出自相矛盾的注释
`App.tsx:991`「默认关，设置里开」→「默认开，设置里开」；`inlineSyntax.ts:11`、`tilde.ts:28` 同病；`inlineSyntax.test.ts:47` 标题「关时四例…（默认关）」→「…（默认开）」自相矛盾；`SettingsDialog.tsx:119`「默认关：关着这些符号按字面保存」语义反转。
**修**：按整句改写（默认开 + 设置里可关；测试标题写「显式关时…」），验收 2 的 8→1 保留，补一句「7 处按语义改写，不是替换词」。

### P2-2 A3 的「三项齐全」不可执行；`mathStyle.test.ts` 没登记进 npm test
「`.katex-display` 三项齐全」没写哪三项、什么值（改法里是 `margin: 0 auto` / `width: fit-content` / `min-width: 100%`）。`npm test` 是显式文件清单（`package.json:15`，现 41 条）：A1 写了「+ package.json test 一行」，A3 没写 → 新文件不跑，`npm test 0 fail` 假绿、门禁停在 42 文件。
**修**：验收 1 写成三条成对断言（属性 = 值）；A3 文件段补「`package.json` test 加 `mathStyle.test.ts`」。

### P2-3 A2 迁移条件 `settingsVersion === 2` 应写 `>= 2`
未来若因别的原因把版本推到 3，`=== 2` 会把显式关掉的用户再翻一次回开。
**修**：`parsed.settingsVersion >= 2 ? parsed.inlineSyntax !== false : true`；测试 ④ 再加 `{inlineSyntax:false, settingsVersion:3}` → false。

改完 P1-1 与 P2-2（A1 修法、A3 登记）即可 PASS，其余两条可同批带上。
