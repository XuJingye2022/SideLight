# 第 39 轮实施报告（executor）

- 轮次：round=39 · 轮前 `startSha=59a4f933dfd411039c939b1e70d7bbdcd7ed82f8` · 报告目录 `docs/iteration/round-39/`
- 依据：`round-39/plan.md`（revision=3）+ `round-39/plan-review.md`（PASS，4 条 P2 不阻塞）
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP 只用 **9222**（`node .tmp/reset.mjs 9222`）；未启动 Edge、未 kill `msedge`、未 `browser.close()`；未 push、未改 `release/`、未改 `package.json` 版本（仍 0.32.1）。

## 1. 任务状态

| 任务 | 内容 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| T1 | 表格单元格 `<br>` 往返（P1） | **DONE** | 8 条单测 + E2E 7 项 PASS + 字节不变 |
| T2 | `../`、`%20` 图片 + 失败占位 + 不发请求（P1） | **DONE** | 12 条新断言 + E2E 12 项 PASS + 红绿两次输出 |
| T3 | 源码模式查找替换不再假装成功（P2） | **DONE** | E2E 14 项 PASS（含草稿逐字节判据） |
| T4 | 1 MB 去重 + 8 处 DEV 埋点 + 体积文档（P1） | **DONE** | 4 段数字 + 产物 0 命中 + 体积 ✓ |

**收官门禁全绿**：`npx tsc --noEmit` exit 0；`npm test` exit 0（**25 文件 320 条**）；`npm run roundtrip` rich 5/7、source 7/7；`.tmp/build-r39` 埋点 0 命中；首屏 gzip **290,021 B PASS**。按计划 §2，`npm run build`（写 `dist/`）留给根代理串行跑，本轮用 `npx vite build --outDir .tmp/build-r39` 替代（exit 0，477 ms）。

## 2. 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/tableCellBreaks.ts`（新） | `splitTableCellBreaks(json)`：只在 `tableCell`/`tableHeader` 内把文本里的 `<br>` 切成 text/hardBreak；无表返回同一对象（不复制）；带格式文本不拆 |
| `src/lib/tableCellBreaks.test.ts`（新） | 8 条：单个 `<br>`、`<br/>`/`<br />`/`<BR>`/`<Br />`、两个连续 `<br>`、行尾 `<br>` 不产空文本、无 `<br>` 返回同一对象、正文段落不转换、带格式不拆、不原地改入参 |
| `src/App.tsx` | ① `setMarkdown` 用 `splitTableCellBreaks(parsed)`；② 新增 `resolveAssetSegments` 解析器（从工作区根走）；③ `loadIntoEditor` 两次 `serializeDocument` 合成一条 `const serialized`；④ 8 处行内 DEV 埋点；⑤ `FindBar` 传 `unavailableReason` |
| `src/lib/assetResolve.ts` | 新增纯函数 `resolveAssetSegments(docDirSegments, src)`（`..` 弹层、`%20` 解码、越界/解码后 `..` → null、非法编码保留原段） |
| `src/lib/assetResolve.test.ts` | +12 条断言（1 个 test 块）：`../`、根级、`./`、`%20`、同目录、多层弹层、两种越界、`a%ZZ.png` 不抛错、`%2e%2e` 拒绝、`assets/` 与空串 |
| `src/lib/assetImage.ts` | 解析前不写 `src`（`waitResolve`）、`markMissing()`（`data-asset-missing` + alt/title 文案）、`paint()` 清标记与占位 title；import 加 `getAssetDocPath` |
| `src/components/FindBar.tsx` | 新 prop `unavailableReason` → `locked`：四按钮 `disabled`、`.find-count` 空、`.find-note` 提示；查找框 Enter/Shift+Enter 与替换框 Enter 都 `preventDefault()` 后 `if (locked) return` |
| `src/styles.css` | `.editor img[data-asset-missing]` 虚线占位（只用现成变量）、`.find-note` |
| `package.json` | `test` 脚本追加 `tableCellBreaks.test.ts` |
| `docs/typora-gap.md` | 计数 29/11 → **30/11**；图片行补 `../`/`%20`/占位；新增「表格单元格内换行往返」行 |
| `README.md` | 图片句（`../`/`%20` + 占位 + 单文件/导出限制）、查找替换句（源码模式）、首屏体积与第 39 轮 +591 B、安装包实测字节、`npm test` 计数 |
| `AGENTS.md` | §6 差距计数 30/11、测试 25 文件 320 条、首屏 290,021 B（余 29,979 B） |
| `packaging/README.md` | 体积段补第 39 轮实测 setup 1,300,711 B / 便携 zip 1,622,355 B |
| `docs/CHANGELOG.md` | `## Unreleased（第 29–39 轮）` 新增「第 39 轮」6 条 + 门禁行 |
| `.tmp/e2e-r39-t1-br.mjs`、`.tmp/e2e-r39-t2-img.mjs`、`.tmp/e2e-r39-t3-find.mjs`（新） | 本轮 E2E |
| `.tmp/e2e-r39-code-1mb-multi.mjs` | 「编辑器可见耗时」之后加「等两遍落地 + 打印原始 marks」（其余不动） |

## 3. 逐任务证据

### T1 表格单元格 `<br>` 往返

单测（`node --experimental-strip-types src/lib/tableCellBreaks.test.ts`）：

```
ℹ tests 8 · pass 8 · fail 0
```

E2E（`node .tmp/e2e-r39-t1-br.mjs`，假工作区，CDP 9222，`failures=0`）：

```
## loaded {"brInCells":1,"firstCellText":"AB","literalBr":false,"dirty":false}
## PASS 载入后单元格里有 1 个真 br 1
## PASS 单元格文本不含字面 <br> {"literalBr":false,"text":"AB"}
## saved "| A<br>B | c |\n| --- | --- |\n| d | e |\n"
## PASS 保存字节逐字节等于种子 {"equal":true,"len":[39,39]}
## table-inserted 1
## after-shift-enter {"brInCells":6,"text":"3AB"}
## source "# 新表\n\n\n\n|         |     |     |\n| ------- | --- | --- |\n| 3A<br>B |     |     |\n|         |     |     |\n\n"
## PASS 源码里写的是 <br>
## PASS 切回富文本后仍是真 br（读回一致）
## PASS console 错误 0 条
```

截图：`shots/round-39/p1-cell-br-reopen.png`（41,248 B，重开后单元格是真换行）。
说明：`brInCells:6/9` 里多数是 ProseMirror 空单元格的 trailing break；最小用例里 `=== 1` 才是本修复的产物。首行是表头，断言取 `th, td`（见 §6 踩坑 1）。

### T2 `../`、`%20` 图片 + 占位 + 不发请求

种子（**105 字符 / UTF-8 131 字节**，逐字节稳定，plan-review §三.1 的更正口径）：

```
# 一 / ![上级](../assets/pic.png) / ![编码上级](../assets/my%20pic.png) / ![同目录](同.png) / ![没图](../assets/nope.png)
```

**改前基线**（把 `src/lib/assetImage.ts` 临时还原成第 38 轮原文、保留新 resolver，`T2_MODE=baseline`）：

```
## imgs[3] {"alt":"没图","src":"../assets/nope.png","nw":0,"missing":false,...}
## nope-requests ["http://localhost:5175/assets/nope.png"]
## nope-responses [{"status":200,"type":"text/html"}]
## baseline-only {"nopeRequestCount":1,"missingCount":0}
```

→ 改前 `nope.png` 请求 **1 条**（dev server 回 `200 text/html` SPA 回退，按状态码判 404 是恒真空断言，与 `round-38/plan-review.md:122` 一致），占位 **0**。

**改后完整断言**（`node .tmp/e2e-r39-t2-img.mjs`）：

```
## nope-requests []
## nope-responses []
## PASS 图 1（../assets/pic.png）显示      (nw=1, src=blob:…)
## PASS 图 2（../assets/my%20pic.png）显示 (nw=1, src=blob:…)
## PASS 图 3（同目录 同.png）显示          (nw=1, src=blob:…)
## PASS 缺失图占位 1 个 {"missingCount":1}
## PASS 缺失图没有 src（不发请求） null
## PASS 缺失图保留 alt=没图 "没图"
## PASS 缺失图 title 含「图片未找到」 "图片未找到：../assets/nope.png"
## PASS 缺失图占位有可见尺寸（虚线框） {"w":96,"h":41}
## PASS nope.png 请求条数 === 0 []
## PASS 保存字节逐字节等于种子 {"equal":true,"len":[105,105],"bytes":[131,131]}
## PASS 保存结果 0 处 blob:
## PASS console 错误 0 条 []
## SUMMARY mode=assert failures=0
```

截图：`shots/round-39/p2-img-parent.png`（38,820 B）、`p2-img-missing.png`（38,841 B，虚线占位）。
红绿对照：请求数 **1 → 0**、占位数 **0 → 1**，两次输出都在本文件（plan §T2 验收第 4 条）。

### T3 源码模式查找替换不再假装成功

E2E（`node .tmp/e2e-r39-t3-find.mjs`，`failures=0`，14 项）：

```
## source-locked {"count":"","note":"源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查","buttons":[↑ disabled, ↓ disabled, ✕ enabled, 替换 disabled, 全部替换 disabled],"replacementEditable":true}
## after-replace-enter {"count":"","sourceSame":true,"draftSame":true}
## PASS 替换框 Enter 后草稿逐字节不变 {"before":73,"after":73}
## PASS 替换框 Enter 后源码框内容不变 {"before":18,"after":18}
## PASS 正文 dirty 仍 false false
## PASS 查找框 Enter 后草稿不变 {"after":73}
## esc {"findOpen":false,"sourceOpen":true,"focus":"TEXTAREA.source-editor"}
## PASS Esc 关查找但不退源码
## rich-find {"count":"1 / 2","note":null,"buttons":[全部可用]}
## rich-after-replace {"body":"甲|甲的ZZ。|第二段ZZ。","dirty":true}
## PASS 富文本全部替换落正文（2 处 ZZ） … PASS 富文本替换后 dirty true
## PASS console 错误 0 条
```

截图：`shots/round-39/p3-source-find.png`（35,403 B）。
有牙判据：改前实测草稿 `73 → 69`（`plan-review.md:21` 复跑），本轮的断言就是这条路径——实现漏了必红。

### T4 1 MB 归因（去重 + 埋点 + 数字）

**静态（正向对照先于 0 命中）**

```
Select-String -Path src/App.tsx -Pattern 'performance\.mark\('        → 8 行（2+1+1+2+2）
Select-String … "performance\.mark\('sl-load-start'\)"               → 2 行
（改前对照）该 pattern 改前 = 0 行；git grep -n "sl-" -- src/ 改前 = 0 命中
逐标签：sl-dispatch-done 旧 pattern=False / 新 pattern=True（其余 4 个两版都 True）
```

**产物 0 命中**

```
npx vite build --outDir .tmp/build-r39            → ✓ built in 477ms（exit 0）
Select-String -Path .tmp/build-r39/assets/*.js -Pattern 'sl-load|sl-parse|sl-dispatch|sl-serialize|sl-sync'
                                                  → count=0
```

**去重可证**：`git diff src/App.tsx` 里该区间 `-  serializeDocument(editor, {` ×2 → `+  const serialized = serializeDocument(editor, {` ×1；`grep serializeDocument(editor` 全文件 4 处（1015 初始 effect / 1063 宿主 / **2047 去重后** / 2781 currentMarkdown），去重前该区间是 2 处。

**实测（1 次，脚本 `.tmp/e2e-r39-code-1mb-multi.mjs`，日志 `.tmp/r39-t4-1mb-marks.log`）**

样本：`1,048,576` 字符、≈**37,450 段**（在 `src/lib/workspace.ts:241` 的 5.5 MiB 上限内），走 localStorage 草稿 → 初始载入 effect。

口径（先写死两条）：

1. dev `StrictMode`（`src/main.tsx:10-14`）下初次载入执行**两遍**，下表是**单遍**耗时（每个 name 取最后一条 mark）；
2. 生产单遍；dev 实测总墙钟约为此表的 2 倍。**生产口径本轮未测**（环境硬约束：不另起、不重启 server）。

原始 10 条 mark（原样，未 `clearMarks`——同名 2 条是「跑了两遍」的物证）：

```
[["sl-load-start",127],["sl-parse-done",109332],["sl-dispatch-done",109413],["sl-serialize-done",109476],["sl-sync-done",109504],
 ["sl-load-start",110009],["sl-parse-done",219287],["sl-dispatch-done",221027],["sl-serialize-done",221094],["sl-sync-done",221122]]
```

单遍四段（取第 2 遍 = 最后一条）：

| 段 | 计算 | 单遍耗时 |
| :--- | :--- | ---: |
| `parse`（`escapeHtmlForParse` + `protectMathPairs` + `manager.parse` + `nodeFromJSON` + `splitTableCellBreaks`） | `219,287 − 110,009` | **109,278 ms** |
| `dispatch`（37,450 段建 DOM + `setTextSelection`） | `221,027 − 219,287` | **1,740 ms** |
| `serialize`（`serializeDocument` 一次） | `221,094 − 221,027` | **67 ms** |
| `sync`（`syncDocInfo` = `extractOutline` + `countText`） | `221,122 − 221,094` | **28 ms** |
| 合计 | | 111,113 ms |

总墙钟（编辑器可见）**221,467 ms**（dev 两遍）；`sl-sync-done` 之后的尾段 `221,467 − 221,122 = 345 ms`。第 1 遍对照：`parse 109,205 / dispatch 81 / serialize 63 / sync 28`。console 错误 **0** 条。

**结论（本轮的真实产出，与计划假设不同，必须如实记）**：载入成本 **99% 在 `manager.parse`（≈109 s/遍）**，`dispatch` 只有 1.7 s、`sync` 28 ms。计划 §T4 写的「`dispatch` 与 `sync` 两段是真实产出、`219,828 − 2×66,816 ≈ 86,196 ms` 是这两段的余量」**不成立**：两遍的 `dispatch + serialize + sync` 合计只有 ≈2.0 s。**去重只值 67 ms / 221,467 ms（0.03%）**，不要写成「载入变快」；下一轮要动的是 `@tiptap/markdown` 的 parse 路径，不是大纲/字数。本轮按计划「不做风险修法」，只记录。

## 4. 收官门禁输出

```
npx tsc --noEmit                                             exit 0
npm test                                                     exit 0 · 25 文件 320 条（fail 0）
npm run roundtrip                                            rich: 5/7 完全保真；source: 7/7 等值；firstSaveBlocked 1/7
npx vite build --outDir .tmp/build-r39                       exit 0（477 ms）
Select-String .tmp/build-r39/assets/*.js 'sl-load|sl-parse|sl-dispatch|sl-serialize|sl-sync'   0 命中
node scripts/measure-first-screen.mjs --dir .tmp/build-r39 --target 310000
    total raw=938259 gzip=290021 headroom=29979 files=3 max=320000
    target=310000 gap=19979   → PASS（exit 0）
```

首屏：第 38 轮 289,430 B → 本轮 **290,021 B（+591 B）**，`files=3`、无 mermaid/katex 进首屏。按计划 §18 的执行口径，判据是**硬线 ≤310,000**（内部线），**不**用「≤ +200 B」；+591 B 归属 T1–T3 的新代码（埋点 0 B 的证据由「源码 8 行 + 产物 0 命中」承担，不用全量增量冒充）。

## 5. 与原计划的偏差（全部最小改动，已按 plan-review 的修法）

1. **`105 B` 写成字节会假红**（plan-review §三.1）：本报告与断言统一用「105 字符 / UTF-8 **131** 字节」，断言用字符串相等（`saved === SEED`），不引入长度检查。实测 `bytes:[131,131]`。
2. **带格式单元格的 `<br>`**（plan-review §三.4）：采用修法 1——**只拆 `marks` 为空的文本节点**。`**A<br>B**` 原样保留字面 `<br>`，字节不变、该表仍走「整块写回原文」。已在 `tableCellBreaks.test.ts` 加断言（第 7 条）并在 CHANGELOG 与 `docs/typora-gap.md` 写明。
3. **测试条数**（plan-review §三.3）：按 §4 口径走实跑值（25 文件 320 条），并更新 `README.md:119` 与 `AGENTS.md:72`；`AGENTS.md:39` 的历史戳记（第 38 轮记 24/311）未动。
4. **`resolveAssetSegments([], 'assets/')`** 返回 `['assets']`（「末尾至少 1 段」按返回数组非空理解），测试按实测写；`''` 才返回 `null`。交给目录句柄判成打不开，不构成越界。
5. **T2 改前基线的做法**：先写完代码再补基线会失真，所以用 `Copy-Item` 备份新文件、**临时把 `assetImage.ts` 还原成第 38 轮原文**跑基线（resolver 已是新版），再还原新文件跑完整断言。基线只记录、不断言（此时 `../` 还是红的）。
6. **`AGENTS.md` §6 的首屏数字**（289,430 / 余 30,570）顺手改成 `290,021 / 余 29,979`：同一事实已在 `README.md:100` 改过，留旧值会自相矛盾；只改这一句，不动 §6 其它内容。

## 6. 新踩坑（建议下一轮补进 `AGENTS.md` §8，本轮未改 §8）

1. **Markdown 表格首行是表头**：断言「第一个单元格」要用 `th, td`；只查 `td` 会拿到第二行，`textContent` 断言假红（本轮 T1 首跑就踩到）。
2. **ProseMirror 空块会渲染 `br.PMirror-trailingBreak`**：`td br` 计数包含占位换行，最小用例里判 `=== 1` 可行，插入 3×3 表后是 6/9，别按「等于 1」判真实路径。
3. **`readOnly` 拦不住 `keydown`**：替换框 Enter 会照样调 `onReplace()`；只把按钮 `disabled` 也拦不住。锁定时必须 `preventDefault()` 后 `return`。反过来，`readOnly` 还会让 `page.fill` 抛「Element is not editable」。
4. **「插入 ▾」菜单才有表格按钮**：`button[aria-label*="表格"]` 不存在，`button:has-text("表格")` 多处命中（Playwright strict mode 报错），要先点 `插入 ▾` 再点 `.menu button:has-text("表格")`。
5. **1 MB 载入的主成本是 `manager.parse`**：约 109 s/遍，`dispatch` 1.7 s、`sync` 28 ms。任何「大纲/字数拖慢载入」的假设都缺数据支撑。
6. **测「改前基线」别用 `git stash`**：同一棵树上有多个任务的改动，`stash` 会一起收走；用 `Copy-Item` 备份单文件 + 临时还原。
7. **`measure-first-screen.mjs --dir .tmp/build-r39 --target 310000` 是合法用法**（第 35 轮修过 flag 解析），输出 `total … gzip=… headroom=…` 与 `target=… gap=…` 两行，`PASS` 在最后。

## 7. UNVERIFIED（本轮注定测不了）

- **真实磁盘**（非假 FSA）上的 `../`、`%20` 图片与占位：本轮用假目录句柄；真机补测同 `findings-bug` §1 的步骤。
- **宿主（WebView2）里的相对图「保持现状」**：只在代码层核对 `getAssetDocPath()` 判空（`App.tsx:1030` 宿主清空、`:4004` 前缀校验），沙箱起不了 WebView2 窗口；宿主仍显示不了相对图（`/__asset` 顺延）。
- **1 MB 的生产口径（minify 单遍）**：只在 dev server 上量（`StrictMode` 两遍），生产需 `vite preview`/宿主冷启动，环境硬约束下不做。
- **T1 改前红**：改前「单元格显示字面 `<br>`」用的是 finder 的截图与日志（`shots/round-39/t9-cell-br-reload.png`、`t17-br-reload-minimal.png`），本轮未复跑改前版本。
- **暗色主题下的图片占位样式**：只截了亮色两张；`.find-note` 也只有亮色。
- **真实中文 IME、150%/200% 缩放、屏幕阅读器**：与上轮同类，本机无法测。
- **`npm run build`（写 `dist/`）**：按计划 §2 留给根代理串行跑；本轮用 `.tmp/build-r39` 验证产物 0 命中与首屏字节。

## 8. 交接要点

- `package.json` 版本仍 **0.32.1**（本轮不发版）；CHANGELOG 写 `## Unreleased`。
- 根代理轮末需要做：`npm run build` 串行复核；更新 `docs/iteration/STATE.md`（体积 290,021 B、测试 25/320、第 39 轮行）；决定是否把 §6 的 7 条踩坑并入 `AGENTS.md` §8。
- 下一轮优先（按本轮数据重排）：① **`@tiptap/markdown` 的 parse 路径**（1 MB/37,450 段 ≈109 s/遍，是载入唯一大头）；② 1 MB 文末逐键 28 s（code#2，同一批但未取数）；③ 第 38 轮遗留 Mermaid SVG id 按实例唯一；④ 表格 `colwidth` 导出清理；⑤ 宿主 `/__asset`；⑥ findings-ship S3/S4、`qa15`、`data-safety` 陈旧选择器；⑦ HTML 导出/预览图形渲染。
