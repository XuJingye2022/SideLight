# 第 70 轮 · 安装与启动侦察（finder-ship）

范围：只读产品代码与打包脚本，未改 `release/`、未 push。2026-11-18 14:32–14:45。
结论：**0 条新 P0/P1**；2 条 P2（1 条既有 B-126 复核、1 条新，均不阻断发布）。

## 1 实测

| 项 | 实测 | 线 | 判定 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip | **301,886 B**（raw 977,724 / 3 文件） | 内部 310,000（余 8,114）／硬线 320,000（余 18,114） | PASS（`npm run verify`，`.tmp/r70-ship-verify.log`） |
| 主 chunk / CSS | `index-Bdk4Cf5X.js` 934,731 raw / 292,936 gzip；`index-D2IJnu1K.css` 42,210 / 8,500 | — | 与 `README.md:121`、`STATE.md:54` 同值 |
| `dist` | 98 文件 **3,886,904 B**；97 个 asset | — | 首屏 3 件由 `dist/index.html` 引用；`GlobalSearch-B1xhfYqg.js`、`MarginRail-DnFPJ7J1.js`、`katexLoader-*`、`mermaidLoader-*` 惰性 chunk 都在 |
| 安装包（关联 dry-run） | **1,315,129 B**，FileVersion 0.32.1.0 | 内部 45,000,000（gap −43,684,871）／硬线 50,000,000 | 远在预算内（`.tmp/r70-ship-dryrun.log`） |
| `host\bin\Sidelight.exe` | 90,624 B，FileVersion **0.32.1.0**（今日 06:31） | `package.json` 0.32.1 | 同版本，版本门放行 |

dry-run 产物在 `.tmp\assoc-dryrun-setup.exe`（`packaging/installer.ps1:61-66`），不写 `release/`（红线 8）；第 66 轮为 1,315,054 B。

## 2 门复核（与 BRIEF / 红线一致）

- 批次门没回退：`verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe -PreflightOnly` → `preflight PASS（0 UNVERIFIED）` exit 0；对 `release/Sidelight-0.32.1-win-x64-setup.exe`（824,595 B，FileVersion **0.31.1.0**）→ `FAIL` + exit 1（`.tmp/r70-ship-preflight-{dry,release}.log`）。B-125 修复仍在 `packaging/verify-installer.ps1:52-84`。
- 体积线：`installer.ps1:97-101,126-137`（45,000,000 只 WARN、50,000,000 exit 1）、`verify-installer.ps1:86-96`、`portable.ps1:15-16`。
- 版本门：`installer.ps1:30-35`、`portable.ps1:36-41`、`verify-installer.ps1:60-65`；`host/build.ps1:31,37-38` 与 `host-mac/build.sh:11` 都从 `package.json` 取版本，无写死。
- 首屏门：`scripts/measure-first-screen.mjs:21-22` 默认 320000/310000；`ci.yml:38-40,91-101`、`release.yml:80-82,93-101,154-155` 都在跑。
- 文档：`README.md:119,121` 与实测一致；`packaging/README.md:42-44,58` 只留预算与「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」，查不到过期字节。

## 3 F1（P2，新）`release/SHA256SUMS.txt` 停在 0.26.0

只有 0.26.0 两行，而 `release/` 已有 0.27.0–0.32.1 共 19 个产物；0.32.1 setup 实算哈希与它无关。它不是发布路径产物（`release.yml:210-239` 每版现生成 `SHA256SUMS-<版本>.txt` 并 `sha256sum -c`），流水线不受影响；风险只在人工上传 `release/*` 时顺手带上它，用户按它校验会对不上。建议发布时删除或换流水线产物；`release/` 属红线 8。

## 4 F2（P2，既有 B-126）`host\bin\www` 仍与 `dist` 不同批

`host\bin\www` 97 文件 3,864,607 B、入口 `assets/index-C0MK7z5T.js`；`dist` 入口 `assets/index-Bdk4Cf5X.js`。`host/build.ps1` 会整目录重拷，之后每次 `npm run build` 又分叉。发布两线都读 `dist`（`packaging/installer.nsi:140`、`portable.ps1:55`），0 影响；只有直接双击 `host\bin\Sidelight.exe` 看到旧前端。维持 deferred。

## 5 观察与未做

- `BRIEF.md:6` 写「HEAD `83603dd`」，实际 `605b5ff`（本轮 startSha）；`git diff --stat 83603dd..HEAD` 只有 `BRIEF.md` 与 `METRICS.md`，本批到目前无产品代码改动，发布面无回归项；BRIEF 每轮草稿。
- 未打正式 setup：默认写 `release/`（红线 8），只跑 `-AssocDryRun`。
- 未走真实「安装→首启→写→保存→重开」：本机 WebView2 初始化失败（`host/bin/host.log:359,383,414` 的 `INIT-FAIL … 0x8000FFFF`）；`verify-installer.ps1` 全量写 HKCU 与开始菜单，属真人验收项。本机 19 个 `msedge` 进程，按要求未 kill、未起浏览器。
- 未跑 `npm test`：角色外，tester 本轮跑。
