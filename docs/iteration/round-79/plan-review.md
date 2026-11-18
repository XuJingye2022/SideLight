# 第 79 轮计划审查（critic，复审 revision 1）

判定：**PASS**（PASS-WITH-NOTES）。R79-1/2/3 全修掉；剩 6 条 P2 是执行细节，不必再改计划。v1 存档 `.tmp/r79-plan-review-v1.md`。

## 上一版漏洞核验（3/3 修掉）

1. **R79-1 已修。** plan.md:1 标题「P2 清账第 1 批：3 条」；:3 明写 B-157 不属本批；A2:31 把 B-157 两条断言（点 `$\alpha$`→Esc 不露源码；手打 `$x^2$` 仍成品）列为同页门槛，都过才交 tester 判 verified，否则仍 open + 原因；A1:20 先 `localStorage.clear()` 再断 `.sl-eq` ≥1。复核 `settings.ts:67` 默认 true、`:134` 无版本/旧版本 false 迁回 true → 默认路径必出高亮。
2. **R79-2 已修。** plan.md:22 的过期脚本经 `Select-String` 核实：r78-a3-print:40,49、r74-b2-eq:25（伪元素断言 :109-128）、r74-b3:45、r74-tester:41；不重跑、禁止写回 `shots/round-78/`；A1:20 补 print 媒体 → delim none、`.sl-eq` 可见。
3. **R79-3 已修。** plan.md:19 限定 `src`、排除 docs/.tmp、贴改前 12 行。实测恰 12 行：styles.css:858,859,865,869,2543,2544；mathReveal.ts:21,163；mathReveal.test.ts:188；mathStyle.test.ts:97,109,110。`:21` 注释列入同改。

## 本轮新增（P2，照做即可）

1. **A1 静态门与 step 3 字面冲突。** plan.md:14 让 `mathStyle.test.ts:97`「加」`sl-eq-delim`，该行现是 `sl-eq-revealed`；同文件 :109-110、`mathReveal.test.ts:188` 的「0 条」断言若留旧字面，0 门必红。`mathReveal.ts:22-23`/`:158` 注释也仍写 `Decoration.inline`（只改 :21 不够）。修：测试旧字面替换/删除（单测断 2 条 widget 的 from/to/side），三处注释同改。
2. **widget 参数有歧义。**「`from` 侧 −1、`to` 侧 +1」读成位置偏移会整体错一字。修：写死 `Decoration.widget(range.from, makeDom, { side: -1 })`、`(range.to, …, { side: 1 })`（side 只排序）。
3. **Node 单测无 `document`。** toDOM 必须传函数、渲染时才 `createElement`；不能 `makeDom()` 预建（会 ReferenceError），单测别调用 toDOM。
4. **A1 真机脚本先聚焦。** 载入后 `Home`/`→` 不在编辑器不动选区（第 42 轮坑），delim 0 假红。修：点 `.ProseMirror p` 停 200–250 ms 再按，或先断 activeElement。
5. **A2「段文本无 `\alpha`」没写量法。** KaTeX 默认输出含 MathML，DOM 的 `textContent` 里有 `annotation` 的 `\alpha`（`innerText` 也不保证排除）；若量的是编辑器文档文本又恒真。修：删这条，照 round-75 只断 `.sl-math-reveal` 0 / `::after` none / `.katex` 可见。
6. **A3 计数口径。** `min-height: 24px` 实测 3 处（:1931,2288,2439），`:1600` 是 `height: 24px`；4→5 只有合计两类才成立。修：写明「min-height 3→4；24px 高度 4→5」。

## 其他核验

- A2 属实：`App.tsx:4822/4826`、`export.ts:33,110,258-276`、`export.test.ts` 6 条 TOC（:192,210,216,225,236,253）。
- A3 属实：`styles.css:1394-1398`、`:1931`；`MarginRail.tsx:151-187` 的 evaluation 卡恰 3 钮；r66 审计第 1 条是 `.rail-head button`（0×0），与「只量 3 钮」一致。
- A1 算术：屏幕公式 6 条（styles.css:2132,2139,2143,2147,2151-2152）+delim 1=7；print 公式 6 条（:2530,2537,2541-2542,2548,2552）+delim 1=7，test 1 的 printSet=screenSet 仍成立。
- 红线/容量：无新依赖、不动内核与 `release/`；截图 ≤2；25 分钟偏紧，plan.md:6 的降级口径可执行。
