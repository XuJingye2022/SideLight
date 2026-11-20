# 第 131 轮执行记录（B-262 · 右侧只读面板快捷键穿透）

A1 ✅ / A2 ✅ / A3 ✅。startSha `39f15cf`；不 push、不动 `release/` 与 CHANGELOG。

## A1 吞键
- `src/App.tsx:4526-4527` 加 `railModal`（`querySelector('.rail-diff-overlay')`）与 `undoCombo`；`:4635-4636` 吞键分支改 `if (dialogOpen || railModal)`，撤销只对面板 `(railModal && undoCombo)`；十态谓词未动，Esc 仍在吞键前（`:4540`）；未碰 MarginRail/styles。
- `src/lib/railModalGate.test.ts:107-147` 追加 5 条静态门。单跑 **11/11**（6 旧 + 5 新）。负向：删 `(railModal && undoCombo)` → 1 红 exit 1；删 querySelector 行 → 1 红 exit 1；均拷回恢复 11/11。
- 偏差：计划第 5 条写「MarginRail 两处 `!appDialogOpen`」，该事实已由既有第 4 条门（`:72-82`）覆盖、该文件未改，改钉「Escape 在吞键之前」；条数仍 5。

## A2 真机 before/after（ego CDP 57270、1440×900、假 FSA、清 storage）
`.tmp/e2e-r131-modal-keys.mjs --phase before|after`；身份门每相第一步 fetch `/src/App.tsx` 数 `.rail-diff-overlay`/`const undoCombo`：before **0/0**、after **1/1**（`.tmp/r131-modal-keys-gate.json`，served bytes 785,265→786,525）。
- after **17/17 PASS**、0 pageerror（`.tmp/r131-modal-keys-after.json`）：④ 面板内 Ctrl+S **0 写且仍脏**；① 正文与 `.rail-diff-row` 数不变、焦点在 sheet、dp **true**；② link-editor 0；③ find-bar 0；⑥ overlay 0 且焦点回 `.rail-diff-open`；⑦a dp **false** 且 AAA 被原生撤销；⑦b 点 `.ProseMirror p` 打 ZZZ 后消失、捕获 1（dp 只记录）；⑧ 在审三键不穿透、Esc 关、焦点回 `.rail-review-open`。
- before **9/17**（8 红）：① 正文被撤 + dp false、② link-editor 2、③ find-bar 1、⑥ 面板不关且焦点 BODY、⑧ 三键穿透且 Esc 不关；④ 2 写 + 脏被清（穿透反证）；⑦b 两相都绿（PM 自身 undo）。
- 换码只走 `git stash push -- src/App.tsx` / `pop`：改前 SHA256 `FE1DE798…4B916B4`，pop 后等值、stash list **0**；touch 后 reload，before 不跑 npm test。截图零新增，复用 `shots/round-131/link-editor-behind-modal.png`、`shortcut-behind-modal.png`。
- 偏差（plan-review P1-1/P2-2）：④ 挪进面板内、先于 ①，夹具 `settings.v1={"autoSave":false}`，断言 0 写**且**仍脏；⑦a 撤销效果只记观察值（实测 true），判据取 dp false。

## A3 门禁与收口
- 原文两条：`npm run build` → exit 0；`node scripts/measure-first-screen.mjs --max 316400` → **exit 0**、gzip **316,096 B**、raw **1,025,471**、headroom **304**（净 +40）。
- `MarginRail-C69PMDGs.js` gzip9 **7,880**（不变）→ 合并 **323,976**，超硬线 **3,976 B**（B-229 open）。计划估 4,2xx 按门 316,360 算；实测门低 264 B，写实测。
- `npm test` → **67 文件 943 条（938+5）0 fail**（`.tmp/r131-npm-test.log`）。
- 回归：`.tmp/e2e-r100-diff.mjs` **43/43**、`.tmp/e2e-r101-review.mjs` **57/57**、`keyboard-acceptance` **52/52**。三脚本都覆盖已跟踪截图（round-05/100/101），已一并 `git checkout` 还原。
- BACKLOG：B-262 **fixed**（P1 表末，待 tester 复核）；按 plan-review P2-1 另加 **B-263**（对话输入框 Ctrl+K/F 抢焦点）、**B-264**（点「发送」焦点掉 BODY）两条 `open`。
- 有意行为（P2-3）：面板开着时 `?` 不再开快捷键面板；Ctrl+S 静默吞、0 写（与 dialogOpen 一致）。
- CHANGELOG 建议：「右侧对比 / 在审面板开着时，Ctrl+Z / Ctrl+K / Ctrl+F / Ctrl+S 不再穿透到正文或遮罩后的输入框。（B-262）」
- UNVERIFIED：真 WebView2 宿主、真实中文 IME。

## 新踩坑
1. App 的 window keydown 随状态重注册；冒泡探针要每次「先摘再挂」，否则读到旧 `dp:false`。
2. 共用脚本的 ⑥ Esc 在 before 相会被链接编辑框 / 查找条先吃掉；清理最多再按 3 次 Esc，不写进 ⑥ 断言。
3. r100 / r101 / keyboard-acceptance 都覆盖已跟踪截图，不只 round-05；收尾须全部还原。
