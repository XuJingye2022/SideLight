# 第 53 轮 finder-ship：安装与启动

轮前 startSha `86ba2d1`（=HEAD，本轮未动代码）。只读检查，未改 `release/`。

## 门禁与打包实测

| 项 | 结果 |
| :--- | :--- |
| `npm run verify` | **PASS** `gzip=296055`，硬线 320,000 余 23,945；主 chunk `index-B2f5-0fa.js` 918,625 raw / 288,036 gzip |
| 预算线 vs BRIEF | 首屏 `310000/320000`（`scripts/measure-first-screen.mjs:21-22`）；安装包 45M/50M（`installer.ps1:98-126`、`portable.ps1:16`、`verify-installer.ps1:76-81`）全一致，0 处旧线 |
| payload 版本门 | `host\bin\Sidelight.exe` FileVersion **0.32.1.0** = package.json 0.32.1（`installer.ps1:30-34` 过） |
| `installer.ps1 -AssocDryRun` | exit 0；`assoc-dryrun=1,308,040 B`、`fileVersion=0.32.1.0`、`gap=-43,691,960` |
| 新包批次门 | `verify-installer.ps1 -PreflightOnly -Setup .tmp\assoc-dryrun-setup.exe` → `0 UNVERIFIED` |

构建与打包链健康，两条预算都远未触线。**未做**真实安装→启动→保存→重开：沙箱写 `%LOCALAPPDATA%\Programs`/HKCU 不可观测、无交互桌面（同 `packaging/README.md:47-51`），记 UNVERIFIED。

## findings

### F1（P1，发布阻断项）`release/` 的 0.32.1 包是 0.31.1 资源，且早于当前源码批次

- 证据：`release\Sidelight-0.32.1-win-x64-setup.exe` **FileVersion=0.31.1.0**、824,595 B、mtime 2026-11-16 22:21；0.32.0 与 0.31.0 同样 0.31.1.0。本轮同源重打 **1,308,040 B**（+483,445 B，量级与第 36 轮起 Mermaid chunk 相符）→ 盘上包不含第 36–52 轮内容。
- 危害：「v0.32.0 发出 0.31.1 包」的代码缺陷已修（干跑产物 0.32.1.0），但残留成品还在。本机发布路径下 `verify-installer.ps1:27` 默认就取这个旧包，`:61-65` 只报 **UNVERIFIED 不报 FAIL**，易被当成可发布。CI `release.yml:100-101` 会重打，本机路径不会。
- 建议：① 发布前必须用当前 `dist`+`host\bin` 重打；② 批次门的 FileVersion 不等应升为 FAIL（或加 `-AllowStale` 才放行）；③ 发版批清掉 0.32.0/0.32.1 旧包（本轮按红线不动）。

### F2（P2）README 首屏数字与轮次列表过期 1,142 B

- 证据：`README.md:114` 写「当前 **294,913 B**（第 50 轮实测，距硬线余 **25,087 B**）」，列表止于第 50 轮 +540。本轮 verify **296,055 B**（第 51 轮 +563、第 52 轮 +579，见 `STATE.md:134-135`），真实余量 23,945 / 内部余 13,945。
- 建议：改该行「当前」与余量，补两轮增量；`README.md:116` 的主 chunk 仍写第 50 轮 915,279 raw，可换代为本轮 `index-B2f5-0fa.js` 918,625 B。

### F3（P2）`BRIEF.md`「当前」块过期两轮，整批代理按旧基线开工

- 证据：`docs/iteration/BRIEF.md:6-7` 写「第 51 轮；HEAD `fb6fe9a`；33 文件 432 条；294,913 B」。实际起点 `86ba2d1`、`STATE.md:135` 记第 52 轮 **34 文件 442 条 / 296,055 B**，本轮复测一致。
- 危害：planner/critic 会按过期测试基数与余量判断可加体量；BRIEF 是必读文件，错两轮会顺延。
- 建议：批首刷新四行（轮次、HEAD、测试文件/条数、首屏 gzip 与余量），数字直接抄 `npm run verify` 的 `gzip=/headroom=` 与 `npm test` 输出。

### F4（P2）本机 `release/SHA256SUMS.txt` 只覆盖 0.26.0

- 证据：该文件（mtime 2026-11-16 04:24）只有 0.26.0 的 setup+zip；0.27.0–0.32.1 共 10 版无本机校验和。CI `release.yml:210-239` 按版本生成并 `sha256sum -c`，本机无后缀版属残留。
- 建议：本机不再维护，或在 `packaging/README.md` 注明「本机残留，别用」；核验一律用 Release 页 `SHA256SUMS-<版本>.txt`。

## 未验证

- 真实安装包「首次启动→写→保存→重开」：受沙箱与交互桌面限制（时间上限内只做 `-PreflightOnly`）。
- WebView2 缺失分支、SmartScreen、真人双击、卸载残留：沿用第 46/50 轮记录，无新证据。
- 便携 zip 本轮未重打（`portable.ps1` 写 `release/`，按红线不动；`$threshold=50000000` 已静态核对）。
