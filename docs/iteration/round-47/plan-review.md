# 第 47 轮 · 计划审查（critic，只读）

> **revision 3**（critic 复核，2026-11-17 22:2x）：审查对象是 `plan.md` **revision 3**（267 行，planner 按 `plan-review.md` revision 2 的 6 条改过）。本文件**替换** revision 2 的审查；上一版 6 条的复核见 §一（**全部落地**，逐条给了实测），本 revision 新发现 **5 条**（P1 ×1、P2 ×4）见 §二/§三。
>
> - 轮次：`round=47`、`nn=47`；轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6`（`git rev-parse HEAD` 实测同值）。
> - 输入：`plan.md`（revision 3）、`plan-review.md`（revision 2）、5 份 `findings-*.md`、`AGENTS.md` 第 4/8 节、`src/lib/{html,codeScan,smartTyping,mermaidLazy,serializeDocument,escapes,trash,asset}.ts`、`src/lib/*.test.ts`、`src/App.tsx`、`src/components/PreviewPane.tsx`、`package.json`、`scripts/roundtrip.mjs`、`.tmp/r30-fsa.mjs`、`node_modules/@tiptap/{core,markdown}`、`node_modules/marked/lib/marked.esm.js`、`node_modules/mermaid/dist/config.type.d.ts`。
> - 只读：未改产品代码、未连 CDP（不碰 dev server 与 9222）、未 commit/push、未碰 `release/`。只新增了 4 个探针 `.tmp/critic47-probe{8,9,10,11}.mjs`（`.tmp/` 不进版本控制；`git status --porcelain` 仍只有 `?? docs/iteration/round-47/`、`?? shots/round-47/`）。
> - 结论：**REVISE**，**5 条（P1 ×1、P2 ×4）**。上一版 6 条确实修掉了（连 P1-2 的 `serialize` 期望串都对上了）；新漏洞是「白名单成对标签的**空内容**会丢字节」（T1 唯一的丢字节路径）、「T2 的守卫只盖 `--`/`...`，引号仍在反引号代码里被改」、「T4 改假盘会波及 trash 的字节写」、「T1 验收里的 `editor.getHTML()` 在页面里取不到」、「T1 风险说 E2E 覆盖表格/列表，验收里没有」。

## 〇、一句话结论

T1 的两条 P1 修法（**先占位再转义**、**手搓 doc → `manager.serialize`**）都正确，我按计划字面复跑全部对上（§一、§四）。**但 `PAIR` 的 `[^<&\n]*?` 允许空内容**，于是 `<kbd></kbd>` / `<kbd> </kbd>` 这类今天逐字节保真的文档，T1 之后保存会把标签丢掉——这正是本轮承诺的「保存逐字节不变」被破开的一个口子，一行回调守卫可修。其余 4 条是范围/可执行性问题，修起来都便宜。

## 一、上一版 6 条：全部修掉（复核证据）

| 漏洞 | 判定 | 复核证据 |
| :--- | :--- | :--- |
| **P1-1** 转义后还原会把作者写的实体改成真标签 | **已修** | `plan.md:50-63` 的 `escapeInlineHtml` 改成「先 `PAIR` 换占位符 → 再 `ANGLE` 转义 → 最后换回」；`plan.md:65` 的 `html.ts:66-68` 只留 `return mapOutsideCode(text, escapeInlineHtml)`。实测（`.tmp/critic47-probe8.mjs` §3）：`escapeNew('写成 &lt;kbd>Ctrl&lt;/kbd> 才是转义示例。')` 与今天**逐字节相同**（`same`），真标签 `按 <kbd>Ctrl</kbd> 触发。` 也仍是 `<kbd>Ctrl</kbd>`（`CHANGED`，正是要的结果）。`plan.md:77` 补了守卫负例、`plan.md:98` 补了单独的 `实体.md` E2E，两处都对。**注意**：`src/lib/html.ts:66-68` 的现状是纯转义、**没有**实体解码（解码在 `repairHtml`，`html.ts:20-53`），所以「还原前移到转义前」不会碰第 41 轮的保存侧顺序 |
| **P1-2** 单参 `getMarkOpening` 注册后抛 TypeError | **已修** | `plan.md:79-91` 换成手搓 doc → `manager.serialize`。我按计划字面复跑（`.tmp/critic47-probe8.mjs` §1）：`withMarks` = `"按 <kbd>Ctrl</kbd> 加 Enter，看 <mark>重点</mark>、H<sub>2</sub>O、x<sup>2</sup>。"`，与 `plan.md:88` 的期望**完全相等**（`equal: true`）；不注册 mark 时是 `"按 Ctrl 加 Enter，看 重点、H2O、x2。"`（`discriminative: true`）。`plan.md:90` 还写清了「不要用单参」，并把 2 参备用形状给了 |
| **P2-3** `textContent` 断言与自己播种的负例矛盾 | **已修** | `plan.md:101` 把断言收窄到 `ps[0]`（渲染段）与 `ps[1]`（字面负例段），并明确删掉「整篇不含 `<kbd`」。四篇文档拆分（渲染/实体/嵌套/行首）也在 `plan.md:96-100` |
| **P2-4** 配对正则会把嵌套内层还原 | **已修** | `plan.md:42` 语义写死口径 2；`plan.md:78` 期望 `'&lt;kbd><mark>x</mark>&lt;/kbd>'`；`plan.md:104` E2E 断言 `kbd:0 / mark:1` + `diskSame`。实测（probe8 §3 `nested`）`new="&lt;kbd><mark>x</mark>&lt;/kbd>"`，与计划的期望一字不差 |
| **P2-5** `lineBefore` 写成第 5 个参数 | **已修** | `plan.md:130` 明写「仍作第 4 个实参」、不改签名。实测 `src/lib/smartTyping.ts:35` 签名就是 `smartInput(before, inserted, after, lineBefore = '')`；`smartTyping.test.ts:78/79/83/84/88/89` 6 处都是 4 参，且**没有**任何既有用例的 `lineBefore` 含反引号（新增守卫不会撞旧用例） |
| **P2-6** 熔断回滚清单漏 `package.json` / `html.test.ts` | **已修** | `plan.md:115-116`：`git checkout -- src/lib/html.ts src/lib/html.test.ts src/App.tsx src/styles.css package.json` + `rm -f` 两个新文件 + 回滚后 `npm test` 确认 29 文件全绿。实测 `package.json:15` 的 `test` 链 **29** 条（`-split ' && '` 计数 29），`html.test.ts` 在链上 |

## 二、P1 漏洞（新，1 条）

### P1-1 `PAIR` 允许空内容：`<kbd></kbd>` / `<kbd> </kbd>` 这类今天逐字节保真的文档，T1 之后保存会**丢掉标签**

`plan.md:52` 的配对正则是 `/<(kbd|mark|sub|sup)>([^<&\n]*?)<\/\1>/g`，内容段 `*?` **允许 0 个字符**（也允许全空白）。`plan.md:41` 的语义边界只排除了「属性 / 单开 / 内容含 `<` 或 `&` / 跨行」，没有排除空内容；E2E 的负例段（`plan.md:97`）也只播了 `<kbd class="x">` 与单开 `<kbd>`。

实测三段（都在本 revision 的探针里）：

```
# .tmp/critic47-probe8.mjs §3（计划字面的 escapeInlineHtml）
empty pair : today="&lt;kbd>&lt;/kbd>"           new="<kbd></kbd>"            (CHANGED)
space pair : today="&lt;kbd> &lt;/kbd>"          new="<kbd> </kbd>"           (CHANGED)

# .tmp/critic47-probe11.mjs（今天：无 mark、整段字面文本，走真实 serializeDocument）
SAME <kbd></kbd>        : saved="<kbd></kbd>\n"
SAME <kbd> </kbd>       : saved="<kbd> </kbd>\n"
SAME <mark></mark> 后文 : saved="<mark></mark> 后文\n"

# .tmp/critic47-probe9.mjs §2（T1 后：浏览器能得到的 doc + 真实保存链）
DIFF empty pair : serialized=""  saved=""  want="<kbd></kbd>\n"
DIFF space pair : serialized=""  saved=""  want="<kbd> </kbd>\n"
```

浏览器侧的因果链与 P1-1（rev2 那条）同源：四个 mark 一注册，`<kbd></kbd>` 就是**已识别**标签（`node_modules/@tiptap/markdown/dist/index.js:1019-1052` 从 `parseDOM` 收 tag），解析出来是「没有文字的空 mark」——ProseMirror 的 mark 只能挂在文本节点上，空元素产生不了节点，于是文档里什么都不剩；序列化得到空串，`repairHtml` 因串里没有实体走 `src/lib/html.ts:23` 的快路径原样返回 → **盘上 `<kbd></kbd>` 被删掉**。空白的 `<kbd> </kbd>` 同理（探针里序列化器把纯空白内容也收成 `""`）。

影响面：只影响「空内容或纯空白内容的白名单成对标签」。这类文档不常见，但它是**本轮唯一承诺的保存性质**（逐字节不变）被破开的路径，且 Node 单测与 `npm run roundtrip` 都看不见（Node 走 `htmlAsLiteralText`）——与上一轮的盲区一样，靠 E2E 才看得见，而计划的 E2E 没播它。

**修法（1 行 + 2 条测试）**：

1. `escapeInlineHtml` 的掩码回调里跳过空/全空白内容，别把它换占位符（这样它会照常被 `ANGLE` 转义成字面文本，字节由 `repairHtml` 保住）：

```ts
const masked = segment.replace(PAIR, (whole, _tag, inner) => {
  if (!/\S/.test(inner)) return whole      // 空 / 全空白内容不还原
  saved.push(whole)
  return `\u0001${saved.length - 1}\u0001`
})
```

2. `inlineHtmlTags.test.ts` 加负例：`escapeHtmlForParse('<kbd></kbd>') === '&lt;kbd>&lt;/kbd>'`、`escapeHtmlForParse('<kbd> </kbd>') === '&lt;kbd> &lt;/kbd>'`（`PAIR` 的标签名清单不变）。
3. E2E `渲染.md` 的第二段负例补这两个串，断言保存后盘上字节仍等于播种字节（该段本来就要断言 `kbd` 元素 0）。

## 三、P2 漏洞（新，4 条）

### P2-2 T2 的守卫只盖 `--` / `...`：反引号代码里的引号仍被改成弯引号、大半角标点仍被替换，保存字节照样错

`plan.md:131` 的守卫只在 `--`（`smartTyping.ts:61`）与 `...`（`:62`）两条替换之前拦 `hasUnclosedBacktick`。但「code mark 还没建立」这个时序对**后面所有规则**同样成立：

- `smartTyping.ts:41-49` 的引号规则先于 `:61`：打字序列「`` ` `` 然后 `"`」时 `before` 末字符是反引号，`atStart`（`:38`）为假，于是走 `:48` 插入 `{ text: '”' }` —— `` `grep "foo"` `` 会变成 `` `grep ”foo”` ``；
- 左半边括号（`:51-53`）会补成对：不配对的 `(` 会多出一个 `)`；
- `:64-67` 的中文半角标点在反引号代码里也会变成全角（`` `中文?` `` → `` `中文？` ``）。

这些都是**今天就有**的（与 F2 同因），T2 修完 F2 的 `--`/`...` 之后仍在，所以 §T2「用户收益」如果被读成「反引号代码不再被智能标点改」就不成立。二选一：

1. 把守卫挪到 `smartInput` 顶部，并把 `plan.md:130` 的 `lineBefore` 取数条件从 `inserted === '-' || '.'` 改成「一组会触发规则的字符」（`"'" ( [ { - . , ; : ? !`）。代价是每个标点键多一次段落级 `textBetween`（1 MB 文档也只扫当前段落，可接受）；
2. 若坚持最小档，就把这条写进 §二「本轮不做」+ §五 UNVERIFIED，别让后一轮把 F2 当已完整关闭。

### P2-3 T4 改假盘会波及 trash 的**字节写**：删除/撤销之后，假盘里的 `.md` 变成 `data:` URL，既有 E2E 的文本断言会假红

`plan.md:173` 说「只改测试基建」。但假盘的 `write()` 不只被图片用：`src/lib/trash.ts:100-107`（删除：`getFile().arrayBuffer()` → `writable.write(buffer)` → 再读回比 SHA）与 `:395-401`（撤销恢复：同样写 `ArrayBuffer`）都是字节写。今天 `.tmp/r30-fsa.mjs:44-46` 把 `ArrayBuffer` 用 `new Blob([chunk]).text()` 存成**字符串**，所以 trash 副本与撤销后的文件仍是文本；按计划改成「有二进制块就存 `data:<type>;base64,...`」以后，这两处会存成 data URL，于是：

- `.tmp/e2e-r45-bug-a.mjs:118-124` 这类脚本读 trash 副本文本（`trashBytes?.slice(0, 60)`）会读到 `data:application/octet-stream;base64,...`；
- 撤销恢复后的 `.md` 也会是 data URL，后续 `readFakeFile` 与原文比较的断言全部假红；
- 产品侧不会坏（`trash.ts` 读回时走 `getFile()` 的 `data:` 分支，`:28-37`；SHA 仍相等），所以这类假红最难分辨。

**修法（两行）**：只对「带非 `text/*` MIME 的 `Blob`」走二进制存法，`ArrayBuffer`/视图仍按今天的文本路径存：

```js
async write(chunk) {
  if (typeof chunk === 'string') { parts.push({ text: chunk }); return }
  if (chunk instanceof Blob && !chunk.type.startsWith('text/')) { parts.push({ bytes: new Uint8Array(await chunk.arrayBuffer()), type: chunk.type }); return }
  parts.push({ text: await new Blob([chunk]).text() })   // ArrayBuffer/视图：保持今天的行为
}
```

`writeAsset` 走的是 `file`（`File`，`type: 'image/png'`，`src/lib/asset.ts:42-53`），仍会命中二进制分支；trash 的两处仍走文本。并在 §T4 验收里加一条：本任务跑完后，随便跑一个既有 trash/撤销 E2E（如 `.tmp/e2e-r45-bug-a.mjs`）确认文本断言不变。

### P2-4 T1 验收里的 `editor.getHTML()` 在页面上下文取不到：执行代理只能跳过或瞎找

`plan.md:107` 要求「`editor.getHTML()` / 导出串里含 `<kbd>`」。但应用只暴露 `window.__slState`（`src/App.tsx:105-110` 的 `declare global`，`:720` 只赋 `{ dirty, name, readOnly, viewMode }`）；`git grep getHTML -- src` 的 4 处都在 App 内部（`:4073` 导出、`:4094` 纯文本、`:5071` 预览传参），E2E 拿不到 `editor`，按字面写这条会失败或被迫挖 `__reactFiber$`。

**修法**：换成等价且可达的两条——预览面板 DOM（`PreviewPane` 的 `bodyHtml` 就是 `editor.getHTML()`，`App.tsx:5071`；容器 class 见 `src/components/PreviewPane.tsx:79` 的 `ProseMirror doc-body preview-pane`）：`document.querySelectorAll('.preview-pane kbd').length === 1`（`mark/sub/sup` 同理各 1）；再加原来的 `Ctrl+/` 源码串断言。导出串那条删掉，或改注「与预览同源，不单独取」。

### P2-5 §T1 风险说「表格单元格、列表项 E2E 覆盖一项」，验收里没有这一项

`plan.md:120` 写着「`<kbd>` 在表格单元格、列表项里也要能解析（行内 mark 与块无关）；E2E 覆盖一项」，但 `plan.md:96-100` 播种的四篇文档（渲染 / 实体 / 嵌套 / 行首）里没有表格与列表。行内 mark 与块无关这一点我同意，但计划自己承诺的覆盖没出现在可执行的验收里，执行代理按验收做就不会测它。

**修法**：在 `渲染.md` 第 1 段后加一个小表（两列表头、一个单元格写 `<kbd>Ctrl</kbd>`）与一个列表项（`- 按 <kbd>Esc</kbd>`），断言 `td kbd` 与 `li kbd` 各 1、`Ctrl+S` 后 `diskSame: true`（表格未改动时由 `reuseTables` 整块写回原文，`serializeDocument.ts:57`；这条正好也测了它与 mark 的共存）。不想加就把 `plan.md:120` 那句删掉，别留空头承诺。

## 四、其余核对（正结果 + 给执行代理的省时读数）

1. **`escapeInlineHtml` 的边界输入都试过了**（`.tmp/critic47-probe8.mjs` §3，today → new）：`&lt;` 实体串、`<kbd class="x">`（仍转义）、单开 `<kbd>`、`</kbd>`（仍转义）、`a < b`、行内代码 `` `<kbd>` ``、围栏、`<kbd>R&D</kbd>`、`<kbd>a > b</kbd>`、同一行两组、`<kbd>Ctrl</kbd> 和 <kbd class="x">` 混排——全部符合 `plan.md:41-45` 与 `plan.md:76` 的期望。`PAIR` 只用 `String.replace`，不会残留 `lastIndex`（`String.replace` + `/g` 会自己归零）。
2. **`_` / `*` / `\` 出现在成对标签内容里时的字节漂移是既有问题，别当 T1 回归**：今天（整段字面文本）`<kbd>a_b</kbd>` 保存成 `<kbd>a\_b</kbd>`、`x<sup>*</sup>` 保存成 `x<sup>\*</sup>`（probe11 两行 `DIFF`），原因在序列化器对 `_`/`*` 的转义，`serializeDocument.ts:54-56` 的 repair 链没有对应的回填。T1 之后同一类文档仍是这个结果（probe9 §2 同样的 `DIFF`）。所以 E2E 的播种文本别用 `_`、`*`、`\`，否则会红在既有问题上；`>` 与 `~` 没事（`a > b` 走 `repairHtml` 的 `&gt;` 解码、`a~b` 走 `repairTildes`，probe9 都是 `SAME`）。
3. **`行首.md` 大概率会渲染，不必提前当风险**：`node_modules/marked/lib/marked.esm.js:13`（压缩后的单行 bundle）里块级 HTML 正则用负向前视**显式排除了** `kbd|sub|sup|mark` 等行内标签（`(?!(?:a|em|strong|…|kbd|sub|sup|…|mark|…)\b)`），所以行首 `<mark>重点</mark>` 是行内 HTML、不是 HTML 块。按 `plan.md:105` 只打读数可以，但既然大概率是 1，别把它写成「未知项」拖时间。
4. **T3 的技术前提仍成立**：`node_modules/mermaid/dist/config.type.d.ts:214` 的 `suppressErrorRendering?: boolean` 是 `MermaidConfig` 顶层字段；`mermaidLazy.test.ts` 实测 **12** 条（`^test\(` 计数），`fakeMermaid` 的 `inits` 在 `:24` 且 `initialize` 记录 config（`:30-32`），计划的两条新测试都不用碰 DOM；`renderDiagram` 在 `mermaidLazy.ts:111`、`renderSeq` 在 `:125-126`、`initialize` 在 `:78`，与计划锚点一致。finder 日志 `.tmp/r47-typora-i.log` 的 `I0/I1/I3` 用的就是 `scrollHeight:900/1013/900` 与 `bodyChildren`，与 `plan.md:160` 的断言对得上。
5. **静态基线全部实测过，计划写的都对**：`package.json` 的 `test` 链 **29** 条；`html.test.ts` 里 `&lt;kbd>Ctrl` **2** 处（`:50`、`:136`，正与计划要改的两处一致）；`escapeHtmlForParse` 在测试里只出现在 `html.test.ts`（`:49/:55/:60/:134/:135/:136`），另有非门禁的 `scripts/roundtrip.mjs:34`、`scripts/fidelity-acceptance.mjs:41`；`git grep` 改前 **0** 的四个符号（`inlineKbd`、`escapeInlineHtml`、`hasUnclosedBacktick`、`suppressErrorRendering`、`removeMermaidContainer`）全部实测 **0**。
6. **`html.ts` 的调用方只有 App 与两个脚本**（`src/App.tsx:75`、`scripts/*.mjs`），把 `escapeInlineHtml` 放进新模块、由 `html.ts` import 不会产生循环（`html.ts` → `codeScan.ts` → `risk.ts` 这条链上没有回指），`@tiptap/core` 本来就在包内，不产生新的运行时依赖或首屏增量。
7. **T1 别的锚点仍对**：`App.tsx:780` 是 extensions 数组开头、`:804` 是 `Markdown.configure`、`:720` 有 `__slState`；`PreviewPane.tsx:79` 是 `ProseMirror doc-body preview-pane`；`Ctrl+Shift+P` 预览入口在 `App.tsx:4843`。`window.__slState.viewMode` 可用来断言「进/出预览」，不需要别的全局。
8. **`.tmp/r30-fsa.mjs` 的调用形状**：函数签名是 `installFakeWorkspace(page, files)`（`:2`），`plan.md:96` 的 `{files}` 指的就是「path → 内容」这个映射；`getFile()` 的 `data:` 分支在 `:29-37`，与 `plan.md:173` 的「两处正好闭合」一致（但见 P2-3 的 trash 波及）。
9. **预算与顺序自洽**：12+6+6+6=30、+5=35，硬上限内；T1 的 15 min 熔断与砍单顺序（保 T1 → T2 → T3 → T4）没被 revision 3 改坏；T1 的「不交半条」与「mark 注册 + 还原同一次落地」仍然是这轮唯一能控未知项的机制，别删。

## 五、给执行代理的五句话

1. T1 的 `PAIR` 掩码回调里加一句 `if (!/\S/.test(inner)) return whole`（空 / 全空白内容不还原），单测与 `渲染.md` 负例段各补 `<kbd></kbd>`、`<kbd> </kbd>`（P1-1）。
2. T1 的 Node 判别用 `manager.serialize` 那条（期望串已实测能对上）；**不要**用单参 `getMarkOpening`。E2E 的 `editor.getHTML()` 改成 `.preview-pane kbd` 断言（P2-4）。
3. 播种文本别用 `_`、`*`、`\`——那是既有漂移，不是本轮回归；另外把表格/列表那一项补进 `渲染.md`，或删掉 `plan.md:120` 的承诺（P2-5）。
4. T2 的守卫要么上移到 `smartInput` 顶部并把 `lineBefore` 的取数扩到会触发规则的标点键，要么在 §二/§五 登记「引号与半角标点在反引号代码里仍会被改」（P2-2）。
5. T4 的假盘只对「`Blob` 且 MIME 非 `text/*`」存 base64，`ArrayBuffer` 仍按文本存（否则 trash 的删除/撤销 E2E 会假红），改完顺手跑一个既有 trash 脚本（P2-3）。
