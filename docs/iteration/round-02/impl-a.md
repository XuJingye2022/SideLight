# 第 02 轮 · 实施报告 A 组（builder，T3）

日期：2026-11-15。范围：T3 的 U1 → U3 → U2（首次使用可信：模拟标注 + 对比度 + 对话框焦点）。
基线：round-01 已 commit（`cb36110`）。未 commit；未跑 `npm run build`（类型检查 `npx tsc --noEmit`，产物 `npx vite build --outDir .tmp/build-a`）；未装依赖。
文件边界：只改 `src/App.tsx`、`src/components/MarginRail.tsx`、`SettingsDialog.tsx`、`SaveDialog.tsx`、`src/styles.css`，新建 `src/components/useDialogFocus.ts`；`host/`、`README`、`package.json`、`scripts/` 一律未碰。

| 项 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| U1 模拟批注标注 | **PASS** | `.rail-notice-mock` 文案含「本地模拟批注」、`.note-kind-mock` = 3、按钮「分析本段（模拟）」、设置显示「未配置」；截图 `t3-u1.png` |
| U3 对比度与字号 | **PASS** | `--ink-faint #666c72` / 暗色 `#9aa0a6`、`--mark #9a5b1c`；6 类小字全 12px；亮暗对比度全部 ≥4.5；`:focus-visible` 2px；截图 `t3-u3.png`、`t3-u3-dark.png` |
| U2 对话框焦点 | **PASS** | 三个对话框 `aria-modal="true"` + `aria-labelledby` 指向存在的 `h2`、打开即聚焦框内、12 次 Tab 全在框内、背景 `inert`、Esc 后焦点回「设置」且 `inert` 移除；截图 `t3-u2.png`（另有 switch/save 两张） |

---

## U1 没配 API Key 时明写「模拟」

### 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/App.tsx` | `const simulated = !hasKey(settings)`（`hasKey` 原本是死函数，现在真正被用上）；顶栏按钮写「分析本段（模拟）/分析选中（模拟）」并加 `title="未配置 API Key：从本地生成模拟批注"`；给 `MarginRail` 传 `simulated` |
| `src/components/MarginRail.tsx` | 新增 `simulated` prop；`.rail-empty` 之前渲染 `<p className="rail-notice-mock">未配置 API Key，下面是本地模拟批注，不调用模型</p>`；卡头在 `note-kind` 之后加 `<span className="note-kind note-kind-mock">模拟</span>` |
| `src/components/SettingsDialog.tsx` | API Key 为空时显示 `<span className="field-hint">未配置：分析会用本地模拟批注</span>` |
| `src/styles.css` | `.rail-notice-mock`（左边框 2px `--line-strong`、`--ink` 字、12px）与 `.note-kind-mock`（`--line-strong` 底、`--ink` 字）、`.field-hint`（12px、`--ink-soft`） |

### 证据（CDP 探针 `.tmp/r2-u1u3.mjs`）

```
U1 analyze button: 分析本段（模拟） | title: 未配置 API Key：从本地生成模拟批注
U1 rail notice: 未配置 API Key，下面是本地模拟批注，不调用模型
U1 mock badge count: 3
U1 badge style: {"color":"rgb(29, 32, 35)","background":"rgb(213, 205, 189)","text":"模拟"}
U1 settings hint: 未配置：分析会用本地模拟批注
```

`rgb(29, 32, 35)` = `#1d2023`（`--ink`），底 `rgb(213, 205, 189)` = `#d5cdbd`（`--line-strong`，非透明）。
截图：`shots/round-02/t3-u1.png`（3 条批注都带「模拟」胶囊）、`shots/round-02/t3-u1-settings.png`（设置里「未配置」）。

## U3 对比度与字号

### 改动（全部在 `src/styles.css`）

- `--ink-faint: #666c72`（暗色 `#9aa0a6`）；`--mark: #9a5b1c`。
- 字号抬到 12px：`.note-head`（10.5→12）、`.note-actions button`（11.5→12）、`.dialog-note`（11.5→12）、`.status-bar`（11.5→12）、`.rail-goal-label`（10→12）、`.rail-goal-retry`（10.5→12）。
- 新增全局 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`。
- `.risk-banner` 正文 `color: var(--mark)` → `var(--ink)`。
- 顺带 C1：`.primary`（`--accent` 底、`--paper-raised` 字、hover `--accent-ink`）与 `.analyze-button`（`--accent-wash` 底、`--accent-ink` 字、600、hover 反色）。

### 证据（WCAG 2.x 相对亮度公式，取页面解析出的最终变量）

| 组合 | 对比度 | 目标 |
| :--- | ---: | ---: |
| 亮 `--ink-faint` / `--paper` | 4.83 | ≥4.5 |
| 亮 `--ink-faint` / `--paper-raised` | 5.23 | ≥4.5 |
| 亮 `--ink-faint` / `--mark-wash` | 4.55 | ≥4.5 |
| 亮 `--ink-faint` / 风险条混合底 | 4.59 | ≥4.5 |
| 亮 `--mark` / `--paper-raised` | 5.31 | ≥4.5 |
| 亮 `--mark` / `--mark-wash` | 4.63 | ≥4.5 |
| 白字 / `--mark`（采纳按钮） | 5.40 | ≥4.5 |
| 亮 `--ink` / 风险条混合底 | 14.13 | — |
| `--accent-ink` / `--accent-wash`（分析按钮） | 7.40 | ≥4.5 |
| `--paper-raised` / `--accent`（.primary 文字） | 5.95 | ≥4.5 |
| 暗 `--ink-faint` / `--paper` | 6.80 | ≥4.5 |
| 暗 `--ink-faint` / `--paper-raised` | 6.26 | ≥4.5 |
| 暗 `--mark` / `--mark-wash` | 6.67 | ≥4.5 |
| 暗 `--ink` / `--mark-wash` | 11.94 | ≥4.5 |

字号与焦点：

```
U3 font sizes: {"noteHead":"12px","statusBar":"12px","noteActions":"12px","railGoalLabel":"12px","railGoalRetry":"12px"}
U3 focus after Tab: {"tag":"BUTTON","text":"导出 ▾","outlineWidth":"2px","outlineStyle":"solid"}
```

截图：`shots/round-02/t3-u3.png`（亮色，键盘焦点 2px 描边）、`shots/round-02/t3-u3-dark.png`（`emulateMedia` 暗色复算后同一页）。

## U2 对话框接管焦点

### 改动

新建 `src/components/useDialogFocus.ts`（约 70 行），做五件事：

1. 打开时记录 `document.activeElement`（打开者）；
2. 把焦点送进框内第一个可聚焦元素（设置框落在「接口地址」输入框）；
3. `keydown` 捕获 Tab / Shift+Tab，在 `[role="dialog"]` 内首尾循环（焦点意外落到框外时也拉回）；
4. 关闭时把焦点还给打开者；
5. 打开期间给 overlay 的所有同级兄弟节点加 `inert`（`.toolbar`、`.workbench`、`.topbar`、状态栏等），关闭时移除。

接线：

| 文件 | 改动 |
| :--- | :--- |
| `SettingsDialog.tsx` | `useDialogFocus(open, dialogRef)`；`role="dialog"` 加 `aria-modal="true"`、`aria-labelledby="settings-title"`，`h2` 加 `id="settings-title"` |
| `SaveDialog.tsx` | 同上，`aria-labelledby="save-title"`，`h2 id="save-title"` |
| `App.tsx` | 新增 `switchDialogRef` 与 `useDialogFocus(pendingSwitch !== null, switchDialogRef)`；切换文档框加 `aria-modal`/`aria-labelledby="switch-title"`，`h2` 加 id（`aria-label="切换文档"` 保留，见偏离 D3） |

### 证据（CDP 探针 `.tmp/r2-u2.mjs`）

```
settings opened: {"ariaModal":"true","labelledby":"settings-title","labelledbyExists":true,"labelledbyText":"设置","activeInside":true,"activeTag":"INPUT","toolbarInert":true,"workbenchInert":true,"topbarInert":true}
12 Tabs all inside: true ["sk-...","deepseek-chat","INPUT","不启用Tavily博","你是 Sidelig","恢复默认提示词","取消","保存","https://api.deepseek.com/v1","sk-...","deepseek-chat","INPUT"]
settings closed: {"dialogCount":0,"activeText":"设置","toolbarInert":false,"workbenchInert":false}
switch dialog: {"ariaModal":"true","labelledby":"switch-title","labelledbyExists":true,"labelledbyText":"这篇还有没保存的改动","activeInside":true,"activeTag":"BUTTON","toolbarInert":true,"workbenchInert":true}
switch closed: {"present":false}
save dialog: {"ariaModal":"true","labelledby":"save-title","labelledbyExists":true,"labelledbyText":"保存后文件会有这些差异","activeInside":true,"activeTag":"BUTTON","toolbarInert":true,"workbenchInert":true}
save closed: {"present":false}
page errors: none
```

截图：`shots/round-02/t3-u2.png`（设置框，焦点在接口地址、背景压暗且 `inert`）、`t3-u2-switch.png`、`t3-u2-save.png`。

---

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 15 个文件、165 条断言、0 失败（脚本未改）
npx vite build --outDir .tmp/build-a  → exit 0，113 个模块，产物合计 1,395,531 B（round-01 为 1,392,880 B，+2,651 B）
node scripts/acceptance.mjs http://localhost:5173 → 10/11 PASS
  唯一 FAIL：无控制台错误（chrome-extension://…offscreenTranslate.js，计划已声明本轮不判的环境噪声；功能项全 PASS）
```

补充回归（不是本轮门禁）：本轮 U2 的 `inert` 会让“对话框没关掉就点后台”真的被挡住——这条在 acceptance 里被真实验证过：`aria-label="切换文档"` 一度被我删掉，acceptance 认不出确认框、后台一直 `inert`、点「源码」超时。恢复 `aria-label` 后 acceptance 恢复 10/11（见 D3）。

## 与计划的偏离

- **D1（dev server 模块缓存，必读）**：本机 Vite dev server 存在模块缓存陈旧问题——改了 `MarginRail.tsx` 后页面仍渲染旧 DOM，直到重启 dev server 才生效（`AGENTS.md` 记过同类现象）。本轮重启过 3 次；**当前后台运行的 dev server（5173）已是最新代码**，复验前若发现界面是旧的，先重启它，不要改代码。
- **D2（dev server 监听 `host/bin`）**：老 dev server 日志出现 `page reload host/bin/www/index.html` 与 `EBUSY … host/bin/webview2-data/EBWebView/…`（B 组 T4/T3 在写 `host/bin` 时触发）。这是 `vite.config.ts` 的 `watch.ignored` 缺 `**/host/bin/**`，该文件不在本轮文件边界，未改；建议下一轮或根代理加一行，否则并行时页面会被外部写入整页刷新。
- **D3（`aria-label` 保留）**：计划写「把 `aria-label` 换成 `aria-labelledby`」。实际是**两者并存**：删掉 `aria-label="切换文档"` 会让 `scripts/acceptance.mjs` 的 `.dialog[aria-label="切换文档"]` 选择器失效（脚本不在本轮边界），验收当场 FAIL；`aria-labelledby` 优先生效，`aria-label` 只作兼容钩子。若评审要求严格二选一，需要同时改 `scripts/acceptance.mjs`（越界，需根代理放行）。
- **D4（截图多于计划）**：计划只点名 `t3-u1.png`、`t3-u3.png`、`t3-u2.png`；另存 `t3-u1-settings.png`、`t3-u3-dark.png`、`t3-u2-switch.png`、`t3-u2-save.png` 作为三个对话框与暗色的证据。
- **D5（字号取值）**：findings 建议 `.rail-goal-label` 10→11、`.rail-goal-retry` 10.5→11；按计划「全部抬到 12px，不设 11px 例外」，两者都取 12px。
- **D6（C1 顺带项）**：按计划步骤 4 补了 `.primary` 与 `.analyze-button`；计划没写 hover，我加了 hover 反色（改的是本轮允许的 `src/styles.css`）。
- **D7（焦点归还的断言范围）**：只有设置框逐字断言了「Esc 后 `activeElement` = 打开它的按钮」；保存框与切换框走同一 hook、验证了关闭后 `role="dialog"` 消失且 `inert` 移除，未逐条断言 opener 文本。
- **D8（U1 额外落到设置框）**：计划说「设置里 Key 空时显示『未配置』」，实现为 `未配置：分析会用本地模拟批注`（多给了用途说明），断言用「未配置」子串。

## 文件清单

- 修改：`src/App.tsx`、`src/components/MarginRail.tsx`、`src/components/SettingsDialog.tsx`、`src/components/SaveDialog.tsx`、`src/styles.css`
- 新建：`src/components/useDialogFocus.ts`、`docs/iteration/round-02/impl-a.md`
- 截图：`shots/round-02/t3-u1.png`、`t3-u1-settings.png`、`t3-u3.png`、`t3-u3-dark.png`、`t3-u2.png`、`t3-u2-switch.png`、`t3-u2-save.png`
- 临时探针（`.tmp/`，不入库）：`r2-u1u3.mjs`、`r2-u2.mjs`、`r2-analyze.mjs`、`r2-fresh.mjs`、`r2-deep.mjs`、`r2-dom.mjs`、`r2-fetch.mjs`、`r2-src.mjs`、`r2-diag.mjs`
- 未 commit；未跑 `npm run build`；未装依赖

## 遗留

1. dev server 的模块缓存：复验前若有旧界面，重启 `npm run dev`（当前 5173 已在跑最新代码）。
2. `vite.config.ts` 加 `**/host/bin/**` 到 `watch.ignored`（不在本轮边界，见 D2）。
3. `scripts/acceptance.mjs` 的「无控制台错误」仍受本机 Edge 扩展噪声影响（`chrome-extension://nmhdhb…/offscreenTranslate.js`），本轮按计划不判；功能项 10/11 全 PASS。
