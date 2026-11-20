# 第 132 轮计划审查（critic · rev 1 复审）

结论：**PASS**。rev 0 的 1 P1 + 2 P2 已全部落进 plan.md；新增仅 3 条 P2（执行时改断言 / 补记，不阻塞）。

## 上版漏洞（逐条核）
- **P1-1 ⑫ 假绿：已修**。A2 两相开局都 `clear` → `setItem(settings.v1,'{"autoSave":false}')` → reload（同 `.tmp/e2e-r131-modal-keys.mjs:217`，注释即「P1-1 夹具」）；`src/lib/settings.ts:134` 是 `autoSave: parsed.autoSave !== false`，无版本迁移，false 不会被翻回；⑫ 改「按前 write:a.md 0 且 dirty → 按后 ≥1、写入含「改」、dirty=false」。现在只有「Ctrl+S 被吞」能解释，假绿已堵。
- **P2-1 公式编辑框残余：已修**。A3 第 6 条写明行内 `input.sl-math-inline-input`（`mathNodeView.ts:311`）与块级 `textarea.sl-math-block-input` 仍在放行集内、Esc 后焦点落正文，本轮不收紧。行号对。
- **P2-2 体积事后数：已修**。A3 要求记「门 + MarginRail gzip9」事后数、对 316,096 的净增、对 320,000 的差、B-229 补数。

## 核过
- 轮前实测（我跑）：`measure --dir dist` gzip **316,096**（raw 1,025,471、headroom 3,904）；`MarginRail-C69PMDGs.js` gzip9 **7,880** → 合并 323,976；`--max 316800` 余 704。HEAD `c7b3134d` = startSha；`src/lib/*.test.ts` 67 → 68、943+5=948 自洽；dev 5175 200、CDP 57270 200（Edg 157）、`reset.mjs` 在。
- 插入点：`typing` 只 `:4645` 的 `?` 用；`:4652` `if (customId !== null)` 全文件唯一；`save` 是 8 条可改键之一（`keybindings.ts:26` `Ctrl+S`），`customId !== 'save'` 放行 Ctrl+S 成立；`productCombo` `:4528-4538` 覆盖 K/F/H/P/`/`/Shift+F。放行集：正文 keydown 目标在 contentEditable 内 → `closest('.ProseMirror')` 命中、`textarea.source-editor` 自匹配，串与 `FileTree.tsx:120` 逐字同；Esc（`:4540`）、F11（`:4627`）在守卫前，⑦ 与 Esc 链不受影响。
- ⑨⑩⑪ 可达：Ctrl+K 空选区会开浮层并聚焦（`App.tsx:5339-5347`）；源码态 Esc 由 FindBar 自收（`FindBar.tsx:71-75`）→ App `onClose` 的 `if (sourceMode) focusSourceEditor()`（`:5849-5854`、`:382`）。
- 红线：无依赖，不碰 schema / 序列化 / 批注 / 版本 / `release/` / CHANGELOG。

## 漏洞
- **P2-1 ⑨ 的 `.link-editor-input` 不是 1 是 2**：`LinkEditor.tsx:54`（链接文字）与 `:82`（链接地址）两个 input 同时渲染，空选区进入聚焦的是「链接地址」（`App.tsx:5345` 的 `focus: empty ? 'href' : 'text'`）。按 1 判会假红。修：断 2 且 activeElement 的 `aria-label === '链接地址'`，Esc 后 0。
- **P2-2 A3 有意行为漏项**：外置输入框里不再动作的还有 Ctrl+Alt+N、Ctrl+Alt+Shift+O、Ctrl+Shift+P、Ctrl+Shift+M、Ctrl+0–6（`:4530-4534`）。impl.md 与 B-263 证据句写全，否则下轮会被当回归。
- **P2-3 ⑫ 采样时机未写**：`__slState.dirty` 是 React 状态，打字后立刻读可能仍 false。修：打字后等 300–450 ms（同 r131 骨架 `wait(450)`）再读 write/dirty。

给 tester 一句：⑨⑩⑪ 是硬门（编辑器 / 源码框内产品键不许废）；「查找框内 Ctrl+F 无动作」是 A3 记录的有意行为，别判回归。
