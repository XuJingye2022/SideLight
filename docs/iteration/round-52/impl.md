# 第 52 轮执行报告（executor）

startSha `823c1d4`。只改工作树，未 commit / push / 动 `release/`。三任务 DONE。

## B1 DONE —— 1 MB 多节点载入热点（ready 112,560 → 2,889 ms；100 KB 1,305 → 1,134 ms）

- 基线：`.tmp/e2e-r51-b1.mjs`（种子/测量照 `.tmp/e2e-r51-bug-4.mjs:5-12`）→ `.tmp/r51-b1-before.json`。
- profile（`.tmp/e2e-r52-b1-prof.mjs`）：`parseIndentedBlocks`（task-list tokenize）71.3 %、表格 `tokenizer.start` 23.6 %。
- 机制：marked 的 `blockTokens` 在每个块位置都调全部 block tokenizer 并传「剩下的整篇」；这两个一进来就 `split('\n')` 全文 ⇒ 4.4 万块 × 1 MB = O(n²)。
- 修法（不加不换依赖）：新增 `src/lib/markdownFastPath.ts`，只加「看前两行 / 第一个非空行」的同义守卫；`ReusableTable` 与 `FastTaskList`（`TaskList.extend`）套用，命中时原样调依赖实现。
- 改后（`.tmp/r51-b1-after.json`）：big parse 110,998 → 1,277 ms、ready 112,560 → 2,889 ms；small parse 909 → 63 ms、ready 1,305 → 1,134 ms。
- 保真：节点数 44,446 / 4,648、chars 933,344 / 93,039、首末段逐字不变；任务列表 / 引用 / 列表 / 表格仍解析（`.tmp/r52-b1-regress.log`）。
- roundtrip exit 0：rich 5/7、source 7/7、firstSaveBlocked 1/7（04-reference-links）。剩余：dispatch 642 ms。

## B2 DONE（宿主内 UNVERIFIED）—— 全屏 + 宿主缩放钩子

- `host/Program.cs`：`IsZoomControlEnabled = false`（原生 Ctrl+滚轮缩放不再与应用内整页缩放双轨）；订阅 `ContainsFullScreenElementChanged`，`ApplyHostFullScreen` 切 `FormBorderStyle`/`WindowState` 并恢复原位置。`AreBrowserAcceleratorKeysEnabled` 未动。
- `src/App.tsx`：window keydown 加 F11（进出页面全屏，失败静默）；`fullscreenchange` 回写 `dataset.fullscreen`。`ShortcutsDialog` 加一行 F11。
- 宿主：`host\build.ps1` OK（4,901,621 B），`host\bin\Sidelight.exe` FileVersion **0.32.1.0**。对照 `git grep -nE 'IsZoomControlEnabled|ContainsFullScreenElementChanged' 823c1d4 -- host` = 0；改后 3 命中（`host/Program.cs:1506/1514/1550`）。
- 浏览器态（`.tmp/r52-b2.log`）：`false/null` → F11 `true/HTML` → 再按 `false/null`。截图 `shots/round-52/b2-shortcuts-f11.png`。
- UNVERIFIED：宿主窗口内真实全屏（未起 exe）；CDP 下 Esc 退不出全屏（浏览器层交互）。

## B3 DONE —— 单元格手打块级标记

- `src/lib/tableScope.ts` 加 `typingBlockMarkerInCell`；`src/App.tsx` 的 `editorProps.handleTextInput` 命中时自己 `insertText` 返回 true，其余交回输入规则（editorProps 是直连 props，先于 inputRulesPlugin）。
- 证据（`.tmp/r52-b3.log`）：三格分别打 `# 标题` / `> 引用` / `- 列表`，每格 1 个 `p`、heading/blockquote/list 均 0、文本字面；正文打 `# 正文标题` 仍造 h1；单元格点工具栏 H1 仍提示「表格单元格里不能用命令插入标题或块级内容」；Ctrl+S 后源码含字面 `# 标题`，重开表格仍 3 行 4 格。

## 改动文件

`src/App.tsx`、`src/lib/tableScope.ts`、新增 `src/lib/markdownFastPath.ts`、`src/components/ShortcutsDialog.tsx`、`host/Program.cs`。

## 门禁

`npx tsc --noEmit` 0；`npm test` exit 0 / fail 0（34 文件 442 条；BRIEF 的 33/432 是旧数）；`npm run verify` PASS（首屏 gzip 296,055 B / 内 310,000）；`npm run roundtrip` exit 0；`host\build.ps1` OK。

## CHANGELOG 建议（一行）

- 1 MB 多节点文档载入 112 s → 2.9 s（表格/任务列表 tokenizer 的 O(n²) 守卫）；F11 全屏，WebView2 关原生缩放不再双轨。

## 新踩坑（3 条）

1. marked 的 `blockTokens` 对每个块都调全部 block tokenizer 并传剩余全文：开头就全文 `split`/`match` 的 tokenizer 都是 O(n²)。
2. `editorProps` 先于插件 props（含 inputRulesPlugin）：压输入规则就在 `handleTextInput` 返回 true 并自己 `insertText`。
3. 单元格造块 E2E 必须先点单元格再按 `Home` 到段首：输入规则只在块首命中，落段尾会假绿。
