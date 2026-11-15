# 第 01 轮 · 体验与界面发现

- 对象：Sidelight v0.16.3 浏览器原型，`http://localhost:5173`（必须写 localhost）。
- 方法：`playwright-core` 经 CDP `http://127.0.0.1:9223` 连接 headless Edge，视口 1440×900、1280×800，补测 1024×768。
- 临时脚本（只读产品代码）：`.tmp/r1-ux-probe.mjs`、`.tmp/r1-ux-interact.mjs`、`.tmp/r1-ux-size.mjs`、`.tmp/r1-ux-extra.mjs`、`.tmp/r1-ux-find.mjs`；探针输出 `.tmp/probe-1280.json`、`.tmp/probe-extra.json`。
- 截图全部在 `shots/round-01/ux-*.png`：`sample` / `opened` / `settings` / `find` / `annotation` / `focus` / `source` / `preview` 各两档，另有 `ux-1440-bubble`、`ux-1440-longdoc-bottom`、`ux-1024-narrow`。
- 未验证：真模型请求与真实错误文案（无 key）、中文输入法、暗色模式对比度实测（只按 CSS 变量算）。

## 1. 首次使用走查（中文写作者，不读 README）

| 问题 | 结论 | 证据 |
| :--- | :--- | :--- |
| 30 秒内能否开始写作 | 能。首屏已有可编辑示例文稿，光标点进去即可写 | `ux-1440-sample.png` |
| 空状态是否给下一步 | 给。文件树里三个按钮（打开文件夹 / 打开文件 / 试用示例） | `src/components/FileTree.tsx:114-127` |
| 空状态与当前状态是否自洽 | 不自洽：文档 `参考与出处.md` 已打开且可编辑，文件树仍写「还没有打开文件夹」；刷新后工作区不恢复，文档恢复 | `ux-1440-find.png`（左栏文字） |
| 「分析」出现时机是否可发现 | 中等。只在有文本选区时浮出（`App.tsx:1956` 条件 `selection.to > selection.from`）；空页边提示「选中一段，按 Ctrl + Enter」；顶栏按钮无选区时叫「分析本段」、有选区叫「分析选中」，两套叫法 | `ux-1440-bubble.png`、`ux-1440-annotation.png` |
| 没配 key 的反馈是否说人话 | 不好：不提示，直接静默返回一组合乎情理的批注，界面上没有「模拟」字样（见 U1） | 探针 `.margin-rail` 文本无「模拟」，`.rail-notice` 为 null |
| 设置项是否可理解 | 一半。接口地址 / API Key / 模型有 placeholder 示例；「联网核对（可选）」切到 Tavily/博查 后才出现「搜索 API Key」，但没说去哪申请；没有「测试连接」，填错地址只能在下次分析时从 toast 得知 | `ux-1440-settings.png`、`SettingsDialog.tsx:31-96` |
| 保存与导出是否找得到 | 找得到。都在顶栏右侧（导出 ▾ / 保存），位置符合桌面习惯 | `ux-1440-sample.png` |
| 快捷键有没有提示 | 只在示例正文的「快捷键」一节里；工具栏 `B/I/S/</>` 的 title 只写「粗体」等，不写 `Ctrl+B`；`源码/预览` 的 title 反而写了 `Ctrl+Shift+P`。Ctrl+F 没有 title | `App.tsx:1730-1742`、`1771-1779` |
| 出错时提示能否指导动作 | 未验证到真实错误（无 key）。代码里 toast 只用正则 `/失败|错误|无法|不能/` 判错误态并换色，不附带动作按钮 | `App.tsx:1951` |

## 2. 发现（按影响排序）

### U1 没配 API Key 时跑模拟批注，界面没有任何「模拟」标注（难度 S）

- **影响**：第一次打开的人会认真对待这三条意见，以为模型已经读过文章；发现是假的后，信任没了。这是首发前最不该留的一条。
- **证据**：
  - `ux-1440-annotation.png` / `ux-1280-annotation.png`：3 条成稿式批注（评价 / 修订 / 评价），无任何标记。
  - 探针输出：`.margin-rail` 文本中 `/模拟/` = false，`.rail-notice` = null，`.note` = 3。
  - `src/lib/ai.ts:31`、`src/lib/ai.ts:143`：无 key 时走「模拟流」。
  - 设置里 API Key 为空没有任何未配置状态：`src/components/SettingsDialog.tsx:41-50`（只有 placeholder）。
- **建议（一次改动）**：
  1. `MarginRail` 里按 `settings.apiKey.trim() === ''` 渲染一条 `.rail-notice`：「未配置 API Key，下面是本地模拟批注，不调用模型」；
  2. 每张卡 `note-head` 加 `<span className="note-kind note-kind-mock">模拟</span>`（复用 `note-kind` 样式，换 `--ink-faint` 底）；
  3. 顶栏按钮在无 key 时写「分析本段（模拟）」，`title` 同步。

### U2 设置对话框不接管焦点：Tab 走的是背后工具栏（难度 M）

- **影响**：键盘用户打开设置后按 Tab，焦点在遮罩后面的工具栏上跑，对话框本身完全拿不到焦点；读屏软件也不知道这是模态框。这是「易于操作」的硬伤，也是 WCAG 2.4.3 / 4.1.2。
- **证据**：
  - 探针：打开设置后 `document.activeElement` 仍是顶栏的 `BUTTON`（设置按钮）；连按 10 次 Tab 依次落在 `插入/H1/H2/B/I/S/</>/专注/打字机/源码`，全部 `inDialog=false`；
  - `[role="dialog"]` 的 `aria-modal` = null（`SettingsDialog.tsx:27` 只写了 `role` 和 `aria-label`）；
  - `ux-1440-settings.png`：视觉上是模态，行为上不是。
  - 附带：保存与取消长得一样（`getComputedStyle(save).backgroundColor = rgba(0,0,0,0)`，见 C1）。
- **建议（一次改动）**：新增 `src/components/useDialogFocus.ts`（约 25 行）：打开时 `aria-modal="true"`、聚焦第一个输入框、`keydown` 把 Tab 限制在 `[role="dialog"]` 内的可聚焦元素之间、关闭时把焦点还给打开它的按钮。`SettingsDialog`、`SaveDialog`、`App.tsx:1995` 的切换确认框共用。

### U3 次要文字对比度 2.9:1，批注卡头只有 10.5px（难度 S）

- **影响**：状态栏、批注卡头、批注动作（知道了 / 追问 / 联网核对）、对话框说明全都用 `--ink-faint`。按 WCAG 2.x 相对亮度公式：`#8b9096` 在 `#f6f4ee` 上 = **2.9:1**（AA 正文要 4.5:1）。10.5px 的中文在这些位置尤其糊。
- **证据**：
  - 变量：`src/styles.css:7`（`--ink-faint: #8b9096`）、`src/styles.css:2`（`--paper: #f6f4ee`）；
  - 字号：`src/styles.css:566`（`.note-head` 10.5px）、`965`（`.status-bar` 11.5px）、`647-651`（`.note-actions button` 11.5px）、`719-724`（`.dialog-note` 11.5px）；
  - `ux-1440-annotation.png`：卡头「评价 / 第 1 处」与底部三个动作按钮明显发灰。
  - 同型的还有 `采纳` 按钮：白字在 `--mark #b8722a` 上 = **3.8:1**（`styles.css:653-657`）；风险条 `#b8722a` 文字在纸色上 = **3.5:1**（`styles.css:1032-1046`）。
- **建议（一次改动）**：`--ink-faint` 改 `#666c72`（4.8:1）；`--mark` 改 `#9a5b1c`（白字 5.4:1，纸色上 4.9:1）；`.note-head`、`.rail-goal` 上到 12px。三处改动，不动布局。

### U4 窗口窄于 1120px 时整页横向滚动，顶栏与风险条的动作被裁掉（难度 M）

- **影响**：Tauri 首发窗口如果不是最大化，用户会看到「保存/设置」和「源码/预览」被切掉，引用式链接提示条上的「改用源码模式」按钮也只剩半截 —— 那正好是数据被改写前的唯一补救入口。
- **证据**：
  - `ux-1024-narrow.png`：顶栏在「保存」处被切断，「设置」不可见；工具条右侧「源码/预览」不可见；风险条按钮被裁一半；底部出现横向滚动条。
  - 探针（1024×768）：`innerWidth=1024`，`.app` scrollWidth=**1120**，`documentElement.scrollWidth > innerWidth` = true；
  - `src/styles.css:68`：`.app { min-width: 1120px }`，没有任何断点；`.doc-layout` 固定 `36rem + 260px`（`styles.css:161`）。
  - 1280×800 正常（`ux-1280-*.png`），所以影响面是 ≤1119px 的窗口。
- **建议（一次改动）**：加 `@media (max-width: 1120px)`：`.app { min-width: 0 }`、`.doc-layout { grid-template-columns: minmax(0, 1fr) }`、`.margin-rail { display: none }` 并在顶栏加「批注」开关把页边栏变成抽屉；顶栏「分析本段 / 导出 / 保存 / 设置」在该断点收成一个「⋯」菜单。

### U5 源码/预览模式下格式按钮与「插入」菜单仍可点，点了改的是看不见的编辑器（难度 M）

- **影响**：在源码模式按 B 或插入公式，动作落到被替换掉的隐藏编辑器上，屏幕上没有任何变化；换回编辑视图时源码又覆盖正文，这次操作白做。另外「插入 → 公式 / 公式块 / 链接」用的是浏览器原生 `window.prompt`，和桌面应用的其他浮层完全不是一套。
- **证据**：
  - 探针（源码模式）：`.toolbar` 按钮仍是 `插入 ▾ / H1 / H2 / B / I / S / </> / 专注 / 打字机 / 源码 / 预览`；只有「专注」「打字机」带 `disabled`（`App.tsx:1750`、`1759`），格式组没有；
  - `App.tsx:1723-1742` 格式组无 `disabled`；`App.tsx:1690-1718` 公式/链接用 `window.prompt`；
  - `ux-1440-source.png`、`ux-1280-source.png`：工具条与编辑模式一模一样。
- **建议（一次改动）**：给「插入」组和格式组套 `<fieldset disabled={viewMode !== 'edit'}>`（或逐个加 `disabled`），并在源码/预览时把这两组整体降为 `opacity: .4`；把 `window.prompt` 换成已有的 `.popover`（`src/components/InlinePopover.tsx`，链接编辑已经在用）。

## 3. 代码优化机会（最多 3 条）

### C1 `.primary` 类有 4 处用法，CSS 里没有对应规则

`SettingsDialog.tsx:122`、`SaveDialog.tsx:50`、`App.tsx:2006`、`App.tsx:2044` 都写了 `className="primary"`；`grep primary src/styles.css` 无命中。实测保存按钮背景 `rgba(0,0,0,0)`，与「取消」完全一致（探针 `.tmp/probe-1280.json`）。加一条规则即可（约 6 行，`--accent` 底、白字、`:hover` 用 `--accent-ink`），同时消掉 U2 里「主操作不可辨」。收益高、风险为零；注意暗色下白字要换 `--paper`。

### C2 输入框基样式重复 5 处、focus 规则 4 处且描边透明度不一致

`styles.css:738-753`（`.field input`）、`1088-1104`（`.find-input`）、`1228-1253`（`.dialog-input` / `.dialog-textarea`）、`1315-1331`（`.thread-input input`）、`1339-1348`（`.field select`）是同一份「padding + 边框 + 圆角 + 纸色底」；focus 描边分别是 32% / 30% / 30% / 28% 的 `--accent`。合并成一个选择器列表 + 一条 `:focus`，净减约 30 行，焦点态也一致。风险低（只合并声明，不改尺寸值）。

### C3 死规则 `.math-preview`（10 行）

`styles.css:1255-1264` 的 `.math-preview` 在 `src/` 下无任何引用（grep 只命中 styles.css 自身），实际用的是 `.math-draft-preview`（`MathDraftPreview.tsx` + `styles.css:1498`）。直接删除。

顺带核对过、**不是**问题的点：`App.tsx` 只有 1 处内联 `style`（分析气泡定位），`src/components/` 合计 5 处 —— 内联样式没有散落问题；Esc 能关设置、查找、源码、预览（`App.tsx:1109-1141`，实测 `escClosesSettings=true`）；1280×800 下正文行宽 576px、17px 字号、行高 1.95，约 33 字/行，可读性合格。
