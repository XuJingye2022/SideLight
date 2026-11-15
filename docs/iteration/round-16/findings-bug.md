# 第 16 轮侦察 · 缺陷（可访问性与深色模式）

- 版本 v0.29.0，仓库 `D:\Documents\SidelightProgram`，只读侦察，未改 `src/`。
- 时间 2026-11-16。应用 `http://localhost:5173`，CDP `127.0.0.1:9222`（headless Edge 157）。
- 视口 1440×900 与 1024×800；浅色 / 深色两档逐项复测。
- 方法：`playwright-core` 连 CDP；axe 未安装，用注入的 WCAG 2.1 对比度脚本（前景/背景逐层合成 alpha、按字号分级 4.5 / 3.0）、真实 Tab 键遍历、`emulateMedia({reducedMotion:'reduce'})` 对照、同 class 节点注入测量不可达状态。脚本与原始数据在 `.tmp/r16/`。

## 总览

| 编号 | 问题 | 严重度 | 影响面 | 难度 |
| --- | --- | --- | --- | --- |
| B1 | 深色下白色文字压在浅色强调面上（采纳 2.23:1、分析气泡 2.38:1）；自动保存失败徽标 4.10/2.44:1 | 高 | 每篇批注的主操作、浮动按钮、状态栏 | 简单 |
| B2 | 焦点环系统性丢失或过弱：编辑器没有焦点环，输入类控件只有 1.54–1.79:1 的淡环 | 高 | 全部键盘用户 | 中 |
| B3 | 错误提示对屏幕阅读器完全静默；toast 容器 `aria-hidden` 里还包着可聚焦按钮 | 中 | 读屏用户错过保存失败等错误 | 简单 |
| B4 | 光标在正文开头时 Tab 被劫持回跳过链接，正向永远到不了页边批注 | 中 | 新文档 ≈ 默认态 | 中 |
| B5 | `prefers-reduced-motion` 完全未实现；深色遮罩 1.01:1 等于没有 | 低 | 动效敏感用户、深色弹窗层次 | 简单 |

---

## B1 深色下白字压在浅色强调面：主操作看不清（高）

### 证据

深色实测（1440×900，3 条模拟批注；数值来源见下）：

| 元素 | 计算值 | 对比度 | 要求 |
| --- | --- | --- | --- |
| `.note-actions button.accept`（采纳） | `color: rgb(255,255,255)` on `bg: rgb(216,164,101)` | **2.23:1** | 4.5:1 |
| `.analyze-bubble`（浮动「分析」） | `#fff` on `rgb(121,179,170)` | **2.38:1** | 4.5:1 |
| `.analyze-bubble:hover` | `#fff` on `--accent-ink` `#9ccbc2` | **1.79:1** | 4.5:1 |
| `.note-actions button.accept:hover` | `#fff` on `mix(mark 80%, #000)` `#ad8351` | **3.42:1** | 4.5:1 |
| `.status-chip.auto-save-error`（深色） | `#b4453a` on 页面 `#15171a` | **3.29:1** | 4.5:1 |
| 同上，原位在状态栏上（16% warn 底） | `#b4453a` on `#382d2c` | **2.44:1**（计算） | 4.5:1 |
| `.status-chip.auto-save-error`（浅色） | `#b4453a` on `#eddcd3` | **4.10:1**（计算） | 4.5:1 |

同一组颜色在浅色下是合格的：采纳 5.40:1、气泡 6.04:1。所以这是深色 token 翻转后没有跟着翻转前景色。

数值来源：「采纳」「自动保存失败」两行来自同 class 节点的注入测量（页面上这两个状态需要真实操作才出现；注入节点与真实节点共用同一套 class 与父级背景，`shots/round-16/dark-annotations.png` 里可直观看采纳按钮）；「分析气泡」2.38:1 来自真实页面全量扫描，浅色对照由同一脚本测得 0 条失败。

截图：`shots/round-16/dark-annotations.png`（第 2 张批注卡底部「采纳」是白字压在浅棕上）、`shots/round-16/focus-accept.png`、浅色对照 `shots/round-16/light-annotations.png`。

根因：`src/styles.css` 里 4 处写死白色，深色主题不参与。

- `:946` `.note-actions button.accept { color: #fff; background: var(--mark); }`
- `:952-953` `.accept:hover { background: color-mix(... var(--mark) 80%, #000); color: #fff; }`
- `:963` `.analyze-bubble { color: #fff; background: var(--accent); }`
- `:973` `.analyze-bubble:hover { background: var(--accent-ink); color: #fff; }`

自动保存徽标的根因是另一个 token 缺口：`src/styles.css:1420-1421` 用 `var(--danger, #b4453a)`，而 `--danger` 在 `:root`、`html[data-theme='dark']`、`@media (prefers-color-scheme: dark)` 三处都没有定义，永远走回退值 `#b4453a`，于是两档主题共用一个为浅色挑的红。

### 影响

- 深色下「采纳」是产品最核心的确认动作（ADR-0003 的采纳流），2.23:1 属于 WCAG 1.4.3 失败，低视力与强光环境下读不出字。
- 「分析」浮动按钮常驻在选区旁，1.79:1 基本等于隐形，用户找不到触发入口。
- 自动保存失败是「可能要丢改动」的状态，4.10/2.44:1 的 12px 小字让最该被看见的状态最不显眼。

### 建议

1. 新增两个前景 token：`--on-accent`、`--on-mark`。浅色取 `--paper-raised` / `#fffdf8`，深色取 `--paper` 系的深字（如 `#15171a`），四处写死 `#fff` 全部换掉。深色下采纳按钮会变成深字压浅棕（`#15171a` on `#d8a465` = 8.05:1）。
2. 补 `--danger`：浅色 `#b4453a`、深色 `#e8917f` 一类；`.auto-save-error` 的底色改为 `color-mix(--danger 18%, var(--paper))`，避免 16% 混到状态栏底色上又降一档。
3. `accept:hover` 的 `#000` 也换成 token（`--mark-strong`），否则每次加深都会把白字带到 3.42:1。

### 难度

简单。改 token + 4 处字面值 + 1 个未定义变量，约 0.5–1 h；验证方式：本轮 `.tmp/r16/matrix-{light,dark}.json` 的 48 个组合重跑，要求全部 ≥4.5（正文/小字）或 ≥3（大字号），禁用态除外。

---

## B2 焦点环：编辑器没有环，输入框只有 1.5:1 的淡环（高）

### 证据

真实 Tab 遍历（45 站，浅色，从正文起）：

| # | 焦点元素 | 计算 outline |
| --- | --- | --- |
| 1 | `a.skip-link` | `solid 2px rgb(43,109,100)` |
| 2–20 | 顶栏/工具栏/页签/树按钮 | `solid 2px`（合格） |
| **21** | `div.tiptap.ProseMirror` | **`none 3px rgb(29,32,35)`** |
| 22 | 又回到 `a.skip-link`（见 B4） | `solid 2px` |

- 跳过链接回车后的落点：`document.activeElement = MAIN.doc-scroll`，计算 `outline: none 3px`。`src/styles.css:158-160` 的 `main.doc-scroll:focus { outline: none }` 把全站唯一的键盘捷径目标变成了「看不见落点」。
- 编辑器：`src/styles.css:551` `.editor { outline: none }`。它与 `:121-124` 的 `:focus-visible { outline: 2px solid var(--accent) }` 特异度相同（0,1,0），但写在后面，因此赢；实测 `outline-style: none`。
- 输入类控件用的是另一套更弱的环，`outline` 只有 30% 透明强调色：

| 选择器 | 文件:行 | 计算环色 vs 背景 | 对比度 |
| --- | --- | --- | --- |
| `.find-input:focus`（实测 `solid 2px`，offset 1px） | `:1703-1707` | `rgb(185,203,197)` vs `#f6f4ee` | **1.54:1** |
| `.field input:focus` | `:1043-1047` | 同上 | **1.54:1** |
| `.dialog-input:focus` / `.dialog-textarea:focus` | `:1878-1883` | 同上 | **1.54:1** |
| `.thread-input input:focus` | `:1957-1961` | 同上 | **1.54:1** |
| 深色同项 | — | `rgb(56,75,76)` vs `#1c1f23` | **1.79:1** |

  这些输入框同时把边框换成实心 accent（`rgb(43,109,100)`，与旧边框 3.83:1），所以还看得出焦点；问题在于「环」这一层只有 1.54:1，和按钮的实心环不是一套。
- 源码模式 `.source-editor` 干脆没有环：`:1366` `outline: none`，`:1370-1372` 只在 `:focus` 时把边框从 `#d5cdbd` 换成 `color-mix(accent 50%, line)`（浅色实测 `color(srgb 0.531 0.651 0.612)` = `#88a69c`，深色 `#51706e`），两态之间 1.67:1（浅）/ 2.57:1（深）；实测 focus 后 `outline-style: none`。它还没聚焦时的 1px 边框本身只有 1.55:1（浅）/ 1.56:1（深）对底色，低于 1.4.11 的 3:1 边界要求。
- 对照：按钮/树行/页签/批注卡内按钮都是实心 2px 强调色环，浅色 5.50:1，深色 7.56:1。合格的一半与不合格的一半同时存在，这就是「一致性」问题本身。

### 影响

- WCAG 2.4.7（Focus Visible，AA）在输入控件上只能算「勉强可见」，1.54:1 在低对比度屏幕上等于没有。
- 编辑器不是普通文本框，光标可能停在视口外；Tab 进来时唯一的反馈是插入符，而全局其它控件都有环，用户会以为焦点没进去。
- 「跳到正文」的落点没有环，等于这个链接按了没反应——它正是为键盘用户准备的。

### 建议

1. 删 `main.doc-scroll:focus` 的 `outline: none`，改用全局 `:focus-visible`；跳过链接的落点给 `outline` 或 `box-shadow: inset 0 0 0 2px var(--accent)`。
2. 编辑器：把 `.editor` 的 `outline: none` 换成 `:focus-visible` 下的内描边（内容区宽度固定，内描边不引起横滚），或给 `.doc-column` 加 `:has(.ProseMirror:focus-visible)` 的外框。
3. 输入类统一升到 `outline: 2px solid var(--accent)`（去掉 30% 混色），与按钮同款；`.source-editor` 保留 `outline: none` 的话，至少把边框换成 `2px solid var(--accent)` 而不是只变色。
4. 建议顺手把「环」收敛成一个 `--focus-ring` token，下一轮改一处即可。

### 难度

中。CSS 改动不大，但要逐类目测 + 键盘回归（对话框内 Tab 循环、树 roving tabindex、查找栏自动聚焦），约 1–1.5 h。

---

## B3 错误提示对读屏静默（中）

### 证据

- 页面上唯一的 live region 是 `src/App.tsx:4040-4042`：
  ```tsx
  <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {notice && notice.kind !== 'error' ? notice.text : ''}
  </div>
  ```
  `kind === 'error'` 被明确排除。而错误 toast 本体在 `:4045` 是 `aria-hidden="true"`。两条叠加：所有 `kind: 'error'` 的提示（`src/App.tsx:343, 1153, 1675, 1690, 1700, 1718, 1744, 1813, 1840, 1849, 1965, 2135, 2186, 2303, 2345, 2364, 2409, 3208, 3219, 3239, 3248` 等 20 余处，含「保存失败」「移到回收站失败」「新建失败」）读屏用户一个都听不到。
- toast 里还有可聚焦按钮：`:4047-4056` 的 `.toast-action`、`:4058` 的 `.toast-close`（`aria-label="关闭提示"`）。它们位于 `aria-hidden="true"` 的子树内，键盘能 Tab 到、读屏读不出名字（axe 的 `aria-hidden-focus` 类问题）。本轮实测当前 DOM 无 toast 所以 `hiddenFocusables: []`，但代码路径成立，触发错误提示即复现。
- 另外三个横幅都是 `role="status"`：`:3937` 只读横幅、`:3945` 结构风险横幅、`:3960` 源码模式说明。三者可同时出现，加载即连播三段，反而盖过真正的操作反馈。

### 影响

- 「保存失败，改动还在」「移到回收站失败」这类必须让用户知道的错误，视觉上有 toast，听觉上是空白。这是 WCAG 4.1.3（Status Messages，AA）的直接缺口。
- 可聚焦但被 `aria-hidden` 的按钮会让读屏光标落到「空」元素上，属于常见的焦点丢失现象。

### 建议

1. 把 live region 改成不受 `kind` 过滤，或错误走独立的 `role="alert"` 容器（`aria-live="assertive"` 只在错误时挂载）。
2. toast 去掉 `aria-hidden="true"`，改为 `role="status"`（信息）/`role="alert"`（错误）；若担心重复播报，可只让文本进 live region，把按钮放进 `aria-hidden` 之外的独立容器，或给 toast 容器 `role="group"` 并让 live region 只放文本副本。
3. 三个 `role="status"` 横幅改为中性容器（`role="region"` + `aria-label`），只在用户操作导致出现时才播报。

### 难度

简单。0.5 h，改 4 处 JSX；验收用 CDP 断言「error toast 出现时 live region 文本非空」。

---

## B4 正文开头按 Tab 回环，页边批注正向不可达（中）

### 证据

`src/App.tsx:3908-3915`：

```tsx
onKeyDownCapture={(event) => {
  // 自动聚焦正文后仍保留「第一个 Tab 到 skip link」；只在文档开头劫持
  if (event.key !== 'Tab' || event.shiftKey || !editor) return
  const { from, to } = editor.state.selection
  if (from !== 1 || to !== 1) return
  event.preventDefault()
  document.querySelector<HTMLElement>('.skip-link')?.focus()
}}
```

实测（浅色，光标在文档位置 1）：

```
1 skip-link → 2 文件 → 3 分析 → 4 导出 → 5 ? → 6 保存 → 7 设置 → 8 插入 → 9..18 工具栏
19 侧栏「文件」页签 → 20 打开文件夹… → 21 ProseMirror → 22 skip-link → 23 文件 → …
```

Tab 序列在 21→22 处闭合，**页边批注里的按钮永远不会进入正向 Tab 序列**（本轮 3 条模拟批注时共 8 个可聚焦按钮：1 个「判错了，重来」+ 每条批注的「采纳/忽略/知道了/追问」）。光标不在开头时是正常的：从正文按 Tab 会依次到 `BUTTON.rail-goal-retry` → 批注卡的「知道了/追问/采纳/忽略/追问」→ 之后落到 `BODY` 再回 skip-link（见 `.tmp/r16/probe5.mjs` 输出）。新文档的光标恰好就在位置 1，所以这是默认状态。

补充：批注卡本身不可聚焦。`src/components/MarginRail.tsx:100-109` 是可点击的 `<article onClick>`（实测 `tagName: ARTICLE, tabindex: null, role: null, aria-label: null`），键盘用户只能进到卡里的按钮，不能「选中卡片 → 跳到对应句子」（该行为只绑了 `onClick` 与 `onMouseEnter`）。这不是新缺陷，但与 B4 同属页边批注的键盘路径。

### 影响

- 只用键盘的用户打开新文档后，想给批注点「采纳」，只能 Shift+Tab 反向绕行，或先手动把光标移到第 2 个字符。
- 这个劫持与 skip link 的 `href="#editor"` 组合成「编辑器 → 跳过链接 → 顶栏 → … → 编辑器」闭环，WCAG 2.4.3（焦点顺序）与 2.1.1（键盘）都受影响。

### 建议

1. 删掉 3908-3915 的 Tab 劫持。skip link 已经在 DOM 第一位（`:3502`），浏览器原生 Tab 顺序本来就能先到它；需要「从正文一步跳回」时改用 `Shift+Tab` 或显式快捷键。
2. 如果要保留一次性引导，只在「页面刚加载、用户还没 Tab 过」时拦截一次，用 `sessionStorage` 或 ref 标记，并在批注卡出现后不再拦截。
3. 给 `<article className="note">` 加 `tabIndex={0}`、`role="button"`/`aria-label="第 N 条批注：跳到正文"`，并把 `onClick` 的「选中句子」绑到 Enter/Space；`onMouseEnter` 的高亮改成 `onFocus`/`onBlur` 也触发。

### 难度

中。删劫持是 5 行，但要回归「首屏自动聚焦正文」与「跳过链接仍可用」；批注卡键盘化要动 MarginRail 的交互与布局，约 1 h。

---

## B5 `prefers-reduced-motion` 未实现；深色遮罩 1.01:1（低）

### 证据

- 全仓库没有 `@media (prefers-reduced-motion: ...)`：`grep` 在 `src/` 只命中 `overscroll-behavior`。`scroll-behavior` 也没设（文档滚动是瞬时的，`scrollIntoView()` 不带 `behavior`），这部分没问题。
- `emulateMedia({ reducedMotion: 'reduce' })` 前后计算值完全相同：

  | 选择器 | 动画 / 过渡 | reduce 前 | reduce 后 |
  | --- | --- | --- | --- |
  | `.toast` | `animation` | `pop 0.16s` | `pop 0.16s` |
  | `.analyze-bubble` | `animation` | `pop 0.14s` | `pop 0.14s` |
  | `.popover` | `animation` | `pop 0.14s` | `pop 0.14s` |
  | `.note` | `transition` | `box-shadow, transform 0.12s` | 同 |
  | `.annot` | `transition` | `background 0.12s` | 同 |

  另有 `.focus-mode .editor .is-dimmed { transition: opacity 160ms }`（`:1376-1379`）与 `button { transition: background/color 120ms }`（`:108`）。`@keyframes pop` 在 `:976-981`（透明度 + 位移 + 缩放）。
- 深色遮罩：`.overlay { background: rgba(18,20,22,.3) }`（`:993`）。合成后与底色的对比度：浅色 **1.95:1**（`#b2b1ad` on `#f6f4ee`），深色 **1.01:1**（`#141619` on `#15171a`，几乎同一个颜色）。实测 `shots/round-16/dark-settings.png` 里只能靠 `backdrop-filter: blur(2px)` 分辨「背景已失效」；浅色对照 `shots/round-16/light-settings.png` 有明确压暗。
- 同族的硬编码颜色共 19 处：`#fff` ×4（`:188, 946, 963, 973`）、`#fff` 另 1 处 hover（`:953`）、`#000` ×1（`:952`）、`#b4453a` ×2（`:1420-1421`）、`rgba()` 阴影/遮罩 ×11（`:993, 1005, 1168, 1825, 2075, 2138, 2206, 2221` 及三个 `--shadow`）。深色下 5 处固定黑阴影（`rgba(20,22,24,.14–.22)`）落在 `#15171a` 上基本不可见，弹窗与菜单失去层次。

### 影响

- 前庭敏感用户无法关掉 140–160 ms 的缩放/位移动画；WCAG 2.3.3 属 AAA，但简报把 `prefers-reduced-motion` 列为本轮验收项。
- 深色弹窗打开时，背景没有视觉压暗信号，用户可能以为可以在背景继续操作（实际已被 `inert` 挡住，`useDialogFocus` 做得对）。

### 建议

1. 加一段：
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
   }
   ```
   只关 pop 与过渡即可，不要动 `.is-dimmed` 的静态 opacity。
2. `.overlay` 改 `background: color-mix(in srgb, #121416 40%, transparent)`，并把 `--shadow` 在深色下换成 `0 0 0 1px var(--line-strong)` + 更大的黑阴影；遮罩深色目标 ≥1.3:1 才有可感知的压暗。
3. 5 处 `#fff` 与 `#000` 合进 B1 的 token 改造一次做完。

### 难度

简单。0.5 h，纯 CSS，加两档截图对照。

---

## 深色模式专项结论

| 项 | 结果 |
| --- | --- |
| 漏白（深色下仍为浅底的大面积元素） | **0 处**。遍历所有可见元素，`backgroundColor` 亮度 >0.75 的为 0（`.tmp/r16/dark-leaks.json`） |
| 漏黑（浅色下误用深底） | 未发现；浅色扫描文字对比度 0 条失败（`.tmp/r16/contrast-light.json`） |
| 硬编码颜色 | 19 处裸值，见 B5；其中 5 处 `#fff` 与 2 处 `#b4453a` 直接造成 B1 |
| 滚动条 / 原生控件 | `color-scheme: dark` 已设（`:29`、`:51`），原生下拉与滚动条跟随，未发现违和 |
| 图片 | `.editor img` 只有 `1px solid var(--line)` 边框（`:1667-1671`），深色下不做压暗。亮底图片在深色里偏亮，但这是编辑器惯例，不判缺陷；**未插入真实图片实测** |
| 公式 | `.editor` 的 `color: var(--ink)` 会被 KaTeX 继承，深色 `#e9e6e0` on `#15171a` = 14.42:1，理论合格。**实渲染未截到**：工具栏「插入 ▾ → 公式」在自动化里没触发 KaTeX 节点（3.5 s 后 `.katex/.math-fallback/.math-pending` 均为 0，控制台无报错，见 `.tmp/r16/probe4.mjs`），公式深色可读性标为未验证 |
| 弹窗层次 | 遮罩 1.01:1，见 B5 |

## 已通过项（下轮不必重复查）

- 浅色主题文字对比度：真实页面 0 条 <4.5（含正文、次要文字、页边批注、状态栏、树、菜单、空态）。深色仅气泡 1 条（B1）。
- 图标按钮都有可读名称：`button` / `[role=button]` 中无名称为 0（`aria-label`/`title`/文字齐备）。
- 对话框焦点：打开后焦点进框（实测 `activeElement` 在 `.dialog` 内），Tab/Shift+Tab 循环，overlay 之外 7 个兄弟节点被 `inert`，关闭还原到打开者（`src/components/useDialogFocus.ts`）。
- 菜单/树/页签键盘：文件菜单与导出菜单有方向键/Home/End/Escape，树有 roving `tabIndex`、`F2`/`Delete`/`Shift+F10`/`ContextMenu`，侧栏页签有方向键 + `aria-selected` + `tabIndex` 轮换。
- 窄窗 1024：`scrollWidth == clientWidth == 1024`，无横向溢出（`shots/round-16/light-1024.png`、`dark-1024.png`）。
- 状态栏与页边小字：`--ink-faint` 浅色 4.83/5.05、深色 6.26/6.53，均过 4.5（12px 小字）。

## 优化机会（≤3）

1. **浮层互相压住**：`.analyze-bubble`（`position: fixed; z-index: 30`，`:958-969`）在深色 1440 截图里正好盖住第 2 条批注卡的「采纳/忽略」行（`shots/round-16/dark-annotations.png`，气泡约在 x 978–1035 / y 512–540）；`.rail-goal`（我的理解）也被第一条卡的绝对定位 `top` 压掉半行。两处都是层叠/定位问题，改法小（给页边内容留顶部安全区，或让气泡避让 rail），但对「页边批注」这条主线体验损伤明显。
2. **颜色 token 收敛**：19 处硬编码 + 1 个未定义 `--danger`，是本轮 B1、B5 的共同根因。建议新增 `--on-accent`、`--on-mark`、`--danger`、`--scrim`、`--shadow-strong` 五个 token，一次性替换，之后深色回归只需看 token 表。
3. **小字档位再统一**：本轮又见到 `10.5px`（`:376` `.recent-volatile`）、`11px`（`:451` `.tree-empty-dir`、`:1153` `.toolbar button.mono`、`:1756` `.table-bar-label`、`:2081` `.popover-title`）、`11.5px`（`:742`、`:807`、`:1317`、`:1491`、`:1718`、`:1763`、`:1966`、`:1991`、`:2010`、`:2026`、`:2088`）与 `var(--text-xs)` 混用。统一后对比度阈值只需按 12px 一档判断，减少返工。

## 未验证

- 真实屏幕阅读器（NVDA/讲述人）实录：本轮只做 DOM 与 live region 静态检查，未跑读屏。
- 深色下真实图片与 KaTeX 实渲染（见上表）。
- 高对比度模式（Windows 强制颜色）下的表现：未测。
- 打印样式 `@media print`（`:1773-1804`）的可读性：不在本轮范围。
- 深色 + 窄窗 + 页边抽屉（`.app.rail-open`）同时打开时批注卡的定位：截了 1024 图，未逐条量。

## 采集脚本

| 文件 | 用途 |
| --- | --- |
| `.tmp/r16/probe.mjs` | 浅/深两档全页文字对比度扫描、45 站 Tab 遍历、reduce 对照、漏白扫描 |
| `.tmp/r16/probe2.mjs` | 3 条模拟批注的真实渲染、48 个状态组合（含 hover/错误/禁用）、跳转与对话框焦点、遮罩 |
| `.tmp/r16/probe3.mjs` | 真实 class 在 reduce 前后的动画/过渡（本脚本在公式段超时，焦点部分由 probe6 补测） |
| `.tmp/r16/probe4.mjs` | 深色下插入公式的复现尝试（未触发 KaTeX，含 HTML 现场转储） |
| `.tmp/r16/probe5.mjs` | 可访问名称、`aria-hidden` 内可聚焦元素、live region 清单、批注卡可聚焦性、1024 溢出 |
| `.tmp/r16/probe6.mjs` | `.find-input` 与 `.source-editor` 的焦点实测（浅/深） |
| `.tmp/r16/contrast.mjs`、`rings.mjs`、`rings2.mjs` | 报告中所有 token 级对比度、焦点环与边框对比度的计算 |
| `.tmp/r16/contrast-{light,dark}.json`、`matrix-{light,dark}.json`、`tab-light.json`、`dark-leaks.json`、`live-regions.json` | 原始数据 |
