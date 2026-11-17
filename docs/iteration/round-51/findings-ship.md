# 第 51 轮 · finder-ship 发现

角色：安装与启动。只读产品代码，未改 `release/`、未 push。基准 `startSha=fb6fe9a`（仓库 HEAD 实为 `a523a58`，见 S-51-3）。

## 本轮实测

| 检查 | 结果 | 线 | 判定 |
| :--- | :--- | :--- | :--- |
| `npm run verify` | 首屏 gzip **294,913 B**，`headroom=25087` | 内部 310,000 / 硬线 320,000 | PASS |
| `dist` | 97 文件 **3,854,735 B**（js 79 / css 2 / woff2 15 / html 1）；无 `.map`、无 `localhost`/`5175`/`/src/` 残留 | — | 干净 |
| `installer.ps1 -AssocDryRun` | exit 0，`.tmp\assoc-dryrun-setup.exe` **1,306,400 B**，sha256 `E7E6DB1C…26C`，`fileVersion=0.32.1.0` | 内部 45,000,000（余 43,693,600） | PASS |
| 版本门 | `host\bin\Sidelight.exe` FileVersion **0.32.1.0** = `package.json` 0.32.1 | — | 过 |

- 上轮 dry-run 1,306,146 B → 本轮 1,306,400 B（+254 B），来源是 `dist` 增长；距两条线余量 43 MB 以上。
- 硬线口径一致：`installer.ps1:98-100`、`verify-installer.ps1:76-81`、`portable.ps1:16`（45,000,000 / 50,000,000）；`measure-first-screen.mjs:21-22`（310,000 / 320,000），与 BRIEF 同值。
- 上轮 S1（README 写死 `SHA256SUMS-0.32.1.txt`）已修：`README.md:21`、`:30` 现为 `SHA256SUMS-<版本>.txt`。
- 未做：正式 setup 不重打（会覆盖 `release/`，红线 8）；真实安装→首启→保存→重开 E2E 未跑。

## S-51-1（P1）安装包把「便携版」README 装进安装目录，文案与安装器行为相反

- 装：`packaging/installer.nsi:135` `File "..\packaging\README.txt"` → `$INSTDIR`（`:128`），默认 `$LOCALAPPDATA\Programs\Sidelight`（`:32`）。
- 文案：`packaging/README.txt:1`「Sidelight **便携版**」；`:4`「这是**免安装版。不写注册表，不建开始菜单**」；`:10`「把整个**压缩包解压**到…」；`:45`「这个**便携包里也没有安装器**」。
- 实际：`installer.nsi:144` 建开始菜单快捷方式；`:146-155` 写 `HKCU\Software\Sidelight` + 卸载项；`:160-186` 可选 `.md` 关联；`:142` 写 `uninstall.exe`。
- 影响：装 setup 的用户在安装目录看到的第一句就是「免安装版」，又被要求解压一个不存在的压缩包、被告知没有安装器，而安装器刚写过注册表与开始菜单。随公开首发包发给每个 Windows 用户。
- 建议：`installer.nsi:135` 改传 `packaging/README-install.txt`（安装版口径：装在哪、怎么卸、开始菜单、可选关联）；便携 zip 保持 `README.txt`。两份都留 `README.txt:27-37` 数据目录三级回退（该节与宿主一致，上轮已核）。

## S-51-2（P2）`release/` 当版产物仍是 11-16 旧构建，`SHA256SUMS.txt` 仍是 0.26.0（上轮 F2 未修）

- 证据：`release/Sidelight-0.32.1-win-x64-setup.exe` **824,595 B** @ 11-16 22:21:32、`…-portable.zip` **910,360 B** @ 22:21:30，而 `dist` 本轮重建后 3,854,735 B；`release/SHA256SUMS.txt` 207 B @ 11-16 04:24 只有 `0.26.0` 两行。
- 影响：直接发这两件会漏 47–50 轮修复；`packaging/README.md:58` 要求以 `SHA256SUMS-<版本>.txt` 为准，本地同名旧文件会被误当校验源。
- 建议：发版前备份并清掉 `release/Sidelight-<版本>-*` 再重打；校验文件按版本改名。

## S-51-3（P2）BRIEF 记的 HEAD 与仓库实际 HEAD 不一致

- 证据：`docs/iteration/BRIEF.md:6` 写 `HEAD fb6fe9a91bf…`；`git rev-parse --short HEAD` = `a523a58`（v2 迭代流程提交），`fb6fe9a` 是父提交。
- 影响：按 BRIEF 取 diff 会漏掉流程提交（`docs/iteration/*`，无产品代码），本轮判定不受影响。
- 建议：scribe 更新 BRIEF 的 HEAD，或拆成「上轮收尾 sha / 当前 HEAD」。

建议入库：S-51-1 → P1；S-51-2（上轮 F2 续）、S-51-3 → P2。
