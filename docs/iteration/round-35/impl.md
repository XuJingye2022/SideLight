# 第 35 轮 · 执行报告（executor）

- 基线：`main` @ `e64c2fce75a372fb6f072ba312e7164b4e710d94`（= 轮前 startSha）。版本 **0.32.1**，未发版。
- 三个任务**全部交付**：T1（P0）体积护栏换挡、T2（P0）AI 提示词拆分、T3（P1）Esc 焦点修复。T3 未被砍。
- 未 commit、未 push、未改 `package.json`、未动 `release/`、未动 `host/` 与 `host-mac/`、未新增依赖、未改 Markdown 序列化。
- 计划审查（`plan-review.md`，rev 3）的 4 条 REVISE 全部按它的修法落地，逐条记在下面「对计划审查意见的落地」。

## 逐任务状态

| # | 任务 | 状态 | 门禁 |
| :--- | :--- | :--- | :--- |
| T1 | 体积护栏换挡：首屏内部 310,000 / 硬线 320,000；安装包内部 1,800,000 / 硬线 2,000,000 | **DONE** | 步骤 0 + 验收 a–l 全过 |
| T2 | AI 提示词拆分：格式与安全规则进内置 system，设置只改 user prompt，旧值迁移不丢 | **DONE** | a–i 全过（tsc / 单测 / e2e） |
| T3 | Esc 后焦点回正文（预览 / 源码 / 快速打开）＋ 查找框开着时一个 Esc 只关查找 | **DONE** | a–e 全过（6 组 e2e） |

## 改动文件

| 段 | 文件 |
| :--- | :--- |
| T1 | `scripts/measure-first-screen.mjs`、`packaging/{installer,portable,verify-installer}.ps1`、`packaging/README.md`、`README.md`、`AGENTS.md`、`docs/iteration/STATE.md`、`docs/adr/0012-katex-lazy-loading.md`、`docs/adr/0017-mermaid-lazy-loading.md`、`.tmp/iteration/common.md`（gitignore） |
| T2 | `src/lib/prompt.ts`（重写）、`src/lib/ai.ts`、`src/lib/settings.ts`、`src/components/SettingsDialog.tsx`、`src/App.tsx`（`:1564`、`:3718-3722`）、`src/lib/{prompt,settings,annotations}.test.ts`、`.tmp/e2e-r35-t2-prompt.mjs` |
| T3 | `src/App.tsx`（`:3536-3543`、`:4587-4597`、`:5095-5098`）、`src/components/FindBar.tsx`、`.tmp/e2e-r35-t3-esc.mjs` |

`git diff --stat` 共 19 个已跟踪文件、+296/−130；`git status --porcelain` 另有 `?? docs/iteration/round-35/`、`?? shots/round-35/`（本轮报告与截图），`release/` 无改动。

---

## T1 体积护栏换挡

### 步骤 0：改前正向对照（计划 P1-2 要求，每条「0 命中」都能被证伪）

```
Test-Path dist\index.html                       -> True
(Select-String packaging\installer.ps1 -Pattern '820,?000','850,?000').Count   -> 6
(Select-String packaging\portable.ps1  -Pattern '940,?000').Count              -> 1
git grep -nE '286,?000|820,?000|850,?000|940,?000' HEAD -- README.md packaging/installer.ps1  -> 7 行，EXIT=0
git grep -nE '286,?000|820,?000|850,?000|940,?000' -- README.md AGENTS.md docs/iteration/STATE.md packaging/README.md docs/adr/0012-katex-lazy-loading.md  -> 8 行，EXIT=0
(Select-String .tmp\iteration\common.md -Pattern '286,?000').Count             -> 1
git grep -nE '286,?000|…|2,?000,?000' -- .github/workflows                     -> 0 行，EXIT=1
```

### 改了什么

- `scripts/measure-first-screen.mjs`：`:13` 的 `positional` 换成「跳过所有 `--` flag 及其后一个值」（`args.find((arg, i) => !arg.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'))`）；`--max` 默认 **320000**；新增 `--target` 默认 **310000**；汇总行字段顺序不动，**下一行**打 `target=… gap=…`；硬线 FAIL 之前加内部线 WARN（不 exit）；头注释写清口径（只算 JS/CSS、不含入口 HTML；宿主不发 gzip）与两条线。
- `packaging/installer.ps1`：`target=1800000`、超内部预算 `Write-Warning`（不 exit）、`hard=2000000`、`if ($p -gt 2000000)` 才打印载荷占比并 exit 1；`:4` 头注释同步。
- `packaging/portable.ps1`：`$threshold = 2000000`（与安装包共用硬线），`$threshold` 上方一句注释说明「zip 不另设内部预算」。
- `packaging/verify-installer.ps1`：在 setup 存在性检查块（`:40-43`）之后插入体积护栏：`setup=<字节> target=1800000 gap=`、超内部预算打 WARN（不 `Fail`）、超 2,000,000 记 `Fail`、未超记 `Pass`。
- 文档/ADR：见下表。

### 验收（全部原样输出）

| # | 命令 | 结果 |
| :--- | :--- | :--- |
| a | `node scripts/measure-first-screen.mjs` | **exit 0**：`total raw=930008 gzip=285937 headroom=34063 files=2 max=320000`、`target=310000 gap=24063`、`PASS` |
| b | `node scripts/measure-first-screen.mjs --max 280000` | **exit 1**：`headroom=-5937`、`FAIL 首屏 gzip 285937 超过上限 280000` |
| c | `node scripts/measure-first-screen.mjs --target 280000` | **exit 0**：`target=280000 gap=-5937`、`WARN 首屏 gzip 285937 超过内部预算 280000（越过 5937 B），仍在硬线 320000 内`、末行 `PASS` |
| c2 | `--max 280000; EXIT` 与 `--target 280000; EXIT` 连跑 | `EXIT_MAX=1`、`EXIT_TARGET=0`（硬线拦、内部线只报警；同时证明 `:13` 修对了——`--max` 的值没被当目录） |
| d | `node scripts/measure-first-screen.mjs --dir .tmp/nope` | **exit 1**（目录错不静默 PASS；`--dir` 没被 `:13` 改坏） |
| d2 | `node scripts/measure-first-screen.mjs dist`（单独位置参数） | **exit 0**（位置参数兜底仍生效） |
| e | installer：旧线 `820,?000','850,?000'` | 改前 **6** → 改后 **0**；新线 `1,?800,?000','2,?000,?000'` → **8** |
| f | portable：旧线 `940,?000'` | 改前 **1** → 改后 **0**；新线 `2,?000,?000'` → **2** |
| g | verify-installer：新线 | **7**（≥2）；旧线 `820/850/940` → **0** |
| h | 命令块 H（workflows 全模式，真 `\|`） | **0 行，exit 1**（预算不写死在 CI；正向对照用步骤 0 的 7 行/8 行） |
| i | 命令块 I（5 个文档） | **0 行，exit 1**（改前 8 行） |
| i-ADR | `git grep -nE '286,?000' -- docs/adr/0017-mermaid-lazy-loading.md` | **0 行，exit 1**（计划审查 P2-2 补的窄命令，改前 `:7`/`:57` 各 1 行） |
| i2 | `(Select-String .tmp\iteration\common.md -Pattern '286,?000').Count` | 改前 **1** → 改后 **0** |
| j | 三个 `.ps1` 的 `Parser::ParseFile(...).Count`（当前会话直跑） | `installer=0`、`portable=0`、`verify-installer=0` |
| k | `[IO.File]::ReadAllBytes(...)[0..2]` | 三个都是 **239 187 191**（BOM 已补，见「新踩坑」1） |
| l | `git status --porcelain` / `git diff --stat` | 只出现在本任务清单里；`release/` 无改动、无新文件 |

`package.json:13` 的 `verify` 未改，验收 a 直接证明它继承新默认（末行 `max=320000`）。

### 文档改写（逐条）

- `README.md:99`：整句替换成「首屏预算内部 **310,000 B** / 硬线 **320,000 B**（2026-11-17 产品负责人放宽；原临时上限与数据安全例外作废，历史理由见 STATE），当前 285,937 B（距硬线余 **34,063 B**）；安装包内部预算 **1,800,000 B** / 硬线 **2,000,000 B**，最新发布资产 824,209 B（本机重建 824,595 B，距硬线余 1,175,791 B）。」——**新句不含任何旧线数字**（计划审查 P1-1 的修法）。
- `README.md:101`：主 chunk `896,149` → **`896,224` B**（T1 时点实测 `dist/assets/index-O0GdPjrm.js` raw）。
- `README.md:110`：`（内部预算 820,000 B，硬线 850,000 B 不动）` → `（内部预算 1,800,000 B，硬线 2,000,000 B）`。
- `README.md:185`：Mermaid `本轮不实现` → **「第 36 轮实现**（产品负责人 2026-11-17 批准，预算已放宽到内部 1,800,000 / 硬线 2,000,000）」。
- `AGENTS.md:74`：只写两条预算线，**不写实测字节与余量**（P2-1，留给根代理轮末回填）。
- `docs/iteration/STATE.md:52`：只改两条体积线（首屏「内部上限 310,000 / 硬线 320,000」，安装包补「内部 1,800,000 / 硬线 2,000,000」）；`285,937 B` 与 `22 文件 287 条` 原样保留，等根代理轮末一次性回填。
- `docs/adr/0012-katex-lazy-loading.md:43`：Kill 判据 `--max 320000`（注明内部 310,000）；历史数字一个没动。
- `docs/adr/0017-mermaid-lazy-loading.md`：标题、首段、决定首句改成「2026-11-17 接受，第 36 轮实现」，补 AGENTS §4 运行时依赖例外句、第 36 轮 README 待办；背景节预算换新；`:52` 改成「按旧线（850,000）都破线；按新线档 1b 在内部预算内、档 2 破硬线」；`:57` 改成「直接破 310,000 B 内部预算（+402,939 B gzip，约 1.3 倍）」（计划审查 P2-3：原「十几倍」与实测矛盾）；`:39`/`:40` 两格的「破硬线」加限定词「按旧线破硬线 850,000 共 …；按 2026-11-17 新线见决定节」——**数字一个没改**；`:15-17` 三选项保留（加一行「当时给出的三个选项（历史记录，方案 1 已被选中）」）；实测表与「否决的方案」的历史数字不动；状态节改「2026-11-17 接受（第 36 轮实施）」。
- `packaging/README.md:42,57`：`target=1800000 gap=` 与硬线 2,000,000 B；`:57` 写新两条线 + 便携 zip 门槛 2,000,000 B（与安装包共用硬线、不另设内部预算的理由）+ 0.32.1 实测 824,209 B。
- `.tmp/iteration/common.md:30`：`首屏 gzip ≤310,000 B（内部）/ 320,000 B（硬线）；安装包 ≤1,800,000 B（内部）/ 2,000,000 B（硬线）`。

### 未做（计划明确排除）

- 未跑 `npm run build` / `npm run verify`（硬约束 3：`emptyOutDir` 与根代理的构建互相清空）。`dist/` 未重建，验收 a–d 读的是上一轮产物（`gzip=285937`）。
- 未跑 `packaging/*.ps1`（会写 `release/`）：只做 Parser 语法解析与 BOM 检查。
- `vite.config.ts:32,35,38` 的过期注释（可砍项）**未改**。

---

## T2 AI 提示词拆分

### 目标形状（已实现）

```
messages[0] = { role: 'system', content: ANALYSIS_SYSTEM_PROMPT }            // 内置，不进设置
messages[1] = { role: 'user',   content: buildUserMessage(context, userPrompt, mode) }
```

### 改了什么

- `src/lib/prompt.ts`（重写，仍只导出常量与一个纯函数）：新增 `ANALYSIS_SYSTEM_PROMPT`（**含**原 `:6` 角色句「你是 Sidelight 的批注员…」与 `:8` 的「三处以上指向同一件事才算有把握」判断门槛——计划审查 P2-1）、`DEFAULT_USER_PROMPT`（只放偏好与检查重点，约 95 字）、`DISCUSS_SYSTEM_PROMPT`（从 `App.tsx:1563` 原样搬来）；`buildUserMessage(context, userPrompt = DEFAULT_USER_PROMPT, mode = 'local')` 把作者偏好块放最前（空白则整块省略），两处「按 JSON Lines 输出」已删——格式规则只留在 system。
- `src/lib/ai.ts`：`buildMessages(context, prompt = DEFAULT_USER_PROMPT, mode)`，system 固定 `ANALYSIS_SYSTEM_PROMPT`，user 用 `buildUserMessage(context, prompt.trim() ? prompt : DEFAULT_USER_PROMPT, mode)`；`remoteStream` 传 `settings.userPrompt`。
- `src/lib/settings.ts`：`analysisPrompt` → **`userPrompt`**；`DEFAULT_SETTINGS.userPrompt = DEFAULT_USER_PROMPT`、`promptVersion: 3`；新增 `LEGACY_PROMPT_FINGERPRINT_V2 = '795:ebaf07b2'`；迁移读 `parsed.userPrompt ?? parsed.analysisPrompt`，空白→默认，`savedVersion < 3 && 指纹命中 v1/v2` → 默认，否则原样保留；`promptVersion = userPrompt === DEFAULT_USER_PROMPT ? 3 : savedVersion || 0`。
- `src/components/SettingsDialog.tsx`：label「批注提示词（作者偏好）」、值绑 `draft.userPrompt`、「恢复默认」写 `DEFAULT_USER_PROMPT`、字段下加 `.field-hint`「格式与安全规则内置、不可改；这里只写你自己的偏好与检查重点。」`.dialog-textarea` 类名保留。
- `src/App.tsx`：discuss 的 system 改 `DISCUSS_SYSTEM_PROMPT`（新 import）；`commitSettings` **只删 `:3718-3721` 的 `/json/i` 警告块**，`:3714` 的 `clampFontSize` 钳制与 `:3715-3717` 原样保留（验收 g2 证明）。
- 测试：`prompt.test.ts` 7 条、`settings.test.ts` 7 条、`annotations.test.ts` 两条旧 API 用例改用新导出（**不删用例**）。**没有新建测试文件**。

### 验收（全部原样输出）

| # | 命令 | 结果 |
| :--- | :--- | :--- |
| a | `npx tsc --noEmit` | **exit 0** |
| b | `node --experimental-strip-types src/lib/prompt.test.ts` | **7 pass / 0 fail** |
| c | `node --experimental-strip-types src/lib/settings.test.ts` | **7 pass / 0 fail**（含 `promptFingerprint(V2_DEFAULT_PROMPT) === '795:ebaf07b2'` 自证） |
| d | `node --experimental-strip-types src/lib/annotations.test.ts` | **22 pass / 0 fail**（条数不变） |
| e | `npm test` | **22 个文件、295 条、0 fail、exit 0** |
| f | `git grep -n "DEFAULT_ANALYSIS_PROMPT" -- src` | **0 命中，exit 1** |
| g | `git grep -n "analysisPrompt" -- src` | 只在 `settings.ts:65,66,76,77`（迁移分支）与 `settings.test.ts` 的迁移用例里；`ai.ts`、`App.tsx`、`SettingsDialog.tsx` **0 处** |
| g2 | `git grep -n "clampFontSize" -- src/App.tsx` | **3 行**：`:78` import、`:1731` 字号命令、`:3715` `commitSettings` |
| h | `node .tmp/e2e-r35-t2-prompt.mjs` | **`## t2-prompt {...}` 17 条断言全 `ok:true`，exit 0** |
| i | `git diff --stat` | 只碰 T2 文件清单 + 两张新截图；未改 `src/styles.css` |

### e2e 关键输出（`.tmp/e2e-r35-t2-prompt.mjs`，先 `node .tmp/reset.mjs 9222`）

```
旧 analysisPrompt 迁移到设置里的 textarea  ok:true  "旧自定义-35"
新 label 出现（作者偏好）                  ok:true  1
内置规则不可改的 hint 出现                 ok:true  4
落盘写 userPrompt                          ok:true  "自定义偏好-35：多查证据与结构"
落盘不再写 analysisPrompt                  ok:true  undefined
自定义值版本标记保留 0                     ok:true  0
批注出现在页边                             ok:true  1
请求命中 chat/completions                  ok:true  1
请求体是 2 条消息                          ok:true  2
消息 0 是 system                           ok:true  system
system 含格式规则 / 安全规则               ok:true  （/只输出 JSON Lines/、/"kind":"overall"/、/不编事实/）
system 不含作者自定义偏好                  ok:true
消息 1 是 user / 含作者偏好 / 含 <选区>    ok:true
user 不含 JSON 协议                        ok:true
failed: []
```

截图：`shots/round-35/t2-prompt-settings.png`（新 label + hint + 迁移后的旧值 `旧自定义-35`）、`shots/round-35/t2-prompt-rails.png`（批注出现在页边）。

### 记账（本轮不改）

- **`scripts/qa15.mjs` 已知失效，未验**（计划 P2-2）：`:44`/`:55` 断言默认提示词含 `'JSON Lines'`、`:48` 读 `analysisPrompt` 键、`:53` 按文案「恢复默认提示词」找按钮。它不在任何门禁里（`npm test` 不跑 `scripts/`），改它要连带跑一次 5175 + CDP 真实探测。已按计划列入下一轮。
- `scripts/annotation-flow.mjs:74` 与 `host/fcp-probe.mjs:206` 仍写 `analysisPrompt`，**有意保留**（迁移分支读 `userPrompt ?? analysisPrompt`；空值回落默认）。
- 自定义文本若含旧格式句，迁移后原样作为「作者偏好」拼在 user 消息最前，**不解析、不改写、不丢**（产品负责人要求迁移不丢）；用户可点「恢复默认」。

---

## T3 Esc 焦点修复

### 改了什么（5 处接线）

| # | 位置 | 改法 |
| :--- | :--- | :--- |
| 1 | `src/App.tsx:3536-3539` | 源码 Esc：`toggleSourceRef.current()` 后加 `focusEditor()` |
| 2 | `src/App.tsx:3540-3543` | 预览 Esc：`togglePreviewRef.current()` 后加 `focusEditor()` |
| 3 | `src/App.tsx:5095-5098` | `onClose` 改 `{ setQuickOpen(false); focusEditor() }`（与选中分支一致） |
| 4a | `src/components/FindBar.tsx:46-58,75-84` | 两个 Esc 分支改 `preventDefault()` + **`stopPropagation()`** + `onClose()`——一个按键只处理一次，不再冒泡到 window 的 Esc 分支 |
| 4b | `src/App.tsx:4587-4597` | FindBar `onClose` 按模式分派：源码 → `requestAnimationFrame` 后聚焦 `textarea.source-editor`；预览 → **显式不聚焦**（写成 `else if (!previewMode) focusEditor()` 并加注释）；其余 → `focusEditor()` |

未给预览 pane 加 `tabIndex`（会触发全局 `:focus-visible` 外框，超范围）。

### 验收（全部原样输出）

| # | 命令 | 结果 |
| :--- | :--- | :--- |
| a | `npx tsc --noEmit` | **exit 0** |
| b | `node .tmp/e2e-r35-t3-esc.mjs` | **6 组全 `ok:true`，exit 0** |
| c | 同上日志的 `active` 字段 | 见下 |
| d | `git diff --stat` | 只碰 `src/App.tsx`、`src/components/FindBar.tsx` + 一张新截图 |
| e | `npm test` | 与 T2 之后同条数（295 条，T3 不加单测） |

```
## a  {"inPreview":true,"active":"DIV.tiptap ProseMirror editor ProseMirror-focused","focused":true,"landed":true,"ok":true}
## b  {"sourceOn":true,"active":"DIV.tiptap ProseMirror editor ProseMirror-focused","textareaGone":true,"landed":true,"ok":true}
## c  {"overlay":3,"active":"DIV.tiptap ProseMirror editor ProseMirror-focused","landed":true,"ok":true}
## d  {"findOn":true,"findClosed":true,"sourceKept":true,"active":"TEXTAREA.source-editor","ok":true}
## e  {"sourceExited":true,"findOn":true,"findClosed":true,"active":"DIV.tiptap ProseMirror editor ProseMirror-focused","landed":true,"ok":true}
## d2 {"previewOn":true,"findOn":true,"firstActive":"BODY.","findClosed":true,"previewKept":true,"oneAction":true,"secondEditable":"true","secondActive":"DIV.tiptap ProseMirror editor ProseMirror-focused","landed":true,"ok":true}
## summary {"failed":0,"groups":["a","b","c","d","e","d2"]}
```

截图：`shots/round-35/t3-esc-focus.png`（预览 Esc 后打「乙」直接落进正文：`甲第一段。乙`）。

### 「改前坏」的对照（**没有重跑改前**，用证据代替，未编造）

计划的步骤 4 要求「修复前先跑一次 a、d、d2」。我把 T3 代码接线与 e2e 脚本一次性做完后才跑，**没有在改前跑过这三组**。按计划允许的替代方式，引用本轮 finder 的实测：

- a（预览 Esc 后焦点落 body、下一次击键丢失）：`docs/iteration/round-35/findings-bug.md:20-26`，预览 4/4；截图 `shots/round-35/p3-esc-focus.png`，脚本 `.tmp/e2e-r35b-bug-probe6.mjs`（日志 `.tmp/e2e-r35b-bug-probe6.log`）。
- b（源码）：`findings-bug.md:28-30`，源码 3/3；`.tmp/e2e-r35b-bug-probe3.mjs`。
- c（快速打开）：`findings-bug.md:20-64` 与 `:60` 的代码定位，快速打开 3/3。
- d（查找＋源码，一次按键两个动作）：`findings-bug.md:79-84` 的 `## C-src-find-esc`（`{"s3":{"find":false,"textarea":false,…}}`，2 次相同，日志 `.tmp/e2e-r35b-bug-probe.log`）。
- d2（查找＋预览）：`findings-bug.md:83` 的 `## preview-find-esc-x2`（`post.editable:"true"`——预览被同一个 Esc 一起退掉，日志 `.tmp/e2e-r35b-bug-probe6.log`）。

**这是本报告唯一的证据缺口**：改前不是本会话亲手复现的。补测方法：`git stash` 只回滚 `src/App.tsx`+`src/components/FindBar.tsx` 的 T3 五处 → `node .tmp/reset.mjs 9222 && node .tmp/e2e-r35-t3-esc.mjs`（预期 a/b/c 的 `active` 是 `BODY.`、d 的 `sourceKept:false`、d2 的 `previewKept:false`）→ `git stash pop`。

---

## 全量门禁（executor 角色要求）

| # | 命令 | 结果 |
| :--- | :--- | :--- |
| 1 | `npx tsc --noEmit` | **exit 0**（T3 改完后再跑一次同样 0） |
| 2 | `npm test` | **exit 0，22 个文件、295 条、0 fail** |
| 3 | `npm run roundtrip` | **未跑**：本轮没改编辑器与 Markdown 序列化（计划也写「可以不跑」） |
| 4 | `npm run build` / `npm run verify` | **未跑，按计划硬约束 3**：`emptyOutDir` 会与根代理的构建互相清空。**替代证据**：`npx vite build --outDir .tmp/build-check --emptyOutDir`（不碰 `dist/`）→ **`✓ built in 216ms`，BUILD_EXIT=0**；同一命令 `npm run build` 只剩 `tsc --noEmit`（已单独 exit 0） |
| 5 | `node scripts/measure-first-screen.mjs`（现有 `dist/`，T1 时点） | **exit 0**：`gzip=285937 max=320000 headroom=34063`、`target=310000 gap=24063`、`PASS` |
| 5b | `node scripts/measure-first-screen.mjs --dir .tmp/build-check`（**T2+T3 之后**的新构建，参考值） | **exit 0**：`raw=929011 gzip=286056 headroom=33944`、`target=310000 gap=23944`、`PASS`；主 chunk `index-CYKrmZl7.js` **raw=895,227 B** |

**给根代理轮末回填的数字（收尾 #2）**：T2/T3 落地后的首屏 gzip **286,056 B**、距硬线余 **33,944 B**、距内部预算余 **23,944 B**、主 chunk raw **895,227 B**（`.tmp/build-check` 实测，outDir 不影响内容哈希，正常 `npm run build` 应得同一组数）。这些是**参考值**，以根代理自己 `npm run verify` 的输出为准。

---

## 对计划审查意见的落地（`plan-review.md` rev 3 的 4 条）

| 审查项 | 落地 |
| :--- | :--- |
| **P1-1** README:99 新句含旧线数字会让验收 i 必红 | 采用审查给的整句（新句无任何旧线数字）+ 跑 `git grep … -- README.md` 确认 0 行（并入验收 i 的 0 行结果） |
| **P2-1** 角色句与「三处以上」归属没写、单测拦不住 | `ANALYSIS_SYSTEM_PROMPT` 收下角色句与判断门槛；`prompt.test.ts` 第 1 条加 `/批注员/`、`/三处以上/`，第 2 条的 `doesNotMatch` 追加 `批注员\|三处以上` |
| **P2-2** 验收 i 与 ADR-0017 的历史数字冲突 | 命令块 I 的 5 个文件 0 行；ADR-0017 不在 grep 范围内，只清 `286,000`（窄命令 `i-ADR` → 0 行），`:38/:39/:40` 的历史对照与数字全部保留 |
| **P2-3** ADR-0017 `:57` 只换数字留下「十几倍」、实测表「破硬线」没限定 | `:57` 改「直接破 310,000 B 内部预算（+402,939 B gzip，约 1.3 倍）」；`:39`/`:40` 加「按旧线破硬线 850,000 共 …；按 2026-11-17 新线见决定节」，数字一个不改 |

另有 2 个计划没写、我自己补的处理（最小改动，不扩大范围）：

1. **`.tmp/iteration/common.md:30`** 的硬约束行改为新两条线（验收 i2 覆盖）——它不是产品文件，不改会与 `AGENTS.md`/`README` 冲突。
2. `packaging/portable.ps1` 的 `$threshold` 上方加一句注释说明「zip 与安装包共用硬线、不另设内部预算」，与 `packaging/README.md:57` 的口径对齐。

---

## 新踩坑

1. **`edit` 工具会去掉 `.ps1` 的 UTF-8 BOM**。本轮改完 `packaging/installer.ps1`、`portable.ps1`、`verify-installer.ps1` 后，三个文件首字节都变成非 `EF BB BF`；随后 `Parser::ParseFile` 在 PowerShell 5.1 下把无 BOM 的中文按 ANSI 读，`portable.ps1` 报 **2 条**假语法错（`字符串缺少终止符"。"` 等）、`verify-installer.ps1` 报 **8 条**（含整段回显乱码 `杩愯鏃跺瓨鍦`）。补 BOM 后两条都回到 0。**改 `.ps1` 后必须立刻验 BOM**，补法：`[IO.File]::WriteAllText($p, [IO.File]::ReadAllText($p), (New-Object Text.UTF8Encoding($true)))`。注意 `installer.ps1` 在补 BOM 前 **parse 也是 0**（它的中文只在注释与单引号串里，没被 ANSI 咬坏），所以「parse 0」不能代替 BOM 检查。
2. **`FindBar` 是懒加载 chunk，e2e 不能用固定毫秒等它**。首开 `Ctrl+F` 后 250 ms 内 `.find-input` 还没挂上 DOM（实测 probe：250 ms → 0 个，1500 ms → 2 个），会让 d/d2 两组假红。改用 `page.locator('.find-input').first().waitFor({state:'visible'})`。
3. **`scripts/measure-first-screen.mjs:13` 的旧 `positional` 写法只排除 `--max`/`--dir`**：加 `--target 280000` 后 `280000` 会被当目录（ENOENT）。换成「跳过所有 `--` flag 及其后一个值」后，`--max 280000`、`--target 280000`、单独 `dist` 三种调用都验过。
4. **想验证 build 又不碰 `dist/`**：`npx vite build --outDir .tmp/build-check --emptyOutDir` + `node scripts/measure-first-screen.mjs --dir .tmp/build-check`，可与根代理的 `npm run verify` 串行共存，outDir 不影响输出内容哈希。

## CHANGELOG 建议条目（根代理写，我不碰 `docs/CHANGELOG.md`）

```md
### 第 35 轮（未发版）
- 体积护栏换挡：首屏预算内部 310,000 B / 硬线 320,000 B，安装包内部 1,800,000 B / 硬线 2,000,000 B；`measure-first-screen.mjs` 新增 `--target`（内部线只 WARN）并修 `--target` 值被当目录的解析 bug，`installer.ps1`/`portable.ps1`/`verify-installer.ps1` 与 README/AGENTS/STATE/ADR-0012/0017 同步。
- AI 提示词拆分：格式与安全规则内置为 system prompt（不可改），设置只暴露「批注提示词（作者偏好）」；旧 `analysisPrompt` 自动迁移到 `userPrompt`（v1/v2 默认升级、自定义值不丢、旧键不再落盘），追问改用同一份 `DISCUSS_SYSTEM_PROMPT`；测试 22 文件 295 条。
- Esc 后焦点回正文（预览 / 源码 / 快速打开）；查找框开着时一个 Esc 只关查找（源码回源码框、预览不连带退出）。
```

## 本轮 UNVERIFIED（本报告范围内）

1. **改前对照不是本会话亲手复现**（T3 的 a/d/d2）：用 `findings-bug.md` 的日志代替，补测方法见上。
2. **真模型质量**：无 Key，只验了请求体形状（system/user 分离）；「偏好分离后模型更听话」未验。补测：配真 Key 跑说明书/散文/技术文各一篇。
3. **安装包真实字节**：本轮不打包，1,800,000/2,000,000 只做算术核对（320,000−285,937=34,063；310,000−285,937=24,063；1,800,000−1,474,881=325,119；2,355,122−2,000,000=355,122），真字节在 Mermaid 落地那轮验。
4. **`packaging/verify-installer.ps1` 的新增体积段**：只做 Parser 语法解析与 BOM 检查，没真跑（会写 `release/` 且要 NSIS）。
5. **CI 实际绿**：不 push，只做本地静态验证（workflows 0 个预算字面量 + 脚本默认值）。
6. **`npm run verify` 的整链**：本轮按计划不跑，由根代理轮末跑一次。
7. **macOS 侧**：未改 `host-mac/`，WKWebView 下的焦点行为未验（本机 Windows）。
