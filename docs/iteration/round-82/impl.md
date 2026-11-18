# 第 82 轮实现（executor）

startSha `dc89a5a`；真机门 ego CDP 54280（9222–9226 无监听），dev 5175。

## A1（B-121）宿主相对图先发裸路径请求 — DONE

改动：`assetResolve.ts` 加 `hostAssetMode` 与 `setHostAssetMode`/`isHostAssetMode`/`shouldWaitAssetPaint(src,docPath,hostMode)`；`assetImage.ts:50` 改用它；`App.tsx` 加 `markHostMode`（ref+模块标志同写）、`hostResolver`/`workspaceResolver` 两个 `useCallback([])`；`applyHostPayload` 在 `setMarkdown` 前装 hostResolver，`loadIntoEditor` 在 `setMarkdown` 前装 workspaceResolver；`hostUnavailable`/`keepDraft`/`performCommit` 改用 `markHostMode`；解析器 effect 复用两回调；`assetResolve.test.ts` +6 条。

证据：单测 15 条 0 fail（改前 9）；静态 `assetImage.ts` 的 `shouldWaitAssetPaint` 1 处、旧 `getAssetDocPath() !== ''` 0 处（HEAD 1，正向对照）；真机 `.tmp/e2e-r82-a1-host-asset.mjs` before 9/13 → after **13/13**：裸请求 **1→0**、`/__asset` **0→1**、img src→`/__asset?path=…`、`naturalWidth` **0→1**、`data-asset-missing` 0、反向工作区 `blob:` 1 且 `/__asset` 0、0 pageerror。

额外：改前宿主模式一次 `/__asset` 都不发（图不显示）——resolver 只装在 effect 里，晚于 NodeView 在 `setMarkdown` 里的同步创建；本轮一并覆盖。

## A2（B-109）初始焦点与 Tab 环 — DONE

改动：新 `src/lib/dialogFocus.ts`（`firstTabbableIndex`/`lastTabbableIndex`，跳过 −1）；`useDialogFocus.ts` 的 `tabbables()` 用它们定界再 filter，初始焦点 `tabbables()[0] ?? focusables()[0]`，Tab 环首末改 `tabbables()`；`SettingsDialog.tsx`/`radioGroup.ts`/inert/还原焦点未动；新 `dialogFocus.test.ts` 5 条；`package.json` test 加 1 行。

证据：`npm test` 46 文件 591 条 0 fail（改前 45/580）；静态 `tabIndex >= 0` 1 处（HEAD 0）、`tabIndex={` 与 `onKeyDown={onThemeKeyDown}` 各 1；真机 `.tmp/e2e-r82-a2-dialog-focus.mjs` before 7/9 → after **9/9**：①重开设置焦点「浅色」(checked=false, tab −1)→「深色」(checked=true, tab 0)，**35 ms**；②Shift+Tab「**BODY 离框**」→「保存」，再 Tab→选中 radio；③组内恰 1 个 tab 0 且随选中项，ArrowRight 焦点/checked/`data-theme` 同步；④Ctrl+P→`.quick-open-input`、Esc 关；0 pageerror。

备注：计划审查 R82-1 说「改前 Shift+Tab 也回绕到保存」，实测改前掉 BODY。

## A3（B-110）24×24 — DONE

改动：`styles.css` 的 `.toolbar-group > button`、`.stats-trigger` 各加 `min-width: 24px`；`.note-actions button` 未动。

证据：静态全文件 `min-width: 24px` **0→2**，`.note-actions button` 的 `min-height:24px` 仍 1 处；真机 `.tmp/e2e-r82-a3-targets.mjs` before 5/8 → after **8/8**：斜体 I **21.2×24→24×24**、空文档 `.stats-trigger` **21.77×24→24×24**、两档 11 枚工具栏钮全 ≥24、`scrollWidth-clientWidth` 0/0、工具栏仍 2 行；复用 `.tmp/e2e-r79-a3-note-actions.mjs r82` **7/7**（54/42/66×24、卡片不横溢、0 页面错误）。口径：22×24 只在「0 字」形态成立。

## 门禁与证据

`tsc --noEmit` 0 输出；`npm test` 46 文件 591 条 0 fail（`.tmp/r82-npm-test.log`）；`npm run verify` PASS，首屏 gzip **304,307 B**（余 5,693 B）；`roundtrip` 未跑（未改编辑器/序列化）。截图 2 张见 `shots/round-82/`。

## CHANGELOG 一行建议

`- 第 82 轮：宿主相对图不再先发裸请求、也不再解析不出（B-121）；设置打开时焦点落选中主题、Tab 环跳过 roving 的 −1 项（B-109）；工具栏最窄钮与字数触发钮补到 24×24（B-110）。`

## 新踩坑

1. `const URL = …` 遮蔽全局 `URL`：`new URL()` 抛错被空 catch 吞掉，请求计数恒 0（差点把改前 1 次误判成 0）。改用 `APP_URL`。
2. 判「改前发没发请求」先读真实资源时间线（`performance.getEntriesByType('resource')`）反查。
3. 宿主图问题看两处：resolver 何时装（只装在 effect 里就晚一拍）、src 何时写。
