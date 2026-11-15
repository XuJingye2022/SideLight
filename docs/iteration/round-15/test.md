# 第 15 轮 · 独立验收（tester）

日期：2026-11-16。基线 v0.28.1，v0.29.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 200；无法本机运行 macOS/Swift/Apple 证书，macOS 部分以 CI、Release 资产和静态审查为准。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，127 modules，**0 warning** | `.tmp/r15-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r15-test.log` |
| `measure --max 285000` | **PASS**；首屏 **283,826 B**（余 1,174 B） | `.tmp/r15-measure.log` |

## T1 macOS Universal / self-test / 签名：**PASS-WITH-UNVERIFIED**

- CI **43771388636**：`macos-host` **success**；步骤 `Build macOS app`、`Self-test (bundle, 6 assertions)`、`Verify app bundle and zip`、`Upload macOS zip` 全 success；`install-verify` skipped（符合手动策略）。
- Release **43772307350**：preflight / windows-build / macos-build / release **四 job success**；macOS `Sign and notarize` **skipped（无 secrets）**，`Record signing status`、self-test、verify、upload success；release job `sha256sum -c` 与 publish success。
- Release v0.29.0 资产实测：setup **817,994 B**、win zip **901,920 B**、mac universal zip **889,644 B**、`SHA256SUMS-0.29.0.txt` **308 B**；三文件本地 SHA256 与 sums **全部一致**。
- mac zip 解包：根目录 `Sidelight.app` + `README.txt`（2,367 B）；`Contents/MacOS/SidelightMac` **686,080 B**，Mach-O fat `CAFEBABE nfat=2`，cputype **0x1000007 (x86_64)** / **0x100000C (arm64)**；`LSMinimumSystemVersion=13.0`；`CFBundleIconFile=Sidelight.icns`；`_CodeSignature/CodeResources` 存在。
- 静态：`verify.sh` 含 `lipo -archs`、`otool` minos、`codesign --verify --strict --all-architectures`、`unzip -t`、README 检查；`build.sh` 有 `BUILD=(` 共用数组、`--show-bin-path`、`lipo -create`、`macos-universal`、`::error::`。
- 签名分支静态：release job env `HAS_APPLE_SIGNING` + 六个 secrets；`if: env.HAS_APPLE_SIGNING == 'true'`，**`if:` 内 0 处 `secrets.`**；`sign.sh` 有 create/set/unlock/list-keychains、set-key-partition-list、find-identity、`--keychain build.keychain`、`codesign`（签名命令无 `--deep`）、`notarytool submit`、`stapler staple`、用 `STAGE` 重打 zip。
- Release body：**「未签名、未公证」（ad-hoc；signing=adhoc）**。
- **UNVERIFIED**：真实 Intel Mac 运行、Rosetta、真实 Developer ID 签名/公证、macOS 15+「仍要打开」真机交互、⌘C/⌘V/⌘Z、图标真机显示、真实 macOS IME/拖放。

## T2 README / Gatekeeper / 数据：**PASS**

- README 有 `macos-universal`、macOS 15+「先双击一次 → 仍要打开」与 13–14「右键 → 打开」两档、`xattr -dr com.apple.quarantine`、`~/Library/Application Support/Sidelight`、从 0.28.1 升级说明、`Cmd + S`、`关于本机`；无 `macos-arm64`/`Sidelight-0.28.1-win`/`[TBD]`。
- `README.txt`（zip 内）2,367 B；含安装、Gatekeeper 三档、数据位置、校验和说明。
- `AGENTS.md` 0.29.0/Universal/签名三态/未验清单已更新。

## T3 版本 / CHANGELOG / 首屏：**PASS**

- `package.json`/`package-lock.json` **0.29.0**；CHANGELOG 0.29.0 有 Universal、`--require-bundle`、ad-hoc/签名三态、未验、体积 `[TBD]` 已回填；首屏 283,826 ≤285,000。
- 无 `[TBD]`；Release 资产和 checksum 由 workflow 生成；`release/SHA256SUMS-0.29.0.txt` 本地不存在，以上传的 Release 为准。

## Windows 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| acceptance dev / prod | **11/11 / 11/11** | `.tmp/r15-acceptance-dev.log`、`-prod.log` |
| host-save-acceptance | **64/64** | `.tmp/r15-host-save.log` |
| host-smoke --fsa | **7/7** | `.tmp/r15-host-smoke.log` |
| tree-acceptance | **45/45** | `.tmp/r15-tree.log` |
| keyboard-acceptance | **31/31** | `.tmp/r15-keyboard.log` |
| math-ready-acceptance | **11/11** | `.tmp/r15-math.log` |
| fcp-probe | **6/6** | `.tmp/r15-fcp.log` |
| 额外 `save-acceptance` | **23/25**：提示仍写「示例 · 未命名.md」（实际 示例 · 侧灯.md）；六态撤销回基线 dirty=false 未过 | `.tmp/r15-save.log` |
| portable（本地 0.28） | **6/6** | `.tmp/r15-portable-local.log` |
| verify-installer（本地 0.28） | 上轮通过；0.29 setup 仅资产校验 | — |

- `save-acceptance` 不是本轮指定的 64 项 host-save 门；其两处失败是首用示例名改动后的旧断言 + 撤销 dirty，需另修，未计入本轮 host-save 64/64。
- 0.29 的 Windows setup/zip 已按 Release checksum 校验；0.29 安装/便携运行未在本机执行（本地 release 只有 0.28），**UNVERIFIED**。

## 范围

- `git status`：5 个已跟踪截图改动（回归二进制）、0 删除、1 项未跟踪（本报告）；`release/`、`.build/`、`.tmp/`、`host/bin/`、`dist/` 未入库；无证书/私钥/`APPLE_*` 秘密；`git ls-files release host/bin dist .build` 0。
- 下载的 0.29 资产在 `.tmp/r15-release`，未入库；本地 `release/SHA256SUMS.txt` 仍是 0.26 旧文件（release 忽略，注意清理）。

## 判定

**PASS-WITH-UNVERIFIED**

- Universal 构建、CI/release 四 job、self-test/verify、三资产 checksum、fat 双片、README、release body 与签名静态分支均通过；真实 macOS 运行/签名/公证/⌘ 键/Intel 仍 UNVERIFIED。
- 需跟进：额外 `save-acceptance` 23/25（旧名与撤销 dirty）不在本轮要求，但不能当作已通过；0.29 Windows 安装/便携运行待真机。
