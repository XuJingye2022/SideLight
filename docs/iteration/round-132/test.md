# 第 132 轮 tester 独立验收（B-263：产品键作用域）

判定：**PASS**。未读 `impl.md`；只按 plan 任务书、`git diff` 与 BACKLOG 复验。轮前 startSha `c7b3134`。

## 1 门禁（一次）

- `npm run build` exit 0（`.tmp/r132-tester-build.log`）。
- `node scripts/measure-first-screen.mjs --max 316800` exit 0 **PASS**：gzip **316,134 B**、raw **1,025,609**、headroom **666**、files 3（`.tmp/r132-tester-measure.log`）。对 131 轮 316,096 **净 +38 B**；对硬线 320,000 余 **3,866 B**；对内部预算 310,000 超 6,134（只 WARN）。
- 常驻 chunk：`dist/assets/MarginRail-R13BmBTx.js` raw 22,282 / gzip9 **7,878**；B-229 口径合并 **324,012**（超硬线 **4,012**，仍 `open`，只记）。
- `npm test` **68 文件 948 条 0 fail**（按 68 条 `ℹ pass` 求和；`.tmp/r132-tester-npm-test.log`）。
- `roundtrip` 不跑：本轮只动 window keydown 守卫，未动编辑器 / 序列化。

## 2 A1 静态门（从零复验）

- `node --experimental-strip-types src/lib/appKeyScope.test.ts` **5/5 exit 0**（`.tmp/r132-tester-appkeyscope.log`）。
- `grep foreignTyping src/App.tsx` **2**（改前 HEAD `git grep -c` exit 1 = 0）；选择器串 `.ProseMirror, textarea.source-editor` 在 `App.tsx` 与 `FileTree.tsx` 各 **1**。
- 负向（备份 SHA256 `C0B18A8E…`）：
  - 删 `customId !== 'save'`（`if (foreignTyping) {`）→ **1 红 exit 1**（守卫体保存放行条），`.tmp/r132-tester-neg1.log`；
  - 选择器砍成 `.ProseMirror` → **1 红 exit 1**（放行集与 FileTree 逐字同条），`.tmp/r132-tester-neg2.log`；
  - 两处拷回后 SHA256 逐字同、**5/5 绿**。

## 3 A2 真机 before / after（ego CDP 57270、先 `reset.mjs 57270`、1440×900、假 FSA `a.md`、`settings.v1={"autoSave":false}`）

身份门（fetch `/src/App.tsx` 数 `foreignTyping`）：before **0** / after **2**，两相 PASS（`.tmp/r132-chatkeys-gate.json`）。

- **before 2/2**（`.tmp/r132-chatkeys-before.json`，日志 `.tmp/r132-tester-e2e-before.log`）：旧代码换入只走 `git stash push -- src/App.tsx`、跑完 `pop`，`git diff -- src/App.tsx` 复原、SHA256 回到 `C0B18A8E…`、`git stash list` 0。①② 对照全为「被穿透」：① `.link-editor-input` **2** 且焦点 aria「链接地址」；② `.find-input` **1**。另记录 ③ find-bar 1、④ quick-open 1、⑤ viewMode=source、⑥ global-search 1，⑫ 旧代码 1 写且脏被清（与缺陷一致）。
- **after 18/18、0 pageerror / 0 console error**（`.tmp/r132-chatkeys-after.json`，日志 `.tmp/r132-tester-e2e-after.log`）：
  - ①–⑥ 对话输入框按 Ctrl+K / Ctrl+F / Ctrl+H / Ctrl+P / Ctrl+/ / Ctrl+Shift+F：四个浮层 0、`viewMode` 仍 `edit`、焦点仍 `textarea.rail-chat-input`、输入值「测试指令」与 `.ProseMirror` innerHTML 不变；
  - ⑦ 输入框 Esc：无查找条 / 链接编辑框，焦点仍输入框；
  - ⑧ 回车：2 条 `.rail-chat-turn`；
  - ⑨ 正文 Ctrl+K：链接编辑框 **2** 个 input、焦点「链接地址」，Esc 后 0；
  - ⑩ 正文 Ctrl+F：查找条 1、焦点 `.find-input`，Esc 后 0 且焦点回 `.ProseMirror`；
  - ⑪ 源码框 Ctrl+F：查找条 1，Esc 后 0 且焦点回 `textarea.source-editor`；
  - ⑫ **P1-1 夹具**：Ctrl+S 前 `write:a.md` **0** 且 `dirty=true`；按后**恰 1** 写、`files.get('a.md')` 28 B 含「改」、`dirty=false`、焦点仍输入框、两浮层 0（证明保存例外放行、且按前的 0 写不是自动保存造成）。

## 4 A3 回归与收口

- `keyboard-acceptance` **52/52** exit 0（`$env:SIDELIGHT_CDP='http://127.0.0.1:57270'`、显式 `http://localhost:5175`；`.tmp/r132-tester-keyboard.log`），跑后 `git checkout -- shots/round-05/`。
- `git status --porcelain` 只有约定路径：`src/App.tsx`、`src/lib/appKeyScope.test.ts`、`package.json`、`docs/iteration/BACKLOG.md`、`docs/iteration/round-132/`（`.tmp/` 自忽略）；按 tester 角色收尾另加 `docs/CHANGELOG.md`（第 132 轮条目 + 标题区间 29–130 → **29–132**，`changelog.test.ts` **3/3**）与 `docs/iteration/STATE.md`（轮次记录追加一轮）；不 push、未动 `release/`。
- `docs/iteration/round-132/impl.md` 4,090 B（≤4 KB），含门命令数 316,134 / 324,012 / 948 / 52/52 / 316800 / 316,096 净 +38、有意行为、残余、UNVERIFIED。
- B-229 已补第 132 轮复测（门 316,134 + chunk 7,878 = 324,012，超线 4,012）；B-263 已 `fixed` 并追加本报告独立数。

## 5 偏差与残余（不判 FAIL）

- 任务书 A3 预期合并 ≈324,1xx，实测 **324,012**（门比估值低；按实测记）。
- 放行集按 `closest('.ProseMirror, textarea.source-editor')`：行内公式 `input.sl-math-inline-input` 与块级 `textarea.sl-math-block-input` 的 NodeView 在 `.ProseMirror` 内，仍属放行集（Ctrl+K/F 会开链接编辑框 / 查找条），同症状不同路径，本轮不收紧（plan P2-1 已记）。
- UNVERIFIED：真 WebView2 宿主、真实中文 IME、macOS。真机断言走 ego 浏览器 CDP 57270（9222–9226 无监听）。
