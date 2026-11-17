# 第 48 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha `5673b1dee5623cc72fe87b37d563c1d7444224ff`（`git rev-parse HEAD` 实测一致）。收工时 `git status --porcelain` 只有未跟踪的 `docs/iteration/round-48/`、`shots/round-48/`；**产品代码未改**。
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP **9225**（未启 Edge、未 kill msedge）、Node 24.21。每条 E2E 前跑 `node .tmp/reset.mjs 9225`。
- 本轮脚本（`.tmp/`，可复跑）：
  - `.tmp/e2e-r48-code-paths.mjs` → `.tmp/perf-round48-code.json`：载入、字数面板（编辑/源码）、预览进入+滚动、导出 md/html/txt、堆与 DOM 计数。
  - `.tmp/e2e-r48-code-latency.mjs` → `.tmp/perf-round48-latency.json`：字数面板 click→面板出现（MutationObserver 计时）、源码逐键、`DOMParser` 预览重渲染代价。
  - `.tmp/e2e-r48-code-export.mjs` → `.tmp/perf-round48-export.json`：同会话连点两次「导出 Markdown」，记 KaTeX 资源请求与字节。
  - `.tmp/e2e-r48-code-replaceall.mjs` → `.tmp/perf-round48-replace.json`：查找「侧灯」→「全部替换」的事务计时（dispatch 步数与耗时、longtask）。
  - `.tmp/e2e-r48-code-exportsrc.mjs`、`.tmp/e2e-r48-code-applysrc.mjs`：源码态导出 Markdown 是否重解析（两个探针都因子见 §6 的脚本坑无效，结论不算）。
- 端到端走过的用户路径（每条有截图）：
  1. 100 KB / 1 MB 载入 → 点状态栏字数 → 进源码 → 再点字数 → 退出。`shots/round-48/code-{100kb,1mb}-stats-{edit,source}.png`
  2. 预览（Ctrl+Shift+P）→ 滚轮 10 次 → Esc 回编辑。`shots/round-48/code-{100kb,1mb}-preview{-scrolled}.png`
  3. 导出菜单：HTML / Markdown / 纯文本各一次。`shots/round-48/code-{100kb,1mb}-export-{md,html}.png`、`code-export-menu.png`
  4. Ctrl+F 查「侧灯」→「全部替换」。`shots/round-48/code-{100kb,1mb}-replaceall.png`
  5. 源码模式输入（合成事件，见 §6 说明）。`shots/round-48/code-{100kb,1mb}-source-typing.png`
- 控制台：上列五条路径 **0 条 console error、0 条 pageerror、0 条 requestfailed**（各 JSON 的 `errors` 为空）。

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | **「全部替换」在 1 MB 文档上冻结 52 秒**：一个事务里逐条 `insertText`，每条都走 `mapping.map()`，代价随命中数近似平方增长 | **P1** | 1 MB / 39,936 命中：`dispatch` **51,802 ms**（39,936 steps）、点击到返回 **52,197 ms**、longtask **52,253 ms**（另有 63,288 ms）；100 KB / 4,096 命中：769 ms（步骤数 ×9.75 → 耗时 ×67） |
| F2 | 源码模式点「字数明细」**整篇 reparse 只为了数段数**：1 MB 冻结约 1 s（dev 2.07 s，两次 parse 991 / 973 ms） | **P2** | 1 MB：面板出现 2,074 ms、longtask 2,074 ms、`manager.parse` ×2（StrictMode）；编辑态同面板 305 ms / longtask 60 ms；100 KB 源码态 304 ms（parse 141+141 ms） |
| F3 | **导出 Markdown / 纯文本无条件 `await ensureKatex()`**：首次导出为 .md 加载并执行 KaTeX 惰性 chunk | **P2** | 生产 chunk `katexLoader-*.js` **76,553 B gzip**（258,788 B raw）+ `katexLoader-*.css` **7,365 B gzip**，dev 实测一次 md 导出新增 3 条请求（1,764,175 B decoded、`katex.min.css` 26,940 B）、206 ms longtask |
| F4 | 上一轮 F3/F5/F6 复核：仍逐字未变（死代码 ~40 行、空基线 + 脚注每次保存整篇 classify、一次停笔 4 次写） | **P2** | `trash.ts:120/152/195`、`risk.ts:376`、`App.tsx:934/1910/2141/2674/3199` 行号与第 47 轮一致；`deleteFileToTrash` 仍 0 调用 |

`actionable_count = 4`（F1–F3 是本轮新发现，F4 是复核仍可执行的旧账；四条都有本轮命令输出或实测数据）。

**本轮没有发现新的功能 BUG**：五条路径都跑通（替换结果正确、导出文件名正确、预览与源码切换正常、字数面板内容正确）。F1 是用户可感知的「卡死」，属稳定性问题，优先级最高。

---

## F1（P1，新）「全部替换」在 1 MB 文档上冻结 52 秒

### 1.1 代码路径

`src/App.tsx:1857-1870`：

```ts
const replaceEvery = useCallback(() => {
  ...
  let transaction = editor.state.tr
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index]
    transaction = replacement.length > 0
      ? transaction.insertText(replacement, match.from, match.to)
      : transaction.delete(match.from, match.to)
  }
  editor.view.dispatch(transaction)   // 1868
```

`Transform.insertText/delete` 每次都会 `this.mapping.map(pos)`（ProseMirror 的 `Transform` 用 `mapping` 把旧坐标映射到当前文档），而本循环是**从后往前**逐条插：第 k 条的 `map()` 要扫过前面 k−1 个 `StepMap`，总代价 O(n²)。同时事务里有 n 个 `ReplaceStep`，`apply` 时每个 step 都要重建所在段落节点（1 MB 样本每段 1,000 字）。

### 1.2 实测（`.tmp/e2e-r48-code-replaceall.mjs` → `.tmp/perf-round48-replace.json`）

1,024 段正文（每段 1,000 字，段落内 `侧灯` 出现 39 次），Ctrl+F 查「侧灯」，替换框填「灯」，点「全部替换」：

| 文档 | 命中数 | `view.dispatch` | steps | 点击→返回 | longtask |
| --- | --- | --- | --- | --- | --- |
| 100 KB（101,385 B） | 4,096 | **769.1 ms** | 4,096 | 789.8 ms | 799、753 ms |
| **1 MB（1,025,033 B）** | **39,936** | **51,802 ms** | **39,936** | **52,197 ms** | **52,253、63,288、504、298 ms** |

- 命中数 ×9.75、耗时 ×67 → 超线性（≈ n^1.87），与「逐条 `map()` 扫前面所有 StepMap」一致。
- `52,197 ms` 是 `button.click()` 的返回耗时：**主线程连续冻结 52 秒**，期间页面不响应滚动/键盘，用户会以为崩溃并强杀进程（有未保存改动时会丢正文，因为 `Ctrl+S` 也排不进主线程）。
- 替换结果本身正确：替换后 `doc.textContent` 1,022,982 → 983,046（−39,936 字），`.find-count` 变「无结果」；`getMarkdown` 只 1 次（3.3 ms），所以不是全文序列化的问题。
- 100 KB 档也要 769 ms 冻结；只有 10 段以内的小文档无感。

### 1.3 改法（低风险，可度量）

1. **绕开 `Transform` 的坐标映射**：从后往前预构建 `ReplaceStep`（`new ReplaceStep(from, to, Slice.empty)` / `ReplaceStep(from, from, slice)`），用 `tr.step(step)` 追加——`Transform.step()` 只 `apply` + `appendMap`，不做 `mapping.map()`，消掉 O(n²) 项。位置从后往前本来就无需映射（后面的编辑不影响前面的坐标）。
2. 或**按段落合并**：把同一 textblock 内的相邻命中并成一次替换（本例每段 39 条 → 1 条），步骤数从 39,936 降到 ~1,024。
3. 保底：命中数 > 1,000 时先给确认（「命中 N 处，全部替换可能需要 M 秒」）或分块 `setTimeout` 执行并显示进度。不改语义。
4. 加一条单测锁住「全部替换后 `.find-count` 无结果、正文只替换命中、批注按事务映射」，本轮 4,096/39,936 两条实测数据可直接做成阈值回归基线。

收益：按步骤数线性估算，1 MB 从 52 s 降到 <1 s；100 KB 从 0.77 s 降到 <0.05 s。风险：中低——只改 `replaceEvery` 的构造方式，`dispatch` 仍是一次事务（撤销仍是一步）。**改后必须重跑**本脚本（阈值：1 MB `dispatch` ≤ 2,000 ms）。

---

## F2（P2，新）源码模式点字数明细：整篇 Markdown reparse 只为了数段数

### 2.1 代码路径

- `src/App.tsx:4033-4057`：`openStatsDetail` 在源码态把 `sourceText` 的 body 交给 `countInSource()`：

```ts
const countInSource = (): number | undefined => {
  const manager = editor.markdown ?? editor.storage.markdown?.manager
  if (!manager) return undefined
  const node = editor.schema.nodeFromJSON(manager.parse(escapeHtmlForParse(protectMathPairs(body ?? ''))))
  return countParagraphs(node)     // 只要一个段数
}
```

- 对照：编辑态段数直接 `countParagraphs(editor.state.doc)`，字数用 180 ms 防抖后的 `stats`（`App.tsx:911-916`）；源码态的 `stats` 却在 render 里每次 `countText(splitFrontmatter(sourceText).body)`（`App.tsx:5183`）。
- `countParagraphs`（`src/lib/wordcount.ts:96-107`）只数文本块，不需要整篇 parse；用源码行扫描（空行分段）即可等价近似，或把 parse 放到 `requestIdleCallback`/`setTimeout` 并先显示「统计中…」。

### 2.2 实测（`.tmp/e2e-r48-code-latency.mjs` → `.tmp/perf-round48-latency.json`）

「点 `.stats-trigger` → `#stats-detail` 插入 DOM」用 MutationObserver 计时（重活跑完才插入）：

| 文档 | 视图 | 面板出现 | longtask | `manager.parse` |
| --- | --- | --- | --- | --- |
| 100 KB | 编辑 | 308.9 ms | 无 | 无 |
| 100 KB | **源码** | 303.7 ms | **304 ms** | **141.3 + 140.8 ms** |
| 1 MB | 编辑 | 305.5 ms | 60 ms | 无 |
| 1 MB | **源码** | **2,074.1 ms** | **2,074 ms** | **991.2 + 973.0 ms** |

- 两次 parse 是 dev `StrictMode` 双调用 state updater（`setStatsDetail` 的 updater 跑两遍）；**生产一次也要 ~1 s**（第 47 轮独立测得 1 MB 全篇 parse 975.9 ms）。100 KB 档生产约 140 ms。
- 面板内容正确（段 1,024、合计 865,286 与编辑态一致），说明 parse 结果没被用错——**纯粹为了拿一个段数**。
- 同一面板在编辑态 1 MB 只 60 ms longtask（`countText` 24 ms + 渲染），源码态是它的 34 倍。

### 2.3 改法

源码态段数改由 `sourceText` 直接计数（例如按「非空、非标题、非围栏/表格行」的块计数），或延后到下一个宏任务并显示「统计中…」。收益：1 MB 源码态字数面板 2.07 s → <0.1 s。风险：低——只影响源码态「段」这一格；`wordcount.test.ts` 与第 44 轮的字数口径断言要一起看。

---

## F3（P2，新）导出 Markdown / 纯文本也无条件加载 KaTeX

### 3.1 代码路径

`src/App.tsx:4059-4069`：

```ts
const exportAs = useCallback(async (kind) => {
  ...
  const { buildHtmlDocument, buildPlainText, exportName } = await import('./lib/export.ts')
  await ensureKatex().catch(() => undefined)     // 4067：无条件
  if (sourceMode) applySource()
  if (kind === 'markdown') { ... saveBlob(currentMarkdown()) ; return }   // 4070-4074
```

`ensureKatex()`（`src/lib/katexLazy.ts:128-152`）→ `import('./katexLoader.ts')`，把 KaTeX 整包拉下来；`.md` 用的是 `currentMarkdown()`、`.txt` 用 `buildPlainText()`，都不需要 KaTeX（只有 HTML 的 `renderMathml` 需要）。

### 3.2 实测（`.tmp/e2e-r48-code-export.mjs` → `.tmp/perf-round48-export.json`）

无公式的 5.6 KB 文档，新开页面（KaTeX 未加载）连点两次「导出 ▾ → Markdown」：

| 时点 | KaTeX 资源 |
| --- | --- |
| 导出前 | 只有 `katexLazy.ts` 与它的 dep 包装（14 + 17 KB，页面本来就加载） |
| **第 1 次导出 Markdown 后** | 新增 `katexLoader.ts`、`katex.min.css`（**26,940 B decoded**）、`katex_dist_katex__mjs.js`（**1,764,175 B decoded**，dev 未压缩） |
| 第 2 次导出 / 纯文本导出 | 无新增（已就绪） |

生产构建的同一 chunk（`dist/assets/`，本轮用 zlib level 9 实测）：`katexLoader-CNO5m-uY.js` 258,788 B raw / **76,553 B gzip**；`katexLoader-lxMheimU.css` 26,627 B raw / **7,365 B gzip**。1 MB 文档第一次导出 Markdown 时另记到一条 **206 ms longtask**（模块求值），说明除了下载还要在主线程跑一遍。

用户视角：一个从不写公式的作者，第一次「导出 Markdown」会莫名其妙多下载 ~84 KB gzip 并在主线程执行 200 ms 级任务；`.txt` 同理。

### 3.3 改法

把 `await ensureKatex()` 移进 `kind === 'html'` 分支（或在 `bodyHtml.includes('data-type="inline-math"')` 时才等）。收益：.md/.txt 首次导出省 76.5 KB gzip JS + 7.4 KB CSS + 一次 ~200 ms（dev）模块求值；风险：低——HTML 分支行为不变，`export.test.ts` 覆盖 HTML 导出；加一条断言「导出 markdown 不触发 katexLoader 请求」（可用本轮脚本的 `page.on('request')` 过滤直接验）。

---

## F4（P2，复核仍未修）上一轮 F3/F5/F6

本轮 `git grep` 复核（行号与第 47 轮报告一致，说明实现未动）：

- `src/lib/trash.ts:120` `deleteFileToTrash` 仍只有声明 + `:383` 注释两处命中，**31 行 0 调用**（`shouldWriteCurrent` 现在有 `trash.test.ts:34-39` 两条用例，所以它不算死代码，只是 `trash.ts:195` 的 `text !== null && shouldWriteCurrent(text)` 判断重复——这条降级为「可顺手清理」，不单独计分）。
- `src/lib/risk.ts:376` `activeLosses` 空基线 + 脚注定义仍整篇 `classify`；调用点在保存链 `App.tsx:2944`（手动保存）与 `:3219`（停笔自动保存）。第 46 轮测得 1 MB 每次保存 78.5 ms。
- 一次停笔写放大仍在：`persistDocKey` 5 个调用点（`App.tsx:934/1910/2141/2674/3199`），其中 `:1910` 是源码模式逐键写 localStorage（第 47 轮 F2，10 键 = 10× 文档字节）。本轮为保时间预算未重跑假 FSA 与 1 MB 保存计时（见 UNVERIFIED）。

---

## 5. 试过、但判断没有问题的路径（防敷衍的 0 条）

1. **预览「每帧重算」假设不成立**：`PreviewPane` 的 `bodyHtml={editor?.getHTML() ?? ''}`（`App.tsx:5075`）在 App 因 `tick` 重渲染时会重新求值（`App.tsx:1933-1947` 滚动 rAF bump），但 1 MB 文档滚 10 次期间只发生 **4 次渲染**，`getHTML` 每次 4.4–4.8 ms，`DOMParser+innerHTML`（与 `PreviewPane.renderMath` 同构，`PreviewPane.tsx:15-32`）实测 **6.0 ms**（三次 5.9/6.5/6.0），rAF 帧中位 16.6 ms、p95 22.3 ms、max 23.4 ms，longtask 0。**不提为问题**。
2. **预览进入 1 MB = 194 ms**（含 lazy chunk 首次加载）＋ 一条 50 ms longtask，可接受。
3. **导出 HTML/TXT 的纯函数代价**：1 MB 文档 `editor.getHTML()` 5.7 ms、`buildHtmlDocument` 0.4 ms、`buildPlainText` 1.6 ms（页面内直接 import `/src/lib/export.ts` 量，见 `perf-round48-code.json` 的 `exportCost`）。导出慢在别处（见 F3），**不是模板/正则**。
4. **字数面板在编辑态 1 MB 305 ms**：其中 longtask 60 ms（`countText` 24 ms + 面板渲染）；比源码态好 34 倍，属可接受的一次动作。**不单独提**。
5. **堆与 DOM 计数没有增长异常**：100 KB 强 GC 后 `usedJSHeapSize` 42,815,620 B、1 MB 46,552,256 B；两者 `Memory.getDOMCounters` 都是 `{documents:1, nodes:7,378, jsEventListeners:296}`——预览/导出用的 DOM 没有残留。
6. **控制台/请求**：五条路径 0 console error、0 pageerror、0 requestfailed（`errors` 均为空；导出产生的 requestfailed 0 条）。
7. **源码态导出 Markdown 不会多解析**：`applySource()` 的 `skipReparse`（`App.tsx:3918-3920`）在源码未改时走快支；用真实按键改字后的探针因 §6 的脚本坑无效，不据此下结论（见 UNVERIFIED 4）。

## 6. 环境与脚本坑（本轮新增，下一轮直接复用）

1. **React 受控输入的 value tracker 会吞掉合成 `input` 事件**：`ta.value = ta.value + '字'; ta.dispatchEvent(new Event('input', { bubbles: true }))` 之后 React 的 `onChange` 不触发（tracker 认为值没变）。本轮第一次源码逐键探针因此得到 `perKey 0.2 ms`、`getMd/parse 全空`的假数据（`.tmp/perf-round48-latency.json` 的 `sourceTyping` 不可用）。量源码逐键必须用真实按键（`page.keyboard.insertText`，参考第 47 轮脚本），或先 `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta, v)` 再派发。
2. **重活发生在 click 的异步渲染里，`element.click()` 返回时 DOM 还没更新**：字数面板的 `handlerMs` 只有 0.7–1.1 ms，真正的 2,074 ms 在后面的 render。要量「用户点一下等多久」，用 MutationObserver 在目标节点插入时记 `performance.now() - t0`（本轮做法），不要用 `click()` 的返回耗时。
3. **`view.dispatch` 包装是量「一次性替换」的唯一可靠口径**：`replaceEvery` 的 52 s 里没有一次 React 状态更新，`page.click()` 会一直阻塞到主线程空出来（Playwright 的 click 也因此要等 52 s），只有页面内 `performance.now()` 包 `dispatch` 才拿到 51,802 ms。
4. **`.stats-trigger` 的 `aria-expanded` 不能当「面板已开」判据**：用 `#stats-detail` 是否在 DOM 里更稳。

## 7. UNVERIFIED

1. **F1 的生产数字**：dev + StrictMode 实测 51.8 s；`replaceEvery` 循环是纯模型运算（无 React），生产应同量级，但本轮未跑生产构建。补测：`npm run build` 后用 `serve-dist` 在同一 1 MB 文档重跑 `.tmp/e2e-r48-code-replaceall.mjs`。
2. **F1 修法的实际收益**（预构建 ReplaceStep）：只读角色未改代码；按步骤数线性估算 <1 s，未实测。
3. **F2 的 1 MB 生产耗时**：dev 2.07 s 含 StrictMode 双 parse；生产预计 ~1 s（单次 parse 991 ms），未实测生产。
4. **源码态导出 Markdown 在「源码改过字」时是否真的会整篇 reparse**：探针的合成输入被 React 吞掉，未能制造「sourceText 已变」的状态，因此**不立条目**。补测：真实按键改字 → 点导出 Markdown，记 `manager.parse` 是否有 1 次 ~1 s 调用。
5. **F3 在 1 MB 文档上的首次导出等待**：本轮只量了导出总耗时（60 ms / 55 ms）与请求时机，没有量冷缓存（真实磁盘/网络）下的下载时间；生产 chunk 字节已实测（76,553 + 7,365 B gzip）。
6. **150%/200% 缩放与不同字号**：全部数字来自 100% 缩放、默认字号（与第 45–47 轮同款 UNVERIFIED）。
7. **真实宿主环境**：本轮全部在浏览器态（WebView2 宿主未跑），CDP 9225；宿主下的导出走 `saveBlob` 的下载路径，本轮未验。

## 8. 代码质量读数（口径同第 47 轮）

- `src/App.tsx` **5,475 行 / 217,415 B**，仍是最大单文件；拆分成本大于收益的结论第 43–47 轮已论证，不重复提。
- 本轮三条新发现里两条（F1、F2）都在 `App.tsx` 的交互回调里，且都只能靠 E2E 发现——与第 47 轮「App.tsx 0 单测」的判断一致，不另立条目。
- 死代码复核：`deleteFileToTrash` 仍在（F4）；`shouldWriteCurrent` 已被单测引用，降级为可顺手清理。
