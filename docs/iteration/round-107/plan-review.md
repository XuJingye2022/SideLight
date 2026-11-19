# 第 107 轮计划审查（critic · revision 1，取代 revision 0 的 REVISE）

**结论：PASS。** P1-1 与 P2-2～P2-6 已逐条修掉；剩 3 条 P2 只影响日志/注释，不阻塞执行。

## 复核（自测＋读码，非引用）
- 体积：`node scripts/measure-first-screen.mjs` 实测门 gzip **315,158 B**（304,686+450+10,022，余硬线 4,842；超内部预算 5,158 只 WARN）。`--max 315300` 现存余 142，按计划 +5 → 315,163、余 137，cap 与硬线都不破。常驻 chunk 6,762 是 round-106 基线（B-229 open），非本单引入。
- 测试：`round-106/test.md` 记 61 文件 869 条；`package.json` test 链 `--experimental-strip-types` 恰 61 处；新文件 3 条 → 62/872，数对。
- 落点：`styles.css:1234-1241` 的 `.rail-head` 无 height；`:1332-1343`（两入口同一块、`height:16px`）、`:1492-1499`（reset 无最小高）行号对；`*{box-sizing:border-box}`（`:131`）→ min-height 24 即总高 24。抽屉 head 由 `.rail-close`（基础 button padding 5/10 + 12.5px 字，≈30）撑着，两钮 24 不改它，计划「抽屉不变高」成立。
- 静态门：`min-height: 24px` 现 8 行；含 `height: 16px` 的 3 行（`:1336`、`:1968` 的 min-height、`:3634`）→ 改后 10/2，数对。
- P1-1 已修：r100 的 16px/底断言只有 `:379`/`:424`/`:427`/`:428`（`check(` 43 条），r101 只有 `:297`/`:333`/`:427`（57 条）；A2.4 七处齐。`:427` 改判所需 `geo.headHeight`/`geo.chromeBottom` 脚本里已有（`:400`/`:404`），可落地。`:425` tabGap=tabs.bottom−head.bottom，两边同增 8 → 39 不变；`:429` 是下界；`:431` 末卡与整体评价都随 flowBottom +8（`App.tsx:2449-2482` 的 railSpace 补偿），不会红。
- P2-2：顺序明写 A2.1→A1→A2.2；1440×900 与 r100/r101 同口径（`Emulation.setDeviceMetricsOverride`），门槛为增量或视口无关值。OK。
- P2-3/4/5/6：注释整段重写（16→24、+8、39、59→67）；删「height:24px」退路；两张截图；B-236 已在 BACKLOG（planned，记 35×16/35×16/52.5×21）。
- 环境：dev 5175=200、CDP 57270=Edge 157，A2 可跑。

## 新漏洞（P2，不阻塞）
- **P2-1** `MarginRail.tsx:371` 的 `{/* …16px 高… */}` 改后为假；计划以「改它动常驻 chunk」为由不改，但生产构建剥注释、chunk 字节不变，理由不成立。修：同批改「24px 高」，重建后复核 chunk 仍 6,762。
- **P2-2** 只改断言值不改标签：r100 `:379`/`:424`/`:428`、r101 `:297`/`:333`/`:427` 的日志仍打「高 16」，test.md 抄日志会自相矛盾。修：标签同步改 24。
- **P2-3** A1 验收「`git diff` 只 3 文件」不准确：新测试文件未跟踪，`git diff` 只见 2 个（styles.css、package.json）。修：改 `git status --short` 期望 3 条（2 M + 1 ??）。

## 备注
- 任务书 312,423/余 7,577 已过期（计划已指出）：门 315,158/余 4,842。B-229（门+chunk 321,920 超硬线 1,925）仍 open，本单 +5 计入其口径，未新增违规。
- r102–r106 复核：只有 r102 读 `.rail-head` 的计数文本、r104 用相对 flowBottom/tabsBottom，无写死 16/58/59.5/410.19，计划判断成立。
