# 第 143 轮验收（tester）

判定 **PASS**。轮前 `startSha=51c4ff280910fde92922a7fc8e38d12b3be21af5`；验收对象 = 工作区未提交的第 143 轮改动（B1/B2/B3，15 文件 +386/−569，另 3 处新增）。未读 `impl.md`。

## 门禁（真跑一次）
- `npm run verify` **exit 0 PASS**：门 gzip **316,793 B** / 常驻 `MarginRail` **4,480 B** / 真实首载 **321,273 B**（硬线 325,000，余 3,727；< 本轮上限 321,950 ✓，不必按 kbd 文案→`.export-menu`→B2 顺序裁剪）。
- `npm test` **72 文件 1003 条 0 fail**。
- `roundtrip` 不跑：diff 无编辑器/序列化改动。

## B1 顶栏 / 菜单 / 键位（自写 `.tmp/e2e-r143-tester.mjs`：1440×900、假 FSA、1 条批注、**35/35、0 pageerror**，`.tmp/r143-tester.json`）
- `.toolbar` **0**；顶栏按钮 1440 宽 = 文件▾/分析/保存/插入▾，无「导出 ▾ / ? / 设置 / 对比」；「文件 ▾」「插入 ▾」各 1；H1/H2/B/I/S 与四视图钮的按钮文本 **0**。
- 静态：`git grep -n '导出 ▾' -- src` **0（exit 1；HEAD `51c4ff2` 为 1 处 `App.tsx`）**；`git grep -nF "'关闭文档'" -- src` **0（exit 1；HEAD `FileMenu.tsx:26` 为 1）**，HEAD 的 `App.tsx` 注释未被动（门靠删菜单项，不是改注释）。
- 文件菜单 `[role=menuitemradio]` **恰 5**（对比/专注/打字机/源码/预览），初值 5 个 `aria-checked=false`；点「源码」进源码视图后重开菜单：源码 `aria-checked=true`、其余 false，再点回编辑。菜单无「关闭文档」，导出组 4 项。`[role=dialog]`：文件→帮助→**设置…** 开、快捷键一览开；插入菜单 9 项（role=menuitem）仍在。
- `Ctrl+Alt+E` 开文件菜单并聚焦导出组首项（activeElement 文本 = `HTML`）；`F8` 后 `.focus-mode` 1、`.is-dimmed` **1**，再按退出。`scripts/keyboard-acceptance.mjs` **52/52 PASS**（含该三条与预览段）。

## B2 状态栏 / 右栏（同上脚本）
- 状态栏文本 **不含** 源码/预览/专注/打字机/元数据/保存到；夹具（有选区+自动保存开+缩放 110%+frontmatter）`.status-chip` **2**（已自动保存、缩放 110%）≤5；`.stats-trigger` = 「16 字 · 阅读约 1 分钟 · 选区 16 字」；点字数面板含「元数据 frontmatter」。
- `.rail-head` **0**；宽窗 1440 `.rail-collapse` 可见 1、`.rail-close` 可见 0；1024×700 抽屉打开后反之（close 1 / collapse 0，`.app.rail-open`）。
- 首卡 top 改前 **143**（stash `src/` 后真机实测）→ 改后 **107**，**−36 px ≥ 20 ✓**。`.rail-tabs` 行高 31。
- `touchTargets.test.ts` 与 keyboard-acceptance 预览段同批全绿（`npm test` 含该文件；预览段两条 PASS 见上）。

## B3 设计语言
- `docs/design-language.md`：1–8 共 **8 条**；原则 6 = 批注钮常驻、非编辑视图 `disabled`（预览视图实测 `.rail-toggle` 存在 1 个且 `disabled=true`，顶栏不跳）；原则 7 = 只有文件/插入/视图/帮助（文件菜单节标题恰 导出/视图/帮助 + 文件项，无「段落/格式」）。
- 等价入口表 **19 行 = 44−25**（顶栏 4 + 格式栏 10 + 状态栏 5，口径同 `docs/iteration/round-142/ui-inventory.md`）。逐条对 UI 实测：改前 DOM 顶栏 7 键含导出▾/?/设置/对比、格式栏 11 键（插入▾+H1/H2/B/I/S/</>/专注/打字机/源码/预览）、状态栏含「元数据」与 4 模式 chip；改后 19 项全部不在 UI，等价入口逐条可用（`Ctrl+1/2/B/I/Shift+X/E`、`F8`、`Ctrl+/`、`Ctrl+Shift+P`、菜单导出组/视图 radio/帮助组、字数面板「元数据」、字数入口「· 选区 M 字」）。
- 计数复核：改后 1440 宽常驻控件 **20**（顶栏 4 + 左栏 9 + 右栏 5（4 钮 + 拖宽把手）+ 状态栏 2），与文档 §3 一致。
- `npm run verify` 真实首载 321,273 < 321,950 ✓；`npm test` 0 fail；`keyboard-acceptance` 全绿后 `git checkout -- shots/round-05/`（同时还原 `shots/round-04/`、`shots/round-140/`，见 §回归）。截图 `shots/round-143/{b1-file-menu-1440,b2-drawer-1024}.png` 已复核为新 UI。

## 回归
`keyboard-acceptance` 52/52；`scripts/export-acceptance.mjs` **7/7**；`scripts/export-math-acceptance.mjs` **10/10**（导出都改走文件菜单）；`.tmp/e2e-r140-b.mjs` **38/38、0 pageerror**（对比全宽、`Ctrl+Z/S/K/F` 静默、Esc 回「文件 ▾」）。跑后已 `git checkout -- shots/round-04/ shots/round-05/ shots/round-140/`。

## 观察（不判 FAIL）
1. 文档/README 写「首卡上移 31 px」，实测 143→107 = **−36**：chrome 缩减 = 旧 `.rail-head` 高 **26** + `.rail-tabs` margin-top −6 = 32，其余来自 B1 删工具栏后正文上移（本夹具卡片按引文自然位置排，`flowBottom+12` 未绑定）。门槛 ≥20 成立。
2. `docs/design-language.md` §5 的 321,263 与最终实测 **321,273** 差 10 B，已由 tester 改成 321,273。

## UNVERIFIED
真 WebView2 宿主（宿主是否吞 `F8`）、真实中文 IME、macOS 宿主、真实 FSA；「31 px」的原始夹具不可复现（只记我方夹具 −36）。
