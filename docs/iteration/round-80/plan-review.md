# 第 80 轮计划审查（critic）

判定：**REVISE**（4×P1 + 2×P2，改完不再复审）。3 条均 P2；只挑影响证据、可行性、收口的点。

## 漏洞

1. **R80-1（P1）A1 颜色读数口径错，很可能量不到节点底色。** plan.md:18 让脚本读「`fill`，无则 `color`」。mermaid 11.12.0 的流程图配色由 SVG 内 `<style>` 类规则驱动，`rect` 上通常没有 `fill` 属性；读不到退回 `color` 就是文字色，sepia 断言与 4.5:1 会假红。既有做法是全用 `getComputedStyle`（`.tmp/e2e-r46-impl-t3-mermaid.mjs:83-91`）。修：三处改 `getComputedStyle(el).fill/.stroke/.color`，先断言非 `null` 再比；期望值不写死 `rgb(251, 243, 227)`（`themes.ts:20` 是 `#fbf3e3`，base 主题可能派生），写成「= `--paper-raised` 换算值」或先记实测；「第二次与第一次逐值相等」只比 fill/stroke/color（SVG id 带递增序号，整串比必红）。

2. **R80-2（P1）A1 没写怎么造出带 `language` 的 mermaid 块。** 手打必须走键盘：Tiptap `CodeBlock` 输入规则 `^```([a-z]+)?[\s\n]$` 才写 `attrs.language`（`node_modules/@tiptap/extension-code-block/dist/index.js` 的 `addInputRules`）；`fill`/`insertText` 不触发它，`.mermaid-preview` 不出现 → 假红。修：写明 `page.keyboard.type('```mermaid')` + `Enter`，或照 `.tmp/e2e-r46-impl-t3-mermaid.mjs:55-75` 源码态填围栏再退出。

3. **R80-3（P1）A2「点 Aa 后 `aria-pressed` 仍 false」不可复现。** Aa 此刻 `disabled`（`findBarState.ts:36`）：Playwright `click()` 等 enabled 到超时；`dispatchEvent` 手动派发又会真触发 `onToggleCaseSensitive` → 假红。修：只断 `disabled===true` 且 `aria-pressed===false`；要真点用 `click({ force: true })` 或 CDP `Input.dispatchMouseEvent`（真实鼠标事件对 disabled 不派发 click）。

4. **R80-4（P1）A3 的 ≤64/≤64/≤8 是估计值，没有先测后定和不达标出口。** 改前 152/352/432 有据（第 70 轮），折叠两个 `<details>` 能压多少没量；common.md 要求「没有实现路径的硬指标不要写进验收」。修：plan.md:42 改「折叠后先量三档 `scrollHeight-clientHeight` → ≤64 达标；65–120 做一次间距压缩（:46）；仍 >120 记实测与差值，说明剩余属内容量、不判未完成」，1440×900 的 `≤8` 改 `0 或 ≤8`。

5. **R80-5（P2）三条都没写夹具，A2 两条断言依赖文档内容。** 「`.preview-pane` 内 mark 0」：`==高亮==` 在预览是 `<span class="sl-eq">`（`inlineSyntax.ts:76`），只有行内 `<mark>` 才是 `mark`；「键入「字数」得 `1 / 1`」要求该词恰好一次。修：写死播种（`localStorage.clear()` + `.tmp/r80-a1-mermaid.md` 围栏、`.tmp/r80-a2-find.md` 含「丁节」「字数」各 1 次、无 `<mark>`/`==`）；A2 也可改断 `.find-count==''` + 两 input `value==''`。

6. **R80-6（P2）没有收口和批次清单。** 三条都没写 BACKLOG 怎么落：B-122/B-136 已 `fixed`，真机过后谁判 `verified`；B-150 `deferred`→`fixed` 还是留 deferred；plan.md:1 也没写批次号（第 79 轮写了「P2 清账第 1 批」）。修：每任务加「证据文件 + 目标状态」，计划头写「第 2 批 / 10 条清单 / 本批 3 / 余 7」。

## 属实的核对

- A1 修复点真实：`mermaidLazy.ts:144` 早退不复跑 `configure`；`configure` 同主题幂等（`:110`），19 条单测的并发用例仍 `inits===1`。
- A2 源码态假设成立：`App.tsx:4292` 的 Ctrl+F 不分视图；`:5682-5688` 两条说明分别含「源码」「只读」；锁定时 `.find-count` 空（`FindBar.tsx:80`）；`.preview-pane` 在 `PreviewPane.tsx:128`，plan.md:33 的风险条可删。
- A3 现状属实：`.dialog` `max-height`/`overflow-y:auto`（`styles.css:1449-1458`）、`.dialog-actions` sticky（`:1501-1512`）、13 字段在 `SettingsDialog.tsx:74-233`；`[role=radio]` 4 项与 roving（`:77-90`）不受影响。
- 基线：mermaid 19 条、`npm test` 45 文件 579 条、gzip 303,914 B；startSha `556e7ff` = HEAD。
