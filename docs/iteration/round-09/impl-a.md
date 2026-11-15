# 第 09 轮 · 实施报告 A 组（builder）

日期：2026-11-16。范围：T1 → T2。基线 `875297e`（工作树含 B 组 T3/T4）。未 commit；未跑 `npm run build`；未改 `host/**` 源码。
边界：改了 `src/App.tsx`、`src/components/FileMenu.tsx`、`src/styles.css`，新建 `scripts/recent-acceptance.mjs`；未碰 `host/**`、CI、打包、README/AGENTS/CHANGELOG、`package.json`。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 最近打开：列表、键盘、三态、清除/撤销、保存后打开 | **PASS** | 脚本 57/57：无宿主整段不渲染（4 项、130 px）；8 条两行 + title 全名；ArrowDown×12 → 清除、Home/End/Esc 正常；960×500/1024×600 滚轮与 End 都能到「清除」；清除/撤销/失败三种反馈正确；脏文档「保存并切换」后发的 `open-recent` 是刚点的 `id/seq`，取消不发 |
| T2 失效条目保留 + 移除 + 错误码映射 | **PASS** | `FILE_GONE` toast 含「文件不存在」+「从列表移除」「重试」，列表行保留；`READONLY`/`ENCODING`/`TOO_LARGE` 文案各不相同；`STALE` 重新拉 `/__recent`、刷新期间该行 disabled、连点只发一次；移除失败与清除失败共用同一 `recentError` 映射 |
| 宿主真实段 | **PASS（有宿主侧缺口，见 D8）** | `.tmp/host-a`（CDP 9340、`SIDELIGHT_STATE_DIR` 隔离）：转发打开 `recent-b.md` 后菜单出现该条（两行、47 px），点击后重新打开同一文件，标题 `recent-b.md — Sidelight` |

## T1 最近打开

- **数据**：`window.chrome?.webview` 存在才算宿主；启动和每次开菜单都 `fetch('/__recent', {cache:'no-store'})`。响应三态：`disabled`（一行 `--ink-soft` 原因）、`volatile`（标题旁「临时目录，重启可能丢失」）、`ok`；请求失败/非 JSON → 「读不出来，重开应用再试。」；无宿主 → 整段不渲染。
- **菜单结构**：4 动作 → `role="separator"` → 标题「最近打开」→ 最多 8 条 `recent-item`（`recent-name` + `recent-dir` 两行，`title="name · dir"`）→ 分隔线 → 「清除最近记录」。标题与分隔线不是 `menuitem`；空态一行灰字；`disabled` 行只在 STALE 刷新期间出现。
- **键盘**：只在 `[role="menuitem"]:not([disabled])` 里循环，ArrowUp/Down、Home、End、Tab、Esc 都覆盖；End 会滚到「清除」。
- **样式**：`.file-menu { max-height: calc(100vh - 46px); overflow: hidden auto; overscroll-behavior: contain }`；`.recent-item` 纵向两行、`gap:1px`；名字/目录单行省略，目录用 `--text-xs` + `--ink-faint`。
- **保存后打开（H4）**：`requestSave(target, after?)`；脏文档点最近项 → `requestSave('switch', () => sendOpenRecent(item))`，这个 `after` 只挂到**新的** `pendingSwitch` 上，弹「保存并切换」；`performSwitch` 成功后才执行 after。取消/保存失败不执行。宿主文档先写回，`save-result ok` 之后才切换/打开（`hostSwitchPendingRef`）。
- **清除/撤销**：`recent-clear` 成功 → 关菜单、焦点回触发器、toast「已清除最近记录。」（6 s）+「撤销」`recent-restore`；失败 → error toast「清除失败：… 最近记录还在。」，列表不变、菜单不关。全部错误码走同一个 `recentError()`。
- **证据**：57/57（含 4 条宿主真实段与 2 条滚轮断言）。截图 `shots/round-09/t1-recent-menu.png`、`t1-recent-disabled.png`、`t1-recent-host.png`。

## T2 失效条目

- `recentError` 只映射既有码：`STALE`（最近记录已过期）、`FILE_GONE`（文件不存在或已移动）、`READONLY`（只能只读打开）、`ENCODING`（编码无法识别）、`TOO_LARGE`（超过 6 MB）、`BAD_REQUEST`（请求被拒绝）、`IO`（读取失败，可能是网络盘或权限问题）、`NO_STATE_DIR`（最近记录功能不可用）；未知码统一「打开失败，请重试」。
- 打开失败：保留行；error toast 带「从列表移除」（`recent-remove`，带原 `id/seq`）与「重试」（重发 `open-recent`）。
- `STALE`：`recentStaleId` 置为当前行 → 重新 `loadRecent()`；刷新期间该行 `disabled`，刷新后按新 `seq` 恢复可点；`recentOpeningRef` 让同一行在飞时忽略再次点击。
- 移除成功 → 重新拉列表使该行消失；失败 → 复用 `recentError`，行保留并提示。清除、移除、撤销、打开共用同一映射。
- 错误协议：`open-recent`/`recent-remove` 的 `id` 是**条目 id（字符串）**，按 `${type}:${id}` 匹配回包；`recent-clear`/`recent-restore` 用自增请求 id。每个请求 10 s 超时按 `IO` 处理。
- 证据：`FILE_GONE` 行保留 + 两按钮；`READONLY`/`ENCODING`/`TOO_LARGE` 三条文案不同；移除后该行消失；移除失败「只能只读打开」；STALE 刷新期间 disabled、连点只发一次、刷新后新目录可点。截图 `shots/round-09/t2-error-toast.png`。

## 门禁

```
npx tsc --noEmit                     → exit 0
npm test                             → 16 个文件、192 条断言、0 失败
npx vite build --outDir .tmp/build-a → exit 0
node scripts/recent-acceptance.mjs   → 57/57 PASS
node scripts/keyboard-acceptance.mjs → 28/28 PASS（菜单改动回归）
node scripts/acceptance.mjs          → dev 通过
```

宿主段：`host/build.ps1`（B 的 T3 产物）→ `.tmp/host-a`；CDP 9340、`SIDELIGHT_PORT=47861`、`SIDELIGHT_STATE_DIR=.tmp/host-a/state-r9` 隔离状态。

## 与计划的偏离 / 发现

- **D1（`after` 的挂法）**：计划写 `requestSave({goal:'switch', after})`；实现保留现有位置参数，签名 `requestSave(target, after?)`。`switch + after` 不直接保存，而是先建一个新的 `pendingSwitch` 弹「保存并切换」，点确认后才保存并执行 after——这样满足「先确认再保存」，也不会复用旧 `pendingSwitch`。
- **D2（清除项在 disabled 时仍渲染）**：宿主存在就渲染「清除最近记录」；disabled 状态下点击会走 `recentError(NO_STATE_DIR)` 的 error toast。计划只要求「原因行 + 菜单可用」，没有要求隐藏清除项。
- **D3（Toast 多动作）**：`Notice` 新增 `actions?: Array<{label,onClick}>`，与旧 `action` 并存；只有最近打开使用多动作。
- **D4（宿主真实段只验 forward 路径）**：B 的宿主当前版本**argv 打开不写 `recent.json`**（日志只有 `argv script added`，没有 `open applied source=argv`/`RecordOpen`），所以真实段用「第二实例转发」制造最近项；点击最近项成功重开已验。argv 记录缺失属宿主侧（T3 第 4 条要求 argv 成功也 `RecordOpen`），需 B/根代理修，A 不改 `host/**`。
- **D5（清除/撤销/移除只跑 mock）**：真实宿主的 `recent-clear/restore/remove` 回包没有在 A 脚本里做端到端（B 的 `recent-probe.mjs` 覆盖协议）；A 真实段只验列表 + open-recent。
- **D6（`STALE` 期间菜单可能被重复刷新）**：STALE 后 App 会刷新一次；如果用户同时再开菜单，`FileMenu` 的 `onRefreshRecent` 会再拉一次。脚本只断言「不重复发 open-recent」和该行 disabled，没有限制 `/__recent` 的请求次数。
- **D7（无宿主判定用 webview 存在性）**：浏览器里若注入假 `chrome.webview` 会走宿主分支；验收脚本正是用注入来测，产品环境无此对象。
- **D8（宿主 argv 记录缺口见 D4）**：这是本轮最重要的遗留，直接影响「双击/命令行打开的文件出现在最近列表」这条 Demo。

## 遗留

1. **宿主 argv 打开不记录最近项**（D4）：需 B 修 `RecordOpen` 调用点；A 的宿主真实段因此只覆盖 forward 路径。
2. 真实宿主的 clear/restore/remove 端到端未在 A 脚本跑，归 `recent-probe.mjs` 与根代理。
3. `STALE` 刷新可能触发两次 `/__recent` 请求（无功能影响，未做去重）。
4. 超长目录在 208 px 最小宽度下省略号显示正常，但未做 RTL/极窄 320 px 视口验证。
5. 浏览器无最近记录（本轮明确不做）；切到浏览器后 `recent` 状态仍保留旧宿主数据直到刷新，视图整段隐藏，无用户可见影响。
