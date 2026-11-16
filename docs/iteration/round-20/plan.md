# 第 20 轮 · 计划（最终硬化与收尾）

基线 v0.30.2（HEAD `ab7aaea`）。目标：把正文派生移出按键同步路径、修 1 MB 载入悬崖，发 0.30.3，并做 20 轮最终验收。**已发布**为 `b799cf2`（v0.30.3）。

## 任务表（实际执行）

| 任务 | 内容 | 结果 |
| :--- | :--- | :--- |
| T1 `onUpdate` 拆分 | 同步只做 dirty、统计与自动保存调度；正文派生（4 条 repair 规则、草稿、`localStorage` 写入）移到 **300 ms 防抖**（`src/App.tsx`，`b799cf2` 共 78 行改动） | 已完成并提交。0.30.3 的 CHANGELOG 记录该拆分；草稿验收 `draft` **61/61** |
| T2 1 MB 载入修复 | 针对逐键全文派生与载入路径的重复工作做收敛，测载入耗时 | 已完成。1 MB 载入由 **5.8–9.3 s 降到 1284 ms**（`docs/CHANGELOG.md` 0.30.3 节）；10 KB 逐键 p95 **4.47 ms**，未退化；**100 KB 与 1 MB 的逐键 p95 未测**（只测了载入），不作为验收数字 |
| T3 发布 0.30.3 | 版本、CHANGELOG、Windows setup/portable、macOS Universal、`SHA256SUMS-0.30.3.txt`；首屏守住 285,000 | 已发布。tag `v0.30.3` 与提交 `b799cf2` 对齐；首屏 gzip **284,766 B**（≤285,000，余 234 B）；`npm test` 16 文件 205 条；体积与 SHA256 见 Release 页的 `SHA256SUMS-0.30.3.txt`（本机未复核 Release 页） |
| T4 最终验收 | 按 20 轮口径验门禁、回归、发布资产、文档诚实性、仓库与 STATE 同步 | 已出 `docs/iteration/round-20/test.md`：对 **v0.30.2** 判 **FAIL（治理/文档证据不完整）**；0.30.3 提交后未再出独立验收报告 |

## 验收标准

1. `npm run build`、`npm test`（16 文件 205 条）、`measure --max 285000` 全绿（0.30.3 首屏 284,766 B）。
2. 性能只写实测：1 MB 载入 1284 ms、10 KB 逐键 p95 4.47 ms；100 KB/1 MB 逐键明确标「未测」，不写成验收值。
3. 数据安全回归：`draft` 61/61、`host-save` 64/64、`newfile` 23/23、`stale` 4/4、`bigfile` 3/3（6.1 MiB 拒绝、5.2 MiB 允许、5.5 MiB 文案）。
4. 发布：`v0.30.3` 三资产 + `SHA256SUMS-0.30.3.txt` 齐全且 `sha256sum -c` 过；macOS 仍 ad-hoc、未公证，Release 首行标注。
5. 收尾：STATE 行 1–20 与发布状态更新；仓库/Release/文档/CHANGELOG 一致；`round-19`/`round-20` 的 plan/test 齐全；工作区干净、无密钥与临时产物。

## 结果与遗留

- **功能与发布面**：0.30.3 已提交并打 tag（`b799cf2`），工作区干净；首屏 284,766 B；测试 16/205；`draft` 61/61。0.30.2 的验收记录见 `docs/iteration/round-20/test.md`，其发布资产与安装包通过（setup 818,476 B、portable 902,772 B、macOS 890,504 B，SHA256 一致）。
- **未达成的收尾项**（据 `docs/iteration/round-20/test.md` 与当前仓库状态）：
  1. **STATE 仍只有第 1–16 行**，第 17–20 轮的行与 0.30.2/0.30.3 发布状态未补（`docs/iteration/STATE.md` 实测）。
  2. `round-19/test.md` 缺失；`round-19/plan.md` 与 `round-20/plan.md` 由本次补写；`round-20/test.md` 是 v0.30.2 的 FAIL 记录，0.30.3 无独立复验报告。
  3. 性能数字口径未完全统一：0.30.3 的 CHANGELOG 仍以「10 KB p95 4.47 ms」表述，与第 19 轮「删除 4.47」的字面要求冲突；`1078` 只在历史条目出现，当前版本不主张。
  4. `acceptance` prod、tree/theme/keyboard 的 0.30.2 复跑被 CDP 9222 超时挡住，标 UNVERIFIED；0.30.3 未重跑。
- **未验证清单**（沿用 `AGENTS.md` §6 与 `round-20/test.md`）：真实读屏（NVDA/讲述人）、Windows 高对比度、真实 IME（浏览器/宿主）、真实 macOS 真机、Intel/Rosetta、真实 Developer ID 签名/公证、图标真机显示、⌘C/⌘V/⌘Z、100 KB/1 MB 逐键 p95、真实宿主 B1/B3、网络盘/OneDrive、超长路径与中文文件名、并发删除、真实安装 HKCU/开始菜单/双击/SmartScreen、P2 延后项（骨架 role/aria-busy、批注卡 Enter、正文开头 Tab 回环）、memo/B4/B5/2 MB 进度条。
- **1.0 Go/No-go**：**No-go**。7 条门槛未满足（macOS 真机、签名公证、Intel、100 KB–1 MB 性能、隐私定稿、Windows 真机安装、安全响应时限），见 `docs/iteration/round-19/findings-ship.md` S4.3；`v0.30.x` 定位为「可下载的预览版」。

## 引用

`docs/CHANGELOG.md` 的 0.30.3 节、`docs/iteration/round-20/test.md`、`docs/iteration/round-19/findings-ship.md`（S3/S4）、`AGENTS.md` §6、`src/App.tsx`、`scripts/draft-acceptance.mjs`、`scripts/measure-first-screen.mjs`。
