# 第 119 轮 impl（executor）：B-249 让位

轮前 `83a70f2`；只改 `src/App.tsx`、`src/components/MarginRail.tsx`、`package.json`、`BACKLOG`（+4 行）；未动 `styles.css`/z/Esc 次序/`dialogOpen`/deps/`release/`。

## A1 完成

- `App.tsx:4419-4431` 渲染期谓词 `appDialogOpen`（10 态，含 `hostDraftPrompt !== null`）；`:6016` 传给 MarginRail，只此一次。
- `MarginRail.tsx:35-36`/`:103` Props + 解构；`:259` `diffOpen` 与 `:319` `reviewActive` 各加 `&& !appDialogOpen`；`:831-832` portal 条件 `diffData !== null && diffOpen`；`:342` docName effect 加 `setDiffData(null)`。

## A2 完成

- 新 `src/lib/railModalGate.test.ts` **6 条**（挂 test 链尾）：谓词 1 处含 10 态 / 传参 1 / Props+解构各 1 / `!appDialogOpen` ≥2 / portal 走 diffOpen / docName 清 diff。HEAD 对照（`.tmp/r119-gate-head-control.log`）：5 项全 **0 命中**、过门 0/5。
- `.tmp/e2e-r119-a1-stack.mjs`（ego CDP 57270、dev 5175）：
  - before **7/7**（`.tmp/r119-a1-before.json`）：overlay 1、`#root` inert、Tab 4 次同 `.rail-diff-close`、Esc 只关面板后确认框才现身且焦点 BODY。
  - after **34/34**、0 错（`.tmp/r119-a1-after.json`）：B 段 Ctrl+P 时 overlay 0 / backdrop 1 / 焦点 `.quick-open-input`，Esc 后面板回、空态 = `MarginRail.tsx:918` 原文、焦点在 sheet，再 Esc 收；A 段 K 成立、文案含「这篇还有没保存的改动」、中心命中 `DIV.dialog`、Tab 5 次全在框内三钮都到、Esc 后 sheet 回、再 Esc 后 `#root` 无 inert 焦点 `.rail-diff-open`；C 段自动保存先落（write 1），打「乙」后 Ctrl+S **恰 +1**（1→2）、盘含「甲」「乙」、`.toast-text`「已保存 c.md」、picker 0；1024×700 抽屉 K 成立、overlay 0、z 序 `{overlay:40,railBackdrop:44,marginRail:45}`、Enter 取消后 sheet 回。
  - 截图 `shots/round-119/confirm-over-diff.png`、`shots/round-119/diff-back-after-cancel.png`。
- BACKLOG +4 只加不修：B-250(P1)、B-251、B-252、B-253；B-249 留 `open` 交 tester。

## 门禁

`tsc` 0；`npm test` **63 文件 903 条 0 fail**（基线 62/897）；`verify` 0；`--max 315800` 连测两次均 **315,542**（余 258）。
三数：门 **315,542**（+33）/ chunk gzip9 **7,398**（+7）/ 合计 **322,940**（+40）；净增 40 ≤ 291 过兜底，B-229 仍 open。
回归 `keyboard-acceptance` 52/52、r100 43/43、r101 57/57（跑后还原 `shots/round-05|100|101`）；不跑 roundtrip。日志 `.tmp/r119-*.log`，全程 0 pageerror。

## 未入谓词

1. `TreeActions.tsx:277-293` 删除确认面板不可达：要右键树行，而 rail 面板开着时 `#root` 是 inert。
2. `exportOpen`/`menuOpen`：全局键能置 true，但与面板同 z 60 被压、键盘被 inert 挡，只记不改。

## UNVERIFIED

真中文 IME；真 WebView2 宿主；另五个模态态（pendingConfirm/sourceConfirm/draftPrompt/closeGuardOpen/hostDraftPrompt）只有静态门，无逐态 E2E。

## CHANGELOG 一行

`- 修复：右侧「对比 / 在审」面板开着时按 Ctrl+Alt+N，确认框被压住、键盘够不着；App 级对话框一开两面板让位，关掉自动回来（B-249）`

## 坑

1. 面板 portal 到 body → `useDialogFocus` 把 `#root` 设 inert，正好当「面板还挂着」的判据。
2. 面板开着打不了字（`#root` inert）：C 段先关面板再打 1 字、1.5 s 内 Ctrl+S，否则自动保存先落、`requestSave` 走「没有改动」恒 0 写。
3. r100/r101 会覆盖 `shots/round-100|101` 历史截图，跑后 `git checkout --` 还原。
