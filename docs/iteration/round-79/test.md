# 第 79 轮 A 轮 独立验收（tester）

判据：本批 3 任务验收标准。未读 `impl.md`，只看 `git diff`、`BACKLOG.md`、代码与运行结果。
环境：dev `http://localhost:5175`（200）；CDP 9222–9226 未探（环境说明记不可用），真机走 ego-browser CDP 54280（第 77/78 轮同环境），一次连上。真机前核 dev server 交付字节：`/src/styles.css?x=79tester` 含 `sl-eq-delim` 4、`sl-eq-revealed` 0；`/src/lib/mathReveal.ts` 含 `Decoration.widget` 2 → 非 Vite 旧缓存。

## 门禁（本机实跑）

- `npm test`：**45 文件 579 条 0 fail**（基线 45/578；A1 新增 1 条）；`mathReveal.test.ts`、`mathStyle.test.ts` 全绿。`.tmp/r79-tester-npm-test.log`
- `npm run verify`：`PASS`；首屏 gzip **303,914 B**（预算 310,000，余 6,086）。`.tmp/r79-tester-verify.log`
- `npm run roundtrip`：rich **6/8**、source **8/8**（04 首次保存拦截 2，与 HEAD 同）。`.tmp/r79-tester-roundtrip.log`

## 静态门

- `sl-eq-revealed`：HEAD **12 行**（mathReveal.ts 2 / styles.css 6 / mathReveal.test.ts 1 / mathStyle.test.ts 3）→ 现 **0**。
- `mathReveal.ts` 的 `Decoration.widget` 0 → **3**（2 调用 `:186-187` + 1 注释 `:23`）；`.sl-eq-delim` 屏幕规则 `styles.css:860-865`、print 隐藏 `:2544` 附近。
- `.note-actions button`（`styles.css:1388-1395`）含 `min-height: 24px`（`:1391`）；全文件 `min-height: 24px` HEAD **3 → 4**（验收文写 4→5，口径不符，实质条件成立）。
- A2 接线：`export.ts:33` `buildExportToc`、`:110` `applyExportTocHtml`；`App.tsx:4826` 调用（`applyExportTocHtml` 共 2 处：`:4793` import + `:4826` 调用）；`App.tsx:4822-4826` 与 BACKLOG 真行号一致（`:4521` 已核正）。

## 真机（自写脚本，非 impl 脚本）

A1 `.tmp/r79-tester-e2e.mjs` + `.tmp/r79-tester-a1-cont.mjs`（JSON 同名，日志同名 `.log`）：
- 载入 `前 ==a**b**c== 后`（`localStorage.clear()` 后重载）：`.sl-eq` **3**（a/b/c 三个独立 mark）、`.sl-eq-delim` **0**。
- 点段 → `Home` → `→`×2：delim 恰 **2**、文本均 `==`、两枚之间 Range **`abc`**、段可见 `==` 恰 2、旧类 **0**；3 个 mark 及后代 `::before/::after` 全 `none`；DOM 顺序 **D M M M D**。
- `Ctrl+S`（假 FSA）：落盘 **28 B = 原文 27 + 1 个「改」**，去掉该字逐字节等于原文；含 `==a**b**c==`；无 `sl-eq`/`contenteditable`/`aria-hidden`。
- `emulateMedia('print')`：2 枚 delim `display:none`、`.sl-eq` 可见（inline 高 25）；切回 screen 恢复 inline。截图 `shots/round-79/eq-delim.png`（画面即 `前 ==abc== 后`）。

A2 导出 HTML **3,788 B**：`<nav class="sl-toc"` 恰 1、无字面 `[TOC]`、2 个 `<h1 id="sl-toc-k">`（0=第一章/1=第二章）、`href` 2、`nav.sl-toc {` 在；导出页点第 2 条 → `#sl-toc-1`、目标「第二章」。
B-157 ① 点 `$\alpha$` 等 `.math-inline-input`（1）→ Esc：面板关、`.sl-math-reveal` **0**、atom `::after` `none`、`.katex` inline、段文本无 `\alpha`；② 段尾手打 `$x^2$`：atom **1→2**、reveal **0**、无 `$x^2$` 字面。

A3（种子 `.sidelight/annotations/ui.json`，`kind:'evaluation'`）：`.note-actions button` 恰 **3**（知道了 54×24 / 追问 42×24 / 联网核对 66×24，计算 `min-height:24px`），宽度不变、卡片 `scrollWidth-clientWidth` 0、0 revision 卡、0 页面错误。对照：注入 `min-height:0 !important` → **22/22/22**（改前值），撤掉 → **24**，证明高度来自本轮新规则。截图 `shots/round-79/note-actions.png`；`.rail-head button` 只记录（隐藏 0×0）不计门槛。

## 回归

- `scripts/annotation-flow.mjs`（`SIDELIGHT_CDP=54280`、`SIDELIGHT_URL=5175`，`.tmp/r79-tester-annotation-flow.log`）：纯函数 **5/5**；浏览器 route 段 **0/3**——脚本假设首启有示例文档，现首启为空白 `未命名.md`，`Ctrl+A` 无选区故不发请求（**脚本过期**）。同路径诊断（`.tmp/r79-tester-anno-diag.mjs`：先打字再 `Ctrl+A`+`Ctrl+Enter`）：stub 命中 2 次、cards **1→1 不翻倍**、overall **1**、unresolved **1** → 脚本原意全成立，非本轮回归。跑完 `git checkout -- shots/round-26/` 已还原 1 张被覆盖截图。
- 另覆盖：`npm test` 全量、roundtrip、本轮 A1/A2/A3 真机（公式、TOC、导出、批注卡）。

## 过期脚本（不重跑）

`.tmp/` 下 `r74-b2:25,111-128`、`r74-b3:45`、`r74-tester:41`、`r78-a3-print:40,49` 仍读 `.sl-eq-revealed`（类名已删，跑必红）；`r78-a3-print` 会写 `shots/round-78/`，禁止重跑；r78 打印证据只作历史。

## UNVERIFIED

原生打印预览/另存 PDF（只切 print 媒体）；「改前渲染 6 个 `==`」无改前真机快照（改后 DOM 已证 3 mark + 2 delim + 0 伪元素）；真实 FSA/中文 IME/WebView2 宿主。

## 判定

**PASS**。BACKLOG：B-161 `fixed`、B-134 `fixed`（补 tester 证据）、B-157 `fixed`（两条门槛项独立通过）、B-110 仍 `open`（剩斜体 `I`、`.stats-trigger`）。
