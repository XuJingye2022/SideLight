# 第 39 轮验收（tester，首次验收）

- 轮次：39 · 轮前 `startSha=59a4f933dfd411039c939b1e70d7bbdcd7ed82f8` · 报告目录 `docs/iteration/round-39/`
- 验收者：tester（独立复验，未读 `impl.md`；只读 `plan.md` + `git diff` + 源码）
- 环境：dev server `http://localhost:5175`（未重启）、CDP `9222`（`node .tmp/reset.mjs 9222` 后使用）、Windows 11 / Node 24.21
- 自写脚本：`.tmp/e2e-r39-tester.mjs`（T1/T2/T3，38 项断言），日志 `.tmp/r39-tester-e2e.log`、`.tmp/r39-tester-e2e-t1.log`、`.tmp/r39-tester-1mb.log`、`.tmp/r39-tester-npmtest.log`、`.tmp/r39-tester-roundtrip.log`
- 结论：**PASS**（门禁全过；T1–T4 验收标准逐条复验通过；2 项 UNVERIFIED、2 项偏差记录见 §6）

## 1. 门禁（真实输出）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | `files=25 pass=320 fail=0`（逐文件汇总 `ℹ fail 0` × 25；日志 `.tmp/r39-tester-npmtest.log`） |
| `npm run roundtrip` | `rich: 5/7 完全保真` / `source: 7/7 等值；firstSaveBlocked: 1/7`（与第 38 轮一致，未掉） |
| `npx vite build --outDir .tmp/build-r39` | `✓ built in 484ms`，exit 0 |
| `node scripts/measure-first-screen.mjs --dir .tmp/build-r39 --target 310000` | `total raw=938259 gzip=290021 headroom=29979 files=3 max=320000` / `target=310000 gap=19979` / **PASS** |

## 2. T1 表格单元格 `<br>` 往返 —— 通过

复验脚本段：`node .tmp/e2e-r39-tester.mjs t1` → `failures=0`（11 项断言，日志 `.tmp/r39-tester-e2e-t1.log`）。

- 最小用例（种子 `| A<br>B | c |` + 正文 `正文<br>不拆`）：`td br = 1`、单元格 `textContent` 无字面 `<br>`（`["列1","列2","AB","c"]`）、**正文段落 `br` 元素 0 个**且仍显示字面 `正文<br>不拆`（`brInBody:0`）。
- 真实路径：单元格 `End` → 打 `X` → `Shift+Enter` → 打 `Y`，当场 `td br` 由 1 变 2；源码框出现 `cX<br>Y`；`Ctrl+S` 写出的字节与源码框**逐字节相同**（`equal:true`），保留 `<br>`。
- 重开（用上一步真实保存的字节做新页面种子）：`td br = 2`、单元格文本 `["列1","列2","AB","cXY"]`，无字面 `<br>`。截图 `shots/round-39/tester1-cell-br-reopen.png`（左列 A/B、右列 cX/Y 各显示两行）。
- 单测：`node --experimental-strip-types src/lib/tableCellBreaks.test.ts` 含在 `npm test` 内（8 条全过，`ℹ pass 8`）。
- 源码复核：`src/lib/tableCellBreaks.ts:21` 只在 `tableCell`/`tableHeader` 内生效；`hasMarks` 的文本不拆（`tableCellBreaks.ts:33-35`）；无改动返回同一对象（`:67`）；`escapeHtmlForParse`（`src/lib/html.ts:21-23`）与序列化侧未被改动（`git diff` 无这两个文件）。
- 计划要求的 `npm run roundtrip rich 5/7 source 7/7` ✅（§1）。

## 3. T2 `../`、`%20` 图片与缺失占位 —— 通过

`node .tmp/e2e-r39-tester.mjs t2`（14 项断言，日志 `.tmp/r39-tester-e2e.log` 的 `## t2-*` 段）。

- 假工作区 `章节/一.md`（种子 105 字符 / 131 B，与计划写死的那串一致）+ `assets/pic.png`、`assets/my pic.png`、`章节/同.png`；**不放** `assets/nope.png`。
- `../assets/pic.png`、`../assets/my%20pic.png`、`./同.png` 三张都 `naturalWidth:1` 且 `src` 以 `blob:` 开头。
- 缺失图：`img[data-asset-missing]` 恰好 **1** 个、`getAttribute('src') === null`、`alt === '没图'`、`title === '图片未找到：../assets/nope.png'`、可见尺寸 96×41（虚线占位）。截图 `shots/round-39/tester2-img-missing.png`、`tester2-img-parent.png`。
- **不发请求**：`page.on('request')` 里含 `nope.png` 的条数 **0**（`## t2-nope-requests []`）；`response` 也是 0 条（没有 SPA 回退 `200 text/html` 记录）。
- **计数有牙的对照**（本轮自建）：单文件打开（无目录句柄，按 R4 方案 1 保持现状）的 `![没图](../assets/nope.png)` 会 `paint(src)` → 实测发出 **2** 条 `http://localhost:5175/assets/nope.png` 请求，且 `data-asset-missing` 不存在（`missing:false`）。同一计数器在有工作区时是 0，证明 `=== 0` 不是空断言。
- 保存字节：`Ctrl+S` 后 `readFakeFile('章节/一.md')` 与种子 `equal:true`（105 字符 / 131 B），0 处 `blob:`。
- 单测：`assetResolve.test.ts` 新增断言在 `npm test` 内全过（含 `../../a.png` → `null`、`%2e%2e/a.png` → `null`、`a%ZZ.png` 不抛错）。
- 源码复核：前缀校验仍在（`src/App.tsx:4006`）、`catch → return null` 未变（`:4014`）、`resolveAssetSegments` 纯函数（`src/lib/assetResolve.ts:45-72`）、`assetImage.ts` 的 `waitResolve` 判定含 `getAssetDocPath() !== ''`（`src/lib/assetImage.ts:52`）。

## 4. T3 源码模式查找替换 —— 通过

`node .tmp/e2e-r39-tester.mjs t3`（13 项断言）。

- 源码态：`↑ / ↓ / 替换 / 全部替换` 四个按钮 `disabled === true`（`✕` 关闭仍可点）、`.find-note` = 「源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查」、`.find-count` 为空。截图 `shots/round-39/tester3-source-find.png`。
- **有牙判据**：替换框 `Enter` 后 `localStorage['sidelight.doc.v1']` 与按键前**逐字节相同**（73 → 73）、`.source-editor` 内容不变（18 → 18）、`window.__slState.dirty === false`；查找框 `Enter` 后草稿仍 73。
- `Esc` 一次只关查找（`{find:false, source:true}`），不退源码。
- 回归：回富文本后 `.find-count === '1 / 2'`、无 `.find-note`、四按钮可用；填 `ZZ` 点「全部替换」→ 正文 2 处 `ZZ`、`dirty:true`。
- 源码复核：`FindBar` 两个 `onKeyDown` 都是 `preventDefault()` 后 `if (locked) return`（`src/components/FindBar.tsx:52-57`、`:88-92`），替换框没有 `readOnly`；`disabled = locked || total === 0`（`:39`）保住原 `total === 0` 条件。

## 5. T4 1 MB 归因 + 去重 + 体积文档 —— 通过

**去重**：`src/App.tsx` 第 2043–2094 区间只剩 **1** 次 `serializeDocument(`（`:2047`），同一 `serialized` 给 `baselineLosses`（`:2053`）与 `baselineRef.current = serialized.replace(/\r\n/g,'\n')`（`:2056`）。`npx tsc --noEmit` exit 0、`npm test` 320 条不变。

**埋点正向对照（先做）**：`Select-String -Path src/App.tsx -Pattern 'performance\.mark\('` → **8 行**；`performance\.mark\('sl-load-start'\)` → **2 行**；按标签分组 `sl-load-start:2 / sl-parse-done:1 / sl-dispatch-done:1 / sl-serialize-done:2 / sl-sync-done:2`。行内守卫形态：`if (import.meta.env.DEV) performance.mark(...)`（`App.tsx:987,993,1012,1020,1027,2043,2052,2094`）；`sl-parse-done`/`sl-dispatch-done` 都在 `setMarkdown` 内部（`:982-995`）。

**埋点不进生产**：`Select-String -Path .tmp/build-r39/assets/*.js -Pattern 'sl-load|sl-parse|sl-dispatch|sl-serialize|sl-sync'` → **0 命中**（pattern 含 `sl-dispatch`；旧的不含 `sl-dispatch` pattern 同为 0，两口径都不误伤）。

**首屏体积**：`290,021 B`（第 38 轮 289,430 → **+591 B**），`files=3`，`PASS`，距硬线 320,000 余 29,979 B、距内部 310,000 余 19,979 B。

**1 MB 实测（本轮 tester 独立跑，未读 impl.md）**：`node .tmp/e2e-r39-code-1mb-multi.mjs`（`SIDELIGHT_CDP=http://127.0.0.1:9222`，日志 `.tmp/r39-tester-1mb.log`）。样本 `1,048,576` 字符 / ≈37,450 段。

- 编辑器可见耗时 **219,996 ms**（dev，`StrictMode` 两遍）；console 错误 0 条。
- 原始 mark **10 条**（5 标签 × 2 遍，`["sl-load-start",124] ... ["sl-sync-done",219329]`），等读数期间 mark 条数连续两次 = 10。
- 每 name 取最后一条算**单遍**：parse = 217,464 − 107,550 = **109,914 ms**；dispatch = 219,231 − 217,464 = **1,767 ms**；serialize = 219,300 − 219,231 = **69 ms**；sync = 219,329 − 219,300 = **29 ms**；尾段 = 219,996 − 219,329 = **667 ms**。
- 结论与计划口径一致：「去掉重复序列化」只值 ≈69 ms 量级（0.03%），真实产出是 parse 段（≈110 s/遍）与 dispatch 段；serialize/sync 已被排除。生产口径未测（见 §6）。

**文档可 grep**：`README.md`/`packaging/README.md` 含 `1,300,711`、`1,622,355`、`45,000,000`、`50,000,000`；`docs/CHANGELOG.md` `## Unreleased（第 29–39 轮，未发版）` 有本轮 6 条；`docs/typora-gap.md` 计数 `## 已经有的（30）`、新增「表格单元格内换行往返」行、图片行补 `../`/`%20` 与占位；`README.md:46`（图片句）、`README.md` 查找替换句、`AGENTS.md` §6 测试 25/320 与首屏 290,021、§3 条数注释均已同步。`package.json` 版本仍 `0.32.1`（计划不发版）。

**偏差（记录，不判 FAIL）**：计划 T4 写「gzip 与第 38 轮相差 ≤ +200 B」，实测 **+591 B**。`plan-review.md` §三.4 已指出该口径把 T1–T3 的代码增量算成埋点，`plan.md` revision=3 的执行口径是「以硬线 ≤310,000 B 为判据，差值按 T1–T3 归属」。本轮 +591 B（`tableCellBreaks` + `resolveAssetSegments` + `FindBar` + 占位 CSS）仍远在内部预算内，且埋点产物 0 命中，按修订口径**通过**；如按旧文字逐字判会红，已在此写明。

## 6. 回归

| 脚本 | 结果 |
| :--- | :--- |
| `npm run roundtrip` | rich 5/7、source 7/7（不回归） |
| `scripts/fidelity-acceptance.mjs`（`SIDELIGHT_URL=5175`） | **19/19 PASS**（保存字节逐字节、表格改单元格、引用式链接源码模式四条、脚注拦截等） |
| `scripts/keyboard-acceptance.mjs` | **52/52 PASS**（Esc 退出源码/预览、表格 Tab、Ctrl+Shift+1/P、保存失败 role=alert） |
| `npm test` | 25 文件 320 条 0 fail（`assetResolve.test.ts` 原有 5 条不回归） |

`keyboard-acceptance.mjs` 跑完覆盖的 `shots/round-05/` 已用 `git checkout -- shots/round-05/` 还原，`git status` 无残留。

## 7. UNVERIFIED

1. **真机 FSA / 宿主（WebView2）里的相对图与单元格 `<br>` 往返**：本轮用假 FSA 与源码框载入复现同一条解析路径；沙箱起不了 WebView2 窗口。补测：宿主打开含 `../assets/` 图与 `Shift+Enter` 单元格的文档，看占位与重开表现（宿主按 R4 方案 1 不压制 `src`，预期仍是破图图标）。
2. **1 MB 的生产口径（minify 单遍）**：本轮只在 dev server 上量（`StrictMode` 两遍，219,996 ms）。生产需 `vite preview` 或宿主冷启动，环境硬约束（不另起、不重启 server）下未做；不要用 dev 数字乘/除推生产。
3. 其余与第 38 轮相同的未验项（安装/开始菜单/SmartScreen、macOS、真实 IME、125%/150%/200% 缩放屏）本轮未新增证据。

## 8. 其他观察（不构成失败）

- `tableCellBreaks.ts` 对**带格式**（`marks` 非空）的文本不拆（`src/lib/tableCellBreaks.ts:33-35`）。计划 T1 步骤 1 原文没写这一条（`plan-review.md` §三.5 R5 属未调度项），实现比计划更保守：`**A<br>B**` 仍会显示字面 `<br>`，`typora-gap.md` 已如实写成「带格式的单元格也仍显示字面」。属缩小范围的自保，未引入回归（`npm test` 有专门一条锁住）。
- `scripts/fidelity-acceptance.mjs` 第一次与 1 MB 实测并发跑时 `connectOverCDP` 30 s 超时（浏览器被 1 MB 渲染阻塞），错峰后 **19/19 通过**；这是环境并发，不是产品缺陷。
- 运行 `node scripts/measure-first-screen.mjs` 时 `--target 310000` 按 §1 写法生效，未再触发第 35 轮记录的「把 flag 值当目录」问题。

## 9. 判定

**PASS**。门禁全过（tsc / test 25 文件 320 条 / roundtrip / build / 首屏 290,021 B PASS），T1–T4 验收标准逐条从零复验通过，回归 fidelity 19/19 + keyboard 52/52，1 MB 四段数字已独立复现。收尾动作见 `docs/iteration/STATE.md` 第 39 轮行与本轮 commit。
