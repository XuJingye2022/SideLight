# 第 20 轮 · 最终验收（tester）

日期：2026-11-16。v0.30.2，HEAD/tag 提交 `ab7aaea`。本机 Windows；未改产品代码、未 commit。只做最终独立验收，报告写本文件。

## 1. 门禁：PASS

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0，127 modules，0 warning | `.tmp/r20-build.log` |
| `npm test` | 16 文件、205 条、0 失败 | `.tmp/r20-test.log` |
| `measure --max 285000` | PASS，首屏 **284,723 B**（≤285,000） | `.tmp/r20-measure.log` |

文档/Release 写 **284,730**，本机当前构建 **284,723**（差 7 B，方向保守）；不改变门禁结论。

## 2. 草稿修复：PASS

- `draft-acceptance` **61/61**：保存成功序列 `["draft-save","save","draft-clear"]`；保存中继续输入**不发** `draft-clear`、dirty 仍 true；其余 57 条原有用例通过（`.tmp/r20-draft.log`）。
- `host-save-acceptance` **64/64**（`.tmp/r20-host-save.log`）。
- `newfile` **23/23**、`stale` **4/4**、`bigfile` **3/3**（6.1 MiB 拒绝、5.2 MiB 允许、5.5 MiB 文案）。

## 3. 回归

- acceptance **dev 11/11**；prod 复跑时 CDP 9222 连接超时，**UNVERIFIED**（0.30.1 同一前端曾有 11/11）。
- tree **49/49**、theme **27/27**（43/48 适用、5 排除、0 失败）、keyboard **35/35**、rename **22/22**、newfile **23/23**、fidelity **19/19**、math **11/11**、recent **57/57**、host-smoke **7/7**、fcp **6/6**：这些为 0.30.1 末次日志（0.30.2 仅草稿清理改动）；tree/theme/keyboard 在 0.30.2 的再次复跑被 CDP 超时挡住，标 **UNVERIFIED**，不冒充新跑。
- portable/installer **0.30.2**：portable 6/6；installer 装/启/卸/数据保留 PASS，HKCU/快捷方式 3 项 UNVERIFIED。

## 4. 文档诚实性：FAIL

- README 5.5 MiB 口径、PRIVACY 草案、SECURITY 无死标签、FCP「本机一次测量」均对；Release body 有「未验与已知限制」与签名状态。
- **失败点**：CHANGELOG 0.30.2（`:10`、`:26`）仍含 **4.47**；Release body 同样写「4.47–6.77 ms」。用户要求「性能数字无 4.47/1078」，字面未清。`1078` 仅历史条目，当前 Release 不主张；但 4.47 仍在当前版本文档/正文。
- 首屏文档 284,730 与本机 284,723 差 7 B（非阻断，但应回填实测）。

## 5. 发布：PASS

- Release **v0.30.2** 已发布：setup **818,476 B**、win zip **902,772 B**、mac universal **890,504 B**、`SHA256SUMS-0.30.2.txt` **308 B**；三文件 SHA256 与 checksum **全一致**。
- mac zip 含 `Sidelight.app` + `README.txt`；Mach-O fat **2 片**（x86_64 `0x1000007` / arm64 `0x100000C`）；body 有未验/已知限制与 signing 注释；Windows setup/portable 0.30.2 本机验证 PASS（HKCU/快捷方式 UNVERIFIED）。

## 6. 仓库 / 20 轮证据：FAIL

- HEAD `ab7aaea` = `v0.30.2^{}` 提交；`out/`/`release/`/`dist/`/`.tmp/`/`host/bin/` 未入库；无证书/密钥。
- **工作区不干净**（验收结束时）：`M src/App.tsx`（未提交的 derive 计时器/300 ms 派生优化，42 insertions/36 deletions）、`?? docs/iteration/round-19/findings-bug.md`、`?? docs/iteration/round-20/`。该 App.tsx 改动不在 `v0.30.2` tag 内，也未进入本轮 build/measure 结果；不能按「git status 干净」记。
- **缺失**：`docs/iteration/round-19/plan.md`、`round-19/test.md`、`round-20/plan.md`；`round-20/test.md` 由本次验收生成。round-19 只有 brief/findings；round-01..18 的 plan/test 存在。
- **STATE 只有第 1–16 行**；第 17–20 轮的行未补，发布状态没有到 0.30.2。用户要求 STATE 行 1–20 与发布状态更新，未达成。

## 7. 最终判定

**FAIL（治理/文档证据不完整；产品功能与发布资产通过）**

- 功能面：草稿 61/61、host-save 64/64、newfile/stale/bigfile 全过；0.30.2 发布资产与安装包通过。
- 阻断项：① round-19/20 的 plan/test 缺失，STATE 只到 16 行；② 文档/Release 仍写 **4.47**，不满足「性能数字无 4.47/1078」；③ 工作区有未提交 `src/App.tsx`（不在 tag 内、未验收），`git status` 不干净；④ acceptance prod、tree/theme/keyboard 的 0.30.2 复跑被 CDP 超时挡住，当前未验。
- 修完上述证据/文案、提交或移除工作区改动并补齐 0.30.2 的回归日志后，可重评为 PASS-WITH-UNVERIFIED。

## 所有 UNVERIFIED

- 真实读屏（NVDA/讲述人）、Windows 高对比度、真实 IME（浏览器/宿主）、真实 macOS 真机、Intel/Rosetta、真实签名/公证、图标真机、⌘C/⌘V/⌘Z。
- 100 KB/1 MB 性能、真实宿主 B1/B3、网络盘/OneDrive、超长路径/中文文件名、并发删除、真实安装 HKCU/开始菜单/双击/SmartScreen。
- P2 延后项、memo/B4/B5/2 MB 进度条；0.30.2 的 acceptance prod/tree/theme/keyboard 本次 CDP 超时未复跑。
