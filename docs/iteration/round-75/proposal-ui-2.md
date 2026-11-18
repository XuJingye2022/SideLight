# round-75 第二批提案（finder-ui）：8 条应修 + 10 条 open P2 复核

- 环境：dev `http://localhost:5175` 200；CDP **9223 连接失败**（只探 1 次，9222–9226 按指示不重试）→ 浏览器侧结论 **UNVERIFIED**。
- 基线：HEAD `e5dd887`；`npm test` exit 0：**41 文件 536 条 0 fail**（`.tmp/r75-finder-ui-b-test.log`）。
- 口径：用户 3 条（行内公式 / `==高亮==` / 行间公式观感）已进 `plan.md`（B-157/158/159），不重复。本表 2 条本轮新发现 + 6 条既有项（4 条与 `findings-code.md`/`proposal-ui.md` 交叉确认）。
- P0 表为空；P1 只剩 B-135（deferred，需产品负责人批准新依赖），不列入。

## 提案（按优先级）

| # | 级别 | ID | 区域 | 问题 | 本轮证据 | 修法要点 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | P2 | 新-1（B-160） | 打印 | 光标停在公式/高亮里时按「打印 / PDF」，纸上出 `$$…$$` / `==` 而不是成品：打印的是活 DOM（`window.print()`，`src/App.tsx:5411`），`@media print` 只藏外壳 | `src/styles.css:2459-2521` 无覆盖；`:2146-2148` 露出时 `.katex`/`.block-math-inner` 置 `display:none`；`:858-871` 伪元素画 `==` | `@media print` 里恢复 `.katex`/`.block-math-inner` 显示，并把 `.sl-math-reveal::after`、`.sl-eq-revealed::before/::after` 置 `content:none`；验收：光标进公式/高亮后打印预览出成品、0 个定界符 |
| 2 | P2 | 新-2（B-161） | 编辑 | `==a**b**c==` 露出时定界符重复：选区一进就显示 `==a====b====c==`。一个 `Decoration.inline` 跨 3 个 text node，ProseMirror 给每个 text node 外包带类的 `<span>`，CSS 伪元素逐 span 画 `==` | `src/lib/mathReveal.ts:159-165`（inline 装饰）、`:144-156`（只合并区间）；`node_modules/prosemirror-view/src/viewdesc.ts:895-899`（文本节点强制 `needsWrap`）、`:1090-1113`（带 class 时外包 span）、`:1545-1560`（逐节点传 active 装饰）；`src/styles.css:858-871` | 定界符改 `Decoration.widget` 放区间首尾，或拆「首 widget + 中段 class + 尾 widget」；与用户第 2 条同组件，建议并入 A2 收尾。验收：`==a**b**c==` 选区进中段，可见 `==` 恰好 2 次 |
| 3 | P2 | B-134 | 导出 | HTML 导出丢目录、`[TOC]` 写成字面 `<p>[TOC]</p>` | `src/App.tsx:4817` 用 `editor.getHTML()`；`src/lib/export.ts` 的 `toc\|nav` **0 命中**；第 62 轮实测 `<nav` 0、字面 1（`docs/iteration/BACKLOG.md:80`） | 导出前用 `toc.ts` 标题树另建 `<nav class="sl-toc">` 插进 bodyHtml 并删字面标记段；验收：含 `[TOC]` 文档导出 `<nav` 1、字面 0，无标记文档字节不变。**已覆盖**：`findings-code.md` #3、`proposal-ui.md` #1（两轴一致，建议排第一批） |
| 4 | P2 | B-109 | 可访问性 | 设置主题 radiogroup 方向键无效，4 项全进 Tab 序 | `src/components/SettingsDialog.tsx:44`、`:57-58`、`:74-75`；文件内 `tabIndex\|onKeyDown\|Arrow` **0 命中** | roving tabindex + ArrowLeft/Right/Home/End 换项并同步 `aria-checked` 与预览；验收：Tab 只落 1 项、右方向键换项。**已覆盖**：`findings-code.md` #4、`proposal-ui.md` #5 |
| 5 | P2 | B-110 | 可访问性 | 页边批注卡动作钮高 22 px，低于 24×24（WCAG 2.5.8 AA） | `src/styles.css:1394-1398` 只有 padding 2px/12px 字号，无 `min-height`；BACKLOG 实测三钮 54/42/66 × **22**（`docs/iteration/BACKLOG.md:72`） | `.note-actions button{min-height:24px}`；`.stats-trigger` 已有 `min-height:24px`（`src/styles.css:1931`），`I` 21×24 与它属间距豁免待量，本轮只改批注钮。**已覆盖**：`findings-code.md` #5 |
| 6 | P2 | B-122 | 外观 | 暖纸主题下 Mermaid 仍用浅色默认配色，与米黄纸底不统一 | `src/lib/mermaidLazy.ts:57-68` 只返回 `dark \| default`，`data-theme='sepia'` 落 `default`；节点填充 `rgb(236,236,255)`（`docs/iteration/BACKLOG.md:75`） | 加 `'base'` 分支，`themeVariables` 取 `--paper`/`--ink`/`--accent`；验收：sepia 填充变化且 ≥4.5:1，light/dark 逐值不变。**已覆盖**：`findings-code.md` #7 |
| 7 | P2 | B-136 | 界面 | 只读视图（预览/源码）查找条仍可输入、可切 `Aa`/`ab`，但无命中无提示 | `src/components/FindBar.tsx:48-49`（`locked` 只喂按钮）、`:54-75` 输入框无 `readOnly`、`:79-96` 开关无 `disabled`、`:77` 计数空白、`:136` 仅一行说明 | `locked` 时输入框 `readOnly`、两开关 `disabled`，`aria-describedby` 指向说明；验收：预览里 `Ctrl+F` 后输入框不可改、开关禁用、正文 0 高亮。**已覆盖**：`findings-ui.md` F3、`proposal-ui.md` #3 |
| 8 | P2 | B-150 | 界面 | 设置面板内容溢出随窗口变小放大：1440×900 **152 px** / 1024×700 **352 px** / 1000×620 **432 px**；页脚三档在框内（B-108 口径成立），只是末段要滚 | `.tmp/r70-ui-followup.json` 的 `settingsNarrow`；`shots/round-70/ui-settings-1024x700.png`；`docs/iteration/BACKLOG.md:81` | 分节默认折叠或压缩节间距；验收：1024×700 `scrollHeight-clientHeight` ≤64 px，页脚仍可见。**未覆盖**（`proposal-ui.md` 列为下一批） |

## 分批建议（每 3 条一批）

- 第 1 批：**#3 B-134 + #4 B-109 + #5 B-110**（导出错 + 两条小 a11y，可全静态验收）。
- 第 2 批：**#7 B-136 + #6 B-122 + #1 新-1**（只动 CSS/组件，可同轮）。
- 第 3 批：**#2 新-2 + #8 B-150 + B-121**（B-121 只动 `src/lib/assetImage.ts:56` 的 `waitResolve`，但无真宿主，只能记 UNVERIFIED，放最后）。
- 随批带掉：**B-126**（`powershell -File host\build.ps1` 重拷 www）；**B-111**（纯文档，交 scribe 补差距表 4 行）。

## 10 条 open P2 复核（用户点名要清）

| ID | 本轮状态 | 证据 |
| :-- | :-- | :-- |
| B-103 图片缩放 | 仍缺，功能级（需先定语法/交互） | `docs/typora-gap.md:70` |
| B-106 TOC/emoji | TOC 已完成；emoji 仍缺，需惰性 chunk | `docs/iteration/BACKLOG.md:68` |
| B-107 自定义快捷键 | 仍缺，功能级（设置 UI + 冲突处理） | `docs/typora-gap.md:83` |
| B-109 / B-110 / B-122 / B-134 | 仍成立（见 #4/#5/#6/#3） | 上述 |
| B-111 差距表导出行 | 仍成立：`docs/typora-gap.md:30` 只列 HTML/MD/纯文本/打印，缺 Word/Epub/LaTeX/图片 | 本轮读表 |
| B-121 宿主裸路径 404 | 仍成立：`src/lib/assetImage.ts:56` 的 `waitResolve` 只判 `getAssetDocPath() !== ''`，宿主流派恒 `''` | 本轮读源码 |
| B-126 host www 分叉 | 仍成立：www 98 文件 3,891,248 B / 入口 `index-BxH_Xt2Z.js`；`dist` 98 文件 3,891,594 B / 入口 `index-DP7HQwxX.js` | 本轮测量 |

## UNVERIFIED

- 8 条均无页面证据（CDP 9223 不通，未重试）。新-1/新-2 为源码 + `node_modules/prosemirror-view/src/viewdesc.ts` 静态推断，**需真页面复测**才能判修复。
- B-122「与纸底协调」是观感判断，只能截图对比；B-150 三档数字引自第 70 轮，本轮未复测。
