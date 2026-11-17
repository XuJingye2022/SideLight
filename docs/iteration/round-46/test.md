# 第 46 轮 · 独立验收（tester，首次验收）

- 轮前 `startSha`：`39e4f0211f43b7edaca82d468d0997f029151e3c`（实测 `git rev-parse HEAD` 同值）。
- 只读 `plan.md` + `git diff`，**未读 `impl.md`**（避免被实施说法带偏）。所有读数自己跑。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`；未 push、未动 `release/`。
- 自写脚本：`.tmp/e2e-r46-tester-uninstall.ps1`、`.tmp/e2e-r46-tester-t2.mjs`、`.tmp/e2e-r46-tester-t2b-toggle.mjs`、`.tmp/e2e-r46-tester-t3.mjs`、`.tmp/e2e-r46-tester-annoflow-diag.mjs`。
- 截图：`shots/round-46/tester-t2-rail-1440.png`、`tester-t2-rail-1440-crop.png`、`tester-t2-rail-drawer-1024.png`、`tester-t3-mermaid-dark.png`、`tester-t3-mermaid-light-back.png`（未覆盖 finder 的 `bug-*/typora-*/ship-*/code-*/r46-ui-*` 与 impl 的 `impl-*`）。

## 判定：**PASS-WITH-UNVERIFIED**

三条任务的主断言全部自验通过；未验项只有「真机系统主题切换」与「`verify-installer.ps1` 整跑」，原因与补法写在 §6。

## 1. 门禁（全部实跑）

| 命令 | 真实输出 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（无输出） |
| `npm test` | **29 个文件 384 条**，0 fail（逐文件 `pass` 相加：10+22+10+15+16+51+11+6+14+16+24+6+17+16+27+12+8+5+6+7+7+7+11+12+8+13+9+8+10 = 384）；轮前 380，本轮 +4（`resolveMermaidTheme` 四条） |
| `npm run verify` | **PASS**：`total raw=948109 gzip=293205 headroom=26795 files=3 max=320000`；`target=310000 gap=16795`；主 chunk `index-WMkC_694.js` 911.34 kB raw / **285.36 kB gzip**。轮前 292,707 → 本轮 **293,205**（+498 B），距硬线余 **26,795 B** |
| `npm run roundtrip` | `rich: 5/7 完全保真`（`04-reference-links` −4+1、`06-task-list` −0+1）、`source: 7/7 等值`、`firstSaveBlocked: 1/7` — 与轮前同值，无回归 |

## 2. T1 · 卸载只删自己写的文件 + 发布链两道门

### 2.1 静态（先贴改前基线，plan §二 实施步骤 1）

`Select-String -SimpleMatch`（含 `"` 的模式不能交 `git grep`，AGENTS §8）：

| 模式 | plan 改前 → 改后 | 实测改后 |
| :--- | :--- | :--- |
| `RMDir /r "$INSTDIR"` | 1 → 0 | **0** |
| `Delete "$INSTDIR` | 0 → 12 | **12** |
| `RMDir /r "$INSTDIR\state"` | 0 → 0（禁止递归删 state） | **0** |
| `RMDir "$INSTDIR\state"` | 0 → 1 | **1** |
| `Delete "$INSTDIR\state\recent.json*"` | 0 → 1 | **1** |
| `RMDir "$INSTDIR"` | 0 → 1 | **1** |
| `git grep -c payloadVersion -- packaging` | 0 → 2/文件 | `installer.ps1:4`、`portable.ps1:4`（`git grep -c` 数**行**：变量 1 行 + `if` 1 行 + 两条 `Write-Host` 2 行 = 4，plan 写「2 处」是数的出现次数，非缺陷） |
| `git grep -c markerWritten -- packaging` | 0 → 3–4 | **3**（`verify-installer.ps1`） |
| `git grep -n "1,304,634" -- README.md packaging/README.md` | 2 → 0 | **0 命中、exit 1** |
| BOM 三 ps1 + nsi | 全 `239,187,191` | `installer.nsi` / `installer.ps1` / `portable.ps1` / `verify-installer.ps1` 全部 **239,187,191** |
| `Parser::ParseFile` 三个 ps1 | 0 错 | `installer.ps1 errors=0`、`portable.ps1 errors=0`、`verify-installer.ps1 errors=0` |

### 2.2 编译（真跑 `installer.ps1 -AssocDryRun`）

```
payload fileVersion=0.32.1.0
fileVersion=0.32.1.0  D:\Documents\SidelightProgram\.tmp\assoc-dryrun-setup.exe
target=45000000 gap=-43694593
assoc-dryrun=1305407 B  D:\Documents\SidelightProgram\.tmp\assoc-dryrun-setup.exe
EXIT=0
```

### 2.3 静默安装 / 卸载探针（我自写，ASCII，`/D=` 指到 `.tmp`）

**A 段**（用户目录里既有别人的文件，也有宿主自己写的）：

```
SEGMENT_A install_exit=0
SEGMENT_A installed_missing=[]                 # 8 个载荷 + www\index.html + uninstall.exe 都在
SEGMENT_A uninstall_exit=0 uninstallerGone=True
SEGMENT_A keepMe=True herDoc=True              # 别人的文件还在
SEGMENT_A exeGone=True wwwGone=True
SEGMENT_A logGone=True                         # host.log 与 host.log.1 都被删（通配生效）
SEGMENT_A recentGone=True                      # state\recent.json 被删
SEGMENT_A userStateKept=True stateDir=True     # state\mine.txt 还在 → 没有递归删 state（V2-R3 的靶子）
SEGMENT_A uninstallExeGone=True
SEGMENT_A dirExists=True
SEGMENT_A leftovers:
  state
  her-doc.md
  keep-me.txt
  state\mine.txt
```

**B 段**（干净目录，只放宿主自己的 `state\recent.json`）：

```
SEGMENT_B install_exit=0
SEGMENT_B uninstall_exit=0 uninstallerGone=True
SEGMENT_B dirExists=False                      # 干净目录仍被整个删掉，不回归「卸载残留」
```

dirExists=True 且只剩用户文件，说明 `RMDir /r "$INSTDIR"` 已换成点名删除。A 段 leftovers 里的 `state` 目录仍在是**预期**：非递归 `RMDir "$INSTDIR\state"` 在目录里还有用户文件时静默失败——这正是「只删自己写的」。

### 2.4 S2 批次门（干跑，不安装）

```
$ verify-installer.ps1 -PreflightOnly        # 默认 release/ 旧包
setup=824,595 B  mtime=2026-11-16 22:21:32  FileVersion=0.31.1.0
payload mtime=2026-11-17 19:50:03  FileVersion=0.32.1.0
UNVERIFIED setup 的 FileVersion 是 0.31.1.0，payload 是 0.32.1.0：装的是别的批次的包
summary: preflight（1 UNVERIFIED）            EXIT=0

$ verify-installer.ps1 -PreflightOnly -Setup .tmp\assoc-dryrun-setup.exe
setup=1,305,407 B  mtime=2026-11-17 20:56:54  FileVersion=0.32.1.0
payload mtime=2026-11-17 19:50:03  FileVersion=0.32.1.0
summary: preflight（0 UNVERIFIED）            EXIT=0
```

### 2.5 S3 payload 版本门（红 / 绿，改完立刻还原）

绿：§2.2（payload 0.32.1.0 = package.json 0.32.1，exit 0）。
红（`package.json` 临时改 0.32.2）：

```
host\bin\Sidelight.exe 的 FileVersion 是 0.32.1.0，package.json 是 0.32.2。先重跑 host\build.ps1
S3RED_EXIT=1
reverted
package_json_clean=True
```

### 2.6 没碰 `release/`（三份 SHA256，逐字节等于 plan §二 的开工基线）

```
6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2  setup.exe（824,595 B）
F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD  portable.zip（910,360 B）
2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651  SHA256SUMS.txt（207 B）
```

`git diff --stat -- package.json` 为空。

## 3. T2 · 页边「整体评价」不再压住批注卡与模拟提示

`node .tmp/e2e-r46-tester-t2.mjs`（自带 `goto` + `installDemoFolder` + 源码模式播种；1440×900，正文含三张模拟批注要用的段落）。

静止态读数（`RAIL_STATIC`）：卡 `[996,262,260,163.5]`、`[996,438,260,202.25]`、`[996,652,260,143.5]`；面板 `top=779.41`、`position=sticky`；提示 `top=199.59 / bottom=249.97`；`spacer h=546 display=block`；`scrollportBottom=872`、`scrollMax=274`。

| 门 / 断言 | 结果 |
| :--- | :--- |
| **门 A1**（静止态）`card0.bottom <= panel.top - 0.5` | **PASS** 425.5 ≤ 779.41 |
| **门（提示）** `notice.bottom <= panel.top - 0.5` | **PASS** 250 ≤ 779 |
| **门（提示）** `notice.bottom <= card0.top - 0.5` | **PASS** 250 ≤ 262 |
| **门 A2**（滚到底）`lastCard.bottom <= panel.top - 0.5` | **PASS** 521.5 ≤ 533.97（`scrollTop 274 = scrollMax 274`、`lastCardVisible=true`） |
| 面板头命中（`head.contains(elementFromPoint)`） | **PASS** `{contains:true, tag:BUTTON}` |
| 面板在首屏可见 | **PASS** `panelTop 779 < innerHeight 900` |
| 面板折叠/展开 | **PASS**（见 §3.1） |
| 卡片数仍是 3 | **PASS** |
| **抽屉 1024** `panel.top >= lastCard.bottom - 0.5` | **PASS** 631.03 ≥ 619.03；`panel.position=static`、`.rail-cards-space` 计算 `display:none`、末卡三个按钮 `hitSelf=true` |
| `CONSOLE_ERRORS []`、`PAGE_ERRORS []` | **PASS** |

只作诊断（plan §三 明确「不是门」）：`maxCardBottom=796`、`lastCardOverlap=16`（plan 预测 ≈17）、`panelTop=779`、`scrollportBottom=872`、`blockedButtonsTotal=0`（改前 finder 实测 `blockedButtonsInCard0:3`）、`noticeHit={insideNotice:true}`、`overlapCard0` 不再重叠。截图 `tester-t2-rail-1440-crop.png` 目检：提示完整、卡 0 三个按钮完整、卡 1 四个按钮完整。

**已知残差（plan §三 授权，不判红）**：静止时末卡底部约 16 px 在钉住的面板后面（`795.5 − 779.41`），滚约 20 px 即可点；本轮只承诺「第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」。截图里第三张卡底部的按钮行确实被面板头压住一部分——这是 plan 写明的残差，不是回归。

### 3.1 我自己脚本的一条假红（如实记录）

第一版脚本用「点一次前取好坐标、再点回原坐标」验折叠，得到 `aria-expanded: true → false → false`，判 FAIL。**这是脚本的错**：面板折叠后高度 93 → 33，`position: sticky; bottom: 0` 的头按钮跟着下移 ~60 px，第二次点在旧坐标上落空。改用 `page.locator('.rail-overall-head').click()`（每次重取坐标）后：

```
TOGGLE0 {"expanded":"true","head":[1001,419,260,32],"panel":[1001,418,260,93]}
TOGGLE1 {"expanded":"false","head":[1001,419,260,32],"panel":[1001,418,260,33]}
TOGGLE2 {"expanded":"true","head":[1001,419,260,32],"panel":[1001,418,260,93]}
```

`aria-expanded` 与面板高度两态都正确；折叠态 `.rail-overall-body` 是条件渲染（取到 `null`），不是 CSS 隐藏。

## 4. T3 · 切主题后 Mermaid 跟着重绘

`node .tmp/e2e-r46-tester-t3.mjs`（自带 `goto` + 源码模式播种一个 `graph TD` 围栏；主题走真实的「设置 → 深色/浅色 → 保存」路径）。

| 断言 | 读数 | 结果 |
| :--- | :--- | :--- |
| 浅色首渲 | `edgeStroke=rgb(51, 51, 51)`、容器 `rgb(255, 253, 248)`、`previewCount=1`、`svgPerPreview=[1]`、`renderKey=default\|r9732w`、`pathCount=6`、文本含「是」 | **PASS** |
| 深色后（3 s 内）连线变色 | `rgb(51, 51, 51)` → **`rgb(211, 211, 211)`**、`renderKey=dark\|r9732w` | **PASS** |
| 深色后连线对比度 ≥3 | **11.05**（容器 `rgb(28, 31, 35)`） | **PASS** |
| 深色后节点文字对比度 ≥3 | **10.3**（`rgb(204, 204, 204)`） | **PASS** |
| 没有叠出第二个 widget | `previewCount=1`、`svgPerPreview=[1]` | **PASS** |
| 切回浅色 | 回到 `rgb(51, 51, 51)`、`previewCount=1` | **PASS** |
| 第二次再切深色 | `rgb(211, 211, 211)`、`previewCount=1` | **PASS** |
| `CONSOLE_ERRORS []`、`PAGE_ERRORS []` | 空 | **PASS** |

改前基线与 finder 一致（`r46-ui-26-mermaid-theme-stale.png`：连线/文字恒 `rgb(51,51,51)`、对比度 1.31:1）；本轮实测已达 11.05，深色截图 `tester-t3-mermaid-dark.png` 目检连线、箭头与「是」清晰。

静态附证：`git grep -c "configure(mermaid)" -- src/lib/mermaidLazy.ts` = **2**（改前 1，R1 的早退分支已加）、`appliedTheme` = 4、`theme: themeName()` = **0 命中 exit 1**、`resolveMermaidTheme` lazy.ts 2 行 / test.ts 5 行、`sidelightMermaidTheme` mermaidPreview.ts = 1 行（plan 写 ≥2，实现用 `const THEME_META` 常量 + 4 处引用，`git grep -c` 只数含字面常量的 1 行；用法在 `getMeta(THEME_META)` 与 `setMeta(THEME_META, …)`，功能等价，非缺陷）、`renderKey` = 28 行。`railSpace` 在 `App.tsx` = 2 行（plan 写 ≥3：`setRailSpace` 大小写不同不算命中，R4 已说明计数只作附证）。

## 5. 回归

| 脚本 | 结果 |
| :--- | :--- |
| `node scripts/theme-acceptance.mjs http://localhost:5175` | **27/27 PASS**（48 样本矩阵 `applicable=43 excluded=5 failed=0`、深色 4 帧无白闪、跟随系统深色、取消设置还原、reload 保留） |
| `node .tmp/reset.mjs 9222` + `node scripts/annotation-flow.mjs` | 纯函数 5/5 PASS；**route 段 3 条 FAIL（0 卡片）** — 已查证为**旧脚本过期，非本轮回归**，见 §5.1 |
| `npm run roundtrip` | rich 5/7、source 7/7（与轮前同值） |

跑完已 `git checkout -- shots/round-05/`、`git checkout -- shots/round-26/`（`theme-acceptance.mjs` 写 `shots/round-05/` 4 张、`annotation-flow.mjs` 写 `shots/round-26/annotation-overall.png`），`git status --porcelain shots/` 现在只有本轮未跟踪的 `shots/round-46/`。

### 5.1 `annotation-flow.mjs` 的 route 段为什么红（证据）

`scripts/annotation-flow.mjs:79` 打开页面后直接 `.ProseMirror` 点击 → `Ctrl+A` → `Ctrl+Enter`，**从不输入正文**；新文档是空的，应用给出提示而不是发起请求。我按同一路径实测：

```
STATE {"articles":0,"overall":0,"unresolved":0,"toast":"先写一句，或选中一段文字，再按 Ctrl + Enter。","bodyText":""}
```

正对照（同脚本，先打一行正文再 `Ctrl+A`/`Ctrl+Enter`）：

```
REQ POST https://api.deepseek.com/v1/chat/completions
STATE {"articles":0,"overall":1,"unresolved":0,"toast":"模型没按约定格式回，重试一次看看。","bodyText":"诊断正文一段，用来触发批注。"}
```

即：**空文档不发请求**是既有产品行为（该提示的引入提交是 `85f0a75` 第 44 轮，早于本轮），脚本的路由断言因此长期不成立；本轮 T2/T3 的改动不在这条链上（`.rail-overall` 在正对照里出现，说明批注渲染本身正常）。已在 STATE 待办池记「`annotation-flow.mjs` route 段补播种」。**不计入本轮 failures。**

## 6. UNVERIFIED（写清原因与补法）

1. **`system` / 「跟随系统」+ 真机系统主题变化时的 Mermaid 重绘**：沙箱不能改 Windows 系统主题。只有纯函数单测（4 条）与 `matchMedia` 代码路径复核（`resolveMermaidTheme('system', true)='dark'`）。补法：Windows 设置 → 个性化 → 颜色 →「应用模式」切深色，看一张已渲染的图，读 `edgeStroke` 是否变 `rgb(211,211,211)`。
2. **`verify-installer.ps1` 整跑**：本轮只跑 `-PreflightOnly` 两个干跑（§2.4）与自写 A/B 卸载探针（§2.3）。整跑被「运行中卸载」与 `--version` 探活在 delete-pending exe 上的 `Access is denied` 挡住（第 21/22/25 轮既有环境问题）。「卸载残留」「用户数据保留」两条已由 A/B 探针覆盖。补法：干净环境（无残留进程）跑一次 `powershell -File packaging\verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe`。
3. **安装包字节**：本轮 `assoc-dryrun=1,305,407 B` 只记在报告里，**没有写进任何文档**（plan §二 第 5 步要求）。这是有意的：`docs/` 里改口径为「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」。真机安装后的 HKCU 卸载项 / 开始菜单 / SmartScreen 仍未验（与第 45 轮同）。

## 7. 计划偏差（都不是缺陷）

1. plan §二 静态断言 `git grep -c payloadVersion` 写「各 2 处」，实测各 **4 行**（`git grep -c` 数行，plan 数的出现次数）；`sidelightMermaidTheme` 写 ≥2 实测 **1**（实现提了常量）；`railSpace` 写 ≥3 实测 **2**（`setRailSpace` 大小写不同不计）。R4 已说明「计数只作附证，门是 tsc + E2E」。
2. plan §三 风险预估「静止时末卡残差 ≈17 px」，实测 **16 px**（`795.5 − 779.41`）。
3. T2 的 `impl.md`/CHANGELOG 里 A2 读数是 `lastCardBottom=298.5 < panelTop=310.97`（短文档、面板未钉到底），我这次播种的文档更长（`scrollMax=274`），读数是 `521.5 < 533.97`；两次都绿，口径一致。

## 8. 收尾（文档与提交）

- `docs/CHANGELOG.md`、`README.md`、`AGENTS.md`、`packaging/README.md`、`docs/typora-gap.md` 本轮条目已由实施侧写入，我逐条复核：`npm test` 384 条、首屏 293,205 B / 主 chunk 285,359 gzip / 余 26,795 B、roundtrip 5/7 + 7/7 —— **与我的实测逐字相等**；`git grep -n "1,304,634"` 已 0 命中；`README.md` 的「现在能不能」两条（Mermaid 切主题不重绘、写死字节）都已订正到位。
- `docs/iteration/STATE.md`：本轮加一行轮次记录、更新「当前版本与体积」段、待办池补一条旧脚本卫生项。
- 版本不动（0.32.1，plan 明确「不发版」）；`package.json` 无改动；`release/` 三份 SHA256 与开工前逐字节相同。
