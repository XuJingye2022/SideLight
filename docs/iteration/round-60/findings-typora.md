# 第 60 轮 Typora 对照发现（finder-typora）

环境：dev `http://localhost:5175`、CDP 9223、`node .tmp/reset.mjs 9223`。
对照源：`.tmp/typora-ref/resources/Docs/Markdown Reference.md:189-191`（TOC）、`:348-352`（emoji）。
实测脚本：`.tmp/e2e-r60-finder-typora.mjs`，原始结果 `.tmp/r60-finder-typora.json`，截图 `shots/round-60/toc-editor.png`、`shots/round-60/preview-toc-literal.png`。
HEAD `5384410`（第 59 轮已提交）。工作区用合成目录句柄注入（同 `.tmp/e2e-r59-tester-b2b.mjs`）。

## 实测（3 项）

1. `[TOC]` 在编辑视图有渲染：`.sl-toc` 1 个、3 个 `.sl-toc-item`（甲章/乙节/丙目），点第 2 项 H2 进视口（top 211）。同段落的字面 `[TOC]` 也可见，TOC 盒子插在标记段落之前。
2. 只读预览（Ctrl+Shift+P 等价按钮）：`.preview-pane` 存在、`.sl-toc` 0 个、正文含字面 `[TOC]`（`literalToc: true`）。
3. 差距表两行已被第 59 轮推翻：`.tree-view-toggle` 有「树 / 列表」两钮（`aria-pressed` true/false）；`Ctrl+Shift+F` 打开 `.global-search-dialog`（`role=dialog`，提示「在工作区的 Markdown 文件里查找」）。`:smile:` 仍是字面（emoji 未做，见 B-106）。

## F1（P1，文档）差距表三行过期，计数应为 39/4

- 证据：`docs/typora-gap.md:60` 文件列表形态的侧栏「无」→ 实测有 树/列表两态（B-102 第 59 轮 fixed）；`:72` 全局搜索「无」→ 实测 `Ctrl+Shift+F` 可开（B-104 第 59 轮 fixed）；`:54` TOC「无」→ 实测编辑视图已渲染（第 58 轮）。
- 计数核对：表头 `已经有的（36）` 与 `缺的（6）` 与行数自洽（36 行 + 子节 1/1/1/1/2），但内容过期。把 TOC 移入「有」、把 TOC/emoji 行拆成「emoji 输入」一行后应为 **39 / 4**（缺：emoji、图片缩放、自定义主题、自定义快捷键），「视图与界面」「查找与表格操作」两个空子节要删。
- 建议：改表头与行文案，不再用「无」；`README.md`、`AGENTS.md` 若引 36/6 同步改。

## F2（P1，编辑/预览）TOC 只在编辑视图；预览丢目录并留字面 `[TOC]`，编辑视图里标记与目录同时可见（导出/打印未实测）

- 证据：`.tmp/r60-finder-typora.json` 的 `steps.preview`：`tocInPane: 0`、`literalToc: true`，`textHead` 为「甲章 乙节 丙目 [TOC] …」；`shots/round-60/preview-toc-literal.png`。`steps.editor`：`tocCount: 1` 且 `body` 含字面 `[TOC]`；`shots/round-60/toc-editor.png`（TOC 盒子在「[TOC]」上方，两者同时可见）。
- Typora：`[toc]` 回车后生成目录「section」，标记被目录取代（`Markdown Reference.md:191`）。Sidelight 现状：作者写 `[TOC]` 后，只读预览得到的是字面 `[TOC]`，目录消失；编辑视图多出一行字面标记。HTML 导出与打印未实测，二者同走只读渲染路径，按代码推测同样无目录（**UNVERIFIED**）。
- 建议：编辑视图把 `[TOC]` 段落按标记收起（或只在光标进入时露出），预览与导出对 `[TOC]` 段落渲染同一份目录（锚点跳转）；导出侧先补实测。与 Mermaid 的「预览/导出不含图」同一条口径，记进已知限制。属 B-106 已交付 MVP 的返修点，不与 emoji 重复。

## F3（P2，流程文档）`docs/iteration/BRIEF.md` 过期

- 证据：`BRIEF.md:6` 写「第 58 轮；HEAD `35948b2`」，实测 `git rev-parse --short HEAD` = `5384410`；Top 5 里 B-104、B-102 第 59 轮已 fixed，留给 planner 的优先级已失真。
- 建议：每轮开头先改「当前」与 Top 5；或让 BRIEF 只留链接到 `STATE.md`。

## 未归因（不改产品结论）

纯载入 `pageerror` 3 条：`reading 'id'`、`reading 'url'`、`OfscreenTranslate`（末条是浏览器扩展）。前两条在注入合成工作区后同现，可能与扩展或会话恢复有关，未归因到产品，本轮不计入 findings。
