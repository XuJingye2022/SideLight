# 第 01 轮 · 缺陷侦察（finder: bug）

侦察日期：2026-11-15。对象：v0.16.3 浏览器原型，dev server `http://localhost:5173`，CDP `http://127.0.0.1:9222`。
方法：只读代码 + 独立脚本（`.tmp/r1-currency.mjs`、`.tmp/r1-flows.mjs`、`.tmp/r1-flows2.mjs`）驱动真实界面。
未改动 `src/`、`scripts/`。

## 门禁基线

| 命令 | 结果 | 耗时 | 证据 |
| :--- | :--- | ---: | :--- |
| `npm run build` | 通过（exit 0）。`dist/assets/index-*.js` 1,087.66 kB / gzip 340.49 kB；chunk > 500 kB 警告 | 1 s | `.tmp/r1-bug-build.log` |
| `npm test` | 15 个文件，162 个断言全部通过，0 失败 | 1 s | `.tmp/r1-bug-test.log` |
| `npm run roundtrip` | 「当前应用」3 / 7 完全保真；表格、引用式链接、任务列表仍有 diff | < 1 s | `docs/roundtrip-report.md` |
| `npm run shot` | 复现 `katex after currency: 2`、`source has currency: false`，无控制台错误 | 5 s | `.tmp/r1-bug-shot.log` |
| `node scripts/acceptance.mjs` | 9 / 9 PASS（草稿恢复、查找、公式、表格、导出、frontmatter、脚注、行内 HTML、无控制台错误） | 9 s | `.tmp/r1-bug-acceptance.log` |

注：`npm run roundtrip` 会重写 `docs/roundtrip-report.md`；该文件由脚本生成，是门禁的既定副作用。

## B1 打字输入货币写法 `$5 到 $10` 被吞成公式，字符丢失且保存后不可逆

- 标题：行内公式输入规则缺少「美元符号内侧不能是空白」的判断，与载入路径的防护不一致。
- 现象与复现（已亲自复现）：
  1. 打开 `http://localhost:5173`，清空 localStorage 后刷新，光标放在正文末尾。
  2. 键盘输入 ` 价格 $5 到 $10 之间。`（一个空格开头）。
  3. 观察：正文出现 `价格  5 到 5到10 之间。`（内联公式把 `5 到` 变成 KaTeX 节点，公式里的空格被排版吃掉）。
  4. 切到「源码」：末尾是 ` 价格 $5 到$10 之间。`，已经没有 `$5 到 $10`；第二个 `$` 被挪到 `10` 前面，`10` 掉出公式，空格丢失。
- 证据：
  - `npm run shot` 输出：`katex after currency: 2`、`source has currency: false`、`editor text tail: … 价格  5 到 5到10 之间。`（`.tmp/r1-bug-shot.log`）。
  - 独立脚本：`A katex before/after: 0 1`；`A source tail: "… Ctrl + S：保存\n\n 价格 $5 到$10 之间。"`；`A source contains "$5 到 $10": false`（`.tmp/r1-bug-currency.log`）。
  - 截图：`shots/round-01/currency-typing.png`。
  - 代码位置：`src/lib/mathInput.ts:31` 的输入规则 `/\$([^$\n]+)\$$/` 只判 `latex` 非空，没有 `src/lib/math.ts:12` 的 `!/^\s/ && !/\s$/` 判断；载入路径在 `src/App.tsx:398` 调 `protectMathPairs`，打字路径没有等价防护。
  - 对照：同样的文本走载入路径（localStorage 草稿）时 `B load path katex: 0 text: "价格 $5 到 $10 之间。"`，源码原样保留。说明只坏在打字和粘贴事件缺少防护，不是解析器本身。
  - `README.md:30` 明确写「货币写法（`$5 到 $10`）不会被误判成公式」，与实际行为相反。
- 影响：写作者日常写价格、金额、区间时会静默丢字并改变语义，且用户看不到任何提示。源码模式显示的就是 `currentMarkdown()`（保存用文本，`src/App.tsx:1063`），所以 `Ctrl + S` 会把 `$5 到$10` 写进文件；按 `src/lib/math.ts:12` 的判断，重开时它会继续被当成公式（此重开一步未单独跑，标「代码路径推断」）。属数据损失，优先级最高。
- 建议方向：把 `src/lib/math.ts` 的「内侧空白」判断抽成共享函数，输入规则与粘贴规则都调用；或在输入规则 handler 里用同一谓词拒绝成对货币。为 `scripts/acceptance.mjs` 增加一条「打字输入货币不生成 KaTeX」检查，避免回归。
- 难度：S（改动集中在 `src/lib/mathInput.ts` + 一个共享谓词 + 一条测试）。

## B2 Markdown 往返仍会改写表格与引用式链接，保存即改动源文件格式

- 现象与复现（已亲自复现）：
  1. `npm run roundtrip`。
  2. 输出：`当前应用（扩展 + 保真修复）: 3/7 完全保真`；`diff 02-table.md -3 +5`、`diff 04-reference-links.md -4 +1`、`diff 06-task-list.md -0 +1`。
  3. `docs/roundtrip-report.md` 的表格 diff：`|:-----|-----:|:----:|` 被写成 `| :--- | ----: | :----:`，并在表格前后各加一个空行；引用式链接 diff：`[Tiptap][tiptap]` + 定义块被改写成 `[Tiptap](https://tiptap.dev)` 并删掉定义。
- 证据：`.tmp/r1-bug-roundtrip.log`、`docs/roundtrip-report.md`「当前应用」分节（02-table.md、04-reference-links.md）。
- 影响：打开一篇含表格或引用式链接的文档，只按一次 `Ctrl + S` 就会改写大量行。表格对齐写法与列宽是等价语义，但引用式链接的定义块被删除、语法被换成行内链接，diff 噪音大，git 历史里每个表格文档都会被重排。`README.md:42` 承认引用式链接会被改写，但表格重排未在「现在不能做什么」里写；「保存前把受影响的行摆出来」只在有 `originalText` 时触发（`src/App.tsx:1075`），下载副本路径不提示。
- 建议方向：表格序列化时保留原始对齐分隔线与列宽（或至少在 `docs/typora-gap.md` 记为已知损失）；保存前对比覆盖「无磁盘句柄」的下载路径。不要为此新增依赖。
- 难度：M（表格序列化需要 Tiptap 侧的归一化处理，引用式链接需要保真层）。

## B3 文档与产品事实不一致，会误导发布与验收

- 现象（逐条亲自核对）：
  1. `README.md:30` 说货币写法不会被误判成公式 → B1 证明为假。
  2. `README.md:66` 说 `npm test` 「共 19 个」→ 实际 15 个文件、162 个断言（`.tmp/r1-bug-test.log`）。
  3. `README.md:40` 说「批注不持久化：刷新或切换文件就没了」→ 与 `README.md:34`（草稿与批注缓存到 `.sidelight`，重开恢复批注）直接冲突；代码里 `src/App.tsx:929` 在载入时 `setAnnotations(restored)`，`src/App.tsx:959` 切换时清空。运行时恢复行为本次未验证（需要磁盘目录句柄），标「未验证」。
  4. `README.md:71` 提到的 `qa2/qa3/qa4` 脚本不存在，`scripts/` 里实际是 `qa.mjs`、`qa7`、`qa9`–`qa18`。
- 影响：发布说明与验收清单都从 README 抄，错误断言会让验收放过 B1；AGENTS.md 写的测试数量与 README 也不一致。
- 建议方向：随本轮实施一次性校正 README 的四处事实；把测试数量改为「以 `package.json` 与 `npm test` 输出为准」，不在文档里写死数字。
- 难度：S。

## 已排查但未构成缺陷（避免 planner 重复调查）

- 切换文档：有未保存改动时弹出「这篇还有没保存的改动」对话框，含取消 / 放弃改动 / 保存并切换；选「放弃改动」后切回，改动确实消失，与用户选择一致。截图 `shots/round-01/switch-dialog.png`。
- 源码模式保存：源码里改写的内容会被 `Ctrl + S` 下载，实测下载文件含 `源码里改写的新内容`，`currentMarkdown()` 的 `sourceMode` 分支（`src/App.tsx:1064`）有效。
- 公式载入路径：localStorage 草稿含 `$5 到 $10` 时载入为普通文字，KaTeX 数为 0（`shots/round-01/currency-load.png`）。
- 分析并发：`analyzing` 守卫（`src/App.tsx:429`）与切文档时 `abortRef.current?.abort()`（`src/App.tsx:954`）都在，qa-report 第 6 条已修。
- 查找替换后撤销、空文档、粘贴/拖入图片、超长文档批注定位、导出完整性：本轮未验证（时间用尽）。

## 代码优化机会（最多 3 条）

### O1 `src/App.tsx` 2074 行单组件，副作用与序列化逻辑重复

- 事实：`src/App.tsx` 2074 行 / 约 76 KB；Markdown 修复链 `repairCalloutMarkers(repairHtml(repairMath(repairFootnoteRefs(...))))` 在 `src/App.tsx:357` 与 `:1066` 各写一遍；`localStorage.setItem(DOC_KEY, JSON.stringify({ text, name, savedAt }))` 在 `:361`、`:834`、`:964` 三处重复。
- 收益：抽出 `serializeBody(editor)` 与 `writeDraft(text, name)` 两个函数后，B1 这类「载入路径与打字路径不一致」问题只需改一处；单文件降到可审查规模，减少状态闭包错误。
- 风险：大文件拆分改动面广，容易引入回归，必须配合 `npm test` + `npm run shot` + `npm run acceptance`；建议按函数抽取而非换架构。
- 难度：M。

### O2 公式与 KaTeX 全量进入首屏包，单 chunk 1.09 MB

- 事实：`npm run build` 输出 `index-*.js 1,087.66 kB`，并有 >500 kB 警告；KaTeX 字体 39 个文件共 546 KB。公式能力对所有文档都加载，但多数文档没有公式。
- 收益：把 `Mathematics` 与 KaTeX 改成动态 import（文档含 `$` 时再加载），首屏 JS 可明显下降，符合「轻量是产品底线」。
- 风险：输入规则依赖扩展同步注册，动态加载会让「打 `$x^2$`」在加载完成前失效；需保证载入文档时先判定再挂扩展，否则 B1 附近的公式行为会变。必须重跑 `npm run shot` 与 acceptance 的「公式渲染」。
- 难度：L。

### O3 批注与草稿的持久化有三套写法，边界不清

- 事实：草稿写 localStorage（`src/App.tsx:361`、`:834`、`:964`），批注写 `.sidelight/annotations`（`:929` 附近恢复），两者触发时机不同（草稿 800 ms 防抖 `:371`，批注即时）。README 第 34 与 40 行的自相矛盾正是这个边界的反映（见 B3）。
- 收益：把「文档身份 → 存储位置」收敛成一个 `storageFor(file, space)` 决策点，能直接消掉 README 的矛盾描述，也便于给批注恢复补测试。
- 风险：触及保存与恢复路径，属数据安全区，改动必须先在 `scripts/qa.mjs` 的草稿场景上回归。
- 难度：M。
