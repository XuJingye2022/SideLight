# 第 111 轮 impl（B-240 流式中止抢焦点）

- 轮前 `c626e66`；A1/A2 全 DONE、回滚 0。
- 判读（H-4，与 `test.md` 同段）：**按缺陷读**。改前 `finally` 无条件 `inputRef.current?.focus()`，任何收尾都抢回输入框。交付①普通收流（焦点仍在面板）仍回焦；②流式中止（换文档/卸载）或焦点已被读者移出面板时不回焦。旧行为留在 `-before.json` 作证；是否算缺陷请 lead 一句确认。

## A1 红基线 + 最小修 + 单测 + 绿

- `src/lib/chat.ts` 尾加 `chatRefocusAfterStream(aborted, focusInPanel) => !aborted && focusInPanel`（带注释）。
- `MarginRail.tsx:208-214` 的 `finally`：取 `#rail-panel-chat`，`focusInPanel = !!panel?.contains(document.activeElement)`，`if (chatRefocusAfterStream(controller.signal.aborted, focusInPanel)) inputRef.current?.focus()`（**谓词与 `.focus()` 同一行**，静态门按行判）；import 补该函数。
- `src/lib/chat.test.ts` 13→**15 条**：①真值表 4 格；②静态门（`inputRef.current?.focus()` 全文件恰 1 处、该行含谓词与 `controller.signal.aborted`）。负向对照改回无条件 → **1 红 exit 1**，还原 15/15（`.tmp/r111-a1-static-{negative,green}.log`）。
- E2E `.tmp/e2e-r111-a1-focus.mjs`（ego CDP 57270、1440×900、假 FSA a.md/b.md、无 Key mock 流放慢到 130 ms、`focusin` 捕获 + 16 ms 采样、只统计 `t>tClick`）：
  - 改前 `.tmp/r111-a1-before.json` **12/17**、0 pageerror：A 绿；B「0 命中」红（`hitTotal 1`，纯 focusin）；B2 红（121 = 采样 120 + focusin 1，末态 `rail-chat-input`）；C 收尾焦点红、C「0 命中」红（139 = 138 + 1）。
  - 改后 `.tmp/r111-a1-after.json` **17/17**、0 pageerror：B/B2/C `hitTotal 0`；B 末态焦点 `[data-path$="b.md"]`（`r111-ws/b.md`、`.is-active`），B2/C 末态 `.ProseMirror`；B/B2 turn 0、`aria-busy=false`；A `samples 75 / sampleHits 75 / focusinHits 0`。
  - `deliveredModule` 改前 false/false → 改后 true/true（直读 `/src/…` 交付字节，排除旧模块假绿）。
  - 偏差：`plan.md:32` 写「B/B2 红、A/C 绿」，实跑 C 改前**也红**，与 plan-review **N-1** 正读一致；是行为②的第二证据，非夹具问题。
- 门禁：`tsc --noEmit` exit 0；`npm test` **62 文件 879 条 0 fail**（`.tmp/r111-a1-npm-test.log`）；`verify` **PASS** gzip **315,221 B**（净 +1、余硬线 4,779）、build exit 0（`.tmp/r111-a1-verify.log`）；chunk gzip9 **6,803**（+24，≤7,100）；B-229 口径合计 **322,024**（**B-229 仍 open**）。
- 截图 `shots/round-111/focus-after-switch.png`（切到 b.md、对话已清空、焦点在树行）。

## A2 三路回归 + 体积复核 + 台账

- 回归全绿 0 pageerror：r108 **17/17**、r96 **33/33**、r102 **13/13**（`.tmp/r111-a2-reg-{r108,r96,r102}.log`）。
- 三脚本覆盖已跟踪截图 → 已 `git checkout -- shots/round-96 shots/round-102 shots/round-108`；`git status --porcelain` = **4 M**（BACKLOG + 3 源文件）+ **2 ??**（`docs/iteration/round-111/`、`shots/round-111/`），`.tmp` 脚本按 `.gitignore:8` 不入 status。
- 体积与 A1 一致（`measure-first-screen.mjs`：315,221 / 6,803 / 322,024）；台账 B-240 已入 `docs/iteration/BACKLOG.md` P2 表尾。

## CHANGELOG 一行

- 对话流式中止（换文档/关闭面板）或焦点已移出右侧面板时，收尾不再把焦点抢回输入框（B-240）。

## 新踩坑

1. 浏览器里的抢焦可能**短于 16 ms**：同一脚本两次改前运行，B 一次被采样捕到 64/68 拍、另一次 0 拍只有 `focusin` 捕到 1 拍（FileTree 的 `[activePath]` rAF 把焦点送回树行）。只按采样或末态单点判会假绿。
2. 按行判的静态门要求谓词与 `.focus()` **同一行**；拆两行会 0 命中、看起来像改动没落地。
3. `npm test` 条数要按每个文件 `ℹ tests N` 求和：每文件各打一段 `ℹ fail 0`，取最后一段会把 62 文件读成 1 个。
