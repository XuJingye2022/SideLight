# 第 51 轮 Typora 对照发现（finder-typora）

- 环境：dev `http://localhost:5175`，CDP 9223；startSha `fb6fe9a`（HEAD `a523a58` 是流程提交，非产品改动）。
- 脚本：`.tmp/e2e-r51-typora-probe.mjs`、`.tmp/e2e-r51-typora-shots.mjs`；原始输出 `.tmp/r51-typora-out.json`。
- 截图（2 张）：`shots/round-51/typora-drop-md.png`、`shots/round-51/typora-export-menu.png`。
- 对照来源：`.tmp/typora-ref/resources/Docs/`、`.tmp/typora-ref/resources/locales/zh-Hans.lproj/Menu.json`（Typora 菜单键名）。

## 1 差距表核对（先说结论）

- 计数自洽：「已经有的（32）」32 行；「缺的（9）」1+3+1+1+1+2=9。没有过期计数。
- 「撤销重做：有快捷键，没有按钮」仍成立：页面 28 个按钮里没有撤销/重做。
- 过期 1 处：见第 4 条。

## 2 P1 视图：`Ctrl+Shift+=` / `Ctrl+Shift+-` 已经落在正文字号上

实测（字号读 localStorage `sidelight.settings.v1`）：

| 按键 | fontSize | 正文 computed |
| :--- | :--- | :--- |
| `Ctrl+=` | 18 | 18px |
| `Ctrl+-` | 17 | 17px |
| `Ctrl+Alt+0` | 17 | 17px |
| `Ctrl+Shift+=` | 18 | 18px |
| `Ctrl+Shift+-` | 17 | 17px |

代码：`src/App.tsx:3891` 用 `event.key === '=' || event.key === '+'` 判字号放大，Shift 组合没被排除；`src/App.tsx:3699` 又把同一组键列进按键白名单。快捷键对话框只写 `Ctrl+= / Ctrl+- / Ctrl+Alt+0`（`src/components/ShortcutsDialog.tsx:46`）。

影响：Typora 视图菜单有 Zoom In / Zoom Out / Zoom（`Menu.json`），差距表 `docs/typora-gap.md:56` 记的交互是 Ctrl+滚轮与比例重置。B-001 开工前先定键位归属，否则整页缩放与正文字号抢同一组键。

已入池：**B-011**。

## 3 P1 宿主：桌面版没有缩放与全屏钩子

- 搜 `host/`：`ZoomFactor|IsZoomControlEnabled|FullScreen|F11` → 0 命中。
- 搜 `src/`：`requestFullscreen|toggleFullScreen|zoomLevel` → 0 命中。
- 页面无「全屏」「缩放」字样（`hasFullScreenWord=false`、`hasZoomWord=false`）；按 F11 后 `document.fullscreenElement` 仍 null（CDP 下 F11 不触达窗口层，这条只作旁证）。

结论：B-001 / B-002 在桌面版落地必须动宿主。WebView2 自带的 Ctrl+滚轮缩放默认开着，会和页面缩放叠成两层；全屏要宿主接 `ContainsFullScreenElementChanged` 改窗口尺寸。

未验证：真 WebView2 会话里 Ctrl+滚轮的实际行为（本机没有宿主会话，只有 dev 页面）。

已入池：**B-012**。

## 4 P2 文档：差距表「导出」漏了格式差距

实测导出菜单只有四项：HTML / Markdown / 纯文本 / 打印 PDF（`shots/round-51/typora-export-menu.png`）。Typora 另有 Word / Epub / LaTeX / 图片（`Docs/Install and Use Pandoc.md`；`Menu.json` 有 Export Setting / Export and Overwrite with Previous）。

`docs/typora-gap.md:30` 把导出算进「已经有」，「缺的（9）」里没有导出格式一行，读者会以为导出已齐平。建议补一行 P2。

已入池：**B-111**。

## 5 复验但属既有条目（不重复计数）

- **B-003** 拖入 `.md`：合成 drop 后 `defaultPrevented=true`，提示「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」，窗口标题与正文都不变。仍只提示，不打开（`shots/round-51/typora-drop-md.png`）。
- **B-001 / B-002** 缺失本身：证据见第 2、3 条。

## 6 备注

并行侦察会同时改 `docs/iteration/BACKLOG.md`。本轮 B-011 / B-012 / B-111 已写入；首次写入时与 finder-ui 的 B-008/B-009 撞号，已改成 B-011 / B-012 / B-111。
