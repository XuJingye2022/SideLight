# 第 83 轮计划（单轮 A，3 个任务）— revision 1

rev.1（planner-revision，按 plan-review 修 1 次）：
- P1-1：原 A1（B-122 复核）**砍成预检 2 行**（第 80 轮已 `verified`，复跑只要 1 条命令）；空出的槽位换 1 条 open P2 = **B-212**（纯文案 + 纯函数，静态与单测可验）。
- P1-2：用户点名的 3 条回归进 **A1**，逐条给单测路径与缺口归属。
- P2-3：A2 口径改「字节 / 二次解析后可见文本 / 覆盖节点数」三列。
- P2-4：补「roundtrip 不覆盖」的依据 + `getHTML()` span 检查；删 `markdownOptions` 退路（探针已走通）。
startSha `13cf1a3`（`git status` 只有本目录未跟踪）。dev 5175；rev.1 实测 9222–9226 与 54280 **无监听** → 浏览器项先跑一次 `node .tmp/reset.mjs 9222`，连不上就单测/静态并记 UNVERIFIED，不重试。日志 `.tmp/r83-*`，截图 ≤2。不 push、不改 `release/`、不加依赖、版本 0.32.1。

## 预检（不占任务槽位）

**用户 3 条回归**（rev.1 实跑 `node --experimental-strip-types <file>`）

| 用户反馈 | 定案 | 单测（实跑） | A1 要补的缺口 |
| :-- | :-- | :-- | :-- |
| 行内公式失效 | B-157 fixed | `mathInput.test.ts` 5/5、`mathReveal.test.ts` 10/10 | 第 79 轮真机已过（BACKLOG:13），本轮复核 |
| `==高亮==` 失效 | B-158 fixed | `settings.test.ts` 14/14 | 真机 `.sl-eq` 与 `Ctrl+S` 字节（BACKLOG:59 未验） |
| 行间公式不如 Typora | B-159 fixed | `mathStyle.test.ts` 4/4 | 规则实际在 `src/styles.css:2137-2141`（BACKLOG:60 记 `2119-2123` 已过期，更正）；浏览器几何未验 |

**B-122**：`mermaidLazy.ts:64-69`/`:100-107` 含 sepia 分支，`mermaidLazy.test.ts` 20/20，第 80 轮真机 fill `rgb(251,243,227)`（BACKLOG:78）→ 只复跑，不改代码。

**剩余 open P2 恰 10 条**：B-103/106/107/124/126/141/142/207/211/212（BACKLOG:68,71,72,106,79,111,112,104,108,109）。本轮取 **B-212**。

## A1 复核用户 3 条回归（预计 0 行产品改动）

文件：只读 §预检 4 个测试与 `src/styles.css:2137-2141`；新脚本 `.tmp/e2e-r83-a1-regress.mjs`。

1. 复跑三份单测（基线 5/10、14、4），贴 `tests/pass/fail` 行。
2. 浏览器可用时（只试一次）：夹具 `# 回归\n\n行内 $x^2$ 与 ==高亮== 结尾\n\n$$\na^2+b^2=c^2\n$$\n` 量三项——① 段可见文本无字面 `$`/`==`（`.sl-math-reveal`、`.sl-eq-delim` 都 0）；② `.sl-eq` ≥1，段尾打 1 字后 `Ctrl+S` 读回 = 原文 + 该字；③ `.katex-display` 的 computed `margin-left/right` = `0px`、`width` ≤ 容器宽、`min-width` = 容器宽。
3. 不可用：三项记 UNVERIFIED + 缺口归属（tester），不重试、不换端口连打。

验收：三份单测 0 fail；三项真机读数一致或 UNVERIFIED + 归属；**只有出现真回归才改必要行（≤1 文件）**，并在 impl.md 贴改前/改后读数。

## A2（新）`\=` 保存后变成真高亮：字节保真

文件：`src/lib/inlineSyntax.ts`、`inlineSyntax.test.ts`、`.tmp/r83-a2-eq-escape.mjs`（探针）、`.tmp/e2e-r83-a2-eq-escape.mjs`；`tilde.ts` 只核。

**改前三列**（`.tmp/r83-rev-before.ts` → `.tmp/r83-rev-before.log`，rev.1 已跑；字节列与 critic `.tmp/r83-critic-rows.ts` 逐行一致。执行者先原样复跑、贴全部 9 行，再改）

| case | 改前 first.out | 字节同 | 二次可见文本 | 二次 eq 节点 | 改后期望 |
| :-- | :-- | :-: | :-- | :-: | :-- |
| `\==a== 结尾` | `==a== 结尾` | ✗ | `a 结尾` | 1 | 字节同；可见 `==a== 结尾`；eq 0 |
| `\==**b**c==` | `==**b**c==` | ✗ | `bc` | 2 | 字节同；eq 0 |
| `\===a===` | `===a===` | ✗ | `===a===` | 0 | 字节同；eq 1，二次仍 1 |
| `a \== b` | `a == b` | ✗ | `a == b` | 0 | 字节同；eq 0 |
| `\== 单独` / `\=\=` / `x \=\= y` | 依次 `== 单独` / `==` / `x == y` | ✗ | 同左 | 0 | 字节同；eq 0 |
| `a == b` / `==a====b==` | 原样 | ✓ | 原样 | 0 | 不动 |

`\=` 的 `eq 2` 是**两个文本节点各带 1 个 eqHighlight**，不是一个高亮区段——断言按节点数读。

**实现（rev.1 已用 `.tmp/r83-rev-probe6.ts` 验过 9/9 字节同）**

1. 加 mark `eqEscaped`：`inclusive:false`；`addAttributes` 一个不落盘的 `slot`（`parseHTML:()=>null`、`renderHTML:()=>null`）——**必须有**：相邻 `\=` 在 `Fragment.fromArray` 里并成一个文本节点，无 slot 时 `\=\=` 写回 `\==`（`r83-rev-probe.ts` 实测丢 1 枚反斜杠）；`parseHTML:()=>[]`、`renderHTML` = `span.sl-eq-escaped`、`markdownTokenName:'eqEscaped'`、`parseMarkdown` = `helpers.applyMark(…, { slot: ++seq })`、`renderMarkdown` 返回 `'\\' + helpers.renderChildren(node.content ?? [])`（框架用 placeholder 求前缀，`node_modules/@tiptap/markdown/dist/index.js:1285-1319`；只返回 `'\\'` 会被判成空前缀、反斜杠全丢——probe3 实测）。
2. tokenizer：`start: src => { const at = src.search(/\\=/); return at < 0 ? src.length : at }`；匹配 `^\\=` → `{type:'eqEscaped', raw:'\\=', tokens:[{type:'text',raw:'=',text:'='}]}`。放进 `inlineSyntaxTokenizers()`，**不随开关关**（字节保真，不是快捷语法）。`markText` 计数退路不要（probe4 双写 `=`）。
3. `inlineSyntaxMarks()` 末位返回它（schema 常驻，`src/App.tsx:958`）；`escapes.ts` 不动。
4. 测试 14→20（+6）：①`\==a== 结尾\n` 字节同、eq 0；②`\==**b**c==\n` 同；③`\===a===\n` 字节同、eq 节点 1、二次仍 1；④`a \== b\n`、`\== 单独\n` 字节同；⑤`\=\=\n` 字节同且 eqEscaped 落 2 个文本节点；⑥开关关时 `\==a==\n` 字节同；另断行内代码 `` `\=` `` 不产生 mark。既有 14 条全过。
5. 探针与 App 同口径（StarterKit + inlineMarks + inlineSyntaxMarks + 表格/任务列表 + `escapeHtmlForParse` + `protectMathPairs` + `serializeDocumentBody`），输出三列 + `stable`。
6. 浏览器可用时：`esc.md`（`# 高亮\n\n\\==a== 结尾\n`）→ `.sl-eq` 0、可见含 `==a== 结尾`、`Ctrl+S` 逐字节同、重开再存仍同；对照 `hl.md`（`==高亮==`）`.sl-eq` 1；再断**编辑器 DOM / `getHTML()` 的 `.sl-eq-escaped` span 数 = `\=` 数**、可见文本不变（导出/预览路径，DOM-less 测不了）；0 pageerror。不可用记 UNVERIFIED。
7. roundtrip 不覆盖的依据：`scripts/roundtrip.mjs:30` 的 `EXTENSIONS` 只有 `inlineMarks`，不含任何 inlineSyntax marks（现有 3 个也没有）；新 mark 只由 `\=` token 产生，无 `\=` 文档字节不变由测试④⑥锁定。报告写这两句。

验收：
- `inlineSyntax.test.ts` 14→20 条 0 fail；`npm test` 46 文件 **591→597**（与 A3 同落则 601）条 0 fail。
- 探针 9 行 `bytesSame:true`、`stable:true`；改前 9 行原样贴出。
- 静态：`eqEscaped` 在 `inlineSyntax.ts` ≥3 处；`git grep -n 'eqEscaped' src` 改前 **0**、改后 >0。
- 浏览器可用时 6 项 PASS。

门禁：`npm test`、`npm run verify`（≤310,000 B，第 82 轮 304,307）、`npm run roundtrip`（rich 6/8、source 8/8 不变）。
风险：① `parseHTML:[]` 不进粘贴/HTML，不影响 `==` 渲染与快捷键；② `slot` 只防合并、`renderHTML` 返回 null 不落 DOM 属性；③ 若 `applyMark` 第三参不吃 attrs，停手记 UNVERIFIED 回报，不自造 schema 之外的状态。

## A3（P2 第 1 条）B-212：删除确认框两分支共用恢复说明

文件：`src/lib/deleteDialogText.ts`（新）、`deleteDialogText.test.ts`（新）、`src/components/TreeActions.tsx`（只改 `:287-293`）。

- 现状：脏分支提「撤销会一起搬回」，干净分支只提文件管理器、完全不提撤销；成功 toast 确实带「撤销」（`src/App.tsx:2976-2999`）。BACKLOG 记的 `App.tsx:2762-2771` 现已是 `refreshTree`，不是删除文案——本轮更正引用。
- 改法：新 lib 出 `DELETE_TRASH_DIR='.sidelight/trash/'`、`DELETE_RECOVER_TAIL='，不会当场永久删除。要恢复：删除后的提示里点「撤销」，或把 trash 里的文件移回原位。'`、`deleteDialogLead(dirty)`、`deleteDialogText(dirty)`；`TreeActions` 的 `.dialog-note` 两分支都渲染 `{lead}<code>{DELETE_TRASH_DIR}</code>{DELETE_RECOVER_TAIL}`，组件内不留第二份文案。

验收：
- 新单测 4 条：两分支都含「撤销」且恢复句逐字相同；路径只来自常量；dirty/clean 只差 lead；clean lead 含「移到这个文件夹的」。
- `npm test` 46→47 文件、**591→595**（与 A2 同落则 601）条 0 fail；`npm run verify` ≤310,000 B。
- 静态：`git grep -n '要恢复' -- src` 改前 **1**（`TreeActions.tsx:292`）、改后 **1**（`deleteDialogText.ts`）；`git grep -n '文件管理器' -- src` 改后 0。
- 浏览器可用时：干净/脏各开一次确认框，两分支 `.dialog-note` 都含「撤销」且恢复句相同；删后 toast 含「撤销」。不可用记 UNVERIFIED。

## 收口

执行者先贴三处改前读数（A2 九行三列、A3 两分支文案与 `git grep` 计数、A1 三份单测输出），再改再跑门禁；tester 独立复跑并自写脚本。BACKLOG/README/CHANGELOG 由批末 scribe 统一；只写 `docs/iteration/round-83/{plan,impl,test}.md` 与 `.tmp/r83-*`。B-212 落地后改 `fixed`；浏览器项若 UNVERIFIED，留待 tester 收口补真机。

> 篇幅：rev.1 约 9 KB，超 common.md 的 plan ≤6 KB——多出的部分是 plan-review P1-2/P2-3 要求的三列证据与第 3 个任务；九行改前表已压成 4 行 + 3 行合并，其余细节在 `.tmp/r83-rev-before.log`。
