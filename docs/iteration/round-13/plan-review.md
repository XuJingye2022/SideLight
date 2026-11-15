# 第 13 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-13/plan.md`（基线 `0842c3b`，v0.25.0）。
审查方式：读计划、三份 findings、`src/components/FileTree.tsx`、`src/components/TreeActions.tsx`、`src/lib/cache.ts`、`src/App.tsx` 的 activeFile/标题/树段；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（`move()` 的探测与提交之间仍有 TOCTOU，大小写/两段回滚未闭环）、H2（缓存迁移「写新失败仍删旧」会丢批注/草稿）是 blocker；H3–H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:14` 的探测是 `getFileHandle(newName,{create:false})` → `isSameEntry` → 再 `move(newName)`；探测与 `move` 之间没有原子性，另一个窗口/进程在这段时间建出 `b.md`，`move` 仍会**静默覆盖**（findings B1 已实测 `optsTargetExists {ok:true, yContent:"z"}`）。大小写改名走「临时名→目标」两段；第二段失败时回滚原名也可能失败，计划只标 UNVERIFIED，没有失败后的可操作态。 | `plan.md:14`；`findings-bug.md:19-39`；`src/lib/trash.ts:91-93`（move 回退先例） | 探测 + `isSameEntry` 只作为**第一道**；提交前再探测一次（`getFileHandle(newName)`）并在 `move` 的 catch 里区分 `InvalidModificationError`/`NotAllowedError`；大小写两段失败时保留临时名并提示「已改为临时名，请手动改回」，不要假装回滚成功；补「探测后目标被建出」「第二段失败」两条模拟测试 | T1 |
| H2 | blocker | T1 `:17` 的缓存迁移写「read 旧 → write 新 → remove 旧；任一步失败只提示，且**旧键最终必删**」。若 `writeCache(新)` 失败（存储满/目录不可写），仍删旧键 = 批注/草稿直接丢失；这与「批注消失」的修复目标相反。另 T1 `:15` 只取消 autosave，没有清 `draftTimer`/`writeDraftFallback`；改名瞬间 800 ms 草稿计时器仍可能用旧 `fileRef.current.name` 写旧键，迁移后旧键又出现。 | `plan.md:15,17`；`findings-bug.md:89-108`；`cache.ts:51-73`（cacheKey 只按文件名） | 迁移改成「write 新成功才 remove 旧」；write 失败保留旧键并提示「旧键仍在，可手动迁移」，**绝不删旧**；T1 提交前 `clearTimeout(draftTimerRef)` + `draftGeneration++`，`writeDraftFallback` 检查 generation；补「write 新失败→旧键仍在」「改名时草稿计时器未触发」两例 | T1 |
| H3 | major | T1 `:16` 的 `adoptRenamedFile` 要同步六处：`activeFile`（name/path）、`saveTargetRef`、`docName`+`setDocName`、`document.title`、`localStorage` name、树选中/滚动。计划没说 `docNameRef`/`__slState.name`/`fileRef` 是否一起更新；`tree selected/scroll` 在 T2 才上提，T1 的 adopt 在 T2 前无法设 `focusPath/scrollTop`。`adopt` 后再 `refreshWorkspace()`，若 refresh 按旧 path 找不到会 `setActiveFile(null)`，把刚 adopt 的身份又清掉。 | `plan.md:16`；`findings-bug.md:45-66`（B2）；`App.tsx:1710-1719`（refresh 清 activeFile）、`:1922-1930`（finishSaved 重算 path）、`:3430`（顶栏 docName） | `adopt` 同时更新 `docNameRef`/`fileRef`/`__slState`，并把新 path 登记给 refresh 的「跳过刚改名节点」；顺序改成「adopt → refresh(skip new path)」，refresh 不得把新 activeFile 清空；T2 上提后再补 focus/scroll；补「改名后标题/顶栏/`__slState`/Ctrl+S 落点」四条断言 | T1 |
| H4 | major | T2 把 `expanded/scrollTop/focusPath` 上提到 App，T3 的 tablist roving 与树 roving 共用「一个 tab 站」；计划没有写切页签、折叠祖先、刷新、改名四种情况下 `focusPath`/`tabbablePath` 的优先级，T3 `:62` 的 `aria-controls` 也没有给出 panel 的稳定 `id`。`aria-current` 在 `Outline` 懒 chunk，T3 `:63` 要确保它不把 `Outline` 拉回首屏。 | `plan.md:40-42,62-64`；`findings-bug.md:112-132`；`FileTree.tsx:62-67`（当前 useState） | 固定 `tabbablePath = 可见的 focusPath → activePath → rows[0]`；切页签不卸载状态，折叠祖先后若 active 不可见则回退到最近可见祖先；tablist 与树各自一个 tab 站，`aria-controls` 用 `sidebar-files`/`sidebar-outline` 固定 id；T3 验收加「Outline 不在首屏 chunk」断言 | T2/T3 |
| H5 | major | T5 当前 284,134 B、余 866 B；本轮估算 +485–720 B，落在 284,619–284,854，**内部目标 284,800** 可能超；超线先砍 P4「展开态+空文件夹」、再 P3 tablist。但 P4 对应 T2 验收 `:49` 的「切页签展开数/scrollTop 不变」和 `:50` 空文件夹提示，P3 对应 T3 验收 `:66` 的 tablist；T2/T3 先于 T5 执行，T5 砍 P4/P3 会让 T2/T3 的已完成验收变成「未做」。 | `plan.md:3,95-100`；`findings-ship.md` 的 866 B/820,000 口径 | T2/T3 验收拆「P0/P1/P2 必过」与「P3/P4 可延后」；T5 超线只砍可延后项，并在 `impl-a.md`/CHANGELOG 写「延后」；P4 被砍时 T2 的验收不能判失败，改成「延后项已记录」；P0 rename/P1 aria-current/P2 缩进不砍 | T2/T3/T5 |
| H6 | major | T1 `:13` 的 `validateRename` 只拒绝 `[<>:"/\\|?*]`/控制字符/结尾点空格/保留名/`.` 开头，没有处理 **`move()` 对 `\` 名抛 TypeError** 的统一文案（校验已挡，但 catch 仍要兜底）；`a.md`→`a.markdown` 同键跳过迁移，但 `recent.json` 旧条目、`localStorage` 的 `name`、`document.title` 之外的 `recent` 不迁移；T4 `:79` 的 ADR 要写「最近记录不迁移」，README 要写「旧最近记录会失效」，否则用户以为改名后最近项还能打开。 | `plan.md:13,20`；`findings-bug.md:70-83,89-108`；`recent.json` 旧路径 | `validateRename` 对 `\` 也返回「文件名不能含反斜杠」；`move` catch 兜底 `TypeError`；T1/T4 的验收加「改名后旧最近条目打开给 FILE_GONE 且文案可读」；README 明确「不迁移最近记录」 | T1/T4 |

---

## H1（blocker）`move()` 的 TOCTOU 与大小写两段

findings B1 已实测：

```
opfsTargetExists { ok: true, list: ["y.md"], yContent: "z" }
```

即 `move()` 对已存在目标**静默覆盖**。计划 `:14` 的防护是：

```
getFileHandle(newName, {create:false})
→ 命中：isSameEntry(probe, fileHandle) 区分「真的重名」与「仅大小写改名」
→ 真的重名：拒绝
→ 命中自身：允许，先临时名再目标
```

问题：

- 探测与 `move` 之间不是原子操作。另一个窗口/另一个进程/OneDrive 同步在这段时间创建 `b.md`，`move` 仍覆盖目标；计划没有二次探测/失败兜底。
- 大小写改名（`a.md`→`A.md`）在 Windows 上 `getFileHandle('A.md')` 可能返回自身（`isSameEntry=true`），走两段；第一段 `a.md`→`tmp` 成功后，第二段 `tmp`→`A.md` 失败（权限/占用/目标被建出），文件停在 `tmp`；计划只说「回滚原名」，回滚本身也可能失败（原目标已被占）。
- `isSameEntry` 本身可能抛 `NotAllowedError`/`NotFoundError`，计划没有 catch。

**修**：

1. 探测 + `isSameEntry` 是第一道；`move` 前再 `getFileHandle(newName,{create:false})` 一次，命中且不是自身则拒绝。
2. `move` catch 里按 `InvalidModificationError`/`NotAllowedError`/`TypeError` 给可读文案；**不 copy 回退**（保持计划决定）。
3. 两段改名失败时保留临时名并提示「已改为临时名 `<tmp>`，请手动改回」，不要声称回滚成功；补「第二段失败」模拟。
4. 验收加「探测后目标被建出」的 fake FS 版本（探测与 move 之间插入目标）。

## H2（blocker）缓存迁移失败仍删旧键

计划 `:17`：

> 对 `draft`/`annotations` 各做「read 旧 → write 新 → remove 旧」；…任一步失败只提示…且**旧键最终必删**（避免孤儿）。

这是把「避免孤儿」排在「数据不丢」前面。`writeCache(新)` 失败（配额满、目录不可写、`.sidelight` 是文件）时，旧键是唯一的草稿/批注副本；删掉旧键后：

- 当前文档的批注在内存里还能看，重开后 `restoreAnnotationsFor` 读新键为空 → 批注消失；
- 自动保存失败的兜底草稿也读不到。

**修**：

- 成功路径：write 新成功 → remove 旧；
- 失败路径：保留旧键，提示「旧草稿/批注仍在 `<旧键>`，未自动迁移」；
- 若要避免孤儿，另做「旧键保留 + 下次启动重试」，不要在同一次失败里删。
- T1 `:15` 只 cancel autosave；补 `clearTimeout(draftTimerRef)`、`draftGeneration++`，`writeDraftFallback` 检查 generation，否则改名瞬间 800 ms 草稿计时器仍写旧键，迁移后又出现旧键。
- 补「write 新失败→旧键仍在」「改名时草稿计时器未触发」两例。

## H3（major）`adoptRenamedFile` 六处同步

findings B2 的实测：

```
afterRenameRefresh { activeRows:0, stateName:"a.md", title:"Sidelight" }
afterRenameCtrlS { pickerCalled:1, writes:[] }
```

计划 `:16` 要求 adopt 更新 `activeFile`/`saveTargetRef`/`docName`+`setDocName`/`document.title`/`localStorage`/树选中+滚动。仍缺：

- `docNameRef`、`fileRef`、`__slState.name` 是否一起更新；`docName` 是 state，`docNameRef` 是异步回调/标题用的 ref，漏一个就会出现「标题新名、保存旧名」。
- `tree selected/scroll` 在 T2 才上提；T1 的 adopt 在 T2 前不能设 `focusPath/scrollTop`，只能先设 `activePath`，T2 再补。
- adopt 后 `refreshWorkspace()` 若按旧 path 找不到，`App.tsx:1710-1719` 会 `setActiveFile(null)`/`saveTargetRef=null`，把刚 adopt 的身份清掉。必须让 refresh 跳过刚改名的节点，或先 refresh 再 adopt。

**修**：`adopt` 统一更新 `docNameRef`/`fileRef`/`__slState`；`refreshWorkspace({ skipPath: newPath })`；顺序「adopt → refresh(skip)」；补「标题/顶栏/`__slState`/Ctrl+S 落点」四条断言。

## H4（major）T2 状态上提与 T3 tablist

- T2 `:40-42` 把 `expanded/scrollTop/focusPath` 提到 App；但 `focusPath` 的优先级只写「可见则 focusPath → 否则 activePath → 否则 rows[0]」；切页签、折叠祖先、刷新、改名四种情况没有逐条写。切页签不卸载状态、折叠祖先后 active 不可见时回退到哪个祖先、刷新后 focusPath 是否保留，都会影响「树始终 1 个 tabindex=0」。
- T3 `:62-64` 的 tablist `aria-controls` 没有固定 panel id；如果只写 `aria-controls="files"`，panel 实际 id 不存在，屏幕阅读器仍断链。
- T3 `:63` 的 `aria-current` 在 `Outline` 懒 chunk；要确保只改 `Outline.tsx`，不把 `Outline` 静态 import 回首屏。

**修**：固定 `tabbablePath` 优先级并写进 T2 验收；tablist 用 `sidebar-files`/`sidebar-outline` 固定 id；`Outline` 保持 `lazy`，T3 验收加「首屏 chunk 不含 Outline」。

## H5（major）866 B 余量与 P4/P3 延后

当前 284,134，余 866；估算 +485–720 → 284,619–284,854。内部目标 284,800，**上限 285,000**；T5 `:100` 的超线顺序：

```
P4「展开态+空文件夹」→ P3 tablist；P0 rename、P1 aria-current、P2 缩进不砍
```

但：

- P4 对应 T2 验收 `:49`「切页签展开数/scrollTop 不变」和 `:50` 空文件夹提示；
- P3 对应 T3 验收 `:66` tablist；
- T2/T3 在 T5 之前完成；T5 砍 P4/P3 后，T2/T3 的验收项变成「未做」，但计划写「P4/P3 可延后」，没有把 T2/T3 验收拆开。

**修**：T2/T3 验收拆「P0/P1/P2 必过」与「P3/P4 可延后」；T5 砍 P4/P3 时在 `impl-a.md`/CHANGELOG 写「延后」；P4 被砍时 T2 的验收改成「延后项已记录」，不能判失败；P0/P1/P2 不砍。

## H6（major）非法名/`move` TypeError/最近记录

- `validateRename` 已挡 `\`，但 `move()` 对含 `\` 的名字会抛 `TypeError`；实现要 catch 兜底并给同一句文案，不能把 DOMException 英文拼给用户。
- `a.md`→`a.markdown` 同键跳过迁移，但 `recent.json` 旧条目仍保留旧路径；T4 `:79` 要写「最近记录不迁移」，README 要写「旧最近记录会失效」；T1 `:20` 已写 README「已知限制」，验收要加一条「旧最近条目打开给 FILE_GONE 且文案可读」。
- 结尾点/空格、保留名、`.` 开头已覆盖；`move` 的 `TypeError` 与 `isSameEntry` 异常是遗漏。

**修**：`validateRename`/`move` catch 统一文案；T1/T4 加最近记录失效断言；README/ADR 明确。

## 逐项核对记录

### T1
- 三入口（`⋯`/右键/F2）、行内输入、Esc/blur 取消、IME `isComposing`、失败就地报错，方向对。
- `getFileHandle`+`isSameEntry` 探测覆盖大小写/目标存在，方向对；TOCTOU/两段回滚是 H1。
- `adoptRenamedFile` 六处同步方向对；`docNameRef`/`fileRef`/`__slState`/refresh 顺序是 H3。
- 缓存迁移方向对；失败仍删旧键是 H2；`recent` 不迁移写文档（H6）。
- 目录/无句柄/示例不提供入口，方向对。

### T2
- 缩进公式 `6+(level−1)*14`、`visibleRows` 唯一层级、`aria-level` 同源，方向对。
- 状态上提覆盖切页签/折叠/刷新/改名四场景没有逐条写（H4）。
- 空文件夹/长名/`title` 方向对；验收要区分 P4 可延后（H5）。

### T3
- tablist roving、`aria-controls`、`aria-current` 懒 chunk，方向对；panel id 与「Outline 不回首屏」是 H4。
- 树内 tab 站与 tablist 的优先级要写清；P3 可延后（H5）。

### T4
- ADR-0014、ADR-0013 修正、README「改名后旧最近记录失效」「真实盘/宿主/OneDrive 未验」方向对。
- 0.26.0 条件化与 820,000/285,000 口径对；P4/P3 砍掉时要写「延后」而不是「已做」。

### T5
- 866 B 余量、+485–720 估算、P0/P1/P2 不砍、`--max 285000` 不改，方向对；P4/P3 与 T2/T3 验收冲突（H5）。
- 安装包 820,000 内部预算、硬线 850,000 不动，方向对。

### 通用
- 文件归属：A T1/T2/T3 串行改 `src/`、`rename-acceptance`/`tree-acceptance`；B T5/T4 串行改 `package.json`、文档；零并发重叠成立。
- 构建纪律：A `npx tsc --noEmit`/dev；B `.tmp/build-b`；根代理 build；成立。
- 可独立复现：T1/T2/T3 的 fake FS/CDP 脚本可复现；真实盘 `move()`/大小写/OneDrive/宿主仍是 UNVERIFIED（findings 已列）。

## 做对的地方（别改过头）

1. T1 的「探测 + isSameEntry + 目标已存在拒绝 + 不 copy 回退」方向正确；只需补 TOCTOU 二次探测与两段失败态。
2. T1 的缓存迁移「读旧→写新→删旧」是 B4 的正确路径；把失败分支改成「保留旧键」即可。
3. T2 的缩进公式与 `visibleRows` 单一层级来源、T3 的 `aria-current` 懒 chunk，方向正确；保留。

---

### 附：本次审查证据

- `plan.md:14-17`（探测/move、adopt、缓存迁移）；`:40-42`（状态上提）、`:62-64`（tablist）。
- `findings-bug.md:19-39`（move 覆盖）、`:45-66`（B2 refresh 清 activeFile）、`:89-108`（B4 缓存）、`:112-132`（B5 树）。
- `App.tsx:1710-1719`（refresh 清 activeFile）、`:1922-1930`（finishSaved path）、`:3430`（顶栏 docName）；`cache.ts:51-73`。
- `FileTree.tsx:62-67`（当前 useState）；`TreeActions.tsx`（懒加载）。
- 未改产品文件、未 commit；未生成新截图。
