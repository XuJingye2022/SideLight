# 第 17 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-17/plan.md`（v0.30.0）。
审查方式：读计划、三份 findings、`src/App.tsx` 的保存/切换/自动保存段、`src/lib/workspace.ts`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（保存代际只覆盖 `performCommit`，`finishSaved` 的另存为/宿主/迟到回包仍可绕过）、H2（`applyHostSaveSuccess` 用 `currentMarkdown()` 与 `sent.text` 比较，源码 CRLF 会误判为「正文已变」而无限补发）、H3（5.9 MiB < 6 MiB，T3 的「5.9 MB 拒绝」与 6 MB 上限自相矛盾）是 blocker；H4–H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:13-14` 只给 `performCommit` + `finishSaved` 加代际/expected，但 `finishSaved` 还有 `performSaveAs`、宿主 `applyHostSaveSuccess`、自动保存失败兜底等调用点；计划只说「四条保存路径」，没有逐条列出 expected 的构造。`finishSaved` 不匹配时「只清 pending」若 `savingRef`/`pendingIds` 计数没减，会卡住后续保存；`loadEpochRef` 在另存为/宿主成功/删除/重命名是否都递增也没列全。 | `plan.md:13-16`；`App.tsx:2010-2037`（finishSaved）、`:2069-2112`（performCommit）、`:2742-2779`（applyHostSaveSuccess）；`findings-bug.md:40-53` | 列出 `finishSaved` 全部调用点与 expected（handle/path/epoch/docId）；`performSaveAs` 用新句柄的 expected；宿主成功也校验 epoch/docId；`finally` 里减 `pending`/`savingRef`；`loadEpoch` 在 new/switch/rename/delete/saveAs/host-success 六处递增并写单测 | T1 |
| H2 | blocker | T2 `:33` 用 `currentMarkdown() !== sent.text` 判断「回包前又输入」。`sendHostSave` 发的是 `prepareSave().normalized`（LF），而 `currentMarkdown()` 在源码模式可能返回 CRLF；两者永远不等 → 每次回包都补发，形成保存循环。另大文档每次回包做一次全文序列化，正是 T4 要消掉的 77 ms/键成本。 | `plan.md:33`；`App.tsx` 的 `sendHostSave`/`applyHostSaveSuccess`；`findings-bug.md:95-123` | 用 `prepareSave().normalized` 与 `sent.text` 比较（同一 LF 口径）；只比较「自增 contentVersion」而不是全文；补发队列加 `inFlightSeen`，同一 `sent.text` 只重排一次；大文档用 `contentVersion` 判定，不全文序列化 | T2 |
| H3 | blocker | T3 `:51` 定义 `MAX_DOC_BYTES = 6 * 1024 * 1024`（6 MiB = 6,291,456 B），但 `:57` 验收要求「点 5.9 MB 出现文件太大」。5.9 MiB = 6,186,598 B，**小于** 6 MiB；5.9 MB（十进制）= 5,900,000 B，更小。按 6 MiB 上限，5.9 MB 不会被拒绝，仍会走 >120 s 的载入悬崖，T3 验收必失败。 | `plan.md:51,57`；`findings-bug.md:57-80`；`workspace.ts:237-244` | 二选一：把上限改成 5.5 MiB（并改文案「5.5 MB」），或把验收样本改成 6.1 MiB/6.3 MB；`MAX_DOC_BYTES` 与文案/`File.size` 同一字节口径，边界（恰好 6 MiB）写死；`readNode` 在 `getFile()` 后立刻判断，不读 `text()` | T3 |
| H4 | major | T4 `:71` 删第二次序列化、`transaction.docChanged` 直接置脏，但「撤销回基线」改到保存/草稿定时器比对；计划没有写 dirty 的唯一定义（`contentVersion` vs `baselineRef`），T1/T2 的代际和 T4 的 dirty 可能各算一套。`:73` >256 KB 跳过 localStorage，但单文件/无文件夹时 `.sidelight` 不可写，刷新后草稿丢失；计划只说「草稿仍走 .sidelight/宿主」，没写这个降级。 | `plan.md:67-80`；`findings-bug.md:201-212`；`findings-perf.md` P2/P4 | dirty 统一由 `contentVersion !== savedContentVersion` 推导，撤销回基线时显式同步；>256 KB 时若 `.sidelight` 不可写，显示「大文档草稿只保存在内存，刷新会丢」，或回退到 localStorage 分片；memo 的 props 用「原始值 + `useCallback`」表逐项列 | T4 |
| H5 | major | T4 `:74` 的 `React.memo` 涉及 `StatusBar`/`FileTree`/`FileMenu`/`MarginRail`，但 `FileTree` 的 `expanded`/`scrollTop`/`focusPath`/`visibleRows` 是对象/数组 props，`MarginRail` 的 `annotations`/`coordsAtPos` 每键变化；只写「props 拆原始值/稳定回调」没有逐组件列出，memo 可能全不命中，渲染计数验收（≤2）会失败。 | `plan.md:74,79`；`findings-perf.md` P4；`FileTree.tsx`/`MarginRail.tsx` | 四个组件各列 props 表：`FileTree` 传 `workspaceVersion/activePath/expandedKey` 等原始值，`MarginRail` 用 `annotationsVersion` + `coords` 稳定引用；`perf-longdoc` 打印每组件 render 次数，不只看总提交 | T4 |
| H6 | major | T1 只覆盖「保存飞行中切文档」，没有覆盖 findings B4/B5：刷新飞行中重命名（`refreshTree` 单飞返回 null，adopt 被丢弃 → `activeFile` 清空/保存变另存为）、手动保存撞上刷新（`performCommit` 把 `refreshingRef` 与 `deletingRef` 同等处理，返回 false → 静默丢保存）。T1 的 `waitForCommit` 只解决切文档，不解决刷新/改名交错。 | `plan.md:13-16`；`findings-bug.md:131-198`（B4/B5） | `refreshTree` 改「排队 + 合并」，`refreshingRef` 时置 `pendingRefreshRef`，结束后用最新 `activePath` 再跑；`handleRenamedFile` 的 adopt 不依赖 refresh 返回值；`performCommit` 写后分支拆 `deletingRef`/`refreshingRef`，刷新只重绑不返回 false；补 B4/B5 两条慢刷新用例 | T1/T4 |

---

## H1（blocker）保存代际的覆盖点

findings B1 的根因：

```
performCommit 写前校验身份 → await writing → 直接 finishSaved
finishSaved 无条件改 saveTargetRef/docName/setActiveFile/baselineRef/setDirty(false)
requestLoad 只 await waitForHostSave，不等 performingCommitRef
```

T1 的方案正确，但只写到 `performCommit` + `finishSaved` 两个函数。`finishSaved` 还有：

- `performSaveAs`（另存为成功）；
- `applyHostSaveSuccess`（宿主写回成功）；
- 自动保存失败兜底/`sendHostSave` 成功；
- 可能的 `finishSaved` 直接调用。

这些调用点如果仍传旧 target，`finishSaved(expected)` 不匹配就 return，但 `savingRef`/`pending` 是否减、`runSave` 是否收到 false、`requestSave` 是否清 pending，计划没写。`loadEpochRef` 在「另存为成功/宿主成功」是否递增也没列全。

**修**：列一张 `finishSaved` 调用点表，每行写 `expected` 构造、`pending` 清理、`savingRef` 释放、`loadEpoch` 是否递增；`performSaveAs` 用新句柄的 expected；宿主成功也校验 epoch/docId；`finally` 减 pending；补「另存为飞行中切文档」「宿主回包迟到」两例。

## H2（blocker）`currentMarkdown()` vs `sent.text` 的 LF 口径

T2 `:33`：

```
const now = currentMarkdown()
if (now !== sent.text) { ... 补发 ... }
```

`sendHostSave` 发的是 `prepareSave().normalized`（LF）；`currentMarkdown()` 在源码模式返回 `sourceText`，可能含 CRLF。两者永远不等 → 每次回包都判「正文已变」→ 补发 → 回包又不等 → 循环。大文档每次回包还做一次全文序列化，正是 T4 要消掉的成本。

**修**：

1. 用 `prepareSave().normalized` 与 `sent.text` 比较，统一 LF；
2. 更稳：维护 `contentVersion`，`onUpdate` 递增；`sendHostSave` 记录 `sentVersion`；回包时只比 version，不做全文序列化；
3. 补发队列加 `lastResent`/`inFlight`，同一 `sent.text` 只重排一次，避免回包-补发-回包循环。

## H3（blocker）5.9 MB 与 6 MiB 上限

T3 `:51`：

```
MAX_DOC_BYTES = 6 * 1024 * 1024  // 6,291,456 B
```

T3 `:57`：

```
点 5.9 MB：≤2 s 出现可见错误（含「6 MB」）
```

算术：

- 5.9 MiB = 5.9 × 1,048,576 = **6,186,598 B** < 6,291,456；
- 5.9 MB（十进制）= 5,900,000 B < 6,291,456。

按 6 MiB 上限，5.9 MB **允许**，不会出现错误，仍走 >120 s 的载入悬崖。验收必失败。

**修**：二选一：

1. 上限改 5.5 MiB（文案「上限 5.5 MB」），5.9 MB 必拒；
2. 验收样本改 6.1 MiB/6.3 MB，5.9 MB 仅作为「接近上限仍可载入」的对照。

`File.size`（字节）与宿主 `MAX_HOST_DOC_LENGTH`（字符）不是同一口径，必须在 `impl-a.md` 写换算；`readNode` 在 `getFile()` 后立刻判断，不读 `text()`；恰好 6 MiB 的边界写死。

## H4（major）dirty 语义与 >256 KB 草稿

T4 `:71` 删第二次序列化，`transaction.docChanged` 直接置脏；撤销回基线改到保存/草稿定时器比对。问题：

- dirty 的唯一定义没写。T1 的 `loadEpoch`/`activeDocId` 与 T4 的 `contentVersion` 可能各算一套；`dirty` 在 `finishSaved` 被清、在 `onUpdate` 被置真，撤销回基线若只靠定时器，`dirty` 可能短暂为 true 后又被旧回包清。
- `:73` >256 KB 跳过 localStorage，但单文件/无文件夹时 `.sidelight` 不可写；刷新后草稿丢失，计划只说「草稿仍走 .sidelight/宿主」，没写这个降级。

**修**：

- dirty 统一由 `contentVersion !== savedContentVersion` 推导；`finishSaved` 只更新 `savedContentVersion`，不直接 `setDirty(false)`；撤销回基线显式同步。
- >256 KB 且 `.sidelight` 不可写时，显示「大文档草稿只保存在内存，刷新会丢」，或回退 localStorage 分片；`loadIntoEditor` 的写入 try/catch 与 T3 合并。
- memo 的 props 表逐组件列（H5）。

## H5（major）memo 的 props 稳定性

T4 `:74`：

```
StatusBar、FileTree、FileMenu、MarginRail 加 React.memo；props 拆原始值/稳定回调
```

但：

- `FileTree` 的 `expanded`/`scrollTop`/`focusPath`/`visibleRows` 是对象/数组；
- `MarginRail` 的 `annotations`/`coordsAtPos` 每键变化；
- `StatusBar` 的字数/大纲对象可能每次新引用。

只写「拆原始值」不够，验收 `≤2 次` 会失败。**修**：四个组件各列 props 表，`FileTree` 传 `workspaceVersion/activePath/expandedKey`，`MarginRail` 传 `annotationsVersion` + 稳定 `coords`，`StatusBar` 传原始数字；`perf-longdoc` 打印每组件 render 次数，不只看总提交。

## H6（major）B4/B5 的刷新/改名交错没进 T1

findings B4/B5 是两条已复现的竞态：

- **B4**：`refreshTree` 单飞 `if (refreshingRef.current) return null`；`handleRenamedFile` 的 `refreshTree({ mode:'adopt', activePath:newPath })` 拿到 null 仍继续 → `activeFile` 被旧刷新清空 → 保存变另存为。
- **B5**：手动保存撞慢刷新，`performCommit` 把 `refreshingRef` 与 `deletingRef` 同处理，返回 false；`runSave` 直接 return，dirty 不清、无 toast、无草稿。

T1 的 `waitForCommit` 只解决切文档，不解决刷新/改名交错。**修**：

- `refreshTree` 改「排队 + 合并」：`refreshingRef` 时置 `pendingRefreshRef`，结束后用最新 `activePath` 再跑；
- `handleRenamedFile` 的 adopt 不依赖 refresh 返回值，直接改 `activeFile`/`saveTargetRef`；
- `performCommit` 写后分支拆 `deletingRef`/`refreshingRef`：刷新只重绑，不返回 false；
- 补 B4/B5 两条慢刷新用例。

## 逐项核对记录

### T1
- 代际/epoch/docId/path 四条 identity 的方向对；覆盖点只写 `performCommit`/`finishSaved`（H1）。
- `requestLoad`/`discardAndSwitch` 加 `waitForCommit` 方向对；`waitForCommit` 2 s 超时与 6 MB 写盘 1.5 s 的边界要写「超时后由代际丢弃，不死等」。
- 旧回包只清 pending、不改 identity 方向对；`pending`/`savingRef` 释放是 H1。
- B4/B5 未覆盖（H6）。

### T2
- `applyHostSaveSuccess` 比 `sent.text`、保留 dirty/baseline/草稿、补发的方向对；LF 口径/全文比较/循环是 H2。
- `clearHostDraft` 只在 `dirty === false`、`runAutoSave` pending 时重排方向对；重排防抖/上限要写。

### T3
- `MAX_DOC_BYTES` 下沉 `readNode`、`File.size` 字节判断、`localStorage` try/catch 方向对；5.9 MB 验收与 6 MiB 上限矛盾（H3）。
- 2 MB 载入中/可取消、旧文档保持方向对；取消路径不得标脏要写。

### T4
- 单次序列化、统计防抖、>256 KB 草稿降级、memo 方向对；dirty 语义（H4）与 props 稳定性（H5）是主要风险。
- `perf-longdoc` 10 KB/100 KB/1 MB、预热/中位、CI `continue-on-error` 方向对；`measure` 预算 790 B 需每步跑。

### T5
- 0.30.1、CI gate 加 measure、0.30.0 三资产回填、README/CHANGELOG 方向对；`measure` 0.1 s 确定性由脚本 gzip level 9 保证。
- `perf` job 先 `continue-on-error` 方向对；真实宿主 B1/B3 仍 UNVERIFIED。

### 通用
- 文件归属：A T1–T4 串行改 `src/` 与四个脚本；B T5 文档/版本/CI；零重叠成立。
- 构建纪律：A `.tmp/build-a`+measure；B 唯一 build；成立。
- 可独立复现：T1/T2/T3 的假 FS/假宿主可复现；T4 性能数字受机器影响，需记录环境；真实 6 MB 悬崖位置仍 UNVERIFIED。

## 做对的地方（别改过头）

1. T1 把「写盘前校验」扩成「写后 + finishSaved 校验」，并加 `waitForCommit`，是 B1 的正确方向；补全调用点即可。
2. T2 保留 dirty/baseline/草稿并补发一次，是 B3 的正确修法；把 LF 口径换成 `contentVersion` 即可。
3. T3 把 6 MB 上限下沉到 `readNode`、用 `File.size` 在读取前拒绝，是 B2 的正确方向；把 5.9 MB 的算术改对即可。

---

### 附：本次审查证据

- `plan.md:13-16`（T1 代际）、`:33`（T2 比较）、`:51,57`（T3 6 MiB/5.9）、`:71-80`（T4 dirty/草稿/memo）、`:92-101`（T5）。
- `findings-bug.md:40-53`（B1）、`:95-123`（B3）、`:57-80`（B2）、`:131-198`（B4/B5）。
- `App.tsx:2010-2037`（finishSaved）、`:2069-2112`（performCommit）、`:2742-2779`（applyHostSaveSuccess）；`workspace.ts:237-244`。
- 未改产品文件、未 commit；未生成新截图。
