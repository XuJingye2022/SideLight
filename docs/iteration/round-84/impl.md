# 第 84 轮 impl（executor）

环境：HEAD `5760913`；CDP 9222–9226 无监听，真机走 ego CDP 54280。串行 A3→A2→A1。

## A3 B-214 行内语法手打不渲染（fixed）

- `src/lib/inlineSyntax.ts`：`SyntaxSpec` 加尾锚定 `typed`（`~` 另加 `(?!~)`/`(?<!~)`）、新 `typedMatch(kind,text)`、`syntaxMark` 加 `addInputRules()`（`markInputRule`）、`inlineSyntaxMarks(isEnabled)`；`App.tsx:958` 传 `() => inlineSyntaxRef.current`。
- `inlineSyntax.test.ts` 20→**30** 条：`==红==`/`甲==乙==`/`x^上^`/`H~2~`/`~a~ ~b~` 命中；`====`/`== a ==`/`a == b`/`2^10`/`\==a==`/`~~删除线~~`/关态不命中；三枚 mark 各 1 条规则、`eqEscaped` 无。
- 真机 15/15（`.tmp/e2e-r84-a3-a1.mjs`、`r84-impl-a3-a1-after.json`）：手打 `.sl-eq/.sl-sup/.sl-sub` **1/1/1**；`Ctrl+S` 落盘 `==红== 与 ^上^ 与 ~下~\n` 逐字节、无 `sl-eq` 类名。静态 `addInputRules` 0→1、`markInputRule` 0→5。

## A2 B-142 撤销入口被下条通知顶掉（fixed）

- 新 `src/lib/restoreEntry.ts`（`nextRestoreEntry` 五事件 + `restoreLabel`）+ 测试 **10** 条。
- `App.tsx`：独立 `restoreEntry` + ref；抽 `restoreDeleted()` 供 toast 与 chip 共用；删除置 `deleted`；新建/重命名/开文件夹清；保存提示、打字、`refreshTree` 不清。
- `StatusBar.tsx` + `styles.css:1957` 区：`.status-restore`（`已删除 b.md`+撤销+×，`min-width:0`+省略号、两钮 24×24）。
- 计划漏洞：`trash.ts` 的 `restoreDocumentFromTrash` 第 2 参放宽为 `Pick<…,'name'|'path'>`，行为不变。
- 真机 15/15（`.tmp/e2e-r84-a2-restore.mjs`、`r84-impl-a2-restore-after.json`）：删 b.md → toast+chip 同在；打字 `Ctrl+S` 后 toast 变「已保存 a.md」而 chip 仍在、撤销钮 36×24 可点；点 chip → 树回 b.md、chip 消失、**读回字节 `# 乙\n\n乙篇正文。脏Q\n` = 删除前脏正文**；再删→新建→chip 消失；1000×620 溢出 **0/0**、钮 36×24 与 24×24。
- 静态：`restoreDeleted` 4 处、`.status-restore` StatusBar/styles 4/5。

## A1 B-124 手打链接保存成字面文本（fixed）

- 新 `src/lib/linkInput.ts`：`typedLink`+`linkInputPlugin`（`appendTransaction`）+`LinkInput`，`App.tsx` 扩展数组末尾注册；测试 **16** 条含 3 负向（点段尾/整段粘贴/旧字面链接插字）。- 触发点：收尾 `)` 走 `smartTyping` 的 `skip`（`docChanged=false`），输入规则收不到 → 判「光标前进 1 位 + 光标前是 `)`」。计划 ① 的「未改文档→null」与 skip 互斥，改成 `insertedLength===1`+`old!==new`。
- 新夹具 `09-link-title.md`：roundtrip rich **7/9**、source **9/9**、首存拦 **1/9**；两探针字节一致（`.tmp/r84-impl-a1-probe.mjs`/`.log`）。
- 真机（同上 15/15）：正文 1 链接（href/title 对）；`Ctrl+S` 落盘 `[乙](https://example.com "标题")\n` 无 `\[`；点段尾再存「没有改动，未写入。」；负向文档（磁盘 `\[乙\](url)`）点段尾不出「乙」链接、字节不变。
- 用户第 3 条：`$$\frac{a}{b}=c$$` 实测 `.katex-display` 576 px 满列、公式墨迹左右留白各 **264.72 px**、`margin:0`（B-159 值）。

## 门禁

`tsc` **0**；`npm test` **49 文件 637 条 0 fail**（`.tmp/r84-impl-npm-test.log`）；`verify` gzip **306,003 B**；`roundtrip` 7/9、9/9、1/9。截图 `shots/round-84/inline-syntax-typed.png`、`status-restore-chip-1000x620.png`；0 pageerror（404 全是脚本 mock 的 `/__doc`）。

## CHANGELOG 一行建议

- 行内语法三枚符号手打即渲染；手打 Markdown 链接保存不再转义方括号；删除后的「撤销」常驻状态栏。

## 新踩坑

1. `installFakeWorkspace(page, seeds)` 收**扁平**文件表（不是 `{files: seeds}`）；传错时 `Ctrl+S` 落到「未命名.md」。
2. `markInputRule` 的 finder 必须返回 `replaceWith`（它取 `match[match.length-1]` 当内容），缺了规则静默空转。
3. Tiptap Link 的 autolink 把字面链接里的裸 URL 包成 `<a>`：判「旧字面链接没提升」要按「文字是乙的 `<a>`」计数。
