# 第 41 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`25297acee40d40fec4bcbe770c416f43faaf2d7a`（`git rev-parse HEAD` 实测一致）
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP 9225（页面级 WS 直连，浏览器级 `connectOverCDP` 本轮超时，见 §7）、Node 24.21
- 端到端脚本（全部本轮新写，`.tmp/`）：
  - `.tmp/e2e-r41-code-parse.mjs` → `.tmp/perf-round41-parse.json`（parse 段拆解）
  - `.tmp/e2e-r41-code-ext.mjs` → `.tmp/perf-round41-extensions.json`（逐个摘 marked 扩展）
  - `.tmp/e2e-r41-code-lean.mjs` → `.tmp/perf-round41-lean.json`（1 MB 直测 + 精简扩展）
  - `.tmp/e2e-r41-code-chunk.mjs` → `.tmp/perf-round41-chunk-proto.json`（分块 lex 原型）
  - `.tmp/e2e-r41-code-typing.mjs` → `.tmp/perf-round41-typing.json`（100 KB 逐键 / 保存 / localStorage / 内存）
  - `.tmp/e2e-r41-code-shot.mjs` → `shots/round-41/code-100kb-typing.png`
- 复跑前先 `node .tmp/reset.mjs 9225`。**注意：如果 9225 上还留着 1 MB 文档，`connectOverCDP` 会整段超时**（本轮实测 20 s / 45 s 两次超时），要先按 §7 处理。

---

## 结论摘要（6 条，按优先级）

| # | 标题 | 级别 | 指标 |
| --- | --- | --- | --- |
| F1 | 1 MB 载入 ≈110 s/遍：二次方在 marked 的扩展扫描，不在我方的 escape/protect/JSON 转换 | **P0** | 37,450 段 107,885 ms；同文本裸 marked 12.9 ms |
| F2 | 每个按键做一次整篇 `serializeDocument`（脏检查），300 ms 后又重算一次 | P1 | 100 KB：3.69 ms/次、10 键 11 次、input 24.43 ms |
| F3 | 每次选区变化遍历整篇两次（`readBlocks` + `extractOutline`），并重建句子上下文 | P1 | 代码证据（App.tsx:961-976），1 MB 时随段落数线性放大 |
| F4 | 可载入上限 5.5 MiB 与实际可用尺寸脱节：1 MB 已需 110 s（生产单遍） | P2 | 见 F1；round-40 实测整篇载入 222,472 ms |
| F5 | 草稿链与保存链产出不同字节；repair 链重复两份 | P2 | 少 3 个收尾步骤（`reuseTables`/`collapseBlankParagraphs`/`applyTrailingNewlines`） |
| F6 | 性能没有门禁：`perf-longdoc.mjs` 指向已禁用的 5173、结尾 `browser.close()`、1 MB 必超时 | P2 | 不在 `npm test` / CI 里 |

`actionable_count = 6`（全部有本轮实测或文件:行号证据；F3 只有代码证据，见该条末尾说明）。

---

## F1（P0）1 MB 载入 110 s：耗时 99% 在 `lexer.lex`，而 `lex` 的二次方来自 tiptap 注册的 marked 扩展

### 1.1 先把第 39/40 轮留下的「parse 段 = 110 s」拆开

在 9225 页面里拿到真 editor 实例（React fiber 上找 `memoizedProps.editor`，见 `.tmp/e2e-r41-code-parse.mjs`），用真 `manager` 对同一份生成文本逐段计时（同段数、同字符数）：

| 样本 | 段落 | 字符 | `escapeHtmlForParse` | `protectMathPairs` | `manager.parse` | `lexer.lex` | `parseTokens` | `splitTableCellBreaks` | `nodeFromJSON` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | 1 | 102,399 | 0.3 ms | 0 ms | 8.4 ms | 2.7 ms | 0.2 ms | 0 ms | 0.1 ms |
| B | 1,000 | 102,009 | 0 ms | 0 ms | 142.6 ms | **139.5 ms** | 0.7 ms | 0.2 ms | 0.4 ms |
| D | 2,000 | 204,009 | 0.1 ms | 0 ms | 546.3 ms | **552.2 ms** | 1.5 ms | 0.1 ms | 0.4 ms |
| E | 4,000 | 408,009 | 0.3 ms | 0 ms | 2,206 ms | **2,234.5 ms** | 2.9 ms | 0.2 ms | 0.4 ms |

（`.tmp/perf-round41-parse.json`；`lexerCountPerParse = 1`，所以不是 tiptap `isParagraphContinuation` 每段 new Lexer 的问题。）

结论：`src/App.tsx:993` 三个我方函数（`escapeHtmlForParse` / `protectMathPairs` / `splitTableCellBreaks`）+ `schema.nodeFromJSON`（`:995`）加一起 **≤ 1 ms**，`manager.parse` 的耗时和 `lexer.lex` 相等。第 39 轮留下的「下一轮把 parse 再拆三段」已经没有必要——我方前后处理不是瓶颈，**marked 的 lex 是**。

### 1.2 同一份文本，裸 marked 是线性的

Node + `marked@17.0.6`（`node_modules/marked/lib/marked.esm.js`，与 `@tiptap/markdown` 用的同一份）直接 `new Lexer({}).lex(text)`：

| 段落 | 字符 | tokens | lex 耗时 |
| --- | --- | --- | --- |
| 1,000 | 102,009 | 2,000 | 7.3 ms |
| 2,000 | 204,009 | 4,000 | 3.3 ms |
| 4,000 | 408,009 | 8,000 | 6.6 ms |
| 8,000 | 816,009 | 16,000 | 12.9 ms |

裸 marked 在 4,000 段时 6.6 ms，应用里同一份文本 2,234.5 ms → **约 340×**。差值来自 `manager.markedInstance.defaults.extensions`（tiptap 各扩展注册的 block / startBlock tokenizer）。

### 1.3 逐个摘扩展定位

同一份 400 KB / 4,000 段文本，只换 `defaults`：

| 选项 | lex 耗时 | 相对全量 |
| --- | --- | --- |
| 全量 `base` | 2,183.3 ms | 100% |
| `extensions: undefined, tokenizer: undefined` | **7.6 ms** | 0.35% |
| 只摘 inline 扩展 | 2,175.4 ms | 99.6% |
| 摘 block 扩展 | 790.4 ms | 36% |
| 摘 startBlock 扩展 | 1,412.0 ms | 65% |
| 逐个摘 8 个 block tokenizer | 其中 2 个各降 ~700 ms，其余不变 | — |

（`.tmp/perf-round41-extensions.json`。）

根因在 `node_modules/marked/lib/marked.esm.js:46` 的 `blockTokens`：**每产出一个 block token**，都对「剩余整篇 src」（`e.slice(1)`）跑一遍每个 `startBlock`：

```js
let i = e;
if (this.options.extensions?.startBlock) {
  let s = 1/0, a = e.slice(1), o;
  this.options.extensions.startBlock.forEach(l => { o = l.call({lexer:this}, a); ... });
  ...
}
```

而 tiptap 注册进去的 `startBlock`（`.tmp/perf-round41-extensions.json.startBlock`）里有两条 O(剩余长度)：

- `(src) => src.indexOf("$$")`（`$$` 块公式，出现两次）
- `(src) => { const lines = src.split("\n"); if (lines.length < 2) return -1; const sep = lines[1]; ... }`（表格：**每次都把剩余整篇 split 成行数组**再取第 2 行）

段落数 n 时，逐 token 扫描的总量 ≈ n × 剩余长度 → **O(n²)**，且 `split` 是带分配的 O(n)（4,000 段时每次调用分配 ~4,000 行）。这正好解释 1,000→2,000→4,000 段的 142→546→2,206 ms（每翻倍 ×3.9~4.0）。

### 1.4 1 MB 实测（本轮直接量）

同一份代码路径，37,450 段 / 1,011,159 字符：

| 项 | 实测 |
| --- | --- |
| `new M.Lexer(defaults).lex(text)` | **107,885.3 ms**（74,900 tokens） |
| 去掉 math 两条 `startBlock` 后（`lean`） | 106,802.5 ms（只快 1%） |
| tokens 序列是否相同 | 相同（`tokensSame: true`） |

（`.tmp/perf-round41-lean.json`。）与第 40 轮应用级实测（`.tmp/perf-round40-load.json`：1 MB 整篇 `firstToParse` **108,501 ms**、dev StrictMode 两遍共 222,472 ms）互相印证：**载入耗时几乎全部就是这一次 lex**。

**顺带否掉一个便宜方案**：文档里没有 `|` 也没有 `$$` 时，把公式/表格扩展摘掉只省 1–4%（2,191.2 → 2,101.5 ms；1 MB 只省 1%）——因为 8 个 block tokenizer 本身就是每候选 O(剩余)，不是只有 startBlock 贵。所以「预扫后跳过不用的扩展」**不够**。

### 1.5 候选修法（按风险从低到高）

1. **按安全边界分块 lex，再拼 token 流**（实测最快、风险中等）。原型：只在围栏外空行处切块：
   - 4,096 字符块：4,000 段 lex **34.6 ms**（长 191 块），vs 2,200 ms → **64×**
   - 16,384 字符块：lex 69.1 ms（50 块）
   - 代价：每块必须 **new 一个 Lexer**（原型复用了同一个 Lexer，marked 的 `inlineQueue` 会累积，token 数从 8,000 涨到 751,565、结构不等价：`.tmp/perf-round41-chunk-proto.json` 的 `sameStruct:false`）。修法：每块 `new M.Lexer(base)` + `lexer.lex(chunk)`，再把 token 数组 concat；`parseTokens` 用拼好的整串 token 调一次。
   - **必须先验证等价性**：松列表（`1. a\n\n2. b`）与跨空行的 HTML 块（`<!-- a\n\nb -->`）会被切错；围栏已可用 `src/lib/risk.ts:36 fenceMap` 判断。验收口径：对 `docs/`/`shots/` 里的真实样本和现有 27 个测试文件 + `npm run roundtrip` 做「保存字节逐字节不变」对比。
2. **只在小文档走扩展、大文档降级源码模式**（最低风险、产品决策）：已有先例——`src/App.tsx:2093` 对含引用式定义的文档 `enterSourceFor(text, true)`；可把「> 256 KB 或 > 5,000 段」也直接进源码模式并给一句可见提示。1 MB 立即变成近 0 ms，代价是富文本视图。
3. **替换 lexer / 换第三方**：ADR 层面的改动，本轮不建议（要先试 1、2）。

## F2（P1）每个按键都做一次整篇 `serializeDocument`（脏检查），300 ms 后再算一遍

`src/App.tsx:885-893`：

```ts
onUpdate: ({ editor: current, transaction }) => {
  ...
  if (baselineRef.current !== null) {
    const dirtyNow = contentRef.current().replace(/\r\n/g, '\n') !== baselineRef.current   // ← 每键整篇序列化
```

`contentRef.current` = `currentMarkdown()`（`src/App.tsx:2781-2790`）→ `serializeDocument`（`src/lib/serializeDocument.ts:50-66`）：`getMarkdown()` + `repairFootnoteRefs` + `repairTildes` + `repairMath` + `repairHtml` + `repairCalloutMarkers` + `reuseTables` + `collapseBlankParagraphs` + `joinFootnotes` + `joinFrontmatter` + `applyTrailingNewlines`。

100 KB 实测（`.tmp/perf-round41-typing.json`，真 CDP 按键 `Input.insertText`）：

| 指标 | 值 |
| --- | --- |
| 10 个按键触发 `editor.getMarkdown()` | **11 次**（10 次脏检查 + 1 次 300 ms 派生） |
| 每键 input 事件同步耗时（捕捉→冒泡） | 平均 **24.43 ms**，最大 61.1 ms（第 39 轮同口径 p50 14 ms） |
| 单次整篇 `serializeDocument`（直接调用） | **6.7 ms** |
| 单次 `getMarkdown`（11 次的平均） | **3.69 ms** |
| 按 100 KB 线性外推 1 MB | ≈ 37–67 ms/键，**每个按键** |

同一时间窗内 localStorage 只写了 1 次（见 F5），所以放大不在存储，在**键盘路径上的整篇序列化**。

另外 `src/App.tsx:901-908` 的 300 ms 派生又算了一条**近似但不相同**的链（少了 `reuseTables`/`collapseBlankParagraphs`/`applyTrailingNewlines`，见 F5），也就是说一次停笔：1× 脏检查串行 + 1× 派生 + 2 s 后 1× autosave `prepareSave()`（`src/App.tsx:3165`）= 三次整篇序列化。

**改法（低风险、可度量）**：任何用户事务（`transaction.docChanged` 且 `addToHistory !== false`）先把 `dirtyRef` 置 true，脏检查改成 150 ms trailing 的单次核对（复用它本来就要做的派生结果），撤销回基线的自动变干净仍保留；`dirty` 状态在保存/切换/关窗前强制核对一次。预期 100 KB 单键 24.4 ms → ~15 ms，1 MB 每键省 1 次整篇序列化。

## F3（P1）每次选区变化遍历整篇两次

`src/App.tsx:961-976`：

```ts
onSelectionUpdate: ({ editor: current }) => {
  const { from, to } = current.state.selection
  const context = buildContext(readBlocks(current), from, to)      // 遍历所有顶层节点，拼 textContent
  ...
  setActiveOutline(activeOutlineId(extractOutline(current.state.doc), from))   // 再遍历一次
```

- `readBlocks`（`src/App.tsx:156-162`）对每个顶层节点取 `node.textContent`：37,450 段时每移动一次光标都做一遍。
- `extractOutline`（`src/lib/outline.ts`）再遍历一遍。
- 选区变化比按键更频繁（方向键、点击、拖选）。

**证据性质**：只有文件:行号，本轮没有单独实测这段（时间用在了 F1 的定位上），见 §8 UNVERIFIED。改法：`onSelectionUpdate` 里按 `doc.content.size` 变化才重建 `blocks`/outline（内容没变时只按 `from` 查 `activeOutlineId`），或把两者挪进 180 ms 的 `statsTimer` 一起去抖。

## F4（P2）可载入尺寸与实际可用尺寸脱节

- `src/App.tsx:251` 宿主文档上限 `MAX_HOST_DOC_LENGTH = 6 * 1024 * 1024`，README/STATUS 记「超过 5.5 MiB 拒绝」。
- 但 1 MB 就已经 110 s/遍（F1），dev 下 StrictMode 跑两遍 → 第 40 轮实测整篇载入 222,472 ms；实测期间 9225 上残留的 1 MB 页面会让浏览器级 CDP attach 超时 20 s/45 s 两次（§7）。
- 也就是说 6 MB 的「解析上限」在体验上不成立：用户能选到 5.5 MiB 的文件，然后等十几分钟。

**建议**（产品决策，稳定性优先）：先修 F1；同一轮里给「> N 段 / > M KB」一条可见提示或直接进源码模式，并把这个 N 用实测标定（本轮数据：100 KB/1,000 段 ≈ 0.14 s 可接受；400 KB/4,000 段 2.2 s 已可感知；1 MB/37,450 段 108 s 不可接受）。

## F5（P2）草稿链与保存链产出不同字节；repair 链重复两份

- 保存链：`src/lib/serializeDocument.ts:50-66`（含 `reuseTables`、`collapseBlankParagraphs`、`applyTrailingNewlines`）。
- 草稿链：`src/App.tsx:905-913` 只做 `repairCalloutMarkers(repairHtml(repairMath(repairTildes(repairFootnoteRefs(getMarkdown()))))` + `joinFootnotes` + `joinFrontmatter`，**少了** `reuseTables`/`collapseBlankParagraphs`/`applyTrailingNewlines`。
- 后果：`.sidelight/drafts` 与 localStorage 草稿的字节可能与「保存后」不同（未改动的表格不再整块复用、尾部空段落/`&nbsp;` 不会被清）。恢复草稿时（`src/App.tsx:2138` `setMarkdown(cached.text)`）会把这些差异带回正文。本轮未构造真实文档复现（UNVERIFIED，见 §8）。
- 同一段 4 个 repair 调用在两处逐字重复（`serializeDocument.ts:54-56` 与 `App.tsx:906-908`），是 F2 那条链分叉的根。**改法**：派生改成调用 `serializeDocument`（一次算完同时给脏检查/草稿/自动保存），字节一致性和「只算一次」一起解决。

## F6（P2）性能没有门禁，脚本已过期

- `scripts/perf-longdoc.mjs:4` 默认 `http://localhost:5173`（本轮规则里已禁用）；`:85` 结尾 `browser.close()`（本轮与 AGENTS §8 明令禁止）；`:46` 只等 `.ProseMirror` 可见、`:43-48` 连续 4 次 reload，1 MB 时 30 s 超时必挂；`:53-60` 逐键 4×20 次在 1 MB 下也要几十分钟。
- `package.json` 的 `test` 是 27 个纯函数单测（`node --experimental-strip-types src/lib/*.test.ts`），没有任何性能断言；`.github/workflows/` 里也没有 perf job。→ F1 这类回归（2,200 ms vs 7 ms）在门禁上完全不可见。
- **建议**：把 `perf-longdoc.mjs` 改成 5175 + CDP 端口参数 + 只测 10/100 KB + `process.exit(0)`；再加一条「文档无扩展 lex 耗时 / 有扩展 lex 耗时」的比值断言（Node 里可直接跑 `marked`，不需要浏览器：本轮 Node 实测 4,000 段 6.6 ms，可作为固定基线）。

---

## 6. 试过但判断没有问题的路径（避免下一轮重复挖）

1. **`escapeHtmlForParse` / `protectMathPairs` / `splitTableCellBreaks` / `nodeFromJSON`**：≤1 ms（1.1 表），不是瓶颈。
2. **`isParagraphContinuation` 每次 new Lexer**：实测一次 parse 里 `new Lexer` 只有 **1** 次（`.tmp/perf-round41-parse.json` 的 `lexerCountPerParse`），不在热路径。
3. **localStorage 写放大**：10 个按键只写 1 次（113,850 B，含 JSON 包装），是 300 ms 去抖后的整篇重写，**不是每键**；>256 KiB 直接不写（`src/App.tsx:635`）。这一项第 17 轮记的「全量 localStorage」当前不构成放大。
4. **保存路径的最少序列化**：Ctrl+S 一次只调 1 次 `getMarkdown`（5.3 ms），没有重复整篇计算（第 39 轮已去掉 `loadIntoEditor` 的重复序列化，本轮 `App.tsx:2054` 仍是一次算两用）。
5. **`splitTableCellBreaks` 的 O(n) 边界**：无表文档原样返回同一对象（`src/lib/tableCellBreaks.ts:66-72`），不深拷贝——实现正确。
6. **内存/DOM**（100 KB 文档，`.tmp/perf-round41-typing.json`）：`performance.memory.usedJSHeapSize` **111,438 KB**，CDP `Performance.getMetrics.JSHeapUsedSize` 74,857 KB，`nodes 7,938`、`jsEventListeners 1,252`、`documents 7`。单篇没问题；**反复开关文档是否泄漏未测**（§8）。

## 7. 本轮环境故障（复现步骤，下一轮会再遇到）

9225 上留着第 40 轮 1 MB 文档（`perf-r40-37450.md`）时：

- `node .tmp/reset.mjs 9225` 20 s 超时（`connectOverCDP: retrieving websocket url`）；重试 45 s 仍超时。
- 但 `http://127.0.0.1:9225/json/version` 正常 200。
- **有效解法**（本轮实测）：`Invoke-WebRequest http://127.0.0.1:9225/json/close/<pageId>` 关掉重页面 → 再 `connectOverCDP` 或直接用页面级 WS（`.tmp/r41-cdp.mjs`，本轮所有测量都走它，attach 28,150 ms）。
- 建议把「先 `/json/list` + `/json/close` 清重页面」写进 `.tmp/reset.mjs`，否则 1 MB 文档残留会让下一轮的 5 个 finder 全部卡住。

## 8. UNVERIFIED（本轮没测到的）

1. **F3 的实测**：`onSelectionUpdate` 的整篇遍历只给了行号，没在 1 MB 文档上测（时间用在了 F1）。
2. **F5 的真实样本**：草稿链与保存链的字节差没有构造含表格 + 尾部空段落的文档复现，属于代码推断。
3. **1 MB 逐键真实耗时**：只说「按 100 KB 线性外推 ≈37–67 ms/键」；第 39 轮记的「1 MB 文末逐键 28 s」本轮没复现（重跑一次要先把 1 MB 文档载入，约 4 分钟），所以 28 s 的归因仍未定。
4. **分块 lex 的等价性**：原型 `sameStruct:false` 是**原型自身复用 Lexer 的 bug**，不是方案结论；「每块 new Lexer 后 token 流是否逐字等价」未验证，松列表/跨空行 HTML 块的切分风险未实测。
5. **反复开关文档的内存/监听器增长**：只测了单篇。
6. **生产构建（无 StrictMode）下 1 MB 载入**：本轮所有数字都来自 dev server（StrictMode 两遍）。生产是单遍，应在 `.tmp/build-r41` 上用同一脚本复测。
