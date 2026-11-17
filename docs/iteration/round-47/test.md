# 第 47 轮 · 独立验收（tester，首次验收）

- 轮次：`round=47`、`nn=47`；轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6`（开工时 `git rev-parse HEAD` 同值）。
- 只读输入：`plan.md`、`git diff`、源码与 `package.json`；**未读 `impl.md`**。E2E 全部自写（`.tmp/tester47-e2e-a.mjs`、`.tmp/tester47-e2e-b.mjs`）。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`；未 push、未改 `release/`。
- 不发版：`package.json` 仍 **0.32.1**。

## 1. 门禁（真实输出）

| 门 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | **exit 0** |
| 测试 | `npm test` | **30 个文件 400 条，0 fail**（日志 `.tmp/tester47-test.log`：30 段 `ℹ tests N` 相加 = 400，30 条 `ℹ fail 0`） |
| 往返 | `npm run roundtrip` | rich **5/7**、source **7/7**；`git status --porcelain docs/roundtrip-report.md` 为空（报告未改） |
| 构建+首屏 | `npm run verify` | **PASS**：`total raw=949553 gzip=293751 headroom=26249 files=3 max=320000`、`target=310000 gap=16249`；主 chunk `index-DVSSfE44.js` 912,306 B raw / 285,826 B gzip（日志 `.tmp/tester47-verify.log`） |

首屏对比：第 46 轮 **293,205 B** → 本轮 **293,751 B**（**+546 B**）。内部线 310,000、硬线 320,000，余 16,249 / 26,249 B。

改动测试文件的条数（逐个文件实跑）：`inlineHtmlTags.test.ts` **10**（新）、`smartTyping.test.ts` **15**（+4）、`mermaidLazy.test.ts` **14**（+2）、`html.test.ts` **24**（2 处期望改值，条数不变）。384 + 16 = 400，与 `npm test` 总数吻合。

## 2. 逐任务验收（从零复验，不用实施者的脚本）

### T1 行内 HTML 白名单渲染 —— 通过

自写假工作区播四篇（`渲染.md` / `实体.md` / `嵌套.md` / `行首.md`），读数来自 `.tmp/tester47-e2e-a.log`：

| 断言 | 实测 |
| :--- | :--- |
| `渲染.md` 编辑视图 `kbd` / `mark` / `sub` / `sup` 计数 | **3 / 1 / 1 / 1**（正文段 1 + 表格单元格 1 + 列表项 1） |
| 围栏里的 `<kbd>` | `preKbd: 0`（不渲染，代码原样） |
| 渲染段（`p0`） | `kbd:1 mark:1 sub:1 sup:1`，`textContent` = `按 Ctrl + Enter，看 重点、H2O、x2。` |
| 字面负例段（`p1`） | `kbd:0`，`textContent` 含 `<kbd class="x">` 与 `单开 <kbd>` |
| 键帽样式 | `border-top-width: 1px`、`border-radius: 4px`、`padding-left: 4px` |
| `mark` 样式 | 背景 `color(srgb 0.921882 0.944627 0.930274)`，文字 `rgb(29, 32, 35)` |
| `Ctrl+/` 源码 | 四组真标签原样：`<kbd>Ctrl</kbd>` ×3、`<mark>重点</mark>`、`H<sub>2</sub>O`、`x<sup>2</sup>`；**0 处** `&lt;kbd>Ctrl`；字面 `<kbd class="x">` 与单开 `<kbd>` 原样 |
| `Ctrl+S` 盘上字节 | **`diskSame: true`**（225 B = 播种 225 B），保存后 `dirty:false` |
| 预览（`Ctrl+Shift+P`） | `mode:preview`、`kbd 3 / mark 1 / sub 1 / sup 1`、`kbd` 边框 1 px |
| 重开文档 | `kbd 3 / mark 1`、`dirty:false` |
| `实体.md`（P1-1 判别，单独一篇不含真标签） | 正文 `kbd:0`、文本是字面 `<kbd>Ctrl</kbd>`；`Ctrl+S` 后 **`diskSame:true`**（`写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。` 未被改成真标签） |
| `嵌套.md`（P2-4 口径 2） | `kbd:0` / `mark:1`、文本 `<kbd>x</kbd>`；**`diskSame:true`** |
| `行首.md`（只作诊断） | 行首 `<mark>` **`mark:1`**（计划里这一条原本是未知项，实际渲染成功），`diskSame:true` |

`consoleErrors: []`、失败请求 `[]`。截图 `shots/round-47/tester47-inline-html-edit.png`、`tester47-inline-html-preview.png`。

Node 侧接线证据（新文件 `src/lib/inlineHtmlTags.test.ts:91-100`）：手搓 doc → `manager.serialize` 得 `按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。`；不注册 mark 的对照是 `按 Ctrl 加 Enter，看 重点、H2O、x2。`（改前红、改后绿）。我复核该文件确为真实断言，不是空转。

### T2 反引号行内代码里的智能标点 —— 通过

`keyboard.type` 打 `参数 `--dry-run` 与 `a...b` 结束`（与 finder 同一串），读数来自 `.tmp/tester47-e2e-a.log`：

- 编辑视图 `code` 元素 = `["--dry-run","a...b"]`；正文文本含 `参数 --dry-run 与 a...b 结束`，**不含** `—dry-run` / `a…b`。
- `Ctrl+/` 源码：`` `--dry-run` `` 与 `` `a...b` `` **原样**（`srcHasDashCode:true`、`srcHasDotsCode:true`、`srcHasEmDash:false`、`srcHasEllipsis:false`）。
- `Ctrl+S` 后盘上 = 源码框逐字节相同：`# 打字\n\n开始参数 `--dry-run` 与 `a...b` 结束\n`。
  - 注：我的脚本里 `diskSame:false` 是**我自己的期望串写错**（我假设「参数」另起一段），盘上串与源码框、与 DOM 完全一致，不是产品问题。
- 回归（普通段落）：打字 `甲 -- 乙` → 正文、源码、盘上都是 `甲 — 乙`。
- 本轮扩到引号组：`` `grep "foo"` `` 在源码与盘上都是半角 `"`，**不含** `“foo”`。
- 截图 `shots/round-47/tester47-smart-typing.png`；`consoleErrors: []`。

### T3 Mermaid 语法错误不残留 `body` —— 通过

读数来自 `.tmp/tester47-e2e-b.log`（1440×900）：

| 步骤 | `[id^="dmermaid-preview-"]` | `body` 含 `Syntax error` | `body.children` | `scrollHeight` |
| :--- | ---: | :--- | ---: | ---: |
| 坏图渲染失败（`.is-error`） | **0** | false | 2 | **900** |
| 切到完全无图的文档 | **0** | false | 2 | 900 |
| 切到好图（`.is-ready`，svg 1 个） | **0** | false | 2 | 900 |
| 切回坏图（错误缓存命中） | **0** | false | 2 | 900 |

finder 的改前基线是页高被撑到 **1013 px**，本轮回到 **900 px**（= `window.innerHeight`）。坏图提示仍是中文一句「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」（不是静默丢错）。切回坏图 `dirty:false`。截图 `shots/round-47/tester47-mermaid-error.png`、`tester47-mermaid-error-back.png`；`consoleErrors: []`。

### T4 工作区插图后立刻显示（补第 38 轮 UNVERIFIED） —— 通过

读数来自 `.tmp/tester47-e2e-b.log`：

- 插入前 `img` 0 → 插入后 **1** 个；`src` 前缀 `blob:`；`naturalWidth/naturalHeight = 1/1`、`complete:true`。
- 假盘写盘是**字节**而不是文本：键 `assets/mwks4x5c-shot.png`，值 `data:image/png;base64,…`（118 B），解码前 8 字节 = `89504e470d0a1a0a`（PNG 魔数）✓。
- `Ctrl+S` 后 `.md`：`![shot.png](assets/mwks4x5c-shot.png)\n\n# 图\n\n一段正文。\n`——写相对路径，**不含** `data:image`，`dirty:false`（图片插在光标处即文首，属既有插入语义，不是本轮缺陷）。
- 切走（`无图.md`）再切回：`img` 仍 1 个、`naturalWidth:1`、`complete:true`、`src` 仍 `blob:`。
- 截图 `shots/round-47/tester47-image-insert.png`、`tester47-image-reopen.png`；`consoleErrors: []`、失败请求 0。

## 3. 静态对照（改前 = `d429211`，用 `git grep <pat> d429211 -- src`；改后见 §8 的提交后计数）

| 模式 | 改前 | 改后（`git add -A` 之后的 `git grep --cached -n <pat> -- src`） |
| :--- | ---: | ---: |
| `escapeInlineHtml` | **0** | **6**（`inlineHtmlTags.ts` 定义与注释、`html.ts` 的 import 与 `mapOutsideCode(text, escapeInlineHtml)` 接线、测试两处） |
| `hasUnclosedBacktick` | **0** | **9**（`smartTyping.ts` 定义 + 守卫 + 注释、测试 6 处） |
| `suppressErrorRendering` | **0** | **4**（`mermaidLazy.ts` 的 `initialize` 实参 + 注释、测试断言、测试标题） |
| `removeMermaidContainer` | **0** | **6**（定义、`finally` 调用、注释、测试 3 处） |
| `&lt;kbd>Ctrl`（`html.test.ts`） | **2**（改前 `:49`、`:136` 的旧期望） | **0** |
| `inlineKbd` | 0 | **2**（`src/lib/inlineHtmlTags.test.ts:78`、`:98` 所在 doc；mark 名由 `INLINE_HTML_TAGS` 计算生成，计划写的「≥3」口径不适用） |

`inlineKbd` 这一条按计划的字面口径算**不成立**（实现用 `'inline' + tag[0].toUpperCase() + tag.slice(1)` 生成名字，`src/` 里没有 `inlineKbd` 这个标识符，字面量只出现在新测试的 doc 里）。但计划的**目的**是「证明 mark 接线生效」，这一点由 §2 的 `manager.serialize` 判别性单测（注册 vs 不注册两条相反结果）+ E2E 的 `kbd` 计数双重成立，属于计划口径偏差，不是产品缺陷。其余五条与计划的预期方向和量级一致。

## 4. 计划偏差（逐条查证，均非缺陷；须记进 STATE.md 的下一轮优先）

1. **T2 的 `lineBefore` 取数范围**：计划写「`inserted === '-' || inserted === '.'` 时取」，实现改成新函数 `needsLineContext`（引号、括号、`- . , ; : ? !`、反引号共 16 个键）。行为已复验：反引号内引号不被改写（§2 的 `"foo"`），普通段落 `--` 仍替换，`npm test` 全绿；代价是这几个键各多一次段落级 `textBetween`（只在本段内）。
2. **T1 的 `escapeInlineHtml` 多了「空内容不还原」守卫**（`src/lib/inlineHtmlTags.ts:28` 的 `if (!/\S/.test(inner)) return whole`）：计划没写。效果是 `<kbd></kbd>` 与 `<kbd> </kbd>` 退回转义、保存仍逐字节不变（我实测 `渲染.md` 的 `diskSame:true` 里就含空对标签）。这是为了避免空文本节点丢字节，方向正确。
3. **T4 的假盘二进制分支只认「Blob 且 MIME 非 `text/*`」**（`.tmp/r30-fsa.mjs:50`），计划的写法是「遇到 Blob 就按字节存」。原因写在该文件注释里：trash 的删除/撤销走 `ArrayBuffer`，全改会让旧 E2E 假红。属测试基建的保守实现，不影响本轮断言（112 B PNG 走 Blob 分支，魔数已验）。
4. **T1 的 mark 名是计算生成**（见 §3），计划里的静态计数口径不适用。
5. **T3 的 `body.children` 恒为 2**：本轮坏图/好图切换全程 `2`，说明没有额外挂载容器；计划的 `scrollHeight <= innerHeight + 1` 断言成立（900 ≤ 901）。

## 5. 回归

- `npm run roundtrip`：rich **5/7**、source **7/7**（与第 46 轮相同），`docs/roundtrip-report.md` 无 diff——本轮改了 `escapeHtmlForParse` 的输入，但保存链字节未漂移。
- `npm test`：400 条全过，含第 41 轮的 `<` `>` `&` 保真（`html.test.ts` 24 条、`escapes.test.ts`、`risk.test.ts`、`tableCellBreaks.test.ts`）与 `serializeDocument` 10 条。
- `scripts/keyboard-acceptance.mjs`：见 §7（键盘输入规则是本轮 T2 的落点，故跑这条）。
- 断言实测值见 §2 各表；未发现回归。

## 6. UNVERIFIED（写清哪条、为什么、怎么补）

1. **真实宿主（WebView2）里的行内 HTML 渲染**：本会话是非交互沙箱，宿主窗口起不来。补法：交互式会话跑 `host-smoke` 并打开含 `<kbd>` 的文档截图；预期与本轮浏览器读数相同（同一份 `dist`）。
2. **真实中文输入法下的反引号行内代码**：E2E 用 `keyboard.type` 的 ASCII 注入，组合输入态时序未验。补法：真机 IME 打 `` `中文--` `` 并读源码。
3. **HTML 导出里的 `<kbd>` 观感**：导出与预览同源（`editor.getHTML()`），本轮只断言了预览面板与源码，未导出文件逐字节比对样式。
4. **混排文档（真标签 + 字面实体）的字节变化**：`repairHtml` 的 `source.includes('<kbd')` 守卫导致，改前改后同值，非本轮引入（计划 §T1 风险已授权不动）。
5. **宿主/真机上的图片插入**：只验到浏览器 + 假盘（§2 T4），真实工作区磁盘未验（第 38 轮同类 UNVERIFIED 的剩余部分）。

## 7. 判定

**PASS-WITH-UNVERIFIED**。四条计划任务（T1–T4）全部从零复验通过，门禁全绿，无回归；UNVERIFIED 见 §6（都是本会话测不了的宿主/真机面，不是产品缺项）。

收尾：`docs/CHANGELOG.md` 的 `## Unreleased` 第 47 轮条目已由实施侧写入，我逐条复核与实测**一致**（30 文件 400 条、首屏 293,751 B、rich 5/7 + source 7/7、T1 四篇读数、T4 魔数）；`README.md` / `AGENTS.md` 的城市体积数字本节已按实测订正（293,751 B / 余 26,249 B），历史增量链保留；`docs/iteration/STATE.md` 补轮次行、当前体积段与下一轮优先。

## 8. 提交

- 提交信息：`round-47: 行内 HTML 白名单渲染 + 行内代码智能标点守卫 + Mermaid 错误图清理`
- 提交后 `git status --porcelain` **为空**（不含未跟踪文件）；`git rev-parse HEAD` 与轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6` **不同**（本轮 HEAD 见 `git rev-parse HEAD` 与 `STATE.md` 第 47 轮行；不把哈希写死在本文件，避免 amend 自引用）。
- 未 push、未建 Release、`release/` 未改。
