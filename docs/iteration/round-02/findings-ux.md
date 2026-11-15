# 第 02 轮 · 体验与界面发现

- 对象：Sidelight v0.16.3 浏览器原型，`http://localhost:5173`。HEAD `7f6058e`（`src/` 自 `cb36110` 起未改动，`git diff cb36110..HEAD -- src/` 为空）。
- 方法：`playwright-core` 经 CDP 连接 headless Edge 157（`http://127.0.0.1:9223`）。视口 1440×900、1280×800、1119/1120×800、1024×768；无头模式、`localStorage` 每次清空。
- 临时脚本（只读产品代码）：`.tmp/r2-ux-probe.mjs`、`r2-ux-first.mjs`、`r2-ux-errors.mjs`、`r2-ux-401.mjs`、`r2-ux-risk.mjs`、`r2-ux-keys.mjs`、`r2-ux-savedlg.mjs`、`r2-ux-visual.mjs`、`r2-ux-contrast.mjs`。
- 原始数据：`.tmp/r2-ux-probe.json`、`r2-ux-errors.json`、`r2-ux-401.json`。
- 截图：`shots/round-02/ux-*.png`（正文逐条引用）。两档基准图：`ux-1440-first.png`、`ux-1280-first.png`。
- 未验证：真模型 / 真实搜索（无 key，用本地 401 stub 代替）、中文输入法、文件系统写入失败、宿主（WebView2）内下载与保存、Windows 125% 缩放。

## 0. 复核结论（先看这张表）

| 项 | 是否仍成立 | 一句话证据 |
| :--- | :--- | :--- |
| U1 模拟批注无标注 | **是** | 无 key 跑出 3 条批注，rail 与页面均无「模拟」；`.rail-notice` = null |
| U2 设置不接管焦点 | **是** | 打开后焦点仍在顶栏「设置」；12 次 Tab 全落在框外；`aria-modal` = null |
| U3 次要文字对比度 / 小字号 | **是** | `--ink-faint` 实测 2.93–3.31:1；批注卡头仍 10.5px |
| U4 窄窗整页横向滚动 | **是** | 1119px 即溢出 1px；1024px 溢出 96px，保存 / 设置 / 源码 / 预览被裁 |

影响排序建议：U1 > U4 > U2 > U3 > U5（编号沿用上轮，便于 planner 对照；本轮新增 U5）。

## 1. U1–U4 复核

### U1 没配 API Key 时跑模拟批注，界面没有任何「模拟」标注（仍成立，难度 S）

**现状证据**

- 新会话、清空 `localStorage`、不填 Key。选中「为什么叫侧灯」一段，点「分析本段」，等 3.2s：
  - `.note` = 3，卡头为「评价 / 修订 / 评价」，rail 文本只有「侧灯 3 条 … 采纳 忽略 追问 联网核对」；
  - `.margin-rail` 文本匹配 `/模拟/` = **false**，`.rail-notice` = **null**，toast = **null**（`.tmp/r2-ux-probe.json` → `mock`）；
  - 截图 `ux-1440-annotation.png`、`ux-1280-annotation.png`：三条成稿式批注，没有任何标记。
- 代码：`src/lib/ai.ts:33-39` 无 Key 走 `mockStream`；`src/lib/ai.ts:213-220` 只输出 JSON Lines，不带标记。唯一写「模拟」的是追问回复 `src/lib/ai.ts:135`（「（模拟回复）…」），批注路径没有。
- `src/components/MarginRail.tsx:56-62` 头部、`:74` 的 `.rail-notice`、`:93-98` 的卡头都没有未配置提示或标记。
- `hasKey()` 已经写好但全仓库无人调用：`src/lib/settings.ts:64-66`（grep 只命中定义）。
- 设置里 Key 为空也没有状态：`src/components/SettingsDialog.tsx:41-50` 只有 placeholder。

**是否仍成立：是。** 这是首次使用信任的第一条：用户会以为模型读过文章。

**具体改法（一次改动）**

1. `App.tsx` 用 `hasKey(settings)` 算出 `simulated`，传给 `MarginRail`；在 `.rail-empty` 之前渲染一条独立提示（不要复用 `.rail-notice`，那是定位失败用的）：「未配置 API Key，下面是本地模拟批注，不调用模型」。
2. `MarginRail` 卡头加 `<span className="note-kind note-kind-mock">模拟</span>`；`note-kind-mock` 用 `--line-strong` 底 + `--ink` 字（10.36:1），避开 U3 的低对比色。
3. 顶栏按钮无 Key 时写「分析本段（模拟）」，`title="未配置 API Key：从本地生成模拟批注"`；设置对话框 Key 字段显示「未配置」小字。
4. 顺手删掉或使用 `hasKey`，避免又出现一个死函数。

**难度 S。** 不动数据流。

### U2 设置对话框不接管焦点：Tab 走的是背后工具栏（仍成立，难度 M）

**现状证据**

- 打开设置后：`document.activeElement` = 顶栏 `BUTTON`「设置」，`activeInsideDialog` = **false**；`[role="dialog"]` 的 `aria-modal` = **null**、`aria-labelledby` = **null**（只有 `aria-label="设置"`）。
- 连按 12 次 Tab，焦点依次落在：`插入 ▾ → H1 → H2 → B → I → S → </> → 专注 → 打字机 → 源码 → 预览 → 文件`，**12/12 全在框外**；`Shift+Tab` 同样在框外。
- Esc 能关（`closed=true`），但焦点不回到「设置」：关闭后 `activeElement` 是后台按钮，不是 opener。
- 另外两个模态同样中招：保存前确认框 `aria-modal=null`，打开时焦点仍在正文（`activeElement` = `.tiptap`），按 Tab 落到 BODY；结构见 `SaveDialog.tsx:20-23`、切换文档框 `App.tsx:1994-2009`。
- 视觉上像模态（遮罩 + 模糊），行为上不是：`ux-1440-settings.png`。附带：保存与取消样式完全一样（见 C1）。

**是否仍成立：是。** 键盘与读屏用户无法在对话框里操作，WCAG 2.4.3 / 4.1.2 不通过。

**具体改法**

1. 新增 `src/components/useDialogFocus.ts`（约 30 行）：
   - 打开时记录 `document.activeElement`，聚焦框内第一个可聚焦元素（设置对话框聚焦「接口地址」输入框）；
   - `keydown` 捕获 Tab / Shift+Tab，在 `[role="dialog"]` 内循环；
   - 关闭时把焦点还给记录的元素；
   - 给 overlay 的后台内容加 `inert`（Chromium 支持，React 19 可直接写属性），比 `aria-hidden` 简单。
2. 三个对话框都加 `aria-modal="true"`，并把 `aria-label` 换成 `aria-labelledby` 指向各自的 `<h2>`。
3. `SettingsDialog`、`SaveDialog`、`App.tsx:1994` 的切换文档框共用这个 hook，不要再写第二份。
4. 这套修完，C1 的 `.primary` 规则也应一起加，否则焦点进入后主操作仍不可辨。

**难度 M。** 一个 hook + 三处接线。

### U3 次要文字对比度不足，批注卡头只有 10.5px（仍成立，难度 S）

**现状证据：实测色值 + WCAG 相对亮度公式（脚本 `.tmp/r2-ux-contrast.mjs`）**

| 位置 | 字号 | 前景 / 背景 | 对比度 |
| :--- | ---: | :--- | ---: |
| 状态栏 | 11.5px | `#8b9096` / `#fbf8f3` | **3.04:1** |
| 批注卡头「第 N 处」 | 10.5px | `#8b9096` / `#fffdf8` | **3.16:1** |
| 批注动作「知道了 / 追问」 | 11.5px | `#8b9096` / `#fffdf8` | **3.16:1** |
| 修订卡删除线原文 | 12.5px | `#8b9096` / `#fffdf8` | **3.16:1** |
| 对话框说明 `.dialog-note` | 11.5px | `#8b9096` / `#fffdf8` | **3.16:1** |
| 顶栏文档名 | 12px | `#8b9096` / `#fcfaf4` | **3.08:1** |
| 「我的理解」标签 | 10px | `#8b9096` / 55% accent-wash | **2.83:1** |
| 风险条正文 / 按钮 | 12 / 11.5px | `#b8722a` / `#f7ede0` | **3.31:1** |
| 风险条「知道了」 | 11.5px | `#8b9096` / `#f7ede0` | **2.78:1** |
| 修订标签「修订」 | 10.5px | `#b8722a` / `#f7ecdc` | **3.28:1** |
| 「采纳」白字 | 11.5px | `#fff` / `#b8722a` | **3.83:1** |
| 对照：正文 | 17px | `#1d2023` / `#f6f4ee` | 14.88:1 |
| 对照：字段名 | 11.5px | `#565c61` / `#fffdf8` | 6.67:1 |

- 变量：`src/styles.css:7`（`--ink-faint: #8b9096`）、`:13`（`--mark: #b8722a`）、`:2`（`--paper`）。
- 字号：`styles.css:566`（`.note-head` 10.5px）、`:647-651`（`.note-actions button` 11.5px）、`:719-724`（`.dialog-note` 11.5px）、`:956-966`（`.status-bar` 11.5px）、`:1417-1421`（`.rail-goal-label` 10px）、`:1032-1046`（风险条 12px / `--mark`）、`:653-657`（`.accept` 白字）。
- 暗色实测（`emulateMedia`）：`--ink-faint` `#73787c` 在 `#15171a` 上 4.02:1，在卡片 `#1c1f23` 上 3.71:1；状态栏混合底约 3.8:1，同样不达标（`ux-1440-dark.png`）。
- 另：全局没有 `:focus-visible` 规则（`styles.css` 扫描结果为 false），键盘焦点用浏览器默认 `auto 1px rgb(16,16,16)`；暗色下该颜色与 `#15171a` 对比度约 **1.05:1**，等于看不见（`ux-1440-dark-focus.png`）。

**是否仍成立：是。** 数字与上轮一致（2.9→3.16 为混合底差异），字号一处没改。

**具体改法**

1. `--ink-faint: #666c72`：纸色 4.83、卡底 5.23、mark-wash 4.55、风险条底 4.59，全部 ≥4.5；暗色改 `#9aa0a6`（6.80 / 6.26）。
2. `--mark: #9a5b1c`：白字 5.40、卡底 5.31、纸色 4.91；风险条与「采纳」一并达标。
3. 字号：`.note-head` 10.5→12px，`.rail-goal-label` 10→11px，`.rail-goal-retry` 10.5→11px，`.status-bar` / `.note-actions button` / `.dialog-note` 11.5→12px。
4. 加一条 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`，覆盖 `button`、`.tree-file`、`.find-input`、`.source-editor`；暗色下 accent `#79b3aa` 足够亮。
5. 风险条背景不要用 `mark-wash 85%` 叠纸色，直接用 `--mark-wash`，再把文字换成 `--ink`（14.02:1）或 `#7a4310`（6.82:1）。

**难度 S。** 只改变量与字号，不动布局；改完复测上表全部数字。

### U4 窗口窄于 1120px 时整页横向滚动，顶栏与风险条的动作被裁（仍成立，难度 M）

**现状证据**

- `src/styles.css:68`：`.app { min-width: 1120px }`，`styles.css` 里只有暗色（`:24`）与打印（`:1170`）两个 `@media`，没有任何宽度断点；`.doc-layout` 固定 `minmax(0, 36rem) 260px`（`:159-166`）。
- 实测：
  - **1119×800**：`documentElement.scrollWidth = 1120`，`hScroll = true`（只差 1px 也溢出）；顶栏按钮右缘 1108，勉强可见。
  - **1120×800**：`scrollWidth = 1120`，`hScroll = false`（确认断点就是 1120）。
  - **1024×768**：`scrollWidth = 1120`（溢出 96px）；「保存」右缘 1051、「设置」右缘 1108 — **两者完全在视口外**；工具栏「源码」1024–1066、「预览」1068–1110 被裁；`.margin-rail` 818–1078 被裁；底部出现横向滚动条。
  - 风险条（打开 `参考与出处.md` 触发）在 1024 下宽 892、按钮「改用源码模式」右缘 1032、「知道了」右缘 1096，**两个都超出视口**（`.tmp/r2-ux-risk.mjs`，`ux-1024-risk.png`）。
- 截图：`ux-1024-narrow.png`（顶栏只剩「分析本段 / 导出」，工具条右侧消失，批注卡被切一半）、`ux-1024-risk.png`。
- 影响面：Windows 上 1920 屏对半吸附 = 960px，1366 屏 125% 缩放 = 1092 CSS px，都会触发。

**是否仍成立：是。** 与上轮一致，仍未加断点。

**具体改法**

1. `@media (max-width: 1119px)`：
   - `.app { min-width: 0 }`；
   - `.doc-layout { grid-template-columns: minmax(0, 1fr); padding: 32px 20px 160px }`；
   - `.margin-rail { display: none }`，顶栏加一个「批注」开关，把页边栏做成分段抽屉（或至少在窄窗给「批注」列表入口，别让功能直接消失）。
2. 顶栏在该断点把「导出 / 保存 / 设置」收进一个「⋯」菜单，只留「分析」和当前文件名；`overflow: visible` 的菜单不要被 `.app` 的 `overflow: hidden` 裁掉。
3. 工具条在该断点让「专注 / 打字机 / 源码 / 预览」换行或收进「视图」菜单；`flex-wrap: wrap` + `height: auto` 即可，不要横向滚动。
4. 风险条：`max-width: 60rem` 改 `100%`，按钮组 `flex: none` 且允许换行，避免再次裁掉唯一补救入口。

**难度 M。** 断点 + 一个菜单 + 抽屉，需要截图复验 1024 / 1119 / 1120 三档。

## 2. U5（本轮新增）错误与失败反馈不可操作（难度 M）

**现状证据**

- **401**：本地 stub（`Access-Control-Allow-Origin: *`）返回 OpenAI 兼容 401。点「分析本段」后 toast 原文：
  `模型接口返回 401：{"error":{"message":"Authentication Fails, Your api key: ****test is invalid","type":"authentication_error"}}`
  - 颜色 `rgb(86,92,97)`（普通灰），不是错误色；`role="status"`；**0 个按钮**；约 6 秒自动消失（实测 6.8s 后 `.toast` = null）。
  - 截图 `ux-1440-error-401.png`。
- **网络不通**（把接口地址填到未监听端口）：toast 只有 **`Failed to fetch`**，英文、无主语、无动作；同样是灰 toast（`ux-1440-error-network.png`）。
- **导出**：点「导出 ▾ → Markdown / HTML」下载成功，但 `.toast` = **null**，界面没有任何「导出成功 / 保存到哪」的反馈；失败路径也没有：`src/App.tsx:1296-1304`（`downloadFile`）与 `:1306-1328`（`exportAs`）没有 try/catch，也没有 `setNotice`。宿主里下载被拦时，用户不会知道。
- **保存（无磁盘句柄）**：toast 559px 宽，原文「这篇没有磁盘句柄，已下载一份副本；要写回原文件，请用「打开文件夹」打开它所在的目录。」——「磁盘句柄」是内部术语；`dirty` 仍为 true（`ux-1440-save-copy.png`）。
- **保存（有句柄但写失败）**：`src/App.tsx:1042-1044` 直接 `setNotice(messageOf(error))`；DOMException 常见为英文（如 `The request is not allowed`），用户看到英文系统错误。
- 文案分层只有一处：`src/App.tsx:1950-1952` 用正则 `/失败|错误|无法|不能/` 决定是否加 `is-error` 类；401 / `Failed to fetch` 都不匹配，所以错误和普通提示长得一样。
- toast 生命周期：`src/App.tsx:817-822` 固定 6 秒清空，无关闭按钮、无手动保留；错误信息读不完就消失。

**是否仍成立：新发现，成立。** 首次使用里最需要「说人话」的一段正好没有做。

**具体改法**

1. 在 `App.tsx` 的 catch 处按错误类型映射中文文案（新建 `src/lib/errorCopy.ts`，约 30 行）：
   - HTTP 401/403 →「API Key 无效或没有权限。去设置检查 Key 和接口地址。」+ 动作按钮「打开设置」；
   - `TypeError` / `Failed to fetch` →「连不上接口地址。检查网络，或确认「接口地址」填对。」；
   - 其余 HTTP →「模型接口返回 {status}。稍后重试；还不行就换模型或接口地址。」（详情折叠进 title，不铺在 toast 里）。
2. toast 支持一个可选动作（`{ label, onClick }`）：错误时给「打开设置 / 重试」；错误用 `role="alert"`，且**不自动消失**（或给关闭按钮）；普通提示保持 6 秒。
3. 导出：`exportAs` 外层 try/catch，成功后 toast「已导出 未命名.md」；失败「导出失败：{原因}」。同样给 `window.print()` 失败兜底。
4. 保存兜底文案改成用户词：「这篇还没有磁盘路径。已下载副本到「下载」文件夹；要写回原文件，先用「打开文件夹」打开它所在目录。」错误同样走 1 的映射。
5. 顺手修 `messageOf` 的兜底「请求失败，原因未知。」→ 加「可以重试；还不行把这段文字发给开发者」这类可执行句子。

**难度 M。** 文案映射 S，toast 动作槽与不自动消失是 M；导出兜底 S。

## 3. 第一次使用 30 秒路径（不读 README）

| 步骤 | 实测 | 证据 |
| :--- | :--- | :--- |
| 打开页面 | 直接显示可编辑示例，光标未进入；`activeElement` = BODY | `ux-1440-first.png`；`.tmp/r2-ux-probe.json` → `first` |
| 到写下第一句 | **2 个动作**：点正文（1）+ 输入（2）。无向导、无弹窗、无必填项 | 点击后 `contenteditable=true`；`分析本段` 初始就可用（示例首段已构成上下文） |
| 空状态给了什么 | 文件树 3 个按钮：打开文件夹 / 打开文件 / 试用示例；**没有「新建」** | `src/components/FileTree.tsx:111-129`；按钮文本探针 |
| 当前状态是否自洽 | **不自洽**：文档已打开且可编辑，文件树仍写「还没有打开文件夹」，文档名「未命名.md」，旁边还放着「试用示例」 | `ux-1440-first.png`；点「试用示例」后左栏变「示例文集 + 5 个文件」，文档名仍是「未命名.md」，正文没换（`ux-1440-demo-opened.png`，`.tmp/r2-ux-first.mjs`） |
| 「分析」何时出现 | 顶栏常驻「分析本段」，`disabled={selection.chars === 0}`；示例文档初始就可用；空文档时 disabled 且无 title，只有 Ctrl+Enter 会给提示；有选区后文案变「分析选中」，并在选区下方浮出 50×28 的「分析」气泡 | `src/App.tsx:1616-1618`、`:1956`；`ux-1440-bubble.png`；空文档探针 `ux-1440-empty-doc.png` |
| 可发现性 | 中等：示例正文与页边都写「选中一段，按 Ctrl + Enter」；但「分析 / 批注 / 边注 / 侧灯」四个词指同一件事，顶栏又用「分析本段 / 分析选中」两套叫法 | 页面文本；`MarginRail.tsx:76-81`；`App.tsx:67-79` |
| 没 Key 的提示 | **没有提示**。点「分析本段」直接给 3 条模拟批注，界面无「模拟」字样（U1） | `ux-1440-annotation.png` |
| 设置四组字段能否独立理解 | 不能算四组：6 个 `.field` 平铺，没有分组标题；「批注提示词」是 2246 字的技术提示词塞在 88px 高的 textarea 里；没有「测试连接」；没有去哪申请 Key 的链接；保存 / 取消长得一样 | `ux-1440-settings.png`；`.tmp/r2-ux-probe.json` → `settings`（fields=6、textarea len=2246、h=88） |
| 保存与导出是否找得到 | 找得到（顶栏右侧）。但「保存」在没有磁盘路径时会变成下载副本，且仍显示未保存圆点 | `ux-1440-save-copy.png`；`App.tsx:1048-1058` |

补充结论：

- **首次使用最小路径只有 2 步，这是优点**；问题在状态表达（示例 / 未命名 / 无文件夹 / 试用示例）与错误反馈，不在步骤数。
- **没有「新建」和「另存为」**（按钮文本探针无命中；代码里「新建」只命中 `mathInput.ts` 的注释；FileTree 空状态只有 3 个按钮）。写作应用第一次打开改不了示例就会一直背着「未命名.md」。这是能力缺口，需产品负责人决定；如果本轮不做，至少把示例文档明确标成「示例」并给「另存为」入口。
- 恢复草稿时**不显示语法风险条**：`findRiskySyntax` 只在 `loadIntoEditor` 调用（`App.tsx:950-951`），初始文档从 `localStorage` 恢复走 `App.tsx:419-424`，所以带引用式链接的草稿重开后没有「保存会改写」警告；打开示例文件才会出现（`ux-1440-risk.png`）。这是缺陷视角的漏网，建议转给缺陷 finder 或直接进本轮计划。

## 4. 键盘与错误

**Tab 顺序**（1440×900，从 BODY 起按 22 次）：

`分析本段 → 导出 ▾ → 保存 → 设置 → 插入 ▾ → H1 → H2 → B → I → S → </> → 专注 → 打字机 → 源码 → 预览 → 文件 → 大纲 → 打开文件夹 → 打开文件 → 试用示例 → 正文（第 21 次）→ BODY`

- 到正文要按 21 次 Tab，前面 20 个都是按钮；没有 skip link（跳转到正文）、没有 WAI-ARIA 地标导航。`.tmp/r2-ux-probe.json` → `tabOrder`。
- 焦点样式：所有按钮 `outline: auto 1px rgb(16,16,16)`，亮色可见、暗色不可见（见 U3 最后一条证据）。
- 页签顺序本身符合 DOM 顺序（顶栏 → 工具条 → 侧栏 → 正文），没有反向或陷阱。
- **Esc**：设置、保存前确认、查找条、插入菜单、导出菜单、源码、预览都实测能关闭（`r2-ux-keys.mjs`、`r2-ux-savedlg.mjs`）；切换文档框由同一 `keydown` 分支处理（`App.tsx:1123-1126`），未单独实测。关闭后焦点不回到 opener：设置后焦点落到另一个后台按钮（不是「设置」），保存前确认后落到 BODY，查找后落到 BODY。
- **快捷键提示不完整**：
  - `B / I / S / </>` 的 title 只写「粗体 / 斜体 / 删除线 / 行内代码」，不写 `Ctrl+B` 等；
  - 「保存」「设置」「导出」「分析」没有 title；
  - 全页 `aria-keyshortcuts` = 0；
  - 只有「预览」的 title 带 `Ctrl+Shift+P`；
  - 完整快捷键只写在示例正文里（`Ctrl+Enter` / `Ctrl+B` / `Ctrl+S`），用户换成自己的文档后就看不到了；
  - 查找没有可见入口，只能记 `Ctrl+F`。

## 5. 视觉

**两档基准**：`ux-1440-first.png`、`ux-1280-first.png`；设置：`ux-1440-settings.png`、`ux-1280-settings.png`；批注：`ux-1440-annotation.png`、`ux-1280-annotation.png`；窄窗：`ux-1024-narrow.png`、`ux-1024-settings.png`；暗色：`ux-1440-dark.png`、`ux-1440-dark-focus.png`。

**字号阶梯与行高**（`r2-ux-visual.mjs`）

| 用途 | 字号 / 行高 | 说明 |
| :--- | :--- | :--- |
| H1 | 31.45 / 42.46 | 正文 1.85× |
| H2 | 22.44 / 43.76 | 行高 1.95，与正文一致 |
| 正文 | 17 / 33.15 | 576px 宽，约 33 字/行，可读 |
| 输入框 | 13 | 设置、查找、追问不一致（12 / 12.5 / 13） |
| 批注正文 / toast | 12.5 | |
| UI 按钮 / 状态栏 | 12.5 / 12 / 11.5 | |
| 批注卡头 | 10.5 | 中文低于 12px，偏糊 |
| 「我的理解」标签 | 10 | 同上 |

- 结论：标题到正文的阶梯清楚；**UI 小字过密**（10 / 10.5 / 11 / 11.5 / 12 / 12.5 六档），10–11.5px 承担了状态栏、卡头、动作、说明这些必须读的信息。这是 U3 的一半。
- **间距**：顶栏 46、工具条 38、状态栏 28；按钮高 24–29，padding 从 `2px 8px`（卡内动作）到 `5px 10px`（顶栏）；卡片 9×11，对话框 20。没有 4/8 标尺，但视觉未破。圆角 7 档（6/7/8/9/10/14/999），可收敛到 6/8/12/999 四档。
- **按钮层级**：顶栏「分析本段 / 导出 / 保存 / 设置」四个按钮实测全部 `background: rgba(0,0,0,0)`、`color: rgb(86,92,97)`、`400`、`12.5px`，**主行动与次要操作同权重**；`.analyze-button` 类在 CSS 中没有规则（`r2-ux-visual.mjs` → `hasPrimaryRule=false`）。对话框「保存 / 取消」同样无差别。见 C1。
- **对比度**：见 U3 表；正文 14.88:1 合格，`--ink-soft` 6.4–6.7:1 合格，问题集中在 `--ink-faint` 与 `--mark`。
- 1280 与 1440 的差异：1280 下页边栏完整（916–1176），1440 下 996–1256；正文宽都是 576px，不随窗口拉伸。1280 无裁切。问题只在 ≤1119。

## 6. 代码优化机会（最多 3 条）

### C1 两个语义类没有 CSS：`.primary` ×4、`.analyze-button` ×1（难度 S）

- `className="primary"` 出现在 `SettingsDialog.tsx:122`、`SaveDialog.tsx:50`、`App.tsx:2006`、`App.tsx:2044`；`grep '\.primary' src/styles.css` 无命中，实测保存按钮 `backgroundColor = rgba(0,0,0,0)`，与取消完全一致。
- `className="analyze-button"` 在 `App.tsx:1616`，CSS 无规则，实测与导出/保存/设置完全同权重。
- 改法：加两条规则（`.primary` 用 `--accent` 底、`--paper-raised` 字、`:hover` 用 `--accent-ink`；`.analyze-button` 用 `--accent-wash` 底 + `--accent-ink` 字 + `600`），约 12 行；暗色下自动跟随变量。收益：主操作可辨、U2 的可用性提升、C1 与视觉层级一起解决。
- 注意：`.primary` 的文字用 `--paper-raised`（亮色 `#fffdf8`、暗色 `#1c1f23`），不要写死 `#fff`；暗色下 `--accent` 是浅青 `#79b3aa`，白字对比不足。

### C2 输入框基样式重复 5 处，focus 描边 4 个透明度（难度 S/M）

- `.field input`（`styles.css:738-753`）、`.find-input`（`:1088-1104`）、`.dialog-input/.dialog-textarea`（`:1228-1253`）、`.thread-input input`（`:1315-1331`）、`.field select`（`:1339-1348`）重复「padding + 边框 + 圆角 + 纸色底」；focus 分别是 `--accent` 32% / 30% / 30% / 28%。
- 字号 12 / 12.5 / 13、圆角 6 / 7 / 8、padding 4–8 也不一致。
- 改法：抽一个 `.text-input` 基类或选择器列表（`input[type=text], input[type=password], input[type=number], select, textarea`）+ 一条 `:focus-visible`，各组件只留尺寸差异；净减约 30 行，焦点态统一。风险低，只合并声明。

### C3 死代码 3 处（难度 S）

- `.math-preview`：`styles.css:1255-1264`，10 行；全仓库无引用（grep 只命中自身），实际用的是 `.math-draft-preview`。
- `.rail-notice.is-error`：`styles.css:500-502`；`MarginRail.tsx:74` 只渲染 `rail-notice`，从未加 `is-error`。
- `hasKey()`：`src/lib/settings.ts:64-66`，导出但无人调用（U1 的修法可以直接用它，或删除）。
- 合计约 15 行；删前各 grep 一次即可。

已核对、**不建议本轮动**的两项：内联样式只有 6 处（`InlinePopover.tsx:57`、`MarginRail.tsx:88`、`MathDraftPreview.tsx:31`、`MathInlineEditor.tsx:53`、`Outline.tsx:30`、`App.tsx:1960`），全是随坐标变化的定位，抽成 CSS 变量只会多一层间接；`App.tsx` 的 23 个 `useState` 里 `sourceMode` / `previewMode` 已由 `viewMode` 派生，没有找到可安全合并的一对，收益低于回归风险。

## 7. 未验证 / 下一轮补测

1. 真模型与真实错误（401 用本地 stub 验的是前端文案与状态，不是真实 DeepSeek 响应格式）。
2. 文件系统写入失败（权限被撤、磁盘满）：无头浏览器无法触发 FSA 的 `createWritable` 失败；`App.tsx:1042-1044` 的文案只能靠代码判断。
3. 宿主内「保存 / 导出」：浏览器里 `anchor.download` 成功；WebView2 宿主若没接 DownloadStarting，可能静默无文件。需要发布 finder 或 tester 在宿主里点一次。
4. 中文输入法、125% / 150% 缩放、`prefers-reduced-motion`。
5. 暗色只做了 `emulateMedia` 实测，未做全页面走查。
