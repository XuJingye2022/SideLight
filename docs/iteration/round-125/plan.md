# 第 125 轮计划（P2：对话上下文只带开头 2000 字）· **revision 1**

> 按 `plan-review.md` 修 2×P1 + 4×P2；不新增任务、不扩范围。HEAD `d32b72b`，工作树只多本轮目录。

## 0. 范围
只修第 123 轮 finder F2：对话 system 只取正文开头 2000 字（`.tmp/r123-finder-bug-def.json` 的 `chatRequest2{systemLength:2147,hasTail:false,hasHead:true}`；脚本 `.tmp/e2e-r123-finder-bug-def.mjs:152-206`）。根因 `src/lib/chat.ts:31-36` 从第 0 字切、`src/App.tsx:6034` 传整篇且无选区/光标。不碰批注/在审/快照、不改 B-229、不加依赖、不改编辑器与序列化（`roundtrip` 不跑）。

**缺陷 ID（P2-3 更正）**：实测 BACKLOG 最新是 **B-257**（`BACKLOG.md:135`），`B-258`/`B-259` **0 命中** → B-258 是空号可用（「已被占用顺延」与事实相反）。本轮不改 `BACKLOG.md`，由 scribe 批末补一行，现成行见 §4.5。

本轮只做第 1 轮（执行 + 验收）；第 2 轮按 `common.md` 先做 10 分钟 delta 回归，不另加任务。

## 1. 体积（先算，含 P2-2 记账）
- HEAD 实测（`docs/iteration/round-124/test.md:11,13,14`）：门 gzip **315,726**（余硬线 4,274）；常驻 `MarginRail-*.js` gzip9 **7,495**；B-229 合计 **323,221**（超硬线 3,221，`open`，只记不修）。任务书 312,423 / 7,577 是第 93 轮数字，已过期。
- 落点：`App.tsx` 在主包（计入门）；`chat.ts`、`MarginRail.tsx` 在常驻懒 chunk（不计入门、计入 B-229）。故 **App 不许 import `chat.ts`**。
- 预算：`App.tsx` 单个 prop 改 4 行块（含 `viewMode` 守卫）→ 门 **+40～90 B**；`chat.ts` ≈12 行 → chunk **+90～180 B**；`MarginRail.tsx` 5 行 + 空态句 → chunk **+50～110 B**。
- 阈值：门 ≤ **315,876**（+150）；chunk gzip9 ≤ **7,795**（+300，按 review 收紧，原 +400）。
- **本轮后 B-229 = 门 + chunk ≤ 323,671**（对 323,221 **+450**，超硬线 **3,671**）；report 里写复测值与增量，不只写「门口径不破」。
- 超限顺序：① 删空态句（本轮唯一新增文案，P2-1 可删项）② 缩 A2 脚本/截图；仍超 → 报 lead，**不删文首特例**（稳定性项，见 §2 偏差）。

## 2. A1 上下文跟选区/光标走（纯函数 + 接线 + 单测）
files：`src/lib/chat.ts`、`src/App.tsx:6034`、`src/components/MarginRail.tsx:56,137,219`、`src/lib/chat.test.ts`

1. `chat.ts` 加纯函数（复用 `context.ts` 的 `buildContext`，无新模块）：`chatContextFor(blocks: Block[], from: number, to: number, limit = CHAT_CONTEXT_LIMIT)`：有选区 → 选区优先；无选区 `from>1` → 光标块 + 前后各一段（`context.ts:182-231`）；`from<=1` → `chatContextOf(全文, limit)` 开头切片。`[before,selection,after]` 去空白 `\n\n` 连后过 `chatContextOf(…, limit)`，全空白 → `''`。
   **调 `buildContext` 必须显式传 `limit`**：它默认 `CONTEXT_LIMIT = 1500`（`context.ts:27,174`），漏传就静默掉 25%（P1-2 的根）。
2. `App.tsx:6034` 改（**含 P1-1 守卫**）：
   ```tsx
   getChatSource={() => {
     if (!editor) return null
     const live = viewMode === 'edit' // 预览/源码态编辑器仍常驻，选区停在上次编辑处（第 64 轮）
     const { from, to } = editor.state.selection
     return { blocks: readBlocks(editor), from: live ? from : 1, to: live ? to : 1 }
   }}
   ```
   非编辑视图给 `from:1,to:1` → 走开头切片；**不给 null**（null 在 MarginRail 是「还没有正文」）。`viewMode` 同 `:6057` 的 `canGenerate`。
3. `MarginRail.tsx`：`getChatContext: () => string` 改 `getChatSource: () => { blocks: Block[]; from: number; to: number } | null`（`import type { Block }`，不计体积）；`send()`（`:219`）`const source = getChatSource()` → `docText = source ? chatContextFor(source.blocks, source.from, source.to) : ''`，`buildChatMessages(docText, next)` 不变。
4. `chat.test.ts` 25→**31** 条（文件数不变，65 文件 917→923 条）。夹具：p0 2,600 字含「开头标记甲」、p1 400 字、p2 1,905 字含「结尾标记乙」，`from/to` 按 0 基块偏移（p0 0–2600、p1 2600–3000、p2 3000–4905）：
   ① 选区落 p2：含尾标记、不含头标记、**`length > 1,500` 且 ≤2,000**（1500 默认值 → 1,500，红）；
   ② 光标在 p1：**`length > 1,500`**（1996 对 1496）、前段尾与后段头都在（before/after 各非空）；
   ③ 光标在 p2：含尾标记、不含头标记、**`length > 1,500`**、前段尾非空（before 非空）；
   ④ 选区 3,000 字（from 1 到 3000，跨 p0+p1）：**`length === CHAT_CONTEXT_LIMIT`** 且末字符 `…`（1500 只给 1,500 → 红）；
   ⑤ 全空白 → `''`；⑥ 静态门：`between(appSource,'getChatSource=','getDiff=')` 取的整段同时含 `viewMode === 'edit'`、`state.selection`、`readBlocks(`，且该段内 `chatContextFor(` **0 处**（App 不 import 它）；`between(railSource,'const send = async','const generateNotes')` 内 `chatContextFor(` **恰 1 处**；HEAD 版 `indexOf('getChatSource')` = −1（0 命中）。**按 prop 段取、不按行**，prettier 换行不改结论（P2-4）。
5. **偏差（保留，review 已判）**：`from<=1`/非编辑视图走开头切片，不缩小「打开即问」这条默认路径（照光标块 ±1 会从 2,147 掉到约 250，属真回归）。判据证据：`App.tsx:1295` 载入后 `setTextSelection(0)`（= 1/1，与第 42 轮 E2E 坑「载入后选区重置到文首 1/1」同源）；**S1 红则改显式标志**（P2-1 退路）：`chatTouchedRef` 在 `loadIntoEditor` 末尾置 `false`、在 `onSelectionUpdate`（`App.tsx:1254`）置 `true`，`live = viewMode === 'edit' && chatTouchedRef.current`；预计门再 +60～80 B，仍 ≤+150。

验收：`npm test` 0 fail（现 65 文件 917 条）；负向对照把 `buildContext(blocks, from, to, limit)` 的 `limit` 去掉 → ①②③④ **至少 3 红 exit 1**，还原 31/31；`npm run build` 过；`git diff --stat -- src` 只 4 个源文件。

## 3. A2 真机证据 + 界面说明
files：新 `.tmp/e2e-r125-a1-chat-context.mjs`、`.tmp/r125-a1-chat-context.json`、`MarginRail.tsx:795`、`shots/round-125/chat-context.png`

1. 空态说明（仅 0 条对话，不加 CSS、不动布局）：`.rail-empty-sub` 改「让它找问题、给改法；要落正文点「生成批注」。上下文最多 2000 字：有选区用选区，没选区取光标所在段；刚打开时取开头。」——**本轮唯一新增文案，超体积先删它**（P2-1/P2-2）。
2. 脚本改自 `.tmp/e2e-r123-finder-bug-def.mjs:100-206`（假 FSA + 同一 2,638 字夹具 + 拦 `/chat/completions`；ego CDP 57270、1440×900、先 `node .tmp/reset.mjs 57270`）：
   - S0 两枚标记在正文里；
   - S1 不点正文直接发 → `hasHead:true`、`hasTail:false`、`systemLength ≥1,900`（≈2,147，同改前）。可选补证：脚本能拿到 PM 视图（`.ProseMirror` 的 `__reactFiber$*` 或 `window.__editor`）时记 `editor.state.selection`；拿不到就以 S1 的 `hasHead`+`systemLength` 作判据，S1 红才改 §2.5 的显式标志；
   - S2 点末段 → `Shift+Home` 选 17 字 → 切页签 → 发「就我刚才选中的这一段」→ `hasTail:true`、system **含这 17 字**、`hasHead:false`、`systemLength ≤2,150`、`lastUser` 逐字相等；
   - S3 光标落末段不选 → `hasTail:true`、`hasHead:false`、`≤2,150`；
   - S4 空白 `未命名.md` → 含「（当前文档还没有正文）」；
   - **S5 非编辑视图（P1-1）**：切预览 → `#rail-panel-chat` **= 0**（`App.tsx:6013` 的 `{!previewMode && (` 把含 rail 的 `doc-layout` 整块卸载，该视图用户发不出去，记录此事实）；切回编辑再点「源码」（`getByRole('button',{name:'源码'})`）→ rail 仍挂载但 0 尺寸（`App.tsx:6016` + `styles.css:326` 的 `hidden`/`visibility:hidden`/`scale(0)`）→ **程序化发送**（原生 `value` setter 写入 `.rail-chat-input` + 派 `input` 事件，等 100 ms 让按钮解除 disabled，再 `document.querySelector('.rail-chat-send').click()`）→ `hasHead:true`、`hasTail:false`、`systemLength ≥1,900`（守卫生效；去掉守卫会拿到 S2 的旧选区 → `hasTail:true`）。若 0 尺寸下 `click()` 不派发（先做一次 ≤30 s 探针），S5 记「静态门 ⑥ 绿 + 预览 `#rail-panel-chat` 0」并写明未验原因，**不为此改产品**；
   - 0 pageerror。
3. 截图 1 张：`node scripts/shot.mjs http://localhost:5175 --out shots/round-125/chat-context.png`（末段选中 + 对话页签 + 空态那句）。

验收：S0–S4 全绿、JSON 与上表一致；S5 按上面二选一交付（优先程序化发送）。回归 `.tmp/r96-tester-a1a2.mjs`（42/42）与 `.tmp/e2e-r96-a1-chat.mjs`；仅因「system 该含哪段」口径变化而红时改脚本断言、报告写「口径变化」，不回退产品。

## 4. 风险
1. **PM 选区存活**：点页签/输入框后 `editor.state.selection` 是否仍 `to>from`，S2 直接量。塌成 `from===to` 就加退路 `lastNonEmptySelectionRef`（只在 `to>from` 时记，折叠/换文档清空），`getChatSource` 先读 live 再读 ref，重跑 S2。
2. 旧脚本 `system` 断言只改 `.tmp`，产品不回退。
3. 体积超限顺序见 §1；**不删文首特例**（review 判定保留）。
4. `readBlocks` + `buildContext` 只在发送时跑一次（1 MB 一次全量遍历），不逐键、不在 render 里。
5. **BACKLOG 落点（P2-3）**：本轮不改 `BACKLOG.md`/`STATE.md`；scribe 在批末补这一行（B-258 空号已核，`B-257` 为最新）：
   `| B-258 | open | 界面 | 对话 system 取正文开头 2000 字，不跟选区/光标；预览/源码态常驻编辑器的旧选区也会被当上下文 | .tmp/r123-finder-bug-def.json；src/lib/chat.ts:31-36、src/App.tsx:6034 | 123/125 |`
   本轮 fixed 后由 scribe 改 `fixed` 并补证据。不 push、不碰 `release/`。
6. **视图事实（本轮口径，S5 的依据）**：预览态 rail 整块卸载（`#rail-panel-chat` 0）；源码态 rail 挂载但 `hidden` + `visibility:hidden` + `scale(0)` → 非编辑视图**用户不可发送**，`viewMode` 守卫是防御项，行为证据只能程序化取。
