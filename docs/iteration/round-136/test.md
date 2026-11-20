# 第 136 轮验收（tester 独立，未读 `impl.md`）

轮前 `a9f2d50` → 本报告 commit 后 HEAD 不同。范围：B-229（真实首载口径 + R1/R2 按需拆），慢车道单轮 3 任务。判定 **PASS**（A3 走「A2 未达 ≤320,000」的既有预期分支，非失败）。

## 门禁（自己跑）

- `npm run verify` → **exit 0 PASS**：门 gzip **315,279 B**（raw 1,023,265、files 3、headroom **4,721**、`--max 320000`），内部预算 310,000 超 5,279 只 WARN。日志 `.tmp/r136-tester-verify.log`。
- `npm test` → **exit 0**：**69 文件 955 条 0 fail**（blocks 计数 69、`ℹ pass` 求和 955、fail 0；与 A2「条数不变」一致）。日志 `.tmp/r136-tester-test.log`。
- `roundtrip` 未跑（未动编辑器/序列化）。

## A1 测量脚本（`scripts/measure-first-screen.mjs`）

现 `dist` 逐项实跑（`.tmp/r136-t1`、`.tmp/r136-t2` 为自造负向夹具）：

| 断言 | 实测 |
| :--- | :--- |
| 默认 | exit 0，`total=315279` / `resident=7801` / `real=323080`，WARN 行「真实首载 gzip 323080 超硬线 320000（越过 3080 B），默认门禁仍按旧口径（B-229）」 |
| `--no-resident` | exit 0，无 `real ` 行、无 `resident raw=` 行 |
| `--real-max 320000` | exit 1（`FAIL 真实首载 … 超过 --real-max`） |
| 只拷 index.html + 3 个入口产物 | exit 1「FAIL 常驻 chunk 未找到…」 |
| 入口与常驻重复（临时把 MarginRail 加进 index.html `modulepreload`） | exit 1「FAIL 重复计数：…」 |
| CI 口径 | `ci.yml:39`、`release.yml:82/155` 均为 `node scripts/measure-first-screen.mjs`，无新 flag，仍走默认口径 |
| `package.json` | `git diff --name-only -- package.json package-lock.json` 空 |

**偏差（不判 FAIL）**：任务书/plan §1 的 316,131 / 7,999 / 324,130 是 A2 build 前的 dist；A2 重建后（同源码 `npm run verify`）门变 315,279、常驻 7,801，三数随之变。计数语义与「门 + 常驻 = 真实首载」算术逐项成立（315,279 + 7,801 = 323,080、gzip9(raw 22,217) = 7,801），故按现 dist 记。

## A2 按需拆（`App.tsx`、`MarginRail.tsx`、`reviewFiles.ts`、新 `reviewScan.ts`）

- `git grep --untracked -nF "from './lib/search.ts'" -- src/App.tsx` 与 `"from './lib/asset.ts'"` 均 **0（exit 1）**；`await import('./lib/search.ts')` `App.tsx:2000` **1**、`await import('./lib/asset.ts')` `:5269` **1**。
- `MarginRail.tsx` 静态 `from '../lib/reviewFiles.ts'`（`:29`）已无 `collectReviewFiles`（全文只 `:465` 动态 import 与 `:466` 调用）；`await import('../lib/reviewScan.ts')` **1**。
- `reviewFiles.ts:34` `export function compareRows`；共用两处：`reviewFiles.ts:85`、`reviewScan.ts:89`（导入 `:4`）。依赖方向单向 `reviewScan → reviewFiles`，无循环。
- `diffView` 未异步化：`git diff --name-only` 无 `diffView`/`RailSheets`；产品代码 diff 只 4 个文件 + 新 `reviewScan.ts`。
- 构建产物确认惰性 chunk 真拆开：`dist/assets/` 有 `search-8fcoEbWG.js`（2,090 / gzip9 939）、`reviewScan-B9kOo3gQ.js`（839 / 524）、`asset-CDCneyWF.js`（557 / 364）；常驻仅 `MarginRail-A4g6K6g6.js`（22,217 / 7,801）。

## A3 门禁与残差

- `npm run verify` exit 0（门 315,279 ≤ 320,000）；`npm test` 0 fail。
- **未翻转默认口径**（A2 实测 `real = 323,080 > 320,000`）：`total`/`--max`/`headroom` 仍按首屏集合，`--no-resident` 保留，real 只 WARN；B-229 保持 `open`，三数残差已回写 BACKLOG。
- 真实首载对轮初 324,130 **净 −1,050**（门 −852、常驻 −198），仍超硬线 **3,080**。

## E2E（ego CDP 57270、1440×900、假 FSA + stub fetch）

自写 `.tmp/r136-tester-a3.mjs` **11/11、0 pageerror / 0 console error**（`.tmp/r136-tester-a3.json`）：
① 联网核对出处 **2** 条且逐条有名有链接；`/src/lib/search.ts` 请求在点按钮前 **0**、点后 **1**，tavily 只打 1 次。
② 在审面板 **2 行**（「a.md 待处理 2 · 共 2 条」「b.md 待处理 1 · 共 1 条」），快照区「修订快照」+ **1 行**；`/src/lib/reviewScan.ts` 点开前 **0**、点后 **1**。
③ 对话 2 条；切「批注」再切回仍 **2** 条，`#rail-tab-chat` 的 `aria-controls` 仍 = `rail-panel-chat` 且面板存在、未 hidden。
另现场复跑交付脚本 `.tmp/e2e-r136-a2.mjs` **21/21**（含动态 import 失败空态段），两份脚本均 0 pageerror。截图沿用该次运行产物 **2 张**（`shots/round-136/review-panel.png`、`shots/round-136/verify-sources.png`；自写脚本未新增截图）。

## 回归

- `.tmp/r135-tester-labels.mjs`（在审列表/快照文案，直触本轮拆分面）**23/23 PASS**、0 pageerror。`keyboard-acceptance` 未跑（不碰键盘/编辑器）。

## 收尾

BACKLOG B-229 补第 136 轮三数并保持 `open`（A3 明令不写 PASS）；CHANGELOG 加第 136 轮段（标题区间 29–136）；STATE 加一行。UNVERIFIED：真 WebView2 宿主、真实中文 IME、真实 FSA；真机运行时下载顺序未用 DevTools 时序核（只用 dist 文件名与 gzip 体积佐证）。
