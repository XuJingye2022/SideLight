# 第 40 轮实施报告（executor）

- 轮次：40 · 轮前 `startSha=504dedd22b1133c7629bc1a437ca24b8a8889322` · 报告目录 `docs/iteration/round-40/` · CDP 9222
- 输入：`plan.md`（573 行，含 revision=2）、`plan-review.md`（REVISE：1 P0 + 2 P2）、`AGENTS.md` §4/§8、`STATE.md`、相关源码
- 版本政策：**未发版**。`package.json` 版本仍 `0.32.1`（只改了 `test` 脚本一行 + 依赖不动）；CHANGELOG 写进 `## Unreleased（第 29–40 轮，未发版）`。未 push、未动 `release/`。

## 0. 任务总表

| 任务 | 状态 | 一句话 |
| :--- | :--- | :--- |
| T1 单波浪号 + HTML 注释保真（P1×2） | **完成** | `H~2~O` / `<!-- -->` 打开→保存逐字节不变；E2E 改前 DIFF、改后 PASS |
| T2 预览排版容器 + 字数面板宽度（P1） | **完成** | 预览与编辑同一套排版（576 px 限宽、17px/1.95、表格边框、引用左边线）；面板 941→360 px |
| T3 `&nbsp;` 空段落 + 标题单源（P2） | **完成** | 连续空段落不再写 `&nbsp;`；`document.title` 只剩 1 处写入 |
| T1 余量项 `[toc]` | **砍了** | 按 §5 顺延第 1 步砍掉（种子/断言/截图都没带 `[toc]`） |

**关键偏离计划的一处（P0，按 plan-review H13 修）**：`disableSingleTildeStrike` **不用** `del` tokenizer + `return false`（那是空操作：marked 的 `use()` 是包装，返回 `false` 会落回基础 GFM `del`，单个 `~` 仍是删除线），改成 marked **行内扩展** + `WeakSet` install-once，返回 `text` token。代码与 `plan-review.md:74-97` 的修法一致。实测证据见 §1.1。

---

## 1. T1 —— 单波浪号 / HTML 注释

### 1.1 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/codeScan.ts`（新增，49 行） | `mapOutsideCode(markdown, fn, protectMath)`：逐行跳过围栏（判定前去掉 `> ` 前缀，含嵌套 `> > `）、行内代码；`protectMath` 时再跳过行内 `$…$` 与 `$$` 块。围栏标记行本身与 `fenceMap` 同语义，行数不一致的退化分支保留 |
| `src/lib/tilde.ts`（新增，44 行） | `disableSingleTildeStrike(manager)`：注册 `loneTildeText` 行内扩展（`start`/`tokenizer` 用 `(?<!~)~(?!~)`），把不成对的单个 `~` 当文本 token；`WeakSet<object>` 去重。`repairTildes(markdown)` = `mapOutsideCode(…, s => s.replace(/\\~/g,'~'), true)` |
| `src/lib/html.ts` | `ESCAPED_TAG` 字符类 `[a-zA-Z]` → `[a-zA-Z!]`；`repairHtml(markdown, original?)` 走 `mapOutsideCode`，`!` 开头（注释 / DOCTYPE）只在 `original` 里存在同一条未转义片段时还原；`original` 缺失不做 `!` 分支。`hasHtml` / `escapeHtmlForParse` 未动 |
| `src/lib/serializeDocument.ts:52` | `repairCalloutMarkers(repairHtml(repairMath(repairTildes(repairFootnoteRefs(raw))), options.original ?? null))` |
| `src/App.tsx`（onUpdate 的 300 ms 派生链） | `const original = rawTextRef.current` **提到 body 之前**，链里加 `repairTildes` 并把 `original` 传给 `repairHtml`（漏一处会草稿/保存字节不一致） |
| `src/App.tsx`（`setMarkdown`） | `manager` 拿到后、`parse` **之前**调 `disableSingleTildeStrike(manager)` |

### 1.2 证据（命令输出）

改前/改后对照（`.tmp/r40-t1-before-after.mjs`：改前用 `git show HEAD:src/lib/html.ts` 的旧链，改后用本轮修法；**先跑改前再装扩展**——marked 是全局单例，顺序反了就是 H14 的假绿）：

```text
改前（HEAD 的链 + 无扩展）: {"same":false,"hasSingleTilde":false,"doubledTilde":true,"hasComment":false,"escapedComment":true,
  "text":"# 标题\n\n&lt;!-- 给编辑看的备注 --&gt;\n\nH~~2~~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。改\n"}
改后（本轮修法）: {"same":true,"hasSingleTilde":true,"doubledTilde":false,"hasComment":true,"escapedComment":false,
  "text":"# 标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。改\n"}
改前结论: DIFF
改后结论: PASS
围栏里的字面实体: SAME
正文里的字面实体: SAME
行内代码里的字面实体: SAME
```

应用内 E2E（`.tmp/e2e-r40-exec.mjs`，假 FSA 工作区，日志 `.tmp/e2e-r40-exec.log`）：

```text
## t1-dom    {"strikeCount":1,"texts":["删除线"],
             "html":"<h1>标题</h1><p>&lt;!-- 给编辑看的备注 --&gt;</p><p>H~2~O 与 <s>删除线</s> 与 X^2^。</p><p>末尾段。</p>","dirty":false}
## t1-source {"value":"# 标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。改\n",
             "hasSingleTilde":true,"hasComment":true,"escapedComment":false,"doubled":false}
## t1-saved  {"equalsExpected":true,"hasSingleTilde":true,"hasComment":true,"escapedComment":false,"doubled":false,…}
```

- 富文本里 `.ProseMirror s` 恰好 1 个、`textContent === '删除线'`（**数的是 `<s>` 不是 `del`**，见 plan-review H4）；`H~2~O` 的 `2` 不在 `<s>` 里。
- 源码态（`Ctrl+/`，此时 `dirty:true` 显示序列化结果）含 `H~2~O` 与 `<!-- 给编辑看的备注 -->`，不含 `&lt;!--`、不含 `H~~2~~O`。
- `Ctrl+S` 后 `readFakeFile` **逐字节** = 种子把 `末尾段。` 换成 `末尾段。改`。
- 截图：`shots/round-40/p1-tilde-comment.png`（富文本）、`p1-source-bytes.png`（源码字节）。

### 1.3 测试

- 新增 `src/lib/tilde.test.ts`：**13 条**全过（单 `~` 无 strike 且整链回原文 / `~~` 仍是 strike / 正文 `\~` 还原 / `~~~` 与反引号围栏 / 行内代码 / 围栏里 `~2~` 整链 SAME / 未闭合 `~~abc` / 链接文字 / 重复注册 / 引用块与嵌套引用围栏 / 行内公式 `\~` 与 `\~{n}` / `$$` 块 / 价格写法不是公式）。构造 `MarkdownManager` 只用 `StarterKit`（本文件不测表格；表格扩展的 `renderMarkdown` 改写是 JS 脚本里的写法，在 `strict` + `verbatimModuleSyntax` 的 TS 单测里照抄会引入隐式 any）。
- `src/lib/html.test.ts` 追加 **3 条**（围栏里的字面实体 + 正文里的字面实体 + 真注释/DOCTYPE 还原），既有 10 条仍绿：**13 条全过**。
- `package.json` 的 `test` 脚本末尾追加 `tilde.test.ts`（未重排既有 25 个文件）。

---

## 2. T2 —— 预览排版容器 + 字数面板宽度

### 2.1 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/styles.css` | 正文排版块 `.editor` → `.doc-body`（`:559-752` 共 31 行）+ 图片两条（`:1780`/`:1787`）。**保留** `.editor` 类与 `:1508` `.focus-mode .editor .is-dimmed`、`:1934` 打印块、`:267` `.editor-placeholder` |
| `src/App.tsx` | `editorProps.attributes.class = 'editor doc-body'`（`.editor` 保留，验收脚本仍能用） |
| `src/components/PreviewPane.tsx` | 两个 return 都包 `.doc-layout.preview-layout > .doc-column.preview-column`，`article` 加 `doc-body` |
| `src/styles.css`（只读预览段） | 新增 `.doc-layout.preview-layout { grid-template-columns: minmax(0, 36rem) }`（**两个类**，否则被 `:2399` 的 `@media` 单层类盖掉）与 `.preview-layout .preview-column { padding-bottom: 0 }` |
| `src/components/StatsDetail.tsx` | `panelStyle` 加 `maxWidth: 360px`；长句加 `overflowWrap: 'anywhere'` |

改名有牙对照：`Select-String -Path src/styles.css -Pattern '\.editor'` **改前 36 行 → 改后 3 行**（`267 .editor-placeholder`、`1508`、`1934`），与 plan §T2 预期一致。

### 2.2 证据（E2E 量测，1440×900 / 1024×700）

```text
## t2-preview-1440 {"layoutCount":1,"columnWidth":576,
  "h1":{"family":"\"Source Han Serif SC\", …","size":"31.45px","lh":"42.4575px"},
  "p":{"size":"17px","lh":"33.15px"},"tableWidth":576,
  "thBorder":{"width":"1px","bg":"rgb(232, 240, 237)"},"quote":{"left":"2px","pad":"16px"}}
## t2-preview-1024 {"columnWidth":576,"overflow":0,"scrollHeight":700}
## t2-edit-1024   {"editorCount":1,"h1":{"size":"31.45px","lh":"42.4575px"},"p":{"size":"17px","lh":"33.15px"}}
## t2-stats       {"width":360,"role":"dialog"}
```

- `lineHeight/fontSize` = 42.4575/31.45 = **1.35**；`lh/fontSize` 正文 33.15/17 = **1.95**，与编辑态同值。
- 1024 视口 `scrollWidth - clientWidth = 0`（无横向溢出），列宽仍 576。
- 编辑态 `.editor` 仍只有 1 个、排版数值不变（`.editor` 选择器没被删）。
- 截图：`shots/round-40/p2-preview-light.png`、`p2-preview-1024.png`、`p2-edit-unchanged.png`。

---

## 3. T3 —— `&nbsp;` 空段落 + 标题单源

### 3.1 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/blankParagraphs.ts`（新增，62 行） | `collapseBlankParagraphs(body)`：只把「含整行 `&nbsp;` 的空行段」截断到第一个 `&nbsp;` 之前；围栏（```` ``` ```` 与 `~~~`）内、无空行的孤立 `&nbsp;` 段落、其它多空行一律不动；**不**去文首尾换行 |
| `src/lib/serializeDocument.ts:58` | `joinFootnotes(collapseBlankParagraphs(reused), footnotes)`（只作用于正文，脚注块字节不经过它） |
| `src/App.tsx` | 新增「标题只在这里写」的 effect（`document.title = \`${docName} — Sidelight\``），删掉 5 处手写标题（宿主 payload / 宿主不可用 / 改名 / 另存为 / `hostDoc` effect），`hostDocRef` 同步保留；删掉 `Ctrl+N` 路径两行重复的 `show(\`已新建 …\`)` 之一 |
| `scripts/host-save-acceptance.mjs:249,272,360` | 三条断言改成与同一次读取的 `docName` 比对（改前 `=== 'Sidelight'`） |
| `package.json` | `test` 末尾追加 `blankParagraphs.test.ts` |

有牙对照：`document.title` 在 `src/App.tsx` **改前 5 处 → 改后 1 处**；`show(\`已新建 ${name}\`)` **改前 2 行 → 改后 1 行**（口径按 plan 的窄模式，不含「已新建文件夹」）。

### 3.2 证据（E2E）

```text
## t3-dom            {"dirty":true}
## t3-saved          "\n\n# 标题\n\n正文。\n"        ← 0 处 &nbsp;
## t3-saved-again    "\n\n# 标题\n\n正文。\n"        ← 二次保存逐字节相同
## t3-title-key      {"title":"键.md — Sidelight","name":"键.md"}
## t3-title-renamed  {"title":"键改.md — Sidelight","name":"键改.md"}
## t3-title-switch   {"title":"乙.md — Sidelight","name":"乙.md"}
## t3-fence          {"value":"```\nA\n\n\n\nB\n```\n"}                     ← 围栏 4 个空行原样
## t3-footnote       {"value":"正文[^1]。\n\n[^1]: 第一段\n\n\n    第二段\n"}  ← 脚注块 \n\n\n 原样
## errors            []
```

- 改前基线（findings-bug §1 / `.tmp/e2e-r40-bug-h.log`）：`"\n\n&nbsp;\n\n# 标题\n\n正文。\n"`；改后同路径 `"\n\n# 标题\n\n正文。\n"`。
- 截图：`shots/round-40/p3-empty-paragraph-fixed.png`（源码态无 `&nbsp;`）、`p3-title-follows-doc.png`（标签标题 `乙.md — Sidelight` + 树里当前文档）。
- `blankParagraphs.test.ts` **9 条全过**（开头/中间/末尾 × 1–3 个空段落、无 `&nbsp;` 多空行原样、`~~~` 围栏、围栏内字面 `&nbsp;`、孤立 `&nbsp;` 段落、脚注块、普通文档不含 `&nbsp;`）。

---

## 4. 门禁（收官串行）

```text
npx tsc --noEmit                      → exit 0
npm test                              → 27 个文件 345 条，exit 0（第 39 轮 25/320；新增 tilde 13 + blankParagraphs 9 + html +3）
npm run roundtrip                     → rich: 5/7 完全保真；source: 7/7 等值；firstSaveBlocked: 1/7
npx vite build --outDir .tmp/build-r40 → ✓ built in 477ms
node scripts/measure-first-screen.mjs --dir .tmp/build-r40 --target 310000
                                      → total raw=939993 gzip=290723 headroom=29277 files=3 max=320000
                                        target=310000 gap=19277 · PASS
```

首屏 gzip **290,723 B**（第 39 轮 290,021 → **+702 B**；`files=3`；内部 310,000 / 硬线 320,000，余 29,277 B）。`index-BtnKKR-W.js` 904.33 kB raw / 286.38 kB gzip、CSS 7,245 B gzip。未为压体积砍功能。

## 5. 做了 / 砍了 / 顺延（H12）

| 栏 | 内容 |
| :--- | :--- |
| **做了** | T1（单波浪号 + HTML 注释两条 P1，含 `codeScan.ts` / `tilde.ts` / `html.ts` / 两处链 / `setMarkdown` / 单测 16 条 + 改前改后探针 + E2E + 2 张截图）、T2（预览排版 + 字数面板，3 张截图 + 双视口量测）、T3（`&nbsp;` 空段落 + 标题单源 + `host-save-acceptance.mjs` 三条断言，2 张截图）、CHANGELOG（标题改 29–40 + 本轮 6 条 + UNVERIFIED） |
| **砍了** | T1 余量项 `[toc]`（`repairToc` 未写，种子/断言/截图都不含 `[toc]`）。原因：35 分钟口径基线只含 T1 两处 P1 + T2，`[toc]` 是 §5 顺延第 1 步 |
| **顺延** | `[toc]` 整行还原（第 41 轮接）；T2 的深色预览量测（只靠主题变量，未单独量测）；`scripts/host-save-acceptance.mjs` 改完未跑（见 §6） |

## 6. UNVERIFIED（本轮测不了，写清怎么补）

- **宿主窗口标题**：`host/Program.cs` 没有 `document.title → Form.Text` 同步，本轮只验浏览器标签。补：宿主 `host-smoke` 加一条断言。
- **`scripts/host-save-acceptance.mjs` 改完未跑**：补测命令 `node scripts/host-save-acceptance.mjs http://localhost:5175 browser`（连 CDP 9222；跑完 `git checkout -- shots/round-06/`，它会写已跟踪目录）。
- **真实磁盘写回**：E2E 用假 FSA 句柄；真 `Ctrl+S` 写盘（含 BOM/CRLF）仍按既有宿主路径，本轮不覆盖。
- **多行 HTML 注释** `<!--\n…\n-->`：行式还原跨不过换行，本轮不修。
- **注释内含 `&`**：为保住 `a &lt; b`，还原正则排除 `&`，本轮不修。
- **同一段文字既写真注释又讲转义**：`original` 是全篇 `includes` 判定，文本完全相同时讲转义那段会变成真注释（改前也是 DIFF，本轮未进一步修好）。
- **列表项里的围栏 / 代码内容含仿围栏行**：不在范围（引用块围栏已覆盖，实测 SAME）。
- **公式里的 `~` 仍被序列化器写成 `\~`**：本轮只保证 `repairTildes` 不再改公式里的 `\~`。
- **深色主题下的预览排版、真机 125%/150%/200% 缩放、真实 IME、屏幕阅读器、macOS**：与第 38/39 轮一致。
- **1 MB 文档的 `mapOutsideCode` 耗时**：未测（保存链与 300 ms 草稿链各多一遍逐行扫描）。
- **生产包口径**：只跑 `vite build` 的 gzip 门与 dev server E2E，未打安装包（`release/` 不动）。

## 7. 新踩的坑（写进 AGENTS §8 候选）

1. **dev server 会交付陈旧的 `serializeDocument.ts`**：本轮 `blankParagraphs.ts`（新文件）与 `App.tsx`/`styles.css` 的改动都生效了，但 `serializeDocument.ts` 的 transform 仍是旧版（页面里 `wired:false`，`serializeDocument` 直接吐旧字节）。**用 `page.evaluate` 里 `import('/src/lib/xxx.ts')` + `fetch` 源码判 `wired`** 才定位到；再对同一文件写一次（换一行注释）后立刻变成 `wired:true`。判「产品没修」前先这样验一次，别改产品代码。
2. **marked 是全局单例，探针里「改前 / 改后」必须分进程或严格排序**：先跑改前链，再装扩展跑改后链；反过来会出现「改前也 SAME」的假绿（plan-review H14 就是这类）。本轮 `.tmp/r40-t1-before-after.mjs` 第一版就踩到（改前只见 `H\~2\~O`，看不到 `H~~2~~O`），调换顺序后改前正确显示 `H~~2~~O`。
3. **`MarkdownManager.serialize()` 不补尾部换行、且会把正文的 `~` 转义成 `\~`**：单测里「整链回到原文」要写成 `repairTildes(serialize(parse(src)))`，并且别指望 `serialize` 自带结尾 `\n`（第一版断言因此红了 5 条）。
