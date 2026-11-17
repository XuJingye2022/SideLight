# 第 38 轮实施报告（executor）

- 轮次：round=38；轮前 `startSha=bb52c6a23045042c18a08748547ef796f2e4890f`；写本文件时 `git rev-parse HEAD` 仍是 `bb52c6a`（本轮不 commit，由根代理提交）。
- 执行方式：单执行代理（按 `plan.md` §3「单代理执行规则」：T1 → T2 → T3）。
- 只读/禁改遵守：未 commit、未 push、未改 `package.json` 版本、未动 `release/`、未新增依赖、未启动/重启 dev server、未 kill 浏览器、E2E 只用 CDP 9222。
- 读完的输入：`common.md`、`roles/executor.md`、`docs/iteration/STATE.md`、`round-38/plan.md`（revision=3，全文 361 行）、`round-38/plan-review.md`（第 3 次，126 行），以及计划点到的源码（`src/App.tsx` 相关段、`src/lib/workspace.ts`、`asset.ts`、`smartTyping.ts`、`mermaidLazy.ts`、`mermaidPreview.ts`、`PreviewPane.tsx`、`@tiptap/extension-image`、`@tiptap/core` 的 view/getHTML 段、`.tmp/r30-fsa.mjs`）。

## 0. 任务状态

| 任务 | 状态 | 一句话 |
| :--- | :--- | :--- |
| T1 工作区相对路径图片显示 | **完成** | 编辑视图 + 预览面板都显示；正文与保存字节仍是 `assets/…`；换目录两向都对；单文件打开不显示错图 |
| T2 智能标点不改写含 `|` 的行 | **完成** | `\| --- \| --- \|` 原样保留，空段落 `---` 仍出 HR |
| T3 Mermaid 嵌套围栏（a 半） | **完成** | 列表项 / 引用块里的围栏渲染；b 半（SVG id）仍按 §7 延后 |

## 1. 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/assetResolve.ts`（新，148 行） | `isRelativeAsset`（纯函数）+ 模块级 `currentDocPath`/`epoch`/`resolver`/`cache`/`inFlight`/订阅者/`assetVersion`；`resolveAsset` 现读路径、在飞去重、失败不缓存、代际校验；`setAssetDocPath` 同路径幂等、换路径 revoke；`clearAssetCache`；`getResolvedAsset`/`subscribeResolved`/`getAssetVersion`/`getAssetDocPath`。不 import tiptap |
| `src/lib/assetImage.ts`（新，68 行） | `ResolvingImage = Image.extend({ addNodeView })`：DOM 的 `src` 换 blob，`destroy` 只退订不 revoke，`update` 换 attr 时重绑 |
| `src/lib/assetResolve.test.ts`（新，5 条） | 相对路径判定 / 无 resolver / 失败不缓存 / 并发去重 + 换文档代际丢弃 / 版本号只在成功与清缓存时 +1 |
| `src/App.tsx` | `Image` → `ResolvingImage`（`:11` 删除、`:767` 改）；新增两条 effect（resolver 注册 + 预热）；`loadIntoEditor` 首行写 `setAssetDocPath`；`applyHostPayload` 首行与 `hostUnavailable` 写 `setAssetDocPath('')`；`insertImageFile` 插入前 `await resolveAsset(relative)` |
| `src/components/PreviewPane.tsx` | 自订阅 `subscribeResolved`/`getAssetVersion`（第二个 `useSyncExternalStore`）；新增解析 effect（依赖 `[bodyHtml, assetVersion]`）；`renderMath` 里把 `img[src]` 从缓存改成 blob；`assetVersion` 进 `useMemo` 依赖。Props 未动 |
| `src/lib/smartTyping.ts` | `smartInput` 加第 4 参 `lineBefore = ''`；`inserted === '-' && lineBefore.includes('|')` → `null`（放在 `--→—` 之前）；插件侧只在按 `-` 时取整行 |
| `src/lib/smartTyping.test.ts` | +3 条（表格行不转换 / 普通行照旧 / 第三根 dash 不连吞） |
| `src/lib/mermaidLazy.ts` | `listMermaidBlocks`：`doc.forEach` → `doc.descendants`，命中返回 `false`，`pos` 用回调给的绝对位置 |
| `src/lib/mermaidLazy.test.ts` | +2 条（列表项内、引用块内 + 顶层回归、pos 单调） |
| `package.json` | `test` 脚本插入 `assetResolve.test.ts`（24 个文件） |
| `.tmp/r30-fsa.mjs` | `getFile()` 支持 `data:` 种子解成二进制（真 PNG）；`createWritable().write()` 未动 |
| `docs/typora-gap.md` | `已经有的（28）`→`（29）`、`缺的（12）`→`（11）`、`文件与工作区（2）`→`（1）`、插一行「工作区相对路径图片显示」、删旧的那行、下一批 4 条重排成 3 条（`:84` 标题与 `:86` 引导句未动） |
| `README.md` | `:46` 能力句补相对路径图片；`:76` 限制句补单文件打开；`:78` 智能标点限制补一句；`:82` 28/12 → 29/11；`:119` 24 个文件 311 条 |
| `AGENTS.md` | `:39` 第 38 轮记 24 个文件 311 条（并补「图片解析缓存」一项）；`:72` 测试 24 个文件 311 条；`:74` 29 项有 11 项缺 |
| `docs/CHANGELOG.md` | `:5` 改「第 29–38 轮」，新增「第 38 轮」小节 |
| `docs/adr/0017-mermaid-lazy-loading.md` | 已知限制补一行：列表项/引用块围栏也渲染，剩下的是 b 半 |

## 2. 与计划的偏差（都是 plan-review 第 3 次的三条 + 两处执行细节，最小改动）

1. **R3-1（P1）「`## img-preview-from-source` 的锁没牙」→ 已按 critic 修法做，并让 precondition 真的成立**：种子加 `引用2.md`（`assets/d.png`），段内先停在源码模式再点它（断言 `viewMode:'source'`、`.doc-column .ProseMirror` 为 `null`），然后 `Ctrl+Shift+P`。
   - **额外最小改动**：计划里 effect B 无条件预热（`editor.state.doc.descendants` → `resolveAsset`），那样 `assets/d.png` 会被预热提前解析，锁又变成假绿。所以 effect B 的预热段加了 `if (viewMode !== 'edit') return`（依赖加 `viewMode`）：源码/预览里没有 NodeView，预热交给真正要显示的那一侧（预览面板自解析）。`setAssetDocPath` 与宿主守卫不受影响。
   - **红→绿物证**（`.tmp/e2e-r38-red.mjs`，同一脚本两次运行）：把 `PreviewPane` 的自解析 effect 临时停用 → `{"name":"引用2.md","viewMode":"source","editorMounted":false,"previewCount":1,"naturalWidth":0,"srcBlob":false,"srcKind":"assets/d.png"}`；恢复后 → `{"...","naturalWidth":1,"srcBlob":true,"srcKind":"blob:http://","heading":"引用2"}`。即「删掉 R2-3 的修复这一段就会红」。
2. **R3-2（P2）图片换 NodeView 后没有选中/删除/撤销回归** → 并进 `## img-bytes`：点图 → `.ProseMirror-selectednode` 数量 1；`Delete` → 图 0 张；`Ctrl+Z` → 1 张且 `naturalWidth:1`、`srcBlob:true`。输出里 `imgSelectable/imgDeletable/imgUndoable` 三个布尔全 `true`。
3. **R3-3（P2）`sub/子图.md` 的「0 处 blob」是空断言** → 该篇也真的 `Ctrl+S` 一次再 `readFakeFile`：`subSavedHasRelative:true`、`subSavedHasBlob:false`、`subSavedEqualsSeed:true`。
4. **`startsWith(space.name + '/')`**（计划写 `startsWith(space.name`）：用模板字符串写法时计划的静态判据 `git grep -nE "startsWith\(space\.name"` 会 0 命中，改成字符串拼接后 = 1，语义不变。
5. **`git grep` 不计未跟踪文件**：新建的三个文件（`assetResolve.ts` / `assetImage.ts` / `assetResolve.test.ts`）用 `git grep` 会漏掉，本报告的静态判据一律用 `git grep --untracked`；`-u` 不是 `git grep` 的开关（会报 `unknown switch`）。

## 3. 门禁结果

| 门 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | exit 0（修过一处 `TS2454 task used before assigned`：`inFlight` 落定改成按 key 删） |
| 单测 | `npm test` | **24 个文件 311 条，fail 0**（基线 301 + assetResolve 5 + 智能标点 3 + mermaid 2） |
| 往返 | `npm run roundtrip` | rich **5/7**、source **7/7**、`firstSaveBlocked: 1/7`（与第 37 轮同；`04-reference-links.md -4 +1`、`06-task-list.md -0 +1`） |
| 构建 | `npm run build` | exit 0，`✓ built in 473ms`；主 chunk `index-Vy1SBkVu.js` 901,482 B raw / 281,803 B gzip |
| 首屏 | `node scripts/measure-first-screen.mjs` | **PASS**，`total raw=936,669 gzip=289,430 headroom=30,570 files=3`；相对第 37 轮 288,411 **+1,019 B**（计划估 +1.0–1.4 KB）；`target=310000 gap=20570`；无 `mermaid`/`lazy`/`katex` 进首屏集合 |
| 工作区 | `git status --short` | 只有第 1 节的预期文件 + 未跟踪的 `docs/iteration/round-38/`、`shots/round-38/`；`release/` 无变化 |

### 3.1 静态判据（改前 → 改后，`git grep --untracked`）

| 命令 | 计划要求 | 实测 |
| :--- | :--- | :--- |
| `ResolvingImage` | ≥2 | 3 |
| `[^A-Za-z]Image\.configure`（App.tsx） | 0（改前 1） | 0 |
| `ResolvingImage.configure`（App.tsx） | 1 | 1 |
| `setAssetDocPath` | ≥3 | 13 |
| `getResolvedAsset` | ≥2 | 12 |
| `getAssetVersion` | ≥2 | 8 |
| `subscribeResolved` | ≥3 | 8 |
| `resolveAsset(` | ≥3 | 12 |
| `resolveImage\|assetsVersion\|assetTick` | 0 | 0 |
| `startsWith\(space\.name` | 1（改前 0） | 1 |
| `hostModeRef.current`（App.tsx） | 13（改前 12） | 13 |
| `lineBefore`（smartTyping.ts） | ≥2 | 5 |
| `doc.forEach`（mermaidLazy.ts） | 0（改前 1） | 0 |
| `descendants`（mermaidLazy.ts） | 1 | 1 |
| `301 条`（README/AGENTS） | 0（改前 3） | 0 |
| `28 项有\|12 项缺\|已有 28 项\|缺 12 项`（README/AGENTS） | 0（改前 2） | 0 |
| `Select-String typora-gap '^## 已经有的（28）','^## 缺的（12）'` | 0（改前 2） | 0 |
| `Select-String typora-gap '^### 文件与工作区（2）'` | 0（改前 1） | 0 |
| `Select-String typora-gap '^\d\. 行内 HTML 渲染'` | 1 | 1 |
| `50000000\|45000000`（仓库） | 0 | 0 |

## 4. E2E（CDP 9222，每条前 `node .tmp/reset.mjs 9222`）

### 4.1 `.tmp/e2e-r38-impl-t1.mjs` → `.tmp/e2e-r38-impl.log`（十段全绿）

```
## img-root {"name":"图.md","viewMode":"edit","dirty":false,"heading":"图","imgCount":1,"naturalWidth":1,"srcBlob":true,"srcKind":"blob:http://","alt":"甲","settled":true}
## img-cross-dir {"name":"子图.md","viewMode":"edit","dirty":false,"heading":"子图","imgCount":1,"naturalWidth":1,"srcBlob":true,"srcKind":"blob:http://","alt":"乙","settled":true}
## img-back-root {"name":"图.md","viewMode":"edit","dirty":false,"heading":"图","imgCount":1,"naturalWidth":1,"srcBlob":true,"srcKind":"blob:http://","alt":"甲","settled":true}
## img-bytes {"savedHasRelative":true,"savedHasBlob":false,"savedEqualsSeed":true,"savedText":"# 图\n\n![甲](assets/a.png)\n","subSavedHasRelative":true,"subSavedHasBlob":false,"subSavedEqualsSeed":true,"imgSelectable":true,"imgDeletable":true,"imgUndoable":true}
## img-single-file {"name":"图.md","viewMode":"edit","dirty":false,"heading":"独立","imgCount":1,"naturalWidth":0,"srcBlob":false,"srcKind":"assets/a.png","alt":"甲","errors":[]}
## img-inline {"name":"内联.md","viewMode":"edit","dirty":false,"heading":"内联","imgCount":1,"naturalWidth":1,"srcBlob":false,"srcKind":"data:image/p","alt":"内联","settled":true}
## img-missing {"name":"缺图.md","viewMode":"edit","dirty":true,"heading":"缺图","imgCount":1,"naturalWidth":0,"srcBlob":false,"srcKind":"assets/none.","alt":"无","textAfterType":"缺图\n\n续","errors":[]}
## img-preview {"name":"子图.md","viewMode":"preview","dirty":false,"heading":"子图","previewCount":1,"naturalWidth":1,"srcBlob":true,"settled":true}
## img-preview-from-source {"firstViewMode":"source","coldName":"引用2.md","coldViewMode":"source","coldEditorMounted":false,"previewCount":1,"naturalWidth":1,"srcBlob":true,"heading":"引用2","settled":true}
## errors []
```

- 根文档用**精确**选择器 `[data-path="示例文集/图.md"]`；子目录先点 `[data-path$="/sub"]` 展开再点 `[data-path$="sub/子图.md"]`（唯一，`sub` 里的文档已更名 `子图.md`，不与根同尾）。
- 每段都带文档身份（`name` + `heading`）：`图` / `子图` / `独立` / `引用2`，能抓「点了没反应」。
- `sub/assets/b.png` 与 `assets/a.png` 字节不同（E2E 用两张不同 1×1 PNG），避免「查错目录也命中缓存」假绿。
- `savedEqualsSeed:true`：`Ctrl+S` 写回与种子逐字节相同，**0 处 `blob:`**。
- `## img-single-file` 断的是 `naturalWidth:0`（**不许**是 1）——工作区同开时用 `Ctrl+Alt+O` 打开同名独立 `图.md`，没有目录句柄就不解析。
- 红→绿对照见 §2 第 1 条（`.tmp/e2e-r38-red.log`）。

### 4.2 `.tmp/e2e-r38-impl-t2.mjs` → `.tmp/e2e-r38-impl-t2.log`

```
## typed-table {"tail":"\n\n\n| 甲 | 乙 |\n\n| --- | --- |","textHasSeparator":true,"emDashCount":0,"tableRows":0}
## hr {"hrCount":1,"blocks":["P:| --- | --","HR:","P:"]}
## errors []
```

打字路径：`Control+End` → `Enter` → 打 `| 甲 | 乙 |` → `Enter` → 打 `| --- | --- |`。分隔行原样保留（改前同一条命令得到 `| —- | —- |`、`emDashCount:2`，见 `findings-bug.md:59-60` 与 `.tmp/e2e-r38-bug.log`）。另起一段打 `---` 仍出 1 根 HR（新分支返回 `null` 不截断后续输入规则）。

### 4.3 `.tmp/e2e-r38-impl-t3.mjs` → `.tmp/e2e-r38-impl-t3.log`

```
## nested-list {"name":"列表图.md","previewCount":1,"readyCount":1,"svgCount":1,"errorCount":0,"codes":["graph TD\n  A --> B"],"ready":true}
## nested-quote {"name":"引用图.md","previewCount":1,"readyCount":1,"svgCount":1,"errorCount":0,"codes":["graph TD\n  Q --> R"],"ready":true}
## top-level {"name":"顶层.md","previewCount":1,"readyCount":1,"svgCount":1,"errorCount":0,"codes":["graph TD\n  S --> T"],"ready":true}
## code-intact [{"file":"示例文集/列表图.md","same":true,...},{"file":"示例文集/引用图.md","same":true,...},{"file":"示例文集/顶层.md","same":true,...}]
## errors []
```

顶层回归一起验（P2-3）；三篇的 `pre code` 文本与种子逐字一致（widget 是装饰，不改代码块）。

## 5. 截图（`shots/round-38/`，6 张）

| 文件 | 内容 |
| :--- | :--- |
| `impl-image-workspace.png` | 打开文件夹后，`图.md` 的 `assets/a.png` 在编辑视图里真的显示（160×90 橙块） |
| `impl-image-subdir.png` | `sub/子图.md` 换目录打开后，`sub/assets/b.png` 显示成蓝块——P1-1 的视觉证据 |
| `impl-image-preview.png` | 同一篇进预览面板，图同样显示 |
| `impl-image-preview-source.png` | 源码模式下载入 `引用2.md` 再进预览，图显示——R2-3 / R3-1 的视觉证据 |
| `impl-table-separator.png` | 正文里 `| --- | --- |` 原样保留，下面另有一根真分隔线 |
| `impl-mermaid-nested.png` | 列表项与引用块里的 mermaid 图都画出来 |

E2E 断言用 1×1 PNG（`naturalWidth:1` 好判）；截图改用 160×90 纯色 PNG，否则 1px 的图在 1200×800 截图里看不见（见 §7 第 2 条）。`scripts/shot.mjs` 未用（它只截默认页面，本轮状态要造工作区与文档，直接用 Playwright `page.screenshot`）。

## 6. CHANGELOG 建议条目

已按计划写进 `docs/CHANGELOG.md` 的「**第 38 轮（同一未发版区间）**」小节（三条修复 + 文档同步 + 门禁 + UNVERIFIED），并把 `## Unreleased` 标题从「第 29–37 轮」改成「第 29–38 轮」。版本号未动（0.32.1）。

## 7. 新踩的坑（写进下一轮的 AGENTS §8 候选）

1. **Vite 会交付「半新」模块，且只命中一个文件**：`src/lib/smartTyping.ts` 磁盘上已有第 4 参与插件传参，`/src/lib/smartTyping.ts` 返回的却还是旧插件调用（`smartInput(before, inserted, after)`），于是单测全过、E2E 仍复现旧缺陷。判据：`node -e "fetch('http://localhost:5175/src/lib/smartTyping.ts').then(r=>r.text()).then(t=>console.log(/lineBefore\)/.test(t)))"` 这类 **ASCII 标记**比对；修法只要 `(Get-Item 文件).LastWriteTime = Get-Date` 触发重新 transform，**不用重启 dev server**。同时把 `mermaidLazy/assetResolve/assetImage/App/PreviewPane` 一起核了一遍才算放心（其它 5 个都是新版本）。
2. **1×1 PNG 截图看不见图**：`naturalWidth:1` 的断言能过，但 1200×800 截图里就是空白，会被误判「没修好」。视觉证据要用 160×90 的纯色 PNG（`zlib` 手写 IHDR/IDAT 生成，脚本 `.tmp/r38-png.mjs`），不同目录用不同颜色才好看出「查对了目录」。
3. **`git grep` 默认只搜已跟踪文件**：本轮三个新文件不在索引里，`git grep -n "ResolvingImage" -- src/` 只回 App.tsx 的 2 处，看起来像「assetImage.ts 没写」。等于 0 的「改后应为」判据要先加 `--untracked` 再下结论（`-u` 不是 `git grep` 的开关）。
4. **effect B 的预热会偷偷把「冷缓存」变热**：R3-1 那条锁（源码态载入 → 预览）之所以能红，是因为预热只在 `viewMode === 'edit'` 跑。以后再加「预热/补解析」这类副作用，先问一句「会不会把某个验收的冷启动条件吃掉」。

## 8. UNVERIFIED（本轮仍测不了，没写成已修）

| 项 | 为什么 | 怎么补 |
| :--- | :--- | :--- |
| 真实文件夹句柄与权限三态（`queryPermission` 非 granted） | CDP 里是 `.tmp/r30-fsa.mjs` 假 FSA，恒 `granted` | 真人打开一个真文件夹拖入一张图，看 `blob:` 与 `naturalWidth` |
| 宿主（WebView2）单文件打开时的相对路径图片 | 宿主只给 `/__doc`，没有目录句柄；R2-2 之后宿主路径**一定 null**（不显示错图，但也显示不了图） | 宿主轮加 `/__asset` 路由 + `host-smoke` 显示断言 |
| 宿主重开（`setWorkspace` + `setActiveFile` 抢跑）时 effect B 的宿主守卫 | 只能静态核对（`hostModeRef` 在 `applyHostPayload` 首行置 true、守卫在 effect B 第一行） | 宿主内先开文件夹再双击同名 `.md`，看是「显示不了」而不是「显示成文件夹里那张」 |
| **插入图片后立刻显示** | 假盘 `createWritable().write()` 把 `Blob` 当文本写，PNG 一落盘就坏（`.tmp/r30-fsa.mjs:34` 未改）；本轮只加了 `insertImageFile` 插入前的 `await resolveAsset` | 真人拖一张图进正文看新节点；或把假盘 `write()` 改成按 `image/*` 存字节（约 +8–10 分钟） |
| 宿主内 NodeView 的图片选中/拖拽 | 只在浏览器里验过（选中/删除/撤销三项已验） | `host-smoke` 加一条 |
| 真实中文 IME 下表格分隔行与智能标点 | 无真人输入法自动化 | 真输入法打一行 `| --- | --- |`，看是否同样不改写 |
| 「打字时立刻变表格 / 保存重开会不会变表格」 | 本轮只锁「输入不被改写」 | 单独 E2E：打字 → 保存 → 重开 → 数 `.ProseMirror table` |
| 大量图片（>50 张）的 blob 内存与切文档 revoke | 假盘只放 1–2 张 | 真人放 50 张来回切文档，看内存与破图 |
| 暗色主题 / 150% / 200% 缩放屏下的图片与预览面板 | 只在当前主题、100% 下测 | 主题回归时同批 |
| 正式包（`npm run build` 后）里的 mermaid 嵌套图叠加与 dev-only 首次 reload | E2E 都在 dev server 里跑 | 打开 `dist` 产物看一次含嵌套图的文档 |
| 宿主文档 + 会话恢复同开会话时的图片路径 | 同第 3 行 | 同上 |

## 9. 交接给 tester / 根代理

1. 复跑顺序（同上）：`node .tmp/reset.mjs 9222` → `.tmp/e2e-r38-impl-t2.mjs` / `-t3.mjs` / `-t1.mjs`（t1 最慢，约 40 s）。
2. 红→绿对照要连同 **`.tmp/e2e-r38-red.mjs` 的两次输出**一起看（§2 第 1 条）；只看 t1 全绿不能证明「预览自己解析」这条逻辑真的在起作用。
3. 根代理还需串行跑 `npm run verify` 落最终首屏数字（本轮实测 289,430 B，+1,019 B）；本轮未 bump 版本、未 commit。
4. 未做（按计划 §7 延后）：Mermaid b 半、表格 `colwidth` 导出、F11、行内 HTML 渲染、便携 zip 预算线、`typora-features.md` 8 处过期、旧脚本 `qa15.mjs`/`data-safety-acceptance.mjs`。
