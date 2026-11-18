# 第 62 轮计划审查（critic · revision 1 复核）

**REVISE**（P1×2）。R1/R2/R3 见末节。

**核对过**：HEAD `12f36e4`（BRIEF:6 的 `6f8a515` 过期）。A3 数字实测全对：词边界 grep 0/exit 1、宽口径 15、依赖 `[]`、`缺 4 项` 改前 2、`r58-docs-check` 39/4 且 sub 1/1/2、BACKLOG 唯一重号 `B-132`、`\| open |` 残留 1。A1/A2 目标行与 B2 的 `:1069`/`:2999-3003`/`:3061` 都成立。`r53-a1-before.json` enterTotal p50 9,921 / exit 2,054。

## 漏洞

**H1 [P1] B1② 的「进 p50 降 ≥50%」没有实现路径**。`r53-a1-before.json` 每轮 `ltEnter` 主力是 **8,635 ms**（`inSrc.pmCount=0`，进源码要卸载 44,446 块）；`r53-a1-after.json` 只把编辑器改 hidden 后 `ltEnter [111,1015,57]`、enterTotal 1,100。9.9 s 里 ~8.7 s 是卸载编辑器，`<textarea>` 排版只 ~1 s（AGENTS 第 8 节：`wrap=off` 486 ms 已是最好），`wrap="off"` 最多省 ~10%，到不了 ≤4.96 s，只会按 plan:34 回滚并重复 B-115 现有结论。修：② 改成「`wrap="off"` + 保留编辑器 hidden（第 53 轮 after 实测 1.1 s / 0.5 s）」，门槛用 ① 的 1.2 s 口径（进 ≤1.2 s、最长 long task ≤1.5 s、退 ≤max(0.8 s, A×1.25)）；或明确只测基线、不设 ≥50% 门。

**H2 [P1] B2 只修 FSA 草稿，宿主仍 800 ms 先写整篇**。更新回调宿主分支 `App.tsx:1036-1039` 走 `scheduleHostDraft`，其定时器 `:3460` 也是 800；宿主保存回包走 `applyHostSaveSuccess`（`:3787-3832`），`:3832` 才 `clearHostDraft`（`:3468-3481`）停表。桌面双击 `.md` 的主路径同样一次停笔写两份全文，tester 在假 FSA 验完就会把 B-120 标 fixed。修：`:3460` 同改 2500（关窗存档走 `:3678` 直发，不受影响；`:3595` 的失败兜底会晚 2.5 s，记报告），验收加「静态核对宿主计时器，宿主 INIT-FAIL 记 UNVERIFIED」，或 B-120 不标 fixed。

**H3 [P2] findings-typora.md:32 的命令仍是旧的**。缺 `-- src package.json`，实测 **17 命中 exit 0**，「0 命中（exit 1）」按字面不成立（R2 要求两处都改）。修：A3 文件清单加该行，命令照 BACKLOG:43 补路径。

**H4 [P2] B-135 的 deferred 不在 A3 动作里**。plan:24 说「记 deferred」，plan:23 的 BACKLOG 清单没有 → B-135 停在 open P1（BACKLOG:43），common.md:34 的停止条件差一条。修：A3 清单加「B-135 `open`→`deferred`，备注待人批准（红线 6）」。

**H5 [P2] A2 会让重建路径多一次全篇扫描**。`hasTocSource` 内含 `tocEntries`，`tocRender.ts:131` 调完 `:135` 又算一次；1 MB 含 `[TOC]` 文档每次重建多一次 `extractOutline`。修：让它收已算好的 `{sources, entries}`，先算后判。

**H6 [P2] B 轮 25 分钟装不下 delta+B1+B2**。plan:26 是「≤25 分钟；先 10 分钟 delta」，plan:34 又给 B1 硬闸「起 20 分钟」，T+10+20=T+30 已超；B2（改码 + 两档 e2e）还要 ~8 分钟。修：B2 先做，B1 用剩余 ~15 分钟、硬闸改 T+15、砍掉只作参照的 B 夹具。

## 上一版复核

- **R1 已修**：B-120 入 P1 段，B2 的 800→2500 与 `:2999-3003` 依据齐全；缺口见 H2。
- **R2 部分修**：A3 验收与 BACKLOG:43 已换成可复现命令（实测对）；findings-typora 未改，见 H3。
- **R3 已修**：复制成 `.tmp/e2e-r62-b1-a.mjs`/`-b.mjs`，输出 `.tmp/r62-b1-a.json`/`-b.json`；即使漏改 `:196` 也只写 `r53-a1-r62.json`，旧证据不受影响。
- R4–R6 已按原意补：≥1.2 s 全进②、`styles.css:1783-1796` 确无 `white-space`、A 夹具已钉、`escapedTocLineCount` 含 `fenceMap`/`$$` 且混合文档预期与公式自洽（当场 nav 2 → 两行转义 → 重开 0）。
