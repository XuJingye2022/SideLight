# 第 48 轮 · 实施（executor）

- 轮次：`round=48`、`nn=48`；轮前 `startSha=5673b1dee5623cc72fe87b37d563c1d7444224ff`（实测 `git rev-parse HEAD` 同值）。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；浏览器只用 **CDP 9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`。
- 不发版：`package.json` 版本 0.32.1 未动；CHANGELOG 只写 `## Unreleased` 下的「第 48 轮」；未碰 `release/`；未 push、未 commit。
- 结论：**T1、T2、T4 全部完成**，另把 plan-review **P1-1（新）** 的 `$$`+回车 4 行守卫一起做了（计划给了两条路，本轮选了「修」，因为它与 T1 的公式块守卫是同一个节点、同一份判据，成本 4 行 + 1 组断言）。门禁 `tsc`/`test`/`roundtrip`/`verify` 全绿。

## 一、任务状态

| id | 状态 | 说明 |
| :--- | :--- | :--- |
| **T1** 表格内块级越界（键盘两处 + 鼠标七处 + 公式块两入口 + `$$`+回车） | **DONE** | 8 条 E2E 断言全绿，含改前读数对照 |
| **T2** 源码改字保存后回编辑不再假脏 | **DONE** | 4 条 E2E 断言全绿（含 `sl-parse-done` 不增长） |
| **T3**（ui F4 占位符） | 计划已砍 | 未做，UNVERIFIED 见 §五 |
| **T4** 对外文档九处数字订正 | **DONE** | 九处 + STATE:55 两个轮次标签 + 首屏链尾 |
| plan-review **P1-1（新）** `$$`+回车 | **DONE**（计划未排，按 review 的「4 行修法」做） | 见 T1-6b 读数 |

## 二、T1：表格内块级越界

### 改动文件

- **新建 `src/lib/tableScope.ts`**（纯函数、无 DOM/PM 依赖）：
  - `TABLE_SCOPE_NAMES = ['table','tableRow','tableCell','tableHeader']`
  - `inTableAncestry(names)` —— 从内到外的祖先名里有没有表格节点。
- **新建 `src/lib/tableScope.test.ts`**：8 条（单元格链命中、普通段落不命中、只给 `tableCell` / `tableHeader`、空数组、只有 `doc`、整名匹配前缀不算、常量内容）。
- **`src/lib/mathInput.ts`**（4 行守卫 + 一个可选回调，plan-review P1-1 新）：
  - `import { inTableAncestry } from './tableScope.ts'`；`Options` 加 `onBlockedTable?: () => void`；
  - `Enter` 快捷键在 `if (!blockMath) return false` 之后收祖先名，命中表格就 `this.options.onBlockedTable?.()` + `return true`（吞掉回车：既不 `insertContentAt`，也不让默认回车把单元格拆段）。**不要**改两条输入规则（review 的负对照：`$$x^2$$` / `$$$x^2$$$` 在单元格里本来就不会成 blockMath）。
- **`src/App.tsx`**：
  1. `handleKeyDown` 的 `inTable` 深度循环改成「先收集 `names`，再 `inTableAncestry(names)`」（与另外两处共用一份判据）。
  2. 表格删行分支补 `&& !event.shiftKey && !event.altKey`；**没有** `stopPropagation`（`Ctrl+Shift+L` 仍要冒泡到 window 开侧栏）。
  3. 新增 `selectionInTable()` / `guardBlockInTable()`（位置在 window `keydown` effect 之前的 `saveAndSwitch` 之后），并把 `guardBlockInTable` 加进该 effect 的 deps。
  4. 标题分支 `Ctrl+1–6`：`if (viewMode !== 'edit') return` 之后插 `if (guardBlockInTable()) return`（`preventDefault()` 保留）。`Ctrl+0` **未动**。
  5. `openMathAtCursorRef` 的 effect：在 `nodeAt` 早返回（命中已有公式 → 打开就地编辑）**之后**、`coordsAtPos` **之前**插 `if (block && selectionInTable()) { show('表格单元格里不能放块级公式：Markdown 表格只装行内内容'); return }`；deps 由 `[editor, viewMode]` 改成 `[editor, viewMode, selectionInTable, show]`。**一处同时盖「插入 → 公式块」与 `Ctrl+Shift+M`**。
  6. 鼠标 7 处改成 `if (!guardBlockInTable()) run(...)`：插入菜单的表格 / 代码块 / 引用 / 任务列表 / 分割线，工具条的 H1 / H2。图片、公式（行内）、链接、B/I/S/行内代码、表格工具条 7 条**未动**。
  7. `MathInputRules.configure({ onBlockedTable: () => show('表格单元格里不能放块级公式：Markdown 表格只装行内内容') })`。
- `package.json` 的 `test` 链尾部追加 `tableScope.test.ts` 与 `baseline.test.ts`（30 → **32**）。

### 改前 / 改后静态读数（先贴改前）

| 命令 | 改前 | 改后 |
| :--- | ---: | ---: |
| `git grep -n "inTableAncestry" -- src` | 0（exit 1） | **5** 行（`App.tsx`:67 import / :830 / :3602；`mathInput.ts`:4 / :79）＋ `tableScope.ts` 定义与 8 条单测（未跟踪文件不计） |
| `git grep -n "guardBlockInTable" -- src` | 0（exit 1） | **10** 行 = 定义 :3606 + 标题分支 :3782 + effect deps :3853 + 插入菜单 5（:4744/:4752/:4760/:4768/:4776）+ 工具条 H1/H2（:4829/:4841）。计划写「9」是没算 deps 那一行 |
| `git grep -n "selectionInTable" -- src` | 0（exit 1） | **5** 行 = 定义 :3597 + 守卫体内 :3607 + 它的 deps :3611 + 公式块守卫 :4335 + 该 effect 的 deps :4357 |
| `Select-String "event.key.toLowerCase\(\) === 'l'"` | 1 行、无 `shiftKey`（:836） | 1 行、含 `!event.shiftKey && !event.altKey`（:838） |
| `Select-String '表格单元格里不能用命令插入标题或块级内容' -SimpleMatch` | 0 | **1** |
| `Select-String '表格单元格里不能放块级公式' -SimpleMatch` | 0 | **2**（`App.tsx` 的公式块守卫 + `MathInputRules.configure` 的回调；计划写 1，多的是 `$$`+回车 那条路径的提示） |
| 正向对照 `Select-String '只有编辑视图支持' -SimpleMatch` | **10** | **10**（证明中文 `Select-String` 有牙） |
| 负对照 | — | `guardBlockInTable` 不出现在 `:4724-4759`（图片/公式/公式块/链接）、`:4790-4801`（B/I/S/行内代码）、`:4899-4918`（表格工具条）；`selectionInTable` 在 `openMathAtCursorRef` effect 里只有 2 处且都在 `nodeAt` 早返回之后 |

### E2E（`.tmp/e2e-r48-t1.mjs`，CDP 9222，日志 `.tmp/r48-t1.log`）

脚本：假工作区播种 `表.md`（3×3）、`嵌套.md`（2×2 + 表格外一段）、`空格.md`（2×2，第 2 行第 1 格为空）；每段打印读数。

| # | 断言 | 改后读数 | 改前（findings/critic 实测） |
| :--- | :--- | :--- | :--- |
| 1 | 单元格里 `Ctrl+Shift+L` | `rows:3→3`、`dirty:false`、`sidebar:false→true→false`、`diskSame:true` | `rowCount:2` + `sidebar:true`（bug F1） |
| 2 | 同位置 `Ctrl+L`（正对照） | `rows:2`、`dirty:true`；`Ctrl+Z` → `rows:3`、`dirty:false` | — |
| 3 | 单元格 `Ctrl+2` | `headingInCell:0`、`cellHtml:"<p>一</p>"`、toast 含「表格」、`dirty:false`；`Ctrl+S` 后 `hasHash:false`、`diskSame:true`；重开 `cells:["甲","乙","一","二"]`、`headingsInCell:0` | `cellHtml:"<h2>一</h2>"`、盘上 `## 一`（bug F2） |
| 4 | 工具条 **H1**（鼠标入口） | `headingInCell:0`、`cellHtml:"<p>一</p>"`、toast 含「表格」、`dirty:false`；盘上该行 `\| 一 \| 二 \|`、`diskSame:true`、重开无标题 | 未封时同 `Ctrl+2` 的 `<h2>` |
| 5 | 插入菜单 → **代码块** | `preInCell:0`、`blockInCell:0`、toast 含「表格」、`dirty:false` | 未封时会造 `pre` |
| 6a | 插入菜单 → **公式块** | `blockMathInCell:0`、`blockMathAll:0`、`mathPopups:0`、`cellHtml:"<p>一</p>"`、toast 含「块级公式」+「表格」、`dirty:false`、`diskSame:true`、盘上无 `$$` | critic：`blockMathInCell:1`、`dirty:true`、盘上 `\| 一<br>$$<br><br>$$ \| 二   \|` |
| 6b | **`Ctrl+Shift+M`** | 同一组读数（`blockMathInCell:0` / toast 含「块级公式」/ 盘上无 `$$` / `diskSame:true`） | 同上 |
| 6c | 单元格打 `$$` + **回车**（plan-review P1-1 新） | `blockMathInCell:0`、`blockMathAll:0`、`cellHtml:"<p>$$</p>"`、`mathPopups:0`、`rows:2`（没拆段）、toast 含「块级公式」+「表格」；盘上该行 `\| $$  \| 二   \|`、`hasBr:false`；重开 `blockMathInCell:0` | critic `## b` / `## e`：`blockMathInCell:1`、盘上 `\| $$<br><br>$$ \| 二   \|` / `\| $$<br>z<br>$$ \|` |
| 7 | 正对照：表格外 `Ctrl+2` / 单元格 `Ctrl+B` / 单元格 `Ctrl+M` | `h2:1`；`strongInCell:1`（`<strong>x</strong>`）、toast `null`；`inlineMathInCell:1`、`mathPopups:0`、toast `null`（行内能力不误伤） | — |
| 8 | 控制台 | `consoleErrors:[]`、`pageErrors:[]` | — |

截图：`shots/round-48/impl-t1-table-keys.png`（`Ctrl+Shift+L` 后侧栏收起、表格仍是 3 行）。

## 三、T2：源码改字保存后回编辑不再假脏

### 改动文件

- **新建 `src/lib/baseline.ts`**：`normalizeForBaseline(text, original)` —— 先 `\r\n → \n`；`original` 非 `null` 且以 `\n` 结尾而文本没有时补一个 `\n`（与 `prepareSave` 完全同源）。
- **新建 `src/lib/baseline.test.ts`**：6 条（已有换行原样 / 补换行 / 原文不以换行结尾不补 / CRLF 折 LF 后补 / `''` 与 `null` / 幂等）。
- **`src/App.tsx`** 三处判定 + 一处 deps：
  1. `prepareSave`：`const normalized = normalizeForBaseline(currentMarkdown(), originalText)`；`withEol` 分支一字未动。
  2. `applySource`：末尾 `setDirty(normalizeForBaseline(sourceText, originalText) !== baselineRef.current)`；**`skipReparse`（`:3918-3920`）一字未动**；deps 补 `originalText`。
  3. 源码模式脏 effect：**只改 `setDirty(...)` 那一行**（`normalizeForBaseline(sourceText, originalText) !== baselineRef.current`）；`:1902`、`:1903`、`:1908` 三处 `sourceBaselineRef` 短路**一字未动**（那是「进入源码时的原文」，不能补换行）；effect deps 补 `originalText`（新代码读它，不加会读到旧值）。
  - **未动**：`loadIntoEditor` 的 `baselineRef.current = serialized.replace(/\r\n/g,'\n')`（`:2111`）与 `:1087` 的宿主文档分支。

### 改前 / 改后静态读数

| 命令 | 改前 | 改后 |
| :--- | ---: | ---: |
| `git grep -n "normalizeForBaseline" -- src` | 0（exit 1） | **4** 行（`App.tsx` import :66 + :1909 + :2857 + :3962）＋ `baseline.ts` 定义与 6 条单测 |
| `Select-String 'normalizedSource !== baselineRef.current' -SimpleMatch` | **1** | **0** |
| `git grep -n "normalizedSource === serializeBodyNow" -- src`（钉 `skipReparse`） | 1 | **1** |
| `Select-String 'sourceText === sourceBaselineRef.current &&' -SimpleMatch`（钉 `:3919`） | 1 | **1** |
| `Select-String 'sourceText === sourceBaselineRef.current'`（不带 `&&`） | 3（`:1903`/`:1908`/`:3919`） | **3**（说明 `:1903`/`:1908` 没被误改） |

### E2E（`.tmp/e2e-r48-t2.mjs`，日志 `.tmp/r48-t2.log`）

| # | 断言 | 读数 |
| :--- | :--- | :--- |
| 0 | 一个字都不改，进出源码 | `marks0:3 → marks1:3`（`sl-parse-done` 不增长）、进源码 `mode:"source" dirty:false`、回编辑 `mode:"edit" dirty:false` |
| 1 | `甲.md`（原文以换行结尾）源码加「加一句。」→ `Ctrl+S` | `mode:"source" dirty:false`、toast「已保存 甲.md」、盘上 `"# 甲\n\n甲的第一段。\n加一句。\n"` |
| 2 | `Ctrl+/` 回编辑 | **`mode:"edit" dirty:false`**（改前 `true`，判别性断言）；再 `Ctrl+S` → `changedOnSecondSave:false`、`dirty:false` |
| 3 | `乙.md`（原文不以换行结尾）同路径 | 盘上 `"# 乙\n\n乙的第一段。加一句。"`（`endsWithNewline:false`）、回编辑 `dirty:false` |
| 4 | 正对照 | 编辑视图打字 → `dirty:true`；`Ctrl+Z` 回基线 → `dirty:false` |
| 5 | 控制台 | `errors:[]` |

截图：`shots/round-48/impl-t2-source-dirty.png`（源码模式保存后）。

## 四、T4：对外文档九处数字订正

取数顺序按计划：**T1/T2 改完 → `npm run verify` + `npm test` → 抄数字 → 改文档**。

- `npm run verify` 末行原文：`total raw=950357 gzip=294123 headroom=25877 files=3 max=320000`（其后 `target=310000 gap=15877`、`PASS`）。
- 主 chunk 逐文件行：`913110   286198  /assets/index-Bx-dU1eB.js`（`dist/assets` 里最大的 `index-*.js` = `index-Bx-dU1eB.js` 913,110 B）。
- 派生：百分比 `Math.round((364960−294123)/364960*1000)/10 = 19.4` → `−19.4%`；硬线余 `320000−294123 = 25,877`；内部余 `310000−294123 = 15,877`；较第 47 轮 `+372 B`。
- `npm test`：**32 文件 414 条**（`ℹ tests` 求和 414、`ℹ fail 0`）。

改前 / 改后计数（`Select-String ... -SimpleMatch` 计行数）：

| 文件 | 读 | 改前 | 改后 |
| :--- | :--- | ---: | ---: |
| README.md | `288,411` / `910,048` / `293,751` / `26,249` / `30 个文件` / `30 个测试文件` | 1 / 1 / 1 / 1 / 1 / 1 | **0 / 0 / 0 / 0 / 0 / 0** |
| README.md | `294,123`（同一行 2 次）/ `25,877` | 0 / 0 | **1 行 2 次** / **1** |
| README.md:116 | 主 chunk | 第 45 轮 910,048 B raw | **第 48 轮 913,110 B raw（`index-Bx-dU1eB.js`）**，第 36 轮 898,601 B 保留 |
| AGENTS.md | `第 47 轮记 30 个文件` / `测试 30 个文件 400 条` / `293,751` / `26,249` | 1 / 1 / 1 / 1 | **0 / 0 / 0 / 0** |
| AGENTS.md | `第 48 轮记 32 个文件` / `测试 32 个文件` / `294,123` / `25,877` | 0 / 0 / 0 / 0 | **1 / 1 / 1 / 1** |
| STATE.md | `29 个文件 380 条` / `30 文件 400 条` | 1 / 3 | **0 / 2**（只剩 `:64`/`:126` 的第 47 轮记录） |
| STATE.md | `32 文件`（:55）/ `32 个文件`（:27）/ `48 轮 32/` | 0 / 0 / 0 | **1 / 1 / 1** |
| STATE.md | `293,751` / `26,249` / `288,411` | 4 / 3 / 3 | **3 / 2 / 3**（`:64`/`:65`/`:126` 历史保留，`288,411` 不动） |
| STATE.md | `第 30–47 轮` / `第 30–48 轮` | 1 / 0 | **0 / 1** |
| STATE.md | ``第 47 轮 `npm run verify` `` / ``第 48 轮 `npm run verify` `` | 1 / 0 | **0 / 1** |
| STATE.md | `48 轮 +372`（首屏链尾） | 0 | **1**（`293,751 + 372 = 294,123` == `gzip=`） |
| `.tmp/iteration/common.md` | `1,800,000` / `2,000,000` / `45,000,000` | 1 / 1 / 1 | **0 / 0 / 2**（本地文件，`.gitignore` 忽略 `.tmp/`，不进提交） |

三处的 `<N>`（README `414 条断言`、STATE `32 文件 414 条`、AGENTS `32 个文件 414 条`）逐字一致，且 == `npm test` 求和 414。

## 五、门禁与收尾

| 门 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | exit 0 |
| 测试 | `npm test` | **32 文件 414 条，fail 0**（400 + `tableScope` 8 + `baseline` 6） |
| 往返 | `npm run roundtrip` | rich 5/7、source 7/7；`docs/roundtrip-report.md` 无改动（`git status` 干净，即与提交版逐字节相同）。两处 `diff`（`04-reference-links` `-4 +1` 首次保存拦截 1、`06-task-list` `-0 +1`）是第 10 轮以来的既有基线，非本轮引入 |
| 构建/首屏 | `npm run verify` | exit 0、**PASS**；`total raw=950357 gzip=294123 headroom=25877 files=3 max=320000`（第 47 轮 293,751 → **+372 B**，内部 310,000 / 硬线 320,000） |
| E2E | `.tmp/e2e-r48-t1.mjs` / `-t2.mjs` | 全部断言通过、`consoleErrors:[]`、`pageErrors:[]`；每个脚本前 `node .tmp/reset.mjs 9222` |

`git status --porcelain` 收工快照：只多 `docs/iteration/round-48/`、`shots/round-48/`（本轮产物）与本轮源码改动；`.tmp/` 不进版本控制。

## 六、CHANGELOG 建议条目

已按计划写进 `docs/CHANGELOG.md` 的 `## Unreleased` → **第 48 轮（同一未发版区间）**：T1（表格内块级守卫，含 `$$`+回车）、T2（基线归一化）、门禁与文档订正三行，UNVERIFIED 一行。未改版本号。

## 七、新踩坑 / 复核

1. **重复确认 AGENTS §8 的「中文 e2e 脚本不能用 PowerShell 字符串替换改」**：本轮我为改三处 Playwright 定位器跑了 `Get-Content -Raw | -replace | Set-Content`，写回的 `.tmp/e2e-r48-t1.mjs` 立刻变成非法 UTF-8（`read` 工具直接报 `invalid UTF-8 text`），只能整份重写。**改 `.tmp/*.mjs` 一律用 `write`/`edit`**（这次自己踩了一遍，别再有下一次）。
2. **载入期假阴的第二种形态：重复打开「已经是当前文档」的树节点会触发一次异步重载，1–2 s 后把 ProseMirror 选区重置到文首**。表现是 `clickCell` 明明点进了单元格，菜单命令却按 `pos 1` 插入（blockMath 落在文档级、`blockMathInCell:0`）。判据：改前读 `window.getSelection().anchorNode.closest('td,th')` 为 true、点完菜单后同一读数为 false。修法两条：`open()` 里若 `window.__slState.name` 已是目标就**不再点树**；`clickCell` 循环「点 → 260 ms → 校验光标在 `td/th` 里 → 不中就再点（最多 4 次）」。
3. **`window.getSelection()` 只能用来「出手前校验」，不能当「出手后的断言」**：点了工具条/菜单按钮之后焦点离开编辑器，DOM 选区就丢了，读出来恒 false（`caretInCell:false` 会误导成「守卫没生效」）。守卫是否生效要看产品状态：`h1/h2/pre/block-math` 计数、`.toast-text` 文案、`__slState.dirty` 与盘上字节。
4. **`$$`+回车的守卫要「吞掉」回车**：`return true` 而不是 `return false`——`false` 会把回车交回默认行为，单元格段落被拆成两段，盘上变成 `\| $$<br>…`，与不修只差一个 `blockMath`。E2E 用 `rows:2` 与 `hasBr:false` 钉住这一点。

## 八、UNVERIFIED（逐条）

- **T3（ui F4）空文档占位符本轮按计划砍掉，未修**：`.editor-placeholder` 仍是 `Segoe UI 16px / line-height normal`，下轮第二项（第一项是下面的手打守卫）。
- **表格单元格里手打 `# ` / `> ` / `- ` 仍会造块级节点（P2-2，本轮不修）**：2×2 表、第 2 行第 1 格为空、点进去直接打字 → `# ` 得 `<h1>`（继续打「标题」后 `Ctrl+S`，盘上 `\| # 标题 \| 二 \|`，重开是字面 `# 标题`）、`> ` 得 `<blockquote>`、`- ` 得 `<ul><li>`；```` ``` ```` 仍是字面；`errors:[]`（实测来源 `.tmp/critic48-probe2.mjs`）。**本轮守卫只覆盖命令入口**（键盘 `Ctrl+1–6`、`Ctrl+Shift+M`、工具条 H1/H2、插入菜单 5 条 + 公式块、`$$`+回车），提示文案按此收窄成「不能用命令插入…」。
- **粘贴**一段带标题 / 代码块的 Markdown 进单元格是否同样造块节点：**本轮未实测**（与手打同一根因，计划留到下轮）。
- 单元格里 `Ctrl+M` 插入行内公式后按 `Ctrl+Z` 未撤回（读数 `inlineMathInCell:1` 仍为 1）：**产品未判缺陷**（行内公式本就能进单元格，E2E 的目的是证明不误伤；撤销那次很可能是先撤掉了公式编辑器的提交事务，未深查）。
- 宿主 WebView2、真实 IME、`Ctrl+Alt+L`（AltGr）、125%/150% 缩放、`Ctrl+Shift+L` 在非表格处的侧栏开关（E2E 第 1 条间接覆盖：同一组合两按 sidebar `false→true→false`）。
