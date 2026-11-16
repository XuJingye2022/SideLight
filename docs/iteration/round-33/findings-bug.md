# 第 33 轮 · 缺陷猎人（端到端，只读）报告

- 环境：`http://localhost:5175`（未重启，`/src/main.tsx` 200），headless Edge CDP **9222**；每个脚本前跑 `node .tmp/reset.mjs 9222`。只读产品代码，未改产品文件。
- HEAD `e9d90a8`（round-32 之后，无未提交产品改动）。
- 脚本（本轮新建）：`.tmp/e2e-r33-bug-a.mjs`（路径 1+3+6）、`.tmp/e2e-r33-bug-a2.mjs`（Ctrl+Alt 文件菜单族 + 保存并切换 + 大文件）、`.tmp/e2e-r33-bug-b.mjs`（路径 2+4+5）、`.tmp/e2e-r33-bug-probe1.mjs`（树结构）、`.tmp/e2e-r33-bug-probe2.mjs`（新建文件夹/脏删撤销/取消打开）。日志同名 `.log`。
- 假工作区：复用 `.tmp/r30-fsa.mjs`。**注意**：它的键是工作区根内的相对路径（`'甲.md'`），写成 `'示例文集/甲.md'` 会多出一层同名目录（probe1 已确认这是脚本错，不是产品缺陷）。
- 挂了 console/pageerror 监听的 6 次运行全部 **error 0、pageerror 0**（`## errors []`）。
- 截图：`shots/round-33/b1-format.png`、`b1-saved.png`、`b1-reload.png`、`b2-tree.png`、`b3-openfile.png`、`b4-source-saved.png`、`b4-table-pipe.png`、`b5-narrow.png`、`b5-settings-narrow.png`、`b5-shortcuts-narrow.png`、`b5-wide.png`、`b6-bigfile.png`、`b6-readonly.png`。
  （`b3-keyboard.png` 未生成：脚本 A 在「脏文档 Ctrl+Alt+N」弹框后卡住，后续为脚本内失效步骤，见 note。）

---

## 1（P2，可用性死胡同）「新建文件夹」接受点开头的名字：提示新建成功，但文件树永远不显示，应用内也删不掉

**复现（1/1）**

1. 打开文件夹 → 文件树头 `＋ 新建 ▾` → 「新建文件夹」。
2. 原生 prompt 输入 `.hidden` → 确定。
3. 提示「已新建文件夹 .hidden」；文件树里**没有**这个文件夹，点刷新也没有。

**证据（`.tmp/e2e-r33-bug-probe2.log`）**

```
## new-menu-items ["新建文件","新建文件夹"]
## dialogs-seen [{"type":"prompt","message":"新建文件夹的名字","def":""}]
## newfolder-dot {"notice":"已新建文件夹 .hidden",
   "tree":["示例文集/新目录","示例文集/assets","示例文集/sub","示例文集/甲.md","示例文集/乙.md"],
   "dirs":["assets","sub",...,"新目录",".hidden"]}
## newfolder-dup {"notice":"已存在同名文件夹。"}
```

对照组：`新目录` 建完立刻出现在树里（`## newfolder-normal` 的 `tree` 首项 `示例文集/新目录`）。

**根因**

- `src/App.tsx:2315-2336`：`createFolder` 只 `trim()`，不校验名字；`getDirectoryHandle(name, { create: true })` 成功后 `show('已新建文件夹 …')`。
- `src/lib/workspace.ts:94`：`readDirectory` 里 `if (name.startsWith('.')) continue`——点开头一律跳过。两条规则没有交集检查。

**期望 vs 实际**：用户建的文件夹应能在树里看到；或者干脆拒绝这种名字并说明原因。实际是「成功」提示 + 永久不可见。

**影响**：该文件夹在应用内不可见、不可删（产品本来就不能删目录，见 AGENTS §6），再建同名还会得到「已存在同名文件夹。」。用户被卡在一个没有任何出口的状态里；若以后往这个目录放 `.md`，文件树也不会给出任何线索。手工在资源管理器里删掉才能恢复。

**修复建议**：`createFolder` 里加与 `readDirectory` 对齐的校验——名字以 `.` 开头时直接 `setNotice({ text: '以点开头的名字不会显示在文件树里，换一个名字。', kind: 'error' })` 并 return（顺带挡 `/\`、`..`、纯空白）。同一条也适用于「新建文件」若允许带点开头。

---

## 2（P2，文案自相矛盾）删除确认框说只能用文件管理器恢复，紧接着的提示就给了「撤销」

**复现（2/2，干净文件与脏文件各一次）**

1. 文件树右键 `甲.md` →「删除（移到回收站）」。
2. 确认框正文：「移到这个文件夹的 `.sidelight/trash/`，不会当场永久删除。**要恢复，用文件管理器把 trash 里的文件移回原位。**」
3. 点「移到回收站」→ 立即出现持久提示「已移到回收站：甲.md」，带 **「撤销」** 按钮；点它确实恢复（脏文件连未保存正文一起恢复）。

**证据**

```
## delete-dialog "删除「待删.md」？|移到这个文件夹的 .sidelight/trash/，不会当场永久删除。要恢复，用文件管理器把 trash 里的文件移回原位。|取消|移到回收站"     （.tmp/e2e-r33-bug-b.log）
## dirty-delete-dialog "…|这篇还有未保存的正文。移到回收站时，未保存的正文与这篇的批注会一起删除；撤销会一起搬回。|取消|移到回收站"     （probe2.log）
## dirty-delete-undo {"notice":"已恢复 甲.md"} / ## dirty-undo-bytes "# 甲\n\n甲的正文。未保存的脏字\n"
```

- 文案在 `src/components/TreeActions.tsx:288-292`：`deleteIsDirty` 分支说「撤销会一起搬回」，干净分支说「用文件管理器…移回原位」。
- 撤销按钮在 `src/App.tsx:2382-2405`。

**期望 vs 实际**：两条路径都有应用内撤销，干净文件分支却写「只能用文件管理器」。用户按字面理解会去翻 trash 目录，或者以为删错了没救；也会让「撤销」按钮显得像没被设计过。

**修复建议**：干净分支改成与脏分支同结构——「移到 `.sidelight/trash/`，不会当场永久删除。**删完可以点提示里的「撤销」** 恢复；也可以在文件管理器里把 trash 里的文件移回原位。」脏分支同步补一句「也可以点撤销」。

---

## 六条路径实测结果（无新增可执行缺陷的部分）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 空文档→格式→保存→刷新 | 标题/加粗/列表/引用/围栏代码块 → `Ctrl+S`（stub picker 落 `另存为.md`）→ 读字节 → reload | 通过。HTML 为 `<h2>` / `<strong>` / `<ul><li>` / `<blockquote>` / `<pre><code>`；字节 `## 二级标题\n\n**正文加粗字**\n\n- 列表甲\n- 列表乙\n\n> 引用一行\n\n```const\na = 1\n```\n\n`；reload 后正文完整（草稿键恢复，状态栏「21 字」）。**注**：先打 ` ``` ` 再打 `const a = 1` 时，`const` 被当围栏语言吃掉（`class="language-const"`），这是 Tiptap code block 输入规则的既定行为（` ``` ` 后第一个词=语言），Typora 同理，**不报** | `b1-format/saved/reload.png`；`e2e-r33-bug-a.log` |
| 2 文件树新建/重命名/删除/展开/刷新/当前文档随动 | 右键菜单（重命名/删除）、大小写改名 `干净.md→干净.MD`（接受，树与 active 同步）、删当前脏文档后自动开下一篇、撤销恢复（含未保存正文）、`sub` 展开、新建文件夹 | 通过。删脏文件确认框正确改成「未保存的正文与批注会一起删除；撤销会一起搬回」；撤销后磁盘字节 `# 甲\n\n甲的正文。未保存的脏字\n` 与删除前一致；`sub/子目录.md` 展开正常。**本轮两条新缺陷都不在这条主链上**（见上） | `b2-tree.png`；`e2e-r33-bug-b.log`、`probe2.log` |
| 3 键盘 | `Ctrl+Shift+P`（第 32 轮修复项）、`Ctrl+Alt+E`+`↓`+`Enter`、`Ctrl+=`×2、`Ctrl+Alt+0`、`Ctrl+Alt+N`（脏→三选一）、`Ctrl+Alt+O`、`Ctrl+Alt+S`、`Ctrl+Shift+3` | 通过。`Ctrl+Shift+P` 现在真进预览（`contenteditable=false`、状态栏「预览」）且 `Esc` 回编辑；`Ctrl+Alt+E` 打开导出菜单并把焦点送进「HTML」，`↓`→「Markdown」，`Enter`→提示「已导出 另存为.md」且菜单关闭；字号 17→19→`Ctrl+Alt+0`→17；`Ctrl+Alt+O` 真打开假 picker 返回的文件；`Ctrl+Alt+S` 落 `另存为.md` 且原 `甲.md` 字节不变；脏文档 `Ctrl+Alt+N` 弹「取消 / 不保存 / 保存并切换」，点「保存并切换」先把脏字写进当前保存目标再开空文档 | `b3-openfile.png`；`e2e-r33-bug-a.log`、`a2.log` |
| 4 公式/表格/脚注/frontmatter/行内 HTML/callout → 源码 → 保存往返 | 186 B 样本，源码框与磁盘**逐字节相同**（`equal:true`）；在源码态（不离开源码模式）直接追加一行后 `Ctrl+S`；再回编辑态在表格单元格里输入 `含|竖线` 保存 | 通过。源码态保存把追加行落盘（`…[^1]: 脚注定义。\n\n源码态追加一行。\n`），frontmatter/callout/`$$`/`[^1]`/`<kbd>` 全保真；表格竖线被正确转义为 `\|`（`| 一 含\|竖线 | 二   |`），不破表 | `b4-source-saved.png`、`b4-table-pipe.png`；`e2e-r33-bug-b.log` |
| 5 源码/预览/专注/设置/字号/窄窗 1024×700 与 1440×900 | 打开设置对话框与快捷键一览（`Shift+/`）在 1024×700 下量溢出；1440×900 对照 | 通过。`scrollWidth === innerWidth`（1024/1024、1440/1440），越界元素 0，三种状态下都一样 | `b5-narrow/settings-narrow/shortcuts-narrow/wide.png`；`## overflow *` |
| 6 控制台 0 error / 错误路径 | 6 MiB 文件、picker 取消、只读目标、无句柄保存 | 通过。大文件提示「「超大.md」超过 5.5 MiB，仍在「未命名.md」」且树里保留该文件；无句柄 Ctrl+S 走 stub picker 落 `另存为.md`（工作区有句柄时按 round 28 设计直接落 `未命名.md`，故 picker 取消/只读在本轮工作区场景下**没能触达**，与第 32 轮结论一致）；6 次运行 error 0 | `b6-bigfile.png`、`b6-readonly.png`；各 `## errors []` |

## note（重复项与不算缺陷的观察，不计入 actionable）

- **重复（前轮已列，不算本轮 actionable）**：① 重命名成功后提示「已刷新：新增 1 个，消失 1 个」——第 29 轮 findings-bug 第 2 条；② 源码模式字数含 Markdown 标记（本篇编辑 30 字 / 源码 44 字）——第 31 轮 note、`STATE.md` 待办池；③ 字数明细「段」口径——第 32 轮 note。
- **脚本失效非产品缺陷**：① `Ctrl+Alt+N` 弹三选一后脚本未先关框就继续按键，`inert` 让后续点击超时（`e2e-r33-bug-a.mjs:138`）——已用 a2 分步复测；② 假工作区键写成 `'示例文集/甲.md'` 会真的生成同名子目录（probe1 `## after-open` 的 `示例文集/示例文集` 是脚本问题）；③ 假 FS 允许 `a/b` 这种名字，真实盘会抛 `TypeMismatchError`，不算产品缺陷。
- **低置信、不算缺陷**：`Ctrl+Alt+O` 时 picker 抛 `AbortError` 不弹任何提示（`## open-cancel` 无新 notice）——与系统文件选择器「取消即静默」一致，不报。

## UNVERIFIED（本轮测不了）

1. **真实文件系统的大小写改名**：`干净.md → 干净.MD` 在假 FS（区分大小写）上成功。真实 Windows 盘不区分大小写，`move()` 可能被判「目标已存在」，`STATE.md` 的「大小写两段式失败后的临时名」仍是未验项。
2. **宿主 WebView2 下的 `window.prompt`**：`新建文件夹` 用 `src/App.tsx:2319` 的原生 prompt（`a2/probe2` 实测浏览器里能弹）。WebView2 是否默认弹、宿主有没有处理 `ScriptDialogOpening`，本轮只做了静态检查（`host/Program.cs` 无相关处理），未跑宿主。
3. **真实目录句柄**：假句柄无权限模型；「新建文件夹」「删除撤销」的结论来自假 FSA，真实 Chrome/宿主走同一代码路径但未手测。
4. **中文输入法、宿主（WebView2）、macOS、屏幕阅读器实录**：不在本轮环境。
5. **源码模式里的 `Ctrl+F` 选区、字数「段/句」口径**：前轮已列，本轮不再测。
