# 第 37 轮 · finder-ship（安装、体积、启动与开源发布体验，只读）

- 轮前 startSha `ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76` = 当前 HEAD，工作树开工时干净。
- 本轮只跑一次 `npm run build`（独占，无并发），未改产品代码、未碰 `release/`、未 push。
- 未跑 E2E：本角色只做构建/产物/文档核对，不需要浏览器；因此也没执行 `reset.mjs 9224`（未占用 CDP 9224）。

## 一、实测数据

### 1. `npm run build`（`tsc --noEmit && vite build`）

EXIT=0，`✓ built in 476ms`，3243 modules transformed。新增告警：0 条。

### 2. 首屏 gzip（`node scripts/measure-first-screen.mjs`，EXIT=0）

```
   898601   280679  /assets/index-CkPNnBZ0.js
      783      450  /assets/rolldown-runtime-vfrPO-fZ.js
    34214     7127  /assets/index-D5qWVvxk.css
total raw=933598 gzip=288256 headroom=31744 files=3 max=320000
target=310000 gap=21744
PASS
```

288,256 B 与 `README.md:100` 写的数字**逐字节一致**；距内部预算 310,000 余 **21,744 B**，距硬线 320,000 余 **31,744 B**（9.9%）。

### 3. `dist` 构成（97 个文件，3,833,607 B = 3.66 MiB）

| 分组 | 字节 | 占 dist | 备注 |
| :--- | ---: | ---: | :--- |
| 首屏集合（2 js + 1 css） | 933,598 | 24.4% | 进包且首屏必下 |
| KaTeX 惰性（loader js+css） | 285,415 | 7.4% | `katexLoader-CNO5m-uY.js` 258,788 + `katexLoader-lxMheimU.css` 26,615 |
| KaTeX 字体（15 × woff2） | 213,664 | 5.6% | 只发 woff2 |
| 其它 UI 小 chunk（11 个 + `dist-CwHWZ2rq.js`） | 43,746 | 1.1% | PreviewPane/FindBar/QuickOpen/Outline/… |
| **Mermaid 家族** | **2,357,196** | **61.5%** | 79 个 chunk，含 cytoscape/d3/dagre/各 diagram |

文件类型：`.js` 79 个 3,557,520 B、`.css` 2 个 60,841 B、`.woff2` 15 个 213,664 B、`.html` 1 个 1,582 B。

Mermaid 里与 `architecture-beta` 强相关的三块：`cytoscape.esm-nTrd5EVq.js` **441,717** + `architectureDiagram-VXUJARFQ-Bc3bIxRO.js` **145,637** + `cose-bilkent-S5V4N54A-Bxj_wSUT.js` **81,192** = **668,546 B**（引用关系实测：cytoscape chunk 只被 architectureDiagram 与 cose-bilkent 引用）。

### 4. release/ 资产（只读，未改）

| 资产 | 本地 `release/` | GitHub Release v0.32.1（API 实测） |
| :--- | ---: | ---: |
| `Sidelight-0.32.1-win-x64-setup.exe` | 824,595 B | 824,209 B |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 B | 910,360 B |
| `Sidelight-0.32.1-macos-universal.zip` | **无** | 905,892 B |
| `SHA256SUMS-0.32.1.txt` | 无 | 308 B |

`release/SHA256SUMS.txt` 仍是 **0.26.0 两行**（内容只含 0.26.0 setup/portable）。本地没有 macOS zip 是正常现象：macOS 只在 CI 的 `macos-host` job（`release.yml:127`）构建，Windows 本机不能出。

## 二、可用改进（5 条）

### S1 · P1 · 下次发版安装包 +475 KB，余量只剩 700 KB — 砍 Mermaid 图类是最省的一次

**证据**：`README.md:100` 记第 36 轮接入 Mermaid 后本机 `installer.ps1 -AssocDryRun` 实测 **1,299,777 B**（正式包预估 1,297,630 B，未发布）；已发布 0.32.1 是 824,209 B。本轮 dist 实测 Mermaid 家族 **2,357,196 B**（dist 的 61.5%），其中 `architecture-beta` 专用 cytoscape 集群 **668,546 B**。raw → 安装包压缩比按上述两组数字约 **4.96 : 1**。

**预期收益**：
- 最小改动（只不注册 `architecture-beta`）：dist −668,546 B，安装包估 **−135 KB**（1,297,630 → 约 1,162,000 B）。
- 白名单 5 类图（flowchart/sequence/class/state/pie）：dist 估 −2.0 MB，安装包估 **−400 KB**（约 900,000 B，回到 0.32.1 水平）。

**落地方式**：`src/lib/mermaidLoader.ts:2` 现在直接 `import mermaid from 'mermaid/dist/mermaid.core.mjs'`，core 会动态 import 全部图类，所以每个 diagram 都进了包。`node_modules/mermaid/dist/mermaid.core.mjs` 里有 `registerDiagram`/`registerExternalDiagrams`（grep 命中 44/581/584/656 行），可走白名单注册。**先做 30 分钟可行性验证**：注册 3 类图建一次 dist，若 API 不通就保留全量并只记录预算。

**验证方法**：改后 `npm run build`，比 `dist` 总量，再 `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun` 比字节（会写 release/，本轮角色禁止，交给后续轮）。

### S2 · P2 · 计划里的「286,000 B 预算」已作废，按它会假 FAIL

**证据**：本轮角色文件要求「首屏 gzip 与 286,000 B 预算」；现存口径是 `scripts/measure-first-screen.mjs:19-20` 的 `max=320000` / `target=310000`，`README.md:100` 也写「2026-11-17 产品负责人放宽」。实测 288,256 B：按 286,000 算**超 2,256 B**（假 FAIL），按现行口径 PASS。0.32.1 的 Release 正文仍写「首屏 gzip 285,783 B（临时预算 286,000 B，余 217 B）」，那是发布时的历史记录。

**建议**：本轮报告与门禁统一用 310,000 / 320,000；别把 286,000 写进验收线，也别为此报产品回归。

### S3 · P2 · 首屏余量降到 9.9% 时 CI 一句话都不说

**证据**：`scripts/measure-first-screen.mjs:70-72` 只在 `totalGzip > target` 才 `WARN`；余量从 21,744 B 掉到 0 之间没有任何输出。第 36 轮单轮 +2,200 B（`README.md:100`），按同速约 14 轮触硬线。

**建议**：在脚本末尾加一行「距硬线 < max×5%（16,000 B）时 `WARN`」。零字节成本、零依赖，CI 的 `node scripts/measure-first-screen.mjs`（`ci.yml:39`）自动带上。

### S4 · P2 · CI 把与平台无关的 dist 构建了 3 次

**证据**：`ci.yml:37-38`（gate）、`ci.yml:57-58`（windows-host）、`ci.yml:127-128`（macos-host）各自 `npm ci` + `npm run build`。产物全是 JS/CSS/woff2（97 个文件，无原生依赖），三份字节应完全相同。

**建议**：`gate` 加 `actions/upload-artifact`（`dist/`），两个宿主 job 改成下载复用；`windows-host` 仍需 `npm ci`（`host-smoke` 用 playwright-core，43 处引用），`macos-host` 可整段省掉 npm 安装与构建。预期每次 push 省 2 次构建 + 2 次 npm 安装（约 1–2 分钟，macOS runner 更长）。**回退**：artifact 取不到就回退本地构建，不能让宿主 job 因分发失败变红。

### S5 · P2 · `release/SHA256SUMS.txt` 是 0.26.0 残留（连续第 6 轮）

**证据**：文件只有 0.26.0 两行；`release/` 里已有 0.27.0–0.32.1 六代资产。用户可见的校验真源是 Release 页的 `SHA256SUMS-0.32.1.txt`（API 实测 308 B，四资产字节与本地一致）。

**建议**：让 `packaging/installer.ps1` 每次覆写 `release/SHA256SUMS-<版本>.txt`（现在没有任何脚本写它，`grep SHA256SUMS` 在 `*.ps1` 里 0 命中），或删掉旧文件并在交接里写清「本地校验只认 Release 页」。预期：下一个人不再拿它当校验依据。

## 三、核查通过、无改进的部分

- **`packaging/*.ps1` 与 `packaging/README.md` 数字全对**：`installer.ps1:89-91` `target=1800000` 且超了只 `Write-Warning`；`verify-installer.ps1:47-51` 同线；`portable.ps1:16` `$threshold = 2000000`（与 README:57「共用硬线、不另设内部预算」一致）；`verify-portable.mjs` 存在。
- **安装器行为与 README:8-18 一致**：`installer.nsi:26` `InstallDir "$LOCALAPPDATA\Programs\Sidelight"`、`:28` `RequestExecutionLevel user`、`:29` `SetCompressor /SOLID lzma`、`:117-118` 缺 WebView2 弹提示后 `Abort`、`:151` `Section /o`（默认不选，`/S` 不写关联）。安装/卸载步骤没有可删的一步：未签名 → SmartScreen 必经。
- **依赖无可删项**：15 个运行时依赖逐个有 import（core 15、pm 21、react 22、react-dom 5、starter-kit 7、katex 4、mermaid 2，其余 image/mathematics/strike/table/task-item/task-list/markdown/react 各 1）。`@tiptap/extension-strike` 与 StarterKit 内置 strike 重叠，但 `App.tsx:745` 已 `strike:false`、`:117-119` 单独 `extend` 只改快捷键到 `Mod-Shift-x`，删不掉。
- **启动不联网、无常驻**：首屏只有 4 个回环请求 `/__doc`（`App.tsx:1179`）、`/__annotations`（`:1264`）、`/__draft`（`:1281`）、`/__recent`（`:2886`），全部 `cache: 'no-store'`；`App.tsx` / `main.tsx` 里 `setInterval` / `WebSocket` / `sendBeacon` 0 命中。宿主侧固定回环端口 47821，不出网。
- **README 体积数字自洽**：`README.md:100` 288,256 B（本轮实测同值）、824,209 / 824,595 B、1,299,777 + 700,223 = 2,000,000（硬线）都对得上。
- **0.32.1 三个平台资产齐全**：GitHub API `releases/tags/v0.32.1` 返回 4 资产（setup 824,209、portable 910,360、macos 905,892、SHA256SUMS 308），上传者 `github-actions[bot]`。

## 四、UNVERIFIED

1. **安装包新字节未实测**：砍 Mermaid 后的 −135 KB / −400 KB 是按「2,357,196 B raw → +475,568 B 包」推出的比例估算，非实测；实测要跑 `installer.ps1`，它会写 `release/`，本角色禁止。补测方法见 S1。
2. **本轮未跑 E2E**：角色只要求构建与核对；「新 dist 在宿主/浏览器能起」用 `tsc` + `vite build` 通过覆盖，未做浏览器加载验证。
3. **macOS 包仍只在 CI 编译过**：本机是 Windows，`release/` 无 macOS zip；README:24 的「0.28.1 arm64 升级覆盖安装」未在本轮复核（沿用旧轮结论）。
