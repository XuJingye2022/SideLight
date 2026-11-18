# 第 75 轮执行报告（executor）

轮前 `e5dd887`。CDP 9222–9226 全 DOWN（各探 1 次）→ 浏览器项 UNVERIFIED；dev 5175 UP。

## A1 点公式编辑后取消仍露 `$…$`（B-157）— DONE
- `src/lib/mathInput.ts`：新增 `mathInputSelection(doc, atomFrom, nodeSize=1)`、`closeMathEditTransaction(state,{from,to,remove})`。落点按候选顺序试并**拒绝 NodeSelection**；remove 先删再落 `from`，keep 先向后再向前。输入规则 `:124` 改用。
- `src/App.tsx`：三条出口并成 `finishMathEdit(mode)`（非空 latex / 空 latex / 取消），`applyMath` 转调，Esc `onCancel` 改 `finishMathEdit('cancel')`；先 dispatch 再 focus。
- `src/lib/mathInput.test.ts` +5（按 plan ①–⑤：`ab$x^2$` 落 4 且 revealed=[]；NodeSelection→keep→empty；remove→删点 from；块级 atom [2,3) 不相交；文末夹到 content.size、不抛、含唯一块级公式的退化处置）。`package.json` 登记。
- 结构断言：`git grep -c 'setMathEdit(null)' -- src/App.tsx` = **1**（`src/App.tsx:5264`，在 `finishMathEdit` 内，同函数 `:5257` 含 `closeMathEditTransaction`）；`git grep -nE 'closeMathEditTransaction|mathInputSelection' -- src` = **7** 行（≥4）。
- UNVERIFIED：点 `$\alpha$` 露 1 → Esc 露 0、手打 `$x^2$` 同两项（CDP 不可用、脚本缺失）。BACKLOG 不判 fixed。

## A2 `==高亮==` 默认开 + 一次性迁移（B-158）— DONE
- `src/lib/settings.ts`：`SETTINGS_VERSION=2`、`Settings.settingsVersion`、`DEFAULT_SETTINGS` 同字段；load 用 `parsed.settingsVersion >= SETTINGS_VERSION ? parsed.inlineSyntax !== false : true` 并回填版本；`saveSettings` 恒写版本。
- 7 处按**整句语义**改写：`App.tsx:991`、`inlineSyntax.ts:11`、`inlineSyntax.test.ts:47`、`settings.ts:29`、`tilde.ts:28`、`styles.css:848`、`SettingsDialog.tsx:119`。
- `git grep -nF '默认关' -- src`：改前 **8** → 改后 **1**（唯一 = `src/lib/settings.ts:130` smartPunctuation，未动）；`git grep -cF '默认开' -- src` 合计 **13** ≥ 6。
- `settings.test.ts` +5：无存档 / `{}` / 无版本 false → true；版本 2、3 的 false → false；save↔load 后 JSON 不回弹。
- 文档 3 处 + CHANGELOG 未碰（派 scribe）。UNVERIFIED：真机 `.sl-eq` 渲染与保存字节。

## A3 块级公式排版（B-159）— DONE
- `src/styles.css:2116` `.katex-display` 改 `margin: 0 auto; width: fit-content; min-width: 100%;`；其余三条不动。
- `src/lib/mathStyle.test.ts` +2：按 `[^{}]*\{[^{}]*\}` 切规则、先断块数 = 4，再按块成对断言（根块 margin / inner overflow-x / katex 字号 / display 三项）；`package.json` 登记。
- 定案保留 1.08em（正文 17 px → 块级 18.36 / 行内 20.57，差 2.21 px，建议 scribe 记 P2）。UNVERIFIED：长公式滚动与根块 margin 计算值。风险照录：打印同 DOM，`overflow:auto` 会裁超长公式。

## 门禁
- `npx tsc --noEmit` PASS；`npm test` **43 文件 548 条 0 fail**（41/536 → +2 文件 +12 条：5+5+2）。
- `roundtrip` rich **6/8**、source **8/8**；`verify` **PASS**，首屏 gzip **303,381 B**（改前 303,043，+338；内部 310,000，余 16,619）。
- 无截图（CDP DOWN）。dev 5175 静态旁证：`mathInput.ts` 两个新函数、`styles.css?direct` 新三项。

## CHANGELOG 一行建议（scribe）
`- 行内公式输入/取消编辑后保持成品；`==高亮==` 默认开 + 旧存档一次性迁移；块级公式居中且超宽可横向滚动（第 75 轮 B-157/158/159）`

## 新踩坑
1. `TextSelection.near($pos, 1)` 找不到文本位置会**回退到后退**并落到 atom 上变 NodeSelection（文末块级公式 keep 即此）。判「光标不在公式上」要按候选顺序试并查 `instanceof TextSelection`。
2. 整篇只有一条块级公式时无文本位置可落，keep 退回 NodeSelection（测试 ⑤；刻意不插空段改正文）；remove 路径 ProseMirror 补空段落，仍能恢复文本光标。
3. `npm test` 是显式文件清单：新测试不登记 = 门禁假绿（本轮 41 → 43 文件）。
