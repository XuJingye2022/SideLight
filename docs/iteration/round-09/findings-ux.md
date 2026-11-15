# 第 09 轮 · 体验与界面发现（最近文件）

侦察者：`r9-ux`。只读 `src/`、`host/`。基线 commit `47e5602`（0.21.0）。
环境：应用 `http://localhost:5173`，CDP `http://127.0.0.1:9223`（headless Edge 157）。未跑 `npm run build`，未装依赖。
宿主本轮还没实现 `/__recent`，所以「最近文件」的界面用**运行时注入的 DOM 原型**测量（脚本 `.tmp/r9-ux/probe3.mjs`、`shot-final.mjs`）。原型里的行高、截断、滚动都是真实 CSS 算出来的，不是估算。

**结论（五条，按影响排序）**

1. **U1 菜单没有高度上限，8 条最近会把菜单拉到 584 px；窗口高度 ≤ 620 px 时底部行被裁掉，滚轮完全无效。** 键盘能把整个界面顶上去凑到，鼠标做不到。
2. **U2 最近条目必须能区分同名文件：用「文件名 + 父目录」两行。** 单行版会把父目录挤到右侧先截短，恰好切掉最有区分度的最后一段。
3. **U3 空态与清除要给三态各自的界面**：无宿主 / 有宿主无记录（190 px）/ 有记录（584 px）。清除不弹模态，关菜单 + toast；toast 的「撤销」按钮组件已经现成（`App.tsx:3326-3329`）。
4. **U4 浏览器降级直接隐藏整段，不要放禁用行。** `button:disabled` 的 0.4 透明度把说明文字压到 **1.74:1** 对比度，等于没写。宿主在但读不出列表时，反过来必须显示一行原因。
5. **U5 键盘已经够用**：现有处理器能遍历注入的 12 项（↓/↑/Home/End/Esc 实测全通），只要最近行写成 `<button role="menuitem">` 就自动接上。要守住「最近块放在 4 个动作之后」，否则首焦点不再是「新建」。

方法与证据目录：

- 度量脚本：`.tmp/r9-ux/probe.mjs`（现状 4 项）、`probe2.mjs`（键盘遍历）、`probe3.mjs`（短窗口裁切/滚轮/点击/补丁验证）、`shot-final.mjs`（三档终图）。
- 截图：`shots/round-09/`。带 `menu-recent-` 前缀的是**运行时注入的原型**，不是已实现的界面；`menu-current-4items-*` 是现状实拍。
- 度量口径：Chromium 视口 1440×900 / 1280×800 / 1024×768，加两档短窗 1024×600、960×500；菜单原点 `y=38`（触发器 y=8、高 29、`top:30px`）。

---

## 1. 菜单结构（任务 1）

### 建议结构

```
新建                          Ctrl+Alt+N
另存为…                        Ctrl+Alt+S
打开文件…                      Ctrl+Alt+O
打开文件夹…                    Ctrl+Alt+Shift+O
──────────────────────────────
最近打开                                  ← 小标题，12px，不可聚焦
未命名.md                                  ← 12.5px，单行省略
文档\草稿                                   ← 12px，--ink-faint，单行省略
未命名.md
文档\归档\2025
…（共 8 条）
──────────────────────────────
清除最近记录                              ← 整行，--ink-faint
```

放**在四个动作之后**，理由三条：

1. 打开菜单后的首个焦点仍是「新建」，方向键的肌肉记忆不变（现状 `FileMenu.tsx:28` 聚焦第一项）。
2. 短窗口被裁时，牺牲的是列表尾部，不是「新建 / 打开文件」。
3. 「最近打开」本身是打开动作的延伸，读起来是「新建 → 打开 → 最近」。

反例（不推荐）：把「最近打开」放最上面（VS Code 风格）。方向键按一下落到第一个最近文件，和现有习惯冲突；裁切时先丢的是主操作。

### 实测高度

| 方案 | 菜单高度 | 底边 | 1440×900 | 1280×800 | 1024×768 | 1024×600 | 960×500 |
| :--- | ---: | ---: | :--- | :--- | :--- | :--- | :--- |
| 现状 4 项 | 130 px | 168 | 放得下 | 放得下 | 放得下 | 放得下 | 放得下 |
| +8 条，两行（推荐） | **584 px** | 622 | 放得下 | 放得下 | 放得下 | **裁 17 px** | **裁 117 px** |
| +8 条，单行 | 440 px | 478 | 放得下 | 放得下 | 放得下 | 放得下 | 放得下 |
| 空态（标题 + 一行提示） | 190 px | 228 | 放得下 | 放得下 | 放得下 | 放得下 | 放得下 |

- 两行方案的行高 **47.9 px**（8 条 = 383 px），标题 24 px，两条分隔各 9 px，清除行 30 px。
- 结论：窗口高度 ≥ 630 px 放得下（菜单底边 622 + 8 px 余量）；更矮必须靠 U1 的 `max-height`。1366×768 与 1024×768 都不用滚。
- 会不会折行：不会。`.file-menu button span` 是 `white-space: nowrap` + `text-overflow: ellipsis`（`styles.css:333-338`），两行版也逐行 nowrap。宽度上限 360 px，名称可用宽度 330 px（约 26 个汉字）。

图：`shots/round-09/menu-recent-final-1440x900.png`、`shots/round-09/menu-recent-final-1280x800.png`、`shots/round-09/menu-recent-final-1024x768.png`；现状 `shots/round-09/menu-current-4items-1440x900.png`、`-1280x800.png`、`-1024x768.png`。

---

## U1 菜单没有高度上限：8 条之后，短窗口里的行被裁掉且滚不回来（影响：高）

**证据**

- `styles.css:319-326`：`.file-menu` 有 `max-width`，**没有 `max-height`**，`overflow: hidden`。`.app` 同样是 `overflow: hidden`（`styles.css:91-97`）。
- 1024×600：菜单 584 px、底边 622，「清除最近记录」底边 617，**超出视口 17 px**。
- 1024×600 上在菜单里滚轮 300 px：`menuScrollTop` 仍是 0，位置不动 —— `overflow: hidden` 不吃滚轮。
- 960×500：清除行超出 **117 px**。鼠标点不到；Playwright 的 `click()` 能成功，是因为它会 `scrollIntoView`，真人没有这条路。
- 键盘 `End` 能到，但代价是**整个应用被顶上移 122 px**：菜单 `y` 从 38 变成 −84，顶栏、品牌、「新建/另存为」全部移出可视区。见 `shots/round-09/menu-recent-short-window-endkey-960x500.png`、`shots/round-09/menu-recent-short-window-1024x600.png`。
- 补丁验证：同一页面注入 `.file-menu{max-height:calc(100vh - 46px);overflow-y:auto}` 后，菜单高 554/454，滚轮生效（`scrollTop` 30/130），`End` 与点击都正常。见 `shots/round-09/menu-recent-short-window-patched-1024x600.png`、`shots/round-09/menu-recent-short-window-patched-960x500.png`。

**用户影响**：写作时常把窗口放半屏（960×500 很常见）。这时「清除最近记录」和最后两条最近文件看不见、点不到，用户会以为功能残缺。

**改法**（`src/styles.css:319`，一条规则）

```css
.file-menu {
  top: 30px;
  z-index: 30;
  width: max-content;
  min-width: 208px;
  max-width: min(360px, calc(100vw - 24px));
  /* 38 px 是菜单原点，留 8 px 余量；短窗口里滚轮能滚到底 */
  max-height: calc(100vh - 46px);
  overflow: hidden auto;
  overscroll-behavior: contain;
}
```

- `overflow: hidden auto` 保留横向裁切（圆角），纵向可滚。
- 想更稳可另做「四个动作固定、只有列表滚动」，但要拆出 `.menu-recent-list` 子滚动容器，多一层 DOM 与焦点处理；本轮不必。
- 副作用检查：菜单滚动时首行可被滚出视野（`shots/round-09/menu-recent-short-window-patched-1024x600.png` 里「新建」被滚掉一半）。这是可接受代价；短窗口才会发生。

**难度**：S（1 条 CSS，无 TSX 改动）。**验收**：1024×600 与 960×500 打开菜单 → 滚轮能滚到「清除最近记录」；`End` 后整个界面不位移。

---

## U2 同名文件无法区分：必须「文件名 + 父目录」两行，并带 `title`（影响：高）

**证据**

- 页面现在只知道 `fileName`（`App.tsx:187-193` 的 `HostDoc`，注释写明「页面不拿完整路径」）。两条 `未命名.md` 在没有父目录时**完全一样**：`shots/round-09/menu-recent-final-1440x900.png` 前两行就是这种情况的原型。
- 单行方案（名称左、目录右）实测：目录被压到右侧后先截短，`文档\归档\2025` 尚可，但 `长文\小说\第一卷` 显示成 `长文\小说…`、`工作\会议\2026-11` 显示成 `工作\会…` —— 恰好切掉最能区分的那一段。见 `shots/round-09/menu-recent-oneline-1440x900.png`。
- 两行方案实测：名称行 330 px 内截断（376/470/348 px 的长名都触发省略号），目录行独占 330 px，8 条样本里**没有一条目录被截**（最长 92 px）。只有塞进完整路径才会到 315 px —— 契约本来就不给完整路径。
- 名称截断是**尾部省略**：`第三章-关于那个在深夜里反复修改开头的作者最终决定删…`。中文标题的区分信息常在尾部，所以 `title` 不是可选项。

**改法**

数据契约（给宿主，配合「页面不拿完整路径」）：

- `/__recent` 只回 `{ id, name, dir, mtime }`。`dir` 是**最后 1–2 段**（如 `文档\草稿`），不带盘符、不带完整路径。
- 点开时页面只回 `id`，宿主自己把 `id` 解析成路径。这样页面从头到尾拿不到完整路径，`title` 也不会泄露。
- 冲突兜底：两条 `name + dir` 相同时，宿主把这两条的 `dir` 扩到 3 段（或加盘符）。这是宿主侧去重，不要让页面猜。

行结构（`FileMenu.tsx` 里与现有 4 项并列）：

```tsx
<button
  type="button"
  role="menuitem"
  className="recent-item"
  title={`${item.name} · ${item.dir}`}
>
  <span className="recent-name">{item.name}</span>
  <span className="recent-dir">{item.dir}</span>
</button>
```

```css
/* src/styles.css：紧跟 .file-menu 规则 */
.file-menu .recent-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 1px;
  padding: 5px 9px;
}
.file-menu .recent-name,
.file-menu .recent-dir {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}
.file-menu .recent-dir {
  font-size: var(--text-xs);   /* 12px，styles.css:22 的约定 */
  line-height: 1.35;
  color: var(--ink-faint);
}
```

- 必须覆盖 `.file-menu button` 的 `display:flex; justify-content:space-between`（`styles.css:1049-1055`），否则两行会横排。
- 目录文字对比度实测 **5.23:1**（浅色 `--ink-faint` on `--paper-raised`）、**6.26:1**（深色），12 px 正文达标；不要用 11 px 或 `opacity` 调淡。

**难度**：M（宿主多一个字段 + 一行 CSS 变体 + `title`）。**验收**：两条同名文件肉眼可分；长名有 `title`；1024 宽下名称不越出 360 px。

---

## U3 空态与清除：三态三套界面，清除不弹模态（影响：中）

**证据**

- 现状没有最近段，4 项菜单 130 px（`shots/round-09/menu-current-4items-1440x900.png` 等三档）。
- 空态原型：标题 + 一行「还没有最近文件。打开文件后，它会出现在这里。」→ 190 px，不换行、不挤（`shots/round-09/menu-recent-empty-1440x900.png`）。
- 清除组件已具备条件：`notice` 支持 `action`（`App.tsx:180`），toast 会渲染「撤销」按钮（`App.tsx:3326-3329`）。
- 菜单一关焦点回触发器（`FileMenu.tsx:40-50, 102-105`），清除后关菜单不会把焦点掉到 body。

**改法**

| 状态 | 菜单里显示什么 | 高度 |
| :--- | :--- | ---: |
| 无宿主 | 整段不渲染（见 U4） | 130 px |
| 宿主在、0 条 | 分隔线 + 标题「最近打开」+ 一行灰字提示 | 190 px |
| 宿主在、≥1 条 | 标题 + 8 行 + 分隔线 + 「清除最近记录」 | 584 px |

清除行为：

1. 点「清除最近记录」→ 立即清空，**关菜单**（列表在鼠标下消失比留着更不乱），焦点回触发器。
2. 同时 toast：「已清除最近记录。」`kind:'info'`，6 秒。
3. 宿主能在内存里恢复列表时，toast 挂「撤销」（`action`）——页面只发 `recent-restore`，不碰路径。
4. 宿主清空失败：toast 用 `kind:'error'`，「清除失败：<原因>。最近记录还在。」菜单保持原样，不要假装成功。
5. 失效路径（文件被移走/删掉）：toast「文件不在了：<名称>。已从最近记录中移除。」+ 该行立即消失；不要只报「打开失败」。

不弹模态的理由：清除只删列表，不删文件；模态在菜单上要处理层级与焦点陷阱；toast 已经能撤销。

**难度**：S（菜单标记 + 两条 toast 文案）。**验收**：清空后重开菜单见空态；toast 出现并在 6 秒后消失；清空失败时列表不消失。

---

## U4 浏览器降级：直接隐藏；宿主出错才显示原因（影响：中）

**证据**

- 宿主判定现成：`window.chrome?.webview`（`App.tsx:1852-1853`、`2228`），浏览器里是 `undefined`。
- 禁用行原型：两行文字整块 0.4 透明度（`styles.css:116-119`），实测对比度 **1.74:1**（`--ink-faint` 0.4 透明度叠在 `--paper-raised` 上）。这不是「灰一点」，是读不清。见 `shots/round-09/menu-recent-browser-disabled-1440x900.png`。
- 现有界面里，宿主专属的东西都是**隐藏**不是禁用：写回横幅、状态栏文件名、草稿恢复提示。唯一的「禁用 + `title` 解释」是「分析」按钮（`App.tsx:2864-2880`，那是临时不可用，不是平台缺失）。

**改法**

- 无 `window.chrome?.webview` → **不渲染**「最近打开」整段：没有标题、没有禁用行、没有「仅桌面版」字样。菜单保持 130 px。
- 有宿主但 `/__recent` 失败（宿主版本旧、请求超时）→ 必须显示一行原因，且用正常颜色（`--ink-soft`），不要 `disabled`：
  「最近文件读不出来，重开应用再试。」
  这种情况不能静默隐藏，否则用户以为功能没做。
- 判定分三档：`no-host` / `host-error` / `host-ok`。不要用「列表为空」当 `host-error` 的替身。

**难度**：S（一个条件渲染 + 一条错误分支）。**验收**：浏览器里文件菜单无「最近」字样；模拟 `/__recent` 500 时显示错误行且菜单可继续用。

---

## U5 键盘：现有处理器已经覆盖，守四条约定即可（影响：中低）

**证据**（`probe2.mjs`，在真实菜单里注入 8 条最近 + 清除，共 12 个 `[role="menuitem"]`）

- `ArrowDown` 连按 12 次，焦点依次走过 4 个动作 → 8 条最近 → 清除，**不跳过、不卡住**。`Home`/`End` 到首/尾。`Escape` 关闭并把焦点还给「文件 ▾」（`afterEsc.active === file-menu-trigger`）。
- 现有实现只在 `menuRef` 内查 `[role="menuitem"]`（`FileMenu.tsx:85`），所以只要行带这个角色就自动接上；不用改键盘代码。
- 短窗口下 `End` 到末项会让 `.app` 整体上移（见 U1），补上 `max-height` 后消失。

**四条约定**

1. 最近行必须是 `<button type="button" role="menuitem">`。Enter / Space 免费获得。
2. 标题「最近打开」用 `<div role="presentation">`，分隔线用 `<div role="separator">`。**都不要加 `menuitem`**，否则方向键会在不可点的行上停。
3. 最近块放在 4 个动作之后，首个焦点仍是「新建」（`FileMenu.tsx:28`）。
4. 点完一条最近文件：关菜单，焦点按动作归还（打开文档给正文，其余给触发器）；宿主 reload 的情况无所谓。不可用的行不要 `role="menuitem"`，也不要 `disabled`（理由同 U4）。

**跨组提醒**（不是界面的活，但会决定体验）：从最近重开必须走现有脏检查 —— `requestSave` 的 `'switch'` 目标与 `pendingSwitch` 对话框（`App.tsx:1807-1831`、`3469-3481`），不能绕开，否则用户丢字。

**难度**：S（标记约定，无逻辑改动）。**验收**：↑↓ Home End Esc 在 12 项菜单里全通；Esc 后焦点在触发器上。

---

## 6. 已核查、结论是「不用改」

- 4 项菜单在 1440/1280/1024 三档都是 223×130，无横向溢出，右边界 319 px（加到 360 px 宽后是 456 px，仍不越界）。
- 菜单宽度上限 360 px 在 1024 宽下不越界（菜单 x=96）。
- `title` 会写进 DOM（原型里逐条确认），但 headless 不出系统 tooltip，只验证到属性层。
- 菜单按钮字号 12.5 px（`button` 基础样式 `styles.css:99-109`）；小字统一 `--text-xs` = 12 px（`styles.css:22`）。
- `menu-recent-*` 原型没有页面报错：`probe3.mjs` 零 console error / 零 pageerror；`probe2.mjs` 只有一条 Edge 扩展自己的 `chrome-extension://…/offscreenTranslate.js` 报错，与本项目无关。

## 7. 界面代码优化机会（3 条）

1. **菜单键盘逻辑写了两遍**：`FileMenu.tsx:84-106` 与 `App.tsx:2896-2916` 逐字重复。导出菜单还少了 `role="menuitem"`（`App.tsx:2918` 起），查询用全局 `document.querySelectorAll('.export-menu button')`（`App.tsx:2897`），作用域比 `menuRef` 版松。抽一个 `useMenuNavigation(menuRef, close)` 或 `<MenuItem>`，两处共用；本轮给文件菜单加 12 项后，这份重复的维护成本只会更高。
2. **快捷键有三份真相**：`FileMenu.tsx:11-14` 的 `keys`、同处的 `keyshortcuts`、`App.tsx:2323-2342` 的处理器。改一个键位要改三处。抽 `FILE_ACTIONS: { id, label, keys, run }`，`keyshortcuts` 由 `keys.replace('Ctrl', 'Control')` 生成，处理器按 `id` 分派。
3. **CSS 小重复**：`.file-menu{top:30px}`（`styles.css:320`）重复 `.menu{top:30px}`（`styles.css:1030`），只该留差异部分（宽度、分隔线、行高）。新加的目录小字统一用 `var(--text-xs)`，不要再散写 11 px。

## 8. 未验证

- 真实宿主里的 `/__recent`（本轮还没实现）：空态、错误态、清除都只用 DOM 原型量过，没有端到端。
- 原生 tooltip 的视觉（headless 不渲染系统 tooltip），只确认 `title` 属性存在。
- 屏幕阅读器如何朗读「名称 + 目录」两行的可访问名（预期拼成「未命名.md 文档\草稿」，未实测）。
- 真人鼠标在短窗口里够不着底部行的感受：滚轮已实测无效、`getBoundingClientRect` 已证明越界；Playwright 的 `click()` 会自己 scrollIntoView，不能当真人证据。
