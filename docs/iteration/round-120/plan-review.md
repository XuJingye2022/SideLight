# 第 120 轮计划审查（critic，v2：revision 1 终审）

结论：**PASS**。上一版 CR-1…CR-4 全部修掉；另留 4 条 P2 提醒，不阻塞执行。

## 上一版漏洞逐条复核（均已修）

- **CR-1（P0，原「`tabIndex={0}` 恰 1 处」必红）→ 已修**。`plan.md:23` 改断 4 条：① `<ul…className="rail-diff-rows"…>` 恰 2 处，按开标签后 120 字含 `diffData.rows`/`reviewRows.rows` 分派；② 对比那条含 `tabIndex={0}`+`role="list"`+`aria-label`；③ 在审那条不含；④ 全文件 `tabIndex={0}` 恰 **3** 处。实测现文件恰 2 处（`MarginRail.tsx:538`、`:769`），改完 3 处成立；`:472` 是 `tabIndex={railTab === tab ? 0 : -1}`，不匹配该字面量、不干扰。口径与 `railModalGate.test.ts:22-35` 的 `source()`/`count()` 同型。
- **CR-2（P1，diff 口径自相矛盾）→ 已修**。`plan.md:27` 改成 `git diff --stat` = `2 insertions(+), 1 deletion(-)`（`{/*…*/}` 注释新增 1 + 属性行新增 1 + 旧行删除 1），并写「不按 1 处 -/+ 判」；`-U0` 断 `^-[^-]` 1、`^+[^+]` 2。实测这条路径唯一。
- **CR-3（P1，无边界 stash）→ 已修**。`plan.md:13-17` 写死 before 在 A1 改码**之前**，禁整树 stash；补跑只许 `git stash push -- src/components/MarginRail.tsx`，以 `git stash list` 空 + diffstat 回 2+/1− 复验。轮前工作树实测只有 `?? docs/iteration/round-120/`，HEAD `acd2969`，与计划一致。
- **CR-4（P2，硬编码浅色描边）→ 已修**。`plan.md:35` 改断 `outlineStyle:solid`+`outlineWidth:2px`+`outlineColor` = 页内 `--focus-ring` 解析值。实测 `styles.css:26/63/95/126` 四块三色（`#2b6d64`/`#9ccbc2`×2/`#7a5a2a`），`:192-195` 全局 `:focus-visible`、`:27` `--focus-offset:2px`。
- CR-5（体量）⑧⑨⑪ 已列可裁；CR-6（measure 注释）已排在 `npm run verify` 之后抄。

## 体积复核（今日实测，按此执行）

`node scripts/measure-first-screen.mjs`：门 gzip **315,542**、距硬线余 **4,458**；`dist/assets/MarginRail-DSGFlalk.js` raw 20,999 / gzip9 **7,398**；`dist/index.html` 只引 3 个产物、无 MarginRail → 属性只进懒 chunk，门应**恒等** 315,542。计划引的 315,542/4,458 正确；口述「312,423/7,577」是第 93 轮旧数，别按它算余量。`package.json` test 链实测 63 个 `.test.ts`，+1=64 成立。

## 新洞（P2，不阻塞）

- **N1（P2）注释写法写死**：`:874` 在 JSX 子节点区，裸 `// 第 120 轮…` 会被 React 当**可见文本**渲染（面板顶部多一行字），而 `git diff --stat` 仍 2+/1−、静态门剥注释后仍绿——静默脏字。改法：`plan.md:21` 写明用 `{/* 第 120 轮 B-250：… */}` 单行，同 `:829-830`/`:888-889`/`:955-956`。
- **N2（P2）A1 步 2 的 CSS 逃生门与验收矛盾**：步 2 允许「描边被剪才加 `.rail-diff-rows:focus-visible{outline-offset:-2px}`」，验收又要 `git diff -- src/styles.css` 空。实测不可能被剪：`.rail-diff-sheet`（`styles.css:1406-1418`）无 `overflow:hidden`、padding 16px；ul 自身 `overflow:auto` 不裁自己的 outline。改法：删该句（R1 划掉），全轮 CSS 恒 0 行。
- **N3（P2）A2 ③ 给「解析值」的方法**：`getPropertyValue('--focus-ring')` 回原样 `2px solid #2b6d64`，`getComputedStyle(ul).outlineColor` 回 `rgb(43, 109, 100)`，直接比必假红。改法：脚本插探针元素（`outline:var(--focus-ring)`）读其 computed `outlineColor/outlineWidth` 作期望值再比 ul。
- **N4（P2）属性字面量写死**：静态门按字面 count，写成 `tabIndex={ 0 }`/`tabindex` 会 3→2 假红。改法：A1 写明逐字 `tabIndex={0}`，与 `:769` 同格式。

## 结论

PASS。执行只守三件：门恒 315,542；before 在改码前跑；CSS 0 行。
