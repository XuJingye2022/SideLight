# 第 38 轮计划（planner）

- 轮次：round=38；轮前 `startSha=bb52c6a23045042c18a08748547ef796f2e4890f`（`docs: round-37 看板记录提交哈希`），写本文件时 `git rev-parse HEAD` 相同、`git status --porcelain` 只有未跟踪的 `docs/iteration/round-38/` 与 `shots/round-38/`。
- 输入（全部读完）：`round-38/findings-bug.md`（2 条，均 P2）、`round-38/findings-typora.md`（10 条）、`round-38/findings-ship.md`（5 条）；另读 `docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`docs/adr/0017-mermaid-lazy-loading.md:96-111`、`docs/CHANGELOG.md:1-30`、`round-37/plan.md`、`round-37/impl.md`（§0/§5 的交接项）、`git log -8`，以及下列源码：`src/App.tsx`（`:11`、`:763-792`、`:850-857`、`:3954-3985`、`:4817-4818`）、`src/lib/asset.ts`、`src/lib/workspace.ts:138-156`、`src/components/PreviewPane.tsx`、`src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts`、`src/lib/mermaidLazy.ts:88-141`、`src/lib/mermaidPreview.ts`、`src/lib/mermaidLazy.test.ts`、`node_modules/@tiptap/extension-image/dist/index.js`、`.tmp/r30-fsa.mjs`、`package.json`。`docs/typora-features.md` 本轮**没有**逐行读，只据 `findings-typora.md` 第 11 条的核对表记账（§7 第 10 条）。
- 只读：本轮 planner 只写本文件；未改产品代码、未跑 E2E、未碰 `release/`、未 push。
- **修订：revision=2（第 2 次修订，planner-revision，只读）**。依据 `round-38/plan-review.md` §二的 6 条漏洞逐条改；任务结构（T1/T2/T3）与原文件一致，没有新增任务。6 条都逐条核过源码与命令，全部可执行（见下表「核对」列）。
- **修订：revision=3（第 3 次修订，planner-revision，只读）**。依据 `round-38/plan-review.md` §三的 5 条漏洞（R2-1 P1，R2-2～R2-5 P2）逐条改；任务结构仍是 T1/T2/T3，**没有新增任务**，只多 2 个 E2E 段（`## img-preview-from-source`、`## img-single-file`）与 3 个种子（`内联.md`、`缺图.md`、`引用.md`）。5 条都逐条核过源码与命令（见下表「核对」列）。**其中 R2-3 的机制描述被本轮更正**：源码模式下不是「NodeView 建了但 tick 不推进」，而是 Tiptap 的 `editor.view` 退化成 Proxy、**根本没有 NodeView**——结论（源码→预览永久破图）成立，修法要更狠（预览自己发起解析），见 §2 T1「根因补充 2」。本文件现在就是执行版。revision=3 另读（逐条核对用）：`src/components/FileTree.tsx:30-300`、`src/lib/workspace.ts:75-165`、`src/lib/asset.ts`、`src/lib/hostBridge.ts`、`src/App.tsx`（`:98-105`、`:696-712`、`:960-1000`、`:1024-1096`、`:1240-1280`、`:2000-2100`、`:2195-2230`、`:3758-3827`、`:3855-3870`、`:3945-3985`、`:4595-4610`、`:4788-4820`）、`src/components/PreviewPane.tsx`（全文）、`node_modules/@tiptap/core/dist/index.js`（`mount` / `unmount` / `get view` / `getHTML`）、`@tiptap/extension-image`、`.tmp/r30-fsa.mjs`（全文）、`.tmp/e2e-r33-bug-a2.mjs:30-90`、`.tmp/e2e-r29-p2.mjs:60-89`、`.tmp/e2e-r37-impl-t1.mjs:1-60`、`.tmp/e2e-r38-typora.mjs:20-59`、`.tmp/r6-switch-debug.mjs:1-30`、`docs/typora-gap.md:30-93`；实跑 `git grep -n "hostModeRef" -- src/`（12 处 `.current`）、`git grep -nE "assetResolve|getAssetVersion|subscribeResolved"`（0）。

## 修订记录（revision=3）

调度指令点名 R2-1（P1）与 R2-2（P2，正文被截断）；R2-3/R2-4/R2-5 是同一份 `plan-review.md` §三的其余三条，一并修完。逐条落点：

| 漏洞 | 修订动作 | 落在 | 核对（本轮实查） |
| :--- | :--- | :--- | :--- |
| R2-1（P1）`## img-back-root` 的根文档选择器 `[data-path$="/图.md"]` 在 `sub` 展开后不唯一，反向那一半点到同一个子目录文档，P1-1 判据假绿 | ① 根文档一律用**精确**选择器 `[data-path="示例文集/图.md"]`，全文禁用 `$="/图.md"` 这类通配结尾；② 种子 `sub/图.md` **更名** `sub/子图.md`（标题 `# 子图`、`sub/assets/b.png` 都不动），两条路径不再同尾；③ 每段加**文档身份断言**：`window.__slState.name` + `.ProseMirror h1` 文本（`图` vs `子图`）；④ §4 写死「文件树点击一律 `page.locator(精确 data-path).click()`（严格模式），不写就报 strict mode violation 硬失败」 | §2 T1 步骤 1/2、验收（`## img-root` / `## img-cross-dir` / `## img-back-root`）、§4、§6 | `workspace.ts:109` `children:[...dirs,...files]`、`FileTree.tsx:42-51`（`visibleRows` 先 dir 后 file，展开即插入子行）、`:266`（`data-path` 挂在 treeitem 上）、`App.tsx:104,707-709`（`__slState.name` 已导出）；展开后 DOM 顺序实为 `示例文集/assets` → `示例文集/sub` → `示例文集/sub/assets` → `示例文集/sub/子图.md` → 根 `图.md`，`$="/图.md"` 的第一个命中确实是子目录那篇；`.tmp/e2e-r37-impl-t1.mjs:42` 的 `openDoc` 就是 `data-path$="/${path}"` 通配，**不许照抄** |
| R2-2（P2）`currentDocPath` 来源未校验：单文件打开（裸文件名 `图.md`）与宿主文档会按工作区根解析，**显示别的文档里的图** | ① resolver **先校验来源**：`docPath` 不以 `space.name + '/'` 开头就返回 null（宿主 `''`、独立文件 `图.md` 都落这条）；② effect B **第一行**加宿主守卫 `if (hostModeRef.current) { setAssetDocPath(''); return }`，否则宿主重开时的 `setActiveFile`（`:1261`）与 `applyHostPayload`（`:1341`）里的 `setDocName` 都会让 effect B 再跑一遍，把 `applyHostPayload` 刚设的 `''` 覆盖掉；③ 新增 E2E `## img-single-file`（工作区同开 + `Ctrl+Alt+O` 打开同名独立文件，断言**不再显示工作区那张图**）；④ §9 记「独立文件插图片仍写进工作区根 `assets/`」是既有行为，本轮只保证不显示错图 | §2 T1 改动文件（effect A / effect B 两行）、验收、§4、§9 | `App.tsx:2205-2209`（`path: picked.name`，裸文件名）、`workspace.ts:147`（`slice(1,-1)` 对 `图.md` 得 `[]` → 工作区根）、`App.tsx:1256-1261`（宿主重开 `setWorkspace` + `setActiveFile(hostFile)`）、`:1029` / `:2069`（`hostModeRef` 置 true/false）、`:3958-3959`（`insertImageFile` 同一 fallback，既有行为）；单文件打开可抄 `.tmp/e2e-r33-bug-a2.mjs:38-47`（stub `window.showOpenFilePicker` + `Ctrl+Alt+O`） |
| R2-3（P2）预览面板只靠 `assetTick`，`[workspace, activeFile?.path, docName, editor]` 不变 → **源码→预览永久破图** | ① 删掉 `assetsVersion` prop 与 `assetTick`（不再有任何 tick state）；② `PreviewPane` 直接 import `resolveAsset` / `getResolvedAsset` / `isRelativeAsset` / `subscribeResolved` / `getAssetVersion`，用 `useSyncExternalStore` 自订阅 + 一个 effect 自行发起解析；③ 新增 E2E `## img-preview-from-source`；④ **更正 plan-review 的机制描述**（见 T1「根因补充 2」）——修法不变，但理由更强：源码模式下连 NodeView 都没有，只能由预览自己解析 | §2 T1「根因补充 2」、改动文件（PreviewPane 行、App `:4817-4818` 行）、验收、§4 | `@tiptap/core/dist/index.js:6697` `unmount()` 把 `editorView = null`、`:6784` `get view()` 在无 view 时返回 **Proxy**（`dispatch` → `dispatchTransaction` 只写 `editorState`）、`:6682` `mount()` 才建 view；`App.tsx:4795-4818`（源码/预览/编辑三选一渲染）、`:2078`（`hasReferenceDefinitions` → 载入即进源码）、`:3864-3866`（`togglePreview` 从源码也能切）、`PreviewPane.tsx:1,32-39`（已在用 `useSyncExternalStore` 等 KaTeX）；`getHTML()` 只读 `this.state.doc`，所以源码→预览的 html 正确，坏的只有图片 |
| R2-4（P2）`## img-inline` / `## img-missing` 没有对应种子，验收不可复现 | 种子补 `内联.md`（data URL 图）、`缺图.md`（引用不存在的 `assets/none.png`）、`引用.md`（含引用式定义，用来测源码→预览）；§4 写死「段 ↔ 文档」对应表；`## img-preview` 写明按键是 `Ctrl+Shift+P` | §2 T1 步骤 1、验收、§4 | `ShortcutsDialog.tsx:44`、`App.tsx:3681`（`Ctrl+Shift+P` → `togglePreviewRef`）、`:4602`（按钮 title 也写着这个键）、`:2078`（引用式定义 → 源码模式） |
| R2-5（P2）`docs/typora-gap.md` 区间前后不一致：文件表写 `:84-91`，步骤 ⑥ 与 §5 写 `:88-91` | 统一成 **`:88-91`**，并写明「只重排这 4 行，`:84` 标题与 `:86` 引导句**不动**」 | §2 T1 改动文件（差距表那一行） | `docs/typora-gap.md:84`（`## 建议的下一批`）、`:86`（引导句「按『先堵数据损失…』排：」）、`:88-91`（4 条，`:89` 已是「行内 HTML 渲染」）；按 `:84-91` 做会连标题与引导句一起重写，属计划外改动 |

## 修订记录（revision=2）

调度指令点名 P1-1、P1-2、P2-1 三条；P2-2/P2-3/P2-4 是同一份 `plan-review.md` 的其余三条，一并修完（否则下一轮审查还会提同样三条）。逐条落点：

| 漏洞 | 修订动作 | 落在 | 核对（本轮实查） |
| :--- | :--- | :--- | :--- |
| P1-1（P1）resolver 放进 effect 晚于 `setMarkdown` 的同步 dispatch，子目录文档永久破图 | ① `assetResolve.ts` 存模块级 `currentDocPath` + `setAssetDocPath()`，resolver **调用时现读**路径，不再闭包捕获；② `loadIntoEditor` **第一行**（早于 `:2029` 的 `setMarkdown`）写路径；③ 失败不缓存 null、同 src 在飞去重、代际（epoch）判断、订阅者回填 `img.src`；④ E2E 种子加 `sub/图.md` + `sub/assets/b.png`（**revision=3 已更名为 `sub/子图.md`**，见上表 R2-1），顺序改成「根 → 子 → 回根」 | §2 T1（改动文件/步骤/验收）、§5、§9 | `App.tsx:2005`（`loadIntoEditor`）、`:2029`（`setMarkdown`）、`:2050`（`setActiveFile`）、`:972-991`（`setMarkdown` 内同步 `dispatch`）、`:2145`（deps **没有** `workspace`，所以路径必须读 `workspaceRef.current`）；`.tmp/r30-fsa.mjs:6` 的 `dirs` 已含 `sub`，`:12-19` 的 `dirHasChild` 按**文件键前缀**认 `sub/assets` |
| P1-2（P1）`git grep "Image.configure"` → 0 永远红 | 两处都改成 `git grep -nE "[^A-Za-z]Image\.configure"` → 0（`ResolvingImage` 的 `Image` 前是字母 `g`，不命中），并加 `ResolvingImage.configure` → 1；写明「不要为此给 `ResolvingImage` 改名」 | §2 T1 验收、§5 对照表 | 改前实跑 `git grep -nE "[^A-Za-z]Image\.configure" -- src/App.tsx` = **1**（`:767`）；`git grep -n "ResolvingImage" -- src/` 改前 0 |
| P2-1（P2）测试条数要变，却漏了三处「23 文件 301 条」 | A2 追加 `README.md:119`、`AGENTS.md:39`、`AGENTS.md:72`；两处长行只改结尾数字，不重排 | §3 A2、§5 对照表 | `git grep -c "301 条" -- README.md AGENTS.md` = README 1 + AGENTS 2；`23 个文件` 同为 3 处 |
| P2-2（P2）`docs/typora-gap.md` 改完会自相矛盾 | 补 `:58` 子标题计数（`2`→`1`）；`:88-91` 下一批重排成 3 条（不留两条「行内 HTML」）；已有表插一行、删 `:63` 那一行 | §2 T1 改动文件（差距表那行）、§5 对照表 | `docs/typora-gap.md:7` `已经有的（28）`、`:40` `缺的（12）`、`:58` `文件与工作区（2）`、`:63` 待移走的行、`:88-91` 4 条（`:89` 已是行内 HTML） |
| P2-3（P2）T3 没有顶层围栏的端到端回归 | E2E 加第三篇 `顶层.md` 与 `## top-level`（`previewCount:1`、`isReady:true`、`svgCount:1`、`pre.textContent` 逐字不变） | §2 T3 步骤与验收 | `listMermaidBlocks` 是 `mermaidPreview.ts:85` 的唯一数据源，改成 `descendants` 对顶层同样生效 |
| P2-4（P2）「插入图片后立刻显示」无覆盖，假盘还会写坏 PNG | 采用便宜版：§9 加一行 UNVERIFIED，T1 验收写明本轮不验插入后立即显示 | §2 T1 验收、§9 | `.tmp/r30-fsa.mjs:34-37`：`chunk instanceof Blob` → `await chunk.text()`，二进制必然写坏 |

## 0. 口径与环境

| 项 | 本轮值 | 依据 |
| :--- | :--- | :--- |
| 首屏 gzip 内部 / 硬线 | **310,000 / 320,000 B** | `scripts/measure-first-screen.mjs:19-20`、`README.md:100`、`common.md:6` |
| 本轮首屏实测 | **288,411 B**（距硬线余 31,589 B） | 第 38 轮 `findings-ship.md:15-24` 复测；`STATE.md:52` |
| 安装包预算 | **口径冲突，见 §0.1**：政策 50,000,000 / 45,000,000 B，仓库脚本仍 1,800,000 / 2,000,000 B | `common.md:5` vs `common.md:36`、`README.md:100`、`packaging/*.ps1` |
| 测试基线 | 23 个文件 **301 条** | `npm test`（第 38 轮 `findings-ship.md:126` 复测） |
| 版本 | **不 bump** `package.json`（0.32.1） | 本轮全部是 patch 级，未发版区间还在累积 |
| CHANGELOG | 写进 `## Unreleased`（现标题「第 29–37 轮」，加「第 38 轮」小节并把标题改成「29–38」） | `docs/CHANGELOG.md:5` |

**作废的数字，别按它判 FAIL**：`286,000 B` 已于第 35 轮作废（`README.md:100`）。`.tmp/iteration/roles/planner.md:24` 仍写「首屏 gzip ≤286,000 B 是硬门」——与第 37 轮同一条**角色文件过期**，不在仓库里；本轮验收、critic、tester 一律用 310,000 / 320,000。

环境（必须遵守）：

- dev server 在 `http://localhost:5175`，**不另起、不重启**；`5173` 禁用。
- 浏览器**只用 CDP 9222**；不启动 Edge/Chrome、不 kill `msedge`、不 `browser.close()`。每条 E2E 前先 `node .tmp/reset.mjs 9222`。
- 构建纪律：实施期**不跑** `npm run build` / `npm run verify`（并发写 `dist/` 会互相清空）；类型检查用 `npx tsc --noEmit`；`npm test` 随时可跑；首屏字节由根代理在最终 `npm run verify` 串行量。
- 不 push、不改 `release/`、不改 `package.json` 版本、不新增依赖。

### 0.1 必须先讲清的一处口径冲突：安装包预算是 50,000,000 B 还是 2,000,000 B

- `.tmp/iteration/common.md:5`（2026-11-17 产品负责人）：「安装包硬线放宽到 **50,000,000 B**（内部预算 **45,000,000 B**）」；`.tmp/iteration/roles/finder-ship.md:10` 同口径。
- 仓库里没有任何一处跟上：`README.md:100`、`AGENTS.md`（§6）、`packaging/installer.ps1:89-90,117`、`packaging/portable.ps1:16`、`packaging/verify-installer.ps1:47`、`docs/adr/0017-mermaid-lazy-loading.md:92` 全部还是 1,800,000 / 2,000,000 B（`git grep -nE "50000000|45000000"` 在仓库内 **0 命中**，改前对照见本条）。
- 影响本轮判断：**`findings-ship.md` 的 S1（P1，「便携 zip 已吃掉硬线 81%」）是按已作废的旧硬线算的**。按新线，zip 实测 1,621,142 B 只占 50,000,000 的 3.2%；S1 建议的「给 zip 补 1,800,000 B 内部线」会把一条旧线固化进脚本，**本轮不做**。
- 需要人决定的事（不占本轮代码）：把新线同步进上面 5 个文件与 3 处文档，或者撤回 `common.md:5` 这行政策。**本轮不改**——它属于「政策落地」，不是缺陷修复，且改阈值会降低护栏敏感度，得由根代理/产品负责人拍。§7 第 9 条留了入口。
- 本轮一切体积判断只按**首屏 310,000 / 320,000 B** 与「同功能取最小实现」；不改任何预算常量。

## 1. 取舍：为什么是这 3 件

排序依据（`roles/planner.md`）：数据安全 > 用户可见收益 > 安装/体积/性能 > 内部质量；总量按一个执行代理 35 分钟内完成来排；本轮的判断线再加一条产品原则——**「写了有、用起来坏」优先于「加新功能」**（`findings-typora.md` §13 自己也是这么排的）。

| 候选 | 来源 | 决定 | 理由 |
| :--- | :--- | :--- | :--- |
| 工作区相对路径图片显示（插入即破图） | typora 第 1 条 P1、`typora-gap.md:63`、STATE ③ | **做（T1）** | 本报告**推翻了旧的成本估计**：`typora-gap.md:63` 写「修复要宿主 `/__asset` 路由」，实测浏览器层已有全部材料（`workspace.rootHandle` + `parentDirectory` + `createObjectURL`），不必等宿主轮。差距表记它已被第 32/33/34 轮连续记录、本轮第 4 次复查仍破图，而且每次插图片都会遇到，收益最大 |
| 智能标点把 `\| --- \| --- \|` 改成 `\| —- \| —- \|` | bug 第 2 条 P2 | **做（T2）** | 属输入保真（数据类）：用户手写的 GFM 分隔行被静默改写并随保存落盘，文件里留下坏写法。改动 1 个纯函数 + 3 条单测 |
| Mermaid 列表项/引用块里的围栏永不渲染 | round-37 bug 第 1 条 P2、STATE ① | **做 T3 的 a 半（T3）** | 2 行改动 + 单测 + 一条 E2E。「写了有、用起来坏」。**b 半（SVG id 按实例唯一）本轮不做**，理由见 §7 第 1 条：它需要 `<style>` 作用域与 computed style 断言，是独立一整块（round-37 `impl.md:172` 已写明不许拆半做） |
| 表格列宽拖拽撤不到、切视图复位 | bug 第 1 条 P2 | 不做（方案 B 一行文档 → §7 第 3 条） | 方案 A（拖拽结束写 `colwidth` 进文档模型）会让 `dirty` 变 true 并可能改变保存字节，是数据安全风险；本轮已有 T1 这种大改，不并线 |
| 表格 `colwidth` 进 HTML 导出 | typora 第 10 条 P2、STATE ②、round-37 `impl.md:170` 交接 | **推迟**（§7 第 2 条） | 脏属性是 `<th colwidth="…">`，HTML5 已废弃该属性、浏览器忽略，**用户看不见**；要 E2E 断言才能验，8–10 分钟，排在 T1/T2/T3 之后 |
| F11 全屏 | typora 第 2 条 P1、`typora-gap.md:55` | 推迟（§7 第 4 条） | 属「加新功能」，按上面那条原则排在三个「用起来坏」之后；且浏览器里 F11 可能先被 Chromium 吃掉，要额外交互兜底 |
| Ctrl+滚轮字号 / 大纲全部折叠 / 粘贴为纯文本 | typora 第 4/5/7 条 P2 | 推迟（§7 第 5/6/8 条） | 都是新功能，合计约 1.5 KB，可合成下一轮「写作手势」 |
| 行内 HTML 白名单渲染 | typora 第 3 条 P1 | 推迟（§7 第 6 条） | 要新节点 + 白名单 + 会碰 `npm run roundtrip`（`01-obsidian-note.md` 含 `<kbd>`），必须单独一轮 |
| 便携 zip 内部预算线 / verify-portable 无门禁 / README 下载节 / 版本滞后 / chunk 字节 | ship S1–S4 | 不做（§7 第 9 条） | S1 的前提是旧硬线（§0.1）；S2/S3/S4 是 0 B 文档与脚本，属第 3、4 档，本轮 3 个缺陷修完后若还有 ≥5 分钟，由执行代理顺手做 §7 第 9 条的 S2（2 行）与 S4 的 `README.md:102`（1 行） |
| `docs/typora-features.md` 8 处过期 | typora 第 11 条 | 推迟（§7 第 10 条） | 0 B 但纯文档，且是 16 轮的研究报告；本轮 README/差距表已要改（T1），不并成第二个文档任务 |

## 2. 任务

### T1（P1，用户可见最大收益）：工作区相对路径图片能显示（编辑视图 + 预览面板）

**为什么**：有文件夹句柄时，插入图片会把文件写进 `assets/` 并把 `assets/xxx.png` 写进正文（`src/lib/asset.ts:42-52`、`src/App.tsx:3961-3966`），但编辑器直接用这个相对路径当 `src`（`:3965`），浏览器把它当站内路径 → dev server 的 SPA 回退返回 `200 text/html` → 破图且**连 404 都没有**（`findings-typora.md:30`）。同一篇里 data URL 正常，说明不是渲染管线问题。用户以为图片没存进去。`typora-gap.md:63` 说「修复要宿主 `/__asset` 路由」，实测成本被高估：`workspace.rootHandle` 与 `parentDirectory()`（`src/lib/workspace.ts:138-156`）已经能把文档目录解析成 `FileSystemDirectoryHandle`，`getFileHandle` → `getFile()` → `URL.createObjectURL` 就能拿到能显示的 blob URL。**硬约束：正文节点与 `.md` 字节一律保持 `assets/xxx.png`**，不许为了显示去改文档（否则保存改写正文、`npm run roundtrip` 会挂）。

**根因补充（revision=2，plan-review P1-1）**：解析器不能只靠 React effect 注册。`loadIntoEditor` 先同步 `setMarkdown`（`:2029`，内部立刻 `dispatch` 建 NodeView），之后才 `setActiveFile`（`:2050`），effect 最后才跑；于是 NodeView 建 DOM 时用的是「上一篇文档」的目录。同目录时旧路径恰好正确（这正是第一版 E2E 全用根目录种子也能绿的原因），换目录（先开根目录文档再开 `sub/子图.md`，或选完文件夹直接开 `sub/子图.md`）就查错目录返回 null，NodeView 永久停在 `src="assets/…"` 破图；预热晚到的 blob URL 也救不回来——PM 对未变更节点不调 `update()`（`node_modules/prosemirror-view/dist/index.js:5650` 先判 `matchesNode`，`:5671` 只在 `updateDoc` 为真时走 `docView.update`）。所以修法把「当前文档路径」提到模块级、在 `loadIntoEditor` 第一行写入，并给 NodeView 加订阅回填（见改动文件的 `:2007` 与 `assetImage.ts` 两行）。

**根因补充 2（revision=3，plan-review R2-3，机制已更正）**：预览面板不能靠 App 侧传版本号。plan-review 写「源码模式点预览时 `applySource()` 会同步建 NodeView 并开始异步解析」——**这一句不成立**，但结论更糟：源码模式下 `<EditorContent>` 已经卸载，Tiptap 的 `unmount()` 把内部 `editorView` 置 null（`node_modules/@tiptap/core/dist/index.js:6697`），`editor.view` 退化成 **Proxy**（`:6784`），`dispatch` 只把新 state 写回 `editorState`，**既不建 NodeView 也不触发任何解析**。于是源码 → 预览（`switchView('preview')` → `applySource()` → `setMarkdown` 打到 Proxy 上，`App.tsx:3766-3786`、`:3792-3821`）之后缓存**永远是空的**，而 `PreviewPane` 的 `useMemo` 只依赖 `[bodyHtml, frontmatter, footnotes, hasMath, ready]`（`PreviewPane.tsx:36-39`），没有任何东西会再触发它 → 预览里永久破图，直到切回编辑视图为止。`editor.getHTML()` 只读 `this.state.doc`（`@tiptap/core` 的 `getHTML()` 实现），所以预览的 html 本身是对的，坏的只有图片。**修法**：`PreviewPane` 自己订阅并自己发起解析（见改动文件那一行），App 侧不传任何 props；这样 `switchView` / `backToRich` / Esc 退出源码每一条路径都自动自愈，不用去追每个 `setMarkdown` 调用者。`## img-preview`（从编辑进预览，缓存已填）**抓不到**这条，必须另有 `## img-preview-from-source`。

**改动文件**

| 文件 | 改什么 |
| :--- | :--- |
| `src/lib/assetResolve.ts`（**新建**，约 78 行） | ① `isRelativeAsset(src)`：`src` 非空且不以 `data:` / `blob:` / `http:` / `https:` / `file:` 开头 → true（纯函数，可单测；`PreviewPane` 也用它决定要不要发起解析）。② 模块级 `currentDocPath`（`setAssetDocPath(path)`：**路径相同就什么都不做**；换路径时 `epoch += 1` 并 revoke 旧缓存）+ `getAssetDocPath()`、`resolver: ((src, docPath) => Promise<string \| null>) \| null`、缓存 `Map<string, string>`、在飞表 `Map<string, Promise<string \| null>>`、订阅者 `Set<(src, url) => void>`、`assetVersion` 计数。③ `resolveAsset(src)`：缓存命中直接回**且不通知订阅者**（否则 `PreviewPane` 的自订阅会自激循环）；在飞表命中回**同一个** promise（同 src 只 `createObjectURL` 一次）；否则调 `resolver(src, currentDocPath)`——**路径在调用时现读，不许闭包捕获**；成功 → 写缓存 + `assetVersion += 1` + 通知订阅者；**失败返回 null 且不写缓存**（文件补上后同会话还能重试）；`await` 回来后 `epoch` 变了就丢弃结果并 revoke 刚造的 URL。④ `getResolvedAsset(src)` 同步读缓存、`subscribeResolved(fn)` 返回退订函数、**`getAssetVersion()` 返回 `assetVersion`（给 `useSyncExternalStore` 当快照）**、`clearAssetCache()` revoke 全部 + `assetVersion += 1` + `epoch += 1`（revoke 用 `try/catch` 包住：单测在 Node 里没有真 blob）。**这个文件不 import tiptap**，单测在 Node 里跑得起来 |
| `src/lib/assetImage.ts`（**新建**，约 55 行） | `ResolvingImage = Image.extend({ addNodeView() { … } })`：NodeView 建 `<img>`，先 `src = node.attrs.src`；`isRelativeAsset` 时 `void resolveAsset(src)` 并 `subscribeResolved`（按**当前** src 匹配后替换 `img.src`）——**NodeView 只在创建时解析一次，PM 对未变更节点不调 `update()`，缓存晚到只能靠订阅回填**。`update(updated)` 里属性变了重设 src/alt/title/width/height 并重解析；`destroy` 里**只退订，不 revoke**（缓存归模块管，否则切预览时编辑器卸载会 revoke 掉预览要用的 URL）。返回 `{ dom, ignoreMutation: () => true }`（叶节点无 contentDOM） |
| `src/App.tsx:11,767` | `import { Image }` 换成 `import { ResolvingImage } from './lib/assetImage.ts'` + `import { setAssetResolver, setAssetDocPath, clearAssetCache, resolveAsset } from './lib/assetResolve.ts'`（`getResolvedAsset`/`subscribeResolved` 由 `PreviewPane` 自己 import，App 不需要）；`:767` `Image.configure({ allowBase64: true })` → `ResolvingImage.configure({ allowBase64: true })`（**不动**公式、表格、StarterKit 等其它扩展） |
| `src/App.tsx`（两个新 effect，放在 `insertImageFile` 附近，**声明顺序不能反**） | **A（注册 resolver）**依赖 `[workspace, editor]`：`setAssetResolver(async (src, docPath) => { const space = workspaceRef.current; if (!space?.rootHandle) return null; if (!docPath \|\| !docPath.startsWith(space.name + '/')) return null; const dir = await parentDirectory(space, docPath); if (!dir) return null; const clean = src.startsWith('./') ? src.slice(2) : src; const parts = clean.split('/').filter(Boolean); if (!parts.length) return null; let target = dir; for (const seg of parts.slice(0, -1)) target = await target.getDirectoryHandle(seg); const fh = await target.getFileHandle(parts[parts.length - 1]); return URL.createObjectURL(await fh.getFile()) })`，整段包 `try/catch` 返回 null。**第二行那句前缀校验就是 R2-2 的修法**：宿主 `''` 与单文件打开的裸名 `图.md` 都落在这里，绝不按工作区根去解析。cleanup 里 `setAssetResolver(null)` + `clearAssetCache()`（工作区换了就把旧目录的 blob 全 revoke，B 随后按新 resolver 重新预热）。**B（预热，不再带版本号）**依赖 `[workspace, activeFile?.path, docName, editor]`：**第一行** `if (hostModeRef.current) { setAssetDocPath(''); return }`（R2-2：宿主重开时 `:1244-1268` 会 `setWorkspace` + `setActiveFile`，中间还有一个 `await parentDirectory`（`:1262`）会让 React 先跑一轮 effect；`applyHostPayload` 在 `:1341` 才执行、内部 `setDocName` 又会改 deps——不拦守卫，effect B 就会把 `applyHostPayload` 设的 `''` 覆盖成工作区路径）；然后 `setAssetDocPath(activeFile?.path ?? (workspace ? workspace.name + '/' + docName : ''))`（幂等，`:2007` 已设过同一路径就不再 revoke），再遍历 `editor.state.doc.descendants` 收集 `image` 节点的 `attrs.src`，`void Promise.all(srcs.map(resolveAsset))`——**不 setState**（R2-3：预览已改成自订阅，这里再推一个 tick 就是多余的重渲染；源码模式下 `editor.state.doc` 照样能读，预热无害）。作用：resolver 晚注册（会话恢复）或缓存被清后，订阅者仍能把 `img.src` 换回 blob |
| `src/App.tsx:2007`（**新增一行，P1-1 的根因修法**） | `loadIntoEditor` 的**第一行**（早于 `:2029` 的 `setMarkdown`）：`setAssetDocPath(file?.path ?? (workspaceRef.current ? workspaceRef.current.name + '/' + name : ''))`。**必须读 `workspaceRef.current`**：`:2145` 的 deps 没有 `workspace`，`loadIntoEditor` 被 memo 住不重建，读 state 会一直是 `null`，路径就永远为空。`file.path` 形如 `示例文集/sub/子图.md`（`src/lib/workspace.ts:88-99,130-131`），与 `parentDirectory` 的「首段是工作区名」约定一致；单文件打开时这里是裸名 `图.md`，由 resolver 的前缀校验挡掉（R2-2） |
| `src/App.tsx:1025`、`:1108`（**各加一行**） | 宿主文档路径：`applyHostPayload` 第一行、`hostUnavailable` 里 `setMarkdown('')` 之前，调 `setAssetDocPath('')`。宿主只有 `/__doc`、没有目录句柄，不能让上一篇工作区文档的路径漏进来解析 |
| `src/App.tsx:3961-3966` | 写完 asset 后、`setImage` 前 `await resolveAsset(relative)`（1 行，避免插入瞬间闪一下破图；失败不影响插入；此时 `currentDocPath` 已是本篇，解析用对目录） |
| `src/App.tsx:4817-4818` | **不动**（R2-3：不再传 `resolveImage` / `assetsVersion`，预览面板自己订阅；传 tick 反而要求每个 `setMarkdown` 调用者都推一次，`switchView`/`backToRich`/Esc 三条路都要补，必漏） |
| `src/components/PreviewPane.tsx:1,7-11,32-58` | **Props 不动**（R2-3）。① 顶部 `import { getAssetVersion, getResolvedAsset, isRelativeAsset, resolveAsset, subscribeResolved } from '../lib/assetResolve.ts'`；② 组件里加 `const assetVersion = useSyncExternalStore(subscribeResolved, getAssetVersion, () => 0)`（该组件 `:33` 已在用 `useSyncExternalStore` 等 KaTeX，写法现成）；③ 新增一个 `useEffect`（依赖 `[bodyHtml, assetVersion]`）：`new DOMParser()` 扫 `img[src]`，`isRelativeAsset(src) && !getResolvedAsset(src)` 时 `void resolveAsset(src)`——源码→预览时缓存是空的，**这一句是唯一发起解析的地方**，缓存命中不通知，所以不会自激；④ `renderMath`（`:14-26`）里同一个 `DOMParser` 流程后再遍历 `doc.querySelectorAll('img[src]')`，`const next = getResolvedAsset(src)`，有就 `img.setAttribute('src', next)`；⑤ `assetVersion` 进 `useMemo` 依赖（`:39`）。`hasMath && !ready` 直接返回 `''` 那条（`:37`、`:41-47`）**不动** |
| `docs/typora-gap.md:7`、`:40`、`:58`、`:63`、`:88-91` | ① `:7` `已经有的（28）` → `（29）`；② `:40` `缺的（12）` → `（11）`；③ 已有表在 `:36`（新建、重命名、删除文件）那一行之后插一行 2 列：`\| 工作区相对路径图片显示 \| 有；打开文件夹后，编辑视图与预览面板按目录句柄读出来显示，Markdown 里仍是 assets/…；单文件打开（无目录句柄）与 HTML 导出仍显示不了 \|`；④ 删掉 `:63` 那一行（已搬去已有表）；⑤ `:58` `### 文件与工作区（2）` → `（1）`（不改这里，六段相加是 3+3+2+1+1+2=12，与新的「缺的（11）」对不上）；⑥ `:88-91` **只重排这 4 行**成 3 条：1 行内 HTML 渲染 / 2 主题与自定义快捷键 / 3 全局搜索与视图缩放（**R2-5：`:84` 的 `## 建议的下一批` 标题与 `:86` 的引导句不动**；照原计划「第 1 条换成行内 HTML」会与 `:89` 撞成两条） |
| `README.md:46`、`:76`、`:78`、`:82`、`:119` | `:46` 能力句补「打开文件夹时相对路径图片在编辑视图与预览面板里正常显示，Markdown 里仍是 assets/…」；`:76` 限制句改成「图片在没打开文件夹时只能内联；单文件打开（无目录句柄）时相对路径图片仍显示不了」；`:78` 末尾补 T2 那一句（B 给原文，A 落笔）；`:82` 计数改 **29 / 11**；`:119` `npm test # 23 个文件、301 条断言` → `# 24 个文件、NNN 条断言`（NNN 取实际 `npm test` 输出，预期 311；**只改这一行**） |
| `AGENTS.md:39`、`:72`、`:74` | `:39`（§3 门禁块）「第 36 轮记 23 个文件、301 条」→「第 38 轮记 24 个文件 NNN 条」；`:72`（§6 长段）结尾「测试 23 个文件 301 条」→「测试 24 个文件 NNN 条」；`:74`（§6 末句）「当前 28 项有、12 项缺」→「当前 29 项有、11 项缺」。**这三行都是长行，只改这几个数字/词，不许重排** |
| `.tmp/r30-fsa.mjs:21-29`（**测试用，不是产品代码**） | `makeFile.getFile()` 支持二进制种子：`state.files` 的值以 `data:` 开头时，按 `data:<mime>;base64,<b64>`（`atob` + `Uint8Array`）解成字节并 `new File([bytes], name, { type: mime })`；否则保持现有文本行为（`text/markdown`）。E2E 才能放真 PNG。**只改 `getFile()`**：`createWritable().write()`（`:34-37`）仍按文本写，所以「插入后立刻显示」不在本轮 E2E（§9） |
| `docs/CHANGELOG.md:5` | `## Unreleased（第 29–37 轮…）` → 「第 29–38 轮」，末尾加「**第 38 轮（同一未发版区间）**」小节，写 T1/T2/T3 三条 + UNVERIFIED |

**实施步骤**

1. 先复现（3 分钟，别跳）：`node .tmp/reset.mjs 9222` → `installFakeWorkspace(page, { '图.md': '# 图\n\n![甲](assets/a.png)\n', 'assets/a.png': IMG, 'sub/子图.md': '# 子图\n\n![乙](assets/b.png)\n', 'sub/assets/b.png': IMG_B, '内联.md': '# 内联\n\n![内联](' + IMG + ')\n', '缺图.md': '# 缺图\n\n![无](assets/none.png)\n', '引用.md': '# 引用\n\n![丙](assets/c.png)\n\n[链接][1]\n\n[1]: https://example.com\n', 'assets/c.png': IMG_B })`（**键不带工作区名前缀**，照 `.tmp/e2e-r37-impl-t1.mjs:17` 的写法；`IMG` 直接用 `.tmp/e2e-r38-typora.mjs:32-33` 那个 1×1 PNG data URL，`IMG_B` 换一张不同字节的，避免缓存误命中；切换对话框用 `.tmp/e2e-r37-impl-t1.mjs:32-45` 的 `dismissSwitch` 兜住）→ `openFolder(page)` → **根文档一律精确点**：`page.locator('.file-tree [role="treeitem"][data-path="示例文集/图.md"]').click()`（**R2-1：禁止 `data-path$="/图.md"`**，`sub` 展开后那个通配第一个命中的是子目录那篇），再点 `[data-path$="/sub"]` 展开（目录名不重尾，通配安全）→ 点 `[data-path$="sub/子图.md"]`。改前 `sub/子图.md` 的 `img.naturalWidth` 应为 0（与 `findings-typora.md:30` 一致；不打网络请求日志也能判，因为 SPA 回退返回 200 HTML，控制台连 404 都没有）。
2. 实现：先写 `assetResolve.ts`（纯函数 + 缓存 + 在飞表 + epoch + 订阅 + `getAssetVersion`，不含 tiptap），再写 `assetImage.ts`（NodeView + 订阅回填）。**先只改编辑视图**：加 `loadIntoEditor` 第一行、两个 effect（含 resolver 的来源校验）、`Image` → `ResolvingImage`。跑步骤 1 的 E2E，要求 `sub/子图.md` 的 `naturalWidth > 0` 且 `src` 以 `blob:` 开头，**再切回根目录 `图.md`（精确选择器）仍是 `naturalWidth > 0`**——两个方向都验，只验一边等于没验 P1-1；每段同时断言 `window.__slState.name` 与 `.ProseMirror h1` 文本（`图` / `子图`），证明真的换了文档（R2-1）。
3. 接预览（R2-3）：`PreviewPane` 自订阅 + 自解析（**不传 props**）。① 从编辑视图按 `Ctrl+Shift+P` 进预览（`App.tsx:3681`、`:4602`），验 `.preview-pane img` 显示（子目录那篇也看一次）；② **源码→预览**：开 `引用.md`（含引用式定义 → 载入即进源码，`App.tsx:2078`），再按 `Ctrl+Shift+P`，断言 `.preview-pane img` 的 `naturalWidth:1`、`src` 以 `blob:` 开头——源码模式下没有 NodeView（`@tiptap/core:6697/6784`），这条只能靠预览自己解析。
4. 数据安全断言（**这条最重要**）：`Ctrl+S` 后 `readFakeFile(page, '图.md')` 里必须是 `assets/a.png`、**0 处 `blob:`**；`sub/子图.md` 同样读一次、同样 0 处 `blob:`；载入后 `window.__slState.dirty === false`（解析图片不许让文档变脏）。
5. 回归（**`## img-single-file` 是 R2-2 的锁，别忘了**）：工作区同开时，用 `.tmp/e2e-r33-bug-a2.mjs:38-47` 的写法 stub `window.showOpenFilePicker`，返回一篇**同名** `图.md`（内容 `# 独立\n\n![甲](assets/a.png)\n`），按 `Ctrl+Alt+O` 打开（若弹「切换文档」对话框，用 `dismissSwitch` 兜住）→ 断言 `.ProseMirror img` 的 `naturalWidth === 0`（**不许**显示工作区那张图）、`__slState.name === '图.md'`、`.ProseMirror h1` 是「独立」、`errors:[]`。另有：data URL 图片（`allowBase64`）仍显示（`内联.md`）；引用了不存在的 `assets/none.png` 时不抛错、不刷控制台错误、以后还能正常编辑（`缺图.md`）；**同 src 两次 `resolveAsset` 只调一次 resolver、缓存命中不通知订阅者**（单测锁，不靠 E2E）。
6. 文档六处（差距表 / README×2 行 / AGENTS 三行 / CHANGELOG），并贴「改前 >0 → 改后 0」的对照：`git grep -nE "28 项有|12 项缺|已有 28 项|缺 12 项" -- README.md AGENTS.md` 改前 2（`README.md:82`、`AGENTS.md:74`）；`git grep -c "301 条" -- README.md AGENTS.md` 改前 3（`README.md:119`、`AGENTS.md:39`、`AGENTS.md:72`）；`Select-String docs/typora-gap.md -Pattern '^## 已经有的（28）','^## 缺的（12）'` 改前 2。
7. 跑 `npx tsc --noEmit`、`npm test`、`npm run roundtrip`；截图。

**验收标准（可执行）**

- 静态：
  - `git grep -n "resolveAsset(" -- src/` → ≥3（`assetResolve.ts` 定义 + 预热 + 插入前预解析）
  - `git grep -n "setAssetDocPath" -- src/` → ≥3（`assetResolve.ts` 定义 + `loadIntoEditor` + 预热 effect + 宿主两处）
  - `git grep -n "ResolvingImage" -- src/` → ≥2（`assetImage.ts` 定义 + `App.tsx` 引用）
  - `git grep -nE "[^A-Za-z]Image\.configure" -- src/App.tsx` → **0**（改前 1，见 §5 对照表；**不要**为了让这条变绿去给 `ResolvingImage` 改名）
  - `git grep -n "ResolvingImage.configure" -- src/App.tsx` → **1**
  - `git grep -n "getResolvedAsset" -- src/` → ≥2（定义 + `PreviewPane`）；`git grep -n "subscribeResolved" -- src/` → ≥3（定义 + `assetImage` + `PreviewPane`）；`git grep -n "getAssetVersion" -- src/` → ≥2（定义 + `PreviewPane`）
  - `git grep -nE "resolveImage|assetsVersion|assetTick" -- src/` → **0**（R2-3：改完这三个词都不该出现）
  - `git grep -nE "startsWith\(space\.name" -- src/` → **1**（resolver 的来源校验，R2-2；改前 0）
  - `git grep -n "hostModeRef.current" -- src/App.tsx` → **13**（改前 12，见 §5 对照表；多出来的是 effect B 第一行的宿主守卫，R2-2）
- E2E `.tmp/e2e-r38-impl-t1.mjs` → `.tmp/e2e-r38-impl.log`，段名与判据（**每段都带文档身份：`name` = `window.__slState.name`，`heading` = `.ProseMirror h1` 文本**）：
  - `## img-root`：开 `示例文集/图.md`（精确选择器）→ `name:'图.md'`、`heading:'图'`、`imgCount:1`、`naturalWidth:1`、`srcBlob:true`、`dirtyAfterLoad:false`（**先开根，再开子目录**，顺序反了测不到 P1-1）
  - `## img-cross-dir`：切到 `sub/子图.md`（先点 `[data-path$="/sub"]` 展开，再点 `[data-path$="sub/子图.md"]`，写成 `page.locator(...)` 严格模式，见 `.tmp/e2e-r29-p2.mjs:74-77`）→ `name:'子图.md'`、`heading:'子图'`、`imgCount:1`、`naturalWidth:1`、`srcBlob:true`、`dirtyAfterLoad:false`（**这条是 P1-1 的硬判据**；`sub/assets/b.png` 必须用与 `a.png` 不同的字节，否则「查错目录也命中缓存」会假绿）
  - `## img-back-root`：切回 `示例文集/图.md`（**精确选择器**，见 R2-1）→ `name:'图.md'`、`heading:'图'`、`naturalWidth:1`、`srcBlob:true`（反向也验；缓存与代际不许把旧 URL 带到下一篇。若点到的是 `sub/子图.md`，`name` 会变，这条就是 R2-1 的锁）
  - `## img-bytes`：`savedHasRelative:true`、`savedHasBlob:false`；`savedEqualsSeed` 是**记录项**——若为假，把 `Ctrl+S` 前后的差异原文贴进 `impl.md`，并确认差异与图片 src 无关（保存门若拦，先记下弹出的差异类别，别用「改用源码模式保存」绕过断言）；`sub/子图.md` 也要读一次（0 处 `blob:`）
  - `## img-single-file`（R2-2）：工作区开着时 `Ctrl+Alt+O` 打开同名独立文件 → `name:'图.md'`、`heading:'独立'`、`naturalWidth:0`、`errors:[]`（**不许**是 1，那就是显示错图）
  - `## img-preview`：从编辑视图按 `Ctrl+Shift+P` 进预览 → `.preview-pane img` 的 `naturalWidth:1`、`srcBlob:true`（`sub/子图.md` 那篇同样看一次）
  - `## img-preview-from-source`（R2-3）：开 `引用.md`（载入即源码）→ `Ctrl+Shift+P` → `.preview-pane img` 的 `naturalWidth:1`、`srcBlob:true`、`heading:'引用'`
  - `## img-inline`：开 `内联.md`，data URL 图 `naturalWidth:1`（回归）
  - `## img-missing`：开 `缺图.md`，`naturalWidth:0` 但 `errors:[]`、随后还能键入（`textAfterType` 含新字）
  - `## errors []`（console error 与 pageerror 都 0）
  - **不在本轮**：`## img-insert`（插入后立刻显示）——假盘把 PNG 当文本写，见 §9「插入图片后立刻显示」那一行。
- 单测：`src/lib/assetResolve.test.ts`（新文件，进 `package.json:15` 的 `test` 脚本）**≥5 条**：① `isRelativeAsset` 正反例（`assets/a.png` true；`data:` / `blob:` / `https:` / `http:` / 空串 false）；② 无 resolver 时 `resolveAsset` 返回 null 且不抛；③ **失败不缓存**（resolver 返回 null 后连调两次，resolver 被调 2 次）；④ **同 src 并发只解析一次**（`Promise.all` 两次 → resolver 被调 1 次）＋ `setAssetDocPath` 换路径后旧在飞结果不写进新缓存（epoch）；⑤ **`getAssetVersion()` 只在解析成功/清缓存时 +1，缓存命中不 +1**（R2-3 的防自激锁：连调两次 `resolveAsset` 后订阅者回调只来 1 次、版本号只 +1）。**`npm test` 23 → 24 个文件、301 → ≥306 条**（以实际输出为准；三任务合计预期 311）。
- `npx tsc --noEmit` exit 0；`npm run roundtrip` rich 5/7、source 7/7（与第 37 轮同，不碰序列化）。
- 体积（记录项）：根代理 `npm run verify` 后 `PASS`、`totalGzip ≤ 310,000`；把实测首屏字节与相对 288,411 的增量写进 `impl.md`（估 raw +3.5～4.5 KB / gzip +1.0～1.4 KB；订阅与代际约 +0.5 KB）。`files=3` 不变、首屏集合无 `mermaid`/`lazy`/`katex`。

**风险与退路**

- **NodeView 破坏图片的选中/拖拽/删除**：Tiptap `Image` 是 `draggable: true` 的块级叶节点（`node_modules/@tiptap/extension-image/dist/index.js:12-30`）。NodeView 只返回 `{ dom, ignoreMutation: () => true }`；若选中/拖拽坏了，退路是**不用 NodeView**，改在 `MermaidPreview` 同型的插件里用 `view.update` 扫 `img[src^="assets/"]` 就地改 DOM（文档不变，只是 DOM 层打补丁）——但这条路要自己处理重绘，写在 `impl.md` 里说明为什么退。
- **NodeView 只在创建时解析一次**：`prosemirror-view/dist/index.js:5650` 先判 `matchesNode`，`:5671` 只在 `updateDoc` 为真时走 `docView.update`；所以「缓存晚到」必须靠 `subscribeResolved` 回填，**不要**指望补一个空 transaction。回填后仍破图，先 dump `img.src`、`getResolvedAsset(src)` 与 `epoch` 三样再判。
- **在飞 promise 写回旧缓存（代际）**：`clearAssetCache()` 与 `setAssetDocPath` 换路径都会 `epoch += 1`；`await` 回来先比 epoch，不同就 revoke 并丢弃。别用「清 Map」当同步屏障——旧 URL 仍可能在被 `await` 的那一段写回。
- **失败不缓存**：`resolveAsset` 返回 null 时不写 Map、不通知订阅者，文件补上后同一会话还能重试；`## img-missing` 就是这条的回归。
- **blob URL 泄漏 / 切文档后旧 URL 失效**：缓存归模块管，文档切换与工作区切换时 revoke 再重建；**不要**在 NodeView 的 `destroy` 里 revoke（切预览时编辑器会卸载，revoke 早了预览就破图——这是本任务最容易踩的坑）。
- **`getHTML()` 与导出**：NodeView 不进 `getHTML()`，导出仍是相对路径（正确，别顺手改成 blob）。预览面板的重写只作用于 `PreviewPane` 内部的 `DOMParser` 副本，**不改** `editor.getHTML()` 的返回值；`PreviewPane` 的 `renderMath` 逻辑不要重排。
- **保存字节被改写**：万一 `## img-bytes` 出现 `blob:` 或 `savedEqualsSeed` 为假，立即回退「预热时不再 `setImage` 相关属性」并查是不是有人把 blob 写进了 node attrs（只允许写 DOM）。
- **单文件打开后图显示不了是「有意」的**（R2-2）：`## img-single-file` 要求 `naturalWidth === 0`。别为了让这张图亮起来去放宽 resolver 的前缀校验——那正是「显示别的目录里的图」这个缺陷本身。要支持它得先有「独立文件所在的真实目录」，属宿主轮（§9）。
- **`PreviewPane` 的解析 effect 依赖别写错**（R2-3）：必须 `[bodyHtml, assetVersion]`。只依赖 `assetVersion` 会漏掉换文档（同一张缓存图不复位），只依赖 `bodyHtml` 会在「缓存被清后」停在破图。也不要在渲染体里直接 `resolveAsset`（React 严格模式会渲染两次，虽然 in-flight 去重兜住了，但没必要）。
- **两个 `useSyncExternalStore` 并存**：`PreviewPane` 已有 KaTeX 那个（`:33`），新加的资产版本号是第二个；`hasMath && !ready` 提前返回 `''` 的分支（`:37`、`:41-47`）别动，否则公式预览会闪。
- **真实文件夹句柄**（本机 CDP 全是假 FSA、权限恒 granted）：只能记 UNVERIFIED，见 §9。

**截图**：`shots/round-38/impl-image-workspace.png`（编辑视图里图片真的显示出来）、`impl-image-subdir.png`（`sub/子图.md` 换目录后仍显示，P1-1 的视觉证据）、`impl-image-preview.png`（预览面板同样显示）、`impl-image-preview-source.png`（源码模式进预览，图也显示——R2-3 的视觉证据）。

### T2（数据保真）：智能标点不改写含 `|` 的行，保住手打的表格分隔行

**为什么**：`src/lib/smartTyping.ts:57` 只看光标前一个字符，`--` 一律换 `—`；于是正文里手打 GFM 表格分隔行 `| --- | --- |` 会变成 `| —- | —- |`，屏幕和存盘都是坏写法，表格永远不成立，且没有任何提示（`findings-bug.md` 第 2 条，两次独立复现，`.tmp/e2e-r38-bug.log` 的 `## probe-pipe` 与 `.tmp/e2e-r38-bug2.log` 的 `## typed-table`）。单独一行 `---` 出分隔线是正常的（`## probe-dash3` 的 `hrCount:1`），说明缺陷只在「这一行还有别的字符（尤其 `|`）」时暴露。

**改动文件**

| 文件 | 改什么 |
| :--- | :--- |
| `src/lib/smartTyping.ts:33` | 签名加第 4 个可选参数 `lineBefore = ''`（光标所在文本块里、光标之前的全文；由插件传，单测直接传） |
| `src/lib/smartTyping.ts:56-57` | 在 `-- → —` 规则**之前**加：`if (inserted === '-' && lineBefore.includes('\|')) return null`（本表里的 `\|` 是表格转义，代码里写竖线本身）。返回 `null`（不是 `false`）才符合本函数契约，也才会让后面的横向分隔线输入规则收到这次输入 |
| `src/lib/smartTyping.ts:100-103` | 插件侧：`const lineBefore = inserted === '-' ? parent.textBetween(0, offset, null, '\ufffc') : ''`（**只在按下 `-` 时算**，避免每个键都做一次 O(段落长度) 的字符串拼接），作为第 4 参传给 `smartInput` |
| `src/lib/smartTyping.test.ts` | 新增 3 条 `test()`（见验收），现有 **8** 条不动（该文件实际是 8 条；原计划写「9 条」是笔误，plan-review §一 已复核） |
| `README.md:78` | 「智能标点的已知限制」那条末尾补一句：「含 `\|` 的行不把 `--` 换成 `—`（保住手打的表格分隔行）」（本表里的 `\|` 是表格转义，README 里写竖线本身）。只补这一句，别重排整行 |

**实施步骤**

1. 先复现（2 分钟）：`node .tmp/reset.mjs 9222` → 正文末尾 `Enter` → 打 `| 甲 | 乙 |`、`Enter`、`| --- | --- |` → 读段落文本（应变出 `| —- | —- |`）。
2. 改 `smartInput` + 插件；单测里写死三个场景：表格行不转换、普通行照旧、空行 `---` 仍交给 HorizontalRule。
3. E2E：同一段操作重跑，断言段落文本含 `| --- | --- |`、`—-` 出现 0 次；再另起一段打 `---`，断言 `.ProseMirror hr` 数量 = 1（证明 HR 没被连累）。
4. 跑 `npx tsc --noEmit` / `npm test`，截图。

**验收标准（可执行）**

- 单测 3 条（`npm test` 里可见）：
  - `smartInput('| --', '-', ' ', '| --')` → `null`（第 4 参是 `lineBefore`＝光标前整行，含 `|`）
  - `smartInput('-', '-', '', '')` → 仍 `{ kind: 'replace', from: -1, to: 0, text: '—' }`（回归，不能为修表格行把破折号功能关掉）
  - `smartInput('—', '-', '', '---')` → `null`（第三根 dash 的 `before` 末尾已是 `—`，本来就不命中；照 `smartTyping.test.ts:37` 的写法，锁住「不连吞」——别写成 `before=''` 那种怎么都返回 null 的空断言）
- E2E `.tmp/e2e-r38-impl-t2.mjs` → `## typed-table`：`textHasSeparator:true`、`emDashCount:0`、`tableRows:0`（不解析成表格是已知边界，本条只锁输入不被改写）；`## hr`：`hrCount:1`；`## errors []`。
- `npx tsc --noEmit` exit 0；`npm test` 24 个文件、≥309 条（301 + T1 的 5 + 本任务 3，T3 的 2 条未到时；以实际输出为准）。
- 体积（记录项）：`totalGzip ≤ 310,000`；估 raw +0.2 KB / gzip +0.1 KB。

**风险与退路**

- 规则放宽过头：`lineBefore.includes('|')` 会让「正文里带竖线的行」都不能出破折号。这是有意的取舍（数据保真优先），写进 README `:78`；**不要**改成只匹配「行首 `|`」——GFM 表格允许省略首尾竖线（`--- | ---` 也合法），漏掉就白修。
- 与 HR 输入规则的先后：本函数在 `handleTextInput` 里返回 `true` 会截断后续 prop（AGENTS §8「智能标点会改键盘输入本身」那条踩过）。本任务的所有新分支**必须返回 `null`**，让 `HorizontalRule` 的规则能收到输入；E2E 的 `## hr` 就是这条的锁。
- 真实中文 IME 下同一行会被怎么改写，本轮测不了（§9）。

**截图**：`shots/round-38/impl-table-separator.png`（正文里 `| --- | --- |` 原样保留，下面另有一根真分隔线）。

### T3（P2，上轮顺延的 a 半）：列表项与引用块里的 mermaid 围栏也要渲染

**为什么**：`src/lib/mermaidLazy.ts:109-117` 用 `doc.forEach`，只收集顶层子节点；列表项/引用块里的 `codeBlock` 是嵌套节点，于是「节点是 mermaid 语言、能编辑，但永不挂预览」，也没有任何提示（round-37 `findings-bug.md` 第 1 条，`## M4-list` 的 `previewCount:0`、`## m-quote` 的 `blockquotePreview:0`）。第 37 轮因单代理降级整体顺延，本轮只做这一半（b 半 SVG id 见 §7 第 1 条，规格原样保留）。

**改动文件**

| 文件 | 改什么 |
| :--- | :--- |
| `src/lib/mermaidLazy.ts:109-117` | `doc.forEach` → `doc.descendants((node, pos) => {…})`：命中 `codeBlock` + `isMermaidLanguage` 时用回调给的 `pos` 推 `{ pos, nodeSize, code, hash }`，返回 `false`（代码块没有子节点，不必下钻），否则 `true`。widget 位置仍是 `pos + nodeSize`（`mermaidPreview.ts:90` 不动） |
| `src/lib/mermaidLazy.test.ts:88-109` 之后 | 新增 2 条 `test()`：列表项内围栏被收集（`bulletList > listItem > codeBlock`，`StarterKit` 的 schema 直接能建）、引用块内围栏被收集且 `pos` 单调递增、顶层行为不变 |
| `docs/adr/0017-mermaid-lazy-loading.md:106-111` | 「已知限制」清单补一行：「列表项与引用块里的围栏同样渲染（第 38 轮）；已知限制只剩顶层与嵌套的一致性靠同一条 `listMermaidBlocks`」。`：110`（两段相同代码各渲染一次）**本轮不动**——那是 b 半的事 |

**实施步骤**

1. `node .tmp/reset.mjs 9222` → 假工作区放三篇（照 round-37 复现用的写法）：`列表图.md`（`- 一项` / 空行 / **两个空格缩进**的 ```mermaid 围栏 / 空行 / `尾段。`）、`引用图.md`（`> ```mermaid` / `> graph TD` / `>   Q --> R` / `> ``` `）、`顶层.md`（**无缩进**的 ```mermaid / `graph TD` / `  A --> B` / ```，P2-3 要求的顶层回归）。
2. 改 `listMermaidBlocks`；E2E 打开三篇，等 `.mermaid-preview.is-ready`（首次要下载 mermaid，给足 `waitForFunction` 超时）。
3. 断言三篇各自的 `previewCount`、`isReady`、`svg`；同时确认代码块原文逐字不变（widget 是装饰，`pre code` 文本不变）。
4. 跑单测、`npx tsc --noEmit`、`npm run roundtrip`（不碰序列化，但要复验）；截图。

**验收标准（可执行）**

- 静态：`git grep -n "descendants" -- src/lib/mermaidLazy.ts` → **1 命中**（改前 0，见 §5 对照表）；`git grep -n "doc.forEach" -- src/lib/mermaidLazy.ts` → 0。
- 单测：`listMermaidBlocks` 对嵌套 doc 返回 2 块、`blocks[0].pos < blocks[1].pos`、顶层用例（现有那条）仍绿。
- E2E `.tmp/e2e-r38-impl-t3.mjs`：`## nested-list` `previewCount:1`、`isReady:true`、`svgCount:1`；`## nested-quote` 同；`## top-level`（顶层围栏，P2-3）`previewCount:1`、`isReady:true`、`svgCount:1`；`## code-intact` 三篇的 `pre.textContent` 与种子代码逐字一致；`## errors []`。
- `npx tsc --noEmit` exit 0；`npm test` ≥311 条；`npm run roundtrip` rich 5/7、source 7/7。
- 体积（记录项）：`totalGzip ≤ 310,000`；估 +0 B（同一函数换写法）。

**风险与退路**

- 嵌套 widget 被 ProseMirror 拒绝或报错：退路是「顶层照旧渲染；嵌套块加 `.is-mermaid` 弱标记 + ADR 记已知限制」，并在 `impl.md` 明写降级——**不许**悄悄只改一半再写「已修」。
- `descendants` 的 `pos` 是文档绝对位置（不是相对父节点），`Decoration.node(pos, pos + nodeSize)` 与 widget 的 `pos + nodeSize` 都成立；若预览挂到错误位置，先打印 `pos` 与 `node.nodeSize` 对照 `doc.resolve(pos)` 的父节点。
- dev server 下首次加载 mermaid 会触发 Vite 依赖重优化 + 整页 reload（ADR-0017 已知，dev-only）：E2E 里第一次等图超时要先分清是 reload 还是缺陷。

**截图**：`shots/round-38/impl-mermaid-nested.png`（列表项与引用块里的两张图都画出来）。

## 3. 文件归属与执行顺序

| 阶段 | 谁 | 文件 | 备注 |
| :--- | :--- | :--- | :--- |
| A1 | builder A | `src/lib/assetResolve.ts`（新）、`src/lib/assetResolve.test.ts`（新）、`src/lib/assetImage.ts`（新）、`src/App.tsx`、`src/components/PreviewPane.tsx`、`package.json`（只加 test 脚本里那一行） | T1 主实现；先复现再改 |
| A2 | builder A | `docs/typora-gap.md`、`README.md:46/76/78/82/119`、`AGENTS.md:39/72/74`、`docs/CHANGELOG.md:5` | **所有文档只由 A 改**（B 把要加的句子原文交给 A），避免两人抢文件；`README.md:119`、`AGENTS.md:39`、`AGENTS.md:72`、`AGENTS.md:74` 全是长行，只改数字与计数词，不许重排 |
| A3 | builder A | `.tmp/r30-fsa.mjs`（二进制种子，T1 必需，B 也要用）、`.tmp/e2e-r38-impl-t1.mjs` | 测试资产，不进产品 |
| B1 | builder B | `src/lib/smartTyping.ts`、`src/lib/smartTyping.test.ts` | T2 |
| B2 | builder B | `src/lib/mermaidLazy.ts`、`src/lib/mermaidLazy.test.ts`、`docs/adr/0017-mermaid-lazy-loading.md` | T3 |
| B3 | builder B | `.tmp/e2e-r38-impl-t2.mjs`、`.tmp/e2e-r38-impl-t3.mjs` | 单代理时由那一个代理自己写三份 |

- 两人并行时文件集**互不重叠**（上表已切好）。E2E 必须在 9222 上**串行**（CDP 只有一个鼠标/键盘）：先跑完的一方在 `impl.md` 记「E2E 已完成」，另一方 `node .tmp/reset.mjs 9222` 后再开跑。
- **估时**（按 `roles/planner.md` 的 35 分钟口径核对，**revision=3 重估**）：T1 约 **33–36 分钟**（revision=2 的 30–33 + 3 个种子与 `## img-single-file` / `## img-preview-from-source` 两段约 3 分钟）、T2 约 7 分钟、T3 约 9–10 分钟（多一篇顶层种子），单代理合计 **49–53 分钟，确实超**。因此单代理的执行规则写死为：
  1. 按 **T1 → T2 → T3** 顺序做，T1 是唯一 P1，T1 内部顺序也写死：`## img-root` → `## img-cross-dir` → `## img-back-root` → `## img-bytes` → `## img-single-file` →（`## img-inline` / `## img-missing`）→ 预览两段；前四段没绿之前不许去接预览；
  2. 若 30 分钟时 T1 的**预览两段**（`## img-preview`、`## img-preview-from-source`）还没做绿：把这两段记 UNVERIFIED（§9 已列），`README.md:46` 与 `docs/typora-gap.md` 的现状列**只写「编辑视图里正常显示」**、不写预览面板（不许把没验的写成已修），继续 T2；
  3. `## img-single-file`（R2-2 的锁）排在预览之前、时间不够也**必须**跑：「工作区找不到就返回 null」这条守卫若写错，代价是**显示别的文档的图**，比破图更糟；
  4. **T3 是最先顺延的一项**（第 39 轮第一件事），顺延时不许为「看起来做完了」把 `descendants` 改成别的东西凑数；
  5. 双代理时 A = T1（≤36 分钟，**已贴口径上限**，别再给 A 加活）、B = T2 + T3（≤17 分钟）。
- 收尾（根代理）：`docs/iteration/STATE.md`、`npm run build` / `npm run verify`、commit。

## 4. E2E 通用规则

- 每条脚本开头：`node .tmp/reset.mjs 9222`；连接抄 `scripts/acceptance.mjs` / `.tmp/e2e-r37-impl-t1.mjs`（`chromium.connectOverCDP('http://127.0.0.1:9222')`）。
- 造工作区用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace(page, { files })` + `openFolder(page)`（**files 的键用工作区内相对路径**，如 `'图.md'`、`'assets/a.png'`，不带工作区名前缀；工作区名由 `showDirectoryPicker` 的 stub 给成「示例文集」）；读落盘字节用 `readFakeFile(page, '图.md')`；**不要**再写第二套假盘。
- 选择器（第 37/38 轮实测踩过的，**R2-1 之后写死**）：`data-path` 带工作区名前缀（`示例文集/图.md`）。**文件一律用精确选择器**：`page.locator('.file-tree [role="treeitem"][data-path="示例文集/图.md"]').click()`；**禁止** `[data-path$="/图.md"]`——`sub` 展开后 `示例文集/sub/子图.md` 与 `示例文集/图.md` 同尾，`page.click()` 是非严格 API 会静默点第一个（DOM 顺序 `workspace.ts:109` + `FileTree.tsx:42-51` 决定，子目录行在前），换成 `page.locator()` 则直接抛 strict mode violation。目录仍可用通配（`[data-path$="/sub"]` 不与 `assets` 同尾）。文件树行内「⋯」是 treeitem 的**兄弟**，用 `.tree-row:has([data-path="示例文集/图.md"]) .tree-row-more`；新建文档实际名可能是 `未命名 2.md`。
- 子目录文档要先展开目录再点文件（P1-1 的 E2E 必需）：点 `[data-path$="/sub"]` 展开（`FileTree.tsx:185`），再点 `[data-path$="sub/子图.md"]`，写法见 `.tmp/e2e-r29-p2.mjs:74-77`。未展开时那一行不在 DOM 里，直接点会超时。
- **段 ↔ 文档对应表**（R2-4，照这张表开文档，别自己现编）：`## img-root` / `## img-back-root` → `图.md`；`## img-cross-dir` → `sub/子图.md`；`## img-single-file` → 用 stub 打开的独立 `图.md`；`## img-preview` → 编辑视图里的 `sub/子图.md`；`## img-preview-from-source` → `引用.md`（载入即源码）；`## img-inline` → `内联.md`；`## img-missing` → `缺图.md`。进/出预览一律 `Ctrl+Shift+P`（`App.tsx:3681`、`ShortcutsDialog.tsx:44`）。
- **每段都要文档身份断言**（R2-1）：`const id = await page.evaluate(() => ({ name: window.__slState?.name, heading: document.querySelector('.ProseMirror h1')?.textContent ?? null }))`，断 `name`（`图.md` / `子图.md`）与 `heading`（`图` / `子图` / `独立` / `引用`）。图片再绿也不能省这一行——它同时能抓「点了没反应」。
- 假盘种子的图片值用 `data:` 前缀（`.tmp/r30-fsa.mjs` 的 `getFile()` 本轮改成解二进制），**键仍然不带工作区名前缀**；PNG 用 `.tmp/e2e-r38-typora.mjs:32-33` 那个 1×1 的，`sub/assets/b.png` 要换另一张不同字节的（否则缓存命中会把 P1-1 测成假绿）。
- 等异步用 `waitForFunction`（图片解析靠 blob 创建：判 `img.complete && img.naturalWidth > 0`；mermaid 靠 400 ms 防抖 + 首次下载；保存写盘等 800 ms），不要 `waitForTimeout` 猜。
- 改含中文的 `.tmp/*.mjs` 只用 `write` / `edit`，不要用 PowerShell 字符串替换（AGENTS §8）。结尾 `await page.close()` 后 `process.exit(0)`，**不要** `browser.close()`。
- 页面可能跑着 HMR 没应用的旧模块（AGENTS §8）：断言失败先确认页面里是新代码（用 ASCII 标记 dump，例如 `img.src.startsWith('blob:')`、`doc` 里有没有 `descendants` 的效果），确认是 dev server 陈旧就报根代理，**不要自己重启 dev server**。
- 命名：`.tmp/e2e-r38-impl-t1.mjs`、`.tmp/e2e-r38-impl-t2.mjs`、`.tmp/e2e-r38-impl-t3.mjs`、日志 `.tmp/e2e-r38-impl.log`（`## 段名` 格式，便于 tester 复跑）。

## 5. 门禁（每任务与整轮）

| 层级 | 命令 | 判据 |
| :--- | :--- | :--- |
| 每任务 | `npx tsc --noEmit` | exit 0 |
| 每任务 | `npm test` | 基线 301 条；T1 后 24 文件 ≥306 条（+5）、T2 后 ≥309（+3）、T3 后 ≥311（+2），全过（以实际输出为准） |
| T1/T3 | `npm run roundtrip` | rich 5/7、source 7/7 不退化（T1 不碰序列化，T3 只换收集方式） |
| 整轮（根代理串行） | `npm run build` | exit 0，`✓ built in …` |
| 整轮（根代理串行） | `npm run verify` | `PASS` + `totalGzip ≤ 310,000` + `files=3` + 首屏集合无 `mermaid`/`lazy`/`katex`；增量是**记录项**（写进 `impl.md` 与 STATE） |
| 整轮 | `git status --short` | 只有预期文件 + `docs/iteration/round-38/`、`shots/round-38/`；`release/` 无改动 |

**改前对照（planner 本轮实测，实施后要复测同一命令并贴前后两行）**

| 命令 | 改前 | 改后应为 |
| :--- | ---: | :--- |
| `git grep -n "ResolvingImage" -- src/` | 0 | ≥2 |
| `git grep -nE "[^A-Za-z]Image\.configure" -- src/App.tsx` | **1**（`:767`；行首是空格，所以「非字母 + `Image.configure`」改前也命中，说明这条正则可判真假） | 0（`ResolvingImage.configure` 的 `Image` 前是字母 `g`，不命中；**不要**为此给 `ResolvingImage` 改名） |
| `git grep -n "ResolvingImage.configure" -- src/App.tsx` | 0 | 1 |
| `git grep -n "setAssetDocPath" -- src/` | 0 | ≥3（`assetResolve.ts` 定义 + `loadIntoEditor` + 预热 effect + 宿主两处） |
| `git grep -n "getResolvedAsset" -- src/` | 0 | ≥2（`assetResolve.ts` 定义 + `PreviewPane`） |
| `git grep -n "getAssetVersion" -- src/` | 0 | ≥2（R2-3 的自订阅快照） |
| `git grep -nE "resolveImage|assetsVersion|assetTick" -- src/` | 0 | **0**（R2-3 之后这三个词一个都不该出现） |
| `git grep -nE "startsWith\(space\.name" -- src/` | 0 | 1（resolver 的来源校验，R2-2） |
| `git grep -n "hostModeRef.current" -- src/App.tsx` | **12**（`:632,907,912,1029,1110,1726,2069,2531,2603,3043,3046,3118`） | 13（多的那一条是 effect B 第一行的宿主守卫） |
| `git grep -c "301 条" -- README.md AGENTS.md` | **3**（`README.md:119`、`AGENTS.md:39`、`AGENTS.md:72`） | 0（改成「24 个文件 NNN 条」，NNN 取实际输出） |
| `git grep -n "lineBefore" -- src/lib/smartTyping.ts` | 0 | ≥2 |
| `git grep -n "doc.forEach" -- src/lib/mermaidLazy.ts` | **1**（`:111`） | 0 |
| `git grep -n "descendants" -- src/lib/mermaidLazy.ts` | 0 | 1 |
| `git grep -nE "28 项有|12 项缺|已有 28 项|缺 12 项" -- README.md AGENTS.md` | **2**（`README.md:82`、`AGENTS.md:74`；`git grep` 默认 BRE 下 `\|` 才是「或」，`-E` 下要写真 `|`，别混） | 0（改 29/11） |
| `Select-String docs/typora-gap.md -Pattern '^## 已经有的（28）','^## 缺的（12）'` | **2** | 0（改成 29 / 11） |
| `Select-String docs/typora-gap.md -Pattern '^### 文件与工作区（2）'` | **1** | 0（改成 `（1）`；P2-2 的第一处矛盾） |
| `Select-String docs/typora-gap.md -Pattern '^\d\. 行内 HTML 渲染'` | **1**（`:89`） | 1（重排后仍是 1；若变 2 就是 P2-2 的第二处矛盾，别放过） |
| `git grep -nE "50000000|45000000" -- .`（`-E` 真 `|`） | **0** | 0（§0.1：本轮不改预算常量） |

**说明**：本表里有 3 行命令带正则「或」（`resolveImage|assetsVersion|assetTick`、`28 项有|12 项缺…`、`50000000|45000000`），裸 `|` 是命令的一部分，**照源码原样复制执行**；Markdown 渲染会在这几行多切一格，不影响命令本身。别为了表格整齐把它们改成 `\|`——`git grep -E` 里 `\|` 是字面竖线，命令会失效。

**禁止**：为过体积门去动 `vite.config.ts` 的 alias / manualChunks / external；删包内 chunk；改任何预算数字；改 `package.json` 版本；改 `release/`；把 blob URL 写进正文或 `getHTML()`。

## 6. 截图清单（`shots/round-38/`）

| 文件 | 内容 |
| :--- | :--- |
| `impl-image-workspace.png` | 打开文件夹后，编辑视图里 `assets/a.png` 真的显示成图（不是破图图标） |
| `impl-image-subdir.png` | `sub/子图.md`（换目录打开）里 `sub/assets/b.png` 也是图——P1-1 的视觉证据 |
| `impl-image-preview.png` | 同一篇进预览面板，图同样显示 |
| `impl-image-preview-source.png` | `引用.md` 从源码模式进预览，图也显示——R2-3 的视觉证据 |
| `impl-table-separator.png` | 正文里手打的 `\| --- \| --- \|` 原样保留，下面另有一根真分隔线 |
| `impl-mermaid-nested.png` | 列表项与引用块里的两张 mermaid 图都画出来 |

## 7. 延后清单（本轮不做，原因 + 下一轮入口）

1. **Mermaid b 半：两段相同代码的 SVG id 按实例唯一（P2）**。规格原样保留（round-37 `plan.md` §2 T2）：`scopeSvgIds(svg, prefix)` 必须替换「该 id 的全部出现」——`id="X"`、`#X`（含 `<style>` 里的选择器与 `url(#X)`、`href="#X"`，边界 `(?![A-Za-z0-9_-])`）、`aria-*` 的 token；**禁止**泛替换 `/#[A-Za-z0-9_-]+/`（`<style>` 里有 8 个颜色字面量 `#333`/`#ECECFF`/`#9370DB` 等会被改坏）；6 条单测 + E2E 的 `styleScoped`/`refsResolved`/computed style 断言（`nodeRectFill`、`rootFontFamily`）一个都不能省。真实 dump 的 4 个数：`id=` 10（含根）/ `<style>` 4,171 B / `#<根id>` 59 / `url(#` 1。**这是下一轮第一件事**（STATE ① 的剩余部分）。
2. **表格 `colwidth` 不落 HTML 导出（STATE ②，P2）**：给 `TableCell`/`TableHeader` 的 `colwidth` 加 `renderHTML: () => null`（**保留** `colspan`/`rowspan`，别照 STATE 早先那句「`TableCell`/`TableHeader` 加 `renderHTML: () => null`」字面做——那会把整个 `<td>`/`<th>` 吃掉，表格塌掉）。要 E2E 断言拖过的表 `getHTML()` 里 0 处 `colwidth`、且 Markdown 字节不变（单测需要 DOM，headless 单测跑不了，见 round-37 `impl.md:170`）。
3. **列宽拖拽的撤销与切视图复位（bug 第 1 条 P2）**：优先做**方案 B**——`README.md:74` 那一句补「切一次源码/预览或重开都会复位，且不进撤销栈」。`handle` 是 prosemirror-tables 插件生成的 widget（`node_modules/prosemirror-tables/dist/index.js:2534-2541`），加不了 `title`，所以**只做 README 的说明**，不要为补提示去改插件内部。**方案 A（拖完把宽度写进文档模型）不建议下轮直接做**：会让 `dirty` 变 true 并可能改变保存字节，先单独做一次实验再决定。
4. **F11 全屏（P1 差距表）**：`src/App.tsx:3686-3699` 的全局表加 `event.key === 'F11'` → `document.fullscreenElement ? exitFullscreen() : documentElement.requestFullscreen()`；`fullscreenchange` 同步状态，`ShortcutsDialog.tsx:42-48` 加一行。风险：浏览器里 F11 可能先被 Chromium 吃掉（WebView2 关了加速键，宿主内可到页面）→ 要补一个顶栏「全屏」按钮兜底；Esc 语义别抢（`FindBar` 的 `stopPropagation` 教训）。约 0.4 KB。
5. **Ctrl+滚轮字号 + 大纲「全部折叠/展开」+ 粘贴为纯文本**（typora 第 4/5/7 条 P2）：三条合计约 1.5 KB，可并成下一轮「写作手势」。大纲持久化必须带「文档键」，节点 id 按位置生成，换文档会命中别的节（`Outline.tsx:11-17`）。
6. **行内 HTML 白名单渲染（P1）**：新节点 `inlineHtml` + 白名单 `kbd|br|sub|sup|mark|u|s` + NodeView（**用 `createElement(tag)`，不要 innerHTML**）；必碰 `npm run roundtrip` 的 `01-obsidian-note.md`（含 `<kbd>Ctrl</kbd>`），单独一轮。
7. **拖入 `.md` 打开（P1 差距表）、图片落盘规则可选、全局搜索（P2 里收益最高）、图片缩放**：见 `findings-typora.md` 第 6/8/9 条与 `typora-gap.md` 缺表。
8. **`Ctrl+Shift+V` 纯文本粘贴**：`handlePaste`（`src/App.tsx:853-857`）现在只处理图片文件；加「纯文本标志」即可，约 0.3 KB。
9. **发布侧五条（ship）**：
   - S1 便携 zip 内部预算线：**前提是旧硬线（§0.1），本轮不做**；等 §0.1 的线确定后再谈。
   - S2 `packaging/verify-portable.mjs` 无门禁且 `:13` 把截图写进**已被 git 跟踪**的 `shots/round-02`：改 `.tmp/shots` 是 2 行，加 `npm run verify:portable` 与 CI 一步是另外两处；属第 4 档，**本轮不做**。
   - S3 `README.md:9-24` 下载节补 Windows 两道坎（需要 WebView2，没有则安装器中止；exe 未签名，SmartScreen 点「更多信息 → 仍要运行」）——0 B、对「装完打不开」的反馈最有效，**建议下一轮第一件文档事**。
   - S4 下载页 0.32.1 与 README（HEAD）差 9 轮未发版：下载节加一句「页面描述包含尚未发版的能力（第 36–37 轮）」。顺带 `README.md:102` 的 `898,601` → `898,853`（第 38 轮实测 `index-mqWiQKfF.js`），1 行。
   - S5 三条旧账：`installer.ps1:35` NSIS 源与 CI 不同源且不验哈希（第 5 次）、`release/SHA256SUMS.txt` 停在 0.26.0（第 7 轮）、CI 三处各自 `npm ci` + `npm run build`。都要改 CI/打包流程，本轮禁止。
10. **`docs/iteration/typora-features.md` 的「Sidelight 现状」列过期 8 处**（typora 第 11 条）：0 B 纯文档，与 `docs/typora-gap.md` 同源；下一轮和任何改 README 的轮次一起做。
11. **旧脚本维护**：`scripts/qa15.mjs` 因提示词拆分失效的 4 行（STATE ⑤）、`scripts/data-safety-acceptance.mjs` 的 `.editor` 陈旧选择器（STATE ⑥）。

## 8. 明确不属于本轮范围

- 不 bump 版本、不发版、不建 Release、不 push。
- 不改 `host/`、`host-mac/`、`packaging/`、`.github/workflows/`、`release/`（本轮没有能验证它们的条件；T1 的宿主侧限制记 §9）。
- 不引入任何新运行时/开发依赖（三个任务都不需要；T1 只用浏览器自带的 `URL.createObjectURL`）。
- 不改 `vite.config.ts`、不改任何体积预算常量（含 §0.1 的 50,000,000 / 45,000,000 落地）、不改 `docs/iteration/STATE.md`（根代理轮末写）。

## 9. UNVERIFIED 承接（本轮仍测不了，别当回归）

| 项 | 为什么 | 怎么补 |
| :--- | :--- | :--- |
| 宿主文档 + 会话恢复的文件夹（R2-2 第 2 条修法） | effect B 的宿主守卫只能**静态核对**（`hostModeRef` 在 `App.tsx:1029` 置 true、`:2069` 置 false，守卫在 effect B 第一行）；CDP 里要同时伪造 `chrome.webview`（`.tmp/r6-switch-debug.mjs:6-18` 的写法）**并且**让 IndexedDB 里存在一个同名文件的会话句柄，成本远超本轮 | 宿主内：先开一个文件夹，再双击打开同目录里同名的 `.md`，看图片是「显示不了」而不是「显示成文件夹里那张」；`host-smoke` 加一条 |
| 单文件打开（无目录句柄）同开工作区时，**插入图片仍写进工作区根 `assets/`**（R2-2 的既有行为，本轮**不修**） | `insertImageFile:3958-3959` 的 docPath 对独立文件是裸名 `图.md` → `parentDirectory` 得工作区根；本轮只保证**不显示错图**，不改写入路径 | 真人开文件夹 + 单开一篇文件，拖入一张图，看落点；要修属宿主轮（独立文件的真实目录） |
| 宿主（WebView2）单文件打开时的相对路径图片 | 宿主只给 `/__doc`，没有目录句柄；本轮只做浏览器/FSA 路径。R2-2 之后宿主路径**一定返回 null**（`''` 落前缀校验），不会显示错图 | 宿主轮：`host/` 加 `/__asset`（按 argv 目录拼），`host-smoke` 加一条显示断言 |
| **插入图片后立刻显示**（`## img-insert` 本轮不做） | `.tmp/r30-fsa.mjs:34-37` 的 `createWritable().write()` 把 `Blob` 当 UTF-8 文本（`await chunk.text()`），真 PNG 一落盘就坏，读回断言必假失败——是假盘的问题，不是产品 | 真人打开文件夹拖入一张图，看新节点 `naturalWidth > 0`；或把假盘 `write()` 改成按 `image/*` 存 `Uint8Array`（约 +8–10 分钟，与 T1 的 33–36 分钟预算冲突，本轮不做） |
| 真实文件夹句柄与权限三态 | CDP 里是假 FSA（`queryPermission` 恒 `granted`） | 真人打开文件夹拖一张图，看 `blob:` 与 `naturalWidth` |
| 宿主内 NodeView 的图片选中/拖拽 | 只在浏览器里验 | 宿主轮 `host-smoke` 加一条 |
| 真实中文 IME 下智能标点对 `--`/`---` 的处理 | 无真人输入法自动化 | 真输入法里打一行表格分隔行，看是否同样不再改写（`findings-bug.md` 已记同项） |
| 「打字时不会即时变成表格、保存后重开会不会变表格」 | 本轮只锁「输入不被改写」，不锁解析行为 | 单独一条 E2E：打字 → 保存 → 重开 → 看 `.ProseMirror table` 数量 |
| 大量图片（>50 张）时的 blob 内存与切文档 revoke | 假盘只放 1–2 张 | 真人放 50 张图来回切文档，看 `performance.memory` 与破图 |
| 暗色主题、150%/200% 缩放下图片与预览面板 | 只在当前主题/100% 下测 | 主题回归时同批 |
| 真实盘/网络盘上读取 `assets/` 的失败路径 | 假盘不外抛 | 与既有写回项同批 |
| T3 的 dev-only 首次 reload 与嵌套图叠加 | 只在 dev server 里验 | 正式包（`npm run build` 后）打开含嵌套图的文档看一次 |
| 预览两段（`## img-preview` / `## img-preview-from-source`）**仅在被 §3 规则 2 降级时**才记这条 | 单代理 33–36 分钟预算下这两段排在最后 | 补测：编辑视图里按 `Ctrl+Shift+P` 看 `.preview-pane img`；再开 `引用.md`（载入即源码）按一次，同样看 `naturalWidth` 与 `src` 是否 `blob:` |
