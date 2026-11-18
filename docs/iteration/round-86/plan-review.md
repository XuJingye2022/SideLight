# 第 86 轮计划审查（critic，revision 1 复检）

- 结论：**PASS**（原 2 P1 + 2 P2 已收口；剩 3 条 P2 注记，不阻塞）。
- 范围：只审 A1（P1）；A2/A3 是 P2 不审，只核了共用门槛数字。
- HEAD = startSha `8b0c1f5`；工作树只有 `docs/iteration/round-86/` 未跟踪。
- 实测：test 链 50 文件；`inlineSyntax.test.ts` 30/30、`export.test.ts` 27/27 实跑 0 fail；CDP 9222 无监听（Test-NetConnection False）。

## 原 P1-1 不成立（已收口）

`@tiptap/core/dist/index.js:5462` 对 `spec.code` 先 return，围栏块整块跳过；文本子节点虽下降，但 `contentSize = node.content?.size ?? node.nodeSize` 对 TextNode 是 **0**（TextNode 走 `Fragment.empty`：`prosemirror-model/dist/index.js:1562`→`:1181`；`Fragment.empty = new Fragment([],0)`），`0 ?? …` 仍是 0 → `resolvedFrom >= resolvedTo`（`:5466`）提前 return，matcher/handler 都不跑。实跑 `.tmp/r86-rev-probe6.mjs`：围栏 text `contentSize:0/entered:false`，行内代码 `codeGuard:true`。上一版把 `content?.size` 的 0 误当 nodeSize（旧探针 `.tmp/r86-critic-paste-code.mjs` 只枚举访问，没模拟 `:5463-5466`）。保留 `markPasteRule` 正确，不需自写 code 守卫；行内代码由 code mark `excludes:"_"`（`extension-code:64`）经 `:8273-8275` 挡住。

## 原 P1-2 已收口

步骤 1 ② 有 `**粗**` 阳性对照（`strong`≥1 且文本进 `doc.textContent`），不过就停/改真剪贴板。路径已核：paste 事务必带 `uiEvent:"paste"`（`prosemirror-view/dist/index.js:3805`），tiptap 才进规则（`core:5584-5586`）；`App.tsx:1113` 非图片 return false 不截胡；round-29 同法实测进过 HTML（`docs/iteration/round-29/findings-typora.md:31`）。

## 原 P2-1 / P2-2 已收口

任务门槛改 delta（A1 30→≥36、A2 27→≥30、A3 新文件 ≥6），共用 51 文件 ≥656 = 641+6+3+6，与「先合 A3 再验 A1」自洽；A1=B-215、A2=B-216，BACKLOG 无重号（现最高 B-214）。

## 仍存（P2，执行时照改）

- P2-3：硬门「`Ctrl+S` 落盘字节不变」不能按字面执行（粘贴本来就新增字符）。改成：落盘 = 粘贴前字节 + 粘贴串（逐字节），`==红==` 四字符都在且长度 +4；围栏/行内代码段 `.sl-eq`/`.sl-sup` = 0。
- P2-4：范围要写清——本编辑器内复制再粘时 HTML 带 `data-pm-slice`，`isPastedFromProseMirror` 为 true（`core:5580`）→ `isPaste` 为 false（`:5586`），paste 规则整条不跑。本修复只覆盖外部纯文本与 `Ctrl+Shift+V`；BACKLOG 证据栏别声称覆盖内部复制。
- P2-5：CDP 9222 现无监听，浏览器硬门本轮大概率 UNVERIFIED。执行时重跑 `.tmp/r86-rev-probe6.mjs` 并把输出写进 `impl.md`；BACKLOG 证据分「代码级已验 / 浏览器 UNVERIFIED」两段，别只写「硬门通过」。
- 小误：行号偏 1（`:5465`→`:5466`、`:8272-8274`→`:8273-8275`）。

## 顺带核实

`git grep -nE 'addPasteRules|markPasteRule' -- src` exit 1（0 命中）；`src/lib/export.ts` 的 `sl-eq` 0 命中（A2 前提成立）；同一次粘贴三规则可同跑（`prosemirror-state/dist/index.js:796-825` 后续插件仍收 `trs.slice(0)`，`[0]` 是 paste 事务；多命中共用累积 mapping，`core:16-45`）。
