# round-75 提案（finder-ui）：本轮应修的 8 条

口径：只提「当前就该修」的条目；用户 3 条（行内公式、`==高亮==`、行间公式观感）已单独排队，本表不重复。
本轮无新 open P0/P1（BACKLOG 的 P0 表空，P1 表只剩 B-135 `deferred`），下表 8 条全是 P2。
排序：用户看得见的错 > 交互有输入没反应 > 可访问性语义 > 文案矛盾。
环境：CDP 9222–9226 全 down，本轮无页面证据，全部标 UNVERIFIED（验证方法见末节）。
已看到 `round-75/findings-code.md`（B-139/B-153/B-134/B-109/B-110/B-121/B-122/B-126），
本表只保留 2 条与它重叠的高优先项（B-134、B-109）作为交叉印证，其余 6 条是代码轴没覆盖的界面项。

| # | ID | 区域 | 问题（一句话） | 静态证据 | 修法要点 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | B-134 | 导出 | HTML 导出不带目录，`[TOC]` 以字面写进导出文件 | `src/App.tsx:4817` 用 `editor.getHTML()`；目录是 `Decoration.widget`（`src/lib/tocRender.ts`）不进 `getHTML()`；`src/lib/export.ts` 的 `toc\|TOC` **0 命中**；差距表 `docs/typora-gap.md:49` 已记「导出/打印不带」，文档侧只剩代码修 | 导出前按顶层标题另建 `<nav class="sl-toc">` 插进 `bodyHtml` 并删字面标记段；验收：含 `[TOC]` 的文档导出后 `<nav` 1、字面 `[TOC]` 0，无 `[TOC]` 的文档字节不变 |
| 2 | 新 | 界面 | 第 75 轮把 `inlineSyntax` 默认改开，设置提示与三份文档仍写「默认关」（共 10 处） | `src/lib/settings.ts:57`/`:122` 已是开；`src/components/SettingsDialog.tsx:119`、`README.md:41`、`AGENTS.md:72`、`docs/typora-gap.md:43` 仍写关；代码注释 5 处（`src/App.tsx:991`、`src/lib/inlineSyntax.ts:11`、`src/lib/settings.ts:29`、`src/lib/tilde.ts:28`、`src/styles.css:848`）与测试名 `src/lib/inlineSyntax.test.ts:47` 同；`git grep -n '默认关' -- src README.md AGENTS.md docs/typora-gap.md` = 12 命中，10 条讲行内语法 | 10 处改成「默认开（可在设置里关）」；测试名改「开态四例往返逐字节同」。**属用户第 2 条修复的收尾，不是重复报告**；入池建议 ID 用下一个空号（B-157 及以后） |
| 3 | B-136 | 界面 | 只读视图（预览/源码）查找条仍可输入但无任何效果 | `src/components/FindBar.tsx:54-75` 无 `readOnly`/`disabled`；`:79-96` 的 `Aa`/`ab` 无 `disabled`；`:77` 计数空白；只有 `:136` 一行 `.find-note` 说明 | `locked` 时输入框 `readOnly` + `aria-describedby` 指向说明，两个开关禁用；或整行只留说明 |
| 4 | B-211 | 界面 | 「全部替换」静默：无 toast、无「替换了 N 处」，计数条直接变「无结果」 | `src/App.tsx:2076` 起的 `replaceEvery` 全函数无 `show()`/`setNotice`；`git grep -n '替换了' -- src` 0 命中 | 完成后 `show('替换了 N 处')`；命中归零与「无结果」分开说 |
| 5 | B-109 | 可访问性 | 设置主题 radiogroup 方向键无效，4 项全在 Tab 序 | `src/components/SettingsDialog.tsx:44-85`：无 `tabIndex`、无 `onKeyDown`（文件内 0 命中） | roving `tabindex`（选中 0、其余 −1）+ 方向键换项并跟着预览主题，照 `.outline` 既有写法 |
| 6 | B-141 | 可访问性 | 页边批注卡不可键盘聚焦，读不到「第 N 处 + 引文 + 批注」 | `src/components/MarginRail.tsx:110-118`：`article.note` 无 `tabIndex`、无 `role`，跳句只挂 `onClick` | 卡加 `tabIndex={0}` + `aria-label`，Enter 跳句；卡内动作钮保持原行为 |
| 7 | B-212 | 界面 | 删除确认框两种分支的「怎么恢复」互相矛盾：干净分支只让用文件管理器，不提应用内撤销；脏分支说「撤销会一起搬回」 | `src/components/TreeActions.tsx:292`（干净分支那半句）；成功 toast 确实带「撤销」（`src/App.tsx:2913-2922`，BACKLOG 原写的 `:2762-2771` 已随行号漂移过期） | 两分支共用一句恢复说明：先写「可在提示里点撤销」，再写 trash 兜底 |
| 8 | B-151 | 可访问性 | 字数明细面板 `role="dialog"` 但没有焦点管理，Tab 后焦点落 `BODY` 且面板不关 | `src/components/StatsDetail.tsx:92-101`：只有 `tabIndex={-1}`，无 `useDialogFocus`/`aria-modal`/`inert` | 二选一：改成非模态语义（`role="region"` 或去掉 `role`，保留 `tabIndex=-1` + Esc 关闭），或接 `useDialogFocus` 成真模态 |

## 10 条 open P2 的归属（用户点名要清）

| ID | 本轮提案？ | 说明 |
| :--- | :--- | :--- |
| B-109 | 是（#5） | 键盘/roving，界面轴 |
| B-134 | 是（#1） | 导出内容错，界面轴 |
| B-110 | 否 | 已在 `findings-code.md` #5；触控目标属「间距豁免待量」，价值低于本表 |
| B-121 / B-126 | 否 | 宿主与构建，`findings-code.md` #6/#8 已覆盖 |
| B-122 | 否 | 暖纸 Mermaid 配色，`findings-code.md` #7 已覆盖 |
| B-111 | 否 | 纯文档（差距表补 4 行），交 scribe 更省 |
| B-103 / B-106 / B-107 | 否 | 功能级（图片缩放、emoji、自定义快捷键），各需一次设计与产品负责人拍，不混进本批 |

## 不入本批

- **B-135 代码围栏语法高亮**（P1 区、deferred）：要新增运行时依赖（红线 6）+ 首屏余量 6,957 B（内部预算）/16,957 B（硬线），须产品负责人先批，单独立项。
- **B-150 设置面板溢出 152 px**、**B-208 重命名提示借刷新文案**、**B-142 撤销只挂单条 toast**、**B-124 行内链接输入规则**、**B-209 两条回归脚本断言过期**：已入池，价值低于上表 8 条，排下一批。
- **B-153 / B-139**：`findings-code.md` #1/#2 已覆盖（且 BACKLOG 里那两行缺状态列，清 P2 前先补列）。

## UNVERIFIED

8 条证据都是源码/DOM 结构，**没有一条在本轮真页面复测**（CDP 全 down）。验证方法：
1/3/4/6/7/8 用 `node scripts/shot.mjs` + 一条 `.tmp/e2e-r75-*.mjs`；2 读设置面板文案即可；
5 用焦点探针（ArrowRight 后读 `activeElement` 与 `aria-checked`）。
