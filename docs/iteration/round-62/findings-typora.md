# 第 62 轮 · Typora 对照（finder-typora）

- 时间：2026-11-18 09:15；HEAD `12f36e4`
- 环境：dev `http://localhost:5175`、CDP 9223（每步前 `node .tmp/reset.mjs 9223`）
- 脚本：`.tmp/e2e-r62-typora.mjs`、`.tmp/e2e-r62-toc-export.mjs`、`.tmp/e2e-r62-toc-typed.mjs`
- 截图（2 张）：`shots/round-62/toc-typed-in-open-doc.png`、`shots/round-62/toc-opened-with-toc.png`

## F1（P1，入池 B-133）已打开的非空文档里手打 `[TOC]`：不出目录，标记行也不收起

复现（`.tmp/e2e-r62-toc-typed.mjs`）：拖入 `note.md`（`# 甲章` + 正文，原文无 `[TOC]`）→ 末尾 `Enter` 后手打 `[TOC]` → 停 900 ms。

| 步骤 | nav.sl-toc | 目录项 | `[TOC]` 段 class / 高度 |
| :--- | :--- | :--- | :--- |
| 打开 `note.md` | 0 | 空 | 无该段 |
| 手打 `[TOC]` 后 | **0** | **空** | `""` / **33 px（字面可见）** |
| 打开原文含 `[TOC]` 的 `note2.md` | **1** | 甲章 | `toc-source` / 0 px（收起） |

同一份正文，只有「文件原文含 `[TOC]`」才出目录。两张截图即这对对照。

根因：`src/lib/tocRender.ts:130-134` 的转义守卫拿 `original`（`src/App.tsx:823` 传 `rawTextRef.current`）判「原文不含 `[TOC]` 就整体不挂」；`rawTextRef` 只在载入（`src/App.tsx:2301`）与保存成功（`:2962`）写，输入时不动。第 61 轮 B-130 只验收「载入即含 `[TOC]`」。Typora 的主流程正是输入 `[toc]` 回车（`.tmp/typora-ref/resources/Docs/Markdown Reference.md:189-191`）。

建议：守卫收窄为「原文**只有转义写法**才禁挂」（`:131` 加「原文确实含 `\[TOC\]`」条件），或把关口挪到随事务更新的当前 markdown；补 e2e：打开无标记文档 → 手打 → 目录出现、标记收起。

## F2（P2，入池 B-134）HTML 导出不带目录，`[TOC]` 以字面写进导出文件

`exportAs('html')` 用 `editor.getHTML()`（`src/App.tsx:4521`），目录是 `Decoration.widget`（`src/lib/tocRender.ts:143-150`），装饰不进 `getHTML()`。实测（拦 `URL.createObjectURL` 取 Blob）：导出 HTML 2,936 B，`<nav` 0 次、`sl-toc` 0 次、`[TOC]` 字面 1 次（`<p>[TOC]</p>`），两个 `<h1>` 都在；Typora 导出保留目录。

这同时把差距表 `docs/typora-gap.md:49` 的「导出/打印是否带目录未验证」判成「不带」，该单元格要改。打印未单独验（UNVERIFIED）。

## F3（P1，入池 B-135）代码围栏无语法高亮，差距表也没有这一行

实测（`.tmp/e2e-r62-typora.mjs`）：输入 ` ```js ` + 两行 JS 后，DOM 为 `<pre><code class="language-js">…</code></pre>`，**`span` 0 个、整块仅 1 种颜色 `rgb(29, 32, 35)`**；`package.json`/`src` 里词边界 `git grep -nEi '\b(highlight|prism|shiki|lowlight)\b'` 0 命中（exit 1），宽口径 15 全为 `eqHighlight`（`inlineSyntax.ts:18,45`）；依赖扫 `[]`。

Typora 用 CodeMirror 给 120+ 语言高亮（`.tmp/typora-ref/resources/Docs/Code Fences Language Support.md:1-133`）。差距表「已经有的」只写「代码块…有，编辑即时渲染」，「缺的（4）」无此行，差距被记成 0。建议补「代码块语言高亮 | 无 | P1」。

体积：首屏 gzip 300,727 B，距内部 310,000 B 余 9,273 B，须走惰性 chunk（同 KaTeX / Mermaid）；若加运行时依赖，按红线 6 需产品负责人批准并在 README 记体积。

## 差距表核对（不计入新条目）

- 计数自洽：`node -e` 实测「已经有的（39）」= 39 行；「缺的（4）」= 1 + 1 + 2 行，与子节相等。
- 需改 2 处：`:49` 见 F2；`:30` 导出只列 HTML/Markdown/纯文本/打印，缺 Word/Epub/LaTeX/图片 —— 与 P2 `B-111` 重复，不另计。
- 无需改：`:45` 全屏「宿主内未验」（本机 INIT-FAIL，仍成立）、`:41` 粘贴纯文本「宿主未验证」（同上）。

## 已在池，不重复计数

- `:smile:` / `:heart:` 仍字面、无补全弹层（缺表 P2 + `B-106`，状态不变）。
- `<img src="x.png" width="200">` 仍字面、真 `<img>` 0 个（「图片缩放」P2，状态不变）。
- `.ProseMirror` 带 `spellcheck="false"`：Typora 有拼写检查，中文场景影响小，未列条目。