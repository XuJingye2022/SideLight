# 第 20 轮 · 最终验收（tester）

日期：2026-11-16。v0.30.3；HEAD `498ce26`（docs: remove unreproducible p95），tag `v0.30.3` 指向 `b799cf2`（release: debounce markdown derivation）。本机 Windows；未改产品代码、未 commit。

## 1. 门禁：PASS

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0，127 modules，0 warning | `.tmp/r20b-build.log` |
| `npm test` | 16 文件、205 条、0 失败 | `.tmp/r20b-test.log` |
| `measure --max 285000` | PASS，首屏 **284,766 B**（余 234 B） | `.tmp/r20b-measure.log` |

## 2. 草稿修复：FAIL

- `draft-acceptance` **未到 61/61**：`T1 继续编辑只新增 1 条（防抖合并）` 实测只有 **1** 条，随后取 `draftSave.id` 为 undefined，脚本在 `draft-acceptance.mjs:211` 崩溃；保存成功序列/保存中继续输入等 10 项通过，但整体不能记 61/61。
- `host-save` **64/64**、`newfile` **23/23**、`stale` **4/4**、`bigfile` **3/3** 通过；6.1 MiB 拒绝/5.2 MiB 允许/5.5 MiB 文案正确。
- 0.30.3 Release body 仍写「草稿验收 draft 61/61」，与实测不符。

## 3. 性能：PASS-WITH-UNVERIFIED

- 1 MB 载入 3 次：**1305 / 1282 / 1342 ms**，中位 1305，在用户给出的 1284 ms / 1.2–1.5 s 范围内；`perf-longdoc` 在逐键阶段挂起，已终止。
- 10 KB p95 5.0–7.2 ms（未稳定，未复跑当前 0.30.3）；100 KB/1 MB 逐键 p95 **UNVERIFIED**；不报 4.47。
- memo/B4/B5/2 MB 进度条仍在 README/Release 记为延后；P2 同样延后。

## 4. 回归：PASS（除草稿）

- acceptance dev **11/11**、prod **11/11**；tree **49/49**；theme **27/27**（applicable 43/48、excluded 5、failed 0）；keyboard **35/35**。
- rename 22/22、fidelity 19/19、math 11/11、recent 57/57、host-smoke 7/7、fcp 6/6、portable 6/6、installer 0.30.3 PASS（HKCU/快捷方式 3 项 UNVERIFIED）。
- `draft` 是唯一失败的功能验收；其余 0.30.3 测试日志见 `.tmp/r20b-*.log`。

## 5. 文档/发布：PASS

- 全仓 `README/AGENTS/CHANGELOG` 中 `4.47`/`1078` **0 命中**；Release body 无 4.47，含「未验与已知限制」；README 5.5 MiB、FCP「本机一次测量」、PRIVACY 草案、SECURITY `[Security]` 标题（无死标签）均对。
- Release v0.30.3 已发布：setup **818,642 B**、win zip **902,798 B**、mac **890,529 B**、`SHA256SUMS-0.30.3.txt` **308 B**；三文件 SHA256 与 checksum 全一致；mac fat 2 片（x86_64/arm64）+ `README.txt`；installer/portable 本机通过。

## 6. 仓库 / 20 轮证据：FAIL

- **HEAD≠tag**：HEAD `498ce26`（docs）不是 `v0.30.3` 的提交 `b799cf2`；tag 之后的 docs 改动未进发布。
- **工作区不干净**：`M docs/iteration/STATE.md`、`?? docs/iteration/round-19/plan.md`、`?? docs/iteration/round-20/plan.md`；不能按「git status 干净」记。
- **缺失**：`round-19/test.md`（本轮已补一份摘要）、`round-20/plan.md` 未跟踪；round-01..18 plan/test 齐，round-19/20 plan 存在但未提交。
- STATE 内容已写第 17–20 行、0.30.3 与最新 Release 0.30.3，但仍是未提交修改；`out/`/`release/`/`dist/`/`.tmp/`/`host/bin/` 未入库，无密钥/证书。

## 7. 最终判定

**FAIL**

- 功能：草稿 61/61 未达成（当前测试崩溃在第二个 draft-save 断言）；1 MB 载入达标。
- 发布：四资产/checksum/fat/README/installer/portable 通过；但 body 的 61/61 与实测不符。
- 治理：HEAD≠tag、工作区 dirty、round-19/test 缺失且 round-19/20 plan 未提交；不满足「git status 干净 / HEAD=tag / 20 轮证据齐」。

## 所有 UNVERIFIED

- 真实读屏（NVDA/讲述人）、Windows 高对比度、真实 IME（浏览器/宿主）、macOS 真机、Intel/Rosetta、真实签名/公证、图标真机、⌘C/⌘V/⌘Z。
- 100 KB/1 MB 逐键 p95、10 KB p95 的稳定性、真实宿主 B1/B3、网络盘/OneDrive、超长/中文路径、并发删除、真实 HKCU/开始菜单/双击/SmartScreen。
- P2、memo/B4/B5/2 MB 进度条；`perf-longdoc` 1 MB 逐键挂起。
