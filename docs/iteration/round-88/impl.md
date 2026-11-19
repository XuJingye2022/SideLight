# 第 88 轮执行报告（executor）

## A1 emoji 映射 + 输入规则 + 单测：DONE
- 改动：`src/lib/emoji.ts`（新；`EMOJI` 20 枚、`emojiAt` 尾锚定 `[:：]name:` 查表、`EmojiInput` 用 tiptap `InputRule`，命中才 `state.tr.insertText(hit.emoji, range.from, range.to)`）、`src/lib/emoji.test.ts`（新，10 条）、`src/App.tsx`（import 1 行 + 扩展数组 1 项，插在 `MathInputRules` 后）、`package.json`（test 链尾）。
- 结果：单测 10 pass/0 fail；`npx tsc --noEmit` exit 0；`npm test` **53 文件 693 条 0 fail**（基线 52/683；`.tmp/r88-a1-npm-test{,2}.log`）；`npm run verify` PASS，首屏 gzip **307,630 B**（改前 307,292；硬线余 12,370 / 内部余 2,370；`.tmp/r88-a1-verify.log`）；`npm run roundtrip` rich 7/9 + source 9/9 不退化。
- 静态 grep（`--untracked`；改前 3 条均 exit 1）：`sidelightEmoji` src = 1 处（`emoji.ts:1`，0→1）；`EmojiInput` App = 2 行（import+数组，0→2，即 0→≥1；critic P2-5 预告）；`emojiAt` src/lib = 2 个文件（emoji.ts 3 行、测试 15 行，0→≥2）。

## A2 真机（保存保真为主）：DONE
- `.tmp/e2e-r88-a2-emoji.mjs` → `.tmp/r88-a2-emoji.json`：**22/22 PASS**、allPass=true、0 pageerror、0 console error（ego CDP 54280；`.tmp/r88-a2-emoji.log`）。
- 覆盖：#1 旧文档字面 `:smile:`、追 x 后盘上 `你好:smile:x\n`（= 原文 trimEnd + x）、重开仍字面；#2 逐键 😄/🎉、`:nope:` 字面；#3 先断 `：` 再全角 `：smile:`→😄；#4 存盘/重开含 😄🎉、无 `:smile:`，再追 y 成立；#5 `Ctrl+Z` 一次回字面；#6 `Ctrl+E` 行内代码与围栏内字面；#7 0 错误。截图 `shots/round-88/emoji-typed.png`。
- 计划外两处：夹具按 critic P1-1 改 `e\n`；探针 `.tmp/r88-a2-fence-probe.mjs` 实测 `Ctrl+E` 后 Enter 把 code mark 带到新段、挡住 ```` ``` ```` 建围栏，围栏用例改为“保存→重开→点首段 `End`→Enter”再建，避免把文档状态误判成 emoji 行为。

## A3 文档计数：DONE（A1 绿后做）
- 改动：`docs/typora-gap.md`（已有表 +emoji 行、缺表删该行、40/5→41/4、编辑与格式 2→1、下一批去 emoji）、`README.md`（`:41` 加 emoji 一句、`:95` 删“未做”、`:102` 41/4、`:120` 307,630 B / 余 12,370 / 2,370、`:231` 只剩 B-107）、`AGENTS.md:74`（同步 307,630 B 与 41/4）、`docs/iteration/BACKLOG.md`（B-106→fixed+证据）、`docs/CHANGELOG.md`（第 88 轮小节 + 标题 29–88）。
- 结果：`node .tmp/r58-docs-check.mjs` → 41/41、4/4、子节 1/1/2、missRowSum 4；grep（0 命中项均有改前 >0 对照）：`emoji 快捷输入 | 无` 1→0、`B-106 余项` 2→0、`3,724 B` 2→0、`Phase 1 路线图剩三项` 1→0、`40 项，缺 5 项` 1→0 且 `41 项，缺 4 项` 1、`| B-106 | open` 1→0；`changelog.test.ts` 3/3；文档改后整套 `npm test` 复跑 53/693 0 fail。

## 门禁与交接口径
`tsc` 0；`npm test` 53/693 0 fail；`verify` gzip 307,630 B PASS；`roundtrip` 不退化。未 commit（交 tester），版本 0.32.1，未动 `release/`。

## CHANGELOG 一行建议
已写进 `docs/CHANGELOG.md` 第 88 轮首条：emoji 快捷输入（A1/A2，B-106）——20 枚映射、手打即换、一步撤销，代码/围栏与未知短码保字面，旧文档不转换。

## 新踩坑（3 条）
1. **输入规则的 code mark 守卫会挡住 ```` ``` ```` 建围栏**：`Ctrl+E` 后按 Enter，新段仍带 code storedMarks（`<p><code>```</code></p>`），CodeBlock 输入规则被 `@tiptap/core` 的 `nodeBefore.marks` 守卫拦下；E2E 要先离开 code mark 再建围栏。
2. **`git grep` 默认不搜未跟踪文件**：本轮新增 `emoji.ts`/`emoji.test.ts` 未 add，普通 `git grep` 对新文件恒 0 命中，截数要加 `--untracked`，否则“改动没落地”假阴。
3. **输入规则 `find` 回调必须自带 `index`**：返回 `{text, index}` 才让 tiptap 算出 `range`；`replaceWith` 只在用 `markInputRule` 时需要，本实现走 handler 自行插入。
