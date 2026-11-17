# 第 58 轮 A 轮验收（tester）

判定：**PASS**。A1、A2 验收项全部复验通过；三条门禁各跑一次全绿；回归无本轮引入的失败。
轮前 startSha `25146504`；本报告所有路径均为本机实测。

## 门禁

| 门禁 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run verify` | PASS；首屏 gzip **298,647 B**（内部 310,000 / 硬线 320,000，余 21,353；比第 57 轮 +824） | `.tmp/r58-tester-verify.log` |
| `npm test` | **39 个文件 495 条全过**（fail 0）；37 → 39 为 `toc.test.ts` / `tocRender.test.ts`，473 + 22 | `.tmp/r58-tester-npm-test.log` |
| `npm run roundtrip` | 富文本 6/8、源码 8/8；`04`/`06` 两条差分为既有，报告与 HEAD 逐字节同（`git diff docs/roundtrip-report.md` 空） | `.tmp/r58-tester-roundtrip.log` |

## A1（B-123）智能标点不改写链接目标 / 标签引号

- 代码：`src/lib/smartTyping.ts:47-56` 的 `inLinkDestOrHtmlTag()`，锚定 `\]\([^)\n]*$` 与 `<\/?[A-Za-z][^>\n]*$`；`:78-84` 守卫在反引号守卫之后，关闭括号「越过」保留在守卫之前。
- 单测 6 条实跑通过（含反向「甲 < 乙，我说"」仍出 `”` / `“”`、`don't`、行内代码、表格行）：`npm test` 日志里 6 个 ✔。
- E2E `.tmp/e2e-r58-a1-typo.mjs`（9222，逐字符 delay 25 ms）：8/8 断言 true、`errors: []`。编辑器文本为 `[乙](https://example.com "标题")` 与 `<img src="assets/a.png" width="300">`，无 U+201C/U+201D；序列化（localStorage 草稿）含 `"标题"` 与 `width="300"`。`.tmp/r58-tester-a1-e2e.log`。
- 红对照：finder 改前同输入是 `src=”assets/a.png” width=”300”`（`.tmp/r58-typora-a.log`），证明断言能区分修前修后。
- `\[乙\]` 转义：草稿为 `\[乙\](https://example.com "标题")`，按验收口径不算失败；已记 B-124（P2）。
- BACKLOG：B-123 已落行并标 `fixed`。其证据路径 `.tmp/r58-a1-tests.log` **不存在**，属勘误——6 条用例确实跑过（`.tmp/r58-a2-npm-test.log` 与我的日志均可查），已把路径改到实跑日志。

## A2（B-106 TOC MVP）

- `repairTocMarkers`：`src/lib/escapes.ts:26-52`。快路径 `/\[toc/i`；原文含 `\[toc\]`（i）整篇不还原；`fenceMap` 逐行；`$$` 段、行内代码、引用行不命中；CRLF 行尾保留。单测 5 条。
- `applyRepairs`：`src/lib/serializeDocument.ts:50-54`，调用点只有两处——`serializeDocument.ts:65`（保存链）与 `App.tsx:1013`（300 ms 草稿链，即计划的 `:1002-1004`），`git grep` 无第三处。
- 渲染：`src/lib/tocRender.ts` 用 `Decoration.widget(pos, { side: -1, key: toc@pos-标题签名 })`；源段落不隐藏；`toc.ts` 的条目复用 `outline.ts` 口径。
- 单测 9 条全过（toc 4 + tocRender 5）：标记判据、转义写法不算标记、位置与顶层偏移同口径、条目顺序与级别、键含标题签名、两处 `[TOC]` 不撞键、原文只有转义写法不挂目录、无标记或无标题不挂。
- E2E `.tmp/e2e-r58-a2-toc.mjs`（9222）：9/9 断言 true、`errors: []`。三标题 + 空行 `[TOC]` → `.sl-toc` 1 个 widget、3 条（`第一章|第一节|第一小节`，`data-level` 1/2/3）；点第 2 条选区落在 `H2`「第一节」；草稿 `# 第一章\n\n## 第一节\n\n### 第一小节\n\n[TOC]\n\n` 含 `^[TOC]$`、不含 `\[TOC\]`；原文 `\[TOC\]` 文档打开后 `.sl-toc` 0 个，改一字 + `Ctrl+S` 落盘 `# 甲\n\n正文甲乙\n\n\[TOC\]\n` 与期望逐字节相同。`.tmp/r58-tester-a2-e2e.log`。
- 界面：`shots/round-58/toc-editor.png` 显示纸底圆角框内三条按级别缩进的按钮，源段落 `[TOC]` 仍在正文可见。

## 回归（1 个既有脚本）

- `scripts/keyboard-acceptance.mjs http://localhost:5175`（CDP 9222）：**51/52**。唯一 FAIL「Ctrl+Shift+S 不出现新的已保存/已取消提示」= BACKLOG B-209 已记的过期断言（第 51 轮改 ttl 后既有口径），非本轮引入。与智能标点/输入规则相关的项（`Ctrl+Shift+S` 不划删除线、正文输入 `?` 不弹一览、`Ctrl+K`、`Ctrl+M`、表格 Tab、导出、焦点链路）全 PASS。跑后已 `git checkout -- shots/round-05/` 还原。`.tmp/r58-tester-keyboard.log`。

## 结论与遗留

- PASS。A1、A2 验收项 0 缺项；B-106 仍 `open`（emoji 未做，按计划不排本轮），TOC MVP 已验。
- UNVERIFIED：真实中文 IME 逐键下的引号守卫；真实磁盘 / 宿主写回（E2E 用打桩 VFS 与 localStorage 草稿）；WebView2 窗体里的目录 widget。
- 已知限制（记录，不阻塞）：`[TOC]` 源段落不隐藏（与 Typora 观感不同）；目录只在编辑视图渲染，源码 / 预览面板无。
