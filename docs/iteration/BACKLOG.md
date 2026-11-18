# 迭代发现池（BACKLOG）

规则：
- finder 只往这里加，先查重；重复条目改状态或补证据，不重复计数。
- 状态：`open` / `planned` / `fixed` / `verified` / `deferred`。
- P0/P1 必须修；P2 默认 `deferred`，不阻塞停止；带「路线图」的 P2 例外。
- 每条一行：ID、状态、区域、问题、证据（文件:行号或截图）、轮次。

## P0

| ID | 状态 | 区域 | 问题 | 证据 | 轮 |
| :--- | :--- | :--- | :--- | :--- | :--- |

## P1

| ID | 状态 | 区域 | 问题 | 证据 | 轮 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| B-001 | fixed | 视图 | 整页视图缩放（Ctrl+滚轮 + 重置；正文字号已有） | `docs/typora-gap.md:56` | 差距表 |
| B-002 | fixed | 视图 | 全屏 | `docs/typora-gap.md:57` | 差距表 |
| B-003 | fixed | 文件 | 拖入 `.md` / 文件夹直接打开（现在只提示，不打开） | `docs/typora-gap.md:64`；第 43 轮；第 54 轮 fixed：合成 drop 实测 `.md` 载入 + toast + URL 不变、脏文本弹「切换文档」且取消仍原篇、`.png` 只旧提示；`src/lib/workspace.ts:112-116`/`:248-286`、`src/App.tsx:2478-2521`/`:4164-4183`、`src/lib/workspace.test.ts`（7 条）；`docs/iteration/round-54/test.md` | 差距表 |
| B-004 | fixed | 宿主 | `/__asset`：WebView2 单文件打开时相对路径图片 | STATE 第 38 轮 | 38 |
| B-005 | fixed | 测试 | `scripts/data-safety-acceptance.mjs` 的 `.editor` 过期选择器 | STATE 待办 | 41 |
| B-006 | fixed | 保存 | F1 保存先整篇读回旧文件 / 无改动也写；F4 一次停笔写 4 份全文 | `docs/iteration/round-50/test.md` | 50 |
| B-007 | fixed | 表格 | 单元格里手打 `# ` / `> ` / `- ` 仍造块级节点，存盘丢结构 | `docs/iteration/round-48/test.md` | 48 |
| B-011 | fixed | 视图 | `Ctrl+Shift+=` / `Ctrl+Shift+-` 现在也改正文字号（实测 17→18→17），与 Typora 整页缩放键位重叠；快捷键对话框只写 `Ctrl+=` / `Ctrl+-` | `src/App.tsx:3891`（`event.key === '+'`）、`src/components/ShortcutsDialog.tsx:46`；`.tmp/r51-typora-out.json` | 51 |
| B-012 | fixed | 宿主 | 桌面宿主无缩放/全屏钩子：`host/` 无 `ZoomFactor`/`IsZoomControlEnabled`/`FullScreen`/`F11`（0 命中），WebView2 默认 Ctrl+滚轮原生缩放会与应用内缩成双轨，全屏需宿主接 `ContainsFullScreenElementChanged` | `host/`（grep 0 命中）；`src/` 无 `requestFullscreen`（0 命中） | 51 |
| B-008 | fixed | 可访问性 | 视图模式四钮（专注/打字机/源码/预览）无 `aria-pressed`，开关状态读屏不可见（同排格式钮有） | `src/App.tsx:4956-4999`；`docs/iteration/round-51/findings-ui.md` F1 | 51 |
| B-013 | fixed | 性能 | 1 MB 文档载入按节点数爆炸：约 2.4 万顶层节点要 110.9 s（300 段同类文件 1.7 s），载入期主线程全忙且无提示 | `.tmp/r51-bug-log4.txt`（parse 109,661 ms）；`.tmp/r51-bug-log3.txt`（79,858 ms）；`docs/iteration/round-51/findings-bug.md` F1 | 51 |
| B-014 | fixed | 视图 | 整页缩放到 130% 起横向溢出：`#root` 布局宽缩成 1440/zoom，`.app` 的 `min-width:1120px` 不让，顶栏与工具栏右侧出屏、出现横向滚动条（130% 26 px / 150% 250 / 180% 586 / 200% 810） | `.tmp/r52-delta-zoom.log`；`shots/round-52/delta-zoom-200.png`；第 54 轮 fixed：`.app` 改 `min-width: calc(1120px / var(--page-zoom, 1))`，1440×900 实测四档 `scrollWidth-clientWidth` 0/0/0/0/0，末位控件 right ≤1440；`src/styles.css:129-136`；`docs/iteration/round-54/test.md` | 52/54 |
| B-112 | fixed | 文档 | 差距表 `docs/typora-gap.md:56-57` 仍把整页缩放/全屏记成缺（B-001/B-002 已 `fixed`），`32 项有 / 9 项缺` 的计数尚未复核 | `docs/iteration/round-53/findings-typora.md`；第 54 轮复算：已有表 32 行、缺表 9 行与表头自洽（真实应为 34/7）；`docs/iteration/round-54/findings-typora.md`；第 55 轮 fixed：`node .tmp/t55-docs-check.mjs` 实测表头 `（35）` = 35 行、`（7）` = 子节 1/1/1/1/1/2 共 7 行且每个 `（k）` 与本节行数相等；`README.md:45`、`AGENTS.md:72` 由 100–300% 改 50–200%；全屏行只写「`F11` 有入口，宿主内未验」；`docs/iteration/round-55/test.md` | 53/55 |
| B-117 | fixed | 文档 | 差距表 `docs/typora-gap.md:50` 一行并 5 个能力（`==` / `^` / `~` + TOC + emoji），B-101 与 B-106 同引此行；本轮只做前三条后该行既不能标「已有」也不能原样不动，需拆两行 | `docs/typora-gap.md:50`；`docs/iteration/round-54/findings-typora.md` §3；第 55 轮 fixed：原行拆成「已经有的」的 `==高亮==` / `^上标^` / `~下标~` 一行（35 项之一）与「缺的」的 `| TOC、emoji | 无 | P2 |` 一行，缺表子节计数 7 与表头自洽；`docs/iteration/round-55/test.md` | 54/55 |
| B-113 | fixed | 视图 | 键盘缩放（`Ctrl+=` / `Ctrl+-` / `Ctrl+滚轮`）全程静默：无当前比例显示、无重置确认，用户不知道缩放生效在哪一层 | `docs/iteration/round-53/findings-typora.md`；第 54 轮 fixed：状态栏 ≠100% 显示「缩放 N%」（点一下回 100%）、`Ctrl+Shift+=`/`-`/`0` 给「页面缩放 N%」toast；`src/components/StatusBar.tsx:86-96`、`src/App.tsx:1895`/`:4105-4117`；`docs/iteration/round-54/test.md` | 53/54 |
| B-115 | open | 性能 | 1 MB 文档切源码冻结：进源码 p50 9.9 s / 退 2.1 s；第 53 轮返修（源码态只 hidden 不卸载编辑器）压到进 1.1 s / 退 0.3 s，但「进 ≤300 ms、无 >500 ms long task」门槛未达，按规则回滚未 commit。1 MB 文本进 `<textarea>` 的原生排版本身 0.5–1.7 s（同一文本 `<pre>` 只 153 ms），要达标须换源码显示方式 | `docs/iteration/round-53/test.md`；`.tmp/r53-a1-before.json`、`.tmp/r53-a1-tester-v2.json` | 53 |
| B-116 | fixed | 性能 | 1 MB 逐键 p50 126 / p95 149 ms（第 53 轮 A 轮只测未修；门槛与改法待定）。第 56 轮 fixed：`onUpdate` 同步路径只置脏，与保存基线的全文比较挪进 300 ms 回调（`src/App.tsx:975-1001`），逐键不再序列化全文 | `.tmp/r56-a3-residual.json`（残值 100 KB p50 38 / p95 40、1 MB p50 148 / p95 248；两尺寸残值均 ≥ 原绝对门槛 20 / 60 ms，按计划只记新基线、不设绝对门槛）；同窗口 A/B 新基线 100 KB p50 38 / p95 39（对计划基线 66 −40.9%）、1 MB p50 147 / p95 154（对 252 −38.9%）；对同窗口改前 50 / 234 为 −22% / −34.2%，100 KB 的 p95 地板是 40 ms；`docs/iteration/round-56/test.md` | 53/56 |
| B-119 | fixed | 编辑 | 行内语法（默认关）开启后连续符号段与空格旁的 `~`/`^` 被当定界符，例如 `==== 与 ==不闭合` 开屏即显示成 `==`+「与」高亮+`不闭合`，`Ctrl+S` 写盘为 `== ==与== 不闭合`（字面 `==` 被吃掉）；关态 6/6 逐字节同、开态 6/6 全变。根因：`inlineSyntax.ts` 的 `whole` 无 CommonMark flanking 与「连续符号从第二半重试」规则；设置面板还写着「写回字节两种状态都一样」。第 56 轮 fixed：`whole` 加「开定界符后不贴空白 / 收定界符前不贴空白」+ `literalRun` 把 `===`/`^^` 连续段整段按字面吃（`~` 留给 `del`），设置提示改「成对且不贴空白才解析」 | `src/lib/inlineSyntax.ts:44-67`、`:107-119`、`src/components/SettingsDialog.tsx:119`；`.tmp/r56-a1-tests-red.log`（修前 5 红）、`.tmp/r56-a1-tests-green.log`（14/14）；tester 独立复现：HEAD 版代码 5 红、还原后绿（`.tmp/r56-tester-tests-red.log`）；开态 e2e 8 例 `Ctrl+S` 落盘逐字节同源、`a====b==c` 与 `== a ==` 无 `.sl-eq`（`.tmp/r56-tester-a1-e2e.json`）；`docs/iteration/round-56/test.md` | 56 |
| B-125 | fixed | 发布 | `release/Sidelight-0.32.1-win-x64-setup.exe` 824,595 B、FileVersion **0.31.1.0**（文件名写 0.32.1）；当前 `dist` 试包 1,312,312 B，差 487,717 B。预检对它只输出 `UNVERIFIED`、exit 0，不判 Fail，直接上传 release/ 现成包即发错版本。第 38/44/50/54/58 轮已报同一门缺失但一直未入池。第 60 轮 fixed：批次门改判 setup FileVersion 前三段 ≠ `package.json` 版本即 `Fail`，`-PreflightOnly` 按 FAIL 数非零退出；tester 实测 release 旧包（0.31.1.0）FAIL + exit 1（HEAD 版 UNVERIFIED + exit 0）、`-Setup host\bin\Sidelight.exe -PreflightOnly` PASS + exit 0 | `docs/iteration/round-60/findings-ship.md` F1；`packaging/verify-installer.ps1:52-84`；`docs/iteration/round-60/test.md` | 60 |
| B-118 | fixed | 外观 | 暖纸主题 12px 弱文字对比度不足 AA：`--ink-faint` `#7a6b54` 在纸底 4.27:1、在侧栏 `--panel` 底 4.04:1（浅色 4.83/4.67、深色 6.8）；命中状态栏「0 字」触发钮/缩放/自动保存 chips 与侧栏空状态说明；`themes.test.ts` 只测 ink/paper 漏掉这一对。改法：`--ink-faint` 改 `#6b5d48`（paper 5.27 / panel 4.99）+ 补两条断言 | `src/styles.css:77`、`:1739-1743`、`:581-599`、`:33`；`.tmp/r56-ui-d.log`；`shots/round-56/sepia-faint-text.png`；`docs/iteration/round-56/findings-ui.md` F1 | 56 |
| B-127 | fixed | 查找 | 全局搜索点中「当前文档」的命中会整篇重新读盘重解析：没有同篇短路，1 MB 文档点击一次 890 ms 才出查找条、3,407 ms 才稳定，`getFile` 再读 3 次，光标/滚动/撤销历史回到「刚打开」。第 60 轮 fixed：`openGlobalSearchHit` 在 `activeFile?.path === node.path` 时只回填查找条并显式聚焦 `.find-input`，不再 `openWorkspaceFile`；tester E2E（约 1 MB、滚到中段、查找条先关）查找条值=词、`sl-parse-done` / `getFile` 不增、`scrollTop` 差 0、dirty 保持、点回正文 `Ctrl+Z` 仍能撤销 | `src/App.tsx:2520-2544`；`.tmp/r60-finder-d.json`（clickToFindBar 890 / clickToSettled 3407、reads 7→10）；`.tmp/r60-finder-a.json`（小文档同样整篇重载）；`.tmp/e2e-r60-impl-a2-samedoc.mjs`、`.tmp/r60-impl-a2.json`；`docs/iteration/round-60/test.md` | 60 |
| B-128 | fixed | 查找 | 全局搜索 0 命中时漏报被跳过的文件：0 命中分支在拼装 `skipped`/`capped` 之前 `return`，于是「读不到 / 超过 1 MiB」的文件完全不说。2 个文件被跳过时搜只在其中的词 → 「没有匹配的文本」+「没有结果。」；同一状态有 1 处命中才显示「跳过 2 个…」。第 60 轮 fixed：`run()` 先拼 `parts` 再分支，0 命中同样带跳过/截断句；新增 `busyRef` 同步闸门挡同 tick 双 Enter。tester E2E：note「没有匹配的文本；跳过 2 个…」+ 空态「没有结果。」，双 Enter `getFile` 3（=文件数，上限 4） | `src/components/GlobalSearch.tsx:31-58`；`.tmp/r60-finder-e.json`；`.tmp/e2e-r60-impl-a1-search.mjs`、`.tmp/r60-impl-a1.json`；`docs/iteration/round-60/test.md` | 60 |
| B-123 | fixed | 编辑 | 智能标点先于输入规则，改坏链接目标与行内 HTML 属性里的直引号：敲 `[乙](https://example.com "标题")` 得 `“标题”`、敲 `<img src="assets/a.png" width="300">` 得 `src=”…”`；只有敲入路径坏，从文件加载的同一行保持直引号。第 58 轮 fixed：`smartTyping.ts` 加 `inLinkDestOrHtmlTag()`（锚定 `\]\([^)\n]*$` / `<\/?[A-Za-z][^>\n]*$`）在反引号守卫后整键放行，关闭括号的「越过」留在守卫前 | `src/lib/smartTyping.ts:47-56`、`:78-84`；单测 6 条 `.tmp/r58-a2-npm-test.log`（tester 复跑 39 文件 495 条；原记的 `.tmp/r58-a1-tests.log` 不存在，已改）；E2E `.tmp/e2e-r58-a1-typo.mjs`（编辑器与 localStorage 草稿都是直引号、无 U+201C/U+201D、草稿含 `"标题"` 与 `width="300"`）；`docs/iteration/round-58/findings-typora.md` F1 | 58 |

## P2（路线图，open）

| ID | 状态 | 区域 | 问题 | 证据 | 轮 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| B-101 | fixed | 编辑 | `==高亮==`、`^上标^`、`~下标~` 快捷语法 | `docs/typora-gap.md:43`；第 54 轮实测：三种语法全是纯文本、保存逐字节不变（`.tmp/r54-typora-{a,b}.log`）；Typora 三条都默认关（`.tmp/typora-ref/resources/Docs/Markdown Reference.md:362-372`）；第 55 轮 fixed：新增 `src/lib/inlineSyntax.ts`（三个专用 mark + marked 行内 tokenizer，开关只改解析不重建编辑器），`src/lib/tilde.ts` 一次 `use()` 注册、`loneTildeText` 仍吃裸 `~`；设置默认关（`settings.inlineSyntax` 旧存档读成 false）；e2e 实测关时四例逐字节同、开时 `==a==`→eqHighlight / `^b^`→sup / `~c~`→sub、`<mark>` 仍归 inlineMark、同会话切换不刷新再解析即生效；`src/lib/inlineSyntax.test.ts` 9 条；`docs/iteration/round-55/test.md` | 差距表/54/55 |
| B-102 | fixed | 视图 | 文件列表形态的侧栏：第 59 轮做「树 / 列表」两态（`aria-pressed`、会话内不落盘）；列表态按 `flattenFiles` 平铺、行内显示名字与相对路径（新增 `relativePath()`），1000×620 无横向滚动。已知限制：列表态无右键删除/重命名 | `src/components/FileTree.tsx:125,389,460`；`src/App.tsx:394-395,5456`；`src/lib/workspace.ts:366`；E2E `.tmp/e2e-r59-tester-b2b.mjs`（3 行含相对路径、点两次标题正文都变、切回树恢复、217/217 与 1000/1000 无横向）；`shots/round-59/file-list.png` | 59 |
| B-103 | open | 内容 | 图片缩放 | `docs/typora-gap.md:70` | 差距表 |
| B-104 | fixed | 查找 | 全局搜索：第 59 轮 `Ctrl+Shift+F` 工作区跨文件搜索（懒加载对话框、`useDialogFocus`），两层 `searchWorkspace` 纯函数 + `collectDocs` 逐个 try/catch；点结果打开文件并回填查找条，Esc 回焦点，无工作区提示「先打开文件夹」 | `src/lib/globalSearch.ts:74-148`；`src/components/GlobalSearch.tsx:20`；`src/App.tsx:2520,3970,4108`；单测 9 条（行列号/200 截断/1 MiB/大小写）；E2E `.tmp/e2e-r59-tester.mjs`（3 条路径行号、点第 2 条开 `a.md` 且查找条 1/1、Esc inert 7→0 焦点回正文、无工作区 toast）；`shots/round-59/global-search.png` | 59 |
| B-105 | fixed | 外观 | 主题体系（自定义主题） | `docs/typora-gap.md:83`；落点现成：`<html data-theme>` + `src/styles.css:1` 的 55 个 token、`:38` 深色块、`:68-69` 跟随系统媒体查询，写入 `src/components/SettingsDialog.tsx:62`；Typora 5 个主题就是纯 CSS 覆盖 `:root`（`.tmp/typora-ref/resources/style/themes/`）；第 55 轮 fixed（MVP）：新增 `src/lib/themes.ts` 清单（`BUILTIN_THEMES` 一套「暖纸」= `data-theme='sepia'` + 27 个变量）与 `src/styles.css:67-100` 对应块 + 跟随系统媒体查询排除 `sepia`；设置面板三档后追加清单按钮；e2e 实测 `data-theme='sepia'`、computed `--paper` = 清单 `#f4e8d2`、ink/paper 10.77:1、reload 仍 sepia、旧三档与取消还原不变；`src/lib/themes.test.ts` 4 条（清单=CSS 逐项、对比度、id 唯一、非法值回落）；`docs/iteration/round-55/test.md` | 差距表/54/55 |
| B-106 | open | 编辑 | TOC / emoji：第 58 轮 A2 落地 TOC MVP（`[TOC]` 段落前挂文档装饰、点击跳转、`\[TOC\]` 字节保真；emoji 未做，需惰性 chunk，余量不足） | `docs/typora-gap.md:50`；`src/lib/toc.ts`、`src/lib/tocRender.ts`、`src/lib/escapes.ts:26-52`；E2E `.tmp/e2e-r58-a2-toc.mjs`（3 条、点第 2 条落 H2、草稿 `^[TOC]$`、转义文档保存字节不变）；`shots/round-58/toc-editor.png`；`docs/iteration/round-58/impl.md` | 差距表/58 |
| B-107 | open | 外观 | 自定义快捷键 | `docs/typora-gap.md:83` | 差距表 |
| B-108 | fixed | 界面 | 设置面板 sticky 页脚切字（ui U5）；实测整框溢出 78px、页脚 y=823–859、框底 880，滚动内容缺底部内边距。第 54 轮复测：「切字/出框」不复现——1440×900 页脚 823–859 完整在框内（距框底 21px），1000×620 页脚 543–579 也可见，滚到底仍可见；真实残项只有 78px 溢出 + `.dialog` 无底部内边距，建议验收口径改为「页脚始终可见」 | `docs/iteration/round-50/test.md`；`docs/iteration/round-51/findings-ui.md` F4；`shots/round-51/ui-settings-clip-1440.png`；`docs/iteration/round-54/findings-bug.md` F2；`shots/round-54/settings-620.png`；`src/styles.css:1202-1211`、`1254-1263` | 50/54 |
| B-109 | open | 可访问性 | 设置主题 radiogroup 方向键无效、三项全进 Tab 序（非 roving tabindex）。第 54 轮复现：焦点「浅色」按 ArrowRight 焦点不动、`aria-checked` 不变、三项均无 `tabindex` | `docs/iteration/round-51/findings-ui.md` F2；`docs/iteration/round-54/findings-bug.md` F3；`src/components/SettingsDialog.tsx:43-68`；第 56 轮复现：现在 4 项（含「暖纸」）仍全无 `tabindex`，ArrowRight 后焦点与 `aria-checked` 均不动（`.tmp/r56-ui-d.log`） | 51/54/56 |
| B-110 | open | 界面 | 斜体 `I` 21×24、状态栏 `.stats-trigger` 22×24，小于 24×24（间距豁免可能成立） | `docs/iteration/round-51/findings-ui.md` F3 | 51 |
| B-120 | open | 保存 | 自动保存一次停笔写两份全文：先写 `.sidelight/drafts/big.md` 98,014 B（800 ms），再由自动保存写 `big.md` 98,015 B（2 s），中间 2 次整篇 `getFile`；保存成功后刚写的草稿又被删（白写）。1 MB 档 ≈ 2 MB 写 + 2 MB 读 / 停笔。第 56 轮报告 F2 未入池 | `.tmp/r58-finder-autosave.log`；`src/App.tsx:1022-1051`（800 ms）、`:3469-3485`、`:3534`、`:3561-3568`；`docs/iteration/round-56/findings-code.md` F2 | 58 |
| B-121 | open | 宿主 | 宿主单文件文档里相对图先按裸相对路径请求一次（宿主 origin 下 404），随后才换成 `/__asset?path=…`：`waitResolve` 只判 `getAssetDocPath() !== ''`，而宿主模式恒设 `''`，第 39 轮为工作区加的保护在宿主流派漏了。无数据风险，每张图多 1 次 404（宿主全局 `no-store`）；真宿主未渲染（本机 INIT-FAIL） | `src/lib/assetImage.ts:56`、`:62`、`:65-67`；`src/App.tsx:4549-4551`；`host/Program.cs:1504` | 58 |
| B-111 | open | 文档 | 差距表把导出算作「已有」（只列 HTML/Markdown/纯文本/打印），漏 Typora 的 Word/Epub/LaTeX/图片 四种格式差距，「缺的 9」里无对应行 | `docs/typora-gap.md:30`；`shots/round-51/typora-export-menu.png`（实测菜单 4 项）；`.tmp/typora-ref/resources/Docs/Install and Use Pandoc.md` | 51 |
| B-122 | open | 外观 | 暖纸主题（`data-theme='sepia'`）下 Mermaid 仍用浅色默认配色：节点填充 `rgb(236,236,255)`、描边 `rgb(147,112,219)`，与 light 逐值相同；深色已整表切 mermaid dark（`#1f2020` / `#cccccc`）。可读性达标（≥4.5:1），与米黄纸底观感不统一 | `shots/round-58/mermaid-sepia-1440.png`、`shots/round-58/mermaid-dark-1440.png`；`.tmp/r58-ui-e.json`；`docs/iteration/round-58/findings-ui.md` F1 | 58 |
| B-126 | open | 宿主 | `host\bin\www` 停在 58 轮：97 文件 3,864,607 B、入口 `index-C0MK7z5T.js`；`dist` 98 文件 3,875,989 B、入口 `index-CUjM8ce1.js`，www 缺 `GlobalSearch-B8onHlsE.js` 与列表态 chunk。直接跑 `host\bin\Sidelight.exe` 看到的是旧前端（安装包只读 `dist`，不受影响） | `docs/iteration/round-60/findings-ship.md` F2；`packaging/installer.nsi:140`、`portable.ps1:55` | 60 |

## Deferred（不阻塞停止）

| ID | 区域 | 问题 | 原因 | 轮 |
| :--- | :--- | :--- | :--- | :--- |
| B-201 | 平台 | 真实 macOS/Intel/签名/公证 | 无真机/secrets | 环境 |
| B-202 | 平台 | 真实 HKCU/开始菜单/SmartScreen | 需真人安装 | 环境 |
| B-203 | 显示 | 150%/200% 缩放屏 | 无对应屏 | 环境 |
| B-204 | 输入 | 真实中文输入法组合输入 | 无真 IME | 环境 |
| B-205 | 性能 | 1 MB 逐键 p95 | 未测 | 39 |
| B-206 | 导出 | Mermaid 图进 HTML 导出/预览面板 | 已知限制，候选 | 36 |
| B-207 | 编辑 | 多行 HTML 注释、带属性行内 HTML | 已知限制 | 40/47 |
| B-208 | 界面 | 重命名成功提示借刷新文案「已刷新：新增 1 个，消失 1 个」，无专用「已重命名」提示（第 58 轮复现：b.md→c.md 事务正确、之后保存写 c.md，toast 仍是刷新文案；`.tmp/r58-rename.json`） | P2 打磨（`src/App.tsx:2411`） | 51/58 |
| B-124 | 编辑 | 手打的行内链接没有输入规则，保存时方括号被序列化器转义：敲 `[乙](https://example.com "标题")` 后草稿是 `\[乙\](https://example.com "标题")`（引号已由 B-123 保住）。只丢 Markdown 语义、不丢字符；将来加链接输入规则或 markdown 往返修复时一起处理 | P2 打磨（无输入规则，会话内做不完；`.tmp/e2e-r58-a1-typo.mjs` 的 `linkDraft`） | 58 |
| B-209 | 测试 | 两条回归脚本断言过期：`scripts/keyboard-acceptance.mjs` 的 Ctrl+Shift+S 段把「旧 toast 仍在」当断言，第 51 轮新增「没有改动，未写入。」`ttl:1500` 后变 51/52；`scripts/bigfile-acceptance.mjs` 仍断文案含「文件太大」，HEAD 早已改成「「x」超过 5.5 MiB，仍在「y」」→ 2/3 | 非本轮引入（HEAD 既存），脚本改断言即可（`.tmp/r52-regress-keyboard2.log`、`.tmp/r52-regress-bigfile.log`） | 52 |
| B-211 | 界面 | 「全部替换」静默：无 toast、无「替换了 N 处」，计数条直接变「无结果」；3 次实测 `toastAfter=null`（单条「替换」同样无提示）。写盘正确，仅缺反馈 | P2 打磨；`src/components/FindBar.tsx:131-133`、`src/App.tsx:1956-2050`（`replaceEvery` 无 `show()`）；`docs/iteration/round-54/findings-bug.md` P2-1 | 54 |
| B-212 | 界面 | 删除确认框「怎么恢复」与随后提示的「撤销」互相矛盾：干净分支写「要恢复，用文件管理器把 trash 里的文件移回原位」、完全不提应用内撤销；脏分支却写「撤销会一起搬回」，而成功 toast 确实带「撤销」。两分支应共用一句恢复说明 | `src/components/TreeActions.tsx:287-293`、`src/App.tsx:2762-2771`；`.tmp/r58-finder.json` `deleteDialog`、`.tmp/r58-delete.json` `afterDelete`/`dirtyDialog`；`docs/iteration/round-58/findings-bug.md` F1 | 58 |
