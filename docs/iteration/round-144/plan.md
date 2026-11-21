# 第 144 轮计划（revision 1，按 plan-review 修 P1-1…P1-5、P2-1/P2-2）：取消首屏硬线 + 只读工作区 UX

轮前 `startSha=284ec40`；dev 5175；ego CDP **57270**（9222 不可用）；不 push、不改 `release/`；版本不动。

## A1 取消首屏硬线：只记录字节

文件：`scripts/measure-first-screen.mjs`、`src/lib/firstScreenBudget.test.ts`、`AGENTS.md` §3/§4/§6、`README.md`、`docs/iteration/BRIEF.md`、`docs/design-language.md:72`、`docs/CHANGELOG.md`、`.tmp/iteration/common.md:28`；CI 只核对（`ci.yml:39`、`release.yml:82`/`:155` 三处无 `--max`）。

1. `--max`/`--real-max` 默认 `null`：`:134`/`:187` 两处体积 FAIL 加 `!== null` 守卫；`:103`/`:170` 的 `headroom=`/`max=` 在 null 时打 `none`；`:180`/`:184` 只在有硬线时提线与算余量。`--target 310000` 仍只 WARN；头注释 `:12/:19/:21` 同步。
2. 保留非体积守卫：katex/lazy/mermaid 禁入、常驻 seed 0 命中、门与常驻重复计数。
3. `firstScreenBudget.test.ts` 4 条重写（链位不动）：默认 null + 两处守卫；显式 max 仍 exit 1；三条守卫与 `RESIDENT` 在；AGENTS/README/BRIEF 含「只记录」「不阻塞」、BRIEF 无 `325,000`、安装包 `50,000,000`/`45,000,000` 原句在。
4. 文档删「超 325,000 必须拆批」与「余量只剩约 3.7 KB」，改「只记录、不阻塞；安装包 50 MB 硬线不动」；`verify` 说成「build + 体积报告」；`common.md` 红线 7 同步。CI 与命令不改。

验收：`node scripts/measure-first-screen.mjs`、`npm run verify`（含 build）均 exit 0（含 `total=`/`resident=`/`real=`/`headroom=none`/`PASS`，无 `FAIL … 超过上限`）；`--max 1000`、`--real-max 1000`、`--no-resident --max 1000` 各 exit 1；`npm test` 0 fail；`git grep -n "325000" -- scripts/measure-first-screen.mjs` 改前 >0 → 0；`git grep -n "真实首载 gzip 字节门" -- AGENTS.md README.md` 改前 2 → 0。

## A2 只读工作区：安静「只读」徽标

文件：`src/App.tsx`、`src/components/FileTree.tsx`、`src/styles.css`、`src/lib/saveError.test.ts`。

1. 新态 **`folderReadOnly` + `folderReadOnlyRef`**（P1-1：既有 `readOnly`/`setReadOnly` 不动）；`applyFolderReadOnly(v)` 同步 state+ref；`ensureWorkspaceWritable` 只调它，不存 error 文本、不 `setNotice`；换工作区四处（`:1678`/`:1796`/`:2982`/`:3097`）先置 false，`:3162` 同工作区刷新**不动它**；`finishSaved:3594` 的 `setReadOnly(false)` 不碰它。
2. `FileTree` 删 `.tree-write-warning`/`WRITE_WARNING_ID`；prop 改 `readOnly: boolean`；树头 workspace 名后加 `<span className="tree-readonly-badge" title="这个文件夹写不进去：能打开、能编辑；保存请用「文件 → 另存为」。">只读</span>`（非按钮、无 Tab 站）；「＋ 新建」`aria-describedby` 指它、仍不禁用。
3. `styles.css` 换 `.tree-readonly-badge`（`--ink-faint`/`--line`、11px、细边框）；`saveError.test.ts` 静态门改写（无 `trashReason`/`setNotice`、有徽标与「只读」、CSS token 门）。

验收：E2E R1：只读夹具打开后 `.toast` 0、正文无「回收站」「无法创建」、徽标 1 文「只读」、树有 `Main.md`、可读可编辑、0 pageerror；可写夹具徽标 0。静态门（P1-3）：`git grep -n "tree-write-warning" -- src` 0；`git grep -n "无法创建回收站" -- src/App.tsx src/components` 0；`src/lib/trash.ts:69/:72` 文案保留。

## A3 新建 / 命名 / 另存为闭环 + E2E

文件：`src/App.tsx`、`src/components/FileMenu.tsx`、`src/lib/rename.ts`（`validateDocName`）、`src/lib/workspace.ts`（`freeRootName`）、新 `src/lib/rename.test.ts`、`workspace.test.ts`、`saveError.test.ts`、`styles.css`、`package.json`（P1-4）、`design-language.md` §4。

1. 只读新建（读 `folderReadOnlyRef`）：不试写，直接 `startNewDocument()` + 标题输入聚焦 + info「这里写不进去：给它起个名字，保存时用「另存为」。」；可写照旧建 `未命名.md`；试写失败走同一命名流程（`kind:'info'`，删「新建失败」）。
2. 入口：双击 `.doc-name` 或「文件 → 重命名文档…」→ 就地 `.doc-name-input`；Enter 提交、Esc/blur 取消；`validateDocName(raw, oldName)` 复用 rename 规则（未变名视为成功）。
3. 落地：有句柄+可写 → `prepareRename()`+`parentDirectory()`+`renameFile()`+`handleRenamedFile()`；无句柄只改 `docName`/ref。入口加 **`!hostDoc?.ready`**（P1-5），宿主给 info「宿主文件请用「文件 → 另存为」换名字。」；`folderReadOnly` 且已有句柄/落点时不改名，info 指向另存为。
4. 保存：`saveIntoWorkspace` 用 `freeRootName(docNameRef.current, root 名字)`（重名加 ` 2`）；`performSaveAs`/`performCommit` 的 `saveAsFile` 改读 `docNameRef.current`（改名后立刻 Ctrl+S 不落旧名）；把 `performSaveAs`（`:3830`）整块上移到 `performCommit` 前并返回 boolean（取消/失败 false）；`performCommit` 无落点分支（`:3663`，**先于 `saveIntoWorkspace`**）仅 `folderReadOnlyRef.current && !saveTargetRef.current && !activeFile?.handle` 时 `return await performSaveAs(...)`，其余照常写、失败走既有 catch（P1-2）。
5. 测试：`rename.test.ts` 6 例；`workspace.test.ts` 补 `freeRootName`（`未命名.md` 不变、自定义、占位加 2）；`saveError.test.ts` 新建门改「不先失败」；`package.json` 链挂新文件（`npm test` **72→73**）。

验收（`.tmp/e2e-r144-e2e.mjs`；ego CDP 57270、1440×900，先 `node .tmp/reset.mjs 57270`；假 FSA 两夹具 + stub `showSaveFilePicker`，沿用 `.tmp/e2e-r142-a.mjs`）：R1 同 A2；R2 只读＋新建：无「新建失败」、标题聚焦、键入「读书笔记」Enter→`读书笔记.md`、info、Ctrl+S 的 `suggestedName` 写成功、无 `未命名.md`、徽标仍在（P1-1）；R3 只读 `create:` 0；R4 可写＋新建建 `未命名.md`、toast、Ctrl+S 写 1；R5 可写文件→新建空白稿改名 `笔记.md`→Ctrl+S 建 `笔记.md`；R6 `Main.md`→`正文.md`：`move` 1、树/标题/落点同步、Ctrl+S 写新名；R7 菜单 Enter 开输入、Esc 不改名；R8 记录真实首载三数（只记录，不判失败）；R9 另存为后再 Ctrl+S：picker 0、写盘 +1（P1-2）；R10 `page.route('**/__doc')` 宿主下双击不出输入框、菜单 info 提「宿主文件」（P1-5）。全部 0 pageerror。

顺序/砍线（P2-2）：A2→R1–R3→保存分支→R4/R5→R9→R6/R7/R10；超时砍 R6/R7/R10 记 UNVERIFIED，先交 A2+R2/R3。探测未回时点新建走「试写失败→命名」；`freeRootName` 不得改「无句柄 Ctrl+S 建 `未命名.md`」（单测钉）。

## 并行与门禁

A1 只碰 scripts/docs/静态门；A2+A3 同代理改 App/FileTree/FileMenu，合跑一次 E2E；两组并行。门禁 `npm run verify`（只报告 exit 0）、`npm test`（73 文件）；未动编辑器/序列化 → `roundtrip` 不跑。
