# 第 95 轮执行报告（executor）· 批注五档紧急度（B-222）

轮前 `91fdcf2`；A1/A2 均 **DONE**，0 回滚。dev 5175 未重启；真机 ego CDP 57270（9222–9226 无监听）。

## A1 数据层 —— DONE
文件：`src/lib/annotations.ts`、`src/lib/prompt.ts`、`annotations.test.ts`、`prompt.test.ts`。
新增 `ANNOTATION_PRIORITIES`/`AnnotationPriority`/`ANNOTATION_PRIORITY_LABELS`（`-`/Low/Medium/High/Urgent）/`normalizePriority`；`Annotation.priority` 必填 + `priorityManual?: true`；`ParsedAnnotation.priority?`。`readLine` 只在命中五值时写（meta/overall 不带）；`resolveAnnotations` 与 `parseAnnotationStore` 两分支逐条归一（v 仍 2）；`replaceInWindow` 第 4 参 `reuse`（可复用候选）+ 合并保留 `priorityManual` 与手改档位（不是只保一次）。prompt 在「只改字词不算」后加五档语义（按严重度不按字数、none 只给 meta/overall），两示例 medium/high，`prompt.ts:50` 原样，system 981 字。
**review P1 收口**：`App.tsx` 的 `intake` 改「窗口开始拍 pending 快照（`annotationsRef`）+ 累积 `windowFresh` 每条整窗重算」→ 第 2/3 条重跑 id 也稳定；`setPriority` 置 `priorityManual: true`。
验收 ①～⑥ 全有单测（annotations 22→**28**、prompt 7→**8**）；静态 `priority` HEAD **0**（exit 1）→ **13**；`tsc --noEmit` 干净；`npm test` **57 文件 786 条 0 fail**（日志 `.tmp/r95-a2-npm-test-full.log`）。

## A2 select + CSS + 对比度 + 落盘/重开/重跑 E2E —— DONE
文件：`src/components/MarginRail.tsx`、`src/App.tsx`、`src/styles.css`、`src/lib/themes.test.ts`、`.tmp/e2e-r95-a2-priority.mjs`、`shots/round-95/note-priority.png`。
`.note-head` 在 kind/模拟后加原生 `<select className="note-priority note-priority-<档>">`（`aria-label="第 N 处紧急度"`、`onClick` stopPropagation、`onChange` 转档），5 option；`onSetPriority` 4 行。CSS **计划偏差**：`.note-priority` 基类兼任 none 档 + 四档，`note-priority` 共 **8 行**（HEAD 0）而非 7；焦点环走 `styles.css:192` 全局 `:focus-visible`。`themes.test.ts` 8→**9**：三套 token + 5 条规则（`color-mix` 用既有 `mix`）15 对 ≥4.5；实测 none…urgent 浅 **4.58/7.40/4.63/4.90/5.36**、暖 **4.77/6.53/4.75/4.93/6.00**、深 **6.47/7.67/6.67/4.93/7.52**（4.58–7.67）。
E2E（假工作区 `__vfs`+合成 drop，`note.md` 3 段/`other.md`）**29/29 PASS**（`.tmp/r95-a2-priority.json`，0 pageerror/console）：3 卡各 1 select、option 五档、默认 none、`aria-label` 第 N 处、卡名仍「第 N 处 评价/修订：「引文」」、卡头不横溢；五档底色 5 个互不相同（high=`color(srgb …)`、none=`rgb(241,238,230)`）；urgent 后栏无横溢、卡 282/446/628 不重叠；卡聚焦再 Tab 落 select 且 `outline 2px solid`；三击第 2 段后动 select+Enter：`.note.is-active` 0、选区 68→68；urgent 后 1.6 s store 含 `"priority":"urgent"`+`"priorityManual":true`（3 条）→ 切走切回仍 urgent → 重跑仍 3 卡、urgent 第 1 张、**3 id 逐个相同**、另两卡 none。

## 门禁
`tsc --noEmit` 干净｜`npm run verify` gzip **313,086 B** ≤314,066（净 +520；硬线余 **6,914**）**PASS**｜`npm run roundtrip` 未跑（未改编辑器/序列化）。

## CHANGELOG 建议
`- 批注卡头五档紧急度（-/Low/Medium/High/Urgent）：手改档位记 priorityManual，重跑保留；旧档读成 none（B-222）。`
正文写「第 95 轮（同一未发版区间）」并把标题上界 94→**95**（`changelog.test.ts` 机械门，B-140）。

## 新踩坑（3）
1. `node --test a.test.ts b.test.ts` 沙箱内 spawn EPERM；单文件照 `npm test` 写法 `node --experimental-strip-types <file>`。
2. 假 VFS 的 `getDirectoryHandle` 必须按「有 `path+'/'` 前缀的键」判存在（第 71 轮教训），否则切走切回 `readAnnotationStore` 恒 NotFoundError，重开断言假红。
3. `color-mix()` 的 computed 底色在 Chromium 是 `color(srgb r g b)`，别按 `rgb(` 硬比。
