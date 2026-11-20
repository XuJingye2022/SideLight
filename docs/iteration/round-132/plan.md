# 第 132 轮计划（revision 1 · 单轮 · B-263：「对话」输入框里 Ctrl+K / Ctrl+F 抢焦点）

范围：只改 App 级 window keydown 的产品键作用域（`src/App.tsx` 一处守卫 + 一条静态门）。编辑器 / 源码框里 Ctrl+K、Ctrl+F 不动；不碰 B-264、B-229、`MarginRail.tsx`、`styles.css`；不加依赖、不加截图。
revision 1 按 `plan-review.md` 修 P1-1（⑫ 假绿）、P2-1（公式编辑框残余）、P2-2（体积事后数），不加任务、不扩范围。

## 0 体积
现成 dist 实测：门 **316,096 B** gzip（raw 1,025,471、余 **3,904**；简报 312,423 是第 93 轮旧数）；chunk gzip9 **7,880**；合并 **323,976**（B-229 open）。净增 `App.tsx` 约 6 行（注释不入包，测试 / `package.json` 不进 dist）：**+100–220 B**，预计门 ≤316,3xx，验收线 `--max 316800`；事后数与归属见 A3-2。

## A1 修：产品键只在编辑器正文 / 源码框内放行
文件：`src/App.tsx`（`:4640-4652`）、`src/lib/appKeyScope.test.ts`（新 5 条静态门）、`package.json`（test 链）。
1. 根因：`:4641-4644` 的 `typing` 只给 `?` 用；`:4652` 起 8 条命令与 `:4695`/`:4700` 的 Ctrl+H/K 不看 target；右侧输入 `textarea.rail-chat-input`（`MarginRail.tsx:869`）。
2. `?` 块后、`if (customId !== null)`（`:4652`）前插（字面量固定）：
   `const foreignTyping = typing && !(target instanceof HTMLElement && target.closest('.ProseMirror, textarea.source-editor'))`
   `if (foreignTyping && customId !== 'save') { if (productCombo || customId !== null) event.preventDefault(); return }`
   同 `FileTree.tsx:120` 选择器串；保存（含改键 `save`）放行，其余产品键吞默认后不执行。
3. 口径（P2-1）：放行集＝`closest('.ProseMirror')`（含内嵌控件）＋`textarea.source-editor`；其余输入控件不响应产品键（保存例外）；公式编辑框残余见 A3-6，不收紧。不改 `typing`、`dialogOpen || railModal`（`:4635`）、Escape/F11 顺序、`MarginRail.tsx` / `styles.css`。
4. 静态门（先摘注释）：`const foreignTyping` 恰 1；选择器串与 `FileTree.tsx` 同；守卫在 `?` 块后、`customId` 分派前；守卫体含 `event.preventDefault()` 与 `return`；test 链含该测试。注释不写被断言字面量。
验收：`node --experimental-strip-types src/lib/appKeyScope.test.ts` 全绿；负向各删一处得 ≥1 红、拷回；`grep foreignTyping src/App.tsx` **2**（改前 0）。风险：`.ProseMirror` 是 contentEditable（`typing` 恒真），漏 closest 则正文 Ctrl+K/F 全废（A2 ⑨⑩⑪ 硬门）。

## A2 真机 before/after
文件：`.tmp/e2e-r132-chatkeys.mjs`（`--phase before|after`，共用 `.tmp/e2e-r131-modal-keys.mjs` 的 phase / 身份门 / 写 op / dirty / 关自动保存骨架与假 FSA；场景 ①–⑫ 重写）、`.tmp/r132-chatkeys-{before,after}.json`；截图零新增。
身份门：`fetch('/src/App.tsx')` 数 `foreignTyping`：before **0**、after **2**（含守卫使用）；不符 exit 3 + gate JSON、判 UNVERIFIED。before 用 `git stash push -- src/App.tsx`（记 SHA256、touch+reload；pop 后等值、stash 0）；不跑 `npm test`。
环境：ego 57270、`node .tmp/reset.mjs 57270`、1440×900、假 FSA + `a.md`。**两相开局都 `localStorage.clear()` → `setItem('sidelight.settings.v1','{"autoSave":false}')` → reload**（P1-1，同 `.tmp/e2e-r131-modal-keys.mjs:217`）；假 FSA 写记 `__vfs.ops`（`write:<path>`），正文 / `.sidelight/` 分计，`__vfs.files` 读回。
步骤：① 开 `a.md` → 点 `#rail-tab-chat` → 输入「测试指令」→ `Ctrl+K`；② `Ctrl+F`；③ `Ctrl+H`；④ `Ctrl+P`；⑤ `Ctrl+/`；⑥ `Ctrl+Shift+F`；⑦ 输入框 `Esc`；⑧ 回车（mock 回复）；⑨ 点 `.ProseMirror p` 停 250 ms → `Ctrl+K` → `Esc`；⑩ `Ctrl+F` → `Esc`；⑪ `Ctrl+/` 进源码 → 点 `textarea.source-editor` → `Ctrl+F` → `Esc`；⑫ `Ctrl+/` 回编辑（⑪ 后仍在源码态）→ 点末尾 `.ProseMirror p` + `Ctrl+End` 打「改」→ 回输入框 → 记 `write:a.md`（应 0）与 dirty（应 true）→ `Ctrl+S`。before 只跑 ①②（红即够），跑完 `Esc`×2 + reload 复位，③–⑫ 只记录不判。
验收（after 全绿；before ①② 必红）：①–⑥ 五选择器（`.link-editor-input`/`.find-input`/`.find-bar`/`.quick-open-input`/`.global-search-dialog`）0、焦点仍 `.rail-chat-input`、输入值与 `.ProseMirror` innerHTML 不变；⑦ Esc 后焦点仍输入框、无查找条；⑧ `.rail-chat-turn` 2（before 同绿）；⑨ `.link-editor-input` 1 且聚焦、Esc 后 0；⑩ `.find-bar` 1、焦点 `.find-input`、Esc 后 0 且焦点回 `.ProseMirror`；⑪ 源码态 `Ctrl+F` 仍开查找条、Esc 后焦点回 `textarea.source-editor`；⑫ **P1-1**：按前 `write:a.md` **0** 且 `dirty=true`，按后 **≥1**、`files.get('a.md')` 含「改」、`dirty=false`、焦点仍输入框、两浮层 0；`.sidelight/drafts/` 写只记不判。0 pageerror；两相 JSON 齐。

## A3 门禁、回归与收口
文件：`docs/iteration/round-132/impl.md`（≤4 KB）、`docs/iteration/BACKLOG.md`（B-263→`fixed` 带证据；**B-229 补本轮复测**）、`.tmp/r132-*.log`。
- `npm run build` exit 0；`node scripts/measure-first-screen.mjs --max 316800` 记 exit、gzip/raw/headroom（不写 `npm run verify -- --max`）；写明对 316,096 净增与对 320,000 的差。
- `node -e` 复测 `MarginRail-*.js` gzip9（预期仍 7,880）；合并＝门+chunk 记**事后数**（预期 ≈324,1xx）→ 写 impl.md 与 B-229 行「第 132 轮复测：门 = X、chunk = Y、合计 = Z（超线 N = Z − 320,000，仍 open）」；增量 ≈+100–220 B 归 B-229（P2-2）。
- `npm test`：68 文件、943+5=948 条 0 fail。回归：`$env:SIDELIGHT_CDP='http://127.0.0.1:57270'; node scripts/keyboard-acceptance.mjs http://localhost:5175` → **52/52**；跑完 `git checkout -- shots/round-05/`；红先判脚本口径。
- `git status --porcelain` 只允许 `src/App.tsx`、`src/lib/appKeyScope.test.ts`、`package.json`、`docs/iteration/BACKLOG.md`、`docs/iteration/round-132/`、`.tmp/`。不 push、不动 `release/` 与 `docs/CHANGELOG.md`。
- impl.md 必写：两条门命令原文与实测数；有意行为（外置输入框里 Ctrl+=/-、Ctrl+Shift+=/-/0、Ctrl+Shift+1/3/L、Ctrl+Alt+O/S/E 不再动作；查找框内 Ctrl+F 无动作）；残余（编辑器开的查找条关闭后焦点仍回正文，非本条路径；行内公式 `input.sl-math-inline-input`（`mathNodeView.ts:311`，NodeView 在 `.ProseMirror` 内）与块级 `textarea.sl-math-block-input` 仍走放行集，Ctrl+K/F 会开链接编辑框 / 查找条、Esc 后焦点落正文——同症状、不同路径；收紧判据 `target.isContentEditable && target.closest('.ProseMirror')` 需保源码框放行并补 ⑬ E2E，超范围，不收紧；B-264 在池）；UNVERIFIED（真 WebView2 宿主、真实中文 IME、macOS）。
