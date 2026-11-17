# 第 52 轮 delta 回归（finder-delta）

对象：第 51 轮 `823c1d4`（= startSha）的保存链 / 整页缩放+键位 / 视图钮 aria。dev 5175 + CDP 9226（先 `node .tmp/reset.mjs 9226`）。脚本 `.tmp/e2e-r52-delta.mjs`、`.tmp/e2e-r52-delta-zoom.mjs`；日志 `.tmp/r52-delta.log`、`.tmp/r52-delta-zoom.log`；console 0 错。

## 通过

1. 保存链：`small.md` 打「甲」Ctrl+S → `getFile 2 / text 0（不整篇读回）/ writable 1`，toast「已保存」；同一秒再按 → 四项全 0，「没有改动，未写入。」；`Ctrl+Z` 撤销后 `Ctrl+S` 仍写盘（writable 1），磁盘回 `# 乙…\n`。
2. 键盘/焦点：`Ctrl+Shift+=` ×2 → `--page-zoom` 1.1→1.2，`Ctrl+Shift+-` → 1.1；焦点仍在 `.ProseMirror`，正文与 `--editor-size` 不变；`Ctrl+=` 出 18px、`Ctrl+Shift+0` 复位、`Ctrl+Shift+P` 预览来回；50% 与 120% 无溢出。
3. 视图钮：初始四钮 `aria-pressed=false`，点「源码」→ 源码 true、余 false，退出回 false；Esc 焦点落状态栏字数入口（第 42 轮设计）。

## P1 B-014 整页缩放在 130% 起横向溢出（新回归）

- 1440×900 实测：docX = 130% 26 / 150% 250 / 180% 586 / 200% 810 px；`.app` 宽 = 1120×zoom。`#root` 布局宽缩成 1440/zoom，`.app` 的 `min-width:1120px`（`src/styles.css:132`）从 130% 起超过它 → 横向滚动，顶栏右侧与工具栏右侧出屏。截图 `shots/round-52/delta-zoom-200.png`。
- 原因：`#root{zoom;height:calc(100vh/zoom)}`（`src/styles.css:115-118`）只缩布局视口，没同步缩固定下限；第 51 轮验收只量到 120%。
- 建议：`.app{min-width:calc(1120px / var(--page-zoom,1))}`，或把 `MAX_PAGE_ZOOM` 收窄到 120%；130/200% 端点进回归脚本。
- 已记 `docs/iteration/BACKLOG.md` P1 B-014。

## UNVERIFIED

表格 / 公式 / Mermaid 交互面未跑（本轮 diff 不碰）；宿主 WebView2 内缩放；写盘期间身份变化的回滚分支。
