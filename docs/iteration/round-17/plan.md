# 第 17 轮 · 计划

基线 v0.30.0。5 个任务：A 组（builder，前端）T1 B1 → T2 B3 → T3 B2 → T4 性能；B 组（builder2，发布）T5 版本/文档/CI/预算。**构建**：A 只跑 `npx tsc --noEmit`、`npm test`、`npx vite build --outDir .tmp/build-a` + `measure --dir .tmp/build-a`；B 最后跑一次 `npm run build` 与 `measure --max 285000`。
**预算**：首屏 284,210 / 285,000（余 **790 B**）。性能改动（memo/单次序列化）可能增/减字节；每步 measure，超线按 **P5 可维护性提取 → 多余 memo → 死代码** 砍，**不抬 285,000**。
**版本**：0.30.1（纯修复/性能，无用户可见新能力）；若 T4 引入可见行为变化才考虑 0.31.0，由 T5 按 diff 判定。

## T1 P0 保存竞态：旧回包不得改写身份（B1/H1）｜A 组（builder，先做）

- **目标**：保存写盘期间切文档（选「不保存」）后，旧回包到达只清 pending，**绝不**改 `activeFile`/`saveTargetRef`/`docName`/`baselineRef`/`dirty`；之后 `Ctrl+S` 只写新文档，旧文件字节不变。
- **为什么现在**：B1 实测慢写 1500 ms + 切到 `b.md` 选「不保存」→ 2.2 s 后标题变回 `a.md`、`__slState` 变 `a.md`，再保存把 `b.md` 正文写进 `a.md`（`# A/甲AAA` 不可恢复）。根因：`performCommit` 只在写前校验身份（`App.tsx:2081-2088`），`await` 后直接 `finishSaved`（`:2112`），而 `finishSaved`（`:2010-2037`）无条件改写全局身份；`requestLoad` 只等宿主 pending，不等 `performingCommitRef`。
- **文件**：`src/App.tsx`、`scripts/stale-save-acceptance.mjs`（新）
- **步骤**
  1. 保存请求带身份：`performCommit` 起手记 `const epoch = loadEpochRef.current`、`const docId = activeDocIdRef.current`、`const path = fileRef.current?.path`；`writeNode` 成功后**重新校验** `epoch === loadEpochRef.current && docId === activeDocIdRef.current && path === fileRef.current?.path && !deletingRef.current`，不满足则只记日志、返回 `false`，**不调用** `finishSaved`。
  2. `finishSaved(expected)` 增加校验参数：与当前 `fileRef.current`/`saveTargetRef.current` 的 path+handle 不一致就 **return**（不写 `saveTargetRef`/`docName`/`baselineRef`/`setDirty(false)`、不清草稿）。
  3. 身份代际：新建/切文档/重命名/删除/另存为成功都 `loadEpochRef.current += 1`（新增 `activeDocIdRef` 同步 +1）；旧回包仅按 `id` 从 `pendingIds`/`pendingHostSave` 移除。
  4. 等待：`requestLoad` 与 `discardAndSwitch` 除 `waitForHostSave()` 外，`await waitForCommit()`（`App.tsx:563-570`），确保切文档前旧写盘已收尾或已作废。
  5. `scripts/stale-save-acceptance.mjs`：假 FS 支持 `slowWrite[name]=ms`，驱动真实 UI；四条用例（见验收）。
- **验收（脚本全 PASS）**
  1. 打开 `a.md` → 打 `AAA` → 慢写 1500 ms → `Ctrl+S` → 250 ms 后点 `b.md` → 选「不保存」→ 等 2.2 s：标题仍 `b.md`、`__slState.name === 'b.md'`、`activeFile.path` 为 `b.md`。
  2. 接着在 `b.md` 打 `ZZZ` → `Ctrl+S`：写 `b.md`（含 `ZZZ`）、`a.md` 字节 SHA **不变**、picker 未调用。
  3. 迟到的旧 `save-result`：只从 pending 移除，`dirty` 不被清成 false（若期间有新输入），`saveTargetRef` 不变。
  4. 重命名飞行中保存、删除飞行中保存各一条：回包不复活已改名/已删文档的身份。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/stale-save-acceptance.mjs`
- **风险与回退**：代际判断要覆盖四条保存路径与宿主分支；漏一处即复发。回退：`git checkout -- src/App.tsx scripts/stale-save-acceptance.mjs`。
- **难度** M–L ｜ **量级** 120–180 行

## T2 P0 丢字：保存回包前打的新字必须保留（B3）｜A 组（builder，T1 后）

- **目标**：宿主保存回包到达时若正文已变（`currentMarkdown() !== sent.text`），保持 `dirty`、不把 `baselineRef` 设为旧文本、不清草稿，并补发一次保存；最终落盘包含新字。
- **为什么现在**：B3 实测回包后 `dirty=false`、正文含 `BBB` 但补发 `save` 数 0、`draft-save` 0；关窗保护读 `__slState.dirty`（`host/Program.cs:796-806`）会直接关，`BBB` 永久丢失。
- **文件**：`src/App.tsx`、`scripts/host-save-acceptance.mjs`（扩用例，或写入 `stale-save-acceptance`）
- **步骤**
  1. `applyHostSaveSuccess`（`App.tsx:2742-2779`）：`const now = currentMarkdown()`；若 `now !== sent.text` → 只更新 `hostDoc.mtime`，**不**设 `baselineRef = sent.text`、**不** `setDirty(false)`、不清草稿，并把最新正文排进 `pendingHostSave`（复用既有队列，不新开状态）。
  2. `sendHostSave`：收尾时若正文已变，自动排队一次（而非等用户再按保存）；`onUpdate` 在写回在飞时保持 `dirty = true`。
  3. `clearHostDraft` 只在 `dirty === false` 时调用；`runAutoSave` 在 `pendingIdsRef.size > 0` 时改为「重排一次」而不是直接 return。
  4. 扩展验收：假宿主手动回包，回包前后各打一次字。
- **验收**
  1. 打 `AAA` → `Ctrl+S`（不回包）→ 打 `BBB` → 回 `ok`：`dirty === true`、`__slState.dirty === 'true'`、`baselineRef` 仍是旧文本、草稿未被清。
  2. 回包后自动补发一条 `save`，`text` 含 `BBB`；模拟宿主回 `ok` 后 `dirty === false` 且写入内容含 `BBB`。
  3. 关窗保护：`dirty === true` 时 `close-request` 流程仍会询问（读 `__slState.dirty` 不返回 `'0'`）。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/host-save-acceptance.mjs`
- **风险与回退**：补发时机若与 `pendingIds` 超时冲突会重发两次，用同一 `id` 队列串行；不新增状态机。回退：`git checkout -- src/App.tsx`。
- **难度** S–M ｜ **量级** 60–110 行

## T3 P0 大文件悬崖：读前统一 6 MB 上限（B2）｜A 组（builder，T2 后）

- **目标**：从文件树打开 >6 MB 文件在**读取前**就拒绝并给可见错误「文件太大，暂不支持（上限 6 MB）」；2 MB 以上显示载入中/可取消；6 MB 上限统一到读取入口，不再只挡宿主。
- **为什么现在**：B2 实测 5.9 MiB（2,065,331 字符）从文件树打开 **>120 s 未载入**、标题仍 `small.md`、无错误/无进度；`MAX_HOST_DOC_LENGTH`（`App.tsx:226`）只在 `/__doc` 分支用；`readNode`（`workspace.ts:237-244`）无尺寸检查；`loadIntoEditor` 的 `localStorage.setItem`（`:1632`）无 try/catch，配额抛错会让其后的 `syncDocInfo` 不执行。
- **文件**：`src/App.tsx`、`src/lib/workspace.ts`、`scripts/bigfile-acceptance.mjs`（新）
- **步骤**
  1. `workspace.ts` 导出 `MAX_DOC_BYTES = 6 * 1024 * 1024`；`readNode` 先 `file.size` 判断，超限抛带码错误（`TOO_LARGE`），不读内容。
  2. `openWorkspaceFile` 捕获该错误 → `setNotice({kind:'error', text:'文件太大，暂不支持（上限 6 MB）。'})`，树行加 `title`/标记，旧文档保持不变；宿主路径复用同一常量与同一文案（去掉两套文案）。
  3. 2 MB 以上：打开期间状态栏/骨架显示「正在载入…」，`AbortController`/`loadEpoch` 允许用户点别的文件取消（取消后旧文档不变）。
  4. `loadIntoEditor` 的 `localStorage.setItem` 包 try/catch（`QuotaExceededError` 只记日志，继续 `syncDocInfo`/`restoreAnnotationsFor`）。
  5. `scripts/bigfile-acceptance.mjs`：假工作区放 10 KB / 2 MB / 6 MB / 5.9 MB 文件；断言超限 2 s 内出现错误、无长任务阻塞、旧文档仍在。
- **验收**
  1. 点 5.9 MB：≤2 s 出现可见错误（toast 或横幅，含「6 MB」），标题/正文仍是旧文档，无 `longtask > 1 s`。
  2. 恰好 6 MB：允许打开或明确拒绝（同一常量判定，测试固定边界行为）。
  3. 2 MB：出现「正在载入…」，载入完成后可编辑；点另一个文件可取消且旧文档不变。
  4. 配额模拟（localStorage 抛 `QuotaExceededError`）：载入继续、`syncDocInfo` 执行、有非阻塞提示。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/bigfile-acceptance.mjs`
- **风险与回退**：文件大小用 `File.size`（字节）而非字符数，与宿主 6 MB 口径需一致（在 `impl-a.md` 记换算）；取消路径不得把旧文档标脏。回退：`git checkout -- src/ scripts/bigfile-acceptance.mjs`。
- **难度** M ｜ **量级** 100–160 行

## T4 性能：单次序列化、防抖统计、大文档草稿降级、memo（P2/P4/优化 1）｜A 组（builder，T3 后）

- **目标**：每键不再做两遍全文序列化；统计/大纲 150–250 ms 防抖；>256 KB 文档不写整篇 localStorage（草稿仍走 `.sidelight`/宿主）；四个常驻组件 `React.memo`；给出 10 KB/100 KB/1 MB 输入 p95 前后数字。
- **为什么现在**：P2 实测 1 MB 文档 77 ms/键（30 字 2.3 s），根因是 `onUpdate` 里两次 `serializeDocument`（`App.tsx:725`、`:732`）+ 每键整篇 `localStorage.setItem`（`:743`）+ `countText` 逐字符（`:730`）；P4 实测每键 2.5 次提交、7 个常驻组件各 50 次/20 键、无 `memo`。
- **文件**：`src/App.tsx`、`src/lib/wordcount.ts`（如需）、`src/components/StatusBar.tsx`、`src/components/FileTree.tsx`、`src/components/MarginRail.tsx`、`src/components/FileMenu.tsx`、`scripts/perf-longdoc.mjs`（新）
- **步骤**
  1. `onUpdate`：删掉第二次 `getMarkdown()`+repair 链；只保留一次序列化结果复用给 dirty 判定与草稿；`transaction.docChanged` 直接置脏，撤销回基线改在保存/草稿定时器里比对。
  2. `countText`/`extractOutline` 改 150–250 ms 防抖（沿用现有定时器模式）；`onSelectionUpdate` 的 `buildContext` 只在选区实际移动时算。
  3. 草稿写入：>256 KB 文档跳过整篇 `localStorage`（保留 `.sidelight` 草稿与宿主 `draft-save`）；`loadIntoEditor` 的写入加 try/catch（与 T3 合并）。
  4. `memo`：`StatusBar`、`FileTree`、`FileMenu`、`MarginRail` 加 `React.memo`；props 拆成原始值/稳定回调（`useCallback` 或 ref 转发），对象 props 用 `useMemo`；`coordsAtPos` 只在 `annotations` 或内容版本变化时算。
  5. `scripts/perf-longdoc.mjs`：10 KB/100 KB/1 MB；测载入到可输入、20 次插入的 p95、滚动 p95、GC 后堆、切换 3 篇耗时；预热 1 次、正式 3 次取中位；写 `perf-baseline.json`；CI 新 job `perf` 先 `continue-on-error: true`。
  6. **P5 可选（预算内）**：仅当 measure ≤284,400 时，把「自动保存判定」纯函数抽到 `src/lib/autosave.ts` + 测试；否则记录延后（提取会把首屏字节波动 ±280–1400 B，790 B 余量不够）。
- **验收**
  1. `perf-longdoc` 输出：1 MB 每键 p95 ≤20 ms（基线 77）、100 KB ≤10 ms（7.5）、10 KB ≤5 ms（3.6）；1 MB 载入到可输入 ≤3 s（基线 5.8–9.3 s）；数字写 `impl-a.md`。
  2. `StatusBar`/`FileTree`/`FileMenu`/`MarginRail` 在输入 20 字时重渲染次数 ≤2（基线 50）；提交数 ≤1.2 次/键（基线 2.5）。
  3. >256 KB 文档输入时无 `localStorage.setItem` 全文写入（脚本断言）；草稿仍落 `.sidelight`。
  4. `measure --dir .tmp/build-a` ≤285,000；若超线，先砍 P5、再砍多余 memo。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/perf-longdoc.mjs; node scripts/measure-first-screen.mjs --dir .tmp/build-a --max 285000`
- **风险与回退**：删第二次序列化会改变 dirty 语义（撤销回基线），需用现有 `data-safety`/`newfile` 验收兜；memo 的 props 不稳会「memo 了但仍重渲染」，用渲染计数验证。回退：`git checkout -- src/ scripts/perf-longdoc.mjs`。
- **难度** L ｜ **量级** 200–300 行

## T5 0.30.1 版本、文档、CI 体积门与预算（S1–S5）｜B 组（builder2，A 完成后）

- **目标**：`package.json`/`package-lock` 升 0.30.1；CHANGELOG/README/AGENTS 写实际结果；CI `gate` 加 `measure --max 285000`；`npm run build` + measure 过线并回填字节。
- **为什么现在**：S3 实测 CI 零性能断言，`measure-first-screen.mjs` 已可确定性进 `gate`（0.1 s、不 flaky）；S4 版本判据为纯修复 → 0.30.1；S5 指出 0.30.0 的 CHANGELOG 欠账（setup 817,983 / portable 902,274 / macOS 890,004）需回填。
- **文件**：`package.json`、`package-lock.json`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`.github/workflows/ci.yml`
- **步骤**
  1. `.github/workflows/ci.yml`：`gate` job 在 `npm run build` 后加 `node scripts/measure-first-screen.mjs --max 285000`（必过）；`perf` 新 job 可选（`continue-on-error: true`，跑 `perf-longdoc`）。
  2. `package.json` = `0.30.1`；`package-lock.json` 两处；根代理 `npm install --package-lock-only` 复核。
  3. CHANGELOG `## 0.30.1 — 2026-11-16`：B1/B3 竞态与丢字修复、B2 6 MB 上限统一、性能数字（1 MB p95 前后、载入耗时）、新增脚本、测试数、首屏新旧字节、体积 `[TBD]`；顺手回填 0.30.0 三资产字节与 SHA（GitHub API 实测值）。
  4. README：安装包名换 `0.30.1`（或 `<版本>` 占位）、首屏数字、`SHA256SUMS-0.30.1.txt`、测试数、macOS 资产名 `-macos-universal.zip`、FCP 写实测区间；AGENTS §6 状态与未验（真实宿主 B1/B3、5.9 MB 悬崖位置、CI 性能波动）。
  5. 根代理 build 后跑 measure；出包后回填安装包/zip 字节与 SHA（预算 820,000 / 硬线 850,000 不动）。
- **验收**
  1. `measure --max 285000` exit 0，合计 ≤285,000（记录新旧差：284,210 → 新值）。
  2. `node -e "console.log(require('./package.json').version)"` = `0.30.1`；lock 两处一致；CHANGELOG 含 `— 2026-11-16`。
  3. `Select-String .github/workflows/ci.yml -SimpleMatch 'measure-first-screen'` ≥1（在 `gate` 内）；README 无 `284,210`、`SHA256SUMS-0.30.0`、`Sidelight-0.30.0-win`。
  4. `npm test` 16 文件全绿；tree 49/49、theme 26/26、keyboard 35/35 记录在 `impl.md`。
- **门禁**：`npm run build; node scripts/measure-first-screen.mjs --max 285000; npm test`
- **风险与回退**：CI 体积门若误报会阻塞合并，脚本口径已固定（gzip level 9、首屏集合）；版本与 CHANGELOG 破折号不一致会被 `release.yml` preflight 拦。回退：`git checkout -- package.json package-lock.json README.md AGENTS.md docs/CHANGELOG.md .github/workflows/ci.yml`。
- **难度** M ｜ **量级** 110–170 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与执行点 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`scripts/stale-save-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`scripts/host-save-acceptance.mjs` |
| T3 | A（builder，T2 后） | `src/App.tsx`、`src/lib/workspace.ts`、`scripts/bigfile-acceptance.mjs` |
| T4 | A（builder，T3 后） | `src/App.tsx`、`src/lib/wordcount.ts`、`StatusBar.tsx`、`FileTree.tsx`、`MarginRail.tsx`、`FileMenu.tsx`、`scripts/perf-longdoc.mjs`、`src/lib/autosave.ts`（可选） |
| T5 | B（builder2，A 完成后） | `package.json`、`package-lock.json`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`.github/workflows/ci.yml` |

- 零重叠：A 只碰 `src/` 与四个脚本；B 只碰文档、`package.json`、CI。`package.json`/`package-lock` 只归 T5；`npm test` 文件数不变（新验收是脚本，不进 `npm test`）。
- 顺序：T1→T2→T3→T4（A 串行，每步 `.tmp/build-a` + measure）→ T5（唯一 `npm run build` + measure + 文档）→ 根代理出包回填。
- 报告：A 组 `docs/iteration/round-17/impl-a.md`，B 组 `impl-b.md`；截图 `shots/round-17/t1-*.png`、`t2-*.png`、`t3-*.png`。

## 本轮不做（写进下轮建议）

**P5 可维护性提取（最近协议/自动保存判定）**：首屏仅余 790 B，提取会带来 ±280–1400 B 波动，且无 jsdom 无法测 hook；仅当 T4 measure ≤284,400 才做纯函数提取，否则记录延后。**App.tsx 组件拆分、Worker 解析、3/4/5 MB 悬崖定位、自动保存 `/__doc/meta` 端点**不做；真实宿主 B1/B3、真实 IME、macOS 真机仍 UNVERIFIED。

## 本轮 Demo（≤3 条用户可见变化）

1. 保存写盘时切文档不会再让旧回包改回标题/保存目标，也不会把新文档写进旧文件。
2. 保存回包前继续打的字不会丢：关窗仍会提醒，最终落盘包含这些字。
3. 点开 5.9 MB 文件 2 秒内看到「文件太大，暂不支持」而不是卡死两分钟；1 MB 文档输入明显变快（p95 77 ms → ≤20 ms）。

## 风险最高的任务

**T1**。它把「保存收尾」改成带代际身份校验，牵动四条保存路径与切文档等待：校验漏一处，旧回包就会再次改写 `activeFile`/`saveTargetRef`，把新正文写进旧文件（数据覆盖，不可恢复）。缓解是 `stale-save-acceptance` 的四条慢写用例（切文档/重命名/删除/迟到回包）与「a.md SHA 不变」硬断言。次高是 T4：删掉第二次序列化会改 dirty 语义，撤销回基线与自动保存判定容易回归。

## 下一轮建议主题

**大文件与可维护性收尾**：定位 3/4/5 MB 载入悬崖并做分片/Worker 解析；给宿主加 `/__doc/meta` 省掉每 2 秒整篇传输；在预算腾出后提取「最近协议/自动保存判定」纯函数并带测试；把 `perf-longdoc` 从 `continue-on-error` 转必过。
