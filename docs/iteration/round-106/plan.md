# 第 106 轮计划（单轮 · Round A）

- `startSha` `42eb999`；报告目录 `docs/iteration/round-106/`。
- 唯一问题（P2 界面/外观）：对话页签输入框无主题配色 → 新条目 **B-235**（BACKLOG 现无此条，批末 scribe 补行）。
- 范围：只改这一条，其余不动。

## 1. 体积（改前算）

- 门 gzip 改前 **315,153 B**（第 105 轮实测）→ 本批 **+110 B raw / +12 B gzip9** → ≈**315,165**（余硬线 ≈4,835）；`MarginRail-*.js` gzip9 6,762 不变；真实首载 321,915 → ≈321,927。
- 依据 `node .tmp/r106-plan-gzip.cjs`（77,962→78,072 raw、19,501→19,513 gzip9）；构建后按 ±20 B 记，验收卡 gzip ≤315,250。
- 口径更正：任务书的「312,423 / 余 7,577」是第 93 轮值；本计划按第 105 轮实测记账。
- 真实首载已超硬线 1,915 B（既有 **B-229 open**，口径待 lead 定）。本批只加 12 B，不修也不省（省字节属 B-229 修法，另轮）。

## 2. 改前实测（ego CDP 57270，`localhost:5175`，对话页签）

| 主题 | color | background | border |
| :--- | :--- | :--- | :--- |
| light | rgb(0,0,0) | #fff | rgb(118,118,118) |
| dark | rgb(255,255,255) | rgb(59,59,59) | rgb(133,133,133) |
| sepia | rgb(0,0,0) | #fff | rgb(118,118,118) |

与 findings 逐值一致。另核：

- `textarea` 全文件只 4 处（`styles.css:1556`/`:3210`/`:3221`/`:3231`），无全局规则；`.rail-chat-input` 在 CSS 里 0 条（只在 `MarginRail.tsx:727`）。
- 目标块 `src/styles.css:1556-1562` 只有 flex/min-width/padding/font-size/resize。
- focus 环**已有**：`styles.css:192` 的全局 `:focus-visible` 给 2px solid（实测 `outline 2px solid rgb(122,90,42)`）→ 不新增 focus 规则。
- 几何（1256×808）：textarea 320×44、`.rail-chat-compose` 320、rail 横溢 0、发送钮 top 410.19（第二行）。
- 预演补丁：三主题对比度见 A1，尺寸与发送钮位置不变。

两处修正 `fix_hint`（有实测依据，非扩范围）：

1. 边框用 `var(--line-input)`，**不用 `--line`**：`--line` 在 `--panel` 上约 1.1:1（浅色几乎看不见，比现状更糟）；`--line-input` 正是 `.field input`/`.find-input`/`.dialog-textarea` 三处输入框同款 token，三主题 ≥3.04:1 过 WCAG 1.4.11。
2. 按 hint 保留 `border-radius: 8px`；**不加 `font`**（UA monospace 属另一条缺陷，记 B-235 观察、另立 P2）。

## 3. 任务

### A1（B-235）补主题配色

文件 `src/styles.css:1556-1562`；`MarginRail.tsx:724-739` 不改（选择器与类名不动——第 96/102 轮脚本按 `.rail-chat-input` 定位）。
步骤：`font-size: 13px;` 之后、`resize: none;` 之前插 4 行 `color: var(--ink);` / `background: var(--panel);` / `border: 1px solid var(--line-input);` / `border-radius: 8px;`；原 5 条声明不动。
验收：

- `git diff --stat` 只 `src/styles.css`（4 插 0 删）；`git grep -c 'rail-chat-compose textarea'` = 1。
- 真机 1440×900 三主题 computed（bg/color/border）：light `rgb(241,238,230)`/`rgb(29,32,35)`/`rgb(133,137,140)`；dark `rgb(25,28,32)`/`rgb(233,230,224)`/`rgb(107,113,120)`；sepia `rgb(239,226,201)`/`rgb(58,47,33)`/`rgb(138,122,98)`；radius 8px。
- 对比度 ink/panel ≥4.5（三档 14.12/13.73/10.19）、border/panel ≥3.0（3.04/3.25/3.47）。
- 尺寸与改前差 ≤1 px、rail 横溢 0、发送钮仍在第二行；聚焦仍是既有 2px outline、border 仍 `--line-input`。
- 截图 1 张 `shots/round-106/chat-input-dark.png`。
- `npm run verify` PASS；`node scripts/measure-first-screen.mjs --max 315300` exit 0 且 gzip ≤315,250。

### A2（B-235）机械漂移门

文件 `src/lib/themes.test.ts`（只追加 1 个 `test`，复用现成 `ruleDeclarations`/`cssVars`/`resolveColor`/`contrastRatio`，不新建文件、不加依赖）。
步骤：取 `.rail-chat-compose textarea` 声明，断 4 条值；三主题算 6 对（`--ink`/`--panel` ≥4.5、`--line-input`/`--panel` ≥3.0），末尾断 pair 数 = 6。
验收：`node --experimental-strip-types src/lib/themes.test.ts` 全过；`npm test` 全绿、文件数仍 61。正向对照必做：临时把 border 改成 `var(--line)` → 该 test 必红；还原后绿、`git status` 干净、`git diff` 只剩预期两处。

### A3（B-235）真机取证 + 体积记账 + 回归

文件 `.tmp/e2e-r106-a1-chat-input.mjs`（临时，不进版本控制）、`docs/iteration/round-106/impl.md`（≤4 KB）、截图 ≤2 张。
步骤：ego CDP 57270 打开 5175 →「对话」页签 → 三主题 computed + 对比度；`fill('测试')` 值变化、`Shift+Enter` 不发送、`Enter` 走发送；1024×700 抽屉量 rail 横溢 0；记改前/改后尺寸。
验收：脚本全 PASS、0 pageerror，JSON 路径写进 `impl.md`；体积三数记账（门 gzip / `dist/assets/MarginRail-*.js` gzip9 / 真实首载 = 两者之和）并注 B-229 仍 open；回归 `.tmp/e2e-r96-a1-chat.mjs` 全过（该脚本只断键盘与焦点、无颜色断言，不会被配色改动假红）；`npm run verify` + `npm test`。

## 4. 不做

- 不加 `font`（UA monospace）→ 另立 P2。
- 不加 `::placeholder`：UA 占位色 `rgb(117,117,117)` 在 `--panel` 上 3.6–3.97:1，是**全应用既有**问题（`.dialog-textarea`/`.find-input` 同款），本轮不改、也不作验收项。
- 不动 `MarginRail.tsx` 与对话交互；不复用 `.dialog-textarea` 类（会牵动导出漂移门）。
- 不修 B-229（真实首载超线），只记账。

## 5. 门禁与风险

- 顺序：`npm run verify` → `npm test` → 真机脚本 → 回归脚本。只改 CSS，不跑 `npm run roundtrip`。
- dev server 的 `src/styles.css` transform cache 不失效（第 54 轮踩坑）：判「样式没生效」前先 touch 该文件再量，不要重启 dev server。
- 主题属性可能被 App 覆写：改完立即读数；必要时用设置面板或 `Emulation.setEmulatedMedia` 补测「跟随系统深色」一次（同一规则同一 token，不单设门槛）。
- 浅色 3.04:1 余量薄：保持 `--line-input`，不要自造或调深 token（会牵连另外三处输入框）。
