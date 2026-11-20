# 第 131 轮验收（tester · 独立 · 未读 impl.md 前完成行为复验）

判定：**PASS-WITH-UNVERIFIED**（产品/门禁全绿；真 WebView2 宿主、真实中文 IME 未验，同 impl 口径）。startSha `39f15cf`，commit 后 head 必须不同。

## 门禁（独立复跑，未改实现）
- `npm test` → **67 文件 943 条 0 fail**（逐文件 `ℹ tests` 求和 = 943，`ℹ fail` 全 0，`.tmp/r131-tester-npm-test.log`）；基线 938 + 本轮静态门 5。
- `npm run build` → **exit 0**（`已镜像 99 个文件 → host\bin\www`）。
- `node scripts/measure-first-screen.mjs --max 316400` → **exit 0 PASS**：gzip **316,096 B**、raw **1,025,471**、headroom **304**（超内部预算 6,096 只 WARN）。
- `MarginRail-C69PMDGs.js` raw 22,282 / gzip9 **7,880**（与 B-262 记录一致）→ 合并口径 **323,976 B**，超硬线 **3,976 B**（归 B-229 open）。
- `roundtrip` 不跑（未动编辑器/序列化）。

## A1 静态门（含改前对照）
- `git grep -n "rail-diff-overlay" -- src/App.tsx` → **1**（`:4526`）；改前 `git grep … HEAD` **exit 1**；对照 `MarginRail.tsx` **3 行**：`:280`、`:913`、`:972`。
- `git grep -n "key === 'z' || key === 'y'" -- src/App.tsx` → **1**（`:4527`）；改前 HEAD **exit 1**。
- `node --experimental-strip-types src/lib/railModalGate.test.ts` → **11/11 0 fail**（6 旧 + 5 新；新 5 条即本轮追加）。
- 负向（备份 SHA256 `FE1DE798…4B916B4`，改后拷回等值）：删 ` || (railModal && undoCombo)` → **10 pass / 1 fail exit 1**；删 `const railModal = …querySelector` 行 → **10 pass / 1 fail exit 1**；两次恢复后均 11/11。
- 代码事实：`mod`/`key` 定义在 `:4511-4512`，先于新增两行；`undoCombo` 带 `!event.altKey`；Esc 分支（`:4540`）在吞键分支（`:4635`）之前。

## A2 真机 before/after（ego CDP 57270、1440×900、假 FSA、`autoSave:false`）
- 身份门每相第一步 fetch `/src/App.tsx`：before **0/0**、after **1/1**，两相 **PASS**（`.tmp/r131-modal-keys-gate.json`；served bytes 785,265→786,525）。
- 换码只走 `git stash push -- src/App.tsx` / `pop`：push 先记 SHA256，pop 后 SHA256 **FE1DE798…** 等值，`git stash list` **0 条**；touch + reload；before 相未跑 npm test。运行器 `.tmp/e2e-r131-modal-keys.mjs`。
- before **9/17**（exit 0，身份门过才继续）：① 正文被撤（`textChanged:true`）+ dp **false**、② `.link-editor-input` **2**、③ `.find-bar` **1**、⑥ 面板不关且焦点 BODY、⑧ 三键穿透 + Esc 不关；④ 2 写且脏被清（穿透反证）。
- after **17/17、0 pageerror / 0 console error**（`.tmp/r131-modal-keys-after.json`）：① 正文不变、`.rail-diff-row` 4→4、焦点在 `.rail-diff-sheet`、dp **true**；② 0；③ 0；④ write op **0** 且仍脏；⑥ overlay 0、焦点回 `.rail-diff-open`；⑦a dp **false**、AAA 被原生撤销（true→false）；⑦b 点 `.ProseMirror p` 打 ZZZ 后消失、捕获 **1**（dp 只记录）；⑧ 在审三键不穿透、Esc 关、焦点回 `.rail-review-open`。
- 截图零新增：脚本内 `screenshot` **0** 处；`shots/round-131/` 仅既有 2 张（mtime 19:19，早于本轮复验）。

## 回归（全部 ego 57270）
`.tmp/e2e-r100-diff.mjs` **43/43**、`.tmp/e2e-r101-review.mjs` **57/57**、`keyboard-acceptance.mjs` **52/52**；跑后 `git checkout -- shots/round-05/ shots/round-100/ shots/round-101/`（三脚本都覆盖已跟踪截图），`git status -- shots/` 恢复为空。

## A3 交付物
- `docs/iteration/round-131/impl.md` **4,088 B**：含两条门命令原文、实测 gzip/raw/headroom、chunk 7,880 与合并 323,976（超硬线 3,976，归 B-229）、P2-3 两条有意行为（面板开着 `?` 不开快捷键面板；Ctrl+S 静默吞 0 写）、UNVERIFIED（真 WebView2 宿主、真实中文 IME）。
- `BACKLOG.md`：**B-262** 在 P1 表末、状态 `fixed`（待本报告复核）；另按 plan-review 新增 **B-263**、**B-264** 两条 `open`，与本轮修法不重叠。
- 未动 `docs/CHANGELOG.md`（plan §A3：scribe 收口）；未动 `release/`、未 push。

## 偏差（不判 FAIL）
1. 合并口径实测 **3,976**（计划估「约 4,2xx」）：门实测 316,096 比计划 316,360 低 264 B，impl 按实测写并注明——取实测值正确。
2. A1 任务书写「静态门 5/5」：指本轮新增 5 条；整文件 6 旧 + 5 新 = **11/11**（B-262 记录亦为 6→11）。
3. A2 的 before ⑦a `aaaBefore:false`：因 ① 在 before 相已把 AAA 撤掉；before 只作红相证据，after 相 `aaaBefore:true` 成立。

## 有意行为（P2-3，复核成立）
面板开着时 `?` 不再打开快捷键面板、Ctrl+S 静默吞且 0 写（与 `dialogOpen` 口径一致）。

## UNVERIFIED
真 WebView2 宿主（本机 `INIT-FAIL`，只测浏览器）、真实中文 IME。

## 结论
门禁、静态门、真机 before/after、三项回归全部达标；无回归。commit 后 head 与 `39f15cf` 不同。
