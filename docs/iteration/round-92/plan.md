# 第 92 轮两轮计划（用户缺陷 1/2）· revision 1

> revision 1：按 `plan-review.md` 修掉 3 条 P1 + 3 条 P2；范围不变。

读码：`@tiptap/markdown` 无 paste → 只走 `App.tsx:1096` `handlePaste`（入口 `:1184-1209`）。

## 共同约束
- 环境：dev 5175 不重启、CDP 9222 不可用（真机 ego **57270**）；E2E `.tmp/e2e-r92-*.mjs`；门禁每轮末 `verify`+`test`+`roundtrip`。
- 体积（P1-1）：按 `scripts/measure-first-screen.mjs` 现成口径——内部 310,000 只 WARN（`:73`）、硬线 320,000 exit 1（`:81`）。基线 309,804 B；**不设净增上限**，净增如实写 `test.md`；不加惰性 `import()`（丢粘贴事务）、不为省字节改设计、不写无实测的猜测。
- 红线同 BRIEF；节点/mark 名与 `mathReveal` 判据不变。

## A 轮（粘贴 Markdown｜缺陷 1）

### A1 纯文本 Markdown 粘贴解析（P1）
文件：新 `src/lib/markdownPaste.ts`；`App.tsx:1096-1102`（改 `(view, event)`）；`insertImageRef` 分支不动。
- 纯函数：`looksLikeMarkdown`（块：标题/列表/引用/围栏/`---`/表；行内四种）；`pasteCandidate({text,html,fileCount})`（files>0、>200,000 字符 → 否；`text/html` 仅在 `plainTextOfHtml(html)` 与 `text` 折空白后相等时放行——P2-2：只剥 `p`/`div`/`span`、`br`→空格，余标签留字面、解实体）；`pastePlan(json,{inTextblock,inTable})` → `inline|blocks|literal`。
- `handlePaste`：图片分支在前；`pasteCandidate` 否或代码守卫（`spec.code`/`code` mark）→ `false`；解析链同 `setMarkdown:1196-1199`（含 `$` 先 `ensureKatex()`），异常 → `false`；`preventDefault()`+`insertContentAt`（事务设 `uiEvent:'paste'`；inline 用 paragraph.content、blocks 用 doc.content；表格遇块级 → `false`）；`closeHistory`（`@tiptap/pm/history`）独立撤销；返回 `true`。
- 验收 `.tmp/e2e-r92-a1-paste.mjs`（派发 `ClipboardEvent('paste')`）：粘 `# 标题\n- a\n**粗体** [链接](https://e.com) \`code\`` → h1/li/strong/a/code 各 1、无字面 `#`/`**`；围栏内 `**不粗**` → strong 0；纯文本一句 → 段数不变；`$x^2$` → inline 1；P2-2：`<p>**粗体**</p>`+同文 → strong 1；P2-3：中段粘两段 → 拆三段不丢原文、列表项内多块 → `pageerror` 0（结构变化记 `test.md`）；`Ctrl+Z` 一次回全文。UNVERIFIED：合成事件被拒改 `Input.insertText`。

### A2 A1 的测试与门禁
文件：新 `src/lib/markdownPaste.test.ts`；`package.json` test 链尾。
- 单测：`looksLikeMarkdown` 8 正/5 负（`价格 $5 到 $`）；`pasteCandidate` 5（图片/超长/等价/`<b>` 拒/`<p>` 过）；`pastePlan` 3；`MarkdownManager` 2；门禁 `npm test`（56 文件）+`verify`（记净增）+`roundtrip`。
- 风险：多块粘贴留尾随空段；列表项内 inline 合并位置。

## B 轮（已存定界符对后填｜缺陷 2）
delta（10 min）：复跑 A1/A2 与 E2E。

### B1 已存定界符对的就地转换（P1）
文件：新 `src/lib/delimiterPair.ts`（照 `linkInput.ts`）；`App.tsx:1008-1018` 挂 `DelimiterPairInput`；复用 `mathInput.ts:42`、`inlineSyntax.ts:192` `pasteMatches`、`math.ts:8` `isMathBody`。
- 判定（纯函数）：`collectPairs(text, offset, {inlineSyntax})` → `{kind,from,to,contentFrom,contentTo,content}`；入参写死当前 textblock 的 `textBetween`+`$from.start()`（P2-1③）。`$` 扫 `(?<!\\)\$+`（P1-2）：run=1 行内对（非空、无换行、`isMathBody`）；run≥2 整段 `^\s*\$\$(.+?)\$\$\s*$`。`==`/`^`/`~` 用 `pasteMatches`（定界符长=长度差/2，非整数或开关关 → 跳过）。
- `armed`（P1-2）：插件 `state` 记 `{from,to}[]`；`apply` 先 `tr.mapping.map` 前进；`addToHistory:false` 载入清空不 arm；`docChanged` 且 `uiEvent` 非 `paste`/`drop` 时只 arm 与本次插入区间相交的对（`step.from` 映射后+`slice.size`）；再只留与当前 `collectPairs` 重合的项，上限 64。`commitPair(pairs, armed, caret, {trigger})`：只认 armed 且距光标 ≤1；`'leave'` 须 `!docChanged` 且 caret 在区间外；`'enter'`/`'blur'` 允许对内。
- 触发（P1-3，删空格）：① 光标离开（含 →/End/点击）；② Enter（`props.handleKeyDown` 判完返回 `false` 放行；空内容不提交，`$$`+Enter 仍归 `MathInputRules`）；③ blur（`spec.view` 挂 DOM 监听后 dispatch）。打字中一律不提交。
- 插件：`appendTransaction` 跳过 `trs.some(tr=>tr.getMeta('appendedTransaction'))`（P2-1②）、本插件 meta、`isMathEditing()`（P2-1①：`storage.draft` 恒 false → `mathNodeView.ts` 导出模块计数，`enter`/`closeEdit` 增减）、`composing`、非空选区、`spec.code`、code mark。一次事务：公式 `replaceWith`+行内 `mathInputSelection`／块级 `TextSelection.near`（先过 `inTableAncestry`）；mark 类先删后侧再删前侧、`addMark`、光标落内容尾。
- 验收 `.tmp/e2e-r92-b1-pair.mjs`（`[data-type=…]`）：① `$$`→←→`E=mc^2`→→ ⇒ inline 1、无 `$`；② `$$`→←→`a + b`（含空格不转）→→ ⇒ inline 1、latex=`a + b`、0 `$`、`Ctrl+Z` 一步回字面；③ `$$`→←→`x`→→ ⇒ block 1、原段消失；④ `==`/`^`/`~` ⇒ `.sl-eq`/`.sl-sup`/`.sl-sub` 各 1；⑤ `$`→←→`5 到 `→→ ⇒ math 0、字面 `$5 到 $`；⑥ 空内容/围栏/行内代码 → 不转；⑦ `Ctrl+Z` 回前态；⑧ 重开字节不变；⑨（P1-2）`\$x\$`+字面 `$x$` 先 `Ctrl+S` 取基线 → 点段落、按 → → math/`.sl-eq` 0、字节同。
- 风险：多行 `$$\n…\n$$` 跨段不转（记缺口）；先单测再真机。

### B2 B1 的测试与门禁
文件：新 `src/lib/delimiterPair.test.ts`（照 `mathInput.test.ts` 的 Schema+事务）。
- 单测 ≥18：`collectPairs` 6（五类/偏移）、负例 3、`==` 开关 2、`commitPair` 4（armed/未 armed/`docChanged`/对内）、armed 4（载入/`paste`/mapping/段落替换）、插件级 4（一条事务/撤销/代码守卫/appended）、serialize 3；门禁同 A2、57 文件。
- 风险：光标落 atom 会露 `$…$`（须走 `mathInputSelection`）。
