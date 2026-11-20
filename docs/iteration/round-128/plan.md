# 第 128 轮计划（planner，单轮 · **修订 r1**）

轮前 HEAD `1c582d1`（startSha）、工作树净；dev 5175（不重启）；CDP 9222–9226 无监听，真机 ego 57270。

## 0 修订记录（CR-1–CR-6）
- **CR-1 内容宽 294**：真机量 `.note-head` clientWidth=**294**（卡 320−22−4；`styles.css:1767` 注释也写 294）；v1 的 296 作废。改后 3 卡余 13.24、10 卡余 5.8 px。
- **CR-2 采 (a)**：9 条显示文案中文化；内部 value/类名/存盘不动；若 lead 要英文只回退两张 LABELS 表。
- **CR-3**：A2 并列记「门 / chunk gzip9 / 合计」并更新 `BACKLOG.md` B-229 第 128 轮值；硬线仍按门算。
- **CR-4**：加可见性机械断言 + 零体积静态门（读 `MarginRail.tsx`，不进包）。
- **CR-5**：撤销 v1 的「下拉 11→10 px」「`.note-kind` padding 6→4」。
- **CR-6**：A2 加 1024×700 一档（只断无横溢、无 pageerror）。

## 1 体积（先算再改）
- gate **315,796 B**（`--max 316500` PASS、余硬线 4,204）；chunk gzip9 **7,847**；合计 **323,643**（B-229 `open`，口径待 lead）。
- 预算：gate 净增 ≤100、chunk 净增 ≤150、合计 ≤324,100；超了先删/合并 CSS 声明再量，不抬 `--max`。

## 2 问题与判定
- 两枚 select 无可见字段名；紧急度默认只有 `-`。卡头现状 253.76 单行。
- 中文化后两下拉落到 min-width **64/72**（−20）；10 px 标签 **30+20**；gap 6→3：3 卡正式 **280.76**（余 13.24）、模拟 **276.84**（余 17.16），单行 24 px、`scrollWidth=clientWidth=294`；10 卡「第 10 处」+7.4 px 仍单行（余 5.8），100+ 卡才换行（flex-wrap 兜底）。
- 判定：两枚 select 前加常驻可见标签「紧急度」「状态」；`none`→「无」；显示文案 `无/低/中/高/急` + `待处理/处理中/已解决/不修复`。内部值、`.note-priority-*`/`.note-status-*` 类名、存盘字段全不动。标签 `aria-hidden="true"`（select 的 aria-label 已含字段名）。
- 标签继承 `--ink-faint`，三主题对卡底 `--paper-raised` = **5.23/6.26/5.53**（≥4.5，10 px 过 AA；不新增配色对）。

## 3 任务

### A1 实现
文件：`MarginRail.tsx:626/:643`、`styles.css:1674` + 新规则、`annotations.ts:13-19/:35-40`、`annotations.test.ts:422-431/:619-626`。
1. `annotations.ts`：priority 文案 `无/低/中/高/急`；status `待处理/处理中/已解决/不修复`；两处注释改「显示中文，内部 value 仍是队列英文枚举」。
2. `MarginRail.tsx`：两处插 `<span className="note-field-label" aria-hidden="true">紧急度</span>` / 「状态」（字面量，供静态门读）；select 的 `value/onChange/stopPropagation/aria-label/option map` 不动。
3. `styles.css`：`.note-head` `gap: 6px`→`3px`；新 `.note-field-label{font-size:10px;letter-spacing:0;white-space:nowrap}`（放 `.note-head` 后）；`:1678` 注释改「两标签 + 两下拉 + 类型 + 序号：正式 280.8 / 294、模拟 276.8 / 294（1440×900）」。
4. `annotations.test.ts`：期望改 `['无','低','中','高','急']`、`none==='无'`、test 名改「none 显示为「无」」；四态期望改中文；**新增 1 条**读 `src/components/MarginRail.tsx`，`matchAll(/className="note-field-label"[^>]*>([^<]+)</g)` 恰 `['紧急度','状态']`。
- 验收：`npm test` 66 文件 **930→931** 条 0 fail；`note-field-label` 在 MarginRail 2、styles.css 1；`git diff --stat` 恰 4 个 src 文件、0 新增。

### A2 自证 + 门禁 + 回归
文件：新 `.tmp/e2e-r128-note-fields.mjs`；改 `.tmp/e2e-r95-a2-priority.mjs`（:11、:231）、`.tmp/e2e-r97-a1-status.mjs`（:12、:296、:304 正则补中文词）。
1. ego 57270 / `reset.mjs 57270` / 1440×900 / 假 FSA + 无 Key 造 3 张模拟卡（夹具照 r97）。**先量** `.note-head` clientWidth M（断 294±1），断言都用 M。
2. 结构：每卡 2 标签、文本 `['紧急度','状态']`、`label.nextElementSibling` 是对应 select、DOM 序「紧急度→priority→状态→status」。
3. 可见（CR-4）：`rect.width ≥30/≥20`、`rect.height ≥10`、computed `font-size:10px`、`display`≠none、`visibility:visible`、`opacity:1`、`getClientRects().length===1`、`rect.right ≤ head.left+head.clientWidth+0.5`、中心 `elementFromPoint` 命中标签。
4. 文案：`.note-priority` 选中「无」、options `无|低|中|高|急`；`.note-status` options `待处理|处理中|已解决|不修复`、默认「待处理」。
5. 几何（模拟/正式各一次）：可见子项宽+gap 合计 ≤ M−3（预期 280.76 / 276.84 ±1）、head 高 ≤26、中心极差 ≤1、`scrollWidth−clientWidth ≤0`；栏宽 320±1、3 卡不重叠、末卡底 ≤ `.rail-overall` 顶 ±1；另量「第 10 处」探针卡头（288.2 ≤ M−3）。
6. 1024×700（CR-6）：抽屉开（`.margin-rail` 340−32 → 卡内容 282），断 `.margin-rail`/`.note` 横溢 ≤0、0 pageerror；记 head 高（3 卡预计 24：仅余 1.24 px，10+ 卡才两行）。
7. 体积：`npm run verify -- --max 316500`（记 gate、净增 ≤100）；`gzipSync(dist/assets/MarginRail-*.js,{level:9})`（记 chunk、净增 ≤150）；三数写 `.tmp/r128-note-fields.json` 与报告；`BACKLOG.md` B-229 行末补「第 128 轮复测：门 = …、chunk gzip9 = …、合计 = …（超线 …，仍 open）」，轮列加 128，只改该行。
8. `npm test` 0 fail；回归 r95 改后 0 FAIL、r97 **44/44**（单行门不许删/放宽）；1440 档 0 pageerror；截图 `shots/round-128/note-field-labels.png` 1 张。
9. 不跑 roundtrip（未动编辑器/序列化）；不 push、不改 `release/`、0 新依赖。
- 回退档（只在真机换行时按序）：① 标签 9 px（−5）；② gap 3→2（−5）；③ 才降下拉字号并记偏差。
- 风险：余量靠本机 CJK 字宽（Windows/WebView2 同源；macOS 未验，若换行只多两行、无横溢）；抽屉 3 卡余 1.24 px，10+ 卡两行属已知偏差。
