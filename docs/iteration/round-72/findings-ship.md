# 第 72 轮 · 安装与启动侦察（finder-ship）

范围：只读；未改 `release/`、未 push、未起浏览器。startSha `4cccb03`。2026-11-18 15:28–15:52。
结论：**0 条新 P0/P1**；发布门无回退；2 条 P2 观察（1 条既有、1 条文档差值）。

## 1 实测（`npm run verify` PASS，`.tmp/r72-ship-verify.log`）

| 项 | 实测 | 线 | 判定 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip | **302,014 B**（raw 978,096 / 3 文件） | 内部 310,000（gap 7,986）／硬线 320,000（余 17,986） | PASS |
| 主 chunk / CSS | `index-BBkPIT6N.js` 935,103 raw / 293,064 gzip；`index-D2IJnu1K.css` 42,210 / 8,500；runtime 783 / 450 | — | 首屏 3 件 = `dist/index.html` 引用 |
| `dist` | 98 文件 **3,887,276 B**（第 70 轮 +372） | — | 惰性 chunk 齐：`GlobalSearch-DoDFjTRk.js` 3,728、`MarginRail` 6,210、`katexLoader` 258,788+26,627、`mermaidLoader` 77,792、`PreviewPane` 2,586，均不进首屏 |
| 安装包（关联 dry-run） | **1,315,181 B**，FileVersion 0.32.1.0，`gap=-43684819`，EstimatedSize 4,801 KB（payload 4,915,722 B） | 45,000,000／50,000,000 | 远在预算内（第 70 轮 +52 B；`.tmp/r72-ship-dryrun.log`） |
| `host\bin\Sidelight.exe` | 90,624 B，FileVersion **0.32.1.0**（今日 06:31） | `package.json` 0.32.1 | 版本门放行 |

dry-run 产物 `.tmp\assoc-dryrun-setup.exe`（`installer.ps1:61-66` 的 `/DOUTFILE=..\.tmp\...`），不写 `release/`（红线 8）。

## 2 门复核

- 批次门在位：`verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe -PreflightOnly` → `preflight PASS（0 UNVERIFIED）` exit 0；对 `release/Sidelight-0.32.1-win-x64-setup.exe` → `FAIL` exit 1（`verify-installer.ps1:52-84`；`.tmp/r72-ship-preflight-{dry,release}.log`）。B-125 未回退。
- 版本门：`installer.ps1:30-35`、`portable.ps1:36-41`、`verify-installer.ps1:60-75` 与 `package.json` 0.32.1 一致，无写死版本。
- 体积线同值：`installer.ps1:97-101,124-137`（45,000,000 WARN / 50,000,000 exit 1）、`verify-installer.ps1:86-96`、`portable.ps1:15-16`。
- 首屏门：`scripts/measure-first-screen.mjs:21-22` 默认 310,000/320,000，无旧 300,000 残留；`release.yml:82,155` 与 CI 都在跑。
- `packaging/README.md:42-44,58` 无过期字节；安装步骤（默认路径、WebView2 前置、opt-in 关联、卸载不删用户数据）与 `installer.nsi:17,32-34,146-155,220-226` 一致。

## 3 P2-1（既有，不入新池）`release/` 旧产物 + 便携线无同批门

- `release` 的 0.32.1 setup 824,595 B、FileVersion **0.31.1.0**（B-125；preflight 已 FAIL）；`release/SHA256SUMS.txt` 仍只有 0.26.0 两行（round-70 F1）。
- 新证据：`release/Sidelight-0.32.1-win-x64-portable.zip` 36 条目、www 28 文件 1,461,334 B、入口 `index-B3_OF1Ta.js` 895,541，等于 tag `v0.32.1`（`628ce719`，11-16 22:21:40），**不是**当前 `dist`（98 文件）；但包内 exe FileVersion 0.32.1.0，版本门不拦。风险仅人工上传 `release/*` 时发旧前端；CI 资产（`release.yml:210-239`）不受影响，红线 8 下不改。建议 `packaging/README.md` 补「发布只取 CI 资产，不手传 `release/`」；未自加 BACKLOG 行，避免并发写池。

## 4 P2-2（本轮文档差值，不阻断）

`README.md:119`（当前 301,886 B、余 8,114）、`README.md:232`（余 8,114）、`BRIEF.md:7`（301,886）为第 69 轮值；实测 **302,014**（余 7,986），差 128 B，来自第 70 轮代码。属 scribe 批末同步。另 `BRIEF.md:6` HEAD `83603dd` ≠ 实际 `4cccb03`（round-70 已记同项）。

## 5 未做

- 未打正式 setup（默认写 `release/`）；只跑 `-AssocDryRun`。未跑全量 `verify-installer.ps1`（写 HKCU/开始菜单，真人项）与 `portable.ps1`（写 `release/`）。
- 未走真实「安装→首启→写→保存→重开」：本机 WebView2 `INIT-FAIL`（`host/bin/host.log`），记 UNVERIFIED。
- `host\bin\www` 仍 97 文件 3,864,607 B（B-126 deferred，发布两线读 `dist`，0 影响）。未跑 `npm test`（角色外）。
