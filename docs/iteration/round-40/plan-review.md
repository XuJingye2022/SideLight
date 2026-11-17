# 第 40 轮计划审查（revision=2 复审，critic）

- 结论：**REVISE**（**1 P0** / 0 P1 / **2 P2**）
- 审查对象：`docs/iteration/round-40/plan.md`（`revision=2 · planner-revision · 2026-11-17`，573 行全读；轮前 `startSha=504dedd22b1133c7629bc1a437ca24b8a8889322`）
- 输入：plan.md、上一版 `plan-review.md`（H1–H12）、`AGENTS.md` §4/§8、`STATE.md`、`docs/CHANGELOG.md`、相关源码、`node_modules/marked` 实现与 `@tiptap/markdown` 类型
- 做法：只读。**未改产品代码、未起浏览器、未碰 dev server**；只写 `.tmp/critic-r40b-*` 探针与输出（`.tmp/` 已被 git 忽略）。所有结论都实跑探针或按 `文件:行号` 实查。
- 本轮新写探针（全部纯函数 / 纯 import 产品模块，不改产品代码）：
  - `.tmp/critic-r40b-codescan.ts`（**plan §T1 1a/1b/3 的代码逐字复制**，只把 `./risk.ts` 换成 `../src/lib/risk.ts`；tsc 见 §四）
  - `.tmp/critic-r40b-probe.mjs` → `.tmp/critic-r40b-probe.txt`（整链 today vs plan 修法，23 例）
  - `.tmp/critic-r40b-tokenizer.mjs` / `-tokenizer2.mjs` → `.txt`（tokenizer 有没有生效、marked 内部状态）
  - `.tmp/critic-r40b-tok3.mjs` → `.tmp/critic-r40b-tok3.txt`（**每个 mode 一个干净进程**：off / false / text / escape）
  - `.tmp/critic-r40b-unit.mjs` → `.tmp/critic-r40b-unit.txt`（plan §T1 步骤 6 的单测期望逐条跑）
  - `.tmp/critic-r40b-fixcand.ts` + `.tmp/critic-r40b-extchain.mjs` → `.tmp/critic-r40b-extchain.txt`（H13 的修法候选：类型与运行都验）

---

## 一、上一版漏洞复核（逐条，重点 H7 / H8）

| 编号 | 上一版要求 | 本轮复核 | 证据 |
| :--- | :--- | :--- | :--- |
| **H7**（P1）字面实体被改成真注释 | ① 围栏/行内代码里 `&lt;!` 不动；② `!` 分支只在 `original.includes('<'+inner+'>')` 时还原；③ 两处调用点传原文；④ 单测 3 条 | **真修掉**。整链实测：围栏内字面实体 `SAME`、行内代码里 `SAME`、正文里字面实体 `SAME`（今天也是 SAME）、真注释 `SAME`（今天 DIFF）、真 DOCTYPE `SAME`（今天 DIFF）、围栏里字面实体 + 别处真注释 `SAME`；顺带把「围栏里的字面 `&lt;kbd&gt;`」从今天 DIFF 修成 SAME。两条调用点：`serializeDocument.ts:52` 有 `options.original`（`App.tsx:2780-2785` 传入），`App.tsx:900/901` 的 hoist 也写对了 | `.tmp/critic-r40b-probe.txt` 的 H7-a…H7-j；`.tmp/critic-r40b-unit.txt:39-64`；既有 `html.test.ts` 10 条复跑全 PASS |
| **H8**（P1）引用块围栏被改 | 去块引用前缀再判围栏 + 单测 + 风险①改写 | **真修掉**。`> ```js … \~ … ``` ` 与嵌套 `> > ```js` 都 SAME；顶层围栏、行内代码、`~~~` 围栏仍 SAME；列表项围栏仍是 DIFF 但**与今天相同**（未被修法改坏） | `.tmp/critic-r40b-unit.txt:14-21`；`.tmp/critic-r40b-probe.txt` 的 H8-a/b/c/d |
| **H8b**（rev2 新加）公式里的 `\~` 被改 | `protectMath=true` 跳过 `$…$` 与 `$$` 块 | **成立**。`$a \~ b$`、`$\~{n}$`、多行 `$$` 块三种 SAME；`价格 $5 到 $10，约 25\~ 度。` 正文照修 | `.tmp/critic-r40b-unit.txt:22-33`；`.tmp/critic-r40b-probe.txt` H8b-a…e |
| **H1**（P1）repairTildes 不认围栏 | 行内代码 + 围栏感知 | 真修掉（同上 H8 证据；代码实现集中在 `codeScan.ts`，两条 repair 共用） | 同上 |
| **H2**（P1）collapse 作用面过大 | 只对正文 + 收窄规则 | 修掉。`serializeDocument.ts:54` 写成 `joinFootnotes(collapseBlankParagraphs(reused), footnotes)`，规则只删「含整行 `&nbsp;` 的空行段」 | plan:446-449；实读 |
| **H3**（P1）签名过不了 tsc | `Parameters<…>[0]` 反推 | tsc 这半**成立**（复跑 exit 0），但**运行时无效 → 见 H13** | `.tmp/critic-r40b-codescan.ts` tsc exit 0 |
| **H4**（P2）删 `del` 计数 | 改 `.ProseMirror s` | 修掉 | plan:292 |
| **H5**（P2）3 条标题断言过期 | 改成与 `docName` 比对 | 修掉。`stateOf` 同时回 `title`/`docName`（`scripts/host-save-acceptance.mjs:96-99`）；该改的正是 `:249/:272/:360` 三条；`:128`/`:406`/`:445`/`:451` 在新单源下仍成立；`host-smoke.mjs:239` 只 `endsWith('Sidelight')`、`rename-acceptance.mjs:205`、`recent-acceptance.mjs:495` 也仍成立 | `git grep -n "\.title" -- scripts` 实查 |
| **H6/H12**（P2）预算与顺延 | 砍法写死 4 步 | 修掉（plan:535-542 四步按序，含 `[toc]` 种子同步删） | 实读 |
| **H9**（P2）T3 第 5 条期望多一个换行 | 改成 3 个换行 | 修掉。上一轮实测 `actual` 就是 `"# 标题\n\n正文。\n\n\n"`，plan:455 已改成 3 个换行 | `.tmp/critic-r40-collapse.txt:5-8` 对照 plan:455 |
| **H10**（P2）种子绑死 `[toc]` | 拆必做/可选 | 修掉（plan:291-299 必做种子无 `[toc]`、断言只覆盖注释与单波浪号、截图 `p1-tilde-comment.png`；`[toc]` 单独可选） | 实读 |
| **H11**（P2）探针数字来源不一致 | 只引 stability 的 `truncateAtNbsp` | 修掉。plan:377/394 只引 stability；`rev40-probe-shapes.mjs:47-48`、`:232-233` 已加「作废 · 别照抄」 | 实读两文件 |

**H7 的已知残留**（不算新漏洞，plan 已声明）：同一篇里既写一条真注释、又用**完全相同的文字**讲转义时，讲转义那段也会被改成真注释（实测 `H7-g` 改后 DIFF）。plan:314（风险⑩）与 plan:554（§6）都写清了，今天这两种情况本来也都是 DIFF。可以接受。

---

## 二、本轮漏洞（3 条）

### H13（P0，方案不可行 + 数据损失未修）· §T1 1b 的 `del` tokenizer「`return false`」是**空操作**：`H~2~O` 存盘仍是 `H~~2~~O`，本轮头号 P1 没修

**问题**

plan:188-199 让 `disableSingleTildeStrike` 在「单个 `~`」分支 `return false`，并明确写了理由（plan:202-203，见 H14）。但 marked 的 `use({tokenizer})` 不是「覆盖」，而是**包装**：provided 函数返回 `false` 时会调用**上一个/基础** tokenizer。基础 `del` 就是 GFM 删除线（单个 `~` 也成删除线），所以单个 `~` 分支等于什么都没做。

```
node_modules/marked/lib/marked.esm.js（压缩后 use 的 tokenizer 合并段，原文）：
  let a=s,o=n.tokenizer[a],l=i[a];
  i[a]=(...p)=>{let c=o.apply(i,p);return c===!1&&(c=l.apply(i,p)),c}
```

**证据（干净进程，一个 mode 一个进程）** `.tmp/critic-r40b-tok3.txt`：

```
mode=false（plan 逐字代码）
  DIFF 单波浪号 H~2~O: "这是一句 H~~2~~O 的话。\n"
  DIFF 链接文字: "[H~~2~~O](https://example.com)\n"
  DIFF 词中 a~b~c: "a~~b~~c\n"
  DIFF T1 验收种子: "…&lt;!-- 给编辑看的备注 --&gt;\n\nH~~2~~O 与 ~~删除线~~ 与 X^2^。…"
  raw parse H~2~O: "H~~2~~O"                       ← 仍然成删除线
mode=text（同一份代码，单个 ~ 分支改成返回 { type:'text', raw:'~', text:'~' }）
  SAME 单波浪号 / 成对删除线 / 未配对 25~ / 未闭合 ~~abc / 行内代码 / 围栏代码 /
       链接文字 / 词中 a~b~c / 范围 25℃~30℃ / **T1 验收种子**            ← 10/10 SAME
```

另：`.tmp/critic-r40b-tokenizer.txt` 直接看 `use()` 前后 —— `manager.parse('H~2~O')` 前后都是 `H~~2~~O`（`strike` 仍在）。计划自己的 `rev40-probe-shapes.mjs` 探针（§5）之所以「两种写法都 SAME」，是因为它在**同一个进程**里先装 `text-token`、再装 `false-only`；marked 是全局单例（`@tiptap/markdown/dist/index.js:381` `this.markedInstance = options.marked ?? marked`；`.tmp/critic-r40b-tokenizer2.txt` 显示所有 manager 的 `instance` 是同一个对象），后者的 fallback 恰好还是前者，于是 false-only 被前者的 text-token 兜住。复跑该探针可复现假绿：`.tmp/critic-r40b-shapes-rerun.txt:81,89,91` 的 `[false-only]` 全是 SAME。

**影响**：照 plan 代码实现，`typora#1`（打开再保存把 `H~2~O` 改成 `H~~2~~O`）**原样存在**；`plan §T1 验收 3` 第一条（`.ProseMirror s` 数 = 1、`2` 不在 `<s>` 里）与验收第 2 条（`r40-t1-after.mjs` 期望 2 条 PASS）都会红。更糟的是 plan:7 写明探针「执行代理可以直接复跑」——执行代理复跑 §5 会看到全绿，从而去怀疑自己的接线而不是 tokenizer。

**修法（已实测 tsc 与运行都过，约 8 行，替换 1b 的 tokenizer 部分）**

改用 marked 的**行内扩展**（typed `TokenizerExtension`，返回 `text` token 在类型上是允许的，不需要 `as any`）：

```ts
const installed = new WeakSet<object>()

/** 只把「单个 ~」变成 text token；成对的 ~~…~~ 仍交给 marked 的 del（GFM 默认允许单 ~ 当删除线） */
export function disableSingleTildeStrike(manager: Pick<MarkdownManager, 'instance'>): void {
  if (installed.has(manager)) return
  installed.add(manager)
  manager.instance.use({
    extensions: [
      {
        name: 'loneTildeText',
        level: 'inline',
        start(src: string) {
          const at = src.search(/(?<!~)~(?!~)/)
          return at < 0 ? undefined : at
        },
        tokenizer(src: string) {
          return /^(?<!~)~(?!~)/.test(src) ? { type: 'text', raw: '~', text: '~' } : undefined
        },
      },
    ],
  })
}
```

- 类型：`npx tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck --allowImportingTsExtensions .tmp/critic-r40b-fixcand.ts` → **exit 0**（该文件就是上面这份实现）。
- 运行（整链，`.tmp/critic-r40b-extchain.txt`）：单波浪号 / 成对删除线 / 未配对 `25~` / 未闭合 `~~abc` / 行内代码 / 围栏代码 / 链接文字 / `a~b~c` / 加粗里 / `25℃~30℃` / 公式 `$a \~ b$` / 引用块围栏 / **T1 验收种子** 全部 SAME；唯一 DIFF 是风险⑤已声明的那条（见 H15）。
- 若坚持 `del` 覆盖：也可以返回 `{ type: 'text', raw: '~', text: '~' }`，但 marked 的 `TokenizerObject.del` 只允许 `false | Del | undefined`，需要一处**窄**类型断言（`as unknown as false` 之类），比扩展方案丑。**不要**保留 `return false`。
- 配套改动：plan:202-203 的「两种写法输出逐条相同」必须删掉或改成「clean-process 实测 false-only 无效」；plan:564（§7 核对点 1）的「`Parameters<…>[0]` + `return false` 这份签名」要改成「行内扩展 + install-once（WeakSet）」。
- 验收口径：单测第 1 条必须真红/绿（现在照 plan 写会红）；E2E 用假工作区跑一遍后，**再单独确认** `raw parse H~2~O === 'H\\~2\\~O'`（即 parse 后没有 strike）。

---

### H14（P2，证据）· `rev40-probe-shapes.mjs` §5 是**同一进程里两种写法互相污染**的假绿，必须标作废或改成分进程跑

**问题**：见 H13。plan:7 说「执行代理可以直接复跑」这些探针，而 `rev40-probe-shapes.mjs:196-210` 的循环顺序是 `['text-token','false-only']`，第二次 `use` 会在第一次之上再包一层，导致 `false-only` 看起来有效。执行代理复跑会得到与 plan 一致的假绿。

**修法**：① 在该节前加一行「§5 的 `false-only` 结果被同一进程里先装的 `text-token` 污染，已在 `.tmp/critic-r40b-tok3.txt` 用干净进程复测：false-only 无效、text-token 全过——别照抄 `return false`」；② 若要保留探针，把两个 mode 改成 `process.argv` 分进程跑（照 `.tmp/critic-r40b-tok3.mjs` 的写法）；③ plan:7 的「可直接复跑」加一句「除 §5」。

---

### H15（P2，验收口径）· 风险⑤ 是「今天 SAME → 改后 DIFF」的真实字节变化，§6 又写「不单独验证」，tester 容易按字节保真判 FAIL

**问题**：`温度 25\~ 度。`（用户正文里自己写的反斜杠）今天整链 SAME；修法后 `repairTildes` 会还成 `温度 25~ 度。`——**字节变了**（语义等价：`\~` 在 Markdown 里渲染为 `~`）。plan:309（风险⑤）与 CHANGELOG 一行都写了，但 plan:552（§6 UNVERIFIED）又说「本轮不单独验证」，而 §T1 验收通篇是「逐字节」口径，tester 很可能把这条当回归。

**证据**：`.tmp/critic-r40b-probe.txt` 的 `H8-f 正文 \~（要修的）`：today `SAME "温度 25\\~ 度。"`；对照 `.tmp/critic-r40b-extchain.txt:11`（改后 `DIFF "温度 25~ 度。"`，同一份实现）。

**修法**：① 在 §6 或 §T1 验收 4 增一句「**已知改写**：正文里字面 `\~` 保存后变 `~`（语义等价，不在保真口径内），tester 不要计回归」；② 单测第 3 条已经覆盖（`repairTildes('温度 25\~ 度。') === '温度 25~ 度。'`），把它在 impl.md 的「做了」栏点名；③ 若想保字节，唯一稳妥路子是「只在原文同一位置不是 `\~` 时才还原」（`original` 判定），但那是第 41 轮的活，本轮**不要**扩大范围，写清即可。

---

## 三、核对通过（按 文件:行号 实查，非只看计划文字）

- `src/lib/html.ts:1`（现字符类 `[a-zA-Z]`）、`:21-22`（`escapeHtmlForParse` 的 `[a-zA-Z/!]`，plan 说不改，正确——两边对齐才有一对一还原）；`src/lib/html.test.ts` 既有 **10 条**，用 plan 的新 `repairHtml` 复跑全 PASS（含 `a &lt; b`、`:52-57` 往返）。
- `src/lib/serializeDocument.ts:52`（repair 链）、`:53-54`（`reuseTables` → `joinFootnotes`）、`:60`（`applyTrailingNewlines` 最后）、`:30-36`（尾部 `&nbsp;` 清理）；`options.original` 由 `App.tsx:2780-2785` 的 `currentMarkdown` 传入，`serializeDocument` 的调用点都能拿到原文。
- `src/App.tsx:880-949`（onUpdate，`:882` 载入那次早退、`:900` body、`:901` original、300 ms derive）、`:2016-2044`（`loadIntoEditor`：`:2031-2032` `originalText`/`rawTextRef = text`）、`:1056-1058`（宿主 payload）、`:2593-2594`（保存后 `rawTextRef = withEol`）、`:3811-3813`（源码态：dirty 时显示序列化结果）——plan 的 E2E 顺序（先弄脏再进源码）正确。
- `src/lib/risk.ts:36-46`（`fenceMap` 已导出；`:39` 只认行首空白后的 ```/~~~，所以先去掉 `> ` 前缀是必要修法）、`:38` 把 `\r\n?` 归一（CRLF 行数仍与 `split('\n')` 相同，退化分支只在孤立 `\r` 触发）。
- `src/lib/math.ts:2`（`PAIR`）、`:8-10`（`isMathBody` 空白口径）——plan 的 `INLINE_MATH` 与它同口径（`$5 到 $10` 实测不算公式）。
- `src/lib/html.ts` 的产品调用点只有两处：`serializeDocument.ts:52`、`App.tsx:900`（另加 `html.test.ts`；`git grep` 实查），plan 说的「漏一处就草稿与保存字节不一致」成立。
- `src/components/PreviewPane.tsx:58-75`（两个 return，都是 `.doc-column.preview-column > article.ProseMirror.preview-pane`，没有 `.doc-layout`）✓。
- `src/styles.css`：`.editor` 选择器 **35 行**（`:559-752` 31 行 + `:1508` + `:1780` + `:1787` + `:1934`），改名后应剩 `:1508`、`:1934` ✓；`:1780`/`:1787` 是 `.editor img`；`.editor-placeholder` 在 `:267`（plan 已提醒别碰）。
- `document.title` 在 `src/App.tsx` 恰好 **5 处**（`:721`/`:1084`/`:1136`/`:2333`/`:2614`）✓；`:721` 只有一行 ✓；`hostDocRef` 同步在 `:720` ✓；`docName` 的 `useState(initial.name)` 在 `:491`（恒字符串）✓。
- `scripts/host-save-acceptance.mjs:96-99`（`title`/`docName` 同一次读取）、`:249`/`:272`/`:360`（三条要改的）、`:128`/`:406`/`:445`/`:451`（新单源下仍成立）；`host-smoke.mjs:239`、`rename-acceptance.mjs:205`、`recent-acceptance.mjs:495` 都只看后缀/包含，不受新单源影响 ✓。
- `scripts/roundtrip.mjs:4-28` 确有 plan 说的扩展列表与 `ReusableTable`，可照抄构造 `MarkdownManager` ✓；`fixtures/markdown` 里 `~`、反引号、`&lt;` **各 0 命中** → T1 不影响 `roundtrip` 的 rich 5/7 source 7/7 ✓。
- `package.json:15` 是 `test` 脚本（末尾追加即可，别重排）；`docs/CHANGELOG.md:5` 是 `## Unreleased（第 29–39 轮，未发版）`，改成 29–40 正确 ✓。
- 硬约束：无新运行时依赖（`codeScan.ts` 只 import 既有 `risk.ts`）；Tiptap schema 不动；不碰 `release/`、不 push、不发版；首屏预期 +300–500 B（<310,000）✓。

---

## 四、复跑记录（命令与输出）

```text
npx tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext \
  --moduleResolution bundler --skipLibCheck --allowImportingTsExtensions \
  .tmp/critic-r40b-codescan.ts   → exit 0   （plan §T1 1a/1b/3 逐字代码，H3 的 tsc 半成立）
  .tmp/critic-r40b-fixcand.ts    → exit 0   （H13 修法候选：行内扩展，无需 as any）

node --experimental-strip-types .tmp/critic-r40b-tok3.mjs off      → 干净进程 today 基线
node --experimental-strip-types .tmp/critic-r40b-tok3.mjs false    → H13：单波浪号/链接文字/词中/T1 种子 DIFF
node --experimental-strip-types .tmp/critic-r40b-tok3.mjs text     → 10/10 SAME（修法方向正确）
node --experimental-strip-types .tmp/critic-r40b-tok3.mjs escape   → 纯前处理方案（未做代码感知时行内代码/围栏被改，仅作对照）
node --experimental-strip-types .tmp/critic-r40b-fixcand.mjs       → 行内扩展在 serialize 层的行为
node --experimental-strip-types .tmp/critic-r40b-extchain.mjs      → 整链 14 例：13 SAME + 风险⑤ DIFF
node --experimental-strip-types .tmp/critic-r40b-probe.mjs         → 23 例 today vs plan（H7/H8 全过）
node --experimental-strip-types .tmp/critic-r40b-unit.mjs          → plan §T1 单测期望 13+ 条全 PASS
node --experimental-strip-types .tmp/rev40-probe-shapes.mjs        → §5 [false-only] 假绿（进程污染），H14
```

未跑（会写仓库文件或需要 build，critic 不做）：`npm test`、`npm run roundtrip`、`npm run build`/`measure-first-screen`、任何浏览器 E2E。执行代理按 §4 收官门禁自己跑。

---

## 五、未验证 / 给执行代理的提醒

- **H13 是唯一 P0**。开工第一件事：把 1b 的 tokenizer 换成行内扩展（或带窄断言的 text token），**然后**再写单测；单测第 1 条与 E2E 第一条会替你把关。别把「复跑 planner 探针 §5」当验收（假绿，见 H14）。
- 修好 tokenizer 后，plan 其余 12 条旧漏洞（H1–H12）都已按审查修到位，T1/T2/T3 的验收项按本文 `三` 的实查结果都能落地。
- `host-save-acceptance.mjs` 结尾 `await browser.close()` 会断 9222 的 Playwright 连接（浏览器进程还在）；它写 `shots/round-06/`（已跟踪），跑完必须 `git checkout -- shots/round-06/`，并排最后跑。
- `serializeDocument.ts:60` 的 `applyTrailingNewlines` 依赖 `options.original`；`serializeDocumentBody`（`App.tsx:186-188` 的死代码）传 null 时不补尾部换行——plan:505 已列为不改，impl.md 记一句即可。
- T2 的深色主题、真机缩放，T3 的宿主窗口标题（`host/Program.cs` 无 `document.title → Form.Text`）按 plan 已列 UNVERIFIED，我复核同意。
- 本轮**不要**顺手扩大范围：`[toc]`（余量项）、列表项围栏、多行注释、`&` 注释、1 MB `mapOutsideCode` 耗时都按 plan 的顺延/UNVERIFIED 处理。
