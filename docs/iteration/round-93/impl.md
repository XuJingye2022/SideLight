# 第 93 轮执行报告（executor，B 轮）

## 任务状态
- **B1** 已存定界符对后填的就地转换 — DONE
- **B2** B1 的测试与门禁 — DONE

## 改动文件
- 新 `src/lib/delimiterPair.ts`（17,481 B，照 `linkInput.ts` 形状）：`collectPairs`（单 `$` 对=行内、整段 `$$…$$`=块级、`==`/`^`/`~` 复用 `pasteMatches`）、`commitPair`、`buildPairTransaction`、`delimiterPairPlugin`（`state.apply` 维护 armed；出口 = 离开 / 回车 / blur）、`DelimiterPair` 扩展。
- 新 `src/lib/delimiterPair.test.ts`（25 条）。
- `src/lib/mathNodeView.ts`：`isMathEditing()`（模块计数，`enter` 加、`closeEdit` 减）。
- `src/App.tsx`：import + `LinkInput` 后挂 `DelimiterPair.configure({ inlineSyntax })`；`package.json` test 链尾加新文件。

## 门禁
- `tsc --noEmit` 通过；`npm test` exit 0 **57 文件 776 条**（第 92 轮 56/751）；`npm run roundtrip` exit 0（rich 7/9、source 9/9，报告无 diff）。
- `npm run verify` **PASS**：首屏 gzip **312,387 B**（310,767 → **+1,620 B**），内部预算越 2,387 B（WARN）、硬线余 7,613 B。
- E2E `.tmp/e2e-r93-b1-pair.mjs`（日志 `.tmp/e2e-r93-b1-pair.log`）**22/22 PASS**、pageerror 0；回归 `.tmp/e2e-r93-regress-paste.mjs` **19/19 PASS**。截图 `shots/round-93/b1-pair.png`、`b1-pair-final.png`。

## E2E 实测（断言读 `editor.state.doc.toJSON()`）
- ① `$$`→←→`E=mc^2`→→ ⇒ inline 1、JSON 无 `$`；⑦ `Ctrl+Z` 一次 inline 0；② `a + b` 含空格照转。
- ③ `$$$$`→←←→`x`→→ ⇒ blockMath 1、原子段消失；④ `====`/`^^`/`~~` ⇒ 三枚 mark 各 1 且 JSON 只剩内容。
- ⑤ `$5 到 $` ⇒ math 0；⑥ 空 `$$`、行内代码 `$x$` ⇒ 0；⑥b blur、⑥c 回车 ⇒ 提交；⑧⑨⑩ 三份夹具 `Ctrl+S` 字节全同（载入不 arm）。

## 计划偏差（最小改动绕过，代码注释已写）
1. **armed 清空加 `docChanged`**（计划只写「`addToHistory:false` 载入清空」）：App 每次 React 渲染都用它派发**纯选区**装饰事务（`src/lib/decorations.ts:35`，`steps:0`），照字面会把 arm 完的下一条事务当载入清掉 —— 真机表现是逻辑全对、一次都不转换。
2. **行内代码按范围判**：再剔除「整对 `from..to` 带 code mark」的对；光标 `→` 挪出代码片段一位后 `$from.marks()` 为空（`resolvedpos.ts:130`），只判光标会漏（真机把代码里的 `$x$` 收成了公式）。
3. 块级落点用既有 `mathInputSelection`（内部即 `TextSelection.near`）：文末只剩块级公式时裸 `near` 退成 NodeSelection、`mathReveal` 继续露源码（`mathInput.test.ts` ⑤）。
4. `collectPairs` 两条计划外守卫：文本块 >200,000 字符不扫、行内内容夹 atom 不算公式。Enter 按计划「判完返回 `false` 放行」。

## 缺口 / UNVERIFIED
- 「距光标 ≤1」硬规则：点击远处、`End` 到行尾不提交（只有 blur 兜「离开编辑器」），属计划口径。
- 多行 `$$…\n…$$` 不转；表格单元格里的块级公式只有代码路径；真实中文 IME 未跑。
- 观察（**既有**）：正文只剩公式 atom 时 `stats.chars===0`，`.editor-placeholder` 仍显示。

## CHANGELOG 一行建议
`- 先把一对定界符打好再回头填内容（`$$…$$`、`==…==`、`^…^`、`~…~`）时，光标离开 / 回车 / 失焦即收成公式或行内语法；载入文档与粘贴落下的字面定界符不动，行内代码与围栏里不转。`

## 新踩坑
1. **`addToHistory:false` 不等于「载入」**：App 每次渲染都用它派发纯选区装饰事务（`decorations.ts:35`），插件按「见到就清空」会清掉刚 arm 的区间；判据要带 `tr.docChanged`（`delimiterPair.test.ts` ㉕）。
2. **`ResolvedPos.marks()` 在光标挪出 code 片段一位后为空**：行内代码守卫要按「整对范围 `rangeHasMark`」判。
3. **探针按 `String(plugin.key)` 过滤要带大小写**：实际 key 是 `sidelightDelimiterPair$`，小写匹配恒 0 命中，会误判「插件没注册」。

## 返修记录（tester FAIL 后，第 93 轮）

**失败项**：离开出口一次 `Ctrl+Z` 把整段文字撤光（计划 ②「一步回字面」/⑦「回前态」）。

**根因两层**（tester 只报第一层；第二层是返修时用 history items 探针查出）：
1. 补丁事务由 `appendTransaction` 返回，`buildPairTransaction` 未 `closeHistory`，被 `newGroup` 判据 `prevTime==0 || (!appended && …)`（`prosemirror-history/dist/index.js:278-280`）并进上一段打字 → 三出口统一 `closePairHistory`（`delimiterPair.ts:300-303`）。
2. 只加①后真机仍「一次 Ctrl+Z 没反应」：撤销还原的字面 `$E=mc^2$` 被撤销事务按「插入即 arm」重新武装，紧接着 App 的纯选区装饰事务（`decorations.ts:40`，`addToHistory:false`）又把它收成公式 → `nextArmed` 对 `isHistoryTransaction(tr)` 只映射旧 armed、不 arm 新对（`:264`）。

**测试加固**：㉔ 精确断言一次撤销后 `textContent === '$E$'`（原 `includes('$')` 撤光时同样成立，`delimiterPair.test.ts:336`）；新增 ㉖ mark 类一次撤销（`:351`）、㉗ 撤销后装饰事务不再收（`:366`，去掉第 2 层守卫时实测 1 红、已复核）；自测 ⑦/② 改精确比对 `docText`。

**证据**（CDP 57270）：tester 双探针通过（离开出口 undo1 = `$a + b$`；`$E=mc^2$` 1 次回字面、2 次才清空；`.tmp/r93-fix-probe-undo.log`、`.tmp/r93-fix-probe-undo2.log`）；tester 独立验收 `.tmp/e2e-r93-tester-b1.mjs` **23/23**（原 21/23，`.tmp/r93-fix-tester-b1.log`）；自测 `.tmp/e2e-r93-b1-pair.mjs` **22/22**（`.tmp/e2e-r93-b1-pair-fix.log`）；A1 回归 `.tmp/e2e-r93-regress-paste.mjs` **19/19**（`.tmp/r93-fix-regress-paste.log`）；截图 `shots/round-93/b1-pair*.png` 已刷新。

**门禁**：tsc 0；test **57 文件/778 条/0 fail**（+2）；roundtrip 0（rich 7/9、source 9/9，报告无 diff）；verify 0，首屏 **312,423 B**（312,387 → +36；越内部预算 2,423 只 WARN，硬线余 7,577）。日志 `.tmp/r93-fix-{test,roundtrip,verify}.log`。

**残余 / UNVERIFIED**：㉗ 只模拟装饰事务时序，真实 React 时序由 E2E 覆盖；真实中文 IME 下的撤销时机未跑；多行 `$$…\n…$$` 与表格内块级守卫同前轮缺口。
