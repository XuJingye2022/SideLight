# 第 17 轮 · 性能基线（finder: perf）

日期：2026-11-16 · 版本 v0.30.0 · 只读侦察，未改 `src/`。
测量产物：`.tmp/r17-perf/`（`cold-prod.json`、`cold-dev.json`、`latency.json`、`memory.json`、`render-dev.json`、`katex-cold.json`、`run*.log`）。
脚本：`.tmp/r17-perf/perf.mjs`（冷启动/输入/切换/重渲染）、`.tmp/r17-perf/instrument.mjs`（页面测桩）、`.tmp/r17-perf/static.mjs`（用已有 `dist/` 起 4174，不构建）、`.tmp/r17-perf/katex.mjs`、`.tmp/r17-perf/bigload.mjs`。

## 测量口径（先看这段，避免误读）

- **生产构建**：`dist/` 是 07:45 打好的 v0.30.0，`src/` 最后改动 07:39，二者同源。用 `.tmp/r17-perf/static.mjs` 在 `http://127.0.0.1:4174` 静态服务（未跑 `npm run build`）。所有「输入/切换/内存」主数字都在 4174 上测。
- **dev**：`http://localhost:5173`。React `StrictMode`（`src/main.tsx:11`）会双调 render，dev 的提交计数与耗时只能作对照，不能当基线。
- **冷启动**：新标签 + `Network.clearBrowserCache`，但浏览器进程是热的（V8 代码缓存仍在），所以是「冷 HTTP 缓存、热进程」；真机 WebView2 首次启动会更慢，属 UNVERIFIED。
- **文档样本**：`makeDoc(kb)` 生成中文段落 + 每 10 行一个 `##` 标题，UTF-8 字节数达标。
- 未测：真实 IME 组合输入、真实宿主（47821）冷启动、macOS。

## P1（影响最大）1 MB 文档打开把主线程锁死 9 s，FCP 推迟到 9.25 s

**数字**

| 文档 | 载入到编辑器可交互 | FCP | 主线程最长单任务 |
| --- | --- | --- | --- |
| 10 KB | 258 ms | — | — |
| 100 KB | 516 ms | — | — |
| 1 MB（`latency.json`） | 5,831 ms | — | — |
| 1 MB（`bigload.mjs`，另一次） | 9,319 ms | 9,252 ms | **1 个 8,990 ms 长任务（229 ms 起）** |

同一份 1 MB 文档两次测到 5.8 s / 9.3 s，量级一致：**打开期间页面完全无响应**，期间没有一帧 FCP。这比「输入慢」更严重——用户会以为程序死了。

**复现**

```powershell
node .tmp/r17-perf/static.mjs dist 4174   # 已有 dist，不构建
node .tmp/r17-perf/bigload.mjs             # 写 1MB 文档到 localStorage → reload → 读 longtask
```

**根因**

1. 启动 effect 在首帧前同步做三件 O(全文) 的事：`setMarkdown(initial.text)`（`src/App.tsx:818` → `787-806`，Markdown→JSON parse + 一次全量 `replaceWith` dispatch）、`serializeDocument` 取保存基线（`src/App.tsx:820-824` → `src/lib/serializeDocument.ts:35-51`，`getMarkdown()` + 4 个 repair 正则 + `reuseTables`）、以及紧随其后的 `syncDocInfo`（`src/App.tsx:809-814`，`extractOutline` + `countText`）。
2. 这三步都在首次 commit 的 effect 里同步执行，浏览器在 effect 跑完前不绘制，于是 FCP 被推到 9 s。
3. 1 MB 时 `serializeDocument` 还要走 `reuseTables(original=1MB, repaired=1MB)`（`src/lib/tableReuse.ts`），是又一遍全文扫描。

**建议**

- 打开 >256 KB 文档时先让外壳出帧：把 `setMarkdown` 放进 `requestAnimationFrame`（或 `setTimeout(0)`）再解析，FCP 至少回到壳的 ~500 ms。
- 大文档跳过「序列化整篇当基线」：基线改用原文长度+哈希（或首/末 4 KB 比对），保存时再算完整文本。
- 解析本身仍是单任务，若要 <2 s 需要 Worker 里做 markdown→JSON（Tiptap JSON 可跨线程传），或分块 dispatch。工作量 H，需 roundtrip 回归。

**难度** H（行为不变要过 `npm run roundtrip` + 数据保真门）

## P2 每敲一个字做两遍全文序列化：1 MB 文档 77 ms/键，30 字 2.3 s

**数字**（4174，聚焦正文，Ctrl+End 后连打 ASCII；`latency.json`）

| 文档 | 30 字总耗时 | 每字 | 帧间隔 >50 ms | 长任务（50–69 ms） | 单事件最大 |
| --- | --- | --- | --- | --- | --- |
| 10 KB | 107 ms | 3.6 ms | 0 | 0 | 16 ms |
| 100 KB | 224 ms | 7.5 ms | 0 | 0 | 24 ms |
| 1 MB | **2,305 ms** | **77 ms** | 3 帧 | **33 个** | 72 ms |
| 100 KB 连续 135 字 | 1,129 ms | 8.4 ms | 0 | 0 | — |

1 MB 时每个键丢约 4–5 帧；长任务都在 50–69 ms，没有单次 >100 ms 的块，但连续排队，体感就是「打完一句话等两秒」。10 KB 已经 3.6 ms/键（其中渲染占一部分，见 P4）。

**复现**

```powershell
node .tmp/r17-perf/perf.mjs      # 第 2 段：10KB/100KB/1MB 各 reload + typeBurst 30 字
# 读 .tmp/r17-perf/latency.json 的 burst.keys / longtasks / maxFrame
```

**根因**（`src/App.tsx:720-775` 的 `onUpdate`，每个按键同步跑一遍）

1. **第一次全文序列化**：`contentRef.current()`（`App.tsx:725`）→ `currentMarkdown`（`App.tsx:2142-2151`）→ `serializeDocument`：`getMarkdown()` + repair 链 + `reuseTables`。
2. **第二次全文序列化**：`current.getMarkdown()` + 同一条 repair 链（`App.tsx:732`），只为拿到草稿去写 localStorage。
3. **每键写整篇 localStorage**：`localStorage.setItem(DOC_KEY, JSON.stringify(整篇))`（`App.tsx:743`），1 MB 文档每键 = 1 MB 字符串化 + 同步写；异常被静默吞掉（`744-746`）。
4. **每键全量统计**：`extractOutline` + `countText(current.state.doc.textContent)`（`App.tsx:729-730`）。`countText` 对每个字符跑一次正则（`src/lib/wordcount.ts:27-33`），再做 `replace(/\s/g)` 与按行 `split`（`47-57`），1 MB ≈ 4 遍全文。
5. **选区更新再全量一遍**：`onSelectionUpdate`（`App.tsx:776-782`）每键 `buildContext(readBlocks(current), …)` 遍历全部块 + `extractOutline` 第二次 + `setSelection` / `setActiveOutline` 两个 setState。

**建议**

- 删除第 1 次序列化：dirty 判定改成 `transaction.docChanged` 置脏、撤销回基线用保存时的快照比对（保存/草稿时才比较）。
- 第 2 次序列化只在 2 s 自动保存 / 800 ms 草稿定时器里做（两个定时器已存在：`App.tsx:758-771`、`2588-2595`）。
- 字数/大纲按「变更块」增量算，或 delay 150–250 ms；`readBlocks` 只在 `selectionUpdate` 且实际移动时算。
- 预期：1 MB 每键 77 ms → 10–15 ms（只剩 Tiptap 自身 transaction + 渲染）。

**难度** M（改动集中在一个 `onUpdate` + 一个 `onSelectionUpdate`，风险是 dirty 语义）

## P3 冷启动 FCP 中位 556 ms、首字可输入 598 ms；主线程有 95 ms 长任务

**数字**（4174，n=3，`cold-prod.json`）

| 指标 | run1 | run2 | run3 | 中位 |
| --- | --- | --- | --- | --- |
| FCP | 488 | 556 | 564 | **556 ms** |
| 首次可输入（真按键落字） | 522 | 598 | 795 | **598 ms** |
| DOMContentLoaded | 391 | 456 | 459 | 456 ms |
| 最长长任务 | 91 ms | 93 ms | 96 ms | 93 ms |
| JS heap | 29.1 MB | 29.1 MB | 29.3 MB | 29.1 MB |
| 资源数 | 3 | 3 | 3 | — |

dev 5173 对照：FCP 828/640/632（中位 640 ms）、首字 871/682/670（中位 682 ms）、**70 个模块请求**、最长长任务 99–335 ms。生产构建把网络请求压到 3 个，但主包执行仍有约 95 ms 的单块。

**KaTeX**：默认样例 `SAMPLE`（`App.tsx:119`）**不含公式**，所以生产冷启动完全不加载 KaTeX（`katexResEnd: null`）。换一份含公式的文档（新标签 + 清缓存）：KaTeX chunk 传输 **259,088 B**，`katexResEnd` 235 ms，`.katex` 节点就绪 296 ms（同次 FCP 256 ms）——惰性加载设计有效，首屏不被公式拖慢；真机 WebView2 首次拉这个 chunk 未验。

**复现**

```powershell
node .tmp/r17-perf/perf.mjs            # 第 1 段：3 次 clearBrowserCache + 新标签
node .tmp/r17-perf/katex.mjs           # 含公式文档的 KaTeX 就绪
```

**根因**

- 首屏必须等的 JS+CSS gzip 284,210 B 合成一条主包，执行完才出 FCP；95 ms 长任务就落在 bundle 执行段（387–455 ms 起）。
- 启动 effect 里的同步工作（P1 第 1 条）在首帧前叠加：样例文档很小，但仍要做一次 `serializeDocument` 基线（`App.tsx:820`）+ `extractOutline`/`countText`（`809-814`）。
- `SettingsDialog`/`ShortcutsDialog`/`FindBar`/`Outline` 已 `lazy`（`App.tsx:28-34`），剩余首屏体积在 `App.tsx` 本体 4,347 行与 `src/lib/*`。

**建议**：报表/导出/AI/risk/diff 这些非首屏模块改成按需 `import()`；启动基线延迟一帧或按 P1 的哈希方案；首屏 `setStats`/`setOutline` 放到 `requestIdleCallback`。

**难度** M

## P4 每次按键触发 2.3–2.5 次 App 提交，6 个常驻组件全量重渲染（无 memo）

**数字**（dev 5173，20 字，`render-dev.json`；StrictMode 只双调 render，不改 commit 数）

- 提交总数 **53**（≈2.5 次/键）。
- 每键重渲染：`App` 47 次，`FileMenu`、`FileTree`、`MarginRail`、`StatusBar`、`SaveDialog`、`CloseGuardDialog`、`PureEditorContent`、`Portals` 各 **50** 次。
- 热点组件全部是普通函数组件、无 `React.memo`：`StatusBar.tsx:18`、`MarginRail.tsx:33`、`FileTree.tsx:57`、`FileMenu.tsx:29`。
- `MarginRail` 的 `useLayoutEffect`（`App.tsx:1486-1509`）在**每次渲染**对每个 pending 批注调用 `editor.view.coordsAtPos()`；`tick` 每次 update/selection/scroll 都 +1（`App.tsx:1462-1484`），批注多时每键做 N 次坐标查询。
- 提交次数来源：`onUpdate` 里 `setDirty`/`setOutline`/`setStats`（1 次）+ `onSelectionUpdate` 的 `setSelection`/`setActiveOutline`（1 次）+ `tick` 的 rAF 一次（1 次），三次提交都重渲染整棵 App 树。

**复现**

```powershell
node .tmp/r17-perf/perf.mjs      # 第 4 段：dev 页面注入最小 React DevTools hook，数 PerformedWork 组件
```

**建议**：`StatsBar`/`FileMenu`/`FileTree`/`MarginRail` 加 `memo` 并稳定 props（回调用 ref 或 `useCallback`，对象拆成原始值）；把 `tick` 拆成独立 context，只让 `MarginRail`/页边层订阅；`coordsAtPos` 只在 `annotations` 或内容版本变化时算。

**难度** M

## P5 切换 30 次后堆不回落但也不累积：JS heap +1.4 MB，20/20 切换成功，无泄漏确证

**数字**（4174，`memory.json`；每次切换后 `HeapProfiler.collectGarbage` 再取 `Runtime.getHeapUsage`）

| 时点 | used heap |
| --- | --- |
| 启动稳定后（基线） | 28.73 MB |
| 打开第 3/6/9 个 100 KB 文档 | 29.98 / 30.18 / 30.34 MB |
| 10 次打开后 | 30.38 MB |
| 20 次切换（100 KB ↔ 60 KB）后 | **30.13 MB** |
| 结束 | 30.14 MB |

- 20 次切换全部成功（`doc-name` 跟随变化），**没有随切换线性增长**（20 次切换反而比 10 次打开低 0.25 MB），不构成「每次打开泄漏一篇」的证据；相对基线的那 +1.4 MB 是一次性缓存/字体/扩展，需要更长跑测才能定性。
- 监听器（CDP `DOMDebugger.getEventListeners`）：`window` 16 个（含 7 个 `dragstart` + 7 个 `dragend`）、`document` 23 个（含 Zotero/ABP 扩展注入项）。**没有基线快照，不能判定增长**；7 对 drag 监听偏多，下一轮应做「启动 vs 30 次切换后」两次采样。
- 计时器：测桩按创建栈记到 30 个 600 ms、60 个 1 ms `scheduleDestroy` 计时器，但本脚本清理钩子用错了 key（`clearTimeout` 按 native id 删除、表按自增 id 存），**这批计数不可信**，不作泄漏结论。修好后重跑 `.tmp/r17-perf/perf.mjs` 第 3 段即可。

**建议**：把 heap + 监听器 + 活动计时器做成脚本进 `scripts/`（现在 CI 只有体积门 `measure-first-screen.mjs`，没有运行时性能门）；切换路径已有 `loadEpochRef`/`draftGenerationRef` 等作废机制，暂不需要改代码。

**难度** L（只补测量）/ M（若后续证实监听器增长）

## 优化机会（最多 3 条，按性价比）

1. **一次序列化**：删掉 `App.tsx:725` 的全量 dirty 比较，序列化只留保存/草稿定时器。1 MB 每键 77 ms → 预计 10–15 ms，改动面一个 `onUpdate`。
2. **memo 四个常驻组件 + 稳定 props**：`StatusBar`、`FileMenu`、`FileTree`、`MarginRail`。每键 2.5 次提交 → 1 次，P4 的重复渲染基本消失。
3. **大文档阈值**：>256 KB 时跳过整篇基线序列化、草稿只写增量/延迟到 800 ms；顺带把 P1 的 9 s 打开降到大半（解析本身仍是大头，彻底解决要 Worker）。

## 待办 / 未验证

- 真机 WebView2 冷启动（本轮是 headless Edge + 本地静态服务）：FCP 556 ms 只能当上限参考。
- 真实 IME 组合输入下的每次按键成本（本轮只有 ASCII 直打）。
- 1 MB 文档 `applyHostPayload`/宿主打开路径是否同样 9 s 级阻塞（浏览器里走的是 localStorage 恢复路径）。
- 计时器/监听器泄漏需要修正测桩后重跑（见 P5）。
