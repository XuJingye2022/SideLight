# 第 04 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-04/plan.md`（基线 `db4f617`，v0.17.0）。
审查方式：读计划、三份 findings、`src/App.tsx` 保存/导出段、`src/lib/workspace.ts`、`host/Program.cs` 下载/导航段；在 `.tmp/` 启动当前宿主实测 `showSaveFilePicker`（未改产品文件、未 commit）。
审查日期：2026-11-15。

## 结论：**REVISE**

H1（T1 的保存类型、持久提示、文档身份三处互相打架）、H2（T4 的只读验收用了 T1 的旧宿主副本）是 blocker；H3–H6 会把验收做假或让发布文档/CI 返工。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 的 `saveAsFile` 返回类型写成 `Promise<FileWriteTarget \| null>`，但步骤又说「不存在时返回 `'unsupported'`」——`tsc` 会直接拒绝。成功提示说「不自动消失」，可现有 `notice` 只对 `kind==='error'` 不自动消失；普通 `info` 6 秒被清。成功后的「文档身份」只写 `saveTargetRef + docName`，没写 `commitSave`/`activeFile` 怎么用它，第二次 `Ctrl+S` 可能又走 picker | `plan.md:12-15`；`workspace.ts:29-39`（无 save picker 类型，也无 `FileWriteTarget`）；`App.tsx:882-885`（info 6 s 清空）、`:1100-1138`（`commitSave` 只认 `activeFile.handle`）；`plan.md:19` 验收要求 10 s 后仍在 | 类型改成 `'unsupported' \| FileWriteTarget \| null`（或返回一个带 `kind` 的对象）；给 `notice` 加 `persist?: boolean` 并让计时器跳过；成功时构造带 `handle` 的 file 节点并交给 `commitSave`，验收加「第二次 Ctrl+S 不再弹 picker、写同一文件」 | T1 |
| H2 | blocker | T4 依赖 T5a 往 `sidelight.doc.v1` 注入 `readOnly:true`，但 T4 的验收按「构建纪律」起 `.tmp/host-t1`——那是 T1 开头从 `host/bin` 复制的副本，早于 T5a 的 `host/build.ps1`；该副本没有 readOnly 标记，T4 无法通过。验收也没覆盖「普通打开文件不显示横幅」 | `plan.md:4,71-73,76`；`plan.md:4` 的 `Copy-Item host/bin .tmp/host-t1`；T5a `plan.md:86` 才注入 readOnly；T4 验收 `:73` | T4 启动前重新 `host/build.ps1` 并重拷 `.tmp/host-t1`，或让 T5a 产出独立宿主目录；增加普通文件不出现横幅的断言；T4 验收注明它依赖 T5a 的哪个 commit/产物 | T4 |
| H3 | major | T2 的「新建」没有处理未保存改动：计划只写「无文件夹 → 空正文…」，没写先确认；有文件夹时 `getFileHandle('未命名.md',{create:true})` 建了文件，但 `workspace.root` 是载入时快照，计划没写刷新树，验收「树里出现未命名.md」可能不成立 | `plan.md:36-37,42-45`；`workspace.ts:72-114`（`readDirectory` 只在 `pickWorkspace` 时跑一次）、`:20-26`；`App.tsx:1181-1263`（Ctrl+N 不存在，新建也没接 dirty 确认） | 新建前复用 `requestLoad`/现有 `pendingSwitch` 确认；创建文件后重读 `rootHandle` 或往 `workspace.root.children` 插节点；验收加「有脏改动点新建会出现确认」与「树头新文件可见」 | T2 |
| H4 | major | T5a 的 `DownloadStarting` 只写了「有测试目录就设 ResultFilePath/Handled，否则弹 SaveFileDialog」；没写 `SaveFileDialog.FileName`/`InitialDirectory`（用户拿到的默认文件名/目录未定），也没明确对话框分支是否置 `Handled=true`（不置可能同时触发 WebView2 默认下载）。真实系统保存对话框仍只能标 UNVERIFIED | `plan.md:85`；当前 `host/Program.cs` 无 `DownloadStarting`（grep 0）；`findings-ux.md:44`、`findings-bug.md:56` | `FileName = e.SuggestedFileName`、`InitialDirectory = 上次目录/下载目录`；两个分支都 `Handled=true`；日志记最终路径；真实对话框 UNVERIFIED 写进 T5a 验收 | T5a |
| H5 | major | T5b 要改 `docs/adr/0004` 的 Tauri 触发条件（`plan.md:90`），但 T5 文件表（`:83,110`）没有这个文件；README/CHANGELOG 的收尾依赖 T1/T2 结果，计划只列「B-note 三句」，没列 README 的 B10「下一步：新建与另存为」和 CHANGELOG 的新建/另存为条目；840,000 B 安装包线只剩 12,802 B 余量，T1/T2 的 UI 代码一进去就可能顶破 | `plan.md:87-90,96-97,110`；`findings-ship.md:398-407`（840k 高风险）、`:24`（当前 827,198 B）；`README.md` 的「下一步」仍列新建 | 把 `docs/adr/0004` 写进 T5 独占文件；B-note 扩展为「README B10 / AGENTS §6 / CHANGELOG 新建与另存为」三条，且由根代理在 T1/T2 结果后放行；840k 改为 T1/T2 后实测再定，或先留 850k 预算并写理由 | T5b |
| H6 | major | 并行隔离只到文件，没到 `host/bin`：T1 在开头把 `host/bin` 拷到 `.tmp/host-t1`，T5a 同时跑 `host/build.ps1` 重建 `host/bin`；T1 的宿主验收可能拷到半套 `www`/旧 exe，T4 又复用这份副本。T1 的「不支持 picker → 下载」分支只在浏览器测，T5a 的 download-probe 测的是导出，不是「保存降级 → DownloadStarting」 | `plan.md:4`（T1 拷贝、T5a `host/build.ps1`）、`:24`、`:73`；`host/build.ps1:27`（先删 `www` 再写）；`plan.md:23`（宿主不测不支持分支）、`:86`（T5a 测导出） | 给宿主产物固定快照：T1/T4 只用 `.tmp/host-base`，T5a 产出 `.tmp/host-t5a`，两者不共享 `host/bin`；再补一条「unsupported → 下载 → DownloadStarting 落盘」的集成验收（T5a 完成后） | T1/T4/T5a |

---

## H1（blocker）T1 的三处不一致

**1. 返回类型自相矛盾。** 计划 `:12` 的签名是 `Promise<FileWriteTarget | null>`，同句又写「`showSaveFilePicker` 不存在时返回 `'unsupported'`」。`workspace.ts` 里没有 `FileWriteTarget`，也没有把 `'unsupported'` 放进联合类型；`npx tsc --noEmit` 会报 `Type '"unsupported"' is not assignable to type 'FileWriteTarget | null'`。除非 T1 同时改类型定义，否则门禁第一步就红。

**2. 持久提示没写实现。** 计划 `:13` 要求成功提示「不自动消失」，`:16` 只加 `.notice-persist` 的 CSS；`App.tsx:882-885` 的定时器对 `kind==='info'` 仍会在 6 秒后 `setNotice(null)`。验收 `:19` 要求 10 秒后仍在，现计划必失败。要么给 `Notice` 加 `persist` 字段并在定时器里跳过，要么成功提示改用 `kind:'error'`（但会变红，不建议）。

**3. 第二次保存去哪没定义。** 计划 `:13` 只写 `saveTargetRef + docName`。当前 `commitSave`（`App.tsx:1111`）只判断 `activeFile?.handle`；`saveFile`（`:1148`）也不读 `saveTargetRef`。如果 T1 不把新句柄装进 `activeFile`（或改 `commitSave` 读 `saveTargetRef`），用户第一次另存为成功后，第二次 `Ctrl+S` 仍会走无句柄分支、再弹 picker 或下载——正是「假保存」的变种。验收 `:19` 只查 OPFS 文件与 dirty，没有查第二次保存。

**4. 真实 picker 的结论。** 我在当前宿主（`http://127.0.0.1:47821`，WebView2 157）实测：

```text
origin=http://127.0.0.1:47821  secure=true
dir=function  save=function  open=function
```

`showSaveFilePicker` 存在、`isSecureContext` 为 true；但**真实系统保存对话框没有打开**，T1 的宿主验收用 `addInitScript` 桩替换了 picker（`:17`），所以「安装版里 Ctrl+S 真的弹系统对话框」仍只能 UNVERIFIED。计划 `:24` 已诚实标注；补法应写成「安装版人手点一次」，不能把 T1 的 Demo 说成已验证。

**5. dirty 四种状态。** 验收 `:22` 覆盖「打字 → true、撤销 → false、保存 → false、再打 → true」，但没有「连续保存两次」「保存后继续编辑再撤销回保存基线」「宿主 argv 注入后的初始基线」「恢复草稿后的初始基线」。T1 目标正是这四种，补断言。

## H2（blocker）T4 的 readOnly 验收带着旧宿主

计划 `:4` 规定 T1 开头 `Copy-Item host/bin .tmp/host-t1 -Recurse`；T4 的验收 `:73` 又按「构建纪律」起 `.tmp/host-t1`。但 readOnly 标记是 T5a 在 `host/Program.cs` 里注入的（`:86`），T5a 会跑 `host/build.ps1` 重建 `host/bin`。T1 的拷贝发生在 T5a 之前还是之后没有定义；按并行时间线，T4 拿到的 `.tmp/host-t1` 很可能没有 readOnly 标记，横幅不会出现，T4 必 FAIL。

另外 T4 的风险 `:76` 说「普通打开文件（有句柄）不得出现横幅，验收要覆盖两条路径」，但验收 `:74` 只写 readOnly 一条；tester 无法独立验证「不误报」。

**最小修法**：T4 启动前重跑 `host/build.ps1`，从**当前** `host/bin` 重拷 `.tmp/host-t4`；T5a 的产物用单独目录（`.tmp/host-t5a`）；验收增加普通文件无横幅的断言。

## H3（major）T2 的新建/另存为状态机

- **未保存改动**：计划 `:36` 的「新建」直接清空/建文件，没有说先走 `requestLoad` 的 dirty 确认；用户正在写的内容会被静默替换。`App.tsx:971-981` 已有 `requestLoad` 的 `dirty` 分支，T2 应复用。
- **树刷新**：`workspace.root` 是 `pickWorkspace` 时的快照（`workspace.ts:112-113`）；`rootHandle.getFileHandle('未命名.md',{create:true})` 只写磁盘，不会改 `root.children`。验收 `:42` 要求「树里出现 `未命名.md`」，计划没有重读/插节点步骤，按现计划会 FAIL。
- 示例徽标：`workspace.demo` 字段已存在（`workspace.ts:25,324`），T2 可以直接用，不需要新字段；这点通过。
- FileMenu 的 Esc/焦点/aria 写在 `:35`，方向对；验收 `:41` 覆盖三态，但没覆盖「菜单打开时按 Esc 焦点回按钮」，建议补一条。

## H4（major）T5a 的 DownloadStarting

计划 `:85` 只写「有 `SIDELIGHT_DOWNLOAD_DIR` 就设 `ResultFilePath/Handled`，否则弹 `SaveFileDialog`（取消 `Cancel=true`）」。缺三件：

1. `SaveFileDialog.FileName = e.SuggestedFileName` 与 `InitialDirectory`（默认保存目录/文件名是用户可见行为，findings 没给）。
2. 对话框分支是否 `Handled=true`。不置 true 时 WebView2 可能继续走默认下载 UI，造成「对话框 + 默认下载」双份。
3. `SuggestedFileName` 可能带路径分隔符；要先 `Path.GetFileName` 再 `Path.Combine`，否则 `ResultFilePath` 可能越出测试目录。

`DownloadStarting` 必须在 UI 线程弹对话框（`CoreWebView2` 的事件在创建线程上）；主机是 `[STAThread]`，这点没问题，但计划应写明「事件回调里同步弹、不 `await` 后台线程」，否则实现者容易把 `SaveFileDialog` 放错线程。

## H5（major）T5b 的文件归属与 840 KB

- `docs/adr/0004`：步骤 6（`:90`）要改它的 Tauri 触发条件，但 T5 文件表（`:83`）和归属表（`:110`）都没有这个文件。虽然目前没有第二个写者，验收/回退 `git checkout -- ...` 也不含它；应加进 T5 独占文件。
- 840 KB：`findings-ship.md:398-407` 明确说当前 827,198 B、只剩 12,802 B（1.5%）余量；T1/T2 会改 `App.tsx`/`styles.css`/新增 `FileMenu.tsx`，`dist` 会涨，`installer.ps1` 的硬线可能顶破。计划 `:89` 只写「installer.ps1」，没写门槛重定。
- README/CHANGELOG：计划 `:87` 的 B-note 只有三句；README 的「下一步」里「新建与另存为」仍是待办（findings B10），T1/T2 若 PASS 应同步删；CHANGELOG 0.17.0 也缺「新建/另存为」这一轮新增能力。T5 应在根代理确认 T1/T2 后补这三处，不能只写三句。
- `packaging/README.md` 删过期两条、shots 37 个零引用清单：findings 已给，计划对应，保留。

## H6（major）宿主的共享产物与降级链路

- **共享 `host/bin`**：T1 的 `Copy-Item host/bin .tmp/host-t1` 与 T5a 的 `host/build.ps1` 并行；`build.ps1:27` 先 `Remove-Item $www -Recurse -Force`，T1 可能拷到缺 `www` 的副本。T1 的宿主验收、T4 的 readOnly 验收都会受影响。需要固定快照目录（T1/T4 用 `.tmp/host-base`，T5a 用 `.tmp/host-t5a`），或让 T5a 先完成并明确顺序。
- **降级链路**：T1 的 `:23` 说宿主里不测「不支持 picker → 下载」，T5a 的 `:86` 测的是点「导出」→ DownloadStarting；没有一条「保存的 showSaveFilePicker 不可用 → 锚点下载 → DownloadStarting 落盘」的集成断言。若 T5a 没接住，用户看到的仍是「假保存」。T5a 完成后补一条；或 T1 的 unsupported 分支在宿主里用 `delete window.showSaveFilePicker` + T5a 的下载目录测试。

## T3 核对（通过）

- `applySource()` 已存在（`App.tsx:1316-1335`），不切视图、把源码写回编辑器；`exportAs`（`:1380-1412`）在 source 时先 `applySource` 再取 `editor.getHTML()/getText()`，方向可行；Markdown 仍走 `currentMarkdown()`；文件名仍由 `exportName(docName, ext)` 生成，规则明确。
- `ime-composition.mjs` 五处（正文/标题/代码块/表格/源码）用 CDP 组合事件；真实中文 IME 仍 UNVERIFIED，计划已标；脚本不进 `package.json`/`npm test`，不会污染 16 文件 171 条，符合「不该进单测」。
- 轻微：`applySource` 会产生一次撤销记录，计划已承认；导出失败沿用第 3 轮 `try/catch`，通过。

## 逐项核对记录

### T1
- `showSaveFilePicker` 实际存在（本机宿主 CDP 实测），但真实对话框 UNVERIFIED；T1 的宿主验收用桩，不能证明真实系统对话框。
- `saveAsFile` 类型、notice 持久、saveTargetRef 三处问题见 H1；`dirty` 基线四种状态缺连续保存/宿主初始/草稿恢复（H1）。
- 取消 picker：计划 `:21` 断言 dirty true/正文不变，方向对；但没断言「取消后不留下上次的 success notice」。
- 宿主 picker 桩用 OPFS 句柄；`saveAsFile` 接 `FileSystemFileHandle`，与 `writeNode` 的类型不同，文档身份要统一（H1）。

### T2
- FileMenu 的键盘/Esc/aria 做法明确；「打开文件夹/打开文件」在三态保留，满足 findings B2。
- 新建的 dirty 确认与树刷新缺（H3）；示例徽标可用 `workspace.demo`（`:324`），无需新字段。
- 「＋ 新建文件」创建后如果不刷新树，`.tree-file.is-active` 也找不到新节点；T2 验收 `:42` 会失败。

### T3
- 见上，通过；真实 IME UNVERIFIED 是诚实标注。

### T4
- readOnly 标记/横幅/保存后解除/原文件哈希不变，设计清楚；但宿主副本早于 T5a（H2），普通文件不误报没有验收。
- 横幅「不自动消失、无关闭键」是产品选择，计划写清即可；若产品负责人要可关闭，另说。

### T5
- T5a DownloadStarting 的默认文件名/目录与 `Handled` 缺（H4）；T5b 的 ADR 文件、840 KB、README/CHANGELOG 收尾缺（H5）。
- CI YAML（windows-2022、WebView2/NSIS 固定哈希、install-verify 手动）方向对；首次 flaky 的降级写法在 findings 里，计划应原样保留；840 KB 是 CI 的真实红点，不是文件格式问题。
- shots 37 个零引用清单与「builder2 不执行 git」正确；`git ls-files shots` 仍 132 与 findings 一致。

### 通用
- 文件归属：T1/T2/T3/T4 都改 `src/App.tsx`，同 A 组串行；T5 独占 host/docs/CI；除 `docs/adr/0004`（H5）外零重叠。
- 构建纪律：T1/T2/T3/T4 只跑 `npx tsc --noEmit` + `npx vite build --outDir .tmp/build-a`；T5a 跑 `host/build.ps1`；但 T1 的 `host/bin` 拷贝与 T5a 的构建共享目录（H6），纪律没有覆盖产物快照。
- 不可独立复现：T1 的真实系统 picker（H1）、T4 的 readOnly 旧副本（H2）、T5a 的真实 SaveFileDialog（H4）、T5b 的 840 KB/CI 首次跑（H5）。

## 做对的地方（别改过头）

1. T1 把「无句柄保存」改成「先选落点、再写盘」，并保留「不可用才下载且不谎报成功」的降级，方向正确；`showSaveFilePicker` 在本机宿主确实是 `function`，不是空想。
2. T2 的 FileMenu 三态入口与 T3 的 `applySource → getHTML/getText` 都是最小改动，复用现有 FSA/视图管线，不新增依赖。
3. T5a 的 `DownloadStarting` + `SIDELIGHT_DOWNLOAD_DIR` 测试钩子、T5b 的 37 个零引用 shots 清单，都是可执行且不破坏历史链接的写法；保留。

---

### 附：本次审查证据

- `.tmp/r4-savepicker.mjs` / 当前宿主 CDP：`origin=http://127.0.0.1:47821`、`secure=true`、`dir/save/open=function`。
- `src/App.tsx:882-885`（info 6 s 清空）、`:1100-1138`（`commitSave` 只认 `activeFile.handle`）。
- `workspace.ts:29-39`（无 save picker/FileWriteTarget 类型）、`:112-113`（树快照）、`:324`（`demo` 字段）。
- `docs/iteration/round-04/findings-ship.md:24`（安装包 827,198 B）、`:398-407`（840 KB 风险）。
- 未改产品文件、未 commit；临时产物在 `.tmp/`。
