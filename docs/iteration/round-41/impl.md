# 第 41 轮 · 实施（executor）

- 轮次：round=41，nn=41；轮前 `startSha=25297acee40d40fec4bcbe770c416f43faaf2d7a`（`git log -1` 实测 `25297ac`）。
- 输入：`docs/iteration/round-41/plan.md`（revision=2）、`plan-review.md`（revision=2 复审 PASS，0 P0 / 0 P1 / 3 P2）、`AGENTS.md` §4/§8、相关源码。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；E2E 用 CDP **9222**，每次先 `node .tmp/reset.mjs 9222`；未启动浏览器、未 kill `msedge`、未 `browser.close()`。
- 状态：**T1 / T2 / T3 全部完成**；`tsc` / `npm test` / `roundtrip` / 构建 + 首屏字节门全绿。不发版（`package.json` 的 `version` 未动，只改 `scripts.test`）。未 commit、未 push、`release/` 一个字节没动。

## 一、逐任务状态

| id | 标题 | 状态 | 门禁 |
| :--- | :--- | :--- | :--- |
| T1 | 正文与代码里的 `<` `>` `&` 保存后不再被写成实体 | **DONE**（含 H7/H8 的守卫与多行断言） | tsc 0 / 单测 24 + 3 / E2E 20 条 18 SAME / roundtrip 5·7 / 首屏 +594 B |
| T2 | 对话框/设置开着时自动保存不写盘，关掉后恢复 | **DONE**（H4：五个条件全改 ref + 三段恢复断言） | tsc 0 / E2E i0–i2 + 3 段全过 |
| T3 | 查找加「区分大小写 / 整词」 | **DONE** | tsc 0 / 单测 14 / E2E 4·2·1·3·4 + 无结果 + Esc |

## 二、改动文件

| 文件 | 改了什么 |
| :--- | :--- |
| `src/lib/codeScan.ts` | `mapOutsideCode` 的 `fn` 加第二参数 `start`（段落在输入里的绝对偏移）。`lineStart` 在**每行最开头**累加（`const at = lineStart; lineStart += line.length + 1`，在 `if (fenced[index]) return line` **之前**，三支共用——按 plan-review H10 的落点，不是写在 return 之后）；`mapOutsideInlineSpans` 加第四参 `lineStart`，把 `lineStart + last` 交给 `fn`。 |
| `src/lib/html.ts` | `escapeHtmlForParse` 改走 `mapOutsideCode`：围栏（含引用块围栏）与行内代码不转义。`repairHtml` 同段内两步：① 标签/注释还原，非 `!` 标签先在原文里找 `<名字`（名字取 `[a-zA-Z][a-zA-Z0-9-]*`，闭合标签先剥 `/`），找不到就保持实体（H5）；② 单遍实体解码 `/&(amp|lt|gt);/g`，三层守卫——原文含该实体字面则整类跳过、`amp` 前视守卫（H7）、`gt` 块首守卫（H1，前缀谓词含引用与列表标记）。 |
| `src/lib/html.test.ts` | 改写 1 条（`html.test.ts:19` 旧期望作废：正文 `&lt;` 现在还原成 `<`）+ 新增 14 条口径（块首/列表/行内代码后/多行 ⑮⑯⑰/围栏与行内代码不解码/字面实体保持/解码兜底/amp 前视 4 处/改过属性仍还原/解析前不转义围栏）。全部 24 条通过。 |
| `src/lib/risk.ts` | 只改 `:276` 的 label：`HTML 注释会被丢掉` → `HTML 注释的写法会被改动`。按 H6b 选①，**不做**围栏剔除。 |
| `src/lib/risk.test.ts` | **新建** 3 条（用 `classify`）：围栏里的注释不产生 `html-comment` 损失、修复后的真注释无损失、真丢注释仍 `blocking:true` 且文案锁住。 |
| `package.json` | 只在 `scripts.test` 末尾追加 ` && node --experimental-strip-types src/lib/risk.test.ts`（未重排、未改 glob、**未动 `version`**）。 |
| `src/App.tsx` | T2：5 个 ref（`pendingSwitchRef`/`pendingConfirmRef`/`closeRequestedRef`/`closeGuardOpenRef`/`settingsOpenRef`）+ 一条 effect 一次赋五个 + 一条并集 effect（开着就 `cancelAutoSave`，全关且脏就 `scheduleAutoSave`）；`runAutoSave` 守卫五个条件改读 ref。T3：`findCaseSensitive` / `findWholeWord` 两个 state，传进 `findAll` 并补依赖数组，`<FindBar>` 传 4 个 props。 |
| `src/components/FindBar.tsx` | 第一行加 `Aa` / `ab` 两个 toggle（`aria-pressed`、`title`、按下态 `is-on`）；`disabled` / Esc / Enter / `unavailableReason` 逻辑一行没动。 |
| `src/styles.css` | `.find-bar button.is-on`（accent 底 + `--accent-wash`，与 `.theme-options button.is-on` 同族）。 |
| `docs/CHANGELOG.md` | `## Unreleased` 追加「第 41 轮」四条 + 门禁与 UNVERIFIED。 |
| `src/lib/find.ts` / `find.test.ts` | `FindOptions` 扩为 `{ caseSensitive, wholeWord }`；`findAll` 按命中两端的 ASCII 词字符过滤；测试常量补 `wholeWord`，新增 3 条。 |

## 三、命令与结果

```text
npx tsc --noEmit                → exit 0（T1 后、T2 后各跑一次）
npm test                        → 28 个文件 362 条，fail 0
npm run roundtrip               → rich 5/7、source 7/7（04-reference-links 与 06-task-list 仍 diff，与第 40 轮同）
npx vite build --outDir .tmp/build-r41  → ✓ built in 489 ms（index-BEnc5Cau.js 905.63 kB / gzip 286.98 kB）
node scripts/measure-first-screen.mjs --dir .tmp/build-r41
                                → total raw=941412 gzip=291317 headroom=28683 files=3 max=320000
                                  target=310000 gap=18683 → PASS（第 40 轮 290,723 → 本轮 291,317，+594 B）
git status --short              → 只有本轮 11 个改动文件 + docs/iteration/round-41/ + shots/round-41/ + src/lib/risk.test.ts（未跟踪）
                                → docs/roundtrip-report.md 未变（无 M）
```

按 STATE 的构建纪律，`dist/` 只由根代理串行构建，本轮产物落在 `.tmp/build-r41`，`npm run verify` 由根代理收尾时跑。

### T1 改前 → 改后（`.tmp/e2e-r41p-t1.mjs before|after`，20 条种子）

改前 **5/20 SAME**，改后 **18/20 SAME**；`dialog:null` 全程、`errors:[]`。

| 种子 | 改前字节（摘要） | 改后 |
| :--- | :--- | :--- |
| `c1 a<b 是普通比较` | `a&lt;b` | **SAME** |
| `c2 如果 a < b 就换行。` | `a &lt; b` | **SAME** |
| `c3 条件 x<3 成立。` | `x&lt;3` | **SAME** |
| `c4 A & B 一起写。` | `A &amp; B` | **SAME** |
| `c5 如果 a > b 就换行。` | `a &gt; b` | **SAME** |
| `c6 围栏 if (a<b)` | `if (a&lt;b)`，`shown.code` 也是 `&lt;` | **SAME**，`shown.code` = `if (a<b) { n++ }` |
| `c7 行内 `` `<kbd>` `` | `` `&lt;kbd>` `` | **SAME**，`shown.code` = `<kbd>` |
| `c8 写成 &lt;div&gt; 才是字面。` | `写成 <div> 才是字面。`（实体被还原成真标签） | **SAME** |
| `h1 围栏 <div class="a">x</div>` | `&lt;div class…>x&lt;/div>` | **SAME** |
| `h2 围栏 if (a<b)` | `if (a&lt;b)` | **SAME** |
| `h3 行内 `` `<kbd>` `` | `` `&lt;kbd>` `` | **SAME** |
| `h4 围栏 <kbd>Ctrl</kbd>` | `&lt;kbd>Ctrl&lt;/kbd>` | **SAME** |
| `r1 正文 <!-- 备注 -->` | SAME | SAME |
| `r2 H~2~O` | SAME | SAME |
| `r3 [x](https://a.b/?x=1&y=2)` | SAME | SAME |
| `r4 $a < b$ 与 $c > d$` | SAME | SAME |
| `r5 含 & 的表（a & b / c < d）` | **DIFF**（表格补空格 + `a &amp; b`、`c &lt; d`） | **SAME**（整块写回原文，plan 风险 1 的断言成立） |
| `r6 单元格甲<br>乙` | SAME | SAME（`<br>` 仍是 hardBreak，字节含 `<br>`） |
| `r7 四空格缩进代码 if (a<b)` | DIFF：`` ```\n四空格 if (a&lt;b)\n``` `` | 仍 **DIFF**，字节与改前**逐字节相同**（见 §五 偏差 1） |
| `h12 缩进 ``` + 裸 HTML` | DIFF：`&lt;div&gt;甲&lt;/div&gt;` | 仍 DIFF，且 `<div>` 被吞（见 §六 已知限制 1，**下轮必修**） |

块首守卫（真打字，新文档；`## t1-block-start` / `## t1-reopen`）：

```text
第一行普通文字。      ← 先敲一行普通文字（H8：让前缀跨过一行）
>100 人的团队。       ← 再敲
## t1-block-start {"after2":"第一行普通文字。\n\n&gt;100 人的团队。\n\n- &gt;100 人",
  "hasGt":true,"hasListGt":true,"bareLineGt":false}
## t1-reopen {"blockquotes":0,"hasGtText":true,"text":"第一行普通文字。|>100 人的团队。|>100 人|"}
```

即：`未命名.md` 字节含 `&gt;100 人的团队。` 与 `- &gt;100 人`、行首没有裸 `>`；重开后 `blockquote` 数 **0**、正文里是字面 `>100 人的团队。`（`escapeHtmlForParse` 不转义 `>`，所以编辑器里一直是字面，符合预期）。

### T2（`.tmp/e2e-r41p-t2.mjs`）

```text
## i0 {"dirty":true,"name":"甲.md","dialog":"这篇还有没保存的改动|切到「未命名.md」之前，要先把当前这篇存下来吗？|取消|不保存|保存并切换","bytes":"# 甲\n\n甲的正文。\n"}
## i1 {"dialogStillOpen":true,"dirty":true,"bytes":"# 甲\n\n甲的正文。\n"}
## i2 {"name":"未命名.md","bytesOld":"# 甲\n\n甲的正文。\n","bytesNew":null}
## t2-cancel-resumes {"dialogOpen":false,"dirty":false,"bytes":"# 甲\n\n甲的正文。取消后该恢复的一句。\n","hasSentence":true}
## t2-saved-and-switch {"dirty":false,"name":"未命名.md","dialog":null,"hasSentence":true}
## t2-settings-open {"settingsOpen":true,"hasSentence":false,"bytes":"# 甲\n\n甲的正文。取消后该恢复的一句。保存并切换的一句。\n"}
## t2-settings-closed {"settingsOpen":false,"hasSentence":true}
## errors []
```

- `i1`：对话框开着 2.6 s 后 `甲.md` 字节**不含**「不该被保存的一句。」（改前会写进去）。
- `i2`：点「不保存」后 `甲.md` 等于原种子、`未命名.md` 不存在（`null`）。
- `t2-cancel-resumes`：点「取消」后自动保存**恢复**（不只是拦住）。
- `t2-saved-and-switch`：显式「保存并切换」照常写盘并切到 `未命名.md`，`dirty:false`。
- `t2-settings-open` / `t2-settings-closed`：设置开着不写盘，关掉后 2.6 s 写入。
- 旧脚本 `.tmp/e2e-r41-bug-i.mjs` 的 `## i1` 从「已写盘」翻成「未写盘」，是**预期翻转**，不算回归。

### T3（`.tmp/e2e-r41p-t3.mjs`，种子 `# State\n\nstate 与 STATE，还有 states。`）

```text
## t3-default   {"count":"1 / 4","toggles":{"Aa":{"pressed":"false","on":false},"ab":{"pressed":"false","on":false},"buttons":["Aa","ab","↑","↓","✕","替换","全部替换"]}}
## t3-aa        {"count":"1 / 2","Aa":"true"}
## t3-aa-ab     {"count":"1 / 1","Aa":"true","ab":"true"}
## t3-ab-only   {"count":"1 / 3","Aa":"false","ab":"true"}
## t3-both-off  {"count":"1 / 4"}
## t3-noresult  {"count":"无结果","dirsDisabled":[true,true]}
## t3-esc       {"findBar":false,"active":"tiptap ProseMirror editor doc-body ProseMirror-focused","mode":"edit"}
## t3-cjk-whole {"count":"1 / 1"}
## errors []
```

`aria-pressed` 与 `.is-on` 每次翻转都一致；Esc 仍只关查找、焦点回正文（第 35 轮行为不回归）。

源码模式回归（`.tmp/e2e-r41p-t3b.mjs`，T3 的第二段证据；新 toggle 不参与 `disabled`）：

```text
## source-mode-find {"mode":"source","note":"源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查","count":"",
  "disabled":[["Aa",false],["ab",false],["↑",true],["↓",true],["✕",false],["替换",true],["全部替换",true]]}
## after-esc {"findBar":false,"mode":"source"}     ← 一个 Esc 只关查找，没退出源码模式
## errors []
```

## 四、截图（`shots/round-41/`，7 张）

| 截图 | 内容 |
| :--- | :--- |
| `t1-fence-before.png` | 改前 `h2-围栏比较.md`：围栏里显示 `if (a&lt;b)` |
| `t1-fence-after.png` | 改后同一篇：围栏里是 `if (a<b)` |
| `t1-prose-amp.png` | `A & B 一起写。` 保存后（字节 = 种子） |
| `t1-code-html.png` | 围栏 `html` 块里的 `<div class="a">x</div>` 保存后（字节 = 种子） |
| `t1-block-start.png` | 块首守卫：重开是段落、`blockquote` 0 |
| `t2-dialog-blocked.png` | 「还有没保存的改动」对话框开着、状态栏不出现「已自动保存」 |
| `t2-after-discard.png` | 点「不保存」之后 |
| `t3-find-before.png` | 查找条默认态：`1 / 4` |
| `t3-find-toggles.png` | `Aa` + `ab` 都按下：`1 / 1` |

（共 9 张；finder 的 `bug-*` / `t1-table-typing.png` / `t2-find.png` / `t3-source-mode.png` / `ship-*` / `r41-ui-*` 一张未覆盖，实测 `LastWriteTime` 仍是 13:30–13:47。）

## 五、与计划的偏差（3 条，均为实测优先）

1. **`r7` 四空格缩进代码改后仍 **DIFF**，不是 plan-review H11 预期的 SAME。**原因：`escapeHtmlForParse` 的跳过表由 `fenceMap` 决定，而 4 空格缩进代码不是围栏 → 载入时 `<` 仍被转义成 `&lt;`；保存时序列化器把缩进代码写成围栏，`repairHtml` 现在跳过围栏 → `&lt;` 留在围栏里。**改前改后字节逐字节相同**（`# 缩进\n\n```\n四空格 if (a&lt;b)\n```\n`），所以不是回归，只是计划里「预期 SAME」写反了。没有为它改 `mapOutsideCode`（plan-review §五-2 明确要求）。
2. **`h12` 真丢块**（plan-review H12 的「若真丢块」分支）：改前 `&lt;div&gt;甲&lt;/div&gt;`、改后只剩 `甲`。按 H12 修法记录，**本轮未改 `fenceMap`**，下一轮修（见 §六 已知限制 1）。
3. **`lineStart` 的落点**用 plan-review H10 的「回调最开头累加」写法（不是 plan 正文的「三个 return 分支之外」）；`markdown.lastIndexOf('\n', …)` 的起点用 `Math.max(start - 1, 0)`（行长边界上空段不会错位到下一行；该边界段是空串、解码回调提前返回，两种写法字节相同，这版更稳）。
4. 另外 `html.test.ts` 实际新增 **14 条** `test()`（计划口径「16 条口径」里有几条合并在同一个 `test()` 里：⑧ 两条合一条、⑬ 的 4 处合一条、⑮⑯⑰ 合一条、解析前不转义那条是额外的），断言总数仍覆盖计划列出的 ①–⑰ 全部条目。

## 六、已知限制（必须下轮处理）

1. **【P2，新】「缩进 ≥4 的 ``` + 后面跟裸 HTML 行」会丢标签**。种子 `'     ```\n<div>甲</div>\n     ```\n'`：
   - 改前字节 `'```\n ```\n```\n\n&lt;div&gt;甲&lt;/div&gt;\n     \\`\\`\\`\n'`（实体文本保住）
   - 改后字节 `'```\n ```\n```\n\n甲\n\n \\`\\`\\`\n'`（`<div>`/`</div>` 被当 HTML 块，`generateJSON` 只留文字 `甲`）
   - 根因：`escapeHtmlForParse` 现在按 `fenceMap` 跳过「围栏」行，而 `fenceMap`（`src/lib/risk.ts:36-46`）比 CommonMark 宽松——4 空格缩进的 ``` 它也算开栏，于是紧跟的裸 HTML 行没被转义。
   - 修法（plan-review H12 已写）：给 `escapeHtmlForParse` 用 CommonMark 严格围栏判定（开栏 ≤3 空格缩进、收尾行同字符不短于开栏且不带 info），**不要**改 `fenceMap`（它还管 `risk.ts` 的往返/损失判定）。风险面很窄（文件里要出现「缩进 ≥4 的 ``` 行 + 后面跟裸 HTML 行」），但方向是**丢标签**，排在下一轮 P2 第一项。
2. **4 空格缩进代码块里的 `<` 仍被转义**（改前改后字节相同，非回归）。与 finder-ui F1（Tab 缩进语义）同族，`mapOutsideCode` 只认围栏与行内代码。
3. **任务列表项首行的 `>` 不在守卫里**（`- [ ] &gt;100 人` → 解成 `>100 人`）。实测 marked 在任务项里不把 `>` 当块级标记（`.tmp/rev-r41-probe-tasklist.mjs`，plan §风险已记），字节比多加一类守卫更接近今天。
4. **混写文档**：同一篇里既写 `&lt;` 字面又写裸 `&` 时，裸 `&` 那一处继续留在 `&amp;`（按种类整篇跳过的保守规则，写进 CHANGELOG 的 UNVERIFIED）。
5. `&amp;` 前视守卫的已知副作用：正文写 `R&D;2026` 这种「`&` + 字母 + `;`」时保持 `&amp;`，重开文本仍是 `R&D;2026`（正确，只是字节比「更彻底地解」远一点）。

## 七、UNVERIFIED

| 项 | 为什么 | 怎么补测 |
| :--- | :--- | :--- |
| 宿主 `close-request` 下自动保存不写盘 | 浏览器态没有 host（`window.__slDoc` 不存在），`close-request` 分支跑不到 | `node scripts/host-smoke.mjs` 加一条：触发关窗 → 等 2.5 s → 读 `/__doc`，字节应与触发前相同；或真机 Alt+F4 后看 `%LOCALAPPDATA%\Sidelight\drafts` 与文件 mtime |
| 真实 FSA 目录上的同一批 T1 种子 | 假 FSA 无权限模型，`createWritable` 永远成功 | 真机打开文件夹后跑 `.tmp/e2e-r41p-t1.mjs` 的同批种子 |
| 生产包里的同一路径 | 只跑了 dev server（`.tmp/build-r41` 只量了字节） | `npm run preview` 或宿主加载 `dist` 后重跑 T1/T2/T3 三段 |
| 深色主题下两个新 toggle 的对比度 | 本轮只截了浅色 | 切深色后再截图 |

## 八、新踩的坑

1. **`.mjs` 里不能写 TS 类型**：`node --experimental-strip-types` 只对 `.ts`/`.mts` 剥类型，探针写成 `.mjs` 会 `SyntaxError: Missing initializer in const declaration`。探针要么写纯 JS，要么存成 `.ts`。
2. **`page.fill('.find-bar .find-input', …)` 会命中两个输入框**（查找框 + 替换框），改用 `page.locator('.find-input').first()`。
3. **不要用 PowerShell 的 `-replace` 改含中文的 `.tmp/*.mjs`**（AGENTS §8 又说对一次）：`(Get-Content -Raw) -replace | Set-Content -Encoding utf8` 把整篇中文读成 ANSI 再写回，注释变乱码，还把 `// 注释` 与下一行代码粘成一行（`await page.keyboard.press` 被吞进注释里）。这一轮踩到后改用 `write` 工具整篇重写。
4. **`useRef<typeof pendingSwitch>(null)` 可以在 state 之后声明**：省掉给内联类型起名字，`tsc` 认。
