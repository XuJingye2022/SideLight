# 第 71 轮 B 轮独立验收（tester）

轮前 startSha `612e370`（与 HEAD 一致）；本轮无产品代码改动（`git diff --stat` 空）。B1/B2 均为独立复跑，dev 5175 未重启；每次 E2E 前 `node .tmp/reset.mjs 9222`。

## 门禁
- `npm run verify` exit 0，首屏 gzip **302,014 B**（内部 310,000 / 硬线 320,000，余 17,986；`node scripts/measure-first-screen.mjs` 单独复测同值，`target=310000 gap=7986`）。日志 `.tmp/r71-tester-gates.log`。
- `npm test` exit 0：**40 文件 524 条全过，0 fail**（同日志）。
- `roundtrip` 未跑：无 `src/` 改动。

## B1 · delta 回归（10 分钟盒子）
`node .tmp/e2e-r70-delta-b1.mjs 9222`（57.9 s，未超盒子）：`passAll:true`、8/8 场景 `pass:true`、`opsParity.all:true`（9 项与第 70 轮 A2 基线逐项同值：s1 5/10、s2 3/4、`opsDuringSave:1`、s3 3/5、`addOps:2`、s4 3）、`draftOpsTotal:0`、pageerror 0、控制台 error 0。结果 `.tmp/r70-delta-b1.json`，stdout `.tmp/r71-tester-b1-run.log`。
- A2 四场景：s1 删脏 b（下一个 6 MiB 读不出）**67 ms** 出撤销并切 `a.md`（title/active 一致），trash 有 `.current.md`，撤销后 b 回树且含「脏Q」；s2 删 a **56 ms** 切 b，`Ctrl+S` 只写 b（1 op），未建 `未命名.md`；s3 两候选全读不出 **84 ms** 空白 `未命名.md` + 撤销 + toast 含「big1.md 读不出」；s4 删 c **50 ms** 切 b。
- 四格矩阵：m1 非活动删除 8 ms，当前 a 脏字不丢、`Ctrl+S` 只写 a、c.md 表格 1 / 公式 1；m2 删唯一文件 59 ms，空白 + 树空 + 撤销后重开内容完整、保存写回 only.md；m3 列表态 62 ms，列表无删除入口（`.tree-row-more` 0）记 UNVERIFIED，树态删 b 落 c 后切列表 2 行选中 c；m4 跨目录 106 ms，删根 a 跳过读不出的 big 落 `sub/c.md`，撤销后树与当前 c 不受影响。每格 pageerror / console error 均 0。

## B2 · 跨目录 + 列表态补测 + 尾部抽查
`node .tmp/e2e-r70-b2-nested.mjs 9222`（15.3 s）：`passAll:true`、0 错误。嵌套工作区：根 `a.md`/`big.md`、第二层 `sub/c.md`；初始树 `[a.md,big.md]` + `▸ sub`。
- n1 根→子：删当前 a，big 读不出被跳过，**73 ms** 出撤销；title `c.md — Sidelight`、`.tree-file.is-active` 为 `c.md`、`data-path` 以 `sub/c.md` 结尾、树自动展开 `▾ sub`、正文「子目录篇」；撤销后树 `[c.md,a.md,big.md]`、当前仍 c、正文不变。
- n2 子→根 + 列表：打开 c 切列表 3 行（`sub/c.md` 相对路径、选中行 `aria-current=true`），删除入口 0（UNVERIFIED）；树态删 c **57 ms** 落根 a（title/active 一致）；切列表 2 行选中 `a.md`；列表内撤销恢复 3 行、选中仍 a、切树后 `▾ sub` 与三文件回来、正文仍「根目录第一篇」，`c.md` 原文 `# 丙\n\n子目录篇\n` 不变。
- 尾部抽查（未超时即跑）：B-148 `.tmp/e2e-r68-impl-a1.mjs` 53.5 s `allPass:true`（6/6：1 MB 源码 2 s 内退出只写 1 次盘、drafts 空；等 3.4 s 退出仍 1 次；autoSave:false 草稿 1、big.md 不变）；B-149 `.tmp/e2e-r68-impl-b2.mjs` 64.6 s `allPass:true`（A1/A2/B1/B2 各 8 项：组合中 Ctrl+S 0 写 + 提示、提交后写 100,011 含「中」无 `zhong`、Esc 退出 **1,606 / 1,609 ms** 写盘）；两者 0 控制台错误。结果 `.tmp/r71-tester-spot-b148.json`、`.tmp/r71-tester-spot-b149.json`。

## 回归
`node .tmp/e2e-r70-impl-a1-after.mjs`：24 采样 23 条 `undo:true`（首条为删除前采样）、toast「已移到回收站：b.md」、title/active `a.md`、`errors:[]`，与第 70 轮同口径，无回归。

## 判定
**PASS-WITH-UNVERIFIED**：B1/B2 验收项全部成立，门禁通过，未发现回归。
UNVERIFIED：① 列表态删除入口（B-102：列表行只有打开按钮，B1/B2 实测入口 0，按计划不判红）；② 真实 FSA 磁盘（含子目录）与 WebView2 宿主内的删除/撤销/列表态（假 FSA 无权限模型，且不留空目录）；③ B-149 的真实中文 IME（CDP `imeSetComposition` 合成组合，沿用第 69 轮）。
