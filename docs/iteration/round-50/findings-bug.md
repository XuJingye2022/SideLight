# 第 50 轮 5 路 缺陷猎人报告（finder-bug）

- 轮次：round 50　轮前 startSha：`6ae9be39ee5007da2ebcdffd636da21675dc6694`（`git rev-parse HEAD` 同值；本角色只读，未改产品代码）
- 环境：dev server `http://localhost:5175` 已在跑（未起、未重启）；CDP 9222（未启动 Edge、未 kill msedge）；每个脚本前 `node .tmp/reset.mjs 9222`；假 FSA 工作区复用 `.tmp/r30-fsa.mjs`。未 push，未动 `release/`。
- 结论：**2 条本轮新发现可执行（P1 × 1、P2 × 1）**。真的跑了 15 条用户路径；8 套自写脚本 `.tmp/e2e-r50-bug-{a,b,c,d,e,f,g,h}.mjs` 的 `## z-errors` 全空（0 console error、0 pageerror、无 favicon 例外）。
- 截图：`shots/round-50/` 里本角色 17 张（`bug-*.png`），关键 5 张文末列出。

---

## F1（P1）预览面板与 HTML 导出丢掉「脚注定义的缩进续行」：原文有，预览/导出里没有

**复现步骤**（脚本 `.tmp/e2e-r50-bug-h.mjs`，日志 `.tmp/r50-bug-h.log`；导出那一步用 `.tmp/e2e-r50-bug-g.mjs`，日志 `.tmp/r50-bug-g.log`）
1. 假工作区里放 `h-cont.md`，内容是 `正文[^1]\n\n[^1]: 第一行定义\n    续行接着写\n`（脚注续行是仓库从第 23 轮起明确支持的写法，见 `docs/iteration/round-23` 与第 49 轮 `g6-footnote` 的 `same:true`）。
2. 点开它，`Ctrl+/` 进源码框：`textarea.value` 是 `正文[^1]\n\n[^1]: 第一行定义\n    续行接着写\n` —— **原文在**。
3. `Ctrl+/` 回编辑，按 `Ctrl+Shift+P` 进只读预览：`.footnotes` 有（`hasSection:true`），`<li>` 只有 **`第一行定义`** 一条，`续行接着写` **不在预览里**（截图 `bug-h-h-cont-preview.png`）。
4. 同在编辑视图点 `导出 ▾` → `HTML`：导出文件里 `<section class="footnotes">` 存在、`<li>第一行定义</li>`，字符串 `续行接着写` **0 命中**（`bug-g-cont.md` 一行：`items:["第一行定义"]`、`hasContinuation:false`、文件 2,847 B；截图 `bug-g-g-cont.png`）。
5. 对照 `h-two.md`（两条单行定义）预览是 `["定义甲","定义乙"]`，说明不是脚注整体不渲染，只有续行被吃掉。

**期望 vs 实际**
- 期望：预览与 HTML 导出的「注释」列表至少显示定义全文（`第一行定义` + 续行 `续行接着写`），与源码框、保存字节一致。
- 实际：预览与导出都只留第一行。这是**可见的丢字**：只读预览是核心视图，HTML 导出是交给别人的成品；原文件不受影响，但用户看到的/导出的脚注比原文少一行。

**根因**（`src/lib/export.ts:33-44`）
```ts
export function renderFootnotes(footnotes: string): string {
  const items = footnotes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('[^'))
    .map((line) => line.replace(/^\[\^[^\]]+\]:\s*/, ''))
    .filter((line) => line.length > 0)
```
只收「以 `[^` 开头的行」，缩进续行（`    续行接着写`，trim 后不以 `[^` 开头）被 `filter` 直接丢掉；`renderFootnotes` 同时被 `PreviewPane.tsx:6,62`（预览面板）与 `export.ts:187`（HTML 导出）用，所以两处一起丢。单测 `src/lib/export.test.ts:75` 只覆盖单行定义（`[^1]: 第一条\n[^note]: 带 <标签> 的`），没有续行用例，所以一直没红。

**修复建议**
1. `renderFootnotes` 改成「先把脚注块切成若干条定义」：遇 `^\[\^([^\]]+)\]:\s*(.*)$` 开一条，遇 `/^(?: {4,}|\t)\S/` 追加到当前条（用换行 `<br>` 或空格连接，二选一并写进单测），其余行结束当前条；与 `src/lib/risk.ts:142-150` 已有的「定义 + 续行」扫描口径保持一致（那份已经正确）。
2. `export.test.ts` 补三条：单行、续行（`[^1]: 第一行\n    续行`）、多条混合；断言续行文字出现在输出里。
3. E2E 钉一条：种子 `正文[^1]\n\n[^1]: 第一行定义\n    续行接着写\n` → 预览 `.footnotes li` 文本同时含两段 → 导出 HTML 同样含 `续行接着写`。

**影响面**：所有用缩进续行写脚注的文档（长脚注、带引用出处的注释常见这种写法）。保存字节不受影响（第 49 轮 `g6-footnote` `same:true`），所以只判 P1 不判 P0。

---

## F2（P2）导出 Markdown 不复用「保存前差异门」：同一篇文档 `Ctrl+S` 弹确认，导出 `.md` 却静默写出改写版

**复现步骤**（脚本 `.tmp/e2e-r50-bug-c.mjs`，日志 `.tmp/r50-bug-c.log`）
1. 假工作区放 `fn-mid.md`：`正文[^1]\n\n[^1]: 定义\n\n后文还在。\n`（脚注定义后面还有正文，所以**不在文末**；`src/lib/footnotes.ts` 只摘文末块，`risk.ts:48` 的 `REF_DEFINITION` 又排除 `[^…]`，于是编辑视图把它当**引用式链接定义**解析）。
2. 点开：编辑视图显示 `正文^1`，链接是 `^1 → 定义`；载入横幅写「这篇载入时就有会被改写的结构（1 类）：脚注 [^1] 的定义在保存后会消失（正文还在引用它）」（截图 `bug-c1-fn-mid-opened.png`）。
3. 按 `Ctrl+S`：弹出 `保存前确认` 对话框，列出同一条损失，按钮「取消 / 仍然保存」；**取消后盘上字节没动**（截图 `bug-c1-fn-mid-savegate.png`）。这条门禁是对的。
4. 同一个编辑视图点 `导出 ▾` → `Markdown`：**没有任何对话框或提示**，toast 直接「已导出 fn-mid.md」，拿到的 Blob 是 `正文[^1](定义)\n\n后文还在。\n`（36 B）——`[^1]: 定义` 这一行**消失**，被内联成 `[^1](定义)`（截图 `bug-c1-fn-mid-export.png`）。
5. 对照 `fn-end.md`（定义在文末）：`Ctrl+S` 不弹框、走正常保存路径。

**期望 vs 实际**
- 期望：导出 Markdown 与保存走同一套差异判定——至少给一次可见提示（「导出会改写脚注定义」），而不是把作者写的一行静默换成另一种语法。
- 实际：保存被拦（对），导出静默改写（不对）。用户会以为导出的 `.md` 就是文档原文的副本。

**根因**
- 保存门禁在 `src/App.tsx:2946-2952`（`requestSave`：`activeLosses(originalText, normalized, baselineLossesRef.current)` 非空就 `setPendingConfirm`）。
- 导出分支在 `src/App.tsx:4096-4100`：`if (kind === 'markdown') { saveBlob(name, currentMarkdown(), ...) }` —— 直接写 Blob，**不经过** `activeLosses`，也没有任何提示。`src/App.tsx:2924` 的注释自称「四条保存路径的唯一入口」，导出是第五条、没接进来。

**修复建议**
1. `exportAs('markdown')` 写盘前复用同一判据：`const losses = originalText !== null ? activeLosses(originalText, prepareSave().normalized, baselineLossesRef.current) : []`；非空时给 `setNotice({ text: '导出会改写：…（详见保存前确认）', kind: 'info' })`，或干脆把 `SaveDialog` 复用一次（新增 `target: 'export'`）。
2. 单测不需要新纯函数（`activeLosses` 已有覆盖）；E2E 钉一条：种子 `fn-mid.md` → 导出 Markdown → 要么出现提示、要么导出前弹确认；负例（`fn-end.md`）不弹。
3. 顺手把 `App.tsx:4096-4100` 的注释与 `:2924` 的「唯一入口」说法对齐。

---

## 15 条路径的实测与判定

| # | 路径 | 结论 | 证据 |
| --- | --- | --- | --- |
| 1 | `Ctrl+P` 快速打开：列全部、过滤、箭头、`Enter` 真打开、空结果、`Esc` | 通过 | `.tmp/r50-bug-e.log` `## e1-quickopen-open`：`filtered` 1 条选中、`Enter` 后 `name:"q-beta.md"`、`inEditor:true`、面板已关；`.tmp/r50-bug-a.log` `## a1-quickopen-empty`：空查询给「没有匹配的文件」、`Esc` 后焦点 `ProseMirror`。截图 `bug-e1-quickopen-opened.png` |
| 2 | 点正文链接就地编辑 + `Ctrl+K` 新建 + `Esc` 取消 | 通过 | `## a2-link`：点「旧链」弹 `.link-editor`，两个输入框预填；改地址 `Enter` → 链接 `href=https://new.example`、面板关闭、`dirty:true`；`Ctrl+K` 在空选区弹出并聚焦地址框。截图 `bug-a2-link-editor.png` |
| 3 | `Ctrl+M` 行内公式 → 输入 → 保存 | 通过 | `## a3-math`：`.katex` + `data-type="inline-math" data-latex="x^2"`、`Ctrl+S` 后 `dirty:false`、toast「已保存 q-beta.md」 |
| 4 | 表格工具条边界：下插入 ×3、删行 ×4、删到只剩表头 | 通过（无异常） | `## a4-table`：2 行 → 5 行（10 格）→ 删 4 次剩 1 行表头且表格仍在、`.table-bar` 7 个按钮、0 error。截图 `bug-a4-table-deleted.png` |
| 5 | 大纲跳转（41 条标题） | 通过 | `## a5-outline`：点「小节30」后 `scrollTop 4369→3626`、目标标题 `top 83.5`、`is-active=小节30` |
| 6 | 设置：主题预览/取消还原、字号越界、落盘 | 通过 | `## a6-settings`：深色预览 `data-theme:dark`、取消回 `system`；字号填 200 → 实际 26 px、`localStorage` `fontSize:26`（夹在 MAX_FONT_SIZE）；恢复 17。截图 `bug-a6-settings-dark.png`、`bug-a6-settings-font200.png` |
| 7 | 导出 HTML / Markdown / TXT（截获 Blob 内容） | **F2**（Markdown 分支）+ 其余通过 | `## b1-export`：菜单 4 项、HTML 3,680 B（KaTeX MathML / table / 脚注 section）、TXT 90 B、toast 正确；`## g-*` 见 F1 |
| 8 | 文件树：新建文件夹、刷新、行菜单、删除 → 回收站 → 撤销、重命名同名冲突 | 通过（同名冲突提示完整可见） | `.tmp/r50-bug-d.log` `## d1-row-menu`：菜单 `["重命名","删除（移到回收站）"]`；删除确认框文案含 `.sidelight/trash/`；删除后树少一条、toast「已移到回收站」、点「撤销」回「已恢复 t-a.md」且盘上 `A 文。\n` 与种子逐字节相同；`.tmp/r50-bug-f.log`：同名冲突 `.tree-rename-error` 文本「已有同名文件，没有覆盖它。」143 px 宽、`scrollWidth===clientWidth`（未截断），源文件仍在。截图 `bug-d1-row-menu.png`、`bug-d1-delete-dialog.png`、`bug-f1-rename-conflict.png` |
| 9 | 窄窗 1024×700：设置对话框可达性、表格条、横向溢出 | 通过 | `## b3-narrow`：设置 `scrollHeight 936 / clientHeight 658 / overflowY auto`，保存按钮 631–659 在视口内、可点；表格条 1,024 px 宽 7 按钮；`pageOverflow:0`、`docOverflow:0`。截图 `bug-b3-narrow-settings.png`、`bug-b3-narrow-table.png` |
| 10 | 任务列表勾选 → `Ctrl+Z` → 保存；粘贴 HTML | 通过 | `## b4-task-paste`：勾选 `[true,true]` → 撤销回 `[false,true]`、`dirty:false`；粘贴 `<b>粗贴</b>` 后 `.innerText` 含「粗贴」、`strong:1` |
| 11 | 公式/脚注/frontmatter/脚注续行 的导出 | **F1**（续行） | `.tmp/r50-bug-g.log`：`g-fm` frontmatter `<pre class="frontmatter">` 内含两行、`g-plain` 正常；`g-cont` 续行 0 命中 |
| 12 | 100 KB 级文档（本机构造 53,790 B / 900 段）：载入、逐键、保存 | 通过（无卡死、无丢字） | `## d2-big`：总载入 2,665 ms（含脚本 1,300 ms 固定等待）、`sl-parse-done - sl-load-start = 196 ms`；逐键 10 字 **230 ms** vs 1 KB 文档 **173 ms**（≈ +6 ms/键）；`Ctrl+S` 后盘上 53,800 B、`/甲乙丙丁戊己庚辛壬癸/` 命中、`dirty:false` |
| 13 | 无句柄保存（刷新后没有工作区） | 通过 | `.tmp/r50-bug-e.log` `## e3-nohandle-save`：输入「另存为探针。」→ `Ctrl+S` → `showSaveFilePicker` stub 收到 `另存为.md`、盘上 `另存为探针。`、toast「已保存 另存为.md」 |
| 14 | 脚注定义不在文末（后面还有正文） | 记 note（门禁是对的） | `## c1-fn-mid`：正文被解析成引用式链接 `^1 → 定义`；载入横幅预告损失；`Ctrl+S` 弹「保存前确认」且取消不写盘。`renderFootnotes` 与 `risk.ts` 口径不一致是 CommonMark 语义的结果，不作为缺陷 |
| 15 | 预览面板脚注续行（与 F1 同一条链） | **F1** | `## h-h-cont.md`：源码框有两行、预览 `.footnotes li` 只有 `第一行定义`、`continuationInPreview:false`。截图 `bug-h-h-cont-preview.png` |

控制台：8 套脚本（a/b/c/d/e/f/g/h）的 `## z-errors` 全为 `{"errors":[]}`。

---

## note（重复项、按设计、脚本注意，不计入 actionable）

1. 归一化改写一族（`* `→`- `、`***`→`---`、`_斜体_`→`*斜体*`、`1)`→`1.`、`~~~`→``` ```、`# 标题 #`→`# 标题`、setext、4 空格缩进代码）第 49 轮已按「第 07 轮决定：改成规范写法」记 note，本轮不重复。
2. 命名 HTML 实体保真（第 49 轮 F1）本轮未回归：`## b1-export` 种子里的 `&nbsp;` 文档不在本轮种子里，但第 49 轮 tester 已全绿，不重复报。
3. **表格里手打 `# `/`> `/`- ` 与粘贴带标题的 Markdown 仍造块级节点**：`STATE.md:66` 已排下一轮第一项，不重复。
4. **「全部替换」1 MB 冻结 51.8 s**（第 49 轮 code F3）与 **源码模式字数口径**（第 44 轮）已排期，不重复。
5. **大纲折叠不跨文档保留**（第 49 轮 F2）本轮未复测，不重复。
6. 表格插入/删除行后 DOM 出现 `<col style="min-width:25px">` / `table style="min-width:50px"`：属第 37 轮列宽拖拽与「colwidth 导出清理」待办（`STATE.md:72` 第 ⑤ 项），不重复。
7. `Ctrl+N` 在有未保存改动时会弹「切换文档」三选一（D3 探针被它挡住），是既有设计；D3 的「未命名文档草稿」路径因此没有测成，见 UNVERIFIED。
8. 快速打开的空态 `<li class="quick-open-empty">` 在 `role="listbox"` 里没有 `role="option"`；`input` 也没有 `aria-activedescendant`（`src/components/QuickOpen.tsx:80-96`）。键盘可用、读屏语义可再打磨，按 P3 不列入 actionable。
9. 重命名输入框冲突时没有 `aria-invalid`（`src/components/TreeActions.tsx:112-145`），提示文本本身完整可见（见路径 8）。P3。
10. 新建文件夹走 `window.prompt`（`src/App.tsx:2435`），与应用内对话框风格不一致；本轮未测非法名/取消分支（探针在 D4 因刷新后工作区丢失而未跑到），P3 待补。

---

## UNVERIFIED（本轮测不了，写清怎么补）

1. **真实宿主（WebView2）里的预览/导出**：本轮全在浏览器态。补测走 `scripts/host-smoke.mjs` 或宿主 E2E：同一篇续行脚注文档在宿主里 `Ctrl+Shift+P` 与导出 HTML 的 `li` 文本。
2. **1 MB 文档**：本轮只到 54 KB（900 段）。1 MB 载入 ≈110 s（第 39 轮 dev 口径），25 分钟预算内没跑；逐键只在 54 KB 上量到 ≈+6 ms/键。
3. **未命名文档的自动草稿与刷新恢复**：D3 里 `Ctrl+N` 被「切换文档」三选一挡住，打进去的字落在上一文档；刷新后工作区句柄（假 FSA 对象含函数）无法写回 IndexedDB，只能验证单文档草稿 `sidelight.doc.v1` 被静默恢复。补测：先 `Ctrl+N` 并处理三选一（选「不保存」），等 2 s 自动保存，再刷新看提示文案。
4. **新建文件夹的非法名/取消分支**：`window.prompt` 的 `a/b`、空串、同名三个分支没跑到（D4 刷新后没有工作区，`.tree-new-caret` 不在 DOM）。
5. **打印 / PDF 输出**：`window.print` 在 headless 里被 stub 掉，只验证了菜单项存在，没有真实 PDF 产物。
6. **真实磁盘写回与真实 IME**：与第 49 轮相同，本轮用假 FSA；`--`、中文引号等智能标点在真 IME 下的行为仍未测。

---

## 关键截图

- `shots/round-50/bug-h-h-cont-preview.png` —— 预览「注释」只有 `第一行定义`，续行不见了（F1）。
- `shots/round-50/bug-c1-fn-mid-savegate.png` —— 同一篇文档 `Ctrl+S` 弹「保存前确认」。
- `shots/round-50/bug-c1-fn-mid-export.png` —— 同一篇文档导出 Markdown 却没有提示（F2）。
- `shots/round-50/bug-e1-quickopen-opened.png` —— `Ctrl+P` 过滤后 Enter 真打开、焦点回正文。
- `shots/round-50/bug-d1-delete-dialog.png` / `bug-f1-rename-conflict.png` —— 删除确认框与同名重命名提示（提示完整可见）。
