# 第 115 轮计划（revision 1）— B-241：文首 1/1 时侧栏 Tab 被送回 skip-link

> 修订 1：按 `plan-review.md` H1–H5 逐条修（步骤顺序、验收 4/5 选区前提、`isDestroyed`/R3、缺口句、对话路 before）。

## 0. 基线

- 轮前 `ad2cd11`，工作区只有未跟踪 `round-115/`（before 在此跑）。
- 门 **315,464 B gzip**（余 4,536；312,423 为旧数）；`MarginRail-*.js` gzip9 7,337 → 真实首载 **322,801**（超 2,801，B-229 open）；`npm test` **62 文件 892 条**。
- 缺陷：`App.tsx:5886-5893`（`main#editor` 的 `onKeyDownCapture`）只判 `Tab && !shift && editor && from===1 && to===1`；`MarginRail`（`:6000`）在 `main`（`:5881-6094`）内。证据 `.tmp/r112-finder-ui3.json`。

## 1. 体积

- 只改主包 1 个 handler：`editor.view.dom`（`:4108`）与 `.contains(` 已存在，新增仅 `isDestroyed` → 估 **+30–70 B gzip**，上限 **+96 B**（`--max 315600`）。
- 合计 **322,801+Δ≈322,83x**，硬线缺口 **2,801+Δ** 仍由 B-229 持有；超 +96 B 切步骤 3。

## 2. 任务

### A1 守卫 + 复现/回归（B-241）

文件：`src/App.tsx`（只改 `:5886-5893`）、`.tmp/e2e-r115-b241.mjs`（新）。

步骤（**改前先跑**）：
1. 写脚本（ego CDP 57270、1440×900、`--phase before|after`；`settle` 清对话框 `scripts/keyboard-acceptance.mjs:88-107`；from/to 用 fiber 取 Editor `.tmp/e2e-r93-probe10.mjs:13-26`）并在 **`ad2cd11`** 跑 before：`node .tmp/reset.mjs 57270` → `$env:R115_HEAD = (git rev-parse --short HEAD)` → `node .tmp/e2e-r115-b241.mjs before` → `.tmp/r115-b241-before.json`（HEAD 走环境变量，不调 `child_process`）。
2. 加守卫：`... || !editor || editor.isDestroyed) return`，下行 `if (!editor.view.dom.contains(event.target as Node)) return`（先判 `isDestroyed`，不碰 Proxy 桩）+ 1 行注释。
3. 备选（仅超 +96 B 时二选一）：`onKeyDownCapture` 从 `<main>` 移到 `.doc-column`（`:5993`）。
4. after：`page.reload()`（必要时 touch `App.tsx` 再刷，别重启 server）→ `reset.mjs 57270` → 同脚本 `after` → `.tmp/r115-b241-after.json`。

验收（不点正文，用 `.focus()`）：
1. before JSON：`head:"ad2cd11"`、`sel1={1,1}`；`.rail-diff-open` Tab×3 首站 `A.skip-link`；点 `#rail-tab-chat` → 填「草稿」→ Tab 落 `A.skip-link`。
2. after 批注路：Tab×3 = `[.rail-review-open, #rail-tab-notes, .stats-trigger]`，逐项相等、无 `.skip-link`。
3. after 对话路：`#rail-tab-chat` → 填「草稿」→ `.focus()` → Tab×3 = `[.rail-chat-send, .rail-chat-generate, .stats-trigger]`。
4. 对照不回归：`.ProseMirror.focus()` → `type('x')` → 断言 `from>1` → `Ctrl+End` → 断言 `from>1`（JSON `pre4`；空文档 Ctrl+End 恒 1/1，是假对照）→ 点回 `#rail-tab-notes` 重跑 2、点 `#rail-tab-chat` 重填重跑 3，逐项相等。
5. 正控：`.ProseMirror.focus()` → `Ctrl+Home` → 断言 `from===1&&to===1`（JSON `pre5`）→ 装 window **冒泡**相一次性 keydown 监听（capture 相读不到）→ Tab → `A.skip-link` 且 `defaultPrevented===true`。
6. 侧效应（记进 impl）：skip-link Enter 后 Tab ≈`.ProseMirror`（改前回 `.skip-link`）；源码态 textarea Tab 不再进 `.skip-link`（≈`.stats-trigger`）。
7. Shift+Tab 不变：`.rail-chat-send` → `.rail-chat-input`。
8. preview 态：点 `button[title^="只读预览"]` → 等 `.preview-pane` → `main#editor.focus()` → Tab → 0 pageerror；另 0 pageerror/console error、`.margin-rail` 宽 320、无横溢。

回归：`node scripts/keyboard-acceptance.mjs` **52/52**；跑完 `git checkout -- shots/round-05/`。

### A2 门禁 + 发现池 + 报告

文件：`docs/iteration/round-115/impl.md`（新）、`docs/iteration/BACKLOG.md`（只改 B-241）。

1. `npm run verify -- --max 315600` exit 0；报三数（门 gzip / chunk gzip9 / 合计）与基线的差、合计缺口（2,801+Δ）。
2. `npm test` **62 文件 ≥892 条 0 fail**；不加测试文件（E2E+静态门覆盖）；`roundtrip` 不跑（未动编辑器/序列化）。
3. 静态门（贴改前）：`git grep -nF 'view.dom.contains' -- src` **0（exit 1）→1**、`git grep -nF 'editor.isDestroyed' -- src` **0→1**；对照 `git grep -nF 'editor.view.dom' -- src` 改前 1 行（`:4108`）。
4. BACKLOG B-241 置 `fixed`，证据四组：before/after JSON、`keyboard-acceptance` 52/52、体积三数、静态门。

## 3. 不做

- 不把 `.margin-rail` 移出 `main`（动卡片参照与 sticky 整体评价）；不改 `.skip-link` 与「正文开头 Tab 回环」整链（既有 P2），只消「侧栏」「main 自身」两处误吞。
- 不碰 `MarginRail.tsx`/`styles.css`/`README`/`CHANGELOG`（批末 scribe）；不动 B-229/B-242/B-244/B-246/B-248；不加依赖、不 push、不改 `release/`。

## 4. 风险

- R1 判据过窄：焦点在 `.doc-column`/占位符时不再劫持——无实际路径。
- R2 预览态：EditorContent 卸载时 @tiptap/react 把 PM DOM 挪进游离 div（`dist/index.js:137-152`），`editor.view` 还在、`contains` false → 不劫持不抛；验收 8 实测。
- R3 若仍抛（预期不会）：兜底 `try { dom = editor.view.dom } catch { return }`；**别用** `closest('.doc-body')`（预览根 `PreviewPane.tsx:128` 也带）或 `.doc-column .ProseMirror`（`:126` 的 `.preview-column` 同样匹配）。
- R4 体积穿透 +96 B：切 A1 步骤 3。R5 HMR 旧模块：E2E 前 `page.reload()`，必要时 dump handler。

## 5. tester 独立验收

1. 不读 `impl.md`：自写 `.tmp/r115-tester-b241.mjs` 复跑验收 2–8。
2. before 不能在 5175 复跑（`.tmp/wt-115` 的 `src/` 加载不到；另起 server 违规）：三条互证——before JSON `head=ad2cd11`、`git show ad2cd11:src/App.tsx` 无 `view.dom.contains`、两路首站 `A.skip-link`；worktree 只读，不替换文件、不 stash。
3. 静态门 0→1（两条）、`npm test` ≥892、`verify --max 315600`、三数并报合计缺口。
4. `keyboard-acceptance` 52/52 后 `git checkout -- shots/round-05/`；`git diff --stat` 只含 `App.tsx` + 本轮文档。
