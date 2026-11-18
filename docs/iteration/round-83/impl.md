# 第 83 轮执行报告（A 轮，3 任务，rev.1）

executor；`startSha=13cf1a3` = HEAD。CDP 不可用（一次尝试即停），浏览器项全 UNVERIFIED（e2e 脚本按「浏览器可用时」未交付），缺口归 tester。

## A1 复核 3 条回归 — PASS（0 行产品改动）

改前 HEAD 逐份复跑 0 fail：`mathInput` 5/5、`mathReveal` 10/10、`settings` 14/14、`mathStyle` 4/4、`mermaidLazy` 20/20（B-122 预检，`.tmp/r83-a1-tests.log`）。`styles.css:2137-2141`（只读）在：`margin:0 auto;width:fit-content;min-width:100%`；BACKLOG:60 的 `2119-2123` 已过期。浏览器三项（字面 `$`/`==` 为 0、`.sl-eq`+`Ctrl+S` 字节、`.katex-display` 几何）UNVERIFIED：`node .tmp/reset.mjs 9222` → ECONNREFUSED（`.tmp/r83-reset-9222.log`），不重试。

## A2 `\=` 字节保真 — DONE

改前 9 行（`.tmp/r83-a2-before.log`，与 plan 表逐值同）：`\==a== 结尾`→`==a== 结尾`、`\==**b**c==`→`==**b**c==`、`\===a===`→`===a===`、`a \== b`→`a == b`、`\== 单独`→`== 单独`、`\=\=`→`==`、`x \=\= y`→`x == y`（7 行 `bytesSame:false`）；`a == b`、`==a====b==` 已原样。

实现 `src/lib/inlineSyntax.ts`：`eqEscaped` mark（`inclusive:false`、`slot` 属性防相邻合并且不落盘/DOM、`span.sl-eq-escaped`、`renderMarkdown` 每枚补 `\`）+ 不随开关关的 tokenizer；marks/tokenizers 各加一项。测试 14→20。
证据：探针 `.tmp/r83-a2-eq-escape.ts`（原定 `.mjs` 改 `.ts`，要 import src 的 `.ts`）9 行全 `bytesSame:true,stable:true`；带 Mathematics 另验 `$\alpha \= x$`（inlineMath 1、escaped 0）、块级 `$$a \= b$$`（blockMath 1）、行内代码 `\=`（mark 0）全字节同（`.tmp/r83-a2-eq-escape.log`）。`npm test` 47 文件 601 条 0 fail（A2 +6、A3 +4）。静态 `eqEscaped`：改前 0、改后 src 12 行（`inlineSyntax.ts` 6 处）。浏览器 6 项 UNVERIFIED。残余：① 复制 `\=` 再粘回不重建 mark（审查 P2-5），HTML 导出只剩 `=`；② 表格单元格里的 `\=` 与 HEAD 相同（单元格解析不吃行内 mark，`.tmp/r83-a2-table-head.ts`），未改动表格靠 reuseTables 保字节；公式/代码/列表/引用/加粗 11 例全同（`.tmp/r83-a2-eq-extra.log`）。roundtrip 不覆盖依据：`scripts/roundtrip.mjs:30` 的 EXTENSIONS 只有 inlineMarks。

## A3 B-212 — DONE

改前：两分支分写（`TreeActions.tsx:287-293`），`要恢复` 1（`:292`）、`文件管理器` 1（`:292`）。新增 `deleteDialogText.ts`（`DELETE_TRASH_DIR`/`DELETE_RECOVER_TAIL`/`deleteDialogLead|Text`）+ 4 条单测；TreeActions 两分支统一 `{lead}<code>{path}</code>{tail}`。定稿：干净「移到这个文件夹的 .sidelight/trash/，不会当场永久删除。要恢复：在删除后的提示里点「撤销」，或把回收站里的文件移回原位。」脏分支只换 lead（多交代未保存正文/批注/撤销搬回）。改后：`要恢复` 1（`deleteDialogText.ts:22`）、`文件管理器` 0、测试 4/4。浏览器项 UNVERIFIED。备注：审查 P2-4 建议留「在文件管理器里」与本批验收「改后 0」冲突，按验收执行；可执行提示保留，单测锁。

## 门禁

`tsc` 0；`npm test` 47 文件 601 条 0 fail（`.tmp/r83-npm-test.log`）；`verify` PASS 304,492 B（`.tmp/r83-verify.log`）；`roundtrip` rich 6/8 + source 8/8（`.tmp/r83-roundtrip.log`）。截图 0。未 commit/push、未动 `release/`、版本 0.32.1。

## CHANGELOG

- 编辑：`\=` 保存不再丢反斜杠（`\==` 不再变真高亮）。
- 界面：删除确认框两分支共用恢复说明，干净分支也提示应用内「撤销」。

## 踩坑（3）

1. `git grep` 不搜未跟踪文件：新文件的「改后 1」要 `--untracked`。
2. 验收「某字面改后 0」连注释与测试里的也算，删文案要连注释、断言一起改。
3. `slot` 用 `parseHTML/renderHTML:()=>null` 只让相邻 mark 不相等；无 Mathematics 的管理器里 `$…$` 只是文本，公式锁要另带扩展。
