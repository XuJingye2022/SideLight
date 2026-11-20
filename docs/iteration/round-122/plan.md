# 第 122 轮计划（单轮，只做 B-252）· revision 1

按 `plan-review.md` 修 H1–H3（回归命令与 shots 还原、负向报文顺序、chunk 7,414）；范围不变。

## 0. 改前基线（本轮实测）

- HEAD `5572395`；dev `http://localhost:5175`（不另起/重启）；真机 ego CDP 57270。
- 首屏门 `node scripts/measure-first-screen.mjs`（只读 `dist`）：**gzip 315,553 B**；硬线 320,000 余 **4,447 B**；内部 310,000 超 5,553 B（WARN）；简报 312,423 B 是旧值。
- 口径外常驻 chunk `MarginRail-C8Yy3L3b.js`：gzip9 **7,414 B**（本轮 `.tmp/r122-rev-chunk.mjs` 实测；`measure-first-screen.mjs:8` 的 7,419 是第 120 轮旧数）。真实首载 315,553+7,414=**322,967 B**，超硬线，归 **B-229（仍 open）**，不算本轮净增。
- 失败项（唯一）：`.rail-overall-count` 10 px，sepia `rgb(107,93,72)` on `rgb(221,203,170)`=**4.02:1**；light/dark 空（`.tmp/r119-finder-ui.json`）。规则 `src/styles.css:1182-1190`。
- 测试基线：`npm test` **64 文件 909 条 0 fail**（`.tmp/r122-npm-test-baseline.log`）。

## 1. 修法选型（数已算完）

| 方案 | 对比度 浅/暖/深 | 徽标底 vs 纸底 | gzip 净增 |
| :--- | :--- | :--- | :--- |
| 现状 `--line` 底 + `--ink-soft` 字 | 5.10 / **4.02** / 6.03 | 1.21 / 1.31 / 1.31 | 0 |
| **A 保留 `--line` 底，字改 `--ink`** | **12.32 / 8.20 / 10.97** | 1.21 / 1.31 / 1.31 | **+3 B** |
| B/C 底改 `--mark-wash` / `--accent-wash` | 4.88–6.56 | 1.05–1.31（边界糊） | 0 / +1 B |
| D `--accent` 实底 + `--on-accent` 字 | 6.04–7.56 | 1.05–1.26 | +6 B |

选 **A**：只换一个 token，三主题余量 ≥8.20，药丸外观全不变；B/C 换底色会让边界糊进纸底，D 改动过大。

## 2. 任务

### A1 徽标字色改 `--ink`（B-252）

- 文件：`src/styles.css`（`.rail-overall-count`，1182-1190）
- 步骤
  1. `color: var(--ink-soft)` → `color: var(--ink)`；`background: var(--line)`、`font-size: 10px`、`padding`、`border-radius` 不动（改字号不扩范围）。
  2. 规则上方加中文注释写第 122 轮与理由；压缩产物删 CSS 注释（`dist` CSS 里 `第 N 轮` 0 命中），首屏 0 B。
- 验收
  1. 正向对照：`git show 5572395:src/styles.css` 该块是 `var(--ink-soft)`；改后用 **read 读 `src/styles.css:1182-1190`**（或 `Get-Content src/styles.css | Select-Object -Skip 1181 -First 10`）见 `color: var(--ink);` / `background: var(--line);` / `font-size: 10px;`，十行内无 `--mark-wash`。别用只回选择器行的 `Select-String`。
  2. 三主题比值 ≥4.5：浅 12.32、暖 8.20、深 10.97（A2 重算）。
  3. 体积：`npm run verify` gzip **≤315,560** 且 PASS（CSS 实测总 +3 B：`.tmp/r122-totaldelta.mjs`）。
- 门禁：`npm run verify`、`npm test`
- 风险：徽标字比 12 px 标题重。产品方不接受就改 B 方案（0 B），impl 记药丸可见度 1.21/1.31→1.06/1.08 的代价；不许两条都不选。

### A2 三主题对比度门 + 真机证据

- 文件：`src/lib/themes.test.ts`（+1 test）、`.tmp/e2e-r122-contrast.mjs`、`docs/iteration/round-122/`
- 步骤
  1. 新 test（同第 95/97 轮写法）：`ruleDeclarations('.rail-overall-count')` 取 `color`/`background`，`resolveColor` 换实色，`:root` / `html[data-theme='sepia']` / `html[data-theme='dark']` 各算一次。**顺序按 H2**：先比值循环（三档各断 ≥4.5、`table.push`）→ `assert.equal(table.length, 3)` → 最后 `assert.equal(declarations.color, 'var(--ink)')`（防回退）。负向报文即 `4.020`。
  2. 负向对照：CSS 临时改回 `--ink-soft`，`node --experimental-strip-types src/lib/themes.test.ts` 必须**红 1 条、exit 1、报文含 `4.02`**；还原后绿。留 `.tmp/r122-test-{red,green}.log`。若红来自等值断言（报文「字色应吃 --ink」），是顺序写反，按步骤 1 改。
  3. 真机探针（ego CDP 57270、1440×900）：清 storage → 点 `.ProseMirror p` → 输 `侧灯这一段的论点站不住，缺少证据。` → `Ctrl+A` → 点 `.analyze-button`（无 Key 模拟流，`src/lib/ai.ts:290` 必出 1 条 `overall`）→ 依次设 `document.documentElement.dataset.theme` 为 `light`/`sepia`/`dark`，读 `.rail-overall-count` 的 computed `color`/`backgroundColor` 算比值。断言三档 ≥4.5、`sepia.bg==='rgb(221, 203, 170)'`、徽标底 vs `.rail-overall` 底同改前（1.21/1.31/1.31，±0.02）、0 pageerror；写 `.tmp/r122-contrast.json`，截图 `shots/round-122/rail-overall-count-sepia.png` 1 张。
  4. 回归（按 H1）：`$env:SIDELIGHT_CDP='http://127.0.0.1:57270'; node scripts/theme-acceptance.mjs http://localhost:5175`（裸跑落 `:5` 的 9222、`:4` 的 5173，均不可用）。断言 27/27。脚本 `:92/:99/:271/:282` 重写 4 张**已跟踪**图 `shots/round-05/t2-*.png`：跑完立刻 `git checkout -- shots/round-05/`，再断 `git status --short shots/` 空。57270 不可用记 UNVERIFIED，不退回 9222。
- 验收：`npm test` 全绿且 +1 条；红/绿日志（红报文含 4.02）；探针三档 ≥4.5、0 pageerror；`theme-acceptance` 27/27 且 `git status --short shots/` 空。
- 门禁：`npm test`、`npm run verify`（测试文件不进 bundle，首屏净增仍只有 A1 的 +3 B）
- 风险：dev server 对 `/src/styles.css` 有 transform 缓存（第 54 轮坑），页面仍旧色先 `touch src/styles.css` 或按 `?direct` 复核；改主题只设 `data-theme`，不点设置面板。

## 3. 不做（防扩范围）

B-229、B-253、字号统一（10 px → `--text-xs`）不在本轮；不动 `MarginRail.tsx`/`release/`，不 push，版本 0.32.1。

## 4. 交付

报告 `docs/iteration/round-122/{plan,impl,test}.md`；B-252 状态由收尾方改。预计净增：首屏 gzip **+3 B**（315,553→315,556，硬线余 4,444）；**门 + MarginRail chunk 合计 322,967→322,970 B**（impl/test 各写门值、chunk gzip9 **7,414** 与合计，注明 **B-229 仍 open**）；测试 +1 条（909→910）。
