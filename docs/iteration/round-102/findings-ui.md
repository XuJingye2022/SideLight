# 第 102 轮 finder-ui（界面与可访问性）

只读复查，未改产品代码。环境：`http://localhost:5175`（dev 在跑）、ego 真机 CDP、HEAD `bdd0c17`。
覆盖：右侧双页签/对话/批注（dark + light）、批注卡、rail 头三钮、设置与 diff/在审入口的空态；未造工作区夹具。
`actionable_count: 0`、`p0p1_count: 0`（三条都是 P2）。

## 新问题（3 条，全 P2）

**F1 对话输入框没有主题配色（外观）**
dark（纸底 `#15171a`）实测 `.rail-chat-input`：背景 `rgb(59,59,59)`、文字纯白、边框 `rgb(133,133,133)`，即浏览器 UA 深色表单默认；light（纸底 `#f6f4ee`）为 `#fff` + 边框 `rgb(118,118,118)`。同屏 user 气泡 `rgb(25,28,32)`、assistant `rgb(28,31,35)`（有边框，可分辨）。
因：`src/styles.css:1556-1562` 的 `.rail-chat-compose textarea` 只写 flex/padding/font-size/resize，没有 color/background/border；`textarea` 无全局规则。对照组 `.dialog-textarea`（`src/styles.css:3221` 起）有 `var(--ink)` / `var(--paper)` / `var(--line)`。
证据：`shots/round-102/chat-input-dark.png`（深色侧栏里一块 13px 亮灰输入块，文字纯白而非 `--ink #e9e6e0`）。
修：补 `color:var(--ink); background:var(--panel); border:1px solid var(--line); border-radius:8px`，`:focus` 走既有 `--focus-ring`；改完量浅/深/暖纸三主题几何。

**F2 三个新入口小于项目 24×24 口径（可访问性）**
实测 1440×900：`.rail-diff-open` 35×16、`.rail-review-open` 35×16（font-size 10.5px）、`.rail-chat-reset` 52.5×21。B-110 已把批注卡动作钮（54/42/66×24）、工具栏钮、`.stats-trigger` 收齐 24×24；这三钮是第 96/100/101 轮新增，未纳入。
CSS：`src/styles.css:1332-1343`（`height:16px`）、`:1492-1499`（`padding:2px 8px`）。
备注：WCAG 2.5.8 间距豁免可能成立（「对比」「在审」中心距 42px），但项目口径是 24×24；修时保持 `.rail-head` 头高不变与「对比在左、在审贴右缘」。

**F3 对话流式回复在 aria-live 区逐字更新（可访问性）**
实测一次模拟回复期间 `.rail-chat-log` 内 21 次 DOM 变更，其中 18 次 characterData，间隔约 20 ms（文本由「（模拟」逐字长到整句）。
结构：`src/components/MarginRail.tsx:657` 的 `.rail-chat-log` 是 `role="log" aria-live="polite"`；`:664-668` 每条 turn 用整段文本渲染，流式 delta 每次改同一文本节点 → polite 区被反复触发，读屏重复播报累积文本。
修：流式期间容器 `aria-live="off"` + `aria-busy="true"`，收流后一次性恢复 `polite`（或不改视觉，只让「已完成」消息进 live 区）。

## 查重
B-110（其他控件 24×24）、B-221–B-225（页签/紧急度/对话/四态/[AGENT]）、B-226–B-228（快照/diff/在审）都不覆盖以上三点；无重复。BACKLOG 本轮未改（5 路并行，避免并发写），请 lead 分 ID 后落池。

## UNVERIFIED
- 1024×700 未测：`Emulation.setDeviceMetricsOverride` 未生效（ego 仍报 1432×882），窄窗几何沿用第 94/96/101 轮结论。
- 在审文件面板「有工作区」形态未造夹具，只看了空态；数据层与列表沿用第 101 轮。
- 真读屏播报节奏未验（F3 只按 DOM 变更计数）。
- 环境：ego `default` 与 `dsh-agent-0773edf5` 两个标签页跑同一应用，标题在 diff.md/未命名.md/a.md/b.md 之间跳变；本轮数据一律取自单次调用内的 DOM，跨调用状态不可复用。
