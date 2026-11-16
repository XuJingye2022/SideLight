# 第 17 轮 · 独立验收（tester）

日期：2026-11-16。v0.30.1（HEAD `08aaf88`）。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 200；CDP 9222。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，127 modules，**0 warning** | `.tmp/r17-build.log` |
| `npm test` | **16 文件、205 条、0 失败** | `.tmp/r17-test.log` |
| `measure --max 285000` | **PASS**；首屏 **284,730 B**（余 **270 B**） | `.tmp/r17-measure.log` |

## B1 保存竞态：**PASS**

`node scripts/stale-save-acceptance.mjs` → **4/4 PASS**：

- 慢写回包到达后标题仍 **b.md**、正文仍是 b.md、旧回包不改身份；随后 Ctrl+S 写 **b.md**，a.md 仍是旧内容、picker 0。
- 运行日志 `.tmp/r17-stale.log`。

## B3 丢字：**FAIL（host-save 64/64，但 draft 57/58）**

- `host-save-acceptance` **64/64 PASS**：保存中回包/排队/旧 id/超时/失败码/只读/CRLF/BOM/转发均通过。
- **失败点**：`draft-acceptance` **57/58**。`T1 保存后先有 draft-save 再有 draft-clear` 实测序列为 `["draft-save","save"]`，**没有 draft-clear**；保存成功后草稿未被清。其余 57 条通过。
- 这是 B3/T2 相关回归，不能按 58/58 记。

## B2 大文件：**PASS**

`node scripts/bigfile-acceptance.mjs` → **3/3 PASS**：

- 6.1 MiB 在 2 秒内报「文件太大，暂不支持（上限 **5.5 MiB**）」；旧文档不变；5.2 MiB 可打开。日志 `.tmp/r17-bigfile.log`。

## 性能：**FAIL（10 KB p95 不可复现）**

- `perf-longdoc.mjs "10 KB"`：**load=910 ms、p95=5.0056 ms**；第一次全量跑到 10 KB 时 **load=906 ms、p95=6.7697 ms**。计划/CHANGELOG 写 **1078 ms / 4.47 ms、p95 ≤5 ms**，当前两次均达不到 4.47，5.0056 也越过 5 ms。
- 100 KB：一次实测 load=943 ms、p95=**245.159 ms**（远高于计划 ≤10，且用户已标「无可信数字」，按 **UNVERIFIED**）；1 MB 脚本挂起，被手动终止，**UNVERIFIED**。
- memo、B4/B5、2 MB 进度条延后已在 README/CHANGELOG/impl-a 记录；不按完成。
- `impl-a.md` 自写 T4 **PARTIAL**、无可信 p95；`docs/CHANGELOG.md` 却写 1078/4.47，文档与实现报告矛盾。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| acceptance dev / prod | **11/11 / 11/11** | `.tmp/r17-acceptance-dev.log`、`-prod.log` |
| tree-acceptance | **49/49** | `.tmp/r17-tree.log` |
| theme-acceptance | **27/27**（43/48 适用、5 排除、0 失败） | `.tmp/r17-theme.log` |
| keyboard-acceptance | **35/35** | `.tmp/r17-keyboard.log` |
| rename-acceptance | **22/22** | `.tmp/r17-rename.log` |
| newfile-acceptance | **23/23** | `.tmp/r17-newfile.log` |
| fidelity-acceptance | **19/19** | `.tmp/r17-fidelity.log` |
| math-ready-acceptance | **11/11** | `.tmp/r17-math.log` |
| draft-acceptance | **57/58 FAIL**（缺 draft-clear） | `.tmp/r17-draft.log` |
| recent-acceptance | **57/57** | `.tmp/r17-recent.log` |
| host-smoke --fsa | **7/7** | `.tmp/r17-host-smoke.log` |
| fcp-probe | **6/6** | `.tmp/r17-fcp.log` |
| verify-portable 0.30.1 | **6/6**、34 条目 | `.tmp/r17-portable-0301.log` |
| verify-installer 0.30.1 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r17-installer-0301.log` |

## 发布 / 文档

- Release **v0.30.1** 已发布：setup **818,553 B**、win zip **902,786 B**、mac universal **890,510 B**、`SHA256SUMS-0.30.1.txt` **308 B**；三文件 SHA256 与 checksum **全一致**。
- 文档：README/AGENTS/CHANGELOG **0.30.1**、首屏 **284,730 B**；无 `[TBD]`、无 `Sidelight-0.30.0-win` 旧包名；Release body 六节、ad-hoc 标注。
- **缺失**：`docs/iteration/round-17/impl-b.md` 不存在；用户要求对照 impl-a/impl-b，B 组报告无法核对。

## 范围

- `git status`：10 个已跟踪截图改动（回归二进制）、0 删除、1 项未跟踪（本报告）；`release/`、`dist/`、`.tmp/`、`host/bin/` 未入库；无证书/密钥。
- 0.30.1 资产下载到 `.tmp/r17-release`，本机复制到 `release/` 仅用于验证；`release/` 忽略。

## 判定

**FAIL（性能 10 KB p95 不可复现；draft 57/58 缺 draft-clear）**

- 最严重：性能门要求 10 KB p95 4.47 ms / ≤5 ms，实测 **5.0056 ms 与 6.7697 ms**；100 KB 245 ms 不可信、1 MB 挂起。CHANGELOG 的 1078/4.47 与 impl-a 的「无可信数字」互相矛盾。
- 其次：保存成功后没有发 `draft-clear`，`draft-acceptance` 57/58；这与 B3「草稿不被清」方向相反的回归，需要确认是否 `clearHostDraft` 只在 dirty=false 时调用导致漏清。
- **UNVERIFIED**：100 KB/1 MB 性能、真实宿主 B1/B3、真实 IME/macOS；`impl-b.md` 缺失，B 组证据无法对照。
