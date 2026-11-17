# 第 52 轮 独立验收（tester）

判定：**PASS-WITH-UNVERIFIED**。三条任务按验收标准从零复验；门禁全过；未读 `impl.md`。

## 1. 门禁（各一次）

| 命令 | 结果 |
| :--- | :--- |
| `npm run verify` | PASS。首屏 gzip **296,055 B**（+579，内部 310,000 / 硬线 320,000，余 23,945）；主 chunk `index-B2f5-0fa.js` 288,036 gzip |
| `npm test` | 34 个文件 **442 条** 0 fail（`.tmp/r52-test.log`） |
| `npm run roundtrip` | PASS，rich 5/7、source 7/7（`.tmp/r52-roundtrip.log`） |

## 2. B1（B-013）1 MB 载入热点

- 同脚本同 seed 复跑 `node .tmp/e2e-r51-b1.mjs .tmp/r52-tester-b1.json`（reset 后）：
  - 1,000,012 字符 / 44,446 块：`ready` 基线 **112,560 ms** → **2,947 ms**（门槛 30,000）；`sl-parse-done` 110,998 → 1,317 ms。
  - 100 KB / 4,647 块：`ready` **1,130 ms**（门槛 3,000）；基线 1,305 ms。
  - 顶层节点 44,446 / 4,648、首段「大文档（多节点）」、末段 `""`、正文长度 933,344 / 93,039：与改前 `.tmp/r51-b1-before.json` **逐字相同**；`errors: []`。
- 基线在改码前：`.tmp/r51-b1-before.json` mtime 03:10:39 早于 `src/App.tsx` 03:17:50。
- 未加/换依赖：`git diff -- package.json package-lock.json` 空；新文件 `src/lib/markdownFastPath.ts` 是自写守卫（表格看前两行、任务列表看头 2048 字符），命中才调原实现。
- 改前 profile 前三（`.tmp/r51-b1-prof.json`）：`parseIndentedBlocks` 71.3%、`@tiptap/extension-table start` 23.6%、GC 2.7%——均落在 tiptap/marked 依赖内。
- UNVERIFIED：改后未再取样 profile（前三沿用改前）；生产构建口径只测 dev。

## 3. B2（B-002 + B-012）全屏 + 宿主钩子

- `host\build.ps1` exit 0；`host\bin\Sidelight.exe` **FileVersion=0.32.1.0**（`.tmp/r52-hostbuild.log`）。
- `git grep -nE 'IsZoomControlEnabled|ContainsFullScreenElementChanged' -- host`：startSha `823c1d4` **0 命中**（exit 1，对照）；改后合计 3 行命中（`IsZoomControlEnabled` 1 行 `:1506`；`ContainsFullScreenElementChanged` 2 行 `:1514`、`:1550`）。
- 未改加速键：`git diff -U0 -- host/Program.cs` 的 `+`/`-` 行无 `AreBrowserAcceleratorKeysEnabled`（仍为 `:1496` 的 `false`）。
- 浏览器态（`.tmp/e2e-r52-test-b2.mjs` → `.tmp/r52-test-b2.log`）：`dataset.fullscreen`/`fullscreenElement` = `false`/null → F11 → **`true`/HTML** → F11 → **`false`/null**；快捷键表 28 行含 F11；0 控制台错误。
- UNVERIFIED：真实宿主窗口里的进出全屏（未启动 GUI）；宿主 `Ctrl+滚轮`。

## 4. B3（B-007）单元格手打块级标记

`.tmp/e2e-r52-test-b3.mjs` 10/10 PASS（`.tmp/r52-test-b3.log`）：
- 三个单元格分别手打 `# 标题` / `> 引用` / `- 列表`：表内 `heading/blockquote/ul/ol` 全 **0**，每格仍 **1 个 `p`**，文本为字面 `# 标题A`、`> 引用B`、`- 列表C`。
- 正文点末段、Home、`# 正文标题` → `.ProseMirror h1` 1 → **2**，新节点文本「正文标题正文段落在里。」（不误拦）。
- 工具栏 H1（表格内）→ toast「表格单元格里不能用命令插入标题或块级内容：Markdown 表格只装行内内容」。
- `Ctrl+S`：源码含三处字面标记、4 行 `|`（3 行表格）；重开 3 行 / 6 格、`heading/quote/list` 仍 0。

## 5. 回归与旧脚本（非本轮引入）

- `scripts/keyboard-acceptance.mjs` **51/52**：唯一 FAIL「Ctrl+Shift+S 不出现新的已保存/已取消提示」。复现两次一致；`strike:0`、`picker` 不变、无新 toast（`shiftS.toast=null`），断的是「上一个 toast 还在」。根因：第 51 轮 `src/App.tsx:3110,3117` 新增「没有改动，未写入。」`ttl:1500`，旧断言把 `toastBefore`（1.5 s 生命）当长期存在；第 49 轮同一断言 PASS。非本轮代码所致。
- `scripts/bigfile-acceptance.mjs` **2/3**：FAIL 断文案含「文件太大」，HEAD `src/App.tsx:2396` 早已改成「「big.md」超过 5.5 MiB，仍在「未命名.md」」；该行不在本轮 diff 内。
- 两条已记 `BACKLOG.md` B-209（deferred）。`shots/round-05/`、`shots/round-10/` 未被本轮回写（本脚本只读）。

## 6. 证据路径与截图

- 原始日志：`.tmp/r52-{verify,test,roundtrip,hostbuild,test-b2,test-b3,regress-keyboard2,regress-bigfile}.log`；B1 读数 `.tmp/r52-tester-b1.json`。
- 截图（本轮 ≤2，均既有）：`shots/round-52/b2-shortcuts-f11.png`（快捷键表 F11 行）、`shots/round-52/delta-zoom-200.png`（delta 检查用；本轮未新增）。
- 未改动 `release/`，未 push；README/AGENTS 留给 scribe。

## 7. 残留 UNVERIFIED

1. 真实宿主窗口 F11 进出全屏与宿主 `Ctrl+滚轮`（只验浏览器态 + 静态钩子）。
2. 真实中文 IME 下的单元格块级标记、F11、整页缩放。
3. B1 改后 CPU profile 未另取样（前三引用改前读数）；生产构建下的 1 MB 载入未测。
