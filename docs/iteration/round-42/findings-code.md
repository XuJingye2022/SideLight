# 第 42 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（`git rev-parse HEAD` 实测一致，工作树干净）
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP **9225**（页面级 WS 直连，复用 `.tmp/r41-cdp.mjs`）、Node 24.21
- 本轮新写脚本（都在 `.tmp/`，复跑前先 `node .tmp/reset.mjs 9225`）：
  - `.tmp/e2e-r42-code-perf.mjs` → `.tmp/perf-round42-code.json`：100 KB / 1 MB / 1 MB-4k 三形状的载入、滚动、逐键、Ctrl+S、源码切换、内存、视图切换泄漏
  - `.tmp/e2e-r42-code-perf2.mjs` → `.tmp/perf-round42-code2.json`：4k 段真载入耗时、1 MB 逐键 CPU 采样（Profiler）、40 次视图切换 GC 后 DOM/监听器
  - `.tmp/e2e-r42-code-cost.mjs` → `.tmp/perf-round42-cost.json`：逐键成本拆解（`getMarkdown` / `serializeDocument` / `readBlocks` / `extractOutline` / `countText`）
  - `.tmp/e2e-r42-code-shots.mjs` → `.tmp/perf-round42-scroll.json` + `shots/round-42/*.png`：真实滚轮帧率与截图
  - `.tmp/e2e-r42-code-steps.mjs` → `.tmp/perf-round42-steps.json`：`serializeDocument` 内部逐步耗时（3.2 的表）
  - `.tmp/e2e-r42-code-dom.mjs`：源码往返前后 DOM 计数的时间序列（§6 第 3 条的独立口径）
- 端到端走过的用户路径（截图见 §5）：100 KB 打开→滚动→保存；1 MB 打开→滚动→源码往返；1 MB-4k 打开→源码往返；100 KB 反复切换视图 40 次。

---

## 结论摘要（5 条，按优先级）

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | 退出源码模式无条件整篇重解析：编辑视图被重建，未编辑也一样 | **P1** | 1 MB/4,096 段 **5,537 ms**、1 MB/1,024 段 1,323 ms、100 KB 242 ms |
| F2 | 载入耗时由**段数**决定、不由字节决定；5.5 MiB 上限因此放行 110 s 卡死 | **P1** | 1 MB 三种形状：1,024 段 parse 970 ms / 4,096 段 5,137 ms / 37,450 段 108,000 ms |
| F3 | 每键整篇 `serializeDocument` 8.5–9.7 ms（1 MB），**3 个全文扫描型 repair 占 5.3 ms**，`getMarkdown` 只 1.4–2.2 ms；它们都没有廉价守卫 | P2 | 1 MB 逐步实测：`repairTildes` 2.8 / `repairHtml` 1.6 / `repairCalloutMarkers` 0.9 ms；守卫 4 个 `includes` 只需 0.4 ms |
| F4 | 保存唯一出口 `serializeDocument` 无单测；`tsconfig` 无 `noUnusedLocals`；3 个死符号（第 39/40 轮报过仍在） | P2 | 28 个 test 文件里 0 个覆盖 `serializeDocument` 组合链 |
| F5 | 宿主文档与工作区文档的「脏」基线口径不同：一个用原文，一个用序列化结果 | P2 | `App.tsx:1074` vs `App.tsx:2072` |

`actionable_count = 5`（F1–F4 有本轮实测；F5 只有文件:行号，端到端需要宿主 `/__doc`，见 §7）。

与第 41 轮的关系：**F1、F2 是新的**；F3 把第 41 轮 F2（「每键整篇序列化」）量化到函数级并给出新杠杆（repair 守卫），不重复它的结论；第 41 轮 F1（1 MB 载入 110 s 的 marked 二次方）**仍在**，F2 是它的「产品侧护栏」补充；F4 的死代码部分第 39/40 轮报过两次，本轮记为**仍未清**；F5 是第 41 轮 F5（草稿链/保存链分叉）同一家族的第三个分叉点。

---

## F1（P1）退出源码模式总是整篇重解析：4,096 段的 1 MB 文档卡 5.5 s

### 1.1 实测（真按键 `Ctrl+/`，轮询 `window.__slState.viewMode` 确认切换完成）

| 文档 | 进源码 `inMs` | 回编辑 `outMs` | 同文档 parse（本轮独立测） |
| --- | --- | --- | --- |
| 100 KB / 1,024 段 | 83 | **242** | 145 |
| 1 MB / 1,024 段 | 366 | **1,323** | 970 |
| 1 MB / 4,096 段 | 428 | **5,537** | 5,137 |

来源：`.tmp/perf-round42-code.json` 的 `sourceToggle`、`.tmp/perf-round42-code2.json` 的 `load4k.parseMs` / `load1k.parseMs`。两个数字来自不同运行，但同一份生成文本；`outMs ≈ parse + 0.2–0.4 s`（视图 DOM 重建）。

截图证据：`shots/round-42/code-1mb-source.png`（1 MB 进源码，`sourceLen=1,025,032`）、`shots/round-42/code-1mb-scrolled.png`。

### 1.2 根因

`switchView`（`src/App.tsx:3832-3861`）在离开源码时调 `applySource()`；

`applySource`（`src/App.tsx:3806-3826`）无条件 `setMarkdown(footnoteSplit.body)`（`src/App.tsx:3814`），而 `setMarkdown` 就是整篇 `manager.parse` + `nodeFromJSON` + dispatch（`src/App.tsx:990-1014`）。

**源码没改也一样重解析。** 现有的「没改」判断只用在两处，都不是编辑器重建：

- `src/App.tsx:1886-1892`：只处理 dirty 与草稿写盘；
- `src/App.tsx:3870-3875`（`backToRich`）：只在 `dirty` 时弹确认框。

所以「打开长文 → Ctrl+/ 看一眼 → Ctrl+/ 回来」这条最常见的只读路径，等于把整篇解析跑一遍。

### 1.3 改法（低风险）

在 `applySource` 里先用「源码框没改 + 与正文序列化结果相等」两道判断，命中就跳过 `setMarkdown`：

```ts
// 源码没动过（sourceBaselineRef 是进源码时框里的原文）
// 再确认正文当前就等于这份文本：raw 原文与序列化结果可能有已知字节差（第 40/41 轮样本），
// 只有真相等才能跳过整篇 parse，否则「从横幅进源码原文」那条路会丢掉原文还原
const unchanged = sourceText === sourceBaselineRef.current && sourceText.replace(/\r\n/g, '\n') === currentMarkdown().replace(/\r\n/g, '\n')
if (!unchanged) {
  setMarkdown(footnoteSplit.body)
  /* 批注按引文重定位（:3816-3822）留在 !unchanged 分支里 */
}
syncDocInfo(editor)
if (baselineRef.current !== null) setDirty(sourceText.replace(/\r\n/g, '\n') !== baselineRef.current)
```

- 第二个条件用 `currentMarkdown()`（正好是「正文现在是什么」）而不是「看起来没改」，所以 `openSourceOriginal`（从横幅进源码原文，`src/App.tsx:3878-3891`）、`enterSourceFor` 这些入口的语义都不会变。
- 成本对比：多一次 `serializeDocument`（1 MB 8.5 ms）换掉一次整篇 parse（1 MB/4,096 段 5,137 ms）。
- `sourceBaselineRef` 在 `enterSourceFor`（`src/App.tsx:545-554`）与 `switchView`（`src/App.tsx:3845`）两处都被写成进源码时框里的文本；`applySource` 的三条调用路径（`switchView` 离开源码、预览、Esc）都经过这里。

- 预期（按实测差 `outMs − parse`）：1 MB/4,096 段 5,537 → **~400 ms**；1 MB/1,024 段 1,323 → ~350 ms；100 KB 242 → ~100 ms。
- 风险：**低**。第二个条件用「正文现在序列化出来是什么」做判据，所以裸原文与正文有字节差的那条路（横幅进源码原文）不会误跳过。`dirty` / `sourceBaselineRef` / 草稿逻辑都不动。
- 验收：改后重跑 `.tmp/e2e-r42-code-perf.mjs`，看 `sourceToggle.outMs`；再跑 `keyboard-acceptance.mjs`（源码切换在它里面）与 `npm run roundtrip`（字节不变）。

---

## F2（P1）1 MB 能不能打开，取决于段数：同一字节数，parse 从 0.97 s 到 108 s

### 2.1 三个 1 MB 样本（同一份生成器，只改段长）

| 形状 | 字节 | 段数 | `sl-parse-done − sl-load-start` | 整页可见耗时 `loadMs` |
| --- | --- | --- | --- | --- |
| 1 MB / 1,024 段（每段 ~1 KB） | 1,025,033 | 1,025 | **970 ms** | 2,837 |
| 1 MB / 4,096 段（每段 ~250 B） | 1,028,105 | 4,097 | **5,137 ms** | 11,260 |
| 1 MB / 37,450 段（第 41 轮同口径） | 1,011,159 | 37,450 | **≈108,000 ms** | ≈220,000（dev 两遍） |

来源：`.tmp/perf-round42-code2.json`（`load1k` / `load4k`，本轮）、`docs/iteration/round-41/findings-code.md` §1.4（37,450 段）。100 KB / 1,024 段的 parse 是 **145 ms**。

结论：**字节数不是驱动量，顶层段落（block token）数才是**。1 MB 的「正常长文」（段落大、段数少）可以接受；1 MB 的「细碎长文」（每行一段）会卡十几秒到两分钟。

### 2.2 与可载入上限的冲突

- 上限只按字节：`MAX_HOST_DOC_LENGTH = 6 * 1024 * 1024`（`src/App.tsx:251`，README 记 5.5 MiB）。
- 实测：1 MB/4,096 段整页 11.3 s，37,450 段 3.7 分钟（dev）。用户选一个 5.5 MiB 的「每行一段」笔记，会看到空白窗口几分钟。
- 现有先例：含引用式链接定义的文档已经在载入时直接进源码（`src/App.tsx:2102`、`2103` 的 `enterSourceFor(text, true)`）。这条路可以复用。

### 2.3 建议（按优先级）

1. **按段数守卫**：载入前用 `splitFrontmatter(body).body` 的数行（O(n)，无分配）估顶层段落数；超过阈值直接 `enterSourceFor(text, true)` 并给一条可见提示（「段落数过多，已用源码打开」）。阈值要产品负责人定，本轮数据可支撑：1,024 段 0.97 s（可接受）、4,096 段 5.1 s（不可接受）→ 建议 2,000 段附近。
2. 不改上限、只加「正在载入长文档…」进度提示（成本最低，但用户仍要等）。
3. 先修第 41 轮 F1（marked 扩展的二次方），再回来看本条的阈值。

风险：中（改的是产品行为，不是纯重构）。

---

## F3（P2）每键整篇序列化 8.5–9.7 ms（1 MB）：62% 花在 3 个全文扫描型 repair，它们都没有廉价守卫

### 3.1 拆解（同页直测，5 次取中位）

| 项 | 100 KB | 1 MB |
| --- | --- | --- |
| `editor.getMarkdown()` | 0.9 ms | 2.1 ms |
| `serializeDocument(editor)` 全程 | **2.6 ms** | **9.7 ms** |
| `readBlocks` 等价遍历（`doc.forEach(n => n.textContent)`） | 0.1 ms | 0.0 ms |
| `extractOutline(doc)` | 0.0 ms | 0.0 ms |
| `countText(doc.textContent)` | 2.3 ms | 22.4 ms |

来源：`.tmp/perf-round42-cost.json`。12 个真按键 → `getMarkdown` **13 次**（12 次脏检查 + 1 次 300 ms 派生），`getMdMedianMs` 1.2 / 2.2 ms。

- **新结论**：`serializeDocument` 比 `getMarkdown` 贵 **2.9×（100 KB）/ 4.6×（1 MB）**，贵在 repair 链与收尾，不在序列化器本身。
- 顺带否掉一个第 41 轮的猜测：第 41 轮 F3 说 `onSelectionUpdate` 每次遍历整篇两次（`readBlocks` + `extractOutline`）。本轮直测两者在 1 MB/1,025 段下都是 **0.0–0.1 ms**，量级上不构成瓶颈（37,450 段未测，见 §7）。

### 3.2 逐步骤实测（同一份文本，5 次取中位，`ms`）

`.tmp/perf-round42-steps.json`：

| 步骤 | 100 KB | 1 MB | 实现 |
| --- | --- | --- | --- |
| `getMarkdown()` | 1.4 | 1.4 | 序列化器 |
| `repairFootnoteRefs` | 0.0 | 0.1 | 1 条正则 |
| **`repairTildes`** | 0.7 | **2.8** | `mapOutsideCode` 全文分段 + 分段数组（`src/lib/tilde.ts:36-38`） |
| `repairMath` | 0.0 | 0.2 | 2 条跨全文正则（`src/lib/math.ts:28-32`） |
| **`repairHtml`** | 0.5 | **1.6** | `mapOutsideCode` 全文分段 + 3 条正则（`src/lib/html.ts:20-51`） |
| `repairCalloutMarkers` | 0.1 | 0.9 | 1 条正则（`src/lib/escapes.ts:5`） |
| `reuseTables` | 0.1 | 0.2 | 逐行 + `fenceMap` |
| `collapseBlankParagraphs` | 0.1 | 1.1 | 全文正则 |
| `applyTrailingNewlines` | 0.1 | 0.9 | 全文正则 ×2 |
| **`serializeDocument` 合计** | **2.9** | **8.5** | 上面整条链 |
| 4 个 `includes` 守卫（本轮新测的成本） | 0.0 | 0.4 | `includes('~')` / `('$')` / `('[!')` / `('&lt;')` |

**3 个最贵的 repair 就是 3 个全文扫描**：`repairTildes` 2.8 + `repairHtml` 1.6 + `repairCalloutMarkers` 0.9 = **5.3 ms / 次**（1 MB），占 `serializeDocument` 的 62%。

### 3.3 改法（低风险、精确）

给 3 个最贵的 repair 各加一条**无分配的 O(n) 子串快路径**，未命中就原样返回：

- `repairTildes`：`if (!markdown.includes('~')) return markdown`
- `repairHtml`：`if (!markdown.includes('&lt;') && !/[&](amp|lt|gt);/.test(markdown)) return markdown`
- `repairCalloutMarkers`：`if (!markdown.includes('[!')) return markdown`

三条都是**精确**的（没有对应字符就不可能有命中），不是启发式。普通中文长文（不含 `~` `&lt;` `&amp;` `&gt;` `[!`）因此每键跳掉 2 次全文分段扫描 + 2 条全文正则。

- 实测依据：守卫成本 0.4 ms（1 MB，4 个 `includes`），被省掉的 3 个 repair 是 **5.3 ms** → 净省 ≈ 4.9 ms/次；`serializeDocument` 8.5 → **≈3.6 ms**，100 KB 2.9 → ≈2.2 ms（这两个数是**同口径相减的推算**，未改代码实测，见 §7）。
- `repairMath`（0.2 ms）与 `repairFootnoteRefs`（0.1 ms）不值得加守卫，别改。
- 风险：低。四个模块都有单测（`tilde.test.ts`、`math.test.ts`、`html.test.ts`、`escapes.test.ts`），改后跑 `npm test` + `npm run roundtrip` 即可验证字节不变。
- 注意：`codeScan.ts` 的 `mapOutsideCode` 还被 `escapeHtmlForParse`（解析路径）与 `risk.ts` 的 `fenceMap`（载入路径）使用，**不要**动它本身，只在 3 个 repair 入口加守卫。

---

## F4（P2）保存路径的唯一出口没有单测；3 个死符号第 39/40 轮报过、仍在

### 4.1 测试盲区（`package.json:15` 的 28 个 test 文件全查过）

- `serializeDocument`（`src/lib/serializeDocument.ts:50-66`，保存与基线比较的唯一出口）**没有任何单测**：全仓只有 `App.tsx` 4 处活调用（`:1033`、`:1081`、`:2063`、`:2794`）+ 1 处死函数（`:188`），`src/lib/diff.test.ts:1` 只 import 了 `applyTrailingNewlines`。
- 后果：repair 的**顺序**（footnote → tilde → math → html → callout → reuseTables → blankParagraphs → joinFootnotes → joinFrontmatter → trailingNewlines）没有任何门禁。把两条 repair 换序会让保存字节变化，而 `npm test` 362 条**全绿**——只有 `npm run roundtrip` / e2e 才能发现。
- 建议：新增 `src/lib/serializeDocument.test.ts`（用假的 `{ getMarkdown: () => '...' }`，5–8 条：frontmatter + 脚注 + 表格复用 + 尾部换行 + CRLF 跟随 + 空段落清理顺序）。成本 ≤80 行，无新依赖，不影响首屏。

### 4.2 死代码（本轮脚本 `.tmp/r42-deadexports.mjs` 全仓扫描）

| 符号 | 位置 | 状态 |
| --- | --- | --- |
| `serializeBody` | `src/App.tsx:186-189` | 定义处 1 次，全仓 0 处调用（第 39、40 轮已报） |
| `serializeDocumentBody` | `src/lib/serializeDocument.ts:41-43` | 只被上面那个死函数使用 |
| `clearSession` | `src/lib/session.ts:55` | 全仓 0 处引用（第 39、40 轮已报） |
| 悬空注释 | `src/App.tsx:178` `/** 编辑器读不全的语法… */` 后无代码 | 第 39 轮删函数留下的注释 |

- `tsconfig.json` 只有 `"strict": true`，**没有 `noUnusedLocals` / `noUnusedParameters`**，所以 `tsc` 不会报这些。
- 建议：删这 3 个符号 + 那句注释（约 −12 行）；`noUnusedLocals` 先别开——本轮扫出 47 个「只在本文件用」的 `export`，开开关会一次爆一堆，需要单独一轮清理。

---

## F5（P2）宿主文档的脏基线用「原文」，工作区文档用「序列化结果」

| 载入路径 | 基线写成什么 | 位置 |
| --- | --- | --- |
| 工作区 / 普通文档 | `serializeDocument(...)` 的结果 | `src/App.tsx:2063-2072` |
| 宿主文档（`/__doc`） | **文件原文** `data.text` | `src/App.tsx:1074` |

`onUpdate` 的脏判断是「当前 `serializeDocument` 结果 ≠ 基线」（`src/App.tsx:898-902`）。两套基线只有在「序列化 == 原文」时才等价。第 40/41 轮已经确认存在字节不相等的文档样本（4 空格缩进围栏、缩进围栏 + 裸 HTML）。对这类文档：

- 工作区打开 → 基线 = 序列化结果 → 打开即「不脏」；
- 宿主打开 → 基线 = 原文 → 打开即「脏」（标题带 •、关窗/切换弹「有未保存改动」）。

建议：`applyHostPayload` 改用它已经算出来的序列化结果（`:1079-1086` 的 `serializeDocument` 调用），与 `loadIntoEditor` 对齐；`baselineLosses` 已有的损失集合继续解释「为什么打开就脏」。

- 风险：低（一行改动）；风险点是宿主草稿恢复路径 `recoverHostDraft`（`src/App.tsx:3104-3119`）依赖「基线仍取原文件」的注释，改基线后要复核「草稿恢复 → 保存」仍按预期判脏。
- 端到端未验：浏览器里拿不到 `/__doc`（见 §7），只能静态指向。补测方法：`host/` 宿主真机打开一份「4 空格缩进围栏」文档，看标题是否立即带 •。

---

## 5. 截图证据（`shots/round-42/`）

| 文件 | 路径 | 说明 |
| --- | --- | --- |
| `code-100kb-scrolled.png` | 100 KB 文档滚轮滚动 40 次（`scrollTop=20,000`） | 滚动无白屏、无错位；状态栏「83,978 字」 |
| `code-100kb-ctrls.png` | 100 KB 文档 Ctrl+S 之后的 toast「已取消保存。」 | 浏览器态没有落点，给的是可见反馈（不是静默丢弃） |
| `code-1mb-scrolled.png` | 1 MB 文档滚轮滚动 40 次 | 状态栏「865,286 字」，编辑区正常 |
| `code-1mb-source.png` | 1 MB 文档 `Ctrl+/` 进源码 | `.source-editor` 的值长 1,025,032 字符（`sourceState.sourceLen`）；右上角「源码/预览」高亮正确 |

---

## 6. 试过但判断没有问题的路径（避免下一轮重复挖）

1. **保存路径没有重复全文计算**：Ctrl+S 一次只有 **1 次** `getMarkdown`（`.tmp/perf-round42-code.json` 三例 `save.getMarkdownCalls = 1`），第 39 轮去掉的那次重复没有回来。
2. **localStorage 没有每键写放大**：100 KB 一个停笔周期只写 1 次（103,500 B）；1 MB **0 次**（`text.length > 256*1024` 直接跳过，`src/App.tsx:643-650`）。
3. **视图切换没有无限泄漏，但第一次进源码会留下一批已卸载的 DOM**：单独一次测量（`e2e-r42-code-dom.mjs`，100 KB/1,024 段）——静止时 `nodes` 2,195（可见元素 1,105、`<p>` 1,024）；进源码后可见元素只剩 **74**，`nodes` 反而涨到 **5,269**（≈5,195 个已卸载节点仍在计数里）；回到编辑后 5,273，此后 40 次切换**恒定**（`.tmp/perf-round42-code2.json` 的 `toggleLeak`），可见元素也回到 1,106。所以是「一次性的保留」，不是随切换增长的泄漏；没有做堆快照，见 §7。
4. **编辑器事务本身不重**：12 个按键期间 `view.dispatch` 共 36 次调用（含按键之外的事务），中位 **0.1 ms**、最大 10.6 ms（`.tmp/perf-round42-cost.json`）。逐键真正的开销不在事务里。
5. **滚动流畅**：真实滚轮（`deltaY=500` × 40，间隔 30 ms）100 KB 与 1 MB/1,024 段各 108 帧，中位 **17.4 / 17.2 ms**，p95 33.2 / 33.6 ms，>32 ms 的帧 28 / 25（≈ 26%，都是掉一拍）。没有长卡顿、没有丢内容（`.tmp/perf-round42-scroll.json`）。这是「快速 flick」口径；慢速滚动只会更好。
6. **内存**：100 KB 文档 `performance.memory.usedJSHeapSize` 74,199 KB、DOM 13,504 节点；1 MB/1,024 段 103,880 KB / 13,499 节点；1 MB/4,096 段 152,852 KB / 76,141 节点（dev + StrictMode 口径，含 HMR 常量）。
7. **`splitTableCellBreaks` / `nodeFromJSON` / `escapeHtmlForParse` / `protectMathPairs`**：第 41 轮已测 ≤1 ms，本轮没有变化（未重测）。

---

## 7. UNVERIFIED（本轮没测到的）

1. **F5 的端到端**：需要宿主 `/__doc`，浏览器里 dev server 的 SPA fallback 会返回 HTML（`src/App.tsx:1130-1139` 的 `hostUnavailable` 分支），本轮只给代码证据。
2. **F3 加守卫后的真实收益**：没改代码，只有「同口径相减」的推算（8.5 − 5.3 + 0.4 ≈ 3.6 ms）。补测：改 `tilde.ts`/`html.ts`/`escapes.ts` 后重跑 `.tmp/e2e-r42-code-steps.mjs` 与 `.tmp/e2e-r42-code-cost.mjs`。
3. **1 MB/4,096 段的滚轮帧率**：只测了 100 KB 与 1 MB/1,024 段（4k 段 DOM 是 76k 节点，可能更差）。
4. **生产构建（无 StrictMode）的数字**：本轮全部数字来自 dev server（StrictMode 两遍）。生产单遍的载入应为表中 parse 的一半左右，逐键的 React 开销会低一些。
5. **1 MB/37,450 段本轮没重测**：用的是第 41 轮的 108 s（重跑一次约 4 分钟）。第 39 轮记的「1 MB 文末逐键 28 s」仍未复现。
6. **反复打开/关闭不同文档的内存**：本轮只测同页视图切换与单篇载入。
7. **「切进源码后 nodes 仍 5,269」的性质**：只看了 `Memory.getDOMCounters` 与可见元素数，没做堆快照 / `HeapProfiler.takeHeapSnapshot`，分不清是编辑器 DOM 真被保留还是 CDP DOM agent 的计数缓存。补测：`HeapProfiler.collectGarbage` 后取 `performance.memory.usedJSHeapSize` 前后差，或直接抓堆快照搜 detached `<p>`。

---

## 8. 环境与脚本坑（下一轮会再遇到，本轮踩了）

1. **`node .tmp/reset.mjs 9225` 之后剩下的页面是 `about:blank`**：直接 attach 上去，`localStorage.setItem` 抛 `SecurityError: Access is denied for this document`（本轮第一版脚本三个用例全挂）。**正确做法**：用 `PUT http://127.0.0.1:9225/json/new?<url>` 开新标签，再用返回的 `webSocketDebuggerUrl` 连（`.tmp/r41-cdp.mjs` 的 `newPage` + `openWs`）。
2. **同一 profile 的 localStorage 跨标签共享**：新标签打开时会先渲染**上一篇**文档，所以「DOM 文本长度够了 = 本篇载入完成」会误判（本轮 1 MB/4k 例把 `loadMs` 记成 **8 ms**）。**正确做法**：等 `document.title` 以本篇文件名开头，再等正文长度（本报告 §2 的 `load4k.loadMs=11,260` 是修正后的数）。
3. **toast 的类名是 `.toast`，不是 `.notice`**（`src/App.tsx:4982`）。本轮先用 `.notice` 查，得到「空 = 没有反馈」的假象，截图里其实显示「已取消保存。」。
4. **`Performance.getMetrics` / `Memory.getDOMCounters` 是整个渲染进程口径**：同时开着多标签会互相干扰（本轮 4k 例 `documents=4`），做增长对比前先 `HeapProfiler.collectGarbage`，并保证只开一个标签。
5. 第 41 轮记录的「9225 残留 1 MB 页面会让 `connectOverCDP` 超时」本轮没有复现（页面级 WS 直连，未用 `connectOverCDP`）。
