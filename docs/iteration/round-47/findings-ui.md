# 第 47 轮 界面美观与可访问性 侦察报告（finder-ui）

- 轮次：47；轮前 `startSha=d429211164a6a94dfbcf6a580a857d9beb5371c6`，本轮 `git rev-parse HEAD` 与之一致（只读产品代码，未改任何产品文件；新增只有 `docs/iteration/round-47/` 与 `shots/round-47/r47-ui-*`）
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP **9226**；每个脚本前跑 `node .tmp/reset.mjs 9226`
- 视口 / 主题矩阵：1440×900 浅色、1440×900 深色、1024×700 深色、空工作区 + 草稿恢复、批注页边栏（3 张模拟卡）、查找条、表格条、字数面板、设置面板、链接浮层
- 脚本与原始输出：
  - `.tmp/e2e-r47-ui-main.mjs` → `.tmp/r47-ui-main-log.txt`（富文本排版阶梯、对比度、规则计数、中文排版、设置面板几何与主题单选组键盘、链接浮层、提示条 vs 模态、大纲 Tab、点击区尺寸）
  - `.tmp/e2e-r47-ui-3.mjs` → `.tmp/r47-ui-3-log.txt`（hover 实测、大纲几何、页边栏、表格条、查找条、深色、1024 窄窗）
  - `.tmp/e2e-r47-ui-probe.mjs` → `.tmp/r47-ui-probe-log.txt`（页边栏 DOM 结构与批注卡几何）
  - `.tmp/e2e-r47-ui-2.mjs` 第一版因 `mouse.down` 误触「设置」按钮中断，数据已由 `-3` 重跑覆盖，不再引用
- 控制台：三段脚本全程 `CONSOLE_ERRORS []`，无 pageerror、无失败请求（Find/Stats 面板除外，见下）
- 未 push、未动 `release/`

## 截图矩阵（全部是本轮 `shots/round-47/`）

| 项 | 截图 |
| --- | --- |
| 富文本浅色 1440（H1–H4、列表、任务项、表格、代码、Mermaid） | `r47-ui-01-rich-light-1440.png` |
| 设置面板浅色（底部裁切） | `r47-ui-02-settings-light.png` |
| 链接就地编辑浮层 | `r47-ui-03-link-editor.png` |
| 提示条压在设置对话框操作行上 | `r47-ui-04-toast-over-settings.png` |
| 正文浅色（批注用文档） | `r47-ui-05-doc-light.png` |
| 大纲页签 | `r47-ui-05-outline.png`、`r47-ui-06-outline.png` |
| 页边栏 3 张模拟批注卡 + 整体评价面板 | `r47-ui-07-rail-top.png` |
| 页边栏滚到底 | `r47-ui-08-rail-bottom.png` |
| 表格工具条（全宽，离表格 572 px） | `r47-ui-09-table-bar.png` |
| 查找条（全宽 79 px） | `r47-ui-09-find.png`、`r47-ui-10-find.png` |
| 字数明细 360×325 | `r47-ui-10-stats.png` |
| 空工作区（侧栏空态 + 恢复的草稿正文） | `r47-ui-11-empty-light.png` |
| 深色富文本 | `r47-ui-11-dark-rich.png`、`r47-ui-12-dark-rich.png` |
| 设置面板深色 | `r47-ui-12-settings-dark.png`、`r47-ui-13-settings-dark.png` |
| 窄窗 1024×700 深色（内容被操作行切断） | `r47-ui-13-narrow-1024-dark.png`、`r47-ui-14-narrow-1024-dark.png`、`r47-ui-14-settings-1024-dark.png`、`r47-ui-15-settings-1024-dark.png` |

---

## 发现

### F1（P2，第 43/44/46 轮未修）标题阶梯塌陷：H4 与正文同为 17 px，H2 的行框（44 px）比 H1（42 px）还高

实测（`.tmp/r47-ui-main-log.txt` 的 `TYPO`，截图 `r47-ui-01`）：

| 元素 | 字号 | 行高 | 行高比 | 行框高 |
| --- | --- | --- | --- | --- |
| H1 | 31.45 px | 42.46 px | 1.35 | 42 px |
| H2 | 22.44 px | 43.76 px | **1.95** | **44 px** |
| H3 | 18.7 px | 36.47 px | 1.95 | 36 px |
| H4 | **17 px** | 33.15 px | 1.95 | 33 px |
| 正文 | 17 px | 33.15 px | 1.95 | 133 px（4 行） |

- 只有 `h1` 写了 `line-height`（`src/styles.css:580-600`：h1 1.85em/1.35，h2 1.32em、h3 1.1em 都没有），`h2/h3/h4` 继承正文 1.95；**样式表里没有 `h4` 规则**（`Select-String '^h[1-6]|h4' src/styles.css` 只命中 580/588/594 三条）。
- 结果：H2 字号比 H1 小 9 px，行框反而高 2 px；H4 与正文完全同号，只靠 700 字重和 22.61 px 上下间距区分（截图 `r47-ui-01` 里「四级标题：表格与代码」与正文同级）。
- 建议：`h2: 1.32em/1.45`、`h3: 1.22em/1.45`、`h4: 1.12em/1.45`，给 h2–h4 补 `line-height`；正文行高从 1.95 收到 1.8–1.85。纯 CSS，零字节增量。

### F2（P2，第 44 轮 F1 / 46 轮 F7 未修）设置面板一打开就要滚动：1440×900 滚 78 px，1024×700 滚 278 px；最后一段说明被 sticky 操作行压住 11 px 并越出对话框 7 px

实测（`.tmp/r47-ui-main-log.txt` 的 `SETTINGS_BOX`、`.tmp/r47-ui-3-log.txt` 的 `SETTINGS_NARROW`，截图 `r47-ui-02`、`r47-ui-14-settings-1024-dark`）：

- 1440×900：对话框 `[505,20,430,860]`，`clientH 858 / scrollH 936` → **要滚 78 px**；操作行 `.dialog-actions` `[526,823,378,36]` 仍是 `position: sticky`（`src/styles.css:1191-1196`）；最后一段说明 `.dialog-note` `[526,848,378,40]`，与操作行**纵向重叠 11 px**（848 < 859），底边 888 比对话框底边（880）**多 7 px**。
- 1024×700：对话框 `[297,20,430,660]`，`clientH 658 / scrollH 936` → **要滚 278 px**；截图 `r47-ui-14` 里内容在「联网核对（可选）」处被操作行切断，下方「批注提示词」整块只能靠滚。
- 结构原因与第 46 轮一致：`.dialog` 自己滚整块内容（`src/styles.css:1135-1144`），sticky 操作行又吃掉一段可视高度。
- 建议：`.dialog` 改「外框 flex 列 + 内容区 `overflow-y:auto` + 操作行 `flex: none`」，操作行永不被裁，内容区给底部 `padding-bottom`。

### F3（P2，第 46 轮 F3 未修）主题单选组三个按钮三个 Tab 站，方向键完全无效

实测（`.tmp/r47-ui-main-log.txt` 的 `THEME_KEYS`、`SETTINGS_BOX`）：

- 三个 `role="radio"` 的 `tabIndex` 全是 `0`（各 122×30），键盘要走 3 站才过这一组。
- 焦点在「跟随系统」（`aria-checked=true`）时真实按 `ArrowRight` + `ArrowDown`：`focus` 仍是「跟随系统」，`checked` 仍是 `["false","false","true"]`，`data-theme` 仍是 `system` —— 焦点不动、选中不变。
- 代码：`src/components/SettingsDialog.tsx:43-70` 三个 `<button role="radio">`，无 roving tabindex、无 `onKeyDown`。
- 建议：按 WAI-ARIA radiogroup 模式只留选中项 `tabIndex=0`，方向键切换并移动焦点；或换回原生 `<input type="radio">`。

### F4（P2，第 46 轮 F4 未修）大纲每个有子标题的标题占两个 Tab 站；折叠三角 14×24、与标题文字间距 0 px、而且三角和标题都没有 hover 反馈

实测（`.tmp/r47-ui-main-log.txt` 的 `OUTLINE_TAB`、`.tmp/r47-ui-3-log.txt` 的 `OUTLINE`、`HOVER_OUTLINE`，截图 `r47-ui-05-outline`、`r47-ui-06-outline`）：

- 4 个标题（H1–H4）共 **7 个 Tab 站**：`outline-item` → `outline-toggle` → `outline-item` → `outline-toggle` → `outline-item` → `outline-toggle` → `outline-item`（`OUTLINE_TAB` 原样录到 7 步，三角每次都夹在下一条标题前面）；3 个标题的文档同样是 3 item + 2 toggle。
- `.outline-toggle` 三处都是 **14×24**；`gapBetweenToggleAndItem: 0`（toggle 右边界 20 == item 左边界 20），三角与标题文字贴死。
- hover 实测：`outline-item` 与 `outline-toggle` 的 `hoverChanged` 都是 **false**（颜色、底色、边框全不变）；`activeChanged` 也是 false。
- 建议：合成一行一个 Tab 站（标题按钮 `tabIndex=0`，三角 `tabIndex=-1`，左右键或单独快捷键处理折叠），三角点击区扩到 24×24，与文字留 4–6 px；两者都补 hover 底色。

### F5（P2，第 46 轮 F6 未修）链接浮层仍没有可点按钮、字号 10/10.5/11 px、点正文别处不关、焦点离开后 Esc 也关不掉

实测（`.tmp/r47-ui-main-log.txt` 的 `LINK_EDITOR`、`LINK_AFTER_OUTSIDE_CLICK`、`LINK_AFTER_ESC`，截图 `r47-ui-03`）：

- `buttons: 0`；框内字号只有 `10px / 10.5px / 11px` 三档（同一应用设置输入框 13 px、顶栏按钮 12 px）。
- 提示 `普通链接用 Enter 保存，Esc 取消`（对比度 4.83:1，勉强过 AA 4.5）。
- 浮层开着时用鼠标点正文（`page.mouse.click(700,430)`）后：`stillOpen: true`、焦点已在 `BODY`、`links: 0`；再按 `Esc` **仍 `stillOpen: true`** —— 浮层只能靠再按一次 `Ctrl+K` 或刷新摆脱。
- 建议：加「保存 / 取消」两个按钮（≥24 px 高）；`document` 级 `mousedown` 点到浮层外按「取消」关闭并还原选区；Esc 挂到 window；字号提到 12/12.5 px。

### F6（P2，第 44 轮 F5 / 46 轮复核项，仍在）表格工具条是一条压在内容顶端、离表格 572 px 的全宽横条，三个按钮全叫「删除」

实测（`.tmp/r47-ui-3-log.txt` 的 `TABLE_BAR`，截图 `r47-ui-09-table-bar`、`r47-ui-14-settings-1024-dark`）：

- 点进表格单元格后：条 `rect [0,84,1440,36]`、`position: static`，单元格 `[393,620,288,36]`，`gapPx = -572`（条比单元格底边高 572 px）。它是文档流里的一条全宽横带，位于工具栏下方、跨过侧栏上方（截图里像第二条工具栏），插入/删除按钮与目标表格之间没有任何视觉联系。
- 7 个按钮高 **23 px**、无 `aria-label`（只有 `title`：`删除当前行` / `删除当前列` / `删除整张表格`），但**可见文字都是「删除」**，三点完全同名，不悬停分不出删什么（截图 `r47-ui-09` 第二组三个「删除」）。
- 建议：改成浮在表格上方 4–8 px 的小浮条（`position: absolute`，宽度贴合表格），按钮文字写「删行 / 删列 / 删表」或补可见区分，`aria-label` 与 `title` 同源，按钮 `min-height: 26px`。

### F7（P2，第 46 轮 F8 部分修好、残留可见重叠）提示条不再挡住点击，但仍画在设置对话框操作行上面：「快捷键」被盖住

实测（`.tmp/r47-ui-main-log.txt` 的 `TOAST`、`TOAST_VS_MODAL`，截图 `r47-ui-04`）：

- Ctrl+S 取消保存 → `.toast` `[666,816,109,38]`「已取消保存。」；再开设置：操作行 `[526,823,378,36]`，两者**几何重叠 3,379 px²**。
- `document.elementFromPoint(操作行中心)` 命中 `DIV.dialog-actions` —— 点击已穿透（第 46 轮「挡住按钮」的问题已修好），但截图 `r47-ui-04` 里提示条**画在按钮行之上**，正好盖住「快捷键」三个字（还能看到半个「键」）。
- 建议：模态打开期间把提示条下沉到遮罩之下（或改挂到状态栏上方一条），或给模态加 `isolation` 让浮层分属不同层叠上下文；视觉上不应压模态的操作行。

### F8（P2，第 45 轮 F7 未修 + 新证据）hover 反馈只在顶栏/工具栏/状态栏有，侧栏页签、大纲行、大纲三角完全没有；全站 `:active` 规则 0 条

实测（`.tmp/r47-ui-main-log.txt` 的 `RULE_COUNT`、`.tmp/r47-ui-3-log.txt` 的 `HOVER_STATES`）：

- 样式表 4 个 sheet、410 条规则：`:hover` **12** 条、`:active` **0** 条、`:focus-visible` 4 条。
- 有 hover：顶栏「设置」`transparent → rgb(232,240,237)`、文字 `rgb(86,92,97) → rgb(35,84,77)`（`hoverChanged: true`）；工具栏第 4 个按钮、字数入口同样有变化。
- 没有 hover：侧栏页签「文件」`hoverChanged: false`（底 `rgb(255,253,248)`、文字 `rgb(29,32,35)`、inset 下划线全不变）；大纲行、大纲三角 `hoverChanged: false`。侧栏页签是主导航，用户悬停时没有任何可点提示。
- 按下态：4 个控件 `mouse.down` 后 `activeChanged` 全为 `false`（`:active` 命中元素是 `HTML`，实际按钮无规则），全站也没有任何按下位移/配色。
- 建议：给 `.sidebar-tabs button`、`.outline-item`、`.outline-toggle`、`.rail-*` 按钮补与顶栏一致的 hover 底色；统一加 `:active { transform: translateY(1px) }` 或加深一档底色。

### F9（P2，第 44 轮 F7 / 46 轮 F9 未修）点击区仍低于 24×24：字数入口 117×16、`</>` 37×21、`I` 21×24、查找/表格条按钮高 23、大纲三角 14×24

实测（`.tmp/r47-ui-main-log.txt` 的 `CLICK_TARGETS`、`.tmp/r47-ui-3-log.txt` 的 `FIND`、`TABLE_BAR`、`OUTLINE`）：

- 顶栏：文件 59×29、分析 122×28、导出 61×29、快捷键 28×28、保存 47×28、设置 47×28（合格）。
- 工具栏：11 个按钮高 24–25 px，其中 `</>` **37×21**、`I` **21×24**；插入菜单 55×25。
- 状态栏字数入口 `.stats-trigger` **117×16**；`#stats-detail` 本身合格（360×325、`role=dialog`、`aria-label=字数明细`、焦点进面板）。
- 查找条 7 个按钮全高 **23 px**（其中「区分大小写」「整词匹配」无 `aria-label`，靠可见文字）；表格条 7 个按钮全高 23；大纲三角 14×24。
- 建议：图标按钮统一 `min-width/min-height: 24px`（用 padding 撑，不改字号）。

### F10（P2，第 44 轮 F7 未修，本轮补全量）查找条没有 `role` / `aria-label`，两个输入框只有 placeholder，7 个按钮里 5 个无 `aria-label`，整条高 79 px 全宽

实测（`.tmp/r47-ui-3-log.txt` 的 `FIND`，截图 `r47-ui-09-find`）：

- `.find-bar` `rect [0,84,1440,79]`、`role: null`、`aria-label: null`；输入框 28 px 高、字号 12.5 px，只有 `placeholder`（`查找`、`替换为`）。
- 7 个按钮：上一处 / 下一处 / 关闭查找 有 `aria-label`；区分大小写 / 整词匹配 / 替换 / 全部替换 **无** `aria-label`（可访问名来自可见文字，尚可用，但与另三个不一致）。
- 建议：`.find-bar` 加 `role="search"` + `aria-label="查找与替换"`，两个输入框补 `aria-label`，四个无标签按钮补同名 `aria-label`。

---

## 与 Typora 对照（本轮实测范围内）

- 代码块：Sidelight 12.72 px / 行高 1.7 / 等宽，深色下沿用纸底色（`--paper #15171a`）；Typora 代码块采用与正文同族的深一档底色 + 圆角，块边界更清楚。这是纯观感差异，未计为发现。
- 中文正文行高：Sidelight 1.95（33.15 px @17 px），Typora 1.43–1.5；Sidelight 更松，行宽 576 px（36 字/行）比 Typora 默认正文列更窄。二者组合后，同屏信息量明显少于 Typora。已并入 F1 建议。

## 试过、判断没有问题的项（本轮都有实测）

- **浅色对比度全量过 AA**：正文 14.88:1、H2 14.88:1、H4 14.88:1、引用 6.16:1、表头 14.12:1、行内/代码 16.1:1、列表项 14.88:1（`CONTRAST_LIGHT`）。
- **深色主题变量生效**：`data-theme=dark`，`--paper #15171a`、`--ink #e9e6e0`、`--line #2a2e33`、`--accent #79b3aa`；表头底色 `rgb(34,48,46)` + 文字 `rgb(233,230,224)`，表格边框 `rgb(42,46,51)` 可见；侧栏/状态栏深色底都换上了（`DARK`）。
- **中文排版无溢出、无两端对齐造成的字距撕裂**：`text-align: start`、`text-justify: auto`、`text-indent: 0`、`overflow-wrap: break-word`；四行测量宽度 565/576/557/124 px（`CJK`），截图 `r47-ui-01` 里「引号」、（）与「……」都正常显示，无压低或换行错位。
- **1024×700 无溢出**：顶栏/工具栏/状态栏 `scrollWidth == clientWidth`（`NARROW`），正文滚动区 `docOverflow [796,796]`（无横向滚动），侧栏 217×552。
- **页边栏第 46 轮修复在静止态成立**：模拟提示 `[996,200,260,50]` 与卡 0 顶 270 不重叠；卡 0 `[996,270,260,164]`（底 434）远在「整体评价」面板 `[996,779,260,93]` 之上；截图 `r47-ui-07` 里三张卡的操作行（知道了/追问/联网核对、采纳/忽略…）全部可见，没有第 46 轮那种「面板整块盖住卡 1 正文」。**逐按钮 `elementFromPoint` 本轮没重跑、滚到底的同位也没跑完，两者计 UNVERIFIED。**
- **提示条可点击穿透到模态按钮**：`elementFromPoint` 命中 `DIV.dialog-actions`（见 F7）。
- **空工作区侧栏空态**：`.file-tree-empty` 有标题「还没有打开文件夹」、说明「打开一个文件夹后，保存会写回原文件」、主按钮「打开文件夹…」，无裁切（`EMPTY`，截图 `r47-ui-11`）；窄栏下说明占 3 行，可读。
- **字数明细面板**：`role=dialog`、`aria-label=字数明细`、360×325、无横向溢出、打开后焦点在面板内（`STATS`）。
- **控制台**：三段脚本 0 条 console error、0 条 pageerror。

## 遗留未修（本轮复核，未重复计为新发现）

- 提示条（错误态）关闭 × 本轮没复现（取消保存的提示条不带按钮），第 46 轮记的 15×22 仍未复核。
- 批注卡仍不可聚焦（本轮只取到 `.rail-*` 结构，未重测 `tabIndex`/`role`）。
- 全站 22 处字号无变量、`src/App.tsx` 单文件过大（工程项，非界面）。

## UNVERIFIED

- **页边栏滚到底的几何**：本轮探针脚本在拍完两张截图后被 `Select-Object -First` 截断，`RAIL_BOTTOM` 没取到；第 46 轮 tester 的读数（`lastCard.bottom 521.5 ≤ panelTop 533.97`）只是第 46 轮的证据，不是本轮的。补测：单跑 `.tmp/e2e-r47-ui-probe.mjs` 的 BOTTOM 段并落日志。
- **reduced-motion**：本轮没跑 `emulateMedia({ reducedMotion: 'reduce' })`，第 46 轮的结论（7 个样本 `1e-05s`）不溯及本轮。
- **125% / 150% 缩放**：本轮未试（第 46 轮 `Emulation.setDeviceMetricsOverride` 读回 `dpr: 1`，本沙箱不能另起浏览器）。
- **屏幕阅读器实录**：只做了 DOM/AX 属性审计，没有 NVDA / 讲述人播报；F3/F4/F10 的实际播报体验未验证。
- **真实中文输入法与 IME**：全部 `keyboard.type` / `fill`，未走 IME。
- **宿主（`host/`、`host-mac/`）与 macOS 真机**：只跑浏览器 CDP。
- **深色下批注卡与设置面板的对比度数值**：本轮只取到底色/变量，未做逐元素比值；第 46 轮深色全量 AA 的结论不溯及本轮。

## 复现清单（最短路径）

1. F1：Ctrl+/ 粘贴带 H1–H4 的文档 → 读 `.doc-body h4` 字号（17 px = 正文）。
2. F2：1440×900 开设置 → 滚到底看末行（被按钮行压 11 px）；1024×700 再开（要滚 278 px）。
3. F3：设置 → Tab 到「跟随系统」→ 按 `ArrowRight`/`ArrowDown`（无变化）。
4. F4：大纲页签 → 焦点第一个标题 → Tab（三角夹在中间，共 5 站）；悬停三角与标题（无底色）。
5. F5：选中一段 → `Ctrl+K` → 点正文别处 → 按 Esc（浮层不关）。
6. F6：点表格单元格 → 看内容顶端全宽「表格…删除 删除 删除」横条（离表格 572 px）。
7. F7：`Ctrl+S` 取消保存 → 开设置（提示条盖住「快捷键」）。
8. F8：悬停侧栏页签 / 大纲行（无变化）；按住任意按钮（无按下态）。
9. F9：量 `.stats-trigger`（117×16）、`</>`（37×21）。
10. F10：`Ctrl+F` 看 `.find-bar`（`role=null`、输入框只有 placeholder）。
