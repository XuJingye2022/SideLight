# 第 119 轮缺陷侦察（finder-bug）

只读复查，未改产品代码。HEAD `83a70f2`，dev `http://localhost:5175`，真机 ego CDP 57270，视口 1440×900。
已查重：`BACKLOG.md` 无此条；已修列表（含第 102/112/117/118 轮）无此条。

## 走过的用户路径（真实操作）

1. 输入 → 模拟分析：「第一句…」→ Ctrl+A →「分析本段（模拟）」→ 2 张卡；改四态 open→in-progress→resolved→wont-fix→回 open，正文 `.annot` 跟随。无新问题。
2. 对话页签：多行输入（Shift+Enter）→ Enter 发送 → 1 user + 1 assistant、署名与 `aria-live` 正确、焦点回输入框；「生成批注」把指令留在记录并切页签（焦点到 `#rail-tab-notes`）。无新问题。
3. 对比面板：Esc 关闭 + 焦点还原 `BUTTON.rail-diff-open`；无工作区开「在审」→「先点「打开文件夹」，才能看到在审文件。」。无新问题。
4. 三档视口（1440×900 / 1024×700 / 1440×560）下对话页签：输入框、发送、生成批注都在视口与栏内，横溢 0。无新问题。
5. **对比面板开着按换文档快捷键 → 新问题 F1（下方）。**

## F1（P1）「对比 / 在审」面板开着时全局快捷键仍生效：换文档确认框被压在面板下面，键盘也够不着

- 复现：新文档打「甲文档的第一段。」（变脏）→ 右侧「对比」→ `Ctrl+Alt+N`。
- 实际：弹出「这篇还有没保存的改动 / 取消 / 不保存 / 保存并切换」，**它被对比面板整块盖住**；焦点仍在 `.rail-diff-close`，Tab 连按 4 次都困在对比面板里，确认框三钮键盘不可达；只有 Esc 先关对比，确认框才现身，且焦点落在 `BODY`（不自动进框）。
- 证据（本轮实测）：
  - `.tmp/r119-finder4.json`：`.overlay` z=**40**、`.rail-diff-overlay` z=**60**、`.dialog` z=`auto`；对话框中心 `elementFromPoint` = `DIV.rail-diff-head`、`dialogIsOnTop:false`；`tabSeq` 4/4 全是 `BUTTON.rail-diff-close`；Esc 后 `diffSheet:false`、`dialog:true`、`focused:"BODY"`。
  - `.tmp/r119-finder3.json`：同场景 `dialogs:["dialog|true","rail-diff-sheet|true"]` 两层同时挂着。
  - 截图 `shots/round-119/confirm-behind-diff.png`（确认框只在对比面板后面露出半截）、`shots/round-119/confirm-after-esc.png`（Esc 后确认框才完整可见）。
  - 根因行：`src/styles.css:1877-1880`（`.overlay` z 40）、`:1395-1404`（`.rail-diff-overlay` z 60）；`src/components/MarginRail.tsx:826,885` 两个 `createPortal` 只读面板是组件本地 state，`src/App.tsx:4426-4432` 的 `dialogOpen` 不含它们，所以换文档/快速打开/全局搜索等 window 快捷键照发。
  - 「在审」面板复用同一套 `.rail-diff-overlay`（`MarginRail.tsx:888` class 名带前缀），同路径同缺陷。
- 期望：侧灯两个只读面板开着时，换文档类全局快捷键要么不生效，要么先把面板收掉；任何确认框都必须在最上层且拿到焦点。
- 建议（二选一，改动都小）：把两个面板的开合状态提到 App，并入 `dialogOpen`（同时挡住 Ctrl+P / Ctrl+Shift+F 等同类路径）；或给 `.rail-diff-overlay` 设 `z-index: 30` 让它永远在 `.overlay` 之下。

## 未覆盖 / UNVERIFIED

- 有工作区时的 Ctrl+P 快速打开与 Ctrl+Shift+F 是否同样叠两层：未跑（本机无工作区夹具）。
- 深色主题下新控件配色：本轮探针改 localStorage 键写错（`data-theme` 仍 `system`），未取到暗色值，不报。
- 真 IME、原生打印、WebView2 宿主：未跑。

原始日志：`.tmp/e2e-r119-finder{,2,3,4,5,shot}.mjs`、`.tmp/r119-finder{,2,3,4,5}.json`。
已按角色规则登记 `BACKLOG.md` 的 P1 行 **B-249**（若与本轮其他 finder 撞号，由 lead 改号）。
