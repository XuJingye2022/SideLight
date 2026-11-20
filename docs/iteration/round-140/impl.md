# 第 140 轮执行报告（executor）

轮前 `adb270d`；三条全部落地、回滚 0 条。报告目录 `docs/iteration/round-140/`。

## 逐任务状态

| 任务 | 状态 | 落点 |
| :--- | :--- | :--- |
| A1 右栏贴右缘 / 拖宽 280–520 / 折叠 / 窄窗抽屉 | DONE | `src/App.tsx`、`src/components/MarginRail.tsx`、`src/styles.css` |
| A2 「与打开时相比」→ 顶栏「对比」全宽模式、点行回正文 | DONE | `src/components/RailDiffPanel.tsx`（重写）、`src/App.tsx`、`src/components/MarginRail.tsx`、`src/lib/annotations.ts`、`src/styles.css`、5 个静态门 + 2 个单测文件 |
| A3 体积门 + 六图 + 收尾 | DONE | `scripts/measure-first-screen.mjs`、`AGENTS.md`、`README.md`、`docs/iteration/BRIEF.md`、`docs/CHANGELOG.md`、`docs/iteration/BACKLOG.md`、`shots/round-140/` |

## 改动摘要

- **A1**：`.doc-layout` 改 `grid-template-columns:minmax(0,1fr) var(--rail-width,320px)`、`padding:52px 0 220px 32px`；`.doc-column` `width:100%;max-width:36rem;margin:0 auto`。App 新 `railWidth`/`railCollapsed`、`.doc-layout` 内联 `--rail-width`；`MarginRail` 新 `.rail-resize`（`role=separator`、`tabIndex=0`、`aria-valuemin/max/now`、←/→ 16px、拖动期只写 CSS 变量、抬手 `onResize`）与 `.rail-collapse`；App 右缘 `.rail-reopen`，折叠/展开焦点用 `pendingRailFocusRef` 在 effect 消费。`.margin-rail` 加 `padding-right:12px`、`.note{right:12px}`；批注卡与 `tops` 都按 `from` 升序。点卡先 `editor.commands.focus()` 再选句（否则 DOM 选区不更新）。窄窗单列 + 抽屉路径未动；折叠只在 `@media(min-width:1120px)`。补：`.doc-layout.preview-layout{padding-right:32px}` 防预览列右移（plan-review P2-4）。
- **A2**：删 `MarginRail` 的对比链（`RailDiffPanel` lazy、`getDiff`、`diffOn`/`diffOpen`、`.rail-diff-open` 钮与两条 CSS）；`diffOpen` 搬 `App` + 顶栏按钮；`RailDiffPanel` 改 `#diff-view` 全宽 section（去 portal/useDialogFocus/document Esc，`maxRows:2000`，`li` 可跳行 `is-jump`）；`annotations.ts` 新 `stripLineMarkup`/`locateMarkdownLine`；App 新 `jumpToDiffRow`、`openDiff/closeDiff`、`diffActive`，`railModal` 谓词加 `#diff-view`、`.toolbar`/`.table-bar` `inert`、Esc 分支、`switchView`/`docInstance` 收面板、进出记/还 `scrollTop`。`railDiffA11y`（lazy 3→2、tabIndex 3→4、createPortal 反转）、`railModalGate`（谓词/在审面板/换篇断言）、`touchTargets`（共享块 `.rail-review-open,.rail-collapse`）、`chat.test.ts`（段尾锚点）、`diffView.test.ts` +2、`annotations.test.ts` +2 全部改读新接线、断言不放宽。**修正**：`.rail-diff-overlay` / `.rail-diff-sheet` 被「在审」面板复用，未删（先误删后恢复）。
- **A3**：调线 320,000 → **325,000**；实测门 **316,648** / 常驻 **4,473** / 真实首载 **321,121**（净增 **+1,315**，余 3,879）。文档同步 AGENTS §3/§4/§6、README（命令注释、体积段、下一步、现在能做什么两条）、BRIEF 红线 7、CHANGELOG Unreleased（标题区间改 29–140）、BACKLOG 两条（B-267/B-268，ID 待 lead 确认）。

## 命令结果

- `npx tsc --noEmit`：exit 0（无输出）。
- `npm run verify`：exit 0 **PASS**；`total=316648 resident=4473 real=321121`，`max=325000 headroom=3879`；`--target 310000` 超 11,121 只 WARN。
- `npm test`：**71 文件 979 条 0 fail**（轮前 975，+4：`diffView` 2、`annotations` 2）。
- `npm run roundtrip`：**未跑**（未改编辑器与序列化）。
- `.tmp/e2e-r140-a.mjs`：**36/36 PASS**、0 pageerror（`.tmp/r140-a.json`，1440×900 + 1024×700，假 FSA + mock 分析 3 卡）。
- `.tmp/e2e-r140-b.mjs`：**39/39 PASS**、0 pageerror（`.tmp/r140-b.json`，`autoSave:false`、2,400 行粘贴夹具）。

## 截图（用户点名的六张，超 common 的 2 张上限）

`shots/round-140/a-rail-right-1440.png`、`a-rail-drag-440.png`、`a-rail-collapsed.png`、`a-rail-1024-drawer.png`、`b-diff-1440.png`、`b-diff-long.png`。

## CHANGELOG 一行建议

「右栏贴窗口右缘（可拖宽 280–520 / 可折叠 / 窄窗仍抽屉）；「与打开时相比」改顶栏「对比」切换的全宽模式（2,000 行截断、点行回正文）；硬线按授权 320,000 → 325,000。」

## 新踩坑（3 条）

1. `.rail-diff-overlay`/`.rail-diff-sheet` 仍被「在审」面板复用：按「旧浮层没人用」删 CSS 会弄坏在审面板；判「类没人用」要在两块面板组件里 grep。
2. 折叠右栏会让 `main` 滚动条消失、`clientWidth` +10，正文列左移变 +179 而非 +174：断言「按轨道宽算的位移」前让夹具在两种状态都出滚动条。
3. ProseMirror 不在焦点时不同步 DOM 选区：只 `setTextSelection` 的「点卡跳句」有滚动、无可见选区；先 `focus()`。
