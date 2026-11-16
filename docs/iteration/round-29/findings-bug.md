# 第 29 轮 · 缺陷猎人（端到端）报告

- 环境：http://localhost:5175（dev server 在跑，未重启），headless Edge CDP 9222，`node .tmp/reset.mjs 9222` 清过 localStorage/IndexedDB。
- 方法：Playwright 自写脚本接 CDP，注入带写入能力的假 File System Access 工作区（`.tmp/r29-fsa.mjs`：`createWritable` / `move` / `removeEntry` / `entries`），只读产品代码，未改任何产品文件。
- 脚本：`.tmp/e2e-r29-p1b.mjs`（路径 1）、`.tmp/e2e-r29-p2.mjs`（路径 2）、`.tmp/e2e-r29-p3p5.mjs`（路径 3/5/6）、`.tmp/e2e-r29-p4.mjs`（路径 4）、`.tmp/e2e-r29-p6.mjs`、`.tmp/e2e-r29-preview.mjs`（收尾探针）。
- 截图：`shots/round-29/p1-format-save.png`、`p1-after-reload.png`、`p2-tree.png`、`p5-dark.png`、`p5-preview-mode.png`、`p5-1024x700.png`、`p5-1440x900.png`、`p6-final.png`。
- 六条路径全部真跑；控制台 error 累计 **0**（8 次运行，favicon 404 也未出现）。

---

## 1（P2，残留 / 误导）保存成功后仍会写下一份陈旧草稿，内容与已保存文件不一致

**复现**

1. 假工作区里打开 `甲.md`（`# 甲\n\n甲的内容。\n`），`Ctrl+End` 后打字，随即 `Ctrl+S`。
2. 1.2 s 后读假文件系统：`甲改名.md` 已写入新正文，同时存在 `.sidelight/drafts/甲改名.md`，内容与应用内正文相同（`.tmp/e2e-r29-p2.mjs` 的 `## 改名后保存` / `## expand sub`）。
3. 富文本文档同样命中：`.tmp/e2e-r29-p4.mjs` 的 `## saved rich` 里 `富文本.md` 与 `.sidelight/drafts/富文本.md` 同时存在，且草稿里的表格被编辑器重排成补空格形式（草稿 `| 列1  | 列2  |`、`| a   | b   |`），磁盘文件仍是原文 `| 列1 | 列2 |`。

**根因**

- `src/App.tsx:845-857`：每次 `onUpdate` 都排一个 800 ms 草稿定时器，保存路径不取消它；保存成功时 `src/App.tsx:2035` 已删过草稿，定时器随后才落盘，形成「保存后草稿复活」。
- 草稿走另一条序列化路径，所以表格等写法与保存字节不同。

**期望 vs 实际**：保存成功后 `.sidelight/drafts/<名>.md` 应不存在（README 第 61 行「保存成功后删草稿」）。实际残留，且下次打开可能触发「有未保存的草稿」；用户若选恢复，会拿到一份表格已被重排的正文。

**修复建议**：保存成功后 `clearTimeout(draftTimerRef.current)` 并把 `draftGenerationRef` 加一；或在草稿定时器回调里先比对 `dirty`/`saving` 状态再写。

**未完全稳定复现**：`.tmp/e2e-r29-p6.mjs` 连续 3.5 s 观察时草稿为 null（1/4 次未命中），说明是竞态；建议修复时把「保存中/已保存」做成定时器内可读的守卫，而不是只依赖时序。

---

## 2（P2，文案错误）重命名成功后弹出「已刷新：新增 1 个，消失 1 个」

**复现**：打开文件夹 → F2 把 `甲.md` 改名 `甲2.md` → Enter。

**证据**：`.tmp/e2e-r29-p3p5.mjs` 的 `## rename done`：`"notice":"已刷新：新增 1 个，消失 1 个"`；`.tmp/e2e-r29-p2.mjs` 的 `## after 甲改名` 同样文案。树、当前文档、保存路径都正确随动（`active":"示例文集/甲2.md"`）。

**根因**：`src/App.tsx:2250` 改名后走 `refreshTree({ mode: 'adopt', activePath: newPath })`，`refreshTree` 按前后文件集合算 `added/gone`（`src/App.tsx:2160-2162`）并统一提示，改名必然 1 增 1 减。

**期望 vs 实际**：应提示「已重命名为 甲2.md」。实际提示像是外部刷新，用户会以为文件被别人动过。

**修复建议**：给 `refreshTree` 加 `silentDiff` 选项，改名路径跳过 diff 提示，由 `handleRenamedFile` 直接 `setNotice({text: '已重命名为 …', kind:'info'})`。

---

## 3（P2，文档与实现不一致）README 说 `Ctrl+0` 复位字号，实际是 `Ctrl+Alt+0`；`Ctrl+0` 是正文段落

**证据**

- `README.md:51`：「`Ctrl + =` 放大、`Ctrl + -` 缩小、`Ctrl + 0` 复位」。
- `src/App.tsx:3396` 把 `mod + /^[0-6]$/` 归给标题快捷键；`src/App.tsx:3566-3569` 字号复位要求 `event.altKey`。
- `.tmp/e2e-r29-p6.mjs` 实测：`Ctrl+0` 后光标块是 `<p>甲的内容。</p>`（正文），字号 20px 不变；`Ctrl+Alt+0` 后字号 20px → 17px。

**期望 vs 实际**：文档承诺的键位按下去是另一个功能；用户按 README 试两次会以为字号坏了（第 30 行的 `Ctrl+0` 正文才是实现行为，README 自身两处冲突）。

**修复建议**：改 `README.md:51` 为「`Ctrl + Alt + 0` 复位（`Ctrl+0` 是正文样式）」，或在设置面板/快捷键弹窗里并排写清两者。

---

## 4（P2，文案误导）`Ctrl+F` 刚打开、还没输入就显示「无结果」

**证据**：`.tmp/e2e-r29-p3p5.mjs` 的 `## Ctrl+F`：查找条 innerText = `"无结果\n↑\n↓\n✕\n替换\n全部替换"`，查询框为空。根因 `src/components/FindBar.tsx:56`：`total === 0 ? '无结果' : …`，没有空查询分支。

**期望 vs 实际**：空查询应显示「输入以查找」或不显示计数，不应给出「无结果」这种结论。修复：`query.trim() === '' ? '' : total === 0 ? '无结果' : …`。

---

## 5（P2，行为与文档不符）打开超 5.5 MiB 文件：有「文件太大」提示，但编辑区保留上一篇正文

**复现**：假工作区写入 6 MiB 的 `大.md` → 刷新文件树 → 点开。

**证据**：`.tmp/e2e-r29-p3p5.mjs` 的 `## 打开 6MB`：`notice` = `文件太大，暂不支持（上限 5.5 MiB）。×`，而 `.ProseMirror` 内文仍是上一篇 `甲` 的 `甲\n\n甲的内容。尾注`。

**期望 vs 实际**：`README.md:76` 写「超过上限显示…**并清空正文**」。实际正文不清空，用户可能以为窗口里就是刚点的大文件，随后 `Ctrl+S` 写的是上一篇。

**未验证**：标题栏与树选中项是否切到 `大.md`（脚本没采集）。修复建议：拦截时同时清空正文/或保持上一篇但把标题与选中项明确留在上一篇，并在提示里写清「仍停留在 <上一篇名>」。

---

## 已核对、不是缺陷的项（避免下一轮重复查）

- 键盘：`Ctrl+K` 弹链接框并聚焦 `INPUT.link-editor-input`；`Ctrl+M` 出 `math-inline-input`；`Ctrl+P` 出快速打开并聚焦 `quick-open-input`；`Ctrl+1–6/0` 分别落到 `H1…H6`/`P`；`Ctrl+/` 进源码（textarea 内容与磁盘一致）；`Ctrl+F` 聚焦 `find-input`；`Esc` 关闭查找条返回 false；焦点环 `outline: solid 2px rgb(43,109,100)`（`.tmp/e2e-r29-p3p5.mjs`）。
- 保存链路：无句柄 + 工作区时 `Ctrl+S` 直接建 `未命名.md` 并提示「已保存 未命名.md」；有句柄时写回原文件（`.tmp/e2e-r29-probe.mjs`、`p2`）。
- 富文本 → 源码 → 保存往返：frontmatter、行内 HTML `<kbd>`、callout `> [!note]`、行内/块级公式、脚注定义、未改动的表格逐字节一致；源码 textarea 与磁盘字节相同（`.tmp/e2e-r29-p4.mjs`）。
- 文件树：新建 → `未命名.md` 落盘并入树；F2 改名后当前文档、保存路径、树都随动；展开子目录；刷新无假提示；`Delete` 弹「删除「丙.md」？」确认框（按钮是「取消 / 移到回收站」，不是「删除」，脚本选择器别写 `hasText('删除')`）。
- 视图/主题/字号：预览模式只有一个 `.ProseMirror.preview-pane`（不是编辑区与预览同屏）；深色主题 `bg rgb(21,23,26)`、保存后仍生效；`Ctrl+=` 逐次 17→18→19px（上一轮那次「16px 不变」是脚本在设置对话框遮罩下按键，属脚本问题）。
- 布局：1024×700 与 1440×900 都无横向溢出（`scrollWidth === innerWidth`）。
- 首屏 0 console error（8 次运行）。

## 去重说明（本轮不计入 actionable）

- 大文件打开无大小门 / 主线程长阻塞：第 22 轮 D3 已报，本轮走文件树路径已有 5.5 MiB 门，未重复。
- 保存后草稿与旧草稿新旧不分的恢复提示：第 21 轮 D5 已报「草稿提示不看新旧」；本轮第 1 条只报「保存成功后仍写草稿」这一新的触发点。
- `.sidelight/drafts` 浏览器通道只写不读：第 21/22 轮 D2 已报，未重复。
- 正文 Tab 吞字、源码往返丢位置、大纲不跟滚动：第 21/22 轮 F4/L1/L3、U3 已报，本轮未重复（`Ctrl+End`、`Ctrl+/` 往返本轮正常）。

## UNVERIFIED（本轮测不了，写清原因）

- **只读 / 文件占用 / 网络盘保存失败**：假句柄没有权限模型，无法让 `createWritable` 抛 `NotAllowedError`；浏览器里也没有 argv 只读横幅。下一轮用真实宿主或给假句柄加失败开关再测。
- **真实文件夹句柄的重开恢复**：假句柄不能进 IndexedDB，刷新后侧栏回大纲页签、树消失属预期降级，不算缺陷；真实 Chrome 目录句柄需人工授权，本机未验。
- **中文输入法、安装后的宿主行为、真实 5.5–6 MB 边界**：不在本轮环境范围。
