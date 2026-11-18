# 第 75 轮 缺陷猎人提案（finder-bug）

- 轮次：round=75；startSha=`e5dd887a1f9ff2ca0f7ef4c209bc4dfcfd646f2d`（HEAD 一致）；2026-11-19
- 环境：dev `http://localhost:5175` 回 200；**CDP 9222–9226 全部 DOWN**（一次探测，不重试）→ 全部结论为静态核查，运行时标 UNVERIFIED
- 门禁：`npm test` 通过（41 文件 / 536 条 / 0 失败，exit 0）；本轮不改代码，未跑 build
- 去重：已读同目录 `findings-code.md` 与 `proposal-ui.md`。两表已覆盖 10 条 open P2 中的 8 条（B-103/106/107/110/121/122/126/134/109）与 B-139/B-153。本文只提它们**没有**的 3 条，另 5 条作为交叉印证（= 两三位提案者都指向，批 1 首选）
- 边界：用户 3 条（行内公式、`==高亮==`、行间公式观感）已在 round-73/74 队列，不重复；BACKLOG 无 open P0/P1（B-135 是 deferred P1，需先批依赖），本表 8 条全 P2

## 提案（8 条，按优先级）

| # | ID | 区域 | 一句话 | 其他提案者 | 关键静态证据 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | B-142 | 界面 | 删除后的「撤销」入口被下一条提示顶掉 | 仅本表 | `src/App.tsx:2913-2938`、`:3088-3093` |
| 2 | B-134 | 导出 | HTML 导出无目录、字面 `[TOC]` 进产物 | 3/3 共识 | `src/App.tsx:4817`、`src/lib/tocRender.ts:164` |
| 3 | B-211 | 界面 | 替换 / 全部替换零反馈 | 2/3 | `src/App.tsx:2067-2160` |
| 4 | B-109 | 可访问性 | 主题 radiogroup 方向键无效、4 项全 Tab 站 | 3/3 共识 | `src/components/SettingsDialog.tsx:44-88` |
| 5 | B-136 | 界面 | 只读视图查找条仍可输入、开关仍可点 | 2/3 | `src/components/FindBar.tsx:48-49`、`:54-75`、`:79-96` |
| 6 | B-151 | 可访问性 | 字数明细面板 Tab 焦点落 `BODY`、面板不关 | 2/3 | `src/components/StatsDetail.tsx:58-101` |
| 7 | B-209 | 测试 | 两条验收脚本断言过期，回归门假红 | 仅本表 | `scripts/bigfile-acceptance.mjs:127` |
| 8 | B-208 | 界面 | 重命名成功提示借刷新文案 | 仅本表 | `src/App.tsx:2735` |

## 逐条

**1. B-142 删除「撤销」被顶掉（唯一本表提）** 删除成功把「撤销」挂在单槽 `notice`（`App.tsx:2913-2938`）；`finishSaved` 的「已保存」直接 `setNotice`（`:3088-3093`），任何 `show()` 同样覆盖。删完继续写并保存后，应用内唯一恢复入口消失（trash 内容在，无数据丢失；确认框干净分支甚至只提文件管理器）。建议：撤销通知不被普通提示顶掉，直到用户点掉或下一次文件树操作；否则在「更多 ▾」加「恢复最近删除」。验收：E2E 删除 → 打字 → `Ctrl+S` → 撤销仍可点且恢复正文。

**2. B-134 导出丢目录 / 留字面 `[TOC]`** 目录是 `Decoration.widget`（`tocRender.ts:164`），只挂编辑视图；`exportAs('html')` 用 `editor.getHTML()`（`App.tsx:4817`）拿不到，`[TOC]` 段是真实正文原样写入。期望：导出 HTML 的目录位置是带锚点 `<nav>`、无字面 `[TOC]`（Typora 保留目录）。建议：从 `editor.state.doc` 取顶层标题与标记段，生成 id + nav，跳过标记段；抽 `buildExportToc(doc)` 进 `src/lib/export.ts` 做纯函数单测（无 jsdom 也能测）。验收：单测（多标题 / 无标题 / 转义 `\[TOC\]` / 引用块内标题不算）+ 一次真实导出（CDP 恢复后）。

**3. B-211 替换零反馈** `replaceCurrent` / `replaceEvery` 全函数只有 `dispatch` 与 `focus()`，无 `show()`（`App.tsx:2067-2160`）；按钮 disabled 只在命中为 0 时生效，正常替换后计数条直接变「无结果」，用户不知道写没写成。建议：两处 dispatch 后 `show('已替换 1 处' / '已替换 N 处')`（`persist:false`，不顶掉持久提示）；预览锁定与 0 命中不提示。验收：E2E 两钮各一次，读 `.toast-text`。

**4. B-109 主题 radiogroup 键盘不可用** 4 个 `role="radio"` 按钮零 `tabIndex`、零 `onKeyDown`（本轮 grep 复核 = 0 命中）：四项各占一个 Tab 站，Arrow 键焦点与 `aria-checked` 都不动（WCAG 4.1.2 / APG radio group）。建议：roving tabindex（选中项 0、其余 −1）+ ArrowLeft/Right/Up/Down/Home/End 切换，同步 `update({theme})` 与 `data-theme` 预览；`nextRadioIndex` 抽纯函数单测。验收：单测 + E2E（焦点不逃出组、`aria-checked` 跟随、预览生效）。

**5. B-136 只读视图查找条假可输入** `locked` 只喂给 4 个按钮的 `disabled`（`FindBar.tsx:48-49`、`:97-133`），两个输入框无 `readOnly`、`Aa`/`ab` 无 `disabled`：预览里能输入、看不到命中、Enter 被吞，说明只在小字 `.find-note`。建议：`readOnly={locked}` + 两开关 `disabled={locked}` + 明确占位；Esc 与关闭钮保留。验收：E2E 预览/源码两态输入被拒、开关不可点、说明可见。

**6. B-151 字数明细 Tab 逃到 BODY** 面板只有 `tabIndex={-1}` 与打开即 `focus()`（`StatsDetail.tsx:58-101`），无 Tab 处理；面板内没有别的可聚焦节点，`useDialogFocus` 的 trap 不适用。建议：面板 `onKeyDown` 捕获 Tab → 关闭并把焦点交给 `.stats-trigger`（非模态弹层语义）；或降为非对话框语义（`role` 去掉）。验收：E2E Tab 后 `activeElement` 是触发钮、面板关闭、无 `inert` 残留。

**7. B-209 验收脚本断言过期（唯一本表提）** `scripts/bigfile-acceptance.mjs:127` 仍要求 toast 同时含「5.5 MiB」与「文件太大」，HEAD 文案是「「x」超过 5.5 MiB，仍在「y」」→ 该条恒红（当前 2/3）；`scripts/keyboard-acceptance.mjs:189-193` 的 Ctrl+Shift+S 段在 BACKLOG 记 51/52，需 CDP 复跑才能定位是哪条（本轮不可验）。风险：两条脚本是回归门，假红会让后续轮次忽略真回归。建议：改断言到现行文案；keyboard 那条先跑一次取实际失败项再改。验收：两脚本各自 exit 0（CDP 恢复后）。

**8. B-208 重命名提示借刷新文案（唯一本表提）** 改名成功走 `refreshTree` 的旧文案（`App.tsx:2735`「已刷新：新增 N 个，消失 M 个」），不告诉用户「已重命名 b.md → c.md」；事务本身正确（第 58 轮复现：之后保存写新名）。建议：rename 成功路径单独 `show('已重命名：b.md → c.md')`。验收：E2E 改名后读 `.toast-text`。

## 与另外两表的关系（给 planner 的去重信息）

- 10 条 open P2 的归属：B-109、B-134 三表都提（批 1 首选）；B-211、B-136、B-151 两表提；B-110、B-121、B-122、B-126 只在 `findings-code.md`；B-111（纯文档）建议交 scribe；B-103/B-106/B-107 是功能级，各需一次设计与产品负责人拍，不进本批。
- B-139、B-153 属 Deferred 表（不在用户点名的 10 条里），`findings-code.md` #1/#2 已覆盖，本文不占名额。
- 建议批 1（共识，风险最低）：B-134、B-211、B-136；批 2：B-142、B-109、B-151；批 3：B-209、B-208 加 `findings-code.md` 的 B-139/B-153。

## UNVERIFIED

- 8 条运行时现象全部未在浏览器复测（CDP 五端口 DOWN）；证据为源码路径 + BACKLOG/历史日志。
- B-209 只能静态确认 `bigfile-acceptance.mjs:127` 恒红；keyboard 那条的 51/52 来自 BACKLOG，未定位到具体失败项。
