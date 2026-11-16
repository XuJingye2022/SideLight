# 第 32 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175`（未重启，`/src/main.tsx` 200），headless Edge CDP **9222**；每个脚本开头跑 `node .tmp/reset.mjs 9222`。只读产品代码，未改任何产品文件。
- 脚本（本轮新建）：`.tmp/e2e-r32-bug-a.mjs`（路径 1 + 3 + 6）、`.tmp/e2e-r32-bug-b.mjs`（路径 2 + 4 + 5）、`.tmp/e2e-r32-bug-probe*.mjs`（微探针，11 个）、`.tmp/e2e-r32-bug-bisect.mjs`（吞段二分）。日志在 `.tmp/e2e-r32-bug-*.log`。
- 假工作区：复用 `.tmp/r30-fsa.mjs`（`showDirectoryPicker`/`showSaveFilePicker` stub，`write()` 支持 ArrayBuffer/Blob）。
- 挂了 console/pageerror 监听的 7 次运行全部 **error 0、pageerror 0**（每条都以 `## errors []` 收尾）。
- 截图：`shots/round-32/b1-format.png`、`b1-saved.png`、`b1-reload.png`、`b2-tree.png`、`b3-keyboard.png`、`b4-source.png`、`b4-saved.png`、`b5-narrow.png`、`b5-wide.png`、`probe-preview-key.png`、`probe-stats-quickopen.png`、`probe-html-table.png`、`probe-end-enter.png`。

## 1（P1，快捷键不可用）Windows 上 `Ctrl+Shift+P` 预览快捷键完全无效，但快捷键一览和按钮 tooltip 都在宣传它

**复现（1/1，真实按键，非 selector 问题）**

1. 打开任意文档，光标在正文里。
2. 按 `Ctrl+Shift+P`。
3. 观察：状态栏仍是「草稿 02:13」，`.ProseMirror` 仍是 `contenteditable="true"`，没有只读预览。
4. 点工具栏「预览」按钮：状态栏变成「… / 预览」，`contenteditable="false"`，预览正常。

**证据（`.tmp/e2e-r32-bug-probe10.log`）**

```
## preview-key {"before":{"status":"草稿 02:13","editable":"true","sourceTextarea":false,"preview":false},
  "afterCtrlShiftP":{"status":"草稿 02:13","editable":"true","sourceTextarea":false,"preview":false},
  "afterButton":{"status":"草稿 02:13\n预览","editable":"false","sourceTextarea":false,"preview":true}}
## errors []
```

同一条命令里 `Ctrl+Shift+M`（块级公式）正常弹出「输入 LaTeX，例如 x^2」输入框，`Ctrl+H` 正常打开查找，说明不是 Playwright 的按键派发问题。

**根因（静态可证）**

- `src/App.tsx:3613`：`if (mod && !event.altKey && event.shiftKey && !event.ctrlKey && key === 'p')`。
- 同一函数 `src/App.tsx:3443`：`const mod = event.ctrlKey || event.metaKey`。Windows 上按 `Ctrl+Shift+P` 时 `event.ctrlKey === true`，`!event.ctrlKey` 恒为 `false`，这条分支在 Windows 上**永远进不去**；只有 macOS 的 `Cmd+Shift+P`（`metaKey=true`、`ctrlKey=false`）能命中。
- 宣传它的地方：`src/components/ShortcutsDialog.tsx:44`（`['Ctrl+Shift+P', '预览']`）、`src/App.tsx:4519`（预览按钮 `title="只读预览（Ctrl+Shift+P）"`）。

**期望 vs 实际**：按下文档化的 `Ctrl+Shift+P` 应进入只读预览。实际无声失败，没有任何提示，用户只能改用工具栏按钮。

**修复建议**：把 `!event.ctrlKey` 改成 `!event.metaKey`（或直接删掉这个条件；macOS 的 `Cmd+Shift+P` 由 `key === 'p'` + `mod` 覆盖）。改完在 `keyboard-acceptance.mjs` 里补一条：`Ctrl+Shift+P` → 状态栏出现「预览」、`contenteditable="false"`；再补一条 `Esc` 退出。

---

## 其余 5 条路径实测结果（无新增可执行缺陷）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档→格式→保存→刷新 | 标题/加粗/列表/引用/围栏代码块 → `Ctrl+S`（stub picker）→ 读 fake 文件字节 → `reload` | 保存成功（`已保存 另存为.md`），字节含 `## 二级标题`、`- 列表甲`、`> 引用一行`、围栏代码块；刷新后正文由草稿恢复。注：`Ctrl+B` 那一步踩到 note 里的 <10 ms 按键竞态，整段被吞；与保存链路无关（同一脚本 `probe8` 已证明间隔 ≥10 ms 正常） | `b1-format/saved/reload.png`；`e2e-r32-bug-a.log` |
| 2 文件树 | 展开/收起子目录、新建（冲突命名出 `未命名 2.md`）、重命名**当前**文档、外部加文件后刷新、删除非当前文档后撤销 | 全部随动；改名后 `Ctrl+S` 写进新文件 `改名后.md`（旧文件不再回写）；撤销恢复原字节 | `b2-tree.png`；`## post-rename-save` |
| 3 键盘 | `Ctrl+K/M/P`、`Ctrl+1–6/0`、`Ctrl+/`、`Ctrl+Shift+1/3/L`、表格 `Tab`/`Shift+Tab`/`Ctrl+Enter`/`Ctrl+L`、`Ctrl+F`/`Esc`、焦点环 | 全部符合：标题 6 档、`Ctrl+0` 回正文、最后单元格 `Tab` 自动加行、`Ctrl+Enter` 加行、`Ctrl+L` 删行、查找 `2 / 3`、焦点环 `2px solid rgb(43,109,100)` | `b3-keyboard.png`；`## keys` |
| 4 富文本→源码→保存往返 | frontmatter + `<kbd>` + callout + 行内/块级公式 + 表格 + 脚注，在 callout 和表格单元格里真输入，再存 | 源码 textarea 与磁盘基线一致；保存后 frontmatter/callout/脚注定义/脚注引用/`<kbd>`/`$…$`/`$$…$$`/表格全部保留，编辑过的 callout 与单元格文本落盘；行内 HTML 段落里追加文字也保住 `<kbd>Ctrl</kbd>` 原文 | `b4-source/saved.png`；`## rich-saved`、`probe4 ## B-saved` |
| 5 视图/主题/字号/窄窗 | 专注、打字机、预览（按钮）、深色、`Ctrl+=`、1024×700 与 1440×900 | 预览 `contenteditable=false` 且含 callout/脚注文本；深色 `data-theme=dark`；字号 17→18px 且 reload 后仍是 18px；两档窗口 `scrollWidth === innerWidth`（无横向溢出，越界元素 0） | `b5-narrow/wide.png`；`## views` |
| 6 控制台/错误路径 | 全程监听 console/pageerror；picker 取消、目标只读 | 7 次带监听的运行 `error 0`；取消保存提示「已取消保存。」且 dirty 保留；只读目标提示「保存失败：文件是只读的。改动还在，可以再试一次。」且不弹错误框 | `## errpaths` |

## 额外探针（无新缺陷）

- 字数明表面板：8 行（中日韩字 11 / 拉丁词 2 / 合计 13 / 字符 18 / 句 1 / 段 1 / 阅读 1 分钟 / 选区「未选中文本」），状态栏「13 字」= 面板「合计 13」（第 31 轮那条已修）；打开即把焦点放进面板（`active="stats-detail"`），`Esc` 关闭并把焦点还给 `.stats-trigger`。
- 快速打开：`Ctrl+P` 列出 3 篇，输入「另一」过滤到 1 篇，`Enter` 打开并同步树选中（`示例文集/另一个.md`）。
- 表格工具条 7 个按钮逐个点击：上插入 3→4 行、下插入 4→5 行、左插入 3→4 列、右插入 4→5 列、删行 5→4、删列 5→4、删表后 `table` 不存在且工具条消失；保存后 `表格.md` 为 `# 表格\n`（表格删除被正确序列化）。
- 快捷键一览（`Shift+/`）文案与实现对照（静态读 `App.tsx:3442-3632` + 实测）：`Ctrl+K/M/P`、`Ctrl+1–6/0`、`Ctrl+/`、`Ctrl+Shift+1/3/L`、表格 `Ctrl+Enter/L`、列表 `Tab/Shift+Tab`、`Ctrl+F`、`Ctrl+E`、`Ctrl+Shift+M`、`Ctrl+B/I`、`Ctrl+Shift+X`、`Ctrl+=` 全部实测可用；**只有 `Ctrl+Shift+P` 失效**（见第 1 条）。文件菜单族 `Ctrl+Alt+N/O/Shift+O/S/E` 只做了静态对照，未逐条实按。

## note（重复项与低置信项，不计入 actionable）

- **重复（前轮/待办池已列，不算本轮 actionable）**：① 重命名成功后弹「已刷新：新增 1 个，消失 1 个」——第 29 轮 `findings-bug.md` 第 2 条已报（P2 文案）；② 行内 HTML 只保真不渲染（`<kbd>` 显示为文字）——`docs/typora-gap.md:27/39` 与第 22 轮 `findings-typora.md` 2.7 已列；③ 源码模式里 Ctrl+F 只由编辑态正文计数、textarea 不被选中——第 22 轮 `findings-long.md:18` 已列；④ 字数明细「段 / 句」在编辑模式按 `textContent` 口径算——`STATE.md:127` 下一轮优先项已列（本轮复测：状态栏「13 字」= 面板「合计 13」，第 31 轮的那条已修好；`段` 仍把两段算 1 段）。
- **低置信、不算缺陷**：`End`/`Shift+Home` 之后 **10 ms 内**紧跟结构性按键（`Enter`）会作用在旧选区上，把整段文字吞掉；同一序列中间隔 ≥10 ms 就正常。实测：delay 0 → 段落丢失（`<p><br></p><p><br></p>`），delay 10/25/50/100/200 ms 全部保留；`End` 后直接输入字符也不会吞（得到「保留这段文字X」）。`Ctrl+Z` 能回滚出上一版正文，但日志里恢复的是更早一版内容，**不能严格证明**救回的正是被吞那一段。这更像 ProseMirror 选区同步竞态 + Playwright 连发按键，真人手速基本打不到 10 ms 窗口，因此**不报为缺陷**，只留记录（`probe8` 日志）。若以后收到「快速按 End/Enter 丢段」的真实反馈，再按 `.tmp/e2e-r32-bug-bisect.mjs` 的二分法复现。

## UNVERIFIED

- 真实中文输入法组合输入下的快捷键（本轮全部按键为 CDP 合成，`isComposing` 分支未覆盖）。
- 真人手速（≥30 ms 按键间隔）下的 `End → Enter` 竞态；只测到 <10 ms 的合成连发。
- macOS 上 `Cmd+Shift+P` 是否真的可用：本机是 Windows，只做了静态推断（`metaKey=true`、`ctrlKey=false` 可命中 `App.tsx:3613`）。
- 预览模式里的滚动/打印路径、真实文件句柄（非 fake）上的重命名与保存。
