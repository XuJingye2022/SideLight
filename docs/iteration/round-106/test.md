# 第 106 轮验收（tester 独立，未读 impl.md）

- 轮前 `startSha` `42eb999`；环境 `http://localhost:5175`，ego 浏览器 CDP 57270（9222–9226 不可用），1440×900；本轮只改 CSS 与测试，不跑 roundtrip。
- 判决：**PASS**（A1/A2/A3 全过；0 pageerror）。

## 门禁

| 项 | 命令 | 结果 |
| :--- | :--- | :--- |
| 构建+首屏 | `npm run verify` | PASS，gzip **315,158 B**（≤315,250；硬线余 4,842） |
| 首屏卡口 | `node scripts/measure-first-screen.mjs --max 315300` | exit 0，gzip 315,158、headroom 142 |
| 全量测试 | `npm test` | exit 0，**61 文件 869 条 0 fail**（第 105 轮 868，+1 为 A2 新 test） |
| 单测 | `node --experimental-strip-types src/lib/themes.test.ts` | **11/11** |
| 体积三数 | 门 315,158 + `MarginRail-DtZX1O6P.js` gzip9 **6,762**（raw 19,086，同第 105 轮）= 真实首载 **321,920**（改前 321,915，+5） | **B-229 仍 open**（超硬线 1,920），只记账 |

## A1 静态与真机（B-235）

- `git diff --stat`：`src/styles.css` **4 插 0 删**（`src/styles.css:1561-1564`），`src/lib/themes.test.ts` 34 插（A2）；HEAD 版该规则原 5 条声明（`flex`/`min-width`/`padding`/`font-size`/`resize`）逐字未动（`git show HEAD:src/styles.css` 对照）。
- `git grep -c 'rail-chat-compose textarea' -- src/styles.css` = **1**；全 `src` 是 2 文件：第 2 处是 A2 测试里的选择器串（A2 落地前为 1，非偏差）。
- 真机脚本 `.tmp/r106-tester-e2e.mjs`（自写，未读 `impl.md`；点「对话」页签）：**47/47 PASS、0 pageerror**（`.tmp/r106-tester-e2e.json`）。

| 主题 | background | color | border | radius | ink/panel | line-input/panel |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| light | rgb(241,238,230) | rgb(29,32,35) | rgb(133,137,140) | 8px | 14.116 | 3.042 |
| dark | rgb(25,28,32) | rgb(233,230,224) | rgb(107,113,120) | 8px | 13.726 | 3.467 |
| sepia | rgb(239,226,201) | rgb(58,47,33) | rgb(138,122,98) | 8px | 10.191 | 3.252 |

- 三主题逐值与任务表一致；任务书括号 `3.04/3.25/3.47` 是 light/sepia/dark 顺序，三值齐（浅色 3.042 距 3.0 余量薄，符合计划 §5 的风险说明）。
- 几何 A/B：CSSOM 临时摘掉 4 条声明当「改前态」（量完原样写回；改前值 rgb(0,0,0)/白底/rgb(118,118,118) 与计划 §2 同）。textarea **320×44**、`.rail-chat-compose` 高 **81**、发送钮 top **410.19**，改前/改后差 **0 px**；发送钮仍在第二行（send.top − textarea 底 = **6 px**）。
- `.margin-rail` 横溢 **0**（320/320）；1024×700 抽屉 339/339、横溢 0，页面无横滚。
- 聚焦：`:focus-visible` 命中，outline **2px solid**，border 仍等于当前主题 `--line-input`。
- 交互：`fill('测试')` value 变化且不发送；`Shift+Enter` 换行（turns 0）；`Enter` → user 轮「测试」+「（模拟回复）」、输入清空、mock 提示 1。

## A2 机械漂移门与正向对照

- 只追加 1 个 `test`（`src/lib/themes.test.ts:210-243`，34 行），复用 `ruleDeclarations`/`cssVars`/`resolveColor`/`contrastRatio`，无新 import/文件/依赖；断 4 条声明 + 三主题 6 对 + 末尾 pair 数 = 6。
- 正向对照：把该规则 border 临时改成 `var(--line)` → **红**（AssertionError：`1px solid var(--line)` ≠ `--line-input`，exit 1）；从 `.tmp/r106-styles-before.css` 整文件还原后 SHA256 `52B9917E…` 与改前相同、规则声明 9 条、单测回绿 **11/11**、`git diff --stat` 仍 2 文件 38+/0−。
- 回归 `.tmp/e2e-r96-a1-chat.mjs` **33/33**（0 pageerror；该脚本只断键盘与焦点、无颜色断言，不会被配色改动假红）；跑完已 `git checkout -- shots/round-96/rail-chat.png`（该脚本会覆盖历史截图）。

## 证据与偏差

- 截图 `shots/round-106/chat-input-dark.png`（320×516，深色对话栏与输入框）；原始 JSON/日志：`.tmp/r106-tester-e2e.json`、`.tmp/r106-tester-verify.log`、`.tmp/r106-tester-npmtest.log`。
- A3 交付物机械检查：`.tmp/e2e-r106-a1-chat-input.mjs` 存在（17,763 B，不进版本控制）；`docs/iteration/round-106/impl.md` **4,096 B ≤4 KB**，含 `.tmp/r106-a1-chat-input.json`、体积三数与 B-229 记账（角色规定不读正文，只查关键串）。
- 偏差（不判 FAIL）：任务书 `git grep -c ... = 1` 在 A2 落地后全 `src` 变 2（合理）；任务书写「首屏 312,423 / 余 7,577」是第 93 轮值，plan 已按第 105 轮 315,153 记账，实测 315,158（+5）；任务书未给 `3.04/3.25/3.47` 主题顺序。
- UNVERIFIED：真 WebView2 宿主、真实中文 IME、原生打印（与本轮纯 CSS 无关未跑）；150%/200% 缩放屏未测。
