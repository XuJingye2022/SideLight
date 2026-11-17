# 第 39 轮计划审查（critic，只读，第 3 次）

- 轮次：round=39；轮前 `startSha=59a4f933dfd411039c939b1e70d7bbdcd7ed82f8`；审查时 `git rev-parse HEAD` = `59a4f933…`（与轮前一致），`git status --porcelain` 只有未跟踪的 `docs/iteration/round-39/` 与 `shots/round-39/`，产品代码 0 改动（下面所有「改前」读数都在这棵未改的树上取）。
- 只读：本文件是唯一写入。未新增探针文件；复跑的是既有探针 `.tmp/planner-r39-probe.mjs`（planner 的 T2 种子探针）、`.tmp/planner-r39-probe-find.mjs`（planner 的 T3 改前探针）、`.tmp/critic-r39-probe3.mjs`（上一轮的带格式单元格探针）。E2E 只连接 CDP **9222**（先 `node .tmp/reset.mjs 9222`），未启动浏览器、未 kill `msedge`、未重启 dev server、未碰 `release/`、未 push。
- 输入（全读）：`round-39/plan.md`（300 行，**revision=3**）、**上一版 `round-39/plan-review.md`（196 行，R1–R6）**、`findings-{bug,typora,code,ship,ui}.md`（同轮未变，沿上轮全读结论）、`common.md`、`roles/critic.md`、`AGENTS.md`（§3/§4/§6/§8）。
- 源码逐个 read（本轮）：`src/App.tsx`（`:870-929`、`:960-1039`、`:1760-1849`、`:2000-2067`、`:2084-2097`、`:2760-2789`、`:3626-3655`、`:3990-4029`、`:4655-4699`、`:4845-4916`）、`src/components/FindBar.tsx`（全文）、`src/lib/{assetImage,assetResolve,serializeDocument}.ts`（全文）、`src/lib/assetResolve.test.ts`（`:1-60`）、`src/lib/tableReuse.ts`（`:84-107`）、`src/styles.css`（变量与 `.editor img`/`.find-*`）、`tsconfig.json`、`package.json`、`.tmp/{planner-r39-probe,planner-r39-probe-find,critic-r39-probe3,e2e-r39-bug-b,e2e-r39-bug-e,e2e-r39-code-1mb-multi,r30-fsa}.mjs`、`README.md`、`AGENTS.md`、`docs/typora-gap.md`。
- 本轮实跑（可复跑，见 §五）：`node --experimental-strip-types .tmp/planner-r39-probe.mjs`、`node -e "Buffer.byteLength(...)"`、`node .tmp/reset.mjs 9222 && node .tmp/planner-r39-probe-find.mjs`、`node --experimental-strip-types .tmp/critic-r39-probe3.mjs`、`git grep`/`Select-String` 若干。

## 结论：**PASS**（0 P0 / 0 P1；4 条 P2，均不阻塞执行）

**上一版的 3 条（N1 P1、N2 P2、N3 P2）都真修掉了**，不是只在计划里改字：N1 的两处门禁命令都换成了 5 段 pattern，本轮实测旧 pattern 只漏 `sl-dispatch-done`；N2 的种子换成字节稳定版并复跑 `equal:true`，缺失图断言改成 `title`（不再用短路的 `alt || title`）；N3 的修法把**两个** Enter 都置空、去掉 `readOnly`，验收用草稿逐字节对照，本轮在 CDP 9222 上复跑「改前」探针，`73 → 69` 与计划写的一致。

判 PASS 的理由：三条调度项全部落地且可执行，没有数据损失、没有门禁破坏、没有体积破线、没有方案不可行。剩余 4 条 P2 是「验收数字/口径的精度」与两条上一轮未调度的遗留（带格式单元格、文档测试条数），不影响本轮 4 个任务的主路径；建议按 §三 的修法在派工提示里顺手带上（与第 37 轮 PASS 的处理方式一致）。

## 一、上一版漏洞复核（revision=2 的 N1–N3）

| 上一版漏洞 | 状态 | 本轮实查（文件:行号 / 命令输出） |
| :--- | :--- | :--- |
| **N1**（P1）T4 产物门禁的 pattern 漏 `sl-dispatch`，5 标签里这一处恒绿 | **已修**（两处命令都改了） | ① `plan.md:246`（验收）与 `plan.md:275`（§4 收官门禁）的 pattern 都是 `'sl-load\|sl-parse\|sl-dispatch\|sl-serialize\|sl-sync'`；`plan.md:298` 的 §6 第 4 条也点了「产物 0 命中的 pattern 是否**含 `sl-dispatch`**」。② 本轮逐标签实测：`sl-load-start True / sl-parse-done True /` **`sl-dispatch-done 旧=False 新=True`**`/ sl-serialize-done True / sl-sync-done True`——旧 pattern 正好只漏这一处，新 pattern 全覆盖。③ `git grep -n "sl-" -- src/` = **0 命中**（exit 1），改后 pattern 不误伤，也没有「标签拼写不一致」的既有埋点。④ `Select-String -Path src/App.tsx -Pattern 'performance\.mark\('` 改前 = **0**，与 `plan.md:26` 的「没有先例可抄」一致；正向对照 8 行的计数（2+1+1+2+2）与 §T4 标签表逐行对得上。 |
| **N2**（P2）T2 验收按字面实现会假红：种子不字节稳定、`alt \|\| title` 取不到「图片未找到」 | **已修**（两半都修） | ① `plan.md:165` 的种子与 `.tmp/planner-r39-probe.mjs` 的 C 段**逐字相同**（`# 一` + `../assets/pic.png` + `%20` 行 + `同.png` + `没图`，无裸空格行），本轮复跑 `## C-plus-missing {"equal":true,"len":[105,105]}`。旧种子 A 段仍 `{"equal":false,"len":[130,132]}`，证明探针对这类假红有牙。② `plan.md:166` 的断言已改成 `img[data-asset-missing]` 数 1、`getAttribute('src') === null`、`img.alt === '没图'`、`img.title.includes('图片未找到')`，并明确写「不要写 `(alt \|\| title).includes(...)`」；`plan.md:155` 的 `markMissing()` 仍是「`if (!img.alt)` 才写占位文案」，与断言自洽。③ 我核了缺失图的渲染链：`Image` 节点的 alt 来自 `paintAttributes`（`assetImage.ts:6-15`），`title` 被 `markMissing` 写入，断言落在真实属性上。 |
| **N3**（P2）T3 只关按钮和查找框 Enter，替换框 Enter 仍会替换 | **已修**（规格 + 有牙的验收 + 改前物证） | ① `plan.md:187` 规格：`locked = Boolean(unavailableReason)`，`preventDefault()` 之后 `if (locked) return`，**查找框 Enter/Shift+Enter 与替换框 Enter 一并置空**；去掉替换框 `readOnly`（并说明 `readOnly` 拦不住 `keydown`、还会让 `page.fill` 抛错）；四个按钮 `locked \|\| total === 0`。② 源码对得上：`FindBar.tsx:46-58`（查找框 Enter→`onNext`/`onPrev`，Esc 已 `stopPropagation`）、`FindBar.tsx:80-90`（替换框 Enter 直接 `onReplace()`）、`App.tsx:1812-1817`/`:1819-1831`（`replaceCurrent`/`replaceEvery` 无 `sourceMode` 判断）、`App.tsx:4856/4871`（源码模式只渲染 `textarea.source-editor`，ProseMirror 不在 DOM）。③ `plan.md:196` 的验收是**草稿逐字节**对照（`sidelight.doc.v1` 基线 → Enter → 900 ms → 再读必须相同），并写明「改前必红、不需要另跑基线」。本轮在 CDP 9222 上复跑 `.tmp/planner-r39-probe-find.mjs`（**改前代码**，HEAD 未变）得：`## baseline draftLen 73` → `## after-replace-enter draftLen 69`、草稿尾段 `甲的正文。` → `甲的ZZ。`、`.source-editor` 不变、`dirty:false`、`count 1 / 2 → 1 / 1`、`errors []`——与 `plan.md:16` 的记录逐项一致，这条验收确实有牙。 |

## 二、本轮核对通过（不是只看计划文字）

| 计划说法 | 核对结果 | 证据 |
| :--- | :--- | :--- |
| T2 新解析器从工作区根走，同目录图仍能解析 | ✅ 规则本身对：`resolveAssetSegments(docDirSegments, src)` 以文档目录为起点，`同.png` → `['章节','同.png']`，`../assets/…` 才弹一层 | `plan.md:120-134`；`App.tsx:4004` 前缀校验保留；`workspace.ts:24`（`rootHandle`） |
| 假 FS 能放 `assets/pic.png`、`assets/my pic.png`、`章节/同.png`，不放 `assets/nope.png` | ✅ `data:` 种子按二进制解（第 38 轮就支持），`assets` 已是虚拟目录 | `.tmp/r30-fsa.mjs:6`、`:29-38`、`:159`；`.tmp/e2e-r39-bug-b.mjs:5,13-15` |
| T2「改前基线」可跑：`nope.png` 请求 ≥1、`data-asset-missing` = 0 | ✅ 改前 `bind()` 第一行就 `paint(src)`（`assetImage.ts:38`），相对路径一定进 `img.src`；`data-asset-missing` 改前无任何写入点 | `assetImage.ts:34-48`；`plan.md:167` |
| `waitResolve` 的前提成立：`getAssetDocPath()` 在 NodeView 前已就绪 | ✅ `loadIntoEditor` 先 `setAssetDocPath(...)`（`:2014`）再 `setMarkdown`（`:2036`）；宿主在 `setMarkdown` 前清空（`:1030`） | `App.tsx:2012-2014`、`:2030-2036`、`:1030` |
| `getAssetDocPath` 可从 `assetResolve.ts` 导出、`assetImage.ts:3` 同一行 import 可加 | ✅ 已导出，`assetResolve.test.ts:6` 也在 import 它 | `assetResolve.ts:35-37`；`assetImage.ts:3` |
| 占位样式只用现成变量 | ✅ `--line-strong`、`--accent-wash`、`--ink-faint`、`--ink-soft` 都存在；`.editor img` 在 `styles.css:1780` | `src/styles.css` |
| T3 `unavailableReason` 能传、`sourceMode` 在作用域、`.find-note` 是新样式 | ✅ `FindBar` 调用点 `App.tsx:4671-4698`，同分支里就在用 `sourceMode`（`:4687`）；`.find-row`/`.find-count` 在 `styles.css:1798/1822`，无 `.find-note` | `App.tsx:4671-4699`；`styles.css` |
| T3 回归路径不被破坏：富文本 Enter=下一处、Esc 只关查找 | ✅ 无 `unavailableReason` 时两个 Enter 分支原样（`locked` 为 false 才走旧逻辑） | `FindBar.tsx:46-58`、`:80-90` |
| T4 8 处埋点位置都真实存在 | ✅ 初始 effect `:1008`/`:1010-1014`/`:1020`；`loadIntoEditor` `:2036`/`:2042-2055`/`:2092`；`setMarkdown` 内 `:983-984`/`:988-989` | `App.tsx` 逐行 read；`syncDocInfo` 定义在 `:995-1004` |
| T4 去重后语义不变 | ✅ `serializeDocument` 是纯函数（只读 `editor.getMarkdown()` 与 options，无模块状态），两次调用之间没有会改它的语句，提出 const 后 `baselineLosses` 与 `baselineRef` 拿同一字符串 | `serializeDocument.ts:48-62`；`App.tsx:2038-2055` |
| T4 探针脚本改法：`:46` 是「编辑器可见耗时」，样本走 localStorage 草稿 | ✅ 行号与加载路径都对 | `.tmp/e2e-r39-code-1mb-multi.mjs:25-30,46` |
| T3 改前探针选择器与 bug-e 一致 | ✅ `page.fill('.find-bar input[placeholder="替换为"]', 'ZZ')` 在 `:29` | `.tmp/e2e-r39-bug-e.mjs:29`；`.tmp/planner-r39-probe-find.mjs:42` |
| 类型面：`import.meta.env.DEV` 与 `performance.mark` 都有类型 | ✅ `tsconfig.json:4` 有 `DOM`，`:14` 有 `vite/client`；`strict` 不拦这种写法 | `tsconfig.json` |
| 测试文件数：现在 24，T1 后 25 | ✅ `package.json:15` 实测 24 个 `.test.ts`（T1 追加第 25 个） | `package.json:15` |
| 硬约束 | ✅ 不换 Tiptap、不新增运行时依赖、`release/` 不动、首屏预算不动、缓存仍只写 `.sidelight/` | `AGENTS.md` §4；本文件 §三 的 4 条都不触及这些 |

## 三、漏洞（4 条，全 P2）

编号按「本轮修订引入」在前、「上一轮未调度遗留」在后；**建议处理顺序 2 → 1 → 4 → 3**：第 2 条是一照字面执行就会必红的门禁口径，第 1 条是本轮新增的标签错误，第 4/3 条是上一轮已提、本次计划注明「未调度」的遗留（带格式单元格、文档测试条数），可在派工提示里顺手带上。

### 1（P2）· T2 验收把「105 字符」写成「105 B」，真按字节断言会假红

**问题**

`.tmp/planner-r39-probe.mjs:23` 打印的是 `seed.length`（UTF-16 码元），不是字节。本轮复跑该探针 C 段（就是 `plan.md:165` 那串种子）：

```
## C-plus-missing {"equal":true,"len":[105,105]}
```

同一串种子的 UTF-8 字节是 **131**：

```
node -e "const s=[…同上种子…].join('\n'); console.log('chars', s.length, 'bytes', Buffer.byteLength(s))"   # 完整命令见 §五
chars 105 bytes 131
```

但计划有四处写「105 B」：`plan.md:14`（修订记录核对列）、`:165`（种子定义）、`:168`（保存字节验收）、`:300`（§6 第 6 条「105 B 字节稳定版」）。`plan.md:168` 的原话是「`readFakeFile(...)` **逐字节等于上面那串种子（105 B）**」。执行代理若把「逐字节」实现成 `new TextEncoder().encode(saved).length === 105`（或 `Buffer.byteLength`），会红在 131 上；而这条验收的本来目的正是「字节稳定」（上一版 N2）。这与本轮自己强调的「字节口径」自相矛盾，也让旁证数字失真。

**修法**（一个词的事）

把四处 `105 B` 改成「**105 字符（UTF-8 131 字节）**」，或直接删掉数字只留「等于上面这串种子」；断言仍用字符串相等（`assert.equal(saved, SEED)`），不引入长度检查。

---

### 2（P2，上一版 §三.4，本次未调度）· `plan.md:246` 的「gzip 相差 ≤ +200 B」与 `plan.md:18` 的执行口径冲突，正常实现必红

**问题**

`plan.md:246` 仍写：「……的 gzip 与第 38 轮 289,430 B 相差 ≤ **+200 B**（埋点应是 0 B，留余量给 hash 与死代码边界）」。但 `.tmp/build-r39` 是 **T1–T3 都做完之后**的产物：T1 新增 `tableCellBreaks.ts` 并接进 `setMarkdown`，T2 新增 `resolveAssetSegments`、改 resolver/`assetImage`/加占位 CSS，T3 改 `FindBar` 并加 `.find-note`——这些都在首屏主 chunk 里。第 38 轮同量级改动实测 **+1,019 B**（`README.md:100` 的「第 38 轮加工作区图片解析…后 +1,019 B」），所以 `+200 B` 上限在正常实现下必然失败；失败时分不清是埋点泄漏还是新代码。

`plan.md:18` 已经给出了正确的执行口径（「gzip 以硬线 ≤310,000 B 为判据，与 289,430 B 的差值按 T1–T3 归属记录」），但验收行没有同步，执行代理会先读到 `:246` 的硬上限。上一轮已提（§三.4），本次计划把它列为「未调度、原文不动」——那这句就是当前计划里唯一一处**已知会假红**的验收。

**修法**

把 `plan.md:246` 的「与第 38 轮 289,430 B 相差 ≤ +200 B（埋点应是 0 B，留余量给 hash 与死代码边界）」改成：

> 「`measure-first-screen.mjs --dir .tmp/build-r39 --target 310000` 通过（硬线 ≤320,000 B）；记录与 289,430 B 的差值，按 T1–T3 新代码归属（预期 +1 KB 级）。埋点 0 B 的证据只由「源码 8 行正向对照 + 产物 0 命中」承担，不用全量增量冒充。」

### 3（P2，上一版 §三.6，本次未调度）· T1 加第 25 个测试文件后 `README.md:119` / `AGENTS.md:72` 的条数过期，且 T4 验收的「条数不变」自相矛盾

**问题**

- `package.json:15` 实测 **24** 个 `.test.ts`；T1 在 `:92` 追加 `tableCellBreaks.test.ts`（≥6 条），T2 又给 `assetResolve.test.ts` 加 ≥6 条 → 总数必然 >311。
- 但 `plan.md:244`（T4 验收）写「`npm test` **条数不变**（第 38 轮 311 条；T1 之后文件数 24 → 25）」，与 `plan.md:270`（§4 门禁）的「`npm test # T1 之后：25 文件（311 + T1 新增条数）`」在同一份计划里互相矛盾。
- `README.md:119`（`npm test # 24 个文件、311 条断言`）与 `AGENTS.md:72`（`测试 24 个文件 311 条`）没有任何落点：`plan.md:93` 说的「`README.md` 与 `AGENTS.md` §6 的同一句一起改」指的是差距表计数 29/11 → 30/11，不是测试条数。`AGENTS.md:39` 是历史戳记，不动。

**修法**

1. `plan.md:244` 改成「`npm test` 全过，文件数 25、条数以实跑输出为准（预期 ≥323），T4 自身不加测试」。
2. T1/T2 的文档交付各加一行：`README.md:119` 与 `AGENTS.md:72` 的「24 个文件、311 条」按 `npm test` 实跑值更新（执行后 `Select-String -Path README.md,AGENTS.md -Pattern '24 个文件|311 条'` 只剩 `AGENTS.md:39` 一处）。

### 4（P2，上一版 §三.5，本次未调度）· T1 对带格式文本的 `<br>` 仍会改字节并让该表退出整块复用

**问题**

本轮复跑 `.tmp/critic-r39-probe3.mjs`（产品代码未变）：

```
br-with-bold-mark "\n|                |     |\n| -------------- | --- |\n| a              | b   |\n| **A**<br>**B** | c   |\n"
br-plain          "\n|                |     |\n| -------------- | --- |\n| a              | b   |\n| **A**<br>**B** | c   |\n"
```

按 `plan.md:75` 的切分规则（「命中文本就把该文本节点切成 text/hardBreak」，不区分 `marks`），原文 `| **A<br>B** | c |` 第一次保存会写成 `| **A**<br>**B** | c |`——字节变了；`tableReuse.ts:93-96` 的签名含**全部数据单元格**，签名一变，这张「其实没动过」的表就不再整块写回原文，转为重排，与 `README.md:74` 的「没动过的表格整块写回原文」不符。`plan.md:77` 的 6 条单测里没有 `**A<br>B**` 样本，`plan.md:95` 风险①只写了「字面 `<br>` 的旧文档会被转成换行」。

**修法**（二选一，都要单测）

1. **只拆 `marks` 为空的文本节点**（marks 非空就跳过）：字节面完全不变、`tableReuse` 行为不变；CHANGELOG 与 `docs/typora-gap.md` 写明「带格式单元格里的字面 `<br>` 仍按字面显示」。
2. **照拆**：在 `tableCellBreaks.test.ts` 加 `**A<br>B**` 的 marks 分布断言，并 CHANGELOG 记「带格式单元格（如 `**A<br>B**`）第一次保存会写成 `**A**<br>**B**`，该表也会从整块复用转为重排」。

## 四、其余提示（不判为漏洞）

1. **T2 文档措辞仍未改**（上一版 §四.1）：`plan.md:160` 要替换 `docs/typora-gap.md:37` 的整行，会删掉现句「单文件打开（无目录句柄）与 HTML 导出仍显示不了」。按 R4 方案 1，宿主/单文件仍走 `paint(src)`、不标缺失，「解析不到的图显示虚线占位」对它们不成立（`plan.md:174` 风险⑦自己也写了本轮验不了宿主）。建议改成「打开文件夹后……；单文件打开与 HTML 导出仍显示不了」，`README.md:46` 同样加「打开文件夹后」限定。
2. **preview 模式的查找替换同样作用在隐藏编辑器**：`App.tsx:3636-3639` 的 Ctrl+F 不看 `viewMode`，`:4878-4879` 预览 pane 替掉了编辑器。但预览 pane 由 `editor?.getHTML()` 重画（`:4879`），替换结果会立刻在预览里显示，不是静默；T3 只修源码模式可以接受，不必扩大范围。
3. **函数名仍写错**：计划多处写 `loadDocument`（`plan.md:227`、`:230`、`:240`），实际是 `loadIntoEditor`（`App.tsx:2009`）；行号（`:2036`/`:2092`）都对，执行时按行号。
4. **`resolveAssetSegments` 的解码顺序**：规则是「先判 `..` 再 `decodeURIComponent`」，所以 `%2e%2e` 解码后的 `..` 会当成普通段传给 `getDirectoryHandle`。实测路径上 FSA 会拒（抛错 → `catch → null`），不构成越出工作区根，但建议单测补一条「解码后是 `..` 也返回 null」把语义写死（可选，不加也行）。
5. **`parentDirectory` 不会变成未用 import**：`App.tsx:686/934/1266/1961/2347/3132/3966` 仍在用，T2 只从 resolver 里删调用。
6. **估时**：revision=3 没有新增耗时步骤（T3 新验收段在同一个 E2E 脚本里、T2 种子更小），仍是 38–45 分钟，超时按 `plan.md:281` 的 T3 → T2 → T1 砍，T4 不砍。

## 五、本轮复跑（只读；E2E 用 CDP 9222，先 reset）

```powershell
node --experimental-strip-types .tmp/planner-r39-probe.mjs        # A: 130/132 equal:false；C: 105/105 equal:true
node -e "const s=['# 一','','![上级](../assets/pic.png)','','![编码上级](../assets/my%20pic.png)','','![同目录](同.png)','','![没图](../assets/nope.png)',''].join('\n'); console.log('chars',s.length,'bytes',Buffer.byteLength(s))"   # chars 105 bytes 131（与探针 C 段同一串种子）
node .tmp/reset.mjs 9222
node .tmp/planner-r39-probe-find.mjs                              # baseline draftLen 73 → after-replace-enter 69；source 不变；dirty false；count 1/2 → 1/1
node --experimental-strip-types .tmp/critic-r39-probe3.mjs        # **A<br>B** → **A**<br>**B**
git grep -n "sl-" -- src/                                         # 0（exit 1）
git grep -c "import.meta.env" -- src/                             # 0（exit 1）
Select-String -Path src/App.tsx -Pattern 'performance\.mark\(' | Measure-Object | Select-Object -ExpandProperty Count   # 0（改前）
foreach ($l in 'sl-load-start','sl-parse-done','sl-dispatch-done','sl-serialize-done','sl-sync-done') { "{0,-20} old={1} new={2}" -f $l, ($l -match 'sl-load|sl-parse|sl-serialize|sl-sync'), ($l -match 'sl-load|sl-parse|sl-dispatch|sl-serialize|sl-sync') }   # sl-dispatch-done 旧=False、新=True
```

探针只 import 产品模块与 `@tiptap/*`，不写仓库文件；E2E 关掉的只是它自己打开的页面（`reset.mjs` 只关闭 localhost 旧页面并清 localStorage/IndexedDB）。
