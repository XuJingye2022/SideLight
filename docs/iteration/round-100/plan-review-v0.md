# 第 100 轮计划审查（critic）

结论：**REVISE**（2 条 P1）。范围与红线未破（无依赖/schema/编辑器改动、面板只读、不 push、不碰 release/），A1+A2 可行，A3 偏重。

## 已核对

- 实测体积：`node scripts/measure-first-screen.mjs --dir dist --max 320000` → raw 1,020,054 / gzip **314,726** / headroom **5,274** / 3 文件 / PASS，与计划 §1 逐值同；HEAD=`537c633`，dist 03:34 构建。
- 引用全对：`App.tsx:20`（lazy）、`:656`（baselineRef）、`:666`（contentRef）、`:1394`/`:3303`/`:4261`（三处写基线）、`:2427-2453`（rail-head/rail-tabs 进 flowBottom）、`:5989-6059`（props）；`useDialogFocus.ts:22` 四参；`revisions.ts:18` 正文不存；`diff.ts:9`（4000 行上限）/`:12-16`（CRLF 与末尾空行已归一）/`:128`；`measure-first-screen.mjs:8`。
- `diff.ts` 已因 `App.tsx:76`→`risk.ts:1` 进首屏 chunk，A2 从懒 chunk 引用不再抬首屏。
- `npm test` 现 59 文件 834 条，A1 的「60 文件、≥844 条」自洽。

## 漏洞与修法

**P1-1 基准选错：默认设置下「与上次保存」几乎恒为空。**
`baselineRef` 是脏标记基线，`finishSaved`（`App.tsx:3303`）每次写盘都更新；`scheduleAutoSave`（`:4003-4017`）停笔 **2,000 ms** 后 `runAutoSave→performCommit→finishSaved`，而 `autoSave` 默认 **true**（`settings.ts:67`）。用户停笔 2 秒后开面板只会看到「与上次保存相同」。A3 夹具固定 `autoSave:false`，①④ 覆盖不到默认路径。修法：加载入基线 ref（载入 `:1394`、新建 `:1465` 写，写盘不写，仍不加 state），`before` 用它，标签「与打开时相比」；或保留现语义，但 A3 加「默认 `autoSave:true`：改字→2.4 s→开面板」断言，并在空态与 B-227 行写明限制。

**P1-2 验收 ⑧ 的性能门槛无基线（第 53 轮规则）。**
「1 MB 打开到可见 ≤1,000 ms」无 HEAD 基线：`contentRef.current()` 是整篇序列化，`diffLines` >4,000 行才退化，否则最多 4,000×4,000 LCS。风险 3 的放宽只在风险节，⑧ 仍像硬门。修法：⑧ 改「记录实测，不作硬门；>2,000 ms 或 >2 s 长任务只记基线」，或先在 A1 用同夹具量 HEAD 再定；另加单行截断（如 500 字/行），否则 1 MB 单行文档造一行 1 MB DOM。

**P2-3 门 ⑥ 兜不住风险 1。** ⑥ 只比开面板前/后的卡 `top`，两者都在改动后；`.rail-head` 因新按钮永久增高（允许 ≤4px）时 ⑥ 仍全绿。修法：A3 先量 HEAD 的 `.rail-head` 高度与首卡 top（第 97 轮 114/278/460），断言增量 ≤4px。

**P2-4 体积账漏入口 chunk，门命令没写准。** `getDiff` 内联闭包在 `App.tsx`、进首屏 chunk（几十 B），「唯一进首屏的是 styles.css」不实；314,726+CSS 500+闭包仍低于 315,500，但账要写实。另 `package.json:13` 不带参数，`npm run verify --max 315500` 的透传本轮未验（npm 通常要 `--`）；写 `npm run verify -- --max 315500` 或直接 `node scripts/measure-first-screen.mjs --dir dist --max 315500`（本次已跑通）。

**P2-5 A3 归属与时限未写。** A1+A2 已占满 executor 25 分钟；A3 含 8 断言 + 2 回归 + 1 MB 夹具 + 截图 + `test.md`。请注明归 tester（15 分钟），把 ⑤⑥ 合并、⑧ 按 P1-2 降级。

**P2-6 标题与数据不一致。** 标题写「当前 vs 上一修订」，数据是「上次写盘/载入」；第 99 轮快照不存正文（`revisions.ts:18`），本轮做不成修订级 diff。面板标题与 B-227 行都写「与上次保存（含自动保存）」，否则下轮会把已知限制当缺陷重报。
