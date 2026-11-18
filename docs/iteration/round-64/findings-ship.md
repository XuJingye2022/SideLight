# 第 64 轮 安装与启动（finder-ship）findings

轮前 SHA `368431c`；CDP 9224。只读产品代码，未写 `release/`。

## 轻量检查（无 P0/P1）

- `npm run verify` **PASS**：首屏 gzip **300,841 B**（files=3，硬线余 19,159 / 内部余 9,159）。`.tmp/r64-ship-verify.log`。
- `dist` 98 文件 3,880,522 B；主 chunk `index-ClIwzq5b.js` 931,219 raw / 295,554 gzip；katex 与 mermaid chunk 全惰性，`dist/index.html` 只引 3 文件，与 measure 口径一致。
- `installer.ps1 -AssocDryRun` exit 0：payload FileVersion **0.32.1.0**（= `package.json`），试包 **1,313,691 B**，`gap=-43,686,309`；产物在 `.tmp/`。
- 硬线三处同值：`installer.ps1:98-101,124-126`、`portable.ps1:16`、`verify-installer.ps1:88-92`（45 M / 50 M）；版本门 `installer.ps1:30-34`、`portable.ps1:37-41`、`release.yml:103-111` 均在，实测通过。

## 已存在条目（不重复计数）

- **B-126 仍成立**：`host\bin\www` 97 文件 3,864,607 B、入口 `index-C0MK7z5T.js`；`dist` 98 文件 3,880,522 B、入口 `index-ClIwzq5b.js`。打包只读 dist（`installer.nsi:138-140` 先删 `$INSTDIR\www` 再装），不影响安装包。

## F1（P2）暖纸主题首屏预绘制底色不对，深色系统刷新闪一次深色

- 证据：`index.html:13-43`（`dist/index.html` 同源）预绘制 `<style>` 只有 `#f6f4ee`/`#15171a` 与 `[data-theme='dark'|'light']`，行内脚本白名单只有 `light|dark|system`；第 55 轮加的 `sepia` 两处都漏。
- 实测（`.tmp/e2e-r64-ship-prepaint.mjs` → `.tmp/r64-ship-prepaint.json`，存档 `theme=sepia`）：冻结预绘制态 `htmlBg` = `rgb(21,23,26)`（系统深色）/ `rgb(246,244,238)`（系统浅色），`data-theme` null；暖纸纸底 `#f4e8d2` = `rgb(244,232,210)`。载入后 `body` 为 sepia，但系统深色下 **`html` 仍是 `rgb(21,23,26)`**（过卷区仍深色）。
- 修法：`index.html` 白名单加 `'sepia'` + `html[data-theme='sepia']{background:#f4e8d2}`（与 `themes.ts` 的 `--paper` 同值，可加一条测试断言两边同值）。

## F2（P2）README 首屏字节与主 chunk 数字停在 61 轮

- `README.md:119` 写「当前 **300,727 B**、距硬线余 19,273」，实测 **300,841 B**、余 **19,159**（62 轮 300,834、63 轮 300,841；增量表也止于「第 61 轮 +968」）。
- `README.md:121` 写主 chunk「930,741 B raw（`index-CYA9LD0u.js`，gzip 291,919）」，实测 **931,219 raw / 295,554 gzip**（`index-ClIwzq5b.js`）。
- 按流程由批末 scribe 同步，本轮只留准确数字与 `.tmp/r64-ship-verify.log`。

## F3（P2）便携 zip 无验收接线，`verify-portable.mjs` 是死脚本

- `package.json`、`ci.yml`、`release.yml` 里 `verify-portable` **0 命中**；`verify-portable.mjs:3` 仍写人工用法。release.yml:98-124 只打包上传，仅断 setup FileVersion，不比 zip 内容。
- 次生：`verify-portable.mjs:13` 的 `SHOTS='shots/round-02'`，照文档跑会覆盖已跟踪历史截图（同 `keyboard-acceptance` 坑）。
- 修法：Windows job 打包后跑该脚本（或至少断言 zip 内 `www/index.html` 入口与 `dist/index.html` 一致），`SHOTS` 改 `.tmp`。

## 结论

ship 面本轮 **0 个 P0/P1、无发布阻断**：首屏余 19,159 B、安装包余 43,686,309 B，两道体积门与版本门一致可执行。3 条 P2 不阻塞停止。
