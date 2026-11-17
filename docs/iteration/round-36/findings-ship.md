# 第 36 轮 · 安装、体积、启动与开源发布体验（finder-ship，只读）

时间：2026-11-17。轮前 startSha `b3509c9f`（`git rev-parse HEAD` 实测相同），构建时 `git status --short` 只有 `?? shots/round-36/`，**产品代码零改动** → 下面的数字是「本轮任何改动之前」的基线。只读 `release/`：没改、没覆盖、没删；没安装任何系统级软件、没碰注册表、没 push。

## 一、本轮实测

### 1. 门禁

```
npm run build  → tsc --noEmit OK + vite build OK（vite 8.3.8，133 modules，224 ms，exit 0）
                 dist/index.html 1.49 kB │ gzip 0.93 kB
                 dist/assets/index-CYKrmZl7.js 895.22 kB │ gzip 282.32 kB
                 dist/assets/katexLoader-CNO5m-uY.js 258.78 kB │ gzip 77.66 kB（惰性）
npm test       → 22 个文件 / 295 条，exit 0（`ℹ tests` 求和 295、`ℹ pass` 求和 295，日志 `.tmp/test-r36-ship.log`）
```

### 2. 首屏 gzip 预算（内线 310,000 / 硬线 320,000）

```
$ node scripts/measure-first-screen.mjs
   895227   279028  /assets/index-CYKrmZl7.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=929011 gzip=286056 headroom=33944 files=2 max=320000
target=310000 gap=23944
PASS
```

286,056 B ≤ 310,000 B（余 23,944）、≤ 320,000 B（余 33,944）。**与第 35 轮轮末同值**（`docs/iteration/STATE.md:52`、`README.md:99`），主 chunk 哈希也相同（`index-CYKrmZl7.js`），说明 HEAD 与第 35 轮收尾构建一致。首屏集合仍是 2 个文件，`katex`/`lazy` 排除断言仍生效（`scripts/measure-first-screen.mjs:65`）。换线后 Mermaid 走惰性 import 不会破这两条线（首屏 0 B）。

### 3. dist 体积与构成（31 个文件，1,471,108 B）

| 类别 | 文件数 | 字节 | 占 dist |
| :--- | ---: | ---: | ---: |
| `.js` | 13 | 1,195,538 | 81.3% |
| `.woff2`（KaTeX） | 15 | 213,664 | 14.5% |
| `.css` | 2 | 60,411 | 4.1% |
| `.html` | 1 | 1,495 | 0.1% |

- 主 chunk `index-CYKrmZl7.js` 895,227 B raw / 279,028 B gzip = dist 的 **60.9%**；惰性 `katexLoader` 258,788 B + CSS 26,627 B；其余 10 个 lazy chunk 都在 1,147–7,385 B。
- dist 内无 `.map`、无 `.woff`/`.ttf`（`scripts/vite-woff2-only.mjs` 生效，字体只发 15 个 woff2）。
- 安装器载荷 = `host/bin` 五件 1,024,862 B（Core.dll 703,328 / WebView2Loader.dll 194,912 / Sidelight.exe 87,040 / WinForms.dll 38,792 / config 790）+ dist 1,471,108 = **2,495,970 B** → `EstimatedSize` 2,438 KB（`packaging/installer.ps1:44-50`）。
- 与第 35 轮报告 `:28` 的 1,471,881 B 不同，**不是体积下降**：那一行量于 T2/T3 落地之前（主 chunk `index-O0GdPjrm.js` 896,224 B），第 35 轮收尾值就是现在这组（`round-35/impl.md:216`）。

### 4. `release/` 里的 0.32.1 资产（只读）

| 资产 | 本地 `release/` | GitHub Release v0.32.1 | 一致 |
| :--- | ---: | ---: | :--- |
| `...-win-x64-setup.exe` | 824,595（**FileVersion 0.31.1.0**、ProductVersion 0.32.1） | 824,209（sha `5f0418ff…`） | 本地 +386 B，且版本信息是旧的（见 F5） |
| `...-win-x64-portable.zip` | 910,360 | 910,360（sha `3c4a3a58…`） | 大小一致、哈希不同（NSIS/zip 不可复现，第 30 轮已登记） |
| `...-macos-universal.zip` | **无**（本机 Windows） | 905,892（sha `2f838b77…`） | 无法本地比对 |
| `SHA256SUMS-0.32.1.txt` | **无** | 308 B | — |

`release/` 现有 23 个文件 / 18,972,947 B，覆盖 0.27.0–0.32.1。预算对照：安装包内部 1,800,000 / 硬线 2,000,000 → 发布件余 1,175,791 B；便携 zip 门槛 2,000,000（`packaging/portable.ps1:16`）→ 余 1,089,640 B。

### 5. `packaging/*.ps1` 与 `packaging/README.md`

- 安装步骤（`packaging/README.md:10-18`）与 `installer.nsi` 一致：`InstallDir "$LOCALAPPDATA\Programs\Sidelight"`（`:26`）、`RequestExecutionLevel user`（`:28`）、缺 WebView2 时 `MessageBox MB_ICONSTOP` + `Abort`（`:117-118`）、组件页 `MUI_PAGE_COMPONENTS` + `Section /o`（`:151`，默认不勾）。
- 载荷卫生成立：`installer.nsi:122-131` 只 `File` 五件 + `packaging\sidelight.ico`/`README.txt`/`LICENSE` + `File /r "..\dist\*"`，`host/bin` 里的 `host.log*`、`www` 不会进包；`portable.ps1:50-53` 拒收 `webview2-data`/`host.log`/`*.ps1`。
- 体积护栏三处同类：`installer.ps1:89-92`（内线 WARN、不 exit）、`:117-129`（硬线打印载荷占比并 exit 1）、`portable.ps1:70-77`、`verify-installer.ps1:45-55`；数字与 `packaging/README.md:42,57` 一致。
- `verify-installer.ps1` 的「HKCU 卸载项 7 值」名副其实（`:162` 七项；`installer.nsi:138-144` 正好写这七项），「运行中安装/卸载被拒绝」「关联静态断言 10 写 / 4 删」都在。
- **`verify-installer.ps1` 现在直接跑会 FAIL**：`:151-152` 断言 `(Get-Item $setup).VersionInfo.FileVersion` 以 `0.32.1` 开头，而本地 `release/Sidelight-0.32.1-win-x64-setup.exe` 是 **0.31.1.0**（第 33 轮登记过的坏包），见 F5。
- 打包路径能本机跑：`.tmp/nsis/nsis-3.11.zip`（2,361,546 B）在、`makensis.exe` 在、`host/bin` 五件在。本轮用 **`installer.ps1 -AssocDryRun`** 打了个真包验证（只写 `.tmp`，不碰 `release/`）：`assoc-dryrun=827417 B`、`FileVersion=0.32.1.0`、`target=1800000 gap=-972583`、**耗时 1,053 ms**；见 F6。

### 6. 依赖是否可减

13 个运行时依赖逐个核对 import 命中：`@tiptap/core`、`starter-kit`、`markdown`、`pm`、`extension-image/mathematics/strike/table/task-item/task-list`、`katex`、`react`、`react-dom` 全部在用；`@tiptap/extension-strike` 不冗余（`src/App.tsx:116-120` 用它 extend 并把 StarterKit 自带的关掉，`:735` `StarterKit.configure({ strike: false })`）。devDependencies 7 个都被构建或脚本使用。**结论：运行时依赖无可减项**（本轮结论与第 35 轮相同）。

### 7. 启动路径：不联网、无常驻

- `dist/index.html` 只有本地 `assets/` 引用 + 内联底色样式 + 同步读 localStorage 主题脚本，无外链资源（favicon 是 data URI）。
- 外网请求只有 `src/lib/ai.ts:92`、`src/lib/search.ts:114`，都由用户动作触发；`setInterval`/`requestIdleCallback`/`serviceWorker` 在 `src/` **0 命中**。
- 启动期 `fetch` 全走宿主回环：`App.tsx:1168 /__doc`、`:1253 /__annotations`、`:1270 /__draft`、`:2876 /__recent`；宿主侧只有 `http://127.0.0.1:<port>/index.html`（`host/Program.cs:603,1519`），无外网地址、无更新检查。
- **结论：启动不联网、无后台常驻**（`README.md:96` 的承诺成立）。

## 二、发现

### F1（P1）`release.yml` 的重发路径会挂：「Remove stale arm64 assets」在「没有 arm64 资产可删」时以 exit 1 结束

**证据**
- `.github/workflows/release.yml:251-263`：

  ```bash
  set -euo pipefail                                   # :257
  if gh release view "$TAG" >/dev/null 2>&1; then     # :259
    gh release view "$TAG" --json assets -q '.assets[].name' | grep -- '-macos-arm64.zip' | while read -r name; do
      gh release delete-asset "$TAG" "$name" -y || true
    done                                              # :260-262
  fi
  ```
- 0.29.0 起 macOS 资产已改名 `-macos-universal.zip`，所以 `grep` 正常情况**无命中 → 退出码 1**；`pipefail` 让整条管道返回 1，`set -e` 于是中止本步骤 → job `release` 红 → `softprops/action-gh-release`（`:265-277`）不执行。
- 触发条件很具体：tag push 首次运行时 `gh release view` 失败（release 还不存在）→ `if` 体跳过 → 没事；**一旦 tag 已有 Release（Re-run all jobs、手动 dispatch + `publish`、或先发草稿再跑），这一步必红**。同文件 `:246` 的同型 `grep` 已经用 `|| { …exit 1; }` 兜住，`:260` 是唯一漏网的一处。
- 本机没有 bash（`Get-Command bash` 失败），**语义结论未经实跑**，补测方法：在任意 Linux/macOS shell 跑 `bash -c 'set -euo pipefail; if true; then echo x | grep -- -arm64.zip | while read -r n; do :; done; fi; echo reached'`，看不到 `reached` 即复现。

**建议**：`:260` 的管道加后缀 `|| true`（或改成 `mapfile -t stale < <(gh release view … | grep -- '-macos-arm64.zip' || true)` 再判长度）。
**预期收益**：发版失败/改稿后能靠 Re-run 恢复，不用手工删资产或绕过 workflow；错误从「某步骤 exit 1、没有一行说明」变成「没有可清理的旧资产」。

### F2（P1）`packaging/installer.ps1` 的 NSIS 取包与 CI 不一致，且下载后不校验哈希（第 35 轮 S4 已报，仍未修）

**证据**
- `packaging/installer.ps1:33-37`：缺 `makensis.exe` 时 `Invoke-WebRequest 'https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip'` → 直接 `Expand-Archive`，**没有 `Get-FileHash` 断言**，随后执行其中的 `makensis.exe`。
- `.github/workflows/ci.yml:79-88` 走的是另一条路：本仓库固定资产 `…/releases/download/v0.26.0/build-tools-nsis-3.11.zip` + 断言 `NSIS_SHA256`（`ci.yml:25`）；`:83` 的注释写明理由「SourceForge 直链会返回反爬 HTML；改用本仓库 Release 固定资产」。
- 本机 `.tmp/nsis/nsis-3.11.zip` 实测 SHA256 = `C7D27F780DDB6CFFB4730138CD1591E841F4B7EDB155856901CDF5F214394FA1`，与 CI 的 pin **逐字相同** → 可信来源就是 vendored 那一份。
- 失败形态：干净机器上拿到 HTML 时，`Expand-Archive` 抛的是「压缩包无效」类异常，看不出是取包失败；而发布 0.32.1 的包正是 `release.yml` 用 vendored URL 拉 NSIS 打出来的。

**建议**：把 `installer.ps1` 的下载段换成与 `ci.yml:79-88` 同一份 URL + 同一个常量哈希；哈希不符或下载失败时打印一句「NSIS 取包失败/哈希不符，见 packaging/README.md 的取法」，不要只抛 `Expand-Archive` 的原始异常。
**预期收益**：打包路径可复现、失败信息可读；少一个「未校验的可执行工具链」缺口（`AGENTS.md` §7 要求交接可复现，这一处现在只有 CI 可复现）。

### F3（P2）CI 每次都上传 `Sidelight-macos` artifact，全仓库没有消费方（第 35 轮 F2 前半已报，仍未修）

**证据**：`.github/workflows/ci.yml:139-143` 每次 push/PR 上传 `Sidelight-macos`（≈905,892 B，retention 90 天）；`git grep -n "Sidelight-macos"` 只命中 `ci.yml:142`。`release.yml:185-190` 的 macos-build 自己产 `macos-zip` 给 release job 用，与它无关。`ci.yml:102-106` 的 `Checksums` 同样只打印 setup 哈希、便携 zip 哈希不打印，且没有下载方。
**建议**：删掉 `ci.yml:139-143` 这一个 step（`macos-host` 的构建、self-test、`verify.sh` 全部保留）；`Checksums` 要么删，要么对 setup + portable 都算并 `upload-artifact`。
**预期收益**：每次 push/PR 少一次 ~0.9 MB 上传与 90 天存储，CI 少一步；日志里不再出现「打印了但没人比对」的哈希。

### F4（P2）README 的测试文件数停在 21，实测 22

**证据**：`README.md:155` 写「`lib/*.test.ts` 21 个测试文件挂进 npm test」；实测 `(Get-ChildItem src/lib/*.test.ts).Count = 22`、`npm test` 脚本列 22 个文件（`package.json:15`）、断言 295 条（与 `README.md:117` 的「22 个文件、295 条」自相矛盾）。第 35 轮新增 `src/lib/prompt.test.ts` 后只改了 `:117`，`:155` 漏改。
**建议**：`README.md:155` 的 `21` → `22`。
**预期收益**：同一份 README 里两个测试计数不再互相矛盾；下一轮再加测试时不会继续累偏差。

### F5（P2）本地 `release/` 不能自证「哪个是发布件」，而且现在直接跑 `verify-installer.ps1` 会 FAIL

**证据**
- `release/SHA256SUMS.txt`（207 B）内容是 0.26.0 两条，同目录实际有 23 个文件（0.27.0–0.32.1）；`git grep "SHA256SUMS"` 只命中 `release.yml` 的 `SHA256SUMS-<版本>.txt`，**没有任何脚本写本地这个文件** → 它是历史残留。
- 本地 `release/Sidelight-0.32.1-win-x64-setup.exe` = 824,595 B、**FileVersion 0.31.1.0**（`packaging/verify-installer.ps1:151-152` 会判 `FAIL setup VersionInfo 为空/不匹配`），而发布资产是 824,209 B / 同样是 0.31.1.0。第 33 轮修的是「打包断言」，这件事的**后果**（本机验收脚本一跑就红、读起来像产品缺陷）本轮才补上。
- 本机 `release/` 没有 macOS 资产，README 让用户核对 `SHA256SUMS-0.32.1.txt`；本地重打包得到的包与发布件哈希必然不同（第 30、31 轮登记）。

**建议**：`packaging/README.md` 的「构建与验收」段加一段（3 行）：本地重打包的字节与哈希**不等于**发布资产（NSIS 不可复现）；对外数字与校验和只取 Release 页；`release/SHA256SUMS.txt` 是历史残留、不是发布校验和；验收前先重跑 `installer.ps1`。同时 `verify-installer.ps1:151-152` 的 FAIL 文案补一句「（若是旧构建，先重跑 packaging\installer.ps1）」。
**预期收益**：维护者不会拿本地字节对外、不会把 0.31.1.0 的旧包当证据；跑验收脚本失败时知道下一步做什么。

### F6（P2）第 36 轮 Mermaid 的安装包真字节可以在不碰 `release/` 的前提下量出来（`-AssocDryRun`，1 秒）

**证据**
- 本轮实跑 `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun`：`fileVersion=0.32.1.0`、`target=1800000 gap=-972583`、`assoc-dryrun=827417 B`、**elapsed=1,053 ms**；产物只落 `.tmp\assoc-dryrun-setup.exe`（`installer.ps1:52-57,72-76`），`release/` 一位字节没动（`git status` 仍只有 `?? shots/round-36/`）。
- ADR-0017 的 `1,474,881 B` 是**预估**（公式 `824,595 + 新增 raw × 0.329`，`docs/adr/0017-mermaid-lazy-loading.md:38`），产品负责人要求「首次真实打包后按实测 +5% 复核」（`STATE.md:161`）。dry-run 与正式包的差值很小：第 33 轮干跑 826,742 B vs 正式 824,595 B（+2,147 B），本轮干跑 827,417 B，按此正式包约 **825 KB**。
- **注意方向**：dry-run 在 `installer.ps1:94-102` 就 `exit 0`，**跳过了 2,000,000 B 硬线检查**（`:117-129`）与 SHA256 打印，所以它只给字节、不给判定，超线要自己算。

**建议**：第 36 轮的验收项里加两条——① Mermaid 落地后跑一次 `installer.ps1 -AssocDryRun`，记 dist 总量与 setup 字节，用实测替换 ADR-0017 的预估并按 +5% 复核（余量对照 1,800,000 内部线 / 2,000,000 硬线）；② 别把 dry-run 的 exit 0 当「体积合格」。
**预期收益**：Mermaid 那轮不必靠公式赌体积，1 秒就能拿到真实安装包字节，且不违反「不碰 `release/`」。

## 三、文档数字抽查（一致，不单列发现）

- 首屏 `README.md:99` 286,056 / 余 33,944、距内线 23,944 → 与本次实测一致。
- 安装包 `README.md:99` 824,209（本机重建 824,595，距硬线余 1,175,791）→ 与 GitHub API 一致，对外只写发布件这一点是对的。
- `README.md:117` 295 条、`AGENTS.md` §3/§6 295 条、`STATE.md:52` 22/295 → 互相一致，实测也是 295。
- `README.md:101` 主 chunk 895,227 / `chunkSizeWarningLimit: 950` → 实测 895,227 B，一致。
- 首屏口径小项（第 35 轮 F1）：`measure-first-screen.mjs` 仍不含入口 `index.html`（1,495 B raw / 927 B gzip）。换线到 310,000 / 320,000 后这条**已不再危险**（286,056 + 927 = 286,983，距内线仍余 23,017），所以本轮只记下、不单列，除非根代理要统一措辞。

## 四、UNVERIFIED

1. **F1 的 bash 语义未实跑**：本机 `Get-Command bash` 失败（Windows，无 WSL/Git Bash），结论来自 `set -e` + `pipefail` 的定义，补测命令见 F1。
2. **真实安装**（HKCU 7 值、开始菜单、SmartScreen、真人双击、卸载残留）：按角色约束不做系统级安装、不碰注册表，沿用既有 UNVERIFIED。
3. **macOS zip 的本地字节与内容**：本机 Windows、`release/` 无该资产，只有 API 的 905,892 B / `2f838b77…`。
4. **未 push、未跑 CI/Release 流水线**，F1/F3 的 CI 收益是静态推断。
5. **Mermaid 落地后的真实安装包字节**：本轮只有基线（dry-run 827,417 B）；加 mermaid 后的数要第 36 轮实施后重跑 F6 的命令。
6. 未跑 `npm run roundtrip`、`scripts/acceptance.mjs`（角色只要求 build + measure；`npm test` 本轮加跑，用于核对 README 的 295 条）。

## 五、上轮（round-35）6 条复核

| 上轮 | 现状 | 证据 |
| :--- | :--- | :--- |
| F1 首屏口径漏入口 HTML | **未修，但风险已被换线消解** | `measure-first-screen.mjs:26-37` 仍不收 `index.html`；286,056 + 927 = 286,983 < 310,000 |
| F2 CI「只产不用」两处 | **未修** | `ci.yml:139-143`、`ci.yml:102-106` 原样；本轮 F3 |
| F3 `install-verify` 用 ShellExecute | **未修** | `ci.yml:166` 仍 `Start-Process $setup`（无 `-NoNewWindow`） |
| F4 五件载荷四处各写一遍 | **未修** | `installer.ps1:10-16`、`portable.ps1:18-24`、`installer.nsi:122-126`、`verify-installer.ps1:84` 仍四处 |
| F5 本地发布件无法自证 | **未修，且本轮补到更硬的证据** | 本地 setup 仍 824,595 B / FileVersion 0.31.1.0；`release/SHA256SUMS.txt` 仍 0.26.0；本轮 F5 |
| S4 `installer.ps1` 的 NSIS 来源 | **未修** | `installer.ps1:35` 仍 SourceForge 直链、仍无哈希校验；本轮 F2 |
| S5 CI 没跑 `host-smoke --fsa` | **未修** | `ci.yml:94`、`release.yml:96` 仍不带 `--fsa` |
| S6 preflight 不查 Unreleased 收口 | **未修** | `release.yml:58` 仍只 `grep "^## ${PKG_VERSION} — "` |

（F1 换线后已降级，不再占本轮发现名额；S5/S6 属发版前置检查，本轮不重复展开，需要时按上轮原文处理。）

## 六、结论

`npm run build` 通过（133 modules / 224 ms / exit 0），首屏 **286,056 B ≤ 310,000 B（余 23,944）**、`npm test` 22 文件 295 条全过。`dist` 1,471,108 B / 31 文件，安装器载荷 2,495,970 B。0.32.1 发布资产与 GitHub API 一致（setup 824,209 / portable 910,360 / macOS 905,892），本地重建 setup 824,595 B 且 **FileVersion 仍是旧的 0.31.1.0**。运行时依赖无可减项；启动不联网、无常驻。

6 条建议，按可以立刻动手排：**F2**（installer.ps1 的 NSIS 取包对齐 CI + 哈希校验，改动约 10 行，同时消一个供应链缺口）→ **F6**（给第 36 轮 Mermaid 加一条 1 秒的真字节取证步骤，纯计划改动）→ **F1**（release.yml 一个 `|| true`，修掉重发路径）→ **F4**（README 一个数字）→ **F3**（删 CI 一个 step）→ **F5**（packaging/README 一段 + 一句 FAIL 文案）。
