# 第 31 轮 · 计划（revision 2）

- **revision 2**：plan-revision 代理按 `docs/iteration/round-31/plan-review.md`（critic，结论 **REVISE**）逐条修漏洞（2026-11-17 01:45，只读复核，未改产品代码）。任务结构仍是 **T1/T2/T3/T4，不新增任务、不扩大范围**：只改验收顺序（P1-1）、砍单约束（P1-2）、T1 的改动面（P2-3）、T2 的选择器与标签（P2-4/P2-5），外加一处审查没写、但会让新顺序必红的焦点问题（R7）。修订对照：

  | 审查项 | 本版怎么修 |
  | --- | --- |
  | P1-1 T3 验收 3 顺序矛盾 | 验收 3 改成写死顺序：**Tab → 断言 `li > ul` = 1 → `Ctrl+/` 读 `textarea.source-editor`（有 `  - 项目二`、无 `项目二  \n`）→ `Ctrl+/` 回编辑 → 断言 `li > ul` 仍为 1 → 点第二项文字把焦点放回正文 → `Shift+Tab` → 断言 `li > ul` = 0**。源码检查不再排在 `Shift+Tab` 之后（`liftListItem` 撤掉嵌套后源码里不可能还有缩进行，原顺序在正确实现上必红） |
  | P1-2 超时砍单后 README:35 留假承诺 | 砍单表 T3 的 ③ 后加死约束：**链接砍了也必须由 builder B（T4 阶段，README 归 B）或根代理合入前把 `README.md:35` 改成当前真实行为**；并把同格「不许砍」里的「链接的核心赋值」删掉（原文自相矛盾：③ 允许砍链接，同格又说核心赋值不许砍）。§5 预写该行、§8 收尾条目同步改写 |
  | P2-3 T1 的第 ③ 处改动多余且新开清空路径 | **删掉原 ③**（`handleRenamedFile` 的 `{ mode: 'check' }`）：① 的不变量守卫已能单独修好 S2；而 `check` 会走 `:2179-2182` 的「找不到 → 清空 `activeFile` + `saveTargetRef`」分支。`:2276` 保持 `adopt` 不动，T1 从「三处改」变「两处改」，A 的工时账 32 → **31** 分钟 |
  | P2-4 T2 的 `dt` 序列漏「选区」 | 验收 1 改用 `.stats-detail dl:first-of-type dt`（7 个：中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读）+ `.stats-detail dl:last-of-type dt`（选区），并断言面板 `dt` 共 **8** 个（`StatsDetail.tsx:101-106` 的第二段 `<dl>` 有 `<dt>选区</dt>`） |
  | P2-5 「汉字」标签与 cjk 口径不符 | 标签改 **中日韩字**（`wordcount.ts:18-19` 的 CJK 正则含平假名 / 片假名 / 谚文，`:2` 注释写「中日韩字符」），`dd title` 写「汉字、日文假名、韩文谚文，逐字计，不含标点」；合计 = 中日韩字 + 拉丁词。README:51、e2e、tester 复验项同步改词，验收 2 的「≠ 合计」不变 |
  | P2-6 嵌套列表无存盘 / 往返证据 | **不进 T3 的验收**（A 只剩 4 分钟余量，再加两段断言会把 P1-1 修好的顺序再压垮）：审查要的「源码 → 回编辑仍为 1」已并入验收 3（重解析半边零成本覆盖）；存盘字节半边登记 §5（下一轮加 `fixtures/markdown` 嵌套列表示例）与 §6 UNVERIFIED |
  | R7（本代理补）源码回编辑后焦点在 `body` | `switchView`（`App.tsx:3704-3727`）只改 `viewMode`、不调 `.focus()`；从源码回编辑后 `document.activeElement` 是 `body`，`handleKeyDown` 收不到键——照审查给的新顺序直接按 `Shift+Tab` 会在正确实现上假红。验收 3 因此多一步「先点第二项文字」，并写进风险 6 |

- **revision 2 只读复核**（2026-11-17 01:45，不改产品代码；下表每条都在本轮重新打开文件核过）：

  | 复核点 | 实测 |
  | --- | --- |
  | 嵌套列表序列化缩进 = 2 空格 | `src/App.tsx:735` 是 `Markdown.configure({ indentation: { style: 'space', size: 2 } })`；`node_modules/@tiptap/extension-list/dist/index.js:55` 的 bulletList 有 `markdownOptions: { indentsContent: true }`、`:1120` 的 `indent` 每次只加一个 `indentString`（2 空格）→ 验收 3 的 `  - 项目二` 成立 |
  | 源码框选择器 | 源码模式只有一个 `textarea.source-editor`（`App.tsx:4660-4665`，没有 `aria-label`）→ 断言写 `textarea.source-editor`，不写「任意 textarea」 |
  | 回编辑不自动回焦 | `switchView`（`App.tsx:3704-3727`）只改 `viewMode`，不 `.focus()`；`Ctrl+/` 的全局分支在 `:3567-3571`，焦点在 textarea 里也生效 |
  | `refreshTree` 三处语义 | adopt 绑定 `:2176-2178`、`check` 找不到就清空 `:2179-2182`、adopt 找不到时保留调用方值 `:2184`；`fileRef` 同步 `:631-633`；`:2276` 仍传 adopt、`wasActive` 在 `:2227`；撤销闭包用删除时捕获的 `refreshTree` 在 `:2361` |
  | 删除流程根本不走 adopt | `removeFile` 在 `deletingRef.current = true` 期间调 `refreshTree()`（`:2310`、`:2335`），`targetPath` 为 null（`:2172`）；自动打开的下一篇 `saveTargetRef` 为 null（`loadIntoEditor` `:1935`），保存靠 `performCommit` 的 `activeFile.handle` 兜底（`:2574-2576`）→ 守卫不挡 S1 的存盘 |
  | 面板 `dt` 数 | `StatsDetail.tsx` 第一段 `<dl>` 6 行 `:72-79`，第二段 `<dl>` 的 `<dt>选区</dt>` 在 `:101-106`；改七行后共 **8** 个 `dt` |
  | CJK 统计范围 | `wordcount.ts:18-19` 的正则含 `\u3041-\u3096`、`\u30A1-\u30FA`、`\uAC00-\uD7A3`；`:2` 写「中日韩字符」 |
  | README:35 原文 | 「点页边任一批注会选中正文里对应的句子并滚到眼前；点正文里的链接会贴着元素弹出编辑框。」（现状：点击无反应） |
  | 链接浮层选择器 | `src/components/LinkEditor.tsx:44` `.link-editor`、`:55` `aria-label="链接文字"`、`:81` `aria-label="链接地址"`；`Esc` 在 `:69-71` / `:100-102` 走 `onCancel` |
  | 行号说明 | 本块插入后正文行号整体下移；下文 `plan.md:NN` 是 revision 1 的排版，请按章节标题定位，行号只作辅助 |

- 轮次参数：round=31，nn=31；报告目录 `docs/iteration/round-31`；dev server `http://localhost:5175`（不重启）；CDP 9222–9226（每个代理一个端口，见 §2）。
- 基线：`main` @ `5b36b71`（第 30 轮），版本 `0.32.1`，工作树只有 `docs/iteration/round-31/` 与 `shots/round-31/` 未跟踪。
- 输入（全部已读）：`docs/iteration/round-31/findings-bug.md`、`findings-typora.md`、`findings-ship.md`、`plan-review.md`（revision 2 逐条修的依据）；`docs/iteration/STATE.md`；`README.md`；`AGENTS.md`（§2、§3、§4、§8）；`docs/typora-gap.md`；`docs/typora-features.md` 相关节；`git log -8`。
- 本代理只读复核（2026-11-17，未改产品代码）：
  - `npm test` 实测 18 个测试块 **260** 条全 pass（`ℹ pass` 求和）；`node scripts/measure-first-screen.mjs --dir dist` 实测 `gzip=284,529 B / max=286,000 B`，**PASS**，余量 **1,471 B**。
  - CDP `9222 / 9223 / 9224` 都返回 `Edg/157.0.4341.46`；`GET http://localhost:5175/src/main.tsx` 返回 200。
  - **新发现一条 P0 类数据丢失路径（本代理探针实测，未进三份 finder 报告）**：改名「非当前文档」后，保存目标被切到被改名的文件。复现脚本 `.tmp/e2e-r31-planner-rename.mjs`（端口 9222，`reset` 后运行），原始输出：
    ```text
    ## open 甲 {"sl":{"dirty":false,"name":"甲.md",...},"selected":["示例文集/甲.md"],"editor":"甲\n\n甲的正文。"}
    ## after rename 丙→丙二 {"sl":{"name":"甲.md"},"selected":["示例文集/丙二.md"],"editor":"甲\n\n甲的正文。"}
    ## 甲 bytes after save "# 甲\n\n甲的正文。\n"
    ## 丙二 bytes after save "# 甲\n\n甲的正文。【改名探针】\n"
    ```
    即：`丙` 的正文被 `甲` 的正文覆盖。根因与 finder-bug 第 1 条同族——`refreshTree` 的 adopt 分支无条件把 `rebound` 接成 `activeFile` 与 `saveTargetRef`（`src/App.tsx:2172-2185`），而 `handleRenamedFile` 对非当前文档也传 `{ mode: 'adopt', activePath: newPath }`（`src/App.tsx:2276`，`wasActive` 在 `:2227`）。截图 `shots/round-31/r31-planner-rename-probe.png`。本轮 T1 一并修掉并加回归锁。
- 版本纪律：**本轮不发版**。不 bump `package.json` 的 `version`（保持 `0.32.1`）；`docs/CHANGELOG.md` 写进 `## Unreleased`；不 push；不改 `release/`。
- 硬约束：编辑器内核 Tiptap；首屏 gzip ≤ **286,000 B**；不加运行时依赖（T4 只把已在包里的传递依赖改成显式声明，字节不变）；缓存只写 `.sidelight/`。

---

## 0. 本轮取舍

| 候选 | 决定 | 理由 |
| :--- | :--- | :--- |
| 删除当前文档后「撤销」把另一篇正文写进恢复的文件（P0） | **做 = T1** | 严重度最高；finder-bug 2/2 复现，`src/App.tsx` 单文件、根因清楚。本代理又找到同根因的「改名非当前文档」路径，一起修 |
| 字数明细「字 / 词」恒等、源码模式选区失效、面板焦点不到（产品负责人点名「字数点击明细」） | **做 = T2（面板口径 + 焦点）** | 第 30 轮刚上线、产品负责人点名；`StatsDetail.tsx` 内 10 行级改动；焦点是 P2 但零成本。**源码模式选区**因为要动 `App.tsx` 的文本域接线，排不进本轮，见 §5 |
| 点正文链接完全没反应（P1，README:35 已承诺「弹编辑框」）；列表 Tab 写行尾双空格、Shift+Tab 无反应（P1，连续两轮未做） | **做 = T3** | 都是 `src/App.tsx` 内小改（链接恢复 `openLinkRef` 原有设计意图；列表缩进用 Tiptap 既有 `sinkListItem`/`liftListItem`）；用户每天用到，且修完 README 不再说谎 |
| 幽灵依赖 `@tiptap/extension-strike`、3 个测试文件（12 条绿断言）没挂进 `npm test`、README 计数不一致、便携 README 指错文件（ship S2/S3/S4） | **做 = T4** | 一行依赖 + 一段 test 串 + 4 处文案，零产品行为变化；不修的话换 pnpm / `npm ci --install-strategy=nested` 会直接构建失败 |
| Mermaid 渲染（产品负责人点名） | **本轮不做，登记 §5** | 最省路径约 **163 KB gzip**（R29/R30 的测量，本轮未复测），首屏余量只有 1,471 B，装成运行时依赖还会把安装包从 824,209 B 推向 85 万 B 硬线。属于「加一个用户看得见的能力」，必须产品负责人先定，并且要先做 ADR + 真实体积实测，不能在 35 分钟轮里硬上 |
| 大纲折叠（产品负责人点名） | **已经在做** | 第 29 轮已实现（`src/components/Outline.tsx:56` 的 `aria-expanded`，R30 实测 3 行折成 1 行）；`docs/typora-gap.md:52` 还写「无」，是文档过期，见 §5 |
| 打开外部浏览器、自动配对、表格列宽、图片落盘规则 | **不做，登记** | 前两项要宿主轮或 M 级代码；后两项是 M 级且列宽必须与 Markdown 保真剥离同轮，本轮容量不够 |
| ship S1（`npm run acceptance` 干净首启红灯、CDP 写死）与 S5/S6 | **不做，登记** | S1 要改 3 处脚本 + 全套 11 项复跑，应单独一轮；S5/S6 是打包脚本/文档，排在用户可见项之后 |

排序说明：按角色规则「数据安全 → 用户可见 → 安装/体积/性能 → 内部质量」，T1 排第一；产品负责人点名的字数明细为 T2；T3 是两轮没做的 P1；T4 是低成本内部质量，放最后并交给另一个执行代理并行。

---

## 1. 任务表

| id | 标题 | 优先级 | 执行代理 | 预估 | 端口 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | P0：删除当前文档后「撤销」与「改名非当前文档」不再切走保存目标 | P0，数据安全 | builder A | **13 分钟** | 9222 |
| T2 | 字数明细：中日韩字 / 拉丁词 / 合计分行 + 面板焦点（产品负责人点名） | P1，用户可见 | builder B | **8 分钟** | 9223 |
| T3 | 点正文链接恢复就地编辑 + 列表 Tab / Shift+Tab 缩进 | P1，用户可见 | builder A（接 T1） | **18 分钟** | 9222 |
| T4 | 门禁与文档：幽灵依赖、3 个未挂测试、README/便携说明、CHANGELOG | P1/P2，内部质量 | builder B（接 T2） | **9 分钟** | — |

**工时账（每个执行代理上限 35 分钟）**

| 代理 | 干什么 | 分钟 |
| :--- | :--- | :--- |
| builder A | T1：写 e2e 脚本并跑红基线（4）｜`refreshTree` 守卫 + undo 用 `refreshTreeRef` **两处改**（3，原 ③ 删除见风险 5）｜跑绿 + 回归 2 例 + 截图（4）｜门禁 `tsc`/`npm test`（2）**= 13**；T3：链接 `openLinkRef` 赋值（5）｜列表 Tab/Shift+Tab（3）｜`ShortcutsDialog` 一行（1）｜e2e 链接 + 列表 + 表格回归（4）｜`tsc`/`npm test`/`roundtrip`（2）｜`vite build --outDir .tmp/build-r31` + measure（2）｜两张截图（1）**= 18**；合计 **31**（余 4 分钟） | 31 |
| builder B | T2：`StatsDetail` 七行 + 焦点（4）｜README:51（1）｜e2e + 截图（3）**= 8**；T4：依赖声明 + `--package-lock-only`（2）｜test 串 + 3 文件（1）｜README 4 处 + 便携 2 处 + CHANGELOG（4）｜核对命令（2）**= 9**；合计 **17** | 17 |
| tester | 见 §3（独立跑，不看实施报告） | 30 |

**超时砍单表**（到硬线按顺序砍，砍了写进报告，不许把半成品当完成）

| 任务 | 先砍（按顺序） | 不许砍 |
| :--- | :--- | :--- |
| T1 | ① 截图 ② 回归 S4（新建文件保存） | `refreshTree` 守卫、undo 改用 `refreshTreeRef`、S1/S2 两个复现断言、`npm test` |
| T2 | ① 深色截图 ② 「段/阅读」两行的 title | 七行口径（中日韩字/拉丁词/合计必须互相不同）、面板焦点、`Esc` 回触发按钮、README:51 |
| T3 | ① `ShortcutsDialog` 一行 ② `npm run roundtrip`（记「未跑」并写理由） ③ 链接点击（只留列表 Tab，链接记 UNVERIFIED 进 §5；**砍了就由 builder B 在 T4 阶段、或根代理合入前把 `README.md:35` 改成当前真实行为**） ④ 表格 Tab 回归断言 | 列表 Tab/Shift+Tab、`npm test`、`vite build` + measure、列表截图、**`README.md:35` 与实现一致**（砍了链接也必须改，不许以假承诺收尾） |
| T4 | ① README:28 示例工作区 ② README 依赖段新增句 ③ 便携 README 第 6 行 | 依赖声明 + `npm test` 21 文件 272 条、CHANGELOG 条目 |

---

## T1 · P0：删除当前文档后「撤销」与「改名非当前文档」不再切走保存目标

### 为什么

- finder-bug 第 1 条（P0，2/2 复现）：打开 `干净.md`（正文 A）→ 删它 → 应用自动打开 `普通.md`（正文 B）→ 点「撤销」→ 树高亮与标题变成恢复的 `干净.md`，正文区仍是 B；下一次保存把 B 的整篇正文写进 `干净.md`，A 被覆盖、磁盘上再也找不到。证据 `findings-bug.md:12-55`，原始字节输出在 `:24-37`。
- 本代理新发现同根因路径（见文件头）：改名**非当前**文档后，树高亮切到被改名文件，`__slState.name` 仍是当前文档；下一次自动保存把当前文档正文写进被改名文件，原正文丢失。
- 根因（**两处需要改，一处明确不改**）：
  1. `src/App.tsx:2354-2369` 撤销按钮的 `onClick` 闭包里是**删除那一刻捕获的** `refreshTree`；该闭包的 `activeFile` 还是被删的 A（`refreshTree` 依赖 `[activeFile, show]`，见 `:2204`）。
  2. `src/App.tsx:2172-2185` 的 adopt 分支只要 `rebound` 存在就 `setActiveFile(rebound)` 且 `saveTargetRef.current = rebound.handle`——只换身份，不换正文。撤销时正文是 B，身份却被接成 A。
  3. **不改 `src/App.tsx:2276`**：`handleRenamedFile` 对**非当前**文档也传 `{ mode: 'adopt', activePath: newPath }`（`wasActive` 在 `:2227`，只保护了标题、草稿与缓存）；① 的不变量守卫会把这个 adopt 挡掉（`rebound` 是 `丙二`、`fileRef.current.path` 是 `甲`），`activeFile` 与 `saveTargetRef` 都不动。审查 P2-3 还指出原计划把这里改成 `{ mode: 'check' }` 反而新开一条丢保存目标的路：`check` 在 `:2179-2182` 找不到就 `setActiveFile(null)` + `saveTargetRef = null`，只要 `activeFile.path` 不在新快照里就会触发。所以原 ③ 整段删除（见风险 5）。

### 改动文件

| 文件 | 改什么 |
| :--- | :--- |
| `src/App.tsx` | ① `refreshTree`（`:2149-2205`）的 adopt 分支（`:2176-2178`）加不变量守卫：`if (rebound) { if ((fileRef.current?.path ?? null) === rebound.path) { setActiveFile(rebound); saveTargetRef.current = rebound.handle ? { handle: rebound.handle, name: rebound.name } : null } }`，并在注释里写清「编辑器里载入的必须是这个文件，才接保存目标；删除撤销 / 非当前文件改名会把别的文件接进来」。`fileRef` 由 `:631-633` 跟 `activeFile` 同步。**守卫只跳过 adopt，不清 `activeFile`、不清 `saveTargetRef`，也不碰 `:2179-2182` 的 check 分支。**<br>② 撤销分支（`src/App.tsx:2356-2366`）把 `await refreshTree()` 改成 `await refreshTreeRef.current()`（ref 在 `:2206` 赋值），不再用删除那一刻捕获的闭包。<br>**不改** `:2276`（非当前文件改名的 adopt，由 ① 守卫挡住）；**不改**删除/恢复的正文逻辑（第 30 轮刚修好，`trash.ts` 不动）。 |
| `.tmp/e2e-r32-undo.mjs`（新建，非产品代码） | 从 `.tmp/e2e-r31-c.mjs` 的探针 A 与 `.tmp/e2e-r31-d.mjs` 的探针 D 裁剪；读 `process.argv[2]` 端口；复用 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `openFolder` / `readFakeFile`。四组断言见下。 |

### 实施步骤

1. **先写回归脚本、先跑红**（不许先改产品代码）：写 `.tmp/e2e-r32-undo.mjs`，在 `node .tmp/reset.mjs 9222` 之后跑一次，把 S1/S2 的原始输出贴进 `impl.md`（当前应为红：`甲.md` 0 字节变化、`丙二.md` 被写成 `甲` 的正文）。
2. 改 `refreshTree` 守卫。注意 `refreshTree` 的 adopt 分支还要保留 `missingName` 的 check 分支行为（`:2179-2193`）不变。
3. 改撤销分支用 `refreshTreeRef.current()`。
4. **不碰 `:2276`**；顺手核对「改名当前文档仍走 adopt」的前提：`handleRenamedFile` 在 `wasActive` 分支里 `setActiveFile(renamed)` 之后同步写了 `fileRef.current = renamed`（`:2232-2233`），守卫靠它放行——这条是 S3 能绿的唯一依赖。再核对 `:2179-2182` 的 check 分支一行没改。
5. `npx tsc --noEmit` → 重跑 e2e → 四组全绿 → `npm test`。
6. 核对 dev server 确实在跑新模块：`(Invoke-WebRequest 'http://localhost:5175/src/App.tsx' -UseBasicParsing).Content -match 'fileRef\.current\?\.path === rebound\.path'`（命中才算；不命中先查 HMR，不要改产品代码去迁就陈旧模块）。
7. 截图 `shots/round-31/r31-undo-safe.png`（撤销后：标题/树/prompt 一致，正文是乙）。

### 验收标准（可执行，builder 自测）

脚本 `.tmp/e2e-r32-undo.mjs <端口>` 必须打印四组 `PASS`：

1. **S1 删除当前文档 → 撤销 → 直接输入**
   - 初始：`甲.md = "# 甲\n\n甲的正文。\n"`、`乙.md = "# 乙\n\n乙的正文。\n"`；点开 `甲`。
   - 树选中 `甲` → `Delete` → 点「移到回收站」→ 等自动打开 `乙`。
   - 点「撤销」→ 断言 `window.__slState.name === '乙.md'`、`aria-selected` 只有 `示例文集/乙.md`、标题栏/正文仍是乙。
   - 不点树，正文末尾输入 `【安全探针】`，等自动保存 ≥3 s：断言 `甲.md` 字节仍是 `"# 甲\n\n甲的正文。\n"`（**本任务的核心锁**），`乙.md` 含 `【安全探针】`。
2. **S2 改名非当前文档 → 直接输入并保存**
   - `甲` 为当前文档；焦点放 `丙` 行（`locator.focus()`，不点开）→ `F2` → 改名 `丙二.md` → `Enter`。
   - 断言 `__slState.name === '甲.md'`、`aria-selected === 示例文集/甲.md`、正文仍是甲。
   - 输入 `【改名探针】` + 自动保存：断言 `丙二.md` 字节仍是 `"# 丙\n\n丙的正文。\n"`，`甲.md` 含 `【改名探针】`。
3. **S3 回归：改名当前文档仍写新路径**
   - 当前 `甲` → `F2` 改名 `甲二.md` → 断言 `__slState.name === '甲二.md'`、树选中 `示例文集/甲二.md`；输入 + `Ctrl+S` → `甲二.md` 含新文字，旧 `甲.md` 不存在。
4. **S4 回归：新建文件保存**
   - 树头「＋ 新建文件」→ 输入 `新文件内容。` → `Ctrl+S` → 新文件字节含 `新文件内容。`。
   - 全程 `console error === 0`、`pageerror === 0`。

其他门禁：

5. `npx tsc --noEmit` 退出码 0。
6. `npm test` 18 个文件 **260** 条全 pass（本任务不加不删测试）。
7. `git diff --stat` 只有 `src/App.tsx`（外加未跟踪的 `.tmp` 脚本与 `shots/`）；`release/`、`dist/` 无变化；`package.json` 的 `version` 仍是 `0.32.1`。
8. 截图 `shots/round-31/r31-undo-safe.png` 存在。

### 门禁命令

```powershell
npx tsc --noEmit
npm test
node .tmp/reset.mjs 9222
node .tmp/e2e-r32-undo.mjs 9222
# 模块新鲜度（必须命中 1 次）
(Invoke-WebRequest 'http://localhost:5175/src/App.tsx' -UseBasicParsing).Content -match 'fileRef\.current\?\.path === rebound\.path'
```

不需要 `npm run build`：本任务没有新增 import，类型由 `tsc` 覆盖；首屏体积由 T3 的 `.tmp/build-r31` 与根代理最终 build 复核。

### 风险

1. **守卫依赖 `fileRef.current` 的时序**：`fileRef` 在 `activeFile` 变化后的 effect 里同步（`:631-633`）。新建/另存为路径在 `refreshTree` 之前已显式设置 `saveTargetRef`（`:2412`、`finishSaved` 的 `:2482`），所以守卫跳过 adopt 也不会丢保存目标——S4 就是这条的回归。若 S4 红，改为给 `refreshTree` 传入白名单参数（`adopt: true` 只给 3 个已知调用点），不要回退守卫。
2. **撤销会 `cancelAutoSaveRef.current()`**（`:2160`）：用户在乙里打字不到 2 秒就点撤销，乙的自动保存会被取消；`dirty` 仍为真、关窗守卫仍在，下一次输入会重启计时。这是既有行为，本轮不改；手测「打字后立刻撤销」记 UNVERIFIED。
3. **真实目录句柄未验**：假 FSA 没有权限模型，`move()` 分支总被走到；真实盘删除 + 撤销照旧记 UNVERIFIED（与第 30 轮同口径）。
4. 不许为了过 S2 去改 `handleRenamedFile` 的缓存迁移或 `prepareRename`——本任务只动身份/保存目标接线。
5. **为什么删掉原 ③（`:2276` 改 `check`）**：① 的守卫已能单独修好 S2（rebound=丙二 ≠ fileRef=甲 → 跳过 adopt，`activeFile` 与 `saveTargetRef` 都不动）；而 `check` 在 `:2179-2182` 找不到就清空 `activeFile` + `saveTargetRef` 并报「已不在磁盘上」，等于把「保存目标被换」换成「保存目标被清」。若 S2 意外仍红，**不要**回头加 `check`；改用白名单参数（`adopt: true` 只给 `:2276`/`:2413`/`:2562` 三个调用点）或 `{ mode: 'adopt', activePath: activeFile?.path ?? newPath }`（adopt 的 `:2184` 明确「找不到也不清空调用方的值」）。
6. **守卫不影响「自动打开下一篇」的存盘**（S1 的存盘断言依赖这条）：`removeFile` 在 `deletingRef.current = true` 期间调 `refreshTree()`（`:2310`、`:2335`），`targetPath` 因 `deletingRef` 为 null（`:2172`），根本不走 adopt；`loadIntoEditor` 把 `saveTargetRef` 清成 null（`:1935`），保存由 `performCommit` 回落到 `activeFile.handle`（`:2574-2576`）。所以「乙.md 含 `【安全探针】`」不依赖 adopt。

---

## T2 · 字数明细：中日韩字 / 拉丁词 / 合计分行 + 面板焦点（产品负责人点名）

### 为什么

- 产品负责人点名「字数点击明细」。第 30 轮上线了面板，但 `src/components/StatsDetail.tsx:70-79` 把 `const total = stats.cjk + stats.words` 同时传给「字」和「词」两行——两行恒等（finder-bug 第 3 条：10/10、46/46 两次实测），一行为纯冗余，用户会以为两个口径不同。
- 标签口径（审查 P2-5）：`cjk` 的统计范围是「汉字 + 日文假名 + 韩文谚文」——`src/lib/wordcount.ts:18-19` 的正则含 `\u3041-\u3096`、`\u30A1-\u30FA`、`\uAC00-\uD7A3`，`:2` 的注释也写「中日韩字符」。原计划把这行标成「汉字」，在日文/韩文文档下不准确，而 README 是公开的；本版标「中日韩字」，并用 `dd title` 写清包含哪些字。
- 面板 `role="dialog"` 但没有 `tabIndex`、没有聚焦动作（`:81-88`），打开后焦点仍在触发按钮（finder-bug 第 4 条实测 `activeIsTrigger: true`）；读屏不会朗读一个从未获得焦点的非模态对话框。
- 数据侧已就绪：`src/lib/wordcount.ts:47-57` 已经分别算出 `cjk`、`words`、`chars`、`paragraphs`、`minutes`，`countSentences` 在 `:72-77`，不需要新算法、不加体积。
- 本代理探针另测到一处**没进三份 finder 报告**的口径问题（P2，本轮不改）：编辑模式 `openStatsDetail` 取 `editor.state.doc.textContent`（`src/App.tsx:3791`），ProseMirror 拼接块时不加分隔符，两段正文实测「段 1 / 句 1」（`.tmp/e2e-r31-planner-stats.mjs` 原始输出 `values:["10","13","10","1","1","1 分钟","未选中文本"]`）。修法只要把取文换成 `doc.textBetween(0, doc.content.size, '\n')`，但要动 `App.tsx`，登记 §5，与源码选区、状态栏 chip 一起做。**T2 只改 `StatsDetail.tsx`，不改正文取法。**

### 改动文件

| 文件 | 改什么 |
| :--- | :--- |
| `src/components/StatsDetail.tsx` | ① 行改为七行，值各不相同：`中日韩字 = cjk`、`拉丁词 = words`、`合计 = cjk + words`、`字符 = chars`、`句 = countSentences(text)`、`段 = paragraphs`、`阅读 = minutes 分钟`。每行 `<dd title="…">` 写清口径（按 `term` 查表，不要再写 `term === '词'` 三元）：中日韩字「汉字、日文假名、韩文谚文，逐字计，不含标点」、拉丁词「按空白与标点切分，连续字母数字算一个词」、合计「与状态栏字数一致（中日韩字 + 拉丁词）」、字符「不含空白」。删掉 `:70` 的 `total` 双用与 `:94` 的 `term === '词'` 条件。<br>② 选区行（第二段 `<dl>`，`:101-106` 的 `<dt>选区</dt>`）保持三值（字 / 字符 / 句，字 = 选区内 cjk + words）；空选区仍是「未选中文本」。**这段 `<dl>` 保留、不要删**——验收 1 的「共 8 个 `dt`」就靠它。<br>③ 焦点：加 `useRef<HTMLDivElement | null>(null)` + `tabIndex={-1}` + `useEffect(() => { panelRef.current?.focus() }, [])`（现有 `useEffect` 之外新加一个），`role="dialog"` 与 `aria-label="字数明细"` 保留；`Esc` 回焦触发按钮的逻辑已在 `src/App.tsx:3435-3439`，不改。<br>④ 底部注脚改为「合计 = 中日韩字 + 拉丁词，与状态栏一致；字符数不含空白；阅读时间按 300 字/分钟估算。」 |
| `README.md:51` | 改成：「字数：状态栏点字数弹出明细，列出中日韩字、拉丁词、合计、字符、句、段与预计阅读时间，以及当前选区内的字 / 字符 / 句。点面板外面或按 `Esc` 关闭。」**不要**写「源码模式选区」（本轮不做，见 §5）。 |
| `.tmp/e2e-r32-stats.mjs`（新建） | 读 `process.argv[2]` 端口；连 9223；断言七行值与焦点。 |

### 实施步骤

1. 改 `StatsDetail.tsx` 七行与 title（颜色只用主题变量，现有行内 style 不动，深色主题自动跟随）。
2. 加 `panelRef` + `tabIndex={-1}` + 聚焦 effect。
3. 改 README:51。
4. `npx tsc --noEmit`；写并跑 `.tmp/e2e-r32-stats.mjs`；截图。
5. 确认模块新鲜：`(Invoke-WebRequest 'http://localhost:5175/src/components/StatsDetail.tsx' -UseBasicParsing).Content -match '中日韩字'` 命中。

### 验收标准（可执行）

样例正文用固定字符串 `中文正文 abc\n\n第二段结束。`。面板的 `text` 来自 `editor.state.doc.textContent`（无块分隔符），本代理用 `.tmp/e2e-r31-planner-stats.mjs` 实测当前口径为 `字 10 / 字符 13 / 词 10 / 句 1 / 段 1 / 阅读 1 分钟`；改造后 `cjk=9`、`words=1`、`chars=13`、`minutes=1`。脚本断言：

1. 点 `.stats-trigger` 后：`.stats-detail dl:first-of-type dt` 文本**依次**为 `中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读`（7 个）；`.stats-detail dl:last-of-type dt` 文本为 `选区`；面板 `document.querySelectorAll('.stats-detail dt').length === 8`。**不要**拿 `.stats-detail dt` 直接 `toEqual` 7 项——第二段 `<dl>` 还有 `<dt>选区</dt>`（`StatsDetail.tsx:101-106`，审查 P2-4）。`dl:first-of-type dd` 前四项值为 `9 / 1 / 10 / 13`；`句 / 段 / 阅读` 三行存在且非空。**不锁定「句 1 / 段 1」**——那是本轮不修的取文口径（§5），锁了会把已知问题变成验收基线。
2. **两个口径不再同值**：`中日韩字 ≠ 合计`（本样例 9 ≠ 10），且 `合计 = 中日韩字 + 拉丁词`。断言里**不许**再出现「字 / 词」这类旧标签文本；改词就是为了不把假名、谚文算成「汉字」（P2-5）。
3. 打开后 `document.activeElement` 的 `className` 含 `stats-detail`（焦点进面板）。
4. `Escape` 后 `.stats-detail` 消失，`document.activeElement` 的 `className` 含 `stats-trigger`（焦点回触发按钮）。
5. `console error === 0`、`pageerror === 0`。
6. `npx tsc --noEmit` 退出码 0；`npm test` 18 文件 260 条全 pass（本任务不加测试：面板是纯展示，口径值由 e2e 断言）。
7. 截图 `shots/round-31/r31-stats-rows.png`（浅色，面板打开，能看清七行）。可选第二张 `r31-stats-rows-dark.png`（`data-theme=dark`，面板背景仍读主题变量）。

### 门禁命令

```powershell
npx tsc --noEmit
npm test
node .tmp/reset.mjs 9223
node .tmp/e2e-r32-stats.mjs 9223
(Invoke-WebRequest 'http://localhost:5175/src/components/StatsDetail.tsx' -UseBasicParsing).Content -match '中日韩字'
```

### 风险

1. **焦点移出正文**：打开面板会把焦点从编辑器拿走；Esc 会还回触发按钮（`:3436-3437`），再按 Tab 才回正文。这是读屏可用的必要代价，写进 README 与 CHANGELOG，不做「打开后仍保持正文焦点」。
2. **8 个脚本用 `.status-bar` 整栏文本抓字数**（R30 风险 1）：面板仍是 footer 的兄弟节点（`src/App.tsx:4811-4820`），本任务不动结构，不吃状态栏文本。
3. 行数从 6 行变 7 行，面板高度增加约 20 px；`bottom: 40px` 的固定定位在小窗（700 px 高）仍可见，验收 7 的截图就是窄窗检查。
4. README:51 是被多个脚本 grep 的文案吗？不是（脚本抓 `.status-bar`，不读 README）；改文案零风险。

---

## T3 · 点正文链接恢复就地编辑 + 列表 Tab / Shift+Tab 缩进

### 为什么

- finder-typora 2.1（P1）：正文里的 `<a>` 点击后完全不响应。`src/App.tsx:519` 声明 `openLinkRef`、`:797` 调用它，但全仓库没有任何赋值；`handleClick` 先 `preventDefault()` 再调一个空函数，点击被静默吞掉。`README.md:35` 却写着「点正文里的链接会贴着元素弹出编辑框」——现在的行为与文档相反。
- finder-typora 2.3（P1，连续两轮未做）：`src/App.tsx:766-774` 的 Tab 分支只做 `insertText('  ')`；在列表第二项按 Tab，`li > ul` 仍是 0，正文多出两个空格（Markdown 硬换行），保存结果与屏幕不一致；`event.shiftKey` 在 `:766` 直接 `return false`，Shift+Tab 无任何缩进/反缩进逻辑。
- Tiptap 3.34 已带 `sinkListItem` / `liftListItem` 命令（`node_modules/@tiptap/core/dist/index.d.ts:3683`、`:3961`），不加依赖。

### 改动文件

| 文件 | 改什么 |
| :--- | :--- |
| `src/App.tsx` | ① `openLinkRef` 类型从 `(anchor)` 改为 `(anchor, pos)`（`:519`）。`handleClick`（`:791-798`）调用时把 `_pos` 改名 `pos` 并传入。新增一个 `useEffect`（放在 `:3880-3909` 的 `openLinkAtCursorRef` 赋值旁边）：守卫 `if (!editor \|\| pos < 0) return`；取 `view.state.doc.resolve(pos)`，`$pos.marks().find((mark) => mark.type.name === 'link')`；没有 link mark 时再试 `view.posAtDOM(anchor, 0)` 兜底；有 mark 就 `editor.chain().setTextSelection(pos).extendMarkRange('link').run()`，从 `editor.state.selection` 取 `from/to`，`coordsAtPos(range.from)` 算 `DOMRect`，`setLinkEdit({ text: textBetween(from,to,' '), href: getAttributes('link').href, from, to, focus: 'text', anchor })`——与现有 `openLinkAtCursorRef` 的写法一致（`:3880-3909`）。<br>② 列表缩进：在 `handleKeyDown` 里、`inTable` 判定（`:747-754`）之后、现有 `:766` 的 Tab 门槛之前加：沿 `view.state.selection.$from` 向上找最近的 `listItem` / `taskItem`；命中的话 `event.key === 'Tab' && !event.isComposing` 时 `preventDefault()`，`event.shiftKey ? editor?.chain().focus().liftListItem(kind).run() : editor?.chain().focus().sinkListItem(kind).run()`，`return true`。保留三条既有约定：表格内 Tab 默认跳格（`inTable` 先返回 false）、文档开头 Tab 给 skip link（`from===1` 分支只在非列表时生效）、非列表位置 Tab 仍插两个空格。<br>③ 不改 `applyLink` / `LinkEditor` / 样式。 |
| `src/components/ShortcutsDialog.tsx` | 「编辑与批注」组加一行：`['列表内 Tab / Shift+Tab', '缩进 / 反缩进']`（放在 `:31` 的 Ctrl+K 行之后）。惰性组件，不进首屏。 |
| `.tmp/e2e-r32-keys.mjs`（新建） | 读 `process.argv[2]` 端口；链接、列表、表格、文档开头 Tab 四组断言。 |

### 实施步骤

1. 先写 e2e（链接 + 列表 + 表格 + 文档开头），**列表部分照验收 3 的 3a–3d 顺序写**（不要先写 Shift+Tab），跑一次记录当前红：链接点击后 `.link-editor` 数量 0；列表 Tab 后 `li > ul` 为 0 且源码行尾双空格。
2. 改 `openLinkRef` 类型 + `handleClick` 传 `pos` + 新增赋值 effect。
3. 改 Tab 分支。
4. `ShortcutsDialog` 加一行。
5. `npx tsc --noEmit` → 跑 e2e → 全绿 → `npm test` → `npm run roundtrip`。
6. `npx vite build --outDir .tmp/build-r31` + `node scripts/measure-first-screen.mjs --dir .tmp/build-r31` → 必须 PASS；报告余量。
7. 两张截图；核对 dev server 新模块：`Content -match 'sinkListItem'` 与 `match 'openLinkRef\.current = '`。

### 验收标准（可执行）

脚本 `.tmp/e2e-r32-keys.mjs <端口>`：

1. **点链接进编辑**：打开含 `[例子](https://example.com/page)` 的 `链接.md`，点正文 `<a>` → `.link-editor` 可见；`input[aria-label="链接文字"]` 值 `例子`、`input[aria-label="链接地址"]` 值 `https://example.com/page`；`Escape` 后浮层消失；浏览器页面数不变（不新开标签）。
2. **Ctrl+K 回归**：选中一段文字按 `Ctrl+K` → `.link-editor` 仍出现（既有行为不变）。
3. **列表 Tab / Shift+Tab 缩进（顺序写死，不许调换——审查 P1-1）**，四步按顺序执行：
   - **3a** 清空正文 → 输入 `- 项目一` → `Enter` → 输入 `项目二` → 按 `Tab`：断言 `.ProseMirror li > ul` 数量 **1**。
   - **3b** `Ctrl+/` 进源码模式 → 读 **`textarea.source-editor`** 的值（`App.tsx:4660-4665`，这是源码模式唯一的 textarea）：含一行以 `  - 项目二` 开头（2 空格缩进，来自 `App.tsx:735` 的 `indentation: { style: 'space', size: 2 }` 与 `@tiptap/extension-list` 的 `indentsContent: true`），且**不出现** `项目二  \n`（无行尾双空格）。
   - **3c** `Ctrl+/` 回编辑 → 断言 `.ProseMirror li > ul` 仍为 **1**（源码缩进能被 `applySource` 重新解析回来）。
   - **3d** **先点第二项的文字**（`page.locator('.ProseMirror li li').click()`；离开源码模式不会自动回焦，见风险 6）→ 按 `Shift+Tab` → 断言 `.ProseMirror li > ul` 数量 **0**。
   - **顺序理由写进报告**：`Shift+Tab` 走 `liftListItem` 撤销嵌套，之后再读源码不可能有缩进行——原计划「先 Shift+Tab 再查源码」在正确实现上必红（P1-1 审查原文）。
4. **表格 Tab 回归**：插入表格 → 输入 `一格` → Tab → 输入 `二格`：两格分别在两个 `td/th` 里，焦点仍在表格内。
5. **文档开头 Tab 回归**：空文档、光标在开头按 Tab → `document.activeElement` 是 `.skip-link`（不是正文、也不是插入空格）。
6. `console error === 0`、`pageerror === 0`。
7. `npx tsc --noEmit` 退出码 0；`npm test` 18 文件 260 条全 pass；`npm run roundtrip` 退出码 0，且 `git status --short docs/roundtrip-report.md` 为空（有变化就 `git checkout -- docs/roundtrip-report.md`，本任务不改序列化）。
8. `node scripts/measure-first-screen.mjs --dir .tmp/build-r31` → `PASS`，gzip ≤ **286,000 B**；报告相对 284,529 B 的差值。**超线就按砍单表退链接部分，不许把首屏顶破。**
9. 截图 `shots/round-31/r31-link-editor-fixed.png`（浮层打开）、`shots/round-31/r31-list-tab-fixed.png`（嵌套列表后、源码框能看到缩进）。

### 门禁命令

```powershell
npx tsc --noEmit
npm test
npm run roundtrip
node .tmp/reset.mjs 9222
node .tmp/e2e-r32-keys.mjs 9222
npx vite build --outDir .tmp/build-r31
node scripts/measure-first-screen.mjs --dir .tmp/build-r31
(Invoke-WebRequest 'http://localhost:5175/src/App.tsx' -UseBasicParsing).Content -match 'sinkListItem'
```

### 风险

1. **链接位置取错**：`handleClick` 的 `pos` 在链接文字内部；若 `$pos.marks()` 为空（例如点击 `<a>` 的内边距或空文本节点），用 `view.posAtDOM(anchor, 0)` 兜底；再没有就静默返回（与现在一致，不引入异常）。e2e 断言两个输入框的值，能抓住取错。
2. **首屏余量只有 1,471 B**：链接赋值 + Tab 分支 + 对话框一行约 +400–700 B gzip；验收 8 是硬门，超线先砍 `ShortcutsDialog` 与注释，仍超就砍链接（记 UNVERIFIED 与 §5），**不许改 measure 上限**。
3. **`extendMarkRange` 会改变选区**：点链接后选区扩到整个链接，Esc 关闭后选区保持（与 Ctrl+K 一致）；若用户随后输入会替换链接文字——这是既有链接编辑语义，不另改。
4. **Shift+Tab 的无障碍语义**：`ShortcutsDialog.tsx:72` 写「Shift+Tab 回到顶栏」。本任务只在列表项内拦截，其他位置保持浏览器默认；验收 3 只测列表内，`keyboard-acceptance` 由 tester 复验。
5. **列表判定用祖先节点名**（`listItem` / `taskItem`），不依赖 `editor.isActive` 的当前块状态；嵌套三层时 Tab 仍应只降一级（`sinkListItem` 自身语义）。
6. **从源码回编辑后焦点在 `body`**（本代理复核，审查没写）：`switchView`（`:3704-3727`）只改 `viewMode`、不 `.focus()`，`Ctrl+/` 回编辑后直接按 `Shift+Tab`，键到不了 ProseMirror 的 `handleKeyDown`，验收 3d 会在正确实现上假红。所以 3d 先 `page.locator('.ProseMirror li li').click()` 把光标放进第二项；点不中就退一步 `page.locator('.ProseMirror').click()` 再 `page.keyboard.press('End')`。**不要**改成「回编辑后按两次 Tab 再 Shift+Tab」之类的绕法。

---

## T4 · 门禁与文档：幽灵依赖、3 个未挂测试、README/便携说明、CHANGELOG

### 为什么

- ship S2（P1）：`src/App.tsx:6` 直接 `import { Strike } from '@tiptap/extension-strike'`，但 `package.json` 的 dependencies 没有它；现在能编过只是因为 npm 把它从 `@tiptap/starter-kit` 提升到了顶层（`npm ls` 实测是传递依赖，`findings-ship.md:83-98`）。换 pnpm / `--install-strategy=nested` / starter-kit 未来摘掉它，`npm run build` 立刻 `TS2307`。
- ship S3（P2）：`src/lib/settings.test.ts`、`prompt.test.ts`、`katexLazy.test.ts` 三个文件共 **12 条**绿断言（本代理复跑：7 + 3 + 2）从没进 `npm test`、CI 或任何脚本；README:115 写 18/260、README:152 还写「17 个测试文件挂进 npm test……katexLazy.test.ts 未挂」，自相矛盾。
- ship S4（P2）：`packaging/README.txt:6` 让用户「见同目录的 README.md」，但 `portable.ps1` 根本不打包 README.md；`:44` 写「不做 .md 文件关联（是否做，待产品负责人确认）」，而安装器 0.20.0 起已有 opt-in「打开方式」、ADR-0007 已定。
- ship S6 的一部分：`README.md:28` 还写「试用内存里的示例工作区」，界面里没有这个入口（唯一入口是测试脚本 `scripts/demo-folder.mjs`）。

### 改动文件

| 文件 | 改什么 |
| :--- | :--- |
| `package.json` | ① dependencies 按字母序加 `"@tiptap/extension-strike": "^3.34.0"`（放在 `extension-mathematics` 与 `extension-table` 之间）。<br>② `test` 串末尾追加 `&& node --experimental-strip-types src/lib/settings.test.ts && node --experimental-strip-types src/lib/prompt.test.ts && node --experimental-strip-types src/lib/katexLazy.test.ts`。<br>**不动 `version`。** |
| `package-lock.json` | 由 `npm install --package-lock-only` 同步根依赖声明；不装/改 `node_modules`。 |
| `README.md` | ① `:28` 删「，或者试用内存里的示例工作区」→「左侧文件树：打开文件夹、单独打开一个 `.md` 文件。当前文档高亮。」<br>② 依赖段（`:101-106`）加一条：「- `@tiptap/extension-strike`：`src/App.tsx` 直接 import 并自定义快捷键；它是 `@tiptap/starter-kit` 的传递依赖，但直接引用必须显式声明，否则换安装布局或 starter-kit 未来摘掉它就会构建失败。**不增加字节**（同一模块本来就在包内，首屏实测不变）。」<br>③ `:115` → `npm test          # 21 个文件、272 条断言`。<br>④ `:152` → `lib/*.test.ts           21 个测试文件挂进 npm test（含 session / prompt / settings / katexLazy），与实现同目录`。 |
| `packaging/README.txt` | ① `:6` → 「装到系统里的版本（setup.exe，同样不需要管理员）见项目主页 README.md 的「下载」一节：https://github.com/XuJingye2022/SideLight 」（不指向包里不存在的文件）。<br>② `:44` → 「不写注册表，不做 .md 文件关联，不建开机项（安装器可在安装时把 Sidelight 加进右键「打开方式」，默认不勾且不改默认程序）。」 |
| `docs/CHANGELOG.md` | `## Unreleased` 下追加「**第 31 轮（同一未发版区间）**」小节，4 条：T1 数据安全、T2 字数明细口径与焦点、T3 链接点击与列表 Tab、T4 依赖声明与门禁（21 文件 272 条）。**链接被砍单时 T3 条只写列表 Tab 缩进，不写链接**（CHANGELOG 也是对外文案，不许写没做的功能）。首屏数字写「仍 ≤286,000（实测值见本轮 `test.md`）」，不编具体字节。 |

### 实施步骤

1. 改 `package.json` 两处（依赖 + test 串），跑 `npm install --package-lock-only`，检查 `git diff package-lock.json` 只有根 `dependencies` 增加一项。
2. `npm test`：应变成 21 个测试块、**272** 条，全 pass。若任何一条新挂的测试红：**不许删测试或减弱断言**，先修测试或如实报 FAIL（本代理复跑三条都是绿的）。
3. 改 README 四处、`packaging/README.txt` 两处、CHANGELOG 四条。
4. `npx tsc --noEmit`（依赖声明类型可解析）。
5. 核对命令（见验收）逐条贴输出。

### 验收标准（可执行）

1. `npm test` 退出码 0；用下面命令打印 `files=21 pass=272`：
   ```powershell
   $out = npm test 2>&1
   "files=" + (($out | Select-String '^ℹ pass ').Count) + " pass=" + ((($out | Select-String '^ℹ pass (\d+)$') | ForEach-Object { [int]$_.Matches[0].Groups[1].Value } | Measure-Object -Sum).Sum)
   ```
2. `npm ls @tiptap/extension-strike --depth=0` 输出里出现 `sidelight@0.32.1` 下的 `@tiptap/extension-strike@3.34.0`（直接依赖，不是 `starter-kit` 的缩进子层）；`git diff package.json` 只有依赖一行与 test 串。
3. `npx tsc --noEmit` 退出码 0。
4. 文案断言（每条 1 次命中）：
   - `Select-String -Path README.md -Pattern '21 个文件、272 条断言'`
   - `Select-String -Path README.md -Pattern '21 个测试文件挂进 npm test'`
   - `Select-String -Path README.md -Pattern '示例工作区'` → **0 命中**
   - `Select-String -Path packaging/README.txt -Pattern '同目录的 README\.md'` → **0 命中**
   - `Select-String -Path packaging/README.txt -Pattern '待产品负责人确认'` → **0 命中**
   - `Select-String -Path docs/CHANGELOG.md -Pattern '第 31 轮'` → ≥1
5. `git status --short`：`release/`、`dist/` 无变化；`package.json` 的 `version` 仍是 `0.32.1`。
6. 不跑 `npm run build`、不重打包（首屏与安装包字节由根代理最终 build/measure 复核；本任务不改 import 图，理论上不变）。

### 门禁命令

```powershell
npx tsc --noEmit
npm test
npm ls @tiptap/extension-strike --depth=0
git diff --stat package.json package-lock.json README.md packaging/README.txt docs/CHANGELOG.md
Select-String -Path README.md -Pattern '示例工作区'   # 0 命中
```

### 风险

1. `npm install --package-lock-only` 可能重排 lock 文件的其他字段；只允许「根 dependencies 增加一行」这一类 diff。若出现大面积重排，改为手工在 `package.json` 加依赖后跑 `npm install --package-lock-only --ignore-scripts` 再查，仍大面积重排就回退并记 UNVERIFIED，不强推。
2. 新增的 3 个测试文件若在新 Node 上偶发失败：如实报 FAIL，**不许**从 test 串里删掉它们来变绿。
3. README 由 builder B 单独写（T2 也写 README:51，B 串行做 T2 → T4，不并发写同一文件）。CHANGELOG 只有 T4 写；若 T1–T3 被砍，根代理在合入前删对应行。
4. 依赖声明属于「补声明」而不是「加功能」：同一模块已在 bundle 中，`measure-first-screen` 不应变化；T4 不负责复测，根代理最终门禁若发现首屏变大，按回归追查 import 图。

---

## 2. 文件所有权与执行顺序（防冲突）

| 代理 | 文件（独占） | 顺序 |
| :--- | :--- | :--- |
| builder A | `src/App.tsx`、`src/components/ShortcutsDialog.tsx`、`.tmp/e2e-r32-undo.mjs`、`.tmp/e2e-r32-keys.mjs` | **T1 → T3**（同一文件，不能并行） |
| builder B | `src/components/StatsDetail.tsx`、`README.md`、`package.json`、`package-lock.json`、`packaging/README.txt`、`docs/CHANGELOG.md`、`.tmp/e2e-r32-stats.mjs` | **T2 → T4**（都写 README，不能并行） |
| tester | 只读产品代码；自己在 `.tmp/e2e-r32-tester*.mjs` 写独立断言 | §3 |

- 两个 builder 都不跑 `npm run build`（并发写 `dist/` 违反 R30 纪律）；唯一例外是 T3 的 `npx vite build --outDir .tmp/build-r31`（独立输出目录）。根代理最终串行跑 `npm run build` + measure。
- 两个 builder 都不改 `release/`、不 push、不 bump 版本。
- dev server 不重启；E2E 前先 `node .tmp/reset.mjs <端口>`。端口中 builder A=**9222**、builder B=**9223**、tester=**9224**；与调度提示冲突时以调度提示为准，但**同一时刻每个代理必须不同端口**。

## 3. 独立验收（tester，端口 9224，30 分钟）

不看 `impl.md`，自己跑：

1. **门禁**：`npx tsc --noEmit`；`npm test`（应为 21 文件 272 条）；`node scripts/measure-first-screen.mjs --dir dist`（用根代理最终 build 的 `dist`；若 `dist` 比 `src` 旧，改跑 `npx vite build --outDir .tmp/build-r31-tester` 再 measure）→ PASS ≤286,000。
2. **T1 独立复验**：不只跑 builder 的脚本，自己写 `.tmp/e2e-r32-tester-undo.mjs`（可裁剪 finder 脚本），至少覆盖：删除当前文档→撤销→输入→保存后 `甲.md` 字节不变；改名非当前文档后树高亮与 `__slState.name` 一致、被改名文件字节不变；`console error 0`。
3. **T2 独立复验**：自己打开面板，断言 `.stats-detail dl:first-of-type dt` 七项依次为 `中日韩字 / 拉丁词 / 合计 / 字符 / 句 / 段 / 阅读`、第二段 `<dl>` 是「选区」、共 8 个 `dt`，`中日韩字 / 拉丁词 / 合计` 按 9 / 1 / 10 计算（`中日韩字 ≠ 合计`）、焦点在面板、Esc 回触发按钮；README:51 的文案与实现一致（含「中日韩字」这个词）。
4. **T3 独立复验**：按 T3 验收 3 的 **3a–3d 顺序**复跑（Tab → 源码有 `  - 项目二` 且无行尾双空格 → 回编辑断言仍为 1 → 点第二项 → Shift+Tab → 0），**顺序不许颠倒**（P1-1：先 Shift+Tab 再查源码必假红）；点链接出浮层且两个输入框值正确；表格 Tab 仍跳格；空文档开头 Tab 到 `.skip-link`。链接若已被砍单，改为核对 `README.md:35` 与当前真实行为一致（§5 的登记行存在）。
5. **键盘全量回归**（放在最后跑：该脚本结尾会 `browser.close()`，断掉 CDP 连接）：
   ```powershell
   $env:SIDELIGHT_CDP='http://127.0.0.1:9224'
   node scripts/keyboard-acceptance.mjs http://localhost:5175
   git checkout -- shots/round-05/    # 该脚本会覆盖 3 张已跟踪的历史截图
   ```
   49 条应全 PASS；有 FAIL 先分辨是不是脚本选择器过期（AGENTS §8），再判产品。
6. **UI 证据**：核对 §7 的截图存在且内容对（面板七行、嵌套列表、撤销后标题/树一致；链接浮层那张只在链接未被砍单时核对）。
7. **写 `test.md`**：逐条给「命令 + 原始输出 + 截图路径」；结论三选一：PASS / PASS-WITH-UNVERIFIED / FAIL。UNVERIFIED 按 §6 预写口径，不许扩写成「通过」。
8. **门禁命令（汇总）**：
   ```powershell
   npx tsc --noEmit
   npm test
   node scripts/measure-first-screen.mjs --dir dist
   git diff --stat
   git status --short release/ dist/ package.json
   ```

## 4. 证据与门禁汇总（本轮总表）

| 门 | 命令 | 通过线 |
| :--- | :--- | :--- |
| 类型 | `npx tsc --noEmit` | 退出码 0 |
| 测试 | `npm test` | 21 文件 **272** 条全 pass（T4 后；T1–T3 期间 18/260） |
| 首屏 | `node scripts/measure-first-screen.mjs --dir .tmp/build-r31` | **PASS，gzip ≤286,000 B**；报告相对 284,529 B 的差值 |
| 往返 | `npm run roundtrip` | 退出码 0；`docs/roundtrip-report.md` 无 diff（否则还原） |
| T1 e2e | `node .tmp/e2e-r32-undo.mjs 9222` | S1–S4 全 PASS（S4 被砍单时 S1–S3），控制台 0 error |
| T2 e2e | `node .tmp/e2e-r32-stats.mjs 9223` | 七行值、焦点、Esc 全 PASS |
| T3 e2e | `node .tmp/e2e-r32-keys.mjs 9222` | 链接、列表、表格、开头 Tab 全 PASS（链接被砍单时只跑列表 / 表格 / 开头 Tab，链接记 UNVERIFIED 进 §5） |
| 键盘全量 | `keyboard-acceptance.mjs`（tester，9224） | 49/49 PASS |
| 版本 | `Select-String package.json '"version"'` | `0.32.1`（不 bump） |
| 保护目录 | `git status --short release/ dist/` | 无输出（T3 的 `.tmp/build-r31` 不在保护范围） |

## 5. 本轮不做（登记到 STATE 待办池）

| 项 | 为什么不做 | 下一轮怎么接 |
| :--- | :--- | :--- |
| **Mermaid 渲染**（产品负责人点名） | 最省路径约 163 KB gzip（R29/R30 实测），首屏余量 1,471 B；且它必须作为运行时依赖进安装包：当前 setup 824,209 B，加 163 KB 按 gzip 近似就是约 987 KB，超过 85 万 B 硬线（`packaging/installer.ps1:114`）。这是「加用户看得见的能力」，按 AGENTS §1 必须先由产品负责人定，且要先有 ADR | 下一轮单独立项「Mermaid 懒加载实测 + ADR-0017」：先用真实包量 lazy chunk gzip 与安装包增量（`npx vite build` 到 `.tmp` 再量），再给两条路（内置按需 / 可选扩展下载）与体积账，**不许进首屏集合**；产品负责人点头后再实现 |
| **编辑模式「句 / 段」口径**（本代理新发现，P2） | `openStatsDetail`（`src/App.tsx:3791`）取 `editor.state.doc.textContent`；ProseMirror 拼接块不加分隔符，两段文档实测「段 1 / 句 1」（证据 `.tmp/e2e-r31-planner-stats.mjs`）。修法一行：取文改 `doc.textBetween(0, doc.content.size, '\n')`，但要动 `App.tsx`，本轮 A 的工时已满 | 下一轮与源码选区、状态栏选区 chip 一起做（三件都在 `openStatsDetail` / `onSelectionUpdate` 一处） |
| **大纲折叠**（产品负责人点名） | 第 29 轮已实现（`Outline.tsx:56`），缺的是 `docs/typora-gap.md` 的过期行（`:52` 写「无」）与总计数（应为 26 有 / 17 缺，finder-typora §3） | 文档轮一次改完 gap 表 + `README.md:79` + `STATE.md`，并与 `.md` 关联等过期文案一起 |
| 源码模式字数选区（finder-bug 第 2 条，P2） | 要读 `<textarea>` 的 `selectionStart/End` 并处理 frontmatter 偏移（`splitFrontmatter(sourceText)` 的 body 是后缀，可用 `sourceText.length - body.length` 求起点）；要动 `src/App.tsx` 的文本域接线，A 的 35 分钟已满 | 下一轮与「句 / 段」口径、状态栏选区 chip 一起做（三件都在 `openStatsDetail` / `onSelectionUpdate` 一处） |
| 状态栏选区计数 chip（Typora P1） | 准确值需要每次选区变化取选中文本 + 180 ms 防抖（`onSelectionUpdate` 已有 `setSelection`，但 `selection.chars` 是 1500 字上限的上下文长度，不是真实字数）；大文件有性能风险 | 与源码选区一起做，先加防抖再上 chip |
| 打开外部浏览器（Typora P1 的另一半） | 要宿主 `NewWindowRequested` + 白名单 `http/https/mailto` + `Process.Start`/`NSWorkspace.open`；按 `typora-features.md:167` 宿主改动要单独一轮并跑 `host-smoke` | 宿主轮；同时补 `host-mac` 分支与回归 |
| **点正文链接就地编辑**（**仅当 T3 超时砍单 ③ 生效时登记**） | 砍单表 ③（排在 `ShortcutsDialog` 与 `roundtrip` 之后）；A 只有 31 分钟。砍了以后 `README.md:35` 必须由 builder B（T4 阶段）或根代理改成当前真实行为（点链接无反应），不许留假承诺（审查 P1-2） | 照 T3 实施步骤 2 补 `openLinkRef` 赋值（`src/App.tsx:519` 声明、`:797` 调用、全仓无赋值），照 T3 验收 1 复验 |
| 自动配对括号引号（P1） | 约 70 行 + 8 条单测 + 设置开关；与智能标点叠加有先后顺序，真实 IME 测不了 | 单独一轮，先写纯函数 `autopair.ts` 与单测 |
| 表格列宽拖拽、图片落盘规则（P1，M） | 列宽必须与「表格整块复用」保真剥离同轮；图片规则会牵动改名后的相对路径 | 各自单独立项 |
| ship S1（`npm run acceptance` 红、CDP 写死） | 要改 3 处断言 + `process.exit` + 写清「怎么起带 remote-debugging-port 的浏览器」，并复跑全套 11 项；应单独一轮 | 下一轮「验收脚本与贡献者文档」：S1 + S5 + S6 剩余 |
| ship S5（NSIS 从 SourceForge 裸下、不校验哈希） | 约 10 行，但本轮 T4 已满；且要真实重打包才能验 | 下一轮与 S6 一起，用 vendored 资产 + `NSIS_SHA256` |
| ship S6 剩余（`packaging/README.md:42/57`、`src/App.tsx` 死代码 `SAMPLE`、`vite.config.ts` 旧注释） | 纯文案/死代码；`src/App.tsx` 归 A，A 已满 | 下一轮文档清理，随 gap 表一起 |
| `fixtures/markdown` 补嵌套列表示例 + 存盘字节断言（审查 P2-6 的存盘半边） | `npm run roundtrip` 只跑 7 个 fixture，里面 `^\s{2,}[-*+] ` **0 命中**；T3 的 e2e 只验源码与 DOM（重解析半边已由验收 3c 覆盖），假 FSA 存盘断言要再加一段脚本，A 只剩 4 分钟 | 下一轮加 `fixtures/markdown/nested-list.md` 让往返门覆盖，并在假工作区断言 `Ctrl+S` 后文件字节含 `  - 项目二`、不含行尾双空格 |

## 6. 预设 UNVERIFIED（验收时不得当成通过）

| 项 | 为什么测不了 | 怎么补 |
| :--- | :--- | :--- |
| 真实目录句柄上的「删除 → 撤销 → 保存」与「改名非当前文档 → 保存」 | 假 FSA 没有权限模型（`move()` 分支总被走到），T1 的 e2e 只证明接线正确 | 真实文件夹手测：删除当前文档→撤销→输入→保存；再改一个非当前文件的名字→输入→保存 |
| 打字后 2 秒内点撤销时乙的自动保存被取消 | 需要真人节奏；自动化能造但不在本轮验收 | 手测：在乙里输入后立刻撤销，确认关窗仍提示未保存 |
| 真实中文输入法下的 Tab / 链接点击 | 无可用 IME 自动化（AGENTS 未验清单已有） | 真机手测：拼写组合中按 Tab、点链接 |
| 点链接打开系统浏览器 | 本轮只做就地编辑；宿主未改 | 宿主轮实现后手测 |
| 源码模式选区计数 | 本轮不做（§5） | 下一轮 |
| 列表嵌套的**存盘字节**（`Ctrl+S` 后文件里是 `  - 项目二`） | 本轮 e2e 只断言源码文本与 DOM（重解析半边已由验收 3c 覆盖）；假工作区存盘断言要再加一段脚本，A 只剩 4 分钟（§5 已登记下一轮补 fixture） | 下一轮加 `fixtures/markdown/nested-list.md` 与假工作区存盘断言；补测前**不许**把「列表 Tab 保存正确」写进 README / CHANGELOG |
| 屏幕阅读器实录 | 只测焦点位置，没有读屏软件 | NVDA / VoiceOver 实读一次字数明细 |
| 安装包增量（T3 新代码） | 本轮不重打包（`release/` 不动） | 下一轮发版打包后对比 824,209 B |
| `npm install --package-lock-only` 在干净 machine 上的 `npm ci` | 本轮不跑 `npm ci`（会动 `node_modules`） | CI 的 `gate` job 就是 `npm ci`，合入后看 CI |

## 7. 截图清单

| 文件 | 内容 | 任务 |
| :--- | :--- | :--- |
| `shots/round-31/r31-undo-safe.png` | 删除当前文档→撤销后：树高亮、标题、正文都是乙；提示「已恢复 甲.md」 | T1 |
| `shots/round-31/r31-stats-rows.png` | 字数明细七行（中日韩字 9 / 拉丁词 1 / 合计 10），焦点在面板 | T2 |
| `shots/round-31/r31-stats-rows-dark.png`（可选） | 深色下同一面板，背景仍读主题变量 | T2 |
| `shots/round-31/r31-link-editor-fixed.png` | 点正文链接后浮层打开，文字 / 地址两框有值 | T3 |
| `shots/round-31/r31-list-tab-fixed.png` | 列表第二项 Tab 后嵌套；源码框能看到 `  - 项目二` | T3 |

## 8. 给根代理的收尾提醒

- 最终串行跑 `npm run build` + `node scripts/measure-first-screen.mjs`（首屏必须 PASS）；把实测 gzip 写进 `README.md:97`、`docs/CHANGELOG.md` 与 `test.md`（T4 只写「≤286,000，见 test.md」，不编数字）。
- `package.json` 版本保持 `0.32.1`；本轮不发版、不 push、不动 `release/`。
- 更新 `docs/iteration/STATE.md`：轮次表加第 31 轮；待办池删掉已修项，补 §5 全表（Mermaid / 源码选区 / 状态栏 chip / 主机外链 / 自动配对 / S1 / S5 / S6 / gap 表 / 嵌套列表 fixture）。**只补本轮真的没做的项**：链接被砍单时才有「点正文链接就地编辑」那一行，没砍就删掉那行。
- **T3 的链接部分无论因哪种原因砍掉（首屏超线 / 超时砍单 ③），`README.md:35` 都必须改回当前真实描述**（不能留「点正文里的链接会贴着元素弹出编辑框」这种假承诺）：README 归 builder B，B 收工后由根代理在合入前改；同时确认 §5 的「点正文链接就地编辑」行保留、`test.md` 记 UNVERIFIED，并在 `impl.md` / `test.md` 写明是哪条砍单触发的。
