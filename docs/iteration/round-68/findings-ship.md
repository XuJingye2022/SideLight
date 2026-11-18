# 第 68 轮 安装与启动（finder-ship）发现

轮前 startSha `ffaae68`；本轮只读产品代码、只写 `.tmp/` 产物，未改 `release/`。

## 门禁与体积（实测）

- `npm run verify` **PASS**：`total raw=975752 gzip=301383 headroom=18617 files=3 max=320000`、`target=310000 gap=8617`。对硬线 320,000 余 **18,617 B**，对内部 310,000 余 **8,617 B**。
- `npm test`：**40 个文件 520 条，0 fail**（逐文件 `ℹ tests` 求和；`ℹ fail` 无非零行），与 BRIEF 一致。
- `dist`：98 文件 **3,884,919 B**；入口 `assets/index-DDszgRq2.js` 932,882 B（gzip 292,439）；最大惰性 chunk `cytoscape.esm 441,717` / `katexLoader 258,788` / `mermaidLoader 77,792`；无 `.map`、无 `.md` 杂项。
- 打包链 dry-run：`packaging\installer.ps1 -AssocDryRun` 产出 `.tmp\assoc-dryrun-setup.exe` **1,315,174 B**、FileVersion **0.32.1.0**、`target=45000000 gap=-43684826`（写 `.tmp`，不写 `release/`）。对硬线 50,000,000 B 余 48,684,826 B。

## F1（P2，文档）首屏「当前」数字落后一轮 403 B

- 证据：`npm run verify` 实测 `gzip=301383 headroom=18617`；`README.md:119`、`AGENTS.md:74`、`BRIEF.md:7`、`STATE.md:54` 仍写 **300,980 B / 余 19,020**。`STATE.md:157` 第 67 轮行已记 **301,383 B / 余 18,617**，属本轮改前既有漂移。
- 主 chunk 也从 `index-CXkxQdh_.js` 931,646（STATE.md:54）变为 `index-DDszgRq2.js` 932,882 raw / 292,439 gzip。
- 判定：**不阻断发布**（两条线都未超）。修法：scribe 收工时把四处数字改 301,383 / 余 18,617 / 内部余 8,617，并换 main chunk 名与字节。

## F2（P2，复核 B-126 未变）`host/bin/www` 仍停在 58 轮

- 证据：`host/bin/www` **97 文件 3,864,607 B**、入口 `index-C0MK7z5T.js`；`dist` 98 文件 3,884,919 B、入口 `index-DDszgRq2.js`。直接跑 `host\bin\Sidelight.exe` 看到的仍是旧前端。
- 发布侧 0 影响（本轮复核）：`packaging/installer.nsi:140`（`File /r "..\dist\*"`）与 `packaging/portable.ps1:55`（`Copy-Item $dist/*`）都取 `dist`，只有 `host/build.ps1` 会重拷 www。
- 判定：维持 BACKLOG **B-126** `open`，不新增条目。

## 发布门复核（无新问题）

- B-125 的批次门仍生效：`packaging\verify-installer.ps1 -PreflightOnly` 对默认包 `release\Sidelight-0.32.1-win-x64-setup.exe`（824,595 B、mtime 2026-11-16 22:21、FileVersion **0.31.1.0**）判 `FAIL` 并 `exit 1`；payload `host\bin\Sidelight.exe` 为 **0.32.1.0**（与 `package.json` 同版本）。
- `packaging/installer.ps1:31` 与 `packaging/portable.ps1:38` 的 payload 版本门、`installer.ps1:92` 的产物 FileVersion 断言、`verify-installer.ps1:63` 的前三段门与硬线 50,000,000 B 判定均与 BRIEF 一致（本轮未改）。
- `.github/workflows/release.yml:103-111` 在 CI 侧另有一道 `setup FileVersion == version.0` 断言；`ci.yml` 与 `scripts/` 未残留旧体积线（0.x 预算 1,800,000 / 2,000,000、820,000 / 850,000 均 0 命中）。

## 附带观察（未计入）

- `release/SHA256SUMS.txt` 仍是 0.26.0 两行，与 `release/` 现存 20 个包不对应；CI 只上传 `out/SHA256SUMS-<版本>.txt`，不读此文件，故无发布影响。

## UNVERIFIED

- 完整静默安装（首次启动 → 写 → 保存 → 重开）本轮**未跑**：`release/` 的 0.32.1 包是旧批次（FileVersion 0.31.1.0），红线禁止改 `release/`，重建正式包属 releaser；15 分钟上限内只做了 `-PreflightOnly` 与 dry-run 包。
- HKCU 卸载项、开始菜单、SmartScreen、真人双击：沙箱不可观测（`packaging/README.md:47-51` 已记）。
- WebView2 缺失分支：只静态检查。
