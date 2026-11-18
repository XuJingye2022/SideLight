# 第 84 轮 缺陷猎人（提案，只读）

- HEAD `5760913`，版本 0.32.1，本轮不改代码。`npm test` exit 0（47 个测试文件，2026-11-19 04:40）；未跑 build/verify（提案轮）。
- 环境：`localhost:5175` 与 CDP 9222–9226、54280 全无监听（单次探测即停）。本章无浏览器证据，静态证据给文件:行号，浏览器项标 UNVERIFIED。
- 用户点名的 3 条回归已单独排队，本单不重复。

## 提案：当前应修（8 条，按优先级）

| # | ID | 级 | 区域 | 问题与证据 | 建议 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | B-124 | P1 | 编辑/保真 | 手打 `[乙](https://example.com "标题")` 保存后变字面 `\[乙\](…)`，链接语义丢失。`git grep -n "new InputRule" -- src` 只有 `mathInput.ts:110,127`、`taskListInput.ts`，无链接输入规则；第 58 轮 E2E 实测草稿 `\[乙\](https://example.com "标题")`（`.tmp/e2e-r58-a1-typo.mjs` 的 linkDraft）。BACKLOG 原记 P2，建议升 P1：每次手打链接都命中。 | 加链接输入规则（或保存前把 `[t](u)` 提升为 link mark），补单测 + roundtrip |
| 2 | B-142 | P1 | 界面 | 删除后的「撤销」仍只在单槽 notice 上：`restoreDocumentFromTrash` 全仓 1 处调用（`src/App.tsx:2987`，挂在删除 notice 的 action，`:2982-2999`）；`show()` 无条件 `setNotice`（`:465`），保存提示也走 `setNotice`（`:3211`）→ 任何下一条提示都把撤销钮顶掉。数据不丢（trash 留原件）。 | 恢复入口独立于 toast：文件树「更多 ▾」或状态栏持久条，保留到下次文件树操作 |
| 3 | B-135 | P1 | 编辑 | 代码围栏无语言高亮，`docs/typora-gap.md:57` 记 P1；`src`/依赖无 highlight/prism/shiki/lowlight（0 命中）。红线 6：新运行时依赖需产品负责人批准，未批准前不排执行。 | 先请示；批准后按 KaTeX/Mermaid 方式做惰性 chunk，首屏 gzip 余量仅 5,508 B |
| 4 | B-211 | P2 | 查找 | 「替换 / 全部替换」仍零反馈：`replaceCurrent`（`:2125-2132`）与 `replaceEvery`（`:2134-2218`）都不调 `show()`；替换后命中归 0，FindBar 只把计数画成「无结果」（`src/components/FindBar.tsx:80`）。 | 两出口各报「替换了 N 处」；0 命中给「没有可替换的匹配」 |
| 5 | B-126 | P2 | 宿主 | `host/bin/www` 停旧：www 98 文件 3,891,248 B、入口 `assets/index-BxH_Xt2Z.js`（mtime 2026-11-18 21:34）；`dist` 入口 `assets/index-DHcXYe3J.js`（04:35 构建），两入口互不存在。直接跑 `host\bin\Sidelight.exe` 看到旧前端，宿主验收会假绿/假红。 | `host/build.ps1` 末尾强制重拷 dist→www；或加载时版本不一致给告警并在 host.log 记一行 |
| 6 | B-140 | P2 | 文档 | `docs/CHANGELOG.md:5` 标题写「第 29–74 轮」，`:7` 起已是第 83 轮；按标题写 release notes 会漏 75–83 轮。 | 标题改 29–83；发版前 scribe 再核 |
| 7 | B-141 | P2 | 可访问性 | 页边批注卡 `article.note` 无 `tabindex`、无 `role`（`src/components/MarginRail.tsx`），键盘只能落卡内按钮，读不到「第 N 处 / 引文 / note」；卡片无 Enter 跳句。 | 卡片 `tabIndex=0` + `role="group"`/`aria-label`，Enter 跳回正文引文 |
| 8 | 新 | P2 | 导出 | HTML 导出丢 `==高亮==` / `^上标^` / `~下标~` 的样式：导出走 `editor.getHTML()` → `<span class="sl-eq|sl-sup|sl-sub">`，而导出内联样式表 `src/lib/export.ts` 的 STYLES 只有 `nav.sl-toc` 等；`git grep -n "sl-eq\|sl-sup\|sl-sub" -- src` 命中只在 `inlineSyntax.ts:47,55,63` 与 `styles.css:850,867,875`，`export.ts` 0 命中。导出的 HTML 里高亮变纯文本、上下标与正文同高。 | STYLES 补三条（高亮背景取 `--mark-bg` 同值、sup/sub 给 `vertical-align` + `font-size`），并补 `export.test.ts` 断言 |

未进前 8 的 open P2（供合并）：B-103 图片缩放、B-106 emoji（需惰性 chunk）、B-107 自定义快捷键、B-206 Mermaid 图不进导出/预览、B-207 多行 HTML 注释与带属性行内 HTML。

## 复查（只报新问题）

- **已修清单与 HEAD 不符 2 条**：B-142、B-211（见提案 2、4）。HEAD 无对应实现；`git log --oneline -6` 的 78–83 轮提交未触及 `replaceCurrent`/`replaceEvery` 与删除 notice 的恢复入口。静态判「仍未修」，浏览器复现 UNVERIFIED。
- **新问题 1 条**：提案 8（导出样式缺口）。属这批复修（第 75 轮起 `==`/`^`/`~` 默认开）的相邻未覆盖面，不是已修条目回滚。
- 其余条目静态标记在位、未见新破坏：`mathReveal.ts:186-187` 两枚 delim widget、`styles.css:2565` print `.sl-eq-delim{display:none}`、`useDialogFocus.ts:42-52` roving 首末落点、`assetResolve.ts` host 模式、`discardDraftFor`（`App.tsx:3105`）、`sourceStats`、settings 版本迁移、`export.ts` 的 `buildExportToc`；`npm test` exit 0。浏览器渲染项（公式/高亮/打印/暖纸 Mermaid/24×24 几何）全部 UNVERIFIED。
- 用户 3 条回归：只做了单测层复核（mathInput/mathReveal/settings/mathStyle 在套件内，均未失败）；真机 UNVERIFIED。
