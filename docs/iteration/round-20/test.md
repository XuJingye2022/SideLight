# 第 20 轮 · 最终验收（tester）

日期：2026-11-16。v0.30.3；HEAD `b43b5c8`，tag `v0.30.3` 指向产品提交 `b799cf2`。本机 Windows；只改测试报告，未改产品代码、未 commit。

## 1. 门禁：PASS

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0，127 modules，0 warning | `.tmp/r20b-build.log` |
| `npm test` | 16 文件、205 条、0 失败 | `.tmp/r20b-test.log` |
| `measure --max 285000` | PASS，首屏 **284,766 B**（余 234 B） | `.tmp/r20b-measure.log` |

## 2. 草稿：PASS

- `draft-acceptance` **61/61**：保存成功 `["draft-save","save","draft-clear"]`；保存中继续输入**不发** `draft-clear`、dirty 仍 true；其余 59 条通过（`.tmp/r20c-draft.log`）。
- 修复方式是测试等待改为 **1300 ms**（300 ms 派生 + 800 ms 草稿防抖），不是放宽产品断言；产品代码未因这次复验改变。
- `host-save` **64/64**、`newfile` **23/23**、`stale` **4/4**、`bigfile` **3/3**（6.1 MiB 拒绝、5.2 MiB 允许、5.5 MiB 文案）。

## 3. 性能：PASS-WITH-UNVERIFIED

- 1 MB 载入 3 次：**1305 / 1282 / 1342 ms**，中位 **1305 ms**，在 1.2–1.5 s 内。
- 10 KB p95 5.0–7.2 ms（波动，未稳定）；100 KB 与 1 MB 逐键 p95 **UNVERIFIED**；1 MB 逐键脚本仍会挂起，已终止，不报 4.47。
- memo/B4/B5/2 MB 进度条与 P2 可访问性项仍延后，已记录。

## 4. 回归：PASS

- acceptance dev **11/11**、prod **11/11**；tree **49/49**；theme **27/27**（applicable 43/48、excluded 5、failed 0）；keyboard **35/35**。
- rename **22/22**、newfile **23/23**、fidelity **19/19**、math **11/11**、recent **57/57**、host-save **64/64**、host-smoke **7/7**、fcp **6/6**。
- portable **6/6**、installer 0.30.3 装/启/卸/数据保留 PASS（HKCU/快捷方式 3 项 UNVERIFIED）。

## 5. 文档 / 发布：PASS

- 全仓 `README/AGENTS/CHANGELOG` 中 `4.47`/`1078` **0 命中**；Release body 无 4.47，含「未验与已知限制」与签名状态。
- README 5.5 MiB、FCP「本机一次测量」、PRIVACY 草案、SECURITY `[Security]` 标题（无死标签）均对。
- Release v0.30.3：setup **818,642 B**、win zip **902,798 B**、mac **890,529 B**、`SHA256SUMS-0.30.3.txt` **308 B**；三文件 SHA256 全一致；mac fat 2 片（x86_64/arm64）+ `README.txt`；installer/portable 本机通过。

## 6. 仓库 / 20 轮证据：PASS（有说明）

- `git status` 干净（仅本报告修改）；HEAD `b43b5c8` 领先 tag `b799cf2` 的提交均为 **docs/test/STATE/截图**：`git diff v0.30.3..HEAD -- src` **0 文件**；Release 资产仍由 `b799cf2` 构建。这是「HEAD 领先 tag 的文档/测试提交」，不按产品代码未验收处理。
- STATE 已补第 17–20 行、0.30.3 与最新 Release 0.30.3；round-01..20 的 plan/test 均存在（round-19/test 本轮补上）。
- `out/`/`release/`/`dist/`/`.tmp/`/`host/bin/` 未入库；无密钥/证书；截图体积无异常新增。

## 7. 最终判定

**PASS-WITH-UNVERIFIED**

- 功能门禁、草稿 61/61、全部回归、0.30.3 四资产/checksum/fat/README/installer/portable 通过。
- HEAD 领先 tag 的两个提交仅 docs/test/STATE，产品源码 0 改动；测试等待修正使草稿验收重新通过。
- 未验项不影响 0.30.3 可发布性，但不能写成已验证。

## 所有 UNVERIFIED

- 真实读屏（NVDA/讲述人）、Windows 高对比度、真实 IME（浏览器/宿主）、macOS 真机、Intel/Rosetta、真实签名/公证、图标真机、⌘C/⌘V/⌘Z。
- 100 KB/1 MB 逐键 p95、10 KB p95 的稳定性、真实宿主 B1/B3、网络盘/OneDrive、超长/中文路径、并发删除、真实 HKCU/开始菜单/双击/SmartScreen。
- P2 可访问性项、memo/B4/B5/2 MB 进度条；1 MB 逐键脚本挂起。
