# 第 68 轮 Typora 对照侦察（finder-typora）

HEAD `ffaae68`；只读，未改产品代码。实测端口 9223（先 `node .tmp/reset.mjs 9223`）。证据日志：`.tmp/r68-typora-gap.log`、`.tmp/r68-typora-mktable.log`、`.tmp/r68-gapcount.log`。

**结论：0 个 P0/P1。** 差距表计数本轮自洽（`node .tmp/r68-gapcount.mjs`：已有 39 行 = 表头（39），缺 5 行 = 表头（5），子节 2+1+2 = 5），没有计数过期。新发现 3 条，全是 P2 / 差距表文档。

## F1 表格列对齐：能保留、能显示，但没有任何入口设置（P2，差距表缺行）

- Typora：表格工具条可选 Default / Left / Right / Center，写进 `td` 的 `style="text-align: …"`（`.tmp/typora-ref/resources/Docs/Table Editing.md:54-66`）。
- Sidelight 载入含对齐的表格能渲染、能保住写法：载入 `| ------- | :---- | ----: | :----: |` 后 `td` 计算样式 `text-align: right` / `center`（`style="text-align: …;"` 在 DOM 上）。
- 但没有设置入口：表格工具条 7 个按钮只有「上插入 / 下插入 / 左插入 / 右插入 / 删行 / 删列 / 删表」（`src/App.tsx:5526-5551`）；`git grep -nE "对齐" -- docs/typora-gap.md src/App.tsx` 0 命中；`moveRow|moveColumn|moveTable|moveSelection` 0 命中（Typora 的「Move Row/Column」拖动重排也没有）。
- 顺带实测的正向面：改表格单元格后保存，对齐写法保留（`| :---- |` → `| :----- |`，冒号不丢），只是分隔行宽度被重新补齐；无回归。
- 改法：差距表 `docs/typora-gap.md:31` 的「表格行列」一行补「列对齐只能保留、不能在应用内设置；无行列拖动重排」，或拆一行进「缺的」，计数 5 → 6。产品侧入口可后置。

## F2 表头行 + Enter 建表不支持（P2，差距表缺行）

- Typora：写 `|First Header | Second Header|` 再按回车直接建表（`Table Editing.md:18-30`）。
- Sidelight 实测：段落里打 `| 甲 | 乙 |` 再回车，仍是字面段落（`tables:0`、HTML `<p>| 甲 | 乙 |</p>`），唯一入口是工具栏「插入：表格 / 代码块 / …」。
- 差距表 0 行记录此差距（同一 `grep` 口径 0 命中）。改法：进「缺的」，P2。

## F3 角色文件里的「缺的 9 行」已过期（P2，文档）

- `.tmp/iteration/roles/finder-typora.md:13` 仍写「只报『缺的 9 行』相关」，现表 `docs/typora-gap.md:51` 是 `缺的（5）`（实测 5 行）。
- 影响：finder 会按旧数字找已经消失的 4 项（B-117/B-135 修完后表已收敛）。改法：把「缺的 9 行」改成「缺的 5 行」，或在角色文件里改成引用表头计数、不写死数字。

## 复核过、未成条的点

- 代码块语言高亮：仍在缺表（`docs/typora-gap.md:57`，P1），但 BACKLOG `B-135` 是 `deferred`，属已入池，不重复计数。
- 差距表「表格行列」其余描述（Tab 走格、Ctrl+Enter 加行、Ctrl+L 删行、表头边界拖拽改列宽）与 `src/App.tsx:988-994`、`ShortcutsDialog` 一致，未发现新的过期。
- UNVERIFIED：真实表格工具条按钮的可读文案只在源码核对，未截图（无视觉回归需求）；表头行 Enter 建表只测了普通段落路径。
