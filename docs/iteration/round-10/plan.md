# 第 10 轮 · 计划（rev2）

基线 `24bb46a`（v0.22.0）。5 个任务：A 组（builder，保真）T1→T2→T3 串行；B 组（builder2，口径/发布）T4→T5 串行，可并行于 A。本轮只做三件可证的事，06 明确不修。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit`、`npx vite build --outDir .tmp/build-a`、`node scripts/fidelity-acceptance.mjs`；B 用 `npx vite build --outDir .tmp/build-b` 与 `Select-String` 核查，不改 `src/`。`package.json` 只归 T4；`package-lock` 由根代理 `npm install --package-lock-only` 同步。

## T1 表格 02 保真 + 共享序列化 + 三栏 roundtrip 输出（B1/B5/H1/H4/H5）｜A 组（builder，先做）

- **目标**：`02-table.md` 变**完全保真**（表内分隔行、对齐、列宽、02 型表格前后各 1 空行）；改值/加列/删行/改对齐安全退让且内容不丢；App 两处与报告脚本共用**同一段** `serializeDocument`；`npm run roundtrip` 产出三栏（富文本 / 源码路径 / 首次保存仍拦截）。
- **为什么现在**：B1 实测表格渲染自带前导 `\n` 且 doc 用 `\n\n` 连接，02 每次保存多 2 空行并重写分隔行/列宽；B5 证明不降 `table-separator` 会修好后仍每次弹框；H1/H4 指出三份序列化各写一遍、三栏报告没有脚本归属。
- **文件**：`src/App.tsx`、`src/lib/serializeDocument.ts`（新）、`src/lib/tableReuse.ts`（新）、`src/lib/risk.ts`、`src/lib/diff.test.ts`、`scripts/roundtrip.mjs`（**本任务独占**，T2/T3/B 均不改）、`docs/roundtrip-report.md`（生成物）、`scripts/fidelity-acceptance.mjs`（新）
- **步骤**
  1. **先验 `Table.extend`**：用 `Table.extend({ renderMarkdown(node, helpers) { return this.parent.call(this, node, helpers).replace(/^\n+/, '').replace(/\n+$/, '') } })` 注册，载入 02 断言 `editor.getMarkdown()` 无表格首尾空行。若不生效（`MarkdownManager` 用另一份扩展列表），**放弃 extend**，改在共享出口 `serializeDocument` 里裁一次，并把原因写进 `impl-a.md`。
  2. 新建 `src/lib/serializeDocument.ts`：`serializeDocument(editor, { frontmatter, footnotes, original })` = 编辑器 Markdown → 既有 repair 链 → 表格首尾裁剪（若 extend 不生效则在此做）→ `reuseTables(original, body)` → 拼 frontmatter/脚注。`App.tsx:148` 的 `serializeBody`、`:1780` 的 `currentMarkdown`、`scripts/roundtrip.mjs:28` 的 `throughApp` **三处都改调它**（不再各写一份）。
  3. `src/lib/tableReuse.ts`：`reuseTables(original, serialized)` 用 `risk.ts` 导出的 `fenceMap` 跳过 ``` / ~~~；表格块 = 表头行 + 分隔行 + 数据行（**不含前后空行**）；签名 = 表头单元格文本 + 列数 + 对齐三元组 + 全部数据单元格文本；**多表按出现序号依次配对**（不用签名 Map）；签名命中整块换回原文行，未命中保留规范输出。转义 `\|` 的切分在 `splitCells` 里支持（转义符号不当作列分隔）。
  4. 边界写清楚：**只保证表格行内字节**；表格前后空行仍由 doc 级 `\n\n` 决定（0 或 1 个空行场景与 02 一致；≥2 个空行会被规范化）。这句话进 ADR-0010、README 与报告说明，不承诺「表格永远保真」。
  5. `risk.ts`：导出 `fenceMap`；`table-separator` 改 `blocking: false`（保留提示、不拦保存）；`baselineLosses` 在复用后的文本上算（02 基线因此为空）。
  6. **`scripts/roundtrip.mjs` 三栏输出**（本任务独占）：逐样本输出 `rich`（走 `serializeDocument`，含表格复用）、`source`（源码分支恒等于输入，按定义等值并注明条件）、`firstSaveBlocked`（`baselineLosses(original, appOut)` 里 `blocking` 非空）；汇总三行，不写死数字；不得出现「5 / 7」这类合并数。
  7. 单测（写在 `src/lib/diff.test.ts`，不新增测试文件）：改值/加列/删行/改对齐四种退让；围栏里的假表格不记；同表头多表按出现序号配对；`\|` 转义单元格；「表格前后各 2 空行 → 规范化为 1、内容不变」。
  8. `docs/roundtrip-report.md` 由第 6 步重新生成并提交；06 在报告里明确「多 1 空行、不修、二次往返收敛」。
- **验收**
  1. `npm run roundtrip` 的 `02` 为 `rich` 保真；报告含三栏表头与逐样本三列数字；**无**「5 / 7」「6 / 7」。
  2. **三处同源**：`node scripts/fidelity-acceptance.mjs` 对 02 分别取 `serializeBody`、`currentMarkdown`、`throughApp` 的输出，断言三者**逐字节相同**且等于原文。
  3. 未改动表格保存文本逐字节等于原文；四种编辑后退让为规范格式、单元格文字都在、**不弹保存确认**（基线无 `table-separator`）。
  4. 多表/转义/2 空行三组边界单测全绿；`npm test` 文件数仍 16。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip; npx vite build --outDir .tmp/build-a; node scripts/fidelity-acceptance.mjs`
- **风险与回退**：`Table.extend` 可能不影响 `MarkdownManager`（有兜底并记录）；三处改调共享函数时若漏一处，验收第 2 条会红；复用只保证行内字节，2 个以上空行会规范化（已写明）。回退：`git checkout -- src/ scripts/roundtrip.mjs docs/roundtrip-report.md` 并删新文件。
- **难度** L ｜ **量级** 220–300 行

## T2 frontmatter 后空行 01 保真（B3/H2）｜A 组（builder，T1 后）

- **目标**：`01-obsidian-note.md` 变**完全保真**：frontmatter 结束 `---` 与正文之间的开头空行按原文个数保留（0/1/2 往返逐字节；3 若解析侧仍丢 1，写明上限）。
- **为什么现在**：B3 实测 body 以 `\n` 开头时 marked 只当 1 个换行，`createImplicitEmptyParagraphsFromSpace` 算不出空段落；实测 0→0、1→0（丢）、2→2、3→2（少 1）。
- **文件**：`src/lib/frontmatter.ts`、`src/lib/frontmatter.test.ts`、`src/App.tsx`、`scripts/fidelity-acceptance.mjs`（扩用例）；**不改** `scripts/roundtrip.mjs`（T1 独占；T1 的 `throughApp` 已改调共享 `serializeDocument`，T2 只需在 `serializeDocument` 里接 join）
- **步骤**
  1. **先全量核对调用点**：`grep -n joinFrontmatter src scripts`，按实际结果列全并逐一改（当前已知 `App.tsx` 约 6 处 + `scripts/roundtrip.mjs` 1 处，以 grep 为准，写进 `impl-a.md`）。
  2. `frontmatter.ts` 加独立导出 `leadingNewlines(text: string): number`（body 开头连续 `\n` 个数）；**不改 `SplitResult`**（避免 `frontmatter.test.ts` 的 4 条 `deepEqual` 全红）。
  3. `joinFrontmatter(frontmatter, body, leading?: number)`：拼回时数当前 body 开头换行数，补 `max(0, leading − current)`；`body` 为空串不补；**不带第三参时行为与今天逐字节相同**。
  4. 接线：`serializeDocument`（T1 建）与 `App.tsx` 的基线/草稿/另存为/切换路径都传 `leadingNewlines(original)`；T1 的 `throughApp` 走同一函数，因此报告自动跟随。
  5. `frontmatter.test.ts`：保留原有 `deepEqual` 与三条旧 `joinFrontmatter` 断言（默认参数零行为变化）；新增 **split→join 往返** 四例（原文 0/1/2/3 个空行，用真实 `splitFrontmatter` 再 `joinFrontmatter` 断言逐字节）；若实测 3→2 则断言「3 输出 2」并在注释与报告写明「解析侧上限」。
  6. 06 列表间空行不修（schema 互斥、二次往返收敛），写进报告与 README（T4）。
- **验收**
  1. `npm run roundtrip`：01 的 `rich` 变保真；02 仍保真（不回归）。
  2. `npm test` 全绿：0/1/2 往返逐字节；3 的输出与实测一致（若仍 2，测试名与注释写明上限）。
  3. `fidelity-acceptance`：01 保存文本逐字节等于原文；`body` 为空时不多补换行。
  4. `grep` 清单里每个调用点都传了 `leading`（`impl-a.md` 列全）。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip; npx vite build --outDir .tmp/build-a; node scripts/fidelity-acceptance.mjs`
- **风险与回退**：调用点漏一处就「报告保真、App 仍丢」；`leadingNewlines` 用独立函数是为保住既有测试。回退：`git checkout -- src/ docs/roundtrip-report.md`。
- **难度** S–M ｜ **量级** 80–130 行

## T3 引用式链接默认源码模式 + 横幅退出与 dirty 守卫（B2/U1/H3）｜A 组（builder，T2 后）

- **目标**：含 `[id]: url` 定义的文档载入即源码显示原文；源码未编辑时 `Ctrl+S` 写出**逐字节等于原文**（空文件即 FAIL）；横幅在源码模式给「回到富文本编辑」，`dirty` 时先确认、不静默覆盖。
- **为什么现在**：B2 实测定义在解析阶段被删、富文本保存必丢；U1 实测横幅按钮只进不出，且在源码里点它会静默覆盖刚敲的字。
- **文件**：`src/App.tsx`、`src/lib/risk.ts`、`src/lib/workspace.ts`（demo 文案）、`src/lib/diff.test.ts`、`scripts/fidelity-acceptance.mjs`（扩用例）；**不改** `scripts/roundtrip.mjs`
- **步骤**
  1. `risk.ts` 导出 `hasReferenceDefinitions(text)`：复用 `REF_DEFINITION`（`:46`）与 `fenceMap`，围栏内不算；与保存门同一判定。
  2. **抽 `enterSourceFor(text)`**（单一函数）：`setSourceText(text)` + `sourceBaselineRef.current = text` + `setViewMode('source')`；`loadIntoEditor`（`App.tsx:1477`）与 `applyHostPayload`（`:775`，当前完全不设视图）**都只调它**，禁止各自写这三行。命中 `hasReferenceDefinitions(original)` 才进；草稿恢复、新建、示例不进。
  3. 源码视图常驻说明条（替换只在 `dirty` 时出现的 `.source-hint`）：「源码模式 · 文件原文」「这篇有 N 条引用式链接定义，富文本编辑保存时会删掉定义」+「回到富文本编辑」按钮。
  4. 修 `openSourceOriginal`（`:2731`）：已在源码模式时按钮即「回到富文本编辑」；`dirty` 时点击先弹确认「源码里有未保存的改动，恢复原文会丢掉它们」（复用 `.dialog`），取消不改 `sourceText`；`dirty === false` 才允许恢复原文。
  5. `workspace.ts` demo 文案：「这篇用了引用式链接。打开时会用源码模式显示原文，切到富文本后保存会改写成行内链接。」
  6. `fidelity-acceptance` 扩：载入 04 断言 `viewMode==='source'`、源码框等于原文、**源码模式 `Ctrl+S` 写出的字节逐字节等于原文**（空文件直接 FAIL）、编辑后点按钮出现确认且取消后源码与 `dirty` 不变。
- **验收**
  1. 浏览器与宿主两条入口载入 04：`viewMode === 'source'`、`.source-editor` 值等于文件原文（含定义行）。
  2. **源码未编辑 `Ctrl+S`：写出的字节逐字节等于原文**；断言 `length > 0`（空文件即 FAIL）。
  3. 源码里改字 → 点横幅 → 确认框；取消后源码与 `dirty` 不变；确认后才切回富文本。
  4. 切回富文本后首次保存仍被拦（基线含 `reference-links` blocking loss）。
  5. 报告 04 的 `source` 列为保真（T1 的脚本按定义等值计算），`rich` 列仍记为有变化。
- **门禁**：`npx tsc --noEmit; npm test; npm run roundtrip; npx vite build --outDir .tmp/build-a; node scripts/fidelity-acceptance.mjs`
- **风险与回退**：`enterSourceFor` 若漏 seed，`Ctrl+S` 写空文件（验收第 2 条专抓）；默认进源码对长文是负体验，但只在定义命中时触发且有退出与守卫。回退：`git checkout -- src/ docs/roundtrip-report.md`。
- **难度** S–M ｜ **量级** 100–160 行

## T4 三栏口径校验 + 0.23.0 文档与 ADR（S1/S2/S3/S4/H4/H6）｜B 组（builder2，等 A 的数字）

- **目标**：0.23.0；README/AGENTS/CHANGELOG/ADR-0010/0011 按实际结果改写；**校验**报告三栏表头与数字，不手改生成物。
- **为什么现在**：S2/S5 实测现在只有「3 / 7」三种路径混算；README 五处把「表格对齐」与「引用式链接」并列；「引用式链接」5 处文案与源码默认落地后相反。
- **文件**：`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0010-table-block-reuse.md`（新）、`docs/adr/0011-source-mode-for-reference-links.md`（新）、`package.json`；`docs/roundtrip-report.md` 由 T1 的脚本生成，**T4 只读校验，不手改**。
- **步骤**
  1. `package.json` 只改 `"version": "0.23.0"`；`package-lock` 由根代理同步。
  2. `docs/CHANGELOG.md` 加 `## 0.23.0 — 2026-11-16`：按 findings-ship 草稿写实际结果（02 保真 / 04 源码默认 / 01 保真 / 06 不修 / 三栏口径），未达标条目按括号退路改写，**不许保留「已保真」**；体积 `[TBD]`。
  3. README 五处按替换表改（`:31`、`:36`、`:45`、`:135`、`:137`）：表格「没动过的表格原样写回（表内字节与 02 型单空行）；改过单元格/增删行列/改对齐会重新排版且不弹确认；表格前后 ≥2 空行会规范化」；引用式链接「含定义块默认源码打开；切回富文本首次保存仍拦一次」；三栏数字**照抄** `docs/roundtrip-report.md`；ADR 索引 `0001–0011` 并补 0008–0011。
  4. `AGENTS.md §6`：版本 0.23.0、功能加「表格未改动原样写回」「含定义文档默认源码模式」、测试数按 `npm test` 实测、未验加「表格复用只保证行内字节」「真实宿主源码保存字节」。
  5. `docs/adr/0010`：背景、决策（签名 + 整块复用 + 三种退让）、**边界（行内字节与单空行；≥2 空行规范化；改过的表格不进保存门）**、测量（三栏）、与 ADR-0001 关系（收窄不推翻）、未决、UNVERIFIED。
  6. `docs/adr/0011`：触发条件（只按 definition 行、只在载入、草稿/新建/示例不走）、**必须用 `enterSourceFor` 同时 seed `sourceText` 与 `sourceBaselineRef`**、退出与 dirty 守卫、富文本保存仍拦一次、未验（真实宿主字节、缩进/跨行 title/短引用）。
- **验收**
  1. `node -e "console.log(require('./package.json').version)"` = `0.23.0`；CHANGELOG 含 `## 0.23.0 — 2026-11-16`。
  2. **三栏校验**：报告含 `rich`/`source`/`firstSaveBlocked` 三列表头；README/CHANGELOG 里的数字**逐项等于** `docs/roundtrip-report.md` 汇总行（脚本比对）；无「5 / 7」「6 / 7」。
  3. `Select-String README.md -SimpleMatch '表格对齐','保存前会把所有改动','源码模式能救回'` 0 命中；含「没动过的表格」「默认源码」「≥2 空行」「三栏」各 ≥1；`0001–0011` ≥1。
  4. `Test-Path` 两份 ADR 均 True；ADR-0010 含「行内字节」「不进保存门」；ADR-0011 含「enterSourceFor」「seed」「只在载入」。
  5. `npm test` 0 失败；`AGENTS.md` 含 `0.23.0`。
- **门禁**：上述命令 + `npm test`
- **风险与回退**：报告数字必须来自 T1 的实测（根代理在 A 完成后放行）；表格边界句漏写会被理解成「表格永远保真」；ADR 索引同轮补 0010/0011。回退：`git checkout -- package.json docs/CHANGELOG.md README.md AGENTS.md` 并删两份 ADR。
- **难度** M ｜ **量级** 160–230 行

## T5 体积称重与预算（S1/H6）｜B 组（builder2，T4 后）

- **目标**：量 0.23.0 的 `dist`/JS/CSS 与预算；写两条软线：JS ≤1,153,000 B、安装包**预计** ≤820,000 B（硬线 850,000 不动，实际以 `installer.ps1` 为准，差 >2 KB 记原因）。
- **为什么现在**：S1 实测当前安装包 809,542 B、余量 40,458 B；体积数字散在多处且漂移。
- **文件**：`README.md`（体积段）、`docs/CHANGELOG.md`（体积行）；不改 `packaging/*` 门槛。
- **步骤**
  1. `npx vite build --outDir .tmp/build-b`，量 `index-*.js`（raw 与 `gzipSync level:6`）、CSS、woff2 与 `dist` 合计，与 0.22.0 基线（JS 1,133,427 / dist 1,404,769 / 安装包 809,542）对比。
  2. 换算安装包预算（新增原始字节 × 0.21–0.31 + 7.6% 归档开销），写「预计 820,000；实际由 `installer.ps1` 出包回填；差 >2 KB 记原因，**不抬 850,000 硬线**」。
  3. 回填 README 体积段与 CHANGELOG 体积行（`[TBD]` 只剩安装包字节与 SHA256，由根代理出包后填）；数字只留一处（CHANGELOG），README 写「见 CHANGELOG 0.23.0」+ 两条软线。
  4. `impl-b.md` 记五组实测数字与换算。
- **验收**
  1. `Select-String README.md -SimpleMatch '1,153,000','820,000','见 CHANGELOG 0.23.0'` 各 ≥1；`[TBD]` 仅剩安装包/SHA。
  2. `impl-b.md` 含实测五组与预算换算、>2 KB 规则；`npm test` 0 失败。
  3. `Select-String packaging/installer.ps1 -SimpleMatch '850000'` 仍 ≥1（硬线未动）。
- **门禁**：`npx vite build --outDir .tmp/build-b; npm test` + 上述 `Select-String`
- **风险与回退**：`.tmp/build-b` 不碰 `dist`；不得为好看抬硬线；数字只写实测。回退：`git checkout -- README.md docs/CHANGELOG.md`。
- **难度** S ｜ **量级** 30–60 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/lib/serializeDocument.ts`、`src/lib/tableReuse.ts`、`src/lib/risk.ts`、`src/lib/diff.test.ts`、`scripts/roundtrip.mjs`、`docs/roundtrip-report.md`、`scripts/fidelity-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/lib/frontmatter.ts`、`src/lib/frontmatter.test.ts`、`src/App.tsx`、`src/lib/serializeDocument.ts`（共用）、`scripts/fidelity-acceptance.mjs`（扩） |
| T3 | A（builder，T2 后） | `src/App.tsx`、`src/lib/risk.ts`、`src/lib/workspace.ts`、`src/lib/diff.test.ts`、`scripts/fidelity-acceptance.mjs`（扩） |
| T4 | B（builder2，等 A 数字） | `README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/0010-table-block-reuse.md`、`docs/adr/0011-source-mode-for-reference-links.md`、`package.json` |
| T5 | B（builder2，T4 后） | `README.md`（体积段）、`docs/CHANGELOG.md`（体积行） |

- 两组零重叠：A 只碰 `src/`、`scripts/roundtrip.mjs`（T1 独占，T2/T3 不改）、生成物 `docs/roundtrip-report.md` 与 `scripts/fidelity-acceptance.mjs`；B 只碰 README/AGENTS/CHANGELOG/ADR/`package.json`。`package.json` 只归 T4；`npm test` 仍 16 文件。
- 三栏报告由 **T1 的脚本**生成（`scripts/roundtrip.mjs` 归 T1 独占），T4 只读校验；根代理在 A 完成后放行 T4。`package-lock`、最终 build、出包与 SHA 回填由根代理做。
- 报告：A 组 `docs/iteration/round-10/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-10/t*.png`。

## 本轮不做（写进下轮建议）

**06 列表间空行**：taskList 与 bulletList schema 互斥、二次往返已收敛；只写进报告与 README，不加拦截。引用式链接**富文本**保真（定义块进文档模型）、表格前后 ≥2 空行保真、KaTeX 惰性化、文件树操作、`App.tsx` 拆分同样不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 没动过的表格保存后表内字节不变（分隔行、对齐、列宽、02 型单空行）；改了单元格或行列才规范化，且不再每次弹确认。
2. frontmatter 后有空行的笔记保存不再丢那一行；含引用式链接的文档打开直接进源码模式，定义不丢，有「回到富文本编辑」。
3. roundtrip 报告给出三栏（富文本 / 源码路径 / 首次保存仍拦截），不再用一个数概括。

## 风险最高的任务

**T1**。它要建立唯一的 `serializeDocument` 并把 App 两处与报告脚本都切过去，还要处理 `Table.extend` 是否生效、多表配对、`\|` 转义与前后空行边界；漏接一处就是「报告说保真、App 仍改写」，复用签名写错则可能把改过的表格换回旧内容。缓解是 `fidelity-acceptance` 对 02 的**三处输出逐字节相同**断言、四种退让反例、三栏报告由同一脚本生成。次高是 T3：`enterSourceFor` 若只切视图不 seed，`Ctrl+S` 会写空文件，验收第 2 条（字节等于原文且非空）专抓。

## 下一轮建议主题

**口径与保真的收尾**：把 06 的列表间空行做成非阻塞提示（不进拦截），把表格前 ≥2 空行的「整块连空行复用」做成可选增强，补引用定义边界（缩进、跨行 title、短引用）；CI 加 `git diff --exit-code docs/roundtrip-report.md` 与体积闸；KaTeX 惰性化留专门一轮。
