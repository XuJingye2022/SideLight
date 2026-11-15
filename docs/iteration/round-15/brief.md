# 第 15 轮简报

## 上轮结果

- v0.28.1 已发布：Windows setup 817,821 B、Windows zip 901,922 B、macOS arm64 zip 773,067 B。
- 新建文件不再覆盖旧文件；首次使用、P3/P4、release.yml 自动发布都已上线。
- 首屏 283,826 B；测试 16 文件 205 条。

## 本轮目标

1. **macOS Universal 包**：同一 `.app` 同时含 arm64 与 x86_64；CI 在 `macos-latest`（arm64）上交叉编译 x86_64，`lipo` 合并；`--self-test` 仍通过；产物命名 `Sidelight-<版本>-macos-universal.zip`。
2. **签名与公证流程**：在 release workflow 里加可选步骤——有 Apple Developer ID 证书与 Apple ID/团队 ID 时，`codesign --options runtime` + `notarytool submit --wait` + `stapler`；没有 secrets 时保持 ad-hoc 并明确标注「未签名」。
3. 版本 0.29.0；README/CHANGELOG/Release 说明同步；真实 Intel 运行与公证仍标 UNVERIFIED。

## 三个视角

- **发布**：SwiftPM 在 arm64 runner 上交叉编译 x86_64 的可行写法（`--triple`/`--arch`/`lipo`）；Universal 包体积；`lipo -archs` 验证；notarytool 所需 secrets 与步骤；release.yml 的 artifact 命名/校验和。
- **缺陷**：build.sh 组装 `.app` 的坑（SwiftPM 资源、Info.plist、codesign 顺序、zip 后 stapler、x86_64 slice 的 self-test）；release workflow 的 glob/上传/幂等。
- **体验**：macOS 首次打开提示（未签名 vs 已签名/已公证）；Universal 包的下载与说明；Intel 用户的预期。

## 边界

- finder 只读，不改 `host-mac/`、`.github/`；报告写 `docs/iteration/round-15/findings-*.md`；不推 tag、不改 GitHub 设置。
- 本机无 macOS/Apple 证书，真实签名与 Intel 运行只能 UNVERIFIED；以 CI 日志与 `lipo` 为证。
- 端口：应用 `http://localhost:5173`；CDP 9222/9223/9224 各归一个 finder。

## 交付

三份发现，每条带证据、影响、建议、难度；另附优化机会最多 3 条。
