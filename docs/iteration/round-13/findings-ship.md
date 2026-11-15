# 第 13 轮发布与预算发现（finder: r13-ship）

- 基线：`0842c3b`（第 12 轮收尾文档）。HEAD 工作树干净，`docs/iteration/round-13/` 只有 `brief.md`（未开始实施）。
- 只读侦察：未改 `src/`、`host/`、`package.json`、`packaging/`；未跑 `npm run build`。字节为本机实测（2026-11-16 03:40–04:00）。
- 一句话：**版本 0.26.0**；首屏余 866 B，估算新功能加 **485–720 B**，够但只剩 146–381 B；**`aria-current` 在大纲懒加载 chunk 里，首屏成本 0 B，上轮把它记成「预算延后」是口径错误**；安装包 815,683 B 已超内部 815,000 B 683 B，本轮预计到 **816.5–817.0 KB**，建议内部预算改 **820,000 B**，硬线 850,000 不动。

## S1 [高] 首屏 866 B 是本轮真门；重命名放懒加载 chunk、`aria-current` 不在首屏，估算总增 485–720 B

**证据**

- `node scripts/measure-first-screen.mjs`（实跑）：`index-*.js` raw 886,956 / gzip 277,570 ＋ `index-*.css` raw 31,100 / gzip 6,564 = **284,134 B / 2 个文件，PASS，余 866 B**。上限写死在 `scripts/measure-first-screen.mjs:15`（285,000），超线 `:64-67` 退出 1。
- 上轮真实增量锚点：0.24.0 282,809 → 0.25.0 284,134 = **+1,325 B**（`docs/CHANGELOG.md:7,18`）。上轮源码 +987/−149 行，其中 `TreeActions.tsx`(+170)、`trash.ts`(+190)、`FindBar.tsx`(±3) 都是按需加载，首屏只承担 `App.tsx`(+252/−38)、`FileTree.tsx`(+276/−87)、`styles.css`(+77/−16)、`workspace.ts`(+19/−5)；即 **首屏净增约 478 行 ≈ 2.7 B/行 gzip**。
- 本轮可复用的免费位置：`TreeActions` 是懒加载 chunk（`src/components/TreeActions.tsx:48-49`；`dist/assets/TreeActions-CD-Exy46.js` 2,644 B），删除确认已在里面；`Outline` 也是懒加载（`src/App.tsx:29`；`dist/assets/Outline-HxQrIdmP.js` 604 B），`src/components/Outline.tsx:26-33` 现在只有 `className`，加 `aria-current` 只增大这个 604 B chunk，**不进 `index.html`，首屏 0 B**。脚本只统计 `index.html` 引用的资源（`scripts/measure-first-screen.mjs:16-37`），实跑 `files=2` 可证。
- 侧栏页签在 `src/App.tsx:3738-3753`，现在无 `role=tablist/tab`、无 `aria-selected`；加这几条属性约 120 字符，估算 **35–60 B gzip**。
- 重命名若把「行内输入框」直接塞进 `FileTree.tsx`（首屏），代价高；改成与删除同型的对话框/菜单项放 `TreeActions`（懒加载），首屏只留 props 与回调，估算 **290–400 B**。
- 树的细节：**长名截断已做过**——`src/styles.css:458-464` 已有 `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`，本轮不必再为它留字节（建议只截图确认，不再改代码）。真正剩下的是层级缩进：`src/styles.css:444-450` 给 `.tree-dir` 加 `padding-left:10px`，而子层容器 `.tree-group`（`src/components/FileTree.tsx:252`）没有缩进，导致一级子文件与一级目录名同 x。改成 `.tree-group{padding-left:14px}` 并去掉 `.tree-dir` 的 padding，估算 **60–100 B**。展开态保持要把 `expanded`（`FileTree.tsx:62`）提到 `App` 并按工作区清空，空文件夹要在 `visibleRows`（`FileTree.tsx:32-44`）外补一行提示，估算 **100–160 B**。
- 合计估算（换算率沿用上轮 0.115×源码 + CSS 0.21×源码，见 `round-12/findings-ship.md:14-16`）：重命名 290–400 ＋ 树缩进 60–100 ＋ 展开/空文件夹 100–160 ＋ tablist 35–60 = **485–720 B**，取中 **≈600 B → 284,734 B**，余 **266 B**。上轮同法估算 1.2–2.1 KB、实测 1,325 B，误差可接受；本轮误差 ±40% 即 400–980 B，上限会破线。

**影响**：不破线时 0.26.0 可发；破线则 `measure` 退出 1（`scripts/measure-first-screen.mjs:64-67`），体积门不过不得出包升版本（`AGENTS.md:54`：安装包体积与冷启动是验收项）。`aria-current` 被误记成首屏延后项（`docs/adr/0013-file-tree-operations.md:42-44`、`STATE.md:56,78`），会白拖一轮。

**建议**：内部目标定 **≤284,800 B**（留 200 B），每完成一个任务跑一次 `node scripts/measure-first-screen.mjs`；重命名 UI 一律进 `TreeActions` 懒加载 chunk；`aria-current` 本轮直接做（0 B 首屏），`tablist` 最后做。顺序与砍法见文末「预算优先级」。

**难度**：小（守线）；中（若需削减）

## S2 [高] 安装包 815,683 B 已超内部预算 683 B；本轮预计 816.5–817.0 KB，建议内部口径改 820,000 B

**证据**

- 现包 815,683 B（`docs/CHANGELOG.md:14`）；硬线 850,000 在 `packaging/installer.ps1:91,93`（超线打印载荷占比并 `exit 1`），余量 **34,317 B**。内部预算 815,000 已被超 683 B，但 CHANGELOG 与 ADR-0013 都写「不调预算数字」（`docs/CHANGELOG.md:14`、`docs/adr/0013-file-tree-operations.md:48`）。
- 上轮实测锚点：第 12 轮 brief 记录 811,756 B（`docs/iteration/round-12/brief.md:19`），出包 815,683 B，**一轮 +3,927 B**；同轮 dist raw 从 1,413,750 → 1,427,617（+13,867 B，`round-12/findings-ship.md:29`、`docs/adr/0004-webview2-host-before-admin.md:45`），即 **安装包增量 ≈ dist raw 增量 × 0.283**。
- 本轮 dist raw 增量估算：首屏 gzip +485–720 B → raw +1.5–2.3 KB（gzip/raw≈0.31）；`TreeActions` chunk 增约 1.5–2.5 KB、`Outline` chunk 约 +0.03 KB → raw 合计 **+3.0–4.8 KB** → 安装包 **+0.85–1.36 KB → 816.5–817.0 KB**（按 0.283；若按上轮整轮 +3,927 B 的比例 0.28 同量级）。取中 817.0 KB，超内部预算 **≈1.5–2.0 KB**，距硬线仍余 **33 KB**。
- 便携 zip 897,251 B，`packaging/portable.ps1` 的 940,000 线余 42,749 B，按同一比例约 898.4 KB，安全。

**影响**：硬线不会被顶破；但「内部 815,000 + 不调数字」已自相矛盾，0.25.0 超 683 B、0.26.0 预计再超 1.5–2.0 KB，第三次写「不调」会让预算失去约束力。

**建议**：**硬线 850,000 不动**；0.26.0 内部预算改为 **820,000 B**，并加一条可执行规则：「超内部预算 ≤2,000 B 可发布，必须在 CHANGELOG 记原因；超硬线拒绝出包」。同步改三处，避免再次矛盾：`docs/CHANGELOG.md` 0.25.0/0.26.0 条目、`docs/adr/0013-file-tree-operations.md:48`、`docs/adr/0014-*.md`，以及 `README.md:69,80` 的「预计 ≤815,000」改成「内部预算 ≤820,000，硬线 850,000」。出包后由根代理回填实测字节与 SHA；不要在本轮抬硬线。

**难度**：小

## S3 [高] `move()` 的真实环境证据只有 OPFS，真实目录/宿主/OneDrive 都没验；目录没有 `move`，重命名不能走「复制 + 删源」回退

**证据**

- 唯一实测记录是 **OPFS**：`round-12/findings-ux.md:139`「OPFS 上 `h.move('新名.md')` 后…」、`:151`「没有真实盘句柄，用的是 OPFS」；`round-12/impl-a.md:44` 与 `round-12/test.md:31` 都把真实 Edge/WebView2 `move()` 列为 UNVERIFIED。`scripts/tree-acceptance.mjs:22,154-162` 用的是内存 FSA 替身（`window.__fs`，`moveEnabled` 可关），不是真盘。
- 产品里已经在真实目录上调用 `move()`：`src/lib/trash.ts:92,139-145`（`movable.move(trashDir, finalName)`，失败回退 copy→SHA-256→remove）。删除流程在 0.25.0 只有替身测试，真实盘删除同样是 UNVERIFIED。
- `FileSystemDirectoryHandle.prototype.move === undefined`、`copy` 不存在（`round-12/findings-bug.md:49,115`）→ **目录重命名不可做**，只能递归复制再造树，超出本轮。
- 重命名的语义与删除不同：`move(newName)` 同目录改名，失败**不能**静默回退成「写新文件 + 删旧文件」——那会换 inode、改 mtime、丢 ACL/ADS/OneDrive 同步身份，且非原子；删除的 copy 回退理由（保底不丢内容）在重命名上不成立。

**影响**：重命名整个功能压在一条未在真实盘验证过的 API 上；若真实目录上 `move()` 抛错或无此方法，功能 0 可用，且不能靠 copy 回退兜底。

**建议**：实施前先做一次真盘探针（10 分钟）：用 `scripts/host-smoke.mjs:199-211` 已跑通的「系统文件夹对话框 + SendKeys」拿到真实目录句柄，或直接在 Edge 里打开真实文件夹后 `evaluate`：`await h.move('b.md')`，记录成功/异常名、原位置、`h.name`、目录列表、mtime。验收至少三种：普通改名、大小写改名、目标已存在。真实环境不通就**降级为「本轮不做重命名」**，只做树细节与 `aria-current`，不要发一个只在替身上成立的功能。ADR-0014 必须写「同目录、仅文件、无 copy 回退、无目录重命名」和 UNVERIFIED 清单。

**难度**：中（探针小，决策大）

## S4 [中] 重命名当前文档会牵动草稿/批注 key、最近记录与自动保存竞态；大小写改名在 Windows 语义未定

**证据**

- 缓存键只由**文件名**生成：`src/lib/cache.ts:51-58`（去扩展名、清洗、≤40 字符），路径 `cache.ts:83-85` 为 `.sidelight/drafts/<key>.md`、`.sidelight/annotations/<key>.json`。改名后旧 key 找不到草稿与批注；三处调用点 `src/App.tsx:762,1317,1524`，删除时还有 `App.tsx:1791-1792` 清缓存。
- 刷新按 path 重绑当前文档：`App.tsx:1710-1718`（`afterByPath.get(activeFile.path)`，找不到就清空并提示「已删除」）→ 若重命名后走刷新，正在编辑的文档会被当成被删。
- 自动保存有 2 s 防抖（ADR-0008），删除已用 `deletingRef` 与取消自动保存防复活（`App.tsx:1710,1779-1800`）；重命名若不在改名前取消排队的自动保存，旧句柄可能在改名后写回旧名。
- 宿主最近记录按路径哈希（ADR-0009）；改名后旧记录失效，下次打开回 `FILE_GONE`。
- 大小写改名：`workspace.ts:79-80` 用小写判扩展名，树按 path 匹配；NTFS 大小写不敏感，「`a.md` → `A.md`」既可能成功、也可能被当成「目标已存在」而抛 `InvalidModificationError`，还可能静默无变化；`cacheKey` 会随大小写变 key。**未验证**，不能靠推断写进文档。
- 扩展名：树只收 `.md/.markdown`（`workspace.ts:62,79-80,92-95`）。改成 `.txt` 后文件从树里消失、宿主仍可能写回。必须定一条：**只允许 `.md/.markdown`，否则报错**（推荐，改动最小），或允许并给警告。

**影响**：改名后批注「消失」、草稿被遗弃、当前文档被误判删除、自动保存写回旧名——都是可见的数据问题，比体积风险更高。

**建议**：把「改名后的身份与缓存副作用」收成一个函数（本轮新增，放 `src/lib/`），在 `App` 改名成功后一次做完：更新 `activeFile`/`saveTargetRef`；迁移或明确清理 `draft`/`annotations`（建议迁移，失败给可见提示）；取消排队自动保存；刷新树并保持高亮；`recent.json` 不迁移，README 写「改名后旧最近记录会提示文件已不存在」。大小写改名单独测，规则写进 ADR-0014：若一次 `move` 被当成冲突，走「先改临时名再改目标」两段，失败则回滚并报错。

**难度**：中

## S5 [中] 文档口径：README「能/不能」、AGENTS §6、ADR-0014 骨架，并修正 ADR-0013 的旧结论

**证据**

- `README.md:33` 现在写「右键文件可删除」；`README.md:43` 写「不能移动、复制、重命名文件，也不能删目录」；`README.md:44` 安装包名 0.25.0；`README.md:69-80` 体积与 ADR 索引（`docs/adr/` 行写 0001–0013，`README.md:119`）。
- `AGENTS.md:70-72`（§6）写 0.25.0、无重命名、`aria-current`/tablist 延后；`AGENTS.md:38` 测试数 16 文件 205 条；`AGENTS.md:58` 只写语义化规则。
- `docs/adr/0013-file-tree-operations.md:10` 明确「只做删除，不做移动/复制/重命名」——本轮做重命名后必须在该行加一句「文件重命名自 0.26.0 起支持，见 ADR-0014；目录仍不支持」，否则两份 ADR 互相打脸。`:48` 的状态段也要补 0.26.0 产物。
- `packaging/README.md:57` 还是 0.22.0 的旧数字（808,897 B），0.26.0 出包后要换实测。

**影响**：对外说明与代码不一致；下一位代理会按 AGENTS 读到「不能重命名」。

**建议**（照抄即可）

- README「现在能做什么」加一条：文件树可重命名文件（右键/`F2`，同目录；非法字符、Windows 保留名、重名、非 `.md` 扩展名给可见错误；改名后当前文档身份与树同步）。「现在不能做什么」改为：不能移动/复制文件，不能重命名或删除目录；trash 无应用内恢复；改名后旧的最近记录会失效；重命名的真实盘/宿主/OneDrive 行为未验。
- README「依赖与体积」换 0.26.0 数字（首屏、安装包、SHA），ADR 索引改 **0001–0014**，`docs/` 目录行同步。
- AGENTS §6 换 0.26.0、重命名与树细节、`aria-current` 已做/`tablist` 状态、测试数、两个预算数字、UNVERIFIED 增补（真实盘 `move()`、大小写改名、OneDrive/网络盘、IME 回车、扩展名）。
- ADR-0014（新）骨架：**决定** 同目录文件重命名用 `FileSystemFileHandle.move(newName)`；仅 `.md/.markdown`；目标已存在（Windows 不区分大小写）不覆盖、报错；失败保留原文件；不做目录重命名、不跨目录移动、不提供应用内撤销、不做 copy 回退。**边界** 重命名不改变正文与未保存状态，但改变草稿/批注 key、最近记录、保存目标；大小写改名单独两段。**否决方案**：复制+删源（非原子、改 mtime/ACL）、目录递归改名（无 API）、应用内撤销（要状态机）。**未验**：真实目录、WebView2 宿主、OneDrive/占位文件/网络盘、只读/占用、超长与中文名、IME 组合态回车、大小写。**状态**：2026-11-16 接受（0.26.0），出包后回填字节与 SHA。
- 同步修 `docs/adr/0013-file-tree-operations.md:10,48`，并在 `docs/CHANGELOG.md` 0.25.0 条目旁不再重复「不调预算数字」的旧口径（见 S2）。

**难度**：小

## 版本建议

**0.26.0**（新功能：重命名 + 树细节；语义化规则 `AGENTS.md:58`，功能 +0.1.0）。

- `package.json:4` 改 `"version": "0.26.0"`；`package-lock.json` 顶层两处 version 同步（`npm install --package-lock-only` 或手改，别跑全量 install）。
- 产物名：`release/Sidelight-0.26.0-win-x64-setup.exe`；`README.md:44,80`、`packaging/README.md`、`docs/adr/0004-webview2-host-before-admin.md:45` 的载荷 2,448,069 B 需复发算回填（宿主源码未改时只变 `www/`）。
- CHANGELOG 草稿（放 `docs/CHANGELOG.md` 顶部，标题前空一行）：

```markdown
## 0.26.0 — 2026-11-16

文件树可重命名文件，树的层级缩进与展开态修正；首屏守住 ≤285,000 B。

- 重命名：文件树行菜单或 `F2` 改名，同目录、仅 `.md/.markdown`；用 `FileSystemFileHandle.move()`，失败保留原文件并给可见错误。目标已存在不覆盖。
- 名字校验：空名、`<>:"/\|?*`、控制字符、结尾空格/点、Windows 保留名（CON/PRN/AUX/NUL/COM1-9/LPT1-9）拒绝。
- 当前文档改名后身份同步：保存目标、草稿与批注 key、树高亮；取消排队的自动保存。宿主最近记录不迁移，旧记录打开会提示文件已不存在。
- 不做：目录重命名、跨目录移动、应用内撤销、复制式回退。
- 树细节：子层缩进改为 `.tree-group` 容器（修一级子文件与目录名同 x）；长文件名沿用省略号截断；切「文件/大纲」保留展开态；空文件夹显示占位行。
- 可访问性：大纲活动项加 `aria-current`（在懒加载 chunk，首屏 0 B）；侧栏 `tablist`/`tab`/`aria-selected`（若体积允许）。
- 未验：真实目录与 WebView2 宿主的 `move()`、大小写改名、OneDrive/占位文件/网络盘、只读/占用、超长与中文名、IME 组合态回车、屏幕阅读器实录。
- 体积：首屏 gzip `<实测>` B（≤285,000）；安装包 `<实测>` B（内部预算 820,000，硬线 850,000）、SHA256 `<回填>`；便携 zip `<实测>` B。
- 测试 `<实测>` 个文件 `<实测>` 条。
```

## 预算优先级

首屏余 866 B，估算本轮 485–720 B。按下面顺序做，每步跑 `node scripts/measure-first-screen.mjs`；超线只回退最后一步，不回滚整轮。

| 优先级 | 项目 | 估算 | 判据 |
| :-- | :-- | :-- | :-- |
| P0 | 重命名（功能 + 错误文案 + 身份同步） | 290–400 B | 本轮必做；UI 放 `TreeActions` 懒加载 chunk |
| P1 | 大纲 `aria-current` | **0 B 首屏** | 懒加载 chunk，无条件做；纠正上轮延后判断 |
| P2 | 树层级缩进（`.tree-group` 一条 CSS） | 60–100 B | 可见缺陷，CSS-only |
| P3 | 侧栏 `tablist`/`tab`/`aria-selected` | 35–60 B | 属性级，便宜；位置在 `App.tsx:3738-3753` |
| P4 | 展开态保持 + 空文件夹占位 | 100–160 B | 可延后；超线第一个砍 |

- 先砍 P4，再砍 P3；P0/P1/P2 不动。长名截断已实现（`styles.css:458-464`），**不要重复投入**——先截图确认即可，省 100–150 B。
- 若 P0 实施中发现身份同步要改 `App.tsx` 超过约 2.5 KB 源码：把迁移逻辑放 `src/lib/` 并只留薄调用；否则首屏会破线。
- 安装包：内部 820,000、硬线 850,000；预计 817 KB。出包后由根代理回填实测与 SHA，超 820,000 ≤2 KB 记原因，超 850,000 拒绝发布。

## 优化机会（3 条）

1. **把重命名 UI 与 `aria-current` 都放进已有的懒加载 chunk**：`TreeActions.tsx:48-49`、`App.tsx:29` 已经按需加载（2,644 B / 604 B chunk）。这是本轮唯一「不花首屏字节」的落点；反过来，任何塞进 `FileTree.tsx` 的重命名 UI 都按 2.7 B/行计入 866 B。
2. **改名副作用收成一个函数**：`cacheKey` 只认文件名（`cache.ts:51`），草稿/批注/最近/保存目标分散在 `App.tsx:762,1317,1524,1710-1718,1779-1800`。一个 `renameDocument()` 统一做「取消自动保存 → 更新 activeFile/saveTarget → 迁移 cache → 刷新树」，比在 JSX 里补五处不易漏（也呼应 `STATE.md:80` 的重复序列化条目）。
3. **树缩进用容器 CSS 而不是逐行 padding**：现在 `.tree-dir{padding-left:10px}`（`styles.css:444-450`）+ 子层 `.tree-group`（`FileTree.tsx:252`）没有 padding，改一处 `.tree-group{padding-left:14px}` 即可修层级错位，比按 level 传内联样式省 JSX 字节，也让 `visibleRows` 不用带 level 进 DOM。

## 测量方法与未验

- 首屏：`node scripts/measure-first-screen.mjs` 实跑，dist 为 0.25.0 产物（`index.html` 只引 2 个资源）。增量为估算：源码字节 × 0.115（JS）/0.21（CSS），锚点 0.24→0.25 实测 +1,325 B；未构建本轮代码，故不是实测。
- 安装包：815,683 B 为 0.25.0 实测；本轮按 dist raw × 0.283 估算（0.24→0.25 实测比例）。
- 未验：真实盘 `move()`、大小写改名、OneDrive/网络盘、宿主里的重命名、IME 组合态回车、`aria-current` 在屏幕阅读器里的播报、`tablist` 实际读屏效果。
