# 第 54 轮 Typora 对照发现（finder-typora）

- dev `http://localhost:5175`，CDP **9223**（`node .tmp/reset.mjs 9223`）；startSha `b01a4e6`。
- 脚本 `.tmp/e2e-r54-typora-{a,b}.mjs`；日志 `.tmp/r54-typora-{a,b}.log`。
- 截图：`shots/round-54/typora-syntax-preview.png`、`shots/round-54/typora-settings-theme.png`。
- 对照：`.tmp/typora-ref/resources/Docs/Markdown Reference.md`、`resources/style/themes/`。

## 0 差距表核对

逐行数 `docs/typora-gap.md`：已有表 **32 行**、缺表 **9 行**（1+3+1+1+1+2），与表头 `:7`/`:44` 自洽；但缺表 `:56`（整页缩放）、`:57`（全屏）第 52 轮已实现，真实应为 **34/7**。B-112 已记，本轮补证据：设置确有「浅色/深色/跟随系统」三钮，`F11` 在 `src/App.tsx` 有分支。

## 1 P1 路线图（B-101）：三种语法今天全是纯文本，加之前先撞单 `~` 守卫

- 实测（`.tmp/r54-typora-a.log`）：`==要突出==`、`^上标^`、`H~2~O` 在编辑视图与预览都显示**字面**；`mark/sub/sup` 各 1 个，全来自行内 `<mark>` `<sub>` `<sup>`，三种快捷语法一个没渲染。
- 实测（`.tmp/r54-typora-b.log`）：追加 `==仍要突出== 与 H~2~O。` 后 `Ctrl+S`，`syntaxLineKept / inlineHtmlKept / codeLineKept` 均 `true`、`escapedTildeApplied=false` —— 今天写盘是纯文本、逐字节不变。
- Typora 一手文档 `Markdown Reference.md:362-372`：三条**默认关闭**（先在 `Preference → Markdown` 打开）；例子 `H~2~O`、`X~long\ text~`、`X^2^`、`==highlight==`。
- 代码约束：`src/lib/tilde.ts:8-12` 写明 GFM 单 `~` 会成删除线、写盘成 `H~~2~~O`；`:25-29` 的 `loneTildeText` 把不成对单 `~` 当文本吃；`serializeDocument.ts:55` 再用 `repairTildes` 把 `\~` 还原。
- 建议：① 加设置开关、**默认关**（与 Typora 一致，既有文档渲染不变）；② `~` 判定写成「成对、内容非空、不是 `~~`」，开关打开才注册 tokenizer；③ 验收同时测新语法生效与 `H~2~O` 逐字节不变，并跑 `npm run roundtrip`。

## 2 P1 路线图（B-105）：主题落点现成，别新建引擎

- 机制：`<html data-theme>` 三值 + token。`src/styles.css:1` 的 `:root` 有 55 条 `--x:`；`:38` 深色块；`:68-69` 跟随系统媒体查询；设置三钮 `:1282-1300`；写入 `src/components/SettingsDialog.tsx:62`、`src/App.tsx:764`。
- 实测：`dataTheme="system"`、`--bg=#f6f4ee`、`customThemeHint=false`（无主题文件入口）。
- Typora：`resources/style/themes/` 只有 5 个纯 CSS（github/newsprint/night/pixyll/whitey），`github.css:1-3` 整份就是 `:root { --side-bar-bg-color…; --control-text-color… }`；菜单键 `"Themes"`。
- 建议：主题 = 覆盖 token 的 CSS。内置放静态资源（不进首屏主包）；用户主题只在桌面宿主读盘，要写盘落 `.sidelight/themes/`（红线 5）。验收取「换主题后 token 变化 + 深色/跟随系统/打印仍成立」。

## 3 P2 文档（B-117）：差距表第 50 行并 5 个能力，本轮无法按行关闭

`docs/typora-gap.md:50` 一行同时含 `==`/`^`/`~`、TOC、emoji，B-101 与 B-106 同引此行。只做前三条时，该行既不能标「已有」（TOC/emoji 还缺），也不能原样不动。建议拆两行，行内 HTML 那半句留在第一行。

## 4 复验（不计入 actionable）

- **B-003** 拖入：body 与正文内各 drop 一次，都只出提示「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」，正文未插入（`90 → 90`、`inserted:false`）；`dragover` 已 `preventDefault`。`src/App.tsx:4082-4090` 只看 `files.length`，**文件夹拖入走同一分支、文案仍说「文件」**。
- 其余 6 行与实测不冲突。

## 5 UNVERIFIED

文件夹拖入的真实文案（`DataTransfer` 合成不出目录项，只按代码判）；HTML 导出里的三种语法；Typora 只对照解包资源，未跑真机。
