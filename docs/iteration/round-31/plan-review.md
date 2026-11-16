# 第 31 轮 · 计划审查（revision 2 复核，critic，只读）

- 角色：计划审查。未改产品代码、未写 `release/`、未 push、未 bump 版本。
- 复核对象：`docs/iteration/round-31/plan.md`（revision 2，463 行）、`findings-bug.md`、`findings-typora.md`、`findings-ship.md`。
- 复核方式：**逐个打开计划点到的文件核对代码与文案**（不只读计划文字），复跑可复跑的门禁，并新写一条 CDP 探针实测本版新加的三条断言（缩进宽度 / 重解析 / 回编辑焦点）。
- 本文件取代第 1 版审查正文（第 1 版 6 条漏洞已由 revision 2 逐条处理，复核结果见 §2）。
- 探针脚本：`.tmp/e2e-r31-critic-indent.mjs`（只在 9222 上 run 一次，`node .tmp/reset.mjs 9222` 之后跑）。

## 1. 复跑的门禁与实测

| 命令 | 实测输出 | 与计划一致 |
| :--- | :--- | :--- |
| `git log --oneline -3` | `5b36b71 round-30: …` | ✅ 基线 `5b36b71` |
| `git status --short` | 只有 `?? docs/iteration/round-31/`、`?? shots/round-31/` | ✅ |
| `npm test` | 退出码 0，`^ℹ pass` 块 **18** 个，求和 **260** | ✅ 18/260 |
| `node --experimental-strip-types src/lib/{settings,prompt,katexLazy}.test.ts` | 2 / 3 / 7 条，全 exit 0 | ✅ 挂进后 260+12=**272** |
| `Get-ChildItem src/lib/*.test.ts` | **21** 个 | ✅ T4 的 21/272 |
| `node scripts/measure-first-screen.mjs --dir dist` | `total raw=926227 gzip=284529 files=2 max=286000` → **PASS** | ✅ 余量 1,471 B |
| 计划 T1「实施步骤 6」的新鲜度正则（见漏洞 P2-3） | 对计划自己给的守卫代码 `-match` 结果为 **False** | ❌ 见 P2-3 |
| `git ls-files shots/round-05 \| Measure-Object` | **20** 个（有跟踪） | ✅ §3 的 `git checkout -- shots/round-05/` 可用 |
| `Select-String README.md -Pattern '示例工作区'` | 只有 `:28` 一处 | ✅ T4 改完可断言 0 命中 |
| `Select-String src/*.tsx -Pattern openLinkRef` | 只有 `:519` 声明、`:797` 调用，无赋值 | ✅ T3 前提成立 |

## 2. 第 1 版 6 条漏洞的复核

| 第 1 版 | 本版怎么处理 | 复核结论 |
| :--- | :--- | :--- |
| P1-1 T3 验收顺序自相矛盾 | 验收 3 改成写死 3a→3b→3c→3d：Tab → `li > ul`=1 → `Ctrl+/` 读 `textarea.source-editor`（有 `  - 项目二`、无 `项目二  \n`）→ `Ctrl+/` 回编辑 → 断言仍为 1 → 点第二项 → `Shift+Tab` → 0；§3 tester 第 4 项同步写死顺序 | **已修掉**。顺序无矛盾；3b 的两条断言我都实测过（见 §3）：2 空格缩进成立、无行尾双空格成立 |
| P1-2 超时砍单后 README:35 留假承诺 | 砍单表 ③ 后加「砍了就由 builder B（T4 阶段）或根代理合入前改 `README.md:35`」；「不许砍」格加「`README.md:35` 与实现一致」；§5 预写该行；§8 第 3 条改写 | **已修掉**（README 这一半）。四处表述一致，且与 §0「修完 README 不再说谎」自洽。剩下的 CHANGELOG 半边见新漏洞 P2-2 |
| P2-3 T1 第 ③ 处改动多余且新开清空路径 | 删掉 `:2276` 的 `check` 改法；T1 变「两处改」；风险 5 写明禁用 `check` 及替代方案；工时 32→31 | **已修掉**。删得对：`:2176-2178` 的 adopt 分支本来就不换正文，① 的守卫单独足够（`fileRef` 在 `:631-633` 随 `activeFile` 同步，`:2233` 改名当前文档时同步写 `fileRef`，S3 靠这条放行）；三个 `mode: 'adopt'` 调用点（`:2276` 改名、`:2413` 新建文件、`:2562` 无句柄保存）都各自先显式设了 `activeFile` 与 `saveTargetRef`（`:2411-2412`、`:2560-2561`，改名前有 `:2232-2233`），守卫跳过 adopt 不会丢保存目标 |
| P2-4 T2 的 `dt` 序列漏「选区」 | 首段用 `.stats-detail dl:first-of-type dt`（7 个），第二段 `.stats-detail dl:last-of-type dt`（选区），断言总 `dt`=8 | **已修掉**。`StatsDetail.tsx:90` 与 `:101` 两个 `<dl>` 是 `.stats-detail` 的直接子节点，`:first-of-type` / `:last-of-type` 都成立 |
| P2-5 「汉字」标签与 cjk 口径不符 | 改「中日韩字」，`dd title` 写清含假名与谚文；README:51、e2e、tester 项同步 | **已修掉**。`wordcount.ts:18-19` 的正则确实含 `\u3041-\u3096`、`\u30A1-\u30FA`、`\uAC00-\uD7A3`，`:1-2` 注释写「中日韩字符」 |
| P2-6 嵌套列表无存盘/往返证据 | 重解析半边并入验收 3c；存盘字节半边登记 §5 + §6，并写死「补测前不许把「列表 Tab 保存正确」写进 README / CHANGELOG」 | **按容量取舍处理得当**。源码框文本就是序列化结果（同一 `currentMarkdown()` 供 3b 与存盘），存盘字节再跑一遍的边际收益低；推迟有登记、有禁止口径，不阻塞 |

## 3. 本版新加断言我实测的结果（这是本版最需要证据的部分）

脚本 `.tmp/e2e-r31-critic-indent.mjs`（9222，reset 后运行）：清空正文 → `Ctrl+/` 进源码 → `fill('- 项目一\n  - 项目二\n')` → `Ctrl+/` 回编辑 → 记录 → 让文档变脏后再进源码读序列化。原始输出（为排版把 JSON 压成一行，数值未改）：

```json
{
  "seededBefore": "",
  "afterApply": { "liNested": 1, "active": { "tag": "BODY", "cls": "", "isBody": true } },
  "innerLiCount": 1,
  "sourceAfter": "- 项目一\n  - 项目二\n\nX",
  "lineStarts2spaces": true,
  "lineStarts4spaces": false,
  "consoleErrors": []
}
```

四条结论，分别对上本版的三条新断言：

1. **缩进是 2 空格**（`lineStarts2spaces: true` / `lineStarts4spaces: false`）：验收 3b 的 `  - 项目二` 断言成立。实现依据也核过：`App.tsx:735` 的 `indentation: { style: 'space', size: 2 }` + `@tiptap/markdown/dist/index.js:399-403` 的 `indentString = indentCharacter.repeat(indentSize)` + `:1119-1121` 的 `indent: (content) => this.indentString + content` + 列表扩展 `markdownOptions: { indentsContent: true }`（`@tiptap/extension-list/dist/index.js:55/1193/1538`）。
2. **重解析回来仍是嵌套**（`afterApply.liNested = 1`）：验收 3c 成立，`applySource` → `setMarkdown` 能解析 2 空格嵌套。
3. **R7 的焦点判断正确**（`active.tag = BODY`）：`switchView`（`:3704-3727`）确实不调 `.focus()`，源码回编辑后焦点在 `body`；验收 3d 的「先点第二项文字」是必需的一步，不是多余动作。
4. **`page.locator('.ProseMirror li li')` 能选中一项**（`innerLiCount = 1`），3d 的选择器可用。

顺带核过的其它事实（全部命中）：`openLinkRef` 无赋值（只 `:519` 声明、`:797` 调用）；`handleClick` 形参 `(_view, _pos, event)`（`:791`）；Tab 分支在 `:766-774`、`inTable` 在 `:747-754`；`openLinkAtCursorRef` 赋值在 `:3881-3909`，`setLinkEdit` 字段与计划一致；`.link-editor`/两个 `aria-label`/Esc 在 `LinkEditor.tsx:44/55/81/69-71/100-102`；源码框只有 `textarea.source-editor` 一个（`App.tsx:4660-4665`，无 `aria-label`）；`Ctrl+/` 的全局分支 `:3567-3571` 在 `typing` 判断之前，焦点在 textarea 里同样生效（探针两次 `Ctrl+/` 都成功，一次焦点在正文、一次在 textarea）；Esc 关面板并回焦 `.stats-trigger` 在 `:3433-3439`（window 监听 `:3610`）；`.stats-trigger` 在 `StatusBar.tsx:40`；`ShortcutsDialog.tsx:31` 是 Ctrl+K 行；`loadIntoEditor` 清 `saveTargetRef` 在 `:1935`；`createWorkspaceFile` 在 `:2411-2413` 先设 `saveTargetRef` 再 adopt；`.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `openFolder` / `readFakeFile` 三个导出都在；样例 `中文正文 abc\n\n第二段结束。` 的 `cjk=9 / words=1 / chars=13 / minutes=1` 与计划一致（`wordcount.ts:47-57`）。

未复核 / 测不了：真实目录句柄上的删除撤销与改名（假 FSA 无权限模型，与计划 §6 同口径）；`Shift+Tab` 真按键行为（产品还没实现 `liftListItem`，无法在旧代码上实测；`sinkListItem`/`liftListItem` 命令确实存在于 `@tiptap/core/dist/index.d.ts:3683/3958`）。

## 4. 本版新发现漏洞（全部 P2，均可一行修，不阻塞开工）

（编号从本版重新起算，与 §2 里第 1 版的旧编号没有对应关系；本节的 P2-1…P2-5 是本版新漏洞。）

### P2-1 · T4 往 README 依赖段「加一条」会让「运行时依赖只有两组」这句话自相矛盾

`README.md:101` 原文是「运行时依赖只有两组，都不是为省几行代码引入的：」，下面只有两条 bullet（`:103` Tiptap 3.34 与配套扩展、`:104` KaTeX），`:106` 才是「开发期另有 …」。计划 T4 改动②要求「依赖段（`:101-106`）加一条：`- @tiptap/extension-strike：…`」——按字面加第三条 bullet 之后，`README.md` 会出现「只有两组」下面挂三组的公开自相矛盾；而且 `extension-strike` 本来就是 Tiptap 组的成员，另起一组把分类也写错了。这是 builder B 照抄就会落地的文案，T4 的验收 4 里没有任何一条能抓到它（只 grep 命中，不管语义）。

**修法**：不加新 bullet，改成把说明并入 `:103` 的 Tiptap 行尾——「…自己写不出同等质量的所见即所得。其中 `@tiptap/extension-strike` 被 `src/App.tsx` 直接 import，已在 dependencies 显式声明；同一模块本来就在包内，字节不变。」（若坚持新 bullet，则同时把 `:101` 改成「运行时依赖分两组」并把 strike 归到 Tiptap 组下，别写成第三组。）

### P2-2 · 链接只在 T3 内部被砍单时，CHANGELOG 的假承诺没人负责删（与已修的 P1-2 同类，只是换成了 CHANGELOG）

计划 T4 的 CHANGELOG 条目写「T3 链接点击与列表 Tab」，并附规则「链接被砍单时 T3 条只写列表 Tab 缩进」（T4 · 改动文件表 / 风险 3）。但时序上这条规则执行不了：builder B 的 T2+T4 合计 17 分钟，A 的 T1+T3 合计 31 分钟，而链接是砍单表 ③（第 3 个砍项）——**B 写 CHANGELOG 时 A 还没到砍单点**，B 只能先写链接。T4 风险 3 只覆盖「若 T1–T3 被砍」（任务级），不覆盖「T3 内部只砍 ③」；§8「给根代理的收尾提醒」第 3 条通篇只说 README:35 / §5 / test.md / impl.md，**没提删 CHANGELOG 里那半句**。结果：README 改对了，`docs/CHANGELOG.md`（对外文案）仍然声称做了没做的链接修复。

**修法**：§8 第 3 条末尾加一句「并删掉 `docs/CHANGELOG.md` 第 31 轮 T3 条目里「链接点击」那半句，只留列表 Tab 缩进」；§3 tester 第 4 项末端同样加「若链接被砍单，核对 CHANGELOG 第 31 轮条目不含链接」。（一行改动，比再走一轮 revision 便宜。）

### P2-3 · T1「实施步骤 6」与「门禁命令」里的模块新鲜度正则，匹配不上计划自己给的守卫代码

计划 T1 改动①给的守卫是 `if (rebound) { if ((fileRef.current?.path ?? null) === rebound.path) { … } }`，而新鲜度检查写的是 `Content -match 'fileRef\.current\?\.path === rebound\.path'`。我按这段代码实测：`'if ((fileRef.current?.path ?? null) === rebound.path) {' -match 'fileRef\.current\?\.path === rebound\.path'` → **False**（源码里 `?.path` 后面跟的是 ` ?? null)`，不是 ` ===`）。于是 A 按计划写对代码、跑门禁，命中 0 次；而步骤 6 又写着「不命中先查 HMR，不要改产品代码去迁就陈旧模块」——A 只剩 4 分钟余量，会先去怀疑 dev server（甚至想重启，而本轮禁止重启），或者为了过检查删掉 `?? null`。

**修法**：正则改成任何实现变体都含的片段，例如 `-match 'fileRef\.current\?\.path'`（或 `-match '===\s*rebound\.path'`）；「实施步骤 6」与「门禁命令」两处同步改。同理 T3 的 `-match 'openLinkRef\.current = '` 依赖空格，建议写成 `-match 'openLinkRef\.current\s*='`。

### P2-4 · 列表 Tab / Shift+Tab 没写进 README 的快捷键清单（AGENTS §7 的「现在能做什么」）

T3 新增了用户每天会用的键盘行为，计划只把它写进 `ShortcutsDialog.tsx`（应用内）和 CHANGELOG（T4）。`README.md:30` 的「Typora 式快速键」一行现在写着「…表格里 `Tab` 走格、`Ctrl+Enter` 退出表格…」，本轮改完仍然不会提列表内缩进。按 AGENTS §7「收工改三处：README 的『现在能做什么』…」，这是漏项；而且这行正是对外解释 Tab 行为的地方（用户读到这里会以为 Tab 只在表格里有特殊行为）。

**修法**：T4 阶段（B 拥有 README）在 `:30` 的同一句里加「列表里 `Tab` / `Shift+Tab` 缩进 / 反缩进」。一行，不进首屏。

### P2-5 · T1 的 e2e fixture 与场景衔接没写全：缺 `丙.md`，S2 前也没写「先点开 甲」

验收 S1 的初始状态只列了 `甲.md`、`乙.md`，但 S2 断言 `丙二.md` 的字节原样是 `"# 丙\n\n丙的正文。\n"`——fixture 里必须有 `丙.md`（计划没写）。另外 S1 结束时（撤销后）当前文档是 `乙`，S2 第一句却直接写「`甲` 为当前文档」，没写「先点开 `甲.md`」这一步；S3 又依赖 S2 之后当前文档仍是 `甲`。脚本作者大概率能猜到，但验收标准应当可机械照做。

**修法**：验收开头写死 fixture（`{ '甲.md': '# 甲\n\n甲的正文。\n', '乙.md': '# 乙\n\n乙的正文。\n', '丙.md': '# 丙\n\n丙的正文。\n' }`，路径与断言一致），并在 S2 第一条加「点开 `甲.md`（等 800 ms）」、S3 开头加「确认当前仍是 `甲`」。

## 5. 结论

**PASS**。第 1 版的两条 P1 都已真正修掉，其中 P1-1 的新顺序我用探针在真实 dev server 上验过（2 空格缩进成立、重解析成立、回编辑焦点在 `body` 所以点击步骤必需），不是纸面推演。P2-3 被删掉是对的（指第 1 版那条：删掉原 ③ 的 `check` 改法），守卫单独足够；首屏、版本、测试计数、不 push / 不动 `release/` 这些硬门都与计划一致。

上面的 5 条都是 P2、都是一行级改动，不需要再走一轮 revision：P2-1/P2-4 由 builder B 在 T4 阶段顺手改，P2-2 由根代理按 §8 在合入前改，P2-3 让 builder A 开工时把正则换掉，P2-5 在写 e2e 时按修法写死 fixture 即可。没有 P0（无数据损失路径、无门禁破坏、不破首屏 286,000 B、方案可行）。
