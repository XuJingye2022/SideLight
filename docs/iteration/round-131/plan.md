# 第 131 轮计划（revision 1 · 单轮 · B-262：右侧只读面板快捷键穿透）

范围：只改「对比 / 在审」两个 body 挂载只读面板（`.rail-diff-overlay`）开着时的 App 级快捷键；不重算 diff、不改 overlay z / B-249 让位、不碰 B-229、不加依赖、不新增截图。
revision 1 按 `plan-review.md` 修 P1-1、P1-2、P2-1、P2-2、P2-3，不加任务、不扩范围。P1-1 附核：npm 11.19 只给链尾加参数（`.tmp/probe-args/`），`verify` 链尾是 measure（认 `--max`）；仍拆两条。

## 0 体积
现成 `dist/` 实测：门 **316,056 B** gzip（raw 1,025,373、余 **3,944**）；chunk gzip9 **7,880**；合并 **323,936**，超硬线 **3,936**（B-229 open）。净增 **≤300 B**（只改 `App.tsx` 约 6 行；A2/A3 只写 `.tmp/`、`docs/`），预计门 ≤316,360，验收线见 A3。合并口径写实测（P2-3）：≈324,240，超线 **4,2xx**。

## A1 吞键：App 窗口 keydown 把 rail 面板当模态（主修）
文件：`src/App.tsx`（`:4516-4533` / `:4629-4633`）、`src/lib/railModalGate.test.ts`（追加静态门）。
1. `onKeyDown` 内、`dialogOpen` 旁加 `const railModal = document.querySelector('.rail-diff-overlay') !== null`。两面板同用该类（`MarginRail.tsx:913`/`:972`），`appDialogOpen` 时已卸载（B-249），无误判。
2. 加 `const undoCombo = mod && !event.altKey && (key === 'z' || key === 'y')`。
3. 吞键分支改 `if (dialogOpen || railModal) { if (productCombo || customId !== null || (railModal && undoCombo)) event.preventDefault(); return }`。undo/redo **只对 rail 面板**吞（快速打开 / 全局搜索有输入框，禁原生撤销是回归）。
4. 不动 `dialogOpen` 十态谓词、`MarginRail.tsx`、`styles.css`（不上抛状态，避免「状态卡住 → 全局 Ctrl+S 失效」）。
5. 静态门追加 5 条：`App.tsx` 里 `.rail-diff-overlay` 恰 1、`undoCombo` 恰 1、吞键条件含 `dialogOpen` 与 `railModal`、`preventDefault` 条件含 `railModal && undoCombo`、`MarginRail.tsx` 两处 `!appDialogOpen` 未回滚。

验收：`git grep -n "rail-diff-overlay" -- src/App.tsx` → **1**（改前 exit 1；对照 `MarginRail.tsx` **3**：`:280` + 两个 className）；`git grep -n "key === 'z' || key === 'y'" -- src/App.tsx` → **1**（改前 0）；`node --experimental-strip-types src/lib/railModalGate.test.ts` 全绿，负向各删一处各 ≥1 红、拷回恢复；`npm run build` exit 0，`npm test` 67 文件 938 + 5。风险：面板在 DOM 时才生效；撤销若不走 keydown 默认动作只记录。

## A2 真机 before/after
文件：`.tmp/e2e-r131-modal-keys.mjs`（`--phase`）、`.tmp/r131-modal-keys-{before,after}.json`；截图零新增（复用 `shots/round-131/` 已有 2 张：`link-editor-behind-modal.png`、`shortcut-behind-modal.png`）。
身份门（P1-2，每相第一步）：`fetch('/src/App.tsx')` 数 `.rail-diff-overlay`/`undoCombo`：before **0/0**、after **1/1**；不符 `exit 3` 写 `.tmp/r131-modal-keys-gate.json`、判 UNVERIFIED 不判产品红。换码用 `git stash push -- src/App.tsx` / `pop`：改前记 SHA256，换完 touch `(Get-Item src/App.tsx).LastWriteTime = Get-Date` 再 reload，`pop` 后 SHA256 须等改前值；before 不跑 `npm test`（预期红）。
步骤：ego 57270，先 `node .tmp/reset.mjs 57270`，1440×900，假 FSA `a.md`/`b.md`，开 `a.md` 末尾打 `AAA`。两相同脚本覆盖 ①–④、⑥–⑧（原 ⑤ Ctrl+B 删，P2-2：恒绿无信息量）：① 点 `.rail-diff-open` → `.rail-diff-sheet` focus → `Ctrl+Z`；② `Ctrl+K`；③ `Ctrl+F`；④ `Ctrl+S`（假 FSA 计 write op）；⑥ `Esc` 关面板；⑦a 焦点在 `.rail-diff-open`（useDialogFocus 还原 opener）按 `Ctrl+Z`，⑦b 点 `.ProseMirror p` 停 250 ms、打 `ZZZ`、`Ctrl+Z`；⑧ `.rail-review-open` 重复 ①②③ 与 `Esc`。
window 冒泡探针记每次 Ctrl+Z 的 `defaultPrevented`：**dp:false 只打 ⑦a**（`.tmp/r131-rev-probe2.mjs`：焦点在按钮 dp:false、原生撤销照样撤正文）；⑦b dp 恒 true（PM undo keymap 自己 preventDefault，`.tmp/r131-rev-probe.mjs`），只记录不判。

验收（after 全绿；before 至少 ① ② ③ 红）：① 正文不变、`.rail-diff-row` 数不变、activeElement 在 sheet 内、dp **true**；② `.link-editor-input` **0**；③ `.find-bar` **0**；④ write op **0**；⑥ overlay 0、焦点回 `.rail-diff-open`；⑦a 撤掉 AAA、dp **false**；⑦b `ZZZ` 消失、activeElement 在 `.ProseMirror`、捕获 ≥1；⑧ 在审三键不穿透、Esc 仍关；0 pageerror。门：两相 JSON 齐读数、gate 两相 PASS；收尾 `git stash list` 0 条、`git status --porcelain` 只许 A3 路径。

## A3 门禁与收口
文件：`docs/iteration/round-131/impl.md`（≤4 KB）、`docs/iteration/BACKLOG.md`（新增 **B-262**，P1 表末；执行时 `open`，A3 记 `fixed` 待 tester 复核）。
- `npm test` → 67 文件 0 fail。体积门两条（P1-1）：先 `npm run build`，再 `node scripts/measure-first-screen.mjs --max 316400`；判后者 exit code、抄 gzip/raw/headroom。不写 `npm run verify -- --max …`；impl.md 抄这两条原文。
- `node -e` 复测 `MarginRail-*.js` gzip9（预期 7,880；变了写原因），算合并口径。
- 回归（ego 57270）：`.tmp/e2e-r100-diff.mjs` **43/43**、`.tmp/e2e-r101-review.mjs` **57/57**、`$env:SIDELIGHT_CDP='http://127.0.0.1:57270'; node scripts/keyboard-acceptance.mjs http://localhost:5175` **52/52**（P2-2；跑完 `git checkout -- shots/round-05/`，它覆盖 3 张历史截图）；红先判脚本口径，不改产品。
- `roundtrip` 不跑；`git status` 只允许 `src/App.tsx`、`src/lib/railModalGate.test.ts`、`docs/iteration/BACKLOG.md`、`docs/iteration/round-131/`、`shots/round-131/`、`.tmp/`。不 push、不动 `release/`、不动 `docs/CHANGELOG.md`（scribe 收口）。
- impl.md 必写：两条门命令原文与实测数字；合并口径超线约 4,2xx B（归 B-229）；P2-3 两条有意行为（面板开着时 `?` 不再开快捷键面板、`Ctrl+S` 静默吞且 0 写，与 `dialogOpen` 一致）；UNVERIFIED（真 WebView2 宿主、真实 IME）。
