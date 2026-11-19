# 第 93 轮 B 轮独立验收（复验，tester）

只验第 92 轮计划的 B 轮（B1 已存定界符对后填、B2 其单测与门禁）。未读 `impl.md`；自写脚本与断言，未复用 executor 脚本。**上轮 FAIL 项（离开出口一次撤销撤光整段）已复验通过。**

- 轮前 startSha `10bcc98`；dev 5175 HTTP 200（未重启）；CDP 9222 不可用 → 真机 ego **57270**。
- 结论：**PASS**。门禁全绿，B1 计划 ①–⑨ 全过，回归两项全过。

## 门禁（各一次）

- `npm run verify` **PASS**：首屏 gzip **312,423 B**；基线 309,804 → 净增 **+2,619 B**。内部 310,000 **超 2,423 B（只 WARN，exit 0）**；硬线 320,000 余 **7,577 B**。日志 `.tmp/r93-t2-verify.log`。
- `npm test` **PASS**：**57 文件 / 778 条 / 0 fail**（新增 `delimiterPair.test.ts` 27 条）。日志 `.tmp/r93-t2-test.log`。
- `npm run roundtrip` **PASS**：rich 7/9 + source 9/9、firstSaveBlocked 1/9；`docs/roundtrip-report.md` 与 HEAD 无 diff。日志 `.tmp/r93-t2-roundtrip.log`。

## B1 真机（自写 `.tmp/e2e-r93-t2-b1.mjs`，**27/27**；`.tmp/r93-t2-e2e.log`）

截图 2 张：`shots/round-93/tester-r93-01-formula.png`（① 转换后）、`shots/round-93/tester-r93-02-undo.png`（② 一次撤销后字面）。全程 0 pageerror / 0 console.error。

| 计划项 | 实测 |
| :--- | :--- |
| ① `$$`→←→`E=mc^2`→→ | **PASS**：打字中 inline 0（字面 `$E=mc^2$` 仍在）；离开后 inline 1、latex `E=mc^2`、正文无 `$`、选区 empty（不选中 atom） |
| ② `a + b` + 一步撤销 | **PASS**：inline 1、latex `a + b`；**一次 `Ctrl+Z` → 字面 `$a + b$`、inline 0**（上轮 FAIL 项）；再撤一次后 0 atom 残留 |
| ③ 块级 | **PASS**：`$$$$`→←←→`x`→→ ⇒ blockMath 1、latex `x`、原段文字消失（只剩尾随空段）。计划键序 `$$`+← 实得行内 `$x$`，已按整段 `$$x$$` 口径验 |
| ④ `==`/`^`/`~` | **PASS**：eqHighlight 覆盖 2 字、caretSup 1、tildeSub 1（无 strike），定界符删净 |
| ⑤ 货币 | **PASS**：`$5 到 $` inline 0、字面留住 |
| ⑥ 空内容/围栏/行内代码 | **PASS**：`$$`+Enter 仍归 MathInputRules（blockMath 1、inline 0）；围栏内与 `Ctrl+E` 行内代码内 0 转换 |
| ⑥b/⑥c Enter / blur 出口 | **PASS**：两出口各 inline 1、latex 对；各 `Ctrl+Z` 一次回 `$y$` / `$z$` |
| ⑧ 重开 | **PASS**：载入 `$x^2$` + `==高亮==` ⇒ inline 1、eq 2 字；点段落 + →×4 后不变，`getMarkdown()` 字节 = 输入 |
| ⑨ 转义对 | **PASS**：载入 `\$x\$` ⇒ 字面 `$x$`、inline 0；→×4 后仍 0 转换、字节同 |

判定要点：⑧/⑨ 的「载入」走与 `App.setMarkdown` 同一条链（`protectMathPairs` → `escapeHtmlForParse` → `manager.parse` → `nodeFromJSON` → 整篇替换 + `addToHistory:false`），字节用 `editor.getMarkdown()` 对照。

## 回归（2 条）

- 第 92 轮 A1 粘贴脚本复跑 `.tmp/e2e-r92-tester-a1.mjs`：**19/19、0 fail**（`.tmp/r93-t2-regress-paste.log`）。
- `scripts/keyboard-acceptance.mjs`（`SIDELIGHT_CDP=57270`，URL 5175）：**52/52**（`.tmp/r93-t2-keyboard.log`；跑完已 `git checkout -- shots/round-05/`）。

## 观察 / 未验

- 首屏内部预算超 2,423 B（硬线仍余 7,577 B），下一轮加静态代码前先裁剪（BRIEF Top 1）。
- 计划未给 B 号、BACKLOG 无对应行（`B-22x` 只到 B-220），故无行可标 `fixed`；按角色规则只补 CHANGELOG 与 STATE。
- UNVERIFIED：真实中文 IME 下的收尾时机；多行 `$$\n…\n$$` 跨段（计划记为缺口）；表格内块级守卫只有单测；「重开」只验解析/序列化字节，未走真实 FSA 写盘（写盘保真由 roundtrip 的 `07-math.md` 覆盖）。
