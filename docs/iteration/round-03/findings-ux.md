# 第 03 轮 · 体验与界面发现

- 对象：Sidelight 浏览器原型 `http://localhost:5173`，HEAD `b434f25`（`src/` 与 `6c9c2b0` 一致，本轮未改动）。
- 方法：`playwright-core` 经 CDP 连接 headless Edge 157（`http://127.0.0.1:9223`）。视口 1440×900、1024×768、1119×800、1120×800；每次清空 `localStorage`。
- 脚本（只读产品代码）：`.tmp/r3-ux-main.mjs`、`r3-ux-errors.mjs`、`r3-ux-small.mjs`、`r3-ux-fix.mjs`、`r3-ux-demo2.mjs`。
- 原始数据：`.tmp/r3-ux-main.json`、`r3-ux-errors.json`、`r3-ux-small.json`、`r3-ux-fix.json`。
- 截图：`shots/round-03/ux-*.png`。
- 未验证：宿主（WebView2）内的保存与下载、真实 DeepSeek 响应格式（用同源路由伪造 401/500）、中文输入法、Windows 125% 缩放。

## 0. 上轮 U1–U3 复核（本轮不重复报）

| 上轮项 | 状态 | 一句话证据 |
| :--- | :--- | :--- |
| U1 模拟批注无标注 | **已修** | 无 Key 跑出 2 条批注，`.note-kind-mock` = 2；顶栏写「分析本段（模拟）」；rail 写「未配置 API Key，下面是本地模拟批注，不调用模型」 |
| U2 对话框不接管焦点 | **已修** | 打开设置后焦点在框内、5 个兄弟节点带 `inert`；Esc 后 `inert` 清零、焦点回到「设置」；`aria-modal="true"` |
| U3 对比度与小字 | **部分修** | `--ink-faint` = `#666c72`、状态栏 12px、`.dialog-note` 12px、焦点环 2px `rgb(43,109,100)`；剩下的 <12px 见 U5 |

影响排序：**U1 > U2 > U3 > U4 > U5**。U1 挡核心动作（窄窗看不见「保存」），U2 让用户无法从错误里恢复并会静默丢改动。

## 1. U1 窗口窄于 1120px 时「保存 / 设置 / 源码 / 预览」跑出视口，整页横向滚动（上轮 U4 未修，难度 M）

**实测（`.tmp/r3-ux-main.json` → `narrow`）**

| 视口 | `scrollWidth` − `clientWidth` | 被裁按钮 | 页边栏位置 |
| :--- | ---: | :--- | :--- |
| 1024×768 | **96px** | 顶栏「保存」「设置」、工具条「源码」「预览」 | 818–1078（右缘超出 54px） |
| 1119×800 | **1px** | 无（只触发滚动条） | 818–1078 |
| 1120×800 | 0 | 无 | 818–1078 |
| 1440×900 | 0 | 无 | 996–1256 |

- 1024 截图 `ux-1024-narrow.png`：顶栏只剩「分析本段（模拟） 导出 ▾ 保…」，工具条右侧整段消失，页边栏文字被切，底部出现横向滚动条；滚到最右是 `ux-1024-scrolled.png`。
- 代码：`src/styles.css:68` `.app { min-width: 1120px }`；`src/styles.css:176-183` `.doc-layout` 固定 `minmax(0, 36rem) 260px`；全文件只有 `:24`（暗色）与打印两个 `@media`，没有宽度断点。
- 设置对话框在 1024 下本身可用（430px 宽，297–727，主按钮可见，`ux-1024-settings.png`），说明裁切只来自 `.app` 的固定最小宽。
- 触发面：1920 屏对半吸附 = 960px；1366 屏 125% 缩放 = 1092px；两个都比 1120 窄。

**改法（已在页面里注入验证，`ux-1024-proposed-fix.png`）**

1. 加断点 `@media (max-width: 1119px)`（1120 正好是当前最小宽，向上取整不留 1px 抖动）。
2. 断点内：`.app { min-width: 0 }`；`.topbar { height: auto; min-height: 46px; flex-wrap: wrap; }`；`.toolbar { height: auto; flex-wrap: wrap }`；`.doc-layout { grid-template-columns: minmax(0, 1fr) }`。
3. 断点内藏页边栏 `.margin-rail { display: none }`，顶栏加「批注」开关做抽屉；否则批注在窄窗直接消失。
4. 实测结果：`overflow` 96 → **0**；被裁按钮 → **0 个**；「保存」右缘 955、「设置」右缘 1012，都在 1024 内；顶栏仍 46px（不换行）。
5. 低于 760px 再收一档：文件树 `display:none` + 顶栏「文件」开关。

**难度 M。** 只改 CSS 约 20 行，另加一个窄窗「批注」入口。验收：1024 / 1119 / 1120 三档 `scrollWidth == clientWidth`、四个按钮右缘 ≤ `innerWidth`。

## 2. U2 错误反馈不可读也不可操作；保存与导出失败完全静默（上轮 U5，难度 M）

**实测（`.tmp/r3-ux-errors.json`）**

| 场景 | toast 原文 | 外观 | 按钮 | 消失 | 截图 |
| :--- | :--- | :--- | ---: | ---: | :--- |
| 接口 401 | `模型接口返回 401：{"error":{"message":"Authentication Fails, Your api key: ****1234 is invalid","type":"authentication_error"}}` | 640px 宽，灰字 `rgb(86,92,97)`、白底，**无 `is-error`** | 0 | 5.93s | `ux-1440-error-401.png` |
| 接口 500 | `模型接口返回 500：<html><body><h1>500 Internal Server Error</h1></body></html>` | 同上，530px | 0 | 6s | `ux-1440-error-500.png` |
| 断网 / 连不上 | `Failed to fetch` | 同上，112px，英文无主语 | 0 | 5.93s | `ux-1440-error-offline.png` |
| 保存（无磁盘路径） | `这篇没有磁盘句柄，已下载一份副本；要写回原文件，请用「打开文件夹」打开它所在的目录。` | 同上，559px；`dirty` 仍为 true | 0 | 6s | `ux-1440-save-copy.png` |
| 保存失败（写 blob 抛错） | **没有 toast**，只有未捕获 `pageerror` | — | — | — | — |
| 导出成功 / 导出失败 | **两次都没有 toast**；失败时只有 `pageerror` | — | — | — | `ux-1440-export-fail.png` |

- 代码：`src/lib/ai.ts:65` 把响应体前 200 字直接拼进 Error；`src/App.tsx:538`、`:1062`、`:1026`、`:1036` 全部 `setNotice(messageOf(error))`；`src/App.tsx:1985` 用正则 `/失败|错误|无法|不能/` 猜是否加 `is-error`，401 与 `Failed to fetch` 都不匹配，所以和普通提示同色；`:839` 固定 6 秒清空，无关闭按钮；`:1315-1347`（`downloadFile` / `exportAs`）没有 `try/catch` 也没有成功提示；`:1067-1077` 的「无句柄」分支不在 try 内，抛错就静默。
- 影响：第一次用就填错 Key 的概率很高；用户看到的是一段 JSON，6 秒后消失，既不知道错在哪，也没有「打开设置」的入口。保存与导出的失败连提示都没有。

**改法**

1. 新建 `src/lib/errorCopy.ts`（约 30 行），把错误映射成「原因 + 下一步」：

| 场景 | 应该怎么说 |
| :--- | :--- |
| 401 / 403 | 「API Key 无效或没有权限。打开设置检查 Key 和接口地址。」+ 按钮「打开设置」 |
| `Failed to fetch` / `TypeError` | 「连不上接口地址。检查网络，或确认设置里的「接口地址」没填错。」+ 按钮「打开设置」 |
| 其它 HTTP 状态 | 「模型接口返回 {status}。稍后重试；还不行就换模型或接口地址。」（原始响应只放 `title`） |
| 保存无磁盘路径 | 「这篇还没有磁盘路径。副本已下载到「下载」文件夹；要写回原文件，先用「打开文件夹」打开它所在目录。」 |
| 保存 / 导出失败 | 「保存失败：{中文原因}。改动还在，可以再试一次。」/「导出失败：{中文原因}。」 |
| 未知错误 | 「操作没成功。再试一次；还不行请把这句话发给开发者。」（附错误码，不铺原文） |

2. toast 升级为 `{ text, kind: 'info' | 'error', action?: { label, onClick } }`；错误用 `role="alert"`、**不自动消失**（或给关闭按钮），普通提示保持 6 秒。删掉 `App.tsx:1985` 的正则。
3. `exportAs` 与保存的无句柄分支各包一层 `try/catch`；导出成功后 toast「已导出 未命名.md」。
4. 401/403 时给「打开设置」按钮，一键把 `setSettingsOpen(true)`。

**难度 M。** 文案映射 S；toast 动作槽与不自动消失 M；两处 `try/catch` S。

## 3. U3 第一次使用三处状态互相矛盾，且没有「新建 / 另存为」（难度 S 文案 + M 能力）

**实测（`.tmp/r3-ux-main.json` → `first` / `demo` / `entries`）**

- 打开页面（1440，`ux-1440-first.png`）：文档名 **`未命名.md`**，文件树写 **「还没有打开文件夹」** + 三个按钮（打开文件夹 / 打开文件 / 试用示例），正文却已有 **230 字示例内容**《侧灯》，页边栏写「未配置 API Key…」。三处说法不一致：树说没打开东西，正文有东西，名字叫「未命名」。
- 点「试用示例」（`ux-1440-demo-opened.png`）：树变成「示例文集 + 5 个文件」，但
  - 文档名仍是 **`未命名.md`**；
  - 正文长度 **230 → 230，一字未变**；
  - 树里 **没有任何一项处于选中态**（`aria-current` 全为 null，无 `is-active` 类）。
- 再点「关于侧灯.md」：文档名变 `关于侧灯.md`，正文变《侧灯是什么》（`ux-1440-demo-file-open.png`）。说明「试用示例」只换了树，没打开文件。
- 代码：`src/App.tsx:1891-1894` 的 `onOpenDemo` 只做 `setWorkspace(demoWorkspace())`；`src/components/FileTree.tsx:111-129` 空状态只有 3 个按钮。
- 全页 24 个按钮里 **没有「新建」「另存为」「新文档」**，页面任何位置也没有这两个词。

**改法**

1. S：`onOpenDemo` 顺手打开示例里的第一篇（`requestLoad(demoWorkspace().files[0]...)`），让文档名、树、正文一致；树项加 `aria-current="true"` + `.is-active`。
2. S：首个文档名写「示例 · 未命名.md」，或页边栏加一条「当前是示例，可以直接改」。
3. M（能力，需产品负责人点头）：文件树空状态加第四个按钮「新建」，顶栏「⋯」加「另存为」。都只走已有 `requestLoad` / FSA 路径，不引依赖。

**难度 S / M。**

## 4. U4 键盘：到正文 21 次 Tab，无 skip link，快捷键只写在一个会被替换的示例里（难度 S）

**实测（`.tmp/r3-ux-main.json` → `keyboard`，`.tmp/r3-ux-small.json` → `keys`）**

- Tab 序列：`分析本段 → 导出 → 保存 → 设置 → 插入 → H1 → H2 → B → I → S → </> → 专注 → 打字机 → 源码 → 预览 → 文件 → 大纲 → 打开文件夹 → 打开文件 → 试用示例 → 正文（第 21 次）`。**21 次**，与上轮一致。
- skip link：`a[href^="#"]` = **0**，`nav` / `[role=navigation]` = **0**，地标只有 `HEADER.topbar`。
- `aria-keyshortcuts` = **0**。带 `Ctrl` 的 `title` 只有 1 个（预览 →「只读预览（Ctrl+Shift+P）」）；B / I / S / `</>` 的 title 只写「粗体 / 斜体 / 删除线 / 行内代码」，不写键位；「保存」「设置」「导出」「分析本段」没有 title。
- 完整的 `Ctrl+Enter / Ctrl+B / Ctrl+S` 只出现在示例正文《快捷键》一节里；用户改成自己的文档后这页就没了。
- 已修的部分：焦点环 `2px solid rgb(43,109,100)`、offset 2px，亮色下清楚；设置框 Esc 后焦点回「设置」。

**改法**

1. S：`<a class="skip-link" href="#editor">跳到正文</a>` 作为 `.app` 第一个可聚焦元素，聚焦时显示在左上；给 `.tiptap` 加 `id="editor"` 与 `tabindex="-1"`。
2. S：按钮补 `aria-keyshortcuts` 与 title。实际绑定：`B` = Control+B、`I` = Control+I、`S`（删除线）= Control+Shift+S、`</>` = Control+E（Tiptap 默认）；应用自绑的是 Control+S 保存（`App.tsx:1172`）、Control+Enter 分析、Control+Shift+P 预览（`:1166`）、Control+F / Control+H 查找（`:1177`）。照这张表写 title 与 `aria-keyshortcuts`。
   另：查找没有可见入口，只能记 Control+F；顺手在工具条加一个「查找」按钮。
3. S：顶栏加「帮助」按钮（或 `.topbar` 末位「?」），点开一张快捷键表；不引依赖，用现有 `.menu` 样式。
4. S：工具条右键/长按给同样提示，成本低可后做。

**难度 S。**

## 5. U5 仍小于 12px 的文本：9 类，其中 3 类必须抬（难度 S）

**实测（`.tmp/r3-ux-small.json`，三个状态扫描：默认 / 设置打开 / 有批注）**

| 位置 | 字号 | 当前文本 | 判断 |
| :--- | ---: | :--- | :--- |
| 设置对话框 6 个字段名 | 11.5px | 接口地址 / API Key / 模型 / 正文字号 / 联网核对 / 批注提示词 | **必须抬到 12px**（表单标签，要反复读） |
| `.field-hint` 信任提示 | 11.5px | 「未配置：分析会用本地模拟批注」 | **必须抬**（这是 U1 信任修复的关键句） |
| `.rail-goal-text` 批注目标 | 11px | 「给一个观点补理由。」 | **必须抬**（指令性文字） |
| 侧栏页签「文件 / 大纲」 | 11.5px | 文件、大纲 | **建议抬**（导航，天天点） |
| `.rail-title` | 11.5px | 侧灯 | 可留（0.5px 差，视觉无感） |
| `.rail-count` | 11.5px | 2 条 | 可留 |
| `.rail-notice` | 11.5px | 「有 1 条没能在正文里定位，已丢弃。」 | 建议抬（是错误类信息） |
| `.rail-empty-sub` | 11.5px | 「批注会停在对应的句子旁边。」 | 可留 |
| `.toolbar button.mono` | 11px | `</>` | 可留（符号不是正文） |

- 定位：`.field-hint` `src/styles.css:807`、`.rail-goal-text` `:1474`、`.sidebar-tabs button` `:909`（`:913` 为字号）、`.rail-title` `:496`、`.rail-count` `:505`、`.rail-notice` `:510`、`.toolbar button.mono` `:862`（`:864` 为字号）。
- 10px 只剩两处 `::before` 装饰（`styles.css:1340`、`:1351`），不含用户文本，不动。
- 已修对比：状态栏 12px、`.dialog-note` 12px、`.doc-name` 12px、工具条按钮 12px，上轮的 10.5px 批注卡头已消失。

**改法**：把上表「必须抬 / 建议抬」7 处统一改成 12px；同时定义 `--text-xs: 12px` 变量替换散落的数字，下次不再改漏。顶栏 46px、工具条 38px 是固定高度，12px 不撑破布局（实测已有机型就是 12px）。

**难度 S。**

## 6. 第一次使用 30 秒路径（不读 README）

| 步骤 | 实测 | 困惑点 |
| :--- | :--- | :--- |
| 打开 | 直接可编辑的示例正文，焦点在 BODY（光标未进入） | 这是「我的文档」还是「示例」？名字叫「未命名.md」，树上写着没打开文件夹 |
| 写下第一句 | 点正文（39ms 进入）+ 输入 = **2 个动作** | 没有卡点；这是产品优点，别改 |
| 保存/导出在哪 | 顶栏右侧「导出 ▾ / 保存 / 设置」；1440 下清楚，1024 下「保存」「设置」不可见 | 窄窗用户会以为没有保存 |
| 试用示例 | 树换了、文档名和正文没换、也没有选中项 | 点了没反应 → 用户会再点一次 |
| 新建 | 没有入口 | 想从零开始只能删光示例正文，然后仍叫「未命名.md」 |
| 没有 Key 就分析 | 有「（模拟）」标注与 rail 提示（上轮已修） | 无 |

## 7. 代码优化机会（最多 3 条）

### C1 「Blob + a.download」写了两遍，且两处都没有错误处理（难度 S）

- `src/App.tsx:1067-1073`（保存副本）与 `src/App.tsx:1315-1323`（`downloadFile`）逐行几乎相同。
- 抽出 `saveBlob(name, content, type): void`，内部包 `try/catch`，返回是否成功；保存、导出、打印三处共用。U2 的「导出/保存失败提示」直接落在这一个函数里，净减约 10 行。

### C2 toast 用正则猜错误（难度 S）

- `src/App.tsx:1985`：`/失败|错误|无法|不能/.test(notice)`。实测 401 / `Failed to fetch` 都不命中，所以「错误」和「提示」长得一样。
- 改成 `notice: { text, kind, action? }` 对象，`kind` 由调用点决定（约 20 个 `setNotice` 调用点里只有 9 个是错误路径，逐个改即可）。正则删掉，顺带解决 U2 的一半。

### C3 字号数字散落 22 处（难度 S）

- `styles.css` 里有 22 条 `font-size: 10px | 11px | 11.5px` 声明，没有变量。U5 每次只改一处就会漏。
- 定 `--text-xs: 12px`、`--text-sm: 12.5px` 两个变量并替换，配合 U5 一次收口；约 20 行改动，零布局风险。

## 8. 未验证 / 下一轮补

1. 宿主（WebView2）里的导出：浏览器 `anchor.download` 成功；宿主若没接 `DownloadStarting` 可能静默无文件（U2 的静默失败在宿主里更危险）。
2. 真实 DeepSeek 的 401 响应体：本轮用同源路由伪造，格式按 OpenAI 兼容写。
3. 文件系统真写失败（权限被撤、磁盘满）：无头浏览器无法触发 `createWritable` 失败，本轮用「blob 抛错」验证的是无句柄分支。
4. 中文输入法、125% 缩放、`prefers-reduced-motion`。
5. 1024 下 `overflow: 0` 的修法是在页面里注入 CSS 验证的，未落地到 `src/`；`ux-1024-proposed-fix.png` 可作实施后的对照图。
