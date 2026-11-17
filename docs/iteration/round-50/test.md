# 第 50 轮 独立验收报告（tester）

- 轮前 `startSha`：`6ae9be39ee5007da2ebcdffd636da21675dc6694`（`git rev-parse HEAD`，与计划 §1 一致）。
- 验收方式：**未读 `impl.md`**，只读 `plan.md`、`findings` 的引用点与 `git diff`；自写脚本从零复验（`.tmp/tester-r50-t1.mjs`、`tester-r50-t2.mjs`、`tester-r50-t3.mjs`、`tester-r50-t2-ann.mjs`）。
- 端口 9222，每段 E2E 前 `node .tmp/reset.mjs 9222`。没有启动 Edge、没有 kill `msedge`、没有重启 dev server。
- 结论：**PASS**（T1 / T2 / T3 全部按计划验收标准复验通过；门禁全绿）。

## 1. 门禁（真实输出）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | exit 0；**33 个测试文件、432 条**，每个文件 `ℹ fail 0`（日志 `.tmp/tester-r50-test.log`） |
| `npm run verify` | PASS：`total raw=952999 gzip=294913 headroom=25087 files=3 max=320000`，`target=310000 gap=15087`；主 chunk `index-xYcRGlyW.js` 915.28 kB raw / 290.31 kB gzip |
| `npm run roundtrip` | 未跑：计划 §6 写明本轮不强制（T1/T2/T3 都没改 Markdown 序列化） |

测试条数 425 + 4（`export.test.ts` 脚注续行）+ 3（`replaceRanges.test.ts`）= 432，与文档四处一致。

## 2. 逐条验收

### T1（P1）脚注续行进预览/HTML 导出；导出 Markdown 走差异门 —— 21/21 PASS

脚本 `.tmp/tester-r50-t1.mjs`（日志 `.tmp/tester-r50-t1.log`），假工作区四篇种子：

| 断言 | 读数 |
| :--- | :--- |
| `h-cont.md` 源码含续行 | `正文[^1]\n\n[^1]: 第一行定义\n    续行接着写\n` |
| 预览 `.footnotes li` 计数 = 1 且含两行 | `["第一行定义续行接着写"]`，`.footnotes` 存在（`shots/round-50/test-t1-preview-cont.png`） |
| HTML 导出 `<li>` = 1 且 `第一行定义<br>续行接着写` | 逐字命中（截获 Blob 文本） |
| `h-two.md` 预览 `<li>` = 2、不吸续行（负例） | `["定义甲","定义乙"]`，`hasContinuation:false` |
| `fn-mid.md` 导出 Markdown 无 `[role="dialog"]`、Blob 已写出 | `dialogsBefore/After = []`，Blob `正文[^1](定义)\n\n后文还在。\n` |
| 提示含「已导出 / 注意 / 脚注 [^1] / 在导出后会消失」 | `已导出 fn-mid.md。注意：导出的是改写后的正文——脚注 [^1] 的定义在导出后会消失（正文还在引用它）` |
| 提示不含「保存后」「保存时」 | 逐字检查均不命中 |
| 6.5 s 后提示仍在（`persist`） | `hasToast:true`（`shots/round-50/test-t1-export-warn.png`） |
| 关闭入口是「知道了」且点了消失 | `action:"知道了"` → 点击后 `hasToast:false` |
| `fn-end.md` 对照不打扰 | 提示 `已导出 fn-end.md`，无「注意」、无 `.toast-action` |
| 全程控制台 / pageerror | 0 条 |

### T2（P1）「全部替换」按文本节点批量提交 —— 16/16 PASS

脚本 `.tmp/tester-r50-t2.mjs`（日志 `.tmp/tester-r50-t2.log`，读数 `.tmp/tester-r50-t2.json`）。改前基线本轮不可重测（代码已改），改后读数与计划 §T2 的改前基线（1 MB `dispatch` 51,802 ms / 39,936 步）对照。

| 档 | 命中 | `dispatch`（`steps>0` 那条） | 步数 | 门槛 | 结果 |
| :--- | ---: | ---: | ---: | ---: | :--- |
| 100 KB | 4,096 | **78.8 ms** | **1,024** | ≤400 ms | PASS（降 89.8%） |
| 1 MB | 39,936 | **525.1 ms** | **1,024** | ≤2,000 ms | PASS（降 98.99%） |

- 正确性（1 MB）：`docChars` **983,046**（= 1,022,982 − 39,936，不变量成立；与第 48 轮同脚本读数 983,046 一致）；替换后 `侧灯` 0、`侧` 0、`灯` 39,936（= `灯0`）。
- 撤销：一次 `Ctrl+Z` 后 `docChars` 回到 1,022,982、`侧灯` 回到 39,936（一个事务 = 一步撤销）；100 KB 同样（99,334 → 95,238 → 99,334）。
- `clickReturnMs` 旁证：100 KB 85.4 ms、1 MB 545.6 ms；`longtasks` 100 KB `[100,53]`、1 MB `[719,82,101]`（只打印，不作门槛）。
- 跨文本节点负例：`甲**乙**丙` 查 `甲乙` → 全部替换后 `Q丙`（退回旧路径，正确）。
- 行内格式：`甲**侧灯只补光**` 查 `侧灯` → `strong` 计数 **1**、`strong.textContent` = `灯只补光`。
- 批注保留（`.tmp/tester-r50-t2-ann.mjs`，复制第 36 轮脚本、只改两个截图路径）：`## VERDICT PASS` —— 替换后 `.annot` 1、页边「批注（1 条）」、store 1 条且 `to − from = 2`（3–5 → 2–4）、`Ctrl+Z` 后正文回 `天空很蓝…` 且 store 回 3–5（`shots/round-50/test-t2-ann-after-replaceall.png`、`test-t2-ann-after-undo.png`）。
- 静态接线：`git grep -nE 'applyReplacements\(' -- src/App.tsx` → `src/App.tsx:1937`（exit 0）；命令形式自检 `git grep -cE 'matches\.length' -- src/App.tsx` → 16（exit 0）。
- 控制台 / pageerror：两档与两个小页面都是 0 条。

### T3（P2）排版与点击区 —— 21/21 PASS（1440×900 与 1024×700 两档）

脚本 `.tmp/tester-r50-t3.mjs`（日志 `.tmp/tester-r50-t3.log`），种子 `# / ## （折两行）/ ### / #### / **粗体** / 段落`：

| 项 | 断言 | 实测 |
| :--- | :--- | :--- |
| U1 | h4 与 strong 不再同形；h4 ≥18 px 且 600；strong 仍 700/17 | h4 `18.36px/600`，strong `17px/700` |
| U2 | h2/h3/h4 行高比 1.35/1.4/1.45（±0.03），h1 仍 1.35 | `1.35 / 1.4 / 1.45 / 1.35` |
| U2 | 两行 H2 行盒间隔 ≤32 | **30.3**（改前 44；两个行盒 210 → 240.3，下一段 y 295.8） |
| U6 | 占位符 `paddingLeft === '0px'` | `0px` |
| U6 | 占位符与首段同字族、17 px、行盒 33.15±0.5 | 两处均 `"Source Han Serif SC"` / `17px` / `33.15px` / 盒高 `33.1` |
| U6 | 旁证（只打印）：文字起点 x、rect.y | 占位符 `397` / 键入后首段 `397`；rect.y 都是 `136` |
| U7 | `.stats-trigger` 高 ≥24、`aria-label="字数明细"`；状态栏 28±2 | `h=24`、`aria-label` 命中、状态栏 `28` |
| U9 | 11 个 `.toolbar button` 高都在 23.5–24.5；`</>` 12 px；不换行 | 全部 `h=24`、`</>=12px`、`scrollWidth===clientWidth`（1440） |
| 页面级 | 1440 与 1024 都不横向滚动、1024 工具栏不换行、`.stats-trigger` 仍 ≥24 | 均通过（1024 工具栏 `h=38`，11 个按钮仍 24） |
| 控制台 | 0 error | 通过 |

截图：`shots/round-50/test-t3-hierarchy.png`、`test-t3-toolbar.png`、`test-t3-placeholder.png`。

## 3. 改动范围核对（`git diff` / `git status`）

`git diff --name-only`：`AGENTS.md`、`README.md`、`docs/CHANGELOG.md`、`package.json`、`src/App.tsx`、`src/components/StatusBar.tsx`、`src/lib/export.test.ts`、`src/lib/export.ts`、`src/lib/risk.ts`、`src/styles.css`；未跟踪新增：`src/lib/replaceRanges.ts`、`src/lib/replaceRanges.test.ts`、`docs/iteration/round-50/`、`shots/round-50/`。与计划 §T1/§T2/§T3 的改动文件清单一致，无计划外文件。

- `package.json` 只改 `test` 脚本一行；`version` 仍 `0.32.1`（不发版）。
- `README.md` `:126` 已改 `SHA256SUMS-<版本>.txt`；`:133`/`:171` 已是 33 文件 / 432 条。
- `AGENTS.md` `:39` / `:72` 已按实测回填（33 / 432），与 `npm test` 输出一致。

## 4. 计划偏差（实现与计划写法不同，均不判缺陷）

1. **`replaceEvery` 比计划骨架多了两个守卫**（`src/App.tsx:1873-1895`）：① 相邻命中重叠（`aaa` 里查 `aa`）整单退回旧逐条路径；② **被批注盖住的文本节点只对该节点里的命中逐条替换**，不整节点 `replaceWith`。计划 §T2 §风险只说「不要改 `setAnnotations`」，没写这条；实测有必要——整节点替换会把节点内批注区间一起映射塌。批注回归脚本 `## VERDICT PASS` 锁住这条（3–5 → 2–4，撤销回 3–5）。
2. **T3 的工具栏高度规则收紧到 `.toolbar-group > button`**，不是计划写的 `.toolbar button`：`插入 ▾` 下拉的 `.menu button` 是孙子节点，用 `.toolbar button` 会把 9 个菜单项从 30 px 压到 24 px。本轮只断言了工具栏主排按钮（11 个全 24 px），**菜单项高度未逐条量**（见 §5）。
3. `applyReplacements` 的注释与单测按 `local` 节点内相对坐标写（计划 §T2 步骤 2 的骨架签名一致），接线点只有 `src/App.tsx:1937` 一处，未另写第二份下标算术。

## 5. UNVERIFIED

- 真实宿主 WebView2 里的预览 / HTML 导出脚注与导出提示（本轮全在浏览器态）。
- 真实磁盘 / 网络盘上的「全部替换」响应与 dev + StrictMode 之外的生产构建读数（本轮口径 dev server + 假设 localStorage 文档）。
- 1 MB「全部替换」改前基线本轮无法重测（代码已改）；`dispatch` 的 51,802 ms 引自计划 §T2 引用的 `.tmp/perf-round48-replace.json`（第 48 轮读数），不是本轮实测。
- `插入 ▾` 下拉 9 个菜单项的 30 px 高度（本轮只断言工具栏主排 11 个按钮）。
- 真实中文输入法下的占位符出现 / 消失；系统 150% / 200% 缩放；打印 / PDF 输出下的 h4 与标题行高。

## 6. 下一轮优先（按稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度）

① ui U5 设置面板 sticky 页脚切字（三个对话框共用壳，要跑四组矩阵）+ ui U3 表格字族（本轮为 T2 加测让出）；② code F1 保存先整篇读回旧文件 + 无「没有改动」守卫、code F4 一次停笔 4 份全文（保存 / 性能批次，先定语义）；③ code F2 源码视图逐键 longtask；④ ui U4 三态正文位置不一致（与 48-F2 同源）；⑤ typora T1 单文件插图 base64（要产品负责人定行为）、T3 frontmatter 可见、T4 全屏与缩放；⑥ ship S2/S3/S4 发布字节与打包门禁（单开一轮，不碰 `release/`）；⑦ 文档批次 typora T8 + ship 文档两条。
