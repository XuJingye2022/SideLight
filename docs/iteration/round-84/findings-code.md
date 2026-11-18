# 第 84 轮 · finder-code 提案（只读，不修代码）

基线（HEAD `5760913`）：`npx tsc --noEmit` exit 0；`npm test` 47 个文件逐个 exit 0；首屏 gzip **304,492 B**（内部余 5,508、硬线余 15,508）。

**环境**：CDP 9222–9226 / 54280 / dev 5175 全部无监听（`Get-NetTCPConnection -State Listen` 0 条）→ 本轮全是静态检查 + 离线探针，浏览器读数 **UNVERIFIED**。

## 先纠正：复查清单里 2 条其实没修

复查把 **B-142**（删除撤销入口被顶掉）与 **B-211**（替换零反馈）记为已修，HEAD 里两处都没动：

- `git log -S"已替换"`、`-S"替换了"`、`-S"恢复最近删除" -- src` 全 **0 命中**；两条 BACKLOG 行仍无 `fixed`。
- `replaceCurrent`（`src/App.tsx:2125-2132`）与 `replaceEvery`（`:2134-2233`）都没有 `show()`。
- notice 仍是单槽（`:248-257`）：删除提示的 `persist:true`（`:2981`）只免 6 秒自动消失（`:2236-2239`），挡不住覆盖；下一次「已保存到 X」（`:3211`）一带，「撤销」就没了。

按清单跳过，这两条会一直不修。都在 `App.tsx` 一个文件、改动小，建议本轮就排进批次。

## 建议修的顺序（8 条，按优先级）

**本轮新 P0/P1：0 条**（与停止条件一致；P0/P1 表里仍只有 B-157，已 `fixed`）。下面全是 P2/打磨档，按「用户可感知 × 改动大小」排序；前 5 条都在 `App.tsx` / 一个组件文件里，适合 3 条一批。

| # | ID | 级别 | 问题 | 证据 | 建议修法 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | B-211 | P2 | 替换 / 全部替换零反馈：写盘正确，但无 toast、无「替换了 N 处」，计数条直接变「无结果」 | `src/App.tsx:2125-2132`、`:2134-2233`、`src/components/FindBar.tsx:131-136`；`git log -S"已替换"` 0 | 两个出口各补一条 `show('已替换 N 处')` / `show('没有可替换的文本。')`，0 写盘分支也提示 |
| 2 | B-142 | P2 | 删除后的「撤销」被下一条通知顶掉，应用内唯一恢复入口消失（trash 里数据完好、手动恢复路径已在确认框写明） | `src/App.tsx:2976-3001`、`:248-257`、`:2236-2239`、`:3211` | 撤销单独占一个槽（或「更多 ▾」加「恢复最近删除」），只在下次文件树操作时清 |
| 3 | B-124 | P2 | 手打行内链接保存时方括号被转义：敲 `[乙](url "标题")`，草稿成 `\[乙\](url "标题")`，Markdown 语义丢失（字符不丢） | BACKLOG B-124 行；`.tmp/e2e-r58-a1-typo.mjs` 的 `linkDraft`；`src` 无 link 输入规则 | 加 link 输入规则（与 `smartTyping` 的 `inLinkDestOrHtmlTag` 同一条判定），或序列化处不转义已成对的 `[..](..)` |
| 4 | B-141 | P2 | 页边批注卡不可键盘聚焦：`article.note` 无 `tabindex`/`role`，读屏与键盘读不到「第 N 处 / 引文」上下文，Enter 也不能跳句 | `src/components/MarginRail.tsx:110`（`git grep "tabIndex\|role=" 该文件` **0 命中**） | `tabIndex={0}` + `role="article"`/`aria-label`，Enter 跳句（与 B-138 大纲同口径） |
| 5 | B-126 | P2 | `host\bin\www` 与 `dist` 不是同一次构建：直接跑 `host\bin\Sidelight.exe` 看到旧前端（安装包取 `dist`，不受影响） | 本轮实测：www 98 文件 3,891,248 B / dist 98 文件 3,899,466 B；`assets` 80 个 JS **文件名逐个不同**（`channel-FtHvJhSM.js` 对 `channel-CY4BxlNL.js`） | 重拷 `dist` 到 `host\bin\www`（`packaging/installer.ps1` 只读 `dist`，改动不进包） |
| 6 | B-103 | P2 | 图片缩放（Typora parity） | `docs/typora-gap.md:64` | 选中图片出尺寸控件，或 `![alt\|宽](src)` 语法；先做工具栏四档 |
| 7 | B-107 | P2 | 自定义快捷键 | `docs/typora-gap.md:77`、`:84` | 设置里可改键位，落 `settings.ts`（复用 B-158 的版本迁移） |
| 8 | B-106 | P2 | TOC 已完成，剩 emoji 短代码 `:smile:` | `docs/typora-gap.md:58`、`:83`；首屏内部余 **5,508 B** | 必须惰性 chunk；余量不足时先做设置开关 + 按需下载词表 |

**不建议本轮动 B-135**（围栏语言高亮）：要加运行时依赖，红线 6 需产品负责人批准，且 5,508 B 余量装不下。

## 已量过、不立条目

`onSelectionUpdate` 每次移动选区跑 `readBlocks`（`src/App.tsx:192-198`，44,446 块逐块 `textContent`）＋`extractOutline`（`:1182`）。离线探针 `.tmp/r84-finder-code-selection.ts`（44,446 块、docSize 1,488,933）实测 **2.01 / 0.21 ms，合计 2.22 ms/次**，不构成 P0/P1，不入池；浏览器未验。
