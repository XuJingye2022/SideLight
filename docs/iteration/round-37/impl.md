# 第 37 轮 · 实现报告（executor）

- 角色：executor（**本轮只有 1 个执行代理**，按 `plan.md` §3 的单代理降级方案执行）。
- 轮前 `startSha=ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76`；本文件写于实施结束、未 commit。
- 环境：dev server `http://localhost:5175`（未另起、未重启）、CDP 9222（未启动浏览器、未 kill `msedge`、未 `browser.close()`）、每次 E2E 前 `node .tmp/reset.mjs 9222`。
- 未 push、未改 `release/`、未改 `package.json` 版本、未新增依赖。

## 0. 范围决定（对计划 §3/§7 的服从）

| 计划任务 | 本轮状态 | 理由 |
| :--- | :--- | :--- |
| T1 表格列宽拖拽 + 源码框 caret 落位（P1） | **DONE** | 用户可见 + STATE 第 ① 项 |
| T3 `docs/typora-gap.md` 全表复核 + 计数（0 B） | **DONE** | 公开能力表过期 7 条 |
| T4 首屏余量 <5% WARN（0 B，可选） | **DONE** | 零字节、四条正反例全过、提前收工 |
| T2 Mermaid 嵌套围栏 + SVG id 按实例唯一（P2×2） | **DEFERRED → 第 38 轮** | 计划 §3「若只能派一个代理：只做 T1 + T3 最小集，**T2 整体顺延第 38 轮**」；§7 第 10 条同。不压缩 E2E、不砍 H1 的 `<style>` 断言。第 36 轮功能尚未发版，晚一轮无对外影响。 |

> 注：计划 §0 的构建纪律（实施期不跑 `build`/`verify`）服务的是「两个 builder 并发写 `dist/`」。本轮只有 1 个代理，T1/T2/T3/T4 全部落地后**串行跑了一次** `npm run build` + `node scripts/measure-first-screen.mjs`，把 executor 角色的 `build` 门与真实首屏增量（**+155 B**，288,256 → 288,411）一起补齐；`npm run verify` 仍未跑（留给根代理）。

T2 需要的 6 条单测、5 个数（`id=` 10 / `<style>` 4,171 B / `#根id` 59 / `url(#` 1 / `aria` 0）与 `scopeSvgIds` 规格原样留在 `plan.md` §2 T2，可直接照做。

## 1. 逐任务状态

### T1a 表格列宽拖拽 — DONE

| 改动 | 位置 |
| :--- | :--- |
| `ReusableTable` → `ReusableTable.configure({ resizable: true })`（`columnResizing` 本就在静态依赖里，JS 增量 0 B） | `src/App.tsx:778` |
| `.editor .column-resize-handle` 竖线（absolute / right:-2px / width:4px / `var(--accent)` / `pointer-events:none`）与 `.editor.resize-cursor { cursor: col-resize }` | `src/styles.css:690-703` |
| `.editor th, .editor td` 补 `position: relative`（handle 是插在单元格里的 widget，没有定位祖先会跑位） | `src/styles.css:719` |

E2E `.tmp/e2e-r37-impl-t1.mjs` → `.tmp/e2e-r37-impl.log`，假工作区 `表.md`（3 列，表头 `甲/乙/丙`），实测：

```
## table-drag {"handleSeen":true,"resizeCursorOnHover":true,"widthBefore":[192,192,192],
 "widthAfter":[278,144,144],"firstColDelta":86,"colwidthChanged":true,
 "colsBefore":["min-width: 25px;","min-width: 25px;","min-width: 25px;"],
 "colsAfter":["min-width: 25px; width: 278px;","min-width: 25px;","min-width: 25px;"],
 "tableLayout":"auto",
 "thOuterBefore":"<th><p>甲</p></th>",
 "thOuterAfter":"<th colwidth=\"278\"><p>甲</p><div class=\"column-resize-handle ProseMirror-widget\" contenteditable=\"false\"></div></th>",
 "dirtyAfterDrag":false}
## save-bytes {"equalToBefore":true,"bytesBeforeLen":67,"bytesAfterLen":67,"hasColwidth":false,"dirtyAfterSave":false}
```

- 验收 `## table-drag`：`handleSeen:true` ✓、首列差 86 px（≥10）✓、`colwidthChanged:true` ✓、悬停时 `.ProseMirror` 带 `resize-cursor` ✓。
- 验收 `## save-bytes`：拖完 + `Ctrl+S` 后字节与拖前逐字节相同（67 B）✓、`dirtyAfterDrag:false` ✓、落盘 Markdown 里 0 处 `colwidth` ✓。
- `table-layout` 实测仍是 `auto`，但 278/144/144 的列宽**已经生效**（`<col style="width: 278px">`），所以**没有**按计划退路给表格加 `table-layout: fixed`（不加就不会改变老文档渲染）。
- 截图：`shots/round-37/impl-table-resize.png`（第 1 列明显更宽，`甲｜乙` 边界有 accent 竖线）。

**已知脏属性（按计划「本轮不改」处理，只记录实测）**：拖过的表在 DOM/`getHTML()` 里多出 `colwidth="278"`（`thOuterAfter` 实测）。Markdown 不受影响（`hasColwidth:false`、字节相同）。HTML 导出用 `getHTML()` 序列化，因此**拖过的表导出 HTML 会带 `colwidth` 属性、但没有 `<colgroup>`**（宽度不会真的生效），属脏属性。修法是给 `TableCell`/`TableHeader` 的 `colwidth` 加 `renderHTML: () => null`；本轮**没做**，原因：它需要能跑 DOM 的测试（现有单测是 headless，prosemirror 的 `DOMSerializer`/tiptap `generateHTML` 都要 `document`），加 jsdom 会引依赖。写进 §5 留第 38 轮，用 E2E 断言代替单测。

### T1b 源码框 caret 按选区比例落位 — DONE

| 改动 | 位置 |
| :--- | :--- |
| `focusSourceEditor(ratio?)`：先 `setSelectionRange(round(len×ratio))` 再 `focus()`；`ratio` 缺省/非法只聚焦、不动选区 | `src/App.tsx:337-350` |
| 新增模块级 `caretRatioOf(editor)` = `clamp01(selection.from / max(1, doc.content.size))` | `src/App.tsx:352-356` |
| `enterSourceFor(text, fromLoad = false, caretRatio?)`，`!fromLoad` 时把比例透传下去 | `src/App.tsx:543-548` |
| `switchView` 进源码：`focusSourceEditor(caretRatioOf(editor))` | `src/App.tsx:3817` |
| 关查找条：改调 `focusSourceEditor()`，**不传 ratio**（一次 Esc 不丢写作位置） | `src/App.tsx:4629`（原处是内联 rAF） |
| 横幅/确认框两条入口也传比例（plan-review N6）：`openSourceOriginal` 与 `resolveSourceConfirm('restore')` | `src/App.tsx:3850`、`:3858`（deps 补 `editor`） |

E2E（120 段 / 242 行 / 3,857 字符长文，点第 60 段后 `Ctrl+/`，Plan-review N2 的点击坐标改法）：

```
## caret-long {"paras":120,"active":"TEXTAREA.source-editor","length":3857,"lines":242,
 "selectionStart":1936,"caretRatio":0.502,"caretNotStart":true,"caretRatioInRange":true,
 "scrollTop":2640,"scrollHeight":5855,"clientHeight":646,"scrollNotAtEnd":true,
 "typedNotAtStart":true,"typedAtCaret":true,"typedWindow":"来把文档撑长，验ZZZ证源码"}
## find-esc-caret {"findOpen":true,"findFocused":"find-input","caretBeforeFind":1939,"caretAfter":1939,
 "caretUnchanged":true,"focusAfter":"TEXTAREA.source-editor"}
```

验收逐条：`caretNotStart` ✓、`caretRatio` 0.502 ∈ [0.2,0.8] ✓、`scrollNotAtEnd` ✓、`typedNotAtStart` ✓、`typedAtCaret`（`selectionStart === before + 3`）✓、`## find-esc-caret` 的 `caretUnchanged` ✓。

**计划外的一处实现细节（实测支撑）**：`focus()` 与 `setSelectionRange()` 的顺序决定「caret 是否滚进视口」。先 focus 再设选区，实测 `scrollTop` 停在 **0**（caret 在第 121 行、视口在文首，击键后浏览器才跳过去）；改成**先设选区再 focus** 后 `scrollTop` = 2640 / 5209，caret 直接可见。两种顺序的 `selectionStart` 相同，所以「字落在哪」的断言都一样，差的是视野。理由写进注释（`src/App.tsx:337` 上方）。

截图：`shots/round-37/impl-source-caret.png`（源码框停在第 48–61 段，`ZZZ` 夹在第 61 段中间，视野不在文首也不在文末）。

### T3 `docs/typora-gap.md` 全表复核 + 计数 — DONE

按计划 §2 T3 的 9 条逐条做：

1. 7 条从「缺的」移进「已经有的」（自动配对括号与引号、智能标点、缩进与反缩进、大纲折叠、新建/重命名/删除文件、快速打开、最近文件），现状列写实测值。
2. 删掉「已经有的」里重复的「行内 HTML 有保真」行（「缺的」已有「保真但不渲染」）。
3. 「字号与缩放」拆成「字号缩放（有，`Ctrl+Alt+0` 复位，`Ctrl+0` 是正文样式）」与「视图缩放（无，Ctrl+滚轮与比例重置）」。
4. 主题改「明 / 暗 / 跟随系统三档；无自定义主题」。
5. 表格行列补「表头边界可拖拽改列宽（第 37 轮）」，**不新增行**。
6. 新增一条「工作区相对路径图片显示 | 无：`assets/a.png` 只写进正文，编辑器与预览都显示破图 | P1」。
7. 计数按行重算：已有 28 / 缺 12（子标题 3/3/2/1/1/2）。
8. `README.md:82`、`AGENTS.md`（§6 末句）改「28 项有、12 项缺」。
9. `README.md:77`（Mermaid 句）**不动**——T2 未落地，计划条件不成立。

验收命令实测（`docs/typora-gap.md:7`、`:40`）：

```
have=29 miss=18            # 有表 = 1 表头 + 28 行；缺表 = 6 子表头 + 12 行
hit: ## 已经有的（28）
hit: ## 缺的（12）
```

改前 → 改后正面对照（AGENTS §8：每条「0 命中」先贴改前 >0）：

| 命令 | 改前（`HEAD`） | 改后（工作区） |
| :--- | :--- | :--- |
| `git grep -nE "22 项有\|17 项缺\|已有 22 项\|缺 17 项" -- README.md AGENTS.md docs/typora-gap.md`（**`-E` 下用真 `\|`**，plan-review N3） | **2**（`README.md:82`、`AGENTS.md:74`） | **0**（exit 1） |
| `git grep -n "^## 已经有的（22）\|^## 缺的（17）" HEAD -- docs/typora-gap.md` | **2**（`:7`、`:34`） | 0（改后是 `（28）`/`（12）`） |
| `git grep -n "拖拽改列宽" -- README.md docs/typora-gap.md` | **0** | **2**（`README.md:50`、`docs/typora-gap.md:31`） |

`git diff --numstat docs/typora-gap.md` = **22 插 / 22 删，93 → 93 行（净增 0）**——与 plan-review N4 的算术一致（7 移动 + 1 删 + 1 增 + 4 处改写，两侧各计一次），计划原稿「总行数只多 1 行」的判据按 N4 作废。

### T4 首屏余量 <5% WARN（零字节） — DONE

`scripts/measure-first-screen.mjs:72-77`，在「超内部预算 WARN」之后、「超硬线 FAIL」之前插：

```js
const headroom = max - totalGzip
if (headroom > 0 && headroom < max * 0.05) console.log(`WARN 首屏距硬线 ${max} 只余 ${headroom} B（<5%），下一轮加静态代码前先算体积`)
```

四条验收（用第 36 轮的 `dist/`，`totalGzip=288256`，未重建）：

| 命令 | 实测 | 计划期望 |
| :--- | :--- | :--- |
| `node scripts/measure-first-screen.mjs` | `headroom=31744`、无 `WARN 首屏距硬线`、`PASS`、exit 0 | 同 |
| `… --max 300000` | `WARN 首屏距硬线 300000 只余 11744 B（<5%）…`、`PASS`、exit 0 | 同 |
| `… --max 288000` | `FAIL 首屏 gzip 288256 超过上限 288000`、exit 1（WARN 不吞 FAIL：headroom 为负时不打 WARN） | 同 |
| `… --target 280000` | `WARN 首屏 gzip 288256 超过内部预算 280000（越过 8256 B）`、`PASS`、exit 0、无 ENOENT | 同 |

## 2. 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/App.tsx` | 表格 `resizable: true`；`focusSourceEditor(ratio?)` + `caretRatioOf`；`enterSourceFor` 第三参；3 个调用点传/不传比例（含横幅两条入口）；关查找条改用 `focusSourceEditor()` |
| `src/styles.css` | `.editor .column-resize-handle`、`.editor.resize-cursor`、`th/td { position: relative }`（+16 行） |
| `docs/typora-gap.md` | 全表复核、7 条移入、1 删、1 增、4 处改写、计数 28/12（22 插 22 删，净 0 行） |
| `README.md` | `:50` 能力句补「表头边界可拖拽改列宽」；`:74` 限制句补「列宽不写进 Markdown…」；`:82` 计数 28/12 |
| `AGENTS.md` | §6 末句计数「28 项有、12 项缺」（只改这一句，长行未重排） |
| `docs/CHANGELOG.md` | `## Unreleased` 标题改「第 29–37 轮」，末尾加「第 37 轮」小节（T1/T3/T4 + UNVERIFIED + T2 顺延说明） |
| `scripts/measure-first-screen.mjs` | 余量 <5% WARN（7 行，不改参数/默认值/exit 码） |

未改：`docs/iteration/STATE.md`（根代理轮末写）、`package.json`、`release/`、`vite.config.ts`、`host*/`、`packaging/`、`.github/`。

## 3. 门禁与命令结果

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **23 个文件 301 条全过**（每个文件 `fail 0`；T1 不加单测，与第 36 轮同数） |
| `npm run roundtrip` | exit 0；`rich: 5/7 完全保真`（`04-reference-links.md` −4/+1、`06-task-list.md` −0/+1 为既有差异）、`source: 7/7 等值；firstSaveBlocked: 1/7`——与第 36 轮一致；`docs/roundtrip-report.md` 无 diff |
| `npm run build` | exit 0，`✓ built in 727ms`（T1/T3/T4 全部改完之后**串行跑了一次**；计划 §0 的「实施期不跑」是防两个 builder 并发写 `dist/`，本轮只有 1 个代理、且此后没有并行构建，为把 executor 角色的 `build` 门与真实首屏字节一起补齐才跑） |
| `node scripts/measure-first-screen.mjs` | `PASS`，`total raw=934040 gzip=288411 headroom=31589 files=3 max=320000`，`target=310000 gap=21589`；首屏集合 = `index-*.js` + `index-*.css` + `rolldown-runtime-*.js`，无 `mermaid`/`lazy`/`katex`。**相对第 36 轮 288,256 B 增 +155 B**（计划估 CSS ~200 B raw / <150 B gzip、JS 0 B；实测 CSS chunk 34,404 raw / 7,177 gzip，与计划同量级，属「记录项」，不是失败判据） |
| E2E `.tmp/e2e-r37-impl-t1.mjs` | 4 段全过，`## errors []`（console error 与 pageerror 均 0） |
| `git status --short` | 仅 `M AGENTS.md README.md docs/CHANGELOG.md docs/typora-gap.md src/App.tsx src/styles.css scripts/measure-first-screen.mjs` + 未跟踪 `docs/iteration/round-37/`、`shots/round-37/`；`release/` 无改动 |

**实施期没有跑 `npm run build` / `npm run verify`**（计划 §0 构建纪律：并发写 `dist/` 会互相清空；由根代理串行跑）。

## 4. 截图（`shots/round-37/`）

| 文件 | 内容 |
| :--- | :--- |
| `impl-table-resize.png` | 拖过列宽的 3 列表格：第 1 列 278 px、后两列 144 px，`甲｜乙` 边界有 accent 竖线（handle） |
| `impl-source-caret.png` | 长文源码里 `ZZZ` 夹在第 61 段中间（不是文首、不是文末），视野停在第 48–61 段 |

T2 顺延，计划 §6 的三张 Mermaid 截图（`impl-mermaid-nested/dup/seq`）本轮不产。

## 5. 本轮新踩的坑 / 交接给下一轮

1. **`textarea` 里 `focus()` 与 `setSelectionRange()` 的顺序决定视野**：反序（先 focus 后设选区）实测 `scrollTop` 停在 0，caret 在 50% 处但视口在文首；正序（先设选区再 focus）浏览器把 caret 滚进视口（2640/5209）。断言只测 `selectionStart` 时两种顺序都绿，所以必须同时断言 `scrollTop`。已写进 `src/App.tsx:337` 的注释。
2. **表格 `resizable` 的脏属性**：`TableCell/TableHeader` 的 `colwidth` 只有 `parseHTML` 没有 `renderHTML`（`node_modules/@tiptap/extension-table/dist/index.js:122,165`），拖过的表 DOM 里会多 `colwidth="278"`，`getHTML()`/HTML 导出会带出这个无 `<colgroup>` 的无效属性。第 38 轮修法：`colwidth: { renderHTML: () => null }`；单测要 DOM（prosemirror `DOMSerializer` 依赖 `document`），现有 headless 单测跑不了，用 E2E 断言 `th.getAttribute('colwidth') === null` + 导出片段无 `colwidth`。
3. **`table-layout` 不必改**：`auto` 布局下 `updateColumnsOnResize` 写的 `<col style="width:…">` 已经生效（列宽 192→278 实测），所以没有走计划里「给该表加 `table-layout: fixed`」的退路；全局加会改变老文档渲染，别顺手加。
4. **单代理时 T2 必须整体顺延而不是拆半**（计划 §3 已定）：`scopeSvgIds` 的 `<style>` 作用域与 6 条单测是一整块，拆开就会留下「id 唯一但配色掉光」的半成品。

## 6. UNVERIFIED（本轮测不了，别当回归）

| 项 | 为什么 | 怎么补 |
| :--- | :--- | :--- |
| WebView2 宿主里的表格拖拽与源码框 caret | 本轮只用 CDP 9222 浏览器 | 下一次宿主轮 `host-smoke` 加两条断言 |
| 拖过的表在 HTML 导出里的实际字节 | 本轮只量了 DOM 的 `colwidth`，没跑导出 | 第 38 轮修 `renderHTML` 时一起验（E2E 读导出片段） |
| `resizable` 的 JS 增量确为 0 B | 实施期按计划不构建 | 根代理 `npm run verify` 给总增量；预期只多 CSS（约 200 B raw / <150 B gzip） |
| 暗色主题、150%/200% 缩放屏下的 handle 竖线与 caret 落位 | 只在当前主题/100% 下测 | 主题回归时同批跑 |
| 真实中文 IME 下的源码框 caret | 无真人输入法，`keyboard.type` 只发 ASCII | 与既有 IME 项同批 |
| 宿主/真实盘上的保存字节 | 假 FSA 无权限模型 | 既有写回项同批 |
