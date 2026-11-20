# 第 111 轮计划（单轮；只此 1 条：流式中止抢焦点，P2 / B-240）

> **revision 1**：plan-review H-1…H-5 全落地（采样红判据、`??` 改 2 个、H-3/H-4 落文档、回归加 r96），范围不变、无砍除。

## 0 前提（HEAD `c626e66`）

- 抢焦点：`MarginRail.tsx:169-171` `[docName]` → `resetChat()`（`:151-158` `abort()`）→ `:208-214` finally 在 `aliveRef` 真时无条件 `inputRef.current?.focus()`（全文件恰 1 处）。
- 判读（H-4）：按**缺陷**读；两条交付行为与 lead 确认项见 A2④⑤。
- 主动中止无入口：`.rail-chat-reset` 流式中 `disabled`（`:695`）、卸载走 `aliveRef`（`:162-165`）→ `(aborted=true, focusInPanel=true)` 一格 E2E 不可达、只有单测覆盖（H-3）。
- 首屏不含本 chunk（`App.tsx:20` lazy、`measure-first-screen.mjs:8-9`）、`chat.ts` 只进懒 chunk → **首屏净增 0 B**；基线门 **315,220 B**（余 4,780）、chunk gzip9 **6,779**。
- 复现：无 Key 走 `ai.ts:231-240` 的 `mockChat`（3 字/20 ms），中止下一 tick 抛 `AbortError`；照 r108 `:177-181` 20 ms→130 ms，窗口约 3 s。

## 1 体积（硬线 320,000 / 内部 310,000）

- 门预期 **315,220 B、净增 0**；chunk **6,779→≤7,100**。B-229 口径合计 321,999→≈322,100–322,150（仍 `open`）。

## 2 任务

### A1 红基线 + 最小修 + 单测 + 绿（B-240）

- 文件：`.tmp/e2e-r111-a1-focus.mjs`（新）、`MarginRail.tsx:208-214`、`src/lib/chat.ts`、`src/lib/chat.test.ts`。
- ① 夹具：照 `.tmp/e2e-r102-focus.mjs:62-154` 假 FSA helper，entries 改 `{a.md,b.md}`；清 localStorage+indexedDB 再 reload（r108 `:32-42`）。
- ② 场景 A（须绿）：开 `#rail-tab-chat` → 输入 → Enter → 等收流（`aria-busy=false`、assistant 非空）→ 焦点仍 `.rail-chat-input`、turn 恰 2。
- ③ 场景 B（改前红；H-1）：点 `a.md` → 等 `name==='a.md'`（FileTree rAF 会抢焦）→ 开对话页签 → 输入 → Enter → **80 ms 内**点 `b.md` 行；点前断 `.rail-chat-log` 的 `aria-busy==='true'` 且 `activeElement` 仍 `.rail-chat-input`；页内挂 `focusin`（记 `t`/类名）+ 16 ms `activeElement` 采样，点行后记 `tClick`，窗口到 Enter+1,200 ms。
  - 只统计 `t>tClick`：Enter→点击前焦点本在输入框。
  - 红：采样任一拍或 `focusin` 落 `.rail-chat-input`（后者补 <16 ms 瞬态）；改前预期命中。
  - 绿：0 命中且 `name==='b.md'`、turn 0、`aria-busy=false`、末态 `[data-path$="b.md"]`。
- ④ 场景 B2（快速打开，同 ③ 口径）：预热 QuickOpen → 流式中 `Ctrl+P` → 输 `b.md` → Enter → 记 `tClick`；绿 = 0 命中且末态 `.ProseMirror`、turn 0、`aria-busy=false`、`name==='b.md'`；冷启超窗 130→200 重试 1 次，仍不行记 UNVERIFIED。
- ⑤ 场景 C（防不回焦）：流式中点 `.ProseMirror p` 把焦点带进正文 → 等收流 → 焦点仍在正文；没带进正文记 UNVERIFIED。
- ⑥ 实现（2 处）：`chat.ts` 尾加 `chatRefocusAfterStream(aborted, focusInPanel) => !aborted && focusInPanel` + 注释（中止=上下文换了）；`MarginRail.tsx` finally 在 `setBusy(false)` 后取 `#rail-panel-chat`，`if (chatRefocusAfterStream(controller.signal.aborted, !!panel?.contains(activeElement))) inputRef.current?.focus()`——**与谓词同一行**（静态门按行判）。
- ⑦ 单测 2 条：①`(false,true)→true`、其余三格 `false`；②静态门（照 `chat.test.ts:125-136`）`inputRef.current?.focus()` 恰 1 处且该行含 `chatRefocusAfterStream`。
- 验收：改前 `.tmp/r111-a1-before.json`（B/B2 红、A/C 绿）、改后 `-after.json`（全绿、0 pageerror），读数含命中数；B 改前不红按 H-1 复核再跑 1 次，仍不红记 UNVERIFIED；`npm test` **62 文件 879 条 0 fail**（`chat.test` 13→15；负向对照：删条件静态门红）；`verify` gzip **315,150–315,300**、chunk **≤7,100**；`build` exit 0；截图 `shots/round-111/focus-after-switch.png`。
- 风险：长开 ego 页可能跑旧模块 → 先 reload 核对本轮标记；FileTree `[activePath]` 的 rAF 回焦是改前抖动源，只认采样 + `focusin`，别按末态单点判红。

### A2 三路回归 + 体积复核 + 台账（B-240）

- 文件：`docs/iteration/BACKLOG.md`（P2 表尾 B-239 后）、`docs/iteration/round-111/{impl.md,test.md}`；只用既有 `.tmp` 脚本。
- 步骤：① 回归三路：`node .tmp/e2e-r108-a1-live.mjs`（**17/17**，⑤ 回焦是既有行为）、`node .tmp/e2e-r96-a1-chat.mjs`（**33/33**，`:192` 直连本轮）、`node .tmp/e2e-r102-focus.mjs`（13/13）。② 三脚本覆盖已跟踪截图（r96 `rail-chat.png`、r102 `focus-after-generate.png`、r108 `chat-live-off.png`）→ 跑完 `git checkout -- shots/round-96 shots/round-102 shots/round-108`。③ 复核门/chunk/合计与 A1 一致并记 `npm test` 条数。④ BACKLOG 加 B-240（P2、`fixed`、区域「焦点 / 对话页签」）：A1 红/绿 JSON、A/B/B2/C、门与 chunk、回归数、截图路径；并落判读（H-4）：按缺陷读、交付①普通收流仍回焦②焦点移出面板不回焦、旧行为保留作证、lead 一句确认。⑤ `impl.md`/`test.md` 同落判读；`test.md` 另写 `(true,true)` 一格 E2E 不可达（`:695` disabled、`:162-165` 卸载不聚焦），只有单测覆盖，免 tester 判「判据未验」（H-3）。
- 验收：三脚本全绿、0 pageerror；`git status --porcelain` 只 4 个 `M`（BACKLOG + 3 个源文件）与 **2 个 `??`**（`docs/iteration/round-111/`、`shots/round-111/`）——`.tmp` 脚本不入 status（`.gitignore:8`、`git ls-files .tmp`=0），别按 3 个判（H-2）；BACKLOG 行含红/绿读数、门数值、判读；`test.md` 只写实测值与 H-3 说明。
- 风险：三张已跟踪截图被覆盖 → 还原后再收工。

## 3 边界

- 只改 finally 回焦条件与 `chat.ts`/`chat.test.ts`；不碰 `resetChat`、不加停止钮、不改页签交接（B-230）与 `aria-live`（B-237/B-238）。
- 不 push、不改 `release/`、版本 0.32.1、CHANGELOG 走 `## Unreleased`（scribe 收）。
