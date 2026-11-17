# 第 37 轮验收报告（tester）

- 轮次：round=37；轮前 `startSha=ee5c1f7e637a5da0f79b811ff4c31c94eba3fc76`。
- 验收方式：只读 `plan.md` 与 `git diff`，**未读 `impl.md`**；所有门禁与 E2E 由本角色从零重跑，独立写脚本 `.tmp/e2e-r37-test-t1.mjs`。
- 环境：`http://localhost:5175`（未另起/未重启）、CDP 9222（未启动 Edge、未 kill `msedge`）、每次 E2E 前 `node .tmp/reset.mjs 9222`。
- 结论：**PASS-WITH-UNVERIFIED**。

## 0. 本轮实际改了什么（git diff 实测）

| 文件 | 改动 | 对应任务 |
| :--- | :--- | :--- |
| `src/App.tsx` | `ReusableTable.configure({ resizable: true })`（`:778`）；`focusSourceEditor(ratio?)` + `caretRatioOf(editor)`；`:3817`、`:4626` 传比例，`:4629` 不传 | T1 |
| `src/styles.css` | `.column-resize-handle`、`.editor.resize-cursor`、`.editor th, .editor td { position: relative }` | T1 |
| `README.md` | `:50` 能力句加「表头边界可拖拽改列宽」；`:74` 限制句「列宽不写进 Markdown」；`:82` 28/12 | T1/T3 |
| `AGENTS.md` | 只改 `:74` 末尾计数「28 项有、12 项缺」 | T3 |
| `docs/typora-gap.md` | 7 条移入「已经有的」、删重复行内 HTML 行、拆字号/视图缩放、主题、表格行列、新增相对路径图片行、计数 28/12 | T3 |
| `docs/CHANGELOG.md` | 标题改成「第 29–37 轮」并加「第 37 轮」小节 | T1/T3 |
| `scripts/measure-first-screen.mjs` | 距硬线 <5% 打 `WARN`（不改 exit 码） | T4（可选，做了） |

**T2 整项未做**（`git grep "descendants" -- src/lib/mermaidLazy.ts` 0 命中、`git grep "scopeSvgIds" -- src/` 0 命中、`src/lib/mermaidPreview.ts`、`src/lib/mermaidLazy.test.ts`、`docs/adr/0017-mermaid-lazy-loading.md` 均无改动），符合 `plan.md` §3「只能派一个代理 → 只做 T1 + T3 最小集，T2 顺延第 38 轮」的降级条款。**不据此判 FAIL**，已写入 STATE 下一轮优先项。`README.md:77` 的 Mermaid 句也按 T3 第 9 条保持未动（T2 未落地时不改），未出现「文档说做了、代码没做」。

## 1. 门禁（本角色重跑，真实输出）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **23 个文件 301 条，fail 0**（`.tmp/tester-r37-test.log`；与第 36 轮同数，T1 未加单测） |
| `npm run roundtrip` | exit 0；rich **5/7**、source **7/7**、firstSaveBlocked 1/7（与第 36 轮同：`04-reference-links.md` −4 +1、`06-task-list.md` −0 +1） |
| `npm run build` | exit 0，`✓ built in 552ms` |
| `node scripts/measure-first-screen.mjs` | `total raw=934040 gzip=288411 headroom=31589 files=3 max=320000` → `PASS`，exit 0 |
| 首屏集合 | `index-mqWiQKfF.js` 280,784 gzip + `rolldown-runtime-vfrPO-fZ.js` 450 + `index-CMnePKFr.css` 7,177；**`files=3`，无 `mermaid`/`lazy`/`katex`** |

体积口径（记录项，非失败判据）：288,411 B，相对第 36 轮 288,256 B **+155 B**（只多 T1 的 CSS），距内部预算 310,000 余 21,589 B、距硬线 320,000 余 **31,589 B**。与 `CHANGELOG` 写的 288,411 B 一致。

**T4 四条正反例（本角色重跑）**

| 命令 | 实测 | 判定 |
| :--- | :--- | :--- |
| 默认 | `headroom=31589`，无 `WARN 首屏距硬线`，`PASS`，exit 0 | 过 |
| `--max 300000` | `headroom=11589`，出 `WARN 首屏距硬线 300000 只余 11589 B（<5%）…`，仍 `PASS`，exit 0 | 过 |
| `--max 288000` | `headroom=-411`，`FAIL 首屏 gzip 288411 超过上限 288000`，exit 1（WARN 未吞 FAIL） | 过 |
| `--target 280000` | `WARN 首屏 gzip 288411 超过内部预算 280000（越过 8411 B）`，不报 ENOENT，exit 0 | 过 |

> 计划 T4 表写「默认 `headroom=31744`」，那是 T1 落地前（288,256 B）的数；本轮测得 31,589，差 155 B 就是本轮 CSS。判据是「无 WARN + PASS + exit 0」，已满足。

## 2. 静态验收（`plan.md` §5 改前/改后对照，本角色重测）

| 命令 | 改前（planner） | 本轮实测 |
| :--- | ---: | --- |
| `git grep -n "resizable" -- src/App.tsx` | 0 | **1**（`src/App.tsx:778`） |
| `git grep -n "column-resize-handle" -- src/styles.css` | 0 | **1**（`src/styles.css:691`） |
| `git grep -n "focusSourceEditor(" -- src/App.tsx` | 2 | **3**（定义 + `:3817` + `:4629`），达标 ≥3 |
| `git grep -n "拖拽改列宽" -- README.md docs/typora-gap.md` | 0 | **2**（`README.md:50`、`docs/typora-gap.md:31`） |
| `git grep -nE "22 项有\|17 项缺\|已有 22 项\|缺 17 项\|已经有的（22）\|缺的（17）" -- README.md AGENTS.md docs/typora-gap.md` | 2 + 2 | **0 命中**（exit 1） |
| `docs/typora-gap.md` 标题 | 22 / 17 | **`## 已经有的（28）` / `## 缺的（12）`** |
| 机械行数（node 脚本，避免 PowerShell 中文解码假阴） | — | 有表 **29** 行（1 表头 + 28 条）、缺表 **18** 行（6 子表头 + 12 条）；子节 3/3/2/1/1/2 合计 12，与标题一致 |
| `git grep -nE "各渲染一次\|跨块共享" -- docs/adr/0017-…md` | 1 | **1**（`docs/adr/0017-mermaid-lazy-loading.md:110`）——T2 未做，ADR 未动，与降级一致 |

## 3. E2E（独立脚本 `.tmp/e2e-r37-test-t1.mjs`，日志 `.tmp/e2e-r37-test-t1.log`）

先确认页面跑的是新代码：`live-code` = `hasResizeHelpRule:true`、`hasResizeCursorRule:true`、`pmClass:"tiptap ProseMirror editor ProseMirror-focused"`（不是 HMR 陈旧模块）。控制台错误：**0 条**。

### `## table-drag`（3 列表格，拖第一列表头右边界 +90 px）

```json
{"handleSeen":true,"handleBox":{"x":583,"w":4,"h":37,"pos":"absolute","bg":"rgb(43, 109, 100)"},
 "resizeCursorClass":true,"editable":"true",
 "widthsBefore":[192,192,192],"widthsAfter":[278,144,144],
 "firstColDelta":86,
 "colStylesAfter":["278px","min-width: 25px;","min-width: 25px;"],
 "colwidthChanged":true,"dirtyBefore":false,"dirtyAfterDrag":false}
```

判据逐条：`handleSeen:true` ✅、首列差 **86 px ≥ 10** ✅、`colwidthChanged:true` ✅（`<col style="278px">` 出现）、悬停时 `.ProseMirror` 带 `resize-cursor` ✅。handle 是 `position:absolute`、4 px 宽、主题色 `rgb(43,109,100)`，说明 CSS 生效、定位祖先已补。截图 `shots/round-37/test-table-resize.png`（首列明显变宽、边界竖线可见）。

### `## save-bytes`（数据安全）

```json
{"equalToBefore":true,"bytesBeforeLen":81,"bytesAfterLen":81,
 "markdownHasColwidth":false,"dirtyAfterSave":false,
 "headerLine":"| 甲 | 乙 | 丙 |"}
```

拖前 `dirty:false` → 拖后仍 `false`；`Ctrl+S` 后落盘字节与拖前**逐字节相同**，Markdown 里没有 `colwidth`。列宽是纯视图状态，不进正文 ✅。

### `## caret-long`（120 段 / **242 行**文档，正文中部单击后 `Ctrl+/`）

```json
{"paragraphs":120,"lines":242,"active":"TEXTAREA.source-editor",
 "len":3857,"selStart":1936,"caretRatio":0.502,
 "caretNotStart":true,"caretRatioInRange":true,
 "scrollTop":2640,"scrollHeight":5855,"clientHeight":646,"scrollNotAtEnd":true,
 "typedNotAtStart":true,"typedNotAtEnd":true,"typedAtCaret":true,"typedLenDelta":3,
 "typedWindow":"行用来把文档撑长，验ZZZ证源码框里"}
```

判据：`active:'TEXTAREA.source-editor'` ✅、`caretNotStart:true` ✅、`caretRatio=0.502 ∈ [0.2,0.8]` ✅、`scrollNotAtEnd:true`（2,640 < 5,855−646−4）✅、`typedNotAtStart:true` ✅、`typedAtCaret:true`（1,936+3=1,939，长度 +3）✅。截图 `shots/round-37/test-source-caret.png`：视野停在第 55–67 段（中部），`ZZZ` 落在第 61 段光标处，既不在文首也不在文末。**第 36 轮「击键插到文首」的缺陷本轮实测已消。**

### `## find-esc-caret`（源码模式 `Ctrl+F` → `Esc`，`:4629` 不传 ratio 的回归）

```json
{"findOpen":true,"findFocus":"INPUT.find-input",
 "focusAfter":"TEXTAREA.source-editor",
 "caretBefore":1939,"caretAfter":1939,"caretUnchanged":true}
```

一个 Esc 只关查找、焦点回源码框、caret 不挪 ✅。

## 4. 回归

| 脚本 | 结果 |
| :--- | :--- |
| `node scripts/keyboard-acceptance.mjs http://localhost:5175` | **52/52 PASS**，exit 0（含 `Ctrl+/` 进源码、Esc 回编辑、表格 Tab、正文可编辑、toast a11y）。日志 `.tmp/tester-r37-keyboard.log` |
| `node scripts/data-safety-acceptance.mjs`（`SIDELIGHT_URL=http://localhost:5175`） | **未跑完**：第 1 条「引用式链接样本：横幅出现」PASS 后，`edit()` 用 `page.locator('.editor').click()` 30 s 超时。原因是引用式链接文档载入即**源码模式**，`.ProseMirror`（`.editor`）不在 DOM——即 AGENTS §8 记的「`data-safety` 的 `.editor` 选择器过期」。**脚本过期，不是本轮回归**（本轮 diff 未动源码模式的开档策略）；本轮 T1a 的表格写回字节改由 `## save-bytes` 覆盖 |

`shots/round-05/` 被 keyboard 脚本覆盖的 3 张历史截图已 `git checkout -- shots/round-05/` 还原，`git status` 未见改动。

## 5. 未做 / 未验（UNVERIFIED）

| 项 | 为什么 | 下一轮怎么补 |
| :--- | :--- | :--- |
| **T2 整项（Mermaid 嵌套围栏 + 相同代码 SVG id 按实例唯一）** | 计划 §3 单代理降级：只做 T1 + T3 最小集，T2 顺延 | 第 38 轮第一优先，按 `plan.md` §T2 原验收（含 H1 的 `<style>` 作用域、`## style-intact` computed style、`sequenceDiagram` 同跑） |
| 拖过的表在 HTML 导出里的 `colwidth` 属性 | 本轮只验 DOM 与 Markdown；未读导出片段 | 已记入 CHANGELOG UNVERIFIED；下一轮给 `TableCell`/`TableHeader` 的 `colwidth` 加 `renderHTML: () => null` 并用 E2E 断言 |
| WebView2 宿主里的列宽拖拽与源码框 caret | 本轮只用 CDP 9222 浏览器 | 宿主轮 `host-smoke` 加一条 |
| 暗色主题与 150%/200% 缩放屏下的 handle / caret | 本轮只在当前主题与 100% 下断言 | 主题回归时亮/暗各跑一次 |
| 真实中文 IME 下的源码框 caret | 无真人输入法 | 与既有 IME 项同批 |
| HTML 导出与预览面板的 Mermaid 图形 | 第 36 轮已知限制，本轮未动 | 与 T2 一并排期 |

## 6. 计划任务完成度

| 任务 | 结论 |
| :--- | :--- |
| T1-a 表格列宽拖拽 | **做完并实测通过**（含数据安全字节断言） |
| T1-b 源码框 caret 落位 | **做完并实测通过**（长文 242 行；`caretRatio 0.502`；关查找条不挪 caret） |
| T2 Mermaid 两条缺陷 | **未做**，按计划 §3 降级顺延第 38 轮（不计 FAIL） |
| T3 `docs/typora-gap.md` 复核 + 计数 | **做完并实测通过**（7 条移入、删 1 行、拆 1 行、改 3 行、增 1 行；29/18 行计数与 28/12 标题一致；旧计数 0 残留） |
| T4 余量 WARN（可选） | **做完并四条正反例通过** |
