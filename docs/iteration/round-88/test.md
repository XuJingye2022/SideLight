# 第 88 轮 独立验收（tester）

结论：**PASS**（A1 / A2 / A3 全过）。轮前 startSha `1a000a5`；未读 `impl.md`，A2 用自写脚本复验。

## 门禁（改后工作树，自跑）
- `npm run verify` exit 0：`total raw=996245 gzip=307630 headroom=12370 max=320000` → **307,630 B ≤ 310,000**（距硬线余 12,370 B、距内部预算余 2,370 B）。`.tmp/r88-tester-verify.log`
- `npm test` exit 0：**53 文件 / 693 条 / 0 fail**（基线 52/683）。`.tmp/r88-tester-npmtest.log`
- `npm run roundtrip` exit 0：rich **7/9**、source **9/9**、firstSaveBlocked 1/9（同第 86/87 轮，无退化）。`.tmp/r88-tester-roundtrip.log`

## A1 映射 + 输入规则 + 单测
- `node --experimental-strip-types src/lib/emoji.test.ts` **exit 0，10/10（≥8）**。`.tmp/r88-tester-emoji.log`
- 静态（未跟踪文件 git grep 看不到，用 ripgrep/PowerShell 逐行数）：`sidelightEmoji` src **1 行**（`src/lib/emoji.ts:63`，改前该文件不存在=0）；`EmojiInput` 在 `src/App.tsx` **2 行**（`:91` import、`:1033` 扩展数组项；改前 0）——验收写「0→1」，实测 2 行，语义「已注册」成立，记偏差不判红；`emojiAt` src/lib **3 行**（`emoji.ts:48,71,76`，改前 0）。
- 代码审阅：`SHORTCODE=/[:：]([a-z0-9_+-]+):$/` 尾锚定；`find` 查不到名字回 null（无事务，字面保留）；`handler` 只在命中时 `insertText`（`tr.steps.length≥1` 才落地）。围栏/行内代码守卫不在本文件，在 tiptap 输入规则插件 `run$1`：`$from.parent.type.spec.code || nodeBefore/nodeAfter 的 code mark` 时直接 return false（`node_modules/@tiptap/core/dist/index.js:5237-5238`），与注释口径一致。
- 映射 20 枚、名字唯一且 `^[a-z0-9_+-]+$`、每枚 `\p{Extended_Pictographic}` 由单测断言；`emojiAt` 边界：`:nope:` / `:smile` / `x:smile:y` / `''` / 大写 / 空格均 null。

## A2 真机（ego 浏览器 CDP 54280；9222–9226 无监听，`curl` exit 7）
自写 `.tmp/r88-tester-e2e.mjs` → `.tmp/r88-tester-emoji.json`：**19/19 PASS**，0 pageerror、0 console error。

| 验收项 | 实测 |
| :--- | :--- |
| ① 旧文档字面 | 打开 `:smile:` 1、😄 0；追 x 后盘上 ≠ 原文且 `trimEnd()===原文.trimEnd()+'x'`、仍字面；重开仍字面 |
| ② 逐键 | `:smile:`→😄、`:tada:`→🎉、`:nope:` 字面（1 字面 + 😄1 + 🎉1 共存） |
| ③ 全角 | `你好` 后打 `:smile:`（首冒号被智能标点改成 `：`）→ 😄 多 1、`：smile:` 0、`:smile:` 0 |
| ④ 保存/重开 | 盘上 😄2/🎉1/:smile: 0；重开同；追 y 后 `saved.trimEnd()===上次.trimEnd()+'y'` |
| ⑤ Ctrl+Z | 一次回 `:smile:` 字面、😄 0（`closeHistory` 分组成立） |
| ⑥ 代码 | `Ctrl+E` 后 `<code>` 内 `:smile:` 字面（😄 0）；围栏 `pre` 内 `:smile:` 字面 |
| ⑦ 错误/截图 | 0 pageerror、0 console error；截图 `.tmp/r88-tester-emoji.png`（交付件 `shots/round-88/emoji-typed.png` 已验为 1440×900 真图，内容同为 e.md 的 😄/🎉/:nope:/你好😄） |

脚本自身两次修正（非产品失败）：`filter({hasText:'e.md'})` 会命中 `code.md`（改按 `.tree-file[title=…]` 精确）；⑤ 后 u.md 为脏文档、切篇弹「切换文档」（改为先 `Ctrl+S`）。

## A3 文档计数
- `node .tmp/r58-docs-check.mjs`：`headHave 41 = haveCount 41`、`headMiss 4 = missCount 4`、子节 **1/1、1/1、2/2**、`missRowSum 4`。
- git grep 改前(1a000a5)→改后：`emoji 快捷输入 | 无` **1→0**、`B-106 余项` **2→0**、`Phase 1 路线图剩三项` **1→0**、`40 项，缺 5 项` **1→0**、`41 项，缺 4 项` **0→1**、`| B-106 | open` **1→0**；`3,724 B` 改前实测 **3**（验收预估 2，多出的是 README:231 同句）→ 改后 **0**。
- `changelog.test.ts` 在 `npm test` 内绿（标题 `29–88` = 正文最大轮次 88）。

## 回归
- `SIDELIGHT_CDP=http://127.0.0.1:54280 node scripts/keyboard-acceptance.mjs http://localhost:5175` → **52/52 PASS** exit 0（`.tmp/r88-tester-keyboard.log`）；智能标点与新增输入规则共用 `handleTextInput` 链，无截断。跑完已 `git checkout -- shots/round-05/` 还原 3 张被覆盖截图。

## 残余 / UNVERIFIED（不判 FAIL）
- 真输入法（脚本键入非 IME 组合）、真 WebView2 宿主、原生打印：未跑。
- 已知限制（已写入 BACKLOG B-106）：链接目标与行内 HTML 属性里的短码照换；粘贴整段不转换；名字含 `-`/`+` 的位置预留给 `:+1:` 这类（当前 20 枚未用）。
- 验收文案偏差两处（不阻塞）：`EmojiInput` 在 App.tsx 实为 2 行；`3,724 B` 改前 3 命中。

证据：`.tmp/r88-tester-{e2e.mjs,emoji.json,emoji.png,emoji.log,npmtest.log,verify.log,roundtrip.log,keyboard.log,probe.mjs}`。
