# 第 114 轮计划审查（critic v2，复审 revision 1）

结论：**REVISE**（1 条 P1、4 条 P2）。v1 的 CR-1/2/3 已修（见下）；CR-4/5/6 已吸收。方向不改，只改体积口径与验收写法。v1 原文留在 `plan-review-v1.md`。轮前 `531b650` 已核（工作树只多 `docs/iteration/round-114/`）。

## 实测
门 **315,218**（3 文件、余 4,782）；`MarginRail-Ba9-fGtt.js` gzip9 **6,916**（raw 19,597）→ 合计 **322,134**，与 §0 同。门只读 `dist/index.html` 的 script/link（`measure-first-screen.mjs:23-44`），无 manualChunks → 惰性 chunk 不计首屏；`verify -- --max` 可透传。`revisions.test.ts` 28 条；两 helper 在 `revisions.ts:203`/`:219`，写目录 `:197-200` 带 create，`:87` savedAt 回落 0。`cache.ts:109-110` 与 `workspace.ts:143-161` 均不带 create。

## 上一版三条
- CR-1 **已修**：A1 明写不复用 `revisionsDir`、照 `cache.ts` 无 create；单测 a/b 断 `dirs` 不新增（fake `:70-77` 无 create 即 throw）；A2 例 1 断 S 写 0。`getRevisionSource` 走 `cacheDirFor()`→`parentDirectory`，也是只读。
- CR-2 **半修**：改 `await import()` 对（惰性 chunk 不计首屏），但 §1 两个数仍错 → H1。
- CR-3 **已修**：savedAt 取文件名；例 3/7 有 `savedAt:0` 对照。

## 漏洞

**H1（P1）§1 两个体积数不可复现。** ① 常驻 chunk `6,916→≤6,980` 只留 64 B gzip；`revisionList` 只是数据层，A2 的 import/state/effect/JSX 与中文文案（40 余字，单独约 100 B）全落这个 chunk，无实现路径，A2 却拿它当验收门。② 合计 `≈322,1xx–322,2xx` 与同段「门 315,3xx + chunk 6,98x」矛盾（应 322,4xx–322,5xx）；B-229 open，数字须对得上。
修：A1 惰性模块直接产出每行 `label`（时刻+`N B`+批注数拼好），MarginRail 只渲染 `{row.label}`；常驻上限按实现路径改 ≤7,400 或「只报实测、不设门」；合计写「门实测 + chunk实测」，A2 三数并报。

**H2（P2）例 2 的 `Ctrl+S` 不写盘。** 无改动保存直接早退（`App.tsx:3644`/`:3651`「没有改动，未写入。」），`R` 会 0 份，例 2/3/4 连锁红。修：例 2 先敲字造 dirty 再 `Ctrl+S`，并加一条「同文本再存被 digest 去重、仍 1 份」。

**H3（P2）E2E 计数口径抄不来。** 例 1 用 `root.dirs`，那是 `revisions.test.ts` 的 fake 叫法；r101 风格 fake 没有 `dirs`，且**全文 0 个 `read:`**（`.tmp/e2e-r101-review.mjs:131-152`），照抄则「read:R 恰 8」恒 0。修：明写新 fake 在 `getFile()` push `read:`（r101 没有）；例 1 断「`files` 无 `.sidelight/` 前缀键 + ops 无 create」。

**H4（P2）BACKLOG 不在改动清单。** §3 要入池 B-247/B-248（ID 未占用，现最大 B-246），但 A2 文件表无 `docs/iteration/BACKLOG.md`，tester 第 3 条白名单也不含它 → 自相矛盾。修：两处都加；tester 顺手核 B-247 状态、B-248 为 `deferred`。

**H5（P2）两处锚点写错。** `styles.css:1477` 在 `.rail-chat-reset` 规则体内（`:1474-1482`），按此插 6 条会插进规则体；`App.tsx:5093` 是 `<div className="spacer" />`，不是动态 import 先例（真先例 `:2738`/`:2974`/`:3103`）。修：CSS 锚到 `:1352-1360` 的 `.rail-review-open` 规则后；import 先例改正。

## 其余
r101 `:484` 断 sheet ≤80vh 不破；r105 `:290` 的 600 ms 只看 sheet 出现，不随快照变慢；`.rail-snap*` 全仓 0 冲突；`sheet.text`/`labelText` 不受影响。`findRevisionsDir` 放哪个文件未写（建议 `revisionList.ts` 内部，`revisions.ts` 只加两个 export）。§3 的「开工前 lead 确认」建议删：写侧第 99 轮已上线（B-226），面板只读已有文件，「不做回滚」不是新增可见能力，B-248 `deferred` 足够。

## 体积判定
门 315,900 够装 A2 增量，放行。真首载按 H1 修后须报门/chunk/合计三数（约 322,4xx–322,5xx）。A2 时间偏紧（新 14 例 + 3 回归 + build/test），回归先 r101，超支按 §4 ②。
