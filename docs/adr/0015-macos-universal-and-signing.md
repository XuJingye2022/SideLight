# macOS 打包：默认 Universal，签名/公证可选

0.28.1 的 macOS 包按 `uname -m` 命名，在 arm64 runner 上产出文件名却写 `-macos-arm64.zip`；打包脚本没有断言，`lipo` 在签名之后会毁签名，zip 里也没有说明文件。用户拿到 Intel Mac 会误以为不支持。

本轮把 macOS 发布形态固定下来：一个 Universal zip；有 Apple 证书就签名 + 公证，没有就走 ad-hoc 并在 Release 首行标注。

## 决定

- **默认 Universal**：`host-mac/build.sh` 用两次 `swift build --triple <arch>-apple-macosx13.0 --scratch-path .tmp/mac/swift-build/<arch>` 分别构建 arm64 与 x86_64。`--package-path`、`--triple`、`--scratch-path` 只在一个 `BUILD` 数组里定义，`--show-bin-path` 复用同一数组（漏一个参数会取回默认 `.build` 目录，把 arm64 当成两片）。
- **每片先验证再合并**：`lipo -archs` 必须恰好返回单一架构；`lipo -create` 后断言两片齐全、`file` 报 universal、两片 `otool -arch <arch> -l` 的 `minos` 都是 13.0。顺序固定为 **lipo → 复制进 `.app` → codesign**（先签再 lipo 会毁签名）。
- **命名固定**：`Sidelight-<版本>-macos-universal.zip`，删除按 `uname -m` 命名；打包前清掉旧的 `release/*-macos-*.zip`。
- **zip 根目录**：`STAGE_DIR` 里有 `Sidelight.app` 与 `README.txt`，用 `ditto -c -k --sequesterRsrc "$STAGE_DIR"` 打（不带 `--keepParent`，否则根目录会多一层 stage）。
- **x86_64 失败不降级**：`--triple` 失败先试 `--arch x86_64` 并记录日志；仍失败打印 `::error::x86_64 片未产出，Universal 未产出，禁止发布` 并 exit 1；**禁止把 arm64 复制成 x86_64 或改名成 universal**。
- **签名/公证可选三态**：
  1. 无 Apple secrets：ad-hoc 签名（`codesign --force --sign -`），Release 首行标注「**未签名、未公证**」。
  2. 有 secrets 且成功：`sign.sh` 建临时 keychain、导入证书、`codesign --options runtime --timestamp --keychain`（**不加 `--deep`**）、`notarytool submit --wait`、`stapler staple`，再用 `STAGE_DIR` 重打 zip（保住 `README.txt`），Release 首行标注「**已签名并公证**」。
  3. 有 secrets 但证书/公证失败：job 失败，不静默降级成 ad-hoc。
- **self-test 只认 .app**：`--self-test --require-bundle` 在非 `.app` 环境直接失败，不回退当前目录；断言首页 200 + `id="root"`、静态 JS、`/__doc`、`/__recent`、未知路径 404、`Host: evil` 403（用 NWConnection 发原始请求，URLSession 不保证自定义 Host）。
- **发布资产顺序确定**：release job 先断言 3 个资产，按显式文件名生成 `SHA256SUMS-<版本>.txt`，再断言 4 个文件，最后 `sha256sum -c`；`workflow_dispatch` 必须有 `tag`；同 tag 重跑用 `overwrite_files` 并删除旧的、按架构命名的资产。

## 否决的方案

- **只发 arm64，Intel 用 Rosetta**：Rosetta 需要用户装，且不是所有 Intel Mac 都能装到新系统；Universal 一次解决。
- **`--arch` 作为主线**：`--arch` 会复用默认 scratch 目录，交叉编译行为不可控；`--triple` 更明确，`--arch` 只当备选。
- **`codesign --deep` 分发签名**：会连内嵌框架一起重签，掩盖逐层签名问题；逐层签名 + `--all-architectures` 校验更可靠。
- **签名分支直接用原 zip 提交公证**：原 zip 根目录有 `README.txt`，公证只应针对 `.app`；staple 后重打 zip。
- **无条件跳签名**：有证书却静默 ad-hoc 会让用户以为已公证。

## 未验（本机无 macOS/证书）

- 真实 Intel Mac 运行与 Rosetta。
- 真实 Developer ID 签名 + 公证 + staple（只做了静态审查）。
- 图标在 Finder/Dock 的真机显示。
- WKWebView 的 ⌘C/⌘V/⌘Z（Edit 菜单由 first responder 处理，未真机按键）。
- `--triple x86_64` 在 macos-latest 上能否编过（CI 首次实跑才知）。

## 状态

2026-11-16 接受（0.29.0）。
