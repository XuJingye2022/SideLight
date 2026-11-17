# 第 44 轮 · 实现报告（executor）

- 轮次：`round=44`、`nn=44`；轮前 `startSha=d22807f4361a32d06a49f6645d610511f3ce7bb7`（`git rev-parse HEAD` 未变）。
- 输入：`plan.md`（revision 2）、`plan-review.md`（含 revision 2 复审的 R44-7…R44-10）、`AGENTS.md` §4/§8、`docs/CHANGELOG.md` 头部。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9222**，每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`。
- 未 commit、未 push、未改 `package.json` 版本、未动 `release/`（`git diff --stat -- package.json release/` 空）。

## 一、任务状态

| id | 标题 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| T1 | 手打 `- [ ] ` 建任务项，保存不再写 `\[ \]` | **DONE** | U1–U8 全 PASS（`.tmp/e2e-r44-impl-t1t3.after.log`）；截图 `shots/round-44/impl-t1-taskitem.png`、`impl-t1-saved-source.png` |
| T2 | 深色主题打印 / 另存 PDF 用浅底深字 | **DONE** | V1–V5 全 PASS（`.tmp/e2e-r44-impl-t2.after.log`）；导出单测 +1；截图 `impl-t2-print-dark.png`、`impl-t2-screen-dark.png` |
| T3 | 只读视图说清为什么不能点；模拟分析不再误报格式错 | **DONE** | W1–W6 全 PASS；`errorCopy.test.ts` +2；截图 `impl-t3-preview-disabled.png`、`impl-t3-rail-goal.png` |
| 收尾 | CHANGELOG / README / AGENTS / `packaging/README.txt` | **DONE** | 见 §六 |

## 二、T1：任务列表输入规则

### 改动文件

1. **新增 `src/lib/taskListInput.ts`**（59 行，无新依赖）：
   - `TASK_MARKER = /^\s*\[([ xX])\] $/` —— 末尾是**字面空格**（按 R44-7 改；`\s` 会被 Enter 的输入规则复用而误触发）。
   - `priority: 1000`，先于 `@tiptap/extension-task-item` 自带的同名规则。
   - 祖先守卫：必须在 `bulletList > listItem > paragraph` 里，`listItem` 只有一个 `paragraph` 子节点；否则 `return null`（有序列表、普通段落保持字面）。
   - 转换用**手工事务**（`state.tr`）：把当前 `listItem` 换成 `taskList > taskItem > paragraph`，列表前后各留一段 `bulletList`，兄弟项一个字节不动；`replaceWith` 后 `TextSelection.create` 把光标放回新任务项的段落里。
   - 不留 `deleteRange` 之类的半截事务：一切都写在同一笔 `state.tr` 里，`applyRule` 只在 handler 返回 `null` 或 tr 无步骤时丢弃（`node_modules/@tiptap/core/dist/index.js:5194-5201`）。
2. **`src/App.tsx:77`** 新增 `import { TaskListInput } from './lib/taskListInput.ts'`。
3. **`src/App.tsx:791-798`** 挂载：`TaskList` → `TaskItem.extend({ addInputRules: () => [] }).configure({ nested: true })` → `TaskListInput`。
   - 去掉 `TaskItem` 自带输入规则的原因：它在 `listItem` 里恒失败（taskItem 没有 `group`），却会在**普通段落**里把字面 `[ ] ` 变成任务项（改前 E2E 实测：U6② `taskLis` 0→1）。去掉后「单打 `[ ] ` 保持字面」与 Typora 一致（plan §二 的正则注释与 U6② 都要求这个口径）。

### 与计划的三处偏差（都是实现期实测逼出来的，判定标准不变）

| 计划写法 | 实际写法 | 原因（实测） |
| :--- | :--- | :--- |
| `chain().deleteRange(lift).toggleTaskList().updateAttributes()`，`return ok ? true : null` | 手工事务 + `kept` 片段 | ① Tiptap 的 handler 类型是 `void \| null`，`return true` 过不了 `tsc`（TS2322）；② `liftListItem + toggleTaskList` 会把**相邻两个无序列表合并**，随后 `toggleList` 把整串兄弟项一起变成任务项——U8 首次跑就是 `taskLis:2`（`普通项` 也被吃成任务项）；③ 这条 chainable 链即使步骤全进了 tr，`run()` 仍返回 `false`（实测 doc 已是 `taskList` 而 `ok:false`），拿布尔值当判据会白丢事务。手工事务同时满足「只换这一项」与「失败不丢字符」。 |
| 判据 `git grep "return ok ? true : null"` = 1 | 四条 `return null` 守卫（`itemDepth < 2` / 非 `bulletList` / 列表项不是「单段落」/ `offset` 越界）+ 没有布尔判据（新文件未跟踪，`git grep` 不搜） | 手工事务没有「先删再判」的半截状态：所有守卫都在写 tr **之前**，写进去的只有最终节点替换；回归锁改成 U6 三个负例 + U8 正对照 + U1（字符不少、兄弟项不动）。 |
| `Fragment.cut(offset, offset+size)` 删掉匹配段 | `content.cut(0, offset).append(content.cut(offset + size))` | `Fragment.cut(from, to)` 取的是「之间」的内容，`cut(0, size)` 有 `from==0 && to==size` 的短路会**原样返回整段**——首次实现把 `[ ] ` 留在了正文里（实测 `keptSize:4`），拼左右两半才对（`keptSize:0`）。 |

### E2E（`.tmp/e2e-r44-impl-t1t3.mjs`，一个会话跑 T1+T3）

改前基线（`git stash` 掉产品改动后实跑，`.tmp/e2e-r44-impl-t1t3.before.log`）：U1/U2/U4/U5/U8 全红——`taskLists:0`、`plainUlLis:1`、正文 `[ ] 甲`、盘上 `- \[ \] 甲乙`；U6② 红（`taskLis:1`，内置规则把普通段落变成任务项）；U6③ 红（`ol:[]`，被上一步污染）。

改后（`.tmp/e2e-r44-impl-t1t3.after.log`，exit 0，24 条全 PASS）：

| 断言 | 读数 |
| :--- | :--- |
| U1 | `taskLists:1 taskLis:1 checkboxes:1`，`checkbox.checked=false`、`data-checked="false"`、`li > div` 文本 `甲`、正文不含 `[ ]` |
| U2 | 同项正文 `甲乙` |
| U3 | 盘上 `- [ ] 甲乙`，无 `\[`；`dirty:false` |
| U4 | 任务项 2 个，第二个 `checked=false` / `data-checked="false"`，正文 `二` |
| U5 | 第三个 `[x]`：`checked=true`、`data-checked="true"`；盘上 `- [x] 已办` |
| U6① | 链接行 → 普通 `ul > li` +1，任务项数不变 |
| U6② | 单打 `[ ] 正文` → 任务项数不变，正文保留 `[ ] 正文` |
| U6③ | `1. [ ] 甲` → `ol > li` 1、任务项数不变、文本含 `[ ] 甲` |
| U8 | 普通项 1 + 任务项 1，文本分别 `普通项` / `甲`（普通项不再被吃） |
| U7 | `errors: []`、`requestfailed: []` |

截图（源码视图，盘上字节的可读证据）：`shots/round-44/impl-t1-saved-source.png` —— `- [ ] 甲乙`、`- [ ] 二`、`- [x] 已办`，以及三个负例 `- \[链接\](…)`、`\[ \] 正文`、`1. \[ \] 甲`。

### 已知边界 / 取舍

- **没有 Node 单测**：输入规则要在 ProseMirror view + DOM 里才触发，`node --experimental-strip-types` 没有 DOM；可独立测的只有正则。回归锁改用 U1–U8 的 E2E（与第 33 轮智能标点同一取舍）。
- 粘贴 `- [ ] x` 不触发输入规则（粘贴不走 `handleTextInput`），本轮不处理。
- 中文 IME 下 `[` / `]` 走不走同一条 `handleTextInput`：本轮 E2E 是 ASCII 注入，**UNVERIFIED**。
- R44-7 的「`- [ ]` + Enter」：正则末尾改成字面空格后，Enter 的 `text="\n"` 不再命中；本轮没有单独的 Enter 负例断言（U4 的「Enter 续项」间接覆盖），已在 U6 三条负例里保住「不误伤」这一面。

## 三、T2：打印配色

### 改动文件

1. `src/styles.css:1967-2003`（`@media print` 块内、`.editor { max-width: none }` 之后）新增打印专用变量覆盖，选择器 `:root, html[data-theme='dark'], html:not([data-theme='light']):not([data-theme='dark'])`；`color-scheme: light`；`--paper` / `--paper-raised` / `--panel` 用纯白（`#fff`），其余 15 个变量照抄 `:root` 浅色档。注释按 R44-4 口径写明「变量值与 `:root` 的浅色档一致，仅三个纸色用纯白」。
2. `src/lib/export.ts:128-134`：导出模板的 `STYLES` 在 `prefers-color-scheme: dark` 块之后追加 `@media print` 块。
3. `src/lib/export.test.ts` 追加 1 条测试（`导出 HTML 的打印块用浅底深字，且排在深色块之后`），按 R44-3 用 `indexOf('@media print')` 切片后 `assert.match(/body\s*\{\s*color:\s*#1d2023/)`，再断言深色块在打印块之前。

### E2E（`.tmp/e2e-r44-impl-t2.mjs`）

改前基线（`git stash` 掉 `styles.css` + `export.ts`，`.tmp/e2e-r44-impl-t2.before.log`）：V2/V4 红——打印媒体下 `pColor:"rgb(233, 230, 224)"`、`colorScheme:"dark"`、`ink:"#e9e6e0"`、`paper:"#15171a"`。

改后（`.tmp/e2e-r44-impl-t2.after.log`，exit 0，5 条全 PASS）：

| 断言 | 读数 |
| :--- | :--- |
| V1 深色 + 屏幕 | `pColor:"rgb(233, 230, 224)"`、`ink:"#e9e6e0"`（屏幕没被改） |
| V2 深色 + 打印 | `pColor:"rgb(29, 32, 35)"`、`colorScheme:"light"`、`ink:"#1d2023"`、`paper:"#fff"` |
| V3 回屏幕 | `pColor:"rgb(233, 230, 224)"`（打印覆盖不外溢） |
| V4 无 `data-theme` + 系统深色 + 打印（R44-8） | `theme:null`、`pColor:"rgb(29, 32, 35)"`、`ink:"#1d2023"` —— 真正命中的是第三个选择器 |
| V5 | `errors: []` |

截图：`impl-t2-print-dark.png`（打印媒体浅底深字）、`impl-t2-screen-dark.png`（回屏幕仍深色）。

### 对照表（防将来漂移）

| 变量 | `:root` 浅色档 | 打印块 |
| :--- | :--- | :--- |
| `--paper` | `#f6f4ee` | `#fff`（刻意纯白） |
| `--paper-raised` | `#fffdf8` | `#fff`（刻意纯白） |
| `--panel` | `#f1eee6` | `#fff`（刻意纯白） |
| 其余 15 个（`--ink`…`--on-mark`） | 见 `src/styles.css:5-20` | 逐字一致 |

## 四、T3：只读视图说明 + 模拟分析

### 改动文件

1. `src/App.tsx:4649-4657`：`插入 ▾` 加 `title`，编辑态 9 项清单（表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接 —— R44-5），非编辑态「只有编辑视图支持」。
2. `src/App.tsx:4720-4765`：H1/H2/B/I/S/`</>` 六个按钮加 `title`（`一级标题（Ctrl+1）`、`二级标题（Ctrl+2）`、`粗体（Ctrl+B）`、`斜体（Ctrl+I）`、`删除线（Ctrl+Shift+X）`、`行内代码`），非编辑态统一「只有编辑视图支持」。
3. `src/App.tsx:4525-4543`：分析按钮 `disabled={viewMode !== 'edit' || selection.chars === 0 || analyzing}`，`title` 三态：非编辑「只有编辑视图支持」/ 空选区「先写一句，或选中一段要分析的文字」（RV-1）/ 有选区保持原模拟提示。
4. `src/App.tsx:1373`、`:1565`：`runAnalysis` 早退加 `viewMode !== 'edit'`，依赖数组补 `viewMode`。
5. `src/App.tsx:1384`：空选区的 toast 文案改成「先写一句，或选中一段文字，再按 Ctrl + Enter。」（R44-9，与按钮 `title` 同口径；`Mod-Enter` 不经过按钮 `disabled`，这句能被空文档按到）。
6. `src/lib/ai.ts:262-268`：`mockItems` 单句分支补 `meta`（文案与多句分支一致，`MarginRail.tsx:84` 的前缀剥离正则能匹配）。
7. `src/lib/errorCopy.test.ts`：补 `mockItems` import、`ContextPayload` 类型与 2 条用例（单句也有 1 条 `meta`；多句分支仍只有 1 条）。

### E2E（同一个 `.tmp/e2e-r44-impl-t1t3.mjs` 会话，切 `短.md`）

改前红基线（`.tmp/e2e-r44-impl-t1t3.before.log`）：7 个按钮 `title` 只有功能名（`插入 ▾`/`H1`/`H2` 是 `null`）；预览里 `.analyze-button` `disabled:false`、`title` 是模拟提示；编辑视图对短句分析 → `toast:"模型没按约定格式回，重试一次看看。"`、`railGoal:null`；空文档 `Ctrl+Enter` → `toast:"先选中一段文字，再按 Ctrl + Enter。"`。

改后（`.tmp/e2e-r44-impl-t1t3.after.log`）：

| 断言 | 读数 |
| :--- | :--- |
| W1 编辑态 | 7 个 `title` 都是功能名；`插入 ▾` 含 9 项菜单词；`</>` 为「行内代码」（按 R44-10 不要求快捷键） |
| W2 预览 / 源码 | 7 个 `disabled:true` 且 `title:"只有编辑视图支持"` |
| W3 预览里分析按钮 | `disabled:true`、`title:"只有编辑视图支持"`；绕过 `__reactProps$.onClick()` 后仍是 `preview`、批注数不变、无格式错误 toast |
| W4 编辑态短句分析 | `.rail-goal` = 「我的理解给一个观点补理由。判错了，重来」、toast 不含格式错（改前红） |
| W5 空文档 | `disabled:true`、`title:"先写一句，或选中一段要分析的文字"`；`Ctrl+Enter` → toast「先写一句，或选中一段文字，再按 Ctrl + Enter。」 |
| W6 | `errors: []` |

截图：`impl-t3-preview-disabled.png`、`impl-t3-rail-goal.png`。

## 五、门禁（串跑，改后）

```text
npx tsc --noEmit                      exit 0
npm test                              29 个文件 380 条 / pass 380 / fail 0（377 + 导出 1 + 模拟分析 2）
npm run verify                        exit 0
  total raw=946590 gzip=292681 headroom=27319 files=3 max=320000
  target=310000 gap=17319
npm run roundtrip                     exit 0：rich 5/7 完全保真；source 7/7 等值；firstSaveBlocked 1/7
node scripts/keyboard-acceptance.mjs  52/52 PASS（exit 0；跑完 git checkout -- shots/round-05/ 已还原）
```

首屏 gzip **292,681 B**（第 43 轮 292,046 B，+635 B；内部 310,000 / 硬线 320,000，余 27,319 B，PASS）。

## 六、收尾文档

- `docs/CHANGELOG.md`：`## Unreleased（第 29–43 轮…）` → 标题改「29–44」，并在第 43 轮块之后加 `**第 44 轮（同一未发版区间）**` 五条（T1 / T2 / T3 两条 / 门禁 + UNVERIFIED）。
- `README.md`：`:40` 正文编辑补任务项；`:61` 导出补打印配色；`:114` 首屏数字（292,681 B、余 27,319 B）与「第 44 轮 +635 B」；`:133` 测试条数 380。`:171` 的「29 个测试文件」本轮不变（未新增测试文件）。
- `AGENTS.md`：`:39` 与 `:72` 的「29 个文件 377 条」→ 380；`:72` 能力长句补一句任务列表与打印配色；`:74` 首屏数字 292,681 B / 余 27,319 B。
- `packaging/README.txt:45`：`没有自动更新、没有安装器、没有代码签名。` → `没有自动更新、没有代码签名；这个便携包里也没有安装器。`（ship S4 的 1 行；**本轮没有包可验，未重新打包**）。
- 未改 `docs/iteration/STATE.md`（根代理轮末统一更）、未改 `package.json` 版本、未动 `release/`。

## 七、UNVERIFIED（本轮）

1. **中文输入法下的 `[` / `]`**：E2E 是 ASCII 注入，与计划同口径；补测：真人中文 IME 里在无序列表打 `- [ ] `。
2. **真机「打印到 PDF」的产物**：本机无打印机、宿主窗口起不来，只到 `emulateMedia({media:'print'})` 的计算样式层；补测：宿主「导出 → 打印」→ Microsoft Print to PDF → 打开 PDF 看文字色，或 CDP `Page.printToPDF`。
3. **导出 HTML 在浏览器里打印的实测**：只有按位置切片的单测（`@media print` 块存在且改色、在深色块之后），没有在浏览器里打开导出文件。
4. **`packaging/README.txt` 的那行改动**：本轮无包可验，下次打包自然带上。
5. **R44-7 的「`- [ ]` + Enter」显式负例**：正则已改字面空格，但没有单独的 Enter 断言（只有 U4 的续项与 U6 三条负例间接覆盖）。

## 八、新踩的坑（建议进 AGENTS §8）

- **`Fragment.cut(from, to)` 不是「删掉 from..to」**：它取两者之间的内容，且 `cut(0, size)` 因 `from==0 && to==size` 短路会原样返回整段；删一段要 `cut(0, offset).append(cut(offset + size))`（第 44 轮实测 `keptSize:4` → `0`）。
- **Tiptap 3 的输入规则 handler 在 chainable state 上跑，`chain().run()` 的布尔值不可信**：即使所有步骤都进了 tr，也可能返回 `false`（第 44 轮实测：doc 已变 `taskList`、`ok:false`）。这也是最终改用手工事务的原因之一；若仍用 chain，判断「转换成功没有」要看 tr 之后的光标祖先，失败时仍必须 `return null`（`@tiptap/core` 的 `applyRule` 只认 `null` 或空 tr）。
- **输入规则的 `\s` 会匹配 Enter 注入的换行**：`handleKeyDown` 对 Enter 用 `text:"\n"` 调 runner，`/^\s*…\s$/` 会在 `- [ ]` + Enter 上误命中并把换行吃掉；末尾要写字面空格。
- **`liftListItem + toggleTaskList` 会整串转换兄弟项**：`liftListItem` 把相邻两个无序列表合并后，`toggleList` 改的是整个列表节点——要「只换这一项」就得手工构造 `taskList > taskItem` 并拆前后列表。
