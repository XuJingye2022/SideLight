# 第 33 轮计划审查（critic，只读）

- 结论：**REVISE**，6 条（P0×1、P1×4、P2×1）。
- 输入：`round-33/plan.md`、`findings-bug.md`、`findings-typora.md`、`findings-ship.md`、`AGENTS.md` §4/§8、`docs/adr/`。
- 基线：`main` @ `e9d90a8`，版本 0.32.1。未改产品代码、未 push、未动 `release/`。只写 `.tmp/` 探针与本报告。
- 我实跑的探针（本轮新建，均只读）：
  - `.tmp/r33-critic-probe-clip.ts` + `npx tsc --ignoreConfig --noEmit --lib es2022,dom .tmp/r33-critic-probe-clip.ts`
  - `.tmp/e2e-r33-critic-paste.mjs`（CDP 9222，先 `node .tmp/reset.mjs 9222`）：真实 `Control+Shift+V` 的 paste 事件里有什么
  - `.tmp/e2e-r33-critic-richtml.mjs`：同一份 `text/html + text/plain` 剪贴板，`Control+V` 与 `Control+Shift+V` 各粘一次

## 1. 核对结果

**对上的（我逐个 `read` / `Select-String` 过）**

| 计划点到的位置 | 实读结果 |
| :--- | :--- |
| `src/App.tsx:703-716` `shortcutExtension`、`:718-744` `extensions` 数组、`:805-811` `handlePaste` | 全部一致；`handlePaste` 只接 `image/*` |
| `src/App.tsx:9` 已 import `TextSelection`、`:4259` 已有 `setTextSelection({from,to}).extendMarkRange('link').setLink({href})` | 一致 |
| `src/App.tsx:749-796` 里已经在 `editorProps.handleKeyDown` 直接用 `editor?.chain()` | 说明 T2 那样在 `editorProps` 里用 `editor` 不算陈旧闭包问题 |
| `src/lib/settings.ts:6-23` 类型、`:30-41` 默认值、`:60` `loadSettings` | 一致；`autoSave: parsed.autoSave !== false`（`:86`）就是要照抄的写法 |
| `src/components/SettingsDialog.tsx:72-80` 自动保存复选框 | 一致，可复制 |
| `src/components/ShortcutsDialog.tsx:22-40`「编辑与批注」组 | 一致 |
| `src/lib/settings.test.ts` 已有 `makeStorage()` localStorage 桩（`:7-26`） | 一致（见 P2-6 的落点建议） |
| `packaging/verify-installer.ps1:20` `$version`、`:138`/`:140` 写死 `'0.31.1'`、`:144` PASS 文案写死 | 全部一致；全文 `0.31.1` 只命中这 3 行（`Select-String`） |
| `.github/workflows/release.yml:34-35` `preflight.outputs.version`、`:64-66` `windows-build`/`needs`/`windows-2022`、`:84,92,95,98,103` 步骤与 6 空格缩进 | 全部一致，插入点正确 |
| `packaging/README.md:42`「`P + 10,000` 门槛」、`:57` 体积预算 850,000 B | 一致 |
| `scripts/measure-first-screen.mjs:2,14,16-56` `--dir` 与只统计 index.html 直接引用 | 一致；`--dir .tmp/build-r33` 能被正确解析 |
| `package.json:14` `test` 是显式文件清单（21 个） | 一致，末尾追加即可 |
| `docs/CHANGELOG.md:5` `## Unreleased（第 29–32 轮，未发版）` | 一致 |
| T3 三个证据文件 | 实读：`release\Sidelight-0.32.1-win-x64-setup.exe` 824,595 B / **0.31.1.0**；`host\bin\Sidelight.exe` 87,040 B / 0.32.1.0；`.tmp\ship-check\ship-test.exe` 826,742 B / 0.32.1.0。正反例都能就地复现 |
| `src/lib/smartTyping.ts`、`src/lib/plainPaste.ts` 不存在同名文件 | 确认，不撞名 |

**T3 我判 PASS**：判据、行号、正反例文件、YAML 插入点、缩进、`preflight` 输出全部对得上，7 分钟可做完。

## 2. 漏洞

### P0-1（T2）纯文本粘贴的判据不成立，而且这条能力 Chromium 原生已有——e2e 会假 PASS

三件独立的事，任何一件都足以推翻现在的 T2 设计：

1. **类型层判据不存在**。`ClipboardEvent` 没有 `ctrlKey` / `metaKey` / `shiftKey`。
   `npx tsc --ignoreConfig --noEmit --lib es2022,dom .tmp/r33-critic-probe-clip.ts` 输出：
   `error TS2339: Property 'ctrlKey' does not exist on type 'ClipboardEvent'.`（`metaKey` 同样）。
   计划 `plan.md:95` 的 `shouldPastePlain(event: { ctrlKey; metaKey; shiftKey })` 直接吃 `ClipboardEvent`，会让 `npx tsc --noEmit` 红——那正是 T2 自己的验收项。
2. **运行层也拿不到键位**。CDP 9222 实测（`.tmp/e2e-r33-critic-paste.mjs`）：真实按 `Control+Shift+V` 时，`paste` 事件记录到 `{"types":["text/plain"],"text":"标题\r\n\r\n粗"}`，**没有 ctrl/shift 字段（undefined）**；同一序列的 `keydown` 才记录到 `{"keydown":"V","ctrl":true,"shift":true}`。所以 `shouldPastePlain(event)` 恒为 false，分支永不进入。
3. **能力原生就有，e2e 会给出假 PASS**。同一份 `text/html + text/plain` 剪贴板（`.tmp/e2e-r33-critic-richtml.mjs`，粘前先 `Ctrl+A`/`Delete` 清空）：
   - `Control+V` → `<p>标题</p><p><strong>粗</strong></p>`（HTML 生效）
   - `Control+Shift+V` → `<p>标题</p><p>粗</p>`（**无 strong、无 h2**，就是纯文本）

   即 Chromium 自己把 `Ctrl+Shift+V` 当「粘贴为纯文本」。计划 `plan.md:109-110` 的 e2e 断言 2、3 在**一行代码都不改**的情况下就会绿。本轮会为之交付一个要么是死代码（按第 2 条）要么是重新实现原生行为的模块。

**修法（二选一，都写进 `impl.md`）**

- **推荐**：把 T2 收窄成「URL 贴到选区变链接」——这是真正缺的那一半，且不需要键位：`handlePaste` 里判「有非空选区 + 剪贴板 `text/plain` trim 后是裸 `http(s)` URL」→ `extendMarkRange('link').setLink()`，约 40 行、≤150 B。e2e 只留断言 1；断言 2、3 删掉（它们测的是浏览器原生行为，删掉不是减少证据，是不再冒充证据）。CHANGELOG 只写「URL 贴到选区变链接」，**不要写「新增粘贴为纯文本」**——那已经能用。
- 若坚持自写纯文本分支：键位改在 `editorProps.handleKeyDown` 抓（`(ctrl||meta) && shift && key==='v'` → 置 ref + 500 ms 超时清除），`handlePaste` 只读 ref；`shouldPastePlain` 改成 `() => boolean`；并补一条**能区分原生与自写**的断言（例如代码块内 `Ctrl+Shift+V` 粘多行纯文本仍留在代码块里），否则 e2e 无法证明改动生效。

### P1-2（T1）规则自相矛盾：既要「退格删成对括号」，又禁止 `handleKeyDown`；`smartInput` 签名也表达不了「越过关闭符」

- `plan.md:43` 要求「左右两边正好是一对空配对时一次退格删两边（`Backspace` 分支）」；`plan.md:44` 又写「**不使用 `handleKeyDown` 抢字符**，只用 `handleTextInput`」。`Backspace` 不产生文本输入，`handleTextInput` 收不到，两条不能同时成立。实施代理只能二选一，而计划没说选哪个，验收（`:74` 的 8 组断言）也没测这条。
- `plan.md:35` 的纯函数签名是 `smartInput(before, inserted)`，拿不到光标**后**的正文；而 `plan.md:50` 要求单测覆盖「关闭符越过」。越过的判据就是「下一个字符等于要补的关闭符」，缺 `after` 就写不出这条单测。

**修法**：签名改 `smartInput(before, inserted, after)`（`before`/`after` 各取光标前/后最多 4 个字符），配对、越过、引号判定全做进纯函数，插件只做位置换算；允许一个**只处理 `Backspace`** 的 `handleKeyDown`（写清「不抢可打印字符」），或把成对退格移出本轮并写进「已知限制」。

### P1-3（T1）400 B 的体积预算没有依据，兜底方案也救不回；T1+T2 距硬线只剩 348 B

- 本仓库主 chunk 894,163 B raw → 278,024 B gzip（31%，`findings-ship.md:13`）。120–150 行新代码 minify 后约 2–3 KB，按同一压缩率折算 **约 600–950 B gzip**，不是 400 B。
- 计划 `plan.md:21` 承诺 T1 后 ≤285,452、T1+T2 ≤285,652；硬线 286,000。按上面的折算，T1 后的真实值可能落在 285,600–286,000，T2 再加就把余量吃掉。
- 兜底 `plan.md:21`「砍中文后半角标点」只省一张 5 条目的映射表加一个正则，约 100–200 B，补不上 500 B 的缺口；而设置项文案落在惰性 `SettingsDialog` chunk（`findings-ship.md:16` 记 4,555 B），砍它省不到首屏字节。

**修法**：把实施顺序改成「先量后写」——只写纯函数 + 插件 + 接进 `extensions`，先不写设置项、不写 e2e，立刻 `npx vite build --outDir .tmp/build-r33` + `node scripts/measure-first-screen.mjs --dir .tmp/build-r33` 量一次，把实测值写进 `impl.md` 与 400 B 对照。预置兜底顺序：① 砍 CJK 半角转换；② 只留 `(`/`[`/`"` 三个配对，砍 `{}`、反引号、`'`；③ 仍超就把 T2 顺延，本轮只交 T1。不许抬 286,000。

### P1-4（T1）缺回归断言，其中反引号自动配对很可能打掉现有的「反引号变内联代码」

- tiptap 的 `Code` mark 有 `addInputRules()`，`find: inputRegexMatch`（`node_modules/@tiptap/extension-code/dist/index.js:108-112`），靠「输入反引号」这条输入触发；`HorizontalRule` 也有 `find: /^(?:---|—-|___\s|\*\*\*\s)$/`（同目录 `extension-horizontal-rule/dist/index.js:60-64`）。而 `handleTextInput` 是这些输入规则被咨询的唯一入口（`node_modules/prosemirror-inputrules/dist/index.js:92-96`：`textBefore = 光标前正文 + 本次输入`）。
- 计划的配对表包含反引号（`plan.md:36`），且「下一个字符正好是关闭符时只移动光标」（`:43`）。于是打 `` `a` `` 时，**收尾那个反引号被本插件吃掉**，`Code` 的输入规则收不到它 → 内联代码 mark 不生成，正文留下字面量反引号。这条计划没核对、e2e（`:59-66`）也没测。
- 同一处还缺一条：`Ctrl+Z` 一步撤回。计划 `:45` 写了「一次 transaction」，但 8 组断言里没有撤销。

**修法**：e2e 加三条：① 输入 `` `a` `` 后断言存在 `code` 元素；② 输入 `---` 后按 Enter 断言出 `hr`（顺带验证 `—-` 兼容分支，规则表别改坏）；③ 输入 `"引用"` 后按一次 `Control+z`，断言回到直引号。若第①条不成立，把反引号从配对表里删掉（Typora 也常把它当代码起点，不配对更安全）。

### P1-5（T1）「必须切输入法」这个理由没经过真实输入法校准，收益可能被高估

- `findings-typora.md:27-30` 的 5 条失败全部来自 Playwright 合成 ASCII 输入（`page.keyboard.type`）。中文用户用微软拼音/搜狗在**中文态**打 `"` 时，输入法本来就上屏 `“”`；打 `Shift+-` 得 `——`、`Shift+6` 得 `……`。若成立，T1 对主力用户几乎不产生可见变化，真实受益面只是「西文态/半角态」输入。
- 计划 `plan.md:30` 把「作者现在必须切输入法或事后手改」写成选它的主要理由，而 `plan.md:80` 又把输入法一条放进 UNVERIFIED 风险。理由与证据方向不一致。

**修法**（本机无真人输入法，我测不了，只能由实施代理或根代理做）：开测前用微软拼音、中文态各打一次 `"`、`,`、`--`、`...`，截图进 `shots/round-33/`。若中文态本来就全角：把 T1 的理由改成「西文态与混排输入」，CHANGELOG 别写「中文排版必需」，并把输入法一条从「风险」升级为「已知限制」；若中文态仍出半角：保留现理由。**这条不改也可以做，但必须先把说法改准，不能把未验证的前提当卖点。**

### P2-6（T2）纯文本分支没规定代码块/表格内的落点；`!text` 时 `return true` 会吞掉图片粘贴

- 计划 `plan.md:100` 只说「逐行 `insertContent({type:'paragraph'})`」。段落节点不能进 `codeBlock`，在代码块里粘多行会被挤出代码块（`findings-typora.md:110` 已经写了「代码块内粘贴保留原换行」，计划没落到规则里）；表格单元格里同样会把单元格撑破。
- `plan.md:98` 的 `if (!text) return true`：`Ctrl+Shift+V` 粘图片时 `text/plain` 为空，这一句会让图片粘贴被吞（现有 image 分支在它之前，但 `return true` 仍阻止默认行为）。

**修法**：分支内先判 `$from.parent.type.name === 'codeBlock'` → `insertText(text)`（保留换行、不进结构）；表格单元格 → `insertText` 并把 `\n` 换 `hardBreak`；`!text` 时 `return false`（交回默认）。

## 3. 没问题的部分（不用改）

- T1/T2 的文件归属与串行安排正确（同改 `src/App.tsx`，不能并行）；T3 文件不重叠可并行。
- 「不在本轮范围」的 7 条理由成立：图片破图的 110 行 + 宿主重建确实塞不进 35 分钟；表格列宽要配省字节任务；代码块高亮要新依赖且安装包距硬线只剩 25,791 B（我复核了 `findings-ship.md:85` 与 `vite.config.ts:31-39`）。
- 首屏上限不抬、`--dir .tmp/build-r33` 量体积、测试文件登记进 `package.json`、E2E 前 `reset.mjs 9222`、截图落 `shots/round-33/`：这几条与 `AGENTS.md` §3/§8 和 `common.md` 一致。

## 4. 未测 / UNVERIFIED

- 真实中文输入法（P1-5 的前提）：本机无真人输入法，Playwright 不产生组合事件。
- WebView2 宿主里 `Ctrl+Shift+V` 是否与浏览器一样原生生效：我只在 Chromium（Edge，CDP 9222）实测；推断一致，**未在宿主验证**。
- T1 的真实体积增量：我没有实现，只有按主 chunk 压缩率的折算。
- `release.yml` 新步骤在真实 CI 的首次运行：本机无 CI。

---

# 计划审查 · revision 2（critic，只读，2026-11-17）

- 结论：**REVISE**，5 条（P0×1、P1×1、P2×3）。T3 判 PASS（原样保留的那节仍全对）。
- 基线：`main` @ `e9d90a8`，工作树只有 `STATE.md` 改动与 `round-33/`、`shots/round-33/` 未跟踪，与计划一致。未改产品代码、未 push、未动 `release/`。
- 本轮实跑探针（全部只读，CDP 9222，每次先 `node .tmp/reset.mjs 9222`）：
  - `.tmp/e2e-r33-critic-linkpaste.mjs`：**零改动**下「URL 贴到选区」的结果
  - `.tmp/e2e-r33-critic-codepaste.mjs`：代码块 / 行内代码里的同样操作
  - `.tmp/e2e-r33-critic-t1-baseline.mjs`：T1 的前提与计划 e2e 输入方式的基线

## 1. 上一版 6 条是否真修掉

| 上一版 | 状态 | 依据 |
| :--- | :--- | :--- |
| P0-1 纯文本粘贴判据不成立 | **形式修了，前提没验** | 不再读 `ClipboardEvent` 键位、不绑快捷键、CHANGELOG 措辞已改；但换成「URL 贴选区」后仍没先验「这条现在做不到」，见本轮 P0-1 |
| P1-2 规则自相矛盾 + 签名缺 `after` | **修掉** | `plan.md:48` 签名是 `smartInput(before, inserted, after)`、三种返回值写清；成对退格整条移出（`:63` 只留 `handleTextInput`）；与 `:113` 已知限制一致，无自相矛盾 |
| P1-3 400 B 预算无依据 | **修掉** | 改「先量后写」+ 决策点 A + 四级兜底梯子（`:23-29`），上限不抬；`--dir` 确实存在（`scripts/measure-first-screen.mjs:2,14`） |
| P1-4 缺回归、反引号配对打掉行内代码 | **设计修了，执行顺序让它作废** | 反引号已出配对表（`:56`），回归断言 9–11 已加；但断言 8 把开关关掉再 reload，9–11 在其后跑，见本轮 P1-2 |
| P1-5「必须切输入法」未校准 | **修掉** | 卖点改成「西文态/半角态与中英混排输入」（`:12`、`:40`），CHANGELOG 禁写「中文排版必需」（`:21`），输入法降为 UNVERIFIED |
| P2-6 落点与 `!text` 吞图片 | **修掉** | 不再插入任何段落；空选区 `return false`（`:131`）；代码块 / `code` mark 排除（`:133`）；图片分支仍在最前（`:130`） |

## 2. 本轮漏洞

### P0-1（T2）新 T2 是**重复实现**：能力已由 Tiptap 内置 `linkOnPaste` 提供，断言 1 在零改动下就绿

四条独立证据，任何一条都足以推翻 T2：

1. **源码**：`node_modules/@tiptap/starter-kit/src/starter-kit.ts:243-245` 默认注册 `Link`；`src/App.tsx:720` 是 `StarterKit.configure({ strike: false })`，**没有** `link: false`。`node_modules/@tiptap/extension-link/src/link.ts:258` 的默认值 `linkOnPaste: true`；`:542-551` 挂上 `pasteHandler`；`helpers/pasteHandler.ts:25-49`：选区非空 + 粘贴文本整体是链接 → `setMark(link, {href})`。T2 的 `asHttpUrl` + `handlePaste` + `setLink` 与它是同一件事。
2. **实测（零改动）**：输入 `文字` → `Shift+Home` 选中 → `navigator.clipboard.writeText('https://example.com')` → `Control+V`，得到
   `<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">文字</a></p>`，`a[href]=1`，链接文字仍是 `文字`。
   计划 `plan.md:143` 写「不改代码时 Chromium 会用 URL 替换掉选区，`a[href]` 为 0」——**实测相反**。断言 1 在零改动下就绿，与上一版 P0-1 的假 PASS 同一类。
3. **连排除分支也没有可见差异**：代码块里贴 URL 到选区得 `<pre><code>https://example.com</code></pre>`、`a[href]=0`（`codeBlock` 的 `marks: ""` 挡住 `setMark`，`node_modules/@tiptap/extension-code-block/dist/index.js:32`）；行内代码里同样 `a[href]=0`（`code` mark `excludes: "_"`，`extension-code/dist/index.js:64`）。
4. **原生还多覆盖两条**：空选区贴 URL 自动成链（`<a>https://example.com</a>`）；`https://example.com 说明` 只给 URL 部分加链接。

**修法**
- 删除 T2 整节：`src/lib/linkPaste.ts`、`src/lib/linkPaste.test.ts`、`src/App.tsx` 的 `handlePaste` 分支、`.tmp/e2e-r33-t2-urlpaste.mjs`、决策点 B 与 `T_B`、文件归属表两行、全轮约束 1 里的 CHANGELOG 第 2 行（`plan.md:21`）。
- 在 `findings-typora.md` 的 2.4 节与 `STATE.md:55` 各加一句：「第 33 轮 critic 实测：粘贴为纯文本与 URL 贴选区变链接都由 Chromium/Tiptap 内置提供（StarterKit 默认注册 Link，`linkOnPaste` 默认 true），不要再排」。否则第 34 轮会第三次挑到同一条。
- 若根代理仍要一个用户可见的第二任务：先用同一方法（**零改动基线探针**）证明它确实做不到，再写进计划；没验过的「缺」不算缺。

### P1-2（T1 e2e）断言 8 把开关关掉再 reload，9–11 在「功能关闭」态跑，P1-4 要的回归证据作废

- `plan.md:95` 写 `localStorage.setItem(... {smartPunctuation:false})` + `page.reload()`；`:96-98` 的 9（反引号出 `code`）、10（`---` 出 `hr`）、11（撤销）排在其后。重载后 `smartPunctuation:false`，插件 `isEnabled()` 为假，这三条变成原生行为的复测——**插件坏没坏都绿**。
- **修法**：把 8 挪到 11 之后；或在 8 之后 `localStorage.removeItem('sidelight.settings.v1')` + `page.reload()` + 等 `.ProseMirror`，再跑 9–11。顺带在 8 里补断言「`a--b` 仍是 `a--b`」，证明开关关的是全部规则，不只是引号。

### P2-3（T1 已知限制）「`——` 连打四次 `-`」在段落开头不成立

- 实测：空段落打 `---` 立刻出 `<hr>`（`hrCount=1`）。原因：第三次 `-` 时段落文本是 `—-`，命中 `@tiptap/extension-horizontal-rule/dist/index.js:62` 的 `—-` 分支。`plan.md:113` 这句会把实施代理带偏，测试者也可能按错误预期判失败。
- **修法**：改成「段落开头连打 `---` 会出分隔线；要 `——` 请在已有文字后连打四次 `-`（同段内还有别的字时 HR 规则不命中）」。可选加一条 e2e：`x` + `----` → `x——`。

### P2-4（T1 e2e 断言 11）撤销断言删掉功能也绿

- `plan.md:98` 只断言「撤销后正文里没有 `—`」。规则不存在时（`x--` 原样保留），撤销后同样没有 `—`。
- **修法**：先断言正文**含** `—`，再 `Control+z`，再断言不含 `—`（允许留 `x-` 或 `x`）。

### P2-5（T1 插件层）`skip` 分支没限制空选区

- `plan.md:51` 的「越过关闭符」在 `from !== to` 时也会命中：例如选中 `文字`、后面紧跟 `)`，再按 `)`，插件会 dispatch 一条只移动光标的 transaction——这次输入被吞掉、选区被折叠。
- **修法**：插件里 `skip` 只在 `view.state.selection.empty` 时执行，非空选区交回配对/默认；纯函数旁写一行注释说明「skip 只对光标」。

## 3. 核对通过（我实读 / 实跑，不再重复上一版的表）

- T3 一节仍全对：`packaging/verify-installer.ps1` 的 `0.31.1` 只命中 `:138`、`:140`、`:144`，`$version` 在 `:20`；`release.yml` 的插入点在 `:98-101` 与 `:103` 之间，`windows-build` 有 `needs: preflight`（`:65`）、`windows-2022`（`:66`）、6 空格缩进；三个证据文件实测 `release\Sidelight-0.32.1-win-x64-setup.exe` 824,595 B / **0.31.1.0**、`host\bin\Sidelight.exe` 87,040 B / 0.32.1.0、`.tmp\ship-check\ship-test.exe` 826,742 B / 0.32.1.0；`installer.ps1:89` 打 `target=820000 gap=`、`:112` 打 `hard=850000 B`；`portable.ps1:15` `$threshold = 940000`；`packaging/README.md:42`/`:57` 文字与计划引述一致。
- T1 引用的位置：`src/App.tsx:703-716`（`shortcutExtension`）、`:718`（`useEditor`）、`:719-744`（`extensions`，无 `Link`，`Link` 来自 StarterKit）、`:749-796`、`:805-811`（`handlePaste` 只接 `image/*`）、`:4259`、`:4397-4398`（设置按钮）；`src/lib/settings.ts:6-23,30-41,60-91`，存储键 `sidelight.settings.v1`（`:25`）；`SettingsDialog.tsx:72-80`；`package.json:14` 显式 21 个测试文件；`docs/CHANGELOG.md:5` 是「第 29–32 轮」。
- T1 的前提成立（实测基线）：`"引用"` 仍是直引号、`a--b`、`c...d`、`中文,句`、`([` 都不变；反引号 `` `a` `` 出 `code`；三反引号 + Enter 出 `pre`，块内 `-- (` 原样；`---` 出 `hr`。计划 e2e 的输入方式（`page.keyboard.type`）能产生这些结果。
- `handleTextInput` 返回 `false` 不截断后续 prop：`prosemirror-view/dist/index.js:5766-5781` 的 `someProp` 按真值取第一个。反引号不配对的决定有依据（`extension-code/dist/index.js:8,20-29,108-110`）。
- 新增单测在 Node 下可跑：`@tiptap/core`、`@tiptap/pm/state` 都能被 `node --experimental-strip-types` 直接 import（本轮实测 `core function plugin function`），不需要把插件与纯函数拆文件。
- `codeBlock` 的 `code: true`（`extension-code-block/dist/index.js:34`）与 `code` mark 的 `code: true`（`extension-code/dist/index.js:65`）都在，计划的两条排除判据可以照写。

## 4. UNVERIFIED（本轮测不了）

- T1 的真实体积增量：我没有实现，不给折算。决策点 A 的「先量后写」是正确做法。
- 真实中文输入法中文态（P1-5 的前提）：本机无真人输入法。
- `npm test` 276 条：本轮未复跑，引 finder 实测；新增测试文件后条数以实施报告为准。
- 打开设置对话框截图后的真实焦点归还：只读复核代码，未截图。
- `release.yml` 新步骤的首次真实 CI 运行：本机无 CI（T3 自己已记）。

---

# 计划审查 · revision 3（critic，只读，2026-11-17）

- 结论：**REVISE**，6 条（P1×2、P2×4）。**T3 仍判 PASS**（revision 3 对 T3 一字未改，我复核了全部行号、证据文件与 YAML 插入点）。
- 基线：`main` @ `e9d90a8`，0.32.1；工作树只有 `STATE.md` 改动与 `round-33/`、`shots/round-33/` 未跟踪。未改产品代码、未 push、未动 `release/`。
- 本轮实跑探针（只读，CDP 9222，每次先 `node .tmp/reset.mjs 9222`）：
  - `.tmp/r33-critic-t1-baseline.mjs`（复跑）：`<p>"引用"</p>`、`a--b`、`c...d`、`中文,句`、`([`、`<code>a</code>`、`<pre><code>-- (</code></pre>`、`hrCount=1`。T1 的前提（这些输入现在都不转换）成立。
  - `.tmp/r33-critic-fence.mjs`（本轮新写）：三反引号后 `pre=0`、`<p>```</p>`；**再按 Enter 后 `pre=1`**。`plan.md:93` 的「三个反引号 + Enter 建代码块」可用。
  - `.tmp/r33-critic-smartsim.mjs`（本轮新写）：把 `plan.md:49-56` 的规则逐条实现成纯函数 + 插件语义，按 e2e 的输入方式模拟；输出见 P1-1 与 P2-6。这是**按计划文字模拟**，不是产品实跑。

## 1. 上一版 5 条是否真修掉

| 上一版 | 状态 | 依据 |
| :--- | :--- | :--- |
| **P0-1** 新 T2 是重复实现 | **修掉** | 计划里已无 T2 任务：`plan.md:13` 明确整节删除，`plan.md:191` 写「`handlePaste` 本轮不动」，文件归属表（`:187-188`）只剩 T1/T3；全文 grep `T2`/`T_B`/`linkPaste`/`urlpaste`/`决策点 B` 只命中历史修订记录与删除说明。`findings-typora.md:103-110` 的 2.4 已标「已关闭：两条都是内置能力，不要再排」。**收尾注意**：`STATE.md:55` 仍是旧句「③ 表格列宽拖拽与「粘贴为纯文本」排队」；`plan.md:194` 已把「根代理收尾时删掉该句」写成步骤，按 AGENTS §7 由根代理做，本轮收尾**必须执行**，否则第 34 轮会第三次排到同一条。 |
| **P1-2** e2e 第 8 条关开关后排 9–11 | **修掉** | `plan.md:96-98` 把关开关挪到第 12 条；`:86` 与 `:107` 都写明「必须 1→12 顺序、第 12 条在最后」。 |
| **P2-3** `——` 连打四次 `-` 的已知限制 | **修掉** | `plan.md:113` 改成「空段落开头会出分隔线；`x` + 四根 `-` 才是 `x——`」，并加 e2e 第 11 条（`:97`）。我用 `r33-critic-smartsim.mjs` 按规则模拟：`x----` → `x——`、`---` → `—-`（随后交回 HR 输入规则）；零改动基线 `hrCount=1` 也复跑到了。 |
| **P2-4** 撤销断言删掉功能也绿 | **修掉** | `plan.md:96` 改成「先断言含 `—`，`Control+z` 一次后再断言不含」。 |
| **P2-5** `skip` 没限制空选区 | **设计修掉，但无回归** | `plan.md:50` 写了「`skip` 只对空选区生效，插件执行前判 `view.state.selection.empty`」，`:113` 也交代纯函数看不到选区。问题是**没有任何一条 e2e 覆盖插件层这个 gate**，见本轮 P2-3。 |

## 2. 核对通过（我实读 / 实跑）

- **T3 全对，不需要改**：`packaging/verify-installer.ps1` 的 `0.31.1` 只命中 `:138`、`:140`、`:144`（`Select-String` 复跑），`$version` 在 `:20`；`release.yml` 的插入点在 `:98-101` 与 `:103` 之间，`windows-build` 有 `needs: preflight`（`:65`）、`windows-2022`（`:66`）、6 空格缩进；`packaging/README.md:42` 确实是 `P + 10,000` 门槛、`:57` 是 850,000 B 体积预算；`installer.ps1:89` 打 `target=820000 gap=`、`:112` 打 `hard=850000 B`；`portable.ps1:15` `$threshold = 940000`；`release.yml:34-35` 的 `preflight.outputs.version` 存在。
- **T1 的位置**：`src/App.tsx:703-716`（`shortcutExtension`）、`:718`（`useEditor`）、`:719-744`（`extensions`）、`:749-796`（`handleKeyDown` 已有 `editor?.chain()`）、`:805-811`（`handlePaste` 只接 `image/*`）、`:4397`（设置按钮）；`src/lib/settings.ts:6-23`、`:30-41`、`:60-91`（`:86` 是 `autoSave` 的布尔写法）、存储键 `sidelight.settings.v1`（`:25`）；`SettingsDialog.tsx:72-80`（自动保存复选框，可复制）；`package.json:14` 是 21 个文件的显式清单；`docs/CHANGELOG.md:5` 是「第 29–32 轮」；`scripts/measure-first-screen.mjs:2,14` 有 `--dir`。
- **T1 不是重复实现**：`@tiptap/starter-kit/src/starter-kit.ts:184-268` 注册的扩展里**没有 Typography**；实测基线也证 `--`、`...`、直引号都不变。上一轮 P0-1 的教训不能反过来把真功能也当重复。
- **排除判据有依据**：`extension-code-block/dist/index.js:34` `code: true`、`extension-code/dist/index.js:65` `code: true`；`extension-horizontal-rule/dist/index.js:62` 的 `/^(?:---|—-|___\s|\*\*\*\s)$/` 确有 `—-` 分支，`---` 仍出 `hr`；`extension-code/dist/index.js:20-29,108-110` 的输入规则说明反引号不配对是对的。
- **`handleTextInput` 会被调用**：`prosemirror-view/dist/index.js:5362-5367`（简单文本插入路径）与 `:3283`（keypress 兜底）都调它，参数是 `chFrom`/`chTo`/选区位置，所以 P2-5 的选区判据可行、`handleTextInput` 也确实是输入规则的入口。

## 3. 漏洞（6 条，按严重度）

### P1-1（T1 规则 1）跳过关闭符的判据与配对表不对齐：e2e 第 1 条按计划文字不成立，且 `{x}` 会多一个 `}`

- `plan.md:50` 写的关闭符是 `)` `]` `”` `’`，判据是「`inserted` 就是对应的左半边或该关闭符本身」；但 `plan.md:51` 规则 2 的输入是 **ASCII** `"`/`'`，配出来的关闭符是弯引号 `”`/`’`。ASCII `"` 既不等于 `“` 也不等于 `”`，**按字面读，规则 1 不会被 ASCII `"`/`'` 触发**。
- 按 `plan.md:49-56` 的规则顺序逐条模拟（`.tmp/r33-critic-smartsim.mjs`，literal 读法）：
  - `"引用"` → **`“引用””`**（计划 e2e 第 1 条 `plan.md:87` 期望 `“引用”`，不成立）；
  - `'引用'` → `‘引用’’`；`"a" b` → `“a” b”`；
  - `{x}` → **`{x}}`**：`plan.md:55` 的配对表包含 `{`，但 `plan.md:50` 的关闭符表**漏了 `}`**，打 `{` 得 `{}` 后按 `}` 不跳过，又插一个 `}`。
  - 对照：`(x)` → `(x)`、`[x]` → `[x]` 都正确，说明缺的正是引号映射与 `}`。
- 另一种读法（把 ASCII `"` 当成「对应的半边」）才会得到 `“引用”`：同一模拟的 semantic 模式输出 `“引用”`、`‘引用’`。计划文字没有写这层映射，实施代理按哪种读法都能自圆其说，而 e2e 第 1 条只认后者——这就是漏洞：**判据必须写死，不能靠读法**。
- 这不是实现细节：计划要求「按此顺序判定」，按字面写就是上面的结果；e2e 第 1 条是 T1 最核心的验收，实施代理跑到这里会直接红，再返工改规则。Typora 自己的实现就专门处理了这一类（`.tmp/typora-remap.txt`，smart quote 分支里 `g(d,!1)&&(r=null,y=!y)` 会翻转方向再决定是否跳过），说明不能只比字面量。
- **修法**：重写规则 1 的判据——
  1. 先把 `"`/`'` 按规则 2 定性为开/闭；**闭引号时**若 `after[0]` 等于本次会产出的关闭符（`”`/`’`）→ `skip`；
  2. 关闭符表补 `}`（或从配对表删 `{`，与兜底 ② 保持一致）；
  3. 单测补三条：`after='”'` + `inserted='"'` → `skip`、`after='’'` + `inserted="'"` → `skip`、`after='}'` + `inserted='}'` → `skip`；
  4. e2e 第 5/6 条之间再加一条闭合断言（`(x)` 或 `{x}` 打完不再多字符），否则这条规则仍只有纯函数证据。

### P1-2（T1 兜底梯子）兜底 ①②③ 会删掉被单测/e2e 锁死的规则，验收清单没有跟着变

- `plan.md:24-27` 的三级梯子：① 删「中文后半角标点」整条规则；② 配对表只留 `(`、`[`、`"`，删 `{`、`'`；③ 配对整条顺延，只交智能标点。
- 但同一份计划把被删的东西写成了硬性验收：`:72` 单测要求中文后 `, ; : ? !` 五条映射；`:74` 单测要求 `{`、`'` 配对；`:90` e2e 第 4 条断言 `中文,句` → `中文，句`；`:91-92` e2e 第 5/6 条断言配对；`:105-108` 要求 12 组断言全 PASS；`:21` 的 CHANGELOG 第 ① 行写「智能标点与自动配对」。
- 于是走到 ① 时 e2e 第 4 条必红、对应用例必须删；走到 ② 时两条单测必红；走到 ③ 时 e2e 第 5/6 条与配对单测全红、CHANGELOG 的「自动配对」也不成立。计划没说这些情况该改哪一条验收，实施代理只能自己决定删测试还是硬凑，等于把「测试锁死行为」的承诺作废。
- **修法**：在硬约束 3 的梯子旁加一张对照表，逐级写清「被移除的规则 / 同步删掉的单测用例 / 同步删掉的 e2e 断言 / CHANGELOG 与已知限制怎么改」，并要求 `impl.md` 记录落地规则集与删掉的用例编号；验收 `:105-108` 改成「按落地规则集：已交付规则对应断言全 PASS，未交付的不算失败」。若不想加这张表，就改梯子：只允许删没有单测/e2e 锁定的实现细节，不删规则（实际做不到，那就加表）。

### P2-3（T1 e2e / P2-5）`skip` 只在空选区生效这条**没有任何 e2e**覆盖

- `plan.md:50` 的 gate、`:113` 的注释都在插件层，纯函数单测（`:68-76`）测不到 `view.state.selection`；e2e 第 6 条（`:92`）是「选中 `文字` 按 `(`」走包选区分支，不是「非空选区 + 后面紧跟关闭符 + 按关闭符」。
- 结果：上一版 P2-5 的修法只能靠读代码确认，实施代理若把 `skip` 写成无条件执行，12 条 e2e 依然全绿（选中 `文字` 按 `)` 的场景没人跑）。
- **修法**：加一条 e2e（可与第 6 条相邻）：`文字)` → `Shift+Home` 选中 `文字` → 按 `)` → 断言正文不是 `文字)` 原样且输入没被吞（按修法语义应是默认替换，正文 `))`）；或写成 `(文字)` 里选中 `文字` 按 `)` 的变体。至少要有一条断言能区分「gate 在」与「gate 没在」。

### P2-4（T1 设置）风险 ④ 承诺的旧 JSON 单测没有文件/步骤落点

- `plan.md:113` 风险 ④ 说「单测里加一条旧 JSON（`{"autoSave":false}` 这种没有新键的）读出来 `true`」，但：
  - `plan.md:68` 的新测试文件只测纯函数；
  - 改动文件/步骤（`:64`、`:68`、`:77`、`:187`）**没有 `src/lib/settings.test.ts`**；
  - 验收 `:105` 只要求新文件全 PASS，不查这条。
- 后果：`loadSettings` 的 `smartPunctuation: parsed.smartPunctuation !== false` 只能在代码 review 里看，`=== true` 这类回归（老用户被默认关掉功能）不会被测到。
- **修法**：把 `src/lib/settings.test.ts` 加进 T1 的文件表与第 5 步，补两条：旧 JSON（没有新键）读出 `true`、`{"smartPunctuation":false}` 读出 `false`；`npm test` 条数按实际重算（文件数仍是 22）。

### P2-5（T1 技术依据）「ProseMirror 的组合输入不走 `handleTextInput`」与源码相反

- `plan.md:62` 写「ProseMirror 的组合输入不走 `handleTextInput`，中文输入法组合态天然安全」。源码不是这样：
  - `prosemirror-view/dist/index.js:5182-5184` 的 `readDOMChange` 用 `compositionPendingChanges`/`view.composing` 处理组合变更，照样走到 `:5362-5367` 的 `someProp("handleTextInput", ...)`；
  - `prosemirror-inputrules/dist/index.js:92-94` 的 `run()` 第一行就是 `if (view.composing) return false;`——官方输入规则正是在 `handleTextInput` 里挡组合输入，说明组合期间这个 prop **会被调用**（否则这行是死代码）；
  - 同文件 `:78-86` 还有 `handleDOMEvents.compositionend`：20 ms 后以 `text=""` 再 `run()` 一次，这是输入规则在 IME 上屏后的补跑路径。
- 计划已经把 `view.composing` 写进硬性排除（`:61`），**代码层没问题**；错的是理由，以及「天然安全」会让后来人删掉 guard。另一个没写进计划的行为差异：`prosemirror-view:3657-3666` 在 `compositionend` 先置 `composing=false` 再 flush 待处理变更，该窗口里 T1 的 `handleTextInput` 会不会拿到上屏文本，本轮没有真人 IME 可验。
- **修法**：把理由改成「组合期间 `handleTextInput` 会被调用（`prosemirror-view:5366`），靠 `view.composing` 挡，与 `prosemirror-inputrules:92-94` 同一做法」；UNVERIFIED 加一条「IME 上屏那一次（`compositionend` 后 flush）T1 是否转换、会不会重复转换」，补测方法写真人微软拼音；可选在插件里对 `inserted.length > 1` 直接放行（IME 提交常是多字），并写一行注释。

### P2-6（T1 规则 5）`!` 转全角会打断紧跟中文的 Markdown 图片语法

- `plan.md:54` 把 `!` 列入中文后半角转换。模拟 `文字![图](a.png)` → **`文字！[图](a.png)`**（`.tmp/r33-critic-smartsim.mjs`）：Markdown 图片语法要求 `!` 紧跟 `[`，转成 `！` 后这段就变成普通文本（链接目标也一起失效）。
- 计划的已知限制（`:113`）只写「中文后的 `.` 不转、反引号不配对、没有成对退格、`——` 开头受限」，没提 `!`；e2e 也没测。
- **修法**：二选一：① 从映射表删 `!`（留 `, ; : ?`），并写进已知限制；② 保留 `!` 但加条件「`after[0] === '['` 时不转」，单测补 `after='['` 用例。无论选哪个，在 `impl.md` 的已知限制里留一行。

## 4. 其它观察（不编号，不改变 REVISE 结论）

- **截图与第 12 条的顺序**：e2e 第 12 条（`plan.md:98`）会 `localStorage.setItem('{smartPunctuation:false}')` + `reload()`，这个状态留在 CDP 9222 的 profile 里。如果截图（`:99`）写在 e2e 脚本末尾或用同一 profile 紧接着跑，拍到的就是关闭态。截图前先 `node .tmp/reset.mjs 9222`，或把截图放在第 12 条之前。另：`scripts/shot.mjs:27` 会 `localStorage.clear()` 但随后按它自己的公式流程打字（`:32-51`），直接拿它截不出 `“引用”`；T1 的截图应写进 `.tmp/e2e-r33-t1-typing.mjs` 自己调 `page.screenshot`。
- **T3 验收的小笔误**：`plan.md:170` 把 `:144` 列为 `\$version` 的命中行；改完后 `:144` 是 `"Sidelight.exe --version = $cliVersion"`，不含 `$version`。命中数仍 ≥3（`:20`、`:138`、`:140`、`:152-153`），命令不会误报，但清单里的 `:144` 应删掉。
- **`10,000` 的搜索范围**：`plan.md:148` 说「全仓库搜 `10,000` 只命中这一行本身」；在 `docs/iteration/round-03|30|31|32` 里还有多段历史记录命中（`findings-ship.md`、`plan.md`）。这句只对「代码/脚本/`.github`」成立，写进报告时改成这个范围，免得实施代理看到一堆历史文档命中以为改错了。
- **AGENTS §7 的 README 没写进计划**：T1 是用户可见能力，§7 要求收工改 README 的「现在能做什么 / 不能做什么」。`plan.md` 的文件表与 `:194` 的收尾只提 CHANGELOG 与 STATE；建议在收尾步骤补一句（T1 已交付规则 + 已知限制），否则本轮做完 README 仍停在 0.32.1 的说法。
- T3 的 `StartsWith("$version")` 仍会放过未来的 `0.32.10` 这类版本；本轮不改可以，但 CI 用 `-ne "$version.0"` 是对的，两处判据不统一可留到下次发版前统一。

## 5. UNVERIFIED（本轮测不了）

- T1 的真实体积增量：按计划文字模拟，没有实现，不给折算；决策点 A 的「先量后写」是正确做法。
- 真实中文输入法（含 `compositionend` 后 flush 的转换行为）：本机无真人输入法，`page.keyboard.type` 不产生组合事件。
- T1 落地后的真实输出：P1-1/P2-6 的数字来自**规则模拟**，不是产品实跑；e2e 必须以落地实现为准，尤其第 1、5、6、11 条。
- `release.yml` 新步骤的首次真实 CI 运行：本机无 CI。
- `verify-installer.ps1` 的完整安装链：沙箱不能装系统级软件，本轮只复核判据。
- 我没跑 `npm run build`/`npm test`/`roundtrip`（本轮只读、计划未实施），门禁现状引 `plan.md:5` 的 finder 实测。
