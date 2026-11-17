# 第 36 轮 · 计划审查（critic，只读，对 **revision 3**）

- 审查对象：`docs/iteration/round-36/plan.md`（**revision 3**，506 行，planner-revision 第 3 次修订于 2026-11-17）。
- 基线：`git rev-parse HEAD` = `b3509c9f2610a480dc6878187c767267abd12678`（与本轮 startSha 相同）；`git status --short` = `?? docs/iteration/round-36/`、`?? shots/round-36/` 两条。`dist` 实测 **31 文件 / 1,471,108 B / 13 个 .js / 0 个 .map**，`dist/index.html` 0 处 `mermaid`（与 rev 3 自证逐字一致）。
- 只读角色：本轮**只写本文件**。未改产品代码、未动 `release/`、未 push、未 `npm install`、未跑浏览器 E2E、未碰 dev server（5175）。
- 方法与新增实测：逐条打开 rev 3 点到的文件核行号与内容；对 **npm 安装**做了真实探针（`--dry-run`）；对 **T1 的映射落点**用 `.tmp/check-map-r36.mjs`（gitignored，不进产品代码）跑了一次 prosemirror 模拟；对 **mermaid 的 `exports`** 用 `npm view … --cache .tmp/npm-cache` 取到真值。

## 结论：REVISE（**3×P1 + 3×P2**，无 P0）

**上一版 6 条漏洞（2×P1 + 4×P2）的文字级修法全部落地且正确**（逐条证据见 §一）。rev 3 没有引入数据损失、门禁破坏或体积破线，算术与行号核对无错，T3 的技术前提（widget 挂载、`exports` 允许深路径、`language` 属性）也成立。

REVISE 的原因只有一类：**执行链上有三处按现文字会假失败或直接跑不动**——步骤 1 的 `npm install` 在本沙箱必然 EPERM（P1-1）、E2E 段 0 整页 reload 后工作区不会回来（P1-2）、段 1 的请求记录被段 0 污染（P1-3）。另有三条会让本轮记录写错或产品出边角 bug（P2-4…P2-6）。**全部是文字级改动，不新增任务，builder 可当场照做，不必再开一次 planner 修订轮。**

---

## 一、上一版漏洞核对（6/6 真修掉）

| 上一版 | rev 3 的落点 | 我的实测/实读核对 | 判定 |
| :--- | :--- | :--- | :--- |
| **P1-1**（rAF 竞态 + 600 ms 防抖 → E2E 假失败） | 新增 §0 通用等待规则 `plan.md:59-74`；T1 先等再断言 `:121-127`、撤销也等 `:132`；T2 三个 `waitForFunction` 助手 `:180-193`；T3 的 `Ctrl+/` 前先等 `:370`；明文禁止改同步聚焦 `:73`、`:193` | §0 的四条依据我逐条核过：`focusEditor` 是 rAF（`src/App.tsx:328`）、关查找条同款（`:4591`）、批注重渲染 effect（`:1686`）、600 ms 防抖真实位置是 `:1691`（`setTimeout`）到 `:1715`（`600`）——rev 3 把 rev 2 的 `:1695` 更正为 `:1691/:1715`，正确（`:1695` 是 host 分支的 `postMessage`）。T1 的两处等待值与 §0 表一致；`keyboard.type` 前先确认焦点也被写成硬规则 `:72` | **真修掉** |
| **P1-2**（dev 依赖重优化 504/reload → 假判「渲染失败」） | 步骤 2 第 6 步预热 `:300-319`；步骤 3 收尾确认 `:327`；E2E 分「段 0 预热 / 段 1 断言」`plan.md:357-371`，`## errors-warmup` 允许非空并写明属 dev-only `:363,371`；判定规则 `:371`；明写不许重启 5175 `:318` | 结构对：两桶错误分开、预热独立、`504`/`Outdated Optimize Dep` 有明确归桶规则。Vite 8.3.8 的实测行为确认这两条消息真实存在（`node_modules/vite/dist/node/chunks/node.js`：`optimized dependencies changed. reloading` 与 `ERR_OUTDATED_OPTIMIZED_DEP → 504 "Outdated Optimize Dep"`）。**但执行链还有两处新缺口：P1-2、P2-4** | **结构真修掉，执行细节两处未闭合** |
| **P2-3**（体积门判据重叠 + 缺禁止项） | 门 A 单值 `≤ 1,997,853` `:283-287`；门 B 硬停与 5 条禁止项 `:288-293`；门 B 回退 5 步 `:294-299`；§5 表 `:435-438`；§6「不可砍」`plan.md:446` 写明单值阈值 | 三档算术自查：`findings-ship.md:134` 原话是「干跑 826,742 vs 正式 824,595（**+2,147 B**）」→ dry-run **比**正式包大，`≤1,997,853` 两方向都安全。门 A / 门 B 现在无重叠（`>` 与 `≤` 互补），内部线 1,800,000 只按 `installer.ps1:89` 的 `gap=` 记录、不参与判定，与首屏 310,000/320,000 的用法一致 | **真修掉** |
| **P2-4**（`README.md:103`「只有两组」会变假话） | 改动表 `:240` 与步骤 6 `:340` 都写「两组 → 三组」+ 在 `:106` 后加 Mermaid bullet | 实读 `README.md:103` = 「运行时依赖只有两组，都不是为省几行代码引入的：」，`:105`/`:106` 两条 bullet → 只加 bullet 不改成「三组」确实当场变假话；rev 3 已同时改 | **真修掉** |
| **P2-5**（dry-run 并未跳过内部线提示） | 步骤 2 第 4 步 `:276-277`、口径提醒 `:320` | 实读 `packaging/installer.ps1`：`:89` 打印 `target=1800000 gap=`、`:90-92` `Write-Warning`，都在 `:94` 的 dry-run 分支**之前**；被跳过的只有 `:117-129` 的 2,000,000 硬判与 `:110` 的 SHA256。rev 3 的更正逐字对上代码 | **真修掉** |
| **P2-6**（`roundtrip` 不跑的理由站不住） | 步骤 4 跑一次并把结果写 `impl.md` `:332`；门禁清单 `:376`；§5/§6 提到 `:438,446`；替代方案 = E2E 里 `Ctrl+S` 后 fake FS 仍等于原 fence | `AGENTS.md:40` 的触发词是「改动编辑器或 markdown 序列化」，本轮往 `useEditor` 扩展数组加插件（`:733-760` 已核）确实踩到。附带核实：`npm run roundtrip` 会重写已跟踪的 `docs/roundtrip-report.md`，但脚本输出**没有时间戳**（`scripts/roundtrip.mjs:140-161`），数字不变时不会产生 diff——不会污染本轮 diff | **真修掉** |

---

## 二、本轮新漏洞（按严重度）

### P1-1（T3 步骤 1）`npm install mermaid@11.12.0` 在本沙箱必然 EPERM，T3 在第 1 分钟就停手

`plan.md:248` 是裸命令 `npm install mermaid@11.12.0`。默认 npm 缓存在工作区外，而本轮所有角色都是 workspace-write 沙箱——**写 `%LOCALAPPDATA%\npm-cache` 被拒**。实测（当前会话，与 builder 同一权限）：

```
npm config get cache
→ C:\Users\WINDOWS\AppData\Local\npm-cache

npm install mermaid@11.12.0 --dry-run --no-audit --no-fund
→ npm error code EPERM
  npm error syscall open
  npm error path C:\Users\WINDOWS\AppData\Local\npm-cache\_cacache\tmp\***
（`npm view mermaid@11.12.0 …` 同样 EPERM，报的是同一条 cache 写失败）

npm install mermaid@11.12.0 --dry-run --no-audit --no-fund --cache .tmp\npm-cache
→ exit 0，打印 add …（20+ 个包，含 chevrotain / vscode-languageserver 等）
```

同一招 ADR 里已经用过：`docs/adr/0017-mermaid-lazy-loading.md:27` 就是 `npm pack mermaid@11.12.0 --pack-destination .tmp --cache .tmp/npm-cache`。所以这是「已知可行」的写法，只是没写进计划。

连带问题：`:255` 的兜底写「若 `npm install` 因**网络**失败：停手」。EPERM 不是网络问题，按现文字把命令与报错记成「依赖装不上」，本轮 P0 交付（Mermaid）会以错误原因记为「未做」。

**修法**：步骤 1 改成

```powershell
npm install mermaid@11.12.0 --cache .tmp\npm-cache --no-audit --no-fund
```

并在兜底里加一句：「先看报错：`EPERM … npm-cache` = 沙箱挡了默认缓存，改用 `--cache .tmp\npm-cache` 重跑；`ETIMEDOUT`/`ENOTFOUND` 才是网络失败」。另：`.tmp/npm-cache` 里已有本次审查取 packument 留下的缓存，重跑会更快。

### P1-2（T3 的 E2E 段 0）整页 reload 之后只写「重新打开该文档」，工作区不会回来

`plan.md:362`：「若 `loads > 1`（发生整页 reload）或 reload 前 `.mermaid-preview svg` 没出现：等 reload 完成（`waitForSelector('.doc-column .ProseMirror')`）→ **重新打开该文档** → `waitForFunction(svg ≥ 1)`」。

整页 reload 会把页面内的一切清掉：`installFakeWorkspace` 只是用 `page.addInitScript` 去 patch `window.showDirectoryPicker`（`.tmp/r30-fsa.mjs:3,150`），reload 后**文件树是空的**（文件 Map 会随 init script 重新播种，但「打开文件夹」这个动作没了）；应用侧也恢复不了——会话里存的是假 handle，`saveSession` 内部 catch 掉 IndexedDB 的克隆失败（`src/lib/session.ts:24-35`），重启后没有可恢复的句柄。

结果：脚本去点 `.file-tree [role="treeitem"]` 会一直等到 Playwright 默认 30 s 超时抛错 → 段 0 走不完、`warmed` 不成立 → 现场看起来就是「mermaid 没渲染」。这正是 P1-2 要消灭的那类假失败。

**修法**：段 0 第 3 步照 `.tmp/e2e-r36-bug-probe6.mjs:24-33,47-53` 的 `reloadWith` 写法，明确三步：reload → `waitForSelector('.doc-column .ProseMirror')` → **`openFolder()`**（「文件 ▾」→「打开文件夹…」+ 1400 ms）→ `openDoc(名字)`（+ 1400 ms）→ 再 `waitForFunction(svg ≥ 1)`。并把「reload 后必须重新打开文件夹，假工作区不会自己回来」写进 `impl.md` 的已知事项。

### P1-3（T3 的 E2E 段 1）请求记录没在 `warmed` 处清空，第一条断言会假失败

`plan.md:367` 第一条：「打开**不含** mermaid 的文档：`page.on('request')` 记录里 URL 含 `mermaid` 的请求 **0**」。

但段 0 要让图渲染出来（`:360-363`），mermaid 的 chunk 请求**已经**进了同一个记录（`:363` 还要「打印请求过 mermaid 的 URL 样本」）。rev 3 只给 console 错误划了段界（「`errors` 数组从 `warmed` 之后才开始收集」`:366`），**没有给请求记录划段界**。按现文字：`mermaid` 请求数 ≥ 1 → 第一条断言恒失败；更麻烦的是 builder 可能由此判「打开普通文档就会拉 mermaid」，去改插件或把懒加载改成「先加载」——计划外代码。

**修法**：段 1 开头（`warmed = true` 之后）`reqs.length = 0`（或另起 `reqsSeg1`），两段分别打成 `## requests-warmup` 与 `## requests`；「请求里出现含 mermaid 的 chunk」这条也改成只看段 1 的记录（否则同样被段 0 满足，证据无效）。

### P2-4（T3 步骤 2 第 6 步）dev 预热按现写法**不会**触发 Vite 预构建，`## dev-warmup` 会记一个假结论

`:300` 的理由是「临时 `useEffect` …… 已经把 `mermaidLazy → mermaidLoader → mermaid/dist/mermaid.core.mjs` 拉进 dev 的模块图」。这条链不成立：

- `mermaidLoader` 按设计**只被动态 import**（`:234` 说它是「唯一静态接触真包」的模块；`:235` 把 `mermaidLazy` 的契约写成 `Loader = () => Promise<{mermaid}>`，形状照 `katexLazy.ts:1-24,193-208`）。同型先例 `src/lib/katexLazy.ts:16` = `loader = () => import('./katexLoader.ts')`，`src/lib/katexLoader.ts:1` 明写「**只被** katexLazy.ts 动态 import」。若反过来静态 import，mermaid 就会进主 chunk、首屏直接破线。
- 所以 `:264` 的 `void import('./lib/mermaidLazy')` 只让浏览器请求 `mermaidLazy.ts`；里面的动态 `import('./mermaidLoader.ts')` 不会被执行，mermaid 的裸 import 从未被 Vite transform → **没有 missing dep → 没有 re-optimize**。
- 判定条件也不成立：`:314` 过滤 `/mermaid|\.vite\/deps/`，任何一次 app 加载都会请求 `.vite/deps/*`，`mermaidReqs > 0` 恒真；`:316` 的「第二次 reload 后 3 s 内 loads 只 +1」在没有 reload 时也恒真 → 「预热完成」是假阳性。

**修法**：`:264` 改成 `useEffect(() => { void import('./lib/mermaidLazy').then((m) => m.ensureMermaid()) }, [])`（或直接 `void import('./lib/mermaidLoader.ts')`——都是让 mermaid 的裸 import 真的被请求）；判定改成「看到一次日志 `optimized dependencies changed. reloading` 或 `loads` 由 1 变 2」**且** `.vite/deps` 目录里出现含 `mermaid` 的文件名；两者都没有就写「预热未触发（步骤 3 收尾的 20 s 再补）」，不要写「预热完成」。真触发之后，那 40 s 才买到它想买的东西。

### P2-5（T3 插件）widget DOM 按 `hash` 全局复用：同一文档两个相同代码块只出一个图

`:236` 写「widget DOM 按 `hash` 在模块级 `Map` 复用」。但 prosemirror-view 对**每个** widget 各建一个 WidgetView，并在构造时调一次 `widget.type.toDOM(view)`（`node_modules/prosemirror-view/dist/index.js:1171-1193`）。两个相同代码块 → 同一个 hash → 两次 `toDOM` 返回**同一个 DOM 节点** → 第二次插入（`placeWidget` 的 `insertBefore`）会把该节点从第一个 widget 的位置搬走 → 第一个预览消失，DOM 与装饰错位。

这不是假设：用户复制一份同一张图很常见。

**修法**：缓存键改成 `${pos}:${hash}`（位置变了就重建，图少时成本可忽略），或在 `toDOM` 里返回 `cached.cloneNode(true)`（SVG 已渲染完，clone 很便宜）；验收加一条：同一文档放两个内容相同的 ```mermaid 块 → `document.querySelectorAll('.mermaid-preview svg').length === 2`。

### P2-6（T1 验收）双映射的诊断落点写错：实际是 `2–3「很」`，不是 `1–3「天很」`

`:129` 写「正确 = 映射一次，落在 2–4；若被映射两次会落到 1–3 变成『天很』」。我按计划里的种子（`批注.md` = `天空很蓝。天空很蓝。另一段也有天空。`，替换 `天空`→`天`）跑了一次真模拟（`.tmp/check-map-r36.mjs`，3 处 ReplaceStep 同一事务）：

```
after replace = "天很蓝。天很蓝。另一段也有天。"
single map: from=2 to=4 diff=2 quote="很蓝"      ← 正确
double map: from=2 to=3 diff=1 quote="很"        ← 双映射真实落点（不是 1–3「天很」）
undo:       from=3 to=5 diff=2 quote="很蓝"      ← Ctrl+Z 后确实回到「很蓝」
```

好消息：撤销方向的断言、`to-from === 2`、`textContent === '很蓝'` **都能抓住双映射**，判据有效；坏消息是 builder 会拿这句去判现场，写错会浪费排查时间，而且这是本轮正在整改的「文档自相矛盾」同类。

**修法**：`:129` 改成「若被映射两次会落到 2–3、`to-from` 变 1，高亮缩成『很』」。

---

## 三、已核实成立（不构成漏洞，供 builder 照做）

| 计划断言 | 实测 |
| :--- | :--- |
| 3 处 `setAnnotations([])`：`:1795`（要删）、`:2041`（换文档）、`:4802`（换目标重分析）；`git grep -c` 改前 **3** | `git grep -n "setAnnotations(\[\])" -- src/` 输出正是这三行；`:1795` 在 `replaceEvery` 内，`:1794` 是 `editor.commands.focus()`（所以 `Ctrl+Z` 落在编辑器上，撤销断言可达） |
| `remapAnnotations` 0 命中、`mapping.map` 全文件只有 `:1654-1655` 与 `:4199-4203` | `git grep` 实测一致；监听器 `:1646` 跳过 `addToHistory === false`，`:1654-1659` 映射并在 `to <= from` 丢弃 |
| 持久化 600 ms：`:1691` `setTimeout` → `:1715` `600`；空且无便签 → `removeCache`(`:1706-1708`) | 逐行核过原文 |
| 恢复按引文重定位：`:1949` `findRange`，`:1960` 覆盖 `from/to`；`loadIntoEditor` 里 `annotationsHydratedRef` 先 false、`.finally` 置 true（`:2055-2058`）→ 替换后的写盘断言是有效的 | 逐行核过；`cacheKey('批注.md')='批注'`（`src/lib/cache.ts:51-58`），路径 `.sidelight/annotations/批注.json`（`cache.ts:83-85`） |
| `.annot` 只给 `pending` 且 `from < to`，是 inline 装饰 → `.ProseMirror .annot` 的 `textContent` 就是引文 | `src/lib/decorations.ts:46-63` |
| 种子批注的 `from/to` 可以不准（按 quote 重定位）；`parseAnnotationStore` 接受 `{v:2,annotations,notes}` 且不校验多余字段 | `src/lib/annotations.ts:274-293`；`buildTextIndex`/`findRange` 起点 `pos+1` → 单段文档里 `很蓝` = `3–5`，与种子一致（`:145-176,183-204`） |
| `aria-label={`批注（${n} 条）`}` → `[aria-label^="批注（"]` | `src/App.tsx:4427`（`:4428` 是 title） |
| 进源码三入口都不碰焦点：`enterSourceFor`(`:511-518`)、`switchView`(`:3761-3784`)、`toggleSource`(`:3786-3788`)；textarea 无 ref/autoFocus（`:4772-4777`）；`focusEditor` 模块级（`:328`）；Esc 先例（`:3535-3538`） | 逐行核过；`Ctrl+/` 的 window 分支在 `:3628`，`typing` 守卫只挡 `?`/`Shift+/`（`:3554-3562`），**不挡 `Ctrl+/`** → 在 textarea 里按 `Ctrl+/` 能退出源码，T2 ② 可行 |
| `PreviewPane` 用 `getHTML()`（`:4780`）→ 预览面板不含图；`getHTML` 序列化文档树 → widget 不进导出 | 成立 |
| `node.attrs.language` 是 codeBlock 的真属性；`pre.className` 读不到 | `node_modules/@tiptap/extension-code-block/dist/index.js:36-48`：`addAttributes().language` 且 `rendered: false`（与 `PROBE-H5` 一致） |
| widget 自动 `contenteditable=false` + `ProseMirror-widget`；`ignoreSelection` 合法；块边界 widget 落进父级 children | `prosemirror-view/dist/index.js:1171-1193`（`contentEditable="false"` + class）、`:1204`（`ignoreSelection`）、`:1994-2004`（`placeWidget`） |
| `src/mermaid-dist.d.ts` 的写法可行；深路径 `mermaid/dist/mermaid.core.mjs` **可解析** | `npm view mermaid@11.12.0 exports --json`（实跑）= `{".": {"types":"./dist/mermaid.d.ts","import":"./dist/mermaid.core.mjs","default":"./dist/mermaid.core.mjs"}, "./*":"./*"}` → `./*` 允许深路径；`. import` 本来就指同一个文件（所以深路径不是必须，但没坏处）；深路径无 `.d.mts` → 仍需 `src/mermaid-dist.d.ts`，与 `src/katex-dist.d.ts:1-6` 同型（katex 今天就在 `npm run build` 里跑通，且 `katex/dist` 也没有 `.d.*`） |
| 测试里能造 PM 文档：`getSchema([StarterKit])` | `src/lib/annotations.test.ts:4,30` 已经在 node 测试里这么用 → `listMermaidBlocks` 的单测可行，StarterKit 自带 codeBlock |
| 首屏判据：`scripts/measure-first-screen.mjs:65` banned 行、`:70-77` WARN/FAIL 分界、`files=2` 基线 286,056 B | 逐行核过；`README.md:99` 与实测一致 |
| 其余行号 | `:733-760` 扩展数组；`:4779-4780` PreviewPane；`:4587-4597`（`:4591` rAF 聚焦源码框）；`README.md:103`/`:105-106`/`:117`/`:155`（`:155` 实测是「21 个测试文件」）；`AGENTS.md:39`/`:72`；`docs/typora-gap.md:69`（Mermaid 仍「无」）；`release.yml:257`（`set -euo pipefail`）`:260`（grep 管道）`:261-262`（`while … done`）→ 在 `done` 后加 `|| true` 能兜住整条管道，`set -e` 不再炸；`CHANGELOG.md:5` 有 `## Unreleased（第 29–35 轮，未发版）` 可直接追加 |
| 环境 | `node_modules/mermaid` = False；`package.json` `scripts.test` 正好 **22** 个测试文件；`.tmp/reset.mjs`、`.tmp/r30-fsa.mjs`、`.tmp/e2e-r36-bug-probe6.mjs` 都在；dev server `http://localhost:5175/` 返回 200；`fixtures/markdown/04-reference-links.md` 就是 T2 ④ 要的「含引用式定义」样本 |
| 体积门 1,997,853 偏保守但安全 | 按实测方向（正式 = dry-run − 2,147）门可以放到 2,002,147；rev 3 取 1,997,853 只会多砍一次 T3，不会造假，可接受 |

---

## 四、预算与时间

- 表上仍写 35 min（T1 4 + T2 6 + T3 22 + T4 3）。rev 3 的 T3 内部相加 = 步骤 1 2 + 步骤 2 4 + 预热 0.7 + 步骤 3 7 + 收尾 0.3 + 步骤 4 2 + 步骤 5 5 + 步骤 6 2 ≈ **23 min**，已经在 22 之外；再加上 P1-1（一条命令，+0.5）、P1-2（段 0 多两个 `openFolder`/`openDoc` 等待，+1.5）、P1-3（+0.2），T3 实际 **25 min 上下** → 总计约 **34–37 min**，压线。
- T3 最可能的结果仍是**门 B**（ADR-0017:44 档 2 预估 2,355,122 B > 2,000,000，而 rollup 会跟着 `mermaid.core.mjs` 的动态 `import()` 把按需 chunk 全打进 `dist`）。门 B 路径下 T3 在 ~8 分钟收手，本轮总耗时 ~20 min，来得及。**只有门 A 通过时**才吃紧。
- 建议现在就按 §6 第 1 条**预先砍掉** T4 的 `typora-gap.md` 行（rev 3 自己在 `:447` 也这么建议），把省下的 1–2 min 留给段 0。
- `src/App.tsx` 单文件串行（T1→T2→T3）的设计正确；T4 与产品代码零重叠，可在 T1 之后并行，但 `README.md` 会被 T3 步骤 6 与 T4 同时改 → 必须串行提交。

## 五、UNVERIFIED（本轮我测不到的）

1. `npm install mermaid@11.12.0 --cache .tmp\npm-cache` **真装**是否成功：我只跑了 `--dry-run`（exit 0，解析出 20+ 个包），没真装（只读角色不动 `node_modules`、不改 `package.json`/`package-lock.json`）。
2. mermaid 真进 `dist` 后的字节与 chunk 图（步骤 1 的 `mermaid.esm.min` 计数、步骤 2 的容器打包字节）：包没装，无法实测；这正是门 A/B 存在的理由。
3. 73 个按需 chunk 是否真的全被 rollup 收进 `dist`（决定门 A 还是门 B）：只能装完实测。
4. 本轮未跑浏览器 E2E（只读角色，不占 9222）。P1-2、P1-3 的判断来自 `.tmp/e2e-r36-bug-probe6.mjs` 的既有形状与 Playwright 行为，不是实测；P2-5 来自 prosemirror-view 源码，不是实测。
5. 删除 `setAnnotations([])` 之后**真人连续替换**（替换串包含引文、批注重叠）的语义：按既有丢弃分支处理，本轮不测、不承诺（与计划 §8 一致）。
