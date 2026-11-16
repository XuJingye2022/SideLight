# 第 21 轮 · 首次使用与可发现性（lens: first）

仓库 `D:\Documents\SidelightProgram`，v0.30.3，dev `http://localhost:5173`。
浏览器：headless Edge 157，CDP `127.0.0.1:9224`（本轮分配给 first；实际复用已存在的 `%TEMP%\sidelight-edge\p9224` profile，没另开）。
每次探测前 `localStorage.clear()` + reload，等价「首次打开」。
截图在 `shots/round-21/`，探测脚本在 `.tmp/r21-first/probe*.mjs`。只读，未改 `src/`。

## 首屏 10 秒结论（1440×900 / 1024×768）

| 问题 | 能否在首屏答出来 | 依据 |
| :--- | :--- | :--- |
| 这是编辑器吗 | 能 | 画布、工具栏、`示例 · 侧灯.md`、状态栏「148 字 · 阅读约 1 分钟」 |
| 文件在哪 | **不能** | 只有文件名，没有路径；`title=""`；示例与真实文件的区别只在文件名（F5） |
| 怎么保存 | 能 | 顶栏「保存」、示例文档写 `Ctrl + S`、树空态写「保存会写回原文件」 |
| AI 怎么用 | 宽窗能，窄窗不能 | 宽窗页边栏空态「选中一段，按 Ctrl + Enter」；1024 下页边栏 `display:none`，结果看不见（F2） |

性能：FCP 312 ms，DOMContentLoaded 268 ms（`performance.getEntriesByType('paint')`，一次测量）。1024 下 `documentElement.scrollWidth = 1024`，顶栏/工具栏无溢出。

---

## F1 查找替换没有任何可见入口，只能靠记 Ctrl+F / Ctrl+H（S）

**现象**：整份界面里没有「查找」，文件菜单也没有；只有快捷键。

**证据**

- `src/App.tsx:3089-3091` 是唯一入口：`(key === 'f' || key === 'h') → setFindOpen(true)`。`grep 查找 src/**/*.tsx` 只命中注释、`FindBar.tsx:43` 的 placeholder、`FindBar.tsx:64` 的关闭按钮 aria-label 与 `ShortcutsDialog.tsx:25` 的一行说明 → 没有任何按钮文案或菜单项。
- 首屏实测：`.topbar button` 7 个（含仅窄窗显示的「批注」）、`.toolbar button` 11 个、`.file-menu [role=menuitem]` 4 个（新建 / 另存为… / 打开文件… / 打开文件夹…），均无查找（`filemenu-1440.png`、`first-1440.png`）。
- 首次引导就是示例文档，它的「快捷键」小节只有 3 行：`Ctrl + Enter`、`Ctrl + B / I`、`Ctrl + S`，没有 `Ctrl+F`（`first-1440.png` 正文末尾）。
- macOS 原生菜单也只有 App/File/Edit 三组，没有 Find（`host-mac/Sources/SidelightMac/App.swift:103-140`）。

**影响**：查找替换是长文作者的日常动作，首屏完全不可发现；用户会判断「这个编辑器没有查找」。可感知，不丢数据。

**建议（S）**：`FileMenu.tsx` 的 `ITEMS` 加一项 `{ label: '查找与替换…', keys: 'Ctrl+F', action: 'find' }`（动作后焦点回编辑器，按 `closeTo` 现有的 `'editor'` 分支）；示例文档「快捷键」补一行 `Ctrl + F：查找与替换`。两处都只是数组/字符串改动。

---

## F2 ≤1119 px 时，分析结果落在关着的抽屉里，「批注」按钮也不报数（S–M，影响最大）

**现象**：窄窗下点「分析选中/本段」或按 Ctrl+Enter，批注确实生成了，却一条也看不到；抽屉不自动开，「批注」按钮没有条数、没有 title、`aria-expanded="false"`。

**证据**

- `src/styles.css:2209` `@media (max-width: 1119px) { .margin-rail { display: none } }`；`:2228` 只有 `.app.rail-open .margin-rail` 才 `display: block`。
- `src/App.tsx:319` `const [railOpen, setRailOpen] = useState(false)`，只有顶栏「批注」按钮（`:3744-3753`）置 true；`runAnalysis` 全程不碰它。
- 1024×768 实测（`.tmp/r21-first/probe5-narrow-rail.mjs`）：
  - 点「分析本段（模拟）」后：`.margin-rail .note` = 3 条，`.margin-rail` `display: none`，`.rail-toggle` 文本仍是「批注」，`aria-expanded="false"`，无 `aria-label`/`title`。
  - 再按 Ctrl+Enter：note = 6 条，仍 `display: none`。
  - 点「批注」后：`.app` 变 `app rail-open`，抽屉 340 px 宽，6 条卡片（采纳/忽略/追问/联网核对）都在。
- 截图：`narrow-1024-after-analyze.png`（只有正文高亮 + 浮动「分析」气泡）、`narrow-1024-rail-open.png`（抽屉里 6 条）。
- 同一现象的解释也错位：示例文档首句写「左边写，右边批注」，1024 下没有右边（`first-1024.png`）。

**影响**：1024 笔记本、或把窗口缩到一半的桌面用户，AI 回路断在最后一步：能触发、能看到正文高亮，看不到卡片，也就不能采纳、追问、核对。这是本轮「首次使用」最伤的一处。

**建议（S）**：分析结束（或 `pending.length` 首次 > 0）时，若 `matchMedia('(max-width: 1119px)').matches` 就 `openRail()`；无论宽窄，在 `.rail-toggle` 上显示条数徽章（`批注 6`）并把 `title` 设成「6 条批注」。窄窗下抽屉的关闭按钮已在（`styles.css:2253` `.app.rail-open .rail-close`），不额外加控件。

---

## F3 设置没有分组，外观项夹在 AI 字段中间，首次配置要逐行扫（M）

**现象**：一个 845 px 高的单列表单，9 个字段首尾相接，只有 `h2 设置` 一个标题；`正文字号` 排在 `模型` 与 `联网核对` 之间。

**证据**

- `SettingsDialog.tsx:43-166` 字段顺序：主题 → 自动保存 → 接口地址 → API Key（含「未配置：分析会用本地模拟批注」）→ 模型 → 正文字号（12–26）→ 联网核对 → 搜索 Key → 批注提示词（4 行 textarea）→ 恢复默认提示词。
- 实测 `.dialog` 1440×900：高 845 px（视口 94%），`overflow-y: auto`，`scrollHeight 843 = clientHeight 843`（内容刚好不滚）；1024×768：高 728 px，`overflow-y: auto`，底部「快捷键 / 取消 / 保存」在 699–727 px，仍在视口内（这一项没问题）。
- 分组标题数：`querySelectorAll('h2,h3,legend,fieldset')` = 1（只有 `h2:设置`）。截图 `settings-1440.png`、`settings-1024x768.png`。
- 「未配置」那句只是文字，旁边没有「打开设置」之类动作——它本身就在设置里，所以问题不在那，而在**页边栏**那条「未配置 API Key，下面是本地模拟批注，不调用模型」（`MarginRail.tsx:91`）没有任何跳转：用户想接真模型，得自己猜「设置」。

**影响**：第一次配置要读完 9 行才知道该填哪三个；改字号/主题这种高频动作被 4 个 AI 字段挡在后面。可感知，不丢数据。

**建议（M，纯 JSX/CSS）**：插 3 个 `h3` 分组——「外观」（主题 + 正文字号）、「AI 批注」（接口地址 / API Key / 模型）、「高级」（自动保存 / 联网核对 / 批注提示词，提示词默认折叠）；页边栏 mock 提示末尾加一枚「打开设置」小按钮（复用 `onRequestLayout` 旁的模式，传 `onOpenSettings`）。顺带给 API 配置加一个「测试连接」按钮——现在填错 Key 只能在选一段正文分析后从 toast 才知道。

---

## F4 中文写作者按 Tab 缩进：焦点逃出正文，接着敲的字被静默吞掉（M）

**现象**：正文里任何段落按 Tab，焦点立刻离开编辑器；之后敲的字一个也进不去，界面没有任何提示。

**证据**（`.tmp/r21-first/probe8-tab-type.mjs`，新建空文档）

1. 输入「甲段。⏎乙段。」，光标回乙段首（`Home`）。
2. `Tab` → `document.activeElement` 从 `DIV.tiptap.ProseMirror` 变成 `BODY`。
3. `keyboard.type('XYZ')` → `.doc-column .ProseMirror` innerText 仍是 `甲段。\n\n乙段。`，状态栏仍是「4 字」。
4. 再按一次 `Tab` → 焦点落到 `<a class="skip-link">跳到正文`。
- 段中、段尾按 Tab 结果相同（`probe7-tab.mjs`：`focus after Tab at paragraph start/end` 都是 `BODY`）。
- 截图 `tab-then-typing-1440.png`、`tab-focus-1440.png`。

**对照核验（不是问题）**：用两个全角空格手工缩进能原样存盘——源码模式首字符是 `U+3000 U+3000`（`cjk-fullwidth-indent-source-1440.png`），切回富文本也保留。所以「中文缩进」本身有落点，缺的只是 Tab 这个动作。

**影响**：Word/WPS 用户的肌肉记忆就是 Tab 缩进两格。这里按下去等于「键盘失灵几秒」，新手会以为应用坏了；不写盘，不算数据丢失。中文写作者的第一个小时最容易撞上。

**建议（M）**：在编辑器的 keydown 里拦截正文段落的 Tab（排除列表、代码块、有选区、组合输入中），插入 `\u3000\u3000`；列表/代码块保持 Tiptap 现有行为；`Shift+Tab` 与正文首尾的焦点流转保持不变；「?」里补一句「Tab：段落缩进两个全角空格」。

---

## F5 首屏说不清「这篇文章在哪」：示例没有身份标识，树空态只给一个按钮，且文案不准（S）

**现象**：`示例 · 侧灯.md` 看起来就是磁盘上的文件；树空态只有「打开文件夹…」一个动作，还写着「打开一个文件夹后，保存会写回原文件」。

**证据**

- `.topbar .doc-name` 文本 `示例 · 侧灯.md`，`title=""`——`App.tsx:3632` 只在 `hostDoc?.ready` 时才给 title（「保存会写回这个文件」）。文件名带 `.md` 后缀，没有任何「示例/未保存/不落盘」标记。
- 树空态（`FileTree.tsx:243-251`）只有 `.file-tree-empty-title`「还没有打开文件夹」、`.file-tree-empty-sub`「打开一个文件夹后，保存会写回原文件」、一个 `.file-tree-open-wide`「打开文件夹…」。没有「新建文件」、没有「打开文件…」——而这两项只在「文件 ▾」菜单里。
- 那句文案不完整：用「文件 ▾ → 打开文件…」打开的单个 `.md` 同样有句柄、同样写回原文件（`App.tsx:1711-1720` 把 `picked.handle` 装进 `activeFile`），不需要打开文件夹。
- 示例文档上点「保存」：2.5 s 后 toast「已取消保存。」，只有文字、没有按钮（无「另存为」），`.doc-name .dirty` 仍在。截图 `save-demo-1440.png`。
- 截图 `first-1440.png`、`first-1024.png`、`new-blank-1440.png`（新建后树空态同样是这句）。

**影响**：10 秒测试里「文件在哪」唯一答不出的就是这题：用户可能以为改动已经在盘上（实际只在内存 / 草稿），或以为必须先有一个文件夹才能保存。

**建议（S）**：
1. `docName` 旁边加徽章：`hostDoc?.ready === false && activeFile === null` 时显示「示例 · 不落盘」；
2. 树空态加两个按钮：「新建文件」「打开文件…」（后者复用 `onOpenFile`），文案改成「打开文件夹或单个 .md 后，保存会写回原文件」；
3. 「已取消保存」toast 加 `action: { label: '另存为', … }`，和「保存失败」那条保持一致。

---

## 附：一条没编号的小项（30 秒可改，未截图）

macOS 上快捷键文案会骗人：`ShortcutsDialog.tsx:14-38` 与 `FileMenu.tsx:19-22` 的键位是硬编码字符串 `Ctrl+…`，而 macOS 宿主实际走 `Cmd`（README 第 7 行自己写了「`Ctrl` 在 macOS 上换成 `Cmd`」）。macOS 用户在「?」和文件菜单里读到的键位都不是真键位。建议按平台渲染标签（`navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'`），只改渲染，不动绑定。

## 顺带核验过、不成立的（避免下一轮重复查）

- **没 Key**：`分析本段（模拟）` 按钮 title「未配置 API Key：从本地生成模拟批注」+ 页边栏「未配置 API Key，下面是本地模拟批注，不调用模型」+ 卡片角标「模拟」，三处一致，不会误以为调了模型。
- **401 / 500 / 断网**：文案都是「原因 + 下一步」，且带动作。实测 `API Key 无效或没有权限。下一步：打开设置检查 Key 和接口地址。`（按钮「打开设置」，点开确实打开设置）、`模型接口返回 500。下一步：…`（「重试」）、`连不上接口地址。下一步：…`（「打开设置」）。等 6.5 s 不消失（错误提示不自动关），`role="alert"` 在内层 `.toast-live`。截图 `err-401-1440.png`、`err-500-1440.png`、`err-network-1440.png`。
- **IME 组合输入**：`scripts/ime-composition.mjs` 在 9224 上 12/12 PASS（正文/标题/代码块/表格/源码各一次组合上屏 + 一次 Ctrl+Z 整词撤销 + 组合中 Ctrl+S 不重复上屏）。CDP 模拟，不是真输入法，但比「未验」多一层证据。
- **中文标点与全角字符**：`“引号”——破折号……省略号；顿号、书名号《》` 原样输入、原样显示（`cjk-wordcount-1440.png`）。
- **字数口径**：`你好，世界。这是 Sidelight 的 2026 年测试。` → 12 字（CJK 10 + 拉丁词 2），标点不计、空白不计，与 `wordcount.ts` 注释一致；阅读时间下限 1 分钟。不是缺陷，但和 Word 的「字符数（不计空格）」不是一个口径，对外说明时注意。
- **设置对话框小屏可用**：1024×768 下自滚动、保存按钮在视口内（`settings-1024x768.png`）。
- **1024 窄窗无横向溢出**：`scrollWidth === innerWidth === 1024`，顶栏/工具栏自动换行。

## 最值得做的 3 件事

1. **窄窗分析后自动打开页边抽屉 + 「批注」按钮显示条数**（F2）。1024 笔记本是常态，现在 AI 结果在窄窗里等于看不见；改动最小、收益最大，纯前端 state 一行 + 一个徽章。
2. **给查找替换一个可见入口，并把 `Ctrl+F` 写进示例文档**（F1）。全仓唯一「只能靠记快捷键」的功能，两处字符串/数组改动。
3. **设置分三组、字号移入外观、页边 mock 提示加「打开设置」**（F3）。首次配置 AI 的路径从「读 9 行」变成「读标题找 3 个字段」；同时把 F5 的空态文案与徽章一起改掉（同属首屏信息，可与本条同批交付）。
