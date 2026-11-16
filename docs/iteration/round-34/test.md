# 第 34 轮验收（tester，独立复验）

- 基线：`main` @ `186dfeb` + 本轮工作树（**9 个跟踪文件改动**，无新增文件；`docs/iteration/round-34/` 与 `shots/round-34/` 未跟踪）。版本 **0.32.1** 未变，符合计划「不发版」。
- 环境：dev server `http://localhost:5175`（未重启，200）；CDP `9222`（`/json/version` 200）；每条 e2e 前 `node .tmp/reset.mjs 9222`。
- 复验方式：只读 `plan.md` 与 `git diff`，**未读 `impl.md`**（按角色要求，避免被实施说法带偏）。实现方的 `.tmp/e2e-r34-t1.log` / `.tmp/e2e-r34-t2.log` 只确认存在，**未当作证据**；本报告所有 6/6 结论来自我自己重跑的 `.tmp/tester-r34-t1-rerun.log` / `.tmp/tester-r34-t2-rerun.log`。

## 结论：PASS-WITH-UNVERIFIED

门禁全过（tsc / 22 文件 287 条 / build / 首屏 285,937 B / verify 正反例 / roundtrip）。T1 与 T2 的 e2e 由我重跑各 **6/6 PASS**，修复前日志与计划预期一致；T3 的 `npm run verify` 正例 exit 0、反例 exit 1。`keyboard-acceptance` **52/52**。没有一条门禁破、没有验收造假。

两处需要根代理/下一轮知道的东西，都不构成 FAIL：

1. **计划偏差（未申报的额外改动）**：`src/components/FileTree.tsx:107` 多了一行守卫（焦点在 `.ProseMirror` 内时不把焦点抢回树），计划「T2 改动文件：只有 `src/App.tsx`」被超出。它不破门禁、`keyboard-acceptance` 52/52、`tree-acceptance` 的失败项与焦点无关（见「回归」），但这一行是**计划外产品改动**，必须记进下一轮；`impl.md` 是否申报由根代理核对。
2. **既有脚本两条过期断言**：`tree-acceptance` **54/56**，两条失败经我用单独探针查证均为**产品行为已变、脚本没跟上**，不是本轮回归（证据见「回归」）。

## 门禁（全部实跑，本轮我自己跑的）

| 门禁 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | 无输出，**exit 0**（`.tmp/tester-r34-tsc.log` 0 行） |
| 测试 | `npm test` | **22 文件 287 条**（逐文件 `ℹ tests` 求和：files=22 total=287），`ℹ fail` 为 0 的行 22 个文件全 0，**exit 0**（`.tmp/tester-r34-npmtest.log`）。= 285 + 本轮新增 2 条 |
| 打包 | `npm run build` | **exit 0**；`index-O0GdPjrm.js` 896.22 kB / gzip 282.28 kB、`index-BLxN31Mr.css` 33.78 kB / 7.03 kB（`.tmp/tester-r34-build.log`） |
| 首屏 | `node scripts/measure-first-screen.mjs` | `total raw=930008 gzip=285937 headroom=63 files=2 max=286000` → **PASS**，**余 63 B**（`.tmp/tester-r34-measure.log`） |
| 首屏门（正例） | `npm run verify` | **exit 0**，末行同上 + `PASS`（`.tmp/tester-r34-verify.log`） |
| 首屏门（反例） | `node scripts/measure-first-screen.mjs --dir dist --max 285000` | **exit 1**，`headroom=-937`、`FAIL 首屏 gzip 285937 超过上限 285000`（`.tmp/tester-r34-measure-negative.log`） |
| roundtrip | `npm run roundtrip` | exit 0；rich **5/7**、source **7/7**、firstSaveBlocked 1/7——与第 32/33 轮基线**逐项一致**，`docs/roundtrip-report.md` 无改动（`.tmp/tester-r34-roundtrip.log`） |
| 快捷键回归 | `keyboard-acceptance.mjs http://localhost:5175` | **52/52 PASS**，exit 0（`.tmp/tester-r34-keyboard.log`） |
| 树回归 | `tree-acceptance.mjs http://localhost:5175` | **54/56**，2 条过期断言（详见「回归」，`.tmp/tester-r34-tree.log`） |

- 首屏归因：基线（finder 实测）**285,891 B** → 本轮 **285,937 B**，**+46 B**，落在计划 `M_A ≤ 285,991`（增量 ≤100 B）档内，硬门 286,000 未破，**余 63 B**。计划预估 T1 +25~35 B、T2 +50~100 B 再靠三处 `focusEditor` 合并回收；实测净 +46 B，量级一致。**余量只剩 63 B，下一轮必须先做「省字节」再做任何进主 chunk 的改动。**
- 反例那条证明门会咬：同一个 `dist` 把上限压到 285,000 就 exit 1，说明 `headroom` 字段与 FAIL 分支都真的在跑，不是只加了一行日志。
- `git status --porcelain`：只有 9 个 `M`（`AGENTS.md`、`README.md`、`package.json`、`scripts/measure-first-screen.mjs`、`src/App.tsx`、`src/components/FileTree.tsx`、`src/components/SaveDialog.tsx`、`src/lib/diff.test.ts`、`src/lib/risk.ts`）+ 2 个 `??` 目录。**`docs/CHANGELOG.md`、`docs/iteration/STATE.md`、`package-lock.json`、`.github/workflows/*`、`host/`、`host-mac/`、`release/` 全部零改动**，与计划硬约束 1/2/6 一致。

## T1 脚注定义丢失不再静默落盘（P0，数据安全）

静态复核（`git diff` + `read`）：

- `src/lib/risk.ts:366` 新增 `FOOTNOTE_DEFINITION = /^\[\^[^\]]+\]:/m`，`:375` 的早退改成 `if (baseline.length === 0 && !FOOTNOTE_DEFINITION.test(original)) return []`，`:378` 的 filter 只对 `footnote-loss` 放开基线要求——与计划给的代码块逐字一致，**只放过脚注一种**，`reference-links`/`table-separator`/`math-escape`/`html-ampersand`/`autolink`/`html-comment` 仍是原基线语义（`:378` 后半句）。
- 短路保留：无 `[^id]:` 定义行的文档仍走 O(1) 正则早退，自动保存（`src/App.tsx:3121` 的调用点、`:3184` 的 2000 ms 防抖）没有被拉进全文 `classify`。
- `:368-372` 的 JSDoc 已改成「基线决定载入时的横幅与其它分类；只有 footnote-loss 例外」，与新语义一致（P2-3 第一条）；`:360` 的 `baselineLosses` JSDoc 与 `:361-363` 的函数体都没动。
- `src/lib/diff.test.ts:96` 用例名已改成「基线为空时，非脚注类损失不拦」，`:97-99` 断言**一字未动**（P2-3 第二条）；`:248`、`:256` 新增两条，文本与计划逐字一致（`assert.equal(active.length, 1)` + `kind === 'footnote-loss'`；反例 `assert.deepEqual(..., [])`）。第二条是「定义还在文末只改正文必须放行」的**防过度拦**反例，不是原「正文改过就放行」那条替代品，方向正确。
- `src/components/SaveDialog.tsx:63` 删掉了「在载入时就存在」8 个字，与本轮「载入后才出现的脚注损失也会走这个框」一致（必改项，做了）。
- **未改 `src/App.tsx`** 的保存门与自动保存门（`:2845`、`:3121` 两处仍是同一个 `activeLosses(originalText, normalized, baselineLossesRef.current)` 调用），符合计划「一处修完两处受益」。
- `git diff` 里 T1 只含 `src/lib/risk.ts`、`src/lib/diff.test.ts`、`src/components/SaveDialog.tsx`。

行为实测（我的脚本重跑，日志 `.tmp/tester-r34-t1-rerun.log`）：**6/6 PASS**。

| # | 断言 | 修复前（`.tmp/e2e-r34-t1-before.log`，实现方留） | 我重跑（修复后） |
| :--- | :--- | :--- | :--- |
| a | 源码模式文末追加 + `Ctrl+S`，字节仍含 `[^1]: 定义文字。` | PASS（回归基准） | **PASS**（bytes 含定义行，toast「已保存 脚注.md」） |
| f | 自动保存路径也必须拦：打字后等 2600 ms，字节不变 + 状态栏「需手动保存」 | **FAIL**：`stillHasDef:false`，bytes 变成 `[^1](定义文字。)`、`status:"… / 已自动保存"` → 静默写盘实证 | **PASS**：bytes 仍含 `[^1]: 定义文字。`、`manualHint:true`、`status:"10 字 · 阅读约 1 分钟 / 需手动保存"` |
| b | 切回富文本、不改字、`Ctrl+S` 必须弹确认框（文案「保存后这些写法会被改写」+「脚注」+「定义在保存后会消失」+ 取消/仍然保存） | **FAIL**：`dialogSeen:false`，且 bytes 已被写坏 | **PASS**：dialog 文本与四个按钮全部命中（含「在源码模式看原文」，计划允许） |
| c | 点「取消」后：字节逐字节相同、`[role=dialog]` 归零、没有新的「已保存」 | **FAIL(SKIP)**：b 没弹框 | **PASS**：`sameBytes:true` / `noDialog:true` / `toastBefore=toastAfter="已保存 脚注.md"`。**`dirty` 未作断言**（日志里 `dirty:true`，按计划 P1-1 只打日志，执行方没为此改产品代码） |
| d | 反例：定义留在文末、只改正文 → 不弹框 | PASS | **PASS**（`dialogCount:0`、toast「已保存 正常篇.md」） |
| e | 反例：无脚注文档 → 不弹框 | PASS | **PASS**（`dialogCount:0`、toast「已保存 普通.md」） |

- 修复前 f 的原始字节（证据核心）：`"# 脚注篇\n\n引用[^1]。\n\n[^1]: 定义文字。\n\n末尾段。\n"` → `"# 脚注篇\n\n引用[^1](定义文字。)。\n\n末尾段。甲\n"`，全程 `dirty:false`、状态栏「已自动保存」。这就是 P0 的静默路径，**已确认被拦住**。
- 截图复核：`shots/round-34/t1-footnote-gate.png`（756×488）能看到标题「保存后这些写法会被改写」、说明「下面这些结构在保存后会丢掉或重排。取消不会写入任何字节。」、分组「脚注 [^1] 的定义在保存后会消失（正文还在引用它）」「影响 1 处」「[^1]: …」，按钮「在源码模式看原文 / 取消 / 仍然保存」。与计划要求一致。
- 过度拦风险：d/e 两条都过，正常文档不会被拖进确认框；`footnote-loss` 只在「原文有定义、正文仍引用、保存后定义消失」三条件同时成立时命中（`src/lib/risk.ts:161-174`），本轮没有放宽判据。

## T2 查找关框与快速打开焦点、同一篇不再弹切换框（P1，用户可见）

静态复核：

- `src/App.tsx:327` 模块级 `const focusEditor = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('.ProseMirror')?.focus())`，在组件外，不进任何 `useCallback` 依赖数组。
- `:3504` 的 `findOpen` Escape 分支现在 `setFindOpen(false)` 后 `focusEditor()`；`:4590` 查找条关闭按钮同样（`onClose` 里两行），两处都改了。
- `:2126` `requestLoad` 的 `dirty` 分支用 **句柄身份** `await file.handle.isSameEntry(activeFile.handle)`，`same` 时 `focusEditor()` 后直接 `return`；句柄缺失（`handle: null`）时 `same` 恒 `false`，保持旧弹框。依赖数组已加 `activeFile`（`:2137`）。执行位置在 `async` IIFE 内，`await` 落点正确。
- `:5087` 快速打开 `onSelect` 里 `setQuickOpen(false)` 后 `focusEditor()`；**没有**加进 `loadIntoEditor`/`requestLoad` 成功分支，文件树方向键行为未被抢焦点。
- 三处逐字重复的 `.ProseMirror` 聚焦（原 `:2437/:2447/:2461`）已合并成 `focusEditor()`（决策点 A 梯子第 2 级，先行完成）。
- **计划偏差**：`src/components/FileTree.tsx:107` 新增 `if (document.activeElement?.closest('.ProseMirror')) return // 第 34 轮：快速打开后焦点已交还正文，别抢`。计划写明「T2 改动文件：只有 `src/App.tsx`」，这一行是**额外改动**。我的判断：它是 T2-d 的补丁——快速打开后树面板的 `activePath` effect 里的 `requestAnimationFrame` 会把焦点抢回 `treeitem`，不挡的话 e 会红；计划给的兜底是「梯子第 3/4 级」删 `focusEditor()`，执行方换成了更小的挡板。它只在「焦点已在正文」时跳过树的聚焦恢复，文件树自身点击/方向键路径不受影响（`keyboard-acceptance` 52/52、`tree-acceptance` 的焦点/可访问性断言全过）。**仍未获计划授权，必须写进 STATE 下一轮做追溯确认。**
- 梯子第 1 级（删 `src/App.tsx:2471-2472` 两行逐字重复的 `show(\`已新建 ${name}\`)`）**没做**：实测 285,937 ≤ 286,000，梯子只在超线时触发，不做不算违规；下一轮省字节时可以顺手回收。

行为实测（我的脚本重跑，日志 `.tmp/tester-r34-t2-rerun.log`）：**6/6 PASS**。

| # | 断言 | 修复前（`.tmp/e2e-r34-t2-before.log`） | 我重跑（修复后） |
| :--- | :--- | :--- | :--- |
| a | `Ctrl+F` → `Esc` 后 `activeElement` 在 `.ProseMirror` 内 | **FAIL**：`active:"BODY."`、`inEditor:false` | **PASS**：`active:"DIV.tiptap ProseMirror editor ProseMirror-focused"` |
| b | `Esc` 后直接打字，字落进正文 | **FAIL**：`landed:false`、editor 仍是「甲\|甲的正文。」 | **PASS**：editor「甲\|甲的正文。KEY」，+3 字符 |
| c | 点查找条关闭按钮后焦点同样回正文 | **FAIL**：`active:"BODY."` | **PASS**：`inEditor:true`、`findOpen:false` |
| d | 脏状态下快速打开选「当前这一篇」→ 不弹切换框、不丢字 | **FAIL**：`dialogCount:1`，切到「甲.md」的「取消/不保存/保存并切换」三选一 | **PASS**：`dialogCount:0`、`name:"甲.md"`、editor 仍含「脏」、`dirty:true`（没走「不保存」重载） |
| f | 脏状态下换**另一篇** → 仍弹切换框，且焦点在框内 | PASS（回归护栏） | **PASS**：`dialogCount:1`、`activeInDialog:true`（`focusEditor` 没抢确认框焦点） |
| e | 干净状态下快速打开另一篇后直接打字 | **FAIL**：`switched:true` 但 `landed:false`，`activeBeforeType:"DIV.tree-file is-active"`（焦点留在树） | **PASS**：`activeBeforeType` 已是 `.ProseMirror`，editor「PALETTETYPED乙\|乙的正文。」 |

- 修复前 a/b 的原始输出就是「焦点掉到 `BODY`、字数不变」；修复后是「`DIV.ProseMirror`、字数 +3」。d 的 `## d-dirty-guard` 两条日志都显示 `active` 在 `.ProseMirror`、`dirty:true`，所以 d/f 测的是产品分支，不是脚本没点正文（计划 P2-1 的诊断规则按顺序核过）。
- 脚本按要求在 `addInitScript` 里 `localStorage.setItem('sidelight.settings.v1', JSON.stringify({ autoSave: false }))`，且放在 `installFakeWorkspace` 之前；d/f 按 Enter 前都读了 `dirty === true` 才继续，`dirty-guard` 日志留证。
- 截图复核：`shots/round-34/t2-find-esc-typing.png`（756×488）正文显示「甲 / 甲的正文。KEY」，标题「甲.md ●」有脏点，就是「Esc 后打字落在正文」的那一步。

## T3 首屏体积门进本地门禁 + 汇总行打印余量（P1，安装/体积）

- `package.json`：`"verify": "npm run build && node scripts/measure-first-screen.mjs"`，`build` 逐字未变（`tsc --noEmit && vite build`）。实测打印 `build=tsc --noEmit && vite build`、`verify=npm run build && node scripts/measure-first-screen.mjs`。
- `scripts/measure-first-screen.mjs:56` 汇总行加 `headroom=${max - totalGzip}`；`:64-67` 的 FAIL 分支与退出码**未改**，`:15` 的 `--max` 默认值仍是 `286000`（我读了全文 68 行确认）。
- 正例 `npm run verify` → exit 0、`total raw=930008 gzip=285937 headroom=63 files=2 max=286000` + `PASS`；反例 `--max 285000` → exit 1、`headroom=-937` + `FAIL 首屏 gzip 285937 超过上限 285000`。两条都是实跑原始输出，不是转述。
- `AGENTS.md:38` 加了 `npm run verify` 一行并写清「build 只保证能构建；首屏字节门在 verify 里，改过 src/ 就要跑」；`README.md:120` 命令段加了一行；`.github/workflows/*` **零改动**（`git status` 自查）。
- 产品字节 0 B：T3 改的是脚本与文档，首屏从 285,891 → 285,937 的 +46 B 全部归 T1+T2。

## 回归

- `keyboard-acceptance` **52/52 PASS**（第 33 轮基线 52，未退化）：Esc 回编辑、正文可编辑、保存失败 `role=alert`、live region 唯一、加速键没被抢走。跑完按 AGENTS §8 立刻 `git checkout -- shots/` 还原脚本写的历史截图，`git status` 已确认无 `shots/` 残留（含我探针覆盖的 `shots/round-16/t2-external-gone.png`）。
- `tree-acceptance` **54/56**，两条失败**都不是本轮回归**，逐条查证：
  1. **`外部删除后 Ctrl+S 不写原路径`**（`scripts/tree-acceptance.mjs:441`）：断言要求「Ctrl+S 后 `window.__fs.writes` 长度不变」。我把这一段单独抽成探针 `.tmp/r34-probe-extdel.mjs` 重跑，打印出真实写入：`{"writes":["未命名.md"],"exists":false}` —— **`a.md` 没有被复活，写的是新文件 `未命名.md`**。这正是 AGENTS §6 记录的既有能力（「有工作区且无句柄时 `Ctrl+S` 直接在根目录建 `未命名.md`」，更早轮次引入），脚本的「零写入」前提过期。断言意图（不写回被删路径）成立。
  2. **`大纲顶与页签底对齐`**（`:629`）：`outlineTop:133.5`、`tabsBottom:120`，差 13.5 > 8。同一条在 `.tmp/r21-tree.log` 是 `outlineTop:122`/`tabsBottom:120`（差 2，过），视口同为 1440×900（`openPage:208`），`tabsBottom` 完全没变，只有 `.outline` 的起始位置低了 11.5 px。`src/components/Outline.tsx` 最后一次改动是**第 29 轮**（`cdcf83e`，大纲可折叠），`src/styles.css` 最后改动是第 29/30 轮；本轮 diff 不碰 `Outline.tsx`/`styles.css`/布局。判定：第 29–30 轮的行高/工具条变化让这条像素断言过期，不是第 34 轮。
  - 两条都属于 AGENTS §8「测试脚本选择器/前提会过期」，按角色不判产品失败；**我没有改 `tree-acceptance.mjs`**（本轮不扩改动面），建议下一轮按上面两条修脚本：把「零写入」改成「不写 `a.md`」、把对齐断言的参照改成 `outline` 的 padding/父容器而不是绝对像素差。
- `roundtrip`：rich 5/7、source 7/7、firstSaveBlocked 1/7，与第 32/33 轮逐项一致；`docs/roundtrip-report.md` 内容无变化。

## 文档收尾：本轮我未做（计划归根代理）

按 `plan.md`「文件归属与执行顺序」与「轮次收尾（根代理做，不在上表内）」，`docs/CHANGELOG.md`、`docs/iteration/STATE.md`、`README.md` 的三处收口与 `git commit` 都由根代理做；T3 验收也写明「执行代理不改 `docs/CHANGELOG.md`」。所以我不写这四处、不 commit（不制造两个互相覆盖的收尾提交）。给根代理的**实测数字**：

- 首屏 **285,937 B**，上限 286,000，**余 63 B**；测试 **22 文件 287 条**；版本 0.32.1 不变。
- `docs/CHANGELOG.md:5` 标题还是 `## Unreleased（第 29–33 轮，未发版）`，要改成 `第 29–34 轮` 并加「**第 34 轮**」三行（脚注定义保存前拦一次 / 查找与快速开关注焦 + 同一篇不再弹切换框 / 首屏体积门加 `npm run verify`）。**不要写图片、链接打开。**
- `README.md:99` 的「285,891 B（−21.7%）（余 109 B）」要改成 285,937 / 余 63；`README.md:117` 的「22 个文件、285 条」要改成 287 条；「现在能做什么」加脚注拦截与三处焦点，`「现在不能做什么」`把这三处焦点记为已修。
- `AGENTS.md` §6 当前状态的体积/测试数字要改（仍是 285,891 / 22 文件 285 条）；§3 的「第 33 轮记 22 个文件、285 条」按本轮 287 条改注释；§8 可加一条「`FileTree` 的 activePath effect 会抢焦点，快速打开后要给守卫」（这是本轮新坑）。
- `docs/iteration/STATE.md:52` 仍是 **285,052 B / 余 948 B / 21 文件 276 条**（落后两轮，不止 finder 说的落后一轮）；`:130` 还是第 32 轮与 `e9d90a8`；轮次表要加第 33/34 行；「下一轮优先」把「工作区图片破图」提到第一并写「先配省字节任务（余 63 B）」。

## UNVERIFIED（本轮测不了，写清补测方法）

1. **真实磁盘上的 P0**：只在假 FSA（`.tmp/r30-fsa.mjs`）上验。补测：`npm run dev` 开一个真目录，按四步做一次，保存前后 `git diff` 那个 `.md`，确认现在弹框且「取消」不改字节。
2. **`activeLosses` 新语义对自动保存的性能**：本机没有 1 MB 带脚注定义样本，`classify`（含 `diffLines`）在有脚注的大文档里每 2 秒跑一次的开销未量。补测：造 1 MB、文末 3 条脚注定义的文档，改一个字，量自动保存周期的 `performance.now()`。
3. **真实中文输入法下 `Esc` 后打字**：e2e 是合成键盘，不产生组合事件。补测：真人微软拼音，`Ctrl+F` → `Esc` → 直接打中文。
4. **宿主（WebView2）/ macOS 里的三处焦点修复**：本轮只跑 localhost:5175 + CDP 9222。补测：`host-smoke` 加一步「`Ctrl+P` 选中后直接打字」。
5. **`npm run verify` 在真实 CI 的表现**：本轮不改 CI，只在本地验过；macOS/Windows runner 的 gzip 字节一致性未知。
6. **`FileTree.tsx:107` 那一行守卫是不是必需的**：我没有回退它做对照实验（会动产品代码 + HMR，风险大于收益）。所以「去掉守卫后 e 是否必红」未实测。补测/追认：下一轮在临时分支删掉这一行，只跑 `.tmp/e2e-r34-t2-focus.mjs` 的 e，红了就把它补进计划并写 ADR/注释依据。
7. **两条 `tree-acceptance` 过期断言的修复**：本轮只判定「不是回归」，没改脚本。补测见「回归」段末尾的修法。
8. **真人点击文件树上「当前这一篇」是否也走 T2-c 的短路**：`openWorkspaceFile` → `requestLoad` 同一条路径，但只测了快速打开路径（计划 UNVERIFIED 7 同项）。

## 复验命令（下轮可直接抄）

```powershell
npx tsc --noEmit; npm test; npm run build; node scripts/measure-first-screen.mjs
npm run verify; node scripts/measure-first-screen.mjs --dir dist --max 285000   # 反例 exit 1
node .tmp/reset.mjs 9222; node .tmp/e2e-r34-t1-footnote.mjs 9222     # 6/6
node .tmp/reset.mjs 9222; node .tmp/e2e-r34-t2-focus.mjs 9222        # 6/6
$env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/keyboard-acceptance.mjs http://localhost:5175   # 52/52；跑完 git checkout -- shots/
node .tmp/reset.mjs 9222; node .tmp/r34-probe-extdel.mjs http://localhost:5175   # 单条过期断言探针
git checkout -- shots/   # 树脚本写 shots/round-16 的截图
```

## 证据文件

- 脚本：`.tmp/e2e-r34-t1-footnote.mjs`、`.tmp/e2e-r34-t2-focus.mjs`（实现方）；`.tmp/r34-make-probe.mjs`、`.tmp/r34-probe-extdel.mjs`（我建的单条探针）。
- 日志：`.tmp/tester-r34-tsc.log`、`.tmp/tester-r34-npmtest.log`、`.tmp/tester-r34-build.log`、`.tmp/tester-r34-measure.log`、`.tmp/tester-r34-verify.log`、`.tmp/tester-r34-measure-negative.log`、`.tmp/tester-r34-roundtrip.log`、`.tmp/tester-r34-t1-rerun.log`、`.tmp/tester-r34-t2-rerun.log`、`.tmp/tester-r34-keyboard.log`、`.tmp/tester-r34-tree.log`、`.tmp/r34-probe-extdel.log`；修复前对照 `.tmp/e2e-r34-t1-before.log`、`.tmp/e2e-r34-t2-before.log`。
- 截图：`shots/round-34/t1-footnote-gate.png`、`shots/round-34/t2-find-esc-typing.png`（都是本轮实现方拍的，我复核了内容；`shots/` 下其余历史文件已还原，`git status` 无残留）。
