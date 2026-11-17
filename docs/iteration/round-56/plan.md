# 第 56 轮计划（round=56）

> **revision r1**（按 `plan-review.md` 6 条 P1 修订；两轮结构与任务集合不变）

HEAD `882eb49`。基线：`npm test` 37 文件 462 条；首屏 gzip 297,656 B。
排序：B-119（数据风险）> B-118 > B-116 > B-004 > B-108。B-115 保持 open；其余 deferred。不发版、不 push、不改 `release/`。
预算：executor 每轮 25 分钟（`roles/executor.md:3`），e2e 交 tester，只跑 `tsc`/`test`/`verify`（A1 加 `roundtrip`）。砍单：A1→A3→A2（A2 挪 B）；B1→A2→B2；B3 交 scribe。

## A 轮

### A1 B-119 行内定界符守卫（保底 20 分钟）
文件：`src/lib/inlineSyntax.ts:35-37`、`src/components/SettingsDialog.tsx:119`、`src/lib/inlineSyntax.test.ts`
步骤：1) `whole` 只加能落地的 flanking（开后/闭前不贴空白）：`/^==(?![=\s])([^\n=]+?)(?<!\s)==(?!==)/`（`^`/`~` 同形）；`start()` 只定位。左邻不做 lookbehind：marked 17 传的是候选位起剩余串（`p.call({lexer:this}, e, t)`），位置 0 左断言恒真。2) 连续段另守：候选位同符号段长 > 定界符长（`=` ≥3、`^` ≥2）时整段按字面吃（返回 `text` token；不认就改读 `tokens.at(-1)?.raw` 判左邻，注 marked 17）；`~~` 不许吃，留给 del。3) `SettingsDialog.tsx:119` 删「写回字节两种状态都一样」，改「成对且不贴空白才解析」。4) 加 5 条单测，断言 mark 文本清单 + `roundTrip(source)===source`，修前存 `.tmp/r56-a1-tests-red.log`（5 红）：`==== 与 ==不闭合`、`x ==== y ==z`（eq `[]`）；`^^ 与 ^不闭合`、`a ^ b 与 c^d`（caret `[]`）；`~a~ ~b~ 与 a ~ b 与 H~2~O`（tildeSub `['a','b','2']`）。别用 `:100-102` 三条（修前也绿）、`~a~与~b~`（合法成对）。
验收：`tsc --noEmit` 0；`npm test` 467 条；`.tmp/e2e-r56-a1-inline.mjs`（finder 6 例 +`a====b==c`+`== a ==`，开关各一轮）开态写盘逐字节同源、无 `.sl-eq`。门禁：`npm test`、`npm run roundtrip`、`npm run verify`。风险：误伤 `==高亮==`，靠 9 条反向对照。

### A3 B-116 逐键脏判定去全文序列化（25 分钟；A1 提前做完才做，否则挪 B）
文件：`src/App.tsx:973-1001`
步骤：先量残值再定门槛：临时 `baselineRef.current=null` 跑同脚本，p50/p95 记 `.tmp/r56-a3-residual.json`（`:977-981` 只占 10/51 ms，余下在 PM 与视图）。实现：留 `addToHistory`；`:977-981` 比较移进 `:989-1001` 的 300 ms 回调，同步路径只 `transaction.docChanged`→`setDirty(true)`，回调同一序列化双向纠正。保存链仍读 `dirtyRef`，Ctrl+S 判据不变；不动 `serializeDocument`/`baselineLosses`。
验收：门槛改相对：p95 比基线降 ≥30%（100 KB 66→≤46、1 MB 252→≤176 ms），残值与新值记 `.tmp/r56-a3-perf.json`；某尺寸残值 ≥ 原绝对门槛（100 KB 20 / 1 MB 60 ms）则该尺寸只记「不设绝对门槛，写 B-116 新基线」，不达相对目标则回滚。`.tmp/e2e-r56-a3-dirty.mjs`：打字 300 ms 内 `.dirty` 现、撤销回基线 800 ms 内消、Ctrl+S 提示对；1 MB 载入 5 mark ≤3.5 s；门禁：`npm test`、`npm run verify`。

## B 轮（先 10 分钟 delta 回归）

### B1 B-004 宿主 `/__asset`（保底 25 分钟）
文件：`host/Program.cs:201-215`、`:283-301`、`src/lib/assetResolve.ts`、`src/lib/assetResolve.test.ts`、`src/App.tsx`
步骤：1) `:300-301` 先截 query——`/__asset` 要拿原始 target 再解 `path`。2) `HandleAssetRequest`：同 `/__doc` 的 Host 校验；只 GET/HEAD；`path` 先 `Uri.UnescapeDataString`（失败 400）再拒绝对、`..`、`\`、`:`、`//`、空；`GetFullPath` 仍在文档目录前缀内；只发白名单图片；`no-store`；200/404。3) `MimeMap`（现只有 `.png/.svg/.ico`）补 `.jpg/.jpeg/.webp/.gif/.bmp`（`App.tsx:942` 收 `image/*`；不补则 jpg/webp 404 测不出）。4) 前端 `hostAssetUrl(src)` 纯函数（`encodeURIComponent`、拒越界）；`hostDoc?.ready` 时 `setAssetResolver`，工作区分支不动。5) 单测 3 条。
验收：`tsc --noEmit` 0；`npm test` 473 条；`host\build.ps1` 过、`Sidelight.exe --version`=0.32.1；`.tmp/e2e-r56-b1-asset.mjs` 开 `.tmp/r56-asset/示例.md`：`?path=图%201.jpg` 200 且字节同，`?path=../secret.txt`、`?path=%2e%2e%2fsecret.txt`、`?path=/abs.png` 均 403/404，无 CORS。宿主起不来记 UNVERIFIED（静态+单测）。门禁：`npm test`、`npm run verify`。

### A2 B-118 暖纸弱文字对比度（15 分钟；A 轮没做完挪这里）
文件：`src/styles.css:77`、`src/lib/themes.ts:24`、`src/lib/themes.test.ts`
步骤：`--ink-faint` 由 `#7a6b54` 改 `#736349`（paper 4.798、panel 4.541，均 ≥4.5，比 `--ink-soft` 浅）。两处一起改（`styles.css`+`themes.ts`；只改 CSS 会让 `themes.test.ts:27-35` 对照红）。测试 3 条：sepia `ink-faint/paper`、`/panel` ≥4.5（比值进断言消息）；内建循环改「sepia 一对 + 读 `:root`、`[data-theme='dark']` 各一对」（清单只有 sepia）。取值走清单与 `cssThemeVars()`。
验收：`npm test` 470 条；`.tmp/e2e-r56-a2-contrast.mjs`（CDP 9222 设 `data-theme=sepia`，算 `.status-chip-quiet`、`.file-tree-empty-sub` 的 computed 比值 ≥4.5）；截图 `shots/round-56/sepia-faint-fixed.png`。门禁：`npm run verify`（gzip ≤310,000）、`npm test`。

### B2 B-108 设置面板页脚与溢出（15 分钟；不够留 deferred）
文件：`src/styles.css:1202-1211`、`:1254-1263`
步骤：`.dialog` 补底部内边距、可滚内容补等值 padding，滚到底页脚在框内；1440×900 与 1000×620 复测；不动高度上限（保存前对比框共用）。
验收：`.tmp/e2e-r56-b2-dialog.mjs` 两档 `footer.bottom ≤ dialog.bottom`、记 `scrollHeight-clientHeight`（现 78 px）；截图 `shots/round-56/settings-footer-1000x620.png`。门禁：`npm test`、`npm run verify`。

## 收尾
B3 文档同步（typora-gap、README、AGENTS、BRIEF、BACKLOG；表头=行数、「拖入文件或文件夹打开 | 无」改前 ≥1 改后 0、diff 只含 5 个文档）交 scribe。tester 独立验收并 commit；截图每轮 ≤2 张。
