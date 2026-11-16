# 第 32 轮验收（tester，独立复验）

- 基线：`main` @ `d47d482`，工作树含本轮改动（9 个跟踪文件改动 + `docs/adr/0017` 等未跟踪）。版本 `0.32.1`，本轮不发版（`package.json` 未改，符合计划全轮约束 1）。
- 环境：dev server `http://localhost:5175`（未重启，`/src/main.tsx` 200）；CDP `9222`（`/json/version` 200）；每条 e2e 前 `node .tmp/reset.mjs 9222`。
- 复验方式：只读 `plan.md`、`git diff` 与实跑输出，**未读 `impl.md`**。

## 结论：PASS-WITH-UNVERIFIED

门禁全过（tsc / test / build / 首屏 / 52 条 keyboard / qa17），T1、T2、T3、T4-A 的验收标准逐条实测通过，T4-B 的 ADR 数字复核一致。未验项见文末，主要是「本机无法测」的宿主/macOS/真实安装包，没有一条属于实施造假或本轮引入的回归。

## 门禁（全部实跑，命令与输出摘要）

| 门禁 | 命令 | 结果 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | 无输出，exit 0 |
| 测试 | `npm test` | **21 文件 276 条**（汇总脚本按每文件 `tests N` 求和：`files=21 total=276`，0 fail） |
| 打包 | `npm run build` | exit 0，`index-CIgbljul.js` 894.16 kB / gzip 281.38 kB，`katexLoader` 258.78 kB |
| 首屏 | `node scripts/measure-first-screen.mjs` | `total raw=927947 gzip=285052 files=2 max=286000` → **PASS**，余 948 B |
| 首屏（tmp 构建） | `npx vite build --outDir .tmp/build-b` + `measure --dir .tmp/build-b` | 无 `larger than` 告警；`gzip=285052 files=2` → **PASS** |
| 快捷键 | `keyboard-acceptance.mjs http://localhost:5175` | **52/52 PASS**，exit 0；跑完 `git checkout -- shots/round-05/`（自查 0 条改动） |
| 状态栏回归锁 | `qa17.mjs http://localhost:5175` | **7/7 PASS**（含 `PASS 5 预览时状态栏只有预览 ["预览"]`），exit 0；跑完 `git checkout -- shots/mode-switch.png` |
| roundtrip | 未跑 | 本轮不改 Markdown 序列化（只改选区计数、面板段数、按键条件、vite 阈值），按计划第 4 条为可选 |

## T1 `Ctrl+Shift+P` 预览快捷键

- 静态：`src/App.tsx:3625` 条件已改为 `if (mod && !event.altKey && event.shiftKey && key === 'p')`（删掉 `!event.ctrlKey`，未改成 `!event.metaKey`；`mod` 定义在 `:3443`）。`scripts/keyboard-acceptance.mjs` 插在 `Control+Shift+3` 之后，`check(` 计数 52（基线 49 + 3）。
- 实测（keyboard-acceptance 新断言三条全 PASS）：
  - `Ctrl+Shift+P 进预览：状态栏有「预览」且正文不可编辑 ({"right":"预览","editables":["false"],"previewPanes":1,"quickOpen":0})`
  - `Ctrl+Shift+P 没被 Ctrl+P 快速打开抢走 (0)`
  - `Esc 回编辑：正文可编辑且状态栏不再有「预览」`
- 截图：`shots/round-32/t1-preview-by-key.png`（29,476 B）。
- 说明：选择器 `.quick-open` / `.status-right` / `.preview-pane` 均先在源码里核实存在（`QuickOpen.tsx:52`、`StatusBar.tsx:74`、`PreviewPane.tsx:52`），不是恒真断言。

## T2 状态栏随选区显示计数

- 静态：`SelectionState` 加必填 `words`（`App.tsx:203`）；4 处字面量全补（`:349` 初值、`:970` 载入、`:1046` 宿主载入、`:910` 回调）；`onSelectionUpdate` 里 `countText` 只调一次（`:907-910`）；`selectionWords={viewMode === 'edit' ? selection.words : 0}`（`:4859`）；`StatusBar` 在 `:52` 渲染 `.status-selection`，`selectionWords > 0` 才渲染。数字用 `toLocaleString('en-US')`，与 `wordcount.ts:62` 的 `formatStats` 同格式。
- 实测 `.tmp/e2e-r32-t2-selection.mjs`（9/9 PASS）：
  - 选中第一段 → `选区 12 字`；面板选区行 `12 字 / 14 字符 / 2 句` → 两处数字相等。
  - 折叠选区 → `.status-selection` count 0。
  - `Control+a` → `选区 19 字` = 面板选区行 `19 字`；全选大于第一段。
  - 1024×700：`.status-bar` `scrollWidth === clientWidth === 1024`，chip 仍在 → 不溢出、不换行。
  - 预览态（`Control+Shift+P`）chip 从 1 → 0，证明口径是 `viewMode === 'edit'` 三态门，不是渲染计数。
- 截图：`shots/round-32/t2-selection-chip.png`、`shots/round-32/t2-selection-chip-narrow.png`。

## T3 字数明细「段」按正文文本块计

- 静态：`wordcount.ts:96-108` 新增 `countParagraphs`（`heading`/`table` 返回 0 不下钻；`codeBlock` 等 textblock 有文本计 1；容器递归）；`App.tsx` 三处一起改：state 加可选 `paragraphs`（`:488`）、`openStatsDetail` 算值（`:3827-3841`，源码模式走 `manager.parse` + `countParagraphs`，`try/catch` 失败回传 `undefined`）、`<StatsDetail … paragraphs={statsDetail.paragraphs}>`（`:4900`）；静态锁实测 `(Select-String 'paragraphs={statsDetail.paragraphs}').Count` = **1**。`StatsDetail.tsx:87` 用 `paragraphs ?? stats.paragraphs`，`title` 三元只在 `paragraphs !== undefined` 时用新口径。
- 测试：`wordcount.test.ts` +4 条（两段无空行 = 2；4 标题 + 5 段 = 5 且表格不计；列表 3 项 = 3；2 行代码块 = 1），合计 276 条。
- 实测 `.tmp/e2e-r32-t3-paragraphs.mjs`（7/7 PASS）：夹具 4 标题 5 段；编辑模式「段」= **5**（提示「正文段落数：段落与列表项各算 1；标题、表格不计，代码块整块算 1」）；`Control+/` 进源码再开面板仍 = **5**（改前按非空行是 9）。
- 截图：`shots/round-32/t3-stats-paragraphs.png`、`shots/round-32/t3-stats-paragraphs-source.png`。

## T4-A 构建期体积护栏

- 静态：`vite.config.ts` `chunkSizeWarningLimit: 1200` → **950**；注释两处改成实测「主 chunk 894,163 B（第 32 轮实测，2026-11-17）…950…留约 56 kB 余量」；旧表述删净（`Select-String '1200|100 kB'` = 0 命中）。README `:99` 同步为「950（主 chunk 894,163 B，2026-11-17 实测）」。实测主 chunk 894,163 B（`dist/assets/index-CIgbljul.js`），第二 258,788 B（katexLoader）→ 950 不会误报。
- 实测：`npx vite build --outDir .tmp/build-b` 无 `larger than` 输出；`measure-first-screen --dir .tmp/build-b` → PASS，`files=2`；`/src/main.tsx` 仍 200（本任务未破坏 5175）。

## T4-B Mermaid ADR

- 文件 `docs/adr/0017-mermaid-lazy-loading.md` 存在，**73 行**（计划要求 ≤120），五节齐全（背景 / 决定 / 实测 / 否决的方案 / 未验 / 状态；「实测」为额外补充节）。README 索引 `0001–0017` 两处 + `:182` 决策行已补。
- 数字复核：ADR 的「全部按需 chunk 73 个 / 2,675,506 B raw」与计划 R2-P2-3 的复核值一致；`*.mjs.map` 明确排除（121 个 / 14,035,915 B，ADR 写 73 个 map 10,441,081 B 作口径说明）；主入口量的是 `dist/mermaid.core.mjs`，ADR 未出现「`mermaid.min.js` 是主 chunk」表述。
- 安装包公式基数 824,595 B + 0.329，注明了出处 `round-32/findings-ship.md:17`；三档预估：档 1 838,981 B / 档 1b 1,474,881 B / 档 2 2,355,122 B。结论栏明确写「本轮不实现 + 需产品负责人三选一」。
- `.tmp/measure-mermaid.mjs` 存在；`.tmp/mermaid-pkg/` 已按计划删除（66 MB 未留在 `.tmp`），**我无法在本轮重跑原脚本复现 raw 数**（包已删）→ 见未验项。`package.json` / `package-lock.json` 无改动（`git status` 未列出）。

## 回归

- `keyboard-acceptance.mjs`：52/52（T1 的 3 条新断言之外，链接、公式、标题、源码、表格、大纲、保存失败提示等全过）。
- `qa17.mjs`：7/7，其中「预览时状态栏只有预览」证明新 chip 不会在预览态多出。
- **`qa16.mjs` / `qa10.mjs` 失败（exit 1），判定为脚本过期、非本轮回归**：
  - `qa16.mjs:81` `waiting for locator('.editor a')` 超时 30 s——链接插入早已从 `window.prompt` 改为行内浮层、编辑器容器不再是 `.editor`（现为 `.doc-column .ProseMirror`），与本轮改动无关。
  - `qa10.mjs:23` `waiting for locator('.doc-column .ProseMirror p').nth(2)` 超时——首启从第 28 轮起已是空白 `未命名.md`，脚本仍按演示文档取第 3 段。
  - 两者都在本轮 `git diff` 未触及的文件里，失败断言的依赖物（演示文档、`.editor` 类名）在本轮之前就已不存在；CHANGELOG 已按「已知测试脚本过期（非本轮引入）」记录。计划把这两条列为 T2 门禁是计划侧判断偏差，不是实施缺陷 → 不判 FAIL，但计划门禁「qa16/qa10 应 PASS」未达成，如实记录。

## UNVERIFIED

1. Windows 宿主里实按 `Ctrl+Shift+P`——本机只浏览器实测（宿主已关浏览器加速键，静态推断可到达页面，未实按）。
2. macOS `Cmd+Shift+P`——本机 Windows，无法运行。
3. 全选 1 MB 文档时的选区计数耗时（`textBetween` + 一次 `countText`）——未做性能实测。
4. 源码模式 Markdown 解析失败后的回退路径（`paragraphs: undefined` → 面板回到旧口径文案）——未构造非法源码复现该分支。
5. mermaid 真装进 `dist` 后重打 Windows 安装包的实际字节——本轮只在包外量 npm 包；且 `.tmp/mermaid-pkg/` 已删，ADR 的 raw/gzip 表本轮无法重跑复现，只核对了与计划复核值一致的聚合数（73 chunk / 2,675,506 B）。
6. `qa17` 在 WebView2 宿主里跑——本轮只浏览器。
7. `docs/typora-gap.md` 与 `STATE.md` 的下一轮建议未由本轮验收改动（由根代理收尾）。

## 复验命令（下轮可直接抄）

```powershell
npx tsc --noEmit; npm test; npm run build; node scripts/measure-first-screen.mjs
node .tmp/reset.mjs 9222
$env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/keyboard-acceptance.mjs http://localhost:5175
git checkout -- shots/round-05/
node .tmp/reset.mjs 9222; node .tmp/e2e-r32-t2-selection.mjs
node .tmp/reset.mjs 9222; node .tmp/e2e-r32-t3-paragraphs.mjs
node .tmp/reset.mjs 9222; node scripts/qa17.mjs http://localhost:5175; git checkout -- shots/mode-switch.png
```
