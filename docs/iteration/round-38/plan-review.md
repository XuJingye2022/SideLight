# 第 38 轮计划审查（critic，只读，第 3 次）

- 轮次：round=38；轮前 `startSha=bb52c6a23045042c18a08748547ef796f2e4890f`；审查时 `git rev-parse HEAD` = `bb52c6a`，`git status --porcelain` 只有未跟踪的 `docs/iteration/round-38/` 与 `shots/round-38/`。
- 只读：本文件是唯一写入；未改产品代码、未跑 E2E、未碰 `release/`、未 push、未启动/重启 dev server、未占用 CDP 9222。
- 输入（全部读完）：`round-38/plan.md`（revision=3，361 行）、上一版 `round-38/plan-review.md`（第 2 次，151 行）、`round-38/findings-bug.md`、`findings-typora.md`、`findings-ship.md`（经计划引用）、`common.md`、`roles/critic.md`、`AGENTS.md`（§3/§4/§6/§8）、`docs/typora-gap.md`（全文）、`README.md:40-124`、`docs/CHANGELOG.md:1-10`、`docs/adr/0017-mermaid-lazy-loading.md:104-112`。
- 源码核对（逐个 read，不是只看计划文字）：`src/App.tsx`（`:1-30`、`:755-800`、`:950-1010`、`:1024-1140`、`:1240-1350`、`:1990-2170`、`:2185-2260`、`:2340-2460`、`:3670-3700`、`:3745-3870`、`:3940-4010`、`:4780-4840`）、`src/components/PreviewPane.tsx`（全文）、`src/components/FileTree.tsx:20-100,160-410`、`src/lib/workspace.ts:70-230`、`src/lib/asset.ts`（全文）、`src/lib/smartTyping.ts`（全文）、`src/lib/mermaidLazy.ts:80-141`、`src/lib/mermaidPreview.ts`（全文）、`src/lib/mermaidLazy.test.ts:60-124`、`.tmp/r30-fsa.mjs`（全文）、`.tmp/e2e-r37-impl-t1.mjs`（全文）、`.tmp/e2e-r33-bug-a2.mjs`（全文）、`.tmp/e2e-r29-p2.mjs:55-99`、`.tmp/e2e-r38-typora.mjs:1-60`、`.tmp/r38-typora-e2e.json`、`node_modules/@tiptap/core/dist/index.js`（`:6690-6715`、`:6784-6815`、`:6987-7009`、`:7055-7090`）、`node_modules/prosemirror-view/dist/index.js`（`:1497-1534`、`:3462-3483`）、`package.json:11-19`。
- 实跑命令：`git grep` 16 组改前对照（见 §二末），`node -e` 读 `@tiptap/core` / `prosemirror-view` / `package.json` / 各文档指定行，`git rev-parse HEAD`、`git status --porcelain`。

## 结论：**REVISE**（1 P1 + 2 P2）

上一版 5 条漏洞（R2-1～R2-5）的**方案层**全部修掉，且我逐条实查过落点，没有一条是「只在计划里改字」：R2-1 的种子更名与精确选择器全文一致（`git grep 'sub/图.md'` 与 `'\$="/图.md"'` 在计划里都是 **0 命中**）、R2-2 的来源校验与宿主守卫对得上 `App.tsx:1029/1249-1264/1341/2069` 的实际时序、R2-3 换成了 `PreviewPane` 自订阅自解析、R2-4 补了三个种子与段↔文档对应表、R2-5 统一到 `:88-91`。T1 的根因修法（模块级路径 + `loadIntoEditor` 首行 + 订阅回填 + epoch/在飞去重/失败不缓存）仍成立，可以直接执行。

仍判 REVISE 的原因只有一条硬的：**R2-3 的锁 `## img-preview-from-source` 是否真能红，取决于「开 `引用.md` 那一瞬间编辑器是否挂载」，而计划既没写这个前置也没断言它**；按计划给出的步骤顺序（上一段在编辑视图）执行时，缓存已经是热的，**删掉 R2-3 的整套自解析逻辑这一段照样全绿**。另两条是证据边缘：图片改成 NodeView 后没有任何选中/删除/撤销回归，以及 `sub/子图.md` 的「0 处 `blob:`」是空断言。

---

## 一、上一版漏洞复核（逐条实查，不是看计划怎么说）

| 上一版漏洞 | 状态 | 证据（本轮实查） |
| :--- | :--- | :--- |
| R2-1（P1）`## img-back-root` 选择器在 `sub` 展开后不唯一 | **修掉** | ① 精确选择器落地：`plan.md:110`（`page.locator('.file-tree [role="treeitem"][data-path="示例文集/图.md"]').click()`）、`:133`、`:260`；**全文 0 处 `data-path$="/图.md"`**（实跑 `git grep -n '\$="/图.md"' -- docs/iteration/round-38/plan.md` = 0）。② 种子更名：`sub/图.md` → `sub/子图.md`（`plan.md:15/110/132/260/261`，实跑 `git grep -n 'sub/图\.md' -- docs/iteration/round-38/plan.md` = 0；「子图」全文 17 行）。③ 身份断言：`:111`（步骤 2）、`:130`（段名前缀说明）、`:133`、`:263`（§4 统一写法，断 `window.__slState.name` + `.ProseMirror h1`）。④ `__slState` 确实有 `name` 与 `viewMode`：`App.tsx:104`（类型）、`:708` `window.__slState = { dirty, name: docName, readOnly, viewMode }`。⑤ 根因链仍成立：`workspace.ts:109` `children: [...dirs, ...files]`、`FileTree.tsx:42-51`（`visibleRows` 先 dir 后 file，展开即插子行）、`:263-269`（`role/aria-level/data-path` 挂在 treeitem 上）、`:294-339`（`.tree-row` 是 treeitem 的父、`⋯` 是兄弟——§4 的 `.tree-row:has(...)` 写法对）。**残留的不一致只有一处措辞**：§4 说「文件一律用精确选择器」，随后对子目录文档又用 `[data-path$="sub/子图.md"]`（`:261`、`:132`）——这条通配唯一（根文档改名后不再同尾），加上身份断言兜底，不构成漏洞，见 §四第 3 条。 |
| R2-2（P2）`docPath` 来源未校验 | **修掉** | ① resolver 前缀校验：`plan.md:96` 写进 effect A 的第二行，判据 `git grep -nE "startsWith\(space\.name" -- src/` 改前 **0**（实跑）→ 改后 1。② 宿主守卫：`:96` effect B 第一行 `if (hostModeRef.current) { setAssetDocPath(''); return }`，静态计数 `git grep -n "hostModeRef.current" -- src/App.tsx` = **12**（实跑，行号与计划 §5 列出的 `:632,907,912,1029,1110,1726,2069,2531,2603,3043,3046,3118` **逐个一致**）→ 13 成立。③ 时序核对：`applyHostPayload` 第一行置 `''`（`App.tsx:1025`，`:1029` 置 `hostModeRef=true`、`:1038` 才 `setMarkdown`）；会话恢复的 `setWorkspace`/`setActiveFile`（`:1256-1261`）**早于** `applyHostPayload`（`:1341`），中间 `await parentDirectory`（`:1262`）会让 effect B 抢跑，守卫与「第一行」两处缺一不可——计划两处都写了。④ 单文件打开确实是裸名：`App.tsx:2205-2210`（`path: picked.name`）+ `setAssetDocPath(file?.path ?? …)`（`plan.md:97`）；`parentDirectory` 对裸名走 `slice(1,-1)` → `[]` → 工作区根（`workspace.ts:147`）。⑤ 锁有牙：`## img-single-file`（`:135`）断 `naturalWidth:0`，若前缀校验漏了缓存又热，这张图会亮成工作区那张 → 该段必红。⑥ §9 两行承接（`:350`、`:351`）与 `insertImageFile` 既有行为（`App.tsx:3958-3959`）口径一致。 |
| R2-3（P2）预览只靠 `assetTick`，源码→预览永久破图 | **方案修掉，锁仍不可靠（本轮 P1 见 R3-1）** | ① 机制更正**正确**：`@tiptap/core` `unmount()` 在 `:6697-6704`（`this.editorView = null`）、`get view()` 在 `:6784-6803` 返回 Proxy（`state`/`dispatch`/`isDestroyed:false`）、`get state()` 在 `:6808-6814`（无 view 时返回 `this.editorState`）、`dispatchTransaction` 在 `:6987-7009` 走 `this.state.applyTransaction` 并把新 state 写回；`getHTML()` 在 `:7060-7061` 只读 `this.state.doc.content` —— 计划 §2「根因补充 2」的每一句都对，也包括「上一版 plan-review 说的『applySource 会同步建 NodeView』不成立」。② 修法落地：`plan.md:101`（`PreviewPane` 自订阅 + 自发起解析，Props 不动）、`:100`（`App.tsx:4817-4818` 不动）、`:127`/`:291` 三条静态判据（`getResolvedAsset` ≥2、`subscribeResolved` ≥3、`getAssetVersion` ≥2、`resolveImage\|assetsVersion\|assetTick` = 0，改前实跑全 0）。③ 代码位置对：`PreviewPane.tsx:33` 已有 `useSyncExternalStore`、`:36-39` `useMemo` 依赖、`:14-26` `renderMath`、`:51-52` `.preview-pane`。④ **但验收段选错了路径**，见 R3-1。 |
| R2-4（P2）`## img-inline` / `## img-missing` 无种子 | **修掉** | 种子齐了（`plan.md:110`）：`内联.md`（data URL）、`缺图.md`（`assets/none.png`）、`引用.md`（引用式定义 + `assets/c.png`）；§4 有「段 ↔ 文档」对应表（`:262`）与 `Ctrl+Shift+P` 明确按键（`:262`，对应 `App.tsx:3681`、`:4601-4603`）。旁证：`引用.md` 载入即源码这条链对得上 `App.tsx:2078`（`hasReferenceDefinitions` → `enterSourceFor`）与 `:1090`（宿主侧同规则）。 |
| R2-5（P2）`typora-gap.md` 区间前后不一致 | **修掉** | 三处统一到 `:88-91`（`plan.md:19`、`:102`）；并写明「只重排这 4 行，`:84` 标题与 `:86` 引导句**不动**」。实查 `docs/typora-gap.md:84` `## 建议的下一批`、`:86` 引导句、`:88-91` 4 条（`:89` 已是「行内 HTML 渲染」）——完全一致。计数也自洽：`:7` `（28）`（表体 `:11-38` 正好 28 行）、`:40` `（12）`、`:58` `（2）`、六段 3+3+2+1+1+2=12，删 `:63` 并改 `:58` 为 `（1）` 后与「缺的（11）」对得上。 |

---

## 二、已核对通过的部分（列关键项，给证据）

| 计划说法 | 核对结果 | 证据 |
| :--- | :--- | :--- |
| `loadIntoEditor` 首行写路径早于 `setMarkdown` | ✅ | `App.tsx:2005-2006`（签名）、`:2007`（`if (!editor) return`，插在前/后都不影响 dispatch）、`:2029` `setMarkdown`、`:2050` `setActiveFile`、`:2069` `hostModeRef=false`、`:2078` `enterSourceFor`、`:2145` deps **没有** `workspace`（所以必须读 `workspaceRef.current`，对） |
| `setMarkdown` 是同步 dispatch | ✅ | `App.tsx:972-991`：`:983` `schema.nodeFromJSON`、`:987` `editor.view.dispatch(transaction)`、`:988` `setTextSelection(0)` |
| 预览三选一渲染、`getHTML()` 在卸载后仍对 | ✅ | `App.tsx:4795`（source）/`:4817-4818`（`<PreviewPane bodyHtml={editor?.getHTML() ?? ''} …/>`）/`:4819-4825`（EditorContent）；`@tiptap/core:7060-7061`、`:6808-6814` |
| `Ctrl+Shift+P` 进出预览、预览按钮 | ✅ | `App.tsx:3681-3685`（window keydown → `togglePreviewRef`）、`:3864-3866`（`switchView(previewMode ? 'edit' : 'preview')`）、`:4601-4603`（按钮 `:4602`） |
| 插图片那行可插 `await resolveAsset(relative)` | ✅ | `App.tsx:3954-3981`：`:3964` `writeAsset`、`:3965` `setImage({ src: relative })`、`:3980` deps |
| 宿主两处入口行号 | ✅ | `:1025-1097`（`applyHostPayload`，`:1029` 置 true / `:1038` setMarkdown / `:1341` 调用）、`:1108-1126`（`hostUnavailable`，`:1110` 置 true / `:1113` `setMarkdown('')`） |
| 选择器与 DOM 结构 | ✅ | `FileTree.tsx:263-269`（treeitem 带 `aria-level`/`data-path`）、`:294-339`（`.tree-row` > treeitem + `.tree-row-more`）、`:349-352`（目录点击即 `toggleDir`，计划写 `:185` 是同一函数的键盘分支，行号偏一点但行为对）、`:372` `.file-tree` |
| `data-path` 带工作区名前缀 | ✅ | `workspace.ts:88`（`joinPath`）、`:99`（`files.push({ path: joinPath(path, name) })`）、`:109`；`.tmp/r30-fsa.mjs:150` 工作区名 `示例文集` |
| `parentDirectory` 的裸名行为 | ✅ | `workspace.ts:138-156`，`:147` `filePath.split('/').slice(1, -1)` → 裸名得 `[]` → 根 |
| 假盘能力 | ✅ | `.tmp/r30-fsa.mjs:6`（`dirs` 含 `sub`，不含 `sub/assets`，但 `:12-19` `dirHasChild` 按文件键前缀认）、`:21-29` `getFile()`（计划只改这里）、`:34-41` `write()` 走文本、`:150-151` picker stub、`:155-157` `readFakeFile`（读**种子键**）、`:163-167` `openFolder(page)` |
| E2E 可抄的现成写法 | ✅ | `.tmp/e2e-r37-impl-t1.mjs:17`（种子键不带前缀）、`:32-40`（`dismissSwitch`）；**`:42` 的 `openDoc` 就是 `data-path$="/${path}"` 通配**，计划已写明「不许照抄」；`.tmp/e2e-r33-bug-a2.mjs:38-50`（stub `showOpenFilePicker` + `Ctrl+Alt+o`，`workspace.ts:174-184` 的 `pickFile` 正好用这个 API）；`.tmp/e2e-r29-p2.mjs:74-77`（先点目录再点文件的严格写法）；`.tmp/e2e-r38-typora.mjs:32-33`（1×1 PNG data URL，与 `.tmp/r38-typora-e2e.json` 里 `naturalWidth:1` 的那张一致） |
| 「破图是因为 SPA 回退 200 text/html」 | ✅ | `.tmp/r38-typora-e2e.json`：`A_image[0]` `{src:"assets/a.png", complete:true, naturalWidth:0}`、`A_net[1]` `{url:"http://localhost:5175/assets/a.png", status:200, ct:"text/html"}` —— 所以 `## img-missing` 断 `errors:[]` 是可达的（没有 404 日志） |
| smartTyping 三处行号、现有 8 条、返回 `null` 的契约 | ✅ | `smartTyping.ts:33`（三参签名）、`:56-57`（`-- → —` 规则在 `:57`）、`:86` `parent`、`:100` `offset`、`:101-102` `before/after`；`:105-106` `if (!result) return false`（返回 null 才放行后续输入规则）；`smartTyping.test.ts` 实为 **8 条** `test(` |
| mermaidLazy 收集点与消费者 | ✅ | `mermaidLazy.ts:109-117`（`:111` `doc.forEach`，`blocks.push({ pos: offset, nodeSize, code, hash })`）；消费者只有 `mermaidPreview.ts:85`；widget 位置 `:88-95`（`pos + nodeSize`），计划说「不动」对 |
| T3 单测可建嵌套 doc | ✅ | `mermaidLazy.test.ts:88-109` 用 `schema.nodeFromJSON`（`:89`）；StarterKit 的 `listItem: paragraph block*`、`blockquote: block+` 都容得下 `codeBlock` |
| 文档行号全部对得上 | ✅ | `README.md:46`（能力句）、`:76`（限制句）、`:78`（智能标点限制长行）、`:82`（`已有 28 项，缺 12 项`）、`:100`（310,000/320,000 + 288,411）、`:102`（`898,601`）、`:119`（`23 个文件、301 条断言`）；`AGENTS.md:39`（§3 门禁行）、`:72`（测试 23 文件 301 条）、`:74`（`28 项有、12 项缺`）；`docs/CHANGELOG.md:5`（`## Unreleased（第 29–37 轮，未发版）`）；`docs/adr/0017-mermaid-lazy-loading.md:106-111`（`:110` 是「两段相同代码各渲染一次」）；`package.json:15` = `test` 脚本（逐文件枚举 **23** 个 `*.test.ts`，新文件必须手加） |
| §5 改前对照全部为真 | ✅ 逐条实跑 | `hostModeRef.current` **12**（行号逐个一致）、`301 条` **3**（AGENTS 2 + README 1）、`23 个文件` **3**、`[^A-Za-z]Image\.configure` **1**（`:767`）、`ResolvingImage` **0**、`setAssetDocPath` **0**、`getAssetVersion` **0**、`getResolvedAsset` **0**、`subscribeResolved` **0**、`lineBefore` **0**、`resolveImage`/`assetTick`/`assetsVersion` **0**、`startsWith\(space\.name` **0**、`doc.forEach`（mermaidLazy）**1**（`:111`）、`descendants`（mermaidLazy）**0** |
| 硬约束 | ✅ 不违反 | 不换内核、不碰序列化（T1 只改 DOM/图片解析，T3 只换收集方式）、无新运行时依赖（只用浏览器自带 `URL.createObjectURL`）、blob 不进正文（`assetImage` 只写 DOM，`getHTML()` 走节点 attrs）、首屏预估 +1.0–1.4 KB gzip（现 288,411，内部线 310,000 余 21,589 B）、§0.1 的预算常量本轮不动（`git grep -nE "50000000\|45000000"` 仓库内 0 命中，与计划一致） |

---

## 三、漏洞（按严重度，最多 6 条）

### R3-1（P1）· R2-3 的锁 `## img-preview-from-source` 能不能红，取决于一个计划没写的前置：开 `引用.md` 时编辑器是否挂载

**问题**

计划把这个段当成 R2-3 的唯一锁：`plan.md:137`「`## img-preview-from-source`（R2-3）：开 `引用.md`（载入即源码）→ `Ctrl+Shift+P` → `.preview-pane img` 的 `naturalWidth:1`、`srcBlob:true`、`heading:'引用'`」，并在 `plan.md:112` 给出理由「源码模式下没有 NodeView（`@tiptap/core:6697/6784`），**这条只能靠预览自己解析**」。**这句理由不成立于计划给的执行顺序**：

1. `loadIntoEditor` 是先 `setMarkdown`（`App.tsx:2029`）、后 `enterSourceFor`（`:2078`）。也就是说，**图片节点的 NodeView 是在「编辑器还挂着」的那一刻创建的**——只要载入之前 `viewMode` 不是 `source`/`preview`。
2. NodeView 创建时就会 `void resolveAsset(src)`（`plan.md:94` 的 `addNodeView` 设计），解析是模块级缓存（`plan.md:93`），`destroy` 只退订不 revoke（`plan.md:94`）。所以进源码模式把编辑器卸掉之后，**缓存已经是热的**。
3. 于是预览面板拿到的 `getResolvedAsset('assets/c.png')` 直接命中 → 图片显示 → `naturalWidth:1`、`srcBlob:true` **全绿**。把 `PreviewPane` 那个「自发起解析」的 effect（`plan.md:101` ③，R2-3 的核心）整段删掉，这一段照样绿。
4. 计划 §3 的执行顺序也保证不了前置：`## img-preview-from-source` 排在 `## img-missing`（编辑视图）之后、`## img-preview` 之后。`## img-preview` 自己结尾停在哪个视图**计划没写**（`plan.md:136` 只说「从编辑视图按 `Ctrl+Shift+P` 进预览」）；常见执行是切回编辑视图收尾，于是 `引用.md` 在**编辑视图**里被打开 → 热缓存 → 假绿。反过来，如果 `## img-preview` 停在预览、直接从预览点 `引用.md`，`setMarkdown` 才会打到 Proxy 上（冷缓存）——**同一段验收，红绿取决于上一段怎么收尾**。
5. 后果与 R2-1 同型：R2-3 修的是「源码态载入 → 预览永久破图」（可复现路径：先停在源码模式，再从文件树点另一篇含引用式定义的文档），这条锁抓不到它。执行代理照计划做完、E2E 全绿，`README.md:46` 与 `docs/typora-gap.md` 就会写「预览面板里正常显示」，而缺陷可能仍在。

**证据**：`plan.md:112`（错误理由）、`:137`（段判据）、`:101`（`PreviewPane` 自解析）、`:94`（NodeView 只在创建时解析、`destroy` 不 revoke）、`:93`（缓存归模块）、`:96`（effect B 预热）；`App.tsx:2029`（`setMarkdown` 早于 `:2078`）、`:972-991`（同步 `editor.view.dispatch`）、`:4795`/`:4817-4819`（`EditorContent` 只在编辑视图挂载）、`:708`（`__slState.viewMode` 已导出）；`@tiptap/core` `:6697-6704`（`unmount` 置 null）、`:6784-6803`（Proxy）、`:6808-6814`（无 view 时 `state` = `editorState`）。

**修法**（两条都便宜，建议全做；① 治本，② 给证据加一道「确实冷」的物证）

1. 让「冷缓存」成为**与上一段无关**的事实：在 `引用.md` 之后再加一篇同型的 `引用2.md`（种子 `'引用2.md': '# 引用2\n\n![丁](assets/d.png)\n\n[链接2][1]\n\n[1]: https://example.com\n'` + `'assets/d.png': IMG_B`，src 与 `assets/c.png` 不同即不同缓存键）。段内的步骤写死：开 `引用.md` → 断言 `__slState.viewMode === 'source'` → 点 `[data-path="示例文集/引用2.md"]`（**此刻仍停在源码，编辑器必然卸载**）→ 断言 `name === '引用2.md'`、`viewMode === 'source'`、`document.querySelector('.doc-column .ProseMirror') === null` → 再 `Ctrl+Shift+P` → 断言 `.preview-pane img` 的 `naturalWidth:1`、`srcBlob:true`、`.preview-pane h1` 文本 `引用2`。第二篇的载入 dispatch 一定打在 Proxy 上，缓存一定空，这段才真正锁住 R2-3。
2. 顺手把它当复现用（与计划「先复现别跳」的口径一致）：**步骤 2（只改编辑视图）跑完就先把这一段跑一次，记录 `naturalWidth:0` 的红**，再进步骤 3 接预览、同一段转绿。红→绿两次输出都贴进 `impl.md`，tester 才能分辨是真修掉还是假绿。
3. `plan.md:112` 的理由句要改：不是「源码模式下没有 NodeView」——而是「**在源码模式下载入的文档**没有 NodeView」，并写明这个前置怎么造（见 ①）。

---

### R3-2（P2）· 图片从默认渲染换成 NodeView 后，没有任何选中 / 删除 / 撤销的回归断言

**问题**

`plan.md:94` 把图片节点整个换成自定义 NodeView（`ResolvingImage.addNodeView()`），这是本轮唯一动到「编辑视图里图片怎么呈现」的改动；`plan.md:148` 也把它列为风险（「NodeView 破坏图片的选中/拖拽/删除」）。但十段 E2E 里**没有一段**看图片的选择与删除，插图后立刻显示又已按 §9 记成 UNVERIFIED（`plan.md:141`）。也就是说：这一版跑完全绿，也可能用户点不中图、选中后按 Delete 删不掉、Ctrl+Z 撤不回——这些属于既有能力（`README.md:46` 图片插入、`typora-gap.md:23`「图片拖入与粘贴：有」），坏了就是回归，而本轮一条断言都不会红。

计划给的退路（改用插件就地改 DOM，`plan.md:148`）是「坏了以后怎么办」，不是「怎么发现坏了」。

顺带一条已核实的好消息：**拖拽不会因为换 NodeView 丢**。`prosemirror-view/dist/index.js:3467-3479` 在 mousedown 时对 `spec.draggable` 的节点补 `this.target.draggable = true`，`:1518-1523` `selectNode()` 给 `nodeDOM` 加 `ProseMirror-selectednode`（自定义 NodeView 的 `nodeDOM` 就是那个 `<img>`）。所以断言写得出来、也该写。

**证据**：`plan.md:94`（NodeView 设计）、`:141`（`## img-insert` 不在本轮）、`:148`（风险清单）、`:130-140`（十段里无选择/删除）；`node_modules/@tiptap/extension-image/dist/index.js`（`Image` 是 `atom`/`draggable` 块级叶节点）；`node_modules/prosemirror-view/dist/index.js:1518-1523`、`:3467-3479`；`README.md:46`。

**修法**：在 `## img-bytes` 之后（此时文档已保存、内容与磁盘一致）加 4 行断言，不新增段落、不新增种子：

```
点 [data-path="示例文集/图.md"] 里的 img → .ProseMirror img.ProseMirror-selectednode 数量 === 1
按 Delete → .ProseMirror img 数量 === 0
按 Ctrl+Z → .ProseMirror img 数量 === 1 且 naturalWidth === 1、srcBlob === true
```

并在段尾记一句「这一段之后文档可能变 dirty，后面切文档一律用 `dismissSwitch`」。判据进 `## img-bytes` 的同一行输出（`imgSelectable`/`imgDeletable`/`imgUndoable` 三个布尔），不占新段。

---

### R3-3（P2）· `sub/子图.md` 的「0 处 `blob:`」是空断言：没保存过就读，读回的是种子原文

**问题**

`plan.md:134`：`## img-bytes` 要求 `savedHasRelative:true`、`savedHasBlob:false`，并写「`sub/子图.md` 也要读一次（0 处 `blob:`）」。但这一段里 `Ctrl+S` 只对**当前文档**（`图.md`）按了；`sub/子图.md` 从头到尾没有保存过，`readFakeFile(page, 'sub/子图.md')` 读回的就是 `.tmp/r30-fsa.mjs:155-157` 里 `state.files` 的**种子原文** `# 子图\n\n![乙](assets/b.png)\n` —— 它当然没有 `blob:`。真正的风险（跨目录那篇被写进 blob URL、或路径被改写）只有在保存后才可能出现在字节里，这条断言现在**无法变红**。而 `## img-cross-dir` 恰好是 P1-1 换目录那一半的唯一一篇文档，它的数据安全锁落空就更不该。

**证据**：`plan.md:134`、`:132`（`sub/子图.md` 是换目录那篇）、`plan.md:110`（种子）；`.tmp/r30-fsa.mjs:34-45`（只有 `createWritable().close()` 才会 `state.files.set`）、`:155-157`（`readFakeFile` 直接读 `state.files`）；`App.tsx:2029`/`3954-3981`（保存是唯一写盘点）。

**修法**：`## img-bytes` 里对 `sub/子图.md` 补一次完整保存再读：开 `sub/子图.md` → `Ctrl+S` → 等 800 ms + `dismissSwitch` → `readFakeFile(page, 'sub/子图.md')`，断 `savedHasRelative:true`、`savedHasBlob:false`，并把 `savedEqualsSeed` 作为**记录项**（同 `图.md` 的口径）。多 5 行、约 15 秒。

---

## 四、其余核对结论（不改判，供执行代理少踩）

1. **上一版 R2-3 的机制描述已被本轮推翻，这是对的，别再翻回去**：源码模式下 `editor.view` 是 Proxy（`@tiptap/core:6784-6803`），`dispatch` → `dispatchTransaction`（`:6987-7009`）只把新 state 写回 `editorState`，**不建 NodeView、不触发解析**；`getHTML()` 读 `this.state.doc`（`:7060-7061`），所以源码→预览的 html 本身是对的，坏的只有图片。计划 §2「根因补充 2」逐句成立。
2. **两条与「缓存生命周期」有关的实现细节，计划写了但容易做错**：① 保存**不会**触发 `refreshTree`（实查 `refreshTree(` 只在 `App.tsx:2363,2384,2422,2502,2651,4714`：改名/新建文件夹/删除/新建文件/另存为/手动刷新），所以保存不会 revoke 图片；② 但**新建、改名、删除、手动刷新**会 `setWorkspace` → effect A 重建 → `clearAssetCache()` 把全部 blob revoke，靠 effect B 重新预热。改完这几条路径后如果看到图片闪一下，是预期行为，别当缺陷。
3. **§4 的一处措辞自相矛盾，不影响执行**：`plan.md:260` 说「文件一律用精确选择器」，`plan.md:261-262` 对子目录文档又用 `[data-path$="sub/子图.md"]`。这条通配唯一（根文档已改名、两条路径不再同尾），再加上每段的 `name`/`heading` 身份断言兜底，不构成缺陷；执行时按 §4 的写法照抄即可，别为了「精确」把子目录那条改成 `aria-level` 组合（改错会超时）。
4. **`git grep` 的仓库级噪声，不要顺手改**：`28 项/12 项` 在 `docs/CHANGELOG.md:85` 还有一处、`301 条 / 23 个文件` 在 `docs/CHANGELOG.md:76` 与 `:86` 各一处——都是**历史轮次记录**，本轮不许动。计划的判据已经限定 `-- README.md AGENTS.md`，照那个口径跑就行。
5. **`.tmp/r30-fsa.mjs` 的 `getFile()` 改动要保住两件事**：文本分支的 `type: 'text/markdown'` 与 `lastModified: Date.now()`（`App.tsx:2063` 用它比草稿新旧），新增的 `data:` 分支也要给 `lastModified`。`createWritable().write()`（`:34-41`）**一行都不要动**——「插入后立刻显示」正是因为它才记 UNVERIFIED（`plan.md:352`）。
6. **单文件打开那条锁的有效性我核过了，它是有牙的**：`## img-single-file` 断 `naturalWidth:0`。若 resolver 漏了来源校验、而缓存又恰好还热（`setAssetDocPath` 换路径会 revoke，理论上不热），这张图会亮成工作区那张 → 该段必红；另外 `App.tsx:2205-2210` 确认 `path` 是裸名、`workspace.ts:147` 确认裸名会落到工作区根，两个前提都真。
7. **`## img-missing` 断 `errors:[]` 是可达的**：`.tmp/r38-typora-e2e.json` 记录破图请求是 `200 text/html`（不是 404），所以控制台不会出现「Failed to load resource」这类错误。别为了这个去改断言。
8. **预览面板的图片改写对「无公式文档」同样生效**：`PreviewPane.tsx:38` 的 `renderMath(bodyHtml)` 是无条件调用的（只有 `hasMath && !ready` 才提前返回 `''`，`:37`、`:41-47`）。所以 `内联.md`/`图.md` 这类没有公式的文档也会走 ④ 的 `img[src]` 重写——不要给它加 `hasMath` 分支，也别动 `:37`/`:41-47` 的提前返回（会让公式预览闪）。
9. **估时仍超口径，按计划的双代理切，别加活**：T1 33–36 分钟（已贴/略超 35 分钟上限）+ T2 7 + T3 9–10 = 单代理 49–53 分钟。本报告的 3 条修法合计约 +2–3 分钟（R3-1 多一篇种子与 4 行断言、R3-2 四行、R3-3 五行），A 侧仍是 35–38 分钟。单代理时按 `plan.md:249-253` 的降级顺序办：预览两段若记 UNVERIFIED，`README.md:46` 与差距表**只写编辑视图**（`:250` 已写死，别越界写成「预览也正常」）。
10. **§0.1 的口径冲突处理正确**：`common.md:5`（50,000,000 / 45,000,000）与 `common.md:36`、`README.md:100`、`packaging/*.ps1`（1,800,000 / 2,000,000）不一致，计划本轮**不改**任何预算常量、也不做 S1。改阈值会降低护栏敏感度，属政策落地，要根代理/产品负责人拍——这个取舍我不另立漏洞。
11. **`.tmp/e2e-r37-impl-t1.mjs:42` 的通配 `openDoc` 千万别照抄**（计划 `plan.md:15` 已明说）。另外 `page.click(selector)` 与 `page.locator(...).click()` 的严格性差异，本轮已不需要再赌：根文档用精确 `data-path` 字符串，两个 API 都不会歧义。
