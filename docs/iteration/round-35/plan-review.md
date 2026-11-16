# 第 35 轮 · 计划审查（critic，只读，rev 3）

- 审查对象：`docs/iteration/round-35/plan.md`（**revision 3**，334 行，mtime 2026-11-17 06:40）。
- 基线：`main` @ `e64c2fce`（= 轮前 startSha）；`git status --porcelain` 只有 `?? docs/iteration/round-35/`、`?? shots/round-35/`。本报告只写这一个文件，未改产品代码、未构建、未打补丁、未跑浏览器。
- 方法：逐条打开 rev 3 点到的文件核**行号与内容**；把上一版 5 条漏洞（含本轮调度转来的 P1-1、P2-1）逐条重跑成可复现探针；对 rev 3 的 README:99 改写、ADR-0017 改写、T2 提示词归属、T3 4b 做静态推演 + 只读实测。

## 结论：REVISE（1 个 P1、3 个 P2，共 4 条）

**上一版的 P1-1 与 4 个 P2 全部真修掉了**（逐条证据见 §一）。REVISE 的原因是 rev 3 自己新冒出的 4 处：一条 T1 文档改写与验收 i 自相矛盾（P1-1），三条 T2/ADR-0017 的口径缺口（P2）。没有 P0：无数据损失路径、无体积破线（内部 310,000 对 285,937 余 24,063 B）、四个算术全部核对无误、方案可行。

## 一、上一版漏洞核查（5/5 全部真修掉）

| 上一版 | rev 3 的修法 | 我的实测/核对 | 判定 |
| :--- | :--- | :--- | :--- |
| **P1-1** T1 验收 j 的语法命令按字面执行必失败（`powershell -NoProfile -Command "…$e…$null…"` 外层双引号先展开） | `:90`/`:111` 改成在**当前会话直跑** `.ParseFile((Resolve-Path '…').Path, [ref]$null, [ref]$e); $e.Count`，并给出外层**单引号**的子进程替代；写明旧写法实测 exit 1 与三条报错 | 两种新写法我都原样跑了：当前会话 `.Path` 写法三个脚本都输出 `0`；单引号子进程写法 `powershell -NoProfile -Command '…'` 输出 `0`、**EXIT=0**。旧双引号写法我原样复跑：**EXIT=1** + 三条报错（`= : The term '=' is not recognized…`、`Argument: '2' should be a System.Management.Automation.PSReference. Use [ref].`、`.Count : The term '.Count' is not recognized…`） | **修掉** |
| **P2-1** 轮末字节刷新清单漏 `AGENTS.md:74` 与 `README.md:101` | T1 第 8 项（`:57`）只写两条预算线、不写 285,937/34,063；第 9 项（`:58`）只改 STATE 两条体积线；收尾 #2（`:323`）清单补 `AGENTS.md:74` 首屏数与余量、`README.md:101` 主 chunk 实测；T1 第 7 项（`:56`）把 README:101 的 896,149 改成 896,224 | 实测 `node scripts/measure-first-screen.mjs`：`total raw=930008 gzip=285937 headroom=63 files=2 max=286000`、PASS、exit 0；`dist/assets/index-O0GdPjrm.js` raw=**896,224**（README:101 现写 896,149，差 75 B，计划判断正确）；AGENTS.md:74 现文确是「首屏 gzip 285,937 B ≤286,000（数据安全例外，STATE 记理由），余 63 B」 | **修掉**（但 README:99 引出了新的 P1-1，见 §三） |
| **P2-2** ADR-0017 标题与首段还在说「仍破线 / 本轮不实现」 | 第 11 项（`:60`）补 `:1` 标题、`:3` 首段、`:13` 决定首句三处改写，并补 AGENTS §4 运行时依赖例外句 | 打开 ADR-0017：`:1`「…压缩后**仍破线**」、`:3` 末尾「本轮**不实现**」、`:13`「**本轮不实现。** …破 850,000 B 硬线 624,881 B。需要产品负责人三选一：」——计划摘引与原文一致，三处都在改动清单里 | **修掉** |
| **P2-3** CHANGELOG 第三条无条件写「Esc 后焦点回正文」，而 T3 是唯一可砍项 | 全轮硬约束 1（`:30`）与收尾 #3（`:324`）都改成二选一：T3 交付才写，被砍写「顺延第 36 轮」 | 两处都已是条件句，且与硬约束 7「禁止把建议当已完成写进 CHANGELOG」一致 | **修掉** |
| **P2-4** T2 第 6 项可能连带删掉 `App.tsx:3714` 的 `clampFontSize` | `:164` 写明只删 `:3718-3721` 的 JSON 警告块、`:3714` 原样保留，新增验收 g2（`:213`） | `git grep -n "clampFontSize" -- src/App.tsx` = **3 行**：`:77` import、`:1730`、`:3714`；`:3713-3722` 里 `:3714` 是 `const safe = { ...next, fontSize: clampFontSize(next.fontSize) }`，`:3719-3721` 才是 `/json/i` 警告 | **修掉** |

## 二、逐条核对通过的位置（rev 3 抽样，全部打开过）

- **T1 文件/行号**：`installer.ps1` 的 `820,?000|850,?000` = **6 行**（`:4,:88,:89,:112,:114,:115`，与计划「`:4,88-89,112-115`」一致）；`portable.ps1` = **1 行**（`:15` `$threshold = 940000`）；`verify-installer.ps1` 旧线 = **0 行**；`Pass/Fail/Unverified` 在 `:31-32`、累计 `$script:failed` 在 `:229`、`$setup` 存在性块在 `:40-43`（`:45` 起是 WebView2 检查，插入点可行）；`measure-first-screen.mjs` 现 68 行，`:13` 正是「只排除 --max/--dir」的过滤、`:14` 只有 `--dir` 兜底、`:15` 默认 286000、`:56` 汇总字段序 `raw/gzip/headroom/files/max`、`:59-63` katex 拦截、`:64-67` exit 1 —— 计划对脚本的描述与改法全部对得上；`package.json:13` 的 `verify` 不传参。
- **验收数字的改前对照**：命令块 I（`:121`）改前实跑 **8 行**（README 3 / AGENTS 1 / STATE 1 / packaging README 2 / ADR-0012 1），与步骤 0 的「改前期望 8 行」一字不差；`installer` 6、`portable` 1、`.tmp/iteration/common.md` 1（`.gitignore:8` 忽略 `.tmp/`，`git grep` 看不到，i2 用 `Select-String` 正确）；命令块 H 的 workflows 全模式 **0 行**（exit 1）。
- **验收 a/k 可跑**：`node scripts/measure-first-screen.mjs` 现在就是 `gzip=285937 max=286000 headroom=63 … PASS`、exit 0；三个 `.ps1` 的 BOM 实测都是 `239 187 191`；`[IO.File]::ReadAllBytes` 在当前会话可用。
- **T1 算术**：320,000−285,937=**34,063**；310,000−285,937=**24,063**；1,800,000−1,474,881=**325,119**；2,355,122−2,000,000=**355,122**。四个数都对。
- **T2 现状**：`prompt.ts:6-27` 实测 `len=795`、`fp=795:ebaf07b2`（与计划的新常量 `'795:ebaf07b2'` 完全一致）；`ai.ts:21,26,122`、`settings.ts:17-20,40-47,63-96`（`LEGACY_PROMPT_FINGERPRINT='5967:3d38bf01'`、`savedVersion < 2`、`promptVersion: 2`）、`SettingsDialog.tsx:167-183`（`.dialog-textarea` 在 `:170`）与 `:194`（`.dialog-actions .primary`）；`analysisPrompt` 在 `src` 的 11 处全部落在计划列的四处 + 两个测试文件里，没有第五个产品调用方；`DEFAULT_ANALYSIS_PROMPT` 只出现在 `prompt.ts/ai.ts/settings.ts/SettingsDialog.tsx/两个测试` —— 替换点齐；`buildUserMessage` 调用点只有 `ai.ts:26` 与 `prompt.test.ts:32` + 定义；`.field-hint` 样式已存在（`styles.css:1156`），T2 的新 hint 不用加 CSS；`.analyze-button` 在 `App.tsx:4317`（e2e 选择器成立）。
- **T2 条数**：`prompt.test.ts` 38 行 3 条、`settings.test.ts` 54 行 3 条（与计划一致）→ 287+4+3=**294**，落在 `:210` 的 293–295 内；`annotations.test.ts:7,386-404` 的旧 API 用法与计划 `:167` 描述一致；`package.json:15` 的 `test` 已登记 `settings.test.ts`/`prompt.test.ts`，不新建文件成立。
- **T2 迁移逻辑自洽**：按 `:161` 的算法手推 6 条计划用例（v2 旧默认→3、自定义→保留且版本 2、新键优先、空值→默认+3、落盘无 `analysisPrompt`、e2e 自定义→0），全部成立；`saveSettings` 写整个 `Settings`（`settings.ts:98-100`），字段改名后落盘自然没有旧键。
- **T3 行号**：`focusEditor` `:327`；Esc 主分支 `:3490`；查找分支 `:3502-3506`；源码/预览分支 `:3534-3541`（`:3538-3541` 是 preview）；`window.addEventListener('keydown')` `:3668`、依赖 `:3670-3683`（含 `findOpen/sourceMode/previewMode`）；`commitSettings` `:3713-3722`；FindBar `onClose` `:4588-4591`；源码 `textarea.source-editor` `:4766-4771`；快速打开 `onClose` `:5089`（选中分支 `:5086-5087` 已有 `focusEditor`）；`FindBar.tsx:52/:80` 两个 Esc 都是 `onClose()`、都在 `.find-input` 的 `onKeyDown` 里 —— 计划描述全对。
- **T3 机理**：`findings-bug.md:79-93` 的 `## A2-focus-in-find {"textarea":false,…, "active":"DIV.tiptap ProseMirror editor "}` 与 `## preview-find-esc-x2` 证明确实是「FindBar 先关 → window 监听在 React 同步 flush 后换成 `findOpen=false` 的新闭包 → 同一 Esc 再退一层」；rev 3 的 4a（`stopPropagation`）+ 4b（按模式分派）与这个机理对齐，`d2` 的两段式判据也不会被「预览 pane 不可聚焦」误判。
- **硬约束**：不新增运行时依赖、不改 `host/`、`host-mac/`、`release/`、版本号、Markdown 序列化；不新建测试文件；`dist/` 不重建；CHANGELOG 现标题 `## Unreleased（第 29–34 轮，未发版）` 在 `docs/CHANGELOG.md:5`；`scripts/qa15.mjs:53` 是唯一依赖「恢复默认提示词」文案的脚本（不在门禁）；CI 不跑 `annotation-flow`/`qa15`/`fcp-probe`（`.github` 与 `package.json` 里 0 处）—— 换字段名不会碰 CI。
- **35 分钟**：T1 10 + T2 17 + T3 7 = 34，T1/T2 不可砍、T3 可砍 —— 与上一版同一判断，结构上说得通。

## 三、本轮新漏洞（按严重度）

### P1-1（验收不可复现）README:99 的改写文本自己含旧线数字「原 286,000 B 例外作废」，会让 T1 验收 i 必红；旧句摘引也不是原文，照字面替换会留下 850,000

- 计划 `:56`（T1 第 7 项）给的 README:99 新句子是：「预算内部 **310,000 B** / 硬线 **320,000 B**（产品负责人 2026-11-17 放宽，**原 286,000 B 例外作废**），当前 285,937 B（距硬线余 **34,063 B**）」。
- 冲突：`:109` 的验收 i 要求照命令块 I（`:121`）跑 `git grep -nE '286,?000|820,?000|850,?000|940,?000' -- README.md AGENTS.md docs/iteration/STATE.md packaging/README.md docs/adr/0012-katex-lazy-loading.md`，期望 **0 行**。而「原 286,000 B 例外作废」本身就命中 `286,?000`。我实测该正则对这句是 **MATCH**（`Select-String -Pattern '286,?000|…'` 直接命中）——只要执行者按计划把这句写进 README，i 就返回 1 行、判红。
- 第二处：README:99 的真实原文（我读到的整行）是「…首屏临时上限 **286,000 B**（数据安全例外，STATE 记理由，余 63 B）；安装包内部预算 820,000 B，最新发布资产 824,209 B（超预算 4,209 B，距硬线 850,000 B 余 25,791 B）。」，一行里同时有 `286,000`、`820,000`、`850,000` 三个命中。计划只写「安装包「内部 820,000 / 硬线 850,000」→ …」，既不是原文字面，也没说要连**行尾**的「距硬线 850,000 B 余 25,791 B」一起换；照字面替换会留下 850,000，i 仍非 0。
- 影响：验收 i 是 T1 的旧线清零门（全轮第一个任务，不可砍）。红了以后执行者只有两条路：删掉「原例外作废」的口径变更说明（丢掉产品负责人的决策留痕），或者判 T1 失败。这正是上一版 P1-1「照计划跑必红」的同一类问题，换到了文档改写上。
- 修法：把 README:99 给成**整句替换、且新句不含任何旧线数字**，例如：
  > 首屏预算内部 **310,000 B** / 硬线 **320,000 B**（2026-11-17 产品负责人放宽；原临时上限与数据安全例外作废，历史理由见 STATE），当前 285,937 B（距硬线余 **34,063 B**）；安装包内部预算 **1,800,000 B** / 硬线 **2,000,000 B**，最新发布资产 824,209 B（本机重建 824,595 B，距硬线余 1,175,791 B）。

  同时把验收 i 的期望补一句口径：旧线数字只允许留在 `docs/CHANGELOG.md` 与 `docs/iteration/round-*` 历史记录（命令块 I 的 5 个文件之外）。改完先跑 `git grep -nE '286,?000|820,?000|850,?000|940,?000' -- README.md`，必须 0 行再勾 i。

### P2-1（T2 行为回退风险）提示词拆分没写清「角色句」与「三处以上才下判断」的归属，单测也不钉它们 → 可能被搬进可编辑 user prompt 或静默丢掉

- 现状 `prompt.ts:6` 首句：「你是 Sidelight 的批注员。作者在页边要的是判断，不是代笔。」；`:8`：「…判断依据：标题措辞、结构、数字与出处、人称、收尾要求；三处以上指向同一件事才算有把握，否则只写 meta。」
- 计划 `:159` 的 `ANALYSIS_SYSTEM_PROMPT` 清单只列格式/安全规则（JSON Lines 与三行示例、quote 8–25、最多 1 条 revision、`overall`、evaluation 不带 replacement、不编事实、至少一条指出、`<前文>/<选区>/<后文>` 说明），**没有**角色句与「三处以上」判断门槛；而 `DEFAULT_USER_PROMPT` 被规定「**只**放作者偏好与检查重点」。这两段落在哪一半没写。
- 测试也拦不住：`:175` 的 test 2 只断言 `DEFAULT_USER_PROMPT` 不含 `/JSON|"kind"|overall|revision|不编事实|quote/`，角色句与「三处以上」都不在该正则里——它们可以合法地待在 user prompt，`npm test` 仍全绿。
- 风险：角色句一旦进了 user prompt，用户在设置里改自己的偏好就会把它整条覆盖，模型失去「批注员 / 作者要的是判断不是代笔」的定位（这正是本轮拆分要保住的 system 职责）；若被删则提示词质量回退，而没有任何测试会红。
- 修法：`:159` 明写「system 还收下 `prompt.ts:6` 的角色句与 `:8` 的判断门槛（三处以上、没有值得说只写 meta）」；并在 test 1（`:174`）加 `/批注员/`、`/三处以上/` 两条断言，或让 test 2 的 `doesNotMatch` 正则追加 `批注员`。

### P2-2（验收口径与 ADR 改写冲突）验收 i 说「ADR-0017 允许保留历史数字」，但命令块 I 并不查 ADR-0017；ADR-0017 里现在仍有 `850,000`（`:38`、`:52`），执行者要么漏改要么篡改历史

- `:109` 的括注写「ADR-0017 允许保留历史数字：824,595、838,981、1,474,881、2,355,122 与「旧线 850,000」的对照句」，读起来像 ADR-0017 在 grep 范围内；但 `:121` 的文件清单是 README/AGENTS/STATE/packaging README/ADR-0012 **五个**，不含 ADR-0017。ADR-0017 现有 `:38`「838,981 B（≤850,000，但超内部预算 18,981 B）」、`:52`「档 1b/档 2 都破 850,000 B 硬线」（第 11 项改写后仍保留「按旧线（850,000）都破线」）。
- 影响：执行者按「ADR-0017 也要清成 0」理解，就会删历史对照句（违反计划 §风险 5「实测表与历史数字一律不动」和硬约束「不篡改记录」）；反过来又不知道到底只要求换 `:57` 的 286,000。两种都算偏差，且都会在 impl 里留下错误记录。
- 修法：i 里写死「命令块 I 的 5 个文件 0 行；ADR-0017 不在其中，只要求把 `:57` 的 `286,000` 换成 `310,000`，`:38/:39/:40/:52` 的历史对照与数字全部保留」，并补一条只查旧首屏线的窄命令：`git grep -nE '286,?000' -- docs/adr/0017-mermaid-lazy-loading.md`（改后 0 行）。

### P2-3（改完仍自相矛盾）ADR-0017 `:57` 只换数字、留下「十几倍」；实测表 `:39`/`:40` 的「破硬线」没有旧线限定

- `:57` 现文：「**静态引入 mermaid**：首屏 +402,939 B 起，直接破 286,000 B **十几倍**。」402,939 / 310,000 ≈ **1.3 倍**（对旧 286,000 也只有 1.4 倍），与同 ADR `:28` 的实测「主入口静态依赖 gzip 402,939」矛盾。计划（`:60`）只把 286,000 换成 310,000，量级词原样留下。
- `:39`「**1,474,881 B**（破硬线 624,881 B）」、`:40`「（破硬线 1,505,122 B）」用的是旧线 850,000；`:13` 改写后说「接受、档 1b 在内部预算内（余 325,119 B）」，读者先看到表里的「破硬线」会以为结论仍是不做。旧线限定只写在 `:52`（第 11 项要改的那句），表内没有。
- 修法：`:57` 改成「直接破 310,000 B 内部预算（+402,939 B gzip，约 1.3 倍）」；`:39`/`:40` 的「破硬线」改成「破旧线 850,000」或在这两格后加「（按 2026-11-17 新线见决定节）」。**数字一个不改**，只加限定词。

## 四、其他观察（不单列为漏洞）

- 便携 zip 门槛抬到 2,000,000 仍是 planner 的判断（产品负责人只给了安装包两条线），已写进 `packaging/README.md` 与 `impl.md`，并留「下一轮改一个常量」的口子 —— 可接受。
- T1 第 3 项在 `installer.ps1` 里加 `Write-Warning` 不 exit，与 `measure` 的内部线同语义；CI（`ci.yml:39`、`release.yml:82,155`）不传 `--max`，我实测 workflows 里 0 个预算字面量（`git grep -nE` 全模式 exit 1）→ 换线后 CI 自动跟随的正确判断成立。
- `docs/CHANGELOG.md:24`「默认上限改 286,000」是历史条目，不在命令块 I 的文件清单里，保留正确（上一版同一判断）。
- `.field-hint` 样式已存在（`src/styles.css:1156`），T2 的新 hint 不加 CSS 也有样式；`.dialog-textarea` 类名保留的 e2e 约束成立。
- T3 的 4b（`:248`）文字里「② 预览 → 写成 `else if (!previewMode) focusEditor()`」与「③ 其余 → focusEditor()」是同一个条件，代码上只有两条路径。任一写法都能过 d/e/d2（预览 pane 不可聚焦，多调一次 `focusEditor()` 也是 no-op），所以**不计漏洞**；但建议直接把 5 行完整片段写进计划，别让执行者自己拼（与计划自己「不给看起来修了的空间」的口径一致）。
- `keyboard-acceptance` 本轮不跑可接受（它会覆盖 `shots/round-05/` 已跟踪截图，T3 的三条路径已由 b 覆盖）。

## 五、UNVERIFIED（本次审查没做的）

1. 未改任何产品代码、未打补丁、未构建；`git status --porcelain` 仍只有 `?? docs/iteration/round-35/`、`?? shots/round-35/`。对「改完后是否 PASS」是静态推演 + 对现状的实测。
2. 未跑 `npm run build`/`npm run verify`/`npm test`（避免写 `dist/`、避免与根代理抢）；294 条是代码静态清点（287+4+3），未实跑。
3. 未跑浏览器 e2e：T2 的迁移/请求体断言、T3 的 a–e/d2 全部没有运行；「改前坏、改后好」的对照用的是 `findings-bug.md` 的日志（源码 5/5、预览 3/3），未由我复现。
4. 未打包：1,800,000/2,000,000 只做算术核对（320,000−285,937=34,063；310,000−285,937=24,063；1,800,000−1,474,881=325,119；2,355,122−2,000,000=355,122），安装包真实字节在 Mermaid 落地那轮才验。
