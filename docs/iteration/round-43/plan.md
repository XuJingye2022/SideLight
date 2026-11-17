# 第 43 轮 · 计划（planner → planner-revision，只读）

> **revision 3**（2026-11-17，planner-revision）。输入：`docs/iteration/round-43/plan-review.md` 复审版（101 行全文读完）。只修 **R43-5 / R43-6 / R43-7**（3 条 P2：补一行 / 加一条断言 / 调一句砍单 / 加一条 Windows 前提），**不动**四个任务的划分、范围、顺序，不加新任务。落点：**R43-5** → §六.3 改成 `AGENTS.md:39` 与 **`:72`** 改测试条数、`:74` 只改首屏数字与差距计数 + §六「收尾验收」（改前基线 2 条 → 改后 3 条 grep）；**R43-6** → 取修法 ①：把「粘贴为纯文本」搬行与三处标题计数移出 §九 砍单、并入「不砍」（§七 与 §九 两处），砍单从原 #2 起重排为 4 项，§九 的 T2 检查点同步改写；**R43-7** → §五.1 Windows 块加「需要 Microsoft WebView2 运行时」一条 + §五 验收加 grep（改前 0 → 改后 1），并把「从开始菜单启动 / 卸载在设置 → 应用」改成指向 `packaging/README.md` 的措辞（不写成已人工验）。另按复审 §五 把 `keyboard-acceptance` 从跑 3 次减为 2 次（T1 那次并入 T2 结束与 §六 串跑，省 ≈1 min）。修订前已实测三条落点：`git grep -n "372 条" -- AGENTS.md` = **2**（`:39`/`:72`）、`git grep -n "WebView2 运行时" -- README.md` = **0**（exit 1）、`typora-gap.md:7`/`:42`/`:44` 仍是 30/11/3、`README.md:87` 原行无 `**`。本文件只改计划，未改产品代码，未跑 E2E。
>
> **revision 2**（2026-11-17，planner-revision）。输入：`docs/iteration/round-43/plan-review.md`（149 行全文读完）。只修审计划漏洞 **R43-1 / R43-2 / R43-3 / R43-4**（4 条 P2，全部是「加一行 / 改一句 / 加一条断言」），**不动**四个任务的划分、范围、顺序，不加新任务。逐条落点：**R43-1** → §五.1（README `:87`、`:162`）+ §五 验收；**R43-2** → §五.4（取修法 ①：标签标「浏览器原生键」+ 改 `:51-54` 注释）+ §五 验收；**R43-3** → §二.7 补防御性修复口径 + §二 实施步骤 1 改前基线单跑断言 9 + §二 验收第 9 条标题 + §六.1 CHANGELOG 措辞；**R43-4** → §四 实施步骤 6 加「源码里改一行 → 退出 → 大纲 / 字数跟着变」正对照 + §四 验收与风险。修订前已实测核对四条漏洞的落点：`README.md:87`「当前已有 29 项，缺 11 项」、`README.md:124`「28 个文件、362 条断言」、`README.md:162`「28 个测试文件」（`package.json` 实挂 29 个）、`ShortcutsDialog.tsx:51-54` 注释、`App.tsx:994` 的 `ensureKatex` 预取、`App.tsx:3865` 的 `syncDocInfo` 在 `if (!skipReparse)` 块外、`katexLazy.ts:183-185` 的契约——全部存在且与审查一致。本文件只改计划，未改产品代码，未跑 E2E。
>
> **revision 1**（2026-11-17，planner）。输入：本轮 5 份 `findings-*.md`（全部读完）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`git log -8` 与相关源码（`src/App.tsx`、`src/components/{PreviewPane,MathInlineEditor,LinkEditor,ShortcutsDialog}.tsx`、`src/lib/{risk,session,katexLazy,export}.ts`、`scripts/measure-first-screen.mjs`、`docs/typora-gap.md`）。本文件只写计划，未改产品代码。

- 轮次：`round=43`、`nn=43`；轮前 `startSha=0f83e1f80f57d93e0860282a0d3b0bc2b7953750`（`git rev-parse HEAD` 与本文件一致；工作树只有 `docs/iteration/round-43/`、`shots/round-43/` 两个未跟踪目录）。
- 环境：dev server `http://localhost:5175`（不另起、不重启）；E2E 固定 CDP **9222**，每段前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- **不发版**：`package.json` 的 `version`（0.32.1）不动；CHANGELOG 写进现有 `## Unreleased` 区间新增「第 43 轮」块；**不改 `release/`、不 push**。
- 报告与证据：`docs/iteration/round-43/{plan,impl,test}.md`；截图 `shots/round-43/impl-*.png`（不覆盖 finder 的 `bug-*`/`typora-*`/`ship-*`/`code-*`/`r43-ui-*`）。

## 〇、结论：本轮 4 个任务

| id | 标题 | 级别 | 类别 | 回应 | 估时 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 预览（只读）真正只读：编辑命令一律无效 + 预览自己触发公式加载 | **P1** | 数据安全 | bug 第 1 条、ui F1（同一缺陷两面） | 12 min |
| **T2** | 拖入 `.md` 不再静默失败、不导航；公式 / 链接弹层 `Esc` 只取消弹层 | **P1/P2** | 数据安全 / 用户可见 | typora 第 1 条、bug 第 2 条 | 8 min |
| **T3** | 两个精确快路径与死码：`classify` 相等短路、出源码不多算一次 `syncDocInfo`（+ 改动支正对照）、死符号清理、首屏口径注明 | P2 | 性能 / 内部质量 | code F1/F2/F5、ship S3、**（R43-4）** | 7 min |
| **T4** | 发布文档与发现性：README Windows 安装 / 校验步骤、测试计数 + 差距计数两处、Typora 差距表三处、快捷键表补 `Ctrl+Shift+V`（标注浏览器原生键） | P2 | 用户可见（发布） | ship S2、typora 第 3/6/7 条、**（R43-1/R43-2）** | 7 min |

合计约 **41 min**（revision 3 比 revision 2 少 1 min：`keyboard-acceptance` 由 3 次减为 2 次，见 T1 步骤 5；含 §六 收尾与门禁）。超过 35 min 时按 **§九 预砍顺序**砍，**T1/T2 的守卫与 e2e 断言、T4 的搬行与五处计数一致性（R43-1/R43-6）、R43-3/R43-4/R43-7 的口径与断言不砍**。

## 一、为什么是这四条

5 份报告合计 **27 条 actionable**（bug 3、typora 7、ship 3、code 5、ui 9），其中 **P1 两条**：bug 第 1 条（预览里编辑命令改正文并落盘）与 typora 第 1 条（拖入 `.md` 无反应且 `drop` 未 `preventDefault`）。ui F1 与 bug 第 1 条是同一缺陷的「界面入口」与「快捷键入口」两面，合并成 T1。按 `roles/planner.md` 的排序（数据安全 → 用户可见收益 → 安装/体积/性能 → 内部质量）：

- **T1**：P1 数据安全。第 42 轮刚把预览里的「替换 / 全部替换」锁死并写明「预览是只读视图」，同一契约下 `Ctrl+M`/`Ctrl+K`、工具条 H1、表格条「删表」仍会改正文并触发自动保存；同一现象还带出「公式预览加载中…」永久卡住（`PreviewPane` 从不调 `ensureKatex`）。本轮把「只读」做成一个统一守卫，并让预览自己能发起公式加载。
- **T2**：另一个 P1。拖入 `.md` 静默失败，且 `drop` 没 `preventDefault`，宿主里存在整页导航到 `file://` 顶掉会话的路径；同批 4 行修弹层 `Esc` 的双动作（与第 35 轮 `FindBar` 同一族，`stopPropagation` 写法已存在）。
- **T3**：lead 点名的死符号清理（第 39/40/42 轮三次记录、第 42 轮已写死证据口径又被预砍），加两条零语义风险的精确快路径（1 MB 载入 `baselineLosses` 76.8 ms、出源码 284 ms 里白算的 24 ms），加首屏口径注记（尺子少算 2,327 B）。都不新增行为，单测可证。
- **T4**：README 是下载页的第一入口，Windows 是首发平台却只有一行资产名、没有安装 / SmartScreen / 校验步骤；顺带把两轮未改的 `typora-gap.md` 三行与一行快捷键发现性改掉。纯文档 + 1 行数组，零体积。

**本轮不选第 42 轮留下的 ①（预览查找只锁替换、保留命中计数）**：`matches` 是对编辑器文档算的（`src/App.tsx:1802`），预览里没有编辑器 DOM，命中高亮与「上一处 / 下一处」都没有可见效果，只剩「计数」一条信息；要改 `FindBar` 加第三态并重写第 39 轮四条断言，约 10 min 的 P2 收益，排在两条 P1 之后（见 §七）。

## 二、任务 T1（P1，数据安全）

### 为什么

预览被文案、`title`（`只读预览（Ctrl+Shift+P）`）与第 42 轮的 `.find-note` 承诺为只读，但实测下面六条入口都会改正文并让 `dirty` 变 true；2 秒防抖的自动保存或用户按 `Ctrl+S` 会写回文件，且保存推进基线后 `Ctrl+Z` 撤不回（`.tmp/e2e-r43-bug-e.log` 的 `## e3`/`## e5`：种子 `# 乙` 变成 `# $x^2$乙`）。同一批操作还会把预览区换成「公式预览加载中…」，8 秒后仍是这一行（KaTeX chunk 一次都没请求）。

### 现状证据（planner 已逐条对过代码）

| 入口 | 位置 | 现状 |
| :--- | :--- | :--- |
| `Ctrl+K` → `openLinkAtCursorRef.current()` | `src/App.tsx:3700-3704` | 没有视图守卫，链接插在切换预览前的旧光标处 |
| `Ctrl+M`/`Ctrl+Shift+M` → `openMathAtCursorRef.current(shift)` | `src/App.tsx:3705-3709` | 同上；插入空 `inlineMath` → 预览整块变加载态 |
| `Ctrl+1–6/0` → `editor.chain().setHeading()/setParagraph()` | `src/App.tsx:3715-3724` | 本轮实测在预览里未改正文（`chain().focus()` 空操作），但源码模式里会改隐藏文档，同批归一 |
| 工具条 H1/H2/B/I/S/`</>` | `src/App.tsx:4675-4708` | 无 `disabled`，点 H1 预览里 `h1` 1→2（ui F1 附录 A），`dirty:true` |
| 插入菜单（含公式 / 图片 / 链接） | `src/App.tsx:4611-4671` | 菜单项直接调 `run()` 或 `openMath/openLink/imageInput`，全部无守卫 |
| 表格条「删表」等 7 项 | `src/App.tsx:4801-4827` | 只看 `editor?.isActive('table')`，预览里照样渲染；点「删表」`rows 3→0`（ui F1 附录 B），`dirty:true` |

对照：同排「专注 / 打字机」已有 `disabled={viewMode !== 'edit'}`（`src/App.tsx:4714-4733`），第 42 轮又锁了替换（`:1837`、`:1845`），同一份「只读」现在三套行为。

### 改动文件与函数

1. `src/App.tsx` 的 `run()`（`:3822-3829`）：`if (!editor || viewMode !== 'edit') return`，依赖数组补 `viewMode`。这是所有工具条格式 / 插入命令的唯一出口。
2. `src/App.tsx` 的 window `keydown`（`:3558-3789`）：
   - `Ctrl+K` 与 `Ctrl+M`/`Ctrl+Shift+M` 两个分支：先 `event.preventDefault()`，再 `if (viewMode !== 'edit') { show('这个视图不能插入公式或链接：先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑'); return }`；
   - `Ctrl+1–6` 与 `Ctrl+0` 两个分支：`event.preventDefault()` 后同样早退（不弹提示，保持安静）。
   - 依赖数组补 `show`（`show` 是 `useCallback(..., [])`，`src/App.tsx:396`，稳定）。
3. `src/App.tsx` 工具条：6 个格式按钮（`:4675-4708`）与「插入 ▾」触发器（`:4609-4616`）加 `disabled={viewMode !== 'edit'}`。
4. `src/App.tsx` 表格条条件（`:4801`）：`{viewMode === 'edit' && editor?.isActive('table') && (`。
5. `src/App.tsx` 的 `switchView`（`:3874-3903`）：在已有的 `if (next !== 'edit')` 块里补一行 `setMenuOpen(false)`——菜单开着时用键盘切视图，残留菜单项不能绕过 `run()` 守卫（图片 / 公式 / 链接三项不走 `run()`）。
6. `src/App.tsx` 的 `openMathAtCursorRef` / `openLinkAtCursorRef` 两个赋值函数（`:4123-4150`、`:4223-4251`）：第一行 `if (viewMode !== 'edit') return`，两个 effect 依赖数组补 `viewMode`（防手滑调用的最后一道）。
7. `src/components/PreviewPane.tsx`：新增 `useEffect`，`hasMath && !ready` 时 `void ensureKatex().catch(() => undefined)`——`renderToString` 的契约是「未就绪返回空串、调用方先 await `ensureKatex()`」（`src/lib/katexLazy.ts:183-185`），预览是唯一没履约的调用方。依赖 `[hasMath, ready]`；**不要**在 render 里调。
   - **口径（R43-3）：这是防御性修复，不是「改前红」。** `src/App.tsx:994` 的 `setMarkdown` 在正文命中 `/\$\$|\$[^$\n]+\$/` 时已经 `void ensureKatex()`，而假工作区打开 `式.md` 必走 `setMarkdown` → 按 `Ctrl+Shift+P` 时 KaTeX 早已 ready，所以验收断言 9 改前也是绿的。真正卡死的是「**在预览里** `Ctrl+M` 插空公式」（`.tmp/e2e-r43-bug-e.log` 的 `e1-no-katex-yet`），本轮该入口被第 1–2 条守卫堵住。impl.md / CHANGELOG **不许**写「修复前红 / 修好了卡死」。

### 实施步骤（顺序执行）

1. 先写 `.tmp/e2e-r43-impl-t1.mjs` 的骨架（抄 `.tmp/e2e-r43-bug-e.mjs` 的假工作区引导：`import { installFakeWorkspace, readFakeFile } from './r30-fsa.mjs'`、`chromium.connectOverCDP('http://127.0.0.1:9222')`、`openFolder`/`switchTo` 两个 helper），**先跑一次确认改前是红的**：预期至少 5 条红（`.table-bar` 在预览里可见、H1 未 `disabled`、绕过点击后 `.preview-pane h1` 由 1 变 2、`Ctrl+K` 打开 `.link-editor`、自动保存把字节写脏）。把红的那一轮日志存 `.tmp/e2e-r43-impl-t1.before.log`。
   - **同一次改前基线里单独跑一遍断言 9**（打开 `式.md` → `Ctrl+Shift+P` → 6 s 内数 `.preview-pane .katex` 与 `.math-pending-note`），结果单独记进同一个 `.tmp/e2e-r43-impl-t1.before.log`。按 `App.tsx:994` 的预取，预期**改前也是绿**（`.katex ≥ 2`、`.math-pending-note` 0）——这条是回归锁，**不列进上面 5 条红**，也不得写成「改前红」（R43-3）。
2. 按上面第 1–6 条改 `src/App.tsx`；再改第 7 条 `PreviewPane.tsx`。
3. `npx tsc --noEmit`。
4. 跑 e2e（断言见下），补截图。
5. `node scripts/keyboard-acceptance.mjs`（52/52）——证明编辑态 `Ctrl+K`/`Ctrl+M` 与弹层 Esc 没被守卫误伤；跑完 `git checkout -- shots/round-05/`（AGENTS §8）。**配额（revision 3）：这一次推迟到 T2 结束统一跑**（那时 T1/T2 的改动都已就位，`keyboard-acceptance` 一次覆盖两边）+ §六 串跑再跑一次，共 2 次，省 ≈1 min；T1 结束不单独跑。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r43-impl-t1.mjs 9222   # 脚本内 check() 计数，期望全部 PASS
git grep -n "disabled={viewMode !== 'edit'}" -- src/App.tsx     # ≥ 9（6 格式 + 插入 + 专注 + 打字机）
git grep -n "if (!editor || viewMode !== 'edit')" -- src/App.tsx # 1（run）
git grep -n "ensureKatex" -- src/components/PreviewPane.tsx      # ≥ 1，且在 useEffect 内
git grep -n "setMenuOpen(false)" -- src/App.tsx                  # 含 switchView 新增这一处
```

e2e 必须覆盖的断言（种子：`乙.md` 含 `# 乙` + 两段正文 + 2×2 表格；`式.md` 含行内 `$x^2$` 与块级 `$$a+b$$`）：

1. 编辑态先把光标点进表格单元格（`.ProseMirror td`）→ `Ctrl+Shift+P`：`.preview-pane` 1 个、`.math-pending-note` 0 个。
2. 预览态：`.table-bar` 计数 **0**；工具条 H1 与「插入 ▾」的 `disabled === true`。
3. 绕过 `disabled` 直接调 React props 的 `onClick`（写法抄第 42 轮：`Object.keys(btn).find(k => k.startsWith('__reactProps$'))` 后 `props.onClick()`）：`.preview-pane h1` 计数不变、`window.__slState.dirty === false`。
4. 预览态按 `Ctrl+K` / `Ctrl+M` / `Ctrl+Shift+M` / `Ctrl+1`：`.link-editor` 0、`.math-inline-input` 0、`.preview-pane` 文本不变、`dirty:false`；其中 `Ctrl+K`/`Ctrl+M` 要有 `.toast-text` 提示（含「回编辑」字样）。
5. 停 2.6 s（>2 s 自动保存防抖）后再看：`dirty:false`、`readFakeFile('乙.md') === 种子`。
6. `Esc` 回编辑 → `Ctrl+S`：toast「没有改动，未写入。」（或等价），字节仍等于种子。
7. **正对照**（编辑态没被锁死）：点工具条 H1 → `dirty:true`；`Ctrl+Z` → `dirty:false`；编辑态 `Ctrl+K` 仍弹出 `.link-editor`。
8. 源码态（`Ctrl+/`）：`.source-editor` 1 个、H1 `disabled:true`、`.table-bar` 0、`Ctrl+M` 不开 `.math-inline-input`；`Ctrl+/` 回编辑。
9. 打开 `式.md` → `Ctrl+Shift+P`：6 s 内 `.preview-pane .katex` ≥ 2 且 `.math-pending-note` 0。**口径（R43-3）：这是防御性修复的回归锁，改前基线亦绿**（见实施步骤 1 与 §二.7）；impl.md / CHANGELOG 不得把它当「修复了公式卡死」的证据。
10. 控制台 `errors: []`、`requestfailed: []`。

### 风险与坑

- **中**：把守卫写成 `previewMode` 单条件只挡住找到的那几条，源码模式的隐藏编辑路径仍在；统一用 `viewMode !== 'edit'`，与「专注 / 打字机」同写法。副作用是源码模式里点格式按钮不再改隐藏文档（这是修复，不是回归；写进 README/CHANGELOG 的「可见变化」）。
- `disabled` 的按钮 `page.click()` 会 30 s 超时（第 42 轮实测），必须用 `__reactProps$.onClick()` 绕过并**先断言 `disabled`**；否则测出来的是「点不到」而不是「守卫生效」。
- 守卫放在 `preventDefault()` **之后**：否则 `Ctrl+1` 之类会落到浏览器默认动作（预览里滚到文首/文末）。
- 预览里 `show()` 的提示会被 6 s 自动清掉（`src/App.tsx:1877-1880`），e2e 要在按键后 1 s 内读 toast。
- 预览里 `.math-pending-note` 只有在 `hasMath && !ready` 时出现；改后正常文档不出现，别把「加载中」当回归。
- 若 `keyboard-acceptance` 出现「链接 Esc 取消不改正文」红：先查是否把守卫写进了编辑态分支（`viewMode !== 'edit'` 在编辑态必须为 false）。

### 需要的截图

- `shots/round-43/impl-t1-preview-readonly.png`：预览态点过 H1 / 按过 Ctrl+M 之后，正文与状态栏（无「自动保存排队中」）。
- `shots/round-43/impl-t1-preview-math.png`：`式.md` 预览里公式已渲染（`.katex` 可见）。

## 三、任务 T2（P1/P2，数据安全 + 用户可见）

### 为什么

从资源管理器把 `.md` 拖进窗口是 Typora 用户的第一入口。现在：`dragover.defaultPrevented=true`（ProseMirror 挡了）但 `drop.defaultPrevented=false`，文档没有任何变化，也没有任何提示（`.tmp/e2e-r43-typora.mjs` 的 `T5_drop_md`）；宿主 `OnNavigationStarting` 只写日志、不取消（`host/Program.cs:1616-1620`），真机上有整页导航到 `file://` 顶掉会话的路径。同一批修公式 / 链接弹层里的 `Esc`：一次按键既关弹层又退出源码 / 预览（bug 第 2 条，`MathInlineEditor.tsx:56-60`、`LinkEditor.tsx:69-72/100-103` 只 `preventDefault()`，`FindBar` 第 35 轮已补 `stopPropagation()`）。

### 改动文件与函数

1. `src/App.tsx`：新增一个 window 级 drag 守卫 `useEffect`（放在 window keydown effect 之后）：

   ```ts
   useEffect(() => {
     const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
     const onDragOver = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault() }
     const onDrop = (event: DragEvent) => {
       if (!event.dataTransfer?.files?.length) return
       // 正文里的图片拖入由 ProseMirror 的 handleDrop 接住并 preventDefault；这里只兜它没接住的文件
       if (event.defaultPrevented) return
       event.preventDefault()
       show('拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）')
     }
     window.addEventListener('dragover', onDragOver)
     window.addEventListener('drop', onDrop)
     return () => {
       window.removeEventListener('dragover', onDragOver)
       window.removeEventListener('drop', onDrop)
     }
   }, [show])
   ```
2. `src/components/MathInlineEditor.tsx:56-60`：`Escape` 分支 `preventDefault()` 后补 `event.stopPropagation()`。
3. `src/components/LinkEditor.tsx:69-72` 与 `:100-103`：同上（两处）。
4. **不碰宿主**：`host/Program.cs` 的导航取消是白名单级改动（写错会白屏），本轮不做，记 §七；Web 层 `preventDefault` 已在浏览器 / WebView2 里挡住默认导航。

### 实施步骤

1. 先写 `.tmp/e2e-r43-impl-t2.mjs` 骨架（同上假工作区），改前跑一次，确认 drop 断言是红的（`dropPrevented:false`、无 toast）、Esc 断言是红的（一次 Esc 后 `mode:"edit"`）。
2. 按 1–3 改代码。
3. `npx tsc --noEmit`，跑 e2e，补截图。
4. `node scripts/keyboard-acceptance.mjs`（52/52，确认编辑态弹层 Esc 仍取消；跑完还原 `shots/round-05/`）。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r43-impl-t2.mjs 9222
git grep -c "stopPropagation" -- src/components/MathInlineEditor.tsx src/components/LinkEditor.tsx
#   MathInlineEditor 改后 2（原有 onMouseDown 1 + 新 Esc 1）、LinkEditor 改后 3（原有 onMouseDown 1 + 两个输入框各 1）
git grep -n "addEventListener('drop'" -- src/App.tsx                                                  # 1 处
```

e2e 断言（合成 `DataTransfer` + 真 `File`，写法抄 `.tmp/e2e-r43-typora.mjs` 的 `T5_drop_md`）：

1. 在 `.doc-column .ProseMirror` 上 `dispatchEvent(new DragEvent('dragover'…))` 再 `drop`（`File('拖入.md', type:'text/markdown')`）：`overPrevented === true`、`dropPrevented === true`、`.toast-text` 含「不会直接打开」、`.editor` 文本不变、`dirty:false`、`location.href` 不变。
2. 在 `.doc-column`（编辑器外）同样丢一个 `.md`：`dropPrevented === true` + toast（窗口级守卫兜住整页区域）。
3. **图片回归**：在 `.ProseMirror` 上丢 `File('p.png', type:'image/png')`：`dropPrevented === true` 且 toast **不含**「不会直接打开」（说明是 ProseMirror 接住的，不是窗口守卫），等 1.5 s 记 `.ProseMirror img` 计数（写不进假工作区时记 UNVERIFIED，不算失败）。
4. **Esc 单次**：编辑态 `Ctrl+K` 打开 `.link-editor`（焦点在输入框）→ 键盘按 `Ctrl+Shift+P` 进预览（焦点仍在输入框）→ 按 `Escape`：`.link-editor` 0 且 `window.__slState.viewMode === 'preview'`（改前会变 `edit`）。
5. 编辑态 `Ctrl+K` → `Escape`：弹层关闭、`viewMode === 'edit'`（正对照，防止 stopPropagation 把编辑态的取消也吞掉）。
6. 控制台 `errors: []`、`requestfailed: []`。

### 风险与坑

- `dragover` 必须只在 `types` 含 `Files` 时 `preventDefault()`，否则正文里拖动选中段落（ProseMirror 自己的拖放）会坏；合成事件测不出这个回归，靠这条判定 + `keyboard-acceptance` / 人工复核。
- drop 守卫必须判 `event.defaultPrevented`：图片拖入由 `handleDrop`（`src/App.tsx:861-868`）先接住并 `preventDefault`，窗口这一层不能抢，否则每次插图都会弹「不会直接打开」。
- React 合成事件在 **portal**（`MathInlineEditor` / `LinkEditor` 都 `createPortal(..., document.body)`）里的 `stopPropagation()` 是否能挡住 window 的原生监听，以 e2e 第 4 条为准。若实测挡不住：改 `src/App.tsx:3574` 的 `Escape` 分支，在 `event.key === 'Escape'` 后第一行加 `if (document.activeElement?.closest('.math-inline, .link-editor')) return`（弹层自己的 handler 已经 `preventDefault`），并在 impl.md 记下为什么换方案。
- 提示文案统一一条，不要按扩展名分支（少一种状态）；`.md` 与其它文件都走同一条。
- 只 `preventDefault` 不能阻止 WebView2 之外的行为（例如从浏览器拖链接），但本轮目标就是「本窗口不要导航、给反馈」。

### 需要的截图

- `shots/round-43/impl-t2-drop-notice.png`：拖入 `.md` 后 toast 与未变的正文。

## 四、任务 T3（P2，性能 / 内部质量）

### 为什么

1. **载入**：`baselineLosses` → `classify` 末尾用 `diffLines` 数空行增删（`src/lib/risk.ts:344`、`src/lib/diff.ts:44-70`），成本按行数² 增长，且逐字节相同的文档也要跑一次：1 MB/2,050 行 **76.8 ms**（冷、App 内）、100 KB 28.3 ms、50 KB/2,003 行 22.4 ms。现实里「打开→不改→保存」的保真样本大多逐字节不变，却没有相等快路径。
2. **出源码**：第 42 轮已省掉整篇 parse，剩 284–315 ms（1 MB）里仍无条件调 `syncDocInfo`（`src/App.tsx:3865`）→ `extractOutline` + `countText` 重算 21.3 + 2.7 ms，正文一字未变时是白算。
3. **死符号**：`serializeBody`（`src/App.tsx:186-189`，定义 1 处、0 调用）、`clearSession`（`src/lib/session.ts:55-68`，0 引用）、`src/App.tsx:178` 悬空注释。第 39/40/42 轮三次记录、第 42 轮计划已写死删除口径又被预砍；本轮直接做，不再顺延。
4. **首屏口径**：`scripts/measure-first-screen.mjs` 只数 `dist/index.html` 的静态引用（`files=3`、291,766 B），而发布包每次冷启动都会再请求 `MarginRail-*.js`（raw 6,088 / gzip 2,327 B，ship S3 实测），尺子持续少算 2,327 B。

### 改动文件与函数

1. `src/lib/risk.ts` 的 `classify`（`:319-321`）：归一化 CRLF 之后加精确等价短路：

   ```ts
   const beforeText = before.replace(/\r\n?/g, '\n')
   const afterText = after.replace(/\r\n?/g, '\n')
   if (beforeText === afterText) return [] // 逐字节相同 ⇒ 不可能有任何损失（6 个损失族都要求前后不同）
   ```
2. `src/lib/risk.test.ts`：新增 4 条——(a) 表格 + 标题全文 `classify(t,t)` 为 `[]`；(b) 脚注定义 + 引用；(c) 公式 + `<!-- -->`；(d) `'a\r\nb'` vs `'a\nb'`（CRLF 归一后相等）为 `[]`；再加 1 条**正对照**（`classify('a\n\nb\n','a\nb\n')` 仍报 `blank-lines`、`blocking:false`），防止快路径吞掉真差异。
3. `src/App.tsx` 的 `applySource`（`:3854-3867`）：把 `syncDocInfo(editor)` 移进 `if (!skipReparse) { … }` 块（正文没变，大纲 / 字数 / 当前章节都没变）；`setDirty` 那一行留在块外不动。
4. 删死符号：`src/App.tsx:186-189`（`serializeBody` 函数 + 上一行注释）、`src/App.tsx:178` 悬空注释、`src/lib/session.ts:55-68`（`clearSession` 整段）；`src/App.tsx:74` 的 import 只去掉 `serializeDocumentBody`，**保留** `serializeDocument`。`src/lib/serializeDocument.ts` 里的 `serializeDocumentBody` **必须保留**（`scripts/fidelity-acceptance.mjs:14/43/144` 三条活引用）。
5. `scripts/measure-first-screen.mjs` 文件头（`:1-7`）补一句口径：`// 口径不含启动后立刻动态 import 的常驻 chunk（如 MarginRail-*.js，gzip 2,327 B，第 43 轮实测），实际首载 ≈ total + 2,327 B`；`README.md:105` 同一句。

### 实施步骤

1. **先贴正向对照**（AGENTS §8：每条「0 命中」验收都要先有改前 >0）：

   ```bash
   git grep -nw "serializeBody" -- src scripts        # 改前：src/App.tsx:187（1 处）
   git grep -n "clearSession" -- src scripts          # 改前：src/lib/session.ts:55（1 处）
   git grep -n "编辑器读不全的语法" -- src            # 改前：src/App.tsx:178（1 处）
   ```
2. 改 `risk.ts` + `risk.test.ts` → `node --experimental-strip-types src/lib/risk.test.ts`。
3. 改 `applySource` → `npx tsc --noEmit`。
4. 删死符号，再跑上面三条 grep（期望 0）。
5. 改 measure 头注释与 README 一句。
6. 跑 e2e（`.tmp/e2e-r43-impl-t3.mjs`），两段，**正对照在前**：
   - **6a 改动支（R43-4，锁住 `syncDocInfo` 落在 `!skipReparse` 内）**：小种子 `甲.md`（`# 甲` + 两段）→ `Ctrl+/` 进源码 → 把首行 `# 甲` 改成 `# 甲改` → `Ctrl+/` 回编辑。断言：按 `Ctrl+Shift+1`（`App.tsx:3730-3734`，同时会展开侧栏）后 `.outline-list`（`Outline.tsx:46`）文本含「甲改」，出现 `.outline-empty`（`Outline.tsx:27`）即红；`.stats-trigger`（`StatusBar.tsx:43` 的 `formatStats(stats)`）文本与改前**不相等**；`.ProseMirror` 文本含「甲改」；`dirty:true`（**回编辑后 1 s 内读**，2 s 自动保存防抖会把它清成 `false`）。把 `syncDocInfo` 错放进 `skipReparse === true` 那一支时，这一段必红而 6b 仍全绿——这就是它存在的理由。
   - **6b 跳过支（原有）**：100 KB 文档打开 → `Ctrl+/` → `Ctrl+/`，统计 `sl-parse-done` 条数不变、正文文本不变、`dirty:false`；用 `performance.now()` 夹住两次按键记 `outMs`（第 43 轮基线：100 KB 77 ms、1 MB 284 ms）。
   - 1 MB 可选：复用 `.tmp/e2e-r43-code-perf.mjs 9222`（先 `Copy-Item .tmp/perf-round43-code.json .tmp/perf-round43-code.before.json`；脚本会覆写该 JSON），把 `sourceToggle` 与 `risk` 字段记进 impl.md，不作门槛。

### 验收标准（可执行）

```bash
git grep -nw "serializeBody" -- src scripts        # 0
git grep -n "clearSession" -- src scripts          # 0
git grep -n "编辑器读不全的语法" -- src            # 0
git grep -n "serializeDocumentBody" -- src scripts # 4（lib 定义 1 + fidelity 3），且 src/App.tsx 0
git grep -n "if (beforeText === afterText) return" -- src/lib/risk.ts   # 1
node --experimental-strip-types src/lib/risk.test.ts                    # 新 5 条全过
npm test                                                                # 全过，条数记下来
node .tmp/e2e-r43-impl-t3.mjs 9222                                      # 6a 正对照（改源码 → 大纲/字数/dirty 跟着变）+ 6b 跳过支（parse-done 不变 + bytes 不变）
git grep -n -B8 -A2 "syncDocInfo(editor)" -- src/App.tsx                # 4 处；只认 applySource 那处在 if (!skipReparse) { … } 内、setDirty 在块外（T1/T2 会往 App.tsx 插行，别按行号认，按上下文认）
node scripts/measure-first-screen.mjs                                   # PASS，files=3，total gzip 与第 42 轮同量级
```

### 风险与坑

- 相等短路是**精确**的，不是启发式：`referenceLosses`/`tableLosses`/`footnoteLosses`/`mathLosses`/`htmlLosses`/`hardBreakLosses` 六个损失族全部要求「原文有、序列化后没有」；`trailing-newline` 要 `before` 以 `\n` 结尾而 `after` 不以；空行损失来自 diff。前面四条单测 + 一条正对照就是这条论证的可执行版本（planner 已逐段读过 `src/lib/risk.ts:62-358`）。
- `syncDocInfo` 只挪进 `!skipReparse`：`skipReparse` 的判据是「源码框没动过 且 正文现在序列化出来就是这段」（`:3851-3853`），正文没变派生数据才没变；不能顺手删 `setDirty`。
- **R43-4：这条改动的回归锁是 6a 正对照，而且它「改前也绿」**——因为改前 `syncDocInfo` 无条件跑，改后走 `!skipReparse` 分支同样会跑。它锁的不是「新行为」，而是「条件写反」（把 `syncDocInfo` 放进 `skipReparse === true` 那一支）：写反时 6b 全绿、`npm test` 也绿（`App.tsx` 无单测，见 findings-code F3），只有 6a 会红。impl.md 里按这个口径写，**不许**写成「修复前红」。
- 6a 的三个读数都在页面 DOM 上：`.outline-list`（侧栏大纲）、`.stats-trigger`（状态栏字数）、`dirty`（`window.__slState`）。侧栏可能是文件树或折叠的——先按 `Ctrl+Shift+1`（`App.tsx:3730-3734` 会同时把 `treeCollapsed` 置 false）；大纲没刷新的表现是 `.outline-empty` 或旧标题。`dirty` 要在回编辑后 1 s 内读（2 s 自动保存防抖，第 42 轮同一坑）。
- 删 `src/App.tsx:74` 的 import 要只删 `serializeDocumentBody` 一项；`tsc` 不开 `noUnusedLocals`（`tsconfig.json` 只有 `strict`），漏删不会报错，但会留一个没用的 import。
- 首屏口径只写注释与 README，**不改 `--max/--target` 阈值**，避免门槛口径漂移。
- 性能数字不设门槛：单测与功能断言是门，`outMs` 只记录（dev + StrictMode 口径，第 42 轮已记同一条）。

### 截图

无（纯内部/性能）。

## 五、任务 T4（P2，发布文档与发现性）

### 为什么

Windows 是首发平台，README 的「下载」节却只有两行资产名 + 一整套 macOS 首次打开与校验步骤（`README.md:13` vs `:16-24`），安装包用户走完 README 拿不到任何一步操作指引；`shasum -a 256`（`:22`）在 Windows 上也不可用；**Windows 10 没装 WebView2 运行时的用户会被安装器直接中止，而下载页一个字没提**（`packaging/README.md:18`，`git grep -n "WebView2 运行时" -- README.md` 改前 0 命中，**R43-7**）。另外 `docs/typora-gap.md` 三行与实测不符（列宽不持久、`Ctrl+Shift+V` 已可用却写在「缺的」、视图缩放与同文件 `:25` 自相矛盾），快捷键表漏了 `Ctrl+Shift+V`（功能已在，只是没人知道）。

### 改动文件与内容

1. `README.md`：
   - `:13` 后加 Windows 首次安装块（4 条 + 便携包 1 条）：
     - **先看运行时（R43-7）**：需要 Microsoft WebView2 运行时——Windows 11 自带；没有时安装器会弹提示并**中止安装**（不会装出一个打不开的程序），先装 <https://go.microsoft.com/fwlink/p/?LinkId=2124703> 再重跑安装器。口径照 `packaging/README.md:18`。
     - 双击 `Sidelight-<版本>-win-x64-setup.exe` → SmartScreen「Windows 已保护你的电脑」→「更多信息」→「仍要运行」（未签名，首次必拦一次）。
     - 装到 `%LOCALAPPDATA%\Programs\Sidelight`（安装器默认路径，可改）；启动与卸载步骤见 [`packaging/README.md`](packaging/README.md)：开始菜单快捷方式与 HKCU 卸载项**尚未人工验**（`AGENTS.md:74` 已列），这里不写成「已验证」；卸载保留 `%LOCALAPPDATA%\Sidelight`，要彻底清掉手动删。
     - 校验：`Get-FileHash -Algorithm SHA256 <文件>`（或 `certutil -hashfile <文件> SHA256`），与 Release 页 `SHA256SUMS-<版本>.txt` 对照。
     - 便携包：解压 `…-win-x64-portable.zip`，双击 `Sidelight.exe`，同样会被 SmartScreen 拦一次。
   - `:22` 的校验行改成 macOS 专用（`校验（macOS）：shasum -a 256 <zip 文件>`）。
   - 「现在能做什么」的查找替换条（`:49`）之后加一条粘贴说明：「粘贴：`Ctrl+V` 保留格式，`Ctrl+Shift+V` 粘贴为纯文本（浏览器原生键，桌面宿主未验证）。」
   - `:87`「与 Typora 的逐项对照在 …：当前已有 **29** 项，缺 **11** 项（未含 `.md` 关联）。」→「当前已有 **31** 项，缺 **10** 项（未含 `.md` 关联）。」——与 §五.2 搬行后的 `typora-gap.md`、§五.3 的 `AGENTS.md:74` 同口径。今天这一行已比 `typora-gap.md:7`（30）少 1，本轮再搬一行会差 2（R43-1）。
   - `:124` 的 `npm test # 28 个文件、362 条断言` 改成本轮 `npm test` 实测（文件数 / 条数）。
   - `:162`「`lib/*.test.ts` **28 个测试文件**挂进 npm test（含 session / prompt / …）」→ 与本轮 `:124` **同一个数字**（`package.json` 今天实挂 29 条 `--experimental-strip-types`；T3 只在现有 `risk.test.ts` 里叠加、不新增文件，所以仍是 29）。两处不许写两个口径（R43-1）。
2. `docs/typora-gap.md`：
   - `:31` 表格行列行补「列宽只在本次会话内，Markdown 表格语法不存宽度，重开回默认」。
   - `:49` 「粘贴为纯文本 无 P1」搬进「已经有的」表，现状写「有；`Ctrl+Shift+V`（浏览器原生键，桌面宿主未验证）」；标题计数 `已经有的（30）`→`（31）`、`缺的（11）`→`（10）`、`### 编辑与格式（3）`→`（2）`。
   - `:56` 「视图缩放 无」→「整页缩放（侧栏与工具栏一起）无；正文字号缩放已有（见「已经有的」）」。
   - `:64` 「拖入文件或文件夹打开 无」的备注补「拖入 `.md` 现在有提示且不会导航（第 43 轮），仍不直接打开」。
3. `AGENTS.md:74` 的「当前 30 项有、11 项缺」→「当前 31 项有、10 项缺」。
4. `src/components/ShortcutsDialog.tsx`（**R43-2：取修法 ①，不动其他组**）：
   - `:38`（`['Ctrl+E', '行内代码'],`）之后、「编辑与批注」组末尾加一行 `['Ctrl+Shift+V', '粘贴为纯文本（浏览器原生键）'],`——`Ctrl+Shift+V` 是 Chromium 原生纯文本粘贴，**不是产品绑定**；findings-typora §7 的实测只在浏览器里做过，桌面宿主未验证，标签里必须写明来源。
   - `:51-54` 的文件注释改成「清单只写真实可用的键位；浏览器原生键必须在标签里标注来源。」——不改这条注释，新加的键位就与「清单只写真实绑定的键位，不写浏览器保留的组合」直接对立，让这条规则作废。

### 实施步骤

1. 改 README（先 Windows 块，后 macOS 校验行、粘贴说明、`:87` 差距计数、`:124` 测试计数、`:162` 测试文件数）；改 `typora-gap.md`（搬行后数一遍表格行数与三个标题一致）；改 `AGENTS.md` 一句；改 ShortcutsDialog 一行 + 同步 `:51-54` 注释。
2. `npx tsc --noEmit`（ShortcutsDialog 是 TS）。
3. 跑 `.tmp/e2e-r43-impl-t4.mjs`：点 `button[aria-label="快捷键"]`，断言 `.dialog` 文本含 `Ctrl+Shift+V` 与 `粘贴为纯文本（浏览器原生键）`（含来源标注，R43-2）；可选截图 `impl-t4-shortcuts.png`。
4. 文档 grep 验收（见下）。

### 验收标准（可执行）

```bash
# —— 改前基线：先贴这几条 >0，证明 grep 抓得到（AGENTS §8）
git grep -nE "29 项|28 个测试文件" -- README.md     # 2（:87 的「29 项」、:162 的「28 个测试文件」）
git grep -n "已有 29 项，缺 11 项" -- README.md     # 1（:87）
git grep -nE "30 项有|11 项缺" -- AGENTS.md         # 1（:74）
git grep -n "WebView2 运行时" -- README.md          # 0（exit 1；R43-7 的正向对照：先确认改前确实没有，改后要 1）

# —— 改后验收
git grep -nE "29 项|28 个测试文件" -- README.md     # 0（改前 2；README 两处计数都改掉）
git grep -n "已有 31 项，缺 10 项" -- README.md     # 1（与 gap 表、AGENTS 三处同口径）
git grep -n "29 个测试文件" -- README.md            # 1（与 :124 的文件数同为 29；若本轮 npm test 实测不是 29，按实测替换数字，但两处必须同值）
git grep -nE "已经有的（31）|缺的（10）|编辑与格式（2）" -- docs/typora-gap.md   # 3
git grep -n "当前 31 项有、10 项缺" -- AGENTS.md     # 1（改前是「当前 30 项有、11 项缺」）
git grep -nE "30 项有|11 项缺" -- AGENTS.md         # 0（改前 1）
git grep -n "浏览器原生键" -- README.md docs/typora-gap.md src/components/ShortcutsDialog.tsx   # 3（改前 0 → 改后 3；三处都标来源，R43-2）
git grep -n "Ctrl+Shift+V" -- README.md src/components/ShortcutsDialog.tsx docs/typora-gap.md   # 3
git grep -n "Get-FileHash" -- README.md             # ≥1
git grep -n "WebView2 运行时" -- README.md          # 1（改前 0；R43-7：运行时前提必须在下载节里）
git grep -n "仍要运行" -- README.md                 # ≥1
git grep -n "SmartScreen" -- README.md              # ≥2（下载节新增 + :76 旧句）
git grep -n "列宽只在本次会话" -- docs/typora-gap.md # 1
git grep -n "整页缩放" -- docs/typora-gap.md         # ≥1 且仍在「缺的」
node .tmp/e2e-r43-impl-t4.mjs 9222                  # 2 条断言 PASS（含「浏览器原生键」）
```

（`git grep` 默认 POSIX BRE，交替要写 `-E`，AGENTS §8。）

（R43-1 的审查原文给的 `git grep -nE "31 项有|10 项缺"` 只能命中 `AGENTS.md:74`：README 写的是「已有 **31** 项，缺 **10** 项」，`typora-gap.md` 写的是标题 `（31）` / `（10）`。所以 revision 2 拆成上面三条精确 grep——README 一条、gap 表三条标题、AGENTS 一条，合计仍是「三处同口径」，且每条都抓得到、可对改前基线。）

（落地细节：`README.md:87` 原行**没有** `**`——写进 README 时按纯文本写「当前已有 31 项，缺 10 项」，照抄计划里的 `**31**` 会让 `git grep -n "已有 31 项，缺 10 项"` 变 0 命中。）

### 风险与坑

- 搬行会改计数：`typora-gap.md` 三处标题 + `AGENTS.md` 一句必须同步；**不要改 CHANGELOG 里历史轮次的计数**（那是历史事实）。
- **R43-1：计数一共 5 处**——`typora-gap.md` 三个标题 + `AGENTS.md:74` + `README.md:87`（差距）与 `README.md:162`（测试文件数，跟 `:124` 同值）。必须一次改齐再跑验收；只改一半会得到「README 说 31、gap 表说 30」这种比不改更糟的状态，下一轮再搬行误差还会累积。
- **R43-2：不要选修法 ②（不动对话框）**——那会把「功能已在、没人知道」这条发现性缺口原样留下。选 ① 时标签必须带「浏览器原生键」，且 `ShortcutsDialog.tsx:51-54` 注释同步改；只加行不改注释，等于让同文件写死的规则当场失效。
- 校验命令必须是 Windows 可用的（`Get-FileHash` / `certutil`），不要把 `shasum` 留给 Windows 用户；macOS 行保留 `shasum`。
- README 的测试条数与首屏数字用本轮实测，不许照抄旧值；首屏数字在收尾统一改（见 §六）。
- 只改文档、1 行数组与 1 行注释，不加依赖、不加 CSS。

### 截图

- 可选 `shots/round-43/impl-t4-shortcuts.png`（快捷键对话框新增行）。

## 六、统一门禁、收尾与谁改什么

**每个任务各自跑**：任务里列的门禁 + 该任务 e2e。**全部做完后串跑一次**：

```bash
npx tsc --noEmit
npm test
npm run verify        # build + 首屏 gzip（内部 310,000 / 硬线 320,000）
npm run roundtrip     # rich 5/7、source 7/7
node scripts/keyboard-acceptance.mjs   # 52/52；跑完 git checkout -- shots/round-05/
```

（T1/T2 动了编辑器命令入口与拖放，`keyboard-acceptance` 必跑；`fidelity-acceptance` 不跑——它只覆盖序列化，会覆写 `shots/round-10/`。本轮无并发，`npm run build` 由执行代理自己串行跑。）

**收尾文档（执行代理做，tester 提交前复核）**：

1. `docs/CHANGELOG.md`：在 `## Unreleased（第 29–40 轮，未发版）` 里、`**第 42 轮（同一未发版区间）**` 块之后加 `**第 43 轮（同一未发版区间）**`：T1 预览只读（含可见变化：预览 / 源码里 `Ctrl+K`、`Ctrl+M` 与工具条格式 / 插入命令、表格条一律不可用）＋ **预览按 `katexLazy.ts:183-185` 的契约自行 `ensureKatex`（写「防御性修复」，并注明断言 9 改前亦绿；不许写「修好了公式卡死」）**、T2 拖入 `.md` 有提示且不导航 + 弹层 `Esc` 只取消弹层、T3 两个快路径 + 死符号 + 首屏口径 + 改动支正对照、T4 文档与快捷键表（差距计数 31/10、测试文件数两处同值、快捷键行标「浏览器原生键」）；写实测数字（`npm test` 文件数 / 条数、首屏 gzip 新值、`outMs`、`sl-parse-done` 物证）。标题若顺手可把「29–40」改成「29–43」（不改也不判失败）。
2. `README.md:105`：首屏数字更新为本轮 `npm run verify` 实测 + 第 43 轮增量；`:124` 测试计数更新；`:162` 的测试文件数与 `:124` 同值、`:87` 的差距计数与 `typora-gap.md` / `AGENTS.md:74` 同值（这两处 §五.1 已改，收尾只复核，不许改回旧数）。
3. `AGENTS.md` 分两处改（**R43-5**）：`:39`（§3 门禁注释「第 42 轮记 29 个文件、372 条」）与 **`:72`**（§6 长段里的「测试 29 个文件 372 条」）→ 本轮 `npm test` 实测的文件数与条数；`:74` 只改首屏数字（`291,766 B` / 余 `28,234 B`）与差距计数「当前 30 项有、11 项缺」→ 31/10——**`:74` 里没有测试条数，测试条数在 `:72`**。
4. `docs/iteration/round-43/impl.md`：每个任务的文件:行号、命令与原始输出、截图路径、与计划的偏差、UNVERIFIED；T1 的 `PreviewPane.ensureKatex` 一项按「**防御性修复**」写（并贴 `.tmp/e2e-r43-impl-t1.before.log` 里断言 9 改前亦绿的原样读数），不许写「修复前红」（R43-3）；T3 的 6a 正对照一项写明「改前也绿，锁的是条件写反」（R43-4）。
5. **不改** `docs/iteration/STATE.md`（根代理轮末统一更）、不改 `package.json` 版本、不动 `release/`、不 push。

**收尾验收（R43-5：先贴改前 >0，AGENTS §8）**：

```bash
# —— 改前基线
git grep -n "372 条" -- AGENTS.md                    # 2（:39、:72）
git grep -n "测试 29 个文件 372 条" -- AGENTS.md     # 1（:72）
# —— 改后
git grep -n "372 条" -- AGENTS.md                    # 0（改前 2）
git grep -n "测试 29 个文件 377 条" -- AGENTS.md     # 1（改前 1；数字按本轮 npm test 实测替换）
git grep -n "377 条" -- AGENTS.md                    # 2（:39、:72 同值；同上按实测替换）
```

（测试条数共 4 处同值：`README.md:124`、`README.md:162`（只写文件数）、`AGENTS.md:39`、`AGENTS.md:72`；差距计数共 3 处：`README.md:87`、`typora-gap.md` 三个标题、`AGENTS.md:74`。`docs/iteration/STATE.md:27` 还是旧的 28/362，由根代理轮末统一更，本轮不动。）

## 七、本轮不做（有证据、有原因、写清下轮怎么排）

| 条目 | 来源 | 级别 | 为什么本轮不做 | 下轮怎么排 |
| :--- | :--- | :--- | :--- | :--- |
| 预览查找「只锁替换、保留命中计数」（`FindBar` 第三态） | 第 42 轮 leftover ① / review R42-6 | P2 | 命中高亮与上一处 / 下一处都渲染在编辑器 DOM（`src/App.tsx:1802-1833`），预览里只剩计数一条信息；要加第三态并重写第 39 轮四条断言，约 10 min，被两条 P1 挤出 35 min 预算 | **下轮第一项**（e2e 断言改成「预览里计数可见、替换按钮 disabled、源码模式仍全锁」） |
| 行内 HTML 与正文 `<br>` 渲染 | 第 42 轮 leftover ②、typora 第 1 条续 | **P1** | 需要专用 inline 节点 + 写回 `<br>`（不能直接用 hardBreak，会丢字节）+ 往返逐字节测试，约 60–90 行；硬塞进本轮会碰第 41 轮刚改的 `escapeHtmlForParse` | 独立一轮第一项，先做节点与序列化，再接渲染 |
| `escapeHtmlForParse` 改 CommonMark 严格围栏 + 修 `scripts/data-safety-acceptance.mjs` 的 `.editor` 选择器 | 第 41 轮 leftover ①③ | P2 | 要同时改 `codeScan.ts` 的 `fenceMap` 与 `risk.ts` 的同名判定（两处必须一致），再加数据安全套件复跑；本轮两条 P1 优先 | 与行内 HTML 同族，排下一轮第二项 |
| 1 MB 载入 parse 段拆埋点 | 第 41/42 轮 leftover ⑥ | P2 | 单遍 ≈110 s（第 39 轮实测），需要独立性能轮；本轮先做 T3 的精确快路径（相等短路直接省掉 1 MB 的 76.8 ms） | 排在性能轮，先定口径再拆 `manager.parse` |
| 脚注定义里的粗体 / 链接 / 公式渲染 | bug 第 3 条 | P2 | 要把 marked manager 复用进 `export.ts`（不依赖编辑器实例）并保住 XSS 策略，约 1 小时；且预览的 `hasMath` 只扫 `bodyHtml`，做脚注公式时要把 `footnotes` 一起算进去（`src/components/PreviewPane.tsx:42`） | 单独一轮：先给 `renderFootnotes` 接行内渲染，再补 `hasMath` |
| 宿主 `OnNavigationStarting` 取消非应用导航 | typora 第 1 条附带 | P2 | 白名单写错会白屏，需要宿主构建 + `host-smoke` 验证；Web 层 `preventDefault` 已挡住浏览器 / WebView2 的默认导航 | 与「真实拖放 / 宿主拖入打开」同轮做 |
| 专注模式首次提示条、Mermaid「复制源码 / 放大」、图片缩放 | typora 第 2/4/5 条 | P2 | 都是新入口 / 新能力，各 20–40 行 + e2e；本轮 4 个任务已满 | 按 typora 报告顺序排 |
| `App.tsx` 自动保存守卫抽 `src/lib/autoSaveGate.ts` + 8–10 条单测；`rename.ts` 6–8 条单测 | code F3/F4 | P2 | 内部质量，排在用户可见与数据安全之后；F3 要动 `App.tsx` 保存链，约 20 min | 性能/质量轮：先抽 `shouldAutoSave` 再补 `rename` 测试 |
| `installer.ps1` 改用 CI 的 NSIS 固定资产 + SHA256、失败信息可行动；`setup.exe` 图标；`SHA256SUMS.txt` 发布专项 | ship S1 / 第 42 轮 S2/S3 | P2 | 要真打包（隔离根）并改 PowerShell（UTF-8 BOM 坑），本轮无 release 任务；`release/` 硬约束不动 | 发布专项轮一次做 |
| ui P2：预览列横向跳 139 px、表格条离表格 639 px、1024 窄窗行长、查找条 role/live region、`aria-pressed` 两处、`:active`、24×24 目标、H2/H3 行高 | ui F2–F9 | P2 | 8 条里 6 条是 CSS / 无障碍小改，但需要各自的截图矩阵与量测；本轮已含 T1 的预览契约 | 下一轮「界面细化」一次清 5–6 条 |

**明确不砍**：T1 的只读守卫与 e2e（含正对照）、T2 的 drop 守卫与 Esc 对比断言、T3 的相等短路单测与正向对照 grep、T3 的 6a 改动支正对照（R43-4）、T4 的 Windows 安装步骤（含 **R43-7 的 WebView2 运行时前提**）与五处计数同值（R43-1）、**`typora-gap.md:49` 的「粘贴为纯文本」搬行与三处标题计数一次改齐（R43-6：只值 1–2 min，却是 R43-1/R43-2 一致性的前提，已移出砍单）**、`Ctrl+Shift+V` 行的「浏览器原生键」标注与注释同步（R43-2）。

## 八、环境与脚本注意（本轮会重复踩）

- dev server 只在 `http://localhost:5175`：不另起、不重启；`5173` 是僵尸 server，禁用。
- 浏览器只用 CDP **9222**：不启动 Edge、不 kill `msedge`、不 `browser.close()`；每段 E2E 前 `node .tmp/reset.mjs 9222`（reset 后剩 `about:blank`，`connectOverCDP` 可直接 attach）。
- 自写脚本放 `.tmp/e2e-r43-impl-t{1,2,3,4}.mjs`，结尾 `page.close()` 后 `process.exit(0)`；中文脚本用 `write`/`edit` 工具改，不要用 PowerShell `Get-Content -Raw | -replace | Set-Content`（AGENTS §8）。
- 假工作区引导抄 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `readFakeFile`；切文件时若有「切换文档」对话框先点「不保存」（对话框开着时文件树是 `inert`，直接点会 30 s 超时，bug 第 43 轮实测）。
- 大文档测 `Ctrl+End` 前先把焦点点进 `.ProseMirror` 并停 200–250 ms（第 42/43 轮两次假阴）。
- `keyboard-acceptance.mjs` 会覆写 `shots/round-05/` 3 张已跟踪截图：跑完 `git checkout -- shots/round-05/`。
- `npm test` 的条数以输出为准；新增测试只**叠加**到既有 `src/lib/risk.test.ts`（不新增文件，就不用改 `package.json` 的 `scripts.test`）。
- 截图统一 `shots/round-43/impl-*`，不覆盖本轮 finder 的截图；`data-safety-acceptance.mjs` 的 `.editor` 问题已知（§七），失败先判脚本过期，不算回归。

## 九、时间预算（诚实口径）

| 任务 | 实现 | 自测 / E2E | 小计 |
| :--- | ---: | ---: | ---: |
| T1 | 6 min | 6 min | 12 min |
| T2 | 4 min | 4 min | 8 min |
| T3 | 3 min | 4 min | 7 min |
| T4 | 4 min | 3 min | 7 min |
| 收尾（CHANGELOG/README/AGENTS/impl.md） | — | — | 3 min |
| 门禁串跑（tsc/build/test/verify/roundtrip/keyboard） | — | — | 5 min |
| **合计** | | | **≈ 41 min** |

比 35 min 多出的约 6 min 全部落在 T4（纯文档）、T3 的 6a 正对照与收尾；**按下面的检查点砍，就能回落到 35 min 门口**：
- **T1 结束 >15 min**：T2 的图片拖入回归断言降级为「记录 + 代码复核」；T2 的 Esc 断言保留。
- **T2 结束 >25 min**：只砍 §九 #1（T4 的快捷键 e2e，≈1 min）；**差距表搬行与五处计数照做**（R43-6：只值 1–2 min，却是 R43-1/R43-2 一致性的前提）。
- **T3 结束 >33 min**：砍 §九 #2（T3 的 1 MB 复测）；收尾里 `impl.md` 只写「文件:行号 + 输出摘要 + UNVERIFIED」，不贴长日志。

**超 35 min 时按此顺序砍**（每项只砍一次，不跳着砍；**R43-6：搬行不在砍单里**）：
1. T4 的快捷键 e2e 断言（保留代码一行 + grep 验收，`Ctrl+Shift+V` / 「浏览器原生键」三条 grep 仍要过）；
2. T3 的 1 MB 复测（保留 100 KB 的 parse-done / bytes 断言）；
3. T2 的图片拖入回归断言（改为记录 + 人工复核「ProseMirror 先接住」的代码路径）；
4. T3 的 `measure-first-screen.mjs` 头注释（保留 README 那一句）。

**这 4 项合计 ≈4 min。若全部砍完仍超 35 min：不再砍文档与五处计数**（R43-1/R43-6 的一致性优先于超时），按验收跑完，把实际用时写进 impl.md。

**这些不砍**：T1 的全部入口守卫与 10 条 e2e（含编辑态正对照）、T2 的 drop / Esc 断言、T3 的 `risk.ts` 相等短路与 5 条单测、T3 的 6a 改动支正对照（R43-4）、T4 的**搬行与三处标题计数**、`README.md:87` / `:162` 与 gap 表 / `AGENTS.md` 的五处计数同值（R43-1/R43-6）、`Ctrl+Shift+V` 行的「浏览器原生键」标注与注释同步（R43-2）、T2 结束与 §六 串跑的 `keyboard-acceptance` 复跑。

**revision 2 的四个漏洞落点复核**（执行代理不需要再查）：R43-1 → §五.1 两条 + §五 验收改前/改后两组 grep；R43-2 → §五.4 两处（`:38` 后加行 + `:51-54` 注释）+ e2e 断言含来源标注；R43-3 → §二.7 口径 + §二 步骤 1 基线单跑断言 9 + 验收第 9 条标题 + §六.1 CHANGELOG 措辞；R43-4 → §四 步骤 6a + 验收 grep/e2e + §四 风险两条。四条都只加 1–2 行 / 改一句，未扩大范围、未新增任务。

**revision 3 的三个漏洞落点复核**（执行代理不需要再查）：R43-5 → §六.3 的两处落点（`:39`+`:72` 改测试条数、`:74` 只改首屏与差距计数）+ §六「收尾验收」三条 grep（改前 2 / 1 → 改后 0 / 1 / 2 同值）；R43-6 → §九 砍单重排（搬行移出，#1 改为快捷键 e2e，共 4 项）+ §九 的 T2 检查点 + §七/§九 两处「不砍」+ 追加「全砍完仍超时也不砍文档与计数」；R43-7 → §五.1 Windows 块第一条（WebView2 运行时）+ §五 验收改前 0 / 改后 1 的 grep + 开始菜单/卸载改成指向 `packaging/README.md`（不写成已验证）。三条都只加 1–2 行 / 改一到两句，未扩大范围、未新增任务；时间预算由 ≈42 min 减为 **≈41 min**（`keyboard-acceptance` 少跑 1 次）。
