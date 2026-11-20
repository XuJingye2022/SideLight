# 第 128 轮执行报告（executor）

轮前 HEAD `1c582d1`（= startSha）。收尾工作树：4 个 src 文件 + BACKLOG 一行 + 未跟踪 round-128 报告与截图。未 commit/push、未改版本与 `release/`、0 新依赖。

## A1 两枚常驻字段标签 + 9 条中文文案 — DONE

- `annotations.ts:12-20`/`:35-41`：priority `无/低/中/高/急`、status `待处理/处理中/已解决/不修复`，注释写「内部 value/存盘仍是英文枚举」；两个枚举表（`ANNOTATION_PRIORITIES`/`REVIEW_STATUSES`）、类名、存盘字段零改动。
- `MarginRail.tsx:626`/`:644`：select 前插 `span.note-field-label`（紧急度/状态，aria-hidden）；select 的 value/onChange/stopPropagation/aria-label/option map 不动。
- `styles.css:1674` gap 6→3；`:1687` 新 `.note-field-label{font-size:10px;letter-spacing:0;white-space:nowrap}`；`:1678` 注释写实测合计。
- `annotations.test.ts:422-431`/`:619-627` 期望改中文；`:778-794` 新增静态门（摘注释后 MarginRail 恰 2 枚 `['紧急度','状态']`、styles.css 恰 1 条规则）。

门禁：`tsc --noEmit` exit 0；`npm test` **66 文件 931 条 0 fail**（改前 930，+1 即静态门）；`git diff --stat -- src` 恰 **4 文件 +49/−17、0 新增**。

## A2 自证 + 体积/门禁 + 回归 — DONE

- 新 `.tmp/e2e-r128-note-fields.mjs`（ego 57270、1440×900、假 FSA + 无 Key 3 卡）**45/45 PASS、0 pageerror**；`.tmp/r128-note-fields.json`；截图 `shots/round-128/note-field-labels.png`。
- 先量 M = `.note-head` clientWidth **294**（294±1 成立），后续断言全用 M。
- 结构/可见性：每卡 2 标签、文本 `['紧急度','状态']`、`nextElementSibling` 是对应 select、DOM 序 紧急度→priority→状态→status、aria-hidden；9 项可见性过（宽 30/20、高 14、font-size 10px、display/visibility/opacity、单行、右缘在 head 内容内、中心命中）。
- 文案：priority `无|低|中|高|急`（值 none…）、默认「无」；status `待处理|处理中|已解决|不修复`、默认「待处理」。
- 几何（滚 `.doc-scroll` 240 + 点第 2 段走 floor 分支，同 r97）：模拟 **276.84**、正式 **280.8**（≤ M−3=291）；head 高 24、横溢 0、极差 0；卡 [128,279.5]/[292,462.25]/[474,625.5] 不重叠、末卡底 625.5 ≤ 整体评价顶 638.19；栏宽 320。
- 1024×700 抽屉：rail 340，卡/head/rail/doc 横溢全 0、0 pageerror。记录偏差：滚动条占 ~15 px，head 内容宽 **271**（计划估 282），3 卡卡头两行（52/44）——按计划 §6 只断无横溢，不判 FAIL。
- 体积：`verify --max 316500` PASS、门 **315,824**（+28 ≤100）；chunk gzip9 **7,866**（+19 ≤150）；合计 **323,690**（超线 3,690，B-229 open）。BACKLOG B-229 补三数与轮列 128。
- 回归：r95 **29/29（0 FAIL）**、r97 **44/44**（单行门未删/未放宽）；跑后已 `git checkout --` 还原两轮历史截图。roundtrip 未跑（未动编辑器/序列化）。

## CHANGELOG 一行建议

批注卡头加常驻「紧急度/状态」字段名，两下拉文案改中文；内部值与存盘不变。

## 偏差与已知边界

1. 1024 抽屉卡头两行（无横溢，见上）。
2. 正式态合计 280.8 vs 计划 280.76（差 0.04，±2 记录口径内）。
3. 1440 滚到文首时自然位会把末卡排到贴底面板下（既有 sticky 口径），几何按 r97 floor 分支取。

## 新踩坑

1. **Vite dev transform 缓存会停在两次编辑之间**：交付只含第一处标签（count 1），touch `MarginRail.tsx` 后变 2；判「没落地」先数 dev 交付字节。
2. **PowerShell 双引号里的反引号会吃掉 markdown 反引号**：`node -e "…`open`…"` 静默 `NOT FOUND`，含反引号改用 edit 工具。
3. **1024 抽屉不能按 340−32−26 算**：滚动条占 ~15 px，head 内容 271 而非 282；窄窗几何先量再套预测值。
