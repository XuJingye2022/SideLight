# 第 19 轮 · 缺陷发现（收尾）

日期：2026-11-16 09:41–10:05。仓库 `D:\Documents\SidelightProgram`，基线 `08aaf88`（v0.30.1）。finder 只读，未改 `src/`。dev `http://localhost:5173`（中途断开，见「环境异常」）、CDP 9222。未跑 `npm run build`。

证据目录：`.tmp/r19-bug/`（日志、脚本、HEAD 快照）。截图：`shots/round-19/`。

## 结论速览

| 编号 | 严重度 | 问题 | 状态 |
| :--- | :--- | :--- | :--- |
| B1 | P0（已复现） | 保存成功不发 `draft-clear`，草稿残留，重开弹恢复提示 | 根因定位，修复方向已验证 11/11 |
| B2 | P1（已复现） | 1 MB 文档第 2 键起每键 30–36 s 后 renderer 关闭；10 KB 性能数字不可复现 | 根因到代码行，数字已重测 |
| B3 | P1（代码级，未复现） | 「保存并切换」时 `draft-clear` 可能落在新文档上，误清新文档草稿 | 需真实宿主切文档，本轮未验 |
| B4 | P2（工具） | `draft-acceptance` 覆盖缺口；`OUT` 写死覆盖历史截图 | 建议补断言与参数 |

## B1 保存成功不清宿主草稿（P0）

**复现**（HEAD `08aaf88` 快照，端口 5175，脚本 `.tmp/r19-bug/draft-repro.mjs`）：

1. 打开宿主文档（`/__doc` 返回 `plain.md`），在正文输入「保存前的字」。
2. 等 800 ms，收到 `draft-save`（id=1），回 `draft-save-result ok`。
3. `Ctrl+S` → 收到 `save`（id=2），回 `save-result ok, mtime`。
4. 等 800 ms 读消息队列：`["draft-save","save"]` —— **没有 `draft-clear`**，`__slState.dirty=false`。

**证据**：`.tmp/r19-bug/repro-head.log` 第 1 行 `FAIL A 保存成功后发 draft-clear (["draft-save","save"])`，总计 9/11。与 `docs/iteration/round-17/test.md` 的 57/58、`["draft-save","save"]` 完全一致。

**根因**（`src/App.tsx:2872`）：

```ts
setDirty(false)                                   // 2863：异步 state
...
if (dirtyRef.current === false) void clearHostDraft()   // 2872
```

`dirtyRef` 只在两处同步：`useEffect([dirty])`（`632-634`）与编辑器 `onUpdate`（`736`）。保存回包到达前用户打过字，所以 `dirtyRef.current === true`；`setDirty(false)` 的重渲染与 effect 还没跑。**同一回调里读到的 ref 一定是保存前的值**，条件只在「保存一份本来就不脏的文档」时成立——而那时根本没有草稿。于是每次正常保存都跳过清理。第 17 轮修 B3「保存中丢字」时加的这道 guard，把「清草稿」整体挡掉了。

**影响**：宿主 `.sidelight/drafts/<key>.md` 留着旧正文。重开同一文件时 `/__draft` 比 `/__doc` 新（`src/App.tsx:999-1013` 的 mtime + 文本比较），弹「有比原文件更新的草稿」；用户点「恢复草稿」会把已经保存的新内容换回旧草稿。这正是「保存后草稿导致重开提示」的机制。

**修复方向已验证**：删掉该 guard，让上面的版本比较承担「保存中继续输入」的判断（`2843`：`contentVersionRef.current !== sent.version` 时提前 return，不发 clear）。该改法已在 `ab7aaea`（09:47 提交，「release: 0.30.2 draft clear fix」）落地；下表的「工作树」= 该提交后的代码。用同一脚本 11/11：

| 场景 | HEAD | 工作树（候选修复） |
| :--- | :--- | :--- |
| A 保存成功、无新输入 → 清草稿 | FAIL（无 clear） | PASS `["draft-save","save","draft-clear"]` |
| A 清完后继续输入 → 草稿恢复写入 | PASS | PASS `[…,"draft-clear","draft-save"]` |
| B 保存中键入 → 不清，补发 1 次 save | PASS | PASS |
| B 补发保存成功 → 清草稿 | FAIL | PASS `[…,"draft-clear"]`（clear 最多等未回包 draft 1 s） |
| C `close-request` / 取消关窗 → 不清 | PASS | PASS |
| D 丢弃恢复的草稿 → 清 | PASS | PASS |

日志：`.tmp/r19-bug/repro-head.log`、`.tmp/r19-bug/repro-current2.log`。

**建议**：按工作树改法落地；顺手把 `draftGenerationRef` 的 1 s 兜底等待换成「先清计时器、ack 与 clear 同源」。修复后 `draft-acceptance` 必须 58/58，并补 B 场景（见 B4）。

## B2 1 MB 逐键 30 s；10 KB 性能数字不可复现（P1）

**10 KB 复跑 3 次**（`node scripts/perf-longdoc.mjs "10 KB"`，`localhost:5173`，日志 `.tmp/r19-bug/perf-10kb-3x.log`）：

| 次 | load | p95 |
| :--- | :--- | :--- |
| 1 | 902 ms | 6.7388 ms |
| 2 | 905 ms | 5.6524 ms |
| 3 | 904 ms | 7.2001 ms |

`ab7aaea` 已把口径改成「重复测量波动 4.47–6.77 ms」；本轮三次都落在 **5.6524–7.2001 ms**，低端 4.47 今天两次测量（第 17 轮 + 本轮）都没复现，高端 7.20 超过 6.77。第 17 轮 5.0056 / 6.7697，本轮 5.6524 / 6.7388 / 7.2001，五次数值区间应为 **5.01–7.20 ms**。「≤5 ms」已被五次实测否决。

**1 MB「挂起」定位**（`.tmp/r19-bug/perf-probe-1mb.log`，自写探针，只做 1 次载入 + 5 次按键）：

| 阶段 | 耗时 |
| :--- | :--- |
| `localStorage.setItem` 1,048,576 字（JSON 1,087,424 B） | 347 ms，成功 |
| reload → `.ProseMirror` 可见（1048572 字） | 530 ms，正常 |
| 第 1 键 | 357 ms |
| 第 2 键 | 30,681 ms |
| 第 3 键 | 34,433 ms |
| 第 4 键 | 36,359 ms |
| 第 5 键 | 未执行：renderer 已关闭（`Target page, context or browser has been closed`） |

所以「挂起」不是载入，也不是 localStorage 配额：**载入 530 ms，第二键起每键 30 s+，第 4 键后页面崩溃**。`perf-longdoc.mjs` 对按键没有超时（只有 `page.setDefaultTimeout(20000)`，卡住的是浏览器主线程，不是 Playwright 的等待），4 轮 × 20 键 = 80 次按键在 1 MB 上等于几十分钟，看起来就是挂起。

**根因（代码级，`src/App.tsx` `onUpdate`）**：每个按键都做

- `735`：`contentRef.current().replace(/\r\n/g,'\n') !== baselineRef.current` —— 全文序列化第 1 次；
- `746`：`current.getMarkdown()` 后再过 4 个全量正则修复（`repairCalloutMarkers`、`repairHtml`、`repairMath`、`repairFootnoteRefs`）—— 全文序列化第 2 次 + 4 遍 O(n) 以上处理；
- `755`：localStorage 草稿有 256 KiB 上限，1 MB 走不到，所以瓶颈不是存储。

1 MB 下每键 = 两次 1 MB 序列化 + 4 次全量修复 + ProseMirror 大文档重排。10 KB→100 KB（第 17 轮 245 ms）→1 MB（30 s）的增长远快于线性。

**建议**：

1. 文档口径改成：「仅 10 KB 冒烟，p95 5.65–7.20 ms（3 次，波动），load 902–905 ms；100 KB 245 ms（第 17 轮单次，不可信）；1 MB 未测——每键 30 s+、第 4 键崩溃」。删除 1078 ms / 4.47 ms。
2. `perf-longdoc.mjs` 加 `--max-seconds` 与单键超时；1 MB 先只量 load + 1 键，跑不动就记 UNVERIFIED，别让脚本无限挂。
3. （优化）`onUpdate` 的 dirty 判断改用已有的 `contentVersionRef` 对比，省掉每键一次全文序列化。

## B3 「保存并切换」时 draft-clear 可能清到新文档（P1，未复现）

**代码链路**：

- `clearHostDraft`（`src/App.tsx:2525-2538`）：若还有未回包的 `draft-save`，先 `await` 它的 ack，最多 1 s（`2532`），之后才 `postMessage({type:'draft-clear'})`（`2537`）。
- `applyHostSaveSuccess`（`2873-2877`）：`void clearHostDraft()`（不等待）→ 立刻 `performSwitch()`。
- `performSwitch`（`2280-2289`）对最近项走 `next.after()`，即 `sendOpenRecent` → 宿主换文档。
- `draft-clear` 消息**不带文档键或 cacheKey**（`2537` 只有 `v/type/id`）。宿主按「当前文档」清草稿。

所以在「有 draft-save 在飞 + 保存并切换」的 1 s 窗口里，`draft-clear` 可能晚于宿主切文档到达，清掉**新文档**的草稿。反之旧文档草稿留下，下次打开旧文档又弹恢复提示。

**未复现原因**：浏览器 harness 的 `/__doc` 是静态路由，切文档靠宿主；本轮没有起真实宿主做两份样本（`.tmp/host-a/Sidelight.exe` 在，但要控 9337/9340 端口，与其他代理并行有冲突风险）。下一轮用 `host-save-acceptance.mjs` 宿主段补一条：两份样本、A 脏、保存并切到 B、检查 B 的 draft 文件仍在。

**建议**：`draft-save`/`draft-clear` 都带 `cacheKey`（或宿主文档 id），宿主按键清理；或 `await clearHostDraft()` 之后再 `performSwitch()`（最多多等 1 s，窗口小）。

## B4 验收脚本缺口与副作用（P2）

1. **覆盖缺口（部分已补）**：`ab7aaea` 给 `draft-acceptance` 加了 3 条（保存成功序列精确等于 `draft-save→save→draft-clear`；保存中继续输入不发 clear、dirty 仍 true）。仍缺两条：**补发保存成功后要清**（HEAD 上会漏，本轮 B 场景第 7 行 FAIL，见 `repro-head.log`）；**保存并切文档后新文档草稿仍在**（B3 的风险路径）。
2. **历史证据被覆盖**：`scripts/draft-acceptance.mjs:9` 写死 `OUT = 'shots/round-08'`。每跑一次就覆盖 8 张历史截图；本机 `git status` 已有 10 张 `shots/round-*` 显示 `M`（`shots/round-08/t1-draft-restored.png` 等）。建议 `OUT` 接受 `--out` 参数，默认写 `.tmp/shots`。
3. **计数口径**：57/58 → 修好后 58/58；同时保留「失败即 exit 1」的行为。第 17 轮 `test.md` 的 FAIL 判定依赖这一条，别改脚本时把计数放宽。

## 同类回归

见 `docs/iteration/round-19/findings-bug.md` 写入时的实测（`.tmp/r19-bug/newfile.log`、`recent.log`、`hostsave.log`）。口径：快照 `08aaf88` + 工作树 `App.tsx` 候选修复，端口 5175，宿主段落因快照无 exe 走 SKIP/UNVERIFIED。

| 脚本 | 结果 | 说明 |
| :--- | :--- | :--- |
| `newfile-acceptance` | **16 PASS / 0 FAIL，6 条未跑** | `.tmp/r19-bug/newfile.log`：跑到「外部改名后不静默写旧/新名」后停住（9:48 起无新输出），不是 FAIL；剩余 6 条没执行到。 |
| `recent-acceptance` | **未跑** | 排在 newfile 之后，被中止。 |
| `host-save-acceptance` | **未跑** | 同上。 |

未完成的原因不是代码：`.tmp/r19-bug/head` 快照缺 `.tmp/host-a/Sidelight.exe`（宿主段会 SKIP），而 5173 dev server 在 09:55 前后断开，无法再对工作树重跑。newfile 的 16 条全过说明「新建/重命名/外部删除/外部改名」的保存路径没被草稿修复破坏；`recent` 的「保存并切换」恰是 B3 的风险路径，必须补测。

**下一轮补测（按序）**：`newfile` 全量 23/23 → `recent` 57/57（重点看保存并切最近项后旧/新文档的 draft 文件）→ `host-save` 64/64（宿主段必须真起 exe）→ `draft-acceptance` 58/58。

## 优化机会（≤3）

1. **每键两次全文序列化**（`src/App.tsx:735`、`746`）：dirty 判断用 `contentVersionRef` 代替全文比较，1 MB 下每键可省一次 1 MB 序列化。
2. **`draft-clear` 带文档键**（`2537`）：消掉 B3 的误清窗口，也省掉 1 s 的 await 兜底。
3. **`perf-longdoc.mjs` 加预算**：单键超时 + `--max-seconds`，1 MB 只量载入；现在 1 MB 跑到一半崩溃，脚本无法区分「慢」与「坏」。

## 环境异常（供根代理判断）

- 09:55 前后 `http://localhost:5173` 连接被拒（`ERR_CONNECTION_REFUSED`），dev server 进程消失。草稿修复已由 `ab7aaea`（09:47）提交，本轮验证与该提交一致。
- 为不碰 `src/`，验证改用 `.tmp/r19-bug/head`（`git archive 08aaf88` 快照）：先跑 HEAD 得 9/11（B1 复现），再把 `ab7aaea` 的 `App.tsx` 拷进快照跑 11/11（修复方向）。5173 断开前的第一次运行见 `.tmp/r19-bug/repro-current.log`（A 已通过，10/11；第 11 条是当时等待 900 ms 不够，加到 2000 ms 后 11/11）。
- 快照 5175 由我起的第二个 dev server（`node node_modules/vite/bin/vite.js --port 5175`，`node_modules` 用 junction 指向仓库），未影响 5173；报告写完后可删 `.tmp/r19-bug`。
- 若要复现我未完成的部分：先重启 5173（`node node_modules/vite/bin/vite.js`），再按「同类回归」的补测顺序跑。
