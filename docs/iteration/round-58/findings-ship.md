# 第 58 轮 finder-ship（安装与启动）

HEAD `2514650`。跑过：`npm run verify`（PASS）、`packaging/installer.ps1 -AssocDryRun`（exit 0）、`packaging/verify-installer.ps1 -PreflightOnly`。未跑 `portable.ps1`、未装包、未碰 `release/`。

## 记录：本轮没有过线项

| 项 | 实测 | 线 | 结论 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip | **297,823 B**（files=3，raw 961,958） | 内部 310,000 / 硬线 320,000 | PASS，与 BRIEF 一致 |
| dist | 97 文件 **3,864,607 B**（js 3,584,793 / woff2 213,664 / css 64,568 / html 1,582） | — | 惰性 chunk 齐：`mermaidLoader-CWE_lN0O.js` 77,792、`katexLoader-CNO5m-uY.js` 258,788 |
| dry-run setup | **1,310,406 B**，FileVersion 0.32.1.0，`target=45000000 gap=-43689594` | 45 MB / 50 MB | 占 2.9%，余量充足 |
| `host\bin\www` | 97 文件 3,864,607 B，`index-C0MK7z5T.js` 与 dist 同名同字节 | — | 第 50 轮记的「bin\www 陈旧无门禁」本轮不成立 |
| `packaging/*.ps1` 硬线与版本门 | `installer.ps1:28-34`（payload 版本）、`:90-96`（产物 FileVersion）、`:97-101`/`:126-137`（45 MB WARN / 50 MB exit 1）；`portable.ps1:16`、`:36-41` | BRIEF 第 7 条 | 一致；portable 只共用 50 MB 硬线，`packaging/README.md:58` 有依据 |
| README / packaging/README 字节 | 均写「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」（`README.md:127`、`packaging/README.md:58`） | — | 无过期硬数字 |

## F1（P2，发布门禁；第 38/44/50/54 轮重复，BACKLOG 无条目）

「产物与源码同源」没有门。用当前 `dist` 打试包是 **1,310,406 B**；`release/Sidelight-0.32.1-win-x64-setup.exe` 是 **824,595 B**（mtime 2026-11-16 22:21），差 **485,811 B**。读 `release/Sidelight-0.32.1-win-x64-portable.zip` 可证明那份载荷的 `www` 只有 25 个文件 / 1,434,707 B，**没有 `mermaidLoader`、`cytoscape` 或任何 diagram chunk**（36 条目 / 解压 2,513,216 B）。`verify-installer.ps1 -PreflightOnly` 的输出只有一条 UNVERIFIED、退出码 0：

```
setup=824,595 B  mtime=2026-11-16 22:21:32  FileVersion=0.31.1.0
payload mtime=2026-11-18 06:31:09  FileVersion=0.32.1.0
UNVERIFIED setup 的 FileVersion 是 0.31.1.0，payload 是 0.32.1.0：装的是别的批次的包
summary: preflight（1 UNVERIFIED）
```

即：一个**文件名写 0.32.1、FileVersion 是 0.31.1.0** 的包，预检不判失败。CI 侧不受影响：`release.yml:79-80,93-101` 先 `npm ci` + `npm run build` 再 `host/build.ps1` → `installer.ps1` → `portable.ps1`；`ci.yml:97,100` 同样打包，但不跑 `verify-installer.ps1`。

建议（S，只改 `packaging/`）：① 两个打包脚本在 `makensis`/`zip` 前断言 `dist\assets\mermaidLoader-*.js` 与 `katexLoader-*.js` 存在，且 `dist\index.html` 引用的 `index-*.js` 与 `host\bin\www\assets\` 同名——挡住「拿陈旧 dist 打包」；② `verify-installer.ps1` 把「setup FileVersion ≠ `package.json` 版本」从 UNVERIFIED 改 Fail（只有批次不同、版本相同才留 UNVERIFIED）。

## F2（P2，校验和来源；第 42 轮重复）

`release/SHA256SUMS.txt` 只有 207 B、两条 0.26.0 记录，而同目录已有 0.27.0–0.32.1 共 22 个资产。`README.md:127` 与 `packaging/README.md:58` 都指向带版本的 `SHA256SUMS-<版本>.txt`，这个无版本后缀的文件只会误导。建议删掉（`release/` 不进版本控制），或由打包脚本生成带版本名的新文件。

## 未验证

- 真机安装/卸载、HKCU 卸载项、开始菜单、SmartScreen：沙箱限制（B-202）。
- `release/` 里 0.32.1 是否已发到 GitHub：本机未联网核对；BRIEF:6 写「未发版」，而 `docs/iteration/round-36/findings-ship.md:174` 记 GitHub 资产 setup 824,209 B。
- `portable.ps1` 全新执行：会写 `release/`，本轮禁止。
