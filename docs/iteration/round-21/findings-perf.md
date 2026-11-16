# 第 21 轮侦察 · 性能与离线（perf）

日期：2026-11-16 10:38–11:00。仓库 `D:\Documents\SidelightProgram`，HEAD `f3eec1d`（产品代码 `b799cf2`，v0.30.3）。finder 只读，未改 `src/`、`host/`、`host-mac/`，未跑 `npm run build`。

环境：Windows 11、Node 24.21、headless Edge 157.0.4341.46（CDP `9226`，profile `%TEMP%\sidelight-r21-perf`）。dev `http://localhost:5173` 全程 200；`dist`（10:16 构建，1,439,816 B）用 `npx vite preview --port 4174` 起在 `http://localhost:4174`。对照组内每个用例独立 `browser.newContext()`。

取证脚本（都不在产品代码里）：`.tmp/r21-perf/bench.mjs`（载入/逐键/滚动/保存/冷启动/内存）、`ab.mjs`（同尺寸文本有/无保存基线对照 + CDP CPU profile）、`offline.mjs`（KaTeX chunk 中断、AI 断网、启动外部请求）、`quick.mjs`（公式兜底点击重试、FCP）、`shot.mjs`。原始 JSON：`bench-perf.json`、`bench-cold.json`、`bench-mem.json`、`ab.json`、`offline.json`、`quick.json`；日志同名 `.log`。截图 `shots/round-21/perf-katex-chunk-fail.png`。

样本：`# 长文性能样本` + 重复中文行。100 KB = 110,029 字符；1 MB = 1,126,248 字符（约 20k 个段落）。正文不含公式、批注、表格。

## P1（P0）1 MB 文档：第二键输入冻结 >12 s，页面不崩溃但不可用

- 证据：`.tmp/r21-perf/bench-perf.json` → `dev 1 MB` / `dist 1 MB`（两次独立复跑，数字一致；日志 `bench-perf.log`、`bench-perf-rerun.log`）。
  - 第一键 306.4–340.2 ms；**第二键 12,000 ms 超时**（脚本单键上限），记录 `pageClosed:false`、`crashes:0`、`pageErrors:[]`。
  - 超时后紧接着的 `scroll-init` 探针也 10,000 ms 超时（主线程被占），说明第二键的实际耗时 **> 12 s 且恢复缓慢**，随后保存仍然正常（102.2–122.9 ms）。
  - dev 与 dist 都复现，不是 dev 专属。
- 影响：1 MB 文档能打开、能保存，但正文不能输入——每次按键要等十几秒。用户在长文里改写一段就会被卡死；这是「能载入但不能写」的假可用状态。页面无崩溃、无错误提示，用户只能强杀窗口。
- 成本：**M**（同一处代码，见 P2 建议）。修复后须把 1 MB 逐键 p95 纳入验收。
- 建议改法（与 P2 共同修）：
  1. `src/App.tsx:735-739`：不要每键调用 `contentRef.current()`。`docChanged` 时直接 `dirtyRef.current = true; setDirty(true)`；把「与基线是否相等」的全文比较改成 **250–300 ms 防抖**或在 `undo`/`redo` 后再比（撤销回原样才需要精确判定）。
  2. `src/App.tsx:796-801`：`onSelectionUpdate` 里每键 `readBlocks(current)`（`App.tsx:133-139` 遍历全部顶层节点并取 `textContent`）、`buildContext`、`extractOutline` + `activeOutlineId` 全部同步跑。改为：`buildContext` 推迟到点「分析」时算（`App.tsx:1058` 已有一份可取）；`activeOutlineId` 复用 `onUpdate` 里 180 ms 防抖产出的 outline（`App.tsx:740-745`），不重复 `extractOutline`。
  3. 改完用 `.tmp/r21-perf/bench.mjs` 复测：1 MB 连续 15 键无超时，p95 < 100 ms 为目标；100 KB p95 < 30 ms（见 P2）。

## P2（P1）100 KB 文档逐键 p95 155–171 ms，输入手感是「每键卡一下」

- 证据：`.tmp/r21-perf/bench-perf.json`，每档 3 轮 × 15 键，取第 2、3 轮的 p95（两次复跑）：
  - dev 100 KB：p50 158.9–159.2 ms，p95 **166.7–170.7 ms**，max 170.7 ms；
  - dist 100 KB：p50 150.6–153.3 ms，p95 **155.0–162.4 ms**，max 162.4 ms；
  - 对照第 17 轮 10 KB 样本 p95 5.0–7.2 ms（`docs/iteration/STATE.md:57`）：**10 倍体积 ≈ 24 倍耗时**，超线性。第 17 轮 `.tmp/r17-perf.log` 记的 100 KB p95 是 245 ms，同一问题仍在（本轮 155–171 ms），当时没写进 STATE，所以「100 KB/1 MB 逐键 p95 未测」应改为「已测，未修」。
  - 100 KB 载入 287 ms（dev，含 goto 129 ms）/ 183 ms（dist）；保存 17.2 ms（dev）/ 12.1 ms（dist）。载入与保存都不是瓶颈。
- 归因（部分坐实，见「未坐实」）：每键同步做一次整篇序列化——`App.tsx:736` → `contentRef.current()` = `currentMarkdown`（`App.tsx:2236-2245`）→ `serializeDocument`（`src/lib/serializeDocument.ts:35-51`）：`editor.getMarkdown()`（全文）+ 4 条全文正则 + `reuseTables` + `splitFrontmatter`。A/B 对照（`.tmp/r21-perf/ab.json`）：同尺寸文本在**没有保存基线**的新建文档里输入 p95 **30.7 ms**（p50 24.4 ms），有基线时 **166.2 ms**，差 5.4 倍——差值正好落在每键全文序列化上。
- 影响：100 KB（约 5 万字）是目标用户的长文规模；每键 160 ms 等于「按住键也出不来字」，且拖慢每一段写作。无丢数据风险。
- 成本：**M**（同 P1 的第 1、2 条）。
- 建议改法：见 P1；另可在 `onUpdate` 里用 `transaction.docChanged` 的局部位置更新 outline，而不是每键重扫全篇。

## P3（P2）关闭 1 MB 文档后堆不回落：保留 2.6 MB，每次开/关再涨约 0.24 MB

- 证据：`.tmp/r21-perf/bench-mem.json` → `mem`（CDP `HeapProfiler.collectGarbage` 后 `Performance.getMetrics`）：

| 步骤 | JSHeapUsedSize | 相对空文档 |
| --- | --- | --- |
| baseline-empty（空文档） | 12,939,236 B | — |
| open-1（1 MB，耗时 263 ms） | 17,169,832 B | +4.23 MB |
| closed-1（新建空文档） | 15,544,940 B | **+2.61 MB** |
| open-2（284 ms） | 17,767,724 B | +4.83 MB |
| closed-2 | 15,819,620 B | +2.88 MB |
| open-3（289 ms） | 18,013,144 B | +5.07 MB |
| closed-3 | 16,063,904 B | +3.12 MB |

- 影响：单次影响小（十几 MB 级），但「开长文 → 关 → 再开」是长文工作流的高频动作；每轮 +0.24 MB、且基线抬高 2.6 MB 不回落，连续 20 次约 +5 MB，且说明旧文档对象仍被引用（基线快照/正文快照/撤销栈/批注位置表之一）。1 MB 文档载入本身只要 263–289 ms，不是瓶颈。
- 成本：**S–M**。建议先定位保留者：关闭/切换文档时把 `rawTextRef`、`originalText`、`baselineRef`、`contentVersionRef` 引用的整篇字符串与撤销栈释放；`annotations`/`memo` 按文档键清理。验收：10 次 open/close 后 `JSHeapUsedSize` 相对 baseline 增长 < 1 MB。
- 未验证：哪一处引用在留（需要 heap snapshot 比对，本轮未做）。

## P4（P2）离线 KaTeX chunk 失败后，「点击重试」永远修不好，只有刷新窗口能恢复

- 证据：`.tmp/r21-perf/offline.json` + `quick.json`（dist，`page.route('**/*katexLoader*', abort)` 后 reload，再放开网络）。
  - 失败态可见：公式显示 LaTeX 原文，`class="…math-fallback"`，`title="公式排版没加载成功，点击重试"`，`.katex` 数 0；**没有 toast/提示条**（`toast:null`）。
  - 网络恢复后点兜底元素：`.katex` 仍 0，`.math-fallback` 仍 2；控制台 `Failed to load resource: net::ERR_INVALID_URL`。从「插入 ▾」触发 `ensureKatex()` 重试也一样（`offline.json` → `afterInPageRetry.katexCount = 0`）。
  - 只有整页 reload 能恢复：`afterReload.katexCount = 2`、fallback 清空。
  - 机制：`src/lib/katexLazy.ts:113-125` 第二次起用 `new URL('./katexLoader.ts', import.meta.url)` 带 `?retry=` 重新 import；生产构建里没有这个 `.ts` 文件（`ERR_INVALID_URL`），catch 后回退到原 loader，而该 chunk 的失败结果已被模块表记住，于是原地重试永远失败。`showFallback` 的 `onclick`（`katexLazy.ts:71-82`）正是走这条路。
- 影响：公式排版在用户眼里是「坏了」，界面还明确承诺「点击重试」；点了没反应、没有解释，用户只能重启。触发条件少见（chunk 被安全软件拦、安装目录损坏、更新时残留），但一旦发生不可自愈。数据不受影响；导出会另有可见错误（`App.tsx:3316-3321`，静态确认，未实跑）。
- 成本：**S**。建议：重试改为对真实 hash chunk 做 cache-bust（构建期把 chunk URL 暴露成常量，或 `fetch` 后 `import(blobUrl)`）；做不到时把兜底点击改成「提示 + 重新加载窗口」按钮，并用 `role="status"`/toast 说清「公式排版没加载成功，重新加载窗口可恢复」。验收：中断 chunk → 恢复网络 → 点击重试 → `.katex` 出现，不刷新页面。

## P5（P3）冷启动与滚动实测达标（不是缺陷，供 planner 不要改）

- 证据：`bench-cold.json`（cold）、`quick.json`（FCP）。
  - FCP：dist **88 ms**（first-paint 36 ms，DCL 46 ms）；dev 272 ms（first-paint 56 ms，DCL 121 ms）。
  - 编辑器可见：dist 169–175 ms，dev 260–268 ms（3 次冷启动 × 2 轮，独立 context）。
  - 可输入（点击正文 + 首键完成）：dist 19.4–46.7 ms，dev 35.7–47.7 ms。
  - 首个长任务：dist 94–96 ms，dev 113–125 ms；每次冷启动只有 1 个 long task。
  - 1 MB 载入（reload → 编辑器可见）：dist **372–373 ms**、dev 678–681 ms；比 STATE 记的 1,284 ms 好，不要按 1.28 s 做预算。
  - 1 MB 滚动：50 次滚轮共 25,000 px，100 帧，60 fps，frame p95 16.8 ms，>50 ms 帧 0（dev/dist 相同）。滚动不是热点。
  - 启动网络：dist 冷启动共 4 个请求，**0 个外部域名**（`offline.json` → `startup`）；「启动不联网」成立。
  - 离线 AI：断网请求给出「连不上接口地址。下一步：检查网络，或确认设置里的「接口地址」没填错。」+「打开设置」按钮；把端点换成 401 后同一次点击给出「API Key 无效或没有权限…」，**可恢复、文案可执行**（`offline.json` → `ai`）。
- 结论：不要为「冷启动」「滚动」「启动联网」「AI 断网」立项。dev 的 FCP 是 dist 的 3.1 倍，性能结论一律以 dist 为准。

## 未坐实 / 未验证

- **P2 的归因没有完全隔离**：A/B 的新建文档是把 100 KB 作为单个文本块插入的（无保存基线 + 单块结构两个变量同时变了），所以「每键全文序列化」是主嫌但未单独证明；CDP profile 里 Top 自身耗时是 `(program)`，具名帧只有 dev 的 `jsxDEV`。要坐实需在 dist 里构造「多段落 + 无基线」样本（源码模式粘贴后切回富文本）再测一次。
- **100 KB 文本插入耗时 21,591 ms**（`ab.json` → `blank-100KB.insertMs`，Playwright `keyboard.insertText`，dev）。这可能是「粘贴长文卡死」的新问题，但 `insertText` 与真实剪贴板粘贴路径不同，且未在 dist 复测，本轮不作为编号结论。
- **「断网后打开应用」在浏览器里测不了**：dev/dist 都由 HTTP 提供，`context.setOffline(true)` 连文档都取不到，而桌面宿主从本地 `www` 读文件。本轮用「启动 0 外部请求 + chunk 中断 + AI 断网」代理，真实 WebView2 离线启动仍未验。
- 保存耗时用 stub `showSaveFilePicker`（内存写入）测得，**不含真实磁盘写**；真实盘/网络盘的保存延迟仍未验。
- 1 MB 第二键 >12 s 之后是否还能恢复输入：探针在 12 s 上限处停止，未测「等到恢复后再敲一键」；页面未崩溃、保存可用。

## 最值得做的 3 件事

1. **去掉每键全文序列化**（`App.tsx:735-739` 的 dirty 检查改为脏标记 + 防抖比较；`App.tsx:796-801` 的 `readBlocks`/`extractOutline` 每键重扫改为复用/按需）。验收：100 KB 逐键 p95 < 30 ms、1 MB 连续 15 键无超时（本轮实测 160 ms / >12 s）。这是唯一直接影响「能不能写长文」的项。
2. **让 KaTeX chunk 失败可自愈**：重试打真实 chunk（cache-bust）或用「重新加载窗口」兜底，并给可见提示（`katexLazy.ts:71-82,113-125`）。验收：断 chunk → 恢复网络 → 点击重试 → 公式出现。
3. **关闭 1 MB 文档后释放堆**：定位并释放整篇正文/基线快照/撤销栈引用。验收：10 次开/关后堆增长 < 1 MB（本轮第 1→3 次关闭累计 +0.50 MB，且每次关闭仍比空文档高 2.6–3.1 MB）。
