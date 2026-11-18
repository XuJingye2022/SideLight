# 第 75 轮 finder-code（提案轮，只读）

- 轮前 `startSha` = `e5dd887`（工作区干净）。本文件只提案，不改产品代码。
- 证据口径：CDP **9222–9226 无监听**（`netstat` 0 行）→ 本轮不重跑 E2E，浏览器侧数字全部引自 BACKLOG 既有实测，标 UNVERIFIED。
- 基线：`npx tsc --noEmit` PASS（0 输出）；`npm test` PASS：**41 个文件 536 条 0 fail**（exit 0，日志 `.tmp/r75-finder-code-test.log`）。
- 本轮 diff 面：`e5dd887` 只改 3 文件（`src/lib/mathInput.ts` +6、`src/lib/settings.ts` +4/−3、`src/styles.css` +17/−1），另加第 73/74 轮的 `mathReveal.ts` / `tocRender.ts`。这 3 文件里未见新的 P0/P1。
- 用户 3 条（行内公式、`==`、行间公式观感）已单独排队，本表不重复。
- **新 P0/P1：0 条。** 提案 8 条 P2（含 BACKLOG 里 10 条 open P2 中的 7 条），按优先级排。

> BACKLOG 口径提醒：`B-153`、`B-139` 两行在 P2 表里只有 5 列（缺状态列），按 `open` 计数会被漏，清 P2 前先补状态列。

## 提案（按优先级）

| # | ID | 区域 | 问题（证据） | 修法 / 验收 |
| :-- | :-- | :-- | :-- | :-- |
| 1 | B-139 | 性能 | 1 MB 停在源码态逐键把全篇 `countText` 算在 **render 里**：`src/App.tsx:6013` `stats={sourceMode ? countText(splitFrontmatter(sourceText).body) : stats}`。每次渲染（逐键）扫 1 MB；第 65 轮实测 10 字 2,121 ms、每键约 1 条 ~120 ms long task（最大 223） | 抽出 `useMemo(() => countText(...), [sourceText])` 或把 stats 挪到停笔 300 ms 回调；验收：1 MB 源码态打 10 字，长任务 max ≤ 50 ms 且 `stats` 终值不变 |
| 2 | B-153 | 保存 | 模态挡住自动保存时 2.5 s 草稿先落地，事后补存成功不删草稿：`.sidelight/drafts/<key>.md` 每篇留过期副本。`finishSaved`（`src/App.tsx:3037`）只清计时器/推代际，不删草稿；删草稿只在那条竞态分支（`:763-784`） | 在 `finishSaved` 成功后补一次草稿清理（与 `:3100-3102` 同批），失败仍留草稿；验收：造一次模态挡存 + 补存，`drafts` 目录 0 个本文件 |
| 3 | B-134 | 导出 | HTML 导出丢目录、`[TOC]` 写成字面：`exportAs('html')` 用 `editor.getHTML()`（`src/App.tsx:4817`），TOC 是 `Decoration.widget` 不进 `getHTML()`；第 62 轮实测导出 2,936 B、`<nav` 0、`<p>[TOC]</p>` 1 | 导出前用 `toc.ts` 的标题树另建 `<nav class="sl-toc">` 插进 bodyHtml（或复用 `PreviewPane` 那段），并删字面标记段；验收：含 `[TOC]` 的文档导出后 `<nav` 1、`[TOC]` 字面 0，无 `[TOC]` 的文档字节不变 |
| 4 | B-109 | 可访问性 | 设置主题 radiogroup 4 个按钮全进 Tab 序、方向键无效：`src/components/SettingsDialog.tsx:44-86` 只有 `role="radio"`/`aria-checked`，无 `tabIndex` 也无 `onKeyDown` | 照大纲/列表态现成的 roving 写法：选中项 `tabIndex=0` 其余 `-1`，ArrowLeft/Right/Home/End 移焦点并 `update({theme})`；验收：Tab 只落 1 项、右方向键换项且 `aria-checked` 跟着变 |
| 5 | B-110 | 可访问性 | 页边批注卡三钮高 22 px（「知道了」54×22、「追问」42×22、「联网核对」66×22），低于 24×24；`.note-actions button`（`src/styles.css:1394`）无 `min-height`。`I` 21×24、`.stats-trigger` 22×24 属间距豁免，可不改 | 只在 `.note-actions button` 加 `min-height:24px`（与第 49 轮查找条同口径）；验收：三钮 rect 高 ≥24，卡片不错行 |
| 6 | B-121 | 宿主 | 宿主单文件相对图先按裸相对路径请求一次、404 后才换 `/__asset`：`src/lib/assetImage.ts:56` `waitResolve = isRelativeAsset(src) && getAssetDocPath() !== ''`，宿主流派该值恒 `''` → 走 `paint(src)` | 把「宿主模式」并入 `waitResolve`（导出 `isHostDoc()` 或让宿主模式也返回非空哨兵）；验收：宿主打开含相对图的 `.md`，网络面板 0 次裸路径 404，图仍显示 |
| 7 | B-122 | 外观 | 暖纸主题下 Mermaid 仍浅色默认配色：`mermaidTheme()`（`src/lib/mermaidLazy.ts:64`）只返回 `'dark' \| 'default'`，sepia 落 `default`，节点填充 `rgb(236,236,255)` 与米黄纸底不统一（可读性达标） | `mermaidTheme()` 加 `'base'` 分支，`themeVariables` 取 `--paper`/`--ink`/`--accent` 的 computed 值；验收：sepia 下节点填充≠`rgb(236,236,255)`，与 `themes.ts` 纸底色一致，深色/浅色逐值不变 |
| 8 | B-126 | 构建 | `host/bin/www` 与 `dist` 分叉：www 入口 `index-BxH_Xt2Z.js`、dist `index-DP7HQwxX.js`（本轮实测 98/98 文件但字节 3,891,248 vs 3,891,594），www mtime 21:34 早于最后一次 build；直接跑 `host/bin/Sidelight.exe` 看到旧前端。发布侧无影响（`installer.nsi:140`、`portable.ps1:55` 取 `dist`） | 跑一次 `powershell -File host\build.ps1` 重拷 www（或构建脚本末尾统一从 `dist` 同步）；验收：两边入口文件名相同、字节相同 |

## 不建议本轮做

- `B-135`（代码围栏语法高亮）：差距表记 P1，但要新运行时依赖，按红线 6 需产品负责人批准，且首屏余量 16,957 B 只够惰性 chunk 入门；先批准再排。
- `B-103` 图片缩放 / `B-107` 自定义快捷键 / `B-106` emoji：功能级 P2，各需一次设计（emoji 还受 chunk 预算约束），不适合与回归修复同批做。
- `B-111`（差距表补 Word/Epub/LaTeX/图片 4 行）：纯文档，交 scribe/finder-typora 更省。

## UNVERIFIED

- 全部浏览器侧数字（B-139 的 120 ms long task、B-134 的 2,936 B、B-110 的三钮 rect）来自 BACKLOG/历史日志，本轮未用 CDP 复测（9222–9226 无监听，按规则不重试）。
- `npm test` 已拿到总数（41 文件 536 条、0 fail），但没跑 `npm run verify` / `npm run roundtrip`（本轮只读提案）。
