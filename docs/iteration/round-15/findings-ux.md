# 第 15 轮 · macOS 首次打开体验（finder: r15-ux）

- 仓库：`D:\Documents\SidelightProgram`，v0.28.1。只读侦察：未改 `src/`、`host-mac/`、`.github/`；新增仅 `docs/iteration/round-15/findings-ux.md`、`shots/round-15/*.png`、`.tmp/shot-r15-release.mjs`。
- 本机是 Windows 11，无 macOS 真机、无 Apple Developer 证书。**macOS 系统对话框文案、Gatekeeper 实际行为、Intel/Universal 运行一律 UNVERIFIED**，以 Apple 官方页与三个一手/旁证为依据，并在文末给出真机验证步骤。
- 界面证据是 headless Edge（CDP 9224）对 GitHub 实际渲染的截图，不是示意图：
  - [release-v0.28.1-assets.png](../../../shots/round-15/release-v0.28.1-assets.png)（Release 页：只有 `Full Changelog` + 4 个构建资产（另 2 个源码包），无任何打开说明）
  - [readme-download-section.png](../../../shots/round-15/readme-download-section.png)（README 下载段：macOS 只有 1 条，且以「右键 →「打开」」开头）

## 影响排序

| 编号 | 问题 | 用户后果 | 难度 |
| :--- | :--- | :--- | :--- |
| U1 | 首次打开路径过时、顺序反了，且 Release 页与 zip 内零说明 | 下载后打不开，去搜「Sidelight 已损坏」 | S–M |
| U2 | Universal 只在文件名里体现，Intel 用户无提示 | Intel 拿 arm64 包直接启动失败，以为软件坏了 | S |
| U3 | 签名/公证没有三态，Release 页不标「未签名」 | 有证书时说明仍是旧的；无证书时下载点看不到「未签名」 | M |
| U4 | 换包是否保留数据没有说明，macOS 数据路径文档缺失 | 用户不敢换包；想清理时找不到数据 | S |
| U5 | 快捷键/菜单按 Windows 写，macOS 的 Edit 菜单缺失且未验 | 按 `Ctrl`/`Cmd` 都对不上，复制粘贴有风险 | S–M |

---

## U1 · 首次打开：文案把 macOS 13–14 的路径放前面，macOS 15+ 只用「可能」带过；Release 页与 zip 内一条说明都没有

**证据（文案，逐处）**

- `README.md:12`：
  > macOS（Apple Silicon / arm64）：`Sidelight-<版本>-macos-arm64.zip`。**未签名、未公证**：首次打开请右键点 App →「打开」；macOS 15 起右键「打开」**可能**不再生效，去「系统设置 → 隐私与安全性 → 仍要打开」；也可以执行 `xattr -dr com.apple.quarantine /Applications/Sidelight.app`。
- 同一句里的三个可执行缺陷：
  1. 主路径是 macOS 13–14 的「右键 →「打开」」；2026-11 的现实是 macOS 15/26/27 为主，「可能不再生效」会让用户先试错一次。
  2. 没说「先双击一次」。Apple 官方页写的是 **After you've tried to open the app** 才去「系统设置 → 隐私与安全性 → 仍要打开」；没先双击，设置里可能没有这个按钮（[support.apple.com/102445](https://support.apple.com/en-us/102445)）。
  3. `xattr` 命令写死 `/Applications/Sidelight.app`；App 还在「下载」里时命令直接报 `No such file`，用户会以为命令错。
- 官方页现在的唯一放行路径：`Open System Settings → Privacy & Security → Open Anyway → Open`，并写「The app is now saved as an exception… you can open it in the future by double-clicking it」。页面已不再提供右键 Open（Apple 102445）。
- macOS 15 起右键 Open 被移除、警告框只剩「移到废纸篓 / 完成」的迁移记录：[amd/gaia 提交](https://github.com/amd/gaia/commit/24e7584b569d8f7eccbd2422818425d10b687b3e)。
- **Release 页没有任何说明**：`release.yml:166` 只有 `generate_release_notes: true`；v0.28.1 Release 的 `body` 实测只有一行 `**Full Changelog**: …compare/v0.28.0...v0.28.1`（GitHub API，2026-11-16）。截图里 4 个构建资产排成一行（另 2 个源码包），macOS 用户看不出该下哪个、怎么开。
- **zip 内没有说明**：`host-mac/build.sh:51` 只 `ditto` 了 `.app`（`--keepParent`），zip 里只有 `Sidelight.app`。Windows 便携 zip 里有 `packaging/README.txt`（46 行，含「更多信息 → 仍要运行」），macOS 没有对应物。
- 另一个真实分支没写：「已损坏，移到废纸篓」。未签名/签名不完整的包在 Gatekeeper 下会报这个（ad-hoc 签名后的实际文案未核实，见文末 UNVERIFIED）；用户的第一反应是重新下载，重下多少次都一样。
- 「每次更新都要重做一遍」也没写。Gatekeeper 的例外是按文件记的，替换 App 后失效（除非已公证）。

**具体改法（可直接替换 `README.md:12-13`）**

```markdown
- **macOS（Universal：Apple Silicon + Intel，macOS 13 或更新）**：`Sidelight-<版本>-macos-universal.zip`。
  **未签名、未公证**（ad-hoc 签名）。首次打开按系统版本二选一：
  - **macOS 15 及更新（含 26、27）**：把 App 拖进「应用程序」，先双击一次；出现警告后打开
    「系统设置 → 隐私与安全性」，在最下面的「安全性」点「仍要打开」，再点「打开」。
    警告框只有「完成」，没有「打开」，这是正常的。
  - **macOS 13–14**：右键 App →「打开」→「打开」。
  - 不想进系统设置：终端执行
    `xattr -dr com.apple.quarantine "/Applications/Sidelight.app"`
    （路径按 App 实际位置改；有空格要加引号）。
  - 提示「已损坏」时先别重新下载：这也是 Gatekeeper 拦截，按上面任一方式处理。
  - 校验下载：`shasum -a 256 Sidelight-<版本>-macos-universal.zip`，与 Release 页的
    `SHA256SUMS-<版本>.txt` 对照。
  - **每次更新后要再做一次**（未公证时）。
- Intel Mac 用同一个 universal 包；macOS 27 起 Apple 不再支持 Intel（外部资料，未在真机核实）。
```

**同一条文案要在三处出现**（内容一致，长度不同）：README 下载段、Release body、zip 内 `README.txt`（新增 `packaging/macos-README.txt`，在 `build.sh` 打包前放进 zip 根目录，不要放进 `.app`；放进 `.app` 会破坏签名）。

**证据缺口**：本包在 macOS 15/26 上到底显示「Apple 无法检查…」还是「已损坏」，未在真机看过。判定方法见文末 V1–V3。

**难度**：README 改 S；zip 内 README + Release body 的 CI 改造 M（`release.yml` 需要新增一步写 body）。

---

## U2 · Universal 只体现在文件名；Intel 用户拿 arm64 包会「启动即失败」，而下载页没有一句话拦住

**证据**

- `host-mac/build.sh:48-51` 用 `uname -m` 命名并 `ditto`。若加 universal 分支，`uname -m` 仍是 `arm64`，文件名会谎报架构（`docs/iteration/round-14/findings-ship.md:137` 已指出）。
- 现状的 Release 资产名是 `Sidelight-0.28.1-macos-arm64.zip`（GitHub API、截图）；README 标题也写「macOS（Apple Silicon / arm64）」。
- Intel 上的后果（硬事实）：arm64-only 可执行文件没有 x86_64 切片，**Rosetta 只能把 x86_64 翻译成 arm64，不能反向**，所以双击直接被系统拒绝（提示大意「此应用不支持这台 Mac」；确切文案 UNVERIFIED）。用户通常读成「Sidelight 坏了」。
- 旧的 0.28.1 Release 页会继续挂着 arm64 包；0.29.0 发布后，用户仍可能从搜索落到旧页。
- 能装 Universal 的 Intel Mac 系统上限是 macOS 26（macOS 27 起不再支持 Intel；[MacPaw 版本表](https://macpaw.com/reviews/all-macos-versions-in-order)、[endoflife.date macOS](https://endoflife.date/macos)，2026-11 抓取，未真机核实）。`host-mac/Info.plist:21-22` 的 `LSMinimumSystemVersion` 是 `13.0`。

**具体改法**

1. 资产名保持简报要求：`Sidelight-<版本>-macos-universal.zip`；Release 与 README 的说明统一写成 **「Universal（Apple Silicon + Intel）」**，不单独写「universal」这个行话。
2. 下载段加一行判别方法：「不确定芯片： 菜单 →「关于本机」→ 看「芯片」一行（Apple M… 或 Intel）」。
3. 0.29.0 的 Release body 第一句写：「本页 universal 包两种芯片都能用；0.28.1 及更早的 `-macos-arm64.zip` 只支持 Apple Silicon，Intel 用户请用本页的包。」
4. 不发布「universal + arm64」两个 mac 包。两个包会让用户二选一，而 universal 已覆盖两者。
5. CI 增加 `lipo -archs` 断言（期望 `x86_64 arm64`），并把结果写进 Release body（「包含 x86_64 与 arm64 两个切片」），这样 Intel 用户有可见承诺。

**难度**：文案 S；CI 断言已在 ship 侧，S。

---

## U3 · 签名/公证没有「三态」；有证书时用户会看到什么、没证书时怎么标，都没有定

**证据**

- 现状是**只可能一种状态**：`host-mac/build.sh:45` `codesign --force --deep --sign -`（ad-hoc）。README 写「未签名、未公证」（`README.md:12`），CHANGELOG 0.27.0 写「未签名、未公证，仅 arm64」（`docs/CHANGELOG.md:35`）。0.28.1 的条目只写字节（`docs/CHANGELOG.md:11`），Release body 空（见 U1）。
- 简报要求「有 secrets 时 `codesign --options runtime` + `notarytool submit --wait` + `stapler`；没有 secrets 时保持 ad-hoc 并明确标注」。但落到文案上需要三种状态，现在只有一种：
  - **A 无证书**（现状）：ad-hoc + 未公证 → 用户必须走 U1 的步骤。
  - **B 证书 + 公证成功 + stapler 成功**：用户第一次双击只看到一次「确定要打开吗？」（Apple 102445：「the first time you open a new app from an identified developer… your Mac asks if you're sure」），此后双击直接开；**不是「完全没有提示」**。
  - **C 有证书但公证失败/未 staple**：和 A 一样被拦，且可能报「已损坏」；这时文案若写「已签名」就是错承诺。
- 没查到的：GitHub repo 当前有没有配置 `APPLE_*` secrets（无权限也不该看）。所以「未配置」只能由 CI 在运行时判断，不能由人写死。

**具体改法**

1. `release.yml` 的 macos job 增加输出 `signing=none|adhoc|developer-id-notarized`。判定条件不只是「secrets 存在」，还要 `xcrun stapler validate` 成功 + `spctl --assess --type execute --verbose` 退出 0；任一失败就降级为 `adhoc` 并让 job 继续（或 fail），绝不在 Release 里写「已公证」。
2. `release` job 用这个输出写 body 的第一行：
   - `none/adhoc` → 「**未签名、未公证**：首次打开按下面 3 步（macOS 15+ 需去系统设置点「仍要打开」）。」
   - `developer-id-notarized` → 「**已签名并公证**：双击 App，系统只问一次「确定要打开吗」，点「打开」即可；不需要去掉 quarantine。」
3. README 不写死状态，改成一句「本版是否已签名/公证，以 Release 页最上面那行为准」，并把 A 的步骤放在下方 `<details>` 里，B 出现时不干扰。
4. 「未配置时必须显著标注」：放三处——Release body 第一行、README 下载段第一行、zip 内 `README.txt` 第一段。当前 README 有，下载页（Release）没有，zip 内也没有，等于**用户在下载那一刻看不到**。
5. 不要用「已签名」描述 ad-hoc。ad-hoc 的作用是让 Apple Silicon 能启动，不是让 Gatekeeper 放行（round-14 `findings-ship.md:66-68`）。
6. 签名顺序：`lipo` 之后、`ditto` 之前签 `.app`；`stapler` 在 zip 之后再 staple `.app`、然后重做 zip（否则 zip 里的 app 没有 ticket）。这条属 ship 侧，文案要按「stapled」写，不能按「已提交公证」写。

**难度**：M（workflow 三态 + body 模板）；纯文案 S。

---

## U4 · 换 Universal 包会不会丢数据：不会，但文档没说数据在哪、怎么备份、怎么删

**证据（代码）**

- 状态目录在 App 包外：`host-mac/Sources/SidelightMac/Documents.swift:253-262` → `~/Library/Application Support/Sidelight`（不可写时退 `$TMPDIR/Sidelight`），里面是 `recent.json`（`:275-284`）。
- 草稿在文档同目录：`Documents.swift:355-362` → `<文档目录>/.sidelight/drafts/<key>.md`；批注同理。换 App 包碰不到。
- 设置与 API Key 在 localStorage：`src/lib/settings.ts:23,47,74`（`sidelight.settings.v1`，含 `apiKey`、`searchApiKey`、字号、主题）；文档兜底草稿在 `src/App.tsx:397` 的 `DOC_KEY`。WKWebView 默认数据存储按 bundle id 落在 App 包外（具体路径未真机核实）。
- `host-mac/Info.plist:9` 的 `CFBundleIdentifier` 是 `app.sidelight.mac`。**只要不改这一行**，arm64 → universal 是同一个 App，`recent.json`、localStorage（含 Key）、`.sidelight` 全部保留。
- 现在 README 的「数据与隐私」只写 Windows：`README.md:70-76` 全是 `%LOCALAPPDATA%`；macOS 路径一次都没出现。macOS 用户不知道换包/删除时该动哪里。

**结论（可写进文档）**

> 换包不丢数据。数据不在 App 里：最近列表在 `~/Library/Application Support/Sidelight`，设置与 API Key 在 App 的本地 Web 存储，草稿与批注在文档同目录的 `.sidelight/`。把新 `Sidelight.app` 拖进「应用程序」覆盖旧的即可；旧包先删也行。**每次换包后要重新走一次首次打开步骤**（未公证时）。

**具体改法**

1. 在下载段末尾加 `### 从 0.28.1（arm64）升级` 三行：覆盖安装、数据保留、首次打开步骤重做。
2. 在 `README.md` 的「数据与隐私」加 macOS 两条路径（Application Support + 文档同级 `.sidelight`），并写「彻底删除：删 App，再删 `~/Library/Application Support/Sidelight`；Web 存储随 App 的本地数据目录，删除后设置与 Key 一起清空」。
3. 提醒只保留一个 `Sidelight.app`：同时留 Downloads 和 Applications 两份会让 LaunchServices 打开旧的那份，用户会以为换包没生效。
4. 发布检查项加一条：**不要改 `CFBundleIdentifier`**。改了等于换 App，上面所有数据都读不到（且没有迁移代码）。

**难度**：S（纯文档 + 一条发布检查）。

---

## U5 · 快捷键与菜单按 Windows 写；macOS 的「编辑」菜单缺失，复制粘贴未验

**证据**

- README 通篇写 `Ctrl + S`、`Ctrl + F`、`Ctrl + Enter`（`README.md:33,38,47` 等），没有一处写 macOS 的 `Cmd`。代码其实两者都收：`src/App.tsx:2869` `const mod = event.ctrlKey || event.metaKey`，所以 `Cmd+S` 能用，只是文档没告诉用户。
- 应用菜单只有 App 菜单、File 菜单（`host-mac/Sources/SidelightMac/App.swift:89-121`）：`打开…`（⌘O）、`打开最近`、`关闭窗口`（⌘W）、`退出`（⌘Q）。**没有 Edit 菜单**（撤销/剪切/复制/粘贴/全选）。
- 后果（UNVERIFIED）：macOS 的 ⌘C/⌘V/⌘Z 是菜单快捷键；没有 Edit 菜单时，WKWebView 里这些键可能不生效。真机一测就知道。如果失效，这是首次打开就会撞上的问题，严重度应升到 U1 之后。
- 首次打开还会看到示例文档：`src/App.tsx:121`「这是 Sidelight 的示例文档。左边写，右边批注。」没有一句「打开自己的文件夹在 文件 → 打开文件夹（⌘O）」。

**具体改法**

1. 文档里的快捷键改成「`Ctrl + S`（macOS 用 `Cmd + S`）」，或在下载段加一行总说明：「下文 `Ctrl` 在 macOS 上换成 `Cmd`」。
2. `buildMenu()` 加标准 Edit 菜单（`undo:`/`redo:`/`cut:`/`copy:`/`paste:`/`selectAll:`，`keyEquivalent` 交给系统），成本约 15 行；这是 macOS 应用的最低期望。真机验证前先用 `Cmd+C`/`Cmd+V` 测一次。
3. 示例文档首行加一句：「要打开自己的文件：文件 →「打开文件夹」（`⌘O`）。」——这是首次打开后的第一个动作指引，零风险。

**难度**：文案 S；Edit 菜单 S；验证需真机。

---

## 优化机会（最多 3 条，按收益排）

- **O1 · Release body 做成模板，由 CI 生成**：签名状态、芯片、首次打开 3 步、`shasum` 命令。Release 页是用户真正落地的地方，现在它是空的（截图）。收益最大、难度 M。
- **O2 · zip 里放 `README.txt`**：照 `packaging/README.txt` 的结构（怎么用 / 需要什么 / 数据在哪 / 出问题），macOS 版把「怎么用」换成 U1 的两条路径。放在 zip 根目录、App 外面。S。
- **O3 · 首次打开后的第一屏给一个动作**：示例文档首行加「文件 →「打开文件夹」（⌘O）」，或空态按钮旁加一行「也可以把 `.md` 拖进窗口」。S。

## UNVERIFIED 与验证方法

| 项 | 状态 | 验证方法（需一台真机） |
| :--- | :--- | :--- |
| 本包在 macOS 15/26 的警告文案（「Apple 无法检查…」/「已损坏」） | 未核实 | V1：干净用户 + 从 Release 下载，双击，抄下完整弹窗文字与按钮 |
| macOS 13–14 右键 →「打开」仍有效 | 未核实（Apple 页只写 Open Anyway） | V2：macOS 14 真机重复 |
| 「仍要打开」是否必须先双击一次才出现 | 未核实（Apple 原文如此） | V1 里先看设置页有没有按钮，再双击后看 |
| universal 包在 Intel 上能启动、`--self-test` 通过 | 未核实 | V3：Intel Mac（macOS 13–26）双击 + `SidelightMac --self-test` |
| `lipo -archs` 输出、体积 | 未核实 | CI 日志 `lipo -archs` + `zip=… bytes=…`（`host-mac/build.sh:53`） |
| 换包后 localStorage/recent.json 是否保留 | 未核实（代码推断保留） | V4：装 0.28.1 → 填 Key、打开 2 个文件 → 覆盖 0.29.0 → 看 Key 与最近列表 |
| ⌘C/⌘V 在无 Edit 菜单时是否可用 | 未核实 | V5：选中正文，⌘C，再 ⌘V |
| WebKit 数据目录具体路径 | 未核实 | `ls -la ~/Library/WebKit/ \| grep sidelight` 与 `find ~/Library -maxdepth 3 -name '*sidelight*'` |

## 引用

- Apple《Safely open apps on your Mac》：<https://support.apple.com/en-us/102445>（唯一放行路径 = Open Anyway；例外保存后以后双击可开）。
- macOS 15 移除右键 Open 的迁移记录：<https://github.com/amd/gaia/commit/24e7584b569d8f7eccbd2422818425d10b687b3e>。
- 未签名/非公证包报「damaged」的旁证：<https://github.com/opengeos/GeoLibre/commit/486772a459f2e88f00990cf9bde3120496e9cba6>。
- macOS 27 起不再支持 Intel：<https://macpaw.com/reviews/all-macos-versions-in-order>、<https://endoflife.date/macos>（2026-11 抓取，二手资料）。
