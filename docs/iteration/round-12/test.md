# 第 12 轮 · 独立验收（tester）

日期：2026-11-16。基线 `6bd6831`，v0.25.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4/T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，125 modules，**0 warning**，206 ms | `.tmp/r12-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r12-test.log` |
| `npm run roundtrip` | exit 0；**rich 5/7、source 7/7、firstSaveBlocked 1/7** | `.tmp\r12-roundtrip.log` |

- `dist` **1,427,617 B**；首屏 `index-BDXAkU9R.js` 886,956 raw / gzip 277,570 B，CSS 31,100 / 6,564 B；首屏合计 **284,134 B**（`.tmp/r12-measure.log` PASS）。

## T1 文件树：**PASS**

`node scripts/tree-acceptance.mjs` → **40/40 PASS**：

- 删除 a.md → trash 出现 `20261116-032237-26q5i6-a.md`，SHA-256 与源一致，原路径不存在，toast「已移到回收站：a.md」+「撤销」；撤销回原位、trash 清空。
- 无 `move` 时 copy 回退成功；复制校验失败保留原文件且 trash 无残留；同一秒两个同名文件随机后缀不同不覆盖；父目录同名文件不互相影响；`x:y.md` 清洗后可删；新建文件夹成功，重名提示「已存在同名文件夹」。
- `.sidelight` 是文件时「＋ 新建」disabled 且 title 说明；示例态整宽「打开文件夹…」且无删除入口。
- 删当前文档后自动保存不复活、不写回原路径；慢写期间删除仍不复活；外部删除/改名刷新提示「只能另存为」，Ctrl+S 不写旧路径；删最后一篇回到空「未命名」。
- 目录行无删除项由 `FileTree.tsx` 代码路径确认（目录不渲染删除菜单）；未单独运行时断言。

## T2 复活防护：**PASS-WITH-UNVERIFIED**

- `tree-acceptance` 40/40 覆盖：删除后 3 s 自动保存写 0 次、原路径不存在；慢速在飞 auto 删除后仍不复活；撤销 move 回原名；外部删除/改名后 Ctrl+S 不写旧路径；删最后一篇状态正确。
- **未在 40 项中单独断言**「刷新进行中恰有 auto 排队」的写入次数；`App.tsx` 的 `refreshingRef`、`deletingRef`、generation 检查存在，属代码核对，未做该时刻的运行时注入。
- **UNVERIFIED**：真实右键/确认框、trash 手动恢复、OneDrive/网络盘、并发删除同一文件。

## T3 可访问性：**PASS-WITH-UNVERIFIED**

- `tree-acceptance` 40/40：`role=tree/treeitem`、活动项 `aria-selected=true`、树内 **1 个 tab 站**；ArrowDown/Home/End、ArrowRight 展开、ArrowLeft 收起、Delete 弹确认；常驻 `[aria-live]` **1 个**且视觉 toast 不是 live region；FindBar 三按钮 aria-label。
- **未在 40 项中单独运行时断言** Enter 打开、Tab 不困住、Shift+F10、目录行无删除；`FileTree.tsx` 代码已写这些分支（`Enter`、`Tab` 不拦截、`F10/shift`），属代码核对。
- 侧栏 `tablist` 与大纲 `aria-current` 本轮**延后并已记录**（`tree-acceptance` 输出「可延后项」、ADR-0013/CHANGELOG）；按计划不计本轮达标。

## T4/T5 文档 / 产物：**PASS**

- 版本/lock **0.25.0**；release 只有 0.25.0：zip **897,251 B / `9DBC71B0…8248`**、setup **815,683 B / `BEAADB7A…696F`**；安装包比内部预算 815,000 高 **683 B**，CHANGELOG 已写、硬线 850,000 未破。
- README/AGENTS/CHANGELOG 的 0.25.0、205、284,134、1,427,617、两个 SHA 与 ADR-0004 载荷 **2,448,069 B** 均对；ADR-0013 含「只删文件」「move」「SHA-256」「不自动清理」「UNVERIFIED」；`[TBD]` 0。
- `docs/CHANGELOG.md` 无字面 `\n`；0.25/0.24/0.23 标题各自独立成行，标题前有空行；0.25 条目包含树操作、trash 边界、可访问性、预算 +683 与 SHA。
- 其余旧数（1,413,750 / 891,471 / 811,756 / E06F2E2E / 4F06530B）在 0.25 条目 0 命中；历史 0.24 条目保留 282,809 属正常。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| acceptance dev 5173 | **11/11 PASS**（改用「打开文件夹…」+ 假文件夹） | `.tmp\r12fix-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp\r12fix-acceptance-prod.log` |
| fidelity-acceptance | **19/19 PASS** | `.tmp\r12-fidelity.log` |
| math-ready-acceptance | **11/11 PASS** | `.tmp\r12-math-ready.log` |
| keyboard-acceptance | **28/28 PASS** | `.tmp\r12-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp\r12-theme.log` |
| draft-acceptance | **58/58 PASS** | `.tmp\r12-draft.log` |
| recent-acceptance | **57/57 PASS** | `.tmp\r12-recent.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp\r12-host-save.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp\r12-host-smoke.log` |
| fcp-probe | **6/6 PASS** | `.tmp\r12-fcp.log` |
| verify-installer 0.25.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp\r12-verify-installer.log` |
| verify-portable | **6/6 PASS**、32 条目 | `.tmp\r12-verify-portable.log` |

- acceptance 已改用「打开文件夹…」并注入假文件夹，dev/prod 均 11/11；tree 40/40。

## 范围与卫生

- `git status`：51 个已跟踪文件改动（含回归脚本重写的历史截图）、0 删除、14 项未跟踪（`docs/adr/0013`、`docs/iteration/round-12/**`、`scripts/tree-acceptance.mjs`、`src/lib/trash.ts`、`shots/round-12/**`、本报告）；`git diff --stat` 51 文件，698 insertions / 186 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`package-lock` 0.25.0；`tree-acceptance` 40/40。

## 与实施报告对照

- `impl-a.md` 的 T1/T2 40/40 与实测一致；T3 的侧栏/大纲延后已记录，Enter/Tab/F10 分支在代码中存在但未在 40 项中运行时断言。
- `impl-b.md` 的数字与产物一致；CHANGELOG 的 0.25 段已恢复真实换行，0.24/0.23 标题独立。
- 未发现验收项造假；T1 40/40、T4/T5 与全部回归通过。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1 文件树 40/40、T4/T5 文档与产物通过；T2/T3 受 40 项覆盖范围的限制，保留两项 UNVERIFIED，不影响本轮功能结论。
- 回归：acceptance dev/prod **11/11**、fidelity 19/19、math 11/11、keyboard 28/28、theme 16/16、draft 58/58、recent 57/57、host-save 64/64、host-smoke 7/7、fcp 6/6、installer/portable PASS。
- 复验修复：`docs/CHANGELOG.md` 无字面 `\n`，0.25/0.24/0.23 独立成段；acceptance 改用「打开文件夹…」+假文件夹注入，grep 无「试用示例」调用。
- **UNVERIFIED**：T2 刷新进行中恰有 auto 排队的注入时刻；T3 的 Enter/Tab/F10/目录无删除未在 40 项中单独运行时断言（代码已写）；真实右键/确认框、trash 手动恢复、OneDrive/网络盘、并发删除、屏幕阅读器实录、HKCU/双击/IME。
