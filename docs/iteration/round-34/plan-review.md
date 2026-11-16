# 第 34 轮计划审查（critic，只读）

- 结论：**REVISE**。上一版 2 条 P1 **都真的修掉了**（逐条复核见第一节）；但本轮新增 **1 条 P1 + 3 条 P2**。阻塞点是 **T2-d 的 `focusEditor()` 会被 `FileTree` 自己的 activePath 聚焦 effect 抢回**——我用只读探针复刻了 T2-d 的时序实测（`.tmp/critic-r34-erace3.log`），焦点在 Enter 后 6.4 ms 进了正文，23.2 ms 又被文件树抢走。按计划原样实现，报告第 3 条缺陷（快速打开后打字丢键）**不会修好**，而 e 断言仍会 FAIL。
- 输入：`round-34/plan.md`（revision 3）、`plan-review.md`（上一版）、`findings-{bug,typora,ship}.md`、`src/App.tsx`、`src/lib/{risk,settings,footnotes,workspace}.ts`、`src/lib/diff.test.ts`、`src/components/{SaveDialog,QuickOpen,FindBar,FileTree,useDialogFocus}.tsx/.ts`、`package.json`、`scripts/measure-first-screen.mjs`、`.tmp/{reset,r30-fsa,e2e-r34-bug-probe5,e2e-r34-bug-probe7,e2e-r34-bug-probe8,critic-r34-dirty}.mjs`、`README.md`、`AGENTS.md`。
- 审查方式：逐个打开计划点到的文件/行号；**另写 3 个只读探针**（不改产品代码、只改浏览器里的 DOM 焦点与埋点），跑前都先 `node .tmp/reset.mjs 9222`。跑完 `HEAD` 仍是 `186dfeb`，`git status --porcelain` 只有 `docs/iteration/round-34/`、`shots/round-34/` 两个未跟踪目录；探针文件全在 `.tmp/critic-r34-*.mjs`。
- 本文件**取代**上一版 `plan-review.md`。

---

## 一、上一版 2 条 P1：是否真的修掉（结论：都修掉）

| 上一版漏洞 | 本版落点 | 我的核对 | 结论 |
| :--- | :--- | :--- | :--- |
| **P1-1** T1 断言 c 的 `dirty === true` 不可达，修复后稳定假 FAIL | `plan.md:128`（c 只断言字节/对话框归零/无新「已保存」，`dirty` 只打日志）、`:142`（必过项改写为「c 的三条子断言 + d + f」）、`:21`、`:327` | 全文已无「c … `dirty === true`」的断言；`:128` 把机制逐行写清并写明「不许为此改产品代码」。我实测复核了机制：`App.tsx:2528`（`baselineRef.current = normalized`）、`:2552`（`setDirty(false)`）、`:3742`（`setDirty(sourceText… !== baselineRef.current)`）、`:2853`（`cancelConfirm` 只清 `pendingConfirm`）四处行号与语义全部属实；`.tmp/critic-r34-dirty.log` 存在（2,482 B） | **修掉** |
| **P1-2** 预算 34 分钟但 rev2 只加不减 | `plan.md:22`、`:33-37`（15+12+5=32，留 3 分钟）、`:124`（删 `M_0` 构建，直接取 finder 实测）、`:325`（明写 T2 早报构建已删）、`:253`/`:326`/`:333`（`keyboard-acceptance` 移到根代理收尾）、`:327`（砍单顺序把「c 字节子断言」与「f」并列） | 全文搜 `M_0`/`早报`/`keyboard-acceptance`/`npm run verify`：执行者路径上只剩 4 次 e2e 整跑（T1/T2 各修复前+修复后）+ T3 一次 `npm run verify` = 一次 `tsc+vite build`；`findings-ship.md:26` 确有 `total raw=929933 gzip=285891 files=2 max=286000`，`M_0` 的替代值成立；`git log -1`/`git status --porcelain` 与 finder 那棵树一致（我复跑确认：工作树只有两个未跟踪目录）。可数开销从 7–8 次降到 4–5 次，与 `:37` 的说法一致 | **修掉**（但见 P2-2：T2-d 的修法一变，32 分钟又不够了） |

另：上一版的 P2-1（T2 修复前预期与诊断顺序）、P2-2（`isSameEntry`）、P2-3（`risk.ts` JSDoc 与 `diff.test.ts:96` 用例名）三处我也逐条对过，`plan.md:23-25`、`:229-239`、`:191-204`、`:95`、`:117` 都已改到，且 `src/lib/diff.test.ts:96-100` 现在的确叫「基线为空时永不拦：正常编辑不弹框」、断言 `:97-99` 用的是 `[tiptap]`（不含 `[^`）——改名不改断言是安全的（见第三节第 1 条的手算）。

---

## 二、本轮漏洞

### P1-1 T2-d 的 `focusEditor()` 会被 `FileTree` 抢回去：报告第 3 条缺陷不会修好，e 断言仍会 FAIL

**位置**：`plan.md:206-217`（T2-d 的 `onSelect` 只在 `setQuickOpen(false)` 后调 `focusEditor()`）、`:236`（e 的断言）、`:142`/`:238`（验收要 6/6）。

**证据（我实跑，不是推演）**：`.tmp/critic-r34-erace3.mjs` → `.tmp/critic-r34-erace3.log`。探针只做一件事：在 `Enter` 的同一个任务里 `requestAnimationFrame(() => .ProseMirror.focus())`（与计划 T2-d 的时序逐字一致），其余全是产品代码。

```
## timeline {"contentAt":18.2,"timeline":[
  {"what":"focusin","t":6.3,"el":"DIV.tiptap ProseMirror editor Pr"},
  {"what":"raf-focus","t":6.4},
  {"what":"focusin","t":23.2,"el":"DIV.tree-file is-active","path":"示例文集/乙.md"}],
  "active":"DIV.tree-file is-active","docName":"乙.md"}
```

机制（逐行）：
1. `focusEditor` 的 rAF 在 Enter 后 **6.4 ms** 把焦点送进 `.ProseMirror`（✅ 与计划预期一致）。
2. `openWorkspaceFile`（`App.tsx:2172-2186`）先 `await readNode(file)`，再 `requestLoad` → `loadIntoEditor`；`loadIntoEditor` 在 `App.tsx:2012` 调 `setActiveFile(file)`，实测**正文内容在 Enter 后 18.2 ms 才换过来**。
3. `setActiveFile` 改了 `activePath` → `FileTree.tsx:104-115` 的 `useEffect([activePath])` 在 rAF 里 `row?.focus()`；实测 **23.2 ms** 焦点落到 `DIV.tree-file is-active`（路径 `示例文集/乙.md`）。它的闸门 `wasFocusedRef` 是**单向闩**：`:301`、`:349`、`:445` 把它置 `true`，全文件没有一处置 `false`——只要用户在文件树上点过任何一次（e2e 打开 `甲.md` 就是点树，probe8 也是这么做的），这个 effect 就永久生效。
4. 所以最终焦点是**文件树**，不是正文。计划 T2-d 写的那一行被晚 17 ms 的树 effect 覆盖。

**后果**：报告第 3 条（`findings-bug.md` 的快速打开后打字丢键）在「先点过文件树」的路径上**没修**；e 在修复后仍 `landed:false`；而 `:248` 的诊断顺序只覆盖 d/f，执行者遇到 e 红没有规则可依，最可能的动作是把 T2-d 整个删掉（=梯子第 4 级）或去改 `App.tsx` 里无关的地方。硬约束 1 准备写的 CHANGELOG「快速开关注焦」也就成了没验过的说法。

**修法**：
1. T2-d 必须多加一处产品改动（**文件清单与 `git diff --stat` 验收要跟着改**）：`src/components/FileTree.tsx:104-115` 的 effect 里，在 `wasFocusedRef` 判断之后加一条「焦点已经在正文里就不要抢」——
   ```ts
   if (!wasFocusedRef.current) return
   if (document.activeElement?.closest('.ProseMirror')) return   // 第 34 轮：快速打开后焦点已交还正文
   ```
   逐条对过不破坏既有行为：树里点/键盘 Enter 时 `activeElement` 是树行 → 不跳过；改名/刷新后要重新聚焦树行的场景焦点在菜单或树上 → 不跳过；只有「焦点已经是正文」这一种新情况跳过，正是 T2-d 要的。
2. e 的断言改成「先确认文档真的换过来，再打字」：`await page.waitForFunction(() => window.__slState?.name === '乙.md')` + `await page.waitForTimeout(250)`，然后 `keyboard.type('PALETTETYPED')`。这个等待**不自证**（等的是文档名，不是焦点），修复前焦点在树上、等待 250 ms 后打字照样丢键 → 仍记 FAIL。理由见 P2-1。
3. f 不受影响：切到另一篇时 `requestLoad` 走 `pendingSwitch`，**不改 `activePath`**，树没有机会抢焦点；`useDialogFocus` 又把焦点送进 `.dialog`（`useDialogFocus.ts:27`），f 的「`activeElement` 在 `.dialog` 内」仍成立，保留原样。
4. 若根代理不想为此扩 T2 的范围：按 `:54` 梯子第 4 级**明确把 T2-d 挪到下一轮**，同时把硬约束 1 的 CHANGELOG 措辞降级成「查找关框与同一篇不弹框」，并在 README/STATE 收尾时**不许**写「快速开关注焦已修」。

### P2-1 T2-e 的「Enter 后**立刻**打字」与异步加载抢跑：即使焦点修好，前 1–2 个字符也会被刷掉

**位置**：`plan.md:230`（「e 的写法固定为：快速打开 `Enter` → **立刻** `keyboard.type('PALETTETYPED')`」）、`:236`。

**证据**：`.tmp/critic-r34-erace2.mjs`（复刻焦点，再立刻打字，跑 3 次）：

| 次 | rAF 聚焦 | 第一个键（相对 Enter） | 正文换文（相对 Enter） | 换文前已发出的键 | 结果 |
| :--- | ---: | ---: | ---: | :--- | :--- |
| 1 | 10.0 ms | 12.6 ms | 34.8 ms | `["P"]` | `landed:false` |
| 2 | 6.0 ms | 8.8 ms | 32.0 ms | `["P"]` | `landed:false` |
| 3 | 5.8 ms | 8.4 ms | 30.0 ms | `["P"]` | `landed:false` |

换文在 30–35 ms、打字从 8–13 ms 开始：**前面的字符打在旧文档上，被 `setMarkdown` 一起刷掉**。所以只修焦点、不改 e 的写法，e 依然不会 100% 通过——这是一个必然的时序，不是偶发。另一组对照（`.tmp/critic-r34-erace.log`，4 次）显示 rAF 只比第一个键早 1.8–2.6 ms，余量极薄：机器一忙（例如同轮还有 vite build 残留进程），rAF 晚一个 16.7 ms 帧就直接把首键让出去。

**修法**：同 P1-1 修法第 2 条（等 `__slState.name === '乙.md'` + 250 ms 固定等待），并把 `:230` 的「立刻」改成「等文档名切换后再打字；**不点正文、不按 activeElement 等待**（否则断言自证）」。验收里补一句：e 的失败先看 `active` 与 `editor` 文本，`active` 是树而文档名已是 `乙.md` → 产品回归（P1-1）；`active` 是树且文档名还是 `甲.md` → 脚本等得不够。

### P2-2 T2-d 一改，预算 32 分钟与「T2 只碰 `App.tsx`」两条硬规则同时失效

**位置**：`plan.md:34`（T2 12 min）、`:37`（合计 32）、`:321`（T2 只含 `App.tsx`）、`:250`（`git diff --stat` 里 T2 只含 `src/App.tsx`）、`:254`（T2 体积 +50~100 B）。

**证据（可数）**：按 P1-1 的修法，T2 多出：`FileTree.tsx` 一处改动（+`tsc` 一次）、e 多两次等待（≈1.5 s，可忽略）、**以及极可能多一次复跑**（第一次 6/6 里 e 红了要先分辨产品/脚本）。改写后的 T2 现实区间是 **15–16 分钟**，全轮 35–36 分钟，踩到 35 分钟上限；字节上也多 +20~40 B，`M_A` 的余量从 109 B 里再吃掉一段（T1 +25~35、T2 +70~140 → 可能 >109）。

**修法**：二选一，写进计划，不要两头都要：
1. **改范围**：T2 只做 a/b/c（查找关框、同一篇不弹框），T2-d 整条挪到下一轮（梯子第 4 级提前执行）；T2 回到 10 分钟、`git diff` 只含 `App.tsx`、CHANGELOG 措辞按 P1-1 修法第 4 条降级。
2. **改预算与归属**：T2 写 15 分钟、T2 文件加 `src/components/FileTree.tsx`、`:250` 的 `git diff --stat` 与 `:254` 的体积预估同步改；同时把 T3 的 `README.md`/`AGENTS.md` 两行挪到根代理收尾（`verify` 脚本与正反例输出仍由执行者交），腾出 2 分钟。

### P2-3 T1 的 b/d/f 只写「必须出现」，没写判定方式：复制 probe5 会带进固定 `waitForTimeout`，修复后 b 容易假 FAIL

**位置**：`plan.md:127`（b：`Ctrl+S` 后「必须出现 `[role="dialog"]`」）、`:130`（d：「不弹框」）、`:129`（f：「`.status-bar` 出现『需手动保存』」）。

**证据**：`probe5.mjs:48/58/70` 全是固定 `waitForTimeout(1700/1800)`，`probe5.mjs:63-68` 是 `evaluate` 里一次性 `find`；计划说「从 probe5 整份复制再改断言」，执行者若原样保留固定等待，b 在慢机上会读到 `dialogCount:0` → 假 FAIL，然后是诊断与复跑，正好吃掉 32 分钟里没留的那 3 分钟。

**修法**：在 `:127` 写成可执行口径：`await page.waitForSelector('[role="dialog"]', { timeout: 3000 })` 判 b；d/e 判「窗口内没有对话框」用 `await page.waitForTimeout(600)` 后 `locator('[role="dialog"]').count() === 0`（`SaveDialog` 走 `setPendingConfirm`，正常在一帧内出现）；f 用 `await page.waitForFunction(() => document.querySelector('.status-bar')?.textContent?.includes('需手动保存'), { timeout: 4000 })`，不要用固定 600 ms 读一次。这三个断言都是**同一份 P0 证据**（不静默 / 不误报 / 自动保存也拦），不该被等待方式干扰。

---

## 三、复核过但**不算**漏洞（留给执行者，别再花时间怀疑）

1. **P0 修法本身成立，两条新单测的期望值我用真实 `classify` 跑过**（`.tmp/critic-r34-unit.mjs`）：
   - 新测 1：`classify` = `[{footnote-loss, blocking:true}, {blank-lines, blocking:false}]` → 新 `activeLosses` 只留 `footnote-loss` → `length===1` ✅。
   - 新测 2：`classify` = `[]` → `activeLosses` = `[]` ✅（锁的正是「别把脚注损失放宽成一律拦」）。
   - 旧测 `diff.test.ts:96-100`：原文是 `[tiptap]:`，不匹配 `/^\[\^[^\]]+\]:/m` → 短路照旧 `[]`，断言不动仍绿 ✅。`:140-148`（`\\` 硬换行）原文无脚注定义，新语义不碰它 ✅。
2. **b 会弹框**：`requestSave`（`App.tsx:2811-2841`）对 `file` 目标没有 `!dirty` 前置判断（只有 `goal === 'host'` 那一支才有 `:2818`），`Ctrl+S` 走 `:3243-3249` → `requestSave('file')`；`saveWarned` 在 `loadIntoEditor:1985` 重置，a 步的源码保存不经过 `confirmSave`（`:2847` 是唯一置 true 的地方）→ b 必弹。`SaveDialog.tsx:61` 的 h2 是「保存后这些写法会被改写」、`:93-98` 是「取消 / 仍然保存」，与 b 的断言逐字对得上。
3. **c 的三条子断言与 toast 取法成立**：a 的保存提示是 `persist:true`（`App.tsx:2565-2569`），所以 `toastBefore === toastAfter` 这一支会先命中，不会被 a 的旧提示误判；`cancelConfirm`（`:2853`）不写盘、不动 dirty；`readFakeFile` 的字节不会被中间自动保存改掉（b 期间 `dirty=false` 且 `pendingConfirm!==null`，自动保存两道闸都在 `:3099`/`:3102` 早退）。
4. **f 会 PASS（修复后）**：自动保存门 `App.tsx:3091-3114` 先看 `settings.autoSave`（`settings.ts:42` 默认 true）、`:3102` 看 `dirtyRef`（打字后为 true）、`:3105` 看 `activeFile?.handle`（从树打开有句柄），命中损失时 **只 `setAutoSaveState('manual')` 并 return，不写盘**；`finishSaved:2564` 之后没有别处把 `autoSaveState` 置回 `idle`，状态栏 `:4880-4881` 正是「需手动保存」。`composeUntilRef`（`:3094`）只由真实组合事件触发，合成键盘不触发。
5. **SaveDialog 文案必改、且是负字节**：`SaveDialog.tsx:63` 现在写「在载入时就存在」，本轮之后对「载入后才出现的脚注损失」不成立；改后删掉 8 个字，且 `SaveDialog` 是主 chunk（`App.tsx:29` 直接 import，不在 `:23-33` 的 lazy 名单）——体积账方向对。
6. **T3 的两条命令与 `headroom` 安全**：`package.json:12` 的 `build` 确为 `tsc --noEmit && vite build`（不含 measure）；`measure-first-screen.mjs:56` 汇总行、`:64-67` FAIL 分支、`max` 变量都在作用域内，`headroom=${max - totalGzip}` 与 `:56` 现有字段风格一致；全仓库没有脚本解析这行（上一版已 grep，我复核 `:2`/`:56`/`CHANGELOG`/两个 workflow 引用）。反例 `--max 285000` 在当前 285,891 下必然 FAIL 且 `headroom` 为负 ✅。README 的「## 跑起来」（`:112-121`）确实有 `npm run build` 行，补 `verify` 落点存在 ✅；T3 验收里的 `node -e "require('./package.json').scripts"` 我实跑过（退出码 0，打印 `build` 与 `verify`）✅。
7. **T2-c 的句柄身份判断可行**：`activeFile` 是 `WorkspaceFileNode | null`（`App.tsx:334`），`WorkspaceFileNode.handle` 可空（`workspace.ts:6`、`:219`）；`requestLoad` 的体在 async IIFE 里（`:2113`），`await isSameEntry` 可放；假 FSA 有 `isSameEntry`（`r30-fsa.mjs:69-71`、`:137`）；单文件模式 `path = picked.name`（`App.tsx:2161-2166`）说明按 `path` 比较确实会吞掉同名文件，改句柄身份对。快速打开的文件列表来自 `flattenFiles`（`App.tsx:5066`），与树里是同一个句柄。
8. **T2-a/b 的落点**：`:3490-3493` 只有 `setFindOpen(false)`（`:3486-3488` 的 rail 分支确实显式还焦点，漏一处说得通）；`:4575` 的 `onClose` 只 `setFindOpen(false)`；`QuickOpen` 不用 `useDialogFocus`（`QuickOpen.tsx` 无该 import），所以 T2-d 的 rAF 与确认框 inert 不冲突（f 的护栏仍成立）。
9. **T2-c 分支不误伤干净状态**：计划明确只在 `dirty` 分支短路，干净状态点同一篇仍从磁盘重读（那是唯一的回滚入口）——`loadIntoEditor` 的调用链没被动。
10. **文件树抢焦点是既有代码，不是本轮要修的回归**：`FileTree.tsx:104-115` + 单向闩 `:301/:349/:445` 在本轮之前就存在，我的探针只是把它的时序量出来；修它要改的正是 P1-1 那一处。

---

## 四、测不了（本轮审查限制）

1. **没在「已修复」的产品代码上跑 e2e**：critic 只读，改 `risk.ts`/`App.tsx` 会污染执行者的工作树。T1 修好后 b/f 的行为是「逐行推演 + 真实 `classify` 手算 + 上一版修复前实测」的组合结论，6/6 仍由执行者实测。
2. **P1-1 的探针是在未修复代码上注入焦点**：我复刻的是 T2-d 的**时序**（Enter 同任务 rAF 聚焦），不是它最终的代码；结论依赖「`focusEditor` 在 `onSelect` 里同步调用、`loadIntoEditor` 在 18–35 ms 后完成」两条，都已实测。若执行者实现时把 `focusEditor` 改成 `setTimeout(…, 100)` 之类，P1-1 会变成「碰巧能过」——不建议靠延时，理由见修法。
3. **未跑 `keyboard-acceptance`**：它要 reset 9222 并覆盖 `shots/round-05/`，按计划留给根代理收尾跑。
4. **真实磁盘 / 宿主（WebView2）/ 中文输入法**：不在本轮环境，与计划的 UNVERIFIED 同一条。
5. **未跑构建/measure**：本轮审查不需要 `M_A`，也不写 `dist/`；gzip 余量结论沿用 `findings-ship.md:22-28` 的实测。
