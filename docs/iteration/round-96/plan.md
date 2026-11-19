# 第 96 轮计划（planner · **rev.2**）· 对话区（队列第 3 条 / 轮前 `a79c9c7`）

> 只做这一条（P1），按 **B-223**（lead/finder 入池）。A1/A2 同一 executor 顺序落地、一起提交（A1 的钮依赖 A2 的 `onGenerateNotes`）。rev.2 把 plan-review 的 H1–H6 全部修进下述各项（逐条标 Hn），并修 rev.1「空输入时发送不 disabled」的矛盾；范围与任务数同 rev.1。

## 首屏体积（硬线 320,000；当前 313,086，余 6,914）
`chat.ts`/`chat.test.ts`/`MarginRail.tsx` 在 `lazy()` rail chunk（`App.tsx:20`），不计首屏；计主 chunk ≈+240（App 四 prop、ai.ts）、CSS ≈+250 → **+400～600 B**。判据（H5）：`node scripts/measure-first-screen.mjs --max 314500` 必须 exit 0（`verify` 默认 `--max 320000`，自证不了），报告抄 `raw=`/`gzip=`。超了按序删：气泡底色 → `gap`/圆角 → 空态第二行；`role="log"`/`isComposing`/生成批注钮不动。

## A1 对话页签：消息 / 输入 / 发送 / 新对话 / 流式
`src/components/MarginRail.tsx`（`:369-388` 换真面板）、`src/lib/chat.ts`（新）、`src/lib/chat.test.ts`（新，挂 test 链尾）、`src/styles.css`（`:1329-1357`）。
1. `chat.ts`（纯函数）：`ChatTurn`；`CHAT_SYSTEM_PROMPT`（中文、短、不编造，落正文引导点「生成批注」）；`chatContextOf(text, limit=2000)`（trim + 截断，空→`''`）；`buildChatMessages(docText, turns)` = `[system, …turns.slice(-12)]`，system 带 `当前文档节选：` 或 `（当前文档还没有正文）`，切片首条是 assistant 就丢；`pushTurn`（不合并同角色）；`appendDelta`（只补末条 assistant，返回新数组）。
2. `MarginRail`：Props 加 `settings`、`getChatContext: () => string`、`onGenerateNotes: (instruction: string) => void`、`canGenerate: boolean`、`docName: string`；state `turns`/`chatDraft`/`busy`/`chatError`（H4：**不复用** `:83` 的追问 `draft`）；refs `ctrlRef`/`logRef`/`inputRef`。
   - `resetChat()`：`ctrlRef.current?.abort()`、清三态；`useEffect(() => { resetChat() }, [docName])`（H2：换文档清空，首挂载空跑无害）；卸载 cleanup abort。
   - `send()`：空白/busy 早退 → `const next = pushTurn(turns,'user',text)` → `setTurns([...next,{role:'assistant',text:''}])`、清 draft/error、busy → `streamChat({settings, messages: buildChatMessages(getChatContext(), next), signal, onDelta: d => setTurns(p => appendDelta(p,d))})`；非 AbortError → `errorCopy(error).text`；finally `busy=false` + 焦点回输入框；`useEffect([turns])` 滚底。
3. 渲染：`.rail-chat-head` + `.rail-chat-reset`「新对话」`disabled={busy || (turns.length===0 && !chatDraft)}`；`.rail-chat-log[role="log"][aria-live="polite"]`；`.rail-chat-turn.is-user|.is-assistant`（空 assistant + busy 显 `…`）；0 条 → `.rail-chat-empty`（「和侧灯说一句」/「让它找问题、给改法；要落正文点『生成批注』」）；`simulated` → `.rail-chat-mock`；`chatError` → `.rail-chat-error`。compose：`textarea.rail-chat-input`（`rows={2}`、`aria-label="和侧灯说一句"`；`onKeyDown` 先判 `event.nativeEvent.isComposing`，Enter 无 Shift → preventDefault + `send()`，Shift+Enter 换行）+「发送」`disabled={busy || !chatDraft.trim()}` + `.rail-chat-generate`（H6：`disabled={busy||!chatDraft.trim()||analyzing||!canGenerate}`，`title` 给原因，onClick → `onGenerateNotes(chatDraft.trim())` 后清 draft/error）。
4. `styles.css`（H4）：`.rail-chat-compose input` → **`.rail-chat-compose textarea`**（留 `flex:1`/`min-width:0`/`padding`/`font-size`，加 `resize:none`）；新增 head/reset/log（`max-height:calc(100vh - 300px)` + `overflow-y:auto`）/turn + is-user（`--panel`）/is-assistant（`--paper-raised` + 1px `--line`）/error（`--warn`）/mock/generate；**不给** `#rail-panel-chat` 加 `position`/`overflow`。

验收：
1. `npm run build`；`npm test` **58 文件 ≥794 条 0 fail**（基线 57/786；`chat.test.ts` ≥9：截断去空白 / system 节选 / 空文档提示 / 留 12 / 首条 assistant 丢 / `pushTurn` 不合并 / `appendDelta` 只补末条 / 空 turns 只有 system / 末条 user 进消息）。
2. 静态：`git grep -nE 'rail-chat-(log|turn|input|generate|error|mock)' --untracked -- src` 改前 **0**（对照 `.rail-chat-compose` 2）→ **≥8**；`streamChat` in `MarginRail.tsx` 0→1；`docName` in `MarginRail.tsx` 0→**≥2**；`canGenerate` in `App.tsx` 0→1。
3. E2E `.tmp/e2e-r96-a1-chat.mjs`（CDP 57270、1440×900；1 篇 3 段夹具，picker stub 照 `.tmp/e2e-r94-a1-rail-tabs.mjs:84-111`；先 `localStorage.clear()`+reload）：a 点「对话」→ 输入可聚焦、空输入「发送」disabled、空态 1、turn 0；b 输「帮我看这段」Enter → user 1、助手 ≤2 s 含「（模拟回复）」、焦点回输入框、log 滚到底；c 切「批注」再回仍 2 条；d Shift+Enter → value 含换行、turn 仍 2；e 假 Key（`localStorage['sidelight.settings.v1']`）+reload 后覆盖 `window.fetch`，`window.__sse={push,close}` 手推：推 1 段「发送」disabled，推 2 段 + `[DONE]` → 气泡=拼接值；401 → `.rail-chat-error` 含「API Key 无效」；f `.rail-chat-mock` 无 Key 1 / 假 Key 0；g「新对话」→ turn 0、draft 空、空态回 1；h 换文档（stub 开 `r96-other.md`）→ `__slState.name` 变、turn 0；0 `pageerror`。
4. 几何：3 段 →「分析本段」3 卡 → 对话发 3 条 → 切「批注」→ 首卡 `top ≥ .rail-tabs 底−栏顶+2`、栏宽 320±1、`.doc-scroll` 横溢 0；1024×700 抽屉开 → 对话可见、输入可聚焦、无横溢。截图 `shots/round-96/rail-chat.png`。

门禁 `build`/`test`；不跑 `roundtrip`。风险：IME 回车误发；卸载后 setState；`turns` 闭包过期（先算 `next`、onDelta 函数式更新）。

## A2「生成批注」
`src/lib/ai.ts`（`:111-129`）、`src/App.tsx`（`:1697`/`:1787`/`:5334`/`:5933`/`:6037`）、`prompt.test.ts`、`docs/CHANGELOG.md`。
1. `ai.ts`：`annotationMessages(context, settings, mode='local', instruction?)` —— `const given = typeof instruction === 'string' ? instruction.trim() : ''`（H1 兜底），`return buildMessages(context, given || settings.userPrompt, mode)`；`remoteStream` 用它（`:123`）；`StreamOptions` 加 `instruction?`。
2. `App.tsx`：`runAnalysis = useCallback(async (instruction?: string) => …)`（deps 不变）；`runOne` 传 `instruction`；全文模式（`:1826`）不传；**两处 `onClick` 改 `onClick={() => void runAnalysis()}`**（H1：`:5334`/`:6037`）——不改则 `strict` 下 tsc 先红、React 把事件当指令；`:5949` 已无参。
3. `<MarginRail>` 加 `settings`/`docName={docName}`/`canGenerate={viewMode === 'edit'}`/`getChatContext={() => (editor ? readBlocks(editor).map(b => b.text).join('\n\n') : '')}`（H3：`editor` 可空，截断交给 `chatContextOf`）/`onGenerateNotes={(instruction) => { setRailTab('notes'); void runAnalysis(instruction) }}`。
4. `prompt.test.ts` +2：`annotationMessages(ctx, settings, 'local', '  指令甲 ')` 的 user 含「指令甲」、不含 `settings.userPrompt`；空白/缺省/非字符串（`{} as unknown as string`）→ 含 `userPrompt`、不含「指令甲」。
5. `CHANGELOG.md` 写第 96 轮小节、标题上界 95→**96**（`changelog.test.ts` 机械门）。

验收：① `npm test` ≥796 条 0 fail；静态 `annotationMessages` in `ai.ts` 0→2、`instruction` in `App.tsx`+`ai.ts` ≥3、`onClick={() => void runAnalysis()}` 2。② E2E `.tmp/e2e-r96-a2-generate.mjs`（假 Key；`window.fetch` 存 `window.__cap = JSON.parse(init.body)`）：3 段 → 点第 2 段 → 输「把第二段的结论提到开头」→「生成批注」→ `__cap.messages[1].content` 含指令逐字、不含「偏好-唯一标记」（`settings.userPrompt` 设成它），自动切「批注」（`#rail-tab-notes[aria-selected=true]`）且 `.note` ≥1；再点 `.analyze-button` → 含「偏好-唯一标记」、不含指令；输入空两钮 disabled；源码态「生成批注」disabled；0 `pageerror`。③ `measure-first-screen.mjs --max 314500` exit 0，报告抄 raw/gzip。
门禁 `npm test`/`npm run verify` + `--max 314500`。风险：指令走 `userPrompt` 槽（带「作者偏好与检查重点：」前缀，别改 `prompt.ts` 标签）；不写回 `settings.userPrompt`；无 Key 走 `mockStream`（`ai.ts:103`）忽略指令——报告写一句。

## 范围外与残余
范围外同 rev.1：批注状态机、`[AGENT]`、快照迁移、diff、Under Review、对话落盘、多会话、对话改正文；不重构、不动 `release/`、不 push、0.32.1。
残余（报告与 BACKLOG 各记）：① 预览态 `!previewMode` 卸载 `MarginRail`（`App.tsx:5922`）→ 对话随预览清空，留「对话落盘/多会话」轮；② 按 `docName` 判身份，改名（`handleRenamedFile`）也清空对话；③ 无 Key 时 `mockStream` 不看 `instruction`（`ai.ts:310`）。
