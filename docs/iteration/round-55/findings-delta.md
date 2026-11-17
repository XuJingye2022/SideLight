# 第 55 轮 delta 回归（finder-delta）

- 只读。范围 `b01a4e6..f686b63`：拖入打开、整页缩放；兼看保存/撤销/焦点/键盘。dev 5175 未重启；CDP 9226。
- 脚本 `.tmp/e2e-r55-delta-{a,b,c2,d}.mjs`、`.tmp/e2e-r55-probe-focus.mjs`；0 控制台错误、0 页面错误。
- **结论：无新回归（actionable 0）**，不写 BACKLOG。

## 读数

1. 缩放/键盘：`Ctrl+Shift+=` 两下 → `--page-zoom=1.2`、钮「缩放 120%」、横溢 0；130% 实测 `min-width:861.539px`、`app` 宽 1416=视口、横溢 0。130% 下正文可写、`Ctrl+Z` 回退（16→17→16）；`Ctrl+Shift+0` → 1、钮消失、提示「页面缩放 100%」。
2. 点状态栏缩放钮回 100：变量 1、stored 100、钮消失；activeElement 落 `BODY`，随后打字仍进正文（+1 字），撤销正常（既有回焦）。
3. 130% 下 `.stats-trigger` 与缩放钮不互吃：面板 `.stats-detail` 打开且焦点在内，右缘 489 ≤ 1416，横溢 0；`Esc` 关面板并聚焦 `.stats-trigger`（`src/App.tsx:3908-3911`），缩放仍 1.3。
4. 拖入（合成 `DataTransfer`，无句柄 → `fileFromDrop`）：脏文本拖 `.md` → 弹「切换文档」确认，名字/正文逐字不变、仍 dirty；点「取消」正文与 dirty 不变。干净页拖 `.md` → 名字 `拖入甲.md`、toast「已打开「拖入甲.md」」、dirty=false、可续写。png+md 多选 → 仅旧提示，名字正文不变、`location` 不变。

## 非本轮回归

- 无落点新文档 `Ctrl+S` 得「已取消保存。」（`src/App.tsx:3056-3061`）；第 51 轮「没有改动，未写入。」只对已有落点生效（`:3194`），非本轮回归。
- 表格/公式/Mermaid 不在 diff 内；130% 下行内公式 KaTeX 渲染 1 个、横溢 0，无连带。
- 拖入后 `Ctrl+Z`、`Ctrl+S` 走既有分支，不白屏。

## UNVERIFIED

- 真实拖放带 `getAsFileSystemHandle()` 句柄（写回原文件、拖文件夹出树）：合成事件造不出句柄。
- 宿主 WebView2 内 130%–200% 与真实拖放。
