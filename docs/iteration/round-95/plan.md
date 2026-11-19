# 第 95 轮计划（planner · rev.2）· 批注五档紧急度（用户队列第 2 条 / 轮前 `91fdcf2`）

> 只做这一条（P1）；状态机、`[AGENT]`、快照/diff、Under Review、对话留后续轮。按 **B-222**。rev.2 修法见 `plan-revision.md`。

## 首屏体积（硬线 320,000；改前 312,566，余 7,434）
净增 ≈**+800**（主 chunk ≈600；CSS ≈200；`MarginRail` 是 `lazy()` 不计）。门槛 `npm run verify` **≤314,066 B 且 PASS**。超了按序删装饰：① high 的 `color-mix` 底（与 medium 共用 `--mark-wash`，对比度仍过 AA）② `min-width` ③ `border-radius`；焦点样式不动。

## A1 数据层：五档 + 旧档归一 + prompt/JSONL
`src/lib/annotations.ts`、`src/lib/prompt.ts`；`annotations.test.ts` 22→28、`prompt.test.ts` 7→8。
1. `ANNOTATION_PRIORITIES`（none/low/medium/high/urgent）、`AnnotationPriority`、`ANNOTATION_PRIORITY_LABELS`（`-`/Low/Medium/High/Urgent）、`normalizePriority`（不合法回 none）；`Annotation.priority` 必填 + `priorityManual?: true`；`ParsedAnnotation.priority?`。
2. `readLine` 的 evaluation/revision 只在 `record.priority` 命中五值时写（缺省/非法不写 → `:64/76/92/98/120` 不红）；meta/overall 不带。`resolveAnnotations` 用 `normalizePriority`；`parseAnnotationStore` 两分支逐条 `{ ...item, priority: normalizePriority(item.priority) }`（`v` 仍 2）；`replaceInWindow` 用 `old.priorityManual ? old.priority : item.priority`。
3. `prompt.ts` 在硬规则「只改字词不算」**后**加一行：`- 每条 evaluation / revision 都带 priority，按判断的严重度给，不按改动字数给：low 细节与措辞、medium 表达与结构的小问题、high 论证/证据/结构问题、urgent 事实错误或逻辑矛盾、读者照做会出错；none 只给 meta 与 overall。`；两条 JSONL 示例末尾加 `"priority":"medium"` / `"priority":"high"`；`prompt.ts:50` 不动；system ≈980 字（≤1500）。

验收：① 五值逐档一致；② 缺字段/`"p0"`/数字 → none 且条目在；③ 旧档两分支（数组/v2，无 priority）条数不变 + 每条 none + 原有字段（id/kind/status/from/to/quote/note）逐项相等；④ 序列化→再解析五档保持；⑤ `replaceInWindow`：`{urgent, priorityManual:true}`+fresh none → urgent 且 id 复用、`none`（无 manual）+fresh high → high；⑥ labels 五档、none 为 `-`。`prompt.test.ts` +1（五档名各现、两档不同、≤1500）。`npm test` **57 文件 ≥786 条 0 fail**（基线 778）。静态 `git grep -nE 'priority' -- src/lib/annotations.ts` 改前 **0**（已核）→ **≥6**。

门禁 `npm test`、`npm run build`。风险：`App.tsx:1998`/`:2487` 的 `{ ...annotation }` 透传带新字段；漏归一 → `<select>` 无选中项。

## A2 卡头五档 select + 样式
`src/components/MarginRail.tsx`、`src/App.tsx`、`src/styles.css`（6 条）、`src/lib/themes.test.ts`。
1. `App.tsx` import `type AnnotationPriority`；`dismiss`（`:2008`）后加 `setPriority`：`map(item => item.id === id ? { ...item, priority, priorityManual: true } : item)`；`<MarginRail>`（`:5914`）传 `onSetPriority`；存盘仍走 `:2063` 的 600 ms effect。
2. `MarginRail.tsx` Props 加 `onSetPriority`；`.note-head`（`:179-185`）在 `.note-kind` 后加 `<select className={`note-priority note-priority-${annotation.priority}`}>`：`value`、`aria-label={`第 ${index + 1} 处紧急度`}`、`onClick` stopPropagation、`onChange` 转类型；`<option value={p}>{ANNOTATION_PRIORITY_LABELS[p]}</option>` ×5。
3. `styles.css` 在 `.note-index`（`:1427`）前加 6 条（只用既有 token）：`.note-priority`（`min-height:24px;min-width:64px;padding:1px 4px;border:1px solid var(--line-strong);border-radius:4px;font-size:11px;cursor:pointer`，底色/字色由五档给）+ none（`--ink-faint`/`--panel`）、low（`--accent-ink`/`--accent-wash`）、medium（`--mark`/`--mark-wash`）、high（`--warn`/`color-mix(in srgb, var(--warn) 14%, var(--paper-raised))`）、urgent（`--on-mark`/`--danger`）。**不写** `:focus-visible`（`styles.css:192` 全局已覆盖）。

验收：
1. 静态：`note-priority` 改前 **0**（已核）→ **≥7 行**（styles.css 6 + MarginRail 1）；`onSetPriority` 0 → **≥4**。
2. 对比度：`themes.test.ts` +1，读三套 token 与 6 条规则（`color-mix` 用该文件既有 `mix`），断 15 对 ≥4.5；实测 4.58–7.67（全表见 `plan-revision.md`），抄进 `test.md`。
3. E2E `.tmp/e2e-r95-a2-priority.mjs`（ego CDP 57270，先清 localStorage）：假工作区照 `.tmp/e2e-r70-impl-a1-delete.mjs:111-188`（`__vfs` + 合成 folder drop），夹具 `note.md`（3 段）+ `other.md`；`getDirectoryHandle` 按「有 `path+'/'` 前缀的键」判存在（第 71 轮教训）。打开 `note.md` → 点第 2 段 → `.analyze-button` → 3 张 `.note`；每卡 1 个 select、value 依次五档、文本 `-/Low/Medium/High/Urgent`、默认 none、`aria-label` 含「第 1 处紧急度」、卡片 `noteAriaLabel` 保持原口径（档位只由 select 提供）；五档 `selectOption` 回读值+class+底色 5 个互不相同；urgent 后栏 `scrollWidth−clientWidth=0`、卡不重叠（`next.top ≥ prev.top+prev.offsetHeight`）；第 1 卡聚焦后 `Tab` → activeElement=select 且 `outlineStyle==='solid'`/`2px`；三击第 2 段后 `selectOption` 并聚焦按 `Enter` → `.note.is-active` 0、正文选区仍是整段；第 1 卡设 urgent → 等 1,000 ms → `__vfs.files.get('.sidelight/annotations/note.json')` 含 `"priority":"urgent"` → 切 `other.md` 再切回仍 urgent → 再点 `.analyze-button` 仍 urgent、id 未变；0 `pageerror`；截图 `shots/round-95/note-priority.png`。
4. `npm run verify` **≤314,066 B** 且 PASS。

门禁 `npm test`、`npm run verify`；不跑 roundtrip（未改编辑器/序列化）。风险：① CSS `?direct` 缓存（第 54 轮；不对就 touch）；② select 的 click 冒泡会触发 `onFocusNote`（改正文选区），必须 stopPropagation；③ 卡高由 `App.tsx:2443` 的 effect 重算，不必 `onRequestLayout`；④ 假 VFS 的 `entries()` 跳过 `.sidelight*` 与嵌套键。

`CHANGELOG.md` 写 `**第 95 轮（同一未发版区间）**` 并把标题上界 94→**95**，否则 `changelog.test.ts` 红（B-140）。
