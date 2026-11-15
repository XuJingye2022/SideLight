# 第 12 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-12/plan.md`（基线 `6bd6831`，v0.24.0）。
审查方式：读计划、三份 findings、`src/App.tsx` 的删除/自动保存/刷新段、`src/lib/workspace.ts`、`src/components/FileTree.tsx`、`src/lib/cache.ts`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（删除与已排队的自动保存/正在写/`pendingConfirm` 竞态）、H2（trash 的 copy 校验与命名/路径边界）是 blocker；H3–H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T2 `:36` 的清理顺序只 `cancelAutoSaveRef()`（清 2 s 计时器），没有处理**已经在飞**的 `runAutoSave`/`performCommit`，也没有取消 `pendingConfirm`、`pendingSwitch`、手动 `saving`。`runAutoSave` 在 `await performCommit` 前捕获 `activeFile.handle`；删除后它仍会 `createWritable()` 写回原路径，B1 的「复活」照样发生。`cancelAutoSaveRef` 也不清 `autoSaveScheduled` 的 state。 | `plan.md:36`；`App.tsx:2215-2266`（runAutoSave/performCommit）、`:1804-1810`（target 捕获）、`:2284-2291`（schedule）、`:2185-2190`（cancel 只清 timer）；`findings-bug.md:22-43` | 删除前先置 `deletingRef=true` + `autoSaveGeneration++`；`runAutoSave`/`performCommit` 写前检查 generation/activeFile 仍是同一句柄，否则不写；删除时 `cancelAutoSave()`、`setAutoSaveScheduled(false)`、清 `pendingConfirm`/`pendingSwitch`（或等它们结束）、`await savingRef` 再删；写回成功后再校验一次路径存在，失败不重试 | T2 |
| H2 | blocker | T1 `:12-13` 的 trash：`uniqueTrashName` 先 `getFileHandle(name)`（`create:false`）探测，再 `move`/`createWritable`，探测与写入之间**没有原子性**，并发/同秒仍可能覆盖；`move` 失败回退只校验 `size` 一致，**size 相同内容不同**（截断/编码）仍会删原件；`trashName` 只挡 `/` 与保留名，没有挡 Windows 的 `<>:"\\|?*`；`deleteFileToTrash(root, name)` 只收根目录 + 文件名，**子目录里的同名文件**会被删/移错目录。 | `plan.md:12-13,21-25`；`findings-bug.md:75-90`（create:true 截断、`/` 报错）；`workspace.ts:87-107`（readDirectory 只收 md）、`:135-153`（parentDirectory） | 命名直接带 4–6 位随机哈希，`create:false` 探测失败即换名；copy 后做**内容校验**（逐块比较或 SHA-256）再 `removeEntry`，校验失败保留原件；`trashName` 清洗 Windows 非法字符与保留名；`deleteFileToTrash` 接收 `WorkspaceFileNode`（含完整 path）或 `parent + name`，trash 固定工作区根 `.sidelight/trash`；补「子目录同名」「并发同名」「size 相同内容不同」三例 | T1 |
| H3 | major | T2 `:40` 刷新按 path 重绑句柄，但 FSA 没有绝对路径；外部**改名**后旧 path 消失，`activeFile` 仍持旧句柄；外部**删除**后刷新只提示「已不在磁盘上，保存会重新创建」，**没有清旧句柄/禁止写**，`Ctrl+S`/自动保存仍可复活。刷新期间用户编辑/自动保存没有 cancel/generation，刷新回来的新句柄可能覆盖正在写的旧目标。 | `plan.md:32,40,47`；`findings-bug.md:61-71`（B3 两坑）；`App.tsx:1569`（activeFile 只 loadIntoEditor 设）、`:1804-1810` | `refreshWorkspace` 先 `deletingRef`/`refreshingRef` 并 `cancelAutoSave()`；重读后按 path 重绑，path 不存在时 `setActiveFile(null)` + 清 `saveTargetRef` + 标「已删除」；改名场景保留提示但**不保留可写旧句柄**；刷新期间禁止自动保存，刷新后按新句柄恢复；补「外部删除后 Ctrl+S 不复活」「外部改名后保存写到新名字或不写」 | T2 |
| H4 | major | T5 `:97-102` 说 282,809 只剩 2,191 B，新代码 +1.2–2.1 KB，**内部目标 284,000**；超 285,000 时先延后侧栏 `role=tablist/tabpanel` 与大纲 `aria-current`。但 T3 的验收 `:69` 明确要求这些属性，T3 先于 T5，延后只能在 T3 内做；T4 `:83` 又已写 `## 0.25.0`，T5 未过时不会改版本，T4 的 0.25 文案会先发布。 | `plan.md:97-107,69,83`；`findings-ship.md` 的 2,191 B/0.25 口径 | T3 验收拆「核心（tree/roving/焦点）」与「可延后（tablist/outline aria）」；T5 超线时在 `impl-a.md` 记录延后项并让 T3 验收按拆分表通过；T4 的 0.25 段等 T5 `measure` 返回码后再落，否则写「0.25.0 未发布：首屏超线」 | T3/T4/T5 |
| H5 | major | T3 `:63` 在 App 根加常驻 `<div role="status" aria-live="polite">{notice?.text}</div>`；现有 toast 本身也是 `role="status"`/`aria-live`（findings B5 `:104`），同一次 notice 会被播报两次。`roving tabindex` 的树只有一个 Tab 站，但树内 `Tab` 与现有全局快捷键/编辑器 Tab 缩进、`Ctrl+Alt+E` skip link 的优先级没写；`Delete` 在树内与编辑器删除的 `stopPropagation` 也要明确。 | `plan.md:59-65`；`findings-bug.md:96-108`；`App.tsx` 的 toast/Notice 结构 | 只保留**一个** live region：把 toast 改成 `aria-live="polite"` 的视觉 toast + 单独 `role=status` 文本节点二选一，另一个 `aria-hidden`；树 `keydown` 对 `Tab` 不拦截，`Delete`/`Shift+F10` 在树内 `preventDefault` 且 `stopPropagation`；补「一次 notice 只播一次」「树内 Tab 离开树」「树内 Delete 不删正文」三条断言 | T3 |
| H6 | major | T1 `:14` 新建文件夹用 `root.getDirectoryHandle(name,{create:true})`；FSA 对**已存在目录**返回同一个 handle，不抛错，所以「重名给已存在同名文件夹」不会发生，用户会以为新建成功。`ensureTrashDir` 的 `.sidelight` 若已是文件，`getDirectoryHandle` 抛 `TypeMismatchError`；T1 `:12` 虽写返回 null，但新建文件夹/删除入口的失败提示未接。 | `plan.md:12,14`；`findings-bug.md:84`（TypeMismatch/cache 返回 null）、`:75-82`（create:true 语义） | 新建文件夹先 `getDirectoryHandle(name)`（`create:false`）探测，存在则提示「已存在同名文件夹」，不存在再 `create:true`；trash 目录失败时把删除/新建按钮 disabled 并给原因；补「已存在目录不静默成功」「`.sidelight` 是文件时删除禁用」 | T1 |

---

## H1（blocker）删除与自动保存的竞态

findings B1 已实测：

```
removeEntry ok
staleWrite ok: wrote
afterStaleWrite ["live.md"]
```

自动保存路径：

```
onUpdate → scheduleAutoSave (2 s)
→ runAutoSave
→ performCommit(normalized, withEol)
→ target = saveTargetRef.current ?? activeFile.handle
→ writeNode(target, ...)
```

T2 `:36` 的顺序是：

```
cancelAutoSaveRef.current()
clearTimeout(draftTimer)
setDirty(false)
if activeFile: saveTargetRef=null; setActiveFile(null); mark deleted
```

这只能取消**还没触发**的 2 s 计时器。若 `runAutoSave` 已经进入 `await performCommit`，它捕获的 `target` 仍是旧句柄；`setActiveFile(null)` 不会改变已经捕获的局部变量，2 s 后写回照样复活。`pendingConfirm` 的 `runSave` 也可能在删除确认框打开期间持有旧 target；`saving` 手动保存同理。

**修**：

1. `deletingRef` + `autoSaveGeneration`；`runAutoSave`/`performCommit` 在 `await writeNode` 前检查 generation 与 `activeFile?.handle === target.handle`，不一致直接返回 `false`，不写。
2. 删除前 `cancelAutoSave()`、`setAutoSaveScheduled(false)`、清 `pendingConfirm`/`pendingSwitch`（或等它们结束），`await savingRef` 再删。
3. `writeNode` 成功后若 `deletingRef` 已置，**再删一次原路径**（防止写回与删除交错），但不要递归删目录。
4. 补「删除后立刻输入，3 s 内 autosave 写入次数 0」「删除时正在手动保存」两例。

## H2（blocker）trash 的 copy 校验、命名与路径

T1 `:13` 的回退：

```
getFile() → 写 trash 副本 → 校验 size 一致 → removeEntry(name)
```

`size` 一致不等于内容一致：

- 写入被截断但恰好相同 size；
- 编码/换行被转换，size 也可能相同；
- 磁盘满/写入部分失败在 `close()` 前可能不抛。

应做内容校验：逐块比较源 `File` 与 trash 文件，或 `crypto.subtle.digest('SHA-256')` 两边比较；失败保留原件并删 half trash。

命名：

- `uniqueTrashName` 用 `getFileHandle(name)`（`create:false`）探测，然后 `move`/`createWritable`；探测与写入之间另一个删除/另一个窗口可插入同名，仍会覆盖。
- `trashName` 只挡 `/` 与保留名；Windows 文件名还禁 `<>:"\|?*`，`move`/`createWritable` 会抛。
- `deleteFileToTrash(root, name)` 的 `root` 若是工作区根，子目录同名文件会被 `root.removeEntry(name)` 删错；若是文件父目录，trash 路径又不在根 `.sidelight`。需要 `WorkspaceFileNode`（完整 path）或显式 `parent + name`。

**修**：

- 命名 `YYYYMMDD-HHmmss-<4 位随机>-<清洗后的名字>`，随机位消除并发；
- copy 后 SHA-256/逐块校验，再 remove；
- 清洗非法字符与保留名；
- `deleteFileToTrash(rootHandle, node)` 用 `parentDirectory` 找父目录，trash 固定根 `.sidelight/trash`；
- 补「子目录同名」「size 相同内容不同」「名字含 `:`」三例。

## H3（major）刷新后的句柄与外部删除

T2 `:40` 按 path 重绑，但：

- FSA 没有绝对路径；`path` 是树内相对路径，外部改名后 path 消失，`activeFile` 仍持旧 `FileSystemFileHandle`。旧句柄可能仍指向改名后的文件，用户按 `Ctrl+S` 会写到**新名字**；也可能失效。
- 外部删除后刷新只提示「已不在磁盘上，保存会重新创建它」，**没有清 `saveTargetRef`/`activeFile` 句柄**；自动保存仍会走旧句柄复活（H1）。
- 刷新是异步读盘；用户刷新期间编辑/自动保存，旧目标可能在读盘后写回。

**修**：

- `refreshWorkspace` 开始置 `refreshingRef`、`cancelAutoSave()`；结束再恢复；
- path 找不到：`setActiveFile(null)`、`saveTargetRef=null`、标「已从磁盘删除」，保存只能另存为；
- path 找到：用新 `FileSystemFileHandle` 替换 `activeFile.handle`，保留内容；
- 外部改名无法凭 path 识别，明确提示「已改名/移走，请重新打开」；
- 补「外部删除后 Ctrl+S 不复活」「刷新期间编辑不写旧目标」。

## H4（major）T5 的首屏门与 T3 延后项

当前 282,809 B，余量 2,191 B；T5 估算新代码 +1.2–2.1 KB，**内部目标 284,000**，几乎必超。T5 `:102` 的延后顺序是「侧栏 tablist/tabpanel → 大纲 aria-current」，但这两项在 T3 验收 `:69` 里是必过项；T3 先于 T5 执行，T5 没有权限把 T3 的验收改成「可延后」。

另外 T4 `:83` 已写 `## 0.25.0 — 2026-11-16`，T5 `:103` 才决定是否升 0.25.0；若首屏 >285,000，T4 的 0.25 文案会先于版本决定存在。

**修**：

1. T3 验收拆「核心（tree/roving tabindex/焦点/aria-selected）」与「可延后（tablist/tabpanel、大纲 aria-current）」；T5 超线时只延后可延后项，核心项必须过。
2. T4 的 0.25 段在 T5 `measure` 通过后再落；未通过写「0.25.0 未发布：首屏 X B 超线，延后项 Y」。
3. `measure-first-screen.mjs` 当前已收 `modulepreload`/`preload`，T5 只读调用；保留 `--max 285000`，不许改默认。

## H5（major）T3 的 live region 与键盘

Plan `:63`：

```
<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice?.text ?? ''}</div>
```

现有 toast 也是 `role="status"`/`aria-live`（findings B5 `:104`）。同一次 notice 会进入两个 live region，屏幕阅读器可能播两遍；若 toast 是 `role=alert`，错误还会和常驻 `polite` 抢。

**修**：

- 只保留一个 `role="status"`：常驻节点承载文本，视觉 toast 改成 `aria-hidden="true"`；或反过来，常驻节点只在 toast 不存在时存在。
- `roving tabindex` 与全局 Tab：树内 `Tab` 不 `preventDefault`，让焦点离开树；`Ctrl+Alt+E` skip link 在 App 层只处理一次。
- 树内 `Delete`/`Shift+F10` `preventDefault` + `stopPropagation`，避免编辑器/全局快捷键同时响应。
- 补「一次 notice 只一个 live region 更新」「树内 Delete 不删正文」「Tab 从树离开」三条断言。

## H6（major）新建文件夹与 `.sidelight` 冲突

`getDirectoryHandle(name, {create:true})` 对已存在目录**返回同一个 handle，不抛错**。Plan `:14` 说「重名给已存在同名文件夹」，但代码不会知道重名。必须先 `getDirectoryHandle(name)`（`create:false`）探测；存在 → 提示；不存在 → `create:true`。

`ensureTrashDir` 的 `.sidelight` 若是文件，`getDirectoryHandle('.sidelight')` 抛 `TypeMismatchError`；T1 `:12` 说返回 null，但新建文件夹/删除入口没有接这个失败态，用户会看到「点了没反应」。

**修**：

- 新建文件夹先 `create:false` 探测；
- `.sidelight` 失败时删除/新建按钮 `disabled` + `title` 原因；
- 验收加「已存在目录不静默成功」「`.sidelight` 是文件时删除禁用」。

## 逐项核对记录

### T1
- 树头 `[＋ 新建 ▾] [⟳] [⋯]`、行级 `⋯`/右键/Delete、确认框默认取消，方向对。
- 文件夹删除不提供入口，符合 B2；Demo 文案对。
- trash 用 `move` 优先、copy→校验→remove 回退，方向对；size 校验/命名并发/子目录 path/非法字符是 H2。
- 新建文件夹 `create:true` 重名静默成功是 H6。

### T2
- 清理顺序的意图对；`cancelAutoSave` 只清 timer，未处理 in-flight/pending（H1）。
- 刷新 `readDirectory` 逐项 try/catch、按 path 重绑，方向对；外部删除/改名/刷新期间编辑（H3）。
- 撤销 move 回原名、不同自动重开，方向对；无 move 时 copy 回+删 trash 副本要同样校验（H2）。

### T3
- `role=tree/treeitem`、roving tabindex、方向键、侧栏 tab、大纲 `aria-current`，方向对。
- live region 重复、Tab/Delete 冲突（H5）。
- `role=tree` 的 `treeitem` 直接子级与 `role=group` 已在计划 `:73` 提醒；保留。

### T4
- ADR-0013、README 的「只本机、不自动清理、无应用内恢复、卸载不删」口径正确；不写「无障碍达标」也对。
- 0.25 段必须等 T5 条件（H4）。

### T5
- `measure` 已含 modulepreload/preload，`--max 285000` 未抬线，方向对。
- 2,191 B 余量与 +1.2–2.1 KB 估算说明本轮极紧；T3 延后项与 T4 0.25 文案要按 H4 处理。

### 通用
- 文件归属：A T1/T2/T3 串行改 `src/`、`tree-acceptance`；B T4/T5 串行改文档/`package.json`；零并发重叠成立。
- 构建纪律：A `npx tsc --noEmit`/dev；B `.tmp/build-b`；根代理 build；成立。
- 可独立复现：T1/T2 的 OPFS 替身可复现；T3 的键盘/AX 断言可跑；T5 的 measure 可跑；真实宿主/网络盘/只读目录保持 UNVERIFIED。

## 做对的地方（别改过头）

1. T1 的「优先 move、回退 copy→校验→remove、绝不覆盖」方向正确；只需把 size 校验升级为内容校验、把命名做成并发安全。
2. T2 的「取消计时 → 清 dirty → 清句柄 → 切文档」顺序和「删除当前文档后打开下一篇」是 B1 的正确修法；补 in-flight/pending 即可。
3. T3 的 `role=tree` + roving tabindex + 单一 tab 站，和 T4 的「只写属性、不写达标」口径，方向正确。

---

### 附：本次审查证据

- `App.tsx:2215-2266`（runAutoSave/performCommit）、`:1804-1810`（target 捕获）、`:2284-2291`（schedule）、`:2185-2190`（cancel）、`:1569`（activeFile 只在 loadIntoEditor 设）。
- `workspace.ts:87-107`（readDirectory 无 try/catch）、`:135-153`（parentDirectory）。
- `FileTree.tsx:5-15`（无刷新/删除 props）、`:84-106`（无 roving/role）。
- `cache.ts:51-58`（cacheKey 只按文件名）；`findings-bug.md:22-43,61-71,75-90,96-108`。
- `scripts/measure-first-screen.mjs` 已含 modulepreload/preload；`plan.md:97-107` 的 2,191 B。
- 未改产品文件、未 commit；未生成新截图。
