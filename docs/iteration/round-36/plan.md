# 第 36 轮计划（planner，**revision 3**）

> **revision 3（2026-11-17，planner-revision 第 3 次修订，最终版）**：按 `round-36/plan-review.md`（对 rev 2 的 REVISE：2×P1 + 4×P2）修订。任务结构（T1–T4）**不变**，不新增任务、不扩大范围；改动全在验收判据与两处事实口径。
>
> 指定修 3 条（P1-1、P1-2、P2-3）；**另外顺带修同一次审查里另 3 条 P2**（P2-4、P2-5、P2-6 —— 都是 rev 2 里的错误陈述，不修就会把错话写进 `impl.md`/README，且本轮正是整改「文档自相矛盾」）。**编号按本轮 `plan-review.md`；这里的新 P2-6（roundtrip）与 rev 2 表格里的 P2-6（README 测试数字）不是同一条。**逐条登记：
>
> | 审查 | 改法（一句话） | 落点 |
> | :--- | :--- | :--- |
> | **P1-1** rAF 竞态 → E2E 假失败 | 新增 **§0 E2E 通用等待规则**；T1 点「全部替换」后先 `waitForFunction(.annot)` + `waitForTimeout(800)` 再读三处；T2 三处焦点断言改成 `waitForFunction` 就位后再 `keyboard.type`；明文**禁止**为救断言把 rAF 改同步 | §0、T1 验收 2、T2 验收、T3 E2E 源码模式条 |
> | **P1-2** dev 依赖重优化（504/reload）→ 假判「渲染失败」 | T3 步骤 2 加第 6 步「预热 dev server」（趁临时 `useEffect` 还在，让 Vite 把 mermaid 预构建完）+ 步骤 3 收尾 20 s 手动确认 dev 能出图；E2E 分**段 0 预热**与**段 1 断言**，`## errors-warmup` 允许非空并写明「dev 重优化，非产品缺陷」，`## errors` 只统计段 0 之后 | T3 步骤 2 第 6 步、步骤 3 收尾、步骤 5、验收 E2E |
> | **P2-3** 体积门判据重叠 + 缺禁止项 | 门 A 改**单值** `assoc-dryrun ≤ 1,997,853 B`（2,000,000 − 2,147）才进步骤 3，其余一律门 B 硬停；内部线 1,800,000 只按 `installer.ps1:89-92` 的 WARN 口径**记录**；门 B 加 5 条禁止项（不动 `vite.config.ts` 的 external/manualChunks/alias、不删包内 chunk、不换库、不改线、不手工删 `dist`） | T3 步骤 2 第 5 步、§5 |
> | P2-4（顺带）README:103「只有两组」会变假话 | 改动表与步骤 6 加 `README.md:103`「两组 → **三组**」+ `:106` 后新增 Mermaid bullet（`AGENTS.md` §4 要求的理由行） | T3 改动表、步骤 6 |
> | P2-5（顺带）dry-run 并未跳过内部线提示 | 删掉 rev 2 `:226` 的错话：`installer.ps1:89` 打印 `target=1800000 gap=<差值>`、`:90-92` 的 `Write-Warning` 都在 `:94` 的 dry-run 分支**之前**，一定会打；被跳过的只有 `:117-129` 的 2,000,000 硬判与 SHA256 打印 | T3 步骤 2 第 4/5 步、§5 |
> | P2-6（顺带）`roundtrip` 不跑的理由站不住 | T3 落地时**跑一次** `npm run roundtrip` 并把结果写 `impl.md`（「装饰不进序列化」是判断，不是既成事实）；真跑不了的唯一替代 = E2E 里 `Ctrl+S` 后 fake FS 字节仍是原 fence | T3 步骤 4、门禁 |
>
> **P2-3 的算术方向（rev 3 自己核过，与审查的算式不同，结论不变）**：`findings-ship.md:134` 原话是「第 33 轮干跑 826,742 B vs 正式 824,595 B（**+2,147 B**）」→ **dry-run 比正式包大约 2,147 B**（不是小 2,147）。所以正式包 ≈ dry-run − 2,147，取 `≤ 1,997,853` 这个下界两个方向都安全：按实测方向 → 正式包 ≈ 1,995,706 B；万一方向反过来 → 1,997,853 + 2,147 = 2,000,000 恰好不越线。审查给的建议值照收，理由改成这条。
>
> - 轮前 startSha：`b3509c9f2610a480dc6878187c767267abd12678`（rev 3 修订时 `git rev-parse HEAD` 实测相同）。
> - rev 3 修订时实测：`git status --short` = `?? docs/iteration/round-36/`、`?? shots/round-36/`；`Test-Path node_modules\mermaid` = **False**（尚无人安装，步骤 1 仍有效）；`git grep -c mermaid -- src/` = 0；`dist` = **31 文件 / 1,471,108 B**（与 rev 2 基线逐字相同 → rev 2 之后没人动过产品代码）。
> - 另：保真提醒 —— **600 ms 持久化防抖的真实位置是 `src/App.tsx:1691`（`setTimeout`）到 `:1715`（`600`），`:1695` 是 host 分支的 `postMessage`**；rev 3 的 E2E 按 `:1691/:1715` 引用。
> - 版本策略、环境（5175 不重启、CDP 只 9222）、只读角色三条与 rev 2 相同；rev 3 只写本文件。
>
> **revision 2（2026-11-17，planner-revision）**：按 `round-36/plan-review.md`（REVISE：2×P0 + 3×P1 + 1×P2）逐条修订。任务结构（T1–T4）不变，不新增任务，不扩大范围。
> 修订登记（审查条目 → 改法 → 落点）：
>
> | 审查 | 改法（一句话） | 本节落点 |
> | :--- | :--- | :--- |
> | P0-1 | 删掉「再映射一次」：只删 `src/App.tsx:1795` 一行，映射交给既有监听器 `:1639-1683`；不新增 `remapAnnotations`；不改折叠丢弃分支；E2E 改成不等长替换 + 种子批注 | T1 全文 |
> | P0-2 | 体积门从「第 40 分钟记录」改成「接线后第 6–8 分钟硬停」；量法改用 `installer.ps1 -AssocDryRun` 出真字节并自行判定（dry-run 跳过脚本内的 2,000,000 检查）；越线则不落 T3 并回退 | T3 步骤 2（新决策门）、§6 |
> | P1-3 | 文件表加 `src/mermaid-dist.d.ts`（仿 `src/katex-dist.d.ts:1-6`） | T3 改动表 |
> | P1-4 | 步骤 1/2 调序：先 `npm install`，再取包事实（原步骤 0 在没装的目录上跑必然 ENOENT） | T3 步骤 1 |
> | P1-5 | 采纳审查修法 ①：`switchView` 离开源码且去 `edit` 时补 `focusEditor()`（1 行），让「`Ctrl+/` 退出后焦点回正文」的断言成立 | T2 改动 5、验收 |
> | P2-6 | T4 验收改用真实字符串 `21 个测试文件`（改前 1 → 改后 0）；`README.md:117` 一起改实测值；`scripts.test` 只追加 1 个文件；shim 契约点明 `__getLoadCount()` 并统一假 loader 形状 | T4、T3 改动表/验收 |
>
> **revision 2 另外修掉 2 条审查没提、但会让本轮假失败/假成功的计划错误**（实测得出，逐条给证据）：
>
> | # | 原计划错在哪 | 实测依据 | 改法 |
> | :-: | :--- | :--- | :--- |
> | R-1 | 原步骤 1 是「`npm install mermaid` 后立刻量 dist 增量」——什么都没引用它，Vite 不会把它打进 `dist`，量到的增量恒为 0，等于给了一个「体积没涨」的假通过 | `node_modules/mermaid` 现在不存在；`src/` 里 0 处 import；dist 由 Vite 按可达模块构建（`vite.config.ts:31-39` 只有 volume 设置，无手动 external） | 体积门挪到「代码真的引用了它之后」（步骤 2） |
> | R-2 | §5 写「首屏 gzip 必须仍是 286,056 B，变了 >1 KB 判 FAIL」——插件与 shim 是**静态**进主 chunk 的（同 `katexLazy.ts` 被 `@tiptap/extension-mathematics` 静态引入），首屏必然涨几百到 2 KB，这会把自己的正确实现判成 FAIL | `src/lib/katexLazy.ts` 被静态引入、首屏仍 PASS（katex 本体才在惰性 chunk）；`scripts/measure-first-screen.mjs:65` 的 banned 只看 URL | 首屏判据改成「`PASS` + 首屏集合仍 2 个文件 + 总量 ≤310,000」，允许 ≤+10,000 B 的静态代码增量，实测填表 |
>
> - 轮前 startSha：`b3509c9f2610a480dc6878187c767267abd12678`（`git rev-parse HEAD` 修订时实测相同）
> - 修订时 `git status --short` = `?? docs/iteration/round-36/`、`?? shots/round-36/`；`package-lock.json` 已被跟踪（回退命令可用）；`node_modules/mermaid` = False；`dist` = 31 文件 / 1,471,108 B（与 findings-ship 一致）
> - 版本策略：**不 bump** `package.json`（仍 0.32.1）；CHANGELOG 写进现有 `## Unreleased` 节。任何任务都不得改版本号。
> - 环境：dev server `http://localhost:5175` 已在跑（**不另起、不重启**）；浏览器只用 CDP **9222**（不启动 Edge、不 kill msedge）；每条 E2E 前先 `node .tmp/reset.mjs 9222`；不 push、不改 `release/`。
> - 只读角色：本轮 planner-revision 只写本文件，未改任何产品代码。

## 本轮范围（4 个任务，预算合计 **35 min**）

| 序 | id | 标题 | 类型 | 预估 |
| :-: | :--- | :--- | :--- | ---: |
| 1 | T1 | 「全部替换」不再清空页边批注（**一行删除**，位置交给既有监听器） | 数据安全 P1 | 4 min |
| 2 | T2 | 进源码即聚焦源码框；`Ctrl+/` 退出源码回正文 | 数据安全/丢键 P1 | 6 min |
| 3 | T3 | Mermaid 惰性渲染主路径（**接线后 1 秒量真字节，越线硬停**） | 用户可见 P0，产品负责人已批 | 22 min（含 2 min 硬门 + 40 s dev 预热） |
| 4 | T4 | 收尾三处一行改（release.yml 重发路径、README 两处测试数字、gap 表 Mermaid 行） | 发版/文档 P1-P2 | 3 min |

T1/T2/T3 都改 `src/App.tsx`，**必须串行**（同一文件不能并行交给两个 builder）；T1 与 T2 在**同一次编辑会话**里做完，共用一次 `npm run build`/`npm test`。预算分配：T1 4 + T2 6 = 10（共用一次 build），T3 22，T4 3。**T3 硬门失败时 T3 在 ~8 分钟处停手**，本轮实际只用 ~21 分钟（门 A 通过时 T3 吃紧，按 §6 第 1 条砍）。

## 0. E2E 通用等待规则（**rev 3 新增，T1–T3 一律适用**）

**凡「rAF（下一帧 ≈16 ms）或 600 ms 防抖之后才可能出现」的状态，必须先等到位再断言。** 直接读 `activeElement` 或直接 `keyboard.type` 会读/打到上一帧的状态，得到假失败（这正是 rev 2 的 P1-1，也是上一版 P1-5 的同型风险）。

| 情况 | 必用写法 | 依据 |
| :--- | :--- | :--- |
| 焦点靠 rAF 落到源码框 | `await page.waitForFunction(() => document.activeElement?.tagName === 'TEXTAREA', { timeout: 5000 })` | `focusSourceEditor`（本轮新增）与 `focusEditor`（`src/App.tsx:328`）、`:4591` 都是 rAF |
| 焦点靠 rAF 回正文 | `await page.waitForFunction(() => !!document.querySelector('.ProseMirror')?.contains(document.activeElement), { timeout: 5000 })` | 同上 |
| 批注高亮/卡片靠 React 重渲染 | `await page.waitForFunction(() => document.querySelectorAll('.ProseMirror .annot').length === 1, { timeout: 10000 })` | `src/App.tsx:1686` 的 render effect |
| 批注要过 600 ms 防抖才落盘 | `await page.waitForTimeout(800)` 再读 fake FS | `src/App.tsx:1691`（`setTimeout`）→ `:1715`（`600`） |
| mermaid widget 要先加载再渲染 | `await page.waitForFunction(() => document.querySelectorAll('.mermaid-preview svg').length >= 1, { timeout: 20000 })` | 400 ms debounce + 首次加载 ≥402,939 B gzip（ADR-0017 档 1b） |

- 等待超时 = **FAIL**，并在 FAIL 前打印现场：`activeElement.tagName` + `className`、`.annot` 个数与 `textContent`、`page.on('request')` 里含 `mermaid` 的 URL、fake FS 里那份 JSON 原文。**先打印再判**，避免「产品没修」与「等错了元素」混为一谈。
- `keyboard.type` 之前必须先确认焦点已经在目标元素上；否则字符掉在 body 上，`value` 长度不变。
- **禁止**为救断言把 `requestAnimationFrame` 改成同步 `.focus()`：那是计划外的产品改动，会与 `:4591`/`:328` 的先例不一致，而且 `setViewMode` 之前目标元素还没挂载、同步聚焦恒为空操作。
- 只加等待，不加断言数量；等待超时值都显式写，不用 Playwright 默认 30 s 拖时间。

---

## T1（P1 数据安全）「全部替换」不再清空页边批注

### 为什么

`findings-bug.md` 第 1 条（含实测输出）：`Ctrl+F` → 全部替换 → 正文改了，但页边批注从 1 条变 0 条、`.sidelight/annotations/批注.json` 被写成 `annotations: []`，`Ctrl+Z` 也回不来（state 不在撤销历史里）。批注里可能有「追问」「联网核对」的产出，丢了只能重跑分析。属静默丢数据。

### 根因（逐行核过）

- `replaceEvery` `src/App.tsx:1783-1796`：`:1793` `editor.view.dispatch(transaction)` → `:1794` `editor.commands.focus()` → `:1795` **`setAnnotations([])`**。**只有 `:1795` 这一句是根因。**
- **既有事务监听器 `src/App.tsx:1639-1683` 已经负责位置映射**：`:1642` 跳过非 `docChanged`；`:1646` 跳过 `addToHistory === false`（整篇替换/装饰刷新）；`:1654-1655` 用同一个 `transaction.mapping.map(from, 1)` / `map(to, -1)` 平移全部批注；`:1656-1659` 在 `to <= from` 时把该条丢掉。→ 删掉 `:1795` 后，「全部替换」与普通编辑走**同一条映射路径**，批注自动跟随，**不需要任何新代码**。
- 空数组被持久化 effect 写回：`:1690-1717`（`annotations.length === 0 && docNotes.length === 0` → `removeCache`，`:1706-1708`；有 overall 便签时走 `:1711` 写空数组）。
- 高亮只画 `status === 'pending'` 且 `from < to`（`src/lib/decorations.ts:46-63`）；页边卡片由 `annotations` state 驱动（`MarginRail`）。

### 改动文件 / 函数（**只此一处**）

| 文件 | 改法 |
| :--- | :--- |
| `src/App.tsx:1795` | 删除 `setAnnotations([])` 一行。`:1794` `editor.commands.focus()` 保留；`useCallback` 依赖数组 `[editor, matches, replacement]` 不变 |

**明确不做**（审查 P0-1 的要求）：

- **不新增 `remapAnnotations`，不在 `replaceEvery` 里再映射一次**。监听器已经对同一事务映射过，再映射一次 = 对同一个 `transaction.mapping` 应用两遍；替换串与原串不等长时批注整段偏移（等长的 `天空`→`苍穹` 偏移量为 0，测不出来）。
- **不改 `:1656-1659` 的丢弃分支**。语义定为本轮接受：批注引文被整段替换掉时该条仍按既有逻辑移除（与任何一次编辑相同）；本轮**不承诺**「折叠后 `to = from`、卡片保留」——那要改监听器 + handler 级单测，超出 35 分钟，写进 §8。
- 不动 `shiftAnnotations`（`src/lib/annotations.ts:415-428`；除 `annotations.test.ts:244,267` 外 0 调用方）。本轮不新增第二套位置算法，不存在「三套并存」；去留留到下一轮（§8）。
- 不新增单测（原计划的 4 条是给 `remapAnnotations` 的，函数不再存在）。数据安全证据走 handler 级 E2E（下面 2）。

### 实施步骤

1. 删 `src/App.tsx:1795` 一行；`git diff` 自查只有这一行。
2. 写 E2E 脚本（下面验收 2），先确认**改前**会 FAIL（`git stash` 跑一次，或直接引用 `findings-bug.md:37-39` 的实测：`"railAfter":"批注（0 条）"`、`"storeAfter"` 里 `annotations:[]`），再确认改后 PASS。
3. `npm run build`（与 T2 共用）。

### 验收标准（可执行）

1. 正向对照（改前/改后都贴）：`git grep -c "setAnnotations(\[\])" -- src/App.tsx` **改前 3 → 改后 2**，且 `git diff src/App.tsx` 只有 `:1795` 那一行被删。
   **另两处 `setAnnotations([])` 是正常逻辑，不许动**：`:2041`（换一篇文档时清空批注）、`:4802`（「换个目标重分析」前清空）。
   不许新增第二次映射：`git grep -n "remapAnnotations" src/` 与 `git grep -n "mapping.map" src/App.tsx` 在 `replaceEvery`（`:1783-1797`）区间内 **0 命中**（后者全文件本就只有 `:1654-1655` 监听器与 `:4199-4203` 草稿比对，改前改后都不变——这是结构约束，不是修复证据）。
2. E2E `.tmp/e2e-r36-fix-ann.mjs`（CDP 9222、视口 1440×900、先 `node .tmp/reset.mjs 9222`；模板抄 `.tmp/e2e-r36-bug-probe6.mjs` + `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace`/`readFakeFile`/`listFakeFiles`）：
   - **用种子批注，不点「分析」**（模拟模型的批注可能正好覆盖被替换的文字，映射后会合法地缩短，断言会歧义）。fake workspace 种子：
     - `批注.md` = `天空很蓝。天空很蓝。另一段也有天空。\n`
     - `.sidelight/annotations/批注.json` = `{"v":2,"annotations":[{"id":"a1","kind":"evaluation","status":"pending","from":3,"to":5,"quote":"很蓝","note":"这里可以更具体"}],"notes":[]}`
     - 键名依据 `cacheKey('批注.md') === '批注'`（`src/lib/cache.ts:51-58`）；打开文档时 `restoreAnnotationsFor`（`src/App.tsx:1921-1964`）会**按 `quote` 重新定位**（`:1949` `findRange`），所以种子里的 `from/to` 不精确也能用。
   - 打开后基线断言：`[aria-label^="批注（"]` = `批注（1 条）`；`.ProseMirror .annot` 个数 1 且 `textContent === '很蓝'`。
   - `Ctrl+F` → 查找 `天空`、替换 `天`（**不等长**；等长替换偏移恒为 0，测不出重复映射）→ 点「全部替换」→ **按 §0 先等再断言（rev 3，P1-1）**：
     ```js
     // ① 批注高亮/卡片要等 React 重渲染（App.tsx:1686）；不等就断言会读到 0 个
     await page.waitForFunction(() => document.querySelectorAll('.ProseMirror .annot').length === 1, { timeout: 10000 })
     // ② fake FS 要等 600 ms 持久化防抖之后（App.tsx:1691 → :1715）
     await page.waitForTimeout(800)
     ```
     - 正文 `innerText` = `天很蓝。天很蓝。另一段也有天。`（三处都替换）；
     - `.ProseMirror .annot` 仍是 **1** 个且 `textContent === '很蓝'`（正确 = 映射一次，落在 2–4；若被映射两次会落到 1–3 变成「天很」）；
     - `[aria-label^="批注（"]` 仍是 `批注（1 条）`；
     - fake FS `.sidelight/annotations/批注.json` 解析后 `annotations.length === 1`、`annotations[0].quote === '很蓝'`、`annotations[0].to - annotations[0].from === 2`。
   - `Ctrl+Z`：**同样先等**——`await page.waitForFunction(() => document.querySelector('.ProseMirror')?.innerText.includes('天空很蓝'), { timeout: 10000 })`，再 `await page.waitForTimeout(800)` 等撤销后的批注落盘；然后断言：正文回 `天空很蓝。…`；`.annot` 仍 1 且 `textContent === '很蓝'`；rail 仍 `批注（1 条）`。
   - **判 FAIL 之前先打印现场**（防「等待不够」被误判成产品缺陷）：`activeElement.tagName`、`.annot` 个数与 `textContent`、fake FS 里 `.sidelight/annotations/批注.json` 的原文。判读：FS 仍是旧内容 → 800 ms 不够，抬到 1500 ms 重跑一次；FS 已写成 `annotations: []` 且 `.annot` 为 0 → 产品真没修（真 FAIL，`setAnnotations([])` 没删干净）。
   - `## errors []`（console error 与 pageerror 各 0）。
3. 截图：`shots/round-36/impl-ann-after-replaceall.png`（右栏 1 张卡片 + 正文高亮都在）、`shots/round-36/impl-ann-after-undo.png`。
4. 门禁：`npm run build`、`npm test`（**不新增测试文件**，条数应仍是 22 文件 295 条；若变了说明动了别的地方）。

### 风险

- 若有人「顺手」把映射搬进 `replaceEvery`（复用旧计划代码），双映射回归：验收 1 的 `git diff` 单行检查就是拦它的门。
- 引文被整段替换时该条批注仍会消失（既有语义，本轮不改）：在 `impl.md` 写清，E2E 不测此情形，避免把既有行为当回归。
- 撤销后的位置精度不在本轮（React state 不在 undo 历史里；靠重开时引文重定位兜底）→ §9 UNVERIFIED。

---

## T2（P1 丢键）进入源码即聚焦源码框；`Ctrl+/` 退出源码回正文

### 为什么

- `findings-bug.md` 第 2 条：`Ctrl+/` 或点工具栏「源码」后焦点在 `BODY`，之后打的字全部丢（实测 6 个字符，源码框长度 18→18）。
- `plan-review.md` P1-5：计划原验收「再 `Ctrl+/` 后 `activeElement` 是 `.ProseMirror`、由现有 `focusEditor` 负责」**不成立**——现状退出源码也不聚焦，该断言会让 builder 收尾时得假失败或去改计划外代码。

### 根因（逐行核过）

- 进源码的三个入口都不碰焦点：`enterSourceFor`（`src/App.tsx:511-518`）、`switchView`（`:3761-3784`）、`toggleSource`（`:3786-3788`）；`<textarea className="source-editor">`（`:4772-4777`）无 `ref`、无 `autoFocus`。
- 退出源码也不碰焦点：`switchView` `:3764` 只 `applySource()`；`applySource`（`:3735-3755`）无焦点；全文件给「退出源码」补焦点的只有 Esc 分支（`:3535-3538`）与关查找条（`:4587-4597`，`:4591` 用 rAF 查 `textarea.source-editor`）。
- `focusEditor` 是**模块级**常量（`:324-328`，`requestAnimationFrame` + `document.querySelector('.ProseMirror')`），`switchView` 内可直接调用，无 TDZ / 依赖数组问题。

### 改动文件 / 函数（`src/App.tsx`，5 处）

1. 模块级常量（放 `:328` `focusEditor` 旁，同理由）：`const focusSourceEditor = () => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea.source-editor')?.focus())`。**不需要 ref**——选择器与关查找条 `:4591` 完全一致，省掉 ref 与 effect 依赖。
2. `switchView`（`:3761-3784`）：顶部把 `:3764` 的条件提成 `const leavingSource = viewMode === 'source' && next !== 'source'`，`if (leavingSource) applySource()`；末尾 `setViewMode(next)` 之后加
   ```ts
   if (next === 'source') focusSourceEditor()
   else if (leavingSource && next === 'edit') focusEditor()
   ```
   （预览不是聚焦目标：`PreviewPane` 是 `contentEditable=false` 且无 `tabindex`，`:4779-4780`）
3. `enterSourceFor`（`:511-518`）：末尾 `if (!fromLoad) focusSourceEditor()`（载入即源码的路径不抢焦点）。

`useCallback` 依赖数组不变（两个函数都是模块级常量）。

### 验收标准（可执行）

E2E `.tmp/e2e-r36-fix-source-focus.mjs`（CDP 9222、先 `reset.mjs 9222`、fake workspace 抄 probe6）：

**时序约束（rev 3，P1-1）**：本轮三处聚焦全部走 `requestAnimationFrame`（改动 1 的 `focusSourceEditor`、改动 2 的 `focusEditor()`；同源先例 `src/App.tsx:4591`、`:328`）。rAF 在下一帧（≈16 ms）才跑，而 Playwright 的 `press`/`evaluate` 是 1–3 ms 的本机 CDP 往返 → **每次 `keyboard.type` 之前必须等焦点就位**，否则字符掉在 body 上、`value` 长度不变，看起来像「产品没修」。

脚本骨架（四段都照这个形状写）：

```js
const focusInTextarea = () => page.waitForFunction(
  () => document.activeElement?.tagName === 'TEXTAREA', { timeout: 5000 })
const focusInProseMirror = () => page.waitForFunction(
  () => !!document.querySelector('.ProseMirror')?.contains(document.activeElement), { timeout: 5000 })
const sourceValue = () => page.evaluate(() => document.querySelector('textarea.source-editor')?.value ?? null)
```

- **① 键盘进源码**：`page.keyboard.press('Control+/')` → `await focusInTextarea()` → `const len0 = (await sourceValue()).length` → `page.keyboard.type('Z')` → `page.waitForFunction(() => document.querySelector('textarea.source-editor')?.value.endsWith('Z'), { timeout: 5000 })`；再断言 `value.length === len0 + 1`。
- **② 键盘退出源码**：`page.keyboard.press('Control+/')` → `await focusInProseMirror()`（**本轮新修的退出方向**，不再要求「现有 focusEditor 负责」）→ `page.keyboard.type('Y')` → `waitForFunction(() => document.querySelector('.ProseMirror')?.innerText.includes('Y'), { timeout: 5000 })`（证明焦点真的可用，不只是 `activeElement` 名字对）。
- **③ 点工具栏「源码」进入**：点按钮 → `await focusInTextarea()`（点按钮会把焦点抢到 `<button>`，`setViewMode` 提交后的 rAF 才把它移进 textarea）→ `page.keyboard.type('Q')` → `waitForFunction(() => document.querySelector('textarea.source-editor')?.value.includes('Q'), { timeout: 5000 })`。
- **④ 防回归（载入不抢焦点）**：打开含引用式链接定义的文档（默认源码模式打开）→ `await page.waitForTimeout(500)`（比 rAF 长得多，避开切换中途态）→ 断言 `activeElement.tagName !== 'TEXTAREA'`。
- 等待超时 = FAIL，FAIL 前先打印 `activeElement.tagName` + `className` + `sourceValue()` 前 80 字，便于分辨「真没聚焦」与「等错元素」。
- **禁止**为救断言把 `focusSourceEditor` 改成同步 `.focus()`（`setViewMode` 之前 textarea 未挂载，同步聚焦恒空；且与 `:4591` 先例不一致）。
- `## errors []`。
- 截图：`shots/round-36/impl-source-focus.png`（源码框有焦点环）。

### 门禁

`npm run build`（与 T1 共用）、`npm test`。

### 风险

- rAF 在 React 提交后执行（与 `:4591` 同款，同源已验证）。若 E2E 出现 `activeElement` 仍是 `BODY`，**先查是否 `setViewMode` 在事件外被调用**；不要在验收里放宽断言。
- 载入即源码的路径若误聚焦会让首屏焦点跳进 textarea → 验收第 4 条专门拦它。
- 预览模式的焦点行为**本轮不动**（§8）。

---

## T3（P0 用户可见，本轮重点）Mermaid 惰性渲染主路径

### 为什么

- Typora 内置 Mermaid（`.tmp/typora-ref/resources/Docs/Draw Diagrams With Markdown.md:42-119`）；Sidelight 现在把 ```mermaid 当普通代码块（`PROBE-B`：`svg 0`、`mermaid` 请求 0 条）。
- `ADR-0017` 已由产品负责人批准（新线：首屏内部 310,000 / 硬线 320,000；安装包内部 1,800,000 / 硬线 2,000,000），本轮落地，并**用真实字节替换 ADR 的预估**。

### 实现方案（沿用，技术前提已核）

不动 codeBlock 节点、不动序列化：用「ProseMirror 插件 + 装饰（widget）」。rev2 补核的实现前提（都在 `node_modules/prosemirror-view/dist/index.js` 本机实读）：

- widget 的 DOM 由 PM 自动包 `contenteditable="false"` 并加 `ProseMirror-widget` 类（`:1180-1188`）→ 不用自己设，也不会吞输入。
- `ignoreSelection` 是合法 widget spec（`:1204` 读 `this.widget.spec.ignoreSelection`）。
- 块边界上的 widget 由 `placeWidget`（`:1994-2004`，调用点 `:1409`）插进**父 desc 的 children**，所以 `pos + nodeSize` 的 widget 会成为 `<pre>` 的块级兄弟，**不会钻进代码块文本**。
- `getHTML()` 序列化文档树而非 DOM → widget 不进导出；`PreviewPane` 用 `getHTML()` → 预览面板本轮只显示 fence 原文（成立）。
- 语言在 `node.attrs.language`；DOM 上 `pre.className` 读不到，`code` 上才有 `language-mermaid`（`PROBE-H5`）。
- `codeBlock` 的 markdown 往返在 `@tiptap/extension-code-block/dist/index.js:68-84`，本轮不碰。

### 改动文件（5 个新文件 + 6 处小改）

| 文件 | 内容 |
| :--- | :--- |
| `package.json` | `dependencies` 加 `"mermaid": "11.12.0"`（与 ADR 量测同版本）；`scripts.test` **追加 1 个文件**（`src/lib/mermaidLazy.test.ts`） |
| `package-lock.json` | `npm install` 生成（提交） |
| `src/mermaid-dist.d.ts`（新） | **rev2 新增（审查 P1-3）**，仿 `src/katex-dist.d.ts:1-6`：`declare module 'mermaid/dist/mermaid.core.mjs'`，`import type { MermaidModule } from './lib/mermaidLazy.ts'`，`const mermaid: MermaidModule; export default mermaid`（`mermaid.d.ts` 在包根 exports 里，深路径没有 `.d.mts`，`strict` 下会 TS7016） |
| `src/lib/mermaidLoader.ts`（新） | 唯一静态接触真包：`import mermaid from 'mermaid/dist/mermaid.core.mjs'`；`export default { mermaid }`（同 `katexLoader.ts:2`） |
| `src/lib/mermaidLazy.ts`（新） | 契约定死（照 `katexLazy.ts:1-24,193-208` 的形状）：`MermaidModule`（`initialize(config): void`、`render(id, text): Promise<{svg: string}>`）、`Loader = () => Promise<{ mermaid: MermaidModule }>`、`ensureMermaid()`、`renderDiagram(code): Promise<{svg: string} \| {error: string}>`（不抛错、按 code 字符串缓存 svg）、`fallbackHint()`、`listMermaidBlocks(doc)`（遍历 `codeBlock` + `attrs.language === 'mermaid'`，返回 `{pos, nodeSize, code, hash}`）、`isMermaidLanguage(lang)`、`mermaidHash(code)`、`__setLoaderForTest(loader: Loader \| null)`、`__getLoadCount()`、`__getLastError()`、`__resetForTest()` |
| `src/lib/mermaidPreview.ts`（新） | `Extension.create({ name: 'mermaidPreview', addProseMirrorPlugins })`：plugin state 持 `DecorationSet`；`docChanged` 时用 `listMermaidBlocks` 重建 = 每块 `Decoration.node(pos, pos + nodeSize, {class:'is-mermaid'})` + `Decoration.widget(pos + nodeSize, dom, {side: 1, ignoreSelection: true, key: 'mermaid-' + hash})`；widget DOM 按 `hash` 在模块级 `Map` 复用；首次见某 hash `void ensureMermaid()`；400 ms debounce 渲染；渲染期间保留上一个成功的 SVG；失败把 widget 换成 `is-error`（`fallbackHint()` 一句 + 代码块原样）；渲染完成 dispatch `tr.setMeta(<本插件 key>, true).setMeta('addToHistory', false)`，插件 `apply` 里 `if (tr.docChanged || tr.getMeta(key)) return build(...)` 触发重建（写法同 `src/lib/decorations.ts:38-41`，但不复用它的三个 PluginKey） |
| `src/App.tsx` | 扩展数组（`:733-760`）加 `MermaidPreview`（1 行 import + 1 行注册）；**只此两处**（步骤 2 的临时 useEffect 在步骤 3 删掉） |
| `src/styles.css` | `.mermaid-preview`（边框/内边距/`svg{max-width:100%;height:auto}`）、`.mermaid-preview.is-error` |
| `scripts/measure-first-screen.mjs:65` | banned 正则加 `\|\| /mermaid/i` |
| `README.md:103,106` | **rev3 新增（审查 P2-4）**：`:103`「运行时依赖**只有两组**」→「**三组**」；`:106` 后加一行 `- Mermaid：图表（惰性加载，首屏不含；打开含图文档才下载）。实测安装包字节见下；理由与量测见 [ADR-0017](docs/adr/0017-mermaid-lazy-loading.md)`。**只加 bullet 不改 `:103` 会让那句话当场变假**（`findings-ship` F4 同类自相矛盾，正是本轮整改对象） |
| `src/lib/mermaidLazy.test.ts`（新） | 见验收 |

### 实施步骤（严格按序，含**提前的硬门**）

**步骤 1（2 min）装依赖 + 取包事实**（rev2：与旧步骤 0 调序，解决审查 P1-4）

```powershell
npm install mermaid@11.12.0
node -e "console.log(require('./node_modules/mermaid/package.json').version)"   # 11.12.0
Test-Path node_modules\mermaid\dist\mermaid.core.d.mts                          # 预期 False → 必须有 src/mermaid-dist.d.ts
(Get-ChildItem node_modules\mermaid\dist\chunks\mermaid.esm.min -Filter *.mjs).Count   # 记数（ADR 记 73）
Get-ChildItem node_modules\mermaid\dist -Recurse -File | Measure-Object Length -Sum    # 记包里 raw
```

- 若 `npm install` 因网络失败：**停手**，命令与报错写进 `impl.md`，T3 记为「未做（依赖装不上）」，转 T1/T2/T4，**不要伪造体积数字**。
- 只装不引用时 `dist` 不变（R-1），本步骤**不量体积**。
- 若 `node_modules\mermaid\dist\chunks\mermaid.esm.min` 不存在（包结构与 ADR 2026-11-17 解包时不同），**不要照抄 ADR 的 73/2,675,506**：用 `Get-ChildItem node_modules\mermaid\dist\chunks -Directory` 记实际目录名，据实写 ADR。

**步骤 2（4 min）接线 + 立刻量真字节（决策门在这里，不在第 40 分钟）**

1. 写 `src/mermaid-dist.d.ts`、`src/lib/mermaidLoader.ts`、`src/lib/mermaidLazy.ts`（先到 `ensureMermaid`/`renderDiagram`/`fallbackHint`/测试钩子就够）。
2. `src/App.tsx` 加**临时** 3 行把 mermaid 拉进模块图（步骤 3 删掉）：
   ```ts
   useEffect(() => { void import('./lib/mermaidLazy') }, [])
   ```
3. `npm run build`（tsc 先跑，TypeScript 声明不对在这里就红）→ 量：
   ```powershell
   Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum        # 基线 1,471,108 B / 31 文件
   Get-ChildItem dist -Recurse -File -Filter *mermaid* | Select-Object Name,Length
   (Get-ChildItem dist -Recurse -Filter *.js).Count                          # 基线 13 个 .js（量 chunk 图变化）
   ```
4. 出真安装包字节（1 秒，只写 `.tmp`，不碰 `release/`；`findings-ship` F6 实测 1,053 ms、基线 827,417 B）：
   ```powershell
   powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun
   # 输出里有这两行，直接抄进 impl.md：
   #   target=1800000 gap=<差值>        ← installer.ps1:89（dry-run 也会打印，rev3 更正 rev2 的错话）
   #   assoc-dryrun=<B> B  ...          ← installer.ps1:100
   $b = (Get-Item .tmp\assoc-dryrun-setup.exe).Length
   $gate = 1997853                      # 门 A 的唯一阈值，见第 5 步
   $formal = $b - 2147                  # dry-run 比正式包大 2,147 B（findings-ship.md:134，方向已核）
   "setup=$b formal_est=$formal gate=$gate " + $(if ($b -le $gate) { "PASS headroom=$($gate-$b)" } else { "OVER +$($b-$gate)" })
   ```
5. **决策门（rev3：单值阈值，两门不重叠、无「保守区」）**：
   - **门 A（通过，唯一判据）**：`assoc-dryrun ≤ 1,997,853 B`（= 2,000,000 − 2,147）**且** `npm run verify` 仍 PASS → 把 dist 增量（raw/文件数）、`assoc-dryrun`、`formal_est`、`gap=` 四组数字记进 `impl.md` 的 `## size-gate`，进步骤 3。
   - **门 B（硬停）**：`assoc-dryrun > 1,997,853 B` → **不落 T3**，按下面 5 步回退。
   - **阈值方向（rev3 自己核过，与审查算式不同但结论相同）**：`findings-ship.md:134` 的原话是「第 33 轮干跑 826,742 B vs 正式 824,595 B（**+2,147 B**）」→ dry-run **比**正式包**大** 2,147 B，正式包 ≈ dry-run − 2,147。取 1,997,853 这个下界两个方向都安全：按实测方向 → 正式包 ≈ 1,995,706 B（余 4,294 B）；万一方向反过来 → 1,997,853 + 2,147 = 2,000,000 恰好不越线。**不许把 2,000,000 直接当门**（门必须包住这 2,147 B 的口径差，否则判据在差值窗口里没有意义）。
   - **内部线 1,800,000 只记录、不阻塞**：读 `target=1800000 gap=<差值>` 那行抄进 `impl.md`；越内部线但没越 1,997,853 时照常进步骤 3（与首屏 310,000 内部 / 320,000 硬线的用法一致）。
   - **门 B 的五条禁止项（违反任何一条 = 伪造体积证据，本轮按「未完成」记）**：
     1. 不许在 `vite.config.ts` 加 `external` / `manualChunks` / `alias` / `rollupOptions.output` 把 mermaid 或它的依赖排除出包——运行时 `import()` 直接失败，图必然渲染不出来（ADR-0017:66 已否决「只按图类型懒加载但入口仍旧静态引」，排除打包更差）；
     2. 不许删/改/覆盖 `node_modules/mermaid/dist` 里的文件后重打（含 `patch-package`），也不许为凑体积改 `package.json` 里 mermaid 的版本；
     3. 不许换成 CDN / 别的图表库 / UMD 全量包（属产品方向 + 新 ADR，只能产品负责人定）；
     4. 不许改 1,800,000 / 2,000,000 / 首屏 310,000 / 320,000 任何一条线（`AGENTS.md` §1：对外承诺只能人定）；
     5. 不许手工删 `dist` 里的文件再打包（`installer.ps1` 的载荷含整个 `dist`，删了就是假字节）。
   - **门 B 回退步骤（5 步，按序）**：
     1. 删步骤 2 的临时 `useEffect`；
     2. `git checkout -- package.json package-lock.json`；若已改过也回退 `scripts/measure-first-screen.mjs`、`src/styles.css`（T1/T2 不碰这两个文件，安全）；`src/App.tsx` **不要** `git checkout`（会冲掉 T1/T2 的修复），用 `edit` 删掉那 3 行；
     3. 删 5 个新文件：`src/lib/mermaidLazy.ts src/lib/mermaidLoader.ts src/lib/mermaidPreview.ts src/mermaid-dist.d.ts src/lib/mermaidLazy.test.ts`（不存在的跳过）；
     4. 在 `docs/adr/0017-mermaid-lazy-loading.md` 加「第 36 轮实测未落地」节：dist 增量、`assoc-dryrun` / `formal_est` / 越线差值、结论「不改线，回退」；`impl.md` 写同一组数字；
     5. **不要**改线。剩余时间做 T1/T2/T4。
6. **预热 dev server（rev3 新增，P1-2；只在门 A 通过后做，约 40 s）**：这一步只有临时 `useEffect` 在时才最省事——它已经把 `mermaidLazy` → `mermaidLoader` → `mermaid/dist/mermaid.core.mjs` 拉进 dev 的模块图。dev server 自第 35 轮起一直在跑、**不许重启**，mermaid 是刚装的裸依赖：Vite 第一次被请求它会 re-optimize 并发整页 reload，那次请求常以 `504 (Outdated Optimize Dep)` 或 `Failed to fetch dynamically imported module` 收场。
   先跑 `node .tmp/reset.mjs 9222`，再写 `.tmp/warmup-r36.mjs`（连接方式抄 `scripts/acceptance.mjs` 的 `connectOverCDP`，结尾 `process.exit(0)`）：
   ```js
   let loads = 0
   const reqs = []
   page.on('load', () => { loads++ })
   page.on('request', (r) => reqs.push(r.url()))
   await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded' })
   await page.waitForSelector('.doc-column .ProseMirror')
   await page.waitForTimeout(10000)   // 等 Vite 优化完 + 可能的一次整页 reload
   await page.reload({ waitUntil: 'domcontentloaded' })
   await page.waitForSelector('.doc-column .ProseMirror')
   await page.waitForTimeout(3000)
   const mermaidReqs = reqs.filter((u) => /mermaid|\.vite\/deps/.test(u))
   console.log('## dev-warmup', JSON.stringify({ loads, mermaidReqs: mermaidReqs.length, sample: mermaidReqs.slice(0, 5) }))
   ```
   - 判定「预热完成」：第二次 `reload` 的 3 s 内 `loads` 只 +1（没有连续两次整页 reload）且控制台不再出现 `optimized dependencies changed` / `504`；两组信号都记进 `impl.md` 的 `## dev-warmup`。
   - **预热阶段的 504 / 整页 reload 不算产品缺陷**：不修、不回退、不写进 ADR 的已知限制。
   - 若 10 s 后仍在反复 reload：把它记进 `impl.md`，**不要重启 5175**（本轮硬约束），改由步骤 5 的 E2E 段 0 做长预热。
   - 预热结论当场写进 `impl.md`，不要留到 T3 收尾（预算只有 40 s）。
- 口径提醒（rev3 更正 rev2 的错话）：`-AssocDryRun` 在 `installer.ps1:94-102` 就 `exit 0`，**跳过** `:117-129` 的 2,000,000 硬判与 SHA256 打印；但 `:89` 的 `target=1800000 gap=` 与 `:90-92` 的 `Write-Warning` 在 `:94` **之前**，dry-run 一定会打印。所以：字节读 `:100` 的 `assoc-dryrun=`，内部线差读 `:89` 的 `gap=`，判定自己算——`exit 0` 只说明「包造出来了」，**不代表体积合格**。

**步骤 3（7 min）widget 渲染主路径**

顺序：`mermaidPreview.ts` 插件 → `src/App.tsx` 注册并删掉临时 `useEffect` → `src/styles.css`。每步 `npm run build`。
渲染约定：按 `code` 缓存 SVG；同 hash 复用 widget DOM（防每键重渲染）；400 ms debounce；失败换 `is-error` + 提示、代码块内容不动；渲染完成 dispatch 一次 meta 事务（`addToHistory: false`，不进撤销栈，也不会触发注解监听器的映射）。

**步骤 3 收尾（20 s，rev3 加，P1-2 的「先手动确认 dev 能出图」）**：`npm run build` 过后 `node .tmp/reset.mjs 9222` → 在浏览器里打开含图文档，`await page.waitForFunction(() => document.querySelectorAll('.mermaid-preview svg').length >= 1, { timeout: 20000 })` 确认 svg 出来，再进步骤 4。**不写断言、不判产品失败**：这一步只是让 lazy 路径（此时临时 `useEffect` 已删，mermaid 靠插件首次见块才加载）也把 Vite 的预构建触发掉。出不来图先看 `.mermaid-preview` 是 `is-error` 还是没挂上——`is-error` + 控制台 504/reload = 预热不够（属 dev-only），**不要**去改插件或降级逻辑。（审查原文说「步骤 2 的 build 之后手动开一次图」，但步骤 2 时插件还没注册、任何文档都画不出图，所以这一步挪到步骤 3 收尾；步骤 2 的预热仍按第 6 步做，它负责把依赖预构建提前。）

**步骤 4（2 min）测试与门禁**

`npm test`（新增 1 个文件）、`npm run verify`（PASS 且首屏集合仍 `files=2`、不含 mermaid chunk）、`Get-ChildItem dist -Recurse -Filter *.map` 计 0、`Select-String dist\index.html -Pattern mermaid` 0 命中。
`npm run roundtrip` **跑一次**（rev3，P2-6）：T3 往 `useEditor` 的扩展数组加了 ProseMirror 插件，`AGENTS.md` §3 的触发词是「改动编辑器或 markdown 序列化」——「装饰不进序列化」是**判断**，不是既成事实，漏检代价高于一次往返。把 `docs/roundtrip-report.md` 的损失条数与轮前对比写进 `impl.md`；真跑不了的唯一替代 = E2E 里 `Ctrl+S` 后 fake FS 字节仍等于原 fence（验收已含），并在 `impl.md` 写明「代替 roundtrip + 原因」。

**步骤 5（5 min）E2E + 截图**（下面验收；rev3 把 dev 预热写进脚本的段 0）

**步骤 6（2 min）文档 4 处**（每条都是一行级改动；时间不够先砍 `AGENTS.md` 段，见 §6 第 4 条）

- `docs/adr/0017-mermaid-lazy-loading.md`：标题与「状态」改「已接受并落地（第 36 轮）」；新增「实测」表：dist 增量 raw/gzip、chunk 文件数与名字样本、setup 实测字节（**替换 1,474,881 的预估**）、首屏静态增量与 `files=2` 证据、按图类型拆包结论（步骤 1 的实测）、失败降级文案、**已知限制**（HTML 导出与预览面板不含图、主题切换不重绘）、**明写偏离 ADR 原方案**（`ADR-0017:21` 写「导出 HTML 复用 `ensureKatex()` 的写法」，本轮 HTML 导出不含图——不改就等于宣称已完成）。
- `README.md:99`：首屏叙事加一句「第 36 轮加 Mermaid 惰性加载插件后 +N B」；首屏现值、安装包「本机重建」数字改成实测（标注未发布）。
- `README.md:103-106`（rev3，P2-4）：`:103`「运行时依赖**只有两组**」→「**三组**」；`:106` 后加一行 `- Mermaid：图表（惰性加载，首屏不含；打开含图文档才下载）。实测安装包字节见下；理由与量测见 [ADR-0017](docs/adr/0017-mermaid-lazy-loading.md)`。**只加 bullet 不改 `:103` 会让那句话当场变假**（`findings-ship` F4 同类，本轮正是整改这种自相矛盾）。
- `AGENTS.md:39`、`:72`（22 个文件 295 条 → 实测值；T3 落地 = 23 文件）、§6 状态段加「Mermaid 惰性渲染（首屏 0 B，含图文档首渲染才下载）」+ 实测字节。
- `docs/CHANGELOG.md`：`## Unreleased` 下加第 36 轮条目（**不新增版本节、不改 `package.json` 版本**）。

### 验收标准（可执行）

- `npm run build` exit 0；`npm test` 全绿，**新增 1 个测试文件** `src/lib/mermaidLazy.test.ts`、断言 ≥6：
  1. **渲染成功**：`__setLoaderForTest(async () => ({ mermaid: { initialize() {}, render: async () => ({ svg: '<svg id="s"/>' }) } }))` → `await renderDiagram('graph TD; A-->B')` 得到含 `<svg` 的 `svg`；
  2. **失败降级**：假 `render` 抛错 → `renderDiagram` **不抛**、返回 `{error}`；`fallbackHint()` 非空且含「原文」；
  3. **只加载一次 + 缓存**：两个不同 code 各渲染一次 → `__getLoadCount() === 1`；同一 code 渲染两次 → 假 `render` 只被调 1 次；
  4. **不改入参**：`renderDiagram(code)` 前后 `code` 字符串逐字节相等；
  5. **收集块**：doc 里 2 个 mermaid 块 + 1 个 js 块 → `listMermaidBlocks` 返回 2 条、`code` 去尾换行、`pos` 递增；`isMermaidLanguage('mermaid') === true`、`('js') === false`；
  6. **无 mermaid 不加载**：无 mermaid 的 doc → `listMermaidBlocks` 返回 `[]`、`__getLoadCount() === 0`。
  - 注意：`ensureMermaid` 里读主题（`document.documentElement.dataset.theme`）必须 `typeof document !== 'undefined'` 守卫，否则 node 测试直接炸（`katexLazy` 无此问题）。
- `node scripts/measure-first-screen.mjs` → `PASS`、`files=2`、首屏总量 ≤310,000 B。**rev2 口径（R-2）**：预期 286,056 → 约 287,000–289,000（插件与 shim 的静态代码进主 chunk，实测填表）；若 >296,056（+10,000）判 FAIL 并查是否把 mermaid 本体静态引入。
- `Get-ChildItem dist -Recurse -Filter *.map` 计 **0**；`Select-String dist\index.html -Pattern 'mermaid'` **0 命中**。
- 终检安装包字节（步骤 3 之后代码又变了一点，重跑 1 秒的 dry-run）：同样按**门 A 单值判据** `assoc-dryrun ≤ 1,997,853 B` 判定（不止记录）；`assoc-dryrun`、`formal_est`、`gap=` 写进 ADR/README/`impl.md`。终检反而越线时，按步骤 2 门 B 回退。
- E2E `.tmp/e2e-r36-mermaid.mjs`（CDP 9222，先 `node .tmp/reset.mjs 9222`，fake workspace 抄 probe6；rev3 结构 = **段 0 预热 + 段 1 断言**）：

  **段 0 预热（不算产品证据；`## errors-warmup` 允许非空）**
  1. 打开 app → 装 fake workspace，里面含一份带 ```` ```mermaid ````（`graph TD; A-->B`）的文档；
  2. 我先打开它：`page.on('load')` 计数 + `page.on('console')` 全收；`await page.waitForTimeout(10000)`（等 Vite 预构建 mermaid + 可能的一次整页 reload）；
  3. 若 `loads > 1`（发生整页 reload）或 reload 前 `.mermaid-preview svg` 没出现：等 reload 完成（`waitForSelector('.doc-column .ProseMirror')`）→ **重新打开该文档** → `await page.waitForFunction(() => document.querySelectorAll('.mermaid-preview svg').length >= 1, { timeout: 20000 })`；
  4. 把段 0 的 console error / pageerror 打成 `## errors-warmup`（**允许非空**，注明「dev 依赖重优化导致，非产品缺陷」），并打印请求过 mermaid / `.vite/deps` 的 URL 样本；
  5. 段 0 结束 = `warmed = true`（此后**不再 reload 整页**，否则 fake workspace 要重新注入）。

  **段 1 断言（`errors` 数组从 `warmed` 之后才开始收集）**
  - 打开**不含** mermaid 的文档：`page.on('request')` 记录里 URL 含 `mermaid` 的请求 **0**（说明「打开普通文档不拉 mermaid」；**这条不证字节**，字节证据是 `measure-first-screen.mjs` 的 `files=2` + `index.html` 0 命中）；
  - 再打开含 ```` ```mermaid ````（`graph TD; A-->B`）的文档：`await page.waitForFunction(() => document.querySelectorAll('.mermaid-preview svg').length >= 1, { timeout: 20000 })`（**不许**定短等待直接读 DOM），且请求列表出现 URL 含 `mermaid` 的 chunk（证明是懒加载）；
  - 坏语法（fence 内容 `not a valid diagram`）：`await page.waitForFunction(() => !!document.querySelector('.mermaid-preview.is-error'), { timeout: 20000 })`；提示文案非空；`pre code` 文本仍等于原文（不吞内容）；
  - 源码模式 `Ctrl+/`：**先** `await page.waitForFunction(() => document.activeElement?.tagName === 'TEXTAREA', { timeout: 5000 })`（同 T2，rAF 竞态），**再**断言 `textarea.source-editor` 的 value 含 ` ```mermaid `；`Ctrl+S` 后 fake FS 字节里仍是原 fence（未编辑 ≠ 被改写）；
  - `## errors []`（**只统计段 0 之后**）。判读规则：`## errors` 里出现 `504 (Outdated Optimize Dep)`、`Failed to fetch dynamically imported module`、`optimized dependencies changed` 时，把它移到 `## errors-warmup`（说明预热没干净）并重跑一次脚本；重跑后同一 URL 仍报错才判 FAIL。段 0 之后出现 `.mermaid-preview.is-error` 而文档语法合法、且请求列表里 mermaid chunk 全 200 → 才是真「mermaid 渲染失败」。
- 截图：`shots/round-36/impl-mermaid-render.png`（流程图 svg）、`impl-mermaid-fallback.png`（错误提示 + 原文块）；源码模式不单独截图（E2E 已断言 value）。

### 门禁

`npm run build`、`npm test`、`npm run verify`、`npm run roundtrip`（rev3，P2-6：结果写 `impl.md`）、`powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun`（步骤 2 与终检各一次；判据是 **`assoc-dryrun ≤ 1,997,853 B`**，`exit 0` 不代表体积合格）。

### 风险

1. **安装包越硬线**：ADR 档 1b 预估 1,474,881 B，档 2（含 73 个按需 chunk）2,355,122 B > 2,000,000。Vite 会不会把这 73 个 chunk 打进 `dist` 取决于 `mermaid.core.mjs` 的静态依赖里有没有到它们的动态 `import()`——**不可假设**，所以步骤 2 用 1 秒的 dry-run 拿真字节并按**单值门 `≤ 1,997,853 B`** 硬停（§6 第 5 条「不可砍」）。越线后唯一允许的动作是回退（门 B 五步），**不许**用 `external`/`manualChunks`/删包内 chunk/换库/改线来「压体积」（门 B 禁止项 1–5）。
2. 每键重渲染卡住编辑器：按 `code` 缓存 + widget DOM 复用 + 400 ms debounce（`findings-typora` 3.1 风险②）。
3. 读错属性（`pre.className` 空串，`PROBE-H5`）→ 必须用 `node.attrs.language`。
4. 异步回来时文档已变：widget 位置由插件 state 按 `docChanged` 重建，渲染结果只按 `hash` 取 DOM，不按旧 `pos` 写；渲染完成的 meta 事务带 `addToHistory: false`，不进撤销栈。
5. widget 必须 `ignoreSelection: true`（`contenteditable=false` 由 PM 自动加，已核 `prosemirror-view:1180-1188`），否则吞输入/坏选区。
6. 暗色主题：`initialize` 时读 `document.documentElement.dataset.theme`；切换主题不重绘，记已知限制（并注意上面「node 测试要守卫 document」）。
7. **dev 依赖重优化（P1-2）**：mermaid 是新装的裸依赖、dev server 又不许重启 → 首次请求会 re-optimize + 整页 reload，常以 `504` 收场；而 T3 的失败分支会把它画成 `is-error`（与坏语法同款样式），很容易被误判成产品缺陷。步骤 2 第 6 步预热 + E2E 段 0 专拦这个：`## errors-warmup` 与 `## errors` **必须分开看**，前者非空不算缺陷。

### 截图（用户可见变化，必须有）

`impl-mermaid-render.png`、`impl-mermaid-fallback.png`。命令：`node scripts/shot.mjs http://localhost:5175 --out shots/round-36/名字.png`。

---

## T4（P1 发版 + P2 文档）收尾三处一行改

### 为什么

- `findings-ship.md` F1（P1）：`.github/workflows/release.yml:260` 的 `gh release view … | grep -- '-macos-arm64.zip'` 在 0.29.0 起资产改名后再无命中 → `pipefail`（`:257`）+ `set -e` 让 job 必红，**同一 tag 无法重发**。同文件 `:246` 的同型 grep 已用 `|| { … }` 兜住，`:260` 是唯一漏网处。
- `findings-ship.md` F4（P2）**+ 审查 P2-6 更正**：`README.md:155` 写「**21 个测试文件**」（实测 22）；`README.md:117` 写「22 个文件、295 条断言」。旧计划的验收用 `'22 个测试文件'`，那个字符串在 README 里**根本不存在**（改前也 0 命中），属 AGENTS.md §8 禁止的假阴。
- `findings-typora.md` §3.9：`docs/typora-gap.md:69` Mermaid 仍记「无」。

### 改动文件（3 个文件，4 行）

| 文件 | 改法 |
| :--- | :--- |
| `.github/workflows/release.yml:262` | `:260-262` 那条管道的 `done`（`:262`）后面加 ` || true`（整条管道兜住；`:260` 的行内不动，避免重排）。保持 LF，不重排缩进 |
| `README.md:155` | `21 个测试文件` → **实测值**：T3 落地 = `23 个测试文件`；T3 回退（门 B）= `22 个测试文件` |
| `README.md:117` | `22 个文件、295 条断言` → `npm test` 实测（T3 落地 = 23 文件、条数含新增；T3 回退 = 22 文件、295 条）。**不许写没量过的数** |
| `docs/typora-gap.md:69` | Mermaid 行「无」→「有（第 36 轮，惰性渲染）」；**T3 回退时保留「无」**，并在 `impl.md` 写「本轮未落地，仍记缺」 |

**不改**：`package.json` 版本号；`release/`；`docs/iteration/STATE.md`（轮末根代理统一更新）；`.github/workflows/*` 的其他 job（F2/F3/F5 留给后续轮）。

### 验收标准（可执行，每条 0 命中都给改前正向对照）

- `git grep -n -A4 "Remove stale arm64" -- .github/workflows/release.yml`：改前 `:262` 是 `done`、改后是 `done || true`（前后两段都贴进 `impl.md`）。
- `Select-String -Path README.md -Pattern '21 个测试文件'`：**改前 1 命中 → 改后 0 命中**；改后 `Select-String -Path README.md -Pattern '23 个测试文件'`（T3 落地时）1 命中。
- `Select-String -Path README.md -Pattern '22 个文件'` 与 `'295 条断言'`：改后与 `npm test` 实际输出逐字一致（贴 `npm test` 末行）。
- `Select-String -Path docs\typora-gap.md -Pattern 'Mermaid'`：T3 落地时该行不再是「无」；回退时仍是「无」且 `impl.md` 有说明。
- `git diff --stat` 只含上述文件（+ T1/T2/T3 的文件）；`npm run build` 不需要为 T4 重跑，轮末根代理统一跑门禁。

### 门禁

`npm run build`、`npm test`（根代理轮末统一跑）。

### 风险

- 0（全是一行内文案）。唯一注意：`release.yml` 是 LF，别让编辑器写 CRLF；T3 回退时 `README.md:117/:155` 的数字要回到 22/295（照实测，不要照计划）。

---

## 5. 计划层面的体积与体积口径（rev3：体积门改**单值**判据）

| 指标 | 现值 | 本轮后 | 判定 |
| :--- | ---: | :--- | :--- |
| 首屏 gzip | 286,056 B（`files=2`） | 286,056 + 插件/shim 静态代码（**预期 ≤+2,000**，实测填表） | 内部 310,000 / 硬线 320,000；`PASS` + 首屏集合仍 2 文件 + 无 mermaid chunk；**>296,056（+10,000）判 FAIL**（说明静态引入了 mermaid 本体） |
| dist 总量 | 1,471,108 B / 31 文件 | 步骤 2 实测（含 mermaid chunk 数） | 记数字，不设线 |
| 安装包（setup） | 基线 dry-run **827,417 B**（`findings-ship` F6） | 步骤 2 + 终检两次 dry-run 实测 | **门 A 唯一判据：`assoc-dryrun ≤ 1,997,853 B`（= 2,000,000 − 2,147，dry-run 比正式包大，方向见 T3 步骤 2 第 5 步）**；越了就门 B 硬停回退。内部线 1,800,000 只抄 `target=1800000 gap=` 一行，不参与门判据。`exit 0` 不代表合格 |
| 测试 | 22 文件 295 条 | T3 落地 = **23 文件**（+`src/lib/mermaidLazy.test.ts`）、条数实测；T3 回退 = 22 文件 295 条 | 记实际值并同步 README/AGENTS；`npm run roundtrip` 也跑一次并记结果（rev3，P2-6） |

## 6. 砍单顺序（时间不够时按此顺序砍；已预砍到 35 min）

1. T4 的 `typora-gap.md` 行（保留 `release.yml` + `README.md:117/:155` 三行）。
2. T3 的 E2E 砍到 1 个场景（渲染 + 请求）与 1 张截图（`impl-mermaid-render.png`）。
3. T3 的 CSS 打磨（只留 `.mermaid-preview` 边框 + `svg{max-width:100%}`）。
4. T3 的 `AGENTS.md` §6/`:39`/`:72` 数字更新（交代给根代理轮末更新）。
5. **不可砍**：T1 的 E2E（数据安全必须实测）；T3 步骤 2 的**体积硬门**（单值 `≤ 1,997,853 B`）与文档四处（ADR 实测表是「用实测替换预估」的本轮目标）；T3 的首屏 0 B 断言（`files=2` + 请求 0）；T3 E2E 的**段 0 预热**（P1-2，砍了会把 dev 504 当产品缺陷）；`npm run build` / `npm test` / `npm run verify` / `npm run roundtrip`。
6. rev3 备注：预热占了约 40 s，门 A 通过且进度吃紧时**第 1 条现在就该砍**（也是 review §4 的预砍建议）；第 2 条砍 E2E 场景时，段 0 预热与 `.mermaid-preview svg ≥1` 这一条必须留着。

## 7. 任务依赖与执行顺序

```
T1 (4 min, src/App.tsx 删 1 行 + E2E)
  ↓ 同一次编辑会话、共用一次 build（同一文件，串行）
T2 (6 min, src/App.tsx 3 处焦点)
  ↓ 串行（同一文件）
T3 (22 min, 新文件 + src/App.tsx 两行 + styles + scripts + 文档；~第 8 分钟硬门，门 A 后 40 s 预热)
  ↓
T4 (3 min, release.yml + README + docs/typora-gap.md，与产品代码零重叠)
```

T1/T2/T3 都碰 `src/App.tsx`，**不能并行给两个 builder**；T4 可在 T1 之后任意时刻由第二个人并行做（只改 `.github/`、`README.md:117/:155`、`docs/typora-gap.md`，与产品代码零重叠）。T3 文档段与 T4 都碰 `README.md` 的不同段落 → 串行提交，避免同文件并发。**三条 E2E 一律遵守 §0 的等待规则**（rev3：rAF / 600 ms 防抖 / mermaid 懒加载都先等再断言）。

## 8. 本轮明确不做（写进报告，防止下轮重复讨论）

- **「折叠后保留卡片」**（把 `src/App.tsx:1656-1659` 的丢弃分支改成 `to = from` + handler 级单测）：本轮不做；现状语义是「引文被整段替换掉 → 该条批注移除」，与任何编辑一致。
- **`shiftAnnotations` 去留**（`src/lib/annotations.ts:415-428`，除测试外无调用方）：下一轮处理。本轮不新增第二套位置算法，不存在三套并存。
- 「替换」把替换串当 HTML 解析（findings-bug 第 3 条，P2）：下一轮与「替换串纯文本化 + 一轮往返测试」一起做。
- 保存把 `&`/`<`/`>` 改写成实体（findings-bug 第 4 条，P2）：属序列化改动，单独一轮，**本轮不动序列化**。
- 模拟分析误报「模型没按约定格式回」（findings-bug 第 5 条，P2）：一行条件改，时间够可顺手做，**不在验收内**。
- 预览面板与 HTML 导出的图形渲染、主题切换重绘、原位渲染/点击展开、按图类型裁剪 chunk：T3 落地后单独一轮。
- 代码块语言徽标与语法高亮、表格列宽拖拽、图片落盘规则（findings-typora 3.2/3.3/3.4）：下一轮（3.2 可按本轮 `Decoration.node` 预留）。
- findings-ship F2（installer.ps1 取 NSIS 无哈希）/ F3（CI 空转 artifact）/ F5（本地 release 不能自证）：下一轮。
- 预览模式的焦点行为（`src/App.tsx:4779-4780`）：不动。

## 9. UNVERIFIED 预登记（本轮预计测不到，写下补测法）

1. **正式安装包字节**：只能跑 `-AssocDryRun`（跳过 `installer.ps1:117-129` 的硬线检查），且 dry-run 比正式包大约 2,147 B（第 33 轮）；补测：发版那轮正式打包后 `Get-Item` 字节。
2. **WebView2 宿主里的 mermaid 渲染**：只用 CDP 浏览器；补测：`host-smoke` 式真宿主打开含图文档。
3. **按图类型裁剪 chunk 后的运行时表现**：本轮不裁；补测：裁后逐类图各渲染一次。
4. **中文输入法下的源码框聚焦**：`keyboard.type` 只发 ASCII。
5. **撤销后批注位置精确跟随**（T1 已排除；E2E 只验条数、引文文本与 `to-from`）。
6. **大文档（>1 MB）含 5+ 张图时的滚动与重排性能**：本轮只测 1 张图。
7. **mermaid 11.12.0 真实语法错误的具体报错文案**：只跑一个坏语法样例（`not a valid diagram`），不覆盖各类图。
8. **dev 依赖重优化（504 / 整页 reload）在正式构建里不存在**：rollup 打包没有 optimizeDeps，这是 dev-only 现象，`dist` 里无法复现。补测：无（性质决定）；只靠 E2E 段 0 预热把它挡干净。
9. **段 0 预热是否一次就够**：取决于 Vite 预构建缓存状态，本轮只跑一次。**本轮不许删 `node_modules/.vite`**（会让共享的 5175 整站重新预构建，影响其他角色）。补测：下一轮在允许重启 dev server 的窗口里删缓存后重跑本 E2E。

## 10. planner-revision 自证（本轮读了什么）

- 先读 `.tmp/iteration/common.md`、`.tmp/iteration/roles/planner-revision.md`（按要求）。
- 全读 `round-36/plan.md`（修订前版本，334 行）与 `round-36/plan-review.md`（76 行）；抽读 `round-36/findings-ship.md`（全文）、`findings-bug.md:1-40`（第 1 条复现与实测输出）。
- 逐行核对的源码：`src/App.tsx:1639-1683`（事务监听器：`:1646` 跳过 `addToHistory=false`、`:1654-1659` 映射与丢弃）、`:1690-1717`（持久化）、`:1776-1796`（`replaceCurrent`/`replaceEvery`，`:1795` 那行）、`:324-328`（`focusEditor` 模块级）、`:511-518`、`:3735-3755`、`:3761-3784`、`:4587-4597`、`:4772-4777`、`:4779-4780`、`:1920-1964`（批注恢复按引文重定位）；`src/lib/decorations.ts:38-63`；`src/lib/annotations.ts:31-44,415-428`；`src/lib/cache.ts:51-58`；`src/lib/katexLazy.ts`（全文，定 shim 契约）、`src/lib/katexLoader.ts`、`src/katex-dist.d.ts`、`src/lib/katexLazy.test.ts:1-45`（测试写法）。
- 构建与体积口径：`vite.config.ts`（全文）、`scripts/measure-first-screen.mjs:50-77`、`tsconfig.json`（全文：`strict`、`moduleResolution: bundler`、`allowImportingTsExtensions`、`verbatimModuleSyntax`）、`packaging/installer.ps1`（全文：`:94-102` dry-run 提前 exit、`:109-129` 硬线检查对象是 setup 字节）、`package.json`（22 个测试文件、当前依赖）。
- 库行为实测（`node_modules/prosemirror-view/dist/index.js`）：`:1180-1188` widget 自动 `contenteditable=false`、`:1204` `ignoreSelection`、`:1402-1409` 与 `:1994-2004` 的 `placeWidget` 挂载位置。
- 数据/基线实测：`git rev-parse HEAD` = `b3509c9f…`；`git status --short` = 两条 `??`；`git ls-files package-lock.json` 命中；`Test-Path node_modules\mermaid` = False；`dist` = 31 文件 / 1,471,108 B；`docs/typora-gap.md:66-70`；`README.md:94-111,112-125,152-159`；`AGENTS.md:39,72`；`docs/adr/0017-mermaid-lazy-loading.md`（全文）。
- 未读：`src/lib/ai.ts`（第 5 条缺陷本轮不做）、`.tmp/typora-ref` 原文（沿用 findings-typora 的行号）、`release/` 内容（只读口径未变）。

### 10.1 rev3 追加自证（第 3 次修订实际读的）

- `src/App.tsx:3761-3788`（`switchView` / `toggleSource` 现状）、`:4587-4597`（`:4591` 的 rAF 聚焦先例）、`:1686-1717`（render effect + 600 ms 防抖；**`:1691` 是 `setTimeout`、`:1715` 是 `600`**，rev2 写的 `:1695` 是 host 分支的 `postMessage`）、`:320-331`（`focusEditor` 用 `requestAnimationFrame`）。
- `packaging/installer.ps1:72-130`（产物路径、`:89` `target=1800000 gap=` 打印、`:90-92` WARN、`:94-102` dry-run 提前 `exit 0`、`:117-129` 2,000,000 硬判——rev3 据此更正 rev2「dry-run 跳过内部线提示」的错话）。
- `docs/iteration/round-36/findings-ship.md:130-138`（F6：`+2,147 B` 的方向、`827,417 B` 基线、`1,053 ms` 耗时 → 门阈值方向与「读 `:100` 行」的依据）。
- `docs/adr/0017-mermaid-lazy-loading.md:30-66`（三档体积表、`:66` 否决「只按图类型懒加载但入口仍旧静态引」→ 门 B 禁止项 1 的依据）。
- `README.md:97-110,112-124,150-159`（`:103`「只有两组」、`:105/:106` 两 bullet、`:117` 22 文件 295 条、`:155` 21 个测试文件 → P2-4 落点核对）。
- `.tmp/e2e-r36-bug-probe6.mjs:1-60`（E2E 模板的真实形状：`installFakeWorkspace`、`openFolder`/`openDoc` 各 1400 ms 等待、`reloadWith`）→ 预热段与段 1 必须与它兼容。
- 基线复核（实测）：`git rev-parse HEAD` = `b3509c9f…`、`git status --short` = 两条 `??`、`Test-Path node_modules\mermaid` = False、`git grep -c mermaid -- src/` = 0、`dist` = 31 文件 / 1,471,108 B。
- 本轮（rev3）**未改**产品代码、未 `npm install`、未跑浏览器 E2E、未碰 dev server 状态与 `release/`。
