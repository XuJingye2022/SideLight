# 第 05 轮 · 体验与界面 finder（ux）

- 侦察对象：`http://localhost:5173`（Windows 11，Chromium/WebView2 同源能力），CDP `127.0.0.1:9223`，`playwright-core` 连接。
- 方法：只读。脚本落 `.tmp/r5-ux-*.mjs`，日志 `.tmp/r5-ux-*.log`；截图 `shots/round-05/ux-r5-*.png`。
- 未改 `src/`、`host/`，未跑 `npm run build`。
- 视口 1440×900；深色 / 浅色用 `page.emulateMedia({ colorScheme })` 模拟系统主题。

## 结论速览

| 编号 | 一句话 | 影响 | 难度 |
| --- | --- | --- | --- |
| U1 | 纯键盘到正文 23 次 Tab；菜单选完、导出完、取消确认框都把焦点丢给 `<body>` | 高：键盘用户每做一件事就回到起点 | M |
| U2 | 键位几乎不可发现；`Ctrl+Shift+S` 同时触发「删除线」和保存流程 | 高：会不会用全靠猜，且会误改正文 | S–M |
| U3 | 只有跟随系统主题，没有手动入口；缺 `color-scheme`，原生控件在深色下仍发白 | 中：可读性达标，控制权缺失 | M |
| U4 | 文件菜单四项目同样式，无图标、无分隔、无键位列；示例徽标只在树头 | 中：层级靠读字，首屏认不出「示例」 | S |
| U5 | 状态反馈文字可读，但 dirty 点只有 5×5 一个 `title`；提示条无关闭无 `aria-live` | 中低：能看见，不好确认 | S |

---

## U1 键盘路径太长，而且断点必丢焦点

**证据（`.tmp/r5-ux-kb3.log`）**

- 从加载完成到正文：**23 次 Tab**（`Tab#1` 文件 ▾ → … → `Tab#23` `.ProseMirror`）。无 skip link（`a[href^="#"]` 数量 0），地标只有 `HEADER.topbar` 与 `FOOTER.status-bar`，没有 `main` / `nav`。
- 反向：正文 → 顶栏「文件 ▾」**22 次 Shift+Tab**；正文 → 「导出 ▾」**20 次 Shift+Tab**。
- 焦点丢失三处：
  1. 文件菜单选「新建」后 `document.activeElement === BODY`（`FileMenu.tsx:30-33` 的 `pick()` 先关菜单，被点的按钮随即卸载）；
  2. 导出菜单选「HTML」后 `activeElement === BODY`（`App.tsx:1917-1943`）；
  3. 脏文档选「新建」弹出「切换文档」，按 Esc 取消后 `activeElement === BODY`。根因在 `useDialogFocus.ts:63`：`if (opener && document.contains(opener)) opener.focus()`——打开者是菜单项，此时已不在文档里，还原被跳过。
- 正文获得焦点时 `outline-style: none`（`styles.css:355`），只有光标可见；顶栏/工具栏 22 个停靠点全部有 2px 描边（`styles.css:96-99`），这一项没问题。

**改法（按性价比排序）**

1. `App.tsx:1884` 之后加 skip link：`<a className="skip-link" href="#editor">跳到正文</a>`，`.skip-link:focus` 才显示；正文容器加 `id="editor"` 与 `<main>`。约 20 行 CSS，直接省掉 23 次 Tab。
2. `FileMenu` 增加 `onAfterAction` 回调，动作执行后 `buttonRef.current?.focus()`；`新建` 例外，聚焦正文。导出菜单同样处理，导出后聚焦「导出 ▾」。
3. `useDialogFocus` 兜底：`document.contains(opener)` 为假时，聚焦 `[data-focus-fallback]` 或首个 `.file-menu-trigger`。
4. 菜单加方向键（`role="menu"` 的 ARIA 约定要求 ArrowUp/Down/Home/End），现在 `ArrowDown` 完全无反应。

**难度** M（0.5–1 天，含回归）。**证据图**：`shots/round-05/ux-r5-08-file-menu-dark-1440.png`。

---

## U2 键位不可发现，`Ctrl+Shift+S` 会改正文

**证据**

- `aria-keyshortcuts` 全站 **0 个**；`title` 共 9 个，只有 1 个写键位：`App.tsx:2087`「只读预览（Ctrl+Shift+P）」。其余 8 个只写功能名。
- 文件菜单四项**没有键位列**（`FileMenu.tsx:47-62`，实测 `shortcut: null`）。设置里没有快捷键页（`SettingsDialog.tsx:39-137`，字段只有接口地址/Key/模型/字号/联网核对/提示词）。
- 实际存在的键位（`App.tsx:1372-1451` 全局 + `App.tsx:375` 编辑器）：`Ctrl+S` 保存、`Ctrl+F`/`Ctrl+H` 查找、`Ctrl+Shift+P` 预览、`Ctrl+±`/`Ctrl+0` 字号、`Esc` 逐层退出、`Ctrl+Enter` 批注。**`Ctrl+N`、`Ctrl+O`、`Ctrl+Shift+S` 都没有绑定**（实测应用无反应）。
- 冲突实测：在正文选中一段按 `Ctrl+Shift+S`，DOM 变成 `<p>…<s>哪里还能更清楚。</s></p>`，同时提示「已取消保存。」。原因：`App.tsx:1427` 写的是 `if (mod && key === 's')`，`key` 已 `toLowerCase()` 但不看 `shiftKey`；而 Tiptap 的删除线恰好是 `Mod-Shift-S`。用户想做「另存为」，得到的是给正文划线 + 一次保存。
- 切换按钮「专注/打字机/源码/预览」用 class `is-on` 表示状态，`aria-pressed` 全站 0 个，读屏读不出开关。
- 唯一一处键位说明在示例正文里（`App.tsx:90-94`「快捷键」小节），新建文档后即消失。

**改法**

1. 修冲突：`if (mod && !event.shiftKey && key === 's')`；新增 `Ctrl+Shift+S → saveAsCopy()`、`Ctrl+N → newDocument()`、`Ctrl+O → openSingleFile()`。删除线保留 `Mod-Shift-S` 或改 `Ctrl+Shift+X`（二者只能留一个）。
2. 菜单项右侧加 `<kbd>Ctrl+S</kbd>` 列（136px 宽需放到 168px），同时补 `aria-keyshortcuts="Control+S"`。
3. 顶栏「导出 ▾」补 `aria-haspopup="menu"` / `aria-expanded`（`App.tsx:1917-1919` 现在两个都没有）；四个切换按钮补 `aria-pressed`。
4. 加「快捷键一览」：设置里一页 + `?` 或 `F1` 直接打开。建议列的清单（现有键位标 ✓，缺的标建议值）：

| 分组 | 动作 | 现状 | 建议 |
| --- | --- | --- | --- |
| 文件 | 新建 | 无 | Ctrl+N |
| 文件 | 打开文件 | 无 | Ctrl+O |
| 文件 | 打开文件夹 | 无 | Ctrl+Shift+O |
| 文件 | 保存 | ✓ Ctrl+S | — |
| 文件 | 另存为 | 无 | Ctrl+Shift+S |
| 文件 | 导出菜单 | 无 | Ctrl+E |
| 文件 | 打印 / PDF | 无 | Ctrl+P |
| 编辑 | 批注选区 | ✓ Ctrl+Enter | — |
| 编辑 | 查找 / 替换 | ✓ Ctrl+F / Ctrl+H | — |
| 编辑 | 粗体 / 斜体 / 删除线 / 行内代码 | ✓ Ctrl+B / I，S 冲突 | 删除线 Ctrl+Shift+X，代码 Ctrl+` |
| 视图 | 预览 | ✓ Ctrl+Shift+P | 同时补「源码」Ctrl+Shift+M |
| 视图 | 专注 / 打字机 | 无 | 可留空，但一览里要写「无」 |
| 视图 | 字号 + / − / 还原 | ✓ Ctrl+= / Ctrl+- / Ctrl+0 | — |
| 视图 | 退出当前模式 | ✓ Esc | — |
| 帮助 | 快捷键一览 | 无 | `?` 或 F1 |

**难度** S（修冲突 + 4 个键位 ≤2 小时）；快捷键一览弹窗 M。

---

## U3 主题：可读性达标，但只有「跟随系统」，原生控件不跟随

**实测对比度（WCAG，4.5 达标）**

| 位置 | 浅色 | 深色 |
| --- | --- | --- |
| 正文 ink / paper | 14.88 | 14.42 |
| 文档名（12px） | 5.09 | 6.46 |
| 状态栏（12px） | 5.05 | 6.54 |
| 顶栏按钮 | 6.50 | 7.52 |
| 菜单项（12.5px） | 6.67 | 7.29 |
| 表格表头 | 14.88 | 11.02 |
| 代码块 | 16.10 | 13.28 |
| 引用块 | 6.16 | 7.92 |
| 批注正文 | 6.67 | 7.29 |
| 批注「替换前」 | 5.23 | 6.26 |
| 只读横幅 | 12.89 | 12.51 |
| 状态 chip | 7.40 | 7.67 |
| **dirty 点 vs 顶栏底** | **5.79** | **7.18** |

底线全部 ≥5.0，深色下代码块、表格、公式、批注、引用都能读，**没有需要修的对比度**。问题在控制与一致性：

- 没有手动切换：`document.documentElement` 上无 `data-theme`、无 class（只有一个扩展注入的 `trancy-und`），`localStorage` 里没有主题键，设置里没有外观项。所以只能跟随系统。
- `color-scheme` 为 `normal`（`styles.css` 全文没写，`index.html` 也没有 `<meta name="color-scheme">`）。后果：深色下原生 `<select>` 弹层（设置里「联网核对」）、原生滚动条、输入框自动填充仍是浅色。这是「深色看起来像有人忘了刷」的具体来源。
- 层次：深色下引用块左侧竖线对比 1.69:1，几乎看不见；菜单边框 1.21:1，全靠 `box-shadow` 撑边界（`styles.css:941`）。

**改法**

1. 设置里加「外观：浅色 / 深色 / 跟随系统」三段控件（放最上面，在「密钥只存在这台机器」那句之前；`SettingsDialog.tsx:39-41`）。
2. 变量改成两套命名并保留系统兜底：`:root[data-theme='dark'] { … }` + `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }`。不要复制颜色表。
3. `index.html` 在 `<script type="module">` 之前加 8 行内联脚本，先读 `localStorage` 写 `data-theme`，再首屏渲染——否则每次启动闪一下浅色。
4. `:root { color-scheme: light dark }`，`html[data-theme='dark'] { color-scheme: dark }`。
5. 切换要即时预览：改 `data-theme` 后立即生效，点「取消」还原。设置对话框现在是「保存才生效」，主题不适合这种模型。
6. 深色下把引用块竖线提到 `color-mix(in srgb, var(--accent) 55%, var(--line-strong))`（目标 ≥3:1）。

**难度** M（1 天，含首屏不闪的验证）。**证据图**：`ux-r5-01-first-{light,dark}-1440.png`、`ux-r5-02-settings-{light,dark}-1440.png`、`ux-r5-05-table-*`、`ux-r5-06-code-*`、`ux-r5-07-math-*`。

---

## U4 文件菜单层级平，示例徽标只在树头

**证据**

- 菜单几何（1440）：`top=38, left=96, 136×130`，四项各 30px 高、12.5px 字，触发器底边 37，间隙 1px。四项同色同字重，无图标、无分隔线、无 `<kbd>`；`新建`（会丢弃未保存改动）与 `另存为`（安全）视觉上没区别。截图 `ux-r5-08-file-menu-dark-1440.png`。
- 顶栏把「保存」「另存为…」拆到两处（`App.tsx:1944` 顶栏按钮 与 `FileMenu.tsx:52` 菜单项），新手分不清哪个会问落点。
- 1280 不拥挤：1440 长文档名（51 字）子项右边界 1428/1440；1280 时 spacer 仍有 225px；`≤1119px` 按设计换行（`styles.css:1705-1715`，1024 实测 topbar 高 80、两行）。**不需要为 1280 做压缩**。
- 示例徽标：只在文件树头 `FileTree.tsx:144`，38×18、12px、对比 7.40/7.67。首屏顶栏只有文档名「示例 · 未命名.md」（12px 灰字，5.09），没有徽标。打开「试用示例」后才出现 —— 见 `ux-r5-14-demo-badge-{light,dark}-1440.png`。

**改法**

1. 菜单分组：`新建` ｜ `另存为…` ｜ `打开文件… / 打开文件夹…`，中间加 `border-top: 1px solid var(--line)`；右侧加键位列（见 U2）。
2. 徽标同步到顶栏：当 `workspace.demo` 或 `docName === DEMO_DOC_NAME` 时，在 `.doc-name` 前放同一个 `.file-badge`。一行条件渲染，首屏立刻能看懂「这是示例」。
3. 「新建」不涂红（红色留给真破坏性），但用文案说清后果：菜单项副标题「丢弃当前改动需确认」。实际已有「切换文档」确认框，够用。
4. 图标可选：4 个内联 SVG（16×16）即可，勿引依赖。

**难度** S（2–3 小时）。

---

## U5 状态反馈：能看见，但确认成本高

**证据**

- 保存成功：`toast` 199×44，固定 `bottom: 46px` 居中（`styles.css:1347-1366`），`role="status"`，**无 `aria-live` 属性**（隐式 polite），信息类提示**没有关闭按钮**（只有 error 分支渲染 `.toast-close`，`App.tsx:2282-2284`），`persist` 常驻。文案「已保存 ux-test.md」+「另存为」按钮，动作标签与动作不匹配（点了是另存为新文件，不是把当前另存）。
- dirty 点：5×5，`title="有未保存的改动"`（`App.tsx:1897`，`styles.css:141-146`），只有鼠标悬停能读到；对比 5.79（浅）/7.18（深），看得见。保存后消失、输入后出现，行为正确（`ux-r5-11-dirty-dot-{light,dark}-zoom.png`）。
- 只读横幅：`role="status"`、`top=84`、高 41、12px、对比 12.89/12.51，按钮「另存为」24px 高 —— 状态反馈里这条最清楚（`ux-r5-10-readonly-{light,dark}-1440.png`）。
- 示例徽标同 U4，对比 7.40/7.67 可读，但小（38×18）。

**改法**

1. `.dirty` 加 `aria-label="有未保存的改动"`（`span` 需要 `role="img"` 或配 sr-only 文本），并把点从 5px 提到 6px；或在文档名后直接写「·未保存」。
2. 提示条：`aria-live="polite"` 显式写上；信息类提示也给一个「×」；`Esc` 关掉常驻提示。
3. 保存成功把动作文案改成「另存到…」，并在 6 秒无操作后自动折叠成一行（现在永久占屏幕底部中间）。
4. 只读横幅按钮给 `min-height: 28px`，现在 24px 低于 44px 触控建议（桌面可接受，记为低优先）。

**难度** S（1–2 小时）。

---

## 优化机会（最多 3 条）

**O1 · 主题 token 不要复制两份。** `styles.css:1-24` 与 `:26-46` 是同一组 20 个颜色写两遍。加手动主题时改成「一份语义表 + 两个选择器」：`:root`（浅）、`:root[data-theme='dark']`、`@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`。不新增文件、不加依赖，后面换配色只改一处。

**O2 · 字号变量只落了一档。** `styles.css` 有 71 条 `font-size`，其中 **38 条**是硬编码的 11 / 11.5 / 12 / 12.5px（`styles.css:76,298,546,611,691,703,726,926,1005,1027,1235,1257,1295,1302,1362,1412,1505,1530,1549,1565,1620,1627`），`--text-xs: 12px`（`:23`）只覆盖了一部分。补两档 `--text-2xs: 11.5px`、`--text-sm: 12.5px`，替换 38 处即可，同时把「11px」统一成 11.5px（现在可见 <12px 的文本只剩 3 处：`</>` 按钮 11px、`rail-title` 与 `rail-empty-sub` 11.5px，比看板记的 13 处好很多）。

**O3 · 三个菜单各写一套开关。** `.menu` 样式共用（`styles.css:929-947`），但 FileMenu（`FileMenu.tsx:14-33`）、插入菜单（`App.tsx:1966-2028`）、导出菜单（`App.tsx:1917-1943`）各自维护 `open` 状态；外部点击关闭处理器在 `App.tsx:1472-1482` 硬编码 `.menu` / `.menu-trigger` / `.export-wrap` 三个选择器；导出菜单因此漏了 `aria-haspopup`/`aria-expanded`。抽一个 `usePopover()`（返回 `open/toggle/close/triggerProps/menuProps`）能一次补齐语义、方向键与 Esc 还原焦点。

---

## 未验证 / 边界

- 真实系统保存对话框：用 `showSaveFilePicker` 打桩，只验语义与 UI，未验真对话框。
- 宿主 WebView2 内键盘行为（Alt、F10、Esc 是否被宿主吞掉）未测；本轮只在浏览器 CDP 里跑。
- 屏幕阅读器实录（Narrator/NVDA）未做，`aria-*` 结论来自 DOM 属性与可聚焦顺序。
- 手动主题尚未实现，所以没有「手动深色」截图，只有系统深浅两套。
- CDP 浏览器 profile 里有第三方扩展注入 `class="trancy-und"` 与 `localStorage['trancy-mode']`，与产品无关，已排除。

## 截图清单（`shots/round-05/`）

`ux-r5-01-first-{light,dark}-1440.png`、`02-settings-*`、`03-annotations-*`、`04-source-*`、`05-table-*`、`06-code-*`、`07-math-*`、`08-file-menu-*`、`09-saved-toast-*`、`10-readonly-*`、`11-dirty-dot-*-zoom.png`、`12-topbar-1280-dark.png`、`13-full-1280-dark.png`、`14-demo-badge-*`、`15-longname-{1440,1280,1024}-dark.png`、`16-topbar-{1120,1024}-dark.png`。

## 复现命令

```bash
node .tmp/r5-ux-kb3.mjs      # 正向/反向 Tab 计数、菜单键盘、脏文档确认、保存与导出
node .tmp/r5-ux-shots.mjs    # 14 张主题矩阵 + 对比度 + 顶栏宽度
node .tmp/r5-ux-shots2.mjs   # 菜单/徽标/横幅/提示条对比度、长文档名挤压
node .tmp/r5-ux-shots3.mjs   # 批注卡片（Ctrl+Enter 与按钮两条路径）
node .tmp/r5-ux-final.mjs    # Ctrl+Shift+S、color-scheme、aria-* 清点
```
