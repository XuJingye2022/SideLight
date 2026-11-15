# 第 12 轮发布与优化发现（finder: r12-ship）

- 基线：`6bd6831`（第 11 轮，0.24.0）；工作树 HEAD `41546db`，只多了轮次文档与未跟踪的 `shots/round-12/`。
- 只读侦察，未改 `src/`、`host/`、`package.json`、`.github/`。所有字节为本机实测（2026-11-16），口径见文末「测量方法」。
- 一句话：**版本 0.25.0**；安装包余量 38,244 B **够**（预计只用 0.9–2.2 KB）；**首屏 285,000 B 软线只剩 2,191 B，是本轮真正的门**；**仓库没有 remote，CI 从未跑过**，`windows-host` 首跑要先有仓库地址；trash 只能写「手动恢复、不自动清理」。

## S1 [高] 首屏 285,000 B 是本轮最紧的门，预计只剩 0.1–1.0 KB

**证据**

- `scripts/measure-first-screen.mjs:15` 默认 `--max 285000`；`:64-67` 超线 `exit 1`；`:59-63` 首屏集合出现 `katex`/`lazy` 也 `exit 1`。285,000 是唯一可执行的首屏预算，写在脚本默认值里。
- 0.24.0 实测 282,809 B＝index JS gzip 276,413 ＋ CSS 6,396（本机按脚本口径复算一致；`dist` 20 文件 1,413,750 B，`index-*.js` raw 882,666 B）。
- 余量：285,000 − 282,809 = **2,191 B**。
- 换算锚点：第 10 轮两个新模块合计 6,588 B 源码（`tableReuse.ts` 4,245 ＋ `serializeDocument.ts` 2,343），打包后 JS raw +2,151 B、gzip +757 B（`round-10/impl-b.md:34-42`），即 gzip ≈ 源码 × 0.115。
- 本轮预计新代码 9–15 KB 源码：trash 逻辑 3–4 KB、`workspace.ts` 新建/刷新 1.5–2 KB、`FileTree.tsx` 入口与确认 2–3 KB、`App.tsx` 处理与保护 2–4 KB、CSS 1–2 KB。
- 换算：JS gzip **+1.0–1.7 KB**；CSS gzip +0.2–0.4 KB（现有 CSS 6,396/30,510 = 0.21）；`index.html` 不加资源，**HTML 增量约 0**。合计 **+1.2–2.1 KB → 284.0–284.9 KB**（估算，非构建实测）。

**影响**：一旦超 285,000，`measure` 返回非 0；按第 11 轮先例，体积门不过不得升版本（`round-11/plan.md:59`）。这条线目前只在 ADR-0012（`:43-45`）与脚本默认值里，README/AGENTS 都没写。

**建议**：plan 把内部目标定 **≤284,000 B**（留 1 KB）；删除确认复用现有 toast/对话框，不新造组件；trash 放 `lib/` 纯函数，文案短；每完成一个任务跑一次 `node scripts/measure-first-screen.mjs --max 285000`（只读 dist，重建 `dist` 只能由根代理串行跑，见 `STATE.md:88`）。若仍超线：先砍代码，**不许静默抬线**；确要抬，同时改 ADR/README/CHANGELOG 并经产品负责人确认。

**难度**：小（守线）；中（若需削减）

## S2 [中] 安装包余量 38,244 B 够；预算按 dist 增量算，不按 dist 总量

**证据**

- 安装包 811,756 B；硬线在 `packaging/installer.ps1:91,93`（850,000，超线打印载荷占比并 `exit 1`）。余量 38,244 B。
- 载荷＝host 五件 1,020,452 B ＋ `dist` 1,413,750 B ＝ **2,434,202 B**（`installer.ps1:10-16,45-50`；`docs/adr/0004-webview2-host-before-admin.md:45`、`round-11/test.md:39`）。
- 历史换算：新增原始字节 × 0.21–0.31 ＋ 7.6% 归档开销（`round-10/impl-b.md:42`）；整轮增长先例 +3,704 B（第 8 轮）、+4,156 B（第 9 轮），且都含宿主改动。
- 本轮 dist raw 预计 +4.0–6.7 KB（JS +3–5 KB、CSS 1–2 KB）→ 安装包 **+0.9–2.2 KB → 812.7–814.0 KB**；硬线余量 ≥36 KB。
- 便携 zip 891,471 B，`packaging/portable.ps1:15` 的 940,000 线余量 ≥45 KB，按同一增量约 892.4–893.6 KB。

**影响**：850,000 不会被顶破。README:66 的「预计 ≤815,000」仍成立，但只剩约 1 KB 余量，只能继续写「预计」，出包后回填实测。

**建议**：预算行写「预计 ≤815,000 B；硬线 850,000 不动；实际以 `installer.ps1` 输出为准，差 >2 KB 记原因」；不抬线。

**难度**：小

## S3 [中] 隐私与删除：README 要写「移到 `.sidelight/trash`、手动恢复、不自动清理」

**证据**

- `readDirectory` 跳过 `.` 开头的项（`src/lib/workspace.ts:92-95`）→ `.sidelight`（含 trash）不会出现在文件树里，用户只能去文件管理器找。
- 示例工作区 `rootHandle: null`（`workspace.ts:20-26,354-366`）；无句柄写入直接报错（`workspace.ts:240-243`）→ 单文件与示例工作区没有删除、新建文件夹。
- FSA `removeEntry` 是永久删除；现有唯一用途是删缓存（`src/lib/cache.ts:192`），fake 句柄测试见 `cache.test.ts:136-153`。
- 现有「数据与隐私」节只写事实、待产品负责人确认（README:54-63），已写「只在本机，不发网络」（:61）与「卸载保留」（:62）。

**影响**：属于对外承诺，按 AGENTS §1 必须回产品负责人；写「可恢复」但应用里没有恢复入口会误导；只写「删除」不写去向，用户不知道文件还在。

**建议文案**（README「现在能做什么」与「数据与隐私」各一条，用同一句）：

> 删除只把文件移到本机 `.sidelight/trash/<时间戳>-<名字>`，不上传、不自动清理，也没有应用内恢复；要找回或清理，用文件管理器打开该目录手动处理。卸载不删文档目录里的 `.sidelight`。

不能写：「一键恢复」「安全删除」「已备份」。

**难度**：小

## S4 [高] CI 从未跑过：仓库没有 remote，`windows-host` 首跑先要建远端

**证据**

- `.git/config` 没有 `[remote]`；`git for-each-ref refs/remotes` 为空；`.git/FETCH_HEAD` 不存在 → 从未 push/fetch。本机也没有 `gh`。
- AGENTS:70 的「CI 只在 Linux 跑 build + test」是工作流定义，不是运行记录；`windows-host` 首跑仍缺（`STATE.md:81`）。
- 现有 gate 只跑 `npm run build`、`npm test`（`.github/workflows/ci.yml:32-33`）；体积门只能人工跑。
- `windows-host` 设了 `continue-on-error: true`（`ci.yml:42`），首跑即使红，run 结论仍可能显示成功。

**影响**：0.25.0 的安装包与宿主构建没有机器可复现证据；「首跑」计划无法执行。

**建议步骤**

1. 产品负责人确认真实仓库地址与署名（AGENTS §1；`STATE.md:89` 只定了「Sidelight contributors」）。
2. `git remote add origin <url>`；`git push -u origin main`。首次 push 会同时触发 `gate` 与 `windows-host`；`install-verify` 只在 `workflow_dispatch` 跑。
3. 打开 Actions run，**点进 `windows-host` job** 逐 step 记状态。不要只看 run 结论（见 `continue-on-error`）。
4. 首跑可能红：WebView2 SDK/NSIS 下载与哈希、`host/build.ps1` 的 csc、`host-smoke.mjs`（runner 无交互桌面/GPU）、artifact 路径。
5. 连续 3 次绿后删 `continue-on-error: true` 改成阻断；再手动 dispatch 跑 `install-verify`（`ci.yml:104-147`，会写 HKCU 与开始菜单）。
6. run URL 与每 step 结论写进 `round-12/test.md`，轮末进 `STATE.md`。

**trash 测试要不要进 CI**：要，但只进 Linux 的 `gate`。加 `src/lib/trash.test.ts` 测纯函数（时间戳名、非法字符、重名后缀、路径拼装）＋ fake 句柄（照 `cache.test.ts:136-153`），不依赖浏览器；FSA E2E 放本地或宿主手测，不进 CI。理由：trash 逻辑与平台无关，windows-host 已够重。

**难度**：小（测试）；阻塞（远端）

## S5 [中] 可访问性只写「加了什么属性」，不写「可访问 / 支持屏幕阅读器」

**证据**

- 现状 31 处 `aria-label`、0 处 `aria-live`、35 处 `role=`；文件树节点是普通 button，无 `role="tree"/"treeitem"/aria-selected`（`src/components/FileTree.tsx:31-38,47-55`）。
- toast 已有 `role="status"/"alert"`（`src/App.tsx:3694`），再补 `aria-live` 是重复；真问题是条件渲染，朗读不保证。
- 无屏幕阅读器实录（`STATE.md:78`）。

**影响**：README 若写「无障碍达标」会被验收驳回；只加 role 不加方向键/roving tabindex，不算键盘可操作树。

**建议**：README/CHANGELOG 只写具体属性；「现在不能做什么」保留「没有屏幕阅读器实录」。时间不够时宁可不加半套 tree role。

**难度**：小（文案）；中（真做键盘导航）

## 版本建议

**0.25.0**。本轮加用户可见的文件树操作，按语义化是功能 +0.1.0（`AGENTS.md:58`）；没有破坏性变更，不动 1.0.0。

- 同时把 `package-lock.json` 根版本 0.24.0 同步成 0.25.0（第 10 轮漏过一次）。
- 发版顺序：`npm run build`（根代理串行）→ `node scripts/measure-first-screen.mjs --max 285000` → `npm test` → 改 `package.json` 与 CHANGELOG → `installer.ps1`/`portable.ps1` 出包 → 回填字节与 SHA256 → ADR-0004 载荷改 1,020,452 ＋ 新 `dist`。
- 版本只在两道体积门都过后才升（首屏 ≤285,000；安装包 ≤850,000，预算 ≤815,000）。

### CHANGELOG 草稿（0.25.0，2026-11-16）

```markdown
## 0.25.0 — 2026-11-16

文件树可新建文件夹、删除（移到 `.sidelight/trash`）与刷新；可访问性补图标按钮名称与树的语义。

- 文件树：新建文件夹、刷新列表；删除先把文件复制到 `<工作区根>/.sidelight/trash/<时间戳>-<名字>`，再从原位置移除，不直接永久删。
- 边界：只能删文件，不能删文件夹；FSA 没有 rename/move API，不能重命名或移动；复制后移除不是原子操作，复制失败时原文件不动；单文件与示例工作区没有目录句柄，删除与新建文件夹不可用；外部改动要手动刷新（没有目录监听）。
- 隐私：trash 只在本机，不上传，不自动清理，没有应用内恢复；卸载不删 `.sidelight`，要清掉需手动删。
- 可访问性：图标按钮补 `aria-label`；文件树/大纲用 `role="tree"`/`role="treeitem"` 与 `aria-selected`；toast 用 `role="status"`/`role="alert"`。未做屏幕阅读器实录。
- 测试：`[N]` 个文件 `[M]` 条（以 `npm test` 输出为准）。
- 体积：首屏 gzip `[TBD]` B；安装包 `[TBD]` B（SHA256 `[TBD]`）；便携 zip `[TBD]` B（SHA256 `[TBD]`）。
- 未验：真实宿主删除与回收站、`.sidelight` 不可写、只读目录与网络盘、Windows 保留名与超长文件名、真实屏幕阅读器。
```

## 文档清单

| 文件 | 写什么 | 证据锚点 |
| :--- | :--- | :--- |
| `README.md` 「现在能做什么」 | 文件树：新建文件夹、删除到 `.sidelight/trash`、刷新；把 S3 的隐私句原样放一条 | `FileTree.tsx:153-161`；`workspace.ts:92-95` |
| `README.md` 「现在不能做什么」 | 只能删文件；FSA 无 rename/move；非原子（复制→移除）；无目录监听；单文件/示例无句柄；trash 不进树；宿主真实删除未验；无屏幕阅读器实录 | `workspace.ts:20-26,240-243`；`STATE.md:81` |
| `README.md` 「数据与隐私」 | S3 的同一句话；保留「待产品负责人确认」抬头 | `README.md:54-63` |
| `README.md` 「依赖与体积」 | 换 0.25.0 数字；把**首屏软线 285,000 B** 写进来（现在只在脚本与 ADR 里）；安装包预算 ≤815,000、硬线 850,000 | `measure-first-screen.mjs:15`；`installer.ps1:93` |
| `README.md` 顺手修 stale | `:42` 安装包名还是 `Sidelight-0.23.0-…`；`:116` 还写「ADR 0001–0011」（已有 0012，本轮加 0013） | `README.md:42,116`；`docs/adr/` 12 个文件 |
| `AGENTS.md` §6 | 0.25.0；测试文件数与条数（以 `npm test` 为准）；**CI 必须改成事实**：仓库无 remote、CI 未跑过、`windows-host` 首跑仍缺；新增未验项（宿主删除、trash 半完成、`.sidelight` 不可写） | `AGENTS.md:70`；`.git/config` |
| `docs/adr/0013-*.md` | 见下「ADR-0013 要写什么」 | `docs/adr/0012-katex-lazy-loading.md` 的格式 |
| `docs/CHANGELOG.md` | 用上面的 0.25.0 草稿；`[TBD]` 只留字节与 SHA | `CHANGELOG.md:5-14` 的 0.24.0 格式 |
| `docs/adr/0004-webview2-host-before-admin.md` | 载荷 2,434,202 → 1,020,452 ＋ 新 dist B | `0004:45` |
| `packaging/README.md` | 体积行补 0.25.0 实测；硬线仍 850,000 | `packaging/README.md:42,57` |
| `docs/adr/0012-katex-lazy-loading.md` | 顺手修 `:21` 的 index JS gzip 276,401 → 276,413（与 `dist` 实测和 CHANGELOG:13 差 12 B） | 本机实测 276,413 |

### ADR-0013 要写什么

标题建议：**「文件树删除与回收站：FSA 没有 rename，删除是复制后移除」**

1. **背景**：FSA 只有 `getFileHandle`/`getDirectoryHandle`/`removeEntry`，没有 `rename`/`move`/`copy`；`removeEntry` 是永久删除；没有目录监听；目录权限是 `readwrite`（`workspace.ts:121`）。
2. **决定**：删除＝`getFile()` → 写入 `.sidelight/trash/<时间戳>-<名字>` → `removeEntry(name)`；只对文件；trash 与 `drafts/`、`annotations/` 同级；重名加后缀；时间戳取本地时间、格式固定。
3. **失败与半完成**：复制失败 → 不删原文件、报可操作错误；`removeEntry` 失败 → 原文件在、trash 多一份，提示手动清理；`.sidelight` 建不出来 → 删除不可用并说明原因。
4. **保护**：删除前先处理未保存改动；删当前打开的文档要先切走；根目录与 `.sidelight` 自身不可删。
5. **边界**：无 rename/move；无应用内恢复；不自动清理；trash 不在树里显示；单文件/示例无句柄；Windows 保留名与超长文件名未验；宿主（WebView2）自动允许 `FileReadWrite`（`host/Program.cs:1384-1389`）但真实删除未验。
6. **被否决**：直接 `removeEntry`（不可恢复，违背本轮目标）；trash 放 `%LOCALAPPDATA%`（跨盘复制、与「缓存只写 `.sidelight`」冲突、用户找不到）；目录递归复制进 trash（成本与半完成风险，本轮不做）。
7. **状态**：2026-11-16 接受（0.25.0）。

## 优化机会（≤3）

1. **CI 加体积闸（1 行）**：`gate` 在 `npm run build` 后加 `node scripts/measure-first-screen.mjs dist --max 285000`，把 285,000 从口头预算变成机器门；脚本已内置「首屏出现 katex/lazy 就 exit 1」。证据：`ci.yml:32-33`；`measure-first-screen.mjs:15,59-67`。
2. **`npm test` 改 glob**：现在 `package.json:14` 硬编码 16 个文件，`src` 下已有 17 个 `*.test.ts`（`katexLazy.test.ts` 未挂，ADR-0012:56）；改成一个跑 `src/**/*.test.ts` 的 runner，trash 与 KaTeX 测试自动纳入，不再靠手改长命令。
3. **trash 复用 `.sidelight` 单一来源**：`cache.ts:83-85,91-101` 已有 `CACHE_DIR`、`cachePath()`、`ensureCacheDir()`；把 `trash` 加进 `CacheKind`/`SUBDIRS`（或抽 `trashDir()`）比另写一套 `.sidelight/trash` 拼装好，路径只有一处、测试可复用 `cache.test.ts:136-153` 的 fake 句柄。

## 测量方法

- `dist` 字节：`Get-ChildItem -Recurse` 求和（20 文件 1,413,750 B）；gzip 用 Node `zlib.gzipSync(level:9)` 逐文件求和，与 `scripts/measure-first-screen.mjs` 同口径。
- 首屏：`index.html` 里的 `script[src]`/`stylesheet`/`modulepreload`/`preload`，只含 `index-*.js`（raw 882,666 / gzip 276,413）与 `index-*.css`（raw 30,510 / gzip 6,396），合计 282,809 B。
- 安装包/zip、host 载荷：`release/` 与 `host/bin/` 实测；host 五件 1,020,452 B。
- 增量估算用第 10 轮锚点（6,588 B 源码 → +2,151 B raw / +757 B gzip）与文档记录换算系数（0.21–0.31 ＋ 7.6%）；**没有跑 `npm run build`**，所以新增体积是估算，不是实测。
