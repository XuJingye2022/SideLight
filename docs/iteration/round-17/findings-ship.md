# 第 17 轮 · 工程与发布 发现（finder: r17-ship）

只读侦察。未改 `src/`，未跑 `npm run build`。测量数据见 `.tmp/r17-ship/`，引用行号以 read/node 计数为准（PowerShell 读同一文件会少 106 行，见文末「测量口径」）。

## 0. 结论

1. `src/App.tsx` 4,348 行 / 166,898 B。**79% 是逻辑（3,196 行），不是 JSX（850 行，21%）**。所以「拆组件」几乎不减重，能减重的是把 hook/协议逻辑搬到 `src/lib/`。
2. 组件里有 276 次 hook 调用：`useState` 67、`useEffect` 45、`useRef` 71、`useCallback` 91、`useMemo` 1、`useLayoutEffect` 1。45 个 effect **全部有依赖**，单依赖 28、多依赖 17、空依赖 0。
3. 最适合先提取的三个单元：**最近打开协议**（约 200 行，风险最低）、**自动保存判定**（约 156 行，纯判定最多）、**宿主写回状态机**（约 285 行，收益最大、风险最高）。
4. 仓库没有 DOM 测试设施（无 jsdom / vitest / testing-library；测试是 `node --experimental-strip-types` 跑 `src/lib/*.test.ts`）。**所以「带测试」只能靠提取纯函数，不能靠提取 hook。** 这决定提取形态。
5. 性能门现状：CI 只跑 `build` + `test`，零性能断言。`scripts/measure-first-screen.mjs` 已可直接进门（确定性、约 0.1 s）；`host/fcp-probe.mjs` 可复用但要放在 Windows job 且要防抖；长文输入延迟没有现成脚本。
6. 版本：本轮「行为不变」→ **0.30.1**。只有出现用户可见新增才升 0.31.0。
7. 发布：v0.30.0 已在 GitHub 发布（3 资产 + SHA256SUMS，macOS Universal，ad-hoc 未签名未公证）。本机 `release/` 是旧残留，不能当发布状态。

---

## S1. App.tsx 结构

### S1.1 体量

| 区间 | 行号 | 行数 | 占比 |
| :--- | :--- | ---: | ---: |
| 文件顶部（类型、工具函数、SAMPLE） | 1–302 | 302 | 6.9% |
| `App()` 组件 | 303–4348 | 4,046 | 93.1% |
| ├ 逻辑（state / ref / callback / effect / 事件） | 303–3498 | 3,196 | 73.5%（组件内 79.0%） |
| └ JSX | 3499–4348 | 850 | 19.5%（组件内 21.0%） |

组件内注释 217 行、空行 259 行。

### S1.2 hook 计数（组件内）

| hook | 数量 | 说明 |
| :--- | ---: | :--- |
| `useState` | 67 | 从设置、工作区、批注、查找、保存、宿主文档到 UI 开关 |
| `useEffect` | 45 | 单依赖 28 条、多依赖 17 条、`[]` 0 条 |
| `useRef` | 71 | 大量 `xxxRef` 用来绕开 `useCallback` 声明顺序（如 483、497–500、541–542） |
| `useCallback` | 91 | 见 S1.4 |
| `useMemo` | 1 | 几乎不用记忆化 |
| `useLayoutEffect` | 1 | 页边定位 |

hook 总量 276。单一组件、单一渲染根：**任何一次 `setState` 都重渲染 4,046 行组件及其全部子组件**（`FileTree`、`MarginRail`、`PreviewPane` 都在 JSX 里），没有 `React.memo`。

### S1.3 effect 依赖

- 45 条 effect 的依赖全部非空。最长的几条：`913–1027`（`[editor, applyHostPayload, setMarkdown, syncDocInfo]`，115 行，宿主文档载入）、`1259–1302`（`[editor]`，44 行，批注事务映射）、`2786–2848`（`[flushHostSaveWaiters]`，63 行，宿主消息总线）、`2867–3006`（键盘，依赖写在 3006–3025 多行）。
- 依赖里出现最多的：`editor`（14 次）、`dirty`（3）、`hostDoc`（3）、`saving`（3）。
- **没有任何 `useEffect(..., [])`**：所有订阅都随依赖变化重装。这对提取是好消息——hook 里不需要处理「挂载一次」的隐式约定；也是坏消息——`host` 每次渲染都是新对象（316，`getHostTransport()` 每次新建），任何以 `host` 为闭包的 effect 每次渲染都会重装。

### S1.4 组件内分区（源码注释分节）

| 分区 | 行号 | 行数 |
| :--- | :--- | ---: |
| 批注 | 1029–1331 | 303 |
| 字号与查找 | 1332–1406 | 75 |
| 滚动与页边定位 | 1407–1526 | 120 |
| 文件（含保存/另存为/新建/改名/删除） | 1527–2272 | **746** |
| 最近打开 | 2273–2412 | 140 |
| 宿主草稿 | 2414–2480 | 67 |
| 自动保存 | 2481–2622 | 142 |
| 关窗保护 | 2623–2664 | 42 |
| 视图（源码/预览/导出/图片/公式/链接） | 3059–3498 | 440 |

`文件` 是最大分区，但它不是一个单元：载入、树刷新、改名、删除、新建、保存五套流程互相调用（如 `prepareRename` → `waitForCommit` → `handleRenamedFile` → `refreshTree`）。**不要整块提取。**

### S1.5 三个最内聚、最适合提取的单元

判据：输入输出清楚、依赖可列举、能写成纯函数并测到、行为可用现有验收脚本比对。详见「App.tsx 提取清单」。

| 排名 | 单元 | 现位置 | 行数 | 依赖面 | 测试面 | 风险 |
| :--- | :--- | :--- | ---: | :--- | :--- | :--- |
| 1 | 最近打开协议 | 2273–2412 + 227–260 + 437–438 + 512–516 + 2794–2810 | ~200 | 宿主收发、notice、dirty | 响应校验/请求 id/超时/STALE 文案，纯函数可测 10+ 条 | 低 |
| 2 | 自动保存判定 | 2481–2622 + 520–526 + 498–500 | ~156 | 设置、宿主文档、基线、模态、IME | 判定表 12+ 条，纯函数可测 | 中 |
| 3 | 宿主写回状态机 | 2158–2271 + 2665–2671 + 2706–2848 | ~285 | editor、宿主、基线、dirty、loss 门 | pendingIds 队列/超时/失败保 dirty，纯 reducer 可测 | 高（数据安全） |

备选（第 4）：宿主草稿 + 关窗保护（2414–2480 + 2623–2664，109 行）。协议清晰，但收益比前三个小。

---

## App.tsx 提取清单

### 单元 A：最近打开（recent）

- **现状**：`recent` / `recentStaleId` 两个 state（437–438）；4 个 ref（512–516，请求 id、在飞条目、清除撤销 id）；`loadRecent` 2275、`sendRecent` 2315、`removeRecent` 2337、`sendOpenRecent` 2350、`openRecentItem` 2376、`restoreRecent` 2388、`clearRecent` 2397；effect 2307；消息分支 2794–2810。
- **输入**：宿主 transport（或 null）、`dirty`、`requestSave('switch', after)`、`setNotice`。
- **输出**：`recent`（`no-host` / `disabled` / `volatile` / `ok` / `error`）、`recentStaleId`、`loadRecent`、`openRecentItem`、`removeRecent`、`clearRecent`、`restoreRecent`。
- **建议形态**：`src/lib/recent.ts`（纯）+ `src/lib/recent.test.ts`：
  - `parseRecentResponse(data)`：校验 `v===1`、`state`、过滤不是 `{id:string, seq:number, name:string}` 的条目、`disabled` 原因兜底（现 2294–2301 的内联逻辑）。
  - `recentRequestKey(type, payload, requestId)`：`open-recent` / `recent-remove` 用条目 id，`clear` / `restore` 用自增 id（现 2322–2328）。
  - `matchRecentResult(type, id)`：把 `*-result` 还原成请求 key（现 2802–2803）。
  - `recentError(code)` 已在 App 内（237–260），一并下移。
  - 超时策略常量 `RECENT_TIMEOUT_MS = 10000`（现 2330）。
- **测试面**：坏 JSON、`v` 不匹配、`state=disabled`、条目字段缺失被过滤、`volatile`、STALE 文案、请求 key 两型、10 秒超时 resolve `{ok:false,error:'IO'}`。可写 10–14 条，全部不碰 DOM。
- **依赖**：`Annotation` 之类的类型不需要；只要 `host.postMessage` 与 `fetch('/__recent')`。hook 本体保留在 App（或 `src/hooks/useRecent.ts` 只做 state + 调用纯函数）。

### 单元 B：自动保存判定（autosave gate）

- **现状**：`runAutoSave` 2513–2586（13 个前置条件 + 两条写盘路径）、`scheduleAutoSave` 2588、`cancelAutoSave` 2483、`writeDraftFallback` 2491、IME 组合 effect 2604–2621；相关 ref 520–526。
- **输入**：`settings.autoSave`、`editor` 是否就绪、`hostDoc {ready, writable, mtime}`、`dirtyRef`、`originalText`、`hasSavedBaseline`、`activeFile` / `saveTarget`、`pendingConfirm` / `pendingSwitch` / `closeRequested` / `closeGuardOpen` / `settingsOpen`、`saving` / `pendingIds.size`、`deleting` / `refreshing`、`composeUntil`、`autoFailCount`、结构损失列表。
- **输出**：`skip` / `manual`（有结构损失，只提示）/ `external`（mtime 更新）/ `host`（发写回）/ `file`（走 commit）/ `none`（无落点）。
- **建议形态**：`src/lib/autosave.ts` + `autosave.test.ts`：
  - `decideAutoSave(snapshot): {action, reason}`，**严格保持现有判断顺序**（2515–2528 的顺序本身是行为：先 `autoSave`，再 IME，再失败计数，再在飞，再删除/刷新，再模态，再 dirty，再基线，再落点）。
  - `autoSaveTarget({hostDoc, hasFileTarget, originalText, hasSavedBaseline})`。
  - `isComposing(now, composeUntil)`（现 2516）。
- **测试面**：每条前置条件一条用例（关自动保存、IME 中、失败 3 次、在飞、删除中、弹窗、不脏、无基线、无落点、有损失、宿主 mtime 变新、宿主可写、文件可写），共 12–14 条；顺序敏感用例单独一条（同时「脏 + 无落点」应返回 `none` 而不是 `manual`）。
- **依赖**：只接收值，不接收 editor；editor 是否就绪作为布尔传入。

### 单元 C：宿主写回状态机（host save）

- **现状**：`sentTextRef` / `pendingIdsRef` / `pendingHostSave` / `saveTimersRef` / `nextSaveIdRef` / `savingRef` / `hostSaveWaitersRef`（531–542、501–502）；`prepareSave` 2159、`performSaveAs` 2167、`runSave` 2203、`requestSave` 2229、`confirmSave` 2262、`saveFile` 2665、`sendHostSave` 2707、`applyHostSaveSuccess` 2742、消息总线 2786–2848。
- **输入**：`hostDoc`、宿主 transport、`currentMarkdown()`、`originalText`、`baselineLosses`、`dirty`、`saveWarned`、`pendingConfirm` / `pendingSwitch`。
- **输出**：`requestSave(target, after)`、`saveFile`、`confirmSave` / `cancelConfirm`、`saving`、`saveError`、20+ 副作用（基线、dirty、mtime、清草稿、切文档、提示）。
- **建议形态**：分两步，不要一次搬完。
  1. **纯函数**：`src/lib/saveText.ts`（`normalizeForHost`：CRLF→LF + 末尾换行跟随原文，现 2160–2162；`toEol`）、`src/lib/saveRoute.ts`（`decideSaveRoute({target, hostDoc, dirty, after})`：`host` / `saveAs` / `file` / `switch` / `confirm-needed` / `notice-noop`，现 2229–2256）。
  2. **队列 reducer**：`src/lib/saveQueue.ts` + 测试：`enqueue({pendingIds, sentText, queued})`、`ack(id, ok, mtime)`、`timeout(id)`、`nextQueued()`。现 2707–2735 与 2825–2845 的语义逐条搬：同一时间只一个 id、再按只留最新一份、10 秒超时、晚到 id 丢弃、失败保 dirty、成功清草稿。
- **测试面**：四条保存路径的路由（host/saveAs/file/switch）、脏且无宿主→saveAs、无改动→notice、超时、失败、排队补发、旧 id 丢弃、EOL/末尾换行 4 组。约 12–16 条。
- **依赖**：`risk.ts` 的 `activeLosses` 已存在但**没有测试文件**（`src/lib/` 下无 `risk.test.ts`），提取时可以顺手补 4–6 条（结构损失门是唯一会弹确认框的路径）。

### 不要提取的

- **批注（1029–1331）**：位置映射与 ProseMirror 事务强耦合（1259–1302），依赖 editor 内部状态，纯函数化后测试价值低。
- **文件（1527–2272）**：五套流程交叉；拆开会产生 6 个互相回调的 hook，比现在更难读。
- **视图（3059–3498）**：源码模式的正确性依赖 `sourceBaselineRef` / `sourceOriginalEntryRef` 与 dirty 基线，跨三处状态；先提取纯函数再谈。

---

## S2. 提取风险

### 首屏 chunk

- 首屏就是 2 个文件：主 JS gzip **277,480 B** + CSS gzip **6,730 B** = **284,210 B**，上限 285,000，**余 790 B**（`.tmp/r16-measure.log`）。
- 提取到 `src/lib/*` 仍是静态 import，**字节仍留在主 chunk**，不会减小首屏；也**不会**自动变成 lazy chunk。期望变化是 Rollup 模块边界与标识符重排带来的 ±0.1%–0.5%（±280–1,400 B），**这个区间能吃掉 790 B 余量**。
- 结论：每次提取必须和 `npm run build` + `node scripts/measure-first-screen.mjs` 同一次提交跑；超线就删等价死代码或按 ADR 调预算，**不许先合并后补测**。
- 如果目标是真正减小首屏，提取不是手段（首屏 97.6% 是主 JS，其中绝大部分是 Tiptap/KaTeX 之外的应用代码 + 编辑器内核）。别把「可维护性」和「体积」混成一个验收项。

### HMR

- `@vitejs/plugin-react` 只为「导出组件的模块」注册 Fast Refresh 边界；只导出 `use*` 函数或纯函数的模块不是边界（`node_modules/@vitejs/plugin-react/dist/*.js` 有 `Could not Fast Refresh (export ...)` 一族报错）。改这类文件会整页 reload。
- 现状：改 `src/lib/*` 已经整页 reload；改 `App.tsx` 保状态。提取后新增的 `src/lib/recent.ts` 等会加入 reload 集合——**不新增风险类别，但增加触发频率**。
- 缓解：第一轮只提取纯函数（无 React），hook 留在 `App.tsx`；纯文件改动本来就会 reload，且宿主模式下草稿 800 ms 兜底（2416–2430）、浏览器模式有 `localStorage` 草稿（2506–2510）。
- **未实测**：没有起 dev server 验证 hook-only 模块的 reload 行为。验证方法：新建 `src/lib/x.ts` 导出 `useX`，在 App 里调用，改一行看 Vite 日志是 `hmr update` 还是 `page reload`。

### 测试

- 测试入口是 `package.json:14` 的 `node --experimental-strip-types src/lib/*.test.ts` 链；`package-lock.json` 无 jsdom / vitest / @testing-library / react-test-renderer。没有组件测试，也没有 hook 测试。
- 因此：**hook 提取无法被现有设施测到**。要「带测试」，必须把判定逻辑做成纯函数放进 `src/lib/`。这也是本报告建议「纯核心 + 薄 hook」的原因。
- 若坚持测 hook，需要新增 devDependency（jsdom + testing-library 或 react-test-renderer）并改测试运行器——与「轻量」「不新增依赖」冲突，不建议本轮做。
- `npm test` 今天 exit 0（本机复跑，末文件 6 条通过；全量 16 文件 205 条以 README:110 与 CHANGELOG 记录为准，未逐文件汇总）。

### 宿主桥接

- 单条宿主消息监听器（2786–2848）同时处理 4 类消息：`recent-*-result`、`close-request`、`draft-save-result`、`save-result`。提取最近打开/草稿时有三条路：
  1. 各 hook 自带监听器。`hostBridge.ts` 两种传输都支持多监听（Windows `webview.addEventListener`、macOS `window.addEventListener`），返回 unsubscribe。**可行**，但每个监听器都要重复 `data.v !== 1` 过滤。
  2. 保留单监听器，把分区逻辑作为回调注入。改动最小，但 App 仍持有总线。
  3. 新建 `src/lib/hostMessages.ts` 做类型分派，App 只订阅自己关心的。
  建议 2 或 3；**不要**两个 hook 各自监听后还依赖顺序——现在 `recent-*-result` 在 `save-result` 之前 return（2794–2810 早于 2825），拆分后靠消息类型天然互斥，但要在代码里写明。
- `getHostTransport()` 每次渲染新建对象（316；`hostBridge.ts:21–44`）。提取 hook 后如果把 `host` 放进依赖数组，effect 会每次渲染重装——**必须先把它改成模块级单例或 hook 内 `useMemo`**，否则提取会放大重装问题。
- 跨组契约：`window.__slState = { dirty, name, readOnly, viewMode }`（606–609）被验收脚本读取（`host-save`、`draft`、`readonly`、`newfile`、`keyboard`、`data-safety`、`fidelity` 等 19 处引用）。**提取不得改字段名、不得延迟更新**。

### 「行为不变」验收清单

每条都要有输出，不接受「看起来一样」：

1. `npm run build` 通过（tsc + vite）。
2. `npm test` 全过，条数 = 205 + 新增条数，新增条数写进 CHANGELOG。
3. `node scripts/measure-first-screen.mjs --max 285000` PASS，并记录新旧字节差。
4. `node host/fcp-probe.mjs` 6/6（本地宿主；含 FCP ≤500 ms、转发 reload、origin 一致、穿越 403、Content-Type）。
5. `node scripts/host-save-acceptance.mjs`、`draft-acceptance.mjs`、`recent-acceptance.mjs`、`readonly-acceptance.mjs`、`newfile-acceptance.mjs`、`data-safety-acceptance.mjs` 全过（这 6 个覆盖保存/草稿/最近/只读/新建/保真）。
6. `tree-acceptance` 49/49、`theme-acceptance` 26/26、`keyboard-acceptance` 35/35 不回归（不碰这三块也应全过）。
7. 手工对照四条保存路径：宿主写回、另存为、无宿主文件保存、脏文档切换；再加 10 秒超时、失败保留 dirty、排队补发各一次。
8. 最近打开：8 条上限、STALE、清除/撤销、移除、在飞重复点击。
9. 草稿：800 ms 落草稿、保存成功后清除、关窗三选一、草稿比原文件新时的恢复提示。
10. 控制台无 error；`window.__slState` 字段不变。
11. diff 审阅：只移动、不改逻辑；每个提取单元给出「旧行号 → 新文件」对照，逐段比对缩进外的 token。

---

## S3. 性能门方案

### 现状

- CI 三组必过 job（`.github/workflows/ci.yml`）：`gate`（build+test）、`windows-host`（build → 宿主 → smoke → NSIS → 产物）、`macos-host`（build → Universal → self-test → verify）。`install-verify` 手动。
- **没有任何性能断言**。`scripts/measure-first-screen.mjs` 存在但没人调用；`host/fcp-probe.mjs` 只在 ADR-0005 里作为手动验收；`.tmp/measure.mjs` 未进版本控制。
- 最近实测：首屏 gzip 284,210 B（`.tmp/r16-measure.log`）；宿主 FCP 208 ms（`.tmp/r15-fcp.log`，README:103 记 304 ms，ADR-0005 记 296 ms）。

### 门 1（建议本轮就加，必过）：首屏字节

- 命令：`node scripts/measure-first-screen.mjs --max 285000`，放在 `gate` job 的 `npm run build` 之后。
- 成本：约 0.1 s，无浏览器、无网络、无并发，**不会 flaky**。脚本已做两件事：按 `index.html` 实际引用的 script/link 求 gzip level 9 总量；首屏集合出现 `katex`/`lazy` 直接失败（`measure-first-screen.mjs:59–67`）。
- 阈值：保持 285,000。提取后若逼近，先在同一个 PR 里记录新数字，再决定「删代码」还是「调预算 + ADR 说明」。
- 附加（可选，确定性同样好）：`scripts/check-bundle.mjs` 断言主 chunk raw ≤ 920 KB（现 886,298 B）与 App.tsx ≤ 4,100 行，防止提取成果被重新长回去。这是可维护性门，不是性能门。

### 门 2（建议手动跑 3 次后再转必过）：宿主 FCP

- 复用 `host/fcp-probe.mjs`：6 条断言，FCP 阈值 500 ms 写死（194、263）。跑在 `windows-host` job，位置在 `Build host` 之后、`Build NSIS installer` 之前（此时 `host/bin/Sidelight.exe` 与 `host/bin/www` 已存在）。
- 稳定性风险：CI 冷 VM、WebView2 首次启动、无 GPU、47821 端口、CDP 9341。本地 208 ms 有 2.4× 余量，但 CI 无实测数据。缓解：给脚本加 `--max-fcp` 与 `--retries 2`（取最好一次），或 CI 用 800 ms、本地仍 500 ms；前 3 次只上传日志不判红。
- 结论：**能复用，但不要一次就设必过**。先 `workflow_dispatch` 观察。

### 门 3（需新脚本，先观察）：长文输入预算

- 现有资产都不够：
  - `.tmp/measure.mjs`：CDP 连 9224，测 `goto` 的 wall、FCP/DCL、longtask 数、`performance.memory`；**没有输入延迟**，且文件在 `.tmp`，未进版本控制。
  - `scripts/diag-longdoc-*.mjs`：长文正确性（单段万字、批注覆盖），不是计时。
  - `scripts/ime-composition.mjs`：组合输入正确性。
- 建议 `scripts/perf-longdoc.mjs`（CDP + 已起 dev/preview）：
  - 夹具：10 KB / 100 KB / 1 MB（1 MB 用重复段落，避免单行 8 MB 解析上限，214 行 `MAX_HOST_DOC_LENGTH` 与 970 行的解析上限说明）。
  - 指标：① 载入到可输入（`.ProseMirror` 可见 + 首次 input 成功）；② 输入延迟 p95：连续 20 次插入字符，`keydown` → 下一个 `requestAnimationFrame` 的时间差；③ 滚动帧间隔 p95（5 s 自动滚动，`requestAnimationFrame` 间隙）；④ 关闭文档后 `HeapProfiler.collectGarbage` 再读 `usedJSHeapSize`；⑤ 切换 3 篇文档的耗时。
  - 稳定性：预热 1 次丢弃，正式 3 次取中位数；固定视口 1440×900；禁用缓存；同一台机器基线写入 `perf-baseline.json`，门槛用**比值 ±20%** 加绝对上限（100 KB p95 ≤50 ms、1 MB p95 ≤150 ms、1 MB 载入 ≤3 s）。
  - 接入：新 job `perf`（`continue-on-error: true`）先跑 3 轮，绿 3 次再转必过。理由：输入延迟在共享 runner 上波动比 FCP 更大。

### 复用结论

| 资产 | 能否复用 | 用法 |
| :--- | :--- | :--- |
| `scripts/measure-first-screen.mjs` | **能，直接进 CI** | 门 1，唯一确定性门 |
| `host/fcp-probe.mjs` | 能，需加阈值/重试参数 | 门 2，Windows job，先观察 |
| `.tmp/measure.mjs` | 只能当骨架 | 提交为 `scripts/perf-probe.mjs` 并补输入延迟 |
| `scripts/diag-longdoc-*.mjs` | 不能 | 正确性诊断，无计时 |
| `scripts/host-smoke.mjs` | 不能 | 冒烟，不是性能 |

---

## S4. 版本建议

### 判据（AGENTS §5：修复 +0.0.1、功能 +0.1.0、破坏 +1.0.0）

| 本轮实际改动 | 版本 | 依据 |
| :--- | :--- | :--- |
| 只提取单元 + 补测试 + 加性能脚本/报告 | **0.30.1** | 无用户可见变化；0.28.1 先例：只改可访问性与测试仍发补丁 |
| 提取顺带改判定顺序/节奏（例如自动保存从 2 s 变 1 s、提示文案变） | 0.31.0 | 用户可感知的行为变化 |
| 新增设置项、新菜单、新能力 | 0.31.0 | 功能 +0.1.0 |
| 改窗口标题、`__slState`、宿主消息协议 | ≥0.31.0 | 对外契约变化 |

**建议：0.30.1。** brief 明确写「行为不变」；性能基线是测量，不是功能。

### 版本号落点（改 4 处 + tag）

1. `package.json:3`
2. `package-lock.json:3` 与 `:9`（只有根两处；`:2025` 是依赖 `scheduler` 的版本，**不要动**）
3. `docs/CHANGELOG.md` 新标题（release.yml preflight 用 `grep "^## ${PKG_VERSION} "` 校验，破折号要对上）
4. `README.md:64` 安装包文件名
5. tag `v0.30.1`（`release.yml` 要求 tag = package.json = CHANGELOG）

### CHANGELOG 要写

- 新节 `## 0.30.1 — <日期>`：提取清单（旧行号 → 新文件）、新增测试文件与条数、首屏 gzip 新旧值、测试总数 205 → N、三资产字节与 SHA256、未验清单（IME / 真机 / 签名等沿用）、一句「无用户可见行为变化」。
- **顺手修 0.30.0 的欠账**：`docs/CHANGELOG.md:17` 写「出包后回填」，但至今没有数字。按 GitHub API 回填：setup 817,983 B、portable 902,274 B、macOS Universal 890,004 B，SHA256 见 `SHA256SUMS-0.30.0.txt`。

### README 要改

| 位置 | 问题 | 改法 |
| :--- | :--- | :--- |
| 64 | `release/Sidelight-0.30.0-win-x64-setup.exe` | 换 0.30.1（或改成 `<版本>` 占位，避免每版都改） |
| 92、94 | `284,210 B`、`SHA256SUMS-0.30.0.txt` | 新字节 + `SHA256SUMS-0.30.1.txt` |
| 103 | `SHA256SUMS-0.30.0.txt`、FCP 304 ms | 同上；FCP 写实测区间（208–304 ms） |
| 110 | `npm test # 16 个文件、205 条断言` | 新文件数与条数 |
| 132 | `release/Sidelight-<ver>-macos-<arch>.zip` | 与 ADR-0015/实际产物不符，应为 `-macos-universal.zip` |
| 147 | `lib/*.test.ts 16 个测试文件` | 新数量 |
| 185–193 | 「下一步」 | 换成第 17 轮后的真实下一步（性能门/剩余提取） |

`README` 的「现在能做什么/不能做什么」在纯重构下不必改；只有行为变化才动。

---

## S5. 发布状态（0.30.0）

### 已发布事实（GitHub API `releases/tags/v0.30.0`）

| 资产 | 字节 | SHA256（前 8 位） |
| :--- | ---: | :--- |
| `Sidelight-0.30.0-win-x64-setup.exe` | 817,983 | `a1f1b7a3…` |
| `Sidelight-0.30.0-win-x64-portable.zip` | 902,274 | `47d15dca…` |
| `Sidelight-0.30.0-macos-universal.zip` | 890,004 | `0022784e…` |
| `SHA256SUMS-0.30.0.txt` | 308 | — |

- tag `v0.30.0` 存在；release 由 `github-actions[bot]` 创建，`published_at 2026-11-15T23:45:50Z`，`draft=false`、`prerelease=false`。
- macOS 是 Universal（资产名 `macos-universal`，ADR-0015/CHANGELOG 0.29.0 记 arm64 + x86_64、minos 13.0）。
- 签名：release 正文首行「**未签名、未公证**（ad-hoc 签名；首次打开步骤见 zip 内 README.txt）」，并带 `signing=adhoc`。即本次发布没有走 Apple secrets 签名/公证路径。
- 下载计数均为 0（发布约 3 分钟后查询；不是缺陷）。

### 本机残留

`release/` 只有 `0.27.0`、`0.28.0` 的 setup/portable 和一份 0.26.0 的 `SHA256SUMS.txt`。这是构建残留（该目录不进版本控制），**不代表发布状态**；验收脚本不要拿本机 `release/` 判断版本。

### 本轮是否发 0.31.0

**不建议。** 三条理由：

1. 本轮目标没有用户可见能力（brief 第 1、2 条都是内部质量）。
2. 0.30.0 刚发布，3 个资产全新、下载为 0；同一功能面再发 minor 只会稀释版本含义。
3. 若要发布，优先 0.30.1。提取会改变 dist 字节，**当前源码已无法重建 0.30.0 的资产**；保持「源码 = 已发布资产」要么发补丁，要么把 bump 留到下一次有可见改动时一起发。

**发布门（沿用 `release.yml`，不新增）**：preflight 三处版本一致 → 3 资产 + SHA256SUMS（4 文件）→ `sha256sum -c` → 签名三态说明 → 人点 publish。macOS 仍 ad-hoc（无 secrets 时不静默降级）。

---

## 优化机会（最多 3 条）

1. **自动保存每 2 秒拉一次全文 `/__doc`**（2538–2557）：只为比较 `mtime`，却把整篇 JSON（上限 6 MB，214 行）取回并解析。6 MB 文档空闲打字时每 2 秒一次 6 MB 传输 + 解析，是长文最可疑的卡顿源。建议宿主加 `/__doc/meta`（只回 `mtime`/`size`）或支持 `HEAD`，页面改用 meta 端点。难度：小（宿主 + 页面各一处）。
2. **`tick` 全树重渲染**（332 定义；1328、1346 依赖 `tick`）：装饰刷新一次就让 4,046 行组件 + `FileTree` + `MarginRail` + `PreviewPane` 一起重渲染，且没有任何 `memo`。建议把 `tick` 驱动的装饰更新移到编辑器插件/外部 store，或至少给 `FileTree`、`MarginRail` 加 `memo` 并稳定其 props。难度：中；先用 React Profiler 量一次再动手。
3. **`getHostTransport()` 每次渲染新建对象**（316；`hostBridge.ts:21–44`）：返回两个新闭包，导致以 `host` 为闭包的 effect/callback 每次渲染都换身份。改成模块级惰性单例，或 `const host = useMemo(getHostTransport, [])`。难度：小，收益随提取放大。

---

## 测量口径与未验证

- **行号口径**：`read` 工具与 node `split('\n')` 一致（4,348 行）。PowerShell `Get-Content` 对同一文件只数到 4,242 行（少 106），所以本报告所有行号以 node/read 为准；用 PowerShell 复核时必须用 node 重新数。
- **未验证**：本轮没有起 dev server，所以 HMR 行为（hook-only 模块是否整页 reload）是推断；CI 上 FCP/输入延迟的波动没有数据；`npm test` 只确认 exit 0 与末文件 6 条，未逐文件汇总 205；没有在 CI 实跑 `measure-first-screen`；没有验证 `.tmp/measure.mjs` 在 9224 端口可用。
- 数据文件：`.tmp/r17-ship/analyze.mjs`（结构统计脚本）、`.tmp/r17-ship/evidence.log`（本报告引用的原始数字）。
