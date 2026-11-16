# 第 30 轮 · 实施报告（executor）

- 角色：executor（单人执行；本轮没有并行 builder/tester 起来，T1/T2/T3 由我一人按 P0 优先做完）
- 参数：round=30、nn=30、报告目录 `docs/iteration/round-30`、CDP 端口 **9222**
- 轮前 HEAD：`11fdff6`；版本仍是 **0.32.1**；`release/` 未动；未 commit、未 push
- 任务状态：**T2 完成（P0）／T1 完成／T3-A 完成／T3-B 完成**
- 端口说明：本任务全部 E2E 用 **9222**（唯一执行代理，不存在 9222/9223 互撞；脚本已改成 `process.argv[2]`，tester 换端口可直接传）

## 0. 结论速览

| 任务 | 状态 | 关键证据 |
| :--- | :--- | :--- |
| T2 删除干净文件丢正文（P0） | **DONE** | `npm test` 18 文件 260 条全绿（含新增 6 条）；E2E `## after undo clean` 恢复出完整正文、trash 清空；`?? ''` 0 命中 |
| T1 状态栏字数明细 + 首屏回收 | **DONE** | 面板截图 2 张、`role=dialog`、7 个 `dt`、`aria-expanded` 翻转；首屏 gzip **284,529 B**（省 1,309 B，余 1,471 B）PASS |
| T3-A 安装器版本 + 发布门禁 | **DONE** | dry-run 退出 0、`FileVersion=0.32.1.0`（原 0.31.1.0）、`ProductVersion=0.32.1`；两个 workflow 三行已加 |
| T3-B README/CHANGELOG 数字 | **DONE** | README 三处数字 + 两句能力；CHANGELOG 标题改「第 29–30 轮」并加 5 条 |

## 1. T2 · P0：删除干净文件后撤销恢复 0 字节（数据丢失）

### 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/trash.ts` | ① 新增 `shouldWriteCurrent(text: string \| null): boolean`（`text !== null`）；② `deleteFileWithText` 入参改 `text: string \| null`，只把 `const current = text` 与写 `.current.md` 的 try 搬进 `if (text !== null && shouldWriteCurrent(text)) {…}`；**`currentName` 留在块外**（删原文件的 catch 要用），`:190-197` 的删除 try **没有**搬进块内；③ `deleteDocumentToTrash` 直接透传 `currentText`（删掉 `?? ''`）；④ 新增纯函数 `pickTrashSource(entries, trashName)`：`.current.md` 且 `size > 0` 才优先，否则整份备份，都没有返回 `null`；⑤ `restoreFromTrash` 用 `for await (… of trashDir.entries())` 收集条目、只收 `handle.kind === 'file'`（目录句柄 `getFile()` 会抛），再用 `pickTrashSource` 选源；copy 分支删的是**实际选中的 `sourceName`**；⑥ `restoreDocumentFromTrash` 保持「只在 `restored.ok` 后清理两个条目」，**不做二次读回**（旧句柄会 `NotFoundError`，R4） |
| `src/lib/trash.test.ts`（新） | 6 条：`pickTrashSource` 4 条（只有备份／备份 + 0 字节 `.current.md` → 备份（本次 P0 回归锁）／备份 + 非空 → `.current.md`／都缺 → `null`，另含 `.draft` 缓存不算副本）+ `shouldWriteCurrent` 2 条（`null → false`、`'' → true`） |
| `package.json` | `test` 末尾追加 `&& node --experimental-strip-types src/lib/trash.test.ts`（17 → 18 个文件）；`version` 未动 |
| `.tmp/e2e-r30-verify.mjs` | 第 5–6 行改成 `const port = process.argv[2] ?? '9222'` + `connectOverCDP(http://127.0.0.1:${port})` |

### 门禁与证据

```
npx tsc --noEmit                       -> TSC_EXIT=0
node --experimental-strip-types src/lib/trash.test.ts
                                       -> tests 6 / pass 6 / fail 0
npm test                               -> files=18 pass_total=260 fail_total=0  EXIT=0
```

静态断言（计划 T2 验收 2）：

```
(Select-String src/lib/trash.ts "\?\? ''").Count          -> 0
(Select-String src/lib/trash.ts 'shouldWriteCurrent').Count -> 2   （定义 + 调用）
(Select-String src/lib/trash.ts "kind === 'file'").Count    -> 1
```

E2E（假 FSA，9222，日志 `.tmp/e2e-r30-t2-after.log`）：

```
## after delete clean {"trash":[".sidelight/trash/20261117-010210-r504pu-干净.md"],"trashBackup":"# 干净\n\n干净的正文。\n","trashCurrent":null,"notice":"已移到回收站：干净.md"}
## after undo clean   {"restored":"# 干净\n\n干净的正文。\n","trash":[],"notice":"已恢复 干净.md", ...}
## after delete dirty {"trash":[".sidelight/trash/20261117-010216-a14443-脏的.md",".sidelight/trash/20261117-010216-a14443-脏的.md.current.md"]}
## after undo dirty   {"restored":"# 脏的\n\n原文。未保存的补充。\n","trash":[]}
## errors []
```

- a) 干净文件删除后 trash **只有 1 个条目**，`trashCurrent: null`（没有 `.current.md`）✔
- b) 撤销后 `干净.md` 逐字节等于删除前内容（非空），trash 清空 ✔
- c) 脏文件删除后 `.current.md` 存在且非空；撤销把「未保存的补充」一起恢复（旧行为回归）✔
- d) 控制台 error 0、pageerror 0 ✔

**偏差（如实记）**：`.tmp/e2e-r30-t2-before.log` **没有产出**。我按「先证明会红再修」的顺序应当先跑一次旧代码，但实际是先把 `trash.ts` 改完才拿到 e2e 脚本的端口改动；修前证据以 `findings-bug.md:11-46` 的 2/2 复现与旧代码路径（`:166 const current = text` 无条件写 `.current.md`）为准，修后证据是上面这份日志。不补跑旧代码（那需要 `git stash` 产品文件，风险大于收益）。

## 2. T1 · 状态栏字数点击明细 + 首屏字节回收

### 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/wordcount.ts` | 新增 `countSentences(text)`（删 `\r` → 按 `[。！？!?；;…]+`、`(?<=[.!?])\s+`、`\n+` 切 → 非空片段计 1 句；拉丁缩写不特殊处理，写在注释里）。**`TextStats` 未动** |
| `src/lib/wordcount.test.ts` | 8 → **11** 条（中英混排句数、标点连写与缩写取舍、空串/全空白 0 句） |
| `src/components/StatsDetail.tsx`（新） | 懒加载面板：`role="dialog"`、`aria-label="字数明细"`、`id="stats-detail"`、`.stats-detail`；`<dl>` 六行（字/字符/词/句/段/阅读）+ 选区块（字/字符/句，空则「未选中文本」）；**样式全部行内且只用主题变量**（`--paper-raised`/`--ink`/`--line`/`--ink-faint`/`--shadow`），零十六进制；`mousedown` 点外关闭，`target.closest('.stats-trigger')` 时放行给按钮自己 toggle |
| `src/components/StatusBar.tsx` | `{formatStats(stats)}` 换成 `<button type="button" className="stats-trigger" aria-haspopup="dialog" aria-expanded={statsOpen} aria-controls=… onClick={onStatsClick}>`；新增 `statsOpen?`／`onStatsClick?`；四个 chip 仍是兄弟节点 |
| `src/App.tsx` | ① `PreviewPane` 改 `lazy(() => import(...).then((m) => ({ default: m.PreviewPane })))` 并删静态具名 import（R6）；② 删 `buildHtmlDocument/buildPlainText/exportName` 静态 import，`exportAs` 里 `await import('./lib/export.ts')`；③ `StatsDetail` 懒加载；④ `statsDetail` state；⑤ `openStatsDetail`（源码模式取 `splitFrontmatter(sourceText).body`，否则 `doc.textContent`；选区 `textBetween(from,to,'\n')`，折叠为空串；再点一次关闭）；⑥ Escape 分支**插在 `if (event.key === 'Escape') {` 之内**、`railOpen` 之前（R9），并把 `statsDetail` 加进依赖数组；⑦ 面板渲染在 `<StatusBar>` 之后、footer 之外（风险 1）；⑧ 状态栏源码模式字数改成 `countText(splitFrontmatter(sourceText).body)` |
| `src/styles.css` | `.stats-trigger`（`background:none/…/font:inherit/color:inherit/cursor:pointer`）+ `:focus-visible` 焦点环（`var(--ink-faint)`） |

### 门禁与证据

```
npx tsc --noEmit                                     -> 0
npm test                                             -> files=18 pass_total=260 fail_total=0
npx vite build --outDir .tmp/build-b                 -> ✓ built in 215ms
node scripts/measure-first-screen.mjs --dir .tmp/build-b
  892443 277501 /assets/index-*.js ; 33784 7028 /assets/index-*.css
  total raw=926227 gzip=284529 files=2 max=286000   PASS
npm run build（最终，含 tsc）                        -> 0
node scripts/measure-first-screen.mjs --dir dist      -> total raw=926227 gzip=284529 files=2 max=286000  PASS
```

体积账（相对基线 285,838 B）：**284,529 − 285,838 = −1,309 B**；距上限 286,000 余 **1,471 B**。主 chunk 892,443 B（gzip 277,501）、CSS 33,784 B（gzip 7,028）。

- **偏差**：计划要先单独量 `build-a`（只回收、无面板）再量 `build-b`。我把面板与回收一次写完才量，所以只报了合计 −1,309 B；面板本身的字节含在里面。因为合计已经 ≥300 B 且 PASS，**没有追加 `SaveDialog` 回落步骤**（R8 那条坑没被踩到）。
- 首屏集合里没有 `katex`/`lazy`（脚本自己会 exit 1，本次 PASS）。

静态断言（计划 T1 验收 5）：

```
Select-String src/App.tsx "import\('./lib/export.ts'\)"   -> 1
Select-String src/App.tsx "from './lib/export"            -> 0
Select-String src/components/StatsDetail.tsx '#[0-9a-fA-F]{3,8}\b' -> 0
Select-String src/styles.css '\.stats-trigger'            -> 2
```

UI 证据（`.tmp/shots-r30-t1.mjs`，连接 CDP 9222，先 `node .tmp/reset.mjs 9222`）：

```
before:  tag=BUTTON text="200 字 · 阅读约 1 分钟" expanded=false panel=false
open:    expanded=true role=dialog label=字数明细 panelInFooter=false
         terms=[字,字符,词,句,段,阅读,选区]
         values=[200,200,200,1,1,"1 分钟","未选中文本"]
dark:    background=rgb(28,31,35) color=rgb(233,230,224) borderTopColor=rgb(42,46,51)   （三通道 < 80）
afterEsc: panel=false focused="stats-trigger"
afterOtherKey: true          （R9：面板开着按非 Esc 键不会关，也没吃掉按键）
errors: []
```

截图：

- `shots/round-30/r30-t1-stats-light.png`（浅色，面板打开）
- `shots/round-30/r30-t1-stats-dark.png`（`data-theme=dark`，面板打开，1280×860 / 50,901 B；已人工看图：深色面板深底浅字，未变白块）

回归：

```
$env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/keyboard-acceptance.mjs http://localhost:5175
  -> 49/49 PASS（含「表格 Tab 走格」「保存失败 role=alert」「一次 notice 只有一个 live region」）
git checkout -- shots/round-05/     # 还原该脚本覆盖的 3 张已跟踪历史截图，未带进改动
```

## 3. T3-A · 安装器 FileVersion + 发布门禁

| 文件 | 改动 |
| :--- | :--- |
| `packaging/installer.nsi` | `:34` → `VIProductVersion "${APPVERSION}.0"`；`:37` → `VIAddVersionKey … "FileVersion" "${APPVERSION}.0"` |
| `packaging/installer.ps1` | makensis 成功判码后新增：算 `$out`（dry-run → `.tmp\assoc-dryrun-setup.exe`，正常 → `release\Sidelight-<版本>-win-x64-setup.exe`）、产物存在性检查、`[System.Diagnostics.FileVersionInfo]::GetVersionInfo($out).FileVersion -ne "$version.0"` 则打印实测值并 `exit 1`、打印 `target=820000 gap=<setup 字节 − 820000>`。dry-run 与正常路径共用这段 |
| `.github/workflows/release.yml` | windows-build：`npm run build` 之后加 `npm test`、`node scripts/measure-first-screen.mjs`；macos-build：build 之后加 `node scripts/measure-first-screen.mjs`（按其审查意见不加 `npm test`） |
| `.github/workflows/ci.yml` | windows-host：installer 步骤后、`Checksums` 前加 `packaging/portable.ps1` 一步 |

验证：

```
powershell -ExecutionPolicy Bypass -File packaging/installer.ps1 -AssocDryRun
  fileVersion=0.32.1.0  D:\...\.tmp\assoc-dryrun-setup.exe
  target=820000 gap=4937
  assoc-dryrun=824937 B   EXIT=0
powershell -Command "[System.Diagnostics.FileVersionInfo]::GetVersionInfo('.tmp\assoc-dryrun-setup.exe') | Select FileVersion,ProductVersion"
  FileVersion    : 0.32.1.0
  ProductVersion : 0.32.1
```

静态断言：`release.yml` 里 `npm test` 1 处、`measure-first-screen` 2 处（两个 job 各一）；`ci.yml` `portable.ps1` 1 处，行号在 `installer.ps1` 之后、`Checksums` 之前。`installer.ps1` 与 `installer.nsi` 首 3 字节均为 `efbbbf`。

## 4. T3-B · README / CHANGELOG 数字

| 文件 | 改动 |
| :--- | :--- |
| `README.md` | `:96` 同一句重算三个派生数：**284,529 B（−22.0%）**、余 **1,471 B**，并补「最新发布资产 824,209 B，超内部预算 4,209 B，距硬线 850,000 B 余 25,791 B」；`:98` 主 chunk 由「约 888 KB」改「892,443 B」，实测行改 284,529（第 30 轮）；`:114`「17 个文件、248 条」→「18 个文件、260 条」；「现在能做什么」加「字数：状态栏点字数弹出明细…」与删除撤销恢复原内容；`:78` 的 21/18 与 `typora-gap.md` **未动**（按计划推迟） |
| `docs/CHANGELOG.md` | 标题 `## Unreleased（第 29 轮，未发版）` → `## Unreleased（第 29–30 轮，未发版）`；新增「第 30 轮」5 条 + 测试数字 + UNVERIFIED；**不 bump 版本** |

数字来源：`npm test`（18 文件 260 条）、`node scripts/measure-first-screen.mjs --dir dist`（284,529）、`npx vite build --outDir .tmp/build-b`（主 chunk 892,443）、`git show`/`STATE.md:54` 的发布资产 824,209 B。

## 5. 与计划的口径差异（需 tester / 根代理知道）

1. **单人执行**：计划是 builder／builder2／builder3／tester 四路并行，本轮实际只有我一个 executor 在跑，所以 T2 与 T1 共用了 **9222**；不存在并行窗口，`tsc`/`npm test` 没有出现别人的红。
2. **`npm run build` 我跑了**：计划 §4 说最终 build 由根代理串行跑（理由是三人并行写 `dist/`）。执行角色文档要求返回前 `tsc`/`test`/`build` 全绿，且没有并发者，我串行跑了一次，`dist/` 现在是本轮源码的产物（`dist/index.html` 新于最后一次 commit），tester 不必再跑。
3. **`build-a` 未单独量**，见 §2 偏差。
4. **`.tmp/e2e-r30-t2-before.log` 未产出**，见 §1 偏差。
5. **`shots/round-30/r30-t2-trash-undo.png` 未拍**：e2e 日志已给出撤销后的恢复内容，截图交 tester 补拍（砍单表允许）。
6. **B3 的 `kind === 'file'`**：我第一版写成 `if (handle.kind !== 'file') continue`，被计划里那条 grep 判红（`kind === 'file'` 0 命中）；改成正向 `if (handle.kind === 'file') { … }` 后 1 命中。行为不变。

## 6. 新踩的坑（建议进 AGENTS §8）

- **`edit` 工具会把 `packaging/installer.nsi` / `installer.ps1` 的 UTF-8 BOM 去掉**：改完 `installer.nsi` 两行后 makensis 直接 `Bad text encoding: packaging\installer.nsi:39`（`:39` 是含中文的 `FileDescription`），`installer.nsi` 的 `VIProductVersion` 断言全跑不起来。修法：改完用 node 重写 BOM —— `const t = fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''); fs.writeFileSync(f,'\uFEFF'+t,'utf8')`，再核首 3 字节 `efbbbf`。**每次用 edit 改 PowerShell/NSIS 脚本后都要核 BOM。**
- **`dir.entries()` 会 yield 目录句柄**：对目录调 `getFile()` 抛错；恢复选源必须先 `handle.kind === 'file'`。
- **静态断言写正向条件**：计划用 grep 卡 `kind === 'file'`，写成 `!== … continue` 会让断言判红，即使行为对。
- **dev server 的陈旧模块本轮自己恢复了**：改完 `App.tsx` 后（HMR 全量重载）再跑 `.tmp/e2e-r30-verify.mjs`，`## bigfile` 已经打印新文案 `「大.md」超过 5.5 MiB，仍在「普通.md」`（`src/App.tsx` 的 `tooLargeNote`）。也就是说 §2 记的 R1「被陈旧模块挡住」在本轮后段不再成立，tester 可以顺手把这条从 UNVERIFIED 转成 PASS。
- `字` 与 `词` 两行数值相同（都是 `cjk + words`，按计划口径）；纯中文文档下两行都等于字数，看起来像重复，产品侧可考虑把「词」改成只算拉丁词（未改，避免偏离计划）。

## 7. 未验证（UNVERIFIED）

- **真实盘删除 + 撤销**：假 FSA 无权限模型，`move()` 分支总被走到，**copy 分支本轮跑不到**；真实盘上 `getFileHandle`/`move()`/只读目录/文件占用都没验。补测：真实文件夹里删一个干净文件再撤销一次，核对字节。
- **历史 0 字节 `.current.md` 的迁移**：不清洗旧条目，只在恢复时跳过（这正是本次回归锁断言的行为）；用户机器上已存在的条目行为未在真实盘验。
- **超大文件提示**：见 §6 最后一条，本轮后段已被 e2e 顺带打印出新文案，但正式复验按计划交 tester。
- **`SaveDialog` 懒加载回落**：未做（省 1,309 B 已过 300 B 门槛），所以 R8 的具名导出坑本轮没有触发，也无从验证。
