# 第 45 轮 · 独立验收（tester）

- 轮次：`round=45`、`nn=45`；轮前 `startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`。
- 只读输入：`docs/iteration/round-45/plan.md`（含 revision 1–3）、`git diff`、本轮 `.tmp/e2e-r45-*.mjs`。**未读 `impl.md`**。
- 环境：dev server `http://localhost:5175`（200，未另起/未重启）、CDP **9222**（`Edg/157.0.4341.46`，未启动 Edge、未 kill msedge）、每段 E2E 前 `node .tmp/reset.mjs 9222`。
- 结论：**PASS-WITH-UNVERIFIED**（所有可执行验收标准独立复跑全绿；3 条 UNVERIFIED 均为计划本身声明的范围）。已 commit，HEAD 与 `startSha` 不同。

## 一、门禁（全部独立串跑，日志在 `.tmp/t45-*.log`）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | **exit 0**，无输出 |
| `npm test` | **29 个文件 380 条，0 fail**（`.tmp/t45-test.log`：`ℹ tests 380` 求和、`ℹ fail 0`） |
| `npm run roundtrip` | **rich 5/7、source 7/7**，`firstSaveBlocked 1/7`（`.tmp/t45-roundtrip.log`） |
| `npm run verify` | exit 0，`total raw=946673 gzip=292707 headroom=27293 files=3 max=320000`、`target=310000 gap=17293`、**`PASS`**；主 chunk `910048 raw / 284889 gzip`（`.tmp/t45-verify.log`） |
| `npm run build` | 随 `verify` 通过（`✓ built in 486ms`） |

首屏 **292,707 B**（第 44 轮 292,681 → +26 B），距硬线余 27,293 B、距内部预算余 17,293 B。与 README/AGENTS/CHANGELOG 写的数字一致。

## 二、T1（P1 数据安全）：恢复态不再被误判成脏

复跑 `.tmp/e2e-r45-impl-t1.mjs`（脚本按计划 I1–I6 写，`window.__slState` + `localStorage` + 源码框三处读数）：**14/14 PASS，`## RESULT {"total":14,"failed":[]}`，`errors:[]`**（`.tmp/t45-t1.log`）。

| 断言 | 实测 |
| :--- | :--- |
| I1a 恢复后干净 | `{name:"甲.md",mode:"edit",dirty:false}` |
| I1b 源码框 = localStorage | `same:true`，`srcLen=21` / `lsLen=21`，两侧尾均是 `段文字。第二处文字。丁\n` |
| I2a 恢复后进源码不脏 | `{mode:"source",dirty:false}`（**本轮核心**） |
| I2b 回编辑仍不脏 | `{mode:"edit",dirty:false}` |
| I3 直接切另一篇不弹框 | `{dialog:null,name:"乙.md",prose:"乙\n\n乙的正文在这里。"}` |
| I4 正对照 | 打字后 `dirty:true` → `Ctrl+Z` 后 `dirty:false` |
| I5c 保存前无对话框、盘上 = 种子 | `{sameAsSeed:true,dialog:null}` |
| I5a/I5b/I5d/I5e（恢复分支） | `dirty:false`；源码框 === `localStorage.text`（头 `---\ntitle: 丙\n---\n\n# 丙\n`，`srcLen=lsLen=29`）；以 `---\ntitle: 丙` 开头、以 `丙的正文。\n` 结尾；前 3 行 `---|title: 丙|---` |
| I5f 回编辑 | `h1:"丙"`、`dirty:false`、`dialog:null` |
| I5g reload 前盘上字节 | `---\ntitle: 丙\n---\n\n# 丙\n\n丙的正文。\n`（= 种子） |
| N1 负对照 | 树里正常打开 `丙.md`，前 3 行 `---|title: 丙|---`、`ok:true`（如计划所述不区分改前改后，未计入 PASS/FAIL） |

- 截图（本次复跑重写）：`shots/round-45/impl-t1-source-after-restore.png`（31,241 B）、`impl-t1-no-switch-dialog.png`（36,101 B）、`impl-t1-frontmatter-kept.png`（32,274 B）。
- 改前基线（对 `HEAD` = startSha 取）：`git grep -nE 'original: initial.text' HEAD -- src/App.tsx` → `HEAD:src/App.tsx:1034`（1 命中）；工作树 → **0 命中**。`git grep -nE 'raw: text' HEAD` → 0 命中；工作树 → **`src/App.tsx:480: raw: text,`**。两条互为正向对照，不是「恒 0」。
- 代码落点（与计划 3 处一致）：`src/App.tsx:458-487` 恢复器加 `raw`；`:1031-1046` 首次载入 effect 用 `raw` 写 `setOriginalText` / `rawTextRef` / 基线；依赖数组加 `initial.raw` / `setOriginalText`。`switchView` 与源码脏判定未放宽。

## 三、T2（P1+P2×2）：页边批注三处可见性

三个脚本按计划顺序串跑（各自先 reset 9222），**12 + 13 + 5 = 30 条断言全 PASS，三个脚本都 `failed:[]`、`errors:[]`**。

### E1–E4 遮罩（`.tmp/t45-t2a.log`，12/12）

- 1024×700 编辑态、`.analyze-button` 出批注卡、`Esc` 关抽屉后 `docLenBefore=62`。
- 开抽屉 → 鼠标停在 (300,350) → **`bg:"rgba(18, 20, 22, 0.32)"`**（不是 `rgb(232, 240, 237)`）、**`elementFromPoint` = `DIV.rail-backdrop`**、`.doc-column` 长度 `62 → 62`、`.ProseMirror` `visibility:"visible"`、`app rail-open` + `.margin-rail display:block`。
- E2：点遮罩关闭 → 遮罩不在 DOM、`app` 不含 `rail-open`、焦点 `rail-toggle`。
- E3：1440 宽窗开关仍在、`display:"none"`（宽窗行为未改坏）。
- E4：`data-theme=dark` 下背景仍 `rgba(18, 20, 22, 0.32)`、命中 `DIV`、正文长度相等。
- 截图 `shots/round-45/impl-t2-drawer-hover-1024.png`（92,161 B）。

### E5–E6 预览 / 源码不再留死开关（`.tmp/t45-t2b.log`，13/13）

- 抽屉开着（`app rail-open`、遮罩在）→ `Ctrl+Shift+P` 进预览：`.rail-toggle === null`、`.rail-backdrop === null`、`app` 不含 `rail-open`、`preview:true`、`docLen=62` 且含「写作往往不是一次成型的」。
- 截图 `impl-t2-preview-1024.png` = **42,744 B**（改前纯色 3,835 B；脚本阈值 >10,000 B）。
- 回编辑 → 开抽屉 → `Ctrl+/` 进源码：`.rail-toggle === null`、无遮罩、无 `rail-open`、`srcLen=64` 且以 `# 第一章` 开头。截图 `impl-t2-source-1024.png`（35,117 B）。
- 改前对照截图 `impl-t2-preview-before-control.png`（3,885 B）是实施方改前留下的纯色证据，本次复跑 `toggle === false` 整段跳过（脚本按计划写成两种状态都能跑）。

### E7 diff 箭头（`.tmp/t45-t2c.log`，5/5）

- 1440 编辑态：`.note-diff` 计算 `display:block`；`arrow [1057,411,13,18]`、`old.bottom=429`、`new.top=411` → **`main:true, guard:true`**（箭头与新文首行同行，`x=1057` 紧接旧文 `x=1015,w=225`）。
- 1024 抽屉：`display:block`、`arrow.top=338.28 = new.top=338.28`、`main:true, guard:true`（箭头在新行开头紧跟新文，不是独行——计划允许）。
- 截图 `impl-t2-diff-inline.png`（95,202 B）、`impl-t2-diff-drawer-1024.png`（91,257 B）。

### 基线计数

| 命令（工作树 / HEAD） | 改前 | 改后 |
| :--- | ---: | ---: |
| `git grep -cE 'role=.presentation.' -- src/App.tsx` | 4 | **5** |
| `git grep -c 'rail-backdrop' -- src/App.tsx` | 1 | 1（同一元素，配 E1b 的 DIV 命中） |
| `git grep -c "viewMode === 'edit' && (" -- src/App.tsx` | 0（exit 1） | **2**（开关 + 遮罩） |

## 四、T3（P1+P2×3）：安装器四条

### 基线 grep（改前取 `HEAD`，改后取工作树）

| 命令 | 改前 | 改后 |
| :--- | ---: | ---: |
| `git grep -c "SectionIn" -- packaging/installer.nsi` | 0 | **1** |
| `git grep -c "MUI_ICON" -- packaging/installer.nsi` | 0 | **1** |
| `git grep -c "MUI_UNICON" -- packaging/installer.nsi` | 0 | **1** |
| `git grep -c '^Icon "' -- packaging/installer.nsi` | 0 | **1** |
| `RMDir /r "$INSTDIR\www"` | 0 | **1（`:138`）** |

> **计划 R2-4 的口径只对了前半段**：`git grep -nF 'RMDir /r "$INSTDIR\www"'` 在本会话 PowerShell 下**仍是 0 命中、exit 1**（原生命令参数里的 `"` 被吃掉，单引号救不了），改后基线会凭空消失。我改用 PowerShell 原生 `Select-String -SimpleMatch` 读到 `138: RMDir /r "$INSTDIR\www"`，并用同文件另一行 `SetOutPath "$INSTDIR\www"` 作正向对照（1 命中）。已记入 `AGENTS.md` 第 8 节。

### 编译与安装探针（`.tmp/t45-install.log`）

- `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun` → **exit 0**，`fileVersion=0.32.1.0`，`assoc-dryrun=1304634 B`（只写 `.tmp`）。连跑两次同值 1,304,634 B。
- `fresh-install exit=0 missing=`（10 件载荷齐全）；`www files=97 bytes=3848092` **= 当时的 `dist`（97 / 3,848,092）**。
- 升级：放入旧 hashed chunk 后重装 → **`staleChunkStillThere=False`**，`www before=98 files / 3853094 B ; after=97 files / 3848092 B`。
- 卸载：`exit=0 dirLeft=False`、`HKCU uninstall key left=False`、`Start Menu shortcut=False`。
- 探针里 `cli-version EXCEPTION Access is denied`：沙箱内从 `.tmp` 安装目录取宿主版本被拒，属**环境限制**，不是 S1/S2/S3 验收项（记 UNVERIFIED 的环境分支）。

### S3 图标（`.tmp/t45-icon.log`）

```
old=4ccc4e8a51cbaee502426062c1c6cdb86cc183cc5e4c8548bc169cf440c7adb3
new=49f27fd0db0691c691f7ffdf2e7e8737519660437a371f6d01a15651cc29fc42
host=49f27fd0db0691c691f7ffdf2e7e8737519660437a371f6d01a15651cc29fc42
RESULT new-ne-old=True new-eq-host=True
```

### S2 只读主节

静态验收：`SectionIn RO` 在 `Section "Sidelight" SEC_MAIN` 下一行（`packaging/installer.nsi:101`），`MUI_PAGE_COMPONENTS` 仍 1、`Section /o ` 仍 1。向导里「取消勾选 → 装出空目录」的 UI 复现**不可脚本化**，按计划记 UNVERIFIED。

### `release/` 未动（R2-2 唯一有效证据）

| 文件 | 开工前 SHA256 | 收尾 SHA256 | 字节 |
| :--- | :--- | :--- | ---: |
| `Sidelight-0.32.1-win-x64-setup.exe` | `6C93F58F…26B2` | **同** | 824,595 |
| `Sidelight-0.32.1-win-x64-portable.zip` | `F4210C62…CD5DD` | **同** | 910,360 |
| `SHA256SUMS.txt` | `2F32C26A…CC9651` | **同** | 207 |

附加证据：`git status --porcelain release/` 空（release/ 被 `.gitignore:10` 忽略，恒空，不作单独证据）、`git diff --stat -- package.json` 空（版本仍 0.32.1）。

### S5 文档口径

`git grep -nE "1,300,711|1,622,355" -- README.md packaging/README.md`：**改前（HEAD）2 命中 → 改后 0 命中（exit 1）**，有 >0 正向对照。

## 五、与实施报告的偏差（我改了两处）

1. **文档里写死的安装包字节是旧 build 的**：`docs/CHANGELOG.md` / `README.md` / `packaging/README.md` 写的 `1,304,596 B` 与 `www` 的 `3,848,009 / 3,853,011 B`，是 `dist` 最后一次重建**之前**的读数（`dist` 现在 97 文件 / 3,848,092 B，比它大 83 B）。我用最终 `dist` 连编两次都得到 **1,304,634 B**，因此把三处数字改成可复现值：setup `1,304,634 B`、`www` 98 文件/`3,853,094 B` → 97 文件/`3,848,092 B`。NSIS 在固定 `dist` 下可复现（两次同值），差异来源是 build 时点，不是编译随机。
2. **计划 R2-4 的 grep 口径有误**（见 §四 的注），已按实际可行的 `Select-String` 取证，并把这条新坑写进 `AGENTS.md` 第 8 节。

## 六、UNVERIFIED（按计划本身声明的范围）

1. **`setOriginalText(raw)` 的保存字节效果**：无断言覆盖。原因：恢复态没有文件句柄，`Ctrl+S` 走「在工作区根建 `未命名.md`」（第 28 轮既定行为），而源码框值 / `dirty` / `localStorage.text` 三样读数都不经过这个 state（源码框走 `rawTextRef`、基线由 `original: raw` 直接给）。下轮补法：恢复态在正文末尾打 1 个字符 → `Ctrl+S` → 读刚落盘的新文件字节，断言 `endsWith('\n')`（只断言字节尾，不断言文件名）。
2. **组件页「取消勾选主节 → 装出空目录」**：向导点击不可脚本化（沙箱内不启动/不驱动安装向导 UI）。现有证据是 `SectionIn RO` 静态计数 0→1 与 NSIS 语义。下轮补法：真机双击 `setup.exe` 走到组件页，确认「Sidelight」灰选不可取消。
3. **`setup.exe` 图标的真机观感**：只到「提取 32×32 位图哈希 new != old 且 new == host.exe」；向导标题栏/任务栏的实际显示未截图（需要真机运行安装程序）。
4. **`typora-gap.md` / `typora-features.md` 3 处过期**：计划 §六 明确排下轮，本轮未改（不是遗漏）。

## 七、未判 FAIL 的说明

- 计划 T1 的副作用条目「恢复态无句柄 `Ctrl+S` 落到 `未命名.md`」在计划 §六 明确本轮不做，不算回归、不判 FAIL。
- `scripts/acceptance.mjs` 的两处过期断言（依赖「侧灯」演示文档与公式 `window.prompt`）本轮未跑；本轮回归由 `npm test`（380 条）、`roundtrip`（5/7、7/7）、T1 I4 正对照、T2 E2/E3（关闭出口与宽窗）覆盖。
