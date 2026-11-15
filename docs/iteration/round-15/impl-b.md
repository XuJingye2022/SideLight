# 第 15 轮 · 实施报告 B（builder2）

执行人：builder2。T1（Universal + self-test + 签名/公证 + Edit 菜单 + 发布流程）→ T2（README/AGENTS）→ T3（0.29.0）。本机是 Windows，**没有编译/运行过 macOS**；CI 是唯一验证。未 commit、未跑 `npm run build`（首屏用现有 `dist` 量的）。

---

## T1 macOS Universal / self-test / 签名 / 发布流程 —— 静态 PASS（CI 待实跑）

### 改动

- `host-mac/build.sh`（重写）
  - 默认 Universal：arm64 与 x86_64 各一次 `swift build --triple <arch>-apple-macosx13.0 --scratch-path .tmp/mac/swift-build/<arch>`；`BUILD` 数组只定义一处，`--show-bin-path` 复用同一数组；`test -f` 断言产物。
  - 每片 `lipo -archs` 断言单一架构 → `lipo -create` → 合并后断言两片齐全 + `file` 报 universal；顺序固定 lipo → 复制进 `.app` → codesign。
  - x86_64 失败先试 `--arch x86_64` 并记录；仍失败 `::error::x86_64 片未产出，Universal 未产出，禁止发布` + exit 1。
  - 产物 `Sidelight-<版本>-macos-universal.zip`（删除 `uname -m` 命名）；`STAGE_DIR` 含 `.app` 与 `README.txt`，`ditto -c -k --sequesterRsrc "$STAGE"` 打包；打包前清旧 macos zip。
  - 图标失败输出 `::warning::`；ad-hoc 签名后调 `verify.sh`，打包后再调一次（带 zip）。
  - `--single-arch` 仅本地调试，CI/发布不传。
- `host-mac/verify.sh`（新）：`Resources/www/index.html`、`lipo -archs` 两片（单切片直接失败）、`file` universal、两片 `otool -arch … minos`=13.0、`plutil -lint` 与 `LSMinimumSystemVersion`=13.0、`codesign --verify --strict --all-architectures`、`unzip -t`、zip 内 `README.txt`。
- `host-mac/sign.sh`（新）：`create-keychain` → `set-keychain-settings -lut 21600` → `unlock-keychain` → `import` → `set-key-partition-list` → `list-keychains -d user -s` → `find-identity` 断言 Developer ID → `codesign --options runtime --timestamp --keychain build.keychain`（无 `--deep`）→ 公证 zip 只装 `.app` → `notarytool submit --wait` + `status: Accepted` 断言（失败打印 log）→ `stapler staple` + `validate` + `spctl` → `ditto "$STAGE"` 重打发布 zip → EXIT trap 恢复 keychain。
- `SelfTest.swift`（重写）：`--require-bundle` 必须在 `.app` 内，否则直接失败、**无 cwd/dist 回退**；6 项断言（首页 200 + `text/html` + `id="root"`、静态 JS 200 + `text/javascript`、`/__doc` v=1、`/__recent` v=1 + items 数组、未知路径 404、`Host: evil` 403 用 `NWConnection` 原始 socket）；10 × 0.2 s 就绪轮询；逐项 PASS/FAIL，失败 exit 1。
- `App.swift`：Edit 菜单（撤销/重做/剪切/拷贝/粘贴/全选），全部 `target = nil`，`undo:`/`redo:` 走 first responder 的 `undoManager`；`www/index.html` 缺失时 `NSAlert` + `exit(1)`。
- `Info.plist`：`CFBundleIconFile = Sidelight.icns`。
- `packaging/macos-README.txt`（新）：Gatekeeper 三档、签名三态、Intel、数据位置、校验方式。
- `release.yml`：
  - `workflow_dispatch` 加必填 `tag`；所有 checkout `ref: ${{ inputs.tag || github.ref }}`；preflight 校验 `v<package.json version>` 且 CHANGELOG 有该节。
  - `macos-build`：`timeout-minutes: 60`；job env `HAS_APPLE_SIGNING` + 六个 `APPLE_*` secrets；签名 step `if: env.HAS_APPLE_SIGNING == 'true'`（`if:` 内 0 处 `secrets.`）；写 `signing.txt`（首行中文「未签名、未公证」/「已签名并公证」）；`--self-test --require-bundle` + `verify.sh`。
  - `release`：`contents: write` 只在此 job；先断言 3 个资产 → 显式文件名生成 `SHA256SUMS-<版本>.txt` → 断言 4 个文件 → `sha256sum -c` → 删除旧 `-macos-arm64.zip` → `overwrite_files: true` + `append_body`；workflow 级 `concurrency: release-<ref>`。
- `.gitignore`：加 `.build/`、`host-mac/.build/`、`*.app`。
- `ci.yml`：macOS job 改 `.tmp/mac/stage/Sidelight.app`，加 `--require-bundle` 与 `host-mac/verify.sh`。

### 静态断言（本地全过，值见下）

```text
build.sh：8 个关键串齐，BUILD[@]=4，uname -m=0
verify.sh：6 个关键串齐
sign.sh：10 个关键串齐
SelfTest.swift：--require-bundle / id="root" / /__recent / 403 / 404 齐，cwd/dist=0
App.swift：target = nil / undoManager / undo: redo: cut: copy: paste: selectAll: 齐
release.yml：inputs.tag / 3 资产 / SHA256SUMS- / 4 文件 / sha256sum -c / append_body / concurrency / timeout 60 / HAS_APPLE_SIGNING 齐；if:.*secrets.=0；contents: write=1
Info.plist CFBundleIconFile=1；packaging/macos-README.txt 存在；ADR-0015 存在
```

---

## T2 README / AGENTS —— 完成

- README 下载段：macOS 改 **Universal（Apple Silicon + Intel，macOS 13+）** `Sidelight-<版本>-macos-universal.zip`，zip 内含 `README.txt`；Gatekeeper 两档按顺序（15+：先双击一次 → 系统设置 → 隐私与安全性 → 仍要打开 → 再打开；13–14：右键 → 打开）；`xattr -dr com.apple.quarantine "<App 路径>"`（占位路径）；「已损坏先别重下」「每次更新后重做」；`shasum -a 256` 对照 `SHA256SUMS-<版本>.txt`；签名三态；从 0.28.1（arm64）升级与「关于本机 → 芯片」。
- 「数据与隐私」补 macOS 路径（`~/Library/Application Support/Sidelight`）、换包不丢数据、只保留一个 `Sidelight.app`、不改 `CFBundleIdentifier`；补 File/Edit 菜单与「`Ctrl` 在 macOS 换成 `Cmd`」。
- README 不含 `macos-arm64`、旧字节、旧 hash、`Sidelight-0.28.1-win`（断言 0）。
- AGENTS §6：0.29.0、Universal、macOS 默认 ad-hoc / 有 secrets 时签名公证、CI 必过；未验加真实 Intel、Rosetta、真实签名/公证、图标、⌘C/⌘V/⌘Z。

---

## T3 0.29.0 —— 完成

- `package.json` 与 `package-lock.json` 都是 **0.29.0**。
- CHANGELOG `## 0.29.0 — 2026-11-16`：Universal（两次 `--triple`、lipo 断言、minos 13.0）、self-test `--require-bundle` 6 项、签名/公证三态、release 资产/checksum 顺序、Edit 菜单、zip 内 README；体积与 SHA `[TBD]`。
- `node scripts/measure-first-screen.mjs dist --max 285000` → **283,826 B**（JS 277,265 + CSS 6,561），PASS，余 1,174 B；与 0.28.1 实测一致（前端未改）。
- `npm test` 16 文件 205 条 exit 0。
- 新增 `docs/adr/0015-macos-universal-and-signing.md`；README ADR 索引 `0001–0015`。

---

## CI 需要验证的点（下一轮根代理推分支后观察）

1. `macos-host`：`--triple x86_64` 能否在 macos-latest 编过；失败时 `--arch` 备选是否生效；`lipo`/`minos`/`codesign` 断言是否全绿。
2. `release.yml`：`workflow_dispatch` + `tag` + `publish=false` 的 dry-run 能否出 3 个 artifact；`release` job 的 3→4 文件断言与 `sha256sum -c` 是否通过。
3. secrets 分支：配 `APPLE_*` 后签名/公证是否成功；`signing.txt` 是否正确标注；staple 后 zip 内 `README.txt` 是否还在。
4. `--self-test --require-bundle` 的 `Host: evil` 403（原始 socket）是否通过。

## 遗留

1. 真实 Intel Mac、Rosetta、真实签名/公证、图标显示、⌘C/⌘V/⌘Z 全 **UNVERIFIED**（本机无 macOS/证书）。
2. CHANGELOG 0.29.0 的体积与 SHA `[TBD]`，等 root 出包回填（或写「见 Release `SHA256SUMS-0.29.0.txt`」）。
3. `--triple` 交叉编译与 `--arch` 备选未在本机验证。
