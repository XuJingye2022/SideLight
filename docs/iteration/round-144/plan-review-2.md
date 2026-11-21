# 第 144 轮计划复审（critic，revision 1）

第一轮见 `plan-review.md`；本文件只核旧漏洞与 revision 1 新风险。

结论：**REVISE**。上一版 5 条 P1、2 条 P2 **全部修掉**（末节）；但 revision 1 的验收有 3 处与「无改动不写盘」门冲突，另有 1 处会弄红既有静态门。产品修法可行。

## P1-A（新）R4/R6/R9 的 Ctrl+S 断言会假红

`requestSave` 在 `goal==='file' && !dirtyRef.current && (saveTargetRef.current || fileRef.current?.handle)` 时提示「没有改动，未写入。」并 return（`src/App.tsx:3913-3916`）。R4 树「＋ 新建」已设落点（`:3462`）、R6 改名后落点已设（`:3258`）、R9 另存为后 `finishSaved` 写 `saveTargetRef`（`:3566`）——三处都不改正文，Ctrl+S 必早退，写盘 0。R2 不受影响（无句柄，`:3911` 注释的例外）。

修法：R4/R6/R9 的 Ctrl+S 前各打 1 个字（R6 在改名成功后、R9 在另存为后），再断言 picker 0 / 写盘 +1；或拆「无改动不写盘」+「打字后写盘」两条。

## P1-B（新）上移 `performSaveAs` 会弄红 `saveError.test.ts`

`src/lib/saveError.test.ts:178-183` 切片 `const performSaveAs` → `const performSwitch`，断言不含 `label: '另存为'`。上移到 `performCommit` 之前后，切片跨过 `performCommit`（`:3772`/`:3788` 含该串），必红；A3 step 5 只写「新建门改「不先失败」」，没列这条。

修法：A3 step 5 加「切片 end 标改 `const performCommit = useCallback(`」；落点写明 `finishSaved`（`:3554`）之后、`performCommit`（`:3663`）之前（deps 都在上，无 TDZ）。

## P2（4 条）

1. **R6 依赖可写假 FSA 的 `move`**：`src/lib/rename.ts:70-81` 无 `handle.move` 就回「这个浏览器不支持文件改名」；`.tmp/e2e-r142-a.mjs:92-105` 的夹具没有 `move`，计划只写「沿用」→ R6 必红。夹具补 `move` 并同步 files 键，或按砍线降级为单测 + UNVERIFIED。
2. **R5 入口没写明**：树「＋ 新建」在可写工作区会立刻建 `未命名.md` 并设落点（`src/App.tsx:3444-3465`），改名走 `move`，Ctrl+S 不写；只有「文件 → 新建」（`newDocument` → `startNewDocument`，无句柄）才会在 Ctrl+S 走 `saveIntoWorkspace`/`freeRootName`（`:3625-3641`）。R5 写成「文件 → 新建 → 改名 `笔记.md` → 打字 → Ctrl+S → 根目录出现 `笔记.md`」，R4 留给树「＋ 新建」。
3. **异步探测无代际守卫、口径偏宽**：`ensureWorkspaceWritable`（`:2970-2976`）晚到会覆盖后开的文件夹；且用「建 `.sidelight/trash`」代理写权限，`.sidelight` 是文件（`trash.ts:61` TypeMismatchError）或网络盘瞬断时，会给**可写**文件夹挂「只读」并跳过新建试写。加 epoch/ref 守卫；只在权限类错误置 true，或 badge 文案区分。
4. **A2 的 0 命中门缺正向对照**：`git grep "无法创建回收站" -- src/App.tsx src/components` 改前就是 0（今天只在 `src/lib/trash.ts:69/72`），违反 AGENTS §8。保留 `tree-write-warning`（改前 src 7 行）与 `trashReason`（改前 >0）的 0 命中门即可。

## 上一版漏洞核对

- P1-1：已修（`folderReadOnly`+ref；`finishSaved:3594` 不碰；R2 断言徽标仍在）。
- P1-2：已修（条件含 `!saveTargetRef.current && !activeFile?.handle`；上移避开声明顺序；R9 见 P1-A）。
- P1-3：已修（门收到 App/components，`trash.ts` 文案保留）。
- P1-4：已修（`package.json` 进清单，72→73）。
- P1-5：已修（`!hostDoc?.ready`+R10；`/__doc` 在 `src/App.tsx:1740` 无条件 fetch）。
- P2-1/P2-2：已修（`common.md:28`、`design-language:72` 进清单；顺序与砍线写明）。

## 其它核对

dev 5175 与 CDP 57270 均 200，E2E 前提成立。A1 的 `:134/:187`、`:103/:170`、`:57` 都对得上；正向对照：`真实首载 gzip 字节门` 改前 AGENTS:38+README:151 共 2 命中，`325000` 改前只在 `scripts/measure-first-screen.mjs:12/21`。A1 的 `npm run verify`（build）不要与 A2/A3 改 `src/` 同时跑。
