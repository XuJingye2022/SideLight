# 第 130 轮计划（revision 1 · 单轮 · B-261 对话按文档身份清空 / 2 任务）

轮前 HEAD `79dba64`（startSha）、工作树净；dev 5175 不重启；CDP 9222–9226 不可用，真机 ego 57270。
revision 1 只按 `plan-review.md` 修 H1–H6（门拆两条、负向恰 2 红；文件数 path 口径；B-261 落 P2 段末记 `fixed`；补 B-229 复测；体积两线并卡），不加任务、不扩范围。

## 0 轮前核对
- 失败证据：`.tmp/r123-finder-code.json`「新文档后对话记录应清空」`ok:false`（2 条）；可原样复跑当 before。
- `.tmp/r130-planner-probe.mjs`：`#rail-panel-chat` 与 `.rail-chat-input` 各 1（hidden）→ 首屏即对话面板。

## 1 体积
- HEAD 实测（129 轮 dist）：gate **316,033 B**（余 3,967）、`MarginRail-Cej3jE1X.js` gzip9 **7,869**、合计 **323,902**（超硬线 3,902）。
- 口径：任务书「312,423 / 余 7,577」是第 93 轮旧值；`measure-first-screen.mjs:8-9` 说明 gate 不含常驻 chunk，真实首载已超硬线 3,902（B-229，仍 `open`）。本轮用 **316,033** 口径。
- 净增预估：主包 **+≤60 B**、chunk **+≤40 B**（state+setState+prop）；预算 gate **≤316,183**。
- 测试基线 66 文件 933 条 → +1 文件 **5 条** = **67 / 938**。

## 2 机制
- 现状 `MarginRail.tsx:191-194` 只依赖 `docName`（Props `:59-60`、解构 `:143`）= basename；新建恒 `未命名.md`（`App.tsx:3262`）、异目录同名 basename 相同 → 都不 `resetChat()`。全文件 `}, [docName])` 恰 2 处：`:194`（对话）、`:360`（对比/在审，保留）。
- 改法：App 加文档实例计数，`loadIntoEditor` 每次换篇 +1 传下去，effect 依赖换成它；不用 `activeDocIdRef`（保存也 +1，`:3594`）或 `applyHostPayload`（不 bump）；保存/自动保存/改名/另存为都不变。
- 不动：`docName` 仍传（在审行名 `:450`）；`:353-360` 面板 effect 仍按 `docName`；`ai.ts`/`chat.ts`/`dialogOpen` 不变。

## 3 A1（`src/App.tsx`、`src/components/MarginRail.tsx`、新 `src/lib/railChatReset.test.ts`、`package.json`）
1. `App.tsx:496` 后加 `docInstance` 的 `useState(0)` + 注释；`:2649` 后加 `setDocInstance((value) => value + 1)`（deps 不加）；`:6097` 后加 `docKey={docInstance}`。
2. `MarginRail.tsx:60` 后加 Props `docKey: number` + 注释；`:143` 解构加 `docKey,`；`:194` 的 `[docName]`→`[docKey]`。
3. 新 **5 条**静态门（`source()` 先剥块注释、再按行剥 `//`；断言全按代码文本）：T1–T4 为 `docKey: number` / `docKey,` / `}, [docKey])` / `}, [docName])` 各恰 1（T4 钉住 `:360` 没被顺手改）；T5 为 `setDocInstance((value) => value + 1)` 恰 1 且在首个 `activeDocIdRef.current += 1` 后 300 字内、`docKey={docInstance}` 恰 1。挂 test 链尾。
4. 超体积降型：**删注释不算**（0 B；旧门才靠注释失锚）。gate >316,183 才用「合并 prop」：`docName`/`docKey` → `doc: { name; key }`（省一处解构），门锚同步改；仍超停手交 lead（不抬 max/硬线）。
- 验收：`npm run build` 过；新测试 **5/5**；负向（`:194` 改回 `[docName]`）**恰 2 红**（T3=0、T4=2），T1/T2/T5 仍绿；还原 5/5；`git status --porcelain -- src package.json` 恰 **4 条**（3 M+1 ??；diff 只 3 文件），A2 写文档前量。

## 4 A2（新 `.tmp/e2e-r130-chat-reset.mjs`、`impl.md`、`BACKLOG.md`）
1. 模块门：`fetch('/src/components/MarginRail.tsx')`，after 含 `docKey`、before 不含，不符 `exit 3`（touch 重跑；仍不符记 UNVERIFIED）→ `.tmp/r130-module-gate.json`。
2. `--phase after`（ego 57270、1440×900、清 storage 后 reload）：
   - S1：点 `#rail-tab-chat` → 填 `.rail-chat-input` → 发送 → 等 `.rail-chat-turn.is-assistant` → 断 **2 条**；`Control+Alt+n` → 1,200 ms → turn **0**、`.rail-chat-empty` 1、`__slState.name==='未命名.md'`、无 `.dialog`。
   - S2 异目录同名：夹具 `{'a/note.md':'甲篇正文。','b/note.md':'乙篇正文。'}`（`r130-ws`）→ 点 `[data-path="r130-ws/a"]` → `[data-path="r130-ws/a/note.md"]` → 断含「甲」→ 发一句（2 条）→ 展开 b、点 `[data-path="r130-ws/b/note.md"]` → 1,200 ms → turn **0**、empty 1、含「乙」、两处 `__slState.name` 均 `note.md`。
   - S3 保存不清空：2 条对话时正文打 1 字 → `Ctrl+S` → 轮询 `__slState.dirty===false`（≤4 s）→ turn 仍 **2**、`__vfs.ops` 含 `write:r130-ws/a/note.md`。
   - 0 pageerror/console error；JSON → `.tmp/r130-e2e-after.json`。
3. `--phase before`：`git stash push -- src/App.tsx src/components/MarginRail.tsx` → 期望 S1/S2 **FAIL**、S3 **PASS** → `.tmp/r130-e2e-before.json` → `git stash pop` 核对复原。
4. 门禁：`npm test` 0 fail（67/938）；`npm run verify -- --max 316300` exit 0 **且** gate **≤316,183**（超了按 §3.4 降型）；记三数；回归 `.tmp/r116-tester-speaker.mjs` **8/8**；不跑 `roundtrip`。
5. 证据：截图 1 张 `shots/round-130/chat-reset.png`；`impl.md` ≤4 KB；`BACKLOG.md` 两处：B-261 → **P2 表末**（`:137` 后）记 `fixed`，证据 = r123 JSON + r130 三份 JSON + `MarginRail.tsx:191-194`、轮次 `123/130`（B-251…B-260 在 `## P2` 段末）；B-229 证据格追加「第 130 轮复测：门 X + chunk Y = Z（超线 N）」。`impl.md` 写「按 316,033 门口径；真实首载=门+chunk 仍超 320,000，归 B-229，口径 lead 定」。
- 验收：after 三场景全 PASS；before S1/S2 FAIL 且 S3 PASS；三数齐且 gate ≤316,183；8/8；0 pageerror。

## 5 风险与残余
- 行为差（记录、不判 FAIL）：干净时再点当前文件会重载（`requestLoad` 只在脏时短路同名，`:2778-2786`）→ 会清空对话；改名保留对话（同一篇）。
- `:353-360` 面板 effect 仍按 `docName`：异目录同名切换 + 面板正开着时上一份行不即时清（打开时按路径重读）。不动 `railModalGate.test.ts:92-98`。
- 残余：宿主 `applyHostPayload` 不 bump（真宿主未验）；UNVERIFIED：真 WebView2、真 FSA、真 IME；`reset.mjs 57270` 仍用过期 `.editor`。
