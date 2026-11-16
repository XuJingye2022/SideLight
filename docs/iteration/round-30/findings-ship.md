# 第 30 轮 · 安装、体积、启动与开源发布（finder-ship）

只读侦察。未修改产品代码，未动 `release/`，未写注册表，未安装任何系统级软件，未 push。

## 1. 本轮实测

环境：`D:\Documents\SidelightProgram`，branch main，Node 24（`.nvmrc`=24），Windows 11。
本轮只有我跑构建，未并发。

### 1.1 构建

```text
> tsc --noEmit && vite build
vite v8.3.8 building client environment for production...
✓ 131 modules transformed.
✓ built in 233ms     （退出码 0）
```

无类型错误、无 chunk 体积告警（`chunkSizeWarningLimit: 1200`，主 chunk 895.84 kB < 1200）。

### 1.2 首屏 gzip 与预算

```text
$ node scripts/measure-first-screen.mjs
   895849   278841  /assets/index-CyWsDpum.js
    33592     6997  /assets/index-DteRiUms.css
total raw=929441 gzip=285838 files=2 max=286000
gzip 省下 643603 B（69.2%）
PASS
```

余量 **162 B**（286,000 − 285,838）。脚本本身正确：只取 `index.html` 里的 script/stylesheet/modulepreload/preload，出现 `katex`/`lazy` 就 exit 1（`scripts/measure-first-screen.mjs:27-67`）。

### 1.3 dist 构成（28 文件，1,462,697 B）

| 类别 | 字节 | 占 dist | 说明 |
| --- | ---: | ---: | --- |
| 主 chunk `index-*.js` | 895,849 | 61.2% | 首屏，gzip 278,841 |
| KaTeX JS `katexLoader-*.js` | 258,788 | 17.7% | 懒加载，gzip 77,660 |
| KaTeX 字体 15 个 woff2 | 213,664 | 14.6% | 懒加载，**已预压缩，二次压缩比 1.0** |
| CSS 两份 | 60,219 | 4.1% | 主 33,592 + katexLoader 26,627 |
| 懒组件 8 个 JS | 32,682 | 2.2% | FindBar/QuickOpen/Outline/ShortcutsDialog/SettingsDialog/MarginRail/trash/TreeActions |
| `index.html` | 1,495 | 0.1% | 无外部 CDN、无 preconnect |

字体不可压缩的实测：取 `dist\assets\KaTeX_AMS-Regular-BQhdFMY1.woff2`（28,076 B）用 Deflate Optimal 再压得 28,086 B（比 1.0），即 woff2 在 NSIS LZMA / zip Deflate 里几乎不缩，**213,664 B 基本 1:1 进入安装包**。

### 1.4 release/ 资产（本地，只读）

| 文件 | 字节 |
| --- | ---: |
| `Sidelight-0.32.1-win-x64-setup.exe` | 824,595 |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 |

`release/SHA256SUMS.txt` 仍是 0.26.0 的两行，已过期（`release/` 不进版本控制，仅提示，不算缺陷）。

发布页实测（GitHub API `releases/tags/v0.32.1`）：

| 资产 | 发布字节 | 本地字节 | SHA256 |
| --- | ---: | ---: | --- |
| setup.exe | 824,209 | 824,595 | `5f0418ff7965a45f4eec5a0e233699c638b4a8606bd7346a08af56729798d734` |
| portable.zip | 910,360 | 910,360 | `3c4a3a5801d736583cc6ff19b2f8fcdb32c8ac12509a45305e91a303c5b24637` |
| macos-universal.zip | 905,892 | 本地无（CI 产物） | `2f838b77363a5ee2d4d46b0a3c5363758d92214af9672c6964d6e50fdc448b14` |

`STATE.md:54` 的三个数与发布页一致。便携 zip 本地/发布逐字节相同，setup 差 386 B（NSIS Solid LZMA 不受控），见 S5。

### 1.5 启动路径（联网 / 常驻）

- 前端启动期只请求同源 `/__doc`、`/__draft`、`/__annotations`、`/__recent`（`src/App.tsx:1115,1200,1217,2811,3067`），无外部域名、无 WebSocket、无 CDN 外链（`index.html` 内联全部资源，favicon 是 data URI）。
- 宿主只起回环 `127.0.0.1:47821`（`host/Program.cs:21`，`Host` 校验在 `:565`），无托盘、无后台常驻。
- **结论：启动不联网、无后台常驻。这条不构成缺陷，本轮无改动建议。**

## 2. 安装步骤准确性（packaging）

核对通过的部分：

- `installer.nsi` 的 WebView2 检测顺序（32 位注册表 → 64 位 → HKCU → `msedgewebview2.exe` 目录枚举）、缺失时 `Abort` + 下载链接，与 `packaging/README.md:18` 一致。
- `.md` 关联是 `/o` 可选节，`/S` 静默安装不写（`installer.nsi:151`），与 README:15 一致。
- 卸载只删程序目录、快捷方式、HKCU 卸载项与自己的 ProgID，`%LOCALAPPDATA%\Sidelight` 保留（`installer.nsi:184-196`），与 README:24 一致。
- 便携版数据目录三级回退与窗口标题「（便携数据目录）」（`host/Program.cs:1395-1404,149`）与 `packaging/README.txt:33-34` 一致。
- `.nvmrc`=24 与 `ci.yml` 的 `node-version-file` 一致；ADR 0001–0016 存在，与 README:156,197 一致。

## 3. 发现（按严重度）

### S1 · P1 · 安装器版本资源仍写死 0.31.1.0

`packaging/installer.nsi:34`、`:37`：

```
VIProductVersion "0.31.1.0"
VIAddVersionKey /LANG=2052 "FileVersion" "0.31.1.0"
```

只有 `ProductVersion` 用了 `${APPVERSION}`（`:36`）。

实测（本轮 0.32.1 本地构建产物）：

```text
$ [System.Diagnostics.FileVersionInfo]::GetVersionInfo('release\Sidelight-0.32.1-win-x64-setup.exe')
FileVersion=0.31.1.0
ProductVersion=0.32.1
```

用户右键属性 → 详细信息看到「文件版本 0.31.1.0」；企业软件清单、部分安全软件与「应用和功能」读取的也是这个值。这正是 `AGENTS.md` §8 记过的坑（「版本号不要写死……v0.32.0 曾发出 0.31.1 的 Windows 包」）——当时只把 `ProductVersion` 改成变量，`VIProductVersion` 与 `FileVersion` 仍是常量，所以 0.32.1 又把同一个错误发出去了。发布流水线也没有断言（见 S2）。

对照：宿主 exe 是对的——`host/bin/Sidelight.exe` FileVersion=0.32.1.0，因为 `host/build.ps1:31,35-40` 从 `package.json` 生成 AssemblyInfo。

**预期收益**：资源管理器/清单里的版本可信；不再需要发版后人工核对。**落地成本**：改两行 + 一条断言。
建议：`VIProductVersion "${APPVERSION}.0"`（NSIS 要 4 段），`FileVersion` 同源；`release.yml` 加一条 PowerShell 断言 `(GetVersionInfo(setup)).FileVersion -eq "$version.0"`，不一致 exit 1。**注意**：已被 0.32.1（很可能还有 0.32.0）发出去，修完只对下一个版本生效。

### S2 · P1 · 发布流水线没有测试与体积门禁

`release.yml` 的两个构建 job 只跑 `npm run build`（`:80`、`:142`），没有 `npm test`，也没有 `node scripts/measure-first-screen.mjs`；这两步只在 `ci.yml:38-40`（push/PR 的 gate job）里。

后果：打 tag 时不会因为测试红或首屏超预算而停。0.32.1 的 Release 说明写「`npm test` 17 文件 248 条」「首屏 gzip 285,783 B」，这些数字**只能靠人记**，没有任何流水线步骤证明它。同一 commit 上 CI 与 release 是两条路径，release 走的那条什么都没量。

顺带：`packaging/portable.ps1` 也不在 CI 里跑（`ci.yml` 只到 installer.ps1，`:97`），便携包的打包回归要等发版才暴露。

**预期收益**：发版前自动挡住「测试红」「首屏超线」「便携打包坏」三类事故。成本约 40 秒（`npm test` 本轮实测毫秒级，measure 子秒）。建议放进 `release.yml` 的 `windows-build`（顺便把首屏数字从 measure 输出贴进 Release notes，替代人工抄）。

### S3 · P1 · 两处体积预算都已贴线：安装包超目标线、首屏只剩 162 B

#### 3a 安装包 820,000 B 目标线已破，门禁只认 850,000 B

README 两处声明「安装包内部预算 820,000 B（硬线 850,000 B）」（`README.md:96`、`:107`）。实测：

| 版本 | setup 字节 | 距 820,000 |
| --- | ---: | ---: |
| 0.30.4（本地） | 819,208 | −792 |
| 0.31.0（本地） | 828,573 | **+8,573** |
| 0.31.1（本地） | 820,776 | **+776** |
| 0.32.0（本地） | 824,361 | **+4,361** |
| 0.32.1（发布） | 824,209 | **+4,209** |

从 0.31.0 起就没回到目标线，四轮无人发现。`packaging/installer.ps1:91-93` 只打印 `hard=850000` 并在 `>850000` 时 exit 1，不打印与 820,000 的差、也不警告。距硬线只剩 **25,405 B**（本地产物）/ **25,791 B**（发布资产），而 KaTeX 字体 213,664 B 那部分基本不可压（见 1.3），后续任何字体或扩展新增都会直接吃这段余量。

**预期收益**：体积回归在看板上可见，而不是等硬线撞墙。**落地成本**：installer.ps1 加 5 行（打印 `target=820000 gap=`，超目标线 `Write-Warning` 不 exit），更新 README:96,107 与 `packaging/README.md:57` 的真实数字（那里还写着「0.22.0 实测 808,897 B（余量 41,103 B）」）。

若要真回到 820,000 B：唯一有量级的选项是裁 KaTeX 字体（Script 9,644 + Fraktur 11,316 + SansSerif 10,344 + Caligraphic 6,908 + Typewriter 13,568 = **51,780 B**，约安装包 6.3%），代价是 `\mathscr`/`\mathfrak`/`\mathcal`/`\texttt` 的公式保真下降。这是「砍一个用户看得见的能力」，按 `AGENTS.md` §1 必须回到产品负责人，本轮只登记、不建议直接做。

#### 3b 首屏只剩 162 B，第 30 轮 T2 之前要先算账

`285,838 / 286,000`，余量 162 B（见 1.2）。`measure-first-screen.mjs` 的计数对象是 `index.html` 里引用的全部 JS/CSS，主 chunk 再涨 162 B 就 FAIL。

下周要做的 T2「状态栏字数明细」（`STATE.md:124`）如果落在 `App.tsx`（主 chunk），很可能一次就超。**建议**：T2 的实现放进已拆出的懒 chunk（如 `Outline`/`SettingsDialog` 同级的独立文件），或在 plan 里明确写「T2 会占 X B，先回收 Y B」。回收途径（都不动依赖）：把 `src/components` 里首屏不需要的静态 import 改成 `React.lazy` 同现有 8 个懒组件；`vite.config.ts:32-38` 的注释也过期了（写「约 840 KB」「1.10 MB」两处，实测 895,849 B）。

预算数字本身要不要抬，是决策不是修 bug：临时上限 286,000 从 0.31.0 起沿用（`docs/CHANGELOG.md:72` 记「数据安全例外」），此后每个版本都贴着走——285,471（余 529）→ 285,997（**余 3 B**，`CHANGELOG.md:41`）→ 285,783（余 217）→ 285,838（余 162）。四版都在 1.2 KB 以内，它不是「临时」了。

### S4 · P2 · 升级安装不清 `$INSTDIR\www`，旧 hash chunk 累积

`packaging/installer.nsi:130-131`：`SetOutPath "$INSTDIR\www"` 后直接 `File /r "..\dist\*"`，**没有先删旧目录**。卸载才 `RMDir /r "$INSTDIR"`（`:187`）。

后果：每次覆盖升级，`index-<旧 hash>.js`、`katexLoader-<旧 hash>.js`、旧 woff2 都留在用户机器上，永不清理，直到卸载。单个旧主 chunk 约 896 KB（LZMA 后约 230 KB）。升级十几次后 `www` 会明显大于当次载荷，「应用和功能」里显示的 `EstimatedSize`（只算当次载荷，`installer.ps1:44-50`）与实际占用越差越远。

**预期收益**：磁盘占用回到当次载荷；也避免旧 `index.html` 与新 chunk 混搭的排查干扰。**落地成本**：`do_copy` 前加 `RMDir /r "$INSTDIR\www"`（1 行，先 `CheckRunning` 已保证进程未运行，安全）。

### S5 · P2 · 打包可复现性与下载校验：本地包不等于发布包

同一 commit 的 setup：本地 824,595 B、发布 824,209 B（差 386 B）；便携 zip 两边都是 910,360 B。即 NSIS 产物不可复现（csc 产物的 PE 时间戳进了 Solid LZMA 流），所以「本地 release/ 的字节」不能当对外数字用——文档里引用的字节必须以 Release 页为准（现在 README 也是这么写的，`README.md:96,107`，这点没问题）。**风险**在校验和：本地打包得到的包与 Release 页 `SHA256SUMS` 必然不同，人工核对容易误判成「下错包」。

同一处还有供应链问题：`packaging/installer.ps1:33-37` 从 `prdownloads.sourceforge.net` 下载 NSIS **不校验哈希**，而 CI 自己在注释里说「SourceForge 直链会返回反爬 HTML」（`ci.yml:83`）并另取 vendored 资产、校验 SHA256（`ci.yml:85-88`）。也就是说本地首次打包走的正是 CI 已经放弃的那条路，且不验哈希。

**预期收益**：本地打包不再被反爬 HTML 坑、下载内容可验；文档不再出现两个字节数。**落地成本**：本地下载 NSIS 改从同一 vendored Release 资产取 + 校验 `NSIS_SHA256`（沿用 `ci.yml:25` 的常量）；在打包说明里加一句「本地字节可能比发布字节差几百字节，属正常」。

### S6 · P2 · 用户可见的安装/体积文档有 5 处对不上

| 位置 | 现在写的 | 实际 | 影响 |
| --- | --- | --- | --- |
| `packaging/README.txt:6` | 「见同目录的 README.md」 | 两个包都只放 `README.txt`（`installer.nsi:128`、`portable.ps1:44`），目录里没有 README.md | 装完跟着指路会找不到文件 |
| `packaging/README.txt:44` | 「不做 .md 文件关联（是否做，待产品负责人确认）」 | 安装器已有 opt-in「打开方式」（`installer.nsi:151-178`，0.20.0 起） | 用户在便携版里读到过期结论 |
| `README.md:114` | `npm test # 17 个文件、248 条断言` | 实测 17 文件 **251** 条（`ℹ pass` 求和）；`CHANGELOG.md:15` 已写「251 条（248 + T3 的 3 条）」 | 贡献者以为少跑 |
| `README.md:96,98` | 主 chunk「约 888 KB」 | 895,849 B（875 KiB） | 体积叙述偏小 |
| `packaging/README.md:42` | 「打印实测字节、`P + 10,000` 门槛、硬报警线 850,000 B」 | `installer.ps1` 没有 `P + 10,000` 任何门槛（`grep` 只命中 `portable.ps1:15,69` 的 940,000） | 维护者以为有增长门禁 |

**预期收益**：装完的人能自己找到说明；贡献者按真实条数核对。成本是五次文案修改。建议与 S3 的 README 数字一起改，一次性对齐。

## 4. 依赖可减性（无发现，附理由）

`package.json` 运行时依赖 13 个：Tiptap 9 包 + KaTeX + React + ReactDOM。逐项对得上功能（文件树/大纲/表格/任务列表/图片/公式/编辑器内核），没有「为一两个函数引一个库」的情况。开发期 `playwright-core`（截图与 E2E）、`@types/*`、`vite`、`typescript`、`@vitejs/plugin-react` 都是构建/验证必需。

`@tiptap/extension-task-list` 与 `task-item` 成对使用，`extension-image` 支撑拖入/粘贴图片（`README.md:45`），都不能删。**本条结论：无可减项。**

## 5. CI 冗余（与 S2 合并判断）

- `gate`（ubuntu）跑 build + measure + test；`windows-host` 与 `macos-host` 各自再跑一次 `npm run build`——这是三个不同 runner 的必要重复（各自要 `dist/` 才能编宿主），不算冗余。
- 真正的冗余：**WV2/NSIS 的固定版本与哈希在两份 workflow 里各写一遍**（`ci.yml:23-25`、`release.yml:26-28`），NSIS 的下载 URL 还写死了 `v0.26.0` 那个 Release 资产（`ci.yml:84`）。两处漂移一次就会一边绿一边红。建议抽 `packaging/fetch-tools.ps1`（连同 S5 的本地下载与哈希校验一起），三处调用同一份。
- `ci.yml:105-109` 每次 push 都上传 setup 产物，但唯一消费者 `install-verify` 是手动 job（`:145`）。保留可接受，注释里写清即可。

## 6. UNVERIFIED

| 项 | 为什么测不了 | 怎么补 |
| --- | --- | --- |
| 安装器 FileVersion 在**已发布的** 0.32.1 setup 上同样是 0.31.1.0 | 未下载 824 KB 二进制核对（本轮只跑本地同脚本产物） | 下载发布包 `GetVersionInfo().FileVersion` 一条命令；按 `installer.nsi:34,37` 是常量，判为同一缺陷 |
| 真实双击安装、HKCU 卸载项、开始菜单、SmartScreen | 只读角色，不装系统级软件、不写注册表 | 交互式桌面按 `packaging/README.md:10-24` 走一遍；CI `install-verify` 手动 dispatch |
| 升级安装后 `www` 残留的真实累积字节 | 需要在真机做两次覆盖安装 | 装 0.31.1 → 再装 0.32.1 → 比较 `%LOCALAPPDATA%\Programs\Sidelight\www` 文件数 |
| macOS zip 的安装步骤与 Gatekeeper 文案 | 本机 Windows，`release/` 无 macOS 产物 | macOS 真机或 CI 产物人工走一遍 |
| 首屏数字在 WebView2 宿主里的实际传输 | 只测了 gzip 静态字节，未测宿主回环的真实 FCP | `scripts/host-smoke.mjs` + 宿主 FCP 探针（0.24.0 测过 304 ms） |
| 冷启动时间 | 未测（无宿主启动打点） | 宿主加启动时间戳或在 `host-smoke` 里量窗口可见时刻 |

## 7. 本轮没做的事

- 没跑 `npm test` 之外的往返/验收脚本（非本角色范围；`npm test` 顺带跑过，17 文件 251 条全 pass，用于核对 README 数字）。
- 没重新打安装包（只读，`release/` 一个字节没动）。
- 没测 UI 与 E2E（不需要浏览器，本角色无界面验收项）。
