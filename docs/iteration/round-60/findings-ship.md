# 第 60 轮 finder-ship（安装与启动）

HEAD `5384410`（= 轮前 startSha）。跑过 `npm run verify`（PASS）、`packaging/installer.ps1 -AssocDryRun`（exit 0）、dist↔`host\bin\www` 对比；未跑 `portable.ps1`、未装包、未写 `release/`。

## 实测（无过线项）

| 项 | 实测 | 线 | 结论 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip | **299,727 B**（files=3，raw 969,612） | 内部 310,000 / 硬线 320,000 | PASS，距内部 10,273 B、距硬线 20,273 B |
| dist | 98 文件 **3,875,989 B**（js 3,592,931 / woff2 213,664 / css 67,812） | — | 惰性 chunk 齐：`mermaidLoader` 77,792、`katexLoader` 258,788、`GlobalSearch-B8onHlsE` |
| dry-run setup | **1,312,312 B**，FileVersion 0.32.1.0，`gap=-43687688` | 45 MB / 50 MB | 占 2.9% |
| 版本门 | `package.json` 0.32.1 = `host\bin\Sidelight.exe` 0.32.1.0 | `installer.ps1:28-34`、`:90-96` | 通过 |
| 打包硬线 | `installer.ps1:97-101`/`:126-137`、`portable.ps1:16`、`verify-installer.ps1:76-80` | BRIEF 第 7 条 | 一致（`packaging/README.md:58`） |

打包只读 `dist`（`installer.nsi:140`、`portable.ps1:55`），故 setup 载荷是最新的。

## F1（P1，发布阻断 · 第 38/44/50/54/58 轮重复，BACKLOG 无条目）

`release/Sidelight-0.32.1-win-x64-setup.exe` = **824,595 B**、mtime 2026-11-16 22:21、**FileVersion 0.31.1.0**：文件名写 0.32.1、载荷是 0.31.1。当前 `dist` 的试包是 1,312,312 B，差 **487,717 B（37%）**。

预检（第 58 轮实测）对这类包只输出一条 `UNVERIFIED …装的是别的批次的包`，退出码 0，不判 Fail。所以「直接上传 `release/` 里的现成包」没有门拦。

建议（S，只改 `packaging/`）：`verify-installer.ps1` 里「文件名版本 = `package.json` 版本、setup FileVersion ≠ 该版本」改记 **Fail**；两个打包脚本在 makensis/zip 前断言 `dist\assets\` 有 `mermaidLoader-*`、`katexLoader-*`，且 `dist\index.html` 引用的 `index-*.js` 存在。

## F2（P2，宿主前端陈旧）

`host\bin\www` 与 `dist` 已不同源：www **97 文件 3,864,607 B**、`index.html` mtime 06:30:57、入口 `index-C0MK7z5T.js`；dist **98 文件 3,875,989 B**、07:27:28、入口 `index-CUjM8ce1.js`。www 没有 `GlobalSearch-B8onHlsE.js`、`FindBar-CYvVfU1P.js` 与文件列表那批 chunk —— 它停在第 58 轮（第 58 轮同字节，本轮已分叉）。

影响：直接跑 `host\bin\Sidelight.exe` 看到的是第 58 轮界面（无 `Ctrl+Shift+F` 全局搜索、无列表态侧栏），宿主侧核验会拿旧前端得结论。不影响安装包（见上）。

建议（S）：`host\build.ps1` 拷 `dist`→`host\bin\www`；或预检加一条 `dist\assets\index-*.js` 与 `host\bin\www\assets\` 同名断言。

## F3（P2，文档数字过期）

- `README.md:115` 仍写「当前 297,823 B…距硬线余 22,177 B、距内部余 12,177 B」，增量行止于第 57 轮，缺第 58/59 两行。实测 299,727 B（+1,904 B），余 **20,273 / 10,273 B**。
- `README.md:117` 主 chunk 记 923,234 B（`index-C0MK7z5T.js`，gzip 289,611）；实测 **927,644 B**（`index-CUjM8ce1.js`，gzip 290,964）。
- `README.md:134` 写「37 个文件、473 条断言」；第 58 轮 tester 已 39 文件 495 条（`BACKLOG.md:37`），本轮未复跑。
- `BRIEF.md:6-7` 写「第 58 轮；HEAD `35948b2`」与 297,823 B / 37 文件 473 条；实际第 60 轮、HEAD `5384410`（`35948b2` 是 batch-57 同步提交）。BRIEF 是入口，建议本轮回写。

## F4（P2，校验和来源 · 第 42/58 轮重复）

`release/SHA256SUMS.txt` 仍 207 B、两条 0.26.0，同目录已有 0.27.0–0.32.1 共 23 个资产；`README.md:127` 与 `packaging/README.md:58` 都指向带版本名的 `SHA256SUMS-<版本>.txt`。建议删掉或改由脚本生成。

## 未验证

- 真机安装/卸载、HKCU 卸载项、开始菜单、SmartScreen：沙箱限制（B-202）。
- `npm test` 条数：本轮未跑（只据 `BACKLOG.md:37` 第 58 轮记录）。
- `portable.ps1` 全新执行：会写 `release/`，本轮禁止。
