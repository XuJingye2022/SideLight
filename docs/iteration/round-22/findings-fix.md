# 第 22 轮 · 修复复验（C1 脚注、D1 删除恢复）

- 环境：Sidelight 0.30.4，`localhost:5173`（Vite dev），headless Edge 157 CDP `127.0.0.1:9227`，独立 profile `.tmp/r22-fix/edge-profile`。
- 方法：三支探针，全部只读 `src/`。
  1. `.tmp/r22-fix/probe-c1.mjs` — Node 侧复刻 App 保存路径（`scripts/roundtrip.mjs` 的 `throughApp`：`extractFootnotes` → `protectMathPairs`/`escapeHtmlForParse` → MarkdownManager → `serializeDocument`），对 13 个对抗输入跑两次往返，并用 `baselineLosses`/`activeLosses` 判定保存门会不会拦。
  2. `.tmp/r22-fix/probe-trash.mjs` — 直接调 `src/lib/trash.ts` 的生产函数，文件系统按 **字节** 存储（`File`/`arrayBuffer` 语义与浏览器一致），跑 6 组（BOM、GBK、删除失败、撤销后再删、trash 重名、读不出文件）。
  3. `.tmp/r22-fix/probe-app.mjs` — 真应用 + 内存文件夹（复刻 `scripts/data-safety-acceptance.mjs` 的 harness），走右键删除、`Ctrl+S`、撤销按钮。
- 原始输出：`.tmp/r22-fix/out-c1.txt`、`out-trash.txt`、`out-app.txt`、`out-c1.json`。
- 截图：`shots/round-22/fix-c1-hidden-indent-rich.png`、`fix-c1-middoc-rich.png`、`fix-c1-middoc-save-confirm.png`、`fix-d1-delete-clean.png`。

## 先说结论：C1/D1 的主干已闭合

- C1：文末脚注块（4 空格续行、tab 续行、中文 id、重复 id、空定义、块内含代码围栏、尾部多空行）**逐字节往返一致，且第二次往返稳定**。真应用 `Ctrl+S` 也是字节一致（B0）。第 21 轮 C1 的两条主要复现（续行、脚注+`[ref]:` 混合）都不再丢定义。
- D1：第 21 轮 D1 的核心用例**端到端闭合**（B4，8/8）：删除脏文件的确认框现在写「这篇还有未保存的正文……撤销会一起搬回」；trash 里是编辑器当前正文（`OLD-AIMPORTANT-NEW\n`，不是磁盘上的旧字节）；`.draft`/`.json` 一起进 trash；撤销把正文与批注缓存都搬回，trash 条目清空。删除→撤销→再删不会撞 trash 名（T4/T5）。
- 仍存在的缺口 3 条，都在修复的边缘上，下面的复现可以直接抄进任务单。

---

## F1（P1，丢字节）删除不再逐字节搬运：trash 副本走 `file.text()`，BOM 被吃掉、GBK 文件变乱码；文件读不出来时写空副本仍然"删除成功"

**复现 1（BOM，真应用）**

1. 工作区放 `bom.md`，正文首字节为 UTF-8 BOM（`EF BB BF`）。不编辑，右键 →「删除（移到回收站）」→ 确认。
2. `.sidelight/trash/<名>.md` 比原文件少 3 字节（无 BOM）。点「撤销」：`bom.md` 回来，但 BOM 没了。
3. 实测：`before` 19 字节 `EF BB BF 23 20 …`，trash 副本 16 字节 `23 20 …`，撤销后 16 字节。

**复现 2（GBK/ANSI，Node 直调生产函数）**

1. `legacy.md` = GBK 字节 `C4 E3 BA C3 A3 AC CA C0 BD E7 0A`（「你好，世界」）。
2. `deleteDocumentToTrash(root, node, null)` → `ok:true`；trash 副本变成 `EF BF BD ×7 …`（U+FFFD 替换字符），撤销恢复的也是乱码。

**复现 3（读不出文件 → 空副本 + 真删）**

1. 树快照里的 `x/gone.md` 在磁盘上已不可读（已被外部移动/改权限/共享盘断开），`handle.getFile()` 抛错。
2. 右键删除：`ok:true`，提示「已移到回收站：gone.md」，磁盘上的真文件被删掉，**trash 副本是 0 字节**。撤销只能恢复一个空文件。

**证据**

- `.tmp/r22-fix/out-trash.txt`：`T1 trash copy is byte-identical` FAIL（`srcBytes=19 trashBytes=16`）、`T1 restored bytes == original bytes` FAIL、`T2 trash copy keeps every byte` FAIL、`T6 trash holds the real body` FAIL（`""`）。
- `.tmp/r22-fix/out-app.txt`：`B3 trash copy keeps the BOM` FAIL、`B3 undo restores the exact bytes` FAIL。
- `.tmp/r22-fix/out-app.txt`：23 条断言，20 通过；B3 的两条失败即 F1，B1 的一条失败即 F3。
- 截图 `shots/round-22/fix-d1-delete-clean.png`。

**根因**

- `src/App.tsx:1919` 现在**所有**删除都走 `deleteDocumentToTrash`，即使 `currentText === null`（干净文件）。
- `src/lib/trash.ts:287`：`await node.handle.getFile().then((file) => file.text()).catch(() => '')` —— 文本解码 + 吞掉读错误。
- `src/lib/trash.ts:173-177`：`deleteFileWithText` 用 `copied !== text` 比较**解码后的字符串**，所以 BOM 丢失、非 UTF-8 字节被替换都查不出来。
- 原来逐字节的 `deleteFileToTrash`（`trash.ts:120-149`，`arrayBuffer` + SHA-256）在文件树路径上已成死代码，只剩注释提到它。

**影响**：带 BOM 的中文 `.md`（Windows 记事本产物）删除即改字节；GBK/GB18030 老文档删除+撤销后正文彻底乱码；树快照过期时删除把正文换成空文件，且没有任何提示。

**成本**：S。**建议**：`currentText === null` 时走回 `deleteFileToTrash`（字节搬迁 + SHA-256）；`getFile()` 抛错时返回失败并保留原文件，不要 `.catch(() => '')`；脏文件路径也用 `arrayBuffer` 写 trash，去掉字符串比较。

---

## F2（P1，丢批注/草稿）缓存先搬进 trash、文件后删：文件删除失败时缓存已经离开 `.sidelight`，没有撤销按钮，重试后的撤销也找不回批注

**复现**

1. 工作区 `a.md`，预置 `.sidelight/drafts/a.md`（脏草稿）与 `.sidelight/annotations/a.json`（一条批注）。
2. 令 `a.md` 删除失败（真实触发：被另一个程序占用 / 只读 / 网络盘掉线；探针用 `removeEntry` 抛 `NoModificationAllowedError`）。
3. 右键删除：提示「删除失败：locked」，`a.md` **还在**；但 `.sidelight/drafts/a.md` 与 `.sidelight/annotations/a.json` **都已经不在了**，两份副本孤零零躺在 `.sidelight/trash/<名>.md.draft|.json` 里，界面上没有任何「撤销」按钮。
4. 解除占用后重删：成功，trash 用了一个**新**名字；点「撤销」：`a.md` 回来，批注与草稿**没有回来**——`restoreCachesFromTrash` 按新名字找不到它们，旧的 `.draft`/`.json` 永远留在 trash 里。

**证据**

- `.tmp/r22-fix/out-trash.txt`：`T3 locked file: delete reports failure` PASS + `T3 failed delete leaves the draft cache in place` FAIL + `…annotation cache in place` FAIL + `T3 failed delete strands cache copies in trash` FAIL（列出三个 trash 文件）+ `T3 undo after retry brings the annotations cache back` FAIL。
- 相邻用例通过，说明不是探针问题：`T4 undo restores file + annotations` PASS、`T4 second delete uses a fresh trash name` PASS。

**根因**

- `src/lib/trash.ts:282-286`：先 `moveCachesToTrash`（内部已 `removeCacheText`），再 `deleteFileWithText`；文件删除失败时没有回滚。
- `src/App.tsx:1920-1923`：失败分支只弹错误提示就 `return`，既不 `restoreCachesFromTrash`，也不给撤销入口。
- `moveCachesToTrash` 也不校验写进 trash 的副本，第二份缓存写失败时第一份已经移走。

**影响**：删除失败看起来"什么都没发生"，实际已经丢掉了这篇的批注与草稿；重试成功后撤销只恢复正文，用户以为复原了。

**成本**：S。**建议**：`deleteDocumentToTrash` 里缓存搬移放到删除成功之后（或字节删除成功后再搬）；失败时调 `restoreCachesFromTrash` + 删掉 trash 半成品；`moveCachesToTrash` 每份写完后读回比对，任一份失败就整体回滚。

---

## F3（P2，静默改写）2 空格也算脚注续行：脚注定义后面「段首空两格」的正文被整段吞进脚注，编辑器里看不见，保存时静默删掉它前面的空行，无风险提示

**复现**

1. 文件（末尾空行照抄）：

```
正文[^a]。

[^a]: 脚注一。

  缩进两格的第二段，本来应是正文。
```

2. 打开（富文本）：正文区只有「正文[^a]。」一行，第二段**整段不见**（字数「3 字」），页面**没有**结构风险横幅。
3. `Ctrl+S`：不弹确认，直接写盘。文件变成：

```
正文[^a]。

[^a]: 脚注一。
  缩进两格的第二段，本来应是正文。
```

空行被删掉，第二段成为脚注 `[^a]` 的续行——在 pandoc、Obsidian、任何脚注渲染器里它都属于脚注，不再是正文。`baselineLosses` / `activeLosses` 都是空数组。

**证据**

- `.tmp/r22-fix/probe-c1.mjs` 的 `cont-2space-para`（`DIFF`，`baseline=[] active=[]`）、`def-tight`（正文与定义之间强制补空行，`blocking:false`）。
- `.tmp/r22-fix/out-app.txt`：`B1 indented paragraph is missing from the rich editor` PASS、`B1 no risk banner` PASS、`B1 save is not blocked` PASS、`B1 saved bytes drop the blank line` FAIL（对照输出里 src 与 saved 的完整字符串）。
- 截图 `shots/round-22/fix-c1-hidden-indent-rich.png`（正文只剩一行、字数 3 字）。

**根因**

- `src/lib/footnotes.ts:3` `CONT = /^(?: {2,}|\t)\S/`：把 2 个空格也当续行（pandoc/CommonMark 的续行要求 4 空格或 tab）。
- `src/lib/footnotes.ts:31-33`：块内空行只累加到 `gap`，随后遇 `CONT` 续行时 `gap` 被丢弃，所以定义与那段文字之间的空行在 `joinFootnotes` 时消失（`footnotes.ts:74-76` 只在块与块之间用 `gapBefore`）。
- `src/lib/risk.ts:147` 用同一条 2 空格规则扫描，所以风险检测看不到这次改写。

**影响**：中文写作「段首空两格」很常见。含脚注定义的长文里，紧跟定义的缩进段落会在编辑器里消失（用户看不见、改不了，可能重打一遍造成重复），保存后语义从正文变成脚注，且全程无提示。

**同源缺口（同一处未覆盖，成本同 S）**：脚注定义**不在文末**时（文中、文首，或尾部块里夹了非续行段落），仍会进富文本、被解析成引用式链接定义——`正文[^a] 在这里。` 显示为 `正文^a(定义在文中。) 在这里。`，`[^a]:` 整行消失；此时横幅与保存确认会拦（`footnote-definition` blocking），但富文本视图已经坏了，且没有像引用式链接那样自动进源码模式（`src/App.tsx:1658` 只认 `hasReferenceDefinitions`，`risk.ts:47` 的 `REF_DEFINITION` 排除 `^` 开头）。证据：`.tmp/r22-fix/out-c1.txt` 的 `mid-doc`/`def-first`，`out-app.txt` 的 B2（`<a href="定义在文中。">^a</a>` + 横幅全文 + 确认框全文），截图 `fix-c1-middoc-rich.png`、`fix-c1-middoc-save-confirm.png`。

**成本**：S。

---

## 本轮最值得做的 3 件事

1. **F1 删除回到字节通道**（S）：`currentText === null` 走 `deleteFileToTrash`，不再 `.catch(() => '')`；BOM/GBK/空副本三个问题是一条改动。
2. **F2 删除失败要回滚缓存**（S）：缓存搬移放到删除成功之后，失败路径 `restoreCachesFromTrash` + 清 trash 半成品。
3. **F3 续行只认 4 空格或 tab**（S）：`CONT` 收紧到 ` {4}|\t`，`joinFootnotes` 保留块内空行，`risk.ts` 同步；顺带把「定义不在文末」也纳入源码模式兜底。

### 未验证 / 边界

- F1 的 GBK/空副本用例是在 Node 里直调生产函数（8 条断言），没有在宿主写回链路上抓包；App 侧只验证了 BOM（B3）与真删失败（F2）。
- 真实 Windows 文件占用（`EBUSY`/共享冲突）下 `removeEntry` 的错误名未在宿主实测，F2 用 `NoModificationAllowedError` 模拟；真实触发方式按静态路径推断（`parent.removeEntry`）。
- 4 空格续行在混合尾块（脚注 + `[ref]:`）里已通过；未测 `[ref]:` 定义**在脚注块中间**（如脚注、ref、脚注交错）的极端编排。
