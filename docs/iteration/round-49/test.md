# 第 49 轮测试报告（tester，首次独立验收）

- 轮次：`round=49`、`nn=49`；轮前 `startSha=57e2a81748090e63b88b1ad4f998ca3b689e347f`（`git rev-parse HEAD` 开工时同值）。
- 验收依据：`docs/iteration/round-49/plan.md`（revision 3）、`git diff`。**未读 `impl.md`**（角色要求）。
- 环境：dev server `http://localhost:5175`（未起、未重启）；CDP **9222**；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 push、未动 `release/`。
- 自写脚本（从零复验，不复用实施者脚本）：`.tmp/e2e-r49-tester-t1.mjs`、`.tmp/e2e-r49-tester-t2.mjs`、`.tmp/e2e-r49-tester-t2b.mjs`、`.tmp/e2e-r49-tester-t3.mjs`、`.tmp/e2e-r49-tester-big.mjs`、`.tmp/r49-tester-probe.ts`、`.tmp/r49-old-vs-new.ts`。
- **结论：PASS**（门禁全绿、三条任务从零复验通过、无回归）。计划偏差 2 条，均非缺陷（§4）。

## 1. 门禁（真实输出）

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npx tsc --noEmit` | **exit 0** | 会话输出 `tsc exit=0` |
| `npm test` | **32 个文件 425 条，fail 0** | `.tmp/r49-tester-npmtest.log`：32 段 `ℹ tests` 求和 = **425**，每段 `ℹ fail 0`；`html.test.ts` 33 条（24 + 9）、`smartTyping.test.ts` 17 条（15 + 2） |
| `npm run roundtrip` | `rich: 5/7 完全保真`、`source: 7/7 等值` | `git status` 无 `docs/roundtrip-report.md` 改动（报告无 diff） |
| `npm run verify` | **PASS**：`total raw=951197 gzip=294373 headroom=25627 files=3 max=320000`；`target=310000 gap=15627` | `.tmp/r49-tester-verify.log`；主 chunk `index-Co4S6KZw.js` 913,822 raw / 286,419 gzip、CSS 36,592 / 7,504 |
| `node scripts/keyboard-acceptance.mjs` | **52 PASS / 0 FAIL** | `.tmp/r49-tester-keyboard.log`；跑完 `git checkout -- shots/round-05/` |
| `SIDELIGHT_URL=http://localhost:5175 node scripts/fidelity-acceptance.mjs` | **19 PASS / exit 0** | `.tmp/r49-tester-fidelity.log`；跑完 `git checkout -- shots/round-10/` |

与计划对照：条数计划写「约 425（414 + 9 + 2）」→ 实测 **425**；首屏计划「≤310,000」→ 实测 **294,373**（比第 48 轮 +250，与 CHANGELOG 一致）。

## 2. T1 命名 HTML 实体保真（P1）— 从零复验

脚本：`.tmp/e2e-r49-tester-t1.mjs`（假 FSA `.tmp/r30-fsa.mjs`；7 篇 `e*` 种子 + 用盘上字节重开再保存一次）。日志 `.tmp/r49-tester-t1.log`。

| 种子 | `disk === seed` | `stable2`（第二次保存不变） | 重开 `table` / `cell` | 开篇 `dirty` | dialog |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `e1-nbsp.md` `甲&nbsp;乙\n` | **true** | **true** | — | **false** | 0 |
| `e2-more.md` `甲&copy;&hellip;&#8212;乙\n` | false（**预期**，见下） | true | — | false | 0 |
| `e3-inline-code.md` | **true** | true | — | false | 0 |
| `e4-fence.md` | **true** | true | — | false | 0 |
| `e5-table.md` | **true** | true | **1 张表 / `a&nbsp;b`** | false | 0 |
| `e6-line-nbsp.md`（整行 `&nbsp;`） | **true** | true | — | false | 0 |
| `e7-literal-amp.md` `甲&nbsp;乙\n价格 &amp; 单位\n` | **true**（`disk === seed`） | **true** | — | false | 0 |

- `e2` 盘上为 `甲&copy;&hellip;—乙\n`：`&copy;`/`&hellip;` 保住、`&#8212;` 按计划 §4 的既有口径在解析期解码成 `—`（渲染不变），所以 `same:false` 是**预期**，与 plan §步骤 6 写的一致。
- `e7` 是本轮 P1 回归锁：改前盘上第 1 行会变 `甲&amp;nbsp;乙`，本轮 `disk === seed` 且 `stable2:true`。
- 源码视图旁证：保存后 `Ctrl+/` 源码框值 = `甲&nbsp;乙\n`（与盘上同，截图 `shots/round-49/tester-t1-source-after.png`）。
- **1 MB 规模**（`.tmp/e2e-r49-tester-big.mjs`）：1,000,000 B、正文 1,000 处 `&nbsp;` → 载入 2,658 ms、一次 `Ctrl+S` **141 ms**、`disk === seed`（`same:true`）、正文里 `&nbsp;` 计数 1,000。日志 `.tmp/r49-tester-big.log`。
- 全程 `[role="dialog"]` 计数 0、控制台 error 0（`## z-errors {"errors":[]}`）。

单测侧（`npm test` 内）：`html.test.ts` 新增 9 个 `test()`，覆盖计划 §步骤 5 的 6 条 + R49-1 用例 7/8 + R49-9 用例 9；既有 `&amp;lt;` / `&amp;#42;` / `&amp;lt` / `A &amp; B`（`src/lib/html.test.ts:121-127`）一条未改且全绿。

## 3. T2 四条纯 CSS — 从零复验（浏览器实测值）

脚本：`.tmp/e2e-r49-tester-t2.mjs`（含 `<mark>`、行内代码、短行代码块、表格、非法 mermaid 围栏的种子文档）、`.tmp/e2e-r49-tester-t2b.mjs`（表格条，真实鼠标点单元格）。日志 `.tmp/r49-tester-t2.log` / `-t2b.log`。

| 判据 | 浅色实测 | 深色实测 | 计划线 | 判定 |
| :--- | :--- | :--- | :--- | :--- |
| `mark` 底 ↔ 行内 `code` 底 RGB 欧氏距离 | **51.2** | **41.8** | ≥40 / ≥30 | PASS |
| `mark` 底 ↔ `--paper` 距离（`#f0e0bd`↔`#f6f4ee` / `#453618`↔`#15171a`） | **53.3** | **57.2** | ≥40 / ≥30 | PASS |
| `mark` 内文字对比度（`rgb(29,32,35)` / `rgb(233,230,224)`） | **12.55:1** | **9.4:1** | ≥4.5 | PASS |
| `pre code` 计算字号 vs 行内 `code` vs `p` | **15.3 px** / 14.79 px / 17 px | 同 | ≥ 行内、<17 | PASS |
| `pre` 的 `overflow-x` | `auto` | `auto` | 仍是 auto | PASS |
| 短行种子 `pre.scrollWidth === clientWidth`（1440 / 1024） | **574 / 574**、**764 / 764** | — | 相等 | PASS |
| 页面级横向滚动（1440 / 1024） | `scrollWidth === clientWidth`（1440/1440、1024/1024） | — | +1 以内 | PASS |
| 查找条 7 按钮高 / 宽 | h **24**；w 33/33/25/25/29/43/66 | — | ≥24 / 宽度照实记 | PASS |
| 表格条 7 按钮高 / 宽（1440 与 1024 两档） | h **24**；w 53/53/53/53/41/41/41 | — | ≥24；条不溢出 | PASS |
| 两条工具条 `scrollWidth <= clientWidth + 1` | 1440/1440、1024/1024 | — | 不溢出 | PASS |
| `.mermaid-preview.is-error` 文字对比度 | **5.36:1**（`rgb(180,69,58)` on `rgb(255,253,248)`） | **6.92:1**（`rgb(232,145,127)` on `rgb(28,31,35)`） | ≥4.5 | PASS |

- **ui N5（侧栏页签 hover）复测：已生效，不改 CSS**。干净页面（`[role=dialog]` 0、`.settings-backdrop` 无）→ `hover` 非当前页签「大纲」→ 等 320 ms → `background-color: rgb(232, 240, 237)`（`--accent-wash`）、`color: rgb(35, 84, 77)`（`--accent-ink`），当前页签「文件」仍是 `rgb(255,253,248)`（`--paper-raised`）。finder 的 `changed:false` 不成立（与 plan §T2 的判断一致）。
- 截图：`shots/round-49/tester-t2-mark-light.png`、`tester-t2-mark-dark.png`、`tester-t2-table-bar.png`。
- 静态核对：`src/styles.css` 里 `mark-bg` 共 **5 行**（4 处声明 + `.doc-body mark` 1 处使用），四处主题块（`:root`、`html[data-theme='dark']`、`@media (prefers-color-scheme: dark)`、`@media print`）齐。

## 4. T3 中文上下文 `--` 出 `——` — 从零复验

脚本：`.tmp/e2e-r49-tester-t3.mjs`（真实鼠标点段落，点后停 220 ms；AGENTS §8 的假阴坑已避开）。日志 `.tmp/r49-tester-t3.log`。

| 路径 | 实测 | 判定 |
| :--- | :--- | :--- |
| 空段落 `---` + 空格 | `hr:1` | PASS（回归锁） |
| 空段落 `***` + 空格 | `hr:2` | PASS |
| 中文句子里打 `--` | 编辑视图 `中文——中文`；`Ctrl+/` 源码 `中文——中文`；`Ctrl+S` 盘上 `中文——中文` | PASS（三处一致，无 `----`、无半截 `—中文`） |
| `word--word` | `word—word` | PASS |
| `甲 -- 乙` | `甲 — 乙`（第 47 轮口径） | PASS |
| 代码围栏里 `a--b` | `a--b`（`pre:1`） | PASS |
| 手打 `| --- | --- |` | 原样，未变表格/分隔行 | PASS |
| 控制台 error | 0 | PASS |

截图：`shots/round-49/tester-t3-em-dash.png`（编辑视图 + 源码框对照）。单测侧：`smartTyping.test.ts` 新增 2 个 `test()`（6 条断言），既有 15 条全绿。

## 5. 计划偏差（均非缺陷，不判 FAIL）

1. **解码规则用「条数相等才整类解」，不是计划的「先到先解（`got < want`）」**。`src/lib/html.ts:82-90` 先数本稿同名 `&amp;<名>;` 的 `draftCount`，只有 `drafted === want` 才解回。两种口径在「原文 1 处真实体 + 本稿另有手打字面实体」时分歧：计划期望「解第 1 处、留第 2 处」，实现「整类保持」。实测差异（`.tmp/r49-old-vs-new.ts`）：
   - `repairHtml('甲&amp;nbsp;乙\n\n&amp;nbsp;', '甲&nbsp;乙\n')` → **旧 `甲&amp;nbsp;乙\n\n&amp;nbsp;` = 新**（`OLD=> ... NEW=> ...` 同值），计划 rev3 的用例 8 期望 `甲&nbsp;乙\n\n&amp;nbsp;`。
   - 判断：实现方向更保守——按文档顺序「先到先解」在「手打字面实体在前」时会把它解成真字符（反向改字节），与 T1 的 P1 目标冲突。`npm test` 的那条 `test('条数不齐时整类保持…')` 主动锁住这个选择，CHANGELOG 已知限制也写明了。**不影响 e1/e5/e6/e7 的 F1 修复**。
2. **`PARSED_ENTITY` 额外排除 `lt` / `gt` / `quot` / 数字体**（计划只要求排除 `amp`）。计划 §步骤 5 第 5 条期望 `repairHtml('写成 &amp;lt; 才不会变标签', '写成 &lt; 才不会变标签') === '写成 &lt; 才不会变标签'`，实测返回 **`写成 &amp;lt; 才不会变标签`**；同样与**改前**一致（`OLD => "写成 &amp;lt; 才不会变标签" NEW => 同`），所以是「没有改变既有行为」，不是回归。这三个名字由 `@tiptap/core` 的 `decodeHtmlEntities` 自己解码，正文里的 `&amp;lt;` 只可能来自作者手打，解掉会改用户字节。
3. 代码注释里引用「R49-10」（`src/lib/html.ts:18`），`plan.md` 里只有 R49-1…R49-9——纯注释编号问题，不影响行为。

## 6. 回归

| 套件 | 结果 |
| :--- | :--- |
| `npm test` 全量 | 32 文件 425 条，0 fail（含既有 24 条 HTML、15 条智能标点、serialize/baseline 等） |
| `npm run roundtrip` | rich 5/7、source 7/7（`docs/roundtrip-report.md` 无 diff） |
| `keyboard-acceptance` | 52/52 |
| `fidelity-acceptance` | 19/19（`SIDELIGHT_URL=5175`，默认是僵尸 5173 已避开） |
| 本轮 E2E 里的负对照 | `e3`/`e4` 代码内实体不动、`e7` 字面 `&amp;` 不动、`word—word`、`| --- | --- |`、围栏 `a--b`、空段落分隔线全绿 |

## 7. UNVERIFIED（写清原因与补测方法）

1. **真实宿主 WebView2 里的实体往返**：本轮全在浏览器态 CDP 9222 + 假 FSA。补测：`host-smoke` / 宿主打开同一篇 `&nbsp;` 文档后 `Ctrl+S`，比对盘上字节。
2. **真实磁盘 / 网络盘 / OneDrive 写回的字节**：假 FSA 只存字符串。补测：真实文件系统上打开→保存→`certutil -hashfile`。
3. **系统级深色（`prefers-color-scheme: dark`）与真实彩色打印 / 另存 PDF 下 `--mark-bg` 的观感**：只能读计算值与手动 `data-theme`；打印块只静态核对了 token。补测：Windows 系统深色 + 真机打印。
4. **真实中文输入法下 `--` 的产出**：无 IME 自动化，E2E 用 Playwright `keyboard.type` 逐字符。补测：真人 IME 组合输入下打 `--`。
5. **1 MB 文档在应用内一次 `Ctrl+S` 的 dev 口径**：141 ms 是假盘字符串写入 + dev 构建；真实 WebView2 + 真盘未测。
6. **计划 §步骤 5 的两条期望值**（偏差 1、2）未按计划文字实现，已按偏差条目判为「计划文字问题/实现更保守」，未做「按计划改产品」的额外验证。

## 8. 截图与证据清单

- `shots/round-49/tester-t1-source-after.png`（保存后源码框 `甲&nbsp;乙`）
- `shots/round-49/tester-t2-mark-light.png`、`tester-t2-mark-dark.png`、`tester-t2-table-bar.png`
- `shots/round-49/tester-t3-em-dash.png`（编辑视图 + 源码框 `中文——中文`）
- 日志：`.tmp/r49-tester-{npmtest,verify,t1,t2,t2b,t3,big,keyboard,fidelity}.log`
