# 第 03 轮 · 发布、体积与优化 · 发现

只侦察，不改产品文件。基线 commit `6c9c2b0`（工作树干净），版本 `0.16.3`。

## 本轮实测基线

| 项 | 值 | 取数方式 |
| :--- | ---: | :--- |
| 跟踪字节合计 | 9,322,054 B | `git ls-files` 逐个 `Length` 求和 |
| `shots/` 占跟踪字节 | **89.90%**（8,380,597 B / 108 个 PNG） | 同上 |
| `dist` | 1,395,531 B | `Get-ChildItem dist -Recurse -File` |
| `dist` JS 单 chunk | 1,089,690 B raw / **336,109 B gzip** | `dist/assets/index-*.js` |
| `dist` CSS | 49,085 B raw / 12,599 B gzip | `dist/assets/index-*.css` |
| KaTeX 字体 | 256,168 B / 19 个 woff2（占 `dist` 18.4%） | `KaTeX_*.woff2` 求和 |
| 便携 zip | 900,752 B | `release/Sidelight-0.16.3-win-x64-portable.zip` |
| 宿主载荷 | 2,379,631 B | ADR-0004 第 42 行公式 |
| 本机权限 | `IsAdmin = False` | `WindowsPrincipal.IsInRole` |

本机 `makensis` / `ISCC` / `dotnet` / `candle` / `light` / `wix` / `7z` / `nuget` **全部不在 PATH**，`Program Files` 下也没有 NSIS / Inno Setup / WiX 目录。

---

## S1 安装器：NSIS 便携版实测可行，包体 800,098 B，比现有 zip 还小 100,654 B

**证据（本机实测，不是估算）。** NSIS 3.11 官方 zip 解压即用，`makensis.exe` 直接跑出版本号 `v3.11`：

```powershell
curl.exe -sL -o .tmp\nsis\nsis-3.11.zip 'https://sourceforge.net/projects/nsis/files/NSIS%203/3.11/nsis-3.11.zip/download'
Expand-Archive .tmp\nsis\nsis-3.11.zip .tmp\nsis
.tmp\nsis\nsis-3.11\makensis.exe /VERSION      # → v3.11
```

| 取数 | 值 |
| :--- | ---: |
| NSIS 工具 zip 下载 | 2,361,546 B，SHA256 `C7D27F78…F214394FA1` |
| 解压后工具目录 | 7,134,287 B / 441 个文件 |
| 该 zip 内 `makensis.exe` 是否需要管理员 | **否**。纯解压运行，无安装步骤，不写注册表 |

我用 `.tmp\nsis\proto.nsi` 编了一个 per-user 原型（`RequestExecutionLevel user`、`InstallDir "$LOCALAPPDATA\Programs\Sidelight"`、`CreateShortcut "$SMPROGRAMS\Sidelight.lnk"`、`WriteUninstaller`），载荷就是 `host\bin` 的 5 个文件 + `dist\*` = 2,379,631 B。四种压缩参数的实测结果：

| 压缩参数 | 安装包字节 |
| :--- | ---: |
| `SetCompressor /SOLID lzma` + `DictSize 32` | **800,098** ← 最小 |
| `SetCompressor /SOLID lzma` + `DictSize 64` | 800,100（无收益，载荷太小） |
| `SetCompressor lzma`（非 solid） | 817,524 |
| `SetCompressor /SOLID bzip2` | 930,827（比 zip 还差） |
| 现有便携 zip 基线 | 900,752 |

`makensis` exit 0，产出 `Sidelight-0.16.3-win-x64-setup-proto.exe`，SHA256 `57E01665…65AA1207`。

**坑（已实测，写进方案）。** `.nsi` 里有中文注释时，`makensis` 报 `Bad text encoding: proto.nsi:1` 并 exit 1。NSIS 按系统 ANSI 代码页读脚本，UTF-8 无 BOM 会乱码。两条修法：脚本只写 ASCII 注释，或存成带 BOM 的 UTF-8。我改成纯 ASCII 注释后通过。

**影响。** 安装器不但可做，还比 zip 小 11.2%。用户拿到的是双击即装的 exe，不是「先解压到可写目录」的说明书。ADR-0004 第 52 行「正式安装包要换成安装器给的可写目录」这条缺口，用 `$LOCALAPPDATA\Programs` 直接补上：`host/Program.cs:161-184` 的第一优先目录就是 `%LOCALAPPDATA%\Sidelight\WebView2`，装到 `$LOCALAPPDATA` 下必然可写，不会退到 exe 同级。

**建议。** 走 NSIS，方案与五案对比见下节「安装器推荐」。

**第一步命令。**

```powershell
# 1) 取工具（零管理员）
curl.exe -sL -o .tmp\nsis\nsis-3.11.zip 'https://sourceforge.net/projects/nsis/files/NSIS%203/3.11/nsis-3.11.zip/download'
Expand-Archive .tmp\nsis\nsis-3.11.zip .tmp\nsis -Force
.tmp\nsis\nsis-3.11\makensis.exe /VERSION

# 2) 拿本轮原型对着改，编出真安装包
.tmp\nsis\nsis-3.11\makensis.exe .tmp\nsis\proto.nsi
```

---

## S2 版本：应升 0.17.0，不是 0.16.4；CHANGELOG 缺 2 轮共 2 条

**证据。** `package.json:3` 仍是 `"version": "0.16.3"`。`docs/CHANGELOG.md` 最新一条是 `## 0.16.3 — 2026-11-15`（第 5 行），第 1 轮与第 2 轮的改动**一条都没有进 CHANGELOG**。`STATE.md:77` 已把它记成待办。

`AGENTS.md` 第 5 节的规则是「修复 +0.0.1，功能 +0.1.0，破坏性 +1.0.0」。第 2 轮的内容按这条规则分开看：

- 修复类：脏判断不再静默丢字、长路径、启动失败提示、模拟批注加「模拟」标注、对比度、三个对话框焦点锁。
- 能力类：`release/` 出现第一个可分发的构建产物（900,752 B）——这是用户能拿到的东西，不是内部修复。

第 3 轮的目标里还有「能新建文档」，这是新增的用户可见能力。

**影响。** 若写成 0.16.4，两轮里新增的可见能力被降级成补丁号，违反仓库自己写的语义化规则。并且 0.16.3 之后从没发布过任何东西，0.17.0 正好当「首个可发布版本」。

**建议。升 0.17.0。** 两份草稿如下，按现有格式（`## 版本 — 日期`，一行标题，要点列表）。第 3 轮尚未实施，方括号是实施后必须回填的数字。

### 草稿 A（推荐）：0.17.0

```markdown
## 0.17.0 — 2026-11-[日]

第一次能装。给了 Windows 安装包，也补上两轮没记的改动。

- 新增 Windows 安装包：per-user 安装，不需要管理员；文件进 `%LOCALAPPDATA%\Programs\Sidelight`，带开始菜单快捷方式与卸载项。
- 新增「新建文档」；窄窗口（≤1119px）不再裁掉顶栏按钮；错误提示直接说下一步该做什么。
- 宿主转发新文件前先确认未保存改动，不再静默丢字；超过 260 字符的路径能打开与保存。
- 打包体积：[TBD] B（安装包）/ 900,752 B（便携 zip）；公式字体只发 woff2，字体从 1,072,948 B 降到 256,168 B。
- 宿主冷启动：[TBD]。
```

### 草稿 B（仅当要先单独发第 2 轮的修复）

```markdown
## 0.16.4 — 2026-11-[日]

修：宿主转发新文件时可能丢掉还没保存的字，外加两处首次使用的坑。

- 宿主转发前用 `window.__slState` 判断脏状态，默认答「否」，不再默认替换；宿主初始化前到达的转发先入队再重放。
- 打开 260 字符以上的长路径不再失败；启动失败时窗口直接写原因与日志路径，不再静默退出。
- 模拟批注加「模拟」标注，不再冒充真模型输出；三处对话框的焦点锁在框内，`aria-modal` 补齐，关闭后焦点归还。
- 产出第一个可分发的构建产物：便携 zip 900,752 B，带 SHA256。
```

**第一步命令。** 只改两个文件，不要动别的：

```powershell
# 1) 改版本号（手改，或）：
(Get-Content package.json -Raw) -replace '"version": "0.16.3"','"version": "0.17.0"' | Set-Content package.json -Encoding UTF8
# 2) 在 docs/CHANGELOG.md 第 4 行后插入草稿 A
# 3) 复跑便携包，确认文件名跟着版本走
powershell -ExecutionPolicy Bypass -File packaging\portable.ps1
```

---

## S3 仓库卫生：`shots/` 已是 89.90%（不是 86.5%），可把跟踪字节从 9.32 MB 降到 1.03 MB

**证据一：占比过期。** `STATE.md:71` 与第 2 轮报告写「86.5%」。实测现在是 **89.90%**（8,380,597 B / 9,322,054 B）。第 2 轮的 47 张图（3,954,509 B）把比例又推高了 3.4 个点。

**证据二：绝大多数图没人引用。** 我扫了全部跟踪的 `*.md` 与 `*.mjs`：

| 口径 | 文件数 | 字节 |
| :--- | ---: | ---: |
| 跟踪的 PNG 总数 | 108 | 8,380,597 |
| 被**用户可见文档**引用（`README.md`、`CONTRIBUTING.md`、`GLOSSARY.md`、`docs/adr/*.md`） | **2** | **84,941** |
| 被任意跟踪的 `*.md` / `*.mjs` 引用 | 33 | 2,571,810 |
| 没有任何引用 | **75** | **5,808,787** |

必须留的只有 2 张，都是 ADR-0004 的验收证据：

- `shots/round-01/t3-window.png`（36,053 B，ADR-0004 第 21 行，窗口标题与渲染）
- `shots/round-01/t3-fsa.png`（48,888 B，ADR-0004 第 24 行，真实文件读写）

**证据三：`.gitignore` 规则我验过了。** 在 `.tmp\gitignore-probe` 建了个临时仓库，写入下列 5 条规则后跑 `git check-ignore`，结果与预期完全一致（只有那两张读作 tracked-ok，其余 `shots/` 与 `release/` 全部 IGNORED）：

```gitignore
shots/**
!shots/round-01/
!shots/round-01/t3-fsa.png
!shots/round-01/t3-window.png
release/
```

**证据四：`release/` 现在是半忽略。** `git ls-files release` 返回空，但拦住 zip 的是 `.gitignore:11` 的 `*.zip`，不是目录规则。发布清单要落地 `release/SHA256SUMS.txt`，那个文件会立刻变成未跟踪噪声。补一条 `release/` 即可。

**证据五：`vite.config.ts` 漏了 `host/bin`。** 第 10-18 行 `watch.ignored` 有 5 条 glob（`.edge-profile*`、`.tmp`、`.npm-cache`、`node_modules`、`*.tmpdir`），没有 `host/bin`。`host/build.ps1` 每次跑都先 `Remove-Item $www -Recurse -Force` 再写 60 个文件，Vite 全看在眼里。

**影响。** 克隆体积与每次验收的提交噪声。按上面的规则 `git rm --cached` 之后：

| | 现在 | 清理后 |
| :--- | ---: | ---: |
| 跟踪字节 | 9,322,054 B | **1,026,398 B**（−89.0%） |
| `shots/` 占比 | 89.90% | **8.3%** |
| 每次验收改写的跟踪文件 | 最多 108 个 | 0 |

**建议。** 三条一起做：

1. `.gitignore` 追加上面 5 条规则。
2. `git rm --cached -r` 的范围：`shots/` 下除那两张之外的全部。用 `--cached` 而不是 `-r`，磁盘文件留着，历史不受影响。历史里那 8.3 MB 仍占 `.git` —— `git count-objects -vH` 现在 `size: 8.15 MiB`，要真正瘦身得 `filter-repo`，**本轮不做**，列为可选。
3. `vite.config.ts:12-18` 的 `ignored` 数组加 `'**/host/bin/**'`。

**`watch.ignored` 的风险。** 只有一条：将来若有人直接改 `host\bin\www` 里的文件调试，改动不会再触发刷新。实际开发流是改 `src/` → Vite 服 `src/` → `host/build.ps1` 拷 `dist`，所以这条风险不成立。反向还有收益：不再出现 `EBUSY` 噪声与整页 reload。建议同时补 `'**/release/**'`，因为 `portable.ps1` 每次重写那个 zip。

**第一步命令。**

```powershell
# 1) 规则（已验证）
@'
shots/**
!shots/round-01/
!shots/round-01/t3-fsa.png
!shots/round-01/t3-window.png
release/
'@ | Add-Content .gitignore

# 2) 只留 ADR 引用的两张
git ls-files shots | Where-Object { $_ -notin 'shots/round-01/t3-fsa.png','shots/round-01/t3-window.png' } |
    ForEach-Object { git rm --cached -- $_ }

# 3) 验证
git ls-files shots          # 应只剩 2 行
git status --porcelain | Measure-Object -Line
```

---

## S4 CI：该加 windows 宿主 job；先 `workflow_dispatch` 跑一次量时长，再转必过

**证据。** `.github/workflows/ci.yml` 只有 1 个 job（`gate`，`ubuntu-latest`，`timeout-minutes: 15`），步骤是 `npm ci` → `npm run build` → `npm test`（第 12-24 行）。**编译宿主与冒烟一行都没有**。也就是说 `host/Program.cs` 的 512 行、`host/build.ps1`、`scripts/host-smoke.mjs` 至今零 CI 保护，全靠本机手跑。而 `packaging/portable.ps1` 断言 `host\bin` 的 5 个文件存在，没有 CI 就没人知道它们哪天会编不过。

可行性已核实：`scripts/host-smoke.mjs:11-12` 用 `chromium.connectOverCDP('http://127.0.0.1:9333')` 连的是**宿主自己的 WebView2**（第 78 行注入 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port`），不下载 Chromium。`playwright-core` 已在 `devDependencies`，`npm ci` 之后就有。所以 runner 上不需要额外浏览器。

**建议的 job（追加到 `ci.yml`）：**

```yaml
  host:
    # 只在手动触发时先跑一次量时长；确认稳定后改成 push/pull_request
    if: github.event_name == 'workflow_dispatch'
    runs-on: windows-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: WebView2 SDK（NuGet 包 = zip，无 dotnet SDK）
        shell: pwsh
        run: |
          Invoke-WebRequest -Uri https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.4314.35 -OutFile .tmp\wv2.zip
          Expand-Archive .tmp\wv2.zip .tmp\wv2 -Force
      - name: 编译宿主
        shell: pwsh
        run: powershell -ExecutionPolicy Bypass -File host\build.ps1
      - name: 冒烟（不带 --fsa：系统文件对话框在无头会话里不可靠）
        run: node scripts/host-smoke.mjs
      - name: 打便携包并留档
        shell: pwsh
        run: powershell -ExecutionPolicy Bypass -File packaging\portable.ps1
      - uses: actions/upload-artifact@v4
        with:
          name: Sidelight-portable
          path: release/*.zip
```

`on:` 需要同时加 `workflow_dispatch:`。

**预计时长。** 下面每项是**估算**，不是实测（本机跑不了 GitHub runner）：

| 步骤 | 估算 |
| :--- | ---: |
| `npm ci`（有 cache） | 40–70 s |
| `npm run build` | 20–40 s |
| WebView2 SDK 下载 + 解压 | 15–30 s |
| `host/build.ps1` | 5–10 s |
| `host-smoke.mjs`（起窗口、CDP、5 项断言） | 40–90 s |
| `portable.ps1` | 5–10 s |
| **合计** | **约 3–5 分钟** |

15–20 分钟的 timeout 有充足余量。

**加分项：** `portable.ps1` 的 `$threshold = 940000`（第 15 行）本身就是一个体积门禁。放进 CI 之后，任何人把 `webview2-data` 或 `host.log` 混进 staging 都会当场 exit 1。这是当前最便宜的一条回归护栏。

**不加的理由（也要写清）。** 三条真实的成本：一是每次 push 多烧 3–5 分钟，`windows-latest` 的排队通常比 `ubuntu-latest` 慢；二是 `host-smoke.mjs` 要起真窗口、连 CDP、读 `Get-Process`，属于最容易 flaky 的一类测试，红了会挡合并；三是本机 `host/build.ps1` 依赖 `csc.exe` 与 NuGet 下载，runner 镜像是否两样都齐**未验证**。所以：**先 `workflow_dispatch` 手动跑，看到绿了再转必过**。若第一次就红，退回「只在 `release` tag 上跑」，不要为一个 flaky 的 job 拖慢日常提交。

**第一步命令。**

```powershell
# 先在 workflow 里加 job，再本地确认冒烟本身是绿的（前提：host/bin 已产出）
node scripts/host-smoke.mjs
```

---

## S5 体积：KaTeX 拆包可让主 chunk gzip 从 336,109 降到约 259,666 B；sourcemap 已经是关的，别再动

**证据一：单 chunk，且 KaTeX 在里面。** `dist/assets/` 只有 1 个 JS（`index-DR3Uybpb.js`，1,089,690 B）。`src/main.tsx:6` 静态 `import 'katex/dist/katex.min.css'`，`PreviewPane.tsx:2`、`MathInlineEditor.tsx:3`、`MathDraftPreview.tsx:2` 三处静态 `import katex from 'katex'`。KaTeX 因此必然进主 chunk。

**证据二：量化。**

| 项 | raw | gzip |
| :--- | ---: | ---: |
| 主 chunk 现在 | 1,089,690 | 336,109 |
| `node_modules/katex/dist/katex.min.js` | 272,756 | 76,443 |
| **KaTeX 拆成异步 chunk 后主 chunk 估算** | **816,934** | **259,666** |

**证据三：字体还能再省 122,360 B。** 20 个 `@font-face` 里 1 个（`KaTeX_Size3`）被 Vite 内联成 data URI，其余 19 个共 256,168 B。其中 10 个是中文技术写作基本用不到的字形：

| 族 | 字节 |
| :--- | ---: |
| AMS-Regular | 28,076 |
| SansSerif（3 个） | 34,588 |
| Fraktur（2 个） | 22,664 |
| Typewriter | 13,568 |
| Script | 9,644 |
| Caligraphic（2 个） | 13,820 |
| **合计** | **122,360** |

保守口径：`Fraktur` + `Script` + `Typewriter` = **45,876 B** 可以确定砍掉（`\mathfrak`、`\mathscr`、`\texttt` 在中文技术写作里罕见）。`Caligraphic`（`\mathcal`）与 `AMS` 别砍，`SansSerif` 只砍 Bold/Italic 两种。

**证据四：sourcemap 已经是关的，不要再提。** `dist` 里 `.map` 文件数为 **0**，`vite.config.ts` 没有 `build.sourcemap`（Vite 生产默认 `false`）。这一条**没有可省的体积**，列进「已验证无需动作」。

**影响。** 主 chunk 816,934 B 仍超过 Vite 默认的 500 KB 警告线，`npm run build` 会继续报警。要压到 500 KB 以下得再从 React 19 + Tiptap/ProseMirror 里抠 317 KB —— 不现实。**结论：那条警告不该用拆 KaTeX 去追。** 拆 KaTeX 的真实收益是 (a) 打开没有公式的文档时省 76,443 B gzip 的解析，(b) 主 chunk 少 25%，(c) 与第 3 轮「冷启动 FCP 2.2 s」的调查同向。真正该做的是把 `build.chunkSizeWarningLimit` 显式写成 900 并加一行注释说明理由，把警告从「天天红」变成「有据可查」。

**量化目标与验证命令。**

| 目标 | 现在 | 目标值 | 验证 |
| :--- | ---: | ---: | :--- |
| 主 chunk gzip | 336,109 | **≤ 265,000** | 见下 |
| 主 chunk raw | 1,089,690 | **≤ 830,000** | 见下 |
| `dist` 总体积 | 1,395,531 | **≤ 1,150,000** | 见下 |
| 安装包 | 800,098（原型） | **≤ 800,000** | `packaging\portable.ps1` 同款门槛 |

`STATE.md:72` 写的「gzip 341 KB，目标 ≤250 KB」这个目标，按上面实测**差约 10 KB 达不到**，除非再动主 CSS 或 React。建议把这条目标改成 **≤265 KB**，并在 STATE 里写清为什么。不要留一个做不到的数字。

```powershell
# dist 总体积
(Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum

# 主 chunk raw
Get-ChildItem dist -Recurse -File -Filter *.js | Select-Object Name,Length

# 主 chunk gzip（本报告用的同一段）
Add-Type -AssemblyName System.IO.Compression
Get-ChildItem dist -Recurse -File -Filter *.js | ForEach-Object {
  $b=[IO.File]::ReadAllBytes($_.FullName); $ms=New-Object IO.MemoryStream
  $gz=New-Object IO.Compression.GZipStream($ms,[IO.Compression.CompressionMode]::Compress,$true)
  $gz.Write($b,0,$b.Length); $gz.Dispose(); "{0} raw={1:N0} gz={2:N0}" -f $_.Name,$b.Length,$ms.Length
}

# 字体 face 计数（应仍为 20，若拆包则主 CSS 里应变成 0）
$css = Get-Content (Get-ChildItem dist -Recurse -Filter *.css | Select-Object -First 1).FullName -Raw
([regex]::Matches($css,'@font-face')).Count
```

**第一步命令。** 先只做「KaTeX 走动态 `import()`」这一件事，量到数字再决定要不要砍字体：

```powershell
# 改 src/components/{PreviewPane,MathInlineEditor,MathDraftPreview}.tsx：
#   const katex = (await import('katex')).default
#   （或在需要的组件里 React.lazy + 动态 import）
# 然后只编产物、不碰 dist：
npx vite build --outDir .tmp/build-ship
```

⚠ 按 `STATE.md:82` 的构建纪律，不要跑 `npm run build`；用 `npx vite build --outDir .tmp/build-ship` 看数字。

---

## 安装器推荐

**推荐：NSIS 3.11 便携版 + `RequestExecutionLevel user` + 装到 `$LOCALAPPDATA\Programs\Sidelight`。实测 800,098 B，零管理员，per-user 安装与卸载。**

### 五案对比

| 方案 | 工具怎么获取（要管理员？） | 预估安装包体积 | per-user 装/卸 | 开始菜单 | `.md` 关联 | 签名与 SmartScreen | 工作量 | 第一步命令 |
| :--- | :--- | ---: | :--- | :--- | :--- | :--- | ---: | :--- |
| **NSIS（推荐）** | `nsis-3.11.zip` 2,361,546 B，解压即用，**无需管理员**（已实测 `v3.11`） | **800,098**（实测，LZMA solid 32） | ✅ `RequestExecutionLevel user`；`uninstall.exe` 已实测生成 | ✅ `CreateShortcut "$SMPROGRAMS\…"` | ✅ 可写 `HKCU\Software\Classes\.md`（抢不到默认程序，见轮 02 S4） | 未签名 → 「Windows 已保护你的电脑」，要点「更多信息 → 仍要运行」 | 0.5 天 | `.tmp\nsis\nsis-3.11\makensis.exe proto.nsi` |
| Inno Setup 6 | `jrsoftware.org/download.php/is.exe`；本机自带安装器支持 `/CURRENTUSER` 静默装到 `%LOCALAPPDATA%\Programs`，**无需管理员**；无官方便携 zip | 820,000–860,000（LZMA2，同量级，**未实测**） | ✅ `PrivilegesRequired=lowest`；安装目录要显式写 `{localappdata}` | ✅ `[Icons]` 段 | ✅ 同上，`PrivilegesRequired=lowest` 时自动走 HKCU | 同上 | 0.5–1 天（多一步解决工具获取） | 需先 `/VERYSILENT /CURRENTUSER /DIR=.tmp\inno` |
| WiX / MSIX | **阻断**：`dotnet` 不在 PATH，`candle`/`light`/`wix`/`MakeAppx` 全无。要么装 .NET SDK，要么靠 CI | MSIX 约 1.0–1.2 MB（**未实测**） | ✅ MSIX 天然 per-user | ✅ manifest `uap:VisualElements` | ✅ manifest 声明，但注册后仍需用户选默认 | MSIX **必须签名**；自签证书要装进 `LocalMachine\TrustedPeople` = **要管理员** | 2–3 天 + 证书 | 仅 CI 可行 |
| Squirrel.Windows | 需 .NET SDK / NuGet；项目已归档不再维护 | ≈ zip + 1.5–2 MB（`Update.exe` + 版本化 `app-x.y.z/`） | ✅ `%LOCALAPPDATA%` | ✅ | ✅ 写注册表 | 同上 | 2 天 | 不建议起 |
| zip + 首次运行解压 | 无需工具（`System.IO.Compression` 已有） | ≈ 900,752 + 引导器 ~30 KB | ✅ 解压到 `%LOCALAPPDATA%` | 要自己写 `.lnk` | 要自己写注册表 | 同上 | 1–1.5 天，重新实现安装器的功能 | 不需要 |

**为什么 NSIS 胜出。** 四条：工具零管理员到手（唯一的官方便携 zip）；把安装包压到比现有 zip 更小；per-user 装/卸是内置能力，不需要自己写注册表清理；不引入任何新运行时依赖，符合 `AGENTS.md` 第 4 节的轻量底线。Inno Setup 各方面接近，但工具链要先跑一次安装器，在「无管理员」这个约束下多一层不确定。WiX/MSIX 本机直接阻断。Squirrel 引入一条已归档的依赖。第五种等于重写一遍 NSIS。

### 实装要点（原型里没做、必须补的）

1. **卸载项写 HKCU，不写 HKLM。** `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight`，这样「设置 → 应用」里能看到，且不需要管理员。原型的 `proto.nsi` 没写这一段。
2. **卸载不能删 `%LOCALAPPDATA%\Sidelight`。** 那是 WebView2 数据与缓存（`host/Program.cs:168`），会随使用涨到几十 MB。`RMDir /r $INSTDIR` 只清 `$INSTDIR`，别连带清 `%LOCALAPPDATA%\Sidelight`，或者给一个「同时删除数据」的可选项。
3. **`.nsi` 脚本只写 ASCII 注释**，否则 `makensis` 报 `Bad text encoding` 并 exit 1（本轮实测）。
4. **体积门禁。** 沿用 `packaging/portable.ps1` 的写法：编完比对字节数，超 `800000` 就 exit 1。原型 800,098 B 正好卡在边上，说明门槛该定 810,000 才不会被正常波动打红。
5. **签名是钱的问题，必须回到人。** 未签名 exe 与签名 exe 的差别只有 SmartScreen 体验：据 Microsoft 文档，未签名文件显示「Windows 保护你的电脑」，用户必须先选「仍然运行」才能跑；有效 OV/EV 证书在信誉积累前也是警告，但会显示已验证的发布者名称；Microsoft Store 分发的应用由 Microsoft 证书签名，永远不触发下载警告。OV 证书年费在几百美元量级，需产品负责人决定。

### ⚠ `.md` 文件关联：用户可见能力，需产品负责人确认

这一条**不在技术判断范围内**。技术上能实现：NSIS 在 `HKCU\Software\Classes\` 下写 `.md` 的 `ProgID` 与 `shell\open\command`，per-user、零管理员、卸载可清。但第 2 轮已实测的结论是：Windows 10/11 有 UserChoice 哈希保护，**注册之后抢不到默认程序**，用户仍要在「打开方式」里手动选一次 Sidelight。

也就是说，这个能力对用户的真实体验是「多了个候选」，不是「双击 .md 就进 Sidelight」。它同时会改变用户机器的文件类型行为，属于 `AGENTS.md` 第 1 节列的四种必须回到人的事之一（要加一个用户看得见的能力）。**结论：写进发布清单，等产品负责人点头再做，本轮不做。**

### 推荐实施顺序（半天）

```powershell
# 1) 取工具（一次性，零管理员）
curl.exe -sL -o .tmp\nsis\nsis-3.11.zip 'https://sourceforge.net/projects/nsis/files/NSIS%203/3.11/nsis-3.11.zip/download'
Expand-Archive .tmp\nsis\nsis-3.11.zip .tmp\nsis -Force

# 2) 把原型搬成 packaging\installer.nsi，补 HKCU 卸载项 + 体积门禁
#    原型起点：.tmp\nsis\proto.nsi（本轮实测 800,098 B 那一份）

# 3) 编（需先有 host\bin 与 dist）
powershell -ExecutionPolicy Bypass -File host\build.ps1
.tmp\nsis\nsis-3.11\makensis.exe packaging\installer.nsi

# 4) 断言体积与校验和
(Get-Item release\Sidelight-0.17.0-win-x64-setup.exe).Length
(Get-FileHash release\Sidelight-0.17.0-win-x64-setup.exe -Algorithm SHA256).Hash
```

---

## 发布清单

首发前必须有。⚠ 标记的必须先回到产品负责人，代理不能自己定。

### A. 仓库里必须有的文件

- [x] `LICENSE` — MIT，版权人写 `Sidelight contributors`（已存在，1,079 B）
- [x] `packaging/README.txt` — 便携包说明（已存在，2,037 B，含「不写注册表、不关联 .md」）
- [x] `.gitattributes` — `*.png binary` / `*.ico binary` 已设
- [ ] `NOTICE` 或 `docs/third-party-licenses.md` — **缺**。至少列 Tiptap（MIT）、ProseMirror（MIT）、KaTeX（MIT）、React（MIT）、WebView2 SDK（Microsoft 许可）
- [ ] `PRIVACY.md` — **缺**。必须写清四件事：正文与选区会发到用户自填的接口（不是我们代管）；搜索服务（Tavily / 博查）由用户自带 Key 且默认关闭；草稿与批注写入 `.sidelight/`；API Key 明文存浏览器 localStorage
- [ ] `release/SHA256SUMS.txt` — **缺**。`packaging/portable.ps1:62` 只 `Write-Host` 打印，不落盘
- [ ] 发布说明（GitHub Release 正文）— **缺**。可直接用 CHANGELOG 0.17.0 那段
- [ ] `.github/workflows/ci.yml` 加 `workflow_dispatch` 与 windows 宿主 job（见 S4）
- [ ] `.gitignore` 补 `shots/**` 与 `release/`（见 S3，规则已验证）
- [ ] `vite.config.ts` 的 `watch.ignored` 补 `'**/host/bin/**'`（见 S3）
- [ ] `README.md` 第 5 行「没有安装器」与第 39 行「没有安装器」在安装包落地后同步改
- [ ] `docs/iteration/STATE.md:52-54` 的 `dist` / zip 数字换成 0.17.0 的实测值

### B. 产物

- [ ] `release/Sidelight-0.17.0-win-x64-setup.exe`（安装包，目标 ≤810,000 B）
- [ ] `release/Sidelight-0.17.0-win-x64-portable.zip`（便携包，目标 ≤940,000 B，`portable.ps1` 已是硬门槛）
- [ ] 两个产物各一行 SHA256，写进 `release/SHA256SUMS.txt`
- [ ] 从干净机器验一次安装 → 启动 → 卸载 → 确认 `%LOCALAPPDATA%\Sidelight` 的行留/删行为符合预期

### C. ⚠ 必须人工确认（代理不能代替）

- [ ] **署名与版权人写法** — 现在写 `Sidelight contributors`，不写个人姓名。要不要换、换成什么
- [ ] **仓库地址** — `README.md` 与 `packaging/README.txt` 里的链接现在指向哪里，公开后是否要改
- [ ] **隐私声明措辞** — `PRIVACY.md` 的文本，尤其「正文会离开本机」这一句怎么写
- [ ] **`.md` 文件关联做不做** — 用户可见能力，且实测抢不到默认程序，只多一个「打开方式」候选（见上节）
- [ ] **是否买代码签名证书** — 花钱。OV/EV 年费几百美元；不买就保留「Windows 已保护你的电脑」这一步
- [ ] **版本号与发布日期** — 推荐 `0.17.0`，日期待定
- [ ] **首发渠道与范围** — GitHub Releases / 官网 / 其它；是否同时发便携 zip

### D. 发布前最后一次门禁（根代理串行跑）

```powershell
npm run build                       # 类型检查 + 打包
npm test                            # 15 个文件、165 条断言
powershell -ExecutionPolicy Bypass -File host\build.ps1
node scripts/host-smoke.mjs         # 5 项断言全 PASS
powershell -ExecutionPolicy Bypass -File packaging\portable.ps1   # zip ≤940,000 B
```

---

## 未验证项

- **Inno Setup 的安装包体积**（估 820,000–860,000 B）：本机无 ISCC，没有实测。要实测需先 `/CURRENTUSER` 静默装一次 Inno Setup 到 `.tmp`。
- **MSIX 体积**（估 1.0–1.2 MB）：本机无 `dotnet` / `MakeAppx`，未实测。
- **GitHub `windows-latest` 是否自带 `csc.exe` 与 WebView2 运行时**：未验证。`host/build.ps1:14` 找不到 `csc.exe` 会 exit 1 并打印原因，第一次 CI 跑就能确认。
- **CI job 时长**（估 3–5 分钟）：不能在本机跑 GitHub runner。
- **`vite watch.ignored` 补 `host/bin` 之后是否真的不再 reload**：没有实测，因为要跑 `host/build.ps1` 重写 `host/bin`，会打断同一台 dev server 上另外两个 finder 的采证。修法本身零风险，验证命令：`New-Item host\bin\probe.txt` 后看 dev server 输出有没有 `page reload`。
- **KaTeX 拆包后的真实体积**：按 `katex.min.js` 的 272,756 B / 76,443 B gzip 折算，没有实编（禁止跑 `npm run build`）。验证：`npx vite build --outDir .tmp/build-ship`。

## 附：本轮证据文件（都在 `.tmp/`，可直接搬走）

| 路径 | 内容 |
| :--- | :--- |
| `.tmp/nsis/nsis-3.11.zip` | NSIS 3.11 官方便携包，2,361,546 B |
| `.tmp/nsis/nsis-3.11/` | 解压后的工具链，7,134,287 B / 441 文件 |
| `.tmp/nsis/proto.nsi` | per-user 原型脚本（ASCII 注释，已验证可编） |
| `.tmp/nsis/Sidelight-0.16.3-win-x64-setup-proto.exe` | **800,098 B** 实测安装包 |
| `.tmp/nsis/proto-d64.nsi` / `proto-ns.nsi` / `proto-bz.nsi` | 三种压缩参数的对照脚本 |
| `.tmp/gitignore-probe/` | `.gitignore` 规则的验证仓库（`git check-ignore` 通过） |
