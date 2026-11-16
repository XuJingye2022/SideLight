# 第 29 轮 · 计划（revision 3）

- **revision 3**：plan-revision 代理按 `plan-review.md`（critic 复审，结论 REVISE）逐条修漏洞（2026-11-16 23:51）。任务结构 T1/T2/T3 不变，不改产品方向，只改数据源、字节账、测试手段与分工分支。本版新增实测脚本：`.tmp/measure-js-r29c/d/e/f/g/h/i.mjs`（JS）、`.tmp/measure-css-r29b.mjs`（CSS）。修订对照：

  | 审查项 | 本版怎么修 |
  | --- | --- |
  | P1-1 T2 的段/句数据源错（`doc.textContent` 段数恒 1） | 面板里 `const text = sourceText ?? editor?.getText() ?? ''`，**5 行全部用 `countText(text)` / `countSentences(text)` 现算**（Tiptap `getText` 默认 `blockSeparator='\n\n'`，`node_modules/@tiptap/core/dist/index.cjs:7079`）；`stats` prop 只给状态栏按钮，不再传给面板；e2e 期望值用同一口径（`\n\n` 分块 → 段 3），并写明「段」含标题行（标题是一个块）。首屏零增量（全在懒 chunk） |
  | P1-2 T2 的 110 B 预算不成立 | `Esc`/点击外部关闭搬进懒 chunk 的 `StatsDetail`（收 `onClose`；`mode` 变化不再关闭，数字跟随 `sourceText`），`StatusBar` 只留 `useState` + `button` + `lazy/Suspense`；删掉 `aria-controls`（只留 `aria-expanded`）。按实测重写：T2 首屏 **≤160 B**（按本版设计实测 159，`.tmp/measure-js-r29i.mjs`） |
  | P1-3 A2 原型包装测不到 await 窗口 | 改测试辅助 `.tmp/r29-fsa.mjs`（不是产品代码）：假 `getDirectoryHandle` 里读 `window.__fsDelayGetDir` 并 `await` 该毫秒数；e2e 打字后开延迟、立刻 `Ctrl+S`，断言草稿不存在且磁盘字节正确。一次延迟同时覆盖 `parentDirectory` 与 `writeCache` 内部（`ensureCacheDir` 两次 `getDirectoryHandle`）两段 await |
  | P2-1 `writeCache` 执行中的窗口 | `await writeCache(...)` 之后**再判一次** `stale()`（含代际）；变了就 `await removeCache(dir, 'draft', key)` 补偿（约 20 B，已计入 T1 实测） |
  | P2-2 `editor` prop 类型 | `StatusBar`/`StatsDetail` 都用 `editor: Editor \| null`；面板读选区前先判非空。类型擦除，首屏零增量 |
  | P2-3 单代理顺延分支没算账 | 第 1 节写死三条分支的字节账与工时：分支 1 = 先做 T3 的两步零交互抵消再 T1（余 175 B）；分支 2 = 只做 T1（余 62 B）；分支 3 = 分支 1 再接 T2（余 15 B）。T2 未接线不算完成 |

- **revision 2**（历史）：按上一版审查修 6 条漏洞。任务结构 T1/T2/T3 不变，只改实现方式、字节账与验收数字。修订对照：

  | 审查项 | 本版怎么修 |
  | --- | --- |
  | P0-1 首屏账不闭环 | `sentences` 移进懒 chunk（新建 `src/lib/sentenceStats.ts`，只由懒组件 import），`wordcount.ts`/`TextStats`/`wordcount.test.ts:33,34,66` 不动；T3 不加 `.outline-row`，改用 grid + 同级 toggle（比审查建议的「button 内放 span」多 1 个同级 `<button>`，理由见 T3 设计决定，新增样式实测 +35 B，仍在审查的 ≤40 B 内）；第 3 节改为「实测抵消 + 合并后一次总账 ≤286,000 B」，删除/搬移按实测 −76 B / −49 B 记账 |
  | P1-1 守卫漏在飞写入 | await 之后再判一次，并加 `draftGenerationRef` 代际比对；`finishSaved` 里 `+1`；e2e 断言 A 加慢速原型变体，做不到就 5 次重复并记 UNVERIFIED |
  | P1-2 面板定位/按钮外观 | 面板 `position: fixed; bottom: 28px; left: 12px` 写懒 CSS；`.status-count` 复位写首屏 `styles.css`，由 builder2 代加（+12 B 实测） |
  | P1-3 并行逐任务字节门不可判 | 删掉逐任务字节验收；唯一字节门 = 合并后一次测量；并行期间自测数字只作参考 |
  | P2-1 折叠后当前节消失 | 折叠祖先行加 `aria-current="location"` 与 `is-active`（纯函数 `visibleActiveId` + 单测 + e2e 断言），不再用绕开的时序 |
  | P2-2 验收命令/文档 5 处 | 源码模式传 `sourceMode ? countText(sourceText) : stats`；选区由懒组件打开时读；行数口径改「无选区 5 行 / 有选区 6 行」；gzip 路径改 `.tmp/build-a/assets/`；`README.md:76` 一并改 |

- 角色：planner（只读代码，未改产品文件）；revision 2 同样未改产品文件；revision 3 也只写 `.tmp/measure-*.mjs` 与本文件。实现归 builder/builder2（第 5 节）。
- 输入：`findings-bug.md`（5 条）、`findings-typora.md`（10 条建议 + 体积测算）、`findings-ship.md`（6 条）、`plan-review.md`、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`git log -8`（HEAD `853966d`）、相关源码
- 基线：0.32.1，17 个测试文件 248 条，首屏 gzip 285,783 B / 上限 286,000 B（余 **217 B**）
- 本轮**不发版**：不 bump `package.json`，CHANGELOG 新建 `## Unreleased`

## 0. 一句话结论

选 **3 个任务**：T1 数据安全（保存后草稿不再复活 + 超大文件提示说清「仍在哪一篇」），T2 字数点击明细，T3 大纲折叠。Mermaid 本轮只做方案判定（第 2 节），不实现。首屏只剩 217 B：T2 的句数统计、面板样式与全部关闭逻辑进懒 chunk；T3 用**实测抵消**（删 5 段死 CSS −76 B、把大纲段搬进懒 CSS −49 B），新增的大纲列样式改用行内 style（首屏 **0 B**，不再吃 +38 B）。合并后按第 3 节总账一次测量，上界 **285,985 B**，余 **15 B**；超线按第 3 节杠杆顺序削，仍超线就停止上报，不自行抬线。

## 1. 排序依据（数据安全 > 用户可见 > 安装/体积/性能 > 内部质量）

| 序 | 任务 | 级别 | 类别 | 估时 |
| --- | --- | --- | --- | --- |
| T1 | 保存后不再写陈旧草稿；超大文件被拒时说清仍停留在哪一篇 | P2→按数据风险升为 P1 处理 | 数据安全 | 15 min（含实测守卫字节） |
| T2 | 状态栏字数点击弹出明细（字符/词/句/段/阅读时间/选区） | P1 | 用户可见（产品负责人点名） | 16 min |
| T3 | 大纲折叠（父子树 + 折叠后仍能定位当前节） | P1 | 用户可见（产品负责人点名） | 12 min |
| — | README / CHANGELOG / 报告收尾 | — | 交接 | 4 min |

一个执行代理顺序做完约 47 min，超出 35 min 预算；**并行**按第 5 节拆给 builder 与 builder2（墙钟 ≈25 min）。只有一个执行代理时按下面的分支走，字节账写死，不留估算：

| 分支 | 做什么 | 首屏账（实测基线 285,783） | 余量 | 工时 |
| --- | --- | --- | --- | --- |
| 单代理·分支 1（推荐） | 先做 T3 的两步**零交互抵消**：删 5 段死 CSS（−76）、把 `.outline*` 四段搬进懒 `outline.css`（−49）、加 `.status-count`（+12，约 4 min）；再做 T1（≤155） | ≤ 285,783 −76 −49 +12 +155 = **285,825** | 175 B | 约 20 min |
| 单代理·分支 2（最保守） | 只做 T1（≤155），T3 的两步也不做 | 285,783 + 155 = **285,938** | 62 B | 约 15 min |
| 单代理·分支 3（有余力） | 分支 1 之后再做 T2（≤160） | ≤ 285,985 | 15 B | 约 35 min |

- 三条分支都**不**顺延 T1：T1 是数据损失路径，任何情况下本轮必做。
- T2 只写 `StatsDetail.tsx` 而没接 `StatusBar` 不算完成（用户看不见），也不该在分支 1/2 里做一半。
- 分支 1 里「搬大纲样式」与「加 `.status-count`」是 T3 的文件范围，但**不依赖折叠交互**，先做不冲突；折叠交互仍归 builder2/下一轮。

## 2. 产品负责人点名的三项：本轮怎么处理

- **字数点击明细** → 做（T2）。
- **大纲折叠** → 做（T3）。
- **Mermaid 渲染（懒加载）** → **本轮不做，也不硬上**。依据 `findings-typora.md` §4：首屏余量 217 B，用 `import('mermaid')` 拆 chunk 后首屏确实不涨（与 ADR-0012 同构），但安装包硬线 850,000 B 与当前 setup 824,209 B 之间只剩 **25,791 B**，而 mermaid tree-shaken 后的 chunk gzip **从未测出**（该侦察的 `npm pack` 被沙箱拒写、jsdelivr 直连失败，`findings-typora.md:223` 记 UNVERIFIED）。在「体积未知 + 安装包余量 25.8 KB」的前提下实现 Mermaid，等于用未验数据赌硬线，违反「先量后做」。
- 下一轮做 Mermaid 的入口条件（写进 STATE 待办）：先按 `findings-typora.md:216-221` 在 `.tmp/` 起一次性 Vite 工程只注册 flowchart+sequence，量出 chunk raw/gzip；chunk gzip ≤60,000 B 才进默认包，60,000–120,000 B 只做可选组件，>120,000 B 不做；抬硬线属对外承诺变化，必须回产品负责人（`AGENTS.md:15`）。

## 3. 首屏字节预算：本轮最大的技术约束（先读再动手）

**基线（实测 2026-11-16）**：`node scripts/measure-first-screen.mjs` → `total raw=929536 gzip=285783 files=2 max=285000` → **FAIL**。原因：脚本默认线还是 285000（`scripts/measure-first-screen.mjs:2,15`），CI 靠 `.github/workflows/ci.yml:39` 的 `--max 286000` 才绿。本版 T1 子项 3 把默认值改成 286,000，改完这条命令才代表真实预算。口径：首屏 = `index.html` 里 `<script src>` + `stylesheet`/`modulepreload`/`preload` 引用的文件，按 gzip 求和（`scripts/measure-first-screen.mjs:1-2,27-52`）。

**谁在首屏、谁不在**

- 在首屏：`src/App.tsx`、`src/components/StatusBar.tsx`、`src/lib/wordcount.ts`、`src/lib/cache.ts`、`src/styles.css`（CSS 33,995 raw / 7,071 gzip）。
- 不在首屏：`src/components/Outline.tsx`（`App.tsx:31-32` 命名导出 + `:4520-4532` `Suspense` 懒加载，8 个懒 chunk 之一）、`src/components/FindBar.tsx`、KaTeX（ADR-0012）、本轮新建的 `StatsDetail.tsx` 与 `sentenceStats.ts`。

**本版实测的抵消项与新增项**

- CSS：在真实产物 `dist/assets/index-LEt1G9qz.css`（33,995 raw / 7,071 gzip）上逐规则删除/追加后重算 gzip，脚本 `.tmp/measure-css-r29.mjs`（revision 2）与 `.tmp/measure-css-r29b.mjs`（revision 3 复核）。
- JS：把等价的最小化代码追加到真实 entry JS（`dist/assets/index-B3_OF1Ta.js`，gzip 278,712）后重算 gzip，脚本 `.tmp/measure-js-r29c/d/e/f/g/h/i.mjs`。这是**粗估上界**：追加位置在文件尾，实际在上下文里通常更省，但不能假设。

| 改动 | raw 变化 | gzip 变化 | 证据 |
| --- | --- | --- | --- |
| 删 `.sr-only` / `.popover-title` / `.popover-note` / `.popover-actions` / `.dialog-input,` 选择器项 | −386 B | **−76 B** | `node .tmp/measure-css-r29b.mjs`（逐块：−72 B + −4 B；5 段合计复核 −76 B） |
| `.outline-item` / `:hover` / `.is-active` / `.outline-empty` 搬进 `src/components/outline.css`（随 Outline 懒 chunk 加载） | −469 B | **−49 B** | 同上（审查写 −53 B 是源码级；dist 实测 −49 B） |
| 新增大纲两列样式：**改用行内 style**（`style={{display:'grid',gridTemplateColumns:'14px minmax(0,1fr)'}}` 与 toggle 的 `style={{width:14,padding:0,border:0,background:'none'}}`），写在懒 chunk 的 JSX 里 | 0（首屏） | **0 B** | 不再追加到 CSS。若实现仍写成 CSS 规则并在首屏出现，按实测 +38 B 计入（`.tmp/measure-css-r29b.mjs`：全量 +38、去 `font-size` +35），总账变 **286,023** → 必须改用行内 style 或按杠杆削 |
| 新增 `.status-count{padding:0;border:0;color:inherit}`（首屏 `styles.css`，T2 需要；全局 `button` 规则给 `padding:5px 10px`/`font-size:12.5px`，见 `src/styles.css:125-135`） | +47 B | **+12 B** | `.tmp/measure-css-r29b.mjs`（`font:inherit` 写法则 +14、`font-size:12px` +15；选最省的 3 属性版本） |
| T3 首屏净额 | — | **−125 B** | −76 − 49 + 0 |

**总账（合并后一次测量，唯一字节门）**

| 项 | 首屏 gzip | 依据 |
| --- | --- | --- |
| 基线 | 285,783 | `node scripts/measure-first-screen.mjs`（实测） |
| 死 CSS 5 段 | **−76** | 实测（dist CSS） |
| 大纲四段搬进懒 CSS | **−49** | 实测（dist CSS） |
| 新增大纲列样式（行内 style） | **0** | 懒 chunk 内，见上表 |
| `.status-count` 复位（首屏 CSS） | **+12** | 实测 |
| T2 首屏 JS（`useState` + `button` + `lazy`/`Suspense` + 2 个 prop + 面板 3 个 prop + react 导入） | **≤ +160** | 按本版设计实测 **+159**（`.tmp/measure-js-r29i.mjs`：`import{lazy,Suspense,useState}` + state + button + panel + lazy；已去掉 `aria-controls` 与 `stats`/`mode` prop） |
| T1 首屏 JS（守卫 + `finishSaved` + 共享提示助手） | **≤ +155** | 实测粗估：守卫 `stale()` 含代际 + 三处判断 + 写后补偿 + `finishSaved` = +119（`.tmp/measure-js-r29f.mjs`）；提示改写净额 +35 上下（`.tmp/measure-js-r29h.mjs` 片段 +97，扣掉被删的旧提示；改成短句式 −9） |
| **合计上界** | **≤ 285,985** | 上限 286,000，**余 15 B** |

- 验收命令（根代理合并后串行，只此一次）：`npx tsc --noEmit` → `npx vite build --outDir .tmp/build-a` → `node scripts/measure-first-screen.mjs --dir .tmp/build-a`，要求 `gzip ≤ 286000`。**不做逐任务字节验收**：并行时两人读同一棵 `src/`，`npx vite build` 只会把对方半成品算进来（审查 P1-3）。builder 自测的数字只写进 `impl.md` 供参考。
- 合并后额外核对一项：首屏 CSS（`.tmp/build-a/assets/index-*.css`）里**不应出现** `.outline-item` / `.outline-toggle`。出现就说明样式没走懒 CSS 或又被写成规则，按 +49/+38 B 重新记账。
- 超线时按顺序执行，每步都实测再决定下一步：
  1. T1 提示改短句式：`「X」超过 5.5 MiB，仍在「Y」`（实测片段 −9 B，再省掉一处插值约 −10 B）；
  2. `.status-count` 复位删掉、外观改用状态栏既有 `.status-chip-quiet` 胶囊（−12 B；视觉变化要在报告里写清）；
  3. 再核一遍第 3 节 CSS 账，确认新增大纲规则没漏进首屏（应为 0）；
  4. 仍超线 → **停止并上报根代理与产品负责人**，不抬线、不砍已验收功能。注意：T3 的死 CSS/搬移是收益项，不要用「顺延 T3」来处理超线。
- 明细面板的文案与属性**不再是杠杆**（已在懒 chunk，首屏 0 B）；revision 2 那条「压缩明细面板文案（估 −20 B）」作废。
- 新增懒加载资源的 gzip 必须写进 README「依赖与体积」段与 CHANGELOG（硬约束，本轮 T2 触发 `StatsDetail-*.js`；T3 的 `outline-*.css` 由搬移产生，也记）。

## 4. 任务

### T1 保存后不再写陈旧草稿；超大文件被拒时说清「仍在哪一篇」

**为什么（两条都是数据风险，不只是文案）**

1. `findings-bug.md:11-28`：保存成功后仍会落一份草稿，且草稿走另一条序列化路径，内容与已保存文件不一致（表格被重排）。下次打开会提示「有未保存的草稿」，用户若选恢复，就把已保存的新文件覆盖成旧结构——这是数据损失路径，不是提示瑕疵。
2. `findings-bug.md:68-77`：从文件树点开 >5.5 MiB 的文件，只弹「文件太大」，正文保留上一篇，用户会以为窗口里是刚点的大文件，按 `Ctrl+S` 写到上一篇。`README.md:76` 写「并清空正文」，实现不清空。

**根因（已读代码确认）**

- `src/App.tsx:845-857`：`deriveTimer`（300 ms）回调里再排一个 800 ms 草稿定时器；回调先 `await parentDirectory(space, file.path)`（`:848`），**之后**才 `writeCache`（`:851`），写入前不检查文档是否已经保存。`src/App.tsx:2506-2511` 的 `finishSaved` 只删草稿文件、**没有** `clearTimeout(draftTimerRef.current)`，也没有推进代际，保存后 `onUpdate` 还能重新排一次 → 保存后约 1.1 s 草稿复活。
- `src/App.tsx:2110-2120`：`openWorkspaceFile` 的 `catch` 只 `setNotice(messageOf(error))`；尺寸错误来自 `src/lib/workspace.ts:249-251`（`blob.size > MAX_DOC_BYTES` 抛错）。此时 `activeFile`/`docName` 仍是上一篇，提示里却不说。

**改动文件与函数**

| 文件 | 位置 | 改什么 |
| --- | --- | --- |
| `src/App.tsx` | `:845-857` | 800 ms 回调里：`const targetPath = file.path`、`const generation = draftGenerationRef.current`，定义局部 `stale = () => !dirtyRef.current \|\| fileRef.current?.path !== targetPath \|\| deletingRef.current \|\| generation !== draftGenerationRef.current`；**`await parentDirectory` 之前判一次**、**之后判一次**、**`await writeCache` 之后再判一次**——最后一次为真时 `await removeCache(dir, 'draft', key)` 补偿（审查 P2-1：`cache.ts:119-143` 的 `ensureCacheDir`/`getFileHandle`/`createWritable` 还有 3 段 await，保存可能就落在这段）。不新增 `cache.ts` 导出、不新增单测文件：逻辑由 e2e 断言 A/A2 覆盖 |
| `src/App.tsx` | `:2506-2511` | `finishSaved` 里删草稿前先 `if (draftTimerRef.current) { clearTimeout(draftTimerRef.current); draftTimerRef.current = null }`，再 `draftGenerationRef.current += 1`（与宿主草稿 `:2951` 同一套 pattern） |
| `src/App.tsx` | `:2091-2108` | 新增模块级小助手 `const tooLargeNote = (name: string) => \`「${name}」太大（上限 5.5 MiB），仍在「${docNameRef.current}」\``，`openSingleFile` 的 `'tooLarge'` 分支改成 `setNotice({ text: tooLargeNote(picked.name), kind: 'error' })`。**必须共用这一个助手**：两处调用同一字符串比各写一遍省 gzip（`.tmp/measure-js-r29h.mjs`：助手 + 两处调用片段 +97 B；dist 里旧提示是模板字符串，扣减未精确量出，故 T1 上界按「实测 119 + 提示净额约 35」计）；当前文档名恒存在（默认 `未命名.md`），不需要退化分支 |
| `src/App.tsx` | `:2110-2120` | `openWorkspaceFile` 的 `catch`：`error instanceof Error && error.message.includes('文件太大')` 时用同一个 `tooLargeNote(file.name)`，其他错误维持 `messageOf(error)` |

**实施步骤**

1. 改 `App.tsx` 草稿守卫（三处判断 + 代际 + 写后补偿）与 `finishSaved`（清计时器 + 推进代际）。
2. 加 `tooLargeNote` 助手，改两处超大文件提示（只改提示文案，不改载入语义、不清空正文）。
3. 复跑 e2e 复现脚本（见验收）。
4. 子项 3（门禁正确性，5 分钟，随 T1 做）：`scripts/measure-first-screen.mjs:2,15` 默认 `--max` 改 `286000`；`.github/workflows/ci.yml:39`（现为 `node scripts/measure-first-screen.mjs --max 286000`）去掉 `--max 286000`（预算只剩脚本默认值一处）；`docs/adr/0012-katex-lazy-loading.md:43` 的判据行改成 286,000（`:44-45` 是当时的历史结论，**不改**，避免篡改记录）。验收：`node scripts/measure-first-screen.mjs` 无参数 → `PASS` 且输出 `max=286000`。
5. 子项 4（文档与文案，随 T1 做）：`README.md:51` 改成「`Ctrl + =` 放大、`Ctrl + -` 缩小、`Ctrl + Alt + 0` 复位（`Ctrl + 0` 是正文样式）」，与 `src/App.tsx:3396`、`:3566-3569` 一致；`README.md:76` 改成「超过上限显示…，**保留上一篇正文**，提示里写清仍在哪一篇」（原文「并清空正文」与实现不符）；`src/components/FindBar.tsx:56` 改成 `{query.trim() === '' ? '' : total === 0 ? '无结果' : …}`。

**验收标准（可执行）**

- `npx tsc --noEmit` → exit 0。
- `npm test` → 17 个文件、**248** 条（T1 不加测试），fail 0。
- e2e 脚本 `.tmp/e2e-r29-t1.mjs`（连 CDP `http://127.0.0.1:<builder 端口>`，连接方式抄 `scripts/acceptance.mjs`，假工作区复用 `.tmp/r29-fsa.mjs`；结尾必须 `await browser.close(); process.exit(0)`）：
  - 断言 A（主）：打开 `甲.md` → 末尾打字 → `Ctrl+S` → 等 1600 ms → `.sidelight/drafts/甲.md` **不存在**；磁盘 `甲.md` 内容 == 编辑器正文。**连续跑 3 次**。
  - 断言 A2（在飞窗口；覆盖审查 P1-1、P2-1，改测试辅助而不改产品代码）：先改 `.tmp/r29-fsa.mjs` 的假 `getDirectoryHandle`（`:115-122`）为
    `async getDirectoryHandle(child, options = {}) { const d = window.__fsDelayGetDir; if (d) await new Promise((r) => setTimeout(r, d)); … }`（文件头注释写明「只用于 e2e」）。
    两个子场景：
    1. **`parentDirectory` 窗口**：打开 `甲.md` → 打字 → `page.evaluate(() => { window.__fsDelayGetDir = 900 })` → 立刻 `Ctrl+S` → 等 2500 ms → 草稿不存在、磁盘字节正确。
    2. **`writeCache` 内部窗口**：同上，但打字后等 1150 ms（800 ms 草稿定时器已开始、正在 `ensureCacheDir` 的两段 await 里）再开延迟并 `Ctrl+S`，等 **6000 ms**（草稿写盘要 2 段延迟，补偿里的 `removeCache` 再要 2 段）→ 草稿不存在、磁盘字节正确。
    失败时打出 `window.__fsState.files` 里 `.sidelight/drafts/*` 的最终键集合，便于判断是没写还是写了没删。
  - 断言 B：假工作区写入 6 MiB `大.md` → 刷新树 → 点开 → 断言 `notice` 文本含「仍在」与当前文档名；`.ProseMirror` 内文与 `<title>` 都还是上一篇。
  - 输出写 `.tmp/e2e-r29-t1.json`，控制台 error 必须为 0。
- 子项 3 验收：`node scripts/measure-first-screen.mjs` 无参数 → `PASS` 且 `max=286000`；`git grep -n "measure --max 285000" -- docs/adr scripts .github` 应 0 命中。
- 子项 4 验收：e2e 断言 `Ctrl+F` 刚打开时 `.find-count` 文本为空；`README.md` 里不存在「`Ctrl + 0` 复位」与「并清空正文」字样。

**门禁**

`npx tsc --noEmit`；`npm test`；合并后首屏总账（第 3 节）。不改 markdown 序列化 → **不跑** `npm run roundtrip`。

**风险**

- 守卫的边界：只在 `dirty=false` 或代际变化时跳过，未保存内容一定 `dirty=true`（`src/App.tsx:806-809`）；保存失败时 `dirty` 保持 true，仍会写草稿。
- 去掉 `cache.ts` 纯函数与单测是**字节余量下的取舍**：守卫是一个 4 条件闭包，行为由 e2e 断言 A/A2 覆盖（A2 特意造出两段 await 窗口）；报告里写明。
- `draftGenerationRef` 同时服务宿主草稿（`:2927,2951,3339`）：`finishSaved` 推进代际后，宿主草稿的 pending 回包（`:3339`）会因代际不同不再清空 `draftPendingRef`。已核对该 pending 只用于等待回包，下一次 `scheduleHostDraft` 会覆盖，不丢数据；实现后跑一次宿主草稿相关断言（若有）并在报告记录。
- 草稿内容与磁盘字节不同（表格重排）属另一个既有问题（第 21/22 轮 D2/D5 已报），本轮不修，只在报告写清。
- 首屏增量上界 **155 B**（第 3 节实测口径：守卫+`finishSaved` 119 + 提示净额约 35）。若实现后超过 155 B：先按杠杆 1 把提示换成 `「X」超过 5.5 MiB，仍在「Y」`，再量；不要把守卫的某处判断删掉来凑字节。
- 写后补偿会多一次 `removeCache` 调用：在真实工作区里它只命中「恰好保存完成」的竞态，正常路径上 `stale()` 为假不会执行；e2e A2 的第二个子场景专门验这条路径。
- `.tmp/r29-fsa.mjs` 的延迟开关只存在于 e2e 辅助（不进 `src/`，也不进打包）；`git status` 里它会出现在 `.tmp/`，属预期。

**截图**：无界面变化，不截图；证据是 `.tmp/e2e-r29-t1.json` 与 `npm test` 输出。

---

### T2 状态栏字数点击弹出明细（字符 / 词 / 句 / 段 / 阅读时间 / 选区）

**为什么**：`findings-typora.md:38-52`（P1）。状态栏现在只有一个不可点的 `span`（`src/components/StatusBar.tsx:32-34`），点它没有任何反应；数据侧 `src/lib/wordcount.ts:47-57` 已有 `cjk`/`words`/`chars`/`paragraphs`/`minutes`，缺句数与选区计数。Typora 状态栏随选区显示「9 / 195 词」。产品负责人点名。

**设计决定（首屏字节是硬约束）**

- `src/lib/wordcount.ts`、`TextStats`、`wordcount.test.ts:33,34,66` **都不动**（审查 P0-1 修法 1）。
- 句数统计单独放 `src/lib/sentenceStats.ts`，**只由懒组件 `StatsDetail.tsx` import**，因此不进首屏。测试 3 条追加在 `wordcount.test.ts` 末尾（`import { countSentences } from './sentenceStats.ts'`），这样 `npm test` 仍是 17 个文件，不必改 `package.json`。
- **数字的来源必须与状态栏一致，但不能用 `doc.textContent`**（审查 P1-1）：`src/App.tsx:815` 的 `countText(current.state.doc.textContent)` 里，ProseMirror 的 `Node.textContent = textBetween(0, content.size, "")` 块间**没有换行**，`wordcount.ts:54` 按 `\r?\n` 切段 → 多段文档会显示「段 1」，`countSentences` 也会跨段并句。面板里统一用 `const text = sourceText ?? editor?.getText() ?? ''`（Tiptap `getText` 默认 `blockSeparator='\n\n'`，`node_modules/@tiptap/core/dist/index.cjs:7079` 已核），**5 个数字全部由 `countText(text)` / `countSentences(text)` 现算**；`stats` prop 只给状态栏按钮用，不传进面板。首屏零增量（全在懒 chunk）。
- 口径（e2e 期望值按这个写）：「段」= `countText` 的 `paragraphs`，按 `\r?\n` 切并过滤空行；`getText()` 用 `\n\n` 分块，所以**一个块算一段，标题行也是一个块、算一段**；「句」= `countSentences(text)`，按 `。！？!?；;…` 与换行切（`\n\n` 会把块隔开，不会并句）。
- 选区统计不放在 `App.tsx`（省首屏字节）：`StatsDetail` 挂载时用 `useState` 初始化器读一次 `editor.state.selection`，显示「打开那一刻」的选区；`text` 每次渲染现算，所以切源码模式后数字跟着变，**不需要** `mode` prop 或「mode 变化关闭」监听。
- 源码模式：`App.tsx:4721` 已传 `stats={sourceMode ? countText(sourceText) : stats}`；面板另收 `sourceText`（源码模式为字符串，否则 `null`），用 `sourceText ?? editor?.getText()`，口径与状态栏一致。
- `Esc`、点击外部关闭放在**懒 chunk** 里（审查 P1-2）：`StatusBar` 只留 `useState` + `button` + `lazy/Suspense`。面板的点击外部监听要忽略 `.status-bar` 内的点击，否则「点按钮关闭」会先关再开。`aria-expanded` 保留，**去掉 `aria-controls`**（省约 10 B；面板仍有 `id`）。

**改动文件与函数**

| 文件 | 位置 | 改什么 |
| --- | --- | --- |
| `src/lib/sentenceStats.ts` | 新建 | `export function countSentences(text: string): number`：按「`。！？!?；;…` + 换行」切句，过滤空白段；注释一行写清口径 |
| `src/lib/wordcount.test.ts` | 文件末尾 | 追加 3 条：句数（中英混排 + 省略号）、空串句数 0、用选区子串 `countText` 得到子串统计（3 条里至少 1 条覆盖 `countSentences`）；只 import `sentenceStats.ts`，不改既有 3 条 |
| `src/components/StatsDetail.tsx` | 新建 | 懒加载面板：`<dl className="stats-detail" id="stats-detail">`，**5 行固定口径**：字符 = `chars`、词 = `cjk + words`（与状态栏字数同口径）、句 = `countSentences(text)`、段 = `paragraphs`、阅读时间 = `minutes`；有选区时追加「选区内」一行（= 选中串的 `cjk + words`）。props `{ editor: Editor \| null; sourceText: string \| null; onClose: () => void }`（`import type { Editor } from '@tiptap/react'`，类型擦除）；`const text = sourceText ?? editor?.getText() ?? ''`，`const base = countText(text)`；选区快照 `useState(() => { const sel = editor?.state.selection; return sel && sel.from !== sel.to ? editor.state.doc.textBetween(sel.from, sel.to, '\n') : null })`；`useEffect` 里挂 `keydown`（Esc → `onClose`）与 `pointerdown`（目标不在 `.stats-detail` 也不在 `.status-bar` 内 → `onClose`），卸载时移除；`import './statsDetail.css'` |
| `src/components/statsDetail.css` | 新建 | 约 20 行：`position: fixed; bottom: 28px; left: 12px`（`.status-bar` 无 `position`，不能依赖祖先，见审查 P1-2）、`z-index` 高于状态栏、与 `--paper-raised`/`--line`/`--ink-faint` 一致、窄屏不溢出 |
| `src/components/StatusBar.tsx` | `:1`、`:32-34` | 新 props `editor: Editor \| null`、`sourceText: string \| null`；`import { lazy, Suspense, useState } from 'react'`；`const [open, setOpen] = useState(false)`；字数那句 `{formatStats(stats)}` 换成 `<button type="button" className="status-count" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{formatStats(stats)}</button>`，紧跟 `{open && <Suspense fallback={null}><StatsDetail editor={editor} sourceText={sourceText} onClose={() => setOpen(false)} /></Suspense>}`；`const StatsDetail = lazy(() => import('./StatsDetail.tsx').then((m) => ({ default: m.StatsDetail })))`（写法与 `src/App.tsx:31-32` 一致）。**StatusBar 里不放任何 `useEffect`** |
| `src/App.tsx` | `:4720-4753` | `StatusBar` 只加 2 个 prop：`editor={editor}`、`sourceText={sourceMode ? sourceText : null}`（`editor` 是 `Editor \| null`，`App.tsx:708` 原样传）；**不加** `selectionStats` state，不改 `onSelectionUpdate`/`syncDocInfo` |

**实施步骤**

1. 写 `sentenceStats.ts` + 3 条断言，单跑 `node --experimental-strip-types src/lib/wordcount.test.ts`。
2. 写 `StatsDetail.tsx` + `statsDetail.css`（先做静态结构：`text` 用 `getText()`，5 行 + 选区行）。
3. 改 `StatusBar.tsx`（`useState` + `button` + `lazy/Suspense`，无 `useEffect`），再改 `App.tsx` 两个 prop。
4. 构建量首屏（自测，只作参考）→ 量新 chunk 的 gzip → 把数字写进 `impl.md`。
5. e2e 与截图。

**验收标准**

- `npx tsc --noEmit` exit 0；`npm test` 17 个文件、**251** 条（248 + 3），fail 0。
- e2e `.tmp/e2e-r29-stats.mjs`（CDP 9224，复用 `.tmp/r29-fsa.mjs`；结尾 `await browser.close(); process.exit(0)`）：
  - 先在源码模式写 `第一段。第二段！\n\n第三段 ABC。`（两处 `\n\n` 分块），切回富文本；期望值在 Node 侧用同一口径算：`import { countText } from '../src/lib/wordcount.ts'` 与 `countSentences`（脚本用 `node --experimental-strip-types` 跑），**不要手写数字**；
  - 点 `.status-count` → `#stats-detail` 出现，**无选区 5 行**（字符/词/句/段/阅读时间），逐行等于 `countText('第一段。第二段！\n\n第三段 ABC。')`（字符 `chars`、词 `cjk + words`、句 `countSentences(同一串)`、段 `paragraphs`、阅读时间 `minutes`）；**「段」= 3**（覆盖审查 P1-1 的回归点；`doc.textContent` 口径会得到 1，必须红）；
  - `aria-expanded` 从 `false` 变 `true`；`Escape` 后元素移除且 `aria-expanded="false"`；再点开、点正文空白处 → 面板关闭（点击外部）；点面板内部不关闭；
  - 选中一段（键盘 `Home`/`Shift+End` 或 `page.evaluate` 设选区）后重开面板 → **6 行**，出现「选区内」行且数字 = 选中串 `countText` 的 `cjk + words`；取消选区后重开 → 该行消失；
  - 源码模式（`Ctrl+/`）下点开面板，数字等于 `countText(sourceText)`（切模式后面板不关，数字跟着变——这是本版设计，不是 bug）；
  - 控制台 error 0；截图见下。
- 体积：新 chunk 用 `node -e "const z=require('node:zlib'),f=require('node:fs');for(const p of process.argv.slice(1))console.log(p,z.gzipSync(f.readFileSync(p),{level:9}).length)" .tmp/build-a/assets/StatsDetail-*.js .tmp/build-a/assets/StatsDetail-*.css` 量出（路径是 `.tmp/build-a/`，不是 `dist/`，见审查 P2-2.4；没有独立 CSS 文件时只报 JS），写进 `README.md:96` 段与 `docs/CHANGELOG.md` 的 `## Unreleased`。
- 文档：`README.md:37`（状态栏）补「点字数看明细（字符/词/句/段/阅读时间/选区）」；`:51` 附近不新增键位（点击触发，不加快捷键）。

**门禁**：`npx tsc --noEmit`、`npm test`、合并后首屏总账。不改序列化 → 不跑 roundtrip。

**风险**

- 首屏增量上界 **160 B**（按本版设计实测 159，`.tmp/measure-js-r29i.mjs`；`.status-count` 复位 +12 B 按第 3 节单独记）：`useState` + 按钮 + `lazy/Suspense` + react 具名导入 + 首屏 2 个 prop 是全部新增，`Esc`/点击外部/选区读取/明细文案都不在首屏。超了按第 3 节杠杆削。
- 面板数字在渲染时现算 `getText()`：打开期间继续打字会跟着变（选区数字不变）。这是本版取舍，报告写清；要改成挂载时快照会牺牲「切模式后数字正确」，**先按本版做，不提前优化**。
- 懒 chunk 首次点击才有内容，离线时加载失败：`Suspense fallback={null}` 会保持空白；不引入新依赖，只做静默失败，报告记 UNVERIFIED（离线首点）。
- 状态栏新增一个可聚焦控件：只加一个停靠点，Enter/Space 触发，Esc 关闭，`aria-expanded` 齐（无 `aria-controls`，面板仍有 `id`，读屏仍能到达）；不引入焦点陷阱。
- 点击外部的监听在懒 chunk 里挂 `document`：`pointerdown` 先于按钮 `click`，所以判断要排除 `.status-bar`，否则「点按钮关闭」失效；e2e 专门断言「点面板内部不关、点正文关闭」。

**需要的截图**：`shots/round-29/stats-detail.png`（无选区，5 行）、`shots/round-29/stats-detail-selection.png`（有选区，6 行）。截图命令：`node scripts/shot.mjs http://localhost:5175 --out shots/round-29/<名字>.png`，或 e2e 内 `page.screenshot({ path })`。

---

### T3 大纲折叠（父子树 + 折叠后仍能定位当前节）

**为什么**：`findings-typora.md:54-68`（P1）。`src/lib/outline.ts:18-32` 只给扁平数组，`src/components/Outline.tsx:25-38` 逐条渲染，层级只靠 `paddingLeft`；三级标题的长文里大纲比正文还长，一屏看不到结构。Typora 大纲可折叠。产品负责人点名。

**设计决定（不加行容器，字节可测）**

- 不加 `.outline-row` 包裹（审查 P0-1 修法 3）。列表容器用两列 grid（**行内 style**，`display:grid; grid-template-columns:14px minmax(0,1fr)`）；每行渲染两个**同级**元素——折叠按钮（有子级时）或占位 `<span aria-hidden="true" style={{width:14}} />`，加上原有 `button.outline-item`。这样不加 wrapper、不嵌套交互元素（`<button>` 里不能再放可聚焦控件），键盘可达，`text-overflow: ellipsis` 也不需要重写。
- 折叠后仍能定位当前节（审查 P2-1）：若 `activeId` 因祖先折叠不可见，给**最外层被折叠的祖先**行加 `is-active` 与 `aria-current="location"`（纯函数 `visibleActiveId` 算，懒 chunk 内，零首屏成本）。
- 大纲样式整段搬进懒 CSS `src/components/outline.css`（实测 −49 B）；**新增的两列布局与 toggle 重置不再写成 CSS 规则**（那会再吃 +38 B 首屏），改成 JSX 里的行内 style（在懒 chunk 内，首屏 0 B）。

**改动文件与函数**

| 文件 | 位置 | 改什么 |
| --- | --- | --- |
| `src/lib/outline.ts` | 追加导出 | `export type OutlineNode = OutlineItem & { parentId: string \| null; hasChildren: boolean }`；`buildOutlineTree(items): OutlineNode[]` 用 level 单调栈补 `parentId`/`hasChildren`；`expandAncestors(collapsed: Set<string>, nodes, activeId): Set<string>` 返回删掉 activeId 全部祖先的新集合；`visibleActiveId(nodes, collapsed, activeId): string \| null`（可见则原样返回，否则返回最外层被折叠祖先的 id）。`extractOutline` 与 `activeOutlineId` **不改**（既有 8 条断言不动） |
| `src/lib/outline.test.ts` | 文件末尾 | 补 3 条：树结构（H1>H2>H3，父子与 `hasChildren`，跳级 H1→H3 的 parent 归 H1）；`expandAncestors` 在「H2 折叠、activeId 是 H3」时清掉 H2；`visibleActiveId` 在同样情形返回 H2 |
| `src/components/Outline.tsx` | 渲染部分重写 | `useMemo(() => buildOutlineTree(items), [items])`；`useState<Set<string>>(new Set())` 折叠集合；`useEffect` 在 `activeId` 变化时 `setCollapsed((prev) => expandAncestors(prev, nodes, activeId))`；只渲染可见行；外层 `<div style={{ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr)' }}>`（**行内 style，不新增 CSS 规则**），每行先渲染 toggle（`<button type="button" className="outline-toggle" style={{ width: 14, padding: 0, border: 0, background: 'none', color: 'inherit' }} aria-expanded={!collapsed.has(id)} aria-label={\`折叠/展开「${title}」\`}>`，文字 `▸`/`▾`）或 `<span aria-hidden="true" style={{ width: 14 }} />` 占位，再渲染原 `button.outline-item`（class 名、`aria-current`、`title`、`onJump` 全部保留）；`aria-current` 用 `visibleActiveId` 的结果。`className="outline-toggle"` 只给 e2e 选择器与可读性用，**不写对应 CSS 规则**（样式全在行内） |
| `src/components/outline.css` | 新建 | 只从 `src/styles.css:1386-1417` 搬 `.outline-item` / `:hover` / `.is-active` / `.outline-empty` 四段（原样），**不加新规则**（新规则走行内 style）；由 `Outline.tsx` `import './outline.css'` |
| `src/styles.css` | `:171-182`、`:1922`、`:2245-2263` | 删 5 段 0 引用规则（第 3 节清单，实测 −76 B）：`.sr-only`、`.popover-title`、`.popover-note`、`.popover-actions`、`.dialog-input,` 选择器项（保留 `.dialog-textarea`）；另**代 T2 加** `.status-count{padding:0;border:0;color:inherit}`（+12 B） |

**实施步骤**

1. 写 `outline.ts` 三个纯函数 + `outline.test.ts` 3 条，单跑 `node --experimental-strip-types src/lib/outline.test.ts`。
2. 先 `git grep -n` 复核 5 段死 CSS 0 引用，再删；加 `.status-count` 复位（本步先行，供 builder 的 T2 用）。
3. 把大纲四段样式搬到 `outline.css`，`Outline.tsx` 里的两列布局与 toggle 用行内 style，改渲染。
4. e2e + 截图；构建量首屏（自测，只作参考）。

**验收标准**

- `npx tsc --noEmit` exit 0；`npm test` 17 个文件、**254** 条（251 + 3），fail 0。
- e2e `.tmp/e2e-r29-outline.mjs`：源码模式写入 `# 一` / `## 一甲` / `### 一甲子` / `## 一乙` / `# 二` → 切富文本 → 打开大纲（`Ctrl+Shift+1`）：
  - `.outline-toggle[aria-expanded]` 数量 = 2（「一」「一甲」有子级），`aria-expanded` 全为 `true`；
  - **P2-1 专项（合并第 2、3 步）**：先把光标放进「一甲子」正文（activeId = 子行）→ 点「一」的 toggle → 可见 `.outline-item` 从 5 变 2（「一」「二」），该 toggle `aria-expanded="false"`，且「一」行带 `aria-current="location"` 与 `is-active`（当前节不可见时高亮折叠祖先）；再把光标移到「二」→「一」行的 `aria-current` 消失；
  - 折叠「一」后把光标放回「一甲子」正文处 → 大纲自动展开祖先，「一甲子」行可见且 `aria-current="location"`；
  - 空文档仍显示「这篇还没有标题」；单标题文档 toggle 数为 0；
  - 控制台 error 0。
- 体积：合并后总账（第 3 节）显示 T3 首屏净额 **−125 B**（−76 −49 +0）；把实测值写进报告与 README。
- 首屏核对：合并产物 `.tmp/build-a/assets/index-*.css` 里**不应出现** `.outline-item` / `.outline-toggle` / `is-active`（前两者已搬懒 CSS 或只在行内 style）；`.tmp/build-a/` 里应有独立的 outline CSS chunk（随大纲懒加载）。

**门禁**：`npx tsc --noEmit`、`npm test`、合并后首屏总账。`styles.css` 改动不涉及序列化 → 不跑 roundtrip。

**风险**

- 折叠状态只存组件内存，不持久化（Typora 同为会话内；也避免新增 localStorage 键）。`items` 换新数组时折叠集合靠 `h-<pos>` id 保持；编辑正文会让位置漂移——已知取舍，报告写 UNVERIFIED（长文编辑后折叠是否错位）。
- grid 两列会改变缩进观感：`.outline-item` 的 `paddingLeft` 内联缩进保留，左侧再加 14px 列；截图对比 `shots/round-28/`。
- Tab 顺序新增折叠按钮（每个有子级标题一个停靠点）：按钮有 `aria-expanded` 与 `aria-label`（含标题文字），报告记录真实 Tab 走查结果。
- 死 CSS 误删风险：删前必须 `git grep` 复核；`.popover` 基类（`InlinePopover.tsx:53` 使用）、`.note-kind-*` 与 `.annot-*`（`MarginRail.tsx:110,117`、`decorations.ts:58` 动态拼 `-${kind}`）**都不能删**——本轮扫描把它们列为候选，必须人工排除。
- 搬 `.outline*` 到懒 CSS 后，大纲 chunk 的 CSS 独立加载（先例 `dist/assets/katexLoader-*.css`）；若 Vite 把它并进首屏 CSS，实测会显示这条搬移无收益（少 −49 B），此时保留原样式在 `styles.css` 并在报告记录，然后按第 3 节杠杆 1、2 削并在报告写明余量可能 <10 B；不要为了 -49 B 去删有用的规则。
- 行内 style 的代价：两处对象每次渲染重建（大纲条目本来就少，可接受）；不在 `Outline.tsx` 顶层建常量也没问题。若有人把行内 style 改回 CSS 规则（尤其写进 `styles.css`），首屏 +38 B，合并后会破线——第 8 节把这条列为核对项。

**需要的截图**：`shots/round-29/outline-folded.png`（折叠「一」且祖先高亮）、`shots/round-29/outline-fold-reveal.png`（光标回到子节后自动展开、`aria-current` 在子行）。

## 5. 实施分工与文件所有权

**推荐拆两个 builder 并行**（墙钟 ≈25 min；`AGENTS.md:30` 要求按互不重叠的目录切）：

| 谁 | 任务 | 独占文件 |
| --- | --- | --- |
| builder | T1 + T2 | `src/App.tsx`、`src/components/StatusBar.tsx`、`src/components/StatsDetail.tsx`、`src/components/statsDetail.css`、`src/lib/sentenceStats.ts`、`src/lib/wordcount.test.ts`、`src/components/FindBar.tsx`、`scripts/measure-first-screen.mjs`、`.github/workflows/ci.yml`、`docs/adr/0012-katex-lazy-loading.md`；测试辅助 `.tmp/r29-fsa.mjs`（延迟开关）、`.tmp/e2e-r29-t1.mjs`、`.tmp/e2e-r29-stats.mjs` |
| builder2 | T3 | `src/lib/outline.ts`、`src/lib/outline.test.ts`、`src/components/Outline.tsx`、`src/components/outline.css`、`src/styles.css`（含死 CSS 删除与**代加** `.status-count` 复位） |
| 根代理 | 文档收尾 | `README.md`（`:37`、`:51`、`:76`、`:96`）、`docs/CHANGELOG.md`（`## Unreleased`）、`docs/iteration/STATE.md`；合并后串行跑一次 `npm run build` + `npm test` + `node scripts/measure-first-screen.mjs` |

- 构建纪律（`STATE.md:128`）：实施期间不跑 `npm run build`；类型检查用 `npx tsc --noEmit`；需要产物用 `npx vite build --outDir .tmp/build-a`（builder）与 `.tmp/build-b`（builder2），互不覆盖。
- **唯一字节门在合并后**（审查 P1-3）：两人期间量到的数字只写 `impl.md`，不作验收；`npx tsc --noEmit` 在对方半成品上可能红，先看错误路径是不是自己独占的文件，是对方的就等对方收工再跑。
- `.status-count` 复位样式归 builder2：builder2 第 2 步就加，builder 的截图在 builder2 加完之后拍；若 builder2 未完成，builder 可在自己截图前临时确认该规则已在 `styles.css`，**不要自己改 `styles.css`**。
- README/CHANGELOG 只在合并后由根代理写一次，避免两个 builder 并发改同一文件；builder 把要写的文案与实测数字放进 `impl.md`。
- 若只有单个执行代理：按第 1 节的三条分支走（分支 1 先做 T3 的两步零交互抵消，再做 T1），**不要**按「T1 → T2 → T3」硬排——那样 47 min 做不完，还会把字节账拖成超线。任何分支都不顺延 T1。

## 6. 版本与文档（硬要求）

- **不 bump** `package.json` 版本，不改 `release/`，不 push、不建 Release。
- `docs/CHANGELOG.md` 在 `:5`（`## 0.32.1` 之前）新建 `## Unreleased`，写 3 条 + 测试条数（254）+ 首屏实测值（合并后）+ 新懒 chunk 的 gzip 字节（`StatsDetail-*.js/.css`、`outline-*.css`）。
- `README.md` 更新：`:37`（状态栏明细）、`:51`（字号键位）、`:76`（超大文件保留上一篇正文）、`:96`（体积与新 chunk）、`现在能做什么`/`现在不能做什么`（大纲折叠已做）；`:78` 的「21 项有 / 18 项缺」与 `docs/typora-gap.md` 的过期核对**本轮不做**，只加一行「差距表待复核」备注。
- `AGENTS.md`/`STATE.md` 的测试条数以 `npm test` 输出为准（本轮预计 17 文件 254 条），由根代理收尾时改。

## 7. 本轮明确不做（以及下轮入口）

| 项 | 来源 | 为什么本轮不做 | 下轮入口 |
| --- | --- | --- | --- |
| Mermaid 渲染 | 产品负责人点名 / `findings-typora.md` §4 | chunk gzip 未测 + 安装包硬线余 25.8 KB；不做等于赌硬线 | 先按 §3/§4.3 量 tree-shaken chunk，再定 |
| F2 安装包 FileVersion 写死 `0.31.1.0` | `findings-ship.md:129-140` | 改 `.nsi` 后必须重打安装包才能验，本轮 35 min 装不下 | 下轮和 F3 一起，验完 `packaging\verify-installer.ps1` |
| F3 `verify-installer.ps1` 写死 `0.31.1` | `findings-ship.md:142-155` | 同上，需要真实构建与 NSIS | 同上 |
| F4 发布流水线不跑测试/首屏门 | `findings-ship.md:157-168` | 改 `release.yml` 无法在本轮实测（要 tag） | 下轮改完用 `workflow_dispatch` 空跑 preflight |
| 重命名成功提示「已刷新：新增 1 个，消失 1 个」 | `findings-bug.md:32-42` | 要给 `refreshTree` 加 `silent` 选项，动 App.tsx 保存/刷新热路径，与 T1 同文件，本轮让位 | 下轮 3 行改动 + e2e |
| 表格列宽拖拽 / 图片落盘三选一 / 粘贴纯文本 / 智能标点 / 行内 HTML 渲染 | `findings-typora.md` §2.3–2.7 | 都动序列化或输入路径，要跑 roundtrip 与差异门，单轮装不下 | 一次一项，按差距表顺序 |
| F5 安装包内部预算 820,000 已超、F6 CI 冗余 | `findings-ship.md:170-204` | 预算属对外数字，需产品负责人定 | 下轮带着 824,209 B 现状回人 |

## 8. 本轮整体验收（根代理执行）

1. `npx tsc --noEmit` exit 0。
2. `npm test` → 17 个文件、**254** 条（248 + 3 + 3）、fail 0（数字以输出为准；若实现有偏差，先对数字再判）。
3. `npm run build` 串行跑一次 → exit 0。
4. `node scripts/measure-first-screen.mjs`（**不带参数**）→ PASS，输出 `max=286000`，且 gzip ≤ 286,000（本版上界 **285,985**，余 15 B）。实测 gzip 写进 README/CHANGELOG。若落在 285,986–286,000 也 PASS，但报告要写「余量 <15 B」，并按第 3 节杠杆过一遍。
5. 首屏 CSS 核对：`.tmp/build-a/assets/index-*.css` 不含 `.outline-item` / `.outline-toggle`（四段样式应随懒 CSS，toggle 的样式只在行内）；`.tmp/build-a/` 有独立的 outline CSS chunk 与 `StatsDetail-*.js`。
6. e2e 三个脚本的 JSON 输出与 4 张截图落盘：`shots/round-29/stats-detail.png`、`stats-detail-selection.png`、`outline-folded.png`、`outline-fold-reveal.png`（T3 顺延的分支 1/2 只需 T1 的 JSON，不硬凑大纲截图）。
7. 无新增运行时依赖（`package.json` 的 `dependencies` 与 `devDependencies` 不变），`npm install` 不执行。
8. `git status` 只含预期文件；不 push、不改 `release/`、不 bump 版本。
9. UNVERIFIED 清单（至少写这些）：离线首次点开明细面板、长文编辑后大纲折叠是否错位、`aria` 与状态栏 Tab 顺序的真实屏幕阅读器表现、明细面板在源码/预览模式切换后的数字（本版设计是「不关面板、数字跟着变」，只覆盖 e2e 断言）、点击外部在触屏/触控板的真实行为、macOS 侧全部（本机 Windows）。

## 9. 证据与命令索引

| 用途 | 命令 |
| --- | --- |
| 类型检查（不进 dist） | `npx tsc --noEmit` |
| 单测 | `npm test`；单文件 `node --experimental-strip-types src/lib/<x>.test.ts` |
| 首屏预算（唯一字节门，合并后） | `npx vite build --outDir .tmp/build-a` → `node scripts/measure-first-screen.mjs --dir .tmp/build-a` |
| 首屏（当前 dist，复核现状） | `node scripts/measure-first-screen.mjs` |
| CSS 抵消项复算 | `node .tmp/measure-css-r29.mjs`（删 5 段死 CSS 与搬大纲段的 gzip 差）；`node .tmp/measure-css-r29b.mjs`（revision 3：复核 −76/−49、新增 `+38`/`+12` 两种写法） |
| T1/T2 首屏 JS 粗估 | `node .tmp/measure-js-r29c.mjs`（T2 分解）、`.tmp/measure-js-r29f.mjs`（T1 守卫/代际）、`.tmp/measure-js-r29g.mjs`（T2 全量含 react 导入）、`.tmp/measure-js-r29h.mjs`（提示改写净额） |
| 测量单文件 gzip | `node -e "const z=require('node:zlib'),f=require('node:fs');for(const p of process.argv.slice(1))console.log(p,z.gzipSync(f.readFileSync(p),{level:9}).length)" <文件…>` |
| 截图 | `node scripts/shot.mjs http://localhost:5175 --out shots/round-29/<名字>.png` |
| 清浏览器状态 | `node .tmp/reset.mjs <端口>`（CDP 9222–9226，**不用 9227**） |
| e2e | `.tmp/e2e-r29-t1.mjs`、`.tmp/e2e-r29-stats.mjs`、`.tmp/e2e-r29-outline.mjs`（`chromium.connectOverCDP('http://127.0.0.1:<端口>')`，结尾 `await browser.close(); process.exit(0)`） |
| 死 CSS 复核 | `git grep -n "sr-only\|popover-title\|popover-note\|popover-actions\|dialog-input" -- src index.html` 只应命中定义处；`.popover` / `.note-kind-*` / `.annot-*` 是动态类，不得删 |
| 旧版本号复核 | `git grep -n "measure --max 285000" -- docs/adr scripts .github` 应为 0（T1 子项 3 之后）；`git grep -n 285000 -- docs/adr` 只应剩 `:44-45` 两条历史结论 |
