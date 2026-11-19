# 第 100 轮验收（tester，B-227 diff 对比）

**结论：PASS**（tester 未读 `impl.md`；脚本与断言自写）

- 轮前 `startSha` `537c63325972dd7419cc606a31366f2c2b9fb38f`；commit 后 HEAD 见文末。
- 环境：ego CDP 57270 + `http://localhost:5175`（未重启；9222–9226 无监听，未用 `.tmp/reset.mjs`）；1440×900。
- 夹具：假 FSA（自建，`getDirectoryHandle` 按前缀键判存在）`diff.md`/`other.md`/`big.md`（9,000 行、1,033,892 字符）；清 localStorage 用默认设置（`autoSave` 默认 true，已实测写盘）。

## 门禁

| 项 | 结果 |
| :--- | :--- |
| `npm test` | **60 文件 848 条 0 fail**（基线 59/834；`.tmp/r100-tester-npmtest.log`） |
| `diffView.test.ts` 单独 | **14/14**（要求 ≥10） |
| `npm run build` + `node scripts/measure-first-screen.mjs --dir dist --max 315500` | **PASS**：raw **1,021,819**、gzip **315,022**、含余 478、files 3 |
| 首屏净增 | **+296 B gzip**（planner 314,726 → 315,022） |
| `git diff --stat src/lib/diff.ts` | 空（未改 `diff.ts`）；`package.json` 只在 test 链尾加 `diffView.test.ts`；无新依赖 |

## A1 纯函数

- `diffView.ts` 只 import `diffLines`；返回 `rows/added/removed/truncated`；`atLeast` 兜底 context/maxRows/maxLine；`clip` 截 500 +「…」；窗口 `from <= last.to + 1` 合并；超 maxRows 丢后段并置 truncated。
- 单测 14 条覆盖：无变化、CRLF/末尾换行、单行改动 context=2、context=0、相邻合并（同行只出一次）、counts 不受 context/maxRows 影响、空 before/空 after、maxRows 截断与边界、超长行 500+「…」、>4,000 行粗粒度（5,000 行改 1 行 → 1/1）、粗粒度下 maxRows、默认参数。

## A2 静态（HEAD 对照）

- `rail-diff` 命中 **2 文件**（`MarginRail.tsx`、`styles.css`）；`getDiff` **5 行**（App 2 / MarginRail 3，要求 ≥4）；`diffView` 在 `App.tsx` **0 命中**。
- 新 CSS **13 组规则 ≤16**；`styles.css` diff **0 条删除行**（`.rail-head`/`.rail-tabs` 逐字未动，只追加 `.rail-diff-*`）。改动文件与 plan 清单一致。
- 面板 portal 到 body、`role=dialog`/`aria-modal`/`tabIndex=-1`；入口只批注页签、`aria-haspopup=dialog`、`title="与打开时相比"`、高 **16**。

## A3 真机（`.tmp/e2e-r100-diff.mjs`，**43/43 PASS**、0 pageerror、`.tmp/r100-tester-diff.json`）

- ① 第二段末加「改过。」+ 文末 Enter 打「新增的一行。」→ `.is-removed` **1**、`.is-added` **3**、`.is-same` **4**、文本含「新增的一行」、计数 **+3 −1 行**；截图 `shots/round-100/diff.png`。
- ② 面板内 `input/textarea/[contenteditable=true]` **0**；打开时正文仍可编辑。
- ③ 关闭钮 / Esc / 背板 → 面板 0、`[inert]` 0（打开期间 2）；关闭钮与 Esc 后焦点回 `.rail-diff-open`。
- ④ 默认 `autoSave:true`：2.6 s 内假 FSA 已写入；自动保存后面板仍 **+3 −1**；点文件树重开 `diff.md` 后空态「与打开时相比，没有改动。」（rows 0）。
- ⑤ 对话页签入口 0、批注 1；`.rail-head` 高 **16**（≤16.5）、`.rail-tabs` 底 − `.rail-head` 底 **39**、tabs 底相对栏顶 **59**（HEAD 58，+1；按 plan-review P1-2 换口径 ≤59.5）、首卡 `style.top` **114**（≥66）、3 卡 114/278/460 不重叠、末卡底 747.5 ≤ 整体评价顶 760.2、1440 下 rail/doc 横溢 0；head 高 = 最高子元素（`.rail-count` 15 → 按钮 16，仅 +1 px）。
- ⑥ `.rail-diff-sheet` 1440 / 1024 横溢 **0**、1024 rect 132–892 在视口内；三主题新增行 7.40/7.67/6.53、删除行 5.25/5.54/5.11，全部 ≥4.5。
- ⑦ 干净态开/关面板：`sl-parse-done` 4→4、dirty 不变、写盘 0。
- ⑧ 1 MB `big.md` 改 1 字 → 开面板首行可见 **93 ms**（只记录）、rows **400**、截断提示「改动太多，只显示前 400 行。」、0 可编辑控件。
- 回归：`.tmp/e2e-r97-a1-status.mjs` **44/44**、`.tmp/r98-tester-agent.mjs` **38/38**（均 0 pageerror）；跑完已 `git checkout --` 还原 `shots/round-97/`、`shots/round-98/` 被覆盖截图。

## 偏差与说明（不判 FAIL）

1. plan 的 A3 夹具「第二段原文，改这里。」单句只出 **1** 张卡（`mockItems` 单句分支）；为拿 3 张卡把该段改成 3 句（同一行，+3 −1 与几何门不变）。
2. plan 的「chrome 底 ≤55.5，HEAD 55」按 plan-review P1-2 换成可复现口径：head ≤16.5、底差 39±1、tabs 底相对栏顶 ≤59.5（实测 59；HEAD 58）。
3. 1 MB 行数上限与截断提示已验；首行耗时按计划只记录，不设硬门。

UNVERIFIED：真 WebView2 宿主、真实中文 IME、原生打印（本轮为浏览器 UI）；1 MB 打开成本只有单机两次读数（93/122 ms）。
