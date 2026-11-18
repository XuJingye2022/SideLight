# 第 62 轮执行报告（executor）

起点 `12f36e4`；未 commit/push/动 `release/`。门禁：`tsc` 0；`npm test` 40 文件 513 条全过（HEAD 508 + 5）；`npm run verify` PASS（首屏 gzip 300,834 B，预算 310,000）。

## A1 软换行段落不再整段当 `[TOC]`（B-132）DONE

- `src/lib/toc.ts`：加 `isTocMarkerText`（无 `m`，整段判据），`isTocParagraph` 用它；`hasTocMarker`（`im`）只留原文/粘贴片段。
- `src/lib/tocRender.ts:166-173`：`maybeTocTouched` 的当前段落改整段判据。
- `src/components/PreviewPane.tsx:25-46`：用 `isTocMarkerText`，`find`→`filter(...).forEach`（多段各一份 nav）。
- `src/lib/toc.test.ts` +2 条；HEAD 红 `.tmp/r62-a1a2-red.log`（HEAD true/`[3]` → false/`[]`）。
- E2E: `.tmp/r62-a1-exec-toc.log` soft.md source 0、widget 0、可见两行 + `[TOC]`，预览 nav 0 且 literal true，fence/quote/inline/table 0，保存 35 B（只差新增字）；`.tmp/r62-a1-exec-toc2.log` first.md 0 且见说明文字，code/lonely 0；`.tmp/r62-a1-exec-lower.log` 1 source/1 widget、预览 1 nav/2 条目。`errors []`。

## A2 手打 `[TOC]` 立即生效（B-133）DONE

- `src/lib/escapes.ts:14` 导出 `TOC_ESCAPED_LINE`（与 repair 同一正则）。
- `src/lib/toc.ts:52-92`：`escapedTocLineCount`（同 repair 口径）、`tocShouldRender(计数, original)`（H5：不二次全篇扫）、`hasTocSource(doc, original)`。
- `src/lib/tocRender.ts:124-134` 闸门换 `tocShouldRender`；`App.tsx:78`/`:5586` 预览改用 `hasTocSource(editor.state.doc, rawTextRef.current)`。
- 测试：`toc.test.ts` +3 条；`tocRender.test.ts` 原转义用例补 2 组断言；HEAD 红（typedActive false→true，escaped 两边 false）。
- E2E `.tmp/e2e-r62-a2-toc-typed.mjs` → `.tmp/r62-a2-exec-toc-typed.log`；截图 `shots/round-62/toc-after-typed.png`。note.md 手打 nav 1、条目=顶层标题 1、段 h 0，`Ctrl+S` 盘上 `…# 甲章\n\n正文段落。\n\n[TOC]\n`（`^\[TOC\]$`），重开 nav 1，预览 nav 1；escaped.md 打开/预览 nav 0、保存除新增字逐字节同；mixed.md 当场 nav 2、两行写 `\[TOC\]`、重开 nav 0（既有规则，预期）。`errors []`。

## A3 代码块高亮入差距表 + 池子卫生（B-135 文档面）DONE

- `docs/typora-gap.md`：缺表加「代码块语言高亮｜无｜P1｜需惰性 chunk、待批准」；`（4）→（5）`、`（1）→（2）`；TOC 行改「导出/打印不带（B-134 实测，打印同实现）」。
- `README.md:101` 39/4→39/5；计划外 1 行 `:95`：原「是否带目录未验证」与 B-134 冲突，改「不带目录（HTML 导出实测，打印同一实现）」。
- `AGENTS.md:74` 39 有/5 缺。`BACKLOG.md`（脚本 `.tmp/r62-a3-backlog.mjs`）：删 B-131 行尾 449 字符残留；Deferred 界面项 B-132→B-136；B-120 移入 P1 段末并补 `kb100.autoOps`（36,028@6,285 + 36,029@7,190 = 72,057 ≈ 2 倍）；B-135 `open`→`deferred`（H4）。
- 检查：`.tmp/r58-docs-check.mjs` → 39/5、子节 2/2、1/1、2/2、missRowSum 5；`git grep -nE '缺 4 项|4 项缺'` 0 命中 exit 1（改前 2；对照 `缺 5 项` 2）；词边界 grep 0 命中 exit 1（宽口径 15；依赖 `[]`，对照 mermaid）；`r62-a3-ids.mjs` total 58 / dup []。B-135 实现未做（待批准）。

## CHANGELOG 建议（一行）

`- 修复 TOC：软换行段落不再整段当标记（B-132）；已打开文档里手打 \`[TOC]\` 即刻出目录、标记行收起、预览同步（B-133）。`

## 新踩的坑（3 条）

1. Vite transform cache 会交付 App.tsx「混合版本」（新 import + 旧函数体）→ 白屏 `hasTocMarker is not defined`；`(Get-Item src/App.tsx).LastWriteTime = Get-Date` 即恢复。判据：fetch `/src/App.tsx` 同时含新旧符号。
2. 沙箱里 node 的 `execSync`/`spawnSync(cmd.exe)` 报 EPERM：取 HEAD 源码先用 `cmd /c "git show HEAD:src/lib/toc.ts > .tmp/x.ts"`，node 只 `readFileSync`。
3. PowerShell 的 `*>` 在本机写 UTF-16LE（`ff fe`），node 读要 `toString('utf16le')`；`Out-File -Encoding utf8` 是带 BOM 的 UTF-8。
