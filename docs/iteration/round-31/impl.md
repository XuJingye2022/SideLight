# 第 31 轮 · 实施报告（executor）

- 角色：执行（executor）。未 commit、未 push、未改 `release/`、未 bump `package.json` 版本（仍 `0.32.1`）。
- 基线：`main` @ `5b36b71`（第 30 轮）。报告目录 `docs/iteration/round-31`。CDP 9222/9223。
- **执行方式说明（与 plan 的分工差异）**：plan 把 T1/T3 交给 builder A、T2/T4 交给 builder B。本轮只有**一个执行代理**，四个任务由同一代理按 plan 顺序串行完成：**T1 → T2 → T3 → T4**。不存在「两个 builder 并发写同一文件」的场景，plan §2 的文件所有权拆分只用于确认改动面，没有并发冲突。
- 结论：**T1/T2/T3/T4 全部完成**，未触发超时砍单表任何一项；`tsc` / `npm test` / `npm run roundtrip` / `npm run build` + 首屏 measure 全绿（`dist` 与 `.tmp/build-r31` 实测 `gzip=284,761 B`，≤286,000，余 1,239 B）。

## 1. 逐任务状态

| 任务 | 状态 | 自测结果 |
| :--- | :--- | :--- |
| T1 P0：删除当前文档撤销 / 改名非当前文档，不再切走保存目标 | **DONE** | `.tmp/e2e-r32-undo.mjs 9222` 改前 5/13、改后 **13/13 PASS** |
| T2 P1：字数明细七行口径 + 面板焦点 | **DONE** | `.tmp/e2e-r32-stats.mjs 9223` **13/13 PASS** |
| T3 P1：点正文链接就地编辑 + 列表 Tab / Shift+Tab | **DONE** | `.tmp/e2e-r32-keys.mjs 9222` **15/15 PASS** |
| T4 门禁与文档：幽灵依赖、3 个未挂测试、README/便携说明、CHANGELOG | **DONE** | `npm test` **21 文件 272 条**、文案 grep 全过 |

## 2. 改动文件与行号

| 文件 | 改了什么 |
| :--- | :--- |
| `src/App.tsx` | ① `refreshTree` 的 adopt 分支加不变量守卫：`if (fileRef.current?.path === rebound.path)` 才接 `activeFile` 与 `saveTargetRef`（`:2197`，注释 `:2194-2196`），`check` 分支（`:2200-2204`）一行未改。<br>② 撤销按钮改 `await refreshTreeRef.current()`（`:2385`），不再用删除那一刻捕获的闭包。<br>③ 列表内 Tab / Shift+Tab：`sinkListItem` / `liftListItem`，沿 `selection.$from` 向上找最近的 `listItem` / `taskItem`（`:766-782`）；表格与文档开头两条既有约定保持原样。<br>④ `openLinkRef` 类型改 `(anchor, pos)`（`:519`），`handleClick` 传入 `pos`（`:815`）；新增赋值 effect（`:3936-3968`），`posAtDOM` 兜底，取不到 link mark 就静默返回。 |
| `src/components/StatsDetail.tsx` | 七行口径（`中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读`，每行 `title` 写算法，`:79-87`）；`panelRef` + `tabIndex={-1}`（`:96`）+ 打开即聚焦（`:61`）；删掉 `total` 双用与 `term === '词'` 三元；注脚改「合计 = 中日韩字 + 拉丁词」（`:117`）；「选区」那段 `<dl>` 原样保留。 |
| `src/components/ShortcutsDialog.tsx` | 「编辑与批注」组加 `['列表内 Tab / Shift+Tab', '缩进 / 反缩进']`（Ctrl+K 行之后）。 |
| `package.json` | dependencies 加 `"@tiptap/extension-strike": "^3.34.0"`（字母序，mathematics 与 table 之间）；`test` 串末尾追加 `settings` / `prompt` / `katexLazy` 三个测试文件。`version` 未动。 |
| `package-lock.json` | `npm install --package-lock-only` 同步，**只有根 dependencies 加一行**（`git diff` 1 insertion）。 |
| `README.md` | `:28` 删「示例工作区」；`:30` 加「列表里 `Tab` / `Shift+Tab` 缩进 / 反缩进」；`:51` 字数明细改新口径；`:103` 把 `@tiptap/extension-strike` 直接依赖说明并入 Tiptap 行尾（审查 P2-1：不新增第三组，避免与「运行时依赖只有两组」自相矛盾）；`:115` → 21 文件 272 条；`:152` → 21 个测试文件挂进 `npm test`。 |
| `packaging/README.txt` | `:6` 不再指向包里没有的 `README.md`，改指项目主页；`:44` 的 `.md` 关联改按已定 opt-in 描述。 |
| `docs/CHANGELOG.md` | `## Unreleased` 下追加「**第 31 轮（同一未发版区间）**」5 条（数据安全 / 字数明细 / 链接与列表 Tab / 门禁与文档 / UNVERIFIED）。链接**没有被砍单**，所以 T3 条按实际写了链接。 |
| `.tmp/e2e-r32-undo.mjs`、`.tmp/e2e-r32-stats.mjs`、`.tmp/e2e-r32-keys.mjs`（新建，非产品代码） | 本轮三条回归脚本，端口读 `process.argv[2]`。 |

`README.md:35`（「点正文里的链接会贴着元素弹出编辑框」）**本轮链接没有砍单，所以没有改写**——现在这句话与实现一致；`git diff README.md` 里那一行没动。

## 3. 命令与原始结果

### T1（先红后绿，顺序按 plan 实施步骤 1）

改前（`.tmp/e2e-r32-undo.mjs 9222`，reset 之后），原始输出摘录：

```text
## S1 after undo {"sl":{"name":"乙.md"},"selected":["示例文集/甲.md"],"editor":"乙\n\n乙的正文。"}
## S1 bytes after save {"甲":"# 乙\n\n乙的正文。【安全探针】\n","乙":"# 乙\n\n乙的正文。\n"}
## S2 after rename 丙→丙二 {"sl":{"name":"甲.md"},"selected":["示例文集/丙二.md"],"editor":"乙\n\n乙的正文。【安全探针】"}
## S2 bytes after save {"甲":"# 乙\n\n乙的正文。【安全探针】\n","丙二":"# 乙\n\n乙的正文。【安全探针】【改名探针】\n"}
## summary {"total":13,"passed":5,"failed":[S1a,S1b,S1c,S2b,S2c,S2d,S3a,S3b]}
```

即两条数据丢失路径都在旧代码上复现：撤销后树高亮是 `甲.md` 而正文是乙，保存把乙写进 `甲.md`；改名非当前文档后树高亮是 `丙二.md`，保存把当前正文写进 `丙二.md`。

改后（同命令）：

```text
## S1 after undo {"sl":{"name":"乙.md"},"selected":["示例文集/乙.md"],"editor":"乙\n\n乙的正文。"}
## S1 bytes after save {"甲":"# 甲\n\n甲的正文。\n","乙":"# 乙\n\n乙的正文。【安全探针】\n"}
## S2 after rename 丙→丙二 {"sl":{"name":"甲.md"},"selected":["示例文集/甲.md"],"editor":"甲\n\n甲的正文。"}
## S2 bytes after save {"甲":"# 甲\n\n甲的正文。【改名探针】\n","丙二":"# 丙\n\n丙的正文。\n"}
## S3 after rename 甲→甲二 {"sl":{"name":"甲二.md"},"selected":["示例文集/甲二.md"]}
## S4 {"newPath":"未命名.md","bytes":"新文件内容。"}
## summary {"total":13,"passed":13,"failed":[]}
```

新鲜度（plan 审查 P2-3 要求把正则换成实现变体都含的片段，本轮用的就是 `fileRef\.current\?\.path`）：

```text
app sinkListItem=True openLinkRefAssign=True guard=True
```

### T2

```text
## panel {"first":["中日韩字","拉丁词","合计","字符","句","段","阅读"],"firstValues":["9","1","10","13","1","1","1 分钟"],
         "last":["选区"],"dtCount":8,"activeClass":"stats-detail","footer":"合计 = 中日韩字 + 拉丁词，与状态栏一致；…"}
## after esc {"panel":0,"activeClass":"stats-trigger"}
## summary {"total":13,"passed":13,"failed":[]}
```

样例与 plan 对齐：`中文正文 abc\n\n第二段结束。` → 中日韩字 9 / 拉丁词 1 / 合计 10 / 字符 13，`中日韩字 ≠ 合计`；面板 `dt` 共 8 个（七行 + 选区）。

### T3

```text
## link click {"editors":1,"text":"例子","href":"https://example.com/page"}
## ctrl+k {"editors":1,"text":"例子"}
## 3a nested 1
## 3b source "- 项目一\n  - 项目二\n"
## 3c nested after reparse 1
## 3d nested after shift-tab 0
## table {"cells":["","","","一格","二格","","","",""],"hit":{"一格":3,"二格":4},"inCell":true}
## tab at doc start {"cls":"skip-link","tag":"A"}
## summary {"total":15,"passed":15,"failed":[]}
```

3a–3d 严格按 plan 写死的顺序执行（Tab → 源码有 `  - 项目二` 且无行尾双空格 → 回编辑仍为 1 → 点第二项 → Shift+Tab → 0）。3b 实测序列化就是 `- 项目一\n  - 项目二\n`：2 空格缩进、没有行尾双空格。

### 门禁

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（改完 T1/T3 各跑一次，最后一次在全部改动之后） |
| `npm test` | exit 0，`files=21 pass=272`（与 plan 预期一致，3 个新挂文件 12 条全绿） |
| `npm run roundtrip` | exit 0；7 个 fixture，04 与 06 是既有已知差异；`git status --short docs/roundtrip-report.md` 为空 |
| `npx vite build --outDir .tmp/build-r31` | exit 0（独立输出目录，没碰 `dist/`） |
| `node scripts/measure-first-screen.mjs --dir .tmp/build-r31` | `total raw=927127 gzip=284761 files=2 max=286000` → **PASS**；相对 284,529 B **+232 B**，余量 **1,239 B** |
| `npm run build`（本轮只有一个执行代理，不存在并发写 `dist/`；plan 纪律针对两个 builder 并发） | exit 0（`tsc --noEmit` + `vite build`） |
| `node scripts/measure-first-screen.mjs --dir dist` | 同一结果 `gzip=284761` → **PASS**（tester 可直接用 `dist`） |
| `SIDELIGHT_CDP=http://127.0.0.1:9222 node scripts/keyboard-acceptance.mjs http://localhost:5175` | **49/49 PASS**（Tab 改动的全量键盘回归；脚本覆盖了 3 张 `shots/round-05/` 历史截图，已 `git checkout -- shots/round-05/` 还原） |
| `npm ls @tiptap/extension-strike --depth=0` | `sidelight@0.32.1` → `@tiptap/extension-strike@3.34.0`（直接依赖，不再在 starter-kit 缩进子层） |
| `git status --short release/ dist/` | 无输出 |
| `Select-String package.json '"version"'` | `0.32.1` |

文案断言（T4 验收 4，逐条命令输出）：

```text
21 个文件、272 条断言 => 1
21 个测试文件挂进 npm test => 1
列表里 `Tab` / `Shift+Tab` => 1
中日韩字 => 1
示例工作区 => 0
pkg 同目录README => 0
pkg 待确认 => 0
changelog 31 => 1
```

`git diff --stat`：8 个文件、+104 / −26，全部在产品代码与文档范围内；`release/`、`dist/` 无变化；未跟踪项只有 `docs/iteration/round-31/` 与 `shots/round-31/`。

## 4. 截图（`shots/round-31/`）

| 文件 | 内容 |
| :--- | :--- |
| `r31-undo-safe.png` | 删除当前文档 → 撤销 → 输入并自动保存后：标题 `乙.md`、树高亮 `乙.md`、正文是乙（含 `【安全探针】`）、提示「已保存 乙.md」。**注**：plan 想拍「已恢复 甲.md」，但脚本把截图放在保存断言之后（toast 已被「已保存」替换）；树/标题/正文三者一致才是本任务要的证据，见 §7 坑 4 |
| `r31-stats-rows.png` | 字数明细七行（中日韩字 9 / 拉丁词 1 / 合计 10 / 字符 13 / 句 1 / 段 1 / 阅读 1 分钟）+ 选区行 + 新注脚；状态栏同时显示「10 字 · 阅读约 1 分钟」，与合计一致 |
| `r31-stats-rows-dark.png` | 同一面板在 `data-theme=dark` 下（可选证据，主题变量自动跟随） |
| `r31-link-editor-fixed.png` | 点正文链接后浮层打开：文字 = 例子（已全选）、地址 = `https://example.com/page` |
| `r31-list-tab-fixed.png` | 列表第二项 Tab 后进源码模式：`- 项目一` / `  - 项目二`（2 空格缩进，能看到续行无行尾双空格） |

## 5. 计划漏洞与偏离（最小改动绕过，未扩大范围）

1. **plan 的分工假设不成立**（两个 builder）：本轮只有一个执行代理，按 T1→T2→T3→T4 串行做完，文件所有权无冲突。未因此改任何验收标准。
2. **表格 Tab 断言写法**（脚本问题，不是产品问题）：初版断言用 `document.activeElement.closest('td,th')`，实测永远是 `false`——ProseMirror 的 `activeElement` 就是 `.ProseMirror` 这个 contenteditable div。改成判 `window.getSelection().anchorNode` 落在 `td/th` 后 PASS；同时把「两格分别是 一格/二格」改成按全表索引不同格判定（原来只看前 4 个 `td`，而表头是 `th`，索引错位）。
3. **`npm install --package-lock-only` 在本机失败**：写不了 `%LOCALAPPDATA%\npm-cache\_logs`（DSH 沙箱拒绝），改 `--cache .tmp/npm-cache` 后成功，lock diff 仍只有根 dependencies 一行。没有 `--force`、没有改 `node_modules`。
4. 审查 P2-2（链接砍单时删 CHANGELOG 半句）**不适用**：链接没砍。审查 P2-4（README 快捷键清单）由本代理在 T4 阶段补上（原计划写的是 builder B，但 B 不存在）。
5. `TS` 侧只用了 Tiptap 已有的 `sinkListItem` / `liftListItem`，没有新依赖、没有动 `applyLink` / `LinkEditor` / 样式。

## 6. 预设 UNVERIFIED（本轮没有验证过，不得当成通过）

| 项 | 为什么测不了 | 怎么补 |
| :--- | :--- | :--- |
| 真实目录句柄上的「删除 → 撤销 → 保存」与「改名非当前文档 → 保存」 | 假 FSA 没有权限模型（`move()` 分支总被走到） | 真实文件夹手测两条路径，核对被删/被改名文件字节不变 |
| 列表嵌套的**存盘字节**（`Ctrl+S` 后文件里是 `  - 项目二`） | 本轮 e2e 只断言源码文本与 DOM 重解析；假工作区存盘断言没写（plan §5 已登记下一轮补 `fixtures/markdown/nested-list.md`） | 下一轮加 fixture + 假工作区存盘断言；补测前不要把「列表 Tab 保存正确」写成承诺 |
| 真实中文输入法下的 Tab 与链接点击 | 无可用 IME 自动化 | 真机手测：组合输入中按 Tab、点链接 |
| 打字后 2 秒内点撤销（乙的自动保存被取消） | 既有行为，需要真人节奏 | 手测：在乙里输入后立刻撤销，确认关窗仍提示未保存 |
| `npm ci` 在干净机器上 | 本轮不跑（会动 `node_modules`） | 合入后看 CI `gate` job |
| 安装包增量（本轮新代码） | 本轮不重打包（`release/` 不动） | 下一轮发版打包后对比 824,209 B |

## 7. 新踩的坑（下一轮会再踩）

1. **用 `Invoke-WebRequest` 判 dev server 模块新鲜度时不要 `-match` 中文**：PowerShell 把响应体按 ANSI 解，`-match '中日韩字'` 会**误报 False**（同一请求里 `-match 'panelRef'` 为 True）。判新鲜度只用 ASCII 片段（`sinkListItem`、`openLinkRef.current =`、`panelRef`、`tabIndex`）。
2. **ProseMirror 的 `document.activeElement` 永远是 `.ProseMirror`**：判断「焦点/光标还在表格里」必须看 `getSelection().anchorNode` 的祖先，不能看 `activeElement.closest('td')`，否则表格回归断言必假红。
3. **`npm install --package-lock-only` 在 DSH 沙箱里会失败**（`%LOCALAPPDATA%\npm-cache\_logs` 不可写），加 `--cache .tmp/npm-cache` 即可；lock 文件 diff 仍只有一行，不要因失败转去手改 lock。
4. **删除→撤销的证据截图要贴在撤销点击之后**：脚本里若先做「输入 + 自动保存」再截图，toast 已变成「已保存 X.md」，「已恢复 甲.md」那句错过了。想拍「已恢复」必须在 `撤销` 点击后 1.8 s 内截图。
5. 列表 Tab 的 e2e 必须先点第二项文字再 `Shift+Tab`：源码模式回编辑后 `switchView` 不调 `.focus()`，焦点在 `body`，直接按 `Shift+Tab` 到不了 `handleKeyDown`（plan 风险 6 实测成立，探针 `active.tag = BODY`）。

## 8. CHANGELOG 建议条目

已按 plan T4 写入 `docs/CHANGELOG.md` 的 `## Unreleased` → 「**第 31 轮（同一未发版区间）**」，5 条：数据安全（撤销/改名不切保存目标）、字数明细七行与焦点、链接就地编辑与列表 Tab、门禁与文档（strike 依赖 + 21/272 + 文案）、UNVERIFIED。首屏数字写「仍 ≤286,000 B，实测值见 `docs/iteration/round-31/test.md`」，本轮实测 284,761 B（+232 B）。
