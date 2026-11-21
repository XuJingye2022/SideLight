# 第 144 轮计划审查（critic）

结论：**REVISE**。A1 的方向与红线一致、可执行；A2/A3 各有会静默滑过的问题。以下 6 条按严重度排。

## P1-1 `readOnly` 与既有同名状态冲突（A2 step 1）

计划写「`trashReason: string|null` → `readOnly: boolean`」，但 `readOnly` **已经是 App 的既有状态**：`src/App.tsx:620`（`useState(initial.readOnly)`，宿主单文件只读/草稿），并被 `:1023` `window.__slState`、`:6072` `.readonly-banner`、`:2857`/`:3594` `setReadOnly(false)`（另存为后撤横幅）消费。照字面改名会与它重名（编译错）或顶掉宿主只读语义，`__slState.readOnly` 与草稿迁移（`:1610-1616`）跟着变味。另外 `finishSaved` 在 `:3594` 清只读——工作区徽标描述的是**文件夹**，另存为后不该消失。

修法：新状态用不同名（`folderReadOnly`/`workspaceReadOnly`）+ 同步 ref；`finishSaved` 不动它；E2E 断言「另存为成功后徽标仍在」（与宿主横幅区分）。

## P1-2 只读保存要判「有没有落点」，否则第二次 Ctrl+S 又弹选择器（A3 step 4）

`performCommit`（`:3663`）写在 `performSaveAs`（`:3830`）**之前**，把 `performSaveAs` 加进 deps 会报 `Cannot access 'performSaveAs' before initialization`；要用 `saveAsCopyRef` 或把 `performSaveAs` 上移。更关键：`finishSaved` 在 `:3566` 写 `saveTargetRef`——第一次另存为后已有落点，若仍按「只读就 SaveAs」无条件分支，之后每次 Ctrl+S 都重开 picker，**「保存到新名字」的闭环断在第二步**。

修法：条件写清 `folderReadOnly && !saveTargetRef.current && !activeFile?.handle` 才走 SaveAs；有落点时照常写，失败再走既有 catch 的「另存为」。验收补 R9：另存为成功后**再按一次 Ctrl+S，picker 0 次、写盘 +1**。

## P1-3 A2 的验收 grep 不可达（A2 验收）

验收要求 `git grep -n "tree-write-warning\|无法创建回收站" -- src` **0 命中**，但 `src/lib/trash.ts:69`、`:72` 仍拼「无法创建回收站：…」（删除/恢复失败路径要它），而 A2 文件清单没有 `trash.ts`。不改就必红；改了会动删除文案。

修法：把门收到打开路径——`tree-write-warning` 0、`App.tsx`/`FileTree.tsx` 无 `无法创建回收站`、`ensureWorkspaceWritable` 不 `setNotice`；`trash.ts` 的删除失败文案保留。

## P1-4 新 `rename.test.ts` 不进 `npm test`（A3 step 5）

`package.json:15` 的 test 链是逐文件枚举，末尾是 `firstScreenBudget`、`saveError`。计划文件清单没列 `package.json`：新测试文件不挂链 = 6 条永远不跑，而「`npm test` 0 fail」照样绿。

修法：文件清单加 `package.json`，验收写「`npm test` 文件数 72→73」（`saveError.test.ts` 就是这么挂的）。

## P1-5 宿主单文件模式下的「改名」会说谎（A3 step 3）

`.doc-name`（`:5722`）是顶栏共用标题。宿主打开单文件时 `hostDoc.ready`、无 `activeFile`/句柄，按计划「无句柄 → 只改 docName」会改标题但 Ctrl+S 仍写回原路径，重开又变回旧名——新增一条用户可见的假改名。

修法：入口条件加 `!hostDoc?.ready`（宿主模式不提供改名，或只走「另存为」并同步落点）；E2E 补一条负向断言。

## P2-1 迭代规则本身还写着首屏硬线

`.tmp/iteration/common.md:28` 的「红线」仍写「首屏 … 硬线 320,000 B」（未跟踪文件，但每轮都读）。门删掉后下一轮代理仍会按它挡，建议同步改成「只记录、不阻塞」，并在 `docs/design-language.md:72` 去掉「余量只剩约 3.7 KB」。

## P2-2 A2+A3 一个代理 25 分钟内偏紧

徽标 + 只读新态 + 命名输入 + 菜单项 + `freeRootName` + 3 个测试文件 + 8 场景 E2E，是本轮最大的一块。建议计划写明顺序与砍线：先 A2→R1/R2/R3，再 R5/R6/R7；超时就先交 A2+R2，R6/R7 记 UNVERIFIED 给下轮（别压一半）。

## 已核对、无异议

- `--max`/`--real-max` 只改默认值：实质判定在 `scripts/measure-first-screen.mjs:134` 与 `:187` 两处，**两处都要按 `max !== null` 守卫**，否则 `totalGzip > null` 恒真、无参必红（已在验收里跑无参，能当场暴露）。
- CI 三处裸调用确实无参数：`ci.yml:39`、`release.yml:82`、`release.yml:155`，删默认 exit 1 后 CI 不会因体积失败。
- `prepareRename`（`:3229`）、`handleRenamedFile`（`:3243`）、`renameFile`（`src/lib/rename.ts:87`）、`parentDirectory` 均存在，R6 路径可行；`.doc-name` 可承载输入框。
- `requestSave`（`:3913`）对「无落点的新文档」不拦，R2 空文档 Ctrl+S 也能走到 SaveAs，脚本不会假红。
