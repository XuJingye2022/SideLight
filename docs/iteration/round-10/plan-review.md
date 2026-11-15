# 第 10 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-10/plan.md`（基线 `24bb46a`，v0.22.0）。
审查方式：读计划、三份 findings、`src/lib/risk.ts`、`src/App.tsx` 的 `loadIntoEditor`/`applyHostPayload`/`currentMarkdown`/`prepareSave`、`src/lib/frontmatter.ts`、`scripts/roundtrip.mjs`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（`Table.extend` 与三份序列化管线只接一处，会出现「报告保真、App 仍改写」）、H3（T3 默认源码漏 seed 会写空文件）、H4（三栏报告没有可改脚本的归属，T4 无法交付）是 blocker；H2/H5/H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:12` 的兜底只写「改为在 `serializeBody` 出口裁一次」；但 App 有 `serializeBody:148`、`currentMarkdown:1780` 两份，`scripts/roundtrip.mjs:28` 第三份。若 `Table.extend` 不影响 `MarkdownManager`（findings B1 已标未验证），只修 `serializeBody` 会让 `currentMarkdown`/报告仍带前导换行：`npm run roundtrip` 说 02 保真，App 保存仍改写。 | `plan.md:12-14`；`findings-bug.md:80-86`（三份管线/`Table.extend` 未验）；`App.tsx:148,1780`；`scripts/roundtrip.mjs:28` | 把「Table.extend 裁剪 + reuseTables」放进一个共享 `serializeDocument`，三处都调用；或 `Table.extend` 之外在 `serializeBody`、`currentMarkdown`、`throughApp` 各接一次并加断言；验收必须同时比较三处输出字节 | T1 |
| H2 | major | T2 的 `leadingNewlines` 需要 `joinFrontmatter(frontmatter, body, leadingNewlines)`；计划 `:36` 写「6 处」但实际列了 7 个调用点（App 6 + roundtrip 1），计数与清单不符。`frontmatter.test.ts:46/50/55/60` 的 4 条 `deepEqual` 会因 `SplitResult` 新字段红，另有 `:34/:42/:92` 三条 `joinFrontmatter(..., ..., ...)` 旧签名断言没提到。`0/1/2/3` 四例中 3 的实际输出是 2（findings B3），只测 join 不够，必须测 split→join 往返。 | `plan.md:34-36`；`findings-bug.md:149-186`（实测 0/1/2/3，3→2）；`src/lib/frontmatter.ts`；`src/lib/frontmatter.test.ts:34/42/46/50/55/60/92` | 先 `grep -n joinFrontmatter` 全量核对 7 个调用点并改计数；`frontmatter.test.ts` 加「split 后 join 逐字节等于原文」的 0/1/2/3 四例（不是只测 join 参数）；`body` 为空断言；三条旧 `equal` 断言确认默认第三参不改变行为 | T2 |
| H3 | blocker | T3 默认进源码时如果只 `setViewMode('source')` 而没有同时 `setSourceText(text)` + `sourceBaselineRef.current = text`，`currentMarkdown()` 的源码分支返回空串，`Ctrl+S` 会写空文件；findings B2 明确把 seed 列为必做。`applyHostPayload` 当前完全不设 `viewMode`，最容易漏。 | `plan.md:54`；`findings-bug.md:133-145`（seed 理由）；`App.tsx` 的 `currentMarkdown` 源码分支与 `applyHostPayload` | `loadIntoEditor` 与 `applyHostPayload` 都抽一个 `enterSourceFor(text)`：`setSourceText(text)`、`sourceBaselineRef.current = text`、`setViewMode('source')`；验收第 2 条按「源码 `Ctrl+S` 字节等于原文」写，不只看 `viewMode` | T3 |
| H4 | blocker | T4 要求报告呈三栏（富文本 / 源码路径 / 首次保存仍拦截），但 `docs/roundtrip-report.md` 由 A 的 `scripts/roundtrip.mjs` 生成，T4 文件表不含该脚本，计划 `:73` 又说「若结论段要调，改脚本归 T1」；T1/T2 只接 `throughApp`，T3 文件表没有 `scripts/roundtrip.mjs`，**没有任何任务负责生成「源码路径」列**。T4 按现计划无法通过 `:83` 的三栏表头验收。 | `plan.md:73,83,113-115`；`scripts/roundtrip.mjs:28`（throughApp） | 把 `scripts/roundtrip.mjs` 显式归给 T1 或 T3，并在任务里写「输出三栏：rich/source/firstSaveBlocked」；T4 只读；或者允许 T4 改脚本并把脚本加入 T4 独占文件，避免 A/B 双写 | T4/T3/T1 |
| H5 | major | T1 的 `reuseTables` 只替换「表头+分隔+数据行」整块，表格**前后**的空行仍由 doc 级 `\n\n` 决定；验收只覆盖 02 的 1 个空行，用户新增 2 个空行/删掉空行会被规范化。另外签名按出现顺序配对多表，但图/引用/HTML 单元格文本相同的情况没有明确「按文档顺序第 n 个命中」；表格里转义 `\|` 的切分也要注明。 | `plan.md:13,21`；`findings-bug.md:61-76`（整块复用原型、退让表）；`risk.ts:51-58`（splitCells 不处理转义 `\|`） | `reuseTables` 把表格块连同**原文紧邻的空行**一起记为块，或明确只保证「表格行内字节」、不承诺前后空行，并改 Demo/README；多表按出现序号配对；`splitCells` 支持 `\|`；验收加「前后各 2 个空行」「同名多表」两例 | T1 |
| H6 | major | T4 的 README 五处改写与 T5 的体积段都要改 `README.md`/`CHANGELOG.md`；T4 依赖 A 的实际数字，T5 又依赖 T4 的文案，计划虽写 T4 等 A、T5 在 T4 后，但验收没有「数字来源」断言：若 A 的 `npm run roundtrip` 仍是旧口径，T4 的三栏表头与 README 数字会先写死。体积软线 JS ≤1,153,000 / 安装包 ≤820,000 与当前 1,133,427/809,542 的增量 3–8KB 对得上，但 T5 只跑 `.tmp/build-b`，安装包实际由根代理出包，二者可能差 1–2KB。 | `plan.md:77-83,93-104`；`findings-ship.md:124-168`（体积预算） | T4 验收加「三栏表头 + 数字均来自 A 的 report/test 输出」；T5 的 820,000 标「预计」，实际安装包由根代理回填，差 >2KB 写原因不抬硬线；README/CHANGELOG 数字只留一处 | T4/T5 |

---

## H1（blocker）`Table.extend` 与三份管线

findings B1 的实测结论是：

- `Table.extend({ renderMarkdown })` 的原型能让 02 的空行增量 +2→0；
- 但 **未验证** `Table.extend` 是否影响 `MarkdownManager` 的注册顺序（`findings-bug.md:86,249`）；
- App 有两份序列化：`serializeBody`（`App.tsx:148`）和 `currentMarkdown`（`:1780`），`scripts/roundtrip.mjs:28` 是第三份。

计划 T1 `:12` 的兜底只写「改为在 `serializeBody` 出口裁一次」。如果 `Table.extend` 不生效，`currentMarkdown` 和 `throughApp` 不会裁，结果就是：

- report 的 02 说保真（T1 改了 `throughApp`）；
- App 保存仍多空行（`currentMarkdown` 未裁）；
- 正是「报告说保真、App 仍改写」。

**修**：把「表格首尾裁剪 + reuseTables」放进一个纯函数 `serializeDocument(editor, { frontmatter, footnotes, original })`，`serializeBody`、`currentMarkdown`、`throughApp` 三处都调用；或者三处分别接并在 `fidelity-acceptance` 断言三者对 02 的输出逐字节相同。`Table.extend` 只作为第一道，不作为唯一实现。

## H2（major）frontmatter 的 `leadingNewlines`

findings B3 的实测：

| 原文空行 | 输出空行 |
| ---: | ---: |
| 0 | 0 |
| 1 | 0（丢） |
| 2 | 2 |
| 3 | 2（少 1） |

计划的 `joinFrontmatter(frontmatter, body, leadingNewlines)` 补 `max(0, leadingNewlines − current)` 可以修 1 和 3；但：

- 现有调用点不止计划列的 6 处；`grep -n joinFrontmatter src scripts` 应全量列一遍，`App.tsx:680` 草稿、`serializeBody` 等漏一处就出现「报告保真、App 仍丢」。
- `frontmatter.test.ts:46/50/55/60` 的 `deepEqual` 会因新字段/签名红；计划说补字段，但更稳的是按 findings B3 `:180` 的建议：**把 `leadingNewlines(text)` 做成独立函数**，`SplitResult` 不变，现有 4 条测试零改动；`joinFrontmatter` 只加可选第三参。
- 只测 `join(0/1/2/3)` 不够，要测 `split → join` 往返；3 的实际输出是 2，不测往返会漏。

## H3（blocker）T3 的 seed

findings B2 `:133-136` 写得很清楚：

- `currentMarkdown()` 在源码模式直接返回 `sourceText`；
- 只切 `viewMode` 不 seed，`sourceText` 是空串，`Ctrl+S` 写空文件；
- `sourceBaselineRef` 不 seed，`:1367` 的源码脏检查与 `:1370` 的草稿写入拿空串当基准。

计划 `:54` 已写「同时 seed」，但需要落成代码结构，否则 `loadIntoEditor` 和 `applyHostPayload` 两处容易只改一处：

```ts
const enterSourceFor = (text: string) => {
  setSourceText(text)
  sourceBaselineRef.current = text
  setViewMode('source')
}
```

验收第 2 条要断言「源码 `Ctrl+S` 写出的字节逐字节等于原文」，不能只断言 `viewMode === 'source'`。`applyHostPayload` 当前不设 `viewMode`，是本轮最容易漏的入口。

## H4（blocker）三栏报告没有写者

T4 `:71` 要报告三栏，`:73` 说报告由 A 的脚本生成、T4 只读、要调口径就改脚本归 T1；但：

- T1/T2 的 `scripts/roundtrip.mjs` 只接 `throughApp` 的表格/前导空行；
- T3 文件表没有 `scripts/roundtrip.mjs`，无法输出「源码路径」列；
- T4 文件表没有 `scripts/roundtrip.mjs`，又被告知不要手改生成物。

于是 `docs/roundtrip-report.md` 不可能同时有三栏。修：把 `scripts/roundtrip.mjs` 明确归给 T1 或 T3，任务里写死输出 `{ rich, source, firstSaveBlocked }` 三栏；T4 只读并校验表头；或者把脚本划给 T4 独占，A 不再改。不要让 T4 依赖一个没人负责的列。

## H5（major）reuseTables 的边界

- **前后空行**：`reuseTables` 只替换表格块（表头+分隔+数据行）；表格前后的空行由 doc 级 `\n\n` 决定。02 只有 1 个空行，正好；用户新增 2 个空行/删掉空行会被规范化。计划 `:21` 的验收只覆盖 02；要么把「表格块 + 紧邻空行」一起复用，要么在 README/Demo 改成「表格行内字节保留，表格前后空行仍规范化」。
- **多表**：计划 `:16` 说「同表头多表按出现顺序配对」；`reuseTables` 必须用出现序号，不能只用签名 Map，否则第二个同表会配到第一个原文。
- **转义 `\|`**：`splitCells` 现在 `.split('|')`，单元格里转义的 `\|` 会被切成两列，签名不稳；表格工具条生成的单元格也可能有 `|`。至少加一条 `\|` 用例，或把签名改为「按行原文去空白」而不是拆单元格。
- **代码围栏**：`fenceMap` 排除方向对；补「围栏里的假表格不记」单测（计划 `:16` 已列）。

## H6（major）T4/T5 的数字来源与体积

- T4 的 README 五处改写在 A 结果之前无法写实；计划 `:88` 说等 A，但验收 `:82-84` 没有「数字来自 A 的 report/test 输出」断言。修：T4 验收加「README 的三栏数字必须等于 `docs/roundtrip-report.md` 表头/数字」。
- T5 的 `README`/`CHANGELOG` 体积段与 T4 的 README 五处同一文件、同一人串行，零重叠成立；但 T5 只跑 `.tmp/build-b`，实际安装包由根代理 `installer.ps1` 出包，`820,000` 只能是预计线。写「预计 820,000；实际以 installer 输出为准，差 >2KB 记原因，不抬 850,000 硬线」。
- `1,153,000` JS 软线相对当前 1,133,427 是 +20KB，T1–T3 约 300–500 行新增，合理；保留。

## 逐项核对记录

### T1
- `tableReuse` 的签名（表头/列数/对齐/全部单元格）方向对；「改一个单元格再改回原值」签名不变 → 复用原文，内容一致，符合预期。
- `Table.extend` 对 `MarkdownManager` 是否生效未验证（H1）；三份管线只接一处会报告/App 分叉。
- `table-separator` 降级 `blocking:false`、基线在复用文本上算，方向对；改值/加列/删行/改对齐不再弹框，符合 findings B5。
- 前后空行与多表/转义 `|` 的边界未覆盖（H5）。

### T2
- `leadingNewlines` 0/1/2/3 的补法正确；`body` 为空不补的边界对。
- 调用点与 `deepEqual` 是主要风险（H2）；建议独立 `leadingNewlines(text)` 避免改 `SplitResult`。
- `applyHostPayload`/草稿/示例/另存为路径要逐个列进 grep 清单（H2）。

### T3
- `hasReferenceDefinitions` 复用 `REF_DEFINITION` + `fenceMap`、代码围栏排除，方向对。
- 两个入口 seed `sourceText`/`sourceBaselineRef` 是必须（H3）；`applyHostPayload` 当前不设 `viewMode`，最易漏。
- dirty 时横幅确认、`openSourceOriginal` 不静默覆盖，方向对；demo 文案改法对。
- 验收第 4 条「切回富文本首次保存仍拦」与第 5 条「源码路径保真」分开记，方向对；但报告三栏没有写者（H4）。

### T4
- 三栏口径、README 五处、ADR-0010/0011、0.23.0 的改法方向对。
- **报告由 A 生成但三栏没有脚本归属**（H4）；T4 只读的约定不能兑现。
- README 的「没动过的表格原样写回 / 改过不弹确认」与 T1 的 `blocking:false` 一致；不要写成「表格永远保真」。

### T5
- `.tmp/build-b` 称重、JS/安装包软线、`dist` 字体不变，方向对；当前 1,133,427/809,542 与 1,153,000/820,000 的余量合理。
- 实际安装包由根代理出包，T5 只能写预计；验收要标「预计」并回填实测（H6）。

### 通用
- 文件归属：A T1/T2/T3 串行改 `src/`、`scripts/roundtrip.mjs`、生成物与验收脚本；B T4/T5 串行改 README/AGENTS/CHANGELOG/ADR/package；零并发重叠成立。三栏脚本归属是 H4。
- 构建纪律：A `npx vite build --outDir .tmp/build-a`，B `.tmp/build-b`；最终 build/出包由根代理；成立。
- 可独立复现：T1/T2/T3 的 `fidelity-acceptance` 与 `roundtrip` 可跑；`Table.extend` 真实编辑器路径、源码宿主写回、表格改后保存门仍需 tester 复跑。

## 做对的地方（别改过头）

1. T1 用「签名命中才整块复用、其余退让」而不是逐字段拼，方向正确；`table-separator` 降级为不拦保存，正是 B5 的修法。
2. T3 的「只按 definition 行、只在载入、草稿/新建/示例不进」边界清楚，且明确 seed 两个状态，能防「写空文件」；保留。
3. T4 的三栏口径与「不许混算」是对的；只需把脚本归属补进任务，不要把三栏退回单个数。

---

### 附：本次审查证据

- `App.tsx:148`（`serializeBody`）、`:1780`（`currentMarkdown`）；`scripts/roundtrip.mjs:28`（`throughApp`）。
- `findings-bug.md:80-86`（`Table.extend` 未验）、`:149-186`（0/1/2/3 空行）、`:133-145`（seed 必做）。
- `src/lib/risk.ts:254-309`（baseline/active）；`src/lib/risk.ts:34`（`fenceMap` 当前未导出，T1/T3 需导出）。
- `plan.md:73,83,113-115`（三栏报告归属）。
- 未改产品文件、未 commit；未生成新截图。
