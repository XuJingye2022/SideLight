# 第 39 轮计划（planner）

- 轮次：39 · 轮前 `startSha=59a4f933dfd411039c939b1e70d7bbdcd7ed82f8` · 报告目录 `docs/iteration/round-39/`
- 输入：`docs/iteration/round-39/findings-{bug,typora,ship,code,ui}.md`（5 份全读）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`git log -8`
- 计划者只读：本文件之外不动产品代码。产品代码由 1 个执行代理按本文实施。
- 版本政策：**本轮不发版**，不 bump `package.json`（仍 0.32.1）；CHANGELOG 写 `## Unreleased`。
- **修订：revision=2（第 2 次修订，planner-revision，只读）**。依据 `round-39/plan-review.md` §三的 **R1/R2/R3**（本次调度给的 3 条：2×P1 + 1×P2）逐条修；任务结构仍是 **T1–T4，不新增任务、不扩大范围**。改动集中在 T4 的埋点写法与读数口径、T2 的 `assetImage` 画图时机；另有一处与 R3 强绑的必要附带（R4 方案 1 的那一句，见下表第 4 行）。三条都逐行核过源码与命令（见「核对」列）。本文件现在就是执行版。
- **修订：revision=3（第 3 次修订，planner-revision，只读）**。依据本次调度给的 3 条待修漏洞（对应 `plan-review.md` §三.1/§三.2/§三.3：**1×P1 + 2×P2**）逐条修；任务结构仍是 **T1–T4，不新增任务、不扩大范围**。三条都先读源码、再复跑本轮探针，然后才改文字（见下节「修订记录（revision=3）」的「核对」列）。新增两个只读探针：`.tmp/planner-r39-probe.mjs`（T2 种子字节稳定性）、`.tmp/planner-r39-probe-find.mjs`（源码模式替换框 Enter 的隐藏文档副作用）。

## 修订记录（revision=3）

| 漏洞 | 修订动作 | 落在 | 核对（本轮实查） |
| :--- | :--- | :--- | :--- |
| **N1**（P1）T4 的「埋点不进生产」正则漏了 `sl-dispatch`，5 个标签里这一处恒绿 | 验收与 §4 门禁的 pattern 都补上 `sl-dispatch`（`'sl-load\|sl-parse\|sl-dispatch\|sl-serialize\|sl-sync'`）；正向对照 8 行保持不动 | §T4 验收「埋点不进生产」条、§4 收官门禁第 3 行 | 本轮复跑 `Select-String`/`-match`：`sl-load-start` True、`sl-parse-done` True、**`sl-dispatch-done` False**、`sl-serialize-done` True、`sl-sync-done` True——旧 pattern 只有这一处漏看。`git grep -n "sl-" -- src/` 本轮仍 **0**（exit 1），改后 pattern 不会误伤；标签表（5 标签 8 处）与 `performance\.mark\(` 的 8 行正向对照不变。 |
| **N2**（P2）T2 的两条验收按字面实现会假红，与修复无关 | ① 种子换成**字节稳定版**：删掉 bug-b 的裸空格行，加入 `![没图](../assets/nope.png)`；断言「保存结果逐字节等于这串种子」。② 缺失断言改成 `img.title.includes('图片未找到')` + `img.alt === '没图'`，删掉 `alt \|\| title` 写法；`markMissing()` 规格不动（alt 非空时不覆盖 alt，title 恒写） | §T2 验收第 2、3、5 条、风险 ⑥ | 本轮探针 `.tmp/planner-r39-probe.mjs`（同一 `MarkdownManager`+`escapeHtmlForParse`+`serializeDocument` 链）实跑：原种子 `equal:false`、**130→132 B**、`![空格上级](../assets/my pic.png)` 被转义成 `!\[空格上级\]`；换成新种子后 `equal:true`、**105 B**。`(alt \|\| title)` 在 alt 非空时短路到 alt，`.includes('图片未找到')` 恒 false（JS 语义，`markMissing()` 见 `plan.md` §T2 步骤 4）。 |
| **N3**（P2）T3 只关了按钮和查找框 Enter，替换框的 Enter 仍会执行替换 | ① `FindBar` 里用 `locked = Boolean(unavailableReason)` 把**查找框 Enter/Shift+Enter 与替换框 Enter 一并置空**（`preventDefault()` 后 `if (locked) return`），不只靠 `disabled`；② 去掉替换框的 `readOnly`（它拦不住 `keydown`，还会让验收的 `page.fill` 抛「Element is not editable」）；③ 验收新增一条**有牙的**判据：源码模式在替换框按 Enter 后，`localStorage['sidelight.doc.v1']` 必须与按 Enter 前逐字节相同 | §T3 步骤 1、验收第 2 条、风险 ④、§6 第 3 条 | `FindBar.tsx:80-90`：替换框 Enter 直接调 `onReplace()`，`readOnly` 不拦 `keydown`；App 侧 `replaceCurrent`（`App.tsx:1812-1817`）/`replaceEvery`（`:1819-1831`）无 `sourceMode` 判断。本轮 E2E 实测（**改前**）：源码模式按替换框 Enter → 草稿 `sidelight.doc.v1` **73 → 69**、尾段 `甲的正文。` → `甲的ZZ。`、`.find-count` `1 / 2 → 1 / 1`，而 `.source-editor` 不变、`window.__slState.dirty` 仍 `false`——静默改隐藏文档被证实，且只有草稿这一处看得见（源码模式下 `currentMarkdown()` 返回 `sourceText`：`App.tsx:2775-2776`）。 |

> 未调度项（本次只修 N1–N3）：`plan-review.md` §三.4（首屏 gzip「≤ +200 B」把 T1–T3 的代码增量算成埋点）、§三.5（R5 带格式单元格）、§三.6（R6 测试条数文档）**原文不动**。执行时的口径只有一条：gzip 以**硬线 ≤310,000 B** 为判据，与 289,430 B 的差值按 T1–T3 归属记录，**不得为压数字删埋点或砍功能**（这与 §三.4 自己的修法第 1 条一致，不改任务结构）。
>
> 任务量复核：上界仍是 **38–45 分钟**（超 35 分钟口径），本次修订不新增步骤；若必须压到 35 分钟，按 §6 第 5 条的 **T3 → T2 → T1** 砍（本轮不改这条顺序：T4 不砍、埋点不删）。

## 修订记录（revision=2）

| 漏洞 | 修订动作 | 落在 | 核对（本轮实查） |
| :--- | :--- | :--- | :--- |
| **R1**（P1）埋点 helper 让「生产 0 命中」要么必红要么恒绿 | 删掉模块级 `loadMark`，改为**行内守卫**（`import.meta.env.DEV` 落在调用点上，Vite define → `if (false)` → 整句被压缩器删除）；验收补**正向对照**（先证源码里真有标记 8 处，再验产物 0 命中） | §T4 步骤 2、验收第 2–3 条、风险 ① | `src/` 现有 `import.meta.env` **0 处**（`git grep -c "import.meta.env" -- src/` 无输出），没有先例可抄；`tsconfig.json:14` 有 `vite/client` 类型，但类型不解决 DCE（死代码消除） |
| **R2**（P1）dev 下 StrictMode 让每次载入跑两遍，读数没有定义 | ①口径写死：dev 两遍 / 下表单遍 / 生产单遍，`219,828 ms` 每处引用都标「dev 两遍」；②每个 name 取**最后一条**（不做 `clearMarks`，保留「每名 2 条」这个两遍物证）；③收益口径改成「去重只值 ≈64 ms（0.03%），真实产出是 dispatch 与 sync 两段」；④**连带修正**：`sl-parse-done` 必须挂进 `setMarkdown` 内部，否则 dispatch 被算进 parse | §T4 用户收益、步骤 2 与 4、验收第 4 条、§5 | `src/main.tsx:10-14` 是 `<StrictMode>`；1 MB 样本走 `initial`（`App.tsx:459-488` 读 localStorage 草稿）→ `:1006-1021` 的挂载 effect 跑两遍；`setMarkdown`（`:973-992`）把 `manager.parse`(:983)、`nodeFromJSON`(:984)、`view.dispatch`(:988，37,450 段建 DOM) 包在同一函数里，mark 挂在函数外测不到单独的 dispatch |
| **R3**（P2）「不产生 404」是空断言，且修法没消除请求 | `bind()` 相对路径在解析成功前**不写 `src`**（`if (!isRelativeAsset(src)) paint(src)`），解析失败才 `markMissing()`；验收从「无 404」改成**按 URL 计数**（`page.on('request')` 里含 `nope.png` 的条数 = 0），并要求**改前红（≥1）/改后绿（0）**两次输出 | §T2 步骤 4、验收第 3–4 条、风险 ⑤ | `assetImage.ts:34-39`：`bind()` 第一行就是 `paint(src)`（`:38`），异步解析在 `:40` 之后；`isRelativeAsset` 已在 `assetImage.ts:3` 导入；`getAssetDocPath` 由 `assetResolve.ts:35` 导出，要加进 `assetImage.ts:3` 那一行 import（同一行，不加新文件）；dev server 对破图回 SPA 回退 `200 text/html`（`round-38/plan-review.md:122`），按状态码判 404 恒真 |
| 附带（R4 方案 1，仅因 R3 的改法必须先分清「能不能解析」） | 只有 `isRelativeAsset(src) && getAssetDocPath()` 才压制 `src`；宿主/单文件（无工作区文档路径）保持现状（照旧 `paint(src)`、不标缺失） | §T2 步骤 4 | 宿主 `applyHostPayload` 在 `setMarkdown` 前就 `setAssetDocPath('')`（`App.tsx:1030`）；单文件打开的裸名过不了前缀校验（`App.tsx:4004`）——两者 resolver 恒返回 `null`。不先分清，宿主里所有相对图会从破图图标变成「图片未找到」占位，而宿主本轮验不了 |

> 复核口径：`plan-review.md` §三 R1–R3 的每条「修法」都在上表有落点；§R4–R6 不属本次调度，**未改**（R4 只取了与 R3 强绑的方案 1 那一句，其余原样保留）。

## 0. 一句话

5 份发现共 **29 条**（bug 2 / typora 7 / ship 4 / code 6 / ui 10），其中 P1 共 6 条（bug#1、typora#1、typora#2、code#1、code#2、ui#1）。本轮做 **4 个任务**，全部针对「用户当场撞上、结果看起来像坏了」的静默失败与信任问题，外加 1 个性能归因：表格单元格 `<br>` 重开变字面、相对路径图片 `../` 与 `%20` 静默破图（都给出可见占位）、源码模式查找替换假装成功、1 MB 真实形态载入的重复全文序列化与阶段归因（同时把第 39 轮实测体积写进文档）。

排序依据仍按 `AGENTS.md` §4：**稳定性 > 核心功能 > 体积优化 > 节省 Token > 工作速度**。本轮 3 个任务属「静默失败/自产自读不一致」，1 个属稳定性与测量诚信。

## 1. 取舍说明（为什么是这 4 个）

| 候选 | 本轮处理 | 理由 |
| :--- | :--- | :--- |
| bug#1 `../`、`%20` 图片静默破图（P1） | **T2** | Typora 最常见的目录布局直接失效，且 0 提示；README:46 当前承诺与实测不符 |
| bug#2 源码模式替换被静默丢弃（P2） | **T3** | 动作静默丢失，用户以为改了、保存后字节不变；修法 20 行内 |
| typora#1 表格单元格 `<br>` 重开变字面（P1） | **T1** | 应用自己写出来的语法自己不解析，重开像文档坏了；纯解析侧，不碰序列化 |
| typora#2 编辑视图打不开链接（P1） | 顺延 | 需要先定 Ctrl+点击语义与宿主 `window.open` 兜底；宿主行为本轮无法验（见 §5） |
| typora#3 代码块高亮 | 顺延 | 要产品负责人批准依赖或自写词法，属「加能力」，不该塞进修复轮 |
| typora#4–#6 F8/F9、单元格 Enter、标题 Backspace | 顺延 | 都是小键位，但 #5 要先定语义（A/B）；合并下一轮一次做完 |
| ship S1/S3 体积数字与护栏口径过期 | **并入 T4** | 只改文档；S1 的数字本轮 finder-ship 已实测（setup 1,300,711 B、zip 1,622,355 B） |
| ship S2 `verify-installer.ps1:77` PermissionDenied | 顺延 | 属发布脚本债，要有可写 `%LOCALAPPDATA%` 的环境才验得了 |
| ship S4 WebView2 失败文案 | 顺延 | `host/Program.cs` 改动无法在本沙箱验证（finder-ship 三次 `0x8000FFFF`）；与 ③ 宿主批一起做 |
| code#1 1 MB 多段落载入 219,828 ms（P1） | **T4（归因）** | 根因未定（U1）。本轮只做「去掉重复全文序列化 + DEV 埋点 + 重建真实形态基线」，不猜修法 |
| code#2 文末逐键 28 s（P1） | 顺延 | 同一批；T4 拿到阶段数据后下一轮一起定位 |
| code#3/#5 每键全文序列化、localStorage 写放大 | 顺延 | 脏判断换口径有数据风险，要单独一轮 + 单测 |
| code#6 脚本默认 5173、死代码、行数 | 顺延 | 内部债，不影响用户；建议专门一个 10 分钟小任务 |
| ui#1 预览没有排版容器（P1） | 顺延 | 只读显示，无数据风险；CSS 改动便宜，下一轮首选 |
| ui#2–#6 焦点环、字数面板宽、表格工具条、设置页脚、aria | 顺延 | 纯外观/可访问性，排在本轮 3 个静默失败之后 |
| 第 38 轮遗留 ① Mermaid SVG id 唯一 | 顺延 | 已连续 3 轮顺延；规格在 `round-37/plan.md` §T2，**建议下一轮单独立项**，不再顺带 |
| 第 38 轮遗留 ② 表格 `colwidth` 导出清理 | 顺延 | 与 T1 同在表格序列化区域，同时改会把 roundtrip 断言面一次放大 |
| 第 38 轮遗留 ③ 宿主 `/__asset` | 顺延 | 沙箱不能起 WebView2 窗口，改了也验不了；T2 修好后浏览器层已支持 `../`/`%20` |
| 第 38 轮遗留 ④ 真实打包 | **已完成** | 本轮 finder-ship 实跑：setup 1,300,711 B、portable zip 1,622,355 B，`release/` 已按 SHA256 还原 |
| 第 38 轮遗留 ⑤ `qa15.mjs`/`data-safety` 陈旧选择器 | 顺延 | 测试脚本债，非产品缺陷；与 code#6 合并成「脚本卫生」小任务 |
| 第 38 轮遗留 ⑥ HTML 导出/预览 Mermaid | 顺延 | 要动导出模板 + 主题重绘，20 分钟起；且 finder-typora 自己把「预览 pane 是否真打开」标了 UNVERIFIED |

## 2. 全局约定（每个任务都适用）

- 不改编辑器内核、不加运行时依赖、不 push、不建 Release、**不改 `release/`**。
- dev server 用 `http://localhost:5175`（不要另起、不要重启；`5173` 是僵尸 server）。
- E2E 用 CDP（端口按调度给；默认 9222），每次前跑 `node .tmp/reset.mjs <端口>`；**不要启动 Edge、不要 kill msedge、不要 `browser.close()` 整个浏览器**。
- 只读代码得出的结论不算证据；每条验收要贴命令输出、日志路径或截图。
- 类型检查用 `npx tsc --noEmit`（执行期不要跑 `npm run build` 写 `dist/`；需要产物时 `npx vite build --outDir .tmp/build-r39`）。
- 每个任务完成后写 2–4 行 `docs/CHANGELOG.md` 的 `## Unreleased` 条目（写在第 38 轮条目之后，不删旧条目）。
- 截图写 `shots/round-39/`，命名 `p<T>-<说明>.png`。

---

## T1（P1，信任）表格单元格里的 `<br>` 写得出、读不回：重开显示成字面文字

**用户收益**：表格是中文写作者做对照表的常用块。现在单元格里 `Shift+Enter` 当场显示真换行，`.md` 也是 `<br>`，但保存后重开变成字面 `3A<br>B`，用户第一反应是文档坏了、会去手工删字符。

**证据**（findings-typora §1）：`shots/round-39/t9-cell-br-reload.png`、`t17-br-reload-minimal.png`；`.tmp/r39-typora-e2e3.json` `.A_srcAfterShiftEnter` / `.A_afterReload`；根因是 `src/App.tsx:983` 先过 `escapeHtmlForParse`（`src/lib/html.ts:21-23`）把 `<br>` 转成 `&lt;br&gt;` 文字，schema 不再认它；序列化侧（`@tiptap/markdown` 的 hardBreak）本来就写 `<br>`，所以是「自产自读不一致」。

**改动文件 / 函数**

1. 新增 `src/lib/tableCellBreaks.ts`（纯函数，不 import tiptap，可 Node 单测）：
   - `export function splitTableCellBreaks(json: JSONContentLike): JSONContentLike`
   - 递归遍历 JSON；只在 `tableCell` / `tableHeader` 节点内部生效（带 `inCell` 标记）；
   - 命中文本里的 `/<br\s*\/?>/gi` 时，把该文本节点切成 `[{type:'text',text:'3A'},{type:'hardBreak'},{type:'text',text:'B'}]`（空串不产出文本节点；连续两个 `<br>` 产出两个 hardBreak）；
   - 无表的文档原样返回（同一对象或深拷贝均可，但要保证不原地改调用方的入参，避免缓存污染）。
2. 新增 `src/lib/tableCellBreaks.test.ts`（`node:test` + `node:assert/strict`，风格照 `src/lib/assetResolve.test.ts`）：至少 6 条断言——单元格内单个 `<br>`、`<br/>`、`<br />`、大小写 `[BR]`、单元格内两个 `<br>`、正文段落里的 `<br>` **不得**被转换。
3. `src/App.tsx:983-984`：`const node = editor.schema.nodeFromJSON(splitTableCellBreaks(parsed))`（不要动 986 的 dispatch，也不动 `addToHistory:false`）。
4. `package.json:15` 的 `test` 脚本追加 `... && node --experimental-strip-types src/lib/tableCellBreaks.test.ts`。
5. 文档：`docs/typora-gap.md` 的「有的」表加一行「表格单元格内换行往返（写 `<br>`，重开仍渲染为换行；正文行内 `<br>` 仍显示字面）」；标题计数 29/11 → **30/11**，`README.md` 与 `AGENTS.md` §6 的同一句一起改（第 37 轮就是这么做的）。若 `docs/typora-gap.md:41` 的「缺的（11）」需要搬行，保持两表行数自洽。

**实施步骤**：写纯函数 + 单测跑通 → 接进 `setMarkdown` → 起 CDP（`node .tmp/reset.mjs <端口>` 后）用 `.tmp/e2e-r39-typora3.mjs` 的路径复验（表格 → 单元格末尾打 `A`、`Shift+Enter`、`B` → 切源码看 `| … <br> … |` → 把这行源码经源码框载回 → 断言 `td br` 元素数 1、`td` 文本里 0 处字面 `<br>`）→ 截图 → 文档三处计数。

**验收标准**

- `node --experimental-strip-types src/lib/tableCellBreaks.test.ts` 全过（≥6 条）。
- `npm run roundtrip` → `rich 5/7 source 7/7`（与第 38 轮一致，不得掉）。
- E2E：单元格 `Shift+Enter` 后源码含 `<br>`；重载后 `document.querySelectorAll('td br').length === 1` 且 `td.textContent` 不含字面 `<br>`；另做一条最小用例：直接载入 `| A<br>B |` 的 Markdown，断言同上。
- 保存/重开字节不变：种子 `.md` 逐字节等于操作后字节（表格单元格里 `<br>` 不被改写）。
- 截图：`shots/round-39/p1-cell-br-reopen.png`（重开后单元格是真换行）。
- `npx tsc --noEmit` exit 0。

**门禁**：`npx tsc --noEmit`、`npm test`、`npm run roundtrip`。

**风险**：① 单元格里本来想显示字面 `<br>` 的旧文档会被转成换行（想要的行为，但要在 CHANGELOG 写明）；② 不要顺手改正文段落的 `<br>`（正文硬换行是行尾两空格，第 9 节已实测正常），否则会扩大语义面；③ `escapeHtmlForParse` 不能动（`html.test.ts` 锁着 `kbd` 的保真）。

---

## T2（P1，静默失败）相对路径图片：支持 `../` 与 `%20`，解析失败给可见占位

**用户收益**：Typora 默认布局是「笔记放子目录、图片放仓库根 `assets/`」，写出来的路径就是 `../assets/pic.png`；文件名带空格时 Typora 写 `%20`。现在这两种一律静默破图（`naturalWidth: 0`，`src` 停在相对路径上，浏览器去请求那个相对 URL——dev server 对它是 SPA 回退 `200 text/html`，不是 404，见 `round-38/plan-review.md:122`），`README.md:46` 却写「相对路径图片正常显示」。

**证据**（findings-bug §1）：`.tmp/e2e-r39-bug-b.log` 的 `## img-sub`（两条 `nw:0`）、`## img-root`（根级正常）、`## img-doc-bytes`（字节未坏）；`shots/round-39/p4-img-root.png`、`p4-img-sub.png`；代码 `src/App.tsx:4008-4013`（`..` 被当目录名、`%20` 不解码）、`src/lib/assetResolve.ts:109-111`（失败只 `return null`，无通知）。

**改动文件 / 函数**

1. `src/lib/assetResolve.ts` 新增纯函数：
   `export function resolveAssetSegments(docDirSegments: string[], src: string): string[] | null`
   - 逐段处理 `src.split('/')`：空段与 `.` 跳过；`..` 弹一层，弹到空数组之上 → `return null`（工作区根之外）；
   - 其余段先 `try { decodeURIComponent(segment) } catch { 保留原段 }`；
   - 末尾返回至少 1 段（文件名）；否则 `null`。
2. `src/lib/assetResolve.test.ts` 追加断言：`../assets/a.png`（docDir=`['章节']`）→ `['assets','a.png']`；根级文档 `['assets','a.png']` 不变；`./assets/a.png` → `['assets','a.png']`；`../assets/my%20pic.png` → 末段 `my pic.png`；`../../a.png`（docDir=`['章节']`）→ `null`；`a%ZZ.png` 不抛错。
3. `src/App.tsx:3996-4024` 的解析器改为「从工作区根走」：
   ```ts
   const parts = resolveAssetSegments(docPath.split('/').slice(1, -1), src)
   if (!parts) return null
   let dir = space.rootHandle
   for (const segment of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(segment)
   const handle = await dir.getFileHandle(parts[parts.length - 1])
   ```
   保留现有前缀校验（`docPath.startsWith(space.name + '/')`）与 `catch → return null`（失败不缓存）。不要再调用 `parentDirectory` 拿起点，否则 `..` 走不出去。
4. `src/lib/assetImage.ts` 改画图时机（**R3 的核心**）：`bind()` 现在第一行就是 `paint(src)`（`assetImage.ts:38`），在异步解析（`:40`）之前就把相对路径写进 `img.src`；真实目录句柄下请求已经发出，dev server 对这种破图回 SPA 回退 `200 text/html`（`round-38/plan-review.md:122`），事后再 `removeAttribute('src')` 只能取消后续。改成：

   ```ts
   const waitResolve = isRelativeAsset(src) && getAssetDocPath() !== ''
   if (waitResolve) {
     img.removeAttribute('src')            // 解析成功前不写 src：请求根本不发
     img.removeAttribute('data-asset-missing')
     shown = ''
   } else {
     paint(src)                            // data:/blob:/http(s): 照旧；宿主/单文件（无文档路径）也照旧
   }
   if (!isRelativeAsset(src)) return
   void resolveAsset(src).then((url) => {
     if (rawSrc !== src) return
     if (url) paint(url)
     else if (waitResolve) markMissing()   // 只有「该解析却没解析到」才标缺失
   })
   unsubscribe = subscribeResolved(() => { /* 现有回填逻辑照旧 */ })
   ```

   `markMissing()` = `img.setAttribute('data-asset-missing','')`、`if (!img.alt) img.alt = '图片未找到'`、`if (!img.title) img.title = '图片未找到：' + rawSrc`；`paint(url)` 里补 `img.removeAttribute('data-asset-missing')`（成功与晚到成功都清标记；`paint` 现在只在绝对路径或解析成功时调用）。**`assetImage.ts:3` 的 import 加 `getAssetDocPath`**（同一个文件已导出，不加依赖）。
   **`getAssetDocPath()` 这半句是 R3 的必要前提，也正是 plan-review §三 R4 的方案 1**：宿主 `applyHostPayload` 在 `setMarkdown` 前就 `setAssetDocPath('')`（`App.tsx:1030`），单文件打开的裸名过不了前缀校验（`:4004`）——两者 resolver 恒返回 `null`。不分清就压制 `src`，宿主里每张相对图都会从破图图标变成「图片未找到」占位，而宿主本轮验不了。按方案 1，这两条路径**保持现状**（照旧 `paint(src)`、不标缺失、不加 `data-asset-missing`）。
   保留现有语义：`destroy` 只退订不 revoke（`:63-66` 注释不动）、`update` 里 `paintAttributes` 在前（`:57`）；属性（`alt`/`title`/宽高）不用在 `bind` 里重画——`paintAttributes` 已在构造（`:50-51`）与 `update`（`:57`）里先调用过。换图时 `paintAttributes` 会重置 `alt`，别把占位文案留到下一张图上。
5. `src/styles.css`（正文段附近，`.editor img` 之后）加占位样式：
   `.editor img[data-asset-missing] { display:inline-block; min-width:96px; min-height:3em; padding:6px 10px; border:1px dashed var(--line-strong); border-radius:8px; background:var(--accent-wash); color:var(--ink-faint); font-size:.8em; }`（用现成变量，不新造）。
6. 文档：`README.md:46` 与 `docs/typora-gap.md:37` 改成「支持同目录、向下相对路径、`../` 与 `%20`；解析不到的图显示虚线占位与「图片未找到」提示，Markdown 里仍是原来的相对路径」。

**验收标准**

- `node --experimental-strip-types src/lib/assetResolve.test.ts` 全过（新断言 ≥6 条），且原有 5 条不回归。
- E2E（假工作区：`import { installFakeWorkspace, openFolder, readFakeFile } from './r30-fsa.mjs'`，流程抄 `.tmp/e2e-r39-bug-b.mjs` 的 1 号段）：`章节/一.md` 的种子**写死为** `['# 一','','![上级](../assets/pic.png)','','![编码上级](../assets/my%20pic.png)','','![同目录](同.png)','','![没图](../assets/nope.png)',''].join('\n')`（**105 B**）；假 FS 另放 `assets/pic.png`、`assets/my pic.png`（`%20` 的解码目标）、`章节/同.png`，**不放** `assets/nope.png`。断言前三条图 `naturalWidth === 1` 且 `src` 以 `blob:` 开头；同目录图仍正常。**不要**抄 bug-b 种子里的裸空格行 `![空格上级](../assets/my pic.png)`：它不解析成图片，保存时被转义成字面 `!\[…\]`，原样抄会让下一条字节断言假红（本轮探针实测 130→132 B、`equal:false`）。
- 失败可见 + 不发请求（用上一条种子里已有的 `![没图](../assets/nope.png)`，不要另种）：断言 `img[data-asset-missing]` 数 **1**、该 img `getAttribute('src') === null`、`img.alt === '没图'`（`markMissing()` 只在 alt 为空时才写占位文案，此处 alt 保留）、**`img.title.includes('图片未找到')`**。**不要写 `(alt || title).includes(...)`**：alt 非空时 `||` 短路到 alt，`.includes('图片未找到')` 恒为 false（JS 语义；`markMissing()` 只在 `!img.alt` 时才写占位文案，见本任务步骤 4，plan-review §三.2 已实测这条会假红）。**按 URL 计数**（不要按状态码判 404：dev server 对破图回 SPA 回退 `200 text/html`，`round-38/plan-review.md:122` 已实测，按 404 判是恒真的空断言）：脚本里 `page.on('request')` 收 `r.url().includes('nope.png')` 的条数，断言 **`=== 0`**，同时把该 URL 的 `response` status 打进日志（将来分辨 200 回退与真 404）。
- 红绿对照（证明上一条有牙）：**改 `assetImage.ts` 之前**先跑一次同一脚本的「请求计数段」（这一段**只记录、不断言**，因为 `../` 解析此时还是红的），记录 `nope.png` 的请求条数与 `img[data-asset-missing]` 数（预期 **≥1**、**0**）；改完再跑完整断言（预期 **0**、**1**）。两次输出都贴进 impl.md。没有改前基线，`=== 0` 分不清真假（plan-review §三 R3）；先跑基线再改 `assetImage.ts`，不要反过来。
- 保存字节不变：`Ctrl+S` 后 `readFakeFile(page, '章节/一.md')` **逐字节等于上面那串种子（105 B）**，结果里 0 处 `blob:`。这串种子本轮用 `.tmp/planner-r39-probe.mjs`（同一 `MarkdownManager` + `escapeHtmlForParse` + `serializeDocument` 链）实测 `equal:true`；原种子（含裸空格行）实测 `equal:false`、130→132 B，已弃用。
- 截图：`shots/round-39/p2-img-parent.png`（`../` 图显示）、`p2-img-missing.png`（占位）。
- `npx tsc --noEmit` exit 0。

**门禁**：`npx tsc --noEmit`、`npm test`。

**风险**：① 单文件打开/宿主文档必须仍返回 `null`（前缀校验不能删）；② `%ZZ` 这类非法编码不能抛错（try/catch 保留原段）；③ `..` 越出工作区根必须 `null`，绝不能显示根之外的图；④ 不改 `assetResolve.ts` 的缓存/代际语义（第 38 轮已验，测试锁着）；⑤ 有工作区时相对图在解析在飞的那一小段时间里是空的（`removeAttribute('src')` 的代价，通常 < 100 ms，大图/慢盘更久）——这是换来「不提前发请求」的取舍，CHANGELOG 记一句；⑥ 占位框里的文字靠 `alt` 渲染，浏览器对「无 `src` 的 `img`」是否显示 alt 文本有差异，验收只断属性（`img.title` 含「图片未找到」、`alt === '没图'`、`data-asset-missing` 存在），截图里至少应有虚线框与占位尺寸；⑦ 宿主/单文件路径按 R4 方案 1 保持现状，本轮**验不了**（沙箱起不了 WebView2），只在代码层核对 `getAssetDocPath()` 的判空。

---

## T3（P2，静默丢失）源码模式下查找替换不再「看起来成功」

**用户收益**：用户在源码模式里 `Ctrl+F` 搜到 2 处、填替换串、点「全部替换」——计数变「无结果」、按钮变灰，但源码框、正文、保存字节都不变，`dirty` 仍 `false`。用户会以为替换完成并保存。

**证据**（findings-bug §2）：`.tmp/e2e-r39-bug-e.log`（`## after-all` 全字段）、`shots/round-39/p5-replace-source.png`；匹配来自 `editor.state.doc`（`src/App.tsx:1773-1783`），替换派发到同一 `editor`（`:1812-1831`），而源码模式只渲染 `textarea`（`:4856`），富文本实例不在页面上。

**改动文件 / 函数**

1. `src/components/FindBar.tsx`：新增可选 prop `unavailableReason?: string`，组件内取 `const locked = Boolean(unavailableReason)`。
   - 有值时（`locked`）：渲染一行提示 `<p className="find-note">{unavailableReason}</p>`；`↑`/`↓`/`替换`/`全部替换` 四个按钮 `disabled`（`locked || total === 0`）；`.find-count` 不显示计数（改为空，避免「1 / 2」这种假反馈）；替换输入框**保持可编辑**（不加 `readOnly`：`readOnly` 不拦 `keydown`，拦不住它调 `onReplace`；而验收要用 `page.fill` 填替换串，`readOnly` 会让它抛「Element is not editable」——见 `FindBar.tsx:75-91` 与 `.tmp/e2e-r39-bug-e.mjs:29`）；**查找框的 `Enter`/`Shift+Enter` 与替换框的 `Enter` 一律置空**：`event.preventDefault()` 之后 `if (locked) return`，不再调用 `onNext`/`onPrev`/`onReplace`（只把按钮 `disabled` 不够：`FindBar.tsx:80-90` 的替换框 Enter 直接调 `onReplace()`，`readOnly` 下照样触发）。`Escape` 仍 `stopPropagation` 后关闭。
   - 无值时行为与现在完全一致（富文本路径零变化）。
2. `src/App.tsx:4671-4697`：传 `unavailableReason={sourceMode ? '源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查' : undefined}`。
3. `src/styles.css` 加 `.find-note`（12.5px、`var(--ink-soft)`、`margin: 4px 0 0`，不新造变量）。
4. CHANGELOG 写明「源码模式不再提供（也假装提供）替换」。

**验收标准**

- E2E（UI 面，不做判据）：打开任意文档 → `Ctrl+/` 进源码 → `Ctrl+F` → 断言四个按钮 `disabled === true`、`.find-note` 文本命中「源码模式」、`.find-count` 为空；在查找框按 `Enter` 后源码框（`.source-editor`）内容不变、`window.__slState.dirty === false`。
- E2E（**有牙的判据：替换框 Enter**）：假工作区种子 `甲.md = '# 甲\n\n甲的正文。\n第二段正文。\n'`（`installFakeWorkspace`，流程照 `.tmp/e2e-r39-bug-e.mjs`）→ 打开 `甲.md` → `Ctrl+/` 进源码 → `Ctrl+F` → 打「正文」（计数 `1 / 2`）→ `page.fill('.find-bar input[placeholder="替换为"]', 'ZZ')` → **先读 `localStorage.getItem('sidelight.doc.v1')` 存为基线** → 在替换框直接按 `Enter` → 等 **900 ms**（`onUpdate` 的草稿写盘在 300 ms 的 `deriveTimer` 之后，`App.tsx:895-909`）→ 再读同一 key **必须与基线逐字节相同**、`.source-editor` 内容不变、`dirty` 仍 `false`。**改前实测这条必红**：本轮 `.tmp/planner-r39-probe-find.mjs`（改前代码）实测 `draftLen` **73 → 69**、草稿尾段 `甲的正文。` → `甲的ZZ。`、`.find-count` `1 / 2 → 1 / 1`，而 `.source-editor` 与 `dirty` 都不变——隐藏文档被改只有草稿这一处看得见（源码模式下 `currentMarkdown()` 返回 `sourceText`：`App.tsx:2775-2776`）。因此这条**不需要另跑改前基线**：脚本断的就是 bug 路径本身，实现漏了就必红。
- 回归：`Ctrl+/` 回富文本 → `Ctrl+F` 搜到 2 处 → 填 `ZZ` → 「全部替换」→ 正文含 2 个 `ZZ`、`dirty === true`；`Esc` 关查找后焦点回正文（第 35 轮既有行为）。
- 源码模式下 `Esc` 一次只关查找、不退源码（`FindBar` 的 `stopPropagation` 不能破）。
- 截图：`shots/round-39/p3-source-find.png`。
- `npx tsc --noEmit` exit 0；`npm test` 条数不变（311，本任务不加单测）。

**门禁**：`npx tsc --noEmit`、`npm test`、E2E 两条路径（写 `.tmp/e2e-r39-t3-find.mjs`，连接与选择器抄 `.tmp/e2e-r39-bug-e.mjs`；结尾 `page.close()` 后 `process.exit(0)`）。

**风险**：① 不要把 `Enter` 的默认行为改坏（富文本里 `Enter` = 下一处）；② 四个按钮的 `disabled` 逻辑要保留原有 `total === 0` 条件（两个条件取或）；③ 不要动 window 的 Escape 分支（第 35 轮教训：一个按键两个动作）；④ **替换框的 `Enter` 必须真的置空 `onReplace`**：只把按钮 `disabled` 改不掉它（`FindBar.tsx:80-90`，`readOnly` 下照样触发 `keydown`）；改完用上面第 2 条验收的草稿断言复验（本轮改前实测草稿 `73 → 69`）。

---

## T4（P1，稳定性 / 测量诚信）1 MB 真实形态载入：去掉重复全文序列化 + DEV 归因埋点 + 数字落文档

**用户收益**：不是新功能，是本轮最重要的稳定性归因；**产出是四段数字，不是「载入变快」**。1 MB 多段落（≈37,450 段）载入实测 **219,828 ms（dev 两遍，口径见步骤 2）**，窗口在此期间零响应、零提示；而仓库既有「1 MB 载入 1284 ms」基线用的是**单巨段落**样本，性能门禁一直是测不到的绿灯。**受益面先讲清**：critic 的探针（Node，同一条解析链）量到 1 MB/37,450 段 `manager.parse` = 66,816 ms、`manager.serialize` = 64 ms，所以「去掉重复全文序列化」只值 **≈64 ms / 219,828 ms（0.03%）**——去重仍要做（纯浪费，且每键路径上还有同型问题），但别把 T4 写成「载入变快」。T4 的真实产出是 `dispatch`（37,450 段建 DOM）与 `syncDocInfo`（`extractOutline` + `countText`）两段的数字：`219,828 − 2×66,816 ≈ 86,196 ms` 是这两段的**两遍**余量（单遍约 43 s，按 critic 的折算，实际以本轮实测为准）。「1 MB 单巨段落文末逐键 28 s」仍留给下一轮。

**证据**（findings-code F1/F4）：`.tmp/r39-1mb-multi.log`、`.tmp/r39-1mb-repro.log`；`src/App.tsx:2038-2055` 两次入参逐字相同的 `serializeDocument`；`scripts/perf-longdoc.mjs:11-16` 的样本是单段落。

**改动文件 / 函数**

1. `src/App.tsx:2036-2055` 去重：把两处 `serializeDocument(...)` 提出成 `const serialized = serializeDocument(editor, {frontmatter: split.frontmatter, footnotes: footnoteSplit.footnotes, original: text})`，`baselineLosses(text, serialized)` 与 `baselineRef.current = serialized.replace(/\r\n/g,'\n')` 都用它。**语义必须不变**：`baselineLosses` 拿到的仍是同一条字符串，`baselineRef` 仍是去 `\r\n` 后的。
2. DEV 埋点（生产 0 B）：**不用模块级 helper**。helper 会把 `import.meta.env.DEV` 判断放进函数体内，调用点的字符串字面量不在死代码分支里，生产产物还带不带 `sl-*` 只取决于压缩器肯不肯内联空箭头函数——不由我们控制（plan-review §三 R1）。8 个调用点一律写成**行内守卫**：

   ```ts
   if (import.meta.env.DEV) performance.mark('sl-load-start')
   ```

   Vite `define` 把它换成 `if (false)`，压缩器整句删除 → 产物里 0 命中是**确定的**。5 个标签、8 处：

   | 标签 | 位置 | 处数 |
   | :--- | :--- | :--- |
   | `sl-load-start` | 初始载入 effect（`App.tsx:1008` 的 `setMarkdown` 之前）、`loadDocument`（`:2036` 的 `setMarkdown` 之前） | 2 |
   | `sl-parse-done` | `setMarkdown` 内，`App.tsx:984` `nodeFromJSON` 之后、`:985` 建 tr 之前 | 1 |
   | `sl-dispatch-done` | `setMarkdown` 内，`App.tsx:988` `editor.view.dispatch(...)` 与 `:989` `setTextSelection(0)` 之后 | 1 |
   | `sl-serialize-done` | 初始 effect 的 `serializeDocument`（`:1010-1014`）之后；`loadDocument` 去重后的 `const serialized = …` 之后（**在 `baselineLosses` 之前**，否则差值里混进全文 diff） | 2 |
   | `sl-sync-done` | `App.tsx:1020` 与 `:2092` 的 `syncDocInfo(editor)` 之后 | 2 |

   **为什么 `sl-parse-done` 必须进 `setMarkdown`**：`setMarkdown`（`App.tsx:973-992`）把 `manager.parse`(`:983`)、`schema.nodeFromJSON`(`:984`)、`view.dispatch`(`:988`，37,450 段在这里同步建 DOM) 全包在一个函数里。按原计划把 mark 挂在 `setMarkdown` 返回之后，`dispatch` 会被算进 `parse` 段，T4 就交付不出 R2 要求的 dispatch 数字。`setMarkdown` 是全应用唯一的解析入口，这两个 mark 会在别的 `setMarkdown` 调用上也各打一条（源码模式往返、宿主载入）：本轮 1 MB 实测场景载入后不再调用它，读数按下面的规则取最后一条，不受影响；**下一轮别复用这两个标签去测逐键或切模式**。

   **两遍前提（读数口径，写进 impl.md）**：`src/main.tsx:10-14` 是 `<StrictMode>`，React 19 开发模式对首次挂载的 effect 跑两遍（setup → cleanup → setup）。1 MB 样本走 localStorage 草稿恢复（`App.tsx:459-488` → `:1006-1021` 的挂载 effect），所以每个标签会有 **2 条同名 mark**（本场景 5 个标签共 10 条）。读数规则：**先等两遍都落地**（连续两次、间隔 2 s 读到的 mark 条数不变即认为跑完，上限 90 s），把原始条目原样打进日志，再**每个 name 取最后一条**（`.at(-1)`）算单遍。不做 `clearMarks`：同名两条是「跑了两遍」的物证，先清再打就把它抹掉了。**若实测只有 5 条（单遍）**：按实测记录并在 impl.md 注明「本环境未跑两遍」，口径②改成「生产同为单遍」，不要硬套 2× 去乘。
   不加计时 UI、不改流程、不动任何行为。
3. 文档（ship S1/S3，只改文本）：
   - `README.md:100` 与 `packaging/README.md:57`：补「第 39 轮实测：setup **1,300,711 B**、portable zip **1,622,355 B**（含 Mermaid 惰性 chunk，首屏不受影响）」，并把「正式包预估 1,297,630 B」改成实测值或删掉预估。
   - `docs/CHANGELOG.md` 的 `## Unreleased` 加一条：「体积护栏第二次放宽：安装包内部 45,000,000 / 硬线 50,000,000 B（产品负责人 2026-11-17）；Mermaid 之后第 39 轮实测 setup 1,300,711 B、portable zip 1,622,355 B」；第 35/36 轮写 1,800,000/2,000,000 的历史条目保留原文并标注「（第 39 轮前口径）」。
4. 数字记录（`docs/iteration/round-39/impl.md`）：先写死两行口径——①「dev `StrictMode` 下初次载入执行两遍（`src/main.tsx:10-14`），下表是**单遍**耗时，每个 name 取最后一条 mark」；②「生产单遍；dev 实测总墙钟约为此表的 2 倍」。再记四段：`parse` = `sl-parse-done − sl-load-start`（含 `escapeHtmlForParse` + `protectMathPairs` + `manager.parse` + `nodeFromJSON`）、`dispatch` = `sl-dispatch-done − sl-parse-done`、`serialize` = `sl-serialize-done − sl-dispatch-done`、`sync` = `sl-sync-done − sl-serialize-done`（E2E 走初始载入 effect，这一段主要是 `syncDocInfo`；`loadDocument` 的 `baselineLosses` 也落在这里，读数里注明），另记总墙钟与 `总 − sl-sync-done` 的尾段；注明样本形态（`1,048,576` 字符、≈37,450 段、在 `src/lib/workspace.ts:241` 的 5.5 MiB 上限之内）。**`219,828 ms` 每处引用都带「dev 两遍」**（含 CHANGELOG/README，如果引到）。生产口径本轮不测（环境硬约束：不另起、不重启 server），在 impl.md 写一行「生产口径未测」。

**验收标准**

- 去重可证：`git diff src/App.tsx` 里 2036-2055 区间只剩 1 次 `serializeDocument(`；`npx tsc --noEmit` exit 0；`npm test` 条数不变（第 38 轮 311 条；T1 之后文件数 24 → 25）。
- 埋点写进源码（**正向对照，必须先于 0 命中跑**）：`Select-String -Path src/App.tsx -Pattern 'performance\.mark\('` → **8 行**（5 标签、8 处）；`Select-String -Path src/App.tsx -Pattern "performance\.mark\('sl-load-start'\)"` → **2 行**。没有 >0 的正向对照，下面的 0 命中不算证据（第 35 轮 P1）。
- 埋点不进生产：`npx vite build --outDir .tmp/build-r39` 后 `Select-String -Path .tmp/build-r39/assets/*.js -Pattern 'sl-load|sl-parse|sl-dispatch|sl-serialize|sl-sync'` → **0 命中**（行内守卫 → `if (false)` → 整句 DCE）。**pattern 必须含 `sl-dispatch`**：旧的 `'sl-load|sl-parse|sl-serialize|sl-sync'` 匹配不到 `sl-dispatch`，5 个标签里正好这一处门禁看不见、恒绿（本轮实测该 pattern 下 `sl-dispatch-done` = False）。若仍有命中，说明某处写回了 helper 或判断没落在调用点：改回行内守卫再验，**不许把埋点删掉换绿**。`node scripts/measure-first-screen.mjs --dir .tmp/build-r39 --target 310000` 的 gzip 与第 38 轮 289,430 B 相差 ≤ +200 B（埋点应是 0 B，留余量给 hash 与死代码边界）。
- 实测一次（最多 1 次重试，单次上限 6 分钟）：`node .tmp/reset.mjs <端口>` → `node .tmp/e2e-r39-code-1mb-multi.mjs`（`SIDELIGHT_URL=http://localhost:5175`、`SIDELIGHT_CDP=http://127.0.0.1:<端口>`）→ 记录「编辑器可见耗时」；可见后**再等两遍跑完**（连续两次、间隔 2 s 的 `performance.getEntriesByType('mark').length` 不变，上限 90 s），把 `page.evaluate(() => performance.getEntriesByType('mark').map(e => [e.name, Math.round(e.startTime)]))` 的**原始条目全部**打进日志（本场景应 10 条，同名 2 条），再按「每个 name 取最后一条」算单遍四段（原样贴 10 条不得直接当数字用，见步骤 2 与 plan-review §三 R2）。脚本改法：在 `.tmp/e2e-r39-code-1mb-multi.mjs:46` 的「编辑器可见耗时」之后加等待与读数，`page.close()` 与 `process.exit(0)` 保持原样。console error 必须 0 条。脚本超时或失败：记 UNVERIFIED + **保留埋点**，不许删埋点换绿，不反复重跑。
- 不做风险修法：本轮**不**改 parse/大纲/字数实现；若四段数据指向某个 ≤10 行的低风险改法（例如某段重复调用），可另开一小步并在 impl.md 写明前后数字，否则只记录。
- 文档：README 两处的体积数字与 CHANGELOG 条目可 grep 到实测值（`1300711`、`1622355`、`45,000,000`、`50,000,000`）。

**门禁**：`npx tsc --noEmit`、`npm test`、`.tmp/build-r39` 首屏 gzip 对比、1 次 1 MB 实测。

**风险**：① 埋点类型：`import.meta.env.DEV`（`vite/client`）与 `performance.mark`（DOM lib）都有类型；若 `npx tsc --noEmit` 报错就修正行内守卫的写法，**不许退回模块级 helper**——helper 会把字符串字面量留在产物里（R1 的全部问题）；② 去重改动虽小，但它是「保存基线」语义，必须保持字符串同一、`\r\n` 归一位置不变（第 7 轮的四条保存路径都靠它）；③ 1 MB 实测本身要吃 4 分钟，建议放后台跑、期间做文档；④ 不要因为「220 s 不好看」去改 5.5 MiB 上限或加截断——那是产品决定；⑤ `setMarkdown` 内的两个 mark 是给「整篇载入」用的，别复用它们测逐键/切模式（会与载入数字混在一起）。

---

## 3. 交付清单

| # | 交付 | 文件 | 截图 |
| :--- | :--- | :--- | :--- |
| T1 | 单元格 `<br>` 往返 | `src/lib/tableCellBreaks.ts`(+test)、`src/App.tsx:983`、`package.json:15`、`docs/typora-gap.md`、`README.md`、`AGENTS.md` §6 | `p1-cell-br-reopen.png` |
| T2 | `../`/`%20` 图片 + 占位 | `src/lib/assetResolve.ts`(+test)、`src/App.tsx:3996-4024`、`src/lib/assetImage.ts`、`src/styles.css`、`README.md:46`、`docs/typora-gap.md:37` | `p2-img-parent.png`、`p2-img-missing.png` |
| T3 | 源码态查找替换不假装成功 | `src/components/FindBar.tsx`、`src/App.tsx:4671-4697`、`src/styles.css` | `p3-source-find.png` |
| T4 | 1 MB 归因 + 去重 + 体积文档 | `src/App.tsx`（2042/2051 去重；`:973-992` 的 2 处 + 两条载入路径各 3 处 = 8 处**行内**守卫）、`README.md:100`、`packaging/README.md:57`、`docs/CHANGELOG.md` | 不需要（数字在 impl.md） |

## 4. 收官门禁（执行代理串行跑一遍并贴输出）

```bash
npx tsc --noEmit
npm test                       # T1 之后：25 文件（311 + T1 新增条数）
npm run roundtrip              # rich 5/7 source 7/7
# T4 静态：先证明源码里真有标记（正向对照），再证明产物里没有
Select-String -Path src/App.tsx -Pattern 'performance\.mark\('        # 期望 8 行
npx vite build --outDir .tmp/build-r39
Select-String -Path .tmp/build-r39/assets/*.js -Pattern 'sl-load|sl-parse|sl-dispatch|sl-serialize|sl-sync'   # 期望 0 命中（5 个标签全覆盖，含 sl-dispatch）
node scripts/measure-first-screen.mjs --dir .tmp/build-r39 --target 310000
```

首屏硬线 320,000 B / 内部 310,000 B；安装包本轮不重打（数字用 finder-ship 实测值，`release/` 不动）。

时间预算：plan-review §四.3 的实测估时是 38–45 分钟（revision=2 已计入 T2 改前基线复跑约 1–2 分钟、T4 等两遍落地 ≤90 s；revision=3 **不新增耗时步骤**：T3 的新验收段在同一个 E2E 脚本里，T2 的种子更小）。超时按 §6 第 5 条的 T3 → T2 → T1 砍，**T4 不砍、埋点不删**（它给下一轮提供数据）。

## 5. UNVERIFIED（本轮注定测不了，验收报告里要写清）

- 真实磁盘上的「表格单元格 `Shift+Enter` → 保存 → 关闭 → 重开」：本轮用假 FSA / 源码框载入复现同一条解析路径；真机补测步骤见 findings-typora §12.1。
- 宿主（WebView2）里的相对路径图片与链接：沙箱不能起 WebView2 窗口（finder-ship 三次 `0x8000FFFF`），宿主 `/__asset` 顺延。
- 1 MB 文末逐键 28 s 的根因与修法：本轮只拿阶段数据（code U1）。
- **1 MB 的生产口径（minify 单遍）**：本轮只在 dev server 上量（`StrictMode` 两遍）；生产需 `vite preview` 或宿主冷启动，环境硬约束（不另起、不重启 server）下不做，impl.md 写「生产口径未测」。
- 宿主/单文件里的相对图「保持现状」的时序：按 R4 方案 1 只在代码层核对 `getAssetDocPath()` 判空，真 WebView2 窗口验不了（与第 38 轮同类）。
- 安装/开始菜单/HKCU/SmartScreen、macOS：与第 38 轮一致，仍未验。
- 真机 125%/150%/200% 缩放、真实 IME、屏幕阅读器实录：本机无法测。

## 6. 给 critic 的核对点

1. T1 是否只作用于 `tableCell`/`tableHeader`，是否碰了 `escapeHtmlForParse` 或序列化（两处都不许动）。
2. T2 的 `..` 越界是否真的返回 `null`、单文件打开是否仍不解析（第 38 轮的安全边界）。
3. T3 是否保住「富文本替换」的既有行为与 `Esc` 焦点回正文（第 35 轮）；**查找框 Enter 与替换框 Enter 是否都置空（不是只把按钮 `disabled`）**，以及替换框 Enter 后草稿 `sidelight.doc.v1` 是否与按前逐字节相同。
4. T4 的埋点是否是**行内守卫**（不是模块级 helper）、`sl-parse-done`/`sl-dispatch-done` 是否在 `setMarkdown` 内部、去重后 `baselineLosses`/`baselineRef` 是否拿到同一字符串；产物 0 命中的 pattern 是否**含 `sl-dispatch`**（5 个标签全覆盖）。
5. 四个任务是否都在 35 分钟量级内；若有超出，按 T3 → T2 → T1 顺序砍（T4 留着，因为它给下一轮提供数据）。
6. T2 的「不发请求」是否按 **URL 计数**判（不是状态码）、是否有改前 `≥1` 与改后 `0` 两次输出；T2 种子是否是那份 **105 B 字节稳定版**（不含裸空格行）。
