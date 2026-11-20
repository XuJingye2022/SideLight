# 第 112 轮执行报告（A1 + A2）— PASS

3 源文件 + `BACKLOG.md`、`measure-first-screen.mjs` 注释；未 commit。

## A1 对话贴底判据

- `src/lib/chat.ts:84-114`：尾加 `CHAT_STICK_SLACK = 32`、`chatNearBottom(rect, slack=32)`（距底 `< slack`）、
  `chatScrollOnUpdate(grew, stick) = grew || stick`，类型 `ChatScrollBox`。
- `src/components/MarginRail.tsx:150-152` 加 `turnCountRef = useRef(0)`、`prevTabRef = useRef(railTab)`；
  `:176-190` 按 plan A1/3 重写 effect：`tabChanged` 计算与写回都在 `railTab !== 'chat'` 守卫**前**，
  `grew = turns.length !== turnCountRef.current || tabChanged`，`!chatScrollOnUpdate(grew, chatNearBottom(log))` 才 return。
  `.rail-chat-log`（`:715`）**不加** `onScroll`；`scrollTop =` 全文件恰 1 处（`:189`）。
- `src/lib/chat.test.ts`：15→**18 条**（`chatNearBottom` 边界 0/31 true、32 false、顶端 false、自定义 slack、零溢出；
  `chatScrollOnUpdate` 4 格；静态门：单点写入、±400 字符含两函数与两 ref、比较/写回先于守卫、开标签无 `onScroll=`）。

单跑 `chat.test.ts` **18/18**（fail 0）；负向对照（effect 改回无条件贴底）静态门 **1 红 exit 1**；
`npx tsc --noEmit` exit 0；`npm test` **62 文件 882 条 0 fail**；`npm run build` exit 0、`npm run verify` PASS。

## A2 真机证据

`.tmp/r112-a1-e2e.mjs`（新）：ego CDP 57270、dev 5175、1440×560、假 FSA `a.md`、无 Key mock 流
（`setTimeout` 20→120 ms ≈2.5 s）、`MutationObserver` 数 delta 与 `scrollHeight`。`git stash` 前后各跑一次：

- 改前 `.tmp/r112-a1-before.json`：RED **7** —— A1-baseline `top 344`、afterDeltas `top 344`、settled `top 386`、
  A3-stuck `603`、两条 not-bottom、S9（交付模块 0 命中）；0 pageerror。
- 改后 `.tmp/r112-a1-after.json`：**0 RED**、0 pageerror —— baseline `0`、`deltasAfterBaseline 3`、afterDeltas
  `top 0 / 距底 344`、settled `top 0 / 距底 386`；A2 `h0 646→775`（grows 3）距底 0；A3 回底 `884`、收流 `644`
  距底均 0；S9 四项全真（`stickSlack 32`）。截图 `shots/round-112/chat-scroll-follow.png`。
- 回归：`.tmp/r104-tester-indep.mjs` **25/25**、`.tmp/e2e-r111-a1-focus.mjs` **17/17**，0 pageerror；
  跑完 `git checkout -- shots/round-104 shots/round-111` 还原旧截图。

plan-review 四条已落：**H-3** 引用 `App.tsx:5886-5893`+`:6000`/`:6089`；**H-4** A2/A3 先断
`scrollHeight > clientHeight`（257 px）、A3 轮询上限 3 s；**H-5** 同一脚本先跑改前。

## 体积（三数）

门 gzip **315,213**（`verify` PASS，≤315,321，余 4,787）；`MarginRail-CB5tvYeF.js` gzip9 **6,884**（raw 19,493，
≤7,003）；合并 **322,097**（超硬线 2,097，B-229 仍 open，≤322,224）。`measure-first-screen.mjs:8-9` 注释改 6,884。

## BACKLOG

已入池 **B-241**（P1 末，键盘）、**B-242**（P1 末，可访问性）、**B-243**（P2 末，界面）、
**B-244**（P2 末，可访问性），均 `open`、轮次 `112`；`^\| B-24[1-4] ` 恰 **4 行**。
**B-229** 补「第 112 轮复测：门 315,213 + chunk 6,884 = 322,097（超线 2,097）」，轮次列 `101/102/109/112`。
例外：B-243/B-244 按 `common.md:45` 本应 `deferred`，按 plan 写 `open`，请在 `test.md` 记这条例外。

CHANGELOG：`对话页签流式回复不再把上翻的读者拽回底部：整轮 +1 或读者本来就贴底时才贴底，切回页签仍贴底。`

## 新踩坑

1. **A1 判据是 `scrollTop` 不是「距底」**：修好后上翻时距底本来就是 344/386；第一版脚本写 `bottom ≤3` 改后反红，
   要断 `top ≤3`（+ `bottom >32` 作对照）。
2. **同一 E2E 先 `git stash` 再跑一次**即得同源改前读数；不必重启 dev server（`page.goto` 重取模块），
   `delivered` 四项当「交付是新版吗」探针。
3. **H-2 未采纳**：`CHAT_STICK_SLACK` 按 plan 取 32，单条 delta 增高 ≥32 px 时不再继续跟（方向是「少跟」）；
   真实模型大分片的跟读 UNVERIFIED（mock 增量 0–24 px）。
