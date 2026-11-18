# 第 62 轮 · 安装与启动（finder-ship）

轮前 startSha `12f36e4`；本角色只读产品代码，未改 `release/`。

## F1（P2，非新增；补证 B-126）`host\bin\www` 与 `dist` 不同批，差 1 个文件、68 个内容哈希

- 实测：`host\bin\www` 97 文件 3,864,607 B，入口 `assets/index-C0MK7z5T.js` **923,234 B**（正是 `README.md:121` 记的第 57 轮 raw 值）；`dist` 98 文件 3,880,025 B，入口 `assets/index-CYA9LD0u.js` **930,741 B**。两份 `index.html` 只差 JS 名与 CSS 名（`index-DeYW4-Qz.css` → `index-QuWJqcDg.css`）。
- `www` 缺 `assets/GlobalSearch-BxdW8DgA.js`（dist 有，即第 59 轮全局搜索 chunk），其余同名 chunk 哈希全不同。
- 影响面收窄（本轮新测，可据此降级为纯开发坑）：`packaging/installer.nsi:138-140` 先删 `$INSTDIR\www` 再 `File /r "..\dist\*"`；`packaging/portable.ps1:3,55` 默认 `$Www='dist'` 再拷到 staging。**两个发布产物都不读 `host\bin\www`**，只有直接双击 `host\bin\Sidelight.exe` 才看到旧前端。
- 成因：`host\build.ps1:27-28,71` 每次先删 `www` 再整份拷 `dist`，所以 www 的批次只取决于上次 build.ps1 时的 `dist`。本机 `host\bin\Sidelight.exe` mtime 06:31、`www` 06:30，而 `dist` 已由 08:55 的重建更新。
- 建议（廉价、无风险）：`packaging/verify-installer.ps1` 的 preflight 段加一条只读对照——`host\bin\www\index.html` 与 `dist\index.html` 字节不同就打印 `UNVERIFIED host\bin\www 与 dist 不同批次（先跑 host\build.ps1）`；并在 `packaging/README.md:45` 那句「两条都要求先有 host/bin 与 dist」旁写明「直接跑 `host\bin\Sidelight.exe` 前先跑 `host\build.ps1`，否则看到旧前端」。

## F2（P2，状态记录；非阻断）`release/` 里 0.32.1 名下的包是 0.31.1 批次，preflight 按其设计判 FAIL

- `packaging\verify-installer.ps1 -PreflightOnly` → `1 FAIL / 1 UNVERIFIED`、**exit 1**：`Sidelight-0.32.1-win-x64-setup.exe` 824,595 B、mtime 2026-11-16 22:21:32、FileVersion **0.31.1.0**；`host\bin\Sidelight.exe` FileVersion 0.32.1.0。这就是 B-125 修好的第 60 轮门在起作用，不是新缺陷。
- 当前 `dist` 的试包（本轮实跑 `packaging\installer.ps1 -AssocDryRun`，产物写 `.tmp\assoc-dryrun-setup.exe`，不进 `release/`）：**1,313,411 B**、FileVersion **0.32.1.0**、`target=45000000 gap=-43686589`（= 内部预算的 2.63%）。距硬线 50,000,000 B 余 48,686,589 B。
- 发版动作（本角色不做）：重跑 `npm run build` → `host\build.ps1` → `installer.ps1` / `portable.ps1`；`release/` 现有 0.32.1 两个文件必须被覆盖，`SHA256SUMS.txt` 仍是 2026-11-16 的 207 B 旧清单。

## F3（通过）门禁数值与 BRIEF 一致

- `node scripts/measure-first-screen.mjs --dir dist`：`total raw=972810 gzip=300727 headroom=19273 files=3 max=320000`、`target=310000 gap=9273`、**PASS**；3 个首屏文件 `index-CYA9LD0u.js` 930,741 / `rolldown-runtime-vfrPO-fZ.js` 783 / `index-QuWJqcDg.css` 41,286。
- 与 `README.md:119`（300,727 B、余 19,273 B）与 `README.md:121`（主 chunk 930,741 raw / 291,919 gzip）逐值相同，无过期。
- 硬线：`packaging\installer.ps1:98-101,126-138` 45,000,000 只 WARN / 50,000,000 打印占比并 `exit 1`；`packaging\portable.ps1:16,78-85` `$threshold = 50000000` 超线 `exit 1`。与 BRIEF 红线第 7 条一致。

## 未做
- 未用真实安装包走「首次启动 → 写 → 保存 → 重开」：`release/` 唯一 0.32.1 包是 0.31.1 批次，且红线禁止改 `release/`；沙箱内可改用 `verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe`（会写 HKCU/开始菜单，本机宿主 WebView2 已知 `INIT-FAIL`），留给 tester 决定。

## 日志
`.tmp/r62-ship-preflight.log`、`.tmp/r62-ship-assocdryrun.log`
