# 第 43 轮 · 实施报告（executor）

- 轮次：`round=43`、`nn=43`；轮前 `startSha=0f83e1f80f57d93e0860282a0d3b0bc2b7953750`（开工前 `git rev-parse HEAD` 实测一致；工作树只有 `docs/iteration/round-43/`、`shots/round-43/` 两个未跟踪目录）。
- 输入：`.tmp/iteration/common.md`（56 行）、`.tmp/iteration/roles/executor.md`（33 行）、`docs/iteration/round-43/plan.md`（revision 3，433 行）、`docs/iteration/round-43/plan-review.md`（revision 3 复审，109 行）、`AGENTS.md`、`docs/iteration/STATE.md`。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP 只用 **9222**（每段 E2E 前 `node .tmp/reset.mjs 9222`）；未启动 Edge、未 kill `msedge`、未 `browser.close()`。
- **未发版**：`package.json` 版本未动（0.32.1）；CHANGELOG 写进现有 `## Unreleased` 区间；未改 `release/`、未 commit、未 push。
- 结论：**T1–T4 全部完成**；`tsc` / `npm test` / `npm run verify` / `npm run roundtrip` / `keyboard-acceptance` 全绿；四条计划外偏差与四条 UNVERIFIED 见 §六、§七。

## 一、逐任务状态

| 任务 | 状态 | 主要证据 |
| :--- | :--- | :--- |
| T1 预览（只读）真正只读 + 预览自己触发公式加载 | **DONE** | `.tmp/e2e-r43-impl-t1.mjs` 改前 4 PASS / **10 RED**（`.tmp/e2e-r43-impl-t1.before.log`）→ 改后 **14/14 PASS**（`.tmp/e2e-r43-impl-t1.after.log`） |
| T2 拖入 `.md` 有提示不导航 + 弹层 `Esc` 只取消弹层 | **DONE** | `.tmp/e2e-r43-impl-t2.mjs` 改前 2 PASS / **5 RED**（`.tmp/e2e-r43-impl-t2.before.log`）→ 改后 **7/7 PASS**（`.tmp/e2e-r43-impl-t2.after.log`） |
| T3 两个精确快路径 + 死符号 + 首屏口径 | **DONE** | `.tmp/e2e-r43-impl-t3.mjs` **9/9 PASS**（6a 正对照 5 条 + 6b 3 条 + 控制台 1 条）；`risk.test.ts` 8/8；三条死符号 grep 改前 1/1/1 → 改后 0/0/0 |
| T4 发布文档与发现性 | **DONE** | `.tmp/e2e-r43-impl-t4.mjs` **3/3 PASS**；文档 grep 见 §三 |

用时：**约 10 min 30 s**（开工 `17:09:57` → 本报告落盘 `17:20:26`，墙钟实测；E2E 日志 `LastWriteTime` 17:12–17:18、`npm run verify` 与 `npm test` 都串行跑完）。计划估 41 min，实际快在三点：T1/T2 的改前基线用 `git stash` 复跑同一份脚本（没重写代码）、每个任务只跑一次 e2e、`npm test` 与文档编辑并行。按计划 §九「全砍完仍超 35 min 不再砍文档与五处计数」，没有砍任何验收项；§九 的四项砍单**一项也没执行**。

## 二、改动文件（含行号为改后实测）

### T1（数据安全，P1）

`src/App.tsx`

- `:3851` `run()`：`if (!editor || viewMode !== 'edit') return`，依赖数组补 `viewMode`（`:3862`）。工具条格式 / 插入菜单 / 表格条的唯一出口。
- `:3733-3745` window `keydown`：`Ctrl+K` 与 `Ctrl+M`/`Ctrl+Shift+M` 先 `preventDefault()`，`viewMode !== 'edit'` 时 `show('这个视图不能插入公式或链接：先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑')` 并 `return`；`Ctrl+1–6`（`:3748`）与 `Ctrl+0`（`:3754`）同样 `preventDefault()` 后静默早退。依赖数组补 `viewMode` / `show`（`:3791-3793`）。
- `:4639` 「插入 ▾」触发器、`:4705-4739` 六个格式按钮：`disabled={viewMode !== 'edit'}`（改后全仓 9 处，含原「专注 / 打字机」2 处）。
- `:4839` 表格条：`{viewMode === 'edit' && editor?.isActive('table') && (`。
- `:3925` `switchView` 的 `if (next !== 'edit')` 块补 `setMenuOpen(false)`（图片 / 公式 / 链接三项不走 `run()`）。
- `:4156` `openLinkAtCursorRef.current`、`:4268` `openMathAtCursorRef.current`：第一行视图守卫，两个 effect 依赖补 `viewMode`。

`src/components/PreviewPane.tsx`

- `:54-59` 新增 `useEffect`：`hasMath && !ready` 时 `void ensureKatex().catch(() => undefined)`；`:3` import 补 `ensureKatex`。**按 R43-3/复审口径，这是防御性修复**：`App.tsx:994` 的 `setMarkdown` 已有预取，验收断言 9 改前也是绿的（见 §四.1）。

### T2（数据安全 / 用户可见，P1/P2）

- `src/App.tsx:3802-3823`：window 级 drag 守卫（`dragover` 仅 `types` 含 `Files` 时 `preventDefault()`；`drop` 判 `event.defaultPrevented` 后让开，否则挡下并提示）。
- `src/components/MathInlineEditor.tsx:59`：`Escape` 分支补 `event.stopPropagation()`（`stopPropagation` 计数 1 → 2）。
- `src/components/LinkEditor.tsx:72`、`:104`：两个输入框的 `Escape` 各补 `event.stopPropagation()`（计数 1 → 3）。

### T3（性能 / 内部质量，P2）

- `src/lib/risk.ts:322-324`：`classify` 归一化 CRLF 后加精确等价短路 `if (beforeText === afterText) return []`（含两句理由注释）。
- `src/lib/risk.test.ts:29-55`：新增 5 条（表格+标题 / 脚注 / 公式+注释 / CRLF 归一 / 正对照 `blank-lines` 不吞），文件内加了口径注释：**5 条改前亦绿**，快路径的正向证据是 grep。
- `src/App.tsx:3890-3897`：`syncDocInfo(editor)` 移进 `if (!skipReparse)` 块；`setDirty`（`:3903`）留在块外。改后 `syncDocInfo(editor)` 全仓仍 4 处（`:1037`/`:1108`/`:2105`/`:3893`）。
- 删死符号：`src/App.tsx` 的 `serializeBody`（原 `:186-189`）与悬空注释（原 `:178`）、`src/lib/session.ts` 的 `clearSession`（原 `:55-68`，删 15 行）、`src/App.tsx:74` 的 `serializeDocumentBody` import 项；`src/lib/serializeDocument.ts:41` 的 `serializeDocumentBody` **保留**（改后 `git grep` 4 命中：lib 定义 1 + `scripts/fidelity-acceptance.mjs` 3）。
- `scripts/measure-first-screen.mjs:7-8`：口径注记（不含 `MarginRail-*.js` 的 gzip 2,327 B，实际首载 ≈ total + 2,327 B）；**未动 `--max/--target`**。

### T4（发布文档与发现性，P2）

- `README.md:16-22` 新增 Windows 首次安装块（WebView2 运行时 / SmartScreen / 默认路径与指向 `packaging/README.md` / `Get-FileHash`+`certutil` / 便携包）；`:28` macOS 校验行改「校验（macOS）」；`:58` 粘贴说明；`:84` 键盘与查找「四条边界」（**R43-8**）；`:96` 差距 31/10；`:133` `npm test # 29 个文件、377 条断言`；`:171` `29 个测试文件`；`:114` 首屏数字与口径句。
- `docs/typora-gap.md`：`:7` `已经有的（31）`、`:43` `缺的（10）`、`:45` `### 编辑与格式（2）`；`:41` 搬入「粘贴为纯文本 有；`Ctrl+Shift+V`（浏览器原生键，桌面宿主未验证）」；`:31` 列宽「只在本次会话内」；`:56` 视图缩放区分整页 / 正文字号；`:67` 拖入行补第 43 轮现状。
- `AGENTS.md`：`:39` 与 `:72` 测试计数 → 29 个文件 377 条（**R43-5**）；`:74` 首屏 `292,046 B` / 余 `27,954 B` 与差距「当前 31 项有、10 项缺」。
- `src/components/ShortcutsDialog.tsx:39`：`['Ctrl+Shift+V', '粘贴为纯文本（浏览器原生键）']`；`:53-54` 文件注释改成「浏览器原生键必须在标签里标注来源」（**R43-2**）。
- `docs/CHANGELOG.md`：`## Unreleased（第 29–43 轮，未发版）`（`:5`）+ 新增「第 43 轮」块（`:143-171`）。

## 三、命令与结果（原始输出摘要）

```bash
npx tsc --noEmit                     # exit 0（T3 之后一次；T4 文档改完又跑一次，仍 exit 0）
node --experimental-strip-types src/lib/risk.test.ts   # tests 8 / pass 8 / fail 0
npm test                             # exit 0；逐文件汇总 tests 计数 = 29 个文件、377 条、0 fail
                                     #   （日志 .tmp/impl-r43-npmtest.log）
npm run verify                       # build ✓；首屏 total raw=944216 gzip=292046 files=3 max=320000
                                     #   target=310000 gap=17954 headroom=27954 → PASS
npm run roundtrip                    # rich 5/7、source 7/7（与第 42 轮相同）
node scripts/keyboard-acceptance.mjs # 52/52 PASS（跑完 git checkout -- shots/round-05/）
```

任务内验收 grep（改前 → 改后）：

| 断言 | 改前 | 改后 |
| :--- | ---: | ---: |
| `git grep -nw "serializeBody" -- src scripts` | 1 | **0**（exit 1） |
| `git grep -n "clearSession" -- src scripts` | 1 | **0** |
| `git grep -n "编辑器读不全的语法" -- src` | 1 | **0** |
| `git grep -n "serializeDocumentBody" -- src scripts` | 6 | **4**（且 `src/App.tsx` 0） |
| `git grep -n "if (beforeText === afterText) return" -- src/lib/risk.ts` | 0 | **1** |
| `git grep -n "disabled={viewMode !== 'edit'}" -- src/App.tsx` | 2 | **9**（计划 ≥9） |
| `git grep -n "if (!editor \|\| viewMode !== 'edit')" -- src/App.tsx` | 0 | **2**（`run` + `openLinkAtCursorRef`，计划写 1） |
| `git grep -n "syncDocInfo(editor)" -- src/App.tsx` | 4 | **4**（`applySource` 那处在 `if (!skipReparse)` 内，`:3888-3897`） |
| `git grep -c "stopPropagation"` MathInline / Link | 1 / 1 | **2 / 3** |
| `git grep -n "addEventListener('drop'" -- src/App.tsx` | 0 | **1** |
| `git grep -nE "29 项\|28 个测试文件" -- README.md` | 2 | **0** |
| `git grep -n "已有 31 项，缺 10 项" -- README.md` | 0 | **1** |
| `git grep -n "29 个测试文件" -- README.md` | 0 | **1** |
| `git grep -nE "已经有的（31）\|缺的（10）\|编辑与格式（2）" -- docs/typora-gap.md` | 0 | **3** |
| `git grep -n "当前 31 项有、10 项缺" -- AGENTS.md` | 0 | **1** |
| `git grep -nE "30 项有\|11 项缺" -- AGENTS.md` | 1 | **0** |
| `git grep -n "WebView2 运行时" -- README.md` | 0（exit 1） | **1** |
| `git grep -n "表格条都不可用" -- README.md` | 0 | **1**（R43-8） |
| `git grep -n "浏览器原生键"` README/gap/ShortcutsDialog | 0 | **4**（README 1 + gap 1 + ShortcutsDialog 2，计划写 3） |
| `git grep -n "Ctrl+Shift+V"` 同上三文件 | 0 | **3** |
| `git grep -n "Get-FileHash" -- README.md` | 0 | **1** |
| `git grep -n "372 条" -- AGENTS.md` | 2 | **0** |
| `git grep -n "377 条" -- AGENTS.md` | 0 | **2** |

## 四、E2E 细节（含改前/改后两份读数）

脚本：`.tmp/e2e-r43-impl-t1.mjs`、`-t2.mjs`、`-t3.mjs`、`-t4.mjs`、`-shots.mjs`（截图）；假工作区引导复用 `.tmp/r30-fsa.mjs`。

### 4.1 T1（改前 4 PASS / 10 RED → 改后 14/14 PASS）

改前红（`.tmp/e2e-r43-impl-t1.before.log`，用 `git stash push -- src/` 还原后的代码真跑）：

```
RED 2a 预览里表格条不渲染 {"tableBar":1}
RED 2b H1 disabled {"disabled":false}
RED 2c 插入 ▾ disabled {"disabled":false}
RED 3 绕过 disabled 点 H1 不改正文 {"previewH1":2,"dirty":true}
RED 4a 预览里 Ctrl+K 不开链接框且有提示 {"toast":""}
RED 4b 预览里 Ctrl+M / Ctrl+Shift+M 不开公式框 {"toast":""}
RED 4c 预览里 Ctrl+1 / Ctrl+0 不改正文 {"sameText":false,"dirty":true}
RED 5 自动保存没有把字节写脏 {"dirty":false,"same":false}
RED 6 Esc 回编辑 + 保存不写脏字节 {"same":false,"toast":"已保存 乙.md"}
RED 8 源码态只读 {... "h1Disabled":false,"mathInput":1}
PASS 9 预览里公式已渲染 {"katex":2,"pendingNote":0,"mode":"preview"}   ← 改前也绿（R43-3 口径）
```

改后（`.tmp/e2e-r43-impl-t1.after.log`）：`summary pass=14 red=0`，逐条读数：

- 断言 2：`.table-bar` 0、H1 `disabled:true`、插入 ▾ `disabled:true`；断言 3：绕过 `disabled` 调 `__reactProps$.onClick()` 后 `.preview-pane h1` 仍 1、`dirty:false`。
- 断言 4：`Ctrl+K`/`Ctrl+M` 都不开弹层，toast = 「这个视图不能插入公式或链接：先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」；`Ctrl+1` 后预览文本不变、`dirty:false`。
- 断言 5：停 2.6 s 后 `dirty:false` 且 `readFakeFile('乙.md') === 种子`；断言 6：`Esc` 回编辑、`Ctrl+S` 后字节仍等于种子。
- 断言 7 正对照：编辑态点 H1 → `dirty:true`、`Ctrl+Z` → `dirty:false`、`Ctrl+K` → `.link-editor` 1。
- 断言 8：源码态 `.source-editor` 1、H1 `disabled:true`、`.table-bar` 0、`Ctrl+M` 不开框。
- 断言 9：`式.md` 预览 6 s 内 `.katex` 2、`.math-pending-note` 0（**回归锁，不是修复证据**）。
- 断言 10：`errors:[]`、`requestfailed:[]`。

### 4.2 T2（改前 2 PASS / 5 RED → 改后 7/7 PASS）

改前（`.tmp/e2e-r43-impl-t2.before.log`）：`编辑区拖入 .md` 的 `dropPrevented:false`、无 toast；编辑区外 `dragover:false`；弹层开着进预览后一次 `Esc` 得到 `viewMode:"edit"`（双动作）；公式弹层同一现象。

改后（`.tmp/e2e-r43-impl-t2.after.log`，`summary pass=7 red=0`）：

- 断言 1：`dragover:true`、`drop:true`、toast 含「不会直接打开」、正文不变、`dirty:false`、`href` 不变。
- 断言 2：`.doc-column`（编辑器外）`dragover:true`/`drop:true` + toast。
- 断言 3（**实现时改写了断言，见 §六.2**）：下层已 `preventDefault()` 的 drop 不弹提示（toast `null`）。
- 断言 4：`.link-editor` 开着 → `Ctrl+Shift+P` → 一次 `Esc`：`.link-editor` 0、`viewMode:"preview"`。
- 断言 5 正对照：编辑态 `Esc` 关弹层且仍是 `edit`。
- 断言 6：公式弹层同一路径：`.math-inline-input` 1 → 0、`viewMode:"preview"`。
- 断言 7：`errors:[]`、`requestfailed:[]`。

### 4.3 T3（9/9 PASS）

`.tmp/e2e-r43-impl-t3.after.log`：

- 6a（改动支，**改前也绿**）：`Ctrl+/` 进源码 → 把 `# 甲` 改成 `# 甲改` → `Ctrl+/` 回编辑：正文含「甲改」、`.outline-list` 文本「甲改」且 `.outline-empty` 0、`.stats-trigger` `11 字` → `12 字`、`dirty:true`（回编辑后 1 s 内读）。
- 6b（跳过支，100 KB / 38,598 字符）：`Ctrl+/` 进出一次，`sl-parse-done` **5 → 5**、正文文本不变、`dirty:false`。
- `## 6b-outMs {"outMs":1551}`：这是**脚本夹住两次按键的墙钟**，其中含 1,400 ms 的固定 `waitForTimeout`，**不是可引用的性能数字**（计划只要求记录，不设门槛）。
- 控制台 0 错误。

### 4.4 T4（3/3 PASS）

`.dialog` 文本含 `Ctrl+Shift+V` 与「粘贴为纯文本（浏览器原生键）」；0 控制台错误。

## 五、截图（`shots/round-43/`，4 张）

| 文件 | 内容 |
| :--- | :--- |
| `impl-t1-preview-readonly.png` | 预览态：工具条格式 / 插入按钮置灰、表格条不渲染、按 `Ctrl+M` 后底部 toast 说明「先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」，正文与表格不变 |
| `impl-t1-preview-math.png` | `式.md` 预览里行内 `$x^2$` 与块级 `$$a+b$$` 均已渲染 |
| `impl-t2-drop-notice.png` | 编辑态拖入 `.md` 后底部 toast「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」，正文不变 |
| `impl-t4-shortcuts.png` | 快捷键一览新增「`Ctrl+Shift+V` 粘贴为纯文本（浏览器原生键）」 |

## 六、与计划的偏差（4 条，均未扩大范围）

1. **改前基线是「真跑」的，但做法是 `git stash push -- src/`。** 计划要求「先跑一次确认改前是红的」。为了不把产品代码倒着改一遍，先用 stash 暂存 `src/`、跑同一份脚本、再 `stash pop`；T1/T2 各做一次。副作用：dev server 在两次运行之间会 HMR 回旧模块，脚本开头都先 `reset.mjs` 再 `goto`，没有出现旧模块假阴（改后读数里 H1 已是 `disabled:true`）。
2. **T2 断言 3 改写成「下层已 `preventDefault()`」的形式。** 计划原句是「在 `.ProseMirror` 上丢 `File('p.png','image/png')`：`dropPrevented === true` 且 toast 不含「不会直接打开」（说明是 ProseMirror 接住的）」。实测**合成的 `DataTransfer` 走不进 ProseMirror 的 `handleDrop`**（`src/App.tsx:854-861`）：改前基线上同一动作就是 `drop:{ok:true,drop:false}`、`imgs:0`，所以「ProseMirror 先接住」这句在合成事件下不成立。改成「在目标元素加一个先 `preventDefault()` 的监听来模拟 PM」，验证窗口守卫**真的**尊重 `event.defaultPrevented`（toast 为 `null`）。真实图片拖入改为 UNVERIFIED（§七）。
3. **`if (!editor || viewMode !== 'edit')` 是 2 处而不是 1 处。** 计划只算 `run()`；我把 `openLinkAtCursorRef` 写成同一个合并条件（`if (!editor || viewMode !== 'edit') return`），与 `openMathAtCursorRef` 的 `if (!editor) return` + `if (viewMode !== 'edit') return` 写法不同但语义一致。验收门槛写的是「1（run）」，实际 2，均为真守卫，不影响任何断言。
4. **`git grep -n "浏览器原生键"` 是 4 命中而不是计划的 3。** README 1 + `typora-gap.md` 1 + `ShortcutsDialog.tsx` 2（`:39` 的数组行 + `:54` 的注释）。计划 §五 验收写 3，是只算了数组行；多出的一处正是 R43-2 要求的注释同步，属预期。

## 七、UNVERIFIED（本轮测不了，写清原因与补测口径）

1. **真实拖入图片**：合成的 `DragEvent` + `DataTransfer` 不进 ProseMirror 的 `handleDrop`（改前基线 `drop.defaultPrevented=false`、`imgs:0`），所以「图片拖入不弹提示」只能靠断言 3 的模拟（下层已 `preventDefault`）加 `App.tsx:854-861` 的代码复核。补测：真机从资源管理器拖一张真 PNG 进正文，看是否插入、是否弹「不会直接打开」。
2. **宿主 WebView2 里的拖入与导航取消**：`host/Program.cs` 的 `OnNavigationStarting` 本轮未改（计划 §三.4 明确不碰），Web 层 `preventDefault` 在宿主内是否足以阻止整页导航未实测。补测：宿主冒烟里加一次合成 drop。
3. **`Ctrl+Shift+V` 在桌面宿主里的行为**：只在浏览器里验过对话框列出该键；宿主关了浏览器加速键（`AreBrowserAcceleratorKeysEnabled=false`）后 Chromium 原生纯文本粘贴是否仍可用，未测。
4. **真实中文输入法下弹层 `Esc`**：CDP 造不出 IME 组合输入；本轮只验了普通按键路径。
5. **首屏刻度外的 `MarginRail` 增量**：`MarginRail-*.js` gzip 2,327 B 是第 43 轮 finder 的静态读数，本轮未重复量；口径注记按该读数写。

## 八、plan-review 五条 P2 的处置（R43-8 ~ R43-12）

| 编号 | 处置 |
| :--- | :--- |
| R43-8（T1 可见变化没落进 README） | **已做**：`README.md:84` 补第四条边界；`git grep -n "表格条都不可用" -- README.md` 改前 0 → 改后 1 |
| R43-9（§九 表相加 42 与合计 41 不一致） | 计划文本问题，不改代码；本报告 §一 记真实墙钟用时 ≈10 min 30 s（含两次改前基线），不按 41 min 记账 |
| R43-10（§六 收尾验收第 3 条「改前 1」不成立） | 计划文本问题。实测基线：`git grep -n "372 条" -- AGENTS.md` = **2**（`:39`/`:72`）、`git grep -n "测试 29 个文件 377 条" -- AGENTS.md` 改前 = **0**（与复审一致）；改后 `377 条` = 2 |
| R43-11（T3 的 5 条单测改前亦绿） | **已按口径写**：CHANGELOG 与 `risk.test.ts` 注释都写明「改前亦绿，只锁语义；正向证据是 grep `if (beforeText === afterText) return` = 1」 |
| R43-12（砍单顺序与检查点矛盾） | 本轮未触发任何砍单（§一），无需处置 |

## 九、新踩坑

1. **合成 `DataTransfer` 进不了 ProseMirror 的 `handleDrop`**：`new DragEvent('drop', { dataTransfer: dt })` 里 `dt.items.add(File)` 能让窗口监听读到 `files.length`，但 ProseMirror 的 drop 管线看不到（改前基线 `drop:false`、`imgs:0`）。要测「谁先接住」只能自己加一个 target 阶段的 `preventDefault` 监听来模拟。别据此判「图片拖入坏了」。
2. **`.toast-text` 会活 6 s，断言连跑会读到上一条**：T2 断言 2 的 toast 未消失时断言 3 读到旧文案，会把「守卫让路」误判成红。等文案消失再测：`page.waitForFunction(() => !document.querySelector('.toast-text'))`（最多 9 s）。
3. **切换文件前要先确认侧栏在「文件」页签**：T3 里按过 `Ctrl+Shift+1`（切大纲）后，文件树元素仍在 DOM 但 `not visible`，`page.click('.file-tree ...')` 会 30 s 超时。切文件前 `Ctrl+Shift+3`。
4. **改前基线可以用 `git stash push -- src/` 得到**：不用手改产品代码；跑完 `git stash pop` 即恢复。注意期间 dev server 会 HMR 回旧模块，脚本开头必须先 `reset.mjs` + `goto`。

## 十、CHANGELOG 建议条目（已按此写入 `docs/CHANGELOG.md`）

- 预览（只读）真正只读：编辑命令一律无效（`run()` 守卫、`Ctrl+K`/`Ctrl+M` 提示、`Ctrl+1–6/0` 静默早退、6 个格式按钮与插入触发器 `disabled`、表格条只在编辑视图、两个光标入口守卫、`switchView` 收起菜单）；可见变化：预览与源码里这些入口一律不可用。
- 预览按 `katexLazy` 契约自行 `ensureKatex`（**防御性修复**，改前断言 9 亦绿；不得写成「修好了公式卡死」）。
- 拖入 `.md` 有提示不导航（window 级 drag 守卫，尊重 `defaultPrevented`）；公式 / 链接弹层 `Esc` 只取消弹层。
- `classify` 精确等价短路（+5 条单测，改前亦绿，正向证据是 grep）；`applySource` 跳过支不重算 `syncDocInfo`（6a 正对照改前也绿，锁「条件写反」）；删 `serializeBody` / `clearSession` / 悬空注释；首屏口径注记（+2,327 B）。
- 发布文档：README Windows 安装块（含 WebView2 运行时前提）、macOS 校验行、粘贴说明、四条键盘边界；差距计数 31/10 三处同值；测试计数两处同值（29 文件 / 377 条）；`ShortcutsDialog` 加 `Ctrl+Shift+V`（标「浏览器原生键」）并同步注释。
- 门禁数字：`tsc` exit 0、`npm test` 29 文件 377 条、`verify` 首屏 **292,046 B**（+280 B，余 27,954 B）、roundtrip rich 5/7 source 7/7、keyboard 52/52。

## 十一、没做的事（按计划 §七）

未做：预览查找第三态（保留命中计数）、行内 HTML / `<br>` 渲染、`escapeHtmlForParse` 严格围栏、1 MB parse 段拆埋点、脚注内行内渲染、宿主 `OnNavigationStarting` 取消导航、专注模式提示条 / Mermaid 复制与放大 / 图片缩放、`autoSaveGate.ts` 抽取与 `rename` 单测、发布专项（`installer.ps1` 固定资产、图标、`SHA256SUMS.txt`）、ui F2–F9 的 CSS/无障碍小改。`docs/iteration/STATE.md` 未动（由根代理轮末统一更）。
