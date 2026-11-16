# 第 33 轮计划（planner，只读）

- revision：**3**（第 2 次修订；输入 `round-33/plan-review.md` revision 2 的 5 条：P0-1、P1-2、P2-3、P2-4、P2-5。逐条对应见文末「修订记录 · revision 3」。**任务结构变了：T2 整节删除，只剩 T1 / T3**——T2 要做的两件事（粘贴为纯文本、URL 贴选区变链接）都是 Chromium/Tiptap 内置能力，revisor 零改动实测已成立）
- 基线：`main` @ `e9d90a8`（工作树里只有本轮 `docs/iteration/round-33/`、`shots/round-33/` 未跟踪，以及 `docs/iteration/STATE.md` 的未提交改动；planner 不改 STATE）。版本 **0.32.1**，本轮**不发版**。
- 门禁现状（本轮 finder 实跑，不是估计）：`npm run build` PASS；首屏 gzip **285,052 B / 上限 286,000 B，余 948 B**；`npm test` 21 文件 **276** 条；dist 合计 1,469,453 B（46 文件）。
- 输入：`round-33/plan-review.md`、`round-33/findings-bug.md`（2 条 P2）、`round-33/findings-typora.md`（10 条）、`round-33/findings-ship.md`（6 条）、`docs/iteration/STATE.md`、`README.md`、`AGENTS.md` §4/§8、`docs/typora-gap.md`、相关源码。

## 本轮取舍（先给结论）

**2 个任务：一个用户可见（T1），一个发布门禁修正（T3）。全部不新增依赖、不动宿主、不发版、不改 `release/`。**

- **T1（P1，用户可见）智能标点 + 自动配对括号引号**：`handleTextInput` 里把直引号变弯引号、`--`→`—`、`...`→`…`、中文后 5 个半角标点变全角，左括号/左引号补右半边。**收益面写准**（P1-5）：本机实测只有 Playwright 合成 ASCII 输入，真实中文输入法中文态可能本来就上屏全角符号，**未验证**，所以卖点是「西文态/半角态与中英混排输入」，不是「不这么做就没法写中文」。CHANGELOG 也照此写。本轮**不做**成对退格（P1-2），**不配对反引号**（P1-4）。
- **T2 删除（P0-1 第二次，revision 3）**：revision 2 的「URL 贴到选区变链接」仍是**重复实现**。`src/App.tsx:720` 的 `StarterKit.configure({ strike: false })` 没关 `link`，所以 `@tiptap/starter-kit/src/starter-kit.ts:243-244` 照样注册 `Link`；`linkOnPaste` 默认 `true`（`@tiptap/extension-link/src/link.ts:258`），`helpers/pasteHandler.ts:25-49` 在「选区非空 + 粘贴文本整体是链接」时 `setMark(link,{href})`——与 T2 的 `asHttpUrl + handlePaste + setLink` 是同一件事。revisor 复跑 critic 的零改动探针（`.tmp/e2e-r33-critic-linkpaste.mjs`，先 `reset.mjs 9222`）确认：`文字` 选中后贴 `https://example.com` 得 `<a href="https://example.com">文字</a>`、链接文字仍是 `文字`；空选区贴同一 URL 自动成链；`https://example.com 说明` 只给 URL 加链。代码块里贴 URL 到选区得 `<pre><code>https://example.com</code></pre>`、`a[href]=0`（所以 T2 的排除分支也零可见差异）。**整节删除**：不建 `src/lib/linkPaste.ts` / `linkPaste.test.ts`、不碰 `App.tsx:805-811` 的 `handlePaste`、不写 `.tmp/e2e-r33-t2-urlpaste.mjs`、删掉决策点 B 与 `T_B`。**本轮不另找第二个人可见任务来填**：按 critic 的原话「没验过的『缺』不算缺」，任何替补都得先做零改动基线探针；本轮计划不承担这件事（见「不在本轮范围」第 9 条）。
- **T3（P1，发布门禁）版本号写死的验收脚本 + 发版前 `FileVersion` 断言 + 门槛文案**：`packaging/verify-installer.ps1` 三处把版本写死成 `0.31.1`，**正确的 0.32.1 包会被判 2 个 FAIL、坏的 0.31.1 包反而通过**——门禁方向反了。加一条 `release.yml` 断言，让「包里 FileVersion 不是本版」在发出去之前就红。零字节、可本地正反复验。**（revision 2 的 6 条与 revision 3 的 5 条都不涉及 T3；critic 两轮都判 T3 的判据、行号、正反例文件、YAML 插入点、缩进全对，本修订对 T3 一字未改。）**
- **首屏字节（P1-3 重写）**：948 B 余量是硬门，上限**不抬**。但原稿「T1 ≤400 B + T2 ≤200 B」是拍的、无依据（主 chunk 894,163 B raw → 278,024 B gzip，120–150 行新代码 minify 后 2–3 KB ≈ 600–950 B gzip），且兜底「砍中文后半角标点」只值约 100–200 B、设置项文案还落在惰性 `SettingsDialog` chunk（4,555 B，`findings-ship.md:16`）根本省不到首屏。本修订改为**先量后写 + 一个决策点 + 三级兜底梯子**（见全轮硬约束 3），T1 的真实增量以实测为准写进 `impl.md`，不写死承诺值。
- **任务量**：单执行代理 35 分钟。T3 约 7 分钟，T1 约 20 分钟（含决策点 A 的一次构建），合计约 27 分钟。T1 与 T3 文件不重叠，可并行；只派一个代理时先 T3 后 T1。
- **没有配「省字节」任务**，理由不糊：① finder-ship 把 dist 逐项量过（`findings-ship.md:18`），主入口 894,163 B 是首屏必需、KaTeX 已惰性、字体已只发 woff2、11 个小 chunk 已拆、13 个运行时依赖全在用，**没有低风险可落地的减重项**；② 真正需要省字节的是图片破图，正确做法是「惰性 chunk 化」而不是从首屏刮字节——`scripts/measure-first-screen.mjs:16-51` 只统计 `index.html` 直接引用的文件，懒加载 chunk 不进首屏集合。见「不在本轮范围」。

## 全轮硬约束（每条验收都要过）

1. **不发版**：`package.json` 的 `version` 保持 `0.32.1`；`docs/CHANGELOG.md` 的 `## Unreleased（第 29–32 轮，未发版）`（`:5`）标题改成 `## Unreleased（第 29–33 轮，未发版）`，在其下加「**第 33 轮**」子段，**两条**改动各一行：① 智能标点与自动配对；② 验收脚本与发版断言的版本修正。**不得**写「粘贴为纯文本」「URL 贴选区变链接」——两条都是 Chromium/Tiptap 内置（见 P0-1，`findings-typora.md` 2.4 已记「不要再排」）；T1 那一行**不得**写「中文排版必需」（见 revision 2 的 P1-5）。
2. **不改 `release/`、不 push、不新增运行时依赖、不动 `host/` 与 `host-mac/`**；`npm run build` 由根代理串行跑，实施期间类型检查用 `npx tsc --noEmit`，量体积用 `npx vite build --outDir .tmp/build-r33` + `node scripts/measure-first-screen.mjs --dir .tmp/build-r33`（`--dir` 见 `scripts/measure-first-screen.mjs:2,14`）。
3. **首屏 gzip ≤286,000 B，上限不许抬**。改前基线 285,052（本轮 finder 实测）。本轮用**决策点 + 兜底梯子**，不再写死「T1 后 ≤285,452」这类没依据的承诺：
   - **决策点 A**（T1 的纯函数 + 插件 + 接进 `extensions`，**先不做设置项**）：构建 + measure，记 `T_A`。
     - `T_A ≤ 285,700`（即 T1 增量 ≤648 B）→ 继续 T1 剩下的设置项与 e2e。
     - `285,700 < T_A ≤ 286,000` → 兜底 ①（删「中文后半角标点」整条规则）→ 复测；仍 >285,700 → 兜底 ②（配对表只留 `(`、`[`、`"`，删 `{`、`'`）→ 复测；仍 >285,700 → T1 自身只要 ≤286,000 即可（T2 已删除，没有可顺延的第二个任务）。
     - `T_A > 286,000` → 依次执行 ①②；仍超线 → 兜底 ③（配对整条顺延，只交「智能标点」：引号、破折号、省略号三组）→ 复测。三级用完仍 >286,000 就停手报根代理，**不许抬上限，也不许删无关文案凑数**。
   - 每次构建后都把 `raw=` / `gzip=` / `total` 原样贴进 `impl.md`：`T_A` 与 T1 最终值必须各自可归因，**禁止只写估算**。
4. **界面变化必须截图**：落 `shots/round-33/`，不要覆盖 `shots/round-05/`。
5. **E2E 环境**：dev server `http://localhost:5175` 已在跑，不要重启、不要另起；浏览器只用 CDP **9222**，不要启动 Edge、不要 kill `msedge`；每个脚本前跑 `node .tmp/reset.mjs 9222`。自写脚本放 `.tmp/e2e-r33-*.mjs`，连接方式抄 `.tmp/e2e-r33-critic-richtml.mjs:5-12`（`chromium.connectOverCDP('http://127.0.0.1:9222')` → `contexts()[0]` → `context.newPage()`），结尾 `page.close()` 后 `process.exit(0)`，否则进程不退（AGENTS §8）。
6. **测试文件必须在 `package.json` 的 `test` 脚本里登记**（`:14` 是显式文件清单），否则 `npm test` 不跑新条数。

---

## T1（P1，S–M，用户可见）智能标点 + 自动配对括号与引号

**为什么**：Typora 的 `Edit → Smart Punctuation` 与自动配对是它的默认行为（`window.html` 的 `remap-punctuation`、`frame.js` 的 `autoPairExtendSymbol`；见 `docs/iteration/typora-features.md`）。Sidelight 现状是原文照收，finder 实测：输入 `"引用"` 后 `curly=false`，`a--b` 的 `dash=false`，`c...d` 的 `ellipsis=false`，`中文` 后逗号仍是半角，依次输入 `(["` 正文就只有 `(["`（`findings-typora.md:27-30`）。

**收益范围（P1-5 校准，必须照此写进 CHANGELOG 与 `impl.md`）**：这 5 条实测全部来自 Playwright 合成 ASCII 输入。真实中文输入法在中文态打 `"`、`Shift+-`、`Shift+6` 时是否本来就上屏全角，本机**无真人输入法、未验证**。因此本轮卖点写成「**西文态 / 半角态与中英混排输入**下自动得到排版符号」，不写「不这么做就得切输入法」。输入法那条从「风险」降级为「已知限制」（见下）。

**改动文件 / 函数**

1. 新文件 `src/lib/smartTyping.ts`（约 100–130 行，纯函数 + 一个薄插件）：
   - `export type SmartResult = { kind: 'insert'; text: string; caret: number } | { kind: 'replace'; from: number; to: number; text: string } | { kind: 'skip' }`
     —— `insert`：在光标处插入 `text`，光标落在 `text` 内偏移 `caret`（配对时 `caret=1`，光标在里侧）；`replace`：替换光标前 `from`（负数）到 `to`（通常是 0）这一段；`skip`：只把光标前移一位（越过刚补上的关闭符），不改正文。
   - `export function smartInput(before: string, inserted: string, after: string): SmartResult | null`
     —— **纯函数，唯一判据入口**（P1-2：必须收 `after`，否则「越过关闭符」无法判定也无法单测）。`before` = 光标前最多 4 个字符，`after` = 光标后最多 4 个字符，实现里用 `$from.parent.textBetween(...)` 取值，不跨节点。规则命中即返回，**不命中返回 `null`**（不是 `false`，不是 `undefined`）。
   - `export function createSmartTyping(options: { isEnabled: () => boolean }): Extension` —— `addProseMirrorPlugins()` 里一个 `new Plugin({ props: { handleTextInput } })`。插件只做三件事：拿 `before`/`after`、判排除条件、把 `SmartResult` 换算成绝对位置并 dispatch 一条 transaction；**判定逻辑一行都不许写在插件里**。
   - 规则（T1 的全部可观察行为，按此顺序判定）：
     1. **越过关闭符**：`after[0]` 正好是本插件会补的关闭符（`)` `]` `”` `’`），且 `inserted` 就是对应的左半边或该关闭符本身 → `{ kind: 'skip' }`。例：先打 `(` 得 `()`，光标在中间，再打 `)` → 光标右移一格，正文仍是 `()`（不是 `())`）。**`skip` 只对空选区生效**（P2-5）：纯函数判不出选区（签名里没有），插件在执行 `skip` 前必须判 `view.state.selection.empty`；非空选区**不得**走 `skip`，交回配对/默认。否则「选中 `文字`、光标后紧跟 `)`、再按 `)`」会吞掉这次输入并把选区折叠。纯函数旁写一行注释说明这条边界。
     2. **引号方向**：`inserted` 是 `"` 时，`before` 末字符为空、空白或 `([{“‘` → 开引号 `“`；否则闭引号 `”`。`'` 同理但更保守：`before` 末字符是拉丁字母或数字时**返回 `null`**（`don't`、`1990's` 必须能原样打出来）。
     3. **破折号**：`inserted === '-'` 且 `before` 以 `-` 结尾 → `{ kind: 'replace', from: -1, to: 0, text: '—' }`（即 `--` 变**一个** `—`，`a--b` 得 `a—b`）。**这条的精确行为要保住 `---` 还能出分隔线**：第三个 `-` 的 `before` 是 `—`，不命中本规则 → 交回 StarterKit 的输入规则（`@tiptap/extension-horizontal-rule/dist/index.js:62` 的 `/^(?:---|—-|___\s|\*\*\*\s)$/` 有 `—-` 兼容分支），于是 `---` 先变 `—-` 再出 `<hr>`。e2e 第 9 条锁死这一点。
     4. **省略号**：`inserted === '.'` 且 `before` 以 `..` 结尾 → `{ kind: 'replace', from: -2, to: 0, text: '…' }`。
     5. **中文后半角标点**：`inserted ∈ , ; : ? !` 且 `before` 末字符是 CJK（`\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af`）→ 换成 `，；：？！` 对应字符。**不含 `.`**（与 `...` 抢同一个键，写进「已知限制」）。`1,000`、`a,b`、`v1.2` 不许改（单测锁死）。
     6. **自动配对**：`inserted` 是 `(`、`[`、`{`、`"`（会判定为开引号时）、`'`（会判定为开引号时）→ `{ kind: 'insert', text: 左 + 右, caret: 1 }`。**反引号不进配对表**（P1-4，规则末字符是反引号时一律返回 `null`）：反引号与 `Code` 的输入规则（`@tiptap/extension-code/dist/index.js:108-110` 的 `addInputRules`，规则源码 `:20-29`，正则形状是「反引号 + 非反引号内容 + 反引号」）抢同一次输入，配对或越过会打断「打一对反引号包住 `a` → 行内代码」。
     - 有选区时包住选区（选中 `文字` 按 `(` → `(文字)`，光标落外侧）：**由插件做**（纯函数看不到选区）——先 `tr.insertText(close, to)` 再 `tr.insertText(open, from)`，最后把光标放到 `from + open.length + (to - from) + close.length`。
   - 硬性排除（四条都要写进代码注释；逐条都在插件层判、纯函数不管：
     - `$from.parent.type.spec.code` 为真（代码块）→ `return false`；
     - 选区带 `code` mark → `return false`；
     - `!$from.parent.isTextblock`（公式等非文本块）→ `return false`；
     - `view.composing` 为真 → `return false`。
     - **不做成对退格**（P1-2）：本轮**完全不碰 `Backspace`**，不写 `handleKeyDown`，插件只有 `handleTextInput` 一个 prop。ProseMirror 的组合输入不走 `handleTextInput`，中文输入法组合态天然安全（Typora 自己在 `Docs/Change Log.md:421` 记过这个坑）。`handleTextInput` **不命中时必须返回 `false`**——`prosemirror-view` 的 `someProp` 按真值判断（`node_modules/prosemirror-view/dist/index.js:5766-5781`），返回 `false` 不会截断后续 prop，输入规则还能照常跑（`node_modules/prosemirror-inputrules/dist/index.js:75-77,92-132`）；返回 `true` 才会吞掉别人。
   - 每次替换用一个 transaction（`replaceWith` + `setSelection` 一次 dispatch），`Ctrl+Z` 一次撤掉这条改动。
2. `src/lib/settings.ts`：`Settings`（`:6-23`）加 `smartPunctuation: boolean`；`DEFAULT_SETTINGS`（`:30-41`）加 `smartPunctuation: true`；`loadSettings`（`:60-91`）返回值里写 `smartPunctuation: parsed.smartPunctuation !== false`（照 `:86` 的 `autoSave` 写法，**旧存档读出来是 true**，不动其他键）。
3. `src/components/SettingsDialog.tsx`：照 `:72-80` 的「自动保存」块复制一个 `label.field.field-check` 复选框（`checked={draft.smartPunctuation}`）+ 一行 `p.field-hint`「只作用于键盘输入，不改已有正文；代码块内不转换」。**这段文案落在惰性 `SettingsDialog` chunk，不计入首屏**（`findings-ship.md:16`）。
4. `src/App.tsx`：
   - 在 `shortcutExtension`（`:703-716`）旁边加：`const smartPunctRef = useRef(true)`、`useEffect(() => { smartPunctRef.current = settings.smartPunctuation }, [settings.smartPunctuation])`、`const smartTypingExtension = useMemo(() => createSmartTyping({ isEnabled: () => smartPunctRef.current }), [])`。**必须定义在 `useEditor`（`:718`）之前**，并加进 `extensions` 数组（`:719-744`）。不许把 `settings` 放进 `useEditor` 的依赖——那会重建编辑器、丢撤销栈。
5. 新测试 `src/lib/smartTyping.test.ts`：`node:test` + `node:assert/strict`（照 `src/lib/settings.test.ts:1-21`）。**只测纯函数**，覆盖：
   - 引号开/闭（空、空格、`(` 后是开引号；`引` 后是闭引号）；`don't`、`1990's` 原样返回 `null`；
   - 越过关闭符 → `{kind:'skip'}`（`after` 以 `)` / `”` 开头）；
   - `--`→`—`（`{kind:'replace',from:-1,to:0}`）、`...`→`…`（`from:-2`）、`----` 不连续吞；
   - 中文后 `, ; : ? !` 五条映射；`中文.` 不转（返回 `null`）；
   - `1,000`、`a,b`、`v1.2` 不转；
   - 配对：`(`、`[`、`{`、`"`、`'`（开引号位）→ `{kind:'insert',caret:1}`；`'` 在字母后 → `null`；反引号 → `null`（锁死 P1-4 的决定）；
   - 不命中 → `null`（不是 `false`、不是 `undefined`）。
   - **不要**在单测里写「代码块内跳过」「`isEnabled()` 为 false 全不转换」——这两条是插件层判据（要 `view.state` 与闭包），纯函数测不了；由 e2e 第 7 条（代码块）与第 12 条（关开关）覆盖。
6. `package.json` 的 `test` 脚本（`:14`）末尾追加 `&& node --experimental-strip-types src/lib/smartTyping.test.ts`。

**实施步骤（先量后写，P1-3）**

1. 量基线：`npx tsc --noEmit`（应无输出）→ `npx vite build --outDir .tmp/build-r33` → `node scripts/measure-first-screen.mjs --dir .tmp/build-r33`，记下 gzip（预期 285,052）。
2. 写 `src/lib/smartTyping.ts`（纯函数 + 插件）与单测，`node --experimental-strip-types src/lib/smartTyping.test.ts` 全绿。**此步不碰设置项、不写 e2e。**
3. 接进 `App.tsx` 的 `extensions`（`isEnabled: () => smartPunctRef.current`，ref 初值 `true`），`npx tsc --noEmit` 通过。
4. **决策点 A**：`npx vite build --outDir .tmp/build-r33` + measure，记 `T_A` 并按全轮硬约束 3 走分支。`T_A ≤ 285,700` 才继续下一步。
5. 补 `settings.ts` 字段 + `SettingsDialog` 复选框 + `App.tsx` 的 ref 接上 `settings.smartPunctuation`；`npx tsc --noEmit`；再构建 + measure 记一次（这是 T1 的最终值，也是本轮唯一一次体积承诺的实测值）。
6. E2E：`.tmp/e2e-r33-t1-typing.mjs`（先 `node .tmp/reset.mjs 9222`），`page.keyboard.type()` 逐段输入并断言正文。**按 1→12 的顺序执行**（12 关开关，必须在最后的打开态断言之后，P1-2）。每步之间 `await page.waitForTimeout(150)`，每步前 `Control+a` + `Delete` 清空并等 200 ms；断言失败时把 `.editor` 的 `innerHTML()` 打进日志再抛。
   1. `"引用"` → `“引用”`
   2. `a--b` → `a—b`
   3. `c...d` → `c…d`
   4. `中文,句` → `中文，句`
   5. 依次打 `(` `[` → 正文 `([])`（每打一个左符号补右半边、光标停在里侧，所以是嵌套，**不是** `()[]`）
   6. 选中 `文字` 按 `(` → `(文字)`
   7. 先打三个反引号再按 Enter 建出代码块，块内打 `--` 与 `(` → 原样（`--`、`(` 都不变，不补右括号、不变破折号）
   8. 打一对反引号包住 `a`（即 `` 反引号 + a + 反引号 ``）→ 出现 `code` 元素且正文里没有裸反引号（回归：`Code` 输入规则没被打断；P1-4）
   9. 空段落里直接打 `---` → `.ProseMirror hr` 数量 1（回归：`—-` 兼容分支仍能出分隔线；**不要**写成「再按 Enter」；revisor 零改动实测：第三根 `-` 打完就出 `<hr>`，不需要按 Enter）
   10. 撤销：打 `x` → 等 700 ms → 打 `--` → 等 300 ms → **先断言正文含 `—`** → `Control+z` 一次 → 再断言正文里没有 `—`（允许留在 `x-` 或 `x`；先断含、再断不含，否则插件没写时这条也绿，P2-4）
   11. `——` 的写法（P2-3）：清空后打 `x` → 连打四根 `-` → 正文是 `x——` 且 `.ProseMirror hr` 数量 0（证明「段落开头出分隔线、已有文字时才出 `——`」这条已知限制的写法成立；若实测不是 `x——`，按实际结果改 `impl.md` 的已知限制，不要硬凑）
   12. **关开关（必须放最后一条）**：`page.evaluate(() => localStorage.setItem('sidelight.settings.v1', JSON.stringify({ smartPunctuation: false })))` → `page.reload()` → 等 `.ProseMirror` → `Control+a` + `Delete` 清空 → 打 `"a"` 与 `a--b` → 仍是直引号且正文是 `a--b`（**用 localStorage + reload，不去点对话框**，省掉易碎选择器；**顺序是验收的一部分**：第 8–11 条必须在开关打开态跑，关完不 reload 回来就作废——P1-2）
   截图 `shots/round-33/t1-smart-typing.png`（正文含 `“引用”` 与配对括号）、设置对话框 `shots/round-33/t1-settings-smart.png`（点顶栏 `设置` 按钮，`App.tsx:4397-4398`，截图后 `Esc` 关掉，不保存）。
7. 复量体积并确认 `measure-first-screen.mjs` PASS；把 `T_A`、T1 最终值、12 条断言结果（含第 12 条在关开关前跑的证明）写进 `impl.md`。

**验收（可执行）**

- `npx tsc --noEmit` 无输出。
- `node --experimental-strip-types src/lib/smartTyping.test.ts` 全 PASS；`npm test` 变成 **22 个文件**，条数 = 276 + 新增条数（把实际数字写进 `impl.md`）。
- **决策点 A 有实测记录**：`impl.md` 里贴了 `T_A` 的 `raw=`/`gzip=`/`total` 原始输出，且 `T_A ≤ 285,700`（否则按兜底梯子走了，也要贴复测值）。
- `.tmp/e2e-r33-t1-typing.mjs` 上述 **12 组**断言全 PASS，**执行顺序与第 6 步一致**（第 12 条关开关在最后），日志留 `.tmp/e2e-r33-t1-typing.log`。
- `node scripts/measure-first-screen.mjs --dir .tmp/build-r33` **PASS**（≤286,000）。T1 最终 gzip 目标 ≤285,700；走完兜底梯子仍 >285,700 时允许落在 285,700–286,000，但要在 `impl.md` 写明用了哪级兜底。
- 截图两张存在且能看到 `“引用”`、右半边括号、设置里新开关。
- `docs/CHANGELOG.md` 按全轮约束 1 的第 ① 条记一行（措辞按 revision 2 的 P1-5：不写「中文排版必需」）。

**门禁**：`npx tsc --noEmit`；`npm test`；`npm run roundtrip`（不改序列化，但加了编辑器插件，代价低，跑一次防回归）；体积测量。
**风险**：① 中文输入法组合态本机无真人输入法，**记 UNVERIFIED**（`page.keyboard.type` 不产生组合事件）；补测：真人用微软拼音在中文态各打一次 `"`、`,`、`--`、`...`，截图进 `shots/round-33/`，据此决定要不要把「西文态与混排」的说法再收一格。② 用户粘贴的引号不该被改——`handleTextInput` 天然不接粘贴，写进 `impl.md` 留痕。③ 转换会改保存字节（`--`→`—`），这是输入规则不是序列化，`roundtrip` 应仍 0 差异；若 `roundtrip` 报差异立刻停手复查。④ `settings.smartPunctuation` 漏进 `loadSettings` 会让老用户设置被吞——单测里加一条旧 JSON（`{"autoSave":false}` 这种没有新键的）读出来 `true`。⑤ **已知限制（写进 `impl.md`，不要悄悄做）**：中文后的 `.` 本轮不转 `。`；不配对反引号（保 `` `a` `` → 行内代码）；**没有成对退格**（一次退格只删一个字符，左右空配对 `()` 要按两次；`Backspace` 分支排下一轮）；中文排版常用的 `——` **不能**在空段落开头连打（P2-3 实测校准：零改动下打完三根 `-` 立刻出 `<hr>`，`hrCount=1`，连打四根是 `<hr>` + 新段落里一个 `-`；加了 T1 后第二根 `-` 已变 `—`，第三根让段落文本成 `—-`，命中 `@tiptap/extension-horizontal-rule/dist/index.js:62` 的 `—-` 分支，同样出 `<hr>`）。要 `——` 先打一个别的字：`x` + 四根 `-` → `x——`（e2e 第 11 条锁死）；行内链接文字、表格单元格内同样生效（Typora 也生效），本轮不额外屏蔽。
**体积**：以**实测**为准，进 `impl.md`；硬门 ≤286,000（决策点 A 的目标线 285,700）。不写死 400 B。
**截图**：`shots/round-33/t1-smart-typing.png`、`shots/round-33/t1-settings-smart.png`。

---

## T3（P1，S，发布门禁）验收脚本版本号写死 + 发版前 `FileVersion` 断言 + 门槛文案

> 本节按 critic 结论**原样保留**（revision 2 的 P0-1/P1-2/P1-3/P1-4/P1-5/P2-6 与 revision 3 的 P0-1/P1-2/P2-3/P2-4/P2-5 都不涉及它；critic 两轮都判 T3 PASS）。

**为什么**：`packaging/verify-installer.ps1:138,140` 判据写死 `StartsWith('0.31.1')`，`:144` 的 PASS 文案也写死，而脚本 `:20` 早就有 `$version`。这是 `packaging/README.md:43` 写明的验收脚本，**现在方向反了**：正确的 0.32.1 包（`host/bin/Sidelight.exe` 的 FileVersion planner 实测 0.32.1.0；现在重打一个包，setup 也是 0.32.1.0）会被判 2 个 FAIL，而真正的坏包（已发布的 0.32.1 资产，本机 `release/` 里那份实测 `FileVersion=0.31.1.0`，`findings-ship.md:20-29`）反而通过。同时发版流水线在 `windows-build` 里构建完就直接上传，**没有一处复查 FileVersion**，于是 0.31.1 的包装成 0.32.1 发了出去（AGENTS §8 已记过一次同类事故）。

**改动文件 / 函数**

1. `packaging/verify-installer.ps1`：
   - `:138` `$exeVersion.StartsWith('0.31.1')` → `$exeVersion.StartsWith("$version")`；
   - `:140` 同上（setup VersionInfo）；
   - `:144` PASS 文案 `'Sidelight.exe --version = 0.31.1'` → `"Sidelight.exe --version = $cliVersion"`。
   - 全文不许再出现字面量 `0.31.1`。**保持文件 UTF-8 BOM 不变**（AGENTS §8：用 `edit` 工具改，不要 `Set-Content` 重写，避免丢 BOM）。
2. `.github/workflows/release.yml`：在 `windows-build` 的 `- name: Upload Windows setup`（`:103`）**之前**、`Build installer and portable zip`（`:98-101`）之后，插入一步 `shell: pwsh`：

   ```yaml
   - name: Assert setup FileVersion matches package version
     shell: pwsh
     run: |
       $version = '${{ needs.preflight.outputs.version }}'
       $setup = Get-ChildItem release/Sidelight-*-win-x64-setup.exe | Select-Object -First 1
       if (-not $setup) { Write-Host "::error::没有产出 setup.exe"; exit 1 }
       $fv = $setup.VersionInfo.FileVersion
       if ($fv -ne "$version.0") { Write-Host "::error::setup FileVersion=$fv，应为 $version.0（安装器版本没有跟上 package.json）"; exit 1 }
       Write-Host "setup FileVersion=$fv"
   ```

   说明：`windows-build` 在 `windows-2022` 上跑（`:66`）、有 `needs: preflight`（`:65`），`pwsh` 可直接读 PE 版本信息；**不要**放到 ubuntu 上的 `release` job（`:188`）——在 Linux 上读 Windows PE 的 `VersionInfo` 跨平台行为本仓库没验证过，不冒险。
3. `packaging/README.md`：
   - `:42` 的「`P + 10,000` 门槛」→ 改成脚本真实输出：「打印实测字节、`target=820000 gap=`（内部预算，只报警）、硬报警线 850,000 B 与 SHA256」（`installer.ps1:89,112` 实际打印这两个值；全仓库搜 `10,000` 只命中这一行本身）。
   - `:57` 的「体积预算」补一句：「便携 zip 有独立门槛 940,000 B（`packaging/portable.ps1:15` 的 `$threshold`），不受安装包 850,000 B 约束」。

**实施步骤**

1. 改三处字面量（用 `edit` 工具），`Select-String -Path packaging\verify-installer.ps1 -Pattern '0\.31\.1'` 应为空。
2. 加 `release.yml` 一步，保持缩进与邻居一致（`windows-build` 的 steps 用 6 空格 `- name:`）。改完 `git diff .github/workflows/release.yml` 人工核一眼缩进（这里没有 YAML 解析器可跑）。
3. **本地正反复验断言逻辑**（把 YAML 里那 6 行原样拷进 `.tmp/r33-assert-fileversion.ps1`）。planner 本轮已用一条只读命令量过三个 exe（`(Get-Item $p).VersionInfo.FileVersion`），可直接引用：

   | 文件 | 长度 | FileVersion | 用途 |
   | :--- | ---: | :--- | :--- |
   | `release\Sidelight-0.32.1-win-x64-setup.exe` | 824,595 | **0.31.1.0** | 反例（应 exit 1） |
   | `host\bin\Sidelight.exe` | 87,040 | 0.32.1.0 | 对照 |
   | `.tmp\ship-check\ship-test.exe` | 826,742 | 0.32.1.0 | 正例（应 exit 0） |

   - 反例（应 exit 1）：把 `release\Sidelight-0.32.1-win-x64-setup.exe` 拷成 `.tmp/r33-fake-release/Sidelight-0.32.1-win-x64-setup.exe`，在同一目录跑断言 → 必须打印 `::error::setup FileVersion=0.31.1.0…` 并 exit 1。**这条正是本轮要拦的真实坏包**（发布资产 824,209 B 那一个也是同样的 0.31.1.0，见 `findings-ship.md:20-29`）。
   - 正例（应 exit 0）：把已有的 `.tmp/ship-check/ship-test.exe` 拷成同名的 `.tmp/r33-fake-release/Sidelight-0.32.1-win-x64-setup.exe`（覆盖反例），再跑一次 → PASS。
   - **只用 `.tmp/`，不准写 `release/`**；两次输出都贴进 `impl.md`。
4. 改 `packaging/README.md` 两行。

**验收**

- `Select-String -Path packaging\verify-installer.ps1 -Pattern '0\.31\.1'` 无输出；`-Pattern '\$version'` 命中行数 ≥3（`:20`、`:138`、`:140`、`:144`）。
- `powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1` **不要求跑通全套安装**（沙箱装不了系统级软件，第 33 轮 ship 侦察也没跑，`findings-ship.md:119`）；但版本判据必须可复验：把 `:137-144` 的判据抄进 `.tmp/r33-version-check.ps1`，用 `$version = '0.32.1'` 对两个真实文件各跑一次——`host\bin\Sidelight.exe`（0.32.1.0）应 PASS，`release\Sidelight-0.32.1-win-x64-setup.exe`（0.31.1.0）应 FAIL。**改前先跑一遍**（`host\bin\Sidelight.exe` 现在会被判 FAIL，就是 bug 的复现），改后再跑一遍（PASS）。两遍输出都贴进 `impl.md`。
- `git diff --stat` 只含 `packaging/verify-installer.ps1`、`.github/workflows/release.yml`、`packaging/README.md`（+ `docs/CHANGELOG.md`）。
- 反例脚本输出 `FileVersion=0.31.1.0` 并以 exit 1 结束（`$LASTEXITCODE` 记 1）；正例 exit 0。
- `docs/CHANGELOG.md` 记一行。

**门禁**：上面的正反复验两条命令；`git diff` 人工自查；不涉及 `npm run build`/`npm test`（改的是脚本与 YAML）。
**风险**：① 沙箱内**没有真实 CI**，`release.yml` 新步骤本轮无法实跑 → 记 UNVERIFIED，补测方法写在 `impl.md`：下次发版后到 Release 页下载 setup，`(Get-Item .\Sidelight-X-win-x64-setup.exe).VersionInfo.FileVersion` 必须等于 `X.0`（`findings-ship.md:29` 第①条）。② `verify-installer.ps1` 全文无 `0.31.1` 之后，它仍需要真机安装才有完整结论，本轮只验判据。③ 有人把 `$version` 写成 `${{ }}` 表达式时 `pwsh` 里是字符串插值，注意引号（示例已用单引号包 `${{ }}`，YAML 里正确）。
**体积**：0 B。
**截图**：不需要（无界面变化）。

---

## 文件归属与执行顺序

| 任务 | 文件 | 执行者 |
| :--- | :--- | :--- |
| T1 | `src/lib/smartTyping.ts`(新)、`src/lib/smartTyping.test.ts`(新)、`src/lib/settings.ts`、`src/components/SettingsDialog.tsx`、`src/App.tsx`(扩展注册区 `:703-744`)、`package.json`(test 脚本)、`docs/CHANGELOG.md` | 代理 A |
| T3 | `packaging/verify-installer.ps1`、`.github/workflows/release.yml`、`packaging/README.md`、`docs/CHANGELOG.md` | 代理 B 可并行 |

- 顺序：**代理 B 先跑 T3**（快、无 e2e、不占 5175），代理 A 做 T1（含决策点 A）。两者文件不重叠。
- **`src/App.tsx` 只有 T1 改**（T2 已删除，`handlePaste` 本轮不动）。
- `docs/CHANGELOG.md` 两边都会碰：约定 **A 写自己那行，B 只把自己那行交给根代理**；`package.json` 只由 A 改。
- 若只能派一个代理：T3 → T1 顺序做，约 27 分钟。
- **轮次收尾（根代理做）**：按 P0-1 的要求在 `docs/iteration/STATE.md:55` 的「下一轮优先」里加一句「第 33 轮 critic 实测：粘贴为纯文本与 URL 贴选区变链接都由 Chromium/Tiptap 内置提供（StarterKit 默认注册 Link，`linkOnPaste` 默认 true），不要再排」，并把该行现有的「粘贴为纯文本排队」删掉。`findings-typora.md` 2.4 的那句本修订已写入。

## 不在本轮范围（写清原因，别让下一轮猜）

1. **成对退格（T1 的一部分，P1-2 移出）**：左右正好是一对空配对 `()` 时一次 Backspace 删两边。移出理由：它必须用 `handleKeyDown` 抢 `Backspace`，而 `handleTextInput` 收不到退格，两条规则在原计划里自相矛盾；单写一个 Backspace 分支要再加约 20 行 + 组内 `handleKeyDown` 的边界（表格、列表、选区、IME），约 5 分钟且不测就没有证据。**写进 T1 的「已知限制」**，下一轮与「`()` 内一次退格」一起考虑。
2. **工作区图片破图（Typora P1，第 32、33 轮连续两次未修）**——本轮仍不做，但**下一轮第一件事**。理由：实现要动 5 处（`src/lib/imageResolver.ts` 新文件、`Image` 的 `addNodeView`、`src/lib/asset.ts` 的落盘规则、`host/Program.cs` 的 `/__asset` 只读路由、`settings.ts` 的图片目录项），约 110 行 TS + 20 行 C#，加宿主重建与 `host-smoke`，单代理约 60 分钟，**塞不进 35 分钟**。**字节不再是障碍**：`measure-first-screen.mjs` 只统计 `index.html` 直接引用的文件，把解析器写成 `await import()` 惰性 chunk 后首屏增量 <100 B（照 `src/lib/katexLazy.ts` 的既有做法）。下一轮起步方案：懒加载解析器 + NodeView（DOM 仍是 `<img>`，`src` 用 blob URL，`data-md-src` 存原相对路径，`renderHTML` 与序列化仍读 `node.attrs.src`，**存盘字节不变**）+ 宿主 `/__asset?path=` 限工作区内。UNVERIFIED 提醒：假 FSA 工作区写不出真 PNG 字节，首轮验证要靠真实文件夹或宿主。
3. **表格列宽拖拽（Typora P1，第 32 轮排队）**：`Table.configure({ resizable: true })` + `.column-resize-handle` 样式 + 序列化必须剥 `colwidth`（否则「保存前对比」每次报规范化），约 +1.5–2 KB gzip，且要连带验 `tableReuse` 整块复用。单独立轮。
4. **代码块语法高亮（Typora P1）**：要新增 1 个运行时依赖（`highlight.js/lib/core` + 10–12 语言），懒加载 chunk +15–20 KB，安装包距硬线只剩 25,791 B（`findings-ship.md:85`）。ADR 级决策，先问产品负责人。
5. **finder-bug 两条 P2**：① `createFolder`（`src/App.tsx:2315-2336`）接受点开头的名字，`readDirectory`（`src/lib/workspace.ts:94`）一律跳过 `.` 开头 → 提示成功但文件树永不显示、应用内删不掉；② 删除确认框（`src/components/TreeActions.tsx:287-293`）干净分支写「要恢复，用文件管理器把 trash 里的文件移回原位」，紧接着的提示就带「撤销」按钮。两条合计约 15 行、零字节、用户可见，**下一轮和图片破图一起做**（同属文件树/文件操作面）。
6. **finder-ship 其余项**：`release.yml` 抽公共 fetch + 哈希校验（`:84-93` 依赖 CI 预热 cache，冷缓存落到未校验下载路径）——改的是发版可用性，但不是「用户可见」，且本轮无法实跑 CI，排到发版前一轮；`ci.yml` 便携 zip 上传缺失与重复 `measure`（`findings-ship.md:62-70`）；`installer.ps1:35` 换固定 URL + 哈希；`release/SHA256SUMS.txt` 是 0.26.0 的残留（本地卫生，`release/` 不进版本控制）。
7. **Mermaid**：ADR-0017 的三选一仍等产品负责人裁决，未裁决前不引依赖、不改安装包硬线（STATE「决策记录」2026-11-17）。
8. **Typora 其余 P2**：侧栏宽度拖拽、大纲全部折叠/过滤、禅模式、查找区分大小写/整词、`docs/typora-gap.md` 过期修正（21 有 / 18 缺 → 应收敛为 26 有 / 17 缺）。全部排在 P1 之后。
9. **本轮的第二个用户可见任务：不填**（T2 删除后腾出约 6 分钟，不自动拿别的任务补位）。理由就是这一轮 P0-1 的教训：**没做零改动基线探针的「缺」不算缺**——revision 2 的 T2 两次被同一条推翻（先「纯文本粘贴」，后「URL 贴选区」），两次都是 Tiptap/Chromium 已经会做，e2e 断言零改动就绿。替补候选必须先跑一次零改动探针、证明做不到，才配写进计划；本轮不承担这个验证预算。若根代理仍要第二个人可见任务，最短路径是「不在本轮范围」第 5 条的两条 finder-bug P2（已有复现日志，不是猜测），但要接受它把下一轮的「图片破图 + 文件树两条」拆开。

## 证据与 UNVERIFIED（本轮实读/实跑，不是引述）

- 本轮修订亲自 `read` / `Select-String` 复核的行号：`src/App.tsx:9`（`TextSelection` import）、`:703-716`（`shortcutExtension`）、`:718-744`（`extensions` 数组）、`:749-796`（`editorProps.handleKeyDown` 里已有 `editor?.chain()`）、`:805-811`（`handlePaste`，只接 `image/*`）、`:4259`（`setTextSelection({from,to}).extendMarkRange('link').setLink({href})`）、`:4397-4398`（顶栏「设置」按钮）；`src/lib/settings.ts:6-23,30-41,60-91`（类型/默认值/`loadSettings`，`:86` 是要照抄的布尔写法）；`src/components/SettingsDialog.tsx:72-80`（自动保存复选框，可复制）；`src/components/ShortcutsDialog.tsx:22-40`（「编辑与批注」组，**本轮不改**）；`src/lib/settings.test.ts:7-15`（`makeStorage` 桩）、`:26`（动态 import `loadSettings`）；`package.json:14`（`test` 是 21 个文件的显式清单）、`:3`（version 0.32.1）；`scripts/measure-first-screen.mjs:2,14,16`（`--dir` 与首屏集合）。
- 输入规则与 prop 机制（本轮实读 `node_modules`）：`prosemirror-view/dist/index.js:5766-5781`（`someProp` 按**真值**取第一个结果 → `handleTextInput` 返回 `false` 不截断后续 prop）；`prosemirror-inputrules/dist/index.js:75-77,92-132`（输入规则本身就是 `handleTextInput` 的一个 prop，未命中 `return false`）；`@tiptap/extension-code/dist/index.js:20-29,108-110`（`` `a` `` → 行内代码的输入规则，所以反引号不配对）；`@tiptap/extension-horizontal-rule/dist/index.js:62`（`/^(?:---|—-|___\s|\*\*\*\s)$/`，`—-` 兼容分支是 `---` 仍能出 `<hr>` 的依据）。
- P0-1 的证据来自 critic 的实跑（`plan-review.md:37-55`）：`.tmp/r33-critic-probe-clip.ts`（TS2339 两处）、`.tmp/e2e-r33-critic-paste.mjs`（`paste` 事件无键位）、`.tmp/e2e-r33-critic-richtml.mjs`（原生 `Control+Shift+V` 已是纯文本）。三个文件本轮都在 `.tmp/` 里，可复跑。
- **revision 3 的 T2 删除证据（本节 revisor 亲自复跑，CDP 9222，每次先 `node .tmp/reset.mjs 9222`）**：
  - 源码：`@tiptap/starter-kit/src/starter-kit.ts:243-244`（`if (this.options.link !== false) extensions.push(Link.configure(...))`）；`src/App.tsx:720` 只写了 `StarterKit.configure({ strike: false })`，没有 `link: false`；`@tiptap/extension-link/src/link.ts:258`（`linkOnPaste: true`）、`:542-551`（`if (this.options.linkOnPaste)` 挂 `pasteHandler`）；`helpers/pasteHandler.ts:19-50`（`handlePaste: (view, _event, slice)`，`if (empty) return false`，`find(textContent)` 命中整体即 `setMark(type,{href})`）。
  - 运行时（`.tmp/e2e-r33-critic-linkpaste.mjs` 原样复跑，输出原文）：`文字` + `Shift+Home` + 剪贴板 `https://example.com` + `Control+V` → `<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">文字</a></p>`，`anchors=1`，`linkText=["文字"]`；空选区贴同一 URL → `<a href="https://example.com">https://example.com</a>`；`https://example.com 说明` → `<a href="https://example.com">https://example.com</a> 说明`。
  - 排除分支零差异（`.tmp/e2e-r33-critic-codepaste.mjs`）：代码块里选中 `abc` 贴 URL → `<pre><code>https://example.com</code></pre>`、`anchors=0`。
  - P2-3 的 `---` 行为（本修订新写 `.tmp/e2e-r33-rev3-hr.mjs`，零改动）：空段落打 `---` → `hrCount=1`（不按 Enter）；空段落打 `----` → `<hr>` + 新段落里 `-`；`x----` → 仍是字面量 `x----`、`hrCount=0`（这条给 T1 后的 `x——` 当对照）。
  - `handleTextInput` 的调用约定（`prosemirror-view/dist/index.js` 两处调用点）：`f(view, sel.$from.pos, sel.$to.pos, text, deflt)` / `f(view, chFrom, chTo, text, deflt)`——`from`/`to` 就是选区或改动区间，所以插件能在 `handleTextInput` 里判出非空选区（P2-5 的修法有依据）。
- 体积基线（finder 实跑，`findings-ship.md:11-16`）：首屏 gzip 285,052 / 286,000；主 chunk 894,163 raw → 278,024 gzip（31%）；懒 chunk `SettingsDialog` 4,555 B（所以设置项文案不进首屏）。
- 版本信息实测（planner 实跑 `(Get-Item $p).VersionInfo.FileVersion`）：`release\Sidelight-0.32.1-win-x64-setup.exe` 824,595 B → **0.31.1.0**（ProductVersion 0.32.1）；`host\bin\Sidelight.exe` 87,040 B → 0.32.1.0；`.tmp\ship-check\ship-test.exe` 826,742 B → 0.32.1.0。
- **UNVERIFIED（本轮测不了，不得写成实测）**：
  1. 真实中文输入法中文态是否本来上屏全角（P1-5 的前提；本机无真人输入法，`page.keyboard.type` 不产生组合事件）。补测见 T1 风险①。
  2. T1 的真实体积增量：本轮只折算（600–950 B），**以决策点 A 的实测为准**。
  3. `release.yml` 新步骤在真实 CI 的首次运行：本机无 CI。
  4. `verify-installer.ps1` 完整安装链（沙箱不能装系统级软件，`findings-ship.md:119-120`）。
  5. T1 第 11 条断言（`x` + `----` → `x——`）：**按规则推导**（第二根 `-` 变 `—`、第三根成 `—-` 不命中 HR 规则的前缀条件、第四根再变 `—`），revisor 只实测了「零改动下 `x----` 保持字面量、`hrCount=0`」，**T1 落地后要按 e2e 实测为准**；若实测不是 `x——`，改 `impl.md` 的已知限制，不要硬凑。

## 修订记录 · revision 2（第 1 次修订，逐条对应 `plan-review.md`）

> 下表是当时的记录，其中提到的「T2」「e2e 第 9–11 条」「四级兜底梯子（含 ④ T2 顺延）」已被 revision 3 取代：T2 整节删除、回归断言重编号为 8–11、兜底梯子剩三级。

| 漏洞 | 原稿问题 | 本修订怎么改 | 落在哪 |
| :--- | :--- | :--- | :--- |
| **P0-1** T2 判据不成立 + 原生已有 | `shouldPastePlain(event)` 吃 `ClipboardEvent` 无键位字段（TS2339），运行态也拿不到；原生 `Ctrl+Shift+V` 已是纯文本，e2e 断言 2、3 假 PASS | T2 **收窄**为「URL 贴到选区变链接」：不读键位、`asHttpUrl` 纯函数 + `handlePaste` 一条分支；删掉 e2e 断言 2、3；删 `ShortcutsDialog` 那一行；CHANGELOG 不写「粘贴为纯文本」；新增决策点 B 的字节门 | T2 全节、全轮约束 1、文件归属表 |
| **P1-2** 规则自相矛盾 + 签名缺 `after` | 要成对退格又禁 `handleKeyDown`；`smartInput(before, inserted)` 写不出「越过」单测 | 签名改 `smartInput(before, inserted, after)` 并明确 `SmartResult` 三种返回值；**成对退格整条移出本轮**，写进 T1 已知限制与「不在本轮范围」第 1 条；插件只有 `handleTextInput` 一个 prop | T1 规则 1、硬性排除、T1 验收、已知限制 |
| **P1-3** 400 B 预算无依据 + 兜底救不回 | 400 B 是拍的（实算 600–950 B）；兜底只值 100–200 B；设置项文案在惰性 chunk | 改「先量后写」：先写插件接线、**立刻构建量 `T_A`**，再补设置项与 e2e；四级兜底梯子（① CJK 半角 ② 配对收窄 ③ 配对整条顺延 ④ T2 顺延）；上限不抬；`T_A`/`T_B` 必须贴原始输出 | 全轮约束 3、T1 实施步骤 4、T1/T2 验收 |
| **P1-4** 缺回归断言，反引号配对会打掉行内代码 | 配对表含反引号且会「越过」，`Code` 的输入规则收不到收尾反引号；且无撤销断言 | **反引号从配对表删除**（附 `node_modules` 证据）；e2e 加 3 条回归：`` `a` ``→`code`、`---`→`hr`、`Control+z` 一次把 `—` 撤掉（不赌 history 分组） | T1 规则 6、e2e 第 9–11 条、证据段 |
| **P1-5** 「必须切输入法」未校准 | 把未验证前提当卖点，同时又把它列进 UNVERIFIED | 卖点改成「西文态/半角态与中英混排输入」；CHANGELOG 不得写「中文排版必需」；输入法从「风险」降为「已知限制 / UNVERIFIED 1」，补测方法写清 | T1 为什么/收益范围、全轮约束 1、UNVERIFIED 1 |
| **P2-6** 纯文本分支的落点与 `!text` 吞图片 | 段落插进代码块/表格会撑破结构；`return true` 吞图片粘贴 | 收窄后**不再插入任何段落**，结构问题消失；新分支：空选区 `return false`、代码块/`code` mark 排除、非 URL `return false`（图片分支仍在最前） | T2 改动文件 §3、T2 风险①、e2e 断言 2 |

## 修订记录 · revision 3（第 2 次修订，逐条对应 `plan-review.md` revision 2）

| 漏洞 | 原稿问题 | 本修订怎么改 | 落在哪 |
| :--- | :--- | :--- | :--- |
| **P0-1** 新 T2 是重复实现，断言 1 零改动就绿 | `Link` 由 StarterKit 默认注册、`linkOnPaste` 默认 true，`pasteHandler` 与 T2 做同一件事；revisor 零改动实测即 `<a href>`，原生还多覆盖「空选区自动成链」「URL + 说明只给 URL 加链」；代码块排除分支也零可见差异 | **T2 整节删除**（`linkPaste.ts`/`linkPaste.test.ts`/`App.tsx` 的 `handlePaste` 分支/`e2e-r33-t2-urlpaste.mjs`/决策点 B/`T_B`/文件归属表 T2 行/全轮约束 1 的 CHANGELOG 第 2 行/约束 3 的 ④）；`findings-typora.md` 2.4 已写入「不要再排」；`STATE.md:55` 交根代理收尾时改（AGENTS §7 规定 STATE 由根代理更新，计划里已列为收尾步骤）；不补第二个人可见任务，理由写进「不在本轮范围」第 9 条 | 本轮取舍、全轮约束 1/3、文件归属表、证据段、`findings-typora.md` 2.4 |
| **P1-2** 断言 8 关开关后，9–11 在功能关闭态跑，P1-4 的回归证据作废 | 原 `:95` 的 localStorage + reload 排在第 8，反引号/`---`/撤销三条在关闭态执行，插件坏没坏都绿 | 关开关挪到**最后一条（新 12）**，并在里面补「`a--b` 仍是 `a--b`」；T1 第 6 步与验收都写明「按 1→12 顺序执行，第 12 条必须在最后的打开态断言之后」 | T1 e2e 第 1–12 条、T1 实施步骤 6、T1 验收 |
| **P2-3** 「`——` 连打四次 `-`」在段落开头不成立 | revisor 实测空段落打 `---` 第三根就出 `<hr>`（`hrCount=1`），打 `----` 是 `<hr>` + 新段落 `-`；原写法会把实施代理带偏 | 已知限制改写：段落开头连打会出分隔线（零改动第三根就出 `<hr>`；T1 后第二根已变 `—`、第三根成 `—-` 命中 `—-` 兼容分支，同样出 `<hr>`），正确写法是「先打别的字：`x` + 四根 `-` → `x——`」，并加 e2e 第 11 条锁死；实测不是这个结果就按实际改已知限制 | T1 已知限制、T1 e2e 第 11 条、证据段 |
| **P2-4** 撤销断言删掉功能也绿 | 只断言「撤销后没有 `—`」，规则不存在时同样成立 | 改成两步断言：**先断言正文含 `—`**，`Control+z` 一次后再断言不含（允许留 `x-` 或 `x`） | T1 e2e 第 10 条 |
| **P2-5** `skip` 分支没限制空选区 | 非空选区 + 后面紧跟 `)` 时按 `)` 会吞掉这次输入、折叠选区 | 规则 1 写明 `skip` 只在 `view.state.selection.empty` 时执行；非空选区交回配对/默认；纯函数旁写注释说明「skip 只对光标」（`handleTextInput` 的 `from`/`to` 就是选区，插件判得出） | T1 规则 1、T1 改动文件 §1（插件层） |

- 5 条全部落在 T1 与 T2 的删除上；**T3 一字未改**（critic 两轮都判 PASS）。
- 任务量复核：T1 ≈20 分钟、T3 ≈7 分钟，单代理合计 ≈27 分钟，仍在 35 分钟上限内；T2 删除后没有跨任务的文件冲突（`src/App.tsx` 只由 T1 改）。
- 验收可复现性复核：新增/改动的每条断言都能用 `.tmp/e2e-r33-t1-typing.mjs` 一条命令复跑；第 11 条是推导 + 待实测，已单列为 UNVERIFIED 5，不写成既成事实。
