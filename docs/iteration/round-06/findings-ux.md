# 第 06 轮 · 体验与界面 finder（ux）

- 侦察对象：`http://localhost:5173`（Windows 11，Chromium/WebView2 同源能力），CDP `127.0.0.1:9223`，`playwright-core` 连接。
- 方法：只读。模拟宿主 argv 打开的方式与宿主一致——把 `{text,name,savedAt:0,readOnly:true}` 写进 `sidelight.doc.v1` 再 reload（对应 `host/Program.cs:595-603` 的注入）。脚本 `.tmp/r6-ux/probe.mjs`、`.tmp/r6-ux/probe2.mjs`，数据 `.tmp/r6-ux/probe-result.json`；截图 `shots/round-06/`。
- 未改 `src/`、`host/`；未跑 `npm run build`；注册表只读查询，未写。
- 视口 1440×900，另测 880×760。页面里没有宿主桥（本轮前端未接线），一切「写回」后的界面是 **DOM 注入的设计模拟**，不是实现效果。

## 结论速览（按影响排序）

| 编号 | 一句话 | 影响 | 难度 |
| --- | --- | --- | --- |
| U1 | 写回接上后，双击打开的文件第一次保存会静默改写原文件：没有语法风险横幅，也没有保存前差异确认 | 高：可能改坏用户原文件格式，且用户不知情 | S–M |
| U2 | 用户看不出自己在编辑哪个文件：窗口标题只有「Sidelight」，状态栏没有文件，左栏却说「现在打开的是示例」 | 高：首屏就怀疑打开的不是自己的文件 | S |
| U3 | 写回没有状态机：没有「保存中」，成功文案不说明写到哪，失败/超时没有定文案，按钮没有键位提示 | 高：10 秒超时内用户会重复按 Ctrl+S | M |
| U4 | 外部修改与文件占用没有区分；三选一冲突框缺少协议字段，本轮做不完整 | 中高：覆盖别人的改动，或只报一句「保存失败」 | M–L |
| U5 | 文件菜单缺「保存」，菜单标签被挤成竖排，导出 Markdown 与另存为语义重复 | 中：找不入口、看不出差别 | S |

---

## U1 写回接上后，双击打开的文件第一次保存会静默改写原文件

**证据**

- 双击路径不进 `loadIntoEditor`。初始状态从 `sidelight.doc.v1` 恢复时，`originalText` 是 `null`（`src/App.tsx:298`），只有打开文件夹/文件/切换文档才赋值（`src/App.tsx:1076`）。`saveFile` 的差异确认条件要求 `originalText !== null`（`src/App.tsx:1328`），所以双击路径永远跳过「保存后文件会有这些差异」对话框。
- 风险语法同样只在 `loadIntoEditor` 里算：`setRisks(findRiskySyntax(text))`（`src/App.tsx:1078`），初始值是空数组（`src/App.tsx:229`）。实测：把带引用式链接 `[侧灯]: https://example.com` 的文档按宿主方式注入再 reload，滚到 400px 仍只有只读横幅，`.risk-banner` 为 `null`（`.tmp/r6-ux/probe-result.json`，`shots/round-06/ux-current-banners-stacked.png`）。
- 保存基线取「编辑器序列化后的正文」，不是文件原文（`src/App.tsx:535-542`）。因此载入时 `dirty=false`，即使 Tiptap 已经把引用式链接改写成别的形式，界面上也看不出「文件将被改写」。
- 结论链：双击 → 无风险横幅 → `dirty` 为假 → 按 Ctrl+S → 无差异确认 → 把规范化后的全文写回原文件。第 06 轮一旦接上 IPC，这条链第一次真正有破坏力。

**改法**

1. `initial` 里保留一份 `rawText`（完整原文，含 frontmatter），用它初始化 `originalText` 与 `risks`：`useState(() => initial.rawText)`、`useState(() => findRiskySyntax(initial.rawText))`，`eolRef` 也从它取。约 6 行，双击路径立刻恢复两条保护。
2. 双击打开的文档，第一次 `Ctrl+S` 必过差异确认（`saveWarned=false` 默认已满足）；确认框标题改成按来源取词：「保存后原文件会有这些差异」，按钮「仍然保存」不变。
3. 可选更稳：宿主文件且 `dirty===false` 时 `Ctrl+S` 不写盘，给 1.5 秒提示「没有改动，未写入」。这条能挡住「手滑按 Ctrl+S 就重写全文」。若实施，验收脚本要先制造一次改动再按 Ctrl+S，避免和第 05 轮「Ctrl+S 写回」断言冲突。

**难度** S–M（约 2–3 小时含回归）。**证据图**：`shots/round-06/ux-current-banners-stacked.png`。

---

## U2 用户看不出自己在编辑哪个文件

**证据**

- 窗口标题没有文件名：`index.html:11` 是 `<title>Sidelight</title>`；宿主 `form.Text = "Sidelight"`（`host/Program.cs:99`），只有打不开的错误分支才把文件名写进标题（`host/Program.cs:457`）。任务栏、Alt+Tab、窗口标题三处都认不出文件。
- 顶栏文档名是唯一的文件标识：`.doc-name` 12px、`var(--ink-faint)`（`styles.css:179-187`），无 `title` 属性（实测 `docNameTitle: null`），不显示目录。
- 状态栏只有字数和阅读时间，没有任何文件信息：`src/components/StatusBar.tsx:12-27`，实测 `.status-bar` 文本 `40 字 · 阅读约 1 分钟`。
- 左栏空态写死「现在打开的是示例 / 先打开一个文件夹，保存才会写回」（`src/components/FileTree.tsx:114-133`），它不知道当前是宿主文件。双击打开真实 `周报.md` 后，首屏大字仍是「现在打开的是示例」，下面还有「试用示例」按钮（`shots/round-06/ux-current-readonly-1440.png`）。这是整屏最响的一句话，也是错的。
- 能力状态被持久化：`readOnly` 从草稿读出（`src/App.tsx:276-287`），保存后清掉但草稿里可能残留。实测在**没有宿主**的普通浏览器里注入 `readOnly:true` 再 reload，照样出现「只读打开」横幅——界面把一个已经不存在的宿主能力当成当前事实。第 06 轮改成可写后，这个字段必须从宿主桥实时取，不能再从草稿恢复。

**改法（最小文案方案）**

| 位置 | 现在 | 建议 | 说明 |
| --- | --- | --- | --- |
| 窗口标题 | `Sidelight` | `周报.md — Sidelight` | 宿主 `form.Text`；前端同时设 `document.title`（浏览器标签用）。无文件时保持 `Sidelight` |
| 状态栏左 | `40 字 · 阅读约 1 分钟` | `保存到 周报.md` · `40 字 · 阅读约 1 分钟` | 复用 `.status-chip-quiet`，`title="Ctrl+S 保存到这个文件"`；只在宿主桥存在时插入 |
| 顶栏文档名 | `周报.md` | 保留，加 `title="保存会写回这个文件"` | 不改字号，不改颜色 |
| 打开时提示 | 无 | 6 秒 toast：`已打开 周报.md。保存会写回这个文件。` | 只在桥存在且是 argv 打开时出现；不常驻 |
| 左栏空态 | 「现在打开的是示例」 | 标题 `周报.md`，副标题 `这是单独打开的文件，保存会写回它。`，按钮只留「打开文件夹」「打开文件」 | 「试用示例」只在首屏 demo 态出现 |

- 状态栏是否显示完整路径：**不显示**。协议 v1 只注入 `fileName`，没有目录（`round-06/brief.md:20`），前端拿不到路径。建议 ADR-0006 写明「页面只认 basename，完整路径留在宿主日志」，不要为了路径改协议。窗口标题已经足够定位；需要路径时用户看资源管理器。
- 可写标记不要用横幅。只读横幅原本是「限制说明」，限制消失后横幅就该消失；常驻横幅每天占 41px，且信息与状态栏重复。

**难度** S（约 2 小时；宿主标题 + 状态栏 + 左栏空态各一处）。

---

## U3 写回没有状态机

**证据**

- 保存按钮没有「进行中」状态：`<button onClick={saveFile}>保存</button>`（`src/App.tsx:2092-2094`），无 `disabled`、无 `title`、无 `aria-keyshortcuts`（实测三项全为 `null`）。写回走 IPC 后有真实延迟（上限 10 秒，`round-06/brief.md:23`），这 10 秒里界面没有任何变化，用户会再按 Ctrl+S。
- 成功文案是 `已保存 ${name}`（`src/App.tsx:1243`）。对双击文件，它不回答用户最关心的问题：写回了哪里。状态栏和图里都没有答案。
- 失败文案复用普通保存：`保存失败：${reasonOf(error)}。改动还在，可以再试一次。`（`src/App.tsx:1299`），错误 toast 只有一个动作位（`Notice.action`，`src/App.tsx:173-179`），没有「重试」。
- 超时没有文案，协议也没约定超时后是否可能已经写入。前端 10 秒放弃时，宿主可能仍在写。
- 只读文档的 Ctrl+S 直接转另存为（`src/App.tsx:1321-1325`），但按钮仍写「保存」。用户点了「保存」，得到的是选择新位置的对话框。
- 重复保存没有保护：`saveFile` 不检查进行中状态，连按两次会发两条 `save` 请求。

**改法（文案表，可直接抄）**

| 状态 | 界面 | 文案 | 时长 / 动作 |
| --- | --- | --- | --- |
| 空闲（宿主文件） | 顶栏按钮 | `保存`，`title="保存（Ctrl+S）"`，`aria-keyshortcuts="Control+S"` | 常驻 |
| 写回中 | 按钮禁用，文字 `保存中…`，`aria-busy="true"` | — | 到 `save-result` 或 10 秒超时；期间忽略新的 Ctrl+S |
| 成功 | 底部 toast，`persist` | `已保存到 周报.md` | 动作「另存为…」；清 dirty；状态栏 chip 不变 |
| 失败 | 错误 toast，不自动消失 | `写回失败：<原因>。改动还在，可以再试一次。` | 动作「重试」；dirty 保持为真 |
| 超时 | 错误 toast，不自动消失 | `写回超时：宿主没有回应。改动还在，可以再试一次。` | 动作「重试」；dirty 保持为真 |
| 另存为成功（原为宿主文件） | 底部 toast，`persist` | `已另存为 副本.md。原文件 周报.md 未改动。` | 状态栏 chip 换成 `保存到 副本.md`；不再写回原文件 |
| 无宿主桥（浏览器 / 开发） | 不出现任何「写回」字样 | 保持现有另存为/下载文案 | 不要报「写回失败：宿主不存在」 |
| 宿主报告不可写 | 复用只读横幅样式 | `这个文件目前不能写回。保存会请你另选位置。` 按钮「另存为…」 | 只在 `writable:false` 时出现 |

- 失败原因要翻成人话。`error` 是宿主回的字符串，直接贴出去可能出现英文异常名；至少映射三类：占用/权限 → `文件正被其他程序占用`；路径不存在 → `原文件已被移动或删除`；其他 → `原因未知`。
- 「已保存」不要提前到请求发出时；`save-result ok:true` 之后才清 dirty 和提示（brief 已要求失败不清 dirty，这里补上「成功才清」）。
- 超时后的重试要允许，且文案不要说「没有保存」。宿主可能已经写完，重试写同样内容是幂等的。

**难度** M（约半天，含 saves 状态的 3 条验收：成功 / 失败 / 超时）。**模拟图**：`ux-proposed-01-writable-idle-1440.png`、`ux-proposed-02-saving-1440.png`、`ux-proposed-03-write-fail-1440.png`。

---

## U4 外部修改与文件占用：先分清，再决定做不做三选一

**证据**

- 宿主只在打开时读一次文件（`host/Program.cs:695` 附近的 `File.ReadAllText`，注入后不再 stat），协议只回 `{ok, bytes}` 或 `{ok:false, error}`（`round-06/brief.md:22`），没有 `mtime`、没有 `size`。前端无法知道文件在打开后被别的程序改过。
- 第 06 轮的直接风险不是「外部修改」而是「文件占用」：Typora/Word 之类占着文件时，原子写的替换会失败（Windows 共享冲突），用户会看到一句笼统的失败。这个概率比外部静默修改高。
- 三选一（覆盖 / 另存为 / 重载）需要三样东西：宿主的 mtime、宿主的「强制覆盖」参数、宿主的「重新读取」命令。前两样要改协议，第三样还要清撤销栈与批注重定位。本轮工期放不下。

**改法（分两段）**

1. 本轮：不做冲突检测，做「占用 / 路径失效」的失败分支（U3 的文案表已覆盖）。在 ADR-0006 写明：本轮为 last-write-wins，外部修改会被覆盖；遗留项进第 07 轮待办。
2. 第 07 轮：宿主开文件时记 `mtime`，写回前 `File.GetLastWriteTimeUtc` 比对；不一致回 `{ok:false, error:'stale', mtime}`。前端弹一个对话框，三选一：
   - 标题：`文件已被其他程序修改`
   - 正文：`周报.md 在你打开之后又改过。继续保存会覆盖那些改动。`
   - 按钮：`另存为…`（默认焦点，安全） / `覆盖保存` / `重新载入（放弃我的改动）`
   - Esc = 取消，不写盘，dirty 保持。
   - 「重新载入」要二次确认，因为它会丢掉当前编辑与撤销历史。
   - 若只做两个按钮，建议 `另存为…` + `覆盖保存`；「重新载入」单独放到文件菜单，别塞进冲突框。

**难度** 本轮 S（只做失败分类）；完整三选一 L（约 1.5 天，含协议、宿主、对话框、三条验收）。

---

## U5 文件 / 导出菜单与快捷键的一致性

**证据**

- 文件菜单只有四项：新建、另存为…、打开文件…、打开文件夹…（`src/components/FileMenu.tsx:10-15`），**没有保存**。保存只在顶栏按钮和 `Ctrl+S`（`src/App.tsx:1401-1407`、`2092`），快捷键一览里却有 `Ctrl+S 保存`（`src/components/ShortcutsDialog.tsx:17`）。Windows 用户先找「文件 → 保存」，找不到。
- 菜单标签被挤成竖排：`.menu` 只给 `min-width:136px`、按钮用 `space-between`、`span` 没有 `nowrap`（`styles.css:1002-1035`）。实测「打开文件夹…」的 `span` 只有 **22×80px**（一个字一行），整菜单 173px 宽，`Ctrl+Alt+Shift+O` 占 103px。1440 视口下就能复现（`shots/round-06/ux-current-file-menu.png`）。
- 导出菜单的「Markdown」（`src/App.tsx:2058-2066`）和「另存为…」都产出一个 `.md`，提示都是「已导出 周报.md」/「已保存 周报.md」。用户分不清哪个改原文件、哪个留副本。
- 「另存为」成功后原宿主路径要清掉（brief 已写），但界面没有一句话说明「原文件未改动」；toast 动作仍叫「另存为」（`src/App.tsx:1246`），与它实际行为（另存到新位置）一致，但和「已保存」并列时读起来像重复保存。

**改法**

1. 文件菜单改成五项并分组：`新建` ｜ `保存 Ctrl+S`、`另存为… Ctrl+Alt+S` ｜ `打开文件…`、`打开文件夹…`。分隔线用 `border-top:1px solid var(--line)`。顺序按 Windows 习惯把「打开」放前面也可，但「保存」必须在菜单里。
2. 修竖排：`.file-menu { min-width: 208px }`，`.file-menu button span, .file-menu button kbd { white-space: nowrap }`。同时给按钮一个 `title`（例如「另存为到新位置」）。
3. 导出菜单把「Markdown」改名 `Markdown 副本…`，toast `已导出副本 周报.md`；或直接从导出菜单移除（三处调用点，中等改动）。推荐改名，成本低，语义清楚。
4. 快捷键一览不加新键位。只把「Ctrl+S 保存」改成 `Ctrl+S 保存（写回当前文件）`，并在底部说明加一句：`双击打开的 .md：Ctrl+S 写回原文件；Ctrl+Alt+S 另存到新位置，原文件不动。` `Ctrl+Shift+S` 是浏览器保留键，不要再试（第 05 轮已确认）。
5. 顶栏「保存」补 `title="保存（Ctrl+S）"` 与 `aria-keyshortcuts="Control+S"`；写回中禁用（U3）。

**难度** S（约 2 小时，含菜单验收更新）。

---

## 关联决策 memo：安装器要不要加「把 .md 关联到 Sidelight」

**结论：本轮不做。下一轮若做，只做「加入打开方式列表」，不做「设为默认」，默认不勾。**

**现状证据**

- 安装脚本没有关联代码：`packaging/installer.ps1` 共 80 行，`grep` 不到 `Classes`、`OpenWith`、`.md`。
- 本机注册表实测（只读）：`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice` 不存在；`HKCU\Software\Classes\.md` 存在但默认值为空；`OpenWithProgids` 里只有 `VSCode.md`。推断：这台机器上 `.md` 没有默认程序（双击应弹「打开方式」），VS Code 只在列表里。

**Windows 机制（决定文案与风险）**

- 默认程序由 `UserChoice` 决定，它带一个 Windows 校验的哈希，微软没有公开写它的方法。安装器直接写 `HKCU\Software\Classes\.md` 的默认值，只在**没有** `UserChoice` 的机器上生效；已有默认程序时写入会被忽略，用户看不到任何变化。
- 所以「把 .md 关联到 Sidelight」这个复选框在多数已装 Typora/VS Code 的机器上是**假承诺**：勾了也不生效。这比不提供更糟。
- `OpenWithProgids` 是另一件事：它只把 ProgID 加进「打开方式」列表，不影响默认程序，UserChoice 存在时也有效。这是唯一可以安全、可逆地自动化的部分。

**若做，方案（第 07 轮）**

- 安装器加一个可选复选框，默认不勾，文案：`把 Sidelight 加入 .md 文件的「打开方式」列表（不会改变当前默认程序）`。不要用「关联」「默认」两个词。
- 写入：`HKCU\Software\Classes\Sidelight.md`（含 `shell\open\command` 指向 `%LOCALAPPDATA%\Programs\Sidelight\Sidelight.exe "%1"`）+ `HKCU\Software\Classes\.md\OpenWithProgids` 下的 `Sidelight.md`（`REG_NONE` 空值）。全部 per-user，不需要管理员。
- 卸载：删 ProgID 键与 `OpenWithProgids` 值；**绝不删 UserChoice**，也不删 `.md` 的默认值（我们没写）。
- 不勾复选框时：一个字节都不写，卸载也就没有残留。
- 验收加三条：装后键存在；已有默认程序时「打开方式」里能看到 Sidelight 且默认未变；卸载后两个键消失、`UserChoice` 未被触碰。
- 风险：SmartScreen/杀软对写 `Classes` 的安装器更敏感；企业策略可能锁定默认程序；用户卸载后「打开方式」里残留死条目（Windows 通常会自动清理，不保证）。
- 与 Windows「打开方式」的关系：这套方案只是「加入列表」，用户仍要在「打开方式 → 始终使用」或 Windows 设置里确认默认。这是微软支持的路径，也是唯一不会静默失败的路径。

**难度** M（约半天安装器 + 验收），风险主要在发布验证，不在代码。

---

## 优化机会（最多 3 条）

**O1 · `readOnly` 一个布尔承担了「文档来源」。** 它从草稿恢复（`App.tsx:276-287`），在 `loadIntoEditor` 与 `finishSaved` 两处清零（`1092`、`1241`），又被保存分支当能力判断（`1322`），横幅直接读它（`2336`）。第 06 轮要加「宿主文件 + 可写」后，状态至少有 demo / 工作区文件 / 宿主文件 / 无落点四种，布尔表达不了，还会把过期能力带过重启。建议改成 `docOrigin: 'demo' | 'workspace' | 'host' | 'unsaved'` + `hostFileName`，由 `window.__sidelightHost` 实时派生，草稿只存正文与名字。改动集中在一个 state 与四个读取点。

**O2 · 写盘前的换行处理写了两遍。** `commitSave`（`App.tsx:1268-1269`）与 `saveAsCopy`（`1343-1344`）各自做 `replace(/\r\n/g,'\n')` 再按 `eolRef` 还原；接 IPC 后会有第三遍。抽 `encodeForWrite(text): string`，三处共用，顺带保证 BOM 与换行的处理只有一处。

**O3 · 文件动作散在四处，加一个「保存」要改四个文件。** 菜单项在 `FileMenu.tsx:10-15`，键位字符串在 `App.tsx:1401-1407`，说明在 `ShortcutsDialog.tsx:13-20`，按钮在 `App.tsx:2092`。建议抽 `FILE_ACTIONS`（label / keys / ariaKeyshortcuts / run），文件菜单与快捷键一览都从它渲染；键盘处理仍集中，但键位只写一遍。第 06 轮加「保存」正好是第一次收益。

---

## 未验证 / 边界

- 宿主 IPC 写回本轮未实现，所有写回后的界面是 DOM 注入模拟（截图文件名带 `proposed`），不能当实现证据。
- 真实双击 `.md` 未测：本机 `.md` 没有默认程序，也没有 Sidelight ProgID；argv 注入用 localStorage 等价模拟。
- 注册表只读查询，未验证「已有默认程序时写 Classes 被忽略」的现场行为；该结论来自 Windows `UserChoice` 机制，实施前应由 releaser 在测试机复核。
- `showSaveFilePicker` 在 CDP 浏览器里存在，按 Ctrl+S 会走系统保存对话框；无头环境下返回取消，得到「已取消保存」。所以浏览器里的只读 Ctrl+S 截图不代表宿主行为。
- 未测中文输入法、屏幕阅读器、125% 缩放下的状态栏 chip。
- 深色主题下只读横幅第 05 轮已测（对比 12.51），本轮的 chip 沿用 `.status-chip-quiet`，未单独测深色。

## 截图清单（`shots/round-06/`，本轮新增）

`ux-current-readonly-1440.png`、`ux-current-readonly-880.png`、`ux-current-banner-closeup.png`、`ux-current-topbar-closeup.png`、`ux-current-file-menu.png`、`ux-current-ctrl-s-readonly.png`、`ux-current-banners-stacked.png`、`ux-proposed-01-writable-idle-1440.png`、`ux-proposed-02-saving-1440.png`、`ux-proposed-03-write-fail-1440.png`。

（`browser-readonly-banner.png` 不是本轮 ux 产出，未引用。）

## 复现命令

```bash
node .tmp/r6-ux/probe.mjs    # 只读横幅、文件菜单、Ctrl+S、880 窄窗、滚动态风险横幅
node .tmp/r6-ux/probe2.mjs   # 菜单竖排测量 + 三种写回状态的 DOM 模拟截图
```
