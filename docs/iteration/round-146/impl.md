# 第 146 轮（B 轮）impl（executor）

结论 **PASS**。A 轮（145）已在 `startSha=56b1601` 提交，本轮只做 B。

## 1 任务

- **B1 DONE**。`settings.ts`：`MIN/MAX_SIDEBAR_WIDTH=200/480`、`DEFAULT_SIDEBAR_WIDTH=218`、`clampSidebarWidth`、`Settings.sidebarWidth`（缺键→218，越界夹取，**不升版本**）。`App.tsx`：`.sidebar` 内联 `--sidebar-width`；右缘 `.sidebar-resize`（`role=separator`、aria 三值、10px 命中区）拖拽只改 style、抬手落盘，←/→ ±16 立即落盘；收起 44 不渲染把手。`styles.css`：`.sidebar{position:relative;width:var(--sidebar-width,218px)}`；左右把手常显 2px×28px 圆角竖条；≤1119px 两者 `display:none`。
- **B2 DONE**。新 `lib/autoRefresh.ts`：`POLL_INTERVAL_MS=2500`、`MIN_GAP_MS=800`、`OBSERVER_DEBOUNCE_MS=300`、`treeSignature`、`shouldAutoRefresh`、`observerCtor`。`refreshTree` 加 `mode:'background'`：不取消自动保存、不置 `treeRefreshing`、不提示、不动 `activeFile`/`saveTarget`、失败静默、签名未变跳过 `setWorkspace`。effect 依赖 `workspace?.rootHandle`：有 `FileSystemObserver` 则递归 observe（300 ms 合并），否则 2.5 s 轮询（仅 visible）；`focus`/`visibilitychange` 立即补一次（共享节流）。
- **B3 DONE**。`.tmp/e2e-r146-b.mjs` **31/31 PASS、0 pageerror**（`.tmp/r146-e2e.log`）。S1：218→拖 +102→320±2→`localStorage=320`→reload 仍 320→拖 1000/0→480/200→← 键 304 且 aria 同步→收起 44/把手 0。S2：`::before` 2px×28px、背景非透明、焦点有 2px outline；1024×700 两把手 `display:none`。S3：加 `sub/new.md`+删 observer+派发 focus→**7 ms** 出现、sub 仍展开、无「已刷新」；正文/activeElement/脏标记不变、`sl-parse-done` 3→3、`read:` 3→3。S4 外部删 b.md：行消失、当前 a.md 不变、无 toast。S5 0 写盘。

## 2 文件

`src/lib/settings.ts`、`settings.test.ts`（+4）、`src/lib/autoRefresh.ts`（新）、`autoRefresh.test.ts`（新 6）、`src/App.tsx`、`src/styles.css`、`package.json`（73→74 文件）。未动编辑器/序列化→`roundtrip` 不跑。

## 3 门禁

- `npx tsc --noEmit` exit 0；`npm test` **74 文件 1028 条 0 fail**。
- `npm run verify` exit 0 **PASS**：门 **319,489 B** / 常驻 **4,486 B** / 真实首载 **323,975 B**，`headroom=none`（只记录；145 轮 318,454/4,484/322,938）。
- 截图：`shots/round-146/sidebar-drag.png`、`shots/round-146/auto-refresh.png`。

## 4 计划外最小改动（计划漏洞绕过）

1. **窄窗侧栏封顶**：计划没写窄窗宽度。480 会吃掉窄窗大半屏，在既有 `@media(max-width:1119px)` 加 `.sidebar{width:min(var(--sidebar-width,218px),40vw)}`（收起态 44）。
2. **自动保存别被后台刷新吞掉**：`runAutoSave` 原遇 `refreshingRef.current` 直接 return；后台每 2.5 s 刷新会静默丢一次停笔保存。改为先 `scheduleAutoSaveRef.current()` 再 return。概率低（UNVERIFIED）。

## 5 CHANGELOG 建议

左栏可拖宽（200–480px 并记住）；左右拖宽把手常显；打开文件夹后外部增删文件自动进树，不打断当前文档。

## 6 环境偏差

- 开工时 5175 无监听：后台任务起 `npx vite --port 5175 --strictPort`（未重启既有服务）。
- 57270 无监听：ego 端口取 `%LOCALAPPDATA%\ego-lite-linux\profile\DevToolsActivePort` = **60843**，E2E 用 `SIDELIGHT_CDP` 指它。

## 7 新踩坑

1. Playwright 的 Chromium 有 `window.FileSystemObserver`：合成句柄 observe 会抛错退回轮询；要确定性测轮询+focus，得在**打开文件夹前** `delete` 它。
2. `FileTree` 目录行 `textContent` 带折叠字形（`▸ sub`）：按 `=== 'sub'` 找行 0 命中，断言前剥掉 `[▸▾]`。
3. `refreshingRef` 是自动保存的隐形闸：新增刷新入口要查 `runAutoSave` 早退是否需重排队。

## 8 UNVERIFIED

真 WebView2/macOS 宿主、真实 `FileSystemObserver` 回调、真实 FSA、真实中文 IME、后台刷新撞停笔保存的竞态。B-267、B-268、B-273 未动。
