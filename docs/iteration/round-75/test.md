# 第 75 轮验收（tester；未读 `impl.md` 结论）

判定 **PASS-WITH-UNVERIFIED**。A1/A2/A3 按验收从零复验通过；浏览器项因 CDP 不可用记 UNVERIFIED，未反复重试。

## 门禁（工作树 = `e5dd887` + 未提交改动）
- `npm run verify` **PASS**：首屏 gzip **303,381 B**（内部 310,000 / 硬线 320,000，余 6,619 / 16,619）。
- `npm test` **43 文件 548 条 0 fail**（轮前 41/536；A1 5 + A2 5 + A3 2 = 12）。日志 `.tmp/r75-tester-npm-test.log`。
- `npm run roundtrip`：rich **6/8**、source **8/8**，与基线一致（`04`/`06` 既有差）。日志 `.tmp/r75-tester-roundtrip.log`。

## A1 点公式编辑后取消仍露源码 — PASS（浏览器项 UNVERIFIED）
- 独立探针 `.tmp/r75-tester-a1.ts`（自搭 ProseMirror state + 真 `mathReveal` 插件，不复用 impl 测试）→ `.tmp/r75-tester-a1.log` `A1-PROBE-PASS`：
  - 旧行为复现：atom 建好把选区留在 atom 上（NodeSelection）→ `revealed=[0]`，证明「只 focus 不改选区」就是病根；
  - `mathInputSelection` → 文本光标 `from=4`、`revealed=[]`；
  - 块级 keep：`revealed=[]`、落点与 `[2,3)` 不相交；文末 keep 传越界 `to=99` 不抛、落点在 `content.size` 内、非 NodeSelection；
  - 取消新建：atom 数 0、光标在删点 `from=3`、`nodeAt(from)` 是 `text`、`revealed=[]`。
- 单测 `mathInput.test.ts` 5 条全绿（5 条与验收 ①–⑤ 逐条对应）。
- 结构：`git grep -c 'setMathEdit(null)' -- src/App.tsx` = **1**（`finishMathEdit` 5244–5268 内，同函数 5257 调 `closeMathEditTransaction`）；`git grep -nE 'closeMathEditTransaction|mathInputSelection' -- src` = **7**（≥4）；Esc/Enter/空内容三条出口全走 `finishMathEdit`（`MathInlineEditor` 仅回调，无旁路关闭）。
- 已知退化（计划风险内）：整篇只有一条块级公式时 keep 找不到文本位置，仍露 `$$…$$`（单测 ⑤ 已写明，不另插空段）。

## A2 `==高亮==` 默认开 + 旧档迁移 — PASS（真机渲染/字节 UNVERIFIED）
- 独立探针 `.tmp/r75-tester-a2.ts` → `A2-PROBE-PASS`：无存档/`{}`/旧 `{inlineSyntax:false}`（无版本）全读成 **true**；`{inlineSyntax:false,settingsVersion:2}` → **false**；`{…,settingsVersion:3}` 也 false（推版本不回弹）；`saveSettings(loadSettings())` 后重读 JSON = `settingsVersion:2`、`inlineSyntax:false`，且 `theme/autoSave/fontSize` 原值不丢。
- 单测 `settings.test.ts` +5 全绿；对照 `inlineSyntax.test.ts` 的显式关场景 4 例字节不变。
- 结构：`git grep -nF '默认关' -- src` 改前（`e5dd887`）**8** → 改后 **1**，唯一命中 `src/lib/settings.ts:130` = smartPunctuation 的旧注释（计划写 `:119` 是插入代码前的位置，语义一致）；`git grep -c '默认开' -- src` = **7 文件 13 处**（≥6）。

## A3 块级公式排版 — PASS（浏览器几何 UNVERIFIED）
- `src/styles.css:2119-2123`：`.katex-display` 三项 `margin:0 auto` / `width:fit-content` / `min-width:100%`；根块 `margin:1.4em 0`（2105）、`.block-math-inner` `overflow-x:auto`（2111）、`.katex` `font-size:1.08em`（2126）均未动；`git diff` 该文件只有这一块 + 1 条注释改动。
- `mathStyle.test.ts` 2 条绿：规则块数 **4**（先断言）、四块成对属性；`overflow-x: auto` 全文 6 处、`font-size: 1.08em` 2 处，按块断言避开假绿。

## 回归与发现池
- `npm test` 全量（含公式、行内语法、序列化、mathReveal 等 43 文件）与 `roundtrip` 无回归。浏览器回归脚本（keyboard/tree/theme/draft）因 CDP 不可用未跑。
- BACKLOG：补记 **B-157**（P0，`open`：候选成因已修、用户症状 UNVERIFIED）、**B-158**/**B-159**（P1，`fixed`，真机渲染/几何 UNVERIFIED）。

## UNVERIFIED（原因）
- CDP 9222–9226 一次性探测全部无监听，沙箱禁止另起 Chromium，未重试。
- A1 浏览器项（点 `$\alpha$` 露 1 → Esc 露 0 且 `.katex` 可见；手打 `$x^2$` 同两项）：`.tmp/e2e-r75-a1.mjs` **未交付**（不存在），无法复跑。
- A3 浏览器项（长公式 `scrollWidth>clientWidth`、`scrollLeft` 可设、根块 margin 计算值、17 px 正文下 18.36 px 字号）：`.tmp/e2e-r75-a3.mjs` **未交付**，UNVERIFIED。
- A2 真机 `.sl-eq` 渲染与保存字节；三任务在 WebView2 宿主内均未验。
