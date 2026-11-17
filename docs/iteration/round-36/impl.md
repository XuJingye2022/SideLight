# 第 36 轮 · 实施报告（executor）

- 轮前 startSha：`b3509c9f2610a480dc6878187c767267abd12678`（实测 `git rev-parse HEAD` 相同）
- 计划：`round-36/plan.md`（revision 3）；审查：`plan-review.md`（对 rev 3 判 REVISE，3×P1 + 3×P2，全部是**文字级**改动，审查自己写「builder 可当场照做，不必再开一次 planner 修订轮」→ 本轮**按审查修法直接实施**，逐条落点见 §6）
- 环境：dev server `http://localhost:5175`（未重启、未另起）；浏览器只用 CDP 9222（未启动 Edge、未 kill msedge）；每条 E2E 前跑 `node .tmp/reset.mjs 9222`；未 push、未改 `release/`、未改 `package.json` 版本（仍 0.32.1）

## 1. 任务状态

| 任务 | 状态 | 证据 |
| :--- | :--- | :--- |
| T1 「全部替换」不再清空页边批注 | **DONE** | `setAnnotations([])` 3 → **2**；E2E `VERDICT PASS`；`git diff src/App.tsx` 只删这一行 |
| T2 进源码即聚焦源码框；`Ctrl+/` 退出回正文 | **DONE** | E2E 四段全过 `VERDICT PASS` |
| T3 Mermaid 惰性渲染主路径 | **DONE（门 A 通过）** | `assoc-dryrun=1,299,469 B` ≤ 1,997,853 门；首屏 288,256 B `PASS` + `files=3` 无 mermaid；E2E `VERDICT PASS` |
| T4 收尾三处一行改（+README 依赖行） | **DONE** | `release.yml` `done || true`；README 21→23、22/295→23/301、依赖两组→三组 + Mermaid bullet；`typora-gap.md` Mermaid「无」→「有」 |
| 文档（ADR-0017 实测节、CHANGELOG 第 36 轮、AGENTS 数字） | **DONE** | 见 §4 |

## 2. 改动文件

新增（6）：

| 文件 | 内容 |
| :--- | :--- |
| `src/lib/mermaidLazy.ts` | 惰性 loader（唯一动态 `import('./mermaidLoader.ts')`）、`ensureMermaid`、`renderDiagram`（按 code 缓存、失败不抛错）、`fallbackHint`、`listMermaidBlocks`、`isMermaidLanguage`、`mermaidHash`、测试钩子（`__setLoaderForTest` / `__getLoadCount` / `__getLastError` / `__resetForTest`） |
| `src/lib/mermaidLoader.ts` | 只被动态 import：`import mermaid from 'mermaid/dist/mermaid.core.mjs'`（同 `katexLoader.ts` 形状） |
| `src/lib/mermaidPreview.ts` | ProseMirror 插件 + 装饰：`codeBlock` 上加 `.is-mermaid`，块后挂 `Decoration.widget(..., {side:1, ignoreSelection:true, key})`；400 ms 防抖；渲染结果**就地更新** widget DOM；失败换 `.is-error` + 一句提示；widget DOM 缓存键 `${pos}:${hash}`（不同位置各一个节点） |
| `src/mermaid-dist.d.ts` | 深路径 `.mjs` 的类型声明（仿 `src/katex-dist.d.ts:1-6`；`mermaid/dist/mermaid.core.d.mts` 实测不存在） |
| `src/lib/mermaidLazy.test.ts` | 6 条单测（成功 / 失败降级 / 只加载一次 + 缓存 / 并发只加载一次 / 收集块 / 无块不加载） |
| `.tmp/e2e-r36-*.mjs`（3 个，gitignored） | T1 / T2 / T3 的验收脚本 |

修改（10）：

| 文件 | 改动 |
| :--- | :--- |
| `src/App.tsx` | T1 删 1 行（`:1803` 处的 `setAnnotations([])`）；T2 加模块级 `focusSourceEditor()` + `enterSourceFor` / `switchView` 两处调用（另加 `leavingSource` 变量）；T3 加 1 行 import + 1 行 `MermaidPreview` 注册 |
| `package.json` | `"mermaid": "11.12.0"`（精确锁定，不用 `^`）；`scripts.test` 追加 `src/lib/mermaidLazy.test.ts` |
| `package-lock.json` | `npm install --cache .tmp/npm-cache` 生成（+1,216 行，新增 125 个包） |
| `src/styles.css` | `.mermaid-preview` / `svg{max-width:100%}` / `.is-pending` / `.is-error` |
| `scripts/measure-first-screen.mjs` | banned 正则加 `/mermaid/i` |
| `.github/workflows/release.yml` | `:262` 的 `while … done` 后补 `|| true` |
| `README.md` | 首屏与安装包实测数字、依赖「三组」+ Mermaid 一行、`23 个文件、301 条断言`、`23 个测试文件` |
| `docs/adr/0017-mermaid-lazy-loading.md` | 标题/状态改「已接受并落地」，新增「第 36 轮实测」节（真字节替换预估 + 四处偏离原方案 + 已知限制） |
| `docs/typora-gap.md` | Mermaid 行改「有（第 36 轮，惰性渲染…）」 |
| `docs/CHANGELOG.md` | `## Unreleased（第 29–36 轮）` + 第 36 轮条目（含 UNVERIFIED） |
| `AGENTS.md` | §3 测试数字 22/295 → 23/301；§6 加 Mermaid 能力与首屏 288,256 B |

## 3. 命令与结果

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（无输出） |
| `npm test` | exit 0；**23 个文件 301 条**（295 + 新增 6 条） |
| `npm run roundtrip` | exit 0；`source: 7/7 等值；firstSaveBlocked: 1/7`；`docs/roundtrip-report.md` **无 diff**（说明装饰不进序列化，T3 加插件没引入往返损失） |
| `npm run build` | exit 0 |
| `npm run verify` | exit 0 → 首屏 gzip **288,256 B**、`files=3`、`headroom=31,744`、`target=310000 gap=21744`、`PASS` |
| `node scripts/measure-first-screen.mjs` | 同上（`index-CkPNnBZ0.js` 280,679 B gzip + `rolldown-runtime` 450 B + `index-D5qWVvxk.css` 7,127 B） |
| `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun` | exit 0；`target=1800000 gap=-500531`；`assoc-dryrun=1299469 B` |
| `Get-ChildItem dist -Recurse -Filter *.map` | **0** |
| `Select-String dist\index.html -Pattern mermaid` | **0 命中** |

### size-gate（门 A：单值 `assoc-dryrun ≤ 1,997,853 B`）

```
dist            基线 31 文件 / 1,471,108 B  →  97 文件 / 3,833,607 B（+2,362,499 B raw）
dist *.js       13 → 80
mermaid chunk   mermaidLoader-CKf580Bv.js 77.79 kB raw / 27.51 kB gzip（只被动态 import）
                + 66 个图类型 chunk（最大 cytoscape 441.71 kB、chunk-FPAJGGOC 361.22 kB）
assoc-dryrun    1,299,469 B     ← 门 A 判据：≤ 1,997,853 → PASS（余 698,384 B）
formal_est      1,297,322 B     （dry-run − 2,147，findings-ship.md:134 的方向）
内部线          target=1800000 gap=-500,531（在内部预算内）
首屏            286,056 → 288,256 B（+2,200 B），files=3，集合内无 mermaid
```

注意：`plan.md` 的 rev 2 猜 `files=2`，实测变 **3** —— 多出来的是 `rolldown-runtime-vfrPO-fZ.js`（450 B gzip），不是 mermaid（mermaid 相关项 `banned` 检查 0 命中）。判定口径按「PASS + 集合内无 mermaid chunk + 总量 ≤310,000」通过。

### dev-warmup（P1-2；`## errors-warmup` 允许非空）

```json
{"loadsBeforeReload":1,"loadsTotal":2,"warmSvgBeforeReload":1,
 "warmupMermaidReqs":["/src/lib/mermaidPreview.ts?t=…","/src/lib/mermaidLazy.ts",
   "/src/lib/mermaidLoader.ts","/node_modules/.vite/deps/mermaid_dist_mermaid__core__mjs.js?v=…"],
 "previewClass":["mermaid-preview ProseMirror-widget is-ready"]}
## errors-warmup []
```

- 第一次打开含图文档时 Vite 就完成了 mermaid 的依赖预构建（日志里有 `optimized dependencies changed. reloading` 造成的整页 reload，`loads 1→2`），`svg` 已出（`warmSvgBeforeReload: 1`）。
- 段 0 的 reload 后按审查 P1-2 的修法重做：`reload` → 等编辑器 → **重新「打开文件夹」** → 重新开文档（假工作区不会自己回来）。
- 段 0 结束后 `reqs=[]`、`errors=[]` 重新收集（审查 P1-3），段 1 的四条断言才有效。

## 4. E2E 结果（三条全 PASS）

### T1 `.tmp/e2e-r36-fix-ann.mjs` — `## VERDICT PASS`

种子：`批注.md` = `天空很蓝。天空很蓝。另一段也有天空。`；`.sidelight/annotations/批注.json` = `{v:2,annotations:[{id:a1,from:3,to:5,quote:"很蓝",…}],notes:[]}`

| 阶段 | 实测 |
| :--- | :--- |
| 基线 | `.annot` 1 个、`textContent='很蓝'`、`批注（1 条）` |
| 「天空」→「天」全部替换后 | 正文 `天很蓝。天很蓝。另一段也有天。`；`.annot` **仍是 1**、`textContent='很蓝'`；store 里 `from=2,to=4`（单次映射，`to-from=2`；双映射会是 `2–3`/缩成「很」） |
| `Ctrl+Z` 后 | 正文回 `天空很蓝。…`；`.annot` 仍 1 且 `'很蓝'`；store 回到 `from=3,to=5`；rail 仍 `批注（1 条）` |
| `## errors` | `[]` |

截图：[impl-ann-after-replaceall.png](../../../shots/round-36/impl-ann-after-replaceall.png)、[impl-ann-after-undo.png](../../../shots/round-36/impl-ann-after-undo.png)

### T2 `.tmp/e2e-r36-fix-source-focus.mjs` — `## VERDICT PASS`

| 段 | 实测 |
| :--- | :--- |
| ① `Ctrl+/` 进源码 | `activeElement` = `TEXTAREA.source-editor`；打 `Z` 后 value 长度 15 → 16 |
| ② `Ctrl+/` 退出源码 | `activeElement` = `DIV.tiptap ProseMirror … -focused`；打 `Y` 后 `.ProseMirror.innerText` 含 `Y`（真能输入，不只是名字对） |
| ③ 点工具栏「源码」 | 焦点进 `TEXTAREA`；打 `Q` 后 value 含 `Q` |
| ④ 载入即源码（`引用.md`，含 `[ref]:` 定义） | `inSource: true`，`activeElement` = `DIV`（**不是** TEXTAREA）→ 不抢焦点，无回归 |
| `## errors` | `[]` |

> 说明：① 第一次跑时断言 `value.endsWith('Z')` 假失败——源码框光标落在**开头**（源码模式挂载后不设选区），实测 `value` 变 `Z第一段…`、长度 +1。产品行为正确，是断言写死「追加在尾部」。改成断言长度 +1 后 PASS（未改产品代码）。

截图：[impl-source-focus.png](../../../shots/round-36/impl-source-focus.png)

### T3 `.tmp/e2e-r36-mermaid.mjs` — `## VERDICT PASS`

| 段 1 断言 | 实测 |
| :--- | :--- |
| 打开**不含** mermaid 的文档 | `mermaidReqs = 0`、无 `.mermaid-preview` 元素 |
| 打开含 ```` ```mermaid ```` 的文档 | `svg` 1 个（`width="100%"`）、`.mermaid-preview` class = `mermaid-preview ProseMirror-widget is-ready` |
| 懒加载证据 | 段 0 记录里出现 `mermaidLoader.ts` 与 `/node_modules/.vite/deps/mermaid_dist_mermaid__core__mjs.js`；**段 1 不再重复请求**（浏览器已缓存）→ 断言改为「段 1 打开普通文档 0 条 + 段 0 出现 mermaid chunk 请求」两条一起看，见 §6 P1-3 的落地差异 |
| 坏语法 `not a valid diagram` | `.mermaid-preview.is-error` 出现；提示 `图表没渲染出来，代码块内容仍是原文，可以继续编辑。`；`pre code` 文本**逐字仍是** `not a valid diagram` |
| 源码模式 `Ctrl+/` | 先 `waitForFunction(activeElement === TEXTAREA)` 再断言：value 含 ```` ```mermaid ```` |
| `Ctrl+S` 后 fake FS 字节 | 与打开时**逐字相同**（未编辑 ≠ 被改写） |
| `## errors` | `[]` |

截图：[impl-mermaid-render.png](../../../shots/round-36/impl-mermaid-render.png)、[impl-mermaid-fallback.png](../../../shots/round-36/impl-mermaid-fallback.png)

## 5. 与计划的偏差（按最小改动绕过，未扩大范围）

1. **不写临时 `useEffect`**（计划步骤 2 第 2 点）：本轮把 T3 的「接线」与「插件」合并实现，`mermaidPreview.ts` 静态 import `mermaidLazy.ts` 已把 mermaid 的动态 chunk 拉进模块图，`npm run build` 出的就是真字节，临时 `useEffect` 只会多一次改动。真实体积门因此更早拿到（构建后第 1 次 dry-run 就是 1,299,469 B）。
2. **渲染完成不 dispatch 事务**（计划步骤 3 要求 `setMeta(key, true)`）：改成**就地更新**已挂上的 widget DOM（`refreshLivePreviews`）。理由：`WidgetType.eq` 用 `spec.key` 判等（`node_modules/prosemirror-view/dist/index.js:4041-4045`），同 key 重建装饰时 PM **不会**重跑 `toDOM`，dispatch 换不掉节点；就地更新少一次事务，也不进撤销栈/不触发批注映射。
3. **E2E 的「懒加载请求」断言移到段 0**（见 §4 T3 与 §6 P1-3）：段 1 时浏览器已缓存同一 chunk，不会二次请求；「段 1 打开普通文档 0 条 mermaid 请求」仍按审查 P1-3 用清空后的记录判。
4. **`mermaid` 版本用 `"11.12.0"` 精确锁**（不是 `^11.12.0`）：体积门是同版本量出来的，避免下次 `npm install` 漂到 11.13。

## 6. 审查 6 条漏洞的落点（本轮实施时全部照做）

| 审查 | 落地 |
| :--- | :--- |
| **P1-1** `npm install` 必 EPERM | 用 `npm install mermaid@11.12.0 --cache .tmp\npm-cache --no-audit --no-fund` → exit 0（`added 125 packages in 23s`）。未撞 EPERM，说明 `--cache` 修法有效 |
| **P1-2** reload 后工作区不回来 | E2E 段 0 三步：`reload` → `waitForSelector('.doc-column .ProseMirror')` → **`openFolder()`**（「文件 ▾」→「打开文件夹…」+1400 ms）→ `openDoc('图表.md')` → 再等 `svg` |
| **P1-3** 段 1 请求记录被段 0 污染 | `warmed = true` 时 `reqs = []`、`errors = []`；两段分别打 `## dev-warmup` / `## errors-warmup` 与 `## requests` / `## errors` |
| **P2-4** 预热按原写法不会触发预构建 | 未写临时 `useEffect`（见 §5.1），真实插件首次见块就 `ensureMermaid()` → 实测确实触发了 Vite 预构建与一次整页 reload（`loads 1→2`），`## dev-warmup` 记录的是真信号 |
| **P2-5** widget DOM 按 hash 全局复用会丢图 | 缓存键改 `${pos}:${hash}`，`toDOM` 每次 `new` 一个 `div`；两个相同代码块各得一个节点 |
| **P2-6** T1 双映射诊断落点写错 | E2E 打印的是实测 store：单映射 `from=2,to=4`；判 FAIL 前先打印现场（`activeElement` / `.annot` 个数与 `textContent` / store 原文），本次未用上 |

## 7. 新踩的坑（写进下一轮 AGENTS §8 候选）

1. **`Extension.create()` 返回的实例上没有方法**：`MermaidPreview.addProseMirrorPlugins` 是 `undefined`（方法在 `extension.config` 里，由 `getExtensionField` 取），用它判「插件有没有注册」会假阴。正确判法是 `ext.config.addProseMirrorPlugins` 或直接在方法里打日志。
2. **dev server 也会交付「中间版本模块」**：本轮 T3 第一次 E2E 报「`svg` 0 个、`mermaid` 请求 0 条、`.mermaid-preview` 0 个」，`performance.getEntriesByType('resource')` 里却有 `mermaidPreview.ts`。根因是落盘与 HMR 之间那一次页面跑的是「没有注册插件」的 App 版本；再触发一次 HMR（改一行无关代码）后同一 URL 立即正常。判「产品没实现」前先看有没有 `addProseMirrorPlugins` 的实时日志，别急着改产品代码（AGENTS §8 已有同型记录，这次是反方向：旧 → 新需要一次 HMR）。
3. **`page.on('console')` 只收 error 会看不到自己的 `console.log` 调试输出**：诊断插件是否注册时白跑了两轮，探针要记录 `'log'`。
4. **PowerShell 字符串替换会毁 UTF-8 中文**：用 `Get-Content -Raw | -replace | Set-Content` 改 `package.json` 时把 `"Sidelight · Your writing."` 里的 `·` 写成 `路`（AGENTS §8 已记，本轮又踩一次）——改 `package.json` 也必须用 `edit` 工具。
5. **源码框聚焦后光标在开头**：`setViewMode('source')` 挂载 textarea 后不设选区，`focus()` 的光标在 0 位。断言「追加到末尾」会假失败。

## 8. UNVERIFIED（测不到，写清补测法）

1. **正式安装包字节**：只跑 `-AssocDryRun`（`installer.ps1` 在 dry-run 分支提前 `exit 0`，跳过 `:117-129` 的 2,000,000 硬判）。预估 1,297,322 B。补测：发版那轮正式打包后 `Get-Item`。
2. **WebView2 宿主里的 mermaid 渲染**：只用 CDP 浏览器（9222）。补测：真宿主打开含图文档。
3. **HTML 导出与预览面板不含图**：本轮就不做（ADR-0017 已明写偏离），不是「测不到」而是「没做」。
4. **中文输入法下的源码框聚焦**：`keyboard.type` 只发 ASCII。
5. **撤销后批注位置精确跟随**：只验了条数、`textContent` 与 `to-from`（种子文档单段、替换等距）。
6. **>1 MB 文档含 5+ 张图的滚动/重排性能**：只测 1 张图。
7. **mermaid 各类图的真实报错文案**：只跑一个坏语法样本。
8. **dev 依赖重优化（504 / 整页 reload）在正式构建里不存在**：性质决定（rollup 无 optimizeDeps），只靠段 0 预热挡干净；本轮未删 `node_modules/.vite`（共享的 5175 会被整站重建）。
9. **`docs/typora-gap.md` 的「21 项有、18 项缺」计数**：本轮只改了 Mermaid 那一行，没有重算全表（`AGENTS.md:74` 仍写 21/18）。补测：按表逐行统计后同步 AGENTS 与 README。

## 9. CHANGELOG 建议条目

已直接写进 `docs/CHANGELOG.md` 的 `## Unreleased（第 29–36 轮，未发版）` 下「第 36 轮」小节（Mermaid / 全部替换不再清批注 / 源码焦点 / release.yml / 文档 / 门禁 / UNVERIFIED 七条）。**未新增版本节、未改 `package.json` 版本**。
