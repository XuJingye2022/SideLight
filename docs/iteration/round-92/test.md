# 第 92 轮 A 轮独立验收（tester）

只验 A 轮：A1 纯文本 Markdown 粘贴解析、A2 其单测与门禁。未读 `impl.md`，未用 impl 脚本断言。
轮前 startSha `e51567f8402d42e1294960155e146fe3916ec92e`；本轮 commit 后 head 见 `git rev-parse HEAD`（≠ 轮前）。

## 结论：PASS

## 门禁（各跑一次）

- `npm run verify` **PASS**：首屏 gzip **310,767 B**（基线 309,804 → **净增 +963 B**）；距内部预算 310,000 **超 767 B（只 WARN，exit 0）**，距硬线 320,000 余 9,233 B。主 chunk `index-zznwWwCW.js` 958,678 / gzip 300,972 B。
- `npm test` **56 文件 0 fail**（`package.json` test 链 `node --experimental-strip-types` 计数 56）；新链尾 `markdownPaste.test.ts` 单跑 24 条全过（含 8 正 / 5 负、`pasteCandidate` 6、`pastePlan` 3、`MarkdownManager` 2）。
- `npm run roundtrip`：rich **7/9** + source **9/9**、firstSaveBlocked 1/9，与第 91 轮同（`docs/roundtrip-report.md` 无 diff）。

## A1 真机（自写 `.tmp/e2e-r92-tester-a1.mjs`，ego CDP 57270，9222 不可用；`node .tmp/reset.mjs 57270` 先跑）

**19/19 PASS，0 pageerror / 0 console error**，证据 `.tmp/r92-tester-e2e.json`，截图 `shots/round-92/a1-tester-paste.png`。
派发合成 `ClipboardEvent('paste')`（DataTransfer 带 `text/plain`；P2-2 一条另带 `text/html`）。

| 计划项 | 断言 | 实测 |
| :--- | :--- | :--- |
| ① 块级 | h1/li/strong/a/code 各 1、无字面 `# `/`**` | 1/1/1/1/1，innerText `标题 ␤ a ␤ 粗体 链接 code`，顶层 `h1,ul,p`；`defaultPrevented=true` |
| ② 围栏 | 整段围栏 → `pre` 1、strong 0；光标进 `pre` 再粘 `**粗体**` → strong 0、字面留 | 1/0；0 且字面在（`spec.code` 守卫） |
| ③ 纯文本 | 段数不变、无结构 | 1→1、strong/li/pre/h1 全 0 |
| ③b 负例 | `价格 $5 到 $ 与 $10` → 不转公式、字面 `$` 留 | inlineMath 0、字面在 |
| ④ 公式 | `$x^2$` → inline 1、latex `x^2`、无字面 `$` | 1、`x^2`、无 |
| ⑤ P2-2 | `<p>**粗体**</p>`+同文 → strong 1、无 `**` | 1、无 |
| ⑤b 对照 | 单行 `**粗体**` → 行内、段数 1 | strong 1、p 1 |
| ⑥ P2-3 段中 | 粘两段 → 3 段、前文/一段/二段/后文都在 | 3 段、原文齐、strong 1 |
| ⑥b P2-3 列表 | 列表项内粘 `# 标题\n\n段落` → pageerror 0、文字不丢 | 0 错误；**结构变化**：`top=["ul","p"]`，li 1（原列表保住「项目内容」），标题/段落升到顶层（列表被拆开，按计划只记录） |
| ⑦ 撤销 | `Ctrl+Z` 一次回全文 | h1/li/strong 归 0、正文空 |

排雷（不是本轮回归）：`a * b * c` / `text *emph* text` 粘贴出 `<em>`，一度像 A1 误判。查证：页面内 `import('/src/lib/markdownPaste.ts')` 复核 `looksLikeMarkdown` 与 `pasteCandidate` 均 **false**（A1 不接管）；`em` 来自 **Tiptap Italic 自带 `markPasteRule`**（`node_modules/@tiptap/extension-italic/dist/index.js` 的 `starPasteRegex`），是既有行为，与本轮 diff 无关。`defaultPrevented` 也不能判「谁接管」（PM 默认链同样 preventDefault）。

## 回归（1 条既有脚本，副本 `.tmp/r92-tester-regress-paste.mjs`，不改旧证据路径）

第 86 轮粘贴脚本副本 **30/30 PASS，0 pageerror / 0 console error**：手打/粘贴 `==红== ^上^ ~下~` 1/1/1、两对 2、四条负向 0、`~~删除线~~` strike 1 且 sub 0；围栏内与行内代码内 mark 0 且落盘 = 基线 + 字面；导出页三条样式；批注卡键盘。证据 `.tmp/r92-tester-regress-paste.json`。

## 文档与池

- `BACKLOG.md` **无对应行可标**：本轮是用户缺陷（plan 未给 B 号；`粘贴|paste` 在 BACKLOG 只命中已 fixed 的 B-215/B-106/B-124/B-220），故未新增/改状态，避免私占 B 号。
- CHANGELOG：`Unreleased` 标题区间 **29–91 → 29–92**（`changelog.test.ts` 机械门要求），加第 92 轮一条。

## UNVERIFIED

- 真实键盘 `Ctrl+V`/系统剪贴板未走（只派发合成 `ClipboardEvent`，Chrome 合成事件带自造 DataTransfer）；真实中文 IME、真 FSA 文件夹、真 WebView2 宿主未跑。
- 表格单元格内粘贴（`pastePlan` 的 `inTable` 分支）只有单测 3 条，本轮未真机验。
- 1 MB 级粘贴（`MAX_PASTE_CHARS` 上限）只有单测；未做浏览器实测。
