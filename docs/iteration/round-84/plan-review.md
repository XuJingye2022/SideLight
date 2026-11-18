# 第 84 轮计划审查（critic）— rev.2 复审：**REVISE**

实测基线（HEAD `5760913`）：`npm test` 链 **47** 个 test 文件、`markInputRule -- src` **0**、`appendTransaction -- src` **0**、`inlineSyntax.ts` 的 `addInputRules` **0**（对照 `taskListInput.ts:19`）。计划行号（`App.tsx:958`/`:1019`/`:1031`/`:5184`、`smartTyping.ts:79-82`/`:166-169`）全中。

## 上版 6 条核对
- **H1 已修**：A3 换行内语法输入规则、撤回「3 条回归已全修」、硬门 ⑥ 在、B-135 材料交下一批（计划 3/21-23/25 行）。
- **H2 形式已修**：`old===new` + 3 负向（10 行 ①/④、验收 ②）——但与下面 P1 冲突。
- **H3 已修**：三道门作废，A3 ③改 47 文件、合计改「依赖 22 键不变 + `git diff` 只多 test 链两行 + `git status --short` 并集」（23/25 行）。
- **H4/H5/H6 已修**：串行同执行者写死；rich **7/9**、首存拦 **1/9**；A2 断读回文件字节、宽度量 `documentElement`。

## 漏洞（1 P1 + 3 P2）

1. **P1 A1 触发路径在默认设置下不成立**。打 `(` 自动配对把 `()` 写进文档、光标停中间（探针 `.tmp/r84-critic-smartinput.log`：`smartInput('[乙]','(','')` → `insert "()" caret1`），URL 逐键时光标前永不带 `)`；收尾 `)`/`]` 走 `src/lib/smartTyping.ts:79-82`/`:96-101` 的 skip，只 `setSelection`（`:166-169`、`:183`）→ 事务 `docChanged=false`。计划 10 行 ① 的「未改文档 → null」和「`old===new` → null」恰好排除这唯一带完整语法的值，`linkInput.ts` 又没挂 `handleTextInput` → B-124 主路径不修，验收 ⑦ 必红（关自动配对才绿=假绿）。**修法**：触发点放真按键路径——`src/App.tsx:1031` 的 `editorProps.handleTextInput`（EditorView 直连 props，先于所有插件 props）或 smartTyping 的 link-dest skip 分支里，判 `text===')'`、下一字符是 `)`、`lineBefore+')'` 命中链接形状，一次 dispatch 里 addMark 并越过自动补的 `)`；`docChanged` 判据改成「本次事务里候选区间文本变过」（保留 H2 的 `old===new`）。文件表补 `src/lib/smartTyping.ts`（或 App 该段）。匹配语义可复用 `@tiptap/extension-link/dist/index.js:240-262` 的 `markdownLinkInputRule`（title/转义/代码段/`isAllowedUri`；默认关，`:361 markdownLinks:false`），但开它**不解决**触发。

2. **P2 A1 第三负向口径没写死**：旧字面链接（磁盘 `\[乙\](u)`、正文 `[乙](u)`）把光标放到 `)` 前插 `x` → 新 `[乙](ux)`；`old='[乙](u'` 非完整匹配、`old!==new`、insertedLength 1<7 → 转成真 link，存盘丢 `\[`。修法：加「本次插入字符必须是 `)`」守卫，或把该负例写死为「插在链接之后」。

3. **P2 A1 的 undo/redo 出口**：删掉 `)` 再 `Ctrl+Z`，docChanged=true、insertedLength=1、old=`[乙](u` → 也转。修法：限定 `trs.length===1`、单步 ReplaceStep、插入串是 `)`。

4. **P2 用户第 3 条仍无真机证据**：B-159 只留 UNVERIFIED 几何，而 ego CDP 54280 可用（`findings-ui.md:3`）、A3 本要开浏览器。修法：A3 浏览器门顺手量 `.katex-display` 的左右 `margin` 与居中/宽度，一条断言收口。

## 通过项
- 红线未破：0 新依赖、Tiptap 内核不动、A3 不加文件（47 自洽）、串行同一执行者、不 push/不改 `release/`。
- **A3 可行**：三键不经过 smartTyping（`smartInput('==红','=','')` 等全 null），输入规则插件按扩展顺序先于 smartTyping 注册（`@tiptap/core/dist/index.js:5686-5696`；marks 在 `App.tsx:1008`、smartTyping 在 `:1014`）；函数式 finder 的 `{index,text,replaceWith}` 合法（`index.js:5135-5148`）。
- **A1 schema 前提成立**：StarterKit 默认收 Link（`starter-kit/dist/index.js:46-48`），Link 有 `title`（`extension-link/dist/index.js:395`）→ `09` 夹具 `[乙](u "标题")` 可逐字节往返，rich 7/9 非空头。

修法都已写死，可原地改计划后直接进执行，不必再开一轮审查。
