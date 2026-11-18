# 第 62 轮验收（tester）

轮前 `12f36e4`；A1/A2/A3 全做。判定 **PASS-WITH-UNVERIFIED**（未验：打印是否带目录，见 A3）。未读 `impl.md`，按 plan 与 `git diff` 从零复验。

## 门禁
- `npm run verify` PASS：build + 首屏 gzip **300,834 B**（内部 310,000 / 硬线 320,000，余 19,166；比第 61 轮 300,727 +107）。`.tmp/r62-verify.log`
- `npm test` PASS：**40 文件 513 条** 0 fail（轮前 508；新增 toc +5 = A1 两条 + A2 三条）。`.tmp/r62-test.log`
- `npm run roundtrip`：富文本 6/8、源码 8/8、firstSaveBlocked 1/8，与第 58/61 轮基线逐项同。`.tmp/r62-roundtrip.log`

## A1 软换行段落不再整段当 `[TOC]`（B-132）
代码：`toc.ts` 新增 `isTocMarkerText`（`/^[ \t]*\[toc\][ \t]*$/i`，无 `m`），`isTocParagraph`、`tocRender.ts` 的逐键判定、`PreviewPane.tsx` 的段落判定改用它；`hasTocMarker`（`im`）只留原文/粘贴片段。
- 自跑 `.tmp/e2e-r62-bug-toc.mjs 9222`（先 `node .tmp/reset.mjs 9222`，exit 0、0 pageerror）：
  - soft.md `toc-source` 0、widget 0；可见文字「第一行文字 / `[TOC]` / 第三行文字」两行俱在；预览 nav 0 且字面 `[TOC]` 1。
  - fence / quote / inline / table 四个种子均 0 源段；lower.md 1 源段（display none）+ 1 widget + 2 条目。
- 自跑 `.tmp/e2e-r62-bug-toc2.mjs`：first.md `sourceCount` 0、visible「甲|`[TOC]`|这里是目录说明。」（说明文字在）；code.md / lonely.md 0。
- 自跑 `.tmp/e2e-r62-a1-lower-preview.mjs`：lower.md 预览 nav 1 / 条目 2 / 无字面。六种子 0 源段（fence、quote、inline、table、code、lonely）与验收一致。
- 保存保真：soft.md 末尾加「改」→ `Ctrl+S` toast「已保存 soft.md」，盘上字符 35（原 34 +1；UTF-8 64→67 B，只差新增 3 B），软换行与 `[TOC]` 行原样、无 `\[TOC\]` 转义。
- HEAD 红：HEAD 的 `im` 正则对 `a\n[TOC]\nb` 与 `[TOC]\n说明` 都返回 true，新单测断言 false → 改前必红（node 复算）。
- 证据 `.tmp/r62-a1-toc.log`、`.tmp/r62-a1-toc2.log`、`.tmp/r62-a1-lower.log`。

## A2 手打 `[TOC]` 立即生效（B-133）
代码：`toc.ts` 加 `escapedTocLineCount`（围栏与 `$$` 跳过）与 `tocShouldRender`/`hasTocSource`（原文这些标记行全被转义才不挂）；`tocRender.ts:131` 改用它；`App.tsx:5586` 传 `editor.state.doc`。
- 自跑 `.tmp/e2e-r62-a2-toc-typed.mjs 9222`（fake workspace + `readFakeFile`，exit 0、0 pageerror）：
  - note.md：打开 nav 0 → 手打 `[TOC]` + 回车后 nav **1**、条目 `[甲章]` = 顶层标题数 1、源段 `toc-source` 高 **0**、display none、无字面；`Ctrl+S` 写 `# 甲章\n\n正文段落。\n\n[TOC]\n`（该行 `^\[TOC\]$`，非转义）；重开 nav 1；预览 nav 1、字面 0。
  - escaped.md：打开与预览 nav 0、字面 `[TOC]` 在；保存与原文只差新增「改」（37→40 B，无二次转义）。
  - mixed.md：当场 nav **2**（两份目录、两源段高 0）；保存两行都写 `\[TOC\]`；重开 nav 0 + 字面（既有规则，plan 记为预期）。
- 截图 `shots/round-62/toc-after-typed.png`（本轮重跑 09:38:10 写入，编辑器里 `[TOC]` 段隐藏、widget「甲章」可见）；未覆盖 8:59 的两张旧图。
- 单测 3 条（转义全不挂 / 手打挂 / 混合挂）随 `npm test` 全过。
- 证据 `.tmp/r62-a2-toc.log`。

## A3 差距表补行 + 池子卫生（B-135 文档面）
- `node .tmp/r58-docs-check.mjs`：headHave **39**、headMiss **5**、sub `2/2 1/1 2/2` declared=actual、missRowSum **5**。
- 旧文案 `git grep -nE '缺 4 项|4 项缺' -- README.md AGENTS.md` → **0 命中 exit 1**；改前对照 `HEAD:12f36e4` 同一命令 **2 命中**（AGENTS:74、README:101）；新文案 `缺 5 项|5 项缺` 2 命中。
- 主证据 `git grep -nEi '\b(highlight|prism|shiki|lowlight)\b' -- src package.json` → **0 命中 exit 1**；宽口径对照 `highlight|prism|shiki|lowlight` **15 命中**全为 `eqHighlight`（`src/lib/inlineSyntax.ts:18,45` + 测试）；依赖名扫描 `[]`、对照 `mermaid` 命中。
- `node .tmp/r62-a3-ids.mjs`：58 条 / 58 唯一 / `dup: []`。
- BACKLOG 池子：B-132/B-133/B-135/B-120 在 P1 段、B-134/B-136 已入池；`| open | 导出…` 残留 0 处（当前第 66 行是 B-131 正常行尾 `| 61 |`，HEAD 同值，故无残留可删）。
- 差距表「缺的（5）」「编辑与格式（2）」已改，TOC 行写「导出/打印不带（B-134 实测，打印同实现）」。

## 回归
- `.tmp/e2e-r61-b2-toc-preview.mjs` 复跑：**14/14** checks 全 true、0 pageerror（编辑视图隐藏/光标揭示、预览 nav=顶层标题、点第 2 个 h2 落位、`\[TOC\]` 两边字面）。`.tmp/r62-regress-toc.log`
- 未新增运行时依赖、未动 Markdown 序列化。

## UNVERIFIED
- 打印 / 另存 PDF 是否带目录未单独实测；B-134 只验 HTML 导出，「打印同实现」是同一 `getHTML()` 的推断。
- 真实 FSA 磁盘写回与中文 IME 沿用假 workspace（本轮改动不碰写盘路径）。

## 判定
PASS-WITH-UNVERIFIED。
