# 第 105 轮验收（tester 独立，未读 impl.md）

- round=105，报告 `docs/iteration/round-105`，轮前 `startSha 47c86b7`；范围 B-234（队列第 8 条残留「全结项文档仍入列」，P2）。
- 口径（照 plan §3）：**在审 = 至少一条批注是 open 或 in-progress；全部 resolved / wont-fix 的文档不入列；行文案仍是 `open N · 共 M 条`，N 只数 open。**
- 判定：**PASS**。静态门/单测/门禁/自写真机 E2E/回归全过；体积三个数记账，B-229 仍 open。

## 1. 静态门（HEAD 47c86b7 对工作树，`git grep`）

| 门 | HEAD | 工作树 | 结论 |
| :--- | :--- | :--- | :--- |
| `annotations.length === 0`（reviewFiles.ts） | 1 | **0**（exit 1） | 通过 |
| `hasUnclosedReview`（全 `src` 行数） | 0（exit 1） | **4 行**（`-c`：MarginRail 2、reviewFiles 2） | 通过 |
| `liveClosed`（reviewFiles.ts） | 0 | **3 行**（`:93` 注释、`:100` 参数、`:104` 分支） | 通过 |
| `git diff --stat` | — | 只 3 个源文件（`reviewFiles.ts` 33 行、`MarginRail.tsx` 14、`reviewFiles.test.ts` 59） | 通过 |

单测 `node --experimental-strip-types src/lib/reviewFiles.test.ts` **20/20**；`npm run build` exit 0；`npm test` **61 文件 868 条 0 fail**（865→868，+3）。dev server 交付新模块（`GET /src/lib/reviewFiles.ts` 的 `hasUnclosedReview` 2 / `liveClosed` 3 / 旧句 0）。

## 2. 自写真机 E2E（`.tmp/r105-tester-e2e.mjs` → `.tmp/r105-tester-e2e.json`）

ego CDP **57270**（9222 不可用）、1440×900、假 FSA（`window.__vfs`）、自造夹具 a/b/c/f + 第二工作区；**33/33 pass、0 pageerror**。

| 场景 | 实测 |
| :--- | :--- |
| #1 a.md 1 open+1 resolved，open→resolved 后 **150 ms** 开面板 | 面板 **110 ms** 打开、a 行不在；此刻磁盘 a.json 仍 `["open","resolved"]`（`open 1·共 2`）→ 证第三参（磁盘口径本应收录） |
| #1 停 **1,800 ms** 再读（面板不开） | 行仍不在；防抖冲刷后磁盘 a 两条 `resolved`（0 open） |
| #1 排序不波及 | 删行后 `c(1) → f(1) → b(0)` |
| #2 b.md 仅 in-progress | 行在 `open 0 · 共 1 条` + `aria-current` |
| #3 f.md 1 in-progress + 1 open，改 open→resolved | 行**仍在** `open 0 · 共 2 条`（有 in-progress 不算全结项），只出现一次 |
| #4 c.md 1 open + 2 resolved 往返 | 开局 `open 1 · 共 3 条` → 改 open 为 resolved 后不在 → 改回 open 后 `open 1 · 共 3 条` |
| #5 第二工作区只 `closed.md`（1 resolved + 1 wont-fix） | 0 行；`.rail-diff-empty` 逐字 =「还没有在审的文件：有未结项的批注才会出现在这里。」；停 1,500 ms 仍 0 |
| 不波及 | Esc/关闭钮关闭后焦点回 `.rail-review-open`、`[inert]` 0；背板关闭面板；1024×700 文档与面板 0 横溢、行不出面板；排序与 `aria-current` 在各场景都对 |

截图 `shots/round-105/review-closed-tester.png`（第二工作区新空态：两张 Resolved / Won't fix 卡 + 空态句）。已知非阻塞：背板关闭只断「面板 0、`[inert]` 0」（与 r100/r101 同口径）——mouseup 落在遮罩后的元素上，焦点不保证回入口；非本轮 diff 引入，Esc/关闭钮的焦点还原已单验。

## 3. 体积（`npm run build` 后实测）

| 口径 | 数值 | 门槛 |
| :--- | ---: | :--- |
| 首屏门 gzip（`measure-first-screen --max 315250`） | **315,153 B**（PASS，headroom 97；计划 315,149±100 内，+4） | ≤315,250 |
| 常驻 `MarginRail-tZSn7MSg.js` gzip9 | raw 19,086 → **6,762 B** | ≤6,880 |
| 真实首载 = 门 + chunk | **321,915 B** | ≤322,029；超硬线 320,000 **1,915 B**，**B-229 仍 open** |

`impl.md` 已含同一三个数（315,153 / 6,762 / 首载），机械 grep 命中。

## 4. 回归

- `.tmp/e2e-r101-review.mjs` **原样 57/57 PASS**（含 51 篇 → 50 行截断门，覆盖「不波及 50 行截断」）。
- `.tmp/e2e-r103-review-live.mjs` **原样 19/19 pass**（T2 行留 `open 0 · 共 2 条`：只有全结项才删行，口径对照成立）。
- 两条脚本会写 `shots/round-101/`、`shots/round-103/`，跑完已 `git checkout --` 还原（`git status` 只剩 3 个源文件 + 本轮未跟踪目录）。

## 5. UNVERIFIED / 边界

- 真实 FSA 写回（落盘走假句柄 `__vfs`）、真 WebView2 宿主、真实中文 IME、原生打印：与本轮 UI 逻辑无关，未跑。
- 只有 in-progress 的行显示 `open 0 · 共 M 条`（plan §3 边界，不判 FAIL）；两段列表未做。
- 证据：`.tmp/r105-tester-e2e.{mjs,json,log}`、`.tmp/r105-tester-{npmtest,build,measure,r101,r103}.log`。
