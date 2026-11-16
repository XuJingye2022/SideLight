# 第 34 轮 · 安装、体积、启动与开源发布体验（finder-ship，只读）

时间：2026-11-17。本轮只有本角色构建，未并发。产品代码未修改。

## 一、本轮实测

### 1. 门禁

```
npm run build  → tsc --noEmit OK + vite build OK（133 modules，235ms）
                 dist/index.html 1.49 kB │ gzip 0.92 kB
                 dist/assets/index-B8eUz4hw.js 896.14 kB │ gzip 282.24 kB
                 dist/assets/katexLoader-CNO5m-uY.js 258.78 kB │ gzip 77.66 kB
                 退出码 0（原始输出：`.tmp/ship-round34-build.log`）
npm test       → 22 个测试块，合计 285 条，fail 0，退出码 0（`.tmp/ship-round34-test.log`）
```

`npm test` 计数方法：日志里 22 行 `ℹ tests N`，N 求和 = 285。与 `README.md:117`（22 文件 285 条）、`AGENTS.md` §6 一致。

### 2. 首屏 gzip 预算

```
$ node scripts/measure-first-screen.mjs
   896149   278863  /assets/index-B8eUz4hw.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=929933 gzip=285891 files=2 max=286000
PASS
```

gzip **285,891 B**，上限 286,000 B，**余 109 B**。与 `README.md:99` 一致；与 `STATE.md:52`（285,052 B、余 948 B）不一致。

### 3. dist 体积与 chunk 构成

| 项 | 字节 | 说明 |
| :--- | ---: | :--- |
| dist 合计（31 个文件） | 1,471,806 | 首屏 2 个 + 惰性 2 个 KaTeX chunk + 15 个 woff2 + 11 个小 chunk + index.html 1,495 |
| `assets/index-*.js` | 896,149 | 首屏唯一 JS，gzip 278,863 |
| `assets/index-*.css` | 33,784 | gzip 7,028 |
| `assets/katexLoader-*.js` | 258,788 | 惰性，首屏集合外 |
| `assets/katexLoader-*.css` | 26,627 | 惰性 |
| 15 个 `KaTeX_*.woff2` | 213,664 | 惰性 |
| 11 个其它惰性 chunk | 41,299 | PreviewPane/FindBar/QuickOpen/Outline/ShortcutsDialog/StatsDetail/export/SettingsDialog/MarginRail/trash/TreeActions |

安装器载荷 = `host/bin` 五件 1,024,862 B + dist 1,471,806 B = 2,496,668 B，`EstimatedSize` 2,438 KB（`packaging/installer.ps1:44-50`）。

### 4. `release/` 里的 0.32.1 资产（只读，未改）

| 资产 | 本地 `release/` | GitHub Release 资产（API 实测） | 一致 |
| :--- | ---: | ---: | :--- |
| `Sidelight-0.32.1-win-x64-setup.exe` | 824,595 | 824,209 | **不一致（+386 B）** |
| `Sidelight-0.32.1-win-x64-portable.zip` | 910,360 | 910,360 | 一致 |
| `Sidelight-0.32.1-macos-universal.zip` | 无（本机 Windows） | 905,892 | 无法本地比对 |

Release 数据来源：`https://api.github.com/repos/XuJingye2022/SideLight/releases/latest`（tag `v0.32.1`，published 2026-11-16T14:28:48Z）。本地 setup 时间戳 2026-11-16 22:21:32（CST），比发布早约 7 分钟，属同一次本地构建的产物；NSIS 不保证逐字节可复现，故字节不同。`release/SHA256SUMS.txt` 只有 0.26.0 两条，是旧草稿文件（不跟踪，不影响发布）。

### 5. `packaging/*.ps1` 与 `packaging/README.md` 的核对

- 安装步骤（`packaging/README.md:10-18`）与脚本行为一致：per-user、装到 `%LOCALAPPDATA%\Programs\Sidelight`、组件页 opt-in、缺 WebView2 时 `Abort` 并给下载链接（`packaging/installer.nsi:96-118`）。
- 载荷卫生成立：`installer.nsi:122-131` 只 `File` 五个宿主文件 + `dist\*`，`host/bin` 里的 `host.log`、`host.log.bad`、`host.log.migrated` 不会进包（三层合计 16,901 B）；`portable.ps1:17-23,49-52` 同样只拷五件并断言没有 `webview2-data`/`host.log`/`*.ps1`。
- `verify-installer.ps1:153` 确有「HKCU 卸载项 7 值」断言，`:158` 在沙箱里降为 UNVERIFIED，与 `packaging/README.md:43,49` 的说法吻合。
- 数字与来源三处不一致，见发现 S4。

### 6. 依赖是否可减

逐个核对 `src/App.tsx:5-15` 的 import 与 `package.json:19-34`：

- `@tiptap/starter-kit`、`extension-image`、`extension-mathematics`、`extension-table`、`extension-task-item`、`extension-task-list`、`@tiptap/pm`、`@tiptap/react`、`react`、`react-dom`、`katex` 都有直接 import，**没有一条能删**。
- `@tiptap/extension-strike` 不是冗余：`src/App.tsx:115` 用它 `extend` 出 `StrikeShortcut`，`:728` 已 `StarterKit.configure({ strike: false })`，不会重复注册。
- `katex` 只经 `src/lib/katexLazy.ts` 动态加载，首屏 0 B（`measure` 的 katex 排除断言仍在跑）。
- 开发依赖 `playwright-core` 被 `scripts/*.mjs` 使用，`@types/node` 被 `*.test.ts` 使用，`vite`/`typescript`/`@vitejs/plugin-react` 是构建必需。**本轮结论：运行时依赖无可减项**；要再小只能动 KaTeX 字体或编辑器内核，两者都不是本轮能拍的板。

### 7. 启动路径：不联网、无常驻

- `index.html` 无外部资源（favicon 是内联 data URI），只有一段同步读 `localStorage` 定主题的内联脚本。
- `src/main.tsx` 只 import React 与 `App.tsx`，无副作用请求。
- 全仓库前端 `fetch(` 仅两处：`src/lib/ai.ts:91`（用户触发的模型请求）、`src/lib/search.ts:114`（用户点「联网核对」）。`setInterval` 在本轮 grep 范围内 0 命中。
- 宿主 `host/Program.cs` 无 `HttpClient`/更新检查；两个 `Timer` 分别是关窗确认（`:844-852`，5 s）与启动看门狗（`:1447`）。
- **结论：启动不联网、无后台常驻，符合产品底线。**

### 8. CI 工作流评述

有用的门：`gate`（ubuntu：build + measure + test）、`windows-host`（宿主编译 + 冒烟 + 两个包）、`macos-host`（Universal 包 + 6 项 self-test）、`install-verify`（手动）。三条流水线（ci/release）都有真实断言，不算冗余；唯一的重复是 `release.yml` 在 tag 上再跑一遍 build/test/measure，成本约 1 分钟，属可接受的自包含。发现的问题见 S5、S6。

## 二、发现（按可落地性排序）

### S1（P1）STATE.md 的体积与测试数字落后一轮，把首屏余量夸大了 8.7 倍

**证据**
- `node scripts/measure-first-screen.mjs` 实测 `gzip=285891 max=286000` → 余 109 B。
- `docs/iteration/STATE.md:52` 写「首屏 JS+CSS gzip **285,052 B**（临时上限 286,000，余 948 B）… 测试 **21 文件 276 条**」。实测 22 文件 285 条。
- `docs/iteration/STATE.md:130` 仍写「第 32 轮完成… HEAD `e9d90a8`」；实际 `186dfeb`（第 33 轮，`git log --oneline -3`）。
- 对照：`README.md:99`（285,891 B、余 109 B）与 `README.md:117`（22 文件 285 条）是对的，`docs/CHANGELOG.md:48,50` 也是对的。

**为什么算问题**：planner 与 finder 读 STATE 当共享记忆。第 33 轮一次改动吃掉 839 B，按「余 948 B」安排的功能会在跑 build 后被 286,000 B 上限判 FAIL，白掉一次返修。

**建议**：根代理在阶段间更新 `STATE.md:52` 与 `:130`（本轮报告已给出可抄的数字）。另给 `scripts/measure-first-screen.mjs:56` 的汇总行补 `headroom=<max-total>` 字段，抄数字的人不用手算。

**预期收益**：消掉下一次因体积误判造成的返修；数字从源头产出，不靠手算。

### S2（P1）首屏体积门不在 `npm run build` 里，本地门禁挡不住体积回归

**证据**：`package.json:12` 是 `"build": "tsc --noEmit && vite build"`，不含 measure；`AGENTS.md` §3 把 `npm run build` 列为「改完必须过」的门禁；measure 只在 `.github/workflows/ci.yml:39` 与 `release.yml:82,155` 单独跑。当前余量 109 B。

**为什么算问题**：改代码的代理在本地看到 build 通过，实际 +110 B 就会被 CI 判红。体积是本产品的验收项（AGENTS §4「轻量是产品底线」），但它不在本地门禁里。

**建议**（二选一，都是一行）：`"build": "tsc --noEmit && vite build && node scripts/measure-first-screen.mjs"`（dist 刚生成，脚本只读产物，实测 <0.2 s）；或新增 `"verify": "npm run build && node scripts/measure-first-screen.mjs"` 并写进 AGENTS §3。

**预期收益**：体积回归在提交前暴露；门禁与产品底线一一对应。

### S3（P2）`docs/typora-gap.md` 把 6 项已实现能力列在「缺的」，README 的「下一步」还按这张表排序

**证据**（对照实现）
- `docs/typora-gap.md:40` 自动配对「无」→ 已实现，`README.md:33` 有完整描述，`src/lib/smartTyping.ts` + 8 条单测（CHANGELOG 第 33 轮）。
- `docs/typora-gap.md:41` 智能标点「无」→ 同上。
- `docs/typora-gap.md:42` 缩进与反缩进「无（Tab 与 Shift+Tab）」→ 已实现，`README.md:30`，CHANGELOG 第 31 轮。
- `docs/typora-gap.md:52` 大纲折叠「无」→ 已实现，`README.md:31`，CHANGELOG 第 29 轮。
- `docs/typora-gap.md:59` 新建、重命名、删除文件「无」→ 已实现，`README.md:55,57`，CHANGELOG 第 12/13/28 轮。
- `docs/typora-gap.md:61` 快速打开（Ctrl+P）「无」→ 已实现，`README.md:30`。
- `docs/typora-gap.md:62` 最近文件排在「缺的」表里，现状列却写「有（8 条…）」。
- 计数仍是 21 有 / 18 缺（`docs/typora-gap.md:7,33`、`README.md:81`），`README.md:206-210`「下一步」按这张表排序。

**建议**：把上述 6 行移到「已经有的」表、重数（约 27 有 / 12 缺），同步 `README.md:81` 与两处标题数字；`:16` 的「示例工作区」也删掉（第 31 轮已确认没有这个入口）。

**预期收益**：下一轮不会把已发布的能力再做一遍；路线图和数据同一口径。

### S4（P2）`packaging/README.md` 与打包脚本/发布事实有三处不一致

**证据**
- **数字过期**：`packaging/README.md:57` 写「体积预算：安装包硬线 850,000 B；**0.22.0 实测 808,897 B（余量 41,103 B）**」。发布资产实测 824,209 B（GitHub API），距硬线 25,791 B；本地构建 824,595 B。硬线数字正确，引用的样本与余量差一个年代。
- **NSIS 来源与 CI 不一致**：`packaging/README.md:38` 说 installer.ps1 从 SourceForge 下载 NSIS；`packaging/installer.ps1:35` 用的 `prdownloads.sourceforge.net/...nsis-3.11.zip` 正是 `.github/workflows/ci.yml:83-87` 注释里写「会返回反爬 HTML」的那条直链；CI 改用仓库 Release 的 `build-tools-nsis-3.11.zip` 并校验 `NSIS_SHA256`。本地脚本下载后**不校验哈希**。
- **本地重建字节与发布不同**：同名 `Sidelight-0.32.1-win-x64-setup.exe`，本地 824,595 B、发布 824,209 B（`release/` 时间戳 2026-11-16 22:21:32 vs 发布 14:28:48Z）。文档没有任何地方提醒「不要用本地包覆盖 Release 资产」，而 README 让用户拿 `SHA256SUMS-<版本>.txt` 校验。

**建议**：`installer.ps1` 优先取与 CI 相同的固定资产 URL，下载后 `Get-FileHash` 比对 `NSIS_SHA256`（新增常量，不符 exit 1），SourceForge 只做兜底；`packaging/README.md` 换成 0.32.1 的数字并加一句「发布校验和只对 CI 产物有效；本地重建字节不同，不要覆盖 Release 资产」。

**预期收益**：贡献者一条命令可复现打包 + 供应链校验；用户校验和不会莫名对不上。

### S5（P2）CI 的宿主冒烟少跑了「真实写盘」那一项

**证据**：`.github/workflows/ci.yml:94` 与 `release.yml:96` 都跑 `node scripts/host-smoke.mjs`（无 `--fsa`）；`scripts/host-smoke.mjs:21` `const wantFsa = process.argv.includes('--fsa')`；`README.md:129` 宣传的是 `node scripts/host-smoke.mjs --fsa`「7 项：窗口、渲染、argv、单实例、真实写盘」。写回、原子替换这类宿主改动只有本机手动跑才验。

**建议**：两个工作流都加 `--fsa`（脚本写 `.tmp/host-fs`，在 runner 工作区内可写；本机同类断言已多次通过）。

**预期收益**：写回路径的回归在 CI 被抓；README 的宣传与 CI 实际覆盖面一致。

### S6（P2）发版前置只查「有标题」，不查未发版区间是否收口

**证据**：`.github/workflows/release.yml:58` 的断言是 `grep -q "^## ${PKG_VERSION} — " docs/CHANGELOG.md`。当前 `docs/CHANGELOG.md:5` 有 `## Unreleased（第 29–33 轮，未发版）`，`:53` 同时有 `## 0.32.1 — 2026-11-16`，`package.json:3` 仍是 0.32.1。因此现在推一个 `v0.32.1` 类 tag（或只补 CHANGELOG 不改版本号）preflight 会通过；发布说明由 `scripts/release-notes.mjs` 按该版本节生成，只写 0.32.1 的三项，而包里有 5 轮未记录内容（含首屏 +839 B 的智能标点）。

**建议**：preflight 增一条约 5 行的断言——`grep -q '^## Unreleased' docs/CHANGELOG.md` 且该节下仍有条目前 `exit 1`，提示「先把 Unreleased 收口成本版条目，或改 `package.json` 版本号」。

**预期收益**：发布说明与包内容一致；避免 0.31.1.0 那类版本错配的变种（那次是安装器版本号，这次会是包内容与版本号）。

## 三、UNVERIFIED

1. **SourceForge 直链现在是否仍被反爬挡住**：本机 `.tmp\nsis` 已有缓存，未删缓存重下（会破坏其他角色的环境）。证据只来自 `ci.yml:83-87` 的注释，未实测。
2. **NSIS 下载哈希校验**：本地脚本没有校验，所以「拿到的 zip 是否等于 CI 那个」未验。
3. **macOS zip 的本地字节**：本机是 Windows，`release/` 无 macOS 资产，只能用 GitHub API 的 asset size 905,892 B；未解包核对架构与 README.txt。
4. **真实安装**（HKCU 卸载项、开始菜单、SmartScreen、真人双击）：按角色约束不做系统级安装、不碰注册表，沿用既有 UNVERIFIED。
5. **CI 加 `--fsa` 后能否在 windows-2022 runner 通过**：未跑 CI，建议下一轮推送后观察一次。
6. 本轮未跑 `npm run roundtrip`、`scripts/acceptance.mjs`（角色只要求 build + measure）。

## 四、结论

`npm run build` 通过，首屏 285,891 B ≤ 286,000 B（PASS，余 109 B），dist 1,471,806 B / 31 文件，运行时依赖无可减项，启动不联网、无后台常驻。发布的 0.32.1 资产与文档数字一致（824,209 / 910,360 / 905,892），本地重建差 386 B 属 NSIS 不可复现，需要文档约束。本轮可落地的 6 条里，S1 与 S2 与「首屏只剩 109 B」直接相关，建议下一轮优先处理；S3/S4/S6 是发布面文档与流水线的正确性问题，改动都小。
