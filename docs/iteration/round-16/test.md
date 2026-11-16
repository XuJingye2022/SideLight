# 第 16 轮 · 独立验收（tester）

日期：2026-11-16。基线 v0.29.0，v0.30.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 200；CDP 9222。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，127 modules，**0 warning**，223 ms | `.tmp/r16-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r16-test.log` |
| `measure --max 285000` | **PASS**；首屏 **284,210 B**（余 790 B） | `.tmp/r16-measure.log` |

## P0 大纲页签与树：**PASS**

`node scripts/tree-acceptance.mjs` → **49/49 PASS**：

- 树滚动到 **148** → 切「大纲」：`.file-tree` computed `display:none`、height 0、40 个 `treeitem` 仍在 DOM；大纲顶 y=122、页签底=120（差 2px）；切回「文件」`scrollTop` **148→148**，行数与展开态保持。
- 1440/1024、浅/深截图与展开态未回归；`[hidden]{display:none!important}` 生效。

## A11y（T2/T3）：**PASS**

- `theme-acceptance` **27/27 PASS**；`keyboard-acceptance` **35/35 PASS**：
  - `.tiptap` 有 `aria-label="正文编辑器"`；保存失败 toast `role=alert` 且文本含原因；一次 notice 只有 **1** 个 live region；toast 按钮在 `role=group`、`aria-hidden` 内可聚焦元素 **0**。
  - 深色采纳 8.05、hover 9.9、分析 7.56、hover 10.04、danger 7.52/6.92、输入边界 3.64、焦点 10.04；源码框只 inset 2px；reduced-motion 1e-05s。
  - 三个常驻横幅 `role=region`（只读/结构风险/源码说明）；正文/源码/输入焦点环实测可见。
- **48 组矩阵（当前 `theme-acceptance`）**：`applicable=43/48 excluded=5 failed=0`；排除项逐条：toast-1/2/3（opacity 0 / 未挂载）、disabled-button（opacity 0.4 / disabled，WCAG 对比度不适用）、analyze-bubble（display:none / 零尺寸）。浅/深各 48 个样本，适用项全部通过。
- P2 延后项已在 README/CHANGELOG 记录（骨架 dialog/aria-busy、批注卡 Enter、正文开头 Tab 回环），不计本轮。

## 发布 / 文档：**PASS**

- Release **v0.30.0** 已发布；资产 setup **817,983 B**、win zip **902,274 B**、mac universal **890,004 B**、`SHA256SUMS-0.30.0.txt` **308 B**；三文件 SHA256 与 checksum **全部一致**。
- mac zip 含 `Sidelight.app` + `README.txt`（2,367 B）；Mach-O fat **2 片**，cputype **0x1000007 / 0x100000C**；`Info.plist` 13.0/图标；Release body **「未签名、未公证」signing=adhoc**。
- 文档：README/AGENTS/CHANGELOG **0.30.0**、首屏 **284,210**；无 `[TBD]`、无 `Sidelight-0.29.0-win` 旧包名；P2 延后记录完整；ADR 0015 存在。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| acceptance dev / prod | **11/11 / 11/11** | `.tmp/r16-acceptance-dev.log`、`-prod.log` |
| tree-acceptance | **49/49** | `.tmp/r16-tree.log` |
| keyboard-acceptance | **35/35** | `.tmp/r16-keyboard.log` |
| rename-acceptance | **22/22** | `.tmp/r16-rename.log` |
| newfile-acceptance | **23/23** | `.tmp/r16-newfile.log` |
| fidelity-acceptance | **19/19** | `.tmp/r16-fidelity.log` |
| math-ready-acceptance | **11/11** | `.tmp/r16-math.log` |
| theme-acceptance | **27/27**（43/48 适用、5 排除、0 失败） | `.tmp/r16fix-theme.log` |
| draft-acceptance | **58/58** | `.tmp/r16-draft.log` |
| recent-acceptance | **57/57** | `.tmp/r16-recent.log` |
| host-save-acceptance | **64/64** | `.tmp/r16-host-save.log` |
| host-smoke --fsa | **7/7** | `.tmp/r16-host-smoke.log` |
| fcp-probe | **6/6** | `.tmp/r16-fcp.log` |
| verify-portable 0.30 | **6/6**、34 条目 | `.tmp/r16-portable-030.log` |
| verify-installer 0.30 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r16-installer-030.log` |

## 范围

- `git status`：24 个已跟踪截图改动（回归二进制）、0 删除、9 项未跟踪（`docs/iteration/round-16/**`、`shots/round-16/**`、本报告）；`git diff --stat` 24 文件 45 insertions/0 deletions。
- `release/`、`dist/`、`.tmp/`、`host/bin/` 未入库；无密钥/证书/调试残留；0.30 资产在 `.tmp/r16-release`（本机复制到 release 仅用于验证，release 忽略）。

## 与实施报告对照

- `impl-a.md` 的 tree 49/49、keyboard 35/35、theme 27/27 与实测一致；48 组样本按新口径为 **43/48 适用、5 排除、0 失败**（排除隐藏 toast、disabled、零尺寸 bubble），适用项全过。
- `impl-b.md` 的 0.30 资产/文档与 Release 一致；48 矩阵的适用项 gate 成立。
- 未发现验收项造假；P0、A11y、Release、文档和全部代码回归通过。

## 最终判定

**PASS-WITH-UNVERIFIED**

- 门禁：build 0 warning、205 条、首屏 **284,210 B ≤285,000**。
- P0 tree **49/49**；A11y theme **27/27**（43/48 适用、5 排除、0 失败）+ keyboard **35/35**；Release v0.30.0 资产/checksum/Universal 通过；Windows 回归全过。
- **UNVERIFIED**：真实读屏、Windows 高对比度、macOS 真机、真实签名/公证、P2 延后项、真实 IME/网络盘。
