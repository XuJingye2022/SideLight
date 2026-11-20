# 第 131 轮 界面与可访问性复查（finder-ui）

前置：dev 5175 HTTP 200；ego CDP 57270（视口 1256×808，`setDeviceMetricsOverride` 未生效）；轮前 `39f15cf` = HEAD、工作树干净。只读，未改产品代码。探针 `.tmp/r131-finder-ui{,2,4}.mjs` → `.tmp/r131-finder-ui{,2,4}.log`、在审回读 `.tmp/r131-finder-ui-review.log`；0 pageerror。本轮 **1 条新 P1 + 1 条新 P2**；不与已修清单（B-221、B-223–B-225、B-227、B-228、B-230–B-237、B-239–B-247、B-249–B-252、B-254、B-257、B-260、B-261）及 B-229/B-253 重复。

## F1（P1，焦点/键盘）对话「发送」与追问「发送」用鼠标点后焦点掉到 `BODY`，回复到齐也不回焦

复现（`.tmp/r131-finder-ui2.log`）：对话页签输入「这段有什么问题」→ 鼠标点 `.rail-chat-send` → 180 ms 后 `document.activeElement` = `BODY`；mock 回复到齐、`aria-busy=false` 后仍是 `BODY`；按 1 次 Tab 落 `BUTTON.stats-trigger`（状态栏），不回输入框。对照：回车发送时焦点留在 `TEXTAREA.rail-chat-input`，收流后仍是它（`kbAfterEnter`/`kbAfterStream`）。

成因：点击使 `busy=true`、`chatDraft` 清空 → `disabled={busy || !chatDraft.trim()}`（`src/components/MarginRail.tsx:884`）把刚点中的钮置灰，浏览器把焦点送回 `body`；收尾 `finally` 用 `panel.contains(document.activeElement)` 判「焦点在面板里」（`:250-258`），读到 `body` → `chatRefocusAfterStream` 为假 → 不回焦。追问同构且无回焦代码：`.thread-input button` 的 `disabled={discussingId === annotation.id || ...}`（`:775`），点击后同样掉 `BODY`；`[AGENT]` 回复到齐、状态已变「处理中」后焦点仍 `BODY`，下一次 Tab 落 `BUTTON.rail-overall-head`（整体评价）（`.tmp/r131-finder-ui4.log`）。

影响：鼠标问一句后，键盘读者每次都要从页外 Tab 回输入框；队列的「对话」与「[AGENT] 线程回复」两条路径都丢位置。B-240 修的是「中止/焦点已移出时别抢焦」，本条是反向缺口（正常鼠标点击时判据恒假），属新问题。修法：发送前先 `inputRef.focus()`（焦点不落在被置灰的钮上），或把判据改成「流开始时焦点在面板里」记进 ref；追问加同样回焦。

## F2（P2，术语/一致性）四态状态在卡片里是中文，在审列表与修订快照里仍写英文 `open`

第 128 轮把下拉文案改成中文（`待处理/处理中/已解决/不修复`，`src/lib/annotations.ts:36-41`），但「在审文件」行与「修订快照」行仍是英文：同屏实测 `a.md | open 1 · 共 1 条`（n01–n49 同形，共 50 行）、快照行 `11-20 19:18:47 · 77 B · 批注 1 条（open 1）`（`.tmp/r131-finder-ui-review.log`）。同一状态两种叫法，与 AGENTS.md「一个概念只用一个词」不一致。

证据：`src/components/MarginRail.tsx:1027`（`open ${row.open} · 共 ${row.total} 条`）、`:989`（`按 open 数排序`）、`src/lib/revisionList.ts:32`（`批注 ${total} 条（open ${open}）`）。修法：三处显示改中文标签，或统一回英文枚举。

## 复查通过、本轮未报的面

页签 159×28、`role=tablist` + roving tabindex，ArrowLeft/Home/End 换选并聚焦；260 个无空格字符在记录里换行良好（`scrollWidth=clientWidth=320`、rail 320/320、0 横溢）；实测 `.rail-head` 24、批注页签空态栏内 `button/select/textarea` 无 <24 项、卡头两下拉 64×24 / 72×24、追问发送 43×26、在审关闭钮 23.6×24、卡头单行 24 px 且卡与栏 0 横溢；`[AGENT] ` 前缀恰 1 处、追问后状态转 `in-progress`；生成批注后焦点落 `#rail-tab-notes`、对话留指令 turn；在审面板 50 行 + 截断提示 + 8 份快照同屏（快照底 714.2 ≤ sheet 底 727.2），Esc 后焦点回 `.rail-review-open`、`[inert]` 归 0。

UNVERIFIED：真实中文 IME、真 WebView2 宿主、原生打印/另存 PDF；1024×700 窄窗抽屉未量（视口 override 未生效）；快照写侧未跑（只读共享页已有 8 份）。
