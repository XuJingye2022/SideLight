# 第 110 轮 impl（executor）

起点 `09d72f6`；dev `localhost:5175`；真机 ego CDP 57270、1440×900。**产品代码 0 改动**（A2 未触发）。改动：`docs/iteration/BACKLOG.md` 一行 + 本文件。

## A1 真机复现与分级（B-236）— 完成，判定 (a)

- `node .tmp/e2e-r110-a1-hitarea.mjs` → `.tmp/r110-a1-hitarea.json`：exit 0、**15/15 pass 0 fail**、0 pageerror、冷加载 1,515 ms；视口 `Emulation.setDeviceMetricsOverride(1440,900,deviceScaleFactor:1,mobile:false)` 回读 **1440×900**。
- 冷加载读数：`.rail-diff-open` rect **[1214,140,35,24]**、`.rail-review-open` **[1256,140,35,24]** → 高 **24**；计算 `min-height`/`height` 均 **24px**、`box-sizing:border-box`、`padding:0 6px`；间距 **7**；在审右缘差 **0**；`.rail-head` rect **24** 且规则块无 `height`；rail/head 横溢 0。
- CSSOM 命中整块：`.rail-diff-open, .rail-review-open { … min-height: 24px; … }`，无 <24 的 `height`（完整 cssText 见 JSON 与日志）。
- 反事实（同页 `<style>`）：`height:16px!important;min-height:0!important` → 两钮 **35×16**（min-height 0px）；撤掉 → **35×24**。35×16 只存在于反事实 → **第 107 轮前的旧读数**。
- 三路 CSS 字节（node 读，非 grep）：`?direct` **78,141 B**；无 query **82,356 B**（Vite HMR JS，解出内嵌 CSS **78,141 B**）；`dist/assets/index-DO7Px368.css` **52,096 B**。三路目标块均含 `min-height:24px`（`min-height: 24px` 全文 10 处；`height: 16px` 2 处均在非目标钮）。
- **判定 (a)：35×24 → 陈旧读数、不改代码**；B-236 保持 `fixed`。

## A2 未触发（跳过）

A1 实测 35×24、计算 min-height 24px、CSSOM 命中块即 `src/styles.css:1332-1343` 现行块 → 计划条件「仅当 A1 复现 35×16」不成立，整条不做：`src/styles.css`、`src/lib/touchTargets.test.ts` 0 改动，无负向对照、无新截图。

## A3 回归与台账 — 完成

- 跑任何脚本前已备份 4 份：`.tmp/r110-backup-{r107-targets-before,r107-tester-geom,r100-tester-diff,r101-e2e-review}.json`。**未跑** `.tmp/e2e-r107-targets.mjs`（无参默认 `--phase before`，会覆盖 r107 的 16px 基线）。
- `node .tmp/r107-tester-geom.mjs` → **23/23 pass 0 fail**、exit 0（㉓ 0 pageerror；三档横溢 0 在 ⑥⑬㉑）；`node .tmp/e2e-r100-diff.mjs` → **43/43 PASS**（全程 0 pageerror）；`node .tmp/e2e-r101-review.mjs` → **57/57 PASS**（⑬ 0 pageerror）。日志 `.tmp/r110-a3-{geom,r100,r101}.log`。
- `git checkout -- shots/round-100 shots/round-101 shots/round-107` 还原 3 张（round-100/diff、round-101/review-list、review-truncated）；round-107 两图本轮字节未变。
- 台账：BACKLOG B-236 追加第 110 轮段（判定 a、三路字节、回归、门禁），轮次列 107 → **107/110**，状态 **fixed**。
- 最终 `git status --porcelain`：` M docs/iteration/BACKLOG.md` + `?? docs/iteration/round-110/`。

## 门禁（未改 src）

- `npx tsc --noEmit` exit 0（`.tmp/r110-tsc.log`）。
- `npm test` **62 文件 877 条 0 fail**（`.tmp/r110-npm-test.log`）。
- `npm run verify` **PASS**：首屏 gzip **315,220 B**、raw 1,022,532、余硬线 **4,780**（超内部预算 5,220 B 只 WARN），与计划基线同（`.tmp/r110-verify.log`）。
- 未跑 `npm run roundtrip`（未改编辑器/序列化）。

## 截图与 CHANGELOG

- 本轮 0 张（产品 0 改动）；`shots/round-107/targets-{notes,chat}.png` 仍是 24px 真机证据，本轮未改写。
- CHANGELOG：无（0 产品改动）。

## 新踩坑

1. `GET /src/styles.css`（无 query）是 **Vite HMR JS 模块**：CSS 作 `const __vite__css = "…"` 的 JSON 字符串内嵌（换行是 `\n` 转义），按 CSS 正则找规则块恒 0 命中，会误判「dev 没交付新 CSS」；先 `JSON.parse` 解出（本轮 78,141 B，与 `?direct` 同）。
2. `… | Select-Object -First N` 关闭管道会**提前终止**上游 node，`$LASTEXITCODE` 也不是 node 的退出码；判 E2E 的 exit 用 `cmd /c "node … > log 2>&1"`，再用 node 读日志。
