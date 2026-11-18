# 第 71 轮 B 轮执行（executor）

结论：B1、B2 均 DONE，未改产品代码（`src/` 无 diff），只新增 `.tmp/` 两份 E2E 与结果 JSON；未改版本/依赖/`release/`。

## B1 · delta 回归（10 分钟盒子）— DONE

`.tmp/e2e-r70-delta-b1.mjs` → `.tmp/r70-delta-b1.json`（58 s）。
- **A2 四场景原样复跑，全 pass**：s1 删脏 b.md 跳过读不出的 big.md 落 a.md（trash 有 `.current.md`）；s2 删 a 落 b、Ctrl+S 只写 b（`opsDuringSave:1`、未建 `未命名.md`）；s3 两候选全读不出→空白 `未命名.md` + 文案含「big1.md 读不出」；s4 删 c 落 b。
- **四格矩阵全 pass**：m1 非活动删除（a.md 脏字不丢；Ctrl+S 只写 a.md；撤销后 b.md 回树、仍 a.md；c.md 表格 1/公式 1）；m2 删唯一文件（空白、撤销重开完整、再写后写回 only.md）；m3 列表态（选中 `b.md`；列表态 `.tree-row-more` 0 个→删除入口 UNVERIFIED；树态删 b 落 c 后切列表选中 `c.md`）；m4 跨目录（删根 a.md→跳过 big.md 落 `sub/c.md`，撤销后树与当前 c.md 不受影响）。
- **写盘 ops/草稿数与改前同**：与第 70 轮 A2 基线逐项相同（s1 5/10、s2 3/4、s3 3/5、`addOps` 2、`opsDuringSave` 1），`opsParity.all:true`、`draftOpsTotal:0`。
- 0 pageerror、0 console error。

## B2 · 跨目录 + 列表态补测 + 尾部抽查 — DONE

`.tmp/e2e-r70-b2-nested.mjs` → `.tmp/r70-b2-nested.json`（15 s）。嵌套 `a.md`、`big.md`（6 MiB）在根，`sub/c.md` 在第二层（flatten `c.md→a.md→big.md`）。
- **n1 根→子目录**：删当前 a.md，big.md 读不出被跳过，落 `sub/c.md`；title `c.md — Sidelight`、`.tree-file.is-active` 为 `c.md` 且 `data-path` 以 `sub/c.md` 结尾、树自动展开 `▾ sub`、正文含「子目录篇」、有撤销；撤销后树恢复 3 文件、当前仍 c.md。pass。
- **n2 子目录→根 + 列表态**：打开 `sub/c.md` 切列表：3 行、选中行路径 `sub/c.md`、删除入口 0（UNVERIFIED，B-102）；回树态删 c.md 落根 a.md；切列表 2 行选中 `a.md`；列表内撤销→3 行恢复、当前仍 a.md；切树态三文件与 `▾ sub` 都回来、正文仍「根目录第一篇」、`sub/c.md` 含「子目录篇」。pass。0 错误。
- **尾部抽查均真实跑**：B-148 `.tmp/e2e-r68-impl-a1.mjs` → `.tmp/r71-spot-b148.json`（54 s，`allPass:true`：1 MB 源码 2 s 内退出只写 1 次、drafts 空；autoSave:false 时 drafts 1、big.md 不变）；B-149 `.tmp/e2e-r68-impl-b2.mjs` → `.tmp/r71-spot-b149.json`（65 s，`allPass:true`：组合输入 Ctrl+S 0 写 +「先完成候选字，再保存。」；提交后写 100,011 B；Esc 退出 1,593/1,594 ms ≤3.4 s、正文含「中」不含 zhong、0 草稿）。

## 门禁

- `npx tsc --noEmit` 0 错误，`.tmp/r71-exec-tsc.log`。
- `npm run verify` **PASS**：首屏 gzip **302,014 B**（余 17,986），`.tmp/r71-exec-verify.log`。
- `npm test` **40 文件 524 条全过 0 fail**，`.tmp/r71-exec-test.log`。
- `roundtrip` 未跑：未改编辑器/序列化。

截图：无（无 UI 改动）。

## 新踩坑

1. **假 FSA 的 `getDirectoryHandle` 要按目录存在返回**：原 fixture 只认 `.sidelight`/`trash`，删子目录文件时 `parentForPath` 抛 `NotFoundError`，toast 成「删除原文件失败」，误判产品删除失败。按 `files` 键前缀 `path + '/'` 判存在。
2. **场景体里读不到 `pageErrors/consoleErrors`**：计数在 body 之后汇总，body 内 `r.pageErrors===0` 恒 false，8 格全假红。改为 `runScenario` 里补判「出错数 0」。
3. **列表态 `snapshot().tree` 恒空**：`.tree-file` 不在 DOM；撤销后核树恢复要先切回树态，列表态只用 `.file-list-row` 判行数与选中。

## UNVERIFIED

- 列表态内删除入口（B-102：列表行只有打开按钮）按计划 UNVERIFIED，不判红。
- 真实 FSA 磁盘（含子目录）与 WebView2 宿主内的删除/撤销（沿用第 70 轮）；假 FSA 不留空目录，n2 删 `sub/c.md` 后 `sub` 消失属 fixture 限制，未作断言。
