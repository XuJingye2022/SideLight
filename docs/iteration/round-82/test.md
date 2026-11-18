# 第 82 轮验收（tester 独立复验）

startSha `dc89a5a`；轮后 HEAD 见提交。CDP 9222–9226 无监听（`Test-NetConnection` 全 False）→ 按计划改用 ego-browser CDP **54280**（`/json/version` 有响应），真机页为 `http://localhost:5175`。未读 `impl.md`。

**判定：PASS**（3 个任务全部达标，无回归）。

## 门禁

- `npm test` **46 文件 591 条 0 fail**（`.tmp/r82-tester-npm-test.log`；新增 `dialogFocus.test.ts` 5 条）。
- `npm run verify` **PASS**，首屏 gzip **304,307 B**（硬线 320,000 / 内部 310,000，距内部线 5,693 B）——`.tmp/r82-tester-verify.log`。
- `roundtrip` 未跑：本轮只改图片 NodeView 的 DOM `src` 选择、对话框焦点 hook、CSS，未动编辑器 schema 与序列化。

## A1（B-121）宿主相对图不再先发裸路径

- 单测 `assetResolve.test.ts` **15/15**（新增 6 条 `shouldWaitAssetPaint`/模式开关，0 fail，直跑 exit 0）。
- 静态：`src/lib/assetImage.ts` 的 `shouldWaitAssetPaint` **1** 处；`getAssetDocPath() !==` **0**（HEAD 同模式 **1**，正向对照）。
- 真机（`.tmp/e2e-r82-a1-host-asset.mjs tester` → `.tmp/r82-a1-host-asset-tester.json`）**13/13**：stub `/__doc`+`/__asset` 后裸 `/assets/a.png` 请求 **0**（改前 `.tmp/r82-a1-host-asset-before.json` 为 1）、`/__asset` **1**、`img[src]`=`/__asset?path=assets%2Fa.png`、`data-asset-missing` 0、`naturalWidth` 1、0 pageerror；反向工作区相对图 `blob:` **1**、裸请求 **0**、`/__asset` **0**（宿主 resolver 未泄漏）。

## A2（B-109）单选组初始焦点与 Tab 环

- 单测 `dialogFocus.test.ts` **5/5**；`npm test` 46 文件 0 fail（上）。
- 静态：`useDialogFocus.ts` 的 `tabIndex >= 0` **1** 处（HEAD **0**）；`SettingsDialog.tsx` 的 `tabIndex={` **1**、`onKeyDown={onThemeKeyDown}` **1**（未被改坏）。
- 真机交付脚本（`.tmp/e2e-r82-a2-dialog-focus.mjs tester` → `.tmp/r82-a2-dialog-focus-tester.json`）**9/9**：重开设置 **32 ms** 落 `aria-checked` radio、组内恰 1 个 `tabIndex=0` 且在选中项、Shift+Tab 落「保存」、保存 Tab 环回选中 radio、ArrowRight 同步、Ctrl+P 与 Esc 正常。
- 我自写脚本独立复验（`.tmp/e2e-r82-tester-indep.mjs` → `.tmp/r82-tester-indep.json`，**换选第 4 项「暖纸」**，与交付脚本不同路径）：首开焦点=「跟随系统」（`tabIndex=0`，1 ms）；选暖纸后组内 `[-1,-1,-1,0]`；保存再重开 **0 ms** 焦点=暖纸；Shift+Tab→「保存」；「保存」Tab→暖纸；ArrowLeft 焦点与 `aria-checked` 同步；0 pageerror。改前对照（`.tmp/r82-a2-dialog-focus-before.json`）：重开焦点=「浅色」`tabIndex=−1`、Shift+Tab 落 **BODY**（逃出对话框）。
- 我的脚本另有一条 FAIL 属**我断言写错**（把 `Ctrl+/` 当快捷键一览，实际是 Typora 源码模式键位，见 `src/App.tsx:4243`；一览是 `?`，`:4353`），已在 `.tmp/e2e-r82-tester-reg.mjs` 更正，不记产品失败。

## A3（B-110）补齐 24×24

- 静态：`min-width: 24px` 全文件 **0→2**（`src/styles.css:1616` 工具栏直系按钮、`:1949` `.stats-trigger`）；`.note-actions button` 的 `min-height: 24px` 仍 **1**（`:1391`）。
- 真机（`.tmp/e2e-r82-a3-targets.mjs tester` → `.tmp/r82-a3-targets-tester.json`）**8/8**，我另跑一版独立测量（同上 indep JSON）：1440×900 空文档 `.toolbar-group > button` 11 枚最小 **24×24**（改前斜体 **21.2×24**）、`.stats-trigger` **24×24**（改前 **21.77×24**）；1000×620 同样 11 枚 ≥24×24、`scrollWidth-clientWidth` **0**。
- 复用 `.tmp/e2e-r79-a3-note-actions.mjs`（tag `r82tester` → `.tmp/r79-a3-note-actions-r82tester.json`）**7/7**：3 枚动作钮 54×24 / 42×24 / 66×24、宽度不变、卡片无横溢。
- 截图：`shots/round-82/settings-focus.png`、`shots/round-82/toolbar-1000x620.png`（2 张）。

## 回归（`useDialogFocus` 被多处共用）

`.tmp/e2e-r82-tester-reg.mjs` → `.tmp/r82-tester-reg.json` **6/6**：Esc 关设置焦点回「设置」打开者；`?` 开快捷键一览且焦点在框内（「知道了」）；Esc 关后回斜体钮；`Ctrl+/` 进源码态焦点进 `textarea.source-editor`、再按切回富文本且焦点回 `.ProseMirror`；0 pageerror。快速打开（Ctrl+P 焦点 + Esc 关闭）在上节 indep 脚本内亦通过。

## UNVERIFIED

- 真宿主 WebView2 窗口内 `/__asset` 相对图渲染（本机 `INIT-FAIL` 既有，本轮只用 stub 端点验请求序）。
- 真实 FSA 目录（用假 FSA 夹具）、真实中文 IME、原生打印/另存 PDF。
- A2/A3 的 console 里 4 条 `Failed to load resource: 404` 经 `response` 记录确认为 `/__doc` stub 的 404（net404 4×`/__doc`），非 pageerror。

## 收尾

CHANGELOG 加第 82 轮条目；STATE 加轮次行；BACKLOG B-121 / B-110 标 `fixed`、B-109 补第 82 轮证据（维持 `fixed`）。
