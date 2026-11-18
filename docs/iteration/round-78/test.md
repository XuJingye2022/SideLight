# 第 78 轮验收报告（tester）

- startSha `00e47daf59b7856aad46266d76240b7a58063a72`（=HEAD）；未 push、未改 `release/`。
- 本轮 3 个 P2：A1/B-209（脚本断言过期）、A2/B-208（改名提示借刷新文案）、A3/B-160（打印露出定界符）。
- 环境：dev `http://localhost:5175` 200；CDP 9222–9226 **全无监听**（各探 1 次）。真机改用 ego-browser 自带 CDP `http://127.0.0.1:54280`（`ego_doctor`：`port=54280 pid=90032 alive=true`），未重试。
- 独立验收：未读 `impl.md`；门禁与 3 个 e2e 全部自跑，未引用实现方日志结论。

## 门禁

- `npm test`：**45 文件 578 条 0 fail**（基线 576，A3 +2）；`.tmp/r78-tester-npm-test.log`。
- `npm run verify`：build 通过，首屏 gzip **303,764 B**（≤310,000，余 6,236）`PASS`；`.tmp/r78-tester-verify.log`。
- `node --check scripts/bigfile-acceptance.mjs` / `scripts/keyboard-acceptance.mjs` / `.tmp/e2e-r78-a2-rename.mjs` / `.tmp/e2e-r78-a3-print.mjs` 全 exit 0。
- roundtrip 未跑（未改编辑器/序列化）。

## A1 / B-209：两条验收脚本断言过期

- 真实运行（ego CDP 54280）：
  - `SIDELIGHT_URL=http://localhost:5175 SIDELIGHT_CDP=http://127.0.0.1:54280 node scripts/bigfile-acceptance.mjs` → **3/3 PASS exit 0**；`.tmp/r78-tester-a1-bigfile.log`。超限提示实测「big.md」超过 5.5 MiB，仍在「未命名.md」。
  - `SIDELIGHT_CDP=http://127.0.0.1:54280 node scripts/keyboard-acceptance.mjs http://localhost:5175` → **52/52 PASS exit 0**；`.tmp/r78-tester-a1-keyboard.log`。
- 静态对照（按文件，非按处）：`文件太大` **1（HEAD）→ 0**；`5.5 MiB` **0 → 3**（bigfile）；keyboard 的 `waitForFunction` **0 → 1**，且该行带 `.catch(() => {})`（`scripts/keyboard-acceptance.mjs:179`）。`git diff` 与 plan 一致：只动 `:127` 断言与 `:176` 前的等待，strike/picker 段未动。
- 跑完 `git checkout -- shots/round-05/` 已还原 3 张被覆盖截图（`git status -- shots/round-05` 空）。
- 判定：**B-209 可标 fixed**（真机两脚本全绿）。

## A2 / B-208：改名成功提示

- 真机（ego CDP 54280）自跑 `.tmp/e2e-r78-a2-rename.mjs` → **11/11 PASS exit 0**；`.tmp/r78-tester-a2-rename.log`。假 FSA 下 b.md→c.md 后 `.toast-text` = 「已重命名：b.md → c.md」，含「已重命名」「b.md」「c.md」、不含「已刷新」；树 `["a.md","c.md"]`、假盘键同步；再打字 `Ctrl+S` 后文档名 `c.md`、写进 `c.md` 含新字、`b.md` 键不存在；0 pageerror。
- 静态按行：`git grep -n announce -- src/App.tsx` **0（HEAD）→ 6 行**，含 `:679`/`:682` 类型、`:2736` 判据、`:2824` `announce: false`；`已刷新：新增` 仍 **1 行**（`src/App.tsx:2736`），文案未改。
- 已知残留（计划审查 P2-3，不阻塞）：改名时若已有一次刷新在飞，在飞那次用旧 options 仍可能并列一条「已刷新」。
- 判定：**B-208 标 fixed**。

## A3 / B-160：打印露出定界符

- 独立静态断言（自写 `.tmp/r78-tester-css-check.mjs`，不引用实现方测试）：屏幕露出规则 **10 条原始 / 8 条唯一**（`:858` 的共用规则与 `:865`/`:869` 各给一次，去重后 8）；print 块 **5 个规则块 / 8 条唯一**，与屏幕集合**逐字相等**（`setsEqual:true`）；print 起点晚于每一条屏幕规则；4 个定界符选择器 `content: none`；根块 4 恢复值 `inherit/inherit/inherit/normal`；块根 `center`；`.katex` `inline`；`.block-math-inner` `block`；全文只有 1 个 `@media print`。`.tmp/r78-tester-css-check.json`。
- 单元测试：`mathStyle.test.ts` 新增 2 条（选择器集合 + 声明值），并入 `npm test` 578 条 0 fail。
- 真机（ego CDP 54280）自跑 `.tmp/e2e-r78-a3-print.mjs` → **17/17 PASS exit 0**；`.tmp/r78-tester-a3-print.log`。`Ctrl+A` 同时露出 2 处公式 + 1 处高亮 → 切 print 媒体：4 个定界符 `content='none'`、`.katex` display=inline 13×25、`.block-math-inner` block 1440×38、块根 center、顶栏 none、露出态等宽字体回正文；切回 screen 行内 `::after` 仍是 `"$\\alpha$"`、KaTeX 又收起；0 pageerror。截图 `shots/round-78/print-math.png`（15,082 B，可见居中分式与行内 α，纸上无 `$…$`/`==`）。
- 判定：**B-160 标 fixed**；**UNVERIFIED**：原生打印预览 / 另存 PDF 未跑（只切 `emulateMedia({media:'print'})`），属于同一 CSS 分支之外的浏览器打印管线。

## 回归

- `keyboard-acceptance` 52/52 为本轮相关既有脚本，覆盖焦点/skip link/菜单/表格/公式/链接/toast 等 52 条，无回归。
- 3 个 e2e 均 0 pageerror。

## 结论

**PASS-WITH-UNVERIFIED**：3 个任务的验收项真机全绿（含 4 个交付脚本 `node --check`）；门禁 test 578/0、verify 303,764 B；唯一未验项是原生打印/PDF 管线。A1/A2/A3 对应 BACKLOG 行（B-209/B-208/B-160）均为 fixed，证据与本报告一致。
