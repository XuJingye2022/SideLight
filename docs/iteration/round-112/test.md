# 第 112 轮 test（tester 独立验收：对话贴底判据）

> tester 未读 `impl.md`：只读 `plan.md`、`git diff`、`BACKLOG.md`，从零自写脚本复验。轮前 startSha `e27e3d5`。本轮单任务 A1/A2。

## 判定

**PASS**。单测/静态门/门禁/真机三段全绿，反事实红基线成立，0 产品回归；体积三数都在上限内（B-229 仍 open）。

## 单测与静态门

- `node --experimental-strip-types src/lib/chat.test.ts` **18/18**（15→18：`chatNearBottom` 边界 8 格、`chatScrollOnUpdate` 真值表 4 格、MarginRail 静态门）。
- 静态独立复核（不用测试）：`log.scrollTop = log.scrollHeight` **1 处**、`scrollTop\s*=` **1 处**、`.rail-chat-log` 开标签（`<div className="rail-chat-log" role="log" aria-live={busy ? 'off' : 'polite'} aria-busy={busy} aria-label="对话记录" ref={logRef}>`）无 `onScroll=`；贴底行 ±400 字符含 `chatScrollOnUpdate(`/`chatNearBottom(log)`/`prevTabRef`/`turnCountRef`；索引 compared **73** < wroteBack **108** < guarded **145**（比较/写回都先于页签守卫）。
- 负向对照：临时把贴底写入复制成两行 → `chat.test.ts` **1 红 exit 1**（actual 2 / expected 1），还原后 **18/18 exit 0**；`git diff --stat` 仍 16 行改动（12+/4−）。

## 独立 E2E（自写 `.tmp/r112-tester-a1-scroll.mjs`）

ego CDP 57270、1440×560（矮视口保证 log 溢出）、假 FSA `a.md`、无 Key mock 流、`setTimeout(20)→140 ms` 放慢、MutationObserver 计 delta。**10/10 全 OK、0 pageerror**（`.tmp/r112-tester-a1.json`）：

| 判据 | 独立读数 |
| :--- | :--- |
| A1 翻顶 baseline | 8 条灌满后发第 5 句，260 ms 后设 `scrollTop=0`，120 ms 后仍 **0**（dist 344） |
| A1 后续 delta | baseline 后又来 **3** 批 delta（4→7），`scrollTop` 仍 **0** |
| A1 收流 | `aria-busy=false` 后 `scrollTop` 仍 **0**（内容已从 604 长到 646） |
| A2 正向 | 贴着底发一句：`scrollHeight` **646→775**（24 个增长采样），收流距底 **0** |
| A3 恢复 | 流式中设顶 120 ms 仍 **0**；回到底部后 `scrollHeight` **863→884**（首个增长样本 dist 21，流未停），收流末次距底 **0** |

**反事实红基线**：临时去掉谓词改回旧「无条件贴底」（`void grew`）→ 同脚本 **6/10**、4 红（A1a/A1c/A1d/A3a），`afterDeltas` **344**、`settledTop` **386**、A3a **443**，与任务书「改前 344 / 386」一致；还原后复跑 **10/10**。截图 `shots/round-112/chat-scroll-follow.png`。

## 门禁与体积

- `npm test` **62 文件 882 条 0 fail**（按每文件 `ℹ tests` 求和；`.tmp/r112-tester-npmtest.log`）。
- `npm run verify` **exit 0**：tsc + build 通过、首屏门 gzip **315,213 B**（≤315,321；raw 1,022,532、余硬线 4,787、超内部预算 5,213 只 WARN）。
- `gzipSync({level:9})` 量 `dist/assets/MarginRail-CB5tvYeF.js` raw **19,493** → **6,884 B**（≤7,003）；B-229 口径「门+chunk」= **322,097**（≤322,224；超硬线 2,097 属 B-229，不修不扩）。

## 回归与入池

- `.tmp/r104-tester-indep.mjs` **25/25**、`.tmp/e2e-r111-a1-focus.mjs` **allPass true（17/17）**，均 0 pageerror；跑完 `git checkout -- shots/round-104/instruction-kept.png shots/round-111/focus-after-switch.png`（已还原）。
- `BACKLOG.md`：`^\| B-24[1-4]` **恰 4 行**（open）、B-229 行含第 **112** 轮复测（门 315,213 + chunk 6,884 = 322,097）；新入池 B-241 键盘 / B-242 发言者标识 / B-243 401 空气泡 / B-244 log 不可聚焦，证据引 `.tmp/r112-finder-ui2/ui3.json` 与 `shots/round-112/chat-401.png`。

## 已知边界

- 判据读**更新后**的距底值：单条 delta 增高 ≥32 px 会停在底部上方、不再自动跟（mock 实测 0–24 px；真实大分片 UNVERIFIED），方向是「少跟」不是「拽回」。
- 批注页签时 log hidden（`scrollHeight` 恒 0），切回由 `prevTabRef` 贴底；`scrollTop = 0` 后必须等 ≥120 ms 再计数（已按此执行）。
- B-233/B-241…B-244 本轮不改；合并超线只记，属 B-229。

## UNVERIFIED

真实模型/真 SSE（无 Key 走 mock 流）、真实中文 IME、真 WebView2 宿主与原生打印；A2/A3 在 1440×560 量，更高视口未跑。台账：BACKLOG 新增 **B-245 → fixed**（plan 未分 ID，按第 103/108 轮先例补号）；CHANGELOG 加第 112 轮小节并把标题上界改 29–112；`STATE.md` 末尾追加第 112 轮条目（第 111 轮缺记录非本轮范围，未补造）。
