# 第 17 轮 · 计划（rev2）

基线 v0.30.0。5 个任务：A 组（builder，前端）T1 保存竞态（B1/B4/B5）→ T2 丢字（B3）→ T3 大文件（B2）→ T4 性能；B 组（builder2，发布）T5 版本/文档/CI/预算。**构建**：A 只跑 `npx tsc --noEmit`、`npm test`、`npx vite build --outDir .tmp/build-a` + `measure --dir .tmp/build-a`；B 最后跑一次 `npm run build` 与 `measure --max 285000`。
**预算**：首屏 284,210 / 285,000（余 **790 B**）。超线按 **多余 memo → 死代码** 砍，**不抬 285,000**。**P5（App.tsx 纯函数提取）本轮整条记录延后**（提取字节波动 ±280–1400 B，790 B 余量不够），不占任务。
**版本**：0.30.1（纯修复/性能，无用户可见新能力）。

## T1 保存竞态：旧回包不得改写身份；刷新与保存互不踩（B1/B4/B5/H1）｜A 组（builder，先做）

- **目标**：保存写盘期间切文档/另存为/重命名/删除/刷新，旧回包只清 pending、**不改** `activeFile`/`saveTargetRef`/`docName`/`baselineRef`/`dirty`；慢刷新期间改名不被判「已不在磁盘上」；保存撞刷新不被静默丢弃。
- **为什么现在**：B1 实测慢写 1500 ms + 切 `b.md` 选「不保存」→ 2.2 s 后标题变回 `a.md`，再保存把 `b.md` 正文写进 `a.md`（不可恢复）；B4 实测慢刷新中改名 → adopt 被单飞锁丢弃、`saveTargetRef` 清空、下次保存弹另存为、`AFTER` 丢失；B5 实测保存撞刷新 → 文件写盘成功但 `dirty` 不清、无提示、无草稿。
- **文件**：`src/App.tsx`、`scripts/stale-save-acceptance.mjs`（新）、`scripts/refresh-race-acceptance.mjs`（新）
- **步骤**
  1. **保存请求带身份**：`performCommit` 起手记 `epoch = loadEpochRef.current`、`docId = activeDocIdRef.current`、`path = fileRef.current?.path`、`target = saveTargetRef.current`；`writeNode` 成功后**重新校验** `epoch/docId/path/handle` 全部匹配且 `!deletingRef.current`，不匹配只记日志并走「收尾清理」；切文档/新建/重命名/删除/另存为成功都 `loadEpochRef++`、`activeDocIdRef++`。
  2. **`finishSaved(expected)` 全部调用点表**（每处必须：传 expected、减 pending、释放 saving、必要时递增 epoch）：
     | 调用点 | expected | pending 清理 | saving 释放 | epoch |
     | :--- | :--- | :--- | :--- | :--- |
     | 文件保存 `runSave`→`commitSave` | path+handle+epoch+docId | `pendingSaveId` 移除 | `savingRef=false` | 不增 |
     | 另存为 `performSaveAs` | 新 path+新 handle+epoch | 清 `saveAsPending` | 释放 | 成功 +1（新文档身份） |
     | 宿主回包 `applyHostSaveSuccess` | `sent.id` + `sent.version` | `pendingIds.delete(id)` | 释放 | 不增 |
     | 自动保存兜底 `writeDraftFallback` | 无（只写草稿） | — | — | 不增 |
     **不匹配分支也必须** `pendingIds.delete(id)`/`savingRef=false`/清定时器，否则队列永久卡住。
  3. **切文档等待**：`requestLoad`、`discardAndSwitch` 除 `waitForHostSave()` 外 `await waitForCommit()`（`App.tsx:563-570`）；另存为在飞时切文档同样等待或作废。
  4. **B4 刷新竞态**：`refreshTree` 改「排队 + 合并」——`refreshingRef` 时置 `pendingRefreshRef`，当前刷新结束用最新 `activePath` 再跑一次；`handleRenamedFile` 的 adopt 不依赖 refresh 返回值（`null` 时直接改 `activeFile`/`saveTargetRef`），并在 adopt 时递增 epoch。
  5. **B5 写后分支拆开**：`performCommit` 写后只有 `deletingRef` 才做「删了再删一次」；`refreshingRef` 只重新取一次绑定或什么都不做，**照常 `finishSaved`**；`performCommit === false` 时 `runSave` 至少 `fail(...)` 或 `writeDraftFallback(...)`。
  6. 脚本：`stale-save-acceptance.mjs`（假 FS `slowWrite`）覆盖切文档/另存为/重命名/删除四条；`refresh-race-acceptance.mjs`（慢列目录）覆盖 B4/B5。
- **验收（脚本全 PASS）**
  1. 慢写 + 切 `b.md` 选不保存 → 等 2.2 s 标题仍 `b.md`、`__slState.name==='b.md'`；再 `Ctrl+S` 写 `b.md`、`a.md` SHA 不变、picker 0 次。
  2. **另存为飞行中切文档**：另存为慢写 → 切 `b.md` 选不保存 → 旧回包到达后 `activeFile` 仍是 `b.md`、另存为目标被清、`saving` 已释放（可再次保存）。
  3. **宿主回包迟到**：宿主 `save` 慢回包 + 切文档 → 回包只清 pending，`dirty`/身份不变；再保存写新文档。
  4. **重命名/删除飞行中**：回包不复活旧身份；`finishSaved` 不匹配分支后 `pendingIds.size === 0`、`saving === false`（不卡队列）。
  5. **B4**：慢刷新（2500 ms）中改名 → 改名后 `aria-selected` 指向 `b.md`、`saveTargetRef` 不清空；刷新结束树含 `b.md`；`Ctrl+S` 写 `b.md`。
  6. **B5**：慢写 + 慢刷新同时 → 写盘成功后 `dirty === false`、toast「已保存 a.md」、`removeEntry` 调用 0 次。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/stale-save-acceptance.mjs; node scripts/refresh-race-acceptance.mjs`
- **风险与回退**：表里四行漏一处就卡队列或改写身份；刷新排队要防止「刷新触发刷新」死循环（合并为一次）。回退：`git checkout -- src/App.tsx scripts/*`。
- **难度** L ｜ **量级** 180–260 行

## T2 丢字：保存回包前打的新字必须保留（B3/H2）｜A 组（builder，T1 后）

- **目标**：宿主回包到达时若正文版本已变，保持 `dirty`、不把基线设为旧文本、不清草稿，自动补发一次；补发不循环、不重复。
- **为什么现在**：B3 实测回包后 `dirty=false`、正文含 `BBB` 但补发 `save` 0 条、`draft-save` 0；关窗保护读 `__slState.dirty` 会直接关。
- **文件**：`src/App.tsx`、`scripts/host-save-acceptance.mjs`（扩）
- **步骤**
  1. **用版本号比较，不比较文本**：维护 `contentVersionRef`（每次 `onUpdate` 且 `docChanged` 时 +1）与 `sentVersionRef`（发送时记）。回包时 `contentVersionRef.current !== sent.version` 即视为「有新字」；**不**用 `currentMarkdown() !== sent.text`（CRLF/LF 口径不同会无限补发）。`prepareSave().normalized` 只用于实际发送。
  2. 有差异：只更新 `hostDoc.mtime`，`baselineRef` 保持旧基线、`dirty` 保持 true、**不清草稿**；把最新正文按 `sentVersionRef` 排入 `pendingHostSave`，并记 `lastResentVersionRef`——**同一版本只补发一次**（`if (version === lastResentVersionRef.current) return`）。
  3. `clearHostDraft` 只在 `dirty === false` 时调用；`runAutoSave` 在 `pendingIdsRef.size > 0` 时改为「置一次重排标记」，不直接 return 丢弃。
  4. 扩 `host-save-acceptance`：回包前后各打字；源码模式（CRLF 原文件）下打字 + 回包，断言不回环、补发 ≤1 次。
- **验收**
  1. 打 `AAA` → `Ctrl+S`（不回包）→ 打 `BBB` → 回 `ok`：`dirty === true`、`__slState.dirty === 'true'`、`baselineRef` 仍是旧文本、草稿未被清。
  2. 自动补发 1 条 `save`，其 `version` 为最新；再回 `ok` 后 `dirty === false`、落盘含 `BBB`；补发条数 ≤1（同版本不重复）。
  3. **源码模式 CRLF**：`.source-editor` 里打字 → 回包 → 不触发无限补发（`save` 消息数 ≤2），`dirty` 最终 false 且内容含新字。
  4. 关窗保护：`dirty === true` 时读 `__slState.dirty` 不返回 `'0'`。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/host-save-acceptance.mjs`
- **风险与回退**：版本号必须只在 `docChanged` 时递增（选区移动不算）；补发用同一 `pendingIds` 队列串行。回退：`git checkout -- src/App.tsx`。
- **难度** S–M ｜ **量级** 70–120 行

## T3 大文件：读前统一上限 5.5 MiB（B2/H3）｜A 组（builder，T2 后）

- **目标**：从文件树打开超限文件在**读取前**拒绝并给可见错误；2 MB 以上显示载入中/可取消；宿主与文件夹共用同一上限与文案。
- **为什么现在**：B2 实测 5.9 MiB（2,065,331 字符）从文件树打开 >120 s 未载入、无错误/进度；`MAX_HOST_DOC_LENGTH` 只在 `/__doc` 分支；`readNode` 无尺寸检查；`loadIntoEditor` 的 localStorage 写入无 try/catch。
- **口径（写死，消除 6 MiB vs 5.9 MB 矛盾）**：上限 **5.5 MiB = 5,767,168 B**（`MAX_DOC_BYTES`）；验收样本用 **6.1 MiB**（6,396,313 B）超限、**5.2 MiB** 允许。字节/字符换算：中文 UTF-8 约 3 B/字，6.1 MiB 约 2.1 M 字符；上限以**字节**为准（`File.size`），不按字符数。
- **文件**：`src/App.tsx`、`src/lib/workspace.ts`、`scripts/bigfile-acceptance.mjs`（新）
- **步骤**
  1. `workspace.ts` 导出 `MAX_DOC_BYTES = 5 * 1024 * 1024 + 512 * 1024`（5.5 MiB）；`readNode` 先 `const file = await handle.getFile()`，**立即** `if (file.size > MAX_DOC_BYTES) throw TOO_LARGE`，**不调用 `text()`**。
  2. `openWorkspaceFile` 捕获 → `setNotice({kind:'error', text:'文件太大，暂不支持（上限 5.5 MiB）。'})`，旧文档保持不变，树行加标记；宿主 `/__doc` 用同一常量与文案。
  3. 2 MiB 以上：打开期间状态栏显示「正在载入…」，`loadEpoch` 允许点别的文件取消；取消后旧文档不变。
  4. `loadIntoEditor` 的 `localStorage.setItem` 包 try/catch（`QuotaExceededError` 只记日志，继续 `syncDocInfo`）。
  5. `bigfile-acceptance.mjs`：样本 10 KB / 2 MiB / 5.2 MiB / 6.1 MiB。
- **验收**
  1. 点 6.1 MiB：≤2 s 出现含「5.5 MiB」的错误；标题/正文仍是旧文档；无 `longtask > 1 s`。
  2. 5.2 MiB：可打开（或按同一常量明确边界行为），载入中可见。
  3. 2 MiB：显示「正在载入…」，完成后可编辑；取消路径旧文档不变。
  4. 配额模拟：载入继续、`syncDocInfo` 执行、非阻塞提示。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/bigfile-acceptance.mjs`
- **风险与回退**：字节上限与宿主原有 6 MB 口径变化要在 `impl-a.md` 与 CHANGELOG 写明；`getFile()` 后才 `size`，不读正文。回退：`git checkout -- src/ scripts/bigfile-acceptance.mjs`。
- **难度** M ｜ **量级** 90–140 行

## T4 性能：单次序列化、防抖统计、版本化 dirty、memo（P2/P4/H4/H5）｜A 组（builder，T3 后）

- **目标**：每键不再两遍全文序列化；统计/大纲防抖；`dirty` 由 `contentVersion !== savedContentVersion` 推导；四个常驻组件按 props 表 `memo`；给出输入 p95 与每组件重渲染次数。
- **为什么现在**：P2 实测 1 MB 77 ms/键（30 字 2.3 s），根因两次 `serializeDocument` + 每键整篇 `localStorage` + `countText` 逐字符；P4 实测每键 2.5 次提交、7 个常驻组件各 50 次/20 键、无 `memo`。
- **文件**：`src/App.tsx`、`src/lib/wordcount.ts`、`src/components/StatusBar.tsx`、`FileTree.tsx`、`MarginRail.tsx`、`FileMenu.tsx`、`scripts/perf-longdoc.mjs`（新）
- **步骤**
  1. `onUpdate`：删第二次 `getMarkdown()`+repair 链，只保留一次结果复用；`contentVersionRef += 1`（仅 `docChanged`），`dirty = contentVersion !== savedContentVersionRef`（统一 T1 的代际/版本口径，保存成功时 `savedContentVersion = sentVersion`）。
  2. `countText`/`extractOutline` 改 150–250 ms 防抖；`onSelectionUpdate` 的 `buildContext` 只在选区实际移动时算。
  3. 草稿：>256 KB 跳过整篇 `localStorage`；若 `.sidelight` 同时不可写，给可见提示「刷新后会丢失，请先保存」，**不静默**；写入 try/catch。
  4. **memo props 表**（每行加 `React.memo`，props 必须原始值/稳定引用）：
     | 组件 | 现状 props | 改成 |
     | :--- | :--- | :--- |
     | `StatusBar` | stats/模式/焦点等对象 | 拆原始值 + `useMemo` 的组合对象 |
     | `FileTree` | `workspace`、回调 | `workspaceVersion`、`activePath`、`expandedKey`、稳定回调 |
     | `MarginRail` | `annotations`、`editor`、`tick` | `annotationsVersion`、稳定 `coords`（按版本重算）、稳定回调 |
     | `FileMenu` | `recent`、回调 | `recentVersion` + 稳定回调 |
     `coordsAtPos` 只在 `annotationsVersion` 或内容版本变化时算。
  5. `perf-longdoc.mjs`：10 KB/100 KB/1 MB；测载入到可输入、20 次插入 p95、滚动 p95、GC 后堆、切换 3 篇耗时；**打印每组件 render 次数**；预热 1 次、正式 3 次取中位；写 `perf-baseline.json`；CI `perf` job 先 `continue-on-error`。
- **验收**
  1. 1 MB 每键 p95 ≤20 ms（基线 77）、100 KB ≤10（7.5）、10 KB ≤5（3.6）；1 MB 载入 ≤3 s（基线 5.8–9.3）；数字写 `impl-a.md`。
  2. **每组件 render 次数 ≤2 次/键**（`StatusBar`/`FileTree`/`MarginRail`/`FileMenu`，基线 50/20 键）；提交 ≤1.2 次/键（基线 2.5）。
  3. >256 KB 无整篇 `localStorage` 写入；`.sidelight` 不可写时出现可见提示。
  4. `measure --dir .tmp/build-a` ≤285,000；超线先砍多余 memo。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/perf-longdoc.mjs; node scripts/measure-first-screen.mjs --dir .tmp/build-a --max 285000`
- **风险与回退**：删第二次序列化改 dirty 语义，用 `data-safety`/`newfile` 验收兜；memo props 不稳会「memo 了仍重渲染」，靠渲染计数验证。回退：`git checkout -- src/ scripts/perf-longdoc.mjs`。
- **难度** L ｜ **量级** 200–300 行

## T5 0.30.1 版本、文档、CI 体积门与预算（S1–S5）｜B 组（builder2，A 完成后）

- **目标**：`package.json`/`package-lock` 升 0.30.1；CHANGELOG/README/AGENTS 写实际结果；CI `gate` 加 `measure --max 285000`；build + measure 过线并回填。
- **为什么现在**：S3 实测 CI 零性能断言（`measure-first-screen.mjs` 确定性、0.1 s）；S4 判据为纯修复 → 0.30.1；S5 指出 0.30.0 三资产欠账（817,983 / 902,274 / 890,004）需回填。
- **文件**：`package.json`、`package-lock.json`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`.github/workflows/ci.yml`
- **步骤**
  1. `ci.yml`：`gate` 在 `npm run build` 后加 `node scripts/measure-first-screen.mjs --max 285000`（必过）；可选 `perf` job（`continue-on-error: true` 跑 `perf-longdoc`）。
  2. `package.json` = `0.30.1`；`package-lock` 两处；根代理 `npm install --package-lock-only`。
  3. CHANGELOG `## 0.30.1 — 2026-11-16`：B1/B4/B5 竞态、B3 丢字、B2 上限 5.5 MiB、性能数字（p95、载入、每组件 render）、新增脚本、测试数、首屏新旧、体积 `[TBD]`；回填 0.30.0 三资产字节与 SHA。
  4. README：包名 0.30.1、首屏数字、`SHA256SUMS-0.30.1.txt`、测试数、macOS 资产名 `-macos-universal.zip`、FCP 实测区间；AGENTS §6 状态与未验（真实宿主 B1/B3、悬崖位置、CI 性能波动）。
  5. 根代理 build + measure；出包后回填字节与 SHA（预算 820,000 / 硬线 850,000 不动）。
- **验收**
  1. `measure --max 285000` exit 0，合计 ≤285,000（记录 284,210 → 新值）；`package.json`、CHANGELOG 标题、lock 两处版本一致。
  2. `Select-String .github/workflows/ci.yml -SimpleMatch 'measure-first-screen'` ≥1（在 `gate` 内）；README 无 `284,210`、`SHA256SUMS-0.30.0`、`Sidelight-0.30.0-win`。
  3. `npm test` 16 文件全绿；tree 49/49、theme 26/26、keyboard 35/35 记录在 `impl.md`。
- **门禁**：`npm run build; node scripts/measure-first-screen.mjs --max 285000; npm test`
- **风险与回退**：CI 体积门误报会阻塞合并（口径固定 gzip level 9 + 首屏集合）；破折号不一致被 preflight 拦。回退：`git checkout -- package.json package-lock.json README.md AGENTS.md docs/CHANGELOG.md .github/workflows/ci.yml`。
- **难度** M ｜ **量级** 110–170 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`scripts/stale-save-acceptance.mjs`、`scripts/refresh-race-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`scripts/host-save-acceptance.mjs` |
| T3 | A（builder，T2 后） | `src/App.tsx`、`src/lib/workspace.ts`、`scripts/bigfile-acceptance.mjs` |
| T4 | A（builder，T3 后） | `src/App.tsx`、`src/lib/wordcount.ts`、`StatusBar.tsx`、`FileTree.tsx`、`MarginRail.tsx`、`FileMenu.tsx`、`scripts/perf-longdoc.mjs` |
| T5 | B（builder2，A 完成后） | `package.json`、`package-lock.json`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`.github/workflows/ci.yml` |

- 零重叠：A 只碰 `src/` 与四个脚本；B 只碰文档、`package.json`、CI。`npm test` 文件数不变（新验收是脚本）。
- 顺序：T1→T2→T3→T4（A 串行，每步 `.tmp/build-a` + measure）→ T5（唯一 `npm run build` + measure + 文档）→ 根代理出包回填。
- 报告：A 组 `docs/iteration/round-17/impl-a.md`，B 组 `impl-b.md`；截图 `shots/round-17/t1-*.png`、`t2-*.png`、`t3-*.png`。

## 本轮不做（写进下轮建议）

**P5 App.tsx 纯函数提取**（最近协议/自动保存判定）：首屏余 790 B，提取字节波动 ±280–1400 B 会破线，且无 jsdom 不能测 hook——整条记录延后，预算腾出后单独做。**组件拆分、Worker 解析、3/4/5 MB 悬崖二分、自动保存 `/__doc/meta` 端点、真实宿主 B1/B3、真实 IME、macOS 真机**同样不做/仍 UNVERIFIED。

## 本轮 Demo（≤3 条用户可见变化）

1. 保存写盘时切文档/另存为/重命名/删除，不会再让旧回包改回标题或把新正文写进旧文件；慢刷新中改名也不会「保存变另存为」。
2. 保存回包前继续打的字不丢：关窗仍提醒，最终落盘包含这些字，且不会因 CRLF 口径无限补发。
3. 打开 6.1 MiB 文件 2 秒内看到「文件太大，暂不支持（上限 5.5 MiB）」；1 MB 文档输入从 77 ms/键降到 ≤20 ms，常驻组件每键最多重渲染 2 次。

## 风险最高的任务

**T1**。它同时修保存收尾、刷新单飞与写后分支三处竞态：`finishSaved` 四个调用点漏传 expected 或漏清 pending，就会「队列卡死」或「旧回包改写身份 → 新正文写进旧文件」；刷新改为排队合并若处理不当会自我触发死循环。缓解是 `finishSaved` 调用点表逐行验收、`stale-save-acceptance` 的六条慢写用例与 `refresh-race-acceptance` 的慢刷新用例。次高是 T4：`dirty` 改版本推导会牵动撤销回基线与自动保存，容易回归。

## 下一轮建议主题

**大文件与可维护性收尾**：二分 3/4/5 MB 载入悬崖并做分片/Worker；宿主加 `/__doc/meta` 省掉每 2 秒整篇传输；预算腾出后提取「最近协议/自动保存判定」纯函数并带测试；把 `perf-longdoc` 从 `continue-on-error` 转必过。
