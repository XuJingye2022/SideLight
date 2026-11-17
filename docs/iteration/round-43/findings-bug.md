# 第 43 轮 · 缺陷猎人（端到端，只读）报告

- 轮次：round=43，nn=43，报告目录 `docs/iteration/round-43`，CDP 端口 9222。
- 轮前 `startSha=0f83e1f80f57d93e0860282a0d3b0bc2b7953750`；收工时 `git rev-parse HEAD` 仍是 `0f83e1f`（`git status --porcelain` 只有 `?? docs/iteration/round-43/` 与 `?? shots/round-43/`，`.tmp/` 被忽略）。
- 环境：dev server `http://localhost:5175`（未另起、未重启、未 kill `msedge`）；CDP 9222 上已开的 headless Edge；每段 E2E 前跑 `node .tmp/reset.mjs 9222`。
- 只读：产品代码 0 改动。我这份报告新增的文件只有 `docs/iteration/round-43/findings-bug.md`、`shots/round-43/bug-*.png`、`.tmp/e2e-r43-bug-{a,b,c,d,e,f,g,h,i,j}.mjs` 与同名 `.log`（`shots/round-43/` 里还有其它 finder 的截图，不是本轮我产生的）。
- 本轮新增可执行条目：**3 条（1 条 P1、2 条 P2）**。真跑 7 条完整路径 + 第 8 条 UNVERIFIED。

## 结论摘要

1. **P1**：**预览（只读）视图里 `Ctrl+M`（公式）与 `Ctrl+K`（链接）会改正文**。弹层在当前光标处插入节点，`dirty` 静默变 true；停笔 2 秒的自动保存、或用户按 `Ctrl+S`，都会写回文件。第 42 轮给「替换 / 全部替换」补的 `previewMode` 守卫（`App.tsx:1837`、`1845`）没有覆盖这两个入口。更糟的是：在预览里插公式后，**整个正文区变成一行「公式预览加载中…」，8 秒后仍是这一行**——预览从不调用 `ensureKatex()`，KaTeX 惰性 chunk 一次都没被请求，所以不会自愈。
2. **P2**：**公式 / 链接弹层里的 `Esc` 不止关弹层，还会连带退出源码或预览**。`FindBar` 在 35 轮加过 `stopPropagation()`，`MathInlineEditor.tsx:56`、`LinkEditor.tsx:69/100` 仍是只 `preventDefault()`，同一个按键冒泡到 window 的 Esc 分支（`App.tsx:3618-3627`）→ 一次 `Esc` 两个动作。
3. **P2**：**脚注定义里的粗体、链接、公式在预览与 HTML 导出里是字面文本**。`src/lib/export.ts:33-45` 的 `renderFootnotes` 逐行 `escapeHtml`，不做 Markdown 渲染：`**粗体**`、`[链接](…)`、`$a+b$` 原样显示，KaTeX 也不会加载。

---

## 1（P1，只读视图里改正文并落盘 + 预览卡在加载态）预览模式里 `Ctrl+M` / `Ctrl+K` 直接插入正文，自动保存写盘

**复现步骤**（最短的一份：`.tmp/e2e-r43-bug-e.mjs`）

1. `node .tmp/reset.mjs 9222`，假工作区只种一篇不含公式的 `乙.md`（`# 乙\n\n乙的正文。乙的正文第二处。\n`）。
2. 「文件 ▾ → 打开文件夹…」→ 点 `乙.md`（此时 `editorMath:0`，KaTeX 从未加载，`katexReqs` 只有 2 条 shim 模块）。
3. `Ctrl+Shift+P` 进预览（`.preview-pane` 的 `contentEditable=false`，`viewMode === 'preview'`）。
4. `Ctrl+M` 打开公式输入框，填 `x^2`，按 `Enter`。
5. 等 1 秒、再等 8 秒，看正文区与状态栏；再按 `Ctrl+Shift+P` 回编辑，按 `Ctrl+Z`，再 `Ctrl+S`，读回假 FS 字节。

**证据**（`.tmp/e2e-r43-bug-e.log`）

| 步骤 | 观察 |
| --- | --- |
| `## e1-no-katex-yet` | `{"katexReqs":["katexLazy.ts","katexLazy-BFFIXP1U.js"],"editorMath":0}` —— KaTeX 本体与 CSS 一条请求都没有 |
| `## e2-preview-after-math-1s` | `{"mode":"preview","dirty":true,"pendingNote":"公式预览加载中…","previewText":null,"previewBodyEmpty":8,"katexNodes":0}` |
| `## e3-preview-after-math-8s` | `{"mode":"preview","dirty":false,"pendingNote":"公式预览加载中…","previewText":null,"katexReqs":[同上 2 条],"toast":"已保存 乙.md"}` —— **8 秒后还在加载态，而且自动保存已经把正文写进文件** |
| `## e4-back-edit` | `{"dirty":false,"text":"𝑥|2|x|2|乙|乙的正文。…"}` —— `Ctrl+Z` 撤不回（保存已推进基线） |
| `## e5-乙-bytes-after` | `{"same":false,"bytes":"# $x^2$乙\n\n乙的正文。乙的正文第二处。\n"}` —— 种子 `# 乙` 变成 `# $x^2$乙` |

第二次独立复现（`.tmp/e2e-r43-bug-c.log`，同一路径 + 链接）：`## c2` 打开公式框时 `dirty` 已 true、预览 pane（`.preview-pane`）整个消失；`## c5` 按 `Ctrl+K` 填「示例 / https://example.com」回车后 `dirty:true`；`## c6-preview-save` 在**预览态直接按 `Ctrl+S`** → `toast:"已保存 乙.md"`、`bytes:"# 乙\n\n乙的正文。乙的正文第二处。$x^2$[示例](https://example.com)\n"`、`seedSame:false`。

第三次（`.tmp/e2e-r43-bug-b.log`，只按 `Ctrl+K`）：`## c5-link-inserted` `dirty:true`、`## c8-saved` 字节里出现 `[示例](https://example.com)`。

截图：`shots/round-43/bug-c-2-math-inserted.png`（正文区只剩「公式预览加载中…」）、`bug-c-3-link-inserted.png`、`bug-c-4-preview-saved.png`（已保存仍是加载态）、`bug-e-stuck-math-preview.png`、`bug-b-preview-ctrl1.png`。

**根因**

- `src/App.tsx:3700-3704`（`Ctrl+K` → `openLinkAtCursorRef.current()`）与 `3705-3709`（`Ctrl+M` → `openMathAtCursorRef.current(...)`）没有 `previewMode` 守卫；第 42 轮只在 `replaceCurrent`（`App.tsx:1837`）与 `replaceEvery`（`1845`）加了 `if (previewMode) return`。同样的窗口级分支里 `Ctrl+1–6/0`（`3715-3724`）也没有守卫，但编辑态 `chain().focus()` 在预览里不生效，本轮实测 `Ctrl+1` 未改正文（`bug-b.log` `## c1` `dirty:false`）——所以只有 `K/M` 这条链路有牙齿。
- 预览卡在加载态：`src/components/PreviewPane.tsx:53-66`，`hasMath && !ready` 时直接返回 `<p className="math-pending-note">公式预览加载中…</p>`；`ready` 只由 `katexLazy.ts` 的 `ensureKatex()` 推进，而 `PreviewPane` 只调 `renderToString()`（`src/lib/katexLazy.ts:183-185`，未就绪返回空串、**不触发加载**）。整个文件没有任何 `ensureKatex()` 调用；唯一的预取点是载入时 `src/App.tsx:994` 的正则 `/\$\$|\$[^$\n]+\$/`，而这次公式是在预览里临时插进去的，走不到那一行。
- 自动保存：`## e3` 的 `toast:"已保存 乙.md"` 出现在 8 秒窗口里，说明 2 秒防抖的自动保存同样不判视图态。

**期望 vs 实际**

- 期望：预览是只读视图。第 42 轮刚把预览里的「替换 / 全部替换」锁死并在查找条写明理由（`.find-note`「预览是只读视图，不支持查找与替换」），说明产品自己就承认这条契约。`Ctrl+M` / `Ctrl+K` 落在同一契约内，应当无效（或提示切回编辑）。
- 实际：按键照常生效，节点插在**切换预览前的旧光标处**（`## c6` 的 `$x^2$` 落在文末段尾、`bug-b.log` 的落在标题开头），预览区随即被加载态整块替换，随后自动保存/`Ctrl+S` 把改动写进文件，且撤销不回来。用户以为在只读预览里看书，回头磁盘上的正文已经变了。

**修复建议**

1. `App.tsx:3700-3709` 两处入口加同款守卫：`if (previewMode) return`（放在 `preventDefault()` 之前或紧后，别吞掉按键却让浏览器去滚动）。
2. `PreviewPane` 拿到 `hasMath && !ready` 时主动 `void ensureKatex().catch(() => undefined)`（`useEffect` 里做，别在 render 里做），或把 `katexLazy.renderToString` 的契约改成「未就绪时顺带触发加载」。二者取一即可，前者改动更小。
3. 复测点：`.tmp/e2e-r43-bug-e.mjs`，断言 `## e2` 的 `dirty:false`、`pendingNote` 为 null、`## e5` 的 `same:true`；`.tmp/e2e-r43-bug-c.mjs` 断言 `## c6` 的 `seedSame:true`。

**成本**：S（两处 `if` + 一个 `useEffect`；`#2` 的单测可加在 `katexLazy.test.ts`）。

## 2（P2，一次按键两个动作）公式 / 链接弹层里按 `Esc`，会连带退出源码或预览

**复现步骤**

1. 打开 `甲.md`，按 `Ctrl+/` 进源码模式（`.source-editor` 有焦点）。
2. 按 `Ctrl+M` 打开公式输入框（焦点在 `INPUT.math-inline-input`）。
3. 按一次 `Esc`。

**证据**（`.tmp/e2e-r43-bug-i.log`、`.tmp/e2e-r43-bug-h.log`）

| 步骤 | 观察 |
| --- | --- |
| `## h1-source` | `{"mode":"source","hasSource":true,"active":"TEXTAREA.source-editor"}` |
| `## h2-source-ctrlm` | `{"mode":"source","active":"INPUT.math-inline-input"}` —— 公式框开着，仍在源码模式 |
| `## h3-source-esc` | `{"mode":"edit","hasSource":false,"hasPm":true,"active":"DIV.tiptap ProseMirror editor doc-"}` —— **一次 Esc 同时关了公式框并退出了源码模式** |
| `## i3`→`## i5-one-esc` | 同一路径独立复现：`{"mode":"source"}` → `{"mode":"edit","sourceGone":true}` |
| `## i7`→`## i8-preview-one-esc` | 预览态同样：`{"mode":"preview","active":"INPUT.math-inline-input"}` → 一次 Esc 后 `{"mode":"edit"}` |

截图：`shots/round-43/bug-i-esc-source.png`。

**根因**

- `src/components/MathInlineEditor.tsx:56-60`：`Escape` 只 `event.preventDefault()` + `onCancel()`，没有 `event.stopPropagation()`。
- `src/components/LinkEditor.tsx:69-72` 与 `100-103`：同样只有 `preventDefault()`。
- 对照：第 35 轮给 `FindBar.tsx:68-72`、`121-125` 补了 `event.stopPropagation()`，注释写着「一个按键只处理一次：不再冒泡到 window 的 Esc 分支（否则同一个 Esc 会连带退出源码/预览）」。`MathInlineEditor` / `LinkEditor` 是直接挂在 `App.tsx:5303-5338` 的，没有 `InlinePopover` 那层 document 级 `stopPropagation`（`InlinePopover.tsx:28-32`），所以事件照样到 window。

**期望 vs 实际**

- 期望：弹层开着时 `Esc` 只取消弹层（产品自己在 `LinkEditor` 底部写着「`Esc` 取消」）。
- 实际：同一个 `Esc` 取消了弹层，又把用户从源码/预览扔回富文本编辑，焦点跳到 `.ProseMirror`，源码里的 caret 位置丢失。源码模式里如果正在对照原文改字，这一下会打断位置。

**修复建议**：两处 Esc 分支补 `event.stopPropagation()`，与 `FindBar` 的写法一致；顺手确认 `MathInlineEditor` 的 `onCancel` 里 `editor?.chain().focus()` 在源码态是空操作（不影响结论）。复测：`.tmp/e2e-r43-bug-h.mjs` 断言 `## h3` 仍是 `mode:"source"`、`.source-editor` 还在。

**成本**：S（4 行）。

## 3（P2，渲染缺口）脚注定义里的粗体 / 链接 / 公式在预览与 HTML 导出里是字面 Markdown

**复现步骤**

1. 假工作区种 `脚注富文本.md`：`# 脚注富文本\n\n正文[^1]。\n\n[^1]: 定义里有 **粗体** 与 [链接](https://example.com) 与 $a+b$。\n`。
2. 打开它，`Ctrl+Shift+P` 进预览。
3. 看「注释」区，再读 `.preview-pane .footnotes` 的 HTML。

**证据**（`.tmp/e2e-r43-bug-j.log`、`.tmp/e2e-r43-bug-i.log`）

| 步骤 | 观察 |
| --- | --- |
| `## j1-edit` | `{"editorHtml":"<h1>脚注富文本</h1><p>正文[^1]。</p>"}` —— 打开时脚注定义不落在正文里（与导出分流的既有设计一致） |
| `## j2-preview-footnotes` | `{"fnHtml":"<section class=\"footnotes\"><h2>注释</h2><ol><li>定义里有 **粗体** 与 [链接](https://example.com) 与 $a+b$。</li></ol></section>","strong":0,"links":0,"katex":0}` —— 三个语法全部字面 |
| `## i2-preview-footnote-math` | `{"katexReqs":[],"katexInPreview":0,"footnotesBlock":"注释|定义里带公式 $a+b$。"}` —— 公式不渲染，KaTeX 一条请求都没有 |

截图：`shots/round-43/bug-j-footnote-rich.png`、`shots/round-43/bug-i-footnote-math-preview.png`。

**根因**：`src/lib/export.ts:33-45` 的 `renderFootnotes` 逐行取 `[^x]:` 后面的文本，然后 `<li>${escapeHtml(item)}</li>`，没有走任何 Markdown / 公式渲染。`PreviewPane.tsx:55` 与 HTML 导出共用它，所以两处表现一致。`renderFrontmatter`（`export.ts:48-52`）同样是纯转义——但 frontmatter 本就该原样，脚注正文不该。

**期望 vs 实际**

- 期望：脚注内容是一段 Markdown 正文，Typora 的脚注区会渲染粗体、链接与公式；Sidelight 的正文渲染已经支持这三样。
- 实际：预览与 HTML 导出都显示字面 `**粗体**`、`[链接](https://example.com)`、`$a+b$`。保存字节不受影响（假 FS 与正文都没动），所以这是纯渲染缺口，不丢数据。

**修复建议**：`renderFootnotes` 把每条 `item` 交给 `manager.parse`（编辑器同一个 marked manager）解析成 HTML，再对公式走 `renderMath` 同款替换；或至少渲染行内格式与公式、保留其它原样。补两条单测（`export.test.ts`）：粗体/链接、`$a+b$`。若产品决定脚注区就是纯文本，请在 `docs/typora-gap.md` 记一条差距，别让读者以为公式坏了。

**成本**：S–M（一处函数 + 单测；要注意 `escapeHtml` 去掉后不能引入 XSS，仍要允许 HTML 转义策略与正文一致）。

---

## 路径实测结果（本轮真跑，截图在 `shots/round-43/`）

| 路径 | 做了什么 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 新建 → 输入 → 排版 → 保存 → 刷新恢复 | 树头「＋ 新建」→ `标题一` → `Ctrl+2` → 加粗 → 列表两项 → `> 一段引用` → `Ctrl+S` → 用盘上字节重装假工作区 → reload → 重开文件夹 → 打开 | 通过。`已新建 未命名.md`；字节 `## 标题一\n\n**加粗的词**\n\n- 列表项一列表项二\n- &gt; 一段引用\n- \`\`\`\n- const a = 1\n\n`；reload 后富文本 HTML 与保存前一致、标题 `未命名.md — Sidelight` | `.tmp/e2e-r43-bug-a.log` 的 `## a0`–`## a5` |
| 2 文件树 | 新建（落盘）→ 右键重命名 `树改名.md`（窗口标题随动）→ 删除到回收站 → 点 toast「撤销」 | 通过。回收站 `.sidelight/trash/20261117-162635-4e4q36-树改名.md`；撤销后 `树改名.md` 字节回到 `# 树\n\n树正文。\n`，提示「已恢复 树改名.md」 | `.tmp/e2e-r43-bug-f.log` 的 `## f8`–`## f10`；`shots/round-43/bug-f-tree.png` |
| 3 键盘 | `Ctrl+1–6/0`、`Ctrl+K`、`Ctrl+M`、`Ctrl+P`、`Ctrl+F`→`Esc` 后打字、预览里 `Ctrl+B/I/U`/侧栏 `Ctrl+Shift+1/3/L` | 通过。块标签 `["H1","H2","H3","H4","H5","H6","P"]`；链接框 `link-editor-input`（文字/地址）；公式框 `math-inline-input`（占位「输入 LaTeX，例如 x^2」）；快速打开 `li` 与 `[role=option]` 各 3 条；`Esc` 后焦点回 `.ProseMirror` 且 `Z` 打进正文（48→49）；预览里 6 组组合键 `changed:false`、`Ctrl+S` 后字节未变 | `.tmp/e2e-r43-bug-a.log` 的 `## b1`–`## b7`、`.tmp/e2e-r43-bug-h.log` 的 `## h6`–`## h8` |
| 4 样张往返 | 含 frontmatter、脚注定义（放末尾）、`$x^2$`、行内 `<kbd>`、`<!-- 注释 -->`、callout、表格、mermaid、单波浪号、硬换行、`& < >` 的 `样张.md`：打开 → `Ctrl+S` → 逐字节比对 | 通过：`same:true`、`diffCount:0`、无对话框；mermaid 出 1 个 SVG、公式 1 个 KaTeX、`s` 0 个。**对照**：脚注定义后还有其它块时会弹「保存后这些写法会被改写」（第 34 轮 P0 门禁按设计工作） | `.tmp/e2e-r43-bug-f.log` 的 `## f2`–`## f3`、`.tmp/e2e-r43-bug-e.log` 的 `## e7`–`## e8`；`bug-f-sample-open.png` |
| 5 源码 / 预览 / 主题 / 字号 / 窄窗 | `Ctrl+/` 源码、`Ctrl+Shift+P` 预览、设置里切深色、`Ctrl+=` ×2、`Ctrl+Alt+0`、1024×700 | 通过：深色 `body` bg `rgb(21,23,26)` / fg `rgb(233,230,224)`、`data-theme=dark`；字号 `17px → 19px`；1024 下 `scrollWidth === clientWidth === 1024`、溢出元素 0 个。预览态另见第 1 条 | `.tmp/e2e-r43-bug-d.log` 的 `## d6`–`## d9`；`bug-d-dark.png`、`bug-d-narrow-dark.png`、`bug-d-settings.png` |
| 6 控制台与错误路径 | 十份脚本全程挂 `console`/`pageerror`/`requestfailed`；含删除确认、切换文档确认、保存风险门 | 通过。所有脚本末行 `## z-errors` 都是 `{"errors":[],"failed":[]}`；风险门与删除确认框文案/按钮正常 | 各 `.log` 末行 |
| 7 大文档 100 KB | `大100.md`（900 段、种子 89,004 B）打开 → `Ctrl+End` → 连打 4 个字 → `Ctrl+S` | 通过：900 个 `p`、25,203 字、`scrollHeight 64,282`；`Ctrl+End` 后 `scrollTop 63,254`（到底）、anchor 在「第 900 段」；逐键 **26 / 20 / 22 / 15 ms**；保存后字节含新字、`已保存`、无对话框、0 控制台错误 | `.tmp/e2e-r43-bug-f.log` 的 `## f4`–`## f7`、`.tmp/e2e-r43-bug-g.log` 的 `## g5`–`## g8`；`bug-f-big-doc.png`、`bug-g-big-ctrlend.png` |
| 8 重开恢复 / 最近 / 草稿 / 批注 | 未真跑：假 FSA 句柄写不进 IndexedDB，浏览器态没有 `/__annotations`、`/__draft` | UNVERIFIED（见下表） | — |

## note（去重、按设计、脚本注意，不计入 actionable）

- **与第 42 轮第 1 条的关系**：第 42 轮报的是预览里「替换 / 全部替换」没锁，本轮那条已修（`App.tsx:4778-4784` 加了预览说明、按钮 disabled）。本轮第 1 条是**同一契约下没被那处修复覆盖的另两个入口**（`Ctrl+M` / `Ctrl+K`），不是重复项——修法也不同（一处 `if` 挡不住 `openMathAtCursor` 内部插入，还要处理预览加载态）。
- **与第 35 轮第 2 条的关系**：第 35 轮报的是 `FindBar` 的 Esc 连带退出源码/预览，已修（`FindBar.tsx:71`）。本轮第 2 条是同类缺陷的**另一个组件**（公式 / 链接弹层），`grep stopPropagation src/components` 能直接看出只有 `FindBar`、`InlinePopover` 有。
- **旧账复核（前轮已列，本轮再次出现，不重复计）**：① `> ` 引用行、行首 `&gt;` 守卫——本轮列表里的 `- &gt; 一段引用` 仍按设计（第 41 轮）；② 行内 HTML `<kbd>` 显示成字面（`## f2` `kbdAsElement:0`，`docs/typora-gap.md` 与第 42 轮 note 已记「行内 HTML 渲染要做专用 inline 节点」）；③ `<!-- 注释 -->` 显示字面（第 41 轮第 3 条）；④ 重命名后提示「已刷新：新增 1 个，消失 1 个」（第 29 轮 findings-bug 第 2 条，本轮 `## f9` 再次出现）。
- **按设计，不算缺陷**：① 脚注定义后还有别的块时保存被「保存后这些写法会被改写」拦住（第 34 轮 P0 门禁，`## e8` 的对话框）；② 表格被改动后分隔行归一成 3 个连字符（`:--` → `:---`，`.tmp/e2e-r43-bug-b.log` 的 `## t6`）、单元格补齐空格（`| 甲 |` → `| 甲   |`）——语义等价，只在「表格被改动」时发生（第 10 轮的整块复用仍是未改动时的口径）；③ 预览里 `Ctrl+B/I/U` 不改正文（`## h7` `changed:false`）。
- **脚本注意（下一轮复用）**：
  - 「切换文档」对话框开着时整个文件树是 `inert`，`page.click(树里的文件)` 会 30 s 超时（`.tmp/e2e-r43-bug-e.log` 的 `大100.md` 那一步）。切文件前先 `dismiss()` 或对对话框点「不保存」。
  - 大文档测 `Ctrl+End` 之前必须先把焦点点进 `.ProseMirror`：第 43 轮 F 脚本先按 `Ctrl+End` 再点正文，读到 `scrollTop:0` 并误以为「Ctrl+End 失效」；单独复测（G 脚本）证明它正常（`scrollTop 63,254`、anchor 在第 900 段），是脚本顺序问题。
  - 快速打开的条数继续用 `.quick-open li` 单口径（`## b4` `li:3`、`[role=option]:3`，不能求并集）。

## UNVERIFIED

| 项 | 为什么 | 怎么补测 |
| --- | --- | --- |
| 路径 8：重开恢复、最近文件、草稿、批注与选区联动 | 假 FSA 句柄写不进 IndexedDB（第 40/42 轮同结论）；浏览器态没有 `/__annotations`、`/__draft` | `scripts/session-acceptance.mjs` + `host-smoke` |
| 第 1 条在真实宿主（`/__doc`）下的落盘 | 浏览器态没有 `/__doc`，走的是假 FSA 分支 | 宿主 `host-smoke` 加一条：预览里 `Ctrl+K`/`Ctrl+M` 后读 `/__doc` 是否已变 |
| 预览里 `Ctrl+M` 后 `Ctrl+Z` 的窗口内撤销（未保存之前） | 本轮只在「已保存」之后试过撤销（撤不回），没测保存前的单次撤销 | 预览里插入后立刻回编辑按一次 `Ctrl+Z`，看 `dirty` 与 HTML |
| 1 MB 载入与逐键 | 第 39 轮 dev 两遍实测约 220 s，本轮预算内跑不完 | 单独排一次，按第 39 轮的 5 个 `performance.mark` 口径取最后一条 |
| 深色主题下的表格条 / 查找条 / 设置面板对比度 | 本轮只截了图（`bug-d-dark.png`、`bug-d-settings.png`），没量对比度数值 | 取 `getComputedStyle` 前景/背景算比值，目标 ≥ 4.5:1 |
| 真实 IME 组合输入下的 Esc、真盘 / 网络盘 / 中文长路径 | 本机无 IME 自动化、只有假 FSA 句柄 | 真人 + 宿主 `host-smoke` |
| 第 3 条在 HTML 导出文件里的表现 | 本轮只验了预览；`renderFootnotes` 与导出共用，但没真的导出一次文件比对 | 导出 HTML 后 `grep` 脚注区的 `**` 与 `$a+b$` |
| macOS / Intel Mac / 签名公证 | 本机是 Windows | 交给 CI 与真人 |
