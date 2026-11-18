# 第 70 轮 Typora 对照侦察（finder-typora）

轮前 startSha `605b5ff`（实测 HEAD 同值）；只读，未改产品代码。实测端口 9223（每次先 `node .tmp/reset.mjs 9223`）。证据：`.tmp/r70-typora-link.json`、`.tmp/r70-typora-table-toc-gap.json`、`shots/round-70/preview-link-before-click.png`。

**结论：0 个 P0/P1。** 差距表计数自洽：`node` 逐行数 `docs/typora-gap.md` 得「已经有的（39）」39 行、「缺的（5）」5 行（子节 2+1+2=5），与表头、`AGENTS.md:72` 的 39/5 一致，无过期计数。新发现 1 条，P2。

## F1 编辑视图里打不开链接：Ctrl+单击也只弹就地编辑（P2，差距表缺行）

- Typora 的一对规则是「单击展开编辑、Cmd/Ctrl+单击在浏览器打开」（`.tmp/typora-ref/resources/Docs/Markdown Reference.md:250`；同文件 `:221` 补：`#锚点` 也用 Ctrl+单击跳转）。Sidelight 只做了前半：`handleClick` 对任意 `<a>` 无条件 `preventDefault()` 再开浮层，没有 ctrlKey/metaKey 分支（`src/App.tsx:1082-1090`）；`src/`、`host/` 里 `window.open` / `shell.openExternal` / 打开浏览器的调用 0 命中。链接浮层只有「文字 / 地址」两个输入框与 Enter/Esc 提示（`src/components/LinkEditor.tsx:42-116`），没有「打开」按钮。
- 实测（`node .tmp/e2e-r70-typora-link.mjs 9223`）：造一个 `https://example.com` 链接后，编辑视图左键单击 `linkEditorCount:1`、`url` 不变；**Ctrl+单击** 同样 `linkEditorCount:1`、`url` 不变。即编辑视图没有任何打开链接的手势。
- 有绕行出口：只读预览里的 `<a>` 带 `target="_blank"`，点它是新开标签而不是把应用带走（点击后 `url` 仍是 `http://localhost:5175/`、`.preview-pane` 仍在，新标签 `https://example.com/`，见 `r70-typora-link.json` 第二条）。所以不判 P1：无数据风险、有可用出口；只是要切到预览，且与 Typora 手势不符。
- 改法（二选一）：`handleClick` 加 `if (event.ctrlKey || event.metaKey)` 用 `target="_blank"` 的临时 `<a>` 或 `window.open` 打开（`#` 锚点则在编辑器内滚到对应标题）；或先把差距表补一行：`已经有的` 里写「链接可就地编辑；Ctrl+单击不打开，打开需切只读预览」，或进 `缺的` 记 P2（计数 5 → 6）。
- UNVERIFIED：桌面宿主里 `target="_blank"` 的真实表现。`host/Program.cs` 只有 `OnNavigationStarting`（`:1810-1814`，只记日志不取消），`NewWindowRequested` 0 命中；本机宿主 `INIT-FAIL`，未验新窗口是否落在应用内、能否关闭。

## 复核过、不重复计数的点

- **表格列对齐**：第 68 轮 F1 已报「能保留能显示、无设置入口」，本轮复测仍成立（`.table-bar` 7 个按钮无对齐，`src/App.tsx:5667-5692`）。补一条正向证据：从源码视图载入 `| :--- | :---: | ---: |` 后 `th`/`td` 计算样式为 left/center/right，停笔草稿 `sidelight.doc.v1` 里仍写 `| :--- | :---: | ---: |`（`draft.hasAlign:true`）——渲染与写回都不丢，缺的只是设置入口。
- **目录层级**：Typora 的 TOC 收全部标题（`Markdown Reference.md:189-191`）。Sidelight 的 DOM 是平铺 `button.sl-toc-item`（H1/H2/H3 实测 5 条、`nestedList:0`），但带 `data-level=1/2/3`，`src/styles.css:930-941` 按 level 给缩进——视觉上等价，不记差距。
- **代码块语言高亮**：仍在缺表（`docs/typora-gap.md:57`，P1 行）但 BACKLOG `B-135` 是 `deferred`，已入池，不重复计数。
- **角色文件过期**：`.tmp/iteration/roles/finder-typora.md:13` 仍写「缺的 9 行」，第 68 轮 F3 已报、本轮仍未见改（现表是 5 行）；不重复计数，提醒批末 scribe 一并改。
- 差距表其余「已经有的」行抽查未发现新过期：全屏（`F11`，`src/App.tsx:4196`）、视图缩放、粘贴纯文本、最近文件 8 条均与实现一致，本轮未逐项重测。
