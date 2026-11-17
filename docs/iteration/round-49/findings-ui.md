# 第 49 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：49；轮前 `startSha=57e2a81748090e63b88b1ad4f998ca3b689e347f`，本轮 `git rev-parse HEAD` 与之一致；只读产品代码，未改任何 `src/` 文件，新增只有 `docs/iteration/round-49/findings-ui.md`、`shots/round-49/r49-ui-*` 与 `.tmp/e2e-r49-ui-*.mjs`
- 环境：dev server `http://localhost:5175`（未另起、未重启，`GET /` 返回 200）；CDP **9226**；每个脚本前跑 `node .tmp/reset.mjs 9226`
- 本轮矩阵都新跑：1440×900 浅/深 内容态（H1–H4、列表、任务项、表格、`---`、代码块、长 URL、Mermaid、引用、kbd/mark/sub/sup、脚注）、1024×700 浅、大纲（1024/1440）、查找条、表格工具条、设置面板 1440/1024、Mermaid 成功态浅/深、Mermaid 错误态浅/深、中文标点逐行断点与放大截图、焦点顺序 21 站、hover/active/disabled 盘点、reduced-motion
- 脚本与原始输出（全部本轮新跑）：
  - `.tmp/e2e-r49-ui-a.mjs` → `.tmp/r49-ui-a-log.txt`（内容态截图、字号/行高、几何、Mermaid 浅深、大纲）
  - `.tmp/e2e-r49-ui-b.mjs` → `.tmp/r49-ui-b-log.txt`（中文逐行断点、标点字宽、行内元素样式、段落放大截图）
  - `.tmp/e2e-r49-ui-c.mjs` → `.tmp/r49-ui-c-log.txt`（mark/行内代码/代码块配色、Mermaid 深色节点、hover 与 Tab 顺序、查找条与命中、表格条几何）
  - `.tmp/e2e-r49-ui-d.mjs` → `.tmp/r49-ui-d-log.txt`（Mermaid 错误态对比度、页签 hover、设置面板几何/单选组、reduced-motion）
  - `.tmp/e2e-r49-ui-e.mjs` → `.tmp/r49-ui-e-log.txt`（第 48 轮遗留复核：占位符、表格/分隔线对比度、1119/1120 断点）
- 控制台：五段脚本 `CONSOLE_ERRORS []`（A/B/C/D/E 全空）。无请求失败（`__doc`/`__draft` 探测已排除）
- 未 push、未动 `release/`

## 截图矩阵（全部在 `shots/round-49/`）

| 项 | 截图 |
| --- | --- |
| 富文本浅色 1440 顶部/中部/底部（H1–H4、列表、任务、表格、`---`、代码块、长 URL、Mermaid、引用、kbd/mark/sub/sup） | `r49-ui-a-01-rich-light-1440.png`、`r49-ui-a-02-rich-light-1440-mid.png`、`r49-ui-a-03-rich-light-1440-low.png` |
| 富文本深色 1440 顶部/底部 | `r49-ui-a-04-rich-dark-1440.png`、`r49-ui-a-05-rich-dark-1440-low.png` |
| 1024×700 浅色 顶部/底部 | `r49-ui-a-06-rich-light-1024.png`、`r49-ui-a-07-rich-light-1024-low.png` |
| 大纲 1024 / 1440 | `r49-ui-a-08-outline-1024.png`、`r49-ui-a-09-outline-1440.png` |
| 中文逐行断点放大（三张） | `r49-ui-b-01-p1-zoom.png`、`r49-ui-b-02-p2-zoom.png`、`r49-ui-b-03-p3-zoom.png` |
| 查找条（浅色，输入「标」后） | `r49-ui-c-01-find-light.png` |
| `<mark>` 与行内代码同屏（深色） | `r49-ui-c-02-mark-dark.png` |
| 表格工具条（浅色） | `r49-ui-c-03-table-bar.png` |
| Mermaid 语法错误 浅色 / 深色 | `r49-ui-d-01-mermaid-err-light.png`、`r49-ui-d-02-mermaid-err-dark.png` |
| 设置面板 1440 / 1024 | `r49-ui-d-03-settings-1440.png`、`r49-ui-d-04-settings-1024.png` |
| 表格与 `---` 浅/深取样、1119 断点 | `r49-ui-e-01-table-light.png`、`r49-ui-e-02-table-dark.png`、`r49-ui-e-03-1119.png` |

---

## 本轮新发现

### N1（P2）Mermaid 语法错误提示在深色主题下对比度 **3.03:1**（浅色 5.38:1），低于 AA 4.5:1

实测 `.tmp/r49-ui-d-log.txt`：

| 主题 | 文字色 | 底色 | 对比度 |
| --- | --- | --- | --- |
| 浅色 | `#a45050` | `#fffdf8` | **5.38:1** 过 |
| 深色 | `#a45050` | `#1c1f23` | **3.03:1** 不过 |

- 提示文案：「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」，在截图 `r49-ui-d-02-mermaid-err-dark.png` 里是暗红压在近黑底上，明显偏灰。
- 成因：`src/styles.css:708-711` 的 `.mermaid-preview.is-error { border-color: #c98a8a; color: #a45050 }` 写的是字面色，没有用主题变量（同文件 `.rail-notice.is-error`、`.toast.is-error` 都走变量）。
- 建议：改 `color: var(--danger-ink, #a45050)` 并在深色块里给亮一档的 `--danger-ink`（约 `#e2a2a2`，对 `#1c1f23` ≈ 7:1）；边框同理。纯 CSS，零字节。

### N2（P2）Mermaid 图配色与字体不跟站点色板：浅色是 mermaid 默认淡紫 `#ECECFF` + 紫边 `#9370DB`，深色节点填充与容器底只差 **1.03:1**

实测 `MERMAID` / `MERMAID_DARK2`（`.tmp/r49-ui-a-log.txt`、`.tmp/r49-ui-c-log.txt`）：

| 项 | 浅色 | 深色 |
| --- | --- | --- |
| 节点填充 / 描边 | `rgb(236,236,255)` / `rgb(147,112,219)` | `rgb(31,32,32)` / `rgb(204,204,204)` |
| 图内文字 | `rgb(51,51,51)`，字体 `"trebuchet ms"` 16 px | `rgb(204,204,204)`，字体 `"trebuchet ms"` 16 px |
| 容器底 | `rgb(255,253,248)` | `rgb(28,31,35)` |
| 深色节点填充 vs 容器底 | — | **1.03:1**（节点只剩描边） |

- 全站色板是暖纸 `#fffdf8` / 墨绿 accent `#2b6d64`，图里却是冷紫；同一张页面里两套色。截图 `r49-ui-a-03-rich-light-1440-low.png`、`r49-ui-a-05-rich-dark-1440-low.png`、`r49-ui-c-02-mark-dark.png`。
- 图内文字 `"trebuchet ms"` 与正文 `Source Han Serif SC` 不同族，节点内中文回退到系统无衬线，与全站衬线正文不一致。
- 成因：`src/styles.css:683-700` 只给了容器底色与边框，没有给 `<svg>` 内的主题变量；mermaid 初始化用默认主题（深色时切到 mermaid 的 `dark`）。
- 建议：在渲染前 `mermaid.initialize({ theme: 'base', themeVariables: { primaryColor: accent-wash, primaryBorderColor: accent, lineColor: line-strong, fontFamily: font-read, fontSize: '14px' } })`，浅深两套从 CSS 变量取；节点填充与底至少 1.5:1，让节点可辨。改在 Mermaid 预览组件一处。

### N3（P2）`<mark>` 与行内代码用了同一底色：两者对比 **1.01:1**，`<mark>` 对纸底只有 **1.04:1**（浅）/ **1.23:1**（深），等于没有高亮

实测 `MARK_VS_CODE` / `MARK_DARK`（`.tmp/r49-ui-c-log.txt`）：

| 主题 | `<mark>` 底 | `` `code` `` 底 | 纸底 | mark vs code | mark vs 纸底 |
| --- | --- | --- | --- | --- | --- |
| 浅色 | `#ebf1ed` | `#e8f0ed` | `#f6f4ee` | **1.01:1** | **1.04:1** |
| 深色 | `rgb(31,42,42)` | `rgb(34,48,46)` | `rgb(21,23,26)` | ≈1.06:1 | **1.23:1** |

- 放大截图 `r49-ui-b-03-p3-zoom.png`：「高亮」两个字与普通正文肉眼无差别；`r49-ui-c-02-mark-dark.png` 同。
- 成因：`src/styles.css:660-665` 的 `.doc-body mark { background: color-mix(in srgb, var(--accent-wash) 78%, var(--paper)) }`，与 `.doc-body code` 的 `--accent-wash` 同源；而专门给高亮准备的 `--mark-wash: #f7ecdc`（`src/styles.css:14`）没有被用在这里。
- 第 47 轮刚加的行内 HTML 白名单里，`mark` 是四个标签之一；现在它渲染了但看不出来，用户会以为没生效。
- 建议：`.doc-body mark { background: var(--mark-wash) }`，深色用 `--mark-wash` 的深色值（`src/styles.css:50` 已有 `#2f2619`）；与代码底色分开。

### N4（P2）代码块字号 **12.72 px**，比行内代码 **14.79 px** 与正文 17 px 都小：字号层级倒挂

实测 `FONTS`（`.tmp/r49-ui-a-log.txt`）：

| 元素 | 字号 | 行高 |
| --- | --- | --- |
| 正文 `p` | 17 px | 33.15 px |
| 行内代码 `code` | **14.79 px**（0.87em） | 28.84 px |
| 代码块 `pre code` | **12.72 px**（0.748em = 0.86 × 0.87） | 21.62 px |

- 成因：`src/styles.css:633-641` 的 `.doc-body pre { font-size: 0.86em }` 与 `src/styles.css:625-631` 的 `.doc-body code { font-size: 0.87em }` 叠加；`.doc-body pre code`（`src/styles.css:643-646`）只重置了 `background` 与 `padding`，没重置 `font-size`。
- 截图 `r49-ui-a-02-rich-light-1440-mid.png`：代码块一屏能塞 3 行，字明显比正文小一圈；行内代码反而更大。
- 建议：`.doc-body pre code { font-size: inherit }`（得 14.62 px），或把 `pre` 提到 0.9em。一行 CSS。

### N5（P2）侧栏页签 hover 没有任何视觉反馈（非当前页签）

实测 `TAB_HOVER`（`.tmp/r49-ui-d-log.txt`）：把鼠标移到「大纲」页签，前后 `background / color / border` 三个值完全不变化（`changed: false`，`rgba(0,0,0,0)` / `rgb(102,108,114)` 三色不变）。

- 成因：`src/styles.css:1438-1444` 只定义了 `.sidebar-tabs button` 与 `:1446` 的 `.is-active`，整套 CSS 里没有 `.sidebar-tabs button:hover`。
- 同类按钮都有：顶栏/工具栏按钮 hover 实测从 `transparent/rgb(86,92,97)` 变 `rgb(232,240,237)/rgb(35,84,77)`（`HOVER` 三条 `changed: true`）。只有页签例外，用户点之前没法确认它可点。
- 建议：加 `.sidebar-tabs button:hover { background: var(--accent-wash); color: var(--accent-ink) }`，与工具栏一致。

### N6（P2）破折号「——」只有 30.26 px 宽，比两个汉字 34 px 窄 3.7 px；其余全角标点都是 17 px

实测 `GLYPH_WIDTHS`（`.tmp/r49-ui-c-log.txt`，canvas 按 `17px Source Han Serif SC` 逐字量）：

| 字符 | 宽 |
| --- | --- |
| 中 / 。/ ，/ ；/ ：/ ？/ ！/ … / （ / ）/ 「 / 」/ 《 / 》/ 【 / 】 | 全部 **17 px**（满格） |
| —（U+2014 破折号） | **15.13 px** |

- 中文排版里破折号占两格（34 px），现在成对出现只占 30.26 px，行内会短 3.7 px，与「省略号占两格」不一致。放大截图 `r49-ui-b-02-p2-zoom.png` 里「破折号——还有」可以对比。
- 成因：`--font-read` 主字体 `Source Han Serif SC` 的 U+2014 宽 0.89em（canvas 直接量的结果），不是 1em。
- 建议：`.doc-body { font-feature-settings: ... }` 不解决；可行做法是给 `--font-read` 后面补一个 U+2014 满格的字体，或用 `@font-face` 的 `unicode-range` 单独指定。属字体层面，改动小但要重测往返字节。**注**：这是字体覆盖问题，未做逐字体 fallback 实验。

### N7（P2，改进建议）没有中西文自动间距：中文与拉丁字母、数字紧贴

- 实测：全文 CSS 里 `text-autospace` / `text-spacing` / `text-justify` **0 命中**（`Select-String src/styles.css`），渲染时 `text-align: start`、`letter-spacing: normal`（`LINES_P1`）。
- 截图 `r49-ui-a-01-rich-light-1440.png` 第一段末「Mixed English words in a sentence」前只有一个空格；`333 字` 那类数字与中文之间也没有额外空隙。
- Chromium 已支持 `text-autospace: normal`（本地 Chromium 版本可试）。建议给 `.doc-body` 加一条，失败无副作用（不支持就忽略）。这属于排版打磨，不是缺陷。

---

## 第 48 轮遗留项：本轮复核结果

| 编号 | 本轮实测 | 结论 |
| --- | --- | --- |
| 48-F1 表格线/分隔线对比度 | `BORDERS_LIGHT`：`th` 边框 vs 表头底 **1.15:1**、`hr` vs 纸底 1.15；`BORDERS_DARK`：`th` 边框 vs 表头底 **1.00:1**（完全同色）、`hr` **1.00:1** | 仍在（`r49-ui-e-01/02`） |
| 48-F2 ≤1119 px 正文反而变宽 | `BREAKPOINT_SWEEP`：1440→576 px、1120→550、**1119→861**、1024→766 | 仍在 |
| 48-F3 查找条占文档流 | `FIND_LIGHT`：`.find-bar` `rect [0,84,1440,79]`、`position: static`；关闭后 `scrollTop` 残留本轮未复测 | 仍在（位置项） |
| 48-F4 占位符字体字号不一致 | `PLACEHOLDER`：16 px / `Segoe UI` / `line-height: normal`；正文 17 px / `Source Han Serif SC` / 33.15 px | 仍在 |
| 48-F5 表格条是全宽文档流横条 | `TABLE_BAR`：`rect [0,84,1440,36]`、`position: static`、父节点 `.app`，目标单元格 `tdRect [393,601,…]` 相距 **481 px**；`.sidebar` y = **120**（本应 84） | 仍在 |
| 48-F6 字号 14 档 | 本轮未重跑字号全集，不判 | 未复测 |
| 48-F7 页边 sticky 面板压卡 | 本轮未放多张批注卡，不判 | 未复测 |
| 47-F2 设置面板要滚 | `SETTINGS_1440`：`scrollH 936 / clientH 858` → 滚 **78 px**；`SETTINGS_1024`：`936 / 658` → 滚 **278 px** | 仍在（`r49-ui-d-03/04`） |
| 47-F3 主题单选组无方向键 | `SETTINGS_*`：三个 `role=radio` 的 `tabIndex` 全 **0**（应 roving） | 仍在 |
| 47-F9 点击区 <24 px | `FIND_LIGHT`：7 个按钮全高 **23 px**；`TABLE_BAR`：7 个按钮全高 **23 px** | 仍在 |
| 47-F10 查找条无标签 | `FIND_LIGHT`：`barRole: null`、`barLabel: null`；两个输入框 `aria-label: null`（只有 placeholder） | 仍在 |

## 试过、判断没有问题的项（本轮都有实测）

- **焦点顺序与焦点环**（`TAB_ORDER`，21 站）：跳转链接 → 顶栏 6 个 → 工具栏 11 个 → 侧栏「文件」页签 →「打开文件夹…」→ 正文编辑器 → 回到跳转链接。每站 `outline: 2px solid rgb(43,109,100)`、`outline-offset: 2px`，连续可见；正文进焦点时 `outline-style: none` + 滚动区顶部内阴影（第 42 轮正向出口成立）。
- **hover 有反馈**（`HOVER`）：顶栏「?」、工具栏「插入 ▾」hover 前后底色 `transparent → rgb(232,240,237)`、文字 `rgb(86,92,97) → rgb(35,84,77)`；`transition: background, color 0.12s`。只有页签例外，已列 N5。
- **active 态可辨**：工具栏 H1 `aria-pressed="true"` + 底色 `rgb(232,240,237)`；「分析本段（模拟）」同类底色。状态不只靠颜色：`aria-pressed` 同时在。
- **reduced-motion 生效**（`REDUCED_MOTION`）：`emulateMedia({reducedMotion:'reduce'})` 后顶栏/工具栏/页签按钮 `transition-duration` 与 `animation-duration` 都是 `1e-05s`。
- **中文断行没有违反禁则**（`LINES_P1/P2`）：逐字符矩形切行后，两段样本里行首没有出现 `。，；：？！…）》」』】`，行尾没有出现 `（《「『【`；全角标点宽度都是满格 17 px（`GLYPH_WIDTHS`）。断点只落在汉字与汉字之间，符合预期。（唯一例外是破折号字宽，见 N6。）
- **长 URL 不撑破版面**（`GEOM_1440.longUrl`）：`overflow-wrap: break-word`、`scrollWidth == clientWidth`（576/576），链接折到下一行，无横向滚动。
- **代码块横向不溢出**：`preScroll` 574/574（1440）、754/754（1024），长行按 `pre-wrap` 折行。
- **1024×700 无横向溢出**（`GEOM_1024`）：`.doc-scroll` `796/796`、工具栏高 38 px 不换行、表格与代码块都在列宽内。
- **大纲可读**（`OUTLINE`）：`aria-label="大纲"`、4 个标题按 10 px 递进缩进（`padL 0/10/20/30`）、当前标题 `is-active` 底色 + `rgb(35,84,77)` 文字、行高 24 px、字形 12.5 px。
- **设置面板语义完整**：`role=dialog`、`aria-label="设置"`、`aria-modal="true"`、打开后焦点在面板内（`focusInside: true`）、7 个按钮 28–30 px 高。
- **行内元素样式齐全**（`INLINE_STYLES`）：`code` 绿底圆角、`a` 有 1 px 下划线（`border-bottom` 而非 `text-decoration`）、`mark` 有底色、`sub/sup` 12.75 px 且不出行框、`kbd` 有 1 px 边框与圆角。
- **Mermaid 错误不再残留到 `body`**：`MERMAID_ERR_*` 的 `bodyHasStray: false`（第 47 轮修复成立）。
- **控制台 0 错误**：五段脚本全空。

## UNVERIFIED

- **真实 125% / 150% 系统缩放**：本轮只用视口尺寸（1440/1024）测布局，没做真实 DPR 放大；`Emulation.setDeviceMetricsOverride` 在上一轮该 CDP 会话就没生效，本轮未重试。补测需系统缩放 125% 的机器。
- **N2 的修法**：只测了现状（默认主题的两套色），没做 `themeVariables` 实验，所以「改成站点色板后对比度能到多少」没有实测数字。
- **N7 的 `text-autospace`**：只验证了当前 CSS 没有这条声明，没验证本机 Chromium 是否支持、效果如何。
- **N6 的字体 fallback**：只量到 U+2014 是 15.13 px，没做 `unicode-range` 覆盖实验，也没确认是主字体还是 fallback 字体提供的字形。
- **页边批注卡、文件树有内容态、快速打开浮层、导出菜单、Toast**：本轮没覆盖（48 轮已覆盖批注卡与页边栏，文件树只有空态）。补测需要真实文件夹句柄或注入 mock。
- **屏幕阅读器实录**：只做 DOM/AX 属性审计，没有 NVDA/讲述人播报。
- **真实中文输入法与 IME**：全部 `fill` / `keyboard.press`，未走组合输入。
- **hover 截图**：hover 状态用 `getComputedStyle` 前后对比取值，没为每个 hover 单拍截图。

## 最短复现清单

1. N1：`Ctrl+/` 粘贴含语法错误 mermaid 的文档 → 切深色 → 读 `.mermaid-preview.is-error` 的 `color`（`rgb(164,80,80)`）与底 `rgb(28,31,35)` → 3.03:1；浅色 5.38:1。
2. N2：同一份文档里放一个合法 mermaid 图 → 浅色读节点 `fill/stroke`（`rgb(236,236,255)` / `rgb(147,112,219)`）、图内文字 `fontFamily`（`trebuchet ms`）；切深色再读节点填充 vs 容器底 = 1.03:1。
3. N3：正文写 `<mark>高亮</mark>` 与 `` `代码` `` → 读两者 `backgroundColor`（`#ebf1ed` vs `#e8f0ed`）→ 1.01:1；`<mark>` 对纸底 1.04:1。
4. N4：放一个代码块 → 读 `.doc-body pre code` 的 `font-size`（12.72 px）与行内 `code`（14.79 px）、正文（17 px）。
5. N5：鼠标移到非当前侧栏页签（「大纲」）→ 前后 `background/color/border` 三值不变。
6. N6：正文写「破折号——还有」→ canvas 按 `17px Source Han Serif SC` 量 `—` 得 15.13 px，量「中」「。」得 17 px。
7. N7：`Select-String -Path src/styles.css -Pattern 'text-autospace|text-spacing'` → 0 命中；正文里中文与拉丁字母之间只有一个空格。
