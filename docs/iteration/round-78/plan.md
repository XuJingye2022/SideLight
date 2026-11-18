# 第 78 轮 A 轮计划（P2 批次 1：B-209 / B-208 / B-160）

> **revision 1**（2026-11-19，按 `plan-review.md` 的 H1–H5 修订；任务与范围不变：A1/A2/A3）。

- startSha `00e47daf59b7856aad46266d76240b7a58063a72`（=HEAD）；0.32.1；不 push、不改 `release/`、不加依赖。报告 `docs/iteration/round-78/`，日志 `.tmp/r78-*`。
- dev 5175 已 200；CDP 9222–9226 无监听（实测一次，不重试）。真机（CDP 或 ego 页）优先，连不上用单测/`npm run verify`/`node --check`/静态断言并记 UNVERIFIED；单测绿 ≠ 已验。
- 脚本默认 URL 是 5173（僵尸）：`bigfile` 传 `SIDELIGHT_URL=http://localhost:5175`，`keyboard` 传参数 `http://localhost:5175`，CDP 用 `SIDELIGHT_CDP`；跑完 keyboard `git checkout -- shots/round-05/`。

## A1（B-209，P2 测试）两条验收脚本断言过期

文件：`scripts/bigfile-acceptance.mjs:127`、`scripts/keyboard-acceptance.mjs:174-193`

1. bigfile 断言改 `toast.includes('5.5 MiB') && toast.includes('超过 5.5 MiB') && toast.includes('big.md')`，删 `文件太大`（文案 `src/App.tsx:2549`）。
2. keyboard：「没有改动，未写入。」`ttl:1500`（`App.tsx:3374`）在 `:176` 还在、`:185`（约 1.6 s 后）已过期 → 51/52。`:176` 前加 `await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 5000 }).catch(() => {})` 再读 `toastBefore`。**`.catch()` 必须有**：toast 是 `{notice && …}`（`:5987`），error 无 ttl（`:2180`），超时抛会中断整段（0/52）；持久 error toast 时 `shiftS.toast === toastBefore` 照样成立。
3. strike / picker 与其余 49 条不动。

验收：两脚本 `node --check` exit 0。真机（CDP；ego 的 Chromium 能从 `ego_doctor` 读到端点时可作 `SIDELIGHT_CDP`，只试 1 次）bigfile **3/3**、keyboard **52/52**、exit 0。连不上记 UNVERIFIED + 静态对照（改前 >0）：`文件太大` 1→0、`5.5 MiB` ≥1、`waitForFunction` 0→1。跑通才标 B-209 `fixed`，否则写「断言已改，未复跑」。

## A2（B-208，P2 界面）改名成功提示借刷新文案

文件：`src/App.tsx:2692-2752`（`refreshTree`）、`:2770-2825`（`handleRenamedFile`）、`:679`/`:682`

1. `refreshTree` 选项加 `announce?: boolean`（缺省 true）；`:2735` 改 `if ((added > 0 || gone > 0) && options?.announce !== false) show(...)`，文案不变。
2. `pendingRefreshRef`（`:679`）、`refreshTreeRef`（`:682`）类型补 `announce?: boolean`（`:2698` 排队参数运行时本就带回；补类型不改行为）。
3. `handleRenamedFile` 末（`:2822`）改 `await refreshTree({ mode: 'adopt', activePath: newPath, announce: false })`，再 `show('已重命名：' + oldFile.name + ' → ' + newName)`；依赖补 `show`；其它调用不动。

验收：新脚本 `.tmp/e2e-r78-a2-rename.mjs`（复用 `.tmp/e2e-r58-rename.mjs` 假 FSA）：b.md→c.md 后 `.toast-text` 含「已重命名」「b.md」「c.md」、不含「已刷新」；树出现 c.md；再打字 `Ctrl+S` 后假盘 `c.md` 含新字。静态按行不按处：`git grep -n "announce" -- src/App.tsx` ≥3 行且含 `announce: false`（改前 0）；`已刷新：新增` 仍 1 行。门禁 `npm test` 576 条 0 fail、`verify` 记 gzip。真机跑通才标 `fixed`。

## A3（B-160，P2 打印）打印把公式与高亮的露出定界符打进纸面

文件：`src/styles.css:2464-2526`（唯一 `@media print`）、`:858-871`、`:2132-2154`；`src/lib/mathStyle.test.ts`

1. BACKLOG「P2（路线图，open）」表末补 B-160（它只在 `round-75/proposal-ui-2.md:12`）：先 `planned`、验收后 `fixed`，证据指本报告 + CSS 行号（浏览器未验要写明）。
2. print 块内、变量规则（`:2500-2525`）后加恢复规则。记 `P` = `.doc-body .tiptap-mathematics-render.sl-math-reveal`（**逐字**照屏幕：含 `.doc-body`、`.tiptap-mathematics-render`、`sl-math-reveal` 与 ` > ` 两侧空格）：
   - `P` → `font-family/font-size/color: inherit; white-space: normal`；`P[data-type='block-math']` → `text-align: center`（屏幕 `:2143` 是 left）
   - `P[data-type='inline-math']::after`、`P[data-type='block-math']::after`、`.doc-body .sl-eq-revealed::before`、`.doc-body .sl-eq-revealed::after` → `content: none`
   - `P > .katex` → `display: inline`；`P > .block-math-inner` → `display: block`（`BlockMath.ts:252`）
   `@media` 不加权重；屏幕是 (0,4,0)/(0,3,0)，print 块在后（`:2464` > `:858`/`:2132`）→ 顺序胜出；旧计划的 `.sl-math-reveal > .katex` 等 (0,2,0)/(0,1,0) 是空操作，**不要写**。新选择器都含 `sl-math-reveal`，`mathStyle.test.ts:47-53` 的 4 块计数不变。
3. `mathStyle.test.ts` 加 2 条机械断言：① 选择器集合逐字相等——`/([^{}]*)\{([^{}]*)\}/g` 切规则、按 `@media print` 括号配对分两侧，取「含 `sl-math-reveal` 或 `sl-eq-revealed`」的选择器按逗号拆、空白归一、排序后 `deepEqual`（各 8 条），再断言 print 起点晚于每个屏幕露出规则起点（简写必红）；② 声明值——4 条 `content: none`、`.katex`=`inline`、`.block-math-inner`=`block`、根块 4 个恢复值、块根 `center`、`.topbar` 仍 `display: none !important`。

验收：`npm test` **576 → 578** 条 0 fail；`node --check .tmp/e2e-r78-a3-print.mjs`；`npm run verify` ≤310,000 B 记实测。真机（CDP 或 ego，第 77 轮先例）：文档 `$\alpha$`、`==高亮==`、`$$\frac{a}{b}$$`（复用 `.tmp/e2e-r74-probe-blockmath.mjs`）→ 光标进行内（`Shift+→`）、块级（`↑`/`↓`）、高亮（`→`×2），先断言 `.sl-math-reveal`、`.sl-eq-revealed` 各 1 → 切 print（`emulateMedia({ media:'print' })`；ego 用 `ego_cdp('Emulation.setEmulatedMedia', { media:'print', features: [] })`）：4 个定界符 `content` 都 `none`；`.katex`/`.block-math-inner` display 非 none、rect 高 > 0；`.topbar` none；切回 screen 后行内 `::after` 非 none。截图 `shots/round-78/print-math.png`。连不上：单测 + verify 通过即收，记 UNVERIFIED「CSS 分支已验、原生打印预览/另存 PDF 未验」。
