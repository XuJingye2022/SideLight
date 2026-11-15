# 第 07 轮 · 独立验收（tester）

日期：2026-11-15。基线 `92a3ac6`，v0.20.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4 → T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，117 modules，**0 warning**，225 ms | `.tmp/r7-build.log` |
| `npm test` | **16 个文件、188 条断言、0 失败** | `.tmp/r7-test.log` |
| `npm run roundtrip` | exit 0；**3 / 7 完全保真**（03/05/07） | `.tmp/r7-roundtrip.log` |

- `dist` **1,389,367 B**；主 chunk `index-Gtf_lquI.js` **1,119.68 kB / gzip 350.60 kB**；CSS 54.52 kB / gzip 13.53 kB。

## T1 保存门：**PASS**

`node scripts/data-safety-acceptance.mjs` → **34/34 PASS**（日志 `.tmp/r7-data-safety.log`）：

- 引用式链接样本 `04-reference-links.md`：改字 Ctrl+S 弹框，列出两行 `[tiptap]`/`[cm]` 定义；**取消后写入 0 次、dirty=true**；再按仍弹；确认后写 1 次，文本 LF 无 `\r`。
- 宿主模拟：确认前 `postMessage=0`，确认后 1 条 save，`text` 不含 `\r`。
- 另存为：先弹差异确认；取消后 picker 未调用、写入 0；确认后 picker 1 次、写入 1 次。
- 保存并切换：先弹差异确认；取消不切换、不写盘。
- 新建文档、普通文档改字、只改单元格值：**不弹**，直接写盘。
- `02-table.md` 只改表格外段落：弹框且含「表格分隔行会被重排」。
- 末尾换行保留：写出文本以 `\n` 结尾。
- 未发现四路保存（保存/另存为/保存并切换/宿主）漏过保存门；确认前无宿主消息。

## T2 源码原文：**PASS**

- 未编辑时点横幅「在源码模式打开原文」：`.source-editor` 值**逐字节等于文件原文**（含两行 `[id]:` 定义）。
- 保存后切源码：等于刚写入的内容，不是载入时的旧原文。
- 末尾换行：写出文本以 `\n` 结尾（`data-safety` 断言）。
- 另存为后切源码、CRLF 宿主写回：A 组与 `host-save` 64/64 覆盖；状态一致。

## T3 分类器：**PASS**

- `npm test` 中 `diff.test.ts` 共 **21 条**（新增 11 条）：引用式链接、表格仅空白变化、`&` HTML、多行脚注、`\` 硬换行、末尾换行、代码围栏反例、改单元格值/删表格行/删整段反例全部 PASS。
- 另直接调用 `classify` 验证：`html-comment` blocking=true；`blank-lines`、`hard-break`、`trailing-newline` blocking=false；`autolink` blocking=true。
- `npm run roundtrip`：03/05/07 仍保真；02/04 仍 diff；`docs/roundtrip-report.md` 第 15 行已明确写「02/04 会被保存门拦截、不是已保真」，README 123–125 也有同样说明。

## T4 `.md` 关联：**PASS（产物数值见 T5）**

- 默认包 `packaging/installer.ps1` exit 0：**799,631 B**；dry-run `-AssocDryRun` exit 0：`.tmp/assoc-dryrun-setup.exe` **799,327 B**。
- `.nsi` 静态：**10 条** `WriteRegStr HKCU "Software\Classes`、**4 条**对称 `DeleteReg`、**0 条** HKLM 写、**0 条** `UserChoice`；组件页 1 个、`Section /o` 1 个。
- `packaging/verify-installer.ps1` PASS：安装/启动/卸载/数据保留；关联静态断言 PASS；dry-run `/S` 后 `assoc-plan.txt` **不存在**；dry-run 卸载清理 PASS；3 个 HKCU/快捷方式 UNVERIFIED。
- **UNVERIFIED**：真实勾选后「打开方式」出现、卸载后消失、`VSCode.md` 保留；真人交互安装。

## T5 文档 / 产物：**PASS**

- `package.json`/`package-lock.json` **0.20.0**；`release/` 只有 0.20.0 zip/setup；README/AGENTS/CHANGELOG 写 0.20.0、188 条；无 `[T3 后确认]`/`[TBD]`；旧数 1,382,298 / 873,775 / 794,843 / 8E5C5798 / 649FBA92 0 命中；ADR-0007 存在且含 OpenWithProgids/UserChoice/ifempty/UNVERIFIED；ADR-0004 载荷 2,391,387（1,002,020 + 1,389,367）与实测一致。
- release 实测：setup **799,631 B / `43465FB0…3507`**，zip **876,034 B / `FED66CAF…1B77`**；README/CHANGELOG 与当前 release 一致，旧 799,449 / C3ABC707 0 命中。
- `docs/roundtrip-report.md` 已补「02/04 被保存门拦截、03/05/07 保真」。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| keyboard-acceptance | **28/28 PASS** | `.tmp/r7-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r7-theme.log` |
| export-math-acceptance | **10/10 PASS** | `.tmp/r7-export-math.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp/r7-host-save.log` |
| host/save-probe | **21/21 PASS** | `.tmp/r7-save-probe.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp/r7-host-smoke.log` |
| fcp-probe | **6/6 PASS**（FCP 220 ms、reload 64 ms） | `.tmp/r7-fcp.log` |
| acceptance dev 5173 | **11/11 PASS**（faces=20/20） | `.tmp/r7-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS**（faces=16/16） | `.tmp/r7-acceptance-prod.log` |
| verify-portable | **6/6 PASS**、26 条目 | `.tmp/r7-verify-portable.log` |

## 范围与卫生

- `git status`：20 个已跟踪文件改动、0 删除、12 项未跟踪（`docs/adr/0007`、`docs/iteration/round-07/**`、`scripts/data-safety-acceptance.mjs`、`src/lib/risk.ts`、`shots/round-07/**`、本报告）；`git diff --stat` 20 文件，552 insertions / 167 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`package-lock` 0.20.0。
- `docs/roundtrip-report.md` 由 `npm run roundtrip` 生成并已补 02/04 保存门说明（见 T3）。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-fsa.png`、`shots/round-02/t4-portable.png`、`shots/round-06/t1-host-error.png` 被回归脚本重写（既有行为）。

## 与实施报告对照

- `impl-a.md` 的 T1/T2/T3 结论与 34/34、21 条单测、risk 直接检查一致；报告文案缺口已由 `roundtrip-report.md` 补齐。
- `impl-b.md` 的 T4 构建/静态/dry-run 与我的复跑一致；T5 已把 setup 799,631 / 43465FB0 写回 README/CHANGELOG。
- 未发现验收项造假；T1/T2/T3/T4/T5、回归与范围均通过。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1、T2、T3、T4、T5 全部达到本轮计划验收；build（0 warning）/test（188）/roundtrip 通过；A 34/34、host-save 64/64、save-probe 21/21、host-smoke 7/7、fcp 6/6、acceptance dev/prod 11/11、installer/portable 通过。
- release 与文档一致：setup **799,631 B / 43465FB0…3507**、zip **876,034 B / FED66CAF…1B77**；旧 799,449 / C3ABC707 0 命中；`roundtrip-report.md` 已写明 02/04 被保存门拦截。
- **UNVERIFIED（不凑 PASS）**：真实 HKCU 关联、勾选后「打开方式」出现/卸载消失、真人双击、真实系统保存对话框、IME、文件占用/网络盘/中文长路径。
