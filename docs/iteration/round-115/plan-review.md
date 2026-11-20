# 第 115 轮计划审查（critic，revision 1）— PASS

上轮 H1–H4 与 P2-3 逐条照单修掉；改后计划可复现、体积口径自洽。只剩 2 条 P2 提示，不阻塞执行。

## 已核实（本轮实读/实跑）

- 工作区：HEAD `ad2cd11`，`git status` 只 `?? docs/iteration/round-115/`；`src/App.tsx:5886-5893` 仍是 `main#editor` 的 `onKeyDownCapture`，`MarginRail` `:6000`、`</main>` `:6094`。
- 静态门基线与计划一致：`git grep -nF 'view.dom.contains' -- src` exit 1（0 行）、`git grep -nF 'editor.isDestroyed' -- src` exit 1；对照 `git grep -nF 'editor.view.dom' -- src` 1 行（`App.tsx:4108`）。
- 基线数字与第 114 轮 tester 记录逐项相等：门 **315,464**、`MarginRail-*.js` gzip9 **7,337**、合计 **322,801**、`npm test` **62 文件 892 条**（`docs/iteration/round-114/test.md:10-11,37`）。315,464+96=315,560 ≤ `--max 315600`。
- 验收 2/3 的 Tab 序列成立：`.rail-diff-open`→`.rail-review-open`→`#rail-tab-notes`（roving `tabIndex`，`MarginRail.tsx:467`）；空文档批注面板只有 `.rail-empty`（无控件），`rail-overall-head` 仅在 `overall.length>0` 渲染（`:709`），隐藏的对话面板被跳过；`</main>` 后 toast 未触发、`.analyze-bubble` 需非空选区（`App.tsx:6129`），`StatusBar` 首个 `<button>` 就是 `.stats-trigger`（`StatusBar.tsx:56-67`）。
- 对话路末两枚是 `.rail-chat-send`/`.rail-chat-generate`（`MarginRail.tsx:800/803`，填字后 enabled），其后无控件。
- H3 的守卫顺序在依赖里成立：`@tiptap/core/dist/index.js:6784-6803` 无 `editorView` 时 `view` 是 Proxy、取 `.dom` 抛；`get isDestroyed()`（`:7100-7102`）在 `editorView` 缺省时返回 **true**。所以「先判 `isDestroyed` 再取 `view.dom`」不会踩 Proxy。
- 备选落点引用正确：`.doc-column` 在 `App.tsx:5993`；`.tmp/e2e-r93-probe10.mjs` 存在，from/to 取法可复用。

## H1–H4 收口

- H1：A1 步骤 1 改成「写脚本 → 在 `ad2cd11` 跑 before 存 JSON + 记 HEAD → 加守卫 → after」，与验收顺序不再冲突。
- H2：验收 4 先打字断言 `from>1` 再 `Ctrl+End`（空文档假对照已堵）；验收 5 先 `Ctrl+Home` 断言 `1/1`；`pre4`/`pre5` 进 JSON。
- H3：守卫先判 `isDestroyed`；R3 备选改 try/catch，并明确不碰 `.doc-body` / `.doc-column .ProseMirror`；验收 8 补 preview 态 Tab → 0 pageerror。
- H4：改为「硬线缺口 2,801+Δ 仍由 B-229 持有」，与 322,801 实测一致。
- P2-3：before 补了对话路（填「草稿」→ Tab → `A.skip-link`）。

## 遗留（P2，不阻塞）

- **P2-a 三处 Tab 的起手没写死**：验收 1/2/3/4 的「Tab×3」未写从哪个元素聚焦起步（`.rail-diff-open`），验收 4 的「重跑 2/3」也没写重填值。写脚本时按原起手补：先 `.focus()` `.rail-diff-open`；对话路先 `fill` 再 `.focus()` textarea。
- **P2-b 第三站前提没落成断言**：验收 2/3 断 `.stats-trigger` 之前先断 `.toast`/`.analyze-bubble` 为 0；否则提示条上的按钮会插队成第三站，读数假红。

## 范围

只 1 个 handler + 1 个 E2E + 文档；25 分钟可行；不触红线（不动 schema/序列化/批注/依赖/体积硬线）。
