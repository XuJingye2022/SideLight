# 第 15 轮 · 计划（rev2）

基线 v0.28.1。3 个任务，全部归 B 组（builder2，macOS/发布）：T1 构建与 self-test → T2 README/AGENTS → T3 CHANGELOG/版本与首屏校验。A 组本轮不参与（无前端改动），前端字节不变（首屏 283,826）。
**本机限制**：Windows，无 macOS/Swift/Apple 证书；`build.sh`/`sign.sh`/Swift 改动只能静态核对与 CI 验证，真实 Intel 运行与公证标 **UNVERIFIED**。
**构建纪律**：任何实施者不跑 `npm run build`。B 无 bash 可执行，用 `Select-String` 静态断言 + GitHub Actions 真实验证；首屏由根代理 build 后 measure。`package.json`/`package-lock` 只归 T3；`package-lock` 由根代理同步。

## T1 macOS Universal、self-test 加固、签名流程与 Edit 菜单（S1–S3/B1–B5/U5/H1–H6）｜B 组（builder2）

- **目标**：`host-mac/build.sh` 默认出 universal（arm64 + x86_64），产物名 `Sidelight-<版本>-macos-universal.zip`；`--self-test --require-bundle` 严格断言静态资源与路由；签名/公证为可选分支且不丢 `README.txt`；release 资产与 checksum 顺序确定；`App.swift` 补可用的 Edit 菜单。
- **为什么现在**：B1 实测 universal 组装无断言、`uname -m` 命名会谎报；B2 实测 self-test 只验 `/__doc` 且回退 `cwd/dist`；B3 实测无签名步骤、job 30 分钟不够；B4 实测 dispatch 构建 main、无 concurrency、`sha256sum *`；B5 实测 Info.plist 无图标键；U5 实测无 Edit 菜单。
- **文件**：`host-mac/build.sh`、`host-mac/sign.sh`（新）、`host-mac/verify.sh`（新）、`host-mac/Sources/SidelightMac/SelfTest.swift`、`host-mac/Sources/SidelightMac/App.swift`、`host-mac/Info.plist`、`packaging/macos-README.txt`（新）、`.github/workflows/release.yml`、`.github/workflows/ci.yml`、`.gitignore`
- **步骤**
  1. **Universal（H1）**：`build.sh` 默认 universal，参数数组**一处定义**：
     ```bash
     BUILD=(swift build -c release --package-path "$HOST" --triple "$TRIPLE" --scratch-path "$SCRATCH")
     "${BUILD[@]}" >&2
     BIN_DIR="$("${BUILD[@]}" --show-bin-path | tail -1)"; test -d "$BIN_DIR"; test -f "$BIN_DIR/SidelightMac"
     ```
     `--show-bin-path` 必须与 build **同一个数组**（`--package-path` + `--triple` + `--scratch-path` 一个不少），否则会取回默认 `.build/<triple>/release`。每片先 `lipo -archs` 断言**单一架构**（`arm64` / `x86_64`），再 `lipo -create` 到 `.tmp/mac/SidelightMac.universal`；合并后 `lipo -archs` 排序含两片、`file` 报 `universal binary with 2 architectures`、两片 `otool -arch <arch> -l` 的 `minos` = `13.0`；**先 lipo → 复制进 `.app/Contents/MacOS` → codesign**；命名固定 `-macos-universal.zip`，删 `uname -m`；打包前 `rm -f release/Sidelight-*-macos-*.zip`；`--single-arch` 仅本地开关，CI/release 不传参。
  2. **暂存目录与 zip（H3 基础）**：`build.sh` 组装 `STAGE_DIR=$ROOT/.tmp/mac/stage`（内含 `Sidelight.app` 与 `README.txt`），发布 zip 用 `ditto -c -k --sequesterRsrc --keepParent "$STAGE_DIR" "$ZIP"`，zip 根目录含二者，`README.txt` 在 `.app` 外。
  3. **`host-mac/verify.sh`（新，B1/B2）**：`test -f Contents/Resources/www/index.html`、`lipo -archs` 两片（**单切片直接失败**）、`file` universal、两片 `otool minos`=13.0、`plutil -lint` 与 `LSMinimumSystemVersion`=13.0、`codesign --verify --strict --all-architectures`（签名后、`unzip -t` 之前）、`unzip -t "$ZIP"`、`unzip -l "$ZIP" | grep -q 'README.txt'`；`build.sh` 尾部与两个 workflow 共用。
  4. **self-test（B2）**：加 `--require-bundle`——只有 `Bundle.main.bundleURL.pathExtension == "app"` 才继续，**禁止回退 `cwd/dist`**，打印实际 root；断言 `GET /` 200 且 `Content-Type: text/html; charset=utf-8`、body 含 `id="root"`；从 body 抽 `/assets/index-*.js` 再 GET → 200、`text/javascript`、长度 >0；`GET /__recent` 200 且 `v=1`、`items` 是数组；未知路径 404；`Host: evil` → 403（URLSession 不保证自定义 Host，**用原始 socket/NWConnection 发请求**，否则该项标 UNVERIFIED）；就绪等待 **10 × 0.2 s 轮询**；每项打印 PASS/FAIL，任一失败 exit 1；`App.swift` 在 `www/index.html` 缺失时 `NSAlert` + 非零退出。
  5. **签名/公证（H2/H3）**：`host-mac/sign.sh` 入参 `APP`、`STAGE_DIR`、`ZIP`；完整 keychain：
     `create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain` → `set-keychain-settings -lut 21600` → `unlock-keychain -p` → `import "$RUNNER_TEMP/cert.p12" -k build.keychain -P "$APPLE_CERT_PASSWORD" -T /usr/bin/codesign` → `set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain` → `list-keychains -d user -s build.keychain` → `find-identity -v -p codesigning build.keychain | grep -q 'Developer ID Application'`；`codesign --force --options runtime --timestamp --keychain build.keychain --sign "$APPLE_SIGN_IDENTITY" "$APP"`（**不加 `--deep`**）；`codesign --verify --deep --strict --verbose=2`；公证 zip **只装 `.app`**（`ditto "$APP"`）→ `notarytool submit --wait --timeout 20m` 断言 `status: Accepted`（失败打印 `notarytool log`）→ `stapler staple "$APP"` + `stapler validate` + `spctl --assess` → **`ditto "$STAGE_DIR"` 重打发布 zip**（保住 `README.txt`）→ 恢复原 `list-keychains` 并 `delete-keychain`（失败也执行清理 trap）。`release.yml` 的 `macos-build` 用 job 级 `env`：`HAS_APPLE_SIGNING` + 六个 secrets（`APPLE_CERT_P12_BASE64`、`APPLE_CERT_PASSWORD`、`APPLE_SIGN_IDENTITY`、`APPLE_TEAM_ID`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`）；导入与签名 step `if: env.HAS_APPLE_SIGNING == 'true'`（**`if:` 内不写 `secrets.*`**）；`timeout-minutes: 60`；无 secrets 走 ad-hoc 并输出 `signing=adhoc`，签名后再跑一次 self-test；有 secrets 但证书/公证失败 → job 失败，不静默降级。
  6. **x86_64 失败分支（H5）**：x86_64 构建失败时先试 `swift build … --arch x86_64`（备选，日志记录）；仍失败打印 `::error::x86_64 片未产出，Universal 未产出，禁止发布` 并 exit 1；**禁止把 arm64 复制成 x86_64 或改名成 universal**；CI 日志打印 `swift --version`、`xcodebuild -version`、`sw_vers`。
  7. **release.yml（H4/H5）**：`workflow_dispatch` 加必填 `tag` 输入；全部 `checkout` 用 `ref: ${{ inputs.tag || github.ref }}`；preflight 校验 tag = `v<package.json version>` 且 CHANGELOG 有对应小节；`release` job 保持 `if: github.event_name == 'push' || inputs.publish`；下载 artifact 后：
     first `find out -type f \( -name '*.exe' -o -name '*.zip' \) | wc -l` = **3**；
     then 用显式三文件名生成 `SHA256SUMS-<版本>.txt`；
     then `find out -type f | wc -l` = **4**；
     then `sha256sum -c`；
     `append_body` 追加签名状态首行（`adhoc` → 「**未签名、未公证**」；`developer-id-notarized` → 「**已签名并公证**」）；加 `concurrency: { group: release-<ref>, cancel-in-progress: false }`；重跑时 `gh release view --json assets` 删除旧 `-macos-arm64.zip`（或注释明确只支持新 tag）。
  8. **CI**：`ci.yml` 的 macos job 在 build 后调 `bash host-mac/verify.sh` 与 `--self-test --require-bundle`。
  9. **App.swift Edit 菜单（H6）**：`buildMenu()` 加标准 Edit 菜单，所有项 `target = nil`、`action = #selector(...)`：`undo:`/`redo:` 走 `WKWebView.undoManager`（`NSApp.sendAction` 兜底），`cut:`/`copy:`/`paste:`/`selectAll:` 走 first responder；**不给网页快捷键另发一次事件**（避免 Cmd+C 触发两次）；`keyEquivalent` 交给系统；真机 `⌘C/⌘V/⌘Z` 标 UNVERIFIED。
  10. **Info.plist 与 zip 说明**：加 `CFBundleIconFile` = `Sidelight.icns`；图标生成失败输出 `::warning::`；`packaging/macos-README.txt` 写 Gatekeeper 三档、签名三态、Intel、数据位置、校验和。
- **验收（静态断言必须本地过；CI 行为下一轮实跑）**
  1. `Select-String host-mac/build.sh -SimpleMatch 'BUILD=(','--show-bin-path','test -f','lipo -archs','lipo -create','macos-universal','--scratch-path','::error::'` 各 ≥1；`--show-bin-path` 与 build 共用同一数组（`Select-String -Pattern 'BUILD\[@\]'` ≥2）；无 `uname -m` 用于命名。
  2. `verify.sh` 含 `lipo -archs`、`otool -arch`、`minos`、`codesign --verify --strict --all-architectures`、`unzip -t`、`README.txt`。
  3. `build.sh` 的发布 zip 来自 `ditto "$STAGE_DIR"`；`sign.sh` 含 `create-keychain`、`set-keychain-settings`、`unlock-keychain`、`set-key-partition-list`、`list-keychains -d user -s`、`find-identity`、`--keychain build.keychain`、`ditto "$STAGE_DIR"`、`stapler staple`、`notarytool submit`。
  4. `SelfTest.swift` 含 `--require-bundle`、`id="root"`、`/__recent`、`403`、`404`；无 `cwd/dist` 回退；Host 403 用原始 socket（或标 UNVERIFIED）。
  5. `release.yml` 含 `inputs.tag`、3 资产断言、显式三文件名、4 文件断言、`sha256sum -c`、`append_body`、`concurrency`、`timeout-minutes: 60`、`HAS_APPLE_SIGNING`；`if:.*secrets\.` 0 命中；`contents: write` 只在 release job。
  6. `App.swift` 含 `target = nil` 与 `undoManager`（或 `NSApp.sendAction`）与 `undo:`/`redo:`/`cut:`/`copy:`/`paste:`/`selectAll:`；`Info.plist` 含 `CFBundleIconFile`；`packaging/macos-README.txt` 存在。
  7. `npm test` 0 失败（前端未改）。
- **门禁**：上述 `Select-String`/`Test-Path` + `npm test`
- **风险与回退**：`--triple x86_64` 能否编过未在本机验证（给了 `--arch` 备选与明确的 `::error::`）；公证与签名只能静态审查 + 人工 secrets；`App.swift` 本机不能编译。回退：`git checkout -- host-mac/ .github/workflows/ packaging/macos-README.txt` 并删 sign.sh/verify.sh。
- **难度** L ｜ **量级** 340–440 行

## T2 README 下载段、Gatekeeper 三档、数据与快捷键（U1–U5）｜B 组（builder2，T1 后）

- **目标**：README 下载段改 Universal；Gatekeeper 按 macOS 15+ 与 13–14 两档写可执行步骤（先双击一次 → 系统设置 → 隐私与安全性 → 仍要打开）；写清数据位置与换包保留；说明 `Ctrl` 在 macOS 用 `Cmd`；不写死版本与字节。
- **为什么现在**：U1 实测 README 以 13–14 的「右键 → 打开」开头、`xattr` 路径写死；U2 Intel 会被 arm64 包误导；U3 签名状态只有一种；U4 数据路径只写 Windows；U5 全用 `Ctrl`。
- **文件**：`README.md`、`AGENTS.md`
- **步骤**
  1. 下载段：**macOS（Universal：Apple Silicon + Intel，macOS 13+）** `Sidelight-<版本>-macos-universal.zip`；macOS 15+：拖进「应用程序」→ 先双击一次 → 「系统设置 → 隐私与安全性」→「仍要打开」→「打开」（警告只有「完成」属正常）；macOS 13–14：右键 →「打开」→「打开」；`xattr -dr com.apple.quarantine "<App 路径>"`（占位路径，提示空格引号）；「已损坏」先别重下；每次更新后重做；`shasum -a 256` 对照 `SHA256SUMS-<版本>.txt`。
  2. 「从 0.28.1（arm64）升级」三行：覆盖安装、数据保留、首次打开步骤重做；「不确定芯片： 菜单 →「关于本机」→「芯片」」；「0.28.1 及更早 `-macos-arm64.zip` 只支持 Apple Silicon」。
  3. 「数据与隐私」补 macOS：`~/Library/Application Support/Sidelight`、文档同级 `.sidelight/`、App 本地 Web 存储；彻底删除步骤；「换包不丢数据」「只保留一个 `Sidelight.app`」「不要改 `CFBundleIdentifier`」。
  4. 全文加「下文 `Ctrl` 在 macOS 上换成 `Cmd`」；File/Edit 菜单各一句。
  5. 资产名去版本号；删具体字节与哈希（链 Release/CHANGELOG）；ADR 索引 0001–0015。
  6. `AGENTS.md §6`：0.29.0 状态（universal、签名可选、CI 必过）、未验清单加「真实 Intel、真实签名/公证、Rosetta、图标显示、⌘C/⌘V/⌘Z」。
- **验收**
  1. `Select-String README.md -SimpleMatch 'macos-universal','仍要打开','先双击一次','xattr -dr com.apple.quarantine','Application Support/Sidelight','Cmd + S','关于本机'` 各 ≥1；不含 `macos-arm64`、`817,821`、`FE2EF`、`Sidelight-0.28.1-win`。
  2. 三档路径都在且顺序正确（15+ 在前）；「已损坏」「每次更新后重做」各 ≥1；围栏成对；`AGENTS.md` 含 universal 与未验项。
- **门禁**：上述 `Select-String` + `npm test`
- **风险与回退**：文案是对外承诺，未跑签名分支前不能写「已公证」；两档顺序写反会让用户多试错。回退：`git checkout -- README.md AGENTS.md`。
- **难度** M ｜ **量级** 140–200 行

## T3 0.29.0 版本、CHANGELOG 与首屏校验（S5）｜B 组（builder2，T1/T2 后）

- **目标**：`package.json`/`package-lock` 升 0.29.0；CHANGELOG 写实际结果；首屏仍 283,826（≤285,000）并记录实测。
- **为什么现在**：T1/T2 改变发布形态与文档；universal + 可选签名属新功能，按语义化 +0.1.0。
- **文件**：`package.json`、`package-lock.json`（根代理同步）、`docs/CHANGELOG.md`、`docs/adr/0015-macos-universal-and-signing.md`（可选）
- **步骤**
  1. `package.json` 改 `"version": "0.29.0"`；`package-lock` 两处由根代理同步。
  2. CHANGELOG 顶部加 `## 0.29.0 — 2026-11-16`：Universal（arm64 + x86_64、`--triple` 两次构建、`lipo` 断言、minos 13.0）、self-test `--require-bundle` 与 6 项断言、签名/公证可选（三态，无 secrets 时 ad-hoc 并标注）、Release body 签名状态、Edit 菜单、zip 内 `README.txt`、release 资产/checksum 顺序；未验：真实 Intel、真实签名/公证、Rosetta、图标显示、⌘C/⌘V/⌘Z；体积 `[TBD]`。
  3. 根代理 build 后跑 `node scripts/measure-first-screen.mjs --max 285000`；结果写 `impl-b.md`；预期 283,826，变化 >200 B 需记录原因。
  4. 可选 ADR-0015：universal 默认、`--triple` 两次构建、签名可选三态、否决 `--arch` 主线与 `--deep` 分发签名、UNVERIFIED。
- **验收**
  1. `node -e "console.log(require('./package.json').version)"` = `0.29.0`；lock 两处一致。
  2. CHANGELOG 含 `## 0.29.0 — 2026-11-16`、`universal`、`--require-bundle`、`ad-hoc`、`未验`；不含「已公证」除非签名分支实测。
  3. `measure --max 285000` exit 0，合计 ≤285,000（预期 283,826）；余量写报告；`npm test` 16 文件 205 条全绿。
- **门禁**：`node scripts/measure-first-screen.mjs --max 285000; npm test`
- **风险与回退**：版本先于产物会留空数字，用 `[TBD]` 出包后回填。回退：`git checkout -- package.json package-lock.json docs/CHANGELOG.md`。
- **难度** S ｜ **量级** 60–110 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | B（builder2，先做） | `host-mac/build.sh`、`host-mac/sign.sh`（新）、`host-mac/verify.sh`（新）、`host-mac/Sources/SidelightMac/SelfTest.swift`、`host-mac/Sources/SidelightMac/App.swift`、`host-mac/Info.plist`、`packaging/macos-README.txt`（新）、`.github/workflows/release.yml`、`.github/workflows/ci.yml`、`.gitignore` |
| T2 | B（builder2，T1 后） | `README.md`、`AGENTS.md` |
| T3 | B（builder2，T2 后） | `package.json`、`package-lock.json`（根代理同步）、`docs/CHANGELOG.md`、`docs/adr/0015-*.md`（可选） |

- 零重叠：仅 B 组串行改 `host-mac/`、workflows、文档与 `package.json`；A 组无任务。`package.json`/`package-lock` 只归 T3；`npm test` 仍 16 文件。
- 顺序：T1 → T2 → T3 → 根代理 build + measure + 出包回填。CI 真实验证（`macos-host`、`release.yml` dry-run）由根代理推分支后观察。
- 报告：B 组 `docs/iteration/round-15/impl-b.md`，根代理合并 `impl.md`；无 UI 变化，不截图（macOS 行为未在本机运行）。

## 本轮不做（写进下轮建议）

**真机 macOS GUI、真实 Intel 运行、真实签名/公证**：本机无 macOS/证书，全部 UNVERIFIED；`--arch` 只作备选记录。**付费 Apple Developer Program**：不购买，由人配 secrets。图标真机显示、WKWebView 的 ⌘C/⌘V/⌘Z 实测、Rosetta 执行 x86_64 同样不做。

## 本轮 Demo（≤3 条用户可见变化）

1. macOS 只需一个 `-macos-universal.zip`：Apple Silicon 与 Intel 都能用；包内 `README.txt` 与 README 写明 15+「仍要打开」与 13–14 右键路径。
2. 有 Apple 证书时同一 tag 自动签名 + 公证 + staple；无证书时 Release 首行明确「未签名、未公证」。
3. macOS 应用补上标准 Edit 菜单，`⌘C/⌘V/⌘Z` 可用；zip 内说明数据位置与校验方法。

## 风险最高的任务

**T1**。它依赖两条本机无法执行的能力：arm64 runner 上交叉编译 x86_64（`--triple` 未验证）与 Apple 公证（无证书）。`--show-bin-path` 漏带 `--scratch-path` 会取回默认目录、把 arm64 当两片；`lipo` 放到 `codesign` 之后会毁签名；`if:` 写 `secrets.*` 会让 release workflow `startup_failure`；签名分支忘了 `ditto "$STAGE_DIR"` 会丢 `README.txt`。缓解是 `verify.sh` 的分层断言、`BUILD[@]` 共用数组、「`if:` 内 0 处 `secrets.`」「zip 内含 README」静态断言。次高是 T2：Gatekeeper 文案顺序写反会让每个 macOS 用户多试错一次。

## 下一轮建议主题

**macOS 真机与公证落地**：真机跑 universal（双击、⌘C/⌘V/⌘Z、图标、self-test）；配 `APPLE_*` secrets 后 `workflow_dispatch` + `publish=false` 验签名分支（只看日志）；若 `--triple` 失败，试 `--arch` 并记录；评估是否购买 Apple Developer Program。
