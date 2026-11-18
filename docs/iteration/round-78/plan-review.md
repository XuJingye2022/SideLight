# 第 78 轮计划审查（critic，复审 revision 1）

判定：**PASS**（PASS-WITH-NOTES）。v1 的 H1–H5 全部核验修掉；剩 3 条 P2 是执行细节，不需要再改计划。v1 原文存档 `.tmp/r78-plan-review-v1.md`。本批 3 条均 P2，按直令审（A3 属高风险级联）。

## 上一版漏洞核验（全部修掉）

1. **H1 A3 空操作：已修。** plan.md:34-38 改成逐字复制屏幕选择器（含 `.doc-body`、`.tiptap-mathematics-render`、`sl-math-reveal`、`[data-type=…]`、`::after`，块根另加 `[data-type='block-math']`），并写明 `@media` 不加权重、同权重靠顺序。复核 `src/styles.css`：屏幕露出侧 2132（0,3,0）、2139/2147（0,4,0）、2151-2152（0,4,0）、858-871（0,2,0）；全文唯一 `@media print` 在 2464，晚于全部屏幕规则 → 同权重顺序胜出，不再空操作。`mathStyle.test.ts:47-53` 的「块数=4」排除条件也仍成立（4 条块级公式规则不含 `sl-math-reveal`）。
2. **H2 A3 静态证据：已修。** plan.md:39 给出选择器逐字相等（按 `@media print` 括号配对分两侧）+ print 起点晚于 `:2132`/`:858` 两条机械断言，另加声明值断言，能判开 H1 的简写空操作。执行注意下面第 1 条。
3. **H3 A1 脚本崩溃：已修。** plan.md:14 保留 `waitForFunction(...).catch(() => {})`；复核 toast 由 `{notice && …}`（App.tsx:5987）渲染，错误提示不自动消失（:2179-2181 对 `kind==='error'` 直接 return），5 s 超时被吞，不会在 :176 前中断整段。
4. **H4 A2 静态条数：已修。** plan.md:27 改成「≥3 行且含 `announce: false`」。实测 HEAD 的 `announce` 0 处，改后至少 5 处（三处类型、`announce !== false`、`announce: false`），≥3 不假红。
5. **H5 B-160 入池：已修。** plan.md:33 补 BACKLOG 行。实测全仓只有 `round-75/proposal-ui-2.md:12` 记 B-160，BACKLOG 0 命中，补行必要。

## 本轮新增（P2，执行时照做即可）

1. **A3 单测的选择器相等必须先 Set 去重。** 屏幕侧含 `sl-math-reveal`/`sl-eq-revealed` 的规则按逗号拆是 **10 条**：`:858` 的共用规则给 `::before/::after`，`:865`/`:869` 又各给一次；唯一值正好 8。照 plan.md:39 字面「拆除、空白归一、排序、deepEqual」会 10 vs 8 假红，逼执行者放宽断言（正好丢掉 H2 的保护）。修：两侧 `[...new Set(list)]` 再去重比较；可选另断屏幕侧原始条数 10，证明两条 content 规则都在。
2. **A3 真机段「各 1」与「4 个定界符」互相矛盾。** 一次打印要同时露行内公式、块级公式与高亮；若只把光标放进其中一个，另一个 math 的 `::after` 根本不生成，`content` 计算值仍是 `none` → 假绿。修：先 `Ctrl+A`（或跨三者的 Selection）→ 断言 `.sl-math-reveal` **2**、`.sl-eq-revealed` **1** → 再 emulateMedia 查 4 条；或改逐项 3 次 emulateMedia、每步各 1。
3. **A2 并发刷新残留（不阻塞）。** 改名时若已有一次 `refreshTree` 在飞（App.tsx:2696 排队），在飞那次用旧 options 算 added/gone 仍会补「已刷新」。验收脚本无并发不触发；证据里写「并发刷新时可能并列」即可，或下一批把 `announce` 并进排队键。

## 其他核验

- 引用都在：`bigfile-acceptance.mjs:127`（现断「文件太大」，`App.tsx:2549` 文案已无此串）、`keyboard-acceptance.mjs:174-193`、`App.tsx:2692-2752/2822/679/682`、`mathStyle.test.ts:47-53`、`styles.css:2464` 唯一 print 块；复用件 `.tmp/e2e-r58-rename.mjs`、`.tmp/r51-fsa.mjs`、`.tmp/e2e-r74-probe-blockmath.mjs` 都在。
- 红线：无新依赖、不动 Tiptap 内核/序列化/`release/`、版本与 CHANGELOG 不动 → 不违反。
- 环境：实测 9222–9226 全 closed、5175 200；真机项大概率 UNVERIFIED（A3 可试 ego），计划已写降级口径。
- 容量：A1 两处断言、A2 三处、A3 一块 CSS + 两条测试，25 分钟够。
