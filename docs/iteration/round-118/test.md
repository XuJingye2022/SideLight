# 第 118 轮独立验收（tester）

判定 **PASS**。轮前 startSha `8acf11a`。只做 BACKLOG **B-244**（`.rail-chat-log` 不能聚焦，键盘回看不了历史），未读 `impl.md`，按任务书从零复验。

## A1 改法 + 机械门 + before/after

**改法**：`git diff` 只有 `src/components/MarginRail.tsx` 1+/1−、`src/lib/chat.test.ts` +24、`BACKLOG.md` 1 行；`styles.css` 0 改动。`src/components/MarginRail.tsx:764` 的 `.rail-chat-log` 开标签加 `tabIndex={0}`，`role`/`aria-live`/`aria-busy`/`aria-label`/`ref` 逐字未动（改前 `attr:null`、`tabIndex:-1`）。静态：`className="rail-chat-log"` 全文件恰 1、`tabIndex={0}` 全文件 1→**2**（另一处 `:533` 是批注卡，既有；log 标签上的 `{-1}` 0）。dev 交付模块 `GET /src/components/MarginRail.tsx` 的 log 属性序含 `tabIndex: 0`（防第 29 轮旧模块坑）。

**单测**：`node --experimental-strip-types src/lib/chat.test.ts` **25/25 exit 0**（24→25，新条按同一开标签断 `tabIndex={0}`、无 `{-1}`、不按 `turns.length` 条件化、`className` 恰 1）。负向独立做：只删 log 标签上那一处属性 → **恰 1 红 exit 1**（报文指新条；注意全文件首个 ` tabIndex={0}` 在 `:533`，按首个匹配删会删错、测试仍绿——本轮实测过这一假绿）；从备份写回 → SHA256 `D747DD3C…` 相同、**25/25**。

**before**（先 `git checkout -- src/components/MarginRail.tsx` 回 HEAD，交付模块确认无 `tabIndex`，跑 `.tmp/e2e-r118-b244.mjs --phase before`）**7/8**，`.tmp/r118-b244-before.json`：`role=log`/`aria-label=对话记录`/`aria-live=polite`、`attr:null`、`tabIndex:-1`、1,600×「甲」后 `over:1027`、空记录 Shift+Tab 落 `BUTTON#rail-tab-chat`、`focus()` 后 PageUp 减 **525**。**1 红为 plan R1 已记录项**：溢出后本机 Edge 157 对可滚动容器有原生 Tab 落点（B4 对照 div 同证），故「改前 Shift+Tab 不落 log」只在空/未溢出态成立；不假绿、不判 FAIL。

**after**（写回工作树、交付模块确认含 `tabIndex` 后跑 `--phase after`）**13/13、0 pageerror**，`.tmp/r118-b244-after.json`：`tabIndex===0`/属性 `"0"`/全页恰 1 个；真实 Shift+Tab 自 `.rail-chat-input` 落 log，真实 Tab 回输入框；聚焦后 outline **2px solid rgb(43,109,100)**；置底后 PageUp **−525**、ArrowUp **−40**、Home→**0**、PageDown **+525**、End→**1027=max**；载入与收流后焦点都不是 log；`role`/`aria-label`/`aria-live` 较 before 逐字相同；栏宽 **320**、rail/log 横溢 **0**、`over:1027` 夹具不变；截图 `shots/round-118/chat-log-focus.png`（聚焦环 + 上翻中段；Playwright 截图会清 deviceMetricsOverride，落盘 1280×720，A9 在 1440×900 已断焦点与 scrollTop 中段）。

## A2 回归、体积三数、BACKLOG

回归（每条现场跑、0 pageerror）：`.tmp/r96-tester-a1a2.mjs` **42/42**、`.tmp/r112-tester-a1-scroll.mjs` **10/10**、`.tmp/r111-tester-focus.mjs` **14/14**、`.tmp/e2e-r108-a1-live.mjs` **17/17** 与 `.tmp/r108-tester-live.mjs` **22/22**、`scripts/keyboard-acceptance.mjs` **52/52**。跑后 `git checkout -- shots/round-05 shots/round-96 shots/round-108 shots/round-111 shots/round-112`，四目录（另加 108）`git status --porcelain` **为空**。

三数（实测，与 BACKLOG 行一致）：门 `npm run verify -- --max 315800` **exit 0 / PASS**、gzip **315,509 B**（raw 1,023,714、files 3、headroom 291、Δ 0）；常驻 `MarginRail-eN3hT9po.js` raw **20,971** / gzip9 **7,391**（Δ vs 7,392：raw +11、gzip −1，≤+32）；B-229 合计 **322,900**（Δ −1 vs 322,901，仍超硬线、**B-229 仍 open**，只记）。

`npm test` **62 文件 897 条 0 fail**（62 个 pass 汇总行求和 897、fail 0）。代码侧 `git diff --name-only` 只 `MarginRail.tsx`/`chat.test.ts`/`BACKLOG.md`（tester 按角色另加 `CHANGELOG.md`/`STATE.md` 两处记账，见下）。`roundtrip` 不跑（未动编辑器/序列化）。BACKLOG B-244 已 `fixed`，行尾含 `:764` 改法、`-before.json`/`-after.json`、E2E 断言、`chat.test.ts` 24→**25**、`npm test` 897 条与三数；未新增条目，B-229/B-233/B-238/B-246/B-248 未动。

## 偏差与 UNVERIFIED

- 偏差（不判 FAIL）：任务书「改前 Shift+Tab 落点不是 log」按 plan R1 在实际溢出态不成立（本机 Edge 原生聚焦可滚容器）；空态成立且 `attr:null`/`tabIndex:-1` 是红证据。任务书写 `.tmp/r108-tester-live.mjs` 17/17，该文件实为 22 条；17 条属交付脚本 `.tmp/e2e-r108-a1-live.mjs`，两条都跑。
- UNVERIFIED：真实中文 IME、真 WebView2 宿主（`INIT-FAIL`）、原生打印——与本轮焦点/滚动无关未跑；本机只有 Edge 157，其它浏览器对可滚容器的原生 Tab 行为未验（显式 `tabIndex={0}` 正是为消除该差异）。

证据：`.tmp/r118-tester-neg-step.mjs`、`.tmp/r118-tester-fetch.mjs`、`.tmp/r118-tester-npm-test.log`、`.tmp/r118-tester-verify.log`、`.tmp/r118-b244-{before,after}.json`、`.tmp/r118-exec-b244-*.json`。
