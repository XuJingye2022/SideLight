# 第 50 轮计划审查（critic，**revision 3 复审**）

- 审查对象：`docs/iteration/round-50/plan.md` **revision 3**（T1 脚注续行 + 导出差异门 / T2 全部替换按文本节点批处理 / T3 5 条 CSS 与点击区）
- 轮前 `startSha=6ae9be39ee5007da2ebcdffd636da21675dc6694`（§末尾复跑 `git rev-parse HEAD` 同值）；`git status --porcelain` 仍只有未跟踪的 `docs/iteration/round-50/`、`shots/round-50/`，**产品代码 0 改动**
- 只读手段：`read` 逐文件核对 + 两个只读探针 + 一次 CDP 量测
  - `.tmp/critic-r50-r3-overlap.mjs`（真实 `prosemirror-model` / `prosemirror-state`，复刻 `App.tsx:1859-1872` 的旧路径 vs 计划里的 `applyReplacements`）
  - `.tmp/critic-r50-r3-toolbar.mjs`（CDP 9222 **新开一页**，量工具栏与「插入」下拉，再注入计划里的 CSS 重量；只关自己那一页，**未跑 reset.mjs、未动别人的页面、未重启 dev server**）
  - 两条 `git grep` 实跑（`applyReplacements(` / `matches.length`）
- **未改产品代码、未改 `release/`、未 push**。新增的两个探针在 `.tmp/`（不进版本控制）
- 上一版（critic r2 复审，REVISE：1×P1 + 4×P2）全文保留在 `docs/iteration/round-50/plan-review-r2.md`；首审在 `plan-review-r1.md`
- 结论：**REVISE（2×P2，无 P0/P1）**。上一版 5 条**全部真的改掉了**（R50-7 / R50-8 我用真实 JSON 与真实命令复验，R50-9 / R50-10 / R50-11 实读核对）。本轮 2 条都是**修订没覆盖到、且验收与截图都盖不住**的：T3 的 CSS 规则作用域过宽（实测会把「插入」下拉 9 项从 30 px 压到 24 px、文字由左对齐变居中）、T2 会静默改掉重叠命中的替换结果（实测旧/新不同）。**方案骨架、文件、行号、API 本轮全部复核为真，不需要重写。**

## 0. 上一版 5 条的处置核对（逐条，都实际打开文件/实跑）

| 编号 | 修订落点 | 我的核对（本轮实测） | 结论 |
| :--- | :--- | :--- | :--- |
| **R50-7** 100 KB 门槛算错 | `plan.md:4`、`:221`、`:226`、`:333`、`:347` | 门槛已是 **≤400 ms**（`:333`），「两档固定成本相同、不能按命中数线性折算」写进了 `:226` 与 `:333`；1 MB 的 `≤2,000 ms`（`:332`）、2,000–4,000 ms 条件项（`:335`）、「不许改数字」（`:336`）**原样未动**；`:221` 的 100 KB `clickReturnMs` 已是 **789.8**、`dispatch` 769.1、1 MB 52,197.5 / 51,802（实读 `.tmp/perf-round48-replace.json:14-18,65-69` 逐字一致）。我自己重算了一遍 k：51,032.9 ms ÷(39,936²−4,096²=1.5781e9)=**32.34 ns/对** → 100 KB 修后 =769.1−32.34 ns×12.58e6≈**362 ms**，与计划的 340–360 ms 一致，400 ms 有 ≈10% 余量。两档样本确为 1,024 段（`.tmp/e2e-r48-code-replaceall.mjs:44-47` 逐字） | **已修** |
| **R50-8** `applyReplacements` 可能成死代码 | `plan.md:268`、`:274`、`:303`、`:337` | `:268` 明写「分组路径必须调用这个函数（`nextText = applyReplacements(node.textContent, local, replacement)`），不许另写一份下标算术」；`:274` 同一句；`:303` 参考骨架现在**真的调用**它（`const nextText = applyReplacements(group.node.textContent, group.local, replacement)`）；`:337` 加了静态接线验收。**实跑**：`git grep -n 'applyReplacements(' src/App.tsx` → **0 命中 / exit 1**（改前基线成立）；命令形式自检 `git grep -n 'matches.length' src/App.tsx` → **12 命中 / exit 0**（与计划自报的 12 一致）；`tsconfig.json:1-17` 实读只有 `strict`、**无 `noUnusedLocals`** | **已修** |
| **R50-9** U6 的横向断言是空断言 | `plan.md:397`、`:409` | `:409` 已把 `rect.x` 降级为「只打印、不作门槛」并写明理由（两元素 rect.x 改前都是 397，2 px 是 `styles.css:285` 的 `padding: 0 2px` 造成的**文字**起点差）；横向门槛改成 `getComputedStyle('.editor-placeholder').paddingLeft === '0px'`；`:397` 的测量清单补了 `paddingLeft` 与 `Range` 文字起点。实读 `styles.css:280-289`：`position: absolute`、`left/right: 0`、`padding: 0 2px` → 该断言确实只由本轮改动决定 | **已修** |
| **R50-10** T1 预算没上调 | `plan.md:24`、`:461-472` | §7 T1 **12 min**（`:461`）；合计写成 **34 核心 + 3 余量 = 37 名义**（`:465`）；35 min 硬上限靠「T3 整项可砍」守，并给出 28 min 检查点与 U9→U2→U7 的砍单顺序（`:467-472`）。`.tmp/iteration/roles/planner.md:25` 实读是「总工作量按一个执行代理 35 分钟内能完成来排」→ 承诺面 34 min（12+16+6）**在 35 内**，T3 是显式余量切片，口径成立 | **已修** |
| **R50-11** 条件项取 plugin key 会静默 0 命中 | `plan.md:8`、`:335`、`:481` | 取法已改成 `state.plugins.find((x) => x.spec.key?.key?.startsWith('sidelightFind'))` 并**先断言 `p` 非空**（拿不到记 UNVERIFIED、**不许**写「装饰不是瓶颈」）。依据实读：`node_modules/prosemirror-state/dist/index.js:966`（`this.key = spec.key ? spec.key.key : createKey("plugin")`）、`:974-979`（`createKey` 返回 `name + "$"`）、`:990`（`PluginKey` 构造函数）；`src/lib/decorations.ts:10` 确是 `new PluginKey('sidelightFind')` → 实际值 `sidelightFind$`，字面相等必 0 命中。计划的三处行号**逐字对**；`DecorationSet.empty` 取法也仍然可用（`Plugin.spec` 在 `:959` 赋值） | **已修** |
| 小瑕疵①「三个既有调用点」 | `plan.md:161` | 已改成「**两个**」；`grep -n 'lossLabels(' src` 实测 = `App.tsx:69`（import）+ `:1102`、`:2109` 两处调用 + `risk.ts:385` 定义 → 说法正确 | **已修** |
| 小瑕疵②「空定义与今天一致」 | `plan.md:121` | 已改成「**完全空的 `[^1]:`（后面没有任何续行）**整条不出 `<li>`」，并写明「定义 + 续行」今天输出 `''`、新实现输出 `<li>续行</li>` 是行为变化 | **已修** |

## 1. 本轮新发现（按严重度）

### R50-12（**P2**）U9 的 `.toolbar button` 是通用选择器：会把「插入」下拉的 9 个菜单项一起改（实测），而验收与截图都盖不到

- `App.tsx:4740` 的 `<div className="menu">` 在 `.toolbar`（`:4723` 起）**里面**（探针用 `.toolbar .menu button` 取到 9 个），内含 9 个 `<button>`（表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接）。`plan.md:387` 给 `.toolbar button`（`styles.css:1315-1319`）补的是 `height: 24px; display: inline-flex; align-items: center; justify-content: center;`，选择器会命中这 9 个菜单项。
- 层叠核对：`.toolbar button`（`styles.css:1315`）与 `.menu button`（`:1355`，只设 `text-align: left; padding: 6px 9px`）特异性相同（0,1,1），`.menu button` 在源码更后 → 只赢它自己声明过的两个属性；**`height` / `display` / `align-items` / `justify-content` 全部来自新规则**。`button` 基础规则（`:129-139`）也没有设这四项。
- **实测**（`.tmp/critic-r50-r3-toolbar.mjs`，CDP 9222 新开一页，注入计划里的那一条规则 + `mono` 12 px，前后同一页对比）：
  ```
  插入菜单项（9 个，取前 3 个）  改前 h=30  display=block  justify=normal  textAlign=left
                                改后 h=24  display=flex   justify=center  textAlign=left（被 flex 覆盖）
  工具栏按钮                   改前 插入 25 / H1·B·I·S·专注·打字机·源码·预览 24 / </> 21（font 11px）
                                改后 全部 24 / </> font 12px
  console.error + pageerror：0 条
  ```
  → U9 想修的 11 个工具栏按钮**确实修对了**（21/24/25 → 全 24，`</>` 11→12 px）；副作用是「插入」下拉每项 30→24 px（9 项合计矮 54 px），标签由左对齐变**居中**。
- **为什么本轮验收测不到**：T3 §验收只量 `.toolbar button` 的 rect 高（菜单关着时 DOM 里只有 11 个触发器）与 `.toolbar` 的 `scrollWidth`；截图清单里的 `impl-t3-toolbar.png` 是「工具栏 2× 放大取样」，不含展开的下拉。§风险也只写「`插入 ▾` 的文字可能被上下裁 1 px」（`:419`），没提菜单项。
- **修法**：① 规则收紧成 **`.toolbar-group > button`**（实测 11 个触发器都是 `.toolbar-group` 的直接子节点；菜单项在 `div.menu` 内，不会被选中），或保留通用规则并补一条 `.toolbar .menu button { height: auto; display: block; justify-content: initial; align-items: initial; }`；② T3 §步骤 1 加一条「点开『插入』下拉，量 `.toolbar .menu button` 的高度与 `justifyContent`/`display`」，§验收写「改前 30 px / block / 左对齐，改后同值（±0.5 px）」，并加一张**开着菜单**的截图（可并进 `impl-t3-toolbar.png`）。

### R50-13（**P2**）重叠命中的替换结果会被静默改掉：`findAll` 明确允许重叠，`applyReplacements` 的契约却要求「调用方保证互不重叠」

- `src/lib/find.ts:23` 注释：「**可重叠**：每次命中后从下一个字符继续找，'aaa' 里查 'aa' 得到两处」，`:50` 就是 `cursor = start + 1`；`App.tsx:1818` 的 `matches` 直接来自 `findAll`。而 `plan.md:255` 给 `applyReplacements` 的契约写「ranges 必须按 `from` 升序、**互不重叠（调用方保证）**」，`:260` 的防御是 `if (range.from < cursor) continue`——**调用方（分组路径）保证不了这件事**，于是重叠区间的第二处会被直接跳过，而分组路径的 `covered` 仍把它算作已覆盖（实测 `covered === matches.length`），`covered !== matches.length` 的退回守卫不会触发。
- **实测**（`.tmp/critic-r50-r3-overlap.mjs`，用真实 prosemirror 复刻旧路径，与新函数同输入对比）：
  ```
  '哈哈哈'   查 '哈哈' 换 '呵'  旧 呵      / 新 呵哈    （matchCount 2，covered 2）
  'aaaa'     查 'aa'   换 'Q'   旧 Q       / 新 QQ      （matchCount 3，covered 3）
  '侧灯只补光，侧灯不写' 查 '侧灯' 换 '灯'  旧 灯只补光，灯不写 / 新 同值   ← 本轮 100 KB / 1 MB 种子形状，不受影响
  不变量 docChars === docChars0 − matchCount：旧 true、新 false（重叠输入上）
  ```
- 后果：中文里 `哈哈` / `谢谢` / `再见再见` 这类重叠命中很常见，「全部替换」的结果会与今天不同；而 T2 §风险 6 条、§验收里的断言都没提这件事，`CHANGELOG` 只准备写「更快」。另外 `plan.md:312` 的验收不变量 `docChars === docChars0 − matchCount` 在重叠输入上**不成立**，写成通用断言会误导后续轮次。
- **修法（二选一，写进计划）**：
  - ① **保留今天的语义**：分组前先判相邻命中是否重叠（`matches[i].from < matches[i-1].to` 即重叠），命中就整单退回旧的逐条路径（与跨文本节点退回放同一处，`cross.md` 那条断言已经覆盖退回路径的正确性），并把返回值/注释写清；
  - ② **接受新语义**：在 `applyReplacements` 的注释与 plan 里明写「重叠区间按先到先得跳过」，加 **1 条单测**（`'aaaa'` 查 `'aa'` 换 `'Q'` → `'QQ'`）+ `CHANGELOG` 记一条行为变化，并把 `plan.md:312` 的不变量改成「非重叠输入下」。
  - 无论选哪条，都把 `plan.md:255` 的契约注释改成实际成立的条件（「按 `from` 升序；重叠区间按先到先得跳过」或「调用方先过滤重叠」）。

## 2. 本轮复核为真的部分（执行者不用再查）

| 项 | 核对结果 |
| :--- | :--- |
| T2 骨架可执行 | `plan.md:281-307`：`doc.descendants` 升序、`matchIndex` 单向前移（`while … to <= nodeFrom`）、`nodes×matches` 是 O(N+M) 不是 O(N×M)；反序应用 `i = groups.length - 1` 保证位置仍按原文档坐标；`PMNode` 是 `App.tsx:7` 已有 import；`Transaction.replaceWith` 存在于 `prosemirror-transform` 的类型里 |
| 跨节点退回守卫 | `find.ts:46` 用 `candidate.includes('\n')` 排除跨块命中 → 命中只会跨**文本节点**（mark 边界），`covered !== matches.length` 守卫与 `cross.md` 负例均成立 |
| `findAll` 坐标与顺序 | `find.ts:5-6` 明写 `from/to` 是文档位置；`:41-47` 由 `index.positions` 反查、`from` 递增 |
| T3 工具栏现状 | 实测 11 个 `.toolbar-group > button`：`插入 ▾` 25 px、H1/H2/B/I/S/专注/打字机/源码/预览 24 px、`</>` **21 px 且 font 11 px**，与 `findings-ui.md` 的 U9 读数逐项一致；`</>` 就是 `.mono` 按钮（`App.tsx:4862-4864`，`className={\`mono…\`}`）→ `styles.css:1335-1338` 的 11→12 px 改法对 |
| T3 其它行号 | `styles.css:100` 全局 `box-sizing: border-box`（`height:24px` 的 rect 就是 24）；`:572-578` `.doc-body`（`font-size: var(--editor-size, 17px)`、`line-height: 1.95`）；`:584-590` h1 1.35；`:592-596` h2、`:598-602` h3（均无 line-height）；**`h4` 全文 0 命中**（grep 复核）；`:1589` `.stats-trigger`；`StatusBar.tsx:41-51` 已有 `aria-haspopup/expanded/controls`、无 `aria-label` |
| T1 导出分支 | `App.tsx:4096-4101` markdown 分支就是直接 `saveBlob`；`:2924` 注释「四条保存路径的唯一入口」；`:2947` `activeLosses(originalText, normalized, baselineLossesRef.current)`；`Notice.action`（`:218`）与 `persist`（`:222`）都在；`lossLabels` 只有 2 处调用（`:1102`、`:2109`），加可选参数不影响 |
| T1 文案替换覆盖 | 实读 `risk.ts` 的标签：`:168`「在保存后」、`:201`/`:214`「在保存后」、`:339`「保存时」→ `forExport` 的两个 `replace` 覆盖全部 4 条，不会漏出「保存后」 |
| T1 单测兼容 | `export.test.ts:74-79` 是两条单行定义 + `<标签>` 转义、`:81-83` 是 `renderFootnotes('')`；新实现对这两个输入输出逐字相同（单行定义 → `<li>第一条</li>`；空串 → `''`） |
| T1 渲染层输入形状 | `footnotes.ts:1`（`DEF` 锚定行首）、`:3`（`CONT` 4 空格或 tab）、`:45-52`（块内空行拼回）、`:70`（原文切片）→ 传给 `renderFootnotes` 的串只含定义 / 引用定义 / 空行 / 4 空格或 tab 续行；新实现「非缩进行结束当前条」不会误伤，2 空格缩进的定义本来就不会出现在这里 |
| E2E 依赖的脚本 | `.tmp/reset.mjs`、`.tmp/r30-fsa.mjs`、`.tmp/e2e-r50-bug-h.mjs`、`.tmp/e2e-r50-bug-g.mjs`、`.tmp/e2e-r50-bug-c.mjs`、`.tmp/e2e-r36-fix-ann.mjs` **全部存在**；`.tmp/e2e-r48-code-replaceall.mjs:10`（`SHOTS='shots/round-48'`）、`:44-47`（两档均 1,024 段）、`:70`（包装 `dispatch` 记 `{ms, steps}`）、`:116`（写 `perf-round48-replace.json`）与计划引用逐字一致 |
| 基线与文档 | `STATE.md:55` 首屏 **294,373 B** / 测试 **32 文件 425 条**；`STATE.md:66` 第 ① 项就是「全部替换 1 MB 冻结 51.8 s」；`CHANGELOG.md:5` 仍是 `## Unreleased（第 29–49 轮，未发版）`；`.tmp/iteration/roles/planner.md:28` 已是 310,000 / 320,000 |
| 硬约束 | 三任务不加运行时依赖、不动 `package.json` 的 `version`（只 T2 的 `test` 行）；首屏 294,373 + 预计 ≤800 B < 310,000；不碰 `release/`、不重启 dev server；`.tmp/perf-round48-replace.json` 的 4 个关键数字（789.8 / 769.1 / 52,197.5 / 51,802）与 docChars 983,046 / 95,238 全部复读一致 |

## 3. 小瑕疵（不算漏洞，顺手改）

- `plan.md:24` 的算术表述：「估时 **31 min**（T1 12 + T2 16 + T3 3）……加 6 min 门禁与 `impl.md` = **34 min 核心 / 37 min 名义**」——31+6=37（名义），34 是 12+16+6（核心），两个数都对但句子读起来像 31+6=34。建议写成「核心 12+16+6=34，名义 34+3=37」。
- `plan.md:333` 的「改前 `dispatch` 769.1 ms，降 **≥48.0%**」与「`ms` ≤ 400 ms」严格差 0.01 个百分点（769.1×0.52=399.93 ms），不影响判定；写成「≈48%」更稳。

## 4. 结论

**REVISE（2×P2，无 P0/P1）**。revision 3 把上一版 5 条**真修掉了**：R50-7 的 400 ms 与固定成本说明、`:221` 的 789.8 我用真实 JSON 复核并重算了一遍 k（32.34 ns/对 → 修后 ≈362 ms，400 ms 有余量）；R50-8 的接线既有计划文字、骨架代码，也有 `applyReplacements(` 0 命中 / `matches.length` 12 命中的真实命令对照；R50-9 / R50-10 / R50-11 的 `paddingLeft` 门槛、34 min 预算与 `sidelightFind$` 取法全部实读核对为真。

剩下两条都是十几分钟能落的改动，且**都不需要重写方案**：

1. **R50-12（P2）** 把 T3 的 CSS 规则从 `.toolbar button` 收紧到 `.toolbar-group > button`（或补 `.toolbar .menu button` 复位），并在 T3 §步骤/§验收里加一条「打开『插入』下拉」的量测与截图——不改就是「插入」下拉 9 项从 30 px 变 24 px、文字变居中（本报告已实测），而现在的验收与 `impl-t3-toolbar.png` 都看不到它。
2. **R50-13（P2）** 给重叠命中的替换语义定稿（退回旧路径，或接受新语义并写注释 + 1 条单测 + CHANGELOG），并把 `plan.md:255` 那句「互不重叠（调用方保证）」改成实际成立的条件。

这两条落进计划后即可开跑；T1/T2/T3 的任务结构、文件清单、行号与 API 本轮全部复核为真。
