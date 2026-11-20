# 第 110 轮计划审查（critic，revision 1）

结论：**PASS**（P0/P1 = 0；下列 5 条 P2 不阻塞执行，建议 executor/tester 顺手吸收）。

## 上一版 2 条 P1 已修

- **P1-1 已修**：A3 ①/② 明写禁止无参跑 `.tmp/e2e-r107-targets.mjs`，改跑 `.tmp/r107-tester-geom.mjs`。复核：该脚本无 phase、`SIDELIGHT_CDP` 默认 57270、只写 `.tmp/r107-tester-geom.json` + `shots/round-107/targets-{chat,notes}.png`（`:293,298`），不读 `r107-targets-before.json`；`.tmp/r107-tester-geom.log` 末尾确为 `== 23/23 pass, 0 fail ==`。空 PASS 风险消除。
- **P1-2 已修**：A3 ④ 加 `git checkout -- shots/round-100 shots/round-101 shots/round-107` + `git status --porcelain` 断言。复核 `git ls-files`：三目录分别 1/2/2 张，正好是被覆盖的三组；`.tmp/` 在 `.gitignore:8`，备份文件不影响 status。
- **P2-1 已修**：A2 删 `::before{inset}` 退路，改「CSSOM 打印生效整块 → 只改命中那条」。复核 `src/styles.css:1332-1343` 现为 `.rail-diff-open, .rail-review-open { … min-height: 24px; … }`，无 `height`；`touchTargets.test.ts:76-87` 按块取声明 → A2 的负向对照（把该块改回 `height:16px`）确实会让单测红（`targetSizes` 收 `height`，`pxValue(16)<24` → `deepEqual` 失败），修法自洽。
- **P2-2 已修**：§1 与 A2 验收统一为 `315,260 = 315,220+40`。
- **P2-3 部分修**：A1 改为复用 CDP override + 回读 `innerWidth`，叙述不再自相矛盾；残留见下 P2-1。

## 已核事实

- HEAD `09d72f6`；`npm test` 基线 62 文件 877 条、门的 gzip **315,220 B**（`docs/iteration/round-109/test.md:12-13`），与 §1 一致。
- A3 三个脚本最后一次全过就是 r107（`r107` 日志 23/23、43/43、57/57）；其后 r108 只改 `.rail-chat-log` 的 `aria-live`/`aria-busy`、r109 只改 `src/lib/revisions.ts`，geom 脚本不引用这两处 → 期望值漂移概率低。

## P2（可改可不改）

1. **A1 的视口引用行号错、参数不全**：计划写 `.tmp/e2e-r107-targets.mjs:63-66`，实际 `newCDPSession`/`setViewport` 在 **`:59-62`**；`Emulation.setDeviceMetricsOverride` **必须带 `deviceScaleFactor:1, mobile:false`**，只传 `{width,height}` 会 CDP 报参数错误。修法：行号改 `:59-62` 并写全四参。
2. **A3 的「先 `node --check`」查不出选择器漂移**：`node --check` 只验语法；计划又说「命中不到先改脚本再判产品」，等于就地改证据脚本。修法：A3 ①②③ 先于 A2 跑一遍存 HEAD 基线；红项用 `git log`/`git diff a8ffa57..HEAD` 归因到具体提交，单列 BACKLOG，不就地改脚本。
3. **A2 路径缺截图、与 A3 的 status 断言冲突**：A2 触发即界面变（钮 16→24），AGENTS §3 要求截图，但 A3 断言只许 `?? docs/iteration/round-110/` + ` M BACKLOG`（+CSS/test），没有 `?? shots/round-110/`。修法：A2 触发时存 `shots/round-110/targets.png`，A3 断言加该路径；或明写「沿用 r107 已提交的 24px 截图为证、本轮不新增」。
4. **A3「`npm test` 与 A1 台账逐字一致」与 A2「test 只可加强」冲突**：A2 若新增 `test()`，条数 >877，逐字比对必红。修法：A3 改「文件数 62 不变、条数 ≥877 且与 A2 记载一致」。

## 范围提醒（不阻塞）

B-236 已在第 107 轮 `fixed`（BACKLOG:118），A1 实测 24 时本轮 **0 产品改动**，只复测 + 台账；当前唯一 `open` 是 B-229（门 315,220 + chunk 6,779 = **321,999**，超硬线 1,999）。「队列每条单独一轮」不冲突，但请 lead 知道本轮不产出修复，B-229 需要另轮。
