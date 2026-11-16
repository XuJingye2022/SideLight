# 第 22 轮 · Markdown 第二批（公式 / 尾部空行 / 表格）

- 环境：Sidelight 0.30.4（HEAD `584d5e7`），`http://localhost:5173`（Vite dev），headless Edge 157（`Edg/157.0.4341.46`），CDP `9333`，隔离 profile `.tmp/r22-markdown/edge-profile`（9222/9223 被其他轮次占用；端口不影响行为）。Node 24.21.0。
- 方法一（保存路径）：Node 探针用**与 App 相同的扩展集**（`StarterKit` + `Mathematics` + `ReusableTable` + `TaskList/TaskItem`，见 `src/App.tsx:668-693`）建 `MarkdownManager`，按 `splitFrontmatter` → `extractFootnotes` → `protectMathPairs` → `escapeHtmlForParse` → `parse` → `serializeDocument` 跑，`original` 传磁盘原文，与 `currentMarkdown()`（`src/App.tsx:2229-2238`）一致。
- 方法二（真应用）：localStorage 草稿（`sidelight.doc.v1`）载入文档，读 `.ProseMirror` 与 `textarea.source-editor`；段首改一个字使文档变脏后切源码，读到的就是保存会写出的正文。
- 只读：未改 `src/`、`host/`、`host-mac/`、`package.json`。新增仅 `docs/iteration/round-22/findings-markdown.md`、`.tmp/r22-markdown/`、`shots/round-22/md-*.png`。
- 复现脚本：`.tmp/r22-markdown/probe-savepath.mjs`（公式/尾部/表格总表）、`probe-extra.mjs`（CRLF 与转义美元矩阵）、`probe-tables3.mjs`（表格按序号配对）、`probe-app.mjs` + `probe-app2.mjs` + `probe-undo-new.mjs`（真应用）。输出在同目录 `*-out.txt`。

---

## M1（P1，载入即损坏）价格里的 `\$` 会吞掉同段后面的行内公式：生成非法公式节点，公式降级为文字，保存写回坏字节

**复现**

1. 文件内容（一行）：

```
价格 \$100 与 $x^2$ 同段。
```

2. 打开（浏览器草稿通道）：`价格 ` 后面出现一个虚线红框的公式块，内容显示 `$100 与 \$`，`title="公式排版没加载成功，点击重试"`；`x^2$` 是普通文字。DOM：

```html
<span class="tiptap-mathematics-render ... math-fallback" data-type="inline-math"
      data-latex="100 与 \" title="公式排版没加载成功，点击重试">$100 与 \$</span>x^2$ 同段。
```

`data-latex` 是 `100 与 \`（末尾单个反斜杠），KaTeX 必然渲染失败。

3. 段首改一个字（让文档变脏），点「源码」，读到的保存正文：

```
价格 \\$100 与 \$x^2$ 同段。。
```

反斜杠多了一个，`$x^2$` 永远回不到公式：再次打开时 `\\` 被解析成字面 `\`，`\$` 被解析成字面 `$`。

4. 差异门：`baselineLosses(原文, 保存结果)` 与 `classify(...).filter(blocking)` 都是 `[]`，保存前不弹任何提示。

**证据**

- 截图：`shots/round-22/md-escaped-dollar-load.png`（红框坏公式 + `x^2$` 当文字）、`shots/round-22/md-math-source.png`（源码模式里写出的坏字节）。
- `.tmp/r22-markdown/app2-out.txt`：真应用载入后的 innerText 与 `data-latex` 原文。
- `.tmp/r22-markdown/protect-out.txt`：`protectMathPairs("价格 \\$100 与 $x^2$ 同段。")` → `"价格 \\\\$100 与 \\$x^2$ 同段。"`（公式开头的 `$` 被加了反斜杠）。
- `.tmp/r22-markdown/savepath-out.txt` 的 `M2` 三次保存；`gate` 为空。

**根因**

- `src/lib/math.ts:18-22`：`PAIR = /\$([^$\n]+)\$/g` 不识别已经转义的 `\$`。它从 `\$100` 的 `$` 开始配对，一直到公式开头的 `$`；中间是 `100 与 `（结尾带空格）→ `isMathBody` 判为货币 → 把这一对里的**两个** `$` 都写成 `\$`，公式开头的 `$` 因此被转义。
- 序列化时字面反斜杠再被写成 `\\`，`$` 前再补 `\`，于是 `\$100` 变 `\\$100`、`$x^2$` 变 `\$x^2$`。
- `src/lib/math.ts:28-32` `repairMath` 只把 `\\` 折成 `\`，不还原 `&` 实体，也不处理 `\\$` 这种双写。
- `src/lib/risk.ts` 没有公式类损失，保存门看不到这次改写。

**顺带修正上轮 C2 的形态**（同一组探针）

- `&` 在 0.30.4 真应用里**不转义**：`\begin{aligned} x &= 1 \\ y &= 2` 载入后 `data-latex` 保留 `&`，写回也保留 `&`。上轮 C2 的 `&`→`&amp;` 来自 `scripts/roundtrip.mjs` 的扩展集**没有 `Mathematics`**，那条路径不经过真应用的公式节点；也就是说 `npm run roundtrip` 完全不覆盖公式，这张报告不能当公式保真的证据。
- `\\` 仍折叠：`aligned`/`cases` 第一次保存把 `\\` 写成 `\`（`x &= 1 \` 与 `y &= 2` 变成一行），之后稳定，不再逐次漂移。真应用证据 `shots/round-22/md-aligned-source.png`；Node 证据 `savepath-out.txt` 的 `M1`/`M4`、`extra-out.txt` 的 `E1`/`E2`。
- `\text{中文}`、`\quad`、行内 `\&`/`\%` 三次保存稳定，无变化（`savepath-out.txt` `M3`/`M5`）。

**影响**：中文技术/数学写作最常见的写法「价格 \$100 + 公式」一进富文本就坏，而且坏在屏幕中央；保存后公式永久变成文字。用户不会知道是保存造成的。

**成本**：M。**建议**：`protectMathPairs` 扫描时跳过 `\\$`（手写扫描或 `(?<!\\)\$`）；序列化后只对公式片段做 `\\$`→`\$` 还原；`repairMath` 改为按节点 `data-latex` 原文输出；`roundtrip.mjs` 的扩展集补 `Mathematics`；`risk.ts` 加 `math-escape`（原文有 `\$` 或 `\begin{`，保存后无对应节点）为 blocking。

---

## T1（P2，静默改字节）CRLF 文件的尾部空行被吞：1–2 个空行全部删掉；≥3 个空行仍写 `&nbsp;`（C3 未修）

**复现**（文件路径，`original` = 磁盘原文）

| 原文（尾部空行数） | 保存后 | 说明 |
| :--- | :--- | :--- |
| `A\n`（0） | `A\n` | 保持 |
| `A\n\n`（1） | `A\n\n` | 保持 |
| `A\n\n\n`（2） | `A\n\n\n` | 保持 |
| `A\n\n\n\n`（3） | `A\n\n\n\n&nbsp;\n\n\n\n` | 加 `&nbsp;`；第 2 次保存变 3 个 |
| `A\n\n\n\n\n`（4） | `A\n\n\n\n&nbsp;\n\n\n\n\n` | 第 2 次 3 个 |
| `A\n\n\n\n\n\n`（5） | `A\n\n\n\n&nbsp;\n\n&nbsp;\n\n\n\n\n\n` | 第 2 次 5 个 |
| `A\r\n\r\n`（1） | `A\n` → 存盘 `A\r\n` | **空行丢失** |
| `A\r\n\r\n\r\n`（2） | `A\n` → 存盘 `A\r\n` | **两个空行都丢** |
| `A\r\n\r\n\r\n\r\n`（3） | `A\n\n\n\n&nbsp;\n` | 加 `&nbsp;`，随后稳定 |
| `A\r\n\r\n\r\n\r\n\r\n\r\n`（5） | `A\n\n\n\n&nbsp;\n\n&nbsp;\n` | 2 个 `&nbsp;` |
| `A`（无末尾换行） | `A` | 保持 |
| `第一段\r\n\n第二段\n\r\n` | `第一段\n\n第二段\n` | 换行统一为 LF；存盘由 `prepareSave` 还原 CRLF，属设计 |

真应用（浏览器草稿没有 `original`）：`A` 后 5 个空行，段首改字后源码显示 `改A\n\n\n\n&nbsp;\n\n&nbsp;`，结尾没有换行。

**证据**

- `.tmp/r22-markdown/savepath-out.txt` 的 `T1`–`T7`、`extra-out.txt` 的 `CRLF 尾部 0–5`、`app2-out.txt` 的「尾部 1–5 空行」。
- 截图：`shots/round-22/md-tail-source.png`（第一次探针把光标放到文末，空行被新字消费，因此这张图**没有** `&nbsp;`，只作源码视图对照；`&nbsp;` 的证据是 `app2-out.txt` 的「尾部 3–5 空行」三组 JSON）。
- 所有样本的 `baselineBlocking` 都是 `[]`。

**根因**

- `src/lib/serializeDocument.ts:20-23`：`trailingNewlines` 用 `/\n+$/`，CRLF 的 `\r` 把连续换行截断，`A\r\n\r\n` 只数到 1。
- `src/lib/serializeDocument.ts:47-50`：用这个计数重写末尾，于是 CRLF 的 1–2 个空行被删。LF 文件因为数得对，不受影响。
- `&nbsp;`：解析器把文末 ≥3 空行解析成空段落，序列化写出 `&nbsp;`；同一函数没有剥掉 doc 末尾的空段落（上轮 C3 的根因，未修）。
- `src/App.tsx:2245-2251` 的注释承诺「末尾换行跟随原文（保住字节）」，但计数函数只支持 LF。

**影响**：Windows（首发平台，默认 CRLF）的文档每保存一次就少 1–2 个尾部空行；≥3 个空行的文档每保存一次多出 1–3 行 `&nbsp;`，正文出现字面 `&nbsp;`，其他渲染器会显示这一行。

**成本**：S。**建议**：`trailingNewlines` 改成 `/(?:\r?\n)+$/` 并按 `\n` 计数；序列化前删除 doc 尾部空段落（一次改动同时止住 `&nbsp;`）；给 `prepareSave` 补 LF/CRLF × 0–5 空行的表驱动测试。

---

## G1（P2，承诺失效）表格复用按出现序号配对：在前面插入或删除一张表，后面所有未改动的表都被重排；分隔行 2 个短横线的表原文不被识别

**复现**（磁盘原文两张未对齐空格的表，只插入/删除一张表，其余一个字没改）

1. 磁盘原文（两张表都逐字节保留，对照成立）：

```
|甲|乙|
|---|---|
|1|2|

中间。

|丙|丁|
|---|---|
|3|4|
```

2. 在最前面插入一张新表（`|新|表|` / `|---|---|` / `|9|9|`），保存后**三张表全部**变成：

```
| 新   | 表   |
| --- | --- |
| 9   | 9   |

| 甲   | 乙   |
| --- | --- |
| 1   | 2   |
...
```

3. 删掉第一张表（只剩 `丙/丁` 那张，一字未改），保存后它也被重排成 `| 丙   | 丁   |` / `| --- | --- |`。
4. 另一条路径：`|甲|乙|` + `|--|--|` + `|1|2|` 在编辑器里是正常表格，但 `collectTables` 返回 0 张（`TABLE_SEPARATOR` 要求 `-{3,}`），保存后必然重排成 `| 甲   | 乙   |` / `| --- | --- |`。
5. 上轮 C5 的代码跨度竖线仍成立：`` | `a|b` | 1 | `` → `` | `a\|b` | 1 | ``，整表重排。

**证据**

- `.tmp/r22-markdown/tables3-out.txt`：对照（两表逐字节不变）/ 前面插入 / 删掉第一张 / 分隔行 2 短横线，四组原文与保存结果。
- `.tmp/r22-markdown/savepath-out.txt` 的 `G1`–`G3`（代码跨度 `|`、转义 `\|` 单元格、普通表对照）。
- 所有样本 `baselineBlocking` 为 `[]`；表格重排只改行内空白，不算结构损失，保存门不拦。

**根因**

- `src/lib/tableReuse.ts:107-111`：`before[index]` 对 `after[index]`，按出现序号配对。只要编辑前后表格数量不同（在中间插入/删除一张表），后面每一对都错位，签名永远不相等，全部退回复用。
- `src/lib/risk.ts:48`：`TABLE_SEPARATOR` 要求每格 `-{3,}`，与 Markdown 解析器接受的范围不一致（`|--|--|` 能解析成表格，但不算「原文表格」）。
- `src/lib/tableReuse.ts:20-40`：`splitCells` 只跳过 `\|`，不跟踪反引号代码跨度（上轮 C5）。

**影响**：「未改动表格整块写回原文」是 0.23.0 的保真承诺；长文里在前面加一张表，后面所有表的列宽与对齐写法全部被改写，源码 diff 里出现大量无意义改动，用户改不回去（没有「保留原格式」开关）。

**成本**：S–M。**建议**：配对改成「同名签名优先、其次找最近的未用表」，或按表格前后最近的非表格行做锚点；`TABLE_SEPARATOR` 降到 `-{1,}` 与解析器对齐；`splitCells` 跟踪反引号状态；给「插入一张表后其余表字节不变」加回归测试。

---

## 本轮最值得做的 3 件事

1. **修 `\$` 与公式的错配（M1）**：价格里一个 `\$` 就能让同段后面的公式变成文字，载入即坏、保存写坏字节、门不拦。先改 `protectMathPairs` 跳过 `\\$`，再把 `roundtrip.mjs` 的扩展集补上 `Mathematics`，否则公式永远不在回归网里。
2. **修表格按序号配对（G1）**：插入或删除一张表会让后面所有未改表全部重排，直接推翻「未改动表格整块写回原文」的承诺；`TABLE_SEPARATOR` 同时与解析器对齐。
3. **收尾尾部换行（T1）**：`trailingNewlines` 认 CRLF、序列化前剥掉尾部空段，一次改动同时止住 Windows 文件丢空行与 `&nbsp;` 累积。

## 复验（第 21 轮已知项的当前状态，不计入本轮新发现）

- **C4 仍成立**：源码 → 富文本往返后，往返前的历史全部丢失，`Ctrl+Z`/`Ctrl+Shift+Z`/`Ctrl+Y` 都不动。新增观察：往返**之后**输入的字符仍可正常撤销（`undo-new-out.txt` 的 `typed 甲段。A` → 往返 → 输入 `Z` → `Ctrl+Z` 得到 `甲段。A`），所以丢的是往返前的历史，不是撤销整体失效。证据：`.tmp/r22-markdown/app-out.txt` 第 4 组、`shots/round-22/md-undo-after-source.png`。
- **C2 部分仍在**：`\\` 折叠与 `\$` 双写未修（见 M1）；`&` 不转义（上轮记录不准，原因是 `roundtrip.mjs` 缺 `Mathematics`）。
- **C3 仍在**：≥3 尾部空行写 `&nbsp;`，且每次保存递增（见 T1）。
- **C5 仍在**：代码跨度内 `|` 触发整表重排（见 G1）。

## 未验证 / 边界

- 宿主写回链路的真实字节没有抓包（本机无宿主窗口）；结论基于 `currentMarkdown()`/`serializeDocument` 与 `prepareSave` 的代码路径。
- 真实 IME 组合输入下的公式输入规则（`$x$` 转节点）没有测；本报告只覆盖「载入已有文档 + 改一个字」。
- `|--|--|` 是否是 GFM 合法表格没有查规范；本报告只断言「Sidelight 自己的解析器接受、`collectTables` 不接受」这一内部不一致。
- 只测 Windows/Edge/Node；macOS 宿主与 WKWebView 未测。
