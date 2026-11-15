# 第 15 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-15/plan.md`（v0.28.1）。
审查方式：读计划、三份 findings、`host-mac/build.sh`、`App.swift`、`.github/workflows/release.yml`、`ci.yml`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（`--show-bin-path` 漏 `--scratch-path`，Universal 取错 bin）、H2（`sign.sh` 的 keychain 没有 unlock/list/`codesign --keychain`）是 blocker；H3–H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:13` 两次 `swift build` 都带 `--scratch-path "$ROOT/.tmp/mac/swift-build/<arch>"`，但取目录只写「`--show-bin-path` 必须带同一 `--triple`」，**没写同一 `--scratch-path`**。`swift build --show-bin-path --triple x86_64…` 默认仍指向 `.build/<triple>/release`，不是自定义 scratch；`BIN` 会指向不存在/旧目录，或把 arm64 默认路径当 x86_64，后续 `lipo -archs` 才报「同架构」。 | `plan.md:13`；`findings-bug.md:27-28,41-48`；`host-mac/build.sh:12-13`（当前 show 不带 triple） | `--show-bin-path` 与 build 带**完全相同的** `--package-path`、`--triple`、`--scratch-path`；取到后先 `test -f "$BIN"`；对每片 `lipo -archs` 断言单一架构；补「show 路径不存在」静态断言 | T1 |
| H2 | blocker | T1 `:16` 的 `sign.sh` 只写「临时 keychain → `security import` + `set-key-partition-list` + `find-identity`」，**没有 `security unlock-keychain`、没有 `security list-keychains -s build.keychain`、`codesign` 也没带 `--keychain build.keychain`**。证书导入到独立 keychain 后，`codesign` 默认搜索 login keychain，常见结果是 `errSecInternalComponent` 或直接找不到 identity。 | `plan.md:16`；`findings-bug.md:137,154-160`；`host-mac/build.sh:45` | `security create-keychain` → `set-keychain-settings -lut 21600` → `unlock-keychain -p` → `import` → `set-key-partition-list -S apple-tool:,apple:,codesign:` → `list-keychains -d user -s build.keychain` → `find-identity -v -p codesigning`；`codesign --keychain build.keychain`；清理时 `list-keychains` 恢复并 `delete-keychain` | T1 |
| H3 | major | T1 `:20` 的 zip 结构是「暂存目录内含 `.app` + `README.txt`」，但 `:16` 的 `sign.sh` 在公证后「重新 ditto 出发布 zip」，写法只有 `APP`，没有接收暂存目录；**签名分支的最终 zip 会丢 `README.txt`**。公证临时 zip 只放 `.app` 是对的，但最终发布 zip 必须复用 build 的暂存目录。 | `plan.md:16,20`；`findings-bug.md:133-135,171-172` | `sign.sh` 入参改成 `STAGE_DIR`/`APP`/`ZIP`：公证用 `ditto "$APP"` 临时 zip；staple 后 `ditto "$STAGE_DIR"` 出发布 zip；`verify.sh` 加 `unzip -l "$ZIP" | grep -q 'README.txt'`；补「签名分支 zip 含 README」断言 | T1 |
| H4 | major | T1 `:17` 写「release job 断言 `ls out | wc -l` = 3 且用显式文件名生成 `SHA256SUMS`」。若 checksum 先生成，`out` 变 4，断言失败；若断言在前，checksum 后又没有「3 个包 + 1 个 checksum」的最终断言。`append_body` 与 `generate_release_notes` 的追加顺序、重跑时旧 arm64 资产也只在注释里说「手工删」，没有自动守卫。 | `plan.md:17`；`findings-bug.md:192-198`；`release.yml:148-171`（当前 `sha256sum *`） | 下载后先 `find out -type f \( -name '*.exe' -o -name '*.zip' \) | wc -l`=3；显式三个文件名生成 `SHA256SUMS-<版本>.txt`；再断言 `out` 共 4 个文件；`sha256sum -c`；`append_body` 写签名状态；重跑时 `gh release view` 删除旧名资产或明确只支持新 tag | T4 |
| H5 | major | T1 `:13`/`:31` 依赖 `--triple x86_64-apple-macosx13.0` 在 `macos-latest`（arm64）上交叉编译成功，但计划没有失败分支：若 SDK 去掉 x86_64 slice 或 SwiftPM 拒绝 triple，`build.sh` 直接红，release 无法出包；备选 `--arch`/Intel runner 只在 findings 里提，没进脚本。 | `plan.md:13,31`；`findings-bug.md:262`；`host-mac/build.sh` 当前无 triple | 在 `build.sh` 里检测 x86_64 构建失败：`--triple` 失败时打印 `::warning::` 并尝试 `--arch x86_64`（若可用），仍失败则明确「Universal 未产出，禁止发布」；CI 记录 `swift --version`/`xcodebuild -version`/`sw_vers`；不要把单架构包改名成 universal | T1 |
| H6 | major | T1 `:19` 的 Edit 菜单用 `undo:`/`redo:`/`cut:`/`copy:`/`paste:`/`selectAll:` 标准 selector，但没有写 target 为 nil、依赖 first responder，也没有写 `WKWebView` 的 `undoManager` 路径；`keyEquivalent` 交给系统后，与网页 `Cmd+Z/C/V/A` 的冲突/重复处理未说明。 | `plan.md:19`；`host-mac/Sources/SidelightMac/App.swift:89-119`（当前只有 File 菜单） | 菜单项 `target = nil`、`action = #selector(...)`；`undo:`/`redo:` 走 `WKWebView.undoManager`（或 `NSApp.sendAction`），`cut/copy/paste/selectAll` 走 first responder；补真机 `⌘C/⌘V/⌘Z` 测试；不要给网页快捷键另发一次事件 | T1 |

---

## H1（blocker）`--show-bin-path` 必须带 scratch

计划 `:13`：

```
swift build ... --triple arm64-apple-macosx13.0 --scratch-path "$ROOT/.tmp/mac/swift-build/<arch>"
...
各自 `--show-bin-path | tail -1` 取目录（show 命令必须带同一 `--triple`）
```

`--scratch-path` 改了 `.build` 根；`--show-bin-path` 不带同一 `--scratch-path` 时仍返回默认 `.build/<triple>/release`。两个后果：

- `BIN` 指向不存在的目录，`cp` 失败（至少是显式红，不会假绿）；
- 若默认 `.build` 有旧产物，`BIN` 取到宿主架构，`lipo -create` 报同架构；排查会先怀疑 lipo，而不是 show 路径。

**修**：

```bash
BUILD=(swift build -c release --package-path "$HOST" --triple "$TRIPLE" --scratch-path "$SCRATCH")
"${BUILD[@]}"
BIN="$("${BUILD[@]}" --show-bin-path | tail -1)/SidelightMac"
test -f "$BIN"
```

`--show-bin-path` 与 build 使用同一个数组，避免漏参；每片先 `lipo -archs` 断言单一架构。

## H2（blocker）`sign.sh` 的 keychain 没进 codesign 搜索链

findings B3 `:137`：

> 缺 `security set-key-partition-list` 或没 `security unlock-keychain` 时，`codesign` 会挂起或报 `errSecInternalComponent`。

计划 `:16` 有 `set-key-partition-list`，但没有：

- `security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain`
- `security list-keychains -d user -s build.keychain`
- `codesign --keychain build.keychain`

只 `security import -k build.keychain` 不会让 `codesign` 自动在 build.keychain 里找 identity。**修**：

```bash
security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
security set-keychain-settings -lut 21600 build.keychain
security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
security import cert.p12 -k build.keychain -P "$CERT_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain
security list-keychains -d user -s build.keychain
security find-identity -v -p codesigning build.keychain | grep -q 'Developer ID Application'
codesign --force --options runtime --timestamp --keychain build.keychain --sign "$IDENTITY" "$APP"
```

清理时恢复 `list-keychains` 并 `delete-keychain`。

## H3（major）签名分支重新 zip 会丢 README

计划 `:20` 让 `build.sh` 用暂存目录：

```
stage/
  Sidelight.app
  README.txt
```

`sign.sh` 公证用临时 zip 只放 `.app`，正确；但 `:16` 的「重新 ditto 出发布 zip」如果只 `ditto "$APP"`，最终 zip 根目录只有 `.app`，`README.txt` 丢失。

**修**：`sign.sh` 接收 `STAGE_DIR`；公证 zip 用 `ditto "$APP"`；staple 后 `ditto "$STAGE_DIR"` 出发布 zip；`verify.sh` 加 `unzip -l | grep README.txt`。补「签名分支 zip 含 README」断言。

## H4（major）release 的 3 个资产与 checksum 顺序

计划 `:17` 同时要求：

- `ls out | wc -l` = 3；
- 用显式文件名生成 `SHA256SUMS`。

顺序不清：

- 先 checksum → `out` 有 4 个文件，`ls | wc -l`=4，断言失败；
- 先断言 → 生成 checksum 后没有最终「3 包 + 1 checksum」断言，仍可能多/少文件。

**修**：

```bash
find out -type f \( -name '*.exe' -o -name '*.zip' \) | wc -l  # 3
sha256sum "Sidelight-${VERSION}-win-x64-setup.exe" ... > "SHA256SUMS-${VERSION}.txt"
find out -type f | wc -l  # 4
sha256sum -c "SHA256SUMS-${VERSION}.txt"
```

`append_body` 追加签名状态；重跑时 `gh release view --json assets` 删除旧 arm64，或明确只支持新 tag。

## H5（major）x86_64 交叉编译没有失败分支

`macos-latest` 是 arm64；`--triple x86_64-apple-macosx13.0` 在当前 SwiftPM/SDK 上是否可编，计划只写「预期能过」（`:31`）。若失败：

- `build.sh` 直接红，release job 失败；
- 若有人为了绿把 arm64 复制成 x86_64 或改回单架构，`verify.sh` 的 `lipo -archs` 应能抓到，但计划没有明确「不能用单架构冒充 universal」的失败文案。

**修**：`build.sh` 对 x86_64 构建失败给明确 `::error::`「x86_64 片未产出，禁止发布 universal」；尝试 `--arch x86_64` 作为备选并记录；CI 日志打印 `swift --version`/`xcodebuild -version`/`sw_vers`；`verify.sh` 在 `lipo -archs` 只有一片时直接失败。

## H6（major）Edit 菜单与 WKWebView

计划 `:19`：

> `buildMenu()` 加标准 Edit 菜单（`undo:`/`redo:`/`cut:`/`copy:`/`paste:`/`selectAll:`，`keyEquivalent` 交给系统）

要写清：

- 菜单项 `target = nil`，依赖 first responder；
- `undo:`/`redo:` 对 `WKWebView` 走 `undoManager`（或 `NSApp.sendAction`），不能只挂 selector 不实现；
- `cut/copy/paste/selectAll` 走 first responder；
- 菜单 `keyEquivalent` 与网页快捷键不要重复发事件；
- 真机 `⌘C/⌘V/⌘Z` 测试（本机 UNVERIFIED）。

## 逐项核对记录

### T1
- Universal 两次 `--triple`、`--scratch-path` 隔离、lipo 前单架构断言、lipo 后再 codesign、`otool` minos、`file/lipo` 断言，方向对；`--show-bin-path` 漏 scratch 是 H1。
- `verify.sh` 的 `lipo/file/otool/plutil/codesign/unzip` 方向对；能抓「两片同架构」；但 `codesign --verify` 放在签名后、`unzip -t` 之前要写死顺序。
- `--require-bundle`、6 项路由、10×0.2 s 轮询、`NSAlert`，方向对；`Host: evil` 用 URLSession 能否真正发出 Host 头未验证，建议用 raw socket 或 `URLProtocol` 断言。
- 签名顺序「签名→临时 zip→notary→staple app→重新 zip」正确；keychain 缺 unlock/list/`--keychain`（H2）、重新 zip 丢 README（H3）、`--timestamp` 无重试是风险。
- `HAS_APPLE_SIGNING` job env + `if: env...` 方向对；必须静态断言 `if:` 内无 `secrets.`；`timeout-minutes: 60` 正确。
- `release.yml` tag 输入、checkout ref、concurrency、append_body、精确资产名方向对；3 资产/checksum 顺序是 H4。
- `App.swift` Edit 菜单方向对；target/undoManager/冲突是 H6。

### T2
- README macOS 15+/13–14 两档、Universal、数据位置、Ctrl→Cmd、签名状态，方向对；不要写「已公证」除非签名分支实测（计划已写）。

### T3
- 0.29.0、CHANGELOG `[TBD]`、首屏 283,826 预期，方向对；`measure --max 285000` 与 `package-lock` 一致。
- 无前端改动，测试数不变。

### 通用
- 文件归属：仅 B 组串行改 `host-mac/`、workflows、文档、`package.json`；A 无任务，零重叠成立。
- 构建纪律：B 不跑 `npm run build`；首屏由根代理 measure；成立。
- 可独立复现：`verify.sh`、self-test、release dry-run 可复现；真实 Intel/公证/图标/⌘C/⌘V 仍 UNVERIFIED。

## 做对的地方（别改过头）

1. Universal 用两次 `--triple` + 单架构 `lipo -archs` 断言 + lipo 后 codesign，方向正确；只需把 `--show-bin-path` 的 scratch 补上。
2. 公证顺序「sign → notary zip → staple `.app` → re-zip」正确；只需给 `sign.sh` 暂存目录，别丢 README。
3. `--require-bundle` 禁止 `cwd/dist` 回退、6 项路由、Host 403、10×0.2 s 轮询，是 B2 的正确修法；保留。

---

### 附：本次审查证据

- `plan.md:13-20`（Universal/show/签名/zip）、`:17`（release 3 资产）。
- `findings-bug.md:27-28,41-48`（show 路径/同架构）、`:133-137,154-160`（签名顺序/keychain）、`:192-198`（release glob/checksum）。
- `host-mac/build.sh:12-13,45,48-51`；`host-mac/Sources/SidelightMac/App.swift:89-119`。
- `.github/workflows/release.yml:106-133`（macos 30 分钟、self-test 无 require-bundle）、`:148-171`（sha256sum *、release）。
- 未改产品文件、未 commit；未生成新截图。
