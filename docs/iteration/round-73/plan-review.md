# 第 73 轮计划审查 · revision 1（critic）

**结论 REVISE**：1 条 P1（A2 验收序列与「相邻即露」自相矛盾，照写必假红），其余 P2。轮前 `a0b66b5` 一致；dev 5175、CDP 9222、`reset.mjs`、不 push/不改 `release/` 都写了；无新依赖，伪元素不进 DOM 文本，保存/roundtrip 不受影响。

## 上一版漏洞已修（逐条实测）
- R1：A3 文件清单含 `package.json`，`scripts.test` 追加 `mathReveal.test.ts`；B2 复用同一测试文件 → 41 文件，门禁假绿消除。尾项见 P2-1。
- R2：`$f.after(1)/before(1)` 取顶层块边界（嵌套 depth 也正确），块内任意偏移算。`tocRender.test.ts:81-83` 现断言 `-1`，按新判据 from=1 → `after(1)=3===src.from` 应变 0，计划写 0 正确；`withToc('一','二')→-1` 也正确（helper 支持多标题，`:21`）。
- R3：state 缓存 + 三条重扫判据；整篇替换（`App.tsx:1183` 的 `replaceWith(0,size)`）会被「步 map 命中旧区间」捕获，不留幽灵装饰。
- R4：改前第 0 步量基线、B3 同脚本复测、≤基线+50 ms，零重建改由「同 doc 换选区 10 次同一引用」单测证。
- R5/R6 照上版建议改了（门禁合并、Shift+Home、假 FSA、复用模块）。

## 可行性抽查（成立）
A1 数值自洽：`.doc-body li > p`@777 打不中 `li>div>p`；label@1040-1043 有 `margin-top:7px`；`p` 下边距 1em=17、行高 1.95=33.15 → 50.14；改后 33.15+li 外边距 3.06=36.2。
A3 机制成立：两个 NodeView 的 wrapper 就是 `[data-latex]` 宿主（dist:135/308），且无 `update` → 走 `NodeViewDesc.update` 的 `updateOuterDeco`（prosemirror-view:1490-1516），类贴 wrapper、KaTeX 不重渲；`atom:true`@27/208。

## P1
**P1-1 A2 验收与机制相矛盾**。`正文甲` 正是 `[TOC]` 的下一个顶层块，按新判据 `$f.before(1)===src.to`，光标一进正文甲就已露出（选区事务即触发，`tocRender.ts:266-275`）。所以「正文甲行中按 ↑ 一次 → 1」是假阳（按之前已是 1）；↑ 又落进已露出的 `.toc-source`，再 ↓ 是回正文甲，「再 ↓ → anchor 在 `.toc-source` 内」必红。`前 0/0` 只能取自载入时光标在标题一（标题二也相邻，只有标题一/尾段不邻）。
**修**：从非相邻块起手：①载入（光标在标题一）→ 0/段高 0；②点尾段 → 仍 0；③↑ 一次 → 正文甲（相邻）→ 1、段高≈33（这才是「从别处按键移入」）；④再 ↑ → anchor 在 `.toc-source` 内；⑤`Shift+Home`+`Backspace` → 假 FSA 读回无 `[TOC]`；⑥点标题二 → 1、点标题一 → 0。impl.md 记「相邻含前/后两块，光标进下一段即露＝设计」，免得 tester 当回归。

## P2
- P2-1（R1 尾项）scribe 行只写「41 文件」；补「按 `npm test` 输出把 README/AGENTS 的 40 文件 524 条改成新值」。
- P2-2 A3 只写伪元素出 `data-latex`，没说渲染结果怎么办 → 会「α + $\alpha$」双显。定一种：露出时隐藏 `.katex`/`.block-math-inner`（Typora 式替换），或明写双显 + 截图。
- P2-3 B2 判据/入口没写死：谓词要含定界符区（`[from-2,to+2]`），否则「→×2 即露」不过；`==` 无 input rule，键盘打不出 mark，必须经 markdown 载入（`.tmp/r51-fsa.mjs` 的 `installFakeWorkspace/openFolder`）；「关设置 `.sl-eq` 0」要 reload（关开关不重排已有 mark，`inlineSyntax.test.ts:160`）。
- P2-4 假 FSA 引用 `scripts/data-safety-acceptance.mjs:76` 是 `showDirectoryPicker`；单文件保存/读回用 `.tmp/r51-fsa.mjs` 的 `readFakeFile` 更省事。
- P2-5 B1 的「块级源码行＝A3」与 A3 实际（伪元素）不符，改「行内/块级伪元素＝A3」；≤2 KB 写三节+三方案偏紧，2.5–3 KB 也合规（findings 上限才是 4 KB）。
