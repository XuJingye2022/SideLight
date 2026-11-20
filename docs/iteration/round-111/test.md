# 第 111 轮 test（tester 独立验收，B-240 流式中止抢焦点）

> tester 未读 `impl.md`：只读 `plan.md` 本轮任务、`git diff`、`BACKLOG.md`，并从零自写脚本复验。轮前 startSha `c626e66`，本批只 A1/A2。

## 判读（H-4，与 `impl.md` 同一段）

按**缺陷**读：改前 `finally` 无条件 `inputRef.current?.focus()`，任何收尾都抢回输入框。交付两条行为：①普通收流（焦点仍在 `.rail-chat-input`）仍回焦，保留「Enter 发完接着写」的既有手感；②流式中止（换文档 / 卸载）或焦点已被读者移出 `#rail-panel-chat`（点正文、点文件树、快速打开）时不回焦。旧行为留在 `.tmp/r111-a1-before.json` 作证，「是否算缺陷」待 lead 一句确认。

## 独立 E2E（自写 `.tmp/r111-tester-focus.mjs`）

ego CDP 57270、1440×900、自造假 FSA（`a.md`/`b.md`）、无 Key mock 流放慢到 130 ms；`focusin` 捕获 + 16 ms `activeElement` 采样，只统计 `t>tClick`。**14/14 全 OK、0 pageerror**（`.tmp/r111-tester-focus.json`）：

| 场景 | 独立读数 |
| :--- | :--- |
| A 普通收流 | 焦点回 `.rail-chat-input`，点后 24 拍全命中（=行为①保留）、turn 2 / assistant 1、`aria-busy=false` |
| B 流式中点 `b.md` 行 | 点后 **64 拍 + focusin 共 0 命中**；末态焦点 `[data-path$="b.md"]`（`r111-tester-ws/b.md`）、turn 0、`aria-busy=false` |
| B2 流式中快速打开 `b.md` | 点后 **65 拍 0 命中**；末态 `name=b.md`、焦点 `.ProseMirror`、turn 0 |
| C 流式中点正文 | 点后 **130 拍 0 命中**；收流后焦点仍在 `.ProseMirror`、turn 2 |

**反事实（不改磁盘源码）**：同脚本装 `page.route`，把 dev server 交付的 `MarginRail.tsx` 换回「无条件回焦」（111,914 → 111,870 B），复跑 B、C 两格均 **RED**：B `hitTotal 57`（56 采样 + 1 focusin、类名出现 `rail-chat-input`）、C `hitTotal 4`（3 + 1、末态焦点 `rail-chat-input`），见 `.tmp/r111-tester-red.json`、`.tmp/r111-tester-red-c.json`。→ 断言不是空转，红基线成立（C 改前红与 plan-review N-1 正读一致，非夹具问题）。

交付物对照：`.tmp/r111-a1-before.json` **12/17**（红 5 条：B 0 命中、B2 0 命中、B2 末态、C 收尾焦点、C 0 命中）→ `-after.json` **17/17**，两次都 0 pageerror；与 `impl.md` 读数一致。

## H-3：`(true, true)` 一格 E2E 不可达

- 流式中无停止入口：`.rail-chat-reset` 是 `disabled={busy || …}`（`MarginRail.tsx:695`），发送钮 `disabled={busy || !chatDraft.trim()}`，输入框没有停止键；卸载走 `aliveRef=false`（`:162-165`）直接不进聚焦分支。两路都进不到 `(true, true)`。
- 拖入 `.md` 打开可达（`docName` 变 → `resetChat()` 中止、焦点仍在输入框），但这时改前 `focus()` 是 no-op（焦点本来就在），**新旧无可见差异**，E2E 看不到。
- 因此 `(true, true)` 与 `(true, false)` 两格只有单测真值表覆盖（`chat.test.ts`），E2E 不承担。

## 静态门与单测

- `chatRefocusAfterStream`：`src/lib/chat.ts` HEAD **0** → **1**；`MarginRail.tsx` 的 `inputRef.current?.focus()` 全文件**恰 1 处、同行含 `chatRefocusAfterStream(` 与 `controller.signal.aborted`**（HEAD 同 1 处但无条件）；`chat.test.ts` 13 → **15 条**。
- 负向对照（临时把 finally 改回无条件、再还原）：`ℹ fail 1`、exit 1；还原后 **15/15**、exit 0；`git diff --stat` 仍 4 文件 42+/2−。

## 门禁与体积

- `npm test` **62 文件 879 条 0 fail**（按每文件 `ℹ tests` 求和，`.tmp/r111-tester-npm-test.log`）。
- `npm run verify` **PASS**：`tsc --noEmit` + build exit 0、首屏 gzip **315,221 B**（净 +1、距硬线 320,000 余 **4,779**、超内部预算 5,221 只 WARN）；独立 `gzipSync({level:9})` 量 MarginRail chunk `dist/assets/MarginRail-DrtJF6yW.js` raw 19,248 → **6,803 B**（≤7,100，比 6,779 +24）；B-229 口径「门 + chunk」= **322,024**（超硬线 2,024，**B-229 仍 open**）。

## 回归与收尾

- 回归（0 pageerror）：r108 `e2e-r108-a1-live.mjs` **17/17**、r96 `e2e-r96-a1-chat.mjs` **33/33**、r102 `e2e-r102-focus.mjs` **13/13**；跑完 `git checkout -- shots/round-96 shots/round-102 shots/round-108`。
- `git status --porcelain` = **4 M**（BACKLOG + `MarginRail.tsx`/`chat.ts`/`chat.test.ts`）+ **2 ??**（`docs/iteration/round-111/`、`shots/round-111/`）；`.tmp` 脚本按 `.gitignore:8` 不入 status。
- 截图 `shots/round-111/focus-after-switch.png`（1440×900、47,957 B）：切到 `b.md`、对话页签已清空、焦点在 `b.md` 树行。
- 台账：`BACKLOG.md` B-240（`fixed`）含红/绿读数、门与 chunk、H-4 判读；`impl.md`/`test.md` 同判读。
- UNVERIFIED：真实中文 IME、WebView2 宿主未跑；`(true,true)` / `(true,false)` 两格只有单测（见 H-3）。

## 判定

**PASS**。门禁全绿、独立复验与反事实红基线成立、0 产品回归。
