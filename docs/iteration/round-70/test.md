# 第 70 轮独立验收（tester）

不读 impl.md；按 `plan.md` A1/A2、`git diff` 与 BACKLOG 复验。轮前 startSha `605b5ff`。

## 门禁
- `npm run verify` **PASS**：首屏 gzip **302,014 B**（内部 310,000 / 硬线 320,000，余 17,986；主 chunk `index-BBkPIT6N.js` 935,103 B raw / 296,556 gzip，css 8,500，runtime 450）。日志 `.tmp/r70-tester-verify.log`。
- `npm test` **40 文件 524 条全过**（轮前 520，新增 4 条；0 fail）。日志 `.tmp/r70-tester-test.log`。
- `roundtrip` 未跑：未动编辑器与 Markdown 序列化。

## A1 · B-152 纯函数 + removeFile + 单测
- `fallbackTargets`（`src/lib/workspace.ts:367`）：先 `slice(index+1)` 向末尾，再 `slice(0,index).reverse()` 向开头；`seen` 预置被删 path 做去重；最多 `max=3`；找不到该项返回 `[]`。
- `removeFile`（`src/App.tsx:2866-2912`）：候选取删除前 flatten 快照（`:2867`）；`freshByPath.get(path) ?? candidate`（`:2882`）；`readNode` 抛错记 `firstUnreadable` 并 continue，全失败才空白 `未命名.md`（`:2903`）且 notice 附失败名；`setNotice` 在 `loadIntoEditor` 之后，`persist` 与撤销 action 保留。
- `git grep -n fallbackTargets -- src/App.tsx` → `101`（import）、`2867`（调用），验收「≥1」成立。
- 单测 4 条（`src/lib/workspace.test.ts:104,112,120,127`）逐条 ✔：删中 → `[c,a]`；删末 → `[b,a]`；无其它 / 路径不在树 → `[]`；去重 + 上限 3 + 不回绕（`[d,e,b]`、`[c,d,e]`）。
- `.tmp/e2e-r70-impl-a1-after.mjs` 与 `.tmp/e2e-r70-bug-c.mjs` 逐行比对：各 125 行，只差第 1 行注释与第 121 行输出路径（diffCount=2），符合「只改第 121 行」。
- 独立复跑（先 `node .tmp/reset.mjs 9222`）：`.tmp/r70-impl-a1-after.json` 24 采样第 2 条起 `toast=已移到回收站：b.md`、`undo:true`（距删除点击 ≤120 ms，门槛 ≤1,500）、title 与 active 均 `a.md`、tree `[a.md,big.md]`、`errors:[]`；6 MiB 的 `big.md` 读不出被跳过，0 超大提示。`.tmp/r70-bug-c.json` mtime 仍 14:37:00，未被覆盖。

## A2 · 四场景 E2E + 撤销（独立跑）
`node .tmp/reset.mjs 9222` → `node .tmp/e2e-r70-impl-a1-delete.mjs`（未改产品代码）：`passAll:true`、`errors:0`。明细 `.tmp/r70-impl-a2.json`，截图 `shots/round-70/delete-fallback.png`。

① `[a,b,big 6 MiB]` 删脏 b：**64 ms** 出「已移到回收站：b.md」+「撤销」，切 `a.md`（title/active/`.is-active` 一致），0 pageerror、0 超大提示；trash 有 `…-b.md.current.md`；撤销后 `b.md` 回树、「已恢复 b.md」、当前仍 `a.md`、`__vfs.files.get('b.md')` 含「脏Q」。
② `[a,b]` 删 `a.md`：47 ms、切 `b.md`、有撤销；打字后 `Ctrl+S` 写 `b.md`（opsDuringSave 1，内容 `# 乙\n\n第二篇写B\n`），未新建 `未命名.md`。
③ `[a,big1,big2]` 删 `a.md`：87 ms、空白 `未命名.md`（title 一致、`.is-active` 无）、有撤销、toast 含「big1.md 读不出，已打开空白文档」、0 pageerror。
④ `[a,b,c]` 删 `c.md`：56 ms、切 `b.md`（title/active/`.is-active` 一致）、有撤销、0 pageerror（H1 回归格成立）。

**偏差 1 条（不判红）**：③ 的 `addOps` 实测 **2** 而非 0——`Ctrl+S` 新建了 `未命名.md`（提示「已保存到 未命名.md」）。对照组坐实是预存在设计：同一 dev server 上全新空白 `未命名.md`（未做任何删除）按 `Ctrl+S` 同样 `addOps:2`、同样建文件（`.tmp/r70-tester-blank-save.json`）；`src/App.tsx:3365-3371` 注释写明「落点未知的新文档不拦——空文档否则连文件都建不出来」（第 51 轮口径），plan 也写「若仍新建文件记实际 toast，不判红」。B-152 的 diff 未触碰该分支。

## 回归
- `.tmp/e2e-r58-delete.mjs`（第 58 轮删除/撤销）：脏文件确认框标题「删除「b.md」？」与未保存提示原文一致；取消后 `b.md` 仍脏、内容不变；干净保存 → 删除 → 切 `a.md` → toast「已移到回收站：b.md」+「撤销」，0 pageerror。
- 该脚本假句柄的 `move()` 恒抛 `NotSupportedError`，撤销落在 `restoreFromTrash`（`src/lib/trash.ts:389-392`，move 失败无 copy 回退）→「恢复失败：no move」、trash 副本保留。本轮未改 `trash.ts`；A2 ① 用无 `move()` 的句柄撤销成功，故不判回归。此「delete 侧有 move 回退、restore 侧没有」为既有实现差异，未入库，留给后续判断。

## 判定
**PASS-WITH-UNVERIFIED**：A1/A2 验收项成立，唯一偏差是 ③ `addOps`（已用基线对照解释）。
UNVERIFIED：真实 FSA 磁盘句柄（假 FSA 无权限模型）、真实磁盘上 6 MiB 文件的读失败路径、WebView2 宿主窗口内的删除 + 撤销。
