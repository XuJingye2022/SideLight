# 第 21–25 轮 · 最终验收（tester，v0.31.1）

日期：2026-11-16。v0.31.1，HEAD/tag 提交 `e92d1a4`。本机 Windows；未改产品代码、未 commit；只写本报告。

## 1. 门禁：本地 PASS，CI FAIL

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0，127 modules，0 warning | `.tmp/r25-build.log` |
| `npm test` | 16 文件、**234 条**、0 失败 | `.tmp/r25-test.log` |
| `measure --max 286000` | PASS，首屏 **285,781 B**（≤286,000 例外） | `.tmp/r25-measure.log` |

- **CI 失败**：main run **#34/#35 均 failure**，失败步骤都是 `node scripts/measure-first-screen.mjs --max 285000`；工作流仍用旧的 285,000，而本轮采用 286,000 例外，`285,781 > 285,000` 直接 gate fail。macos-host/windows-host 两个 job 本身 success。
- 因此本地门禁过，但推送/发布的 CI 门未过，Release v0.31.1 API 仍 **404**，四资产尚未生成（本地 release 只有 setup/portable 的 0.31.1，无 mac）。

## 2. UX：PASS-WITH-UNVERIFIED

- `keyboard-acceptance` **37/37**：正文 Tab 插两空格、继续输入 XYZ 不丢；表格 Tab 不插空格；键盘链路与既有 35 项全过。
- **未跑**：1024×768 分析后批注抽屉自动打开/按钮条数，以及文件菜单「查找替换…」打开 FindBar；当前验收脚本没有这两项 1024 断言，标记 **UNVERIFIED**（不冒充通过）。

## 3. Windows 平台：PASS（一项按事实 UNVERIFIED）

- `host/bin/Sidelight.exe --version` → **0.31.1**；setup VersionInfo **0.31.1.0**；`--version` 走安装目录 exe 也 PASS。
- `verify-installer`：运行中安装被拒绝（exit=1）且 exe 哈希不变 PASS；运行中卸载 **exit 0 但文件未删**，按用户事实记 **UNVERIFIED**（脚本本身按 FAIL 输出）。
- host-smoke 之前实测 5/6：窗口/渲染/argv/单实例 PASS，FSA 对话框出现；「树读到 sample.md」37 s 超时 **UNVERIFIED**。

## 4. macOS：PASS-WITH-UNVERIFIED（静态/CI）

- CI run 35/34 的 `macos-host` job **success**（编译）；静态确认 `App.swift` 有 `application(_:openFiles:)`、`applicationShouldHandleReopen`、`CFBundleShortVersionString`、端口占用时 `activateExistingInstance`。
- 真实 Mac 运行、Finder openFiles、Dock 激活、签名/公证均 **UNVERIFIED**。

## 5. 回归

- 已有 0.31.1 `npm test` 234、keyboard 37；本轮未重跑全部脚本。最近同仓证据：draft 61/61、tree 56/56、host-save 64/64、newfile 23/23、stale 4/4、bigfile 3/3、theme 27/27、acceptance 11/11、recent 57/57、fcp 6/6、portable/installer。
- 这些多为 0.30.4/0.31.0 末次通过；0.31.1 的 UX/宿主改动后没有全部复跑，故不按「全部已复验」记。

## 6. 文档 / 发布 / 仓库：FAIL

- README/AGENTS/CHANGELOG 写 **0.31.1**、**234**、**285,781**；无 `[TBD]`、无旧包名；文档一致。
- **STATE 只有 1–20 行**；第 21–25 行未补，最新发布仍不是 0.31.1。
- **20 轮证据缺失**：round-22 无 plan/test，round-23 无 test，round-24/25 目录不存在（本报告新建 round-25/test.md）；round-21/22/23 的 plan/test 也不完整。
- Release v0.31.1 **404**，无四资产/`SHA256SUMS-0.31.1.txt`；CI gate 失败与 Release 缺失一致，发布流程未完成。
- 工作区 HEAD=`e92d1a4`、tag=`v0.31.1` 同提交；无密钥/证书入库，release/dist/.tmp/host/bin 未入库。

## 7. 最终判定：FAIL

- 硬阻断：CI gate 仍以 285,000 运行，0.31.1 实际 285,781 → run #34/#35 failure；Release v0.31.1 不存在。
- 治理阻断：STATE 停在第 20 行；round-22/23/24/25 的 plan/test 大量缺失。
- 功能/Windows/静态 macOS 证据基本通过；UX 1024 两项、运行中卸载、host-smoke FSA 树读取仍 UNVERIFIED。

## 所有 UNVERIFIED

- 真实读屏、Windows 高对比度、真实 IME、macOS 真机/Finder/Dock、真实签名/公证、图标、⌘键。
- 1024 分析抽屉与菜单 FindBar；运行中卸载文件未删；host-smoke FSA 树读取；真实宿主 argv/单实例恢复置前。
- 100 KB/1 MB 逐键 p95、网络盘/超长路径、HKCU/开始菜单/双击/SmartScreen、P2/memo/B4/B5/2 MB。
