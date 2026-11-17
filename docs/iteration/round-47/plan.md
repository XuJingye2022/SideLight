# 第 47 轮 · 计划（planner，只读）

> **revision 3**（planner-revision，2026-11-17 22:20）：按 `plan-review.md` **revision 2** 的 6 条新漏洞修订（P1-1、P1-2、P2-3、P2-4、P2-5、P2-6），逐条对照见 **§八**。要点：**T1 的还原从「转义后」挪到「转义前」（先占位再转义）**（P1-1）；**T1 的 Node 判别性测试从 `getMarkOpening` 换成「手搓 doc → `manager.serialize` → 逐字节比对」**（P1-2，单参调用注册后会抛 TypeError）；T1 的 E2E `textContent` 断言收窄到渲染段（P2-3）；**嵌套语义与负例期望按 P2-4 口径 2 写死**（外层保持字面、内层干净的成对仍还原）；T2 的 `lineBefore` 明确是**第 4 参**（P2-5）；T1 熔断回滚清单补 `package.json` 与 `src/lib/html.test.ts`（P2-6）。**任务编号仍是 T1–T4，任务量与估时不变（30 + 5 = 35 min 硬上限）**，没有新增任务。
>
> **revision 2**（planner-revision，2026-11-17）：按 `plan-review.md` revision 1 的 6 条漏洞修订（P1-1、P1-2、P1-3、P2-4、P2-5、P2-6），逐条对照见 §七。任务编号仍是 **T1–T4**；**T3 换成 typora F1（P1）**（P1-3 的「排进去」分支，reviewer 明说它比 P2 便宜），原 T3「批注卡 Tab/Enter」移入 §二。范围没有扩大：只动 review 点到的文件与任务。

- 轮次：`round=47`、`nn=47`；轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6`（planner 实测 `git rev-parse HEAD` 同值）。
- 输入：本轮 5 份 `findings-*.md`（bug / typora / ship / code / ui）+ `plan-review.md`（**revision 2** 的 6 条新漏洞：P1-1、P1-2、P2-3、P2-4、P2-5、P2-6；revision 1 的 6 条已全部落地，见 §七），并对照 `docs/iteration/STATE.md`、`README.md`、`AGENTS.md` 第 4/8 节、`docs/typora-gap.md`、相关源码。
- 只读：本文件之外没有改产品代码、没有跑 E2E、没有 commit、没有 push、没有碰 `release/`；只新增了 `.tmp/planner47-rev3-probe.mjs` 一个探针（`.tmp/` 不进版本控制）。
- 环境：dev server `http://localhost:5175`（**不另起、不重启**；5173 是僵尸 server，禁用）；浏览器只用 **CDP 9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`；脚本结尾 `page.close()` + `process.exit(0)`。
- **不发版**：`package.json` 版本（0.32.1）不动；CHANGELOG 写进 `## Unreleased`；不改 `release/`。
- 交付物：`docs/iteration/round-47/plan.md`（本文件）→ `impl.md` → `test.md`；截图 `shots/round-47/impl-*.png`（**不覆盖** finder 已生成的 `bug-*`/`r47-*`/`code-*`/`ship-*`/`r47-ui-*`）。
- 门禁（改过 `src/` 就要跑）：`npm run build`、`npm test`、`npm run roundtrip`、`npm run verify`（首屏 gzip 门）。

**行号口径（全篇适用，plan-review rev1 的 P2-4（T4 锚点）的教训）**：本文件的 `文件:行号` 只作阅读辅助，**执行一律按符号搜**。实测 `(Get-Content src/App.tsx).Count` 报 **5310**，而 `read` / `Select-String` / ripgrep 三者一致按 **5471 行**算（`accept="image/*"` 在 **5369**；本 revision 用 `read` 复核 App.tsx 总行数 = 5471）；不一致时以后三者为准，**不要用 `Get-Content` 校行号，也不要读中文**（PS 5.1 按 ANSI 解码，读出来是乱码）。

## 〇、结论：本轮 4 个任务

| id | 标题 | 级别 | 类别 | 回应 | 估时 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 行内 HTML 白名单渲染：`<kbd>`/`<mark>`/`<sub>`/`<sup>` 在编辑视图与预览里成为真样式，保存写回原标签、逐字节不变 | **P1** | 用户可见（核心功能） | 调度 ①、typora F5 同族、gap 表「行内 HTML 保真但不渲染」 | 12 min |
| **T2** | 智能标点不再改写反引号行内代码里的 `--` / `...`（保存字节已错） | **P1** | 数据安全 | typora F2（本轮新 P1） | 6 min |
| **T3** | Mermaid 语法错误后清理库塞进 `body` 的 `#dmermaid-preview-N` 错误图（切文档不消失、把页高撑出滚动条） | **P1** | 用户可见（缺陷） | typora F1（本轮新 P1） | 6 min |
| **T4** | 工作区图片插入后立刻显示：假盘改成按字节存，补上第 38 轮的 UNVERIFIED | **P1（验证）** | 核心功能验证 | 调度 ③ | 6 min |

**任务合计 30 min + 门禁与收尾 5 min = 35 min（硬上限）**。T1 带一个未知项，另设 **15 min 熔断点**（§三）：到点没拿到 E2E 的 `kbd` 计数就**整条回滚**，不交半条。

**为什么是这四条（排序按 `roles/planner.md`：数据安全 → 用户可见收益 → 安装/体积/性能 → 内部质量）**：
调度给的是 6 个候选，本轮装得下 4 个。①是唯一的大功能、且与 gap 表一条长期缺口重合；②（粘贴为纯文本）**第 46 轮 B4 已在应用里实测浏览器原生可用**（`docs/typora-gap.md:41` 自己写「桌面宿主未验证」），再写一遍 handler 在浏览器里是空操作、在宿主里又测不了——按调度「不要为凑轮次造任务」本轮不排；⑤（系统主题变化重绘 Mermaid）**第 46 轮已经实现并有代码**（`src/lib/mermaidPreview.ts:123-161`：`data-theme` MutationObserver + `prefers-color-scheme` 监听，`renderKey = theme|hash`），本轮只登记为「已有，不需要再做」；⑥（真实安装包验证）本会话是非交互沙箱（finder-ship 已给 UNVERIFIED 与补测步骤，`host\Sidelight.exe` 起不来），做不了。
剩下 ③④ 进任务表；再补两条本轮新 P1：typora F2（写坏用户字节）与 typora F1（Mermaid 错误图残留，P1-3 要求**不许静默丢**）。F1 只有 5–8 行，比原 T3（P2 可访问性）便宜且级别更高，所以 **T3 槽位给 F1**；原 T3 进 §二并写明下轮补法（它的播种脚本要新写，7 min 不现实）。

## 一、为什么排这四条

### T1（P1，用户可见核心功能）行内 HTML 白名单渲染

**现状（有证据）**：finder-bug `## c1-fidelity` 实测 `<kbd>Ctrl</kbd>` 在正文里是字面文本（`kbd:0`、`kbdLiteralText:true`，`shots/round-47/bug-c-fidelity.png`）；typora F5/gap 表把「行内 HTML」列在缺的项目里。根因是 `src/lib/html.ts:66-68`：解析前把所有 `<tag` 转成 `&lt;tag`（因为 schema 不认识会被整段丢掉），保存时再由 `repairHtml()` 还原。所以**保真是对的，只有「渲染」缺**。

**可行性：合并分支已核实；端到端解析待 E2E**（plan-review rev1 的 P1-1 降级）。已核实的是：`@tiptap/markdown` 3.34 会把成对的 HTML 开/闭 token **合并成一个片段**再交给 `parseHTMLToken`（`node_modules/@tiptap/markdown/dist/index.js:802-840`），mark 可以声明 `renderMarkdown` 与 `markdownOptions.htmlReopen`；**2 参调用**下实测 `manager.getMarkOpening('inlineKbd', { type: 'inlineKbd' }) === '<kbd>'`、`getMarkClosing(...) === '</kbd>'`（`.tmp/critic47-probe.mjs:30-31` 与 probe4 A4/A5 的写法；**单参调用注册后会抛 TypeError**，见 §T1 测试第 6 条与 §八 P1-2）。**没核实的是 HTML→mark 的端到端解析**：Node 里没有 DOMParser，`parseHTMLToken` 在 `typeof window === "undefined"` 时直接走 `htmlAsLiteralText`（同文件 `:953`），所以 Node 单测**判不了** mark 是否生效——实测 `.tmp/critic47-probe3.mjs` 一个 mark 都没注册也 `SAME=true`（本 revision 复跑，两条样例都是 true）。结论：**T1 的唯一通过依据是 E2E**（`.ProseMirror kbd` 计数 + 盘上字节 === 播种字节）。

**语义边界（必须写进实现与测试）**：
1. 白名单只有 **`kbd`、`mark`、`sub`、`sup`** 四个标签；**只认不带属性、成对、同一行、内容里没有 `<` 或 `&`** 的形式（`<kbd>Ctrl</kbd>`）。`<kbd class="x">`、`<kbd>` 单开、内容含 `<` 或 `&`（`<kbd>R&D</kbd>`、`<kbd>a<b</kbd>`）、跨行一律**保持字面文本 + 保存逐字节不变**（第 41 轮的保真基线不动）。内容含 `&` 的保守代价：`<kbd>R&D</kbd>` 也不渲染——宁可不渲染，也不改字节。
2. **嵌套按 P2-4 口径 2（写死，别再按「一律字面」实现或测试）**：`<kbd><mark>x</mark></kbd>` 的**外层** `<kbd>`/`</kbd>` 保持字面文本，**内层干净的成对** `<mark>x</mark>` 仍还原（因为它自己就满足第 1 条）。期望串是 `'&lt;kbd><mark>x</mark>&lt;/kbd>'`（本 revision 探针实测）；渲染结果是「字面 `&lt;kbd>` + 高亮的 x + 字面 `&lt;/kbd>`」，**字节仍逐字节不变**（`repairHtml` 的 `source.includes('<kbd')` 会还原外层实体）。要改成「真的一律字面」得多写 8–12 行扫描器，本轮不做。
3. 围栏与行内代码里的 `<kbd>` 不动（继续走 `mapOutsideCode`）。
4. 不渲染任何属性、不认 `<script>`/`<style>`/`on*`（白名单之外仍是字面文本，天然安全）。
5. 保存写出原标签（`<kbd>Ctrl</kbd>`），不写实体、不写 HTML 源码块。

**改动文件/函数**：
- 新建 `src/lib/inlineHtmlTags.ts`（纯函数、无 DOM）：
  - `export const INLINE_HTML_TAGS = ['kbd', 'mark', 'sub', 'sup'] as const`；
  - `export function escapeInlineHtml(segment: string): string`：**还原挪到转义前、作用在 `mapOutsideCode` 回调拿到的原始段上**（P1-1 的修法）。顺序是「先扫出真成对标签换成占位符 → 再对剩下的 `<` 做今天那条转义 → 最后把占位符换回真标签」：
    ```ts
    const PAIR = /<(kbd|mark|sub|sup)>([^<&\n]*?)<\/\1>/g   // 只跑在原始段上；内容不含 < & 换行
    const ANGLE = /<(?=[a-zA-Z/!])/g                       // 与今天 html.ts:67 完全同一条
    export function escapeInlineHtml(segment: string): string {
      if (segment.includes('\u0001')) return segment.replace(ANGLE, '&lt;')   // 原文真含占位符字符：放弃还原、退回纯转义
      const saved: string[] = []
      const masked = segment.replace(PAIR, (whole) => { saved.push(whole); return `\u0001${saved.length - 1}\u0001` })
      return masked.replace(ANGLE, '&lt;').replace(/\u0001(\d+)\u0001/g, (_, i) => saved[Number(i)])
    }
    ```
    - **为什么不能在转义后还原（P1-1）**：转义后的 `&lt;kbd>` 有两种来源——作者写的真标签（该还原）与作者本来写的实体（讲转义的段落，不该动），只看转义结果无法区分。实测 `.tmp/critic47-probe6.mjs`：`E1 today` = `"写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。"`，`E2 afterT1` = `"写成 <kbd>Ctrl</kbd> 才是转义示例。"`，`E3 changed by T1: true`。前置占位后，来源 B 的原串里根本没有真 `<kbd>`，原样留下（本 revision 探针 `.tmp/planner47-rev3-probe.mjs` A 段实测：只有来源 A `CHANGED`，B/B2/G/H/I/L 全部 `same`）。
    - `PAIR` 只用一个 `g` 正则、**只用 `String.prototype.replace`**：不要再拿同一个正则对象做 `.test()`/`.exec()`（`lastIndex` 会残留），要再判就函数内新建。
    - 段是「一行里、行内代码之外」的一段（`mapOutsideCode` 逐行切：`src/lib/codeScan.ts:14-44`），所以段内没有 `\n`；围栏与行内代码根本不进这个回调，第 41 轮的围栏守卫不受影响。占位符只在 `parse` 之前短暂存在，换回真标签后才交给解析器，**盘上永远不会出现 `\u0001`**。
  - 四个 mark 工厂由 `INLINE_HTML_TAGS.map(...)` 生成并一次导出：`export const inlineMarks = INLINE_HTML_TAGS.map((tag) => Mark.create({ name: 'inline' + tag[0].toUpperCase() + tag.slice(1), parseHTML: () => [{ tag }], renderHTML: () => [tag, 0], renderMarkdown(_node, helpers) { return \`<${tag}>${helpers.renderChildren()}</${tag}>\` }, markdownOptions: { htmlReopen: { open: \`<${tag}>\`, close: \`</${tag}>\` } } }))`（名字对齐 probe5：`inlineKbd`/`inlineMark`/`inlineSub`/`inlineSup`）。`helpers` 类型照 `App.tsx:131-140` 的 `ReusableTable.extend` 写法处理（该文件里 `renderMarkdown` 已能通过类型检查）。`PAIR` 里的标签名与 `INLINE_HTML_TAGS` 必须一致——改一处记得改另一处。
  - `escapeHtmlForParse` 改成一行接线（`src/lib/html.ts:66-68`）：`return mapOutsideCode(text, escapeInlineHtml)`（`fn` 的第二个参数 `start` 被忽略，多传不报错）；**实体解码、围栏守卫、`repairHtml` 一行不动**。
- `src/App.tsx` 的 `extensions: [...]` 数组（`:780-804`，`Markdown.configure` 在 `:804`）：`...inlineMarks` 加进去（放 `Markdown.configure` 之前，`:780-804` 范围内；`editor.markdown` 的 manager 用编辑器扩展表，`:999`）；`useEditor` 的 `contentType: 'markdown'` 与 `:1006` 的 `manager.parse(escapeHtmlForParse(...))` 全链路自动生效。
- `src/styles.css`：`.doc-body kbd`（键帽：1px 边框、4px 圆角、等宽、`padding: 0 4px`、上下不出行框）、`.doc-body mark`（现有 accent 的低饱和底，深色主题下文字对比度 ≥4.5:1）、`.doc-body sub, .doc-body sup`（`font-size: 0.75em`、`line-height: 0`、`vertical-align` 正确）。`.doc-body` 同时命中编辑态（`App.tsx:816` 的 `class: 'editor doc-body'`）与预览（`PreviewPane.tsx:79` 的 `ProseMirror doc-body preview-pane`）。**不改行高与正文字号**（UI F1 的标题阶梯不是本轮范围）。
- **改既有测试 `src/lib/html.test.ts` 的 2 个用例（plan-review rev1 的 P1-2；review 只点了 `:47-52`，实测 `:136` 同样会红，这是 revision 2 补的第 2 处。revision 3 的「先占位再转义」修法下，这两条期望值**一字不变**——`escapeHtmlForParse` 对 `'按 <kbd>Ctrl</kbd> + Enter 触发。'` 的输出仍是原串）**：
  - `:47-52`（用例名「解析前把标签的尖括号转成实体」）：期望值从 `'按 &lt;kbd>Ctrl&lt;/kbd> + Enter 触发。'` 改成 `'按 <kbd>Ctrl</kbd> + Enter 触发。'`，用例名改成「成对白名单标签还原，其余仍转义」；
  - `:133-137`（用例名「解析前不转义围栏与行内代码里的标签」）的 **`:136` 一条**：同一个断言（对 `'按 <kbd>Ctrl</kbd> 触发。'` 期望转义），改成真标签；`:134`、`:135`（围栏、行内代码）**原样保留**；
  - **逐字不动**：其余全部——`:6-45`（`repairHtml` 各例）、`:54-56`（`a < b` 不转义）、`:58-64`（转义后再 `repairHtml` 回到原文，实测改后仍绿）、`:66-110`（围栏/字面实体/块首守卫）、`:112-132`（等价类与属性还原）。
  - 实测依据：`escapeHtmlForParse` 在测试里只出现在 `html.test.ts`（`:49`/`:55`/`:60`/`:134`/`:135`/`:136`），其中只有 `:49` 与 `:136` 的期望值会变（`src/lib/` 全局 grep 确认，其它测试文件不调它）。
- 测试：新建 `src/lib/inlineHtmlTags.test.ts`（加进 `package.json` 的 `test` 脚本链，现 **29** 条，加完 **30** 条，与既有文件同风格；`tilde.test.ts:4` 已有 `MarkdownManager` 的 import 写法可抄）。**只断言 Node 能判真假的东西**：
  1. `escapeHtmlForParse` 逐字节保留四个白名单标签（`<kbd>Ctrl</kbd>`、`<mark>重点</mark>`、`H<sub>2</sub>O`、`x<sup>2</sup>`），同一行两组（`<kbd>Ctrl</kbd> 与 <kbd>Esc</kbd>`）两组都保留；
  2. **判别性**：`escapeHtmlForParse('按 <kbd>Ctrl</kbd> 触发。') === '按 <kbd>Ctrl</kbd> 触发。'`（改前是 `'按 &lt;kbd>Ctrl&lt;/kbd> 触发。'`，实测；改前红、改后绿）；
  3. 负例仍转义：`<kbd class="x">`、单开 `<kbd>`、内容含 `<` 或 `&`（`<kbd>R&D</kbd>` → `&lt;kbd>R&D&lt;/kbd>`）、跨行 `<kbd>Ctrl\n</kbd>`、行内代码 `` `<kbd>` ``、围栏里的 `<kbd>`、`a < b`（本 revision 探针 A 段逐例实测）；
  4. **P1-1 的守卫负例（挡「先转义再还原」的写法）**：`escapeHtmlForParse('写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。') === 原串`（改前也绿——它的作用不是判别修法，是锁住第 41 轮保真）。加一条占位符兜底：原文含 `\u0001` 时退回纯转义、不吞字符；
  5. **嵌套的期望按 P2-4 口径 2 写死**：`escapeHtmlForParse('<kbd><mark>x</mark></kbd>') === '&lt;kbd><mark>x</mark>&lt;/kbd>'`（外层不还原、内层干净的成对仍还原；本 revision 探针实测同值，不要写成「全转义」`'&lt;kbd>&lt;mark>x&lt;/mark>&lt;/kbd>'`——那会红）。
  6. **mark 的 Markdown 接线（判别性，Node 可判）——用保存链路，不用 `getMarkOpening`（P1-2）**：手搓 doc 交给 `manager.serialize()` 逐字节比对：
     ```js
     const doc = { type: 'doc', content: [{ type: 'paragraph', content: [
       { type: 'text', text: '按 ' }, { type: 'text', text: 'Ctrl', marks: [{ type: 'inlineKbd' }] },
       { type: 'text', text: ' 加 Enter，看 ' }, { type: 'text', text: '重点', marks: [{ type: 'inlineMark' }] },
       { type: 'text', text: '、H' }, { type: 'text', text: '2', marks: [{ type: 'inlineSub' }] },
       { type: 'text', text: 'O、x' }, { type: 'text', text: '2', marks: [{ type: 'inlineSup' }] },
       { type: 'text', text: '。' },
     ] }] }
     assert.equal(manager.serialize(doc), '按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。')
     ```
     实测（`.tmp/critic47-probe5.mjs` A1/A2）：注册四个 mark 时就是这一串；**同一份 doc 不注册 mark 时序列化成 `'按 Ctrl 加 Enter，看 重点、H2O、x2。'`（A3）**，所以改前红、改后绿。**import 写法**：`import { Mark } from '@tiptap/core'`（`Mark` **不在** `@tiptap/markdown` 里——本 revision 探针第一次写成 `from '@tiptap/markdown'`，直接报 `does not provide an export named 'Mark'`）、`import { MarkdownManager } from '@tiptap/markdown'`、`import { StarterKit } from '@tiptap/starter-kit'`。**不要**用单参 `getMarkOpening('inlineKbd')`：注册后直接抛 `TypeError: Cannot read properties of undefined (reading 'attrs')`（`.tmp/critic47-probe6.mjs` E5/E6；库 `node_modules/@tiptap/markdown/dist/index.js:1294-1296` 无条件读第二个参数 `mark.attrs`，未注册时 `:1292` 提前返回 `''` 才碰不到）。真要留一条接线断言，用 2 参 `getMarkOpening('inlineKbd', { type: 'inlineKbd' }) === '<kbd>'` 或 `('inlineKbd', undefined, 'html')`（probe4 A4/A5）。
  7. **不把**「`manager.parse` → `manager.serialize` === 原文」当通过依据：Node 里没有 DOMParser，`parseHTMLToken` 走 `htmlAsLiteralText`（`node_modules/@tiptap/markdown/dist/index.js:952-953`），所以恒真、空转（probe3 实测）。第 6 条用的是**手搓 doc**，不经 parse，不受这条限制。
- 文档（收尾）：`docs/typora-gap.md:49` 的「行内 HTML 保真但不渲染」改成「白名单四标签渲染，其余保真不渲染」；README/AGENTS 的 Typora 计数按 typora F6 的结论订正（**只改与本轮能力相关的那两行与计数，不与 typora F6 的整表订正混在一次提交里**；整表订正进下轮文档批次）。

**验收（可执行）**：
1. **T1 的唯一通过依据：E2E `.tmp/e2e-r47-inline-html.mjs`**（CDP 9222，先 `node .tmp/reset.mjs 9222`）：
   - 假工作区（`.tmp/r30-fsa.mjs` 的 `installFakeWorkspace(page, {files})`）播种**四篇**，把「渲染、实体、嵌套」分开写，避免互相污染断言：
     - `渲染.md`：第 1 段含 `<kbd>Ctrl</kbd> + Enter`、`<mark>重点</mark>`、`H<sub>2</sub>O`、`x<sup>2</sup>`；第 2 段含字面 `<kbd class="x">` 与单开 `<kbd>`；再加一个围栏代码块里的 `<kbd>`；
     - `实体.md`：**只有** `写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。`（P1-1 的守卫文档）；
     - `嵌套.md`：`<kbd><mark>x</mark></kbd>`（P2-4）；
     - `行首.md`：行首 `<mark>重点</mark>`（只作诊断读数，不设门）。
   - `渲染.md` 打开后：`document.querySelectorAll('.ProseMirror kbd').length === 1`、`mark/sub/sup` 各 1；**`textContent` 断言只对渲染那一段**（P2-3）：`const ps = document.querySelectorAll('.ProseMirror p'); const rendered = ps[0]`（或用含 `Ctrl + Enter` 的段落定位）→ `rendered.querySelectorAll('kbd').length === 1 && rendered.textContent.includes('Ctrl')`；**不要**对整篇 `.ProseMirror` 断言 `textContent` 不含 `'<kbd'`——同一篇里的字面负例段落按设计就是文本 `<kbd class="x">`，正确实现也会红。字面段单独断言：`ps[1].textContent.includes('<kbd class="x">')` 且 `ps[1].querySelectorAll('kbd').length === 0`；
   - `Ctrl+/` 读 `渲染.md` 源码：四组标签原样在（不是实体）；`Ctrl+S` 写盘后**盘上字节 === 播种字节**（`diskSame: true`，用 fake 盘的 `window.__fsState.files` 比对）；再断言字面 `<kbd class="x">` 与单开 `<kbd>` 保存后逐字节不变；
   - **`实体.md`（P1-1 的判别，必须单独一篇）**：打开 → `Ctrl+S` → 盘上字节 === 播种字节（`diskSame: true`），且正文里 `kbd` 元素 0、`textContent` 含 `'<kbd>Ctrl</kbd>'` 的字面文本。**这篇不得含任何真白名单标签**：`repairHtml` 的既有 source 守卫是「原文别处出现 `<kbd` 就把 `&lt;kbd&gt;` 还原」，混排文档改前改后都会改字节（本 revision 探针 D 段实测 `mixed: same(today)=false same(new)=false`），与 T1 无关，别让它把断言染红；
   - **`嵌套.md`（P2-4 口径 2）**：打开后 `mark` 计数 1、`kbd` 元素 0（外层是字面文本）；`Ctrl+S` 后盘上字节 === 播种字节（外层靠 `repairHtml` 的 `source.includes('<kbd')` 还原）；
   - **`行首.md` 只打印读数**：行首 `<mark>` 的 `mark` 计数写进 impl（若为 0，记 UNVERIFIED 作下轮小项，**不阻塞 T1**——`<mark>` 在行首时 marked 的 HTML 块判定是未知项）；
   - 刷新/重开文档：仍渲染、`dirty === false`；
   - 点「预览」（`Ctrl+Shift+P`）截图：`kbd` 有键帽样式、`mark` 有底色；`editor.getHTML()` / 导出串里含 `<kbd>`（预览与导出同源，`src/components/PreviewPane.tsx`）；
   - `consoleErrors: []`；截图 `shots/round-47/impl-inline-html-edit.png`、`impl-inline-html-preview.png`。
   - 没拿到 `kbd` 计数 = T1 未完成（不管单测多绿）。
2. 门禁：`npm run build` exit 0；`npm test` **30 个文件全过**（记录实际条数；口径是「改前那 2 条红、改后全绿」，顺序见 §三：先改期望值再改代码，或先改代码接受 2 条预期红）；`npm run roundtrip` → 0 漂移。
3. `npm run verify` → PASS，记录首屏 gzip 改前 **293,205 B** 与改后值；**增量 ≤ 1,500 B**，仍 ≤ 310,000 B 内部线。
4. 静态对照（**先贴改前读数**，全部实测过）：`git grep -n "inlineKbd" -- src` 改前 **0** → 改后 ≥3；`git grep -n "escapeInlineHtml" -- src` 改前 **0** → 改后 ≥3（定义 + `html.ts` 的 import 与调用）；`Select-String -Path src/lib/html.test.ts -Pattern '&lt;kbd>Ctrl'` 改前 **2**（read/rg 的 `:50`、`:136`，即改前那 2 条判别性期望）→ 改后 **0**。

**风险**：
- **半条最危险**：`escapeHtmlForParse` 的还原与 mark 注册必须**同一次落地**。只改转义不注册 mark，浏览器解析时 `<kbd>` 会作为未识别 HTML 降级成字面文本（`node_modules/@tiptap/markdown/dist/index.js:952-953`）；Node 测不出，E2E 会表现为「看不出效果」而不是坏字节。熔断 = **整条 T1 回滚**，**一条命令清单做全（P2-6）**：`git checkout -- src/lib/html.ts src/lib/html.test.ts src/App.tsx src/styles.css package.json`，再 `rm -f src/lib/inlineHtmlTags.ts src/lib/inlineHtmlTags.test.ts`，最后 **`npm test` 确认回到 29 文件全绿**。**不交半条**。
  - 为什么必须带上 `package.json` 与 `html.test.ts`：新测试文件已进 `package.json` 的 `test` 链，只删文件不删链 → 跑到最后 `MODULE_NOT_FOUND`/exit 1；`html.test.ts` 的 2 处期望不在 `git checkout` 清单里就得手工恢复，熔断时最容易漏。
- **混排文档的字节变化是既有问题，别当 T1 回归**：原文同时含真 `<kbd>` 与字面 `&lt;kbd&gt;` 时，`repairHtml` 的 source 守卫会把字面那一条也还原（`src/lib/html.ts:34` 的 `source.includes('<kbd')`）。实测改前改后同一结果（探针 D 段 `mixed: same(today)=false`、`same(new)=false`），本轮不动它；所以 §T1 验收里的实体守卫必须用**单独一篇、不含真标签**的文档。
- 第 41 轮 `<` `>` `&` 逐字节保真是最脆弱的一条：`html.test.ts`（24 条，实测）、`escapes.test.ts`、`risk.test.ts`、`tableCellBreaks.test.ts` 全跑；`escapeHtmlForParse` 只允许多还原白名单对，**`repairHtml` 的实体解码顺序与围栏守卫一行不动**（转义时机前移只影响解析输入，不影响保存侧）。
- `scripts/roundtrip.mjs` 的 `EXTENSIONS` 不含新 mark（`:29`）：Node 里 `<kbd>` 仍走字面文本、字节由 `repairHtml` 还原，所以预期 0 漂移。若真出现漂移，先按「与 App 同一扩展集」把四个 mark 加进它的 `EXTENSIONS` 再判断是不是产品问题。
- `<kbd>` 在表格单元格、列表项里也要能解析（行内 mark 与块无关）；E2E 覆盖一项。
- 若 `@tiptap/markdown` 的 HTML 合并分支因为 `original.includes` 或转义路径拿不到成对 token（实测才知道），**退路**：给 mark 加 `markdownTokenizer` + `parseMarkdown`（返回 `{ mark: 'inlineKbd', content: [...] }`，形状见 `node_modules/@tiptap/markdown/dist/index.js:847-859` 与 `:899-901`）。退路不得改成「把标签写成 HTML 源码块的节点」（会破坏字节保真）。
- 不改 `repairHtml` 的实体解码规则；不改表格/公式/脚注的既有 repair 顺序。

### T2（P1，数据安全）智能标点不再改写行内代码里的 `--` / `...`

**现状（有证据）**：finder-typora F2 三次复现（`A4`、`C1`、`H1`）：编辑视图里 `` `--dry-run` `` 变成 `` `—dry-run` ``，`Ctrl+/` 源码里也是破折号，**保存即写错字节**（截图 `r47-inline-code-punct-source.png`）。对照：`Ctrl+E` 先建代码再打 `--flag` 不受影响（`B5_ctrl_e_code`）。根因：`src/lib/smartTyping.ts:95-103` 的守卫只看 `storedMarks`/`rangeHasMark`；反引号写法下，输入第二个 `-` 时 code mark 尚未建立，`:61`（`--`→`—`）与 `:62`（`...`→`…`）先执行，收尾反引号再把被改过的文字套进代码。

**改动文件/函数**（单文件 + 测试）：
- `src/lib/smartTyping.ts`：
  - `handleTextInput`（`:82-132`）里 `lineBefore` 现在只在按 `-` 时取（`:108`）；改成 `inserted === '-' || inserted === '.'` 时取，**仍作第 4 个实参**传给 `smartInput`（P2-5）。签名 `src/lib/smartTyping.ts:35` 就是 `smartInput(before, inserted, after, lineBefore = '')`，`lineBefore` 本来在第 4 位；`smartTyping.test.ts:78-79`、`:83-84`、`:88-89` 等 6 处既有用例也都按 4 参传整行。**不改签名**：写成「第 5 个参数」会把既有用例的第 4 参挪位，表格 `|` 守卫与「普通行仍替换」用例一起红。若确实想加布尔（findings-typora F2 实现要点 2），只能加第 5 个可选参数并同步测试，本计划不选；
  - `smartInput`（`:26-71`，签名在 `:35`）在 `--`/`...` 两条替换之前加：`if (hasUnclosedBacktick(lineBefore)) return null`——数本行光标前未转义反引号个数，奇数即「正在写行内代码」；返回 `null`（插件 `:111` 会 `return false`），让这个字符按字面插入，**不得**返回 `insert` 吞掉输入。
  - 守卫写成纯函数 `export function hasUnclosedBacktick(line: string): boolean`（数反引号个数，跳过 `\`` 转义）便于单测。
- `src/lib/smartTyping.test.ts`：新增 (a) `lineBefore='参数 \`--'` + `inserted='-'` → 不替换；(b) `lineBefore='a..'` 在反引号内 → 不替换；(c) 已闭合（反引号偶数）→ 仍替换成 `—`/`…`；(d) 普通段落 `甲 -- 乙` 不变（仍是 `—`）；(e) 表格 `|` 守卫回归；(f) `Ctrl+E` 的 mark 路径由现有守卫兜住（现有用例保留）。

**验收**：
1. `npm test`：`smartTyping` 旧用例全过 + 新用例全过（记录条数）。
2. E2E `.tmp/e2e-r47-smart-typing.mjs`（CDP 9222）：在空文档里用 `keyboard.type` 打 `参数 \`--dry-run\` 与 \`a...b\` 结束`（与 finder 同一串），`Ctrl+/` 读源码断言包含 `` `--dry-run` `` 与 `` `a...b` ``，且**不包含** `—dry-run` / `a…b`；`Ctrl+S` 后盘上字节等于期望文本；再打 `甲 -- 乙` 断言仍是 `—`（回归）；截图 `shots/round-47/impl-smart-typing.png`；`consoleErrors: []`。
3. `npm run build` exit 0；`npm run roundtrip` 0 漂移（本任务不改序列化，但 `smartTyping` 在解析后路径上，跑一遍更稳）。
4. 静态对照（**只留判别性的**，P2-6）：`git grep -n "hasUnclosedBacktick" -- src` 改前 **0**（本 revision 实测）→ 改后 ≥2（定义 + 调用）。**删掉**原计划「`lineBefore` 由 3 行变 ≥5 行」——实测现在就是 **5 行**（`:28` 注释、`:35` 签名、`:59` 引用、`:108`、`:109`），这条改前就能过、等于没有。

**风险**：只对 `-`/`.` 两个键多算一次段落级 `textBetween`（段落内，1 MB 文档也不会整篇扫）；中文输入法组合态本来就被 `view.composing` 挡住；用户打一个落单反引号时，紧随的 `--` 会暂缓替换一个字符（收尾后如不在代码里，下一个 `-` 仍会替换）——写进 impl 的说明。

### T3（P1，缺陷）Mermaid 语法错误后清掉库塞进 `body` 的错误图

**现状（有证据）**：finder-typora F1（`docs/iteration/round-47/findings-typora.md:42-63`）。语法写错后，mermaid 11.12 把错误 SVG 写进它自己创建、挂在 `body` 下的 `#dmermaid-preview-N`，我们只把错误翻成中文一句话（正常），**没有清理那个容器**：切到完全没有图的文档后它仍在（`E1`–`E3`），并把页高从 **900 px 撑到 1013 px**（`I0`/`I1`/`I2`/`I3` 四步读数：`I3` 手动 `remove()` 后回到 900）。截图 `shots/round-47/r47-mermaid-error-stray-scrolled.png`。
代码：`src/lib/mermaidLazy.ts:126` 的 `mermaid.render(\`mermaid-preview-${renderSeq}\`, code)`；`:131-134` 只 `lastError = error` + 返回 `{ error: fallbackHint() }`；初始化在 `configure()`（`:72-82`）的 `module.initialize({ startOnLoad: false, securityLevel: 'strict', theme })`（`:78`）。
**可行性已核实**：mermaid **11.12.0** 有 `suppressErrorRendering?: boolean`，注释原文「Suppresses inserting 'Syntax error' diagram in the DOM.」（`node_modules/mermaid/dist/config.type.d.ts:210-214`）；`MermaidModule.initialize` 收 `Record<string, unknown>`（`src/lib/mermaidLazy.ts:8-11`），加键不破类型。

**改动文件/函数**：
- `src/lib/mermaidLazy.ts`：
  1. `configure()` 的 `initialize` 入参加 `suppressErrorRendering: true`；
  2. 新增导出 `removeMermaidContainer(id: string, doc: … | null = typeof document === 'undefined' ? null : document)`：`doc?.getElementById('d' + id)?.remove?.()`。**依赖注入式**，Node 里不碰 `document`（现有 12 条测试在 Node 跑）；
  3. `renderDiagram`（`:111-135`）把 id 存局部变量，`mermaid.render` 外层 `try/finally` 调 `removeMermaidContainer(id)`；`catch` 与 `{ error }` 语义不变。
- `src/lib/mermaidLazy.test.ts`（现有 **12** 条，实测 `^test\(` 计数 12；finder 写的「4 条」不准确）加 **2 条**：
  1. 配置判别：`fake.inits[0].suppressErrorRendering === true`（改前 `undefined` → 红；`fakeMermaid` 的 `inits` 在 `:22-31`）；
  2. 清理判别：传假 `doc`（`getElementById` 只认 `dmermaid-preview-1`），断言 `remove` 被调 1 次；`getElementById` 返回 `null` 时不抛。
- E2E `.tmp/e2e-r47-mermaid-cleanup.mjs`（CDP 9222，先 `reset`）：假工作区种两篇——`坏图.md` 含一个坏语法的 `` ```mermaid `` 块（如 `graph TD; A-->`）、`好图.md` 含一个合法图。

**验收**：
1. E2E：打开 `坏图.md`，等 `.mermaid-preview.is-error` 出现（≤5 s）后断言：`document.querySelectorAll('[id^="dmermaid-preview-"]').length === 0`、`document.body.innerText` 不含 `Syntax error in text`、`document.documentElement.scrollHeight <= window.innerHeight + 1`；切到 `好图.md` 断言 `.mermaid-preview.is-ready` 的 svg 仍 1 个（成功路径不受影响）、残留 0；再切回 `坏图.md`（缓存命中路径）仍无残留；截图 `shots/round-47/impl-mermaid-error-clean.png`；`consoleErrors: []`。
2. `npm test`：`mermaidLazy` **14 条**全过（12 + 2）；`npm run build` exit 0；`npm run verify` 首屏增量 **≤ 50 B**（0 依赖、源码约 +30 B）。
3. 静态对照（先贴改前）：`git grep -n "suppressErrorRendering" -- src` 改前 **0** → 改后 1；`git grep -n "removeMermaidContainer" -- src` 改前 **0** → 改后 ≥2（定义 + 调用）。
4. 记录 finder 的改前截面：`I0`/`I1`/`I2`/`I3` 四步读数 + 改后同一四步（`body.children` 数量、`scrollHeight`）写进 impl。

**风险**：`suppressErrorRendering` 只影响错误路径；成功路径回归靠现有 12 条 + E2E 的 `.is-ready`。`finally` 在成功路径也会跑：mermaid 正常时 `#d<id>` 已被库自己删掉，`getElementById` 返回 `null`，无副作用。**不要动**第 46 轮的 `renderKey`/`widget.spec.key` 与主题重绘（`AGENTS.md` 第 8 节两条坑）；不改 `mermaidPreview.ts` 的 `errorCache` 与 `is-error` 文案。

### T4（P1 验证）工作区图片插入后立刻显示：假盘按字节存，补第 38 轮 UNVERIFIED

**现状（有证据）**：产品侧「插入前先 `resolveAsset` 再 `setImage`」已经写好，但第 38 轮至今**没有一次真实证据**：E2E 用的假盘把 Blob 当 UTF-8 解码（`.tmp/r30-fsa.mjs:39-57` 的 `createWritable()`，其中 `chunk.text()` 在 `:45`/`:49`），写进去的 PNG 字节已坏，图自然 `naturalWidth === 0`——所以这条 P1 一直挂 UNVERIFIED，而不是「产品没做」。
**锚点一律按符号找（P2-4 修正）**：图片插入在 `src/App.tsx` 的 `assetFileName(file.name || 'image.png', Date.now())`（read/rg 报 `:4112`）→ `await writeAsset(dir, name, file)`（`:4113`）→ 注释「先解析一次再插节点：否则插入瞬间会闪一下破图」+ `await resolveAsset(relative)`（`:4115`）→ `setImage({ src: relative, alt: file.name })`（`:4116`）；`:4103-4114` 是**链接就地编辑**（`hasLink`/`setLinkEdit`），不是图片，别按旧行号跳。文件输入框 = 搜 `accept="image/*"` 的隐藏 `input`（read/rg 报 `:5369`；`Get-Content` 的 `.Count` 报 5310 是工具口径问题，见文首）。

**改动文件**（只改测试基建，除非断言暴露产品缺陷）：
- `.tmp/r30-fsa.mjs` 的 `createWritable()`（`:39-57`）：`write()` 收集块，**二进制安全**。最小改法：维护 `parts` 数组，遇到 `Blob` → `new Uint8Array(await chunk.arrayBuffer())`，遇到 `ArrayBuffer`/`ArrayBuffer.isView` → 转 `Uint8Array`，遇到字符串 → 记文本；`close()` 时若有二进制块 → 存成 `data:<type>;base64,<b64>`（`getFile()` 的 `data:` 分支在 `:28-37`，已能把种子还原成 `File`，两处正好闭合），否则照旧存字符串。`abort()` 同。
- 若 E2E 发现产品缺陷（`img` 不解析、`blob:` 不出现、保存后路径变 `data:` 等），**按最小改法修产品**并在 impl 里写清根因与符号位置。

**验收**：
1. E2E `.tmp/e2e-r47-image.mjs`（CDP 9222）：
   - 假工作区种一篇 `图.md`（含标题与一段正文）；打开后对隐藏的 `input[type=file][accept="image/*"]`（搜符号，不按行号）用 `setInputFiles` 送入一个真 1×1 PNG（base64 常量，`Buffer.from(b64,'base64')`）；
   - 等 800 ms 断言：`.ProseMirror img` 1 个、`src` 以 `blob:` 开头、`naturalWidth === 1 && naturalHeight === 1`（`complete === true`）；
   - 断言假盘 `assets/*.png` 的值是 `data:image/png;base64,...` 且解码后前 8 字节是 PNG 魔数 `89 50 4E 47 0D 0A 1A 0A`（证明写盘是字节而不是文本）；
   - `Ctrl+S` 后断言 `.md` 正文含 `![...](assets/...png)` 且**不含** `data:image`；重开该文档（切走再切回）→ 图仍 `naturalWidth === 1`；
   - `consoleErrors: []`、`failedRequests: []`；截图 `shots/round-47/impl-image-insert.png`（图已显示）。
2. 记录「第 38 轮 UNVERIFIED 关闭」的结论与三条读数；若只验证到浏览器态，写明宿主未测（本会话测不了宿主）。
3. `npm run build` / `npm test` 全过（本任务不改 `src/` 时也必须证明没碰坏：跑一遍）。截图与日志路径写进 impl。

**风险**：假盘写文件名由 `assetFileName(file.name, Date.now())` 生成，断言要用通配（`assets/` 下最新一个 `.png`）而不是写死名字；`URL.createObjectURL` 不会被回收但只在 E2E 会话里；别把假盘的二进制改造带进 `src/`。

## 二、本轮不做（写清为什么，下轮怎么排）

| 项 | 为什么不做 | 下轮怎么排 |
| :--- | :--- | :--- |
| **原 T3** 批注卡片进 Tab 顺序 + Enter 跳句（P2） | 级别 P2，且它的 E2E 必须**从零写批注播种**：计划原来让抄 `.tmp/r47-ui-probe.mjs`，实测该文件**不存在**（`.tmp/` 只有 `r47-ui-probe-log.txt`；`e2e-r47-ui-probe.mjs` 只查 DOM、不播种批注），等于多 5–8 min，35 min 装不下 | **下轮 UI/可访问性专项第一项**：假工作区写 `.sidelight/annotations/<cacheKey(文件名)>.json`（v2 形状 `{v:2,annotations,notes}`，见 `src/lib/annotations.ts`；路径规则见 `src/lib/cache.ts:81-83`），再按 `MarginRail.tsx:109-118` 的 `<article>` 加 `tabIndex/role/aria-label/onKeyDown` |
| 调度 ② 粘贴为纯文本 `Ctrl+Shift+V` | 第 46 轮 B4 已在应用里实测浏览器原生键可用；本轮若重写 handler，浏览器侧是空操作、宿主侧本会话测不了（非交互沙箱），属「造任务」 | 与「宿主 WebView2 加速键」一起验；只在 `typora-gap.md:41` 留「桌面宿主未验证」 |
| 调度 ⑤ 系统主题变化 Mermaid 重绘 | **第 46 轮已实现**：`src/lib/mermaidPreview.ts:123-161` 的 `data-theme` MutationObserver + `prefers-color-scheme` 监听，`renderKey = theme + hash`（`:102`）；本轮无新证据说它坏 | 不排；如需，下一轮顺手在 E2E 里 `emulateMedia` 复核 |
| 调度 ⑥ 真实安装包验证 | 非交互沙箱：`host\Sidelight.exe` 起不来（finder-ship §5），HKCU/开始菜单/SmartScreen 都需要真人桌面 | 把 finder-ship 的补测步骤交给真人，或在交互式会话跑 `host-smoke` |
| bug F1 源码改字后回编辑假脏（P1） | 不丢字节（finder 第 6 步证明写盘字节一致），只是误报 + 空写盘；本轮 4 个任务已满 | **下轮第一项**：抽 `normalizeForBaseline(text, original)` 纯函数给 `prepareSave`（`App.tsx:2848-2853`）与 `applySource`（`:3911-3932`）共用 + 1 条单测 + finder 的 d1 断言 |
| typora F3（Mermaid 源码与图双份，P2）、F4（frontmatter 无入口，P2）、F5（代码高亮，P2） | 本轮只装 P1；F3/F4 各 30–60 行，F5 高亮档要产品负责人批依赖 | 下一轮 Typora 体验批次：F4（只读 YAML 对话框，复用 `ShortcutsDialog` 壳）→ F3（折叠源码）→ F5 最小档（语言标签 + 复制） |
| ship 两条 P1 文档（README 头条 288,411 vs 293,205；安装包无台阶记录） | 纯文档，且与 typora F6 的整表订正同批更省事；本轮改 README 数字会和 T1 的 `npm run verify` 新值打架 | 下轮文档批次：`README.md:114`/`:116`/`:122`、`packaging/README.md:58`、`ADR-0017`、`typora-features.md:43/44/51/98/109`、`typora-gap.md:34/41/43/49`、`common.md:36` 旧体积线 |
| code F1/F2/F3（查找高亮 213 ms、源码逐键写 localStorage、死代码） | 性能/内部质量，按优先级排在功能与数据安全之后；且 F1/F2 的大文件数据要单独预算 | 下一轮质量项：F2 防抖最便宜（可先做），F3 死代码 −40 行顺手 |
| ui F1–F10（标题阶梯、设置面板滚动、radio 组方向键、大纲 Tab、链接浮层、表格条、hover/按下态、点击区、查找条 ARIA） | 10 条里 9 条是 CSS/ARIA，适合单独一轮成批改；本轮排进去会和 T1 的 `styles.css` 撞文件 | 下一轮 UI 专项：F1+F3+F8+F9 先做（纯 CSS/键盘，收益最大） |

## 三、逐任务实施顺序（给执行代理）

1. **T1**（最大，先做）：先改 `html.test.ts` 的 **2 处期望值**（`:47-52`、`:136`）→ 写 `inlineHtmlTags.ts`（**`escapeInlineHtml` 占位式** + 四个 mark）→ `html.ts` 的 `escapeHtmlForParse` 改成 `mapOutsideCode(text, escapeInlineHtml)` 一行 → `App.tsx` 注册四个 mark → 写 `inlineHtmlTags.test.ts` 并加进 `package.json` → `npm test` → E2E（四篇文档）→ CSS → 截图 → `npm run verify` 记体积。
   - **15 min 熔断**：到第 15 min 还没拿到 E2E 的 `.ProseMirror kbd` 计数 = T1 停，**整条回滚**（命令清单见 §T1 风险，含 `package.json` 与 `html.test.ts`），把时间给 T2/T3/T4；T1 带「合并分支已核实、端到端待证」进下轮。
2. **T2**：纯函数 + 单测 → E2E → 截图。
3. **T3**：`mermaidLazy.ts` 三处小改 + 2 条单测 → E2E（坏图/好图/切回）→ 截图。
4. **T4**：改假盘 → E2E →（若失败再修产品）→ 截图。
5. 收尾：`npm run build` + `npm test` + `npm run roundtrip` + `npm run verify` 串跑一遍；CHANGELOG `## Unreleased` 写四条；README/AGENTS/`typora-gap.md` 只改 T1 涉及的行与计数；`impl.md`/`test.md` 写读数与 UNVERIFIED。
   - **砍单顺序**（时间不够时）：先保已过的 T1；其次 T2（纯函数 + 单测，最便宜）；再次 T3（<10 行 + 单测）；T4 可只交假盘改造 + 读数，把图片 E2E 留到下一轮并把 UNVERIFIED 写清。

## 四、门禁与验收口径

| 门 | 命令 | 通过口径 |
| :--- | :--- | :--- |
| 构建 | `npm run build` | exit 0 |
| 测试 | `npm test` | 现有 **29** 文件 384 条全过 + 新增用例全过；T1 加 1 个文件 → **30** 文件；记录实际文件/条数（AGENTS 只记总数） |
| 往返 | `npm run roundtrip` | 0 漂移（T1/T2 必跑） |
| 首屏 | `npm run verify` | PASS；记录改前 293,205 B / 改后值 / 增量；内部线 310,000 B、硬线 320,000 B |
| E2E | 四个 `.tmp/e2e-r47-*.mjs`（inline-html / smart-typing / mermaid-cleanup / image） | 每条断言打印读数；`consoleErrors: []`；结尾 `process.exit(0)` |
| 截图 | `node scripts/shot.mjs http://localhost:5175 --out shots/round-47/...` | 5 张：`impl-inline-html-edit`、`impl-inline-html-preview`、`impl-smart-typing`、`impl-mermaid-error-clean`、`impl-image-insert` |
| 版本 | — | `package.json` 0.32.1 不动；CHANGELOG 只写 `## Unreleased` |
| 范围 | — | 不 push、不改 `release/`、不改 `host/`（本轮不碰安装包） |

## 五、记录要点（impl.md 必写）

- T1：首屏 gzip 改前/改后与差值；`npm test` 新条数；**html.test.ts 那 2 处期望的改前红/改后绿读数**；**手搓 doc → `manager.serialize` 的串与「不注册 mark」的对照串**（P1-2 的判别证据：`'按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。'` vs `'按 Ctrl 加 Enter，看 重点、H2O、x2。'`）；E2E 的四篇读数：`渲染.md` 的 `kbd/mark/sub/sup` 计数、`实体.md` 的 `diskSame`（P1-1）、`嵌套.md` 的 `diskSame` 与 `kbd:0/mark:1`（P2-4）、`行首.md` 的诊断计数；`<kbd class="x">` 与单开标签的负例读数；明确写「Node 单测判不了 mark 生效，`@tiptap/markdown/dist/index.js:953` 走字面文本，真判据在 E2E」。
- T2：E2E 源码串原文（含 `` `--dry-run` ``/`` `a...b` ``）；`甲 -- 乙` 回归读数；`hasUnclosedBacktick` 单测条数。
- T3：改后 `[id^="dmermaid-preview-"]` 计数 0、`bodyScrollHeight` 回到 900 左右、好图 svg=1、切回坏图仍 0；`inits[0].suppressErrorRendering === true` 读数；finder 的 `I0–I3` 作为改前对照。
- T4：PNG 魔数断言、`naturalWidth/naturalHeight`、盘上 `.md` 的 `assets/` 路径、重开后读数；第 38 轮 UNVERIFIED 的关闭依据。
- 全部：`git status --porcelain` 收工快照（只应多 `docs/iteration/round-47/`、`shots/round-47/` 与 `.tmp/` 脚本）；未做与 UNVERIFIED 逐条写清（宿主、真机 IME、真实钥匙串 API 等）。

## 六、下轮建议（按优先级，不占本轮）

1. **bug F1**：源码编辑保存后回编辑假脏（P1，最便宜，验尸已给根因与修法）。
2. **原 T3 批注卡片键盘可达性**（P2，AGENTS 未验清单）：自写 `.sidelight/annotations` 播种脚本后做，见 §二第一行。
3. **文档批次**：ship 两条 P1 + typora F6 整表（含 README 首屏数字改真实值、`common.md:36` 旧体积线删除）。
4. **Typora 体验**：F4（frontmatter 只读入口）→ F3（Mermaid 源码折叠）→ F5 最小档（语言标签 + 复制）。
5. **性能**：code F2（源码模式 300 ms 防抖）+ F3（死代码 −40 行、开 `noUnusedLocals`）。
6. **UI 专项**：ui F1/F3/F8/F9（标题阶梯、radio 方向键、hover/按下态、24×24 点击区）。
7. **查找高亮上限**（code F1）：防抖 + 装饰上限，需 1 MB 预算。

## 七、修订对照（revision 2 对 plan-review.md revision 1）

> revision 3 改写了本表 3 条决定（`restoreInlineHtml` → `escapeInlineHtml` 并前移到转义前、`getMarkOpening` 接线 → 手搓 doc `manager.serialize`、嵌套语义 → P2-4 口径 2），**以 §八 为准**；本表只作历史。

| 漏洞 | 这条改了什么 | 证据 |
| :--- | :--- | :--- |
| **P1-1** T1 单测空转 | §T1「测试」整段重写：删掉「解析→序列化===原文」的通过地位，只留 Node 可判的 4 类断言（`restoreInlineHtml`、`escapeHtmlForParse` 的判别性断言、负例、`getMarkOpening` 接线）；T1 通过依据唯一化成 E2E；§T1 可行性一段降级为「合并分支已核实、端到端解析待 E2E」 | `.tmp/critic47-probe3.mjs` 复跑：`SAME (no mark registered): true`（两条）；`@tiptap/markdown/dist/index.js:953` 是 `typeof window === "undefined"` 分支；未注册 mark 时 `getMarkOpening('inlineKbd') === ''`（本 revision `node -e` 实测） |
| **P1-2** 打破 `html.test.ts` | §T1 改动清单加「改 `html.test.ts` 的期望值」，并修掉 review 漏掉的第 2 处：`:47-52` **和** `:136` 都是同一条断言（`:133-137` 用例里的第三条），改前应是 **2 个用例红**；`:54-56`/`:58-64`/`:134-135` 逐字不动 | `src/lib/html.test.ts:47-52`、`:136` 原文；`escapeHtmlForParse` 在测试里的全部出现点（`:49`/`:55`/`:60`/`:134`/`:135`/`:136`）；`:58-64` 改后仍绿的实测（`repairHtml('按 <kbd>Ctrl&lt;/kbd&gt; + Enter 触发。')` → 原文） |
| **P1-3** 漏排 typora F1 | 选「排进去」：T3 换成 typora F1（P1，5–8 行，估 6 min），原 T3（P2）移入 §二并给下轮补法；任务数仍 4、总时长反而从 37 min 降到 35 min | `findings-typora.md:42-63`；`src/lib/mermaidLazy.ts:126`/`:131-134`；mermaid 11.12.0 的 `suppressErrorRendering`（`node_modules/mermaid/dist/config.type.d.ts:210-214`）；现有 `mermaidLazy.test.ts` 实测 12 条 |
| **P2-4** T4 锚点错（指向链接编辑） | §T4 全部锚点改按符号：`assetFileName`/`writeAsset`/`resolveAsset`/`setImage`（read/rg 报 `:4112/4113/4115/4116`）+ 隐藏 `input` 搜 `accept="image/*"`（`:5369`）；并写明 `Get-Content` 的 `.Count`（5310）与 read/rg（5471 行）口径不同，行号一律以 read/rg/`Select-String` 为准 | 本 revision 用 `read`/ripgrep 复测两组符号；`:4103-4114` 确为 `hasLink`/`setLinkEdit` |
| **P2-5** 抄不存在的 `.tmp/r47-ui-probe.mjs` | 因为 T3 换成 F1，这条引用整个消失；原 T3 进 §二时写明「播种脚本要自写」，并给出 v2 store 形状（`src/lib/annotations.ts`）与路径规则（`src/lib/cache.ts:81-83`） | `.tmp/r47-ui-probe.mjs` 不存在（`Get-Content` 报 PathNotFound）；`.tmp/` 只有 `r47-ui-probe-log.txt` 与 `e2e-r47-ui-probe.mjs`（只查 DOM，无 `annotations` 播种） |
| **P2-6** 预算超 35 min + T2 假基线 | §〇 改成「任务 30 min + 门禁 5 min = 35 min（硬上限）」，T4/T2/T3 各降到 6 min；§三加 **T1 15 min 熔断 + 整条回滚** 与砍单顺序；§T2 验收删掉「`lineBefore` 3 行→≥5 行」，只留 `hasUnclosedBacktick` 改前 0 → ≥2 | `smartTyping.ts` 的 `lineBefore` 实测 5 行（`:28`/`:35`/`:59`/`:108`/`:109`）；`hasUnclosedBacktick` 在 `src` 改前 0 命中 |

## 八、修订对照（revision 3 对 plan-review.md revision 2 的 6 条）

| 漏洞 | 这条改了什么 | 证据 |
| :--- | :--- | :--- |
| **P1-1** 转义后还原会把作者写的实体改成真标签（保存改字节） | §T1 改动清单重写：还原**前移到转义前**，作用在 `mapOutsideCode` 回调拿到的原始段上——`escapeInlineHtml(segment)` 先把真成对标签换成 `\u0001n\u0001` 占位符 → 再跑今天那条 `ANGLE` 转义 → 最后占位符换回；`html.ts:66-68` 只留 `return mapOutsideCode(text, escapeInlineHtml)`。测试加两条：守卫负例 `escapeHtmlForParse('写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。') === 原串`（改前也绿，专挡「先转义再还原」），占位符字符兜底。E2E 加**单独一篇 `实体.md`** 断言 `Ctrl+S` 后字节不变 | `.tmp/critic47-probe6.mjs`：`E1 today`=`"写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。"`、`E2 afterT1`=`"写成 <kbd>Ctrl</kbd> 才是转义示例。"`、`E3 changed by T1: true`；本 revision 探针 `.tmp/planner47-rev3-probe.mjs` A 段：来源 A `CHANGED`、来源 B/B2 `same`；浏览器侧后果链引 `@tiptap/markdown/dist/index.js:1019-1052`/`:952-953`；`src/lib/html.ts:34` 的 `source.includes` 守卫 |
| **P1-2** 单参 `getMarkOpening` 注册后抛 TypeError，判别性测试必红 | §T1 测试第 6 条换成「手搓 doc → `manager.serialize()` → 逐字节比对」，并给出完整 doc 与两个对照串（注册 / 不注册）；明写**不要**用单参 `getMarkOpening`，要留接线断言就用 2 参或 `(name, undefined, 'html')`；`getMarkOpening` 从通过依据里删除 | `.tmp/critic47-probe5.mjs` A1=`"按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。"`、A3=`"按 Ctrl 加 Enter，看 重点、H2O、x2。"`；`.tmp/critic47-probe6.mjs` E5/E6 抛 `TypeError: Cannot read properties of undefined (reading 'attrs')`；库 `node_modules/@tiptap/markdown/dist/index.js:1285-1296`（`mark.attrs`）、`:1290-1292`（未注册提前返回 `""`）；`tilde.test.ts:4` 已有 `MarkdownManager` 的 import 先例 |
| **P2-3** E2E 的 `textContent` 断言与自己播种的负例段落矛盾（正确实现也红） | §T1 验收把断言收窄到**渲染那一段**：`ps[0].querySelectorAll('kbd').length === 1 && ps[0].textContent.includes('Ctrl')`，字面负例段单独断言 `ps[1].textContent.includes('<kbd class="x">') && ps[1].querySelectorAll('kbd').length === 0`；**删掉**「整篇 `.ProseMirror` 的 `textContent` 不含 `'<kbd'`」。四篇文档拆分播种（渲染 / 实体 / 嵌套 / 行首） | `plan.md` rev2 的 `:82` 原句自相矛盾；字面负例按设计就是文本 `<kbd class="x">`（`&lt;` 在 HTML→DOM 时解成 `<`）；同类保真由 `html.test.ts:70-73`、`:112-115` 守着 |
| **P2-4** 配对正则会把嵌套内层还原，计划自己的负例会红 | 选**口径 2**（不写扫描器，省 8–12 行）：语义边界改成「外层不还原、内层干净的成对仍还原」；负例期望写死 `'&lt;kbd><mark>x</mark>&lt;/kbd>'`（**不要**写全转义串）；E2E 加 `嵌套.md` 断言 `diskSame: true` 与 `kbd:0 / mark:1` | `.tmp/critic47-probe6.mjs` E4=`"&lt;kbd><mark>x</mark>&lt;/kbd>"`、`.tmp/critic47-probe5.mjs` D1/D3（`negative test would pass as written: false`）；本 revision 探针 B 段实测同值、D 段 `nested same(today)=true same(new)=true`（字节由 `repairHtml` 的 source 守卫保住） |
| **P2-5** T2 把 `lineBefore` 写成「第 5 个参数」，与签名和 6 处既有用例冲突 | §T2 改成「**仍作第 4 个实参**」，引用签名 `smartInput(before, inserted, after, lineBefore = '')` 与既有 4 参用例；**不改签名**；若加布尔只能加第 5 个可选参数并同步测试（本计划不选） | `src/lib/smartTyping.ts:35` 签名（`lineBefore` 第 4 位）、`:108` 取值点、`:109` 调用；`src/lib/smartTyping.test.ts:78-79`、`:83-84`、`:88-89` 等 6 处 4 参调用；本 revision `read` 复核 |
| **P2-6** 熔断回滚清单漏 `package.json` 与 `html.test.ts` | §T1 风险的回滚命令一次写全：`git checkout -- src/lib/html.ts src/lib/html.test.ts src/App.tsx src/styles.css package.json`，再 `rm -f` 两个新文件，**回滚后跑 `npm test` 确认 29 文件全绿**；§三 熔断段改为引用同一条清单。另加一条风险：混排文档（真标签 + 字面实体）的字节变化是**既有行为**，别当 T1 回归 | `package.json` 的 `test` 链实测 **29** 条（`(scripts.test -split ' && ').Count` = 29，`html.test.ts` 在链上）；`html.test.ts` 实测 **24** 条、`:47-52`/`:136` 是仅有的 2 处期望改动；探针 D 段 `mixed: same(today)=false same(new)=false`（改前改后一致，与 T1 无关） |

**revision 3 没有加范围**：占位式比 revision 2 的两段式**代码更少**（`mapOutsideCode` 只剩一处接线）；新增 1 条单测 + E2E 多播 3 篇常量字符串文档，时间从 T1 的 12 min 里出；T2/T3/T4 与总预算 35 min 不变。
