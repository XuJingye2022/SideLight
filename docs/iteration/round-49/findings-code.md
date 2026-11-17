# 第 49 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha `57e2a81748090e63b88b1ad4f998ca3b689e347f`（`git rev-parse HEAD` 实测一致）。收工时 `git status --porcelain` 只有未跟踪的 `shots/round-49/` 与本报告；**产品代码未改**。
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP **9225**（未启 Edge、未 kill `msedge`）、Node 24.21。每条 E2E 前跑 `node .tmp/reset.mjs 9225`。
- 本轮脚本（`.tmp/`，可复跑）：
  - `.tmp/e2e-r49-code-perf.mjs` → `.tmp/perf-round49-code.json`：两档文档（191 KB / 1.84 MB UTF-8）载入 + 编辑逐键 + 滚动帧 + 源码逐键 + localStorage 全量写计数；假 FSA 工作区的保存/自动保存/草稿写放大；连切 6 次文档的堆与 DOM 计数。
  - `.tmp/e2e-r49-code-probe.mjs` → `.tmp/perf-round49-{100kb,1mbbytes,probe}.json`：按段数播种，全部 `sl-*` 标记按序导出、纯函数代价、编辑/源码各 8 键延迟与 longtask。可复跑 `R49_PARAS=350 R49_OUT=… node .tmp/e2e-r49-code-probe.mjs`。
- 本轮实测文档（字符数按 UTF-16 口径，与产品 `text.length` 一致；字节为 UTF-8）：
  | 称呼 | 字数 | UTF-8 字节 | 段数 | 来源 |
  | --- | --- | --- | --- | --- |
  | 100 KB | 33,727 | 100,919 | 34 | probe（`R49_PARAS=34`） |
  | 1 MB | 347,450 | 1,039,058 | 350 | probe（`R49_PARAS=350`） |
  | 3 MB | 1,016,757 | 3,040,189 | 1,024 | probe（`R49_PARAS=1024`，仍在 5.5 MiB 上限内） |
  | 中档 A / B | 63,732 / 647,093 | 190,394 / 1,931,197 | 101 / 1,024 | perf 脚本两档（对照用） |
  | 保存档小 / 大 | 787 / 227,420 | 2,113 / 678,868 | — / 360 | perf 脚本假 FSA |
- 端到端走过的用户路径（每条有截图）：
  1. 100 KB：编辑视图打 8 键 → 滚动 → `Ctrl+/` 源码打 8 键。`shots/round-49/code-probe-34-{edit,source}.png`、`code-100kb-{typing,scrolled,source-typing}.png`
  2. 1 MB：同一路径。`shots/round-49/code-probe-350-{edit,source}.png`、`code-1mb-{edit-typing,scrolled,source-typing}.png`
  3. 3 MB：同一路径。`shots/round-49/code-probe-1024-{edit,source}.png`
  4. 假 FSA 工作区：打开 `小.md` 打字 → 等草稿 + 自动保存 → 源码打字 → `Ctrl+S`；打开 `长.md` 重复 → 连切 6 次文档。`shots/round-49/code-save-{autosave-small,source-typing,autosave-big}.png`、`code-switch-docs.png`
- 控制台：上列路径 **0 条 console error、0 条 pageerror**；2 条 `requestfailed: http://localhost:5175/__doc`（见 §5.6，浏览器态预期）。

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | **源码视图逐键代价随文档线性上涨，编辑视图不涨**：状态栏字数在 render 里每次全量 `countText`，编辑态同项有 180 ms 防抖而源码态没有 | **P2（新）** | 源码 p95：100 KB **13.8** → 1 MB **28.3** → 1.84 MB **51.3** → 3 MB **76.2 ms**；编辑 p95 19.8–26.0 ms。3 MB 每键 **2 条 longtask（105 + 51 ms）** = ~156 ms 主线程忙 |
| F2 | **一次停笔写 4 份全文**：草稿文件 + 正文文件 + 2 次 localStorage 全量写（大小档都成立） | **P2（新精确计数）** | 787 字文档：磁盘 2×791 字 + localStorage 2×(961/965 字)；227,420 字文档：磁盘 **454,848 字**（2× 正文）+ localStorage 2×(228,194/228,198 字)，合计 ~911 K 字/停笔 |
| F3 | **「全部替换」1 MB 冻结 51.8 s 仍开放**（第 48 轮 F1）：`tr` 逐条 `insertText/delete` 的 O(n²) 未动 | **P1（复核未修）** | 代码未变：`App.tsx:1859-1872`；同基线实测 1 MB / 39,936 命中 `dispatch` 51,802 ms |
| F4 | **源码态字数明细整篇 reparse、导出 .md/.txt 无条件加载 KaTeX 仍开放**（第 48 轮 F2/F3） | **P2（复核未修）** | `App.tsx:4070-4074`、`App.tsx:4085-4093`（第 48 轮提交整体 +26 行，逻辑未变） |

`actionable_count = 4`：F1、F2 是本轮新发现（有本轮实测），F3、F4 是复核仍可执行的旧账（代码未动，行号已更新）。四条都给了可度量改进与风险。

---

## F1（P2，新）源码视图逐键代价随文档线性上涨

### 1.1 实测

同一台机器、同一篇文档、先编辑视图打 8 键再 `Ctrl+/` 进源码打 8 键。逐键延迟用「`input` 捕获 → `setTimeout(0)`」量一个输入事件的全部同步处理（含 ProseMirror/React 处理，不含下一次重绘）。

| 文档 | 编辑 p95 | **源码 p95** | 源码 longtask | `countText(body)` 单次 |
| --- | --- | --- | --- | --- |
| 100 KB（33,727 字） | 19.8 ms | **13.8 ms** | 0 | 0.6 ms |
| 1 MB（347,450 字） | 21.1 ms | **28.3 ms** | 0 | 8.2 ms |
| 1.84 MB（647,093 字，perf 脚本） | 26.0 ms | **51.3 ms**（10 键 43.9–54.0） | 1 条/键，约 83 ms | — |
| 3 MB（1,016,757 字） | 24.0 ms | **76.2 ms**（8 键 70.7–77.0） | **2 条/键：105+51 ms** | 21.8 ms |

- 编辑视图四档 13–33 ms、**0 条 longtask**（逐键范围：100 KB 12.9–19.8、1 MB 16.1–22.7、1.84 MB 19.0–31.1、3 MB 21.1–33.3 ms，中位约 20 ms）；源码视图随字数线性变差，1.8 MB 起进入 longtask 区间，3 MB 每键约 156 ms 主线程忙 → 输入上限约 6–7 键/秒。
- 3 MB 仍在产品 5.5 MiB 上限内（真实长篇/合稿场景），不是人为超限样本。
- 源码进出**不重解析**：两档 `sl-parse-done` 2 → 2（`perf-round49-code.json` 的 `source.parseMarksBefore/After`），第 42 轮快路径成立，所以 76 ms/156 ms 不是 parse。

### 1.2 代码路径

- `src/App.tsx:5244`：状态栏字数在 **render 期**每次全量算：

```tsx
stats={sourceMode ? countText(splitFrontmatter(sourceText).body) : stats}
```

  页面内实测 `countText(body)`：100 KB 0.6 ms / 1 MB 8.2 ms / 3 MB 21.8 ms；`splitFrontmatter` 0 ms、`extractFootnotes` ≤0.9 ms、`normalizeForBaseline` 的 replace+compare 0.1–0.2 ms（`pureCost`）。
- 对照：编辑态的同一个量走 180 ms 防抖（`src/App.tsx:913-918`），源码态没有任何防抖/记忆 → 每个按键触发的 render 都白算一次全文。
- 其余每键成本：`src/App.tsx:1909` 的脏判据（1 MB 实测 0.1 ms，不是主因）；`src/App.tsx:1913` 的 `persistDocKey(sourceText)` 全量 localStorage 写（3 MB 档 `>256 KiB` 提前返回 `App.tsx:647`，0 次；191 KB / 63,732 字档 10 键 = 10 次写、640,135 字，单次 `setItem` 0.14 ms——见 F2 的写入放大，但不是延迟主因）。
- 3 MB 档剩余约 130 ms 未定位：候选是受控 `<textarea value={sourceText}>` 每次提交 1.0 M 字符串（实测 `textareaChars = 1,016,775`）后的 React 提交与文本域重排（每键 2 条 longtask 说明是两段独立的同步工作）。**先做下面的 memo/防抖再复测**，不要同时改两处。

### 1.3 改法（低风险，可度量）

1. 源码态字数改 `useMemo` 按 `sourceText` 记忆 + 与编辑态同拍的 180 ms 防抖（或对该 prop 用 `useDeferredValue`），去掉 render 期全量 `countText`。预期每键 −0.6/−8.2/−21.8 ms（100 KB/1 MB/3 MB）。
2. 复测若 3 MB 仍 >40 ms/键，再把源码框改「本地 state 显示 + ≥150 ms 防抖提交到 App」两段式；不动源码语义与保存路径。
3. 顺手统一：源码态的「段数」（明细面板 `App.tsx:4070-4074` 整篇 reparse，第 48 轮 F2）与字数应共用同一次计数结果，避免第三套实现。
4. 回归基线：`.tmp/e2e-r49-code-probe.mjs` 卡线「1 MB 源码 p95 ≤ 20 ms、longtask 0；3 MB ≤ 40 ms」；`wordcount.test.ts` 口径不变。

风险：低——只影响状态栏字数显示时机（最多滞后 180 ms，与编辑态一致）。

---

## F2（P2，新精确计数）一次停笔写 4 份全文

### 2.1 实测（`perf-round49-code.json` 的 `savePath`）

假 FSA 工作区（继承 `.tmp/r30-fsa.mjs`），在 `window.__fsState.files.set` 与 `Storage.prototype.setItem` 上计数（写入字数 + 路径序列）。操作：编辑视图打 3 个字 → 等 4.5 s（覆盖 800 ms 草稿 + 2 s 自动保存）→ 读计数。

| 文档 | 磁盘写入（次数 / 字数 / 路径） | localStorage 全量写 | 合计全文份数 |
| --- | --- | --- | --- |
| `小.md` 787 字（2,113 B） | 3 次 / **1,582 字** / 草稿 create 0、草稿 791、正文 791 | **2 次**：961、965 字 | **4 份**（磁盘 2 + localStorage 2） |
| `长.md` 227,420 字（678,868 B） | 3 次 / **454,848 字** / 草稿 create 0、草稿 227,424、正文 227,424 | **2 次**：228,194、228,198 字 | **4 份**，合计约 **911 K 字**/停笔 |
| 手动 `Ctrl+S`（长文） | 1 次 / 227,425 字 / `长.md` | 1 次：228,198 字 | **2 份**（localStorage 那次是重开恢复兜底，非重复） |

- 停笔后 800 ms 的草稿与 2 s 的自动保存写的是**同一份全文**；`persistDocKey` 又在派生（`:936`）与保存收尾（`:2677`）各写一次全文。
- 保存字节本身正确：`长.md` 保存后前缀等于种子、连存两次 227,425 字完全相同（`disk.big1/big2`）；`小.md` 792 字。

### 2.2 代码路径

- `src/App.tsx:950-973`：`onUpdate` 的 300 ms 派生后，再挂 800 ms 计时器 `writeCache(dir, 'draft', key, draft)`。
- `src/App.tsx:3205-3252`：停笔 2 s 的 `runAutoSave` → `prepareSave()` → `performCommit` 写正文（正常路径）。
- `src/App.tsx:936`（派生）与 `:2677`（`finishSaved`）各 `persistDocKey` 一次；`App.tsx:647` 的 `>256 KiB` 守卫按 `text.length`（字符）算，所以 227 K 字文档仍写 localStorage（第 47 轮记的「256 KiB」实际约 262 K 字符）。

### 2.3 改法

a) 草稿计时 800 ms → 2500 ms，或改「自动保存发起 500 ms 后仍未成功才写草稿」：正常路径少 1 份全文；
b) 有目录草稿可写时跳过 `persistDocKey`（`fileRef.current?.path` 存在即跳过）：少 2 份全文写入；
c) 失败兜底保留：`runAutoSave` 失败分支已有 `writeDraftFallback`（`App.tsx:3260`）。

收益：一次停笔全文拷贝 4 → 1（a+b 都做）或 3（只做 a）/ 2（只做 b）；`>256 K` 字文档的磁盘写 2× → 1×（只做 a 时）。风险：中低——只动草稿/兜底计时与 localStorage 兜底，不碰保存语义；崩溃窗口从 0.8 s 变 2.0–2.5 s（只影响「打完字 1 秒内崩溃」）。回归用本轮脚本卡「一次停笔磁盘全量写 ≤ 1 次 + localStorage 0 次（有目录时）」。

---

## F3（P1，复核仍开放 —— 第 48 轮 F1）「全部替换」1 MB 冻结 51.8 s

- 代码未动（阅读 + `git grep`）：`src/App.tsx:1859-1872` 仍是 `let transaction = editor.state.tr`，从后往前逐条 `transaction.insertText(replacement, match.from, match.to)` / `delete`（`Transform` 每次 `mapping.map()`，O(n²)），最后一次 `editor.view.dispatch(transaction)`。
- 证据沿用第 48 轮同基线实测（第 48 轮验收提交只改表格守卫/源码基线归一化，与本路径无关）：1 MB / **39,936 命中**时 `view.dispatch` **51,802 ms**、点击到返回 52,197 ms、longtask 52,253 ms；100 KB / 4,096 命中 769 ms。
- 第 49 轮优先级已写「测量先行」。提示：`replaceEvery` 的 `steps` 是 39,936，拆计时必须包 `editor.view.dispatch`（第 48 轮 §6.3 的脚本坑）；`button.click()` 的返回耗时会被 Playwright 等待放大。
- 改法与阈值同第 48 轮 F1（预构建 `ReplaceStep` 用 `tr.step()` 追加，或按段落合并；1 MB `dispatch` ≤ 2,000 ms）。

---

## F4（P2，复核仍开放 —— 第 48 轮 F2/F3）

- **源码态字数明细整篇 reparse 只为段数**：`src/App.tsx:4070-4074` 的 `countInSource()` 仍 `manager.parse(escapeHtmlForParse(protectMathPairs(body)))` 再 `countParagraphs`。第 48 轮实测 1 MB 源码态面板出现 2,074 ms（dev 两次 parse 991+973 ms）。与 F1 同源，一次 memo 化可同时解决。
- **导出 Markdown / 纯文本无条件 `await ensureKatex()`**：`src/App.tsx:4085-4093`（第 48 轮记 4059-4067，整体 +26 行）。`.md` 用 `currentMarkdown()`、`.txt` 用 `buildPlainText()`，都不需要 KaTeX；改法：移进 `kind === 'html'` 分支。第 48 轮实测生产 `katexLoader` 76,553 B gzip JS + 7,365 B gzip CSS，首次导出 .md 会多加载并执行 ~206 ms 模块求值。

---

## 5. 试过、但判断没有问题的路径（防敷衍的 0 条）

1. **编辑视图逐键不是问题**：四档 p95 19.8 / 21.1 / 26.0 / 24.0 ms（100 KB / 1 MB / 1.84 MB / 3 MB）、0 longtask、8 键墙钟 877–898 ms。每键一次的全文脏比较（`onUpdate` → `serializeBodyNow`）代价可接受，不单列。
2. **滚动不掉帧**：1.84 MB 滚 10 次 89 帧，rAF 中位 16.5 ms / p95 22.4 ms / max 29.5 ms、longtask 0；191 KB p95 21.8 ms。
3. **载入分段已清**（全部 `sl-*` 标记按序导出，dev StrictMode 两遍；单遍 = 同一遍的相邻标记差）：
   - 100 KB：墙面到编辑器 427 ms；单遍 parse **6 ms**、dispatch 3/0、serialize 2/0、sync 0/2 ms。
   - 1 MB：745 ms；parse **123 / 120 ms**、dispatch 7/1、serialize 4/3、sync 7/6 ms。
   - 3 MB：3,109 ms；parse **1,187 / 1,178 ms**、dispatch 9/3、serialize 8/7、sync 20/17 ms。
   - `dispatch/serialize/sync` 都 ≤20 ms，**载入慢全在 parse**；字数 ×10.3 → parse ×20.5、字数 ×2.9 → parse ×9.7，仍是超线性（第 39/48 轮已记的用户侧表现：37,450 段/1 MB 单遍 parse 110 s）。属已知待办（parse 拆段），本轮不重复计分，只补上面三档实测供下一轮拆计时用。
4. **内存/DOM 没有泄漏迹象**：假工作区连切 6 次文档、`HeapProfiler.collectGarbage` 后 `usedJSHeapSize` 61,202,538 → 61,775,626 B（+0.57 MB）、`Memory.getDOMCounters` 的 `nodes` 934 → 931、`jsEventListeners` 300 → 299、`documents` 恒 1；载入后节点 358（100 KB 档）/ 2,204（1.84 MB 档），与文档规模同阶。
5. **保存/自动保存字节正确**：`长.md` 连存两次字节相同（227,425 字）；`小.md` 792 字；保存后 `dirty:false`。
6. **控制台**：0 console error、0 pageerror；2 条 `requestfailed: http://localhost:5175/__doc` 是浏览器态无宿主的探测（dev server 对 `/__doc` 回 404，App 按普通浏览器启动），宿主下由 C# 提供，判为非缺陷。
7. **源码进出不重解析**：两档 `sl-parse-done` 2 → 2，第 42 轮快路径成立。
8. **`persistDocKey` 的配额保护有效**：3 MB 档 0 次写（`>256 KiB` 提前返回），源码逐键没有写 3 MB。

---

## 6. UNVERIFIED

1. **生产口径**：所有延迟含 dev server 模块求值与 StrictMode 双跑；生产预计更低，本轮未跑 `npm run build` + 静态服务（第 48 轮同样未跑）。
2. **F1 剩余的 3 MB 约 130 ms**：只测出 `countText` 21.8 ms / `persistDocKey` 0.14 ms；React 提交与 textarea 重排未拆开，需先做 memo 后分支复测，或上 Performance profile。
3. **F2 的真实 IO 延迟**：假 FSA 只统计字数与次数，不模拟磁盘/OneDrive 延迟；收益按字节线性估计。
4. **真实宿主 WebView2**：本轮全在浏览器态（CDP 9225）；宿主下 WebView2 的 textarea 行为未验。
5. **150%/200% 缩放、真实 IME、深色主题**：未覆盖。
6. **F3 `replaceEvery` 本轮未重跑**：沿用第 48 轮同基线数据（一条要 52 s，且第 49 轮计划已安排拆段计时）。
7. **源码态「段数」口径**：第 48 轮记的 parse 2,074 ms 只在 dev 量过；本轮未重跑明细面板。

---

## 7. 代码质量读数

- `src/App.tsx` **5,536 行 / 215 KB**（`read` 工具行号末行 5536，`Get-ChildItem` 215 KB），仍是最大单文件；「拆分成本 > 收益」的结论第 43–48 轮已论证，不重复。
- 本轮两条新发现（F1、F2）都在 `App.tsx` 的交互/保存回调里，且都只能靠 E2E 发现——与「`App.tsx` 0 条单测」一致：F1 的 `stats` 取值与 F2 的草稿计时都没有测试夹具。建议改 F1 时补一条「源码态字数防抖」纯函数单测，改 F2 时补「一次停笔全文写 ≤ 1 次」的假 FSA 断言。
- 死代码/重复序列化：第 48 轮 F4 的三项（`trash.ts:120`、`risk.ts:376`、`persistDocKey` 调用点）本轮未找到新的独立问题；`persistDocKey` 现状已在 F2 量化（`:936` 与 `:2677` 各写一次全文）。
