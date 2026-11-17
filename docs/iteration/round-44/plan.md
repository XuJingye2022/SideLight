# 第 44 轮 · 计划（planner，只读；**revision 2**）

> **revision 2 —— 第 2 次修订（planner-revision，只读）**：按 `plan-review.md` 的 2×P1 + 4×P2 逐条修掉，任务划分、顺序与预算不变。落点：**R44-1** → §二 实施步骤 1 + 验收 U1/U4/U5/U8（选择器换成实测可用的，并写明「别在预览里量」）；**R44-2** → §二 改动 1 的 handler 末尾 `return ok ? true : null` + §二 风险第 1 条；**R44-3** → §三 验收的导出单测改成按位置切片断言；**R44-4** → §三 改动 1 与风险第 1 条的注释口径（三个纸色刻意用纯白）；**R44-5** → §四 改动 1 的 `插入 ▾` title 补成 9 项；**R44-6** → §二 验收 U6 加有序列表负例。本修订另补两条审查漏项（不改任务）：**RV-1** §四 改动 2 的空选区文案「把光标放在要分析的段落里」在空文档里是假话（`src/lib/context.ts:176-180`：没有可用块时 `selection` 为空，按钮禁用的正是这一种状态）→ 改成「先写一句，或选中一段」；**RV-2** §四 基线「只有编辑视图支持」改后是 **10** 行不是 9（7 个工具栏按钮 + 专注 + 打字机 + 分析本段，各占一行；`git grep -c` 实测改前 2）。
>
> 修订范围声明：只改 `plan.md`。未改产品代码、未跑 E2E、未改 `docs/iteration/STATE.md`、未 commit、未 push、未碰 `release/`。修订时的核对手段：`read` 实读源码与第三方源码、`git grep` 实跑基线（见 §九）。

- 轮次：`round=44`、`nn=44`；轮前 `startSha=d22807f4361a32d06a49f6645d610511f3ce7bb7`（`git rev-parse HEAD` 实测一致；工作树只有 `docs/iteration/round-44/`、`shots/round-44/` 两个未跟踪目录）。本文件只写计划，未改产品代码、未跑 E2E、未 commit、未 push、未碰 `release/`。
- 输入：本轮 5 份 `findings-*.md`（全部读完）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md` 头部、`git log -8`，与相关源码（`src/App.tsx`、`src/lib/{ai,export,wordcount,footnotes}.ts`、`src/components/{StatusBar,StatsDetail}.tsx`、`src/styles.css`、`packaging/installer.nsi`、`packaging/README.txt`）。
- 环境：dev server `http://localhost:5175`（不另起、不重启）；E2E 固定 CDP **9222**，每段前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- **不发版**：`package.json` 的 `version`（0.32.1）不动；CHANGELOG 写进现有 `## Unreleased` 区间；不改 `release/`、不 push。
- 报告与证据：`docs/iteration/round-44/{plan,impl,test}.md`；截图 `shots/round-44/impl-*.png`（不覆盖 finder 的 `bug-*`/`typora-*`/`ship-*`/`code-*`/`r44-ui-*`）。

## 〇、结论：本轮 3 个任务

| id | 标题 | 级别 | 类别 | 回应 | 估时 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 手打 `- [ ] ` 立刻建成任务项，保存不再写 `\[ \]` | **P1** | 数据安全 / 用户可见 | typora 第 1 条 | 13 min |
| **T2** | 深色主题下打印 / 另存 PDF 用浅底深字（含导出 HTML） | **P1** | 用户可见 | typora 第 2 条 | 6 min |
| **T3** | 只读视图「为什么不能点」说清楚；模拟分析不再误报「模型没按约定格式回」 | P2 | 用户可见 / 正确性 | bug 第 2 条、ui F4（两面），外加模拟流缺 `meta` 的根因 | 8 min |

合计约 **35 min**（含 §五 收尾 3 min 与门禁串跑 5 min；revision 2 把 T1 自测加到 7 min，见 §八），正好是 35 min 上限、没有余量。

**为什么只排 3 个而不是 4 个**：本轮 5 份报告合计 **26 条 actionable**（bug 2、typora 7、ship 4、code 3、ui 10）。两条 P1（typora 1/2）必须做；T3 是三条小改的合集（各 2–10 行），加起来仍比单开一条中等任务便宜。剩下的 P2 里最值钱的是 bug 第 1 条（源码模式字数口径），但它需要「Markdown 源码 → 纯文本」的纯函数 + 两份调用点（状态栏与字数明细）+ 100 KB 源码逐键成本回归，单独 9–10 min 才做得干净；塞进本轮会把 35 min 顶到 44 min 以上，违反「总工作量按 35 分钟排」的规矩。因此按 `roles/planner.md`「超出就砍到 3 个或更少」处理，把它列为下轮第一项（见 §六）。**本轮不排任何发布/打包任务**：ship S1/S2/S3 与第 42 轮的 setup 图标、`SHA256SUMS` 属于同一批「发布专项」，要隔离根重打包 + NSIS 编译，一次做完更省（§六 #2）。

## 一、为什么是这三条

排序按 `roles/planner.md`：数据安全 → 用户可见收益 → 安装/体积/性能 → 内部质量。

- **T1（P1，数据安全）**：用户在 Typora 里的第一反应是打 `- [ ] `。现在这个动作只得到普通列表项，`[ ]` 以字面留在正文，**保存后盘上是 `- \[ \] 任务`**——不是显示问题，是写进用户 `.md` 的字节被改坏（反斜杠进了文件）。这是本轮唯一「动作把用户数据变脏」的条目，排第一。
- **T2（P1，用户可见）**：深色主题用户点「导出 → 打印 / PDF」得到浅色字（`rgb(233,230,224)`）落在白纸上，等于打印功能对深色用户失效。`@media print`（`src/styles.css:1939-1970`）只隐藏 UI、没覆盖配色。纯 CSS + 一段导出样式，风险最低、命中率 100%（深色用户）。
- **T3（P2，用户可见 / 正确性）**：三处「同一句话不说清 / 说错」的小改：① 7 个在预览与源码里被禁用的工具栏按钮，悬停只说「粗体」甚至没有 `title`，而同一排的「专注 / 打字机」会切到「只有编辑视图支持」（`src/App.tsx:4756`、`:4765`）；② 预览 / 源码里 9 个编辑按钮全锁、「分析本段（模拟）」仍可点，点完只弹一句 `模型没按约定格式回，重试一次看看。`（`src/App.tsx:1546`）；③ 那句话的根因不是模型，而是模拟流：`mockItems` 在「只有一句」的分支里不产出 `meta`（`src/lib/ai.ts:263-272`），而 `goalSeen` 只认 `meta`（`src/App.tsx:1420`），于是**任何短段落的模拟分析都会在结束时报一次格式错**——编辑视图也一样。修 ③ 之后 ② 的误导消失，② 再把「分析」纳入只读口径。

**本轮不选 bug 第 1 条（源码字数口径）**：它是 P2、数字误导但不改用户文件；且它牵连两处调用点与一项逐键成本（见 §六 #1），需要独立时间盒。**本轮不选 code F1/F2**（草稿链、双计时器）：属性上接近数据安全（草稿恢复的字节会和保存链不同），但要动保存链旁边的 300 ms 写盘，必须配 `roundtrip` + `fidelity-acceptance` 复跑，8 分钟只能做半套，宁可不碰（§六 #3）。

## 二、任务 T1（P1，数据安全 / 用户可见）

### 为什么

Typora 里打 `- [ ] ` 空格那一刻变成任务项；Sidelight 里同一动作只得到普通列表项，字面 `[ ]` 留在正文，切源码看到 `- \[ \] typed checkbox line`（finder-typora §2 的 `B1_typed_checkbox_dom` / `B1_typed_checkbox_source`）。解析链明明会做（同一脚本用 Markdown 载入 `- [ ] first task` 能得到 `taskLists:1, checkboxes:2`，回车还能续写），只有输入链不会。保存后 `[ ]` 被写成 `\[ \]`，是**写进用户文件的语义损失**。

### 现状证据（planner 已逐条对过代码）

| 层 | 位置 | 现状 |
| :--- | :--- | :--- |
| 扩展挂载 | `src/App.tsx:791-792` | `TaskList` / `TaskItem.configure({ nested: true })` 已挂，但没有任何任务标记的输入规则 |
| 内置规则为何不生效 | `node_modules/@tiptap/extension-list/dist/task-item/index.js`：`inputRegex = /^\s*(\[([( \|x])?\])\s$/` + `wrappingInputRule({ type: taskItem })` | `taskItem` 没有 `group`（同文件 `Node.create` 里只声明 `content: "paragraph block*"`），`wrappingInputRule` 的 `findWrapping` 在 `listItem` 里找不到可包裹它的父节点 → handler 返回 `null`（`node_modules/@tiptap/core/dist/index.js:7471-7472`），规则静默不生效 |
| 转义从哪来 | `node_modules/@tiptap/markdown/dist/index.js:1099-1101` | `escapeMarkdownSyntax` 对**所有非代码文本**把反斜杠、反引号、`*`、`_`、`[`、`]`、`~` 逐个加反斜杠；任务标记还不是节点，`[ ]` 是 text，于是被转义 |
| 保存链 | `src/lib/serializeDocument.ts` | 序列化走 `editor.getMarkdown()`，转义发生在第三方序列化里，产品没有还原步骤 |

### 改动文件与函数

1. **新增 `src/lib/taskListInput.ts`**（约 45 行，无新依赖）：

   ```ts
   import { Extension, InputRule } from '@tiptap/core'

   /** 段首的 `[ ] ` / `[x] `：只在普通无序列表项里生效（Typora 里单独打 `[ ] ` 不建任务项） */
   const TASK_MARKER = /^\s*\[([ xX])\]\s$/

   export const TaskListInput = Extension.create({
     name: 'taskListInput',
     // 先于 @tiptap/extension-task-item 自带的同名规则：那条在 listItem 里恒失败，
     // 让它在前面跑一次只会白走一次 findWrapping，也让后续依赖版本升级时行为不变
     priority: 1000,
     addInputRules() {
       return [
         new InputRule({
           find: TASK_MARKER,
           handler: ({ state, range, match, chain }) => {
             const $from = state.selection.$from
             let itemDepth = -1
             for (let depth = $from.depth; depth > 0; depth -= 1) {
               if ($from.node(depth).type.name === 'listItem') { itemDepth = depth; break }
             }
             // 只在 bulletList 的 listItem 里转换；有序列表与普通段落保持字面（与 Typora 一致）
             if (itemDepth < 2 || $from.node(itemDepth - 1).type.name !== 'bulletList') return null
             const checked = match[1].toLowerCase() === 'x'
             const ok = chain()
               .deleteRange(range)               // 删掉刚输入的 `[ ] `（Tiptap 3 的 chainable state 已含这个字符）
               .liftListItem('listItem')          // 把当前项从无序列表里提出成段落（前后项各自成列表）
               .toggleTaskList()                  // wrapInList(taskList) 会连 taskItem 一起生成
               .updateAttributes('taskItem', { checked })
               .run()
             // 失败时必须返回 null，不能把 run() 的布尔值直接当返回：applyRule 只在 handler
             // 返回 null 或 tr 无步骤时放弃（@tiptap/core/dist/index.js:5194-5201）；返回 false
             // 且 tr 已有步骤时仍会 dispatch（:5202-5214），而 deleteRange 的步骤已写进同一个
             // tr（chainable state，:5152-5166、CommandManager :80-88 不自行 dispatch）。
             // 那会把用户刚打的「[ ] 」删掉、任务项没建出来 —— 字符被吃掉。
             // 返回 null → handleTextInput 返回 false（:5294-5304）→ 按默认路径插入这次输入，
             // 退化回改前行为（字面 [ ] / [x]，保存仍是 \[ \]），但一个字符不少。
             // 与 Tiptap 自己的 wrappingInputRule 同写法（:7465-7473：先 delete 再 return null）。
             return ok ? true : null
             // 可选加强（非必需）：把 can 加进 handler 解构（{ state, range, match, chain, can }），
             // 在 chain() 之前写 if (!can().liftListItem('listItem')) return null
           },
         }),
       ]
     },
   })
   ```

   - **落点依据（已核对第三方源码）**：`@tiptap/core` 的 `applyRule` 在 handler 返回 `null` 或 `tr.steps.length === 0` 时返回 false、由下一个 plugin 接管（`node_modules/@tiptap/core/dist/index.js:5194-5201`；dispatch 在 `:5202-5214`，返回 false 时整笔 tr 丢弃，什么都不写进文档）；每个扩展的输入规则各成一个 plugin，插件顺序按扩展 `priority` 降序排（同文件 `:1758-1767` 排序、`:5660` + `:5686-5696` 每个扩展各建一个输入规则 plugin），`priority: 1000` 让本扩展排在 `TaskItem` 之前。`toggleList` 在没有父列表时走 `wrapInList(listType)`（`:3159-3162`），`findWrapping` 会为 `taskList` 生成中间的 `taskItem`（`node_modules/prosemirror-schema-list/dist/index.js:105-116`），因此 `liftListItem` 之后的段落能被包成 `taskList > taskItem > paragraph`。
   - **失败兜底（若 e2e 的 U2/U3 不成立再启用）**：改成一次手工事务——把当前 `listItem` 的段落节点包进 `schema.nodes.taskList.create(null, schema.nodes.taskItem.create({ checked }, paragraph))`，用 `tr.replaceWith` 替换原 `bulletList` 的那一项，再 `TextSelection.create` 到新段落末尾。手工事务同样必须「失败就 `return null`」（不要先 `tr.replaceWith` 再返回 false），验收断言不变。
2. **`src/App.tsx:773-801`**：在 `TaskItem.configure(...)` 之后、`Markdown.configure(...)` 之前加 `TaskListInput,`；文件头 import 加 `import { TaskListInput } from './lib/taskListInput.ts'`（按现有 `./lib/*.ts` 的写法带扩展名）。
3. **不动序列化**：转成真 `taskItem` 后由 `taskItem.renderMarkdown` 输出 `- [ ] ` 前缀，`[` `]` 不再进 text node，`escapeMarkdownSyntax` 没有可转义的东西（不需要加 `repairTaskMarkers` 之类的还原函数，避免与第 40 轮「只还原原文真有同一条片段」的守卫风格冲突）。

### 实施步骤（顺序执行）

1. 写 `.tmp/e2e-r44-impl-t1.mjs`（骨架抄 `.tmp/e2e-r44-bug-d.mjs:1-45`：`installFakeWorkspace` / `readFakeFile` + `chromium.connectOverCDP('http://127.0.0.1:9222')` + `openFolder()` + `.doc-column .ProseMirror` 的等法），**改前先跑一次**，把读数存 `.tmp/e2e-r44-impl-t1.before.log`：预期 `taskLists: 0`、`taskItemLis: 0`、`checkboxes: 0`、`plainUls: 1`、正文文本尾部含 `[ ] 甲`、源码视图出现 `- \[ \] 甲`（红，三条）。
   - **读数口径（R44-1，改前必读）**：任务项在真实 DOM 里是 `.doc-column .ProseMirror ul[data-type="taskList"] > li`，**不是** `li[data-type="taskItem"]`。TaskItem 走 NodeView（`node_modules/@tiptap/extension-list/dist/task-item/index.js:236-282`，只在 `:276` 写 `listItem.dataset.checked`），`data-type` 只出现在没有 NodeView 的 `renderHTML`（同文件 `:190-203`）。实测（`.tmp/critic-r44-probe3.utf8.log`）：`liSelectorCount: 0`、`liAttrs: ["data-checked=false"]`、`tagNames: ["LI:-"]`。**功能完全正确时这个选择器也是 0**；看到 0 先回看本行，不要改产品代码。
   - **别在预览里量**：预览面板是 `renderHTML` 的输出（`src/components/PreviewPane.tsx:78-83`），`li[data-type="taskItem"]` 在那里命中，会假绿。所有 T1 断言都在编辑视图（`viewMode === 'edit'`，`window.__slState.viewMode` 可读，`src/App.tsx:713`）里做。
2. 写 `src/lib/taskListInput.ts`，改 `src/App.tsx` 两处。
3. `npx tsc --noEmit`。
4. 重跑 e2e（断言 U1–U8），截图。
5. `node scripts/keyboard-acceptance.mjs`（52/52）——证明 `- ` 建列表、链接 `Ctrl+K`、`[` `]` 的正常输入没被新规则误伤；跑完 `git checkout -- shots/round-05/`（AGENTS §8）。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r44-impl-t1.mjs 9222            # U1–U8 全 PASS，末尾 errors:[]
npx tsc --noEmit                               # exit 0
# —— 改前基线（先贴 >0，AGENTS §8）
git grep -n "TaskListInput" -- src             # 改前 0（新文件也是 0）→ 改后 3（定义 1 + import 1 + 挂载 1）
git grep -n "priority: 1000" -- src/lib/taskListInput.ts   # 改后 1
git grep -n "liftListItem('listItem')" -- src/lib/taskListInput.ts  # 改后 1
git grep -n "return ok ? true : null" -- src/lib/taskListInput.ts    # 改后 1（R44-2 的回归锁）
```

e2e 必须覆盖的断言（doc 为空段落起，`seed` 用 `{ '甲.md': '# 甲\n\n甲正文。\n' }`）：

1. **U1**：新文档逐字符输入 `- [ ] 甲` → 在**编辑视图**里数 `.doc-column .ProseMirror ul[data-type="taskList"]` **1**、`.doc-column .ProseMirror ul[data-type="taskList"] > li` **1**、`.doc-column .ProseMirror input[type=checkbox]` **1**；勾选态读 DOM property `checkbox.checked === false` 且 `li.getAttribute('data-checked') === 'false'`。任务项正文取 `.doc-column .ProseMirror ul[data-type="taskList"] > li > div` 的 `textContent` = `甲`（**不要**读 `li.textContent` 或 `.ProseMirror.textContent`：NodeView 在每个 `li` 里挂了 `label > span` 的视觉隐藏 a11y 文案「Task item checkbox for 甲」，见 `.tmp/critic-r44-probe3.utf8.log` 的 `ulOuter`）；另断言 `.doc-column .ProseMirror` 的 `textContent` **不含** `[ ]`。
2. **U2**：接着输入 `乙` → 同一个 `ul[data-type="taskList"] > li > div` 的文本是 `甲乙`（光标在任务项里，后续输入不落到列表外）。
3. **U3**：`Ctrl+S`（先用文件树头 `.tree-new-main` 建 `未命名.md`，盘上已有句柄）后 `await readFakeFile(page, '未命名.md')`（`.tmp/r30-fsa.mjs:164` 的签名是 `readFakeFile(page, path)`）含 `- [ ] 甲乙`、**不含** `\[`、`\]`；`window.__slState.dirty === false`。
4. **U4**：任务项里按 `Enter` → `ul[data-type="taskList"] > li` **2**；第二个 `li` 的 `checkbox.checked === false` 且 `getAttribute('data-checked') === 'false'`；输入 `二` 后第二个 `li > div` 的 `textContent` 是 `二`（续写可用）。
5. **U5**：另起一段输入 `- [x] 已办` → 该 `ul[data-type="taskList"] > li` 的 `checkbox.checked === true` 且 `getAttribute('data-checked') === 'true'`；保存字节含 `- [x] 已办`。
6. **U6 负例（三条）**：① 另起一段输入 `- [链接](https://example.com)` → `ul:not([data-type="taskList"]) > li` **1**、`ul[data-type="taskList"]` **0**（`a[href]` 不强制断言：链接输入规则是否注入不是本条的范围）；② 另起一段输入 `[ ] 正文` → `ul[data-type="taskList"]` **0** 且正文文本保留 `[ ] 正文`（Typora 里单独打 `[ ] ` 不建任务项）；③ **R44-6**：另起一段输入 `1. [ ] 甲` → `.doc-column .ProseMirror ol > li` **1**、`ul[data-type="taskList"]` **0**、该 `ol > li` 的 `textContent` 含 `[ ] 甲`（守住 `$from.node(itemDepth - 1).type.name !== 'bulletList'` 这条唯一越界保护；时间允许再切源码视图断言含 `1. \[ \] 甲`，不排进必做）。
7. **U7**：控制台 `errors: []`、`requestfailed: []`（`/__doc` 404 是浏览器态已知，排除）。
8. **U8 正对照**（防「转换把普通列表也吃掉」）：同一份文档里先有 `- 普通项` 再打 `- [ ] 甲` → `ul:not([data-type="taskList"]) > li` **1**（普通项）、`ul[data-type="taskList"] > li` **1**（任务项）；两者的「正文」文本分别是 `普通项` / `甲`（前者读 `ul:not([data-type="taskList"]) > li` 的 `textContent`，后者读 `li > div`）。

### 风险与坑

- **中（R44-2 已堵）**：`liftListItem` 只在 `listItem` 里成功；`deleteRange` 的步骤与后续命令写在**同一个 tr** 里，所以 `chain().run()` 失败时不能让它落盘——handler 必须 `return ok ? true : null`（见 §二 改动 1 的注释）。祖先判定仍必须前置（省一次无效事务），但它不再是唯一防线。U6 三个负例 + U1 一起当回归锁。
- **R44-2 的回归锁**：改完必须有一条「转换失败时字符不少」的证据。最省的做法是不特地造失败：直接在实现后检查 `return ok ? true : null` 存在（`git grep -n "return ok ? true : null" -- src/lib/taskListInput.ts` = 1），并在 `impl.md` 抄 `:5194-5214` 的判定链。造失败态（例如临时把祖先守卫改成恒 true 再跑 U6）不排进预算。
- **空段落风险（U1 就是判据）**：先 `deleteRange` 会让段落变空，`liftListItem` 对空列表项走的是 `liftOutOfList` 分支（`node_modules/prosemirror-schema-list/dist/index.js:211-266`）。若实测提不起来，**换顺序**：先 `liftListItem('listItem')`（此时段落里还有 `[ ] `，非空），再按新选区删掉段首那 4 个字符，最后 `toggleTaskList()` + `updateAttributes`；或直接启用上面的手工事务兜底。三种写法的验收断言完全相同，`impl.md` 记下最终用了哪一种。
- 规则用 InputRule 给的 `range`，不要自己用 `from/to` 推：Tiptap 3 的 input rule 在 chainable state 上已经包含刚输入的字符（`@tiptap/core/dist/index.js:5151-5199`），位置与页面 DOM 的旧写法不同。
- `updateAttributes('taskItem')` 必须排在 `toggleTaskList()` 之后（否则没有 taskItem 节点可改）。
- 只在 `bulletList` 生效：`orderedList` 里的 `1. [ ]` 保持字面（Typora 也不转），别为「顺手」把有序列表也转掉。
- `[` 是链接 / 脚注 / 引用式链接的常用字符：规则锚定「整段文本就是 `[ ] `」且祖先必须是 `bulletList`，`- [链接](url)`、`[label]: url`、正文里的 `[ ]` 都不命中（U6 + `keyboard-acceptance`）。
- **中文 IME 下 `[` 是否走同一条 `handleTextInput`**：本轮 E2E 是 ASCII 注入，记 UNVERIFIED（与第 43 轮同口径），真机补测。
- 粘贴 `- [ ] x` 不会触发输入规则（粘贴不是 `handleTextInput`），本轮不处理；写进 §六 的已知边界。
- **为什么 T1 没有 Node 单测**：输入规则要在真编辑器（ProseMirror view + DOM）里才触发，`node --experimental-strip-types` 没有任何 DOM；本案可独立测的只有一个正则，抽成纯函数只是把测试写在别处、并不增加覆盖。改用 U1–U8 的 E2E 当回归锁，并在 `impl.md` 写明这条取舍（与第 33 轮智能标点的做法一致：能抽的纯逻辑抽出来测，抽不出来的靠 E2E）。

### 需要的截图

- `shots/round-44/impl-t1-taskitem.png`：输入 `- [ ] 甲` 后的任务项 + 复选框。
- `shots/round-44/impl-t1-saved-source.png`：源码视图里 `- [ ] 甲乙`（无 `\[`）。

## 三、任务 T2（P1，用户可见）

### 为什么

深色主题用户点「导出 → 打印 / 另存 PDF」（`src/App.tsx:4609` 的 `window.print()`）得到 `rgb(233,230,224)` 的浅色正文；Chromium 默认不打印背景色 → 浅字落在白纸上。`docs/typora-gap.md:30` 把「打印」记为已支持，深色用户 100% 命中。finder-typora §3 用 `page.emulateMedia({ media: 'print' })` 复现了计算样式（`printPColor:"rgb(233,230,224)"`、`printColorScheme:"dark"`），截图 `shots/round-44/typora-dark-print-media.png`。

### 现状证据

| 位置 | 现状 |
| :--- | :--- |
| `src/styles.css:1939-1970` | `@media print` 只有 `display:none` 与布局，**没有任何颜色覆盖** |
| `src/styles.css:36-62` | 手动深色：`--paper:#15171a`、`--ink:#e9e6e0`、`color-scheme: dark` |
| `src/styles.css:65-93` | 跟随系统深色：`html:not([data-theme='light']):not([data-theme='dark'])` 同一套变量 |
| `src/lib/export.ts:54-128` | 导出 HTML 的 `STYLES` 只有 `@media (prefers-color-scheme: dark)`（`:121-127`），没有 `@media print`——按代码推断导出文件打印同样浅字（finder 未实测，见 §UNVERIFIED） |

### 改动文件与函数

1. **`src/styles.css` 的 `@media print` 块**（在 `.editor { max-width: none }` 之后、块收尾 `}` 之前）加一段**打印专用变量覆盖**，选择器覆盖三种主题状态。配色值照抄 `:root`（`:1-33`）的浅色档，**但 `--paper` / `--paper-raised` / `--panel` 三个纸色刻意用纯白 `#fff`**（屏幕用的是 `:2-4` 的 `#f6f4ee` / `#fffdf8` / `#f1eee6`；打印不必复制纸色，也省墨）。下面块里的注释按这个口径写，规则如下：

   ```css
   /* 打印一律浅底深字：深色主题下 --ink 是浅色，Chromium 不打印背景色，会变白纸浅字。
      这三个选择器分别对应：默认浅色、手动深色、跟随系统深色；放在 :root 与深色块之后，同权重靠顺序胜出。
      变量值与 :root 的浅色档一致，仅三个纸色（--paper / --paper-raised / --panel）用纯白。 */
   :root,
   html[data-theme='dark'],
   html:not([data-theme='light']):not([data-theme='dark']) {
     color-scheme: light;
     --paper: #fff;
     --paper-raised: #fff;
     --panel: #fff;
     --ink: #1d2023;
     --ink-soft: #565c61;
     --ink-faint: #666c72;
     --line: #e4dfd4;
     --line-strong: #d5cdbd;
     --accent: #2b6d64;
     --accent-ink: #23544d;
     --accent-wash: #e8f0ed;
     --mark: #9a5b1c;
     --mark-strong: #94682f;
     --mark-wash: #f7ecdc;
     --note: #2f6b86;
     --note-wash: #e6eff4;
     --warn: #a2452c;
     --danger: #b4453a;
     --on-accent: #ffffff;
     --on-mark: #fffdf8;
   }
   ```

2. **`src/lib/export.ts` 的 `STYLES`**（`:54-128`）：在深色块之后追加：

   ```css
   @media print {
     :root { color-scheme: light; }
     body { color: #1d2023; background: #fff; }
     code, th { background: #e8f0ed; }
     pre, th, td, hr { border-color: #e4dfd4; }
     blockquote, section.footnotes { color: #565c61; }
   }
   ```

3. **不做**：不加 `-webkit-print-color-adjust: exact`（会把整页刷成墨黑，比现在更糟）；不改屏幕样式的任何值；不动 `:root` 与深色块本身。

### 实施步骤

1. 写 `.tmp/e2e-r44-impl-t2.mjs`：深色走**真实设置面板**（抄 `.tmp/e2e-r44-ui-main.mjs:287-299`：`page.getByRole('button', { name: '设置', exact: true })` → `page.getByRole('radio', { name: '深色' }).click()` → `保存`），打印读数抄 `.tmp/e2e-r44-typora-b.mjs:120-142`（`emulateMedia({media:'print'})` → `getComputedStyle` 取样 → `page.screenshot`）。**改前先跑一次**：`emulateMedia({media:'print'})` 下 `p` 色为 `rgb(233, 230, 224)`（红）。
2. 改 `src/styles.css` 打印块与 `src/lib/export.ts` 的 `STYLES`。
3. `src/lib/export.test.ts` 追加 1 个 test（2 条断言，见验收）。
4. 跑 e2e、截图；`npx tsc --noEmit`。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r44-impl-t2.mjs 9222            # V1–V5 全 PASS
node --experimental-strip-types src/lib/export.test.ts   # 新增 1 个 test（2 条断言）通过
npx tsc --noEmit
# —— 改前基线（先贴，AGENTS §8）
git grep -n "@media print" -- src/styles.css src/lib/export.ts   # 改前 1（只有 styles.css）→ 改后 2
git grep -n "color-scheme: light" -- src/styles.css              # 改前 1（:32）→ 改后 2（:32 + 打印块）
```

e2e 断言：

1. **V1**：设置 → 深色 → 保存后 `document.documentElement.getAttribute('data-theme') === 'dark'`，屏幕媒体下正文 `p` 的计算色仍是 `rgb(233, 230, 224)`（屏幕样式没被改）。
2. **V2**：`page.emulateMedia({ media: 'print' })` 后，正文 `p` 的计算色是深色（`rgb(29, 32, 35)`），`html` 的 `color-scheme` 计算值是 `light`，`--ink` 是 `#1d2023`、`--paper` 是 `#fff`；截图 `impl-t2-print-dark.png`。
3. **V3**：`page.emulateMedia({ media: 'screen' })` 还原后 `p` 色回到 `rgb(233, 230, 224)`（打印覆盖不外溢到屏幕）。
4. **V4**：`page.emulateMedia({ media: 'print', colorScheme: 'dark' })`（模拟系统深色）下同样是深色字（证明第三个选择器覆盖了系统深色媒体块）。
5. **V5**：控制台 `errors: []`。

单元测试（`src/lib/export.test.ts` 追加，用已有 `buildHtmlDocument`）：

- 导出 HTML 的打印块**自己**改了颜色（R44-3：不能只断言 `html.includes('color: #1d2023')`——`src/lib/export.ts:63` 的 `body` 规则**改前就写着**这个值，那条断言改不改都通过）。按位置切片后断言：

  ```ts
  test('导出 HTML 的打印块用浅底深字，且排在深色块之后', () => {
    const html = buildHtmlDocument({ title: '打印.md', bodyHtml: '<p>正文</p>' })
    const at = html.indexOf('@media print')
    assert.ok(at > 0, '导出 HTML 里没有 @media print')
    const printBlock = html.slice(at, at + 400)
    assert.match(printBlock, /body\s*\{\s*color:\s*#1d2023/) // 打印块内必须是深字（400 字符覆盖到 body 那一行）
    assert.ok(html.indexOf('prefers-color-scheme: dark') < at, '深色块必须在打印块之前')
  })
  ```

- 鉴别力说明（写进 `impl.md`，不必多跑一次）：改前 `html.indexOf('@media print')` 是 `-1`，这条 test 在改动前必然红；单独的 `html.includes('color: #1d2023')` 不算证据（`src/lib/export.ts:63` 本来就有这个值）。

### 风险与坑

- **低**。唯一的认知风险是「打印块里复制了一套浅色值」将来会和 `:root` 漂移：打印块上方那行注释按 R44-4 的口径写——「变量值与 `:root` 的浅色档一致，仅三个纸色用纯白」。**不要**写成「与 `:root` 的浅色档保持一致」：`--paper` / `--paper-raised` / `--panel` 是刻意的纯白，照那句话「对齐」会变回 `#f6f4ee` / `#fffdf8` / `#f1eee6`，还会和 V2 的 `--paper === '#fff'` 断言打架。`impl.md` 记一份对照表。
- 三个选择器的权重：`:root`（0,1,0）与 `html[data-theme='dark']`（0,1,1）与 `html:not(...):not(...)`（0,2,1）分别与源文件里对应规则**同权重**，靠「打印块在文件更后面」胜出（`@media print` 在 `:1939`，深色块在 `:36-93`）。不要改成 `:where()`（会降权重导致不生效）。
- 深色档的 `--mark` / `--note` / `--warn` / `--danger` 换成浅色值后，要在打印媒体下量一次高亮文字的对比度（`--on-mark` 底色配 `--mark` 字），目标 ≥ 4.5:1。
- **UNVERIFIED**：真机「打印到 PDF」的最终产物（本机无打印机、宿主窗口起不来）。补测：宿主里「导出 → 打印」→ Microsoft Print to PDF → 打开 PDF 看文字色；或用 CDP `Page.printToPDF` 检查产物。

### 需要的截图

- `shots/round-44/impl-t2-print-dark.png`：深色主题 + `media=print` 下的整页（浅底深字）。
- `shots/round-44/impl-t2-screen-dark.png`：还原 `media=screen` 后屏幕仍是深色（证明没改坏屏幕）。

## 四、任务 T3（P2，用户可见 / 正确性）

### 为什么

1. 第 43 轮起，预览 / 源码里 7 个工具栏按钮带 `disabled={viewMode !== 'edit'}`，但 `title` 仍是「粗体 / 斜体 / 删除线 / 行内代码」，`插入 ▾` 连 `title` 都没有（`src/App.tsx:4643-4651`、`:4710-4746`）。同一排的「专注 / 打字机」却会切到「只有编辑视图支持」（`:4756`、`:4765`）。用户看到灰按钮，悬停只得到功能名，不知道是「视图不支持」还是「功能坏了」（finder-bug 第 2 条）。
2. 预览里 9 个编辑按钮全锁，顶栏「分析本段（模拟）」仍可点（finder-ui F4 的 `PREVIEW_ANALYZE`）；点完正文不变、批注 0 张，却弹「模型没按约定格式回，重试一次看看。」——把失败归给模型，而按钮自己写着「（模拟）」。
3. 这句话的根因在模拟流：`mockItems` 在「选区只有一句」的分支只返回 `evaluation` + `overall`，没有 `meta`（`src/lib/ai.ts:263-272`），而 `runAnalysis` 只在收到 `meta` 时置 `goalSeen = true`（`src/App.tsx:1416-1424`），收尾处 `if (!goalSeen) show('模型没按约定格式回…')`（`:1545-1547`）。于是**任何短段落在编辑视图里分析也会报这句格式错**——一条真实的「假错误」。

### 现状证据

| 项 | 位置 | 现状 |
| :--- | :--- | :--- |
| 7 个按钮无解释 | `src/App.tsx:4643-4651`、`:4710-4746` | 只有 `disabled`；`I`/`S`/`</>` 的 `title` 是功能名 |
| 分析按钮 | `src/App.tsx:4519-4535` | `disabled={selection.chars === 0 \|\| analyzing}`，不看 `viewMode`；`title` 只讲模拟 |
| 守卫 | `src/App.tsx:1372-1373`、依赖 `:1559` | `if (!editor \|\| analyzing) return`，没有视图守卫；依赖数组没有 `viewMode` |
| 误导文案 | `src/App.tsx:1546` | 模拟流缺 `meta` 时也说「模型没按约定格式回」 |
| 模拟流 | `src/lib/ai.ts:254-272` | 单句分支（`pool.length === 1`）没有 `meta`；多句分支有（`:274-277`） |

### 改动文件与函数

1. **`src/App.tsx` 工具栏**（7 处，纯加 `title`，动作用词与 `:4756` 一致）：
   - `插入 ▾`（`:4643-4651`）：`title={viewMode === 'edit' ? '插入：表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接' : '只有编辑视图支持'}`（R44-5：菜单实际是 **9 项**——`src/App.tsx:4654-4704`，`分割线` `:4666-4668`、`公式块` `:4687-4695` 不能漏；title 是清单不是举例）
   - `H1`（`:4710-4718`）：`title={viewMode === 'edit' ? '一级标题（Ctrl+1）' : '只有编辑视图支持'}`
   - `H2`（`:4719-4727`）：同上，`'二级标题（Ctrl+2）'`
   - `B`（`:4728-4737`）：`title={viewMode === 'edit' ? '粗体（Ctrl+B）' : '只有编辑视图支持'}`
   - `I`（`:4738-4740`）：`title={viewMode === 'edit' ? '斜体（Ctrl+I）' : '只有编辑视图支持'}`
   - `S`（`:4741-4743`）：`title={viewMode === 'edit' ? '删除线（Ctrl+Shift+X）' : '只有编辑视图支持'}`
   - `</>`（`:4744-4746`）：`title={viewMode === 'edit' ? '行内代码' : '只有编辑视图支持'}`
2. **`src/App.tsx` 分析按钮**（`:4519-4535`）：
   - `disabled={viewMode !== 'edit' || selection.chars === 0 || analyzing}`
   - `title`：非编辑 → `'只有编辑视图支持'`；编辑且未选 → `'先写一句，或选中一段要分析的文字'`（**RV-1**：不要写「把光标放在要分析的段落里」——`selection.chars === 0` 只在「一个非空块都没有」时成立，`src/lib/context.ts:176-180` 直接返回空 `selection`，此时根本没有可放光标的段落，那句提示是假话）；编辑且有选区 → 现有的模拟提示。
3. **`src/App.tsx` 的 `runAnalysis`**（`:1372-1373`）：`if (!editor || analyzing || viewMode !== 'edit') return`；依赖数组 `:1559` 补 `viewMode`。`Ctrl+Enter` 的入口（`src/App.tsx:763-766`）在编辑视图之外本来没有编辑器 DOM，不需要另改。
4. **`src/lib/ai.ts` 的 `mockItems`**（`:263-272`）：单句分支也产出 `meta`，文案与多句分支一致（`'我判断这段的意图是：给一个观点补理由。'`，`MarginRail.tsx:84` 有去前缀逻辑）。这样 `goalSeen` 必为 true，收尾的格式错误提示只在真模型确实格式异常时出现。
5. **`src/lib/errorCopy.test.ts`** 追加 2 条 `mockItems` 用例（该文件已经 `import { errorCopy, ModelRequestError } from './ai.ts'`，不需要改 `package.json` 的测试清单）：
   - 单句 `selection: '这是一句用来触发模拟分析的短句。'` → 返回项里有 `kind === 'meta'`（改前没有）。
   - 多句 → 里层仍有 `meta` 且只有 1 条（防重复）。

### 实施步骤

1. 写 `.tmp/e2e-r44-impl-t3.mjs`（骨架抄 `.tmp/e2e-r44-ui-main.mjs` 的工具栏读数 + `.tmp/e2e-r44-ui-2.mjs` 的 `PREVIEW_ANALYZE`：假工作区种一篇 `短.md`，正文是一句带逗号的中文短句）。**改前先跑一次**，存 `.tmp/e2e-r44-impl-t3.before.log`：预期 3 红——`插入 ▾` 无 `title`、预览里 `.analyze-button` 未 `disabled`、编辑视图分析后 `.toast-text` 含「没按约定格式回」。
2. 按上面 1–5 改代码。
3. `npx tsc --noEmit`；跑 e2e；截图。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r44-impl-t3.mjs 9222            # W1–W6 全 PASS
node --experimental-strip-types src/lib/errorCopy.test.ts   # 新增 2 条通过
npx tsc --noEmit
# —— 改前基线（先贴，AGENTS §8）
git grep -c "只有编辑视图支持" -- src/App.tsx               # 改前 2（专注、打字机）→ 改后 10（+7 个工具栏按钮，+分析按钮；见下）
git grep -c "viewMode !== 'edit'" -- src/App.tsx            # 改前 17 → 改后 19（runAnalysis 守卫 + 分析按钮）
git grep -n "kind: 'meta'" -- src/lib/ai.ts                 # 改前 1（多句分支）→ 改后 2
```

> **RV-2（基线补正）**：「只有编辑视图支持」改后是 **10** 行，不是 9：7 个工具栏按钮 + 「专注」`:4756` +「打字机」`:4765` + 分析按钮 `title`（本任务改动 2 也用它）。`git grep -c` 按**行**计，若某条把 `title` 和 `disabled` 写在同一行会少 1；那时用出现次数复核：`git grep -o "只有编辑视图支持" -- src/App.tsx | Measure-Object -Line` 应为 10。改前实测：按行 2、按次 2。

e2e 断言：

1. **W1**：编辑视图里 7 个按钮（`插入 ▾`/`H1`/`H2`/`B`/`I`/`S`/`</>`）`title` 是功能名（含快捷键或「插入：」）——与改前一致，防止把编辑态也说成「只有编辑视图支持」；其中 `插入 ▾` 的 `title` 要含 9 项菜单词（表格、代码块、引用、任务列表、分割线、图片、公式、公式块、链接，R44-5），少一项就红。
2. **W2**：`Ctrl+Shift+P` 进预览 → 这 7 个按钮 `disabled === true` 且 `title === '只有编辑视图支持'`；`Ctrl+/` 进源码同样成立。
3. **W3**：预览里 `.analyze-button` 的 `disabled === true`、`title === '只有编辑视图支持'`；绕过 `disabled` 直接调 `__reactProps$.onClick()` 后 `viewMode` 仍是 `preview`、`.margin-rail` 计数不变、`.toast-text` 不含「没按约定格式回」。
4. **W4**（编辑视图正对照 + 假错误修复）：编辑视图点「分析本段（模拟）」→ `.rail-goal` 出现（「我的理解」），`.toast-text` **不含**「没按约定格式回」；改前这一条是红的。
5. **W5**：新文档（`.tree-new-main` 建的空白篇）在编辑视图里 `.analyze-button.disabled === true` 且 `title === '先写一句，或选中一段要分析的文字'`（RV-1 的文案；先读 `title` 再断言，别用 `page.click()`）。
6. **W6**：控制台 `errors: []`。

### 风险与坑

- **低**。三条都是「加属性 / 加早退 / 补一个数组项」，不动保存链与编辑器内核。
- `disabled` 的按钮 `page.click()` 会 30 s 超时（第 42/43 轮实测）：W2/W3 只读 `disabled`/`title`，W3 的绕过必须用 `__reactProps$` 写法，别用 click。
- toast 活 6 s：W4 读 `.toast-text` 要在点击后 1 s 内，或先等旧 toast 消失（第 43 轮同坑）。
- `mockItems` 的 `meta` 文案必须与 `.rail-goal-label` 的前缀约定一致（`MarginRail.tsx:84` 会剥掉「我判断这段的意图是：」）；换文案就同步看那条正则。
- 依赖数组补 `viewMode` 后，`analyzeRef` 的赋值 effect（`src/App.tsx:1561-1563`）会自动跟随，不必另改。

### 需要的截图

- `shots/round-44/impl-t3-preview-disabled.png`：预览里分析按钮禁用 + 悬停 `title`（截图能记录 pill 变灰）。
- `shots/round-44/impl-t3-rail-goal.png`：编辑视图短句分析后 `.rail-goal`「我的理解」出现、无格式错误提示。

## 五、统一门禁、收尾与谁改什么

**每个任务各自跑**：该任务列的门禁 + 该任务 e2e。**全部做完后串跑一次**（本轮无并发，执行代理自己串行跑；若发现别的角色正在构建，只跑 `npx tsc --noEmit` 与 `npm test`，把 `npm run verify` 让给根代理）：

```bash
npx tsc --noEmit
npm test                     # 记实测文件数 / 条数（新增只往既有 2 个测试文件里加，文件数仍是 29）
npm run verify               # build + 首屏 gzip（内部 310,000 / 硬线 320,000；轮前 292,046 B）
npm run roundtrip            # rich 5/7、source 7/7（T1 只加输入规则，不改序列化；作回归锁）
node scripts/keyboard-acceptance.mjs   # 52/52；跑完 git checkout -- shots/round-05/
```

（`planner.md` 里写的「首屏 ≤286,000 B 硬门」是第 30 轮的旧线，已被 2026-11-17 政策替换为内部 310,000 / 硬线 320,000，见 `.tmp/iteration/common.md` 与 `STATE.md`。本轮预计增量：T1 输入规则 + T2 CSS + T3 属性，合计 < 1.5 KB gzip。）

**收尾文档（执行代理做，tester 提交前复核）**：

1. `docs/CHANGELOG.md`：在 `## Unreleased（第 29–43 轮，未发版）` 里、`**第 43 轮（同一未发版区间）**` 块之后加 `**第 44 轮（同一未发版区间）**`，写四条：任务列表手打 `- [ ] ` / `- [x] ` 直接建任务项且保存写 `- [ ] `（不再 `\[ \]`）、深色主题打印与导出 HTML 用浅底深字、只读视图 7 个按钮与「分析本段」的禁用说明、模拟分析不再误报格式错误（附 `npm test` 实测与首屏 gzip 实测数字）。标题「29–43」可顺手改「29–44」（不改不判失败）。
2. `README.md`：`:40`（正文编辑）在「任务列表」后补「（打 `- [ ] ` 直接建任务项，保存写回 `- [ ] `，第 44 轮）」；`:61`（导出）补「深色主题下打印 / 另存 PDF 用浅底深字（第 44 轮）」；`:114` 首屏数字与本轮增量；`:133` 测试条数；`:171` 测试文件数与 `:133` 同值（本轮仍 29，若新增了文件按实测改）。
3. `AGENTS.md`：`:39` 与 `:72` 的「29 个文件 377 条」→ 本轮 `npm test` 实测；`:74` 只改首屏数字（292,046 → 本轮实测）与差值；`:72` 的能力长句里补一句任务列表手打与打印配色（一句话，不再扩写）。
4. `packaging/README.txt:45`（ship S4 的 1 行，不计入任务）：`没有自动更新、没有安装器、没有代码签名。` → `没有自动更新、没有代码签名；这个便携包里也没有安装器。`（同文件 `:4`/`:6` 在讲 `setup.exe`，矛盾就在这一行）。**不需重新打包**，下次打包自然带上；写进 impl.md 的 UNVERIFIED（本轮无包可验）。
5. `docs/iteration/round-44/impl.md`：每个任务的文件:行号、命令与原始输出、截图路径、与计划的偏差、UNVERIFIED（中文 IME 下的 `[`、真机打印 PDF、宿主导出打印）。
6. **不改** `docs/iteration/STATE.md`（根代理轮末统一更）、不改 `package.json` 版本、不动 `release/`、不 push。

**收尾验收（先贴改前 >0，AGENTS §8）**：

```bash
# —— 改前基线
git grep -n "没有安装器" -- packaging/README.txt          # 1（:45）
git grep -n "377 条" -- AGENTS.md                        # 2（:39、:72）
git grep -n "292,046" -- README.md AGENTS.md             # ≥2（README:114、AGENTS:74）
# —— 改后
git grep -n "没有安装器" -- packaging/README.txt          # 0
git grep -n "没有自动更新、没有代码签名；这个便携包里也没有安装器" -- packaging/README.txt   # 1
git grep -n "377 条" -- AGENTS.md                        # 0
git grep -nE "29–44|43–44" -- docs/CHANGELOG.md          # ≥1（新块标题）
git diff --stat -- package.json release/                 # 空（不发版、不动 release/）
git status --porcelain release/                          # 空
```

## 六、本轮不做（有证据、有原因、写清下轮怎么排）

| 条目 | 来源 | 级别 | 为什么本轮不做 | 下轮怎么排 |
| :--- | :--- | :--- | :--- | :--- |
| **源码模式字数用「源码原文」口径**：同一文档编辑 11 字、源码 28 字，标签一样（`src/App.tsx:5125`） | bug 第 1 条 | P2 | 要新增「Markdown → 纯文本」纯函数（剥链接地址/图片/有序编号/围栏 info/公式），两处调用（状态栏 + `openStatsDetail` 的 `text`，`src/App.tsx:3998-4015`），再加单测与 100 KB 源码逐键成本读数；9–10 min，被 35 min 预算挤出 | **下轮第一项**：先写纯函数 + 单测（`wordcount.test.ts` 叠加），再改两处调用，最后实测 100 KB / 1 MB 源码逐键，超标就退回「源码口径 + 明确标注」的 S 方案 |
| **发布专项**：升级不清理旧 `www`（每次 +2.69 MB / +69.9%，`packaging/installer.nsi:120-131` 无 `RMDir /r`）、组件页可取消主组件（`:94` 无 `SectionIn RO`）、`release.yml:26-28` 的 `*_SHA256` 是死配置（无取件校验）、setup 仍无图标（第 42 轮 S2）、`release/SHA256SUMS.txt` 过期 | ship S1/S2/S3、第 42 轮 S2/S3 | P2 | 要隔离根重打包 + NSIS 编译 + 升级模拟，一次 15 min 起；本轮 3 个用户可见任务已满 | **独立「发布专项」轮**：S1 加 `RMDir /r "$INSTDIR\www"`、S2 给 `SEC_MAIN` 加 `SectionIn RO` 并补 `MUI_DESCRIPTION_TEXT`、S3 把 `ci.yml:68-88` 的取件+校验搬进 `release.yml`；同轮打一次真包记字节与 SHA256 |
| **草稿链复制修复链 + 双计时器**：草稿输出与保存输出不同（缺 `reuseTables`/`collapseBlankParagraphs`/`applyTrailingNewlines`），停笔 300 ms 全量写 `localStorage` 且与 2 s 自动保存两套节拍（`src/App.tsx:908-920`、`:931-956`） | code F1/F2 | P2（接近数据） | 要动保存链旁边的写盘，必须配 `npm run roundtrip` + `fidelity-acceptance` 复跑（后者会覆写 `shots/round-10/`）；8 min 只能做半套 | 下轮第二项：把草稿链改为 `serializeDocument(current, { frontmatter, footnotes, original })` 单出口（净 −8 行）＋ 800 ms 节拍合并；先给探针（同输入两链字节相同）再动手 |
| **界面细化批**：快捷键一览 1440×900 就要滚动（ui F1）、toast z-index 45 盖在模态遮罩 40 上（ui F2）、`插入 ▾` 无 menu 语义/方向键（ui F3）、表格条离表格 427–515 px 且 7 个按钮无 `aria-label`、高 23 px（ui F5）、1024 窄窗正文列 756 px（ui F6）、查找条无 role/名称（ui F7）、H2/H3 行高 1.95（ui F8）、`I` 21×24 与 `</>` 37×21（ui F9）、进预览正文右跳 139 px（ui F10） | ui F1–F10 | P2 | 10 条里大半是 CSS，但每条都要 1440/1024/深色三组量测与截图矩阵，本轮无此预算 | 下轮「界面细化」一次清 6–7 条：先做零字节/低风险三条（F6 窄窗 `max-width:36rem`、F10 两态同 `padding-left`、F8 行高），再做 F2/F5/F7 的 a11y（toast 模态期 `pointer-events:none`、表格条 `aria-label`+`min-height:26px`、`.find-bar` 加 `role="search"` 与两个输入框 `aria-label`） |
| **Typora 能力缺口**：大纲折叠按标题节点位置记 id（`src/lib/outline.ts:24`，改前文一个字全展开）、脚注定义在编辑视图不可见且 `[^1]` 不是上标、预览/HTML 导出不含 Mermaid 图、源码模式无选区字数、`docs/iteration/typora-features.md` 12+ 处现状失真 | typora F3/F4/F5/F6/F7 | P2 | 每条都是独立设计：折叠换稳定键要动 `outlineTree`（含单测）、脚注可见要装饰或节点、Mermaid 进预览/导出要外提 `svgCache` 并处理 SVG id 冲突 | 按 typora 报告 §12 的顺序排两轮：① 大纲稳定键 + 全部折叠/展开（400–600 B）；② 脚注上标（第一档）+ 源码选区字数 + 两份 Typora 文档的过期横幅（1 行）；③ Mermaid 进预览/导出（600 B–1 KB，注意 `id` 唯一） |
| **`App.tsx` 5,416 行 / 222 个 hook / 0 单测**（第 43 轮 F3 未处理，本轮复核数字） | code F3 | P2 | 内部质量，排在用户可见之后；抽 `autoSaveGate` 要动保存链，必须与 F1/F2 同批 | 与 §六 #3 同轮：先抽自动保存的 9 条守卫到 `src/lib/autoSaveGate.ts` + 8–10 条单测，`App.tsx` 只留调用；拆文件另立 ADR |
| **`escapeHtmlForParse` 严格围栏 / `data-safety-acceptance.mjs` 的 `.editor` 选择器 / 1 MB parse 拆埋点 / `[toc]` 还原 / 表格 `colwidth` 导出清理 / 宿主 `/__asset`** | 第 38–43 轮 leftover | P2 | 都是「改一处要连带改另一处 + 复跑旧套件」的类型，单轮做一半会留半套 | 与上一行（`App.tsx` 质量）同排「质量/收尾轮」：先修 `.editor` 选择器让 `data-safety` 恢复，再动 `codeScan.ts` 的 `fenceMap`（与 `risk.ts` 同判） |
| **`packaging/README.txt` 的「没有安装器」矛盾** | ship S4 | P3 | 1 行文档，不单独占任务 | **本轮 §五 收尾已顺带改**（1 行，不需重打包） |

## 七、环境与脚本注意（本轮会重复踩）

- dev server 只在 `http://localhost:5175`：不另起、不重启；`5173` 是僵尸 server，禁用。
- 浏览器只用 CDP **9222**：不启动 Edge、不 kill `msedge`、不 `browser.close()`；每段 E2E 前 `node .tmp/reset.mjs 9222`（reset 后剩 `about:blank`，`connectOverCDP` 可直接 attach）。
- 自写脚本放 `.tmp/e2e-r44-impl-t{1,2,3}.mjs`，结尾 `page.close()` 后 `process.exit(0)`；中文脚本用 `write`/`edit` 工具改，不要用 PowerShell `Get-Content -Raw | -replace | Set-Content`（AGENTS §8）。
- 假工作区引导抄 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `readFakeFile` / `listFakeFiles`；登录/新建入口抄 `.tmp/e2e-r44-bug-d.mjs`（`.tree-new-main`、`打开文件夹…`）。
- **看到 0 或红，先回看 `plan-review.md` 与本 revision 2**：U1/U4 若用 `li[data-type="taskItem"]`，功能正确时也读 0（§二 实施步骤 1 的「读数口径」有实测证据）；`git grep -c` 按行计，与实现的行折可能差 1（见 RV-2）。判「产品没修好」之前必须先按这两处复核，别在预算里白跑、更别改坏正确实现。
- `- [ ] ` 的输入用 `page.keyboard.type('- [ ] 甲')` 逐字符注入（输入规则按 `handleTextInput` 触发，不能一次 `insertText`）。自动配对默认开着不受影响：critic 实测逐字符打 `- [ ] ` 得到的文本与关掉时一致（`.tmp/critic-r44-probe.log`），不必为它改设置。
- 点 `disabled` 的按钮会让 `page.click()` 30 s 超时（第 42/43 轮实测）：断言禁用态时只读属性；要绕过就用 `__reactProps$` 调 `onClick`。
- toast 活 6 s：连续断言前先等文案消失（第 43 轮 `impl.md:196`）。
- `keyboard-acceptance.mjs` 会覆写 `shots/round-05/` 3 张已跟踪截图：跑完 `git checkout -- shots/round-05/`。
- 本轮 finder 的截图（`shots/round-44/{bug,typora,ship,code,r44-ui}-*`）只读，不要覆盖；实施截图统一 `impl-*`。
- 本轮**不新增测试文件**：新增用例分别叠加到 `src/lib/export.test.ts`（T2）、`src/lib/errorCopy.test.ts`（T3）；文件数仍是 29，只改条数。

## 八、时间预算（诚实口径）与砍单顺序

| 任务 | 实现 | 自测 / E2E | 小计 |
| :--- | ---: | ---: | ---: |
| T1 | 6 min | 7 min | 13 min |
| T2 | 3 min | 3 min | 6 min |
| T3 | 4 min | 4 min | 8 min |
| 收尾（CHANGELOG/README/AGENTS/`packaging/README.txt`/impl.md） | — | — | 3 min |
| 门禁串跑（tsc/test/verify/roundtrip/keyboard） | — | — | 5 min |
| **合计** | | | **≈ 35 min** |

T1 的自测从 6 提到 7 min：R44-6 多一条有序列表负例（多打 4 个字符、多 2 条读数），R44-1 的读数要按新口径写。**35 min 是预算上限，没有余量**，所以：① 先按下面的检查点砍，不砍判定标准；② 允许把 T1 与 T3 的 e2e 放进**同一个浏览器会话/同一个脚本**（先跑 T1 的新文档路径，再切 `短.md` 跑 T3），省两次 `reset.mjs` 与页面启动——这是省时间的写法，不减少任何断言。

检查点（只砍顺序，不砍判定标准）：

- **T1 结束 > 16 min**：T1 的 U8 正对照与 U5 的 `[x]` 保存断言降级为「只读源码文本 + 代码复核」（U1–U4、U6 三条负例不砍）；T2/T3 照做。
- **T2 结束 > 24 min**：T3 的 W1（编辑态 title 正对照，含 9 项词）与 W5（空选区 title）降级为 grep 断言，W2/W3/W4 不砍。
- **> 30 min**：门禁只跑 `npx tsc --noEmit` + `npm test` + 任务 e2e，`npm run verify` / `roundtrip` / `keyboard-acceptance` 交给根代理串跑；收尾文档照写（首屏数字留「待根代理实测」不许编造）。
- **明确不砍**：T1 的 U1（新选择器三项计数 + `data-checked`）、U3（盘上字节）、U6 三条负例（链接、单打 `[ ] `、有序列表）、T2 的 V2/V3（打印深字、屏幕不回归）、T3 的 W4（假错误修复，含改前红基线）、§五 的「不发版 / 不动 `release/`」验收。

## 九、revision 2 的修订核对（planner-revision 实测）

修订只改本文件。核对手段：`read` 实读源码与第三方源码、在仓库里实跑 `git grep` 基线。`.tmp/critic-r44-probe3.log` 是 UTF-16LE、`read` 读不了，已转成 `.tmp/critic-r44-probe3.utf8.log` 再读（只读转换，未动产品代码）。

| 审查条目 | 落点 | 修订前后 | 核对证据 |
| :--- | :--- | :--- | :--- |
| R44-1（P1） | §二 实施步骤 1 的「读数口径」「别在预览里量」+ U1/U4/U5/U8 | 选择器改 `ul[data-type="taskList"] > li` 与 `> li > div`；勾选态读 `checkbox.checked` + `li.getAttribute('data-checked')` | `node_modules/@tiptap/extension-list/dist/task-item/index.js:236-282`（NodeView 只写 `listItem.dataset.checked`，`:276` 无 `data-type`）、`:190-203`（`data-type` 只在 `renderHTML`）；`task-list/index.js:25-31`（`ul` 有 `data-type="taskList"`）；`.tmp/critic-r44-probe3.utf8.log`（`liSelectorCount: 0`、`divText: "丙项"`、`ulOuter` 里的 a11y `span`） |
| R44-2（P1） | §二 改动 1 handler 末尾 + 风险第 1/2 条 + 验收新增 `git grep "return ok ? true : null"` | `chain()…run()` 直接当返回 → `const ok = …run()` + `return ok ? true : null` | `@tiptap/core/dist/index.js:5194-5201`（只认 `null` 或空 tr）、`:5202-5214`（之后才 dispatch）、`:5152-5166` + `CommandManager :80-88`（chainable tr 不自行 dispatch）、`:5294-5304`（返回 false → 走默认插入）、`:7465-7473`（`wrappingInputRule` 同写法） |
| R44-3（P2） | §三 验收的导出单测 | `html.includes('color: #1d2023')` → 按 `indexOf('@media print')` 切片后 `assert.match` | `src/lib/export.ts:63` 改前就有 `color: #1d2023`（实测 `git grep -n` 命中）；改前 `@media print` 在 `export.ts` 里 0 命中 |
| R44-4（P2） | §三 改动 1 与风险第 1 条 | 「值照抄 `:root`」→「照抄浅色档，三个纸色刻意纯白」，注释文案同步 | `src/styles.css:2-4` 是 `#f6f4ee` / `#fffdf8` / `#f1eee6`，不是 `#fff` |
| R44-5（P2） | §四 改动 1 的 `插入 ▾` title + W1 | 7 项 → 9 项（补 `分割线`、`公式块`） | `src/App.tsx:4654-4704` 逐项数过是 9 项（`分割线` `:4666-4668`、`公式块` `:4687-4695`） |
| R44-6（P2） | §二 验收 U6 第 ③ 条 | 新增 `1. [ ] 甲` 负例（`ol > li` 1、`taskList` 0、文本含 `[ ] 甲`） | 守卫是 handler 里的 `$from.node(itemDepth - 1).type.name !== 'bulletList'` |

本修订新发现两条（审查没提，均不改任务）：

- **RV-1**：分析按钮空选区文案「把光标放在要分析的段落里」在空文档里是假话。`src/lib/context.ts:176-180`：`usable.length === 0` 时直接返回空 `selection`；`selection.chars === 0` 正是这种状态（`src/App.tsx:1036`、`:4523`），此时没有段落可放光标。改成「先写一句，或选中一段要分析的文字」，W5 同步。
- **RV-2**：「只有编辑视图支持」改后基线是 **10** 行不是 9——分析按钮的 `title` 也用这句（本任务改动 2）：7 个工具栏按钮 + 专注 `:4756` + 打字机 `:4765` + 分析按钮 = 10。实测改前按行 2、按次 2；`viewMode !== 'edit'` 改前 17、`kind: 'meta'` 改前 1 与计划一致。

任务量与预算：三条任务不变（T1 12 → 13 min，合计 ≈35 min，正好是上限；§八 给了检查点与两条提速）。**未跑任何 e2e / 门禁**（本角色只读），计划里的读数全是改前状态，红/绿判定留给执行代理。

### 本修订仍为 UNVERIFIED

- **T1 转换链在空段落上的 `liftListItem` 行为**：与 `plan-review.md` §五 同口径，靠实现后的 U1 与 §二 的「换顺序」兜底；R44-2 的 `return null` 保证即使全失败也不丢字符。
- **U6 第 ③ 条在有序列表里能否稳定触发**：`1. ` 先建 `orderedList`（StarterKit 的列表输入规则），之后 `[ ] ` 在 `ol > li` 里打。按代码推断命中守卫返回 `null`、字面保留。未实跑；若第一次跑红，先确认是不是把 `1. ` 与 `[` 合成一次 `insertText` 注入了（必须逐字符 `type`）。
- **`title` 的取值时机**：W2/W3/W5 只读 DOM 属性、不点禁用按钮；`title` 由 `viewMode` / `selection.chars` 直接决定，无异步，推断稳定。
