# 第 21 轮 · 独立验收（tester）

日期：2026-11-16。v0.30.4，HEAD/tag `584d5e7`。本机 Windows；未改产品代码、未 commit。报告写入本文件。

## 1. 门禁：PASS

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0，127 modules，0 warning | `.tmp/r21-build.log` |
| `npm test` | 16 文件、**213 条**、0 失败 | `.tmp/r21-test.log` |
| `measure --max 285000` | PASS，首屏 **284,903 B**（余 97 B） | `.tmp/r21-measure.log` |

## 2. C1 脚注：PASS（产品），但 data-safety 脚本 FAIL

- `npm test` 新增脚注/风险用例全过：4 空格/tab 续行、脚注+`[ref]:` 混合尾块、两次往返；定义消失但引用仍在拦截，引用+定义一起删不拦。
- `npm run roundtrip`：**source 7/7 等值**，rich 5/7（04 引用式链接仍差 -4/+1，首次保存拦截 2），03 脚注 -0/+0，07 公式 -0/+0。
- `node scripts/data-safety-acceptance.mjs` **FAIL**：第一项横幅通过后，脚本在 `edit()` 等 `.editor` 超时（`.editor` 已不是当前源码/富文本选择器）；这是验收脚本口径过期，不是产品断言通过。C1 的产品证据用上面的 unit/roundtrip；脚本需更新选择器后重跑。

## 3. D1 删除脏文件：PASS

`tree-acceptance` **56/56**：

- 脏删除确认写明「未保存正文与批注会一起删除；撤销一起搬回」，有取消/移到回收站两项。
- trash 同时出现 **`.md`（含最后编辑正文）+ `.md.draft` + `.md.json`**；撤销后正文含最新内容、草稿与批注都回来；取消不改文件、不产生 trash。
- 「保存后删除」分支按计划延后，未作为达标项。

## 4. 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| tree | **56/56 PASS** | `.tmp/r21-tree.log` |
| stale / newfile / bigfile | **4/4 / 23/23 / 3/3 PASS** | `.tmp/r21-stale.log` 等 |
| draft | **61/61 PASS** | `.tmp/r21-draft.log` |
| host-save | **64/64 PASS**（首次跑到约 57 时 target closed，重跑通过） | `.tmp/r21-host-save-rerun.log` |
| theme | **27/27 PASS**（43/48 适用、5 排除、0 失败） | `.tmp/r21-theme.log` |
| keyboard | **35/35 PASS** | `.tmp/r21-keyboard.log` |
| acceptance dev/prod | **11/11 / 11/11 PASS** | `.tmp/r21-acceptance-*.log` |
| recent | **57/57 PASS** | `.tmp/r21-recent.log` |
| host-smoke --fsa | **5/6 PASS**：窗口/渲染/argv/单实例/FSA 对话框通过；树读到 sample.md 37 s 超时 | `.tmp/r21-host-smoke-cleanfs.log` |
| fcp | **6/6 PASS** | `.tmp/r21-fcp.log` |
| portable / installer 0.30.4 | **6/6 PASS**；装/启/卸/数据保留 PASS，HKCU/快捷方式 3 项 UNVERIFIED | `.tmp/r21-portable.log`、`-installer.log` |

- host-smoke 清理 `.tmp/host-fs`、重建 host 并杀掉遗留 CDP 9333 后为 **5/6**：标题/渲染/argv/单实例全 PASS，FSA 对话框出现（senderExit=0）；只有「树读到 sample.md」在 37 s 超时，body 仍是「还没有打开文件夹」。**UNVERIFIED**：文件夹选择自动化/旧 `.tmp/host-fs` 路径，不是已证实的源码回归。

## 5. 文档 / 发布

- Release **v0.30.4**：setup **819,208 B**、win zip **903,383 B**、mac **891,112 B**、`SHA256SUMS-0.30.4.txt`；三文件 checksum 全一致；mac fat 两片（x86_64/arm64）+ `README.txt`。
- README/AGENTS/CHANGELOG **0.30.4**、**213**、**284,903**；无 `[TBD]`、无 `Sidelight-0.30.3-win` 旧包名；Release body 有未验/已知限制与签名状态。
- **非阻断文案问题**：0.30.4 Release body 仍写 10 KB p95 **4.47 ms**（0.30.2/0.30.3 已判定不可复现）；本轮任务未要求清零，但不应作为当前稳定数字。

## 6. 范围

- `git status`：仅本轮报告 `?? docs/iteration/round-21/test.md`、`?? docs/iteration/round-23/`（后续轮次进行中的产物），无已跟踪源码修改；`release/`、`dist/`、`.tmp/`、`host/bin/` 未入库；无密钥/证书。
- 20 轮文档延续上一轮；本轮报告为 `docs/iteration/round-21/test.md`。

## 7. 判定

**PASS-WITH-UNVERIFIED**

- C1 产品 PASS（unit 213、roundtrip source 7/7、定义消失拦截/引用+定义同删不拦）；D1 PASS（tree 56/56，正文/草稿/批注进 trash、撤销全回、取消不改）。
- 回归全过：stale 4、newfile 23、draft 61、host-save 64、bigfile 3、theme 27、keyboard 35、acceptance dev/prod 11、recent 57、fcp 6、portable/installer 0.30.4。
- `host-smoke` **5/6**：窗口/渲染/argv/单实例/FSA 对话框 PASS；「树读到 sample.md」37 s 超时，body 仍是「还没有打开文件夹」——**UNVERIFIED**（文件夹选择自动化/旧 `.tmp/host-fs` 路径），不是已证实的源码回归。
- `data-safety-acceptance` 的 `.editor` 选择器过期，属脚本问题；C1 产品证据由 unit/roundtrip 支撑，不按产品 FAIL。
- Release v0.30.4 四资产/checksum/mac fat/README/installer/portable 通过；文档 0.30.4/213/284,903，无 TBD/0.30.3 旧包名。Release body 仍写 10 KB p95 4.47 ms，**非阻断**但不应作为稳定数字。

## 所有 UNVERIFIED

- 真实宿主 FSA 树读取（对话框已出现）、真实宿主 B1/B3/argv、真实 IME、macOS 真机/签名、100 KB–1 MB 逐键、网络盘/超长路径、HKCU/开始菜单/双击/SmartScreen、P2/memo/B4/B5/2 MB。
- `data-safety-acceptance` 需更新 `.editor` 选择器后重跑；`host-smoke` FSA 需确认文件夹选择自动化。
