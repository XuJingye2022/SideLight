# 第 50 轮计划审查（critic，只读）

- 审查对象：`docs/iteration/round-50/plan.md`（T1 脚注续行 + 导出差异门 / T2 全部替换按文本节点批处理 / T3 CSS 与点击区一批）
- 轮前 `startSha=6ae9be39ee5007da2ebcdffd636da21675dc6694`（`git log -1` 同值）；`git status --porcelain` 只有未跟踪的 `docs/iteration/round-50/`、`shots/round-50/`，**产品代码 0 改动**
- 只读手段：`read` 逐文件核对 + Node 探针（`.tmp/critic-r50-fn.mjs`，导入真实 `src/lib/footnotes.ts`、`src/lib/export.ts`）；**未连 CDP、未启动浏览器、未动 dev server（5175）、未 push、未碰 `release/`**
- 结论：**REVISE**（**1×P1 + 5×P2**）。T1/T2/T3 的文件、函数、行号几乎全部核对为真；问题集中在一处**验收门槛被放宽**（P1）和五处**收尾/边界口径**（P2），都是小改，不需要重写方案。

## 0. 核对为准确的部分（证明这不是看一眼文字）

| 项 | 核对结果 |
| :--- | :--- |
| T1 根因 | 实读 `src/lib/export.ts:33-45`：`split('\n').map(trim).filter(startsWith('[^'))`，续行确被丢；调用点 `src/components/PreviewPane.tsx:62` 与 `src/lib/export.ts:187` 两处一致；`src/lib/footnotes.ts:3`（`CONT`）、`:45-52`（续行拼接）、`:70`（footnotes 原文切片）与计划引用逐字相符 |
| T1 导出分支 | 实读 `src/App.tsx:4096-4101`（markdown 分支直接 `saveBlob`）、`:4130`（依赖数组）、`:2924`（「四条保存路径的唯一入口」注释）、`:235`（另一处「四条路径共用同一个差异门」）、`:66`/`:69`（`normalizeForBaseline` / `activeLosses`·`lossLabels` 已在模块级 import）、`:1891-1895`（`persist` 跳过 6 s 计时器）——全部对 |
| T1 单测 | `src/lib/export.test.ts:74-79` 与 `:81-83` 就是计划说的两条既有脚注用例，新增 3 条不冲突 |
| T2 位置与 API | `src/App.tsx:1859-1872` 逐条 `insertText/delete` 与计划引用一致；`src/lib/find.ts:5-6` 明写 `from/to` 是文档位置 → 计划的分组坐标成立；`node_modules/prosemirror-transform/dist/index.d.ts:347` 有 `replaceWith(from,to,Fragment\|Node\|readonly Node[])`；`node_modules/prosemirror-state/dist/index.js:627-648` 的 `insertText` 取 `storedMarks` 或 `$from.marks()/marksAcross` → 计划「用原节点 marks ≈ 同语义」成立（唯一差异 `storedMarks` 只在人为设置时出现） |
| T2 需要退回分支 | `src/lib/annotations.ts:145-176` 按**文本块**拼接子文本节点，跨 mark 边界的命中确实存在 → 计划 `covered !== matches.length` 的守卫必要，方向对 |
| T2 基线数据 | `.tmp/perf-round48-replace.json` 实读：100 KB `4096` 步 / `dispatch 769.1` / `clickReturn 789.8`；1 MB `39936` 步 / `dispatch 51802` / `clickReturn 52197.5`；计划表格逐字一致。脚本 `.tmp/e2e-r48-code-replaceall.mjs:10` 确为 `shots/round-48`、`:116` 写 `perf-round48-replace.json` → 「复制后再改」的提醒必要 |
| T3 行号 | `src/styles.css:575`（1.95）、`:584-590`（h1 1.35）、`:592-596`（h2）、`:598-602`（h3）、`:756-762`（table `--font-ui`/0.86em）、`:280-289`（placeholder）、`:1315-1319`（toolbar button）、`:1335-1338`（mono 11px）、`:1589-1597`（stats-trigger）、`:100`（全局 `box-sizing: border-box`）、`:1568-1574`（状态栏固定 28 px）全部与计划相符；`h4` 全文件 0 命中；`src/components/StatusBar.tsx:41-51` 已有 `aria-haspopup/expanded/controls`、无 `aria-label` |
| T3 1024 档断言可达 | 计划要求 1440/1024 两档都不横向滚动。`.app{min-width:1120px}`（`:125`）看似会让 1024 溢出，但 `:2501-2503` 的 `@media (max-width:1119px){ .app{min-width:0} }` 已把它放开，且 finder 在 1024 实测 `pageOverflow:0`（`.tmp/r50-bug-b.log:3`）→ 该断言不会假红 |
| 版本/体积口径 | `package.json:3` = 0.32.1；`STATE.md:55` 首屏 294,373 B / 32 文件 425 条；`common.md:6` 内部 310,000 / 硬线 320,000；`docs/CHANGELOG.md:5` 仍是 `## Unreleased（第 29–49 轮，未发版）`；`README.md:126` 确有 `SHA256SUMS-0.32.1.txt`（ship S1）→ 计划 §1 与 §步骤 5 全部成立 |
| 无新依赖 / 不发版 | 三任务都不加依赖、不动 `package.json` 的 `version`（T2 只动 `test` 脚本一行，符合仓库逐文件枚举方式：`package.json:15`） |

## 1. 新发现（按严重度）

### R50-1（**P1**）T2 的验收门槛比来源 finding 宽 4 倍，且测的是被固定开销稀释的 `clickReturnMs`

- `docs/iteration/round-50/findings-code.md:105` 写的是「改法：预构建 `ReplaceStep` … 或按段落合并区间；**门槛 `dispatch` ≤ 2,000 ms**。注意拆计时必须包住 `editor.view.dispatch`」。
- `plan.md:273` 却写成「`clickReturnMs` **≤ 8,000 ms**；`longtasks` 最大值 ≤ 8,000 ms」。8,000 是 2,000 的 4 倍，且 `clickReturnMs` 混入点击分发、React 更新等固定项；同一张脚本里两个指标都在（`.tmp/e2e-r48-code-replaceall.mjs:100-107` 同时收 `clickReturnMs` 与 `dispatch`），没有理由换成更宽的那个。计划自己还写着「不许改门槛数字凑绿」（`plan.md:275`），但门槛在设计阶段已经被放宽。
- 另有一处机制解释不成立：`plan.md:195` 说「1,024 个段落平均每段被改 39 次，**DOM 同步做了 39 遍**」。`view.dispatch` 只同步一遍 DOM；真实的两个 O(命中数×步数) 项是 ① 每个 `Transform` 步骤落到 doc 上的重建，② 查找高亮装饰（39,936 个 decoration）在 39,936 步 `tr.mapping` 上的映射。方向不变（步数 39,936→≤1,024 两项都降），但机制写错会让「达不到 8 s 时卡在哪」无法判断，而这正是上一轮要求「先按 dispatch 拆段计时」的原因（`docs/iteration/round-49/plan.md:303`）。
- **修法**：① 门槛改成 `dispatch[0].ms` **≤ 2,000 ms**（finding 原口径），`clickReturnMs` 与 `longtasks` 作为旁证并列打印；若实测定在 2,000–4,000 ms 之间，**不许改数字**，按 `plan.md:275` 写清卡点（并补一条「装饰 mapping 成本」的读数：用 `view.state.plugins` 关掉查找装饰前后各量一次，5 行脚本）。② 删掉 `plan.md:195` 的「DOM 同步做了 39 遍」，换成上面两条 O(命中×步数) 的机制；③ 100 KB 档的门槛（`≤400 ms`）与 1 MB 档保持同一严格度（100 KB 的 4,096 步按 0.19 ms 估算应 ≈12 ms，400 ms 已很宽，不必再谈）。

### R50-2（**P2**）`renderFootnotes` 重写仍丢「定义 + 空行 + 缩进续行」这一种脚注续行，F1 没修完

- 实测（`.tmp/critic-r50-fn.mjs`，导入真实模块）：种子 `正文[^1]\n\n[^1]: 第一行定义\n\n    续行接着写\n`
  - `extractFootnotes` 返回的 `footnotes` = `"[^1]: 第一行定义\n\n    续行接着写\n"`（`src/lib/footnotes.ts:31-34` 把块内空行记进 `gap`、`:45-52` 再拼回同一块，`:70` 原样切片）→ 预览/HTML 导出真的会收到这个带空行的字符串；
  - 今天 `renderFootnotes` → `<li>第一行定义</li>`；
  - 照 `plan.md:71-93` 抄的新实现 → **同样只有 `<li>第一行定义</li>`**，`续行接着写` 仍不在（因为 `plan.md:85` 的 `current = null` 把空行当结束）。
- 直接续行那种（无空行）修好了：同探针对 `[^1]: 第一行定义\n    续行接着写` 的新实现输出 `第一行定义<br>续行接着写` ✓。所以是「修了主形状、漏了块内空行形状」，不是回归，但 F1 的「可见丢字」在这条路径上仍开放，而 `plan.md:97` 还写着「续行判据与 `footnotes.ts:3`、`risk.ts:148` 同一套」——`footnotes.ts` 允许块内空行，计划的新循环不允许，口径并不相同。
- **修法**：`current` 遇空行**不置空**，改成挂起（记 `pendingBlank`）；下一条非空行是定义就开新条、是 ` {4,}|\t` 续行就接上、其它才结束本条。`export.test.ts` 加第 4 条：`renderFootnotes('[^1]: 甲\n\n    乙')` 含 `甲<br>乙` 且 `<li>` 计数 1；`plan.md:97` 的「同一套」改成「定义/续行判据与 `footnotes.ts:3` 同一套，**块内空行不结束当前条**」。

### R50-3（**P2**）加第 33 个测试文件后，三处文档的「32 个文件 425 条」变旧，计划只改 `README.md:126`

- 本轮 `npm test` 按计划要变 **33 文件 ≈431 条**（`plan.md:162`、`plan.md:33` 的基线是 32/425），但改动清单里只有 `docs/CHANGELOG.md` 与 `README.md:126`（`plan.md:61`、`plan.md:138`）。实际还写着旧数字的地方：
  - `README.md:133`「32 个文件、425 条断言」
  - `README.md:171`「`lib/*.test.ts` 32 个测试文件挂进 npm test」
  - `AGENTS.md:39`「第 49 轮记 32 个文件、425 条」
  - `AGENTS.md:72`（§6 当前状态段末）「测试 32 个文件 425 条」
- 后果：第 51 轮 planner 会照抄错的基线（本轮 `plan.md:33` 已经这样引用），`AGENTS.md` 的「以 `npm test` 输出为准」也被自己的文字推翻。
- **修法**：把 `README.md:133/171` 与 `AGENTS.md:39/72` 写进 T2 的改动文件清单与验收（门禁跑完、以 `npm test` 实际条数回填，**不许先写 431 再跑**）。

### R50-4（**P2**）T2 的三条必过正确性断言不在被复制的脚本里，13 min 预算没算这块脚本工作量

- `plan.md:267-271` 要求：`Ctrl+Z` 一次回原样（与 seed 的 `docChars`/`侧灯` 对比）、跨文本节点负例（`甲**乙**丙` 查 `甲乙`）、批注保留（播种 1 条后仍 1 条）。而 `.tmp/e2e-r48-code-replaceall.mjs` 只有 `matchCount / clickReturnMs / dispatch / longtasks / docChars`（`:100-107`）与一张整页截图（`:108`）：**没有 seed 基线读数、没有 Ctrl+Z、没有第二个文档、没有批注播种**。`plan.md:262` 只写「再单独验证正确性与撤销（见验收）」，没给脚本步骤。
- 后果：执行者在 13 min 里最容易砍掉的就是这三条，最后只能写 UNVERIFIED——而「跨节点退回路径」「一次撤销」恰是这次改动唯一可能造成正文写错的两处。
- **修法**：在 `plan.md` T2 §步骤 5 直接列出脚本增补（约 20 行）：替换前先存 `docChars0`/`侧灯0`；替换后比 `docChars0 − matchCount`；`Ctrl+Z` 后比 `docChars0`/`侧灯0`；第二个小文档 `甲**乙**丙` 查 `甲乙` 全部替换后断言 `strong` 计数不变；批注用既有 store 计数（`__slState` 或页面暴露的 store 条数）。预算 T2 由 13 min 调到 16 min，砍 T3 的 U3（表格字族，2 行 CSS）抵这 3 min。

### R50-5（**P2**）导出提示借用了「保存后」文案，且 `persist:true` 的 info 提示没有任何关闭入口（计划的风险说明写错）

- `plan.md:121` 的提示文本是 `…注意：导出的是改写后的正文——${lossLabels(losses).join('；')}`，而 `lossLabels` 给的是保存文案：`src/lib/risk.ts:168`「脚注 [^1] 的定义**在保存后**会消失（正文还在引用它）」。导出并不保存，用户会看到一条指向错误动作的警告；计划自己的 E2E 只断言「含 `脚注 [^1]`」，锁不住这句错配。
- `plan.md:173` 写「`persist: true` 的提示不会自动消失；`Esc`/正常提示会替换它，不额外加关闭按钮」。核对三处，`Esc` 不会清提示：`src/App.tsx:3629-3698` 的 Escape 分支（`statsDetail/railOpen/findOpen/settingsOpen/shortcutsOpen/pendingConfirm/sourceConfirm/pendingSwitch/menu/export/source/preview`）没有 `setNotice(null)`；`src/App.tsx:5209-5225` 的 `.toast-close` 只在 `kind === 'error'` 时渲染；`src/App.tsx:1891-1895` 对 `persist` 直接跳过计时器。→ 这条 info 提示会一直留到下一次 `setNotice`，用户无法关。
- **修法**：① 导出提示用自己的文案（「导出的是改写后的正文——按保存判据本来会拦：…」或给 `lossLabels` 加一个 `forExport` 前缀），别让「保存后」出现在导出路径；② 给这条 notice 加 `action: { label: '知道了', onClick: () => setNotice(null) }`（`Notice` 类型 `src/App.tsx:218` 已支持，toast 会渲染按钮，零新代码路径），并把 `plan.md:173` 的「`Esc`」删掉；如果嫌 action 占宽，就改 `ttl: 15000` 不用 persist。

### R50-6（**P2**）体积硬门在 planner 角色文件里仍是 286,000 B，计划绕过去了但没人修

- `.tmp/iteration/roles/planner.md:28` 仍写「首屏 gzip **≤286,000 B** 是硬门」。现行政策是 `common.md:6` / `STATE.md:50`：内部 310,000 / 硬线 320,000。`plan.md:37` 为此写了一整段解释（当前 294,373 B 按旧线连基线都红）——这说明每一轮 planner 都会再撞一次并再解释一次。
- **修法**：本轮顺手把 `planner.md:28` 改成 310,000（内部）/ 320,000（硬线），写进 `plan.md` §5 的文档项；`.tmp` 不进版本控制，1 行、零风险。下一轮起删掉 `plan.md:37` 那一整段。

## 2. 逐条核对结论（计划要求 vs 实际）

| 计划要求 | 判定 |
| :--- | :--- |
| T1 只改 `export.ts` / `export.test.ts` / `App.tsx`（+ 文档），不碰 `PreviewPane.tsx`、`footnotes.ts`、`risk.ts`、保存链 | 可行：预览与 HTML 导出共用的就是 `renderFootnotes`（`PreviewPane.tsx:62`、`export.ts:187`）；导出分支加判据不触碰 `requestSave`/`runSave`/`performCommit` |
| T1 E2E 四篇种子 + 6 组断言（`h-cont`/`h-two`/`fn-mid`/`fn-end`） | 可行：`.tmp/r30-fsa.mjs:2,:205` 有 `installFakeWorkspace`/`openFolder`；`.tmp/e2e-r50-bug-g.mjs:41` 的 `addInitScript`（`URL.createObjectURL` 收 `__blobs`）与 `.tmp/e2e-r50-bug-c.mjs:61-78` 的 C1 段都在；`fn-mid.md` 种子与 `.tmp/e2e-r50-bug-c.mjs:8` 逐字相同 |
| T2 一个事务、反序应用、按文本节点分组、跨节点退回 | 可行（坐标与 API 见 §0）；`replaceWith` + `schema.text(next, node.marks)` 是合法用法；撤销粒度仍是一步 |
| T2 不发版、不加依赖、`package.json` 只动 `test` 一行 | 成立：`package.json:15` 是逐文件枚举，追加一行即可；`version` 不动 |
| T3 6 处 CSS + 1 个 `aria-label`、只动 `styles.css` 与 `StatusBar.tsx` | 成立：所有行号见 §0；U6 不写 `font: inherit` 的理由也对（`body{font-family:var(--font-ui)}`，`:113-117`）；状态栏固定 28 px（`:1573`），`min-height:24px` 不会撑高它 |
| T3 验收数值（h4 ≥18 px、h2 行盒 ≤32、td 15.5–16.5、占位符 17/33.15、stats h≥24、按钮 23.5–24.5） | 可达：1.08em×17=18.36；22.44×1.35=30.29；0.94em×17=15.98；1.95×17=33.15；`box-sizing:border-box`（`:100`）保证 `height:24px` 的 rect 就是 24 |
| 35 min 总预算 | 紧但结构上成立（T1 10 + T2 13 + T3 6 + 门禁 6）；**实际风险集中在 R50-4**（T2 少算 3 min）与 T1 的 4 篇种子 E2E；砍单顺序（先砍 U3、再砍到 2 张截图）已写明，可保留 |

## 3. 结论

**REVISE**。T1/T2/T3 的方案本身可行、行号与 API 全部核对为真，不需要推翻；但 **R50-1 必须改**（门槛从 `dispatch ≤ 2,000 ms` 被放宽到 `clickReturnMs ≤ 8,000 ms`，且机制说明写错，会让本轮唯一的 P1 性能任务失去验收意义），R50-2/R50-4 分别关系到「F1 是否真的修完」与「正文写错的两条唯一防线有没有测」，也必须补。其余三条（R50-3/R50-5/R50-6）是几行文档/文案，本轮顺手做掉。
