# round-33 · 安装、体积、启动与开源发布体验（finder-ship，只读）

本轮只读产品代码。唯一写盘动作：`npm run build`（角色任务要求）与把测试产物写到 `.tmp/`。
未改 `release/`、未装系统级软件、未改注册表、未 push。

## 0. 门禁与体积实测

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | PASS，exit 0，132 modules，242 ms | `tsc --noEmit && vite build` 输出 |
| 首屏 gzip | **285,052 B** / 上限 286,000 B（余 **948 B**） | `node scripts/measure-first-screen.mjs` → `total raw=927947 gzip=285052 files=2 max=286000` / `PASS` |
| `dist` 合计 | **1,469,453 B**（46 个文件） | `Get-ChildItem dist -Recurse -File \| Measure-Object Length -Sum` |
| 主 chunk | `index-CIgbljul.js` 894,163 B（gzip 278,024） | dist 实测 + build 输出 |
| 惰性 chunk | `katexLoader-*.js` 258,788（gzip 77,660）+ css 26,627（gzip 7,460） | 同上 |
| KaTeX 字体 | 213,664 B / 15 个 woff2（逐个相加与 README:99 完全一致） | dist 实测 |
| 其余惰性 chunk | TreeActions 7,385 / trash 7,096 / MarginRail 6,044 / SettingsDialog 4,555 / export 4,096 / StatsDetail 2,641 / ShortcutsDialog 2,380 / Outline 2,078 / QuickOpen 2,047 / FindBar 1,435 / PreviewPane 1,136 | 同上 |

dist 体积构成结论：1,469,453 B 里主入口 894,163（60.9%）、KaTeX JS 258,788（17.6%）、字体 213,664（14.5%）、两个 CSS 60,411（4.1%）、11 个小 chunk 42,427（2.9%）。**没有可白拿的减重空间**：字体已只发 woff2、KaTeX 已惰性、预览与导出已拆 chunk（README:97、ADR-0012）。安装包余量见 §6。

## 1. 【P1】已发布的 v0.32.1 Windows 安装包，FileVersion 是 `0.31.1.0`

- 证据（下载发布资产核对，不是本地猜测）：
  - `https://github.com/XuJingye2022/SideLight/releases/download/v0.32.1/Sidelight-0.32.1-win-x64-setup.exe` → 824,209 B，SHA256 `5F0418FF…98D734`（与 Release 说明表、`SHA256SUMS-0.32.1.txt` 一致，确认是发布出去的那个文件）
  - 该文件 `VersionInfo.FileVersion = **0.31.1.0**`，`ProductVersion = 0.32.1`
  - 本地 `release/Sidelight-0.32.1-win-x64-setup.exe`（824,595 B，另一次构建）同样 `FileVersion = 0.31.1.0`
- 对照：当前工作树直接调 makensis 打一个测试包（`/DAPPVERSION=0.32.1`，输出到 `.tmp/ship-check/ship-test.exe`，**不写 release/**）→ `FileVersion = 0.32.1.0`。
  结论：第 30 轮的修已生效（`packaging/installer.ps1:70-87` 的版本断言），**坏的是已经发出去的那个资产**——它由 v0.32.1 tag 构建，早于第 30 轮的修（STATE:95「0.32.1 未发版」）。
- 影响：用户看「属性 → 详细信息」和任务管理器看到 0.31.1，会以为升级没生效或下错包；也会让「按 FileVersion 判版本」的第三方脚本判错。属于 AGENTS §8 已记坑（「v0.32.0 曾发出 0.31.1 的 Windows 包」）的再次发生。
- 建议（不必现在发版，但别忘）：① 下一次发版后按本报告的方法核对**发布资产**的 `FileVersion`，不要核对本地 `release/`；② 在 `release.yml` 发布前加一条断言：对 download-artifact 拿到的 exe 读 `(Get-Item $f).VersionInfo.FileVersion`，必须等于 `"$version.0"`，不等就 `exit 1`。现在这条门只在构建机上跑一次（installer.ps1），发布 job 不复查；③ 若近期要发 0.32.2，可在 CHANGELOG/Release 说明写一句「0.32.1 安装包的 fileVersion 显示为 0.31.1，功能不受影响」。
- 文件:行号：`packaging/installer.ps1:70-87`（现有门）、`.github/workflows/release.yml:103-115`（上传前无复查）。

## 2. 【P1】`verify-installer.ps1` 把版本写死成 `0.31.1`，正确的 0.32.1 包会被判 2 个 FAIL

- 证据：
  - `packaging/verify-installer.ps1:138`：`if ($exeVersion -and $exeVersion.StartsWith('0.31.1')) { Pass ... } else { Fail "exe 文件版本不对：$exeVersion" }`
  - `packaging/verify-installer.ps1:140`：同样写死 `'0.31.1'`（setup 的 VersionInfo）
  - `packaging/verify-installer.ps1:144`：判据用的是正确的 `$version`，但 PASS 文案写死 `'Sidelight.exe --version = 0.31.1'`
  - `packaging/verify-installer.ps1:20` 已经 `$version = (Get-Content package.json …).version`，变量现成
  - 实测值：`host/bin/Sidelight.exe` → `FileVersion = 0.32.1.0`；`installer.nsi:34,37` 的 `VIProductVersion/FileVersion` 都取 `${APPVERSION}` → setup `0.32.1.0`。两者都不以 `0.31.1` 开头 → 必然 2 个 FAIL。
- 影响：这是 `packaging/README.md:43` 写明的验收脚本。现在它**方向反了**：正确的包判失败，0.31.1 的坏包反而判通过。发版前跑它会被假 FAIL 误导，或被人忽略成「已知假红」——两种都削弱门禁。同类问题第 30 轮修过一次（installer 侧），验收脚本漏了。
- 建议：三处改成变量——`$exeVersion.StartsWith("$version")`、`$setupVersion.StartsWith("$version")`、PASS 文案改成 `"Sidelight.exe --version = $cliVersion"`。顺带把 `:144` 的文案与判据对齐。改动 3 行，零风险。

## 3. 【P1】`release.yml` 的 Windows 构建依赖 CI 预热过的 cache，冷缓存时落到未校验的下载路径

- 证据：
  - `ci.yml:68-88`：显式 fetch WebView2 SDK 与 NSIS，两个都做 SHA256 断言（`WV2_SHA256`、`NSIS_SHA256`）；`ci.yml:83` 注释写明「SourceForge 直链会返回反爬 HTML；改用本仓库 Release 固定资产」。
  - `release.yml:84-93`：只有 `actions/cache`（key `tools-wv2-${{ env.WV2_VERSION }}-nsis-3.11`，与 CI 同 key）→ 然后直接 `host/build.ps1`。**没有 fetch 步骤，也没有哈希校验。**
  - `host/build.ps1:18`：缺 SDK 时只打印「取法：Invoke-WebRequest …」，不自己下载 → 冷缓存直接红，报错是一行中文提示。
  - `packaging/installer.ps1:35`：缺 NSIS 时从 `https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip` 下载，**不校验 SHA256**；下载到反爬 HTML 时 `Expand-Archive` 抛的错不指向根因。
- 影响：发版 job 的可用性挂在另一个 workflow 填过的 cache 上。GitHub cache 7 天不访问即逐出，窗口期正好是「几轮不发版」之后。真到那天，发版要么红在缺 SDK，要么红在一个看不懂的 zip 解包错误，而临时把它修绿的最短路径是手动改脚本。
- 建议（二选一，推荐前者）：把 `ci.yml:60-88` 抽成复合 action（`.github/actions/fetch-build-tools`）或 `scripts/fetch-build-tools.ps1`，两个 workflow 共用同一份 fetch + 哈希断言；最低限度是把那两步原样复制进 `release.yml` 的 cache 之后。顺带把 `installer.ps1:35` 的 URL 换成本仓库 Release 的固定资产并加哈希校验——CI 早就这么干了，脚本没跟上。
- 预期收益：发版路径不再依赖 cache 命中；NSIS 下载失败从「zip 解包报错」变成「hash mismatch: …」这一句。

## 4. 【P2】`packaging/README.md` 的构建说明与脚本实际输出不一致

- 证据：
  - `packaging/README.md:42`：「`installer.ps1` … 打印实测字节、**`P + 10,000` 门槛**、硬报警线 850,000 B 与 SHA256」。全仓搜 `10,000`/`10000` 只命中这一行本身；`installer.ps1` 实际打印的是 `installer.ps1:89` 的 `target=820000 gap=` 与 `installer.ps1:112` 的 `hard=850000 B  estimatedSize=`。这个「P + 10,000」门槛不存在。
  - 同节没提 `packaging/portable.ps1:15` 的 `$threshold = 940000`：便携 zip 有独立门槛，README 的「体积预算」（`packaging/README.md:57`）只写 850,000 B，读者会以为 zip 也受 850,000 约束。
- 影响：新维护者按 README 找不存在的东西，或者不知道 zip 超了 940,000 会让 `portable.ps1` exit 1。属低成本高确定性修正。
- 建议：`:42` 改成「打印实测字节、`target=820000 gap=`（内部预算，只报警）、`hard=850000 B` 与 SHA256」；`:57` 补一句「便携 zip 门槛 940,000 B（`portable.ps1`）」。

## 5. 【P2】CI 打了便携 zip 却从不产出；三个 job 重复构建

- 证据：
  - `ci.yml:99-100` 跑 `packaging/portable.ps1`；`ci.yml:108-112` 的 upload-artifact 只匹配 `release/Sidelight-*-win-x64-setup.exe`；`ci.yml:102-106` 的 Checksums 也只哈希 setup。=> 便携 zip 每周构建一次然后丢掉，没有任何人能用它。
  - `release.yml:110-115` 相反，是上传 zip 的。两处行为不一致。
  - `gate`（`ci.yml:38`）、`windows-host`（`ci.yml:58`）、`macos-host`（`ci.yml:128`）各自 `npm ci` + `npm run build`；dist 与平台无关。`ci.yml:39` 的首屏测量只在 gate 跑，但 release.yml 里 windows 与 macos 各跑一次（`:82`、`:145`）。
- 影响：每次 push 浪费 2 次 `npm ci` + 2 次全量构建（约 2–3 分钟 runner 时间），且 CI 产出的 zip 永远拿不到（想手工验证便携包只能本地打）。
- 建议：① `ci.yml:108-112` 的 path 加一行 `release/Sidelight-*-win-x64-portable.zip`，或在 upload 前 `if-no-files-found` 断言里连带 zip；② 三个 job 共享 dist artifact 收益有限、改动面大，本轮不建议；③ release.yml 的两处 `measure-first-screen` 留一处即可（保留 windows-build，删 macos-build 的）。
- 判定：低风险，纯 workflow 改动。

## 6. 【P2】体积数字复核：README 与发布资产完全一致，但「用本地 release/ 核对」会得到错的数

核对结果（逐项，全部对得上）：

| 数字 | README/STATE | 实测 | 结论 |
| :--- | ---: | ---: | :--- |
| 首屏 gzip | 285,052（上限 286,000，余 948） | 285,052 | 一致 |
| 主 chunk raw | 894,163 | 894,163 | 一致 |
| KaTeX 字体 | 213,664 / 15 个 | 213,664 / 15 个 | 一致 |
| setup（发布资产） | 824,209（`README.md:97`、`STATE:57`） | 824,209（GitHub API） | 一致 |
| portable zip | 910,360 | 910,360（GitHub API + 本地 release/） | 一致 |
| macOS Universal | 905,892 | 905,892（GitHub API） | 一致（本机 `release/` 里没有 macOS 包，符合「Windows 不能编 macOS」） |
| 内部预算 820,000 超支 | +4,209 B | +4,209 B | 一致 |
| 硬线余量 | 25,791 B | 25,791 B | 一致 |

不一致处与建议：

- **本地 `release/Sidelight-0.32.1-win-x64-setup.exe` 是 824,595 B，不等于发布资产 824,209 B**（另有 386 B 差异，因为两次构建的文件时间戳进了 NSIS 压缩流）。核对发布数字只能看 Release 页或 GitHub API。`README.md:97` 已经指向 `SHA256SUMS-0.32.1.txt`，这条正确，别改成「本地 release/」。
- `release/SHA256SUMS.txt`（207 B）还是 0.26.0 的两个哈希，命名也不符合 `SHA256SUMS-<版本>.txt` 约定。release/ 不进版本控制，属本地卫生；建议删掉或改名 `SHA256SUMS-0.26.0.txt`，免得下次发版被人当成「最新校验和」。
- 余量结论：首屏余 948 B、安装包距硬线余 25,791 B。按 ADR-0017 的实测（Mermaid 最小增量把安装包推到 1,474,881 B），**任何新依赖型功能都过不了硬线**；本轮的 3 条 P1 全部是「不增字节」的修正，适合先做。

## 7. 启动路径：不联网、不常驻（本轮复核为「未发现问题」）

- 不联网：`dist/index.html` 里没有任何外部资源（唯一的 `http` 出现在 `data:` 内联 favicon 的 SVG 命名空间里）；`dist/assets/index-*.js` 里的外部 URL 只有 `api.deepseek.com/v1`、`api.deepseek.com/v1/tools/search`、`api.tavily.com/search`、`api.bochaai.com/v1/web-search` 四个用户点「联网核对」才用的接口，其余是 `marked`/`prosemirror`/`react` 的文档链接字符串。KaTeX 的 JS/CSS/字体都在 `dist/assets/`（首屏不加载，首次渲染公式才取本地文件）。
- 不常驻、不自启：`installer.nsi` 的全部注册表写入只有 `HKCU\Software\Sidelight`（`:137`）、`HKCU …\Uninstall\Sidelight`（`:138-146`）与 `HKCU\Software\Classes` 的关联节（`:167-176`），**没有 `…\CurrentVersion\Run`、没有服务、没有计划任务**；`Section /o` 关联默认不勾（`:151`）。宿主只起一个窗口，唯一常开的是回环 HTTP 服务 `127.0.0.1:47821`（`host/Program.cs:603,1519`），进程随窗口退出；未见更新检查或遥测调用（README:94 的声明与实现一致）。
- 宿主层唯一「常驻感」来源是 `host/Program.cs:844-852` 的 5 s 关窗计时器，只在关窗流程里启动，不是后台轮询。不是问题。

## 8. 依赖：无可减项（核对结论）

- 运行时 13 个包全部被间接或直接用到：`src/**` 里 `@tiptap/core`(5)、`extension-image`、`extension-mathematics`、`extension-strike`、`extension-table`、`extension-task-item`、`extension-task-list`、`markdown`、`react`、`starter-kit`(3) 都有 import；`katex` 经 `resolve.alias` 指向 `src/lib/katexLazy.ts` 并按需深路径加载；`react-dom` 为挂载必需。
- `@tiptap/pm` 在 `src/**` 里**没有直接 import**（grep `from '@tiptap/'` 的结果里没有它）。它是 `@tiptap/core` 的 peer，npm 7+ 会装；删掉这条显式声明**不会减小任何产物**（dist 里该模块本来就因 core 存在），只会多一个「依赖漏声明」的隐患。结论：**不建议动**，只记一条「不是省字节的机会，别为它开任务」。
- 开发依赖 `playwright-core`（scripts/）、`@types/node`（测试）、`typescript`、`vite`、`@vitejs/plugin-react` 都有人用。
- 结论：本轮**没有可落地的减依赖项**。想要包更小，只能动宿主载荷（`host/bin/Microsoft.Web.WebView2.Core.dll` 703,328 B 占未压缩载荷 2,494,315 B 的 28%），那是另一个量级的工程，不在本轮范围。

## 9. 清单：能落地的改进（按性价比）

| # | 改进 | 优先级 | 改动面 | 省下什么 |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `verify-installer.ps1` 三处写死的 `0.31.1` 改成 `$version` | P1 | 3 行 | 验收假红，门禁可信度 |
| 2 | `release.yml` 补 pinned fetch + 哈希校验（或抽复合 action） | P1 | ~20 行 / 新文件 | 发版不依赖 cache 命中 |
| 3 | `installer.ps1:35` 换仓库 Release 固定资产 + 校验和 | P2 | 3 行 | NSIS 下载失败的可诊断性 |
| 4 | release 发布前断言发布资产 `FileVersion == "$version.0"` | P1 | ~5 行 | 拦住 §1 那类错版本外发 |
| 5 | `packaging/README.md:42,57` 修门槛描述 | P2 | 2 行 | 文档不一致 |
| 6 | `ci.yml` 把便携 zip 一起上传 / 删重复 `measure` | P2 | 2 行 | 产物可用、runner 时间 |

## 10. 未做 / 未验证

- 未跑 `verify-installer.ps1`（要求「不要实际安装系统级软件」）：§2 的结论用「脚本判据 + `host/bin/Sidelight.exe` 与 setup 的实测 VersionInfo」推出，未在真机装一遍。补测方法：`powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1`，预期 `FAIL exe 文件版本 0.32.1.0` 与 `FAIL setup VersionInfo 0.32.1.0`。**本项记 UNVERIFIED（未执行安装）**，但判据是确定性的，不依赖运行环境。
- 未验证 Windows 安装后的 HKCU 卸载项、开始菜单、SmartScreen（沙箱吞 HKCU，同 `packaging/README.md:49`）。CI 的 `install-verify` 仍只手动触发，未跑。
- SourceForge 直链今天在本机取不到（`Invoke-WebRequest` 报「基础连接已经关闭」，本机 Windows PowerShell 5.1 默认 TLS 1.0 所致，不是该 URL 的定论）。§3 对 SourceForge 的判断依据是仓库内一手记录 `ci.yml:83`，不是我这次的网络结果。
- 未测真实宿主冷启动、真实 WebView2 缺失分支。
- 体积数字全部来自本轮 `npm run build` 产物；注释里未复核 `docs/qa-report.md` 与 Typora 差距表的数字。
