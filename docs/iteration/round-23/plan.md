# 第 23 轮 · 计划（数据与 Markdown 修复）

基线 v0.30.4，首屏 284,903 B。5 个任务：A 组（builder）T1–T3，B 组（builder2）T4–T5，零文件重叠。本轮不派新侦察，直接修 P0/P1；**不做** UX/安装/性能（24–25 轮）。版本 **0.31.0**。
**预算（H4）**：首屏上限从 285,000 临时放宽到 **286,000 B**（理由记 STATE）。**先分别量 A 组三项**（T1/T2/T3 各自 `.tmp/build-a` + `measure`）：若 T1+T2+T3 合并后 >286,000，按 **T3 的 `.current.md` → T1 的 256 KiB 守卫 → T2 的文案** 顺序砍并记录「延后」；A 组落定后再做 T4/T5，仍超则按 **T5（CRLF）→ T4 的 M1 → T4 的 F3** 砍。不无限放宽。

## T1 浏览器草稿读回 + 写路统一门（D2，P0/A 组）

- **目标**：315 KB 文档刷新后能从 `.sidelight/drafts/<key>` 恢复并提示；草稿带 mtime、只有比磁盘新才提示；宿主 `/__draft` 与本地草稿合并成单一 `pendingDraft`，同一文档只弹一次；源码模式、保存成功写 `DOC_KEY`、草稿写入三条路径都加 256 KiB 上限与 hostMode 守卫。
- **为什么现在**：D2 实测 315 KB 文档输入后草稿在 `.sidelight/drafts` 且含新字，刷新丢失、无提示，状态栏仍显示「草稿」；源码模式 300 KB 连打 3 键写 3 次整篇 `localStorage`（长度 289,943→289,945）；保存成功 `finishSaved` 又无条件写 `DOC_KEY`，绕过 onUpdate 的门（`findings-data.md` D2）。
- **文件**：`src/App.tsx`、`src/lib/cache.ts`（只新增带 mtime 的读函数，不改既有签名）、`scripts/draft-acceptance.mjs`
- **步骤**
  1. `cache.ts` 新增 `readCacheText(dir, kind, key): Promise<{ text, mtime } | null>`（`getFileHandle` → `getFile()` 取 `lastModified`），既有 `readCache` 语义不变。
  2. **按来源分三种（H1）**：① 文件夹文档（有目录句柄）载入后读 `readCacheText(dir,'draft',cacheKey(name))`，仅当 `mtime > file.lastModified` 且内容不同 → `pendingDraft`；② 单个文件（`openSingleFile`，无目录句柄）**只读 `localStorage` 草稿**，不读 `.sidelight`；③ 宿主文档读 `/__draft`，与本地草稿按 mtime 取较新者合并。
  3. 新建单一 `pendingDraft: { text, mtime, source: 'host' | 'local' | 'none' }`：没有草稿时 `source = 'none'`，不弹框、**状态栏不显示「草稿」**；有草稿时同一文档只弹一次（`docToken` 去重）。
  4. 恢复：`pendingDraft` 应用后 `dirty = true`、基线仍取磁盘正文；丢弃：清该草稿（本地 `removeCache` / 宿主 `draft-clear`）。
  5. **写路统一门**：抽出 `persistDocKey(text)`：`if (hostModeRef.current) return` 且 `text.length <= 256*1024` 才写 `DOC_KEY`，`try/catch` 吞配额错误并记日志；三处调用——源码模式 effect、`finishSaved`、草稿写入；超限只保留内存与 `.sidelight/drafts`（宿主保留 `/__draft`）。
  6. `draft-acceptance.mjs` 扩：文件夹 315 KiB 刷新恢复、单文件 localStorage 恢复、旧草稿不提示、宿主+本地只弹一次、无草稿时状态栏无「草稿」、源码 3 键与保存成功都不写整篇。
- **验收**
  1. 文件夹内 315 KB 文档输入 `ZZTOP-MARK`、等草稿落盘、刷新 → 出现恢复提示（一次）；恢复后正文含标记、`dirty === true`、`__slState.name` 不变；丢弃后正文为磁盘旧文。
  2. **单文件**（`openSingleFile` 打开、无目录句柄）：只从 `localStorage` 恢复；`.sidelight/drafts` 即使存在也不读（脚本断言 `readCacheText` 未被调用）。
  3. 草稿 mtime 早于文件 `lastModified` → 不提示；无草稿时 `pendingDraft.source === 'none'`、状态栏无「草稿」chip。
  4. 同时存在 `/__draft` 与本地草稿 → 只出现 1 个对话框，取 mtime 较新者。
  5. 源码模式 300 KB 连打 3 键：`localStorage.setItem(DOC_KEY, …)` 调用 **0** 次；保存成功后对 >256 KiB 文档同样 0 次；`.sidelight/drafts` 内容含新字。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/draft-acceptance.mjs`
- **风险与回退**：宿主与本地两个来源的提示必须互斥；草稿 mtime 用 `lastModified`，时钟异常时按「内容不同且草稿更新」保守处理。回退：`git checkout -- src/App.tsx src/lib/cache.ts scripts/draft-acceptance.mjs`。
- **难度** M ｜ **量级** 160–230 行

## T2 打开文件大小门（D3，P1/A 组）

- **目标**：`Ctrl+Alt+O` 的 `pickFile`/`openSingleFile` 在读文本前查 `File.size`，与文件树共用 `MAX_DOC_BYTES`（5.5 MiB）与同一句文案；5.88 MB 必须 2 s 内报错、不阻塞。
- **为什么现在**：D3 实测同一份 5.61 MiB 文件走树被拒，走 `Ctrl+Alt+O` 无提示、**15,944 ms** 后载入，主线程停顿 15,700 ms（`findings-data.md` D3）；根因 `MAX_DOC_BYTES` 只在 `readNode`，`pickFile` 拿 `file.text()` 后直接返回。
- **文件**：`src/lib/workspace.ts`、`src/App.tsx`、`scripts/bigfile-acceptance.mjs`
- **步骤**
  1. `pickFile` 先 `await file.size` 判断：`> MAX_DOC_BYTES` 返回 `{ tooLarge: true, size }`，**不调用 `text()`**；否则返回 `{ file }`。
  2. `openSingleFile` 收到 `tooLarge` → `setNotice({kind:'error', text:'文件太大，暂不支持（上限 5.5 MiB）。'})`，旧文档不变；与 `readNode` 用同一常量与文案。
  3. 宿主 `MAX_HOST_DOC_LENGTH`（字符口径）本轮不改（属 host 代码），在报告记「宿主 6 MB 文案差异留 24 轮」。
  4. `bigfile-acceptance.mjs` 加「打开文件」路径：5.88 MB 拒绝、5.2 MiB 允许、旧文档保持。
- **验收**
  1. 5.88 MB 走 `Ctrl+Alt+O`：≤2 s 出现「文件太大，暂不支持（上限 5.5 MiB）」；`window.__slState.name` 与正文不变；`longtask > 1 s` 为 0（对比基线 15.7 s）。
  2. 5.2 MiB 走同路径可打开；树路径行为不变。
  3. 拒绝时 `file.text()` 未被调用（脚本计数 = 0）。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/bigfile-acceptance.mjs`
- **风险与回退**：`pickFile` 返回值形状变化牵动调用点（只有 `openSingleFile` 一处）；不能误伤「另存为」的 `saveAsFile`。回退：`git checkout -- src/lib/workspace.ts src/App.tsx`。
- **难度** S ｜ **量级** 40–80 行

## T3 删除脏文件：字节保真 + 缓存事务（D1，P1/A 组）

- **目标**：删除时 trash 副本保留原始字节（BOM/GBK/CRLF），脏文档另存当前正文；**复制**缓存失败则中止且不删原文件；不留下已搬走或空掉的 `drafts`/`annotations`。
- **为什么现在**：F1 实测 `trash.ts` 用 `file.text()` 写 trash，`srcBytes=19 / trashBytes=16`（BOM 被吃），GBK 变乱码；F2 实测先搬缓存后删文件，文件删除失败时缓存已离开 `.sidelight`、无撤销入口，重试后撤销找不回批注（`findings-fix.md` F1/F2）。
- **文件**：`src/App.tsx`、`src/lib/trash.ts`、`src/components/TreeActions.tsx`、`scripts/tree-acceptance.mjs`
- **步骤**
  1. **原始字节通道**：`deleteFileToTrash` 用 `getFile().arrayBuffer()` 读原文、`arrayBuffer` 写 trash、`SHA-256` 比对；`getFile()` 抛错 → 返回失败并保留原文件，**不再 `.catch(() => '')`**。
  2. **脏文档当前正文（H2）**：若 `currentText !== null`，写 `<trashName>.current.md`（UTF-8；原文件有 BOM 则带 BOM），并在恢复提示写明「编码可能变化」（GBK 原文件无法在浏览器按 GBK 编码，属已知限制，写进报告与 UNVERIFIED）。
  3. **简化事务（H2）**：顺序固定 ① 写 trash 正文（含 `.current.md`）② **复制**（不移动）`drafts`/`annotations` 到 `<trashName>.draft|.json` 并读回校验；**复制失败 → 中止，不删原文件、不动原缓存** ③ 删原文件；**删文件失败 → 保留原文件与原缓存，放弃本次删除**（清掉本次写的 trash 副本） ④ 原文件删除成功后，再尝试删原缓存；**删缓存失败只留重复副本，不算数据丢失**，删不掉就留着。
  4. `restoreFromTrash`：恢复文件（有 `.current.md` 用它，否则原字节）→ 把 `.draft|.json` 搬回原键；**搬回失败保留 trash 副本并提示**，不自动建空目录。
  5. 非当前文件删除：缓存同样复制；无目录句柄时明确不承诺缓存，文案改为「只移动文件本身」。
  6. `tree-acceptance.mjs` 加：BOM 文件删除→撤销后逐字节相同；复制缓存失败→原文件与原缓存都在、trash 无残留；删文件失败→缓存仍在原处；脏文档删除→`.current.md` 含最新正文。
- **验收**
  1. 带 BOM 的 `a.md` 删除 → trash `.md` 与原文逐字节相同（`arrayBuffer` 比较）；撤销后 `a.md` 逐字节相同。
  2. 脏文档删除 → trash 内 `.current.md` 含最新正文；撤销后正文为最新内容、批注恢复。
  3. 注入「复制缓存失败」→ 删除中止、原文件仍在、`.sidelight/drafts|annotations` 仍在、trash 无残留。
  4. 注入「删原文件失败」→ 原文件与原缓存都在、trash 副本被清掉；注入「删原缓存失败」→ 原文件已删、缓存留重复副本、撤销仍能恢复。
  5. `tree` 现有 56/56 不退化。
- **门禁**：`npx tsc --noEmit; npm test; node scripts/tree-acceptance.mjs`
- **风险与回退**：先写 trash 再删原文件，顺序错就丢当前正文；GBK 当前正文无法按原编码写回，只能 UTF-8 并在恢复提示说明。回退：`git checkout -- src/App.tsx src/lib/trash.ts src/components/TreeActions.tsx scripts/tree-acceptance.mjs`。
- **难度** M–L ｜ **量级** 180–250 行

## T4 公式 `\$` 与脚注 2 空格（M1 + F3，P1/B 组）

- **目标**：`价格 \$100 与 $x^2$` 只把 `$x^2$` 识别为公式、保存不二次转义；脚注续行只认 4 空格/tab，「段首空两格」的正文不被吞。
- **为什么现在**：M1 实测 `PAIR = /\$([^$\n]+)\$/g` 从 `\$100` 的 `$` 开始配对，生成 `data-latex="100 与 \"` 的坏节点，`$x^2$` 变文字，保存写出 `\\$100 与 \$x^2$`；F3 实测 `CONT = /^(?: {2,}|\t)\S/` 把 2 空格段落当续行，富文本里整段不可见，保存删掉其前空行且无风险提示（`findings-markdown.md` M1、`findings-fix.md` F3）。
- **文件**：`src/lib/math.ts`、`src/lib/footnotes.ts`、`src/lib/risk.ts`、`src/lib/math.test.ts`、`src/lib/footnotes.test.ts`、`src/lib/diff.test.ts`、`scripts/data-safety-acceptance.mjs`
- **步骤**
  1. `math.ts`：`PAIR` 跳过已转义 `\$`（手写扫描或 `(?<!\\)\$`）；只对公式片段做 `\\$`→`\$` 还原；`repairMath` 不再全局折 `\\`（只还原解析端多加的一层）。
  2. `footnotes.ts`：`CONT` 收紧为 `^(?: {4,}|\t)\S`；`joinFootnotes` 保留块内空行（`gap` 不被续行丢弃）；`risk.ts` 用同一规则。
  3. `risk.ts` 加 `math-escape`（原文有 `\$`/`\begin{`，保存后对应节点消失）与 `footnote-loss`（定义消失但引用仍在）的 blocking；「2 空格段落被吞」命中 footnote-loss。
  4. 测试：`math.test.ts` 加 `价格 \$100 与 $x^2$`（仅 1 个公式节点、两次保存字节稳定）；`footnotes.test.ts` 加「定义后接 2 空格正文：正文不丢、保存保留空行」「4 空格续行仍归脚注」；`diff.test.ts` 加 risk 断言；`data-safety-acceptance` 加两条 throughApp 逐字节用例。
- **验收**
  1. `价格 \$100 与 $x^2$`：解析后只有 `x^2` 一个数学节点；保存输出保留 `\$100` 与 `$x^2$`；第二次保存逐字节相同。
  2. 2 空格段落用例：富文本可见（字数含该段）、保存后段落与空行都在、`baselineBlocking` 为空（不误报）。
  3. 4 空格续行仍并入脚注；`roundtrip` 仍 7/7；`data-safety` 两条新增用例逐字节通过。
  4. `npm test` 16 文件、**213 条起**（新增条数计入）。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip; node scripts/data-safety-acceptance.mjs`
- **风险与回退**：放宽 `PAIR` 可能漏识别合法公式（用现有 math/roundtrip 样本兜）；`CONT` 收紧后 4 空格续行若被误判会让脚注丢失，靠逐字节用例。回退：`git checkout -- src/lib/math.ts src/lib/footnotes.ts src/lib/risk.ts src/lib/*.test.ts`。
- **难度** M ｜ **量级** 120–180 行

## T5 CRLF 尾部空行（T1/C3，P2/B 组）

- **目标**：CRLF 文档 1–2 个尾部空行不再被吞；≥3 个不再写 `&nbsp;` 增长；三次往返字节稳定。
- **为什么现在**：T1 实测 `A\r\n\r\n` 保存后只剩 `A\r\n`（两个空行都丢）；`A\r\n\r\n\r\n\r\n` 起每次保存多一个 `&nbsp;`；根因 `serializeDocument.ts` 的 `trailingNewlines` 用 `/\n+$/`，CRLF 的 `\r` 截断连续换行；同一函数没删 doc 末尾空段落（`findings-markdown.md` T1）。
- **文件**：`src/lib/serializeDocument.ts`、`src/lib/diff.test.ts`
- **步骤**
  1. **只在字符串层处理（H3）**：不碰 doc 节点。`serializeDocument` 拿到序列化文本后，用 `/(?:\r\n|\n)+$/` 统一识别尾部换行，按 **换行对数** 计数；删尾部空段落只在字符串层做——去掉末尾「仅空白行 / `&nbsp;` 行」，不 dispatch、不改 ProseMirror 文档。
  2. `trailingNewlines` 与尾部清理统一用 `(\r\n|\n)` 计数与替换：`\r\n` 与 `\n` 都算 1 个换行；替换时**保留原文件的 CRLF**（LF 文件写 LF，CRLF 文件写 CRLF），不整体转 LF。
  3. `diff.test.ts` 加矩阵：`LF/CRLF × 0–5 个尾部空行 × 3 次保存`，断言 1–2 个空行保留、≥3 个不出现 `&nbsp;`、三次输出逐字节相同、CRLF 文件输出仍含 `\r\n`。
- **验收**
  1. `A\r\n\r\n` → 保存 `A\r\n\r\n`；`A\r\n\r\n\r\n` → `A\r\n\r\n\r\n`；`A\r\n\r\n\r\n\r\n` → 无 `&nbsp;`、尾部换行对数不变、输出含 `\r\n`。
  2. 三次往返逐字节相同；LF 矩阵结果不变；`roundtrip` 7/7 不退化。
  3. 输出中 `&nbsp;` 出现次数 = 0（本轮矩阵）；doc 节点与 `setMarkdown` 调用次数不变（脚本断言）。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip`
- **风险与回退**：字符串层删尾可能误删用户有意保留的空白行；仅当原文尾部换行对数已覆盖时才删，且不动正文中间空行。回退：`git checkout -- src/lib/serializeDocument.ts src/lib/diff.test.ts`。
- **难度** S–M ｜ **量级** 60–100 行

## 文件归属与执行顺序（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/lib/cache.ts`、`scripts/draft-acceptance.mjs` |
| T2 | A（T1 后） | `src/lib/workspace.ts`、`src/App.tsx`、`scripts/bigfile-acceptance.mjs` |
| T3 | A（T2 后） | `src/App.tsx`、`src/lib/trash.ts`、`src/components/TreeActions.tsx`、`scripts/tree-acceptance.mjs` |
| T4 | B（builder2，并行） | `src/lib/math.ts`、`src/lib/footnotes.ts`、`src/lib/risk.ts`、`src/lib/math.test.ts`、`src/lib/footnotes.test.ts`、`src/lib/diff.test.ts`、`scripts/data-safety-acceptance.mjs` |
| T5 | B（T4 后） | `src/lib/serializeDocument.ts`、`src/lib/diff.test.ts` |

- 零重叠：A 只碰 App/cache/workspace/trash/TreeActions 与三个验收脚本；B 只碰 math/footnotes/risk/serializeDocument 与测试。`diff.test.ts` 只由 B 改（T4/T5 串行）。
- 顺序：A 串行 T1→T2→T3；B 串行 T4→T5；两组并行。每任务 `.tmp/build-a` + measure；根代理最后 `npm run build` + `measure --max 286000`。
- 报告：`docs/iteration/round-23/impl-a.md`、`impl-b.md`；截图 `shots/round-23/t1-*.png`、`t3-*.png`。

## 本轮不做（延后）

UX/安装/性能（24–25）：F1/F2/F3 界面项、L1–L5、U1–U3、I1–I5、perf P1/P2/P3、D4 多标签恢复槽、D5 草稿新旧提示的完整版（本轮只做 T1 的最小去重）、G1 表格配对、C4 源码切换撤销。真实宿主/IME/macOS/网络盘仍 UNVERIFIED。

## 风险最高的任务

**T3**。删除改成「原始字节 + `.current.md` + 复制式缓存备份」：顺序错（先删原文件/先删缓存）会丢当前正文或批注；复制校验若只写不读回，失败也发现不了；GBK 当前正文无法按原编码写回，只能 UTF-8 并在恢复提示说明。缓解是「BOM 文件逐字节相同」「脏文档 `.current.md` 含最新正文」「复制缓存失败→原文件与原缓存都在」「删文件失败→缓存仍在原处」「删缓存失败→撤销仍能恢复」五条断言。次高 T1：单文件若误读 `.sidelight`、或 `pendingDraft.source` 未加 `'none'`，会多弹一次或在无草稿时误显示「草稿」chip。

## 门禁与版本

- `npm run build`、`npm test`（16 文件、**213 条起**）、`npm run roundtrip`（7/7 不退化）、`draft`/`bigfile`/`tree`/`data-safety` 新增断言全过；首屏 ≤ **286,000**（临时上限，STATE 记理由）。
- 版本 0.31.0；`package.json`/`package-lock`/CHANGELOG/README 由根代理统一升，B 不单独改。
