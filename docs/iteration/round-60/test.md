# 第 60 轮验收（tester）

轮前 `5384410`；本轮 A1/A2/A3 全做。判定：**PASS**。门禁一次通过；未跑 `roundtrip`（`git diff` 未含编辑器内核与序列化改动）。

## 门禁
- `npm run verify` PASS：首屏 gzip **299,759 B**（内部 310,000 / 硬线 320,000，余 20,241）。`.tmp/r60-tester-verify.log`
- `npm test` PASS：**40 个文件 504 条**，0 fail（与轮前同数；本轮无新增单测）。`.tmp/r60-tester-test.log`
- `npm run roundtrip` 未跑：未动编辑器与 markdown 序列化。

## A1 搜索 0 命中报跳过 + Enter 守卫（B-128）
代码：`src/components/GlobalSearch.tsx:31-58`（先拼 `parts` 再置 note；`busyRef` 同步闸门；按钮 `disabled` 只挡鼠标）。
- `node .tmp/reset.mjs 9222` 后跑 `.tmp/e2e-r60-impl-a1-search.mjs` → exit 0，`.tmp/r60-impl-a1.json`。
- 2 个 **1,126,439 B**（>1 MiB）文件 + 1 个小文件：note=「没有匹配的文本；跳过 2 个读不到或超过 1 MiB 的文件」，`.global-search-empty`=「没有结果。」，hits=0 ✓（验收的「跳过 2 个」与「没有结果。」两段文字都在界面上）。
- 同一 tick 双 Enter：`getFile` **3**（文件数 3，上限 = 文件数+1 = 4）✓。改前对照取自 HEAD 源码：`git show HEAD:src/components/GlobalSearch.tsx` 无 `busyRef`，且 0 命中分支在拼 `skipped` 之前 `return`；finder 记的双跑计数 64→130 见 `.tmp/r60-finder-e.json`，本轮未回滚旧码重测。

## A2 点当前文档命中不重载（B-127）
代码：`src/App.tsx:2520-2544`（`activeFile?.path === node.path` 时只 `setQuery` / `setFindOpen`，`rAF` 聚焦 `.find-input`；不同文件仍走 `openWorkspaceFile`）。
- `node .tmp/e2e-r60-impl-a2-samedoc.mjs` → exit 0，`.tmp/r60-impl-a2.json`。
- 干净档（约 1 MB，442,627 字符；滚到中段 `scrollTop=536,867`，查找条先关）：点本文命中后查找条值=「锚点词」、`sl-parse-done` 3→3、`getFile(big.md)` 4→4、`scrollTop` 差 **0 px**、正文长度不变、焦点 `.find-input` ✓。
- 脏档（手打「ZZZ草稿」后 dirty=true）：点命中后 dirty 仍 true、文字仍在、parse/getFile 不增；点回正文按 `Ctrl+Z` 后「ZZZ草稿」消失 ✓（撤销历史没被重载清掉）。
- 源码/预览查找条锁定（`src/App.tsx:5352-5367`）未动；按计划只验编辑模式。

## A3 发布预检判 Fail + 差距表 39/4（B-125）
- `powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1 -PreflightOnly` → `FAIL setup 的 FileVersion 是 0.31.1.0（前三段 0.31.1），package.json 是 0.32.1…`、`summary: preflight FAIL（1 FAIL / 1 UNVERIFIED）`、**exit 1** ✓。改前对照：HEAD 版同命令 → `UNVERIFIED …`、`summary: preflight（1 UNVERIFIED）`、exit 0（临时副本跑完即删）。
- `-Setup host\bin\Sidelight.exe -PreflightOnly` → `preflight PASS（0 UNVERIFIED）`、**exit 0** ✓。
- 表头自洽：`## 已经有的（39）` 数到 39 行、`## 缺的（4）` 数到 4 行、子节（1）/（1）/（2）合计 4 ✓。
- `Select-String '35 项|缺 7 项|36 项有|6 项缺'`：README.md / AGENTS.md / docs/typora-gap.md / packaging/README.md **0 命中**；改前 README.md:97 命中 2、AGENTS.md:74 命中 2（`git show HEAD:` 逐文件复核）✓。`'UNVERIFIED（不 FAIL）'` 同四文件 **0**；改前 packaging/README.md 1 ✓。仓库其余命中只在 BACKLOG.md:31（B-117 历史行「35 项之一」）与本轮 plan.md / impl.md 引用验收词，不是现状陈述。

## 回归
`.tmp/e2e-r59-tester.mjs`（B-104 全局搜索 + B-102 文件列表）：errors=0；「灯火」3 条命中、Esc 后焦点回正文且 inert=0；点第 2 条跨文件打开 `a.md` + 查找条「灯火」1/1；无工作区提示「先打开文件夹，再全局搜索（Ctrl+Shift+F）」；列表态 3 行相对路径、1000×620 列表盒 217/217 无横向溢出。`.tmp/r59-tester-e2e.json`

## UNVERIFIED（非本轮验收项）
- `release/` 缺包/坏包的预检分支、真实静默安装与卸载（只跑 `-PreflightOnly`）。
- 真实 FSA 句柄与真实磁盘写回（E2E 用合成目录句柄与内存 sink）、中文 IME、宿主 WebView2。
