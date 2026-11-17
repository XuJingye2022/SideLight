# 第 50 轮计划审查（critic，**revision 2 复审**）

- 审查对象：`docs/iteration/round-50/plan.md` **revision 2**（T1 脚注续行 + 导出差异门 / T2 全部替换按文本节点批处理 / T3 5 条 CSS 与点击区）
- 轮前 `startSha=6ae9be39ee5007da2ebcdffd636da21675dc6694`（`git rev-parse HEAD` 同值）；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-50/`、`shots/round-50/`，**产品代码 0 改动**
- 只读手段：`read` 逐文件核对 + Node 探针。新写 `.tmp/critic-r50-r2-fnprobe.mjs`（导入真实 `src/lib/footnotes.ts` 与 `src/lib/export.ts`，按 plan.md §T1 步骤 1 逐字复刻新实现，15 组判据 **15/15 PASS**）；复跑 planner 的 `.tmp/rev-r50-fnprobe.mjs`（**9/9 PASS**，与它自报一致）
- **未连 CDP、未启动浏览器、未重启 dev server（5175 未动）、未 push、未碰 `release/`、未改产品代码**
- 上一版（critic 首审，REVISE：1×P1 + 5×P2）全文保留在 `docs/iteration/round-50/plan-review-r1.md`
- 结论：**REVISE**（**1×P1 + 4×P2**）。上一版 6 条**全部真的改掉了**（R50-1/R50-2 实跑复验，R50-3…R50-6 实读核对）；本轮 5 条都是**修订自身引入或修订没覆盖到**的：1 条门槛算错（R50-7，必须改）、3 条断言/指令漏洞、1 条预算。方案骨架、文件、行号、API 本轮全部复核为真，不需要重写。

## 0. 上一版 6 条的处置核对（逐条，都实际打开文件/实跑）

| 编号 | 修订落点 | 我的核对（本轮实测） | 结论 |
| :--- | :--- | :--- | :--- |
| **R50-1 ①** 门槛放宽 4 倍 + 测错对象 | `plan.md:309-315` | 指标改成 `dispatch` 数组里 `steps > 0` 那一条：1 MB **≤2,000 ms**（`findings-code.md:105` 原口径，逐字一致）、100 KB ≤205 ms；`clickReturnMs` / `longtasks` 在 `:312` 明写「只并列打印、不作门槛」；`:313` 保留 2,000–4,000 ms 条件项与「不许改数字」。**`steps` 字段可依据**：`.tmp/e2e-r48-code-replaceall.mjs:70` 记的就是 `{ ms, steps: tr.steps.length }`，`perf-round48-replace.json` 里 1 MB 那条是 `{ms:51802, steps:39936}`、100 KB 是 `{ms:769.1, steps:4096}`，`steps > 0` 可筛 | **已修**（但 100 KB 的 205 是新错，见 R50-7） |
| **R50-1 ②** 机制写错 | `plan.md:217-220`、`:4` | 「DOM 同步做了 39 遍」已删，`:220` 明写「`view.dispatch` 本身只在事务落地后同步一次 DOM，不是 39 遍」，换成 ① 39,936 个 `ReplaceStep` 逐个落 doc、② 查找装饰映射。实读 `src/lib/decorations.ts:15-22`（`apply` 里 `previous.map(transaction.mapping, transaction.doc)`）与 `:68-76`（`renderFind` 每个命中一个 `Decoration.inline`）→ 两条机制成立；`Mapping.map` 逐步循环，装饰数×步数成立 | **已修** |
| **R50-1 ③** 条件项的对照读数 | `plan.md:313`、`:4` | 写清「不要改 `plugin.spec.state.apply`」并给出 `FieldDesc` 依据：实读 `node_modules/prosemirror-state/dist/index.js:692-698`（`bind(desc.apply, self)`）与 `:731-732`（`new FieldDesc(plugin.key, plugin.spec.state, plugin)`）→ 构造时已绑定，计划说法对；清装饰路径（`plugin.spec.key` + 空 `DecorationSet`）机制上可执行，但取 key 的写法有坑，见 R50-11 | **已修（留一个执行坑）** |
| **R50-2** F1 没修完 | `plan.md:84-99`、`:110`、`:120` | 新循环对空行 `continue`，`current` 不置空；`:110` 措辞已改成「判据与 `footnotes.ts:3` 同一套，**块内空行不结束当前条**」。**实测**（`.tmp/critic-r50-r2-fnprobe.mjs`）：`renderFootnotes('[^1]: 甲\n\n    乙')` → `甲<br>乙`、`<li>` 1；真实链路 `extractFootnotes('正文[^1]\n\n[^1]: 第一行定义\n\n    续行接着写\n').footnotes` = `[^1]: 第一行定义\n\n    续行接着写\n` → `<li>第一行定义<br>续行接着写</li>`；无空行续行、tab 续行、CRLF、多行顺序、引用定义隔离、既有两条用例、转义顺序全部同结论（15/15） | **已修（真修，不是只改文字）** |
| **R50-3** 文档基线 | `plan.md:227`、`:429` | T2 §改动 4 列出 `README.md:133/171`、`AGENTS.md:39/72` 四处并要求「按 `npm test` 实际输出回填、不许先写预计值」；实读四行确实是「32 个文件、425 条断言」「32 个测试文件」「第 49 轮记 32 个文件、425 条」「测试 32 个文件 425 条」 | **已修** |
| **R50-4** T2 必过断言没有脚本步骤 | `plan.md:288-296`、`:439`、`:341-348` | 步骤 5 列了改前基线 `docChars0/侧灯0/灯0`、`Ctrl+Z` 等 `docChars` 回位、`cross.md`、`mark.md`、批注脚本（`.tmp/e2e-r36-fix-ann.mjs:78/:95` 两个 `shots/round-36/` 路径实读存在，`shots/round-36/impl-ann-after-*.png` 也在）；T2 预算 13→16 min，T3 表只剩 5 条（U1/U2/U6/U7/U9，U3 已移入 §5） | **已修** |
| **R50-5** 导出提示借保存文案 + 没有关闭入口 | `plan.md:140`、`:150-152`、`:192` | 文案改成 `lossLabels(losses, true)`，`risk.ts:385-394` 只加可选参数；`action: { label: '知道了', onClick: () => setNotice(null) }`，实读 `App.tsx:218`（`Notice.action`）与 `:5209-5215`（`.toast-action` 渲染按钮）→ 现成路径；`:192` 已改成「`Esc` **不**清提示」，实读 `:3629-3698` 的 Escape 分支确实没有 `setNotice(null)`，`.toast-close` 只在 `kind === 'error'` 时渲染（`:5221-5225`）。另核 `show()`（`:395`）= `setNotice({text, kind:'info'})`，会替换 persist 提示 → `fn-end` 那条「没有 `.toast-action`」可成立 | **已修** |
| **R50-6** 角色文件旧体积线 | `.tmp/iteration/roles/planner.md:28` | 实读已是「内部 ≤310,000 B / 硬线 ≤320,000 B」，并注明旧 286,000 作废 | **已修** |

### 0.1 R50-2 的复跑读数（可直接引用）

```
node --experimental-strip-types .tmp/critic-r50-r2-fnprobe.mjs  → ## CRITIC PROBE PASS（15 组）
node --experimental-strip-types .tmp/rev-r50-fnprobe.mjs        → ## PROBE PASS（9 组）
OLD: <li>甲</li>                      （今天 src/lib/export.ts:33-45）
NEW: <li>甲<br>乙</li>                （plan.md §T1 步骤 1 的实现，输入 '[^1]: 甲\n\n    乙'）
真实链路 NEW: <li>第一行定义<br>续行接着写</li>
```

另记一条**行为变化**（不是缺陷，但计划文字与今天不一致）：`renderFootnotes('[^1]:\n    乙')`
今天输出 `''`，新实现输出 `<li>乙</li>`。计划 `plan.md:112` 写「空定义的条目……整条不出 `<li>`（与今天一致）」——只有「`[^1]:` 后面没有任何续行」时才一致；带续行的空定义会从「整条消失」变成「渲染出续行内容」。这更正确，建议把那句改成「完全空的 `[^1]:` 不出 `<li>`」。

## 1. 本轮新发现（按严重度）

### R50-7（**P1**）100 KB 档的 `≤205 ms` 低于修后的固定成本，几乎必然假红；门槛算法与计划自己的机制分析矛盾

- `plan.md:311`（及 `:4`）把 100 KB 门槛定成 **205 ms**，算法是「2,000 ms ÷ 39,936 命中 × 4,096 命中」。这个折算假设成本 ∝ 命中数，但**修后两档的固定成本完全相同**：两档文档都是 **1,024 段**（`.tmp/e2e-r48-code-replaceall.mjs:44-47` 两档都是 `paras=1024`），分组后步数都 ≈1,024，`view.dispatch` 里都要重建/同步这 1,024 段的 DOM；两档的差别只剩「装饰数 × 步数」（4,096 vs 39,936）。
- 用计划自己引用的基线（`.tmp/perf-round48-replace.json`）反推：100 KB 改前 `dispatch 769.1 ms / 4,096 步`，1 MB `51,802 ms / 39,936 步`。把「每个装饰映射过每一步」的单价记作 k，两档差值 51,032.9 ms 对应 `39,936² − 4,096² = 1.578e9` 个（装饰×步）对 → **k ≈ 32.3 ns/对**。这一步假设两档非映射部分相同；实际上 1 MB 的文本更长，它的非映射只会更大 → 真实 k 更小、修后 100 KB 只会更大，所以下面的估算是**对计划偏宽容**的。于是：
  - 100 KB 改前的映射成本 ≈ 4,096×4,096×32.3 ns ≈ **542 ms**，非映射部分（1,024 段 DOM 同步 + 步的 transform）≈ **227 ms**；
  - 修后 100 KB：映射 4,096×1,024×32.3 ns ≈ **135 ms**，非映射仍 ≈ **220 ms** → 合计 **≈ 340–360 ms**，是 205 ms 的 1.6–1.8 倍。
  - 即使换成最有利于计划的口径（假设 769 ms 全部按步数线性、映射免费），修后也只有 `769 × 1,024/4,096 ≈ 192 ms`——只剩 6% 余量。无论用哪个模型，205 ms 都没有安全垫。
  - 同一条推算也说明 **1 MB 修后 ≈ 1.5–1.6 s**（映射 39,936×1,024×32.3 ns ≈ 1.32 s + 非映射 ≈ 0.25 s），距 2,000 ms 只有约 25% 余量 → `:313` 的 2,000–4,000 ms 条件项**很可能被触发**，这本身没问题，但要按它的要求把「清装饰对照 + ①② 各占多少」写全（现在缺取 key 的正确写法，见 R50-11）。
- 后果：`:314` 写着「达不到还是不许改门槛数字或删断言」。100 KB 那条大概率红，执行者只能写「未达门槛」，P1 任务无法收口——而红的原因不是方案错，是门槛算错。
- 同表另有一处转录错误：`plan.md:212` 的 100 KB `clickReturnMs` 写 **769.8**，`.tmp/perf-round48-replace.json` 实为 **789.8**（769.1 是 `dispatch`）。该表自称「文件在本仓库、可复核」，会被人拿去对照。
- **修法**：① 100 KB 门槛改回 **≤400 ms**（r1 的原建议），并在 `:311` 写清「两档剩余成本的固定部分相同（1,024 段重建），不能按命中数线性折算」；1 MB 的 ≤2,000 ms 与 2,000–4,000 ms 条件项**原样不动**。② `:212` 的 769.8 改成 789.8。③ 不改「不许改数字」这条纪律本身。

### R50-8（**P2**）分组路径没写「用 `applyReplacements` 算 `nextText`」，3 条单测可能测的是死代码

- `plan.md:238-255` 定义纯函数 `applyReplacements(text, ranges, replacement)` 并给 3 条单测（多区间/删除/变长+相邻）；但 `plan.md:261` 只说「新文本为空 → `transaction.delete`；否则 `replaceWith(from, to, schema.text(nextText, node.marks))`」，**`nextText` 从哪来一个字没写**；步骤 4 的骨架（`:265-285`）也只到 `groups` 为止。
- 如果执行者在分组里手写下标算术（`node.textContent.slice(...)` 拼），`applyReplacements` 就没人调用：`tsconfig.json` 没有 `noUnusedLocals`（实读，只有 `strict`），`npm run build` 不会红，于是 3 条单测测的是死代码，真实路径（相邻区间、替换词变长后下标漂移）没有任何测试碰到。
- **修法**：在 `:261` 补一句「`nextText = applyReplacements(node.textContent, local, replacement)`（`local` 是节点内相对坐标）」；`:255` 的单测清单后补「分组路径必须调用它，不许另写一份下标算术」；`git diff` 静态验收里加一条 `grep -n 'applyReplacements(' src/App.tsx` 非 0 命中。

### R50-9（**P2**）U6 的「左侧 2 px」修法没有任何断言能测到：`rect.x` 是空断言

- `findings-ui.md:108-109` 实测：`.editor-placeholder` 矩形 `[397,136,576,21]`、正文首行 `p` 矩形 `[397,136,576,33]`——**两元素 `rect.x` 都是 397、`rect.y` 都是 136**。2 px 是 `.editor-placeholder { padding: 0 2px }`（`styles.css:285`）造成的**文本**起点差，6 px 是行盒高差造成的基线差，都不是元素 rect 的差。
- `plan.md:386` 的验收却是「`rect.x` 差 ≤ 0.5 px、`rect.y` 差 ≤ 0.5 px」：这两条**改前就已经满足**，`padding: 0` 改与不改都绿。纵向的修复由「行盒高 33.15 ±0.5」覆盖，横向的 2 px 则完全没有护栏——而横向 2 px 正是 U6 本轮明确要修的一半。
- **修法**：把 `rect.x` 那条换成 (a) `getComputedStyle('.editor-placeholder').paddingLeft === '0px'`，或 (b) 用 `Range` 取占位符文字起点与键入后首字起点，差 ≤0.5 px；`rect.y` 保留（无害），`fontSize`/`fontFamily`/行盒高三条保留。

### R50-10（**P2**）T1 的 10 min 没随修订上调，35 min 总预算零余量

- `plan.md:438` 仍给 T1 **10 min**，但修订给 T1 加了活：`lossLabels(…, true)` 口径（`risk.ts`）、导出提示的 `action`、E2E 多 3 条断言（不含 `保存后`、等 6.5 s 仍在、点 `知道了` 关掉）。T1 现在包含：`renderFootnotes` 重写（约 20 行）+ 4 条单测 + `risk.ts` 参数 + `App.tsx` 差异门/依赖数组/注释 + 一个约 90 行的 E2E（4 篇种子、源码/预览切换、HTML 与 Markdown 两次导出、6 组断言、2 张截图）+ 3 份文档 + 4 处计数回填。按 r1 给 T2 的同一把尺子（脚本工作另算），T1 至少要 12–13 min。
- 总额 35 min 已无余量（T1 10 + T2 16 + T3 3 + 门禁 6），而 `:444` 的砍单顺序只砍 T3 的 3 min——T1/T2 又不许砍（`:444-445`）。T1 一超时，被挤掉的是门禁与 `impl.md`（`:448` 的 28 min 兜底也只保住「跑完门禁」）。
- **修法**：T1 调到 12–13 min；T3 再砍 1 条（只留 U7 的 1 行 CSS + `aria-label`，U1/U2/U6/U9 一起移入 §5），或允许 T3 整项砍掉并写进 §7「砍掉不算未完成」；两者取一即可，别把 T1 压在 10 min。

### R50-11（**P2**）条件项「清查找装饰」取插件 key 的写法有坑，会静默测不出东西

- `plan.md:313`（与 `:4`）说「`plugin.spec.key` 取 `sidelightFind` 的 PluginKey」。实读 `node_modules/prosemirror-state/dist/index.js:990-991`：`PluginKey.key = createKey(name)`，`:973-979` 的 `createKey` 会加 `$` 后缀，`renderFind` 用的就是 `new PluginKey('sidelightFind')`（`src/lib/decorations.ts:10`）→ 实际值是 **`sidelightFind$`**；`:966` 的 `Plugin.key = spec.key.key` 也是这个带后缀的串。按 `p.spec.key?.key === 'sidelightFind'` 去找会 **0 命中**，`tr.setMeta(undefined, …)` 静默无效 → 两次读数量出来一样，`impl.md` 会写成「装饰不是瓶颈」，而这正是 2,000–4,000 ms 分支唯一需要的归因。
- **修法**：写成 `const p = state.plugins.find((x) => x.spec.key?.key?.startsWith('sidelightFind'))`，并先断言 `p` 非空（拿不到就记 UNVERIFIED，不要写「装饰不是瓶颈」）；`DecorationSet.empty` 用计划给的 `Object.getPrototypeOf(decoSet).constructor.empty` 取法仍可用。

## 2. 本轮复核为真的部分（执行者不用再查）

| 项 | 核对结果 |
| :--- | :--- |
| T1 导出表达式与保存门同源 | 实读 `App.tsx:2857`（`normalizeForBaseline(currentMarkdown(), originalText)`）与 `:2947`（`activeLosses(originalText, normalized, baselineLossesRef.current)`）；计划 `:132` 的写法等价；`saveBlob` 签名 `(name, content, type)`（`:2607`）；`activeLosses`/`lossLabels`/`normalizeForBaseline` 都是模块级 import（`:66`、`:69`），进依赖只需 `originalText` |
| T1 调用点 | `renderFootnotes` 两处：`src/components/PreviewPane.tsx:62`、`src/lib/export.ts:187`；`extractFootnotes` 的 `footnotes` 原样切片（`src/lib/footnotes.ts:70`）；既有单测 `export.test.ts:74-79`、`:81-83` 与计划引用一致，新增 4 条不冲突（探针已跑过这两条输入的输入形态） |
| T1 提示关闭路径 | `Notice.action`（`:218`）→ `.toast-action`（`:5209-5215`）；`persist` 跳过 6 s 计时器（`:1891-1895`）；`show()`（`:395`）会替换上一条提示 |
| T1 快捷键 | `Ctrl+Shift+P` 确是预览开关（`App.tsx:3814-3818`，且在 `:3623` 的 `productCombo` 白名单里）；`Ctrl+/` 是源码（`:3792-3794` → `toggleSourceRef`），E2E 抄 `.tmp/e2e-r50-bug-h.mjs:33-36` 可行 |
| T2 现状代码 | 实读 `App.tsx:1859-1872`：逐条 `insertText`/`delete` + 一次 `dispatch` + `focus()`，与计划逐字一致 |
| T2 坐标与 API | `src/lib/find.ts:5-6` 明写 `from/to` 是文档位置；`:26-54` 返回按 `from` 升序、带块分隔符守卫；`annotations.ts:145-176` 按文本块拼接子文本节点 → 跨 mark 边界的命中确实存在，`covered !== matches.length` 的退回分支必要；`node_modules/prosemirror-transform/dist/index.d.ts:347` 有 `replaceWith(from, to, Fragment\|Node\|readonly Node[])` |
| T2 步数上限可达 | 1 MB 样本 = 1 个标题 + 1,024 段（`e2e-r48-code-replaceall.mjs:12-16`、`:44-47`），命中 39,936 = 39/段×1,024 段 → 每段一个文本节点、分组后步数 ≤1,024，`:310` 的 `steps` 断言可达 |
| T2 测量脚本 | `:68-77` 包装 `view.dispatch` 记 `{ms, steps}`、`:89-98` 清空后点「全部替换」、`:100-107` 读取读数、`:52-55` 收 `console.error`/`pageerror` → 计划要的 `steps > 0`、`clickReturnMs`、`longtasks`、`docChars`、错误 0 条都有出处；`.tmp/e2e-r36-fix-ann.mjs:78/:95` 与 `shots/round-36/impl-ann-after-*.png` 存在 |
| T2 基线数值 | `.tmp/perf-round48-replace.json`：100 KB `4,096` 命中 / `769.1` dispatch、1 MB `39,936` / `51,802`、`clickReturn 52,197.5`（计划 `:215` 的 395 ms 差值对）；**除 `:212` 的 769.8 应为 789.8** |
| T3 行号与规则 | `styles.css`：`.doc-body` 1.95（`:575`）、h1 `584-590`（1.35）、h2 `592-596`、h3 `598-602`、`h4` 全文件 **0 命中**、占位符 `280-289`（`padding: 0 2px`）、table `756-762`、toolbar button `1315-1319`、`.mono` `1335-1338`、`.stats-trigger` `1589-1597`、`.status-bar` `1568-1579`（`height: 28px`）、`.toast-action` `2083`；`StatusBar.tsx:41-51` 已有 `aria-haspopup/expanded/controls`、无 `aria-label` |
| T3 占位符方案 | `--editor-size` 由 `App.tsx:1800` 写到 `documentElement`，正文 `styles.css:574` 就用它 → 占位符写 `var(--editor-size, 17px)` 与正文同源；占位符是 `.doc-column`（`position: relative`，`:275-278`）里的绝对定位兄弟（`App.tsx:5138-5144`），`.doc-body > *:first-child{margin-top:0}`（`:580-582`）→ 同顶对齐成立；预览也用 `.doc-body`（`PreviewPane.tsx:79`），CSS 一处两处生效 |
| T3 1024 档不溢出 | `.toolbar` 是 `display:flex`、`height:38px`、无 wrap（`:1288-1297`）；11 个按钮按 findings 实测宽度合计 ≈408 px（`findings-ui.md:135-137`），1024 档即使保留 218 px 侧栏也放得下 → 「工具栏不换行/页面不横向滚动」不会假红 |
| 硬约束 | 三任务都不加依赖、不动 `version`（`package.json:3` = 0.32.1）；首屏 294,373 B + 预计 ≤800 B < 310,000 B；不碰 `release/`、不重启 dev server；T3 的 U3（表格字族）已按 r1 要求移入 §5 |

**小瑕疵（不算漏洞，顺手改）**：`plan.md:152` 写「三个既有调用点（`App.tsx:1102`、`:2109`、`:2947` 一带）不传第二个参数」——`lossLabels(` 在 `App.tsx` 只有 **2 处**（`:1102`、`:2109`，grep 全 `src` 确认）；`:2947` 是 `activeLosses(`（`:3222` 还有一处 `activeLosses`）。不影响实现，改「两个」即可。

## 3. 结论

**REVISE**。上一版 6 条全部真修（R50-1 的门槛口径与机制、R50-2 的块内空行、R50-3…R50-6 的文档/文案/角色文件都已实读核对；R50-2 我用真实模块跑了 15 组，不是照抄计划的说法）。

必须先改 **R50-7**：100 KB 的 205 ms 是按命中数线性折算出来的，而修后两档的固定成本相同（都是 1,024 段重建），按计划自己的基线反推该档约 340–360 ms，几乎必然假红；改回 r1 的 ≤400 ms 并把 `:212` 的 769.8 改成 789.8，其余门槛数字一个都不动。

其余 4 条（R50-8 的 `applyReplacements` 接线、R50-9 的 U6 横向断言、R50-10 的 T1 预算、R50-11 的插件 key 写法）都是几行到十几行的改动，10 分钟内能落在计划里，**不需要重写方案**，也不影响 T1/T2/T3 的任务结构。
