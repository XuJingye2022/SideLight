# 第 94 轮 tester 独立验收（A1/A2，B-221）

- 轮前 startSha `1e99d8224d6d41dde8ea6681b863b6fd257fca4b`；未读 `impl.md`。真机走 ego 浏览器 CDP 57270（9222–9226 无监听），dev server `http://localhost:5175` 不重启。
- 判定：**PASS**（A1、A2 全部验收项过；2 条 UNVERIFIED 见 §5）。

## 1. 门禁
- `npm run verify`：PASS（`.tmp/r94-tester-verify.log`）。`dist` 98 文件，首屏 gzip **312,566 B** ≤ 门槛 313,000 / 硬线 320,000（余 7,434）；主 chunk `index-Fd0G4Vpe.js` 963,935 raw / 302,694 gzip。
- `npm test`：**57 文件 778 条 0 fail**（`.tmp/r94-tester-npm-test.log`；57 个 suite 逐文件 `ℹ tests` 求和 778、`ℹ fail 0`、无 `✖`）。未改编辑器/序列化，不跑 roundtrip（计划同）。

## 2. A1 静态门（Select-String，`"` 不交给 git grep）
- `role="tablist"` 在 `MarginRail.tsx` = **1**，HEAD 对照 **0**。
- `railTab|rail-panel-notes|rail-panel-chat` 在 `App.tsx`+`MarginRail.tsx` = **16**（≥6），HEAD 对照 **0/0**。

## 3. A1 E2E（自写 `.tmp/r94-tester-a1a2.mjs`，自造夹具、自算 flowBottom/natural，38/38 PASS，`.tmp/r94-tester-a1a2.{log,json}`）
- 页签：恰 2 个（对话/批注）、`tablist`=1、默认「批注」`aria-selected`、chat 面板 `hidden=true`、roving `−1/0`；←/→/Home/End 四次换选，选中项、焦点 id（`rail-tab-chat/notes`）、两面板 hidden 同步。
- 对话面板：`input`/`button` 各 1 且 `disabled`；焦点在对话页签连按 4 次 Tab，`activeElement` 从未落进 `#rail-panel-chat`。
- 3 卡几何（点第二段 →「分析本段（模拟）」）：natural 87/87/120、flowBottom 58；每卡 `top = max(natural, 上卡底+12)` ±1 → **146/304/480**；3 卡递增且 `next.top ≥ prev.top+prev.offsetHeight`；首卡 **146 ≥ 页签底 58+2**；3 卡中心 `elementFromPoint` 均命中；切页签往返首卡差 **0 px**。
- 滚到底：末卡底 **626 ≤ 整体评价顶 638+1**；切页签往返末卡底差 **0 px**。
- 自然位分支（reload 后点第四段）：首卡 top **254 = natural 254 ±2**，`natural−flowBottom` = **120 ≥ 40**（首轮点第三段只有 37 px，是夹具深度不足，改点第四段复测 38/38，非产品缺陷）。
- 场景 B（假 Key `{apiKey:'e2e',baseUrl:'http://localhost:5175/__mock'}` + 拦 `**/chat/completions` 回一条无 meta evaluation）：请求被拦 1 次；`.rail-goal`/`.rail-notice`/`.rail-notice-mock` = **0/0/0**；卡 1；首卡 **70 ≥ 页签底 58+2** 且 `top = flowBottom 58+12` ±1。
- 0 pageerror。另跑执行方交付 `.tmp/e2e-r94-a1-rail-tabs.mjs` **38/38**（`.tmp/r94-tester-a1-e2e.log`），与独立脚本结论一致。

## 4. A2 宽度与样式
- 重跑 `.tmp/r94-a2-css.mjs` **13/13**：`.rail-tabs`/`.rail-tabs button`/`.rail-tabs button.is-active` 各 1；`.rail-chat-*` 五条（empty/hint/compose/input/button）各 1；`.doc-layout` 列 = `minmax(0, 36rem) 320px`、块内 `260px` 改后 **0**（改前对照 **1**）、全文件 `260px` 0。改前对照副本 `.tmp/r94-styles-head.css` 经逐字符比对 = HEAD `src/styles.css`（仅多尾部换行），对照非伪造。
- 几何（同一自写脚本）：1440×900 `.margin-rail` 宽 **320**、`.doc-scroll` `scrollWidth−clientWidth` **0**；1120×800 宽 **320**、横溢 **0**、`.doc-column` **480 ≥ 420**；1024×700 `.margin-rail` computed `display:none`。三档均无 pageerror。
- 截图核对：`shots/round-94/rail-tabs-notes.png`（1440×900，页签「对话/批注」+ 批注态 3 卡 + 整体评价）、`shots/round-94/rail-width-1120.png`（1120×800，栏 320 + 页签 + 空态提示）均实存且人工检视一致。

## 5. 回归与 UNVERIFIED
- 回归：`keyboard-acceptance` **52/52**（`SIDELIGHT_CDP=http://127.0.0.1:57270`、传 `http://localhost:5175`，`.tmp/r94-tester-keyboard.log`），跑完已 `git checkout -- shots/round-05/`，`git status` 无截图残留。
- UNVERIFIED：① 真实中文 IME 与本轮无关、未跑；② 真 WebView2 宿主与原生打印未跑（本轮为 UI 页签/宽度，浏览器态已覆盖）。
- 范围外（按计划）：5 档紧急度、批注状态机、`[AGENT]` 线程、快照/diff、Under Review、真实对话均未做，对话页签按计划只有空态 + 禁用输入。

## 6. 结论
A1/A2 验收标准全部有证据（命令/断言/截图路径如上），无门禁破、无验收造假、无回归 → **PASS**。BACKLOG B-221 标 `fixed`（对话内容等队列其余条留后续轮次）。
