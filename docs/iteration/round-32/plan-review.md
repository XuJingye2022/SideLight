# 第 32 轮 · 计划审查（revision 2 复核，critic，只读）

- 角色：计划审查。未改产品代码、未改 `release/`、未 push、未 bump 版本、未重启 dev server、未跑 e2e（不启动浏览器）。
- 审查对象：`docs/iteration/round-32/plan.md` **revision 2**（267 行）、`findings-bug.md`、`findings-typora.md`、`findings-ship.md`。
- 审查方式：**逐个打开计划点到的文件核对代码与行号**；复跑只读门（`npm test`、`measure-first-screen`、HTTP 探针）；另用一个导入真实配置、只把 `chunkSizeWarningLimit` 临时设成 1 的探针配置（`.tmp/critic-vite.config.ts`，产物写 `.tmp/critic-build`，量完已删）实测 Vite 8.3.8 的 `chunkSizeWarningLimit` 告警是否真的存在、原文是什么。
- 结论：**PASS**。上一版 6 条漏洞**全部真修掉**；本版有 4 条 P2（全部一行/一句级，不阻塞开工，不必再开第 3 次修订）。无 P0、无 P1。

## 1. 我实跑的门与实测

| 命令 / 检查 | 实测输出 | 与计划一致 |
| :--- | :--- | :--- |
| `git log -1` / `git status --porcelain` | HEAD `d47d482`；只有 `?? docs/iteration/round-32/`、`?? shots/round-32/` | ✅ 基线、工作树干净 |
| `npm test`（汇总 21 个文件的 `ℹ tests`） | **21 个文件、272 条、0 fail**（逐文件 `fail` 全 0） | ✅ T3 加 4 条后 276 成立（plan :141/:226） |
| `node scripts/measure-first-screen.mjs` | `total raw=927127 gzip=284761 files=2 max=286000` → `PASS`，exit 0；`index-BARs10TG.js` 893,343 B → gzip 277,733 B；CSS 33,784 B → gzip 7,028 B | ✅ 余 1,239 B |
| `Invoke-WebRequest http://localhost:5173/src/main.tsx` / `:5175` | 两者都 **200、长度 1938**（逐字相同） | ✅ 5173 僵尸 server 确实活着 → 上一版 R2-P1-1 是真 P1，现在已补参数 |
| `Select-String node_modules/vite/dist/node/chunks/node.js 'changed, restarting server'` | 命中 **:25404**；`restartServer` 在 `:25225 await server._closeServer("restart")`、`:25235 await server.listen(port, true)`，`:25208-25213` 用 `server.config.inlineConfig` 重建 | ✅ 改 `vite.config.ts` 会重启，plan :159 的前提成立 |
| 探针构建：`npx vite build --config .tmp/critic-vite.config.ts --outDir .tmp/critic-build`（该 config 只做 `import base from '../vite.config.ts'` + `chunkSizeWarningLimit: 1`） | 告警原文 **`(!) Some chunks are larger than 1 kB after minification.`**，走 **stderr**（PowerShell 包成 `NativeCommandError`）；主 chunk `index-BARs10TG.js` **893.34 kB** | ✅ Vite 8.3.8（rolldown）仍有这个告警、按 **raw kB（×1000）** 比；950 − 893.34 = **56.66 kB**，plan :162「约 57 kB」正确；plan :167 的 `2>&1 \| Select-String 'larger than'` 能抓到，第 2 大 chunk 258.78 kB 不会误报 |
| `select-string scripts/keyboard-acceptance.mjs 'check('` | **49** 处；`:440` 是 `Control+Shift+3`、`:441` 空行、`:442` 是 `// T3：…` | ✅ 49+3=52，插点正确 |
| `scripts/qa17.mjs` | 7 条 check（1/2/3/4/5/5b/无控制台错误）；`:67` 是 `chips.length === 1 && chips[0] === '预览'`；`:70` 写 `shots/mode-switch.png` | ✅ plan :94 逐字成立 |
| `git ls-files shots/`；`qa16.mjs:123`、`qa10.mjs:133` | 三张图都在版本控制里；两脚本确实各覆写一张 | ✅ 还原清单对应正确 |
| `scripts/qa16.mjs:3`、`qa10.mjs:3` | 都是 `const url = process.argv[2] ?? 'http://localhost:5173'`（`:4` 硬连 9222） | ✅ 上一版 P1 的根因 |
| `dist/assets` 最大两个 | `index-BARs10TG.js` 893,343 B；`katexLoader-CNO5m-uY.js` 258,788 B | ✅ plan :167 |
| `src/App.tsx` 关键行 | `:3613` 含 `!event.ctrlKey`；`:3443` `mod=ctrl\|\|meta`、`:3444` `toLowerCase()`；`:3576` `Ctrl+P` 要求 `!shiftKey`；`:4519` tooltip；`:202-207` `SelectionState`；`:348`/`:904`/`:958`/`:1034` 恰好 4 处 `SelectionState` 字面量（全仓库只此 4 处）；`:4830` `<StatusBar`；`:486` `statsDetail`；`:3810-3821` `openStatsDetail`、`:3815` 源码取 body/编辑取 `doc.textContent`；`:4870-4874` `<StatsDetail …>` 三行 props；`:4272` AI 按钮读 `selection.chars` | ✅ T1/T2/T3 的改点与行号全对 |
| `src/components/StatusBar.tsx:48-49`；`styles.css:1505`/`:1543`；`wordcount.ts:54`；`StatsDetail.tsx:85`/`:112-114`/`:76`/`:82`；`PreviewPane.tsx:52-53` | `:48` 触发按钮结束、`:49` 元数据 chip；`.status-chip` 与 `-quiet` 就这两处；段=非空行数；「段」行=「空行分段的段数」；选区行 `${cjk+words} 字 / …`；预览面板是 `article.ProseMirror.preview-pane contentEditable={false}`（预览态 `.ProseMirror` 恰好 1 个） | ✅ T2 插点、T3 文案、T1「`.ProseMirror` contenteditable=false」三处都成立 |
| `README.md:99/157/181/198`；`docs/adr/` | `:99` 写 `chunkSizeWarningLimit: 1200`（主 chunk 892,443 B）；`:157`/`:198` 是「0001–0016」；`:181` 是 ADR-0016 决策行；ADR 最新 0016，无 0017 | ✅ T4-A/T4-B 的改点与 0017 编号正确 |
| `docs/CHANGELOG.md` / `package.json` / `.tmp/reset.mjs` / `.tmp/npm-cache` | `## Unreleased（第 29–30 轮，未发版）`；version `0.32.1`；两路径都在 | ✅ 全轮约束 1 的前提成立 |
| `vite.config.ts:13-15` | `server.port: 5173`、`strictPort: true` | 见 §2 R2-P2-1 的补充推断 |

未复核 / 测不了：重启后 5175 是否真的回到 200（禁止重启，见 §2）；Windows 宿主里按 `Ctrl+Shift+P`；macOS `Cmd+Shift+P`；mermaid 真装进 `dist` 的安装包（本轮只包外量）；大选区计数耗时。

## 2. 上一版 6 条漏洞的核销

| 上一版 | 计划 revision 2 的位置 | 判定 |
| :--- | :--- | :--- |
| **R2-P1-1** T2 两条复跑命令按默认值跑在禁用的 5173 | plan `:98-100`（验收）与 `:103`（门禁）都写 `node .tmp/reset.mjs 9222` → `node scripts/qa16.mjs http://localhost:5175`（跑完 `git checkout -- shots/preview-and-popover.png`）、`node scripts/qa10.mjs http://localhost:5175`（跑完 `git checkout -- shots/fixes4.png`）；`:98` 还写清了「两脚本 `:3` 默认 5173、review 实测仍活」 | ✅ **已修**。我复核两脚本 `:3` 默认值确实是 5173、`:4` 硬连 9222；5173 与 5175 当前都 200/1938。命令、reset、还原三件齐全，没有漏参。 |
| **R2-P2-1** T4-A 改 `vite.config.ts` 会重启 5175，与并行 e2e 撞车 | 采用**方案②**：T4-A 新增「步骤 0」（`:159`）——T4-A 必须排在 A 的 `keyboard-acceptance` 与三个 `.tmp/e2e-r32-*.mjs` 全部跑完、截图还原之后；并行的只有 T4-B；`:38`（全轮硬约束 5）写明「唯一的重启例外」；`:218`（文件归属）再复述一次；另给了「根代理自己做也合规」的退路 | ✅ **已修，且改法自洽**。我复核 Vite `:25404` 的告警与 `restartServer` 的「先 close 再 listen」，排序理由成立。补充推断：`vite.config.ts:13-15` 是 `server.port: 5173` + `strictPort: true`，而 5173 被僵尸占着、5175 在跑——**当前 5175 实例必然是带显式端口启的**，`restartServer` 用的 `server.config.inlineConfig` 会带上这个端口，所以重启后仍应在 5175（`node.js:25208-25235`）。这条我没重启验证，记 **UNVERIFIED**，但不需要改进计划。 |
| **R2-P2-2** `qa16`/`qa10` 各覆写一张已跟踪截图 | `:37`（硬约束 4）扩到四张；`:99-100`（验收）与 `:103`（门禁）各带 `git checkout`；`:229`（全轮门禁 5）自查清单也扩到四张 | ✅ **已修**。`git ls-files` 复核三张图都在版本控制里。 |
| **R2-P2-3** mermaid chunk 的 glob 会把 `.mjs.map` 算进去 | `:178` 写死只取 `*.mjs`、`endsWith('.mjs')`、必须排除 `.mjs.map`，并单打印 `mjs 数`/`raw 合计`；`:179` ADR 里注明 bundlephobia 43 asset 与本地 73 chunk 口径不同；`:198` 两条硬校验（文件数 73 不是 146、主入口是 `dist/mermaid.core.mjs` 不是 `mermaid.min.js`） | ✅ **已修**。 |
| **R2-P2-4** T3 没点 `App.tsx:4870` 的渲染点，漏传 `paragraphs` 编译不报错 | `:132-135` 三处一起改，点明 `App.tsx:4870-4874` 插 `paragraphs={statsDetail.paragraphs}`；`:140` 加静态锁 `(Select-String … 'paragraphs={statsDetail.paragraphs}').Count = 1` | ✅ **已修**。我实读 `:4870-4874` 就是 `<StatsDetail text=… selection=… onClose=… />` 四行，插点正确。 |
| **R2-P2-5** 阈值改 950 后 `vite.config.ts:35-36` 的「1200…100 kB」成假话 | `:163` 把 `:35-36` 整段换成「主 chunk 893,343 B…950 是为此显式设定的告警线，留约 57 kB 余量」，并删「900 是历史估计」；`:169` 用 `Select-String '1200\|100 kB'` 无输出兜 | ✅ **已修**，且 57 kB 的算术我按探针实测（950 − 893.34）核过，正确。 |

## 3. 本版新发现（4 条 P2，均可一行/一句修，不阻塞开工）

（编号从本版重新起算；本节 4 条都是 revision 2 引入或没写全的执行层细节。）

### P2-1 · T3 的 e2e 把 finder 那篇固定文档的「改前 16」搬到自己新敲的文档上，基线会对不上

plan `:142` 写「`Control+/` 进源码模式再点开面板 → 仍 **5**（改前 16）」。但这条 e2e 的文档是它自己敲的「4 个 `## ` 标题 + 5 段正文」（`:142`），序列化成 Markdown 后是 **9 个非空行**，所以**改前是 9，不是 16**。16 来自 finder 的假 FSA 固定文档（`findings-typora.md:38-39`：字符 118→175、含列表与表格行）——两篇文档不是同一篇。这不是断言，但它是执行代理唯一记录的「before」数：看到 9 而计划写 16，要么怀疑自己的 fixture 建错、要么把「预期 16 / 实测 9」写进 `test.md` 当差异。

**修法**：`:142` 改成「（改前 9：4 标题 + 5 段 = 9 个非空行；`findings-typora.md` 那篇固定文档的 16 不是本 e2e 的基线）」。

### P2-2 · T4-A 的「改完立刻」200 检查正好撞在重启窗口上

plan `:159` 写「改完立刻 `(Invoke-WebRequest -UseBasicParsing http://localhost:5175/src/main.tsx).StatusCode`，应为 `200`（revision 2 实测当前 200）」。但 Vite 的重启是**先关监听再开**：`node.js:25225 await server._closeServer("restart")` → `:25235 await server.listen(port, true)`。文件保存后 watcher 一命中就进这段，中间那几百毫秒到几秒里 5175 **必然拒连**；「立刻」发请求大概率拿到「无法连接到远程服务器」，被当成本任务失败。括号里的「实测当前 200」是**改之前**的状态，不是改之后，读起来像保证。

**修法**：`:159` 改成「改完等 3 秒再看；不是 200 就每 1 秒重试，最多 8 次。仍不是 200：把 `chunkSizeWarningLimit` 回滚成 1200（保留注释更新），报告记 UNVERIFIED 并交根代理处理，**不要自行重启或改端口**」。

### P2-3 · T2 验收第 3 条拿「chip = 面板合计」当断言，只在纯中文文档上成立

plan `:92` 写「`Control+a` 全选 → chip 数字等于面板「合计」」。chip 的数字来自 `countText(doc.textBetween(from, to, '\n'))`（`:82`，块之间插换行），而面板「合计」来自 `countText(editor.state.doc.textContent)`（`:3815`/`:4831` → `StatsDetail.tsx:76`/`:82`），ProseMirror 的 `textContent` **不在块之间插分隔符**：两个段落各有一个拉丁词时会被拼成一个词，合计比 chip 少 1。本 e2e 敲的是中文（CJK 计数与分隔符无关），所以会 PASS；但 `:81` 把「与状态栏/面板同口径」写成通则，后面拿英文文档核的人会以为产品不一致。

**修法**：`:92` 改成「`Control+a` 全选 → chip 数字等于面板**选区行**的「N 字」（同一 `textBetween(…, '\n')` 输入，`StatsDetail.tsx:112-114`，永远相等）；面板「合计」走 `textContent`，只有纯中日韩文本才相等，要在报告里写一句「拉丁词跨段会被 `textContent` 合并，chip 可与合计差 1」」。

### P2-4 · T4-A 注释里写死的 893,343 B 在它自己执行时已经过期

T4-A 排在 A 的全部 e2e 之后（`:159`），那时 A 的 T2/T3 已经改了 `src/App.tsx`、`StatusBar.tsx`、`src/lib/wordcount.ts`——三者都在主 chunk 里。我用探针在当前源码（**未含** A 改动）构建，主 chunk 正好 893.34 kB / 893,343 B、hash 与 `dist` 相同；A 改完必然变大。所以 `:162`/`:163`/`:164` 写死的「主 chunk 893,343 B（第 32 轮实测，2026-11-17）」是 B 在写注释那一刻就已经过期的数（这正是 T4-A 要清理的那类「过期数字被当基线」，见 findings-ship 第 1 条），而根代理最后的 `npm run build` 还会再变一次。

**修法**：`:162-164` 改成「先跑 `npx vite build --outDir .tmp/build-b`，用**本次构建**最大 chunk 的字节写两处注释与 `README:99`（预期 893.3–894 kB 量级），余量 = 950,000 − 该字节（按 1000 记 kB）」；并写明 `README:99` 的最终数字由根代理在最后 `npm run build` 后复核一次（与 `:227` 改 `:97` 同一时点），B 不要写死当前 `dist` 的数。

## 4. 结论

**PASS。**

- 上一版 6 条**全部真修掉**：两条命令补了 `http://localhost:5175`（我复核两脚本第 3 行默认值确实是 5173、5173 现在仍 200）；T4-A 用方案②排到 A 的 e2e 之后，并写进了硬约束 5、文件归属与步骤 0；四张已跟踪截图的还原清单、mermaid 的 `.mjs`/`.map` 口径、`App.tsx:4870` 传参与 `vite.config.ts:35-36` 注释全部落实。没有一条是文字应付。
- 本轮**无 P0**：不动 Tiptap schema、不改序列化、不碰批注协议、不新增运行时依赖；首屏 284,761 B、余 1,239 B，T2/T3 各 <200 B 的计划增量留有余量（实测门在根代理的 `measure` 上）；T4-B 只写 `.tmp/`、ADR 与 README。
- **无 P1**：T4-A 的重启对 A 的 e2e 的冲突已被排序解掉；重启后端口仍在 5175 有代码路径与启动方式的强推断支撑（UNVERIFIED 但不影响开工）。
- 新发现 4 条 P2，都是一行/一句级：P2-1 改一个括号里的数、P2-2 加一句重试与回滚规则、P2-3 把断言换成「选区行」、P2-4 把写死的字节换成「先 build 再抄」。由 builder A/B 在开工与收尾时顺手改即可，**不需要再走一轮 revision**。
- 供 executor 直接引用的硬事实：`npm test` **21 文件 272 条 0 fail**；首屏 `gzip=284761 PASS files=2`；主 chunk **893,343 B**、第二 **258,788 B**；Vite 8.3.8 的告警原文 **`(!) Some chunks are larger than N kB after minification.`**（stderr，必须 `2>&1`），按 raw kB 比，950 阈值下 **56.66 kB** 余量；`keyboard-acceptance` 49 条、`qa17` 7 条；`SelectionState` 全仓库 4 处字面量，无第 5 处；`Ctrl+Shift+P` 的根因就是 `App.tsx:3613` 的 `!event.ctrlKey`。
