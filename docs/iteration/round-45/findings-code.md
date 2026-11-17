# 第 45 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（`git rev-parse HEAD` 实测一致；开工时工作树干净，收工时只多出未跟踪的 `docs/iteration/round-45/` 与 `shots/round-45/`）
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP **9225**、Node 24.21；产品代码未改（只读），本轮全部数字来自读代码 + 真跑应用
- 本轮新写脚本（都在 `.tmp/`，复跑前先 `node .tmp/reset.mjs 9225`）：
  - `.tmp/e2e-r45-code-perf.mjs` → `.tmp/perf-round45-code.json`：100 KB / 1 MB 载入埋点、滚动帧、逐键、空闲派生、Ctrl+S、源码往返 ×2、堆与 DOM 计数
  - `.tmp/e2e-r45-code-writes.mjs` → `.tmp/perf-round45-writes.json`：**假 FSA 工作区**里真跑「打开文件夹 → 打开文件 → 打字 → 自动保存 → Ctrl+S」，量全部落盘路径（localStorage / `.sidelight/drafts` / 正文文件）
  - `.tmp/r45-dead.mjs`、`.tmp/r45-dup.mjs`：死符号与重复语句计数（读 `src/App.tsx` 源文件）
- 端到端走过的用户路径（每条都有截图）：
  1. 打开 100 KB 文档 → 滚轮 20 次 → 文末打 12 字 → 空闲 3.5 s → `Ctrl+S`；`shots/round-45/code-100kb-{loaded,scrolled,saved,source}.png`
  2. 打开 1 MB 文档 → 同上 → `Ctrl+/` 源码往返 2 次；`shots/round-45/code-1mb-{loaded,scrolled,saved,source}.png`
  3. 假 FSA：打开文件夹 `示例文集` → 打开 `长文.md`（147 KB）→ 打 10 字 → 等自动保存（5 s）→ `Ctrl+S`；`shots/round-45/code-fsa-{opened,autosaved,manual}.png`
- 控制台：三条路径 **0 条 console error、0 条 pageerror**；1 MB 路径 0 条 requestfailed；100 KB 路径只有 2 条 `http://localhost:5175/__doc` 失败（浏览器态没有宿主，属预期，`App.tsx:1128` 会回退到普通浏览器模式）

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | 一次停笔 = **2 次全文序列化 + 4 次全文落盘**（同一份 147 KB 正文写了 590,967 B），手动保存还会再整篇重写 localStorage | **P2** | `getMarkdown` 12 次（10 次逐键脏判定 + 2 次真序列化）；localStorage 2 次 **296,934 B**；`.sidelight/drafts` 147,016 B（1.2 s 后删）；正文 147,017 B；同一草稿路径删 **2 次** |
| F2 | 死代码 5 处，`tsc --noUnusedLocals --noUnusedParameters` 精确列出；另有 1 个只写不读的 ref 与它的空转 effect | **P2** | 5 条 TS6133（`TextSelection`/`InlinePopover`/`SAMPLE`/`lastClearIdRef`/`trash.ts:242 legacy`）；`hostDocRef` 2 处引用（1 声明 + 1 写入）、0 读 |
| F3 | 两条载入路径重复 17 条状态复位语句，且**已经漂移 5 项**（其中 `abortRef.abort()` 属第 41 轮修过的同类竞态） | **P2** | `applyHostPayload`（`App.tsx:1049-1122`）与 `loadIntoEditor`（`App.tsx:2033-2130`）逐字相同语句 **22 行 / 有效行 58 vs 77** |
| F4 | 测试盲区：第 44 轮新增的 `taskListInput.ts`（81 行、含 5 段判定）**0 条单测**；29 个测试文件全部只 import `src/lib/*` | **P2** | `src/lib/taskListInput.ts` 无 `*.test.ts` 引用；`App.tsx` 5,437 行 0 条单测 |

`actionable_count = 4`（F1–F4 都有本轮实测或精确静态证据）。

**没有发现新 BUG**：载入、滚动、逐键、保存、源码往返、自动保存六条路径都跑通，落盘字节与编辑器正文一致（见 §4-5），没有卡死、回归或 DOM 泄漏迹象。

---

## F1（P2）一次停笔 = 2 次全文序列化 + 4 次全文落盘（147 KB 文档写出 590,967 B）

### 1.1 实测（`.tmp/perf-round45-writes.json`，假 FSA 工作区，`长文.md` 147,007 B）

连续打 10 字，然后等 5 s（覆盖 300 ms 派生、800 ms 草稿、2 s 自动保存）：

| 计数 | 打字期间（183 ms） | 停笔 5 s 内 | 合计 |
| --- | --- | --- | --- |
| `editor.getMarkdown()`（全文序列化入口） | **10**（每键 1 次脏判定） | **2**（300 ms 派生 1 + 2 s 保存准备 1） | 12 |
| `localStorage.setItem` | 0 | **2 次 / 148,466 + 148,468 = 296,934 B** | 296,934 B |
| `.sidelight/drafts/长文.md` 写 | 0 | 1 次 / 147,016 B（+1 次 `write("")` 建文件） | 147,016 B |
| `.sidelight/drafts/长文.md` 删 | 0 | **2 次**（同一路径、同一毫秒） | — |
| 正文 `长文.md` 写 | 0 | 1 次 / **147,017 B** | 147,017 B |
| 结果 | — | `dirty:false`、状态条「已自动保存 18:37」、`toast` 文本「已保存 长文.md另存为」（正文 + 按钮标签） | 一次停笔共写 **590,967 B** |

手动 `Ctrl+S`（同一份文档，再量一次）：`getMarkdown` **1** 次、localStorage **1 次 / 148,468 B**、正文写 1 次、草稿删 2 次。

读法：

1. **一次停笔把同一份正文写了四遍**：`.sidelight/drafts` 一遍、正文一遍、localStorage 两遍。正文本身只有 147 KB，落盘量 590 KB，约 **4× 写放大**。
2. 两次 localStorage 写的是**同一段内容的两个变体**（148,466 B 与 148,468 B，差 2 字节）：一次来自停笔 300 ms 派生链（`App.tsx:923-925` → `persistDocKey`，写 `draft`），一次来自保存成功后的 `finishSaved`（`App.tsx:2638-2642` → `persistDocKey(withEol)`）。两次都在主线程同步执行。
3. **草稿文件刚写 0.9 s 就被删**：草稿在 800 ms 写（`App.tsx:938-961`，实测 `t=7907`），自动保存在 2 s 写成功后立刻 `removeCache`（`App.tsx:2650-2655`，实测正文写 `t=8796`、删草稿 `t=8797`）。带真实工作区时这是每停笔一次 147 KB 写 + 删。
4. **同一草稿路径删了两次**：`finishSaved` 里 `removeCache(dir,'draft',cacheKey(oldName))` 与 `removeCache(…, cacheKey(name))`（`App.tsx:2653-2654`）在「保存当前文档」时 `oldName === name`，两次删同一个键。删一次就够（`removeCache` 不存在也不报错）。

### 1.2 改法（两条，都可度量、低风险，选一条即可）

1. **把两次 localStorage 写并成一次**：`finishSaved` 掉 `persistDocKey(withEol)`（`App.tsx:2638-2642`），只留停笔链那一次；或反过来只留保存链那一次。实测一次停笔省 **148,468 B 同步写**（约 0.1–0.5 ms，300 ms 周期内不会更慢，但少一次整篇字符串化与配额压力）。
   - 风险：低。唯一影响是「掉电后恢复的最后一份 localStorage 正文」比现在少一次（窗口仍是 300 ms 或 2 s，二者取其一）。`draft-acceptance` / `save-acceptance` 覆盖该路径。
2. **同键不重复删**：`App.tsx:2653` 前加 `if (oldName !== name)`。省 1 次 `removeEntry`，零语义变化。
   - 风险：0。

不建议为了这个删掉 localStorage 兜底（宿主/文件树上的崩溃恢复还靠它），只改节拍与去重。这条与第 44 轮 F2 同源，本轮补上了「真落盘路径」的实测（第 44 轮这一条是 UNVERIFIED，见 `round-44/findings-code.md` §5-3）。

---

## F2（P2）死代码 5 处（`tsc` 精确列出）+ 1 个只写不读的 ref

### 2.1 证据

`npx tsc --noEmit --noUnusedLocals --noUnusedParameters`（HEAD，5 条 error，全为 TS6133）：

```
src/App.tsx(9,10): error TS6133: 'TextSelection' is declared but its value is never read.
src/App.tsx(18,10): error TS6133: 'InlinePopover' is declared but its value is never read.
src/App.tsx(142,7): error TS6133: 'SAMPLE' is declared but its value is never read.
src/App.tsx(601,9): error TS6133: 'lastClearIdRef' is declared but its value is never read.
src/lib/trash.ts(242,13): error TS6133: 'legacy' is declared but its value is never read.
```

逐条（`read` 工具核对过源码）：

| 位置 | 内容 | 判断 |
| --- | --- | --- |
| `src/App.tsx:9` | `import { TextSelection } from '@tiptap/pm/state'` | 无引用，删 import |
| `src/App.tsx:18` | `import { InlinePopover } from './components/InlinePopover.tsx'` | 无引用；**注意**：组件文件仍在，若它本来该用来做链接/公式就地编辑，属功能没接上（本轮未查证） |
| `src/App.tsx:142-155` | `const SAMPLE = \`# 侧灯 …\``（14 行示例文档） | 首启已改空白文档（第 28 轮），这段是遗留；不会被 tree-shake 前的源码审查漏掉，但会被打包器删掉，所以**不改体积**，只增维护噪声 |
| `src/App.tsx:601` | `const lastClearIdRef = useRef<number \| null>(null)` | 1 处引用（声明本身），删 |
| `src/lib/trash.ts:242` | `const legacy = kind === 'draft' ? null : null` | 恒 `null` 且未使用；**这是半截重构**：`legacyKeyFor` 在 `App.tsx:958-959` 有活引用，这里本该搬旧键草稿却写成了空转。删这行即可，或补成 `kind === 'draft' ? legacyKeyFor(fileName) : null`（后者会改变删除时搬进 trash 的内容，需产品判断） |

另有 1 处 `tsc` 抓不到的死状态：`hostDocRef`（`App.tsx:604` 声明、`727-730` 的 `useEffect` 写入）**没有任何读取点**（`git grep hostDocRef` 命中 2 处）。那段 effect 纯属空转：`[hostDoc]` 变化时把 state 复制进一个没人读的 ref。

### 2.2 改法

1. 删上表 5 处 + `hostDocRef` 与它的 effect（约 −20 行；`SAMPLE` 14 行 + 5 行 + 1 行）。
2. 在 `tsconfig.json` 打开 `"noUnusedLocals": true`、`"noUnusedParameters": true`，让 `npm run build` 的 `tsc -b` 自己挡住下一处死代码。
   - 第 43 轮担心「开了会一次爆 47 个」——实测**不会**：这两个选项只查本地变量/参数，不查 `export`（本轮全仓实测 5 条，全部是本地）。
   - 风险：低。删完跑 `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` 应为 0 条；`npm test` 不受影响（测试不 import 这些符号）。

---

## F3（P2）两条载入路径重复 17 条状态复位语句，已经漂移 5 项

### 3.1 重复量（`.tmp/r45-dup.mjs`）

`applyHostPayload`（`src/App.tsx:1049-1122`，宿主文档入口）与 `loadIntoEditor`（`src/App.tsx:2033-2130`，文件树入口）**逐字相同的有效语句 22 行**（去注释/括号后 17 条是状态复位）：

```
saveTargetRef.current = null
setFrontmatter(split.frontmatter) / frontmatterRef.current = split.frontmatter
setFootnotes(footnoteSplit.footnotes) / footnotesRef.current = footnoteSplit.footnotes
setSaveWarned(false) / setDraftShown(false) / setDraftRestored(false) / setSaveError(null)
setDocNotes([]) / setDirty(false)
setRisks(lossLabels(baselineLossesRef.current))
cancelAutoSaveRef.current() / setAutoSaveState('idle') / setAutoSavedAt(null)
setMarkdown(footnoteSplit.body) / else setViewMode('edit') / syncDocInfo(editor)
```

两条 `serializeDocument` 调用（`App.tsx:1079` 与 `2064`）也是同一组入参。

### 3.2 已经漂移的 5 项（只在 `loadIntoEditor` 里有）

| 语句 | loadIntoEditor | applyHostPayload | 后果 |
| --- | --- | --- | --- |
| `abortRef.current?.abort(); setAnalyzing(false)`（`:2058-2059`） | 有 | **无** | 上一篇的分析请求还在飞、结果会落到宿主新文档上（第 41 轮修过同一条竞态，注释就写在 `:2057`） |
| `setAnalysisGoal('')`（`:2056`） | 有 | **无** | 侧栏目标文案可能沿用上一篇 |
| `setUnresolved(0)`（`:2099`） | 有 | **无** | 侧栏「N 条引文没找到」计数可能残留 |
| `setNotice(null)`（`:2100`） | 有 | **无** | 上一篇的提示条可能留在宿主文档上 |
| `setAnnotations([])`（`:2097`） | 有 | **无** | 宿主路径改为从批注文件恢复，属设计差异，不算漂移 |

前四条是**同类缺陷的遗漏**，不是文档里的设计差异。`applyHostPayload` 只从 `/__doc` 成功或 `recoverHostDraft`/`discardHostDraft` 进入，浏览器态拿不到 `/__doc`（本轮 100 KB 路径实测 2 条 404 → 走回退），所以本轮**没有用户可见的复现**；判 P2 而不是 P1 就是这个原因。

### 3.3 改法

抽一个 `resetDocScopedState({ markBody, keepOriginal, keepAnnotations })`（放在 `src/lib/` 或 App 内的普通函数），两条路径各调一次；四个漏项补上。

- 可度量：重复语句 17 → 0；`App.tsx` 约 −25 行；`abortRef` 竞态口子 1 → 0。
- 风险：中（两条路径语义不完全相同，必须逐项标注差异，不能直接合并）。建议**只搬完全相同的 13 条 + 补 3 条漏项**，`setAnnotations`/`setOriginalText` 留在原地。
- 与第 43/44 轮 F3 的关系：那两轮建议抽 `autoSaveGate`（9 条守卫）。两件事可以一起做，也可以只做这个（收益更直接：真实竞态）。

---

## F4（P2）测试盲区：`taskListInput.ts` 81 行、0 条单测（第 44 轮新增）

- `src/lib/taskListInput.ts`（81 行，第 44 轮实现「`- [ ] ` 建任务项」）**没有任何测试文件引用**（29 个 `*.test.ts` 全扫）。它就是本轮新增的输入规则，含 5 段判定：`itemDepth >= 2`、`list.type.name === 'bulletList'`、`item.childCount === 1`、`paragraph.type.name === 'paragraph'`、`offset + size <= paragraph.content.size`。
- 同批无直接单测的模块（第 43 轮 F4 复核后仍无变化）：`rename`、`workspace`。
- 全部 29 个测试文件只 `import` `src/lib/*`；`App.tsx`（5,437 行）0 条单测，自动保存 9 条守卫、脏判定、草稿三代际检查仍只靠 e2e。

建议（本轮只提最小一条）：把 `taskListInput` 的 5 段判定抽成纯函数（入参：`listTypeName`、`itemChildCount`、`firstChildTypeName`、`depth`、`offset`、`size`、`paragraphSize`），返回 `{ convert, checked }`；`handler` 只留事务拼装。补 8 条单测（有序列表、普通段落、多段落项、偏移越界、`[x]`、`[ ]`、兄弟项不受影响、`item.childCount !== 1`）。

- 成本：≤40 行搬移 + 8 条测试；风险：低（纯函数搬移，e2e `e2e-r44-*` 与 `keyboard-acceptance` 仍覆盖集成）。
- 不建议这一轮动 `App.tsx` 拆分（第 43/44 轮已两次论证成本大于收益）。

---

## 4. 实测数据与旧结论复核（无回归）

### 4.1 本轮实测（dev + StrictMode，100 kb / 1 MB 形状见脚本）

| 指标 | 100 KB（101,385 B / 1,025 段） | 1 MB（1,025,033 B / 1,025 段） |
| --- | --- | --- |
| 载入 wall（reload → 正文可见） | **669 ms** | **2,691 ms** |
| `sl-load-start → sl-parse-done` | 143.5 ms | **970.8 ms** |
| `→ sl-serialize-done` / `→ sl-sync-done` | 148.9 / 151.6 ms | 981.1 / 1,006.1 ms |
| 滚动 20 次（rAF 帧间隔） | 56 帧、中位 16.7、p95 17.6 ms | 54 帧、中位 16.8、p95 17.7 ms |
| 逐键 12 字（真按键，文末） | 中位 **18 ms**、p95 26 ms | 中位 **25 ms**、p95 31 ms |
| 逐键 `getMarkdown`（脏判定） | 12 次、中位 1.3 ms | 12 次、中位 2.4 ms |
| 空闲 3.5 s | `getMarkdown` 1 次（3.2 ms）、localStorage **1 次 / 103,501 B** | `getMarkdown` 1 次（5.4 ms）、localStorage **0 次**（>256 KiB 跳过） |
| `Ctrl+S`（浏览器无落点） | `getMarkdown` 1 次（2.6 ms）、`toast`「已取消保存。」 | 1 次（3.4 ms）、同 |
| 源码往返 ×2（`Ctrl+/`） | 进 108/79 ms、出 67/67 ms；`sl-parse-done` 2→2 | 进 433/423 ms、出 212/221 ms；`sl-parse-done` 2→2 |
| 强 GC 后 `usedJSHeapSize` / 可见节点 | 58,254 KB / 1,108 | 67,197 KB / 1,108 |
| `Memory.getDOMCounters` | `{documents:1, nodes:5,279, listeners:288}` | `{documents:1, nodes:5,279, listeners:288}` |

### 4.2 复核的旧结论（都在 HEAD 上仍成立，未见回归）

1. **保存路径没有重复全文计算**：`Ctrl+S` 1 次 `getMarkdown`（100 KB 2.6 ms、1 MB 3.4 ms），与第 42–44 轮一致。
2. **逐键不卡**：1 MB 中位 25 ms/键（第 44 轮 24 ms），`dispatch` 中位 0.1 ms、最大 6 ms。
3. **滚轮 60 fps**：p95 17.7 ms，与第 43 轮（16.7 ms）同量级。
4. **退出源码不重解析**：`sl-parse-done` 进/出前后都是 2 条（StrictMode 两遍）。出源码 1 MB **212–221 ms**，比第 43 轮（284–315 ms）更低——本轮来源不同（第 43 轮用 4,096 段的脚本），**不下「变快」结论**，只记录不回归。
5. **自动保存写盘结果正确**：假 FSA 里 `长文.md` 落盘 147,017 B，尾串含刚打的 `字字字…`，`dirty:false`，`toast`「已保存 长文.md」。
6. **相等快路径仍在**：1 MB 空闲只多 1 次 `getMarkdown`（5.4 ms），没有额外的 `baselineLosses` 放大（普通文档早退）。

---

## 5. UNVERIFIED

1. **宿主真机（WebView2）的写放大**：本轮用假 FSA 走了「文件树 + 真句柄」路径，宿主 `draft-save`/`save` 走 `postMessage`，队列与回包时序不同，**没测**。补测：`scripts/host-save-acceptance.mjs` 里加计数（`draft-save` 条数、`save` 条数）。
2. **F1 改法的实际收益**：只给了实测的字节数与调用次数，没应用改动复测（只读角色）。补做后同脚本对比 `lsWrites` 应为 1、`fsWrites` 应为 3。
3. **F3 漂移项的用户可见故障**：浏览器态拿不到 `/__doc`，四条漏项没造出可复现状态。补测：用 `page.route('**/__doc', …)` 伪造宿主响应，先在侧栏造出 `unresolved > 0`（需要真模型或直接改 state），再切宿主文档看残留。
4. **生产构建（无 StrictMode）**：全部数字来自 dev server；1 MB 的 parse 在生产应约为一半（沿用第 42–44 轮口径，本轮未测）。
5. **1 MB 单段落文末逐键（第 39 轮 28 s）**：本轮样本是 1,025 段，**没复测**单段落形状（第 40/41/42 轮都没复现）。补测：`.tmp/e2e-r39-code-caret.mjs` 仍可用（需 4 分钟载入）。
6. **内存增长**：只做「强 GC + `usedJSHeapSize`」单点读数，没做堆快照对比，**不判泄漏**。
7. **F2 里 `InlinePopover` 是否该接上**：只确认无引用，没有查它是不是链接/公式就地编辑的旧实现（`LinkEditor`/`MathInlineEditor` 在用）。

---

## 6. 环境与脚本坑（本轮踩到的）

1. **PowerShell 生成无 BOM 的 UTF-8 脚本可跑，但 `@'…'@` 里写 CommonJS 会被 Node 24 当 ESM**（仓库 `package.json` 是 `"type": "module"`）：`require is not defined`。用 `import` 重写即可。
2. **`Get-Content` 的行号与 `read` 工具/`tsc` 不一致**（同一文件 `read` 报 5,436 行、`Get-Content | Measure-Object -Line` 报 4,972 行，`tsc` 报的行号与 `read` 一致）。按行号引证据一律以 `read` 工具与 `tsc` 输出为准，不要用 `Get-Content -Skip` 定位。
3. **假 FSA 的写计数**：直接包 `window.__fsState.files` 的 `Map.prototype.set/delete` 最省事，比包 `createWritable` 更准（能区分建文件写 0 字节与真写）。注意先装 `installFakeWorkspace`（`page.addInitScript`），再用第二个 `addInitScript` 包 Map。
4. **9225 的 profile 里有旧页面**：`reset.mjs` 报了 `closed:2`，脚本自己 `ctx.newPage()` 开新页最稳，别复用列表里的第一个页面（可能是别的角色留下的）。
