# 第 106 轮计划审查（critic）

结论：**PASS**（0 P0 / 0 P1，6 条 P2）。本轮条目 B-235 属 P2，按角色规则只审高风险面：token 真伪、体积路径、验收可复现。startSha `42eb999` 核对一致，工作树干净（只多 `docs/iteration/round-106/`）。

## 核对通过

- 缺陷真实：ego CDP 57270 在 5175 实测 `.rail-chat-input`（theme=system 深色）`rgb(255,255,255)` / `rgb(59,59,59)` / `1px solid rgb(133,133,133)` / radius 0 / `320×44`，与计划第 2 节同。
- 目标块存在且只 5 条声明：`src/styles.css:1556-1562`；全文件 `textarea` 恰 4 处（1556/3210/3221/3231），无全局规则冲突。
- 三个 token 三主题齐备：`--line-input` `styles.css:23/60/92/123`、`--panel` `:4/42/74`、`--ink` `:5/43/75`；`border-radius: 8px` 与 `.field input:1876`、`.dialog-textarea:3218` 同款。
- 尺寸门槛可达：现在 `box-sizing:border-box`、UA 边框已是 1px、`line-height:normal`，h=44 = 2×15 + 12 + 2；换成 `1px solid` 后高度不变，差 ≤1 px 成立。
- 体积路径对：`measure-first-screen.mjs:36-44` 计入 `<link rel=stylesheet>`，CSS 增量确实进门；改前门 315,153（`round-105/impl.md:26`）+≈12 → 315,165，`--max 315300` / ≤315,250 有余量。源文件 77,962 B 与 `.tmp/r106-plan-gzip.cjs` 一致（代理值，±20 已写明）。
- A2 可落地：`themes.test.ts` 已有 `cssVars`(`:13`)/`ruleDeclarations`(`:126`)/`resolveColor`(`:140`)/`contrastRatio`(`:5` 导入)，且该文件已在 `npm test` 链上（文件数仍 61）。
- A3 回归脚本存在且不会被配色假红：`.tmp/e2e-r96-a1-chat.mjs` 内 `color|background|border|rgb` 0 命中，几何断言只到 rail 级。

## 漏洞（P2，按影响排序）

- **CR-1 `resolveColor` 吃不下 border 整串**：`themes.test.ts:140-146` 只认 `var(--x)` 与 `color-mix(…)`，直接把 `1px solid var(--line-input)` 传进去会 `assert.fail('认不出的颜色写法')`。修法：调用前 `declarations.border.replace(/^1px solid /, '')`，或断言 `borderWidth === '1px'` 后单独取色；写进 A2 步骤。
- **CR-2 期望对比度 dark/sepia 互换**：按 token 算 `--line-input`/`--panel` 为 light **3.04** / dark **3.47** / sepia **3.25**（`#6b7178` 对 `#191c20`、`#8a7a62` 对 `#efe2c9`）。计划写的 3.25/3.47 顺序相反；阈值 ≥3.0 都过，但会把「读数与计划不符」当成问题。修法：改写为区间或改正顺序。
- **CR-3 A2 少断一对邻色**：填充改 `--panel` 而 rail 无底色（`.margin-rail:1147` 无 background，落到 body `--paper` `:155`），边框外侧邻色是 `--paper`。该对实测 light 3.21 / dark 3.64 / sepia 3.44 也过，但没进门；将来把填充改回 `--paper` 或改 rail 底色时门不响。修法：再算 3 对、pair 数 6→9，或断言注释里写明「只保证内侧邻色」。
- **CR-4 排掉 `font` 后仍留一项不一致**：真机实测 `fontFamily:"monospace"`（同文件 `.field input:1871`、`.dialog-textarea:3213` 都写了 `font: inherit`）。本轮只修配色是照用户口径，但「与既有控件一致」还剩字体一项。若要一条修干净：写 `font-family: var(--font-ui)`（**不要**写 `font: inherit`——它会连 `font-size` 一起重置成父级，除非放到 `font-size:13px` 前），净增约 +20 B raw 仍在门内；否则本轮必须把新条目真写进 BACKLOG，别只留在计划 §4。
- **CR-5 A1 的静态门不证明落地**：`git grep -c 'rail-chat-compose textarea'` = 1 改前就成立（一处规则块）。修法：改成块内 4 条声明逐条 grep，或 `--line-input` 命中数 16→17；真门仍是 A2+A3。
- **CR-6 A3 的「Enter 走发送」没写要不要打桩**：`streamChat` 在无 Key 时走 mock/401 两条分支。修法：写明沿用 r96 的假 fetch/SSE，断言「发送后 turn 数 +1 或出现 `.rail-chat-mock`」，不要断后端文案。

## 未复核

- light / sepia 两档 pre 值未真机重测（只核 token 与深色实测）；A3 读数以脚本为准。
