# 第 30 轮 · 计划（revision 3）

- **revision 3**：plan-revision 代理按 `plan-review.md` 的**第 2 次审查**（R1–R6，结论 REVISE）逐条修漏洞（2026-11-17 01:05）。任务结构仍是 T1/T2/T3，**不新增任务、不扩大范围**：只改 tester 的工时账与范围（R1）、把两条既有回归脚本的命令写全（R2）、修 T2 的两处实现细节（R3/R4）、补 §4 的并发判据（R5）、修 `PreviewPane` 的懒加载写法（R6），外加兑现 B3 的静态 grep。修订对照：

  | 审查项 | 本版怎么修 |
  | --- | --- |
  | R1 P1 tester 超 35 分钟 | §5 重排：① 不跑 `npm run build`（用根代理批次间那次，只核 `dist/` 新鲜度）；② T2 复验从「自己重跑脚本」降级为「核 T2 的 before/after 日志 + 根代理批次间复跑日志 + `git diff` + 2 条 grep」，复跑交根代理（§4）；③ 收尾拆分：`README`/`CHANGELOG` 数字由 T3-B 写、`STATE.md` 归根代理（`STATE.md:123` + `AGENTS.md` §7），tester 只核数 + 改 `AGENTS.md` §3/§6 + commit；④ 新增 tester 超时砍单表。工时账从 25 分钟改成 **33 分钟**（原账漏了写 `test.md` 的 4 分钟） |
  | R2 P1 回归脚本默认打向 5173/9222 | 两条脚本的命令写全 URL=`http://localhost:5175` 与 `$env:SIDELIGHT_CDP`（T1=9222、tester=9224）；§6 补 3 行。另发现它们会**覆盖 4 张已跟踪的历史截图**，命令后必须 `git checkout --` 还原，写进 §5 与 §6 |
  | R3 P2 `const current = text` 未收窄 | 改动表 ①：删掉 `:166` 的 `const current = text`，把 `:177-189` 整段（含 `current`）搬进 `if (text !== null && shouldWriteCurrent(text))`；风险 5 改写为「两处收窄」 |
  | R4 P2 读回用旧句柄 | 采纳「删掉二次读回」：入参 `node.handle` 是删除前旧句柄（恢复本身靠 `parentForPath` 重取，`:356-358`），真实 FSA 上 `getFile()` 抛 `NotFoundError`，会把每次成功恢复报成失败。**不采纳**在 copy 分支加 `buffer.byteLength === 0` 硬失败：真实盘句柄上 `move()` 是否可用本轮仍是 UNVERIFIED（`STATE.md:95` 只记了 OPFS 实测；原型方法在 WebView2 157 存在），copy 分支可能是真实用户路径，这条会把「恢复本来就是空文件」变成永远失败。非空保证放源选择层 `pickTrashSource`，完整性用既有的 sha256 双读（`:371-376`） |
  | R5 P2 并发中间态 | §4 加判据：别人的文件出现红时先 `git status --short` + `git diff --stat`，等 2 分钟重跑，报告注明「并发窗口」，不算失败 |
  | R6 P2 `PreviewPane` 是具名导出 | T1 改动表写全 `lazy(() => import('./components/PreviewPane.tsx').then((m) => ({ default: m.PreviewPane })))`，并删掉 `App.tsx:26` 的静态具名 import |
  | B3 静态 grep 未落地 | T2 验收 2 补第三条 grep：`kind === 'file'` 命中 1 行（`entries()` 只收文件句柄） |

- **本代理只读复核**（不改产品代码，2026-11-17 01:00，补 R1–R6 的可执行性）：`src/lib/trash.ts:166` 确为 `const current = text`、`:181` 是 `writer.write(current)`；`scripts/keyboard-acceptance.mjs:6-7`、`scripts/export-acceptance.mjs:4-5` 默认 `5173`/`9222`；`src/components/PreviewPane.tsx:32` 是 `export function PreviewPane`，`src/App.tsx:26` 是静态具名 import；`.tmp/r30-fsa.mjs:49` 有 `async move()`（copy 分支本轮 e2e 走不到），其目录句柄 `entries()` 在 `:87-104` 可用；`src/lib/trash.ts` 现在 `?? ''` 1 处（`:305`）、`kind === 'file'` 0 处、`shouldWriteCurrent` 0 处（修完应为 0 / 1 / 2）；`shots/round-05/t1-{skip,filemenu,shortcuts}.png` 与 `shots/round-04/t3-export.png` 都已被 git 跟踪。**行号说明**：本块插入后，正文行号比 revision 2 排版整体下移（`## 0. 本轮取舍` 从 `:26` 移到 `:40`）；下文 `plan.md:NN` 一类引用是 revision 2 的排版，请按章节标题定位，行号只作辅助。

- **revision 2**：plan-revision 代理按 `plan-review.md`（critic，结论 REVISE）逐条修漏洞（2026-11-17 00:55）。任务结构仍是 T1/T2/T3，不改产品方向，只改分工、端口、回归锁、复验项与工时账。本轮**没有新增任务**，只有 T3 拆成两段（同一任务、同一交付物）与 T1 的验收执行者从 builder 换成 tester。修订对照：

  | 审查项 | 本版怎么修 |
  | --- | --- |
  | C1 P1 两个执行代理都超 35 分钟 | T1 的 e2e 与导出回归交给 tester（`plan.md` §5「独立验收」），T1 只交付产品代码 + 3 条单测 + light/dark 两张截图 + `build-a`/`build-b` 两次 measure 输出，估 **30 分钟**；T2 把「新写 e2e 脚本」改成「裁剪现有 `.tmp/e2e-r30-verify.mjs` 的第 1–2 节」，加上 C3 的谓词仍估 **30 分钟**；T3 拆成 **T3-A**（packaging/workflows，与 T1/T2 并行，12 分钟，builder3）与 **T3-B**（README/CHANGELOG 数字，等合入后 10 分钟，builder3）——不再占 builder2 的串行链。R1 整项移出本轮（见 C4）。每个任务都写了「超时砍单表」 |
  | C2 P1 两个 E2E 共用 9222 会互相打断 | T1 = **9222**、T2 = **9223**、tester = **9224**（三个独立 profile，本轮实测三个端口都通）。所有 e2e 脚本都读 `process.argv[2]`，所有命令都写成 `node .tmp/reset.mjs <端口> && node .tmp/e2e-….mjs <端口>`；脚本里禁止再写死 `9222`。报告必须写「本任务端口 = N」 |
  | C3 P1 P0 的回归锁没锁住根因 | `trash.ts` 新增 `export function shouldWriteCurrent(text: string \| null): boolean`，`deleteFileWithText` 用它；`trash.test.ts` 从 4 条加到 **6 条**（`null → false`、`'' → true`）。另加两条可复现的静态断言：`src/lib/trash.ts` 里 `?? ''` 必须 0 命中、`shouldWriteCurrent` 必须 2 处（定义 + 调用）。回归锁落进 `npm test` |
  | C4 P1 R1 的「reset 绕开陈旧模块」前提不成立 | R1 移出本轮：§2 改成「本轮不做 + 结论 UNVERIFIED + 理由与实测数字」。计划正文里「reset 绕开陈旧模块」改为「reset 只关旧页面，绕不开服务端旧模块」。R1 进 §3 待办池，交给允许重启 dev server 的轮次 |
  | C5 P2 深色面板只打印不断言 | T1 的 `StatsDetail.tsx` 行内 `style` 只用 `var(--paper-raised)` / `var(--panel)` / `var(--ink)` / `var(--line)`，不写死十六进制（验收 6 有 grep 断言）；tester 补一条深色断言：`data-theme=dark` 下面板 `backgroundColor` 三通道都 < 80 |
  | C6 P2 Escape 闭包依赖没写 | T1 实施步骤 5 写死：把 `statsDetail` 加进 `App.tsx:3599-3617` 的依赖数组；并写明**不要动** `:3448` 那个现无依赖的 `sourceConfirm` 分支 |
  | B1 `ci.yml` 行号 | 复核后**计划原行号是对的**：`ci.yml:96` 是 `- name: Build NSIS installer`、`:97` 是 `run: … installer.ps1`、`:99` 才是 Checksums。审查的「:94-95」不成立，本版不改行号；新增的 portable 步骤插在 `:97` 之后、`:99` 之前 |
  | B2 README 派生数字 | T3-B 必须同句重算三处：`README.md:96` 的 285,838、`−21.7%`、`余 162 B`；`:98` 的「约 888 KB」；`:114` 的「248 条」。`README.md:78` 的 21/18 与 typora 26/17 仍推迟，T3-B **不许顺手改一半** |
  | B3 `entries()` 会产目录句柄 | 收集条目时只收 `handle.kind === 'file'`（写进 T2 改动表与注释），验收加静态 grep；纯函数 `pickTrashSource` 的入参就只剩 `{name,size}` |
  | B4 源码模式字数仍会因链接跳变 | 验收 ⑥ 与报告口径都限定为「修掉 frontmatter 引起的跳变」；`[文字](https://…)` 这类链接目标的残留跳变写进 §7 UNVERIFIED 与风险，不写「两种模式完全一致」 |
  | B5 move 分支没有副本可保留 | 读回 0 字节校验**只在 `restored.mode === 'copy'` 分支做**；move 分支的前置保证是 `pickTrashSource` 只选非空源（**revision 3 的 R4 已把这条二次读回整体删除，本行作废**） |
  | B6 省 2,778 B 不是结论 | T1 的回收量只以 `build-a` 实测为准；计划不把 2,778 B 写成预期结论，门槛仍是实测差值 |

- **本轮只读复核（本代理，不改产品代码）**：CDP 9222–9226 五个端口都返回 `Edg/157.0.4341.46`（`curl -s http://127.0.0.1:<port>/json/version`），9223 可用；`GET http://localhost:5175/src/App.tsx` → 584,375 B、`tooLargeNote` **2 处**，磁盘 `src/App.tsx` 192,487 B、`tooLargeNote` **3 处**（C4 成立）；`ci.yml:96-97` 确为 installer 步骤（B1 不成立）；`deleteFileWithText` 全仓只有 `deleteDocumentToTrash` 一个调用点（`src/lib/trash.ts:305`）；`src/lib/wordcount.test.ts` 现有 8 个 `test(`；`.tmp/e2e-r29-t1t3.mjs:5`、`.tmp/e2e-r29-tester.mjs:6` 已有 `process.argv[2]` 端口约定可直接抄。
- 轮次参数：round=30，nn=30；报告目录 `docs/iteration/round-30`；dev server `http://localhost:5175`（不重启）。**端口分配**：T1=9222、T2=9223、tester=9224（与调度提示冲突时以调度提示为准，但**每个代理必须不同端口**）。
- 输入：`docs/iteration/round-30/findings-bug.md`、`findings-typora.md`、`findings-ship.md`（三份全读）、`plan-review.md`、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`（第 4、8 节）、`git log -8`（HEAD `11fdff6`，工作树只有 `docs/iteration/STATE.md` 修改与 `docs/iteration/round-30/`、`shots/round-30/` 未跟踪）。
- 版本纪律：**本轮不发版**。不改 `package.json` 的 `version`；CHANGELOG 写进 `## Unreleased`。不 push、不改 `release/`。
- 全局约束：首屏 gzip ≤286,000 B（当前 285,838，余 **162 B**）；不加运行时依赖；缓存只写 `.sidelight/`。

## 0. 本轮取舍

| 候选 | 决定 | 理由 |
| :--- | :--- | :--- |
| 第 29 轮 T2 状态栏字数明细（P1，产品负责人点名） | **做 = T1** | `STATE.md:124`、`CHANGELOG.md:7` 明确留待本轮；finder-typora 2.1 实测点击无任何 DOM 变化 |
| 删除干净文件后撤销丢数据（P0，数据丢失） | **做 = T2** | 严重度最高，且是 1 个文件的小改；与 T1 文件不重叠，可并行 |
| 安装器 FileVersion 写死 + 发布流水线无门禁（S1/S2，P1） | **做 = T3** | 两行 + 两条 workflow 行，0.32.1 已把 0.31.1.0 发出去，必须止血。拆成 T3-A（并行，纯 packaging/workflows）与 T3-B（合入后写数字），不占 builder2 的串行链 |
| 超大文件提示（R1，第 29 轮遗留复验） | **本轮不做** | dev server 交付的模块仍是旧的（C4，实测 2 处 vs 磁盘 3 处），本轮禁止重启，测不到；直接记 UNVERIFIED，进待办池 |
| `.outline*` 懒 CSS 搬移（上轮 T3 剩余） | **跳过** | 调度明确可跳过；且 T1 的懒加载回收已覆盖体积收益 |
| 表格列宽拖拽（P1）、图片落盘规则（P1） | **不做，登记第 31 轮** | 都是 M 级；列宽必须与保真剥离同轮（`findings-typora.md:133`），本轮容量不够 |
| Mermaid、代码块高亮、查找选项、剪贴板双向、自动配对 | **不做** | 体积（首屏余 162 B）或 P2；Mermaid 已实测 163 KB gzip，是产品负责人决策项（`findings-typora.md:145-164`） |
| `docs/typora-gap.md` 过期修正（26 有 / 17 缺） | **不做，登记** | 纯文档，finder 已给全量核对表；与 S6 的 README 数字一起在第 31 轮一次改完 |

排序说明：调度明确「第 29 轮的 T2（字数明细）排第一」，本计划从命。按角色规则的「数据安全优先」，P0 的删除撤销修复放在 T2 位——两项**同轮交付**，文件与执行代理互不重叠（见第 4 节），不影响落地。

## 1. 任务表

| id | 标题 | 优先级 | 预估（硬线 35 分钟） | 执行代理 | 端口 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | 状态栏字数点击弹出明细（第 29 轮 T2 遗留）+ 首屏字节回收 | P1，用户可见 | **30 分钟**（硬线 35） | builder | 9222 |
| T2 | P0：删除干净文件后撤销恢复 0 字节且毁掉回收站副本 | P0，数据安全 | **30 分钟**（硬线 35） | builder2 | 9223 |
| T3 | 发布口径与门禁：安装器 FileVersion 变量化、release 补测试/体积门、README/CHANGELOG 数字 | P1，安装/发布 | T3-A **12 分钟**（与 T1/T2 并行）+ T3-B **10 分钟**（合入后） | builder3 | — |
| — | T1 的 7 组 e2e、导出回归、深色断言、选区截图、T2 交付物核对（独立验收，见 §5） | — | **33 分钟**（硬线 35） | tester | 9224 |

**工时账（为什么现在都在 35 分钟内）**

| 代理 | 干什么 | 分钟 |
| :--- | :--- | :--- |
| builder（T1） | 回收 2 处改动 + `build-a`/measure（7）｜`countSentences` + 3 单测（4）｜`StatsDetail.tsx`（6）｜`StatusBar` + `styles.css`（3）｜`App.tsx` 六处（6）｜`build-b`/measure（2）｜两张截图（2） | 30 |
| builder2（T2） | 修前跑现有脚本存 log（3）｜`shouldWriteCurrent` + 6 条单测（7）｜`trash.ts` 行为改动（10）｜`package.json` + `tsc`/`npm test`（4）｜裁剪并跑 e2e + 1 张截图（6） | 30 |
| builder3（T3-A） | `installer.nsi` 两行 + `installer.ps1` 断言（6）｜dry-run 验（3）｜两个 workflow 三行（3） | 12 |
| builder3（T3-B） | README 三处数字 + 两句能力（6）｜CHANGELOG 一条（4） | 10 |
| tester | 门禁：`tsc` + `npm test` + `measure --dir dist`（build 用根代理批次间那次，只核 `dist/` 新鲜度，过期才自己跑，+2）（4）｜T1 的 e2e 脚本 7 组断言（12）｜导出回归：跑 `scripts/export-acceptance.mjs`（2）｜深色断言 + 选区截图 + 还原被覆盖的历史截图（3）｜T2 交付物核对：before/after 日志 + 根代理复跑日志 + `git diff` + 2 条 grep（2）｜`scripts/keyboard-acceptance.mjs`（3）｜写 `test.md`（4）｜收尾：核 README/CHANGELOG 数字 + 改 `AGENTS.md` §3/§6 + commit（3） | 33 |

**超时砍单表**（到硬线就按表砍，砍了写进报告，不许把半成品当完成）

| 任务 | 先砍（按顺序） | 不许砍 |
| :--- | :--- | :--- |
| T1 | ① 体积回落的追加步骤（只留 `SaveDialog` 一步，见风险 2）② 深色截图（交 tester 补拍）③ 首屏回收——砍了必须实测 `build-b` 仍 ≤286,000，否则 T1 判 FAIL 上报 | 面板产品代码、3 条单测、`build-b` measure |
| T2 | ① `.tmp/e2e-r30-t2-trash.mjs` 的截图（交 tester 补拍）② e2e 脚本裁剪——退化成直接跑现有 `.tmp/e2e-r30-verify.mjs`（只需改端口行） | `trash.ts` 三处行为改动、6 条单测、`?? ''` 静态断言 |
| T3-A | ① `installer.ps1` 的 820,000 目标线打印（只留版本断言） | `installer.nsi` 两行、三个 workflow 行 |
| tester | ① `scripts/keyboard-acceptance.mjs`（记「未跑」并写理由）② 导出回归的 md/txt 两种（只留 HTML）③ 深色断言（只留截图，断言记 UNVERIFIED） | T1 的 e2e ①–⑤ 与 ⑦、`npm test`、`node scripts/measure-first-screen.mjs --dir dist`、写 `test.md`、commit |

---

## T1 · 状态栏字数点击弹出明细 + 首屏字节回收

### 为什么

- 第 29 轮计划里的 T2 **整项未实现**（`docs/CHANGELOG.md:7`、`STATE.md:124`），产品负责人点名。
- 实测现状：`.status-left` 是 `SPAN`，文案「56 字 · 阅读约 1 分钟」，无按钮、无 `aria-expanded`；点击前后 `body` 元素数都是 91，弹出层 0 个（`findings-typora.md:25`，`.tmp/e2e-r30-typora.json` → `steps.wordcountClick`）。
- 数据侧已就绪：`src/lib/wordcount.ts:47-57` 已算 `cjk`/`words`/`chars`/`paragraphs`/`minutes`，只缺「句」与「选区内」。
- 顺带修 finder-bug 第 2 条（P2）：同一篇正文在编辑 / 源码视图间字数从 11 跳到 13，多出的 2 个词来自 frontmatter（`findings-bug.md:57-81`，`src/App.tsx:4746`）。**只修 frontmatter 这一半**，链接目标的残留跳变见风险 6。

### 改动文件

| 文件 | 改什么 |
| :--- | :--- |
| `src/lib/wordcount.ts` | 新增 `export function countSentences(text: string): number`。**不改 `TextStats`**：`wordcount.test.ts:33,66` 有 `deepEqual` 全字段断言，且加字段会让每次 `setStats` 多做一次全文切句 |
| `src/lib/wordcount.test.ts` | 末尾补 3 条 `test()`（现有 8 条 → 11 条）：中英混排句数、只按换行分段、空串 0 句 |
| `src/components/StatusBar.tsx` | 只把 `{formatStats(stats)}`（`:33`）换成 `<button type="button" className="stats-trigger" aria-haspopup="dialog" aria-expanded={statsOpen} onClick={onStatsClick}>`；`元数据 / 保存到 / 草稿已恢复 / 自动保存` 四个 chip **保持为兄弟节点**，不包进按钮。新增两个 props：`statsOpen: boolean`、`onStatsClick: () => void` |
| `src/components/StatsDetail.tsx`（新） | 懒加载面板。props：`{ text: string; selection: string; onClose: () => void }`。内部用 `countText` + `countSentences` 渲染 `<dl>`。**样式写成行内 `style` 常量，且颜色/底/边只用主题变量**：`background: 'var(--paper-raised)'`、`color: 'var(--ink)'`、`border: '1px solid var(--line)'`、表头 `var(--ink-faint)`；**不写任何十六进制色值**（`Outline.tsx:46,58` 只写布局，不能照抄它「不写颜色」的做法，深色下会变白块）。`useEffect` 里监听 `document` 的 `mousedown` 实现点外关闭，`target.closest('.stats-trigger')` 时忽略（否则与触发按钮的 toggle 互相打断）。`role="dialog"`、`aria-label="字数明细"`、`id="stats-detail"` |
| `src/App.tsx` | ① `const StatsDetail = lazy(() => import('./components/StatsDetail.tsx').then(...))`（放在 `:31-39` 那组懒加载旁边）；② `const [statsDetail, setStatsDetail] = useState<{text:string; selection:string} \| null>(null)`；③ `openStatsDetail`：源码模式取 `splitFrontmatter(sourceText).body`，否则取 `editor.state.doc.textContent`；选区取 `editor.state.doc.textBetween(from, to, '\n')`，折叠时为 `''`；再点触发按钮则关闭；④ `<StatusBar>` 传 `statsOpen` / `onStatsClick`（`:4745`）；⑤ 面板渲染在 `<StatusBar>` **之后、不是 footer 内部**（见风险 1），外包 `<Suspense fallback={null}>`；⑥ Escape 链最前面加一支（`:3426` 之前）：`if (statsDetail !== null) { setStatsDetail(null); document.querySelector<HTMLElement>('.stats-trigger')?.focus(); return }`，**并把 `statsDetail` 加进 `:3599-3617` 的依赖数组**（对象身份只在开关时变，重订阅可接受；不加依赖这个分支永远读到初始 `null`，Esc 必失灵）。**不要动** `:3448` 那个现无依赖的 `sourceConfirm` 分支；⑦ `:4746` 源码模式字数改成 `countText(splitFrontmatter(sourceText).body)`（修 P2 跳变；`splitFrontmatter` 已在 `:67` 导入） |
| `src/styles.css` | 只加 `.stats-trigger` 约 5 行（`background:none; border:0; padding:0; font:inherit; color:inherit; cursor:pointer;`）+ `:focus-visible` 焦点环（用 `var(--ink-faint)`，不写死颜色）。面板样式不写这里 |
| `src/App.tsx`（回收，同一任务） | 首屏回收：`PreviewPane`（2,165 B）改 `React.lazy` + `<Suspense fallback={null}>` 包住 `:4639`。**必须写成** `const PreviewPane = lazy(() => import('./components/PreviewPane.tsx').then((m) => ({ default: m.PreviewPane })))`，并删掉 `:26` 的静态具名 import（R6：`PreviewPane.tsx:32` 是 `export function`，没有 default，照字面写 `lazy(() => import(...))` 会在第一次切预览时抛「module … has no default export」，`Suspense` 不接错误 → 停在白屏，正是风险 4 担心的形状）；`exportAs`（`:3772-3816`）里把 `exportName` / `buildHtmlDocument` / `buildPlainText` 改成 `const { … } = await import('./lib/export.ts')`，并删掉 `:63` 的静态 import。理由：`PreviewPane.tsx:5` 静态 import 了 `renderFootnotes`/`renderFrontmatter`，把 `export.ts`（6,181 B）一起钉在主 chunk；两处都改成按需后 `export.ts` 与 `PreviewPane` 一起离开首屏 |

### 实施步骤

1. **先回收、先测量**（不要先写面板）：按上表最后一行改 `PreviewPane` 懒加载与 `export.ts` 动态导入；`npx tsc --noEmit` 通过后跑
   `npx vite build --outDir .tmp/build-a && node scripts/measure-first-screen.mjs --dir .tmp/build-a`。
   基线 285,838 B。判定：省 ≥300 B → 继续；省 <300 B → **只追加一步** `SaveDialog` 懒加载（`pendingConfirm` 非空才渲染）再量一次，仍 <300 B 就带着实测差值继续，不许堆更多回落步骤（审查 C1/B6：这条链是本任务超时的主因）。
2. `wordcount.ts` 加 `countSentences` + 3 条测试。切句规则（写进函数注释）：先删 `\r`；按 `[。！？!?；;…]+`、`(?<=[.!?])\s+`、`\n+` 切分；`trim()` 后非空的片段计 1 句。拉丁缩写（`e.g.`）不特殊处理，记在注释里。
3. 写 `StatsDetail.tsx`。六项行：`字`（`cjk + words`，与状态栏一致）、`字符`（`chars`，注明不含空白）、`词`（`words` 拉丁词 + `cjk` 中日韩字）、`句`、`段`、`阅读`（`minutes` 分钟）；`当前选区` 一组三个值（字 / 字符 / 句）；选区为空显示「未选中文本」。颜色只用主题变量。
4. 改 `StatusBar.tsx` 与 `styles.css`（触发按钮）。
5. 改 `App.tsx`：状态、打开回调、Escape 分支 + 依赖数组、懒加载渲染、源码模式字数。
6. `npx tsc --noEmit` → `npm test` → `npx vite build --outDir .tmp/build-b && node scripts/measure-first-screen.mjs --dir .tmp/build-b`（必须 PASS）。
7. 截图：写 `.tmp/shots-r30-t1.mjs`（约 20 行，连接方式抄 `scripts/acceptance.mjs`；`const port = process.argv[2] ?? '9222'`；`node .tmp/reset.mjs 9222` 先跑）；浅色打开面板截一张，`page.evaluate(() => document.documentElement.setAttribute('data-theme','dark'))` 后等 200 ms 再截一张，并把 `getComputedStyle(panel).backgroundColor` 打印进日志（tester 用同一值断言）。
8. **不做 e2e、不跑导出回归**（§5 交 tester）；不改 README / CHANGELOG（T3-B 统一写，避免同文件冲突）。

### 验收标准（可执行，全部由 builder 自测）

1. `npx tsc --noEmit` 退出码 0。
2. `npm test` 全绿，`src/lib/wordcount.test.ts` 从 8 条变 11 条（3 条新句子断言）。
3. `node scripts/measure-first-screen.mjs --dir .tmp/build-a`：打印回收后 gzip 与相对 285,838 的差值；差值必须 ≥300 B（省不到就按步骤 1 的单步回落，仍不到就如实写报告）。
4. `node scripts/measure-first-screen.mjs --dir .tmp/build-b`：`PASS`，gzip **≤286,000**；报告里另给两个差值（回收后、加成面板后，各自相对 285,838）。首屏集合里不得出现 `katex`/`lazy`（脚本自己会 exit 1）。
5. 静态断言（三条命令，报告贴输出）：
   - `Select-String -Path src/App.tsx -Pattern "import\('./lib/export.ts'\)"` 命中 1 行（动态导入）；`Select-String -Path src/App.tsx -Pattern "from './lib/export"` 命中 0 行（静态导入已删）。
   - `Select-String -Path src/components/StatsDetail.tsx -Pattern '#[0-9a-fA-F]{3,8}\b'` 命中 0 行（行内样式不写死颜色，C5）。
   - `Select-String -Path src/styles.css -Pattern '\.stats-trigger'` 命中 ≥1 行。
6. 两张截图存在且能看出面板：`shots/round-30/r30-t1-stats-light.png`（浅色，面板打开）、`shots/round-30/r30-t1-stats-dark.png`（`data-theme=dark`，面板打开），日志里有深色面板 `backgroundColor` 的计算值。
7. `git status --short` 里 `release/`、`dist/` 无变化；`package.json` 的 `version` 仍是 `0.32.1`。

### 门禁命令

```bash
npx tsc --noEmit
npm test
npx vite build --outDir .tmp/build-a   # 只回收后
npx vite build --outDir .tmp/build-b   # 全量完成后
node scripts/measure-first-screen.mjs --dir .tmp/build-a
node scripts/measure-first-screen.mjs --dir .tmp/build-b
node .tmp/reset.mjs 9222 && node .tmp/shots-r30-t1.mjs 9222
node scripts/keyboard-acceptance.mjs http://localhost:5175   # R2：URL 必须显式传，默认是禁用的 5173
git checkout -- shots/round-05/                              # 还原上面那条脚本覆盖的三张历史截图
```

不需要 `npm run roundtrip`：本任务不碰 Tiptap 配置与 Markdown 序列化（`export.ts` 只是改成动态导入）。

### 风险

1. **面板不能放进 `.status-bar`**：8 个脚本用 `page.textContent('.status-bar')` 取整栏文本再正则抓 `([\d,]+) 字` —— `scripts/qa10.mjs:64,67`、`qa11.mjs:32`、`qa16.mjs:33,115`、`qa.mjs:106`、`host-save-acceptance.mjs:100`、`diag-longdoc-single.mjs:36`、`diag-longdoc-annot.mjs:39`。面板若嵌进 footer，打开后明细里的数字会被抓成「字数」。面板必须是 App 里 footer 的**兄弟节点**。
2. **体积回落只留一步**：回收后 <300 B 时只加 `SaveDialog` 懒加载（3,509 B），再加就砍功能不许加回落步骤。硬线 286,000 不越过。
3. **选区内计数取不到**：点击状态栏会把 DOM 焦点移出正文，但 ProseMirror 的 `state.selection` 保留；若 tester 的 ⑤ 实测变成折叠选区，改成在 `onSelectionUpdate` 里把 `textBetween` 结果存进 ref（只对非空选区算），再重跑。
4. **懒加载预览**：首次切预览多一次本地 chunk 请求，`fallback={null}` 会有一帧空白；本地回环毫秒级，允许一帧空白，但不得出现「预览白屏不恢复」。
5. **Tab 顺序多一站**：状态栏新增 1 个可聚焦按钮；`scripts/keyboard-acceptance.mjs:109-140` 只测正文前后两下 Tab，不受影响——T1 自己跑一次该脚本确认。**命令必须写全**（R2）：`node scripts/keyboard-acceptance.mjs http://localhost:5175`（脚本默认目标是禁用的 `5173`，见 `:6`；CDP 默认 `9222` 正好是本任务端口）。跑完 `git checkout -- shots/round-05/`：该脚本会覆盖三张已跟踪的历史截图（`:144`、`:260`、`:302`），不要带进 commit。
6. **源码模式字数的残留跳变**（报告口径，B4）：本次只剥 frontmatter；带 `[文字](https://…)` 的文档在编辑/源码间仍会跳（编辑模式只算显示文字，源码模式把 URL 算成拉丁词）。报告只能写「修掉 frontmatter 引起的跳变」，不许写「两种模式完全一致」；这条登记进 §7。

---

## T2 · P0：删除干净文件后「撤销」恢复 0 字节，并删掉回收站里的完整副本

### 为什么

- `findings-bug.md:11-46`，2/2 次复现（两个文件、两种先后顺序）：干净文件删除 → 撤销 → 根文件变 0 字节，`.sidelight/trash/` 两个条目**被一起删除**（`trash: []`），用户没有任何恢复途径。脏文件删除后撤销正常，所以只有「删除时文档是干净的」触发。
- 现状证据：`deleteFileWithText` 无条件写 `.current.md`（`src/lib/trash.ts:177-189`）；`restoreFromTrash` 优先取 `${trashName}.current.md`（`src/lib/trash.ts:346-352`）；`restoreDocumentFromTrash` 在 `restored.ok` 后无条件删两个条目（`src/lib/trash.ts:321-330`）。
- 这是一条 `README`「删除可撤销」承诺的破口，属于数据丢失，本轮必须修。

### 改动文件

| 文件 | 改什么 |
| :--- | :--- |
| `src/lib/trash.ts` | ① 新增 `export function shouldWriteCurrent(text: string \| null): boolean { return text !== null }`；`deleteFileWithText(... text: string \| null ...)`：**删掉 `:166` 的 `const current = text`**，把 `:177-189` 整段（含新加进块内的 `const current = text` 与 `const currentName = …`）放进 `if (text !== null && shouldWriteCurrent(text)) { … }`。`text !== null &&` 是给 TS 收窄用的（单写谓词不收窄）；`current` 只能在块内取，块外不得再留（R3：留着它类型是 `string \| null`，`:181` 的 `writer.write(current)` 会报 `Type 'null' is not assignable`）；② `deleteDocumentToTrash` 的 `:305` 改成直接透传 `currentText`（删掉 `?? ''`）；③ 选源抽成纯函数 `export function pickTrashSource(entries: Array<{ name: string; size: number }>, trashName: string): string \| null`——`${trashName}.current.md` 存在且 `size > 0` 才优先，否则 `${trashName}`，都没有返回 `null`；④ `restoreFromTrash`：用 `for await (const [name, handle] of trashDir.entries())` 收集条目（`getFile()` 取 `size`），**只收 `handle.kind === 'file'`**（目录句柄调 `getFile()` 会抛，B3），再用 `pickTrashSource` 选源；copy 分支删掉的是**实际选中的那个名字**（`sourceName`），不是写死 `trashNameValue`；⑤ `restoreDocumentFromTrash`：**不做二次读回**（R4：入参 `node.handle` 是删除前的旧句柄，恢复本身靠 `parentForPath` 重新取，`:356-358`；真实 FSA 上对旧句柄 `getFile()` 抛 `NotFoundError`，而「读回抛错按失败处理」会把每次成功恢复报成失败并留下副本）。非空保证放在源选择层（`pickTrashSource` 要求 `.current.md` 的 `size > 0` 才入选），完整性保证用 copy 分支既有的 sha256 双读（`:371-376`）。**不要**在 copy 分支加 `buffer.byteLength === 0` 的硬失败：真实盘句柄上 `move()` 是否可用是 UNVERIFIED（`STATE.md:95` 只有 OPFS 实测），copy 分支可能是真实用户路径，这条会把「恢复本来就是空文件」变成永远失败（空文档是合法内容，删了要能撤回）。`restored.ok` 才执行原来的两条 `removeEntry` |
| `src/lib/trash.test.ts`（新） | **6 条** `test()`：`pickTrashSource` 4 条（只有备份 → 备份；备份 + 0 字节 `.current.md` → 备份，本轮 P0 的回归锁；备份 + 非空 `.current.md` → `.current.md`；都缺 → `null`）+ `shouldWriteCurrent` 2 条（`null → false`、`'' → true`，空串仍写，保持「删空正文」的既有取舍） |
| `package.json` | `test` 脚本末尾追加 `&& node --experimental-strip-types src/lib/trash.test.ts`（17 个文件 → 18）。**不改 `version`**（`:14` 现在是 17 条 `&&` 串联） |
| `.tmp/e2e-r30-verify.mjs` | **只改第 5 行**：`const port = process.argv[2] ?? '9222'`，连接改 `http://127.0.0.1:${port}`（C2；现有脚本写死 9222，两个代理同时跑会互相关掉页面） |
| `.tmp/e2e-r30-t2-trash.mjs`（新） | 从 `.tmp/e2e-r30-verify.mjs` **复制第 1–2 节 + `## errors`**（`:23-67` 加头部，约 60 行），删掉大文件/大纲/加粗三节；保留 `## after delete clean` / `## after undo clean` / `## after delete dirty` / `## after undo dirty` 四行 JSON 证据。不重写断言逻辑 |

**不改 `src/App.tsx`**：`:2321` 的 `wasActive && dirtyRef.current ? currentMarkdown() : null` 语义是对的（干净文件传 `null`，非活动文件也传 `null`），bug 全在下游把 `null` 当空串写盘。

### 实施步骤

1. **先证明会红再修**：`node .tmp/reset.mjs 9223 && node .tmp/e2e-r30-verify.mjs 9223`，输出存 `.tmp/e2e-r30-t2-before.log`（改端口行之后跑，见改动表）。修前应看到 `trash` 两个条目、`restored` 为空。
2. 写 `src/lib/trash.ts` 的 `shouldWriteCurrent` 与 `pickTrashSource` + `src/lib/trash.test.ts` 6 条，先跑红（`pickTrashSource` 不存在的 4 条会失败），再补实现跑到绿。
3. 改 `deleteFileWithText`（删 `:166` 的 `const current`、`text: string | null`、整段进守卫块）、`deleteDocumentToTrash:305`（透传 `currentText`）、`restoreFromTrash`（`entries()` 收文件条目 + `pickTrashSource` 选源 + copy 分支删源名）、`restoreDocumentFromTrash`（只做条件清理，**不读回**）。
4. `package.json` 加测试文件；`npx tsc --noEmit`（这一步会同时暴露 R3 的 `current` 未收窄）；`npm test`；静态核对：`Select-String -Path src/lib/trash.ts -Pattern "\?\? ''"` 必须 **0 命中**，`shouldWriteCurrent` **2 处**，`kind === 'file'` **1 处**。
5. 裁剪 `.tmp/e2e-r30-t2-trash.mjs`（复制 1–2 节）；`node .tmp/reset.mjs 9223 && node .tmp/e2e-r30-t2-trash.mjs 9223 | Tee-Object -FilePath .tmp/e2e-r30-t2-after.log`；截图 `shots/round-30/r30-t2-trash-undo.png`（撤销后根文件正文可见）。
6. 报告写「本任务端口 = 9223」，贴 `## after delete clean` / `## after undo clean` 两行原始 JSON，并确认 `.tmp/e2e-r30-t2-before.log`、`.tmp/e2e-r30-t2-after.log` 两份日志都在（tester 的 §5-5 只读这两份 + 根代理那份，不重跑，R1）。

### 验收标准（可执行）

1. `npm test` 全绿；`src/lib/trash.test.ts` 6 条通过。T2 单独跑时 `ℹ pass` 求和是 251 + 6 = **257**、文件 17 → 18；T1 合入后轮末应为 251 + 6 + 3（T1 的 3 条句子）= **260**（轮末以 tester 那次输出为准，写进报告）。
2. 静态断言（三条命令，贴输出）：`Select-String -Path src/lib/trash.ts -Pattern "\?\? ''"` 命中 0；`Select-String -Path src/lib/trash.ts -Pattern 'shouldWriteCurrent'` 命中 2（定义 + 调用）；`Select-String -Path src/lib/trash.ts -Pattern "kind === 'file'"` 命中 1（`entries()` 只收文件句柄，B3）。
3. `.tmp/e2e-r30-t2-trash.mjs 9223` 输出必须同时满足：
   - a) 干净文件（`# 干净\n\n干净的正文。\n`）删除后，`.sidelight/trash/` 里**只有 1 个条目**（`<时间戳>-<随机>-干净.md`），没有 `.current.md`；
   - b) 点「撤销」后，根目录 `干净.md` 内容**逐字节等于**删除前内容（`等于 "# 干净\n\n干净的正文。\n"`，非空），trash 清空；
   - c) 脏文件删除后 `.current.md` 存在且非空；撤销后正文含未保存的补充（旧行为回归）；
   - d) 控制台 `error` 0、`pageerror` 0。
4. 已知取舍（写进报告，不判 FAIL）：整篇删空（正文为空但 dirty）的文档删除再撤销，会恢复成磁盘原文而不是空文件——因为选源只看 `.current.md` 是否非空；这保数据，不保「空」。
5. 静态断言：`src/lib/trash.ts` 的 `removeEntry(`${trashNameValue}.current.md`)` 只在 `restored.ok` 为真之后（人工 review + 报告里贴 `restoreDocumentFromTrash` 整段）。

### 门禁命令

```bash
npx tsc --noEmit
npm test
node .tmp/reset.mjs 9223 && node .tmp/e2e-r30-verify.mjs 9223        # 修前证据
node .tmp/reset.mjs 9223 && node .tmp/e2e-r30-t2-trash.mjs 9223      # 修后验收
```

不需要 `npm run roundtrip`：不涉及 Markdown 序列化。

### 风险

1. **真实目录句柄未验**（与第 29 轮同一限制）：假 FSA 没有权限模型，`move()` 分支、只读目录、文件占用的行为测不到；修复只依赖与既有实现相同的调用序列。报告里按 `findings-bug.md:128` 的口径写 UNVERIFIED 与补测方法（真实文件夹手测一次删除 + 撤销）。另：假 FSA 有 `move()`（`.tmp/r30-fsa.mjs:49`），本轮 e2e 永远走 move 分支，**copy 分支跑不到**（§8.9）。
2. **历史垃圾条目**：用户机器上已存在的 0 字节 `.current.md` 不会被自动修（没有用户可见入口），但新逻辑在恢复时会跳过它并改用备份——这正好是 3-b 的核心断言。不要额外写迁移脚本（超范围）。
3. **缓存搬回顺序**：`restoreCachesFromTrash` 在 `restored.ok` 才跑；恢复失败时草稿/批注缓存仍留在 trash 里，这是刻意保留，报告要写明。
4. **`entries()` 的目录句柄**（B3）：忘了 `handle.kind === 'file'` 过滤，在条目含目录时会抛 `NotAllowedError`/`TypeError`。验收 2 的第三条 grep 只能证明这行代码在，运行时行为仍要人工看一遍。
5. **两处收窄**（R3）：① 只写 `shouldWriteCurrent(text)` 不让 TS 收窄，`text` 仍是 `string | null`；② `:166` 的 `const current = text` 在守卫块之前，签名改成 `string | null` 后它也是 `string | null`，`:181` 的 `writer.write(current)` 必报 `Type 'null' is not assignable`。按改动表 ① 把 `current` 一起搬进块内，两处都过。

---

## T3 · 发布口径与门禁（T3-A 并行 / T3-B 最后做）

### 为什么

- S1（P1）：`packaging/installer.nsi:34,37` 写死 `0.31.1.0`，本地产物 `FileVersion=0.31.1.0` 而 `ProductVersion=0.32.1`（`findings-ship.md:95-101`）；`AGENTS.md` §8 记过同一个坑，当时只改了 `ProductVersion`。
- S2（P1）：`release.yml` 两个构建 job 只跑 `npm run build`（`:80`、`:142`），没有 `npm test`、没有 `measure-first-screen`；`packaging/portable.ps1` 也不在 CI（`ci.yml:96-97` 只跑 installer.ps1，`:99` 起是 Checksums）。
- S6（P2，本轮只修与本轮数字相关的部分）：`README.md:114` 写 248 条（实际 251）、`README.md:96` 首屏 285,838 与「−21.7%」「余 162 B」、`README.md:98` 主 chunk 写「约 888 KB」（实测 895,849 B）。
- 本条不改任何 `src/` 文件，所以 **T3-A 与 T1/T2 并行**；**T3-B 的数字必须等 T1/T2 合入后**再写。

### 改动文件

| 段 | 文件 | 改什么 |
| :--- | :--- | :--- |
| T3-A | `packaging/installer.nsi` | `:34` → `VIProductVersion "${APPVERSION}.0"`；`:37` → `VIAddVersionKey /LANG=2052 "FileVersion" "${APPVERSION}.0"`。该文件带 UTF-8 BOM，改完必须核对 BOM 还在 |
| T3-A | `packaging/installer.ps1` | ① makensis 前算出 `$out`（`-AssocDryRun` → `.tmp\assoc-dryrun-setup.exe`，正常路径 → `release\Sidelight-<版本>-win-x64-setup.exe`）；② makensis 之后、分叉之前统一断言 `[System.Diagnostics.FileVersionInfo]::GetVersionInfo($out).FileVersion -eq "$version.0"`，不等则打印实测值并 `exit 1`（dry-run 也走这条，这样发版前本地就能验）；③ 打印 `target=820000 gap=<setup 字节 − 820000>`，超过只 `Write-Warning` 不 exit（S3a 的真实数字进看板）；④ 保留 BOM |
| T3-A | `.github/workflows/release.yml` | `windows-build` job 的 `- run: npm run build`（`:80`）之后加 `- run: npm test` 与 `- run: node scripts/measure-first-screen.mjs`；`macos-build` job 的 `- run: npm run build`（`:142`）之后只加 `- run: node scripts/measure-first-screen.mjs`（`npm test` 已在 `ci.yml:40` 的 ubuntu gate 跨平台跑过，不给发版加未验证的 macOS 测试路径） |
| T3-A | `.github/workflows/ci.yml` | `windows-host` job 的 installer 步骤（`:96-97`）之后、`Checksums`（`:99`）之前加 `- run: powershell -ExecutionPolicy Bypass -File packaging/portable.ps1` |
| T3-B | `README.md` | 只改数字与新增两条能力：`:96` 同一句里重算**三个数**（首屏 gzip 实测值、相对 364,960 的百分比、286,000 − 新值的余量）；`:98`「约 888 KB」→ 实测主 chunk 字节；`:114`「17 个文件、248 条断言」→ 实测（预计 18 文件 260 条）；安装包那行补「最新发布资产 824,209 B，超内部预算 820,000 B 4,209 B，距硬线 850,000 B 余 25,791 B」（S3a）；「现在能做什么」加「状态栏字数明细（点字数看字符/词/句/段/阅读时间与选区内计数）」与「删除后撤销恢复原内容」。`README.md:78` 的 21/18 项与 `docs/typora-gap.md` 一起推迟，**不动** |
| T3-B | `docs/CHANGELOG.md` | `## Unreleased（第 29 轮，未发版）` 标题改 `## Unreleased（第 29–30 轮，未发版）`，加第 30 轮条目（T1、T2、T3 各一条 + 体积/测试数字）；**不 bump 版本** |

### 实施步骤

T3-A（与 T1/T2 并行）：
1. 改 `installer.nsi` 两行；改 `installer.ps1`（版本断言 + 820,000 目标线打印）。
2. 只跑 dry-run 验证（**不要**跑正常路径，那会写 `release/`）：
   `powershell -ExecutionPolicy Bypass -File packaging/installer.ps1 -AssocDryRun`，再
   `powershell -Command "[System.Diagnostics.FileVersionInfo]::GetVersionInfo('.tmp\assoc-dryrun-setup.exe') | Select FileVersion,ProductVersion"`。
3. 改两个 workflow（YAML 缩进必须与相邻步骤一致）。
4. 自查 BOM：`node -e "console.log(require('fs').readFileSync('packaging/installer.ps1').slice(0,3).toString('hex'))"` 必须是 `efbbbf`。

T3-B（等 T1/T2 合入、根代理串行 build 之后）：
5. 跑 `npm test` 与 `node scripts/measure-first-screen.mjs --dir dist`（`dist/` 由根代理那次最终 build 产出；T3-B 自己**不跑** `npm run build`），把实测数字写进 README 与 CHANGELOG。
6. `docs/iteration/STATE.md` **不由 T3 改**：轮次表、体积数字、待办池由根代理轮末统一更新（`STATE.md:123`）。截图：本条无界面改动，不需要截图。
7. tester 收尾只核数（R1，§5-8）：拿它自己那次 `npm test`/`measure` 的输出比对 README/CHANGELOG；数字不符时**只改数字、不加条目**，两边顺序以 tester 那次实测为准。同一源码同一 Vite 版本下 `dist` 字节应一致；若差出几十字节且 `git status` 干净，说明 build 读到了不同配置，报给根代理，不要改数字凑。

### 验收标准（可执行）

1. `powershell -ExecutionPolicy Bypass -File packaging/installer.ps1 -AssocDryRun` 退出码 0，且 `.tmp\assoc-dryrun-setup.exe` 的 `FileVersion` **等于** `0.32.1.0`、`ProductVersion` 等于 `0.32.1`（脚本自己的断言 + 独立命令各验一次）。
2. `Select-String -Path .github/workflows/release.yml -Pattern 'npm test','measure-first-screen'` 各命中 ≥1 行，且都在 `windows-build` job 的 `npm run build` 之后；`Select-String -Path .github/workflows/ci.yml -Pattern 'portable.ps1'` 命中 1 行，行号在 `installer.ps1`（`:97`）之后、`Checksums`（`:99`）之前。
3. `packaging/installer.ps1` 首 3 字节 `efbbbf`；`git status --short` 里 `release/` 无任何变化。
4. README/CHANGELOG 的数字与轮末 `npm test`、`measure-first-screen` 输出逐字一致（报告里把两条命令的原始输出贴出来）；`README.md:96` 同一句里的三个派生数字自洽（286,000 − 新值 = 新余量）。
5. `package.json` 的 `version` 仍是 `0.32.1`；`git log` 无新 tag。

### 门禁命令

```bash
npx tsc --noEmit                     # 本轮没有 src 改动时也跑一次，确认 T1/T2 合并后干净
npm test
node scripts/measure-first-screen.mjs --dir dist
powershell -ExecutionPolicy Bypass -File packaging/installer.ps1 -AssocDryRun
```

### 风险

1. **dry-run 依赖**：需要 `host/bin` 五件（当前 `Sidelight.exe` FileVersion=0.32.1.0，`findings-ship.md:105`）、`dist/index.html`、`.tmp/nsis/nsis-3.11/makensis.exe`。任一缺失时 `installer.ps1` 会去 SourceForge 下载（`installer.ps1:35`，正是 S5 记录的不可靠路径）；下载失败就把本条记为 UNVERIFIED，并在报告里写「CI 上会验」，不要为了过验去改下载逻辑（超出本轮）。
2. **版本格式**：`VIProductVersion` 必须是 4 段数字，`${APPVERSION}.0` 只在版本是三段语义号时合法（当前 `0.32.1`）。预发布后缀会失败——记进 CHANGELOG 的风险行，不写代码处理。
3. **release.yml 改错会让发布卡死**：只加 `run` 行，不动 job 结构、不动 secrets、不动 tag 规则；不确定时人工比对缩进。
4. **T3-B 与 tester 的交接**：T3-B 写数字、tester 只核数并 commit（§5-8）；tester 发现数字不符时只改数字、不加条目，不重写能力描述。

---

## 2. 本轮不做：R1 超大文件提示复验（记 UNVERIFIED）

**结论：UNVERIFIED，本轮不测、不占任何代理的工时。**

- 原计划（revision 1）以为 `node .tmp/reset.mjs 9222` 能绕开 AGENTS §8 的「长开 CDP 会话执行 App.tsx 中间版本」。**这个前提不成立**：`findings-bug.md:118-124` 定位的是 **dev server 交付的模块**与磁盘不一致，不是旧页面；`reset.mjs:33-35` 只是 `context.newPage()` + `goto`，新页面请求的仍是无 `?t=` 的 `/src/App.tsx`，拿到的还是旧转换结果。
- 本轮实测（只读，2026-11-17 00:45）：`GET http://localhost:5175/src/App.tsx` → **584,375 B、`tooLargeNote` 2 处**；磁盘 `src/App.tsx` → 192,487 B、`tooLargeNote` **3 处**（`:2105` 定义、`:2112`、`:2133`）。
- 因此通过在文件树里点 6 MiB 文件得到的提示仍是旧文案（`workspace.ts:250` 的「文件太大，暂不支持（上限 5.5 MiB）。」），不代表产品没修。本轮环境明确禁止重启 dev server，测了也是 UNVERIFIED。
- 补测方法：允许重启 dev server 的轮次，重启后 `node .tmp/reset.mjs <端口>` + `.tmp/e2e-r30-verify.mjs` 第 5 节（`## bigfile`），断言提示**包含** `超过 5.5 MiB` 且**包含** `仍在`（`src/App.tsx:2105` 的 `tooLargeNote`）。该项进 §3 待办池。

## 3. 本轮不做（登记到 STATE 待办池）

1. R1 超大文件提示复验：需要重启 dev server（本轮禁止），重启后按 §2 的补测方法做。
2. 表格列宽拖拽（P1）：必须与「未动过的表格整块复用原文」的保真剥离同轮，单独一轮做。
3. 图片落盘规则 `assets/` / `<文件名>.assets/` / 相对路径（P1）：M 级，动 `src/lib/asset.ts` + `App.tsx:3818-3849`。
4. `docs/typora-gap.md` 修正（26 有 / 17 缺 + 新增 3 缺行）+ `README.md:78` 的 21/18：纯文档，与 S6 的 README 数字一起改。
5. 代码块语法高亮（P2，懒 chunk gzip ≈20,942 B 已实测）、查找大小写/整词、剪贴板双向、自动配对、Mermaid（需产品负责人定预算）。
6. `.outline*` 懒 CSS 搬移（调度可跳过）。
7. 首屏预算 286,000 是否上调（S3b 指出它已连续四版贴线，不再是「临时」）：这是对产品负责人可见承诺的修改，先登记，不自行决定。
8. 源码模式字数对 Markdown 链接目标的处理（B4 残留）：编辑/源码间仍会因 `[文字](url)` 跳变，修它要动 `countText` 口径，单独评估。

## 4. 文件所有权与执行顺序（防冲突）

| 代理 | 独占文件 | 不得触碰 | 端口 |
| :--- | :--- | :--- | :--- |
| builder（T1） | `src/App.tsx`、`src/components/StatusBar.tsx`、`src/components/StatsDetail.tsx`（新）、`src/lib/wordcount.ts`、`src/lib/wordcount.test.ts`、`src/styles.css`、`.tmp/shots-r30-t1.mjs`（新）、`shots/round-30/r30-t1-stats-{light,dark}.png` | `src/lib/trash.ts`、`package.json`、`README.md`、`docs/CHANGELOG.md`、`packaging/`、`.github/`、`.tmp/e2e-r30-*` | 9222 |
| builder2（T2） | `src/lib/trash.ts`、`src/lib/trash.test.ts`（新）、`package.json`、`.tmp/e2e-r30-verify.mjs`（只改端口行）、`.tmp/e2e-r30-t2-trash.mjs`（新）、`shots/round-30/r30-t2-trash-undo.png` | `src/App.tsx`、`src/components/`、`src/styles.css`、`README.md`、`docs/CHANGELOG.md` | 9223 |
| builder3（T3-A 后 T3-B） | `packaging/installer.nsi`、`packaging/installer.ps1`、`.github/workflows/release.yml`、`.github/workflows/ci.yml`；T3-B 另加 `README.md`、`docs/CHANGELOG.md` | 所有 `src/`、`package.json`、`release/`、`.tmp/e2e-*` | — |
| tester（独立验收） | `docs/iteration/round-30/test.md`、`.tmp/e2e-r30-t1-stats.mjs`（新）、`shots/round-30/r30-t1-stats-selection.png`；收尾只改 `AGENTS.md` §3/§6 并 commit（`README.md`/`CHANGELOG.md` 的数字由 T3-B 写、tester 只核；`STATE.md` 归根代理，见 §5-8） | 不改产品代码（`src/`、`packaging/`、`.github/`）；`README.md`/`CHANGELOG.md` 只在不符时改数字、不改条目；`STATE.md` 不动 | 9224 |

- **并行**：T1（builder，9222）、T2（builder2，9223）、T3-A（builder3，不用浏览器）三路同时开工，文件互不重叠。
- **串行**：T3-B（builder3）等 T1/T2 合入 + 根代理最终 build 之后；tester 在 T1/T2/T3 全部合入后做独立验收。
- `src/App.tsx` 只归 T1：T2 若发现必须改 App，先停下报告，不自己改。
- **并发中间态**（R5）：`npx tsc --noEmit` 与 `npm test` 读整棵树，T1 保存 `App.tsx` 的半成品瞬间会让 T2 看到不属于它的红。判据：先 `git status --short` + `git diff --stat`，看红的是不是别人名下的文件；是就等 2 分钟重跑，报告里注明「并发窗口」，不算失败。
- 构建纪律（`STATE.md:129`）：实施期间不跑 `npm run build`（不写 `dist/`）；体积实测用 `npx vite build --outDir .tmp/build-*`；最终 `npm run build` 由根代理串行跑一次。
- `dist/` 的写入顺序：T1/T2/T3-A 都不写 `dist/` → 根代理串行 `npm run build`（T3-B 抄这里的数字）→ tester 不重跑 build，只核 `dist/index.html` 的 mtime 晚于最后一次 commit（过期才自己跑，§5-1）。任何两个人都不许同时跑 `npm run build`。
- **根代理批次间多做一件事**（R1）：T2 合入后、tester 开工前，根代理用 9223 复跑一次 `node .tmp/reset.mjs 9223 && node .tmp/e2e-r30-t2-trash.mjs 9223`，输出存 `.tmp/e2e-r30-t2-root.log`（`STATE.md:123` 的批次间门禁扩到这一条 E2E）。tester 只读这份日志 + T2 自己的 before/after 日志 + `git diff`，不再自己重跑。

## 5. 独立验收（tester，端口 9224，**33 分钟**，硬线 35）

tester 只读 `plan.md` + `git diff`，自己写脚本，不信任实施报告（`tester.md:1-3`）。**收尾按 R1 拆分**（`tester.md:14-20` 的四件事仍全做，只是分工）：`README.md`/`docs/CHANGELOG.md` 的内容由 T3-B 写，tester 只核数（不符只改数字、不加条目）；`docs/iteration/STATE.md` 由根代理轮末更新（`STATE.md:123`、`AGENTS.md` §7）；tester 改 `AGENTS.md` §3/§6 并 commit。T3 的 packaging/CI 断言不重复跑（T3-A 已自验 + §6 表），tester 只在收尾确认 `git status --short` 里没有 `release/`。

**每条 E2E 前先 `node .tmp/reset.mjs 9224`。两条既有脚本必须显式传参**（默认目标是禁用的 `5173` 和 T1 的 `9222`，R2）：先 `$env:SIDELIGHT_CDP='http://127.0.0.1:9224'`，再 `node scripts/<脚本> http://localhost:5175`。这两条脚本会覆盖 4 张已跟踪的历史截图（`shots/round-05/t1-skip.png`、`t1-filemenu.png`、`t1-shortcuts.png`、`shots/round-04/t3-export.png`），跑完必须 `git checkout -- shots/round-05/ shots/round-04/t3-export.png` 还原，不许带进 commit。

1. **门禁（4 分钟）**：`npx tsc --noEmit`、`npm test`（应为 18 文件 / 260 条，以输出为准）、`node scripts/measure-first-screen.mjs --dir dist`（≤286,000）。**不跑 `npm run build`**：`dist/` 用根代理批次间那次（§4），先比 `(Get-Item dist/index.html).LastWriteTime` 与 `git log -1 --date=iso`，不新鲜才自己跑（+2 分钟，砍单表第 ① 项让位）。
2. **T1 的 e2e（12 分钟）**（新脚本 `.tmp/e2e-r30-t1-stats.mjs`，开头 `const port = process.argv[2] ?? '9224'`）：
   - ① `.status-bar` 里有 `button.stats-trigger`，初始 `aria-expanded="false"`，可见文本匹配 `/^\d[\d,]* 字/`；
   - ② `page.click('.stats-trigger')` 后出现 `[role="dialog"][aria-label="字数明细"]`，`aria-expanded="true"`，面板里 `dt` 至少 6 个且文本包含 `字 字符 词 句 段 阅读`；数值与 `countText` 期望一致（写 200 字正文，断言「字」= 200、「段」= 1）；
   - ③ 键盘：`page.focus('.stats-trigger')` → `Enter` → 面板出现；`Escape` → 面板消失、`document.activeElement.className === 'stats-trigger'`；
   - ④ 点外：打开后 `page.click('.editor')` → 面板消失；打开后**再点触发按钮** → 面板关闭；
   - ⑤ 选区内计数：`Shift+Home` 选中一行（沿用 `findings-bug.md:102` 的做法：选完等 500 ms），再点触发按钮 → 「当前选区」三个值都 >0，且选区内「字符」等于选区去掉空白后的长度；
   - ⑥ 源码模式字数（P2 回归）：写入 `---\ntitle: sample\n---\n\n中文正文 abc https://example.com/x\n\n😀😀 结束\n`，`Ctrl+/` 进源码读状态栏数字，再 `Ctrl+/` 回编辑读一次，两个数字相等（修前是 13 / 11）。报告口径只写「修掉 frontmatter 引起的跳变」；
   - ⑦ 控制台 `error` 0、`pageerror` 0（沿用各脚本 `## errors []` 打印）。
3. **T1 的导出回归（2 分钟）**：`$env:SIDELIGHT_CDP='http://127.0.0.1:9224'; node scripts/export-acceptance.mjs http://localhost:5175` → 7/7 PASS（md/html/txt 都含源码模式标记、文件名跟文档名）；再单独一条断言：切一次预览模式，出现 1 个 `.ProseMirror[contenteditable="false"]` 且含正文文本（`PreviewPane` 懒加载没坏）。**不重抄 stub**（R1 省 2 分钟）。
4. **T1 的深色断言（3 分钟）**（C5）：`data-theme=dark` 下打开面板，`getComputedStyle(panel).backgroundColor` 解析成 `rgb(...)` 后三个通道都 < 80（不是浅底）；同时截 `shots/round-30/r30-t1-stats-selection.png`（选中一行后的「当前选区」）；跑完 `git checkout -- shots/round-04/t3-export.png` 还原第 3 项覆盖的历史截图（`shots/round-05/` 那条在第 6 项之后还原）。
5. **T2 交付物核对（2 分钟，不重跑脚本）**（R1）：核三份日志的 `## after delete clean` / `## after undo clean` 两行原始 JSON 与 §T2 验收 3 的 a–d——`.tmp/e2e-r30-t2-before.log`、`.tmp/e2e-r30-t2-after.log`（T2 交付）、`.tmp/e2e-r30-t2-root.log`（根代理批次间复跑，§4）；`git diff src/lib/trash.ts` 对照改动表 ①–⑤；两条静态 grep（`?? ''` 0 命中、`shouldWriteCurrent` 2 处）。三份日志缺一份 → 自己补跑 `node .tmp/reset.mjs 9224 && node .tmp/e2e-r30-t2-trash.mjs 9224`（+2 分钟，砍单表第 ① 项让位）。
6. **回归（3 分钟）**：`$env:SIDELIGHT_CDP='http://127.0.0.1:9224'; node scripts/keyboard-acceptance.mjs http://localhost:5175`（状态栏多一个可聚焦按钮，Tab 断言在 `:109-140`）；跑完 `git checkout -- shots/round-05/`。
7. **写 `test.md`（4 分钟）**：逐条给「命令 + 原始输出 + 截图路径」；UNVERIFIED 写清哪条、为什么、怎么补测。
8. **收尾（3 分钟，只剩三件）**（R1）：① 核 `README.md`/`CHANGELOG.md` 的数字与本次 `npm test`/`measure` 输出逐字一致（不符只改数字、不加条目）；② 改 `AGENTS.md` §3 测试条数注释与 §6 当前状态；③ `git status --short` 确认 `shots/round-*` 除本轮新增外无改动、没有 `release/` → `git add -A && git commit -m "round-30: …"`，回短哈希与 `git status --porcelain`（应为空）。**不写 `STATE.md`**、不 push、不动 `release/`。

合计 4 + 12 + 2 + 3 + 2 + 3 + 4 + 3 = **33 分钟**。

## 6. 门禁与证据汇总（本轮总表）

| 命令 | 谁跑 | 端口 | 通过标准 |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | T1、T2、T3、tester、根代理 | — | 退出码 0 |
| `npm test` | T1、T2、T3-B、tester | — | 全绿；T2 单独跑 257（文件 17→18），T1 合入后 260（预计，以 tester 那次输出为准） |
| `npx vite build --outDir .tmp/build-a` + `measure-first-screen.mjs --dir .tmp/build-a` | T1 | — | 回收 ≥300 B，否则按单步回落 |
| `npx vite build --outDir .tmp/build-b` + `measure-first-screen.mjs --dir .tmp/build-b` | T1 | — | PASS，gzip ≤286,000 |
| `node scripts/measure-first-screen.mjs --dir dist` | 根代理（最终 build 后）、T3-B 抄数、tester | — | PASS，数字进 README/CHANGELOG |
| `node .tmp/reset.mjs 9222` + `.tmp/shots-r30-t1.mjs 9222` | T1 | 9222 | 两张截图 + 深色背景值进日志 |
| `node .tmp/reset.mjs 9223` + `.tmp/e2e-r30-verify.mjs 9223`（修前）/ `.tmp/e2e-r30-t2-trash.mjs 9223`（修后） | T2 | 9223 | 四行 JSON 证据、`## errors []` |
| `node .tmp/reset.mjs 9224` + `.tmp/e2e-r30-t1-stats.mjs 9224` | tester | 9224 | 断言的 ①–⑦ 全过 + 深色断言与选区截图（同一脚本） |
| `$env:SIDELIGHT_CDP='http://127.0.0.1:9224'; node scripts/keyboard-acceptance.mjs http://localhost:5175` | tester | 9224 | 全 PASS；跑完 `git checkout -- shots/round-05/` |
| `$env:SIDELIGHT_CDP='http://127.0.0.1:9224'; node scripts/export-acceptance.mjs http://localhost:5175` | tester | 9224 | 7/7 PASS；跑完 `git checkout -- shots/round-04/t3-export.png` |
| `node scripts/keyboard-acceptance.mjs http://localhost:5175`（CDP 默认 9222 = T1 端口） | T1 | 9222 | 全 PASS；跑完 `git checkout -- shots/round-05/` |
| `npm run roundtrip` | 本轮**不需要** | — | 无 Tiptap 配置 / Markdown 序列化改动 |
| `powershell -ExecutionPolicy Bypass -File packaging/installer.ps1 -AssocDryRun` | T3-A | — | FileVersion 0.32.1.0；`release/` 无变化 |

**两条既有脚本的参数是必须的**（R2）：`scripts/keyboard-acceptance.mjs:6-7` 与 `scripts/export-acceptance.mjs:4-5` 的默认目标是 `http://localhost:5173`（`common.md:15` 禁用的僵尸 server）与 CDP `9222`（T1 的端口，tester 跑会连错页面）。命令里必须带 URL 参数并先设 `SIDELIGHT_CDP`。它们还会覆盖 4 张已跟踪的历史截图（`shots/round-05/t1-skip.png`、`t1-filemenu.png`、`t1-shortcuts.png`、`shots/round-04/t3-export.png`），跑完按上表最后一列还原。

## 7. 截图清单

| 文件 | 内容 | 谁 | 端口 |
| :--- | :--- | :--- | :--- |
| `shots/round-30/r30-t1-stats-light.png` | 浅色，面板打开，六项数值 | T1 | 9222 |
| `shots/round-30/r30-t1-stats-dark.png` | 深色，面板打开 | T1 | 9222 |
| `shots/round-30/r30-t1-stats-selection.png` | 选中一行后的「当前选区」 | tester | 9224 |
| `shots/round-30/r30-t2-trash-undo.png` | 干净文件删除 → 撤销 → 正文恢复 | T2 | 9223 |

## 8. 预设 UNVERIFIED（提前写清，验收时不得当成通过）

1. 真实目录句柄下的删除/撤销（假 FSA 无权限模型）。
2. 真实中文输入法下的面板交互、`Esc` 与 IME（本轮无 IME 自动化）。
3. 135%/150%/200% 缩放屏上的面板位置（`position: fixed` 底左）。
4. `release.yml` 新增的 `npm test`/`measure` 在 GitHub runner 上的真实执行（本轮不 push，只能静态核对）。
5. 已发布的 0.32.1 setup 上 FileVersion 是否同样错（`findings-ship.md:192`，需下载二进制；修完只对下一个版本生效）。
6. NSIS 对新增懒 chunk 的真实安装包增量（首屏外的 chunk 也进 `dist`，安装包体积变化只能下次打包量；本轮用首屏 gzip 与 `dist` 字节做代理指标）。
7. R1 超大文件提示（§2）：dev server 交付旧模块，本轮禁止重启，测不到；重启后按 §2 的补测方法做。
8. 源码模式字数对 Markdown 链接目标的残留跳变（B4）：只修了 frontmatter 引起的跳变，`[文字](url)` 仍会跳；现场修复方案见 §3 第 8 项。
9. `restoreFromTrash` 的 **copy 分支**本轮 e2e 走不到（`.tmp/r30-fsa.mjs:49` 有 `move()`，假 FSA 永远走 move 分支）。`pickTrashSource` 的 4 条单测覆盖了选源逻辑；真实盘句柄上 `move()` 是否可用本轮未验（`STATE.md:95` 只有 OPFS 实测），若可用则真实用户也走 move 分支，copy 分支的替换写入行为没人覆盖（补测：真实文件夹手测一次删除 + 撤销，并在 DevTools 里打印 `typeof handle.move`）。
