# 第 31 轮 · 独立验收（tester，首次验收）

- 验收人：tester（独立代理，端口 **9222**，按调度提示；计划 §2/§3 写 tester=9224，plan 自己写明「与调度提示冲突时以调度提示为准」）
- 时间：2026-11-17 02:00–02:10（Asia/Shanghai）
- 输入：`plan.md`（revision 2）、`git diff`、`git status`、`docs/iteration/round-31/plan.md` §3。**没读 `impl.md`**（`tester.md:3`）
- 版本：`package.json` 0.32.1（本轮不发版）；HEAD 起点 `5b36b71`（第 30 轮）
- dev server：`http://localhost:5175`（未启动、未重启）；CDP：9222（每组 E2E 前 `node .tmp/reset.mjs 9222`）

## 判定：**PASS-WITH-UNVERIFIED**

- 门禁全绿：`tsc` 退出码 0、`npm test` **21 文件 / 272 条 / 0 失败**、`npm run roundtrip` 退出码 0 且报告无 diff、首屏 **284,761 B ≤ 286,000（PASS，余 1,239 B）**。
- 本轮我自己的三组独立 e2e 共 **53 条断言全 PASS**（T1 21/21、T2 14/14、T3 18/18），全程 console error 0 / pageerror 0。
- 回归：`keyboard-acceptance` **49/49 PASS**；`roundtrip` rich 5/7 + source 7/7（与基线一致）。
- 计划四任务（T1/T2/T3/T4）都做了，没有任务整项缺失，没有砍单生效；`README.md:35` 的链接承诺与实测行为一致。
- 没有 FAIL 项：门禁没破、没引入回归、实施报告（`CHANGELOG` 的措辞）与实际行为一致。
- UNVERIFIED 8 条是环境/真机类（假 FSA 无权限模型、无 IME 自动化、不重打包、无读屏软件），见 §9。**不写成通过。**

---

## 1. 门禁（命令与真实输出）

### 1.1 `npx tsc --noEmit`

```
TSC_EXIT=0
```

### 1.2 `npm test`

```
EXIT=0
files=21 pass=272
ℹ fail 0   （21 个测试块每块都有一行 fail 0）
```

- 与计划 §1/T4 验收 1 一致：21 个测试块、272 条。新挂进去的 3 个文件（`settings` / `prompt` / `katexLazy`，共 12 条）都在里面且是绿的。
- 对比第 30 轮 18/260：+3 文件 +12 条，没有删改任何既有测试。

### 1.3 `npm run roundtrip`（本轮改了编辑器按键与链接点击）

```
> node --experimental-strip-types scripts/roundtrip.mjs
报告已写入 docs/roundtrip-report.md
rich: 5/7 完全保真
  ok   01-obsidian-note.md  -0 +0
  ok   02-table.md  -0 +0
  ok   03-footnotes.md  -0 +0
  diff 04-reference-links.md  -4 +1  首次保存拦截：2
  ok   05-html-block.md  -0 +0
  diff 06-task-list.md  -0 +1
  ok   07-math.md  -0 +0
source: 7/7 等值；firstSaveBlocked: 1/7
RT_EXIT=0
```

- `git status --short docs/roundtrip-report.md` 无输出（与基线一致，序列化没被本轮改动影响）。

### 1.4 首屏（用根代理最终 build 的 `dist` 实测）

`dist/` 的 mtime **02:00:29** 晚于 `src` 最后修改 **01:56:31**，属于本轮代码的产物，所以按计划 §3.1「若 dist 不旧就跑 dist」直接 measure（我自己没有重复 `npm run build`：并发写 `dist/` 违反 STATE 的构建纪律）：

```
   893343   277733  /assets/index-BARs10TG.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=927127 gzip=284761 files=2 max=286000
gzip 省下 642366 B（69.3%）
PASS
MEASURE_EXIT=0
```

- **284,761 B**，上限 286,000 B，余 **1,239 B**；相对第 30 轮的 284,529 B **+232 B**（T3 的链接赋值 + 列表 Tab 分支 + `ShortcutsDialog` 一行）。
- 计划 §8 要求把实测数字写回 README/CHANGELOG，已写入（见 §7.2）。

### 1.5 保护目录与版本

```
---PROTECTED---    （git status --short release/ dist/ 无输出）
"version": "0.32.1"
---changelog 31---  1   （docs/CHANGELOG.md 有「第 31 轮」）
```

- `git status --short` 只有计划内的改动 + 未跟踪的 `docs/iteration/round-31/`、`shots/round-31/`。

---

## 2. T1 独立复验：删除后撤销 / 改名非当前文档不再切走保存目标

脚本 `.tmp/e2e-r32-tester-undo.mjs 9222`（我自己写的，没复用 builder 的 `.tmp/e2e-r32-undo.mjs`；假工作区用 `.tmp/r30-fsa.mjs`）。**21 条断言 21 PASS，退出码 0**。原始关键行：

```
PASS | S1 打开甲后标题/正文是甲 | {"name":"甲.md","editor":"甲 / 甲的正文。"}
## S1 after delete {"name":"乙.md","dirty":false,"selected":["示例文集/乙.md"],...,"editor":"乙 / 乙的正文。","toast":"已移到回收站：甲.md"}
## S1 after undo {"name":"乙.md",...,"selected":["示例文集/乙.md"],"editor":"乙 / 乙的正文。","toast":"已恢复 甲.md"}
PASS | S1 撤销后 __slState.name 仍是乙 | 乙.md
PASS | S1 撤销后树高亮只有乙 | ["示例文集/乙.md"]
PASS | S1 撤销后正文仍是乙 | 乙 / 乙的正文。
## S1 甲.md "# 甲\n\n甲的正文。\n"
## S1 乙.md "# 乙\n\n乙的正文。【安全探针】\n"
PASS | S1 ★ 甲.md 字节未被覆盖 | "# 甲\n\n甲的正文。\n"
PASS | S1 乙.md 含新输入 | "# 乙\n\n乙的正文。【安全探针】\n"
## S2 after rename {"name":"甲.md",...,"selected":["示例文集/甲.md"],"editor":"甲 / 甲的正文。","toast":"已刷新：新增 1 个，消失 1 个"}
PASS | S2 改名非当前文档后 __slState.name 仍是甲 | 甲.md
PASS | S2 改名后树高亮仍是甲 | ["示例文集/甲.md"]
## S2 丙二.md "# 丙\n\n丙的正文。\n" ## S2 甲.md "# 甲\n\n甲的正文。【改名探针】\n"
PASS | S2 ★ 丙二.md 字节未被覆盖 | "# 丙\n\n丙的正文。\n"
PASS | S2 甲.md 含改名探针输入 | "# 甲\n\n甲的正文。【改名探针】\n"
## S3 甲二.md "# 甲\n\n甲的正文。【改名探针】【当前改名】\n"
PASS | S3 甲二.md 含新输入 / 旧 甲.md 不存在 | ["乙.md","丙二.md","甲二.md"]
## errors []
PASS | 全程 console error = 0 且 pageerror = 0 | []
## SUMMARY pass=21 fail=0 total=21
```

- 覆盖了计划 §3.2 要求的三条：删除当前文档→撤销→输入→保存后 `甲.md` 字节不变；改名非当前文档后树高亮与 `__slState.name` 一致、被改名文件字节不变；`console error 0`。另外补了 S3（改名**当前**文档仍写新路径）与「树里又有甲.md」。
- 证据截图：`shots/round-31/tester-undo-safe.png`（画面：标题 `乙.md`、树里 `甲.md` 与 `乙.md` 并存、`乙.md` 高亮、正文是乙的正文 + 【安全探针】、状态栏「已自动保存」）。
- 计划 §7 的 `shots/round-31/r31-undo-safe.png` 我也核对了内容：同样是撤销后 `乙.md` 高亮 + 「已自动保存」，与验收一致。

## 3. T2 独立复验：字数明细七行口径 + 面板焦点

脚本 `.tmp/e2e-r32-tester-stats.mjs 9222`，样例正文 `中文正文 abc⏎第二段结束。`（我自己键入，不走假工作区）。**14 条断言 14 PASS**：

```
## doc "中文正文 abc / 第二段结束。"
## panel {"dtFirst":["中日韩字","拉丁词","合计","字符","句","段","阅读"],
          "ddFirst":["9","1","10","13","1","1","1 分钟"],
          "ddTitles":["汉字、日文假名、韩文谚文，逐字计，不含标点","按空白与标点切分，连续字母数字算一个词","与状态栏字数一致（中日韩字 + 拉丁词）","不含空白","按句末标点与换行切分","空行分段的段数","按 300 字/分钟估算"],
          "dtLast":["选区"],"dtCount":8,"activeClass":"stats-detail","role":"dialog","label":"字数明细",
          "footnote":"合计 = 中日韩字 + 拉丁词，与状态栏一致；字符数不含空白；阅读时间按 300 字/分钟估算。"}
PASS | T2 前四项值 9 / 1 / 10 / 13
PASS | T2 中日韩字 ≠ 合计 | 9 vs 10
PASS | T2 合计 = 中日韩字 + 拉丁词 | ["9","1","10"]
PASS | T2 打开后焦点在面板 | stats-detail
## after esc {"open":0,"activeClass":"stats-trigger"}
PASS | T2 Esc 后焦点回状态栏字数按钮 | stats-trigger
PASS | T2 console error = 0 且 pageerror = 0 | []
## SUMMARY pass=14 fail=0 total=14
```

- 计划 §3.3 的每一条都对上：第一段 `<dl>` 七项顺序、第二段是「选区」、共 8 个 `dt`、值 9/1/10、`中日韩字 ≠ 合计`、焦点进面板、Esc 回触发按钮。
- 「句 / 段」两行我按计划**没有锁值**（编辑模式取文口径是已知问题，登记 §5），只断言非空：实测 `1 / 1`。
- `dd title` 口径文案与计划 P2-5 一致（含「假名」「谚文」），不再出现「汉字」口径错误的标签。
- 证据截图：`shots/round-31/tester-stats-rows.png`；计划 §7 的 `r31-stats-rows.png` 内容也对（七行 + 选区行 + 焦点环）。

## 4. T3 独立复验：点链接就地编辑 / 列表 Tab·Shift+Tab

脚本 `.tmp/e2e-r32-tester-keys.mjs 9222`。**18 条断言 18 PASS**。按审查 P1-1 写死的顺序 3a→3b→3c→3d 执行，没有调换：

```
PASS | T3 链接在正文里渲染成 <a> | 1
## link-editor {"open":true,"text":"例子","href":"https://example.com/page","active":true}
PASS | T3 点链接后浮层出现 / 文字=例子 / 地址=https://example.com/page / 输入框获焦
PASS | T3 Escape 后浮层消失
PASS | T3 点链接不新开标签页 | 1 -> 1
PASS | T3 Ctrl+K 仍弹出链接浮层 | 1
## 3a list depth {"beforeSink":0,"afterSink":1}
PASS | 3a 列表第二项 Tab 后 li>ul = 1
## 3b source "- 项目一\n  - 项目二\n"
PASS | 3b 源码里有缩进行「  - 项目二」
PASS | 3b 源码里没有行尾双空格（项目二  \n）
PASS | 3c 源码回车编辑后 li>ul 仍为 1 | 1
## 3d list depth {"nestedCount":1,"afterLift":0}
PASS | 3d Shift+Tab 后 li>ul = 0
## table {"cells":["一格","二格","\n",...],"focusedInTable":true}
PASS | T3 表格内 Tab 跳到下一格（两格各一格） / 焦点仍在表格里
## skip {"emptyState":"","skip":{"cls":"skip-link","tag":"A","text":"\n"}}
PASS | T3 空文档开头 Tab 焦点到 .skip-link / 不插入空格
PASS | T3 console error = 0 且 pageerror = 0 | []
## SUMMARY pass=18 fail=0 total=18
```

- 链接那组按计划 §3.4 验了两个输入框的值，且**不新开标签页**（`ctx.pages()` 1→1）。
- 列表 3b 用的选择器是 `textarea.source-editor`（不是泛 `textarea`），源码值为 `- 项目一\n  - 项目二\n`：缩进是两个空格，无行尾双空格，与 `App.tsx:735` 的 `indentation: {style:'space', size:2}` 一致。
- 3d 先 `page.locator('.ProseMirror li li').click()` 把焦点放回正文再 `Shift+Tab`（计划风险 6 的 R7：从源码回编辑后 `document.activeElement` 是 `body`，不点会假红）。顺序改了会在正确实现上必红，这里没有改。
- 回归项：Ctrl+K、表格 Tab、文档开头 Tab → `.skip-link` 都还是原行为。
- 证据截图：`shots/round-31/tester-link-editor.png`、`shots/round-31/r31-link-editor-fixed.png`（浮层「文字/地址」两框有值）、`r31-list-tab-fixed.png`（源码框里 `  - 项目二` 缩进可见）。
- `README.md:35`「点正文里的链接会贴着元素弹出编辑框」与实测一致：链接部分**没有砍单**，不存在假承诺。

## 5. 回归：键盘全量 + 文档/依赖断言

### 5.1 `keyboard-acceptance`（最后跑，脚本结尾会 `browser.close()`）

```
$env:SIDELIGHT_CDP='http://127.0.0.1:9222'
node scripts/keyboard-acceptance.mjs http://localhost:5175
...
PASS 表格 Tab 走格不插空格 (0->1)
PASS Ctrl+Shift+1 切大纲 (1)
PASS 一次 notice 只有一个 live region (1)
49/49 PASS
KB_EXIT=0
```

- 跑完按 AGENTS §3 执行 `git checkout -- shots/round-05/` 还原被覆盖的 3 张历史截图（该命令退出码 0，`git status` 里 `shots/round-05/` 无改动）。

### 5.2 T4 的文案与依赖断言

| 断言 | 实测 |
| :--- | :--- |
| `npm ls @tiptap/extension-strike --depth=0` | `sidelight@0.32.1 └── @tiptap/extension-strike@3.34.0`（直接依赖，不再只是 starter-kit 的缩进子层） |
| `git diff --stat package.json package-lock.json` | `package.json` +2/−1（依赖一行 + test 串）；`package-lock.json` +1（根 dependencies 一行），无重排 |
| README「21 个文件、272 条断言」 | `README.md:115` 1 处命中，数字与 `npm test` 实测一致 |
| README「21 个测试文件挂进 npm test」 | `README.md:152` 1 处命中 |
| README「示例工作区」 | 0 命中（`README.md:28` 已改成真实入口） |
| `packaging/README.txt`「同目录的 README.md」「待产品负责人确认」 | 各 0 命中 |
| `docs/CHANGELOG.md`「第 31 轮」 | 1 处命中 |
| `package.json` 的 `version` | 仍是 `0.32.1`（计划要求不 bump） |
| `git status --short release/ dist/` | 无输出 |

## 6. 模块新鲜度（AGENTS §8 的陈旧模块坑）

按计划 §T1 步骤 6 与 T2 步骤 5 的等价断言，用 dev server 实际交付的转换后模块核对（ASCII 标记避免中文编码干扰）：

```
APP_has_guard=True                 # fileRef.current?.path === rebound.path
APP_has_sink=True                  # sinkListItem
APP_has_openLink_assign=True       # openLinkRef.current = 
has_panelRef=True  has_tabIndex=True  has_totalDual=False
```

- `StatsDetail.tsx` 的转换后模块里 `const rows = [["ä¸­æ¥é©å­—",...` 七个数组元素齐全（控制台按 ANSI 显示 UTF-8 造成乱码，内容本身正确）。**dev server 交付的是本轮新模块，不是第 29 轮那种中间版本。**

## 7. 收尾改动（tester 按角色规则做的）

### 7.1 判定与文档

- `docs/CHANGELOG.md`：把「首屏 gzip 仍 ≤286,000」改成实测 **284,761 B（余 1,239 B，比第 30 轮 +232 B）**。
- `README.md:97`、`:99`：首屏数字从 284,529 B / 余 1,471 B 改成 **284,761 B / 余 1,239 B**（历史轮次数字不追溯改）。
- `AGENTS.md`：§3 测试条数注释 → 21 文件 272 条；§6 当前状态（测试数、首屏数字、字数明细口径、链接点击、列表 Tab）；§8 新增两条真实新坑（PowerShell 中文正则、`keyboard-acceptance` 覆盖 round-05 截图）。
- `docs/iteration/STATE.md`：轮次表补第 30、31 轮两行（第 30 轮此前漏记）、当前版本与体积段落、下一轮建议。
- `package.json` 版本不动（本轮不发版）；不 push、不改 `release/`。

### 7.2 计划外的两处文档事实修正（本轮顺手，不涉及产品代码）

1. `STATE.md:24` 的「当前 16 个文件 205 条」是第 13 轮的数字，已改 21 文件 272 条。
2. `STATE.md` 轮次表缺第 30 行（第 30 轮收尾漏记），已按 `docs/iteration/round-30/test.md` 与 commit `5b36b71` 补上。

## 8. 与计划的偏差

| 计划写 | 实际 | 影响 |
| :--- | :--- | :--- |
| tester 端口 9224 | 用调度提示的 **9222**（plan §2 自己写明以此为准） | 无；builder 与 tester 不并发，9222 无冲突 |
| §3.1 `node scripts/measure-first-screen.mjs --dir dist` | 照做（dist mtime 02:00:29 新于 src 01:56:31） | 无 |
| §3.2 要求「自己写脚本，至少覆盖三条」 | 写了 21 条断言，多补 S3 与「树里又有甲」 | 无 |
| §3.5「49 条应全 PASS」 | 49/49 | 无 |
| 计划 §7 截图清单 5 张 | 5 张都在，逐张看过内容 | 无 |

- 没有砍单生效：T3 的链接部分做了，`ShortcutsDialog` 一行也做了，`README.md:35` 不用改回「点链接无反应」。

## 9. UNVERIFIED（不得当成通过）

| 项 | 为什么测不了 | 怎么补 |
| :--- | :--- | :--- |
| 真实目录句柄上的「删除 → 撤销 → 保存」与「改名非当前文档 → 保存」 | 假 FSA 没有权限模型，`move()` 分支总被走到；我的 e2e 只证明身份/保存目标接线正确 | 真机手测：真实文件夹里删当前文档→撤销→输入→保存；再改一个非当前文件的名字→输入→保存 |
| 打字后 2 秒内点「撤销」时乙的自动保存被取消（计划风险 2，既有行为） | 需要真人节奏 | 手测：在乙里输入后立刻撤销，确认关窗仍提示未保存 |
| 真实中文输入法下的 Tab / 链接点击 | 无 IME 自动化（AGENTS 未验清单已有） | 真机手测：拼写组合中按 Tab、点链接 |
| 列表嵌套的**存盘字节**（`Ctrl+S` 后文件里是 `  - 项目二`） | 本轮只断言源码文本与 DOM 重解析（3b/3c）；假工作区存盘断言不在本轮脚本 | 下一轮加 `fixtures/markdown/nested-list.md` 让往返门覆盖，并在假工作区断言 `Ctrl+S` 后的字节 |
| 点链接打开系统浏览器 | 本轮只做就地编辑，宿主未改 | 宿主轮实现后手测 |
| 源码模式选区计数（计划 §5 本轮不做） | 本轮不做 | 下一轮与「句/段」取文口径、状态栏选区 chip 一起做 |
| 屏幕阅读器实录（面板焦点只验证了 `document.activeElement`） | 没有 NVDA / VoiceOver | 真机读屏一次字数明细面板 |
| 安装包增量（本轮不重打包） | `release/` 不动、不跑打包 | 下一轮发版打包后对比 824,209 B |

## 10. 结论与下一轮优先

- **PASS-WITH-UNVERIFIED**：门禁全绿，四任务交付与计划一致，53 条独立断言 + 49 条键盘回归全过，未发现回归。
- 下一轮优先（与计划 §5 一致，按优先级）：
  1. 编辑模式「句 / 段」取文口径（`doc.textContent` 无块分隔符，实测两段算 1 段）+ 源码模式选区 + 状态栏选区 chip（三件都在 `openStatsDetail` / `onSelectionUpdate` 一处）。
  2. Mermaid 懒加载实测 + ADR（163 KB gzip 与首屏余量 1,239 B 的账）。
  3. `fixtures/markdown/nested-list.md` + 假工作区存盘字节断言（补本轮 UNVERIFIED 的那半）。
  4. 真实文件夹句柄上的删除撤销 / 改名后保存（真人手测一次）。
  5. 文档过期项：`docs/typora-gap.md` 的大纲行与 26 有 / 17 缺计数。
