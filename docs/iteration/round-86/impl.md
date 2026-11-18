# 第 86 轮 A 批实现记录

HEAD 起点 `8b0c1f5`（未 commit）；CDP 9222–9226 无监听，真机走 ego-browser CDP 54280。**3 任务全 DONE**。

## A1（P1 / B-215）行内语法粘贴出 mark — DONE
- `src/lib/inlineSyntax.ts`：`SyntaxSpec` 加 `pasted`（与 `typed` 同守卫、不尾锚定）；新导出 `pasteMatches`（每次新建 `g` 正则，不留 `lastIndex`）；`syntaxMark` 加 `addPasteRules()` → `markPasteRule`，与输入规则共用开关闸门。无新依赖。
- `inlineSyntax.test.ts` 30 → **37**。
- 探针+真机 `.tmp/e2e-r86-a1-input.mjs`（先阳性对照：粘 `**粗**` 出 strong≥1 且文本进文档）：**改前** `.tmp/r86-a1-input-before.json` **19/23**（③④⑨ = 0/0/0，①②过 → 缺口成立）；**改后** `.tmp/r86-a1-input-after.json` **24/24**：③ 1/1/1 且 `Ctrl+S` 写回逐字节=原文；④ 两对 `.sl-eq` 2、写回 `==a== 与 ==b==`；⑤ 四负向 0 且字面保留；⑥ strike 1 / sub 0；⑦围栏、⑧行内代码 → mark 0 且落盘「去掉粘贴 4 字后=基线」；⑨ 普通段落 1。`Input.insertText` 只记录（eq=1，CDP 伪影）。
- 静态 `addPasteRules` 0→1；`markPasteRule` HEAD 0 命中 → `inlineSyntax.ts:4` 行。

## A2（P2 / B-216）HTML 导出补三条行内语法样式 — DONE
- `export.ts` 的 STYLES：`.sl-eq`（#f0e0bd + 内边距 + 圆角）、`.sl-sup` / `.sl-sub` 五项；深色块 #453618、打印块 #f0e0bd。
- `export.test.ts` 27 → **30**（按块断声明 + 漂移门）。
- 真机 `.tmp/e2e-r86-a2-export.mjs`（拦 `createObjectURL`）`.tmp/r86-a2-export.json` **9/9**：导出串三类 class 各 1、三条规则在、浅/深/打印底色齐；导出页 `.sl-eq` 背景 rgb(240,224,189)、圆角 2px、`.sl-sup` 12.75px < body 17px 且 top −6.375px、`.sl-sub` bottom −3.1875px。
- 静态 `sl-eq` 0→4 行、sup/sub 各 0→2（对照 `nav.sl-toc` 11）。

## A3（P2 / B-141）批注卡可聚焦 + Enter 跳句 — DONE
- 新 `src/lib/noteA11y.ts`（`noteAriaLabel` / `noteJumpKey`）+ `noteA11y.test.ts` **8/8**；`package.json` test 链尾挂上（**50→51** 文件）。
- `MarginRail.tsx:120-126`：`tabIndex={0}`、`role="group"`、`aria-label`、`onKeyDown` → 新 prop `onJumpToNote`；`App.tsx` 仅 `viewMode==='edit'` 才 `focus()` + `setTextSelection` + `scrollIntoView`。
- 真机 `.tmp/e2e-r86-a3-note.mjs`：**改前** **3/11**（tabIndex −1、role/label null、`focus()` 不动）；**改后** **11/11**（label「第 1 处 评价：「批注目标句子在这里」」、真实 Shift+Tab 落卡且 outline 2px solid、Enter → activeElement `.ProseMirror` 且选区=引文、焦点在「追问」上 Enter 不改选区、源码态派发 Enter 不夺 textarea 焦点）。
- 静态 `tabIndex` 0→1、`role="group"` 0→1。
- 残余：正向 Tab 从正文到不了侧栏（`App.tsx:1093-1101` 缩进吃掉 + `:5963-5970` 文首回环），真实键盘路径是状态栏 Shift+Tab。

## 门禁（最终态）
- `npx tsc --noEmit`：exit 0
- `npm test`：**51 文件 659 条 0 fail**（基线 50/641；+7/+3/+8）`.tmp/r86-a-npm-test2.log`
- `npm run verify`：PASS，首屏 gzip **306,276 B**（310,000 / 320,000）
- `npm run roundtrip`：rich 7/9、source 9/9、firstSaveBlocked 1/9（同第 84 轮基线）

截图 1 张：`shots/round-86/note-card-focus.png`。

## CHANGELOG 一行建议
粘贴 `==红==` / `^上^` / `~下~` 也出 mark（围栏与行内代码内保字面）；HTML 导出补三条行内语法样式；页边批注卡可 Tab 聚焦并按 Enter 跳到正文那句（B-215 / B-216 / B-141）。

## 新踩坑
1. `STYLES` 模板串的注释里不能写反引号：会提前截断模板串，报 `Expected a semicolon`（错误指向 CSS 正文）。
2. 别用 PowerShell `Get-Content | -replace | Set-Content` 改带中文的 `.ts`：`export.test.ts` 52 行中文变乱码，只能 `git checkout --` 重来。
3. 正文里 Tab 被缩进吃掉、文首又回环 skip-link，到不了侧栏；测批注卡可达性用状态栏 Shift+Tab 反向进。
