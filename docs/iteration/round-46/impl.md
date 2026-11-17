# 第 46 轮 · 实现报告（executor）

- 轮次：`round=46`、`nn=46`；轮前 `startSha=39e4f0211f43b7edaca82d468d0997f029151e3c`（本轮 `git rev-parse HEAD` 同值，工作树只有未跟踪的 `docs/iteration/round-46/`、`shots/round-46/`）。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP `9222`；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`。
- 未 commit、未 push、未改 `package.json` 版本（临时改 0.32.2 验 S3 后已改回，`git diff -- package.json` 为空）、未改 `release/`（三份文件 SHA256 开工前后逐字节相同）。
- 任务状态：**T1、T2、T3 全部 DONE**，无 BLOCKED。

## 〇、一句话结论

- **T1**：卸载段按名单删自己的文件；`state\` 只 `Delete recent.json*` + 非递归 `RMDir`；A/B 两段探针 + S2/S3/S5 三条门全部拿到证据。setup dry-run 最终 **1,305,407 B**（payload 0.32.1.0）。
- **T2**：页边「整体评价」不再压卡 0 与模拟提示，门 A1/A2 全绿；抽屉里末卡按钮完整可点；静止时末卡底部 16 px 残差按计划写进「已知残差」（诊断项，不是门）。
- **T3**：切主题后 Mermaid 重绘，连线 `rgb(51,51,51)` → `rgb(211,211,211)`，对比度 **1.31:1 → 11.05**，`previewCount` 仍 1；切回浅色回到原值；单测 +4 条。
- 门禁：`tsc` 0、`npm test` **29 文件 384 条全过**、`roundtrip` rich 5/7 + source 7/7、`verify` 首屏 gzip **293,205 B**（PASS）。

## 一、T1（P1×2 + P2×3，安装 / 数据安全）：卸载只删自己写的文件 + 两道「别装错包」的门

### 1. 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `packaging/installer.nsi:193-229` | 卸载段 `RMDir /r "$INSTDIR"` 换成 12 条 `Delete "$INSTDIR…"` + `RMDir /r "$INSTDIR\www"` + `RMDir /r "$INSTDIR\webview2-data"` + `Delete "$INSTDIR\state\recent.json*"` + **非递归** `RMDir "$INSTDIR\state"` + `Delete "$INSTDIR\uninstall.exe"` + **非递归** `RMDir "$INSTDIR"`；3 处新注释全 ASCII；末尾原有 `DeleteReg*` 五行与「保留用户数据」注释原样 |
| `packaging/installer.ps1:28-37` | 新增加 payload 版本门：`host\bin\Sidelight.exe` 的 FileVersion 必须等于 `$version.0`，否则打印原因并 exit 1 |
| `packaging/portable.ps1:34-42` | 同一段门（用 `$bin`），位置在 `dist\index.html` 检查之后、`sidelight.ico` 检查之前 |
| `packaging/verify-installer.ps1:6` | 新加 `param([string]$Setup = '', [switch]$PreflightOnly)`（**必须是脚本第一条语句**，放在 `$ErrorActionPreference` 之前） |
| 同上 `:21-28` | `-Setup` 用 `[IO.Path]::IsPathRooted` 判定，相对路径 `Join-Path $root`（不吃进程 CWD） |
| 同上 `:52-78` | 新加 S2「批次门」：打印 setup 的字节/mtime/FileVersion 与 payload 对比，不同批记 UNVERIFIED；`-PreflightOnly` 打印 summary 后 exit 0 |
| 同上 `:127-140` | marker 写入包 try/catch + `$markerWritten` 状态位（S5） |
| 同上 `:248-254` | 用户数据保留断言按 `$markerWritten` 分派：写过就照旧 Pass/Fail，没写成记 UNVERIFIED |
| `README.md:114`、`packaging/README.md:57` | 删掉写死的 setup 字节（两处 `1,304,634`），只留「以 Release 页 `SHA256SUMS-<版本>.txt` 为准」 |
| `packaging/README.md:42-44` | `installer.ps1` 补 payload 版本断言说明；`verify-installer.ps1` 补批次打印、`-Setup`、`-PreflightOnly`、marker UNVERIFIED 说明 |

### 2. 静态基线（改前 → 改后，`Select-String -SimpleMatch`，含 `"` 的模式不用 `git grep`，AGENTS §8）

```
RMDir /r "$INSTDIR"                          改前 1 → 改后 0   ✅
Delete "$INSTDIR                             改前 0 → 改后 12  ✅（8 载荷 + assoc-plan.txt + host.log* + state\recent.json* + uninstall.exe）
RMDir /r "$INSTDIR\state"                    改前 0 → 改后 0   ✅（V2-R3：禁止递归删 state）
RMDir "$INSTDIR\state"                       改前 0 → 改后 1   ✅（非递归）
Delete "$INSTDIR\state\recent.json*"         改前 0 → 改后 1   ✅
RMDir "$INSTDIR"                             改前 0 → 改后 1   ✅（非递归）

git grep -c "payloadVersion" -- packaging        改前 0（exit 1 无输出）→ 改后 installer.ps1 4 行 + portable.ps1 4 行
git grep -c "markerWritten" -- packaging         改前 0（exit 1 无输出）→ 改后 verify-installer.ps1 3 行
Select-String 'param([string]$Setup' -SimpleMatch  改前 0 → 改后 1
git grep -n "1,304,634" -- README.md packaging/README.md  改前 2 → 改后 0（exit 1）
```

> 偏差（不影响门）：计划 §二 写「payloadVersion 两个文件各 2 处」，实测各 4 行——`git grep -c` 数的是**行**，注释里 2 行也含这个词。验收口径本来就写「改前 0 → 改后 >0」，以本表为准。

BOM（`edit` 工具会丢 BOM，实测四个文件改后前三字节都变了）：改完逐个用 `[IO.File]::WriteAllText(…, New-Object Text.UTF8Encoding($true))` 恢复，复查四个文件都是 `239,187,191`。语法解析：三个 ps1 `errors=0`（在当前会话直跑 `[Parser]::ParseFile`）。

### 3. 改前红基线（A 段）

按 plan-review N1 的修法 2：**没有**先 `-AssocDryRun` 重建一次，而是把 `release\Sidelight-0.32.1-win-x64-setup.exe`（旧包，卸载段仍是递归 `RMDir /r`）复制成 `.tmp\r46-old-setup.exe` 跑 A 段（`release/` 一个字节都不写）。探针 `.tmp/e2e-r46-impl-uninstall.ps1` 在改 `installer.nsi` **之前**先写好。

```
RESULT A install exit=0 installedOk=True missing=
RESULT A uninstall exit=0 keepMe=False herDoc=False exeGone=True wwwGone=True logGone=True recentGone=True userStateKept=False stateDirThere=False dirExists=False
```

（`userStateKept=False`、`dirExists=False`：旧包把 `state\mine.txt` 与整个目录一起删了。这一行是 `RMDir /r` 递归删的直接物证。）

### 4. 改后绿（A/B 两段，新 dry-run 包）

```
RESULT A install exit=0 installedOk=True missing=
RESULT A uninstall exit=0 keepMe=True herDoc=True exeGone=True wwwGone=True logGone=True recentGone=True userStateKept=True stateDirThere=True dirExists=True
  left: her-doc.md
  left: keep-me.txt
  left: state\mine.txt
RESULT B install exit=0 installedOk=True missing=
RESULT B uninstall exit=0 dirExists=False
```

逐条对断言汇总：
- A 段 `keepMe=True`、`herDoc=True`（别人的文件不动）、`logGone=True`（`host.log*` 通配命中两个）、`recentGone=True`（`state\recent.json` 删掉）、`userStateKept=True`（`state\mine.txt` 还在、`state\` 目录还在——**这正是 V2-R3 的靶子**：把 `Delete recent.json*` 换成 `RMDir /r` 时这里必红）、`exeGone=True`、`wwwGone=True`、`dirExists=True`（目录里有用户文件，非递归 `RMDir` 静默失败＝我们要的行为）；残留清单只有用户那三样。
- B 段 `dirExists=False`：干净目录（只放宿主自己写的 `state\recent.json`）卸载后整个删掉——同时证明「空 state 目录会被清掉」，不回归 `verify-installer.ps1:184-189`。

### 5. S3 红/绿（不写 `release/`）

- 绿：`installer.ps1 -AssocDryRun` → `payload fileVersion=0.32.1.0`、`fileVersion=0.32.1.0`、exit 0。
- 红：`edit` 把 `package.json` 的 `version` 临时改成 `0.32.2` →
  ```
  installer.ps1:  host\bin\Sidelight.exe 的 FileVersion 是 0.32.1.0，package.json 是 0.32.2。先重跑 host\build.ps1
                 exit=1
  portable.ps1:   同一句，exit=1
  ```
  改回 `0.32.1` 后 `git diff --stat -- package.json` 空。

### 6. S2 两个干跑（不安装）

```
# 默认 release/ 旧包（第 45 轮批次）
setup=824,595 B  mtime=2026-11-16 22:21:32  FileVersion=0.31.1.0
payload mtime=2026-11-17 19:50:03  FileVersion=0.32.1.0
UNVERIFIED setup 的 FileVersion 是 0.31.1.0，payload 是 0.32.1.0：装的是别的批次的包
summary: preflight（1 UNVERIFIED）
exit=0

# 当轮新包
setup=1,304,781 B  mtime=2026-11-17 20:50:42  FileVersion=0.32.1.0
payload mtime=2026-11-17 19:50:03  FileVersion=0.32.1.0
summary: preflight（0 UNVERIFIED）
exit=0
```

### 7. S5 定向跑（`%LOCALAPPDATA%` 不可写）

造法：`.tmp\r46-fake-la\Sidelight` 放一个**同名文件**，`$env:LOCALAPPDATA` 指到 `.tmp\r46-fake-la`，再跑 `verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe`。关键输出：

```
UNVERIFIED 用户数据 marker 写不进 D:\Documents\SidelightProgram\.tmp\r46-fake-la\Sidelight（受限环境）：Could not find a part of the path '…\impl-b-userdata-marker.txt'.
PASS 安装写入 D:\Documents\SidelightProgram\.tmp\install-verify（exe / config / ico / uninstall / SDK dll / www/index.html）
```

**S5 的靶点成立**：改前这里会因 `New-Item` 抛错、`$ErrorActionPreference='Stop'` 让脚本在第一条断言之前就硬退出；现在只记 UNVERIFIED 并继续到 `PASS 安装写入`。

这次定向跑**没有**跑到最后的「卸载残留 / 用户数据保留」两行，原因是一条**旧账**，不是本轮改动：

```
FAIL 运行中卸载未按预期失败：exit=0 exe=True
…
Start-Process : Access is denied（:191 的 --version 检查）
```

- 「运行中卸载 exit 0 但文件未删」在第 21/22 轮就被记录（`docs/iteration/round-21/findings-install.md:37`、`round-22/findings-install.md:14`），第 25 轮 test.md:25 原文写着「运行中卸载 **exit 0 但文件未删**，脚本按 FAIL 输出，产品未证明『运行中卸载会拒绝』」。本轮没动 `un.CheckRunning`，读数与第 25 轮逐字相同。
- 随后 `--version` 的 `Start-Process` 报 `Access is denied`：上一次「运行中卸载」已经把 `Sidelight.exe` 标成 delete-pending（其余载荷都删掉了），exe 无法再启动。第 45 轮也没跑这个脚本（`round-45/impl.md:198`「没有跑 `packaging\verify-installer.ps1`」），所以这不是本轮引入的回归。
- 按计划 §二，「环境 FAIL」只认 `FAIL 装后程序没起来`（`verify-installer.ps1:148`）；本轮那次跑里它是 **PASS**（`title=[Sidelight] http=200`）。上面这条 `运行中卸载` 既不是环境 FAIL，也不是本轮回归，而是 §六 该修的老账。**卸载残留与用户数据保留由 A/B 探针证明**（第 4 节）。

### 8. 压缩包/产物与 `release/`

- `installer.ps1 -AssocDryRun` 最终一次（**在 `npm run verify` 之后**，按 AGENTS §8 的顺序）：`payload fileVersion=0.32.1.0`、`assoc-dryrun=1,305,407 B`、exit 0；只写 `.tmp\assoc-dryrun-setup.exe`，不写 `release/`。
- `release/` 三份文件 SHA256，开工前与收尾各一次，逐条相等：
  ```
  6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2  setup (824,595 B)
  F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD  portable (910,360 B)
  2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651  SHA256SUMS (207 B)
  ```
  `git status --porcelain release/` 改前改后都空（附加证据）。

### 9. 计划文字的偏差（写清，不扩大范围）

1. 按 plan-review **N1 修法 1**：§八 砍单第 3 项（T1 的 B 段）**没有砍**——它是 §二 断言汇总第 2 条主断言。实际砍单：只砍 §八 第 2 项（T2 深色截图）。第 1 项 S5 定向跑跑完了，第 4 项（T3 切回浅色）也跑完了。代价是总耗时超 §八 估算，优先级按 `AGENTS §4` 取「稳定性 > 工作速度」。
2. **改前红基线**用旧包（plan-review N1 修法 2）而不是「先重建一次未改包」，省约 2 min，`release/` 未动。
3. 卸载块实际是 229 行结束（原 205 行），新增 3 行 ASCII 注释 + 12 条 `Delete` + 2 条 `RMDir /r` + 2 条 `RMDir`。

## 二、T2（P1，用户可见）：「整体评价」不再压住批注卡与模拟提示

### 1. 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/App.tsx:384-386` | 新状态 `const [railSpace, setRailSpace] = useState(0)` |
| `src/App.tsx:1956-1988` | layout effect：先量栏内流内内容底边 `flowBottom`（跳过 `.note` / `.rail-overall` / `.rail-cards-space`），`floor` 起点从 `-Infinity` 改成 `flowBottom`；循环后 `setRailSpace(pendingCount > 0 ? max(0, round(floor - flowBottom)) : 0)`；`setTops` 的比较逻辑不动 |
| `src/App.tsx:5070` | `<MarginRail railSpace={railSpace} />` |
| `src/components/MarginRail.tsx:19-20`、`:59`、`:243-246` | Props 加 `railSpace: number`；在「整体评价」之前插 `{pending.length > 0 && railSpace > 0 && (<div className="rail-cards-space" style={{ height: `${railSpace}px` }} aria-hidden="true" />)}` |
| `src/styles.css:802-814` | `.rail-overall` 加 `pointer-events: none`（面板本体不吃点击，滚过一瞬也不挡） |
| `src/styles.css:820-830` | `.rail-overall-head` 加 `pointer-events: auto` |
| `src/styles.css:846-851` | `.rail-overall-body` 加 `pointer-events: auto` |
| `src/styles.css:2537-2546` | 媒体查询里 `.rail-cards-space { display: none }`、`.app.rail-open .rail-overall { position: static }` |

### 2. E2E（`.tmp/e2e-r46-impl-t2-rail.mjs`，自带 `installDemoFolder` + `goto` + `waitForSelector` + RICH 播种，抄 `ui-main.mjs:1-27`/`:183-235`；测量段搬 `ui-4:48-143` 并扩成断言）

```
node .tmp/reset.mjs 9222 && node .tmp/e2e-r46-impl-t2-rail.mjs    # exit 0
INFO cardCount 3
RAIL_STATIC {"railRect":[996,136,260,1013],"scrollportBottom":872,
 "panel":{"rect":[996,779,260,93],"top":779.40625,"bottom":872,"position":"sticky"},
 "cards":[[996,262,260,164],[996,438,260,202],[996,652,260,144]],
 "card0":{"top":262,"bottom":425.5},"lastCard":{"top":652,"bottom":795.5},
 "maxCardBottom":795.5,"notice":{"rect":[996,200,260,50],"top":199.59,"bottom":249.97},
 "blockedTotal":0,"headHit":{"insideHead":true},"scroll":{"scrollTop":0,"scrollHeight":1285,"clientHeight":788}}
PASS 门 A1：第 1 张卡底部在面板顶之上（静止态） {"card0Bottom":425.5,"panelTop":779.40625}
PASS 提示不被面板压住 {"noticeBottom":249.96875,"panelTop":779.40625}
PASS 提示不被第 1 张卡压住 {"noticeBottom":249.96875,"card0Top":262}
PASS 面板在首屏可见 {"panelTop":779.40625,"innerHeight":900}
DIAG_STATIC {"maxCardBottom":795.5,"lastCardOverlap":16,"panelTop":779.40625,"scrollportBottom":872,"blockedButtonsTotal":0}
PASS 面板头可点（命中在 head 内）
PASS 面板头点一下折叠、再点回展开 {"before":"true","collapsed":"false","expanded":"true"}
PASS .note 数量仍是 3
RAIL_BOTTOM {"panel":{"top":310.96875},"lastCard":{"top":155,"bottom":298.5},"scroll":{"scrollTop":497,"scrollHeight":1285,"clientHeight":788}}
PASS 门 A2：滚到底后末卡底部在面板顶之上 {"lastCardBottom":298.5,"panelTop":310.96875,"scrollMax":497,"lastCardVisible":true}
DRAWER {"cardCount":3,"panel":{"top":631.03,"bottom":723.63,"position":"static"},
 "lastCard":{"top":475.53,"bottom":619.03},"overlap":-12,
 "lastCardButtons":[{知道了,[715,589,54,22],ok:true},{追问,[773,589,42,22],ok:true},{联网核对,[819,589,66,22],ok:true}],
 "railScroll":[740,700]}
PASS 抽屉：末卡底部在面板顶之上 {"lastCardBottom":619.03125,"panelTop":631.03125}
CONSOLE_ERRORS []
PASS 控制台无错误
SUMMARY {"pass":10,"fail":0}
```

与计划预测的对照（计划 §三 几何表）：`panelTop` 预测 779 / 实测 **779.40625**；末卡底预测 ≈796 / 实测 **795.5**；`lastCardOverlap` 预测 ≈17 / 实测 **16**；卡 0 `200→262` 预测 / 实测 **262**；`scrollportBottom` 预测 872 / 实测 **872**。改前对照（finder，`r46-ui-33`）：`blockedButtonsInCard0:3`、`overlapCard0:93`、`noticeCoveredByCard0:50`、抽屉 `overlap:28` → 改后 **0 / 提示完整 / −12**。

### 3. 截图（未覆盖 finder 的 `r46-ui-*`）

- `shots/round-46/impl-t2-rail-1440.png`（三张卡 + 提示 + 面板）
- `shots/round-46/impl-t2-rail-1440-crop.png`（页边栏放大：卡 0 三个按钮完整、提示完整可见；末卡底部约 16 px 在面板后，图注即计划 §三 的已知残差）
- `shots/round-46/impl-t2-rail-drawer-1024.png`（抽屉里末卡三个按钮完整）

### 4. 静态计数（改前 0 → 改后实测）

```
git grep -c "railSpace" -- src/App.tsx src/components/MarginRail.tsx   → App.tsx 2（状态声明 + JSX 传参）、MarginRail.tsx 4（注释/类型/解构/使用）
git grep -c "rail-cards-space" -- src                                  → App.tsx 1（跳过判断）+ MarginRail.tsx 1（spacer）+ styles.css 1（= 3）
```

> 偏差：计划 §二 验收写「App.tsx ≥3」——`setRailSpace` 里的 `RailSpace` 是大写 R，`git grep` 区分大小写，所以只有 2 行。计划自己也写了「以 tsc + E2E 为准」，门是 tsc + E2E（全绿）。

### 5. 已知残差（不是回归，计划 §三/§八 已写）

1440×900 静止时：滚动口底 872、面板高 93 → sticky 把面板钉在 `top=779.4`；修复后末卡底 795.5，`795.5 − 779.4 = 16.06` px 落在面板头后面（末卡按钮行高 22，静止时只露约 6 px）。滚约 20 px 即可点。本轮只承诺「第 1 张卡静止可点 + 每张卡都能滚到不被覆盖」，**不承诺**「静止时每张卡都不被覆盖」。想要 0 残差要走修法 B（`.rail-overall` 常态化 `position: static`，会改变长文档里「面板常驻视口底」的既有行为）——留给产品负责人拍板，本轮未做。

## 三、T3（P1，用户可见）：切主题后 Mermaid 跟着重绘

### 1. 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/mermaidLazy.ts:29-32` | 新模块状态 `appliedTheme: 'dark' \| 'default' \| null` |
| 同上 `:51-83` | 新导出纯函数 `resolveMermaidTheme(attr, prefersDark)`；`themeName()` → 导出 `mermaidTheme()`（读 `data-theme` + `matchMedia`，Node 守卫保留）；`configure()` 改用 `appliedTheme` 守卫，主题变才 `initialize` |
| 同上 `:85-90` | **`ensureMermaid()` 早退分支加 `configure(mermaid)`**（R1 隐藏前提） |
| 同上 `:110-135` | `renderDiagram()`：入口取 `themeAtEntry` 查缓存；`await ensureMermaid()` 之后再取一次 `theme` 算写键 |
| 同上 `:160` | `__resetForTest()` 重置 `appliedTheme` |
| `src/lib/mermaidPreview.ts` | 缓存键全改 `theme|hash`；`renderedTheme` 变了就清 `svgCache`/`errorCache`/`pendingTimers`；`applyContent/refreshLivePreviews/runRender/scheduleRender/makePreview` 全部改收 `renderKey`；widget `key` 改 `mermaid-${renderKey}@${pos}`；`apply()` 加 `getMeta('sidelightMermaidTheme')` 分支；插件 `view()` 装 `MutationObserver`（`data-theme`）+ `matchMedia` change 监听，`destroy` 里断开 |
| `src/lib/mermaidLazy.test.ts` | 加 4 条 `resolveMermaidTheme` 用例；现有「只加载一次，同一份代码只渲染一次」用例末尾加 `assert.equal(fake.inits.length, 1)`（R1 守卫） |

### 2. 与计划的两处写法偏差（都必要，不是范围扩大）

1. **`view` 放在插件 spec 顶层，不是 `props.view`**：计划 §四.2 写「插件 `props.view(editorView)`」——ProseMirror 的 `props` 只收 EditorProps（`decorations`、`handleKeyDown`…），`view` 是 Plugin spec 的顶层字段。写成 `props.view` 会被静默忽略、永远不调用（等于没装监听）。实际写成 `new Plugin({ key, state, view(editorView) {…}, props: { decorations } })`。
2. **widget key 带 `@${block.pos}`**：计划写 `key` 改 `mermaid-${renderKey}`，但 renderKey 只含 `theme|hash`，同一文档里两段相同代码块会**撞同一个 key**（现有测试 `mermaid：列表项里的围栏也收集` 与 `引用块…` 都在覆盖「同一代码可能出现两次」）。用 `mermaid-${renderKey}@${block.pos}` 同时满足「主题变→key 变→重建」与「一个 widget 一个 key」。

### 3. E2E（`.tmp/e2e-r46-impl-t3-mermaid.mjs`，自带 `goto` + `waitForSelector`，种子只有正文 + 一个 mermaid 围栏；不需要 `installDemoFolder`）

```
node .tmp/reset.mjs 9222 && node .tmp/e2e-r46-impl-t3-mermaid.mjs   # exit 0
LIGHT      {"theme":"light","container":"rgb(255, 253, 248)","edgeStroke":"rgb(51, 51, 51)","labelColor":"rgb(51, 51, 51)","previewCount":1,"svgPerPreview":[1],"pathCount":6,"hasShi":true}
PASS 浅色渲染 previewCount === 1
PASS 浅色每个预览一个 svg
DARK       {"theme":"dark","container":"rgb(28, 31, 35)","edgeStroke":"rgb(211, 211, 211)","labelColor":"rgb(204, 204, 204)","previewCount":1,"svgPerPreview":[1],"pathCount":6,"hasShi":true}
PASS 切深色后 data-theme=dark
PASS 深色下连线颜色变了（重绘） {"light":"rgb(51, 51, 51)","dark":"rgb(211, 211, 211)"}
PASS 深色下没有叠出第二个 svg {"previewCount":1,"svgPerPreview":[1]}
DARK_CONTRAST {"edge":11.05,"label":10.3}
PASS 深色连线对比度 >= 3    PASS 深色文字对比度 >= 3
PASS 图仍可读（path/line >= 1 且含「是」） {"pathCount":6,"hasShi":true}
SHOT shots/round-46/impl-t3-mermaid-dark.png
LIGHT_BACK {"theme":"light","container":"rgb(255, 253, 248)","edgeStroke":"rgb(51, 51, 51)","previewCount":1,...}
PASS 切回浅色后连线回到浅色值    PASS 切回浅色后 previewCount 仍 1
SHOT shots/round-46/impl-t3-mermaid-light-back.png
CONSOLE_ERRORS []
PASS 控制台无错误
SUMMARY {"pass":11,"fail":0}
```

改前红基线（finder，`r46-ui-26`）：连线与文字全 `rgb(51,51,51)`、对容器 `rgb(28,31,35)` 对比度 **1.31**、切深色不重绘 → 改后 **11.05 / 10.3**，`previewCount` 仍 1、每预览一个 svg。切主题用的是真实 UI 路径（`设置` → `深色` → `保存`，plan-review N3：**不是**照抄 `ui-3:113-118` 的「切回浅色」），切完 300 ms 读 `data-theme` 确认已是 `dark` 再取读数。

### 4. 单测

`npm test` 里新增 4 条（全过）：
```
✔ mermaid 主题：data-theme=dark → dark
✔ mermaid 主题：data-theme=light 时系统深色也按浅色
✔ mermaid 主题：没设置 data-theme 时跟随系统（深色）
✔ mermaid 主题：system + 系统浅色 → default
```
外加现有用例里的 `fake.inits.length === 1`（**不新增用例**，节点下主题恒 `default`，专防「每次渲染都 initialize」）。

### 5. 截图

- `shots/round-46/impl-t3-mermaid-dark.png`（深色下连线/箭头清晰）
- `shots/round-46/impl-t3-mermaid-light-back.png`（切回浅色后同一张图）

### 6. 静态计数（改前 0 → 改后实测）

```
git grep -c "resolveMermaidTheme" -- src/lib/mermaidLazy.ts        → 2（定义 1 + mermaidTheme() 里调用 1）
git grep -c "resolveMermaidTheme" -- src/lib/mermaidLazy.test.ts   → 5（import 1 + 四条用例各 1）
git grep -c "configure(mermaid)" -- src/lib/mermaidLazy.ts         → 2（早退分支 + 首次加载分支，R1 的靶子）
git grep -c "appliedTheme" -- src/lib/mermaidLazy.ts               → 4
git grep -c "renderKey" -- src/lib/mermaidPreview.ts               → 28
git grep -c "sidelightMermaidTheme" -- src/lib/mermaidPreview.ts   → 1（字面量只出现在 `const THEME_META` 定义行；getMeta/setMeta 都用常量，计划写的 ≥2 是按「两处都用字面量」估的）
git grep -c "theme: themeName()" -- src/lib/mermaidLazy.ts          → 0（exit 1）
```

> 偏差：`sidelightMermaidTheme` 实测 1 行而不是计划估的 ≥2——用常量比两处写字面量更稳（改一次就够），验收口径本来就是「计数只作附证，门是 tsc + E2E」。

## 四、门禁（全部串行跑过，无并发 build）

```
npx tsc --noEmit     exit 0
npm test             exit 0 —— 29 个文件 384 条全过（run=384 pass=384 fail=0）
npm run roundtrip    exit 0 —— rich: 5/7（04-reference-links 首次保存拦截 2、06-task-list +1）；source: 7/7
npm run verify       exit 0 —— total raw=948,109 gzip=293,205 headroom=26,795 files=3 max=320,000；target=310,000 gap=16,795；PASS
                     （主 chunk /assets/index-*.js raw 911,348 / gzip 285,359；CSS gzip 7,396）
installer.ps1 -AssocDryRun  exit 0 —— payload fileVersion=0.32.1.0、assoc-dryrun=1,305,407 B
```

首屏比第 45 轮（292,707 B）**+498 B**；内部预算 310,000 余 16,795 B，硬线 320,000 余 26,795 B。

## 五、文档与 CHANGELOG

- `docs/CHANGELOG.md`：在 `第 45 轮` 之后加 `**第 46 轮（同一未发版区间）**`，四条 + 门禁行 + UNVERIFIED 行（已写进文件，不是建议稿）。
- `README.md:64` Mermaid 能力条补「切主题会重绘（跟随系统也跟随）」；`:91` 删掉「切换主题不重绘」；`:114` 删写死字节、补第 46 轮 +498 B 与 293,205 B；`:133` 测试条数 384。
- `AGENTS.md:39`/`:72` 测试条数 380→384；`:72` Mermaid 条补「切主题会重绘，含跟随系统」；`§6` KaTeX 首屏 293,205 B / 余 26,795 B；`§8` 补 4 条坑（见下）。
- `packaging/README.md:42-44`、`:57`。
- `docs/typora-gap.md:34` Mermaid 行补「切主题会重绘（跟随系统也跟随）」。
- **不改** `docs/iteration/STATE.md`（根代理轮末统一更）。

## 六、UNVERIFIED

1. **`system` + 系统主题变化的真机切换**：沙箱不能改系统主题；只有 `resolveMermaidTheme` 纯函数单测与 `matchMedia` 代码路径。补法：Windows 设置里切「应用模式」（深/浅）后看一张**已经渲染过**的图是否重绘；`data-theme` 为 `null`/`system` 时必须跟随。
2. **T2 深色截图**：按计划 §八 砍单第 2 项砍掉（保留 1440 浅色 + 裁切 + 1024 抽屉三张）。深色下同一套几何由 CSS 变量驱动、`.rail-cards-space` 是纯高度 spacer，未单独截图验证；补法：`setTheme('深色')` 后重跑 `.tmp/e2e-r46-impl-t2-rail.mjs`。
3. **`packaging\verify-installer.ps1` 的完整整跑**：被第 21/22/25 轮就有的「运行中卸载 exit 0 但文件未删」挡住（详见 §一.7），定向跑的三条新门（S2/S3/S5）各自单独拿到了证据；「卸载残留」与「用户数据保留」两条由 A/B 探针覆盖。补法：先修 §六 那条老账（`un.CheckRunning` 在 `/S` 下的行为），再整跑。
4. **HKCU 卸载项 / 开始菜单 / 真人双击 / SmartScreen**：本沙箱 HKCU 写入不可观测，沿用 `verify-installer.ps1` 的 UNVERIFIED 口径。
5. **安装包字节**：`1,305,407 B` 是 `npm run verify` 之后重建的当次 dry-run 值；每轮 `dist` 变就变，本轮**不**回填文档（S4 的结论）。

## 七、新踩坑（已同步进 `AGENTS.md §8`）

1. **`edit` 工具改 `packaging/*` 会丢 UTF-8 BOM**（本轮实测四个文件改后前三字节都变了）：改完必须复查并 `WriteAllText(..., UTF8Encoding($true))` 补回，否则 PowerShell 5.1 按 ANSI 读中文 → 假语法错误，`makensis` 也拒收非 ASCII 注释。
2. **PowerShell 的 `param()` 必须是脚本第一条语句**：放到 `$ErrorActionPreference = 'Stop'` 之后是语法错误；注释块在它之前是允许的。`Parser::ParseFile` 能提前查到（`errors=0`）。
3. **ProseMirror 插件的 `view` 是 Plugin spec 顶层字段，不是 `props.view`**：写进 `props` 会被静默忽略、监听永远不装。
4. **`Decoration.widget` 的 `spec.key` 不变时 PM 会复用旧 DOM**：缓存键改了但 key 没改，看起来像「没更新」；key 要带上会变的那一维（`mermaid-${renderKey}@${pos}`，只带 hash 时两份相同代码块会撞 key）。
5. **`git grep -c` 数的是行、不是出现次数**：计划里「payloadVersion 各 2 处」实测各 4 行（注释也含这个词）；`git grep` 零命中时**不打印数字、exit 1**，验收表要按「改前 0（exit 1）→ 改后 N 行」写。
6. **`verify-installer.ps1 -Setup` 的相对路径必须 `Join-Path $root`**：`[IO.Path]::GetFullPath` 按进程 CWD 解析，在 `packaging\` 里跑就是假红。
7. **本沙箱的「运行中卸载」是旧账**：第 21/22/25 轮记录过 `exit 0 但文件未删`；它会把随后的 `--version`（`Start-Process`）变成 `Access is denied`（exe 已 delete-pending），整跑因此提前退出。判「卸载残留 / 用户数据保留」回归时不要把它当环境噪声，也不要用它当证据——用独立 A/B 探针。

## 八、改过的文件清单

```
packaging/installer.nsi          packaging/installer.ps1        packaging/portable.ps1
packaging/verify-installer.ps1   packaging/README.md            README.md
AGENTS.md                        docs/CHANGELOG.md              docs/typora-gap.md
src/App.tsx                      src/components/MarginRail.tsx  src/styles.css
src/lib/mermaidLazy.ts           src/lib/mermaidPreview.ts      src/lib/mermaidLazy.test.ts
```

新增（未跟踪）：`docs/iteration/round-46/impl.md`（本文件）、`shots/round-46/impl-*.png`（5 张）、`.tmp/e2e-r46-impl-uninstall.ps1`、`.tmp/e2e-r46-impl-t2-rail.mjs`、`.tmp/e2e-r46-impl-t3-mermaid.mjs`。

> 截图 5 张而不是 `roles/executor.md` 的 ≤4：计划 §三/§四 明确要 T2 三张 + T3 两张（T3 第 3 条要求「切回浅色」的图），按计划执行。
