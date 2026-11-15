# 第 01 轮 · 发布、体积与优化 · 发现

侦察时间：2026-11-15。只读侦察，除本文件与 `.tmp/` 外未改任何文件。
环境实测：Windows 11 22631（专业版）、Node 24.21 / npm 11.19、WebView2 运行时 157.0.4341.46、
**无 Rust / 无 MSVC / 无管理员权限**（`isAdmin=False`，`C:\Program Files\Microsoft Visual Studio` 不存在）。
应用：`http://localhost:5173`（dev）。CDP：`http://127.0.0.1:9224`。

## 结论摘要

发布被两件事卡住：没有安装包（S1），体积口径记错了约 0.5 MB（S3）。
路径问题有解：**C#/.NET Framework 4.8 + WebView2 宿主能在本机零下载、零管理员跑通**，
因为 WebView2 支持 File System Access API，前端文件读写代码不用改写。
Tauri 的官方前提是 MSVC Build Tools，与「无管理员」直接冲突，GNU 变体官方只写「only MSVC Windows target」。

---

## S1 没有 Windows 安装包，Tauri 官方路径与「无管理员」冲突

**证据**

- 仓库无 `src-tauri/`、无 `public/`、无 `icons/`、无 `build/`（`Get-ChildItem` 根目录只有 dist/docs/fixtures/node_modules/scripts/shots/src）。
- `package.json:7-15` 只有 dev/build/preview/test/roundtrip/acceptance/shot，没有打包或签名脚本。
- Tauri v2 官方前提：Windows 必须装「Microsoft C++ Build Tools」+ WebView2 + Rust
  （<https://v2.tauri.app/start/prerequisites/>）。C++ Build Tools 安装器需要管理员。
- Tauri 官方安装包文档明写「Tauri officially only supports the MSVC Windows target」
  （<https://v2.tauri.app/distribute/windows-installer/>）。
- 本机没有 Rust、没有 MSVC、没有 Windows Kits，`cl.exe`/`link.exe` 都不在 PATH。

**建议**：本轮不做 Tauri 预研，改走路径 B（见「推荐发布路径」）。Tauri 保留为目标，触发条件是拿到管理员权限或 CI（GitHub Actions windows-latest 自带 MSVC）。
**难度**：L（跨轮）

---

## S2 开源就绪度缺失，README 与 CHANGELOG 的数字已过期

**证据**

| 项 | 实测 | 说明 |
| :--- | :--- | :--- |
| `LICENSE` | 缺失 | MIT/Apache 都没放，法律上默认保留所有权利 |
| `CONTRIBUTING.md` | 缺失 | 无贡献流程、无门禁说明（AGENTS.md 有，但那是给代理的） |
| `.github/` | 缺失 | 无 CI、无 issue/PR 模板、无 release 流程 |
| `.gitattributes` | 缺失 | Windows 仓库无换行策略，`fixtures/*.md` 有被 autocrlf 改写的风险；0.10.3 专门修过 CRLF 保真 |
| `.editorconfig` / `.nvmrc` | 缺失 | 无 Node 版本锚点 |
| README 测试数 | `README.md:66` 写「共 19 个」 | 实测 `npm test`：**15 个文件、162 个通过、0 失败**（逐文件 10/18/7/8/12/10/11/11/9/10/6/10/10/23/7） |
| README 字体体积 | `README.md:52` 与 `docs/iteration/STATE.md:52` 写「KaTeX 字体 546 KB / 39 文件」 | 实测 `dist/assets` 字体 **1 047.8 KB / 59 文件**（ttf 501.6 KB / 20、woff 296.0 KB / 20、woff2 250.2 KB / 19）。546.2 KB = woff+woff2，漏了 20 个 ttf |
| CHANGELOG 计数 | `docs/CHANGELOG.md:13` 与 `:23` 都写「测试总数 162」 | 0.16.2 加 4 个后是 162，0.16.3 再加 1 个应写 163；现在两版同数 |
| CHANGELOG 日期 | 全部 15 个版本都是 `2026-11-15` | 一天发 15 版，外部读者会认为格式是占位 |
| `package.json` | `"private": true`、无 `license`、无 `repository`、无 `engines` | 开源后 npm 元数据不全 |

**许可建议：MIT**。理由三条：
1. 这是个编辑器，卖点在可用性不在专利；MIT 最短，中文个人开发者与公司都能一眼看懂。
2. Apache-2.0 多出专利授权与 NOTICE 传递义务，对单人项目和「不新增依赖」的仓库是额外维护面。
3. Tiptap/ProseMirror/KaTeX 都是 MIT，整条依赖链一致，发布页不用做许可矩阵。
反例：若以后要进企业采购白名单（要求专利条款），再换 Apache-2.0；换证只能在首次发布前做。

**建议动作**：加 `LICENSE`（MIT，2026，版权人待产品负责人定）、`CONTRIBUTING.md`（门禁三条 + 提交格式）、
`.gitattributes`（`*.md text eol=lf`、`fixtures/** -text`）、`.github/workflows/ci.yml`（node 24，`npm ci && npm run build && npm test`）。
README 三处数字按实测改，CHANGELOG 的两处计数改成 161→162 的增量写法。
**难度**：S

---

## S3 体积：KaTeX 占 JS 的 24%，字体三格式重复发，读数漏了 0.5 MB

**证据**（`dist/assets`，本次实测，JS gzip 用 zlib level 9）

| 项 | 大小 | gzip |
| :--- | ---: | ---: |
| `index-CUE-d0w2.js` | 1 087 667 B（1 062.2 KB） | 336 179 B（328.3 KB） |
| `index-BRPzIKTO.css` | 50 934 B（49.7 KB） | 12 831 B（12.5 KB） |
| 字体 ttf 20 个 | 501.6 KB | — |
| 字体 woff 20 个 | 296.0 KB | — |
| 字体 woff2 19 个 | 250.2 KB | — |
| `index.html` | 588 B | — |
| **dist 合计** | **2 212 137 B（2.11 MiB）** | — |

JS 内部分段（在单 chunk 里按 KaTeX 专属字符串定位，边界 692 000–955 000）：

- **KaTeX ≈ 263 KB，占 JS 24.2%；gzip 77 940 B，占 gzip 23.2%**。独立 `katex.min.js` 是 266.4 KB，两个数吻合，可信。
- 其余（React + react-dom + ProseMirror + Tiptap + 应用代码）≈ 692 KB（63.6%），KaTeX 之后的尾部 ≈ 132.7 KB（12.2%）。
- Tiptap/ProseMirror 单独无法从单 chunk 精确切分（无 sourcemap，`dist` 无 `.vite/manifest.json`）。
  间接口径：34 个 `@tiptap/*` 包 + 13 个 `prosemirror-*` 包，是 692 KB 里的主体。**「Tiptap 占多少」这一项标未验证**。

其它实测：

- KaTeX CSS 规则占 CSS 51 KB 的 **37.8%**（19 273 / 50 927 字符）。
- 首屏**不下载任何字体**：prod 冷启动 3 个请求（html/js/css），0 个 font 请求。字体只在真有公式渲染时才拉。
- 字体是同一批 20 个 face 的三种格式（ttf/woff/woff2 各一份）。只发 woff2 可省 **797.6 KB**。

**可量化目标与验证方法**

| 指标 | 当前 | 目标 | 验证 |
| :--- | ---: | ---: | :--- |
| 首屏 JS gzip | 336.2 KB | **≤ 250 KB** | `node .tmp/analyze-bundle.mjs`（本次脚本，可移进 `scripts/`） |
| 首屏 CSS gzip | 12.5 KB | ≤ 10 KB | 同上 |
| 安装包内 web 资源 | 2.11 MiB | **≤ 1.30 MiB** | 只发 woff2：2 212 137 − 817 000 ≈ 1.39 MB；再剪未用 face 可到 1.3 MB 以下 |
| 字体总量 | 1 047.8 KB | ≤ 250 KB | `Get-ChildItem dist/assets -Filter *.woff2 \| Measure-Object Length -Sum` |

**KaTeX 按需加载的收益与风险**：收益是首屏 gzip −78 KB、CSS −19 KB，且减少 263 KB 的解析。风险是首屏含公式的文档会闪一下未排版文本；
做法是在加载文档后扫一次 `$`，命中就 `import()` 预取，不给用户看到裸 LaTeX。
**manualChunks 的收益有限**：单入口 SPA，静态依赖会被 `modulepreload` 一起拉，拆 vendor 只改善缓存命中，不减少首屏字节。先做按需加载，再考虑拆。
**CSS 拆分**：同理，只有把 KaTeX CSS 跟 KaTeX JS 一起动态注入才有收益，光拆文件不减首屏。
**难度**：M（按需加载）/ S（字体只留 woff2）

---

## S4 冷启动只有浏览器基线，没有宿主基线

**证据**（CDP 9224，cache disabled，各跑 3 次 / 2 次，取中位）

| 场景 | TTFB | DOMContentLoaded | FCP | 首个编辑器节点出现在 DOM | 请求数 | 长任务 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **生产构建** `http://localhost:5199`（本次用 `.tmp/serve-dist.mjs` 起静态服务） | 4 ms | **77–81 ms** | **168–184 ms** | 188–199 ms | 3 | 0 |
| dev server `http://localhost:5173` | 4 ms | 165–185 ms | 284–336 ms | 298–357 ms | 65 | 0 |

- 生产构建首屏传 3 个请求；`performance` 侧 `first-paint` 32–44 ms、`first-contentful-paint` 168–184 ms。
- JS 堆 11.1 MB（prod）/ 30.2 MB（dev）。
- 控制台 0 错误。

**与真实安装包的差距**（都还没测，列成验收项）：
1. 现在这条路径没有 WebView2 宿主进程。真实启动多一次 `msedgewebview2.exe` 创建，通常加 150–400 ms。
2. 无冷盘（OS 缓存已热）。真实首次启动要读 2.1 MB 文件，可能再加 200–500 ms。
3. 无杀毒软件扫描与 SmartScreen 首启检查。
4. 无单实例竞争、无窗口创建与图标加载。

**建议**：把本次脚本固化（`scripts/size.mjs` + `scripts/coldstart.mjs`），在路径 B 的宿主里重测同一组指标，
再定「冷启动 < 1.5 s」这类验收线。现在的数字只能当浏览器基线。
**难度**：S

---

## S5 应用标识全缺：图标、appId、单实例、`.md` 关联

**证据**

- 图标：`index.html:6-9` 只有 16×16 内联 SVG 圆点（`data:image/svg+xml`），无 `.ico`、无 256/48/32 多尺寸、无 `public/` 目录。Windows 任务栏与开始菜单要 `.ico`。
- 窗口标题：`index.html:10` `<title>Sidelight</title>`，宿主层没有标题设置（无 `src-tauri`，无 `host/`）。
- appId：不存在。`package.json` 只有 `name: "sidelight"`，没有 `com.*` 形式的标识。
- 单实例：全仓 grep 无 mutex / single instance 相关代码。
- `.md` 文件关联：无注册表脚本、无安装器配置。
- PWA：无 `manifest.webmanifest`，`dist/` 里也没有。

**建议**（一次做完，都在宿主层，不动前端）：

| 项 | 值 |
| :--- | :--- |
| appId | `com.sidelight.editor` |
| productName | `Sidelight` |
| 窗口标题 | `Sidelight`；打开文档后 `文档名 — Sidelight` |
| 图标 | 16/32/48/256 的 `.ico`，再加 512 png 给商店/网页用 |
| 单实例 | 命名 Mutex `Global\Sidelight`；第二实例把 argv 里的路径转给第一实例（命名管道或 `WM_COPYDATA`） |
| `.md` 关联 | `HKCU\Software\Classes\.md` → `Sidelight.md`；`...\Sidelight.md\shell\open\command` 指向 exe（HKCU 写入不需要管理员） |
| 卸载 | 删除上述 HKCU 键 + `%LOCALAPPDATA%\Sidelight` |

**难度**：M

---

## 推荐发布路径

三条路的对比（本机实测条件：无管理员、无 Rust、无 MSVC、WebView2 已装、网络可达）：

| | (a) Tauri 2 + rustup + GNU target | (b) C#/.NET Framework + WebView2 宿主 | (c) 便携 zip + PWA |
| :--- | :--- | :--- | :--- |
| 可行性 | 中低。官方前提要 MSVC（需管理员）；官方只支持 MSVC target，GNU 是社区路线、官方不支持 | **高**。`csc.exe` 4.8.9232 已在 `C:\Windows\Microsoft.NET\Framework64\v4.0.30319`，.NET Framework 4.8 是系统组件，WebView2 157 已装。WebView2 支持 File System Access API（`CoreWebView2PermissionKind.FileReadWrite`），前端文件代码不用改 | 高，但只解决"能跑"，不解决"能装" |
| 工具链获取 | `rustup-init.exe` 用户级安装（不须管理员，PATH 写 HKCU）；toolchain 约 250–400 MB 磁盘；NSIS 由 Tauri CLI 自动下载（不须管理员） | 零下载：编译器与运行时都在系统里。只须取 WebView2 SDK（NuGet 包就是 zip，`Invoke-WebRequest` 直接下，不须管理员、不须 dotnet SDK） | 零 |
| 预估安装包 | NSIS `-setup.exe` 约 **4–6 MB**（WebView2 用 `downloadBootstrapper`：官方文档写 +0 MB；`embedBootstrapper` +1.8 MB；**绝不要 `offlineInstaller`：官方写 +127 MB**，实测有人量到 212 MB） | 便携 zip 约 **2–4 MB**（应用资源 ≈1.4 MB + SDK 程序集 + `WebView2Loader.dll`）；再用 NSIS 打 setup 约 2–3 MB | zip **2.16 MB**（修字体后 ≈1.39 MB）；PWA 本体 0，但要 HTTPS 托管 |
| 工作量 | 3–5 天，且第一天就可能卡在 GNU 编译 | **1–2 天 MVP**（窗口 + 加载 dist + 关联 + 单实例 + 图标），3–4 天完善（更新、签名、卸载） | 0.5 天 |
| 风险 | ① 官方不支持 GNU；② 失败后只能等管理员装 VS Build Tools，整轮卡死；③ Rust 编译首次要拉几百个 crate，慢且要 443 通 | ① in-box `csc.exe` 只支持 **C# 5**（无字符串插值、无 `?.`、无模式匹配）——写宿主够用，但代码风格受限；② 无自动更新，要自己写；③ 未签名 exe 会触发 SmartScreen（三条路都有）；④ NuGet 包是否含 `lib/net45` 未验证 | ① `file://` 不是安全上下文，File System Access API 不可用，必须 localhost 服务或 https 托管；② 无单实例、无 `.md` 关联（浏览器能设窗口图标但控制力弱）；③ 托管就多一个隐私承诺与运维面 |

**结论：先走 (b)，把 (a) 留作目标，条件写进 ADR-0004。**

理由三条：
1. (a) 的硬前提（MSVC Build Tools）要管理员，本机拿不到；这不是工作量问题，是环境不允许。
2. (b) 不下载任何东西就能在本机编译出 `.exe`，且 WebView2 支持 File System Access API，现有 `showDirectoryPicker`/`createWritable` 代码（`src/lib/workspace.ts:99`、`src/lib/cache.ts:97`、`src/lib/asset.ts:49`）不用改。
   Tauri 用同一个 WebView2，所以 (b) 的宿主代码将来换成 Tauri 也不浪费前端工作。
3. (c) 不能交付"安装简单"：没有 `.md` 关联、没有单实例、还要托管。只能当临时试用包。

### planner 可直接执行的第一步（1 天，唯一任务）

**任务：用系统自带 `csc.exe` 编一个 WebView2 宿主，把 `dist` 装进窗口并证明三件事。**

新建 `host/`（不碰 `src/`，不进现有门禁），只写 3 个文件：`host/Program.cs`（窗口 + WebView2 + Mutex 单实例 + argv 转发）、`host/Sidelight.csproj`（可选，先用 csc 直编）、`host/build.ps1`（编译脚本）。

```powershell
# 0) 前置：确认编译器与运行时（已实测存在）
& 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe' /?   # 4.8.9232.0

# 1) 取 WebView2 SDK（NuGet 包 = zip，无管理员、无 dotnet SDK）
Invoke-WebRequest -Uri 'https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.4314.35' -OutFile .tmp\wv2.zip
Expand-Archive .tmp\wv2.zip .tmp\wv2 -Force
Get-ChildItem .tmp\wv2\lib -Directory            # 期望看到 net45 / net462
Get-ChildItem .tmp\wv2\runtimes -Recurse -Filter WebView2Loader.dll

# 2) 起静态服务（本报告用过的脚本，读 dist）
node .tmp\serve-dist.mjs                          # http://localhost:5199

# 3) 编译（示例，路径按上一步实际输出改）
& 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe' /nologo /target:winexe /platform:x64 `
  /out:host\Sidelight.exe `
  /r:.tmp\wv2\lib\net45\Microsoft.Web.WebView2.Core.dll `
  /r:.tmp\wv2\lib\net45\Microsoft.Web.WebView2.WinForms.dll `
  /r:System.Windows.Forms.dll /r:System.Drawing.dll host\Program.cs
Copy-Item .tmp\wv2\lib\net45\*.dll host\
Copy-Item .tmp\wv2\runtimes\win-x64\native\WebView2Loader.dll host\
Copy-Item dist\* host\www -Recurse
```

**验收（4 条，缺一不算过）**
1. 双击 `host\Sidelight.exe` 出窗口，标题 `Sidelight`，正文是编辑器，控制台 0 错误。
2. 双击两次只留一个窗口，第二个进程退出码 0。
3. 在窗口里「打开文件夹」能读到真实目录，保存能写回磁盘（证明 WebView2 的 File System Access 可用）。
4. `host\Sidelight.exe some.md` 打开后正文是该文件内容。

**Kill criteria（当天触发就换 (c)，别纠缠）**
- `Expand-Archive` 里没有 `lib/net45` 或 `lib/net462`，且手写 COM 互操作超过半天；
- `csc.exe`（C# 5）编不过 WebView2 SDK 的公开 API；
- WebView2 里 `window.showDirectoryPicker` 是 `undefined`（那就得自建 IPC 文件桥，工作量翻倍，改走 (a) 的 CI 路线）。

**同日并行（不占宿主时间，给开源发布铺路）**：S2 的 `LICENSE`/`CONTRIBUTING.md`/`.gitattributes`/`.github/workflows/ci.yml` 与 README 三处数字修正。

**ADR-0004 要写的触发条件**：拿到管理员权限、或 GitHub Actions `windows-latest` 可用（自带 MSVC + WiX），就把宿主从 (b) 换到 Tauri 2，前端不动。

---

## 代码优化机会（按收益/风险排序，最多 3 条）

**O1 KaTeX 动态导入（JS + CSS 一起）**
现状：`katex` 被静态引入，263 KB 无条件进首屏。
做法：在公式渲染处改成 `await import('katex')`，同时动态注入 `katex.min.css`；文档加载后扫一次 `$`，命中就预取。
收益：首屏 gzip −78 KB（336→258 KB），CSS −19 KB。风险：含公式的文档闪一下未排版文本；须做预取兜底。
**难度 M**

**O2 字体只发 woff2**
现状：同一批 20 个 face 发了 ttf+woff+woff2 三份，1 047.8 KB。
做法：构建后脚本重写 KaTeX 的 `@font-face` 只留 `woff2`，删掉 `*.ttf`/`*.woff`；顺带剪掉未用 face（Fraktur/Script/SansSerif 等）。
收益：**安装包 −797.6 KB**（2.11 MiB → ≈1.39 MiB）。
风险：只支持 woff2 的浏览器（WebView2 157 支持，Chrome 36+ 都支持）；须确认导出 HTML 的样式不依赖这些文件。
**难度 S**（这是本轮性价比最高的一条）

**O3 vendor 拆分与延后导出/diff/搜索（先测再做）**
现状：单 chunk 1 087 667 B，构建有 >500 KB 警告（`STATE.md:53`）。
做法：`build.rollupOptions.output.manualChunks` 拆 `react`、`tiptap`；把 `src/lib/export.ts`、`src/lib/diff.ts`、`src/lib/search.ts` 改成动态 import（只在导出/保存对比/查找时加载）。
收益：拆 vendor **不减少首屏字节**（单入口静态依赖会被 preload），收益是缓存命中与去掉警告；延后导出/diff 才是真减首屏，量级**未验证**。
风险：拆分后请求数变多；动态 import 会改变首次使用导出时的延迟。建议 O1/O2 落地并重测后再决定。
**难度 M**

---

## 附：其它已核实事实

- `fixtures/markdown/` 共 8 个文件、约 1.3 KB，`npm run roundtrip` 与 golden 测试要用（`docs/adr/0001-document-tree-is-the-truth.md:11`），**应当留在仓库**。
- `shots/` 49 个文件、**3.5 MB**，是 `src/`（0.3 MB）的 11 倍；git 对象 2.60 MiB。截图作为证据有价值，但应按 `docs/qa-report.md` 实际引用的图保留，其余移出或转 webp。
- `.gitignore` 已排除 `node_modules`/`dist`/`.tmp/`/`.edge-profile*`/`.npm-cache`，但没有 `.env*`、`*.zip`、`host/bin`。
- `package.json:16-30` 运行时依赖 13 条：10 个 `@tiptap/*` + `katex` + `react` + `react-dom`。Tiptap 包多但同族，切成一个 vendor chunk 不会变小。
- 源码无 `document.title` 动态设置（`src/main.tsx`、`src/App.tsx` 都 grep 不到），窗口标题只能靠宿主或 `index.html`。
- 未验证项：Tiptap/ProseMirror 在单 chunk 里的确切字节数（无 sourcemap，需一次带 `sourcemap: true` 的构建）；GNU target 下 Tauri 能否编译；NuGet 包内 `lib/net45` 是否存在；WebView2 宿主冷启动加多少毫秒。

## 复现用脚本（本次写在 `.tmp/`，可直接搬进 `scripts/`）

- `.tmp/analyze-bundle.mjs`：gzip 总量、锚点定位、KaTeX 段占比
- `.tmp/analyze3.mjs`：按段算 gzip 份额
- `.tmp/serve-dist.mjs`：静态服务 `dist` 到 `http://localhost:5199`
- `.tmp/measure.mjs`：CDP 9224 冷启动测量（清缓存、导航计时、FCP、请求数与请求体量）
