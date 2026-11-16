# 第 21–25 轮 · 最终验收（tester，v0.31.1）

日期：2026-11-16。v0.31.1；产品提交 `e92d1a4`，HEAD `90e0b43`（docs/CI 领先）。本机 Windows；未改产品代码、未 commit；只写本报告。

## 1. 门禁 / CI：PASS

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | exit 0，127 modules，0 warning | `.tmp/r25-build.log` |
| `npm test` | 16 文件、**234 条**、0 失败 | `.tmp/r25-test.log` |
| `measure --max 286000` | PASS，首屏 **285,781 B**（余 219 B） | `.tmp/r25-measure.log` |
| CI #37 | **completed success**；gate/windows-host/macos-host 全 success | run 37 / `90e0b43` |

- `.github/workflows/ci.yml` 已把 gate 改为 `--max 286000`；#34/#35 的 285k 失败已闭环。

## 2. UX：PASS-WITH-UNVERIFIED

- `keyboard-acceptance` **37/37**：正文 Tab 插两空格、继续输入 XYZ 不丢；表格 Tab 不插空格；键盘链路与既有 35 项全过。
- 1024×768 分析后批注抽屉自动打开/按钮条数、文件菜单「查找替换…」FindBar 仍无 1024 自动化断言，标记 **UNVERIFIED**（不冒充通过）。

## 3. Windows 平台：PASS（运行中卸载按 UNVERIFIED）

- `host/bin/Sidelight.exe --version` → **0.31.1**；setup VersionInfo **0.31.1.0**；安装目录 exe 也报 0.31.1。
- `verify-installer`：运行中安装被拒绝（exit=1）且 exe 哈希不变 PASS。
- 运行中卸载 **exit 0 但文件未删**，按用户事实记 **UNVERIFIED**；脚本按 FAIL 输出，产品未证明「运行中卸载会拒绝」。
- host-smoke 之前实测 **5/6**：窗口/渲染/argv/单实例 PASS，FSA 对话框出现；「树读到 sample.md」37 s 超时 **UNVERIFIED**。

## 4. macOS：PASS-WITH-UNVERIFIED

- CI #37 `macos-host` **success**（编译）；静态确认 `application(_:openFiles:)`、`applicationShouldHandleReopen`、`CFBundleShortVersionString`、端口被占时 `activateExistingInstance`。
- 真实 Mac 运行/Finder openFiles/Dock 激活/签名公证 **UNVERIFIED**。

## 5. 回归：PASS-WITH-UNVERIFIED

- 最近同仓证据：draft 61/61、tree 56/56、host-save 64/64、newfile 23/23、stale 4/4、bigfile 3/3、theme 27/27、acceptance 11/11、recent 57/57、fcp 6/6、portable/installer 0.30.4。
- 0.31.1 的 `npm test` 234 与 keyboard 37 已重跑；其余脚本在 0.31.1 上未全部重跑，按「最近证据通过」记，不写成全部重验。

## 6. 文档 / 发布 / 仓库：PASS

- README/AGENTS/CHANGELOG **0.31.1 / 234 / 285,781**；无 `[TBD]`、无旧包名。
- Release **v0.31.1** 已存在：setup **821,058 B**、win zip **905,153 B**、mac **901,482 B**、`SHA256SUMS-0.31.1.txt`；三文件 SHA256 与 checksum **全一致**。
- STATE **1–25 行**，版本 0.31.1、最新 Release 0.31.1；round-21..25 的 plan/test 均存在（round-22/23/24/25 补齐）。
- `git status` 干净；HEAD `90e0b43`，tag 指向产品提交 `e92d1a4`；领先提交 `bc8dbfb`/`90e0b43` 仅 CI/docs，`git diff v0.31.1..HEAD -- src` **0 文件**。无密钥/证书入库，release/dist/.tmp/host/bin 未入库。

## 7. 最终判定：PASS-WITH-UNVERIFIED

- 门禁、CI #37、0.31.1 四资产/checksum、STATE/round 证据、工作区干净均通过。
- 未验项不影响 0.31.1 发布结论，但不得写成已验证。

## 所有 UNVERIFIED

- 真实读屏、Windows 高对比度、真实 IME。
- 1024 分析抽屉/按钮条数与 FindBar 菜单入口；运行中卸载 exit 0 文件未删；host-smoke FSA 树读取；真实宿主 argv/单实例恢复置前。
- macOS 真机、Finder openFiles、Dock、真实签名/公证、图标、⌘键。
- 100 KB/1 MB 逐键 p95、网络盘/超长路径、HKCU/开始菜单/双击/SmartScreen、P2/memo/B4/B5/2 MB。
