# 第 47 轮 · 实施（executor）

- 轮次：`round=47`、`nn=47`；轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6`（实测 `git rev-parse HEAD` 同值）。
- 输入：`plan.md`（revision 3）、`plan-review.md`（revision 3，结论 REVISE，5 条：P1 ×1、P2 ×4）、`AGENTS.md` 第 4/8 节、涉及源码。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9222**（每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`）。
- 未 commit、未 push、未改 `package.json` 版本（0.32.1 不动）、未碰 `release/`（`git status --porcelain -- release` 0 行）。
- **plan-review rev3 的 5 条全部按 review 的最小修法落地**（不扩范围）：P1-1 空内容 / 纯空白内容不还原；P2-2 守卫上移到 `smartInput` 顶部并扩 `lineBefore` 取数；P2-3 假盘只对「`Blob` 且 MIME 非 `text/*`」存 base64；P2-4 E2E 用 `.preview-pane kbd` 而不是 `editor.getHTML()`；P2-5 表格与列表都进了 `渲染.md`。逐条见 §五。

## 一、任务状态

| id | 标题 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| **T1** | 行内 HTML 白名单渲染（`<kbd>`/`<mark>`/`<sub>`/`<sup>`） | **DONE** | E2E 四篇 `diskSame:true`；`kbd:3`/`mark`·`sub`·`sup` 各 1；预览同计数；5 张截图 |
| **T2** | 智能标点不再改写反引号行内代码 | **DONE**（做到 review P2-2 的完整档） | 源码与盘上均有 `` `--dry-run` ``/`` `a...b` ``/`` `grep "foo"` ``/`` `中文?` ``；`甲 — 乙` 回归 |
| **T3** | Mermaid 错误图不残留 `body` | **DONE** | 四步 `stray:0`、`scrollHeight` 900、好图 `svg:1` |
| **T4** | 工作区插图后立刻显示（补第 38 轮 UNVERIFIED） | **DONE** | `naturalWidth:1`、`blob:`、盘上 PNG 魔数、`.md` 写相对路径、重开仍显示 |

无 BLOCKED、无回滚、未触发 T1 的 15 min 熔断。

## 二、改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/inlineHtmlTags.ts` | **新增**。`INLINE_HTML_TAGS`、`escapeInlineHtml`（先占位、再转义、最后换回）、`inlineMarks`（四个 mark：`parseHTML: () => [{ tag }]`、`renderHTML: () => [tag, 0]`、`renderMarkdown` 写回 `<tag>…</tag>`、`markdownOptions.htmlReopen`） |
| `src/lib/html.ts` | `escapeHtmlForParse` 改一行接线：`return mapOutsideCode(text, escapeInlineHtml)`（实体解码、围栏守卫、`repairHtml` 一行未动） |
| `src/lib/html.test.ts` | 2 处期望值（`:47-52` 与 `:136`）：`&lt;kbd>Ctrl&lt;/kbd>` → `<kbd>Ctrl</kbd>`，用例名改「成对白名单标签还原，其余仍转义」 |
| `src/lib/inlineHtmlTags.test.ts` | **新增** 10 条（白名单保留 / 负例 / 空内容 / 围栏与行内代码 / 实体守卫 / 占位符兜底 / 嵌套口径 2 / 手搓 doc 序列化判别 + 不注册对照） |
| `src/App.tsx` | `extensions` 里 `...inlineMarks`（放在 `Markdown.configure` 之前） |
| `src/styles.css` | `.doc-body kbd`（键帽：1px 边框、4px 圆角、等宽、`padding: 0 4px`、`line-height: 1.4`）、`.doc-body mark`（`--accent-wash` 混 `--paper` 的底色、`color: inherit`）、`.doc-body sub/sup`（0.75em、`line-height: 0`、`vertical-align: baseline` + `top/bottom`） |
| `src/lib/smartTyping.ts` | 新增 `hasUnclosedBacktick` 与 `needsLineContext`；`smartInput` 顶部加反引号守卫；`handleTextInput` 的 `lineBefore` 取数从「只按 `-`」扩到 `needsLineContext` 的一组键；签名与第 4 参位置**未改** |
| `src/lib/smartTyping.test.ts` | +4 条（`hasUnclosedBacktick` 计数、代码里 `--`/`...` 不替换、代码里引号/括号/半角标点不替换、`needsLineContext` 只认会触发规则的键） |
| `src/lib/mermaidLazy.ts` | `initialize` 加 `suppressErrorRendering: true`；新增 `removeMermaidContainer(id, doc?)`（依赖注入）；`renderDiagram` 的 `render` 外层 `try/finally` 清理 |
| `src/lib/mermaidLazy.test.ts` | +2 条（`inits[0].suppressErrorRendering === true`；清理只认 `dmermaid-preview-1`、`null` 不抛） |
| `package.json` | 只把 `inlineHtmlTags.test.ts` 挂进 `test` 链（29 → 30 个文件）；版本未动 |
| `.tmp/r30-fsa.mjs` | **测试基建**：`createWritable()` 二进制安全（`parts` 数组；`Blob` 且 MIME 非 `text/*` → 字节；`ArrayBuffer`/视图仍按文本；`close()` 全二进制时拼成 `data:<type>;base64,`） |
| `docs/typora-gap.md` | 「行内 HTML 渲染」从「缺的」移进「已经有的」（32/9，编辑与格式 2→1）；「高亮、上下标、TOC、emoji」改成只差语法与 TOC/emoji；下一批第 1 条同步 |
| `README.md` | 能力句补第 47 轮；差距计数 31/10 → **32/9**；测试计数 29 个文件 384 条 → **30 个文件 400 条**（两处） |
| `AGENTS.md` | 第 3/6 节测试计数 → 30 文件 400 条；第 6 节补第 47 轮能力句；差距计数 → **32 项有、9 项缺** |
| `docs/CHANGELOG.md` | `## Unreleased` 下新增 `**第 47 轮（同一未发版区间）**`：四条改动 + 门禁 + 文档 + UNVERIFIED |

`.tmp/` 下新增脚本（不进版本控制）：`e2e-r47-inline-html.mjs`、`e2e-r47-smart-typing.mjs`、`e2e-r47-mermaid-cleanup.mjs`、`e2e-r47-image.mjs`、`r47-trash-regression.mjs`、`r47-t1-probe.mjs`、`r47-exec-test.log`。

## 三、命令与结果（全部实测）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | **exit 0**（`npm run build` 内又跑一次，exit 0） |
| `npm test` | **30 个文件 400 条，0 fail**（`exit=0`；日志 `.tmp/r47-exec-test.log`，30 段 `ℹ fail 0`） |
| `npm run roundtrip` | rich **5/7**、source **7/7**、firstSaveBlocked 1/7（04-reference-links）；与打底一致，`docs/roundtrip-report.md` **无 diff** |
| `npm run verify` | **PASS**，首屏 gzip **293,751 B**（改前 293,205 B，**+546 B**；`total raw=949553 gzip=293751 headroom=26249 files=3 max=320000`；`target=310000 gap=16249`；主 chunk `index-DVSSfE44.js` 912,306 B raw / 285,826 B gzip） |
| 静态对照 | `git grep -n --untracked`：`inlineKbd` HEAD **0** → 现 **2**；`escapeInlineHtml` **0 → 2**；`hasUnclosedBacktick` **0 → 9**；`suppressErrorRendering` **0 → 4**；`removeMermaidContainer` **0 → 6**；`needsLineContext` **0 → 9**。`Select-String -Path src/lib/html.test.ts -Pattern '&lt;kbd>Ctrl'` HEAD **2** → 现 **0** |

### T1 E2E（`.tmp/e2e-r47-inline-html.mjs`，日志见 §四 引文）

```
## t1-render {"dom":{"kbd":3,"mark":1,"sub":1,"sup":1,"tdKbd":1,"liKbd":1,"preKbd":0,
  "p0":{"kbd":1,"text":"按 Ctrl + Enter，看 重点、H2O、x2。"},
  "p1":{"kbd":0,"text":"字面负例：<kbd class=\"x\"> 与单开 <kbd> 与空对 <kbd></kbd>、<kbd> </kbd>。"},
  "kbdText":"Ctrl","markBg":"color(srgb 0.921882 0.944627 0.930274)","kbdBorder":"1px"},
  "diskSame":true,"diskLen":238,"seedLen":238,"dirty":false,
  "sourceTags":{"kbdOpen":7,"kbdClose":6,"literalClass":true,"singleOpen":true,"entityFree":true}}
## t1-preview {"mode":"preview","kbd":3,"mark":1,"sub":1,"sup":1,"kbdText":"Ctrl"}
## t1-entity  {"dom":{"kbd":0,"text":"写成 <kbd>Ctrl</kbd> 才是转义示例。"},
               "diskSame":true,"saved":"写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。\n","dirty":false}
## t1-nested  {"dom":{"kbd":0,"mark":1,"text":"<kbd>x</kbd>"},
               "diskSame":true,"saved":"<kbd><mark>x</mark></kbd>\n"}
## t1-linestart {"dom":{"mark":1,"text":"重点 写在行首。"},"diskSame":true}
## t1-reopen  {"dom":{…与 t1-render 同…},"state":{"name":"渲染.md","mode":"edit","dirty":false}}
## z-errors {"errors":[]}
```

- `kbd:3` = 正文 1 + 表格单元格 1（`tdKbd`）+ 列表项 1（`liKbd`）；**围栏里 0**（`preKbd:0`，`mapOutsideCode` 未受影响）。
- 字面负例段 `p1` 的 `kbd:0` 且文本里 `kbd class="x"`、单开、`<kbd></kbd>`、`<kbd> </kbd>` 都还在（review P1-1 的空内容负例一并覆盖）。
- `sourceTags.kbdOpen 7`：4 组真成对 + 字面段 3 个开标签；`kbdClose 6`：4 组真成对 + 空对与空白对的结束标签。
- **Node 单测判不了 mark 生效**：`@tiptap/markdown/dist/index.js` 在 `typeof window === "undefined"` 时把 HTML 当字面文本，`manager.parse` 后的序列化恒等于原文（空转）。真判据是本节的 E2E；Node 侧只判「转义结果」与「手搓 doc → `manager.serialize` 写回原标签」：
  - 注册四个 mark：`按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。`
  - 不注册：`按 Ctrl 加 Enter，看 重点、H2O、x2。`（改前红 / 改后绿）
- 截图：`shots/round-47/impl-inline-html-edit.png`、`shots/round-47/impl-inline-html-preview.png`。

**深色主题读数**（`.tmp/r47-dark-style-probe.mjs`，同一页面切 `data-theme`；不是走设置面板切主题）：

```
light  kbd {color:rgb(29,32,35) bg:rgb(255,253,248) border:1px lineHeight:20.468px}
       mark {color:rgb(29,32,35) bg:color(srgb 0.921882 0.944627 0.930274) lineHeight:33.15px}
       sub  {fontSize:12.75px lineHeight:0px verticalAlign:baseline}
dark   kbd {color:rgb(233,230,224) bg:rgb(28,31,35) border:1px}
       mark {color:rgb(233,230,224) bg:color(srgb 0.122118 0.166667 0.163137)}
```

- `mark` 的文字对比度（WCAG 公式手算，`color(srgb …)` 由浏览器换算到 0–255）：深色约 **11.8:1**、浅色约 **14.3:1**（门槛 4.5:1）。`kbd` 的 `lineHeight 20.468px < 正文 33.15px`，上下不出行框；`sub/sup` 的 `lineHeight:0` 与 `vertical-align:baseline` 与计划一致。

### T2 E2E（`.tmp/e2e-r47-smart-typing.mjs`）

```
## t2 {"src":"开始。\n\n参数 `--dry-run` 与 `a...b` 结束\n\n`grep \"foo\"` 与 `中文?`\n\n\n\n甲 — 乙\n",
      "disk":"（与 src 逐字相同）",
      "checks":{"rawDashCode":true,"rawDotsCode":true,"noEmDashInCode":true,"noEllipsisInCode":true,
                "asciiQuoteInCode":true,"halfToFullInCode":true,"tableDashStillEmdash":true,
                "diskSameAsSource":true,"diskRawDash":true},
      "state":{"name":"打字.md","mode":"edit","dirty":false}}
## z-errors {"errors":[]}
```

- 覆盖 review P2-2 的两条同因缺口：引号在反引号代码里保持 ASCII（`` `grep "foo"` ``），中文后的半角 `?` 在代码里不转全角（`` `中文?` ``）。
- 普通段落 `甲 -- 乙` → `甲 — 乙` 仍是原行为（回归）。单测 15 条全过。
- 截图：`shots/round-47/impl-smart-typing.png`。

### T3 E2E（`.tmp/e2e-r47-mermaid-cleanup.mjs`）

改前（finder `r47-typora-i.log`，同一路径）：

```
I0_blank      scrollHeight=900  bodyChildren=[DIV.#root, SCRIPT.]
I1_after_error scrollHeight=1013 bodyChildren=[DIV.#root, SCRIPT., DIV.#dmermaid-preview-1]   ← 残留
I3_after_remove scrollHeight=900 bodyChildren=[DIV.#root, SCRIPT.]
```

改后（四步，`stray` 恒 0，`scrollHeight` 恒 900）：

```
i1 坏图-运行中      {"stray":0,"bodyHasSyntaxError":false,"scrollHeight":900,"isError":1,"svg":0,"hint":"图表没渲染出来，代码块内容仍是原文，可以继续编辑。"}
i2 切到无图后        {"stray":0,"bodyHasSyntaxError":false,"scrollHeight":900,"isError":0,"svg":0}
i3 好图             {"stray":0,"scrollHeight":900,"isReady":1,"svg":1}
i4 切回坏图（缓存命中）{"stray":0,"scrollHeight":900,"isError":1,"svg":0}
## z-errors {"errors":[]}
```

- 单测 14 条（12 + 2）全过；`suppressErrorRendering` 与 `removeMermaidContainer` 都有判别性断言。
- 截图：`shots/round-47/impl-mermaid-error-clean.png`。

### T4 E2E（`.tmp/e2e-r47-image.mjs`，补第 38 轮 UNVERIFIED）

```
## t4 {"img":{"count":1,"src":"blob:http://localhost:51","naturalWidth":1,"naturalHeight":1,"complete":true,"width":1},
      "assetPath":"assets/mwkrxfmn-shot.png","assetKind":"data:image/png;base64,iVBO",
      "magic":"89 50 4e 47 0d 0a 1a 0a",
      "disk":"![shot.png](assets/mwkrxfmn-shot.png)\n\n# 图\n\n正文一段。\n",
      "diskHasRelativePath":true,"diskHasDataImage":false,
      "reopened":{"count":1,"src":"blob:http://","naturalWidth":1},
      "state":{"name":"图.md","dirty":false}}
## z-errors {"errors":[],"failed":[]}
```

- 三条读数闭合：假盘写的是**字节**（PNG 魔数对得上）、正文拿的是 `blob:` 且 `naturalWidth/naturalHeight = 1`、保存写的是 `assets/…png` 相对路径且不含 `data:image`；切走再切回仍 `naturalWidth:1`。
- 第 38 轮 UNVERIFIED 就此关闭（浏览器态；宿主态仍是 UNVERIFIED，见 §六）。
- 截图：`shots/round-47/impl-image-insert.png`。

## 四、与计划的偏差（都按最小改动，未扩范围）

1. **`inlineKbd` 的静态命中数是 2 不是 ≥3**：计划假设 mark 名是字面量，实际用 `INLINE_HTML_TAGS.map()` 工厂生成名字，所以 `src` 里的字面 `inlineKbd` 只出现在新测试的 `marks: [{ type: 'inlineKbd' }]` 与一条注释里。**名字仍被测试钉住**：那条 `manager.serialize` 断言用的就是 `inlineKbd`，改名会红。另外 `git grep` 默认不扫未跟踪文件，必须加 `--untracked` 才看得到新文件（见 §七 新坑）。
2. **`<kbd>a<b</kbd>` 的期望值取实测**：plan 只给了 `<kbd>R&D</kbd>` → `&lt;kbd>R&D&lt;/kbd>`；内容含 `<` 时 `ANGLE` 会把内层那个 `<` 也转义，实测是 `&lt;kbd>a&lt;b&lt;/kbd>`（仍属于「不还原」，测试按实测写）。
3. **`.tmp/r30-fsa.mjs` 的调用形状**：`installFakeWorkspace(page, mapping)`（内部 `addInitScript(fn, { files })` 已经包了一层）。按 plan 字面写成 `{files: mapping}` 会得到一个名叫 `files` 的假文件、树里只有 `assets`/`sub` 两个目录——第一次跑 E2E 就卡在这里，改回映射本身后立刻通过。
4. **截图工具**：`scripts/shot.mjs` 不是通用截图器（它自己跑一段公式场景、清 `localStorage`，并在结尾 `browser.close()` 断 CDP），本轮 UI 证据用 E2E 同一个 page 的 `page.screenshot()` 落盘到 `shots/round-47/impl-*.png`。
5. **T2 选了 review P2-2 的第 1 条**（守卫上移 + 扩取数键），没有走「只覆盖 `--`/`...` 并登记 UNVERIFIED」的第 2 条：代价只是每个标点键多一次段落级 `textBetween`（1 MB 也只扫当前段落），收益是把「反引号代码里的引号 / 半角标点仍被改」这个同因缺口一次关掉。

## 五、plan-review rev3 五条的落地

| 条目 | 落地 |
| :--- | :--- |
| **P1-1** 空 / 纯空白内容的成对标签会丢字节 | `escapeInlineHtml` 的掩码回调 `if (!/\S/.test(inner)) return whole`；单测 `escapeHtmlForParse('<kbd></kbd>') === '&lt;kbd>&lt;/kbd>'`、`'<kbd> </kbd>' → '&lt;kbd> &lt;/kbd>'`；E2E 渲染篇字面段同时播了这两个串，`diskSame:true` |
| **P2-2** 守卫只盖 `--`/`...` | 守卫上移到 `smartInput` 顶部，`lineBefore` 由 `needsLineContext` 决定；E2E 加了 `` `grep "foo"` `` 与 `` `中文?` `` |
| **P2-3** 假盘改二进制会波及 trash | 只对「`Blob` 且 MIME 非 `text/*`」走字节；`ArrayBuffer`/视图仍按文本（`src/lib/trash.ts` 的两条字节写不变）。**回归实测**（`.tmp/r47-trash-regression.mjs`，与 `.tmp/e2e-r45-bug-a.mjs` 同一路径与同一套树右键操作）：`delRes:"ok"`、`trashKey:".sidelight/trash/20261117-221732-4l555z-甲.md"`、`trashIsText:true`（副本仍是 `# 甲\n\n甲的第一段。\n`，**不是** `data:` URL）、撤销后 `restoredSame:true`、`errors:[]` |
| **P2-4** `editor.getHTML()` 页面里取不到 | E2E 改为 `.preview-pane kbd/mark/sub/sup` 计数（`kbd:3`），导出串只写「与预览同源」 |
| **P2-5** 表格/列表承诺没进验收 | `渲染.md` 加了小表（单元格 `<kbd>Ctrl</kbd>`）与列表项（`- 按 <kbd>Esc</kbd>`），`tdKbd:1`/`liKbd:1`，且整篇 `diskSame:true`（顺带证明表格整块复用与 mark 共存） |

## 六、UNVERIFIED（本轮）

1. **真实宿主（WebView2）里的行内 HTML 渲染与插图**：本会话是非交互沙箱，`host\Sidelight.exe` 起不来；只到浏览器 + CDP 9222。补测：交互式会话跑 `host/build.ps1` + `host-smoke`，打开含 `<kbd>` 的文档看 DOM 里有没有 `kbd` 元素。
2. **真实中文输入法下的反引号行内代码**：E2E 是 `keyboard.type` 的 ASCII 注入（`view.composing` 分支未覆盖）。补测：真 IME 里打 `` `--flag` ``。
3. **HTML 导出里的 `<kbd>` 观感**：导出走 `editor.getHTML()`，与预览同源；本轮只断言了预览面板的计数与计算样式，没有实际打开导出的 HTML 文件。
4. **「真标签 + 字面实体」混排的字节变化**：`repairHtml` 的 `source.includes('<kbd')` 守卫会把同篇里的字面 `&lt;kbd>` 也还原，属既有行为（plan §T1 风险已写、finder 探针 `mixed same(today)=false same(after)=false`），本轮不动、不判回归。
5. **安装包字节**：不回填文档（以 Release 页 `SHA256SUMS-<版本>.txt` 为准）；本轮没打包。

## 七、新踩的坑（建议进 AGENTS §8）

- **`.tmp/r30-fsa.mjs` 的 `installFakeWorkspace(page, files)` 第二个参数就是「路径 → 内容」映射**：内部已经 `addInitScript(fn, { files })`，再套一层 `{files: mapping}` 会得到一个名字叫 `files` 的假文件，文件树里只剩 `assets`/`sub`，表现得像「种子没生效」。计划/报告里写 `{files}` 时要区分「映射」与「包装」。
- **`git grep` 默认不扫未跟踪文件**：本轮新文件全是 `??`，不加 `--untracked` 时 `inlineKbd`/`escapeInlineHtml` 的计数会是「只算改动文件」的假 0，容易被判成「没落地」。静态对照统一 `git grep -n --untracked`。
- **`MarkdownRendererHelpers.renderChildren` 在类型上要求一个 `nodes` 参数**：mark 的 `renderMarkdown` 里按 probe 那样写 `helpers.renderChildren()` 会 `TS2554`；markdown 序列化器实际传入的是「内容是占位符文本的合成节点」，所以写 `helpers.renderChildren(node.content ?? [])` 既过类型又在运行时拿回占位符。
- **`scripts/shot.mjs` 不是截图工具**：它自己跑公式场景、`localStorage.clear()`，结尾还 `browser.close()`（会断 CDP）。要「当前页面长这样」的证据，用 E2E 脚本自己的 `page.screenshot()`；需要截图器时另写，别指望它通用。

## 八、收工快照

```
 M AGENTS.md
 M README.md
 M docs/CHANGELOG.md
 M docs/typora-gap.md
 M package.json
 M src/App.tsx
 M src/lib/html.test.ts
 M src/lib/html.ts
 M src/lib/mermaidLazy.test.ts
 M src/lib/mermaidLazy.ts
 M src/lib/smartTyping.test.ts
 M src/lib/smartTyping.ts
 M src/styles.css
?? docs/iteration/round-47/
?? shots/round-47/
?? src/lib/inlineHtmlTags.test.ts
?? src/lib/inlineHtmlTags.ts
```

`release/` 0 行改动；`package.json` 版本仍 0.32.1。
