# 第 84 轮测试报告（tester 独立验收）

- 结论：**PASS**
- 轮前 `startSha` = `5760913db30d02a865748f08756021f8bfae8e1a`；环境：dev 5175 → 200；CDP 9222–9226 实测无监听（`Get-NetTCPConnection` 全 none），改用 ego 浏览器 CDP `127.0.0.1:54280`（`ego_doctor`：pid 90032 alive）。
- 未读 `impl.md`。真机脚本为 tester 自写：`.tmp/r84-tester-e2e.mjs` → `.tmp/r84-tester-e2e.json`（21/21 PASS，0 pageerror）。夹具名与计划不同（p.md / q.md / lit.md），断言按 `plan.md` 口径重写。

## 门禁

| 门 | 命令 | 结果 |
| :--- | :--- | :--- |
| 测试 | `npm test`（`.tmp/r84-tester-test.log`） | **49 文件 637 条 0 fail**（基线 47/601） |
| 构建 + 首屏 | `npm run verify`（`.tmp/r84-tester-verify.log`） | PASS，gzip **306,003 B** ≤ 310,000（余 3,997） |
| 往返 | `npm run roundtrip`（`.tmp/r84-tester-roundtrip.log`） | rich **7/9**、source **9/9**、首存拦 **1/9**；`09-link-title.md` 完全保真 |

## A3 B-214 行内语法手打不渲染（串行 1）

- 单测：`inlineSyntax.test.ts` 20 → **30** 条 0 fail（`npm test` 日志）；`npx tsc --noEmit` 由 `verify` 的 build 覆盖，0 错。
- 静态（按 HEAD 对照）：HEAD `git grep -n addInputRules HEAD -- src` = 0（exit 1）→ 工作树 `src/lib/inlineSyntax.ts:128` 1 处；`markInputRule` HEAD 0 → 工作树 import `:1` + 调用 `:130`。
- 真机（硬门，tester 自跑，空文档手打 `==红== 与 ^上^ 与 ~下~`）：`.sl-eq` / `.sl-sup` / `.sl-sub` = **1 / 1 / 1**，可见文本 `红 与 上 与 下`（定界符全被吃掉）；`Ctrl+S` 落盘 **逐字节 = `==红== 与 ^上^ 与 ~下~\n`**（定界符补回，无 `sl-eq` 类名泄漏）。
- 开关闸门：单测「关态规则 find 恒 null」通过；`App.tsx` 传 `() => inlineSyntaxRef.current` 与解析同一闸门（diff 核对）。

## A1 B-124 手打链接存成字面（串行 3）

- 单测：`linkInput.test.ts` **16 条** 0 fail（≥13），含 3 负向：点段尾（含 1b 纯选区）、整段粘贴、旧字面链接里插字；另覆盖 `javascript:`/`data:`/`vbscript:`、图片、空文字、危险字符、目标带括号。
- 两探针字节一致：① roundtrip rich 路径 `09-link-title.md` 完全保真（=原文件）；② 真机手打 `[乙](https://example.com "标题")` 后 `Ctrl+S` 落盘 = `[乙](https://example.com "标题")\n`，**无 `\[`**。两处字节相同。
- 真机 link mark：`a` 1 个、可见文本只剩「乙」、`href=https://example.com`、`title=标题`。
- 负向真机：旧文档字面链接（磁盘 `\[乙\](https://example.com)\n`）鼠标点段尾后 `Ctrl+S` → toast「没有改动，未写入。」、文件字节不变、仍 0 个「乙」链接。
- 静态：`appendTransaction` HEAD `git grep` 0（exit 1）→ 实现见 `src/lib/linkInput.ts:128`；`git grep` 默认不搜未跟踪文件，commit 时 `git add -A` 后复核。

## A2 B-142 撤销入口被下条通知顶掉（串行 2）

- 单测：`restoreEntry.test.ts` **10 条** 0 fail（≥8）。
- 静态：`restoreDeleted` 在 `App.tsx` **4 处**（≥3）；`.status-restore` 在 `StatusBar.tsx` 4 处、`styles.css` 5 处。
- 真机四步（同一页，q.md 先弄脏）：
  1. 删 q.md → toast「已移到回收站：q.md｜撤销」与状态栏 chip「已删除 q.md｜撤销｜×」同在；
  2. 在 p.md 打字 `zz` + `Ctrl+S` → toast 变「已保存 p.md」，**chip 仍在**，「撤销」36×24、× 24×24；
  3. 点 chip「撤销」→ 树回 q.md、chip 消失、toast「已恢复 q.md」、读回 q.md 字节 = 删除前脏正文 `# 乙\n\n乙篇正文。脏T\n`（未断言编辑器切到哪篇）；
  4. 再删 p.md → chip 出现；点「新建文件」→ chip 消失。
- 窄窗 `setViewportSize(1000×620)` 生效（innerWidth=1000）：`documentElement.scrollWidth-clientWidth` = **0**（body 也 0），chip 两钮 36×24 / 24×24，全 ≥24×24。1440×900 同测得 0 溢出。

## 回归

- 真机同页 `0 pageerror`；console 4 条 404 资源错误经 `.tmp/r84-tester-404.json` 定位全部是 `/__doc`（tester 脚本自己 route 成 404 的宿主文档桩，两次 page load 各 2 条），与本批功能无关。
- 既有脚本 `scripts/keyboard-acceptance.mjs http://localhost:5175`（`SIDELIGHT_CDP=http://127.0.0.1:54280`，`.tmp/r84-tester-keyboard.log`）：**52/52 PASS**，exit 0（智能标点/输入规则/表格 Tab/视图切换/保存失败 live region 全绿）；脚本覆盖的 `shots/round-05/` 3 张截图已 `git checkout --` 还原。

## 备注

- A2 验收原文「`npm test` 48 文件」、A3「47 文件」是本任务单独计的口径；本批三任务合计按计划为 **49 文件**（A3 47 + A2 1 + A1 1），实测 49/637 一致。
- `verify` 只剩 3,997 B 余量，下一批加静态代码前先算体积（沿用第 71 轮口径）。
- 未验：真 IME / 真 WebView2 宿主 / 原生打印（与本批不相关）。
