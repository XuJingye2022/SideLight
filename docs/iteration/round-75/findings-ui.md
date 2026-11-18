# round-75 findings：界面与可访问性（finder-ui）

环境：CDP 9222–9226 全部无监听（`Get-NetTCPConnection -LocalPort 9222..9226 -State Listen` 全空），
本轮无页面证据；按指示改用静态检查（`git grep` + 读源码）与 `npm test`（exit 0；末组 `mathReveal` 9/9）。
下列结论全部来自源码/DOM 结构推断，**未在真页面复测 → UNVERIFIED**（验证方法已写在每条末尾）。
HEAD `e5dd887`，工作树干净。

## F1 设置面板与三份文档仍写「快捷行内语法默认关」，实际默认已改开（P2）

`src/lib/settings.ts:57` 本轮改成 `inlineSyntax: true`、`:122` 旧存档读成开；
但 `src/components/SettingsDialog.tsx:119` 的提示仍写「默认关：关着这些符号按字面保存……」，
`README.md:41`、`AGENTS.md:72`、`docs/typora-gap.md:43` 同句未改；
`src/lib/inlineSyntax.test.ts:47` 测试名也仍是「（默认关）」。
用户在设置里核对 `==高亮==` 时会读到与自己所见相反的一句。
属用户第 2 条（高亮失效）修复的收尾，不是重复报告。
验证：打开设置，读「快捷行内语法」下方那行提示。静态对照：
`git grep -n '默认关' -- src README.md AGENTS.md docs/typora-gap.md` → **12 命中**，
其中 **10 条**讲的正是行内语法默认值（设置面板 1、三份文档 3、代码/样式注释 5、测试名 1），
另 2 条是别的主题（`src/lib/settings.ts:119` 讲智能标点旧存档、`README.md:54` 讲搜索服务默认关闭）。

## F2 主题 radiogroup 键盘不可用（P2，WCAG 2.1.1 / 4.1.2）

`src/components/SettingsDialog.tsx:44-85`：`role="radiogroup"` 里 4 个 `role="radio"` 按钮，
无 `tabIndex`、无 `onKeyDown`（该文件 `tabIndex|onKeyDown` 0 命中）→ 4 个 Tab 站，
方向键既不移动焦点也不改 `aria-checked`。第 56 轮已复现（`.tmp/r56-ui-d.log`），本轮代码未变。
验证：设置里点「浅色」后按 ArrowRight，读 `document.activeElement` 与 `aria-checked`。

## F3 只读视图下查找条仍接受输入但不生效（P2）

`src/components/FindBar.tsx`：`.find-input`（`:54-75`）无 `readOnly`/`disabled`，
`Aa`/`ab`（`:79-96`）无 `disabled`，锁住时计数直接给空白（`:77`），
只有 `:136` 一行 `.find-note` 说明。预览/源码里打字，唯一反馈是那行小字。
验证：预览视图按 `Ctrl+F` 输入任意词，读命中高亮数、`.find-count` 文本与焦点是否在输入框。

## F4 页边批注卡不能键盘聚焦（P2）

`src/components/MarginRail.tsx:110-118`：`article.note` 无 `tabIndex`、无 `role`，
跳句只挂在 `onClick`。键盘用户读不到「第 N 处 + 引文 + 批注」这组上下文，
卡内只有 采纳/忽略/追问/联网核对 这些动作钮可 Tab 到。
验证：Tab 到批注区，读 `activeElement` 与卡片是否可 `.focus()`。

## 计数

- `p0p1_count`: **0**（本轮无新 P0/P1；BACKLOG 的 P0 表为空，P1 表只剩 B-135 `deferred`）
- `actionable_count`: **0**（有证据的 P0/P1 为 0）
