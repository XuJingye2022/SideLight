# 第 66 轮 · 安装与启动侦察（finder-ship）

范围：只读产品代码与打包脚本，未改 `release/`、未 push。时间：2026-11-18 11:23–11:40（本机）。
结论：**本轮 0 条新 P0/P1**；2 条 P2（1 条新增、1 条既有 B-126 复核）。

## 1 度量（本轮实测）

| 项 | 实测 | 口径 | 判定 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip | **300,980 B**（raw 973,999 / 3 文件） | 内部 310,000（余 9,020）／硬线 320,000（余 19,020） | PASS（`npm run verify`，11:23） |
| 主 chunk | `dist/assets/index-CXkxQdh_.js` 931,646 raw / 292,120 gzip | — | 与 `README.md:121` 记的一致 |
| CSS | `dist/assets/index-mcLV_SAP.css` 41,570 raw / 8,410 gzip | — | — |
| `dist` | 98 文件 **3,883,166 B** | — | 与本次 build 前逐字节同（入口名、字节均未变）→ 构建可复现 |
| 安装包（关联 dry-run） | **1,315,054 B**，FileVersion 0.32.1.0 | 内部 45,000,000（gap −43,684,946）／硬线 50,000,000 | 大幅在预算内 |
| `host\bin\Sidelight.exe` | 90,624 B，FileVersion **0.32.1.0**（今日 06:31 编） | `package.json` 0.32.1 | 同版本 |

说明：`installer.ps1 -AssocDryRun` 的产物在 `.tmp\assoc-dryrun-setup.exe`，不写 `release/`（红线 8）。它把关联节的 10 条注册表写入换成清单文件，字节与正式包不完全相同，量级结论有效。

## 2 门复核（都对得上 BRIEF）

- 批次门仍有效：`packaging\verify-installer.ps1 -PreflightOnly` 对 `release/Sidelight-0.32.1-win-x64-setup.exe`（824,595 B，FileVersion **0.31.1.0**）判 `FAIL` + exit 1；对本轮 dry-run 包判 `PASS` + exit 0。B-125 的修复没有回退。
- 硬线/内部线：`installer.ps1:4,97-101`（45,000,000 只 WARN、50,000,000 exit 1）、`verify-installer.ps1:88-96`、`portable.ps1:16`（zip 共用 50,000,000）与 BRIEF 一致。
- 版本门：`installer.ps1:30-35`、`portable.ps1:37-41`（payload FileVersion 必须等于 `package.json`）、`verify-installer.ps1:60-65`（setup 前三段）均在。
- 首屏门：`scripts/measure-first-screen.mjs:21-22` 默认 320,000/310,000；`ci.yml:39`、`release.yml:82,155` 都不传 `--max`，与默认一致，没有残留 286,000 旧线。
- 文档：`README.md:119,121`（300,980 / 931,646 / 292,120）、`packaging/README.md:42,58` 与实测一致；`README.md:9-32` 的下载与安装步骤用 `<版本>` 占位，查不到过期字节。

## 3 F1（P2，新）CHANGELOG 的 Unreleased 标题停在第 29–50 轮

`docs/CHANGELOG.md:5` 写「`## Unreleased（第 29–50 轮，未发版）`」，但同一节的正文已经补到「第 65 轮（同一未发版区间）」（`docs/CHANGELOG.md:325-329`）。按此标题写 release notes 会漏 51–65 轮。改法：标题改成「第 29–65 轮」或在发版时改「第 29–N 轮」；本批 scribe 收工前顺手改。无产品影响。

## 4 F2（P2，既有 B-126）`host\bin\www` 仍与 `dist` 不同批，发布无影响

- 现状：`host\bin\www` 97 文件 3,864,607 B，入口 `assets/index-C0MK7z5T.js`（923,234 B）；`dist` 入口 `assets/index-CXkxQdh_.js`（931,646 B）。`host\bin\www` 的 mtime 是今日 06:30:57，说明 `host/build.ps1:27-28,71` 会整目录重拷，之后任何一次 `npm run build` 又会让两者分叉。
- 发布无影响（已核实，不是 P1）：`installer.nsi:140` 用 `File /r "..\dist\*"`，`portable.ps1:55` 用 `$dist`（默认 `dist`），两条产线都不读 `host\bin\www`。另外 `release/Sidelight-0.32.1-win-x64-portable.zip` 内部自洽：36 个条目，`Sidelight\www\index.html` 指向的 `www\assets\index-B3_OF1Ta.js` 在包内，包内 `Sidelight.exe` FileVersion 也是 0.32.1.0。所以只有「直接双击 `host\bin\Sidelight.exe`」会看到旧前端。

## 5 观察（不入池）

`docs/iteration/BRIEF.md:6` 写「HEAD `c1052aa`」，实际 HEAD 是 `8314072`（本轮 startSha 与之一致，`c1052aa` 是它的父提交）。BRIEF 是每轮草稿，无产品影响。

## 6 未做（卡点写明）

- 未打正式 setup：会写 `release/`，红线 8 禁止；只跑 `-AssocDryRun`。
- 未跑真实安装→启动→写→保存→重开：`verify-installer.ps1` 全量会写 HKCU 与开始菜单，属真人验收项；本机也没有本批次的正式包（`release/` 里的 0.32.1 是 11/16 旧批次）。
- 未跑 `npm test`：角色范围外，tester 本轮会跑。

证据文件：`docs/iteration/round-66/findings-ship.md`（本文件）；命令输出仅在会话内，未另存日志。
