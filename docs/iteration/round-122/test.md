# 第 122 轮独立验收（tester）· B-252

- 判定：**PASS**（回滚 0 条、无回归）
- 轮前 `startSha` **5572395**；轮后 HEAD 见 `git rev-parse HEAD`（commit 后填，必 ≠ 轮前）
- 未读 `impl.md`；只读本轮 `plan.md` 任务、`git diff`、`BACKLOG.md`

## 1. 静态与三主题比值（A1）

- 正向对照：`git show 5572395:src/styles.css` 该块是 `color: var(--ink-soft)`（改前有旧值）。
- 改后 read `src/styles.css:1182-1191`：1182 中文注释、1183 `.rail-overall-count`、1187 `background: var(--line)`、**1188 `color: var(--ink)`**、1189 `font-size: 10px`；十行内 `--mark-wash` 0 处；全文件 `rail-overall-count` 仅此 1 处（无媒体查询覆盖）。
- dist 侧：`.rail-overall-count{background:var(--line);…;color:var(--ink);…;font-size:10px}`，`第 122 轮` 在 `dist/assets/*.css` **0 命中**（注释不进产物）。
- 独立复算（`.tmp/r122-tester-ratios.mjs`，自读 CSS 变量 + 自写 WCAG 公式，不调 `themes.ts`）：浅 **12.3173** / 暖 **8.2048** / 深 **10.9689**（计划值 12.32 / 8.20 / 10.97）；旧 `--ink-soft` 同底 5.0996 / **4.0181** / 6.0255 → 4.02 来源成立。

## 2. 新 test 与负向对照（A2）

- diff 顺序符合要求：先三档比值循环（各断 ≥4.5 并 `table.push`）→ `assert.equal(table.length, 3)` → 末条 `assert.equal(declarations.color, 'var(--ink)')`（`src/lib/themes.test.ts:210-233`）。
- 负向（编辑工具把 1188 改回 `var(--ink-soft)`，跑 `node --experimental-strip-types src/lib/themes.test.ts`）：**11 pass / 1 fail、exit 1**，报文 `暖纸的徽标只有 4.02:1`（`themes.test.ts:227`）——红来自比值而非等值断言，顺序正确。`.tmp/r122-tester-test-red.log`
- 还原（编辑工具写回 `--ink`）：**12/12 pass、exit 0**，`git diff` 回到 +2/−1。`.tmp/r122-tester-test-green.log`

## 3. 门禁

| 项 | 结果 |
| :--- | :--- |
| `npm run verify` | **PASS**，`gzip=315559 headroom=4441 files=3 max=320000`（≤315,560，余 1 B；轮前 315,553，**净 +6 B**）；复跑同值 exit 0 |
| `npm test` | **64 文件 910 条 0 fail**（轮前 909，+1；`themes.test.ts` 11→12）；末文件 `railDiffA11y` 到达即整链 exit 0 |
| `roundtrip` | 未跑（未动编辑器/序列化，只有 CSS 与单测） |

常驻 chunk `MarginRail-CQzq6gd5.js`（raw 21,053）gzip9 **7,417** → 门+chunk 合计 **322,976**，超硬线 **2,976 B**，归 **B-229（仍 open）**，不算本轮净增。

## 4. 真机（ego CDP 57270、1440×900）

自写 `.tmp/r122-tester-contrast.mjs`（先 `node .tmp/reset.mjs 57270`；清 storage → 点 `.ProseMirror p` → 打字 → `Ctrl+A` → 点 `.analyze-button`（无 Key 模拟流）→ 逐档设 `documentElement.dataset.theme`，读 computed 色并**自己复合** `.rail-overall` 的半透明底）：**20/20 PASS、0 pageerror、0 console error**，`.tmp/r122-tester-contrast.json`。

| 档 | computed 字色 / 徽标底 | 比值 | 徽标底 vs `.rail-overall` 底 |
| :--- | :--- | :--- | :--- |
| light | rgb(29, 32, 35) / rgb(228, 223, 212) | **12.3173** | **1.2081** |
| sepia | rgb(58, 47, 33) / **rgb(221, 203, 170)** | **8.2048** | **1.3124** |
| dark | rgb(233, 230, 224) / rgb(42, 46, 51) | **10.9689** | **1.3144** |

三档 ≥4.5、与计划值 ±0.05 内；sepia 徽标底逐字等于要求的 `rgb(221, 203, 170)`；徽标底 vs 整体评价底与改前 1.21 / 1.31 / 1.31 差 ≤0.004（改的只是字色，药丸可见度不变）；徽标 **16×16、10 px**、`elementFromPoint` 命中 `SPAN.rail-overall-count`、`appliedTheme` 逐档等于所设值（未被 React 冲掉）。截图 `shots/round-122/rail-overall-count-sepia-tester.png`（暖纸整屏，徽标可见）。

## 5. 回归

`$env:SIDELIGHT_CDP='http://127.0.0.1:57270'; node scripts/theme-acceptance.mjs http://localhost:5175` → **27/27 PASS**、exit 0。脚本重写的 4 张已跟踪图（`shots/round-05/t2-{light, dark}-*.png`）跑完立刻 `git checkout -- shots/round-05/`，`git status --short shots/round-05/` **空**；提交后 `git status --short shots/` **空**（`shots/round-122/` 已随 commit 入库）。

## 6. 偏差与未验

- 体积净增 **+6 B**（计划预估 +3 B）：首屏 315,559 仍在验收线 ≤315,560 内，但只剩 **1 B**；下一轮加任何静态字节前必须先算体积。
- 元素截图/clip 截图的像素坐标与 `Emulation` 视口不同步（元素图、344×112 裁切图偏移），改用整屏截图取证；截图实际产出 1280×720 窗口像素。
- UNVERIFIED：真实屏幕阅读器、真 WebView2 宿主、真实中文 IME、原生打印（与本轮 CSS 无关，沿用既有口径）。
