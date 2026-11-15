# 第 03 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-03/plan.md`（基线 `b434f25`，v0.16.3）。
审查方式：读计划、三份 findings、`host/Program.cs`、`src/lib/settings.ts`、`src/lib/cache.ts`、`src/App.tsx` 的 localStorage/保存/导出段；在 `.tmp/` 追加一个 `WebResourceRequested` 探针实测（未改产品文件、未 commit）。
审查日期：2026-11-15。

## 结论：**REVISE**

H1（随机端口导致 origin 每次启动都变）、H3（安装器不处理 WebView2 运行时缺失）、H6（T2/T5 同时改 README）是 blocker；H2/H4/H5 会把验收做假或返工。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 用**随机端口**起回环 HTTP，origin 变成 `http://127.0.0.1:<port>`；端口每次启动都换 → 每次都是新 origin，`localStorage` 的 API Key、设置、无句柄草稿每次启动全丢。计划只写「旧 `https://sidelight.local` 不迁移」，没写固定端口、端口冲突、回退虚拟主机再次换 origin；也没把 `WebResourceRequested` 备选并列比较 | `plan.md:12-15,17,25`；`settings.ts:17`（`sidelight.settings.v1`）；`App.tsx:73`（`sidelight.doc.v1`）、`:202`、`:380`；`.tmp` 探针：`WebResourceRequested` 保持 `https://sidelight.local`，FCP **2,392 ms**（DCL 2,182 ms），而回环 HTTP 实测 28/60 ms（findings-bug:45） | 选固定端口（如 17820）并把选中端口持久化到 `%LOCALAPPDATA%\Sidelight\port`；端口被占时用同一固定 origin 的下一候选并**迁移/提示**，不要静默换 origin；回退虚拟主机必须迁移或明确告知；把 WRR 探针数据写进计划并明确「保 origin 但不解决 2 s」；验收加「连续两次冷启动后 settings 与 doc 仍在」 | T1 |
| H2 | major | T1 声称 FSA 未退化，但门禁 `node scripts/host-smoke.mjs` **没有 `--fsa`**，默认只跑 4 条（窗口/渲染/argv/单实例）；FSA 在 `http://127.0.0.1` 下是否仍安全上下文没有验收；穿越只测 3 条，MIME/HEAD 没有测试 | `plan.md:23-24`；`scripts/host-smoke.mjs:20`（`wantFsa = argv.includes('--fsa')`）、`:174`（FSA 分支）、`:242-243`（summary 按实际 results 计数） | 门禁改成 `node scripts/host-smoke.mjs --fsa`，并断言 `showDirectoryPicker` + 真实写盘；fcp-probe 补 `HEAD`、`.js`/`.css`/`.woff2` 的 Content-Type 断言 | T1 |
| H3 | blocker | T2 的 NSIS 安装器没有检查 WebView2 运行时是否安装。运行时缺失时 `CoreWebView2Environment.CreateAsync` 抛错，宿主只给「无法创建 WebView2 环境」+ 日志路径，没有下载/安装指引；安装器会“装成功但打不开” | `plan.md:33-39`（步骤无运行时检查）；`host/Program.cs:232`（CreateAsync）、`:266-270`（fatalInitError 文案）；`findings-ship.md:39-53`（安装器只谈载荷/压缩） | 安装前检查 WebView2 运行时（`msedgewebview2.exe` 或 EdgeUpdate 注册项）；缺失时给「需要 WebView2 运行时」+ 官方下载链接/可选 bootstrapper；写进 `README.txt` 与 `verify-installer.ps1`；810,000 B 门槛在 T1 加代码后重新量（原型 800,098 B 已含 ico/README/LICENSE） | T2 |
| H4 | major | T3 的窄窗「批注抽屉」没有键盘/Esc 验收（计划只写遮罩点掉关闭）；保存/导出 catch 后没有断言 `dirty` 仍正确（失败后必须仍是脏）；「7 处小字」只列了 5 个选择器，与目标数字对不上；`errorCopy` 只有 UI 路由验收，无单测 | `plan.md:51,55,58-59,62-65`；`findings-ux.md:36-44,46-79,122-144`；`App.tsx:1042-1080`（commitSave 失败不 setDirty false） | 抽屉加 Esc 关闭、打开时焦点进抽屉、关闭回「批注」按钮；验收加「保存写失败/toast 后 `__slState.dirty === true`」「导出失败 dirty 不变」「无句柄保存 dirty 仍 true」；把 7 个选择器逐个列出并断言 | T3 |
| H5 | major | T4 的验收写「全页按钮仍 20 个」，但 T3 会在顶栏新增「批注」开关（以及抽屉关闭控件）；T4 与 T3 同属 A 组串行，T4 运行时按钮数已变，20 必失败。另：`onOpenDemo` 若调用两次 `demoWorkspace()`，`activeFile` 与树节点对象不是同一批，选中态有风险 | `plan.md:54-55`（T3 加批注开关）；`plan.md:82`（T4 断言 20 个按钮）；`findings-bug.md:88`（当前 20 个）；`src/App.tsx:1891-1894`（onOpenDemo 只 setWorkspace）；`FileTree.tsx:33`（按 path 比较） | 验收改成「T3 新增控件之外仍 20 个」或直接断言具体按钮名；`onOpenDemo` 复用同一个 `const demo = demoWorkspace()` 并把首篇传给 `requestLoad`；断言 `.tree-file.is-active` 的 path 等于当前 `activeFile.path` | T4 |
| H6 | blocker | T5 与 T2 **同时改 `README.md`**：T2 文件表含 README，T5 步骤 1/2 也改 README（且都改第 39 行），文件归属表却写 A 组不碰 README；两组并行会互相覆盖。T5 还要删 106 张 shots，但 `docs/iteration/**` 有 94 处 `shots/` 引用（只有 ADR 的 2 张是“用户可见文档”口径）；ADR 固定数 2,345,784 与当前 2,379,631 不符；CHANGELOG 日期是 `[日]` 占位 | `plan.md:32,39`（T2 README）、`:91-95,118`（T5 README/文件表/不碰 README 声明）；`docs/adr/0004...:45` 实测 **2,379,631**；`plan.md:93` 写 2,345,784；`Select-String docs/iteration/** 'shots/'` = 94；`CHANGELOG.md:5` 格式 `## 0.16.3 — 2026-11-15` | README 只给一个写者：要么 T2 不碰 README、全部归 T5，并让 T5 显式等待 T2；要么 T2 完成后 T5 再改；shots 只删「无引用」的，或同步改 94 处引用（至少把 docs/iteration 里历史报告标记为「图已移出」）；ADR 写现场取数值；CHANGELOG 填实际日期并纳入验收 | T5 |

---

## H1（blocker）随机端口 = 每次启动换 origin

**事实链**

- 计划 `:12-14`：`TcpListener` 随机端口；`:15` `APP_URL = http://127.0.0.1:<port>/index.html`；`:17` 只承认旧 `https://sidelight.local` 的 localStorage 不迁移。
- `settings.ts:17` 的 API Key / 接口地址 / 模型 / 字号都存在 `sidelight.settings.v1`（`saveSettings` 用 `localStorage.setItem`）；`App.tsx:73` 的草稿/文档名存在 `sidelight.doc.v1`；`App.tsx:202` 启动时读它。localStorage 按 origin（scheme+host+port）隔离，随机端口每天启动都是新 origin。
- 所以不是「旧数据一次性不迁移」，而是**每次启动**都回到默认设置、示例草稿；用户每次都要重填 API Key。这是首发级的数据丢失/信任问题。
- finder 的回环测试用固定端口 5199（`findings-bug.md:45`），所以 28/60 ms 的结论成立；但生产用随机端口，测量条件没有覆盖「第二次启动数据还在不在」。

**WebResourceRequested 备选（lead 要求）**

我在 `.tmp/wrr-Program.cs` 里把 `SetVirtualHostNameToFolderMapping` 换成 `AddWebResourceRequestedFilter("https://sidelight.local/*")` + `WebResourceRequested` 直接读 `www` 返回流，编译运行（`.tmp/wrr-fcp.mjs`）。结果：

```text
url=https://sidelight.local/index.html  origin=https://sidelight.local
dcl=2182.5  fcp=2392  paints=[FP 2192, FCP 2392]
body=Sidelight / 未命名.md / 分析本段（模拟）…
```

即：**origin 保住了，但 2 s 白屏没解决**（2,392 ms，和映射的 2,040–2,188 ms 同量级；回环 HTTP 是 60 ms）。因此：

1. 计划选回环 HTTP 在速度上有依据；WRR 不能作为「既保 origin 又快」的现成方案。
2. 但计划必须把这条 A/B 写进去（含「为什么没选 WRR」），不能只写随机端口。
3. 速度问题解决了，origin 问题没解决；固定端口是必须的。

**最小修法**

- 固定默认端口（例如 17820）；`SIDELIGHT_PORT` 只做测试覆盖。
- 把实际端口写进 `%LOCALAPPDATA%\Sidelight\port`，下次优先复用；端口被占时按固定顺序试，**origin 一变就必须迁移**（至少把旧 origin 的 `sidelight.settings.v1`、`sidelight.doc.v1` 复制到新 origin：先导航旧 origin 读 localStorage，再切新 origin 写回；或宿主侧落盘再注入）。
- 回退 `https://sidelight.local` 时，不能静默换 origin；至少提示「设置与草稿需要重新填/可能丢失」，并把迁移做掉。
- 验收加：连续两次冷启动后 `localStorage['sidelight.settings.v1']` 与 `sidelight.doc.v1` 仍在；两次 `location.origin` 相同。

---

## H2（major）FSA 与 HTTP 服务的验收缺口

- 计划 `:23` 说 `node scripts/host-smoke.mjs` 仍 5/5 PASS，含 FSA；但 `:24` 的门禁命令没有 `--fsa`。`scripts/host-smoke.mjs:20` 的 `wantFsa` 默认 false，`:174` 的 FSA 分支不执行，summary 只统计 4 条。**FSA 在 `http://127.0.0.1` 下是否仍安全上下文、`showDirectoryPicker` 是否仍可用，计划没有真正验收。**
- 理论上 `127.0.0.1` 是 secure context；`CoreWebView2PermissionKind.FileReadWrite` 仍应触发。但 T1 换了 origin，必须用 `--fsa` 在回环下重跑：打开文件夹、真实写盘、哈希变化。
- 穿越防护计划写了 3 条测试，够覆盖 `..`/编码/混合分隔符；但 MIME 没有具体映射表，`HEAD` 没有测试。若 `.js` 返回 `text/plain`，`fcp-probe` 的 `.ProseMirror` 可能仍出现但模块被拒；加一条 `.js` `Content-Type` 断言。
- 目录穿越的 `StartsWith(wwwFull + separator)` 在 Windows 上大小写不敏感，建议用 `StringComparison.OrdinalIgnoreCase`；`Uri.UnescapeDataString` 抛异常时要有 400/403，不要落到 500。

**最小修法**：门禁改 `node scripts/host-smoke.mjs --fsa`；fcp-probe 加 MIME/HEAD；计划写明穿越与 MIME 的断言。

---

## H3（blocker）T2 安装器不处理 WebView2 运行时缺失

- 计划 T2 的载荷、per-user 路径、HKCU 卸载项、保留用户数据都写清了；`Sidelight.exe.config`、ico、www、LICENSE 也在载荷里（`plan.md:34`；`.tmp/nsis/proto.nsi` 已含这 8 个文件，实测 800,098 B）。
- 但 `installer.nsi` 不检查 WebView2 运行时。`host/Program.cs:232` 的 `CreateAsync` 在运行时缺失时抛错，`:266-270` 只写 `fatalInitError`「无法创建 WebView2 环境」；`RunErrorForm` 的文案没有下载链接，安装器也没有 bootstrapper。用户会得到「装好了但打不开」。
- 810,000 B 的门槛：原型 800,098 B 是含 ico/README/LICENSE 的，余量约 9,902 B；T1 会先改 `Program.cs`（180–260 行回环服务器），exe 会变大；T2 编包前必须重量一次，不要直接沿用 810,000。

**最小修法**：安装前检查 `msedgewebview2.exe` 或 EdgeUpdate 注册项；缺失时弹「需要 WebView2 运行时」+ 官方链接（或可选 bootstrapper，但会超 810 KB）；`README.txt` 写明；`verify-installer.ps1` 加一条运行时存在性检查；体积门槛用 T1 后的实测值重定。

---

## H4（major）T3 的抽屉、dirty 与「7 处小字」

- **抽屉没有键盘/Esc**：`plan.md:55` 只说「遮罩点掉关闭」。U1 的抽屉是新交互，必须验收：点「批注」打开、`Esc` 关闭、焦点在抽屉内、关闭后焦点回「批注」按钮；否则键盘用户打开后出不去。
- **保存/导出 catch 后的 dirty**：`plan.md:58` 只说加 `try/catch` 和 toast；没有断言失败后 `dirty` 仍为 true。当前 `commitSave` 写失败在 catch（`App.tsx:1042-1045`），不会 `setDirty(false)`；无句柄保存 `:1077` 本身 setNotice 后 dirty true。计划应写死：保存失败、导出失败、无句柄下载失败后 `__slState.dirty` 仍为 true；成功写盘后才 false。
- **7 处小字**：`plan.md:51` 说 7 处，`:59` 只列 `.field label`、`.field-hint`、`.rail-goal-text`、`.sidebar-tabs button`、`.rail-notice` 5 个选择器；findings-ux `:122-144` 的表有 9 行（必须/建议/可留）。要么把 7 个实际类名逐个列出，要么把目标改成「这 5 个选择器」。
- `errorCopy` 没有单测；`npm test` 现有 15 个文件，计划没加。至少给 `errorCopy` 一个纯函数测试（401/403/429/TypeError/500），否则只能靠 UI 路由，CI 不覆盖。

**最小修法**：抽屉补键盘/Esc/焦点验收；保存/导出失败后 dirty 断言；7 个选择器逐个列；给 `errorCopy` 加一个 `src/lib/errorCopy.test.ts`（或 `ai.test.ts`）并挂进 `npm test`。

---

## H5（major）T4 的「20 个按钮」与 T3 冲突

- 当前全页按钮 20 个（findings-bug `:88`）。T3 在顶栏加「批注」开关（`plan.md:55`），如果它是一个 `<button>`，T4 的验收 `plan.md:82`「全页按钮仍 20 个」必失败；如果 T3 把开关做成非 button（如 `<a role="switch">`），也要在计划里写明，否则 T4 的 tester 会得到 21 个。
- T4 的 `onOpenDemo` 当前只 `setWorkspace(demoWorkspace())`（`App.tsx:1891-1894`），计划改成「setWorkspace 后立刻 requestLoad 第一篇」。如果实现写两次 `demoWorkspace()`，`activeFile` 与树节点来自两个对象；`FileTree.tsx:33` 用 `path` 比较，字符串相同则仍能选中，但 `aria-current` 与 `.is-active` 必须按 path 验证，不能按对象身份。
- T4 的验收已写了 `.tree-file.is-active`/`aria-current` 数 = 1，这条能抓住选中；但按钮数会先红，导致 tester 误判 T4 失败。

**最小修法**：T3/T4 约定新增控件清单（例如「批注」开关 + 抽屉关闭）；T4 验收改为「原有 20 个 + 新增 2 个 = 22」或按按钮名断言；`onOpenDemo` 复用同一个 `demoWorkspace()` 变量。

---

## H6（blocker）T5 与 T2 抢 README，shots 与 ADR 数字还没对齐

1. **README 双写**：T2 文件表 `plan.md:32` 含 `README.md`，T2 步骤 6（`:39`）改第 39 行「没有安装器」；T5 步骤 1/2（`:91-92`）也改 README 第 5/39 行；T5 文件表 `:91` 不含 README；`:118` 又写「B 只碰 … README.md；A 只碰 src/…」。T2 与 T5 分属 B/A 两组并行，README 是同一文件的同一行，必冲突。**修正**：README 只归一个写者（建议 T5，T2 不改 README；或 T5 显式等 T2 完成），并把 README 写进 T5 的独占文件表。
2. **shots 数量口径**：findings-ship `:130-141` 只把「用户可见文档」算成 2 张；但 `docs/iteration/**` 里 `shots/` 引用 **94 处**（`Select-String` 实测），T5 删 106 张后这些历史报告在新 clone 上全是断链。要么只删无引用的，要么同步改引用/在报告里标「图已移出」。
3. **ADR 数字**：ADR-0004 `:45` 当前实测 **2,379,631 B**（exe+dll 984,100 + www 1,395,531）；`plan.md:93` 写 2,345,784 B，验收 `:95` 又要求 ADR 含这个固定数。T1/T2 还会改 exe；这个数必然过期。**修正**：T5 现场取数，写实际值；验收改成「ADR 含取数命令输出」。
4. **CHANGELOG 日期**：`plan.md:94` 写 `2026-11-[日]`；现有条目格式是 `## 0.16.3 — 2026-11-15`。发布前必须填实际日期，验收加 `Select-String '## 0.17.0 — 2026-11-'` 且不含 `[日]`。
5. **`.gitignore` / `git rm --cached`**：findings-ship `:143-151` 已用临时仓库验证 5 条规则；`git rm --cached` 不动磁盘文件，`release/` 与现有 `*.zip` 不冲突。这部分计划正确，保留。

---

## 逐项核对记录

### T1
- 根因与回环速度：findings-bug `:37-49` 的 A/B（映射 2,011 ms vs 回环 28/60 ms）可信；回环方案本身合理。
- **origin**：随机端口是硬伤（H1）。settings.ts `:17` / App.tsx `:73` 证明 API Key 与草稿都在 localStorage；**每次启动丢**。
- **WRR 备选**：我实测保持 `https://sidelight.local` 的 FCP 2,392 ms，未解决 2 s；计划应写明这条 A/B，否则下轮还会有人提。
- **FSA**：`host-smoke --fsa` 未进门禁（H2）；`http://127.0.0.1` 理论安全，但没有实测。
- **穿越/MIME**：计划覆盖 3 条穿越；MIME/HEAD 缺断言（H2）。
- **固定端口/冲突/回退**：全缺（H1）。
- **验收独立复现**：fcp-probe 能自跑；但「第二次启动数据仍在」没有测试。

### T2
- 通过项：per-user `$LOCALAPPDATA\Programs\Sidelight`、`RequestExecutionLevel user`、HKCU 卸载项、`RMDir /r $INSTDIR` 不删 `%LOCALAPPDATA%\Sidelight`、保留用户数据，都写清；载荷含 exe、3 dll、`Sidelight.exe.config`、`dist`、`sidelight.ico`、`LICENSE`、`README.txt`；`proto.nsi` 实测 800,098 B（含这些）。
- 缺口：**运行时缺失无检查**（H3）；810,000 B 门槛需在 T1 后重量；`.nsi` 只写 ASCII 注释已写在步骤里（`plan.md:34`），符合 findings-ship `:51`；安装目录名是 ASCII，中文只出现在被复制的 `README.txt` 内容里，不触发 `makensis` 编码问题。
- `verify-installer.ps1` 覆盖安装/卸载/用户数据/HKCU；没有运行时检查（H3）。

### T3
- 通过项：`hasKey` 在 `settings.ts:64`；`errorCopy` 放在 `ai.ts:25` 的 `messageOf` 旁边，不新增文件，合理；`notice` 对象化由 `tsc` 兜底；401/断网/500 的 UI 验收写清。
- 缺口：抽屉无键盘/Esc（H4）；保存/导出失败 dirty 无断言（H4）；「7 处」只列 5 个选择器（H4）；`errorCopy` 无单测（H4）。
- **T3 新增「批注」开关**会影响 T4 的按钮计数（H5）。

### T4
- 通过项：初始名 `示例 · 未命名.md`、空状态文案、`onOpenDemo` 走 `requestLoad`、`aria-current` + `.is-active` 的方向对；不加「新建」符合本轮取舍。
- 缺口：按钮数 20 与 T3 新增控件冲突（H5）；`onOpenDemo` 若重复 `demoWorkspace()` 要按 path 验证选中（H5 的预防）。
- 验收：清 localStorage、点「试用示例」、`.tree-file.is-active` 数 = 1、`aria-current` = 1，能证明三者一致；但先被按钮数红掉。

### T5
- 通过项：`shots` 5 条 ignore 规则已由 findings-ship `:143-151` 临时仓库验证；`git rm --cached` 不删磁盘；`release/` 与 `*.zip` 不冲突；`vite.config.ts` 加 `host/bin`/`release` 合理。
- 缺口：README 与 T2 双写（H6）；shots 94 处历史引用（H6）；ADR 固定 2,345,784 vs 当前 2,379,631（H6）；CHANGELOG 日期占位（H6）。
- `package-lock.json` 仍是 0.8.0，计划不动；`npm ci` 不因此失败，但下轮应一起升。

### 通用
- **文件归属**：除 README（H6）外，T1/T2 同属 builder2 串行，T3/T4 同属 builder，T5 独占 package/CHANGELOG/.gitignore/vite；并发零重叠在「README 归 T5」修正后成立。
- **构建纪律**：T1/T2 只跑 `host/build.ps1`；T3/T4 用 `npx tsc --noEmit` + `npx vite build --outDir .tmp/build-a`；T5 不构建；最终 `npm run build` 由根代理串行；覆盖 5 个任务，成立。
- **依赖**：无新增 npm 依赖；NSIS 只在 `.tmp` 工具链，不写进运行时；WRR 备选未采用（见 H1）。
- **不可独立复现**：T1 的「第二次启动数据仍在」、T1 的 FSA（无 `--fsa`）、T2 的运行时缺失、T4 的按钮数（与 T3 冲突）、T5 的历史截图引用（H1/H2/H3/H5/H6）。

## 做对的地方（别改过头）

1. **回环 HTTP 的速度方向是对的**：findings 的 A/B 与我的 WRR 探针形成对照（回环 60 ms vs 映射/WRR 2 s+）；方案本身保留，只补 origin 稳定性。
2. **T2 的 NSIS per-user 方案与载荷清单是对的**：`$LOCALAPPDATA\Programs`、HKCU 卸载项、保留 `%LOCALAPPDATA%\Sidelight`、config/ico/www/LICENSE 都在；`proto.nsi` 800,098 B 可复现，只需补运行时检查与重量体积。
3. **T5 的 `.gitignore` 规则与 `git rm --cached` 用法是对的**：findings 已用临时仓库验证 5 条规则，`--cached` 不删工作区文件；保留这部分，只修 README 归属与引用/数字。

---

### 附：本次审查用到的证据

- `.tmp/wrr-Program.cs`、`.tmp/wrr-fcp.mjs`：WebResourceRequested 探针；FCP 2,392 ms，origin `https://sidelight.local`，页面已加载。
- `host/bin`：exe+dll+config = 984,100 B，`www` = 1,395,531 B，载荷 2,379,631 B；`.tmp/nsis/proto.nsi` 800,098 B（含 ico/README/LICENSE）。
- `src/lib/settings.ts:17`、`src/App.tsx:73,202,380`：localStorage key。
- `scripts/host-smoke.mjs:20,174,242`：`--fsa` 默认不跑。
- `git ls-files shots` = 108；`Select-String docs/iteration/** 'shots/'` = 94；ADR-0004:45 = 2,379,631 B。
- 未改产品文件、未 commit；临时产物均在 `.tmp/`。
