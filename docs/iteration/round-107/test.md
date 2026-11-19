# 第 107 轮验收（tester 独立，未读 impl.md）

- 轮前 startSha `4fc72b2`；B-236（P2 可访问性）：三钮补 24×24 口径 + 机械门。
- **判定 PASS**（1 条已知偏差、1 条未验，均不构成 FAIL）。

## 门禁（自跑一次）

| 项 | 结果 |
| :--- | :--- |
| `node --experimental-strip-types src/lib/touchTargets.test.ts` | **3/3**（`.tmp/r107-tester-touch.log`） |
| `npm test` | **62 文件 872 条 0 fail**（改前 61/869，+1 文件 +3 条；`.tmp/r107-tester-npmtest.log`） |
| 静态门 `min-height: 24px` | **8 → 10 行** |
| 静态门 `height: 16px` | **3 → 2 行**（剩 `styles.css:1969` `.keybinding-status` 的 min-height、`:3635` `.rail-count` 的 height） |
| `npm run build` | exit 0（`.tmp/r107-tester-build.log`） |
| `measure-first-screen --max 315300` | **PASS gzip 315,173 B**（raw 1,022,573、余 127；`.tmp/r107-tester-measure.log`） |
| 常驻 `MarginRail-CRwlyBLm.js` | gzip9 **6,762**（与改前同）→ 真实首载 **321,935**，超硬线 1,935（**B-229 仍 open**，只记） |
| 机械门负向对照 | HEAD 版 `styles.css` + 同一测试文件 → **2 红 exit 1**（两入口仍 16px、reset 无 min-height），第 3 条 `.rail-head` 无 height 过——门非空转 |

## A2 真机几何（自写 `.tmp/r107-tester-geom.mjs`，ego CDP 57270，1440×900，23/23，0 pageerror，`.tmp/r107-tester-geom.json`）

改前值用**同页 CSS 反事实覆盖**（把三钮还原成 HEAD 的 `height:16px` / 无 min-height）量，再作差；该改前读数与执行器 `--phase before`（`.tmp/r107-targets-before.json`）逐项相同（head 16 / tabs top 166 / 底差 39 / 底相对栏顶 59 / chatHead 21 / reset 52.5×21 / 发送钮 410.19）。

| 量 | 改前 | 改后 | 门槛 |
| :--- | ---: | ---: | :--- |
| 对比 / 在审 | 35×16 | **35×24** | 高 ≥24、宽 ±1 ✓ |
| `.rail-head` 高 | 16 | **24** | 24±0.5、增量 +8 ✓ |
| `.rail-tabs` top 增量 | — | **+8** | = head 增量 ✓ |
| tabs 底 − head 底 | 39 | **39**（增量 0） | 39±1、增量 0 ✓ |
| 底相对栏顶 | 59 | **67** | +8 ✓ |
| 间距 / 在审右缘 − head 右缘 | 7 / 0 | **7 / 0** | 7±0.5 / ±1 ✓ |
| 对话 chatHead / reset | 21 / 52.5×21 | **24 / 52.5×24** | 24、52.5×24 ✓ |
| 发送钮 top 增量 | — | **+3** | = chatHead 增量 ±1 ✓ |

- 横溢：1440×900、1256×808、1024×700 抽屉三档 `.margin-rail` 与 `.rail-head` `scrollWidth−clientWidth` 全 **0**；抽屉 `.app.rail-open` 生效、宽 340、`.doc-scroll` 0。
- 空态档（b.md 无批注、无 `.rail-count`）：间距 7、在审右缘 = head 右缘（差 0）、两钮 24——兄弟规则在空态也成立。
- 功能回归：对比开面板 → Esc 关、焦点回 `.rail-diff-open`、`[inert]` 0；在审开面板（a.md 行 `open 1 · 共 2 条`、`aria-current`）→ 关闭钮关；对话「新对话」空输入 disabled → 填 1 字 enabled（发送钮同步）→ 点清空并回 disabled、输入框仍在。
- 截图 2 张（本脚本重拍）：`shots/round-107/targets-notes.png`（head 两钮 + 两页签）、`shots/round-107/targets-chat.png`（新对话 + 输入）。

## A2.4 历史脚本（补齐断言后实跑）

- `.tmp/e2e-r100-diff.mjs` **43/43**（`:379` 入口 24、`:424` head ≤24.5、`:425` 底差 39±1、`:427` `chromeBottom−headHeight`=43±1.5、`:428` maxChild ≤24.5），`.tmp/r107-tester-r100.log`。
- `.tmp/e2e-r101-review.mjs` **57/57**（`:297/:333/:427` 三处 head/入口 24），`.tmp/r107-tester-r101.log`。
- 两脚本会覆盖 `shots/round-100/`、`shots/round-101/`，跑完已 `git checkout --` 还原。

## 范围与偏差（不判 FAIL）

1. `git diff` 只 3 文件（`docs/iteration/BACKLOG.md` +2、`package.json` 1 行、`src/styles.css` 9+/4−），`src/components/MarginRail.tsx` **0 改动**；新文件仅 `src/lib/touchTargets.test.ts`（未跟踪）+ 报告/截图。
2. 体积：实测 **315,173**，plan 预计 315,163（+10 B）——CSS 名哈希进入口 JS 字符串所致；`--max 315300` 仍 PASS（余 127）。
3. 头高 +8：24px 控件在非定高 flex 行里把 head 从 16 撑到 24，`.rail-tabs` 及以下整体下移 8px（tabs 底相对栏顶 59→67）。plan 已声明字面保头高不可达，由 r100/r101 重跑覆盖。
4. `MarginRail.tsx:371` 的 `{/* …16px 高… */}` 注释仍写 16px（plan 明确不动：改它会动常驻 chunk，与 0 B 门冲突）。
5. A2.1「改前量测先于 A1」无法由 tester 事后复现（`src/` 已非干净）；以同页反事实 + 执行器 before JSON 双向对齐（数值逐项相同）替代。

## UNVERIFIED

真 WebView2 宿主、真实中文 IME、原生打印/另存 PDF、150%/200% 缩放屏（与本轮纯 CSS 无直接关系未跑）；A2.1 的时序只按文件时序与数值对齐判。
