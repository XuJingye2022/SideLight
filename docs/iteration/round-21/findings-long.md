# 第 21 轮长文工作流侦察（long）

日期：2026-11-16 · 版本 v0.30.3 · 环境：dev server `http://localhost:5173`，headless Edge CDP 9225，profile `%TEMP%\sidelight-r21-long`
样本文档：`.tmp/r21-long/long.md`，25,540 字、196 段、66 个标题、48 个行内公式、1 个公式块、1 张表、2 张图（data URL + 相对路径）、3 条脚注（其中 1 条两行）、YAML frontmatter。编辑区高 31,547 px，约 32 个屏幕；打印 PDF 31 页。
复现脚本：`.tmp/r21-long/s0-seed.mjs` … `s8-accept-modes.mjs`（均只读页面，不改 src）。截图：`shots/round-21/L*.png`。
口径：浏览器模式（未打开工作区句柄），图片用 data URL 与相对路径各一张模拟；打印用 CDP `Page.printToPDF` 验证 `@media print`，没有经过系统打印对话框；未测真实宿主 WebView2 打印。

## L1 阅读/写作往返丢位置：源码、预览切回都停在文首，专注/打字机静默关闭

**复现**
1. 载入 `long.md`，`.doc-scroll` 滚到 15000（视口中心是「第 23 节第三段」），光标留在正文。
2. 点工具栏「源码」→ 再点「源码」回来；或点「预览」→再点「预览」回来。

**证据**
- 源码：进入后 `.source-editor.scrollTop = 0`、`selectionStart = 0`；返回编辑后 `.doc-scroll.scrollTop = 110`，视口中心变成首段「长文写作最先暴露的不是灵感问题…」，选区为空（`window.getSelection().toString() === ''`）。
- 预览：进入前 `scrollTop = 14000`，进入预览后 `0`，返回编辑仍是 `0`。
- 返回后「专注」「打字机」按钮的 `is-on` 都被清掉，状态栏 chip 只剩「元数据 / 草稿」（`App.tsx:3223-3227` 主动 `setFocusMode(false)` / `setTypewriterMode(false)`）。
- 同一根因：查找条跨视图不关闭。源码里改动正文后计数仍按编辑器旧正文算（121 处）；查找只索引 `editor.state.doc`（`App.tsx:1377-1379`），textarea 里的文字不参与，按 Enter 也不会有可见反馈（`selectionStart` 不变）。

**影响**：30 页文档切一次阅读模式就丢上下文，要重新找位置；写作模式设置也被重来一遍。用户能直接感知。
**成本**：M（视图切换处保存/恢复锚点；源码 textarea 按比例或块号滚动；预览→编辑恢复滚动与选区；退出源码不要 `setTextSelection(0)`，`App.tsx:823`；查找条随视图关闭或在源码里改查 textarea）。
**建议**：切换前记录「视口顶部块 + 块内偏移」，切换后按块 id 还原；`switchView` 里暂时禁用而非清空专注/打字机，回编辑时恢复；`applySource` 用保存的锚点重设选区。

## L2 多行脚注让整块脚注失效：预览/HTML 没有「注释」段，Markdown 导出丢续行

**复现**
1. 文档末尾写：
   ```
   [^1]: 第一条脚注。
   [^2]: 第二条脚注第一行。
       第二行续写。
   ```
2. 导出 Markdown；再导出 HTML / 打开预览，看文末。

**证据**
- `src/lib/footnotes.ts:31-35` 要求从第一条定义到文末**每一行**都匹配 `^\[\^[^\]]+\]:`，续行（4 空格缩进）不匹配 → 整个脚注块退回正文，`footnotes` 为空。
- 导出 Markdown `长文-20页.md`：`[^2]: 第二条脚注第一行：这一条有两行。` 下面没有「第二行续写…」，源文件有；导出 25,511 字符，源 25,540 字符。
- 导出 HTML：`<section class="footnotes">` 出现 0 次；预览 `PreviewPane` 走同一个 `renderFootnotes`，同样没有注释段。单行脚注的对照文档预览有「注释」段，说明是识别失败而非渲染失败。
- `renderFootnotes` 还对整条脚注 `escapeHtml`（`export.ts:33-45`），即使识别成功，`**粗体**`、`` `代码` ``、`[示例](https://example.com)` 也只会原样显示为字符。

**影响**：丢字（续行）+ 出口不一致；作者以为脚注导出成功，实际 HTML/预览没有注释，Markdown 还少一行。
**成本**：S（续行用缩进或 `^    ` 归入上一条定义；`renderFootnotes` 保留行内格式或至少单行内联解析）。
**建议**：`extractFootnotes` 允许定义行后跟缩进续行并入同一条；HTML/预览的脚注用完整 Markdown 渲染（与正文同一管线），不要 `escapeHtml` 整条。

## L3 导出/打印出口的完整性缺口：PDF 丢 frontmatter 与脚注，HTML 图片是死链

**复现**
1. 用 `long.md`（有 YAML 和脚注）点「导出 → 打印 / PDF」；或在 DevTools 里 `Emulation.setEmulatedMedia({media:'print'})` 后 `Page.printToPDF`。
2. 导出 HTML，把文件留在下载目录，直接双击打开。

**证据**
- 打印输出 31 页（`.tmp/r21-long/long-print.pdf`，1,489,955 B）；打印 DOM `innerText` 不含 `title: 长文压力测试`，也不含脚注定义；`@media print` 只隐藏顶栏/侧栏/页边（`styles.css:1795-1826`），打印的仍是 `.ProseMirror` 正文，frontmatter 与脚注定义本来就在编辑器外（`App.tsx:3311-3312` 只在 HTML 导出时拼上；预览 `PreviewPane.tsx:38` 也拼）。
- 单行脚注对照：预览 DOM 有「注释 / 第一条脚注…」，同一文档切 print media 后 `.doc-scroll.innerText` 没有脚注文字，证明是打印路径缺，不是脚注识别问题。
- HTML 导出：`src="assets/placeholder.png"` 原样保留；从下载目录打开后 `document.images[1].naturalWidth === 0`（死链）。data URL 图片保留（`src="data:image/png;base64,…"`）。
- 纯文本导出：`buildPlainText` 只看 `editor.getHTML()`（`App.tsx:3327`），frontmatter 与脚注段都不在；图片标签直接剥掉，`示意图` 这个 alt 在 TXT 里找不到；表格变成每格一行（`第一阶段\n收集材料\n12 天\n完成`），不再有行列关系。

**影响**：打印稿缺元数据与注释；HTML 换目录打开图片全丢；TXT 丢图与元数据。都属出口静默丢失。
**成本**：M（打印前渲染与预览同源的完整 HTML，或至少把 frontmatter/脚注块放进打印容器；HTML 导出内联工作区图片或复制 assets 并在文件里写相对说明；TXT 用 alt 占位、表格用 ` | ` 分隔）。
**建议**：抽一个「导出文档 HTML」供 HTML 导出、预览、打印三处共用；`window.print()` 前把 frontmatter/脚注挂进打印容器；HTML 导出对工作区图片转 data URL（或打 zip）。

## L4 20+ 条批注时，页边卡片离对应句子最远 379 px，连接线指不清

**复现**
1. 在 9 个分散段落各选中一段、Ctrl+Enter，得到 18–20 条批注（模拟批注一次可出 1–3 条）。
2. 量每张 `.note` 的 top 与第 i 个 `.annot`（正文高亮）的 top。

**证据**（`s5-annotations.mjs`，18 条）
- 同段落 3 条批注时偏移依次为 1 / 157 / 379 px；另一组 1 / 177 / 366 px。中位偏移 144 px，最大 379 px。
- 原因：`App.tsx:1511-1535` 用 `floor + 12` 向下堆叠，卡片被顺次推开；`.note::before` 只有 15 px 长的水平连接线（`styles.css:846-854`），偏移大时这条线指不到句子。
- 页边不挤压正文：`.doc-column` 恒为 576 px，加批注前后一致；20 条时也只占固定 260 px 页边。
- 采纳不移视口：卡片可见时点它自己的「采纳」，`scrollTop 6669 → 6669`，卡片 6→5。

**影响**：长文里一段常有多条建议，卡片越排越远，「停在对应句子旁边」的承诺失效；读者要靠高亮反找句子。
**成本**：S/M（同段批注合并成一张带「3 条」的卡片，点开再展开；或把连接线画到句子的实际位置，允许卡片轻微重叠 + 悬停置顶）。
**建议**：先按段聚合，再在段内展开；至少把 `::before` 换成按偏移计算的斜线或编号标记。

## L5 大纲高亮只跟光标：滚动阅读不高亮，光标回顶后高亮项还在列表视口外

**复现**
1. 打开侧栏「大纲」，滚到第 40 项点进正文第 30 节（`.doc-scroll.scrollTop = 19838`，高亮 30.1）。
2. 把正文手动滚回顶部（不动光标）。
3. 在正文按 Ctrl+Home（光标回文首）。

**证据**
- 第 2 步：`.doc-scroll.scrollTop = 0`、视口在文首，高亮仍是「30.1 小节：专注与打字机的细节」——`activeOutline` 只在 `onSelectionUpdate` 里算（`App.tsx:800`），滚动只 `bump` tick，不更新高亮。
- 第 3 步：高亮切到第一项，但大纲列表 `scrollTop` 仍是 942，第一项 `getBoundingClientRect().top = -820`（列表视口 120–780），即高亮项完全不可见。`Outline.tsx:26-37` 没有把 active 项滚进列表。
- 66 项、列表 `scrollHeight 1602 / clientHeight 660`，滚动容器本身正常。
- 跳转本身正常：点第 41 项，正文 `scrollTop = 19838`，高亮与 `aria-current` 正确。

**影响**：长文里大纲是导航主入口；高亮停在旧章节、当前章节又看不见，用户以为大纲坏了。
**成本**：S（滚动时用视口顶部标题更新 active，或在光标离开视口时回退到视口标题；active 变化时 `scrollIntoView({block:'nearest'})`）。
**建议**：把「光标所在节」与「视口所在节」分开：输入时用光标，纯滚动时用视口；列表跟随 active。

## 已核对、未发现问题的项

- Markdown 导出保留 frontmatter、表格（带对齐空格）、行内/块公式、data URL 与相对路径图片，脚注定义（除 L2 续行）都在。
- HTML 导出：1 张表 6 行、49 个 `<math>`、0 个 `math-fallback`，data URL 图片存在。
- 页边栏在 20 条批注下没有挤压正文（576 px 不变），卡片不重叠，采纳不跳视口。
- 打印时顶栏、工具栏、侧栏、页边、状态栏都正确隐藏。

## 最值得做的 3 件事

1. **统一视图切换的锚点恢复**（L1）：源码/预览/编辑来回切时保住滚动、光标与选区；不要退出源码就 `setTextSelection(0)`；专注/打字机退出阅读模式后要恢复，查找条跨视图关闭或改查 textarea。
2. **脚注与打印走同一条渲染管线**（L2+L3）：允许缩进续行的脚注定义；HTML、预览、打印共用一份「正文 + frontmatter + 注释」的 HTML，打印前注入，HTML 导出内联工作区图片。
3. **大纲与页边跟随视口**（L5+L4）：滚动时更新大纲高亮并把 active 滚进列表；同段批注先聚合再展开，消除 300 px 以上的批注漂移。
