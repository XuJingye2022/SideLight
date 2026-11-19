# 第 95 轮计划修订（planner-revision · rev.2）

读了 `plan.md`(rev.1) 与 `plan-review.md`（1 P1 + 5 P2）。范围不变：仍是用户队列第 2 条（B-222）的五档紧急度；A1/A2 两项与各自门禁不变，没加任务。逐条修法如下（已写进 `plan.md` rev.2）。

1. **P1 · prompt 五档语义**（已修）：五档只按「判断的严重度」定义——low 细节与措辞、medium 表达与结构的小问题、high 论证/证据/结构的问题、urgent 事实错误/逻辑矛盾/读者照做会出错、none 只给 meta 与 overall。硬规则「只改字词不算」与全文模式「不改标点、错别字、措辞」（`prompt.ts:50`）原样保留，rev.1 的「urgent = 语法错误」整句删掉。两条 JSONL 示例分别给 `"priority":"medium"`（evaluation）与 `"priority":"high"`（revision），避免模型全给一档。`prompt.test.ts` 新增断言要求五档名各出现。实测 system 795 字，加这条与两个字段后 **981**，仍 ≤1500（`.tmp/r95-plan-promptlen.mjs` 量的）。

2. **P2 · 验收③自相矛盾**（已修）：改成两条断言——原有字段（id/kind/status/from/to/quote/note）逐项相等，且每条 `priority === 'none'`；条数单独断。不再要求「字段不变」的整体 deepEqual。

3. **P2 · 落盘/重开无证据**（已修）：A2 的 E2E 挂假工作区（照 `.tmp/e2e-r70-impl-a1-delete.mjs:111-188` 的 `window.__vfs` + 合成 folder drop），夹具 `note.md`/`other.md`；设第 1 卡 urgent 后等 1,000 ms，断 `.sidelight/annotations/note.json` 含 `"priority":"urgent"`，再切走切回断仍 urgent、再重跑断仍 urgent 且 id 未变。**关键前提**：假句柄的 `getDirectoryHandle` 要按「有 `path+'/'` 前缀的键」判存在（第 71 轮教训）——否则 `readCache`/`readAnnotationStore` 的无 create 分支一律 `NotFoundError`，重开断言必然假红。键名 `cacheKey('note.md')` = `note`，已核 `src/lib/cache.ts:51`。

4. **P2 · 体积兜底是 a11y 回退**（已修）：rev.1 兜底「先删 `.note-priority:focus-visible`」取消。改为**根本不写**该规则——`src/styles.css:192` 已有全局 `:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset) }`，对所有聚焦元素（含 `<select>`）生效，删了也不掉焦点环，但少一条规则更省且不留「以后有人以为能删」的坑。兜底顺序改成删装饰：① high 的 `color-mix` 单独底色（与 medium 共用 `--mark-wash`，只留 `--warn` 文字色；实算对比度 5.25/5.11/5.54 仍过 AA）② `min-width:64px` ③ `border-radius`。E2E 另加一条「Tab 到 select 时 `outlineStyle==='solid'`、`outlineWidth==='2px'`」，把「焦点指示还在」变成可执行断言。

5. **P2 · 五档对比度未验**（已修）：新增 `themes.test.ts` 第 8 条——读 `styles.css` 的 `:root`/`html[data-theme='sepia']`/`html[data-theme='dark']` 与 6 条 `.note-priority*` 规则，解析 `color:`/`background:`（`color-mix` 用该文件既有 `mix` 合成），断 5 档 × 3 主题 = 15 对 ≥4.5；比值写进 `test.md`。我自己按计划 token 现算了一遍（`.tmp/r95-plan-contrast.mjs`），与 critic 的读数一致：浅 4.58/7.41/4.63/4.90/5.36、暖纸 4.77/6.53/4.76/4.93/6.00、深 6.48/7.67/6.67/4.93/7.52，最小余量 0.08（浅色 none）。token 全在（`--mark-wash`/`--on-mark`/`--warn`/`--danger`/`--accent-wash`/`--accent-ink` 都有定义）。

6. **P2 · 档位不进卡片无障碍名**（取第二条修法）：不改 `noteAriaLabel`（`src/lib/noteA11y.ts:42`，B-141 的卡名与 `noteA11y.test.ts` 断言保持原样），档位由 select 自身的 `aria-label`（`第 N 处紧急度`）+ 当前 value 提供；验收里写明这一点，并加 E2E 断言（`aria-label` 含「第 1 处紧急度」、五档文本 `-/Low/Medium/High/Urgent`）。理由：卡片名是「第 N 处 + 类型 + 引文」的稳定口径，塞档位会让档位每次改动都重播整条卡名；select 作为独立的 Tab 站本来就会被读屏读出控件名与值。

7. **rev.2 自查收口（review 未提，但会让「手改档位保留」变成冻结全部档位）**：rev.1 的 `replaceInWindow` 写 `priority: old.priority ?? item.priority`，而 `priority` 归一后恒有值 ⇒ 重跑永远沿用旧档位，模型新判断永远进不来。改为 `Annotation.priorityManual?: true`（只在用户改档时由 `setPriority` 置位）+ `replaceInWindow` 取 `old.priorityManual ? old.priority : item.priority`。`serializeAnnotationStore` 原样写、`parseAnnotationStore` 归一时保留该字段，所以刷新后仍记得是手改的。单测⑤同时断两条：手改 urgent 保留、未手改的 none 能吃 fresh high。

体积：`MarginRail` 是 `lazy()`（`src/App.tsx:20`），不进首屏口径；首屏净增 ≈+800 B，门槛定 `npm run verify` ≤314,066 B（改前实测 312,566，硬线 320,000 仍余 5,934）。
