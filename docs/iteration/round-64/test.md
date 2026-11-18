# 第 64 轮测试报告（tester）

- 轮前 startSha `368431c`；本轮 A1（B-115）、A2（B-137）；未读 `impl.md`，只读 `plan.md`、`git diff`、`BACKLOG.md`。
- 环境：dev 5175、CDP 9222；E2E 前均 `node .tmp/reset.mjs 9222`。dev server 实测交付新模块（`sourceScrollTopRef` / `source-hidden` / `data-outline-id` 均命中）。

## A1｜B-115 源码态保留编辑器，按实测重定门槛

独立跑 `.tmp/e2e-r53-tester-a1v2.mjs`（exit 0），本轮 JSON 另存 `.tmp/r64-tester-a1.json`。

| 验收项 | 门槛 | 实测 |
| :--- | :--- | :--- |
| big.enterTotal.p50 | ≤1,500 | **1,210**（p95 1,372 / min 993）PASS |
| big.exitTotal.p50 | ≤600 | **298**（p95 338）PASS |
| longTasksEnter / Exit | 无 >2,500 | max **1,177** / **218** PASS |
| scrollDiff | 全 0 | 7 轮全 0 PASS |
| shapeOk | true | true PASS |
| inSrc.display | 每轮 grid | 7/7 grid（hidden 7/7 true、pmVisible 7/7 false）PASS |
| srcHash | 1557349733 | 7/7 同值 PASS |
| parse | 3→3 | 3→3 PASS |
| preview.pmCount | 0 | 0（previewPmCount 1）PASS |
| consoleErrorCount | 0 | 0 PASS |
| small.enterTotal.p50 / exitTotal.p50 | ≤200 / ≤200 | **120**（p95 129）/ **54** PASS |

- 执行方同脚本读 1,234 / 302。
- 机制：`src/App.tsx:5625` 编辑块常驻 + `hidden={sourceMode}`；`:575`/`:580`/`:4399` 进源码前记 `scrollTop`，`:4376` 双 rAF 还原（`:4424` 只在退出到编辑时调）；`src/styles.css:326` 用 `display:grid !important` 盖过全局 `[hidden]`，高/padding 归零 + visibility/scale。
- 功能 `.tmp/e2e-r53-tester-func.mjs`（exit 0）：源码态 `hidden=true`、textarea 聚焦、对编辑器 `focus()` 后焦点仍是 textarea；源码打「第三段新内容。」→ `Esc` → 正文含该段、焦点回 `.ProseMirror`；再进源码 = 当前正文；`Ctrl+Shift+P` 进预览 `pmCount=0` / `previewPanes=1`，回编辑 `pmCount=1`、`ce=true`；0 控制台错误。
- `Ctrl+Z`：按既有设计源码写入 `addToHistory:false`，撤销后正文仍含新内容 —— 只记录，不判红（与验收口径一致）。

## A2｜B-137 大纲跟随当前章节

独立跑 `.tmp/e2e-r64-impl-a2-outline-follow.mjs`（exit 0）：**26/26 PASS**，`failed=[]`、`errors=[]`（`.tmp/r64-impl-a2-outline-follow.json`、`.tmp/r64-tester-a2.log`）。

- 改前：容器 `scrollTop=0`、当前条「甲章」、目标「第40节」rect 1298–1322 在容器（box 120–872）**外**。
- 点正文 h2「第40节」（先只滚 `.doc-scroll`、再 `page.mouse.click` 矩形中心）后：`scrollTop=466`、当前条=第40节、rect 832–856 **全在容器内（±1）**、焦点不在 `.outline`、`window.scrollY=0`。
- 点正文 h1「甲章」：`scrollTop=0`、当前条甲章、在容器内。手滚 200 → 500 ms 后仍 200（不被抢）。
- 折叠「第40节」后 h3 行消失、当前条移到祖先；再点正文 h3：祖先自动展开、h3 行回到容器内（832–856）、当前条=第40节小节。
- 截图 `shots/round-64/a2-outline-follow.png`（本次运行写入，1440×900，72,614 B）。
- 单测：`src/lib/outline.test.ts` 新增 `nearestScrollTop` 4 条（下方/上方/已可见含 ±1/滚到尽头与零高夹取）；实现 `src/lib/outlineTree.ts:79`，组件 effect `src/components/Outline.tsx:51-79`（容器取 `parentElement`、单 rAF、padding 盒、面板不可见跳过；未用 `querySelector` / `scrollIntoView`）。

## 门禁

- `npm run verify` **PASS**：首屏 gzip **300,971 B**（内部 310,000 / 硬线 320,000，余 19,029），主 chunk `index-BNliILov.js` 931.64 kB raw / 295.64 kB gzip、`files=3`（`.tmp/r64-tester-verify.log`）。
- `npm test` **40 文件 517 条 0 失败**（轮 63 513 条，+4 = `nearestScrollTop`）（`.tmp/r64-tester-test.log`）。
- `roundtrip` 未跑：diff 不涉 Markdown 序列化与编辑器 schema（`App.tsx` 只动视图挂载与滚动还原、CSS 只加 `.source-hidden`、大纲三文件纯前端），与第 63 轮同口径。

## 回归

- `scripts/keyboard-acceptance.mjs http://localhost:5175`：**51/52**，唯一 FAIL「Ctrl+Shift+S 不出现新的已保存/已取消提示」= 既有过期断言 B-209（第 51 轮起 ttl 1.5 s 的「没有改动，未写入。」），本轮 diff 不碰该路径；跑完已 `git checkout -- shots/round-05`（`.tmp/r64-tester-kb.log`）。

## 判定

**PASS-WITH-UNVERIFIED**（A1、A2 验收全过；门禁过）。

流程注记：计划要求执行前在 `BACKLOG.md` 加 `B-137`，执行方未加，本报告补行并按 `fixed` 记录；a1v2 写死 `.tmp/r53-a1-tester-v2.json`，本次覆盖其第 53 轮同名证据（执行方已先覆盖），本轮证据另存 `.tmp/r64-tester-a1.json`。

UNVERIFIED：真宿主 WebView2 内 1 MB 进出源码与滚动还原；真实中文 IME 下的源码态切换与 `Esc`；150% / 200% 缩放下的 `.source-hidden` 与 scroll 还原；大纲跟随在真实 FSA / 更长文档（夹具 1.2 KB、51 行）下的表现。
