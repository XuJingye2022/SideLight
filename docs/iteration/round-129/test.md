# 第 129 轮验收（tester 独立；未读 `impl.md`）

- 轮前 startSha `a8985f6428b319430dfd94e0adcad20ed932d781`；HEAD 仍为其时开始验收。
- 判定：**PASS**（A1 机制 + A2 真机 before/after 全达；1 条脚本自身语义偏差已修正后重跑）。

## A1 批注写盘 flush（B-255）

静态门自写 `.tmp/r129-tester-static.mjs` **10/10 PASS**（`src/App.tsx` 现文）：

- `flushAnnotationWrite` 声明 :787，在 `annotationsHydratedRef`（:768）之后、`applyHostPayload`（:1442）/`restoreAnnotationsFor`（:2567）/`loadIntoEditor`（:2622）之前（任务书 :767/:1383 是 startSha 行号，本轮 +59 行整体下移，次序成立）。
- `pendingAnnotationsRef` 形状恰 5 键 `host/space/path/name/store`；`const promise=(async()=>{…})()` 之后同步 `annotationsWriteRef.current = promise`（登记前无顶层 `await`）；`if (!pending) return Promise.resolve()` 早于登记，不覆盖在飞 promise。
- `loadIntoEditor` 首行 `void flushAnnotationWrite()`，早于 `setMarkdown` 与 `setAnnotations([])`；`applyHostPayload` 首行同、早于 `!editor` 守卫；两处 deps 各含 `flushAnnotationWrite`（:1520/:2762）。
- `restoreAnnotationsFor` 第一句 `await annotationsWriteRef.current?.catch(…)`，早于 `readAnnotationStore`（:2570 < :2577）。
- 写盘仍 `writeAnnotationStore(dir,key,store,false)`；空档 `removeCache`。

门禁：`npm run verify -- --max 316500` **exit 0 PASS**；`npm test` **66 文件 933 条 0 fail**（`package.json` 逐文件求和，`annotations.test.ts` 40/40 含两条新静态门）；`git diff --stat` 3 文件 = **2 个 src 文件**（App.tsx 119+/31−、annotations.test.ts 29+）+ BACKLOG 1 行，0 新增源文件。

## A2 真机 before/after（ego CDP 57270、1440×900、假 FSA 记 ops、种子 a.json 1 条 open）

自写 `.tmp/r129-tester-flush.mjs`（夹具同源，断言独立）；脚本先过 dev 模块身份门：after `flush/writeRef/pendingRef` 全 true、before 全 false（`.tmp/r129-tester-devmod-{after,before}.json`，字节 784,011 / 776,767，与交付 `.tmp/r129-devmod-*.json` 一致）。before 用 `git stash push -- src/App.tsx` 回旧码，跑完 `stash pop` 并复核模块回 true。

**after**（`.tmp/r129-tester-ann-flush-after.json`）**6/6 PASS、0 pageerror**：

- ① 改状态 resolved 后立刻切 b.md：`editToLoadMs` **149 / 150 ms**（两窗口两次跑一致），窗口内 `write:.sidelight/annotations/a.json` **恰 1**、b.json **0 写**，1,600 ms 后 a.json `reviewStatus==='resolved'`；写盘时刻距点击 b.md **+40 ms**（600 ms 计时器路径应 ~+450 ms）→ 证明确实走 flush。
- ② 重开 a.md：select `resolved`、磁盘 `resolved`。
- ③ 在 b.md：`.note` 0、标题含 b.md、全量 b.json 写 **0**。
- ④ 紧急度 urgent 后立刻切：`editToLoadMs` **150 ms**、写 a.json 恰 1、磁盘 `priority==='urgent'`。
- ⑤ 对照（改 wont-fix 等 1,000 ms 再切）：切前磁盘已 `wont-fix`，重开仍 `wont-fix`。
- ⑥ 0 pageerror / 0 console error。

**before**（`.tmp/r129-tester-ann-flush-before.json`）`asExpected=true`：① `editToLoadMs` **150 ms**、a.json **0 写**、仍 `open`；② 重开 `open`（丢失复现）；④ **0 写**、`priority` 仍 `none`；③⑤⑥ PASS；0 pageerror。与交付 before JSON 同向。

## 体积三数（B-229 口径）

门 gzip **316,033 B**（raw 1,025,343、files 3、headroom 467，`--max 316500` PASS；内部预算 310,000 超 6,033 只 WARN）；常驻 `MarginRail-Cej3jE1X.js` raw 22,271 / gzip9 **7,869**；合计 **323,902**（超首屏硬线 **3,902**，B-229 仍 `open`，只记）。与 BACKLOG/交付三数逐值相同。

## 回归

- `.tmp/e2e-r97-a1-status.mjs` **44/44 PASS**、0 pageerror；跑后 `git checkout -- shots/round-97/` 还原（`note-status.png` 曾被打脚本覆盖，已复原）。
- 改前/改后窗口两轮各一次，`editToLoadMs` 均 <600（无 `≥600` 采样，不需重跑）。

## 偏差与残项（不判 FAIL）

- 自写 before 脚本首版把 ② 的「复现成功」记成 PASS，与退出期望相反（工具脚本语义错，非产品）；改成验收口径后重跑 `asExpected=true, exit 0`，数据两次一致。
- 验收只看「窗口内 1 写」，另加写盘时刻 +40 ms 作为 flush 机制证据（第 129 轮 plan §4 C-2 的同 tick 等待仍保留）。
- `restoreAnnotationsFor` 只等「最后一次登记的 promise」：连续快速 换篇→改档→换篇 时若中途又有新 pending，旧 P1 不在等待链上；不在本轮验收范围，未见丢档，仅记录。

## UNVERIFIED

真 WebView2 宿主换篇（只静态核 `applyHostPayload` 首行 + deps）；真实 FSA（本机假句柄）；关窗/卸载兜底 `useEffect` 的清理写盘；真实中文 IME。CDP 9222–9226 无监听，真机走 ego 57270。
