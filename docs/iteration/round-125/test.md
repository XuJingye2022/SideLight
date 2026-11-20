# 第 125 轮验收（tester 独立验收并 commit）

轮前 `d32b72b`；工作树只 4 个源文件 + 本轮报告/截图；未读 `impl.md`、未用 impl 脚本断言（自写）。判定 **PASS**。

## 门禁
- `npm test` **65 文件 923 条 0 fail**（逐文件 `ℹ tests` 求和；`.tmp/r125-tester-npmtest.log`）。
- `npm run verify` **PASS**（tsc + vite build + 首屏）。门 gzip **315,738 B** ≤315,876（HEAD 315,726，净 **+12 B**；硬线余 4,262；内部预算 310,000 仍超 5,738 只 WARN）。
- 常驻 `MarginRail-DrxNXyli.js` gzip9 **7,681 B** ≤7,795（第 124 轮 7,495，+186）；**B-229 口径 = 315,738 + 7,681 = 323,419**（第 124 轮 323,221，+198；超硬线 **3,419 B**，仍 `open` 只记）。
- `git diff --stat -- src` 只 4 文件：App.tsx / MarginRail.tsx / chat.ts / chat.test.ts（+147/−9）。`.tmp/r125-tester-verify.log`。

## A1 上下文跟选区/光标走
- `chat.ts` 新 `chatContextFor(blocks, from, to, limit=CHAT_CONTEXT_LIMIT)`：有选区走 `buildContext`；无选区且落在第一块内走开头切片；其余取光标块±1；`buildContext` **显式传 limit**（默认 1500）。`App.tsx:6034` 改 `getChatSource`（现读 `readBlocks` + `editor.state.selection`，`viewMode !== 'edit'` 时 from/to=1）。`MarginRail.tsx` prop 与 `send()` 接线，「上下文最多 2000 字…」空态句（本轮唯一新增文案）。
- 单测 **25→31**。独立负向：去掉 `buildContext` 的 limit → **4 红 exit 1**（①②③④）；还原后 SHA256 `EED14FD3…` 与负向前一致、**31/31 exit 0**（`.tmp/r125-tester-negative.log`、`-restored.log`）。
- 静态门：`git show d32b72b` 的 App/MarginRail `indexOf('getChatSource')` 均 **−1**；现树各 1 处；App 的 prop 段含 `viewMode === 'edit'`/`state.selection`/`readBlocks(`，App 内 `chatContextFor(` **0**；MarginRail 调用 **恰 1**。

## A2 真机（自写 E2E，ego CDP 57270、1440×900、假 FSA + 假 SSE）
`.tmp/e2e-r125-tester-context.mjs` **27/27 PASS、0 pageerror**（`.tmp/r125-tester-context.json`、`.tmp/r125-tester-e2e.log`）：
- S0 夹具三段，两枚标记都在正文。
- S1 打开即问（选区 1/1）：`hasHead:true`/`hasTail:false`/`systemLength 2147`（≥1,900）、末条 user 逐字相等。
- S2 末段选 17 字（DOM 选区 17、以「结尾标记乙」收尾）：`hasTail:true`/`hasHead:false`/system **含这 17 字**/`2099 ≤2150`/`lastUser` 逐字相等。
- S3 末段不选：`hasTail:true`/`hasHead:false`/`2099 ≤2150`。
- S5 预览态 `#rail-panel-chat` **0** 且 `viewMode=preview`；源码态 rail 挂载、`.doc-layout.source-hidden` hidden+0 尺寸，程序化发送（原生 value setter + input + DOM click）得 `hasHead:true`/`hasTail:false`/`2147`（守卫生效，未拿上次停的末段选区）。
- S4 `Ctrl+Alt+N` 空白文档：system 含「（当前文档还没有正文）」、lastUser 逐字相等。
- 截图 1 张 `shots/round-125/chat-context.png`（末段选 17 字 + 对话页签 + 空态，状态栏「选区 17 字」）。
- 回归 `.tmp/r96-tester-a1a2.mjs` **42/42**、`.tmp/e2e-r96-a1-chat.mjs` **33/33**，均 0 pageerror；跑后 `git checkout -- shots/round-96/`。

## 偏差 / 未验
- `src/lib/chat.ts` 首行被写入 UTF-8 BOM（全 `src` 唯一，3 B；build/单测/E2E 全过）——不判 FAIL，建议 scribe 顺手去掉。
- 开头切片判据是「落在第一块内」（`from < first.to`），比计划的 `from<=1` 宽；S1 默认路径未缩，单测覆盖第一块内（from=100）。
- UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实模型（按任务走假 SSE）。`roundtrip` 不跑（未动编辑器/序列化）。
