# 第 10 轮 · 独立验收（tester）

日期：2026-11-16。基线 `24bb46a`，v0.23.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4/T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，120 modules，**0 warning**，251 ms | `.tmp/r10-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r10-test.log` |
| `npm run roundtrip` | exit 0；**rich 5/7、source 7/7、firstSaveBlocked 1/7** | `.tmp/r10-roundtrip.log` |

- `dist` **1,408,866 B**；主 chunk `index-CiRTwjkA.js` **1,137.18 kB / gzip 355.77 kB**；CSS 56.52 kB / gzip 13.91 kB。

## T1 表格 02 保真：**PASS**

`node scripts/fidelity-acceptance.mjs` → **19/19 PASS**：

- 02：`serializeDocumentBody` 103/103、`serializeDocument` 103/103、App 写出 103/103，三处逐字节相同且等于原文；App 不弹确认。
- 01：保存不弹确认、字节 143/143 等于原文。
- 改单元格：不弹确认，保留改后的字，分隔行退让为规范格式。
- 单测（`diff.test.ts` 30 条）：改值/加列/删行/改对齐均不重用；围栏假表不算；同表头多表按序号配对；`\|` 转义；表格前后空行不属于表格块。
- `table-separator` 已 `blocking:false`；02 基线无保存门。

## T2 空行 01：**PASS**

- 01 保存字节 **143/143** 等于原文（含 frontmatter 后空行）。
- `frontmatter.test.ts` 16 条：`leadingNewlines` 0/1/2/3；0/1/2/3 split→join 逐字节；空正文不补；不传 leading 与旧版相同。
- 06：报告明确「多 1 个空行、taskList/bulletList schema 互斥、不修、二次往返收敛」（`docs/roundtrip-report.md:49`）；无保存门。

## T3 引用式链接默认源码：**PASS-WITH-UNVERIFIED**

- 19/19：载入 04 即 `source`；`.source-editor` 137/137 等于原文（含两行定义）；源码未编辑 Ctrl+S 写出 137/137 等于原文且非空。
- 源码改字 → 点「回到富文本编辑」弹确认；取消仍在源码、内容与 dirty 不变；确认后回 `edit`；切回首次保存仍被拦。
- 宿主真实入口（`.tmp/host-a` + `fixtures/markdown/04-reference-links.md`）：`source=true`、text 137/137 等于原文、标题 `04-reference-links.md — Sidelight`、说明条为「源码模式 · 文件原文」。
- 浏览器 fidelity 的 `.source-note` 初始文本已改为「源码模式 · 文件原文」，与宿主真实入口一致；不再误判 dirty。字节与保存结果正确。
- **UNVERIFIED**：真实宿主源码保存字节、3 个空行解析上限、真实 HKCU/双击/IME。

## T4/T5 版本 / 产物 / 文档：**PASS**

- 版本/lock **0.23.0**；release 只有 0.23.0：zip **889,108 B / `4208F677…`**、setup **810,456 B / `11E37B5E…`**；ADR-0004 载荷 **2,429,318 B**（1,020,452 + 1,408,866）；ADR-0010/0011 存在；旧数 0、`[TBD]` 0；`__slMarkdown` 0 命中。
- README:139 / CHANGELOG:12 / ADR-0010 的 rich 均为 **5 / 7**，与 `docs/roundtrip-report.md` 汇总一致；CHANGELOG:13 的 JS **1,137,183 B**、CSS **56,524 B** 与当前 dist 一致。
- README/AGENTS/CHANGELOG 的 0.23.0、205、两个 SHA、ADR-0004/0010/0011 一致；`verify-installer` PASS。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| draft-acceptance | **58/58 PASS**（换 autolink 样本并兼容源码视图） | `.tmp\r10fix-draft.log` |
| recent-acceptance | **57/57 PASS** | `.tmp\r10-recent.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp\r10-host-save.log` |
| keyboard-acceptance | **28/28 PASS** | `.tmp\r10-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp\r10-theme.log` |
| export-math-acceptance | **10/10 PASS** | `.tmp\r10-export-math.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp\r10-host-smoke.log` |
| fcp-probe | **6/6 PASS** | `.tmp\r10-fcp.log` |
| acceptance dev 5173 | **11/11 PASS**（dialog 修复后） | `.tmp\r10fix-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp\r10fix-acceptance-prod.log` |
| verify-installer 0.23.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp\r10-verify-installer.log` |
| verify-portable | **6/6 PASS**、26 条目 | `.tmp\r10-verify-portable.log` |

- 复验修复：draft 已换 autolink 样本并兼容源码视图，58/58；acceptance dialog 只对真实触发回应、prompt 打桩，dev/prod 11/11；源码说明条未编辑显示「文件原文」；README/CHANGELOG/ADR-0010 的 rich 5/7、JS 1,137,183 / CSS 56,524 已对齐。

## 范围与卫生

- `git status`：28 个已跟踪文件改动、0 删除、14 项未跟踪（`docs/adr/0010/0011`、`docs/iteration/round-10/**`、`scripts/fidelity-acceptance.mjs`、`src/lib/serializeDocument.ts`、`src/lib/tableReuse.ts`、`shots/round-10/**`、本报告）；`git diff --stat` 28 文件，495 insertions / 375 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`__slMarkdown` 0 命中；`package-lock` 0.23.0。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-{window,fsa}.png`、`shots/round-02/t4-portable.png`、`shots/round-06/t1-host-error.png` 被回归脚本重写（既有行为）。

## 与实施报告对照

- `impl-a.md` 的 T1/T2 结论与 19/19、30 条表单测、frontmatter 16 条一致；T3 的宿主真实入口也通过。
- `impl-b.md` 的产物/SHA/ADR 结论与实测一致；README/CHANGELOG 的 rich 与 JS/CSS 值已修正为 5/7、1,137,183 / 56,524。
- 未发现验收项造假；T1–T5 与全部回归通过。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1 表格 19/19、T2 空行 01 143/143、T3 源码 19/19 + 宿主真实入口；T4/T5 0.23.0/205、三栏 5/7/7/1、体积/SHA/ADR 全部对齐；`npm test` 205。
- 回归全部通过：draft 58/58、recent 57/57、host-save 64/64、keyboard 28/28、theme 16/16、export 10/10、host-smoke 7/7、fcp 6/6、acceptance dev/prod 11/11、installer/portable PASS。
- 复验修复：draft 换 autolink 并兼容源码；acceptance dialog 只对真实触发回应、prompt 打桩；源码说明条未编辑显示「文件原文」且不再误判 dirty；文档 rich/JS/CSS 已对齐。
- **UNVERIFIED**：真实宿主源码保存字节、3 个空行解析上限、真实 HKCU/双击/IME、真实重启列表、网络盘失效。
