# 第 50 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha `6ae9be39ee5007da2ebcdffd636da21675dc6694`（`git rev-parse HEAD` 实测一致）。收工时 `git status --porcelain` 只有未跟踪的 `shots/round-50/`（其中 `r50-ui-*` 等是并行 finder 的）与本报告；**产品代码未改**。
- 环境：dev server `http://localhost:5175`（未另起、未重启），CDP **9225**（未启 Edge、未 kill `msedge`），Node 24.21。每条 E2E 前跑 `node .tmp/reset.mjs 9225`。
- 本轮脚本（`.tmp/`，可复跑）：
  - `.tmp/e2e-r50-code.mjs` → `.tmp/perf-round50-code.json`：两档文档载入 / 编辑逐键 / 滚动帧 / 源码切换与逐键 / 堆与 DOM 计数；假 FSA 工作区的保存路径读数（整篇旧文件预读次数与字节、写次数与字数、localStorage 全量写），四条探针：无改动 `Ctrl+S`、脏文档 `Ctrl+S`、停笔（草稿+自动保存）、连按两次 `Ctrl+S`。
  - `.tmp/e2e-r50-code-double.mjs` → `.tmp/perf-round50-double-save.json`：只测「无改动文档连按两次 `Ctrl+S`」，记录每次写的字数与每次 `File.prototype.text()` 的字节/耗时，并核对盘上字节是否等于种子。
  - 两条脚本都在页面侧打点：`File.prototype.text`（整篇预读）、`Storage.prototype.setItem`（localStorage 全量写）、`__fsState.files.set`（假盘写）、`input` 事件同步耗时、`longtask`、rAF 帧。
- 本轮实测文档（字符按 UTF-16，与产品 `text.length` 同口径；字节为 UTF-8）：

  | 称呼 | 字符 | UTF-8 字节 | 段数 | 说明 |
  | --- | --- | --- | --- | --- |
  | 186 KB 档 | 63,732 | 190,394 | 101 | localStorage 种入后 `reload` |
  | 1.84 MB 档 | 647,093 | 1,931,197 | 1,024 | 同上（比「1 MB」更大，结论只会更保守） |
  | 长.md（假 FSA） | 227,420 | 678,868 | 360 | 保存路径主样本 |
  | 小.md（假 FSA） | 787 | 2,113 | 61 | 对照 |

- 端到端走过的用户路径（每条有截图）：
  1. 186 KB：编辑视图打 10 键 → 滚 10 次 → `Ctrl+/` 源码打 10 键 → 回编辑。`shots/round-50/code-100kb-{edit,scrolled,source}.png`
  2. 1.84 MB：同一路径。`shots/round-50/code-1mb-{edit,scrolled,source}.png`
  3. 假工作区 `长.md`：无改动 `Ctrl+S` → 打字后 `Ctrl+S` → 停笔 4.5 s（草稿+自动保存）→ 打字后连按两次 `Ctrl+S`。`shots/round-50/code-save-{unchanged-ctrl-s,dirty-ctrl-s,pause}.png`
  4. 假工作区 `小.md`：无改动 `Ctrl+S`。`shots/round-50/code-save-small.png`
- 控制台：上列路径 **0 条 console error、0 条 pageerror**；2 条 `requestfailed: http://localhost:5175/__doc`（浏览器态无宿主，第 49 轮已判为非缺陷）。

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | **每次保存先整篇读回旧文件，且工作区文档没有「没有改动」守卫**：无改动 `Ctrl+S` 也整篇读 678,868 B + 整篇写 227,420 字 + 整篇再写一遍 localStorage；连按两次就是 2 次读 + 2 次逐字节相同的写 | **P2（新）** | 读 678,868 B ×1（1.7–2.2 ms）/ 次；写 227,420 字；localStorage 228,191 字；双脚 2 读（1,357,736 B）+ 2 写、盘上 `diskSameAsSeed:true` |
| F2 | **源码视图逐键 1 条 longtask/键（第 49 轮 F1 复核未修）** | **P2（复核）** | 1.84 MB：源码 p95 **59.2 ms**、10 键 **10 条 longtask 81–91 ms**；同文档编辑 p95 30.9 ms、longtask **0** |
| F3 | **「全部替换」O(n²) 仍开放（第 48 轮 F1 / 第 49 轮 F3 复核未修）** | **P1（复核）** | 代码逐字未变（`App.tsx:1859-1873`）；同基线 1 MB / 39,936 命中 `view.dispatch` **51,802 ms**（第 48 轮实测，本轮未重跑） |
| F4 | **一次停笔仍写 4 份全文**（第 49 轮 F2 复核未修） | **P2（复核）** | 227,420 字文档：磁盘 3 次 / 454,852 字（空 create + 草稿 227,426 + 正文 227,426）+ localStorage 2 次 / 456,396 字；自动保存那次也做整篇预读（678,879 B / 10.9 ms） |
| F5 | **共享纯函数 `codeScan.ts` 无直接单测**，它同时被两条 P1 数据安全链（`html.ts`、`tilde.ts`）调用；另有 13 个 lib 模块无单测文件 | **P2（新，测试盲区）** | 45 个 lib 模块 / 32 个测试文件；`mapOutsideCode` 的围栏/引用块围栏/行内代码/缩进围栏组合只被间接覆盖 |

`actionable_count = 5`。F1、F5 是本轮新发现（有本轮实测/静态证据）；F2、F3、F4 是第 48/49 轮的复核：
代码未动（`git grep` 与逐行阅读确认），读数与上轮同阶（源码 p95 51.3 → 59.2 ms 属正常抖动）。

---

## F1（P2，新）每次保存先整篇读回旧文件；工作区文档无「没有改动」守卫

### 1.1 实测（`perf-round50-code.json` / `perf-round50-double-save.json`）

假 FSA 工作区，`长.md` 227,420 字 / 678,868 B。**一个键都不打**，直接按 `Ctrl+S`：

| 动作 | 盘上写 | 整篇预读（`File.prototype.text`） | localStorage 全量写 | 提示 |
| --- | --- | --- | --- | --- |
| 无改动 `Ctrl+S`（第 1 次） | **1 次 / 227,420 字**（`长.md`） | **1 次 / 678,868 B / 2.2 ms** | 1 次 / 228,191 字 | 「已保存 长.md」 |
| 无改动 `Ctrl+S`（第 2 次） | **1 次 / 227,420 字** | **1 次 / 678,868 B / 1.7 ms** | 1 次 | — |
| 打字后 `Ctrl+S`（脏） | 1 次 / 227,425 字 | 1 次 / 678,868 B / 2.8 ms | 1 次 | 「已保存 长.md」 |
| 停笔 4.5 s（草稿 + 自动保存） | 3 次 / **454,852 字** | 1 次 / 678,879 B / 10.9 ms | 2 次 / 456,396 字 | — |
| `小.md`（787 字）无改动 `Ctrl+S` | 1 次 | 1 次 | 1 次 | — |

- 双击探针的盘上结果：两次写完 `__fsState.files.get('长.md')` **等于种子**（`diskSameAsSeed: true`）——第二次写的内容与第一次、与盘上原内容逐字节相同。
- 预读次数**永远等于写次数**（1:1），包括自动保存；无改动也读，说明它跟「有没有变化」无关。

### 1.2 代码路径

- `src/App.tsx:2741`：`const previousText = await target.handle.getFile().then((file) => file.text()).catch(() => null)`
  —— 写盘前无条件把旧文件整篇读成字符串。`previousText` 只在 `:2764-2773` 的「写盘期间文档身份已变」回滚分支里用；正常路径（本轮四类探针全部命中）一条字节都没用到它。
- `src/App.tsx:2932-2935`：宿主目标有「没有改动」守卫 —— `if (goal === 'host' && !dirty) { setNotice({ text: '没有改动，未写入。' … }); return }`。
- `src/App.tsx:3375-3381`：`saveFile()` 在工作区文档下走 `requestSave('file')`，**没有**同一守卫；于是 `:2946` 的 `prepareSave()`（整篇序列化 → 差分 → EOL）→ `runSave` → `performCommit`。
- `src/App.tsx:2677`：`finishSaved` 里 `persistDocKey(withEol)` 再写一份全文到 localStorage（`< 256 KiB` 以下才写；1.84 MB 档实测 0 次，符合 `:647` 的守卫）。
- `performCommit` **没有在飞合并**：`performingCommitRef.current`（`:2751`）只被赋值、没有任何地方读它来决定「直接返回」，所以两次 `Ctrl+S` 就是两条独立提交，各自读 + 写。

### 1.3 改法（三条独立、可分别验收）

a) **给 `'file'` 目标补 `!dirty` 守卫**（与 `:2932` 同款，文案可改「已是最新，未写入」）：无改动 `Ctrl+S` 的整篇读/写/localStorage 全部归零。
b) **回滚文本不要再读盘**：用 `rawTextRef.current`（载入与每次 `finishSaved` 都会把它设成磁盘同款文本，见 `:2647`）作为 `previousText`。删掉 `:2741` 后每次保存少一次全文 IO 读 + 一个 227 K–1 M 字符的临时字符串。
c) **在飞合并**：`performingCommitRef.current` 非空时直接复用/忽略同内容提交，双击只剩 1 次读 + 1 次写。

收益（按本轮读数线性折算到 1 MiB 文档）：a 让「无改动保存」从 2 份全文 IO 变成 0；b 让**每次**保存少 1 次 1 MiB 读（实测 678,868 B 读 1.7–2.8 ms，OneDrive/网络盘上会明显放大，与第 40 轮"网络盘未验"同族）；c 让连击不翻倍。
风险：
- a 改变可见副作用——有些用户靠文件 mtime 判断「已写盘」，Ctrl+S 不再刷新 mtime 会被当成没保存。若保留 mtime 语义，就别做 a，只做 b + c。
- b 的回滚内容来源从「磁盘现状」变成「上次读/写的内容」；如果外部程序改过该文件，回滚会覆盖外部改动（现状回滚写回的是外部改动后的内容）。这条风险要写进实现说明。
- c 只影响重复按键，不动保存语义。

回归断言（可加进现有假 FSA 脚本）：无改动 `Ctrl+S` 后 `__fsState` 写次数 = 0、`File.prototype.text` 调用 = 0；连按两次 `Ctrl+S` 后写次数 ≤ 1；脏保存后盘上字节仍等于种子（`diskSameAsSeed:true`）。

---

## F2（P2，复核第 49 轮 F1 未修）源码视图逐键 1 条 longtask/键

本轮同基线重测（表格口径同第 49 轮：`input` 捕获 → `setTimeout(0)` 计一个按键的全部同步处理）：

| 文档 | 编辑 p95 | **源码 p95** | 源码 longtask | 源码 localStorage 写 | 源码进出 parse 标记 |
| --- | --- | --- | --- | --- | --- |
| 186 KB（63,732 字） | 16.8 ms | **17.7 ms** | 0 | 10 次（每键 1 次） | 2 → 2 |
| 1.84 MB（647,093 字） | **30.9 ms** | **59.2 ms**（10 键 48.3–59.2） | **10 条：81–91 ms（1 条/键）** | 0（>256 KiB 守卫） | 2 → 2 |

- 1.84 MB 源码每键约 **59 ms + 一条 82 ms 级 longtask**，等于整条主线程每键忙 ~0.08 s → 输入上限约 12 键/秒且肉眼可见卡顿；同一文档编辑态 0 longtask。
- 源码进出**不重解析**（`sl-parse-done` 2 → 2），第 42 轮快路径成立，所以不是 parse。
- 1.84 MB 档 `persistDocKey` 0 次（守卫生效），所以这 59 ms **不是** localStorage 写。
- 代码：`src/App.tsx:5244` `stats={sourceMode ? countText(splitFrontmatter(sourceText).body) : stats}` 在 render 期每次全量算（编辑态同一个量走 180 ms 防抖 `:913-918`）。第 49 轮量过 `countText` 单次：1 MB 8.2 ms、3 MB 21.8 ms；剩余约 30–40 ms 本轮**未拆开**（受控 `<textarea value={sourceText}>` 提交 647 K 字符后的 React 提交与重排），见 §6。
- 改法同第 49 轮 F1：`useMemo` 按 `sourceText` 记忆 + 与编辑态同拍 180 ms 防抖（或 `useDeferredValue`），复测后若仍 >40 ms/键，再把源码框改「本地 state 显示 + ≥150 ms 提交」。风险低，只影响状态栏字数显示时机（最多滞后 180 ms）。回归基线：1.84 MB 源码 p95 ≤ 20 ms、longtask 0。

---

## F3（P1，复核第 48 轮 F1 / 第 49 轮 F3 仍开放）「全部替换」1 MB 冻结

- 代码逐字未变（本轮逐行读过 `src/App.tsx:1859-1873`）：`let transaction = editor.state.tr` 后从后往前逐条 `transaction.insertText(replacement, match.from, match.to)` / `transaction.delete(...)`，`Transform` 每次映射 O(n)，总 O(n²)，最后一次 `editor.view.dispatch(transaction)`。
- 本轮未重跑（一次要 52 s，第 49 轮计划已安排「先按 `view.dispatch` 拆段计时」）；沿用的同基线实测：1 MB / **39,936 命中 → `view.dispatch` 51,802 ms**、点击到返回 52,197 ms。
- 改法：预构建 `ReplaceStep`（`tr.step(...)` 追加）避免每步 `mapping.map()` 全量重算，或按段落合并区间；门槛 `dispatch` ≤ 2,000 ms。注意拆计时必须包住 `editor.view.dispatch`（第 48 轮 §6.3 记过脚本坑）。

---

## F4（P2，复核第 49 轮 F2 未修）一次停笔写 4 份全文

本轮复测（227,420 字 / 678,868 B 文档，打 2 个字后等 4.5 s）：

- 磁盘 **3 次 / 454,852 字**：`.sidelight/drafts/长.md`（创建，0 字）→ `.sidelight/drafts/长.md`（227,426 字）→ `长.md`（227,426 字）。
- localStorage **2 次 / 456,396 字**。
- 内容正确：`长.md` 保存后 227,427 字、前缀等于种子（`bigAfterDirtyPrefix:true`），连存两次不改字节。

即「一次停笔」= 草稿 1 份 + 正文 1 份 + localStorage 2 份 = 4 份全文，另有 F1 的 1 次整篇预读。改法仍按第 49 轮 F2 的 a/b/c：草稿计时 800 ms → 2500 ms；有目录可写时跳过 `persistDocKey`；失败兜底保留。风险中低（崩溃窗口从 0.8 s 变 2.5 s）。

---

## F5（P2，新，测试盲区）`codeScan.ts` 无直接单测

- 45 个 `src/lib/*.ts`（非测试）对 32 个 `.test.ts`：**14 个模块没有同名测试文件**（45 − 14 = 31 个模块有同名测试，另一个测试文件测的是别的模块里的符号）：
  `ai.ts`、`assetImage.ts`、`codeScan.ts`、`decorations.ts`、`hostBridge.ts`、`katexLoader.ts`、`mathInput.ts`、`mermaidLoader.ts`、`mermaidPreview.ts`、`outlineTree.ts`、`rename.ts`、`tableReuse.ts`、`taskListInput.ts`、`workspace.ts`。
- 其中多数有 E2E 剧本兜底（`rename` 22/22、`tableReuse` 走 roundtrip、`taskListInput` 走 keyboard/任务项、`outlineTree` 走第 29 轮大纲 12/12），**`codeScan.ts` 是例外**：它被两条 P1 数据安全链直接调用 —— `src/lib/html.ts:1` 与 `src/lib/tilde.ts:3` 都 `import { mapOutsideCode } from './codeScan.ts'` —— 但没有任何测试文件直接测它；它的行为只在 `html.test.ts` / `tilde.test.ts` 的用例里被顺带覆盖。
- 该函数的判定矩阵不小（围栏 ``` 的开/关、引用块内围栏、行内代码、4 空格缩进、未闭合围栏），而第 41 轮已经因「`escapeHtmlForParse` 的围栏判定比 CommonMark 宽」出过一次数据保真缺陷（AGENTS.md 第 8 节）。
- 改法：加 `src/lib/codeScan.test.ts`，用一个回调收集「哪些字符区间被当作代码外」，对上面 6 类输入各断言一次（纯函数、无 DOM、零依赖，约 40–60 行）。风险极低，只加测试不改产品代码。

---

## 5. 试过、但判断没有问题的路径（防敷衍的 0 条）

1. **载入分段**（dev 两遍，取最后一条算单遍）：186 KB 墙面到编辑器 **510 ms**，parse 9 ms / dispatch 1 / serialize 1 / sync 2；1.84 MB **2,457 ms**，**parse 671 ms** / dispatch 3 / serialize 6 / sync 19。仍与第 49 轮同结论：**载入慢全在 parse**，其余三段 ≤19 ms；属已知待办（拆 parse 埋点），本轮不重复计分。
2. **滚动不掉帧**：两档各 88 帧，中位 16.7 / 16.5 ms，p95 **21.8 / 22.1 ms**，max 22.4 / 23.3 ms，longtask 0；`scrollTop` 68,255 / 695,722 说明 1.84 MB 档真滚到了长篇中后段。
3. **编辑视图逐键不是问题**：186 KB 12.2–16.8 ms、1.84 MB 17.6–30.9 ms，**longtask 0**，8–10 键墙钟无 >100 ms 停顿。
4. **内存/DOM 无泄漏迹象**：186 KB 载入后 `usedJSHeapSize` 56.45 MB / nodes 358 / listeners 288 → 一轮编辑+滚动+源码往返后 58.89 MB / 682 / 290；1.84 MB 载入后 61.50 MB / 2,204 / 288 → 64.82 MB / 5,297 / 290。节点增长与「滚动到中段后 ProseMirror 渲染更多段落」一致；`documents` 恒 1、`jsEventListeners` 只 +2。
5. **保存字节正确**：无改动保存后盘上等于种子（`diskSameAsSeed:true`）；脏保存前缀等于种子；`小.md` 保存 1 次。
6. **源码进出不重解析**：两档 `sl-parse-done` 2 → 2。
7. **死代码扫描 = 0**：脚本对 45 个 lib 模块的全部 `export`（function/const/class/type/interface）在 `src/**` + `scripts/**` 里做词边界引用计数，**零引用导出 0 条**。本轮没有新的死代码可删。
8. **控制台**：0 console error、0 pageerror；2 条 `/__doc` 404 是浏览器态无宿主的探测（宿主下由 C# 提供），非缺陷。

---

## 6. UNVERIFIED

1. **F2 的剩余 30–40 ms 未拆开**：只量到总 p95 与 longtask 条数；`countText` 本轮未单独计时（第 49 轮同基线 1 MB 8.2 ms 可参考），受控 textarea 提交与重排占比未测。补测方法：`Profiler.start` + 打 10 键 + `Profiler.stop`，按 `ReactDOM commit` 与 `countText` 的 self time 分。
2. **F1 的真实 IO 延迟**：假 FSA 的 `getFile()` 只是字符串读（1.7–10.9 ms），真实磁盘/OneDrive/网络盘的读取延迟未测；收益按字节线性外推。
3. **F3「全部替换」本轮未重跑**（一次 52 s），延用第 48 轮同基线数据。
4. **生产口径**：全部读数含 dev server 模块求值与 StrictMode 双跑，未跑 `npm run build` + 静态服务。
5. **真实宿主 WebView2 / 真实 IME / 150%–200% 缩放 / 深色主题**：本轮全在浏览器态 CDP 9225，未覆盖。

---

## 7. 代码质量读数

- `src/App.tsx` **5,536 行 / 220,188 B**，仍是最大单文件；`useState` 36 / `useEffect` 55 / `useCallback` 97 / `useRef` 36。第 43–49 轮已论证「拆分成本 > 收益」，本轮不重复提。
- 本轮两条新发现（F1、F5）都不在产品代码的「新逻辑」里：F1 是保存链上一个只为罕见回滚分支存在的读，F5 是一个被两条 P1 链共享却没单测的纯函数 —— 都属于「改动 10–60 行、收益可度量」的低风险项。
- 台账：第 48 轮 F1（`replaceEvery`）、第 49 轮 F1（源码逐键）、F2（停笔 4 份全文）、F3（`persistDocKey` 调用点）、F4（源码明细 reparse + 导出 `.md` 无条件 `ensureKatex`）在 **round 50 代码基线上仍全部开放**（逐行/grep 确认），本轮只新增 F1 与 F5。
