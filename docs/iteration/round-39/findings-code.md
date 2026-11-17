# 第 39 轮 · 代码质量与性能（finder-code）

- 轮前 startSha：`59a4f933dfd411039c939b1e70d7bbdcd7ed82f8`（本轮只读，未改产品代码）
- 环境：dev server `http://localhost:5175`（沿用，未重启）；CDP 9225（headless Edge 157）；每次 E2E 前 `node .tmp/reset.mjs 9225`
- 样本形态：`scripts/perf-longdoc.mjs` 那套「1 个 1 MB 段落 + 13,000 个软换行」= **单巨段落**；本轮另加**多段落**（空行分隔，≈37,450 段）作真实形态对照
- 结论：**2 条 P1、4 条 P2，共 6 条**。其中第一条推翻仓库既有的「1 MB 载入 1284 ms」基线口径

---

## F1（P1）1 MB 真实形态（多段落）文档载入 219,828 ms，期间渲染进程完全不响应

- 证据：`.tmp/r39-1mb-multi.log`
- 步骤：`localStorage['sidelight.doc.v1']` 写入 1,048,576 字符、37,450 段 → `reload` → 每 2.5 s 用 `page.evaluate` 轮询（每次 10 s 超时）
- 实测：
  - `reload` 62 ms 就返回（domcontentloaded）
  - 之后 **10 次轮询全部 `TIMEOUT(poll)`**，直到 **t+219,828 ms** 编辑器才出现（`pm:true len:973,676`）
  - 控制台错误 **0 条**；`toast` 为空，没有任何进度或「正在打开」提示
  - 正文长度 973,676 + 37,450×2 段间换行 = 1,048,576，与输入一致（不是丢字）
- 对照：同尺寸**单巨段落** 1 MB 载入 392–464 ms（`.tmp/r39-1mb-repro.log`）。所以既有的 1 MB 性能数字全部来自一个 1 MB 的**单段落**，不代表真实文档
- 可达性：5.5 MiB 上限之内（`src/lib/workspace.ts:241`），用户粘贴长文或打开长稿即可命中；表现为窗口「假死」≈3.7 分钟
- 归因未完成（见 UNVERIFIED U1）。候选热点（按调用顺序）：
  - `src/App.tsx:983` `manager.parse(escapeHtmlForParse(protectMathPairs(body)))`
  - `src/App.tsx:985-988` `.replaceWith(0, editor.state.doc.content.size, node.content)`
  - `src/App.tsx:995-1004` `syncDocInfo` → `extractOutline`（`src/lib/outline.ts:18`）+ `countText`（`src/lib/wordcount.ts:47`）
  - `src/App.tsx:2038-2055` 载入后两次全文 `serializeDocument`
- 提案（低风险，先测后改）：
  1. 在 `setMarkdown` 与 `syncDocInfo` 前后各打一个 `performance.mark`，把 220 s 拆成 parse / dispatch / sync 三段（本轮无此埋点，故未归因）；
  2. 若热点是 parse 的**段数**相关项，改用真实形态样本重建 1 MB 基线，并把 `scripts/perf-longdoc.mjs` 的样本生成器改成多段落（该脚本现为单段落，见 `scripts/perf-longdoc.mjs:11-16`）；
  3. 长文载入加一个可见的「正在打开」状态（现在是 0 反馈）。

## F2（P1）1 MB 单巨段落：光标在文末后每次按键阻塞 27.8–29.7 s

- 证据：`.tmp/r39-caret.log`、`.tmp/r39-attribute.log`、`.tmp/r39-mitigate.log`、`.tmp/r39-cv.log`、`.tmp/r39-scrollpos.log`、`.tmp/r39-1mb-part2.log`
- 最小复现（`.tmp/e2e-r39-code-caret.mjs`）：1 MB 单巨段落载入 → 点正文 → 在文首打 3 个字 → `Control+End` → 再打 3 个字
- 实测（文首 vs 文末，同一文档同一个字）：
  | 位置 | 墙钟/键 | 同步 `input` 处理 |
  | --- | --- | --- |
  | 文首 3 键合计 | 652 ms（≈217 ms/键） | 55–250 ms |
  | `Control+End` 本身 | 50 ms | — |
  | 文末第 1/2/3 键 | 27,839 / 29,716 / 29,405 ms | 71–108 ms |
- 归因（`.tmp/r39-attribute.log`，CDP `Performance.getMetrics` 单键差分）：
  - 文首 1 键：墙钟 300 ms，`ScriptDuration` 137 ms，`LayoutDuration` 94 ms，`RecalcStyle` 41 ms
  - 文末 1 键：墙钟 28,032 ms，`TaskDuration` 28,034 ms，而 **`ScriptDuration` 只有 95 ms、`LayoutDuration` 29 ms、`RecalcStyle` 0 ms**
  - 结论：28 s 不是应用 JS、也不是布局/样式，是渲染主线程上的一段非脚本长任务（绘制/无障碍/命中测试一类）
- 触发条件是**编辑位置**，不是视口：把视口滚到文末但光标留在文首，逐键 173–316 ms（`.tmp/r39-scrollpos.log`）
- 已试无效的缓解（只注入样式，不改产品）：`overflow-anchor:none`（29,987 ms）、`contain:layout paint style`（28,947 ms）、`.ProseMirror > * { content-visibility:auto }`（31,064 ms / 29,399 ms）
- 连带后果：一旦在文末编辑过，**退出源码**（`Ctrl+/` 回编辑态，`applySource` 整篇替换）在 >10 分钟内没有返回，进程被杀（`.tmp/r39-1mb-part2.log` 停在 `02:34:34` 的「源码态」一行）；而光标在文首时同一操作 321 ms（`.tmp/r39-src-exit.log`）
- 提案：下一轮先用 `PerformanceObserver({type:'longtask'})` 或 CDP Tracing 把 28 s 落到具体阶段（paint / AX / hit-test）；在此之前**不要**用「加个 `contain`」当结论——本轮实测三种都不行。若确认为 1.28 M px 单层绘制，则要么限制可编辑区高度（分页/虚拟化，风险高），要么在超长文档上给出明确的性能提示（低风险）。
- 复测（排除「遗留页面抢 CPU」这一假因，`.tmp/r39-clean-recheck.log`）：把该 CDP 浏览器里其余 4 个非 localhost 标签页（OneNote、Tampermonkey、Trancy、Adblock 欢迎页）关掉、只留一页后再跑：1 MB 单段落载入 687 ms、文首 1 键 394 ms、**文末 3 键 28,129 / 28,495 / 28,774 ms** —— 数字不变，F2 不是环境噪声

## F3（P2）每个按键做一次全文序列化（含 repair 链与表格复用）

- 代码：`src/App.tsx:884` `contentRef.current().replace(/\r\n/g,'\n') !== baselineRef.current` → `src/App.tsx:2775-2784` `currentMarkdown()` → `serializeDocument`（`src/lib/serializeDocument.ts:48-61`：`getMarkdown` + `repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(...))))` + `reuseTables` + `joinFootnotes` + `joinFrontmatter` + `applyTrailingNewlines`）
- 实测同步 `input` 处理耗时（`.tmp/e2e-r39-code-perf.mjs`，30 键）：10 KB p50 **8.8 ms** / p95 11.1 / max 15.6；100 KB p50 **14 ms** / p95 20.2 / max 36.9；1 MB（文首）55–250 ms
- 写放大：100 KB 文档一次保存+自动保存周期内观测到 2 次 `setItem`、各 109,778 B（见 F5）
- 提案（低风险）：脏判断不必字符串化整篇。保存成功时记下当时的 `editor.state.doc` 快照（或 `contentVersionRef` 的值），撤销回原样时用 doc 级比较/版本号判断，只在实际保存时序列化一次；风险：脏判断口径要从「字节相等」换成「文档结构相等」，需补一条单测（撤销回原样 → `dirty:false`）。

## F4（P2）载入文档时同一份全文序列化算了两遍

- 代码：`src/App.tsx:2038-2055`，`baselineLosses(... serializeDocument(editor, {frontmatter, footnotes, original: text}) ...)` 与 `baselineRef.current = serializeDocument(editor, {frontmatter, footnotes, original: text})` 的入参逐字相同，等于每次载入做两次全文序列化
- 影响：1 MB 单段落载入 392–464 ms 里含两份全文；多段落 1 MB（F1）同样翻倍
- 提案（极低风险，1 处改动）：`const serialized = serializeDocument(...)` 提出来，两处都用它；并补一条断言「载入后 `baselineRef` 与 `baselineLosses` 用的是同一份字符串」

## F5（P2）每次 300 ms 空闲窗口整篇写 localStorage；>256 KiB 直接没有浏览器草稿

- 代码：`src/App.tsx:897-910`（300 ms 派生）→ `persistDocKey`（`src/App.tsx:632-639`）；`text.length > 256 * 1024` 直接 return
- 实测（`.tmp/r39-save.log`，100 KB 多段落）：
  - 键盘 5 键 + `Ctrl+S` → `setItem` 1 次 **109,778 B**（文档 102,400 B 的 1.07 倍）
  - 再 3 键 + 自动保存（3.5 s）→ 又 2 次、合计 219,562 B
  - 保存字节核对：`Ctrl+S` 写入 102,405 B；自动保存写入 102,408 B（含新打的 3 个字），`dirty` 回 `false`
- 提案：写前先比「长度 + 内容指纹」，未变则跳过；或把浏览器侧草稿从 300 ms 挪到与自动保存同节奏（2 s）。风险低，但要保住「关窗能恢复」这条。

## F6（P2）工程卫生：40 个脚本默认指向被禁的 5173；无死代码门；App.tsx 5,278 行

- `scripts/*.mjs` 里 **40 个脚本的默认值**是 `http://localhost:5173`（`Select-String -Path scripts\*.mjs -Pattern "5173"` 42 行命中，去掉 2 行注释后 40 行；40 个文件；含 `scripts/perf-longdoc.mjs:4`、`scripts/shot.mjs:11`、`scripts/acceptance.mjs:5`）。`docs/iteration/STATE.md:36,140` 与 `AGENTS.md` §8 都写明 5173 是旧会话僵尸 server、禁用。新代理直接 `node scripts/perf-longdoc.mjs` 会连僵尸 server 跑旧模块 → 得出假结论（第 29/30 轮已踩过）
- `tsconfig.json` 未开 `noUnusedLocals`。实测死代码：`serializeBody`（`src/App.tsx:185-187`，全仓仅定义处 1 次出现）、`clearSession`（`src/lib/session.ts:55`，全仓 0 处引用）、`serializeDocumentBody`（`src/lib/serializeDocument.ts:39`）只被已死的 `serializeBody` 使用
- `src/App.tsx` **5,278 行**（STATE.md 待办池仍写 4,348 行，第 38 轮后未更新）
- 提案：脚本默认端口统一改 5175（或统一读 `SIDELIGHT_URL` 并要求显式传入）；开 `noUnusedLocals` 前先清这 3 处；顺手更正 STATE.md 的行数。

---

## 试过、判断没问题的路径（避免下轮重复劳动）

- **10 KB / 100 KB 载入**：3 次 reload 中位数 100 ms / 143 ms，无控制台错误（`.tmp/r39-100kb.log`）
- **滚动**：1 MB 单巨段落 `scrollHeight` 1,287,126 px，5 次「跳到底/回顶 + 强制 reflow」各 0–0.1 ms（`.tmp/r39-1mb-part2.log` 第 4 行 `scroll`）；滚动不是瓶颈
- **保存/自动保存正确性**：`Ctrl+S` 走 `showSaveFilePicker`（mock）1 次 `createWritable`、写 102,405 B、`dirty` 回 false；3 键后 2 s 自动保存再写 102,408 B，文件里确实含新字（差 3 字节）。**没有出现重复写同一份内容**
- **10 KB / 100 KB 逐键**：p50 8.8 / 14 ms，属可接受区间；问题集中在 1 MB
- **控制台**：以上全部路径 `console` error 计数 **0**（10 KB、100 KB、1 MB 单段落载入与 30 键打字）
- **内存**：1 MB 单巨段落载入后 `performance.memory.usedJSHeapSize` 45,910 KB、CDP `JSHeapUsedSize` 34,732 KB；DOM `nodes` 78,001（1 MB 单段落）/ 328（首屏空文档）。没有观察到随打字单调增长的迹象（本轮只取 2 个点，不足以断泄漏，见 U4）

## UNVERIFIED

- **U1 根因**：F1 的 220 s 与 F2 的 28 s 都没有落到具体函数/阶段。测法：在 `setMarkdown`、`syncDocInfo`、`applySource` 内加 `performance.mark`；F2 用 `PerformanceObserver({type:'longtask'})` 或 CDP Tracing 再跑一次本轮的 `.tmp/e2e-r39-code-caret.mjs`
- **U2 保存墙钟**：`.tmp/e2e-r39-code-save.mjs` 在 `Ctrl+S` 后用了固定 1,500 ms 等待再读结果，所以没取到「按下到写盘完成」的耗时（日志里的 1,531 ms 是等待时间，不是保存耗时）。下轮在 mock 的 `writable.close()` 里记 `performance.now()`
- **U3 真实 FSA 路径**：保存用 mock 的 `window.showSaveFilePicker`，不是真实 `FileSystemFileHandle`；`.sidelight/drafts/` 落盘、宿主 `/__doc` 写回都没跑（本轮没有工作区句柄）
- **U4 内存泄漏**：只取了 2 个时间点，未做「打字 5 分钟后 heap 是否回落」
- **U5 macOS**：本机是 Windows，未测

## 复现脚本（都在 `.tmp/`，未提交）

| 脚本 | 用途 | 产出 |
| --- | --- | --- |
| `.tmp/e2e-r39-code-perf.mjs` | 10 KB/100 KB/1 MB 载入、逐键 p50/p95、滚动、localStorage 写放大、内存 | `.tmp/r39-100kb.log`、`.tmp/perf-round39.json` |
| `.tmp/e2e-r39-code-1mb-repro.mjs` | 1 MB 单段落载入与单键的最小白盒 | `.tmp/r39-1mb-repro.log` |
| `.tmp/e2e-r39-code-1mb-multi.mjs` | 1 MB 多段落载入耗时（F1） | `.tmp/r39-1mb-multi.log` |
| `.tmp/e2e-r39-code-caret.mjs` | 文首 vs 文末逐键（F2） | `.tmp/r39-caret.log` |
| `.tmp/e2e-r39-code-attribute.mjs` | CDP 指标归因（F2） | `.tmp/r39-attribute.log` |
| `.tmp/e2e-r39-code-scrollpos.mjs` | 视口位置 vs 光标位置 | `.tmp/r39-scrollpos.log` |
| `.tmp/e2e-r39-code-mitigate.mjs` / `-cv.mjs` | 三种 CSS 缓解 | `.tmp/r39-mitigate.log`、`.tmp/r39-cv.log` |
| `.tmp/e2e-r39-code-src-exit.mjs` | 源码进出（文首） | `.tmp/r39-src-exit.log` |
| `.tmp/e2e-r39-code-save.mjs` | 保存/自动保存/草稿写放大 | `.tmp/r39-save.log` |
| `.tmp/deadscan-r39.mjs` | 导出符号无外部引用扫描（F6） | 本报告 F6 |
| `.tmp/e2e-r39-code-clean-recheck.mjs` | 关掉遗留页面后复测 F2 | `.tmp/r39-clean-recheck.log` |

## 环境动作（需知会）

- 为排除假因，`.tmp/e2e-r39-code-clean-recheck.mjs` 关掉了 CDP 9225 默认 context 里 4 个非 localhost 遗留标签页（OneNote、Tampermonkey、Trancy、Adblock 欢迎页），保留 1 页。`reset.mjs` 只关 localhost 页面，所以这 4 个是本轮额外动作。未启动、未 kill 任何浏览器进程。

## 与既有记录的差异（需要根代理知会）

- `docs/iteration/STATE.md:55,62` 与 README 的「1 MB 载入 1284 ms」是**单段落**样本；本轮多段落 1 MB 实测 **219,828 ms**。建议下一轮把 1 MB 基线换成多段落形态，否则性能门禁一直是「测不到的绿灯」。
- `docs/iteration/STATE.md:119` 的「22 处字号无变量」「三处重复序列化」未复核（本轮没做样式轴）。
