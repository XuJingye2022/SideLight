# 第 48 轮 · 计划审查（critic，只读）

> **revision 3（复核 rev-2，2026-11-17）**：本文件**替换**上一版审查（revision 2，对象是 `plan.md` rev-1）。本轮审查对象是 `plan.md` **rev-2**（284 行，§七 有 rev-1/rev-2 两张对照表）。上一版 4 条**全部修掉**（§一，逐条实测）；rev-2 新发现 **4 条**（P1 × 1、P2 × 3，见 §二/§三）。
>
> - 轮次：`round=48`、`nn=48`；轮前 `startSha=5673b1dee5623cc72fe87b37d563c1d7444224ff`（`git rev-parse HEAD` 实测同值；收工时 `git status --porcelain` 仍只有 `?? docs/iteration/round-48/`、`?? shots/round-48/`）。
> - 输入：`plan.md`（rev-2）、上一版 `plan-review.md`、5 份 `findings-*.md`、`AGENTS.md` §4/§8、`docs/iteration/STATE.md`、`README.md`、`package.json`、`src/App.tsx`、`src/lib/mathInput.ts`、`src/components/{ShortcutsDialog,MathInlineEditor}.tsx`、`node_modules/@tiptap/extension-mathematics/dist/index.js`、`.tmp/r48-i.log`、`.tmp/critic48-probe2.mjs`、`.tmp/r30-fsa.mjs`。
> - 只读：未改产品代码、未改 dev server、未 commit/push、未碰 `release/`。新增一个探针 `.tmp/critic48-probe3.mjs`（`.gitignore:8` 忽略 `.tmp/`，不进提交）。
> - 本轮连了 **CDP 9222** 实测（和上一版一样，为了验证「单元格里还能不能造出 blockMath」）：E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`。
> - 结论：**REVISE**，4 条（P1 × 1、P2 × 3）。

## 〇、一句话结论

rev-2 把上一版的 **P1-1（公式块是块节点）真修了**：负结果改正、4 行守卫的位置/deps 与实测行号逐条对上、两个入口各配一条断言、+3 min 有抵消，不是又改一遍文字。

**但同一种失败模式出现第三次**：`$$` + **回车**（`src/lib/mathInput.ts:61-112` 的 `Enter` 快捷键）在表格单元格里直接 `insertContentAt` 一个 `blockMath`（`:84`），**完全绕过** `openMathAtCursorRef`——本轮 4 行守卫管不到。实测：单元格里打 `$$` 回车 → `blockMathInCell:1`，`Ctrl+S` 盘上 `| $$<br><br>$$ | 二   |`；再打 `z` 回车提交 → 盘上 `| $$<br>z<br>$$ | 二   |`。计划 §五的 UNVERIFIED 只列了 `# `/`> `/`- `/```` ``` ````，没列这条；E2E 第 6 条又会以「盘上不含 `$$`」通过。按计划执行，impl 写「公式块两入口已封」是字面属实，但读者会以为单元格里已经造不出 blockMath。

## 一、上一版 4 条：全部修掉（复核证据）

| 漏洞 | 判定 | 复核证据 |
| :--- | :--- | :--- |
| **P1-1（新）** 公式块是块节点，rev-1 写成行内且要求「不要套守卫」 | **已修** | ① 负结果改正：`plan.md:38` 现在写「图片 / **行内**公式 / 链接不套；**公式块是块节点必须套**」，与实测一致（`@tiptap/extension-mathematics/dist/index.js:24-26` `group: "block"`、`:87-93` 的 `renderMarkdown` 输出三行 `$$…$$`；`inlineMath` 才是 `:205-206` `group: "inline"`）。② 改法落地：`plan.md:74-82` 的 4 行守卫插在 `App.tsx:4299`（`viewMode` 早返回）之后、`:4307`（`coordsAtPos`）之前，deps（`:4325` `[editor, viewMode]`）补 `selectionInTable, show`——**一处同时盖「插入→公式块」`:4746` 与 `Ctrl+Shift+M` `:3748`**，这两处实测逐字与计划相同；`ShortcutsDialog.tsx:34` 确写「编辑或插入块级公式」。③ 判据可复现：`.math-inline-input` 只在弹层里（`MathInlineEditor.tsx:66`，块级是 `textarea`），E2E 的 `mathPopups = textarea.math-inline-input` 口径成立；toast 选择器 `.toast-text` 在 `App.tsx:5146`。④ 预算：T1 14→17、T2 11→10、门禁 6→4 = 35，算对了。**唯一残留**是同一节点的第三条入口，见 **P1-1（新，rev-2）** |
| **P2-2（新）** 手打 `# `/`> `/`- ` 实测造块节点，rev-1 写「未实测」 | **已修**（取 (b) 披露档） | `plan.md:209` 新增 §二首行（本轮不修＋两条候选的代价）；`:251` §五 UNVERIFIED 写三条读数与 `errors:[]`、粘贴标「本轮未实测」；提示文案按 (b) 收窄成「不能用命令插入标题或块级内容」（`:68`、`:109` 静态钉同步换串）；`:256` §六第 1 项。**但披露清单没有覆盖 blockMath 的 `$$`+回车 路径**，见 P1-1（新） |
| **P2-3（新）** 静态钉 `sourceText === sourceBaselineRef.current` 写「=1」实测 3 | **已修** | 实测（`Select-String`）：不带 `&&` 的原串 3 处 = `App.tsx:1903`、`:1908`（源码脏判断的两个短路）、`:3919`（`skipReparse` 第一条件）——与 rev-2 的说明逐字相同；`plan.md:155` 改成唯一串 `'sourceText === sourceBaselineRef.current &&'` → 改前 1（`:3919`）/改后 1；`normalizedSource === serializeBodyNow` 改前 1（`:3920`）→ 改后 1；`normalizedSource !== baselineRef.current` 改前 1（`:3936`）→ 改后 0。可复现 |
| **P2-4（新）** STATE:55 漏两个轮次标签 | **已修** | 实测两个短语全文件各 **1** 处且都在 `:55`：`第 30–47 轮`=1、`第 47 轮 \`npm run verify\``=1（`:64`/`:126` 不含）；`plan.md:167`/`:179`/`:197` 补了落点与两条 `Select-String` 验收（改前 1 → 改后 0，新值各 1）。可复现 |

## 二、P1-1（新，rev-2）：`$$` + 回车在单元格里造 blockMath，绕过本轮 4 行守卫，存盘同样丢结构

**证据链**

1. **代码路径**：`src/lib/mathInput.ts` 的 `MathInputRules.addKeyboardShortcuts().Enter`（`:61-112`）只判三件事——不是草稿（`:64`）、选区为空（`:66`）、当前段落文本是 `$$`（`:68`）；然后 `insertContentAt({ from: start, to: end }, { type: 'blockMath', attrs: { latex: ' ' } })`（`:82-85`）。**它不经过 `openMathAtCursorRef`**，所以 rev-2 的 4 行守卫对这条路径完全无效。节点本身仍是 `group:"block"`（`extension-mathematics/dist/index.js:26`）。
2. **实测（改前 = 当前代码；`.tmp/critic48-probe3.mjs`，CDP 9222、`reset` 后假工作区、种子 `# 空格` + 2×2 表、点进空单元格）**：
   - `## b-cell-dollar-enter`：打 `$$` → 回车 → `{blockMathInCell:1, blockMathAll:1, mathPopups:1, toast:null, dirty:true}`，`Ctrl+S` 盘上 **`| $$<br><br>$$ | 二   |`**；
   - `## e-cell-dollar-enter-commit`（真实用户路径）：`$$` → 回车 → 打 `z` → 回车提交 → 单元格里是 latex `z` 的 `block-math`，`Ctrl+S` 盘上 **`| $$<br>z<br>$$ | 二   |`**；
   - `errors:[]`，全程无提示（没有「表格」相关文案）。
   - 空公式也不会自己消失：`App.tsx:4499` 的注释写明「内容为空时保留这个公式块：刚打 $$ 回车建出来就被失焦删掉，用户会以为没生效」——所以 Esc/失焦后仍是块节点，存盘一样丢结构。
3. **负对照（证明只有这一条额外入口，不用扩防线）**：`## a-cell-typed-dollar-block` 打 `$$x^2$$` → `blockMathInCell:0`、单元格变 `$` + **行内**公式 + `$`、盘上把打进去的字原样写成 `| $$x^2$$ | 二   |`（无 blockMath、无结构丢失）；`## d-cell-typed-triple-dollar` 打 `$$$x^2$$$` → 同样 `blockMathInCell:0`、盘上原样 `| $$$x^2$$$ | 二   |`（行内规则先命中，块级输入规则在单元格里根本没机会跑）。**所以只需堵 Enter 一条，不用改 `mathInput.ts` 的两条输入规则。**
4. **为什么是 P1（数据损失类，既有缺陷、非本轮引入）**：与上一版 P1-1 是同一种失败模式——计划在「公式块两入口」上做对了，但同一个节点还有一条 3 键可达的入口，且 §五 的披露清单没写它；E2E 第 6 条只断言「点菜单 / `Ctrl+Shift+M` 后盘上无 `$$`」，会通过；impl 若写「T1 已修」，下一轮 finder 会拿这条打回。

**修法（4 行产品代码 + 1 组 E2E 读数）**

1. `src/lib/mathInput.ts` 的 Enter 快捷键：在 `if (!blockMath) return false`（`:70`）之后、`insertContentAt`（`:82`）之前加 4 行——把 `$from` 的祖先节点名收进数组，命中 `table/tableRow/tableCell/tableHeader` 就 **`return true`**（吞掉这一下回车：既不 insert，也不让默认回车把单元格段落拆成两段）。判据直接复用本轮新建的 `tableScope.ts` 的 `inTableAncestry`（`src/lib` → `src/lib`，无环、无新依赖），避免两套判据漂移：
   ```ts
   const names: string[] = []
   for (let depth = $from.depth; depth > 0; depth -= 1) names.push($from.node(depth).type.name)
   if (inTableAncestry(names)) return true
   ```
   顺手可见性（可选、+1 min）：给 `MathInputRules` 的 options 加 `onBlockedTable?: () => void`，在 `return true` 前调一下；`App.tsx:813` 的 `configure` 传 `() => show('表格单元格里不能放块级公式：Markdown 表格只装行内内容')`，与另两条守卫的文案同族，E2E 可断言 toast。
2. `.tmp/e2e-r48-t1.mjs` 加 1 组（可与第 6 条同一篇、同一页，只多 3 个动作）：点进 `一` → 打 `$$` → `Enter` → 停 500 ms → `{blockMathInCell:0, mathPopups:0}`、单元格文本是字面 `$$` → `Ctrl+S` → 盘上该行是 **`| $$ | 二   |`**（不是 `$$<br>…`）、重开 `blockMathInCell:0`。**别写 `diskSame:true`**——这条要打字，盘上必然与种子不同（`diskSame` 只对第 6 条那种「只看不写」的路径成立）。若做了上面那条 toast，再加「toast 含 `块级公式`」。
3. **预算**：T1 17 → 19（加 toast 20）。抵消建议：把 E2E 第 5 条（插入菜单→代码块）折进第 4 条同一页/同一会话（静态计数 9 已钉住 5 个菜单项的接线，少一次重开篇目的等待，约 −1 min）→ 36–37 min，落在上一版评审已允许的 **36–38** 口径内。**若坚持 35 min 顶格**：可以只披露不修——把 `## b`/`## e` 两条读数写进 §五 UNVERIFIED，并把 T1 的结论句收成「命令入口与 `Ctrl+Shift+M` 已封，`$$`+回车仍可造 blockMath」，**impl 不许写「块级公式已封」**；§六第 1 项（`plan.md:256`）扩到 `mathInput.ts:82`。

## 三、P2 漏洞（3 条）

### P2-2（rev-2 新）守卫插入点两处说法互相矛盾：按 `:74` 的字面插会落在 `nodeAt` 早返回**之前**

- `plan.md:74` 写「在 `if (viewMode !== 'edit') return`（`:4299`）**之后**、`const coords`（`:4307`）**之前**插 4 行」；`plan.md:110` 的负对照又写「`selectionInTable` …**必须**在 `:4301-4306` 那段 `nodeAt` 早返回**之后**」。实测 `App.tsx`：`:4299` viewMode 早返回 → `:4300` 取 `from` → `:4301-4306` `nodeAt` 早返回（命中 math 就打开就地编辑）→ `:4307` coords。按第一处的字面读法会插到 `:4300` 之前，与第二处直接冲突。
- 后果（不是纯文字问题）：光标落在**已有公式节点**上时（包括单元格里的行内公式——`nodeAt(from)` 会命中），行为会从「打开公式编辑器」变成「弹提示」。
- **修法**：把 `:74` 的插入点写成「`:4306` 之后、`:4307` 之前（即 `if (block && selectionInTable())` 必须排在 `nodeAt` 早返回之后）」，删掉「`:4299` 之后」这句；`:110` 保持不变。

### P2-3（rev-2 新）T2 步骤 3 的「相等短路都改用 `normalizeForBaseline`」与同段「两处留在原串上」自相矛盾

- `plan.md:134` 原文：「源码模式的脏判断（`:1903-1907`）：`setDirty(...)` 与**相等短路都改用** `normalizeForBaseline(sourceText, originalText)` 的结果，并把 `sourceText === sourceBaselineRef.current` 的两处留在原串上」。但 `:1903-1907` 里的相等/不等短路恰好就是 `:1903`（`===`）、`:1908`（`===`）与 `:1902`（`!==`）——「都改用」和「留在原串上」指的是同一批行，执行代理只能猜。
- 后果：`:1903` 比的是**进入源码时放进框里的原文**（`sourceBaselineRef`，`switchView` 在 `:3956` 赋值），它不补末尾换行；把 `normalizeForBaseline` 套上去会让「刚进源码、一个字没改」在原文以 `\n` 结尾而框内文本不以 `\n` 结尾时短路失效，落进 `:1905` 那条与保存基线比的支路 → 误报脏（验收第 0 条会红，但执行代理可能先怀疑产品）。
- **修法**：写明**只改 `:1906` 那一行** `setDirty(...)`；`:1902`、`:1903`、`:1908` **一字不动**，并给一句理由（`sourceBaselineRef` 是「进入源码时的原文」，不能补换行）。验收第 0 条（未改字进出源码 `dirty:false`）正好钉住它。

### P2-4（rev-2 新）STATE:55 的**首屏历史链**漏了 48 轮项，改完会算不平

- `STATE.md:55` 的首屏链是 `第 30 轮 284,529 → … → 47 轮 +546`，我验算过：284,529 + 232 + 291 + 839 + 46 + 119 + 2,200 + 155 + 1,019 + 591 + 702 + 449 + 280 + 635 + 26 + 498 + 546 = **293,751**，正好等于当前值。本轮 gzip 必变，`plan.md:166` 也知道「+546 历史链」要跟，但 `:179` 的落点表只写了「历史链追加 `48 轮 32/<N>`」（那是**测试**链），`:194-197` 的验收也只钉 `48 轮 32/`、没钉首屏链。
- 后果：改完 `:55` 会出现「当前 gzip 变了、链尾还停在 47 轮 +546」——链算不平，与 AGENTS:39 改成「第 48 轮记 32 个文件」的同一类左右矛盾（就是上一版 P2-2/P2-4 点过的失败模式）。
- **修法**：`:179` 的 STATE:55 一格补「首屏链尾追加 `→ 48 轮 +X`，X = 新 gzip − 293,751（与 README:114 同一个派生值，别单独四舍五入）」；验收 4 加一条：`48 轮 +` 改前 0 → 改后 1，且 `293,751 + X == npm run verify 的 gzip=`。

## 四、其余核对（正结果，给执行代理省时间）

1. **rev-2 引的锚点我逐个核过，全部成立**：`App.tsx:822-829`（inTable 深度循环，判的正是 `table/tableRow/tableCell/tableHeader`）、`:836-840`（删行分支无 `shiftKey`/`altKey`）、`:3591` 起 window keydown effect、deps `:3813-3834`（`show` 已在 `:3828`）、标题分支 `:3756-3760`、段落分支 `:3762`、侧栏 `:3785-3789`、`run()` `:3889-3896`、工具条 H1/H2 `:4771`/`:4781`、插入菜单 5 条 `:4709/4712/4715/4718/4721`、图片/公式/公式块/链接 `:4724-4759`、行内 B/I/S/代码 `:4790-4801`、表格工具条（`div.table-bar`）7 个 onClick `:4899-4918`、`show` `:393`、`setMenuOpen` `:412`、`editor`（`useEditor`）`:780`。
2. **正向对照有牙**：`只有编辑视图支持` = **10** 行，行号与计划写的 `:4566/4700/4770/4780/4791/4795/4798/4801/4813/4822` 逐条相同。
3. **T4 的改前读数我重新跑了一遍，与计划 §一验收 1 逐条相同**：README `288,411`=1、`910,048`=1、`293,751`=1、`26,249`=1、`30 个文件`=1、`30 个测试文件`=1；AGENTS `第 47 轮记 30 个文件`=1、`测试 30 个文件 400 条`=1、`293,751`=1、`26,249`=1；STATE `29 个文件 380 条`=1、`30 文件 400 条`=3、`293,751`=4、`26,249`=3、`288,411`=3；`common.md` 的 `1,800,000`/`2,000,000` 各 1（都在 `:36`）。`package.json` 的 `test` 链实测 **30** 条（逐文件写死，`:15`）→ 加两个文件是 32。
4. **「`verify` 内含 `build`」成立**：`package.json:13` = `npm run build && node scripts/measure-first-screen.mjs`，收尾不再单跑 build 的口径对。
5. **T2 的根因链对得上**：`finishSaved` 在 `:2655` `setDirty(false)`、`:2631` 写 `baselineRef.current = normalized`、`:2643` `setOriginalText(withEol)`；源码脏 effect 的 deps 是 `[sourceMode, sourceText]`（`:1914`），保存后不会重跑——所以 finder 的「源码里 `saved dirty:false`」与「回编辑 `dirty:true`」可以同时成立；`applySource` 的比较在 `:3936`，`skipReparse` 在 `:3918-3920`。`乙.md`（原文无末尾换行）用 `normalizeForBaseline` 的「不补」分支，口径正确。
6. **硬约束**：两个新模块都是纯函数小文件，不碰 Tiptap schema / 序列化 / 批注协议 / 无新运行时依赖；首屏余量 16,249 B，改动量级（几百 B）不会破 310,000/320,000；不动版本号、不碰 `release/`。
7. **环境事实**：dev server `localhost:5175` 在跑（未另起、未重启）；CDP 9222 可用，跑了 1 次 `node .tmp/reset.mjs 9222` + 3 次探针运行（场景 `a`–`e`，共 5 组读数），未启/未 kill 浏览器；`git rev-parse HEAD` = startSha。

## 五、给执行代理的几句话

1. **先做 rev-2 的 4 行公式块守卫**（`openMathAtCursorRef` 里、插在 `:4306` 之后），它同时盖「插入→公式块」与 `Ctrl+Shift+M`；再顺手堵 **`mathInput.ts` 的 Enter**（§二 P1-1，4 行，判据复用 `tableScope.ts`），两条读数一起跑。
2. **披露口径要窄**：没堵住 `$$`+回车 之前，不许写「块级公式已封」；§五 UNVERIFIED 按最终决定补读数和范围。
3. **T2 只动 `:1906` 一行** + `prepareSave`/`applySource` 三处；`:1902/:1903/:1908` 与 `:2108`/`:1087` 一字不动，`skipReparse`（`:3918-3920`）原样。
4. **T4 等 `npm run verify` + `npm test` 跑完再抄数字**；除九处外，STATE:55 的**首屏链尾**补 `→ 48 轮 +X`（§三 P2-4）。
5. 其余照计划：`!shiftKey && !altKey`、不 `stopPropagation`、`Ctrl+0` 不改、鼠标守卫前点格子停 200–250 ms、`page.close()` + `process.exit(0)`、收尾 `npm test` → `npm run roundtrip` → `npm run verify`。
