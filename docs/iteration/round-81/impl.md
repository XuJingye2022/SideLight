# 第 81 轮实现（executor）

- startSha `287e35f`；只改 `src/App.tsx`（+76/−17）；不 commit、不动 `release/`、版本 0.32.1。
- 环境：dev `:5175` 200；CDP 9222–9226 全闭 → 按 plan-review-r2 P2-4 走 ego `:54280`（先跑 `.tmp/reset.mjs 54280`）。

## A1（B-139）源码态逐键不再算全篇字数 —— DONE

- 改动：`src/App.tsx:596-598`（state）、`:684-688`（计时器 + seeded ref）、`:3801-3830`（effect）、`:6094`（换取值）。effect：进源码态立即算 1 次（`sl-source-stats` 埋点），之后仅 `sourceText` 变时排 300 ms 防抖；≤20 KB 立即算；离开源码置 null 并清表。
- 脚本 `.tmp/e2e-r81-a1-src-stats.mjs`（1 MB、1,000,012 字符，r64 骨架 + 四采样）。
- 机制门（主）：`.tmp/r81-a1-before.json` c0..c5 = 0/0/0/0/0（HEAD 无埋点）；`.tmp/r81-a1-after.json` **c0=1、c1=1、c2=1、c4=2、c5=2** → c1−c0=0、c2−c0=0、c4−c0=1、+800 ms 不再多算；`typing.totalMs` 1037 < 1,200，无需 UNVERIFIED。
- 静态门：`countText(` 5 处（`596/1127/1166/1216` + effect `3823`），旧渲染点（原 `:6035`）0 处。
- 值门：改前后 600 ms `.stats-trigger` 同为「333,337 字 · 阅读约 1260 分钟」。
- 次门槛：每键 longTask **p50 82 → 52 ms**（门槛 ≤77）、总 891 → 585 ms；max 134 → 102 只记录。
- 其它：value.length +10、`sl-parse-done` 3→3、0 页面错误、无界面变化未截图。

## A2（B-153）保存与回基线都清草稿（含 legacy） —— DONE

- 改动：`:669`（ref）、`:1140-1142`（`dirtyNow===false` 翻转经 ref）、`:3050-3074`（`discardDraftFor`，在 `finishSaved` 前；先停表 + 推代际再删主键/legacy 键）、`:3139-3143`（`finishSaved` 改调它）、`:3193-3195`（**次触发选 (a)**：`performCommit` 正文没变分支）、`:3287`、`:3789-3791`。
- `.tmp/e2e-r81-a2-drafts.mjs`：改前 8/13、改后 **13/13**（`.tmp/r81-a2-before.json` / `-after.json`）。
  - D1=0（改前也 0）：设置开时草稿 1 份，取消后 3.5 s `drafts=[]`、`a.md` 12→16 B、toast「已保存 a.md」。
  - D1'（主门）：撤销前 1 份 → Ctrl+Z（距取消 283 ms）→ **首个 0 时刻 335 ms**（≤600；改前 1,500 ms 内无 0）→ 再等 2.5 s 仍 0。
  - D2：撤销后 150 ms `Ctrl+S` → `drafts=[]`（改前 `[a.md]`）。
  - L1：45 字符名（新键带哈希 / 旧键 40 位，注入 2 份）→ 保存后两键都不在、+3.2 s 仍不在；改前旧键残留。
  - N1 反例：关自动保存后打字 3.2 s，草稿仍留 1 份。
- UNVERIFIED：①「保存失败仍留草稿」未造失败夹具（静态：catch `:3253-3257` 只提示、不清理；失败仍走 `writeDraftFallback`）；②「重开同篇不弹恢复」未单独造（保存后 `drafts=[]` → `readCacheText` null → `:2458` 早退）。

## A3（B-134）导出目录复核 —— DONE（0 改动）

- `node --experimental-strip-types src/lib/export.test.ts` → **27/27、exit 0**。
- 静态：`export.ts:33` `buildExportToc`、`:110` `applyExportTocHtml`、`:258` `nav.sl-toc`；`App.tsx:4852` import、`:4885` 调用（plan 的 `:4793/:4826` 是加行前旧号，+59）。
- 真机段交 tester（复用 `.tmp/e2e-r79-a2-export-toc.mjs` 探针）；B-134 维持 `fixed` 交 scribe。

## 门禁

- `npx tsc --noEmit` 通过（0 输出）；`npm test` 45 文件 **580 pass / 0 fail**；`npm run verify` PASS、首屏 gzip **304,124 B**（余 5,876）；`roundtrip` 免跑（未动序列化）。
- 新踩坑：① 机制门「逐键不增」改前也成立（0−0），须配「停笔 +1」；② `Select-String -SimpleMatch 'countText('` 本机 0 命中（含括号模式），静态门改用 ripgrep；③ 每键 longTask 底数轮间差大（本轮 before p50 82 对 r65 的 121），门槛须同轮现测。

## CHANGELOG 建议一行

- 第 81 轮：1 MB 源码态逐键不再重算全篇字数（每键 longTask p50 82 → 52 ms，停笔 300 ms 算一次）；保存成功与「撤销回基线」都作废 `.sidelight` 停笔草稿（含 legacy 键）。
