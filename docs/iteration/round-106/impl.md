# 第 106 轮执行报告（A1–A3 · B-235）

startSha 42eb999 一致；3 任务全 PASS，回滚 0。

## A1 主题配色（src/styles.css:1556-1565）PASS

- 在 font-size 与 resize 间插 4 行：`color:var(--ink)`/`background:var(--panel)`/`border:1px solid var(--line-input)`/`border-radius:8px`；原 5 条声明未动，MarginRail.tsx 未改。
- 静态：numstat +4 0；`git grep -c 'rail-chat-compose textarea' -- src/styles.css`=1；styles.css 的 `--line-input` 15(HEAD)→16；A1 收口时 diff 只此文件。
- 真机（ego CDP 57270 @1440×900，对话页签）三主题 computed 逐值全中：light bg rgb(241,238,230)/color rgb(29,32,35)/border rgb(133,137,140)；dark rgb(25,28,32)/rgb(233,230,224)/rgb(107,113,120)；sepia rgb(239,226,201)/rgb(58,47,33)/rgb(138,122,98)；radius 8px。
- 对比度：ink/panel **14.116/13.726/10.191**；border/panel **3.042/3.467/3.252**（CR-2：任务书顺序反，实测 dark 3.467/sepia 3.252）。
- 几何改前=改后（Δ0）：textarea 320×44、compose 320×81、send 48×31 top 410.19>框底 404.19、rail 320×516、横溢 0；1024×700 抽屉 rail 340 横溢 0、输入框 307 右缘 1008。
- 聚焦仍既有 `:focus-visible` 2px solid rgb(43,109,100)，border 仍 rgb(133,137,140)；未加 focus/placeholder/font 规则。
- 截图 `shots/round-106/chat-input-dark.png`（深色失焦）。

## A2 机械漂移门（src/lib/themes.test.ts +34 0）PASS

- 只追加 1 个 test：`ruleDeclarations` 断 4 条声明值；border 整串按 `/^1px solid var\((--[\w-]+)\)$/` 拆色（CR-1）；三主题各 2 对（`--ink/--panel`≥4.5、`--line-input/--panel`≥3.0），末尾 pair=6；注释写明只保内侧邻色（CR-3）。
- `node --experimental-strip-types src/lib/themes.test.ts` → 11/11（.tmp/r106-a2-test-green.log）。
- 正向对照：border 临时改 `var(--line)` → 该 test 1 红（.tmp/r106-a2-positive-control-red.log）；还原后 11/11 绿、git status 干净、diff 只剩两文件。

## A3 真机取证 + 体积 + 回归 PASS

- 脚本 `.tmp/e2e-r106-a1-chat-input.mjs`（临时），同脚本跑改前/改后：
  - 改前 `.tmp/r106-a1-chat-input-before.json`：CSS 不含 `--line-input`，UA 值 light=sepia rgb(0,0,0)/rgb(255,255,255)/rgb(118,118,118)、dark rgb(255,255,255)/rgb(59,59,59)/rgb(133,133,133)，与计划 §2 同。
  - 改后 `.tmp/r106-a1-chat-input.json`：**42/42 PASS、0 pageerror**；fill('测试') value 变化、Shift+Enter 换行不发送（turns 0）、Enter 发送（user 逐字「测试」+ 模拟回复、框清空、焦点回框）；1024×700 抽屉横溢 0；改前/改后尺寸差 max **0 px**。
- 回归 `.tmp/e2e-r96-a1-chat.mjs` **33/33 PASS**、0 pageerror；跑完 `git checkout -- shots/round-96/` 还原其覆盖的跟踪截图。
- 体积三数：门 gzip **315,158**（改前 315,153，+5；余 4,842）；`MarginRail-DtZX1O6P.js` gzip9 **6,762**（raw 19,086，同第 105 轮）；真实首载 315,158+6,762=**321,920**（改前 321,915，+5），超硬线 **1,920 B** → **B-229 仍 open**，只记账不修。
- 门禁：`npm run verify` PASS；`measure-first-screen --max 315300` PASS exit 0；`npm test` **61 文件 869 条 0 fail**（.tmp/r106-npm-test.log）；未改编辑器/序列化，未跑 roundtrip。

## 留给 scribe / 偏差

- CR-4：真机 font-family 仍 monospace；`::placeholder` UA 色 3.6–3.97:1 为全应用既有问题。按计划 §4 不改，B-235 补行时请入「观察/另立 P2」。
- CR-5 已加强为「块内 4 条声明 + `--line-input` 15→16」；「grep=1」只对 src/styles.css 成立（A2 后测试也含该选择器，属预期）。
- CHANGELOG 建议：对话页签输入框补主题配色（字色/底色/边框/圆角），与既有输入框一致。

## 新踩坑

1. 改前/改后尺寸要同视口各跑一遍；比计划表（1256×808）与 1440×900 会得假差。
2. `resolveColor` 不吃 `1px solid var(--x)` 整串（CR-1），要拆宽度+取色两步。
3. PowerShell `Get-Content -Raw` 读 Node 的 UTF-8 JSON 会乱码、`ConvertFrom-Json` 报错；用 node 或 read 工具核。
