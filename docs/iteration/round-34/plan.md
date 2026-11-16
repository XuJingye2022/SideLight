# 第 34 轮计划（planner，只读）

- revision：**3**（第 3 次修订。按本版 `plan-review.md` 的 2 条 P1 + 3 条 P2 改：**P1-1** 删掉 T1 断言 c 里不可达的 `dirty === true`，`dirty` 只打日志；**P1-2** 预算 34 → **32 分钟**，移走三项非必要构建/整跑（`M_0` 构建、T2 早报构建、`keyboard-acceptance`）；**P2-1** 改 T2 的修复前预期、补「打字前显式点正文」与「每条结尾清模态」；**P2-2** T2-c 改用句柄身份 `isSameEntry`；**P2-3** 同批改 `risk.ts` 的 JSDoc 与一条旧用例名。**任务数、产品范围、依赖、文件清单都没变**）
- 上两版：revision **2**（按上一版 `plan-review.md` 的三条 P1 改：执行拓扑写死单代理串行；T2 的 e2e 关掉自动保存并用 `dirty` 守门；T1 补自动保存路径的断言与修复前证据；顺带解决上一版 P2-1/P2-2/P2-3）。rev3 只读核对、**未跑 e2e、未改产品代码**；修复后的预期值由执行者实测。
- 基线：`main` @ `186dfeb`（`git log --oneline -8` 实测；工作树只有本轮 `docs/iteration/round-34/` 与 `shots/round-34/` 未跟踪）。版本 **0.32.1**，本轮**不发版**。
- 门禁现状（本轮 finder 实跑，不是估计）：`npm run build` PASS；`npm test` **22 文件 285 条**；首屏 gzip **285,891 B / 上限 286,000 B，余 109 B**（`round-34/findings-ship.md:22-28`、`findings-typora.md:10`）。
- 输入：`round-34/findings-bug.md`（4 条）、`findings-typora.md`（10 条）、`findings-ship.md`（6 条）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md` §3/§4/§8、`docs/typora-gap.md`、相关源码与 `git log`。

**修订对照（revision 2，逐条对应 `plan-review.md` 的三条 P1）**

| 漏洞 | 改法 | 落点 |
| :--- | :--- | :--- |
| P1-1 拓扑自相矛盾（一个执行代理 vs 按两个代理并行分工、共用 CDP 9222 与 `.tmp/build-r34`） | 写死**一个执行代理串行 T1 → T2 → T3**；删掉双拓扑的表述与按两个代理分工的执行者列；决策点 A 只留「根代理执行」一个口径；并行的两个互踩机制（`reset.mjs` 关页面/清存储、`emptyOutDir` 互相清空）与「真要临时拆分」的三条硬约束写进文件归属节 | 「本轮取舍」第 1 条、硬约束 2、硬约束 3、`## 文件归属与执行顺序` |
| P1-2 T2 的 d/f 被默认开启的自动保存抢跑（d 假通过、f 假失败） | T2 的 e2e 在 `addInitScript` 里关自动保存（键 `sidelight.settings.v1`）；d/f 按 Enter 前先读 `__slState.dirty`，不是 `true` 记 FAIL；d/f 内等待 ≤800 ms；**f 红了先看 dirty 日志，再判产品回归**（rev3 把这条诊断改成「先看 `active`、再看 `dirty`」，见下表 P2-1） | T2 实施步骤 1/2/3、T2 验收、T2 风险④ |
| P1-3 T1 只测 `Ctrl+S`，没测自动保存主路径 | T1 新增断言 **f**：切回富文本后敲一个字 → 等 2600 ms（>2000 ms 防抖）→ 文件字节不变且状态栏出现「需手动保存」；并**先在未改代码上跑一次**留 `before` 日志当修复前证据 | T1 实施步骤 2/3/5、T1 验收 |

**修订对照（revision 3，逐条对应本版 `plan-review.md`）**

| 漏洞 | 改法 | 落点 |
| :--- | :--- | :--- |
| **P1-1** T1 断言 c 的 `dirty === true` 不可达（修复后稳定假 FAIL，而它被列为必过项） | 删掉这条断言：c 只断言「字节与 b 之前逐字节相同且仍含定义行」「`[role=dialog]` 归零」「没有新的『已保存』提示」；`dirty` 只进日志。`dirty=false` 的逐行机制写进计划，**明确不许为此改产品代码** | T1 断言 c、T1 验收 |
| **P1-2** 预算写 34 分钟但 rev2 只加不减，命令层 7–8 次构建/整跑 | 删 `M_0` 构建（直接取 finder 实测 285,891，同时消掉与「T1 不做体积测量」的矛盾）、删 T2 早报构建、`keyboard-acceptance` 移到根代理收尾；预算改 **32 分钟 / 余 3 分钟**；砍单顺序把「c 的字节子断言」与「f 不许减」并列 | 取舍表与「本轮取舍」预算行、全轮硬约束 2、T1 步骤 1/6、T2 门禁、文件归属、轮次收尾、超时纪律 |
| **P2-1** T2 修复前预期（a–e FAIL、f PASS）不成立，`:231` 的诊断规则会指错方向 | d/f 打字前**显式点** `.ProseMirror` 并把 `active` 打进日志；**e 不许点**（它测的就是「Enter 后焦点自动进正文」，点一下就把断言变成自证）；每条结尾统一点「取消」清模态；预期与诊断规则都改成「先看 `active`，再看 `dirty`」 | T2 实施步骤 2/3、T2 验收、T2 风险④ |
| **P2-2** T2-c 只比 `path`：单文件模式下「同名不同文件」会被静默吞掉 | 改用句柄身份 `await file.handle.isSameEntry(activeFile.handle)`；句柄缺失（`pickFile` 的 `<input>` 兜底 `handle: null`）或 `activeFile === null` 时 `same` 恒为 `false`、保持旧弹框 | T2-c 代码块与说明、T2 风险 |
| **P2-3** 两处旧文案与新语义相反（`risk.ts` 的 JSDoc、一条旧用例名） | 同批改 JSDoc（构建时被剥掉，首屏 0 B）与 `diff.test.ts:96` 的**用例名**，断言一字不动 | T1 改动文件第 1/2 条、T1 验收 |

## 本轮取舍（先给结论）

**3 个任务：一个 P0 数据安全，一个用户可见，一个体积门禁。全部不发版、不动 `release/`、不新增依赖、不改 `host/`/`host-mac/`。**

| # | 主题 | 类型 | 优先级 | 预算 |
| :--- | :--- | :--- | :--- | ---: |
| T1 | 脚注定义丢失不再静默落盘（保存前拦一次） | 数据安全 | **P0** | 15 min |
| T2 | 三处焦点/确认框：查找关框、快速打开、同一篇误弹框 | 用户可见 | P1 | 12 min |
| T3 | 首屏体积门进本地门禁（`npm run verify`）+ 汇总行打印余量 | 安装/体积 | P1 | 5 min |

- **合计约 32 分钟**（T1 15 + T2 12 + T3 5），一个执行代理、**严格串行 T1 → T2 → T3**，35 分钟上限内留约 3 分钟余量。rev2 的 34 分钟是「只加不减」的结果（它新增 f 断言、两次修复前整跑、一次 `M_0` 构建）；rev3 从执行者路径移走三项——`M_0` 构建（≈1 分钟）、T2 早报构建（≈1 分钟）、`keyboard-acceptance`（≈1.5 分钟），可数开销从 7–8 次构建/整跑降到 4–5 次，**省下的时间留给两次 e2e 复跑与截图**。本轮**不并行**：不派第二个代理、不用第二个 CDP 端口、不建第二个构建目录（三个任务的文件不重叠：T1 只碰 `risk.ts`/`diff.test.ts`/`SaveDialog.tsx`，T2 只碰 `App.tsx`，T3 只碰 `package.json`/`scripts`/文档，串行不会撞文件；并行的坑见「文件归属与执行顺序」）。
- **为什么不先做「工作区图片破图」**（Typora P1，第 32/33/34 三轮提出，第 33 轮计划写的是「下一轮第一件事」）：三条硬原因，不是拖。① 完整修复按第 33 轮估算是 110 行 TS + 20 行 C# + 宿主重建 + `host-smoke`，单代理约 60 分钟，**超本轮 35 分钟上限**；② 只做前端 NodeView（不经宿主 `/__asset`）在工作区有 FSA 句柄时能用，但宿主按路径打开的文件夹没有句柄，会交付一个「看着修好了、宿主里仍破图」的半成品；③ 它要把 NodeView 注册进主 chunk（约 40 行），**在当前 109 B 余量下必然超线**，必须与一个「省字节」任务同轮。下一轮的正确排法是「省字节 + 完整图片」两件一起，见「不在本轮范围」第 1 条。
- **T1 必须是本轮第一个做的**：现行代码把脚注定义静默改写成坏链接后覆盖磁盘（`findings-bug.md:45-53`），属于数据安全，按角色排序排在用户可见收益之前。
- **T2 里的「同一篇误弹框」不是纯体验问题**：弹框的三个按钮里「不保存」会丢掉当前这篇的未保存改动（`requestLoad` → `discardAndSwitch` → 从磁盘重载同一篇），一次误点就是一次数据丢失。所以它在 T2 内排第一。

## 全轮硬约束（每条验收都要过）

1. **不发版**：`package.json` 的 `version` 保持 `0.32.1`；`docs/CHANGELOG.md` 的 `## Unreleased（第 29–33 轮，未发版）`（`:5`）标题改成 `## Unreleased（第 29–34 轮，未发版）`，在其下加「**第 34 轮**」子段，三条各一行：① 脚注定义丢失保存前拦一次；② 查找/快速开关注焦与同一篇不再弹切换框；③ 首屏体积门加 `npm run verify`。**不得**写「修好图片」「链接可打开」——两条都没做。（标题与这三行由**根代理**在轮次收尾时写；执行代理不碰 CHANGELOG，见「轮次收尾」第 2 条。）
2. **不改 `release/`、不 push、不新增运行时依赖、不动 `host/` 与 `host-mac/`。** 本轮**只有一个执行代理**，全程串行：根代理的构建目录是 `.tmp/build-r34`，执行代理只跑一次 `npm run verify`（vite 默认写 `dist/`）；**不存在并发构建、不存在第二个 `--outDir`**（Vite 默认 `emptyOutDir`，两个进程写同一目录会互相清空，`measure-first-screen.mjs:39-44` 逐个 `statSync` 读到半成品就得到错的 gzip）。执行代理**不做任何体积测量、不做体积决策**（`M_0` 直接用 finder 实测值，`M_A` 是根代理的，见第 3 条）；rev3 删掉了 rev2 的「T2 落地后早报构建」——它明说不构成门禁结论，却要多一次 `vite build` + `measure`。只有 T3 的验收需要真的跑一次 `npm run verify`（它会写 `dist/`），**所以 T3 放在最后**。轮末的 `npm run build`/`npm test`/`node scripts/measure-first-screen.mjs` 由根代理串行跑一次。
3. **首屏 gzip ≤286,000 B，上限不许抬。** 改前基线 **285,891 B**（本轮 finder 实测），余 **109 B**。
   - **决策点 A 全轮只执行一次，由根代理做**（唯一权威口径；执行代理不执行决策点 A）：执行代理交付 T1+T2 的代码与 T3 的脚本/文档之后，根代理跑 `npx tsc --noEmit` → `npx vite build --outDir .tmp/build-r34` → `node scripts/measure-first-screen.mjs --dir .tmp/build-r34`，记 `M_A`。T3 的产品字节是 0，所以排在 T3 之后量不影响结论。
   - `M_A ≤ 285,991`（增量 ≤100 B）→ 原样继续。
   - `285,991 < M_A ≤ 286,000` → 也继续，但要在 `impl.md` 写明余量只剩几位数，并把「省字节」列为下一轮第一件事。
   - `M_A > 286,000` → 根代理按下面的**梯子**逐级指定回改，执行代理每改一级复测一次，并把该级的 gzip 变化贴进 `impl.md`（梯子第 1、2 级是纯去重/合并、不改行为，执行代理在 T3 的 `npm run verify` 里若看到超线，可先自行做完这两级再报数；第 3、4 级动 T2-d 的行为，必须根代理点头）：
     1. 删掉 `src/App.tsx:2460` 与 `:2459` **完全重复**的 `show(\`已新建 ${name}\`)`（planner 实读两行字面相同，是复制粘贴重复）。
     2. 把 `src/App.tsx:2437`、`:2447`、`:2461` 三处逐字相同的 `requestAnimationFrame(() => document.querySelector<HTMLElement>('.ProseMirror')?.focus())` 换成 T2 新增的模块级 `focusEditor()`。
     3. 去掉 T2-c 里「同一篇」分支的 `focusEditor()` 调用（保留「不弹框」本身）。
     4. 把 T2-d（快速打开后聚焦）整条挪到下一轮，只交 T2-a 与 T2-c。
     - 四级用完仍 >286,000 → 根代理**停手**，把 `M_A` 与每一级的变化报给人。不许抬上限，不许删无关文案凑数，不许删测试。
   - 每次构建的 `raw=` / `gzip=` / 文件行原样贴进 `impl.md`，`M_A` 与最终值必须各自可归因，**禁止只写估算**。
4. **界面/行为变化要留证据**：截图落 `shots/round-34/`，不要覆盖 `shots/round-05/`、`shots/round-08/`。T2 的焦点修复用 e2e 断言（焦点位置文本可比），另附一张「Esc 后打字落在正文」的截图。
5. **E2E 环境**：dev server `http://localhost:5175` 已在跑，不要重启、不要另起；浏览器只用 CDP **9222**，不要启动 Edge、不要 kill `msedge`；**每个脚本前跑** `node .tmp/reset.mjs 9222`（`.tmp/reset.mjs:28-32` 会关掉这个端口下所有 localhost 页面、`:36-52` 清 localStorage/sessionStorage/IndexedDB、`:58` 关掉自己新建的页面——所以两个 e2e 脚本绝不能同时跑；本轮只有一个执行代理，天然串行）。自写脚本放 `.tmp/e2e-r34-*.mjs`，连接方式抄 `.tmp/e2e-r34-bug-probe5.mjs:4-12`；结尾 `page.close()` 后 `process.exit(0)`，否则进程不退（AGENTS §8）。**两个脚本对自动保存的处理相反，不许抄错**：T2 的脚本在 `addInitScript` 里关掉自动保存（上一版 P1-2），T1 的脚本保持默认开启（上一版 P1-3 要测自动保存路径）。
6. **测试文件必须在 `package.json` 的 `test` 脚本里登记**。本轮的回归测试**加进已有的 `src/lib/diff.test.ts`**（那里已经在测 `activeLosses`），**不新建测试文件**，所以 `npm test` 仍是 22 个文件、条数由 285 变成 285 + 新增条数（写进 `impl.md`）。
7. **禁止把 `round-34/findings-*.md` 里的「建议」直接当已完成事项写进 CHANGELOG/README**；只写本轮实测通过的行为。

---

## T1（P0，S–M，数据安全）脚注定义丢失不再静默落盘

**为什么**：`findings-bug.md` 第 1 条，最小 4 步复现 3/3 一致。用户在源码模式往文末追加一段、保存（此时字节完全正确），切回富文本不改任何字再保存，磁盘上的 `[^1]: 定义文字。` 就被改写成 `[^1](定义文字。)`——在 Typora/GitHub 里那是坏链接，正文 `[^1]` 也不再指向任何定义。全程提示仍是「已保存 脚注.md」，**无横幅、无确认框、无撤销点**。

**根因（planner 逐行核对过，不是引述）**

1. `src/lib/footnotes.ts:62-73` 的 `extractFootnotes` 只认**文末连续**的定义块；定义后面一旦出现普通段落，`parseBlocks`（`:26-55`，`:45` 的 `return null`）就放弃，整个定义留在正文里交给富文本解析，序列化成 `[^1](定义文字。)`；`repairFootnoteRefs`（`:85-87`）只还原 `\[^1\]`，管不了这种形态。
2. 保存门在 `src/App.tsx:2833`（手动保存）与 `:3109`（自动保存）都用 `activeLosses(originalText, normalized, baselineLossesRef.current)`；`src/lib/risk.ts:369-375` 的 `activeLosses` 第一行是 `if (baseline.length === 0) return []`，而基线与「载入时的序列化」比较（`src/App.tsx:1993-2003`）。本例文档**载入时是干净的**，基线为空 → 保存门永远放行。
3. 判定逻辑本身能识别这类损失：`src/lib/risk.ts:129-190` 的 `footnoteLosses` 在「原文有定义、正文仍引用、保存后定义没了」时给出 `kind: 'footnote-loss'`、`blocking: true`。planner 用本报告的 4 步文本手算过一遍：`before.definitions={'1'}`、`before.references={'1'}`、`after.definitions={}`、`after.references={'1'}` → 命中。**缺的只是「基线为空也拦」这一条**。
4. 对照：载入时定义就已经不在文末的文档会被拦（`findings-bug.md:64-71` 的 probe4）。所以缺口很具体，只在这一条路径上。

**改动文件 / 函数**

1. `src/lib/risk.ts`：把 `activeLosses`（`:369-375`）改成「基线只决定载入时的横幅，脚注定义丢失一律拦」：

```ts
/** 脚注/引用式链接定义行；只做「要不要跑完整分类」的短路，误判只会多跑一次 classify */
const FOOTNOTE_DEFINITION = /^\[\^[^\]]+\]:/m

export function activeLosses(original: string, current: string, baseline: Loss[]): Loss[] {
  // 基线为空但原文有脚注定义时仍要分类：第 34 轮 P0，载入后编辑把定义挤出文末块，基线里没有这条
  if (baseline.length === 0 && !FOOTNOTE_DEFINITION.test(original)) return []
  const baselineKeys = new Set(baseline.map((loss) => `${loss.kind}:${loss.key}`))
  return classify(original, current).filter(
    (loss) => loss.blocking && (loss.kind === 'footnote-loss' || baselineKeys.has(`${loss.kind}:${loss.key}`)),
  )
}
```

   - **只放过 `footnote-loss` 一种**，其它种类（`reference-links`、`table-separator`、`math-escape`、`html-ampersand`、`autolink`、`html-comment`）保持原基线语义。引用式链接已有另一道护栏：`hasReferenceDefinitions`（`src/lib/risk.ts:308-311`）会让这类文档载入即进源码模式，脚注没有对应护栏，这也是只放脚注的理由。
   - **保留短路**：`activeLosses` 也被自动保存调用（`src/App.tsx:3109`，每 2 秒一次防抖），去掉短路会让没有脚注的文档每次自动保存都跑一遍全文 `classify`（含 `diffLines`）。短路条件用「原文里有没有 `[^id]:` 定义行」，对绝大多数文档仍然是 O(1) 正则。
   - **同批改 `:365-368` 的 JSDoc**（P2-3）：现在写「基线为空（新建/普通文档）永远返回空数组，正常编辑不弹框」——本轮之后对脚注文档不成立。改成「基线决定载入时的横幅与其它分类；只有 `footnote-loss` 例外（基线为空也拦）」。注释在构建时被剥掉，**首屏 0 B**。
   - 不要动 `baselineLosses`（`:361-363`）与 `classify`（`:319`）；不动 `src/App.tsx` 的两个调用点。

2. `src/lib/diff.test.ts`：在 `:226-246` 的脚注用例后面加**两条**（`import` 行已经在 `:6`）：

```ts
test('基线为空也要拦脚注定义丢失（第 34 轮 P0：定义被挤出文末块）', () => {
  const before = '# 脚注篇\n\n引用[^1]。\n\n[^1]: 定义文字。\n\n末尾段。\n'
  const after = '# 脚注篇\n\n引用[^1](定义文字。)。\n\n末尾段。\n'
  const active = activeLosses(before, after, [])
  assert.equal(active.length, 1)
  assert.equal(active[0].kind, 'footnote-loss')
})

test('定义仍在文末块时只改正文 → 基线为空也不拦（防过度拦）', () => {
  const before = '# 正常篇\n\n引用[^1]。\n\n[^1]: 定义。\n'
  const after = '# 正常篇\n\n改了字[^1]。\n\n[^1]: 定义。\n'
  assert.deepEqual(activeLosses(before, after, []), [])
})
```

   - **第 2 条换掉了原来的「正文改过 → 放行」**：`activeLosses('正文。', '正文改过。', [])` 在删掉短路后同样是 `[]`，对短路没有区分力（上一版 `plan-review.md` 的 P2-1 已指出）。换成**防线上的反例**——定义还在文末、只改正文时必须放行，锁的是「别把脚注损失放宽成一律拦」。不补第三条（锁「非空基线 + 新增 `footnote-loss`」要手造 `Loss` 对象，改动面大、收益小），测试条数仍是 285 + 2。
   - **同批改 `:96` 的用例名**（P2-3）：现在叫「基线为空时永不拦：正常编辑不弹框」，本轮之后名字与语义相反；改成「基线为空时，非脚注类损失不拦」。**`:97-99` 的断言一字不动**——它用的是引用式链接，本轮语义不变，必须继续绿。

3. `src/components/SaveDialog.tsx:63` 的说明文案要跟着改（**这是本轮修复引入的必改项**）：现在写的是「下面这些结构**在载入时就存在**，保存后会丢掉或重排。取消不会写入任何字节。」——本轮之后「载入后才出现」的脚注损失也会走这个框，这句话就不对了。改成「下面这些结构在保存后会丢掉或重排。取消不会写入任何字节。」（删掉 8 个字，**字节是负的**）。`SaveDialog` 是**主 chunk** 里的组件（`src/App.tsx:29` 直接 import，不在 `:23-43` 的 `lazy()` 名单里），所以这句话计入首屏字节，删字对它有利。
4. **不改** `src/App.tsx`。保存门与自动保存门都调 `activeLosses`，一处修完两处受益（`:2833`、`:3109`）。

**实施步骤**

1. **不跑修复前构建**：`M_0` 直接取 finder 的实测值 **raw=929,933 / gzip=285,891 B**（`findings-ship.md:26`）。rev3 核对过 HEAD `186dfeb`、`git status --porcelain` 只有 `docs/iteration/round-34/` 与 `shots/round-34/`，与 finder 那次测量是同一棵树，不必再构建一次；这也消掉 rev2 里「步骤 1 要构建」与「步骤 6 说 T1 不做体积测量」的矛盾。
2. 写 E2E `.tmp/e2e-r34-t1-footnote.mjs`：**从 `.tmp/e2e-r34-bug-probe5.mjs` 整份复制再改断言**（它已经把 4 步流程、`installFakeWorkspace`、`readFakeFile`、状态打印都写好了，不要重写）。`installFakeWorkspace` 一次种三篇：`脚注.md`（`# 脚注篇\n\n引用[^1]。\n\n[^1]: 定义文字。\n`）、`正常篇.md`（`# 正常篇\n\n引用[^1]。\n\n[^1]: 定义。\n`）、`普通.md`（`# 普通\n\n普通正文。\n`）。**脚本不要关自动保存**（f 就是要测自动保存）。按下面 6 条断言写，**执行顺序 d → e → a → b → c → f**（先跑两条反例，把页面留在干净状态，再进脚注流程，避免切文档时先弹「没保存」框）：
   - **a（回归：源码保存仍正确）**：第 1 步源码追加 + `Ctrl+S` 后，`readFakeFile(page, '脚注.md')` 仍然包含 `[^1]: 定义文字。`。
   - **b（本轮修复）**：**进 b 之前先记 `bytesBeforeB = await readFakeFile(page, '脚注.md')`**（c 要拿它逐字节比）。切回富文本、不点正文以外的任何东西、`Ctrl+S` 后**必须出现 `[role="dialog"]`**，其 `innerText` 同时包含「保存后这些写法会被改写」与「脚注」与「定义在保存后会消失」，按钮里能找到「取消」（`SaveDialog.tsx:93-95`）与「仍然保存」（`:96-98`）。
   - **c（关键：不静默）**：点「取消」后 ① `readFakeFile(page, '脚注.md')` 与 b 之前记下的 `bytesBeforeB` **逐字节相同**，且仍包含 `[^1]: 定义文字。`；② `[role="dialog"]` 数量回到 0；③ 没有新的「已保存」提示——取点取消前的 `toastBefore` 与之后的 `toastAfter`（`.toast-text`，`src/App.tsx:4828`），要求 `toastAfter === toastBefore || !toastAfter.includes('已保存')`（这样不会被 a 步残留的旧 toast 误判）。**`dirty` 只打日志、不作断言**：a 的源码保存把基线推进成新文本（`App.tsx:2528`）并 `setDirty(false)`（`:2552`），b 切回富文本时 `applySource` 用「源码框文本 vs 基线」重算仍是 `false`（`:3742`），取消只清 `pendingConfirm`（`:2853`）——此处 `dirty === false` 是**既有语义**（`plan-review.md` P1-1 的探针 `.tmp/critic-r34-dirty.log` 实测），所以**不许为此改产品代码**，也不许把 `dirty` 写成断言。
   - **f（上一版 P1-3 新增：自动保存路径也必须拦）**：接在 c 之后，点正文末尾、`page.keyboard.type('甲')` 打一个字（切回富文本时 `applySource`（`:3742`）会把 dirty 按基线重算成 false，**不打字自动保存不会触发，会变成空验证**），等 **2600 ms**（> `src/App.tsx:3166-3173` 的 2000 ms 防抖）→ `readFakeFile` 仍包含 `[^1]: 定义文字。`（自动保存**没有**把坏文本写盘），且 `.status-bar` 出现「需手动保存」（`src/App.tsx:4880-4881`，`warn` 色 `:4891`）。日志同时打 `__slState.dirty` 与 `.status-bar` 原文。
   - **d（反例：不误报）**：开 `正常篇.md`（定义留在文末），在富文本里改一个字 → `Ctrl+S` → **不弹框**、提示是「已保存 …」（这是第 34 轮 probe2 的对照，用来防「一律弹框」的过度修复）。
   - **e（反例：无脚注文档不受影响）**：开 `普通.md`，打字 → `Ctrl+S` → 不弹框。
   - 每条 `##` 前缀打进日志，结尾打印 `## errors`（应 `[]`）。**断言失败不要 throw**：逐条 try/catch 记 PASS/FAIL，脚本必须跑完 6 条——修复前那次 b 不弹框时 c 要记 SKIP 而不是崩掉。
3. **先在未改动的产品代码上跑一次，这是修复前的缺陷证据**：`node .tmp/e2e-r34-t1-footnote.mjs 9222 > .tmp/e2e-r34-t1-before.log 2>&1`，预期 **a PASS、b FAIL（不弹框）、c SKIP、f FAIL（自动保存把 `[^1]: 定义文字。` 写没）、d PASS、e PASS**。把 a/b/f 三段的原始输出贴进 `impl.md`——它同时是上一版 P1-3 要求的「修复前自动保存会静默落盘」实证，和上一版 P2-2 要求的「修复前跑一次」。
4. 改 `src/lib/risk.ts` 的 `activeLosses`（**含 `:365-368` 的 JSDoc**），加两条测试并改 `:96` 的用例名，改 `SaveDialog.tsx:63` 的文案；`node --experimental-strip-types src/lib/diff.test.ts` 全绿，`node --experimental-strip-types src/lib/footnotes.test.ts` 也要复跑（同一个 P0 面）。
5. 复跑 `node .tmp/e2e-r34-t1-footnote.mjs 9222 > .tmp/e2e-r34-t1.log 2>&1`，要求 **6/6 PASS**。截图 `shots/round-34/t1-footnote-gate.png`：b 那一步的确认框（能看到「脚注 [^1] 的定义在保存后会消失」与「取消」「仍然保存」；若 `onOpenSource` 也传了会多一个「在源码模式看原文」，属正常）。截图在复跑时拍，别在修复前那次拍。
6. **T1 不跑任何构建**：`M_0` 已是 finder 的实测值（步骤 1），全轮只有一次真正的体积测量（根代理决策点 A，硬约束 3）。T1 结束时在 `impl.md` 记一句「未跑 `npm run build`、未跑 `vite build`、未写 `dist/`」。

**验收（可执行）**

- `npx tsc --noEmit` 无输出。
- `node --experimental-strip-types src/lib/diff.test.ts` 全 PASS（新增 2 条、改名 1 条）；`npm test` 仍是 **22 个文件**，条数 = 285 + 2（实际数字写进 `impl.md`）。`src/lib/risk.ts:365-368` 的 JSDoc 与 `src/lib/diff.test.ts:96` 的用例名都已改（P2-3），`:97-99` 的断言未动。
- `.tmp/e2e-r34-t1-footnote.mjs` 上述 a–e + **f（自动保存路径）6/6 PASS**，日志留 `.tmp/e2e-r34-t1.log`；**必过项 = c 的三条子断言（字节逐字节相同 / `[role=dialog]` 归零 / 没有新的「已保存」提示）+ d + f**：只有 b 过、d 不过（一律弹框）等于把正常编辑变成每次都要点确认；只有手动路径过、f 不过等于自动保存仍会静默落盘。c **不再断言 `dirty === true`**——该值按 `App.tsx:2528/:2552/:3742/:2853` 的既有语义合法为 `false`，执行代理**不许**为此改产品代码，也**不许把这个假 FAIL 当成任务失败**。任一必过项 FAIL 判 T1 FAIL。
- 修复前日志 `.tmp/e2e-r34-t1-before.log` 存在，且其中 **b FAIL、f FAIL（`[^1]:` 被自动保存写没）**；这两条与修复后日志对照贴进 `impl.md`（上一版 P1-3 的证据）。
- `shots/round-34/t1-footnote-gate.png` 存在且能看到该确认框。
- `git diff --stat` 里 T1 只含 `src/lib/risk.ts`、`src/lib/diff.test.ts`、`src/components/SaveDialog.tsx`。**执行代理不改 `docs/CHANGELOG.md`**：三行由根代理在集成时一次性写入。

**门禁**：`npx tsc --noEmit`；`npm test`。体积由根代理在决策点 A 统一量，T1 不单独出数。
**体积**：预估 +25~35 B gzip（短路正则 + 一个条件；`SaveDialog.tsx:63` 删 8 个字是负的）；以根代理的 `M_A` 归因为准，T1 的 `M_0` 只作基线。
**风险**：① **自动保存路径的性能**——`activeLosses` 也走 `src/App.tsx:3109`（每 2 秒防抖）。短路条件保住了无脚注文档；有脚注定义的大文档每次自动保存会多跑一次全文 `classify`，本机没有 1 MB 带脚注样本，**记 UNVERIFIED**，补测：造一篇 1 MB、文末带 3 条脚注定义的文档，改一个字，量自动保存前后的 `performance.now()`。② **过度拦**：如果 `footnote-loss` 在正常编辑里被误触发（例如用户把定义行往下挪一格），每次保存都要点确认。e2e 的 d/e 两条就是防这个；若实测 d 失败，**不要**放宽成「只在基线命中时拦」，而要把 `footnoteLosses` 的判据收紧（例如要求「正文仍有引用且定义行从 `before` 里消失」的 id 集合精确相等），并把结论写进 `impl.md`。③ **真盘未验**：本轮只有假 FSA 环境，真实 Chrome/宿主走同一条 `performCommit` 写入路径，但没有在真盘手测 → 记 UNVERIFIED，补测见文末。
**截图**：`shots/round-34/t1-footnote-gate.png`。

---

## T2（P1，S–M，用户可见）查找关框与快速打开的焦点、同一篇不再弹切换框

**为什么**：`findings-bug.md` 第 2/3/4 条，三条都能用键盘 30 秒复现，都属「静默吞键/无意义确认」：

1. **`Ctrl+F` 后按 `Esc`，焦点掉到 `body`，接着打字全丢**（第 2 条，2/2）。`src/App.tsx:3490-3493` 的 Escape 分支只有 `setFindOpen(false)`，没有把焦点还给编辑器；同一段里侧栏分支（`:3486-3488`）就显式 `railToggleRef.current?.focus()`，是漏了一处不是设计如此。点查找条的「关闭」按钮（`:4575` 的 `onClose`）同样掉焦点。
2. **快速打开选中**当前正在编辑的这一篇**（脏状态）会弹「切到它之前要保存吗」三选一**（第 4 条）。`src/App.tsx:2118-2121` 的 `requestLoad` 只看 `dirty`，不比较目标与当前文档；快速打开的 `onSelect` 在 `:5067-5071`。**点「不保存」会把当前这篇的未保存改动丢掉**（`discardAndSwitch` → 从磁盘重载同一篇），一次误点就是数据丢失。
3. **快速打开选中别的文件后焦点留在文件树，接着打字丢键**（第 3 条，2/2，12 个字符一个都没进正文）。

**改动文件**：只有 `src/App.tsx`。

1. **模块级焦点助手**（放在组件外面、`App` 定义之前，与其它模块级常量放一起）：

```ts
/** 把焦点送回正文：关浮层/关查找后都用它，否则下一次击键掉在 body 上（第 34 轮） */
const focusEditor = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('.ProseMirror')?.focus())
```

   - 做成模块级 `const`（不是 `useCallback`），这样它不进任何 `useCallback` 的依赖数组，省字节也省掉陈旧闭包问题。
   - 顺手把 `:2437`、`:2447`、`:2461` 三处逐字相同的表达式换成 `focusEditor()`。**本轮一开始就做**（决策点 A 梯子的第 2 级）：先做字节账更清楚，也避免「可选」与实施步骤自相矛盾。

2. **T2-a：`Esc` 关查找后把焦点还给正文**（`:3490-3493`）：

```ts
if (findOpen) {
  setFindOpen(false)
  focusEditor()
  return
}
```

3. **T2-b：查找条的「关闭」按钮同样还焦点**（`:4575`）：`onClose={() => { setFindOpen(false); focusEditor() }}`。

4. **T2-c：快速打开/文件树选中的就是当前这一篇时，直接返回、不弹切换框**（`requestLoad`，`:2111-2126`）：

```ts
if (dirty) {
  // 选中的就是当前这篇（快速打开里回车、文件树上点自己）：没有切换可言，别弹「要保存吗」
  const same = file?.handle && activeFile?.handle ? await file.handle.isSameEntry(activeFile.handle) : false
  if (same) {
    focusEditor()
    return
  }
  setPendingSwitch({ text, name, file })
  return
}
```

   - `activeFile` 是 `:334` 的 state；`useCallback` 依赖数组 `:2125` 加上 `activeFile`。
   - **只在 `dirty` 分支里跳过**：干净状态下点同一篇仍然从磁盘重读（那是现在唯一的重载/回滚入口，不许弄丢）。
   - **用句柄身份而不是 `path` 字符串**（P2-2）：单文件模式构造的节点是 `{ kind:'file', name: picked.name, path: picked.name, handle: picked.handle }`（`src/App.tsx:2161-2166`）——`path` 就是文件名。若按 `path` 比较，「打开 `D:\a\笔记.md`（脏）→ 再打开 `D:\b\笔记.md`」会被判成同一篇、静默无反应（不弹框、不打开、无提示）。`isSameEntry` 是 FSA 标准方法：真实句柄与假 FSA（`.tmp/r30-fsa.mjs:69-71`）都有；快速打开与文件树的节点都来自 `flattenFiles`（`src/lib/workspace.ts:310-314`），是树里的同一个句柄。
   - **句柄缺失时不短路**：`pickFile` 的 `<input>` 兜底返回 `handle: null`（`src/lib/workspace.ts:219`），`activeFile` 在宿主文档下也是 `null`（`src/App.tsx:334`）；这些情况 `same` 恒为 `false`，保持现在的「弹切换框」行为——宁可多弹一次，也不静默吞掉一次打开。`await` 落点对：`requestLoad` 的体本来就在 `async` IIFE 里（`src/App.tsx:2113`）。

5. **T2-d：快速打开选中后把焦点交给正文**（`onSelect`，`:5067-5071`）：

```tsx
onSelect={(picked) => {
  const node = flattenFiles(workspace?.root ?? null).find((file) => file.path === picked.path)
  if (node) void openWorkspaceFile(node)
  setQuickOpen(false)
  focusEditor()
}}
```

   - 只加在这一处，**不要**加进 `loadIntoEditor` 或 `requestLoad` 的成功分支：那会让「文件树里点一篇」也把焦点抢到正文，键盘用户就没法继续用方向键选下一篇（第 13 轮的树键盘行为会退化）。

**实施步骤**

1. **先写 E2E**（上一版审查的 P2-2：先跑修复前基线，不要先改代码再回滚）。`.tmp/e2e-r34-t2-focus.mjs` 从 `.tmp/e2e-r34-bug-probe8.mjs` 与 `probe7.mjs` 复制结构，**第一件事是在 `addInitScript` 里关掉自动保存**（上一版 P1-2：`autoSave` 默认 `true`（`src/lib/settings.ts:42`），防抖 2000 ms（`src/App.tsx:3166-3173`）；不关的话 d 会假通过、f 会假失败）：
   ```js
   await page.addInitScript(() => {
     try { localStorage.setItem('sidelight.settings.v1', JSON.stringify({ autoSave: false })) } catch {}
   })
   ```
   - 放在 `installFakeWorkspace(...)` 之前（两者都是 `addInitScript`，都在 `goto` 之前注册；键见 `src/lib/settings.ts:27`，`loadSettings` 在 `:89` 认 `autoSave !== false`，写一个字段就够；`reset.mjs` 清完 localStorage 后这行仍然生效）。
2. 6 条断言，每条把 `document.activeElement` 的 `tagName.className`、`window.__slState?.dirty`（`src/App.tsx:669-672`）与正文文本打进日志：
   - **打字前必须先点正文**（P2-1）：d/f 要在正文里打一个字，脚本必须 `await page.locator('.ProseMirror').click()` 之后再 `keyboard.type`，并把点完后的 `active` 一起打进日志。不点的话字进不了正文、`dirty` 停在 `false`，d/f 的 dirty-guard 直接记 FAIL，测到的是「焦点本来就在 body」而不是「自动保存没关住」。
   - **e 不许点正文**：e 测的就是「`Enter` 后焦点自动进正文」，先点一下会把断言变成自证（修复前也会 PASS）。e 的写法固定为：快速打开 `Enter` → **立刻** `keyboard.type('PALETTETYPED')` → 读正文。
   - **每条结尾统一收尾**（P2-1）：`if (await page.locator('[role="dialog"]').count()) { 点「取消」（src/App.tsx:5037-5039）; await page.waitForTimeout(300) }`，保证下一条从干净状态开始；否则 d 残留的切换框会吞掉 f 的 `Ctrl+P`（`src/App.tsx:3466` 的 `dialogOpen` → `:3533-3536` 只 `preventDefault`、不执行）。
   - **a**：开 `甲.md` → 点正文 → `Ctrl+F`（焦点在 `.find-input`）→ `Esc` → `document.activeElement` 是 `DIV.ProseMirror`（或其内部），**不是 `BODY`**。
   - **b**：`Esc` 后直接 `page.keyboard.type('KEY')` → 正文里出现 `KEY`，字数增加（修复前：字数不变）。
   - **c**：`Ctrl+F` → 点查找条的关闭按钮（`src/App.tsx:4575`）→ 焦点同样在 `.ProseMirror` 内。
   - **d**：开 `甲.md` → 打一个字（保持脏）→ `Ctrl+P` → 输入 `甲` → `Enter` → **`[role="dialog"]` 数量为 0**、文档标题仍是 `甲.md`、刚才那个脏字仍在正文里（**没有走「不保存」重载**）。**按 Enter 前必须先读 `window.__slState?.dirty`：不是 `true` 就记 FAIL 并打 `## dirty-guard dirty=false`，绝不按 Enter**，否则测的是「自动保存已写盘」而不是 T2-c 的新分支。
   - **e**：干净状态下 `Ctrl+P` → 选 `乙.md` → `Enter` → `page.keyboard.type('PALETTETYPED')` → 正文里出现 `PALETTETYPED`（修复前 `landed:false`）。**进 e 之前先 `Ctrl+S` 保存 `甲.md`，再等 `__slState.dirty === false`（最多 1500 ms）才开快速打开**；脏着开会变成第二次 f。
   - **f（回归，必须有）**：脏状态下 `Ctrl+P` → 选**另一篇** `乙.md` → `Enter` → **弹出切换框**，且 `document.activeElement` 在 `.dialog` 内部（证明 `focusEditor` 没抢走确认框的焦点；这是 T2-d 唯一可能弄坏的东西）。同样先读 `dirty === true`，不是就记 FAIL。
   - **执行顺序 a → b → c → d → f →（弹出框就点「取消」）→ `Ctrl+S` 保存 `甲.md` → 等 dirty=false → e**；d/f 里打字之后的 `waitForTimeout` 各 **≤800 ms**（自动保存已关，等待只影响速度，不影响 dirty）。
3. **在未改动的 `App.tsx` 上跑一次**：`node .tmp/e2e-r34-t2-focus.mjs 9222 > .tmp/e2e-r34-t2-before.log 2>&1`。修复前预期：**a/b/c/d/e FAIL**（a/b/c 焦点在 `BODY`；d 弹切换框；e 的 `PALETTETYPED` 没进正文），**f PASS**（修复前脏状态下换篇本来就弹框，所以 f 不该红）。**预期只是参考，不许当判据**：判 d/f 之前先看日志——`## dirty-guard` 里 `active` 不是 `.ProseMirror` → 脚本没点正文（先修脚本）；`active` 对而 `dirty=false` → 自动保存没关住（先修脚本）；两者都正常还失败，才是要看产品的场合。f 若因 d 残留模态而红，先按上面「统一收尾」补清模态再重跑。这份日志就是验收要的「修复前原始输出」；**不要用 `git stash` 回滚**（没时间，也容易把别的改动带坏）。
4. 加 `focusEditor`（顺手合并 `:2437/:2447/:2461`，这是决策点 A 梯子的第 2 级，一开始就做），`npx tsc --noEmit` 通过。
5. 依次做 T2-a → T2-b → T2-c → T2-d，每步改完 `npx tsc --noEmit`。
6. 复跑 `.tmp/e2e-r34-t2-focus.mjs`，**6/6 PASS**，日志留 `.tmp/e2e-r34-t2.log`；截图 `shots/round-34/t2-find-esc-typing.png`（b 那一步之后：正文里能看到 `KEY`）。
7. T2 不做体积测量（决策点 A 归根代理，硬约束 3）。

**验收（可执行）**

- `npx tsc --noEmit` 无输出。
- `.tmp/e2e-r34-t2-focus.mjs` **6/6 PASS**，尤其 **f 不许失败**（它一旦失败，说明 T2-d 把切换确认框的焦点抢了，属回归，要么按「梯子第 3/4 级」顺延 T2-d，要么改成只在没有确认框时聚焦）。**判 f/d 失败前按顺序看日志**：① `## dirty-guard` 的 `active` 不是 `.ProseMirror` → 脚本没点正文（脚本问题，先修脚本）；② `active` 正确而 `dirty=false` → 自动保存没关住（`addInitScript` 失效，也是脚本问题）；③ 两条都正常还失败，才是产品回归，不许据此回改 T2 的正确部分。
- `.tmp/e2e-r34-t2-before.log`（修复前）与 `.tmp/e2e-r34-t2.log`（修复后）都在；把「修复前 activeElement=BODY、字数不变 / 修复后 activeElement=DIV.ProseMirror、字数 +3」的原始输出贴进 `impl.md`（这是 T2 的证据核心）。
- `git diff --stat` 里 T2 只含 `src/App.tsx`。**执行代理不改 `docs/CHANGELOG.md`**（根代理集成时写）。
- `shots/round-34/t2-find-esc-typing.png` 存在。

**门禁**：`npx tsc --noEmit`；**e2e 6/6 PASS**；本轮不新增/不改测试文件（焦点行为只能在真实浏览器里断），用 e2e 日志当证据；体积不在 T2 出数（决策点 A 归根代理）。**`keyboard-acceptance` 52/52 从本任务移出，由根代理在集成后跑**（见「轮次收尾」0b）：它覆盖「Esc 关菜单回触发器」「opener 卸载后 Esc 焦点不落 body」「`?` 一览 Esc 归还」等相邻分支，但 T2 改完才跑得有意义，摆在执行者路径上只会挤掉 e2e 复跑。执行者若在 T3 结束后还剩 ≥3 分钟，可以顺手先跑并把输出交根代理，**不跑不算 T2 失败**。
**体积**：预估 +50~100 B gzip（一个模块级函数 + 四处调用 + 一个 `isSameEntry` 判断），合并 `:2437/:2447/:2461` 可回收约 60~90 B 原始字符；**以 `M_A` 实测为准**，超线按全轮约束 3 的梯子砍。
**风险**：① T2-d 与切换确认框抢焦点（f 断言就是护栏）。② `Esc` 在其它浮层（批注栏、设置、导出菜单）里已有自己的焦点归还逻辑，本轮只改 `findOpen` 这一支，**不要**顺手统一改造——那会把回归面扩到整页键盘行为。③ 源码模式（`textarea`）下按 `Ctrl+F`/`Esc` 的落点本轮没测，若 e2e 顺手覆盖到，实测行为按实际写进 `impl.md`，不许猜。④ **自动保存默认开**：d/f 靠脚本关掉自动保存（上一版 P1-2）。谁以后删掉脚本开头那句 `addInitScript`，d 就假通过、f 就假失败；f 假失败的误判会逼人回改一个本来正确的修复。这条写进 `impl.md` 留给下一轮。⑤ **诊断顺序**（P2-1）：d/f 红了先看 `active`、再看 `dirty`，最后才看产品；当前脚本下 `dirty=false` 有两个成因（没点正文 / 自动保存没关），不要一律当成「自动保存没关住」。
**截图**：`shots/round-34/t2-find-esc-typing.png`。

---

## T3（P1，S，安装/体积）首屏体积门进本地门禁 + 汇总行打印余量

**为什么**：`findings-ship.md` S1/S2。首屏只剩 **109 B**，而体积门（`scripts/measure-first-screen.mjs`）**不在 `npm run build` 里**：`package.json` 的 `build` 是 `tsc --noEmit && vite build`（planner 实读），measure 只在 CI（`.github/workflows/ci.yml:39`、`release.yml:82,155`）单独跑。改代码的代理本地看到 build 通过，实际 +110 B 就会被 CI 判红，白掉一次返修。同一份报告还指出 `STATE.md:52` 的数字落后一轮（把余量夸大成 948 B）——那条是根代理收尾的事，见「轮次收尾」。

**改动文件**

1. `package.json` 的 `scripts`（`dev` / `build` 之后加一行，`build` 本身**不动**）：

```json
"verify": "npm run build && node scripts/measure-first-screen.mjs",
```

   - **不改 `build` 的原因**：`npm run build` 还被 `ci.yml:58`（windows-host）与 `ci.yml:128`（macos-host）调用，把 measure 塞进 `build` 会让 macOS/Windows runner 也跑同一个 gzip 字节门；不同平台 zlib 的 gzip 字节可能有几十字节差异，本轮**无法在 CI 上验证**，不冒这个险。
   - **`verify` 只给本地用**，`.github/workflows/*` 本轮零改动：ubuntu 的 `gate` 已经在 `ci.yml:38` 跑 build、`:39` 跑 measure，两次调用与 `verify` 等价，改 workflow 没有收益只有风险。
   - `verify` 里用 `npm run build`（而不是重抄一遍）保持单一来源。

2. `scripts/measure-first-screen.mjs:56` 的汇总行加 `headroom`（省掉抄数字的人手算）：

```js
console.log(`total raw=${totalRaw} gzip=${totalGzip} headroom=${max - totalGzip} files=${entries.length} max=${max}`)
```

   - **不要**改 `:64-67` 的 FAIL 分支与退出码；**不要**改 `--max` 默认值（286000 是硬门）。
   - 全仓库没有脚本解析这一行的字段（planner 用 `Select-String` 扫过 `measure-first-screen|total raw|headroom`：命中的只有本文件、`docs/CHANGELOG.md` 一句历史和三个 workflow 的调用），加字段安全。

3. `AGENTS.md` §3「门禁」：在 `npm run build` 之后补一条 `npm run verify`，并写清分工——「`build` 只保证能构建；首屏字节门在 `verify` 里，改过 `src/` 就要跑」。**不改 §3 其它条目**（`npm test` 条数已在第 33 轮改过）。

4. `README.md` 的命令段（`## 跑起来` 一带）补一行 `npm run verify  # build + 首屏 gzip 字节门`。**不改** `README.md:99` 的体积数字（本轮 Finder 实测 285,891 已是现状，等根代理收尾统一改）。

**实施步骤**

1. 加 `verify` 脚本与 `headroom` 字段。
2. 改 `AGENTS.md` §3、`README.md` 命令段。
3. **正反复验两条命令**（这才是 T3 的证据，不许只写「已加」）：
   - 正例：`npm run verify` → 末行形如 `total raw=929933 gzip=… headroom=… files=2 max=286000` 后接 `PASS`，退出码 0。**注意这一步会写 `dist/`，所以 T3 放在最后做。**
   - 反例：`node scripts/measure-first-screen.mjs --dir dist --max 285000` → 打印 `FAIL 首屏 gzip … 超过上限 285000`、`headroom` 为负数、退出码 1（证明门真的会咬）。
   - 两条的原始输出都贴进 `impl.md`。

**验收（可执行）**

- `npm run verify` 退出码 0，输出含 `headroom=` 且 `PASS`。
- `node scripts/measure-first-screen.mjs --dir dist --max 285000` 退出码 1。
- `node -e "const s=require('./package.json').scripts; console.log(s.build, '|', s.verify)"` 打印的 `build` 与改前逐字相同、`verify` 为新脚本。
- `git diff --stat` 里 T3 只含 `package.json`、`scripts/measure-first-screen.mjs`、`AGENTS.md`、`README.md`。**执行代理不改 `docs/CHANGELOG.md`**（根代理集成时写）。
- `.github/workflows/*` **零改动**（`git status` 自查）。

**门禁**：上面两条正反命令；`npx tsc --noEmit`（改的是脚本与文档，跑一次防手滑）。
**体积**：产品 0 B（改的是构建脚本与文档）。
**风险**：① `npm run verify` 会写 `dist/`，与「实施期间不跑 `npm run build`」的旧纪律冲突——本轮只有一个执行代理、无并发，计划特批这一步，但**只在 T3 收尾时跑一次**。② 有人以后把 measure 塞进 `build` 会碰到全平台 gzip 差异（风险说明见上「不改 build 的原因」）；这条要写进 `impl.md` 留给下一轮。③ 新增一条门禁会多花约 0.2 秒，可接受。
**截图**：不需要（无界面变化）。

---

## 文件归属与执行顺序

**拓扑：一个执行代理，串行 T1 → T2 → T3。本轮不并行、不用第二个 CDP 端口、不建第二个构建目录**（预算 32 分钟、上限 35 分钟，只剩约 3 分钟余量，不留并行调度余量）。

| 任务 | 文件 | 执行者 |
| :--- | :--- | :--- |
| T1 | `src/lib/risk.ts`、`src/lib/diff.test.ts`、`src/components/SaveDialog.tsx` | 执行代理（**第 1 个做**，P0 排最前） |
| T2 | `src/App.tsx` | 执行代理（**第 2 个做**） |
| T3 | `package.json`、`scripts/measure-first-screen.mjs`、`AGENTS.md`、`README.md` | 执行代理（**最后做**，它要写 `dist/`） |

- 顺序理由：T3 的 `npm run verify` 会写 `dist/`，排最后；T1 是 P0 数据安全，排第一。
- `docs/CHANGELOG.md` 三行**由根代理在集成时一次性写入**；执行代理不改它（三处验收已按此写，不要自己补）。
- **决策点 A 由根代理**在执行代理交付后执行一次（硬约束 3）；执行代理**全程不做体积测量**（`M_0` 用 finder 实测值，T2 早报构建已在 rev3 删除）。
- 轮末 `npm run build` + `npm test` + `node scripts/measure-first-screen.mjs` 由根代理串行跑；**`keyboard-acceptance` 也从执行者路径移到这里**（见「轮次收尾」0b）。
- **超时纪律**（预算 32 分钟，35 分钟上限只余约 3 分钟）：T1 是 P0，**不许为省时间减断言**；**T1 的 c 字节子断言与 f（自动保存路径）并列，两条都不许减、也不许换成 `dirty` 判断**——它们是 P0「不静默」与「自动保存也拦」的唯一可观测证据。任何任务到点没跑完，先把已有的日志与数字写进 `impl.md` 再交根代理，**不许跳过复跑、不许把没跑过的断言写成 PASS**。真要砍，顺序是 T2-d（等于梯子第 4 级）→ T3 的两行文档（`verify` 脚本与正反例输出优先交）。
- **为什么不能并行**（写给以后想把计划拆开的人）：`.tmp/reset.mjs:28-32` 会关掉该端口下所有 localhost 页面、`:36-52` 清 localStorage/IndexedDB，两个代理同时跑 e2e 会互相关页面、清掉对方的假工作区，断言随机红/随机绿；`.tmp/build-r34` 是唯一构建目录，Vite 的 `emptyOutDir` 会让并发构建互相清空，`measure-first-screen.mjs:39-44` 读到半成品就得到错的 gzip，而这是本轮唯一的硬门。**本计划不采用两代理**；若根代理硬要临时拆分，必须同时满足三条：第二个代理用 CDP **9223**（本轮实测 9222/9223/9224 都是 200）、它的构建目录改 `.tmp/build-r34b`、`npm run verify` 与所有 measure 排到两人收工后由根代理跑。

## 轮次收尾（根代理做，不在上表内）

0. **决策点 A（硬约束 3）先跑**：`npx tsc --noEmit` → `npx vite build --outDir .tmp/build-r34` → `node scripts/measure-first-screen.mjs --dir .tmp/build-r34`，得 `M_A`；超线先按梯子逐级回改，再往下走。
0b. **`keyboard-acceptance` 52/52（从 T2 门禁移到这一步）**：`node .tmp/reset.mjs 9222` → `SIDELIGHT_CDP=http://127.0.0.1:9222 node scripts/keyboard-acceptance.mjs http://localhost:5175`，必须 **52/52 PASS**（第 33 轮基线）；跑完**立刻** `git checkout -- shots/round-05/`（AGENTS §8：该脚本会覆盖已跟踪的历史截图），并把 `git status` 贴进交接说明。失败先按 AGENTS §8 分辨「脚本过期」还是「产品回归」，是产品回归就回改 T2，不许改断言放过。**执行代理若在 T3 结束后还剩 ≥3 分钟，可以先跑并把输出交根代理；不跑不构成任务失败。**
1. `docs/iteration/STATE.md`：`:52` 的首屏与测试数字改成 **285,891 B（余 109 B）/ 22 文件 285 条 + 本轮新增条数**（数字以轮末实测为准，不要抄这里的预算值）；`:130` 的「第 32 轮完成… HEAD `e9d90a8`」改成第 34 轮与轮末实际 HEAD（改前 HEAD 是 `186dfeb`）；轮次表加第 33/34 行；「下一轮优先」把「工作区图片破图」提到第一位并写「先配一个省字节任务」。
2. `docs/CHANGELOG.md`：`## Unreleased（第 29–34 轮，未发版）` + 第 34 轮三行（按全轮硬约束 1 的措辞）。
3. `README.md`：「现在能做什么」加脚注定义丢失拦截与查找/快速开关注焦一条；「现在不能做什么」把三处焦点修复记为已修；`README.md:99` 的体积与 `:117` 的测试条数按实测更新。
4. **不要**在 STATE 里写「图片已修」或「链接可打开」——两条都没做。

## 不在本轮范围（写清原因，别让下一轮猜）

1. **工作区图片破图（Typora P1，第 32/33/34 三轮提出）**：本轮仍不做。原因见「本轮取舍」三条（60 分钟超预算、前端单独交付会在宿主路径工作区里失效、NodeView 注册必然破 109 B）。**下一轮的第一件事，且必须与「省字节」同轮**。起步方案沿用第 33 轮：`src/lib/imageResolver.ts` 走动态 import（首屏 0 B）+ `Image.addNodeView`（DOM 仍是 `<img>`、`src` 用 blob URL、`data-md-src` 存原相对路径、`renderHTML` 与序列化仍读 `node.attrs.src`、存盘字节不变）+ `host/Program.cs` 的 `/__asset?path=`（限工作区内）+ `asset.ts` 的落盘规则与设置项；UNVERIFIED 提醒：假 FSA 写不出真 PNG 字节，验证要在真实文件夹或宿主里做。
2. **链接只能编辑不能打开（Typora P1，本轮新增）**：`LinkEditor` 加「打开 ↗」约 30 行 + 宿主 `Process.Start` 约 15 行，首屏估 +250 B，**超本轮 109 B 余量**，且要重建宿主与跑 `host-smoke`。下一轮与省字节任务一起排；协议只放 http/https，`javascript:`/`file:` 拒绝要有单测。
3. **表格列宽拖拽 + 列对齐 UI（Typora P1，三提）**：`columnResizing` 约 +1.5–2 KB gzip，**直接吃掉全部余量并超线**，必须等省字节任务腾出空间；序列化还要剥 `colwidth`，否则「保存前对比」每次报规范化。单独立轮。
4. **代码块语言标签 + 复制按钮（0 依赖子集）**、**成对退格**、**大纲全部折叠/过滤**、**查找区分大小写/整词**、**禅模式/全屏**、**字数明细加「行」**、**文件树创建副本/在资源管理器显示/按修改时间排序**、**源码模式行号**：全部 P2，且**每一项都要进主 chunk 几十到几百字节**，在 109 B 余量下都做不了。统一排在「省字节」之后。
5. **finder-bug 的两条重复项（rename 后提示「已刷新：新增 1 个，消失 1 个」；删除确认框与「撤销」提示自相矛盾）**：第 29/33 轮已列，本轮仍排在预算外。删除确认框那段在惰性 chunk `TreeActions.tsx`（`:287-293`），**首屏 0 B**，是下一轮最容易顺带修的一条。
6. **finder-ship 的文档与发布面**：S3（`docs/typora-gap.md` 把 6 项已实现能力列在「缺的」+ `README.md:206-210` 下一步按这张表排序）本轮不做——它是纯文档活约 10–15 分钟，本轮三个任务的预算 32 分钟已排满；给的现成配方在 `findings-typora.md:173-195`（该文件第 3 节的逐行修正表可直接照抄，改完表头计数要与逐行数一致）。S4（`packaging/README.md` 三处与脚本/发布事实不一致，含 `installer.ps1:35` 用 SourceForge 直链且不校验哈希）、S6（发版 preflight 不查 `## Unreleased` 是否收口）**必须在下一次发版前做完**，本轮不发版所以不占预算。S5（CI 的 `host-smoke` 少跑 `--fsa`）本轮不改 CI，无法本地验证。
7. **Mermaid**：ADR-0017 的三选一仍等产品负责人裁决，未裁决前不引依赖、不改安装包硬线。
8. **`release/SHA256SUMS.txt` 是 0.26.0 残留**（本地卫生，`release/` 不进版本控制）——按角色要求本轮不碰 `release/`。
9. **本轮不补第四个任务**：三个任务合计 32 分钟，35 分钟上限只余约 3 分钟。第 33 轮的教训（「没验过的『缺』不算缺」）继续生效：任何替补候选都要先做零改动基线探针。

## 证据与 UNVERIFIED（本轮 planner 实读/实跑）

**planner 亲手核对过的行号**（不是引述 finder）：

- `src/lib/risk.ts:129-190`（`footnoteLosses`：`:164` 的三条件判据、`:168` 的 label）、`:308-311`（`hasReferenceDefinitions`）、`:361-363`（`baselineLosses`）、`:369-375`（`activeLosses`，**`:370` 就是那行早退**）。
- `src/lib/footnotes.ts:26-55`（`parseBlocks`，`:45` 的 `return null` 是定义被留在正文的原因）、`:62-73`（`extractFootnotes`）、`:85-87`（`repairFootnoteRefs`）。
- `src/App.tsx:334`（`activeFile` state）、`:690`（`useDialogFocus(pendingSwitch !== null, switchDialogRef)`）、`:1007-1020`（宿主载入时算基线）、`:1836-1844`（首屏送焦点，带 `findOpen` 等排除条件）、`:1967-2010`（`loadIntoEditor`，`:1993-2003` 算基线）、`:2111-2126`（`requestLoad`，`:2118` 只看 `dirty`）、`:2172-2185`（`openWorkspaceFile`）、`:2437/:2447/:2461`（三处逐字相同的 `.ProseMirror` 聚焦）、`:2459-2460`（**两行完全重复的 `show(\`已新建 ${name}\`)`**）、`:2525-2549`（保存成功后 `setOriginalText(withEol)`、`keepLosses` 时保留基线——所以源码保存后基线仍是空数组，这正是 P0 漏网的原因）、`:2833`（手动保存门）、`:3108-3114`（自动保存门）、`:3462-3519`（全局键盘，`:3490-3493` 是 `findOpen` 的 Escape 分支）、`:4561-4578`（`FindBar`，`:4575` 的 `onClose`）、`:5023-5044`（切换确认框，三个按钮「取消/不保存/保存并切换」）。
- `src/lib/diff.test.ts:6`（已 import `activeLosses`）、`:96-100`（「基线为空时永不拦」，引用式链接用例，本轮语义不变必须继续绿）、`:226-246`（三条脚注损失用例）。
- `src/components/SaveDialog.tsx:61`（标题「保存后这些写法会被改写」）、`:63`（**现在写「在载入时就存在」——本轮修复后这句不成立，必改**）、`:93-98`（「取消」/「仍然保存」），以及 `src/App.tsx:29`（`SaveDialog` 是直接 import，**在主 chunk**，不在 `:23-43` 的 `lazy()` 名单里）。
- `package.json` 的 `scripts.build` 实测是 `"tsc --noEmit && vite build"`（不含 measure）；`scripts.measure` 汇总行在 `scripts/measure-first-screen.mjs:56`，FAIL 分支在 `:64-67`。
- 全仓库 `measure-first-screen|total raw|headroom` 的命中：`scripts/measure-first-screen.mjs:2,56`、`docs/CHANGELOG.md:24`、`.github/workflows/ci.yml:39`、`release.yml:82,155` —— **没有脚本解析汇总行**，加 `headroom` 字段安全。
- `git log --oneline -8`：HEAD 是 `186dfeb`（第 33 轮），与 `findings-typora.md:5` 一致；`git status --porcelain` 只有 `docs/iteration/round-34/` 与 `shots/round-34/`。
- 复现脚本已存在可直接改：`.tmp/e2e-r34-bug-probe5.mjs`（P0 四步 + `readFakeFile`）、`probe7.mjs`（Ctrl+F → Esc → 打字）、`probe8.mjs`（快速打开后焦点）。三者都用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `readFakeFile`。
- 首屏与测试现状（本轮 finder 实跑，planner 未重跑）：`measure` 输出 `total raw=929933 gzip=285891 files=2 max=286000` → PASS，余 109 B（`findings-ship.md:22-28`）；`npm test` 22 文件 285 条（`findings-ship.md:15`）。
- **rev 2 为改拓扑与两处 e2e 证据新增的实读**：`.tmp/reset.mjs:28-32`（关掉本端口所有 localhost 页面）、`:36-52`（清 localStorage/sessionStorage/IndexedDB/caches）、`:58`（关掉自己新建的页面）；`scripts/measure-first-screen.mjs:39-44`（逐个 `statSync` + `readFileSync`，读到半成品就得到错的 gzip）、`:56`、`:64-67`；`src/lib/settings.ts:27`（`sidelight.settings.v1`）、`:42`（`autoSave: true`）、`:89`（`autoSave: parsed.autoSave !== false`，所以 `{autoSave:false}` 一个字段就够）；`src/App.tsx:669-672`（`__slState` 在 dirty 变化时更新）、`:3166-3173`（2000 ms 防抖）、`:3091-3114`（自动保存门）、`:3742`（离开源码按基线重算 dirty）、`:4880-4894`（「需手动保存」与 `warn` 色）、`:2853`（`cancelConfirm` 只清 `pendingConfirm`，不碰 dirty）、`:5023-5046`（切换框三个按钮「取消/不保存/保存并切换」）、`:2459-2460`（两行逐字重复的 `show()`，梯子第 1 级确实可删）；`.tmp/e2e-r34-bug-probe7.mjs:44-46`（打字后等 3500 ms，自动保存已写盘）、`probe8.mjs:26-31`（500/500/1200 ms 的等待）。
- **rev 3 为修 5 条漏洞新增的实读**：`src/App.tsx:2113`（`requestLoad` 的体在 `async` IIFE 里，`await isSameEntry` 可以放）、`:2161-2166`（单文件节点 `path: picked.name`，P2-2 的证据）、`:2515-2552`（`finishSaved`：`:2528` 推进基线、`:2552` `setDirty(false)`）、`:839-847`（`onUpdate` 只在正文变化时改 dirty，所以开/关确认框不会改 dirty）、`:4828`（`.toast-text`）、`:5037-5045`（切换框三按钮）；`src/lib/workspace.ts:6`（`WorkspaceFileNode.handle: FileSystemFileHandle | null`）、`:219`（`<input>` 兜底 `handle: null`）、`:310-314`（`flattenFiles` 返回树内节点）；`.tmp/r30-fsa.mjs:69-71`（假 FSA 的 `isSameEntry`）；`src/lib/risk.ts:161-174`（`footnoteLosses` 三条件）、`:365-368`（旧 JSDoc 原文，P2-3）；`src/lib/diff.test.ts:96-100`（旧用例名与断言，P2-3）；`git log --oneline -1` = `186dfeb`、`git status --porcelain` 只有两个未跟踪目录——**P1-2 修法 ① 的前提（与 finder 同一棵树）成立**；`.tmp/critic-r34-dirty.log` 与 `.tmp/e2e-r34-bug-probe{5,7,8}.mjs` 均在。

**UNVERIFIED（本轮测不了，写清补测方法）**

1. **真实磁盘上的 P0 复现**：`findings-bug.md:181` 已声明只在假 FSA 上稳定 3/3。补测：`npm run dev` 打开一个真目录，按 4 步做一次，`git diff` 前后的 `.md` 字节，确认现在会弹框且点「取消」不写盘。
2. **`activeLosses` 新语义对自动保存路径的性能**：本机没有 1 MB 带脚注定义样本。补测：造一篇 1 MB、文末 3 条脚注的文档，改一个字，量自动保存周期里 `activeLosses` 的耗时（T1 风险①）。
3. **真实中文输入法下 `Esc` 后打字**：e2e 是合成键盘，不产生组合事件。补测：真人用微软拼音，`Ctrl+F` → `Esc` → 直接打中文，看是否落进正文。
4. **宿主（WebView2）/ macOS 里的三处焦点修复**：本轮只跑 `localhost:5175` + CDP 9222。补测：`host-smoke` 里加一步「`Ctrl+P` 选中后直接打字」。
5. **`npm run verify` 在新一轮 CI 的实际表现**：本轮不改 CI，`gate` 仍分开跑 build + measure，所以 `verify` 只在本地被验证过；`macOS/Windows runner` 上 measure 的字节一致性仍是未知（这也正是本轮不把 measure 塞进 `build` 的理由）。
6. **修复后 T2 六条断言的实测**：rev3 是只读修订，未在改过的代码上跑 e2e；6/6 是逐行推演 + 修复前实测的组合结论，由执行者实测。同理 T1 的 f（自动保存被拦 + 「需手动保存」）也待实测。
7. **真人点击文件树上「当前这一篇」是否也走 T2-c 的短路**：`openWorkspaceFile` → `requestLoad` 是同一条路径，但本轮只把快速打开的路径写进 e2e；真人右键/双击路径未单独测。
