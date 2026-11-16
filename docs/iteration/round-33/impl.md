# 第 33 轮实施报告（executor）

- 轮次参数：round=33，报告目录 `docs/iteration/round-33`，CDP 9222。
- 基线：`main` @ `e9d90a8`，版本 0.32.1（**未发版**，`package.json:3` 未改）。
- 结果：**T1、T2（计划中已删除）、T3 全部完成**；`npx tsc --noEmit` 0；`npm test` 22 文件 **285** 条全过；`npm run roundtrip` source 7/7；`measure-first-screen` **PASS**（gzip 285,891 / 上限 286,000，余 **109 B**）。
- 计划说明：T2 在 plan revision 3 已整节删除（重复实现），本轮只有 T1 与 T3。T3 先做（不占 5175），T1 后做。

## 逐任务状态

| 任务 | 状态 | 说明 |
| :--- | :--- | :--- |
| T1 智能标点 + 自动配对 | **DONE** | 纯函数 + 插件 + 设置开关 + 8 条单测 + 13 组 e2e + 2 张截图；首屏 +839 B gzip |
| T3 验收/发版门禁版本修正 | **DONE** | `verify-installer.ps1` 3 处判据、`release.yml` 新断言、`packaging/README.md` 2 行；正反例本地复验 |

## 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/smartTyping.ts`（新） | `smartInput(before, inserted, after)` 纯函数 + `createSmartTyping({ isEnabled })` 插件（只有 `handleTextInput` 一个 prop） |
| `src/lib/smartTyping.test.ts`（新） | 8 条单测（只测纯函数） |
| `src/App.tsx` | `import { createSmartTyping }`；`smartPunctRef` + `useEffect` 同步 + `useMemo` 扩展，接进 `extensions`（`useEditor` 之前定义） |
| `src/lib/settings.ts` | `Settings.smartPunctuation`、默认 `true`、`loadSettings` 用 `!== false`（旧存档读出为开） |
| `src/components/SettingsDialog.tsx` | 新增「智能标点与自动配对括号」复选框 + 一行 `field-hint`（惰性 chunk，不进首屏） |
| `src/lib/settings.test.ts` | +1 条（旧 JSON 无新键读出 `true`；`{"smartPunctuation":false}` 读出 `false`） |
| `package.json` | `test` 脚本末尾追加 `smartTyping.test.ts`（`:14`，文件数 21→22） |
| `packaging/verify-installer.ps1` | `:138`/`:140` 的 `StartsWith('0.31.1')` → `StartsWith("$version")`；`:144` PASS 文案改 `"Sidelight.exe --version = $cliVersion"`。**UTF-8 BOM 已恢复**（见「新踩坑」） |
| `.github/workflows/release.yml` | `windows-build` 在 `Build installer and portable zip` 与 `Upload Windows setup` 之间新增 `Assert setup FileVersion matches package version`（`shell: pwsh`，`-ne "$version.0"` 时 `::error::` + exit 1） |
| `packaging/README.md` | `:42` 门槛文案改成脚本真实输出（`target=820000 gap=` / 硬报警线 850,000 B）；`:57` 补便携 zip 独立门槛 940,000 B |
| `docs/CHANGELOG.md` | `## Unreleased（第 29–33 轮，未发版）` + `**第 33 轮**` 子段（智能标点、门禁版本、测试数、已知限制） |

### T1 的实现规则（落地版，按 `plan.md:49-62`）

按判定顺序：① 越过关闭符（`)` `]` `}` `”` `’`，`skip` 只对空选区）② 引号方向（`"` 开/闭 + `'` 更保守，拉丁字母/数字后返回 `null`）③ `--` → `—` ④ `...` → `…` ⑤ 中文后 `, ; : ? !` 变全角 ⑥ 自动配对 `(` `[` `{` 与开引号（反引号**不配对**）。硬性排除四条（代码块 / 行内代码 / 非文本块 / `view.composing`）在插件层判，纯函数不管。没有 `handleKeyDown`，不做成对退格。

**对 plan-review revision 3 六条的处置（最小改动，不扩大范围）**

| 漏洞 | 处置 |
| :--- | :--- |
| P1-1 关闭符判据与配对表不对齐（`{x}` 多 `}`、ASCII `"` 不触发越过） | 规则 1 改为**先按规则 2 判引号开/闭**，闭引号时比对的产出物 `”`/`’`；关闭符表补 `}`（`PAIRS` 用 `'()[]{}'`，聚合成对判据）。单测补 `after='”'/'’'/'}'` 三条；e2e 1（`"引用"` → `“引用”`）、5（`([])`）、6（`(文字)`）实测全过 |
| P1-2 兜底梯子会删掉被测试锁定的规则 | 已按梯子**实测**三级数值（见下「决策点 A」），但**没有删规则**：①+② 只多省 202 B、刚好压到 285,689（离目标线只剩 11 B），却要删掉中文半角标点与 `{`/`'` 配对——`plan-review.md:236` 给的替代方案是「只删没有单测/e2e 锁定的实现细节，不删规则」。**这一条留给根代理裁决**：若要严格执行梯子，把 ①+② 的删除做掉即可，字节已实测 → 285,689 |
| P2-3 `skip` 只在空选区生效没有 e2e | e2e 新增 **6b**：`文字)` → `Home` + `Shift+→`×2 选中 `文字` → 按 `)` → 正文 `))`（gate 不在时会是 `文字)` 或吞输入）。实测 PASS |
| P2-4 旧 JSON 单测无落点 | `src/lib/settings.test.ts` 末尾 +1 条（见上表） |
| P2-5 「组合输入不走 handleTextInput」与源码相反 | 注释改成「组合期间 `handleTextInput` 会被调用，靠 `composing` 挡，与 `prosemirror-inputrules:92-94` 同一做法」；插件另加 `inserted.length !== 1` 放行（IME 提交常是多字） |
| P2-6 `!` 转全角打断 `![图](a.png)` | 保留 `!`，加 `after[0] === '['` 时不转；单测 `smartInput('文字','!','[')` → `null`。已知限制里留了一行 |

### 决策点 A（体积，先量后写）

单次构建命令：`npx vite build --outDir .tmp/build-r33` + `node scripts/measure-first-screen.mjs --dir .tmp/build-r33`。基线引本轮 finder 实测 **285,052 B**。

| 状态 | total raw | total gzip | 与基线 |
| :--- | ---: | ---: | ---: |
| T1 最终（当前落地，规则全留） | 929,933 | **285,891** | **+839 B** |
| 兜底 ①（删「中文后半角标点」整条规则） | 929,721 | 285,754 | +702 B |
| 兜底 ①+②（再去 `{`、`'` 配对） | 929,621 | **285,689** | +637 B |

- `T_A` 与 T1 最终值合并为一次测量：设置项文案落在惰性 `SettingsDialog` chunk（本 chunk 4,555 → 4,922 B，不进首屏），App 侧只有 3 行 ref/effect，无法再单独归因，**不写估算**。
- 判定：285,891 落在 plan 的 `(285,700, 286,000]` 区间 → 按梯子执行 ①②（实测如上）→ ① 后仍 285,754 > 285,700，② 后 285,689 ≤ 285,700。**当前实现保留全部规则**，理由见上表 P1-2；硬门 ≤286,000 **PASS**，余 109 B。这一项是计划字面与产品收益的取舍，已在此写清，未抬上限、未删无关文案凑数。

## 命令与结果（本机实跑）

| 命令 | 结果 |
| :--- | :--- |
| `node --experimental-strip-types src/lib/smartTyping.test.ts` | `tests 8 / pass 8 / fail 0` |
| `npx tsc --noEmit` | 无输出，exit 0 |
| `npm test` | 22 文件 **285** 条，`fail 0`（276 + 智能标点 8 + 设置 1） |
| `npm run roundtrip` | `source: 7/7 等值；firstSaveBlocked: 1/7`，exit 0（`04-reference-links` / `06-task-list` 的 diff 是既有「首次保存拦截」，非本轮引入） |
| `node scripts/measure-first-screen.mjs --dir .tmp/build-r33` | `total raw=929933 gzip=285891 files=2 max=286000` → `PASS` |
| `node .tmp/e2e-r33-t1-typing.mjs`（先 `node .tmp/reset.mjs 9222`） | **13/13 PASS**，日志 `.tmp/e2e-r33-t1-typing.log` |

### T1 e2e 逐条（按 1→12 顺序执行，第 12 条关开关在最后；日志原文见 `.tmp/e2e-r33-t1-typing.log`）

| 条 | 输入 | 断言 | 实测 |
| ---: | :--- | :--- | :--- |
| 1 | `"引用"` | `“引用”` | PASS `html=<p>“引用”</p>` |
| 2 | `a--b` | `a—b` | PASS |
| 3 | `c...d` | `c…d` | PASS |
| 4 | `中文,句` | `中文，句` | PASS |
| 5 | 依次打 `(` `[` | `([])` | PASS |
| 6 | 选中 `文字` 按 `(` | `(文字)` | PASS |
| 6b | `文字)` 选中 `文字` 按 `)` | `))`（skip gate 只对光标） | PASS（本轮新增，critic P2-3） |
| 7 | 三反引号 + Enter 建代码块，块内打 `--` 与 `(` | 原样 `--(`、无 `—`、无 `)` | PASS `html=<pre><code>--(</code></pre>` |
| 8 | `` `a` `` | 有 `code`、无裸反引号 | PASS |
| 9 | 空段落打 `---` | `hr=1`（`—-` 兼容分支） | PASS |
| 10 | `x` → 等 700 ms → `--` → 先断言含 `—` → `Control+z` 一次 | 撤销后不含 `—` | PASS `before="x—" after="x"` |
| 11 | `x` + 四根 `-` | `x——`、`hr=0` | PASS |
| 12 | `localStorage` 写 `{smartPunctuation:false}` + `reload`，打 `"a"` 与 `a--b` | 仍直引号、仍 `a--b` | PASS（最后执行，之前的断言均在开态） |

说明：第 7 条只打 `--` 与 `(`（中间没有空格），所以断言用 `--(`；这是本轮脚本写法，不是产品差异。

### 截图（`shots/round-33/`）

- `t1-smart-typing.png`：正文 `“引用” (括号)`，弯引号与自动补的右括号可见。
- `t1-settings-smart.png`：设置对话框里「☑ 智能标点与自动配对括号」与提示「只作用于键盘输入，不改已有正文；代码块内不转换」。
- 两张都在第 12 条关开关**之前**拍摄（`plan-review.md:270` 的提醒），拍前 `reset.mjs 9222`。

## T3 证据

1. `Select-String -Path packaging\verify-installer.ps1 -Pattern '0\.31\.1'` → **0 命中**；`-Pattern '\$version'` → 7 命中（含 `:20`、`:138`、`:140`）。
2. BOM：`[IO.File]::ReadAllBytes(...)` 前 3 字节 `ef bb bf`（见「新踩坑」）。
3. **旧判据的 bug 复现**（`.tmp/r33-version-check.ps1`，把 `:137-144` 的判据抄出来，`-Version` 当 `$version`）：

   ```text
   --- old literal 0.31.1 (bug: correct 0.32.1 build judged FAIL) ---
   FAIL  host\bin\Sidelight.exe  FileVersion=0.32.1.0  startsWith=0.31.1      exit=1
   PASS  release\Sidelight-0.32.1-win-x64-setup.exe  FileVersion=0.31.1.0  startsWith=0.31.1   exit=0
   --- new $version = 0.32.1 (fixed) ---
   PASS  host\bin\Sidelight.exe  FileVersion=0.32.1.0  startsWith=0.32.1      exit=0
   FAIL  release\Sidelight-0.32.1-win-x64-setup.exe  FileVersion=0.31.1.0  startsWith=0.32.1   exit=1
   ```

   即：改前「正确的 0.32.1 宿主被判 FAIL、`0.31.1.0` 的坏包被判 PASS」，改后反过来。
4. **CI 新断言的正反例**（`.tmp/r33-assert-fileversion.ps1`，把 `release.yml` 那 6 行原样拷出，`$version = '0.32.1'`，工作目录 `.tmp/r33-fake-release`）：

   ```text
   [negative] 反例 = release\Sidelight-0.32.1-win-x64-setup.exe 的副本（FileVersion 0.31.1.0）
   ::error::setup FileVersion=0.31.1.0, expected 0.32.1.0 (installer version did not follow package.json)
   [negative] exit=1
   [positive] 正例 = .tmp\ship-check\ship-test.exe 的副本（FileVersion 0.32.1.0）
   setup FileVersion=0.32.1.0
   [positive] exit=0
   ```

   只用 `.tmp/`，没有写 `release/`。
5. `git diff .github/workflows/release.yml` 人工核对：插入在原 `:101` 与 `:103` 之间，6 空格 `- name:` 与邻居一致（+10 行）。

## CHANGELOG（已写入 `docs/CHANGELOG.md`）

标题改 `## Unreleased（第 29–33 轮，未发版）`，新增 `**第 33 轮（同一未发版区间）**` 四条：智能标点与自动配对（含「西文态 / 半角态与中英混排」的收益面限定，未写「中文排版必需」）、门禁版本号修正、`npm test` 22 文件 285 条、已知限制。**没有**写「粘贴为纯文本」或「URL 贴选区变链接」（T2 已删除，两条是内置能力）。

## 新踩坑（写进 AGENTS §8 候选）

- **`edit` 工具会抹掉 UTF-8 BOM**：改 `packaging/verify-installer.ps1` 后，`git diff` 第一行出现 `-﻿# T2 验收…` / `+# T2 验收…`，即 BOM 被剥掉；PS 5.1 会按 ANSI 读中文 → 假语法错误。恢复办法（本机实测有效）：

  ```powershell
  $p = 'D:\Documents\SidelightProgram\packaging\verify-installer.ps1'
  $t = [IO.File]::ReadAllText($p, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($p, $t, [Text.UTF8Encoding]::new($true))
  ```

  恢复后 `git diff --stat` 只有 3 行判据改动。
- **本机没有 `pwsh`，只有 `powershell`（5.1）**：`.tmp/*.ps1` 里写中文会因无 BOM 被 ANSI 读坏，正反例脚本用**纯 ASCII** 输出（`::error::` 行改成英文）。
- **`Select-String`/`Tee-Object` 下 `node` 的 stderr 会被 PowerShell 记成 NativeCommandError**：脚本真出错时仍能看到 `SyntaxError`，不要把它当 PowerShell 语法问题。

## UNVERIFIED（本轮测不了，禁止当成实测）

1. **真实中文输入法中文态**：本机无真人输入法，`page.keyboard.type` 不产生组合事件。可能本来就上屏全角，那样 T1 对主力用户几乎无可见变化。补测：真人微软拼音在中文态各打 `"`、`,`、`--`、`...`，截图进 `shots/round-33/`。
2. **`release.yml` 新步骤的真实 CI 运行**：本机无 CI。补测：下次发版后下载 setup，`(Get-Item .\Sidelight-X-win-x64-setup.exe).VersionInfo.FileVersion` 必须等于 `X.0`。
3. **`verify-installer.ps1` 完整安装链**：沙箱装不了系统级软件，本轮只验判据。
4. **设置对话框里勾/取消再保存的落盘路径**：e2e 用 `localStorage + reload` 验读取侧（计划要求的做法），未点复选框保存。
5. **宿主（WebView2）里**：`handleTextInput` 与组合输入的实际时序、粘贴引号不被改写（`handleTextInput` 天然不接粘贴，属推断）。
6. **第 11 条 `x——`**：实测 PASS（不是推导），已按实测写；`——` 在空段落开头仍会出 `<hr>`（`---` 就出分隔线），已进已知限制。
7. **README 的「现在能做什么 / 不能做什么」**：`AGENTS.md` §7 要求收工改，本轮计划文件表没有它，`plan-review.md:273` 也提到；**留给根代理收尾**（与 STATE 一起改），避免两处同时改冲突。

## 回滚点

- 本轮改动未 commit（executor 禁止 commit）。撤销方式：`git checkout -- src/App.tsx src/lib/settings.ts src/components/SettingsDialog.tsx src/lib/settings.test.ts package.json packaging/verify-installer.ps1 packaging/README.md .github/workflows/release.yml docs/CHANGELOG.md` + 删 `src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts`。**注意**：`git checkout` 会保留 `STATE.md` 的既有未提交改动（那一处不是本轮写的）。
