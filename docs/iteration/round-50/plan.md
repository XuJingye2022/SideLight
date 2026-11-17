# 第 50 轮计划（planner → planner-revision，只读）— **revision 3（第 3 次修订）**

> **revision 3（第 3 次修订，planner-revision，只读；2026-11-18）** —— 按 `docs/iteration/round-50/plan-review.md`（critic 复审，结论 **REVISE**：**1×P1 + 4×P2**，编号 R50-7…R50-11）逐条修掉。**任务结构不变**：仍是 T1/T2/T3，不新增任务、不扩大范围、不改产品方向；只改门槛与断言、补两处接线、调预算与取插件 key 的写法。上一版（revision 2）的 R50-1…R50-6 已由 critic 实读/实跑复验为「真的改掉」，本修订不重复、不回改。
> - **R50-7（P1，100 KB 门槛算错）** → T2 §验收的 100 KB 门槛 `≤ 205 ms` 改回 **`≤ 400 ms`**（复审给的 r1 原建议）：205 ms 是「2,000 ms ÷ 39,936 × 4,096」按命中数线性折算出来的，但**修后两档的固定成本相同**——两档样本都是 1,024 段（`.tmp/e2e-r48-code-replaceall.mjs:44-47` 的 `['100kb',1024,98]` / `['1mb',1024,1000]`），分组后步数都 ≈1,024，`view.dispatch` 都要重建/同步这 1,024 段，差别只剩「装饰数 × 步数」那一项。按本轮基线反推（`.tmp/perf-round48-replace.json`：100 KB 769.1 ms / 4,096 步、1 MB 51,802 ms / 39,936 步 → k ≈ 32.3 ns/(装饰×步)）：100 KB 改前非映射 ≈227 ms、修后映射 ≈135 ms → 合计 **≈340–360 ms**；最宽容模型（769 ms 全按步数线性）也只 192 ms、仅 6% 余量 —— 205 ms 几乎必然假红，而 `:314` 又禁止改数字，P1 会卡在「门槛错」上收不了口。400 ms 对同一条推算有余量，且仍要求改前 769.1 ms 降 **≥48.0%**。1 MB 的 `≤2,000 ms`、`:313` 的 2,000–4,000 ms 条件项、「不许改数字」的纪律**原样不动**。另把 `:212` 的 100 KB `clickReturnMs` 从 **769.8 改成 789.8**（实读 JSON：`clickReturnMs: 789.8`，`dispatch[0].ms: 769.1` 是另一列）。
> - **R50-8（P2，`applyReplacements` 可能成死代码）** → `:255` 的 3 条单测后补「分组路径必须调用它，不许另写一份下标算术」；`:261` 补 `nextText = applyReplacements(group.node.textContent, group.local, replacement)`（`local` 是节点内相对坐标），参考骨架也补上「先算 `nextText`、再 `delete`/`replaceWith`」的应用循环；T2 §验收加**静态接线**：`git grep -n 'applyReplacements(' src/App.tsx` 非 0 命中；改前跑同一命令应 **0 命中**，并用同形式的 `git grep -n 'matches.length' src/App.tsx`（现测 12 命中、exit 0）作**命令形式自检**，防止 PowerShell 引号把模式吃掉后被误判成「改动没落地」。**本修订实跑**：`git grep -n 'applyReplacements(' src/App.tsx` → **0 命中、exit 1**（改前基线成立）。（`tsconfig.json` 无 `noUnusedLocals`，`npm run build` 不会替你发现死代码。）
> - **R50-9（P2，U6 的横向断言是空断言）** → T3 §验收把 `rect.x` 差 ≤0.5 px 换成 **`getComputedStyle('.editor-placeholder').paddingLeft === '0px'`**（门槛）；`rect.x` 降级为「只打印、不作门槛」并写明理由（`findings-ui.md:108-109` 两元素 rect.x 改前就都是 397、rect.y 都是 136，2 px 是 `padding: 0 2px`（`src/styles.css:285`）造成的**文字**起点差）；`rect.y`、`fontFamily`、`fontSize`、行盒高三条保留；T3 §步骤 1 的测量清单补 `paddingLeft` 与两处文字起点 x（`Range`，旁证）。
> - **R50-10（P2，T1 预算没随修订上调）** → §7 的 T1 **10 → 12 min**；总预算改成 **「34 min 核心 + 3 min 余量切片」**：`T1 12 + T2 16 + 门禁 6 = 34`，T3（3 min）整项列为**可砍**——**只有 T1+T2 合计 ≤25 min 跑完才做 T3**（25 + 3 + 6 = 34），按名义估算 T1+T2 就是 28 min，所以**默认预期 T3 顺延**到 §5、不算未完成；到 28 min 核心没绿就立刻停手走门禁。原表 T1 10 + T2 16 + T3 3 + 门禁 6 = 35 是零余量，T1 上调后只能让 T3 让位（`roles/planner.md:25` 的 35 min 是硬上限）。
> - **R50-11（P2，清装饰对照取 key 会静默 0 命中）** → `:313` 与 `:4` 的取法改成 `const p = state.plugins.find((x) => x.spec.key?.key?.startsWith('sidelightFind'))` 并**先断言 `p` 非空**（拿不到就记 UNVERIFIED，**不许**写「装饰不是瓶颈」）：`PluginKey.key` 由 `createKey(name)` 生成、带 `$` 后缀（实读 `node_modules/prosemirror-state/dist/index.js:966` 的 `this.key = spec.key ? spec.key.key : …`、`:974-979` 的 `createKey`、`:990` 的构造函数），`src/lib/decorations.ts:10` 的 `new PluginKey('sidelightFind')` 实际值是 **`sidelightFind$`**，字面相等会 0 命中、`setMeta(undefined, …)` 静默无效，两次读数一样就会错写成「装饰不是瓶颈」。`DecorationSet.empty` 仍用 `Object.getPrototypeOf(decoSet).constructor.empty`。
> - **顺手（复审「小瑕疵」+ 一条行为口径）** → `:152` 的「三个既有调用点」改成「**两个**」（`grep -n 'lossLabels(' src` 实测：`App.tsx:1102`、`:2109` 两处调用 + `risk.ts:385` 的定义）；`:112` 的「空定义的条目……整条不出 `<li>`（与今天一致）」改成「**完全空的 `[^1]:`（没有任何续行）不出 `<li>`**」——`[^1]:` + 缩进续行今天输出 `''`、新实现输出 `<li>续行</li>`，是更正确的口径，别再写成「与今天一致」（复审 §0.1 实测）。
> - 修订范围：**只改本文件**。未改产品代码、未连 CDP、未跑 E2E、未起/重启 dev server、未碰 `release/`、未 commit。核对手段：`read` 实读 `plan-review.md`、`plan-review-r1.md:30`（400 ms 的 r1 原建议）、`findings-ui.md:92-146`、`.tmp/perf-round48-replace.json`、`.tmp/e2e-r48-code-replaceall.mjs:1-60`、`src/lib/decorations.ts:1-30`、`src/styles.css:272-301`、`src/App.tsx:5128-5152`、`src/components/StatusBar.tsx:35-56`、`tsconfig.json`、`package.json:15`、`node_modules/prosemirror-state/dist/index.js:955-999`、`.tmp/iteration/roles/planner.md:25`；`grep` 核对 `lossLabels(` 调用点（2 处）与 `noUnusedLocals`（无）；`git grep` 实跑两条：`applyReplacements(` → **0 命中 / exit 1**（改前基线），`matches.length` → **12 命中 / exit 0**（命令形式自检）；`git status --porcelain` 仍只有未跟踪的 `docs/iteration/round-50/`、`shots/round-50/`，**产品代码 0 改动**（`git rev-parse HEAD` = 6ae9be3）。**行号口径**：revision 2 / revision 3 两个修订块里写的 `plan.md:NNN` 是各自写那时的行号；revision 3 在文件顶部插了 9 行，所以定位请用小节标题或关键字 grep，不要按旧行号硬找。
>
> **revision 2（第 2 次修订，planner-revision，只读；2026-11-18）** —— 按 `docs/iteration/round-50/plan-review.md`（critic 首审，结论 **REVISE**：**1×P1 + 5×P2**）逐条修掉。**任务结构不变**：仍是 T1/T2/T3，不新增任务、不扩大范围、不改产品方向；只改验收门槛与判据、T1 的脚注渲染口径与导出提示、T2 的 E2E 脚本步骤与预算、T3 的条目，以及文档计数口径（逐条对照见本修订块，R50-1…R50-6）。
> - **R50-1（P1，性能门槛被放宽 + 机制写错）** → T2 §验收的门槛从 `clickReturnMs ≤ 8,000 ms` 改回 **`dispatch` 中 `steps > 0` 那一条的 `ms` ≤ 2,000 ms**（`findings-code.md:105` 原口径）；100 KB 档改成同一指标、同一「每命中 0.050 ms」预算的 **≤ 205 ms**（**revision 3 的 R50-7 已把它改成 `≤ 400 ms`**：两档修后的固定成本相同、不能按命中数线性折算，理由见顶部 R50-7 条与 T2 §验收）；`clickReturnMs` / `longtasks` 只并列打印作旁证（不作门槛）。T2 §为什么删掉「DOM 同步做了 39 遍」，换成两条真实成本：① 39,936 个步骤逐个把 `ReplaceStep` 落到 doc；② `src/lib/decorations.ts:15-21` 把 39,936 个查找高亮逐个映射过同一事务的全部 39,936 步。另加条件项：**若实测落在 2,000–4,000 ms，不许改数字**，按 T2 §验收的「若 1 MB 那条落在 2,000–4,000 ms」一条写清卡点，并补一次「清掉查找装饰」的对照读数（`Plugin` 的 `apply` 在构造时已绑定，改 `spec.state.apply` 无效——`node_modules/prosemirror-state/dist/index.js:732` 的 `FieldDesc`；要用 `state.plugins.find((x) => x.spec.key?.key?.startsWith('sidelightFind'))` 找到插件、先断言非空，再用 `DecorationSet.empty` 清——**`PluginKey.key` 带 `$` 后缀，字面相等会 0 命中**，见 revision 3 的 R50-11 与 T2 §验收 `:313` 那条）。
> - **R50-2（P2，F1 没修完）** → T1 §步骤 1 的循环改成「块内空行不结束当前条」（空行 `continue`），补齐 `footnotes.ts:47-51` 允许的「定义 + 空行 + 缩进续行」形状；§步骤 2 的用例 +3 → **+4**（新增 `'[^1]: 甲\n\n    乙'` → `甲<br>乙`、`<li>` 计数 1）；§步骤 1 的「同一套」措辞改成「定义/续行判据与 `footnotes.ts:3` 同一套，**块内空行不结束当前条**」。**本修订实跑**（`.tmp/rev-r50-fnprobe.mjs`，导入真实 `src/lib/footnotes.ts`）：**9/9 通过**，含真实链路 `extractFootnotes('正文[^1]\n\n[^1]: 第一行定义\n\n    续行接着写\n').footnotes → <li>第一行定义<br>续行接着写</li>`。
> - **R50-3（P2，文档基线）** → T2 §改动文件加入 **`README.md:133/171` 与 `AGENTS.md:39/72`**（四处「32 个文件 425 条」）；门禁跑完、按 `npm test` **实际输出**回填（预计 33 文件、425+7 条，**不许先写数字再跑**，也不许把预计值当实测值写进 README/AGENTS）。
> - **R50-4（P2，T2 的必过断言没有脚本步骤）** → T2 §步骤 5 列出脚本增补（改前存 `docChars0/侧灯0/灯0` 基线、`Ctrl+Z` 回原样、跨文本节点 `甲**乙**丙` 走退回路径、`**侧灯只补光**` 保留 `strong`），批注保留直接复用 `.tmp/e2e-r36-fix-ann.mjs`（复制后改 2 个截图路径，别覆盖第 36 轮证据）；T2 预算 **13 → 16 min**，T3 从 6 条砍到 5 条（U3 表格字族顺延到下一轮）抵这 3 min。
> - **R50-5（P2，导出提示文案与关闭入口）** → T1 §步骤 3 的提示不再借「保存后」文案（`lossLabels(losses, true)` 走导出口径：把「在保存后」「保存时」换成导出措辞；`risk.ts` 只加一个可选参数、不改分类逻辑）；加 `action: { label: '知道了', onClick: () => setNotice(null) }`（`App.tsx:218` 的 `Notice.action` 与 `:5209-5225` 的 toast 按钮都是现成路径）；§风险删掉「`Esc` 会替换它」——实测 `:3629-3698` 的 Escape 分支没有 `setNotice(null)`，`.toast-close` 只在 `kind === 'error'` 时渲染。
> - **R50-6（P2，角色文件的体积门槛过期）** → 本修订顺手把 `.tmp/iteration/roles/planner.md:28` 的「≤286,000 B 硬门」改成 **内部 310,000 B / 硬线 320,000 B**（与 `common.md:6`、`STATE.md:50` 对齐）；`.tmp` 不进版本控制、零产品改动，下一轮起删掉 §1 的体积口径解释段。
> - 修订范围：**只改本文件 + 上面那 1 行角色文件**。未改产品代码、未连 CDP、未跑 E2E、未起/重启 dev server、未碰 `release/`、未 commit。核对手段：`read` 实读 `src/lib/footnotes.ts`、`src/lib/export.ts`、`src/lib/export.test.ts`、`src/lib/risk.ts`、`src/lib/decorations.ts`、`src/App.tsx:212-225/1859-1872/2848-2860/2915-2954/3629-3698/4085-4131/5199-5229`、`README.md:114-171`、`AGENTS.md:39/72`、`.tmp/iteration/roles/planner.md:28`、`.tmp/e2e-r48-code-replaceall.mjs`、`.tmp/e2e-r36-fix-ann.mjs`、`.tmp/perf-round48-replace.json`、`node_modules/prosemirror-state/dist/index.js:732`、`node_modules/prosemirror-view/dist/index.js:4418`；`node` 实跑只读探针 `.tmp/rev-r50-fnprobe.mjs`（**9/9 PASS**）。

- 轮次：`round=50`、`nn=50`；报告目录 `docs/iteration/round-50`；轮前 `startSha=6ae9be39ee5007da2ebcdffd636da21675dc6694`（`git log -1` 与 `git rev-parse HEAD` 同值；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-50/`、`shots/round-50/`，产品代码 0 改动）。
- 环境：dev server `http://localhost:5175` 已在跑（**不另起、不重启**）；浏览器只用 CDP **9222**，每段 E2E 前跑 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`；不 push、不改 `release/`；本轮**不发版**（`package.json` 不动）。
- 输入：本轮五份 `findings-*.md`（bug 2 / typora 8 / code 5 / ship 4 / ui 10，全部读完）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`git log -8` 与相关源码。
- 结论：**3 个任务**，估时 **31 min**（T1 12 + T2 16 + T3 3；T3 是可砍的余量切片），加 6 min 门禁与 `impl.md` = **34 min 核心 / 37 min 名义**；35 min 硬上限（`roles/planner.md:25`）靠「T3 整项可砍」来守（R50-10，见 §7）。
  - 1 条 **P1 输出保真/数据安全**（bug F1：预览面板与 HTML 导出丢掉脚注续行；同批 bug F2：导出 Markdown 绕过保存前差异门）。
  - 1 条 **P1 性能**（code F3：1 MB「全部替换」冻结 51.8 s，第 48 轮 F1 / 第 49 轮 F3 连续两轮未修，STATE `:66` 第 ① 项、第 49 轮计划承诺「下一轮第一项」）。
  - 1 条 **P2 用户可见**（ui 的 5 条界面缺陷一批：标题阶梯/行高、占位符跳一格、工具栏按钮三种高度、状态栏点击区 16 px；表格字族 U3 因 T2 加测时被砍到下一轮，见 §5）。

## 0. 任务表

| id | 标题 | 级别 | 来源 | 用户可见 | 预估 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 预览/HTML 导出保留脚注续行 + 导出 Markdown 走保存同一差异门 | **P1** | bug F1 + F2 | **是**（预览与导出是核心视图） | 12 min |
| **T2** | 「全部替换」按文本节点批量提交：1 MB 从 51.8 s 降到秒级 | **P1** | code F3（复核） | **是** | 16 min |
| **T3** | 排版与点击区一批：h4 不再等于粗体、标题行高、占位符、工具栏/状态栏尺寸 | P2 | ui U1/U2/U6/U7/U9 | **是** | 3 min（可整项砍，见 §7） |

**为什么是这三条（按 `roles/planner.md` 的排序）**

1. **数据安全**：T1 的两条都是「用户看到的/交出去的成品不是原文」——预览是只读核心视图，HTML 导出是交给别人的成品；导出 `.md` 更是静默把作者写的一行换成另一种语法（同一篇 `Ctrl+S` 会弹框，导出却不弹）。
2. **上一轮承诺的 P1**：T2 是 STATE 待办池第 ① 项，连续两轮复核未修。第 49 轮的顺延理由（「先按 `view.dispatch` 拆段计时再改」）本轮已经有拆计时所需的一切材料（见 T2「为什么」的读数表），不能再顺延。
3. **用户可见收益**：T3 剩下的 5 条全部只动 CSS（只有 U7 的 `aria-label` 是 TSX 一行属性），零 JS 逻辑、零依赖、零懒加载影响；其中 48-F4（占位符）已从第 47 轮顺延至今。

不发版、不加依赖、不碰 `release/`。

## 1. 基线（改前必须记录，写进 `impl.md`）

| 项 | 实测值 | 出处 |
| :--- | :--- | :--- |
| 分支 / HEAD | `main` / `6ae9be3`（round-49：命名实体保存保真 + mark/代码块字号/Mermaid 错误色/24px 点击区 + 中文 `--` 出 `——`） | `git log -1` |
| 首屏 gzip | **294,373 B**（内部 310,000 / 硬线 320,000，余 15,627 / 25,627） | 第 50 轮 `findings-ship.md` §1 本轮实测（与 STATE `:55` 逐字节一致） |
| 测试 | **32 文件 425 条** | 第 49 轮 `npm test`（STATE `:55`）；本轮以 `npm test` 实测为准 |
| 版本 | `0.32.1`（本轮**不 bump**；CHANGELOG 写进 `## Unreleased`） | `package.json:3` |
| 已运行 dev server | `http://localhost:5175` 200 | 五份 finder 报告 |

**体积口径说明（R50-6 已修源头）**：`roles/planner.md:28` 原写「首屏 ≤286,000 B 硬门」，是第 35 轮换挡前的旧上限，已被 2026-11-17 的产品政策取代（`.tmp/iteration/common.md:6`、`STATE.md:50/55`：内部 **310,000** / 硬线 **320,000**）。本修订已把那行角色文件改成新口径（见 §6 最后一条），本轮按 **310,000（内部）/ 320,000（硬线）** 执行；当前 294,373 B 按新线是绿的（距内部余 15,627 B）。下一轮 planner 可以删掉本段。

---

## T1（P1，数据安全）预览/HTML 导出保留脚注续行 + 导出 Markdown 走保存同一差异门

### 为什么

`findings-bug.md` F1：种子 `正文[^1]\n\n[^1]: 第一行定义\n    续行接着写\n` 打开后，源码框里两行都在，**只读预览的「注释」列表只剩 `第一行定义`，`续行接着写` 消失**；同一个 `renderFootnotes` 也被 HTML 导出用，导出的 `<li>` 只有 `第一行定义`（截图 `bug-h-h-cont-preview.png`、`bug-g-g-cont.png`）。原文件不受影响，但用户看到的与交出去的成品都比原文少一行，属可见丢字。

`findings-bug.md` F2：种子 `fn-mid.md`（脚注定义不在文末）里，`Ctrl+S` 会弹「保存前确认」并列出「脚注 `[^1]` 的定义在保存后会消失」（截图 `bug-c1-fn-mid-savegate.png`）；而同一篇点「导出 → Markdown」**没有任何提示**，Blob 直接是 `正文[^1](定义)\n\n后文还在。\n`（截图 `bug-c1-fn-mid-export.png`）。作者会以为导出的 `.md` 是原文副本。

### 根因（已定位，不改别处）

- `src/lib/export.ts:33-45` 的 `renderFootnotes`：`.split('\n').map(trim).filter(line => line.startsWith('[^'))` —— 缩进续行 `    续行接着写` trim 后不以 `[^` 开头，被 `filter` 丢掉。调用点两处：`src/components/PreviewPane.tsx:62`（预览）与 `src/lib/export.ts:187`（HTML 导出），所以两处一起丢。
- 提取层没错：`extractFootnotes` 保留续行（`src/lib/footnotes.ts:3` 的 `CONT = /^(?: {4,}|\t)\S/`、`:44-53`、`:70`；`src/lib/footnotes.test.ts:70` 就是 `[^a]: 第一行\n    续行内容` 的用例），`src/lib/risk.ts:148` 也按同一个正则扫续行。缺的只是渲染这一层。
- 单测只有单行用例（`src/lib/export.test.ts:74-79`），所以一直没红。
- F2 的根因：`src/App.tsx:4096-4101` 的 markdown 分支直接 `saveBlob(name, currentMarkdown(), …)`，没经过 `activeLosses`；`src/App.tsx:2924` 的注释自称「四条保存路径的唯一入口」，导出是第五条、没接进来。

### 改动文件 / 函数

1. `src/lib/export.ts` 的 `renderFootnotes`（约 20 行，函数签名与调用点不变）。
2. `src/lib/export.test.ts`：**+4 个** `test()`（既有 2 条脚注用例 `:74-79`、`:81-83` **一条都不许改**）。
3. `src/App.tsx`：`exportAs` 的 markdown 分支（`:4096-4101`）、`exportAs` 的依赖数组（`:4130`）、`:2924` 的注释订正。
4. `src/lib/risk.ts` 的 `lossLabels`（`:385-394`）：**只加可选参数** `forExport = false`；为 `true` 时把标签里的「在保存后」换成「在导出后」、「保存时」换成「导出时」（导出不保存，不能借保存文案）。`classify` / `activeLosses` 一个字都不动。
5. `docs/CHANGELOG.md`、`README.md:126`（一行）。

**不要**动 `PreviewPane.tsx`、`footnotes.ts`、`serializeDocument.ts`、保存链（`requestSave` / `runSave` / `performCommit`）、`buildHtmlDocument` 的样式块。`risk.ts` 只改 `lossLabels` 的文案参数，别碰分类逻辑。

### 实施步骤

1. **`renderFootnotes` 改成「先切条目、再拼行」**（续行用 `<br>` 连接，逐行转义后再拼，不重复转义）：

   ```ts
   /** 把 `[^id]: 内容` 形式的脚注定义转成列表项；缩进续行（4 空格或 tab）跟同一条，用 <br> 连接 */
   export function renderFootnotes(footnotes: string): string {
     const items: string[][] = []
     let current: string[] | null = null
     for (const raw of footnotes.replace(/\r\n?/g, '\n').split('\n')) {
       // 块内空行不结束当前条：footnotes.ts:47-51 就把空行拼回同一块，渲染层必须跟上
       if (raw.trim().length === 0) continue
       const definition = /^\[\^([^\]]+)\]:\s*(.*)$/.exec(raw)
       if (definition) {
         current = [definition[2]]
         items.push(current)
         continue
       }
       // 续行判据与 footnotes.ts:3 同一个正则：4 空格或 tab 开头 + 非空白
       if (current !== null && /^(?: {4,}|\t)\S/.test(raw)) {
         current.push(raw.trim())
         continue
       }
       current = null // `[label]:` 引用式定义、正文行都结束当前条
     }
     const rendered = items
       .map((lines) => lines.map((line) => line.trim()).filter((line) => line.length > 0))
       .filter((lines) => lines.length > 0)
       .map((lines) => `<li>${lines.map(escapeHtml).join('<br>')}</li>`)
     if (rendered.length === 0) return ''
     return `<section class="footnotes"><h2>注释</h2><ol>${rendered.join('')}</ol></section>`
   }
   ```

   语义要点（写进 `export.ts` 的注释）：
   - 定义/续行判据与 `src/lib/footnotes.ts:3` **同一套**（` {4,}` 或 tab 开头 + 非空白），**块内空行不结束当前条**（`footnotes.ts:47-51`）；不要再造第三套口径，也不要为了「空行也结束」把 `[^1]: 甲\n\n    乙` 这种真实块切坏。
   - 空行用 `continue` 跳过就等价于「记 pendingBlank」：下一条非空行要么是定义（开新条）、要么是缩进续行（接上）、要么都不是（结束本条），三种分派已经决定归属，不需要额外的布尔量。
   - **完全空的 `[^1]:`（后面没有任何续行）**整条不出 `<li>`（`export.test.ts:81-83` 的 `renderFootnotes('') === ''` 也不破）。**行为变化要写进注释、别说成「与今天一致」**：`[^1]:` + 缩进续行（`'[^1]:\n    乙'`）今天输出 `''`，新实现输出 `<li>乙</li>`——定义 + 续行才出内容，这是更正确的口径（复审 §0.1 实测）；
   - `[label]: 引用定义` 那一行不是脚注，它的缩进续行**不得**追加到上一条脚注里（`current = null` 之后再来的续行没有 `current` 可接，天然被丢掉）。
   - **本修订已用真实模块验过**：`.tmp/rev-r50-fnprobe.mjs`（`node --experimental-strip-types`，导入 `src/lib/footnotes.ts`）9/9 通过，含 `extractFootnotes('正文[^1]\n\n[^1]: 第一行定义\n\n    续行接着写\n').footnotes` 直接喂给上面的实现 → `<li>第一行定义<br>续行接着写</li>`。

2. **`export.test.ts` +4 个 `test()`**（直接调 `renderFootnotes` 公开 API，不新增导出）：
   - 单条 + 续行：`renderFootnotes('[^1]: 第一行定义\n    续行接着写')` 含 `第一行定义<br>续行接着写`，且 `<li>` 计数为 1。
   - 多条混合：`renderFootnotes('[^a]: 甲\n    甲续\n[^b]: 乙')` 的 `<li>` 计数为 2，含 `甲<br>甲续` 与 `<li>乙</li>`。
   - 引用式定义隔离：`renderFootnotes('[^1]: 第一行\n    续行\n[label]: 引用定义\n    不该追加')` 含 `第一行<br>续行`、`<li>` 计数为 1、**不含** `不该追加`。
   - **定义 + 空行 + 缩进续行（R50-2）**：`renderFootnotes('[^1]: 甲\n\n    乙')` 含 `甲<br>乙`，`<li>` 计数为 1（`footnotes.ts:47-51` 允许块内空行，渲染层不能把空行当结束）。
   - 既有两条（`:74-79`、`:81-83`）保持原样，跑绿即回归通过。

3. **`exportAs` 的 markdown 分支接差异门**（导出的是改写后的正文，必须先让人看见损失；导出照旧写出，不弹模态框）：

   ```ts
   if (kind === 'markdown') {
     const name = exportName(docName, 'md')
     const markdown = currentMarkdown()
     // 第 50 轮：导出与保存共用同一判据；导出不写盘，所以给可关闭的提示而不是模态确认
     const losses =
       originalText !== null
         ? activeLosses(originalText, normalizeForBaseline(markdown, originalText), baselineLossesRef.current)
         : []
     saveBlob(name, markdown, 'text/markdown;charset=utf-8')
     if (losses.length > 0) {
       setNotice({
         text: `已导出 ${name}。注意：导出的是改写后的正文——${lossLabels(losses, true).join('；')}`,
         kind: 'info',
         persist: true,
         action: { label: '知道了', onClick: () => setNotice(null) },
       })
     } else {
       show(`已导出 ${name}`)
     }
     return
   }
   ```

   - 依赖数组加 `originalText`（`activeLosses` / `lossLabels` / `normalizeForBaseline` 都是模块级 import，已在 `src/App.tsx:66,69`，不进依赖）。
   - `lossLabels(losses, true)` 是**导出口径**：`risk.ts:168` 的原标签是「脚注 [^1] 的定义**在保存后**会消失」，导出并不保存，直接借这句会让用户看见一条指向错误动作的警告；`forExport = true` 只把「在保存后」换成「在导出后」，分类逻辑不动。
   - `persist: true` 是必须的：`show()` 与普通提示 6 s 自动消失（`src/App.tsx:1891-1895`），改写提示一闪而过等于没提示；`action` 是**唯一**的关闭入口——`Esc` 不清提示（`:3629-3698` 的 Escape 分支没有 `setNotice(null)`），`.toast-close` 只在 `kind === 'error'` 时渲染（`:5209-5225`），`Notice.action` 与 `.toast-action` 是现成路径（`:218`、`:5211-5215`、`styles.css:2083`）。
   - `lossLabels` 的改法（`src/lib/risk.ts:385-394`）：`export function lossLabels(losses: Loss[], forExport = false)`；循环里 `const label = forExport ? loss.label.replace('在保存后', '在导出后').replace('保存时', '导出时') : loss.label`，去重与顺序不变。**两个**既有调用点（`App.tsx:1102`、`:2109`；`grep -n 'lossLabels(' src` 实测 = 这两处调用 + `src/lib/risk.ts:385` 的定义）不传第二个参数，行为一字不变。**不加单测**：导出文案由 E2E 锁「不含 `保存后`」，加单测反而多一个计数点、要改四处的数字。
   - 顺手把 `src/App.tsx:2924` 的注释从「四条保存路径的唯一入口」改成「保存路径的统一入口（导出不写盘，走同一判据但只提示）」，别再留下与代码不符的说法。

4. **`docs/CHANGELOG.md`**：`## Unreleased（第 29–49 轮，未发版）` 改成 `## Unreleased（第 29–50 轮，未发版）`，在末尾加 `**第 50 轮（同一未发版区间）**` 子段，写 T1/T2/T3 三条（T1 写「续行用 `<br>` 接在同一个 `<li>` 里；导出 `.md` 有改写风险时给持久提示」）。

5. **`README.md:126`**（ship S1，一行）：`SHA256SUMS-0.32.1.txt` → `SHA256SUMS-<版本>.txt`。同文件 `:13` 与 `packaging/README.md:58` 已经用 `<版本>` 写法，只有这一处写死。

6. **E2E**（`.tmp/e2e-r50-impl-t1.mjs`，CDP 9222）：把 `.tmp/e2e-r50-bug-h.mjs` **复制**后改，**不要原地跑** finder 脚本（它写 `shots/round-50/bug-h-*.png`，会把 finder 的证据覆盖成 impl 前缀的不同内容）。复用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `openFolder`；Blob 捕获抄 `.tmp/e2e-r50-bug-g.mjs:41` 的 `addInitScript`（改写 `URL.createObjectURL` 收 `window.__blobs`）；Markdown 导出那一步抄 `.tmp/e2e-r50-bug-c.mjs` 的 C1 段（`:61-78`）。四篇种子：

   ```js
   const seeds = {
     'h-cont.md': '正文[^1]\n\n[^1]: 第一行定义\n    续行接着写\n',
     'h-two.md': '甲[^a] 乙[^b]\n\n[^a]: 定义甲\n[^b]: 定义乙\n',
     'fn-mid.md': '正文[^1]\n\n[^1]: 定义\n\n后文还在。\n',
     'fn-end.md': '正文[^1]\n\n[^1]: 定义\n',
   }
   ```

   断言（逐条打印读数，日志 `.tmp/r50-impl-t1.log`）：
   - `h-cont.md`：源码框含 `续行接着写`；`Ctrl+Shift+P` 预览 `.footnotes li` 计数 **1**、文本同时含 `第一行定义` 与 `续行接着写`；截图 `impl-t1-preview-cont.png`。
   - `h-cont.md`：导出 HTML，截获的 Blob 文本含 `续行接着写`、`<li>` 计数 1。
   - `h-two.md`：预览 `.footnotes li` 计数 **2**（`定义甲` / `定义乙`），不含 `续行`（负例：别把续行判据放宽到普通行）。
   - `fn-mid.md`：导出 Markdown → **无** `[role="dialog"]`；Blob 已写出；提示文本含 `已导出`、`注意`、`脚注 [^1]`、`在导出后会消失`，**不含** `保存后`（R50-5 的判据）；等 6.5 s 后提示仍在（`persist` 生效，不是一闪而过）；`.toast-action` 按钮文本 `知道了`，点它后 `.toast` 消失；截图 `impl-t1-export-warn.png`。
   - `fn-end.md`（对照）：导出 Markdown → 提示含 `已导出`、**不含** `注意` / `保存后`，也没有 `.toast-action`（无损失时不打扰）。
   - 全程 `[role="dialog"]` 计数 0（导出路径仍然不弹「保存前确认」）；`console.error` / `pageerror` 0 条。

### 验收标准（逐条可执行）

- `npx tsc --noEmit` → exit 0。
- `npm test` → `fail 0`；**33 个文件**、新增 **+7 条**（T1 的 4 条 + T2 的 3 条；T2 的新测试文件已追加进 `test` 脚本，总条数预计 425 + 7 = 432，**以 `npm test` 实际输出为准**，把实际文件数与条数写进 `impl.md`，并按 T2 §改动 4 回填 `README.md:133/171`、`AGENTS.md:39/72`——**不许把预计值当实测值写进文档**）。
- `npm run verify` → PASS，首屏 gzip ≤ **310,000 B**，记录具体字节与 `files=3`。
- E2E 六组断言全绿（日志 `.tmp/r50-impl-t1.log`）。
- 静态对照：`git diff --stat` 只含 `src/lib/export.ts`、`src/lib/export.test.ts`、`src/lib/risk.ts`、`src/App.tsx`（+T2 的 `src/lib/replaceRanges*.ts`、`package.json` 的 `test` 行）+ 文档（`docs/CHANGELOG.md`、`README.md`、`AGENTS.md`）。
- 不发版：`package.json` 的 `version` 不变；该文件若出现在 diff 里，只允许是 T2 的 `test` 脚本那一行。

### 风险与回退

- 转义顺序：**先逐行 `escapeHtml` 再 `join('<br>')`**；反过来会把 `<br>` 自己转义成 `&lt;br&gt;`（预览里会看到字面标签）。
- 续行判据只认 4 空格或 tab（与 `footnotes.ts:3` 一致）；用 2 空格写的脚注本来就是**引用式定义**的续行口径，别顺手放宽——放宽会让 `[label]:` 的续行被吸进上一条脚注（§步骤 1 的第三条断言就是锁这个）。
- `activeLosses` 会对整篇跑一次 `classify`（`src/lib/risk.ts:376-383`），1 MB 文档导出时会多花一次分类；导出是低频动作，接受，但要在 `impl.md` 记一条读数（100 KB 级即可）。
- `persist: true` 的提示不会自动消失，关闭入口只有 `知道了` 按钮：`Esc` **不**清提示（`:3629-3698` 的 Escape 分支里没有 `setNotice(null)`），`.toast-close` 只在 `kind === 'error'` 时渲染（`:5209-5225`）；下一次 `setNotice` 会覆盖它。不要为此新增关闭按钮或改动 toast 渲染。
- 导出口径只走 `lossLabels(losses, true)`；不要在 `App.tsx` 里对标签做字符串替换（那样会把「保存后」的耦合藏到调用点，标签一改就静默失效）。
- 回退：`git checkout -- src/lib/export.ts src/lib/export.test.ts src/App.tsx`。

### 截图

`shots/round-50/impl-t1-preview-cont.png`（预览「注释」里两行都在）、`impl-t1-export-warn.png`（导出 Markdown 的持久提示）。两张都在脚本里落在 finder 前缀之外（`impl-`）。

---

## T2（P1，性能）「全部替换」按文本节点批量提交：1 MB 从 51.8 s 降到秒级

### 为什么

`findings-code.md` F3（复核第 48 轮 F1 / 第 49 轮 F3）：`src/App.tsx:1859-1872` 的 `replaceEvery` 在一个事务里对**每一处命中**调一次 `insertText`/`delete`，1 MB / **39,936 命中**实测 `view.dispatch` **51,802 ms**、点击到返回 **52,197 ms**（第 48 轮同基线，代码逐字未变）。这期间主线程全占，界面像卡死；作者唯一的硬刷新/关窗动作可能丢掉未保存改动。第 49 轮已承诺「下一轮第一项」，本轮做。

关键读数（`.tmp/perf-round48-replace.json`，文件在本仓库、可复核）：

| 文档 | 命中 | `clickReturnMs` | `view.dispatch` | 每条命中 |
| :--- | ---: | ---: | ---: | ---: |
| 100 KB | 4,096 | 789.8 | 769.1 | 0.19 ms |
| 1 MB | 39,936 | 52,197.5 | 51,802 | **1.30 ms** |

（`clickReturnMs` 与 `dispatch` 是两列：100 KB 的 769.1 是 **`dispatch`**，`clickReturnMs` 是 **789.8**；「每条命中」= `dispatch` ÷ 命中数。）

**两档的固定成本相同（R50-7）**：两档样本都是 **1,024 段**（`.tmp/e2e-r48-code-replaceall.mjs:44-47`），修后分组步数都 ≈1,024，`view.dispatch` 都要重建/同步这 1,024 段——这部分不随命中数变，所以 100 KB 的门槛**不能**按「2,000 ms ÷ 39,936 × 4,096」折算（那会得到 205 ms，比该档修后成本 ≈340–360 ms 还低，见 §验收）。

推导（本轮据此定方向）：**循环本身只占约 395 ms**（`clickReturnMs − dispatch = 52,197.5 − 51,802`），51.8 s 全在 `view.dispatch` 那一次事务里。同一事务里有两个成本都随「命中数 × 步数」增长：

1. **39,936 个步骤逐个落到 doc 上**：每次 `insertText` / `delete` 都往事务里追加一个 `ReplaceStep`，`Transform` 每步都要把它应用到文档（重建被改段落所在的那条路径）——步数就是命中数。
2. **查找高亮的映射**：`src/lib/decorations.ts:15-21` 的插件在**每个事务**上执行 `previous.map(transaction.mapping, transaction.doc)`，把装饰集逐个映射过**整个** `transaction.mapping`；查找条开着时命中处有 39,936 个 `find-hit` 装饰（`decorations.ts:68-76`），这次事务的 mapping 又有全部 39,936 步 → 约 39,936 × 39,936 次映射位置运算。

这也解释了单步成本从 0.19 ms 涨到 1.30 ms（100 KB → 1 MB）：② 的每个装饰要映射过全部步数，步数 ×10，摊到每一步的成本就跟着涨。`view.dispatch` 本身只在事务落地后同步一次 DOM，不是 39 遍。所以方向是**减少步骤**——把每段并成一步（步数 39,936 → ≤1,024），①② 同时降一到两个数量级，不是优化循环。

### 改动文件 / 函数

1. `src/App.tsx` 的 `replaceEvery`（`:1859-1872`），顶部加 `import { applyReplacements, type ReplaceRange } from './lib/replaceRanges.ts'`。
2. 新增纯函数 `src/lib/replaceRanges.ts`（约 20 行）+ `src/lib/replaceRanges.test.ts`（3 条）。
3. `package.json` 的 `test` 脚本**追加一行** `&& node --experimental-strip-types src/lib/replaceRanges.test.ts`（该脚本是逐文件枚举的，不追加新测试文件等于没跑；只改这一行，`version` 一个字都不动）。
4. **测试计数回填（R50-3）**：新增第 33 个测试文件后，`README.md:133`（「32 个文件、425 条断言」）、`README.md:171`（「32 个测试文件挂进 npm test」）、`AGENTS.md:39`（「第 49 轮记 32 个文件、425 条」）、`AGENTS.md:72`（段落里「测试 32 个文件 425 条」）全部变旧。门禁跑完、按 `npm test` **实际输出**回填这四处；`AGENTS.md:39` 的轮次前缀改成「第 50 轮记」（README 两处只改数字，不要顺手改别的句子）。
5. `docs/CHANGELOG.md`（T1 那一段里加一行）。

**不要**动 `findAll`（`src/lib/find.ts`）、`FindBar.tsx`、`decorations.ts`、批注映射（第 36 轮「全部替换不再清空页边批注」这条行为必须保持）、`requestSave` 与保存链。

### 实施步骤

1. **先量改前读数**（不改代码）：把 `.tmp/e2e-r48-code-replaceall.mjs` **复制**成 `.tmp/e2e-r50-impl-t2.mjs`，按步骤 5 的清单改完再跑：
   - `:10` 的 `const SHOTS = 'shots/round-48'` → `'shots/round-50'`，截图名改成 `impl-t2-${label}-replaceall.png` / `impl-t2-${label}-undo.png`（照原样跑会覆盖第 48 轮的历史证据，AGENTS §8 同类坑）；
   - `:116` 的输出文件名改成 `.tmp/perf-round50-replace.json`。
   跑法 `node .tmp/reset.mjs 9222` → `node .tmp/e2e-r50-impl-t2.mjs 9222 --no-undo`（1 MB 那档约 60 s，**耐心等**，不要 kill；`--no-undo` 的理由见步骤 5）。把 `matchCount`、`dispatch` 里 `steps > 0` 那条的 `ms` 与 `steps`、`clickReturnMs`、`longtasks`、`docChars`（替换后）、`docChars0` / `侧灯0` / `灯0`（替换前基线）抄进 `impl.md` 的「改前」列。改前这次性能门槛必然红（51.8 s > 2 s），**红是预期**，只记读数；同一次跑里的正确性断言（跨节点、`strong`、批注）应当已绿——它们锁的是旧行为，这时就红说明脚本写错了，先查脚本、别改产品。
2. **新增纯函数**（只做字符串算术，零 DOM、零 ProseMirror 依赖，好单测）：

   ```ts
   export type ReplaceRange = { from: number; to: number }
   /** 在一段纯文本上按命中区间做替换；ranges 必须按 from 升序、互不重叠（调用方保证） */
   export function applyReplacements(text: string, ranges: ReplaceRange[], replacement: string): string {
     let out = ''
     let cursor = 0
     for (const range of ranges) {
       if (range.from < cursor) continue // 防御：重叠区间跳过，不重复替换
       out += text.slice(cursor, range.from) + replacement
       cursor = range.to
     }
     return out + text.slice(cursor)
   }
   ```

   单测 3 条：多区间 + 变形（`'侧灯只补光，侧灯不写'` 两处 `侧灯→灯` → `'灯只补光，灯不写'`）、删除（`replacement === ''`）、替换词比命中长（长度增长后下标正确）+ 相邻区间。**分组路径必须调用这个函数**（`nextText = applyReplacements(node.textContent, local, replacement)`），不许在 `replaceEvery` 里另写一份下标算术：`tsconfig.json` 只有 `strict`、**没有 `noUnusedLocals`**（实读），手写一份不会让 `npm run build` 变红，那 3 条单测就变成死代码的测试，真实路径（相邻区间、替换词变长后下标漂移）没人测（R50-8）。§验收有一条 `git grep -n 'applyReplacements(' src/App.tsx` 非 0 命中锁这个接线。
3. **`replaceEvery` 按文本节点分组**（关键：一次事务里「每个文本节点最多一步」）。要点写清楚：
   - 用 `doc.descendants` 走一遍文本节点，**双指针**消费已按 `from` 升序的 `matches`（不要对每个节点遍历全部命中：1,024 节点 × 39,936 命中 = 4,100 万次比较）；
   - 一个文本节点 `[nodeFrom, nodeTo)` 里完整包住的命中算进 `local`，`covered += local.length`；
   - 分组完成后若 `covered !== matches.length`（命中**跨过文本节点**，例如 `甲**乙**` 里查 `甲乙`），**整单退回旧的逐条路径**，语义与今天一致；
   - 反序应用（`for (let i = groups.length - 1; i >= 0; i--)`），保证后面步骤的位置仍按原文档坐标算；
   - **`nextText` 只能来自 `applyReplacements`（R50-8）**：`const nextText = applyReplacements(group.node.textContent, group.local, replacement)`——`group.local` 是**节点内相对坐标**，`node.textContent` 是**替换前**的原文，一次算完；不要自己 `slice` 拼串，也不要「先改一个再算下一个」；
   - 新文本为空（`nextText.length === 0`）→ `transaction.delete(group.from, group.to)`；否则 `transaction.replaceWith(group.from, group.to, schema.text(nextText, group.node.marks))`——用**原节点的 marks** 重建文本节点，替换词继承原来的行内格式（与 `insertText` 语义一致），不丢周围格式；
   - 最后仍然一次 `editor.view.dispatch(transaction)` + `editor.commands.focus()`。**不要**加埋点/`performance.mark`、不要加进度条、不要拆多个事务（本任务是减步数，不是「分片让出主线程」）。
4. 参考骨架（形状即可，具体命名执行者定）：

   ```ts
   const { doc, schema } = editor.state
   const groups: { from: number; to: number; local: ReplaceRange[]; node: PMNode }[] = []
   let covered = 0
   let matchIndex = 0
   doc.descendants((node, pos) => {
     if (!node.isText) return
     const nodeFrom = pos
     const nodeTo = pos + node.nodeSize
     while (matchIndex < matches.length && matches[matchIndex].to <= nodeFrom) matchIndex += 1
     const local: ReplaceRange[] = []
     for (let i = matchIndex; i < matches.length && matches[i].from < nodeTo; i += 1) {
       const match = matches[i]
       if (match.from < nodeFrom || match.to > nodeTo) continue
       local.push({ from: match.from - nodeFrom, to: match.to - nodeFrom })
     }
     if (local.length === 0) return
     covered += local.length
     groups.push({ from: nodeFrom, to: nodeTo, local, node }) // 存下原节点：nextText 要用它的 textContent / marks
   })

   // 反序应用：后面步骤的位置仍按原文档坐标算（R50-8：nextText 只走 applyReplacements）
   for (let i = groups.length - 1; i >= 0; i -= 1) {
     const group = groups[i]
     const nextText = applyReplacements(group.node.textContent, group.local, replacement)
     if (nextText.length === 0) transaction.delete(group.from, group.to)
     else transaction.replaceWith(group.from, group.to, schema.text(nextText, group.node.marks))
   }
   ```

   （`matchIndex` 只前移不回退——`descendants` 按位置升序访问文本节点。`PMNode` 是 `src/App.tsx:7` 已有的 `import type { Node as PMNode } from '@tiptap/pm/model'`，直接用；**不要**写裸 `Node`，DOM 里也有个 `Node` 类型。）
5. **同一脚本补正确性与撤销断言**（约 20 行；R50-4。改前、改后都用这一版脚本，步骤 1 先复制）：
   - 点「全部替换」**之前**先存基线：`docChars0 = __ed.state.doc.textContent.length`、`侧灯0` 与 `灯0` 用 `text.match(/侧灯/g)` / `/灯/g` 的 `length`；
   - 替换后断言：`docChars === docChars0 − matchCount`、`侧灯` 0、`侧` 0、`灯 === 灯0`；
   - `page.keyboard.press('Control+z')`，用 `waitForFunction` 等 `__ed.state.doc.textContent.length === docChars0`（超时 30 s，别用固定 800 ms 猜），再断言 `侧灯 === 侧灯0`（一个事务 = 一步撤销）；截图 `impl-t2-${label}-undo.png`。**改前那次传 `--no-undo` 跳过撤销**：旧实现的一次撤销同样是 39,936 个反向步骤，会再花约 50 s 且不验证新代码；改后那次（不带参数）必须跑。
   - 第二、第三个**小页面**各跑一遍（种子直接写死文本，不走 `makeDoc`）：
     - `cross.md` = `'甲**乙**丙\n'`：查找 `甲乙` → 全部替换 `Q` → 正文是 `Q丙`（命中跨过文本节点，**走退回路径**），`console.error` 0；
     - `mark.md` = `'甲**侧灯只补光**\n'`：查找 `侧灯` → 全部替换 `灯` → `.ProseMirror strong` 计数仍是 1、`strong.textContent` 含 `灯只补光`（分组路径必须带原 `node.marks`）；
   - **批注保留另用现成脚本**：复制 `.tmp/e2e-r36-fix-ann.mjs` 成 `.tmp/e2e-r50-impl-t2-ann.mjs`，只把 `:78` / `:95` 两个 `shots/round-36/…` 截图路径改成 `shots/round-50/impl-t2-ann-after-replaceall.png` / `impl-t2-ann-after-undo.png`（不改就会覆盖第 36 轮证据，AGENTS §8 同类坑），先 `node .tmp/reset.mjs 9222` 再原样跑：它用假工作区播种 1 条批注，断言全部替换后 `.annot` 计数 1、页边「批注（1 条）」、store 里 `to − from === 2`，`Ctrl+Z` 后正文回 `天空很蓝…` 原样。跑红先分辨是不是选择器过期（AGENTS §8：`.file-tree`、「文件 ▾」菜单这类选择器会随 DOM 改动过期），是脚本过期就改脚本，别记成产品缺陷。
   - 只有时间真的不够时，批注那条才退到静态检查（`git grep -n 'setAnnotations(\[\])' src/` 与改前同值），并在 `impl.md` 写 UNVERIFIED。
6. **量改后读数**：同一版脚本再跑一次（不带 `--no-undo`），填「改后」列；门槛与上面全部断言必须绿。若性能门槛红，按 §验收的 2,000–4,000 ms 条件项写清卡点、**不许改数字**（100 KB 的 400 ms 与 1 MB 的 2,000 ms 是同一条纪律）。
7. CHANGELOG 加一行（「全部替换改为按文本节点批量提交，1 MB / 39,936 命中从 52.2 s 降到 X s」）。

### 验收标准

- **正确性**（同一脚本里加断言，必须绿）：
  - 1 MB 那档 `docChars`（替换后）与**本轮改前脚本读数**完全相同（第 48 轮同一脚本读数是 983,046，可作旁证；以你改前跑出的那个数为准）；`docChars0` / `侧灯0` / `灯0` 三列改前改后并列打印；
  - 替换后正文里 `侧灯` 计数 **0**、`侧` 计数 **0**（种子里 `侧` 只出现在 `侧灯` 里），`灯` 计数与 `灯0` **相同**（`侧灯`→`灯` 是 2 字换 1 字，字面 `灯` 的数量不变）；
  - `Ctrl+Z` 一次后 `侧灯` 计数回到 `侧灯0`、`docChars` 回到 `docChars0`（一个事务 = 一步撤销）；
  - 跨文本节点负例 `甲**乙**丙` 查 `甲乙` → 全部替换后正文是 `Q丙`（命中跨节点，走退回路径也正确）；
  - `**侧灯只补光**` 查 `侧灯` → 替换后 `strong` 计数 1、`strong.textContent` 含 `灯只补光`（分组路径必须带原 `node.marks`，否则粗体被洗掉且 `Ctrl+Z` / 字节断言都看不出）；
  - 批注保留：`.tmp/e2e-r50-impl-t2-ann.mjs` 输出 `## VERDICT PASS`（`.annot` 计数 1、页边「批注（1 条）」、store 1 条且 `to − from === 2`、`Ctrl+Z` 后正文回原样）。
- **性能门槛**（指标是 `dispatch` 数组里 `steps > 0` 的那一条——`.tmp/e2e-r48-code-replaceall.mjs:70` 记录的就是 `replaceEvery` 的那次事务；`dispatch[0]` 通常就是它，但按 `steps > 0` 取更稳）：
  - 1 MB / 39,936 命中：该条 **`ms` ≤ 2,000 ms**（`findings-code.md:105` 的原口径；改前 `dispatch` 51,802 ms / 39,936 步，降 ≥ 96.1%）；改后那条的 `steps` 必须降到 **≤1,024 量级**（= 文本节点数；`steps` 没降说明分组没生效，`ms` 绿了也要查）；
  - 100 KB / 4,096 命中：同一指标 **`ms` ≤ 400 ms**（改前 `dispatch` 769.1 ms，降 **≥ 48.0%**）。**不按命中数线性折算**：两档样本都是 **1,024 段**（`.tmp/e2e-r48-code-replaceall.mjs:44-47`），分组后步数都 ≈1,024，`view.dispatch` 都要重建/同步这 1,024 段——这部分是**两档相同的固定成本**，只有「装饰数 × 步数」那一项随命中数变。按本轮基线反推（k ≈ 32.3 ns/(装饰×步)）：该档修后 ≈135 ms（映射）+ ≈220 ms（非映射）≈ **340–360 ms**，400 ms 留 ≈10–15% 余量；而 205 ms（= 2,000 ÷ 39,936 × 4,096）**低于**上面这条推算；就算换成最宽容的模型（769 ms 全按步数线性 → 192 ms），205 ms 也只比它高 6.8%、等于没有余量 → 几乎必然假红，红的原因会是门槛算错而不是方案错（R50-7）。这一档的 `steps` 同样必须降到 **≤1,024 量级**；
  - `clickReturnMs` 与 `longtasks` **只并列打印、不作门槛**（前者混入点击分发等固定项约 395 ms；后者是主线程观测，防止「dispatch 快了但整页仍卡」被漏看）；
  - **若 1 MB 那条落在 2,000–4,000 ms**：不许改数字、不许删断言；在 `impl.md` 写清卡在哪（`dispatch` 改前/改后的 `ms` 与 `steps`、单步成本、①② 两项各占多少），并补一次对照读数——点「全部替换」前先 dispatch 一条只带 `setMeta` 的事务，把 39,936 个查找装饰清成空集，再跑同一替换，两次 `ms` 并列。**取插件 key 的正确写法（R50-11）**：`const p = state.plugins.find((x) => x.spec.key?.key?.startsWith('sidelightFind'))`，**先断言 `p` 非空**；`PluginKey.key` 由 `createKey('sidelightFind')` 生成、带 `$` 后缀（`node_modules/prosemirror-state/dist/index.js:966/974-979/990`），按 `=== 'sidelightFind'` 找会 **0 命中**，`setMeta(undefined, …)` 静默无效 → 两次读数一样，就会错写成「装饰不是瓶颈」。拿不到 `p` 就在 `impl.md` 记 UNVERIFIED，**不许**下「装饰不是瓶颈」的结论。空集用 `Object.getPrototypeOf(decoSet).constructor.empty` 取 `DecorationSet.empty`。**不要**事后改 `plugin.spec.state.apply`：`FieldDesc` 在构造时已把 `spec.state.apply` 绑定掉了（`node_modules/prosemirror-state/dist/index.js:732`），改了不生效。
  - 达不到还是不许改门槛数字或删断言（原话保留）。
- **静态接线（R50-8）**：`git grep -n 'applyReplacements(' src/App.tsx` **非 0 命中**（至少 1 处调用，必须落在 `replaceEvery` 的正文里；import 行是 `applyReplacements,` 不带 `(`，所以这个模式只匹配调用）。改前先跑同一命令应为 **0 命中**，作为「改动前确实没有」的对照；**命令形式自检**：同一条命令把模式换成 `'matches.length'` 跑一次应非 0 命中——它证明「`git grep` + 含 `(` 的模式 + PowerShell 引号」这套写法在你的 shell 里真能出结果（AGENTS §8：原生参数里的引号会被吃掉，别把 0 命中当成「改动没落地」）。**不要**用 `git grep` 去查新建的 `src/lib/replaceRanges.ts`——未跟踪文件它搜不到，那是预期不是失败。
- `npx tsc --noEmit` exit 0；`npm test` `fail 0`（**33 文件**、新增 **+7 条**：T1 的 4 条在既有 `export.test.ts` 里，T2 的 3 条是新文件、已追加进 `test` 脚本；总条数预计 425 + 7，**以 `npm test` 输出为准**）；`npm run verify` PASS（首屏 ≤ 310,000 B，App.tsx 主 chunk 增量预计 +150…+400 B gzip）。
- 文档计数与实际一致：`README.md:133/171`、`AGENTS.md:39/72` 四处写的文件数与条数 = 本轮 `npm test` 输出（不得写预计值）。
- `git diff` 只含 `src/App.tsx`、`src/lib/replaceRanges.ts`、`src/lib/replaceRanges.test.ts`、`package.json`（只 `test` 脚本一行）、`README.md`（T1 的 `:126` + T2 的 `:133/:171`）、`AGENTS.md`（`:39/:72`）、`docs/CHANGELOG.md`。

### 风险与回退

- **行内格式**：整节点替换必须带原 `node.marks`；漏了会把粗体/斜体里的替换词变回普通字，而 `Ctrl+Z` 与字节断言都看不出来（验收里的 `mark.md` 那条 `strong` 断言就是锁这个）。
- **跨节点命中**：`findAll` 只排除块分隔符（`src/lib/find.ts:9,46`），命中**可以**跨文本节点（标记边界）。退回分支必须真的存在，否则会漏替换（`covered !== matches.length` 的守卫就是锁这个；`cross.md` 那条断言锁退回路径的结果）。
- **批注映射**：第 36 轮起「全部替换不清空页边批注」，本改动不改 `setAnnotations`，但改动区间变大（整节点 vs 单处）。用 `.tmp/e2e-r50-impl-t2-ann.mjs`（复制自第 36 轮脚本、改两个截图路径）跑；若时间不够才退到静态检查（`git grep -n 'setAnnotations(\[\])' src/` 与改前同值）并写 UNVERIFIED。
- **门槛偏紧**：2,000 ms 是 `findings-code.md:105` 的原口径，比改前 51.8 s 严 26 倍；100 KB 档是 **400 ms**（不是 205 ms，R50-7）。按「每个文本节点一步（≤1,024 步）」估算：100 KB ≈ **340–360 ms**、1 MB ≈ **1.5–1.6 s**（映射 ≈1.32 s + 非映射 ≈0.25 s，k ≈ 32.3 ns/(装饰×步)）——1 MB 距 2,000 ms 只有约 25% 余量，**2,000–4,000 ms 条件项很可能触发**，那是预期路径不是失败。如果落在 2,000–4,000 ms，**不许改 §验收的数字**，按 §验收的 2,000–4,000 ms 条件项写卡点与对照读数（取插件 key 按 R50-11 的写法，先断言非空）。
- **撤销粒度**：仍是一个事务，`Ctrl+Z` 一次全回；不要拆成多个事务（会把一次替换变成多次撤销）。
- **沿用既有假设**：`matches` 是相对当前 `doc` 的位置（查找条在文档变化时会重算），不要借本轮改成实时重算，也不要加「替换中禁止编辑」的新状态。
- 回退：`git checkout -- src/App.tsx && rm src/lib/replaceRanges*.ts`。

### 截图

`shots/round-50/impl-t2-1mb-replaceall.png` 与 `impl-t2-100kb-replaceall.png`（改后各档替换完成的状态栏/查找条；脚本自带的整页截图改名前缀）、`impl-t2-1mb-undo.png`（`Ctrl+Z` 后正文回原样）、`impl-t2-mark-replaceall.png`（`**侧灯只补光**` 替换后粗体仍在）、`impl-t2-ann-after-replaceall.png` / `impl-t2-ann-after-undo.png`（批注脚本改路径后的两张）。全部 `impl-` 前缀，别覆盖 `shots/round-48/code-*-replaceall.png` 与 `shots/round-36/impl-ann-after-*.png`。

---

## T3（P2，用户可见）排版与点击区一批：5 条

### 为什么

`findings-ui.md` 量到的 5 条（U3 表格字族本轮顺延，理由见 §5 第 1 项），全部只动 `src/styles.css`（+ 一个 `aria-label`），零 JS 逻辑、零依赖、零懒加载影响；其中 U6 是第 48 轮 48-F4、第 47 轮就记下的顺延项。

| # | 现状实测 | 期望 |
| :--- | :--- | :--- |
| U1 | `h4` 与 `strong` **完全同形**：17 px / 700（`h4VsStrongSame: true`）；`src/styles.css` 里 `h4` **0 命中**，落 UA 默认 | h4 明显大于正文，粗体不再冒充标题 |
| U2 | `h2`–`h4` 行高继承 `.doc-body` 的 **1.95**（`styles.css:575`），h1 是 1.35（`:586`）；两行 H2 行盒间隔 44 px，标题到正文只隔 18 px | h2/h3/h4 显式 1.35 / 1.4 / 1.45，与 h1 成一套 |
| U6 | `.editor-placeholder` 16 px / `Segoe UI` / 行盒 21 px / `padding: 0 2px`；正文首行 17 px / 宋体 / 行盒 33.15 px → 键入第一个字时换字族、基线跳 ≈6 px、横移 2 px | 占位符继承正文的字族/字号/行高/内边距 |
| U7 | `.stats-trigger` 高 **16 px**（`[12,879,117,16]`），低于 WCAG 2.2 的 24×24；按钮已有 `aria-haspopup`/`aria-expanded`/`aria-controls`，**没有 `aria-label`** | 高 ≥24 px，加 `aria-label="字数明细"` |
| U9 | 工具栏同一排三种高度：插入 25 / H1–S 与视图 24 / `</>` **21**；`</>` 字号 **11 px**、y 低 1 px | 全部 24 px、`</>` 字号 12 px、基线齐 |

### 改动文件 / 函数

只改 `src/styles.css`（5 处）+ `src/components/StatusBar.tsx`（1 个属性）+ `docs/CHANGELOG.md`（T1 段里一行）。

1. `.doc-body h4` **新增一条规则**，放在 `.doc-body h3`（`styles.css:598-602`）之后：
   ```css
   .doc-body h4 {
     font-size: 1.08em;
     line-height: 1.45;
     font-weight: 600;
     margin: 1.15em 0 0.45em;
   }
   ```
2. `.doc-body h2`（`:592-596`）补 `line-height: 1.35;`、`.doc-body h3`（`:598-602`）补 `line-height: 1.4;`（**外边距一个都不动**，避免整页变矮后要重排别的断言）。
3. `.editor-placeholder`（`:280-289`）：`padding: 0 2px` → **`padding: 0`**，并补 `font-family: var(--font-read); font-size: var(--editor-size, 17px); line-height: 1.95;`（不要写 `font: inherit`——它继承的是 `.doc-column` 的 UI 字体 16 px，正是现在的错）。
4. `.toolbar button`（`:1315-1319`）补 `height: 24px; display: inline-flex; align-items: center; justify-content: center;`；`.toolbar button.mono`（`:1335-1338`）的 `font-size: 11px` → **`12px`**（保留等宽字族）。
5. `.stats-trigger`（`:1589-1597`）补 `display: inline-flex; align-items: center; min-height: 24px;`；`src/components/StatusBar.tsx:41-51` 的 `<button className="stats-trigger">` 加 `aria-label="字数明细"`（**不要**重复加 `aria-haspopup`/`aria-expanded`/`aria-controls`，已经有）。

**不要**动 `.doc-body table` 的字族/字号（U3 本轮顺延，见 §5）、`--mark-bg`、Mermaid 配色、查找条/表格条的既有 `min-height: 24px`（第 49 轮刚做过）、`.dialog-actions`（U5 属下一轮，见 §5）。

### 实施步骤

1. 写 `.tmp/e2e-r50-impl-t3.mjs`（CDP 9222，`.tmp/reset.mjs 9222` 先跑）：假工作区播种一篇含 `# / ## （折两行）/ ### / #### / **粗体** / 段落` 的文档（`.tmp/r30-fsa.mjs`），**1440×900 量全套**：
   - 计算样式：h1–h4、strong、p 的 `fontSize` / `fontWeight` / `lineHeight` / `fontFamily`；
   - 两行 H2 的两个行盒 y 与下一段 y；
   - 空稿占位符 rect / 计算样式（`fontFamily` / `fontSize` / `lineHeight` / `paddingLeft`）与**文字起点 x**（`Range` 取占位符文本节点首字符的 `getBoundingClientRect().x`），键入一个字后首段 rect / 计算样式与文字起点（同一页两次量，中间停 250 ms，避免 AGENTS §8 的载入期假阴）；
   - `.toolbar button` 全部 rect 高与 `font-size`、`.toolbar` `scrollWidth/clientWidth`、`.status-bar` 高度；
   - `.stats-trigger` 高度 + `aria-label`。
   再切到 **1024×700 只量三条**（不重复全套，省时间）：`documentElement.scrollWidth <= clientWidth + 1`、`.toolbar` 不换行、`.stats-trigger` 高度仍 ≥24。
2. 改 CSS（5 处），重跑脚本，按下面验收逐条核对，把改前/改后并列写进 `impl.md`。
3. 截图 3 张（见下）。时间紧就砍到 2 张（`impl-t3-hierarchy.png`、`impl-t3-toolbar.png`），数值仍要写进 `impl.md`。
4. CHANGELOG 加一行；顺手确认预览面板也跟着变（`.preview-column` 也用 `.doc-body`，同一批规则生效，不用改代码）。

### 验收标准（E2E 断言，脚本原样打印数值）

- U1：`h4` 与 `strong` 的 `fontSize`、`fontWeight` **不再逐项相等**；`h4` 字号 ≥ 18 px 且 `fontWeight` 600；`strong` 仍是 700、17 px。
- U2：`h2` 行高比 ≈ 1.35、`h3` ≈ 1.4、`h4` ≈ 1.45、`h1` 仍 1.35（容差 ±0.03）；两行 H2 的行盒间隔 **≤ 32 px**（改前 44，字号 22.44）。**不要**断言「标题到正文的留白 > 标题内部行距」——按本任务只改行高的范围它不必然成立（留白 ≈18 px + 半个压缩量），写成卡线会得到假红；把两行行盒与下一段 y 三个数照实打印，写进 `impl.md` 即可。
- U6：占位符与首段的 `fontFamily` 相同、`fontSize` 相同（17）、行盒高相同（33.15 ±0.5）、`rect.y` 差 ≤ 0.5 px；**横向（R50-9）用 `getComputedStyle('.editor-placeholder').paddingLeft === '0px'` 作门槛**。**`rect.x` 不再是断言、只打印**：`findings-ui.md:108-109` 实测两元素 rect.x 改前就都是 **397**、rect.y 都是 **136**，那 2 px 是 `.editor-placeholder { padding: 0 2px }`（`src/styles.css:285`）造成的**文字**起点差，不是元素 rect 差——所以「`rect.x` 差 ≤0.5 px」改前就满足、padding 改与不改都绿，它测不到 U6 本轮要修的横向那一半。另并列打印「占位符文字起点 x」与「键入后首段文字起点 x」（`Range`），改前应为 ≈2 px、改后 ≈0，**只打印不作门槛**（Range 对行盒边缘取整敏感，别写成卡线）。
- U7：`.stats-trigger` rect 高 **≥ 24**、`aria-label === '字数明细'`；`.status-bar` 高度变化 ≤ 2 px（改前 28）。
- U9：所有 `.toolbar button` 的 rect 高在 **23.5–24.5**（改前 21 / 24 / 25 三种）、`</>` 按钮 `font-size === '12px'`、`.toolbar` `scrollWidth <= clientWidth + 1`（不换行）。
- 1440 档页面级不横向滚动；1024 档同样（`documentElement.scrollWidth <= clientWidth + 1`）、工具栏不换行、`.stats-trigger` 仍 ≥24。
- `npx tsc --noEmit` exit 0；`npm test` `fail 0`（CSS 不新增测试）；`npm run verify` PASS，首屏 ≤ 310,000 B（CSS 增量预计 +100…+200 B gzip）。

### 风险与回退

- `h4` 的 `margin` 若照 findings 的建议压到 1.2em，整页会变矮、可能让既有「标题到正文」的目测断言漂移；本轮只加字号/行高，外边距按上面给的一套写死。
- **U3（表格字族）本轮不做**：别顺手改 `.doc-body table`（`styles.css:756-762`）——它不在本任务的验收里，改了不会被断言覆盖；下一轮按 §5 第 1 项补（2 行 CSS + 表格 2× 抽样截图）。
- `.toolbar button` 设 `height: 24px` 后，`插入 ▾` 的文字可能被上下裁 1 px；验收里的 rect 高度与 2× 截图就是这条的护栏。不要改用 `padding` 撑高（高度会回到 25/26，U9 无解）。
- 占位符改字号后，空稿的「从这一句开始写」会大一号；这是期望（与正文同一条排版链）。
- 回退：`git checkout -- src/styles.css src/components/StatusBar.tsx`。

### 截图

`shots/round-50/impl-t3-hierarchy.png`（h1–h4 + 粗体 + 两行 H2 同屏）、`impl-t3-placeholder.png`（空稿占位符与键入后首行，可用两张拼一张也可分开）、`impl-t3-toolbar.png`（工具栏 2× 放大取样）。全部 `impl-t3-` 前缀。

---

## 5. 本轮不做（顺延清单与理由，下一轮开工按此排序）

1. **ui U5（P2，用户可见）设置面板 sticky 页脚把最后一段帮助文字切成两半**（`findings-ui.md` U5：`.dialog-actions` 823–859 盖住帮助文字 848–859，第二行被底边 880 截断）：修法有两种（`.dialog` 改 flex 列、内容区单独滚动；或给底部留 56 px 安全区），都会动到设置/快捷键/字数明细**三个对话框的共用壳**，要回归四组矩阵（1440 / 1024 / 滚动后 / Esc）。→ **下一轮 UI 第一项**。同轮补本轮为 T2 加测让出的 **ui U3（P2）表格字族**：`.doc-body table`（`styles.css:756-762`）`font-family: var(--font-ui)` → `var(--font-read)`、`font-size: 0.86em` → `0.94em`（约 2 分钟 + 一张表格 2× 截图；验收：`td` 与正文 `p` 同族、字号 15.5–16.5 px，改前 14.62）。
2. **ui U4（P2）编辑/预览/源码三态正文位置不一致**（左缘 397 / 536 / 376，宽 576 / 576 / 896）：要动 `.doc-layout` 网格与 `.preview-layout`，与 48-F2（≤1119 px 正文反而变宽 311 px）同源，一起做；单开一轮。
3. **code F1（P2）每次保存先整篇读回旧文件 + 工作区文档没有「没有改动」守卫**（`App.tsx:2741` 无条件读、`:2932` 只有宿主目标有守卫）：改法 b（用 `rawTextRef` 当回滚源）改变「外部改过该文件时回滚会写回谁」的语义，改法 a 会让 `Ctrl+S` 不再刷新 mtime（有人靠 mtime 判断已保存）。**先定语义再动手**，下一轮与 code F4（一次停笔 4 份全文）合并成性能/保存批次。
4. **code F2（P2）源码视图逐键 1 条 longtask/键**（1.84 MB 源码 p95 59.2 ms、longtask 81–91 ms/键）：第 49 轮 F1 的同一处方（`countText` memo + 与编辑态同拍 180 ms 防抖），约 20 行；下一轮性能批次第一项。
5. **code F4 / F5**：一次停笔 4 份全文（草稿计时 800 ms → 2500 ms、有目录可写时跳过 `persistDocKey`）；`src/lib/codeScan.test.ts`（40–60 行纯函数单测，覆盖 `mapOutsideCode` 的 6 类输入）。F5 很小，可并入下一轮任一任务的尾巴。
6. **ship S2/S3/S4**：同一版本三套发布字节（`release/` 里的旧包 + tag 落后 39 commit）、`host\bin\www` 陈旧没有门禁、`packaging/verify-portable.mjs` 停在第 2 轮且会覆盖历史截图。都要动打包脚本并真跑一次 `host\build.ps1` / `portable.ps1`（本轮不碰 `release/`、不跑打包），**单开一轮发布/打包批次**。ship S1 已在 T1 §步骤 5 顺手改掉。
7. **typora T1（P1）单文件（无工作区）插图把图片 base64 内联进正文**：改法要在「取消插入 / 插入不内联（占位） / 宿主 `/__asset`」三选一里定产品行为，按 AGENTS §1 属于「加或砍一个用户看得见的能力」，要先问产品负责人；宿主 `/__asset` 本身也在 STATE 待办池第 ⑥ 项。
8. **typora T3（P1）frontmatter 在编辑视图完全不可见**：复用第 48 轮计划的只读对话框壳（`ShortcutsDialog` 样式），+1.0…1.5 KB gzip，还要过「载入即 dirty=false」与专注模式布局；**单开一轮**（第 48 轮 F4 至今顺延）。
9. **typora T4（P1）全屏与整页缩放缺失**：先决条件是 `src/App.tsx:3819` 的字号分支要先加 `!event.shiftKey`（否则 `Ctrl+Shift+=` 被字号吃掉），再加 `--ui-scale` 与 `requestFullscreen`；WebView2 下 `F11` 是否到达页面 UNVERIFIED。单开一轮。
10. **typora T2（P1）源码模式无行号/无「行:列」**：最小档（状态栏「第 N 行 · 共 M 行」）+300 B，可与 T4 或 U4 合轮。
11. **typora T5/T6/T7**：图片落盘规则可配（属产品选项，要产品负责人点头）；代码块语言标签 + 复制（NodeView，+900…+1200 B，要回归围栏字节）；`==高亮==`（输入规则 + 序列化，必须先跑 roundtrip）。
12. **typora T8（P2，文档）`docs/iteration/typora-features.md` 现状列过期 + `docs/typora-gap.md` 缺 4 行、计数 32/9 → 32/13**：纯文档但要把 features 的 4 行 + §5.1/§6 + gap 表 4 行 + 两个标题数字 + `AGENTS.md:74` 一起改完再数一遍行数；与 ship 批次同轮做。
13. **ui 其余复核项**：U8（批注卡按钮 22 px）、U10（批注卡被滚动容器硬切）、U11（≥1120 px 页边栏不能收起）、49-N2（Mermaid 默认配色 1.15:1 / 1.01:1）、47-F2/F3/F10、48-F2/F3/F5。U8 是 1 行 CSS + 批注 E2E 回归，可并入下一轮 UI 批次。
14. **本轮明确不做**：不发版、不 bump `package.json`、不新增运行时依赖、不动 `release/`、不跑打包脚本、不 commit/push（tester 验收 PASS 后由 tester 提交）、不重启 dev server、不改 `host/` 与 `host-mac/`。

## 6. 公共交付物与纪律

- 执行者写 `docs/iteration/round-50/impl.md`：任务状态表、每条的改前/改后读数、计划偏差（有就写）、UNVERIFIED。**不要**改 `docs/iteration/STATE.md`（根代理更新），**不要**改其它轮次目录，**不要**改本轮五份 `findings-*.md`（它们是 finder 的证据，读数错也在 `impl.md` 里纠正，不回写）。
- 截图一律 `shots/round-50/impl-*.png`；**不要**覆盖 finder 已有的 `bug-*`、`code-*`、`r50-ui-*`、`ship-*`、`01-*…10-*` 截图。
- 自写 E2E 放 `.tmp/e2e-r50-impl-*.mjs`，连接方式抄 `scripts/acceptance.mjs` 的 `chromium.connectOverCDP('http://127.0.0.1:9222')`；结尾 `page.close()` 后 `process.exit(0)`。脚本含中文用 `write`/`edit` 工具写，**不要**用 PowerShell 字符串替换（AGENTS §8 会读成 ANSI 变乱码）。
- 每段 E2E 前 `node .tmp/reset.mjs 9222`；控制台 0 error 写进 `impl.md`（浏览器态 `/__doc` 的 404 是既有探测，判非缺陷）。
- **测试计数只信 `npm test` 输出**：`README.md:133/171`、`AGENTS.md:39/72` 四处（R50-3）在门禁跑完后按实际文件数与条数回填，不要把预计的 33/432 先写进去；本轮不改 `docs/iteration/STATE.md`（根代理更新）。
- 角色文件口径（R50-6，已由本修订顺手改掉）：`.tmp/iteration/roles/planner.md:28` 的旧硬门 286,000 B 已改成内部 **310,000** / 硬线 **320,000** B，与 `common.md:6`、`STATE.md:50` 对齐；下一轮 planner 不必再解释 §1 的体积口径，可直接删掉那段说明（`.tmp` 不进版本控制，本轮执行者不用再改它）。
- `npm run roundtrip` **本轮不强制**（T1/T2/T3 都没有改 Markdown 序列化）；时间富余就跑一次（预期 `rich 5/7`、`source 7/7`、报告无 diff）。
- 若页面白屏且控制台报「模块没有导出」：记录现象并报根代理，**本轮约束是不重启 dev server**。

## 7. 时间预算与砍任务顺序

| 项 | 分钟 |
| :--- | ---: |
| T1（`renderFootnotes` 重写 + 4 条单测 + 导出差异门与可关闭提示 + E2E） | **12**（R50-10：原 10 装不下） |
| T2（改前/改后两轮测量 + 纯函数 + 分组改写 + 撤销/负例/批注断言） | 16 |
| T3（5 处 CSS + 1 个属性 + 计算样式 E2E + 3 张截图；U3 已顺延） | 3（**余量切片，可整项砍**） |
| 门禁（tsc / test / verify，含回填四处文档计数）与 `impl.md` | 6 |
| **合计** | **34 核心 + 3 余量 = 37 名义** |

- **35 min 硬上限（`roles/planner.md:25`）怎么守（R50-10）**：核心 = **34 min**（`12 + 16 + 6`），留 1 min；**T3 的 3 min 是唯一余量切片**，不是承诺。原表（T1 10 + T2 16 + T3 3 + 门禁 6 = 35）是零余量，T1 上调后只能让 T3 让位。
- **T1 与 T2 不许砍**（P1）。**T3 只在两项合计 ≤25 min 跑完时才做**（25 + 3 + 6 = 34 ≤ 35，留 1 min 余量）；按名义估算 T1+T2 = 28 min，所以默认预期是 **T3 顺延**——那就整项移入 §5，**砍掉不算未完成**，`impl.md` 照抄 §5 那条并写「T3 因预算顺延」。时间只够做一部分时，按 **U9（工具栏三处高度，3 行 CSS）→ U2（h2/h3 行高）→ U7（1 行 CSS + `aria-label`）** 的顺序砍，U1/U6 最后砍；T3 截图本来就允许砍到 2 张（`impl-t3-hierarchy` / `impl-t3-toolbar`）。
- T2 若超时：先砍**批注那条**（退到静态检查 `setAnnotations([])` 与 UNVERIFIED），**不许**砍 1 MB 档、`Ctrl+Z` 与跨节点/`strong` 三条断言——它们是这次改动唯一可能写错正文的两处防线（退回路径与行内格式）。
- T1 的 E2E 别只测预览：HTML 导出的 `<li>` 与 Markdown 导出的提示各是 F1/F2 的判据，必须跑；`h-two`（负例）与 `fn-end`（对照）不能省；导出提示的「不含 `保存后`」与「`知道了` 可关」是 R50-5 的判据，也不能省。
- T2 的 1 MB 档改前一次约 60 s（改后应降到秒级），**不要**因为慢就只跑 100 KB：1 MB 才是门槛文档；改前那次加 `--no-undo`，别让撤销再吃掉约 50 s。
- **28 min 是核心检查点（R50-10）**：T1/T2 还没绿就立刻停手——把已完成的部分跑完门禁、写 `impl.md`（写清卡在哪一步、读数多少），**T3 整项移入 §5、不算未完成**；按名义估算 T1+T2 就要 28 min，所以默认预期 T3 顺延（只有两项合计 ≤25 min 才装得下）。未完成的项按上一轮承诺顺序写进 §5 同等清单，**不要**把没验证的写成 PASS。

## 8. 本轮预计 UNVERIFIED（写进 `impl.md` / tester 报告）

- 真实宿主 WebView2 里的预览/HTML 导出脚注（本轮全在浏览器态）；真实磁盘与网络盘上「全部替换」的 UI 响应（本轮 dev server + localStorage 文档）。
- T2 的 1 MB 门槛在**生产构建**（`npm run build` + 静态服务）下的读数：第 48 轮实测口径是 dev + StrictMode，生产只会更快，但不作断言。
- 真实中文输入法下的占位符出现/消失（U6 的「键入跳一下」只在无 IME 的 `fill`/`keyboard.type` 下测）。
- 真实系统 150% / 200% 缩放下的工具栏 24 px 与状态栏点击区（本轮只量 1440 / 1024 与 CDP 1.25 模拟的画面对照）。
- 打印 / PDF 输出下的 h4 与标题行高（第 49/50 轮都没覆盖打印面；表格字族 U3 本轮顺延，不在本轮范围）。
- T2 若落在 2,000–4,000 ms：清掉查找装饰后的对照读数与「①② 各占多少」的归因只在这一条路径上量过一次，不作跨档断言；取插件必须按 `spec.key?.key?.startsWith('sidelightFind')` 并先断言非空（R50-11），拿不到插件就整条记 UNVERIFIED，**不许**写「装饰不是瓶颈」。
- U6 的横向对齐只以 `paddingLeft === '0px'` 为门槛；`Range` 取的「文字起点 x」只作旁证打印（取整敏感，不作跨档断言）。
