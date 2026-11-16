# 第 21 轮 · 编辑器内核侦察（C1–C5）

- 环境：Sidelight 0.30.3，`localhost:5173`（Vite dev），headless Edge 157 CDP，profile `%TEMP%\sidelight-r21-core`（9222 被非本任务浏览器占用，改用 9332，隔离 profile；行为与端口无关）。
- 方法：① Node 侧复刻 `scripts/roundtrip.mjs` 的 `throughApp`（摘 frontmatter/脚注 → `protectMathPairs` + `escapeHtmlForParse` → MarkdownManager → `serializeDocument`），即 App 保存路径；② 真应用里用 localStorage 草稿载入文档，读 `.ProseMirror` / `textarea.source-editor`；③ 合成 `ClipboardEvent` 粘贴（DataTransfer 构造，非真实系统剪贴板）。
- 只读：未改 `src/`、`host/`、`host-mac/`。复现脚本：`.tmp/r21-core/probe-fidelity.mjs`、`probe-edges.mjs`、`probe-pass.mjs`、`probe-app.mjs`、`probe-undo3.mjs`、`probe-redo.mjs`。

---

## C1（P0，丢数据）多行脚注 / 脚注后接引用式定义：载入富文本即被改写成链接 + 代码块，保存静默写回，差异门不拦

**复现**

1. 新建文档，内容：

```
正文[^a] 与[^b]。

[^a]: 第一条脚注。

[^b]: 第二条脚注第一行。
    第二条脚注第二行（4 空格续行）。
```

2. 载入（真应用，localStorage 草稿后刷新）。富文本直接显示 `正文^a 与^b。`，`^a`/`^b` 变成超链接（`href="第一条脚注。"`），续行变成代码块；页面**没有**结构风险横幅。
3. 点「源码」（= 保存会写出的正文），得到：

```
正文[^a](第一条脚注。) 与[^b](第二条脚注第一行。)。

```
第二条脚注第二行（4 空格续行）。
```
```

原文的 `[^a]:`/`[^b]:` 定义全部消失，引用被改写为行内链接。`lossless? false`。

变体：脚注块在文末、其后还有 `[ref]: https://…` 时同样触发（`extractFootnotes` 认为从第一条脚注行到文末全是定义才算脚注块，遇到 `[ref]:` 就整块放弃）。Node 复刻结果：`正文有脚注[^1]与引用链接[示例][ref]。` → `正文有脚注[^1](第一条脚注。)与引用链接[示例](https://example.com "标题")。`，三条定义行全丢。

**证据**

- 截图：`shots/round-21/core-footnote-multiline-rich.png`（富文本里 `^a` 是链接、续行是代码块、无风险横幅）、`shots/round-21/core-footnote-multiline-source.png`（源码模式的损坏结果）。
- `.tmp/r21-core/probe-fidelity.mjs` 的 `C-footnote-multiline`、`B-footnote-then-ref` 两项。
- `baselineLosses(C原文, C结果)` 返回 `[]`；`classify(...).filter(blocking)` 也是 `[]`，所以保存前不会弹「结构会被改写」的确认框。

**根因（文件:行号）**

- `src/lib/footnotes.ts:18-44`：`extractFootnotes` 只接受「从第一条 `[^…]:` 到文末全是定义行、中间只允许空行」。4 空格续行、或后面跟 `[ref]:`，都会让整块退回正文。
- 退回正文后，Markdown 解析器把 `[^a]: 文本` 当成引用式链接定义（label `^a`），正文里的 `[^a]` 被解析成链接并改写为 `[^a](文本)`。
- `src/lib/risk.ts:127-166`：`footnoteLosses` 只在「保存后仍能找到同一个 `[^id]:` 定义」时才报损失。定义整行都不存在时直接 `continue`（当作用户删除），因此永远不会拦。
- `src/App.tsx:1586-1660` 的 `loadIntoEditor` 与 `src/App.tsx:3182-3202` 的 `applySource` 都走同一条 `extractFootnotes` + `setMarkdown` 路径。

**影响**：有续行脚注（学术/长文常见）或有引用式定义的文档，一进富文本就损坏；保存直接写回损坏内容，无警告。丢的是脚注正文与引用语义。

**成本**：M。**建议**：`extractFootnotes` 支持续行（`^ {2,}|\t` 开头）与「脚注块 + 引用定义块」混合尾部；解析阶段若发现正文里仍有 `[^label]` 但没有任何 `[^label]:` 定义，进源码模式并列入 blocking 风险；`footnoteLosses` 对「原文有定义、保存后无定义且引用还在」补一条 blocking，而不是 `continue`。

---

## C2（P1，静默改写）块公式里的 `&` 与 `\\` 被转义/折叠，连续保存持续变形，差异门无感

**复现**（Node 保存路径，输入一段常见 aligned 公式）

```
$$
\begin{aligned}
x &= 1 \\
y &= 2
\end{aligned}
$$
```

第一次保存输出：

```
$$
\begin{aligned}
x &amp;= 1 \
y &amp;= 2
\end{aligned}
$$
```

`&` 变成 `&amp;`；LaTeX 换行 `\\` 变成单个 `\`（不是 `\\`）。继续保存第二次：`\\` 彻底消失，两行中间出现硬换行空格；第三次行尾空格数又变（3→2）。`x`/`y` 对齐环境在重开时排版错误。

同一文档里的转义美元 `\$100` 第一次保存变成 `\\$100`，转义失效，下次解析可能把 `$100 与 $` 当公式配对。

**证据**

- `.tmp/r21-core/probe-edges.mjs` 的 `F`（SOURCE/RICH 的 JSON 原文）。
- `.tmp/r21-core/probe-pass.mjs` 三次连续保存输出。
- `classify(原文, 结果)` 的 blocking 列表为空。
- `shots/round-21/core-*` 无对应截图；纯序列化证据（App 的保存走同一函数，`src/App.tsx:2236-2244`）。

**根因**

- `src/lib/math.ts:28-32`：`repairMath` 在 `$…$`/`$$…$$` 内无条件把 `\\` 换成 `\`，把 LaTeX 的换行符当成「序列化多写的反斜杠」吃掉；连续保存会继续折。
- Markdown 序列化把公式内容当普通文本做 HTML 转义（`&`→`&amp;`），`repairMath` 只处理反斜杠，不还原实体。
- `src/lib/risk.ts` 没有公式类损失，保存门不可能拦。

**影响**：多行/对齐公式（matrix、aligned、cases）保存后坏掉，用户重开才看到；每次保存继续漂移，无法靠撤销恢复（见 C4）。

**成本**：M。**建议**：序列化后只对公式片段做 `&amp;`→`&` 还原；`repairMath` 不再全局折反斜杠，改为在解析/序列化两端对 Math 节点统一用 `data-latex` 原文（或在公式内只还原「成对的 4 个反斜杠」且保留 `\\` 行分隔）；给 `risk.ts` 加 `math-escape` 检测，命中即 blocking。

---

## C3（P1，文件增长）文末 ≥3 个空行时，每次保存追加一个 `&nbsp;` 段落，且逐次累积

**复现**

1. 文件内容（注意结尾 4 个换行）：

```
---
title: 空行
---

正文前应有 1 个空行。


正文后多个空行。



```

2. 第一次保存后：`正文后多个空行。` 之后多出 `\n\n\n\n&nbsp;\n\n\n\n`。
3. 再打开再保存：`&nbsp;` 变 2 个；第三次变 3 个……（实测 3 次后 5 个 `&nbsp;` 段）。最小触发（无 frontmatter）也成立：`"A\n\n\n\n"` → `"A\n\n\n\n&nbsp;"`；`"A\n\n\n"`（2 个空行）不触发。

**证据**

- `.tmp/r21-core/probe-pass.mjs` 的 `E pass1/2/3` 输出（逐字节）。
- 触发边界：`.tmp/r21-core/probe-nbsp.mjs` 的 `A\n\n\n\n` 一项。
- `classify` 只产生 `blank-lines`（`blocking:false`），保存门静默。

**根因**

- `src/lib/serializeDocument.ts:47-50` 按原文强制补 `trailingNewlines` 个换行；解析器在「文末 ≥3 空行」时生成一个空段落，Tiptap 序列化成 `&nbsp;`。原文尾部换行数被保住，空段落又被写出，于是每轮多一层。
- `src/App.tsx:840-848` 载入时同样走 `serializeDocument`，所以只是打开再保存（甚至自动保存）也会发生。

**影响**：文件每次保存变长，正文出现字面 `&nbsp;`；其他渲染器显示为一行 `&nbsp;`。不丢数据，但污染正文且不可逆累积。

**成本**：S。**建议**：`serializeDocument` 在拼接前删掉尾部空段落（doc 末尾的 empty paragraph），或序列化后统一 `\n{3,}$` 归一；同时把「原文尾部空行数」只用于补换行，不再让解析器产出空段。

---

## C4（P1/P2，体验断裂）源码 ↔ 富文本切换后撤销/重做全部失效，即使源码一个字没改

**复现**

1. 新文档「甲段。」，光标到末尾输入 `A`（`甲段。A`）。
2. 点「源码」，不做任何编辑，点「回到富文本编辑」（dirty 时点「继续」）。
3. 点正文，`Ctrl+Z` 两次：文本仍是 `甲段。A`；`Ctrl+Shift+Z`、`Ctrl+Y` 也不恢复。
4. 对照：不切源码时，`Ctrl+Z` 删掉 `A`，`Ctrl+Shift+Z` 能恢复。

**证据**

- `.tmp/r21-core/probe-undo3.mjs` 输出：`typed 甲段。A` → `after toggle 甲段。A` → `undo1/undo2/redo/ctrl+y` 全部 `甲段。A`。
- `.tmp/r21-core/probe-redo.mjs`：同一会话不切视图时 undo/redo 正常。
- 截图：`shots/round-21/core-undo-across-source.png`。

**根因**

- `src/App.tsx:3182-3202` `applySource` → `setMarkdown(footnoteSplit.body)`；`src/App.tsx:807-826` 的 `setMarkdown` 用 `replaceWith(0, doc.size, …)` 整篇替换并 `setMeta('addToHistory', false)`。历史栈里的旧 step 坐标失效，之后 undo 既不生效也不报错；切换本身也不可撤销。

**影响**：用户看完源码回来就不能撤销刚才的正文改动；跨保存/跨批注/跨表格的撤销同样在任意一次源码往返后清零。无提示。

**成本**：M。**建议**：把「源码写回」作为**一个**历史事务提交（正常 `addToHistory`，加 meta 标记为视图切换），或显式调用历史清空并在切回时提示「切换源码后无法撤销之前的改动」。前者更符合写作预期，且能让源码改动本身可撤销。

---

## C5（P2，保真承诺失效）代码跨度里的 `|` 让「未改动表格整块复用」失效：整表重排，单元格被加上 `\|`

**复现**

1. 文件：

```
| 代码 | 值 |
| --- | --- |
| `a|b` | 1 |

表后段落。
```

2. 不编辑任何内容，直接走富文本保存路径。输出：

```
| 代码     | 值   |
| ------ | --- |
| `a\|b` | 1   |
```

表格分隔行、列宽全部重排，代码内容从 `` `a|b` `` 变成 `` `a\|b` ``（GFM 语义等价，但源码字节变了）。表后空行也由 1 个变成 1 个（OK）。

**证据**

- `.tmp/r21-core/probe-edges.mjs` 的 `I` 项（SOURCE/RICH JSON）。
- 对照：同一探针 `H`（只有表头的表）逐字节一致；无代码竖线的表在 roundtrip fixtures 里能整块复用。

**根因**

- `src/lib/tableReuse.ts:20-40` `splitCells` 只跳过 `\|`，不识别反引号代码跨度；原文 `` `a|b` `` 被切成 3 列，序列化后 `` `a\|b` `` 被切成 2 列，`signatureOf`（`:50-57`）不相等 → 复用放弃（`:107-111`），整表按编辑器默认格式输出。
- 序列化器同时给代码跨度里的 `|` 补了 `\`，于是第二轮签名仍不等。

**影响**：含代码/正则竖线的表格（技术写作常见）每次保存都被重排，`\|` 改写源码；不影响渲染，但破坏「未改动的表格整块写回原文」（0.23.0 的承诺）与源码可读性。

**成本**：S。**建议**：`splitCells` 在反引号内不切列（跟踪 ``` ` ``` 状态），并对签名里的单元格统一去掉 `\|` 的转义再比较；`reuseTables` 命中时用原文行，避免补反斜杠。

---

## 本轮最值得做的 3 件事

1. **修 C1 脚注静默损坏**：`extractFootnotes` 支持续行/脚注+引用定义混合尾部；`footnoteLosses` 对「定义消失但引用还在」blocking。这是唯一会在无警告下丢正文内容的项，优先。
2. **修 C2 公式转义**：`&` 实体还原 + `repairMath` 不再吃掉 `\\`，并给公式加 blocking 损失检测；多行公式是数学写作的日常输入。
3. **修 C3 尾部空行 `&nbsp;` 累积**：序列化前剥掉尾部空段，一次改动即可止住文件每次保存变长；顺带补 C4 的切换历史（明确清空+提示，或作为一次可撤销事务）。

### 未验证 / 边界

- 「拖入 .md」：代码只有图片处理（`src/App.tsx:698-712`）；合成 `drop` 未被 `preventDefault` 且不插入内容（`probe-app.mjs` 第 5 项，URL 未变）。真实 OS 拖放是否让 WebView 导航到文件，本机无宿主，未验证，不列为发现。
- 粘贴来自 Word 的合并单元格表格：合成 `text/html` 粘贴后编辑器保留了 `colspan`，但 Markdown 序列化生成一行空表头并把合并列展开（`|     |       |     |` / `| a | 合并单元格 |  |`）。GFM 无 colspan，属格式表达极限；未列入 C1–C5。证据：`shots/round-21/core-paste-word-html.png`、`probe-app.mjs` 第 3 项。
- C2/C3 的证据是 Node 侧真实保存函数（`serializeDocument`），未在宿主写回链路上抓包；宿主路径与浏览器共用 `currentMarkdown`/`prepareSave`（`src/App.tsx:2236-2258`）。
