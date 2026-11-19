# 第 89 轮实施（B-107 自定义快捷键）

## 状态：A1/A2/A3 全部 DONE

### A1 纯逻辑 + 单测（DONE）
- 新 `src/lib/keybindings.ts`：8 条命令、默认表、28 条保留键、`normalizeBinding`（规范形 `Ctrl+Alt+Shift+键`，拒空/裸键/缺键/多键/非法键名）、`bindingFromEvent`、`matchBinding`（修饰全等、⌘ 当 Ctrl）、`matchKeybinding`、`bindKey`（冲突单路：保留键 → 另一命令当前键）、`resolveKeybindings`（缺键/非法/未知 id/撞车逐条回默认）。
- 新 `src/lib/keybindings.test.ts` **26 条**，挂 `npm test` 链尾。
- `node --experimental-strip-types src/lib/keybindings.test.ts` → 26 pass / 0 fail。

### A2 持久化 + 设置 UI + 尺寸（DONE）
- `settings.ts` 加 `keybindings`（读时 `resolveKeybindings`，默认 `{...DEFAULT_KEYBINDINGS}`，版本仍 2）；`App.tsx` 的 `commitSettings` 再归一。`settings.test.ts` 14→**19 条**（缺键/非法/未知 id/撞车/`{save:'Ctrl+P'}`/落盘）。
- `SettingsDialog.tsx` 字号后加首条 `details.settings-group`「快捷键」：8 行 `.field.keybinding-row`，点键位进入录制（Esc 取消、Backspace 回默认、冲突结束录制并把理由写进 `role="status"`、「全部恢复默认」）；录制只由点击/Enter 进入（critic P2-9）。`:226` 协议说明移进「接口地址」hint 腾高度。`styles.css` 加 `.keybinding-row/.keybinding-key/.keybinding-status`。
- 静态：`keybindings` settings.ts 4 处、SettingsDialog 8 处（门槛 ≥4/≥3）。
- 溢出（`scrollHeight-clientHeight`，DOM 实测；改前用 `git stash` 到 HEAD 量，`.tmp/r89-a2-{before,after}.json`）：1440×900 0→0、1024×700 0→0、1000×620 **62→49 px**（≤64 达标，未缩间距、未改 B-150 目标）。

### A3 接线 + 真机 + 文档（DONE）
- `App.tsx`：`keybindingsRef` + `matchKeybinding` 先于硬分支、对话框吞 `productCombo||customId`、switch 分派 8 条、删 8 条硬分支留 `Ctrl+H`；`globalSearch` toast/导出 rAF 焦点按原逻辑。`FileMenu`「新建/查找」、查找条只读提示、`Ctrl+K/M` 提示改读当前键位（critic P2-8 三处全修，`ShortcutsDialog` 加「改过的以设置为准」）。
- E2E `.tmp/e2e-r89-a3-keybindings.mjs`（ego CDP 54280）**19/19**、0 pageerror / 0 console error：默认 8 键回归；改 `Ctrl+Alt+W` 后新键写 1/旧 `Ctrl+S` 0 写、reload 后同；设置开着 0 写且不关；Backspace 回默认后 `Ctrl+S` 写 1、`Ctrl+Alt+W` 0 写。JSON `.tmp/r89-a3-keybindings.json`。
- 截图：`shots/round-89/keybindings.png`、`shots/round-89/keybindings-settings.png`。
- 文档：docs-check **42/42、3/3、1/1/1、missRowSum 3**；`自定义快捷键 | 无` HEAD 1→0；`typora-gap:78`「1. 自定义主题。」；README:102 与 AGENTS:74 改 42/3、README:231 改路线图收口；B-107→fixed（open 1→0、证据行号 `:72`）；CHANGELOG 第 89 轮 + 标题 29–89。

## 门禁
- `npx tsc --noEmit` exit 0；`npm test` **54 文件 724 条 0 fail**（基线 53/693）；`npm run verify` PASS，gzip **309,074 B**（余 10,926/926）。roundtrip 未跑（未改编辑器/序列化）。

## CHANGELOG 一行
自定义快捷键落地（B-107）：8 条可改键 + 设置里录制/冲突拒/回默认 + 持久化，旧键停用，首屏 309,074 B、测试 54/724。

## 新踩坑（3 条）
1. 全局搜索的 DOM 是 `.global-search-dialog`，不是计划验收里写的 `.global-search`；按后者 `waitForSelector` 会假红。
2. 空白新文档 `.ProseMirror` 的 `innerText` 是 `'\n'`（转 `|` 后非空串），判「正文空」要去掉空白与占位符再比。
3. 冲突键位要结束录制，否则按钮仍显示「按下新键位…」，与「报冲突且仍 Ctrl+S」的验收口径不符；非法格式则留在录制态好让用户重按。

## UNVERIFIED
真 WebView2 宿主内的自定快捷键、真实中文 IME、macOS 快捷键未跑（浏览器 CDP 54280 已验）。CDP 9222–9226 仍无监听，沿用 54280 口径。
