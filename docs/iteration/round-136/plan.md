# 第 136 轮计划（B-229：真实首载纳入门禁，压到 ≤320,000 B）· **revision 1**

> **revision 1**（依 `plan-review.md` 的 CR-1~CR-5；单轮 A / 3 任务 / 不新增任务、不扩范围）：CR-2 → A1 只报告、默认门禁不翻；CR-4 → A2 不做 `diffView` 异步化，R3/R4/R5 砍到下一轮（原因 §4）；CR-1/CR-3 的拆分与静态门问题因此不触发（约束与清单留 §4）；CR-5 静态测试排下一轮，本轮靠 A1 的 dist 实测。**本轮不承诺 ≤320,000**（A2 只做 R1/R2，预估 −1,600）。

轮前 `a9f2d50`；只做 B-229。快车道的 B-253 与「联网核对默认自动」不在本轮。

## 1. 真实首载（本轮实测现有 `dist`）

| 口径 | 值 |
| :--- | :--- |
| 门 | **316,131** gzip = index 305,534 + css 10,147 + runtime 450；raw 1,025,609、headroom 3,869、exit 0 |
| 常驻 `MarginRail-mKbKnT4r.js` | raw 22,721 / gzip9 **7,999**（文件数 1） |
| 真实首载 | **324,130**（raw 1,048,330；超硬线 **4,130**） |

常驻只有它：`App.tsx:20` lazy + `:6107-6108` 默认 edit 下无条件挂载，其余 lazy 都有谓词（`:5834` findOpen、`:5979` 需 `sidebarTab==='outline'` 等，已核）；`revisionList` 已按需（`MarginRail.tsx:422`）。`scripts/measure-first-screen.mjs:8-9` 的 7,419 改 7,999。测试基线 69 文件 955 条。

## 2. 阶梯

R1 `searchWeb`（估 −900）+ R2 `collectReviewFiles`（估 −700）→ 预估 **322,4xx–322,9xx**，仍超线。够 4,130 要下一轮：R4 对话面板（估 −2,300）+ R3 三面板（估 −1,200）；`RailSheets` 会静态 import `diffView`，故本轮不异步化它。每档做完 build + measure，报三数。

## 3. 任务

### A1 脚本报告真实首载（默认门禁不动）· `scripts/measure-first-screen.mjs`
- 口径注释改「门 / 真实首载 = 门 + 常驻」，记 316,131 + 7,999 = 324,130。
- 新 `RESIDENT = [/^MarginRail-.*\.js$/]` 扫 `join(dir,'assets')`（`readdirSync`）逐文件 gzip9；打印 `resident raw/gzip/files` 与 `real raw/gzip/headroom`。**`total`/`--max`/`--target`/`banned`/`headroom` 全不动**（默认门禁仍 316,131 ≤ 320,000）。
- `realGzip > max` 只打 `WARN 真实首载 … 超硬线 …，默认门禁仍按旧口径（B-229）`，不改 exit；显式 `--real-max` 才 `FAIL` exit 1（不进 `verify`/CI）。原 `:72-74` 的「首屏」WARN 文案不改（默认口径仍是首屏），新 WARN 用「真实首载」（plan-review P2）。守卫：0 命中 → `FAIL 常驻 chunk 未找到`；入口与常驻重复 → `FAIL 重复计数`；`--no-resident` 复旧口径。新 flag 同步 `positional`（`:19`，第 35 轮坑）。
- 验收（现 `dist`）：默认 **exit 0** 且 `total=316131`/`resident=7999`/`real=324130`/有 WARN 行；`--no-resident` exit 0 且无 real 行；`--real-max 320000` exit 1；临时目录只拷入口产物 → exit 1「常驻 chunk 未找到」。
- `ci.yml:39`、`release.yml:82/155` 走默认口径保持绿；不碰产品代码、`package.json` 不改。

### A2 按需拆 R1/R2，实测一次 · `App.tsx`、`MarginRail.tsx`、`reviewFiles.ts`、新 `lib/reviewScan.ts`、`reviewFiles.test.ts`
- `App.tsx:109` 删 `searchWeb` 静态导入；`:2001`（`verifySources`，async）改 `await import('./lib/search.ts')`（该文件只 `import type`，自成一 chunk）。`:131` 删 `assetFileName, writeAsset` 静态导入；`:5268-5269`（前有 await）改 `await import('./lib/asset.ts')`。
- `reviewFiles.ts`：`collectReviewFiles`（`:139-188`）+ 只服务它的 `atLeast`（`:43`）/`directoryKey`（`:50`）/`DEFAULT_MAX_FILES`（`:39`）进 `reviewScan.ts`；`compareRows`（`:55`，与 `applyLiveReviewRow:106` 共用）留在原文件并导出、`reviewScan.ts` 导入；`hasUnclosedReview`/`countOpenAnnotations`/`REVIEW_MAX_ROWS`/类型同样从原文件导入；`applyLiveReviewRow`/`reviewTruncatedNote` 留原位。`MarginRail.tsx:23-30` 删静态导入，`openReview`（`:443`，async；调用 `:461`）改 `await import('../lib/reviewScan.ts')`；`reviewFiles.test.ts:4` 导入改 `reviewScan.ts`（函数名不变，调用点不动）。
- **不做** `diffView`/`openDiff`（`:20`/`:342`/`:542`）异步化。
- 验收：`npm run build` exit 0；`npm test` 0 fail、69 文件 955 条（条数不变）；静态（`git grep --untracked`）：`App.tsx` 无 `from './lib/search.ts'`/`'./lib/asset.ts'`、两处 `await import(` 各 1；`MarginRail.tsx` 的 `from '../lib/reviewFiles.ts'` 里不再有 `collectReviewFiles`（0）、`await import('../lib/reviewScan.ts')` 1；三数记 `impl.md`。
- 风险：`await import` 失败只让该段不显示（沿用 catch）；新文件未 `git add` 时 grep 恒 0（第 87 轮）。

### A3 门禁、回归、残差（不翻默认口径）· `impl.md`、`.tmp/e2e-r136-a2.mjs`
- `npm run verify` exit 0（门 ≤320,000）；`npm test` 0 fail。
- 条件翻转（唯一允许门禁变红的路径）：**仅当** A2 实测 `real ≤ 320,000`，同一次提交里把 `total`/`headroom` 改「门 + 常驻」并保留 `--no-resident`，再 verify exit 0。
- 未达标（预期）：口径不动，`impl.md` 记三数残差（文件:行号 + 命令 + 数值），B-229 保持 `open`，不写 PASS。
- E2E（ego CDP 57270、1440×900、假 FSA + stub `fetch`）：①「联网核对」出处 ≥2、0 pageerror（验 `search.ts`）；②「在审」面板行数与快照区照旧（验 `reviewScan.ts`）；③对话 2 条切「批注」再切回仍 2 条、`#rail-panel-chat` 仍是 `#rail-tab-chat` 的 `aria-controls` 目标；0 pageerror；截图 ≤2。超时交 tester。

## 4. 边界与收口

- 不 push、不改 `release/`、不加依赖、版本仍 0.32.1；不动编辑器/序列化（`roundtrip` 不跑）；不砍功能。
- 砍掉三档（25 分钟做不完：2 个新组件、搬约 330 行、改 5 个测试文件）：R3 `RailSheets`（估 −1,200）、R4 `RailChatPanel`（估 −2,300）、R5（`styles.css` 死规则 + `revisions.ts` 写侧，估 −1,000）。下一轮做 R4 + R3，并在实测 ≤320,000 的同一次提交里翻默认口径。
- R4 约束（CR-1）：`#rail-panel-chat` 外壳（`MarginRail.tsx:853-859`）与 `turns`/`chatDraft`/`busy`/`send`、回焦贴底 effect 留 `MarginRail`；只搬 `:860-931` 的 JSX 到 `RailChatPanel`（受控 props），首载后保持挂载、切页签只 `hidden`；`:276`/`:324` 的 `getElementById('rail-panel-chat')` 不许 null；验收加「切页签后 turn 数不变」「`aria-controls` 目标存在」。
- CR-3 清单（本轮不改这些文件）：`src/lib/chat.test.ts` 读 `MarginRail.tsx` **8 处**（`:166/:205/:232/:257/:305/:353/:423/:527`；`:325` 是 `assert.ok`，不是第 9 处）→ R4 后 `:205/:353/:423` 与 `:166` 的渲染半段改读 `RailChatPanel.tsx`；`:166` 的 `dropEmptyAssistantTail` 半段、`:257`（`threadInputRef` 追问）、`:527`（`chatContextFor`）不动。`railDiffA11y.test.ts:39/:44/:63`（`rail-diff-rows` 两 ul、`tabIndex={0}` 恰 3）、`railModalGate.test.ts:84`（`createPortal(` 谓词）随 `RailSheets` 改读；`railModalGate.test.ts:92`、`reviewLabelWording.test.ts:41`、`railChatReset.test.ts:39`、`annotations.test.ts:787` 不动。实现后先单跑这 6 个文件再跑 `npm test`。
- CR-5：常驻集合仍是名单式（新常驻 chunk 手加 `RESIDENT`）；「`App.tsx` 每条 `<Suspense>` 都有状态谓词」「`MarginRail` 不许再静态 import 大模块」的静态测试（照 `katexLazy.test.ts` 挂 `npm test` 链尾）排下一轮。
- 与快车道「联网核对默认自动」串行：同改 `verifySources`（`App.tsx:1988-2013`），本轮只动 `:2001` 先落地；该条后做，冲突时两边语义都留。
- B-229 补第 136 轮三数；是否 `fixed` 由 lead 定；本轮仍 >320,000 就如实记残差、保持 `open`。