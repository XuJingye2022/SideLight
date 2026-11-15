# 第 15 轮 · 构建与打包侦察：macOS Universal、签名与公证

- 基线：v0.28.1；目标 v0.29.0。
- 环境：Windows 11。本机无 macOS、无 Swift、无 Apple 证书。macOS 相关结论来自静态代码核对与 **已发布 v0.28.1 包的解包检查**。
- 范围：`host-mac/build.sh`、`host-mac/Info.plist`、`host-mac/Package.swift`、`host-mac/Sources/SidelightMac/*.swift`、`.github/workflows/release.yml`、`.github/workflows/ci.yml`、`docs/iteration/round-14/test.md`。
- 证据目录：`.tmp/r15-bug/`（`evidence.txt` 记录原始测量；`app/` 是 v0.28.1 解包结果）。
- 本报告只读：未改 `host-mac/`、`.github/`、`src/`、`packaging/`。

## 结论摘要（按影响排序）

| 编号 | 问题 | 影响 | 难度 | 建议处置 |
| :--- | :--- | :--- | :--- | :--- |
| B1 | Universal 组装没有 `lipo`/`file`/minos 断言；`uname -m` 命名会误导 | 高：可能把单架构或错名包当 Universal 发布 | S | 发布前必修 |
| B2 | self-test 只验 `/__doc`，且会回退 `dist/`；静态资源与 x86_64 片未验 | 高：包坏了 CI 仍绿，用户白窗 | M | 发布前必修 |
| B3 | 签名/公证没有顺序、secrets 分支与时间预算 | 高：可能发出未 staple 的 zip，或 job 被 30 分钟顶穿 | M–L | 先 dry-run，再开 secrets |
| B4 | release.yml：手动 dispatch 构建 main 而非 tag；glob、并发、SHA 有不一致风险 | 中高：资产与 tag/校验和不一致 | S–M | 本轮一起改 |
| B5 | Info.plist 未引用图标；首开说明没有签名状态分支 | 中：所有 macOS 用户看到通用图标，未签名提示误导 | S | 随包修 |

---

## B1 · Universal 组装没有断言，命名仍按宿主架构

**影响** 高。发布前必须修。

**风险**

1. **取产物的写法不能直接复用。** `host-mac/build.sh:12-13` 先 `swift build -c release`，再用第二次 `swift build ... --show-bin-path` 取路径。第二条命令不带 `--triple`/`--arch` 时返回宿主架构的 bin 目录。改 Universal 时若照抄这一行，x86_64 构建的产物不会被读到，最终把 arm64 文件当两个输入。
2. **同架构输入会硬失败，但错误指向 lipo。** `lipo -create` 遇到两个同架构文件会报 `have the same architectures (arm64) and can't be in the same fat output file`（[openssl 讨论](https://github.com/openssl/openssl/discussions/25688)、[StackOverflow](https://stackoverflow.com/questions/5813704)）。这不是静默错误，但排查者会先怀疑 lipo，而不是「x86_64 构建没落地 / 路径取错」。应在 lipo 前对每个输入单独断言架构。
3. **没有断言就 zip。** `build.sh` 不检查 `lipo -archs` 与 `file`。即使合并成功，`build.sh:48-49` 仍用 `uname -m` 命名，Universal 二进制会叫 `-macos-arm64.zip`。CI 与 Release 说明写 universal、文件名写 arm64，Intel 用户会直接跳过这个资产。
4. **CI 不传参数。** 两个 workflow 都调用 `bash host-mac/build.sh`，不带任何参数（`release.yml:123`、`ci.yml:122`）。若 `--universal` 做成可选开关而 CI 没改，流水线仍只出单架构包；Release 说明却按 Universal 写。把 Universal 设为默认行为，或让 workflow 显式传参并断言产物名。
5. **签名顺序。** 必须先 `lipo`，再复制进 `.app/Contents/MacOS`，最后 `codesign`。先给分片签名再 `lipo` 会毁掉签名。`codesign` 签 fat 文件时一次签所有 slice（`codesign(1)`：*when signing, codesign will always sign all architectures contained in a universal Mach-O file*），不需要分片签。
6. **SwiftPM 资源。** `Package.swift:8-11` 没有 `resources:`，所以没有 `SidelightMac_SidelightMac.bundle`；`www` 是 `build.sh:24` 手工 `cp -R`。Universal 只合并可执行文件，`www` 只复制一次。若以后给 target 加 `resources:`，要显式复制一份 `.build/<triple>/release/*.bundle`，否则运行时读不到。
7. **最低系统版本。** v0.28.1 的 arm64 二进制 `LC_BUILD_VERSION minos=13.0.0`、`sdk=26.5.0`，与 `Info.plist:21-22` 的 `13.0` 一致（`.tmp/r15-bug/evidence.txt` A 节）。x86_64 若用不带版本的 `--triple`，deployment target 有取宿主/SDK 版本的风险（SwiftPM 的优先级未核实；当前 SDK 已是 26.5）。必须用 `--triple x86_64-apple-macosx13.0`，并用 `otool` 对两片断言 `minos 13.0`。
8. **体积。** v0.28.1 主程序 320,320 B，`www` 26 个文件 1,436,973 B，zip 773,067 B。Universal 主程序预计 620–700 KB，zip 预计 0.87–0.95 MB（+10–20%，未实测）。macOS 侧没有体积门，但要把 `build.sh` 输出的 `zip bytes` 记录到 CHANGELOG/Release。

**证据** `host-mac/build.sh:12-13`（`--show-bin-path` 用法）、`:48-49`（`uname -m` 命名）；`host-mac/Package.swift:6,8-11`；`.tmp/r15-bug/evidence.txt` A 节；`docs/iteration/round-14/findings-ship.md:125-137`（上轮同样的 `--triple` + `lipo` 方案）。

**验证方法**

```bash
# 1) 分架构构建。用 --triple，固定 .build/<triple>/release，不用 --show-bin-path
swift build -c release --package-path host-mac --triple arm64-apple-macosx13.0
swift build -c release --package-path host-mac --triple x86_64-apple-macosx13.0
ARM=host-mac/.build/arm64-apple-macosx/release/SidelightMac
X64=host-mac/.build/x86_64-apple-macosx/release/SidelightMac
lipo -archs "$ARM"   # 期望：只有 arm64
lipo -archs "$X64"   # 期望：只有 x86_64

# 2) 合并后、进 .app 前断言
lipo -create "$ARM" "$X64" -output /tmp/SidelightMac.universal
lipo -archs /tmp/SidelightMac.universal | tr ' ' '\n' | sort   # 期望两行：arm64 / x86_64
file /tmp/SidelightMac.universal | grep -q 'universal binary with 2 architectures'

# 3) 两片 minos 必须等于 Info.plist 的 13.0
for a in arm64 x86_64; do
  otool -arch "$a" -l /tmp/SidelightMac.universal | awk '/LC_BUILD_VERSION/{f=1} f&&/minos/{print;exit}'
done

# 4) 进 .app 后、zip 前
codesign --verify --all-architectures --strict --verbose=2 .tmp/mac/Sidelight.app
codesign -d --architecture x86_64 -vvv .tmp/mac/Sidelight.app/Contents/MacOS/SidelightMac 2>&1 | head
```

**建议**

- 给 `build.sh` 加 `--universal` 分支（默认行为不变）；产物命名显式用 `-macos-universal.zip`，脚本开头 `rm -f release/Sidelight-*-macos-*.zip` 防旧包。
- 把上面的断言写进 `build.sh`，在 zip 之前执行。失败信息写明「哪个 slice 缺失 / 哪个 minos 不对」。
- 不使用 `--show-bin-path`；必须用时，show 命令要带同一个 `--triple`。
- `codesign` 保持在 `lipo` 之后；ad-hoc 与 Developer ID 共用这一顺序。
- 记录 `swift --version`、`xcodebuild -version`、`sw_vers` 到 CI 日志，便于复现。

**难度** S（约 20–30 行脚本 + 一次 `workflow_dispatch` 试跑）。

---

## B2 · self-test 只验 `/__doc`，还会回退 `dist/`

**影响** 高。发布前必须修。

**风险**

1. **回退让坏包通过。** `SelfTest.swift:5-11`：`Bundle.main.resourceURL/www` 存在就用它，否则用当前目录下的 `dist/`。CI 在仓库根运行 self-test（`release.yml:125-126`、`ci.yml:124-125`），`dist/` 一定存在。所以 `www` 缺失、复制成 `www/dist`、`www` 是旧版本，`--self-test` 都会 PASS。
2. **用户端同样回退，且不报错。** `App.swift:40-41` 的根目录解析是 `Bundle.main.resourceURL/www ?? cwd/dist`。Finder 启动时 cwd 是 `/`，`www` 缺失就指向 `/dist`；`HTTPServer` 不校验 root 是否存在（`HTTP.swift:11-30`），`staticFile` 返回 404（`HTTP.swift:105-119`），窗口白屏，没有错误对话框。
3. **只测一个路由。** `SelfTest.swift:25` 只请求 `/__doc`；`:45` 同时接受 200 与 404，`:46-51` 只要求 JSON 里有 `v`。`/`、`/__recent`、hashed JS/CSS、MIME、Host 守卫（`HTTP.swift:85`）都没有断言。
4. **x86_64 片不会执行。** `main.swift:5-7` 只跑当前进程的架构。Universal 的另一片只能静态验证。
5. **就绪等待与端口。** `SelfTest.swift:20` 固定睡 0.6 s，之后请求超时 5 s。慢 runner 上第一次请求失败会假红；本地开着 App 时 47821 被占用，self-test 直接失败。
6. **`index.html` 没有检查。** `build.sh:20-24` 只检查 `dist/` 目录存在。`npm run build` 若产出不完整，包会缺 `index.html` 或旧文件，self-test 仍 PASS。

**证据** `host-mac/Sources/SidelightMac/SelfTest.swift:5-11,20,25,45-51`；`main.swift:5-7`；`App.swift:40-41`；`HTTP.swift:85,105-119`；`release.yml:125-126`、`ci.yml:124-125`；`build.sh:20-24`。

**验证方法**

- macOS 手工实验（未做，本机无 macOS）：把 `.app/Contents/Resources/www` 移走，再跑 `--self-test`。按代码路径推断会 PASS，这就是盲区。
- CI 静态断言（不执行 x86_64 也能覆盖）：

```bash
APP=.tmp/mac/Sidelight.app
BIN="$APP/Contents/MacOS/SidelightMac"
test -f "$APP/Contents/Resources/www/index.html"
test "$(lipo -archs "$BIN" | wc -w)" -eq 2
file "$BIN" | grep -q 'universal binary with 2 architectures'
codesign --verify --strict --all-architectures --verbose=2 "$APP"
codesign -d --architecture x86_64 -vvv "$BIN" 2>&1 | grep -q 'Signature=adhoc\|Authority=Developer ID Application'
plutil -lint "$APP/Contents/Info.plist"
test "$(plutil -extract LSMinimumSystemVersion raw -o - "$APP/Contents/Info.plist")" = "13.0"
```

- self-test 应增加的断言：
  - 严格模式：`--require-bundle`（或检测 `Bundle.main.bundleURL.pathExtension == "app"`），禁止回退 `dist/`；打印实际 root。
  - `GET /` → 200、`Content-Type: text/html; charset=utf-8`、body 含 `id="root"`。
  - 从 `GET /` 的 body 抽出 `/assets/index-*.js`，再 GET → 200、`text/javascript`、长度 > 0。
  - `GET /__recent` → 200、JSON `v=1`、`items` 是数组。
  - `GET /does-not-exist` → 404；带 `Host: evil` → 403。
  - 就绪等待改为 10 × 0.2 s 轮询，去掉固定 0.6 s 睡眠。
- 可选加强（未核实）：arm64 runner 安装 Rosetta 后执行 `arch -x86_64 "$BIN" --self-test`，真正跑 x86_64 片；装不上就保持静态断言。

**建议**

- self-test 增加 `--require-bundle` 与上面 6 项断言，输出每个检查的 PASS/FAIL，任一失败退出 1。
- CI 的 self-test 一律带 `--require-bundle`；只看 arm64 运行时不够，必须配合静态断言。
- 启动时若 `www/index.html` 不存在，弹 `NSAlert` 并退出非零，不要打开白窗。

**难度** M（SelfTest 约 +80 行，CI +15 行）。

---

## B3 · 签名与公证：顺序、secrets 分支、30 分钟预算

**影响** 高。先 dry-run，再开 secrets。

**风险**

1. **顺序错会发出未 staple 的 zip。** `build.sh:45` 先 ad-hoc 签名、`:51` 出 zip。加公证时必须是：签名 → 临时 zip → `notarytool submit --wait` → `stapler staple` **`.app`** → `stapler validate` → **重新 zip**。`stapler` 不能 staple zip；只 submit 不 staple，用户离线首次打开仍被 Gatekeeper 拦。示例见 [lamdu 的 staple-and-zip 脚本](https://github.com/lamdu/lamdu/blob/6607641a5cc112dcefacac8e14c8aca904b5e89a/tools/macos-1-staple-and-zip.sh) 与 [mcpproxy 的提交](https://github.com/smart-mcp-proxy/mcpproxy-go/commit/f0bc89165949b8d047fa5f72e55d1f6e7cd955a8)：先 staple `.app`，再 `ditto` 重新打包。
2. **公证后不能再签名。** 再跑一次 `codesign` 会换 cdhash，ticket 失效。图标、Info.plist、资源都必须在签名前定稿。
3. **时间预算不够。** macOS job `timeout-minutes: 30`（`release.yml:109`），而 `notarytool submit --wait` 自己的默认等待是 30 分钟；构建两次 + self-test 之后没有余量。Apple 公证经常超过 15 分钟（[qaid v1.3.0 发布说明](https://github.com/qaid/look-ma-no-hands/releases/tag/v1.3.0)、[4D notarization 文档](https://kb.4d.com/DLTN/TN/2025/25-01_Notarization.pdf)）。job 被杀时 Apple 侧可能仍在处理，重跑会重复提交。
4. **`--timestamp` 会硬失败。** `codesign(1)` 写明 TSA 不可达时签名失败。没有重试就会红。
5. **证书导入是常见挂点。** 缺 `security set-key-partition-list -S apple-tool:,apple:,codesign:` 或没 `security unlock-keychain` 时，`codesign` 会挂起或报 `errSecInternalComponent`。证书类型必须是 **Developer ID Application**，不是 Apple Development。`security find-identity -v -p codesigning` 为 0 时应立即失败并给出明确信息。
6. **没有 secrets 时的分支缺失。** 现在没有任何签名步骤，Release 说明里也没有「未签名」。用户看到 Gatekeeper 拦截会当成包坏。
7. **`--deep`。** `build.sh:45` 的 `--deep` 对当前无嵌套代码的 `.app` 没有实际作用；Developer ID 路径建议 inside-out：先签嵌套代码（helper、framework、dylib，当前没有），最后签 `.app`，不加 `--deep`；主可执行文件由签 `.app` 时一并处理。只在**验证**时用 `--deep --strict`。以后加 framework 或 SwiftPM resource bundle 时不会漏签。
8. **entitlements。** 当前 WKWebView 宿主不需要额外 entitlement；hardened runtime 下也不要为「JIT」加权限（WebContent 是独立进程）。`codesign -d --entitlements :-` 应为空。

**证据** `host-mac/build.sh:45,51`；`release.yml:106-133`（没有任何签名/公证步骤）、`:109`（30 分钟）；`codesign(1)` 的 `--deep`、`--timestamp`、all-architectures 条目；notarytool 30 分钟来源与 staple 示例见「外部依据」。

**验证方法**

- 无 secrets 的 dry-run：`workflow_dispatch`（publish=false）→ 断言 `codesign -dvvv` 含 `Signature=adhoc`，self-test PASS，zip 可解，Release 说明写「未签名」。
- 有 secrets：日志应出现 `security find-identity` 至少 1 个 `Developer ID Application`、`notarytool ... status: Accepted`、`stapler validate: The validate action worked!`、`spctl -a -vvv -t exec` 返回 `accepted source=Notarized Developer ID`。
- 真机：Apple Silicon 与 Intel 各一台，浏览器下载后双击（未做，UNVERIFIED）。

**建议（命令骨架）**

```bash
# 三种状态：adhoc / 已签名未公证 / 已签名已公证
security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
security set-keychain-settings -lut 21600 build.keychain
security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
security import cert.p12 -k build.keychain -P "$CERT_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: \
  -s -k "$KEYCHAIN_PASSWORD" build.keychain
security find-identity -v -p codesigning build.keychain | grep -q 'Developer ID Application'

# 当前 .app 没有嵌套可执行文件：签名只签 bundle，不加 --deep。
# 以后有 helper/framework 时，先签嵌套项，最后签 .app。
codesign --force --options runtime --timestamp --sign "$IDENTITY" \
  --keychain build.keychain "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" .tmp/mac/notarize.zip
xcrun notarytool submit .tmp/mac/notarize.zip \
  --apple-id "$APPLE_ID" --team-id "$TEAM_ID" --password "$APP_PASSWORD" \
  --wait --timeout 20m
xcrun stapler staple "$APP" && xcrun stapler validate "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" \
  "release/Sidelight-${VERSION}-macos-universal.zip"
```

- secrets gate 用 `$GITHUB_ENV`：先判断非空，再写 `sign=true`；不要在 `if:` 里直接读 secrets（可移植性差）。
- 建议 secrets 名：`MACOS_CERT_P12`（base64）、`MACOS_CERT_PASSWORD`、`MACOS_KEYCHAIN_PASSWORD`、`MACOS_SIGN_IDENTITY`、`APPLE_ID`、`APPLE_TEAM_ID`、`APPLE_APP_PASSWORD`。
- 有 secrets 但证书/身份失败：让 job 失败，不要静默回退 ad-hoc。只有部分 secrets 时：只签名不公证，Release 说明写「已签名、未公证」。
- job timeout 提到 60 分钟；`--timestamp` 加 3 次重试；公证单独一个 step，便于重跑。
- `spctl`/`stapler validate` 只在签名分支执行；ad-hoc 分支不跑。

**难度** M–L（脚本约 40–60 行 + secrets 配置 + 一次真实公证）。

---

## B4 · release.yml：手动 dispatch 构建 main，不是 tag

**影响** 中高。本轮一起改。

**风险与证据**

1. **dispatch 构建的是默认分支。** `workflow_dispatch` 没有 tag 输入（`release.yml:7-12`）。preflight 在 dispatch 时用 `TAG_VERSION=${PKG_VERSION}`（`:42`），等于自己和自己比。三个构建 job 的 `actions/checkout` 都没有 `ref`（`:29`、`:63`、`:114`），所以 dispatch 构建 main HEAD；release job 却用 `tag_name: v${VERSION}`（`:164`）把产物挂到版本 tag。main 超前时，发布的资产不是 tag 的代码。
2. **artifact glob 太宽。** macOS 上传用 `release/Sidelight-*-macos-*.zip`（`:132`）。本轮把 arm64 改名 universal 时，`release/` 里任何旧 mac zip 都会被上传；release job 的 `find ... -name '*.zip'`（`:155`）不校验数量和名字。
3. **没有 concurrency。** tag push 与 manual dispatch（publish）可能并发跑同一个 tag。两个 release job 交错覆盖同名资产；`SHA256SUMS` 可能来自另一次构建，和最终资产字节不一致（构建产物不是逐字节确定的）。
4. **`sha256sum *` 有自包含风险。** `:157` 的 `*` 会把 `out/` 里已有的 `SHA256SUMS-*.txt` 也算进去。GitHub fresh workspace 通常不会，但重跑/本地复用会。
5. **改名后旧资产残留。** `overwrite_files: true`（`:171`）只覆盖同名文件，不删除旧名资产。arm64 与 universal 会并存，下载页出现两个 mac 包。
6. **权限现状正确。** 顶层 `contents: read`（`:14-15`），release job 单独 `contents: write`（`:141-142`）。macOS build job 只需要读仓库和 upload-artifact，**不要**给它 write。
7. **缺文件会提前红。** `if-no-files-found: error`（`:133`）与 `fail_on_unmatched_files: true`（`:172`）都是好的；mac zip 缺失会在上传 step 就失败，不会静默少资产。
8. **校验和命名。** 当前 `SHA256SUMS-${VERSION}.txt` 与 `README.md:79`、round-14 预期一致。保留版本化命名，不要改成无版本名。

**证据** `release.yml:7-12`（dispatch 输入）、`:29,63,114`（checkout 无 ref）、`:42`（TAG_VERSION）、`:132`（glob）、`:155,157`（find 与 sha256sum）、`:164`（tag_name）、`:171-172`；全文件没有 `concurrency`；`README.md:79`。

**验证方法**

- `workflow_dispatch`（publish=false）→ 下载 artifact，确认恰好 3 个文件、名字与 preflight 版本一致、`sha256sum -c` 通过。
- 本地模拟 release job 的 bash 段：把 3 个包复制到空目录，跑 `sha256sum` 与 `-c`，确认没有多余行。
- 并发：加 `concurrency` 后连点两次 dispatch，确认第二次排队而不是并行。
- tag 一致性：在 main 比 tag 多一个提交的状态下 dispatch，检查日志里的 `git rev-parse HEAD` 是否等于 tag 的提交；不等就是本条的复现。

**建议**

- dispatch 加必填 `tag` 输入；preflight 与所有 build job 用 `checkout ref: ${{ inputs.tag || github.ref }}`；preflight 校验 tag 存在、`package.json` 与 tag 一致、CHANGELOG 有对应小节。
- 上传用精确路径 `Sidelight-${{ needs.preflight.outputs.version }}-macos-universal.zip`；`build.sh` 开头清理旧 mac zip。
- release job 断言 `ls out | wc -l` 等于 3；`sha256sum` 用显式文件名，不用 `*`。
- 加 `concurrency: group: release-${{ github.ref_name }}`、`cancel-in-progress: false`。
- 上传前删除旧名资产（`gh release view --json assets` + `gh release delete-asset`），或在 CHANGELOG 明确只发 universal 并手工删 arm64。
- Release 正文用 `append_body` 写签名状态；`generate_release_notes` 会生成 notes，`append_body` 在 notes 后追加（[softprops 配置说明](https://deepwiki.com/softprops/action-gh-release/1.2-configuration-options)）。

**难度** S–M。

---

## B5 · Info.plist 没有引用图标，首开说明没有签名分支

**影响** 中。随包修。

**风险与证据**

1. **图标文件存在但没被引用。** v0.28.1 包里有 `Contents/Resources/Sidelight.icns` 89,684 B，但源码 `host-mac/Info.plist` 与解包后的 plist 都没有 `CFBundleIconFile` / `CFBundleIconName`。按 Info.plist 规则系统不会引用这个 icns，Dock、Finder、关于窗口大概率显示通用图标（真机未确认）。
2. **图标链静默失败。** `build.sh:26-43` 的 `sips`、`iconutil` 全部 `|| true`。iconset 只生成 16/32/64/128/256/512，Retina 位靠把 128 复制成 128@2x、256 复制成 256@2x（尺寸不对）。实测 icns 缺 `ic10`（512@2x/1024）、`ic11`（16@2x）、`ic12`（32@2x）、`ic14`（256@2x）。即使补上 plist key，高分屏图标仍不完整。
3. **说明没有分支。** `README.md:12` 只写 arm64、未签名/未公证与右键打开。Universal 后要覆盖三种状态（adhoc / 已签名未公证 / 已公证）；`macOS 15 起右键打开可能失效` 的说法要保留，并给「系统设置 → 隐私与安全性 → 仍要打开」路径。
4. **自动 Release notes 不会说签名状态。** 用户下载后被 Gatekeeper 拦，无法判断是预期还是包坏。

**证据** `host-mac/Info.plist` 全文无 `CFBundleIconFile`/`CFBundleIconName`；`.tmp/r15-bug/app/Sidelight.app/Contents/Info.plist`（1,291 B）同样没有；包内 `Sidelight.icns` 89,684 B 与 chunk 列表见 `.tmp/r15-bug/evidence.txt` A 节；`build.sh:26-43`；`README.md:12`。

**验证方法**

```bash
plutil -extract CFBundleIconFile raw -o - .tmp/mac/Sidelight.app/Contents/Info.plist
# 期望输出 Sidelight.icns；当前会报 key 不存在
iconutil -c iconset .tmp/mac/Sidelight.app/Contents/Resources/Sidelight.icns -o /tmp/icon.iconset
ls /tmp/icon.iconset
# 期望 10 个标准文件名；当前会缺 16@2x、32@2x、256@2x、512@2x
```

真机确认 Dock 图标与 Gatekeeper 文案（未做，UNVERIFIED）。

**建议**

- Info.plist 加 `CFBundleIconFile` = `Sidelight.icns`。
- 从 1024×1024 PNG 生成完整 iconset：16/16@2x/32/32@2x/128/128@2x/256/256@2x/512/512@2x。`iconutil` 失败时输出 `::warning::`，不要静默。
- README、CHANGELOG、Release 说明按签名状态分支；Release 用 `append_body` 写明「未签名（ad-hoc）/ 已签名未公证 / 已公证」。
- `LSMinimumSystemVersion` 与两片 minos 的一致性断言放在 B1 的验证步骤。

**难度** S。

---

## 风险清单

| 风险 | 触发点 | 影响 | 缓解 |
| :--- | :--- | :--- | :--- |
| x86_64 交叉编译失败 | `--triple` 不被当前 SwiftPM 接受；SDK 去掉 x86_64 slice；链接到 arm64-only 库 | 构建红，拿不到 Universal | 先跑一次 dispatch 试验；失败退 `--arch x86_64`（若可用）或 Intel runner（`macos-15-intel`）；日志记录 `swift --version`、`xcodebuild -version`。当前无第三方依赖，概率低 |
| 资源路径错误 | `www` 缺失、复制成 `www/dist`、旧版 `www` | 用户白窗；self-test 仍绿 | B1/B2 的断言：`test -f www/index.html`、`GET /`、`--require-bundle`；启动缺资源弹错退出 |
| 公证等待超时 | `notarytool --wait` 默认 30 分钟；job 30 分钟 | job 被杀，发布中断；重跑重复提交 | job 60 分钟；`--timeout 20m`；公证单独 step；失败不重签 |
| 证书导入失败 | 缺 `set-key-partition-list` / `unlock-keychain`；证书不是 Developer ID Application | `codesign` 挂起或 `errSecInternalComponent`；发布卡住 | `security find-identity` 断言；错误信息区分「无证书」「证书无效」；有 secrets 时失败不回退 ad-hoc |
| 未签名提示 | 无证书时的 ad-hoc 包 | 用户双击被 Gatekeeper 拦，误判包坏 | Release 正文 + README 明确状态与打开方法；有证书后优先公证 |

---

## 优化机会（最多 3 条）

1. **单一验证入口 `host-mac/verify.sh`。** 把 `lipo -archs`、`file`、`plutil`、`otool`、`codesign --verify`、`unzip -t`、`--self-test` 收在一个脚本里，`build.sh` 尾部与 CI 都调用它。本地 macOS 可先跑，YAML 只剩一行，失败信息一致。
2. **self-test 输出机器可读一行。** 例如 `selftest ok=1 root=/.../www arch=arm64 checks=7`，CI 用 `grep`/解析，不匹配人类文案；同时提供 `--require-bundle` 严格模式。
3. **release job 的资产守卫合并成一个脚本。** 「3 个资产 + 显式 sha256 列表 + 清理旧名资产 + 写签名状态」放在一个 step，减少 YAML 漂移；并发锁单独一行 `concurrency`。

---

## 附带发现（不编号）

- **正面证据：** v0.28.1 zip 的 37 个条目里 `Sidelight.app/` 在顶层、`__MACOSX` 为 0；`ditto -c -k --sequesterRsrc --keepParent` 的公证 zip 格式不用改。
- **本地 `release/` 有旧包：** 仍是 0.28.0 的 Windows setup/zip 和 0.26 的 `SHA256SUMS.txt`。手工发版前清理，避免误传。
- **`--deep`：** ad-hoc 路径可保留；Developer ID 路径建议 inside-out，验证时才用 `--deep --strict`（见 B3）。
- **未验证：** 真实 Intel 运行、真实签名/公证、Rosetta 执行 x86_64、图标显示、macOS 15+ Gatekeeper 文案。验证方法已写在各条。

## 外部依据

- `codesign(1)`：验证默认检查所有架构；显示默认只看宿主架构；签名 fat 文件时签所有 slice；`--timestamp` 失败会终止签名。<https://www.manpagez.com/man/1/codesign/>
- `lipo -create` 拒绝同架构输入。<https://github.com/openssl/openssl/discussions/25688>、<https://stackoverflow.com/questions/5813704>
- notarytool 默认等待 30 分钟。<https://github.com/qaid/look-ma-no-hands/releases/tag/v1.3.0>、<https://kb.4d.com/DLTN/TN/2025/25-01_Notarization.pdf>
- staple `.app` 后重新 zip。<https://github.com/lamdu/lamdu/blob/6607641a5cc112dcefacac8e14c8aca904b5e89a/tools/macos-1-staple-and-zip.sh>、<https://github.com/smart-mcp-proxy/mcpproxy-go/commit/f0bc89165949b8d047fa5f72e55d1f6e7cd955a8>
- `macos-latest` 为 arm64 镜像，Intel 镜像是独立标签。<https://github.com/Umeh832/runner-images#1>
- softprops `append_body`。<https://deepwiki.com/softprops/action-gh-release/1.2-configuration-options>
