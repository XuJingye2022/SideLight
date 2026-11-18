# 第 82 轮计划（单轮 A，3 个任务）

startSha `dc89a5a`。dev 5175；CDP 9222–9226，不可用改 ego CDP 54280（r77/r79 脚本用它），再不行留单测/构建/静态记 UNVERIFIED，不重试。日志 `.tmp/r82-*`、报告与截图放 round-82 目录。不 push、不改 `release/`、不加依赖、版本 0.32.1。

## 预检：批面 3 条在 startSha 的实况

- **B-121 仍 open**：`src/lib/assetImage.ts:56` 只判 `getAssetDocPath() !== ''`；宿主模式该值恒 `''`（`src/App.tsx:1254`、`:2375`）→ 每张相对图先发一次裸路径请求，宿主下 404。
- **B-109 已修**（`00e47da`）：`SettingsDialog.tsx:51-58` 有 `onKeyDown`、`:76-90` 有 roving `tabIndex`、`radioGroup.ts` 在位；批面证据与 startSha 不符。真缺口在焦点：`useDialogFocus.ts:34-35` 取 `focusables()[0]`，命中 `tabIndex=-1` 的首个 radio；`:48-63` 的 Tab 环把 −1 项算作边界 → 打开设置落在「浅色」、Shift+Tab 可从首个 Tab 站逃出对话框。
- **B-110 主诉已修**（`556e7ff`）：`styles.css:1388-1395` 已有 `min-height:24px`；BACKLOG 剩两项 open：斜体 `I` 21×24（间距 2 px，豁免不成立）、`.stats-trigger` 22×24。
- 结论：B-121 真修；B-109/B-110 只复核并收口真缺口。

## A1（B-121）宿主相对图不再先发裸路径请求

文件：`src/lib/assetResolve.ts`、`src/lib/assetImage.ts:56`、`src/App.tsx:1250-1265 / 2370-2400 / 4949-4981`、`src/lib/assetResolve.test.ts`

步骤：
1. `assetResolve.ts` 加 `setHostAssetMode`/`isHostAssetMode` 与纯函数 `shouldWaitAssetPaint(src, docPath, hostMode)`＝`isRelativeAsset(src) && (docPath !== '' || hostMode)`。
2. `assetImage.ts:56` 改用它。
3. App：host/workspace 两个 resolver 抽成 `useCallback`；`applyHostPayload` 在 `setMarkdown`（1265）前 `setAssetDocPath('')`+`setHostAssetMode(true)`+装 hostResolver；`loadIntoEditor` 在 `setMarkdown`（2400）前置 false+装 workspaceResolver（2375 注释即要求早于 setMarkdown）；`hostUnavailable`（1338）同步置 true；4949-4981 的 effect 保留并复用两函数。

验收：
- `node --experimental-strip-types src/lib/assetResolve.test.ts` 新增 6 条（工作区真 / 宿主空真 / 都空假 / `data:` `https:` 假 / 空串假 / 模式关后假），0 fail。
- 静态：`assetImage.ts` 含 `shouldWaitAssetPaint` 1 处；`getAssetDocPath() !== ''` 0 处（改前 1，正向对照）。
- 真机 `.tmp/e2e-r82-a1-host-asset.mjs`（ego/CDP）：stub `/__doc`（`{v:1,ok:true,text:'# H\n\n![a](assets/a.png)\n',fileName:'host.md',mtime:0}`）与 `/__asset?…`（1×1 PNG），清 localStorage 后断言：裸 `/assets/a.png` 请求 **0**（改前 1）、`/__asset` 1、`img[src^="/__asset"]` 1、`data-asset-missing` 0、`naturalWidth>0`、0 pageerror；反向工作区相对图裸请求 0、`blob:` 1；必要时同 stub `/__recent`、`/__annotations`。
- 浏览器不可用：单测 + 静态为证，其余 UNVERIFIED。

门禁：`npm test`、`npm run verify`（gzip ≤310,000 B）。roundtrip 不需要。
风险：resolver 提前安装与 cleanup 清缓存：宿主→工作区切换不得用旧 host resolver 解出 `/__asset`（E2E 双向覆盖）；不扩张到预览面板。

## A2（B-109）单选组已合规；补「初始焦点与 Tab 环」

文件：`src/components/useDialogFocus.ts`、`src/lib/dialogFocus.ts`（新）、`src/lib/dialogFocus.test.ts`（新）、`package.json`（test 加一行）

步骤：
1. 新纯函数 `firstTabbableIndex`/`lastTabbableIndex`：跳过 <0，无 ≥0 项返回 −1。
2. `useDialogFocus`：`tabbables = focusables().filter(el => el.tabIndex >= 0)`；初始焦点 `(tabbables()[0] ?? focusables()[0])`；Tab 环 first/last 改 `tabbables()`，空时退回 `focusables()`。
3. 不动 `SettingsDialog.tsx`、`radioGroup.ts`、inert 与还原焦点。

验收：
- `node --experimental-strip-types src/lib/dialogFocus.test.ts` 5 条（`[0,0]→0`、`[-1,0,-1]→1`、`[-1,-1]→-1`、`[]→-1`、last 同）；`npm test` 46 文件 0 fail。
- 静态：`useDialogFocus.ts` 的 `tabIndex >= 0` 1 处（改前 0）；`SettingsDialog.tsx` 的 `tabIndex={` 与 `onKeyDown={onThemeKeyDown}` 各 1。
- 真机 `.tmp/e2e-r82-a2-dialog-focus.mjs`：①设置→点「深色」→保存→重开，200 ms 内 activeElement=`[role=radio][aria-checked="true"]`（改前「浅色」，tabIndex −1）；②Shift+Tab→「保存」、再由「保存」Tab→回选中 radio（改前 Shift+Tab 离框）；③组内恰 1 个 tabIndex=0，ArrowRight 后焦点与 aria-checked 同步；④回归 Ctrl+P→`.quick-open-input`、Esc 关；0 pageerror。

门禁同 A1。roundtrip 不需要。
风险：hook 被多处对话框共用；只跳过 −1，全 −1 时退回原行为；不改 `aria-modal`/inert。

## A3（B-110）补齐 24×24；批注卡只复核

文件：`src/styles.css:1601-1617`、`:1933-1945`、`:1388-1395`（只核）、`.tmp/e2e-r79-a3-note-actions.mjs`（复用）

步骤：
1. `.toolbar-group > button` 加 `min-width: 24px`（只直接子按钮，`.menu button` 不动）。
2. `.stats-trigger` 加 `min-width: 24px`（保留 `min-height` 与 inline-flex）。
3. 批注卡规则与字号不改。

验收：
- 静态：`min-width: 24px` 全文件 0→2；`.note-actions button` 的 `min-height:24px` 仍 1 处。
- 真机 `.tmp/e2e-r82-a3-targets.mjs`：1440×900 与 1000×620 两档，`.toolbar-group > button` 每枚 ≥24×24（记最小项；改前斜体 21×24）、`.stats-trigger` 24×24（改前 22×24）、页面 `scrollWidth-clientWidth ≤ 0`；复用 r79 脚本量 3 枚 `.note-actions button` 高 ≥24、卡片不横溢；0 pageerror。
- 浏览器不可用：静态为证，尺寸记 UNVERIFIED。

门禁同 A1。
风险：窄按钮变宽，≤1119 px 工具栏本来就 `flex-wrap:wrap`，只多换行；状态栏左组加 2 px，验收覆盖横向滚动。

## 收口

每任务先取改前读数（同脚本 before/after），tester 独立复跑；UNVERIFIED 写原因。本轮只写 round-82 的 plan/impl/test 与 `.tmp/r82-*`；BACKLOG/README/CHANGELOG 批末由 scribe 统一。
