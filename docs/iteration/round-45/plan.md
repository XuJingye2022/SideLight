# 第 45 轮 · 计划（planner，只读）— **revision 3（第 3 次修订）**

- **revision 3（本次）**：planner-revision 按 `plan-review.md` 第 2 次审查的 **R2-1 ～ R2-6** 六条逐条修掉；**任务集合、级别、§六 的范围与 §八 砍单顺序不变，不新增任务**；**时间不变（仍 ≈46 min）**：R2-1 走 §六 加行（0 代码、0 min），R2-5 走 UNVERIFIED 口径（0 min）。
  - **R2-1**（原 H4）→ §六 新增 **typora F6** 一行，并把 `findings-typora.md:122-131` 的 3 处改法原样抄进去（0 代码、下轮与「界面细化」同批）。
  - **R2-2**（原 H5）→ T3 的 `release/` 证据从恒空的 `git status` 换成**开工前 / 收尾各一次 SHA256**，期望值抄 `findings-ship.md:107-109`（planner 本轮已实测同值，见 §四）。
  - **R2-3**（原 H6）→ E7 换成计划自己的判据（旧文末行 **或** 新文首行），选择器换 `.note-revision .note-diff`，`434`/`458` 只作对照读数；另加一条反「箭头独行」守卫（照抄的公式单看对「独行」不设防，见 §三 E7）。
  - **R2-4** → T3 基线 `git grep -c "Icon \""` 换单引号写法，并写明「零命中时 `git grep -c` 不打印数字、exit 1」。
  - **R2-5** → `setOriginalText(raw)` 的字节效果本轮**不测**：§二 改成显式 UNVERIFIED 口径，CHANGELOG 不许写「保存字节多出尾换行」。
  - **R2-6** → §〇 时间表 T1 由 12 min 改 14 min，与 §八 一致。
- **revision 2（仍有效，H1/H2/H3 已修）**：任务集合、级别、§六 与 §八 砍单顺序未变；T1 验证 +2 min（44 → 46 min）。
  - **H1** → §二 I5 改走**恢复分支**（打开 → `Ctrl+S` → `page.reload()` → `Ctrl+/`），原「树里正常打开 `丙.md`」降为负对照 N1，并加一条只对「误把 body 当 raw」会红的断言。
  - **H2** → §三 E1（以及同口径的 E5/E6）把正文读数换成 `.doc-column` / `textarea.source-editor`，删掉必然假红的 `document.body.innerText.length`。
  - **H3** → §三 验收基线 `role="presentation"` 由错误的「改前 1 → 改后 2」改成实测「**改前 4 → 改后 5**」（`:5209`/`:5236`/`:5275`/`:5304`），命令换成 PowerShell 下不会掉双引号的 `-E` 写法。
- 轮次：`round=45`、`nn=45`；轮前 `startSha=021cbd35d0a0422e519b5c008a3d47fca1bdccbb`（`git rev-parse HEAD` 实测同值，工作树只有本轮未跟踪的 `docs/iteration/round-45/`、`shots/round-45/`）。
- 输入：本轮 5 份 `findings-*.md` **全部读完**（bug 2 条、typora 7 条、ship 5+1 条、code 4 条、ui 9 条），并对照 `docs/iteration/STATE.md`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`git log -8` 与相关源码逐条核对（`src/App.tsx`、`src/styles.css`、`src/components/MarginRail.tsx`、`src/lib/{serializeDocument,frontmatter,tableReuse}.ts`、`packaging/{installer.nsi,installer.ps1,verify-installer.ps1}`、`.tmp/e2e-r45-*.mjs`）。
- 只读：本文件之外没有改产品代码、没有跑 E2E、没有 commit、没有 push、没有碰 `release/`。
- 环境：dev server 在 `http://localhost:5175`（**不另起、不重启**；`5173` 是僵尸 server，禁用）；浏览器只用 **CDP 9222**，每段 E2E 前 `node .tmp/reset.mjs 9222`；不启动 Edge、不 kill `msedge`、不 `browser.close()`。
- **不发版**：`package.json` 的 `version`（0.32.1）不动；CHANGELOG 写进现有 `## Unreleased（第 29–44 轮，未发版）` 区间；不 push；不改 `release/`。
- 交付物：`docs/iteration/round-45/plan.md`（本文件）→ `impl.md` → `test.md`；截图 `shots/round-45/impl-*.png`（**不覆盖** finder 的 `bug-*`、`typora-*`、`ship-*`、`code-*`、`r45-ui-*`）。

## 〇、结论：本轮 3 个任务

| id | 标题 | 级别 | 类别 | 回应 | 估时 |
| :--- | :--- | :--- | :--- | :--- | ---: |
| **T1** | 刷新/重开恢复出来的文档，只切视图不再被误判成「脏」 | **P1** | 数据安全 | bug F1 | 14 min |
| **T2** | 页边批注三处可见性：窄窗遮罩不再染实色、预览/源码不再留死开关、修订卡的「→」不再独占一行 | **P1 + P2×2** | 用户可见 | ui F3（P1）、ui F4（P2）、ui F5（P2） | 11 min |
| **T3** | 安装器：升级先清 `www`、主节设只读、setup 加图标、体积数字改指针 | **P1 + P2×3** | 安装 / 体积 | ship S1（P1）、S2、S3、S5 | 12 min |

合计约 **46 min**（含 §五 收尾 4 min 与门禁串跑 5 min；revision 2 把 T1 验证 +2 min，revision 3 不变——R2-1 进 §六＝0 min、R2-5 走 UNVERIFIED＝0 min）。比 `roles/planner.md` 的 35 min 上限多约 11 min，理由与砍单顺序见 §八，**不砍判定标准**。

**为什么只排 3 个**：本轮 5 份报告合计 **27 条 actionable**（bug 2、typora 7、ship 5、code 4、ui 9），其中 **P1 有 5 条**（bug F1、typora F2、ship S1、ui F1、ui F3）。其中 **typora F7** 是 finder 自述「不作为新发现重复计数」的提醒，实际待排 **26 条**；revision 3 补上此前漏掉的 **typora F6** 之后，这 26 条**全部有归属**：§一 任务表收 8 条，其余全部在 §六「本轮不做」（含 bug F1 的用户可见副作用一条）。按 `planner.md`「超出就砍到 3 个或更少」，3 个是这个上限下的最小可用集合：T1 是唯一「动作会把用户数据写错地方」的条目；T2 把两条 P1 里成本最低、后果最像「文档丢了」的那条修掉；T3 把一条 P1 与三条 P2 一并收掉（同一个 `.nsi` 一次编译就能全验）。剩下的 **ui F1（整体评价压住批注卡，P1）** 与 **typora F2（标题 id / 锚点，P1）** 都超出单任务 35 min 预算，进 §六 并写明下轮怎么排；不是没看见。

## 一、为什么是这三条

排序按 `roles/planner.md`：数据安全 → 用户可见收益 → 安装/体积/性能 → 内部质量。

- **T1（P1，数据安全）**：用户刷新一次页面（或重开应用）后，**一个字都没改**，按一次 `Ctrl+/` 看源码，文档就变成「有未保存改动」：切到另一篇弹「切换文档」三选一，按 `Ctrl+S` 另存出 `未命名.md`。用户会以为改动已写回原文件，实际没有。根因是**恢复路径没留下「原文」**，基线按整串生成、源码兜底按 `original=null` 生成，两者只差一个尾换行（§二 证据表）。这是本轮唯一「让用户保存到错位置」的条目，排第一。
- **T2（P1 + P2×2，用户可见）**：三条都在同一个组件、同一批截图里能一次验完。最重的一条是 1024 窄窗：打开「批注」抽屉后把鼠标移到正文，整页正文被 `button:hover` 染成实色的 `--accent-wash`（截图为 3,835 B 纯色图）；预览态点开「批注」直接整屏空白——用户第一反应是文档丢了。另外两条是：预览/源码里「批注」开关还在、`aria-controls` 指向不存在的节点；修订卡的「→」被 `flex-wrap` 挤到单独一行，读不出「旧文 → 新文」。
- **T3（P1 + P2×3，安装 / 体积）**：升级一次安装包就多留 3.85 MB 旧 hashed chunk（`$INSTDIR\www` 从不清）；主节没有 `SectionIn RO`，用户在组件页取消它 → 安装器报成功、装出空目录。这两条是「公开发布、Windows 首发」的硬伤且各 1–3 行；setup 缺图标与 README 体积数字停在 39/36 轮同批收掉。**全部改动可在 `.tmp` 里编译 + 安装验证，不写 `release/`**（`installer.ps1 -AssocDryRun` 的输出就是 `.tmp\assoc-dryrun-setup.exe`）。

**为什么本轮不做 ui F1 / F2（页边栏遮挡）**：这条不是「改一行 CSS」能收的。卡片是 `position: absolute`（`src/styles.css:953-963`），纵向位置只按正文坐标算（`src/App.tsx:1946-1958`），页边栏自身的流内内容（`.rail-head`、`.rail-notice-mock`、`.rail-overall`）完全没参与计算；`.rail-overall` 又是 `position: sticky; bottom: 0`（`src/styles.css:802-811`），但它的流内位置就在提示下面（卡片是绝对定位不占位），所以 sticky 不生效、面板停在栏中间当不透明挡板。实测三张卡从 200 px 排到 722 px（高 498 px + 间隔）、面板 93 px，而 700 px 高的页边栏在「头 + 提示」之后只剩约 490 px——**「给卡片加 padding-bottom 等量回避」会把卡片挤到互相重叠**。可选修法两条（面板改成真 footer / 面板移进栏顶流 + 卡片 floor 取实测流底），前者要改 `MarginRail` 结构、后者会动「整体评价」在界面上的位置（产品语义），都需要 1440/1024/深色三档 + 抽屉四组截图，20–30 min，单独一轮才做得干净。先给一条不肯定的修法（例如只加 `pointer-events: none`）会把「点不到」变成「点到了但看不见文字」，比现在更误导。

## 二、任务 T1（P1，数据安全）：恢复文档不再被误判成脏

### 为什么

刷新/重开是高频路径。恢复出来的文档在 `dirty=false` 状态下**只按一次 `Ctrl+/`** 就变脏，于是：① 点另一篇弹「切换文档」（取消 / 不保存 / 保存并切换），三选一本身就是数据风险；② 用户按 `Ctrl+S` 得到一篇新的 `未命名.md`（`.tmp/r45-d.log` 的 `## d4-save-after-view`），以为原文件已保存。本轮修的是「误判脏」这个根，不是「保存落点」。

### 现状证据（planner 已逐条对过代码）

| 层 | 位置 | 现状 |
| :--- | :--- | :--- |
| 恢复状态 | `src/App.tsx:458-487` | `useState` 初始化只从 `sidelight.doc.v1` 拆出 `frontmatter` / `footnotes` / `text`（= body）并交给 `setMarkdown`；**整串原文没有留下来** |
| 保存基线 | `src/App.tsx:1029-1035` | `baselineRef = serializeDocument(..., original: initial.text).replace(/\r\n/g,'\n')`；`initial.text` 是 body 但**带尾换行**，`applyTrailingNewlines` 按它补 `\n`（`src/lib/serializeDocument.ts:32-38`） |
| 原文 ref | `src/App.tsx:628`、`:636-644` | `rawTextRef` 与 `originalText` 在首次恢复时都是 `null`；只有 `loadIntoEditor`（`:2048-2049`）、`applyHostPayload`（`:1073-1074`）、保存成功（`:2608-2609`）、草稿恢复（`:3442-3444`）会写 |
| 源码兜底 | `src/App.tsx:3913-3922` | `rawTextRef === null` → 走 `currentMarkdown()` → `serializeBodyNow()`（`:2796-2804`），`original = rawTextRef ?? originalText = null` → `applyTrailingNewlines` 早退 → **少一个尾换行** |
| 脏判定 | `src/App.tsx:1885-1892` | 源码框值 `!== baselineRef.current` 就置脏；两者只差那一个 `\n` |
| 实测 | `.tmp/r45-d.log` `## d3-dirty-impact` / `## d2-restored` | 恢复后 `dirty:false`；`Ctrl+/` 后 `srcOn.dirty:true`；回编辑仍 `true`；点 `乙.md` → `dialog:"切换文档"` |
| 对照（负结果） | `.tmp/r45-b.log` `## b1-view-toggle-dirty`、`.tmp/r45-f.log` `## f1-blank-source` | 正常打开的文档、首启空白文档进出源码都**不脏**——缺陷只在恢复分支，修的时候不要动其它两条路径 |

### 改动文件与函数（1 个文件，3 处）

1. **`src/App.tsx:458-487`**（`useState` 初始化器）：把整串原文一起带出来。
   - fallback（`:459-466`）加 `raw: ''`；
   - 返回对象（`:475-483`）加 `raw: text`（`text` 是拆之前的整串，含 frontmatter 与脚注定义）。
2. **`src/App.tsx:1029-1035`**（首次载入 effect）：让恢复态与 `loadIntoEditor` 同口径。
   ```ts
   setMarkdown(initial.text)
   // 恢复出来的文档也要有「原文」：否则 baseline 用整串生成（带尾换行），而源码模式
   // 兜底的 serializeBodyNow() 拿不到 original，只差一个尾换行就被判成脏（第 45 轮 F1）
   const raw = initial.raw.length > 0 ? initial.raw : null
   setOriginalText(raw)
   rawTextRef.current = raw
   // 保存基线取「序列化后的正文」而不是原始文本：撤销回初始内容时必须刚好等于基线
   baselineRef.current = serializeDocument(editor, {
     frontmatter: initial.frontmatter,
     footnotes: initial.footnotes,
     original: raw,
   }).replace(/\r\n/g, '\n')
   ```
   effect 依赖数组（`:1044`）加 `initial.raw`（`initial` 本身是稳定 state，加它只为口径完整）。
3. **不动**：`switchView`（`:3908-3939`）与源码脏判定 effect（`:1885-1892`）的判据保持「按字节比基线」；不要为这条缺陷放宽归一化（会掩盖真实的尾换行差异）。

### 实施步骤

1. 写 `.tmp/e2e-r45-impl-t1.mjs`：骨架直接抄 `.tmp/e2e-r45-bug-d.mjs`（`installFakeWorkspace(page, seed)` + `connectOverCDP('http://127.0.0.1:9222')` + `openFolder()`，等等）；**把 `const OUT = 'docs/iteration/round-45'` 改成 `'shots/round-45'`，截图名一律 `impl-t1-*`**（原脚本会往报告目录写 `d-*.png`）。
   - `seed`：`甲.md: '# 甲\n\n甲的第一段文字。第二处文字。\n'`、`乙.md: '# 乙\n\n乙的正文在这里。\n'`、`丙.md: '---\ntitle: 丙\n---\n\n# 丙\n\n丙的正文。\n'`，另加一篇 `丁.md` 不带 frontmatter 用于正对照。
   - **改前先跑一次**，存 `.tmp/impl-r45-t1.before.log`。预期红：`d2-restored` 后 `Ctrl+/` 的 `dirty:true`、回编辑仍 `true`、点 `乙.md` 的 `switchDialog.dialog === '切换文档'`，以及 I5 恢复段的第 1/2/3 条（`dirty` 仍 `true`、源码框 ≠ `localStorage` 文本、源码框缺尾换行）。**I5 的「前 3 行」与 N1 负对照在改前就应绿**——它们是误用守卫，不是红转绿的证据。
2. 按上面 3 处改 `src/App.tsx`。
3. `npx tsc --noEmit`；重跑 e2e；截图。
4. `npm run roundtrip`（T1 改的是载入链的 `original` 传递，必须复跑）：rich 5/7、source 7/7。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r45-impl-t1.mjs            # I1–I6 全 PASS，末尾 errors:[]（I5 里的 N1 是负对照：改前改后都应绿，不计入 PASS/FAIL）
npx tsc --noEmit                          # exit 0
npm run roundtrip                         # rich 5/7、source 7/7
# —— 改前基线（先贴，AGENTS §8）
git grep -n "raw: text" -- src/App.tsx    # 改前 0 → 改后 1
git grep -n "original: initial.text" -- src/App.tsx   # 改前 1 → 改后 0
```

e2e 断言（全部在真应用里读 `window.__slState`，`:713-715`）：

1. **I1**：种 `甲.md` → 打开 → 段末打 `丁` → `Ctrl+S`（盘上含 `丁`）→ `page.reload()` 等 1.8 s → `dirty === false`、`name === '甲.md'`；同一时刻 `localStorage['sidelight.doc.v1']` 的 `text` 与源码框值**逐字节相同**（都带尾换行）。改前源码框少一个 `\n`。
2. **I2（本条缺陷的主断言）**：`Ctrl+/` 进源码 → `dirty === false`（改前 `true`）；再 `Ctrl+/` 回编辑 → `dirty === false`。来回各停 900–1000 ms，不要连按。
3. **I3（用户可见后果）**：恢复态下点「文件 ▾ → 打开文件夹…」，点 `乙.md` → **不出现** `[role="dialog"]`（`switchDialog.dialog === null`），`name === '乙.md'`，正文是「乙的正文在这里。」。改前这里弹「切换文档」。**改前跑基线时脚本要在录下这条红之后点「不保存」把状态清干净**（`d3` 里按钮是 `取消/不保存/保存并切换`；甲.md 在 I1 已存盘，丢弃的只是「误判脏」），否则后面 I5 打开 `丙.md` 会再撞一次对话框、拿不到「改前」的 I5 读数；改后没有对话框就跳过这一下。
4. **I4（正对照，防「一律不脏」）**：编辑视图打一个 `Z` → `dirty === true`；`Ctrl+Z` → `dirty === false`（回到基线）。
5. **I5（frontmatter 不丢·必须走恢复分支）**：这是 §二「风险与坑」第二条（误把 body 当 raw）的**唯一守卫**。从文件树正常打开走的是 `loadIntoEditor`（`src/App.tsx:2048-2049`），那条路改前就写 `setOriginalText(text)` / `rawTextRef.current = text`，所以「树里打开 `丙.md` → `Ctrl+/`」改前改后都绿，**测不到本次改动**（第 45 轮 plan-review H1）。顺序：
   1. 点 `.file-tree [role="treeitem"][data-path$="/丙.md"]` 打开（等 1200 ms；树没展开就先 `openFolder()`）。
   2. **N1 负对照（改前改后都应绿，不计入 PASS/FAIL）**：`Ctrl+/` → 读 `textarea.source-editor` 的 `value`，前 3 行应为 `---` / `title: 丙` / `---` → `Ctrl+/` 回编辑。写清这一条**不区分改前改后**：它只证明「正常打开的带 frontmatter 文档」本来就没问题。
   3. `Ctrl+S` → 等 1600 ms：`readFakeFile(page, '丙.md') === SEED_丙`（`SEED_丙 = '---\ntitle: 丙\n---\n\n# 丙\n\n丙的正文。\n'`）、无 `[role="dialog"]`（保存前对比不该弹，`src/lib/risk.ts:376-378` 对无脚注定义文档早退）。
   4. `page.reload({ waitUntil: 'domcontentloaded' })` → 等 1800 ms → `waitForSelector('.doc-column .ProseMirror')`。
   5. `Ctrl+/`（等 900 ms）后断言，四条全要过：
      - `window.__slState.dirty === false`（改前 `true`：恢复态源码兜底 `serializeBodyNow()` 拿不到 `original`，少一个尾换行）；
      - 源码框值 **=== `JSON.parse(localStorage.getItem('sidelight.doc.v1')).text`**（逐字节；两边都**以 `---\ntitle: 丙` 开头**。改前源码框同时少 frontmatter 后那个空行与尾换行，必红）；
      - 源码框**以 `---\ntitle: 丙` 开头**且 `value.endsWith('丙的正文。\n')`（改前缺尾换行，红）；
      - **前 3 行恰为 `---` / `title: 丙` / `---`**（`value.split('\n').slice(0, 3)`）。这条只对「把 `initial.text`（body）当 `raw`」会红：误用时源码框第一行是空行、第二行是 `# 丙`，`---` 三行整体消失；正常恢复与修好之后都绿，**它是误用守卫，不是改前红**。
   6. `Ctrl+/` 回编辑 → `h1` 文本仍是 `丙`、`dirty === false`、无 `[role="dialog"]`；第 3 步读到的盘上字节仍是种子（`page.reload()` 会把假盘复位成种子，所以**盘上字节必须在 reload 前读**，见 §七）。

   改前预期：第 5 步四条里前三条红（`dirty:true`、与 localStorage 不等、缺尾换行），第四条绿；N1 绿。截图 `impl-t1-frontmatter-kept.png`。
6. **I6**：控制台 `errors: []`（排除 `/__doc` 404 与 favicon，浏览器态已知）。

### 风险与坑

- **中低**。空白首启文档完全不受影响：`initial.raw === ''` 时 `raw` 传 `null`，与今天一模一样（`.tmp/r45-f.log` 的 `## f1-blank-source` 仍必须 `dirty:false`，I1 之外顺带复测）。
- **不要用 `rawTextRef = initial.text`（body）**：源码视图会丢 frontmatter（`switchView` 在 `rawTextRef !== null` 时直接显示它，不再拼 frontmatter，`:3915-3920`），退出源码时 `applySource`（`src/App.tsx:3874-3879`）把 `frontmatter` 置空，再保存就把 YAML 元数据写没——这是比原缺陷更大的数据损失。必须用整串 `raw`。**注意：I1–I4、I6 都抓不到这个误用**（它们用的是无 frontmatter 的 `甲.md`/`乙.md`/`丁.md`，改前也能绿）；唯一会红的是 I5 第 5 步的「源码框 ≠ localStorage」与「前 3 行」两条断言——写实现时不要把这两条当成「反正会绿」的装饰。
- `setOriginalText(raw)` 会打开自动保存的 `originalText !== null` 分支（`:3179`），但下一条 `:3180-3181` 仍要求文件句柄或可写宿主，恢复态两者都没有 → 不会多写盘；实施时在 impl.md 记一条实测（停笔 2 s 后 `localStorage` 写入次数不增加）。
- **恢复态没有句柄时 `Ctrl+S` 仍会走「另存 / 在工作区根建 `未命名.md`」**：这是无句柄的固有限制（第 28 轮的既定行为），不在本轮范围（见 §六），**不要拿它判 FAIL**。本轮只保证「不再误判脏、不再弹切换框」。
- **`setOriginalText(raw)` 的字节效果本轮不测（UNVERIFIED，R2-5）**：这一行只影响保存链（`prepareSave` 按 `originalText` 补尾换行，`src/App.tsx:2817-2822`；自动保存门 `:3179`；`activeLosses` 门 `:3184`），而 I1–I6 读的三样东西（`__slState.dirty`、源码框值、`localStorage.text`）都不经过这个 state——源码框走 `rawTextRef`（`:3915-3920`）、基线由 `original: raw` 直接给、localStorage 由 `loadIntoEditor`/`finishSaved` 写（`:2106`/`:2639`）。所以删掉这一行 I1–I6 照样全绿。处理办法（**按第一条做，0 min**）：
  1. `impl.md` 必须写一行「`setOriginalText` 只与 `loadIntoEditor` 同口径；恢复态无句柄，保存字节路径本轮 UNVERIFIED，无断言覆盖」；CHANGELOG **不要**写「保存字节多出尾换行」这类承诺（见 §五 收尾 1）。
  2. 若执行时有余量再补一拍：恢复态正文末尾打 1 个字符 → `Ctrl+S` → 读刚落盘的新文件字节，断言 `endsWith('\n')`（有 `setOriginalText` 时带尾换行、删掉则不带，这是真正的红/绿分界）。落点是无句柄的固有路径（见上一条），所以**只断言字节尾，不要断言文件名/位置**。
  3. 若 `draft-acceptance` / `save-acceptance` 对尾换行有假设，先看输出再判（它们是旧脚本，可能过期）。
- `initial` 是 `useState` 的稳定对象；**不要**把 `raw` 改成 `useRef` 或每次渲染重算——恢复只该发生一次。

### 需要的截图

- `shots/round-45/impl-t1-source-after-restore.png`：刷新恢复后进源码，`dirty` 不出现、状态栏没有「未保存」提示。
- `shots/round-45/impl-t1-no-switch-dialog.png`：恢复态直接点 `乙.md` 切过去，无确认框。
- `shots/round-45/impl-t1-frontmatter-kept.png`：I5 恢复后源码框顶部（`---` / `title: 丙` / `---` / 空行），用来目检 frontmatter 与空行都还在。

## 三、任务 T2（P1 + P2×2，用户可见）：页边批注三处可见性

### 为什么

三条都出自 finder-ui 的同一批截图，改动集中在 `App.tsx` 的三处 + `styles.css` 的两条规则，互不牵连：

1. **ui F3（P1）**：窄窗（≤1119px）打开「批注」抽屉后，指针必然停在铺满全屏的遮罩上，而遮罩是 `<button>`，`button:hover:not(:disabled)`（`src/styles.css:137-140`，特异度 0,2,1）压过 `.rail-backdrop` 的 `background: rgba(18,20,22,0.32)`（`:2504-2512`，0,1,0）→ 整页正文被染成 `--accent-wash` 实色。编辑态「一悬停整页消失」，**预览态点开直接整屏空白**（`shots/round-45/r45-ui-21/31/32` 三张都是 3,835 B 纯色图）。
2. **ui F4（P2）**：预览 / 源码视图里页边栏根本不渲染（`src/App.tsx:5039-5095` 的编辑分支才有 `.doc-layout` + `MarginRail`），但顶栏「批注」开关无条件渲染（`:4639-4651`）且带 `aria-controls="margin-rail"`；1024 预览里点它 → `app.rail-open` + 遮罩出现、面板不存在 → 配合 F3 变成整屏空白。
3. **ui F5（P2）**：修订卡的 `.note-diff` 是 `display: flex; flex-wrap: wrap`（`src/styles.css:1032-1041`），`.diff-arrow` 是独立 flex 子项 → x 回到卡片左缘独占一行（实测 arrow `[1015,434,13,20]`，旧文 `[1015,390,…]`，新文 `[1015,458,…]`），浅色/深色/抽屉三种截图都一样。

### 现状证据

| 项 | 位置 | 现状 |
| :--- | :--- | :--- |
| 遮罩元素 | `src/App.tsx:5194-5195` | `<button type="button" className="rail-backdrop" aria-label="关闭批注" onClick={closeRail} />` |
| hover 压过 | `src/styles.css:137-140` vs `:2504-2512` | `button:hover` 背景 `--accent-wash`；实测悬停背景 `rgb(232,240,237)`，非 `rgba(18,20,22,0.32)` |
| 开关无条件渲染 | `src/App.tsx:4639-4651` | 不看 `viewMode`；`aria-controls="margin-rail"` 指向不存在的节点（实测 `controlsTargetExists:false`） |
| 遮罩条件 | `src/App.tsx:5194` | 只看 `railOpen`，不看视图 |
| 抽屉换视图 | `src/App.tsx:745-747`、`:3579-3581` | 只有 `openRail` / Esc 会改 `railOpen`，切视图不关 |
| diff 布局 | `src/styles.css:1032-1051` | `.note-diff` flex-wrap + `.diff-arrow` 独立子项 |

### 改动文件与函数（2 个文件，4 处）

1. **`src/App.tsx:5194-5195`**：遮罩从 `button` 换成 `div`（去掉 `button:hover` 的命中面，同时把这个全屏可聚焦元素从 Tab 序列里拿掉）：
   ```tsx
   {railOpen && viewMode === 'edit' && (
     <div className="rail-backdrop" role="presentation" onClick={closeRail} />
   )}
   ```
   键盘出口不变：抽屉里的 `关闭批注`（`MarginRail.tsx:74-78` 的 `onClose`）与 Esc（`src/App.tsx:3579-3581`）。
2. **`src/App.tsx:4639-4651`**：开关只在编辑视图渲染（预览/源码没有页边栏，就没有这个入口）：
   ```tsx
   {viewMode === 'edit' && (
     <button ref={railToggleRef} … className="rail-toggle" …>批注…</button>
   )}
   ```
   不要写成 `disabled`：禁用的按钮仍带 `aria-controls="margin-rail"`，指向的节点仍不存在（F4 的下半条）。
3. **`src/App.tsx` 新增一个 effect**（放在视图相关 effect 附近，例如 `:1901-1910` 之后）：
   ```tsx
   // 预览 / 源码不渲染页边栏：切过去时把抽屉状态收掉，避免只有遮罩没有内容（第 45 轮 ui F4）
   useEffect(() => {
     if (viewMode === 'edit') return
     setRailOpen(false)
   }, [viewMode])
   ```
4. **`src/styles.css:1032-1041`**：`.note-diff` 改回正常文本流，箭头跟着新文一起换行：
   ```css
   .note-diff {
     display: block;            /* 原来是 flex + wrap：箭头会被挤成独立一行（第 45 轮 ui F5） */
     margin: 6px 0 4px;
     font-family: var(--font-read);
     font-size: 12.5px;
     line-height: 1.6;
   }
   ```
   并在 `.diff-arrow`（`:1049-1051`）补 `margin: 0 4px;`。**保留**箭头字符（屏幕阅读器仍读得出「旧 → 新」），不要 `display:none`。

### 实施步骤

1. 复制 `.tmp/e2e-r45-ui-6.mjs` → `.tmp/e2e-r45-impl-t2a.mjs`：**端口 9226 改 9222**、两条截图路径改 `shots/round-45/impl-t2-*`，其余读数段（`BACKDROP_HOVER_EDIT` / `BACKDROP_REST_EDIT` / `CSS_SOURCE`）保留；**在 `ui-6` 的 `Esc`（第 23 行）之后、点 `.rail-toggle`（第 24 行）之前插入 `docLenBefore` 读数**，并在 `BACKDROP_HOVER_EDIT` 里补 `docLenAfter = document.querySelector('.doc-column').innerText.length`（E1 的两拍读数见下）。**改前先跑**存 `.tmp/impl-r45-t2a.before.log`：预期 `bg:"rgb(232, 240, 237)"`、`at:"BUTTON.rail-backdrop"`。
2. 复制 `.tmp/e2e-r45-ui-5.mjs` → `.tmp/e2e-r45-impl-t2b.mjs`（端口 9226→9222、截图路径改 `impl-t2-*`），按 E5 重排：编辑态开抽屉 → **`Ctrl+Shift+P`** 切预览（遮罩盖着工具栏，不要点「预览」按钮）→ 取四项断言 → **改前若预览里还能找到 `.rail-toggle` 才按 Esc 后点它取 `AFTER_TOGGLE` 对照；改后它是 `null` 就跳过点击**（否则 `page.locator('.rail-toggle').click()` 8 s 超时，改后验收会假红）。改前预期：`app` 含 `rail-open`、`.rail-toggle` 存在、`elementFromPoint(512,350)` 命中 `BUTTON.rail-backdrop`、截图 3,835 B 纯色。
3. diff 几何读数：抄 `.tmp/e2e-r45-ui-7.mjs` 的 `DIFF` 段（`note-diff` / `diff-old` / `diff-arrow` / `diff-new` 四个 `getBoundingClientRect`，**选择器基座换成 `.note-revision .note-diff`**，见 `ui-7.mjs:21`）写成 `.tmp/e2e-r45-impl-t2c.mjs`（端口 9222），断言见 E7 的两条（主判据 + 反独行守卫），**不要只写 `Math.abs(arrow.top - new.top) <= 1`**。
4. 改上面 4 处；`npx tsc --noEmit`；重跑两个脚本 + diff 段；截图（1440 浅色、1440 深色、1024 抽屉）。

### 验收标准（可执行）

```bash
node .tmp/reset.mjs 9222
node .tmp/e2e-r45-impl-t2a.mjs        # E1–E4 PASS
node .tmp/reset.mjs 9222              # 每个脚本各 reset 一次：t2a 的页面会留下 localStorage 文档
node .tmp/e2e-r45-impl-t2b.mjs        # E5–E6 PASS
node .tmp/reset.mjs 9222
node .tmp/e2e-r45-impl-t2c.mjs        # E7（diff 几何）PASS
npx tsc --noEmit
# —— 改前基线（先贴，AGENTS §8）
git grep -cE 'role=.presentation.' -- src/App.tsx        # 改前 4（:5209/:5236/:5275/:5304）→ 改后 5（新增遮罩）
git grep -c 'rail-backdrop' -- src/App.tsx               # 改前 1（:5195）→ 改后 1（同一个元素，配 E1 的 DIV 命中）
git grep -c "viewMode === 'edit' && (" -- src/App.tsx    # 改前 0 → 改后 ≥1（开关的条件渲染）
```

> **H3 注**：不要写 `git grep -c 'role="presentation"'`。本会话 shell（Windows PowerShell 5.1）调原生命令时会吃掉参数里的双引号，git 实际收到 `role=presentation` → **恒 0 命中**（本轮实测 exit 1），改前基线会凭空消失。`-E` + `.` 的写法实测 4，是唯一正向对照；改后应为 5。

1. **E1**：1024×700、编辑视图、先用 `.analyze-button` 造出 ≥1 张批注卡（沿用 ui-6 的开头）。**注意窄窗分析成功后抽屉会自己打开**（`src/App.tsx:1550-1556` 的 `openRail()`）：先按 `Esc` 关掉（`ui-6` 第 23 行就是这么做的，别拿「再点一次 `.rail-toggle`」当开抽屉——那一下会把它关掉）。读数分两拍：
   - **开抽屉前**（Esc 之后）：`docLenBefore = document.querySelector('.doc-column')?.innerText.length`（取不到就是 FAIL，**不要**退化成 `body`）。
   - 点 `.rail-toggle` → `page.mouse.move(300, 350)` → 停 400 ms 后断言：
     - `getComputedStyle(document.querySelector('.rail-backdrop')).backgroundColor === 'rgba(18, 20, 22, 0.32)'`（**不是** `rgb(232, 240, 237)`）；
     - `document.elementFromPoint(300,350)` 的 `tagName === 'DIV'` 且 `className` 含 `rail-backdrop`；
     - `document.querySelector('.doc-column').innerText.length === docLenBefore`（正文长度不变：正文只是被半透明遮罩盖住，仍在渲染）；
     - `getComputedStyle(document.querySelector('.doc-column .ProseMirror')).visibility !== 'hidden'`；
     - `.app` 含 `rail-open`，`.margin-rail` 计算 `display === 'block'`；
     - 截图 `impl-t2-drawer-hover-1024.png` 左侧正文肉眼可辨。
   - **不要用 `document.body.innerText.length`**：≤1119px 时 `.margin-rail` 是 `display:none`（`src/styles.css:2476-2478`），开抽屉后变 `display:block; position:fixed`（`:2514-2527`），卡片与「整体评价」的文字全部进 `body.innerText`，长度**一定变大**——修好之后也会判红；而且 `body.innerText` 数的是整页（顶栏 5 个按钮、工具栏、状态栏），不是正文（第 45 轮 plan-review H2）。
2. **E2**：抽屉关闭（点遮罩）→ `.rail-backdrop` 不再在 DOM、`app` 不含 `rail-open`、焦点回到 `.rail-toggle`（`closeRail` 的既有行为）。
3. **E3**：1440 编辑视图里 `.rail-toggle` 仍存在（`display:none`，宽窗不显示）——防止把宽窗行为改坏。
4. **E4（深色）**：`data-theme=dark` 下重复 E1 的遮罩三项（计算背景 / `elementFromPoint` 命中 `DIV` / `.doc-column` 长度相等），遮罩背景仍是 `rgba(18, 20, 22, 0.32)`（`button:hover` 的 `--accent-wash` 在深色下是另一种颜色，这一条锁住「与主题无关」）。
5. **E5（预览态不再有死开关）**：1024×700、编辑视图（下面的第 1 步先造批注卡）：
   1. `.analyze-button` 出 ≥1 张卡（窄窗分析成功后抽屉**会自己开**，`:1550-1556`）→ 按 `Esc` 关掉 → 点 `.rail-toggle` 开抽屉（`app` 含 `rail-open`、`.rail-backdrop` 在 DOM）→ 按 **`Ctrl+Shift+P`** 切预览（不要点「预览」按钮：遮罩 z-index 44 盖着工具栏）。
   2. 停 800 ms 后断言：`document.querySelector('.rail-toggle') === null`、`aria-controls` 不再存在、`document.querySelector('.rail-backdrop') === null`、`document.querySelector('.app').className` 不含 `rail-open`；正文还在——`const c = document.querySelector('.doc-column')` 非空、`c.innerText.length >= 40` 且含 ui-5 种子首句 `写作往往不是一次成型的`，`.preview-pane` 存在（种子全文只 ~64 字，阈值别写 100，会假红）；`shots/round-45/impl-t2-preview-1024.png` **不是纯色图**（记录字节数，远大于 3,835 B）。
   3. **改前对照**：同一步改前会留下 `app.rail-open` + `.rail-toggle`（`display` 非 `none`）+ 遮罩，`elementFromPoint(512,350)` 命中 `BUTTON.rail-backdrop`，截图 3,835 B 纯色。脚本写成两种状态都能跑：**改前 `if (.rail-toggle 还在) { Esc 关遮罩 → 点它 → 取 AFTER_TOGGLE 对照 }`**；改后 `.rail-toggle` 是 `null`，整段跳过。
6. **E6（源码态）**：同 E5 的第 1 步，把 `Ctrl+Shift+P` 换成 `Ctrl+/`。断言同样四项；正文口径换成源码框：`document.querySelector('textarea.source-editor').value` 含 `# 第一章` 且 `length >= 40`（源码视图没有 `.doc-column`；ui-5 的种子全文只 ~64 字，阈值别写 100）。改前：`app` 含 `rail-open`、`.rail-toggle` 仍在（1024 下 `display:inline-flex`）——只有遮罩没有面板，正是 F4 的下半条。
7. **E7（diff 箭头）**：`Ctrl+Enter`（`src/App.tsx:764` 的 `Mod-Enter`）或 `.analyze-button` 都可以，**写清用哪一条**；分析一段带逗号的中文 → **用 `.note-revision .note-diff` 定位**（卡片类名是 `note note-${kind}`，`MarginRail.tsx:110` + `:125`；`.tmp/e2e-r45-ui-7.mjs:21` 就是这么写的），**不要**用「第 2 张卡」。取 `diff` / `diff-old` / `diff-arrow` / `diff-new` 四个 `getBoundingClientRect`，断言：
   - `.note-diff` 计算 `display === 'block'`；
   - **主判据（照 `plan-review.md` R2-3 原文）**：`Math.abs(arrow.top - old.bottom) <= 21 || Math.abs(arrow.top - new.top) <= 1`（箭头落在**旧文末行**，或与**新文首行**同行——二者其一即可）；
   - **反「箭头独行」守卫**：`arrow.top < old.bottom - 1 || Math.abs(arrow.top - new.top) <= 1`。两条**同时**成立才算 PASS：主判据的 `|arrow.top - old.bottom| <= 21` 单独看对「箭头独占一行」也会通过（独行时 `arrow.top ≈ old.bottom`，差值 ≈0），必须配这条守卫，才等价于本计划 `§三 风险与坑` 写的「只要不同时出现箭头独行就合格」。
   改前读数只作**对照**，不要写成期望值：`arrow [1015,434,13,20]` / `old [1015,390,…]` / `new [1015,458,…]`（`display:flex` 时三段各自一行）；改后落点会随 mock 文案换行位置变（`findings-ui.md:109` 旧文 40 px 两行）。抽屉（1024）里用同一组断言重复一次。改前这一条必红（`display` 是 `flex`）。

### 风险与坑

- **低**。全是元素类型/渲染条件/display 的改动，不碰保存链、不碰 Tiptap。
- 遮罩改 `div` 后只剩两条关闭路径（抽屉关闭按钮 + Esc），这两条都在：`MarginRail.tsx:74-78`、`App.tsx:3579-3581`。**不要**给遮罩加 `aria-label`（`role="presentation"` 与可访问名互斥，读屏会读出无意义控件）；不要加 `tabIndex`。
- `closeRail` 里有 `railToggleRef.current?.focus()`（`:740-743`）：非编辑视图下开关不渲染，此时 focus 落空是预期（此时也没有抽屉可关）。
- 量「正文还在」统一用 `.doc-column` 的 `innerText.length`（编辑态与预览态都有这个节点）；源码态没有 `.doc-column`，改用 `textarea.source-editor` 的 `value`。**不要**用 `document.body.innerText`（见 E1 的说明）。
- `.note-diff` 从 flex 改 block 后，`.diff-old` 的删除线、`.diff-new` 的底色都是 inline 生效，**不要动 JSX**（`MarginRail.tsx:124-129`）。若箭头换行到新行开头，它后面紧跟新文——只要不同时出现「箭头独行」就合格（E7 的两条断言就是这条判据的可执行形式，R2-3）。
- 截图命名一律 `impl-t2-*`；**不要覆盖** `shots/round-45/r45-ui-*` 与 `bug-*`（finder 证据）。
- 点 `disabled` 按钮会让 `page.click()` 30 s 超时（第 42/43 轮实测）：本轮断言只读属性与 DOM，不用 click 打禁用控件。
- toast 活 6 s：分析后的读数要在 6 s 内取，或先等旧 toast 消失。

### 需要的截图

- `shots/round-45/impl-t2-drawer-hover-1024.png`：抽屉 + 左侧正文可见（半透明遮罩）。
- `shots/round-45/impl-t2-preview-1024.png`：预览态 1024，没有「批注」开关、正文完整。
- `shots/round-45/impl-t2-diff-inline.png`：修订卡里「旧文 → 新文」在同一行流里。

## 四、任务 T3（P1 + P2×3，安装 / 体积）：安装器四条

### 为什么

- **ship S1（P1）**：`packaging/installer.nsi:130-131` 直接 `SetOutPath "$INSTDIR\www"` + `File /r "..\dist\*"`，**没有先清目录**。每次升级都把上一版的整份 `www` 留在原地：实测手工放一个旧 hashed chunk 后重装同版本，`exit=0` 且 `staleChunkStillThere=True`，`www` 从 97 文件/3,848,009 B 变 98 文件/3,853,011 B——真实升级每升一次 +3.85 MB，与本产品「体积小巧」的验收维度直接冲突，且只在安装态累积（卸载会清）。
- **ship S2（P2，但后果重）**：`packaging/installer.nsi:94` 的 `Section "Sidelight" SEC_MAIN` 没有 `SectionIn RO`（`grep SectionIn` 全文 0 命中）。NSIS 默认允许取消勾选非只读节 → 用户在组件页取消唯一必装节，安装器照常报成功，磁盘上什么都没有。UI 复现本轮做不了（向导点击不可脚本化），但静态结构 + NSIS 语义足够定论。
- **ship S3（P2）**：`setup.exe` 全文 0 条 `Icon` / `MUI_ICON`，向导标题栏与任务栏是通用 NSIS 图标（`shots/round-45/ship-10-setup-wizard.png`）。图标文件现成（`packaging/sidelight.ico`，23,724 B），宿主构建早就用 `csc /win32icon:packaging\sidelight.ico`。
- **ship S5（P2）**：`README.md:114` 的安装包字节停在**第 39 轮**（`1,300,711` / `1,622,355`，本轮实测 `1,303,397` / `1,625,899`）；`README.md:116` 的主 chunk 停在**第 36 轮**（898,601 B，本轮 `909.93 kB`）；`packaging/README.md:57` 重复了同一组过时数字。

### 改动文件与函数

1. **`packaging/installer.nsi`**（注释必须 ASCII：makensis 拒收无 BOM 的非 ASCII 注释，见文件头 `:2-3`）：
   - 第 22 行 `!endif` 之后、页面宏（`:42`）之前加：
     ```
     ; Installer + uninstaller icon: same .ico the host exe embeds (host\build.ps1 /win32icon).
     ; Paths are resolved from this script's directory, like "..\packaging\sidelight.ico" below.
     !define MUI_ICON "..\packaging\sidelight.ico"
     !define MUI_UNICON "..\packaging\sidelight.ico"
     Icon "..\packaging\sidelight.ico"
     ```
   - `:94` `Section "Sidelight" SEC_MAIN` 的下一行加 `  SectionIn RO`（组件页里这一项灰选、不可取消）。
   - `:130` `SetOutPath "$INSTDIR\www"` **之前**（`:129` `File "..\LICENSE"` 之后）加：
     ```
       ; Upgrades: drop the previous web bundle first, or old hashed chunks pile up (+3.85 MB/upgrade).
       RMDir /r "$INSTDIR\www"
     ```
2. **`README.md:114`**：把「第 36 轮接入 Mermaid 后本机 `installer.ps1 -AssocDryRun` 实测 **1,299,777 B**；第 39 轮真实打包实测 setup **1,300,711 B**、便携 zip **1,622,355 B**（`release/` 已按 SHA256 还原，未发版）」换成不写死字节的说法：「安装包与便携 zip 的具体字节每版都变，**以 Release 页的 `SHA256SUMS-<版本>.txt` 为准**（本机预算内部 45,000,000 B / 硬线 50,000,000 B；第 45 轮 finder 用同样脚本实测 setup **1,303,397 B**、便携 zip **1,625,899 B**，`release/` 已按 SHA256 还原，未发版）」。同段把首屏「当前 292,681 B（第 44 轮…）」补一句第 45 轮增量和本轮实测值（用 `npm run verify` 的输出，见 §五）。
3. **`README.md:116`**：`（主 chunk 898,601 B，2026-11-17 第 36 轮实测）` → `（主 chunk 以最近一次 `npm run build` 输出为准：第 45 轮 909,935 B raw，第 36 轮 898,601 B）`——保留「构建时以命令输出为准」的口径，不再让一个字节数冒充长期事实。
4. **`packaging/README.md:57`**：同段两个旧字节换成同样的「以 Release 页与脚本实测为准」口径（与 README 同步，避免两处漂移）。
5. **不动**：`release/`（一个字节都不写）、`packaging/verify-installer.ps1`（S4 本轮不做，见 §六）、`package.json` 版本。

### 实施步骤

1. **开工前基线**（先贴，AGENTS §8）：
   - grep 基线：`git grep -c "SectionIn" -- packaging/installer.nsi` = 0；`git grep -c "MUI_ICON" -- packaging/installer.nsi` = 0；`git grep -nF 'RMDir /r "$INSTDIR\www"' -- packaging/installer.nsi` = 0；`git grep -c 'Icon "' -- packaging/installer.nsi` = 0。
   - **`release/` 的哈希基线（R2-2）**：`release/` 被 `.gitignore:10` 整个忽略（`git check-ignore -v release/SHA256SUMS.txt` → `.gitignore:10:release/`、`git ls-files release/` 无输出），所以 `git status --porcelain release/` / `git diff -- release/` **改前改后都为空**，不能当「没碰 release/」的证据；而且不带 `-AssocDryRun` 误跑 `installer.ps1` 会直接覆盖 `release\Sidelight-0.32.1-win-x64-setup.exe`（`installer.nsi:20-22` 的 `OUTFILE` 默认值），三条 git 命令全绿也发现不了。开工前跑一次：
     ```powershell
     Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
     ```
     期望值（本轮 finder 按字节还原的实测值，`findings-ship.md:107-109`；planner 本轮 `Get-FileHash` 复跑同值）：
     `6C93F58FDAF470D1DA36D35D73E3CFE921324CEB133E757301395020004826B2`（setup，824,595 B）、
     `F4210C620D2DD2D6F0A5EF064234823863383C4518DBAECE5BCA21AAE4CBD5DD`（portable，910,360 B）、
     `2F32C26A8F165E9A8E9B4A52D51750B901F0BD536ECD376A71103EAC86CC9651`（SHA256SUMS，207 B）。
     三条连同文件字节数抄进 `impl.md` 的「开工前」段，收尾再跑同一条命令断言**逐字节相同**（§五 收尾自查）。
   - **零命中的读法（R2-4）**：`git grep -c` 零命中时**不打印数字**、exit 1；上文 `# 0` 指的是「没有输出」，不是命令坏了。含双引号的模式一律用**单引号**：`git grep -c 'Icon "'`。写成 `git grep -c "Icon \""` 在本会话 PowerShell 5.1 下**整条命令不执行**（实测 ParserError「字符串缺少终止符」、exit 1），基线永远拿不到。
2. 按上面 1 改 `packaging/installer.nsi`（三处，注释保持 ASCII）。
3. 编译（**只写 `.tmp`**）：`powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun`。
   - 预检：`host\bin\` 五件与 `dist\index.html` 都在（finder 本轮已构建：`host\bin` 4,889,772 B、`dist` 97 文件）。**不要重跑 `host\build.ps1`**（会长时间占用、且本轮不重打包 release）。
   - 预期输出：`fileVersion=0.32.1.0`、`assoc-dryrun=<bytes> B`，exit 0；产物 `.tmp\assoc-dryrun-setup.exe`；**`release/` 三份文件哈希与开工前一致**（`Get-FileHash`，见验收标准；`git status --porcelain release/` 空只作附加证据）。
4. S1 的安装级验证：复制 `.tmp/e2e-r45-install.ps1` → `.tmp/e2e-r45-impl-install.ps1`，只改两处：
   - `$setup = Join-Path $root '.tmp\assoc-dryrun-setup.exe'`
   - `$dir = Join-Path $root '.tmp\impl-install'`
   跑它（`powershell -NoProfile -ExecutionPolicy Bypass -File .tmp\e2e-r45-impl-install.ps1`）。期望：`fresh-install missing=`（10 件载荷齐全）、`www` 文件数与字节**等于当时的 `dist`**（脚本自己算，不写死）、放旧 chunk 后重装 `staleChunkStillThere=False`、`www` 回到与 `dist` 同量、`uninstall dirLeft=False`。改前对照用本轮 finder 的 `== e2e-r45-install.ps1` 输出（`staleChunkStillThere=True`）。
5. S3 的图标验证：写 `.tmp/e2e-r45-impl-icon.ps1`（**用 Windows PowerShell 5.1**：`powershell -NoProfile -ExecutionPolicy Bypass -File …`），提取三个 exe 的 32×32 图标并算 PNG 哈希：
   ```powershell
   # Runs from the repo root's .tmp; only reads release/ (never writes it).
   $root = Split-Path -Parent $PSScriptRoot
   Add-Type -AssemblyName System.Drawing
   function IconSha([string]$path) {
     $ico = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
     if ($null -eq $ico) { return 'NULL' }
     $bmp = $ico.ToBitmap(); $ms = New-Object System.IO.MemoryStream
     $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
     $sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($ms.ToArray())
     return ($sha | ForEach-Object { $_.ToString('x2') }) -join ''
   }
   'old='  + (IconSha (Join-Path $root 'release\Sidelight-0.32.1-win-x64-setup.exe'))
   'new='  + (IconSha (Join-Path $root '.tmp\assoc-dryrun-setup.exe'))
   'host=' + (IconSha (Join-Path $root 'host\bin\Sidelight.exe'))
   ```
   断言：`new != old`（换掉了通用图标）且 `new == host`（就是我们自己的 `.ico`）。**只读 `release/` 里的旧包，不修改它。** 若 `System.Drawing` 提取失败，记 UNVERIFIED 并说明原因，**不要伪造**。
6. S2 的验证：静态验收（`SectionIn RO` 0→1、`Section /o ` 仍为 1、`MUI_PAGE_COMPONENTS` 仍为 1——后两条同时是 `verify-installer.ps1:203-214` 的静态断言，别改坏它）+ 在 impl.md 抄 NSIS 语义结论；**向导里「取消勾选 → 装出空目录」本轮 UNVERIFIED**（不可脚本化，补法见 §六）。
7. 改 README（`:114`、`:116`）与 `packaging/README.md:57`，数字用本轮 `npm run verify` / 编译输出实测值。

### 验收标准（可执行）

```bash
# —— 改前基线（先贴；`git grep -c` 零命中 = 无输出 + exit 1，`# 0` 指没有输出）
git grep -c "SectionIn" -- packaging/installer.nsi                       # 0
git grep -c "MUI_ICON" -- packaging/installer.nsi                         # 0
git grep -c 'Icon "' -- packaging/installer.nsi                          # 0（**必须单引号**；`^Icon "` 同口径；`File`/`DisplayIcon` 都不命中）
git grep -nF 'RMDir /r "$INSTDIR\www"' -- packaging/installer.nsi        # 0
# —— 改后
git grep -c "SectionIn" -- packaging/installer.nsi                       # 1
git grep -c "MUI_ICON" -- packaging/installer.nsi                        # 1
git grep -c "MUI_UNICON" -- packaging/installer.nsi                      # 1
git grep -c '^Icon "' -- packaging/installer.nsi                         # 1
git grep -nF 'RMDir /r "$INSTDIR\www"' -- packaging/installer.nsi        # 1

powershell -ExecutionPolicy Bypass -File packaging\installer.ps1 -AssocDryRun   # exit 0；fileVersion=0.32.1.0
powershell -NoProfile -ExecutionPolicy Bypass -File .tmp\e2e-r45-impl-install.ps1   # S1 断言全过
powershell -NoProfile -ExecutionPolicy Bypass -File .tmp\e2e-r45-impl-icon.ps1      # new!=old, new==host
# —— 收尾：release/ 的证据（R2-2）
Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
#   三条必须与开工前逐字节相同：6C93F58F…B2 / F4210C62…5DD / 2F32C26A…651
git status --porcelain release/                                          # 空（**附加证据**：release/ 被 .gitignore:10 忽略，改前改后恒空，不能单独证明没写）
git diff --stat -- package.json                                          # 空（release/ 不进 git diff，别拿它当证据）
```

> **两条红线**：① `git grep -c` **零命中 = 无输出 + exit 1**，`# 0` 指「没有输出」，不是命令坏了；含 `"` 的模式必须用单引号（`'Icon "'`），`"Icon \""` 在 PowerShell 下整条不执行（R2-4 实测 ParserError、exit 1）。② 「没碰 `release/`」的**唯一**有效证据是开工前/收尾两组 SHA256 相等（R2-2）。

### 风险与坑

- **低–中**。三条 NSIS 改动都是「声明性」的；唯一会失败的是路径解析：NSIS 的相对路径按**脚本所在目录**解析（同文件 `:127` 就写着 `..\packaging\sidelight.ico`、`:131` 写着 `..\dist\*`），所以图标也写 `..\packaging\sidelight.ico`。**不要**写 `packaging\sidelight.ico`（会解析成 `packaging\packaging\…`）。
- 注释必须 ASCII：`; Upgrades: drop the previous web bundle first...` 这类；中文注释会让 makensis 无 BOM 时报错（installer.nsi 头两行已注明）。
- `RMDir /r "$INSTDIR\www"` 只清安装目录里的前端产物，不碰 `.sidelight/`（在工作区目录，不在 `$INSTDIR`）、不碰 `%LOCALAPPDATA%\Sidelight` 用户数据。放在 `do_copy:` 分支内（`:120` 之后），别放到节外。
- 编译产物只能落 `.tmp`：**不要**跑不带 `-AssocDryRun` 的 `installer.ps1`（会写 `release/`；`installer.nsi:20-22` 的 `OUTFILE` 默认就是 `release\Sidelight-0.32.1-win-x64-setup.exe`），也不要 `portable.ps1`。真跑错时只有开工前哈希能当场发现（`git status` 看不见被忽略的 `release/`）。
- `host\bin` / `dist` 可能被别的角色重建：**开工前**确认 `dist\index.html` 与 `host\bin\Sidelight.exe` 存在；若正在有人构建，先等或改用现有产物，不要并发 `npm run build`（STATE 决策 2026-11-15）。
- 安装探针会调用 `Get-Process Sidelight | Stop-Process` 与 `/S /D=` 静默安装：只装到 `.tmp\impl-install`，不碰默认安装路径、不写 HKLM。
- S3 的哈希相等是「提取出的 32×32 位图相同」；若 NSIS 与 csc 存的图标尺寸档不同导致不等，**记 UNVERIFIED 并保留三项哈希**，不要改断言凑绿。
- S5 是文档改动：本轮**重打的只有 `.tmp` 的 dry-run 包**，所以 README 里的安装包字节要用「第 45 轮 finder 的实测（同名脚本、同一 `dist` 载荷）」这一口径写清来源，或干脆只写「以 Release 页为准」；两种写法都必须让下一轮不会拿到过时数字。

### 需要的证据（无 UI 截图）

- 编译日志（`fileVersion=0.32.1.0`、`assoc-dryrun=… B`）。
- 安装探针完整输出（fresh / upgrade / uninstall 三段）。
- 图标三行哈希（`old` / `new` / `host`）。
- **`release/` 的两组 SHA256**（开工前 + 收尾，六条逐字节相等；R2-2）——这是「没碰 `release/`」的唯一有效证据。
- `git status --porcelain release/` 空输出**只作附加证据**（`release/` 被 `.gitignore:10` 忽略，改前改后恒空）。

## 五、统一门禁、收尾与谁改什么

**每个任务各自跑**该任务列的门禁；全部做完后**串行**跑一次：

```bash
npx tsc --noEmit
npm test                        # 基线 29 文件 380 条；本轮不加单测，条数应保持 380
npm run verify                  # build + 首屏 gzip 门（内部 310,000 / 硬线 320,000；轮前 292,681 B）
npm run roundtrip               # rich 5/7、source 7/7（T1 动了载入链）
```

`npm run verify` 会重写 `dist/`：若发现别的角色正在构建（并发写 `dist/` 会互相清空，见 STATE 决策 2026-11-15），只跑 `npx tsc --noEmit` 与 `npm test`，把 `verify` 留给根代理串行跑，并在 impl.md 记 UNVERIFIED。

**收尾文档（执行代理做，tester 提交前复核）**：

1. `docs/CHANGELOG.md`：在 `**第 44 轮（同一未发版区间）**` 块（`:162` 起）之后加 `**第 45 轮（同一未发版区间）**`，写三条：恢复态不再误判脏（含「恢复后只切源码 `dirty` 恒 `false`、不弹切换框」）、页边批注三处可见性（窄窗遮罩不再变色 / 预览源码不再留死开关 / 修订卡箭头回行内）、安装器升级先清 `www` + 主节只读 + setup 图标；附本轮 `npm test` 与首屏 gzip 实测数字。**不要**写「保存字节多出尾换行」这类承诺——`setOriginalText` 的字节效果本轮没有断言覆盖（见 §二「风险与坑」里 `setOriginalText(raw)` 那一整条，R2-5）。
2. `README.md`：`:114`（T3 的 S5 数字口径 + 第 45 轮首屏增量）、`:116`（主 chunk 实测）；恢复态那条只在 `:37`（重开恢复）末尾加一句「恢复出来的文档只切视图不算改动，不会再问『切换文档』（第 45 轮）」，不扩写。
3. `packaging/README.md:57`：与 `README.md:114` 同步数字口径。
4. `AGENTS.md:74`：只改首屏 gzip 与「距硬线余」两个数字（本轮 `npm run verify` 实测），测试条数仍是 380（若实际不同按实测改）。
5. `docs/iteration/round-45/impl.md`：每个任务的文件:行号、命令与原始输出、截图路径、与计划的偏差、UNVERIFIED。
6. **不改** `docs/iteration/STATE.md`（根代理轮末统一更）、不改 `package.json` 版本、不动 `release/`、不 push。

**收尾自查（先贴改前 >0，AGENTS §8）**：

```bash
# release/ 的证据（R2-2）：两组哈希逐条相等——比「git status 恒空」有效
Get-FileHash release\Sidelight-0.32.1-win-x64-setup.exe, release\Sidelight-0.32.1-win-x64-portable.zip, release\SHA256SUMS.txt -Algorithm SHA256
git diff --stat -- package.json                 # 空（release/ 不进 git diff）
git status --porcelain release/                 # 空——**附加证据**：release/ 被 .gitignore:10 忽略，改前改后都空
git grep -nE "1,300,711|1,622,355" -- README.md packaging/README.md   # 改前 2 处 → 改后 0（BRE 下 `\|` 是字面竖线，必须 -E）
```

## 六、本轮不做（有证据、有原因、写清下轮怎么排）

| 条目 | 来源 | 级别 | 为什么本轮不做 | 下轮怎么排 |
| :--- | :--- | :--- | :--- | :--- |
| **「整体评价」面板压住批注卡 + 模拟提示被盖住**（卡片按钮真实点不到、`blockedCount:3`） | ui F1 / F2 | P1 / P2 | 卡片 `position:absolute` 的 top 只按正文坐标算，栏内流内容不参与；面板 `sticky bottom:0` 实际停在栏中间。三张卡从 200 px 排到 722 px（498 px 高）+ 面板 93 px > 可用约 490 px，「只加 padding」会挤到卡片互相重叠。要选「面板改真 footer」或「面板移进栏顶流 + floor 取实测流底」，会改变「整体评价」在界面上的位置（产品语义），并需 1440/1024/深色/抽屉四组截图 | **下轮第一项**：先写 30 行探针量 `.rail-overall` 高度、卡片区可用高与 `.note::before` 连线几何，再定 A/B；A 方案要在 `MarginRail` 里把卡片区包成可滚容器（`flex:1`）+ 面板 `flex-shrink:0`；验收用「卡 0 三个按钮 `elementFromPoint` 全部命中按钮自身」+ 1440/1024/深色截图 |
| **标题没有 id、文档内锚点与导出 HTML 锚点全断** | typora F2 | P1 | 需要新模块（slug 纯函数 + 重名去重 + 中文）、预览注入、导出注入、预览点击拦截 + 3–5 条单测，30 min 起；本轮 3 个任务已满 | 下轮第二项：`src/lib/headingIds.ts`（纯函数 + 8 条单测：中文/重名/纯标点/行内标记）→ `PreviewPane` 用 `DOMParser` 注入 id → `buildHtmlDocument` 同函数 → 预览里拦 `a[href^="#"]` 滚 `scrollIntoView`；`[toc]` 留后 |
| **`Ctrl+K` 预填只带选区前 N-1～N-2 字**（2→1、3→1、5→4） | bug F2 | P2 | finder 明确写了「根因未定，下一轮先 dump 逐次按键的 `editor.state.selection` 与 `window.getSelection()`」；盲改可能把整段选区弄坏 | 先写只读探针 dump 「`Home` + `Shift+→` ×1..5」每一步两个选区读数，再决定是 `focus()` 后再读还是用 DOM 选区文本兜底；修完加 `keyboard-acceptance` 之外的预填断言 |
| **`verify-installer.ps1` 受限环境第一步硬失败** + `ci.yml` 里取件与 SHA256 校验搬进 `release.yml` + 重打真包刷新 `SHA256SUMS.txt` | ship S4 + 第 44 轮待办池②的剩余部分 | P2 | 整跑 `verify-installer.ps1` 在本沙箱必然被 WebView2（`0x8000FFFF`）与管道捕获挡住，FAIL 混环境，验收不清；真包重打会写 `release/`，本轮明确不动 | 并入「发布专项」一轮：先改 marker 为「`%LOCALAPPDATA%` 写不进 → `.tmp` + `Unverified`」（8 行），再整跑并逐条标注环境 FAIL；同轮把取件校验搬进 `release.yml`，最后隔离根重打真包、刷新 `SHA256SUMS` |
| **正文栏宽写死 36rem=576 px**（1440/1920 都不变，每行约 33 字） | typora F1 | P2 | 要动 `src/styles.css:262-268` 与 `:2384` 的 `doc-layout` 两处 + 可选设置项；与 ui F1 的页边栏布局同属「版式」批，错开做免得两轮都在改同一片 CSS | 与上表第一项同批：`--doc-width` 变量 + `@media (min-width:1400px/1800px)` 两档，先量 1024/760 无横向溢出与 `.margin-rail` 不被挤 |
| **Mermaid 图不跟主题**（切深色不重渲、同会话新图仍浅色、`system` 恒浅色） | typora F3 | P2 | 要改 `themeName()` 三态 + `configure()` 去掉一次性守卫 + 三份缓存按 `${theme}:${hash}` 分键 + 重渲时机，约 60 行，且深色观感本轮没截过基准 | 独立一轮：先只做「`themeName` 三态 + 缓存清空 + 已挂 widget 重渲」，验收用 `shapeFills`/`labelColors` 前后对比 + 三张截图；注意别叠加两个 `<svg>` |
| **图片没有 alt/title 编辑入口**、**无句柄时相对图 404 破图不给占位** | typora F4 / F5 | P2 | F4 要复用 `InlinePopover` + 序列化 `![alt](src "title")` 的字节保真；F5 要把 null 拆成 `noHandle` / `notFound` 两态，并先确认宿主文档本来就显示不了相对图 | 小批两轮：F5 先做（20 行 + 2 条单测），F4 后做（浮层 + 只在用户填了 title 时写，字节不变） |
| **两份 Typora 文档 3 处过期**（`typora-gap.md` 2 处、`typora-features.md` 1 处） | typora F6 | P2（文档） | **0 代码、几分钟**，但本轮 3 个任务已满（≈46 min），且 T3 的文档批只动 `README.md` / `packaging/README.md`，不混进来；这条正是「planner 照旧文档排任务」的根因条目（`findings-typora.md:20`、`:122-131`） | **下轮与「界面细化」同批（0 代码）**，三处改法原样照抄 `findings-typora.md:131`：① `docs/iteration/typora-features.md` 顶部加一行「现状以 `docs/typora-gap.md` 为准（2026-11-17 复核）；本文 §3/§5/§6 的『Sidelight 现状』列是 11-16 的快照」；② `docs/typora-gap.md` 补**两行**——「正文栏宽随视口三档（1440/1920 相同，36rem=576px）＝typora F1」「预览与 HTML 导出的标题 id 缺失＝typora F2」；③ 把「预览面板与 HTML 导出不含图」从 `typora-gap.md:34` 的「已经有」备注里**搬进「缺的」表**（mermaid 那条）。顺手同一次编辑：`typora-gap.md:35` 的大纲折叠行补一句「在标题前改一个字，折叠会全部静默展开（第 44 轮实测，未修）」。**不要只写「更新两份文档」** |
| **死代码 5 处 + `hostDocRef` 空转 effect + 开 `noUnusedLocals`** | code F2 | P2 | 内部质量，排在用户可见之后；但它最便宜（`tsc` 已精确列出 5 条 TS6133） | 与下面 code F3 同批：先删 5 处 + `hostDocRef` 与它的 effect（−20 行），再开 `tsconfig` 两个选项，`npx tsc --noEmit --noUnusedLocals --noUnusedParameters` 应 0 条 |
| **一次停笔 = 2 次全文序列化 + 4 次全文落盘**（147 KB → 590,967 B） | code F1 | P2 | 要动保存链旁边的写盘，必须配 `roundtrip` + `fidelity-acceptance`（后者会覆写 `shots/round-10/`）；8 min 只能做半套 | 下一批：`finishSaved` 去掉一次 `persistDocKey`（`src/App.tsx:2638-2642`）+ 同键不重复删（`:2653`），再用 finder 的 `.tmp/e2e-r45-code-writes.mjs` 复测 `lsWrites` 应为 1 |
| **两条载入路径重复 17 条状态复位、已漂移 5 项** | code F3 | P2 | 抽 `resetDocScopedState` 要逐项标注差异（`setAnnotations`/`setOriginalText` 不能合并），与 code F2 同批更稳 | 与 code F2 同轮：只搬完全相同的 13 条 + 补 `abort`/`analysisGoal`/`unresolved`/`notice` 四条漏项 |
| **`taskListInput.ts` 0 条单测** | code F4 | P2 | 第 44 轮新增的纯逻辑，抽函数 + 8 条测试约 10 min | 下次做代码质量批时一起：把 5 段判定抽成纯函数返回 `{ convert, checked }` |
| **批注卡不可聚焦 / 全站无 `:active` / 快速打开空态文案 / 侧栏寡行** | ui F6–F9 | P2 | 四条独立的 a11y 与小文案，需要 Tab 序列逐一复测；本轮 UI 预算给了三条可见性 | 下一批「界面细化」：卡加 `tabIndex={0}` + `role="group"`、全局 `button:active` 按下态、`QuickOpen` 空态分「没有文件源 / 查询无结果」、侧栏文案缩短或 `text-wrap: pretty` |
| **恢复态没有句柄时 `Ctrl+S` 落到 `未命名.md`** | bug F1（副作用） | P2 | 无句柄是固有限制（第 28 轮既定行为：有工作区且无句柄时 Ctrl+S 在根目录建 `未命名.md`），改它要先定产品语义（保住原名另存 vs 新建） | 先问产品负责人；技术上一条是「恢复态 docName 不是 `未命名.md` 时不走 `saveIntoWorkspace`」。本轮只保证不再误判脏 |

## 七、环境与脚本注意（本轮会重复踩）

- dev server 只在 `http://localhost:5175`：不另起、不重启；`5173` 是僵尸 server，禁用。
- 浏览器只用 CDP **9222**：不启动 Edge、不 kill `msedge`、不 `browser.close()`；每段 E2E 前 `node .tmp/reset.mjs 9222`（reset 后剩 `about:blank`，`connectOverCDP` 直接 attach）。
- 自写脚本放 `.tmp/e2e-r45-impl-*.mjs`，结尾 `page.close()` 后 `process.exit(0)`；写中文脚本用 `write`/`edit` 工具，**不要**用 PowerShell `Get-Content -Raw | -replace | Set-Content`（AGENTS §8 会把中文读成 ANSI）。
- 复用 finder 脚本时必须改三处：CDP 端口（`-5`/`-6` 是 9226 → 9222）、截图输出路径（`shots/round-45/impl-*`）、`OUT` 目录（`e2e-r45-bug-d.mjs` 的 `OUT` 指向报告目录）。
- 假工作区引导抄 `.tmp/r30-fsa.mjs` 的 `installFakeWorkspace` / `readFakeFile`；`page.reload()` 会重跑 init script（把种子文件复位），**不要把「重载后盘上文件」当断言依据**，只读 `localStorage` 与 `window.__slState`。例外是 I5：盘上字节要在 reload **之前**读（`readFakeFile(page,'丙.md')`），reload 后再读只会读到 init script 复位后的种子。
- `localStorage['sidelight.doc.v1']` 是 `{ text, name, savedAt }` 的 JSON：读原文用 `JSON.parse(localStorage.getItem('sidelight.doc.v1')).text`，不要拿整个 JSON 串比。
- 量「正文还在」用 `.doc-column`（编辑/预览都有这个节点）或 `textarea.source-editor`（源码），**不要用 `document.body.innerText`**：窄窗抽屉打开后卡片与「整体评价」的文字都会进 `body`（第 45 轮 plan-review H2）。
- 看到红先分辨脚本是否过期：`page.click()` 点 `disabled` 会 30 s 超时；toast 只活 6 s；窄窗（≤1119px）编辑态 `.margin-rail` 在 DOM 里仍有 1 个但计算样式是 `display:none`，**不要用 `querySelector` 判它「不存在」**（只能判 `display`）。
- `npm run build` 不要在实施期间并发跑（并发写 `dist/` 会互相清空）；T3 编译所需的 `dist`/`host\bin` 用现有产物即可。
- 不覆盖 finder 证据：`shots/round-45/{bug,typora,ship,code,r45-ui}-*` 只读；新截图一律 `impl-*`。
- `keyboard-acceptance.mjs` 若跑，会覆写 `shots/round-05/` 3 张已跟踪截图，跑完 `git checkout -- shots/round-05/`（本轮不要求跑它）。

## 八、时间预算（诚实口径）与砍单顺序

| 任务 | 实现 | 自测 / E2E | 小计 |
| :--- | ---: | ---: | ---: |
| T1 | 4 min | 10 min（脚本 5 + I5 恢复段 2 + 跑 1 + `roundtrip` 2） | **14 min** |
| T2 | 4 min | 7 min（两个脚本改端口/路径 + 三段读数） | 11 min |
| T3 | 5 min（`nsi` 3 处 + 3 份文档） | 7 min（编译 2 + 安装探针 2 + 图标 1 + 基线 grep 2） | 12 min |
| 收尾（CHANGELOG / README / `packaging/README.md` / AGENTS / impl.md） | — | — | 4 min |
| 门禁串跑（tsc / test / verify / roundtrip） | — | — | 5 min |
| **合计** | | | **≈ 46 min（revision 2 比原计划 +2 min：I5 的 `Ctrl+S` + `reload` 恢复段；revision 3 不变）** |

**为什么超 35 min**：本轮 5 条 P1 里做到了 3 条（T1/T2 各一条、T3 一条），已经压到 3 个任务的下限；再砍就只能砍掉 P1。**不砍判定标准**。revision 2 把 T1 的验证从 8 min 加到 10 min（I5 改成 `打开的丙.md → Ctrl+S → reload → Ctrl+/` 的恢复序列，多一次 1.8 s 等待 + 一条截图），合计 ≈46 min；**revision 3 不改时间**：R2-1 走 §六（0 代码、0 min）、R2-5 走 UNVERIFIED 口径（0 min）、R2-2/R2-4 只改命令与声明（各 +0 min）、R2-3 只是换断言写法、R2-6 是表格数字对齐；`plan-review.md` §五已认定「3 个任务、形式上没违规」，并建议执行时按下面的顺序先砍广度。若实际超时，按下面顺序砍（先砍验证的广度，不砍主断言）：

1. T2 的 E4（深色遮罩复核）与 E6（源码态）→ 只留编辑态与预览态两条，其余记 UNVERIFIED（深色 `--accent-wash` 与浅色不同值，理论上更不容易出现实色，但没截就不写「已验证」）。
2. T3 的 S3 图标哈希对比 → 只保留「`MUI_ICON`/`Icon` 已加 + 编译通过」，图标观感记 UNVERIFIED（补法：真机双击 `setup.exe` 看向导标题栏）。
3. T1 的 I5（frontmatter）**不能砍**：它是「误把 body 当 raw」的唯一守卫（第 45 轮 plan-review H1），I1–I4/I6 抓不到。最多只跑一次、不重复截图（`impl-t1-frontmatter-kept.png` 一张足够）。
4. 最后才考虑把 T3 的 S5（README 数字）挪到下轮；**S1/S2 不砍**。
