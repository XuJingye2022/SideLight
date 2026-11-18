# 第 79 轮 A 轮实现报告（executor）

startSha `39a147b8`；未 commit；报告 `docs/iteration/round-79/`；日志 `.tmp/r79-*`。

## 任务状态

| 任务 | 状态 | 摘要 |
| :--- | :--- | :--- |
| A1 B-161 | DONE | `==` 露出定界符改 2 条 `Decoration.widget`（`.sl-eq-delim`），CSS/print/单测同批 |
| A2 B-134 | DONE（只复验） | HEAD 已修、无源码改动；真机导出 7/7 + B-157 两条门槛项均过 |
| A3 B-110 | DONE（部分修） | `.note-actions button` 加 `min-height:24px`；斜体 `I`、`.stats-trigger` 留 open |

## 改动文件（行号为改后）

- `src/lib/mathReveal.ts`：`eqDelimiterDom()`（:164）、`decorateEqReveal` 每区间 2 条 widget（:179-192）、注释（:21-26）
- `src/styles.css`：4 条伪元素规则换 `.doc-body .sl-eq-delim`（:860-865）；print 删 `sl-eq-revealed`、加 `.sl-eq-delim{display:none}`（:2544）；`.note-actions button` +`min-height:24px`（:1388-1395）
- `src/lib/mathReveal.test.ts`：断 2 条 widget 的 from/to/side，新增三文本节点仍 2 枚（10 条）
- `src/lib/mathStyle.test.ts`：屏幕 10/8→7/7；print 公式定界符 4→2 `content:none` + delim `display:none`（4 条）
- `docs/iteration/BACKLOG.md`：新增 B-161（open）；B-134 真行号 `:4521`→`:4822-4826`；B-110/B-157 补证据
- 新脚本 `.tmp/e2e-r79-a{1,2,3}-*.mjs`

## 门禁（实测）

- `npx tsc --noEmit` exit 0
- `npm test` **45 文件 579 条 0 fail**（基线 578，+1 为新测）；单跑 mathReveal 10/10、mathStyle 4/4
- `npm run verify` **gzip 303,914 B**（≤310,000；raw 984,838）
- `npm run roundtrip` rich 6/8（04/06 已知 diff）、source 8/8，exit 0
- 静态门：`sl-eq-revealed` 改前 **12 行**→**0**；`mathReveal.ts` 的 `Decoration.widget` 0→**3**
- A3 静态：块内有 `min-height:24px`；全文件 min-height 3→4、`height: 24px` 口径 4→5

## 真机（ego 浏览器 CDP 54280；9222–9226 无监听）

- A1 `.tmp/e2e-r79-a1-eq-delim.mjs` **17/17**（`.tmp/r79-a1-eq-delim.json`）：`.sl-eq` 3；Home+→→ 后 `.sl-eq-delim` 恰 2、两枚之间 `abc`、段内 `==` 2 次、旧类 0；`Ctrl+S` 落盘逐字节 = 原文+「改」且无 `sl-eq`；print delim `none`、`.sl-eq` 可见，切回恢复；0 pageerror；截图 `shots/round-79/eq-delim.png`
- A2 `.tmp/e2e-r79-a2-export-toc.mjs` **16/16**（`.tmp/r79-a2-export-toc.json`）：导出 `<nav class="sl-toc"` 1、`literalToc` false、`<h1 id="sl-toc-k">` 2、`href` 2；导出页点第 2 条 → `#sl-toc-1`「第二章」；B-157：点 `$\alpha$`→Esc 后 `.sl-math-reveal` 0、`::after` none、`.katex` inline、可见无 `\alpha`；手打 `$x^2$` atom 1→2、reveal 0、无字面
- A3 改前 6/7（54×22/42×22/66×22，`.tmp/r79-a3-note-actions-before.json`）→ 改后 **7/7**（54×24/42×24/66×24，宽度不变、卡片溢出 0、0 pageerror，`...-after.json`）；截图 `shots/round-79/note-actions.png`

## 过期脚本（不重跑）

r74-b2-eq（:25、:109-128）、r74-b3-reveal、r74-tester*、r78-a3-print（:40、:49-53）仍读 `.sl-eq-revealed`/伪元素，HEAD 已过期；不重跑、未写回 `shots/round-78/`，print 项由 A1 脚本替代。

## CHANGELOG 建议一行

`==a**b**c==` 的露出定界符改成两枚 widget（多段高亮不再重复画 `==`，B-161）；批注卡动作钮补 24 px 最小高度（B-110）。

## 新踩坑（3 条）

1. 保存后光标在文末，`.sl-eq-delim` 已撤（露出依赖选区）；量 print 前必须点回高亮再 Home+→→，否则 0 假红（A1 首跑 14/16）。
2. `Decoration` 的 `type`/`widget` 在 d.ts 标 `@internal`：单测要 `as unknown as { type: { side } }` 才过 `tsc`。
3. `==a**b**c==` 的 `.sl-eq` 是 3 个 span（strong 切开 mark），门槛断 ≥1，别断 ==1。

## UNVERIFIED

- 原生打印预览 / 另存 PDF（只切 print 媒体）
- B-161 / B-134 / B-157 / B-110 最终状态交 tester 判
- E2E 走 ego 浏览器 54280，未按 CDP 9222–9226 跑
