# 第 41 轮 · 独立验收报告（tester，首次验收）

- 轮次：round=41，nn=41；报告目录 `docs/iteration/round-41`。
- 轮前 `startSha=25297acee40d40fec4bcbe770c416f43faaf2d7a`（本机 `git rev-parse HEAD` 实测相同）。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9222**；每次 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 push、未碰 `release/`。
- 读过的输入：`plan.md`（revision=2，1–263 行）、`plan-review.md`（164 行）、`git diff`（11 个已改文件 + 新 `src/lib/risk.test.ts`）。**未读 `impl.md`**（角色要求）。
- 判定：**PASS-WITH-UNVERIFIED**（门禁全过、三个任务的验收标准逐条复验通过；未验清单见 §6，已知限制见 §7）。

## 一、门禁（本机真实输出）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit **0**，无输出 |
| `npm test` | exit **0**，**28 个文件 362 条，0 fail**（按 `ℹ tests`/`ℹ fail` 行汇总：`summaryLines=28 totalTests=362 totalFail=0`） |
| `npm run roundtrip` | rich **5/7**、source **7/7**（与第 40 轮一致；diff 的两条仍是 04 引用式链接定义、06 task list 空行） |
| `npm run verify` | **PASS**；`total raw=941412 gzip=291317 headroom=28683 files=3 max=320000`、`target=310000 gap=18683`；主 chunk `index-BEnc5Cau.js` 905,637 B raw / 283,613 B gzip |
| 首屏增量 | 290,723 → **291,317 B**（+594 B）：内部预算 310,000 余 18,683 B、硬线 320,000 余 28,683 B |
| 控制台 | T1/T2/T3 三个 E2E 脚本都输出 `## errors []`（0 console error、0 pageerror） |

`package.json:15` 的 `scripts.test` 现在是 28 条 `node --experimental-strip-types`（新增末条 `src/lib/risk.test.ts`），`npm test` 实测 28 个文件。

## 二、T1 复验（正文/代码里的 `<` `>` `&` 保存后不再写成实体）

脚本 `.tmp/e2e-r41p-t1.mjs after`（假 FSA 工作区，逐个文件「打开 → `Ctrl+S` → 读回写入字节」），日志 `.tmp/tester-r41-t1.log`。

- **计划 §二 的 8 条对照：7 条 `same:false` → 7 条 `same:true`**（`c1` `a<b`、`c2` `a < b`、`c3` `x<3`、`c4` `A & B`、`c5` `a > b`、`c6` 围栏 `if (a<b)`、`c7` 行内代码 `` `<kbd>` ``）；`c8` 字面实体 `写成 &lt;div&gt; 才是字面。` 仍 `same:true`。全部 `dialog:null`（没有提示）。
- **bug-h 四条全 `same:true`**：`h1` 围栏 `<div class="a">x</div>`、`h2` 围栏比较、`h3` 行内 `<kbd>`、`h4` 围栏 kbd。
- **回归种子**：`r1` 注释、`r2` `H~2~O`、`r3` 链接 `?x=1&y=2`、`r4` 公式 `$a < b$`、`r5` 含 `&`/`<` 的表格（整块写回原文）、`r6` 单元格 `<br>`（字节保留 `<br>`）全部 `same:true`。
- **块首守卫（真打字，新文档）**：新建 → 先打「第一行普通文字。」回车 → 打 `>100 人的团队。` → 回车打 `- >100 人` → `Ctrl+S`：写入字节 `第一行普通文字。\n\n&gt;100 人的团队。\n\n- &gt;100 人`，`hasGt:true`、`hasListGt:true`、行首裸 `>` 正则 `/^>/m` = **false**；重新打开后 `.ProseMirror blockquote` = **0**、正文含 `>100 人的团队。`（截图 `shots/round-41/t1-block-start.png`）。改前结构对照见 §7 第 3 条。
- 单测口径（我自己跑的门禁，不是转述）：`html.test.ts` 新增/改写的断言覆盖 ①–⑰，含 ⑬ 的 4 条 `&amp;` 前视守卫、⑮⑯⑰ 三条多行位置算术；`risk.test.ts` 3 条（围栏注释不报损失 / 真注释不报损失 / 真丢注释仍拦且 label = 「HTML 注释的写法会被改动」）。
- **两条 `same:false` 逐条判**（`SUMMARY total=20 same=18`）：
  1. `r7-缩进代码.md`：种子 `    四空格 if (a<b)` 保存成 `\n```\n四空格 if (a&lt;b)\n```\n`。这是**改前就有的行为**（载入链对缩进代码仍转义、序列化把缩进代码写成围栏），本轮 `mapOutsideCode` 不认缩进代码，所以字节不变；计划 §T1 第 6 步与 CHANGELOG 都把它写成已知限制，**不算回归**。
  2. `h12-缩进围栏.md`：种子 `     ```\n<div>甲</div>\n     ```\n` 保存成 ` ```\n ```\n```\n\n甲\n\n \`\`\`\n`——裸 `<div>甲</div>` 变成 HTML 块、标签丢。**这是 T1 新引入的、plan-review H12 已经预见并授权的已知限制**（H12 修法：「真丢块：本轮不要改 `fenceMap`，写已知限制 + 下轮」）。CHANGELOG 的 UNVERIFIED 段已写明，本轮判为已知限制、不是计划外偏差，但**必须进下一轮优先项**（见 §8）。
- 截图：`shots/round-41/t1-fence-before.png`、`t1-fence-after.png`、`t1-code-html.png`、`t1-prose-amp.png`、`t1-block-start.png` 都在。

## 三、T2 复验（对话框开着时自动保存不写盘）

脚本 `.tmp/e2e-r41p-t2.mjs`（`node .tmp/reset.mjs 9222` 后跑），日志 `.tmp/tester-r41-t2.log`，6/6 段断言通过：

| 段 | 实测 |
| :--- | :--- |
| `## i0` | 对话框文本「这篇还有没保存的改动…取消\|不保存\|保存并切换」，`dirty:true`，`甲.md` 仍是种子 |
| `## i1`（2.6 s 后） | `dialogStillOpen:true`、`dirty:true`、`bytes` 仍等于种子（**没有写盘**） |
| `## i2`（点「不保存」） | `甲.md` 字节等于种子、`未命名.md` 不存在（`bytesNew:null`） |
| `## t2-cancel-resumes`（点「取消」） | 对话框关闭，`甲.md` **含**「取消后该恢复的一句。」、`dirty:false` —— 自动保存确实恢复 |
| `## t2-saved-and-switch` | `甲.md` 含新句子、`dirty:false`、当前文档切到 `未命名.md`（显式保存没被拦死） |
| `## t2-settings-open` / `t2-settings-closed` | 设置开着 2.6 s：`甲.md` **不含**「设置开着不该写的一句」；关掉设置再等 2.6 s：**含**（恢复） |

截图：`shots/round-41/t2-dialog-blocked.png`（对话框开着）、`t2-after-discard.png`。

## 四、T3 复验（查找的「区分大小写 / 整词」）

脚本 `.tmp/e2e-r41p-t3.mjs`，日志 `.tmp/tester-r41-t3.log`，种子 `# State\n\nstate 与 STATE，还有 states。`，查 `state`：

- 默认 `1 / 4` → 只按 `Aa` `1 / 2` → 再按 `ab` `1 / 1` → 再关 `Aa`（只剩整词）`1 / 3` → 再关 `ab` `1 / 4`。**与 plan-review H3 的实测口径一致**（`findAll` 是子串匹配，`caseSensitive` 不做词边界；没有为了让断言变 `1 / 1` 去改产品）。
- 按钮 `aria-pressed` 与 `.is-on` class 同步翻转（`pressed:"true"/"false"`、`on:true/false`）；按钮序 `["Aa","ab","↑","↓","✕","替换","全部替换"]`。
- 查 `zzz` → `.find-count` 严格 `无结果`，`↑`/`↓` disabled。
- `Esc` 只关查找：`findBar:false`、`active` 含 `ProseMirror-focused`、`mode:"edit"`（第 35 轮行为不回归）。
- 纯中文查询在整词开关下 `1 / 1`（不因没有词边界而失配）。
- 截图：`shots/round-41/t3-find-before.png`、`t3-find-toggles.png`。

## 五、回归

- `npm test` 28 文件 362 条 0 fail（含既有 find/html/escapes/export/diff/tableCellBreaks/tilde/blankParagraphs 全部用例）。
- `npm run roundtrip` rich 5/7、source 7/7，与第 40 轮逐项一致；`docs/roundtrip-report.md` 跑后 `git diff` 为空（没有额外改动）。
- `npm run verify`（build + 首屏门）PASS，gzip +594 B，仍在内部预算内。
- `scripts/data-safety-acceptance.mjs`（CDP 9222）：**1 条 PASS 后崩在 `locator('.editor')` 30 s 超时**（脚本第 148 行；现场日志 `.tmp/tester-r41-datasafety.log`）。这是 AGENTS §8 已记录的**旧脚本过期选择器**（`.editor` → 现 DOM 是 `.doc-container`/`.ProseMirror`），不是本轮回归；也不排除它遮住了本轮 T2 相关的其余断言，故该套件整体记 UNVERIFIED（§6）。
- 该脚本本次没有写出已跟踪截图（崩溃发生在写盘前），`git status` 只多 `?? shots/round-41/`。

## 六、UNVERIFIED（本轮测不到，写清补测方法）

1. **宿主 `close-request` 下的自动保存拦截**：浏览器态没有 host，`closeRequested`/`closeGuardOpen` 只能靠代码与 E2E 的设置对话框同构验证。补测：`scripts/host-smoke.mjs` 加一条——打开 `CloseGuardDialog` 后等 2.5 s 读 `/__doc`，字节应与触发前相同；再点「放弃并关闭」确认盘上仍是旧字节。
2. **`scripts/data-safety-acceptance.mjs` 全量**：被 `.editor` 过期选择器挡住（AGENTS §8 已知）。补测：把第 148 行的 `.editor` 改成 `.doc-column .ProseMirror`（或 `.ProseMirror`）后再跑，记录通过数；这是脚本修，不是产品改动。
3. **生产包 / 宿主里的同一路径**：`release/` 按纪律未动，未做真机双击与 WebView2 复测。补测：安装后打开含 `a < b`、`A & B`、围栏 `if (a<b)` 的文档保存，逐字节对比。
4. 其余既有未验项（中文 IME、真模型、macOS 真机等）本轮未变，不重复。

## 七、计划偏差 / 已知限制（判据与实测）

1. **`r7` 四空格缩进代码仍 DIFF**：plan-review H11 预测「改后应变 SAME」，实测是 **DIFF 且与改前同字节**（编辑器里 `pre code` 文本就是 `四空格 if (a&lt;b)`）。原因：载入仍转义 + 序列化把缩进代码写成围栏 + `repairHtml` 跳过围栏，所以这一支的解码永远轮不到。**计划原文（plan:112/124「记录实测、仍 DIFF、不算回归」）是对的，H11 的预测不成立**；下一轮若做缩进代码识别，再一起改。
2. **`h12` 缩进围栏 + 裸 HTML 行丢标签**：plan-review H12 授权「本轮不改 `fenceMap`，写已知限制 + 下轮」。已实测丢块（见 §二第 5 条），CHANGELOG 已记，进 STATE 下一轮优先。
3. **块首守卫的改前结构对照没有独立重测**：`>100 人的团队。` 在改前是块首裸 `>` → marked 当引用块，这来自 plan-review 复跑的 `.tmp/critic-r41-marked.mjs`（我没重跑它）。我的实测只证明**改后**写入 `&gt;` 且重开 `blockquote = 0`；「改前会变引用块」是 plan-review 的证据，未独立复跑。
4. **「改前改后字节相同」（`r7`）按代码推理**：改前 `escapeHtmlForParse` 对整篇转义，缩进代码里的 `<` 同样变 `&lt;`，编辑器文本与序列化结果与改后一致；没有 stash 回改前版本重测（会打断本轮工作区）。
5. **混写文档**：同一篇里既写 `&lt;` 字面又写裸 `&` 时，那一类实体整篇保持（plan 已声明为保守规则，不算回归）。`R&D;2026` 这类「`&`+字母+`;`」保持 `&amp;`（前视守卫的已知副作用，重开文本正确）。
6. **不发版**：`package.json` 的 `version` 仍是 0.32.1，CHANGELOG 记在 `## Unreleased` 区间；`release/` 未动。

## 八、给下一轮

1. **`escapeHtmlForParse` 的围栏判定与 marked 不一致**（H12 实测丢标签）：改用 CommonMark 严格围栏判定（≤3 空格缩进、收尾行不带 info string），`fenceMap` 本身同时被 `risk.ts` 往返判定使用，要分开评估。
2. 4 空格缩进代码块里的 `<` `>` `&` 仍被转义（与 finder-ui F1 的 Tab 缩进语义同族，等产品负责人定）。
3. 修 `scripts/data-safety-acceptance.mjs` 的 `.editor` 过期选择器，恢复该套件。
4. 宿主 `close-request` 的自动保存拦截补进 `host-smoke`。
5. 计划 §五 移出的项照旧：1 MB 载入 `lexer.lex` 归因（等产品负责人二选一）、每键整篇序列化、README `:83`/`:101` 两条文案对账、`docs/typora-gap.md` 11→15。
