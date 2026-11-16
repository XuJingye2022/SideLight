# 第 21 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-21/plan.md`（v0.30.3）。
审查方式：读计划、`findings-core.md`/`findings-data.md`、`src/lib/footnotes.ts`、`src/lib/serializeDocument.ts`、`src/lib/math.ts`、`src/lib/risk.ts`、`src/lib/trash.ts`、`src/App.tsx` 的删除/草稿段；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（脚注摘出/拼回的混合尾块与 `joinFootnotes` 的 `\s+$` 不对称）、H3（删除脏文件把正文/缓存搬进 trash 的撤销路径未闭环）、H4（浏览器草稿恢复与宿主 `/__draft` 会双弹、`openSingleFile` 无目录读不到 `.sidelight`）是 blocker；H2/H5/H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:13` 要「脚注块 + `[ref]:` 引用定义块混合尾部，两块都原样摘出、按原文顺序拼回」；但 `extractFootnotes` 只返回 `{body, footnotes}` 一个字符串，`joinFootnotes` 固定 `body.replace(/\s+$/,'') + '\n\n' + footnotes`，没有「引用块」与「脚注块」的独立位置/顺序，也没有保留原文脚注前是 1 个还是 2 个空行。混排或 1 空行样本无法逐字节对称。另 `footnoteLosses` 只按「原文有定义」判定 blocking，用户主动删定义但保留引用也会被拦。 | `plan.md:13-15`；`src/lib/footnotes.ts:18-49`；`findings-core.md:45-54` | `FootnoteSplit` 改成 `blocks: Array<{kind:'footnote'|'ref', text:string}>` 或 `leadingGap`/`footnoteBlock`/`refBlock` 三段；`joinFootnotes` 按原文块顺序与 gap 拼回，不再 `\s+$`；`footnoteLosses` 同时检查「当前正文仍有 `[^id]` 引用」与「当前确实没有定义」，用户把引用和定义一起删时不拦 | T1 |
| H2 | major | T2 `:28-30` 的 `repairMath` 只改「公式片段内保留成对 `\\`」，但 `$...$` 正则也会命中 `\$100` 的转义美元；`math.ts:28-32` 当前是全局 `\\\\→\\`，若只把 `\\` 保留、不区分「LaTeX 行分隔 `\\`」与「Markdown 转义 `\\$`」，`\$100` 仍可能变 `\\$100`。T3 `:43-44` 的尾部空行归一又会与 `joinFootnotes` 的 `\s+$` 互相覆盖，三次往返的「原文多空行」意图可能被 `\n{3,}$` 改成固定值。 | `plan.md:28-30,43-44`；`src/lib/math.ts:28-32`；`src/lib/footnotes.ts:46-49`；`findings-core.md:58-101,105-141` | 公式片段用「`$` 配对 + 反斜杠计数」区分 `\\`（行分隔）与 `\$`（转义）；只对确定的公式区间做 `&amp;` 还原；`\$` 保存时保持 1 个反斜杠；尾部空行只按 `trailingNewlines(original)` 补，不再额外 `\n{3,}$` 归一，或把两者合并到一个函数 | T2/T3 |
| H3 | blocker | T4 `:57` 说「复用切换文档三选一」，但 `pendingSwitch` 的 `after` 是切换目标，`removeFile` 需要「保存后删除」的删除回调；两者不共用同一状态。T4 `:58` 把当前正文写 `<trashName>.md`、缓存改名为 `.draft`/`.json`，但 `restoreFromTrash` 只恢复 `.md` 字节，计划 `:59` 才加缓存搬回；撤销 6 s 过期清理与「失败/半完成」没有分支。非当前文件删除仍走 `removeCache`，批注仍会丢，但 T4 `:60` 只说「文案不承诺保留」。 | `plan.md:56-60`；`findings-data.md:10-29`；`src/App.tsx:1895-1973`；`src/lib/trash.ts` | 新建 `pendingDelete`（保留/移动/取消）而不是复用 `pendingSwitch`；删除前写正文+缓存到 trash，任一步失败中止并保留原文件/缓存；`restoreFromTrash` 同时搬回 `.draft`/`.json`，6 s 内撤销不清理；非当前文件若不能恢复批注，明确「批注不随回收站恢复」或也搬缓存 | T4 |
| H4 | blocker | T5 `:75` 在 `loadIntoEditor`/`openSingleFile` 读 `.sidelight/drafts` 并弹恢复提示；但 `openSingleFile` 没有目录句柄，`parentDirectory` 返回 null，读不到 `.sidelight`；宿主文档已有 `/__draft` 提示，计划 `:84` 只说「宿主优先」，没有写「同一文档只弹一个」的状态合并，容易双弹。另 `readCache` 只返回文本，没有 mtime；`mtime > file.lastModified` 需要 `getFile()` 的 `lastModified` 与缓存文件时间，当前缓存写入不带时间戳。 | `plan.md:71-84`；`findings-data.md:33-51`；`src/App.tsx` 的 `loadIntoEditor`/`openSingleFile`；`src/lib/cache.ts` | 只对「有目录句柄」的文档读 `.sidelight`；`openSingleFile` 走 localStorage/D2 另一条；宿主 `/__draft` 与本地草稿合并成一个 `pendingDraft`，按来源优先只弹一次；`readCache` 增加 mtime 或读 `getFile().lastModified`；无目录时状态栏不显示「草稿」 | T5 |
| H5 | major | T6 `:94` 说「宿主 6 MB 与 5.5 MiB 收成一个常量与一个文案（宿主侧本轮只改文案引用，不改宿主代码）」；只改文案不改代码，两个上限仍不一致：同一 5.61 MiB 文件宿主可开、浏览器拒绝，或反之。F4 `:95` 的 Tab 只写「列表/普通段落/代码块」，没有写表格单元格、blockquote、空列表项、`Shift+Tab` 在段首的行为；`keyboard` 35 仍可能被 Tab 插入改动打红。 | `plan.md:90-100`；`findings-data.md:55-72`；`src/lib/workspace.ts:234-249`；`src/App.tsx` 的 `MAX_HOST_DOC_LENGTH` | 宿主与浏览器用同一个 `MAX_DOC_BYTES`（要改 host 或明确「宿主 6 MB 是历史限制，本轮只统一浏览器」并写进 README）；Tab 的 `keydown` 先判 `table`/`blockquote`/列表项/`isComposing`，表格内保留默认 Tab，列表内只 `sink/lift`，段落只插两空格；`keyboard` 加「表格 Tab 不插空格」 | T6 |
| H6 | major | 预算只剩 234 B，T1–T6 新增 6 项修复（脚本/测试不进 bundle，但 `footnotes.ts`/`math.ts`/`serializeDocument.ts`/`risk.ts`/`App.tsx`/`workspace.ts`/`trash.ts` 都会进首屏）。计划 `:4` 的砍序是 C3→C2→Tab，但 C1/D1/D2/D3 本身就是 P0/P1；若这四项已超 234 B，砍 C3/C2/Tab 也救不回来。T4 的 `pendingDelete`/缓存搬移、T5 的草稿恢复、T6 的 Tab 处理都会增加 App 字节。 | `plan.md:4,131-134`；`findings-ship.md` 的 234 B；`findings-perf.md` | 每个任务单独 `.tmp/build-a` + measure，先量 C1/D1/D2/D3；若这四项已超 285,000，必须砍「D2 的源码 256 KiB 守卫」或「D3 的 Tab」并写延后，不能只砍 C3/C2；把「C1/D1/D2/D3 超线时的降级」写进计划 | T1–T6 |

---

## H1（blocker）脚注摘出/拼回不对称

当前 `footnotes.ts`：

```ts
export type FootnoteSplit = { body: string; footnotes: string }
...
export function joinFootnotes(body, footnotes) {
  if (footnotes.trim().length === 0) return body
  return `${body.replace(/\s+$/, '')}\n\n${footnotes}`
}
```

问题：

1. **混合尾块**：`extractFootnotes` 只能返回一个 `footnotes` 字符串。若尾部是：

```
[^a]: 脚注
    续行
[ref]: https://example.com
```

计划要把脚注块和 `[ref]:` 块都摘出并按原文顺序拼回；但 `joinFootnotes` 只会把整个 `footnotes` 放在 `body` 后，无法保留「哪一块在前、中间几个空行」。
2. **空行数**：`extractFootnotes` 的 `body` 去掉了定义前的空行，`joinFootnotes` 固定补 `\n\n`；原文若只有 1 个空行，拼回会变 2 个，`throughApp` 不可能逐字节相同。
3. **`\s+$`**：`joinFootnotes` 会删掉正文末尾所有空白；若正文末尾有用户保留的空行，脚注拼接会改变它们（与 C3 的尾部空行修复互相打架）。
4. **`footnoteLosses`**：`findings-core.md:49` 说当前「定义整行不存在时 `continue`」；T1 要改成 blocking。若用户主动删定义和引用，仍按「原文有定义」拦，会误报。

**修**：

- `FootnoteSplit` 改成 `blocks: Array<{ kind: 'footnote'|'ref'; text: string; gapBefore: number }>`，或至少 `footnoteBlock`、`refBlock`、`gap` 三个字段；
- `joinFootnotes` 按 `gapBefore` 与块顺序拼回，不再 `\s+$`；
- `footnoteLosses` 检查「当前正文仍有 `[^id]` 引用」而不是只看原文。

## H2（major）公式 `\\`、`\$` 与尾部空行

T2 `:28`：

> 公式片段内保留成对 `\\`（行分隔），不再无条件折叠；对 4 个及以上连续反斜杠只还原解析时多加的那一层。

`math.ts` 当前 `repairMath` 对 `$...$` 全局 `\\\\→\\`。如果只保留成对 `\\`，必须区分：

- LaTeX 行分隔 `\\`（两个反斜杠，保留）；
- Markdown 转义 `\$`（一个反斜杠 + `$`，不能变两个）；
- 解析器多加的一层（四个反斜杠，可能还原成两个）。

`$...$` 正则会把 `\$100` 的 `$` 当公式起点，状态机要跳过转义 `$`。

T3 `:44` 的 `\n{3,}$` 归一与 `joinFootnotes` 的 `\s+$` 可能同时作用：先删尾部空白，再补 `want` 个换行，再把 3+ 换行归一，用户原文的 4 个尾部空行可能被改成固定值。**修**：只按 `trailingNewlines(original)` 补，不再二次 `\n{3,}$`；`joinFootnotes` 不 `\s+$`；公式用状态机而不是全局正则。

## H3（blocker）删除脏文件的确认、trash 缓存与撤销

findings D1 的实测：

```
trash only OLD-A
drafts/a.md -> null
annotations/a.json -> null
undo restores file but not annotations
```

T4 `:57` 说「复用切换文档三选一」，但 `pendingSwitch` 的 `after` 是「切换文档」回调，`removeFile` 需要「保存后删除」的删除回调；两者不能直接复用，必须新建 `pendingDelete` 或在 `pendingSwitch` 里加 `kind:'delete'`。

T4 `:58` 的 trash 结构：

```
<trashName>.md     当前正文
<trashName>.draft  草稿
<trashName>.json   批注
```

但 `restoreFromTrash` 当前只恢复 `.md` 字节；计划 `:59` 才加缓存搬回，且 6 s 过期清理没有「撤销失败/半完成」分支。非当前文件删除（`:60`）仍走 `removeCache`，批注仍丢，却只改文案。

**修**：

1. 新建 `pendingDelete`，三选一「保存后删除 / 直接移到回收站 / 取消」；
2. 删除前把当前正文和缓存**先写进 trash**，任一步失败中止，原文件/缓存不动；
3. `restoreFromTrash` 同时搬回 `.md`、`.draft`、`.json`；6 s 内撤销不清理；
4. 非当前文件删除也搬缓存，或明确「非当前文件批注不随回收站恢复」并写进 UI/README。

## H4（blocker）草稿恢复与宿主 `/__draft` 双弹

T5 `:75`：

> `loadIntoEditor`/`openSingleFile` 载入后读一次 `.sidelight/drafts`，草稿存在且 `mtime > file.lastModified` → 复用现有「有比原文件更新的草稿」对话框。

问题：

- `openSingleFile` 通过 `showOpenFilePicker` 拿单个文件，没有目录句柄；`parentDirectory` 返回 null，读不到 `.sidelight`。计划把它和 `loadIntoEditor` 并列，实际只能对「文件夹里的文档」生效。
- 宿主文档已有 `/__draft` 恢复提示；T5 `:84` 只写「宿主优先」，没有写「同一文档只弹一个」的状态合并。`loadIntoEditor` 的 localStorage 草稿也可能与宿主提示同时出现。
- `readCache` 返回文本，不返回 mtime；`mtime > file.lastModified` 需要 `getFile()` 的 `lastModified` 与缓存文件时间，当前缓存写入不带时间戳。

**修**：

- 只对有目录句柄的文档读 `.sidelight`；`openSingleFile` 走 localStorage/D2 另一条，不读 `.sidelight`；
- 宿主 `/__draft` 与本地草稿合并成一个 `pendingDraft`，按来源只弹一次；
- `readCache` 增加 mtime 或直接 `getFile().lastModified`；无目录时状态栏不显示「草稿」；
- 315 KiB 文档恢复后 `dirty=true`、`__slState.name` 不变，补断言。

## H5（major）5.5 MiB/6 MB 与 Tab 边界

T6 `:94`：

> 宿主 `MAX_HOST_DOC_LENGTH`（6 MB）与 `MAX_DOC_BYTES`（5.5 MiB）收成一个常量与一个文案（宿主侧本轮只改文案引用，不改宿主代码）。

只改文案不改代码，两个上限仍不一致：同一 5.61 MiB 文件宿主可开、浏览器拒绝，或反之。要么改 host 常量，要么明确写「宿主 6 MB 是历史限制，本轮只统一浏览器」并写进 README。

F4 `:95` 只写「列表/普通段落/代码块」；要补：

- 表格单元格内 Tab 保留默认（移动单元格），不插空格；
- blockquote 内按普通段落处理还是保留默认？写死；
- 空列表项 Tab 不双重 `sink`；
- 段首 `Shift+Tab` 不删到上一段；
- `isComposing` 不处理；
- `keyboard` 加「表格 Tab 不插空格」「列表 Tab 只缩进一次」。

## H6（major）234 B 预算与砍序

当前 284,766 / 285,000，余 234 B。T1–T6 新增 6 项修复，脚本/测试不进 bundle，但 `footnotes.ts`、`math.ts`、`serializeDocument.ts`、`risk.ts`、`App.tsx`、`workspace.ts`、`trash.ts` 都会进首屏。

计划 `:4` 的砍序是 **C3 → C2 → Tab**，但 C1/D1/D2/D3 本身就是 P0/P1；如果这四项已超 234 B，砍 C3/C2/Tab 也救不回来。T4 的 `pendingDelete`/缓存搬移、T5 的草稿恢复、T6 的 Tab 都会增加 App 字节。

**修**：

- 每个任务单独 `.tmp/build-a` + measure，先量 C1/D1/D2/D3；
- 若这四项已超 285,000，必须砍「D2 的源码 256 KiB 守卫」或「D3 的 Tab」并写延后；
- 把「C1/D1/D2/D3 超线时的降级」写进计划，不能只砍 C3/C2/Tab。

## 逐项核对记录

### T1
- 多行脚注、混合 `[ref]:` 尾块、`footnoteLosses` blocking 的方向对；`FootnoteSplit` 单字符串/`joinFootnotes` 固定 `\n\n`/`\s+$` 是 H1。
- `extractFootnotes` 识别续行 `^ {2,}|\t` 可行；但要防 `[ref]:` 被当脚注（`[^` 前缀严格）和嵌套列表缩进。
- `roundtrip` 7/7 只保证现有 fixture；新样本走 `throughApp`/`data-safety`，方向对。

### T2
- 公式内 `&amp;` 还原、`\\` 不折叠、`\$` 不二次转义方向对；状态机/转义 `$` 是 H2。
- `math.test` 11/11 起，三次保存字节相同，方向对；`risk.ts` math-escape 可延后。

### T3
- 删尾部空段落、按原文 `trailingNewlines` 补、三次往返稳定方向对；与 `joinFootnotes` 的 `\s+$` 冲突（H2）。
- 只删「文末空段落且原文换行数覆盖」，方向对。

### T4
- dirty 三选一、当前正文进 trash、缓存搬移、撤销恢复方向对；`pendingSwitch` 复用/缓存搬回/非当前文件是 H3。
- `trashName` 冲突加序号、撤销 6 s 过期清理，方向对。

### T5
- `readCache` 草稿恢复、源码 256 KiB/hostMode 守卫、状态栏 chip 方向对；`openSingleFile` 无目录/宿主双弹/mtime 是 H4。
- 315 KiB 性能、`dirty=true` 断言要写。

### T6
- `pickFile` 5.5 MiB 检查、统一文案、Tab 插入两空格/列表 sink/Shift+Tab 方向对；宿主 6 MB 未改、表格/blockquote 边界是 H5。

### 通用
- 文件归属：B T1/T2/T3 串行 lib；A T4/T5/T6 串行 App/Tree/workspace/trash；零重叠成立。
- 构建纪律：A `.tmp/build-a`+measure；B 唯一 build；成立。
- 可独立复现：T1/T2/T3 的 Node 管道、T4/T5/T6 的 fake FS/宿主可复现；真实 IME/宿主/网络盘仍 UNVERIFIED。

## 做对的地方（别改过头）

1. T1 把脚注续行、混合尾块、`footnoteLosses` blocking 作为 P0 一起修，方向正确；`FootnoteSplit` 需要表达块顺序与 gap。
2. T4 把「当前正文 + 缓存」一起搬进 trash、撤销一起恢复，是 D1 的正确方向；`pendingDelete` 与 `restoreFromTrash` 要写全。
3. T5 源码 256 KiB/hostMode 守卫、T6 `pickFile` 大小门，方向正确；把宿主/浏览器上限统一即可。

---

### 附：本次审查证据

- `plan.md:13-15`（T1）、`:28-30,43-44`（T2/T3）、`:56-60`（T4）、`:75-84`（T5）、`:90-100`（T6）、`:4,131-134`（预算）。
- `src/lib/footnotes.ts:18-49`；`src/lib/serializeDocument.ts:39-50`；`src/lib/math.ts:28-32`；`src/lib/risk.ts:127-166`；`src/lib/trash.ts`。
- `findings-core.md:45-101,105-141`；`findings-data.md:10-72`；`findings-ship.md` 的 234 B。
- 未改产品文件、未 commit；未生成新截图。
