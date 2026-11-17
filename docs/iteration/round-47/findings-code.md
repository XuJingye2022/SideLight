# 第 47 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`d429211164a6a94dfbcf6a580a857d9beb5371c6`（`git rev-parse HEAD` 实测一致）。收工时 `git status --porcelain` 只多未跟踪的 `docs/iteration/round-47/`、`shots/round-47/` 与 `.tmp/` 新脚本；**产品代码未改**。
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP **9225**（未启 Edge、未 kill msedge）、Node 24.21；每条 E2E 前跑 `node .tmp/reset.mjs 9225`。
- 本轮新写脚本（`.tmp/`，可复跑）：
  - `.tmp/e2e-r47-code-perf.mjs` → `.tmp/perf-round47-code.json`：100 KB / 1 MB 载入埋点、滚动帧、逐键（含 CPU 采样 `Profiler`）、选区派生代价、空闲、`Ctrl+S`、源码往返、堆与 DOM 计数、查找条 3 次输入。
  - `.tmp/e2e-r47-code-src.mjs` → `.tmp/perf-round47-src.json`：**源码模式逐键写放大**（100 KB / 200 KB，计量 `Storage.setItem` 次数、字节、耗时）。
  - `.tmp/e2e-r47-code-find.mjs` → `.tmp/perf-round47-find.json`：**查找条逐键代价**（`view.dispatch` 计时、`.find-hit` 元素数、索引与 `findAll` 纯函数耗时），并隔离测停笔 300 ms 派生链。
- 端到端走过的用户路径（每条都有截图）：
  1. 100 KB：载入 → 滚轮 20 次 → 文末打 12 字（CPU 采样）→ 保存 `Ctrl+S` → `Ctrl+/` 源码往返 → 堆/DOM 读数 → `Ctrl+F` 查找。`shots/round-47/code-100kb-{loaded,scrolled,saved,source,find-common,after}.png`
  2. 1 MB：同上。`shots/round-47/code-1mb-{loaded,scrolled,saved,source,find-common,after}.png`
  3. 源码模式逐键：100 KB / 200 KB 文档进源码 → 打 10 字（计量 localStorage）→ 退出。`shots/round-47/code-{100kb,200kb}-sourcetyping.png`
  4. 查找条逐键：100 KB / 1 MB，依次输入 `写` → `写作` → `写作。` → `写作。未` → `写作。未命`，每键记 `dispatch` 耗时与高亮数。`shots/round-47/code-{100kb,1mb}-find.png`
- 控制台：三条路径 **0 条 console error、0 条 pageerror、0 条 requestfailed**（`perf-round47-code.json` / `-src.json` / `-find.json` 的 `errors` 均为空）。

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | 查找条每键重建全文索引 + **给全部命中套 7.8 万个高亮 span**：1 MB 文档输入第一个字 `view.dispatch` **213 ms**，把查询改成无结果（清装饰）**260 ms**；索引只占 6.9 ms | **P2** | 1 MB：78,848 命中 → `dispatch` 213.2 / 260.4 ms；100 KB：8,192 命中 → 19.6 / 21.7 ms；`buildTextIndex` 6.9 ms、`findAll` 4.4 ms |
| F2 | 源码模式**每个键**都整篇写 `localStorage`：10 键 = 10 次 `setItem` = **10 倍文档字节**（100 KB 文档 1,034,995 B；200 KB 文档 2,038,515 B），无防抖、无 256 KiB 阈值豁免以外的限制 | **P2** | 10 键 / 10 次写 / 1,034,995 B 与 2,038,515 B；单次 0.1–0.8 ms；富文本路径同一份正文 300 ms 只写 1 次 |
| F3 | 死代码 6 处：`deleteFileToTrash` **31 行 0 调用**、`shouldWriteCurrent` 恒等包装 + 5 处 TS6133（第 45/46 轮已报，仍未修） | **P2** | `git grep` 2 命中（1 条是注释）；`tsc --noUnusedLocals` 5 条 error；约 −40 行 |
| F4 | 测试盲区：14 个 `src/lib/*.ts` 无单测，含第 44 轮 P1 修复所在的 `taskListInput.ts` 与第 46 轮新增的 `mermaidPreview.ts` | **P2** | 29 个测试文件 / 372 个 `test(` 块；`src/App.tsx`（5,471 行）0 单测 |
| F5 | 第 46 轮 F1（空基线 + 脚注定义 → 每次保存整篇 `classify`）**未修**：`risk.ts:376-383` 逐字未变 | **P2** | 代码复核；第 46 轮实测 1 MB 每次保存 78.5 ms（本轮未重测，见 UNVERIFIED） |
| F6 | 第 45/46 轮 F2（一次停笔 4× 写放大）**未修**：两处 `persistDocKey`、同键删两次草稿仍在 | **P2** | `App.tsx:927-931`、`2669-2673`、`2684-2685` 行号未变；第 46 轮假 FSA 实测 147 KB 文档写 591 KB |

`actionable_count = 6`（F1–F4 本轮新发现，F5/F6 是上一轮已报、本轮复核仍未修；六条都有本轮命令输出或代码行号）。

**没有发现新的功能 BUG**：载入、滚动、逐键、保存、源码往返、查找、源码模式输入七条路径全部跑通；`Ctrl+S` 一次序列化、退出源码不重解析、写盘提示正确。F1/F2 是性能/写放大问题，F3/F4/F5/F6 是代码质量与测试问题。

---

## F1（P2，新）查找条每键重建索引 + 给全部命中套高亮：1 MB 文档 213 / 260 ms

### 1.1 代码路径

- 查找框 `onChange` 直接 `setQuery`，没有防抖：`src/components/FindBar.tsx:56-59` → `src/App.tsx:4859`。
- 查询变化 → 同步重建全文索引并跑 `findAll`：`src/App.tsx:1805-1815`（`buildTextIndex` + `findAll`，`tick`/`query` 都在依赖里）。
- 命中数变化 → 给**每一条命中**建一个 `Decoration.inline`：`src/lib/decorations.ts:68-76`；`src/App.tsx:1817-1819` 在 `matches`、`matchIndex` 任一变化时重跑，所以按 Enter 跳下一处也会重建整套装饰。
- 源码模式例外：查找整体锁住（第 42 轮），不在本条范围内。

### 1.2 实测（`.tmp/e2e-r47-code-find.mjs` → `.tmp/perf-round47-find.json`）

同一份 1,025 段正文，只差段长；`写` 是正文里的常见字：

| 输入 | 文档 | 命中数 | `view.dispatch` | `.find-hit` 元素 |
| --- | --- | --- | --- | --- |
| `写` | 100 KB | 8,192 | **19.6 ms** | 8,192 |
| `写` | **1 MB** | **78,848** | **213.2 ms** | **78,848** |
| 改成 `写作`（无结果，清空装饰） | 100 KB | 0 | 21.7 ms | 0 |
| 改成 `写作`（无结果，清空装饰） | **1 MB** | 0 | **260.4 ms** | 0 |
| 继续加字（仍无结果） | 两者 | 0 | 0.1 ms | 0 |

纯函数代价（页面内 `import('/src/lib/annotations.ts')`、`find.ts` 同法量）：

| 函数 | 100 KB | 1 MB |
| --- | --- | --- |
| `buildTextIndex(doc)` | 0.6 ms | **6.9 ms** |
| `findAll(index, '写作', …)` | 0.3 ms | 2.2 ms |
| `findAll(index, '写', …)` | 0.9 ms | 4.4 ms |

读数说明：

1. 1 MB 文档里查一个常见字，**94% 的代价在装饰与 DOM**（213 ms 里索引 + 查找只占 ~11 ms），因为 `renderFind` 给全部 78,848 处都建 `Decoration.inline`，ProseMirror 会为每一处生成一个 `<span class="find-hit">`（实测 `document.querySelectorAll('.find-hit').length === 78848`；查找前 `Memory.getDOMCounters` 是 `nodes: 5,282`）。
2. 清空查询同样贵：`dispatch` 260 ms 是在拆掉上一次的 78,848 个 span。用户改一个字（`写` → `写作`）就会付一次 260 ms。
3. 100 KB 文档量级可接受（19.6 / 21.7 ms），**本条只针对大文件**；普通 10–100 KB 文档不受影响。
4. 只在 dev 下量（见 UNVERIFIED 3），但 213 ms 的主体是 DOM 创建/销毁，生产构建不会消失。
5. 这不是「查找慢」，是「高亮无上限」：命中数随文档与查询词增长，没有上限或可视区限制。

### 1.3 改法（低风险，可度量）

1. **查询防抖 150 ms**（`FindBar` 的 `onQueryChange` 或 App 里加一个 `deferredQuery`），输入 `写作。未命` 5 个键从 5 次重建降到 1 次。
2. **高亮设上限**：`renderFind` 只装饰前 N 条（例如 2,000）或只装饰当前命中 ± 200 条的窗口；`find-count` 仍显示真实总数（`matches.length`）。`find.ts`/`buildTextIndex` 不动，计数与跳转语义不变。
3. 可选：`renderFind` 复用上一份 `DecorationSet` 的 `Decoration` 对象，只在 `matchIndex` 变化时改 `is-current` 类——省掉跳转时整套重建。

收益：1 MB + 常见字从 213 / 260 ms 降到 ≤20 ms（按 2,000 条装饰线性估算）；100 KB 从 19.6 ms 降到 ~7 ms（索引 + 查找）。风险：低——影响面只在查找高亮，`find.test.ts` 与查找 E2E 覆盖计数与跳转。

---

## F2（P2，新）源码模式每个键整篇写 localStorage：10 键 = 10 倍文档字节

### 2.1 代码路径

`src/App.tsx:1895-1910`：`useEffect` 依赖 `[sourceMode, sourceText]`，源码 textarea 每输入一个字符就 `setSourceText` → effect 运行 → 第 1906 行 `persistDocKey(sourceText)`。`persistDocKey`（`App.tsx:642-650`）做 `JSON.stringify({ text, name, savedAt })` 后 `localStorage.setItem`；唯一的护栏是 `text.length > 256 * 1024` 跳过。

对比富文本路径：同一份正文的 `persistDocKey` 在 300 ms 派生链里（`App.tsx:914-931`），一次停笔只写 1 次。两条路径**同一件事，两种节流**。

### 2.2 实测（`.tmp/e2e-r47-code-src.mjs` → `.tmp/perf-round47-src.json`，`Storage.prototype.setItem` 包装计量）

进源码模式后连打 10 个字：

| 文档 | 输入 | `setItem` 次数 | 累计字节 | 单次耗时 | 长任务 |
| --- | --- | --- | --- | --- | --- |
| 100 KB（101,385 B） | 10 字 | **10** | **1,034,995 B**（≈10× 文档） | 0.1–0.4 ms | 0 |
| 200 KB（201,737 B） | 10 字 | **10** | **2,038,515 B**（≈10× 文档） | 0.2–0.8 ms | 0 |

- 写放大 = **键数 × 文档字节**：打 100 个字就是 100 次全量 JSON 序列化 + 同步写；100 KB 文档 ≈ 10 MB 写入。
- 单次 0.1–0.8 ms 不会造成卡顿（这解释了为什么前几轮没被 UI 视角发现），但它是无上限的写放大，且与「缓存只写 `.sidelight/`、大文件不撑配额」的设计意图相反：200 KB 文档会反复写满 localStorage，把同一 origin 下 `sidelight.doc.v1` 之外的配额（草稿兜底）挤掉。
- 256 KiB 以上被跳过（`persistDocKey` 的阈值），所以 1 MB 文档反而不写——**阈值保护的是大文件，放大的是 100–256 KiB 这一档**。

### 2.3 改法（低风险，可度量）

在 `App.tsx:1896` 的 effect 里把 `persistDocKey(sourceText)` 换成 300 ms 防抖（复用 `deriveTimerRef` 或新开一个 timer，卸载/切文档时清掉）。与富文本路径同一节流口径。

收益：10 键从 1,034,995 B 降到 ≈103,500 B（−90%），200 KB 档从 2,038,515 B 降到 ≈203,852 B。风险：低——崩溃恢复窗口从「每键」变成「停笔 300 ms 后」，与富文本路径持平；`save-acceptance` / `draft-acceptance` 覆盖保存与草稿。

---

## F3（P2，新）死代码 6 处：`deleteFileToTrash` 31 行 0 调用 + 5 处 TS6133 未修

### 3.1 `deleteFileToTrash`（`src/lib/trash.ts:119-149`）

`git grep -nF deleteFileToTrash -- src scripts host host-mac` 只有 2 条命中：

```
src/lib/trash.ts:120:export async function deleteFileToTrash(
src/lib/trash.ts:383:    // 与 deleteFileToTrash 一致：去掉 workspace 根目录名   ← 注释
```

真正的删除入口是 `deleteDocumentToTrash` → `deleteFileWithText`（`trash.ts:310-333`），它多写了 `.current.md`。`deleteFileToTrash` 是它的早期版本：31 行、0 调用、0 测试。删掉它零语义变化（`restoreFromTrash` 里那句注释改成「与 deleteFileWithText 一致」即可）。

### 3.2 `shouldWriteCurrent`（`trash.ts:152-154`）

```ts
export function shouldWriteCurrent(text: string | null): boolean { return text !== null }
```

唯一调用点 `trash.ts:195` 是 `if (text !== null && shouldWriteCurrent(text))`——已经判过一次空。删函数、保留 `if (text !== null)` 即可。

### 3.3 第 45/46 轮已报的 5 处 TS6133，本轮仍未修

`npx tsc --noEmit --noUnusedLocals --noUnusedParameters`（HEAD 实测，5 条 error，exit 1）：

```
src/App.tsx(9,10): error TS6133: 'TextSelection' is declared but its value is never read.
src/App.tsx(18,10): error TS6133: 'InlinePopover' is declared but its value is never read.
src/App.tsx(142,7): error TS6133: 'SAMPLE' is declared but its value is never read.
src/App.tsx(607,9): error TS6133: 'lastClearIdRef' is declared but its value is never read.
src/lib/trash.ts(242,13): error TS6133: 'legacy' is declared but its value is never read.
```

`lastClearIdRef` 行号从第 46 轮的 605 漂到 607（App.tsx 又长了 2 行）。合计约 −40 行。改法不变：删这 6 处，再在 `tsconfig.json` 打开 `noUnusedLocals`/`noUnusedParameters` 挡住下一处。

---

## F4（P2，新）测试盲区：14 个 lib 模块 0 单测，含两个新功能模块

`src/lib` 下 29 个测试文件，覆盖 29 个模块；**14 个模块没有同名测试**：

```
ai.ts  assetImage.ts  codeScan.ts  decorations.ts  hostBridge.ts  katexLoader.ts
mathInput.ts  mermaidLoader.ts  mermaidPreview.ts  outlineTree.ts  rename.ts
tableReuse.ts  taskListInput.ts  workspace.ts
```

按风险挑两条最该补的：

1. **`taskListInput.ts`（第 44 轮新功能，0 单测）**：`TASK_MARKER = /^\s*\[([ xX])\] $/`（`taskListInput.ts:12`）就是第 44 轮 P1 修复的正则，当时踩过「`\s$` 把 Enter 也算成空格」的坑（AGENTS §8）。3 条单测即可锁住：`- [ ] ` 命中、`- [x] ` 命中、末尾换行/回车路径不命中。
2. **`mermaidPreview.ts`（第 46 轮新逻辑，0 单测）**：`renderKey = theme|hash`、`domKey = renderKey@pos`、切主题清三个缓存 + 清定时器（`mermaidPreview.ts:64-104`）。现在是模块级可变状态，单测难写；把 `keyFor(theme, hash)` 与「哪些 domKey 应被保留」抽成纯函数即可测 2 条，第 46 轮那个「key 不变时 ProseMirror 复用旧 DOM」的坑就不会回归。

另外 `src/App.tsx`（5,471 行 / 217,112 B）0 单测——这不是新结论（第 43–46 轮已三次论证拆分成本大于收益），本轮只登记「本轮 4 条新发现里 2 条（F1/F2）都在 App.tsx，都只能靠 E2E 发现」。

---

## F5（P2，复核未修）第 46 轮 F1：空基线 + 脚注定义 → 每次保存整篇 `classify`

`src/lib/risk.ts:371-383` 逐字未变：

```ts
export function activeLosses(original: string, current: string, baseline: Loss[]): Loss[] {
  // 基线为空但原文有脚注定义时仍要分类，其余文档保持原有的早退
  if (baseline.length === 0 && !FOOTNOTE_DEFINITION.test(original)) return []
  const baselineKeys = new Set(...)
  return classify(original, current).filter((loss) => loss.blocking && (...))
}
```

基线为空时 `baselineKeys` 是空集合，`filter` 只可能留下 `footnote-loss`，但 `classify` 仍把六族损失全算一遍（含 `diffLines` 全文行差分 `risk.ts:347`）。两个调用点都在保存链上：`App.tsx:2940`（手动保存）与 `App.tsx:3215`（停笔 2 s 自动保存）。

第 46 轮实测：1 MB 文档 `activeLosses` 78.5 ms / 100 KB 83.5 ms，真实自动保存周期出现 2 条 100 ms longtask。本轮为保时间预算没重跑该测量（只读角色，改法见第 46 轮报告 §1.3：空基线时只跑 `footnoteLosses`）。修复后 `diff.test.ts:248-260` 两条用例可验证等价性。

## F6（P2，复核未修）第 45/46 轮 F2：一次停笔仍写 4 遍同一份正文

行号本轮复核未变：

- 两处 `persistDocKey`：派生链 `App.tsx:929-931` + `finishSaved` `App.tsx:2669-2673`；
- 同一草稿删两次：`App.tsx:2684-2685`（`removeCache(dir, 'draft', cacheKey(oldName))` 与 `cacheKey(name)`，同键时重复）；
- 草稿先 `write("")` 建文件再写正文（`cache.ts` 的调用处，第 46 轮已记）。

第 46 轮假 FSA 实测：147 KB 文档一次停笔 `getMarkdown` 12 次、localStorage 2 次 / 296,934 B、草稿 147,016 B + 删 2 次、正文 147,017 B → 一份 147 KB 写了 **591 KB**。本轮为保时间预算没重跑假 FSA；代码路径未变，数字仍成立。

---

## 4. 本轮实测数据（dev + StrictMode，脚本形状与第 46 轮相同，可直接对比）

| 指标 | 100 KB（101,385 B / 1,025 段） | 1 MB（1,025,033 B / 1,025 段） |
| --- | --- | --- |
| 载入 wall（reload → 正文可见） | **916 ms**（第 46 轮 715） | **2,698 ms**（第 46 轮 2,627） |
| `sl-load-start → sl-parse-done` | 150.5 ms（第 46 轮 144.9） | **975.9 ms**（第 46 轮 972.7） |
| `→ serialize-done / → sync-done` | 157.2 / 159.9 ms | 985.7 / 1,010.4 ms |
| 滚动 20 次（rAF 帧间隔） | 55 帧、中位 16.6、p95 **18.0**、max 18.7 ms | 54 帧、中位 16.8、p95 **17.7**、max 22.7 ms |
| 逐键 12 字（真按键，文末） | 中位 **20 ms**、p95 26 ms、longtask **0** | 中位 **29 ms**、p95 36 ms、longtask **0** |
| 逐键 `getMarkdown`（脏判定） | 12 次、中位 1.9、max 2.2 ms | 12 次、中位 2.5、max 3.2 ms |
| 逐键 `dispatch` | 36 次、中位 0.1、max 5.7 ms | 38 次、中位 0.1、max 10.9 ms |
| 逐键 CPU 采样（12 键） | 顶层 `jsxDEV` 47.3% / `App` 2.2% / `formatStats` 0.9% | `jsxDEV` 33.3% / `onUpdate` 2.7% / `collapseBlankParagraphs` 2.7% / `encodeTextForMarkdown` 2.4% / `collectTables` 2.1% |
| 选区派生（每键同步） | `readBlocks` 0.1 ms、`buildContext` 0 ms、`extractOutline` 0 ms | `readBlocks` 0.1 ms、`buildContext` 0 ms、`extractOutline` 0 ms、`countText(doc.textContent)` **24.2 ms**（180 ms 防抖后跑一次） |
| 空闲 3.5 s | `getMarkdown` 1 次（3.1 ms）、localStorage **1 次 / 103,501 B**、longtask 0 | `getMarkdown` 1 次（1.7 ms）、localStorage **0 次**（>256 KiB 跳过） |
| `Ctrl+S`（浏览器无落点） | `getMarkdown` **1** 次（1.4 ms）、提示「已取消保存。」 | **1** 次（1.9 ms）、同 |
| 源码往返 1 次（`Ctrl+/`） | 进 90 ms、出 75 ms；`sl-parse-done` 2→2→2 | 进 398 ms、出 203 ms；`sl-parse-done` 2→2→2 |
| 强 GC 后 `usedJSHeapSize` / 可见节点 | 59,047 KB / 1,108 | 67,204 KB / 1,108 |
| `Memory.getDOMCounters` | `{documents:1, nodes:5,282, jsEventListeners:289}` | 同 |

旧结论复核：

1. **保存路径没有重复全文序列化**：浏览器态 `Ctrl+S` 1 次 `getMarkdown`（1.4–1.9 ms），与第 42–46 轮一致。
2. **逐键不卡**：1 MB 中位 29 ms / p95 36 ms（第 46 轮 27/31），longtask 0 条；CPU 采样里最大头是 dev 模式的 `jsxDEV`（StrictMode），不是产品逻辑。
3. **滚动 60 fps**：p95 18.0 / 17.7 ms，与第 43–46 轮同量级。
4. **退出源码不重解析**：`sl-parse-done` 进/出前后都是 2 条（StrictMode 两遍）。
5. **每键 `readBlocks`/`buildContext` 不是瓶颈**：1 MB 合计 0.1 ms（原本怀疑每次选区变化都复制全文，实测 V8 复制 1 MB 的 1,025 段只花 0.1 ms）。**不提为改进项**。
6. **停笔 300 ms 派生链不是瓶颈**：隔离实测 `getMarkdown` 2.5 ms + 五段全文修复合计 **1.3 ms**（1 MB），未出现 longtask；主脚本空闲窗口里偶发过一条 71 ms longtask，隔离复跑未复现（见 §7-2），不据此立条目。

## 5. 试过、但判断没有问题的路径（防敷衍的 0 条）

1. **逐键全文复制（`readBlocks`）**：`App.tsx:157-163` 每次选区变化都 `node.textContent` 复制全文，1 MB 实测 0.1 ms、`buildContext` 0 ms——**不是问题**，不提。
2. **大纲提取**：`extractOutline` 每次选区变化跑一遍，1 MB 0 ms（1 个标题）——不提。
3. **字数统计**：`countText(doc.textContent)` 1 MB 24.2 ms（含 1 MB 字符串物化），在 180 ms 防抖后跑一次，低于 longtask 门槛；作为打字后的后台成本可接受——不提。
4. **空闲期 localStorage**：100 KB 1 次 / 103,501 B、1 MB 0 次，属 F2/F6 同一族，不另立条目。
5. **跨文件重复代码**：自写 `.tmp/r47-dups.mjs` 归一化后找 ≥8 行、≥200 字符的重复块（跨文件或同文件非相邻），**0 条命中**；`App.tsx` 内部也无整段抄写。重复代码这一轴本轮没有可报项。
6. **`Ctrl+S` 与源码往返无重复全文计算**：见 §4-1、§4-4；源码模式保存走 `sourceText`，不额外序列化。
7. **控制台/请求**：三条脚本 0 console error、0 pageerror、0 requestfailed。
8. **监听器清理**：`App.tsx:1929-1951`（editor 事件 + scroll + resize）、`mermaidPreview.ts:144-161`（MutationObserver + matchMedia）都在 cleanup 里注销/断开；本轮没有找到未清理的监听器。

## 6. 代码质量读数（口径同第 46 轮）

- `src/App.tsx` **5,471 行 / 217,112 B**（第 46 轮记 5,454 行 / 215,972 B，本轮实测略增），仍是最大单文件；拆分成本大于收益的结论第 43–46 轮已论证，不重复提。
- 29 个 `*.test.ts` / 372 个 `test(` 块 / 856 处 `assert.*`（AGENTS.md 记 384 条，口径不同：那里可能按断言计或含 `it(`）。
- `.tmp/r47-exports.mjs`：跨文件 0 引用的 **exported 函数**只有 `deleteFileToTrash`（F3）；其余未引用项都是 `type`/`interface`（类型导出没有引用是正常的）或只被 `scripts/*.mjs` 用（`serializeDocumentBody`）。
- 第 46 轮两条发布链改动（`installer.ps1`/`verify-installer.ps1`）本轮不在只读范围，未审。

## 7. UNVERIFIED

1. **F1 修法的实际收益**：只读角色未应用改动；按 2,000 条装饰线性估算 ≤20 ms，未实测。补测：加防抖 + 上限后在同一 1 MB 文档重跑 `.tmp/e2e-r47-code-find.mjs`，看 `dispatchMax`。
2. **主脚本 1 MB 空闲窗口里的一条 71 ms longtask**：`perf-round47-code.json` 的 `idle.longtasks: [71]`，隔离复跑（`-find.json` 的 `settle`，同样 12 键 + 2.6 s 窗口）为 `[]`。归因未定（怀疑是前一步 `countText`/GC，非产品逻辑），**不立条目**。
3. **生产构建的数字**：全部数字来自 dev server + StrictMode；`jsxDEV` 占 CPU 采样 33–47%，生产应显著更低。F1 的 213 ms 主体是 DOM 创建，预计生产降幅小于逐键开销。
4. **F5/F6 本轮未重测**：只复核了行号与代码未变；第 46 轮数字沿用。补测：重跑 `.tmp/e2e-r46-code-writes.mjs`（假 FSA）与 1 MB 脚注文档的自动保存 longtask。
5. **F1 在 TrueType 字体/缩放下的表现**：本轮只测 100% 缩放、默认字号；150%/200% 缩放与不同字号未测（第 46 轮同款 UNVERIFIED）。
6. **查找高亮后的 DOM 总节点数**：只量到 `.find-hit` 78,848 个与查找前 `nodes: 5,282`；查找后的 `Memory.getDOMCounters` 未取。

## 8. 环境与脚本坑（本轮新增）

1. **`page.keyboard.insertText` 的返回早于 React/PROSEMIRROR 的同步效果**：`insertWall` 只有 6–27 ms，而真正的 `view.dispatch` 213 ms 发生在输入事件内、由我的 `dispatch` 包装计到。要量用户感知的卡顿，**以 dispatch/长任务计时为准，不要用 CDP 往返时间**。
2. **`.find-hit` 元素数等于命中总数**：ProseMirror 不虚拟化，整篇 1 MB 文档的 1,025 段都在 DOM 里；给全部命中套 `Decoration.inline` 会真的生成 7.8 万个 span。用 `document.querySelectorAll('.find-hit').length` 就能一眼看出高亮规模。
3. **`Storage.prototype.setItem` 包装在源码模式仍能计到**：React 的 state 更新与 effect 都在离散输入事件内同步跑完，所以包装器能逐键记录（10 键 10 条）。
4. **页面里 `import('/src/lib/*.ts')` 与 `window.__ed`（React fiber 找 Tiptap 实例）组合**，可以量任意导出函数的真实代价，避免在 Node 里复制源码造成漂移；`readBlocks` 是 `App.tsx` 内部函数，只能按源码复刻（本轮 0.1 ms，与 `countText` 24.2 ms 对比说明复制本身不贵）。
