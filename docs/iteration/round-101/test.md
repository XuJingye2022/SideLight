# 第 101 轮验收：在审文件列表（B-228）

- round=101，startSha `df57242`；A1/A2 executor 实现，A3 tester 独立（未读 `impl.md`）。
- 环境：dev `localhost:5175`（未重启）、ego CDP 57270、1440×900（⑪ 另切 1024×700）、假 FSA（`.tmp/r101-tester-review.mjs` 内建，`ops` 记 create/write）。
- 结论：**PASS**。自写 E2E **44/44**、0 pageerror（`.tmp/r101-tester-review.json`）；A1 自写探针 **6/6**；回归 r97 **44/44**、r100 **43/43**。

## 门禁与体积

- `node --experimental-strip-types src/lib/reviewFiles.test.ts` → **13/13**。`npm test` → **61 文件 861 条 0 fail**（基线 60/848，`.tmp/r101-tester-npmtest.log`）。
- `npm run verify` → exit 0、gzip **315,146 B**（raw 1,022,459、余 4,854；净 **+124**，基线 315,022）；`measure --max 316000` → PASS、余 854；超内部 310,000 只 WARN。
- 常驻 chunk `MarginRail-*.js` gzip9 = **6,489 B**（raw 18,336；第 100 轮 5,593 → +896）→ 真实首载 **321,635**（改前 320,615、**+1,020**、超硬线 **1,635**，记 **B-229**）。
- `changelog.test.ts` **3/3**，标题 `29–100`→`29–101`。**roundtrip 未跑**：只加只读扫描库 + 面板 + App 三个 prop + CSS，未碰编辑器/序列化。

## A1 数据层（自写探针 6/6）

旧档 accepted/dismissed 不计 open（→ open 1 / total 3）；notes-only 与坏 JSON 不入列；`parentDirectory` 抛错跳过不抛；201 篇 → capped/scanned 200/行 50、**ops 0**；同目录 `parentDirectory` 只进 1 次；open 降序、0 open 在后。交付单测 13/13 覆盖 60→50+truncated 与两个上限可调。

## A2 静态门

`rail-review` 渲染层 0 → **13 处**（`MarginRail.tsx` 7 + `styles.css` 6）；`collectReviewFiles` 在 `App.tsx` **0**；`App.tsx` 只 +10 行（`getReviewWorkspace`/`activePath`/`onOpenReviewFile`），`MarginRail.tsx` +154/−0，`styles.css` **+39/−1**、新选择器 **4 组**；test 链尾 +1 文件；`measure-first-screen.mjs:8-9` 注释 → 6,489。

## A3 真机（44 条摘要）

- ① 入口 1：`.rail-head` 内、高 16、`aria-haspopup=dialog`、文案「在审」；对话页签两入口 0/0，切回 1。⑨ 无工作区：入口 1、空态含「打开文件夹」、行 0。
- ② sheet `role=dialog`/`aria-modal`/`tabIndex=-1`/`aria-labelledby`→「在审文件」；焦点进面板；1440 宽 760、无横溢。
- ③ 行 2：`a.md open 2 · 共 3 条`、`sub/b.md open 1 · 共 2 条`（相对路径），`c.md` 不在，行是 button。④ 当前行 a.md 有 `aria-current="true"`+`is-current`，另一行不标；无打开文档时都不标。
- ⑤ 0 可编辑控件；开面板前后 create/write **0 增**（打开前 1 条 `create:.sidelight/trash` 来自工作区载入）。
- ⑥ 点 `sub/b.md` 行：面板关、切 b.md、`sl-parse-done` 3→4。⑦ 点当前行：面板关、仍 a.md、parse 3→3（同篇短路）。
- ⑧ 关闭钮/Esc/背板三路各 1：面板与 `[inert]` 归 0、焦点回入口；Esc 后 viewMode/name 不变；打开期间 `[inert]` 2。⑩ Shift+Tab 从页签落到入口、Enter 打开。
- ⑪ 1024×700：抽屉 rail 684–1024、head 701–1008，在审右缘贴 head 右缘（delta 0）、间距 7，在审与 × 在栏内；sheet 132–892×82–618 在视口内；doc/body 横溢 0。
- ⑫ 3 卡：首卡 `style.top` **112** ≥66、248–378/390–520/532–662 不重叠、末卡底 **662.25 ≤ 整体评价顶 674.19**；doc/rail/body 横溢 0。
- ⑭ 无 `.rail-count`：右缘 delta 0、两钮间距 7；有「3 条」：delta 0、间距 7。对照注入 `.rail-review-open{margin-left:auto!important}`（= 无兄弟规则）：间距 91.27、「对比」左移 **84.3 px**、在审右缘仍 0；撤掉后 `diffLeft` 1209 = 原值。
- ⑮ 51 篇：行 **50** +「只显示前 50 篇」，sheet 高 655.8 ≤720；rows 1500>540 可滚、滚到底（960+540=1500），末行 `r049.md open 1 · 共 1 条` 整行在框内。
- ⑬ 全程 **0 pageerror / 0 console error**。

截图（≤2 张）：`shots/round-101/review-list.png`（2 行 + 当前行）、`shots/round-101/review-truncated.png`（50 行 + truncated + 滚到底）。

## 偏差（不判 FAIL）

- **`revision_count` 已知偏差**：参考 `list_reviewed_files` 返回 `revision_count`/`total_annotations`/`open_count`（`C:/Users/WINDOWS/.copilot/skills/review-mode/SKILL.md:228,230`），本轮行只有 `path/name/open/total`，不读快照数。
- ⑫ 的 `.rail-overall` 只在有整体评价/未定位批注时渲染（`MarginRail.tsx:602`），a.json 夹具带 1 条 overall note；⑭c 对照 84.3 px 与 plan 引的 142 px 不同（栏内空白随计数/标题变），断言口径是「>50 px」。
- 任务文字「B-229（首载超线 615 B）」是**改前**口径，改后 1,635 B；BACKLOG B-229 两数都记。

## UNVERIFIED

- 真实 FSA（假句柄恒 granted、权限三态只走单测）、真 WebView2 宿主、真实中文 IME、150%/200% 缩放屏、macOS、原生打印：本轮未跑（不涉及或本机没有）。
- 200+ 篇真实工作区的扫描耗时只有单测夹具。
