# 第 131 轮 · 缺陷复查（finder-bug，只读不改码）

前提：dev 5175 HTTP 200；轮前 `39f15cf`；ego CDP 57270（1440×900）；假 FSA 工作区。**2 条新 P1 + 1 条新 P2**，0 pageerror。不与已修清单、B-229/B-253、`round-131/findings-{ui,code}.md`、队列条目重复。

## F1（P1，键盘/模态）右侧只读面板（对比 / 在审）开着时 App 级快捷键穿透：Ctrl+Z 改正文而面板不重算，Ctrl+K 把焦点送进遮罩后的输入框，Ctrl+F 把查找条开在遮罩后面

复现 A：`a.md` 正文末尾打 `AAA` → 点「对比」（4 行 diff）→ 焦点在 `.rail-diff-sheet` 上按 `Ctrl+Z`：`.ProseMirror` 文本里 `AAA` 消失（`A_before`→`A_after`），面板仍停在点击那刻的 4 行、不刷新（`openDiff` 只在点击时算），关面板前看不到正文已改。
复现 B：同状态按 `Ctrl+K` → `document.activeElement=INPUT.link-editor-input`，该框中心 `elementFromPoint=DIV.rail-diff-overlay`（在遮罩后、被盖住）；再 `Ctrl+F` → `.find-bar`（top 84）中心命中的也是遮罩；`Esc` 关掉那个看不见的编辑框后焦点落 `BODY`、面板仍开；再 `Esc` 才看见查找条一直开着。
证据：`src/App.tsx:4516-4533`（`dialogOpen` 不含 rail 面板）、`:4629-4633`（只有 `dialogOpen` 时吞产品键）；`src/components/MarginRail.tsx:279,309-318,321-324,343,370-379`（面板是组件内 state，document 级 keydown 只处理 Escape）。探针 `.tmp/e2e-r131-finder4.mjs`→`.tmp/r131-finder4.json`（`ctrlK.active`/`activeCenterHit`、`esc1.active=BODY`、`esc2.findBar`）；`.tmp/r131-recheck-undo.mjs`（`A_sheetFocus=DIV.rail-diff-sheet`、`A_after` 无 `AAA`、`A_rowsAfter=4`）。截图 `shots/round-131/link-editor-behind-modal.png`。修法：面板状态并入 App 吞键分支（同 B-249 的 `appDialogOpen` 通路），或两处 document keydown 对产品键 `preventDefault` 且不执行。

## F2（P1，对话区/焦点）「对话」输入框里按 Ctrl+K / Ctrl+F 被全局快捷键抢焦点，Esc 后焦点落正文而非回输入框

复现：切「对话」→ `.rail-chat-input` 打「测试指令」→ `Ctrl+K`：`.link-editor-input`（top 217）出现并获焦，输入框丢光标；`Ctrl+F`：`.find-input` 获焦；`Esc` 后 `activeElement=DIV.tiptap`（正文），不回输入框。草稿在，但每次打断都要读者自己找回；在链接编辑框回车会改正文。
证据：`src/App.tsx:4636-4639` 的 `typing` 只服务 `?`，`:4646-4671` 的产品键不看 target；`.tmp/e2e-r131-finder5.mjs`→`.tmp/r131-finder5.json`（`chatCtrlK.active=INPUT.link-editor-input`、`chatCtrlF.active=INPUT.find-input`、`chatAfterEsc.active=DIV.tiptap`）。修法：产品键先判 `typing` 放行（保存类除外），或 `Ctrl+K`/`Ctrl+F` 只在编辑器/非输入区响应。与 `findings-ui.md` F1（鼠标点发送钮掉焦）不同触发路径，两条都需修。

## F3（P2，文案）「在审文件」截断提示的篇数随当前篇行被删而漂移

52 篇都有未结项批注 → 首开显示「只显示前 **50** 篇。」（上限 50）；把当前篇 `a.md` 结项后重开 → 49 行，文案变「只显示前 **49** 篇。」——上限没变，是 `liveClosed` 分支删了当前行。
证据：`src/components/MarginRail.tsx:1010-1011` 用 `reviewRows.rows.length` 拼文案；`.tmp/r131-finder.json` 的 `reviewGeom.truncatedNote`（rows 50）与 `statusLive.afterClose`（rows 49、文案 49）。修法：文案写固定上限（`DEFAULT_MAX_ROWS`）或改「已隐藏 N 篇」。

## 复查通过（不计数）

50 行 + 截断提示 + 8 份快照在 1440×900 与 1024×700 同屏（snap 底距 sheet 底 13 px）；`ul` 内部滚动 1500/368；脏文本从在审行切篇弹确认框（焦点在框内、中心命中 `DIV.dialog`、Tab 三钮环、`Esc` 后脏内容在、标题不变）；页签 `role=tablist` + roving + `aria-controls` 对齐、未选面板 `hidden`；连存 9 次快照留 8 份。UNVERIFIED：真 IME、真宿主、原生打印。
