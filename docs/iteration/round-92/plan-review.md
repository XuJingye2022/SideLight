# 第 92 轮计划审查（critic，revision 1）

**结论：REVISE。** 上一版 3 条 P1 + 3 条 P2 都已修掉；新发现 2 条 P1（A1 抢编辑器内复制粘贴、B1 偏移）+ 4 条 P2。

**已核对**：P1-1 已改成脚本现成口径（内部 WARN `measure-first-screen.mjs:73`、硬线 exit 1 `:80-82`），不设净增上限 ✓。P1-2 已有 armed + `(?<!\\)\$+` + 对照组；载入事务确带 `addToHistory:false`（`App.tsx:1201-1204`），源码往返也走 setMarkdown（`App.tsx:4651-4652`）✓。P1-3 空格触发已删、②补 `$a + b$` ✓。P2-1（`mathNodeView.ts:121,134` 有 `closeEdit`、`:375` destroy 已调它，可加计数）②③ ✓；P2-2/P2-3 ✓。

## P1-1（A1）A1 会抢编辑器内复制粘贴，`==/^/~` 的 mark 丢失

`inlineSyntax.ts:124` 三种 mark 渲染成 `<span class="sl-eq|sl-sup|sl-sub">`；编辑器内复制时 html 首子元素带 `data-pm-slice`、text/plain 走 `textBetween` 得纯文字（`prosemirror-view/dist/index.js:2867-2870`），`doPaste` 先调 `handlePaste`（`:3796-3798`）。A1 的等价判定把 span 连属性一起剥掉 → 两边都是「高亮」→ 命中 A1 → 按纯文本重解析，mark 消失（保存字节也变）。
**修**：`pasteCandidate` 见 `html.includes('data-pm-slice')` 直接 false（编辑器内复制交 PM 自己的 slice）；或带 `class=`/`data-*` 的 span/div 视为结构、不放行。验收加一例：复制含 `==高亮==` 与 `^上标^` 的段落粘回 → `.sl-eq`/`.sl-sup` 各 1、保存字节不变。

## P1-2（B1）`collectPairs` 的偏移在含 atom/`<br>` 的段落里错位

B1 只写「`textBetween`+`$from.start()`」。`Fragment.textBetween` 对非文本叶子没给 leafText 时贡献空串（`prosemirror-model/dist/index.js:117-124`）；`linkInput.ts:22-23,109` 的既有写法用 `'\ufffc'` 占位。段落里已有行内公式/图片/硬换行时，后面对的位置少 N，`replaceWith` 会改到旁边文字（空段落验收抓不到）。
**修**：入参写死 `parent.textBetween(0, parent.content.size, null, '\ufffc')`；单测加「atom 在前、对在后」的替换区间断言。

## P2-1（B1 验收）③⑤ 的按键序列做不出目标文本

③ `$$`+←+`x`+→ 只能得行内 `$x$`，出不了 `$$x$$`；⑤ 只写了一个 `$`，`$5 到 $` 根本不存在。
**修**：块级 `$$$$`+←←+`x`+→；货币 `$$`+←+`5 到 `+→（末位空格让 `isMathBody` 假）；④ 也写死序列（`====`+←← / `^^`+← / `~~`+←）。

## P2-2（B1 ⑨）字节对照组是空操作

加载后文档不脏，`Ctrl+S` 走 `App.tsx:3488-3494`「没有改动，未写入」；含 `\$x\$` 的文档真写盘还会撞结构损失确认（`risk.ts:192-206`、`App.tsx:3505-3509`）。
**修**：先在无关段打一个字变脏 → 保存并点确认 → 从盘上读字节基线 → 点段落/按 → → 再 `Ctrl+S` → 比字节；否则「两次字节相同」恒真。

## P2-3（A1 机制）`insertContentAt` 有一条上加不了 `closeHistory`

`closeHistory(tr)` 是 `@tiptap/pm/history` 的 tr 函数（`prosemirror-history/dist/index.js:359`），`insertContentAt` 命令拿不到 tr（链式只能 `setMeta`）。
**修**：手写事务（`closeHistory(tr)` → 替换 → `setMeta('uiEvent','paste')` → 落选区 → dispatch）；E2E 把「粘贴前历史为空」写进步骤。

## P2-4（B1 armed）粘贴填内容永不转换

arm 排除 `paste`/`drop`，而 `$$`+← 后 pair 为空、不 arm；于是 `$$`+←+粘贴内容+→ 不转（「后填」最常见的输入）。
**修**：粘贴/拖入落在已 armed 区间内部时保留 armed（或对已有 pair 内的插入补 arm），加一条 e2e。

**另外（不单列）**：`==/^/~` 的开关要接线（`DelimiterPair.configure({ isEnabled: () => inlineSyntaxRef.current })`，照 `App.tsx:1194-1196`）；`'leave'` 的「距光标 ≤1」与「点击远处段落」口径矛盾（二者取一）；B1+B2（状态机 + 3 触发 + ≥18 单测 + 9 条 E2E）在一个 25 分钟执行窗里偏大，建议 blur 触发或三类 mark 挪后。
