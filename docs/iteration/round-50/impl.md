# 第 50 轮执行报告（executor）

- 轮次：round=50、nn=50；报告目录 `docs/iteration/round-50`；轮前 `startSha=6ae9be39ee5007da2ebcdffd636da21675dc6694`
- 收工状态：**未 commit、未 push、未改 `package.json` 的 version、未动 `release/`、未起/重启 dev server、未启动浏览器**。
- 环境：dev server `http://localhost:5175`（既有进程）；CDP **9222**；每段 E2E 前跑 `node .tmp/reset.mjs 9222`。
- 读了：`plan.md`（revision 3）、`plan-review.md`（critic 复审 revision 3，REVISE：2×P2 R50-12/R50-13，**未进计划**，本轮按最小改动落地，见 §4）、`AGENTS.md` 第 4/8 节、`docs/iteration/STATE.md` 相关行。

## 0. 任务状态

| id | 标题 | 级别 | 状态 | 证据 |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | 预览/HTML 导出保留脚注续行 + 导出 Markdown 走保存同一差异门 | P1 | **DONE** | `.tmp/r50-impl-t1.log` 六组全绿、2 张截图 |
| **T2** | 「全部替换」按文本节点批量提交 | P1 | **DONE** | 改前/改后各一轮 `.tmp/perf-round50-replace.json`、`.tmp/r50-impl-t2-{before,after}.log`、批注 PASS |
| **T3** | 排版与点击区 5 条 | P2 | **DONE**（未顺延） | `.tmp/r50-impl-t3.log`、3 张截图 |
| 门禁 | tsc / test / verify | — | **全绿** | 见 §5 |

## 1. 基线（改前）

| 项 | 值 | 出处 |
| :--- | :--- | :--- |
| 分支 / HEAD | `main` / `6ae9be3`（未变） | `git rev-parse HEAD` |
| 首屏 gzip | **294,373 B**（内部 310,000 / 硬线 320,000） | 第 50 轮 `findings-ship.md` §1 |
| 测试 | **32 文件 425 条** | 第 49 轮 `npm test`（本轮改前未重跑，改后实测 33/432） |
| 版本 | `0.32.1`（未 bump） | `package.json` |
| T2 改前读数（本机实测） | 100 KB：`dispatch` **614.7 ms / 4,096 步**、`clickReturnMs` 654.4；1 MB：`dispatch` **46,637.4 ms / 39,936 步**、`clickReturnMs` 47,175.1 | `.tmp/r50-impl-t2-before.log`（`--no-undo`） |

改前基线的正确性列：两档 `docChars0` = 99,334 / 1,022,982，`侧灯0` = `灯0` = 4,096 / 39,936；替换后 `docChars` 95,238 / 983,046；`invariantOk` true、`dengKept` true。`cross`（`Q丙`）与 `mark`（`strong` 1 条含「灯只补光」）改前已绿——它们锁的是旧行为。

## 2. T1（P1）预览/HTML 导出保留脚注续行 + 导出 Markdown 走保存同一差异门

### 改动

1. `src/lib/export.ts:32-70` —— `renderFootnotes` 改成「先切条目、再拼行」：定义行开新条（正则 `/^\[\^([^\]]+)\]:\s*(.*)$/`）、缩进续行（`/^(?: {4,}|\t)\S/`，与 `footnotes.ts:3` 同一套）接当前条、块内空行 `continue`、其余行 `current = null`；`<li>` 内逐行 `escapeHtml` 后用 `<br>` 连接（顺序不能反）。函数签名与两处调用点（`PreviewPane.tsx:62`、`export.ts:187`）不变。
2. `src/lib/export.test.ts` —— **+4 条**（`[^1]: 第一行定义\n    续行接着写` 含 `<br>` 且 `<li>` 1 条；多条各自带续行 `<li>` 2 条；`[label]:` 引用定义的续行不追加；定义 + 空行 + 缩进续行仍算同一条）。既有两条（`:74-79`、`:81-83`）一字未改，跑绿。
3. `src/App.tsx` 的 `exportAs` markdown 分支：用 `activeLosses(originalText, normalizeForBaseline(markdown, originalText), baselineLossesRef.current)` 判一次；有损失时 `setNotice({ persist: true, action: { label: '知道了', onClick: () => setNotice(null) } })`，文案 `已导出 <名>。注意：导出的是改写后的正文——<lossLabels(losses, true)>`；无损失走原来的 `show(...)`。依赖数组加 `originalText`。
4. `src/lib/risk.ts:385-404` —— `lossLabels(losses, forExport = false)`，`forExport` 时把「在保存后」换「在导出后」、「保存时」换「导出时」，去重与顺序不变；`classify` / `activeLosses` 未动。两处既有调用点（`App.tsx:1102`、`:2109`）不传第二个参数，行为不变。
5. `src/App.tsx:2924` 注释「四条保存路径的唯一入口」→「保存路径的统一入口（导出不写盘，走同一判据但只提示）」。
6. `README.md:126` `SHA256SUMS-0.32.1.txt` → `SHA256SUMS-<版本>.txt`；`docs/CHANGELOG.md` 第 50 轮段。

### E2E（`.tmp/e2e-r50-impl-t1.mjs`，CDP 9222，假工作区 4 篇种子；日志 `.tmp/r50-impl-t1.log`）

| 断言 | 实测 |
| :--- | :--- |
| `h-cont.md` 源码框含续行 | `source` = 种子原文（含 `    续行接着写`） |
| `h-cont.md` 预览 `.footnotes li` 计数 **1**、两行都在 | `items: ["第一行定义续行接着写"]`、pane 文本含两行；`liCount:1 / bothLines:true` |
| `h-cont.md` HTML 导出 `<li>` 计数 1、含续行 | `items: ["第一行定义\n续行接着写"]` |
| `h-two.md` 预览 `<li>` 计数 **2**、无「续行」 | `items: ["定义甲","定义乙"]`、`hasContinuation:false` |
| `fn-mid.md` 导出 Markdown：无对话框、Blob 已写出、持久提示含导出口径、6.5 s 后仍在、「知道了」可关 | toast = `已导出 fn-mid.md。注意：导出的是改写后的正文——脚注 [^1] 的定义在导出后会消失（正文还在引用它）`；`noDialog:true`、`persisted:true`、`actionKnows:true`、`closed:true`、`noSaveWording:true` |
| `fn-end.md`（对照）不打扰 | toast = `已导出 fn-end.md`，`noWarn:true`、`noAction:true` |
| 全程 `[role="dialog"]` 计数 0；`console.error` / `pageerror` 0 条 | `## z-errors {"errors":[]}` |

截图：`shots/round-50/impl-t1-preview-cont.png`、`shots/round-50/impl-t1-export-warn.png`。

## 3. T2（P1）「全部替换」按文本节点批量提交

### 改动

1. 新增 `src/lib/replaceRanges.ts` —— `applyReplacements(text, ranges, replacement)`（纯字符串算术，`from < cursor` 防御跳过重叠；注释写清实际契约与产品路径的退回规则）。
2. 新增 `src/lib/replaceRanges.test.ts` —— **3 条**（多区间 + 变短、删除、变长 + 相邻区间），`node --experimental-strip-types` 实跑 3/3。
3. `src/App.tsx:1897-1985` —— `replaceEvery` 重写：
   - 先判**重叠命中**（`matches[i].from < matches[i-1].to`）→ 整单退回旧的逐条路径（**R50-13**，保留今天的语义）；
   - `doc.descendants` 双指针消费升序 `matches`，按文本节点收集 `local` 相对区间；`covered !== matches.length`（跨文本节点）→ 整单退回；
   - **被批注盖住的文本节点**（`annotations.some(a => a.from < nodeTo && a.to > nodeFrom)`）不进分组，改为逐条替换（见 §4 的实测，这是计划没预见的回归）；
   - 反序应用：整节点用 `applyReplacements` 算 `nextText` 后 `replaceWith(…, schema.text(nextText, node.marks))`（空结果用 `delete`），逐条用 `insertText` / `delete`；两者按 `from` 降序统一执行，最后一次 `dispatch` + `focus`。
   - 依赖数组加 `annotations`。
4. `package.json` 的 `test` 脚本末尾追加 `&& node --experimental-strip-types src/lib/replaceRanges.test.ts`（整文件 diff 只这一行；`version` 未动）。
5. `README.md:133/171`、`AGENTS.md:39/72` 按 `npm test` 实测回填（33 文件 432 条；`AGENTS.md:39` 轮次前缀改「第 50 轮记」，并补一项「替换区间」）；`docs/CHANGELOG.md` 第 50 轮段。

### 读数（同一版脚本 `.tmp/e2e-r50-impl-t2.mjs`，改前 `--no-undo`、改后带撤销；JSON `.tmp/perf-round50-replace.json`）

| 档 | 命中 | `dispatch` 改前 | `dispatch` 改后 | 步数改前 → 改后 | `clickReturnMs` 改前 → 改后 | 门槛 | 结果 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| 100 KB | 4,096 | **614.7 ms** | **89.6 ms**（−85.4%） | 4,096 → **1,024** | 654.4 → 96.2 | ≤ 400 ms | PASS（余 310 ms） |
| 1 MB | 39,936 | **46,637.4 ms** | **519.7 ms**（−98.9%） | 39,936 → **1,024** | 47,175.1 → 542.6 | ≤ 2,000 ms | PASS（余 1,480 ms） |

正确性与撤销（改后）：

- `invariantOk`（`docChars === docChars0 − matchCount`）两档 true；`侧灯` 0、`侧` 0、`灯` 与 `灯0` 相等（4,096 / 39,936）；`longtasks` 两档分别 `[111,53]` / `[718,82,102]`（只并列打印）。
- `Ctrl+Z` 一次：100 KB 回到 `docChars 99,334 / 侧灯 4,096`；1 MB 回到 `docChars 1,022,982 / 侧灯 39,936`（`restored:true`）。
- 跨文本节点负例 `跨.md`（`甲**乙**丙` 查 `甲乙`→`Q`）：正文 `Q丙`，`ok:true`（走退回路径）。
- 行内格式 `mark.md`（`甲**侧灯只补光**` 查 `侧灯`→`灯`）：`strong` 计数 1、`strongText`「灯只补光」，`ok:true`。
- 批注回归（`.tmp/e2e-r50-impl-t2-ann.mjs`，复制自第 36 轮脚本、只改 2 个截图路径）：**`## VERDICT PASS`**——替换后 `.annot` 1 条、页边「批注（1 条）」、store 1 条且 `to − from === 2`、`Ctrl+Z` 后正文回原样、批注位置回 `[3,5]`。
- `console.error` / `pageerror`：0 条。

静态接线（R50-8）：

```
git grep -n 'applyReplacements(' src/App.tsx
src/App.tsx:1937:      const nextText = applyReplacements(group.node.textContent, group.local, replacement)
exit=0            ← 改前同一命令 0 命中 / exit 1（critic r3 实测）
git grep -n 'matches.length' src/App.tsx  → 16 行（命令形式自检；改前 12 行）
```

截图：`impl-t2-100kb-replaceall.png`、`impl-t2-100kb-undo.png`、`impl-t2-1mb-replaceall.png`、`impl-t2-1mb-undo.png`、`impl-t2-cross-replaceall.png`、`impl-t2-mark-replaceall.png`、`impl-t2-ann-after-replaceall.png`、`impl-t2-ann-after-undo.png`。

## 4. 计划偏差与计划外修复（重要）

### 4.1 R50-12（critic 复审 P2）已落地：工具栏规则收紧

计划 T3 §步骤 4 写的是给 `.toolbar button` 补 `height: 24px; display: inline-flex; …`，critic 实测这会连带压扁「插入 ▾」下拉的 9 个菜单项（30 → 24 px、标签从左对齐变居中）。本轮改为**新增一条 `.toolbar-group > button` 规则**（`src/styles.css`，紧跟原 `.toolbar button` 规则），原 `.toolbar button` 的 `padding/font-size/color` 不动（菜单项仍继承它们）。实测：11 个触发器全部 24 px；下拉 9 项 **30 px / display:block / justify-content:normal / text-align:left**，与改前一致（见 `## t3-insert-menu`）。

### 4.2 R50-13（critic 复审 P2）已落地：重叠命中退回旧路径

计划 `applyReplacements` 的契约写「调用方保证互不重叠」，但 `findall` 明确**允许重叠**（`find.ts:23/50`，`aaa` 里查 `aa` 得两处），分组路径保证不了。本轮选 critic 的**方案 ①**：`replaceEvery` 先扫相邻命中，有重叠就整单退回旧的逐条路径 → 结果与今天逐字一致，不需要改 `find.ts`、不需要新增单测、`CHANGELOG` 不必记行为变化。`replaceRanges.ts` 的注释改成实际成立的条件（「`from` 升序、互不重叠；重叠按先到先得跳过」+ 说明产品路径会先退回）。

### 4.3 计划没预见：整节点替换会把节点内的批注区间映射塌（发现并修复）

- 现象（首次跑批注回归时）：`批注.md` 全部替换「天空」→「天」后，正文正确（`天很蓝。天很蓝。另一段也有天。`），但 `.annot` 从 **1 → 0**、页边「批注（0 条）」、`.sidelight/annotations/批注.json` 被清空（`store:null`）。诊断脚本 `.tmp/e2e-r50-impl-t2-ann-probe.mjs` 留了改前快照。
- 原因：批注 `from/to` 是**文档位置**（`decorations.ts:57` 的 `Decoration.inline`）；旧路径每条命中一个 `insertText`/`delete`，步长很小，批注区间（`[3,5]`）落在两步之间不动；整节点替换是**一步盖住整个文本节点**（`[1,18)`），区间两端都被映射到同一点 → 塌成零宽 → 被 `renderAnnotations` 的 `from < to` 过滤掉，随后持久化把清空的 store 写回、删除文件。
- 修法（不改批注映射、不碰 `find.ts`）：分组时遍历 `annotations`，**任何与文本节点区间相交的批注**都让该节点退回逐条替换（`singles`），其余节点仍走整节点一步。两档性能读数不受影响（种子文档无批注，仍 1,024 步）。修后批注 E2E **PASS**，替换后批注存 `[2,4]`、`Ctrl+Z` 回 `[3,5]`。
- 代价（如实记录）：**带批注的文本节点仍是老的逐条成本**。1 MB 文档若通篇带批注且命中数万，仍会慢（与今天相同，不是回退）。要再快需在「批注映射」层面动手，不在本轮范围。

### 4.4 其它偏差

- `npm run roundtrip` **未跑**：本轮没动 Markdown 序列化（计划 §6 写「不强制」）。
- T3 没有顺延（计划 §7 允许顺延）：实际完成了 5 条，截图 3 张。
- `AGENTS.md:39` 的测试清单末尾补了「替换区间」一项（计划只要求数字，补一项避免下一个人以为漏跑）。
- 本轮**没有**改 `docs/iteration/STATE.md`、没有回写五份 `findings-*.md`、没有改其它轮次目录。

## 5. 门禁与文档

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（改完 T2 混合路径后又跑一次，仍 0） |
| `npm test` | **33 个文件 432 条，fail 0**（425 + 导出 4 + 替换区间 3；`.tmp/r50-npm-test2.log` 逐文件汇总） |
| `npm run verify` | **PASS**：`total raw=952999 gzip=294913 headroom=25087 files=3 max=320000`、`target=310000 gap=15087`；主 chunk `index-xYcRGlyW.js` 915.27 kB raw / 290.31 kB gzip；CSS 36.93 kB / 7.61 kB gzip |
| 首屏增量 | 294,373 → **294,913 B（+540 B）**，距内部 310,000 余 15,087 B、距硬线 320,000 余 25,087 B |
| 静态对照 | `git diff --stat`：`AGENTS.md`、`README.md`、`docs/CHANGELOG.md`、`package.json`（仅 test 行）、`src/App.tsx`、`src/components/StatusBar.tsx`、`src/lib/export.test.ts`、`src/lib/export.ts`、`src/lib/risk.ts`、`src/styles.css`；未跟踪：`src/lib/replaceRanges.ts`、`src/lib/replaceRanges.test.ts`（+ 本轮报告目录与截图） |
| 版本 | `package.json` 的 `version` 未变（`0.32.1`） |

文档回填（按 `npm test` 实测，不写预计值）：`README.md:133`「32 个文件、425 条断言」→「33 个文件、432 条断言」；`README.md:171`「32 个测试文件」→「33 个测试文件」；`AGENTS.md:39`「第 49 轮记 32 个文件、425 条」→「第 50 轮记 33 个文件、432 条」；`AGENTS.md:72`「测试 32 个文件 425 条」→「测试 33 个文件 432 条」。

## 6. T3（P2）排版与点击区（改前 → 改后，`.tmp/r50-impl-t3.log`）

| # | 改前（findings-ui / 复审实测） | 改后实测 | 判据 |
| :--- | :--- | :--- | :--- |
| U1 | `h4` 与 `strong` 同形：17 px / 700 | `h4` **18.36 px / 600** / 行高 26.62；`strong` 17 px / 700 | 不再逐项相等、h4 ≥18、600 ✅ |
| U2 | h2/h3 行高继承 1.95；两行 H2 行盒间隔 44 px | h2 行高 **30.294/22.44 = 1.35**；h3 **1.4**；h4 **1.45**；h1 仍 1.35；两行 H2 间隔 **30.29 px** | ≈1.35/1.4/1.45（±0.03）、间隔 ≤32 ✅ |
| U6 | 占位符 16 px `Segoe UI` / 行盒 21 px / `padding: 0 2px` | 占位符与首段同族同号（17 px）、行盒 **33.15 px**、`rect.y` 均 136、`paddingLeft` **0px**、文字起点 x 均 397 | 族/号/行盒/`rect.y` ≤0.5、`paddingLeft === '0px'` ✅（`rect.x` 与文字 x 只打印） |
| U7 | `.stats-trigger` 高 16 px、无 `aria-label` | 高 **24 px**、`aria-label="字数明细"`；状态栏高 28（未变） | ≥24、label 正确、状态栏 ±2 ✅ |
| U9 | 工具栏 21 / 24 / 25 三种高、`</>` 11 px | 11 个按钮全部 **24 px**、`</>` **12 px**、`scrollWidth 1440 = clientWidth 1440` | 23.5–24.5、12px、不换行 ✅ |
| 1024×700 | — | `documentElement.scrollWidth 1024 = clientWidth`、工具栏不换行、字数按钮仍 24 | ✅ |

截图：`impl-t3-hierarchy.png`（h1–h4 + 粗体）、`impl-t3-toolbar.png`（工具栏 + 展开的「插入」下拉）、`impl-t3-placeholder.png`（空稿占位符）。

## 7. 新的踩坑（建议进 AGENTS §8，根代理定）

1. **整节点 `replaceWith` 会塌掉区间装饰**：任何「一步替换整个文本节点」的优化，都会把落在该节点内的 `Decoration.inline` 批注区间两端映射到同一点（零宽后被过滤、随后 store 被清空删文件）。E2E 只看正文文本与字节**测不出来**，必须跑批注存活断言。修法是让含批注的文本节点退回逐条替换（本轮做法），或在批注映射层单独处理。
2. **`page.waitForFunction(fn, { timeout: 10000 })` 的第二个参数是 `arg` 不是 options**：`.tmp/e2e-r36-fix-ann.mjs:73` 就这么写的，超时实际走默认 30 s，报错信息里的 `Timeout 30000ms exceeded` 会把人引到错误的断言上。复用它时先看超时值来源。
3. **`package.json` 用 `JSON.parse`/`JSON.stringify(p, null, 2)` 回写只差目标那一行**（实测 `git diff --stat` = 1 行）：仓库里该文件本来就是 2 空格缩进，不必手工拼串。

## 8. UNVERIFIED（本轮）

- 真实宿主 WebView2 里的预览/HTML 导出脚注与导出 Markdown 的持久提示（本轮全在浏览器态 + 假工作区）。
- 真实磁盘 / 网络盘 / OneDrive 上的「全部替换」响应与写回（dev server + 假 FSA）。
- T2 的 1 MB 门槛在**生产构建**（`npm run build` + 静态服务）下的读数：第 48 轮与本周期的口径都是 dev + StrictMode，生产只会更快，但不作断言。
- 真实中文输入法下的占位符出现/消失（U6 的「键入跳一下」只在无 IME 的 `keyboard.type` 下测）。
- 真实系统 150% / 200% 缩放下的工具栏 24 px 与状态栏点击区（本轮只量 1440 / 1024）。
- 打印 / 另存 PDF 输出下的 h4 与标题行高（本轮未覆盖打印面）。
- **带批注的 1 MB 文档**的「全部替换」耗时（本轮只保证不回退；性能读数来自无批注种子）。

## 9. CHANGELOG 建议条目

已直接写入 `docs/CHANGELOG.md` 的「**第 50 轮（同一未发版区间）**」段（4 条 + 门禁 + UNVERIFIED），与本文 §2–§3、§6 的数字一致。

## 10. 附：本轮新增/改动的 `.tmp` 脚本（不进版本控制）

`e2e-r50-impl-t1.mjs`、`e2e-r50-impl-t2.mjs`、`e2e-r50-impl-t2-ann.mjs`（复制自第 36 轮、只改 2 个截图路径）、`e2e-r50-impl-t2-ann-probe.mjs`（批注塌陷诊断）、`e2e-r50-impl-t3.mjs`；日志 `r50-impl-t1.log`、`r50-impl-t2-{before,after,ann}.log`、`r50-impl-t3.log`、`r50-npm-test2.log`、`r50-verify2.log`；读数 `perf-round50-replace.json`。
