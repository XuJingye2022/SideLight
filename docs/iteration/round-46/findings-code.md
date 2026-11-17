# 第 46 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`39e4f0211f43b7edaca82d468d0997f029151e3c`（`git rev-parse HEAD` 实测一致）；收工时 `git status --porcelain` 只有未跟踪的 `docs/iteration/round-46/` 与 `shots/round-46/`，`git diff -- src` 为空（**产品代码未改**）。
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP **9225**（未启 Edge、未 kill msedge）、Node 24.21；每条 E2E 前跑 `node .tmp/reset.mjs 9225`。
- 本轮新写脚本（`.tmp/`，都可复跑）：
  - `.tmp/e2e-r46-code-perf.mjs` → `.tmp/perf-round46-code.json`：100 KB / 1 MB 载入埋点、滚动帧、逐键（含 longtask）、空闲派生、`Ctrl+S`、源码往返 ×2、堆与 DOM 计数；**另在页面里直接 `import('/src/lib/risk.ts')` 量整篇扫描代价**（同一份 Vite 模块，不是复制代码）。
  - `.tmp/e2e-r46-code-writes.mjs` → `.tmp/perf-round46-writes.json`：假 FSA 工作区里真跑「打开文件夹 → 打开 147 KB 文档 → 打字 → 自动保存 → 打开带脚注定义的 147 KB 文档 → 同样一轮 → 切文档 5 轮量内存」。
  - `.tmp/e2e-r46-code-footnote1mb.mjs` → `.tmp/perf-round46-footnote1mb.json`：假 FSA 里各开一次 **1 MB 普通文档**与 **1 MB 带脚注定义文档**，打 10 字后等 6 s，用 `PerformanceObserver('longtask')` 录真实自动保存周期的主线程长任务。
- 端到端走过的用户路径（每条都有截图）：
  1. 100 KB 文档：载入 → 滚轮 20 次 → 文末打 12 字 → 空闲 3.5 s → `Ctrl+S` → `Ctrl+/` 源码往返 2 次。`shots/round-46/code-100kb-{loaded,scrolled,saved,source}.png`
  2. 1 MB 文档：同上。`shots/round-46/code-1mb-{loaded,scrolled,saved,source}.png`
  3. 假 FSA 工作区：打开文件夹 → 打开 `长文.md`（147,007 B）→ 打 10 字 → 等自动保存 5 s → 打开 `脚注.md`（146,825 B，文末一条 `[^1]:` 定义）→ 打 10 字 → 等自动保存 5 s → `短文.md`/`长文.md` 交替切 5 轮。`shots/round-46/code-fsa-{open,autosaved,footnote,switch}.png`
  4. 假 FSA 工作区 1 MB 档：打开 `普通.md`（1,025,031 B）→ 打 10 字 → 等 6 s；再打开 `脚注.md`（1,024,058 B，文末一条 `[^1]:` 定义）→ 同样一轮。`shots/round-46/code-fsa-1mb-普通.png`、`code-fsa-1mb-脚注.png`
- 控制台：三条路径 **0 条 console error、0 条 pageerror**；`requestfailed` 0 条（浏览器态 `/__doc` 404 属预期，脚本已按 `/__` 过滤）。

---

## 结论摘要

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | 空基线 + 文档里有**任何脚注定义**时，每次保存都要整篇 `classify`：1 MB 文档每次多 **78.5–83.5 ms** 同步阻塞，真实自动保存周期实测出现 **2 条 100 ms longtask**（同样大小、无脚注的 1 MB 文档 **0 条**），结果被过滤后只剩 `footnote-loss` 一族 | **P2** | 1 MB：`activeLosses` 78.5 / 83.5 ms（无脚注 0.2 ms）；`classify` 76.8 / 78.2 ms；真实自动保存 longtask 普通 0 条 / 脚注 **100 + 100 ms** |
| F2 | 第 45 轮 F1（一次停笔 4× 写放大）**未修**，本轮在假 FSA 里 1:1 复现，数字与第 45 轮一致 | **P2** | 147 KB 文档：`getMarkdown` 12 次、localStorage **2 次 / 296,934 B**、草稿 147,016 B + 删 2 次、正文 147,017 B → 一份 147 KB 写了 **591 KB** |
| F3 | 第 45 轮 F2（死代码 5 处）**未修**，`tsc --noUnusedLocals --noUnusedParameters` 仍有 5 条 TS6133，行号只有一处漂移 | **P2** | 5 条 error：`App.tsx:9/18/142/605`、`trash.ts:242`（`lastClearIdRef` 601→605） |

`actionable_count = 3`（F1 是本轮新发现，F2/F3 是上一轮已报、本轮复核仍未修；三条都有本轮命令输出或代码行号）。

**没有发现新的功能 BUG**（F1 是性能问题，不是功能缺陷）：载入、滚动、逐键、源码往返、自动保存、切文档六条路径全部跑通且无回归；写盘字节与应用内正文逐字节一致（见 §4-5），切文档 5 轮 DOM 节点 0 增长（见 §5-1）。

---

## F1（P2，新）空基线 + 脚注定义 → 每次保存整篇 `classify`，1 MB 多 ~78 ms

### 1.1 代码路径

`activeLosses`（`src/lib/risk.ts:376-383`）平时有精确相等快路径和早退，但有一条例外：

```ts
export function activeLosses(original: string, current: string, baseline: Loss[]): Loss[] {
  // 基线为空但原文有脚注定义时仍要分类，其余文档保持原有的早退
  if (baseline.length === 0 && !FOOTNOTE_DEFINITION.test(original)) return []
  const baselineKeys = new Set(...)
  return classify(original, current).filter(
    (loss) => loss.blocking && (loss.kind === 'footnote-loss' || baselineKeys.has(...)),
  )
}
```

基线为空时 `baselineKeys` 为空集合，`filter` 只可能留下 `kind === 'footnote-loss'`。也就是说 `classify`（`risk.ts:319-361`）把六族损失全算一遍、含 `diffLines` 全文行差分（`risk.ts:347`），然后**全部丢弃**，只留一族。

两个调用点都在保存链上（每次保存都跑）：

- 手动保存 / 另存为 / 保存并切换：`src/App.tsx:2924`
- 停笔 2 s 自动保存：`src/App.tsx:3198-3202`

### 1.2 实测（`.tmp/e2e-r46-code-perf.mjs`，页面内 `import('/src/lib/risk.ts')`，各测 3 次取中位）

同一段 1,025 段 / 1,025,033 B 正文，只差「文末有没有一条 `[^1]:` 定义」：

| 调用 | 无脚注定义 | 有脚注定义 |
| --- | --- | --- |
| `activeLosses(text, 改 1 个字, [])` | **0.2 ms** | **78.5 ms**（100 KB 那轮同法测得 83.5 ms） |
| `classify(text, 改 1 个字)` | — | 76.8 / 78.2 ms |
| `fenceMap(text)` | 0.2 ms | 2.0 ms |
| `countReferenceDefinitions(text)` | 0.4 ms | — |

读数说明：

1. 78 ms 是**主线程同步阻塞**，超过 50 ms longtask 门槛；按 `risk.ts:322-323` 的注释，`classify` 里最贵的一段就是 `diffLines`（1 MB / 2,050 行约 77 ms），与实测吻合。
2. 用户在 1 MB 文档里停笔一次（自动保存）或按一次 `Ctrl+S`，就额外付这 78 ms；文档里有脚注定义（或载入时基线的结构损失非空）都会命中，普通 1 MB 文档不命中（0.2 ms 早退）。
3. 147 KB 的 `脚注.md` 在真实自动保存周期里**没有出现 longtask**（`longtasks: []`），说明这一档文档的额外开销在 50 ms 以下（按 78 ms × 147/1024 估算约 11 ms），不是用户可见卡顿；本条针对大文件。
4. **真实自动保存周期（1 MB，假 FSA）**：同样 1,024 段、打 10 字、等 6 s——`普通.md`（1,025,031 B）`longtasks: []`；`脚注.md`（1,024,058 B，只多文末一条 `[^1]:` 定义）**`longtasks: [100, 100]`**。两份文档唯一差别就是那条脚注定义，正好命中 `risk.ts:378` 的例外分支，说明用户在大文件里停笔保存时会看到约 100 ms 的主线程卡顿（两次）。
5. 自动保存在停笔 2 s 后跑，此时用户通常已经停手，阻塞感弱；但手动 `Ctrl+S`（`App.tsx:2924`）是按键后立刻付这笔开销，且与写盘在同一段同步代码里。

### 1.3 改法（低风险，可度量）

在 `activeLosses` 里加一条窄路径：基线为空时只跑脚注一族，不做 `classify`：

```ts
if (baseline.length === 0) {
  return footnoteLosses(original, current).filter((loss) => loss.kind === 'footnote-loss')
}
```

- 等价性：`baseline.length === 0` ⇒ `baselineKeys` 空 ⇒ 现有 `filter` 只保留 `footnote-loss`（`risk.ts:380-382`）。`footnoteLosses`（`risk.ts:129-190`）原样复用即可，只多一次 `.filter`。
- 收益：1 MB 文档每次保存从 **78.5 ms 降到「fenceMap ×2 + 一次行扫描」**（按本轮实测 `fenceMap` 2 ms/次，估算约 5 ms；精确值未测，见 §7-1）。删掉的是整段 `diffLines`。
- 风险：低。`diff.test.ts:248-260` 两条用例（基线为空仍拦脚注定义丢失、只改正文不拦）正好覆盖这条路径，改完跑 `npm test` 即可验证；另外 `classify` 的 `reference-links` 等族在空基线下本来就永远被过滤，不存在语义变化。
- 注意：`baseline.length > 0`（载入即带结构损失的文档）那条分支**仍会**跑完整 `classify`，那是设计需要的，别一起改。

---

## F2（P2，第 45 轮 F1 未修复核）一次停笔仍写 4 遍同一份正文

### 2.1 本轮实测（`.tmp/perf-round46-writes.json`，假 FSA 工作区，`长文.md` 147,007 B）

连续打 10 字（148 ms），再等 5 s：

| 计数 | 本轮 |
| --- | --- |
| `editor.getMarkdown()` | 打字期 **10**（每键 1 次脏判定）+ 停笔期 **2** = **12** |
| `localStorage.setItem` | **2 次 / 148,466 + 148,468 = 296,934 B** |
| `.sidelight/drafts/长文.md` 写 | 2 次（先 `write("")` 建文件，再 147,016 B） |
| 同一草稿删除 | **2 次**（同一路径、同一毫秒） |
| 正文 `长文.md` 写 | 1 次 / 147,017 B |
| 结果 | `dirty:false`、状态条「已自动保存 19:54」、提示「已保存 长文.md」 |
| 写放大 | 147 KB 正文 → **591 KB**（≈4×） |

与第 45 轮 F1 的数字完全一致（296,934 B / 147,016 B / 147,017 B），**说明该条至今未修**。两条最小改法仍有效：

1. 两次 `localStorage` 写并成一次：删 `finishSaved` 里的 `persistDocKey(withEol)`（`App.tsx:2653-2657`），只留停笔派生链那一次（`App.tsx:927-929`）；或反过来。一次停笔省 148,468 B 同步写。风险：低（崩溃恢复窗口少一次写，`draft-acceptance`/`save-acceptance` 覆盖）。
2. 同键不重复删：`App.tsx:2668` 前加 `if (oldName !== name)`。省 1 次 `removeEntry`，零语义变化；顺带可去 `write("")` 建文件那一次 0 字节写（`cache.ts` 调用处）。

---

## F3（P2，第 45 轮 F2 未修复核）死代码 5 处

`npx tsc --noEmit --noUnusedLocals --noUnusedParameters`（HEAD，5 条 error，全为 TS6133）：

```
src/App.tsx(9,10): error TS6133: 'TextSelection' is declared but its value is never read.
src/App.tsx(18,10): error TS6133: 'InlinePopover' is declared but its value is never read.
src/App.tsx(142,7): error TS6133: 'SAMPLE' is declared but its value is never read.
src/App.tsx(605,9): error TS6133: 'lastClearIdRef' is declared but its value is never read.
src/lib/trash.ts(242,13): error TS6133: 'legacy' is declared but its value is never read.
```

与第 45 轮逐条相同，只有 `lastClearIdRef` 从 `601` 漂到 `605`（App.tsx 长了 4 行）。改法不变：删 5 处 + `hostDocRef` 空转 effect（`App.tsx:604` 声明、`727-730` 写、0 读），再在 `tsconfig.json` 打开 `noUnusedLocals`/`noUnusedParameters` 挡住下一处。约 −20 行，风险低。

---

## 4. 本轮实测数据（dev + StrictMode，脚本形状与第 45 轮相同，可直接对比）

| 指标 | 100 KB（101,385 B / 1,025 段） | 1 MB（1,025,033 B / 1,025 段） |
| --- | --- | --- |
| 载入 wall（reload → 正文可见） | **715 ms**（第 45 轮 669） | **2,627 ms**（第 45 轮 2,691） |
| `sl-load-start → sl-parse-done` | 144.9 ms | **972.7 ms**（第 45 轮 970.8） |
| `→ sl-serialize-done` / `→ sl-sync-done` | 150.7 / 153.6 ms | 982.8 / 1,003.8 ms |
| 滚动 20 次（rAF 帧间隔） | 55 帧、中位 16.7、p95 **17.5**、max 17.7 ms | 55 帧、中位 16.6、p95 **18.1**、max 18.2 ms |
| 逐键 12 字（真按键，文末） | 中位 **18 ms**、p95 31 ms、longtask **0** | 中位 **27 ms**、p95 31 ms、longtask **0** |
| 逐键 `getMarkdown`（脏判定） | 12 次、中位 1.4、max 4.2 ms | 12 次、中位 2.3、max 2.9 ms |
| 空闲 3.5 s | `getMarkdown` 1 次（1.3 ms）、localStorage **1 次 / 103,501 B**、longtask 0 | `getMarkdown` 1 次（2.3 ms）、localStorage **0 次**（>256 KiB 跳过）、longtask 0 |
| `Ctrl+S`（浏览器无落点） | `getMarkdown` **1** 次（1.1 ms）、提示「已取消保存。」 | **1** 次（1.7 ms）、同 |
| 源码往返 ×2（`Ctrl+/`） | 进 91/75 ms、出 60/65 ms；`sl-parse-done` 2→2→2 | 进 414/400 ms、出 218/208 ms；`sl-parse-done` 2→2→2 |
| 强 GC 后 `usedJSHeapSize` / 可见节点 | 58,302 KB / 1,108 | 67,257 KB / 1,108 |
| `Memory.getDOMCounters` | `{documents:1, nodes:5,281, jsEventListeners:288}` | 同 |

旧结论复核：

1. **保存路径没有重复全文序列化**：浏览器态 `Ctrl+S` 1 次 `getMarkdown`（1.1–1.7 ms），与第 42–45 轮一致。
2. **逐键不卡**：1 MB 中位 27 ms / p95 31 ms（第 45 轮 25/31），`dispatch` 中位 0.1 ms、max 8.6 ms，longtask 0 条。
3. **滚动 60 fps**：p95 17.5 / 18.1 ms，与第 43–45 轮同量级。
4. **退出源码不重解析**：`sl-parse-done` 进/出前后都是 2 条（StrictMode 两遍）。
5. **写盘字节与应用内正文一致**：自动保存后 `长文.md` 147,017 B，尾串含刚打的 10 个「字」，`dirty:false`。
6. **切文档无 DOM 泄漏迹象**：见 §5-4。

## 5. 试过、但判断没有问题的路径（防敷衍的 0 条）

1. **切文档 5 轮内存**（第 45 轮 UNVERIFIED）：`短文.md`→`长文.md` 交替 5 轮，每轮强 GC 后读数：DOM 节点 807 → 801 → 801 → 801 → 801 → **801（0 增长）**；堆 60,120 → 60,325 → 60,418 → 60,547 → 60,641 → 60,667 KB（+547 KB / 5 轮，≈+110 KB/轮）。节点零增长、堆增量与引擎内部缓存同量级，**不判泄漏**；要判泄漏需堆快照对比，见 §7-3。
2. **载入期重复全文扫描**：`countReferenceDefinitions(text)` + `hasReferenceDefinitions(text)`（`App.tsx:2117-2118`，宿主路径 `1123-1124` 同样）确实是同一份 `fenceMap` 扫两遍，但实测 1 MB 单次只要 **0.4 ms**，两次合计 <1 ms，占 2,627 ms 载入的 0.04%——**不提为改进项**（改了也没收益）。
3. **空闲期 localStorage**：100 KB 1 次 / 103,501 B、1 MB 0 次（>256 KiB 跳过），与第 45 轮一致；属于 F2 的同一族，不另立条目。
4. **控制台/请求**：两条主路径 0 console error、0 pageerror、0 requestfailed；1 MB 源码往返不重解析、不写 `sl-parse-done`。
5. **`activeLosses` 的常规早退**：普通 1 MB 文本 0.2 ms，说明 F1 只在「有脚注定义/基线非空」时付费，不是普遍回退。

## 6. 代码质量读数（口径同第 45 轮）

- `src/App.tsx` **5,454 行 / 215,972 B**（第 45 轮 5,437 行），仍是最大的单文件；第 43–45 轮已三次论证拆分成本大于收益，本轮不重复提。
- 29 个 `*.test.ts`、`^test(` 368 条（AGENTS.md 记 380，口径可能含 `assert` 数或不同计法，未复核）；全部测试仍只 import `src/lib/*`，`App.tsx` 0 条单测。第 45 轮 F4（`taskListInput.ts` 无单测）本轮未变。
- 第 45 轮那次 52 行 `App.tsx` 改动（`git show --stat 39e4f02 -- src` = `App.tsx 52`、`styles.css 6`）**0 条新单测**，与第 45 轮 F4 同族，不另立条目。

## 7. UNVERIFIED

1. **F1 改法的实际收益**：只读角色，未应用改动复测；窄路径的精确耗时（估算 ~5 ms）未测。补测：改后在同一页面 `import('/src/lib/risk.ts')` 跑同一段 `activeLosses`，应从 78.5 ms 降到 <10 ms。
2. **F1 那 100 ms 里各段的比例**：只量到「autosave 任务 >100 ms」与 `activeLosses` 单函数 78.5 ms，`prepareSave` 的 1 次 `getMarkdown`（1 MB 约 2.3 ms）与写盘之外的 React 更新未拆开计时。
3. **F1 在宿主（WebView2）下的可见度**：宿主保存走 `postMessage`，`activeLosses` 仍在主线程同步跑，但回包时序不同，未测。
4. **堆泄漏**：只做 5 轮切文档 + 强 GC 单点读数，未做堆快照对比，不判泄漏。
5. **生产构建（无 StrictMode）**：全部数字来自 dev server；1 MB 的 parse 在生产应约为一半（沿用第 42–45 轮口径，本轮未测）。

## 8. 环境与脚本坑（本轮新增）

1. **假 FSA 种子里不要放互相包含文件名**：`脚注长文.md` 与 `长文.md` 会让 `[role="treeitem"]:has-text("长文.md")` 命中两个节点，点击后落到错的那篇，`waitForFunction` 白等 90 s。改用 `page.getByRole('treeitem', { name, exact: true })`，或改文件名。
2. **页面里可以直接量模块内函数**：`await import('/src/lib/risk.ts')` 拿到的是 Vite 同一份模块，量 `classify`/`activeLosses` 比在 Node 里复制源码更可信（复制会漂移）。注意它只对 `export` 的函数有效。
3. **`longtask` 只报 >50 ms 的任务**：147 KB 的 F1 额外开销（≈11 ms）在 `PerformanceObserver` 里看不到，别据此判「没问题」；大文件才现形。
4. **用 PowerShell 改含中文的 `.mjs` 会把整个文件变乱码**（本轮踩了一次：`Get-Content -Raw | -replace | Set-Content` 之后中文全成 `鏅€氶暱`）。改 `.tmp/*.mjs` 一律用 `write` / `edit` 工具重写；AGENTS §8 早有同一条坑。
