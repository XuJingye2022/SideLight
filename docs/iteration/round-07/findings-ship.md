# 第 07 轮 发布与安装发现（ship）

侦察对象：`D:\Documents\SidelightProgram`，HEAD `92a3ac6`（`d5e7b8d` 之后只有文档提交）。工作树干净，`package.json` 版本 0.19.0，`release\Sidelight-0.19.0-win-x64-setup.exe` 794,843 B。本轮只读产品文件；没有跑 `npm run build`，没有占用 5173/9224，没有写注册表（只读查询），没有改 `src/`、`host/`、`packaging/`。

方法：

1. 读指定文件与 `src/App.tsx` 保存路径。
2. 在 `.tmp\ship-r7\ab\` 复制 `packaging\installer.nsi`，把 `OutFile` 与 `File` 换成 `.tmp` 与绝对路径，用仓库已下载的 `.tmp\nsis\nsis-3.11\makensis.exe` 编 5 个对照包量字节（对照包不是产品代码，产物全在 `.tmp`）。
3. 只读查注册表（`reg query`）看本机 `.md` 的现状。
4. 查本机 Windows 版本与 UCPD 服务状态。

本报告无截图：ship 视角的证据是字节数、编译器退出码与注册表键值，不是界面。

## 字节基线（实测，2026-11-15）

| 项 | 值 | 证据 |
| :--- | ---: | :--- |
| 已发布 0.19.0 安装包 | 794,843 B | `release\` 目录实测 |
| 同一 HEAD 重编（对照 base） | **794,667 B** | `.tmp\ship-r7\ab\base-setup.exe` |
| 重编差 | −176 B | 见 S5：脚本/产物漂移，不影响下面所有增量 |
| 载荷 | 2,384,318 B | `host\bin` 五件 1,002,020 + `dist` 1,382,298 |
| 安装包/载荷 | 33.3% | 794,667 / 2,384,318 |
| 硬线余量 | **55,157 B** | 850,000 − 794,843 |

## S1 关联实现了，也没法在本沙箱证明「静默默认不装」（高）

**证据**

- `packaging\verify-installer.ps1:94-109`：HKCU 卸载项与开始菜单只报 `UNVERIFIED`，因为本沙箱的 HKCU 写入被环境吞掉；`packaging\README.md:48` 记着同一条限制。
- 现在的静默安装断言只有目录、`www\index.html`、程序能起、卸载清理（`:59-92`、`:120-134`），**没有任何一条**读 `HKCU\Software\Classes`。
- 本机只读查询证明这两个键真实存在且用户数据在其中：`HKCU\Software\Classes\.md\OpenWithProgids` 只有 `VSCode.md` 一个值。装/卸若写错，会直接改动真实用户配置。
- 本轮我在 `.tmp` 编出的对照包能过编译（`makensis` exit 0），但没有运行：运行会写 HKCU，超出本轮只读边界；`/S` 运行还会因沙箱 stdio 继承把命令挂住（本轮两次实测都挂住，已终止，不留进程）。

**影响**

简报第 2 条要求「静默安装默认不装」。这条只能靠 `Section /o` 的语义保证，而验收脚本给不出证据。若本轮只写实现不补验收，下一位评审只能看图说话。

**建议**

给 `installer.nsi` 加一个编译开关 `!ifdef ASSOC_DRYRUN`：同一个关联节，把 `WriteRegStr` 换成 `FileWrite "$INSTDIR\assoc-plan.txt"`。`verify-installer.ps1` 用这个开关编一个包并断言：

1. `/S` 装完，`assoc-plan.txt` 不存在（默认不装）。
2. `/S /COMPONENTS=<关联节号>` 或交互式勾选后，文件内容恰好是本方案那 10 条键与值（不多不少）。
3. 卸载后 `assoc-plan.txt` 随目录删除，`DeleteRegValue` 行在脚本里逐条存在（文本断言）。

真实 HKCU 的三条（装后出现、卸载后消失、`VSCode.md` 仍在）仍需真人，写 `UNVERIFIED`。

**难度** M（NSIS 8–12 行 + 验收脚本 30 行）。

## S2 默认程序装不出来，文案与验收只能承诺「打开方式候选」（高）

**证据（本机只读，Windows 11 23H2 / 10.0.22631）**

- `HKCU\...\Explorer\FileExts\.md\UserChoice`：**键不存在**（`reg query` 报 «系统找不到指定的注册表项»）。
- `HKCR\.md` 与 `HKCU\Software\Classes\.md` 的默认值都是 «值未设置»，即本机 `.md` 目前没有默认程序。
- 对照 `HKCU\...\FileExts\.txt\UserChoice` 有 `ProgId = Applications\notepad++.exe` 与 `Hash = 4VFIy89mk7U=`；这就是 Windows 8 起的 Hash 校验形式。
- `Get-Service UCPD` → `Running / System`：本机就有 UserChoice 保护驱动（Windows 11 的 UCPD.sys）。
- 官方文档：`OpenWithProgids` 的值类型可以是 `REG_NONE` 或 `REG_SZ`，数据为空串；`Applications\<exe>` + `SupportedTypes` 是另一条等效路径（[如何在「打开方式」里包含应用](https://learn.microsoft.com/en-us/windows/win32/shell/how-to-include-an-application-on-the-open-with-dialog-box)、[app registration](https://learn.microsoft.com/en-us/windows/win32/shell/app-registration#using-the-applications-subkey)）。Firefox 的实现笔记也把 UserChoice 描述为「越来越难由程序设置，只能在用户同意下经系统 API」（[Set Default](https://firefox-source-docs.mozilla.org/widget/windows/shell/set-default.html)）。

**影响**

安装器能做的只有「注册候选」。复选框或 README 一旦写成「关联 .md」「双击就用 Sidelight 打开」，就是假承诺，而且用户装完发现双击仍弹选择框，信任直接掉。

**建议**

- 复选框文案：「在「打开方式」中加入 Sidelight（不改默认程序）」。
- 说明文字：「装完右键 `.md` → 打开方式里能看到 Sidelight。要设成默认程序，请在 Windows 设置里自己选。」
- 验收里写清本机现实：`.md` 无 UserChoice、无默认值，勾选后只增加候选；不写、也不尝试写 UserChoice。

**难度** S（文案 + 验收条目）。

## S3 README 的「保存前把差异摆出来」对宿主文档不成立（中）

**证据**

- `src\App.tsx:1612-1623`：`hostDoc.ready` 时 `saveFile` 直接 `sendHostSave` 并 `return`，走不到 `:1633-1640` 的差异确认。
- `src\App.tsx:1632-1639`：差异确认还带 `!saveWarned`，一篇文档只提示一次；之后同一篇再改再存不再提示。
- `README.md:34` 写「第一次保存会把被规范化的行列出来，你确认后才写」；双击打开的文档是本轮主路径，这句对它是假的。
- `src\App.tsx:139-143` 的 `findRiskySyntax` 只认引用式链接，不认表格对齐；`docs\roundtrip-report.md:209-220` 显示表格对齐仍被重排。
- `risks` 只用于渲染横幅（`src\App.tsx:2771-2780`），保存路径 `:1607-1643` 从不读它，所以今天确实是「提示了但照样写」。

**影响**

本轮若只做「拒绝静默保存」，README 第 34 行与新的拦截行为会互相矛盾：一边说会先给你看差异，一边宿主路径根本不给看。

**建议**

按下面「数据保真的不虚假承诺写法」换掉 `README.md:31`、`:34`、`:43` 三段，并把拦截做在保存入口而不是横幅按钮上。

**难度** S（文案）；拦截实现见「数据保真口径」。

## S4 组件页本身才是体积成本，注册表写入几乎不花钱（中）

**证据（同一 makensis 3.11、同一载荷、solid LZMA 32 MB）**

| 对照包 | 与 base 的差 | 内容 |
| :--- | ---: | :--- |
| `base-setup.exe` | 0（794,667 B） | 现 `installer.nsi` |
| `msg-setup.exe` | **+397 B** | 不用组件页；主节里 `MessageBox MB_YESNO … /SD IDNO` + 同样 10 条写 + 4 条删 |
| `assoc-setup.exe` | **+2,656 B** | 组件页 + 10 条写 + 1 条说明文字 + 4 条删 |
| `min-setup.exe` | **+2,661 B** | 组件页 + 只 5 条写（ProgID 四件 + `OpenWithProgids`）+ 4 条删 |
| `dummy2-setup.exe` | +2,922 B | base 多带 12,559 B 不重复的前端源码文本 |

**读法**

1. 组件页与它的说明文字约 **2,259 B**（2,656 − 397），占整个增量的 85%。注册表那 10 条字符串只值约 **397 B**（即 `msg` 对照包的全部增量），在 solid LZMA 里几乎不增加字节：删掉 5 条反而大了 5 B（压缩噪声）。
2. 前端新增代码的安装包成本约 **23%** 原始字节（12,559 → 2,922）；重复文本更低（11,130 → 1,736，15.6%）。所以「数据保真」改 10 KB 前端代码，安装包约 +2.3 KB。

**影响**

如果计划里为了省体积改选 MessageBox，省 2.2 KB 却丢掉一页说明与「可解释性」；反过来，为组件页担心体积是没根据的。

**建议**

组件页照做。预算表：794,843 + 2,656（关联）+ 约 2,500（前端 10 KB 量级）= **约 800,000 B**，离硬线还差约 50,000 B。

**难度** S（决策）。

## S5 字节数与 SHA 散在 5 处，重打包后必有一处忘记（低）

**证据**

- 记着 0.19.0 安装包字节的地方：`README.md:40`、`README.md:65`、`docs\CHANGELOG.md:18`、`docs\iteration\STATE.md:53`、`packaging\README.md:56`。
- 已出现不一致：记录是 794,843 B，我从同一 HEAD 重编是 794,667 B（−176 B）。说明脚本或载荷在出包后有微小改动，记录没跟着动。
- 版本号同样散在 `README.md:40`（安装包文件名）、`docs\CHANGELOG.md`、`AGENTS.md:70`、`STATE.md:52`。

**影响**

0.20.0 重打包后要手改 5 处字节 + 2 个 SHA256，漏一处就出现「README 说 A、安装包实测 B」。上一轮已经因此出现过过期数字（第 06 轮 S3）。

**建议**

字节与 SHA 只在 `CHANGELOG.md` 当次条目写一次，README 改成「字节与校验和见 CHANGELOG 0.20.0」。`STATE.md` 只记一行摘要并指向 CHANGELOG。`installer.ps1` 已经把三项都打印出来（`:69-72`），复制时以它为准。

**难度** S。

## 关联实现最小方案

### 选型

| 维度 | A. 组件页（**推荐**） | B. 自定义页（nsDialogs） | C. MessageBox |
| :--- | :--- | :--- | :--- |
| NSIS 增量 | **+21 行 / +2,656 B（实测）** | 约 50–70 行 / 估 +3–4 KB | +12 行 / **+397 B（实测）** |
| 默认状态 | `/o` = 不勾；`/S` 不装 | 默认不勾；`/S` 跳过页，不装 | `/SD IDNO` 默认否；`/S` 答否 |
| 可解释性 | 说明文字常驻，能写「不改默认程序」 | 最强，可写多段 | 一行模态框，容易点错 |
| 代价 | 多一页，改变安装流程 | 自绘页的本地化/布局/键盘要自己做 | 打断安装，无法解释 UserChoice |

选 A。C 只在「本轮一个字节都不能涨」时才考虑，而实测余量 55 KB，不成立。

### 落地补丁（相对现 `packaging\installer.nsi`，+21 行）

```nsi
; 1) 页面顺序：目录 → 组件 → 安装
 !insertmacro MUI_PAGE_DIRECTORY
+!insertmacro MUI_PAGE_COMPONENTS
 !insertmacro MUI_PAGE_INSTFILES

 ; 2) 关联节：/o = 默认不勾；静默安装不选任何节，因此 /S 不写
+Section /o "在「打开方式」中加入 Sidelight" SEC_ASSOC
+  WriteRegStr HKCU "Software\Classes\Sidelight.md" "" "Sidelight Markdown 文档"
+  WriteRegStr HKCU "Software\Classes\Sidelight.md" "FriendlyTypeName" "Sidelight Markdown 文档"
+  WriteRegStr HKCU "Software\Classes\Sidelight.md\DefaultIcon" "" "$INSTDIR\Sidelight.exe,0"
+  WriteRegStr HKCU "Software\Classes\Sidelight.md\shell\open\command" "" '"$INSTDIR\Sidelight.exe" "%1"'
+  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md" ""
+  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe" "ApplicationName" "${APPNAME}"
+  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe" "ApplicationCompany" "${PUBLISHER}"
+  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe" "ApplicationIcon" "$INSTDIR\Sidelight.exe,0"
+  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe\shell\open\command" "" '"$INSTDIR\Sidelight.exe" "%1"'
+  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe\SupportedTypes" ".md" ""
+SectionEnd
+
+!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
+  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_ASSOC} "在资源管理器的「打开方式」列表中加入 Sidelight。不改变 .md 的默认程序。"
+!insertmacro MUI_FUNCTION_DESCRIPTION_END

 ; 3) 卸载对称删除，顺序放在删安装目录之后
   DeleteRegKey HKCU "${UNINST_KEY}"
+  DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md"
+  DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"
+  DeleteRegKey HKCU "Software\Classes\Sidelight.md"
+  DeleteRegKey HKCU "Software\Classes\Applications\Sidelight.exe"
   DeleteRegKey HKCU "Software\Sidelight"
```

### 写哪些键，为什么

| 键 | 值 | 作用 |
| :--- | :--- | :--- |
| `HKCU\Software\Classes\Sidelight.md` | 默认值「Sidelight Markdown 文档」 | ProgID 的显示名，「打开方式」里显示的就是它 |
| `…\Sidelight.md\FriendlyTypeName` | 同显示名 | 资源管理器用它做本地化类型名 |
| `…\Sidelight.md\DefaultIcon` | `$INSTDIR\Sidelight.exe,0` | 「打开方式」里显示图标 |
| `…\Sidelight.md\shell\open\command` | `"$INSTDIR\Sidelight.exe" "%1"` | 选中后怎么启动 |
| `…\.md\OpenWithProgids` | 值名 `Sidelight.md`，空 `REG_SZ` | 把 ProgID 挂到 `.md` 的候选列表。官方允许 `REG_NONE` 或空 `REG_SZ` |
| `…\Applications\Sidelight.exe` | `ApplicationName` / `ApplicationCompany` / `ApplicationIcon` | 应用级注册：让「打开方式」显示产品名与图标，而不只是一个 ProgID |
| `…\Applications\Sidelight.exe\shell\open\command` | 同上命令行 | 应用级启动命令 |
| `…\Applications\Sidelight.exe\SupportedTypes` | 值名 `.md` | 限定它只出现在 `.md` 的候选里 |

只动 `HKCU\Software\Classes`。不写 `HKLM`，不写 `HKCU\...\FileExts`，不写 `UserChoice`，不改 `.md` 默认值。

### 卸载对称

- 先 `DeleteRegValue` 再 `DeleteRegKey /ifempty`：本机 `OpenWithProgids` 里有 `VSCode.md`（实测），整体删键会连别人的候选一起删掉，所以必须 `/ifempty`。
- `DeleteRegKey HKCU "Software\Classes\Sidelight.md"` 与 `Applications\Sidelight.exe` 必须删：否则留下指向已删除 exe 的命令行。
- 未选关联的安装，卸载时这几条是空操作（NSIS 删不存在的键/值不报错），所以卸载节不用存标志位。
- 不碰 `FileExts\.md\OpenWithList`。用户若曾用「打开方式」选过一次，那里可能留一个 `Sidelight.exe` 的 MRU 条目；它的值名是 `a`/`b` 加 `MRUList` 顺序串，卸载器改它容易把别的程序顺序弄坏。残留按已知限制写进文档（见 UNVERIFIED）。

### 静默默认不装

`Section /o` 的语义是「默认未选中」。`/S` 不显示组件页，因此按默认选择执行 → 关联不装。这也满足 `packaging\verify-installer.ps1:59` 现有 `/S` 流程不改用户配置。**本沙箱没有运行验证**（会写 HKCU），需要 S1 的 dry-run 开关或真人复核。

### 风险

1. 组件页新增一页，安装流程从「两页」变「三页」；`README` 的安装步骤要加一句。
2. `Applications\Sidelight.exe` 是全局应用注册：若用户同时装了便携版并把它注册过（现在不会，`packaging\README.txt:4` 明写便携版不写注册表），两条路径会互相覆盖。可接受。
3. 空串 `REG_SZ` 与 `REG_NONE` 的差别只在极端旧版本上有差异；官方两者都允许。若真人复验发现「打开方式」里不出现，先查这条，再试改用 `Applications` 路径单独注册。
4. 本地化：`Section` 名与说明文字是硬编码中文。安装器只有 `SimpChinese` 一种语言（`installer.nsi:34`），可接受；以后加英文语言时这两句要进 `LangString`。

## 版本与文档清单

### 版本：0.20.0

- AGENTS §5：功能 +0.1.0，修复 +0.0.1（`AGENTS.md:58`）。本轮加用户可见能力（`.md` 出现在「打开方式」），不是补丁。
- 简报已写 0.20.0（`docs\iteration\round-07\brief.md:14`）。
- 动作：`package.json:3` 0.19.0 → 0.20.0。`installer.ps1` 与 `verify-installer.ps1` 都从 `package.json` 读版本（`installer.ps1:6`、`verify-installer.ps1:9`），产物名自动变 `Sidelight-0.20.0-win-x64-setup.exe`。`release\` 里旧的 0.19.0 包别删错。

### CHANGELOG 草稿（0.20.0，2026-11-15）

方括号是发布时由 releaser 按 `packaging\installer.ps1` 输出填的实测值，不能预填。数据保真那一段给了两种写法，按本轮实际结果二选一，不要两种都留。

```markdown
## 0.20.0 — 2026-11-15

`.md` 可以自己决定要不要出现在「打开方式」里；富文本模式不再静默改写会丢失写法的文档。

数据保真（按实际结果二选一）：

- A（修到保真）：引用式链接与表格对齐在保存时保留原写法；`npm run roundtrip` 从 3/7 升到 [N]/7。
- B（拒绝静默保存）：打开文档时先做一次往返比对。若这篇文档在富文本模式下会被改写，保存时拦下并列出会改的行，可「改用源码模式保存」或取消；源码模式保存不改写法。风险检测从「只看引用式链接」扩到往返比对，表格对齐也覆盖。

`.md` 关联（opt-in）：

- per-user 安装器新增组件页，复选框「在「打开方式」中加入 Sidelight」默认不勾；`/S` 静默安装不写关联。
- 勾选后只写 `HKCU\Software\Classes`：ProgID `Sidelight.md`（显示名、图标、启动命令）、`.md\OpenWithProgids` 加一个值、`Applications\Sidelight.exe`（ApplicationName / ApplicationCompany / ApplicationIcon / SupportedTypes）。
- 不写 `UserChoice`，不改 `.md` 默认程序；设默认仍要用户在 Windows 设置里自己选。
- 卸载对称删除上述键；`OpenWithProgids` 用 `/ifempty` 清空，保留其他程序的候选（如 VSCode）。
- 便携 zip 仍不写注册表，不做关联。

- 文档：新增 ADR-000[7]，更新 README、AGENTS、`packaging\README.md` 与包内 `README.txt`。
- 测试：[N] 个文件 [M] 条。
- 体积：构建产物 [X] B；安装包 [Y] B（SHA256 `[...]`）、便携 zip [Z] B（SHA256 `[...]`）。关联实现实测 +[2,656] B。
- 未验：勾选后「打开方式」里是否出现、卸载后是否残留失效条目、真人交互安装与静默安装的关联差异；本沙箱 HKCU 写入不可观测。
```

### 要记的改动（进不进 CHANGELOG）

| 改动 | 进 CHANGELOG |
| :--- | :--- |
| 数据保真（A 或 B，按实际） | 是 |
| 关联组件页与注册表写入 | 是 |
| 卸载对称删除 | 是（同一节里写一句） |
| ADR-0007 / 文档更新 | 是（一行） |
| 测试条数变化 | 是 |
| 字节与 SHA256 | 是（发布时实测） |
| 第 6 轮收尾文档、第 7 轮简报 | 否（非用户可见） |

### README 必改行（含替换句）

| 位置 | 现状 | 改成 |
| :--- | :--- | :--- |
| `README.md:31` | 「打开用到引用式链接的文档时，顶部提示编辑器读不全，可一键转源码模式。」 | 见下「数据保真」§1 |
| `README.md:34` | 「第一次保存会把被规范化的行列出来，你确认后才写。」 | 见下「数据保真」§2 |
| `README.md:40` | 安装包名 `0.19.0`；未验清单 | `0.20.0`；未验清单加「勾选关联后「打开方式」与卸载残留」 |
| `README.md:41` | 「没有 .md 文件关联：双击 .md 不会用 Sidelight 打开，要在「打开方式」里手动选一次。」 | 「`.md` 默认不关联。安装时勾选「在「打开方式」中加入 Sidelight」后，右键 `.md` 的「打开方式」里会多一项；默认程序仍要在 Windows 设置里自己选，安装器不改它。」 |
| `README.md:43` | 「引用式链接打开再保存会被改写成行内链接；打开时提示，保存前把受影响的行摆出来给你确认。」 | 见下「数据保真」§3 |
| `README.md:50` | 「当前已有 21 项，缺 18 项」 | 按 `typora-gap.md` 复核；本轮若没动那张表就保持并注明「未含 `.md` 关联」 |
| `README.md:54` | `dist` 1,382,298 B | 0.20.0 实测 |
| `README.md:65` | 安装包 794,843 B + 两个 SHA256 | 改成「字节与校验和见 CHANGELOG 0.20.0」（S5） |
| `README.md:72` | 「16 个文件、177 条断言」 | 以 `npm test` 输出为准 |
| `README.md:104` | ADR「0001–0006」 | `0001–0007` |
| `README.md:118` | 已定决策清单 | 加一条：`.md` 只加「打开方式」候选，不设默认程序，见 ADR-0007 |
| `README.md:122` | 「当前结果：3 / 7 完全保真」 | 本轮实测值 |
| `README.md:124` | 三处剩余损失的描述 | 按 A/B 结果改写，见下「数据保真」§4 |
| `README.md:134` | 下一步第 3 条「`.md` 文件关联…待产品负责人定」 | 删掉；下一步换成行内 HTML 渲染与 IME |

### AGENTS 必改行

| 位置 | 改成 |
| :--- | :--- |
| `AGENTS.md:38` | 测试文件数与条数改成 0.20.0 实测；保留「以 `npm test` 输出为准」 |
| `AGENTS.md:70` | 「当前 0.20.0」；功能清单加「`.md` 打开方式候选（安装时 opt-in）、数据保真拦截」 |
| `AGENTS.md:72` | 未验清单加「勾选关联后「打开方式」是否出现、卸载后是否残留、真人交互安装」；数据保真的未验项按实际写 |

### ADR-0007 建议内容（`docs\adr\0007-markdown-association.md`）

1. **背景**：`.md` 在 Windows 11 没有可靠的程序内设默认（UserChoice + Hash，且本机 UCPD 在跑）。用户诉求只是「双击/右键能选 Sidelight」。
2. **决定**：只做「打开方式」候选，opt-in，默认关；只写 HKCU `Software\Classes`；不写 `UserChoice`、`FileExts`、`HKLM`。
3. **键表**：本文「写哪些键」那张表，注明值类型 `REG_SZ` 空串（官方允许 `REG_NONE` 或空 `REG_SZ`）。
4. **安装 UX**：组件页 `/o`，说明文字写明「不改默认程序」；`/S` 不装；便携包不写注册表。
5. **卸载**：对称删除四个位置；`OpenWithProgids` 用 `/ifempty`；不碰 `FileExts` 的 MRU；不清理用户已设的 UserChoice。
6. **否决的方案**：安装器写 `UserChoice`（Hash 会被判无效 + UCPD 拦；且这是微软留给用户的选择）；改 `.md` 根键默认值（全局影响所有用户程序）；组件默认勾选（违背 opt-in）；便携包注册（会留下无法卸载的注册表项）。
7. **验收**：dry-run 编译开关断言键集合；真人三条（出现、消失、`VSCode.md` 仍在）标 UNVERIFIED。
8. **状态**：2026-11-15 接受。

若本轮数据保真选择 B（拒绝静默保存），再补一份 `docs\adr\0008-fidelity-boundary.md`：写清「编辑器内核是真相」的前提是「保存时不改写法」，冲突时的处理顺序是（1）源码模式保存原样、（2）富文本拦截并给差异，绝不静默改写。这条属于长期约束，值得单独 ADR。

### `packaging\README.md` 与 `packaging\README.txt`

| 位置 | 改成 |
| :--- | :--- |
| `packaging\README.md:8` | 表格那行加「关联 `.md` 是安装时可选，默认不选」 |
| `packaging\README.md:14-15` | 安装步骤加一步：「组件页有『在「打开方式」中加入 Sidelight』，默认不勾；勾了也不会改默认程序」 |
| `packaging\README.md:23` | 卸载说明加「卸载会删掉关联登记的 ProgID 与「打开方式」候选；不会改你自己设的默认程序」 |
| `packaging\README.md:55` | 整条替换：opt-in 已实现、`/S` 不写、仍不碰 UserChoice、`FileExts` MRU 可能残留 |
| `packaging\README.md:56` | 体积预算行更新到 0.20.0 实测 |
| `packaging\README.txt:4`、`:44` | 便携版仍是「不写注册表、不做关联」；补一句「装到系统的版本可以在安装时选择加入「打开方式」」 |

## 数据保真的不虚假承诺写法（替换句）

前提：本轮只做到「富文本拒绝静默保存 + 引导源码模式」。以下四段直接替换，别保留旧句。

**§1 替换 `README.md:31`**

> 打开文档时 Sidelight 先做一次往返比对。如果这篇文档在富文本模式下会被改写（引用式链接、表格对齐等），顶部会出现提示条，说明哪些写法会被改，并可一键转到源码模式。

**§2 替换 `README.md:34`**

> 保存：`Ctrl + S`。富文本模式下，如果这篇文档会被改写，保存会被拦下并列出会变的行：选「改用源码模式保存」写原始写法，或取消。源码模式保存不改写法。双击打开的文档也走这道拦截。

**§3 替换 `README.md:43`**

> 富文本模式读不全的写法（引用式链接、表格对齐）不会被静默改写：打开时提示，保存时拦下并给差异。要原样保存，用源码模式。

**§4 替换 `README.md:122-124`**

> `npm run roundtrip` 把 7 个真实样本读进编辑器内核再写回，逐行对比。当前结果：[N] / 7 完全保真。
>
> frontmatter、脚注定义、行内 HTML 与公式逐字节保真。引用式链接与表格对齐在富文本模式下仍会被改写：这类文档在保存时会被拦下并给出差异，改用源码模式保存可以原样写回。

**不能写的话**（会变成假承诺）：

- 「保存不会改坏原文」——富文本模式下仍会，只是被拦住。
- 「支持引用式链接 / 支持表格对齐」——只能做到「不静默改写」。
- 「保存前会把所有改动给你看」——`App.tsx:1632` 的确认只跑一次，且宿主路径不跑（S3）。
- 「关联 .md，双击打开」——只能进「打开方式」候选（S2）。

**实现上的两个硬要求**（否则上面的话都不成立）：

1. 拦截点在保存入口（`src\App.tsx:1607` `saveFile`），不在横幅。宿主路径（`:1612-1623`）必须先过拦截再 `sendHostSave`，否则双击打开的文档仍是静默改写。
2. 判断依据是「打开时原文 vs 富文本往返结果」的差分，不是语法白名单。白名单今天只有引用式链接（`src\App.tsx:139-143`），漏掉表格对齐；差分能覆盖全部损失类型，也与 `docs\roundtrip-report.md` 同一口径。

## 优化机会（3 条）

1. **关联写入可测化**：`installer.nsi` 的注册表写入在沙箱永远 UNVERIFIED。加 `!ifdef ASSOC_DRYRUN` 把 `WriteRegStr` 换成写清单文件，验收脚本就能断言键集合与「静默不装」，成本约 10 行。这条同时解决 S1。
2. **体积与版本号单一来源**：`850000` 在 `installer.ps1:74` 与 `:72` 各写一次，`940000` 在 `portable.ps1:15`，另有 5 处文档记字节与 SHA（S5）。把两条阈值提到脚本顶部常量、字节数字只留 CHANGELOG，能消掉本轮最容易犯的文档漂移。
3. **`installer.ps1` 与 `verify-installer.ps1` 重复的逻辑**：两处都读 `package.json` 版本、都拼 `release\Sidelight-<版本>-win-x64-setup.exe`、都查 5 个载荷文件。抽一个 `packaging\common.ps1` 点源引入，减约 15 行重复，也让关联 dry-run 开关只在一处定义。

## UNVERIFIED 与限制

- **没有运行安装器**：任何运行都会写 HKCU，超出本轮只读边界；`/S` 运行还因沙箱 stdio 继承挂住（两次实测，已终止）。所以「勾选后「打开方式」里出现」「卸载后不残留」「`/S` 默认不装」三条都是**未验证**。
- 组件页与关联节的**编译**已验证（`makensis` exit 0，产物 `assoc-setup.exe` 797,323 B）；运行时行为没有。
- 字节增量是同一 `makensis 3.11`、同一载荷、同一压缩参数下的对照编译，不是 0.20.0 的最终包；最终以 `packaging\installer.ps1` 实测为准。
- 前端代码的安装包压缩率按 `base + 12,559 B` 的一段真实源码测得（23.3%），真实新代码可能出入 ±5 个百分点。
- 重编 base 比发布包小 176 B，原因未查明（脚本或载荷在出包后有改动）。它不影响本报告所有增量（都在同一 base 上量），但说明发布记录需要单一来源。
- UserChoice/UCPD 的结论来自本机只读查询（`.txt` 有 Hash、`UCPD` Running）与官方/浏览器厂商文档，没有尝试写入，也不应尝试。
- 真人验收步骤建议（交给 tester 或产品负责人）：
  1. 干净用户配置里交互式安装，组件页不勾 → 安装完成，右键 `.md` → 打开方式里**没有** Sidelight。
  2. 卸载重装，勾选关联 → 右键 `.md` → 打开方式里有 Sidelight；选中它能打开该文件；`HKCU\Software\Classes\.md\OpenWithProgids` 多出 `Sidelight.md`，`VSCode.md` 仍在。
  3. 双击 `.md` 确认没有变成默认程序（仍弹选择框或按原默认打开）。
  4. 卸载 → 上述三处键消失，`OpenWithProgids` 只剩 `VSCode.md`；右键「打开方式」里不再有 Sidelight；若曾选过一次，检查 `FileExts\.md\OpenWithList` 是否残留失效条目（这是已知可能残留项）。
  5. `/S` 静默安装 → 再查一遍第 1 条。
