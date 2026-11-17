# finder-ship · 第 47 轮（安装、体积、启动、开源发布体验）

只读侦察。轮前 `d429211164a6a94dfbcf6a580a857d9beb5371c6`。除 `.tmp/`、`shots/round-47/`、本文件外未写仓库；`release/`、`src/`、`package.json` 未动。

## 0. 本轮跑通的链路（先给正结果，避免下轮重复）

| # | 步骤 | 命令 / 入口 | 结果 |
| :-- | :--- | :--- | :--- |
| A | 生产构建 | `npm run build` | exit 0，`✓ built in 518ms`；主 chunk `dist/assets/index-WMkC_694.js` 911,348 B raw / 285,359 B gzip |
| B | 首屏门 | `node scripts/measure-first-screen.mjs` | **PASS**：`total raw=948109 gzip=293205 headroom=26795 files=3 max=320000`；`target=310000 gap=16795` |
| C | 宿主编译 | `powershell -File host\build.ps1` | exit 0（3 条 CS4014/CS0168 警告，旧有）；`OK host\bin\Sidelight.exe`，`bin 合计 4,891,413 B`，`www/index.html=True` |
| D | 安装包（测试包） | `powershell -File packaging\installer.ps1 -AssocDryRun` | exit 0；`payload fileVersion=0.32.1.0`；`assoc-dryrun=**1,305,391 B**`（`.tmp\assoc-dryrun-setup.exe`，产物落在 `.tmp`，不写 `release/`） |
| E | 安装包预检 | `packaging\verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe -PreflightOnly` | exit 0；`setup=1,305,391 B mtime=2026-11-17 21:03:05 FileVersion=0.32.1.0` / `payload mtime=2026-11-17 21:02:53 FileVersion=0.32.1.0` / `summary: preflight（0 UNVERIFIED）` |
| F | 便携包载荷 | 按 `portable.ps1` 同步骤铺到 `.tmp\portable-r47`（不跑脚本本体，避免写 `release/`） | staging **4,901,699 B**，zip **1,626,484 B**；staging 里 `*.ps1` = **0**、含 `www\index.html` |
| G | 应用端到端（dev server） | `.tmp/e2e-r47-ship.mjs`（CDP 9224） | 首启空白 `未命名.md`/`0 字`、`theme=system`、打字后 `11 字 · 阅读约 1 分钟`、2.6 s 后草稿键 `sidelight.doc.v1` 已写；`consoleErrors=[]`、`failedRequests=[]`；`Ctrl+/` 进源码正常。截图 `shots/round-47/ship-first-launch.png`、`ship-source.png` |

体积口径：首屏 293,205 B（内部 310,000 / 硬线 320,000，余 26,795 B）；安装包 1,305,391 B、便携 zip 1,626,484 B（硬线 50,000,000 / 内部 45,000,000，均远在预算内）。

## 1. P1 · README 首屏头条数字过期，且与同段后文互相矛盾

- 文件：`README.md:114`
- 原文（同一段）：开头「首屏 gzip 从 364,960 B 降到 **288,411 B（−21.0%）**」，结尾「当前 **293,205 B**（第 46 轮 `npm run verify` 实测）」。
- 实测（本轮）：`total raw=948109 gzip=293205`。头条 288,411 B 是第 37 轮的数字，之后 38–46 轮累计 +4,794 B 加进了同一段的「逐轮增量」列表，却没改头条；`−21.0%` 也是按 288,411 算的。
- 同段 `README.md:116` 还写「主 chunk 以最近一次 `npm run build` 输出为准：第 45 轮 910,048 B raw，第 36 轮 898,601 B」——本轮实测 911,348 B raw，比它记的最新一轮多 1,300 B。
- 改法：头条改成 293,205 B（并把百分比重算为 −19.6%），或头条不写死数字、只留「当前」「距硬线余量」两处；`README.md:116` 补第 47 轮 911,348 B。
- 收益：发布说明与 README 对外数字一致；不用发布前再人肉对一次。

## 2. P1 · 安装包/便携包已比上一个发布版大 58% / 79%，但没有一处文档记录这个台阶

- 已发布 0.32.1（GitHub API `releases/tags/v0.32.1`，2026-11-16）：setup **824,209 B**、portable **910,360 B**、macOS zip 905,892 B。
- 本轮同 dist 实测：setup **1,305,391 B**（+481,182 B，**+58.4%**）、portable zip **1,626,484 B**（+716,124 B，**+78.7%**）。
- 原因（本轮 `dist` 实测）：`dist` 合计 **3,849,650 B / 97 文件**，首屏只用 3 个文件 948,109 B（24.6%），其余 2,901,541 B 全是按需 chunk；其中 mermaid 家族 56 个文件 **2,356,028 B（占 dist 61.2%）**，最大 `cytoscape.esm-nTrd5EVq.js` 441,717 B、`chunk-FPAJGGOC-B_OpASA8.js` 361,226 B（被 `mermaid-parser.core` 与各 diagram chunk 引用，不是 KaTeX）、`architectureDiagram-*.js` 145,637 B。KaTeX 侧仍是 `katexLoader` 258,788 B + 15 个 woff2 213,664 B，与 README「gzip 约 84 KB」仍对得上。
- 判断：**不是缺陷**（远在 50,000,000 B 硬线内，且第 46 轮已定「以 Release 页 SHA256SUMS 为准」），但第 36 轮引入 Mermaid 后包体积跳一级，`packaging/README.md:58`、`docs/adr/0017` 与 `STATE.md` 都没有这个新台阶的实测字节。下一位发布轮会以为包还是 824 KB，可能因此漏看回归。
- 改法（不改功能、不改线上口径）：`packaging/README.md` 体积段加一行「第 47 轮实测 setup 1,305,391 B / portable 1,626,484 B；mermaid 家族占 dist 61%」，`ADR-0017` 补实测占比，`STATE.md` 发布行同步。真要减包另立项（裁剪低频 diagram 类型会砍可见能力，要产品负责人定）。
- 证据：`packaging/installer.ps1 -AssocDryRun`、`.tmp/portable-r47.zip`、`Get-ChildItem dist` 求和、GitHub release API。

## 3. P2 · README「安装包实测见下」指不到任何数字

- 文件：`README.md:122`，末句「第 36 轮起惰性加载：首屏不含，打开含图文档才下载；**安装包实测见下**。」
- 下一行（`README.md:124`）是「开发期另有 `playwright-core`…」，再往下没有安装包字节。第 46 轮把硬编码字节改成「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」时漏改了这句。
- 改法：改成「安装包与便携包字节以 Release 页 `SHA256SUMS-<版本>.txt` 为准」，或按第 2 条补一行本轮实测。
- 收益：读者不会找空指针。

## 4. P2 · 迭代公共规则里安装包体积线自相矛盾（旧线仍在）

- 文件：`.tmp/iteration/common.md:5` 写「安装包硬线放宽到 50,000,000 B（内部预算 45,000,000 B）」；同一文件 `:36` 仍写「安装包 ≤1,800,000 B（内部）/ 2,000,000 B（硬线）」。
- 代码侧已是新线：`packaging/portable.ps1:15-16`（`$threshold = 50000000`）、`packaging/installer.ps1:4`（45,000,000 / 50,000,000）、`STATE.md:50`、`packaging/README.md:58`。
- 风险：下一个 finder 按 `:36` 判本轮 1,305,391 B「超预算 3.8 倍」→ 假 P0。改法：删 `:36` 的旧数字，或改成「体积线见本节开头政策」。

## 5. P2 · 打包后应用本轮启动不了（UNVERIFIED，附补测方法）

- 现象：`Start-Process host\bin\Sidelight.exe -PassThru` 后命令 60 s 未返回（转后台后 `job_kill`）；随后 `Get-Process Sidelight` **0 个**，`host\bin\host.log` 的 `LastWriteTime` 仍是 **2026/11/16 21:43:13**（无本轮写入），尾行是上次会话的 `secondary mutex=Global\Sidelight / forwarded, exit`。
- 判断：本会话是非交互沙箱会话，WebView2 宿主窗口起不来（`common.md` 已记录「沙箱禁止启动 Chromium」同一族限制）。不是产品缺陷，判 UNVERIFIED。
- 已做的替代：按 `portable.ps1` 同步骤把**当前 dist + host\bin** 铺成一份可分发的 staging（`.tmp\portable-r47\Sidelight`，4,901,699 B，0 个 `.ps1`，含 `www\index.html`），并实测其 zip 1,626,484 B；应用侧只覆盖到 dev server 的「首启空白 → 打字 → 草稿落盘 → 源码切换」。
- 补测（需真人/交互式桌面，约 3 分钟）：解压 `.tmp\portable-r47.zip` → 双击 `Sidelight.exe`（首启应弹空白 `未命名.md`）→ 写一行 → `Ctrl+S`（应直接写回/另存）→ 关窗重开（应恢复）→ 看 `host.log` 有无错误；或跑 `host-smoke`。
- 未验证的连带项：SmartScreen 实际提示文案、开始菜单快捷方式、HKCU 卸载项、默认安装路径（`%LOCALAPPDATA%\Programs\Sidelight`）在真机是否出现——本轮按「不要改注册表」只跑了 `-AssocDryRun` 测试包与 `-PreflightOnly` 预检，**没有安装**。

## 6. P2 · 本机 CDP 浏览器的扩展会污染「启动不联网」判定（测试卫生）

- 现象（`./tmp/e2e-r47-ship.mjs` 载入 dev server）：87 个请求里 2 个不是 localhost——`https://api.trancy.org/6/rules?device=desktop` 与 `chrome-extension://aepdhbcjfkpncgbmlllcaloniioihlma/assets/eduser.css`。
- 归属：`git grep 'trancy' -- src` **0 命中**、`Select-String` 搜 `src/**` **0 命中** → 产品不发外部请求。这两个请求来自 CDP profile 里装的翻译扩展（Trancy），README.md:111「无遥测，启动不联网」的结论**成立**。
- 改进：以后若要加「启动不联网」自动断言，必须过滤 `chrome-extension:` 与扩展注入域名，或改用干净 profile 的端口；否则恒红，且会被误当成网络回归。

## 7. 试过、判断没问题的路径（0 条的也要写清）

1. `dist` 体积构成：97 文件 3,849,650 B；首屏 3 文件（主 chunk + `rolldown-runtime` + CSS），无 mermaid/katex 进首屏（`files=3`），`dist/index.html` 里只有 `data:image/svg+xml` 内联 favicon、无 CDN/外链、无 sourcemap。首屏预算 PASS。
2. `package.json` 依赖：运行时仍是 Tiptap 3.34 一组 + katex + mermaid 11.12.0 + react/react-dom；无新增依赖，`playwright-core`/`@types/*` 在 devDependencies。与 README「运行时依赖只有三组」一致。
3. 便携 staging 卫生：三类断言（`webview2-data`、`host.log`、`*.ps1`）本轮 staging 全过（`*.ps1` 实测 0）。
4. 安装包版本门：`installer.ps1` 与 `verify-installer.ps1` 都通过，payload 与 package.json 同批（`0.32.1.0`），0 UNVERIFIED。
5. `.github/workflows/*.yml` 里已无 `1,800,000 / 2,000,000` 旧线命中（0 命中）；`packaging/README.md`、`README.md` 的体积段已是 45,000,000 / 50,000,000。仅 `common.md:36` 一处残留（第 4 条）。
6. `packaging/README.txt`（随便携包发给用户）内容与当前行为一致：不写注册表、不建开始菜单、WebView2 运行时要求、`host.log` 排障、`www\` 不可删。
7. 发布资产与本地 `release/` 的差异：GitHub 上 0.32.1 setup 824,209 B（SHA256 `5f0418ff…`），本地 `release/Sidelight-0.32.1-win-x64-setup.exe` 824,595 B → 本地产物是发布后重编的，发布走 CI 不受影响；按约束本轮未动 `release/`，只记录。

## 8. UNVERIFIED 清单

- 打包后应用启动与「首启 → 写 → 保存 → 重开」（沙箱无桌面，第 5 条）。
- 安装一次（HKCU 卸载项、开始菜单、SmartScreen、默认安装路径）：按约束未装，只跑到测试包与预检。
- `packaging/verify-portable.mjs`：脚本要求先跑 `portable.ps1`（写 `release/`）并要 CDP 9335 起浏览器，本轮两条件都不满足，未跑；改用同步骤 staging + zip 实测替代。
- macOS 资产（本机是 Windows，未运行）。
