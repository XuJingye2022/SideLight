# 第 32 轮计划（planner · **revision 2**）

> **revision 2（第 2 次修订，2026-11-17，planner-revision，只读）**：按 `plan-review.md`（revision 1 复评）的 1 条 P1 + 5 条 P2 逐条修，四个任务的结构与范围不变；另订正 revision 1 一处 grep 表述。每条修法都用 `read` / 实跑复核过（见文末「证据与 UNVERIFIED」）。
> - **R2-P1-1** T2 的两条复跑命令补 URL：`node scripts/qa16.mjs http://localhost:5175`、`node scripts/qa10.mjs http://localhost:5175`（两脚本 `:3` 默认 `http://localhost:5173`；那是 `common.md:15` 禁用的僵尸 server，review 实测仍活且返回 200，不带参数不会报错、会静默在另一个 Vite 实例上跑出 PASS）；每条前加 `node .tmp/reset.mjs 9222`。
> - **R2-P2-1** T4-A 改 `vite.config.ts` 会让 5175 **自动重启**（`node_modules/vite/dist/node/chunks/node.js:25404` 实有 `changed, restarting server...`，revision 2 实读），与并行跑 e2e 的 A 撞车 → 采用**方案②**：新增 T4-A「步骤 0」，把 T4-A 排在 A 的全部 e2e 之后，并行的只有 T4-B；改完必须确认 `http://localhost:5175/src/main.tsx` 返回 200。这条同时写进全轮硬约束 5。
> - **R2-P2-2** `scripts/qa16.mjs:123` / `scripts/qa10.mjs:133` 各覆写一张**已跟踪**截图 → T2 的两条命令后分别加 `git checkout -- shots/preview-and-popover.png shots/fixes4.png`；硬约束 4 与全轮门禁第 5 条的还原/自查清单从两处扩到四处。
> - **R2-P2-3** T4-B 量 chunk 只取 `*.mjs`、排除 `*.mjs.map`（unpkg 元数据实测：73 个 `.mjs` = 2,675,506 B，73 个 `.mjs.map` = 10,441,081 B；混算会把 raw 从 2.68 MB 虚增到 13.1 MB、文件数变 146）；主入口只量 `dist/mermaid.core.mjs`（`exports['.'].import` 实测），不用 UMD 全量包；ADR 注明 bundlephobia 43 asset 与本地 73 chunk 口径不同。
> - **R2-P2-4** T3 点明第三个改点 `App.tsx:4870-4874`：`paragraphs={statsDetail.paragraphs}` 必须显式传入（新 prop 可选，漏传 `tsc` 不报错）；另加一条静态验收 `grep -n 'paragraphs={statsDetail.paragraphs}' src/App.tsx` 有 1 行。
> - **R2-P2-5** T4-A 的注释更新清单补 `vite.config.ts:35-36`：现文「900 是历史估计、已不够用」与「1200…留约 100 kB 余量」在阈值改 950 后全成假话。
> - **订正（revision 1 表述错误）** revision 1 写「全仓库 `setSelection(` 只有这 4 处（3 处字面量 + `:904` 回调）」，实际 `setSelection(` 只有 3 次调用（`:904` / `:958` / `:1034`），第 4 处是 `:348` 的 `useState` 初值字面量。清单本身不变，仍是这 4 处要改。
> - **任务量复核**：T2 多两条 `git checkout`（约 10 s）、T4-A 多一次 200 健康检查与两条静态 grep（约 10 s）；T4-B 的 glob 收窄反而更省。A 仍约 36 分钟、B 约 40 分钟，与 revision 1 持平，未因本次修订变长。
>
> **revision 1（第 1 次修订，2026-11-17，planner-revision，只读）**：按 `plan-review.md` 的 1 条 P1 + 5 条 P2 逐条修，四个任务的结构与范围不变。
> - **P1-1** T2 的 `setSelection` 字面量从「两处」改成**三处** `:348` / `:958` / `:1034`（`:1034` 在 `applyHostPayload` 末尾，宿主 `/__doc` 载入路径）；`onSelectionUpdate` 的 `:904` 单独描述；`words` 保持必填。
> - **P2-1** T2 门禁与验收加 `node scripts/qa17.mjs http://localhost:5175`（全仓库唯一断言「状态栏恰好 1 个 chip」），并补它覆写已跟踪截图 `shots/mode-switch.png` 的还原命令。
> - **P2-2** 选区 `words` 改成 `countText(selected)` 只跑一次，取 `cjk + words`。
> - **P2-3** T4-B 安装包公式的基数与压缩率同源：`824,595 B + 新增 raw × 0.329`（都出自 `findings-ship.md:17`），发布件 824,209 B（`:14`）只作对照；「新 dist 重打一次包」列为再评估实测项。
> - **P2-4** T3 解析失败回退传 `paragraphs: undefined`，新 `title` 只在 `paragraphs !== undefined` 时出现，否则保留旧文案「空行分段的段数」。
> - **P2-5** 改成「两个 builder 必选并行」，删掉单代理顺序做；T4-B 的 ADR 限 ≤120 行、五节固定。
> - revision 1 复核可执行性时新发现两处，已实测并写进对应任务：① 沙箱内 npm 默认缓存目录不可写，T4-B 的 `npm pack` 必须带 `--cache .tmp/npm-cache`；② `qa17` 会覆写已跟踪的 `shots/mode-switch.png`。

- 基线：`main` @ `d47d482`（工作树干净，只有本轮的 `docs/iteration/round-32/` 与 `shots/round-32/` 未跟踪）；版本 **0.32.1**（本轮不发版）。
- 门禁现状（finder 本轮实跑）：`npm run build` PASS；首屏 **284,761 B / 上限 286,000 B，余 1,239 B**；`npm test` 21 文件 272 条。
- 输入：`round-32/findings-bug.md`（1 条 P1）、`round-32/findings-typora.md`（5 P1 + 4 P2）、`round-32/findings-ship.md`（2 P1 + 4 P2）、`round-32/plan-review.md`、`docs/iteration/STATE.md`、`README.md`、`docs/typora-gap.md`、`git log -8` 与相关源码。

## 本轮取舍（先说结论）

- 产品负责人点名三项：**Mermaid / 字数点击明细 / 大纲折叠**。大纲折叠第 29 轮已做；字数明细第 30–31 轮已做但有口径错误（T3 修）；**Mermaid 本轮只做实测与 ADR（T4-B），不硬上**——首屏只有 1,239 B 余量，安装包本就超内部预算、距硬线 850,000 B 只剩 25,791 B，引入 mermaid 必然破安装包硬门，属第 3 条优先级之后的决策，需要产品负责人定。
- 工作区图片破图（Typora 侦察第 1 条，P1）是本轮最大的用户可见缺陷，但**本轮不做**：估算 +1.0–1.5 KB 首屏（破 286,000）、需要先有「省字节」任务配对，且假 FSA 工作区写不出真 PNG 字节，首轮实现无法验证。留作下一轮的头号任务，见文末「不在本轮范围」。
- 本轮四个任务全是小改动：三个用户可见（T1 死快捷键、T2 选区计数、T3 字数明细「段」），一个体积护栏 + 决策文档（T4）。**两个 builder 必须并行**：A（T1/T2/T3，同一个 `App.tsx` 串行）约 36 分钟，已顶满单代理上限；B（T4）另需约 40 分钟；两者文件不重叠（见「文件归属」）。单代理顺序做完是 50 分钟以上，**本计划不提供单代理路径**。**但并行的只有 T4-B**：T4-A 要改 `vite.config.ts`，Vite 会立刻重启 5175（见 T4-A「步骤 0」），所以 T4-A 必须排在 A 的全部 e2e 之后。

## 全轮硬约束（写进每个任务的验收）

1. **不发版**：`package.json` 的 `version` 保持 `0.32.1`，不改 `package-lock.json` 版本字段；`docs/CHANGELOG.md` 的 `## Unreleased（第 29–30 轮，未发版）` 改为 `## Unreleased（第 29–32 轮，未发版）`，在其下加「**第 32 轮**」子段，四条改动各一行。
2. 不改 `release/`；不 push；不新建依赖（T4-B 只 `npm pack` 到 `.tmp/`，**不得**改 `package.json`）。
3. 首屏 gzip ≤ 286,000 B。本轮新增代码体积预算：T1 0 B、T2 <200 B、T3 <200 B、T4 0 B（首屏不变）。实施代理不得跑 `npm run build`（会写 `dist/`，与另一 builder 抢；STATE 2026-11-15 决策），用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a|build-b`。
4. 界面有变化必须截图，图落 `shots/round-32/`（不要覆盖 `shots/round-05/`；跑 `scripts/keyboard-acceptance.mjs` 后必须 `git checkout -- shots/round-05/`，见 AGENTS §8）。**跑 `scripts/qa17.mjs` 后必须 `git checkout -- shots/mode-switch.png`**：该脚本 `:70` 覆写这个已跟踪文件，revision 1 实测会出现在 `git status` 里。**revision 2 补**：`scripts/qa16.mjs:123` 与 `scripts/qa10.mjs:133` 也各覆写一张已跟踪截图，跑完必须 `git checkout -- shots/preview-and-popover.png shots/fixes4.png`（`git ls-files shots/` 实测这两张都在版本控制里）。
5. E2E 环境：dev server `http://localhost:5175` 已运行，不要重启；浏览器只用 CDP **9222**，不要启动 Edge、不要 kill `msedge`；每个脚本开头先 `node .tmp/reset.mjs 9222`。自写脚本放 `.tmp/e2e-r32-*.mjs`，连接方式抄 `scripts/acceptance.mjs`，结尾 `page.close()` 后 `process.exit(0)`。**唯一的重启例外**：T4-A 改 `vite.config.ts` 会让 5175 自动重启几秒（Vite 监听配置文件，`node_modules/vite/dist/node/chunks/node.js:25404`），所以 T4-A 必须排在 A 的全部 e2e 之后（T4-A 步骤 0）；其余任何人不准触发重启。

---

## T1（P1 缺陷，S，用户可见）Windows 上 `Ctrl+Shift+P` 预览快捷键无声失效

**为什么**：快捷键一览（`src/components/ShortcutsDialog.tsx:44`）与预览按钮 tooltip（`src/App.tsx:4519`）都在宣传这个键，实际按下去什么都不发生（finder 实测：状态栏与 `contenteditable` 都不变），用户只能改用鼠标。这是「宣传了但没实现」的信任问题，改一行就能修。

**根因（已复核）**：`src/App.tsx:3613` 的条件里有 `!event.ctrlKey`；同函数 `:3443` 定义 `mod = event.ctrlKey || event.metaKey`。Windows 的 `Ctrl+Shift+P` 带 `ctrlKey=true`，该分支永远进不去；只有 macOS 的 `Cmd+Shift+P` 能命中。`key` 已在 `:3444` 小写化，`Ctrl+P` 快速打开在 `:3576` 要求 `!shiftKey`，不冲突。

**改动文件 / 函数**
- `src/App.tsx:3613`：删除 `!event.ctrlKey`（**不要**改成 `!event.metaKey`，那会把 macOS 弄坏；直接把条件写成 `mod && !event.altKey && event.shiftKey && key === 'p'`）。
- `scripts/keyboard-acceptance.mjs`：在 `Control+Shift+3`（`:440`）之后、`// T3：…`（`:442`）之前插入一组「预览快捷键」断言。插点态是编辑模式（`Control+Shift+3` 切的是侧栏，不是源码模式），与 critic 探针的起始态一致。

**实施步骤**
1. 先跑一次基线，记录条数与 PASS 数（预期 49/49）：`$env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/keyboard-acceptance.mjs http://localhost:5175`；随后 `git checkout -- shots/round-05/`。
2. 改 `:3613` 的条件。
3. 加三条断言（写成 `check(...)`）：
   - 按 `Control+Shift+P` 后：`.status-right` 文本含「预览」，且 `.ProseMirror` 的 `contenteditable === 'false'`；
   - 同一时刻 `.quick-open`（或 `QuickOpen` 组件根节点）数量为 0（证明没被 `Ctrl+P` 抢走）；
   - 按 `Escape` 后回到编辑：`contenteditable === 'true'`，`.status-right` 不含「预览」。
   - 每次按键后先 `await page.waitForTimeout(400)` 再断言，**不要**按键后立刻断。critic 实测：按 `Esc` 后 400 ms 内已回到编辑、`.status-right` 变空；脚本里其它断言也用 300–500 ms。
4. 另写 `.tmp/e2e-r32-t1-preview.mjs` 触发一次并截图 `shots/round-32/t1-preview-by-key.png`（截图前先 `reset.mjs 9222`）。

**验收**
- `npx tsc --noEmit` 无输出。
- `node scripts/keyboard-acceptance.mjs http://localhost:5175`：**52/52 PASS**（49 + 3，`check(` 现为 49 处已复核），最后 `git checkout -- shots/round-05/` 后 `git status` 里 `shots/round-05/` 无改动。
- `shots/round-32/t1-preview-by-key.png` 里状态栏右侧有「预览」chip 且正文不可编辑。
- `CHANGELOG` 记一行（见全轮约束 1）。

**门禁**：`npx tsc --noEmit`；`npm test`（不回归）；`scripts/keyboard-acceptance.mjs`（命令与验收第 1 步相同，`$env:SIDELIGHT_CDP='http://127.0.0.1:9222'`，跑完 `git checkout -- shots/round-05/`）。
**风险**：WebView2 宿主已关浏览器加速键（`host/Program.cs:1491`），理论上按键能到页面，但**本轮只在浏览器实测，宿主未实按 → 记 UNVERIFIED**。macOS `Cmd+Shift+P` 本机无法验证，只在报告里写静态推断。
**体积**：0 B（只删条件、加脚本）。
**截图**：`shots/round-32/t1-preview-by-key.png`。

---

## T2（P1，S，用户可见）状态栏随选区显示计数

**为什么**：Typora 状态栏随选中显示「9 / 195 词」（`docs/iteration/typora-features.md:53`）；Sidelight 选中 6 字后状态栏仍是「69 字 · 阅读约 1 分钟」，用户必须点开面板才知道选了多少。数据已经有了（`src/App.tsx:348` 的 `SelectionState`、`:901-907` 的 `onSelectionUpdate`），只差传给 `StatusBar`。

**改动文件 / 函数**
- `src/App.tsx`
  - `:202-207` `SelectionState` 加 `words: number`（**必填，不要改成可选**；= 选区的中日韩字 + 拉丁词，与状态栏/面板同口径；**不要**改 `chars` 语义，AI 气泡 `:4272` 在用）。
  - `:904` `onSelectionUpdate`（函数体 `:901-907`；`setSelection` 在 `:904`，是**回调**不是初始化字面量）：`from !== to` 时 `const selected = current.state.doc.textBetween(from, to, '\n')`，再 `const selectedStats = countText(selected)`（**只调一次**），`words: selectedStats.cjk + selectedStats.words`；`from === to` 直接 `words: 0`（不建字符串）。不要写成 `countText(selected).cjk + countText(selected).words`：那是同一个字符串扫两遍，全选 1 MB 时白扫 1 MB。
  - 三处 `setSelection({ ... })` 对象字面量各补 `words: 0`：`:348`（`useState` 初值）、`:958`（载入文档 `useEffect`）、`:1034`（`applyHostPayload` 末尾，宿主 `/__doc` 载入路径）。本轮 grep 复核：`setSelection(` **调用**只有 3 处（`:904` 回调、`:958`、`:1034`），加上 `:348` 的 `useState` 初值共 **4 处要改**（revision 2 订正 revision 1 的「3 处字面量」措辞）；漏 `:1034` 会让 `npx tsc --noEmit` 直接报 `Property 'words' is missing`。
  - `:4830` 传 `selectionWords={viewMode === 'edit' ? selection.words : 0}`（源码/预览里不显示旧选区）。
- `src/components/StatusBar.tsx`：props 加 `selectionWords?: number`；在 `.stats-trigger` 之后、`元数据` chip 之前（即 `:48` 按钮之后、`:49` 之前）渲染
  `<span className="status-chip status-chip-quiet status-selection" title="选中文字的字数：中日韩字 + 拉丁词，与字数明细的选区行同口径">选区 {n} 字</span>`，`n === 0` 时整块不渲染（不占位）。样式复用 `.status-chip`（`src/styles.css:1505`），不新增 CSS。

**验收**
- `.tmp/e2e-r32-t2-selection.mjs`（9222，先 reset）：
  1. 在空文档里键入两段已知文字；`Home` + `Shift+End` 选中第一段 → `.status-selection` 存在且文本匹配 `/^选区 \d+ 字$/`，数字等于点开字数明细面板后「选区」行的「N 字」（两处必须相等）。
  2. 点正文末尾折叠选区 → `.status-selection` count 为 0（面板不再有该 chip）。
  3. `Control+a` 全选 → chip 数字等于面板「合计」。
  4. 1024×700 窗口下 `.status-bar` 的 `scrollWidth === clientWidth`（不换行、不溢出）。
- `node .tmp/reset.mjs 9222` 后 `node scripts/qa17.mjs http://localhost:5175` → **7 条全 PASS、exit 0**（revision 1 已实测基线；它第 5 条断言 `.status-chip` **恰好 1 个**且为「预览」），跑完 `git checkout -- shots/mode-switch.png`。
- 口径硬要求，写进报告：**预览/源码态必须 `selectionWords = 0`**（`viewMode === 'edit'` 三态门），不能写成 `selection.words > 0` 之类的渲染判断；qa17 第 5 条就是这条门的回归锁。
- 截图 `shots/round-32/t2-selection-chip.png`（1440×900）与 `shots/round-32/t2-selection-chip-narrow.png`（1024×700）。
- `npx tsc --noEmit` 无输出；`npm test` 不回归（仍 21 文件，条数 ≥272）。
- 复跑另两个读整栏状态栏文本的脚本确认不假失败。**两条都必须带 URL**（复习：两脚本 `:3` 默认 `http://localhost:5173`，那是 `common.md:15` 禁用的僵尸 server，review 实测仍活、`/src/main.tsx` 返回 200——不带参数不会报错，而是静默在另一个 Vite 实例上跑出 PASS/FAIL，属 AGENTS §8 的旧模块图场景）：
  - `node .tmp/reset.mjs 9222` → `node scripts/qa16.mjs http://localhost:5175` → `git checkout -- shots/preview-and-popover.png`（`scripts/qa16.mjs:123` 覆写这张已跟踪截图）；
  - `node .tmp/reset.mjs 9222` → `node scripts/qa10.mjs http://localhost:5175` → `git checkout -- shots/fixes4.png`（`scripts/qa10.mjs:133` 覆写这张已跟踪截图）；
  - 两者只打印文本或 `includes('预览')`，新 chip 不改变这些断言。

**门禁**：`npx tsc --noEmit`；`npm test`；`.tmp/e2e-r32-t2-selection.mjs`；`node .tmp/reset.mjs 9222` + `node scripts/qa16.mjs http://localhost:5175`（跑完 `git checkout -- shots/preview-and-popover.png`）；`node .tmp/reset.mjs 9222` + `node scripts/qa10.mjs http://localhost:5175`（跑完 `git checkout -- shots/fixes4.png`）；`node .tmp/reset.mjs 9222` + `node scripts/qa17.mjs http://localhost:5175`（跑完 `git checkout -- shots/mode-switch.png`）。
**风险**：8 个脚本按整栏 `.status-bar` 文本抓字数（`src/App.tsx:4867` 注释、`scripts/qa16.mjs:33`）——新 chip 只在有选区时出现，且位于触发按钮之后，不影响前缀匹配；但必须复跑上面三个脚本（三条都带 `http://localhost:5175`，见验收与门禁）。**「状态栏恰好 1 个 chip」只有 qa17 守**（`scripts/qa17.mjs:66-67`），`viewMode === 'edit'` 的门写错时 qa16/qa10 都抓不到，所以 qa17 是必跑门禁、不是可选项。`words` 必填下三处字面量漏一处就编译失败，按上面的清单逐处补。大选区（全选 1 MB）每次会多一次 `textBetween` + **一次** `countText`，只发生在一次选区变化，可接受；若实测卡顿（>50 ms），在报告里记性能备注，不要为它加缓存。
**体积**：<200 B gzip。
**截图**：两张（宽/窄）。

---

## T3（P1，S，用户可见）字数明细「段」按正文块计，编辑/源码两模式同口径

**为什么**：现在编辑模式「段」恒为 1（finder 实测：5 段正文 + 4 标题 → 段 1；加 2 行代码块 → 段 2），源码模式同一篇显示 段 16（非空行数）。写作者用「段」判断章节切分，这一行目前是无效信息，且两个模式自相矛盾（`docs/iteration/STATE.md:127` 已列为下一轮优先项）。

**现状（已复核）**：`src/App.tsx:3815` 明细正文取 `editor.state.doc.textContent`；`src/lib/wordcount.ts:54` 的「段」= `text.split(/\r?\n/)` 后非空行数。ProseMirror 的 `textContent` 不在块之间插换行，所以只有代码块内的换行能被数到。

**口径（写进面板提示，全仓库只此一套）**：段 = **正文文本块数**。段落（`paragraph`）计 1；列表项、引用里的段落按段计；代码块整块计 1（内部换行不拆）；标题（`heading`）不计；表格（`table`）不计。

**改动文件 / 函数**
- `src/lib/wordcount.ts`：新增
  ```ts
  export type BlockStatsNode = {
    type: { name: string }; isTextblock: boolean; textContent: string
    childCount: number; child(index: number): BlockStatsNode
  }
  export function countParagraphs(doc: BlockStatsNode): number
  ```
  规则：`heading` / `table` 返回 0 且不下钻；`codeBlock` 有文本计 1；其他 `isTextblock` 有文本计 1；容器递归子节点。ProseMirror 的 `Node` 结构上直接满足该类型，`App.tsx` 里传 `editor.state.doc` 即可。
- `src/lib/wordcount.test.ts`：+4 条（两段无空行 = 2；4 标题 + 5 段 = 5 且标题不计；列表 3 项 = 3；2 行代码块 = 1）。用小工厂函数造假节点（`childCount`/`child`），不引入 `@tiptap/pm`。
- `src/App.tsx:3810-3821` `openStatsDetail`：
  - 编辑模式：`countParagraphs(editor.state.doc)`；
  - 源码模式：`splitFrontmatter(sourceText).body` → `manager.parse(escapeHtmlForParse(protectMathPairs(body)))` → `editor.schema.nodeFromJSON(...)` → `countParagraphs(...)`（抄 `:922-923` 的写法）；`manager` 缺失或解析抛错时 `try/catch` 回退——**回退时 `paragraphs` 传 `undefined`**，不要传 `countText(body).paragraphs` 的行数（那是旧口径，同一篇会从 5 跳到 16）。
  - **三处一起改**（新 prop 是**可选**的，漏传 `paragraphs={…}` 时 `npx tsc --noEmit` 不报错，面板会继续显示旧值，只能等 e2e 的「5」去抓）：
    1. `App.tsx:486` 的 `statsDetail` state 加 `paragraphs?: number` 字段：**字段本身可选**，`undefined` 表示「回退到旧口径」，不是「没算」。`0` 是合法值（空文档），`??` 不能换成 `||`；
    2. `App.tsx:3810-3821` 的 `openStatsDetail` 按上面两条算值并写进这个字段；
    3. **`App.tsx:4870-4874`** 的 `<StatsDetail …/>` 加 `paragraphs={statsDetail.paragraphs}`（现文是 `text={statsDetail.text}` / `selection={statsDetail.selection}` / `onClose={…}` 三行，插在 `selection` 之后）。
  - **不要**把计数放进 `onUpdate`（1 MB 文档逐键成本）；只在打开面板时算一次。
- `src/components/StatsDetail.tsx`：props 加 `paragraphs?: number`；「段」行的值是 `number(paragraphs ?? stats.paragraphs)`，提示文案用三元：`paragraphs === undefined ? '空行分段的段数' : '正文段落数：段落与列表项各算 1；标题、表格不计，代码块整块算 1'`。现在是 `['段', number(stats.paragraphs), '空行分段的段数']`（`:85`），只改第二、三项，**不要**让两种口径共用新 `title`。面板脚注同步一句（只在 `paragraphs !== undefined` 时提新口径）。

**验收**
- `(Select-String -Path src/App.tsx -SimpleMatch 'paragraphs={statsDetail.paragraphs}').Count` = **1**（静态锁：新 prop 可选，漏传时 `tsc` 不报错，revision 2 补这条以免多跑一轮；Linux/CI 上等价于 `grep -c 'paragraphs={statsDetail.paragraphs}' src/App.tsx`）。
- `npm test` → **21 个文件、276 条**（272 + 4），新增 4 条全绿。
- `.tmp/e2e-r32-t3-paragraphs.mjs`（9222，先 reset）：键入「4 个 `## ` 标题 + 5 段正文」→ 点状态栏字数 → 面板「段」= **5**（改前 1）；`Control+/` 进源码模式再点开面板 → 仍 **5**（改前 16）；面板提示文案含「标题…不计」。
- 截图 `shots/round-32/t3-stats-paragraphs.png`（编辑模式）与 `shots/round-32/t3-stats-paragraphs-source.png`（源码模式）。
- `npx tsc --noEmit` 无输出；不改序列化，无需 roundtrip。

**门禁**：`npx tsc --noEmit`；`npm test`；`.tmp/e2e-r32-t3-paragraphs.mjs`。
**风险**：源码模式的 Markdown 解析对不完整输入可能抛错（已 `try/catch`；回退时 `paragraphs: undefined`，「段」回到旧口径、`title` 同步回到旧文案，面板的状态与文案永远一致，报告里记为已知退化）；`table` 不计是刻意取舍，写进提示避免被当 bug。假 FSA 不参与本任务（不需要工作区）。
**体积**：<200 B gzip。
**截图**：两张。

---

## T4（P1 体积风险 + 决策文档，M，内部质量）构建期体积护栏 + Mermaid 实测与 ADR

**为什么**：首屏余量只剩 1,239 B（0.43%），而 `vite.config.ts:39` 的 `chunkSizeWarningLimit: 1200` 比实测主 chunk 893,343 B 高 307 KB——加依赖或加静态 import 时 `npm run build` 一声不响，只能等 measure 脚本兜。同时产品负责人点名的 Mermaid 必须先把体积量清楚、把决策写成 ADR，不能靠估算硬上（首屏 1,239 B 余量 + 安装包硬线 850,000 B 只剩 25,791 B）。

### T4-A 构建期护栏（S）

**步骤 0（执行顺序，revision 2 新增，取 review 的方案②）**：T4-A **必须**排在 builder A 的 `keyboard-acceptance.mjs` 与三个 `.tmp/e2e-r32-*.mjs` **全部跑完、截图已还原之后**再做。原因：Vite 8.3.8 监听配置文件，`vite.config.ts` 一保存就打印 `changed, restarting server...` 并重启 5175（`node_modules/vite/dist/node/chunks/node.js:25404`，revision 2 实读该行），A 的 `page.goto(5175, {waitUntil:'networkidle'})` 撞上会拿到假 FAIL。执行方式：B 先做完 T4-B（不碰 server，可安全并行）；A 报完成后，由根代理让 B 接着做 T4-A（对同一 subagent `send_message` 追加，或根代理自己改这两处文本 + 跑一次 `.tmp/build-b`，两种都合规）。改完立刻 `(Invoke-WebRequest -UseBasicParsing http://localhost:5175/src/main.tsx).StatusCode`，应为 `200`（revision 2 实测当前 200）。

**改动文件**
- `vite.config.ts:32-39`：`chunkSizeWarningLimit: 1200` → **950**（现在 893,343 B，留约 57 kB 缓冲；超了就告警）；`:32` 的「主 chunk 约 840 KB」与 `:35` 的「主 chunk 约 1.10 MB（第 05 轮实测 1,100–1,104 kB）」都改成实测「主 chunk 893,343 B（第 32 轮实测，2026-11-17）」。
- **`vite.config.ts:35-36`（revision 2 补）**：现文是「主 chunk 约 1.10 MB（第 05 轮实测 1,100–1,104 kB），900 是历史估计、已不够用」+「1200 是为此显式设定的告警线，留约 100 kB 余量；不是放任体积增长」。阈值改 950 后 `1200` 与 `100 kB` 全成假话。改成：「主 chunk 893,343 B（第 32 轮实测，2026-11-17），950 是为此显式设定的告警线，留约 57 kB 余量；不是放任体积增长。」并删掉「900 是历史估计、已不够用」半句。
- `README.md:99`：「构建仍用 `chunkSizeWarningLimit: 1200`（主 chunk 892,443 B）」→「构建仍用 `chunkSizeWarningLimit: 950`（主 chunk 893,343 B，2026-11-17 实测）」。

**验收**
- `npx vite build --outDir .tmp/build-b 2>&1 | Select-String 'larger than'` 无输出（Vite 告警原文是 `Some chunks are larger than 950 kB`）。现有第二大 chunk 是 `katexLoader-*.js` 258,788 B（`dist/` 本轮实测），阈值 950 不会误报。
- `node scripts/measure-first-screen.mjs --dir .tmp/build-b` → `PASS`，`files=2`。
- `Select-String -Path vite.config.ts -Pattern '1200|100 kB'` 无输出（旧阈值与旧余量数字都已删净）；`(Invoke-WebRequest -UseBasicParsing http://localhost:5175/src/main.tsx).StatusCode` = `200`（重启后 server 仍可用）。
- `git diff --stat` 里 `dist/` 无改动（本任务不跑 `npm run build`）。

### T4-B Mermaid 实测 + ADR（M）

**做法（不改 `package.json`、不 `npm install`）**
1. `npm pack mermaid@11.12.0 --pack-destination .tmp --cache .tmp/npm-cache` → 解包到 `.tmp/mermaid-pkg/`（`tar -xzf`，Windows 自带 bsdtar）。**`--cache` 必需**：沙箱下 npm 默认缓存目录（`%LOCALAPPDATA%\npm-cache`）不可写，不带它 `npm view` / `npm pack` 会以 `npm error ... error writing to the directory: ...\npm-cache\_logs` 失败（revision 1 实测）。版本已核对存在：`dist.tarball = https://registry.npmjs.org/mermaid/-/mermaid-11.12.0.tgz`，`dist.unpackedSize = 66,067,528 B`——解包后约 66 MB，量完就删 `.tmp/mermaid-pkg/`，不要把 66 MB 留在 `.tmp`。
2. 写 `.tmp/measure-mermaid.mjs`：用 `node:zlib` 的 `gzipSync(data, { level: 9 })`（与 `scripts/measure-first-screen.mjs:42` 同参数）分别量：
   - **主入口只量 `dist/mermaid.core.mjs`**：这是 Vite 的 `import()` 实际解析的入口（`package.json` 的 `exports['.'].import`；revision 2 用 `npm view mermaid@11.12.0 exports --json` 实读为 `./dist/mermaid.core.mjs`）。**不要**拿 UMD 全量包 `dist/mermaid.min.js` 当「主 chunk」——它与 bundlephobia 的 ESM 入口不是同一种东西，比出来的数没有意义。
   - 全部按需 chunk **只取 `dist/chunks/mermaid.esm.min/*.mjs`**，用 `readdir().filter(n => n.endsWith('.mjs'))`，**必须排除 `*.mjs.map`**。revision 2 用 unpkg 元数据实测（`https://unpkg.com/mermaid@11.12.0/dist/chunks/mermaid.esm.min/?meta`）：73 个 `.mjs` 合计 **2,675,506 B**，73 个 `.mjs.map` 合计 **10,441,081 B**，共 146 个文件。按 `*` 通配逐文件 gzip 会把 raw 从 2.68 MB 虚增到 13.1 MB、文件数变 146，raw/gzip/文件数三条全失真。脚本单独打印 `mjs 数` 与 `raw 合计` 两行（实施时以脚本输出为准，上面数字是复核值）。
   - 与 finder 的 bundlephobia 数字（主 chunk 150,471 B gzip、全部 43 chunk ≈770,559 B gzip）逐项对照；**文件数只作参考**：bundlephobia 记 43 个 asset，本地 npm 包实测 73 个 chunk，口径不同（ADR 里写明这句）。
3. 算安装包影响两档，公式写死一个基数，**基数与压缩率必须同源**：
   - `预计安装包 = 824,595 B + 新增 raw × 0.329`；
   - 824,595 B 与 0.329 都出自 `round-32/findings-ship.md:17`（「本机重建件 824,595 B / 载荷 2,510,153 B ≈ 32.9%」，`824595 / 2510153 = 0.3285`）；
   - GitHub Release 上的发布件 setup **824,209 B**（同文件 `:14`）只作**对照**，不进公式；
   - 0.329 是整载荷比率（含不可压的 woff2），对纯 JS 偏保守；同文件的 JS 实压比 `372,705 / 1,192,820 ≈ 0.312` 可作对照行；
   - 两档都算：只算主 chunk 一档、全部按需 chunk 一档。
   - **再评估时必须实测**：把 mermaid 真装进 `dist` 后重打一次 Windows 安装包，用新包字节替换这里的预估；本轮只在包外量，属 UNVERIFIED。
4. 写 `docs/adr/0017-mermaid-lazy-loading.md`（**≤120 行**，结构抄 `docs/adr/0015` / `0016`，五节固定：背景 / 决定 / 否决的方案 / 未验 / 状态），必须含：
   - **背景**：Typora 内置 Mermaid；Sidelight 现在把 ```mermaid 当普通代码块（finder 第 6 项实测）。
   - **方案**：照 ADR-0012 的 KaTeX 惰性做法（`src/lib/katexLazy.ts` → `mermaidLazy.ts` + `mermaidRender.ts`），**首屏 0 B 增量**，只在文档含 ```mermaid 时 `await import()`；导出 HTML 复用 KaTeX 导出等待的写法（`src/App.tsx:3831`）。
   - **实测数字表**：raw / gzip / 文件数 / 安装包两档预估，附命令与输出摘要。
   - **决定（本轮）**：**不实现**。首屏可接受（0 B），但安装包两档都破 850,000 B 硬线；这属于「加一个用户看得见的能力 + 改变安装包体积验收项」，必须回到产品负责人三选一：① 放宽安装包硬线到 X B（写清 X 与依据）；② 只上「按图类型懒加载」的子集方案（先另做一次可行性实测）；③ 维持不做，差距表保留 Mermaid 为缺。
   - **三条必须写清**：首屏 0 B 但「打开含图文档」多下 N KB gzip；安装包预估两档；渲染失败（未知语法）降级为代码块 + 一句提示，不抛错、不吞内容。
   - **再评估触发条件**：字体子集化（`round-32/findings-ship.md:59-66`，粗估省 80–120 KB）落地后重算；或首屏/安装包预算被产品负责人调整。
5. `README.md` ADR 索引同步：`:157` 与 `:198` 的「0001–0016」改「0001–0017」；`:181` 之后补一条决策行（与 ADR-0016 那条同格式：「Mermaid：…见 [ADR 0017](…)」）。

**验收**
- `docs/adr/0017-mermaid-lazy-loading.md` 存在，**≤120 行**、五节齐全；安装包公式的基数是 824,595 B 并注明 `findings-ship.md:17`；其中的 gzip 数字与 `.tmp/measure-mermaid.mjs` 输出一致（把输出贴进报告）。
- 计数口径的两条硬校验：① chunk **文件数按 `.mjs` 计**（复核值 73，不是 146；若打印 146 说明 `*.mjs.map` 没排除，退回改脚本）；② 主入口那一行量的是 `dist/mermaid.core.mjs`，ADR 里不出现「`mermaid.min.js` 是主 chunk」的表述。
- `npx vite build --outDir .tmp/build-b` 里 `dist` 类目**不含** mermaid（本任务不引入依赖）；`git diff --stat package.json package-lock.json` 为空。
- ADR 的结论一栏明确写着「本轮不实现 + 需产品负责人三选一」。
- 若 `npm pack` 取不到（网络失败）：ADR 改用 finder 的 bundlephobia 数字并标 UNVERIFIED，写清补测命令；报告里说明原因。npm 跑不通先查是不是漏了 `--cache .tmp/npm-cache`（revision 1 实测的失败形态），别直接判网络。

**门禁**：`npx tsc --noEmit`；`npx vite build --outDir .tmp/build-b`；`node scripts/measure-first-screen.mjs --dir .tmp/build-b`。
**风险**：`npm pack` 走外网（STATE 已核 npm registry 443 可达）；只写 `.tmp/`、`vite.config.ts`、`README.md` 与 `docs/adr/`，不碰 `dist/`、`release/`、`package.json`。降 `chunkSizeWarningLimit` 到 950 若在别的 chunk 上触发告警，先看告警的 chunk 名再决定阈值，不要为消警告而拆包——本轮 `dist/` 实测最大 893,343 B、第二 258,788 B，预期不告警。
**体积**：首屏 0 B；ADR 不改产物。
**截图**：无（无界面变化）。

---

## 文件归属（避免同一文件两个代理）

| 任务 | 建议归属 | 文件 |
| :--- | :--- | :--- |
| T1、T2、T3 | builder A（顺序做，App.tsx 串行） | `src/App.tsx`、`src/components/StatusBar.tsx`、`src/components/StatsDetail.tsx`、`src/lib/wordcount.ts`、`src/lib/wordcount.test.ts`、`scripts/keyboard-acceptance.mjs`、`docs/CHANGELOG.md`、`.tmp/e2e-r32-*.mjs` |
| T4 | builder B（T4-B 与 A 并行；**T4-A 排在 A 的全部 e2e 之后**） | `vite.config.ts`、`README.md`（仅 `:99`、`:157`、`:181` 附近、`:198`）、`docs/adr/0017-mermaid-lazy-loading.md`、`.tmp/measure-mermaid.mjs` |

- **两个 builder 必须并行**（P2-5 的修订结论）：A 单人是 36 分钟已顶满「一个执行代理 35 分钟」，B 另需约 40 分钟；顺序做四个任务是 50 分钟以上，所以本轮不接受单代理顺序方案。派不出两个代理就砍范围，不要拉长单代理时长。
- **并行的只有 T4-B**（revision 2，R2-P2-1 的方案②）：T4-A 改 `vite.config.ts` 会让 5175 自动重启，必须排在 A 的 `keyboard-acceptance.mjs` 与三个 `.tmp/e2e-r32-*.mjs` 全部跑完后，见 T4-A「步骤 0」。T4-A 只有两处文本改动 + 一次 `.tmp/build-b`，交给根代理做也合规。
- `docs/CHANGELOG.md` 只由 builder A 写（含 T4 一行，内容按本计划 T4 标题写），builder B 不改。
- `README.md:115` 的「21 个文件、272 条断言」由**根代理**在最终 `npm test` 后改成实际数字（T3 会加 4 条），不下发 builder。
- `shots/mode-switch.png`（qa17 覆写）、`shots/preview-and-popover.png`（qa16 覆写）、`shots/fixes4.png`（qa10 覆写）与 `shots/round-05/`（keyboard-acceptance 覆写）由**跑脚本的人**立刻 `git checkout --` 还原，不写进任何任务的截图目录。

## 全轮门禁（根代理串行跑，不在实施期间跑）

1. `npm run build`（写 `dist/`，只根代理跑一次）。
2. `npm test` → 期望 21 文件 **276** 条（T3 +4）；把实际数字写进 `README.md:115`。
3. `node scripts/measure-first-screen.mjs` → 必须 `PASS` 且 gzip ≤ 286,000；把新数字写进 README `:97`、`STATE.md`。
4. 可选 `npm run roundtrip`：本轮不改 Markdown 序列化，预期 `docs/roundtrip-report.md` 无差异；若跑出差异，先 `git checkout -- docs/roundtrip-report.md` 再判断是不是意外回归。
5. `git status` 自查（revision 2 扩到四张已跟踪截图）：`shots/round-05/`、`shots/mode-switch.png`、`shots/preview-and-popover.png`、`shots/fixes4.png` 均无改动；`release/` 无改动；`package.json` 版本仍 0.32.1。`git status --porcelain` 里除 `?? shots/round-32/`、`?? docs/iteration/round-32/` 与本轮源码/文档改动外不应有其他条目；**commit 前不要 `git add -A` 不看清单**，被覆写的截图一律 `git checkout --` 还原，不并进本轮提交。
6. commit：`round-32: 修预览快捷键、状态栏选区计数、字数明细段落口径、体积护栏与 Mermaid ADR`。

## 不在本轮范围（写清理由，留给下一轮）

| 项 | 来源 | 为什么本轮不做 | 下一轮建议 |
| :--- | :--- | :--- | :--- |
| 工作区图片一律破图（相对路径无解析通道） | typora 2.1（P1） | 估算 +1.0–1.5 KB 首屏（余量只 1,239 B），必须先有「省字节」配对任务；且假 FSA 写不出真 PNG 字节，首轮无法验证显示 | 定为下一轮头号任务：① 先找 ≥1.5 KB 省字节点（或把 NodeView 抽成惰性）；② `.tmp/r30-fsa.mjs` 改成按 `Uint8Array` 存字节，才能验 `naturalWidth > 0`;③ 真文件夹句柄手测一次插入 + 重开 |
| 表格列宽拖拽 | typora 2.4（P1） | 估算 +1.5–2 KB gzip，直接破首屏硬门；且 `colwidth` 要剥，`tableReuse` 需回归 | 与「省字节」同轮，或等首屏预算调整 |
| 粘贴为纯文本 `Ctrl+Shift+V` | typora 2.5（P1） | 本轮已有三个用户可见任务，35 分钟排不下第四个小功能 | 下一轮候选（约 35 行 + 2 条测试，<200 B） |
| 查找区分大小写/整词 | typora 2.6（P2） | 同上，P2 且 `FindBar` 已在惰性 chunk | 下一轮候选 |
| 本地 `installer.ps1` NSIS 下载源与哈希 | ship 2（P1） | 属安装/供应链，本轮体积类只留 T4；改 PowerShell 要带 UTF-8 BOM，需下载实测，超本轮预算 | 下一轮「发布与安装」任务：与 `ci.yml:83-87` 同源同上哈希 `C7D27F78…`，失败给「下到的是 HTML」人话 |
| `packaging/README.md` 门槛漂移 + `release/SHA256SUMS` 不可追溯 | ship 3、4（P2） | 纯文档/脚本且要跑打包才能验证；本轮不碰 `release/` | 与上面的 installer 任务合并成一条 |
| `docs/typora-gap.md` 过期（19 行里有 5 行已实现，漏 2 项） | typora 第 3 节 | 纯文档，收益低于用户可见项；改动面大（26/16 行 + 表头） | 单独一个 10 分钟的文档任务，按 finder 给的清单逐行订正 |
| CI 打开 `npm run roundtrip` | ship 6（P2） | 要先计时，且本轮不改序列化 | 计时后按 path filter 打开 |
| 源码模式 textarea 选区计数 | 第 22 轮遗留 | 与 T2 不同链路（textarea 没有 ProseMirror 选区），一改就要碰源码模式同步逻辑 | 与「源码模式行号/高亮」一起评估 |

## 证据与 UNVERIFIED

- 本轮计划里的文件:行号均由 planner 用 `read` 复核（`App.tsx:3443`、`:3613`、`:3810-3821`、`:4830`、`:486`、`:202-207`、`:901-907`；`wordcount.ts:54`；`StatusBar.tsx:1-75`；`StatsDetail.tsx:85`、`:117`；`vite.config.ts:32-39`；`measure-first-screen.mjs:42`；`package.json:14`）。
- **revision 1（planner-revision）本轮实跑复核**：
  - `setSelection(` 全仓库 4 处要改：`App.tsx:348`（`useState` 初值字面量）、`:904`（`onSelectionUpdate`）、`:958`（载入）、`:1034`（`applyHostPayload`），无第五处。（revision 2 订正措辞：`setSelection(` **调用**只 grep 到 3 次，`grep -n 'setSelection\(' src/App.tsx` → `:904` / `:958` / `:1034`。）
  - `node .tmp/reset.mjs 9222` + `node scripts/qa17.mjs http://localhost:5175` → `PASS 1/2/3/4/5/5b` + `PASS 无控制台错误`，exit 0；随后 `git status` 出现 `M shots/mode-switch.png`，`git checkout -- shots/mode-switch.png` 已还原。
  - `npm view mermaid@11.12.0 dist.tarball dist.unpackedSize --cache .tmp/npm-cache` 成功（`unpackedSize = 66,067,528 B`）；不带 `--cache` 时因默认缓存目录不可写而失败。
  - `findings-ship.md:14` = 发布件 setup 824,209 B；`:17` = 本机重建件 824,595 B / 载荷 2,510,153 B ≈ 32.9%（`824595 / 2510153 = 0.3285`）。
  - `dist/` 最大两个 JS：`index-BARs10TG.js` 893,343 B、`katexLoader-CNO5m-uY.js` 258,788 B → `chunkSizeWarningLimit: 950` 不会误报。
  - `scripts/keyboard-acceptance.mjs` 的 `check(` 共 49 处；`:440` 是 `Control+Shift+3`（切侧栏，不是源码模式）、`:442` 是 `// T3：`，T1 新断言的插点正确。
  - `App.tsx:3613` 现文 `if (mod && !event.altKey && event.shiftKey && !event.ctrlKey && key === 'p')`——删除 `&& !event.ctrlKey` 即为修订后的条件。
  - `StatsDetail.tsx:85` 的「段」行现为 `['段', number(stats.paragraphs), '空行分段的段数']`，`title` 是第三项。
- **revision 2（planner-revision）逐条实跑复核**（每条对应一个漏洞的修法）：
  - R2-P1-1：`scripts/qa16.mjs:1-6` 与 `scripts/qa10.mjs:1-6` 实读，第 3 行都是 `const url = process.argv[2] ?? 'http://localhost:5173'`；两脚本第 4 行都硬连 `http://127.0.0.1:9222`。`Invoke-WebRequest http://localhost:5173/src/main.tsx` 未跑（review 已测 200）；本修订据此把两条命令都改成显式传 `http://localhost:5175`。
  - R2-P2-1：`Select-String -Path node_modules/vite/dist/node/chunks/node.js -Pattern 'changed, restarting server'` → 命中 `:25404`；`(Invoke-WebRequest -UseBasicParsing http://localhost:5175/src/main.tsx).StatusCode` → `200`。
  - R2-P2-2：`git ls-files shots/` 实测 `shots/preview-and-popover.png`、`shots/fixes4.png`、`shots/mode-switch.png` 与 `shots/round-05/` 19 张都在版本控制里；`Select-String -Path scripts/qa16.mjs,scripts/qa10.mjs,scripts/qa17.mjs -Pattern 'shots/'` → `qa16.mjs:123 shots/preview-and-popover.png`、`qa10.mjs:133 shots/fixes4.png`、`qa17.mjs:70 shots/mode-switch.png`；`git status --porcelain` 当前只有 `?? docs/iteration/round-32/`、`?? shots/round-32/`。
  - R2-P2-3：`npm view mermaid@11.12.0 exports --json --cache .tmp/npm-cache` → `{".":{"types":"./dist/mermaid.d.ts","import":"./dist/mermaid.core.mjs","default":"./dist/mermaid.core.mjs"}}`；`https://unpkg.com/mermaid@11.12.0/dist/chunks/mermaid.esm.min/?meta` 聚合 → `total 146, mjs 73, mjsBytes 2675506, maps 73, mapBytes 10441081, maxMap 1893086`。
  - R2-P2-4：`App.tsx:4870-4874` 实读为 `<StatsDetail text={statsDetail.text} selection={statsDetail.selection} onClose={() => setStatsDetail(null)} />`（外包 `:4868-4876` 的 `Suspense`），`paragraphs={…}` 插在 `selection` 之后。
  - R2-P2-5：`vite.config.ts:35-36` 逐字为「…主 chunk 约 1.10 MB（第 05 轮实测 1,100–1,104 kB），900 是历史估计、已不够用。」「1200 是为此显式设定的告警线，留约 100 kB 余量；不是放任体积增长。」
  - 任务量：本次修订只加命令文本与顺序约束，未新增文件、未新增任务；T4-B 的 glob 收窄比原写法更省事。
- 预计 UNVERIFIED（实施后由 tester 决定）：Windows 宿主里按 `Ctrl+Shift+P`（本机只测浏览器）；macOS `Cmd+Shift+P`；大选区（全选 1 MB）时选区计数耗时；源码模式解析失败后的回退路径（面板新旧口径的一致性）；Mermaid 实际打包体积（本轮只量 npm 包，没装进 `dist`）；mermaid 真装进 `dist` 后重打安装包（再评估时实测）；qa17 在 WebView2 宿主里跑（本轮只浏览器）；T4-A 保存 `vite.config.ts` 后 5175 重启的实际秒数（本计划用「排到 A 的 e2e 之后」规避，未实测秒数）。
- 不许编造数字：T4 的 ADR 必须贴 `.tmp/measure-mermaid.mjs` 的真实输出；首屏与安装包结论以根代理最终 `measure` 为准。
