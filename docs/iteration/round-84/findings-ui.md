# 第 84 轮 finder-ui 报告

结论：**3 条新问题**（P1 ×1、P2 ×2）：`actionable_count=1`、`p0p1_count=1`。用户已排队的 3 条与复查清单里的 25 条都不重复。环境：dev 5175（HTTP 200），HEAD `5760913`，CDP 9222–9226 全无监听，改用 ego-browser（CDP 54280）真机量测。

## F1（P1，编辑）`==高亮==` / `^上^` / `~下~` 手打与粘贴都不渲染，只有重新解析才生效
设置默认已开（`src/lib/settings.ts:67` `inlineSyntax: true`，页面 localStorage 无设置键即用默认）。在空文档里 `Input.insertText('==红== 与 ^上^ 与 ~下~')` 后 DOM 是 `<p>==红== 与 ^上^ 与 ~下~</p>`，`.sl-eq`/`.sl-sup`/`.sl-sub` = **0/0/0**；切源码视图追加 1 字再退回（触发 `applySource` 重解析）后同一段变成 `.sl-eq`/`.sl-sup`/`.sl-sub` = **1/1/1**。
根因在代码：三个 mark 只有 `parseHTML: () => []` + `parseMarkdown`（`src/lib/inlineSyntax.ts:99-120`），`src/App.tsx:958` 只 `inlineSyntaxMarks()` 注册进 schema，**没有输入规则**；`MathInputRules`（`src/lib/mathInput.ts:108-141`）只认 `$`。
影响：按 Typora 习惯写公式/高亮的用户看到字面符号，直到重开文档才变样式——与已修的 B-158（迁移默认开关）不是同一路径。对照组：同位置 `Input.insertText('$x^2$')` 正常生成 1 个 `.katex` 行内原子，说明 B-157 的公式输入路径没回归。
建议：给三枚 mark 加输入规则（复用 B-119 的 flanking 守卫与 B-213 的 `\=` 转义），或停笔后对当前块重解析。

## F2（P2，打印）光标在 `[TOC]` 相邻段落时，打印/另存 PDF 会印出字面 `[TOC]`
夹具 `# 第一章\n\n[TOC]\n\n## 甲…` 退出源码视图后，光标在 h1（`anchorNode=第一章 offset 0`），`[TOC]` 段却是 `class="toc-source is-revealed"`、`display:block`、高 **33.1 px**、正文可见文本含 `[TOC]`；同时目录 `nav.sl-toc` 也在（高 105.8 px、3 条）。露出本身是第 73 轮 B-155 的「相邻即露」设计，编辑期不算错；但打印块 `src/styles.css:2495-2576` 没有 `.toc-source` / `.is-revealed` 的恢复规则，屏幕规则（`:967`，只压 `:not(.is-revealed)`）不匹配 → 露出态原样进纸面（与 B-160 的公式/高亮定界符同类）。
建议：打印块补 `.doc-body .toc-source { display: none; }`。**UNVERIFIED**：print media 未真验（本机 `Emulation.setEmulatedMedia` 未生效，`matchMedia('print')` 仍 false），静态 CSS + 屏幕态露出为证。

## F3（P2，可访问性）设置面板「恢复默认」按钮 46×19 px，低于 24×24
设置 →「批注提示词」（默认折叠）展开后，该钮实测 **46×19**（`padding:2px 0`、11.5 px 字号），是 `.dialog-inline` 里唯一目标；上一目标（textarea label）底边 678、按钮顶边 686，间隙 8 px < 24 px 圆半径 12 px，WCAG 2.5.8 AA 的间距豁免不成立。与 B-110 家族（`.note-actions button`、`.toolbar-group > button`、`.stats-trigger` 已提到 24）同源，属漏项。
建议：给该钮（或其容器）加 `min-height: 24px`，宽度不动。

## 通过项（本轮实测，不计数）
- 行内公式：`$x^2$` → `inline-math` + `.katex`，无错误（早前一次「公式失效」假象是 `ego_key` 打不出 `$`，已排除）。
- `==甲==乙` 干净用例：重新解析后高亮只盖「甲」，`.sl-eq-delim` 两枚 widget 只在选区贴边时出现（B-161 行为正确）。
- 设置主题 radiogroup：4 钮恰 1 个 `tabIndex=0`（选中「跟随系统」），其余 −1。

## BACKLOG 已有条目（不重复计数）
B-103 图片缩放、B-106 emoji、B-107 自定义快捷键、B-124 手打行内链接、B-126 `host\bin\www` 旧前端、B-135 代码围栏高亮、B-141 批注卡键盘聚焦。

## UNVERIFIED
- 1000×620 窄窗与 print media：`Emulation.setDeviceMetricsOverride`/`setEmulatedMedia` 在本浏览器未生效（`innerWidth` 仍 1256）。
- 真实屏幕阅读器；WebView2 宿主内渲染；0 console 错误未采。
- 原始数据：`.tmp/r84-finder-ui.json`。
