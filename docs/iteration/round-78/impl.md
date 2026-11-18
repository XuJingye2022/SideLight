# 第 78 轮 A 轮实现报告（executor）

- 起点 `00e47daf…`（=HEAD）；0.32.1；未 commit/push、未动 `release/`。
- 真机：CDP 9222–9226 无监听，但 **ego 浏览器 CDP `http://127.0.0.1:54280` 可用**（探一次即通），三任务的浏览器项全部跑通。

## A1（B-209）断言过期 — DONE（3/3 + 52/52）
- `scripts/bigfile-acceptance.mjs:127-136`：断 `5.5 MiB`+`超过 5.5 MiB`+`big.md`，删「文件太大」（实际文案 `「big.md」超过 5.5 MiB，仍在「当前篇」`，`src/App.tsx:2549`）。
- `scripts/keyboard-acceptance.mjs:174-179`：取基线前 `waitForFunction(() => !document.querySelector('.toast'), null, {timeout:5000}).catch(() => {})` 等 `ttl:1500` 旧提示过期；`.catch` 必须在（error 无 ttl，超时会中断整段）。
- 真机：bigfile **3/3** exit 0（`.tmp/r78-a1-bigfile.log`）、keyboard **52/52** exit 0（`.tmp/r78-a1-keyboard.log`）、两脚本 `node --check` exit 0；跑完 `git checkout -- shots/round-05/` 已还原 3 张。静态：`文件太大` 1→0、`5.5 MiB` 1→3、`waitForFunction` 0→1。

## A2（B-208）改名提示借刷新文案 — DONE（11/11）
- `src/App.tsx`：`refreshTree` 加 `announce?: boolean`（`:679`/`:683` 类型同步），`:2736` 改 `&& options?.announce !== false`；`handleRenamedFile` `:2824-2825` 传 `announce:false` 后 `show('已重命名：b.md → c.md')`，依赖补 `show`；其它调用不动。
- `.tmp/e2e-r78-a2-rename.mjs`（复用 r58 假 FSA）→ `.tmp/r78-a2-rename.json`：toast 含三名、不含「已刷新」，树 `[a.md,c.md]`，之后打字 `Ctrl+S` 落 `c.md`、b.md 键不存在、0 脚本错误。
- 静态：`announce` 0→6 行（含 `announce: false`）；`已刷新：新增` 1→1。

## A3（B-160）打印打进露出定界符 — DONE（单测 4/4 + 真机 17/17；原生打印预览 UNVERIFIED）
- `src/styles.css:2527-2554`：打印块补 8 条恢复规则——4 个定界符 `content:none`、`.katex`=inline、`.block-math-inner`=block、根块 4 个 inherit + white-space normal、块根 center。选择器逐字照屏幕 `:858`/`:2132`。
- `src/lib/mathStyle.test.ts` +2 条：选择器按逗号拆/空白归一/Set 去重后逐字相等（屏幕原始 10 条→唯一 8 条，直接比会假红）、print 起点晚于每条屏幕规则；声明值逐项。**故障注入已验**：删 `.katex` 恢复规则两条新测试都红，还原后绿。
- 真机 `.tmp/e2e-r78-a3-print.mjs` → `.tmp/r78-a3-print.json`：`Ctrl+A` 同露 2 处公式 + 1 处高亮 → print 媒体下 4 个定界符 `content='none'`、`.katex` inline、`.block-math-inner` block 且有高、块根 center、顶栏 none；切回 screen 行内 `::after` 仍 `"$\alpha$"`。截图 `shots/round-78/print-math.png`。
- UNVERIFIED：原生打印预览/另存 PDF（只切 print 媒体）；`dist` minify 后 5 条 print 规则齐全。
- BACKLOG：P2 表末补 B-160（fixed，含行号与 UNVERIFIED）。

## 门禁
- `npx tsc --noEmit` exit 0；`npm test` **45 文件 578 条 0 fail**（`.tmp/r78-impl-test.log`；+2）；`npm run verify` **PASS** 首屏 gzip **303,764 B**（≤310,000，余 6,236；上轮 303,667）。`.tmp/r78-impl-verify.log`。
- `npm run roundtrip` 未跑：未改编辑器与序列化。

## 改动文件
`src/App.tsx`、`src/styles.css`、`src/lib/mathStyle.test.ts`、两 acceptance 脚本、`BACKLOG.md`。

## CHANGELOG 建议
修复：改名后提示「已重命名：旧名 → 新名」，不再借「已刷新」文案。

## 新踩坑
1. **`@media print` 恢复规则写简写是空操作**：屏幕露出规则 (0,3,0)/(0,4,0)，`@media` 不加权重，简写 (0,2,0) 压不住 `display:none`；必须逐字复制屏幕选择器靠顺序胜出。
2. **露出类装饰化验要一次把三处同时选中**：公式「相交」、`==`「相交或贴边」，`Ctrl+A` 一次即可；分三次挪选区时没露出的那处 `content` 也是 `none` → 假绿。
3. **别把验收要数「0 命中」的串写进注释**：本轮 `文件太大`、`已刷新：新增` 都被注释带成 1 命中。
