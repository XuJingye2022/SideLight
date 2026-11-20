# 第 140 轮 tester 独立验收 · A1 右栏贴右缘 + A2 顶栏全宽对比

轮前 `adb270d`；报告后 commit，HEAD 不同。判定 **PASS**（2 条 UI 全过、两门禁绿）。

## 门禁与体积
- `npm run verify` exit 0 **PASS**（`.tmp/r140-tester-verify.log`）：门 **316,648** / 常驻 **4,473** / 真实首载 **321,121** B；硬线 **325,000**（余 3,879），内部 310,000 超 11,121 只 WARN。
- 独立 `zlib.gzipSync(level:9)` 复算 `MarginRail-DwNEBszQ.js` = **4,473**（`.tmp/r140-tester-chunk.log`）；316,648+4,473 = 321,121 与门同值。
- 硬线语义：`--max 321120` **exit 1**、`--max 321121` **exit 0**；无参重跑 **PASS**（`max=325000`，`.tmp/r140-tester-measure-final.log`）。
- 体积账：319,806 → **321,121**（净 **+1,315**，超旧线 320,000 **1,121**）。按授权调线 320000→**325000**（脚本默认 `--max`；`--target 310000` 不动；AGENTS §3/4/6、README、BRIEF 已同步，`git diff` 实查）。脚本头注原写中间值 316,580/4,474/321,054（差 68 B），已改最终三数并重跑 measure PASS + `firstScreenBudget.test.ts` **4/4**。
- `npm test` **71 文件 979 条 0 fail**（轮前 975；`diffView` +2、`annotations` +2）；`roundtrip` 不跑（未动编辑器/序列化）。
- 首载 3 文件（入口/runtime/CSS；`dist/index.html` 只有 runtime+CSS 两条 link）；`RailDiffPanel-U1wUUKYO.js` **2,532 B** 是懒 chunk，E2E 首载请求 0、点开 1。

## E2E（自写 `.tmp/r140-tester-ui.mjs`，未读 `impl.md`）
ego CDP 57270、1440×900 + 1024×700、假 FSA + mock 分析；断言按 plan。**67/67 PASS、0 pageerror**（`.tmp/r140-tester-ui.{log,json}`）。

A1：
- ① 1440 栏右缘 **1430** = main 左缘+clientWidth **1430**（距窗口右缘 10=滚动条）；`.note` 右缘 1418（=栏−12）；列宽 **576**；`padding-right:0px`；横溢 0/0；默认 `--rail-width:320px`。
- ① 卡排序：DOM 引文顺序=正文出现顺序（43/43；修订卡无引文已排除）；top **296/460/624** 递增不重叠。
- ② 分隔条 ←/→ = 336/320 且 `aria-valuenow` 同步；拖左 120 → **440**（CSS 变量 440px）；夹取 **520/280**，两档 3 卡不重叠。
- ③ 折叠：栏隐藏、`.rail-reopen` 可见且 activeElement（`aria-expanded=false`）、列宽 576、左移 **174.0**=(320+28)/2；展开回 320/378、焦点回 `.rail-collapse`。
- ④ 1024：栏与两钮隐藏；顶栏「批注」开抽屉（`role=dialog`、`aria-modal`、宽 **340**、背板）；Esc 关、焦点回钮。
- ⑤ 点第 2 卡：DOM 选区逐字「第二段先说判断，再说这个」、焦点正文、进视口。

A2：
- ① `#diff-view` 是 main 直系子节点：左 **218**、右 **1440**、宽 **1222**=clientWidth；`aria-pressed=true`；无 overlay/sheet；计数 **+6 −2 行**；同文只 3 行（含「尾巴。」）。
- ② 开着时 `Ctrl+Z` 正文/计数不变、`Ctrl+S` **0 写**、`Ctrl+K/F` 无浮层、`.toolbar[inert]`、点「插入」0 菜单。
- ③ 点标题/列表/加粗行：面板关、焦点正文、DOM 选区逐字「测试标题」「测试列表项」「加粗的句子」、进视口；空行与 removed 行：面板开、toast 不变。
- ④ Esc 关、焦点回「对比」、`aria-pressed=false`；1024 左右缘=main、无横溢；长文关面板 `scrollTop` 300→300。
- ⑤ 2,400 行：截断提示「只显示前 2,000 行」顶部可见（elementFromPoint 命中自身）、`li` **2,000**、`ul` 溢出 **39,320** 可滚。

## 截图（六张 `shots/round-140/`，本轮自拍）
| 文件 | 内容 |
| :--- | :--- |
| `a-rail-right-1440.png` | 栏贴右缘、3 卡、列宽 576 |
| `a-rail-drag-440.png` | 拖宽 440 |
| `a-rail-collapsed.png` | 折叠后正文居中 + 右缘展开钮 |
| `a-rail-1024-drawer.png` | 1024 顶栏抽屉（340） |
| `b-diff-1440.png` | 全宽对比（+6 −2 行） |
| `b-diff-long.png` | 2,400 行：截断提示 + 2,000 行 + 可滚 |

## 回归
- 在审面板仍走 `.rail-diff-overlay/.rail-diff-sheet`（宽 760、`role=dialog`）、Esc 关（A 脚本内）。
- `.tmp/e2e-r97-a1-status.mjs` **44/44**（`.tmp/r140-tester-reg-r97.log`），跑后还原 `shots/round-97/`；静态门 `railDiffA11y`/`railModalGate`/`touchTargets`/`diffView`/`annotations` 均在 979 条内通过（未放宽）。

## 观察（不判 FAIL）
- 长文粘贴后 `scrollTop=119,585`；直接点「对比」时面板 scrollTop 被夹到最大值（约 87），头行 sticky 把截断提示顶出首屏，滚回顶部可见；截图前滚回。不影响 2,000 行/滚动/点行，属未写进验收的观感项。
- `docs/adr/0012`、`0017` 仍写旧硬线 320,000（历史文档，不在本轮 A3 范围）。
- 新增 P2 两条：B-267（对比行仅鼠标可点）、B-268（栏宽/折叠态只存会话内），已记入 BACKLOG。

## UNVERIFIED
- 真 WebView2/macOS 宿主、真实中文 IME；真实 FSA（假句柄）；真实连续拖拽与 `pageZoom≠100%` 换算；CI 三处裸 measure（不 push）。

## 收尾
CHANGELOG 第 140 轮三条已在；STATE 追加本轮 tester 行；BACKLOG 无对应旧行可标 `fixed`。
