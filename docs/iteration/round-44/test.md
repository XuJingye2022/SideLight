# 第 44 轮 · 独立验收（tester，首次验收）

- 轮次：`round=44`、`nn=44`；轮前 `startSha=d22807f4361a32d06a49f6645d610511f3ce7bb7`（验收开始时 `git rev-parse HEAD` 一致）
- 环境：dev server `http://localhost:5175`（未启动、未重启）；CDP `9222`；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`、未 push、未动 `release/`
- 未读 `impl.md`（按 `roles/tester.md`）：只读 `plan.md`、`git diff`、源码、`.tmp/` 日志与截图
- 判定：**PASS**（门禁全过、逐条复验 23/23 绿、无回归）；3 条计划口径偏差（均非缺陷，见 §四）、4 条 UNVERIFIED（见 §五）

## 一、门禁（全部实跑）

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npx tsc --noEmit` | **exit 0**，无输出 | 本轮实测（TSC_EXIT=0） |
| `npm test` | **29 个文件、380 条，0 fail**（29 条 `ℹ tests` 求和 = 380；29 条 `ℹ fail 0`） | `.tmp/test-r44-tester.log` |
| `npm run verify` | **PASS**：`total raw=946590 gzip=292681 headroom=27319 files=3 max=320000`；主 chunk `index-Dxk5eSq9.js` 909.93 kB / gzip 288.23 kB | `.tmp/verify-r44-tester.log` |
| `npm run roundtrip` | **rich 5/7、source 7/7 等值**（04-reference-links、06-task-list 为已知 diff；firstSaveBlocked 1/7） | 本轮实测；`docs/roundtrip-report.md` 复跑后无 diff |
| `src/lib/export.test.ts` | **17 条 0 fail**（含新增「导出 HTML 的打印块用浅底深字，且排在深色块之后」） | 本轮实测，EXPORT_EXIT=0 |
| `src/lib/errorCopy.test.ts` | **8 条 0 fail**（含新增 2 条 `mockItems` 用例） | 本轮实测，ERRCOPY_EXIT=0 |
| `node scripts/keyboard-acceptance.mjs` | **52/52 PASS** | `.tmp/kb-r44-tester.log`；跑完 `git checkout -- shots/round-05/` 已还原 2 张 |

数字与实施声明一致：372 → **380**（导出 1 + 模拟分析 2，另 5 条来自第 43 轮的 `risk.test.ts`），文件数仍 29；首屏 292,046 → **292,681 B（+635 B）**，距内部 310,000 余 17,319 B、距硬线 320,000 余 27,319 B。

## 二、逐任务复验（自己写脚本，不读/不抄实施断言）

脚本：`.tmp/e2e-r44-tester.mjs`（本轮新写，含 23 条断言与 6 张截图），日志 `.tmp/e2e-r44-tester.log`；**23/23 PASS、0 红、0 控制台错误、0 失败请求**。

```
SUMMARY pass=23 red=0 errors=0 requestfailed=0
```

### T1（P1 数据安全）手打 `- [ ] ` / `- [x] ` 建任务项，保存写回 `- [ ] `

| 断言 | 实测 | 结论 |
| :--- | :--- | :--- |
| U1 新文档逐字符 `- [ ] 甲` | 编辑视图 `ul[data-type="taskList"]` **1**、`> li` **1**、`input[type=checkbox]` **1**；`checkbox.checked=false`、`li[data-checked]="false"`、`li > div` 文本 `"甲"`；`.ProseMirror` 文本 **不含** `[ ]` | PASS |
| U2 续写 `乙` | `taskLis=1`、`li > div` = `"甲乙"` | PASS |
| U3 `Ctrl+S` 盘上字节 | `未命名.md` = `"- [ ] 甲乙\n\n"`；无 `\[` / `\]`；`dirty=false` | PASS |
| U3b 源码视图 | `textarea.source-editor.value` = `"- [ ] 甲乙\n\n"`（无 `\[`） | PASS |
| U4 任务项里 `Enter` | `taskLis=2`；第 2 项 `checked=false`、`data-checked="false"`；输入 `二` 后第 2 项 `div` = `"二"` | PASS |
| U5 另起一段 `- [x] 已办` | 第 2 个 `ul[data-type="taskList"]` 出现、末项 `checked=true`/`data-checked="true"`；盘上 `"- [ ] 甲乙\n- [ ] 二\n\n- [x] 已办\n\n"`（无 `\[`） | PASS |
| U6① `- [链接](https://example.com)` | 普通 `ul:not([data-type="taskList"]) > li` **1**、任务列表 **0** | PASS |
| U6② 单独打 `[ ] 正文` | 任务列表 **0**、正文保留字面 `[ ] 正文` | PASS |
| U6③ 有序列表 `1. [ ] 甲` | `ol > li` **1**、任务列表 **0**、`ol>li` 文本含 `[ ] 甲` | PASS |
| U7 控制台 | `errors: []`、`requestfailed: []` | PASS |
| U8 正对照（普通项 + 任务项同文档） | 普通 `li` **1**（文本含「普通项」）、任务 `li` **1**（`div` = `"甲"`） | PASS |

截图：`shots/round-44/test-t1-taskitem.png`（任务项 + 复选框，未勾选，正文「甲」）、`shots/round-44/test-t1-saved-source.png`（源码视图 `- [ ] 甲乙`，无转义）。

### T2（P1 用户可见）深色主题打印 / 另存 PDF 浅底深字

走真实设置面板（`设置` → `role=radio 深色` → 对话框 `保存`）后取样：

| 断言 | 实测 | 结论 |
| :--- | :--- | :--- |
| V1 屏幕态不变 | `data-theme="dark"`；`p` 计算色 `rgb(233, 230, 224)`；`color-scheme: dark`、`--ink:#e9e6e0`、`--paper:#15171a` | PASS |
| V2 `emulateMedia({media:'print'})` | `p` = **`rgb(29, 32, 35)`**；`color-scheme` = `light`；`--ink` = `#1d2023`、`--paper` = `#fff` | PASS |
| V3 还原 `media:screen` | `p` 回到 `rgb(233, 230, 224)`、`--paper` 回 `#15171a`（打印覆盖不外溢） | PASS |
| V4 `media:'print'` + `colorScheme:'dark'` | `p` = `rgb(29, 32, 35)` | PASS |
| V4b `data-theme="system"`（跟随系统深色）+ 打印 | `p` = `rgb(29, 32, 35)`（第三个选择器覆盖系统深色媒体块） | PASS |
| V5 控制台 | `errors: []` | PASS |

截图：`shots/round-44/test-t2-print-dark.png`（`media=print` 整页：白底黑字「打印浅底深字测试。」，界面已隐藏）、`shots/round-44/test-t2-screen-dark.png`（还原后屏幕仍是深色）。

### T3（P2 用户可见 / 正确性）只读视图说明 + 模拟分析不再误报格式错

| 断言 | 实测 | 结论 |
| :--- | :--- | :--- |
| W1 编辑视图 7 个按钮 title 是功能名 | `插入 ▾` = 「插入：表格 / 代码块 / 引用 / 任务列表 / 分割线 / 图片 / 公式 / 公式块 / 链接」（**9 项全含**）；H1/H2/B/I/S/`</>` 分别带 Ctrl+1、Ctrl+2、Ctrl+B、Ctrl+I、Ctrl+Shift+X、行内代码 | PASS |
| W2a 预览 7 个按钮 | 全部 `disabled=true` 且 `title='只有编辑视图支持'` | PASS |
| W2b 源码 7 个按钮 | 同上（`viewMode=source`） | PASS |
| W3 预览里「分析本段（模拟）」 | `disabled=true`、`title='只有编辑视图支持'`；`__reactProps$.onClick()` 绕过 disabled 后 `viewMode` 仍 `preview`、`.margin-rail` 子元素数不变（0→0）、toast 不含「没按约定格式回」 | PASS |
| W4 编辑视图短句分析（改前红） | `.rail-goal` **1** 个、`.rail-goal-text` = 「给一个观点补理由。」；3 s toast 采样里 **不含**「没按约定格式回」 | PASS |
| W5 空白新文档 | 分析按钮 `disabled=true`、`title='先写一句，或选中一段要分析的文字'`（RV-1 文案） | PASS |
| W6 控制台 | `errors: []` | PASS |

截图：`shots/round-44/test-t3-rail-goal.png`（我的理解 + 批注）、`shots/round-44/test-t3-preview-disabled.png`（预览下工具栏与分析按钮灰态）。

## 三、回归

| 项 | 结果 |
| :--- | :--- |
| `keyboard-acceptance.mjs`（本轮唯一跑的既有端到端套件，覆盖 `- ` 建列表、`Ctrl+K`、`[` `]` / `Ctrl+Shift+P` / Esc / 表格 Tab） | **52/52 PASS**；跑完已 `git checkout -- shots/round-05/`，`git status --porcelain shots/` 只剩 `?? shots/round-44/` |
| `npm run roundtrip` | rich 5/7、source 7/7，与第 43 轮一致（T1 未动序列化，作回归锁） |
| 普通列表不被任务规则吃掉 | U6①②③ + U8 四条 |
| 打印覆盖不外溢到屏幕 | V1/V3 |

## 四、与计划的偏差（均不影响判定）

1. **`src/lib/taskListInput.ts` 的实现路线与计划 §二 改动 1 不同**：没有用 `chain().deleteRange().liftListItem().toggleTaskList()`，而是走计划 §二「失败兜底」的**手工事务**（直接把当前 `listItem` 换成 `taskList(taskItem(paragraph))`，列表前后各留一段）。计划明确允许这条兜底，且兜底要求「失败就 `return null`、不要先 `tr.replaceWith` 再返回 false」——实现满足：三段守卫（祖先必须是 `bulletList`、`childCount === 1`、`offset/size` 越界检查）全部在 `tr` 写入之前，之后没有失败返回。因此计划 §二 验收里的 `git grep -n "return ok ? true : null" -- src/lib/taskListInput.ts` **实测 0**（该行是链式写法的锁，本实现不需要）。手工事务的收益有实测支撑：U8 普通项与任务项共存、兄弟项零改动（链式写法会把相邻列表合并后整串变任务项，见源码注释）。
2. **`TASK_MARKER` 正则末尾用字面空格不用 `\s`**（计划写 `\s$`）：`\s` 会让 Enter（Tiptap 用 `text:"\n"` 复用输入规则）也命中。改后 U6② 与 U4/U5 的 Enter 行为都成立。
3. **额外移除 `TaskItem` 自带的输入规则**（`TaskItem.extend({ addInputRules: () => [] })`，计划未写）：不删的话普通段落里单打 `[ ] ` 会变任务项，U6② 会红。实测 U6② 通过、U1–U5 不受影响。
4. **计划 §四 基线算错 1 行**：`git grep -c "viewMode !== 'edit'" -- src/App.tsx` 实测改前 **17**、改后 **20**（计划写 19）。多的 1 行是分析按钮 `title` 的三元判断（`src/App.tsx:4530`），与计划「改动 2 的 title」一致，行为正确；说明书写的是行数估算漏了 title 里那一处，不是多做/少做。`git grep -c "只有编辑视图支持"` 实测 **10 行 / 10 次**（与 RV-2 一致）。
5. 其它验收 grep 全对：`kind: 'meta'` 在 `src/lib/ai.ts` **2** 处（:267 单句、:278 多句）；`@media print` **2** 处（`src/styles.css:1939`、`src/lib/export.ts:128`）；`color-scheme: light` 在 `styles.css` **2** 处（:32、:1978）；`TaskListInput` 在 `src` 出现 3 处 + 定义 1 处。

## 五、UNVERIFIED（写清原因与补测方法）

1. **真实中文输入法下的 `[` / `]`**：本轮 E2E 是 Playwright 逐字符 ASCII 注入（`handleTextInput` 路径）。IME 组合输入是否走同一条规则未测。补测：真机中文输入法里打 `- [ ] `，看是否建任务项。
2. **真机「打印到 PDF」的产物**：本机无打印机、宿主窗口起不来，只验到 `emulateMedia({media:'print'})` 的计算样式层。补测：宿主「导出 → 打印」→ Microsoft Print to PDF → 打开 PDF 采样文字色。
3. **导出 HTML 在真实浏览器里的打印**：只有按位置切片的单测（`@media print` 在深色块之后、块内 `body{color:#1d2023}`）。补测：打开导出的 `.html` → 打印预览。
4. **`packaging/README.txt` 那行改动**：本轮没有安装包/便携包可验，只核对文本（老句 `没有自动更新、没有安装器、没有代码签名。` 0 命中、新句 1 命中）。
5. 计划 §三 的「深色档高亮 ≥ 4.5:1 对比度」未单独量（`--on-mark` `#fffdf8` 配 `--mark` `#9a5b1c`，未做计算）；本轮只验打印下正文深字。补测：打印媒体下量 `mark` 元素对比度。

## 六、收尾文档核对（先贴改前 >0）

| 检查 | 结果 |
| :--- | :--- |
| `git grep -n "没有自动更新、没有安装器、没有代码签名。" -- packaging/README.txt` | **0**（旧句已换）；新句 1 命中（:45） |
| `git grep -n "377 条" -- AGENTS.md` | **0**（改后写 380，:39/:72 一致） |
| `git grep -nE "29–44" -- docs/CHANGELOG.md` | 1 命中（:5 `## Unreleased（第 29–44 轮，未发版）`） |
| `git diff --stat -- package.json release/` / `git status --porcelain release/` | 均空（**不发版、不动 release/**）；`package.json` 仍 `0.32.1` |
| README 数字 | `:114` 292,681 B / 余 27,319 B、`:133` 380 条、`:40`/`:61` 两条能力句 —— 与本轮实测一致 |

## 七、判定

**PASS**。门禁全过（tsc / 380 条测试 / verify 292,681 B / roundtrip / keyboard 52/52），T1–T3 验收标准逐条从零复验 23/23 绿，无回归；偏差均属计划口径或计划明确允许的兜底路线，不影响产品行为。UNVERIFIED 5 条按 §五 补测。本轮不发版、不动 `release/`。
