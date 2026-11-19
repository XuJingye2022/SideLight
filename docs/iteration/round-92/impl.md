# 第 92 轮执行报告（executor，A 轮）

## 任务状态
- **A1** 纯文本 Markdown 粘贴解析 — DONE
- **A2** A1 的测试与门禁 — DONE

## 改动文件
- 新 `src/lib/markdownPaste.ts`（6,432 B）：`looksLikeMarkdown`（块 7 类 + 行内 3 类 + `$…$` 过 `isMathBody`）、`pasteCandidate`（files>0 / 超长 / `data-pm-slice` / HTML 与 text 折空白不等 → false）、`plainTextOfHtml`（只剥不带属性 p/div/span，`br` 与 `</p>` 当换行，解实体）、`pastePlan` → inline/blocks/literal。
- 新 `src/lib/markdownPaste.test.ts`（24 条）。
- `src/App.tsx:1103-1165`：`handlePaste` 改 `(view, event)`；图片分支在前；解析链同 `setMarkdown`（`escapeHtmlForParse`→`protectMathPairs`→`manager.parse`→`splitTableCellBreaks`，含 `$` 先 `ensureKatex`）；手写事务 = `replace*` → `setMeta('uiEvent','paste')` → `closeHistory` → `TextSelection.near` → dispatch，成功才 `preventDefault`。
- `package.json` test 链尾加一条。

## 门禁
- `npx tsc --noEmit`：通过
- `npm test`：exit 0，**56 个文件 751 条**（+24）
- `npm run roundtrip`：exit 0；rich 7/9、source 9/9；`docs/roundtrip-report.md` 与 HEAD 字节相同（既有基线）
- `npm run verify`：**PASS**；首屏 gzip **310,767 B**（基线 309,804，**净增 +963 B**）；内部预算 310,000 越 **767 B（WARN；硬线余 9,233 B）**
- E2E `.tmp/e2e-r92-a1-paste.mjs`（CDP 57270，日志 `.tmp/e2e-r92-a1-paste.log`）：**19/19 PASS**，全程 pageerror 0
- 截图 `shots/round-92/a1-paste.png`

## E2E 实测（对应计划验收）
- ① 粘 `# 标题\n- a\n**粗体** [链接](https://e.com) \`code\`` → h1/li/strong/a/code 各 1、无字面 `#`/`**`
- ② 围栏 `**不粗**` → codeBlock 1、strong 0；光标在围栏里再粘仍字面（`spec.code` 守卫）
- ③ 纯文本一句 → 段数 1 不变、无结构
- ④ `$x^2$` → `[data-type="inline-math"]` 1、`data-latex=x^2`
- ⑤ P2-2：`<p>**粗体**</p>` + 同文 → strong 1
- ⑥ P1-1：`data-pm-slice` → strong 0、字面 `**粗体**` 保留（A1 不抢内部粘贴）
- ⑦ P2-3：中段粘两段 → **3 段**（前文+第一段 / 第二段 / 后文），原文不丢
- ⑧ 列表项内粘 `# 标题\n\n段落` → 标题进 li、pageerror 0、原文不丢
- ⑨ `Ctrl+Z` 一次回粘贴前（closeHistory 独立一步）

## 计划偏差（最小改动）
1. 块级插入不用 `insertContentAt`：它拿不到 tr，P2-3 要求手写事务；空段落特例按它的口径手写。
2. 首块是段落且**光标在段落中间**时 `Slice.openStart=1`：段中粘两段才是计划要的 3 段（0/0 实测 4 段，1/1 是 2 段；`openEnd` 恒 0，否则光标后的旧文字会粘进粘贴内容）。标题/段首/空段落不开口。

## UNVERIFIED / 新发现
- plan-review P1-1 的「复制含 `==高亮==`/`^上标^` 的段落粘回，`.sl-eq`/`.sl-sup` 各 1」**实测红**：真 Ctrl+C/Ctrl+V 后两 mark 均 0（字符不丢）。原因：三枚快捷行内语法 mark 的 `parseHTML: () => []`（`src/lib/inlineSyntax.ts:123-125`），PM 的 slice 解析恢复不出来 —— **既有缺口，与 A1 无关**（该段 text/plain 无 Markdown 信号，`pasteCandidate` 返回 false）。建议下轮补 `parseHTML`（新 finding）。
- 表格单元格里粘块级 Markdown → `literal` 交回 PM；多行 `$$` 块粘贴未单独验。

## CHANGELOG 一行建议
`- 粘贴纯文本 Markdown（标题/列表/引用/围栏/表格/粗体/链接/行内代码/公式）直接按格式落入正文，一次 Ctrl+Z 撤回；图片、富文本与代码块内粘贴保持原行为。`

## 新踩坑
1. `Transform.replaceWith(from,to,x)` 第三参不是 Slice：传 `new Slice(...)` 抛 `RangeError: Can not convert <p…>(1,1) to a Fragment`；要开口的切片必须走 `replaceRange(from,to,slice)`。
2. `Slice` 开口决定「段中粘两段」的段数：0/0 → 4 段，1/1 → 2 段，只有 1/0 是 3 段。
3. 自定义 mark 只能靠 `parseHTML` 还原：`parseHTML: () => []` 的 mark 内部复制粘贴必丢（实测 `==`/`^`）。
