# 第 102 轮计划（单轮 A，1 条 P2）

> **revision 1**（planner-revision，依 `plan-review.md` 的 CR-1~CR-4；范围/任务不变）。

- 参数：round=102 / nn=102，目录 `docs/iteration/round-102`，startSha `bdd0c17`（=HEAD；工作树仅未跟踪报告/截图）。
- 范围：只做新报 B-230（P2，可访问性/右侧对话页签）「『生成批注』焦点丢到 `<body>`」。单轮。

## 体积基线（实测）

- 首屏门 gzip **315,146**（距硬线余 **4,854**：`measure-first-screen.mjs` 跑 HEAD `dist/`）。
- 常驻懒 chunk `MarginRail-*.js` raw 18,336 / gzip **6,489**（`gzipSync(level:9)`）；门+chunk = **321,635**（B-229 open，超线 1,635）。
- 本改动只落懒 chunk（主包只换 `<hash>` 等长串）：**门 +0 B（`--max 315200` 须 PASS），chunk +≤250 B（≤6,760）**。

## 根因（已读源码）

- `src/App.tsx:6026-6030`：`onGenerateNotes` 先 `setRailTab('notes')` 再 `void runAnalysis(instruction)`。
- `src/components/MarginRail.tsx:636-642`：`#rail-panel-chat` 随即 `hidden`，被聚焦的 `.rail-chat-generate` 失焦 → 焦点回 `body`。证据 `.tmp/r102-finder-{a,b}.log`：T3 `afterGenerate`=BODY / `afterTab`=stats-trigger、S3 `active:""`。
- 接管点：同组件 `#rail-tab-notes`（`:351-381`）/`#rail-panel-notes`（`:385-391`），`App.tsx` 零改动。

## A1 焦点交接：对话→批注切页签后落到「批注」页签

- backlog_id：B-230（finder 新报，待 lead 入池）；文件：`src/components/MarginRail.tsx`。
- 步骤：
  1. 加 `const lastTabRef = useRef(railTab)`；`useRef`/`useEffect` 已在 `:1` 导入，不新增 import。
  2. 加 `useEffect(..., [railTab])`：`previous = lastTabRef.current` → 写回；只在 `previous === 'chat' && railTab === 'notes'` 继续；再 `if (document.activeElement !== document.body) return`；否则 rAF `document.getElementById('rail-tab-notes')?.focus()`。
  3. 注释：`hidden` 收起面板会丢焦点；选页签不选首卡（卡片异步，抢卡打断读者）。
- 门禁：`npm run build`；`npm run verify`（≤315,200，PASS）；`npm test`（基线 61 文件 861 条 0 fail；不加单测）。
- 风险：① CR-3：原 `panel?.contains(active)` 分支实测不可达（`hidden` 落地时焦点已回 body），**已删**，报告不得写成已验。② 严禁无条件 `focus()`（A2 的 CR-1 用例会红）。③ 不动 `onTabChange` 与 ←/→ 的 rAF。④ 若键盘路径红，回报 lead，不放宽守卫。

## A2 真机验收（键盘 + 鼠标 + 4 条反向回归 + CR-1 用例 + 体积）

- 文件：`.tmp/e2e-r102-focus.mjs`（模板 `.tmp/e2e-r102-finder.mjs`；ego CDP **57270**、5175、1440×900、假 FSA + 3 条批注）、`.tmp/r102-focus.json`、`shots/round-102/focus-after-generate.png`、`docs/iteration/round-102/impl.md`。
- 步骤：
  1. 假 FSA 装 `a.md` + 3 条批注 → 打开文件夹 → 点 `#rail-tab-chat`（`aria-selected=true`、对话面板可见）。
  2. 键盘：`.rail-chat-input.fill('把这段压短，只留结论')` → `.rail-chat-generate.focus()` → `press('Enter')`；200 ms / 1,800 ms 的 `activeElement` 都必须是 `#rail-tab-notes`，且 `#rail-panel-chat` hidden、`#rail-panel-notes` 可见；再按 1 次 `Tab` → 焦点在批注面板内、不是 `.stats-trigger`。
  3. 鼠标：切回对话、填同句、`locator('.rail-chat-generate').click()`；断言同 2（改前 `active:""`）。
  4. 反向 4 条（每条先等 `analyzing` 落，约 1.8 s，否则早退）：① 焦点在 `.ProseMirror` 时点 `#rail-tab-notes` → 焦点在页签；② 页签上 `ArrowRight` → 焦点落 `#rail-tab-notes`；③ 连做两次生成 → 第二次同落页签；④ 生成后点 `.ProseMirror p`，再鼠标切对话/批注（不经生成）→ 焦点仍 `.ProseMirror`。
  5. **CR-1（必做）**：等 `analyzing` 落 → 点 `#rail-tab-chat`、填同句、停 200 ms、断言生成钮未 disabled → `page.click('.ProseMirror p')`（停 200 ms）→ `page.evaluate(() => document.querySelector('.rail-chat-generate')?.click())`（合成点击不移焦点）→ 200 ms / 1,800 ms 断言 `#rail-panel-notes` 可见且 `activeElement` 仍 `.ProseMirror`；无条件 focus 在此红。
  6. 体积（CR-2）：先 `npm run build`；`node scripts/measure-first-screen.mjs --max 315200` **真跑一次**（须 exit 0）；`gzipSync(level:9)` 量新 `dist/assets/MarginRail-*.js`（≤6,760）；impl.md 记「门 315,146 + 新 chunk X = 新总 Y，B-229 超线 Y−320,000（方法不变）」，不写「B-229 未变」。
- 门禁：同 A1 复跑；截图 1 张（上限 2）。
- 风险：无 Key 走模拟分析（约 1.6 s）；`reset.mjs` 端口不匹配就跳过，**不要重启 dev server**。

## 出圈（不做）

- 不并入：`findings-bug.md` F3（生成批注吞掉指令）、`findings-code.md` F3（流式中断 `MarginRail.tsx:196-205` 抢焦点）。
- **CR-4：`findings-code.md` F1（P1）**——`writeRevision` 每保存一次全量 `dir.entries()` + 逐档读解析（`src/lib/revisions.ts:206-245`，调用 `src/App.tsx:3395-3407`）→ **lead 入池、单开一轮**，本轮不并入（BACKLOG 无条目）。
- 不做「焦点落首卡」；不改 B-229 口径、不裁体积；不动 `release/`、不 push、不发版、不加依赖。回滚面：`src/components/MarginRail.tsx`。

## 验收清单（critic / tester）

1. `git diff --stat` 只有 `src/components/MarginRail.tsx`（+ 报告/脚本）。
2. 静态对照：`git grep -c 'rail-tab-notes' -- src` 1→2；`git grep -n 'lastTabRef' -- src` 0→3；`document.activeElement`（`MarginRail.tsx`）0→1；`requestAnimationFrame` 同文件 1→2。
3. A2 JSON `allPass:true`：`afterGenerate`/`afterCards` = `rail-tab-notes`、`tabAfter` 非 `stats-trigger`、4 条反向 + CR-1 用例全 true。
4. `npm run verify` PASS 且 `--max 315200` exit 0；`npm test` 61 文件 861 条 0 fail；chunk ≤6,760。
5. `impl.md` 记「门 315,146 + 新 chunk X = 新总 Y，B-229 超线 Y−320,000（方法不变）」，不出现「B-229 未变」；`panel.contains` 已删，不得声称已验。
