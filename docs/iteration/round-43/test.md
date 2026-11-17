# 第 43 轮 · 独立验收（tester，首次验收）

- 轮次：`round=43`、`nn=43`；轮前 `startSha=0f83e1f80f57d93e0860282a0d3b0bc2b7953750`（验收开始时 `git rev-parse HEAD` 一致）
- 环境：dev server `http://localhost:5175`（未重启）；CDP `9222`；每段 E2E 前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`
- 未读 `impl.md`（按 `roles/tester.md`），只读 `plan.md`、`git diff`、源码与日志
- 判定：**PASS**（无门禁破、无验收造假、无回归）；1 条计划口径偏差（非缺陷）、4 条 UNVERIFIED

## 一、门禁（全部实跑）

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npx tsc --noEmit` | **exit 0**，无输出 | 本轮实测 |
| `npm test` | **29 个文件、377 条，0 fail**（29 次 `ℹ tests` 求和 = 377；29 个 `ℹ fail 0`） | `.tmp/tester-npmtest.log` |
| `npm run verify` | **PASS**：`total raw=944216 gzip=292046 headroom=27954 files=3 max=320000`、`target=310000 gap=17954`（内部 310,000 / 硬线 320,000，余 27,954 B） | 本轮实测；比第 42 轮 291,766 B **+280 B** |
| `npm run roundtrip` | **rich 5/7、source 7/7 等值**（04-reference-links、06-task-list 为已知 diff；firstSaveBlocked 1/7） | 本轮实测 |
| `node scripts/measure-first-screen.mjs` | 含在 `npm run verify` 里，PASS | 同上 |

`npm test` 与实施声明一致：372 → **377**（`risk.test.ts` +5），文件数仍 29。

## 二、逐任务复验（自己写脚本，不抄实施断言）

脚本：`.tmp/e2e-r43-tester.mjs`（本轮新写），日志 `.tmp/e2e-r43-tester.log`；**21 条断言全 PASS、0 红**。

```
PASS T3-6b 源码往返跳过支：sl-parse-done 不增加、正文不变、字节不变 {"marksBefore":3,"marksAfter":3,"sameText":true,...}
PASS T1-1 进预览：1 个预览面板、无加载态
PASS T1-2 预览里表格条消失、H1 与插入按钮 disabled {"tableBar":0,"h1":{"disabled":true},"insert":{"disabled":true}}
PASS T1-3 绕过 disabled 点 H1 不改正文、不置脏 {"previewH1":1,"dirty":false}
PASS T1-4 预览里 Ctrl+K 不开链接框、有回编辑提示（toast 含「先按 Ctrl+/ 或 Ctrl+Shift+P 回编辑」）
PASS T1-5 预览里 Ctrl+M / Ctrl+Shift+M 不开公式框、有回编辑提示
PASS T1-6 预览里 Ctrl+1 不改正文、不置脏
PASS T1-7 超过自动保存防抖（2.6 s）后仍未写脏字节 {"dirty":false,"same":true}
PASS T1-8 Esc 回编辑后 Ctrl+S 字节仍等于种子
PASS T1-9 正对照：编辑态 H1 生效 / Ctrl+Z 撤销 / Ctrl+K 开弹层 / Esc 关弹层
PASS T1-10 源码态只读：H1 disabled、表格条 0、Ctrl+M 不开框
PASS T1-11 含公式文档进预览：katex ≥ 2、无加载态
PASS T2-1 编辑区内拖入 .md：dragover/drop 都被挡、有提示、正文与 URL 不变
PASS T2-2 编辑区外（.doc-column）拖入 .md：drop 被挡、有提示
PASS T2-3 前置：编辑态 Ctrl+K 开出链接框且焦点在输入框
PASS T2-4 弹层开着进预览再一次 Esc：只关弹层，viewMode 仍 preview
PASS T2-5 再按 Esc 才回编辑（正向出口没被吞）
PASS T2-6 正对照：编辑态 Esc 关闭链接框且仍在编辑
PASS T3-6a 改源码回编辑：正文、大纲、字数、dirty 都跟着变 {"statsBefore":"11 字","statsAfter":"13 字","dirty":true}
PASS T4-1 快捷键一览含 Ctrl+Shift+V 且标注「粘贴为纯文本（浏览器原生键）」
PASS T9 无控制台错误、无请求失败 {"errors":[],"failed":[]}
## summary pass=21 red=0
```

截图（`shots/round-43/`，本轮 tester 产出，不覆盖 finder / impl 的 `bug-*`/`impl-*`）：
`test-t1-preview-readonly.png`、`test-t1-preview-math.png`、`test-t2-drop-notice.png`、`test-t3-outline.png`、`test-t4-shortcuts.png`。

### 静态证据（与计划验收逐条对齐）

| 计划要求 | 实测 | 结论 |
| :--- | :--- | :--- |
| `disabled={viewMode !== 'edit'}` ≥ 9（6 格式 + 插入 + 专注 + 打字机） | `src/App.tsx` 共 **9** 处 | ✓ |
| `if (!editor \|\| viewMode !== 'edit')` = 1（run） | 实测 **2**：`App.tsx:3851`（run）、`App.tsx:4156`（`openLinkAtCursorRef`） | 偏差（见 §四.1） |
| `ensureKatex` ≥ 1 且在 `useEffect` 内（`PreviewPane.tsx`） | `src/components/PreviewPane.tsx:56-58` 的 `useEffect`（依赖 `[hasMath, ready]`，不在 render 里） | ✓ |
| `setMenuOpen(false)` 含 switchView 新增一处 | `src/App.tsx:3924`（`if (next !== 'edit')` 块内） | ✓ |
| `stopPropagation`：MathInlineEditor 2、LinkEditor 3 | 实测 **2 / 3** | ✓ |
| `addEventListener('drop'` = 1 | `src/App.tsx:3810` | ✓ |
| `serializeBody` / `clearSession` / 「编辑器读不全的语法」 = 0 | 三条 `git grep` 均 **0 命中**（exit 1） | ✓ |
| `serializeDocumentBody` = 4 命中且 `src/App.tsx` 0 | `src/lib/serializeDocument.ts:41` + `scripts/fidelity-acceptance.mjs:14/43/144` | ✓ |
| `if (beforeText === afterText) return` = 1 | `src/lib/risk.ts:324` | ✓ |
| `syncDocInfo(editor)` 只在 `!skipReparse` 块内、`setDirty` 在块外 | `src/App.tsx:3893` 在 `if (!skipReparse) {`（:3881）内；`setDirty` 在 :3896 | ✓ |

`risk.ts` 快路径的语义论证（只靠代码复核，未用旧代码重跑）：`referenceLosses` / `tableLosses` / `footnoteLosses` / `mathLosses` / `htmlLosses` / `hardBreakLosses` 六个族都要求「原文有、序列化后没有」，`trailing-newline` 要求 before 以 `\n` 结尾而 after 不以；相等时均不命中。正对照单测（`classify('a\n\nb\n','a\nb\n')` 仍报 `blank-lines`、`blocking:false`）已过，证明快路径不吞真差异。@ `src/lib/risk.test.ts:44-52`

## 三、回归

| 脚本 | 结果 |
| :--- | :--- |
| `scripts/keyboard-acceptance.mjs http://localhost:5175`（CDP 9222） | **52/52 PASS**，exit 0（`.tmp/tester-keyboard.log`）；含「Ctrl+Shift+P 没被 Ctrl+P 抢走」「Esc 回编辑」「链接 Esc 取消不改正文」等。跑完已 `git checkout -- shots/round-05/`，`git status` 无该目录改动 |
| `scripts/math-ready-acceptance.mjs`（`SIDELIGHT_URL=5175`） | **10/11 PASS**，exit 1（`.tmp/tester-mathready.log`）；唯一红是「无公式文档首屏没有 KaTeX 请求」，判**脚本过期、非本轮回归**，见 §四.5。跑完已 `git checkout -- shots/round-11/` |
| 源码往返跳过支（6b） | 我的脚本独立测：进源码→回编辑，`sl-parse-done` 3 → 3、正文文本不变、`乙.md` 字节不变、`dirty:false` |

未跑并说明原因：`fidelity-acceptance`（计划明确不跑，会覆写 `shots/round-10/`，且本轮未改序列化）；`data-safety-acceptance`（已知 `.editor` 选择器过期，见计划 §八）；tree / session / theme / draft 套件（本轮不动文件树、会话句柄、主题、草稿链，跑它们不覆盖本轮风险面；`keyboard-acceptance` 覆盖视图切换与弹层键位）。

## 四、偏差与发现（均不构成 FAIL）

1. **计划 grep 口径偏差（非缺陷）**：计划 §二 验收写 `git grep -n "if (!editor || viewMode !== 'edit')"` = 1（只认 `run()`），实测 **2**。第二处是 `src/App.tsx:4156` 的 `openLinkAtCursorRef`：计划 §二.6 原本写「第一行 `if (viewMode !== 'edit') return`」，实施改成了 `!editor || viewMode !== 'edit'`，守卫更强、行为一致（预览/源码里点正文链接不开弹层，E2E T1-4 与 T2-6 覆盖）。建议下轮把计划这条 grep 改成 ≥2 或按语义写。
2. **`Ctrl+S` 提示文案与计划预期不同（既有行为，非本轮引入）**：计划 §二 验收第 6 条预期「没有改动，未写入。」（或等价），实测预览 → Esc → `Ctrl+S` 的 toast 是 **「已保存 乙.md」**，字节仍等于种子（未写脏）。专项探针 `.tmp/probe-r43-dirty.mjs`：`edit(dirty:false)` → `preview(dirty:false)` → `Esc` 后 `dirty:false`，2.3 s 后仍 `false`；`Ctrl+S` 后 toast `已保存 乙.md`、`sameBytes:true`。改前基线日志 `.tmp/e2e-r43-impl-t1.before.log` 的同一断言 toast 也是「已保存 乙.md」，说明不是本轮引入。**结论：不判缺陷**（无脏字节写出），但计划里「没有改动，未写入」的预期与产品现状不符，建议下轮要么改文案要么改计划。
3. **实施脚本 `.tmp/e2e-r43-impl-t4.mjs` 中文字面量损坏（过程问题，非产品问题）**：该文件是 PowerShell 写入的 UTF-8 无 BOM 乱码（AGENTS §8 的坑），种子文件名与 `button[aria-label="快捷键"]` 选择器均乱码，不能作为 T4 证据复用。T4 由我的 `.tmp/e2e-r43-tester.mjs` 独立验证（PASS）。提醒下轮：`.tmp/*.mjs` 用 `write`/`edit` 写。
4. **测试条数一致性**：`npm test` 实测 29 文件 377 条，文档四处同值（`README.md:133`、`AGENTS.md:39`、`AGENTS.md:72`、`README.md:171` 只写文件数 29）；差距计数三处同值（`README.md:96`、`typora-gap.md:7/43/45`、`AGENTS.md:74` = 31/10）。`typora-gap.md` 表格数据行实测 **31** 行、缺的子节 2+3+1+1+1+2 = **10**，与标题一致。
5. **`math-ready-acceptance.mjs` 首屏断言过期（非本轮回归）**：红的是「无公式文档首屏没有 KaTeX 请求」，抓到的 URL 是 `http://localhost:5175/node_modules/.vite/deps/katexLazy-BFFIXP1U.js`——Vite 的 **shim 模块**，命中脚本 :22 的 `/katex[^/]*\.(js|mjs|css)/i` 宽正则，不是真 KaTeX chunk。依据：改前（HEAD）`src/App.tsx:69` 就已 `import { ensureKatex } from './lib/katexLazy.ts'`，dev 下这个模块请求与本轮 diff 无关；生产口径 `npm run verify` 仍然 **files=3、首屏集合无 katex**（PASS，余 27,954 B）。建议下轮把该断言改成排除 `katexLazy*` 或只认 `katexLoader*` / `katex.min.*`。

## 五、UNVERIFIED

| 条目 | 为什么测不了 | 下轮怎么补 |
| :--- | :--- | :--- |
| 真实拖入图片走 ProseMirror `handleDrop`（窗口守卫让开、不弹「不会直接打开」） | 合成 `DataTransfer` 的 `File` 不触发 ProseMirror 的 `handleDrop`；计划已把这条列为可降级 | 宿主里用真人拖一张图，看是否插入且无 toast |
| 宿主 WebView2 里的拖入 `/` 导航与 `Ctrl+Shift+V` 行为 | 本机未跑宿主构建（计划 §三.4 明确不碰宿主） | 发布前 `host-smoke` + 真人拖入 |
| 真实中文输入法下弹层 `Esc`（组合输入中） | CDP 造不出真 IME 组合态 | 真人 IME 复测 |
| 1 MB 文档 `classify` 快路径与 `applySource` 的毫秒收益（76.8 ms / 24 ms） | 本轮验收未复跑 1 MB 计时（计划列为可选、不作门槛；我未跑 `.tmp/e2e-r43-code-perf.mjs` 以免覆盖 finder 的性能快照） | 性能轮复跑并记录 `risk` / `sourceToggle` 字段 |

## 六、结论

- 门禁 5 项全过；计划 T1/T2/T3/T4 的可执行验收标准逐条实测通过；21 条独立 E2E 全绿；`keyboard-acceptance` 52/52、`math-ready-acceptance` 10/11（1 条为脚本过期断言，生产首屏口径 PASS）。
- 无数据安全回归：预览 / 源码的编辑命令被统一挡住，2.6 s 自动保存防抖后字节仍等于种子；`Ctrl+Z` / 编辑态入口正对照未误伤。
- 判定 **PASS**。
