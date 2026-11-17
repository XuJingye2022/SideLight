# 第 37 轮计划（planner）

- 轮次：round=37；轮前 `startSha=ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76`（`docs: round-36 看板记录提交哈希`），写本文件时 `git rev-parse HEAD` 相同。
- 输入：`round-37/findings-bug.md`（2 条 P2）、`findings-typora.md`（10 条）、`findings-ship.md`（5 条）全部读完；另读 `docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`、`docs/adr/0017-mermaid-lazy-loading.md`、`git log -8` 与下列源码/脚本：`src/App.tsx`（`:127-136`、`:335-336`、`:757`、`:4787-4792`）、`src/styles.css:559-714`、`src/lib/mermaidLazy.ts`、`src/lib/mermaidPreview.ts`、`src/lib/mermaidLazy.test.ts`、`scripts/measure-first-screen.mjs`、`node_modules/@tiptap/extension-table/dist/index.js`、`node_modules/prosemirror-tables/dist/index.js:2282-2343`。
- 只读：本轮 planner 只写本文件；未改产品代码、未跑 E2E、未碰 `release/`、未 push。
- **修订：revision=2（第 2 次修订，planner-revision，只读）**。依据 `round-37/plan-review.md` 的 5 条漏洞重写 T1/T2/T3 的可执行部分。本文件现在就是执行版；下面 §0.1 是逐条改动，改完后 §2 的每条验收都能被 E2E/命令判真假。

### 0.1 本次修订改了什么（对应 plan-review 漏洞）

| 漏洞 | 修订动作 | 落在 |
| :--- | :--- | :--- |
| H1（P1）`scopeSvgIds` 漏 `<style>` 作用域 | 替换范围改成「该 id 的全部出现」（含 `<style>` 里的 `#X`）；dump 记 4 个数（`id=` 10 / `<style>` 4,171 B / `#<根id>` 59 / `url(#` 1）；E2E 的 id 集合**含根 svg 自身**；加 computed style 硬断言 + `sequenceDiagram` 同跑；单测加「`<style>` 里每个 `#id` 都能在本 svg 解析」与「颜色字面量不被改」 | §2 T2 |
| H2（P2）README 段位归属 + 差距表漏记 | 能力句进 `README.md:50`；`:74` 只留限制句；T3 第 5 条改成 `:29` 补「表头边界可拖拽改列宽」，**不新增行** | §2 T1、T3 |
| H3（P2）caret 改动缺副作用验收 | 改成按选区比例落 caret（新签名 `focusSourceEditor(ratio?)`）；`:4606` **不传 ratio**（关查找条不动 caret）；新增 ≥200 行文档的 `## caret-long` E2E，测 `selectionStart` 比例、`scrollTop` 不在文末、键入落在光标处 | §2 T1 |
| H4（P2）单代理 35 分钟做不完 | §3 改为**必须两个 builder**；若只能派一个：T1 + T3 最小集，**T2 整体顺延第 38 轮** | §3 |
| H5（P2）自设增量门槛会假 FAIL | §5 真门只留 `PASS + totalGzip ≤ 310,000 + files=3 + 无 mermaid/lazy/katex`；+500 / +600 / +1,100 B 全部降为**记录项** | §5、T1/T2 验收 |

修订前的核对（只读，未改产品代码）：`.tmp/critic-r37-svg-dump.svg` 上用 `.tmp/r37-planrev-probe*.mjs` 复核了 H1 的数字（`id=` 10、`<style>` 4,171 B、`#<根id>` 59、`url(#` 1、`href="#` 0、8 个颜色字面量、`.node rect` 规则存在且 `fill:#ECECFF`），`read` 复核了 `src/App.tsx:335-336/:519-528/:3795/:4606`、`src/lib/mermaidPreview.ts:16-126`、`src/lib/mermaidLazy.ts`、`src/lib/mermaidLazy.test.ts`、`README.md:50/:67/:74/:77/:82`、`docs/typora-gap.md:1-93`；改前线（`focusSourceEditor(` 2 处、`resizable` 0、`descendants` 0、`scopeSvgIds` 0、`拖拽改列宽` 0）也是本轮实测。

## 0. 口径与环境（所有角色统一）

| 项 | 本轮值 | 依据 |
| :--- | :--- | :--- |
| 首屏 gzip 内部 / 硬线 | **310,000 / 320,000 B** | `scripts/measure-first-screen.mjs:19-20`、`README.md:100`、`STATE.md:52` |
| 本轮首屏实测 | **288,256 B**（余 21,744 / 31,744 B） | 第 36 轮 `npm run verify`；`findings-ship.md:15-24` 本轮复测同值 |
| 安装包内部 / 硬线 | 1,800,000 / 2,000,000 B（dry-run 1,299,777 B） | `packaging/installer.ps1:89-91`、`STATE.md:52` |
| 版本 | **不 bump** `package.json`（0.32.1） | 本轮全部任务都是 patch 级，且未发版区间还在累积 |
| CHANGELOG | 写进 `## Unreleased`（现为「第 29–36 轮」，加「第 37 轮」小节，标题行改 29–37） | `docs/CHANGELOG.md:5-79` |

**作废的数字（会让人按错口径判 FAIL）**：286,000 B 已于第 35 轮作废（`README.md:100`「2026-11-17 产品负责人放宽」；`docs/CHANGELOG.md` 里的 286,000 是历史记录，别改）。`.tmp/iteration/roles/planner.md:24` 仍写「首屏 gzip ≤286,000 B 是硬门」——那是**角色文件过期**，不在仓库里；本轮验收、critic、tester 一律用 310,000 / 320,000。调度器请顺手改掉那一行。

环境（必须遵守）：

- dev server 在 `http://localhost:5175`，**不另起、不重启**；`5173` 禁用。
- 浏览器**只用 CDP 9222**；不启动 Edge/Chrome、不 kill `msedge`、不 `browser.close()`。每条 E2E 前先 `node .tmp/reset.mjs 9222`。
- 构建纪律：实施期**不跑** `npm run build` / `npm run verify`（并发写 `dist/` 会互相清空）；类型检查用 `npx tsc --noEmit`；`npm test` 可随时跑；首屏字节由根代理在最终 `npm run verify` 串行量。
- 不 push、不改 `release/`、不改 `package.json` 版本。

## 1. 取舍：为什么是这 3 件 + 1 件可选

排序依据（`roles/planner.md`）：数据安全 > 用户可见收益 > 安装/体积/性能 > 内部质量；总量按一个执行代理 35 分钟内完成。

| 候选 | 来源 | 决定 | 理由 |
| :--- | :--- | :--- | :--- |
| 表格列宽拖拽 | typora P1-1 | **做（T1）** | 每天用；JS 已在主包，预计 0 B JS、只加 CSS；`@tiptap/extension-table@3.34` 原生支持（`dist/index.js:769-775`） |
| 源码框 caret 落位（STATE「下一轮优先 ①」） | STATE:57、第 36 轮观察 | **做（T1b，先复现）** | 若复现，击键插到**文首**是「字落在没想到的地方」；按选区比例落 caret 约 6 行，且与 T1 同文件，不增加一次上下文切换 |
| Mermaid 嵌套围栏不渲染 + 相同代码 id 重复 | bug P2 ×2 | **做（T2）** | 本轮唯一两条缺陷；第 36 轮刚交付 Mermaid、尚未发版，此时修边界最便宜；与 ADR-0017 矛盾，文档也得同步 |
| `docs/typora-gap.md` 过期（7 条已实现仍写「无」、3 处矛盾、计数错） | typora 第 2 节 | **做（T3）** | 0 B、纯文档；这是公开仓库/README 指向的能力表，错 7 条会误导用户与后续 finder |
| `measure-first-screen.mjs` 余量预警（余 <5% 才 WARN） | ship S3 | **可选（T4）** | 零字节、无用户可见收益；前 3 件排满 35 分钟后若还有 ≥5 分钟再做 |
| 砍 `architecture-beta` 等图类（安装包 −135～−400 KB） | ship S1 | **不做，报产品负责人** | 这会**删掉用户看得见的图类型**（AGENTS §1 说这必须回人）。且实测只能靠 `installer.ps1` 写 `release/`，本轮禁止。见 §7 延后清单 |
| CI dist 去重构建（每次省 2 次构建） | ship S4 | 不做 | 改 `ci.yml` 本机无法真验（不能跑 CI），属「改了也不知道对不对」；留到有 CI 观察机会的轮次 |
| `release/SHA256SUMS.txt` 0.26.0 残留 | ship S5 | 不做 | 要改 `packaging/installer.ps1` 并跑出包写 `release/`，本轮禁止；且用户可见真源是 Release 页 |
| 行内 HTML 白名单渲染（kbd/mark/sup/sub/u/br） | typora P1-2 | 不做 | 要新扩展 + 解析白名单 + 序列化保真回归，估 ≥15 分钟，与 T1/T2/T3 合起来会超 35 分钟；单独一轮 |
| 工作区相对路径图片显示 + `/__asset` | typora P1-3、STATE ③ | 不做 | 要改宿主 C# + 重建宿主 + `host-smoke`，属宿主轮；本轮没有宿主改动窗口 |
| 视图缩放（Ctrl+滚轮） | typora P1-4 | 不做 | 要回归页边批注坐标与「点链接就地编辑」坐标，单独一轮 |
| F8/F9 专注/打字机 | typora P2-9 | 不做 | 一行键位但要同步 `ShortcutsDialog` + README 键盘表，且 F8 与中文 IME 候选翻页未验 |
| `scripts/qa15.mjs` 因提示词拆分失效的 4 行 | STATE ⑤ | 不做 | 旧脚本，不影响本轮门禁；记 §7 |

## 2. 任务

### T1（P1，用户可见 + 数据安全）：表格列宽拖拽；源码框 caret 落位

**为什么**：中文表格不拖列宽就永远均分，长表格要横着读（Typora 有）；`findings-typora.md` 的探针 B 实测 `.column-resize-handle` 0 个、拖 90 px 列宽不变。另一半是 STATE 明确列的第 ① 项：进源码后第一次击键可能插到文首（第 36 轮验收观察，本轮**未复测**）。

**改动文件**

| 文件 | 改什么 |
| :--- | :--- |
| `src/App.tsx:757` | `ReusableTable` → `ReusableTable.configure({ resizable: true })` |
| `src/styles.css:685-714` | 在 `.editor .tableWrapper` 块后加 `.column-resize-handle` 竖线（`position:absolute; right:-2px; top:0; bottom:-2px; width:4px; background:var(--accent); pointer-events:none`）与 `.editor.resize-cursor { cursor: col-resize }`；给 `.editor th, .editor td` 补 `position: relative`（ProseMirror 把 handle 当 widget 插在单元格里，没有定位祖先会跑位） |
| `src/App.tsx:335-336` | `focusSourceEditor(ratio?: number)`：`focus()` 之后**只有传了 ratio 才挪 caret**，位置 = `Math.round(textarea.value.length * ratio)`（传 1 才是文末，不是默认文末）；`ratio` 缺省/非法 → 只聚焦、不碰选区（H3） |
| `src/App.tsx:3795` | `focusSourceEditor()` → `focusSourceEditor(ratioOfSelection())`：`ratioOfSelection = clamp01(editor.state.selection.from / Math.max(1, editor.state.doc.content.size))`。caret 落在原来写的位置附近，长文档进源码不再把视野甩到文末（H3） |
| `src/App.tsx:4606` | 这处内联的 `requestAnimationFrame(... textarea.source-editor ... focus())` 改调 `focusSourceEditor()`，**不传 ratio**：关查找条时不动 caret（否则一次关查找就丢写作位置）；与 `:3795` 共用同一函数，靠参数区分，注释写清为什么两条路径不同 |
| `README.md:50` | 表格那条**能力句**（在 `## 现在能做什么`）补「；表头边界可拖拽改列宽」（H2：能力不写进「不能做什么」） |
| `README.md:74` | 只补**限制句**「列宽**不写进 Markdown**，重开按内容重新均分」（该行在 `## 现在不能做什么`，标题在 `:67`） |
| `docs/CHANGELOG.md` | `## Unreleased` 末尾加「**第 37 轮**」小节，写 T1/T2/T3 三条（T3 的条目见 T3）；T1 条目写明「进源码后光标落在原位置附近，不再插到文首」 |

**实施步骤**

1. **先复现 1b（2 分钟）**：`node .tmp/reset.mjs 9222` → 开假工作区里任意文档 → `Ctrl+/` 进源码 → 读 `document.activeElement.classList`（应为 `source-editor`）与 `selectionStart`；`page.keyboard.type('ZZZ')` 后读 textarea 值。
   - `selectionStart === 0` 且 `ZZZ` 插在开头 → **确认缺陷，做上面的修复**。
   - 已在末尾（打字追加）→ **不写修复代码**，只把断言留在 E2E 里，`impl.md` 记「第 36 轮观察未复现」。
2. 做 1a：改 `ReusableTable.configure({ resizable: true })` + 三处 CSS。
3. 写 E2E `.tmp/e2e-r37-impl-t1.mjs`（用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `readFakeFile`，参照 `.tmp/e2e-r37-bug-mermaid2.mjs:1-65` 的连接与开文件夹顺序）：
   - 造 `表.md`：3 列表格（表头 `| 甲 | 乙 | 丙 |`）。
   - 打开 → 取第一格 `th` 的 `getBoundingClientRect()` → `mouse.move(right-2, 中线)` → 等 `.column-resize-handle` 出现（≤1 s）→ `mouse.down()` → `mouse.move(x+90, y, {steps:12})` → `mouse.up()`。
   - 读拖前后 `th` 宽度与 `colgroup col` 的 `style.width`。
4. 数据安全断言：拖前记 `window.__slState.dirty` 与 `readFakeFile(page,'表.md')`；拖后 `dirty` 应仍为 `false`（列宽不进 Markdown）；再 `Ctrl+S` → 等 800 ms → `readFakeFile` 与拖前**逐字节相同**。
5. **长文 caret E2E（H3，3 分钟）**：假工作区放 `长文.md`（≥200 行：`第 1 段…` 到 `第 120 段…`，每段一行）→ 打开 → 在正文**中部**单击（`.ProseMirror` 盒高的 55% 处）→ `Ctrl+/` → 读 `document.activeElement.className`、`textarea.selectionStart`、`textarea.value.length`、`textarea.scrollTop`、`scrollHeight`、`clientHeight`；再 `keyboard.type('ZZZ')` 后读 `selectionStart`、`value.startsWith('ZZZ')`。
   - 判据见验收 `## caret-long`。这一条是 H3 的核心：短文档（`表.md`）测不出「视野甩到文末」，**不要**用短文档顶替。
   - 顺带记录「关查找条不挪 caret」：源码模式下 `Ctrl+F` → `Esc`，`selectionStart` 应与开查找前相同（`:4606` 不传 ratio 的回归）。
6. 跑 `npx tsc --noEmit`、`npm test`、`npm run roundtrip`，把输出尾部写进 `impl.md`。
7. 截图：`shots/round-37/impl-table-resize.png`（拖后列宽明显不同 + handle 竖线可见）、`shots/round-37/impl-source-caret.png`（长文源码里 `ZZZ` 在光标处、视野不在文末）。

**验收标准（可执行）**

- 静态：`git grep -n "resizable: true" -- src/App.tsx` → 1 命中；`git grep -n "column-resize-handle" -- src/styles.css` → ≥1；`git grep -n "focusSourceEditor(" -- src/App.tsx` → ≥3（定义 + `:3795` + `:4606`）。
- E2E `## table-drag`：`handleSeen:true`、`widthBefore` vs `widthAfter` 第一列差 ≥10 px、`colwidthChanged:true`。
- E2E `## save-bytes`：`equalToBefore:true`（拖列宽后保存字节不变）；`dirtyAfterDrag:false`。
- E2E `## caret-long`（≥200 行文档）：`active:'TEXTAREA.source-editor'`、`caretNotStart:true`（`selectionStart > 0`）、`caretRatio` ∈ [0.2, 0.8]（`selectionStart / value.length`）、`scrollNotAtEnd:true`（`scrollTop < scrollHeight - clientHeight - 4`）、`typedNotAtStart:true`（`!value.startsWith('ZZZ')`）、`typedAtCaret:true`（打完后 `selectionStart === before + 3`）。
- E2E `## find-esc-caret`：`Ctrl+F` → `Esc` 后 `selectionStart` 与开查找前相同（`caretUnchanged:true`）。
- `npx tsc --noEmit` exit 0；`npm test` 23 文件 ≥301 条全过；`npm run roundtrip` rich 5/7、source 7/7（与第 36 轮同）。
- 体积（**记录项，不是失败判据**，H5）：根代理 `npm run verify` 后 `PASS` 且 `totalGzip ≤ 310,000`；把实测首屏字节与相对 288,256 的增量写进 `impl.md`（估 CSS ~200 B raw / <150 B gzip，JS 0 B）。`files=3` 不变、无 `mermaid|lazy|katex` 进首屏集合。

**风险与退路**

- 拖拽无效（handle 不出现）：先确认在**编辑视图**（`editor.isEditable` 为 true；源码/预览下 `columnResizing` 不加载，`extension-table/dist/index.js:769`），再看 `mousemove` 是否落在格子边缘 5 px 内（`handleWidth:5`）。仍无效 → 记录 UNVERIFIED 并回退 `resizable` 配置，**不要**为救断言去改 ProseMirror 内部。
- 列宽视觉不生效：`updateColumnsOnResize`（`prosemirror-tables/dist/index.js:2307-2343`）按 colwidth 设 `<col style="width:…">`；现有 `.editor table{width:100%}` 是 auto 布局，若被吃掉，只给**该表**加 `table-layout: fixed`（不要全局加，会改变老文档渲染），并截图对比。
- `colwidth` 可能漏进 HTML 导出（`TableCell.addAttributes` 的 `colwidth` 没有 `renderHTML`，拖过的表在 `getHTML()` 里可能多出 `colwidth="194,190"` 属性）：本轮**不改**（Markdown 不受影响，保存字节断言会兜住数据安全），在 `impl.md` 记一行实测结果；只有确认导出出现脏属性才给 `TableCell/TableHeader.extend` 加 `colwidth: { renderHTML: () => null }` 并补单测。
- `Ctrl+S` 在假工作区可能弹「切换文档」：先复用 `dismissSwitch('不保存')`（`.tmp/e2e-r37-bug-mermaid2.mjs:50-58`）。
- caret 比例落点可能落在一行中间：可接受（只决定下一次击键的插入位置）。若 `## caret-long` 的 `caretRatio` 落到 0 或 1，先查 `switchView` 里 `editor.state.selection.from / doc.content.size` 是否真取到（`editor` 在该回调里非空，`App.tsx:3773`）；**不要**退回到「一律文末」——那是 H3 否掉的方案。真不行就回退「不挪 caret」，在 `impl.md` 与 STATE 记「第 36 轮的 caret 缺陷未修，原因：比例落点不可靠」，不许悄悄只改一半。

### T2（P2 ×2，用户可见缺陷 + 实现/ADR 一致）：Mermaid 嵌套围栏渲染；相同代码的 SVG id 按实例唯一

**为什么**：`findings-bug.md` 第 1 条——列表项/引用块里的 ```mermaid 围栏**静默不渲染**（`.mermaid-preview` 0 个），用户分不清「没识别」和「图坏了」；第 2 条——两段相同代码共用同一份 SVG 字符串，于是同一个 `id` 在 DOM 里出现两次（实测单张图解 `id=` 共 10 个：根 1 + 后代 9，见步骤 1），与 ADR-0017「各渲染一次」矛盾。第 36 轮的功能还没发版，现在修代价最低。

**改动文件**

| 文件 | 改什么 |
| :--- | :--- |
| `src/lib/mermaidLazy.ts:109-117` | `listMermaidBlocks` 从 `doc.forEach` 改 `doc.descendants((node, pos) => {…})`，收集任意深度的 `codeBlock`（`pos` 直接用回调位置；widget 位置仍是 `pos + nodeSize`） |
| `src/lib/mermaidLazy.ts`（新导出） | 纯函数 `scopeSvgIds(svg: string, prefix: string): string`。**替换范围是「该 id 的全部出现」**（H1）：先用 `[...svg.matchAll(/\sid="([^"]*)"/g)]` 收集 id 集合，按长度降序、逐个 `id.replace(/[.*+?^${}()\|[\]\\]/g, '\\$&')` 转义后，一次替换三类出现——① `id="X"` → `id="<prefix>X"`；② `#X` → `#<prefix>X`（同一规则覆盖 `<style>` 里的 `#X` 选择器、`url(#X)`、`href="#X"`），`#X` 后加 `(?![A-Za-z0-9_-])` 边界；③ `aria-labelledby`/`aria-describedby` 属性值按空白切 token，命中的 token 加前缀（实测 dump 里 0 处这类属性，规则保留、不作验收判据）。**禁止**用 `/#[A-Za-z0-9_-]+/` 泛替换：`<style>` 里有 8 个颜色字面量（`#333`、`#333333`、`#ECECFF`、`#9370DB`、`#552222`、`#000`、`#ffffde`、`#aaaa33`），泛替换会把配色改坏 |
| `src/lib/mermaidPreview.ts:16-56,72-80` | `applyContent(element, key, hash)` 增加实例键：插入前 `element.innerHTML = scopeSvgIds(svgCache.get(hash), prefixOf(key))`；`prefixOf` 取 key 的 pos 段（`mm${pos}-`），同一 widget 重建前缀稳定、不同 widget 前缀不同；`refreshLivePreviews(hash)` 改成按 key 算前缀；`svgCache` 仍存**未加前缀**的原始字符串（按 hash 复用），前缀只在插入时套 |
| `src/lib/mermaidLazy.test.ts` | 新增 ≥4 条单测（见验收） |
| `docs/adr/0017-mermaid-lazy-loading.md:106-111` | 改 `:110`：「两段相同代码**各得一份 DOM**；插入前把 SVG 内 id 与引用按实例加前缀（第 37 轮），DOM 节点不共用。渲染结果仍按代码 hash 复用。」；另加一行记录「嵌套围栏（列表项、引用块内）同样渲染」 |
| `docs/CHANGELOG.md`（条目原文交给 T1 的 owner 追加，避免两人同时编辑） | 上述两条 |

**实施步骤**

1. 先看真实 svg 的 id 与引用写法：假工作区开 `图.md`，取 `.mermaid-preview svg` 的 `outerHTML` `write` 到 `.tmp/mermaid-svg-dump.txt`（**不要**凭猜测写正则）。**必须记这 4 个数**（planner 已在 `.tmp/critic-r37-svg-dump.svg` 上复核过，一张 `graph TD / A --> B`）：`id="…"` 共 **10** 个（根 `mermaid-preview-18` + 后代 9 个：6 个 marker `mermaid-preview-18_flowchart-v2-*`、`L_A_B_0`、`flowchart-A-0`、`flowchart-B-1`）；`<style>` **4,171 B，59 处 `#mermaid-preview-18`**；`url(#` **1** 处；`href="#` **0** 处。再记 `<style>` 里 8 个颜色字面量。注意 critic 说的「9 个 id」是**后代数、不含根**，别照抄成 9。
2. 改 `listMermaidBlocks` 为 `descendants`；补单测（嵌套 listItem/blockquote 内围栏被收集、pos 单调、顶层行为不变）。
3. 实现 `scopeSvgIds` + 接线；补单测（6 条）：
   ① 两个前缀 → 两棵同源 svg 的 id 集合**交集为空**；
   ② 每个 `url(#…)`、`href="#…"` 都能在同一棵 svg 内找到同名 id；
   ③ **`<style>` 文本里出现的每个 `#id` 都能在同一棵 svg 内找到同名 `id`**（H1 的核心：漏掉 `<style>` 时这条必红）；
   ④ 颜色字面量不被改：输出仍含 `#ECECFF`、`#333`、`#9370DB`（防泛替换 `#word`）；
   ⑤ 没有 id 的 svg 原样返回；
   ⑥ 父子 id 交错（根 `A`，后代 `A_flowchart-v2-pointEnd`）时后代只加一次前缀，且 `id=` 与 `url(#…)` 同步。
4. 写 E2E `.tmp/e2e-r37-impl-t2.mjs`：假工作区放 `列表图.md`（列表项内两空格缩进围栏）、`引用图.md`（`> ```mermaid`）、`双图.md`（两段一模一样的 `graph TD` / `A --> B`）、`时序图.md`（`sequenceDiagram; A->>B: hi`）。逐篇等 `.mermaid-preview.is-ready`；对**每棵 svg**：`const root = p.querySelector('svg'); const ids = [root.id, ...root.querySelectorAll('[id]').map(e => e.id)]`（**根 svg 自己必须进集合**，否则根 id 重复永远测不出来），再从 `url(#…)`、`href="#…"`、`<style>` 里的 `#id` 逐个解析；并读 `getComputedStyle(root.querySelector('.node rect')).fill` 与 `getComputedStyle(root).fontFamily`。
5. 跑 `npx tsc --noEmit`、`npm test`、`npm run roundtrip`；截图 `shots/round-37/impl-mermaid-nested.png`（列表/引用里的图真的画出来）、`shots/round-37/impl-mermaid-dup.png`（两张相同图都在且配色一致）、`shots/round-37/impl-mermaid-seq.png`（时序图同跑）。
6. 把 CHANGELOG 条目原文、ADR 改动摘要写进 `impl.md`，由 T1 的 owner 或根代理合并进 `docs/CHANGELOG.md`。

**验收标准（可执行）**

- 静态：`git grep -n "descendants" -- src/lib/mermaidLazy.ts` → 1 命中；`git grep -n "scopeSvgIds" -- src/` → ≥2（定义 + 使用）。
- `npm test`：23 文件 **≥305 条**（301 + 新增 4 条起；以实际输出为准），全过；其中第 ③ 条（`<style>` 里每个 `#id` 可解析）与第 ④ 条（颜色字面量不被改）必须出现。
- E2E `## nested-list`：`previewCount≥1`、`isReady:true`、`svg:1`；`## nested-quote` 同。
- E2E `## dup-ids`：`svgs:2`、`totalIds` 与 `uniqueIds` **相等**（重复 id 0 个；**含根 svg 的 `id`**）、`refsResolved:true`（每棵 svg 的 `url(#…)`/`href="#…"` 都在自身内可解析）、`styleScoped:true`（每棵 svg 的 `<style>` 里每个 `#id` 都能在本 svg 内解析）。
- E2E `## style-intact`（H1 硬断言，不能只靠截图）：`双图.md` 两张图的 `nodeRectFill` 都是 `'rgb(236, 236, 255)'`（改前 `#ECECFF`）、`rootFontFamily` 均含 `trebuchet`。
- E2E `## seq-style`：`时序图.md` 的 `svg:1`、`styleScoped:true`、`rootFontFamily` 含 `trebuchet`（`<style>` 作用域与图类型无关，非 flowchart 必须同跑）。
- 首屏（**记录项，不是失败判据**，H5）：`npm run verify` `PASS` 且 `totalGzip ≤ 310,000`；实测增量写进 `impl.md`。首屏集合仍 `files=3`、无 `mermaidLoader`。
- ADR 不再写与实现不符的话：`git grep -n "各渲染一次\|跨块共享" -- docs/adr/0017-mermaid-lazy-loading.md` 改后 **0 命中**（改前各 1 命中，见 §5 对照表）。

**风险与退路**

- 前缀替换改坏 svg（箭头/标签丢）：先按步骤 1 dump 真实字符串；E2E 的 `refsResolved` 必须为 true，并**目视看截图**。
- **只改了 `id=` 没改 `<style>`**（H1 的坑）：表现出来是「图都在、id 全唯一、E2E 全过，但配色/字体掉光」。判据是 `## style-intact` / `## seq-style` 的 computed style；拿到 `rgb(0, 0, 0)` 或空串 → 回到 `scopeSvgIds` 补 `<style>` 分支，**不要**放松断言、也不要只靠截图判过。
- **泛替换 `#word` 把颜色改坏**（`#ECECFF` → `#prefixECECFF`）：单测第 ④ 条兜底；实现上只替换从 `id="…"` 收集到的 id，永不写 `/#[A-Za-z0-9_-]+/`。
- 前缀把 marker id 与根 id 串在一起（`mm12-mermaid-preview-18_flowchart-v2-pointEnd` 变成双重前缀）：替换按 id 长度降序 + `(?![A-Za-z0-9_-])` 边界，单测第 ⑥ 条兜底；`url(#…)` 必须与 `id=` 同步。
- 嵌套围栏的 widget 在列表里报错或被 ProseMirror 拒绝：退路是「顶层照旧渲染；嵌套块只加 `is-mermaid` 弱标记 + ADR 记已知限制」，此时 E2E 改断言「有提示、无静默」，并在 `impl.md` 明写降级（不许悄悄不改）。
- 两个 builder 同时改 `docs/CHANGELOG.md` 会互相覆盖：**本文件只允许 T1 的 owner 编辑** `docs/CHANGELOG.md` 与 `README.md`。

### T3（0 B，公开文档）：`docs/typora-gap.md` 全表复核 + 计数同步

**为什么**：`findings-typora.md` 第 2 节实测 7 条能力**已实现却仍写「无」**（自动配对、智能标点、缩进、大纲折叠、新建/重命名/删除、快速打开、最近文件），另 3 处表内自相矛盾；README 与 AGENTS 的「22 项有、17 项缺」也跟着错。这是公开仓的能力表，0 B 成本。

**改动文件**：`docs/typora-gap.md`（主）、`README.md:82`、`AGENTS.md:74`（只改那一句计数）、`README.md:77`（Mermaid 句子，见下）、`docs/CHANGELOG.md`（T1 的 owner 一起加）。`README.md:50/:74` 归 T1，不在这里重复改（同一个 owner A 做两件，避免抢文件）。**不改** `docs/iteration/STATE.md`（根代理轮末写）。

**必须做的具体修改**

1. **7 条从「缺的」移到「已经有的」**（`docs/typora-gap.md:41,42,43,53,60,62,63`），现状列写实测值：
   - 自动配对括号与引号：有（键盘输入时生效，设置可关，`src/lib/smartTyping.ts`）。
   - 智能标点：有（直引号/双连字符/省略号，设置可关）。
   - 缩进与反缩进：有（列表内 Tab/Shift+Tab；表格内 Tab 走格；正文 Tab 插 2 空格）。
   - 大纲折叠：有（会话内有效，不持久化）。
   - 新建、重命名、删除文件：有（删除进 `.sidelight/trash/`，可撤销）。
   - 快速打开（Ctrl+P）：有。
   - 最近文件：有（8 条，可清除，仅桌面版）。
2. **行内 HTML 只留「缺的」一行**：删掉 `:27` 的「有保真」行（`:40` 的「缺的」行已写「保真但不渲染」）。
3. **拆「字号与缩放」**：`:25` 改「字号缩放 | 有；设置里调 12–26，`Ctrl+=` / `Ctrl+-` 调大小，`Ctrl+Alt+0` 复位（`Ctrl+0` 是正文样式，不是复位，见 `README.md:54`）」；`:51` 改「视图缩放 | 无 | P1 | Ctrl+滚轮与比例重置」。
4. **主题**：`:81` 改「明 / 暗 / 跟随系统三档；无自定义主题」。
5. **表格行列（`:29`）**：现状列改成「有；光标在表格里时出现工具条，可增删行列与整表；**表头边界可拖拽改列宽**（第 37 轮 T1）；键盘 Tab 走格、Ctrl+Enter 加行、Ctrl+L 删行」。**不新增行**，28/12 的计数不动（H2：本轮刚落地的能力必须当天进能力表，否则能力表当天再次过期）。前提是 T1 已落地（执行顺序 A1 先于 A2）；T1 未做时这句不写。
6. **新增一行**（「缺的」→ 文件与工作区）：「工作区相对路径图片显示 | 无：`assets/a.png` 只写进正文，编辑器与预览都显示破图 | P1 | 第 32/33/34 轮连续记录，修复要宿主 `/__asset` 路由」。
7. **计数按行数重算**（见验收命令，**不要**照抄 `findings-typora.md` 的「29/10」——它没扣掉重复的「行内 HTML」行、也没算新增的图片行）：
   - `## 已经有的（28）` = 22 − 1（行内 HTML）+ 7（移入）。
   - `## 缺的（12）` = 18（现文件实际 18 行，标题写的 17 本来就少 1）− 7 + 1（新图片行）。
   - 子标题：编辑与格式（3）、视图与界面（3）、文件与工作区（2）、内容能力（1）、查找与表格操作（1）、外观（2）。
8. **README:82** 改「当前已有 28 项，缺 12 项（未含 `.md` 关联）」；**AGENTS.md:74** 结尾改「当前 28 项有、12 项缺」。
9. **README:77**（Mermaid 那句）：若 T2 已落地（`git grep -n "scopeSvgIds" -- src/` 有命中），把「同一文档里两段相同的代码各渲染一次」改成「同一文档里两段相同的代码各得一份 DOM，SVG id 按实例加前缀」；并补一句「列表项与引用块里的围栏同样渲染」。若 T2 未落地，这句**不要动**。

**验收标准（可执行）**

```powershell
# 1) 标题数字：各 1 命中
Select-String -Path docs/typora-gap.md -Pattern '^## 已经有的（28）','^## 缺的（12）'
# 2) 机械行数：有表 = 1 表头 + 28 条 = 29；缺表 = 6 子表头 + 12 条 = 18
$c = Get-Content docs/typora-gap.md -Encoding UTF8
$have = ($c | Select-String '^## 已经有的').LineNumber
$miss = ($c | Select-String '^## 缺的').LineNumber
$h = 0; for ($i = $have; $i -lt $miss - 1; $i++) { if ($c[$i] -match '^\|' -and $c[$i] -notmatch '^\|\s*:?-{2,}') { $h++ } }
$m = 0; for ($i = $miss; $i -lt $c.Count; $i++) { if ($c[$i] -match '^\|' -and $c[$i] -notmatch '^\|\s*:?-{2,}') { $m++ } }
"have=$h miss=$m"   # 应输出 have=29 miss=18
# 3) 旧计数残留：应 0 命中（README/AGENTS/差距表三处）
git grep -nE "22 项有|17 项缺|已有 22 项|缺 17 项" -- README.md AGENTS.md docs/typora-gap.md
```

- 同时把「改前 >0 命中、改后 0 命中」的对照贴进 `impl.md`（AGENTS §8 要求每条「0 命中」先贴正向对照）。
- 本轮能力已进能力表（H2）：`git grep -n "拖拽改列宽" -- README.md docs/typora-gap.md` → **2 命中**（`README.md:50` 能力句 + `docs/typora-gap.md:29`），改前 0 命中。
- `git diff --stat docs/typora-gap.md` 的行数变化与「7 条移动 + 1 条删除 + 1 条新增 + 4 处改写（`:25`、`:51`、`:81`、`:29`）」自洽，且总行数只多 1 行（新图片行）。

**风险**：计数手抖 → 只认上面命令的输出；改 `AGENTS.md` 时**只改那一句**（它是一整行长文，别整段重排）；STATE 不碰。

### T4（可选，剩余 ≥5 分钟才做）：首屏余量 <5% 时打 WARN（0 B）

**为什么**：`findings-ship.md` S3——余量从 21,744 B 降到 0 之间 CI 一句不说；现在距硬线只剩 9.9%，第 36 轮单轮就 +2,200 B。`scripts/measure-first-screen.mjs:70-72` 现只有「超内部预算」WARN。

**改动**：`scripts/measure-first-screen.mjs`，在内部预算 WARN 之后、硬线 FAIL 之前加：

```js
const headroom = max - totalGzip
if (headroom > 0 && headroom < max * 0.05) {
  console.log(`WARN 首屏距硬线 ${max} 只余 ${headroom} B（<5%），下一轮加静态代码前先算体积`)
}
```

不改参数、不改默认值、不改 exit 码（WARN 不 exit）；CI（`ci.yml:39`）已经调这个脚本，无需改 workflow。

**验收（用现有 `dist/`，不必重建）**

| 命令 | 期望 |
| :--- | :--- |
| `node scripts/measure-first-screen.mjs` | `headroom=31744`、**无** `WARN 首屏距硬线`、末行 `PASS`、exit 0 |
| `node scripts/measure-first-screen.mjs --max 300000` | 有 `WARN 首屏距硬线`（余 11,744 < 15,000）、仍 `PASS`、exit 0 |
| `node scripts/measure-first-screen.mjs --max 288000` | 仍 `FAIL 首屏 gzip … 超过上限 288000`、exit 1（WARN 不许吞 FAIL） |
| `node scripts/measure-first-screen.mjs --target 280000` | 不报 ENOENT（第 35 轮位置参数坑）、打出「超过内部预算 280000」、exit 0 |

## 3. 文件归属与执行顺序

| 阶段 | 谁 | 文件 | 备注 |
| :--- | :--- | :--- | :--- |
| A1 | builder A | `src/App.tsx`、`src/styles.css`（T1a 列宽 + T1b caret） | caret 按选区比例落位（H3）；`:4606` 不传 ratio；先复现再改 |
| A2 | builder A | `README.md:50/74/77/82`、`AGENTS.md:74`、`docs/typora-gap.md`、`docs/CHANGELOG.md`（T1 文档 + T3） | CHANGELOG 只由 A 写；B 把 T2 的条目原文交 A |
| B1 | builder B | `src/lib/mermaidLazy.ts`、`src/lib/mermaidPreview.ts`、`src/lib/mermaidLazy.test.ts`、`docs/adr/0017-mermaid-lazy-loading.md`（T2） | 不改 README/CHANGELOG，避免与 A 抢文件；`<style>` 作用域是 H1 的关键 |
| B2 | builder B | `scripts/measure-first-screen.mjs`（T4，可选） | 零字节，不随包发布 |
| 收尾 | 根代理 | `docs/iteration/STATE.md`、`README.md:100` 的首屏数字 | 只看 `npm run verify` 实测，不接受预估值 |

- **必须两个 builder**（H4）：A ≈ 25–30 分钟（T1 19 + 长文 caret E2E 4 + T3 12，复现与截图可省则更少），B ≈ 28–33 分钟（T2 含 H1 的 `<style>` 修法）。一个代理串行做是 55–65 分钟，超出「一个执行代理 35 分钟」的口径。
- 两人并行时文件集**互不重叠**（上表已切好）；两条 E2E 仍必须在 9222 上串行（CDP 只有一个鼠标）：先跑完的一方在 `impl.md` 记「E2E 已完成」，另一方再 `node .tmp/reset.mjs 9222` 后开跑。
- **若只能派一个代理**：只做 **T1 + T3 最小集**（7 条移入 + 计数 + `README.md:82`/`AGENTS.md:74` 两行），**T2 整体顺延第 38 轮**（写进 §7 与 `impl.md`）。Mermaid 第 36 轮才交付、尚未发版，晚一轮没有对外影响；不允许把 T1+T2 塞给一个人再压缩 E2E。
- T4 只在两人都提前收工（各自剩余 ≥5 分钟）时做；不做不影响本轮通过。

## 4. E2E 通用规则（T1/T2 一律适用）

- 每条脚本开头：`node .tmp/reset.mjs 9222`（关旧 localhost 页面 + 清 localStorage/IndexedDB）；连接抄 `scripts/acceptance.mjs` / `.tmp/e2e-r37-bug-mermaid2.mjs:5-11`。
- 造工作区用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace(page, files)`；读落盘字节用 `readFakeFile(page, path)`；**不要**自己再写一套 FSA 假盘。
- 选择器（第 37 轮实测踩过的）：`data-path` 带工作区名前缀，用 `[data-path$="/图.md"]`；文件树「⋯」是 treeitem 的兄弟，用 `.tree-row:has([data-path$="/乙.md"]) .tree-row-more`；mermaid 代码块里定位光标点 `pre code` 后按 `End`，不要 `Ctrl+End`。
- 等异步就绪用 `waitForFunction`（焦点靠 rAF、mermaid 靠 400 ms 防抖 + 首次下载、保存后写盘等 800 ms），不要 `waitForTimeout` 猜。
- 结尾 `await page.close()` 后 `process.exit(0)`；**不要** `browser.close()`（会断 CDP）。
- 改含中文的 `.tmp/*.mjs` 只用 `write` / `edit`，不要用 PowerShell 字符串替换（AGENTS §8）。
- 页面可能跑着 HMR 没应用的旧模块（AGENTS §8 第 8 条）：断言失败先确认页面里是**新代码**（用 ASCII 标记 dump，例如 `.column-resize-handle` 是否在 DOM、`textarea` 的 `selectionStart`），别急着改产品代码或放松断言；确认是 dev server 陈旧就报根代理，**不要自己重启 dev server**。
- 脚本与日志命名：`.tmp/e2e-r37-impl-t1.mjs`、`.tmp/e2e-r37-impl-t2.mjs`、`.tmp/e2e-r37-impl.log`（`## 段名` 格式，便于 tester 复跑）。

## 5. 门禁（每任务与整轮）

| 层级 | 命令 | 判据 |
| :--- | :--- | :--- |
| 每任务 | `npx tsc --noEmit` | exit 0 |
| 每任务 | `npm test` | 23 文件；T1 后 301 条、T2 后 ≥305 条（301 + H1 的 4 条单测起），全过（以输出为准） |
| T1/T2 | `npm run roundtrip` | rich 5/7、source 7/7 不退化 |
| 整轮（根代理串行） | `npm run build` | exit 0，`✓ built in …` |
| 整轮（根代理串行） | `npm run verify` | `PASS` + `totalGzip ≤ 310,000` + `files=3` + 首屏集合无 `mermaid` / `lazy` / `katex`；**增量是记录项**（实测写进 `impl.md` 与 STATE；超 +1,600 B 时给理由），不作失败判据（H5） |
| 整轮 | `npm test` | 同上；把文件数/条数写进 STATE |
| 整轮 | `git status --short` | 只有预期文件 + `docs/iteration/round-37/`、`shots/round-37/`；`release/` 无改动 |

**禁止**：为过体积门去动 `vite.config.ts` 的 alias / manualChunks / external；删包内 chunk；改预算数字；改 `package.json` 版本；改 `release/`。

> 口径（H5）：原稿写的「相对 288,256 增量 ≤ +1,100 B」是 planner 自己估的（T1 ≤500 + T2 ≤600），不是真门，遇到 +1,200 B 就回滚合格改动是错的。真门只有 `totalGzip ≤ 310,000`（内部）/ 320,000（硬线）；增量与估算差多少写进 `impl.md`，超 +1,600 B 时由根代理决定是否回退。

**改前对照（planner 本轮实测，实施后要复测同一命令并贴前后两行）**

| 命令 | 改前 | 改后应为 |
| :--- | ---: | :--- |
| `git grep -n "resizable" -- src/App.tsx \| Measure-Object` | 0 | 1 命中 |
| `git grep -n "descendants" -- src/lib/mermaidLazy.ts` | 0 | 1 命中 |
| `git grep -n "scopeSvgIds" -- src/` | 0 | ≥2 |
| `git grep -nE "22 项有\|17 项缺\|已有 22 项\|缺 17 项" -- README.md AGENTS.md docs/typora-gap.md` | **2**（README:82、AGENTS.md:74） | 0 |
| `Select-String docs/typora-gap.md '^## 已经有的（22）','^## 缺的（17）'` | **2** | 0（改成 28 / 12） |
| `git grep -n "各渲染一次" -- docs/adr/0017-mermaid-lazy-loading.md` | **1** | 0 |
| `git grep -n "跨块共享" -- docs/adr/0017-mermaid-lazy-loading.md` | **1** | 0 |
| `git grep -n "拖拽改列宽" -- README.md docs/typora-gap.md` | **0** | 2（`README.md:50` + `docs/typora-gap.md:29`，H2） |

## 6. 截图清单（`shots/round-37/`）

| 文件 | 内容 |
| :--- | :--- |
| `impl-table-resize.png` | 拖过列宽的 3 列表格，能看到 `column-resize-handle` 竖线与列宽差异 |
| `impl-source-caret.png` | 长文（≥200 行）进源码后光标在中部、视野在**文末之外**，输入的字落在光标处（不是文首，也不是文末） |
| `impl-mermaid-nested.png` | 列表项 / 引用块里的 `mermaid` 围栏已出图 |
| `impl-mermaid-dup.png` | 两段相同代码各出一张图，且两张配色一致（H1 的目视复核） |
| `impl-mermaid-seq.png` | `sequenceDiagram` 同跑：图在、配色在（`<style>` 作用域与图类型无关） |

## 7. 延后清单（本轮不做，原因 + 下一轮入口）

1. **安装包体积（ship S1，P1）**：Mermaid 家族占 `dist` 2,357,196 B（61.5%），下个版本安装包预计 1,297,630 B（已发版 824,209 B，+475 KB）。`architecture-beta` 相关 668,546 B 最省（估 −135 KB）。**删图类型是砍用户看得见的能力，必须先问产品负责人**；拿到批准后按「注册 3 类图建面 → 量 dist → 再跑 `installer.ps1`」做，先做 30 分钟可行性验证。
2. **CI dist 去重（S4）**：`ci.yml` 三处重复 `npm ci` + `npm run build`；改完本机验不了，等有 CI 观察窗口的轮次。
3. **`release/SHA256SUMS.txt` 残留（S5）**：要 `packaging/*.ps1` 写 `release/`，本轮禁止；而且用户可见真源是 Release 页。
4. **行内 HTML 白名单渲染（typora P1-2）**：单独一轮，含解析白名单、5 个 mark、`html.test.ts` 回归、导出断言。
5. **工作区相对路径图片显示 + `/__asset`（typora P1-3、STATE ③）**：宿主轮，要 `host/` + `host-mac/` 同路径 + `host-smoke`。
6. **视图缩放（typora P1-4）**：要回归页边批注坐标与就地编辑坐标。
7. **F8/F9（typora P2-9）**、**拖入 `.md` 打开（P2-6）**、**大纲折叠持久化（P2-7）**、**纯文本粘贴登记（P2-8）**、**正文字族/行高（P2-5）**：见 `findings-typora.md` 第 3 节，按 P2 排队。
8. **`scripts/qa15.mjs` 因提示词拆分失效的 4 行**（STATE ⑤）：旧脚本，不影响本轮门禁；等下一次有人维护它时一起修。
9. **`measure-first-screen.mjs` 余量 WARN（S3）**：若本轮做到 T4 则闭环，否则下一轮第一件事（2 分钟）。
10. **T2（Mermaid 嵌套围栏 + SVG id 按实例唯一）**：仅在「本轮只能派一个代理」时顺延到第 38 轮（§3）。Mermaid 第 36 轮才交付、尚未发版，晚一轮没有对外影响；**不要**为了塞进 35 分钟去砍 H1 的 `<style>` 断言。

## 8. 明确不属于本轮范围

- 不 bump 版本、不发版、不建 Release、不 push。
- 不改 `host/`、`host-mac/`、`packaging/`、`.github/workflows/`、`release/`（本轮没有能验证它们的条件）。
- 不引入任何新运行时/开发依赖（三个任务都不需要）。
- 不改 `docs/iteration/STATE.md`（根代理轮末统一写：首屏新字节、测试文件/条数、本轮任务结论、延后清单）。

## 9. UNVERIFIED 承接（本轮仍测不了，别当回归）

| 项 | 为什么 | 怎么补 |
| :--- | :--- | :--- |
| 宿主（WebView2）里的表格拖拽与源码框 caret | 本轮只用 CDP 9222 浏览器 | 下一次宿主轮 `host-smoke` 加一条 |
| 两段相同代码时箭头 marker 的**可见**正确性 | T2 用 computed style（`nodeRectFill`/`rootFontFamily`）+ id/引用断言覆盖；肉眼只截图 | 改一张图的代码后再看另一张图的箭头，与既有 Mermaid 回归同批 |
| `aria-labelledby`/`aria-describedby` 的 token 改写 | critic 的 dump 实测 0 处这类属性，规则写了但没有真实样本 | 下次 dump 到含 aria 引用的图（或非 flowchart 图）时补一条单测 |
| `<style>` 内 `#id` 在**暗色主题**下的配色 | 本轮 E2E 只在当前 `data-theme` 下断言 `fill`/`fontFamily` | 下一次主题回归时亮/暗两档各跑一次 `## style-intact` |
| 真实中文 IME 下的 caret / F8 | 无真人输入法 | 与既有 IME 项同批 |
| 表格 `resizable` 的 JS 增量确为 0 B | 本机不能实施期构建；由根代理 `npm run verify` 给出总增量 | 本轮 `impl.md` + STATE 记实测值 |
| `npm test` 在 CLI 下看不到 alias（历史项） | 环境问题 | 保持现状 |
