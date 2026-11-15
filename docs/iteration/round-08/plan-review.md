# 第 08 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-08/plan.md`（基线 `94ceeda`，v0.20.0）。
审查方式：读计划、三份 findings、`host/Program.cs` 的关闭/草稿/消息段、`src/App.tsx` 的保存/草稿/关闭段、`useDialogFocus`、`SaveDialog`；未改产品文件、未 commit。
审查日期：2026-11-15。

## 结论：**REVISE**

H1（`FormClosing` 异步关闭与 `discard`/草稿失败路径）、H2（宿主草稿路径与 `cacheKey` 不一致、`draft-clear` 时序）、H3（自动保存与差异门/模态/IME 的竞态）是 blocker；H4–H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T5 的 `FormClosing` 写法自相矛盾：先 `e.Cancel=true`，又说 `ReadDirtyAsync()` 得 `false` 就「直接放行」——`FormClosing` 已经返回，必须再 `closeConfirmed=true; form.Close()`。`ReadDirtyAsync` 是 async，不能在 UI 线程 `.Result`；5 秒无答案后用户再点 × 会重复发 `close-request`；`discard` 不清草稿；`save-draft` 写失败没有失败分支，照样关窗 | `plan.md:95`；`host/Program.cs:1061-1091`（`ReadDirtyAsync` 30×100 ms）、`:131`（FormClosed 只 log）、`:1094-1119`（现有异步转发）；`plan.md:104`（禁止 `.Result`） | `FormClosing` 改成 `async void`：立即 `e.Cancel=true`，`await ReadDirtyAsync()`；`0` → `closeConfirmed=true; form.Close()`；`1/unknown` → 发一次 `close-request` 并置 `closePending`（重入直接 return）；5 s 超时清 `closePending`、窗口保留；`discard` 先 `draft-clear` 再关；`save-draft` 写失败留在窗口并显示错误，不 `Close()` | T5/T2 |
| H2 | blocker | T5 的草稿路径写 `<docDir>\.sidelight\drafts\<basename>.md`，但现有缓存键是 `cacheKey()`（去扩展名、40 字符截断，T1 还要加 4 位哈希）；`basename` 含 `.md` 会变成 `foo.md.md`，且与浏览器 `.sidelight/drafts/<cacheKey>.md` 读不到同一份。T1 保存成功即发 `draft-clear`，但 800 ms 防抖的 `draft-save` 计时器没取消，可能在 clear 后把草稿又写回来 | `plan.md:13-15,93-94`；`src/lib/cache.ts:30-52`（cacheKey/path）、`:37`（截断）；`plan.md:16`（T1 加哈希）；`plan.md:14`（800 ms） | 草稿路径统一由 `cacheKey(docName)` 生成（与浏览器 `.sidelight/drafts` 同键），不接收页面路径；`draft-clear` 前 `clearTimeout(draftTimer)` 并等 pending 的 `draft-save-result`；保存成功后先 clear 再允许新草稿；`/__draft` 与 `.sidelight/drafts` 用同一个 key；T1 的哈希改动补旧键读取/迁移 | T5/T1 |
| H3 | blocker | T3 的自动保存走 `requestSave`，但 `requestSave` 在 `losses.length > 0 && !saveWarned` 时会 `setPendingConfirm` 弹差异框；2 s 防抖从「当时 losses=0」排入后，用户刚输入 `[` 或 `[[` 使 `activeLosses` 变非空，自动保存仍可能调用并弹框。T3 的条件只写了触发时 `activeLosses.length===0`，没有在 `requestSave` 内禁止 auto 路径弹框，也没有排除 `pendingConfirm`、`pendingSwitch`、`close-request` 打开时的重入 | `plan.md:56-58`；`App.tsx:1691-1716`（requestSave/ pendingConfirm）、`:1708-1712`（losses 弹框）、`:1579-1615`（performCommit）；`findings-bug.md:125-140`（B4） | 给 `requestSave` 加 `mode: 'user' \| 'auto'`；auto 模式下 `losses>0` 直接不写并设「需手动保存」，绝不 `setPendingConfirm`；触发时再算一次 `activeLosses`；auto 前检查 `pendingConfirm===null && pendingSwitch===null && !closeRequested`；写盘前比较 mtime/size 与打开时记录；失败后保留草稿并暂停 | T3 |
| H4 | major | T2 的浏览器 `beforeunload` 只按 `dirty` 注册；自动保存已排队（2 s 内）时关页会先弹系统确认，随后自动保存又写盘，造成「明明会自动保存却先拦一次」的打扰。`CloseGuardDialog` 默认焦点虽写「取消」，但 `useDialogFocus` 取 `querySelectorAll(FOCUSABLE)[0]`；若 DOM 顺序或 disabled 状态变化，焦点可能不在「取消」 | `plan.md:33,36-37`；`useDialogFocus.ts:26-27`（首个可聚焦）、`:40-54`；`findings-ux.md:30-39`；`findings-bug.md:46` | `beforeunload` 条件改 `dirty && !autoSaveScheduled && !saving`；`CloseGuardDialog` 用 ref 显式把焦点放到「取消」按钮（不要依赖首元素）；`close-request` 到达时若 `pendingConfirm`/`pendingSwitch`/`saving` 存在，先等或先拒绝，避免叠两层模态 | T2 |
| H5 | major | T1 步骤 5 给 `cacheKey` 加 4 位哈希会改所有 `.sidelight` 缓存键，但只加了 `cache.test.ts`，没有迁移/回读旧键：现有草稿与**批注**（同一 `cacheKey`）会变成读不到的孤儿；用户升级后批注消失。T5 的 `/__draft` 又用另一套 `<basename>`，三套键（旧 cacheKey、新 hash cacheKey、宿主 basename）互不认 | `plan.md:16`；`cache.ts:30-52`；`App.tsx` 的 `readCache(...,'annotations',cacheKey(...))`；`plan.md:93`（`<basename>`） | 先统一 `cacheKey` 作为唯一键（草稿与批注共用），加哈希时保留旧键回读（旧键存在则读、写新键后删旧）；宿主草稿路径复用 `cacheKey(docName)`；`cache.test.ts` 加「长名撞键」与「旧键回读」两条 | T1/T5 |
| H6 | major | T4 的 `.dialog { max-height: calc(100vh - 24px) }` 没算 `.overlay` 的 20 px 内边距（可用高只有 `100vh - 40px`）；`.dialog-actions` sticky 后，底部按钮仍在 dialog 盒内，短视口下 dialog 可能超出 overlay 内容盒 16 px。`file-menu` 用 `width: max-content` + `max-width` + `white-space: nowrap`，超长项不会折行而是横向溢出（本轮虽不加最近文件，但「打开文件夹…」已接近上限） | `plan.md:77-79`；`styles.css:837-856`（overlay padding 20、dialog 无 max-height）、`:1002-1029`（menu min-width/按钮 flex）；`findings-ux.md:62-88` | `max-height: calc(100vh - 40px)`（或 `100dvh`）；`file-menu` 加 `overflow: hidden`/`text-overflow: ellipsis`，或对 label 单独 `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`；验收在 1024×768 实测 `dialog.top >= 20`、按钮底 ≤ `innerHeight-20` | T4 |

---

## H1（blocker）`FormClosing` 的异步关闭语义

计划 `:95`：

> `closeConfirmed` 未置时 `e.Cancel=true`；`ReadDirtyAsync()` 得 `false` → 直接放行；`true/unknown` → 发 `{type:'close-request'}` 并保持窗口。

`ReadDirtyAsync` 是 `async Task<string>`（`Program.cs:1061`），30 次 100 ms 轮询，最坏 3 s。`FormClosing` 是同步事件：

- 不能在事件里 `.Result`/`.Wait()`——WebView2 的 `ExecuteScriptAsync` 回调也在 UI 线程，会死锁。
- `e.Cancel=true` 后事件返回；若异步回包是 `0`，窗体不会自己继续关，必须再调用 `form.Close()`（且 `closeConfirmed=true` 防重入）。
- 计划 `:95` 写「得 false → 直接放行」没有写这个第二次 `Close()`，实现者会卡在「取消后永远关不掉」。
- 5 s 无答案后窗口保留；用户再点 × 会再次触发 `FormClosing`，再次发 `close-request`；页面会叠出第二个对话框。需要 `closePending` 守卫。
- `discard` 只 `closeConfirmed=true; form.Close()`，没有 `draft-clear`；用户下次打开会看到刚被 discard 的草稿。
- `save-draft` 写失败没有分支：T5 应回 `IO/NO_PATH` 并保持窗口，不能先 `Close()`。

**最小修法**：

```csharp
bool closeConfirmed, closePending;
async void OnFormClosing(object sender, FormClosingEventArgs e) {
  if (closeConfirmed) return;
  e.Cancel = true;
  if (closePending) return;
  closePending = true;
  string dirty = await ReadDirtyAsync();
  if (dirty == "0") { closeConfirmed = true; form.Close(); return; }
  Send("close-request");
  // 5 s 后 closePending=false，窗口保留
}
// close-answer:
// cancel -> closePending=false
// save-draft -> 写草稿成功才 closeConfirmed=true; form.Close()
// discard -> draft-clear 成功（或明确忽略失败）后 closeConfirmed=true; form.Close()
```

Alt+F4/任务栏关闭都走 `FormClosing`；注销/关机走 `SessionEnding`，可能不经过 FormClosing，保持 ADR UNVERIFIED。`close-answer` 的 `save-draft` 文本用页面消息里的 `text`（T2 发送），不要回读 `__slState`（只有 dirty/name，没有正文）。

## H2（blocker）草稿路径与 clear 时序

计划 T5 `:93` 写：

```
<docDir>\.sidelight\drafts\<basename>.md
```

现有 `cache.ts` 的路径是 `.sidelight/drafts/<cacheKey(fileName)>.md`：

- `cacheKey` 去扩展名、非安全字符换 `-`、40 字符截断；
- T1 `:16` 又要加 4 位哈希；
- `basename` 若指 `Path.GetFileName`（含 `.md`），会变成 `foo.md.md`；即使是 `GetFileNameWithoutExtension`，也不带 `cacheKey` 的清洗/哈希。

于是同一文档可能有：

- 浏览器 `.sidelight/drafts/<cacheKey>.md`
- 宿主 `.sidelight/drafts/<basename>.md`
- T1 新键 `<cacheKey+hash>.md`

`/__draft` 读不到浏览器草稿，T1 读不到旧键，T5 的探针只测自己写的那一套。**修**：所有草稿（宿主、浏览器、`/__draft`）统一用 `cacheKey(docName)`；路径不接受页面输入；T1 的哈希改动保留旧键回读。

**clear 时序**：T1 `:14` 800 ms 防抖写 `draft-save`；保存成功（`save-result ok`）立刻发 `draft-clear`。若最后一次编辑的 800 ms 计时器还没触发，clear 之后它会再写一条草稿，用户下次打开会看到已保存内容的「新草稿」。修：保存成功前 `clearTimeout(draftTimerRef)`，或 `draft-clear` 前等 `draft-save-result` 并设 generation；`draft-clear` 后用「已清」标记拒绝旧 generation 的迟到回包。

## H3（blocker）自动保存会弹差异框/写半截

T3 `:56-58`：

- 触发条件 `activeLosses.length === 0`；
- 写盘「走现有 `requestSave`，不得调用绕过差异门的路径」。

但 `requestSave` 内部（`App.tsx:1707-1712`）会重新算 `activeLosses`，`losses.length > 0 && !saveWarned` 就 `setPendingConfirm` 弹 SaveDialog。自动保存在以下时机会撞上：

1. 2 s 防抖从「losses=0」排入后，用户刚输入 `[`（或 `[[`、表格分隔行）使 losses 非空；
2. 用户手动保存的 `pendingConfirm` 还没关；
3. 切文档 `pendingSwitch`/关闭 `close-request` 正在等回包。

`requestSave` 当前没有 `auto` 模式，也没有排除 `pendingConfirm`/`pendingSwitch`，自动保存会在用户面前弹差异框，正好是「自动保存弹框打扰」。

**修**：`requestSave(mode: 'user'|'auto')`：

- auto：`losses>0` → 不写，状态栏「需手动保存」，**绝不 `setPendingConfirm`**；
- auto 前检查 `pendingConfirm===null && pendingSwitch===null && !closeRequested && !saving`；
- 触发时再算一次 `activeLosses`，并检查 `composingRef` 与 `compositionend` 400 ms；
- 写前比 `hostDoc.mtime`/`handle.getFile().lastModified`；不一致 → 暂停并提示；
- 失败 3 次停 auto，保留草稿。

T3 验收 `:62`（引用式链接不写）只覆盖「一开始 losses>0」；补「自动保存排队后输入 `[` → 不弹框、不写、chip 变需手动保存」和「pendingConfirm 打开时 auto 不触发」两例。

## H4（major）T2 的 beforeunload 与 CloseGuard 焦点

- `beforeunload` 只按 `dirty` 注册（`plan.md:33`），没有排除自动保存已排队/正在保存。T3 的 2 s 防抖期间用户关页，会先弹系统确认，紧接着自动保存又写盘；`findings-bug.md:46` 建议 `dirty && !autosavePending`。修：条件加 `!autoSaveScheduled && !saving`；如果自动保存已完成、dirty 已清，不注册。
- `CloseGuardDialog` 默认焦点「取消」不能只靠 DOM 顺序。`useDialogFocus` 取 `querySelectorAll(FOCUSABLE)[0]`（`useDialogFocus.ts:26-27`）；如果「保存草稿并关闭」被先渲染、或「取消」被 disabled，焦点会落到别处。修：`CloseGuardDialog` 用 `cancelRef.focus()` 显式设置，或在 open 后手动覆盖。
- `close-request` 到达时若 `pendingConfirm`/`pendingSwitch`/`saving` 还有模态，会叠两个对话框；T2 `:36` 只写等 `pendingHostSave`，没写其它。修：先关闭/等待这些模态，或把 `close-request` 排队。

## H5（major）`cacheKey` 加哈希的迁移

T1 `:16` 给 `cacheKey` 加 4 位哈希，但：

- `cacheKey` 同时用于 `.sidelight/drafts` 与 `.sidelight/annotations`（`App.tsx` 的 `readCache(..., 'annotations', cacheKey(...))`）；旧键不再被读，现有批注与草稿会消失。
- `cache.test.ts` 只加「撞键」测试，没有「旧键回读」。
- T5 `/__draft` 又用 `<basename>`，三套键互不认（H2）。

修：先统一 `cacheKey`；哈希改动保留旧键回读（旧键存在则读，写新键后删旧）；`cache.test.ts` 加「旧键仍可读」「长名不撞」两条；T5 复用 `cacheKey`。

## H6（major）T4 的 max-height 与菜单宽度

- `.overlay { padding: 20px }`（`styles.css:837-847`），`.dialog` 的 `max-height: calc(100vh - 24px)` 比可用内容盒多 16 px；1366×768 下 dialog 高 744、top 12，虽然还在视口内，但顶部已进入 overlay 的 padding 区，`position: sticky` 的 `.dialog-actions` 底边贴的是 dialog 盒，不是视口；应改 `calc(100vh - 40px)`，验收断言 `dialog.top >= 20 && saveButton.bottom <= innerHeight - 20`。
- `.file-menu` 用 `width: max-content; min-width: 208px; max-width: min(360px, calc(100vw - 24px))` 加 `white-space: nowrap`；超长项不会折行，会横向溢出 box（本轮四项短，但下轮加最近文件就会撞）。加 `overflow:hidden` + label 的 `text-overflow: ellipsis`，或 `max-width` 内允许 `kbd` 固定、label 截断。
- T4 其余（`sticky` 背景、四档 1440/1280/1366/1024、file-menu 四项 ≤40 px）方向对。

## 逐项核对记录

### T1
- 宿主文档 `onUpdate` 无任何落点的现状确认（`findings-bug.md:37-40`）；`draft-save` 协议、800 ms、启动 `/__draft` 比较 mtime 的方向对。
- 恢复后 `dirty=true`、基线原文件、状态栏的语义正确；`rawTextRef` 由 T2 负责，T1 不应把它设成草稿正文，否则源码模式会把草稿当原文。
- 路径/键不一致（H2）、clear 时序（H2）、cacheKey 迁移（H5）是主要风险。

### T3
- `requestSave` 是唯一保存入口（`:1692`），自动保存复用它方向对；但 `requestSave` 没有 auto 模式，仍可能弹 `pendingConfirm`（H3）。
- `composingRef`、2 s/400 ms、mtime、失败退避、状态栏 chip 的方向对；补「排队后 losses 变非空」「pendingConfirm 打开」两例。

### T2
- `beforeunload` 在 dirty 时注册、不 dirty 时移除方向对；需加 `!autoSaveScheduled && !saving`（H4）。
- `CloseGuardDialog` 三个动作与 T5 的 `close-answer` 字段一致；默认焦点要显式（H4）；`save-draft` 正文由页面消息给（T5 用回传 text）。
- 切文档「放弃改动」改「不保存」与 Windows 惯例一致；保留。

### T4
- `.dialog max-height/sticky`、`.file-menu` 宽度方向对；`max-height` 应减 overlay 的 40 px，file-menu 要处理超长项溢出（H6）。
- 1366×768/1024×768 的验收阈值要写成「top ≥20、button bottom ≤innerHeight−20」，不能只看 `scrollWidth`。

### T5
- `/__draft` 只由宿主计算路径、严格 UTF-8、6 MB 上限、`File.Replace`、`Cache-Control/ Host` 方向对；草稿路径键与 `draft-clear` 时序是 H2。
- `FormClosing` 异步关闭是 H1；`discard` 清草稿、`save-draft` 失败保持窗口必须补。
- 0.21.0、CHANGELOG/README/AGENTS、`draft-probe` 四条方向对；体积 799,631 + 约 3–4 KB < 805,000，余量够。

### 通用
- 文件归属：A T1/T2/T3/T4 串行改 `src/`；B T5 改 `host/`、文档、`package.json`；零并发重叠成立。T1/T2 的宿主真实段依赖 T5，计划 `:118` 已写「T5 后重做 `.tmp/host-a`」，正确。
- 构建纪律：A `.tmp/build-a` + `.tmp/host-a`；B `.tmp/host-b`；根代理最终 build；成立。
- 独立复现：T1/T2/T3 的浏览器段可用 mock；宿主段依赖 T5；真实 Alt+F4/注销、真实 IME、HKCU 保持 UNVERIFIED。

## 做对的地方（别改过头）

1. T5 用 `FormClosing` + `e.Cancel` + 异步回包，且明确「禁止 `.Result`」，方向正确；只需补 `closeConfirmed`/`closePending`/`discard` 三个边界。
2. T1 把宿主草稿落到文档同目录 `.sidelight/drafts`，并比较 mtime 提示恢复，方向正确；路径键统一到 `cacheKey` 后即可。
3. T3 的「有损失不写、组合中不写、失败退避、状态栏反馈」边界清单完整，不要为了少弹框改成静默写盘。

---

### 附：本次审查证据

- `host/Program.cs:1061-1091`（异步 `ReadDirtyAsync`）、`:131`（仅 FormClosed 日志）、`:1094-1119`（现有异步转发）。
- `App.tsx:1691-1716`（`requestSave` 的差异门）、`:1579-1615`（`performCommit`）。
- `cache.ts:30-52`（`cacheKey`/路径）、`:37`（40 字符截断）。
- `styles.css:837-856`（overlay padding 20、dialog 无 max-height）、`:1002-1029`（menu 宽度）。
- `findings-bug.md:37-56,125-140`；`findings-ux.md:30-39,62-88`。
- 未改产品文件、未 commit；未生成新截图。
