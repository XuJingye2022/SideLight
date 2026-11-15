# 第 15 轮 · 发布视角发现：macOS Universal 包与签名/公证

**状态**：本机是 Windows，无 macOS、无 Swift、无 Apple 证书。下文所有 CI 行为**未执行**，证据来自三处：仓库文件与行号、SwiftPM 上游源码、Apple/GitHub 官方文档。已在本机做过的只有读文件与下载发布资产测量（第 14 轮留下的数字）。

**一句话结论**：Universal 用 `--triple` 跑两次 `swift build` 再 `lipo -create`，这是唯一有文档依据的可靠写法；`--arch` 存在但被隐藏、且强切 Swift Build，只能当试验。签名/公证的坑不在命令，而在顺序（先签 → 再 zip → 公证 → staple `.app` → 重打 zip）与 secrets 的存在性判断（`if` 里不能写 `secrets`）。

---

## S1 · Universal 构建：`--triple` 两次 + `lipo` 是可靠写法，`--arch` 只是隐藏选项

### 证据

1. 现在的 `host-mac/build.sh` 只跑一次构建，并按 `uname -m` 命名：
   - `host-mac/build.sh:12-13`：`swift build -c release --package-path "$HOST"`，然后 `--show-bin-path` 取二进制。
   - `host-mac/build.sh:45`：ad-hoc 签名 `codesign --force --deep --sign -`。
   - `host-mac/build.sh:48-51`：`ARCH="$(uname -m)"`，zip 名 `Sidelight-${VERSION}-macos-${ARCH}.zip`。
   - 在 arm64 runner 上 `uname -m` 恒为 `arm64`，所以 universal 包若沿用这段，名字会骗人。
2. 产物结构（第 14 轮下载 v0.27.0 资产实测，`docs/iteration/round-14/findings-ship.md:120`）：主程序 **320,320 B**（`cputype=0x0100000C`，arm64）、`Contents/Resources/www` 24 个文件 **1,434,384 B**、其余（icns、Info.plist、CodeResources）**100,265 B**、zip **770,783 B**。`LSMinimumSystemVersion` 是 `13.0`（`host-mac/Info.plist:21-22`）。
3. `swift build` 的官方参数页列了 `--triple=<triple>` 与 `--scratch-path=<scratch-path>`，**没有** `--arch`：[docs.swift.org · swift build](https://docs.swift.org/latest/documentation/packagemanagerdocs/swiftbuild/)。
4. `--arch` 并非不存在，而是被标为隐藏：
   - SwiftPM 源码 `Sources/CoreCommands/Options.swift:551-559`：`@Option(name: .customLong("arch"), help: ArgumentHelp("Build the package for the specified architectures.", visibility: .hidden))`，`public var architectures: [String] = []`。
   - 同一文件 `Options.swift:650-657`：`case .native: return self.architectures.count > 1 ? .swiftbuild : .native`。**多架构会强制切到 Swift Build/Xcode 系构建系统**。
   - 源码镜像：<https://github.com/swiftlang/swift-package-manager/blob/main/Sources/CoreCommands/Options.swift>。
5. 第三方实践：2024-10 Swift 论坛帖仍在用 `swift build -c release --arch x86_64 --arch arm64`，且报的是**外部 system library 链接**问题，不是参数被拒（<https://forums.swift.org/t/swiftpm-compile-multiple-arch-system-library/75724/3>）。本仓库零外部依赖，链接风险低，但仍是隐藏参数。
6. 现有 CI 的 mac 任务只有 57 s（第 14 轮记录，`docs/iteration/round-14/findings-ship.md:147`），双构建有充足预算（`release.yml:109` 是 `timeout-minutes: 30`）。

### 推荐写法（A 方案，写进 `build.sh`）

```bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$ROOT/host-mac"
SCRATCH="$ROOT/.tmp/mac/swift-build"          # 放 .tmp，避免在仓库里留 host-mac/.build
ARM_TRIPLE="arm64-apple-macosx13.0"           # 与 Package.swift .macOS(.v13) 对齐
X86_TRIPLE="x86_64-apple-macosx13.0"

build_one() {                                  # $1=triple  $2=scratch 子目录
  # 编译输出走 stderr，否则会被下面的 $(...) 一起吃进去
  swift build -c release --package-path "$HOST" --triple "$1" --scratch-path "$2" >&2
  # --show-bin-path 只打印路径；用 tail -1 防止警告混进返回值
  swift build -c release --package-path "$HOST" --triple "$1" --scratch-path "$2" \
    --show-bin-path | tail -n 1
}

ARM_DIR="$(build_one "$ARM_TRIPLE" "$SCRATCH/arm64")"
X86_DIR="$(build_one "$X86_TRIPLE" "$SCRATCH/x86_64")"
ARM_BIN="$ARM_DIR/SidelightMac"
X86_BIN="$X86_DIR/SidelightMac"

# 单架构断言（错 arch 立刻停，不要等到 lipo）
[ "$(lipo -archs "$ARM_BIN")" = "arm64" ]  || { echo "arm64 slice bad"; exit 1; }
[ "$(lipo -archs "$X86_BIN")" = "x86_64" ] || { echo "x86_64 slice bad"; exit 1; }

BIN="$ROOT/.tmp/mac/SidelightMac.universal"
rm -f "$BIN"
lipo -create "$ARM_BIN" "$X86_BIN" -output "$BIN"

# 合并断言：顺序不保证，排序后比较
ARCHS="$(lipo -archs "$BIN" | tr ' ' '\n' | sort | tr '\n' ' ')"
[ "$ARCHS" = "arm64 x86_64 " ] || { echo "universal archs=[$ARCHS]"; exit 1; }
lipo -archs "$BIN"                 # 期望：x86_64 arm64（顺序可变）
file "$BIN"                        # Mach-O universal binary with 2 architectures
xcrun vtool -show-build -arch x86_64 "$BIN" | grep 'minos' || true   # 期望 minos 13.0
```

之后保持现有顺序不变：`cp "$BIN" "$APP/Contents/MacOS/SidelightMac"`（`build.sh:17`）→ 复制 `dist` → 图标 → `codesign`（`build.sh:45`）→ `ditto` 出 zip。

**顺序红线**：`lipo` 必须在 `codesign` 之前。`lipo -create` 产出的文件没有签名；先签名再 lipo 会得到一个「签名与内容不符」的包，公证会直接拒（TN2206 也写了「签名会修改主可执行文件」）。

### `--arch` 对比（B 方案，只建议做一次 dispatch 试验）

| 维度 | A：`--triple` ×2 + `lipo` | B：`--arch arm64 --arch x86_64` |
| --- | --- | --- |
| 官方文档 | `--triple` 在参数页上 | 参数页没有；源码里 `visibility: .hidden` |
| 构建系统 | native（默认） | 多架构时强制 Swift Build（`Options.swift:650-657`） |
| 产物路径 | 由 `--show-bin-path` 给出（`<scratch>/<triple>/release` 一类布局，别硬编码） | 据第 14 轮记录是 `.build/apple/Products/Release`；**未实测** |
| 失败面 | 两次编译、`lipo` 参数、triple 拼写 | 隐藏参数 + 构建系统是否可用 + 路径语义，任一处变化都无文档兜底 |
| 耗时 | 约 2 倍编译（当前整 job 57 s） | 约 2 倍编译 |
| 建议 | **本轮用 A** | 用 `workflow_dispatch` 花 10 分钟试一次，成功也不换主线 |

`swift build -c release --package-path host-mac --arch arm64 --arch x86_64` 与 `... --show-bin-path` 都加上 `--arch` 时才自洽；这个参数不写进脚本，只记在报告里。

### 产物体积预估（未实测）

- 只有 Mach-O 会被复制成两份；`www` 与 icns 只有一份。
- 目前 arm64 切片 320,320 B。x86_64 切片按同源 Swift 代码常见比例估 **300–420 KB**；`lipo` 再加 fat 头与 16 KB 对齐填充，约 **+320–440 KB** 未压缩。
- 现状：未压缩约 1,854,969 B → zip 773,067 B（压缩比 ≈0.417）。新增的 Mach-O 压缩率更高，估 zip **0.88–0.95 MB（+15–22%）**。
- 没有任何 macOS 体积预算拦它：`packaging/installer.ps1:91-93` 的 850,000 B 硬线只算 Windows 安装包。
- 以 CI 日志为准：`build.sh:53` 的 `zip=<path> bytes=<n>`；建议同时打印 `shasum -a 256`。

### 影响与难度

- 影响：Intel Mac 从「不能用」变成「能下载」。README `README.md:13`「Intel Mac 暂未构建」必须改。
- 难度：**M**（脚本约 25 行 + 1 次 CI 验证）。真实 Intel 运行仍是 UNVERIFIED（见 R1）。

---

## S2 · codesign 与公证：命令不难，顺序和凭据才难

### 流程（建议独立成 `host-mac/sign.sh`，只在 release workflow 里调）

```bash
# 0) 入参：APP=.tmp/mac/Sidelight.app，VERSION，ZIP=release/Sidelight-$VERSION-macos-universal.zip
# 1) 临时 keychain（密码现生成，不落 secrets）
KEYCHAIN="$RUNNER_TEMP/sidelight.keychain-db"
KPASS="$(openssl rand -hex 16)"
security create-keychain -p "$KPASS" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KPASS" "$KEYCHAIN"
security list-keychains -d user -s "$KEYCHAIN" $(security list-keychains -d user | tr -d '"')
printf '%s' "$APPLE_CERT_P12_BASE64" | base64 -d > "$RUNNER_TEMP/cert.p12"   # BSD base64 用 -d/-D
security import "$RUNNER_TEMP/cert.p12" -k "$KEYCHAIN" -P "$APPLE_CERT_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KPASS" "$KEYCHAIN"
security find-identity -v -p codesigning "$KEYCHAIN"     # 必须有 1 valid identities

# 2) 签名（不要 --deep：本 app 没有嵌套代码）
codesign --force --options runtime --timestamp \
  --sign "Developer ID Application: <名字> (<TEAMID>)" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
codesign -dv --verbose=4 "$APP" 2>&1 | grep -E 'Authority|TeamIdentifier|Timestamp|Runtime'

# 3) 提交用的 zip（.app 不能直接上传）
ditto -c -k --sequesterRsrc --keepParent "$APP" "$RUNNER_TEMP/notarize.zip"

# 4) 公证。用 tee 抓输出，断言 Accepted；失败时拉日志
set +e
OUT="$(xcrun notarytool submit "$RUNNER_TEMP/notarize.zip" \
  --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" --wait 2>&1 | tee /dev/stderr)"
printf '%s' "$OUT" | grep -q 'status: Accepted' || {
  ID="$(printf '%s' "$OUT" | awk '/^ *id:/{print $2; exit}')"
  xcrun notarytool log "$ID" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" || true
  exit 1
}
set -e

# 5) staple 到 .app（不能 staple zip）
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl -a -t exec -vv "$APP"            # 期望 accepted / source=Notarized Developer ID

# 6) staple 之后重新出发布 zip，覆盖 build.sh 的 ad-hoc 包
rm -f "$ZIP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
echo "zip=$ZIP bytes=$(stat -f%z "$ZIP") sha256=$(shasum -a 256 "$ZIP" | cut -d' ' -f1)"

# 7) 清理
security delete-keychain "$KEYCHAIN"
```

### 依据（一手链接）

- 公证的前置条件（缺一即拒）：Developer ID 证书、hardened runtime、secure timestamp、无 `get-task-allow`、SDK 10.9+ —— <https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution>。
- `.app` 不能直接上传，必须先压缩；公证服务接受 **ZIP、UDIF 磁盘映像、flat 安装包**；`notarytool submit … --wait`；Apple ID 走 **App 专用密码** —— <https://developer.apple.com/documentation/security/customizing-the-notarization-workflow>。
- 原文：「While you can notarize a ZIP archive, you can't staple to it directly. Instead, run stapler against each item that you added to the archive. Then create a new ZIP file containing the stapled items for distribution.」同一页。这就是 R2 的依据。
- 嵌套代码要逐个签、主 app 最后签；不要把 `--deep` 当分发签名手段 —— <https://developer.apple.com/documentation/Xcode/using-the-latest-code-signature-format>。
- 验证口径：`codesign --verify --deep --strict --verbose=2` 模仿 Gatekeeper；`spctl -a -t exec -vv` —— TN2206 <https://developer.apple.com/library/archive/technotes/tn2206/_index.html>。
- `stapler` 走 CloudKit，需访问 Apple 列出的 IP 段（443）。GitHub 托管 runner 有出网，私有网络需放行。

### 凭据（secrets 全表见附录 B，此处只给判断）

- 证书是 **Developer ID Application**，不是 Apple Development / Mac Distribution。（Apple 明确写了不要用 ad-hoc、Apple Developer、本地开发证书。）
- 需要付费 Apple Developer Program。这是「要花钱」，按 `AGENTS.md` 必须回到产品负责人；本轮默认不买，走降级分支。
- p12 里必须含私钥；base64 后约 5 KB，远低于 GitHub 单 secret 48 KB 上限（<https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets>）。

### 没有 secrets 时（降级分支）

1. `host-mac/build.sh` 保持 ad-hoc：`codesign --force --deep --sign -`（`build.sh:45`）。**不要**给 ad-hoc 加 `--options runtime`：没有 Developer ID，hardened runtime 换不来任何用户可见好处，只增加变量。
2. workflow 里所有签名/公证步骤一律 `if: env.HAS_APPLE_SIGNING == 'true'`（原因见 R6）。
3. 明确标注「未签名」的位置：`$GITHUB_STEP_SUMMARY` 写一行；Release 说明用 `append_body`（`softprops/action-gh-release` 支持，v3 `action.yml:60`）按 job 输出拼一句；README 下载节写当前状态（`README.md:12-13` 已有未签名提示，只需把 arm64 改成 universal）。
4. 资产名保持不变：`Sidelight-<版本>-macos-universal.zip`。签名与否不写进文件名，避免 glob 与校验和分叉。

---

## S3 · release.yml 改造：改 macos-build 一处，release 几乎不用动

### 判断

- `macos-build`（`release.yml:106-133`）只改三处：加 secrets→env 的映射、加一个 universal 断言步骤、加可选签名步骤；`timeout-minutes: 30` 提到 `45`（公证多数 5 分钟内，98% 在 15 分钟内，Apple 文档）。
- `release` job（`release.yml:135-172`）**不改 glob**：`find artifacts -type f \( -name '*.exe' -o -name '*.zip' \)`（:155）与 `files: out/*.zip`（:169）都会自动带上 universal zip；`SHA256SUMS-<版本>.txt`（:157-159）自动包含新文件名。
- `softprops/action-gh-release@v3` 的 `overwrite_files: true`（:171）够用：同名资产重跑会覆盖。**但它不会删除改名后的旧资产**。新 tag `v0.29.0` 不受影响；只有对旧 tag 重跑 publish 才会同时留 `-macos-arm64.zip` 和 `-macos-universal.zip`（见 R8）。
- `preflight`（`release.yml:33-53`）不用改：它只校验 tag = `package.json` = CHANGELOG 小节 `## <版本> — `。

### 需要注意的两点

1. **`if:` 里不能写 `secrets.*`**。GitHub 官方文档：「Secrets cannot be directly referenced in `if:` conditionals. Instead, consider setting secrets as job-level environment variables, then referencing the environment variables to conditionally run steps in the job.」写错不是步骤失败，而是整个 workflow 解析失败（`startup_failure`，没有 job、没有日志）。正确形态：

```yaml
  macos-build:
    runs-on: macos-latest
    timeout-minutes: 45
    env:
      # 只为存在性判断，不打印
      HAS_APPLE_SIGNING: ${{ secrets.APPLE_CERT_P12_BASE64 != '' && secrets.APPLE_ID != '' && secrets.APPLE_APP_SPECIFIC_PASSWORD != '' }}
    steps:
      # …
      - name: Import Developer ID certificate
        if: env.HAS_APPLE_SIGNING == 'true'
      - name: Sign, notarize, staple
        if: env.HAS_APPLE_SIGNING == 'true'
```

2. **签名后要再跑一次 `--self-test`**。hardened runtime 会改变进程行为，现有 self-test 只验「起服务 + GET `__doc`」（`SelfTest.swift:6-57`），它不创建 WKWebView，所以只能证明二进制能加载。跑两遍（签名前、staple 后）成本约 2 s，能提前拦住「签名把启动搞坏」这一类。

具体改动清单见附录 C。

---

## S4 · 风险

| # | 风险 | 证据 | 影响 | 缓解 |
| --- | --- | --- | --- | --- |
| **R1** | arm64 runner 上无法执行 x86_64 切片，self-test 只证明 arm64 能跑 | `release.yml:125-126` 直接执行 `.app/Contents/MacOS/SidelightMac`；runner 镜像说明（`macos-15-arm64-Readme.md`，image 20261104，macOS 15.8.2 / Xcode 16.4 默认）全文未提 Rosetta，**是否预装未核实** | Intel 用户下载到「含 x86_64 但没人跑过」的包 | 必做：`lipo -archs` 断言两架构 + `codesign --verify --deep --strict`（两切片同一签名）+ `vtool -show-build -arch x86_64` 断言 minos 13.0。可选探针（**不判失败**）：`arch -x86_64 "$BIN" --self-test`，失败就说明无 Rosetta，不算红。真机 Intel 运行保持 UNVERIFIED |
| **R2** | 公证与 zip/stapler 的顺序 | Apple：可以公证 ZIP，但**不能 staple zip**；要 staple 归档里的每一项，再重新打 zip | 顺序错 → `stapler` 报错（Error 65 一类），或发出一个没贴票据的 zip：首启要联网，离线机器 Gatekeeper 可能拒绝 | 固定顺序：签 → zip → submit → staple `.app` → `stapler validate` → 重打 zip。发布 zip 必须是 staple 之后的 |
| **R3** | 公证拒绝：缺 hardened runtime / 缺 timestamp / 用了非 Developer ID 证书 | Apple 前置条件页；`build.sh:45` 现在是纯 ad-hoc，没有 `--options runtime`、`--timestamp` | 整条 release 卡在 submit | 签名命令固定 `--force --options runtime --timestamp`；`codesign -dv` 里 grep `Runtime`/`Timestamp`；证书类型在建 secret 前先 `security find-identity` 确认 |
| **R4** | arm64 runner 上的临时 keychain 有已知坑 | actions/runner-images #13476「Locally created keychain can't be unlocked on macos-14-arm」：macOS 14/15 arm64 镜像上 `security create-keychain` 后解锁报 `The user name or passphrase you entered is not correct`；2026-03-27 关闭（标记 completed），本次镜像 20261104 在修复之后 | `security import` 或 `codesign` 失败（`errSecInternalComponent`、找不到 identity） | 按 S2 的顺序做；失败时降级到登录钥匙串：`security import … -k login.keychain-db`。先跑一次 `find-identity` 再签名，早失败早定位 |
| **R5** | Universal 体积 | 见 S1 估算：zip 约 0.88–0.95 MB（+15–22%） | 下载稍慢；不进任何预算线 | 记录 CI 日志实际字节；CHANGELOG/STATE 写实测值，不写估算 |
| **R6** | secrets 写进 `if:` 会让 workflow 解析失败 | GitHub 文档（同上）；`secrets` 上下文不在 `if` 的可用列表里 | 整个 Release workflow `startup_failure`，tag 推了但什么都没发 | 用 job 级 `env` + `if: env.HAS_APPLE_SIGNING == 'true'`，见 S3 |
| **R7** | hardened runtime 对 WKWebView **真实 GUI** 的影响没人验过 | 现有 self-test 不创建 WebView（`SelfTest.swift:6-57`）；本机无 macOS | 可能出现「CI 全绿、用户打不开」 | 现阶段只能标 UNVERIFIED；下一轮找一台真 Mac 跑一次签名包 GUI（拖放/IME 一起看）。self-test 加签名前后两跑只能挡启动级问题 |
| **R8** | 资产改名留下旧文件 | `overwrite_files` 只覆盖同名；`release.yml:171` | 对旧 tag 重跑 publish 会同时出现 arm64 与 universal 两个 zip，用户会下错 | 新 tag 发布不受影响；若要重发旧 tag，先手工删旧资产。可选：release job 末尾 `gh release view --json assets` 断言资产数 = 4 |
| **R9** | 没有证书时的首次打开提示 | `README.md:12`：macOS 15 起右键「打开」可能失效，要走系统设置或 `xattr -dr com.apple.quarantine` | 未签名包的用户流失 | 本轮只改文案（arm64 → universal），签名上线后再删这段；不要提前承诺「已公证」 |
| **R10** | 公证配额与耗时 | Apple：每天上限 75 次公证；多数 5 分钟内，98% 在 15 分钟内；`stapler` 依赖 CloudKit 出网 | 反复重跑 tag 会消耗配额；job 超时 | `timeout-minutes: 45`；失败先看 `notarytool log` 再重跑，不要盲重试 |

---

## S5 · 优化机会（最多 3 条）

1. **macOS 构建没有缓存**。Windows job 有 `actions/cache`（`release.yml:71-77`、`ci.yml:54-60`），macOS job 什么都没有（`release.yml:106-133`、`ci.yml:105-131`）。Universal 上线后编译翻倍，加一条缓存性价比立刻变高：`path: .tmp/mac/swift-build`，`key: swift-${{ runner.os }}-${{ hashFiles('host-mac/Package.swift','host-mac/Sources/**') }}`。预计每次省 60–90 s。
2. **`build.sh` 现在把 `swift build` 跑两遍**（`build.sh:12` 编译 + `build.sh:13` 只为取路径）。改成一次编译 + 一次 `--show-bin-path`（或把路径拼出来再断言），并顺手把 `.build/` 从仓库里赶出去——`.gitignore` 目前只忽略 `.tmp/`、`release/`、`*.zip`（`.gitignore:8-11`），**没有 `.build/`**；用 `--scratch-path .tmp/mac/...` 可以一并解决。
3. **Release 说明不写签名状态**。`generate_release_notes: true`（`release.yml:166`）只生成 commit 列表，用户看不到「是否公证」。加 `append_body`（v3 支持，`action.yml:60`），由 `macos-build` 的 job output（`notarized` / `ad-hoc`）拼一句。顺带解决 R9 的文案分裂。

---

## 附录 A · `build.sh` 改造清单

| # | 位置 | 改成 | 理由 |
| --- | --- | --- | --- |
| A1 | `host-mac/build.sh:4` 之后 | 解析 `--universal`（默认开）/ `--single-arch`（本地快跑） | CI 两个 workflow 都无参调用，默认 universal 才能让 PR CI 也验双架构 |
| A2 | `build.sh:12-13` | 用 S1 的 `build_one()` 两次构建；`--scratch-path "$ROOT/.tmp/mac/swift-build/{arm64,x86_64}"` | 官方 `--triple`；scratch 落在 `.tmp`，不产生 `host-mac/.build` |
| A3 | 新增 | `lipo -archs` 断言两个单架构产物 | 错 arch 立刻停 |
| A4 | 新增（原 `BIN` 定义处） | `lipo -create` → `.tmp/mac/SidelightMac.universal`；`lipo -archs`/`file` 断言 `arm64 x86_64` | 合并 + 验证 |
| A5 | `build.sh:17` | `cp "$BIN" "$APP/Contents/MacOS/SidelightMac"` 里的 `$BIN` 指向 universal 产物 | 原有顺序（lipo 在前、签名在后）保持成立 |
| A6 | `build.sh:45` | 保持 ad-hoc：`codesign --force --deep --sign - "$APP"`；**不加** `--options runtime` | 无 Developer ID 时 hardened runtime 无收益 |
| A7 | `build.sh:48-49` | 删掉 `uname -m` 命名；universal 时 `Sidelight-${VERSION}-macos-universal.zip`，`--single-arch` 时保留 `-macos-$(uname -m).zip` | `uname -m` 在 universal 下会说谎 |
| A8 | `build.sh:53` | 追加 `archs=$(lipo -archs "$BIN" \| tr ' ' ',') sha256=$(shasum -a 256 "$ZIP" \| cut -d' ' -f1)` | CI 日志即证据，STATE/CHANGELOG 抄这个 |
| A9 | 新增 `host-mac/sign.sh` | S2 的完整流程；入参 `APP`、`VERSION`、`ZIP`；只在 secrets 存在时由 release workflow 调用 | 公证逻辑不混进本地构建脚本 |
| A10 | `.gitignore`（可选） | 加 `.build/` | 有人本地直接跑 `swift build` 时不脏工作区 |

## 附录 B · secrets 表

| Secret | 含义 | 怎么生成 | 必需 |
| --- | --- | --- | --- |
| `APPLE_CERT_P12_BASE64` | Developer ID Application 证书 + 私钥的 `.p12`，base64 成单行 | Apple 开发者账号 → Certificates 新建 **Developer ID Application**（需 Account Holder/Admin）→ 下载 `.cer` 导入「钥匙串访问」→ 连同私钥导出 `.p12`（设密码）→ `base64 -i DeveloperID.p12 \| pbcopy` | 是 |
| `APPLE_CERT_PASSWORD` | 上面 `.p12` 的导出密码 | 导出时自己设 | 是 |
| `APPLE_SIGN_IDENTITY` | 完整签名身份名，形如 `Developer ID Application: 名字 (TEAMID)` | `security find-identity -v -p codesigning` 的引号内文本 | 是（也可在 CI 里现查，但多证书时会选错） |
| `APPLE_TEAM_ID` | 10 位 Team ID | developer.apple.com → Account → Membership details | 是 |
| `APPLE_ID` | Apple ID 邮箱 | 开发者账号 | 是 |
| `APPLE_APP_SPECIFIC_PASSWORD` | App 专用密码，形如 `abcd-efgh-ijkl-mnop` | <https://support.apple.com/en-us/102654>（appleid.apple.com → 登录与安全 → App 专用密码）。若链接失效，在 support.apple.com 搜「App 专用密码」 | 是 |
| `APPLE_API_KEY_ID` / `APPLE_API_ISSUER_ID` / `APPLE_API_PRIVATE_KEY_BASE64` | 用 App Store Connect API key 代替 Apple ID + 专用密码（`notarytool --key/--key-id/--issuer`） | App Store Connect → 用户和访问 → 集成 → App Store Connect API → 生成密钥（`.p8` 只可下载一次）。**本次未逐项核对 notarytool 的对应参数** | 否（替代方案） |
| `KEYCHAIN_PASSWORD` | 临时 keychain 密码 | **不必存**：CI 里 `openssl rand -hex 16` 生成 | 否 |

注意：GitHub secret 单条上限 48 KB；p12 base64 约 5 KB。fork 来的 PR 拿不到 secrets，但 Release 只在 tag / 手动触发，不受影响。

## 附录 C · `release.yml` 改造清单

| # | 位置 | 改成 |
| --- | --- | --- |
| C1 | `release.yml:106-109`（`macos-build`） | `timeout-minutes: 30` → `45`；加 job 级 `env: HAS_APPLE_SIGNING: ${{ secrets.APPLE_CERT_P12_BASE64 != '' && secrets.APPLE_ID != '' && secrets.APPLE_APP_SPECIFIC_PASSWORD != '' }}` |
| C2 | `release.yml:122-123`（`Build macOS app`） | 不变：`bash host-mac/build.sh` 内部改默认 universal |
| C3 | `release.yml:124-126` 之前 | 新增 `Verify universal slices`：`lipo -archs`/`file`/`xcrun vtool -show-build -arch x86_64`/`codesign -dv`。无条件跑 |
| C4 | `release.yml:124-126`（`Self-test`） | 保留；签名步骤之后再跑一次同名命令（`if: env.HAS_APPLE_SIGNING == 'true'`） |
| C5 | `release.yml:126` 之后 | 新增 `Import Developer ID certificate`（`if: env.HAS_APPLE_SIGNING == 'true'`），调 `host-mac/sign.sh` 的导入段 |
| C6 | 同上 | 新增 `Sign, notarize, staple`（同 `if`），调 `host-mac/sign.sh`；成功后写 `$GITHUB_STEP_SUMMARY`（`signed: developer-id + notarized` / `adhoc`） |
| C7 | `release.yml:128-133`（`Upload macOS zip`） | 不变：`release/Sidelight-*-macos-*.zip` 仍匹配 universal；artifact 名 `macos-zip` 不变，release job 无需改路径 |
| C8 | `release.yml:148-159`（`SHA256SUMS`） | 不变：`find` 自动带上新文件名 |
| C9 | `release.yml:161-172`（`Publish`） | glob 不变。可选：加 `append_body` 写签名状态；加 `gh release view --json assets` 断言资产数（防 R8 旧资产残留） |
| C10 | `release.yml:33-53`（`preflight`） | 不变；但 CHANGELOG 必须先有 `## 0.29.0 — ` 小节，否则 tag 推了就红 |
| C11 | `.github/workflows/ci.yml:121-122` | 不变（build.sh 默认 universal 后，PR CI 自动验双架构）；如嫌慢，CI 里显式传 `--single-arch`，release 里传 `--universal` |

---

## 未核实清单（本轮做不到）

1. `--triple x86_64-apple-macosx13.0` 在本仓库代码上能否真正编过（本机无 Swift；零外部依赖，预判能过）。
2. `--arch` 多架构路径的真实输出目录（`.build/apple/Products/Release` 来自第 14 轮记录，未实测）。
3. GitHub arm64 macOS runner 是否预装 Rosetta 2（镜像 README 未提；给了探针命令）。
4. 公证实际耗时与 `notarytool submit --wait` 的退出码语义（本报告用 `status: Accepted` 断言，不依赖退出码）。
5. hardened runtime 对 WKWebView 真实 GUI 的影响（self-test 不碰 WebView）。
6. Developer ID 证书申请与 `.p12` 导出（要付费账号，未操作）。
7. Universal 包真实体积（要 CI 跑一次；估算 0.88–0.95 MB）。

## 参考链接

- `swift build` 参数页（有 `--triple`、`--scratch-path`，无 `--arch`）：<https://docs.swift.org/latest/documentation/packagemanagerdocs/swiftbuild/>
- SwiftPM `--arch` 定义与多架构切构建系统：<https://github.com/swiftlang/swift-package-manager/blob/main/Sources/CoreCommands/Options.swift>
- Swift 论坛 2024-10 的 `--arch` 用法与外部库链接问题：<https://forums.swift.org/t/swiftpm-compile-multiple-arch-system-library/75724/3>
- Apple 公证总览（前置条件）：<https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution>
- Apple 公证命令行流程（zip、stapler、`notarytool submit --wait`）：<https://developer.apple.com/documentation/security/customizing-the-notarization-workflow>
- Apple 最新签名格式（嵌套代码逐个签）：<https://developer.apple.com/documentation/Xcode/using-the-latest-code-signature-format>
- TN2206 代码签名深入（`--deep --strict` 验证、`spctl`）：<https://developer.apple.com/library/archive/technotes/tn2206/_index.html>
- GitHub secrets（`if` 里不能写 secrets、base64 二进制 secret）：<https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets>
- macOS 15 arm64 runner 镜像说明（20261104，Xcode 16.4 默认，未列 Rosetta）：<https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md>
- arm64 镜像 keychain 已知问题：#13476 <https://github.com/actions/runner-images/issues/13476>
- `softprops/action-gh-release` 输入（`append_body`、`overwrite_files`）：<https://github.com/softprops/action-gh-release/blob/v3/action.yml>
- Apple 平台打包工具链参考（通用二进制打包说明）：<https://github.com/Apple-Actions/import-codesign-certs>
