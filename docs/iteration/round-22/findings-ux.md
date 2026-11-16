# 第 22 轮 · 体验第二批（lens: ux）

仓库 `D:\Documents\SidelightProgram`，v0.30.4，dev `http://localhost:5173`。
浏览器：headless Edge，CDP `127.0.0.1:9226`，视口 1024×768 / 1440×900。
方法：只读 DOM 探测；每次首屏前 `localStorage.clear()` + reload。未改 `src/`。
脚本在 `.tmp/r22-ux/probe1…probe6.mjs`，原始输出在 `.tmp/r22-ux/EVIDENCE.md`，截图在 `shots/round-22/`。
F1–F5、L1、L3 均在 v0.30.4 复现；CHANGELOG 已写明这些项延后到第 22–25 轮。按简报上限合并为 3 条。

| # | 仍存在项（合并同类） | 成本 | 证据 |
| :--- | :--- | :--- | :--- |
| U1 | ≤1119 px 分析后批注抽屉仍关着，「批注」按钮无条数（F2） | M | `F2-1024-after-analyze.png`、`F2-1024-rail-open.png` |
| U2 | 首屏三个可见性缺口：查找无入口（F1）、示例无文件身份（F5）、设置无分组（F3） | S–M | `F1-1440-file-menu.png`、`F5-1440-firstscreen.png`、`F3-1440-settings.png` |
| U3 | 正文状态仍会丢：Tab 焦点逃逸吞字（F4）、视图往返丢滚动/选区/专注/打字机（L1）、大纲高亮不跟滚动（L3） | M | `F4-1440-tab-escaped.png`、`L1-source-before/after.png`、`L3-outline-ctrl-home.png` |

---

## U1（M）窄窗里分析结果仍落在关着的抽屉，按钮仍不报数（F2）

**现象**：1024 宽下点「分析本段（模拟）」或 Ctrl+Enter，批注已生成，抽屉不自动开；「批注」按钮仍是两个字，无条数、无 title，`aria-expanded="false"`。手动点开后 6 条都在。

**证据**
- `src/styles.css:2143-2145` 在 `@media (max-width: 1119px)` 把 `.margin-rail` 设为 `display:none`；只有 `.app.rail-open` 才显示（`:2162`）。
- `src/App.tsx:319` `railOpen` 初值 false；`:3737-3746` 的「批注」按钮只渲染固定文字；`runAnalysis`（`:1055-1151`）全程不碰 `railOpen`。
- 实测 1024×768：分析一次后 `.margin-rail` `display:none`、`.note` 3 条、`.rail-count` 文本「3 条」；Ctrl+Enter 后 6 条；按钮 `innerHTML` 始终是 `批注`，`title=null`，`aria-expanded="false"`。抽屉里的 `rail-count`（`MarginRail.tsx:67`）因此不可见。
- 截图 `F2-1024-after-analyze.png`（只有正文高亮与浮动「分析」气泡）、`F2-1024-rail-open.png`（手动打开后 6 条）。

**影响**：1024 笔记本与半屏窗口下，AI 回路断在最后一步：能触发、能看到高亮，看不到卡片，不能采纳、追问、核对。

**建议（M）**：`runAnalysis` 收到第一条批注（或 `pending.length` 首次 > 0）且 `matchMedia('(max-width: 1119px)').matches` 时调用 `openRail()`；`.rail-toggle` 渲染 `批注 N`（`pending.length`）并设 `title="N 条批注"`。条数已在 `MarginRail` 里算好，提到 App 即可。

---

## U2（S–M）首屏三处仍说不清：查找只能靠记快捷键、示例没有身份、设置没有分组（F1 + F5 + F3）

### F1（S）查找替换没有可见入口

- 唯一入口仍是 `src/App.tsx:3082-3085` 的 `Ctrl+F / Ctrl+H`；`FileMenu.tsx:18-23` 只有新建 / 另存为 / 打开文件 / 打开文件夹 4 项。
- 1440 首屏：`document.body.innerText.includes('查找') === false`；顶栏 7 个按钮、工具栏 11 个按钮都没有查找。`Ctrl+F` 能打开 `.find-bar`，两个输入框 placeholder 是「查找」「替换为」——功能在，入口不在。
- 示例文档「快捷键」仍只有 Ctrl+Enter / Ctrl+B、I / Ctrl+S 三行。
- 截图 `F1-1440-file-menu.png`、`F1-1440-ctrl-f.png`。
- 建议：文件菜单加「查找与替换… Ctrl+F」（动作后焦点回编辑器），示例补一行 `Ctrl + F：查找与替换`。

### F5（S）首屏说不清文件在哪

- `.doc-name` 文本 `示例 · 侧灯.md`，`title` 为 `null`，`innerHTML` 无「示例 / 不落盘 / 未保存」徽章（`App.tsx:3625` 只在 `hostDoc?.ready` 时给 title）。
- 树空态（`FileTree.tsx:245-252`）仍只有「打开文件夹…」一个按钮，文案「打开一个文件夹后，保存会写回原文件」——用「打开文件…」打开的单个 `.md` 同样会写回，文案不准。
- 截图 `F5-1440-firstscreen.png`。
- 建议：`docName` 旁加「示例 · 不落盘」徽章；空态加「新建文件」「打开文件…」，文案改成「打开文件夹或单个 .md 后，保存会写回原文件」。

### F3（M）设置仍是一个平铺表单

- `SettingsDialog.tsx` 全文只有 `:40` 一个 `h2 设置`；`:43-166` 的字段首尾相接：主题 → 自动保存 → 接口地址 → API Key → 模型 → 正文字号 → 联网核对 → 搜索 Key → 批注提示词。
- 1440×900 实测：对话框 845×430 px，`overflow-y:auto`；`h2/h3/legend/fieldset` 计数为 1；「正文字号」夹在「模型」与「联网核对」之间。
- 截图 `F3-1440-settings.png`。
- 建议：插 3 个 `h3`（外观 = 主题 + 正文字号；AI 批注 = 接口地址 / API Key / 模型；高级 = 自动保存 / 联网核对 / 提示词默认折叠）。纯 JSX/CSS，无逻辑变化。

**影响**：新用户会以为没有查找；会以为示例已经落盘、或以为必须先有文件夹；首次配置要逐行读完 9 个字段。

---

## U3（M）正文状态仍会丢：Tab 吞字、视图往返丢位置、大纲高亮不跟滚动（F4 + L1 + L3）

### F4（M）Tab 让焦点逃出正文，后续打字静默丢失

- 复现：示例第二段段首按 `Tab` → `document.activeElement` 从 `.ProseMirror` 变成 `A.skip-link`（「跳到正文」）；再 `type('XYZ')` → 正文不含 `XYZ`，界面无提示。
- 根因：`App.tsx:4013-4020` 只在光标位于文首（`from === 1 && to === 1`）时劫持 Tab，其余段落交给浏览器默认行为。没有段落 Tab 缩进处理。
- 截图 `F4-1440-tab-escaped.png`（左上「跳到正文」获得焦点）。
- 建议：编辑器 keydown 拦截正文段落 Tab（排除列表、代码块、有选区、组合输入中），插入 `\u3000\u3000`；列表/代码块保持 Tiptap 行为；Shift+Tab 与首尾焦点流转不变。

### L1（M）源码 / 预览往返丢滚动、选区与两种写作模式

- 源码分支（浅色主题、专注+打字机开）：`scrollTop 15000`、选中第 23 节第三段 → 源码 → 返回：`scrollTop 84`（文首）、选区空、`专注`/`打字机` 的 `is-on` 都被清掉。源码框自身 `scrollTop=0`、`selectionStart=0`。
- 预览分支：`scrollTop 15000` → 预览被夹到 `14158`（预览高 14946）→ 回编辑 `14160`；选区与两种模式同样丢。
- 根因：`App.tsx:3216-3220` 在 `next !== 'edit'` 时直接 `setFocusMode(false)` / `setTypewriterMode(false)`；`setMarkdown`（`:819-823`）整篇替换后 `setTextSelection(0)`；`switchView` 没有保存/恢复锚点。查找条也跨视图保留，源码里不索引 textarea（上一轮 L1 已记）。
- 截图 `L1-source-before.png`（第 23 节、选区可见、状态栏「专注/打字机」）与 `L1-source-after.png`（回到文首、状态栏 chip 消失）。
- 建议：切换前记录「视口顶部块 + 块内偏移 + 选区」，返回时还原；专注/打字机改为暂停而非清空；`applySource` 用保存的锚点重设选区；查找条随视图关闭或在源码里改查 textarea。

### L3（S）大纲高亮只跟光标，不跟滚动，也不把 active 滚进列表

- 66 项、列表 `clientHeight 752 / scrollHeight 1602`。点第 41 项：正文 `scrollTop 19087`，active「30.1 小节…」，列表 `scrollTop 850`。
- 不动光标把正文滚回顶部：`scrollTop 0`，active 仍是「30.1 小节…」——滚动不更新高亮。
- 按 Ctrl+Home：active 变第一项，但列表 `scrollTop` 仍 850，`activeTop -728`，列表视口 120–872，高亮项完全不可见。
- 根因：`App.tsx:796-801` 只在 `onSelectionUpdate` 里算 active；`:1499-1500` 的 scroll 监听只 `setTick`；`Outline.tsx:24-37` 没有 `scrollIntoView`。
- 截图 `L3-outline-jump.png`、`L3-outline-manual-scroll.png`、`L3-outline-ctrl-home.png`（列表停在 27 项，当前项在上方视口外）。
- 建议：区分「光标所在节」与「视口顶部节」；纯滚动用视口节，输入用光标节；active 变化时 `scrollIntoView({ block: 'nearest' })`。

**影响**：Tab 让中文写作者以为键盘坏了；30 页文档切一次阅读模式就丢上下文、还要重开写作模式；大纲停在旧章节且当前项看不见。

---

## 已核对、不是问题

- 查找功能本身正常：Ctrl+F 打开 `.find-bar`，有「查找」「替换为」两个输入框、上一处/下一处/替换/全部替换。
- 窄窗抽屉手动打开后功能完整：340 px，6 条卡片带采纳/忽略/追问/联网核对；问题只在「不自动开」与「按钮不报数」。
- 设置对话框在 1440×900 完整显示（845 px 高，保存按钮在视口内），只是没有分组。
- 示例文档的模拟批注标识三处一致（顶栏按钮 title、页边栏提示、卡片角标「模拟」），没有误以为调用模型。

## 最值得做的 3 件事

1. **窄窗分析后自动开抽屉 + 「批注 N」徽章**（F2，M）：1024 是常态，现在 AI 结果看不见；改动是一处 state 加一个徽章。
2. **视图切换保存/恢复锚点，Tab 拦截段落缩进**（L1 + F4，M）：都在编辑器交互层，一起改能一次消掉「切视图回文首」和「按 Tab 键盘失灵」两个最伤新手的问题。
3. **首屏三行文案与两个按钮**（F1 + F5，S）：文件菜单加「查找与替换…」、示例补 Ctrl+F、示例加「不落盘」徽章、空态加「新建文件/打开文件…」；设置分组（F3）可与本批同做。
