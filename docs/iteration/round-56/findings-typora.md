# 第 56 轮 Typora 对照（finder-typora）

只读。HEAD `882eb49`（轮前 startSha），dev 5175 未重启，CDP **9223**（每次 E2E 前 `node .tmp/reset.mjs 9223`）。
脚本：`.tmp/e2e-r56-typora.mjs`（日志 `.tmp/r56-typora-live.log`）、`.tmp/e2e-r56-table2.mjs`、`.tmp/r56-gap-check.mjs`（日志 `.tmp/r56-gap-check.log`）。
截图：`shots/round-56/typora-settings-themes.png`、`shots/round-56/typora-toc-emoji.png`。对照源：`.tmp/typora-ref/resources/Docs/{Markdown Reference,Table Editing}.md`。

## 0 计数核对
表头 `35` / `7` 与表体行数、子节 1/1/1/1/1/2 全部自洽（`countsConsistent=true`）。但两行现状已过期（F1/F2），另有两项 Typora 表格能力没被两表收录（F3）。

## 1 F1（P1，文档）`docs/typora-gap.md:65`「拖入文件或文件夹打开」过期
- 该行仍写「无 / P1 / 拖入 `.md` 现在有提示且不会导航（第 43 轮），仍不直接打开」。
- 代码已实现：`src/App.tsx:2490-2547` 的 `openDropped` 处理文件与目录句柄；`src/lib/workspace.ts:112-116` 文件夹→工作区。
- 本轮实测（日志 `.tmp/r56-typora-live.log`）：干净页合成 drop 一个 `.md` → 名字 `对照拖入.md`、toast「已打开「对照拖入.md」」、正文 `对照拖入\n正文`、dirty=false、URL 不变。
- 建议：整行移进「已经有的」，现状写「拖入 `.md` 直接打开（第 54 轮 B-003）；拖入文件夹开工作区（句柄路径，合成事件不可造，宿主真拖未验）」；「缺的」删该行与空子节「文件与工作区」。已有 **35→36**，缺 **7→6**。

## 2 F2（P2，文档）`docs/typora-gap.md:83`「主题」过期
- 仍写「明 / 暗 / 跟随系统三档；无自定义主题」。
- 第 55 轮 B-105 已加内置主题：设置面板实测 4 个 `role=radio`——浅色、深色、跟随系统、暖纸（`data-theme-id=sepia`，见截图）；清单源 `src/lib/themes.ts:11-14`。
- 建议现状改「浅色 / 深色 / 跟随系统 + 内置「暖纸」四套；无自定义主题（第 55 轮 B-105 MVP）」；优先级仍 P2，**计数不变**。

## 3 F3（P2，表格体验缺口）列对齐无编辑入口、行/列不能拖拽移动，差距表未收录
- Typora：`Table Editing.md:54-66` 表格工具条上点对齐图标改列对齐；`:68-70` 拖边线移动行/列。
- Sidelight 实测：打开 `| :--- | :---: | ---: |` 的表格，`th`/`td` computed `text-align` 分别为 left/center/right（`.tmp/e2e-r56-table2.mjs` 输出），即**能显示**对齐；但表工具条只有 7 钮（上插入 / 下插入 / 左插入 / 右插入 / 删行 / 删列 / 删表，`src/App.tsx:5294-5320`），**没有改对齐的入口**；`src/` 无 moveRow/moveColumn（grep 0 命中）。
- 建议：差距表「查找与表格操作」补两行——列对齐编辑入口（P2）、拖拽移动行/列（P2）；缺 **6→8**。或先记 BACKLOG 再排。

## 4 复验（不新增条目）
- TOC/emoji：`:53` 仍准确。实测 `[toc]`+回车、`:smile: hello` 都是字面文本（`tocLiteral/emojiLiteral=true`、无 `.toc` 元素），与 B-106 open 一致。
- 主题相关：F2；整页缩放（`:44`）、全屏（`:45`）行与实现无冲突，未改。
- 空白页载入即报 4 条错误（`Cannot read properties of undefined (reading 'id'/'url')` 与 `OfscreenTranslate…chrome-extension://…` 扩展脚本）。第 55 轮 delta 在 9226 记 0 错误，故判为 9223 profile 的扩展噪声，不计入发现；与产品的关系 UNVERIFIED。

## 5 UNVERIFIED
- 真实拖放带 `getAsFileSystemHandle()` 的文件夹句柄（合成事件造不出），以及宿主 WebView2 内的拖入与表格对齐渲染。
- 真机 Typora：只对照解包资源，未跑 Typora 本体。
