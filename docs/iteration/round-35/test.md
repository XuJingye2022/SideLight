# 第 35 轮验收报告（tester，独立复验）

- 轮前 `startSha`：`e64c2fce75a372fb6f072ba312e7164b4e710d94`（`main` 上 `docs: round-34 看板记录提交哈希`）。
- 验收对象：**工作区未提交改动**（19 个文件 + `docs/iteration/round-35/`、`shots/round-35/`），不是某个 commit。
- 依据：只读 `docs/iteration/round-35/plan.md`、`git diff`、`git status`；**未读 `impl.md`**。
- 环境：Windows 11，dev server `http://localhost:5175`（`HTTP 200`，未重启），CDP 9222（每次 e2e 前 `node .tmp/reset.mjs 9222`），未启动/未 kill 任何浏览器。
- 判定：**PASS-WITH-UNVERIFIED**（门禁与三条任务验收全过；5 条真机/无 Key 项测不了，见末节）。

## 0. 门禁（全部实跑，原样记录）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | `TSC_EXIT=0` |
| `npm test` | 22 个文件、**295 条**、`fail 0`、`TEST_EXIT=0` |
| `npm run build` | `✓ built in 223ms`、`BUILD_EXIT=0` |
| `node scripts/measure-first-screen.mjs` | `total raw=929011 gzip=286056 headroom=33944 files=2 max=320000` / `target=310000 gap=23944` / `PASS`、`MEASURE_EXIT=0` |
| `npm run verify` | 同上末行 `PASS`、`VERIFY_EXIT=0`（确认 `verify` 继承新默认 `max=320000`） |
| `npm run roundtrip` | `rich: 5/7`、`source: 7/7`、`firstSaveBlocked: 1/7`、`RT_EXIT=0`（与 HEAD 基线一致，`docs/roundtrip-report.md` 无 diff） |

轮末实测：首屏 gzip **286,056 B**（比第 34 轮 285,937 多 119 B），距硬线 320,000 **余 33,944 B**、距内部预算 310,000 **余 23,944 B**；主 chunk `dist/assets/index-CYKrmZl7.js` raw **895,227 B** / gzip 279,028 B。

## 1. T1 体积护栏换挡 — 全部通过

计划要求每条「0 命中」都带改前正向对照，已照做。

| # | 检查 | 实测 |
| :--- | :--- | :--- |
| a | `measure` 默认 | `exit 0`；`gzip=285937`（T1 时点 `dist`）、`max=320000`、`headroom=34063`、`target=310000 gap=24063`、末行 `PASS` |
| b | `--max 280000` | `exit 1`；`headroom=-5937`；末行 `FAIL 首屏 gzip 285937 超过上限 280000` |
| c | `--target 280000` | `exit 0`；`target=280000 gap=-5937`；`WARN 首屏 gzip 285937 超过内部预算 280000（越过 5937 B），仍在硬线 320000 内`；末行 `PASS`（`:13` 的 `positional` 已修，`280000` 不再被当目录） |
| c2 | 同一对命令连跑 | 硬线 `EXIT=1` / 内部线 `EXIT=0`——「硬线拦、内部线只报警」的最小正反证 |
| e | `installer.ps1` 旧线→新线 | `'820,?000','850,?000'` 改前 **6**（`git grep HEAD` 抓到 5 行 + `:4`）／改后 **0**；新线 **8** |
| f | `portable.ps1` | `'940,?000'` 改前 **1**（`:15`）／改后 **0**；`'2,?000,?000'` **2** |
| g | `verify-installer.ps1` | 新线 **7**；旧线 `'820,?000','850,?000','940,?000'` **0** |
| h | `git grep -nE '…' -- .github/workflows` | **0 行**（`EXIT_H=1`）；正向对照：同模式在 `HEAD:README.md`/`HEAD:packaging/installer.ps1` 抓到 **~8 行**（`EXIT_PC=0`），模式有效 |
| i | `git grep -nE '旧线' -- 5 个文档` | **0 行**（`EXIT_I=1`）；改前对照即上一条的 `HEAD:README.md:99,110,185` |
| i2 | `.tmp/iteration/common.md` | `'286,?000'` **0**（改前 1）；该文件被 gitignore，`git grep` 看不到，单独查过 |
| j | 三个 `.ps1` 语法解析（当前会话直跑） | `installer=0`、`portable=0`、`verify-installer=0`，无一条报错 |
| k | BOM | 三个脚本首三字节都是 `239 187 191` |
| l | 改动范围 | `git status --porcelain` 里 `release/` **0 项**；`git diff --stat` 全在 T1/T2/T3 文件清单内；无新依赖（`package.json` 未改（版本仍 `0.32.1`，`dependencies` 无变化）） |

## 2. T2 AI 提示词拆分 — 全部通过

| # | 检查 | 实测 |
| :--- | :--- | :--- |
| a | `npx tsc --noEmit` | exit 0 |
| b/c/d | `prompt.test.ts` / `settings.test.ts` / `annotations.test.ts` | 含在 `npm test` 内，`29? → 295` 全过（prompt 7 条、settings 6 条、annotations 条数不变） |
| e | `npm test` | 22 文件 295 条、0 fail（计划预计 293–295） |
| f | `git grep "DEFAULT_ANALYSIS_PROMPT" -- src` | **0 命中**（`EXIT_F=1`） |
| g | `git grep "analysisPrompt" -- src` | 只出现在迁移分支与迁移用例：`settings.ts:65-77`、`settings.test.ts:41,48,54,59,74,78`；**`ai.ts` / `App.tsx` / `SettingsDialog.tsx` 里 0 处** |
| g2 | `git grep "clampFontSize" -- src/App.tsx` | **3 行**：`:78` import、`:1731` 字号命令、`:3717` `commitSettings`——删 JSON 警告块时没连带删字号钳制 |
| h | `node .tmp/e2e-r35-t2-prompt.mjs` | `T2_EXIT=0`，17 条断言全 `ok:true`，`failed:[]`；两张截图存在 |

e2e 关键断言（原样）：旧 `analysisPrompt:'旧自定义-35'` 迁移后设置 textarea 读到 `旧自定义-35`；新 label「作者偏好」1 处、`field-hint` 4 处；保存后 `localStorage` 里 `userPrompt='自定义偏好-35：多查证据与结构'`、`analysisPrompt=undefined`、`promptVersion=0`（自定义值保留原版本标记）；请求体 `messages.length===2`，`[0].role=system` 含「只输出 JSON Lines」与 `"kind":"overall"`、`不编事实`、**不含**用户偏好；`[1].role=user` 含 `自定义偏好-35` 与 `<选区>`、**不含** `JSON` 与 `"kind"`；批注正常出现在页边。

## 3. T3 Esc 后焦点回正文 — 6 组全通过

`node .tmp/e2e-r35-t3-esc.mjs` → `T3_EXIT=0`，`summary {"failed":0,"groups":["a","b","c","d","e","d2"]}`：

| 组 | 关键字段 | 结果 |
| :--- | :--- | :--- |
| a 预览 | `inPreview:true`、`active:"DIV.tiptap ProseMirror editor ProseMirror-focused"`、`landed:true` | ok |
| b 源码 | `sourceOn:true`、`textareaGone:true`、`active:"DIV.tiptap ProseMirror editor ProseMirror-focused"`、`landed:true` | ok |
| c 快速打开 | `overlay:3`、`active` 同上、`landed:true` | ok |
| d 查找＋源码 | `findClosed:true`、`sourceKept:true`、`active:"TEXTAREA.source-editor"` | ok（一个 Esc 只关查找，源码不退出，焦点回源码框） |
| e 查找＋富文本 | `sourceExited:true`、`findClosed:true`、`landed:true` | ok（第 34 轮行为无回归） |
| d2 查找＋预览 | 第一次 Esc：`findClosed:true`、`previewKept:true`、`oneAction:true`、`firstActive:"BODY."`；第二次 Esc：`secondEditable:"true"`、`secondActive:"DIV.tiptap ProseMirror editor ProseMirror-focused"`、`landed:true` | ok |

`firstActive:"BODY."` 是**内建的反向对照**：同一套快照逻辑确实能把 `body` 与 `.ProseMirror` 分开，所以 a/b/c/e 的 `DIV.tiptap…` 不是假阴。预览 pane 不可聚焦是计划显式选择（本轮不给它加 `tabIndex`），不作失败判据，第二次 Esc 后已回可编辑正文。

代码复核（`git diff`，与计划 4 条改动一一对应）：`src/App.tsx:3537`（源码 Esc → `focusEditor()`）、`:3541`（预览 Esc → `focusEditor()`）、`:5095-5098`（快速打开 `onClose` → `focusEditor()`）、`:4586-4597`（FindBar `onClose` 按 `sourceMode`/`previewMode` 分派，预览分支显式注释不聚焦）、`src/components/FindBar.tsx:52-56,85-89`（两处 Esc 加 `preventDefault()` + `stopPropagation()`）。截图 `shots/round-35/t3-esc-focus.png` 已由本次运行重写。

## 4. 回归

- `npm test`：22 文件 295 条、0 fail（含第 34 轮的脚注拦截与焦点用例）。
- `npm run roundtrip`：`rich 5/7`、`source 7/7`、`firstSaveBlocked 1/7`，`docs/roundtrip-report.md` **与 HEAD 无 diff**（改前改后同值）。
- `keyboard-acceptance` / `tree-acceptance` / `draft-acceptance`：**本轮未跑**。计划明写 `keyboard-acceptance` 会覆盖已跟踪的 `shots/round-05/`，且 T3 的焦点三条已由 e2e a/b/c/d/e/d2 覆盖；`git status` 确认 `shots/round-05/`、`shots/round-08/` 无改动。
- e2e 互斥：T2、T3 之间各跑一次 `node .tmp/reset.mjs 9222`，未同时开两个页面。

## 5. 计划任务与实测对照

| 任务 | 计划 | 实测 |
| :--- | :--- | :--- |
| T1 体积护栏换挡 | P0，必须第一 | 已做：脚本 + 3 个 ps1 + 5 处文档 + ADR-0012/0017 + `.tmp/iteration/common.md`；a–l 全过 |
| T2 AI 提示词拆分 | P0 | 已做：system/user 分离、`userPrompt` 改名与迁移、设置 UI、`DISCUSS_SYSTEM_PROMPT`、删失效 JSON 警告；17/17 e2e + 单测 |
| T3 Esc 焦点 + 一次按键一个动作 | P1，唯一可砍项 | 已做且**未被砍**：6 组 e2e 全过，与计划行号一一对应 |

计划里三条任务的验收表逐条都对上了；没有发现「写了但没做」的项。计划明列的不在范围内项（Mermaid、工作区图片破路、`qa15.mjs` 等）本轮未动，`git diff` 里也没有它们的痕迹。

## 6. UNVERIFIED（测不了，写清原因与补测法）

1. **真模型在格式/偏好分离后是否更听话**：无 Key，只验了请求体形状（system 含全部格式规则、user 只含偏好）。补测：配真 Key 跑说明书/散文/技术文各一篇，看是否仍出可解析的 JSON Lines。
2. **安装包新预算线的真实字节**：本轮不打包（会写 `release/`，本轮禁止），只做了 `Select-String` 静态检查与 `Parser::ParseFile` 语法解析。补测：下次手动发版时 `packaging\installer.ps1`，看 `target=1800000 gap=` 与实际 `hard=2000000 B` 行。
3. **CI 换线后的实际绿**：不 push，workflows 只静态验证（0 个预算字面量 + 脚本默认值）。补测：下一轮 push 后看 `ci.yml` 两个 job。
4. **`packaging/verify-installer.ps1` 新增体积段的真机运行**：会写 `release/` 且要 NSIS，本轮只静态检查。补测：手动跑一次 `packaging\verify-installer.ps1`。
5. **`scripts/qa15.mjs` 因提示词拆分失效的 4 行**（计划明列不改、不在任何门禁里）：未跑、未修。补测：下一轮改成新文案与新键后跑一次。
6. **WKWebView 下的 Esc 焦点行为**：本机 Windows，未验 `host-mac/`。
7. **预览模式下关查找后焦点暂时在 `body`**：计划显式选择（预览 pane 无 `tabindex`、只读、快捷键由 window 处理），e2e d2 已证明「再按一次 Esc 回正文且打字落地」；下一轮若补，需加 `tabIndex={-1}` + `.preview-pane:focus { outline: none }`（否则全局 `:focus-visible` 会给整个 pane 画外框）。

## 7. 收尾（本报告随提交一起落盘）

- `docs/CHANGELOG.md`：`## Unreleased（第 29–35 轮，未发版）` 下新增「第 35 轮」子段（三条 + 测试/体积数字 + UNVERIFIED）。
- `README.md`：「依赖与体积」首屏实测改 **286,056 B（−21.6%）**、补第 35 轮 +119 B 一行、主 chunk 改 895,227 B、`npm test` 改 295 条。
- `AGENTS.md`：§3 测试条数 295；§6 能力列表加 AI 提示词拆分与 Esc 焦点、测试 22/295、首屏 gzip 286,056 B；§8 新增 5 条踩坑（`Select-String` 假阴、`powershell -Command` 双引号展开、源码模式 `.ProseMirror` 不在 DOM、`FindBar` Esc 必须 `stopPropagation`、`measure` 位置参数吃 `--flag` 的值）。
- `docs/iteration/STATE.md`：当前版本与体积段（首屏 286,056 / 余 33,944、测试 22/295）、第 35 轮条目、下一轮优先重写、轮次表加第 35 行、决策记录加一行。
- 版本：按计划**不发版**，`package.json` 保持 `0.32.1`；不改 `release/`；不 push。
