# 第 145 轮（A 轮）实现报告

`startSha=f8543dc`；只做计划 A 部分（A1/A2/A3），B 轮（146）未做。

## A1 新建/保存闭环（代码完成，行为未跑 E2E）

`src/App.tsx`
- 删 `folderReadOnly`/`Ref`/`folderProbeEpochRef`/`applyFolderReadOnly`（`:468-476`，含 `:1699`/`:1818`/`:3025`/`:3140` 调用）、`ensureWorkspaceWritable`（`:2993-3015`，含两条打开路径的调用）。
- 删 `commitDocName` 只读守卫（`:3368-3376`）：改名试一次 → `renameFile` 中文错误。
- 删 `newDocument`（`:3609`）：菜单 `onNew`（`:5837`）与 `Ctrl+Alt+N`（`:5009`）统一走 `newFileInWorkspace()`。
- `createWorkspaceFile` 恒先 `getFileHandle(nextNewName(space),{create:true})`；失败 → `newDocumentForNaming()` + 错误 toast「新建失败：{writeReasonOf}。已打开空白文档；按「另存为」选一个能写的位置。」（`persist`、不写 `saveTargetRef`、不提「只读」、删 `console.debug`）。
- `performCommit` 无落点先 `saveIntoWorkspace`；`isWriteDenied` → 直接 `performSaveAs`（取消＝「已取消保存」）；其余错误 `throw` 走原 catch（草稿兜底不变）。

`FileTree.tsx` 删 `readOnly` prop / `READONLY_BADGE_ID` / 树头徽标 / `＋ 新建` 的 `aria-describedby`；`styles.css` 删 `.tree-readonly-badge` 块。`saveError.ts` 新 `isWriteDenied`（NoModificationAllowed / NotAllowed / InvalidState / Security / NotFound）。

## A2 保存失败提示（代码完成）

`saveError.ts`：新 `SANDBOX_HINT`「如果一直失败，请从正常桌面双击启动 Sidelight 再保存：受限账户或沙箱里，应用不能写普通文件夹。」；`NoModificationAllowed`/`NotAllowed`/`InvalidState`/`Security` 四条各追加；后两条不再拼 `error.message`，改 `writeReasonOf`（中文短原因 + 文件名 + 「另存为」+ hint）；`NotFound`/`QuotaExceeded` 不动。

`saveError.test.ts` 29 条（原 20 + 9）：六类都查 W3C 英文与文件名、`NoModificationAllowed` 逐字含 hint、`InvalidState/Security` 无错误名无原文、`isWriteDenied` 单测；静态门按计划改写（三模式在 `src` 归零、`getFileHandle` 早于 `newDocumentForNaming`、两个入口同一函数、`performCommit` 试写→`isWriteDenied`→`performSaveAs`）。

## A3 E2E —— BLOCKED（环境）

dev server 5175 无监听：`localhost:5175`、`127.0.0.1:5175` 均 `ECONNREFUSED`；`node` 进程只剩 codex runtime，无 vite。本轮 ego CDP 在 **60843**（`ego_doctor`：`browser.json port=60843`），`57270` 无监听。按红线不启动/重启 dev server，未跑。

脚本已写、`node --check` 通过：`.tmp/e2e-r145-a.mjs`（R1–R6 覆盖计划 A3 全部断点，见脚本头部注释）。截图 `shots/round-145/new-failure-toast.png`、`save-denied-toast.png`（目录已建，空）。复跑：`SIDELIGHT_CDP=http://127.0.0.1:60843 node .tmp/e2e-r145-a.mjs`。

## 门禁

- `npx tsc --noEmit` exit 0。
- `npm test` exit 0：**73 文件 1018 条 0 fail**（144 轮 1013）。
- `npm run verify` exit 0 **PASS**：门 **318,454 B** / 常驻 **4,484 B** / 真实首载 **322,938 B**（`headroom=none`，只记录）。
- `roundtrip` 不跑（未动编辑器/序列化）。
- 静态 grep `ensureWorkspaceWritable|tree-readonly-badge|READONLY_BADGE_ID`：改前 `HEAD` **20 处 / 4 文件**（App 5、FileTree 4、saveError.test 10、styles 1）→ 改后 **0（exit 1）**。

## CHANGELOG 一行

新建与保存不再走死路：新建先试当前文件夹（失败才给空白稿 + 命名 +「另存为」），保存写不进去直接转「另存为」，保存失败文案补「从正常桌面启动」兜底。

## 新踩坑

1. 环境是活的：本轮 5175 已停、ego CDP 从 57270 变 60843。跑 E2E 前先探 `http://localhost:5175/` 与 `ego_doctor` 的 `browser.json port`，别照抄计划端口。
2. 断言「某字面量在 `src` 归零」时，测试文件自己在 `src/` 下：字面量要拆开拼（`['tree-readonly','badge'].join('-')`），否则门永远红。
