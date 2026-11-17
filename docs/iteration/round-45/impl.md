# 第 45 轮 · 实施报告（executor）

- 轮次：`round=45`、`nn=45`；轮前 `startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（开工实测同值）。
- 输入：`plan.md`（revision 3，含 §六 typora F6 行）、`plan-review.md`（3 次审查；**仍有一条 P2 R3-1 与 R3-2 未并入计划正文**，见 §四「与计划的偏差」）、`AGENTS.md` §4/§8、`common.md`、涉及源码。
- **按计划做了 T1 / T2 / T3 三个任务，全部完成，门禁全绿。** 没有 commit、没有 push、没有改 `package.json` 版本、没有写 `release/`（开工前与收尾两组 SHA256 逐字节相同，见 §3.4）。
- 环境：dev server 固定 `http://localhost:5175`（未重启）；浏览器只用 CDP **9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`。没有启动 Edge、没有 kill `msedge`。

## 一、开工前基线（先贴改前 >0，AGENTS §8）

```
$ git rev-parse HEAD            → 021cbd35d0a0422e519b5c008a3d47fca1bdccbb
$ git status --porcelain        → ?? docs/iteration/round-45/ ; ?? shots/round-45/
# —— T1
$ git grep -n "raw: text" -- src/App.tsx                 → 0（无输出，exit 1）
$ git grep -n "original: initial.text" -- src/App.tsx    → src/App.tsx:1034（1）
# —— T2
$ git grep -cE 'role=.presentation.' -- src/App.tsx      → src/App.tsx:4
$ git grep -c 'rail-backdrop' -- src/App.tsx             → src/App.tsx:1
$ git grep -c "viewMode === 'edit' && (" -- src/App.tsx  → 0（无输出，exit 1）
# —— T3
$ git grep -c "SectionIn" -- packaging/installer.nsi     → 0
$ git grep -c "MUI_ICON" -- packaging/installer.nsi      → 0
$ git grep -c 'Icon "' -- packaging/installer.nsi        → 0（单引号写法，按 R2-4）
$ git grep -nF 'RMDir /r "$INSTDIR\www"' -- packaging/installer.nsi → 0
# —— release/（R2-2；release/ 被 .gitignore:10 忽略，git 看不见）
Get-FileHash × 3（开工前）
  6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2  setup      824,595 B
  F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD  portable   910,360 B
  2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651  SUMS       207 B
# —— 产物盘点（编译前置条件，全部齐备）
dist 97 文件 / 3,848,009 B；host\bin 五件；packaging\sidelight.ico；.tmp\nsis\nsis-3.11\makensis.exe
```

> `git grep -c` 零命中时**不打印数字、exit 1**；上面写成 `→ 0` 指的是「没有输出」。

## 二、逐任务状态

### T1（P1，数据安全）：恢复文档不再被误判成脏 —— **完成**

改动文件：`src/App.tsx`（3 处，计划 §二 改动 1–2）

| 计划项 | 落点（改后行号） | 内容 |
| :--- | :--- | :--- |
| 改动 1a | `src/App.tsx:462` | `fallback` 加 `raw: ''` |
| 改动 1b | `src/App.tsx:480` | 返回对象加 `raw: text`（`text` 是 `:479` 拆之前的整串，含 frontmatter 与脚注定义） |
| 改动 2 | `src/App.tsx:1036-1044` | `const raw = initial.raw.length > 0 ? initial.raw : null`；`setOriginalText(raw)`；`rawTextRef.current = raw`；基线 `original: raw` |
| 改动 2b | `src/App.tsx:1053` | effect 依赖数组加 `initial.raw`（`setOriginalText` 是 `useState` setter，加上只为口径完整） |
| 不动 | `src/App.tsx:1924` 外 | `switchView` 与源码脏判定 effect 的判据保持「按字节比基线」，没有为这条缺陷放宽归一化 |

改前基线（`.tmp/impl-r45-t1.before.utf8.log`，**先把改动备份到 `.tmp\r45-impl-App.tsx.bak`、`git checkout --` 还原、跑完再逐字节恢复**，恢复后 `Get-FileHash` 与备份相同）：

```
## RESULT {"total":14,"failed":["I1b-source-byte-equal","I2a-source-toggle-not-dirty","I2b-back-to-edit-not-dirty","I3-no-switch-dialog","I5a-restored-not-dirty","I5b-source-equals-localstorage","I5d-fm-head-tail","I5f-back-to-edit-fm-kept"]}
## I2a-source-toggle-not-dirty FAIL {"mode":"source","dirty":true}
## I5b-source-equals-localstorage FAIL {"srcLen":27,"lsLen":29,"srcHead":"\"---\\ntitle: 丙\\n---\\n# 丙\\n\\n\"","lsHead":"\"---\\ntitle: 丙\\n---\\n\\n# 丙\\n\""}
## I3-no-switch-dialog FAIL {"dialog":"切换文档",...}
```

改后（`.tmp/impl-r45-t1.after.utf8.log`）：**14/14 全 PASS**，`## RESULT {"total":14,"failed":[]}`：

- I1a 恢复态 `dirty:false`、`name:甲.md`；I1b 源码框 === `localStorage.text`（21 === 21）。
- I2a/I2b 进源码 `dirty:false`、回编辑 `dirty:false`。
- I3 恢复态点 `乙.md` 直接切过去：`dialog:null`、正文「乙的正文在这里。」。
- I4 正对照：打一个 `Z` → `dirty:true`；`Ctrl+Z` → `dirty:false`。
- **I5（走恢复分支，不是树里打开）**：打开 `丙.md` → N1 负对照（改前改后都绿，`lines:["---","title: 丙","---"]`）→ `Ctrl+S`（`sameAsSeed:true`、无对话框）→ `reload` → `Ctrl+/`：I5a `dirty:false`、I5b 源码框 === `localStorage.text`（29 === 29）、I5d 以 `---\ntitle: 丙` 开头且以 `丙的正文。\n` 结尾、I5e 前 3 行恰为 `---`/`title: 丙`/`---`、I5f 回编辑 `h1 === 丙` 且 `dirty:false`；I5g reload 前读的盘上字节 === 种子。
- I6 `errors: []`。

自动保存写盘探针（计划 §二 风险与坑第 4 条，`.tmp/impl-r45-autosave.utf8.log`）：种一篇只有 `localStorage` 的「恢复态」文档 → reload → 停笔 2.5 s：

```
## autosave-after-restore {"atLoad":{"writes":[],"dirty":false,"name":"甲.md"},"afterIdle":{"writes":[],"dirty":false},"docKeyWrites":0,"writesGrewAtIdle":false}
```

`localStorage.setItem` 调用 0 次（含 `sidelight.doc.v1`）——`setOriginalText(raw)` 打开 `originalText !== null` 分支后，下一道「文件句柄或可写宿主」门仍然挡住，恢复态确实不写盘。

**截图**：`shots/round-45/impl-t1-source-after-restore.png`（31,181 B）、`impl-t1-no-switch-dialog.png`（36,101 B）、`impl-t1-frontmatter-kept.png`（32,212 B）。

### T2（P1 + P2×2，用户可见）：页边批注三处可见性 —— **完成**

改动文件：`src/App.tsx`（3 处）、`src/styles.css`（2 处）

| 计划项 | 落点（改后行号） | 内容 |
| :--- | :--- | :--- |
| 改动 1 | `src/App.tsx:5211-5213` | 遮罩 `button` → `div` + `role="presentation"` + `{railOpen && viewMode === 'edit' && (...)}`；无 `aria-label`、无 `tabIndex` |
| 改动 2 | `src/App.tsx:4654` | 「批注」开关包进 `{viewMode === 'edit' && (...)}`（不是 `disabled`，禁用仍会带 `aria-controls`） |
| 改动 3 | `src/App.tsx:1921-1925` | 新 effect：`viewMode !== 'edit'` 时 `setRailOpen(false)` |
| 改动 4 | `src/styles.css:1032-1046` | `.note-diff` 改 `display:block`（去掉 `flex`/`flex-wrap`/`align-items`/`gap`）；`.diff-arrow` 补 `margin: 0 4px` |

改前基线（三个 before 日志，同一手法：备份 → `git checkout --` → 跑 → 逐字节恢复）：

```
# t2a
## E1a-backdrop-color FAIL {"bg":"rgb(232, 240, 237)","cursor":"pointer"}
## E1b-hit-is-div      FAIL {"at":"BUTTON.rail-backdrop"}
## E4-dark-backdrop    FAIL {"bg":"rgb(34, 48, 46)"}
# t2b
## E5a-no-toggle       FAIL {"mode":"preview","toggle":true,"backdrop":true}
## E5c-no-rail-open    FAIL {"app":"app rail-open"}
## E5e-screenshot-not-solid FAIL {"bytes":3885}      ← 3,885 B 纯色图
## E6a-no-toggle       FAIL {"mode":"source","toggle":true,"backdrop":true}
```

改后：

- `t2a` **12/12 PASS**（`.tmp/impl-r45-t2a.after.utf8.log`）：E1a 计算背景 `rgba(18, 20, 22, 0.32)`；E1b `elementFromPoint(300,350)` 命中 `DIV.rail-backdrop`；E1c `.doc-column` 字数 62 === 62；E1d `.ProseMirror` `visibility:visible`；E1e `.app` 含 `rail-open`、`.margin-rail` `display:block`；E2 点遮罩关抽屉、焦点回 `.rail-toggle`；E3 1440 宽窗开关仍在但 `display:none`；E4 深色三项同值。
- `t2b` **13/13 PASS**（`.tmp/impl-r45-t2b.after.utf8.log`）：E5 预览 `.rail-toggle === null`、`.rail-backdrop === null`、无 `rail-open`、`.preview-pane` 在、`.doc-column` 62 字含首句、截图 **42,744 B**（改前 3,885 B 纯色）；E6 源码同四项，`textarea.source-editor.value` 64 字含 `# 第一章`；改前的 `AFTER_TOGGLE` 对照段因 `.rail-toggle === null` 自动跳过（没有 8 s 超时）。
- `t2c` **5/5 PASS**（`.tmp/impl-r45-t2c.after.utf8.log`）：1440 `display:block`，`old.bottom 429 / arrow.top 411 / new.top 411`（主判据 true、反独行守卫 true）；1024 抽屉 `display:block`，`old.bottom 336.28 / arrow.top 338.28 / new.top 338.28`（箭头与新文首行同行，两条都成立）。改前读数只作对照：`display:flex`，三段各占一行。

**截图**：`impl-t2-drawer-hover-1024.png`（92,161 B，半透明遮罩下正文可辨）、`impl-t2-preview-1024.png`（42,744 B，无「批注」开关、正文完整）、`impl-t2-source-1024.png`（35,117 B）、`impl-t2-diff-inline.png`（95,202 B，卡片里「旧文 → 新文」同一行流）、`impl-t2-diff-drawer-1024.png`、`impl-t2-preview-before-control.png`（3,885 B，**改前**纯色对照，保留作证据）。

### T3（P1 + P2×3，安装 / 体积）：安装器四条 —— **完成（S2 的 UI 复现 UNVERIFIED）**

改动文件：`packaging/installer.nsi`（3 处）、`README.md:114`/`:116`/`:37`、`packaging/README.md:57`、`docs/CHANGELOG.md`、`AGENTS.md:74`

| 计划项 | 落点（改后行号） | 内容 |
| :--- | :--- | :--- |
| S3 图标 | `packaging/installer.nsi:24-28` | ASCII 注释 + `!define MUI_ICON` / `!define MUI_UNICON` / `Icon "..\packaging\sidelight.ico"`（在 `:22` `!endif` 之后、`:47` 页面宏之前） |
| S2 只读主节 | `packaging/installer.nsi:101` | `Section "Sidelight" SEC_MAIN` 下一行 `SectionIn RO` |
| S1 清 www | `packaging/installer.nsi:137-138` | `File "..\LICENSE"` 之后、`SetOutPath "$INSTDIR\www"` 之前 `RMDir /r "$INSTDIR\www"` |
| S5 文档 | `README.md:114`、`README.md:116`、`packaging/README.md:57` | 见 §四 偏差条 |

改后 grep（全部与计划 §四 期望一致）：

```
git grep -c "SectionIn" -- packaging/installer.nsi     → 1
git grep -c "MUI_ICON" -- packaging/installer.nsi      → 1
git grep -c "MUI_UNICON" -- packaging/installer.nsi    → 1
git grep -c '^Icon "' -- packaging/installer.nsi       → 1
git grep -nF 'RMDir /r "$INSTDIR\www"' -- packaging/installer.nsi → 1
# 不许改坏的两条静态断言
git grep -c "MUI_PAGE_COMPONENTS" -- packaging/installer.nsi → 1
git grep -c "Section /o " -- packaging/installer.nsi         → 1
```

编译（**只写 `.tmp`**）：`powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun`

```
fileVersion=0.32.1.0  D:\Documents\SidelightProgram\.tmp\assoc-dryrun-setup.exe
target=45000000 gap=-43695404
assoc-dryrun=1304596 B  D:\Documents\SidelightProgram\.tmp\assoc-dryrun-setup.exe
[installer exit=0]
```

S1 安装级验证（`.tmp/e2e-r45-impl-install.ps1`，只把 `$setup` 换 `.tmp\assoc-dryrun-setup.exe`、`$dir` 换 `.tmp\impl-install`）：

```
dist files=97 bytes=3848009
RESULT fresh-install exit=0 missing=            ← 10 件载荷齐全
INFO www files=97 bytes=3848009                 ← 等于 dist
RESULT upgrade exit=0 staleChunkStillThere=False ← 改前同名脚本是 True
INFO www before=98 files / 3853011 B ; after=97 files / 3848009 B
RESULT uninstall exit=0 dirLeft=False
INFO HKCU uninstall key left=False
INFO Start Menu shortcut=False
```

> 探针第一次跑时 `upgrade exit=1`：脚本自带的 `cli-version` 一步在沙箱下抛 `Access is denied` 却把 `Sidelight.exe` 留在内存里，安装器 `CheckRunning` 直接 Abort。**这是探针的旧行为，不是产品缺陷**（改前 finder 跑同一脚本时那一步没留下进程）。补一次 `Get-Process Sidelight | Stop-Process` 后升级段通过；`RESULT` 之外的 `dist/www` 读数不受影响。

S3 图标（`.tmp/e2e-r45-impl-icon.ps1`，只读 `release/`，提取 32×32 位图算 PNG 哈希）：

```
old=4ccc4e8a51cbaee502426062c1c6cdb86cc183cc5e4c8548bc169cf440c7adb3
new=49f27fd0db0691c691f7ffdf2e7e8737519660437a371f6d01a15651cc29fc42
host=49f27fd0db0691c691f7ffdf2e7e8737519660437a371f6d01a15651cc29fc42
RESULT new-ne-old=True new-eq-host=True
```

S2 静态验收：`SectionIn RO` 0→1、`Section /o ` 仍 1、`MUI_PAGE_COMPONENTS` 仍 1（后两条同时是 `packaging/verify-installer.ps1:203-214` 的静态断言，正则不命中新增的 `SectionIn`/`MUI_ICON`/`Icon`/`RMDir`）。NSIS 语义：`SectionIn RO` 的节在组件页灰选、不可取消，`/S` 静默安装同样装它。**向导里「取消勾选主节 → 装出空目录」本轮 UNVERIFIED**（向导点击不可脚本化，沙箱还挡 WebView2 与管道捕获），补法是真人双击 `.tmp\assoc-dryrun-setup.exe` 在组件页看这一项是否灰着。

### 3.4 `release/` 没被碰（R2-2 的唯一有效证据）

开工前与收尾两组 `Get-FileHash` **逐字节相同**（收尾值见 §五）；`git status --porcelain release/` 为空只作附加证据（`release/` 被 `.gitignore:10` 整个忽略，改前改后恒空）。全程只跑了 `installer.ps1 -AssocDryRun`（`OUTFILE=..\.tmp\assoc-dryrun-setup.exe`），**没有**跑不带 `-AssocDryRun` 的 `installer.ps1`、也没有跑 `portable.ps1`。

## 三、统一门禁（串行，`.tmp/impl-r45-gates.log`）

```
npx tsc --noEmit        → exit 0
npm test                → exit 0；29 个文件 380 条全过（本轮不加单测，条数与第 44 轮相同）
npm run verify          → exit 0
  dist/assets/index-BOGRUlpG.js   910.04 kB │ gzip: 288.26 kB
  total raw=946673 gzip=292707 headroom=27293 files=3 max=320000
npm run roundtrip       → exit 0；rich 5/7 完全保真、source 7/7 等值（firstSaveBlocked: 1/7）
```

- 首屏 **292,707 B**（第 44 轮 292,681 → **+26 B**），内部 310,000 / 硬线 320,000，**余 27,293 B**。
- 主 chunk `910,048 B` raw / `284,889 B` gzip。
- `npm run verify` 会重写 `dist/`；跑门禁时没有别的角色在构建（串行跑完才写文档）。**注意：安装包探针用的是 `verify` 之前的 `dist`（同一份源码），`dist` 现在的 hashed 文件名已随本轮 `verify` 更新。**

## 四、与计划的偏差（最小改动绕过，未扩大范围）

1. **`setOriginalText(raw)` 的字节效果：按 R3-1 走「不测」**（`plan-review.md` 第 3 次审查 R3-1；计划正文 `§二 风险与坑` 第 2 条仍写着「若有余量再补一拍」，但该补测已证明会假绿——尾换行由 `rawTextRef = raw` 决定）。做法：只保留第 1 条（impl.md 写 UNVERIFIED、CHANGELOG 不承诺字节），**没有**跑那条会假绿的可选补测。**这一条 R3-1 R3-2 都还没并进 `plan.md` 正文，建议根代理同步。**
2. **README:114 的 S5 改写按 R3-2 收成一句**，而不是计划 `§四 改动 2` 的原文：旧句子里的「最新发布资产 824,209 B / 本机重建 824,595 B」「第 36 轮 1,299,777 B」「第 39 轮 1,300,711 / 1,622,355」整段替换成「以 Release 页的 `SHA256SUMS-<版本>.txt` 为准；第 45 轮本机 `-AssocDryRun` 重建（未发布）setup **1,304,596 B**」。**安装包预算不再在同一段出现两次**，段尾那句重复的「见 Release 页…」合并掉了。首屏那句「当前 292,681 B（第 44 轮…）」**整句替换**为 292,707 B / 余 27,293 / 内部余 17,293，第 45 轮增量作为「+26 B」接在增量链末尾（R3-2 第 2 条）。
3. **S5 安装包数字用的是本轮自己编译的 1,304,596 B**，不是 finder 的 1,303,397 B（那是**加图标之前**的旧 `.nsi`）：本轮改了 `.nsi` 才重编，字节数会变。便携 zip **本轮没有重打**，所以 README / `packaging/README.md` 里不再保留旧的 1,622,355 B。
4. **`README.md:116` 主 chunk 口径**：改成「以最近一次 `npm run build` 输出为准：第 45 轮 910,048 B raw，第 36 轮 898,601 B」，不留一个冒充长期事实的字节数。
5. **T3 编译时踩到一个坑（新增，建议进 AGENTS §8）**：`edit` 工具写 `packaging/installer.nsi` 会**去掉文件开头的 UTF-8 BOM**，makensis 立刻报 `Bad text encoding: packaging\installer.nsi:45` 并 exit 1（`.tmp` 里留下一个半成品 exe）。用 `[IO.File]::ReadAllText(UTF8 no-BOM)` + `[IO.File]::WriteAllText(..., UTF8Encoding($true))` 补回 BOM 后编译通过。**改这个文件后必须先看前三字节是不是 `ef bb bf`。**
6. **`.tmp/e2e-r45-impl-t2c.mjs` 的 1024 抽屉段改成新开页面**：同一 page 连续跑两轮 `goto` + 源码往返后，第二次 `waitForSelector('.doc-column .ProseMirror h1')` 12 s 超时（编辑器状态残留，不是产品缺陷）。新开 page 后 5/5 通过。
7. **T2 截图比计划多两张**：`impl-t2-source-1024.png`（E6 源码态）与 `impl-t2-diff-drawer-1024.png`（抽屉里的 E7 重复），都按 `impl-*` 命名，没有覆盖 finder 的 `r45-ui-*` / `bug-*`。`impl-t2-preview-before-control.png`（3,885 B 纯色）是**改前**对照，故意留着。
8. **没有跑** `packaging\verify-installer.ps1`（S4 本轮明确不做，且整跑在本沙箱必被 WebView2 `0x8000FFFF` 与管道捕获挡住）。

## 五、收尾自查（改前 >0 → 改后 0 的正向对照）

```
# release/ 收尾哈希（与 §1 开工前三组逐字节相同）
6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2  setup      824,595 B
F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD  portable   910,360 B
2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651  SUMS       207 B
git status --porcelain release/  → 空（附加证据）

# 文档里的过时字节：改前 2 处 → 改后 0
git grep -nE "1,300,711|1,622,355" -- README.md packaging/README.md  → 0（exit 1）
git grep -n "824,209" -- README.md packaging/README.md                → 0（exit 1）

# 本轮数字已落位
git grep -nE "1,304,596|292,707|27,293" -- README.md AGENTS.md packaging/README.md docs/CHANGELOG.md → 4 文件各 1 处

git diff --stat -- package.json  → 空（版本仍是 0.32.1）
git status --porcelain           → M AGENTS.md / README.md / docs/CHANGELOG.md / packaging/README.md /
                                    packaging/installer.nsi / src/App.tsx / src/styles.css
                                    ?? docs/iteration/round-45/ ; ?? shots/round-45/
```

## 六、CHANGELOG 建议条目

已直接写入 `docs/CHANGELOG.md`（`**第 45 轮（同一未发版区间）**`，位于第 44 轮块之后、`## 0.32.1` 之前）：恢复态不再误判脏（含 I5 的 frontmatter 守卫与「修的是误判脏、不是保存落点」的边界）、页边批注三处可见性、安装器三处、门禁数字、UNVERIFIED 四条。**没有**写「保存字节多出尾换行」这类承诺（R2-5/R3-1）。

## 七、新踩的坑（建议进 AGENTS §8 / STATE「踩过的坑」）

1. **`edit` 工具会剥掉 `packaging/installer.nsi` 的 UTF-8 BOM** → makensis 报 `Bad text encoding`（本轮实测，行号随文件长度漂移）。改完用 `[IO.File]::ReadAllBytes` 看前三字节 `ef bb bf`，缺了就用 `UTF8Encoding($true)` 写回。
2. **`.tmp/e2e-r45-install.ps1` 的 `cli-version` 一步在沙箱下会留下 `Sidelight.exe` 进程**（`Start-Process -NoNewWindow` 抛 `Access is denied`，但进程起了），紧接的升级安装被安装器的 `CheckRunning` 挡成 `exit=1`。跑升级段前先 `Get-Process Sidelight | Stop-Process`。
3. **同一 Playwright page 连续跑两轮 `goto` + 源码往返后，再 `getByRole('button', {name:'源码'}).click()` 回不到编辑态**（`waitForSelector('.doc-column .ProseMirror h1')` 12 s 超时）。同一脚本要跑两档视口时，第二档新开 page。
4. 结论仍成立：`role="presentation"` 的 `git grep -c` 在本会话要写 `-E 'role=.presentation.'`；写双引号版本会被 shell 吃掉（计划 §三 H3 注已记）。

## 八、UNVERIFIED（写清哪条、为什么、怎么补）

| 项 | 为什么测不了 | 下一轮怎么补 |
| :--- | :--- | :--- |
| `setOriginalText(raw)` 对**保存字节**的影响 | 恢复态没有文件句柄，保存落点走「在工作区根建 `未命名.md`」这条固有路径；I1–I6 读的 `dirty` / 源码框 / `localStorage` 都不经过这个 state（R2-5/R3-1） | 先定产品语义（恢复态保存要不要保住原名），再补「末尾打一个字符 → `Ctrl+S` → 读刚落盘字节」 |
| 组件页「取消勾选主节 → 装出空目录」的 UI | 向导点击不可脚本化；沙箱挡 WebView2 与管道捕获 | 真人双击 `.tmp\assoc-dryrun-setup.exe`，组件页确认主节灰选 |
| `setup.exe` 图标的真机观感 | 只到「提取 32×32 位图算哈希」这一层 | 真机双击看向导标题栏与任务栏 |
| 恢复态的自动保存写盘**跨进程**行为 | 只测了浏览器态 `localStorage`（0 次写入），宿主态没有 `/__doc` | 宿主窗口起得来时用 `host-save-acceptance` 补一拍 |
