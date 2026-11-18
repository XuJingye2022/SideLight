# 第 86 轮计划（单轮 3 任务 = 本批 3 条）· revision 1

> 修订 1（最多 1 次）：处理 plan-review 的 P1-1/P1-2/P2-1/P2-2；任务、文件、范围不变。
> **P1-1 不成立**：core `:5459-5489` 里 code_block 的 text 子节点确被 `nodesBetween` 访问，但 `contentSize = node.content?.size ?? node.nodeSize` 对文本节点是 **0**，`resolvedFrom >= resolvedTo`（`:5465`）提前 return，matcher/handler 都不跑（复刻探针 `.tmp/r86-rev-probe6.mjs`：围栏内唯一回调 `contentSize:0/entered:false`）。行内代码由既有 code mark 的 `excluded` 守卫挡住（`:8272-8274`，探针 `codeGuard:true`）。故不弃 `markPasteRule`、不自写 code 守卫；critic 要的行为改成**先测后改的硬门**，只有硬门红才走 A1 退路。原「paste runner 自带跳过 spec.code」换成上述三级机制；`excludes:'code'` 不当守卫（删除发生在守卫之后，且会挤掉 code mark）。
> P1-2 → A1 步骤 1 ②；P2-1 → 任务门槛写 delta，共用定 51 文件 ≥656；P2-2 → A1=B-215、A2=B-216。

HEAD `8b0c1f5`（=startSha）；dev 5175；CDP 9222 连不上就单测/构建/静态检查记 UNVERIFIED，不反复重试。基线 50 文件 641 条；首屏以本轮 `npm run verify` 为准（内部 310 KB）。

## A1（P1 / B-215）行内语法：粘贴也出 mark
- backlog：**B-215**。**若改前探针显示粘贴 `==红==` 本来已出 `.sl-eq`（无实证缺口），A1 降 P2、写理由、不实现。**
- 已核：输入规则早在 HEAD（`inlineSyntax.ts:56-78`、`:128-135`；`App.tsx:969`；第 84 轮真机打字 1/1/1）。粘贴**无规则**：`git grep -nE 'addPasteRules|markPasteRule' -- src` exit 1；`App.tsx:1111` 的 `handlePaste` 只收图片。
- 步骤
  1. 探针 `.tmp/e2e-r86-a1-input.mjs`（夹具 `.tmp/r51-fsa.mjs` 的 `installFakeWorkspace`/`openFolder`，空文档）：① `page.keyboard.type` → 1/1/1（对照）；② **阳性对照（P1-2）**：空段落开头合成粘贴 `**粗**`（bold 正则要行首/空白；合成法照 `.tmp/e2e-r29-typora.mjs:149-154`）→ 断言 `strong` ≥1 **且** 粘贴文本进 `doc.textContent`；两条都过才把 ③ 的 0/0/0 记为改前基线，否则停并另报；③ 粘 `==红== 与 ^上^ 与 ~下~` → 改前 0/0/0；④ 围栏内粘 `==红==`、行内代码内粘 `^上^` → 记改前字节与 mark 数；⑤ `Input.insertText` 只记录。① 不 1 或 ② 不过 → 停并另报（insertText 的 0/0/0 是已知伪影）。② 合成事件不进文本就改真粘贴：`navigator.clipboard.writeText` + `Control+V`（必要时 grantPermissions），对照仍是 `**粗**`。
  2. `inlineSyntax.ts`：`SyntaxSpec` 加全局 `pasted` 正则（守卫同 `typed`、去 `$`；`~` 留 `(?!~)`/`(?<!~)`）；导出 `pasteMatches(kind, text)` 回全部不重叠 `{index,text,replaceWith}`（无命中回 `[]`；`new RegExp(源,'g')` 或 `matchAll`，不留 `lastIndex`）；`addPasteRules()` 用 `markPasteRule({find: t => isEnabled() ? pasteMatches(spec.kind, t) : [], type: this.type})`（从 `@tiptap/core` 引入，无新依赖）。
  3. `inlineSyntax.test.ts` 30 → **≥36**：单对、一行两对、`a == b`、`====`、`\==a==`、`~~删除线~~`、`2^10`；typed 与 pasted 两个入口都断 `{index,text,replaceWith}`。
- 验收：单文件 ≥36 条 0 fail；`npm test` 0 fail（文件/总条数按「共用」门槛，不按单任务总数判红）；`npm run verify`；`npm run roundtrip`。静态 `git grep -c addPasteRules -- src/lib/inlineSyntax.ts` 0→1、`git grep -c markPasteRule -- src` 0→≥1。真机：打字 1/1/1；粘 `==红== 与 ^上^ 与 ~下~` → `.sl-eq/.sl-sup/.sl-sub` **1/1/1**；`==a== 与 ==b==` → **2**；负向（`a == b`、`====`、`\==a==`、`2^10`）→ 0；`~~删除线~~` → strike 1、`.sl-sub` 0；**硬门**：围栏内粘 `==红==`、行内代码内粘 `^上^` → `Ctrl+S` 落盘字节不变、`.sl-eq`/`.sl-sup` 0；普通段落粘 `==红==` → `.sl-eq` 1；0 错误。CDP 不可用 → UNVERIFIED。
- 风险：① 一条粘贴多对共用 `tr` 映射（markPasteRule 走 `state.tr.mapping.map`，core `:5469-5474`），只成第一对就自写 handler 从右往左；② 粘贴段紧邻已有 `=`（`x =` 后粘 `==红==`）时 finder 看不到前一字符 → 记残余，不作门槛；③ 退路（**仅当硬门红**）：弃 `markPasteRule`，改 `new PasteRule({find, handler})`，handler 先 `state.doc.resolve(range.from)` 逐层查 `type.spec.code`、再查 `$pos.marks()` 的 code，然后照 core `:8266-8279` 删定界符 + `addMark`；④ `insertText` 仍不转（UNVERIFIED）。

## A2（P2 / B-216）HTML 导出补三条行内语法样式
- backlog：**B-216**（原「暂记 B-215」，按 P2-2 顺延）
- 证据：`export.ts:191-295` 的 `STYLES` 无 `.sl-eq/.sl-sup/.sl-sub`，`git grep -c sl-eq -- src/lib/export.ts` = 0（exit 1）。类名见 `inlineSyntax.ts:52-78`，导出链 `App.tsx:4986-4988`。样式源 `styles.css:850-881`；`--mark-bg` 浅 `#f0e0bd`（`:16`）/深 `#453618`（`:53`）/打印 `#f0e0bd`（`:2580`）。
- 步骤：① `STYLES` 补 `.sl-eq{background:#f0e0bd;padding:0 1px;border-radius:2px}`、`.sl-sup{font-size:.75em;line-height:0;position:relative;vertical-align:baseline;top:-.5em}`、`.sl-sub{…bottom:-.25em}`；深色块 `.sl-eq{background:#453618}`；打印块 `.sl-eq{background:#f0e0bd}`。② `export.test.ts` 27 → **≥30**：三条规则按块断声明；漂移门（读 `src/styles.css`，照 `mathStyle.test.ts:16-37`）断 `.sl-eq` 背景 = `:root --mark-bg`、深色 = 深色值、sup/sub 五项 = `.doc-body .sl-sup/.sl-sub` 同值。
- 验收：单文件 ≥30 条 0 fail；`npm test` 0 fail（见「共用」）；`npm run verify`。静态 `git grep -c sl-eq -- src/lib/export.ts` 0→≥2、`sl-sup`/`sl-sub` 各 ≥1（对照 `nav.sl-toc` = 3）。真机（照 `.tmp/e2e-r79-a2-export-toc.mjs` 拦 `createObjectURL`）：导出串三类 class 各 ≥1 且三条规则在；导出页 `.sl-eq` 计算背景 `rgb(240, 224, 189)`、`.sl-sup` fontSize < body 且 top 为负。CDP 不可用 → UNVERIFIED。
- 风险：`<mark>` 仍 UA 黄底，记残余。

## A3（P2 / B-141）批注卡可聚焦 + Enter 跳句
- backlog：B-141
- 证据：`MarginRail.tsx:110-118` 的 `article.note` 无 `tabIndex`/`role`/`aria-label`/`onKeyDown`；`App.tsx:6109-6115` 的 `onFocusNote` 只 `setTextSelection`+`scrollIntoView`，不 `focus()`；焦点环继承全局 `:focus-visible`（`styles.css:188-191`，`--focus-ring` = `2px solid`，`:26`）。
- 步骤：① 新 `src/lib/noteA11y.ts`：`noteAriaLabel(index, {kind, quote, note})` → 「第 N 处 修订/评价：「引文」」（去换行、>20 字加「…」、空引文退回 note 首句）；`noteJumpKey({key, target, currentTarget, defaultPrevented})` 只认 Enter 且 `target === currentTarget`。② `MarginRail.tsx`：`article` 加 `tabIndex={0}`、`role="group"`、`aria-label`、`onKeyDown`（命中 → `preventDefault()` + 新 prop `onJumpToNote`）。③ `App.tsx`：`onJumpToNote` = 同选区 + `scrollIntoView` + `setActiveId`，**仅 `viewMode === 'edit'`** 时 `editor.commands.focus()`；`focus()` 若清选区就先 `focus()` 再 `setTextSelection`。④ `noteA11y.test.ts` ≥6 条，`package.json` test 链尾挂上（**文件数 50 → 51**）。
- 验收：新文件 ≥6/6；`npm test` 0 fail（见「共用」）；`npm run verify`。静态 `git grep -c tabIndex -- src/components/MarginRail.tsx` 0→1、`git grep -c 'role="group"' -- src/components/MarginRail.tsx` 0→1（对照 `Outline.tsx`）。真机（`.tmp/e2e-r86-a3-note.mjs`，夹具照 `.tmp/e2e-r79-a3-note-actions.mjs` 注入 `.sidelight/annotations/ui.json`）：`card.focus()` 后 activeElement 是卡片（改前 BUTTON）；真实 Tab 落卡且 `outlineStyle:solid`/`outlineWidth:2px`；`aria-label` 含「第 1 处」+引文前 8 字；Enter 后 activeElement=`.ProseMirror:not(.preview-pane)` 且选区文字 = 引文；焦点在「追问」上按 Enter 不改正文选区；源码态 Enter 不夺 `textarea.source-editor` 焦点；0 错误。CDP 不可用 → UNVERIFIED。
- 风险：每卡多 1 个 Tab 站（本任务要求）。

## 共用
- 集成门槛（P2-1 定稿）：三任务合并后 `npm test` **51 文件 ≥656 条 0 fail** = 641 + A1 ≥6 + A2 ≥3 + A3 ≥6（review 的 653 漏了 A2 的 3 条）。单任务只看本任务 floor（A1 30→≥36、A2 27→≥30、A3 新文件 ≥6），**不按总条数判红**；先合 A3 再验 A1 不假红。
- 根代理集成：审 diff、跑 `npm test`/`npm run verify`，A1 加 `roundtrip`；不 push、不改 `release/`，版本 0.32.1；BACKLOG/CHANGELOG/README/STATE 交 scribe（A1/A2 新建 B-215/B-216，证据栏写「改前/改后探针 + 阳性对照」；A3 改 B-141 状态）。
