# 第 30 轮 · 计划审查（critic，只读）· revision 3 复检

- 输入：`docs/iteration/round-30/plan.md`（revision 3，revision 表在 `:3-32`）、`findings-bug.md`、`findings-typora.md`、`findings-ship.md`、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md`（§4/§7/§8）、`docs/CHANGELOG.md`、`.tmp/iteration/{common.md,roles/{critic,tester}.md}`、`package.json`、`src/App.tsx`、`src/lib/{trash.ts,cache.ts,wordcount.ts,wordcount.test.ts,export.ts}`、`src/components/{StatusBar,PreviewPane,SaveDialog}.tsx`、`scripts/{measure-first-screen,keyboard-acceptance,export-acceptance}.mjs`、`packaging/{installer.nsi,installer.ps1}`、`.github/workflows/{ci,release}.yml`、`.tmp/{r30-fsa.mjs,e2e-r30-verify.mjs}`。
- 方式：只读核对 + 实测（`npm test` 一次、`node scripts/measure-first-screen.mjs --dir dist` 一次、`git ls-files`/`git status`/`git log -1`）。未改产品代码、未跑 E2E、未重启 dev server、未启动浏览器。本文件**取代**上一版审查；上一版的 R1–R6 原文已被 `plan.md:5-13` 的修订对照表引用，可从那处回看。
- **结论：REVISE**。上一版 6 条漏洞与 B3 全部真实修掉（R3 只差一行作用域，见 R7 的反面）。本轮新发现 1 条 P1 与 3 条 P2：P1 是 R3 的修法本身会把 `currentName` 弄出作用域，照字面做 `tsc` 必红，且 `:190-197` 的删除 try 有被顺手搬进守卫块的空间（真搬了就是「干净文件删了还留在原地」）；3 条 P2 分别是 `SaveDialog` 回落重复 R6 的具名导出坑、Escape 插入行号写成 `:3426` 之前、tester「不跑 build」与 `tester.md:6` 冲突未声明优先级。

## 1. 上一版漏洞复检（R1–R6、B3）

| 编号 | 上一版要求 | 本版实际 | 判定 |
| :--- | :--- | :--- | :--- |
| R1 P1 | tester 的 §5 范围与工时账对齐，别撞 35 分钟硬线 | §5 重排成八项，`:341` 写 `合计 4 + 12 + 2 + 3 + 2 + 3 + 4 + 3 = 33 分钟`，逐项与 `:325-339` 一一对应，算术正确；`:81` 新增 tester 超时砍单表（`①keyboard ②导出 md/txt ③深色断言`），并以「T1 的 e2e ①–⑤/⑦、`npm test`、`measure`、`test.md`、commit」为不许砍项；T2 复验从「自己重跑」降为「读三份日志 + `git diff` + 2 条 grep」（`:336`）；`README`/`CHANGELOG` 内容归 T3-B（`:238,321`）、`STATE.md` 归根代理（`:339`，依据 `STATE.md:123` 与 `AGENTS.md` §7，我核到 `STATE.md:123` 确为「根代理只在批次之间做事…串行跑 build/test/measure、更新本文件」）；`tester.md:14-20` 的六件收尾都有人做（AGENTS §3/§6 + commit 仍归 tester）。两处 +2 兜底（dist 不新鲜、日志缺一份）合计 4 分钟，砍单表 ①② 共 5 分钟可吸收 | **已修** |
| R2 P1 | 两条回归脚本必须写全 URL 与 CDP | `:142`、`:334`、`:337`、`:355-357` 全部写成 `$env:SIDELIGHT_CDP='http://127.0.0.1:9224'; node scripts/… http://localhost:5175`；`:361` 单列一段说明「默认是禁用的 5173 与 T1 的 9222」。我实测 `keyboard-acceptance.mjs:6-7`、`export-acceptance.mjs:4-5` 默认值确为 `5173`/`9222`；4 张会被覆盖的历史截图 `git ls-files` 全部在跟踪里（`shots/round-05/t1-{skip,filemenu,shortcuts}.png`、`shots/round-04/t3-export.png`），还原命令写法正确 | **已修** |
| R3 P2 | `:166` 的 `const current = text` 要一起收窄 | 改动表 ① 写了「删掉 `:166` 的 `const current = text`…`current` 只能在块内取」，风险 5 也改成「两处收窄」。**方向对，但落点错了一个变量**：`currentName` 被一起搬进守卫块，见下方 R7 的 P1 | **部分修** |
| R4 P2 | 删掉二次读回（旧句柄会 NotFoundError） | 改动表 ⑤ 改为「**不做二次读回**」，非空保证放进 `pickTrashSource`（`.current.md` 必须 `size > 0` 才优先），完整性交给 copy 分支既有的 sha256 双读（我核 `trash.ts:371-376` 确在）。不采纳 `buffer.byteLength === 0` 硬失败的理由成立：空文档是合法内容，删了要能撤回；真实盘 `move()` 仍是 UNVERIFIED（`STATE.md:95`） | **已修** |
| R5 P2 | 并行时 `tsc`/`npm test` 的并发中间态 | `:314` 加了判据（先 `git status --short` + `git diff --stat`，是别人的文件就等 2 分钟，报告注明「并发窗口」） | **已修** |
| R6 P2 | `PreviewPane` 是具名导出，`lazy` 必须写 `.then` | `:104` 写全 `lazy(() => import('./components/PreviewPane.tsx').then((m) => ({ default: m.PreviewPane })))` 并删 `:26` 静态 import。我核 `PreviewPane.tsx:32` 是 `export function PreviewPane`、无 default；`App.tsx:26` 是静态具名 import | **已修** |
| B3 | `entries()` 只收文件句柄，且要落成静态断言 | 改动表 ④ 写 `handle.kind === 'file'`，T2 验收 2 第三条 grep `kind === 'file'` 命中 1（`:191`）。我核 `.tmp/r30-fsa.mjs:87-104` 的 `entries()` 确实在 `:95`、`:102` yield 目录句柄 → 这条过滤是必需的，不是洁癖 | **已修** |

## 2. 本轮漏洞（按严重度，最多 6 条）

### R7 · P1 · R3 的修法把 `currentName` 搬出了作用域：照改动表做第一次 `tsc` 必红，且删除 try 有被误改的空间

`src/lib/trash.ts` 实测：`:166` `const current = text`、`:177` `const currentName = \`${finalName}.current.md\``、`:178-189` 写 `.current.md` 的 try/catch、`:190-197` **删原文件**的 try/catch —— 其中 `:194` 的 catch 用的是 `currentName`：

```ts
177:    const currentName = `${finalName}.current.md`
178:    try { …写 .current.md 并读回校验… } catch { … }   // :178-189
190:    try {
191:      const parent = await parentForPath(root, node.path)
192:      await parent.removeEntry(node.name)
193:    } catch (error) {
194:      await trashDir.removeEntry(currentName).catch(() => undefined)
```

`plan.md:171` 写的是「把 `:177-189` 整段（含新加进块内的 `const current = text` 与 `const currentName = …`）放进 `if (text !== null && shouldWriteCurrent(text)) { … }`」——没写 `:190-197`。照做后 `currentName` 只在守卫块内可见，`:194` 报 `Cannot find name 'currentName'`（TS2304），T2 步骤 4 的 `npx tsc --noEmit`（`:184`）直接红；而风险 5（`:217`）还写着「两处收窄」，实际是第三处。

误改的代价比红门禁大：`:190-197` 是「删原文件」那一步，**干净文件（`text === null`）也必须走**。若 T2 为消错把这段也搬进守卫块，干净文件删除时原文件不再被删，函数照样 `return { ok: true, … }` —— 文件留在原地、回收站多一份副本，P0 修复变成另一个缺陷，而 tester 的 3-a 断言的是「trash 只有 1 个条目」，恰好抓不到这种「原文件没删」的形态（`## after delete clean` 的清单里根文件仍在，但计划没规定断言根文件消失）。

**修法（改三句，不动任务结构）**：
1. `const currentName = …`（`:177`）**留在守卫块外**：它只依赖 `finalName`，与 `text` 无关。
2. 只把 `const current = text` 与 `:178-189` 的写 `.current.md` try/catch 搬进 `if (text !== null && shouldWriteCurrent(text)) { … }`。
3. 改动表与 T2 步骤 3 里明写「**不要**把 `:190-197` 的删除 try 搬进守卫块」：块内两条 `removeEntry` 都带 `.catch(() => undefined)`，`currentName` 不存在时不会抛。
4. 风险 5 改「三处收窄」：`text`、`current`、`currentName` 的可见性。
5. 顺手把验收 3-a 补一个断言：删除后根目录里 `干净.md` 从清单消失（否则「原文件没删」这类误改只有人工看）。

### R8 · P2 · 体积回落那一步的 `SaveDialog` 也是具名导出，计划没写 `.then` 包装 —— 与 R6 同一个坑，这次踩在数据丢失确认框上

`src/components/SaveDialog.tsx:41` 是 `export function SaveDialog`（3,509 B，计划 `:151` 的字节数对得上），**没有 default**；`App.tsx:4783-4792` 现在是常挂载 + `open={pendingConfirm !== null}`，组件内 `:44` 是 `if (!open) return null`。计划 `:110` 只写「只追加一步 `SaveDialog` 懒加载（`pendingConfirm` 非空才渲染）」，没写 `lazy()` 的默认导出转换。照字面写 `lazy(() => import('./components/SaveDialog.tsx'))`，第一次需要它时会抛「module … has no default export」，而这个对话框是「保存前逐条丢失对比」的确认入口 —— 白屏即挡死保存路径，且 T1 的验收 1–7 都不检查它（截图只拍字数面板），会静默进包。触发条件（回收 <300 B）概率低，但这条回落的全部价值就是「一次就能救回体积」，写错等于把隐患换进来。

**修法（二选一）**：
- 写全：`const SaveDialog = lazy(() => import('./components/SaveDialog.tsx').then((m) => ({ default: m.SaveDialog })))`，渲染改 `{pendingConfirm !== null && <Suspense fallback={null}><SaveDialog open losses={pendingConfirm.losses} onConfirm={confirmSave} onCancel={cancelConfirm} onOpenSource={…} /></Suspense>}`（`open` 恒为 `true`，与组件内 `if (!open) return null` 兼容）。
- 或删掉这条回落，改成「省不到 300 B 就如实写报告、不追加回落」——本任务的核心是面板，不是体积。

### R9 · P2 · Escape 分支的插入位置写成「`:3426` 之前」，按字面插会跑到 `Escape` 判断之外，面板打开时吃掉所有按键

`App.tsx:3426` 是 `if (event.key === 'Escape') {`，`:3427` 起才是 `railOpen` 第一支。计划 `:102` ⑥ 写「Escape 链最前面加一支（`:3426` 之前）」。若 T1 照字面插在 `:3426` 之前，`if (statsDetail !== null) { … return }` 就落在 `event.key === 'Escape'` 判断之外：**面板打开时任何按键**（`Ctrl+S`、`Ctrl+K`、正文输入）都会关面板并 `return`，键盘全哑。tester 的 ③ 只测 Enter 与 Escape，测不出这条。

**修法**：改成「插在 `:3426` 的 `if (event.key === 'Escape') {` **之内**、`:3427` 的 `railOpen` 分支之前」；tester ② 可加一句廉价断言「面板打开时按 `Escape` 之外的键（如 `Escape`×2 之外用 `Ctrl+S`）面板不被关」——不强制，但那一条能把「提前 return」钉死。

### R10 · P2 · 「tester 不跑 `npm run build`」与 `tester.md:6` 的门禁清单冲突，计划没声明优先级

`tester.md:6` 把 `npm run build` 列为门禁之一（「门禁：`npx tsc --noEmit`、`npm test`、…、`npm run build`、`node scripts/measure-first-screen.mjs`」），而 `plan.md:325` 明确「**不跑 `npm run build`**：`dist/` 用根代理批次间那次」。tester 按角色文档执行时大概率会跑一次（`tsc --noEmit && vite build`，60–90 秒），既吃掉 33 分钟里的 1–2 分钟，也让「数字来源是根代理那次 build」的口径变模糊（同源码同 Vite 版本应字节一致，但 tester 的报告里会多一份来源不同的数字）。

**修法**：`:325` 加一句「`tester.md:6` 的 `npm run build` 本轮由根代理在批次间代跑（`STATE.md:129`），以实现 §5-1 为准；tester 对 `dist/` 只做新鲜度核对」。

## 3. 计划点名的事实核对（本版实测）

| 断言 | 实测 | 判定 |
| :--- | :--- | :--- |
| `npm test` 基线 17 文件 / 251 条（计划用 251+6=257、+3=260 卡三档） | 实跑退出码 0，逐文件 `ℹ pass` 求和 → `files=17 sum=251`。三档算术成立 | ✅ |
| 首屏基线 285,838 B、余 162 B、上限 286,000 | `node scripts/measure-first-screen.mjs --dir dist` → `total raw=929441 gzip=285838 files=2 max=286000` `PASS`（dist/index.html mtime `2026-11-17T00:20:10`，HEAD `11fdff6` @ `00:12:51`，dist 比最后一次 commit 新） | ✅ |
| `trash.ts` 现状计数 `?? ''` 1 / `shouldWriteCurrent` 0 / `kind === 'file'` 0 | grep 逐条命中：`?? ''` 只在 `:305`；另两者 0 | ✅ |
| `trash.ts` 关键行号 `:166/:177-189/:181/:190-197/:305/:321-330/:346-352/:356-358/:371-376` | 逐个打开核对，全部一致；`:194` 的 `currentName` 就是 R7 的来源 | ✅（见 R7） |
| 删除路径唯一：`deleteDocumentToTrash` ← `App.tsx:2322`；`deleteFileWithText` ← `trash.ts:305` | 全仓 grep 只有这两处；`deleteFileToTrash` 已无调用方 | ✅ |
| `.tmp/r30-fsa.mjs` 有 `move()`（copy 分支走不到，§8.9 成立）；`entries()` 会 yield 目录句柄 | `:49 async move()`；`entries()` `:87-104`，`:95`/`:102` 都是 `makeDir(...)` | ✅ |
| `PreviewPane.tsx:32` 具名导出、`:5` 静态 import `export.ts`、渲染 `.ProseMirror[contentEditable=false]` | 全对；`:52-53` 是 `article.ProseMirror.preview-pane` + `contentEditable={false}` → tester 的断言可行 | ✅ |
| 首屏回收可行性（`export.ts` 6,181 B、`PreviewPane.tsx` 2,165 B，两处改按需后离开首屏） | 文件字节逐字一致；全仓静态 import `export.ts` 的只有 `App.tsx:63`、`PreviewPane.tsx:5`、`export.test.ts`（测试不进包）→ 回收路径成立 | ✅ |
| `App.tsx` 行号 `:26/:63/:67/:3426/:3448/:3599-3617/:2321/:4746/:4783` | 逐个打开核对全对；`:3599-3617` 依赖数组现无 `statsDetail`，`:3448` 确为无依赖的 `sourceConfirm` 分支 | ✅ |
| `wordcount.ts:47-57` 有 5 个统计量、`formatStats` 输出 `N 字 · 阅读约 N 分钟` | `:60-65` 用 `toLocaleString('en-US')` → tester ① 的 `/^\d[\d,]* 字/` 能匹配；`estimateMinutes` 最少 1 分钟 | ✅ |
| `wordcount.test.ts` 现有 8 个 `test(`，加 3 条 → 11 | 8 个；但计划 `:98` 写「`wordcount.test.ts:33,66` 有 `deepEqual` 全字段断言」，**实际 `deepEqual` 只在 `:33`、`:34` 两行，`:66` 没有该断言** | ⚠️ 小误差（结论「不改 `TextStats`」不受影响） |
| `scripts/keyboard-acceptance.mjs` 只测正文前后两次 Tab（`:109-140`），新增焦点按钮不受影响 | `:109-140` 全是 skip-link / 正文中间 Tab，无状态栏 tab 序断言；截图 `:144`、`:260`、`:302` | ✅ |
| `scripts/export-acceptance.mjs` 7 条检查、`:69` 覆盖历史截图 | `check(` 7 处（`:62-68`），`:69` 写 `shots/round-04/t3-export.png` | ✅ |
| 面板不能放进 `.status-bar`：8 个脚本用 `page.textContent('.status-bar')` 抓字数 | 结论成立，但**是 7 个脚本、9 处引用**（`diag-longdoc-single:36`、`host-save-acceptance:100`、`diag-longdoc-annot:39`、`qa16:33,115`、`qa11:32`、`qa10:64,67`、`qa:106`）；行号全对 | ⚠️ 小误差（结论不变） |
| `ci.yml:38/:40` gate 的 build/test；`:96-97` installer、`:99` Checksums；`release.yml:80/:142` 只有 `npm run build` | 全部逐行一致；`release.yml` 两个 job 均无 `npm test`/`measure` | ✅ |
| `installer.nsi:34,37` 写死 `0.31.1.0`、`:36` 用 `${APPVERSION}`；`installer.ps1` 断言插在 `:65-68` 之后、`:70` 之前可同时覆盖 dry-run 与正常路径 | `installer.ps1:52-57` defines、`:60` makensis、`:61/:65-68` 判码、`:70-78` dry-run `exit 0`、`:80` `$setup`、`:35` SourceForge 下载行 | ✅ |
| `README.md:96/98/114` 三个待改数字；`CHANGELOG.md:5` 标题 | `:96` 285,838 / −21.7% / 余 162 B；`:98` 约 888 KB；`:114` 17 文件 248 条；`CHANGELOG.md:5` 逐字一致 | ✅ |
| `STATE.md:123/124/129`、`tester.md:6,14-20` | 逐条一致（见 R1/R10） | ✅ |
| 计划自述「插入修订块后 `## 0.` 落在 `:40`」 | 实测 `plan.md:40` 就是 `## 0. 本轮取舍` | ✅ |
| 偏差说明（不算漏洞）：T3-B 写 `README`/`CHANGELOG`、根代理写 `STATE`，与 `tester.md:14-20` 的字面分工不同 | 但 `AGENTS.md` §7 明写「轮次结束由根代理更新 `docs/iteration/STATE.md`」，且 tester 仍核数 + commit，轮末状态与角色文档要求一致；这是**总规则覆盖角色文档**，不是遗漏 | ✅（可接受） |

## 4. 最小修订版（改完可 PASS）

1. **R7**：`:177` 的 `currentName` 留在守卫块外，只搬 `current` 与写 `.current.md` 的 try；明写不搬 `:190-197`；风险 5 改「三处」；验收 3-a 补「根文件从清单消失」。
2. **R8**：`SaveDialog` 懒加载写全 `.then((m) => ({ default: m.SaveDialog }))`（或删掉这条回落）。
3. **R9**：Escape 插入位置改成「`:3426` 的 Escape 分支内、`:3427` 之前」。
4. **R10**：`:325` 声明 `npm run build` 由根代理代跑，`tester.md:6` 以 §5-1 为准。
5. 顺手改正 `:98` 的 `:33,66`（实为 `:33,34`）与 `:150` 的「8 个脚本」（实为 7 个脚本 / 9 处引用）——只改事实，不动结论。

改完 1–4 即可 PASS；第 5 条可随修订一起改，不值得单开一轮。
