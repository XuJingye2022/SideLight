# 第 40 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=40，轮前 `startSha=504dedd22b1133c7629bc1a437ca24b8a8889322`（`docs: round-39 看板记录提交哈希`）；收工时 `git rev-parse HEAD` 仍是 `504dedd`。
- 参数：nn=40，报告目录 `docs/iteration/round-40`，CDP 端口 9222。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP 9222 的 headless Edge（未启动 Edge、未 kill msedge）；每段 E2E 前 `node .tmp/reset.mjs 9222`。
- 只读：`git status --porcelain` 只有未跟踪的 `docs/iteration/round-40/` 与 `shots/round-40/`，产品代码 0 改动。
- 本轮新增可执行条目：**2 条（2 条 P2）**。8 条路径全部真跑，控制台 0 error、0 请求失败（见 `.tmp/e2e-r40-bug-d.log` 的 `## d23-errors`）。

## 结论摘要

1. **改过名的文档切换后，窗口/标签标题仍显示旧文件名**：`document.title` 只在「改当前文件的名字」和「宿主另存为」两条路上写，其它任何打开/切换/删除后的当前文档都不写；于是标题会永久停在前一次改名的名字上（实测打开 `乙.md` 时标题是 `键改.md — Sidelight`）。
2. **两个连续空段落会以字面 `&nbsp;` 写进 `.md`**（位置在文档开头，正文中间同理）：第 22 轮修的只是**文末**空段落（`serializeDocument.ts:34` 只裁尾部），开头/中间的空段落仍照原样序列化成 `&nbsp;`。不丢数据，但污染文件并让其它 Markdown 渲染器多出一行 `&nbsp;`。

---

## 1（P2，标题不跟随当前文档）改过名的文档再切到别篇，标题仍是旧名

**复现步骤**

1. `node .tmp/reset.mjs 9222`，用 `.tmp/r30-fsa.mjs` 的假工作区种入 `键.md`（`# 键盘篇…`）、`乙.md`（`# 乙…`）。
2. 「文件 ▾ → 打开文件夹…」→ 点 `键.md`。
3. 点行内 `⋯ 的操作` → 「重命名」→ 改名 `键改.md` → Enter。
4. 点文件树里的 `乙.md`。
5. 看 `document.title`（浏览器标签 / 宿主窗口标题的来源）。

**证据**

- `.tmp/e2e-r40-bug-d.log`
  - `## d21-renamed-title`：`{"name":"键改.md",…,"docTitle":"键改.md — Sidelight"}`（改名后标题正确）
  - `## d22-switch-title`：`{"name":"乙.md",…,"docTitle":"键改.md — Sidelight"}` ← **当前文档是乙.md，标题还是键改.md**
- `.tmp/e2e-r40-bug-a.log` 独立第二次复现：`## a10-renamed-other` 之后 `## a11-open-renamed` 是 `{"name":"丙.md",…,"docTitle":"日记.md — Sidelight"}`；`## a16-deleted`、`## a20-deleted-active` 同样停在旧名。
- 反向对照：没改过名时标题停在 `Sidelight`（`## d12-source-toggle`、`## d17-100k-open` 都是 `"Sidelight"`）——标题从来不跟随「当前打开的是哪篇」，唯一会写标题的是改名。
- 代码：`src/App.tsx:719-722` 只有 `hostDoc` 变化时写标题；`src/App.tsx:2333` 改名成功时无条件写 `${newName} — Sidelight`；`src/App.tsx:2614` 只在「另存为且原来是宿主文档」分支里写；`src/App.tsx:1084` 只在宿主 payload 载入时写。没有任何 effect 用 `docName` 同步标题。
- 截图：`shots/round-40/p2-tree.png`（改名/删除后的树与当前行；标题未入图，标题证据用上面的日志 JSON）。

**期望 vs 实际**

- 期望：标题永远描述当前文档（打开 `乙.md` 就显示 `乙.md — Sidelight`）；或者浏览器/工作区模式下统一显示 `Sidelight`，不在两条路径上各写一次。
- 实际：改名过一次后，之后打开任何文档标题都停在改名前那篇的新名字上；宿主窗口标题是否也这样未验证（`host/Program.cs` 里没有 `document.title → Form.Text` 的同步代码，本机也无法在宿主里实测）。

**修复建议**

- 加一个 effect：`document.title = docName ? `${docName} — Sidelight` : 'Sidelight'`，只在「工作区/浏览器文档」成立；宿主文档保持现有 hostDoc 逻辑（两者用一个来源，别在 6 个地方各写一次）。
- 顺带删掉 `src/App.tsx:2512-2513` 的两行完全重复的 `show(...)`（无可见后果的死代码）。

**成本**：S（一处 effect + 去掉重复写点）。

## 2（P2，字节污染）开头/正文中间的两个连续空段落被写成字面 `&nbsp;`

**复现步骤**

1. `node .tmp/reset.mjs 9222`，假工作区种入 `甲.md`：`# 标题\n\n正文。\n`。
2. 打开文件夹 → 点 `甲.md`。
3. 点正文 → `Ctrl+Home` → 连按两次 `Enter`（DOM 里出现两个空段落）。
4. `Ctrl+S`，读回假 FS 字节。

**证据**

- `.tmp/e2e-r40-bug-h.mjs` 的输出（`.tmp/e2e-r40-bug-h.log`）：
  - `## h0-dom`：`{"dirty":true,"html":"<p><br class=\"ProseMirror-trailingBreak\"></p><p><br class=\"ProseMirror-trailingBreak\"></p><h1>标题</h1><p>正文。</p>"}`（两个空段落）
  - `## h1-bytes`：`"\n\n&nbsp;\n\n# 标题\n\n正文。\n"` ← 文件里多出一行字面 `&nbsp;`，文件开头还多两个换行
  - `## h2-source`：进源码后同一串字节可见（截图见下）
- 对照：只按**一次** Enter 时不会写 `&nbsp;`（`.tmp/e2e-r40-bug-g.log` 的 `## g1-bytes` 是 `"\n\n# 开头新段。标题\n\n正文。\n"`）——所以触发条件是「≥2 个连续空段落」，不是任何编辑。
- 代码根因：`src/lib/serializeDocument.ts:34` 只裁**字符串末尾**的 `&nbsp;` 行：
  `output.replace(/\r\n/g, '\n').replace(/(?:\n[ \t]*(?:&nbsp;[ \t]*)?)+$/, '')`
  中间/开头的空段落来自序列化器对空段落的输出（第 21 轮 C3 / 第 22 轮 T1 修的是尾部，未覆盖位置）。
- 截图：`shots/round-40/p1-empty-paragraph.png`（保存后源码框里能看到字面 `&nbsp;`）。

**期望 vs 实际**

- 期望：空段落序列化成多一个空行（或干脆不留），不在 `.md` 里写 HTML 实体；同族问题第 21/22 轮已经按「不写 `&nbsp;`」修过尾部。
- 实际：用户只想在标题前空一行时，文件里多一行 `&nbsp;`；Typora/Obsidian 打开会看到一行字面的 `&nbsp;`。数据不丢，但字节被改，且现有尾部裁剪逻辑拦不住。

**修复建议**

- 序列化前统一剥掉**任意位置**的空段落（或者把空段落序列化成额外空行），不只在字符串尾部裁剪；补单测覆盖「开头 1/2 个空段落」「正文中间 1/2 个空段落」「尾部」四组，断言输出不含 `&nbsp;` 且逐字节稳定。
- 复测点在 `.tmp/e2e-r40-bug-h.mjs`：种 `# 标题\n\n正文。\n` → `Ctrl+Home` → Enter×2 → `Ctrl+S` → 断言字节仍是 `# 标题\n\n正文。\n`。

**成本**：S–M（序列化层一处 + 单测）。

---

## 路径实测结果（本轮真跑，截图在 `shots/round-40/`）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 新建 → 输入 → 保存 → 重开 | 树头「＋ 新建」→ 打正文 → `Ctrl+S` → 读假 FS → 切走再切回 | 通过。`已新建 未命名.md`、落盘 7 字、`已保存 未命名.md`；改名成 `日记.md` 后 `Ctrl+S` 写进新名、旧键为 `null`；带未保存改动改名后保存，`乙改.md` 收到全文、`乙.md` 为 `null`、`dirty:false`（`.tmp/e2e-r40-bug-e.log` `## e6-saved`） | `.tmp/e2e-r40-bug-a.log` 的 `## a5-new-file`/`## a6-new-saved`/`## a9-renamed-saved`；`.tmp/e2e-r40-bug-e.log` 的 `## e4`–`## e7` |
| 2 文件树全操作 | 展开/折叠/空文件夹提示；新建；重命名当前文件/非当前文件；非法扩展名与同名冲突；删除到 trash；撤销；无脏删除后恢复；外部新增后刷新 | 全部按预期。冲突提示「已有同名文件，没有覆盖它。」、非法名「保留 .md 结尾…」；删除落到 `.sidelight/trash/20261117-115537-223q2p-甲.md`、撤销后文件回来；刷新 `已刷新：新增 1 个，消失 0 个`。**发现第 1 条**（标题不跟随） | `.tmp/e2e-r40-bug-a.log` 全部 `## a*`；`shots/round-40/p2-tree.png`、`p2-rename-dirty.png` |
| 3 键盘 | `Ctrl+1–6/0`（光标块 tag）、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc` 后打字、表格 `Tab`/`Ctrl+Enter`、`Tab` 焦点环 | 通过。标题 `H1→H6→P`；链接/公式输入框拿到焦点；快速打开 4 个 option 且焦点在输入框；`Esc` 后焦点 `ProseMirror-focused`、打字进正文；表格 3→4 行、`甲` 落在下一格；焦点环 `solid 2px rgb(43, 109, 100)` | `.tmp/e2e-r40-bug-d.log` 的 `## d0`–`## d8` |
| 4 样张往返（frontmatter/表格/Mermaid/行内 HTML/callout/公式/脚注） | 打开 13 行样张 → 进源码 → 改动 → 保存；另测正文中间脚注定义的保存路径 | 通过（等价改写以外无丢失）：frontmatter、callout、行内 HTML、公式、Mermaid 原文保留；表格列宽被空格补齐（等价改写、不拦）；中间脚注定义在富文本里会被吸收，`Ctrl+S` 弹「保存后这些写法会被改写 / 脚注 [^1] 的定义在保存后会消失」并拦下；点「在源码模式看原文」后源码框显示完整原文，源码态保存字节逐字节一致 | `.tmp/e2e-r40-bug-b.log` 的 `## b0`–`## b4`；`.tmp/e2e-r40-bug-c.log` 的 `## c0`–`## c1`；`.tmp/e2e-r40-bug-f.log` 的 `## f1`–`## f2`；`shots/round-40/p4-sample-rich.png`、`p4-footnote-save.png`、`p4-source-original.png` |
| 5 源码/预览/深色/窄窗 | `Ctrl+/` 往返；预览 → `Esc`；设置里点「深色」；1440×900、1024×700 量溢出 | 通过。源码往返都回 `edit` 且焦点回正文；预览 `mode:preview`、`Esc` 回 `edit` + 焦点 `.ProseMirror`；深色 `data-theme="dark"`、`rgb(21, 23, 26)`、取消后还原 `system`；两种视口 `scrollWidth===innerWidth`、越界元素 0 | `.tmp/e2e-r40-bug-d.log` 的 `## d12`–`## d16`；`.tmp/e2e-r40-bug-e.log` 的 `## e1`–`## e2`；`shots/round-40/p5-dark.png`、`p5-narrow.png` |
| 6 控制台 0 error + 错误路径 | 全程挂 `console`/`pageerror`/`requestfailed`；点 6 MiB 文件 | 通过。四份日志都是 `errors: []`、`failed: []`；6 MiB 被拒并说清「仍在「大100.md」」、当前文档不变 | 各 `.log` 末行；`shots/round-40/p6-bigfile.png` |
| 7 大文档（100 KB） | 打开 `大100.md`（900 段）、`Ctrl+End`、连打 5 个字、`Ctrl+S` | 通过。打开 **237 ms**、逐键 **14/18/16/18/17 ms**、保存后 44,900 B 且含末字（保存耗时被脚本自己的 `waitForTimeout` 吞掉，不引用） | `.tmp/e2e-r40-bug-d.log` 的 `## d17`–`## d19` |
| 8 选区/字数明细 | `Ctrl+A` 看状态栏 → 点字数 → 看面板 → `Esc` | 通过。`选区 15 字` chip；面板 `role=dialog`、`aria-label=字数明细`、焦点在面板内、`Esc` 关闭后焦点回 `.stats-trigger`；面板显示中日韩字 14 / 拉丁词 1 / 合计 15 / 字符 17 / 段 2 / 选区 15 字 | `.tmp/e2e-r40-bug-d.log` 的 `## d9`–`## d11`；`shots/round-40/p8-stats.png` |

## note（重复项、按设计、脚本失效，不计入 actionable）

- **重复（前轮已列/按设计，本轮只复核）**：
  - 正文中间脚注定义在富文本里被吸收、保存被拦：第 34 轮已经按 P0 加了拦截，本轮确认拦截文案、影响条数与「在源码模式看原文」出口都正常（`## f0`–`## f2`）。不属于新缺陷。
  - 表格序列化补空格对齐（`| 1       | 2   |`）：等价改写，不拦保存，前轮已记。
  - 文末 ≥3 空行的 `&nbsp;` 累积：第 22 轮已修（本轮 `serializeDocument.ts:34` 仍在），第 2 条是同族的**非尾部**变体，证据与位置都不同，按新条目计。
  - 标题停顿：`src/App.tsx:2512-2513` 有两行完全重复的 `show(已新建 …)`，`setNotice` 幂等，用户看不到，只记在这里。
- **脚本失效（不是产品缺陷，供下一轮复用）**：
  - 点 `.ProseMirror` 后 `Ctrl+End` 在这个 headless 会话里不保证把光标送到文末（实测打进 H1 开头），要断言「文末追加」得用别的方式落光标；这也是第 2 条的发现路径。
  - 保存风险对话框打开时，`dialogOpen` 分支会吞掉 `Ctrl+/` 与 `Esc`（`src/App.tsx:3588-3592`），脚本里必须先点对话框按钮再切模式。
  - `.save-dialog button:has-text("仍然保存")` 才是保存对话框的确认键；用 `button:has-text("保存")` 会点到顶栏别的保存控件（本轮 `## c3` 即此故）。
  - 「设置」按钮没有 `aria-label`，要用文本 `设置` 找；主题按钮是 `role=radio` 的「浅色/深色/跟随系统」。
  - 表格插入是「插入 ▾ → 表格」，没有独立的 `aria-label` 含「表格」的按钮。

## UNVERIFIED

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 宿主窗口标题是否也停在旧名 | CDP 是浏览器；`host/Program.cs` 里没找到 `document.title` 回写窗口标题的代码 | 宿主 `host-smoke` 里加一条：改名后切文档，读窗口标题 |
| `&nbsp;` 段落重新打开后的显示与再次保存 | 本轮只做了一次保存与读回 | 用 `甲.md` 的 `&nbsp;` 字节重新打开，看富文本里是否出现字面 `&nbsp;`，再保存一次看是否稳定 |
| 真实指针落点下的文末追加 | headless 下 `Ctrl+End` 不可靠 | 真机用鼠标点文末空白再打字 |
| 重开恢复 / 最近文件 / 草稿 / 批注与选区联动 | 假 FSA 句柄有方法，写不进 IndexedDB；浏览器态没有 `/__annotations`、`/__draft` 宿主接口 | 宿主 `host-smoke` + `scripts/session-acceptance.mjs` |
| 真实 IME、触屏、150%/200% 缩放 | 本机只有模拟键盘鼠标 | 真机 |
