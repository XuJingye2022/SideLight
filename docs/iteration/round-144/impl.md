# 第 144 轮实现（executor）

轮前 284ec40；CDP 57270；未 commit/push、未动 release/。3/3 完成，回滚 0。

## A1 取消首屏硬线 ✔

`measure-first-screen.mjs`：`--max`/`--real-max` 默认 **null**，新增 `hasHardLine`，两处体积 FAIL 按守卫；`headroom`/`max` 打 none；「距硬线<5%」只在有硬线时出。katex/lazy/mermaid 禁入、常驻 seed、重复计数三条非体积守卫保留。`firstScreenBudget.test.ts` 4 条重写。文档：AGENTS §3/§4/§6、README、BRIEF、design-language §5、common.md 红线 7、CHANGELOG。
证据：无参 exit 0（含 total=/resident=/real=/headroom=none/PASS，无「FAIL…超过上限」）；`--max 1000`、`--real-max 1000`、`--no-resident --max 1000` 各 exit 1；`325000` 在脚本 3→**0**；「真实首载 gzip 字节门」2→**0**；`git diff --stat -- .github` **空**。

## A2 只读徽标 ✔

App：`trashReason` → **`folderReadOnly`+ref+`applyFolderReadOnly`**（与宿主 `readOnly` 分开），探测不存原因、不 `setNotice`、加 `folderProbeEpochRef` 守卫，`TypeMismatchError` 不算只读；换工作区四处先清、`refreshTree` 不动、`finishSaved` 不碰。FileTree：删 `.tree-write-warning`/`WRITE_WARNING_ID`，prop 改 `readOnly`，树头 `span`「只读」（非按钮、无 Tab 站），＋新建 `aria-describedby` 指它且不禁用。styles 换 `.tree-readonly-badge`。`saveError.test.ts` 静态门改写。
偏差：`trash.ts` 的 `ensureTrashDir` 加 `errorName`（4 行），删除失败文案未改（「无法创建回收站」现在 `:61/:72/:76`）。
证据：E2E R1/R3；`tree-write-warning` src **7 行→0**；可写夹具徽标 0。

## A3 新建/命名/另存为 ✔

只读新建不试写：`newDocumentForNaming`（空白稿+输入框聚焦+info），试写失败同路；删「新建失败/已换到空白文档」。改名：双击 `.doc-name` 或 文件→重命名文档…（`FileMenu` 新 `onRename`），Enter/Esc/blur；新 `validateDocName`（`rename.ts`，没变算成功）。落地：句柄+可写 → `prepareRename`+`parentDirectory`+`renameFile`+`handleRenamedFile`；`hostDoc.ready` 给宿主提示；只读+已有落点不改名；无落点只改 `docName`/ref。保存：`saveIntoWorkspace` 用 `freeRootName(docNameRef, rootNames)`（`workspace.ts`，重名加 ` 2`）；`performSaveAs` 上移+返回 boolean+读 ref，`performCommit` 同改并在「只读+无落点」直接走另存为。测试：`rename.test.ts` **7**、`workspace.test.ts` +3、`package.json` 挂链。
## 门禁

`npx tsc --noEmit` 0；`npm test` **73 文件 1013 条 0 fail**；`npm run verify` **PASS**（门 **318,723** / 常驻 **4,487** / 真实首载 **323,210**，只记录，对 r143 **+1,937**）；`roundtrip` 不跑。
E2E `.tmp/e2e-r144-e2e.mjs` **45/45、0 pageerror**：R1 只读打开 0 toast、无「回收站/无法创建」、徽标「只读」、可读可编辑且磁盘未变；R2 命名「读书笔记」→`suggestedName` 写成功、徽标仍在；R3 只读 0 成功写入；R9 再 Ctrl+S picker 0、写盘 +1；R4 可写建 `未命名.md`；R5 改名 `笔记.md`→Ctrl+S 落 `笔记.md`；R6 `Main.md`→`正文.md` move **1** 且写新名；R7 Enter 开输入框、Esc 不改名；R8 记 `total=318723 resident=4487 real=323210`；R10 宿主不给改名。
截图 `shots/round-144/readonly-badge-naming.png`、`rename-input.png`。

## 踩坑（3）

1. `focusEditor()` 是 rAF：新建后立刻开改名输入框会被抢焦点 → `onBlur` 取消（输入框闪一下就没）；要等双 rAF。
2. Vite 会交付 `FileTree.tsx` 混合版本（新徽标+旧警示行），全红；touch 源文件即恢复。
3. 0 命中静态门的字符串不能写进断言（`includes('tree-write-warning')` 自己制造命中）；用 `/tree-write-warn\w*/`。

## 下一轮

STATE / README「现在能做什么」/ AGENTS §6 轮次记录未写（scribe）；`scripts/tree-acceptance.mjs:23` 仍注入 `trashReason`（已列过期）。UNVERIFIED：真宿主改名/另存为、真实 FSA `move`、Low IL 双击、真 IME。
