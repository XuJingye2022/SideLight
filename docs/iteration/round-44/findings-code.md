# 第 44 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`d22807f4361a32d06a49f6645d610511f3ce7bb7`（`git rev-parse HEAD` 实测一致；开工时工作树干净）
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP **9225**（页面级 WS 直连，复用 `.tmp/r41-cdp.mjs`）、Node 24.21
- 本轮新写脚本（都在 `.tmp/`）：
  - `.tmp/e2e-r44-code.mjs`（跑前 `node .tmp/reset.mjs 9225`）→ `.tmp/perf-round44-code.json`：100 KB / 1 MB 载入埋点、逐键、空闲写放大、Ctrl+S、源码往返 ×4、查找条开关 ×10、堆与 DOM 计数
  - `.tmp/e2e-r44-code2.mjs` → `.tmp/perf-round44-code2.json`：草稿链 vs 保存链同输入对比 + 载入阶段重复（**脚本的 reload 竞态使 timing 一节无效，见 §5**）
  - `.tmp/e2e-r44-code3.mjs` → `.tmp/perf-round44-code3.json`：parse 阶段归因（**CDP eval 报 SyntaxError，未取得数据，见 §5**）
  - 截图：`shots/round-44/code-100kb-loaded.png`、`code-100kb-source.png`、`code-100kb-saved.png`、`code-1mb-loaded.png`、`code-1mb-source.png`、`code-1mb-saved.png`
- 端到端走过的用户路径：① 打开 100 KB 文档 → 滚到末尾打字 12 键 → Ctrl+S（截图 3 张）；② 打开 1 MB 文档 → 源码模式往返 4 次 → 回编辑打字 → Ctrl+S（截图 3 张）；③ 1 MB 文档上开/关查找条 10 次（Ctrl+F → Esc）。

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | 草稿/持久化链手工复制了 `serializeDocument` 的修复链，同一输入输出与保存链**不同** | **P2** | 探针：保存链 59 B、草稿链 73 B，首处差异第 31 字节；缺 `reuseTables` / `collapseBlankParagraphs` / `applyTrailingNewlines` 三步 |
| F2 | 停笔 300 ms 就把整篇正文同步写进 `localStorage`，且与 2 s 自动保存各算各的 | **P2** | 100 KB：空闲 1 次 `getMarkdown`（3.1 ms）+ 1 次 `setItem` **103,501 B / 1.1 ms**；1 MB：`setItem` 0 次（>256 KiB 跳过，与第 43 轮一致） |
| F3 | `App.tsx` 5,416 行 / 213,627 B / 222 个 hook / 0 条单测（第 43 轮 F3 未动，本轮复核数字） | **P2** | `useState` 35、`useEffect` 54、`useCallback` 95、`useRef` 36、`useMemo` 2；29 个 test 文件全部只 import `src/lib/*` |

`actionable_count = 3`（F1、F2 有本轮实测；F3 是上轮未处理项的复核，数字已更新）。

**没发现新 BUG。** 逐键、保存、源码往返、查找条开关这四条路径的计数与内存数据见 §3，没有复现出卡死、写放大翻倍或 DOM 泄漏。

---

## F1（P2）草稿链复制了序列化修复链，输出与保存链不一致

### 1.1 两条链

保存链（唯一出口）`src/lib/serializeDocument.ts:50-65`：

```
editor.getMarkdown → repairFootnoteRefs → repairTildes → repairMath → repairHtml → repairCalloutMarkers
→ reuseTables(original) → collapseBlankParagraphs → joinFootnotes → joinFrontmatter → applyTrailingNewlines
```

草稿链 `src/App.tsx:908-915`（`deriveTimerRef` 的 300 ms 回调，写 `localStorage` 与 `.sidelight/drafts`）：

```
current.getMarkdown → repairFootnoteRefs → repairTildes → repairMath → repairHtml → repairCalloutMarkers
→ joinFootnotes → joinFrontmatter(…, leadingNewlines(splitFrontmatter(original).body))
```

草稿链**少三步**：`reuseTables`（未改动表格整块复用原文）、`collapseBlankParagraphs`（连续空段落的 `&nbsp;`）、`applyTrailingNewlines`（末尾换行对数跟随原文）。表与空段落正是第 40 轮与保真专题修过的地方。

### 1.2 实测（`.tmp/perf-round44-code2.json` → `diverge`）

同一输入（原文含一张表、编辑器 Markdown 含重排后的表 + 两段 `&nbsp;`）直调两个实现：

| | 长度 | 输出全文 |
| --- | --- | --- |
| 保存链 `serializeDocument` | **59 B** | `---\ntitle: 探针\n---\n\| 名称 \| 数值 \|\n\| --- \| --- \|\n\| 甲 \| 1 \|\n\n收尾。\n` |
| 草稿链（复刻 `App.tsx:905-915`） | **73 B** | 表格保留 `\|----\|----\|`；两段 `&nbsp;` 原样留下 |

`equal: false`，首个差异在第 31 字节。

### 1.3 影响与改法

- 影响面：`localStorage` 的 `sidelight.doc.v1` 与 `.sidelight/drafts` 存的是草稿链产物。用草稿恢复时，表格对齐与空段落字节会和同一文档保存后的文件不同（`.sidelight/drafts` 只用于崩落恢复，不是正文，故不是 P1）。
- 改法（一处，等价替换）：

  ```ts
  const draft = serializeDocument(current, {
    frontmatter: frontmatterRef.current,
    footnotes: footnotesRef.current,
    original,
  })
  ```
  并删掉 `App.tsx:905-915` 里的手工 repair 链与 import 里不再使用的 `repair*`（若别处仍用则保留）。`serializeDocument` 的 `leading` 缺省值与现写法相同（都从 `original` 推 `leadingNewlines`）。
- 风险：**低**。`serializeDocument.test.ts` 已覆盖该函数；改后跑 `npm test` + `npm run roundtrip`，再跑 `.tmp/fidelity-acceptance.mjs` 看打开→保存字节不变。
- 成本：净减约 8 行；包体不变（lib 已在主 chunk）。

---

## F2（P2）停笔 300 ms 全量写 `localStorage`，与自动保存两套节拍

### 2.1 实测（`.tmp/perf-round44-code.json`）

| 文档 | 打字 12 键期间 | 停笔 3.5 s | Ctrl+S |
| --- | --- | --- | --- |
| 100 KB | `getMarkdown` 12 次（每键 1 次，1.1–1.8 ms）；`setItem` **0** | `getMarkdown` 1 次（3.1 ms）+ `setItem` **1 次 / 103,501 B / 1.1 ms** | `getMarkdown` 1 次（0.9 ms），`setItem` 0 |
| 1 MB | `getMarkdown` 12 次（1.8–2.6 ms）；`setItem` 0 | `getMarkdown` 1 次（1.9 ms）；`setItem` **0**（`>256*1024` 跳过，`App.tsx:637`） | `getMarkdown` 1 次（3.3 ms），`setItem` 0 |

读法：

1. 写放大的量级是「每次停笔 ≥300 ms 一次整篇同步写」，文档越接近 256 KiB 越贵（1024 个字符≈2 KB 的换算下，256 KiB 约 2.7 ms/次）。100 KB 实测 1.1 ms，对一个停笔周期可以接受，但它是**同步**写，落在主线程。
2. 它与 2 s 自动保存是两套计时器：停笔 300 ms 写一次 `localStorage`，2 s 再走一次保存链。真机上（宿主/文件树）还会多一次 `.sidelight/drafts` 写（`App.tsx:931-956`，800 ms 后）。四份计时器各写一次全文。

### 2.2 可度量、低风险的改法

1. 把 `persistDocKey(draft)`（`App.tsx:918-920`）挪到 `draftTimerRef` 那条 800 ms 的草稿节拍里，或与自动保存成功后那次写合并——一次停笔只写一次。
2. 若要更省：给 `persistDocKey` 加「内容未变就跳过」的守卫（比对上次写入的字节数 + 便宜的前缀/尾串哈希），撤销回原样、只移动选区时不再重写。
- 收益：一次停笔的同步写从 1–2 次降到 ≤1 次；`localStorage` 配额压力不变。
- 风险：**低**（掉电丢的窗口从 300 ms 变 800 ms，仍在自动保存 2 s 之内；`save-acceptance` / `draft-acceptance` 覆盖）。
- 注：本条不该为了「省字节」去砍，`localStorage` 是崩溃恢复的唯一手段；只改节拍与去重。

---

## F3（P2）`App.tsx` 222 个 hook、5,416 行、0 条单测（第 43 轮 F3 复核，未处理）

本轮实测（`git` + 脚本，工作树 HEAD）：

| 指标 | 本轮 | 第 43 轮报告 |
| --- | --- | --- |
| 行数 / 字节 | **5,416 行 / 213,627 B**（文件系统实测） | 5,379 行 / 190,996 B |
| `useState` / `useEffect` / `useCallback` / `useRef` / `useMemo` | 35 / 54 / 95 / 36 / 2（**222**） | 35 / 53 / 95 / 36 / 2（221） |
| 针对 `App.tsx` 的单测 | **0** | 0 |

第 43 轮给的最小改法（把自动保存的 9 条守卫抽成 `src/lib/autoSaveGate.ts` + 8–10 条单测）没有落地。本轮**不建议**再新开大改；若下一轮仍不排期，建议直接执行上轮那一条（约 60 行，风险低）。

---

## 4. 旧结论复核（本轮实测，未见回归）

1. **第 43 轮 F1 的相等快路径已生效**：`baselineLosses(md, md)` 100 KB **0.2/0/0 ms**、1 MB **0.3/0.1/0.1 ms**（第 43 轮同尺寸 28.3 / 76.8 ms）。
2. **但真正改了正文的 `classify` 仍很贵**：1 MB `classify(md, md + '\n\n补一句。')` **85.6 / 80 / 81 ms**（100 KB 33.5–38.4 ms）。`activeLosses` 只在「基线非空或原文有脚注定义」时跑，因此只影响保真样本类文档的保存/自动保存；普通文档不受影响（早退）。这条不是新 BUG，记录数据供后续决定要不要换更便宜的差分。
3. **第 43 轮 F2 的 `skipReparse` 修复在 HEAD 上仍在**（`App.tsx:3891-3894` 的 `syncDocInfo` 已挪进 `if (!skipReparse)` 块）。
4. **保存路径没有重复全文计算**：`Ctrl+S` 一次只有 1 次 `getMarkdown`（100 KB 0.9 ms、1 MB 3.3 ms），`toast` =「已取消保存。」（浏览器态无落点，可见反馈而非静默）。
5. **localStorage 没有每键写放大**：逐键 12 次 `setItem` 0 次（见 F2 表）。
6. **逐键不卡**：1 MB 12 键 `dispatch` 中位 **0.1 ms**、最大 6.5 ms；`getMarkdown` 每键 1 次 1.8–2.6 ms；实际按键往返中位 **24 ms**（100 KB 16 ms）。
7. **源码往返 4 次没有 DOM 泄漏**：DOM 节点恒定 **1108**（`.doc-column` 内 1027）；堆在 100 KB 上 56,580→56,974 KB、1 MB 上 62,826→67,197 KB，随后 10 次查找条开关后再 GC 回落到 65,316 KB（100 KB 回落到 57,097 KB）——**非单调增长，不足以判泄漏**（见 §5）。
8. **`Memory.getDOMCounters`**：100 KB `{documents:1, nodes:2196, listeners:261}`；1 MB `{documents:1, nodes:2224, listeners:270}`——同结构文档下节点/监听数只差 28/9，属于内容差异，不像按文档长度线性泄漏。
9. **1 MB 载入总耗时**（dev + StrictMode，两遍，取最后一遍）：wall **2,786 ms**，`sl-load-start`→`sl-sync-done` = **1,032.9 ms**（parse 997.4 / dispatch 3.3 / serialize 6.8 / sync 25.4）。100 KB：wall 779 ms，同段 153 ms（parse 144.1）。**parse 是载入的唯一大头**；`sl-load-start` 之前的 1.6 s 是 dev server 的模块装载，生产构建不适用（未测生产，见 §5）。

---

## 5. UNVERIFIED（本轮没测到 / 测失败了）

1. **载入 parse 的阶段归因**：想拆成 `protectMathPairs` / `escapeHtmlForParse` / `manager.parse` / `nodeFromJSON` 四段，但 `.tmp/e2e-r44-code3.mjs` 的 CDP eval 报 `SyntaxError: Invalid or unexpected token`（同一 payload 在 Node 里 `new Function` 校验通过，怀疑是页面 WS 端对长表达式/中文的处理差异），**未取到数据**。补测：把这四段拆成四个独立 `Runtime.evaluate` 调用，或临时在 `setMarkdown` 里加 dev-only 的 `performance.mark`。
2. **F2 第 2 轮载入的 timing 无效**：`.tmp/e2e-r44-code2.mjs` 里 `Page.reload` 后立即轮询，读到的是旧页面的 DOM，`wall` 只有 10–12 ms，`marks` 为 null。有效的只有该脚本第 1 MB 页第一次 reload（mark `sl-load-start` 518 ms、parse 20 ms，且页面已热）。补测：轮询 `performance.timeOrigin` 变化后再等 mark 条数变 2。
3. **`localStorage` 写放大在真机（宿主/文件树）上的表现**：浏览器里没有落点，`.sidelight/drafts` 那条 800 ms 的写不会触发。需要宿主真机（`host-save-acceptance.mjs`）或 FSA 工作区复测。
4. **生产构建（无 StrictMode）**：本轮全部数字来自 dev server。
5. **内存增长的判定**：只做了「强 GC + `performance.memory`」轮询，未用堆快照对比；增长不单调，故不做泄漏结论。

---

## 6. 环境与脚本坑（本轮踩到的）

1. **`Page.reload` 之后立刻轮询 DOM 会读到旧页面**（导航还没提交），得到 10 ms 的假载入耗时；必须等 `performance.timeOrigin` 变化，或等 `sl-parse-done` 条数翻倍。
2. **把 `JSON.stringify` 的结果插进 Node 模板字符串当 CDP 表达式会二次转义**（`\n` 在模板字符串里变成真换行，页面侧直接 `SyntaxError`）。要注入含换行的文本，改用字符串拼接 `'window.__docs = ' + JSON.stringify(docs)`，不要用 `${JSON.stringify(...)}`。
3. **别用 PowerShell `ConvertFrom-Json` 读本轮 JSON**（中文 `toast` 文本按 ANSI 解码会报 `应为":"或"}"`）。用 `read` 工具看文件；本报告的数值都是从 JSON 里用 `node -e` 取的。
