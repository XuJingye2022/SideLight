# 第 88 轮计划：B-106 emoji 快捷输入（rev 1）

## 0 口径
- 只做 **B-106 的 emoji 半边**（TOC 已落地，不碰 `toc*.ts`）；B-103 已 fixed、B-107 不碰。
- startSha `1a000a5`；dev `:5175`、真机 ego CDP **54280**；连不上记 UNVERIFIED。
- 门禁 `verify`（310,000/320,000 B，改前 **307,292 B**）、`test`（改前 52 文件 683 条）、`roundtrip`；不 push、不改 `release/`、版本 0.32.1。

## 1 已核实
1. emoji 代码 0：`sidelightEmoji`/`EmojiInput`/`emojiAt` 三处 `git grep -c` 全 exit 1。
2. 缝：`mathInput.ts:96-126`（`new InputRule`+`state.tr`）、`inlineSyntax.ts:138-145`；`App.tsx:1026` 与 `:1032` 之间。
3. 守卫 `@tiptap/core/dist/index.js:5232`（父块 `spec.code`/相邻 code mark → 不转）；`:5186-5191` 覆盖整条短码、`:5206` 的 `closeHistory` → 一次撤销成立；code mark 由 `Mod-e` 建（`extension-code/dist/index.js:106`），先打反引号不成立。
4. 全角开冒号 `smartTyping.ts:115-119`（默认开 `settings.ts:65`）；闭冒号后是 ASCII。
5. 锚点：`typora-gap.md:7/:52/:54/:59/:78`、`README.md:95/:102/:120/:231`、`AGENTS.md:74`、`CHANGELOG.md:5`、BACKLOG `:72`；计数门基线 40/5、2/1/2、missRowSum 5。

## 2 定案（输入时转换）
- 手打完整短码 → emoji（1 步、可撤销）；旧文档里的 `:smile:` 不转换，保存字节不变。
- 映射 **恰 20 枚**（断 `EMOJI.length === 20`）：`smile😄 grin😁 joy😂 wink😉 thinking🤔 heart❤️ thumbsup👍 clap👏 tada🎉 rocket🚀 fire🔥 sparkles✨ star⭐ check✅ x❌ warning⚠️ bulb💡 memo📝 100💯 wave👋`；未知短码字面。
- 匹配 `[:：]([a-z0-9_+-]+):$`（尾锚定、非 global）；查不到名字 handler 不产 step。

## 3 任务
### A1 映射 + 输入规则 + 单测
files：`src/lib/emoji.ts`（新）、`emoji.test.ts`（新）、`src/App.tsx`、`package.json`
steps：`EMOJI` 20 条；`emojiAt` 回 `{name,emoji}|null`；`EmojiInput`（`name:'sidelightEmoji'`、`addInputRules` 内 `new InputRule`）查表命中才 `state.tr.insertText(hit.emoji, range.from, range.to)`；App 扩展数组插在 `:1026` 后。
验收：1. `node --experimental-strip-types src/lib/emoji.test.ts` exit 0、**≥8 条**：`EMOJI.length===20`、名字唯一且 `[a-z0-9_+-]+`、每值 `\p{Extended_Pictographic}`；`':smile:'`→😄、`'：smile:'`/`'时间：smile:'` 命中、`:nope:`/`:smile`/`x:smile:y`→null。2. `git grep -c`：`sidelightEmoji`(src) 0→1、`EmojiInput`(App) 0→1、`emojiAt`(src/lib) 0→≥2。3. `npm test` 0 fail（**53 文件 ≥691 条**）、`verify` gzip **≤310,000 B**、`roundtrip` 不退化。

### A2 真机（保真为主）
files：`.tmp/e2e-r88-a2-emoji.mjs`、`shots/round-88/emoji-typed.png`
steps：`node .tmp/reset.mjs 54280` → `connectOverCDP(54280)` → `newPage()`，**先** `installFakeWorkspace` 再 `goto :5175` → `openFolder`（`.tmp/r51-fsa.mjs`）；截图 `page.screenshot`。夹具 `old.md`=`你好:smile:\n`、`e.md`=`# e\n\n`。
验收（逐条入 `.tmp/r88-a2-emoji.json`）：
1. 旧文档：开 `old.md` → 字面 `:smile:`、0 😄；点正文 `Ctrl+End` 追 `x` → `Ctrl+S` → 盘上 ≠ 原文、`saved.trimEnd()===original.trimEnd()+'x'`、仍字面、0 😄；重开仍字面。
2. 逐键：`e.md` 打 `:smile:`→😄；`:tada:`→🎉；`:nope:` 字面。
3. 全角：新段 `你好`+`:smile:` → 😄、无 `：smile:`。
4. 保存/重开：`Ctrl+S` → 盘上含 😄 与 🎉、无 `:smile:`；重开仍；点正文 `Ctrl+End` 追 `y`+`Ctrl+S` → = 上次所存去尾换行 + `y`。
5. 撤销：新段 `x `+`:smile:`（首冒号前是空格）→😄 后 `Ctrl+Z` 一次 → 字面、0 😄。
6. 代码：新段 `Ctrl+E` 进 code mark 后打 `:smile:` → `code` 内字面、0 😄（**不可先打反引号**）；新段打 ``` + 空格建围栏后再打 `:smile:` → 字面、0 😄。
7. 0 pageerror/console error；截图 1 张。
- 分因：连不上 → 整段 UNVERIFIED（`unreachable`）；连上但超时 → 只标未跑条目（`skipped`）；先跑 #1/#2/#4。

### A3 文档计数（A1 绿才做；否则只更 BACKLOG）
files：`docs/typora-gap.md`、`README.md:95/:102/:120/:231`、`AGENTS.md:74`、`BACKLOG.md`、`CHANGELOG.md`
steps：缺表删 emoji 行、`编辑与格式（2）→（1）`、`缺的（5）→（4）`、`已经有的（40）→（41）`；已有表加一行（20 枚映射、保真、代码/未知字面、旧文档不转换、链接/HTML 属性残余）；`建议的下一批` 删 emoji 条；README `:95` 删「…（B-106 余项）」、`:231` 改「只剩自定义快捷键（B-107）」并删过期字节、`:102` 40/5→41/4、`:120`「当前 306,276 B / 余 3,724 B」改 A1 实测（历史账不动）；AGENTS `:74` 40/5→41/4；BACKLOG `B-106` open→fixed（带残余）；CHANGELOG 加 `第 88 轮`节、标题 `29–88`。
验收：`.tmp/r58-docs-check.mjs` 41/41、4/4、1/1/2、`missRowSum=4`；`git grep -n 'emoji 快捷输入 | 无' docs/typora-gap.md` 1→0；README `'B-106 余项'`2→0、`'3,724 B'`2→0、`'Phase 1 路线图剩三项'`1→0、`'40 项，缺 5 项'`1→0（且 `'41 项，缺 4 项'`1）；BACKLOG `'| B-106 | open'`1→0；`changelog.test.ts` 绿。

## 4 风险
- R1 代码守卫漏（A2 #6 红）：**不加「段首/空白后」守卫**（会砍 A2 #3 全角用例）；真漏按 tiptap 同口径自查，仍漏记 UNVERIFIED 留 FAIL。
- R2 体积：20 枚 ≈ +0.3–0.6 KB、余 2,708 B；>310,000 → 裁 12 枚并把 §2 与 A1 #1 的 `EMOJI.length` 断改 12，仍超回滚 A1。
- R3 一次撤销不成立：A2 #5 记 FAIL。
- R4 回滚/时间：删两个新文件 + `git checkout src/App.tsx package.json`；超时按 A2 分因记。

## 5 不做与残余
- 不做：链接/HTML 属性守卫、补全、设置开关、粘贴转换、选择器；不碰 TOC/预览/导出/白名单/智能标点；不加依赖。
- H5 残余：链接目标与行内 HTML 属性里的短码照换（输入规则只看文本，`smartTyping.ts:52-56` 只挡智能标点）；只认小写 ASCII。A3 差距表备注带这条，A2 不加断言。
