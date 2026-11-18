# 第 79 轮 A 轮计划（P2 清账第 1 批：3 条）· revision 1

> 按 `plan-review.md` 3×P1 + 3×P2 修订；不新增任务、不扩范围；仍单轮 A（3 任务），不补 B 轮。3 条全 P2；B-157（P0 **open**）不属本批（B-158/B-159 已 `fixed`、真机 UNVERIFIED）；无浏览器时报告写「B-157 仍 open + 原因」。

- startSha `39a147b8b638a1d7192fc011cd6d0c699686758b`（=HEAD）；0.32.1；不 push、不改 `release/`、不加依赖。报告 `docs/iteration/round-79/`，日志 `.tmp/r79-*`。
- 执行序 A2 → A3 → A1；25 分钟不够时 A1 只交单测 + 静态。环境：CDP 9222–9226 无监听；真机只试 1 次 ego 页（`ego_status`/`.tmp/r78-cdp-probe.mjs`），连不上用单测/`npm run verify`/静态断言并记 UNVERIFIED；E2E 前 `node .tmp/reset.mjs <端口>`，结尾 `browser.close(); process.exit(0)`。

## A1（B-161，编辑）`==a**b**c==` 露出时定界符按文本节点重复

证据：`inlineSyntax.ts:116` 切 3 文本节点；`mathReveal.ts:159-165` 一区间 1 条 `Decoration.inline`；PM 逐文本节点包 span，`styles.css:858-871` 伪元素逐 span 画 = 6 个 `==`（静态推断）。

1. `decorateEqReveal` 每区间改发 2 条 `Decoration.widget`（`from` 侧 −1、`to` 侧 +1），`makeDom` 造 `<span class="sl-eq-delim" contenteditable="false" aria-hidden="true">==</span>`；`collectEqRanges` 等不动。
2. CSS：`:856-871` 四条伪元素规则换一条 `.doc-body .sl-eq-delim{color:var(--ink-faint);font-family:var(--font-mono);font-size:.92em}`；print `:2541-2546` 删两条 `sl-eq-revealed`（公式两条留 `none`），加 `.doc-body .sl-eq-delim{display:none}`。
3. 测试：`mathReveal.test.ts:175-196` 改断「2 条 widget + 0 条 `sl-eq-revealed`」，加 3 文本节点仍 2；`mathStyle.test.ts:97` 加 `sl-eq-delim`，`:123`/`:125` 改 7/7（公式 6+1），`:152-161` 改 2 条 `none` + delim `none`。
4. `mathReveal.ts:21` 注释同改，否则静态门不归零。

验收：
- `npm test`（两文件绿；基线 45 文件 578 条，记实测）、`npm run verify`（gzip ≤310,000 B）、`npm run roundtrip`。
- 静态门：`Get-ChildItem src -Recurse -File | Select-String 'sl-eq-revealed'` 改前 **12 行**（`styles.css:858,859,865,869,2543,2544`；`mathReveal.ts:21,163`；`mathReveal.test.ts:188`；`mathStyle.test.ts:97,109,110`）→ 改后 **0**；`docs/` 与 `.tmp/` 排除；另断 `mathReveal.ts` 的 `Decoration\.widget` ≥2。
- 真机 `.tmp/e2e-r79-a1-eq-delim.mjs`：先 `localStorage.clear()` 载入 `前 ==a**b**c== 后`，断 `.sl-eq` ≥1；`Home`+`→→` 后 delim 2、段 `innerText` 的 `==` 2、夹住 `a`/`c`；`Ctrl+S` 后 `eq.md` 逐字节含原文且无 `sl-eq`；`emulateMedia('print')` 后 delim `none`、`.sl-eq` 可见。截图 `shots/round-79/eq-delim.png`。
- 无浏览器：三段记 UNVERIFIED，只交单测 + 0 命中门。
- 过期脚本（报告写明、不重跑）：`.tmp/` 下 r74-b2:25,111-128、r74-b3:45、r74-tester:41、r78-a3-print:40,49 都读 `.sl-eq-revealed`；r78 打印证据属历史，用 print 段替代；**禁止重跑 r78 写回 `shots/round-78/`**。
- 收口：BACKLOG 加 B-161（`open`；证据「静态推断 + PM 源码 + 单测」，真机 UNVERIFIED），不得写 `fixed`。
- 风险：widget 不进 doc/序列化（字节必验）；`side` 防撞序；print 改后 `mathStyle.test.ts` 必红，须同批改。

## A2（B-134，P2 导出）HTML 导出丢目录、字面 `[TOC]`——复核 + 真机复验

已复核：第 76 轮已修——`App.tsx:4822-4826` 接 `applyExportTocHtml(buildExportToc(...))`；`export.ts:33,110`、`:258-276` 有 `nav.sl-toc`；`export.test.ts` 6 条。旧证据在 HEAD 都假 → 过期发现，不重写。

1. 真机 `.tmp/e2e-r79-a2-export-toc.mjs`（复制 r76-a1，**删截图**）：`<nav class="sl-toc"` 1、`literalToc` false、2 个 `<h1 id="sl-toc-k">`、`href` 2、点第 2 条 `#sl-toc-1`。
2. **门槛项 B-157（P0 open）**：同页 ① 含 `$\alpha$` 文档点行内公式 → 等 `.math-inline-input` → `Esc` → 250 ms 后 `.sl-math-reveal` 0、atom `::after` `none`、`.katex` 可见、段文本无 `\alpha`；② 段尾打 `$x^2$` → atom +1、`.sl-math-reveal` 0、无 `$x^2$` 字面。两条都过写「两项过，交 tester 判 verified」；否则「仍 open + 原因」。
3. 无浏览器：`node --experimental-strip-types src/lib/export.test.ts` 绿；`Select-String src/lib/export.ts -Pattern 'buildExportToc|applyExportTocHtml'` ≥2、`App.tsx` 的 `applyExportTocHtml` 1（未回滚）。
- 收口：`BACKLOG.md:83` B-134 补证据 + 真行号（`:4521`→`:4826`），留 `fixed`；真机过交 tester 判 `verified`。

## A3（B-110，P2 可访问性）批注卡动作钮高 22 px

`src/styles.css:1394-1398` 的 `.note-actions button` 加 `min-height: 24px`；`padding`/`font-size`/`.stats-trigger`（`:1931`）/斜体 `I`/基础 `button` 规则不动。
- 真机 `.tmp/e2e-r79-a3-note-actions.mjs`（照 r66-audit2 批注段）：种子 `.sidelight/annotations/ui.json`（`:25`）`kind:'evaluation'`；只量 `.note-actions button` 期望 **3**（知道了/追问/联网核对，`MarginRail.tsx:161-186`；disabled 仍有尺寸），`.rail-head button` 不计；断 h≥24、宽不缩、卡片 `scrollWidth-clientWidth` 0、0 错误；出 revision 卡记夹具失败。截图 `shots/round-79/note-actions.png`。
- 无浏览器：`.note-actions button` 块含 `min-height: 24px`（改前该块 0；全文件 4 处对照 `:1931,2288,2439`+`:1600`；改后 5，新增在 `:1394-1398`）；`npm run verify` 记 gzip。
- 收口：**B-110 留 `open`**，补证据并写剩余两项（斜体 `I` 21×24、`.stats-trigger` 22×24），不得写 `fixed`。
- 风险：卡片 +2 px、rail 滚动量微增（不判失败）；文字顶偏再加 `display:inline-flex`。

## 门禁与边界

- 每任务收尾 `npm test`（基线 45/578）+ `npm run verify`；A1 另 `npm run roundtrip`。截图 ≤2。
- 不跑 `acceptance`/`data-safety`（过期）与 `keyboard`/`fidelity`（覆盖 `shots/round-05|10/`）；收工 `git status` 只应有本轮报告、BACKLOG 行、`.tmp`。
