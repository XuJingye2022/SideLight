# 第 31 轮 · 安装、体积、启动与开源发布（finder-ship）

只读侦察。未修改产品代码、未动 `release/`、未写注册表、未安装系统级软件、未 push。
本轮只有我跑构建，没有并发写 `dist/`。

## 1 本轮实测

### 1.1 构建

```text
> tsc --noEmit && vite build
vite v8.3.8
✓ 132 modules transformed.
✓ built in 243ms                 （退出码 0）
```

无类型错误；无 chunk 体积告警（`chunkSizeWarningLimit: 1200`，主 chunk 892,443 B）。

### 1.2 首屏 gzip 与预算

```text
$ node scripts/measure-first-screen.mjs
   892443   277501  /assets/index-BVO7nHXS.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=926227 gzip=284529 files=2 max=286000
gzip 省下 641698 B（69.3%）
PASS
```

余量 **1,471 B**（286,000 − 284,529），与 `README.md:97` 一致。预算门由 `scripts/measure-first-screen.mjs:64-67`（超线 exit 1）与 `:59-63`（首屏出现 katex/lazy chunk exit 1）执行；`ci.yml:39`、`release.yml:82,145` 都调它，回归不会漏。

### 1.3 dist 构成（31 文件，1,467,015 B）

| 类别 | 字节 | 占 dist | 说明 |
| --- | ---: | ---: | --- |
| 主 chunk `index-*.js` | 892,443 | 60.8% | 首屏，measure gzip 277,501 |
| KaTeX JS `katexLoader-*.js` | 258,788 | 17.6% | 懒加载，首次渲染公式才取 |
| KaTeX 字体 15 个 woff2 | 213,664 | 14.6% | 懒加载；woff2 已预压缩，基本 1:1 进安装包 |
| CSS 两份 | 60,411 | 4.1% | 主 33,784 + katexLoader 26,627 |
| 懒组件 11 个 JS | 40,214 | 2.7% | TreeActions/trash/MarginRail/SettingsDialog/export/ShortcutsDialog/Outline/QuickOpen/StatsDetail/FindBar/PreviewPane |
| `index.html` | 1,495 | 0.1% | 无外部 CDN、无 preconnect、favicon 是 data URI |

### 1.4 release/ 资产（本地，只读）

| 文件 | 本地字节 |
| --- | ---: |
| `Sidelight-0.32.1-win-x64-setup.exe` | 824,595 |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 |
| macOS zip | 本地没有（CI 产物） |

`release/SHA256SUMS.txt` 仍是 0.26.0 两行，已过期（`release/` 不进版本控制，只提示）。`README.md:97` 引的 824,209 B 是 Release 页字节，比本地少 386 B，这是上轮已登记的不可复现问题，不算缺陷。

### 1.5 启动路径（联网 / 常驻）

- `dist/index.html` 无外部域名；`http://www.w3.org` 只出现在 favicon 的 SVG `xmlns` 里，不产生请求。全部 JS/CSS/字体同源。
- `src/` 里运行期只有 `fetch('/__doc' | '/__draft' | '/__annotations' | '/__recent')` 四个同源宿主端点（`src/App.tsx:1122,1207,1224,2818,3074`）；`ai.ts:91`、`search.ts:114` 的 `fetch` 只在用户点分析/联网核实时走，且地址来自用户设置。
- `src/` 里 `setInterval` 命中 0 处；`host/Program.cs` 无 `HttpClient`/外链；`host-mac/*.swift` 无 `URLSession`；无托盘、无自动更新。
- **结论：启动不联网、无后台常驻，本轮无改动建议。**

## 2 发现

### S1 · P1 · `npm run acceptance` 在干净首启上是红灯，且没文档说它要一个已在跑的 CDP 浏览器

`README.md:119` 把 `npm run acceptance` 写成「11 项」验收；`CONTRIBUTING.md:98-103` 又要求 PR 附图跑 `node scripts/shot.mjs`。本项目没有浏览器依赖，这两个脚本都靠 `chromium.connectOverCDP` 借一个已在跑的浏览器。本轮在 CDP 9224 实测（脚本 `.tmp/e2e-r31-ship-accept.mjs`）：

```text
firstStartTextEmpty=true "\n"
findCount="无结果"
promptCalls=[]
katexAfterInsert=1 sourceEditor=0
pageErrors=[]
```

三处过期：

1. **查找命中必 FAIL**：`scripts/acceptance.mjs:74` 在首启文档里搜「侧灯」，但 0.32.1 起首启是空白 `未命名.md`（`README.md:54`、`App.tsx:107` 注释已过期），实测计数是「无结果」，而断言 `:77` 用 `/\/\s*\d+/` 匹配不到。
2. **公式断言的 prompt stub 是死代码**：`:19-26` 仍在拦含「LaTeX」「链接」的 `window.prompt`，实测 `promptCalls=[]`；产品里只剩「新建文件夹的名字」用 prompt（`src/App.tsx:2285`），插入公式直接建节点（`src/App.tsx:3968`）。`:82-88`「公式渲染」只是碰巧过——空 latex 也渲染出一个 `.katex`（实测 1 个），证明不了输入路径。
3. **CDP 端点写死、结尾断连**：`:7` 写死 `127.0.0.1:9222`；`:165` `browser.close()` 会断掉共享 CDP 连接（`AGENTS.md` §8 第 97 行已记这个坑，`keyboard-acceptance.mjs` 也仍带着）。`scripts/shot.mjs:14` 同样写死 9222。**README、CONTRIBUTING、AGENTS 里没有一处写怎么起一个带 `--remote-debugging-port=9222` 的浏览器**（grep `remote-debugging-port` 无命中），新克隆的人跑这两条命令只会拿到 `ECONNREFUSED`。

**预期收益**：README 里写着的两条命令对新贡献者可复现；不会因为一条误报判「产品坏了」。
**落地成本**：改 3 处（`:74` 改成搜测试自己刚打的字、删 `:19-26` 的死 stub、`:164-165` 换 `page.close()` + `process.exit(0)`），两个脚本改成读 `process.env.CDP_PORT ?? 9222`；README 的「跑起来」加两行说明怎么起浏览器。

### S2 · P1 · `@tiptap/extension-strike` 是幽灵依赖（能编过，靠 npm 提升）

`src/App.tsx:6` 直接 `import { Strike } from '@tiptap/extension-strike'`，并在 `:114-118`、`:717-718` 注册自定义快捷键（`StarterKit.configure({ strike: false })` 后用自己的 `StrikeShortcut`）。但 `package.json` 的 dependencies 里**没有这个包**：

```text
$ npm ls @tiptap/extension-strike
sidelight@0.32.1
`-- @tiptap/starter-kit@3.34.0
  `-- @tiptap/extension-strike@3.34.0        # 只是 starter-kit 的传递依赖
```

`package-lock.json:749-751` 也是作为传递依赖落的。现在能过是因为 `node_modules` 被提升到了顶层。

**后果**：换 pnpm/`--install-strategy=nested`、或 starter-kit 哪天把 strike 摘掉，`npm run build` 立刻 `TS2307`；strike 与 starter-kit 版本漂移时还可能注册两份 Strike。上轮 §4 判「依赖无可减项」，这一条是漏的反方向问题（少声明）。
**预期收益**：构建不再依赖安装布局。
**落地成本**：dependencies 加一行 `"@tiptap/extension-strike": "^3.34.0"` 后 `npm install` 更新锁文件。**包体不变**（同一个模块本来就在 starter-kit 里被引）。

### S3 · P2 · 3 个测试文件（12 条断言）写了但没进 `npm test`，README 的计数也写着 17

`npm test` 本轮实测 18 文件 **260** 条全 pass（`ℹ pass` 求和）。但 `src/lib/` 下有 21 个 `*.test.ts`，另有 3 个从没被 `package.json`、CI 或任何脚本调用（grep `settings.test|prompt.test|katexLazy.test` 在 `package.json`、`.github/workflows/*.yml`、`scripts/*.mjs` 里 0 命中）。逐个手跑：

```text
node --experimental-strip-types src/lib/katexLazy.test.ts  -> pass 7, exit 0
node --experimental-strip-types src/lib/prompt.test.ts     -> pass 3, exit 0
node --experimental-strip-types src/lib/settings.test.ts   -> pass 2, exit 0
```

也就是说 12 条已写好的绿断言永远不在门禁里。顺带 `README.md:152` 还写「17 个测试文件挂进 npm test……目录里还有 `katexLazy.test.ts` 未挂」，与同一文件 `:115` 的「18 个文件、260 条断言」自相矛盾。

**预期收益**：门禁 260 → 272 条，覆盖率提升、零运行成本（三条合起来毫秒级）。
**落地成本**：`package.json` 的 test 串追加 3 段 + `README.md:152` 改数字。

### S4 · P2 · 便携 zip 里的 `README.txt` 指向一个不在包里的文件，还写着已定的关联决策「待确认」

`packaging/portable.ps1:44` 只把 `packaging/README.txt`、`LICENSE`、`sidelight.ico`、`host\bin` 五件与 `dist\*` 放进 staging，**没有 `README.md`**；`installer.nsi:128` 同样只带 `README.txt`。但 `packaging/README.txt:6` 写「装到系统里的版本……见同目录的 README.md」——用户打开 zip 找这个文件找不到。

同一文件 `:44` 写「不做 .md 文件关联（是否做，待产品负责人确认）」，而 0.20.0 起安装器已有 opt-in「打开方式」（`installer.nsi:151` 起、`packaging/README.md:15`、ADR-0007 已定）。

这两条是上轮 S6 的第 1、2 行，本轮复核仍未修（`impl.md` 的 T3-B 只改了 README 的体积与条数数字）。

**预期收益**：装完的人能顺着指路找到说明；不会在便携版里读到与安装器相反的结论。
**落地成本**：两句文案——`:6` 改成「装到系统里的版本见项目主页 `README.md` 的「下载」节」，或把 `packaging/README.md` 一起塞进 staging；`:44` 改成「便携版不做 .md 关联与开机项」。

### S5 · P2 · 本地打安装包仍从 SourceForge 裸下 NSIS，不校验哈希；本轮实测这条 URL 取不到

`packaging/installer.ps1:33-37`：

```powershell
Invoke-WebRequest -Uri 'https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip' -OutFile $zip -UseBasicParsing
Expand-Archive -LiteralPath $zip -DestinationPath $nsisDir -Force
```

全程没有 `Get-FileHash`（该文件唯一的 `Get-FileHash` 在 `:107`，算的是自己刚产出的 setup）。而 CI 自己在注释里写着「SourceForge 直链会返回反爬 HTML」（`ci.yml:83`），于是 CI 改从本仓库 Release 固定资产取并校验 `NSIS_SHA256`（`ci.yml:84-88`）。**本地打包走的正是 CI 已经放弃的那条路，而且不验哈希。**

本轮实测这条 URL 从本机取不到：

```text
$ Invoke-WebRequest -Uri 'https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip' -Method Head
ERR: 基础连接已经关闭: 接收时发生错误。      （同一时刻 npm registry 可达，`npm audit` 正常返回）
```

本机 `.tmp/nsis` 已有缓存所以没暴露；新克隆的贡献者会先拿到一条原始 PowerShell 异常，或拿到一个 HTML 文件后在 `Expand-Archive` 处报「压缩文件格式无效」。

**预期收益**：首次本地打包不再有隐藏失败点；下载内容可验（供应链）。
**落地成本**：把 `ci.yml:25` 的 `NSIS_SHA256` 搬进 `installer.ps1`，URL 换成同一个 vendored 资产，加一条哈希断言与「失败就提示手动放到 `.tmp\nsis`」的分支（约 10 行）。上轮 S5 已提，本轮复核未修。

### S6 · P2 · 文档里还有 4 处与当前代码对不上

| 位置 | 现在写的 | 实际 |
| --- | --- | --- |
| `packaging/README.md:42` | 「`installer.ps1`……打印实测字节、`P + 10,000` 门槛、硬报警线 850,000 B」 | 没有任何 `P + 10,000` 门槛；`installer.ps1:89` 只打印 `target=820000 gap=`，`:114` 才在 850,000 B 上 exit 1 |
| `packaging/README.md:57` | 「0.22.0 实测 808,897 B（余量 41,103 B）」 | 十个版本前的数字；0.32.1 发布资产 824,209 B（距硬线 25,791 B） |
| `README.md:28` | 「或者试用内存里的示例工作区」 | 界面里没有入口：`src/` 里 `示例`/`试用` 只剩注释与 `workspace.ts` 的内存表，唯一能把文件装进去的是测试脚本 `scripts/demo-folder.mjs`（`page.evaluate`） |
| `src/App.tsx:107,135-148` | 注释「第一次打开时正文就是示例」+ `const SAMPLE = ...`（596 B 源码） | 0.32.1 起首启是空白 `未命名.md`；`SAMPLE` 无任何引用，已被 tree-shake 掉（`dist/assets/index-*.js` 里「主灯是人」0 次命中）——不影响体积，只误导读者 |

**预期收益**：贡献者按文档找不到东西的次数下降；体积预算只剩 1,471 B 时，注释里「主 chunk 约 840 KB」这类旧话也别再留（`vite.config.ts` 的 build 注释仍是旧数字）。
**落地成本**：四处文案 + 删 14 行死代码，零风险。

## 3 依赖可减性

运行时 13 个（Tiptap 9 + KaTeX + React ×2），逐个对得上功能，无可减项。上轮结论仍成立，反向问题见 S2（少声明一个）。开发期 `playwright-core`、`@types/*`、`vite`、`typescript`、`@vitejs/plugin-react` 都是构建/验证必需。

`npm audit --json` 本轮结果：`"vulnerabilities": {}`，无已知漏洞。

安装体积参考：`node_modules` 119,381,770 B（`npm ci` 后），与首屏 284,529 B、安装包 824,595 B 不是同一量级的问题，仅记录。

## 4 CI 冗余（与上轮 §5 合并，只列新观察）

- `gate`（ubuntu）、`windows-host`、`macos-host` 各自跑一次 `npm run build`，是三个 runner 各自需要 `dist/` 的必要重复，不算冗余。
- `ci.yml:100` 每次 push 都打便携 zip 但不上传（`:108-112` 只传 setup）。它是 `portable.ps1` 的回归手段（上轮 S2 的诉求），建议保留并在注释里写清「只为跑打包回归，不发布产物」，否则下一个人会当浪费删掉。
- `ci.yml` 的 NSIS 来源写死 `releases/download/v0.26.0/build-tools-nsis-3.11.zip`（`:84`）：删旧 Release 或改资产名，windows 构建会以 404 变红，且错误信息只是一条 `Invoke-WebRequest` 异常。与 S5 一起改成「同源 + 同哈希 + 失败提示」最稳。

## 5 UNVERIFIED

| 项 | 为什么测不了 | 怎么补 |
| --- | --- | --- |
| macOS zip 的字节与安装步骤 | 本机 Windows，`release/` 无 macOS 产物；只有 CI 能编译 | macOS 真机或下载 CI 产物走一遍 `packaging/macos-README.txt` 的步骤 |
| 真实双击安装、HKCU 卸载项、开始菜单、SmartScreen | 只读角色，不装系统级软件、不写注册表 | 交互式桌面按 `packaging/README.md:10-24` 走；或手动 dispatch `install-verify` |
| 本地重新打安装包验证 S5 修好 | 本轮只读，不重打包（`release/` 一个字节没动） | 修完后跑 `packaging\installer.ps1`，看是否走 vendored 资产并通过哈希断言 |
| `npm run acceptance` 的完整 11 项 | 只实测了 3 条关键断言（首启正文、查找、公式），未跑全套（会改动共享浏览器页面） | 修好 S1 后按 README 跑全套，把 11/11 写进轮次报告 |

## 6 本轮没做的事

- 没改产品代码、没重打包、没动 `release/`、没碰注册表、没 push。
- 没跑 `draft-acceptance`/`keyboard-acceptance` 等界面脚本（非本角色范围，且会和其它 finder 抢 CDP 页面）。
- 证据文件：`.tmp/e2e-r31-ship-accept.mjs`、`shots/round-31/ship-accept-probe.png`。
