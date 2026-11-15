# 第 14 轮 · 发布与 CI 发现（finder：ship）

- 范围：tag 触发发布、版本 0.28.0、CI 转必过、macOS Intel/Universal、签名与公证。
- 只读：未改 `src/`、`host/`、`host-mac/`、`.github/`、`package.json`、`README.md`。写过的只有本文件与 `.tmp/r14-ship/`。
- 环境：Windows 11、Node 24、仓库 `D:\Documents\SidelightProgram`，基线 `d941874`（v0.27.0 已发布）。
- 本轮未开浏览器：发布结论不依赖界面，未用 5173/9224。
- 证据取法：本地文件行号、GitHub REST API（2026-11-16 抓取）、Apple 官方支持页、`swift build` 官方参数页、`softprops/action-gh-release` 仓库页。
- 难度记为 S（≤半天）/ M（1–2 天）/ L（>2 天）。

---

## S1 · 没有 tag 触发的发布流程，v0.27.0 的资产是人工上传的

**证据**

- `.github/workflows/` 只有 `ci.yml` 一个文件；`ci.yml` 里没有任何 tag 触发（`ci.yml:1-6`）。`install-verify` 只在手动 dispatch 时跑（`ci.yml:138`）。
- v0.27.0 的四个资产上传者都是 `XuJingye2022`，不是 `github-actions[bot]`；`SHA256SUMS-0.27.0.txt` 307 B 也是手工上传（[Release API](https://api.github.com/repos/XuJingye2022/SideLight/releases/tags/v0.27.0)）。
- 本地 `release/SHA256SUMS.txt` 仍列 0.26.0 两个文件（`release/SHA256SUMS.txt:1-2`），说明校验和靠人手生成、没有跟版本绑定。
- macOS 包只能先在 CI 里构建、下载 artifact，再手工上传（`ci.yml:123-133` 只 `upload-artifact`）。
- `STATE.md:94-95` 明确写「`install-verify` 仅手动 dispatch」，macOS 由 CI 编译。

**影响**

每次发版要人工做六件事：等 CI、下 artifact、打包 Windows、算哈希、传四个文件、写 release 说明。步骤多、无校验、易漏；0.26.0 的数字已经漏进 0.27.0 的 README（见 S4）。macOS 产物还受 artifact 保留期限制。

**建议**

采用下面「release.yml 草案」。要点：构建 job 只上传 artifact；只有一个 release job 写 Release；tag 必须等于 `package.json` 版本；`SHA256SUMS-<版本>.txt` 由流水线生成；release 说明从 `docs/CHANGELOG.md` 抽取，避免第三份文案。

**难度** M（首次接通需要一次 dry-run）。

---

## S2 · `windows-host` / `macos-host` 仍 `continue-on-error`，条件其实已经满足

**证据**

- `ci.yml:42`（windows-host）与 `ci.yml:108`（macos-host）都是 `continue-on-error: true`；注释写「连续 3 次绿后删掉」。
- GitHub Actions API 实测：`ci.yml` 共 10 次运行，8 次 success、2 次 cancelled（并发取消），没有 failure。最新一次 run #10（`d941874`）三个 job 全部 success：`windows-host` 21:00:24→21:01:24、`macos-host` 21:00:24→21:01:21、`gate` 21:00:23→21:00:33；`install-verify` skipped（[runs API](https://api.github.com/repos/XuJingye2022/SideLight/actions/workflows/ci.yml/runs?per_page=10)，实际 URL 见文末证据）。
- 这 8 次绿覆盖了宿主改动：run #4（`14d327d`）、#5（`84da46e`）、#6（`f14bcd3`）、#7/#8（`2204691`）。`continue-on-error` 只影响工作流结论，job 级 `conclusion=success` 说明每一步都真过了，不是空跑。

**转必过的条件（建议）**

1. 直接删两行 `continue-on-error`，与 `gate` 同级；`macos-host` 是 macOS 唯一验证，继续放行等于允许「macOS 编不过也能合并」。
2. 观察窗口：删除后连续 **3 次 `main` 推送**（含至少 1 次触碰 `host-mac/` 或 `host/` 的提交）全绿，且无 flaky 重跑。
3. 反证一次（可选但推荐）：在一个临时分支改坏 `host-mac/build.sh` 的语法或 `host/build.ps1`，确认 CI 变红后还原。没有这一步，无法证明必过门槛真的会拦。
4. 失败处理：转必过后若出现环境性红（runner 镜像升级），当轮内修；连续 2 轮修不好再讨论回退，不要默认加回 `continue-on-error`。

**`install-verify` 是否仍手动**：是，本轮仍手动。理由：它会写 HKCU、开始菜单并静默装卸（`ci.yml:134-177`），只在 `workflow_dispatch` 下跑，运行时间约 1–2 分钟，收益是替掉本地 4 项 UNVERIFIED。等 release.yml 连续 2 次 tag 发布成功后，把它作为 **release.yml 的可选 job**（`needs: windows`）比放进 CI 更合适；不要做成 required check。

**难度** S（改 2 行 + 观察 3 次）。

---

## S3 · macOS 首次打开的说明在 macOS 15+ 已失效；未签名提示不够醒目

**证据**

- `README.md:12` 写「首次打开请右键点 App →「打开」，或执行 `xattr -dr …`」。
- Apple 官方《Safely open apps on your Mac》现在只给一条路径：先尝试打开，然后「系统设置 → 隐私与安全性 → 仍要打开（Open Anyway）」；页面已不再提供右键 Open（[support.apple.com/102445](https://support.apple.com/en-us/102445)）。
- macOS 15 Sequoia 起右键 →「打开」对未公证应用不再出现，Gatekeeper 对话框只剩「移到废纸篓 / 完成」；多个项目的文档迁移记录印证了这一点（[amd/gaia 提交](https://github.com/amd/gaia/commit/24e7584b569d8f7eccbd2422818425d10b687b3e)、[Macworld 2024-09](https://www.macworld.com/article/2457844/what-to-do-when-you-cant-open-an-app-you-just-installed-in-macos-sequoia.html)）。
- `CHANGELOG.md:16` 与 v0.27.0 Release 说明同样只写右键路径，三处一起过时。

**签名/公证的现实边界（无 Apple Developer 账号）**

- 没有付费账号就拿不到 **Developer ID Application** 证书，`notarytool` 无法提交，公证与 `stapler` 都做不了。ad-hoc 签名（`host-mac/build.sh:45` 的 `codesign --force --deep --sign -`）是当前上限：能让 Apple Silicon 启动，不能让 Gatekeeper 放行。
- 免费 Apple ID 的「Personal Team」只用于本机开发签名，不能分发，也不能公证。
- 因此以下目标在拿到账号前不可达：双击直接打开、消除「Apple 无法检查」警告、自动更新签名、Mac App Store。**不要**在文档里把 ad-hoc 写成「已签名」。
- Windows 侧同理：没有代码签名证书，SmartScreen 会拦；README 只写了「没有代码签名」（`README.md:53`），没给「更多信息 → 仍要运行」的操作路径。

**README 建议**

在「下载」标题下加一个 blockquote，把两条系统版本路径写全，并给校验和命令：

```markdown
> **macOS 包未签名、未公证（ad-hoc 签名）。**
> macOS 15 及以上：双击 App，看到警告后到「系统设置 → 隐私与安全性 → 仍要打开」。
> macOS 13–14：右键 App →「打开」→「打开」。
> 也可以在终端执行 `xattr -dr com.apple.quarantine /Applications/Sidelight.app`（先把 App 拖进「应用程序」）。
> 校验下载：`shasum -a 256 Sidelight-<版本>-macos-arm64.zip`，与 Release 里的 `SHA256SUMS-<版本>.txt` 对照。
```

**难度** S（纯文档）。

---

## S4 · README 的版本、体积、校验和已经和 0.27.0 产物不一致；代码块也是坏的

**证据（逐条对照）**

| 位置 | README 写的 | 实际 v0.27.0 | 来源 |
| :--- | :--- | :--- | :--- |
| `README.md:78` | 安装包 817,347 B | 817,242 B | Release API asset `Sidelight-0.27.0-win-x64-setup.exe` size=817242 |
| `README.md:89` | 安装包 817,347 B，SHA256 `FE2EF144…` | 817,242 B，`974A0357…` | 同上；`CHANGELOG.md:15` 也是 974A… |
| `README.md:89` | 便携 zip 899,829 B，`9C18FC9C…` | 899,986 B，`0CEC9036…` | Release API |
| `README.md:53` | 硬编码 `release/Sidelight-0.27.0-win-x64-setup.exe` | 发 0.28.0 后即失效 | — |
| `README.md:121-123` | 第 122 行是 `powershell … verify-installer.ps1`，第 123 行单独一个 ` ``` ` | 第 123 行是**没有开头的闭合围栏**，会把「目录」整节卷进代码块 | 本地按字节核对：`LF=179, CR=0`，`README.md:111` 已闭合 Windows 块 |

- 这四行数字与 `CHANGELOG.md:15`、Release API 三方不一致；`817,347` 与 `FE2EF…` 是 0.26.0 的值（`release/SHA256SUMS.txt:1`）。
- `README.md:78` 与 `README.md:89` 还重复同一组数字，任何一次版本升级都会漏改一处。
- `package-lock.json:3` 与 `package-lock.json:9` 也是 `0.27.0`；只改 `package.json:3` 会让 lock 与清单不一致。

**建议**

1. README 不再写具体字节数与哈希，统一改成「体积与校验和见当次 Release 的 `SHA256SUMS-<版本>.txt` 与 CHANGELOG」。数字只保留在 CHANGELOG，且由打包脚本输出复制，不手抄。
2. `README.md:53` 改成 `release/Sidelight-<版本>-win-x64-setup.exe`。
3. 修围栏：把 `verify-installer.ps1` 那行移进 `README.md:106-111` 的 powershell 块，删掉 `README.md:123` 的孤立 ` ``` `。
4. 版本升级用「版本清单」（见文末）逐项核对；release.yml 的 preflight 会拦住「tag 与 package.json 不一致」，但拦不住 README/CHANGELOG 写错。

**难度** S。

---

## S5 · macOS 只有 arm64；Intel/Universal 可做，但只能算方案，本轮不做

**证据**

- `host-mac/build.sh:12-13` 只跑一次 `swift build -c release`，`host-mac/build.sh:48-51` 用 `uname -m` 命名并 `ditto` 出包；CI 在 arm64 的 `macos-latest` 上跑（`ci.yml:109,123-127`）。
- v0.27.0 的 macOS 资产只有 `Sidelight-0.27.0-macos-arm64.zip`（770,783 B）；`CHANGELOG.md:12` 写「Intel Mac 暂未构建」。
- 实测该包内部构成（下载后解包，`.tmp/r14-ship/`）：Mach-O 主程序 **320,320 B**，`cputype=0x0100000C`（arm64），`Contents/Resources/www` 24 个文件共 **1,434,384 B**，其余（icns、Info.plist、CodeResources）100,265 B；zip 770,783 B。`Info.plist` 的 `LSMinimumSystemVersion` 是 `13.0`。

**可行性**

- 在 arm64 runner 上交叉编译 x86_64 切片，**不需要 Intel runner**。Intel runner 正在退场（具体日期未核实），不要押在它上面。
- 路径 A（一条命令）：`swift build -c release --package-path host-mac --arch arm64 --arch x86_64`，产物在 `.build/apple/Products/Release`。**未验证**：本机是 Windows，没有 Swift；2026-11 抓取的官方 `swift build` 参数页只列 `--triple` / `--sdk`，**没有 `--arch`**（[docs.swift.org swift build](https://docs.swift.org/latest/documentation/packagemanagerdocs/swiftbuild/)）。所以先跑一次 10 分钟的 `workflow_dispatch` 试验；被拒就走路径 B。
- 路径 B（有文档依据，推荐兜底）：分两次构建再合并。
  ```bash
  swift build -c release --package-path host-mac --triple arm64-apple-macosx13.0
  swift build -c release --package-path host-mac --triple x86_64-apple-macosx13.0
  lipo -create host-mac/.build/arm64-apple-macosx/release/SidelightMac \
               host-mac/.build/x86_64-apple-macosx/release/SidelightMac \
               -output "$BIN"
  lipo -archs "$BIN"   # 期望输出：x86_64 arm64
  ```
  `--triple` 是官方参数页列出的选项；两次构建落在不同 `.build/<triple>/` 目录，不会互相覆盖。
- 无论走哪条，`codesign` 必须在 `lipo` **之后**。`host-mac/build.sh` 现在是「复制二进制 → 复制 dist → 签名」，顺序天然正确，改 universal 时不要提前签名。
- 命名：`host-mac/build.sh:48` 的 `uname -m` 在 universal 下会得到 `arm64`，会误导。需加 `--universal` 分支并把资产名改成 `-macos-universal.zip`；`Info.plist` 不用改（不声明 `LSArchitecturePriority`）。

**产物体积（估算，未实测）**

- arm64 主程序 320,320 B；x86_64 切片按 Swift 二进制常见比例估 330–400 KB。
- Mach-O 在 zip 里压缩比约 2–3:1，预计 zip 从 770,783 B 涨到 **0.85–0.95 MB（+10–20%）**。这个量级不触发任何 macOS 体积预算（体积硬线只针对 Windows 安装包，`packaging/installer.ps1:93`）。以 CI 日志里的 `zip=… bytes=…`（`host-mac/build.sh:53`）为准。

**失败风险**

1. `--arch` 在当前 Xcode/SwiftPM 版本被移除或改名（参数页无此项，概率中等）→ 改走路径 B，成本约 15 行脚本。
2. 构建时间约翻倍。当前 macOS job 全程 57 s（21:00:24→21:01:21），翻倍仍远低于 `timeout-minutes: 30`。
3. **x86_64 切片只能证明存在，不能证明能跑**：arm64 runner 上执行 x86_64 需要 Rosetta（GitHub 镜像是否预装未核实）；没有 Intel 真机，Intel 运行仍是 UNVERIFIED。验证方法：CI 里 `lipo -archs` 断言两架构 + 一台真实 Intel Mac 双击自测。
4. 资产改名会波及 README、Release 说明、`SHA256SUMS` 里的文件名；建议这次只加不减：保留 `-macos-arm64.zip`，新增 `-macos-universal.zip`，或者在 CHANGELOG 写明「arm64 包改为 universal」。
5. ad-hoc 签名对 fat 二进制有效，不需要额外 entitlement；不要为 universal 引入 hardened runtime（没有账号时反而增加变量）。

**方案（只给方案，不承诺本轮）**

`host-mac/build.sh` 增加 `--universal`（约 15 行，含 `lipo` 与 `lipo -archs` 断言）→ release.yml 用 `workflow_dispatch` dry-run 出一个 universal zip → 记录体积与 `lipo` 输出 → 下一个版本正式发。**本轮不改**。

**难度** M（脚本 + 一次 CI 试跑）；真机验证成本另算。

---

## release.yml 草案

设计要点：

- 构建 job 只传 artifact，**只有一个 release job 写 Release**，避免两个 job 并发创建同一个 tag 的 Release。
- tag 必须等于 `v` + `package.json` 版本，且 CHANGELOG 有对应小节；否则在 preflight 失败。
- `SHA256SUMS-<版本>.txt` 由流水线生成，不手工。
- Release 说明从 CHANGELOG 抽取，避免第三份文案。
- 重跑幂等：softprops 对已存在的 Release 走更新，`overwrite_files: true` 覆盖同名资产；`concurrency.cancel-in-progress: false` 防止上传中途被取消。
- `softprops/action-gh-release` 用 **v3**：v2.6.2 是最后一个 v2、已停维护，且跑在已弃用的 Node 20 上；v3 跑 Node 24。
- 权限：顶层只读，release job 才给 `contents: write`。
- `workflow_dispatch` 默认 `publish: false`，用于不碰 Release 的 dry-run。

```yaml
# 推送 v* tag 时构建 Windows + macOS，并创建/更新 GitHub Release。
# 失败重试：Actions 里 Re-run failed jobs；全流程幂等，重跑覆盖同名资产。
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      tag:
        description: '已有 tag（例如 v0.28.0）'
        required: true
        type: string
      publish:
        description: '构建后创建/更新 Release（默认只构建，不发布）'
        required: false
        default: false
        type: boolean

concurrency:
  # 同一 tag 串行；绝不取消正在上传的发布
  group: release-${{ inputs.tag || github.ref_name }}
  cancel-in-progress: false

permissions:
  contents: read

env:
  # 与 ci.yml 保持一致，取法见 host/build.ps1 与 packaging/installer.ps1
  WV2_VERSION: 1.0.4314.35
  WV2_SHA256: 90778DEB1B77E36292828B4B5833C9255C27533F40E0DDD55891AE718944EDC4
  NSIS_SHA256: C7D27F780DDB6CFFB4730138CD1591E841F4B7EDB155856901CDF5F214394FA1

jobs:
  preflight:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.tag || github.ref }}
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - id: meta
        name: Tag must match package.json and have a CHANGELOG section
        shell: bash
        run: |
          VERSION="$(node -p "require('./package.json').version")"
          TAG="${{ inputs.tag || github.ref_name }}"
          if [ "v$VERSION" != "$TAG" ]; then
            echo "::error::tag $TAG != package.json v$VERSION"
            exit 1
          fi
          if ! grep -q "^## $VERSION " docs/CHANGELOG.md; then
            echo "::error::docs/CHANGELOG.md 缺少 $VERSION 一节"
            exit 1
          fi
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

  windows:
    needs: preflight
    runs-on: windows-2022
    timeout-minutes: 30
    defaults:
      run:
        shell: pwsh
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.tag || github.ref }}
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build

      - name: Cache WebView2 SDK / NSIS
        uses: actions/cache@v4
        with:
          path: |
            .tmp/wv2
            .tmp/nsis
          key: tools-wv2-${{ env.WV2_VERSION }}-nsis-3.11

      - name: Fetch WebView2 SDK (pinned, 3 attempts)
        run: |
          New-Item -ItemType Directory -Force .tmp | Out-Null
          if (-not (Test-Path .tmp/wv2/lib/net462/Microsoft.Web.WebView2.Core.dll)) {
            for ($i = 1; $i -le 3; $i++) {
              try {
                Invoke-WebRequest -Uri "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$env:WV2_VERSION" -OutFile .tmp/wv2.zip -UseBasicParsing
                break
              } catch {
                if ($i -eq 3) { throw }
                Start-Sleep -Seconds (5 * $i)
              }
            }
            $h = (Get-FileHash .tmp/wv2.zip -Algorithm SHA256).Hash
            if ($h -ne $env:WV2_SHA256) { throw "WebView2 SDK hash mismatch: $h" }
            Expand-Archive .tmp/wv2.zip .tmp/wv2 -Force
          }

      - name: Fetch NSIS 3.11 (pinned, vendored asset, 3 attempts)
        run: |
          if (-not (Test-Path .tmp/nsis/nsis-3.11.zip)) {
            New-Item -ItemType Directory -Force .tmp/nsis | Out-Null
            for ($i = 1; $i -le 3; $i++) {
              try {
                Invoke-WebRequest -Uri 'https://github.com/XuJingye2022/SideLight/releases/download/v0.26.0/build-tools-nsis-3.11.zip' -OutFile .tmp/nsis/nsis-3.11.zip -UseBasicParsing
                break
              } catch {
                if ($i -eq 3) { throw }
                Start-Sleep -Seconds (5 * $i)
              }
            }
          }
          $h = (Get-FileHash .tmp/nsis/nsis-3.11.zip -Algorithm SHA256).Hash
          if ($h -ne $env:NSIS_SHA256) { throw "NSIS hash mismatch: $h" }
          Expand-Archive .tmp/nsis/nsis-3.11.zip .tmp/nsis -Force

      - name: Build host
        run: powershell -ExecutionPolicy Bypass -File host/build.ps1

      - name: Host smoke (window / argv / single instance)
        run: node scripts/host-smoke.mjs

      - name: Build NSIS installer (enforces 850000 B hard line)
        run: powershell -ExecutionPolicy Bypass -File packaging/installer.ps1

      - name: Build portable zip (enforces 940000 B threshold)
        run: powershell -ExecutionPolicy Bypass -File packaging/portable.ps1

      - name: List release artifacts
        run: |
          Get-ChildItem release/Sidelight-* | Select-Object Name, Length | Format-Table
          Get-ChildItem release/Sidelight-* | ForEach-Object {
            '{0}  {1}' -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash, $_.Name
          }

      - uses: actions/upload-artifact@v4
        with:
          name: Sidelight-windows
          path: |
            release/Sidelight-*-win-x64-setup.exe
            release/Sidelight-*-win-x64-portable.zip
          if-no-files-found: error
          retention-days: 7

  macos:
    needs: preflight
    runs-on: macos-latest
    timeout-minutes: 30
    defaults:
      run:
        shell: bash
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.tag || github.ref }}
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build

      - name: Build macOS app (swift build + .app + zip)
        run: bash host-mac/build.sh

      - name: Verify version, arch, signature
        run: |
          APP=.tmp/mac/Sidelight.app
          /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist"
          lipo -archs "$APP/Contents/MacOS/SidelightMac"
          codesign -dv --verbose=2 "$APP" 2>&1 | grep -E 'Identifier|Signature|TeamIdentifier' || true

      - name: Self-test (start server, GET /__doc)
        run: ./.tmp/mac/Sidelight.app/Contents/MacOS/SidelightMac --self-test

      - uses: actions/upload-artifact@v4
        with:
          name: Sidelight-macos
          path: release/Sidelight-*-macos-*.zip
          if-no-files-found: error
          retention-days: 7

  release:
    # 只有 tag push，或手动 dispatch 且 publish=true 时才写 Release
    needs: [preflight, windows, macos]
    if: ${{ github.event_name == 'push' || inputs.publish }}
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.tag || github.ref }}

      - uses: actions/download-artifact@v4
        with:
          path: release
          pattern: Sidelight-*
          merge-multiple: true

      - name: Generate SHA256SUMS-<version>.txt
        shell: bash
        run: |
          VERSION="${{ needs.preflight.outputs.version }}"
          cd release
          ls -l
          sha256sum Sidelight-* > "SHA256SUMS-${VERSION}.txt"
          cat "SHA256SUMS-${VERSION}.txt"

      - name: Extract release notes from CHANGELOG
        shell: bash
        run: |
          mkdir -p .tmp
          VERSION="${{ needs.preflight.outputs.version }}"
          awk -v v="$VERSION" '
            index($0, "## " v " ") == 1 { on = 1; next }
            on && index($0, "## ") == 1 { exit }
            on { print }
          ' docs/CHANGELOG.md | sed '/./,$!d' > .tmp/release-notes.md
          if [ ! -s .tmp/release-notes.md ]; then
            echo "::error::无法从 CHANGELOG 提取 $VERSION"
            exit 1
          fi
          head -5 .tmp/release-notes.md

      # v3：v2.6.2 是最后一个 v2，已停维护且跑在弃用的 Node 20 上
      - uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ inputs.tag || github.ref_name }}
          name: Sidelight ${{ needs.preflight.outputs.version }} — Windows + macOS
          body_path: .tmp/release-notes.md
          files: |
            release/Sidelight-*-win-x64-setup.exe
            release/Sidelight-*-win-x64-portable.zip
            release/Sidelight-*-macos-*.zip
            release/SHA256SUMS-*.txt
          fail_on_unmatched_files: true
          overwrite_files: true
          make_latest: true
```

**为什么这样能避免重复上传**

1. 构建 job 没有 `contents: write`，不可能创建 Release；只有 release job 一个写者。
2. 同一 tag 的两次运行被 concurrency 串行化，且 `cancel-in-progress: false`，不会出现「上传到一半被新 run 取消」。
3. softprops v2+ 对已存在的 tag Release 走 update；`overwrite_files` 默认就是 true，草案里显式写出。重跑四条资产全部覆盖，条数不增。
4. `fail_on_unmatched_files: true`：任何一个包缺失就整步失败，不会发出只有一半资产的 Release。
5. 资产名保持不变就不会产生多余旧文件；若改名（如 arm64 → universal），旧资产不会自动删除，需在 Release 页面手工删，或先发 draft 再改。

**失败重试**：构建失败用 Actions 的 Re-run failed jobs；下载步骤内置 3 次退避；工具走 cache；Release 步骤失败重跑该 job 即可收敛。没有引入第三方 retry action。

---

## 版本清单（0.27.0 → 0.28.0）

### 需要改的位置

| 文件:行 | 现在 | 改成 | 说明 |
| :--- | :--- | :--- | :--- |
| `package.json:3` | `"version": "0.27.0"` | `"0.28.0"` | 唯一版本源 |
| `package-lock.json:3` | `"version": "0.27.0"` | `"0.28.0"` | npm 11 的 lockfile v3 顶层 |
| `package-lock.json:9` | `"version": "0.27.0"` | `"0.28.0"` | `packages[""]` 里还有一份 |
| `docs/CHANGELOG.md:5` 之前 | 无 0.28.0 | 新增一节（草稿见下） | 日期 2026-11-16 |
| `README.md:12` | 右键 →「打开」 | 系统设置 → 隐私与安全性 → 仍要打开 | macOS 15+ 唯一路径 |
| `README.md:13` | Intel Mac 暂未构建 | 本轮仍只提供 arm64 | 不要承诺 universal |
| `README.md:53` | `Sidelight-0.27.0-win-x64-setup.exe` | `Sidelight-<版本>-win-x64-setup.exe` | 去掉硬编码版本 |
| `README.md:78` | 817,347 B | 删数字，链到 Release/CHANGELOG | 与 0.27.0 不符 |
| `README.md:89` | 817,347 B / FE2EF… / 9C18… | 删数字与哈希，链到 `SHA256SUMS-<版本>.txt` | 0.26.0 残留 |
| `README.md:121-123` | 孤立 ` ``` ` + 裸命令 | 合进 `README.md:106-111` 的 powershell 块 | 渲染错位 |
| `README.md:96` | 16 个文件、205 条 | 按当轮 `npm test` 输出改 | 若测试数变化 |
| git tag | 已有 `v0.26.0`、`v0.27.0` | 新增 `v0.28.0` | 由人推，不由 finder 推 |

不需要改：`host-mac/Info.plist` 用 `__VERSION__` 占位（`host-mac/build.sh:18` 替换）；`packaging/installer.ps1:9`、`packaging/portable.ps1:13` 从 `package.json` 读版本；NSIS 通过 `/DAPPVERSION` 注入（`installer.ps1:60`）。

### CHANGELOG 0.28.0 草稿

> 下面凡 `〈…〉` 都是实施后按实测填的空位；本轮还没实施，不要把占位符原样提交。

```markdown
## 0.28.0 — 2026-11-16

发布自动化：推送 tag 由 CI 出包并创建 Release。

- 发布：新增 `.github/workflows/release.yml`。推送 `v*` tag 时构建 Windows 安装包/便携包与 macOS arm64 包，生成 `SHA256SUMS-0.28.0.txt`，由 `softprops/action-gh-release@v3` 创建/更新 Release；重跑覆盖同名资产，不产生重复。
- 发布前校验：tag 必须等于 `v` + `package.json` 版本，`docs/CHANGELOG.md` 必须有对应小节；不满足则流水线在 preflight 失败。
- 发布说明：Release 正文从 CHANGELOG 抽取，不再手写第三份。
- CI：`windows-host` 与 `macos-host` 去掉 `continue-on-error`，转为必过。
- 首次使用：〈按实际改动填 1–3 条；没有就删本行〉。
- 侧栏：〈tablist / 展开态 / 空文件夹提示：做了哪条写哪条；延后的写明原因与预算〉。
- 首屏 gzip 〈实测〉 B（≤285,000，余 〈实测〉 B）。
- 测试 16 个文件 〈实测〉 条；版本 0.28.0。
- 产物：Windows 安装包 **〈B〉**（SHA256 `〈…〉`）、Windows 便携 zip **〈B〉**（`〈…〉`）、macOS arm64 zip **〈B〉**（`〈…〉`）。
- macOS 包**未签名、未公证**，仅 arm64，要求 macOS 13+；macOS 15 及以上首次打开走「系统设置 → 隐私与安全性 → 仍要打开」。
- 未验：release.yml 首跑、macOS 15 真机打开路径、Intel/Universal（只给方案，未实施）。
```

### 发版顺序（给 releaser）

1. 改 `package.json` + `package-lock.json` 两处版本。
2. 写 CHANGELOG 一节（日期 2026-11-16，数字留到构建后回填）。
3. 跑 `npm run build`、`npm test`（根代理串行跑，见 `STATE.md:111`）。
4. 修 README 四类问题（S3、S4）。
5. commit，推 `main`；等 CI 三个 job 绿。
6. `git tag v0.28.0 && git push origin v0.28.0`（**由人执行**，finder 不推）。
7. 看 Release workflow 的 preflight、windows、macos；先跑一次 `workflow_dispatch` + `publish=false` 做 dry-run 更稳。
8. Release 生成后核对四条资产与 `SHA256SUMS-0.28.0.txt`，回填 CHANGELOG 的字节数与哈希，commit 一次文档修正。

---

## 优化机会（最多 3 条）

**O1 · 把 Windows 构建步骤抽成可复用工作流**

`ci.yml:37-104` 与 release.yml 草案有约 10 个重复步骤（checkout、npm、cache、两个下载、host build、smoke、installer、upload）。以后改 SDK 版本或哈希要改两处，容易漂移。建议抽 `.github/workflows/_build-windows.yml`（`on: workflow_call`）或 `.github/actions/build-windows` 复合 action，CI 与 Release 都调用。成本：一次重构 + 两条流水线各跑绿一次。建议在 release.yml 首跑绿之后做，别同时改两件事。

**O2 · Actions 版本落后于当前大版本**

实测最新 release：`actions/checkout` v7.0.1、`actions/setup-node` v7.1.0、`actions/cache` v6.1.0、`actions/upload-artifact` v7.0.2；仓库用的是 v4（`ci.yml:26,47,56,100`）。Node 20 runtime 已被 GitHub 弃用，softprops 的 v2 就是因为这个停维护。逐个升、读 changelog，先升 checkout/setup-node（风险低），upload-artifact 的 v4→v7 有行为变化，单独一轮验证。

**O3 · 体积与校验和有三个来源，收敛成一个**

现在是：打包脚本打印（`installer.ps1:86-91`、`portable.ps1:62-66`）、本地 `release/SHA256SUMS.txt`、README 与 CHANGELOG 手抄。已经出现 0.26.0 数字留在 README 的事故。建议：workflow 生成 `SHA256SUMS-<版本>.txt` 作为唯一校验和来源；README 只链到 Release；CHANGELOG 的数字从打包日志复制，并在 preflight 之后由脚本回填。附带把 `release/SHA256SUMS.txt` 从仓库工作区删掉或加进 `.gitignore`（`release/` 本来就不进版本控制，`gitignore:12`）。

---

## 证据附录

- 仓库文件：`.github/workflows/ci.yml:42,108,134-177`；`host-mac/build.sh:12-13,45,48-53`；`packaging/installer.ps1:9,60,80,93`；`packaging/portable.ps1:13-14`；`package.json:3`；`package-lock.json:3,9`；`README.md:12,13,53,78,89,96,106-123`；`docs/CHANGELOG.md:5-16`；`docs/iteration/STATE.md:86-97,111`；`release/SHA256SUMS.txt`（本地未跟踪）。
- v0.27.0 Release 资产与大小：<https://api.github.com/repos/XuJingye2022/SideLight/releases/tags/v0.27.0>（setup 817,242 B / `974a0357…`；portable 899,986 B / `0cec9036…`；macos-arm64 770,783 B / `259addf2…`；SHA256SUMS 307 B；上传者 `XuJingye2022`）。
- CI 运行史与 job 结论：`GET /repos/XuJingye2022/SideLight/actions/workflows/ci.yml/runs?per_page=10`，以及 `GET /repos/XuJingye2022/SideLight/actions/runs/43761185814/jobs`（2026-11-16 抓取）。
- macOS 包实测：下载 v0.27.0 的 arm64 zip 解包到 `.tmp/r14-ship/app/`，主程序 320,320 B，`magic=0xFEEDFACF cputype=0x0100000C`（arm64），`www` 1,434,384 B / 24 文件。
- Apple：<https://support.apple.com/en-us/102445>（未公证应用的唯一放行路径是「系统设置 → 隐私与安全性 → 仍要打开」）。
- macOS 15 右键 Open 失效的旁证：<https://github.com/amd/gaia/commit/24e7584b569d8f7eccbd2422818425d10b687b3e>、<https://www.macworld.com/article/2457844/what-to-do-when-you-cant-open-an-app-you-just-installed-in-macos-sequoia.html>。
- `swift build` 参数：<https://docs.swift.org/latest/documentation/packagemanagerdocs/swiftbuild/>（列 `--triple` / `--sdk` / `--show-bin-path`，未列 `--arch`）。
- `softprops/action-gh-release`：<https://github.com/softprops/action-gh-release>（v2.6.2 为最后 v2、Node 20 已弃用；v3 用 Node 24；`overwrite_files` 默认 true；`contents: write`）。
