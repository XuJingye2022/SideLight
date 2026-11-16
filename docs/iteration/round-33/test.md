# 第 33 轮验收（tester，独立复验）

- 基线：`main` @ `e9d90a8` + 本轮工作树（10 个跟踪文件改动、`scripts/keyboard-acceptance.mjs` 由本轮验收更新、`src/lib/smartTyping.ts` / `smartTyping.test.ts` 新增）。版本 `0.32.1`，`package.json` 只改了 `test` 脚本，**未发版**，符合计划全轮约束 1。
- 环境：dev server `http://localhost:5175`（未重启，`/src/main.tsx` 200）；CDP `9222`（`/json/version` 200）；每条 e2e 前 `node .tmp/reset.mjs 9222`。
- 复验方式：只读 `plan.md`、`plan-review.md`、`git diff`、实跑输出与截图；**未读 `impl.md`**（按角色要求，避免被实施说法带偏）。实现方的 `.tmp/e2e-r33-t1-typing.mjs` / `.log` 只确认存在，未作为本轮证据。

## 结论：PASS-WITH-UNVERIFIED

门禁全过（tsc / 22 文件 285 条 / build / 首屏 285,891 B / roundtrip），T1 的 12 组计划断言 + critic 补的 2 组由我自己的脚本 **23/23 PASS**，T3 的正反例与静态判据全过。有一处计划侧偏差（T1 最终体积超计划目标 285,700 191 B，硬门 286,000 未破）与两项未验（真 CI、真 IME），没有一条属于验收造假或本轮引入的产品回归。既有 `keyboard-acceptance` 的 1 条字符断言因本轮行为变更过期，已按 AGENTS §8「先改脚本再判产品失败」更新并复跑到 52/52。

## 门禁（全部实跑）

| 门禁 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | 无输出，exit 0 |
| 测试 | `npm test` | **22 文件 285 条**（逐文件 `tests N` 求和：files=22 total=285），0 fail，exit 0。新增 `smartTyping.test.ts` 8 条 + `settings.test.ts` 1 条 = 276+9 |
| 打包 | `npm run build` | exit 0；`dist/assets/index-B8eUz4hw.js` 896.14 kB / gzip **282.24 kB**，`index-BLxN31Mr.css` 33.78 kB / 7.09 kB，`SettingsDialog` 4.92 kB / 1.92 kB（惰性 chunk） |
| 首屏 | `node scripts/measure-first-screen.mjs` | `total raw=929933 gzip=285891 files=2 max=286000` → **PASS**，余 **109 B**（基线 285,052，本轮 +839） |
| roundtrip | `npm run roundtrip` | exit 0；rich **5/7**、source **7/7**、firstSaveBlocked 1/7——与第 32 轮基线一致（04 引用式链接 diff −4/+1、06 任务列表 diff −0/+1 是既有已知项） |
| 快捷键回归 | `keyboard-acceptance.mjs http://localhost:5175` | 首跑 **51/52**；更新过期断言后重跑 **52/52 PASS**，exit 0（详见「回归」） |
| 状态栏回归 | `qa17.mjs` | **7/7 PASS**，exit 0 |
| 草稿回归 | `draft-acceptance.mjs` | **57/57 PASS**，exit 0 |

## T1 智能标点 + 自动配对

静态复核（`git diff` + `read`）：

- `src/lib/smartTyping.ts`（新，132 行）：`smartInput(before, inserted, after)` 是唯一判定入口（`:33`），不命中返回 `null`（`:66`）；插件 `handleTextInput`（`:78`）里 `isEnabled` / `view.composing` / 单字符 / `code` 块 / 非文本块 / `code` mark 五道门（`:79-99`），不命中 `return false`（`:105`）——返回 `false` 不截断后续输入规则；`skip` 只在 `state.selection.empty` 时执行（`:107-110`）；`replace`/`insert`/有选区包裹各自一条 transaction（`:111-124`），`Ctrl+Z` 一次撤掉。
- 规则实读：ASCII `"`/`'` 先定开闭、闭引号时按**产出物** `”`/`’` 判越过（`:39-47`），`PAIRS = '()[]{}'` 含 `}`（`:16`）；`'` 在拉丁字母/数字后返回 `null`（`:41`）；`--`→`—`（`:57`）、`...`→`…`（`:58`）；中文后 `,;:?!` 五条映射（`:20-21,60-64`）；`!` 紧跟 `[` 不转（`:62`，保 `![图](a.png)`）；反引号不在配对表，也不在跳过表。
- `settings.ts`：`Settings.smartPunctuation`（`:23`）、默认 `true`（`:44`）、`loadSettings` 用 `parsed.smartPunctuation !== false`（`:90`，旧存档读出为开）。
- `SettingsDialog.tsx:82-90`：复选框 `智能标点与自动配对括号` + 提示文案，`checked={draft.smartPunctuation}`。
- `App.tsx`：`smartPunctRef` + `useEffect` + `useMemo(createSmartTyping(...), [])` 定义在 `useEditor` 之前（`:704-709`），扩展加进 `extensions`（`:749`）；`settings` 没进 `useEditor` 依赖。
- 无新增运行时依赖（`package.json` / `package-lock.json` 未动）、未动 `host/` `host-mac/` `release/`。

行为实测（我自己的脚本 `.tmp/e2e-r33-test-t1.mjs`，日志 `.tmp/e2e-r33-test-t1.log`，按计划 1→12 顺序，关开关在最后）：**23/23 PASS**。

| # | 断言 | 实测 |
| :--- | :--- | :--- |
| 1 | `"引用"` → `“引用”` | ✅ |
| 2 | `a--b` → `a—b` | ✅ |
| 3 | `c...d` → `c…d` | ✅ |
| 4 | `中文,句` → `中文，句` | ✅ |
| 5 | 依次 `(` `[` → `([])`（嵌套） | ✅ |
| 6 | 选中 `文字` 按 `(` → `(文字)` | ✅ |
| 6b | `(x)` 打完不多字符（critic P1-1） | ✅ |
| 6c | 非空选区 + 后面紧跟 `)` 按 `)` 不吞输入（critic P2-3/P2-5 gate） | 得 `))` ✅ |
| 7 | 三反引号 + Enter 出代码块，块内 `-- (` 原样 | `pre=1`、文本 `-- (` ✅ |
| 8 | `` `a` `` → `code` 元素，正文无裸反引号 | `code=1`、无 `` ` `` ✅ |
| 9 | 空段落 `---` → `hr` 1 | ✅ |
| 10 | 先断言含 `—`，`Control+z` 一次后不含 | 含 → `x`（不含）✅ |
| 11 | `x----` → `x——` 且 `hr=0` | ✅ |
| 12 | 关开关（最后）：`"a"` 仍直引号、`a--b` 原样 | ✅ |
| 13 | 设置对话框有开关、默认勾选 | ✅（另跑持久化，见下） |

- 截图复核：`shots/round-33/t1-smart-typing.png` 里是 `“引用”（括号）`（弯引号 + 配对右键弧），`shots/round-33/t1-settings-smart.png` 里能看到「☑ 智能标点与自动配对括号」与提示。两张都在 1440×900，内容与计划要求一致。
- 设置开关另测（`.tmp/e2e-r33-test-settings.mjs`，5/5 PASS）：对话框取消勾选 → 保存后**不 reload 立即**打 `a--b` 保持 `a--b`；再勾回保存后立即恢复 `a—b`；最终 `localStorage` 里 `smartPunctuation===true`。计划 e2e 第 12 条只测 localStorage + reload 路径，这条补上了 UI 路径（`smartPunctRef` 接线真的生效）。

体积偏差（如实记录）：

- 实测最终 **285,891 B**，硬门 **≤286,000 PASS（余 109 B）**。
- 计划 T1 的最终目标是 **≤285,700**；本轮**超目标 191 B**。兜底梯子 ①（删中文后半角标点）与 ②（配对只留 `(`、`[`、`"`）要删的规则在代码里**都还在**（`HALF = ',;:?!'` 五条映射、`PAIRS = '()[]{}'`），单测/CHANGELOG 也按完整规则集交付，说明**没有走兜底**。按计划硬约束 3，走完兜底仍 >285,700 才允许落在 285,700–286,000；本轮属于计划侧目标偏差，**不是硬门失败**。`T_A`（决策点 A）的实测值只在 `impl.md`，我按角色不读 `impl.md` → 见 UNVERIFIED 1。
- 余量只剩 109 B：下一轮任何新增功能前必须先做「省字节」任务，否则第 34 轮必然撞线。

CHANGELOG 核对（`docs/CHANGELOG.md:46-53`）：标题改成「第 29–33 轮」，第 33 轮两条各一行；T1 行写了收益面是「西文态 / 半角态与中英混排输入」并注明真 IME 未验（符合 P1-5），**没有**「中文排版必需」「粘贴为纯文本」「URL 贴选区变链接」；数字 285,891 B / 22 文件 285 条与实测一致；5 条已知限制与实测行为一致。

## T3 验收脚本版本号写死 + 发版前 FileVersion 断言

- `packaging/verify-installer.ps1`：`Select-String -Pattern '0\.31\.1'` **无输出**（0 命中）；`$version` 命中 7 行（`:20,:21,:138,:140,:144,:152,:153`）；`:138`/`:140` 改为 `StartsWith("$version")`、`:144` PASS 文案改为 `"Sidelight.exe --version = $cliVersion"`。**UTF-8 BOM 保留**（首 3 字节 `239,187,191`），没用 `Set-Content` 重写。
- 判据正反复验（`.tmp/r33-test-versioncheck.ps1`，照抄 `:137-144` 逻辑，`$version='0.32.1'`）：
  - 修正前（写死 `0.31.1`）：正确包 `host\bin\Sidelight.exe`（0.32.1.0）→ **FAIL exit 1**；坏包 `release\Sidelight-0.32.1-win-x64-setup.exe`（**0.31.1.0**，824,595 B）→ **PASS exit 0**。方向反了，bug 复现。
  - 修正后：`host\bin\Sidelight.exe` → **PASS exit 0**；坏包 → **FAIL exit 1**。正确。
- `release.yml`：新步骤 `Assert setup FileVersion matches package version` 在 `:103-111`，插在 `Build installer and portable zip`（`:98-101`）与 `Upload Windows setup`（`:113`）之间；位于 `windows-build`（`:64`，`needs: preflight` `:65`、`windows-2022` `:66`）；缩进 6 空格与邻居一致；`preflight.outputs.version` 存在（`:34-35`）。逻辑本地正反复验（`.tmp/r33-test-fileversion-assert.ps1`）：
  - 反例：`.tmp/r33-fake-release/Sidelight-0.32.1-win-x64-setup.exe` = 真坏包（0.31.1.0）→ `::error::setup FileVersion=0.31.1.0, expected 0.32.1.0`，**exit 1** ✅
  - 正例：换成 `host\bin\Sidelight.exe`（0.32.1.0）→ `setup FileVersion=0.32.1.0`，**exit 0** ✅
  - `"$version.0"` 的字符串插值实测输出 `0.32.1.0`，不会把 `.0` 丢掉。
- `packaging/README.md:42` 改成脚本真实输出（`installer.ps1:89` `target=820000 gap=`、`:112` `hard=850000 B`）；`:57` 补便携 zip 门槛 940,000 B（`portable.ps1:15` `$threshold = 940000`）。`packaging/*.ps1`、`packaging/*.md`、`.github/workflows/*.yml` 里 `10,000` **0 命中**。
- `git diff` 只含计划内文件 + 本轮验收的脚本修正（见文末收尾），没有 `release/`、`host/`、`host-mac/` 改动。

## 回归

- `keyboard-acceptance.mjs` 首跑 **51/52**：`FAIL 正文输入 ? 不弹一览 ({"dialog":0,"text":false})`。失败点在断言的第二半：脚本 `:308` 在中文「号」后打 ASCII `?`，第 33 轮起变成全角 `？`，`:312` 的 `includes('正文里的问号?')` 因而不成立；`dialog:0`（真正要验的「不弹快捷键一览」）是过的。这是本轮**有意行为变更**导致的断言过期，不是产品回归。按 AGENTS §8「DOM 改动后先改脚本再判产品失败」把断言改成接受 `?` 和 `？`（意图不变：字符已落进正文）后重跑 **52/52 PASS**，导出/链接/公式/表格/侧栏断言全过。脚本改动的 5 行见 `scripts/keyboard-acceptance.mjs:310-317`。
- `qa17.mjs` **7/7**；`draft-acceptance.mjs` **57/57**（其 `:379` 打 `[` 现在会配对成 `[]`，仍然是「损失」场景，结果不变）。
- `roundtrip` 与第 32 轮一致（rich 5/7、source 7/7），`docs/roundtrip-report.md` 内容无变化。
- 跑完还原了脚本会覆盖的历史截图：`git checkout -- shots/round-05/`（`t1-shortcuts.png`）、`shots/mode-switch.png`、`shots/round-08/`（draft 脚本写的 3 张），`git status` 已确认无残留。

## 文档收尾（本轮已做）

- `docs/CHANGELOG.md`：实施方写的两条已核对属实（见上）；
- `README.md`：「现在能做什么」加智能标点与自动配对一条；「现在不能做什么」加 5 条已知限制 + 真 IME 未验；「依赖与体积」首屏改为 **285,891 B（−21.7%，第 33 轮 +839 B，余 109 B）**；「跑起来」`npm test` 改为 22 文件 285 条；
- `AGENTS.md`：§3 测试条数改「第 33 轮记 22 个文件、285 条」并补「智能标点」；§6 能力清单加「智能标点与自动配对（设置里可关）」、测试 22/285、首屏 285,891 B / 余 109 B；§8 加一条「智能标点会改键盘输入本身」（`handleTextInput` 不命中必须 `return false`；新增输入规则先跑 `keyboard-acceptance`）。
- `docs/iteration/STATE.md` **未改**：`plan.md:194` 与 AGENTS §7 把 STATE 留给根代理。建议根代理收尾时在轮次表加一行（结果 PASS-WITH-UNVERIFIED、首屏 285,891、测试 22/285）、把「下一轮优先」里「粘贴为纯文本排队」删掉（critic P0-1 要求），并把「工作区图片破图」提到第一位。

## UNVERIFIED（本轮测不了，写清补测方法）

1. **T_A（决策点 A）的实测值与是否走了兜底梯子**：计划要求 `impl.md` 贴 `T_A` 的 raw/gzip/total 原始输出；我按角色不读 `impl.md`，无法核对。已知事实：最终首屏 285,891 B **超计划目标 285,700 的 191 B**，而兜底要删的规则（CJK 半角 5 条、`{}` 配对）都还在。补测：根代理读 `impl.md`，确认 `T_A` 是 ≤285,700 后被设置项推高，还是没走兜底；若是后者，按硬约束 3 补做兜底 ①/② 或把偏差写进 STATE。
2. **真实中文输入法中文态**（P1-5 的前提，含 `compositionend` 后 flush 那一次会不会转换/重复转换）：本机无真人输入法，`page.keyboard.type` 不产生组合事件。补测：真人用微软拼音在中文态各打一次 `"`、`,`、`--`、`...`、`(`，截图进 `shots/round-33/`。
3. **`release.yml` 新步骤在真实 CI 的首跑**：本机无 CI，只本地复验了判据。补测：下次发版后下载 setup，`(Get-Item .\Sidelight-X-win-x64-setup.exe).VersionInfo.FileVersion` 必须等于 `X.0`。
4. **`packaging\verify-installer.ps1` 完整安装链**：沙箱不能装系统级软件（第 33 轮 ship 侦察也没跑），本轮只验版本判据。补测：交互式桌面真机跑一次，记 HKCU/开始菜单两项 UNVERIFIED。
5. **WebView2 宿主里的智能标点**：本轮只在 Chromium（CDP 9222）实测；宿主已关浏览器加速键，`handleTextInput` 属页面内输入，静态推断一致，**未在宿主实按**。
6. **`keyboard-acceptance` 的 `?`→`？` 断言更新后的覆盖度**：更新后两种字符都接受，若未来智能标点开关默认变化，这条断言不会失败。可接受（它本来只验「不弹一览」），但已失去对字符形态的锁定——字符形态由 T1 自己的 e2e 第 4 条锁定。

## 复验命令（下轮可直接抄）

```powershell
npx tsc --noEmit; npm test; npm run build; node scripts/measure-first-screen.mjs
node .tmp/reset.mjs 9222; node .tmp/e2e-r33-test-t1.mjs
node .tmp/reset.mjs 9222; node .tmp/e2e-r33-test-settings.mjs
node .tmp/reset.mjs 9222; powershell -ExecutionPolicy Bypass -File .tmp/r33-test-versioncheck.ps1 -Exe host\bin\Sidelight.exe
powershell -ExecutionPolicy Bypass -File .tmp/r33-test-fileversion-assert.ps1
$env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/keyboard-acceptance.mjs http://localhost:5175; git checkout -- shots/round-05/
node .tmp/reset.mjs 9222; node scripts/qa17.mjs http://localhost:5175; git checkout -- shots/mode-switch.png
node .tmp/reset.mjs 9222; node scripts/draft-acceptance.mjs http://localhost:5175; git checkout -- shots/round-08/
```
