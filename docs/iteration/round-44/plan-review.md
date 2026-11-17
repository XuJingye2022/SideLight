# 第 44 轮 · 计划审查（critic，只读）

- 轮次：`round=44`、`nn=44`；轮前 `startSha=d22807f4361a32d06a49f6645d610511f3ce7bb7`。本文件只做审查，未改产品代码、未改 `docs/iteration/STATE.md`、未 commit、未 push、未碰 `release/`。
- 本地实测 `git rev-parse HEAD` = `d22807f`；`git status --porcelain` 只有 `?? docs/iteration/round-44/` 与 `?? shots/round-44/`（计划头部声明属实）。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9222**（未启动 Edge、未 kill `msedge`、未 `browser.close()`）；每次探针前跑 `node .tmp/reset.mjs 9222`。
- 审查对象：`docs/iteration/round-44/plan.md`（42 KB，一次成型，**没有上一版**，因此 §一 改为「计划硬事实的实测核对」，无上一版漏洞可复追）。
- 证据：源码行号（`read`/`grep` 实读）、第三方源码实读、两次浏览器探针 `.tmp/critic-r44-probe.mjs`（日志 `.tmp/critic-r44-probe.log`）、`.tmp/critic-r44-probe3.mjs`（日志 `.tmp/critic-r44-probe3.log`）。

## 结论：**REVISE**（2 × P1 + 4 × P2）

计划的三条任务都值得做，T1/T2/T3 的技术路线**实测站得住**（§一）。但有两条 P1 会让执行代理「做完却看起来失败」或「失败时吃掉用户字符」，必须先改计划文字再开工；四条 P2 各是 1–2 行的修法。修改量小，不改任务划分、顺序与预算。

## 一、先说好消息：计划的核心机制已用浏览器实测确认

我不是只看代码。下面 4 个读数来自 CDP 9222 上的真实应用（日志 `.tmp/critic-r44-probe.log`、`.tmp/critic-r44-probe3.log`）：

| 探针 | 读数 | 对计划的意义 |
| :--- | :--- | :--- |
| 手打 `- [ ] 甲`（改前基线） | `{"taskLists":0,"taskItems":0,"checkboxes":0,"plainUls":1,"text":"…[ ] 甲"}`；源码态 `"# 甲\n\n甲的正文。\n\n- \\[ \\] 甲\n"` | 计划的「为什么」（§二 现状）成立：普通列表 + 字面 `[ ]` + 写盘 `\[ \]`。**注意**：自动配对开着时逐字符打 `- [ ] ` 也能得到同样的文本，计划 §七 的 `keyboard.type('- [ ] 甲')` 写法可照用 |
| 插入 ▾ → 任务列表（普通段落） | `{"taskLists":1,"checkboxes":1}` | **计划依赖的 `toggleTaskList()` → `wrapInList(taskList)` 能把分段包成 `taskList > taskItem`**，`findWrapping` 会补中间层，主路线可行（不必提前启用「手工事务兜底」） |
| 同一文档 Ctrl+S | 盘上字节 `"…- [ ] 乙项\n"` | 「**不动序列化**」（plan §二.3）成立：`taskItem.renderMarkdown` 直接写 `- [ ] ` |
| 任务项真实 DOM | `liSelectorCount: 0`；`ulOuter` = `<ul data-type="taskList"><li data-checked="false"><label…><input type="checkbox"><div><p>丙项</p></div></li>`；`tagNames: ["LI:-"]` | **`li` 上没有 `data-type` 属性**（TaskItem 走 NodeView，只写 `data-checked`）→ 见漏洞 R44-1 |

计划的第三方源码引用也逐条对过：`@tiptap/extension-task-item` 只是 `@tiptap/extension-list` 的再导出（`node_modules/@tiptap/extension-task-item/dist/index.js:1-4`），所以计划引 `extension-list/dist/task-item/index.js` 是对的；`taskItem` 的 `content()` 在 `nested:true` 下是 `"paragraph block*"` 且**无 `group`**（同文件 `:154-168`），内置规则 `inputRegex` `:142` + `addInputRules` `:314-320` 在 `listItem` 里 `findWrapping` 失败、`wrappingInputRule` 返回 `null`（`node_modules/@tiptap/core/dist/index.js:7470-7473`）；`applyRule` 的契约（`:5194-5201`）、输入规则按扩展 `priority` 降序注册（`:5660-5696` + `:1758-1767`）、Tiptap 3 的 `range` 已含刚输入字符（`:5186-5189`）都与计划一致；`escapeMarkdownSyntax` 转义 `[` `]`（`node_modules/@tiptap/markdown/dist/index.js:1099-1101`）；`taskList.renderMarkdown` 拼子项（`extension-list/dist/task-list/index.js:35-38`）。

## 二、漏洞（按严重度，最多 6 条）

### R44-1（P1）T1 的验收选择器 `li[data-type="taskItem"]` 在真实 DOM 里 0 命中

**位置**：plan 第 114 行（U1）、第 117 行（U4）、第 118 行（U5）、第 121 行（U8）。

**为什么错**：TaskItem 有 NodeView（`node_modules/@tiptap/extension-list/dist/task-item/index.js:239-311`），只设 `li.dataset.checked = node.attrs.checked`（`:276`），**不写 `data-type`**；`data-type="taskItem"` 只出现在无 NodeView 时的 `renderHTML`（`:190-203`）。实测（`.tmp/critic-r44-probe3.log`）：`liSelectorCount: 0`、`liAttrs: ["data-checked=false"]`、`tagNames: ["LI:-"]`。

**后果**：U1/U4 的「`li[data-type="taskItem"]` 应为 1 / 2」在功能**完全正确**时也读 0。执行代理会以为「产品没修好」，在 35 分钟预算里白跑一轮，甚至改坏正确实现。

**修法**（实测可用）：把两处选择器换成
- 任务项：`ul[data-type="taskList"] > li`（1 / 2 个）；
- 任务项正文：`ul[data-type="taskList"] li > div`（实测 `divText: "丙项"`，`div` 内是 `<p>`，不含复选框 a11y 文字）；
- 勾选态：读 `input[type=checkbox]` 的 `checked` **属性值**（DOM property）与 `li.getAttribute('data-checked')`（`"false"` / `"true"` 两种都断言过：探针里未勾选项是 `data-checked="false"`）。
U8 的「前者是 bulletList 的 li」用 `ul:not([data-type="taskList"]) > li` 即可。

### R44-2（P1）输入规则失败时必须 `return null`，否则会派发「只删 `[ ] `」的半截事务

**位置**：plan 第 65-80 行的 handler（`chain()…run()` 直接当返回值）。

**为什么错**：`applyRule` 的判定是 `if (rule.handler(...) === null || !tr.steps.length) return false`（`node_modules/@tiptap/core/dist/index.js:5194-5201`）。handler 返回 **`false`** 且 `tr` 里已有步骤时，**不返回 false**：它会继续 dispatch（`:5206-5214`）。而 `chain().run()` 在任一命令失败时返回 `false`，`deleteRange(range)` 的步骤**已经写进 `tr`**（`:85` 的 `createChain` 复用同一个 `state.tr`；`:87` 因为 `hasCustomState` 为真不会自己 dispatch，但步骤留在 tr 里）。于是 `liftListItem` 或 `toggleTaskList` 失败时，用户刚打的 `[ ] ` 被删掉、任务项没建出来——`- [ ] 甲` 变成 `- 甲`，**字符被吃掉**。这正是本轮唯一的数据安全任务，兜底必须写对。

**依据**：Tiptap 自己的 `wrappingInputRule` 就是这个写法——先 `tr.delete(range.from, range.to)`，`findWrapping` 失败就 `return null`（`:7470-7473`）。计划 §二 风险第 1 条已经提到「只删标记不转换」，但代码没有堵。

**修法**（1 行）：

```ts
const ok = chain()
  .deleteRange(range)
  .liftListItem('listItem')
  .toggleTaskList()
  .updateAttributes('taskItem', { checked })
  .run()
return ok ? true : null    // 失败时丢弃整个事务：文字保留为字面 `[ ] `，不会少字符
```

返回 `null` 时 `applyRule` 在 dispatch 前就退出，`inputTransaction` 也不派发，这次空格按默认路径插入——退化回改前行为（仍是 `\[ \]`，但至少不丢字）。可选加强：`can().liftListItem('listItem')` 预检，失败直接 `return null`。

### R44-3（P2）T2 的导出单测第二条断言没有鉴别力

**位置**：plan 第 232 行：「`html.includes('color: #1d2023')`」。

**为什么错**：`src/lib/export.ts:63` 的 `body` 规则**改前就写着** `color: #1d2023`。这条断言在改动前就为真，写不写打印块都通过。真正有牙的只有 `html.includes('@media print')` 与第 233 行的顺序断言——那两条只证明「有打印块、在深色块之后」，不证明打印块**改了颜色**。

**修法**：按位置切片后断言，例如
```ts
const at = html.indexOf('@media print')
assert.ok(at > 0)
const printBlock = html.slice(at, at + 400)
assert.match(printBlock, /body\s*\{\s*color:\s*#1d2023/)
```
或一条正则 `/@media print\s*\{[\s\S]{0,300}?color:\s*#1d2023/`。

### R44-4（P2）T2 的「照抄 `:root`」与计划给的三个值自相矛盾

**位置**：plan 第 157 行「值照抄 `:root`（`:1-33`）的浅色档」，第 237 行要求写注释「与 `:root` 的浅色档保持一致」。

**事实**：`src/styles.css:1-33` 是 `--paper: #f6f4ee`、`--paper-raised: #fffdf8`、`--panel: #f1eee6`；计划第 166-168 行给的是 `#fff` / `#fff` / `#fff`。其余 15 个变量确实逐字一致。也就是说**三个白底值是刻意的偏离**（打印纯白更省墨，正确），但计划同时要求在打印块上方写「与 `:root` 的浅色档保持一致」的注释——那句注释会是假的，后来的人照注释「对齐」反而把打印底改回暖灰。计划自己的 V2 断言（第 225 行「`--paper` 是 `#fff`」）也与这句注释冲突。

**修法**：把第 157 行改成「配色值照抄 `:root` 的浅色档，但 `--paper` / `--paper-raised` / `--panel` 用纯白（打印不必复制纸色）」；第 237 行的注释文案改成「与 `:root` 浅色档一致，仅三个纸色用纯白」。

### R44-5（P2）T3「插入 ▾」的 `title` 只列了 9 项菜单里的 7 项

**位置**：plan 第 268 行：`'插入：表格 / 代码块 / 引用 / 任务列表 / 图片 / 公式 / 链接'`。

**事实**：菜单实际有 9 项——表格、代码块、引用、任务列表、分割线、图片、公式、公式块、链接（`src/App.tsx:4654-4704`）。title 是「清单」而不是「举例」，漏两项就与菜单不符（同一个计划在别处把「列表写全」当规矩）。

**修法**：补成 `'插入：表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接'`；或改成不定项的说法（`'插入：表格、代码块、公式等'`）并同步 W1 的断言词。

### R44-6（P2）T1 少了「有序列表 `1. [ ] ` 保持字面」的负例断言

**位置**：plan 第 72 行（守卫 `$from.node(itemDepth - 1).type.name !== 'bulletList'` → `return null`）、第 129 行（「别为「顺手」把有序列表也转掉」）；验收 U1–U8（第 114-121 行）没有任何一条覆盖有序列表。

**为什么是缺口**：这条守卫是规则**唯一**的越界保护之一，而 U6 只测了 `- [链接](url)` 与 `[ ] 正文`。将来有人把守卫放宽成「任意列表都转」，现有断言全绿。

**修法**：U6 加一条 —— 另起一段打 `1. [ ] 甲`：`ol` 1、`ul[data-type="taskList"]` 0、该段文本含 `[ ] 甲`、保存字节含 `1. \\[ \\] 甲`（或直接比对源码视图字符串）。

## 三、逐条核对过、判无问题的点（别重复查）

- **计划引用的行号全对**：`src/App.tsx:773` `extensions: [`、`:791-792` `TaskList` / `TaskItem.configure({ nested: true })`、`:4643-4651` 插入 ▾、`:4710-4746` 七个按钮、`:4756`/`:4765` 专注/打字机、`:4519-4535` 分析按钮（`disabled` 在 `:4523`、`title` 在 `:4524`）、`:1372-1373` 守卫、`:1559` 依赖数组、`:1419-1424` `goalSeen`、`:1545-1547` 误导文案、`:4609` `window.print()`、`:5088` `.toast-text`。
- **计划引用的 grep 基线全对**：`git grep -c "只有编辑视图支持" -- src/App.tsx` = **2**（`:4756`、`:4765`）；`viewMode !== 'edit'` = **17**；`kind: 'meta' -- src/lib/ai.ts` = **1**（`:275`）；`@media print -- src/styles.css src/lib/export.ts` = **1**（`styles.css:1939`）；`color-scheme: light -- src/styles.css` = **1**（`:32`）；`TaskListInput -- src` = **0**；`没有安装器 -- packaging/README.txt` = **1**（`:45`）；`377 条 -- AGENTS.md` = **2**（`:39`、`:72`）；`292,046` = **2**（`README.md:114`、`AGENTS.md:74`）。改后目标值（9 / 19 / 2 / 2 / 2 / 3 / 0 / 0 / 0）与这些基线一致。
- **T3 的快捷键文案有据**：删除线只绑 `Mod-Shift-x`（`src/App.tsx:120-124`）；标题 Ctrl+1–6 在 `handleKeyDown`（`:3716-3721`，预览/源码里 `:3718` 直接 return）；B/I 来自 StarterKit 的 `Mod-b` / `Mod-i`。
- **T3 的根因成立**：`mockItems` 单句分支（`src/lib/ai.ts:263-272`）无 `meta`、多句分支有（`:274-277`）；`mockItems` 已导出（`:254`）；`MarginRail` 的前缀剥离正则 `/^我判断这段的意图是[：:]\s*/`（`src/components/MarginRail.tsx:84`）能匹配计划要复用的那句话；`.rail-goal` 在 `goal` 非空时渲染（`MarginRail.tsx:81-89`），且编辑视图无条件渲染 `MarginRail`（`App.tsx:5027-5028`），1440 宽下 `.rail-goal` 会进 DOM——W4 可读。
- **测试清单不用改**：`package.json` 的 `test` 是 29 个文件的显式串联，只往 `export.test.ts`（已 import `buildHtmlDocument`，`src/lib/export.test.ts:7-14`）与 `errorCopy.test.ts`（已 `import { errorCopy, ModelRequestError } from './ai.ts'`，`:4`）里加用例即可，文件数仍是 29、README `:133`/`:171` 的「29 个文件」不变。`errorCopy.test.ts` 加 `mockItems` 时记得补 import 与 `ContextPayload` 类型（`mockItems(context: ContextPayload)`）。
- **T2 的 CSS 落点成立**：`@media print` 在 `src/styles.css:1939-1970`，深色块在 `:36-62`、系统深色在 `:65-93`，打印块在文件更后面、同权重靠顺序胜出；`:root` 里没有别的 `--ink` 定义，打印块放进去就生效。三个选择器的权重关系计划算对了。
- **T1 的挂载点与 import 风格**：`App.tsx:47-79` 的 `./lib/*.ts` 都带扩展名，计划的新 import 写法一致；`priority: 1000` 在同一文件已有先例（`:761`）。
- **假工作区与脚本骨架存在**：`.tmp/r30-fsa.mjs`（`installFakeWorkspace` / `readFakeFile`）、`.tmp/e2e-r44-bug-d.mjs`（`connectOverCDP` + `openFolder` + `.tree-new-main` + `[data-path$="/甲.md"]`）、`.tmp/e2e-r44-ui-main.mjs:287-299`（设置 → 深色 → 保存）、`.tmp/e2e-r44-typora-b.mjs:120-142`（`emulateMedia({media:'print'})` 取样）都能直接抄。
- **与第 43 轮改动不冲突**：本轮只加属性/加早退/加输入规则，不碰第 43 轮的预览只读守卫；`runAnalysis` 依赖数组补 `viewMode` 后 `analyzeRef` 的 effect（`:1561-1563`）自动跟随。
- **硬约束无一违反**：无新运行时依赖；`package.json` 与 `release/` 不动；序列化不改（实测已证 `- [ ] ` 写盘）；不新增测试文件；首屏增量只来自 T1 的输入规则（计划估 <1.5 KB，292,046 B 起，余量 27,954 B）。

## 四、时间预算（不进编号，残余风险）

- 计划给 34 min，落在 35 min 内，但**最紧的是三份新 e2e 脚本 + 三次改前基线**：T1 的 U1–U8（8 条断言）、T2 的 V1–V5、T3 的 W1–W6，每份都要先跑一次红基线。按第 43 轮的实测节奏（一份 e2e 写 3–5 min），三份就是 10–15 min，而计划只给了「自测/E2E」6+3+4 = 13 min。
- 建议（不改判定标准）：T1 与 T3 的 e2e **共用一个浏览器会话**（同一个脚本里先跑 T1 路径、再切 `短.md` 跑 T3），省两次启动与 reset；T2 复用 typora-b 的打印取样代码。若仍超时，按计划 §八 的检查点先砍 U8 与 U5 的保存字节断言（R44-1 修好后它们已不承担主判定）。
- 另：R44-1 修好后 U1/U4 的读数会从「0」变「1/2」，执行代理**不要在第一次看到 0 时就改产品代码**——先看本文件。

## 五、UNVERIFIED（critic 侧）

- **T1 转换链在空段落上的 `liftListItem` 行为**：我实测的是「工具栏 → 任务列表」（段落非空），没有实测「段落先被 `deleteRange` 清空后再 lift」这条精确路径——这条要么靠实现后的 U1 验证，要么按计划 §二 失败兜底换顺序。R44-2 的 `return null` 兜底正是为它准备的。
- **真机打印 / 另存 PDF 的最终产物**：本机无打印机，也没起宿主，T2 只到 `emulateMedia({media:'print'})` 的计算样式层（与 finder 同口径）。
- **导出 HTML 打印的实测**：按代码推断（`export.ts:54-128`），计划只加单测断言，没有在浏览器里打开导出文件核验——与计划 §三 UNVERIFIED 一致。
- **中文 IME 下的 `[` / `]` 输入**：本轮探针是 ASCII 注入，与计划 §二 同口径记 UNVERIFIED。
- **`npm test` 的 29 文件 / 377 条**：本轮只读，未跑门禁（按角色约定门禁由 tester 跑）。

---
审查人：critic（只读）。改动建议全部是文字/断言的修正，不需要重排任务；planner 改完这两条 P1（R44-1 / R44-2）即可转执行。

---

# 第 44 轮 · 计划审查 · **revision 2 复审**（critic，只读；2026-11-17）

- 审查对象：`docs/iteration/round-44/plan.md` **revision 2**（469 行，头部声明只改 plan.md）。轮前 `startSha=d22807f`（`git rev-parse HEAD` 实测一致），`git status --porcelain` 仍只有 `?? docs/iteration/round-44/` 与 `?? shots/round-44/`。
- 上一版审查（本文件前半部分）保留不动：revision 2 的 §九 逐条引用它，删掉会让 R44-1…R44-6 失去证据链。
- 本次新增实测：`.tmp/critic-r44-probe4.mjs`（日志 `.tmp/critic-r44-probe4.log`）、`.tmp/critic-r44-probe5.mjs`（日志 `.tmp/critic-r44-probe5.log`），CDP 9222，每段前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`。未改产品代码、未跑门禁、未 commit、未 push、未碰 `release/`。
- 结论：**PASS**。上一版 2×P1 + 4×P2 **六条全部真修掉**（§一 逐条对过代码与实测）。本轮新增 **4 条 P2**（§三），都是文字 / 断言 / 1 个正则字符的修法，**不改任务划分、顺序与预算**；执行代理按 §三 顺手改即可，不需要 planner 再出 revision 3。

## 一、上一版 6 条漏洞：逐条核实「真修掉」（不看计划自述，看代码与实测）

| 上一版 | 修订落点 | 核实结论 | 证据 |
| :--- | :--- | :--- | :--- |
| **R44-1**（P1）选择器 `li[data-type="taskItem"]` 0 命中 | plan §二 实施步骤 1「读数口径」「别在预览里量」+ U1/U4/U5/U8 | **已修**。U1/U4/U5/U8 全部改成 `ul[data-type="taskList"] > li`、`> li > div`，勾选态读 `checkbox.checked` + `li.getAttribute('data-checked')`；并写明「别在预览里量」 | plan 第 110、132、135、136、139 行；探针 4 `taskItemDom`：`liSelectorCount: 0`、`taskLis: 1`、`divText: "丙项"`、`liAttrs: ["data-checked=false"]`、`liText: "Task item checkbox for 丙项丙项"`；探针 4 `previewDom.liTypeCount: 1`（预览里会假绿，计划警告成立）；`node_modules/@tiptap/extension-list/dist/task-item/index.js:276`（只写 `dataset.checked`）、`:190-203`（`data-type` 只在 `renderHTML`） |
| **R44-2**（P1）`chain().run()` 直接当返回 → 半截事务 | plan §二 改动 1 末尾 + 验收加 `git grep "return ok ? true : null"` | **已修**。handler 改成 `const ok = …run()` + `return ok ? true : null`，注释里的判定链与源码一致 | plan 第 78-92、127、143 行；`@tiptap/core/dist/index.js:5194-5201`（只认 `null` 或空 tr）、`:5202-5214`（之后 dispatch）、`:5152-5166`（`inputTransaction` 先插字符，`tr` 建在这个 doc 上）、`:80-103`（`hasCustomState` 时不自行 dispatch）、`:7465-7493`（`wrappingInputRule` 先 delete 后 `return null`） |
| **R44-3**（P2）导出单测没鉴别力 | plan §三 验收 | **已修**。改成 `indexOf('@media print')` 切片 + `/body\s*\{\s*color:\s*#1d2023/`；改前 `html.indexOf('@media print') === -1` 必然红 | `src/lib/export.ts:54-128` 现状无 `@media print`（`git grep` 1 命中只在 `src/styles.css:1939`）；`:63` 改前就有 `color: #1d2023`（所以旧断言确实无效）；签名 `buildHtmlDocument(options: HtmlExportOptions)` 与 `{ title, bodyHtml }` 用法一致（`src/lib/export.ts:17-21` 的 `HtmlExportOptions`、`:160` 的函数；`src/lib/export.test.ts:7-14` 已 import） |
| **R44-4**（P2）「照抄 `:root`」与三个纯白矛盾 | plan §三 改动 1 + 风险第 1 条 | **已修**。改「照抄浅色档，仅三个纸色（`--paper`/`--paper-raised`/`--panel`）用纯白」，注释同口径 | `src/styles.css:2-4` 实测 `#f6f4ee`/`#fffdf8`/`#f1eee6`；plan 第 176-207、269 行 |
| **R44-5**（P2）`插入 ▾` title 少列 2 项 | plan §四 改动 1 + W1 | **已修**。改成 9 项含「分割线」「公式块」 | plan 第 300、339 行；`src/App.tsx:4654-4704` 逐项数过正好 9 项（分割线 `:4666`、公式块 `:4687-4695`） |
| **R44-6**（P2）缺有序列表负例 | plan §二 U6 第 ③ 条 | **已修**。U6③ 写 `1. [ ] 甲` → `ol > li` 1、`taskList` 0、文本含 `[ ] 甲`，并写进「明确不砍」 | plan 第 137、443 行；守卫位置 plan:76（`$from.node(itemDepth - 1).type.name !== 'bulletList'`） |
| **RV-1**（planner 自补）空选区文案是假话 | plan 第 309 行 + W5 | **成立**。`buildContext` 在 `usable.length === 0` 时返回空 `selection`，`chars = context.selection.length`，所以 `chars === 0` 只对应「一个非空块都没有」 | `src/lib/context.ts:176-180`、`src/App.tsx:1036`、`:4523`；探针 4 `emptyDocAnalyze.disabled: true`（空文档里按钮确实禁用） |
| **RV-2**（planner 自补）「只有编辑视图支持」改后 10 行 | plan 第 330-335 行 | **成立**。改前按行 2（专注 `:4756`、打字机 `:4765`）；改后 7 个工具栏按钮 + 这 2 个 + 分析按钮 = 10 | `git grep -c "只有编辑视图支持" -- src/App.tsx` = **2**；`git grep -c "viewMode !== 'edit'" -- src/App.tsx` = **17**；`git grep -n "kind: 'meta'" -- src/lib/ai.ts` = **1**（`:275`）；`@media print` = **1**（`styles.css:1939`）；`color-scheme: light` = **1**（`styles.css:32`）；`TaskListInput` = **0**；`没有安装器` = **1**（`packaging/README.txt:45`）；`377 条` = **2**；`292,046` = **2**（`README.md:114`、`AGENTS.md:74`）。计划 §九 列的基线全对 |

**上一版最大 UNVERIFIED 已被实测排除（revision 2 可以放心走主路线）**：探针 5 复刻了计划链里最危险的一步——「空 listItem + `liftListItem('listItem')`」。实时应用里新建文档打 `- `（得到一个空的无序列表项）再按 `Shift+Tab`：

```json
"afterBullet":   { "uls": 1, "lis": 1, "ps": 2, "topChildren": ["UL","P"] }
"afterShiftTab": { "uls": 0, "lis": 0, "ps": 2, "topChildren": ["P","P"] }
```

即 `liftOutOfList` 对**空**列表项成功（`node_modules/prosemirror-schema-list/dist/index.js:244-266`），且给的是顶层段落。计划 §二「空段落风险」与「换顺序」兜底**不必启用**；`impl.md` 记下这条实测即可。同时探针 4 也重放了计划的改前基线：手打 `- [ ] 甲` → `taskLists: 0`、`plainUls: 1`、尾部 `[ ] 甲`，源码视图 `- \[ \] 甲`（`typedTaskLine`、`sourceView`），与 plan 第 109 行一致。

**T3 的「假格式错」前提也复现了**（plan 第 285 行）：编辑视图里对 `这是一句用来触发模拟分析的短句。` 点「分析本段（模拟）」→ `toast: "模型没按约定格式回，重试一次看看。"`、`railGoal: null`（探针 4 `mockAnalyze`）。另 `previewDom.analyzeDisabled: false`、`title` 仍是「未配置 API Key：从本地生成模拟批注」——W3 与 W4 的红基线都成立。

## 二、本次新查的点（没有问题的，别重复查）

- **T1 的挂载点与开关**：`src/App.tsx:772-801` 是 `useEditor`，`extensions: [` 在 `:773` → `TaskList`（`:791`）→ `TaskItem.configure({ nested: true })`（`:792`）→ `Markdown.configure(...)`（`:793`），计划让 `TaskListInput,` 插在这两者之间，位置成立；`:4298` 有 `enableInputRules: true`，输入规则确实开着。
- **`updateAttributes` 不会成为链上的暗雷**：`@tiptap/core/dist/index.js:3287-3356`——空选区时走 `tr.selection.empty` 分支，`nodesBetween` 仍会访问到祖先 `taskItem`，`canUpdate` 置真并在末尾 `tr.setNodeMarkup(lastPos, …)`；因此只要 `toggleTaskList` 成功，`updateAttributes('taskItem', { checked })` 不会返回 false 把整条链拖垮。
- **`updateAttributes` 排在 `toggleTaskList` 之后**是对的（plan 第 147 行）：先没有 `taskItem` 节点可改。
- **`range` 的算法**：`match[0] = '[ ] '`（4 字符）、`text = ' '`（1）→ `range = [from-3, from+1)`，正好覆盖 `[ ] `；`matchesDocument`（`:5220-5225`）会校验文档里真的存在 `[ ]`，所以段落前面有字（如 `foo[ ] `）不会误命中。
- **U4 的 Enter 续写**：`TaskItem` 自带 `Enter → splitListItem('taskItem')`，且 `checked` 属性 `keepOnSplit: false`（`task-item/index.js:169-178`、`:225-229`），新项回到未勾选——U4 断言成立。
- **U6③ 的祖先守卫**：`orderedList > listItem > paragraph` 时 `$from.node(itemDepth - 1)` 是 `orderedList`，`return null`，字面保留；`itemDepth < 2` 还兜住了「光标直接在 `doc` / 顶层」的情况。
- **U1/U4 的 `> li > div`**：探针 4 `taskItemDom.ulOuter` 实测 `<ul data-type="taskList"><li data-checked="false"><label contenteditable="false"><input aria-label="…" type="checkbox"><span style="…visually hidden…">…</span></label><div>…`——`div` 是 `li` 的第二个子元素，`divText` 不含复选框 a11y 文案。
- **T2 的 CSS 权重**：`:root`（0,1,0）、`html[data-theme='dark']`（0,1,1）、`html:not(...):not(...)`（0,2,1）与源文件同权重，打印块在 `:1939` 更靠后 → 胜出；计划没改成 `:where()`，不会降权重。
- **T3 的快捷键**：`Mod-Enter` 在 `src/App.tsx:761-766`；H1/H2 的 Ctrl+1/2 在 `:3716-3721`；删除线只有 `Mod-Shift-x`（计划给 S 的 `Ctrl+Shift+X` 与代码一致）。
- **收尾基线**：`packaging/README.txt:45`、`AGENTS.md:39/:72`、`README.md:114`、`AGENTS.md:74` 的改前值都与计划 §五 一致；`git status --porcelain release/` 当前为空（不发版验收可达）。

## 三、新漏洞 4 条（全部 P2，按严重度排）

### R44-7（P2）输入规则的正则把换行也当空格：打 `- [ ]` 再按 Enter 会被转换，且换行被吃掉

**位置**：plan 第 58 行 `const TASK_MARKER = /^\s*\[([ xX])\]\s$/`（§二 改动 1）。

**为什么错**：Tiptap 的输入规则**不只在 `handleTextInput` 上跑**，Enter 也会跑一遍：`inputRulesPlugin` 的 `handleKeyDown` 对 Enter 调 `run$1({ from: $cursor.pos, to: $cursor.pos, text: "\n" })`（`node_modules/@tiptap/core/dist/index.js:5319-5331`），`textBefore = getTextContentFromNodes($from) + text`（`:5233`）。`\s` 匹配换行，所以段落文本正好是 `[ ]` 时 `[ ]\n` 命中 `^\s*\[([ xX])\]\s$`；`matchesDocument`（`:5220-5225`）也通过（`parentOffset 3 - 3 = 0`，`textBetween(0,3) === '[ ]'`）。handler 随后 `deleteRange(range)` 把刚插进去的那个换行一起删掉，再 lift + 转成任务项。

**这个路径在本产品里真实存在**（不是理论推测）：探针 4 在普通段落打 `-` 再按 Enter，`paragraphCount 4 → 5`、`plainUls 2`、`bulletItems 2`——现有的 `\s$` 列表规则就是在 Enter 上被触发的（`dashThenEnter`，`.tmp/critic-r44-probe4.log`）。

**后果**：在无序列表项里打 `- [ ]`（末尾不打空格）再按 Enter → 当前项变成任务项，**但没有新建项**（Enter 被消费）。Typora 在这里会新建一个普通列表项。计划的口径是「段首的 `[ ] `（带空格）才转换」，U1–U8 没有一条覆盖 Enter，所以这个偏差不会被任何断言抓到。

**修法**（1 个字符，推荐）：末尾改成字面空格 `/^\s*\[([ xX])\] $/`（要容许 Tab 就写 `[ \t]`）。主路径（打空格触发）不变，Enter 与 IME 组词结束（`text=""`）都不会再误命中。同时在 U6 追加一条负例：「`- [ ]` + Enter → 文本仍是 `[ ]`，且新建了一项（或按产品决定明确写成『转换并保留新项』）」，并在 `impl.md` 记下最终口径。

### R44-8（P2）T2 的 V4 证明不了第三个选择器（系统深色）

**位置**：plan 第 247 行 V4。

**为什么错**：V1 先把主题设成 `data-theme="dark"`（plan 第 244 行），V4 沿用这个状态，只加 `emulateMedia({ media: 'print', colorScheme: 'dark' })`。但第三个选择器是 `html:not([data-theme='light']):not([data-theme='dark'])`（`src/styles.css:66`，打印块 plan 第 184 行同款），它在 `data-theme="dark"` 存在时**永远不匹配**。V4 真正命中的是打印块里 `html[data-theme='dark']` 那一行（plan 第 183 行）。

**后果**：计划写「证明第三个选择器覆盖了系统深色媒体块」，实际没证明。将来第三个选择器写错或漏掉，V4 仍然绿；而「跟随系统深色」是三种主题态里唯一没被任何断言覆盖的一种。

**修法**：V4 先切到「设置 → 跟随系统」（或直接 `document.documentElement.removeAttribute('data-theme')` 并确认设置面板语义一致），再 `emulateMedia({ media: 'print', colorScheme: 'dark' })`，断言 `getComputedStyle(html).getPropertyValue('--ink').trim() === '#1d2023'`（以及正文 `p` 的 `rgb(29, 32, 35)`）；跑完恢复手动深色，别影响 V3/V5。若不想动设置，加一条 V6 专测「无 `data-theme` + `colorScheme: 'dark'` + print」。

### R44-9（P2）RV-1 只改了 title，同一句「假话」还留在 toast 里（空文档按 Ctrl+Enter 就会看到）

**位置**：plan 第 309 行只改分析按钮 `title`；`src/App.tsx:1377-1379` 的早退文案没动。

**为什么错**：`runAnalysis` 在 `context.selection` 为空时执行 `show('先选中一段文字，再按 Ctrl + Enter。')`。而 `Mod-Enter` 快捷键（`src/App.tsx:761-766`）直接调 `analyzeRef.current()`，**不经过按钮的 `disabled`**。空文档里没有任何可选文字，这句话就是 RV-1 认定为假的那一句；而且它会与新 `title`「先写一句，或选中一段要分析的文字」当场矛盾（同一状态下按钮说一套、toast 说另一套）。

**修法**（1 行）：把 `src/App.tsx:1378` 的文案改成「先写一句，或选中一段文字，再按 Ctrl + Enter。」，与 RV-1 同口径；W5 追加半条断言：空文档里 `Mod-Enter` → `.toast-text` 含「先写一句」（不改 W1–W4）。

### R44-10（P2）W1 的括号会把 `</>` 判红（与 R44-1 同类的假红）

**位置**：plan 第 339 行 W1：「title 是功能名（含快捷键或「插入：」）」。

**为什么错**：计划第 306 行给 `</>` 的 title 是 `'行内代码'`，**没有快捷键**（源码里也没有：`src/App.tsx:4744`）。H1/H2（Ctrl+1/2）、B（Ctrl+B）、I（Ctrl+I）、S（Ctrl+Shift+X）有；`</>` 没有。W1 的括号按字面读是「每个 title 都要含快捷键或『插入：』」，执行代理照写就会把一条本来正确的实现判红。

**修法**：W1 改成「H1/H2/B/I/S 的 title 含对应快捷键；`</>` 是「行内代码」；`插入 ▾` 的 title 含 9 项菜单词」，并照 plan 第 306 行的实际取值断言（别要求 `</>` 带快捷键）。

## 四、预算与残余风险（不进编号）

- revision 2 合计仍 35 min（T1 13 / T2 6 / T3 8 / 收尾 3 / 门禁 5），**零余量**。上面 4 条 P2 里 R44-7 与 R44-9 各 1 行、R44-8 与 R44-10 是改断言文字，合计 < 2 min，不会把 35 min 顶破；但执行代理要按 §八 的检查点走，不要为造失败态额外跑分支（R44-7 只需改正则 + 1 条负例）。
- 三份新 e2e 仍是本计划最紧的一段（上一版审查 §四 已提）；revision 2 已允许 T1/T3 共用一个浏览器会话，照做。
- 本轮不发版、不动 `release/`、不新增测试文件：与硬约束无冲突（`npm test` 文件数仍 29，只加条数）。

## 五、UNVERIFIED（critic 侧，本轮仍未验证）

- **T1 转换链端到端**：探针 5 证明了「空列表项 lift」，但没验证「delete → lift → `toggleTaskList` → `updateAttributes` 四步串在同一个 chain 里的最终 DOM」。这条只能靠执行后的 U1/U4 验证；R44-2 的 `return null` 保证失败时不少字符。
- **`- [ ] ` 与自动配对的交互**：探针 4 只重放了改前基线（文本与计划 §七 一致），没在新规则下测。
- **真机打印 / 另存 PDF 的最终产物**：本机无打印机、未起宿主，T2 只到 `emulateMedia` 的计算样式层（与 finder、上一版审查同口径）。
- **中文 IME 下的 `[` / `]`**：探针是 ASCII 注入，与计划同口径记 UNVERIFIED。
- **门禁数字**：本轮只读，未跑 `tsc` / `npm test` / `npm run verify`（按角色约定交给执行代理与 tester）。
