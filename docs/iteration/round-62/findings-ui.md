# 第 62 轮 finder-ui 发现（界面与可访问性）

结论：本轮**没有 P0/P1**。2 条 P2（1 条新增、1 条补证），不阻塞停止。
原始数据：`.tmp/r62-ui-survey.json`、`.tmp/r62-ui-toc-focus.json`、`.tmp/r62-ui-tokens.mjs`；脚本 `.tmp/e2e-r62-ui-survey.mjs`、`.tmp/e2e-r62-ui-toc-focus.mjs`。

## 已量（真点，1440x900 与 1024x700，浅色）

- 溢出：两档 `scrollWidth-clientWidth` 均 0；1024x700 顶栏最右控件 right=1012 ≤ 1024；工具栏 38 px、状态栏 28 px。
- 设置面板：1440 x=505 y=20 430x860，页脚 actions y=822–859 可见；1024x700 430x660，actions y=622–659 可见。
- 表格条 7 钮高度全 24 px（宽 53 / 41），标签 24x15；三个删除钮 `rgb(180,69,58)`。
- 查找条 7 钮高度全 24 px（Aa 33、↑ 25、✕ 29）；Ctrl+F 后焦点在 `.find-input`。
- 字数面板 360x325 完整在视口内；打开时焦点进 `.stats-detail`、`.stats-trigger` `aria-expanded=true`；Esc 关闭并把焦点送回 `.stats-trigger`。
- 编辑视图目录（第 61 轮 B-130）：卡片 576x134，4 条目各 546x28、字号 14.62 px；点条目后焦点回 `.ProseMirror`、继续打字落正文（`焦点测试` 出现），不是焦点死路。
- 只读预览目录：nav 576x134、条目 28 px 高；可 Tab 聚焦（`outline: rgb(43,109,100) solid 2px`）；点末条滚动 0 → 281。
- 三主题 token 对比度 18 对全 ≥4.83：sepia accent/paper 5.21、ink-faint/paper 5.03、accent-ink/accent-wash 6.53；dark 6.26–7.67；light 4.83–7.40。目录条目色三主题均过 AA。
- 全程 `pageerror` / console error 为空。

## P2-1（新）预览只读视图里查找框仍可输入，输入无任何反馈

`locked` 只锁「上一处/下一处/替换/全部替换」（`disabled`），`.find-input` 与 `Aa`/`ab` 仍可聚焦、可点击、可输入；填「丁节」后 `.find-count` 为空、预览里 `<mark>` 0 个、Enter 被吞，唯一解释在底部 `.find-note`（「预览是只读视图，不支持查找与替换…」）。源码模式同一路径。
证据：`.tmp/r62-ui-survey.json`（`findPreview`：inputDisabled=false、Aa/ab disabled=false、↑/↓ true）；`.tmp/r62-ui-toc-focus.json`（`previewFind.count=""`、`marks=0`、queryValue="丁节"）。
落点：`src/components/FindBar.tsx:48-49`（`disabled` 只算进按钮）、`:54-58`（查找框只判 locked 的 Enter）、`:79-96`（两个开关不看 locked）、`:136`（说明行）。
建议：locked 时给两个输入 `readOnly`/`disabled` 与 `aria-disabled`，开关也禁用；或照源码模式锁整行只留说明。

## P2-2（补证 B-108）设置面板溢出量已从 78 px 涨到 152 px

1440x900：`.dialog` scrollHeight 1010 / clientHeight 858（溢出 152 px，旧记 78 px 已过期）；1024x700：1010 / 658。页脚仍常驻可见（见上），所以只是「框内可滚」，不是切字。证据同上 JSON 的 `settings1440.scroll`、`settings1024.scroll`。

## typora 对照

`shots/typora/41-find.png` 是正文（没有查找条）、`93-wordcount-popup.png` 实际是 UAC 弹窗，两者都不含可与查找条/字数面板对照的同构图，本轮给不出「明确不一致」。未用截图（本轮限 2 张，未消耗）。

## 未覆盖（未验证，不计入）

深色 / 暖纸只在 token 层算对比度，没有在浏览器里切主题看实图；批注卡、大纲、Mermaid 沿用第 56–58 轮结论（B-122 仍 open）。真实中文 IME、真机缩放屏照旧不在本轮。
