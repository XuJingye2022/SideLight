# 第 112 轮计划（单轮 A · 只做队列这一条）— revision 1

revision 1（2026-11-20，按 plan-review CR-1…CR-4 修订，未加任务、未扩范围）。

## 本轮唯一问题
P1 对话页签：流式每来一个 delta 都把 `.rail-chat-log` 拽回底部，读者上翻看不了历史。
`MarginRail.tsx:176-181` 的 effect 依赖 `[turns, railTab]`，`turns` 每 delta 换引用 → 每次
`log.scrollTop = log.scrollHeight`（注释 `:173-175` 与行为相反）。证据 `.tmp/r112-finder-bug.json` 的 `scroll`。

## 体积基线
门 **315,221 B**（BRIEF 的 312,423 是第 93 轮旧值）、chunk gzip9 **6,803**、合并 **322,024**（超线 2,024 属 B-229，
不修不扩）；上限（CR-4）chunk ≤**7,003**、门 ≤315,321、合并 ≤**322,224**。

## 不碰
`App.tsx`、`styles.css`、`ai.ts`、`chatRefocusAfterStream`、页签结构、`aria-live` 不碰；`BACKLOG.md` 只加 4 行与 B-229 复测。

## A1 纯函数 + 接线（约 12 分钟）
files：`src/lib/chat.ts`、`src/components/MarginRail.tsx`、`src/lib/chat.test.ts`

1. `chat.ts` 尾加三导出（带短 JSDoc）：`CHAT_STICK_SLACK = 32`；`chatNearBottom(rect, slack = CHAT_STICK_SLACK)`
   = 距底 `<slack`（`rect` 即 `{scrollTop,scrollHeight,clientHeight}`）；`chatScrollOnUpdate(grew, stick)` = `grew || stick`。
2. refs：`:145-149` 加 `useRef(0)` 的 `turnCountRef`、`useRef(railTab)` 的 `prevTabRef`（照 `:247` `lastTabRef`）。
3. 重写 `:173-181` 的 effect（≤10 行，不留第二份状态）：

```ts
// 上翻时 delta 不拽回：轮数 +1 或切回页签才无条件贴底（hidden 时 scrollHeight 恒 0，B-232）；判据现场读不缓存。
useEffect(() => {
  const tabChanged = prevTabRef.current !== railTab
  prevTabRef.current = railTab // 写回在守卫前，B-232 才真成立（CR-2）
  if (railTab !== 'chat') return
  const log = logRef.current
  if (!log) return
  const grew = turns.length !== turnCountRef.current || tabChanged
  turnCountRef.current = turns.length
  if (!chatScrollOnUpdate(grew, chatNearBottom(log))) return
  log.scrollTop = log.scrollHeight
}, [turns, railTab])
```

4. `.rail-chat-log`（`:707`）**不加** `onScroll`：现场读 `scrollTop`（CR-4）。
5. `chat.test.ts` 加 3 条（15→18）：`chatNearBottom` 边界（0/31 true、32 false、顶端 false、自定义 slack）、
   `chatScrollOnUpdate` 4 格真值表、静态门（`log.scrollTop = log.scrollHeight` 恰 1、`scrollTop =` 总数 1、
   该行 ±400 字符含两新函数与两 ref、`prevTabRef` 比较先于守卫、`.rail-chat-log` 开标签无 `onScroll=`）；负向必红一次。

验收：`chat.test.ts` 18 条；`npm test` 62 文件 ≥882 条 0 fail；`npm run build` exit 0；`roundtrip` 不跑。
风险：`send()`/`generateNotes()` 算 `grew` → 保留「发出去跳最新」；`hidden` 靠守卫挡。

## A2 真机证据 + 入池 + 体积（约 13 分钟＝10＋3）
files：`.tmp/r112-a1-e2e.mjs`（新）、`BACKLOG.md`、`round-112/impl.md`

1. 骨架 `.tmp/r112-finder-bug.mjs`（ego CDP 57270、1440×560、假 FSA、无 Key mock），只留 A 段；`slowMock(140)` 把
   20 ms/3 字拉到 ~2.9 s（`src/lib/ai.ts:231-240`，默认整条流仅 ~420–460 ms），MutationObserver 计 delta（CR-3）：
   - A1 复现：灌 4 句 → 发第 5 句 → 等 260 ms → `scrollTop = 0` → 等 120 ms 读 `baseline`（应 0）→ 等
     `deltasAfterBaseline ≥ 3`（上限 1.2 s）读 `afterDeltas`（≤3）→ **收流后**（`aria-busy=false`）读 `settled`（≤3）。
   - A2 正向：不滚动发一句；记滚动前 `scrollHeight`，收流后「`scrollHeight` 再增 ≥1 次 且 距底 ≤3」。
   - A3 恢复：流式中 `scrollTop = 0`、等 120 ms 仍 0；再设最大值并记 `h0`，轮询到 `scrollHeight > h0`（上限 2 s）
     且末次距底 ≤3 —— 不能由初始赋值自己满足。0 pageerror、截图 `shots/round-112/chat-scroll-follow.png`。
2. 入池（CR-1，3 分钟）：`BACKLOG.md` 加 4 行（`open`、轮次 `112`）：
   - `B-241` P1 末｜键盘：选区 1/1 时 `main` 的 `onKeyDownCapture` 把侧栏 Tab 全送 `.skip-link`｜`src/App.tsx:5884`、
     `.tmp/r112-finder-ui3.json`（`forward[0]`）、`.tmp/r112-finder-ui5.mjs`（`railInsideMain`）
   - `B-242` P1 末｜可访问性：`.rail-chat-turn` 无发言者标识（WCAG 1.3.1/1.4.1，对照 `[AGENT]`）｜
     `MarginRail.tsx:715`、`styles.css:1523`、`.tmp/r112-finder-ui2.json`（`turns.html`）
   - `B-243` P2 末｜界面：401 后留空白助手气泡｜`MarginRail.tsx:188`、`:205-207`、
     `.tmp/r112-finder-ui2.json`（`error401`）、`shots/round-112/chat-401.png`
   - `B-244` P2 末｜可访问性：`.rail-chat-log` 无 `tabindex`、键盘滚不回去｜`styles.css:1503-1511`、
     `.tmp/r112-finder-ui3.json`（`logFocusableByTab:false`）
   - `B-229` 证据末补「第 112 轮复测：门 X + chunk Y = Z」+ 轮次 `112`；`impl.md` 记「已入池 B-241…B-244」。
3. 体积：`npm run verify` 记门值；`node -e` 算 chunk gzip9；`measure-first-screen.mjs:8-9` 的 6,489 改实测。

验收：A 段改前红（`afterDeltas 344 / settledTop 386`）→ 改后 `baseline 0`、`deltasAfterBaseline ≥3`、
`afterDeltas`/`settled` ≤3；A2/A3 绿；0 pageerror；回归 `r104-tester-indep` 25/25、`e2e-r111-a1-focus` 17/17；`^\| B-24[1-4] ` 恰 4 行、
B-229 含 `112`，`test.md` 记已入池；三数 ≤315,321/≤7,003/≤322,224 且 exit 0。

## 已知边界（写进 test.md）
- 判据读**更新后**的距底值（CR-4）：单条 delta 增高 ≥32 px 会停在底部上方、不再自动跟（mock ≈0–24 px，
  真实大分片 UNVERIFIED）——方向是「少跟」不是「拽回」。
- `scrollTop = 0` 后必等 ≥120 ms 再计数；批注页签时的 delta 不滚（`hidden`），切回由 `prevTabRef` 贴底。
- B-233/B-243/B-244 本轮不改；合并超线属 B-229，三数都记 `test.md`。

## 修订记录（CR → 落点）
CR-1 入池 + B-229 复测（A2/2）；CR-2 `prevTabRef`（A1/2）；CR-3 A2 三段判据；CR-4 去 `stickRef` 现场读（A1/4）。
