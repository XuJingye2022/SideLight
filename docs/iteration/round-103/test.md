# 第 103 轮 tester 独立验收（PASS）

- 范围：A1 在审列表当前篇那行的 open/total 以内存 annotations 为准（渲染时合并）；A2 真机复现 + 体积记账。轮前 `startSha 08f6581`。tester 未读 `impl.md`，只读 `plan.md`、plan-review、diff、BACKLOG。
- 环境：dev `http://localhost:5175`（未起/未重启）；真机 ego 浏览器 CDP `57270`（9222–9226 无监听）；1440×900。

## 1. A1 代码与单测

- 静态对照：`git grep -cE 'applyLiveReviewRow|countOpenAnnotations' -- src` 改后 **13 行/3 文件**（MarginRail 3、reviewFiles.ts 3、test 7）；HEAD 同命令 **exit 1 / 0 行**。正向对照 `git grep -cE 'collectReviewFiles' -- src` = **19 行/3 文件**（≥6 门槛满足）。
- `node --experimental-strip-types src/lib/reviewFiles.test.ts` → **17/17 exit 0**（原 13 + 新 4：同 path 替换并按 open 重排且入参不改、磁盘缺行时补行、total=0 / live=null 原样返回、50 行截断与 truncated 同 collect 口径）。
- 接线核对：`src/lib/reviewFiles.ts:55-93` 的 `countOpenAnnotations`（collect 那 4 行改用它，口径单一）与 `applyLiveReviewRow`（path 过滤后 push、`compareRows` 重排、超 `DEFAULT_MAX_ROWS` 截断、`truncated` 或运算）；`src/components/MarginRail.tsx:334-343` 的 `liveReviewRow`（`activePath && annotations.length>0` 才造）与 `reviewRows`；空态分支已按 plan-review CR-2 改判 `reviewRows`（`:844-849`），四字段与控制流全部走合并后结果。

## 2. A2 真机（两条旧日志 + 邻篇 + 新条目）

- 交付脚本复跑 `node .tmp/e2e-r103-review-live.mjs`（`SIDELIGHT_CDP=57270`，输出改指 `.tmp/r103-tester-a2.json`）→ **19/19**、0 pageerror：S0 基线 a `open 1 · 共 2 条` / d `open 2 · 共 3 条`；T2 改 open→resolved 后 **150 ms 开面板** a 行 `open 0 · 共 2 条`，停 **1,800 ms 仍同值**，`aria-current` 在、sub/b 行不变、冲刷后磁盘 a.json 也 0 open；S2 三张里改一张 → **63 ms** 得 d `open 1 · 共 3 条`；S3 新造 1 条后 **63 ms** 开面板 e 行 `open 2 · 共 2 条`，此刻磁盘 e.json 仍只 1 条（内存合并的直接证据）；关掉再开同值。
- tester 自写 `.tmp/r103-tester-e2e.mjs`（独立夹具 + 断言，ego CDP 57270）→ **26/26**、0 pageerror（`.tmp/r103-tester-e2e.json`）：基线 cur `open 2 · 共 3` / other `open 2 · 共 3` / sub/other `open 1 · 共 1` 且排序正确；改档后 150 ms 开面板 cur `open 1 · 共 3`，停 1.8 s 同值，**当前篇只 1 行（替换不是追加）**，合并后重排为 other(2) → cur(1) → sub/other(1)；S2 other 改一张 200 ms 内 `open 1 · 共 3`；`new.md` **磁盘还没有 new.json** 时行已出现 `open 1 · 共 1`（补行分支）；cur/other 旧值未受邻篇影响；关掉再开四行同值。
- 改前对照（区分力）：临时 `git checkout HEAD -- src/lib/reviewFiles.ts src/components/MarginRail.tsx`，dev 交付 `reviewFilesHasMerge=false`，跑 `.tmp/r103-tester-before.mjs` → 同场景改档后 **269 ms** 开面板行仍 `open 1 · 共 2 条`（磁盘旧值，exit 0）；还原两文件后 SHA256 与改前一致、diffstat 仍 125+/13−（`.tmp/r103-tester-before.json`）。

## 3. 门禁与体积

- `npm run build` exit 0（tsc + vite + host-www 镜像 98 文件）。`npm test` **61 文件 865 条 0 fail**（基线 861，+4）。
- `node scripts/measure-first-screen.mjs --max 320000` **PASS**：gzip **315,151 B**（plan 315,155 ±100 内；距硬线 4,849；raw 1,022,459）。
- 常驻 chunk `dist/assets/MarginRail-CHiz4Kh1.js` raw 18,946 / gzip9 **6,700**（HEAD 6,573，+127，≤6,980）。真实首载 = 315,151 + 6,700 = **321,851**（超硬线 1,851；B-229 仍 open，本批 +127 只记 B-229）。
- roundtrip 未跑（未动编辑器/序列化）。

## 4. 回归

- `SIDELIGHT_CDP=57270 node .tmp/e2e-r101-review.mjs` → **57/57 PASS**（在审面板行/截断/三支提示/空态/1024 抽屉全过）。跑完 `git checkout -- shots/round-101/`（两张已还原，工作树干净）。

## 5. 判定与说明

- **PASS**。判据：门禁全过、验收标准逐条复验、改前/改后对照有判别力、无回归。
- plan 未给 BACKLOG ID（plan-review CR-4）；本轮补 `B-231` 行并标 `fixed`，lead 可改号。
- 已知边界（计划 §3 风险 3）：内存 `total=0` 时保留磁盘行（写盘可能还在飞），关掉重开即真值；载入期 `annotations` 未恢复不造行。
- 偏差：交付 A2 脚本的 T2 未带「同一刻磁盘仍旧」断言（我的探针读盘时 600 ms 防抖可能已冲刷，属测法问题非产品问题，改为 S3 磁盘无档证据）；其余与验收一致。
- UNVERIFIED：真实 FSA 写回（假句柄）、真 WebView2 宿主、真实中文 IME、原生打印；dev 5175 由根代理起，未重启。
- 证据：`.tmp/r103-tester-{a2,e2e,before}.{log,json}`、`.tmp/r103-tester-{build,npmtest,r101}.log`；截图 `shots/round-103/review-live.png`（a 行 open 0 · 共 2 条、当前行高亮、卡片 Resolved）。
