# 第 112 轮 界面与可访问性复查（finder-ui）

前置：dev 5175 HTTP 200；ego CDP 57270；1440×900 与 1024×700；轮前 `e27e3d5`（=HEAD）。只读。探针 `.tmp/r112-finder-ui{,2,5}.mjs` → `.tmp/r112-finder-ui{,2}.json`，0 pageerror。本轮 2 条新 P1 + 2 条新 P2；B-221…B-240 已修项与 B-229（open）不重复。

## F1（P1，键盘）正文字首时，侧栏里按 Tab 全被送回页首 skip-link

复现（新开文档，编辑器选区默认 1/1）：焦点放「对比」按 Tab → `A.skip-link`；对话输入框写一句按 Tab → 同样 `A.skip-link`，「发送」「生成批注」被跳过。对照：先点正文再 `Ctrl+End`（离开 1/1），同一路 Tab 正常——「对比」→「在审」→页签→`.stats-trigger`；输入框→`发送`→`生成批注`→`.stats-trigger`（探针 `fromDiffAtStart`/`fromDiffMoved`/`fromInputMoved`）。
根因：`src/App.tsx:5884` 的 `<main id="editor" class="doc-scroll">` 带 `onKeyDownCapture`（`:5886-5893`：非 Shift 的 Tab + 选区 1/1 → `preventDefault()` + `.skip-link.focus()`），而 `<MarginRail>` 在 `</main>`（`:6089`）之前渲染，实测 `main.contains(.margin-rail)=true`（`railInsideMain`）。
影响：侧栏整棵树（输入、生成批注、在审行、卡内两个 select、采纳/追问）正向 Tab 失效，只能 Shift+Tab 反绕。既有 UNVERIFIED 的「正文开头 Tab 回环」只提正文，不含这条。
建议：守卫加 `editor.view.dom.contains(event.target)`；或把 `.margin-rail` 移出 `main.doc-scroll`。

## F2（P1，可访问性）助手气泡没有发言者标识

实测每条只是 `<p class="rail-chat-turn is-user|is-assistant">文本</p>`，属性只有 `class`（`turns.html`）；`innerText` 里前后无「我/侧灯」或任何标记（`turns.logText`）。说话人只靠底色/边框（`styles.css:1523`/`:1527`），读屏与复制粘贴拿不到归属（WCAG 1.3.1/1.4.1）。对照批注线程已按同一理由加 `[AGENT]`（`annotations.ts:147`、`MarginRail.tsx:361`），对话页签未覆盖（`MarginRail.tsx:714-718`）。
建议：assistant 侧加视觉隐藏「侧灯：」或 `aria-label`，别改流式累积文本。

## F3（P2）401 后残留空助手气泡

假 Key + 401：错误文案正确，但 `turns` 末条是 assistant、文本空、高 16 px、1 px 边框的空白盒（`error401.turns[3]`、`emptyAssistant:1`）；截图 `shots/round-112/chat-401.png`。根因：`MarginRail.tsx:188` 先插空占位，失败分支 `:205-207` 只写 `chatError` 不删占位，`busy` 落回 false 后 `:716` 的「…」也消失。建议 catch 里删末条空 assistant。注：`shots/round-112/chat-401-empty-bubble.png`（同轮其它代理）应是同一条，可去重。

## F4（P2，可访问性）记录区不可聚焦，长回答键盘滚不回去

`.rail-chat-log` 有 `overflow-y:auto` + `max-height: calc(100vh-300px)`（`styles.css:1503-1511`），但无 `tabindex`、`tabIndex:-1`；正常 Tab 序实测 输入框→发送→生成批注→`.stats-trigger`，记录区从不进链；程序 `focus()` 后 PageUp 能滚（38→0，`log.arrowScroll`）。建议 `tabIndex={0}`，焦点环走 `styles.css:188` 的全局 `:focus-visible`。

## 复查过、未发现新问题

可点口径全过：send 48×31、generate 74×31、reset 52.5×24、页签 159×28、对比/在审 35×24、抽屉关闭钮 30.56×28；1024×700 抽屉 340 宽、横溢 0、页面 1024/1024（`shots/round-112/rail-1024.png`）。新钮 hover/disabled/focus-visible 吃全局规则（`styles.css:178/183/188`）。
另记 P2（未占条目）：「和侧灯说一句」在面板出现 4 次（可见 2 次：面板头与空态标题，另加 placeholder 与 aria-label，`chat.naming`）。
UNVERIFIED：真实中文 IME、真 WebView2 宿主、原生打印/另存 PDF。
