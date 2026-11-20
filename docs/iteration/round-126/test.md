# 第 126 轮独立验收（tester）

任务：A1 抽屉困焦点 + 窄窗模态语义（P1-1/P2-3）、A2 字数明细不落背板下 + 关闭钮标签 + 静态门（P1-2/P2-4）。未读 `impl.md`，只读 `round-126/plan.md`、`git diff`、`BACKLOG.md`。

## 环境与方法
- dev server `http://localhost:5175`（未另起、未重启）；ego 浏览器 CDP **57270**（9222–9226 按计划不探）。先 `node .tmp/reset.mjs 57270` + 清 localStorage/IndexedDB。
- 自写 E2E `.tmp/e2e-r126-tester-drawer.mjs`（1024×700）；结果 `.tmp/r126-tester-drawer.json`、日志 `.tmp/r126-tester-drawer.log`。

## 门禁
- `npm test`：**66 文件 929 条 0 fail**（`ℹ fail 0` 66/66；`.tmp/r126-tester-npm-test.log`）；新增 `src/lib/railDrawerGate.test.ts` 6 条在链尾、全过。
- `npm run verify -- --max 315900`：**exit 0 PASS**，raw 1,024,681 / gzip **315,792 B**（headroom 108；内部预算 310,000 超 5,792 只 WARN）。`dist` 常驻 `MarginRail-D9YTvQlc.js` raw 22,092 / gzip9 **7,847**；B-229 口径合计 **323,639**（超硬线 3,639，B-229 仍 `open`，只记）。
- `roundtrip` 不跑：本轮未动编辑器与序列化。
- P2-4 版本门：dev server 交付的 `/src/App.tsx` 含 `drawerOpen: railOpen && viewMode === "edit" && window.matchMedia("(max-width: 1119px)")`，`/src/components/MarginRail.tsx` 含 `onRailKeyDown` 2、`tabIndex: -1` 3、`aria-modal` 3。**偏差**：计划按原文断 `drawerOpen=`、`tabIndex={-1}` 在 Vite 转换后恒 0（esbuild 把 JSX 属性转成 `key: value`），本轮按转换后文本断，语义等价（`.tmp/r126-tester-versiongate2.log`）。

## A1 抽屉困焦点 + 模态语义（20/20 断言）
- 点 `.rail-toggle` → **41 ms** 后 `activeElement=.rail-close`（≤300）；`#margin-rail` `role=dialog`、`aria-modal=true`、`tabindex=-1`。
- 点 `.rail-title` → `activeElement=ASIDE#margin-rail`；`Tab`×3 全在栏内，**第 1 站 `.rail-close`**。
- 再 `Tab`×10 全部在栏内，0 次 `.stats-trigger` / `.skip-link`；10 个焦点站中心 `elementFromPoint` **0 次**命中 `.rail-backdrop`。
- 根上（aside）合成 `Shift+Tab`：`defaultPrevented=true`，焦点回**末站**（`.is-active` 批注页签）。
- `Esc`：抽屉关、焦点回 `.rail-toggle`、`role`/`aria-modal` 变 null、`[inert]` 0。
- 抽屉开着拉宽 1440：`role`/`aria-modal` null、computed `position=relative`、最多 15 次 Tab 内出现逃出（无陷阱）。
- 0 pageerror / 0 console error。

## A2 字数明细与关闭钮（E2E + 静态门）
- 批注页签 `.rail-close` 念「关闭批注」；点 `#rail-tab-chat` 后念「关闭对话」。
- 抽屉开着 `.stats-trigger.focus()` + `Enter`：`#stats-detail` **1**、`.rail-backdrop` **0**、`.app.rail-open` **0**、面板中心命中 `DL`（`closest('#stats-detail')` 非空）。再 `Esc`：面板 0、焦点回 `.stats-trigger`。
- 反向：先点 `.stats-trigger` 开面板（1）再点 `.rail-toggle` → 面板 **0**、`.rail-open` **1**、`role=dialog`、backdrop 1。
- 静态门 `node --experimental-strip-types src/lib/railDrawerGate.test.ts`：**6/6 exit 0**；负向把 `<aside>` 的 `aria-modal` 属性整段换成 `data-tester-drop` → **1 红 exit 1**（报文「aria-modal 必须跟 drawerOpen 走」），还原后 SHA256 `02D1F078…`（与备份逐字节同）→ **6/6 exit 0**（`.tmp/r126-tester-gate-{red,green}.log`）。方法修正：首次负向写成 `data-…-aria-modal` 前缀，`includes('aria-modal={drawerOpen')` 仍命中造成假绿，改整段去掉才红（不判产品问题）。
- 截图 `shots/round-126/drawer-focus-tester.png`。

## 回归
- `keyboard-acceptance`（5175、`SIDELIGHT_CDP=57270`）：**52/52 0 FAIL**；跑后 `git checkout -- shots/round-05/`，工作树 0 改动。
- `.tmp/e2e-r97-a1-status.mjs`：**44/44**；`.tmp/e2e-r100-diff.mjs`：**43/43**；均 exit 0，跑后已还原 `shots/round-97|100` 两张截图。

## 判定
**PASS**。计划验收项全过；偏差只有 P2-4 的文本断法（转换后 JSX）与负向写法修正，均有证据，不影响产品行为。

UNVERIFIED：真 WebView2 宿主、真实中文 IME / 屏幕阅读器、真实 FSA；原生打印。
