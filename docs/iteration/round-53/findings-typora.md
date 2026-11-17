# 第 53 轮 Typora 对照发现（finder-typora）

- 环境：dev `http://localhost:5175`，CDP **9223**（先 `node .tmp/reset.mjs 9223`）；startSha `86ba2d1`。
- 脚本 `.tmp/e2e-r53-typora-{a,c,d}.mjs`；日志 `.tmp/r53-typora-{a,c,d}.log`、`.tmp/r53-gapcount.log`。
- 截图：`shots/round-53/typora-zoom-150.png`（整页 150%，侧栏一起放大）。
- 对照：`.tmp/typora-ref/resources/locales/zh-Hans.lproj/Menu.json`（View：`Zoom In` / `Zoom Out` / `Actual Size` / `Toggle Fullscreen`）。

## 0 差距表核对

`node .tmp/r53-gapcount.mjs` → 已有 **32** 行、缺 **9** 行（1+3+1+1+1+2），但「缺的 9」里有 2 行已实现（第 52 轮起），见第 1 条。

## 1 P2 文档：差距表 2 行 + 计数过期（可执行）

- `docs/typora-gap.md:56` 仍写「视图缩放｜整页缩放（侧栏与工具栏一起）**无**」；实测**已有**：`--page-zoom` 1 → 1.1 → 1.2 → 1.1 → 1（`Ctrl+Shift+=` / `-` / `0`），`--editor-size` 17px 不动；`Ctrl+滚轮` 同样生效并出「页面缩放 110%」；`pageZoom` 写进 `sidelight.settings.v1`，reload 后仍 1.1。代码 `src/App.tsx:1873-1906`、`:4027-4035`；快捷键表 `src/components/ShortcutsDialog.tsx:47-49`。
- `docs/typora-gap.md:57` 仍写「全屏｜无」；`F11` 已实现（`src/App.tsx:3899-3906`，宿主 `host/Program.cs`），快捷键表 `ShortcutsDialog.tsx:46`。
- 结论：两行应移入「已经有的」并写键位，表头 `:7` / `:44` 的计数 32/9 → **34/7**（已有表里也缺「整页缩放」单独一行）。
- 建议交给 scribe 本轮同步；`BACKLOG.md` 的 B-001 / B-002 已 `fixed`，状态与之自洽，只差差距表。

已入池：**B-112**。

## 2 P2 体验：键盘缩放全程静默，无入口也没有当前比例

- 实测同一条动作两种反馈：`Ctrl+Shift+=`、`Ctrl+Shift+-`、`Ctrl+Shift+0` 三次操作 toast 全为 `null`；`Ctrl+滚轮` 一次就出「页面缩放 110%」→「页面缩放 100%」（`.tmp/r53-typora-a.log`）。
- 设置面板没有整页缩放控件（面板文本 `hasZoom=false`，只有「正文字号（12–26）」）；页面也没有常驻比例显示。Typora 在 View 菜单给 `Zoom In / Zoom Out / Actual Size` 三项。
- 建议（最小实现）：键盘三条复用滚轮那条 toast（`show('页面缩放 N%')`），或在设置面板里加与字号并列的百分比输入。
- 影响：差距表 `:56` 按「Ctrl+滚轮 + 比例重置」记为补齐，但键盘主路径无确认，按「稳定性 > 功能」口径属可感知缺陷。

已入池：**B-113**。

## 3 P1（证据）全屏本轮不可验证：CDP 9223 是 headless

- `F11` 键确实到达页面（`window.__keys` 末尾 `F11`）、`navigator.userActivation.isActive=true`，但 `document.fullscreenElement` 恒 `null`、`dataset.fullscreen` 恒 `false`；在真实 `click` 手势里直调 `requestFullscreen()` **既不 resolve 也不 reject**（`.tmp/r53-typora-d.log` 的 `fs:null`）。
- 根因是环境不是产品：UA = `HeadlessChrome/157.0.0.0`，窗口 500×320 / 屏 800×600。
- 后果：第 52 轮「浏览器态 F11 → `true`/`HTML`」在本环境**不可复现**。全屏本轮记 **UNVERIFIED**，请 tester 只用真实宿主窗口或 headful 会话判 B-002；改差距表 `:57` 时不要写「已验证」。
- 同一限制会吃掉任何依赖窗口层的验收（全屏、窗口尺寸、缩放后视觉度量）；本轮判定只取 DOM 读数。

## 4 复验（不计入 actionable）

- **B-003** 拖入 `.md`：提示文案与第 51 轮逐字相同（「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」），仍只提示、不打开。
- 其余 7 行（高亮/上下标、文件列表侧栏、图片缩放、全局搜索、主题、自定义快捷键、TOC/emoji）与实测不冲突。

## 5 UNVERIFIED

- 全屏（见第 3 条）；真实宿主里的 `Ctrl+滚轮` 与 F11。
- `Ctrl+滚轮` 只用合成 `WheelEvent`；150% 下点字位置与 100% 一致（GGGG 两档落 32、LLLL 落 57），未测 50% 与触控板捏合。
