# 第 17 轮 · 缺陷侦察（finder: bug）

范围：长文（接近 6 MB）、切换竞态、删除/重命名、草稿/最近、内存与监听器。
方法：只读 `src/`，用假文件系统（`showDirectoryPicker` + 假句柄，可注入慢写/慢列目录）与假宿主（`chrome.webview` + 手动回包）在 CDP 上做确定性复现。
脚本：`.tmp/r17-bug/probe.mjs`（长文/竞态/宿主）、`size-sweep.mjs`（尺寸扫描）、`race-refresh-timeline.mjs`、`race-rename.mjs`、`control-no-refresh.mjs`、`bench-repairs.mjs`。截图与原始日志：`shots/round-17/`、`.tmp/r17-bug/long.log`。
未改 `src/`。真实 IME、真实 WebView2 宿主、网络盘仍未验证，下面每条都写了验证边界。

## 测量口径

- 时间都是 `Date.now()` 差值（含 Playwright/CDP 往返约 2–5 ms）；只比较相对大小。
- 「每字」用 CDP `Input.insertText` 连发 12–20 次，取中位数，代表一次真实输入事务的端到端耗时。
- 大文档脚本：中文段落（每段约 2100 字符，每 10 段一个 `##` 标题），5.9 MiB = 2,065,331 字符。
- 本文不复述 `findings-perf.md` 的 P2（每键两遍全文序列化、77 ms/键）。B2 只报「6 MB 上限不一致 + 载入悬崖」这一条缺陷。

---

## B1（严重 · 数据覆盖）保存还在写盘时切文档：旧回包把新文档的身份改回旧文件，之后新文档的正文写进旧文件

### 复现（确定性，假句柄注入 1500 ms 慢写）

1. 工作区有 `a.md`、`b.md`。打开 `a.md`，在末尾打 `AAA`。
2. `window.__fs.slowWrite['a.md'] = 1500`（模拟 6 MB 文档/网络盘的写盘时长）。
3. 按 `Ctrl+S`，250 ms 后点文件树里的 `b.md` → 弹「未保存的改动」→ 点「不保存」。
4. 等 2.2 s（旧保存回包到达），看标题；再在正文打 `ZZZ`，`Ctrl+S`。

### 证据

```
切换刚完成：标题「b.md」正文 2 字符                 ← 正常
+2.2 s：标题「a.md」__slState「a.md」               ← 旧回包把身份改回 a.md
正文仍是「B乙」                                    ← 正文是新文档的
之后的 Ctrl+S：a.md 含 ZZZ=true，b.md 含 ZZZ=false
  a.md 末尾 = "# B\n\n乙ZZZ\n"                     ← a.md 原内容被 b.md 覆盖
  b.md 末尾 = "# B\n\n乙\n"
  提示「已保存 a.md」
```

`shots/round-17/race-switch.png`。a.md 原来的 `# A / 甲AAA` 已不可恢复（没有旧内容副本）。

### 根因

- `src/App.tsx:2069` `performCommit` 只在**写之前**校验身份（`:2081-2088`：deleting/refreshing/generation/handle 四项），`await writing` 之后不再校验，直接 `finishSaved(target.name, target, …)`（`:2112`）。
- `src/App.tsx:2010` `finishSaved` 无条件改写全局身份：`saveTargetRef`（`:2013`）、`docName`/`docNameRef`（`:2015-2016`）、`setActiveFile`（`:2017-2025`）、`baselineRef`（`:2014`）、`setDirty(false)`（`:2037`）。它不知道这份回包属于哪一篇。
- 切文档路径不等文件写回：`requestLoad`（`:1640-1655`）只 `await waitForHostSave()`（`:545-555`，只看宿主 `pendingIdsRef`），**不含** `performingCommitRef`；`discardAndSwitch`（`:2852-2861`）直接 `loadIntoEditor`。
- `loadEpochRef`（`:508`、`:1643`）只用在 `requestLoad` 自己内部，`finishSaved` 与 `performCommit` 都没读它。

### 建议

给「写盘 → 收尾」加代际：`performCommit` 起手记 `const epoch = loadEpochRef.current`，`await` 之后与 `finishSaved` 里都比一次，不同就只更新磁盘/丢弃收尾（不碰 `saveTargetRef`/`docName`/`baselineRef`/`dirty`）。切文档前把 `performingCommitRef` 也纳入等待（复用 `waitForCommit`，`:563-570`），或在 `discardAndSwitch` 里 `await` 它。最省事的写法：`finishSaved` 增加 `expected: { handle, path }` 参数，与当前 `fileRef.current` 对不上就 return。

### 难度

中。改动集中在 `performCommit`/`finishSaved`/`requestLoad`，需要一条测试：慢写 + 切换 + 断言 `doc-name`、`saveTargetRef`、磁盘字节。

---

## B2（严重 · 长文）6 MB 上限只挡宿主路径：从文件树打开 5.9 MB 文件 2 分钟没载入，没有进度也没有错误

### 复现

1. 假工作区里放 `small.md`（10 KB）与 `big.md`（5.9 MiB / 2,065,331 字符）。
2. 先打开 `small.md`，再点 `big.md`，等标题变成 `big.md`。

### 证据（`size-sweep.mjs` + `probe.mjs long`）

| 文档 | 字符 | 载入 | 每字中位 | 保存 | 导出 |
| --- | --- | --- | --- | --- | --- |
| 10 KB | 4.2 K | 55 ms | 19 ms | 25 ms | 143 ms |
| 100 KB | 35.7 K | 67 ms | 19 ms | 20 ms | 74 ms |
| 1 MB | 350 K | 157 ms | 14 ms | 18 ms | 74 ms |
| 2 MB | 700 K | 402 ms | 37 ms | 62 ms | 94 ms |
| **5.9 MB** | **2.07 M** | **>120,050 ms 未载入** | — | — | — |

5.9 MB 那次：标题一直是 `small.md`，`.editor` 正文仍是 4,220 字符，状态栏还是旧文档；**没有错误横幅、没有 toast、没有「文件过大」提示**，只有一个 2 分钟不动的窗口。同尺寸走宿主时反而有可见错误（`.tmp` 里 round-06 的用例：`上限 6 MB`）。

### 根因

- `MAX_HOST_DOC_LENGTH`（`src/App.tsx:226`）只在 `/__doc` 分支检查（`:971-977`）。文件夹路径 `openWorkspaceFile`（`:1694-1704`）→ `readNode`（`src/lib/workspace.ts:237-244`）**没有任何尺寸检查**。
- 载入后的收尾也没有兜底：2 MB 已要 402 ms，5.9 MB 是 3 倍字符却 >300 倍耗时，说明 `setMarkdown`（`:787-806`，`manager.parse` → `nodeFromJSON` → 整篇 `dispatch`）或紧随其后的 `readBlocks`/`buildContext`（`:902-904`）在某个规模点上失控。纯函数侧已排除：`repairFootnoteRefs/repairMath/repairHtml/repairCalloutMarkers/reuseTables` 在 2.07 M 字符上一共 < 2 ms，`countText` 36 ms，`splitFrontmatter` < 0.1 ms（`bench-repairs.mjs`）。
- `loadIntoEditor` 里那次 `localStorage.setItem`（`:1632`）**没有 try/catch**（同文件其他三处都有，`:743`、`:886`、`:2056`）。超过配额时它会抛 `QuotaExceededError`，而它后面的 `syncDocInfo`/`restoreAnnotationsFor`（`:1633-1634`）就永远不执行。这条是代码事实，未在 5.9 MB 上验证（因为根本没载入成功）。

### 建议

1. 把 6 MB 判断下沉到「读文件之后、进编辑器之前」的公共入口（`readNode` 的调用方或 `setMarkdown` 前），超限走和宿主一致的中文错误，并在文件树行上标记。
2. `loadIntoEditor` 的 `localStorage.setItem` 包 try/catch，失败也继续 `syncDocInfo`。
3. 载入用 `requestIdleCallback`/分片或先给「正在载入…」状态；至少让用户能取消。
4. 定位悬崖：在 `setMarkdown` 的 `manager.parse`、`nodeFromJSON`、`dispatch`、`readBlocks` 四处打 `performance.mark`，用 3/4/5 MB 三档二分（本轮时间不够，未做）。

### 难度

中。上限检查是低难度；悬崖定位与分片载入是中。

---

## B3（严重 · 丢字）宿主保存回包把「回包前打的新字」一起清成已保存，关窗保护不再拦

### 复现（假宿主，手动回包）

1. `/__doc` 返回可写宿主文档。在正文打 `AAA`，`Ctrl+S`（发出 1 条 `save`，不回包）。
2. 保存还在飞时继续打 `BBB`。
3. 回 `{type:'save-result', ok:true, mtime}`。

### 证据

```
保存已发出 1 条，dirty=true
回包前：dirty=true，正文含 BBB=true
回包后：dirty=false，正文含 BBB=true，补发 save=1（没有第二条），draft-save=0
        提示「已保存到 host.md」
```

`shots/round-17/host-save-race.png`。`BBB` 既没进 `save` 消息，也没进草稿（`draft-save=0`），但 `dirty` 被清成 false。真实宿主里 6 MB 文档写盘、网络盘、机械盘都能把「回包延迟」拉长到几百毫秒到几秒；这期间打的字在关窗时不会被拦——宿主关窗前读的就是 `window.__slState.dirty`（`host/Program.cs:796-806`，`dirty=="0"` 直接关；`__slState` 见 `src/App.tsx:607-609`），浏览器分支的 `onbeforeunload` 同样看 `dirty`（`:2650-2663`）。

### 根因

- `applyHostSaveSuccess`（`src/App.tsx:2742-2779`）只比对 `sentTextRef.current.id`（`:2744-2746`），从不比对「当前正文是否还等于发出去的那份 `sent.text`」；随后无条件 `baselineRef = sent.text`、`setDirty(false)`（`:2754-2759`）。
- 打字不会排队补发：`sendHostSave` 只在用户**再按一次**保存时把最新正文塞进 `pendingHostSave`（`:2710-2713`）；`onUpdate` 没有「写回在飞时把正文标脏/排队」的逻辑。
- 自动保存也接不上：`runAutoSave` 在 `pendingIdsRef.size > 0` 时直接 `return`（`:2518`），**不重排**。
- 草稿兜底被同一路径清掉：`clearHostDraft`（`:2437-2450`）先 `clearTimeout(draftTimerRef)`（`:2438-2441`），再 `draftSuppressed = true`（`:2447`），所以这 800 ms 内的草稿写不出去。

### 建议

`applyHostSaveSuccess` 里加一条：`if (currentMarkdown() !== sent.text)` 就只更新 `mtime`，保留 `dirty`、保留草稿，并重排一次自动保存。`sendHostSave` 的排队条件从「再按一次」改成「收尾时正文仍则排」；`clearHostDraft` 只在 `dirty === false` 时调用。

### 难度

低。逻辑集中在一个回调里，可加一条假宿主用例（回包前后各打一次字）。

---

## B4（中 · 身份丢失）刷新飞行中重命名：现役文档被判「已不在磁盘上」，保存目标清空，下次保存变另存为

### 复现

1. 打开 `a.md`，打 `BEFORE`，`Ctrl+S` 写入。
2. 点「刷新文件树」（注入慢列目录 2500 ms，模拟网络盘/大文件夹）。
3. 刷新还在飞时：右键 `a.md` → 重命名 → `b.md` → Enter。
4. 等刷新结束，再打 `AFTER`，`Ctrl+S`。

### 证据

```
改名刚完成: name=b.md, aria-selected=""（树里没有选中行）, listCalls=2
慢刷新结束: tree=["工作区/b.md","工作区/c.md"], 仍无 aria-selected
改名后保存: writes 里没有 b.md；toast「已取消保存。」；b.md 停在 "# A\n\n甲BEFORE\n"
```

`shots/round-17/race-rename.png`。用户看到的是：改名成功了，但标题名与磁盘偶尔对不上、下次保存弹「另存为」，`AFTER` 这段字哪都没落。

### 根因

- `refreshTree` 有单飞锁：`if (refreshingRef.current) return null`（`src/App.tsx:1711`）。`handleRenamedFile` 的 `refreshTree({ mode: 'adopt', activePath: newPath })`（`:1825`）拿到 `null` 也照样往下走，**adopt 被静默丢弃**。
- 那次仍在飞的刷新用的是改名前的快照：`afterByPath` 里没有新路径，`targetPath` 还是旧路径（`:1726`），进入 `mode === 'check'` 分支 → `setActiveFile(null)` + `saveTargetRef = null` + 「已不在磁盘上」错误（`:1733-1737`、`:1743-1748`）。
- `prepareRename`（`:1759-1770`）只在同步段里把 `deletingRef` 置真又立刻置假，改名 `await` 期间没有保护；`loadEpochRef` 在 `handleRenamedFile` 里加了（`:1778`）但没有代码消费。

### 建议

刷新改成「排队 + 合并」而不是丢弃：`refreshingRef` 时置 `pendingRefreshRef`，当前刷新结束后用最新 `activePath` 再跑一次。`handleRenamedFile` 里 adopt 返回 `null` 时直接改 `activeFile`/`saveTargetRef`（不依赖树刷新），或者让 `refreshTree` 接受「强制 adopt」参数。若真实场景难触发，至少给 `activePath` 找不到时一次 `isSameEntry` 探测，再判定「已不在磁盘上」。

### 难度

低-中。`refreshTree` 的返回值语义要理清（现在 `null` 同时表示「没工作区」「正在刷新」「读失败」）。

---

## B5（中 · 静默失败）手动保存撞上文件树刷新：这次保存被静默丢弃（文件已写盘，dirty 不清、无提示、无草稿）

### 复现

1. 打开 `a.md`，打 `KEEP-ME`；注入慢写 300 ms 与慢列目录 3000 ms。
2. `Ctrl+S`，100 ms 后点「刷新文件树」。

### 证据（`race-refresh-timeline.mjs`，时间线）

```
1700 write-start a.md
1830 list-start（刷新开始）
2010 write-end a.md:14:310ms     ← 文件确实写进去了
4833 list-end
之后：dirty=true，toast=null，removes=[]，a.md 内容含 KEEP-ME
对照（同样慢写、不点刷新）：dirty=false，toast「已保存 a.md」
```

`shots/round-17/refresh-1-after.png`。用户体验：按了保存、文件也真的写了，但脏点一直在、没有任何提示；再按一次才恢复。

### 根因

- `performCommit` 的写后分支把「刷新中」和「删除中」同等处理（`src/App.tsx:2097-2111`）：命中就 `return false`，并且**准备 `removeEntry(target.name)`**（注释写的是「删除已经发生就把刚写回的文件再删一次」）。刷新并没有删除文件，这个分支语义不对；本轮复现里 `removeEntry` 未被调用（`activeFile`/`root` 条件未同时满足，具体哪一项未定位），但风险留着。
- `runSave` 拿到 `false` 就直接 `return`（`:2220-2223`）；`requestSave` 已经在开头 `cancelAutoSaveRef.current()`（`:2232`），于是既没有错误提示，也没有草稿兜底（兜底只在 `runAutoSave` 的失败分支 `:2569`）。

### 建议

写后分支拆开：`deletingRef` 才做「删了再删一次」；`refreshingRef` 只重新取一次绑定（或什么都不做），照常 `finishSaved`。`performCommit === false` 时 `runSave` 至少 `fail(...)` 或 `void writeDraftFallback(...)`。给 `refreshTree` 加「保存中不刷新」的排队（与 B4 一起改最省）。

### 难度

低。三条判断拆开即可，加一条慢写 + 刷新的用例。

---

## 内存与监听器审计（未发现无界泄漏）

- **没有 ResizeObserver**；`scroll`/`resize` 监听在 `src/App.tsx:1475-1476`，清理在 `:1477-1483`；宿主消息监听在 `:2847` 返回 `host.addEventListener` 的退订；输入法组合监听 `:2615-2619` 成对；数学草稿 `editor.on('update'/'selectionUpdate')` 在 `:3465-3472` 退订；`useDialogFocus` 的 `keydown` 与 `inert` 在 `src/components/useDialogFocus.ts:56-70` 还原。
- 有界表都有删除：`cardRefs`（`App.tsx:4029-4032`，ref 回调 null 时 delete）、`saveTimersRef`（`:2830-2833`）、`recentRequestsRef`（`:2804-2808`）。
- 没有清的是计时器本身（不是泄漏，但会多留闭包）：`sendRecent` 每次请求留一个 10 s 的 `setTimeout`（`:2330`，回包后不 clear）；`waitForCommit` 每次留 2 个 2 s 的 `setTimeout`（`:567-569`）。
- 堆：1 MB 文档载入后 `usedJSHeapSize` 69 MB（空白基线 43–44 MB）；2 MB 时读到 46 MB（GC 后回落），说明峰值抖动大但会回落。与 `findings-perf.md` P5 的结论一致。

## 优化机会（最多 3 条）

1. **一次序列化 + 草稿降级**：`onUpdate` 现在先 `contentRef.current()`（`App.tsx:725` → `:2142-2151` → `serializeDocument.ts:35-51`）再 `current.getMarkdown()` + 同一条 repair 链（`:732`），每键两遍；`countText` 单次在 2.07 M 字符要 36 ms 且每键都跑（`:730`）。改成算一份 `body` 复用、`extractOutline/countText` 走 100 ms 防抖；`localStorage` 整篇写入（`:743`）+ `loadIntoEditor` 的无保护写入（`:1632`）按大小阈值关掉（>1 MB 只走 `.sidelight`）。预期 2 MB 文档每键 37 ms → 15 ms 以内。
2. **抽 `useDocumentSession()`**：保存/草稿/最近/切换这块有约 20 个 ref（`saveTargetRef` 9 处赋值、`savingRef`/`deletingRef`/`refreshingRef`/`draftGenerationRef`/`autoSaveGenerationRef`/`loadEpochRef` 六套代际/标志），B1/B4/B5 全是它们不一致造成的。抽出去之后合并成一个 `busy` 状态机 + 一个 `epoch`，`App.tsx` 从 4,347 行 / 166,898 B（`STATE.md` 与 `README` 仍写「约 3100 行」）降到 3,400 行左右，B1/B5 的修复也就变成一处判断。
3. **统一 `withTimeout(promise, ms, signal)`**：`waitForHostSave`/`waitForCommit`/`sendRecent` 三处各自 `new Promise` + `setTimeout`（`:567`、`:569`、`:2330`）且都不 clear。合成一个工具，顺带把 `loadEpochRef` 作为取消信号传进去，B1/B4 的「晚到回包」就能统一挡掉。

## 未验证 / 下一轮补

- 真实 WebView2 宿主下的 B1、B3（本轮用假保存时长；真实 6 MB 写回耗时未测）。
- 网络盘/OneDrive 上 B4、B5 的可触发概率（本轮用 300/2500 ms 人为延迟；真实值未测）。
- 5.9 MB 载入悬崖的准确位置（`setMarkdown` 的 parse 还是 ProseMirror dispatch）。下一轮在 `manager.parse`/`nodeFromJSON`/`dispatch` 打 mark，用 3/4/5 MB 三档二分。
- 真机 `performance.memory` 与 GC 曲线（headless Edge 下 longtask 观察器没回报，数据不可信，已弃用该指标）。
