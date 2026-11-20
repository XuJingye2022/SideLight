# 第 115 轮执行（executor）— B-241：文首 1/1 时侧栏 Tab 被送回 skip-link

## 状态

- A1 守卫：DONE。A2 门禁/发现池/报告：DONE。回滚 0 条。
- 改动只有 `src/App.tsx` 1 个 handler（**+3/−1**，`:5886-5893`）：先判 `editor.isDestroyed`，再加 `if (!editor.view.dom.contains(event.target as Node)) return`；新 `.tmp/e2e-r115-b241.mjs`。无其他产品文件改动。

## A1 E2E（ego CDP 57270、1440×900；`.tmp/r115-b241-{before,after}.json`）

- before（`head=ad2cd11`、`sel1={1,1}`）**12/12**：`.rail-diff-open` Tab×3 **首站 `.skip-link`**；`.rail-chat-input` 填「草稿」后 Tab 落 **`.skip-link`**。
- after **18/18**（JSON 的 `head` 同为 `ad2cd11`：守卫尚未提交，仍是工作区改动）：批注路 `[.rail-review-open,#rail-tab-notes,.stats-trigger]`、对话路 `[.rail-chat-send,.rail-chat-generate,.stats-trigger]`，逐项相等且两路都无 `.skip-link`。打 1 字后 `from=2`、`Ctrl+End` 后 `from=2`（`pre4`），两路重跑逐项不变；`Ctrl+Home` 后 `pre5={1,1}`，Tab 仍到 `.skip-link` 且 `defaultPrevented=true`（正控未破）；预览态 `main#editor.focus()` 后 Tab **0 pageerror**；全程 0 pageerror、0 console error；`.margin-rail` 宽 **320**、`doc-scroll` 与 document 横溢 **0**；Shift+Tab `.rail-chat-send`→`.rail-chat-input`。
- 起手按 plan-review P2-a：每条先 `.focus()`（`.rail-diff-open` / `.rail-chat-input`）；P2-b：断第三站前先断 `.toast` 与 `.analyze-bubble` 为 0。
- 侧效应（计划 6，记录）：skip-link 聚焦后 Enter → Tab，改前回 `.skip-link`、改后落 `.ProseMirror`；源码态 `textarea.source-editor` Tab，改前 `.skip-link`、改后 `.stats-trigger`。
- 无视觉改动，未截图（纯键盘行为，证据是 JSON）。

## A2 门禁

- `npx tsc --noEmit` exit 0。
- `npm run verify -- --max 315600` exit 0 **PASS**：门 gzip **315,492 B**（对基线 315,464 **+28**；`--max` 余 108）；`MarginRail-*.js` gzip9 **7,337**（raw 20,820，未变）；合计 **322,829**，硬线缺口 **2,829**（基线 2,801+28，仍归 B-229）；内部预算超 5,492 只 WARN。
- `npm test`：**62 文件 892 条 0 fail**（`.tmp/r115-test.log`）。不加测试文件：守卫是 DOM 捕获层行为，仓库无 jsdom，E2E + 静态门覆盖更实。
- 静态门：`view.dom.contains` HEAD **0（exit 1）→ 1**（`:5890`）；`editor.isDestroyed` **0（exit 1）→ 1**（`:5888`）；正向对照 `editor.view.dom` HEAD 1 行（`:4108`）。
- `keyboard-acceptance`（5175 + CDP 57270）**52/52 PASS**（`.tmp/r115-keyboard.log`）；跑完 `git checkout -- shots/round-05/`，`git status` 只剩 `src/App.tsx` 与 `round-115/` 文档。
- `roundtrip` 不跑：未动编辑器与序列化。

## 未验

- 真实中文 IME 与真 WebView2 宿主内的 Tab 路径未跑（本轮为 CDP 合成按键）。

## CHANGELOG 一行

- 修复：正文停在文首时，侧栏（对话 / 批注）里按 Tab 不再被送回「跳到正文」。

## 新踩坑

1. before 的 Tab 序列只有**首站**是 `.skip-link`（后两站 `.file-menu-trigger`、无名 `BUTTON`）：改前只能断首站，断整组会假红。
2. `reset.mjs <端口>` 末步会关掉它新建的页面，E2E 要按「找不到 5175 页就 `ctx.newPage()`」兜底，否则 `pages()[0]` 可能是空白页。
3. 预览态 Tab 落 `.stats-trigger` 而非 `.skip-link`，正是 `!editor.view.dom.contains(event.target)` 分支生效的物证——别把它当「守卫没进」。
