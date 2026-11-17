# 第 48 轮 · 计划（planner，只读）

- **修订：rev-2（第 2 次修订，2026-11-17）** —— 回应 `plan-review.md` 复审 rev-1 的 4 条新 REVISE：**P1-1（新）**「插入 → 公式块」是**块**节点（`group:"block"`），rev-1 把它和图片/行内公式/链接一起写成「都是行内节点、不要套守卫」判错了，单元格里点一下就无声把 `$$` 拼进盘；**P2-2（新）** 单元格里手打 `# ` / `> ` / `- ` 经输入规则**确实**造出 `<h1>`/`<blockquote>`/`<ul>`（rev-1 写「未实测」）；**P2-3（新）** T2 的静态钉 `sourceText === sourceBaselineRef.current` 实测 **3** 处不是 1 处；**P2-4（新）** T4 的 STATE:55 落点漏了同一句里的 `第 30–47 轮` 与 `第 47 轮 \`npm run verify\`` 两个轮次标签。任务结构不变：**T1 14→17 min**（加公式块守卫 + 2 条读数）、**T2 11→10 min**（`乙.md` 折成同一脚本的尾巴）、**T4 4 min 不动**、门禁与收尾 6→4 min（`verify` 内含 `build`，不再单跑 build），合计仍 **35 min**；**T3 仍砍**。逐条对照见 §七 rev-2 表。rev-2 只改本文件：未改产品代码、未连 CDP、未跑 `npm test`/`build`，新读数都用 `read`/ripgrep/`Select-String` 实测（T1 第 4 条、T2 静态钉、T4 两个标签）。
- **修订：rev-1（第 1 次修订，2026-11-17）** —— 回应 `plan-review.md` 的 4 条 REVISE：**P1-1**（T1 只封键盘入口，工具条 H1/H2 与「插入」菜单 5 条块级命令仍可达）、**P2-2**（T4 落点不全 + 测试计数与新增两个测试文件自相矛盾）、**P2-3**（T4 体积数字按旧 bundle 写会写错）、**P2-4**（T2 缺 `skipReparse` 断言）。任务结构不变，**砍掉 T3**（预算超 35 min，见 §〇 末段）。逐条对照见 §七。
- 轮次：`round=48`、`nn=48`；轮前 `startSha=5673b1dee5623cc72fe87b37d563c1d7444224ff`（实测 `git rev-parse HEAD` 同值，`git status --porcelain` 只有 `?? docs/iteration/round-48/`、`?? shots/round-48/`）。
- 输入：本轮 5 份 findings（`findings-bug.md`、`findings-typora.md`、`findings-ship.md`、`findings-code.md`、`findings-ui.md`）与 `plan-review.md` 全部读完；`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`（第 4/8 节）、`docs/typora-gap.md`、`git log -8`、相关源码。
- 只读：本文件之外没有改产品代码、没有跑应用内 E2E、没有 commit、没有 push、没有碰 `release/`；只新增了一个 Node 探针 `.tmp/planner48-probe.mjs`（`.tmp/` 不进版本控制），结论见 §二。**rev-1 / rev-2 都只改本文件**（未连 CDP、未跑 `npm test`/`build`，所有「改前读数」用 `read`/`Select-String` 实测，见 §一/§五）。
- 环境：dev server `http://localhost:5175`（**不另起、不重启**；5173 是僵尸 server，禁用）；浏览器只用 **CDP 9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`；脚本结尾 `page.close()` + `process.exit(0)`。
- **不发版**：`package.json` 版本 0.32.1 不动；CHANGELOG 只写 `## Unreleased`；不改 `release/`。
- 交付物：`docs/iteration/round-48/plan.md`（本文件）→ `impl.md` → `test.md`；截图写 `shots/round-48/impl-*.png`，**不覆盖** finder 已生成的 `bug-*`/`r48-*`/`code-*`/`ship-*`/`r48-ui-*`。
- 行号口径：本文件的 `文件:行号` 只作阅读辅助，**执行一律按符号搜**（`read`/ripgrep 口径；不要用 `Get-Content` 校行号，也不要读中文）。

## 〇、结论：本轮 3 个任务（T3 砍单）

| id | 标题 | 级别 | 类别 | 回应 | 估时 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 表格内块级越界：键盘两处 + **鼠标七处**（工具条 H1/H2、插入菜单 5 条块级命令）+ **公式块两入口**（菜单「公式块」/ `Ctrl+Shift+M`） | **P1** | 数据安全 + 用户可见 | bug F1、bug F2、**plan-review P1-1（rev-1）**、**plan-review P1-1（新，rev-2）** | 17 min |
| **T2** | 源码改字保存后回编辑不再假脏（第 47 轮遗留 P1，本轮复核仍在；补「未改字进出源码」反向断言） | **P1** | 数据安全（误报 + 空写盘） | bug §复核 1、STATE「第 47 轮下一轮优先 ①」、**plan-review P2-4** | 10 min |
| **T4** | 对外文档九处数字订正：测试计数取当次 `npm test`，首屏/主 chunk 按当次 build **派生**，STATE:55 的两个轮次标签一起改 | P2 | 发布体验 / 文档 | ship F1、ship F3、ship F4、**plan-review P2-2 / P2-3（rev-1）**、**P2-4（新，rev-2）** | 4 min |

**任务合计 31 min + 门禁与收尾 4 min = 35 min**（planner 上限 35 min，顶格）。排序按 `roles/planner.md`：数据安全 → 用户可见收益 → 安装/体积/性能 → 内部质量。

**rev-2 的账**：rev-1 是 29 + 6 = 35；P1-1（新）的公式块守卫 +2 条 E2E 读数给 T1 **+3**（14→17），另两条（P2-3 静态钉、P2-4 两个标签）是零成本改法。为守住 35 min 顶格：T2 **−1**（`乙.md` 从「第二篇独立流程」折成同一脚本末尾 4 个动作，不另开篇目与等待；T2 的熔断本来就定在 10 min）、门禁与收尾 **6→4**（`npm run verify` 的脚本定义就是 `npm run build && node scripts/measure-first-screen.mjs`，收尾只跑 `npm test` → `npm run roundtrip` → `npm run verify`，不再单跑 `npm run build`；`impl.md`/CHANGELOG 在各任务末顺手写、不单独计时）。**T3 仍砍**（ui F4 占位符字体/字号/行高，3 min，见 §二，下轮**第二项**；第一项是 P2-2 的表格内块级守卫）。

**为什么不排 code F1（「全部替换」1 MB 冻结 52 s）**：本轮做了 Node 对照探针，**findings-code 的根因与收益推导不成立**（见 §二里 code F1 那一行），按「不许拿没验证的根因排任务」不排，下轮先做浏览器侧分段剖析。这不是降级成 P3，是**执行前必须补证据**。

## 一、逐任务

### T1（P1，数据安全）表格内块级越界：键盘两处 + 鼠标七处 + 公式块两入口

**现状（有证据）**

1. `Ctrl+Shift+L` 一键两个动作：光标在第 2 行第 2 格时按一次，表格 `rowCount 3→2`（整行 `一 二 三` 没了）**且** `sidebar.collapsed:false→true`；`Ctrl+Z` 能撤行、侧栏不自动展开（bug F1，`.tmp/r48-a.log` 的 `## a1-table-ctrl-shift-l`，截图 `shots/round-48/bug-a-ctrl-shift-l.png`）。对照 `Ctrl+L` 只删行（`## a2-table-ctrl-l`）。
   根因两处都实测：编辑器层 `handleKeyDown` 的表格删除分支（`src/App.tsx` 的 `if (inTable && mod && event.key.toLowerCase() === 'l')`，read 报 `:836-840`）没看 `Shift`；window 的 `keydown` 监听里侧栏开关（`if (mod && event.shiftKey && !event.altKey && key === 'l')`，read 报 `:3785-3789`）照样执行——`preventDefault()` 只挡浏览器默认动作，不挡冒泡。
2. `Ctrl+1–6` 在单元格里造标题：编辑态 `cellHtml:"<h2>一</h2>"`，`Ctrl+S` 把 `| ## 一 | 二 |` 写进单元格，**没有保存前确认**；用保存字节重开后标题消失、显示字面 `## 一`（bug F2，`.tmp/r48-h.log` 的 `## h1-cell-heading`，截图 `shots/round-48/bug-h-cell-heading-editor.png` / `-reopened.png`）。
   根因：window 的标题分支（`if (mod && !event.altKey && !event.shiftKey && /^[1-6]$/.test(key))`，read 报 `:3756-3760`）不判「选区是否在表格里」；Markdown 表格单元格只能装行内内容，块级标题存不进去。
3. **鼠标入口是同一条命令（plan-review P1-1，rev-1 新增）**：`run()`（`src/App.tsx:3889-3896`，read 实测只判 `!editor || viewMode !== 'edit'`）同时接 **7 条块级命令**——工具条 H1（`:4771`）、H2（`:4781`），「插入」菜单的表格（`:4709`）、代码块（`:4712`）、引用（`:4715`）、任务列表（`:4718`）、分割线（`:4721`）。单元格里点工具条 H1 与按 `Ctrl+2` 走**同一条 `toggleHeading` 命令**（`.tmp/r48-h.log` 的 `cellHtml:"<h2>一</h2>"` 是键盘那次的实测），存盘同样变字面 `## `。**只封键盘入口，impl 会写「已修」而数据完整性路径仍可达。**
   负结果（别重复报）：图片 / **行内**公式 / 链接三个菜单项（`:4737` 的 `openMathAtCursorRef.current(false)`、`:4755` 的 `openLinkAtCursorRef.current()`，图片项同段 `:4724-4735`）都是行内节点或行内能力，单元格里能往返——**这三个不要套守卫**；工具条的 B/I/S/行内代码（`:4790`/`:4795`/`:4798`/`:4801`）同理；表格工具条 7 条（`:4899-4918`）只在表格里出现，**不要套守卫**（它们就是表格操作）。**但同一段里的「公式块」是块节点，见第 4 条——rev-1 判错，rev-2 改正。**
4. **「插入 → 公式块」与 `Ctrl+Shift+M` 是块节点（plan-review P1-1 新，rev-2 新增）**：`blockMath` 是 `group:"block"`（`node_modules/@tiptap/extension-mathematics/dist/index.js:25-26`，rev-2 实测；`inlineMath` 才是 `group:"inline"`，`:205-206`），`renderMarkdown` 输出三行 `$$…$$`（`:87-93`）。两个入口走**同一个函数**：菜单「公式块」（`src/App.tsx:4746` 的 `openMathAtCursorRef.current(true)`，rev-2 实测）与 `Ctrl+Shift+M`（`:3742-3749` → `:3748` 的 `openMathAtCursorRef.current(event.shiftKey)`；`ShortcutsDialog.tsx:34` 对外写「编辑或插入块级公式」）；真正插节点在 `:4315` 的 `insertContent({ type: block ? 'blockMath' : 'inlineMath' … })`。实测（critic 探针 `.tmp/critic48-probe.mjs` 的 `## a-blockmath-menu-nonempty`，CDP 9222 + 假工作区，截图 `shots/round-48/critic-blockmath-cell.png`）：点进单元格 →「插入 → 公式块」→ 单元格 `<p>一</p><div … data-type="block-math">`、`blockMathInCell:1`、`dirty:true`、**无弹层**（`.math-inline-input` 0）、无提示、`errors:[]`；`Ctrl+S` 盘上 `| 一<br>$$<br><br>$$ | 二   |`（空单元格种子同样写成 `| $$<br><br>$$ | 二 |`）。与已实测的 `Ctrl+2` **同一类结构丢失，而且更隐蔽**。**这一处 4 行守卫同时盖住两个入口**（改动清单第 5 步），比给菜单单独加一条便宜。

**改动文件/函数**

- 新建 `src/lib/tableScope.ts`（纯函数、无 DOM、无 PM 依赖）：
  ```ts
  export const TABLE_SCOPE_NAMES = ['table', 'tableRow', 'tableCell', 'tableHeader'] as const
  /** 从内到外的祖先节点名里有没有表格节点（深度 1 是文档根，不含） */
  export function inTableAncestry(names: readonly string[]): boolean
  ```
  单测 `src/lib/tableScope.test.ts`：`['tableCell','tableRow','table','doc']` → true；`['paragraph','listItem','doc']` → false；只给 `['tableCell']` → true；空数组 → false。加进 `package.json` 的 `test` 链（现 30 个文件 → **31**）。
- `src/App.tsx` 六处接线（第 7 条是禁令）：
  1. `editorProps.handleKeyDown` 开头现在的 `inTable` 深度循环（read 报 `:822-829`）改成先收集 `const names: string[] = []`（`$from.depth` 递减，`node(depth).type.name`）再 `const inTable = inTableAncestry(names)`。
  2. 同一个 handler 里表格删行分支（`:836`）补 `&& !event.shiftKey && !event.altKey`（与快捷键一览的「`Ctrl+L` 删行」对齐）。**不要** `stopPropagation`：`Ctrl+Shift+L` 必须继续冒泡到 window 才能收侧栏，只是不再删行。
  3. **新增两个 useCallback，放在 window `keydown` effect（`:3591`）之前**（`editor`、`show`（`:393`）、`setMenuOpen` 都已在作用域内）：
     ```ts
     /** 选区祖先里有没有表格节点（与 handleKeyDown 同一份判据） */
     const selectionInTable = useCallback(() => {
       const $from = editor?.state.selection.$from
       if (!$from) return false
       const names: string[] = []
       for (let depth = $from.depth; depth > 0; depth -= 1) names.push($from.node(depth).type.name)
       return inTableAncestry(names)
     }, [editor])

     /** 命中表格就提示并返回 true（调用方 return，不执行命令） */
     const guardBlockInTable = useCallback(() => {
       if (!selectionInTable()) return false
       setMenuOpen(false)
       show('表格单元格里不能用命令插入标题或块级内容：Markdown 表格只装行内内容')
       return true
     }, [selectionInTable, show])
     ```
     并把 `guardBlockInTable` 加进 window effect 的 deps（`:3813-3834`；`show` 已在里面）。**文案按 plan-review P2-2(b) 收成「不能用命令插入」**——手打 `# ` / `> ` / `- ` 仍会经输入规则造块节点（本轮不修，读数见 §二与 §五 UNVERIFIED），守卫不能声称它盖住了所有路径。
  4. window `onKeyDown` 的标题分支（`:3756-3760`）在 `if (viewMode !== 'edit') return` **之后**插 `if (guardBlockInTable()) return`（`event.preventDefault()` 保留，别让浏览器解释 `Ctrl+2`）。段落分支 `Ctrl+0`（`:3762`）**不改**（`setParagraph` 在单元格里是修复而不是破坏，且它是幂等的）。
  5. **公式块守卫（rev-2，plan-review P1-1 新）**：`openMathAtCursorRef.current` 的 effect（`:4295-4325`）在 `if (viewMode !== 'edit') return`（`:4299`）**之后**、`const coords = editor.view.coordsAtPos(from)`（`:4307`）**之前**插 4 行：
     ```ts
     // 块级公式（$$…$$）是块节点，Markdown 表格单元格装不进去：插入前就拦（第 48 轮）
     if (block && selectionInTable()) {
       show('表格单元格里不能放块级公式：Markdown 表格只装行内内容')
       return
     }
     ```
     该 effect 的 deps（`:4325`）由 `[editor, viewMode]` 改成 `[editor, viewMode, selectionInTable, show]`。**这一处同时盖住「插入 → 公式块」（`:4746`）与 `Ctrl+Shift+M`（`:3748`）**，不要再给菜单项单独加守卫。`selectionInTable` 定义在第 3 步、位置在 `:3591` 之前，此 effect 在它之后，作用域没问题。
  6. 鼠标 7 处一律改成 `onClick={() => { if (!guardBlockInTable()) run((chain) => …) }}`（保持 `run()` 的其他调用点不动，包括表格工具条）：工具条 H1（`:4771`）、H2（`:4781`）+ 插入菜单表格/代码块/引用/任务列表/分割线（`:4709`/`:4712`/`:4715`/`:4718`/`:4721`）。
  7. 别动 `Ctrl+Shift+1`/`Ctrl+Shift+3`/`Ctrl+Shift+P`/`Ctrl+Shift+L` 的 window 分支；别改 `run()` 本身。

**实施步骤**：先写 `tableScope.ts` + 单测并加进 `test` 链 → **先接第 5 步（公式块 4 行，最便宜的 P1）** → 再接 1–4 与 6 → `npm test` → E2E → 截图。

**验收（可执行）**

E2E `.tmp/e2e-r48-t1.mjs`（CDP 9222，先 `node .tmp/reset.mjs 9222`；假工作区用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace`，参照第 47/48 轮脚本）播种两篇：
- `表.md`：标题 + 3 行 3 列表格（表头 `甲/乙/丙`，第 2 行 `一/二/三`，第 3 行 `四/五/六`）；
- `嵌套.md`：`# 嵌套` + 2×2 表格（第 2 行 `一 / 二`）+ 表格外一段正文。

断言（每条打印读数）：
1. 打开 `表.md` → 点进第 2 行第 2 格 → 读 `{rowCount:3, dirty:false, sidebar:false}` → `Ctrl+Shift+L` → **`rowCount:3` 不变**、`dirty:false`（盘上种子逐字节相同）、`sidebar:true`；再按一次 → `sidebar:false`、`rowCount:3`。（改前：`rowCount:2` + `sidebar:true`）
2. 同一位置按 `Ctrl+L` → `rowCount:2`（正对照，删行仍可用）；`Ctrl+Z` → `rowCount:3`。
3. 打开 `嵌套.md` → 点进 `一` → `Ctrl+2` → `headingInCell:0`、`.toast-text` 文案含「表格」；`Ctrl+S` → 盘上**不含 `## 一`**、`diskSame:true`（与种子逐字节相同）、`dirty:false`；用保存字节重开 → `cells:["甲","乙","一","二"]`。
4. **鼠标入口·工具条（P1-1）**：同一篇点进 `一`（停 200–250 ms）→ 点工具条 H1（`.toolbar` 内 `getByRole('button', { name: 'H1' })`）→ 停 200 ms → `{headingInCell:0, cellHtml:'<p>一</p>'}`、`.toast-text` 含「表格」→ `Ctrl+S` → 盘上该行无 `# ` 前缀、`diskSame:true` → 重开 `cells:["甲","乙","一","二"]`。
5. **鼠标入口·插入菜单（P1-1）**：点进 `一` → 点「插入 ▾」（`.menu-trigger`）→ 点「代码块」（`.menu` 内）→ 停 200 ms → `pre:0`、`.toast-text` 含「表格」、`dirty:false`。**本轮若降到 UNVERIFIED，impl 必须逐条写清 5 条命令名，不许写「已修」。**
6. **公式块两个入口（P1-1 新，rev-2 必测）**：同一篇点进 `一`（停 200–250 ms）→ 点「插入 ▾」→ 点**「公式块」**（菜单里「公式」与「公式块」是相邻两个按钮，点后者）→ 停 700 ms → 读 `{blockMathInCell:0, cellHtml:'<p>一</p>', mathPopups:0, toast:含「块级公式」且含「表格」, dirty:false, errors:[]}`（`mathPopups` = `textarea.math-inline-input` 计数；**按两个子串判，别只判「表格」**——上一条断言留下的标题守卫 toast 6 秒内可能还在，只有「块级公式」能区分是哪条守卫）→ `Ctrl+S` → 盘上**不含 `$$`**、`diskSame:true` → 等 7 秒让上一条 toast 过期（或先 `Ctrl+Z` 一次再撤销）→ 按 `Ctrl+Shift+M` → **同一组读数**（`blockMathInCell:0` + toast 含「块级公式」+ 盘上仍无 `$$`）。**没接守卫时的读数**（critic 改前实测）：`blockMathInCell:1`、`dirty:true`、盘上 `| 一<br>$$<br><br>$$ | 二   |`。
7. 正对照：表格外正文 `Ctrl+2` → `h2` 仍出现；单元格里 `Ctrl+B` → `strong` 1（mark 保留能力）；单元格里 `Ctrl+M` → `inlineMathInCell:1`（行内公式不误伤，随后 `Ctrl+Z` 撤回）。
8. 截图 `shots/round-48/impl-t1-table-keys.png`；`consoleErrors: []`、`pageErrors: []`。

静态对照（先贴改前读数）：
- `git grep -n "inTableAncestry" -- src` 改前 **0** → 改后 ≥3（预期 4：`tableScope.ts` 定义 + `App.tsx` 的 import + `handleKeyDown` 与 `selectionInTable` 两处调用）。
- `git grep -n "guardBlockInTable" -- src` 改前 **0** → 改后 **9**（定义 1 + 标题分支 1 + 工具条 H1/H2 各 1 + 插入菜单 5；**公式块那处用的是 `selectionInTable`，不计入这条**——rev-2 把两处判据分开，是为了让「公式块」4 行不依赖 `guardBlockInTable`）。
- `git grep -n "selectionInTable" -- src` 改前 **0** → 改后 **5**（定义 1 + `guardBlockInTable` 体内 1 + 它的 deps 1 + 公式块守卫 1 + `openMathAtCursorRef` effect 的 deps 1）。
- `Select-String -Path src/App.tsx -Pattern "event.key.toLowerCase\(\) === 'l'"` 改前 1 行且无 `shiftKey` → 改后同一行含 `shiftKey`。
- `Select-String -Path src/App.tsx -Pattern '表格单元格里不能用命令插入标题或块级内容' -SimpleMatch` 改前 **0** 行 → 改后 **1** 行；`Select-String -Path src/App.tsx -Pattern '表格单元格里不能放块级公式' -SimpleMatch` 改前 **0** 行 → 改后 **1** 行；**正向对照**：同文件 `'只有编辑视图支持'` = **10** 行（rev-2 实测 `:4566/4700/4770/4780/4791/4795/4798/4801/4813/4822`，证明中文匹配有牙）。
- **负对照**：`guardBlockInTable` 的出现行号里不得包含 `:4724-4759`（图片/行内公式/公式块/链接）、`:4790-4801`（B/I/S/行内代码）、`:4899-4918`（表格工具条）；`selectionInTable` 在 `:4295-4325` 里只允许 **2** 处（守卫 + deps），且**必须**在 `:4301-4306` 那段 `nodeAt` 早返回**之后**（否则「光标落在单元格里已有公式上」会从「打开公式编辑器」变成「弹提示」）。

**风险**：① `Ctrl+Shift+L` 在**非表格**处仍是侧栏开关，别把 window 分支一起改坏（第 1 条两按覆盖侧栏，第 7 条正对照覆盖标题）。② 别把 `inTable` 判据改成只看 `tableCell`——表头是 `tableHeader`。③ 提示条会进 `notice`，`ttl ?? 6000`（`:1891`）自动消失；E2E 点完立刻读 `.toast-text`。④ 不改 `risk.ts` 的保存前确认（本轮不扩到「编辑态有、markdown 表达不了」的通用判定，见 §二）。⑤ 鼠标守卫读的是编辑器状态里的选区：点按钮前选区必须还在单元格——点格子后停 200–250 ms 再点按钮（AGENTS §8 的载入期点击假阴）；若读出 `headingInCell:1`，先 dump `editor.state.selection.$from` 的祖先节点名再判红，别直接改产品。⑥ 不要改 `run()` 本身，也不要给表格工具条/行内按钮套守卫。⑦ **时间不够时**的顺序是 **公式块 4 行（必保，最便宜的 P1）→ 工具条 H1/H2（必保）→ 插入菜单 5 条**；任何一条被降级都要在 impl 逐条列名并写 UNVERIFIED，**不许写「T1 已修」**（这正是 P1-1 连续两版栽的坑）。⑧ 公式块守卫必须插在 `nodeAt` 早返回（`:4301-4306`）**之后**：光标落在单元格里已有的公式上时仍走「打开公式编辑器」，只有真正插入块级公式才拦；插早了会把编辑行为改成弹提示（rev-2 已把这条写进负对照）。

### T2（P1，数据安全）源码改字保存后回编辑不再假脏

**现状（有证据）**：`.tmp/r48-i.log` 的 `## i1-r47f1-recheck`（第 47 轮发现、本轮复核仍在）：源码里 `Ctrl+End` 打「加一句。」→ `Ctrl+S`（`dirty:false`，盘上 `"# 甲\n\n甲的第一段。\n加一句。\n"`）→ `Ctrl+/` 回编辑，`{"mode":"edit","dirty":true}`，正文与盘上一致；再按一次 `Ctrl+S` 字节不变（`changedOnSecondSave:false`）。即**误报 + 一次空写盘**，不丢字节。

**根因（本轮定位，三处判据不同源）**：
- `prepareSave`（read 报 `:2852-2857`）把「正文末尾是否补 `\n`」算进保存文本：`normalized += '\n'`（当 `originalText` 以 `\n` 结尾而 serialized 没有），并把这份 `normalized` 写进 `baselineRef`（`finishSaved` 里 `baselineRef.current = normalized`，read 报 `:2631`）；
- `applySource`（read 报 `:3907-3937`）回编辑时用 `sourceText` 的原始 LF 串与 `baselineRef` 比：`setDirty(normalizedSource !== baselineRef.current)`（`:3936`），少算了那个末尾 `\n` → 恒真；
- 源码模式的脏判断（read 报 `:1900-1907`）也是手写的 `sourceText.replace(/\r\n/g,'\n') !== baselineRef.current`，同一处漏算。

**改动文件/函数**

- 新建 `src/lib/baseline.ts`：
  ```ts
  /** 保存基线的归一化：LF + 末尾换行跟随原文（与 prepareSave 完全同源） */
  export function normalizeForBaseline(text: string, original: string | null): string
  ```
  单测 `src/lib/baseline.test.ts`：`('a\n','a\n')` → `'a\n'`；`('a','a\n')` → `'a\n'`（补换行）；`('a','a')` → `'a'`（原文不以换行结尾不补）；`('a\r\nb\r\n','x\n')` → `'a\nb\n'`；`('a','')`/`('a', null)` → `'a'`；二次调用幂等（`f(f(x))===f(x)` 对上面每个样例）。加进 `test` 链（31 → **32** 个文件）。
- `src/App.tsx` 四处改用同一函数：
  1. `prepareSave`：`let normalized = normalizeForBaseline(currentMarkdown(), originalText)`，下面的 `withEol` 分支（CRLF 给文件）**一字不动**；
  2. `applySource`：新增局部 `const baselineText = normalizeForBaseline(sourceText, originalText)`，只把 `:3936` 的 `setDirty(normalizedSource !== baselineRef.current)` 改成 `setDirty(baselineText !== baselineRef.current)`；**`skipReparse` 判据（`:3918-3920`）保持原样**（它比的是「源码框还没动过 + 正文序列化等于源码」，用补换行后的串会恒 false → 每次退出源码都整篇 reparse，1 MB 会退回 5.5 s，第 42 轮的成果会被吃掉）；
  3. 源码模式的脏判断（`:1903-1907`）：`setDirty(...)` 与相等短路都改用 `normalizeForBaseline(sourceText, originalText)` 的结果，并把 `sourceText === sourceBaselineRef.current` 的两处留在原串上（进入源码时的基线是原文，不能补换行）；
  4. `applySource` 的 deps（`:3937`）补 `originalText`（新代码读它；不加会读到旧值，本轮 E2E 的 `乙.md` 反例就是为这条留的门）。
- **不要动**：`loadIntoEditor` 的 `baselineRef.current = serialized.replace(/\r\n/g,'\n')`（`:2108`）与 `:1087` 的宿主文档分支——它们已经有自己的口径，且第 45 轮「恢复态不再误判脏」依赖它们。

**实施步骤**：先写 `baseline.ts` + 单测（`prepareSave` 的期望值先按现行为写死，改 App 前后都应绿）→ 改四个调用点 → `npm test` → E2E。

**验收（可执行）**

E2E `.tmp/e2e-r48-t2.mjs`（CDP 9222，先 reset；假工作区）播种 `甲.md` = `"# 甲\n\n甲的第一段。\n"`（**以换行结尾**，正是 finder 用的种子）与 `乙.md` = `"# 乙\n\n乙的第一段。"`（**不以换行结尾**，反例）：

0. **未改字进出源码（P2-4，先跑这条）**：打开 `甲.md`、等待就绪后读 `marks0 = performance.getEntriesByName('sl-parse-done').length` → `Ctrl+/` 进源码（**一个字都不改**）→ 停 300 ms → `Ctrl+/` 回编辑 → 断言 `{mode:'edit', dirty:false}` 且 `marks1 === marks0`（退出源码没有整篇重解析）。`<StrictMode>` 下每个 name 两条，**不要 `clearMarks`**，只比前后条数。**这条同时守住第 42 轮的成果**。
1. `甲.md`：`Ctrl+/` → `Ctrl+End` → `keyboard.type('加一句。')` → `Ctrl+S`（等 toast「已保存」）→ 读 `{mode:'source', dirty:false, disk:'# 甲\n\n甲的第一段。\n加一句。\n'}`；
2. `Ctrl+/` → 断言 `{mode:'edit', dirty:false}`（**改前 true**，这是判别性断言）；
3. 再 `Ctrl+S` → 盘上字节不变（`changedOnSecondSave:false`）、`dirty:false`；
4. `乙.md` 走同一路径（原文不以换行结尾）：回编辑后 `dirty:false`，且盘上 `"# 乙\n\n乙的第一段。加一句。"`（无末尾换行）；
5. 正对照：在**编辑视图**里打一个字 → `dirty:true`；`Ctrl+Z` 撤回 → `dirty:false`（撤销回基线仍能自动变干净，第 45 轮语义不回归）；
6. `consoleErrors: []`；截图 `shots/round-48/impl-t2-source-dirty.png`。

静态对照（先贴改前）：
- `git grep -n "normalizeForBaseline" -- src` 改前 **0** → 改后 ≥4（定义 + 3 处调用 + 单测）；
- `Select-String -Path src/App.tsx -Pattern "normalizedSource !== baselineRef.current"` 改前 **1** → 改后 **0**；
- **反向钉（防误改 `skipReparse`）**：`git grep -n "normalizedSource === serializeBodyNow" -- src` 改前 **1** → 改后 **1**（两条件之一原样保留）；`Select-String -Path src/App.tsx -Pattern 'sourceText === sourceBaselineRef.current &&' -SimpleMatch` 改前 **1** → 改后 **1**（钉住的是 `:3919` 那行；rev-2 实测：不带 `&&` 的原串全文件 **3** 处 = `:1903`/`:1908`（源码模式脏判断的两个短路）+ `:3919`（`skipReparse`），所以 rev-1 写的「=1」会让人把 3 当成回归，**必须带 `&&`**）。

**风险**：① 把 `skipReparse` 一起改会引入「退出源码整篇 reparse」的性能回归（改动清单里已写死不改，第 0 条 E2E 会立刻红）。② 末尾换行判定依赖 `originalText` 是否为 `null`：宿主文档/新建文档路径不同，单测要覆盖 `null`。③ 别改 `roundtrip` 相关序列化。④ 若 E2E 的 2 号断言改后仍为 true，先 dump `baselineRef` 与 `serializeBodyNow()` 的字节（可能还有第三处判据漏算），把读数写进 impl 再决定，不要盲目加 `setDirty(false)`。⑤ `applySource` 的 deps 少 `originalText` 会读到旧值——改完顺手确认 deps 数组里有它。

### T4（P2，文档）对外文档九处数字订正（计数取当次 `npm test`，体积按当次 build 派生）

**现状（有证据，全部本轮实测）**

- `README.md:114` 自相矛盾：开头写「首屏 gzip 从 364,960 B 降到 **288,411 B（−21.0%）**」（288,411 是第 37 轮值，ship F1），同一行末尾写「当前 **293,751 B**（第 47 轮 `npm run verify` 实测）」。本轮实测 `gzip=293751`，正确降幅是 `(364960−293751)/364960 = −19.5%`。
- `README.md:116` 写「主 chunk 以最近一次 `npm run build` 输出为准：第 45 轮 910,048 B raw」；`dist/assets/index-DVSSfE44.js` 本轮实测 **912,306 B**。
- **测试计数五处过期且互相矛盾**（P2-2）：`README.md:133`（`30 个文件、400 条断言`）、`README.md:171`（`30 个测试文件`）、`AGENTS.md:39`（`第 47 轮记 30 个文件、400 条`）、`AGENTS.md:72`（`测试 30 个文件 400 条`）、`STATE.md:27`（`当前 29 个文件 380 条`）；而 T1/T2 各加一个测试文件后 `package.json:15` 的 `test` 链是 **32 条**（现 30 条，实测 `Select-String -Path package.json -Pattern '\.test\.ts' -AllMatches` → 30）。`STATE.md:55` 同句里的 `测试 **30 文件 400 条**` 与历史链也要跟（`:64`/`:126` 的第 47 轮记录**不动**）。
- **体积六组数会随本轮 build 一起变**（P2-3）：README `:114` 的当前值/百分比/两个余量、`:116` 的主 chunk、`STATE.md:55` 的「主 chunk `index-DVSSfE44.js` 912,306 B raw / 285,826 B gzip」「`total raw=949553 gzip=293751 headroom=26249 files=3 max=320000`」「+546 历史链」、`AGENTS.md:74` 的「293,751 B」与「余 26,249 B」。T1 新增 `tableScope.ts` + 文案 + 接线、T2 新增 `baseline.ts`，主 chunk 必然换 hash/raw/gzip，百分比也变——**任何旧字节数都不能写死**（§T4 旧版「改后 `'293,751'`≥2」与风险段「写当次实测值」互斥，rev-1 改成派生口径）。
- **`STATE.md:55` 还有两个轮次标签会过期**（P2-4 新，rev-2）：同一句里的 `第 30–47 轮改动都在同一个未发版区间` 与 `首屏/测试数字为第 47 轮 \`npm run verify\`（含 \`measure-first-screen\`）与 \`npm test\` 实测`。rev-2 实测（`grep`）：两个短语在全文件都**只有 1 处**（都在 `:55`；`:64`/`:126` 的第 47 轮历史行不含这两个短语）→ 改后应为 `第 30–48 轮` 与 `第 48 轮 \`npm run verify\``。不改就会留下「48 轮的数字配 47 轮的话」，与 AGENTS:39 改成「第 48 轮记 32 个文件」自相矛盾（就是上一版 P2-2 点过的同一失败模式）。
- `.tmp/iteration/common.md:36` 写「安装包 ≤1,800,000 B（内部）/ 2,000,000 B（硬线）」，同文件 `:5` 已是 50,000,000 / 45,000,000（ship F3）。

**改动落点（九处 + 一处不进 git）**

| 文件 | 行 | 改什么 |
| :--- | :--- | :--- |
| `README.md` | 114 | 头条粗体 → 当次 `gzip=` 值 + **派生**百分比；末尾「当前 …（第 48 轮 `npm run verify` 实测，距硬线余 …、距内部预算余 …）」；历史链追加「第 48 轮加表格内块级守卫与源码基线归一化后 +X B」（X = 新 gzip − 293,751） |
| `README.md` | 116 | 「第 45 轮 910,048 B raw」→「第 48 轮 <当次主 chunk raw> B raw」；`第 36 轮 898,601 B` 保留 |
| `README.md` | 133 | `30 个文件、400 条断言` → `32 个文件、<N> 条断言` |
| `README.md` | 171 | `30 个测试文件` → `32 个测试文件` |
| `STATE.md` | 27 | `当前 29 个文件 380 条` → `当前 32 个文件 <N> 条` |
| `STATE.md` | 55 | 首屏 gzip / 两个余量 / 主 chunk 名+raw+gzip / `total …` 整行逐字 / 测试 `30 文件 400 条` → `32 文件 <N> 条` / 历史链追加 `48 轮 32/<N>` / **`第 30–47 轮` → `第 30–48 轮`** / **`第 47 轮 \`npm run verify\`` → `第 48 轮 \`npm run verify\``**（后两项 rev-2 按 P2-4 新补，都是同句里的字） |
| `AGENTS.md` | 39 | `（第 47 轮记 30 个文件、400 条）` → `（第 48 轮记 32 个文件、<N> 条）`；话题列表可顺手补「表格范围、保存基线」两个词（不影响验收） |
| `AGENTS.md` | 72 | `测试 30 个文件 400 条。` → `测试 32 个文件 <N> 条。` |
| `AGENTS.md` | 74 | `首屏 gzip **293,751 B** … 距硬线余 26,249 B` → 新 gzip + 新余量 |
| `.tmp/iteration/common.md` | 36 | `≤1,800,000 / 2,000,000` → `45,000,000（内部）/ 50,000,000（硬线）`（**git 不跟踪，不进提交**） |

**取数顺序（硬性，第 45 轮的踩坑）**：T1–T2 改完 → `npm run verify` + `npm test` → 抄数字 → 改文档。字段来源：
- 首屏 gzip / headroom / total 行：`npm run verify` 最后一行 `total raw=… gzip=… headroom=… files=3 max=320000`（整行逐字抄进 `STATE:55`）。
- 百分比：`Math.round((364960 − gzip) / 364960 * 1000) / 10`，保留一位（**别写死 −19.5%**）。内部预算余量：`310000 − gzip`。
- 主 chunk：`Get-ChildItem dist/assets -Filter 'index-*.js' | Sort-Object Length -Descending | Select-Object -First 1` 的 `Name` 与 `Length`；该文件 gzip 取 `npm run verify` 逐文件行（`raw gzip url` 三列）里同名的第 2 列。
- 测试文件数：`(Select-String -Path package.json -Pattern '\.test\.ts' -AllMatches).Matches.Count`（改后应为 32）。
- 测试条数：`npm test 2>&1 | Select-String -Pattern '^ℹ tests' | ForEach-Object { [int](($_.Line -split ' ')[2]) } | Measure-Object -Sum` 的 `Sum`（每个文件各打一行 `ℹ tests N`，实测格式如此；现 30 行）。

**验收（先贴改前读数，再贴改后）**

1. 改前（rev-1 实测，可直接抄）：`README.md` 里 `288,411`=1、`910,048`=1、`293,751`=1、`26,249`=1、`30 个文件`=1、`30 个测试文件`=1；`AGENTS.md` 里 `第 47 轮记 30 个文件`=1、`测试 30 个文件 400 条`=1、`293,751`=1、`26,249`=1、`30 个文件`=2；`STATE.md` 里 `29 个文件 380 条`=1、`30 文件 400 条`=3（`:55`/`:64`/`:126`）、`293,751`=4（`:55`/`:64`/`:65`/`:126`）、`26,249`=3（`:55`/`:64`/`:126`）、`288,411`=3（`:60`/`:65`/`:116`）；`common.md` 里 `1,800,000|2,000,000`=1。
2. 改后 `README.md`：`288,411`=0、`910,048`=0、`293,751`=0、`26,249`=0、`30 个文件`=0、`30 个测试文件`=0；**新 gzip 值在同一行出现 2 次**（头条粗体 + 末尾当前值）且与 `npm run verify` 的 `gzip=` **逐字一致**；百分比 == 派生值；「距硬线余」== `320000 − gzip`、「距内部预算余」== `310000 − gzip`。
3. 改后 `README.md:116` 的主 chunk 文件名+字节 == `dist/assets` 里最大的 `index-*.js`（改前实测 `index-DVSSfE44.js` 912,306 B，改后按当次 build 抄）。
4. 改后 `STATE.md`：`29 个文件 380 条`=0；`30 文件 400 条`=**2**（只剩 `:64`/`:126` 的第 47 轮记录）；`32 文件` 在 `:27`/`:55` 各 1；`48 轮 32/` 在 `:55` 历史链 1；`293,751` 4→3（`:55` 清掉，`:64`/`:65`/`:126` 的历史叙述保留）、`26,249` 3→2（`:55` 清掉）、`288,411` 3→3（`:60`/`:65`/`:116` 历史，**不动**）；**两个轮次标签（rev-2，P2-4 新）**：`Select-String -Path docs/iteration/STATE.md -Pattern '第 30–47 轮' -SimpleMatch` 改前 **1** → 改后 **0**（新值 `第 30–48 轮`=1）、`Select-String -Path docs/iteration/STATE.md -Pattern '第 47 轮 \`npm run verify\`' -SimpleMatch` 改前 **1** → 改后 **0**（新值 `第 48 轮 \`npm run verify\``=1）。
5. 改后 `AGENTS.md`：`第 47 轮记 30 个文件`=0、`测试 30 个文件 400 条`=0、`293,751`=0、`26,249`=0；`第 48 轮记 32 个文件`=1、`测试 32 个文件`=1；新 gzip 与新余量 == 派生值（与 README:114 同值）。
6. 改后 `common.md`：`1,800,000|2,000,000`=0、`45,000,000` ≥2。
7. 三处的 `<N>`（STATE/README/AGENTS）**逐字一致**，且 == 上面「测试条数」命令的 `Sum`；文件数 == 32（`package.json` 计数命令）。
8. 不改 `release/`、不改 `package.json` 版本、不新增/删除 README 段落；`STATE:64`/`:126`（第 47 轮记录）、`README:116` 的「第 36 轮 898,601 B」不动。

**风险**：① 顺序固定：先 `npm run verify`（T1–T2 改完后）再抄数字，不要先写后 build。② bundle 一定变（T1 两个模块 + 文案、T2 一个模块）→ 旧字节、旧 hash、旧百分比全部作废，**写派生值**。③ 减法用当次值：`320000 − gzip`、`310000 − gzip`、`364960 − gzip`。④ 测试条数按 32 个文件求和，别沿用 400；若求和小到异常（< 400），说明有文件没跑到，先查 `test` 链再写文档。⑤ `common.md` 在 `.tmp/`（`.gitignore:8`），改完在 impl 写明「本地文件，未进提交」。

## 二、本轮不做（写清为什么、下轮怎么排）

| 项 | 为什么不做 | 下轮怎么排 |
| :--- | :--- | :--- |
| **P2-2（新）** 表格单元格里**手打** `# ` / `> ` / `- ` 经输入规则造块级节点（存盘变字面 `# 标题`） | **本轮不修，取 plan-review 的 (b) 档（明说可接受）**：唯一「一处盖全部」的改法是 `editorProps.filterTransaction`。rev-2 读了实现风险：Tiptap 的输入规则把「插入这个字符」和「换成块节点」放在**同一条** `tr` 里，`filterTransaction` 返回 false 会连**那个空格**一起吞掉（字符留下、空格消失），而且「拒绝事务」也会连带拒掉「撤销：把单元格里的标题删掉」这类合法事务；它动的是**每个按键都经过**的最敏感路径，35 min 预算内无法用 E2E 证干净。按「不许拿没验证的改法排任务」本轮不排，三条手打读数写进 §五 UNVERIFIED | **下轮第一项（P2，与 code F1 的测量先行同批）**：先用 15 行探针量三条路（手打 `# `/`> `/`- `、粘贴带标题的 Markdown、`Ctrl+Z` 撤销删块），再二选一——① `editorProps.filterTransaction`（拒事务 + `setTimeout(() => show(...), 0)`；只扫本步插入内容，1 MB 不回归）；② `editorProps.handleTextInput` 命中块首标记时 `return true` 只跳过输入规则（不吞空格、不挡撤销，但盖不住粘贴，且要复用第 47 轮 `smartTyping` 的写法）。选完把守卫文案恢复成「…不能放标题或块级内容」，E2E 钉「手打 `# ` → `h:0` 且存盘逐字节不变」 |
| **T3 = ui F4** 空文档占位符与正文不同字体/字号/行高（原 3 min 任务） | **按预算砍单，rev-2 继续砍**：rev-2 给 T1 **+3**（公式块守卫，14→17 min），靠 T2 **−1**（`乙.md` 折成尾巴）与门禁 **6→4**（`verify` 内含 `build`）回到 35 min 顶格，T3 的 3 min 没有余量 | **下轮第二项（3 min，可直接执行）**：`src/styles.css` 的 `.editor-placeholder`（read 报 `:276-285`）补 `font-family: var(--font-read)`、`font-size: var(--editor-size, 17px)`、`line-height: 1.95`；E2E 读计算样式（与 `.doc-body` 三项逐项相等）+ 浅/深两图；`--editor-size` 挂在 `documentElement`（`App.tsx:1798`），占位符一定读得到 |
| **code F1**「全部替换」1 MB 冻结 52 s（P1） | **findings 的根因与收益推导不成立**：它说「逐条 `insertText` 每次 `mapping.map` → O(n²)」，但我用 Node 探针实测纯模型构造是**线性**的——`.tmp/planner48-probe.mjs`（1,024 段 × 每段 39 处，39,936 命中）：当前写法 `insertText` 循环 **41.9 ms**，预构建 `ReplaceStep` **32.8 ms**，两者结果文本逐字节相同；ProseMirror 的 `Transform.insertText/delete` 里没有逐条 `mapping.map`（`node_modules/prosemirror-transform/src/transform.ts:98-119`），`Mapping.slice` 每次只切 1 张图。所以 52 s 的大头在 `view.dispatch` 内部的其它段（state apply / `view.updateState` 的 DOM 同步 / Tiptap 事务回调 / 装饰重建），`replaceEvery` 只是触发点。按错根因改代码风险高、收益未证 | 下轮**第三项、测量先行**（第一项是 P2-2 的表格内块级守卫、第二项是 ui F4）：在页面里把 `view.dispatch` 拆段计时——`EditorState.apply(tr)`、`view.updateState`、`editor.on('transaction')` 回调、`renderFind` 装饰重建各自打点（findings 已给 39,936 步的 dispatch 总时长作基线）；定位到段再定改法（候选：分块 dispatch + 进度条 / 按段落合并 / 命中数超阈值先确认）。回归阈值沿用 findings：1 MB `dispatch ≤ 2,000 ms` |
| **typora F1** 脚注引用上标（P1） | 用户收益高，但要新增装饰 + 点击跳转 + 预览同步（60–90 行），且必须保证保存逐字节不变（第 40/41 轮往返口径）；本轮 3 个任务已把 35 min 占满 | 下轮排第一的 Typora 项：新纯函数 `findFootnoteRefs` + `Decoration.inline` 上标（只 DOM）+ `PreviewPane` 同步 `<sup><a href="#fn-N">` + 单测；E2E 断言 `sup:1`、`anchors:1`、`Ctrl+S` 字节不变 |
| **code F2/F3/F4**（源码态字数面板整篇 reparse 2.07 s、导出 md/txt 无条件加载 KaTeX 76.5 kB gzip、第 47 轮死代码复核） | 性能与内部质量，排在数据安全与用户可见之后；F3 改法只有 3 行但收益主要是「不写公式的作者少下 84 KB」，本轮时间给了 T1/T2 | 下轮性能/内部质量批次：code F3（`await ensureKatex()` 移进 `kind === 'html'` 分支 + 一条「导出 markdown 不触发 katexLoader 请求」断言）最便宜先做；再 F2；F4 顺手清 `trash.ts:120` 的 31 行死函数 |
| **typora F2/F3/F4/F5/F6/F7**（Mermaid 双份、代码块无标签/复制/高亮、frontmatter 无入口、大纲无过滤/全部折叠、字数缺「行」、表格无移动行列/对齐入口） | 都是 P2 体验缺口；F4（frontmatter 只读对话框）与 F5（大纲过滤）各 40–60 行，属一个完整批次；本轮只装两个 P1 + 一个文档任务 | 下轮 Typora 体验批次：**F4**（复用 `ShortcutsDialog` 壳）→ **F5 最小档**（过滤框）→ **F2**（Mermaid 源码折叠）→ **F3 最小档**（语言标签 + 复制）；F6「行」可 5 行顺手带上 |
| **ui F1/F2/F3/F5/F6/F7**（表格网格线/分隔线 1.00–1.31:1、≤1119px 正文反而变宽 861px、查找条下移 79px 且关后不回位、表格条在文档流里压 36px、14 档字号、页边 sticky 面板压卡） | F1/F2 是 CSS 改色与 `max-width`，本身便宜，但**要选色值与截图对比、要防打印样式回归**；T3（ui F4）本轮也砍了，整个 `styles.css` 批次下轮一起做更稳 | 下轮 UI 专项（纯 CSS 一批）：**先 ui F4**（本轮砍单）→ F1（边框改 `--line-strong` 一档，≥3:1）+ F2（窄窗 `max-width: 36rem; margin-inline: auto`）+ F3（查找条改浮层并恢复 `scrollTop`）；F5 表格条浮层化要动结构，单独一轮 |
| **ship F2/F5/F6**（exe 无文件描述/产品名/公司/版权、宿主编译 3 条警告、本地 `release/` 的 0.32.1 setup 与已发布字节不同） | F2 要改 `host/build.ps1` 并重编宿主（本会话沙箱里 WebView2 起不来，验收只能到 `FileVersionInfo` 静态读取）；F6 是发布流程，本轮不改 `release/`；F5 是宿主编译噪声 | 下轮发布批次：F2 的 5 行 `AssemblyInfo` + `packaging/installer.ps1` 版本门旁加 `FileDescription` 断言；F6 让 `verify-installer.ps1` 在存在 `SHA256SUMS-<版本>.txt` 时校验当版 setup（P2，只改脚本） |
| **typora F8** Typora 两份文档整表订正（5 处「无」、缺 4 行、计数 32/9 → 32/13） | 是文档批次，但要逐行核对 40+ 行表格并改 README/AGENTS 计数，比 T4 大得多；T4 只修数字，先把「自相矛盾」清掉 | 下轮文档批次第二项（与 code F4 同批）：`typora-features.md` 加过期横幅 + 订正 5 行；`typora-gap.md` 补 4 行并改计数；AGENTS/README 同步 |
| **bug 报告复核项**：第 47 轮 F1（已进 T2）；重命名后「已刷新」提示（第 29–34 轮已列）；表格 `Tab` 选中整格（第三方语义，报告中已判「不是缺陷」） | 不重复排 | 表格 `Tab` 语义不再报；重命名提示低优先级留待体验批次 |

## 三、逐任务实施顺序（给执行代理）

1. **T1**（先做，P1，17 min）：`tableScope.ts` + 单测 → 接 `test` 链 → `App.tsx` **先接公式块 4 行守卫**（最便宜的 P1）→ 再接键盘两处 + 鼠标 7 处 → `npm test` → E2E（`表.md`/`嵌套.md`，含工具条 H1、「插入→代码块」、**「插入→公式块」+ `Ctrl+Shift+M`** 三组鼠标/键盘断言）→ 截图。
2. **T2**（P1，10 min）：`baseline.ts` + 单测（先跑一遍确认按现行为写死的期望是绿的）→ 改四处调用 + deps → `npm test` → E2E（`甲.md` 主流程 + 第 0 条标记计数 + 撤销回归；`乙.md` 折成脚本末尾 4 个动作）→ 截图。
3. **T4**（文档，4 min）：等 T1/T2 完成后跑 **`npm run verify` + `npm test`** → 取数 → 改九处（含 STATE:55 的两个轮次标签）→ 贴改前改后对照。
4. 收尾（4 min）：`npm test` + `npm run roundtrip` + `npm run verify` 串跑（**`verify` 的脚本定义就是 `npm run build && node scripts/measure-first-screen.mjs`，所以不再单跑 `npm run build`**）；CHANGELOG `## Unreleased` 写 T1/T2 两条（T4 文档订正附一行）；`impl.md` 写读数与 UNVERIFIED。
   - **砍单/降级顺序**：保序 **T1 > T2 > T4**（T4 不可砍：审计划 P2-2/P2-3/P2-4 的九处落点必须落地，数字都从命令输出抄）。**T1 内部**：公式块 4 行必保 → 工具条 H1/H2 必保 → 插入菜单 5 条；任何一条降级都要逐条列名写 UNVERIFIED，**不许写「T1 已修」**。
   - **T2 熔断**（10 min 到点还没拿到「回编辑 `dirty:false`」，即本任务估时用尽）：把 dump 的三处读数写进 impl，T2 降级为 UNVERIFIED 顺延，**不要**用 `setDirty(false)` 强压。

## 四、门禁与验收口径

| 门 | 命令 | 通过口径 |
| :--- | :--- | :--- |
| 构建 | `npm run verify`（内含 `npm run build`） | exit 0；收尾不单跑 `build`（省一次 ~40 s 的重复打包） |
| 测试 | `npm test` | 现 30 文件 400 条全过；T1 加 `tableScope.test.ts`、T2 加 `baseline.test.ts` → **32 文件**；条数按 `ℹ tests` 求和记录（**不写死 400**） |
| 往返 | `npm run roundtrip` | 0 漂移（T2 动了保存基线归一化，必跑） |
| 首屏 | `npm run verify` | PASS；记录改前 **293,751 B** 与改后值、增量（T1/T2 新增两个小模块 + 文案，预期 ≤ 1,200 B；内部线 310,000 / 硬线 320,000）；**T4 的九处数字只能取自这次输出的最后一行与逐文件行** |
| E2E | `.tmp/e2e-r48-t1.mjs` / `-t2.mjs` | 每条断言打印读数；`consoleErrors: []`；`page.close()` + `process.exit(0)`；每个脚本前 `node .tmp/reset.mjs 9222` |
| 截图 | `node scripts/shot.mjs http://localhost:5175 --out shots/round-48/impl-*.png` | `impl-t1-table-keys`、`impl-t2-source-dirty`（T3 已砍，无 placeholder 两张） |
| 版本 | — | `package.json` 0.32.1 不动；CHANGELOG 只写 `## Unreleased` |
| 范围 | — | 不 push、不改 `release/`、不改 `host/`；**不覆盖 finder 的截图与日志**；不改 `.tmp/iteration/roles/*`；`common.md` 只在 `.tmp/`（不进 git） |

## 五、记录要点（impl.md 必写）

- T1：改前三按读数（`Ctrl+Shift+L` → `rowCount:2` + `sidebar:true`；`Ctrl+L` → 2；单元格 `Ctrl+2` → `headingInCell:1`）与改后同一组；**鼠标入口两条**（工具条 H1 → `headingInCell:0` + `.toast-text` 含「表格」；「插入→代码块」→ `pre:0`）；**公式块两条（rev-2 必写，P1-1 新的判别性证据）**：「插入→公式块」与 `Ctrl+Shift+M` 各一组 `{blockMathInCell:0, cellHtml, mathPopups:0, toast, dirty:false, diskSame:true}`，并写明**改前读数**（`blockMathInCell:1` + 盘上 `| 一<br>$$<br><br>$$ | 二   |`，出处 `.tmp/critic48-probe.mjs` 的 `## a-blockmath-menu-nonempty`）；`嵌套.md` 存盘字节原文（不含 `## 一`）；`tableScope` 单测条数；`Ctrl+B` 与 `Ctrl+M` 两条正对照；静态计数 `guardBlockInTable` **9**、`selectionInTable` **5**（各自列出行号）。
- T2：`甲.md`/`乙.md` 回编辑后的 `dirty` 与盘上字节；`changedOnSecondSave:false`；撤销回基线 `dirty:false`；**未改字进出源码的 `sl-parse-done` 前后计数（marks0 === marks1）**；`normalizeForBaseline` 单测条数与幂等断言；**明确写 `skipReparse` 未被改动**（引 `:3918-3920` 原文一行 + `normalizedSource === serializeBodyNow` 计数 1→1）。
- T4：九处改前/改后 `Select-String` 计数对照（§一验收 1–8 的每个数）；`npm run verify` 最后一行原文（`total raw=… gzip=… headroom=… files=3 max=…`）与主 chunk 逐文件行；`npm test` 的 32 个 `ℹ tests` 求和；`dist/assets` 最大 `index-*.js` 的 `Name`+`Length`；`git status --porcelain`（`common.md` 不在 git 里）。
- 全部：`git status --porcelain` 收工快照（只应多 `docs/iteration/round-48/`、`shots/round-48/` 与 `.tmp/` 脚本）。
- UNVERIFIED 逐条写清：
  - **T3（ui F4）本轮按预算砍掉，未修**：空文档占位符仍是 `Segoe UI 16px / line-height normal`（用 `.editor-placeholder` 计算样式可复现），下轮**第二项**（第一项是下面这条守卫）。
  - 若 T1 插入菜单 5 条降级：逐条写清（表格/代码块/引用/任务列表/分割线在单元格里仍可创建 → 保存丢结构），下轮补。
  - **表格单元格里手打 `# ` / `> ` / `- ` 仍会造块级节点（P2-2，本轮不修，rev-2 已实测）**：2×2 表、第 2 行第 1 格为空、点进去直接打字 → `# ` 得 `<h1>`（继续打「标题」后 `Ctrl+S`，盘上 `| # 标题 | 二 |`，重开是字面 `# 标题`）、`> ` 得 `<blockquote>`、`- ` 得 `<ul><li>`；```` ``` ```` 仍是字面（`pre:0`）；`errors:[]`。**实测来源**：`.tmp/critic48-probe2.mjs`（CDP 9222 + 假工作区，先 `reset` 再 reload）。**粘贴**一段带标题/代码块的 Markdown 进单元格是否同样造块节点**本轮未实测**（与手打同一根因）。本轮守卫只覆盖**命令入口**（键盘 `Ctrl+1–6`/`Ctrl+Shift+M`、工具条 H1/H2、「插入」菜单 5 条 + 公式块），提示文案已按此收窄成「不能用命令插入…」。
  - 宿主 WebView2、真实 IME、`Ctrl+Alt+L`（AltGr）、真实 125%/150% 缩放。

## 六、下轮建议（按优先级，不占本轮）

1. **表格内块级守卫（输入规则 + 粘贴）**（P2-2 本轮按预算延后，下轮第一项）：先写探针量三条路，再在 `editorProps.filterTransaction` 与 `editorProps.handleTextInput` 之间二选一（代价与风险写在 §二）；选完把守卫文案恢复成「…不能放标题或块级内容」，E2E 钉「手打 `# ` → `h:0` 且存盘逐字节不变」。
2. **ui F4 占位符**（本轮 T3 砍单，3 行 CSS + 计算样式 E2E，直接可执行）。
3. **code F1 测量先行**：`view.dispatch` 分段剖析（apply / updateState / 事务回调 / 装饰），定位 52 s 后再改。
4. **typora F1** 脚注上标 + 预览同步（P1，写作高频）。
5. **性能批次**：code F3（KaTeX 移进 html 分支）→ code F2（源码态段数改行扫描）→ F4 死代码。
6. **Typora 体验**：F4（frontmatter 只读对话框）→ F5 最小档（大纲过滤）→ F2（Mermaid 源码折叠）→ F3 最小档。
7. **UI 专项**：ui F1 + F2 + F3（纯 CSS 一批）；F5 表格条浮层化单独一轮。
8. **发布批次**：ship F2（exe 元数据）+ F6（`verify-installer.ps1` 校验当版 setup）+ F5（宿主警告）。
9. **文档批次第二项**：typora F8 整表订正（含 `typora-features.md` 过期横幅）。

## 七、rev-1 / rev-2 修订对照（给 critic 复审用）

### rev-2（第 2 次修订，对象是 `plan-review.md` 复审 rev-1 的 4 条新 REVISE）

| 漏洞 | 改在哪里 | 关键改动 |
| :--- | :--- | :--- |
| **P1-1（新）** 公式块是块节点，rev-1 写成行内、明确「不要套守卫」 | §一 T1 现状第 3 条的负结果 + 新增第 4 条、改动清单第 5 步（新）、实施步骤、验收第 6/7 条、静态对照、风险 ⑦⑧、§五、§七 rev-1 表末行 | 负结果改成「图片 / **行内**公式 / 链接不套，公式块是 `group:"block"` **必须套**」，并给出节点定义出处（`@tiptap/extension-mathematics/dist/index.js:25-26` vs `:205-206`）、两个入口（`:4746` 菜单 + `:3748` `Ctrl+Shift+M`）与改前实测（`blockMathInCell:1`、盘上 `$$`、截图 `shots/round-48/critic-blockmath-cell.png`）。改法：`openMathAtCursorRef.current` 的 effect（`:4295-4325`）里 4 行守卫 + deps 补 `selectionInTable, show`——**一处盖两个入口**，不依赖 `guardBlockInTable`。守卫插在 `nodeAt` 早返回（`:4301-4306`）**之后**，所以「光标落在已有公式上」仍走编辑路径（写进负对照与风险 ⑧）。E2E 加两条（菜单 + `Ctrl+Shift+M`），并写明没守卫时的读数。预算 +3 min 由 T2 −1、门禁 6→4 抵消，合计仍 35 min |
| **P2-2（新）** 手打 `# `/`> `/`- ` 实测造块节点，rev-1 写「未实测」 | §二新增首行、§一 T1 改动清单第 3 步的文案、验收静态对照、§五 UNVERIFIED、§六第 1 项 | **本轮不修**（取 review 的 (b) 档，明说可接受）：三条读数（`<h1>`/`<blockquote>`/`<ul>`、``` 仍字面、`errors:[]`，出处 `.tmp/critic48-probe2.mjs`）写进 §五 UNVERIFIED，粘贴一项标「本轮未实测」；守卫文案收窄为「表格单元格里**不能用命令**插入标题或块级内容」，静态钉同步换成新串；§二 登记下轮第一项并写清两条候选（`filterTransaction` 拒事务 vs `handleTextInput` 只跳输入规则）的代价与风险 |
| **P2-3（新）** T2 静态钉 `sourceText === sourceBaselineRef.current` 实测 3 处不是 1 | §一 T2 静态对照、§七 rev-1 表末行 | 钉改成唯一串 `sourceText === sourceBaselineRef.current &&` → 改前 **1** → 改后 **1**（钉 `:3919`），并写明不带 `&&` 的原串全文件 **3** 处（`:1903`/`:1908`/`:3919`，rev-2 实测），避免执行代理把 3 当回归去改 `:1903`/`:1908` |
| **P2-4（新）** T4 的 STATE:55 漏两个轮次标签 | §一 T4 现状（新增一条）、落点表 STATE:55 一格、验收第 4 条 | 补 `第 30–47 轮` → `第 30–48 轮`、`第 47 轮 \`npm run verify\`` → `第 48 轮 \`npm run verify\``；rev-2 实测两短语全文件各 **1** 处（都在 `:55`，`:64`/`:126` 的第 47 轮历史行不含它们）；验收加两条 `Select-String`（改前 1 → 改后 0，新值各 1） |

### rev-1（第 1 次修订，对象是上一版 `plan-review.md` 的 4 条 REVISE）

| 漏洞 | 改在哪里 | 关键改动 |
| :--- | :--- | :--- |
| **P1-1** T1 只封键盘入口 | §一 T1 现状第 3 条、改动清单第 3/5 步、验收第 4/5 条、风险 ⑥⑦ | 新增 `selectionInTable()` + `guardBlockInTable()`（`lib` 仍无 PM 依赖）；工具条 H1/H2 + 插入菜单 5 条块级命令全部套守卫；图片/行内公式/链接与行内按钮**明确不套**（rev-2 更正：rev-1 当时把「公式块」也算进了这一串，公式块是块节点、必须套，见上表 P1-1（新））；E2E 加「单元格点 H1 → `headingInCell:0` + 提示含表格 + 存盘无 `# ` + 重开 `cells`」与「点代码块 → `pre:0`」两条；降级退路写死「工具条必保、菜单 5 条写 UNVERIFIED，不许写已修」 |
| **P2-2** T4 落点不全 + 计数自相矛盾 | §一 T4 现状、落点表、验收 1–7 | 落点扩到 9 处：README `:114`/`:116`/`:133`/`:171`、STATE `:27`/`:55`（含历史链 `48 轮 32/<N>`）、AGENTS `:39`/`:72`/`:74`；数值一律取本轮 `npm test`（32 文件 + `ℹ tests` 求和）与 `npm run verify`，不写死 30/400；验收：`29 个文件 380 条`→0、`30 文件 400 条`→**2**（只在 `:64`/`:126`）、新值三处逐字一致；`:64`/`:126` 明确不动 |
| **P2-3** T4 体积数字与 bundle 变化冲突 | §一 T4 现状最后一条、落点表、取数顺序、验收 2/3/4、风险 ②③ | 改**派生口径**：README:114 当前值 == `verify` 的 `gzip=`、百分比 == `Math.round((364960−gzip)/364960*1000)/10`、余量 == `320000−gzip`/`310000−gzip`；README:116 == `dist/assets` 最大 `index-*.js` 的 `Name`+`Length`；STATE:55 四组数与 AGENTS:74 两组数一起跟；旧值 `288,411`/`910,048` 改后 0，`293,751`/`26,249` 在 README/AGENTS 改后 0（STATE 历史行保留） |
| **P2-4** T2 缺 `skipReparse` 断言 | §一 T2 验收第 0 条、静态对照、风险 ①⑤ | 新增「不改一个字进出源码 → `dirty:false` 且 `sl-parse-done` 条数不变」；静态钉 `normalizedSource === serializeBodyNow` 1→1、`sourceText === sourceBaselineRef.current &&` 1→1（rev-2 改正：不带 `&&` 的原串是 3 处）；`applySource` 的 deps 补 `originalText` |
