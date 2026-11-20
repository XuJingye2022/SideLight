# 第 119 轮 界面与可访问性复查（finder-ui）

前置：dev 5175 HTTP 200；ego CDP 57270；1440×900 + 1100×800 + 1024×700；轮前 `83a70f2`（= HEAD）。只读，未改产品代码。探针 `.tmp/e2e-r119-finder-ui{,2}.mjs`、`.tmp/e2e-r119-shot.mjs` → `.tmp/r119-finder-ui{,2}.json`；0 pageerror。本轮 **1 条新 P1 + 2 条新 P2**；已修清单（B-221～B-247 全部、B-229 open）不重复。

## F1（P1，键盘）「对比」面板的长 diff 键盘只能读到第一屏

复现：新文档打 60 段（Enter 分段）→ 点「对比」→ 119 行 diff，`.rail-diff-rows` `scrollHeight 2380 / clientHeight 540`（超出 1840）。面板里**只有 1 个 Tab 站**：连按 8 次 Tab 全停在 `BUTTON.rail-diff-close`；行是纯 `<li>`，`rowHasFocusable:0`，`ul` 的 `tabIndex:-1`、无 `tabindex` 属性。焦点在关闭钮上按 `PageDown`/`PageDown`/`ArrowDown`/`End` 后 `scrollTop` **全是 0**；同一容器鼠标滚轮 → **400**（容器本身可滚）。影响：只用键盘的读者看不到第二屏以后的改动（上限 400 行），WCAG 2.1.1。

证据：`src/components/MarginRail.tsx:869-875`（`ul.rail-diff-rows` + 纯 `li` 行）、`src/styles.css:1456-1464`（`max-height:60vh; overflow:auto`）；`.tmp/r119-finder-ui2.json` 的 `diffOpen`/`diffKeyboardScroll`/`diffWheelScrollTop`。同形态缺陷 B-244 只修了对话记录（`MarginRail.tsx:764` 的 `tabIndex={0}`），此面板未覆盖。

修法：`ul.rail-diff-rows` 加 `tabIndex={0}` + `aria-label`（或把「对比」行改成可聚焦列表）；「在审」面板的行已是 `button`，无需改。

## F2（P2，可访问性/触达）两个新面板的 × 关闭钮 24×19，低于 24×24 口径

「对比」「在审」两个面板头部关闭钮实测都是 **24×19**（宽够、高差 5 px）；同轮量到「我的理解」里的 `button.rail-goal-retry`（「判错了，重来」）**72×18.6**。B-236 已修 `.rail-diff-open`/`.rail-review-open`/`.rail-chat-reset` 三个同类钮，漏了这两处。

证据：`src/styles.css:1442-1448`（`.rail-diff-close` 只有 `padding:0 6px; font-size:14px; line-height:1.2`，无 `min-height`）、`:3431`（`.rail-goal-retry`）；`.tmp/r119-finder-ui.json` 的 `diffAria.closeSize`、`reviewAria.closeTarget`、`smallTargets`。

修法：两处各加 `min-height: 24px`（同 `:1332-1343`）。

## F3（P2，外观）暖纸主题「整体评价」条数徽标 4.02:1

`.rail-overall-count`（卡片头右上角 10 px 数字）在 sepia 下 `rgb(107,93,72)` on `rgb(221,203,170)` = **4.02:1**，低于 10 px 文字 AA 4.5；light/dark 同元素通过（无失败项）。该规则 `background: var(--line)` + `color: var(--ink-soft)`：sepia `--line:#ddcbaa`（`src/styles.css:78`）与 `--ink-soft:#6b5d48`（`:76`）正好凑成 4.02。

证据：`src/styles.css:1182-1190`；`.tmp/r119-finder-ui.json` 的 `contrastFail.sepia`（三主题全量扫描只此 1 条）。修法：徽标底改 `--mark-wash`/`--accent-wash`，或文字改 `--ink`；`themes.test.ts` 无这条配对，可补。

## 复查未发现新问题的面

三主题对比度全量扫描（`.margin-rail *`、`.rail-diff-sheet *` 可见文本）只 F3 一条失败。可点口径除 F2 外全过：发送 48×31、生成批注 74×31、页签 159×28、对比/在审 35×24、抽屉关闭 31×28、批注两 select ≥24、输入框 320×44。两面板 `role=dialog`+`aria-modal`+`aria-labelledby` 名称可解析，`[inert]` 2、关后归 0，Esc 后焦点回入口（`focusBack:true`），Tab 30 次 0 逃出。对话页签有 `aria-label`、记录区 `tabIndex=0`、流式后 `aria-live` 回 polite、署名 2 条、0 错误。1100/1024 抽屉态 rail 340 宽、`rail-head` 与 `body` 横溢 0。截图 `shots/round-119/diff-keyboard-scroll.png`（79 行、超出 1148 px、`scrollTop:0`）、`shots/round-119/drawer-1100.png`。

UNVERIFIED：真实中文 IME、真 WebView2 宿主、原生打印/另存 PDF；有工作区时「在审」列表与「修订快照」段（本轮无工作区夹具，只量空态与结构）。
