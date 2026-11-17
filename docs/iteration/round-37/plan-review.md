# 第 37 轮 · 计划审查（critic，只读，revision=2）

- 轮次：round=37；轮前 `startSha=ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76`，本轮 `git rev-parse HEAD` 同值，`git status --short` 只有未跟踪的 `docs/iteration/round-37/`、`shots/round-37/`。
- 被审对象：`docs/iteration/round-37/plan.md`（`revision=2`，41664 B，08:38 写）。本文件是**第二轮**审查，取代 08:33 的第一版；第一版的 5 条漏洞（H1–H5）逐条核对结果见 §0。
- 核对方式：`read` 打开计划点到的每个文件/行号；用 3 个只读探针（`.tmp/critic-r37-verify2.mjs`、`.tmp/critic-r37-style2.mjs`、`.tmp/critic-r37-node2.mjs`）复量第一轮 critic 落盘的 `.tmp/critic-r37-svg-dump.svg`；用 `git grep` / `Select-String` 实跑计划里写出的每条改前对照命令。
- 只读：未改产品代码、未碰 `release/`、未 push、未重启 dev server、未另起浏览器。新增产物只有 `.tmp/critic-r37-*.mjs`（探针）与本文件。
- 结论：**PASS**。上一版的 P1（H1）与 P2（H2）已真修掉，不是改措辞：新增的 `<style>` 作用域、根 id 进 E2E 集合、computed style 硬断言、非 flowchart 同跑都在计划里落到了可执行语句，数字也与本轮实测一致。剩 6 条 P2，都是实现期可顺手改的规格精度问题，不阻塞执行；N1、N2 建议在派工提示里原样带上，否则会各浪费 5–10 分钟。

## 0. 上一版漏洞核对（H1–H5）

| 上一版 | 状态 | 依据（本轮实测） |
| :--- | :--- | :--- |
| H1（P1）`scopeSvgIds` 漏 `<style>` 作用域 | **已修** | `plan.md:122` 把替换范围定义成「该 id 的**全部出现**」，点名 `id="X"` / `#X`（含 `<style>` 选择器、`url(#X)`、`href="#X"`）/ `aria-*` token，并要求按长度降序 + `(?![A-Za-z0-9_-])` 边界、id 内正则元字符先转义；`:130` 要求 dump 后记 4 个数；`:139` E2E 的 id 集合写成 `[root.id, ...root.querySelectorAll('[id]').map(e => e.id)]`；`:149-150` 加 `getComputedStyle` 硬断言并让 `sequenceDiagram` 同跑；`:135-136` 单测 ③（`<style>` 里 `#id` 可解析）与 ④（颜色字面量不被改）。我复量 dump：`id="…"` **10** 个、`<style>` **4,171 B**、`#mermaid-preview-18` **59** 处、`url(#` **1**、`href="#` **0**、aria 引用 **0**、颜色字面量 **8** 种 —— 与计划 `:130` 的四个数完全一致，计划里的 8 个颜色也一字不差（`#333 #333333 #ECECFF #9370DB #552222 #000 #ffffde #aaaa33`）。结论：替换规则覆盖了真正会让样式掉光的 59 处作用域，旧 H1 的二选一陷阱消失。 |
| H2（P2）README 段位归属 + 差距表漏记 | **已修** | `README.md:50` 确在 `## 现在能做什么`（表格能力句），`README.md:74` 确在 `## 现在不能做什么`（标题 `:67`）；计划 `:74-75` 把能力句放 `:50`、把「列宽不写进 Markdown，重开按内容重新均分」放 `:74`，正确。`docs/typora-gap.md:29` 确在「已经有的」表，计划 T3 第 5 条（`plan.md:182`）改成改这一行、**不新增行**，28/12 计数不动。`git grep -n "拖拽改列宽" -- README.md docs/typora-gap.md` 本轮实测 **0**，与计划 `:290` 的改前值一致。 |
| H3（P2）caret 改动缺副作用验收 | **基本修掉**（留 N2、N6） | 计划改成 `focusSourceEditor(ratio?: number)` + `:3795` 传 `ratioOfSelection()` + `:4606` 不传（`:71-73`），并在验收 `:100` 加 `## caret-long`（`caretRatio ∈ [0.2,0.8]`、`scrollNotAtEnd`、`typedNotInStart`）。但仍有两处未收口：E2E 点击坐标会点空（N2）；横幅进源码的 `enterSourceFor` 路径依旧落 0（N6）。 |
| H4（P2）单代理 35 分钟做不完 | **已修** | `plan.md:247` 改成「必须两个 builder」并给出 A/B 分工与时间估算；`:249` 给出单代理降级方案（T1+T3 最小集，T2 顺延 38 轮）。文件集按人切分、无重叠（`:239-244`）。 |
| H5（P2）自设增量门槛会假 FAIL | **已修** | `:271` 与 `:277` 把真门限定为 `PASS` + `totalGzip ≤ 310,000` + `files=3` + 首屏集合无 `mermaid/lazy/katex`；`+500 / +600 / +1,100 B` 全部降为记录项，并写了「超 +1,600 B 由根代理决定」。`scripts/measure-first-screen.mjs:65-77` 的判定次序与这三条一致。 |

## 1. 本轮实际核对通过（不是只看计划文字）

| 计划点 | 核对结果 | 依据 |
| :--- | :--- | :--- |
| T1 表格 `resizable` | 可行：`Table` 默认 `resizable: false`，插件只在 `resizable && editor.isEditable` 时挂；`columnResizing` 已在静态依赖里（JS 增量 0 B 成立） | `node_modules/@tiptap/extension-table/dist/index.js:575`、`:769`；`node_modules/prosemirror-tables/dist/index.js:2354` |
| T1 注册点与 CSS 落点 | `ReusableTable` 在 `:757` 以裸扩展注册（改成 `.configure({ resizable: true })` 合法）；`.editor` 就是 `.ProseMirror` 本体 | `src/App.tsx:127-136`、`:757`、`:775`；`src/styles.css:559` |
| T1 拖拽可成 | `handleWidth` 默认 **5**，计划取 `right-2` 落在判定带内；`resize-cursor` 由插件 `props.attributes` 挂在同一元素上；handle 类名 `column-resize-handle` 是单元格内 widget，计划给 `td/th` 补 `position: relative` 是必需的 | `prosemirror-tables/dist/index.js:2354`、`:2374`、`:2417-2427` |
| T1 列宽能留住 | Tiptap 的 cell **定义了 `colwidth` 属性**（有 `parseHTML`），所以 `setNodeMarkup` 写进去的列宽不会被 schema 丢掉 | `@tiptap/extension-table/dist/index.js:122,165` |
| T1 `dirtyAfterDrag` 可测 | `window.__slState.dirty` 真实存在，E2E 可读 | `src/App.tsx:104`、`:688` |
| T1b 现状 | `focusSourceEditor` 现为无参箭头函数（`:335-336`）；调用点 `:527`（`fromLoad=false` 才聚焦）、`:3795`、`:4606` 内联 rAF（本轮读到的真实行）；`switchView` 里 `editor` 非空，`selection.from / doc.content.size` 取得到 | `src/App.tsx:335-336`、`:519-528`、`:3771-3799`、`:4602-4612` |
| T2 现状 | `listMermaidBlocks` 确为 `doc.forEach`（只顶层）；`svgCache`/`applyContent`/`refreshLivePreviews`/`makePreview` 位置与计划引用一致；`mermaid.render` 的 id 是 `mermaid-preview-${renderSeq}`，**同代码只渲染一次**（所以 id 重复只在同 hash 多 widget 时出现） | `src/lib/mermaidLazy.ts:97`、`:109-117`；`src/lib/mermaidPreview.ts:16`、`:23-46`、`:72-80` |
| T2 dump 事实（第一轮 critic 的 dump） | `styleBytes=4171`；`styleRefTokens=86`，其中 **59 个 `#根id` + 27 个颜色 token**；`unresolvedStyleRefs` 恰好是那 8 种颜色；唯一 `url(#…)` 在 **`marker-end` 属性**里（`urlInStyle=0`），不在 `<style>` —— 计划的 `#X` 全文替换能同时覆盖这两处；6 个 marker id 与根 id 互为前缀，边界断言必需 | `.tmp/critic-r37-verify2.mjs`、`.tmp/critic-r37-node2.mjs` 输出 |
| T2 computed style 断言可复现 | `<style>` 首条是 `#mermaid-preview-18{font-family:"trebuchet ms",…;fill:#333}`，另有 `#mermaid-preview-18 .node rect{fill:#ECECFF;…}`；`.node rect` 的内联 `style=""` 为空，不覆盖 CSS；每张 svg 只有 **1** 个 `<svg>` 根 → `svg:1` 可断言 | `.tmp/critic-r37-style2.mjs`；`.tmp/critic-r37-node2.mjs` |
| T2 单测可落 | `mermaidLazy.test.ts` 用 `getSchema([StarterKit])` 造真节点，改 `descendants` 后现有 4 条收集类测试不用重写（顶层 pos 语义不变） | `src/lib/mermaidLazy.test.ts:19,88-124` |
| T2 ADR 改前对照 | `docs/adr/0017-mermaid-lazy-loading.md:110` 一行里同时含「各渲染一次」「跨块共享」，各 1 命中；计划改写后的句子两个词都不再出现 | `git grep -n "各渲染一次\|跨块共享"`（两条各 1 命中） |
| T3 行号与算术 | 7 条要移的行确为 `:41,42,43,53,60,62,63`；`:27` 行内 HTML「有」行、`:40` 「缺」行都在；`:25/:51/:81/:29` 与计划描述一致；已有表 22 行、缺表 **18** 行、子标题 6/4/4/1/1/2 → 计划 28/12 与 3/3/2/1/1/2 自洽 | `docs/typora-gap.md:7,25-32,34,40-45,51-54,60-63,69,75,81-82` |
| T3 机械计数脚本 | 原样跑：改前 `have=23 miss=24`；按计划改后应为 `have=29 miss=18`（28 行 + 1 表头 / 12 行 + 6 子表头），脚本逻辑无 off-by-one | 本轮实跑（PowerShell） |
| 口径与门禁 | 首屏 310,000/320,000、当前 288,256 B、测试 23 文件 301 条、安装包 1,800,000/2,000,000 与 `STATE.md:52`、`README.md:100`、`measure-first-screen.mjs:19-20` 一致；T4 四条验收按 `:17,70-75` 逐条推演成立 | 本轮实读 + 实跑 |
| 改前对照（其他） | `resizable` 0、`descendants` 0、`scopeSvgIds` 0、`Select-String '^## 已经有的（22）','^## 缺的（17）'` = 2、`拖拽改列宽` 0：与计划 §5 一致 | 本轮实跑 |

## 2. 剩余漏洞（6 条，全 P2，按建议处理顺序）

### N1（P2，验收判据与真实数据冲突）T2 单测第 ③ 条按字面写会在真 dump 上必红

计划 `:135` 写「**`<style>` 文本里出现的每个 `#id` 都能在同一棵 svg 内找到同名 `id`**（H1 的核心：漏掉 `<style>` 时这条必红）」。实测 `<style>` 里 `#token` 共 **86** 个：59 个 `#<根id>` + **27 个颜色**（`#333`、`#ECECFF`、`#9370DB`、`#552222`、`#333333`、`#000`、`#ffffde`、`#aaaa33`）。按字面「style 里每个 `#token` 都要能在 svg 内解析」，27 个颜色必判未解析，测试红。

**修法**：把 ③ 的范围钉在「输入 svg 的 id 集合」上，写成可执行三条——
1. 对每个 `id`：`输出里 '#<prefix>'+id 的出现次数 === 输入里 '#<id>' 的出现次数`（根 id 为 59）；
2. 输出里 `'#'+<prefix>+id` 能在本 svg 的 `[id]` 集合里找到同名元素；
3. 输出里**未加前缀**的 `'#'+<根id>` 出现 **0** 次。
这样「漏掉 `<style>`」= 第 3 条红（59 次未加前缀），「泛替换 `#word`」= 第 ④ 条红，两条互不重叠。

### N2（P2，E2E 会点空，进而可能把正确修法回退）`## caret-long` 的点击坐标落在视口外

计划 `:89` 写「在正文**中部**单击（`.ProseMirror` 盒高的 55% 处）」。200 行文档的 `.ProseMirror` 盒高有数千像素（行高约 34 px × 120 段 + 段间距），远高于 900 px 左右的视口；`page.mouse.click(x, box.y + box.height*0.55)` 的 y 超出 `innerHeight`，浏览器不会滚动，点击落空 → 富文本 caret 仍在文首 → `selection.from = 0` → `caretRatio = 0` → `caretNotStart:false` 判红。而计划 `:111` 给的退路是「`caretRatio` 落到 0 或 1 → 真不行就回退『不挪 caret』」，于是**测试的假红会被当成修法不可靠，把一个正确修法回退掉**。

**修法**：点击改成按视口或按元素——① `await page.mouse.click(300, Math.round(await page.evaluate(() => innerHeight * 0.55)))`（先 `Ctrl+Home`、等一帧，保证能滚）；或 ② 更稳：`const ps = page.locator('.ProseMirror p'); await ps.nth(60).click()`（Playwright 自动滚动到可见），再取 `selection.from`。判据 `caretRatio ∈ [0.2,0.8]` 保留。

### N3（P2，正向对照拿不到）§5 表里改前对照的那条 `git grep` 用 `-E` + `\|`，改前实测是 0 不是 2

计划 `:286` 写 `git grep -nE "22 项有\|17 项缺\|已有 22 项\|缺 17 项" …` 改前 **2**、改后 0。`-E` 下 `\|` 是**字面竖线**（AGENTS §8 的同一条坑），本轮实跑该命令 = **0 命中**；换成不带反斜杠的 `|` 才是 2 命中（`README.md:82`、`AGENTS.md:74`）。T3 验收块（`:204`）那条是对的，错的是 §5 这张「planner 本轮实测」表。

**修法**：§5 该行改成 `git grep -nE "22 项有|17 项缺|已有 22 项|缺 17 项" -- …`（或删 `-E` 保留 `\|`），并把本轮 2 → 改后 0 的两行输出贴进 `impl.md`；否则 `impl.md` 里会出现「改前 0、改后 0」的假对照。

### N4（P2，自检判据算错）T3「总行数只多 1 行」与计划自己的算术矛盾

计划 `:209` 写「`git diff --stat` … 总行数只多 1 行（新图片行）」。按同一份计划的算术：已有 `22 − 1 + 7 = 28`（+6 行），缺的 `18 − 7 + 1 = 12`（−6 行），合计 **40 → 40，净增 0 行**。diff 里是 12 插 / 12 删（7 移动 + 1 删 + 1 增 + 4 改写两侧各计一次）。做完按原判据对不上数，容易误判「少写了一行」而去补一行，反而把 28/12 破坏。

**修法**：改成「表格数据行净增 **0**；`git diff` 约 12 插 / 12 删；36→40 行的算术是 22−1+7 与 18−7+1」，或直接删掉行数断言，只留 `have=29 miss=18` 与 28/12 两个标题。

### N5（P2，交接会漏）T2 的 README:77 / CHANGELOG 条目没有兜底责任人

计划把 `README.md:77`（T3 第 9 条，`:189`）与 CHANGELOG 的 T2 条目都排给 A（`:242`），判据是「`git grep -n "scopeSvgIds" -- src/` 有命中才改，否则不要动」。但 §3（`:237-245`）里 A2 与 B1 **并行**，且 A 估 25–30 分、B 估 28–33 分：B 晚于 A2 完成是大概率，A2 当时 `scopeSvgIds` 为 0 → README:77 保持旧说法、CHANGELOG 缺 T2 两条；而 §3「收尾」只列了 `STATE.md` 与 `README.md:100`。结果就是 T2 落地但能力表/CHANGELOG 当天仍是旧话——正是 H2 那类问题。

**修法**：§3「收尾」加一行：**根代理在 B1 结束后跑 `git grep -n "scopeSvgIds" -- src/`，有命中就补 `README.md:77` 与 CHANGELOG 第 37 轮的 T2 两条**（T2 的条目原文由 B 写进 `impl.md`）；或干脆把这两处整体划给 B（它们与 A 的 README 段不重叠）。

### N6（P2，修法只覆盖一个入口）横幅进源码仍落 caret 0，而 CHANGELOG 写成「进源码后光标落在原位置附近」

计划只改 `switchView` 的 `:3795`。但「从横幅/确认框进源码」走的是 `openSourceOriginal` → `enterSourceFor(text)`（`text` 非 null、`fromLoad` 缺省 false）→ `:527 focusSourceEditor()`（无 ratio）→ caret 仍在 0，首次击键还是插到文首。可触达入口真实存在：`src/App.tsx:4763` 的横幅按钮、`:4961`、`:4984` 的确认框主按钮。计划 `:76` 的 CHANGELOG 句子「进源码后光标落在原位置附近，不再插到文首」对这两条入口不成立，属于过度承诺。

**修法**：`enterSourceFor` 增加可选 `ratio` 参数并在这两个调用点传比例（或至少在这两条路径按 `sourceText` 长度落末端），在 `impl.md` 写明「Ctrl+/ 与横幅两条入口都修」；若决定只修 Ctrl+/，就把 CHANGELOG 句子限定成「`Ctrl+/` 进源码后…」，并在验收里补一句「横幅入口不在本次范围」。

## 3. UNVERIFIED（本轮没做的验证）

| 项 | 为什么 | 怎么补 |
| :--- | :--- | :--- |
| 表格拖拽的真实可拖性（handle 出现、`colwidth` 落进 `colgroup`） | critic 只读，没有跑鼠标拖拽 | 按 T1 步骤 3 的 E2E 跑；判据看 `th` 宽度差与 `col.style.width` |
| `scopeSvgIds` 改写后 DOM 的可见正确性 | 本轮只量了改前 dump，没实现改写 | `## style-intact` / `## seq-style` 的 computed style + 截图 |
| 长文 caret 修复后的滚动行为 | 需要先改代码 | 按 N2 修正点击坐标后的 `## caret-long` |
| `sequenceDiagram` 的 `<style>` 是否同样按根 id 作用域 | 本轮没有该图型的 dump | T2 步骤 1 顺手 dump 一张时序图，记 `#根id` 处数 |
| 宿主（WebView2）里的表格拖拽、源码 caret、Mermaid | 本轮只用 CDP 9222 | 下一次宿主轮 `host-smoke` 加断言 |
