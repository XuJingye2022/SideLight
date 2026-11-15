# 第 06 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-06/plan.md`（基线 `d8e84a4`，v0.18.0）。
审查方式：读计划、三份 findings、`host/Program.cs`、`src/App.tsx` 的启动/保存段、`src/lib/workspace.ts`；未改产品文件、未 commit。
审查日期：2026-11-15。

## 结论：**REVISE**

这是一轮能改坏用户原文件的改动。H1（GBK/非法字节会被宽松解码吞掉）、H2（`File.Copy` 回退可能半写）、H3（不改直接保存的 SHA 断言在当前序列化下不可能成立）、H6（T1 的宿主副本早于 T3）是 blocker；H4（`/__doc` 与消息通道的安全边界）、H5（T1/T2 两套保存状态）是 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T3 的编码判定用 `Encoding.GetEncoding(936)`，默认是替换回退：GBK 解不出来的非法字节不会抛异常，而是变成 U+FFFD；`notxt` 期望的 409 永远不会出现。GBK 编码失败同理，默认写成 `?` 而不是 `ENCODING`。无 BOM 的 UTF-16 会被严格 UTF-8 当合法（NUL 字节合法）通过 | `plan.md:55`；`findings-bug.md:41-54,169`；`plan.md:73`（notxt 期望 409）；.NET 默认 `DecoderFallback.ReplacementFallback` | 用 `Encoding.GetEncoding(936, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback)` 做严格 GBK；UTF-8 严格解码后若文本含 `\0` 判为疑似无 BOM UTF-16 并转 409；GBK 编码失败也用异常回退；`notxt` 必须走 409 | T3/T4 |
| H2 | blocker | 写盘回退用 `File.Copy(temp, target, true)` 覆盖原文件：磁盘满/崩溃/杀进程时可能留下半写文件，正是「毁原件」的路径。`mtime` 只说「mtime/size」没写 `LastWriteTimeUtc`；`endsWithNewline` 没写「文本已带换行时是否再补」；`/__doc` 的 `readOnly:false` 是硬编码，只读文件不会提前显示横幅 | `plan.md:55`（`readOnly:false`）、`:57`（copy 回退、mtime/size）、`:55`（`endsWithNewline`）；`findings-bug.md:144-145`（只读/占用异常）、`:167`（无结尾换行） | 回退改成「同目录临时文件 + `File.Replace` 失败时再 `File.Replace`/`MoveFileEx`，绝不用 `File.Copy` 直写目标」；记录 `File.GetLastWriteTimeUtc`；定义 `endsWithNewline` 的补/不补规则（text 已以 `\n` 结尾则不再补）；`/__doc` 的 `readOnly` 从 `FileAttributes.ReadOnly` 取 | T3/T4 |
| H3 | blocker | T1/T4 的「打开后不动直接 Ctrl+S → 原文件 SHA 不变」按现计划不可能成立：`saveFile` 用 `currentMarkdown()`，Markdown 解析→序列化会把段落内软换行变成 `  \n`（findings B3 已实测 `lf.md` 不改也会变）；且 `saveFile` 的首次保存对比分支会因 `originalText !== text` 弹「保存前对比」，T4 的直接 `postMessage` 探针又绕过了这条前端路径 | `plan.md:20,22`（SHA 不变）、`:72`（T4 直接发消息）、`:26`（T1 宿主段）；`findings-bug.md:64-72`；`App.tsx:1319-1337`（`saveFile` 首次对比）、`:1305-1310`（`currentMarkdown`）、`:1260-1303`（`commitSave`） | 宿主记录打开时的原始字节/文本；前端在 `dirty === false` 时**不发写回**或发「原样保存」让宿主直接返回原 SHA；或在 T1 中把 host 文档的 `saveFile` 绕过首次对比；T4 的「不改保存」必须经前端 `Ctrl+S`，不能只发 `postMessage`；补一条 `lf.md` 不改保存 SHA 不变 | T1/T4 |
| H4 | major | `/__doc` 返回完整正文，但计划只写「仅 GET/405」，没有 `Cache-Control: no-store`、没有 Host 校验、没有拒绝跨源 CORS；本机任何进程都能 `GET` 读到正文。`postMessage` 只校验 `e.Source`，页面脚本/XSS 仍能以当前 origin 发任意 `text` 覆盖 currentPath。T4 还要求伪造 `path` 的消息返回 `PATH_CHANGED`，而 T3 说「消息里的路径一律忽略」——两者矛盾，按 T3 实现会写 current 文件而不是拒绝 | `plan.md:55-56`（`/__doc`、save）、`:73`（伪造 path → PATH_CHANGED）；`findings-bug.md:181-186`（桥不是授权、XSS 风险） | `/__doc` 加 `Cache-Control: no-store`、只接受 `Host: 127.0.0.1:<port>`、不加 CORS 头；save 消息带一次性 token（宿主生成、`/__doc` 返回）或至少拒绝带 `path`/`fileName` 字段的消息并返回 `PATH_CHANGED`；T3/T4 统一「忽略路径」还是「拒绝带路径消息」 | T3/T4 |
| H5 | major | T1 已定义 `saving`/`pendingSave` 状态机（`:13`），T2 又加 `savingRef`/`pendingSaveRef`（`:38`）；两套单飞/补存逻辑在同一 App 里，容易一套在写、另一套判断可写。T2 的「转发后 fetch 新文档」与 T3 更新 `currentPath` 的时序没有写谁先；保存中切换文档的旧回包清 dirty 只给了目标，没有与 T1 的 `id`/`pendingSave` 合并 | `plan.md:13,38-39`；`findings-bug.md:90-110`（重入/乱序/切文档） | T1 的状态机作为唯一实现，T2 只扩展「切文档守卫」；明确 T3 先更新 `currentPath` 再 reload、T2 的 `/__doc` fetch 必须带 `mtime`/`fileName` 核对；补「旧回包 id 不在 pending 集合」的断言 | T1/T2 |
| H6 | blocker | T1 的宿主验收按「构建纪律」用 `.tmp/host-a`，但 `plan.md:4` 是在 T1 开头从 `host/bin` 复制；T1 宿主段又要等 T3 落地（`:26`）。按时间线，`.tmp/host-a` 里的宿主没有 `/__doc`/`WebMessageReceived`，T1 的宿主段必失败。另外 T1 只写「`fetch` 404/非 JSON → 浏览器」，没写网络失败/5xx 时是否回退 localStorage；Vite 的 SPA fallback 返回 200 HTML 也要靠 JSON 解析失败兜住 | `plan.md:4,26`；`host/Program.cs` 当前无 `/__doc`、无 `WebMessageReceived`（grep 为空）；`findings-bug.md:17-37`（旧文档被当成新文档） | T3 落地后重做 `.tmp/host-a`（从当前 `host/bin` 重新复制），或 T1 前半只跑浏览器段、宿主段在 T3 后单独跑；`fetch` 区分「404/非 JSON」与「网络失败」，后者显示可见错误、不静默回退旧草稿 | T1 |

---

## H1（blocker）GBK 与非法字节的宽松解码

计划 `:55`：

```csharp
BOM → new UTF8Encoding(false, true) → Encoding.GetEncoding(936)
```

`Encoding.GetEncoding(936)` 默认 `DecoderFallback.ReplacementFallback`：遇到 GBK 非法字节不抛，返回 `�`。所以：

- `notxt`（非法 UTF-8 且 GBK 不可解）不会返回 409，而是得到一串 U+FFFD；T4 的 `notxt → 409` 必失败。
- 更危险：写回时 `Encoding.GetEncoding(936)` 默认 `EncoderFallback.ReplacementFallback`，文本里出现 GBK 不可编码字符（emoji、生僻字）会静默写成 `?`，T3 的 `ENCODING` 分支不会触发。
- 无 BOM 的 UTF-16LE：字节里大量 `00`，严格 UTF-8 认为 NUL 合法，会被当 UTF-8 解出一串 NUL/替换符，写回即毁文件。

**最小修法**：

```csharp
var gbk = Encoding.GetEncoding(936,
    EncoderFallback.ExceptionFallback,
    DecoderFallback.ExceptionFallback);
```

严格 GBK 解码失败 → 409 `ENCODING`；严格 GBK 编码失败 → `ENCODING`；严格 UTF-8 解出含 `\0` 的文本 → 判疑似无 BOM UTF-16，拒绝写回（或按字节判 `00 00` 模式再试 `Encoding.Unicode`，但要单独验收）。`notxt` 必须走 409，不能只是「显示乱码」。

## H2（blocker）回退 copy、mtime、结尾换行、只读

- **copy 回退**：计划 `:57` 写「`File.Replace` 失败回退 `File.Copy(temp,target,true)` 并恢复原属性」。`File.Copy` 覆盖不是原子操作；磁盘满/断电/杀进程会在目标上留下半写文件。写回是数据安全路径，不能用 copy 直写目标。修：回退也走 `File.Replace`（temp→target）或 `MoveFileEx` + `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH`；若目标被占用，保留原文件并报 `FILE_LOCKED`，不要冒险 copy。
- **mtime**：计划只写「mtime/size」，没写 `LastWriteTimeUtc`。时区/DST 下 `LastWriteTime` 与打开时记录不一致会误报 `PATH_CHANGED`（或漏报）。明确用 `File.GetLastWriteTimeUtc`。
- **endsWithNewline**：计划没说「text 已经以 `\n` 结尾时是否再补」。若前端 `currentMarkdown()` 已带结尾换行，宿主再补会多一行；若前端去掉，宿主补回。定义：`text` 先 `TrimEnd('\n')`，按 `endsWithNewline` 决定补一个 `\n`，并加单测。
- **readOnly**：`/__doc` `:55` 硬编码 `readOnly:false`。`readonly-attr.md` 打开时 T1 不会显示只读横幅；用户 Ctrl+S 后由宿主回 `READONLY`。应从 `File.GetAttributes` 取 `ReadOnly`，`/__doc` 返回真实值，T1 横幅提前显示。
- **mixed**：计划「按打开时逐行 EOL 序列还原；行数不匹配按多数 EOL」。Markdown 序列化会改软换行，行数很容易不匹配；T4 已允许 `mixed` 记 UNVERIFIED，但应在 `/__doc` 记录行数，写回时行数不符直接 `PATH_CHANGED`/`EOL_MISMATCH`，不要静默按多数改写。

## H3（blocker）「不改直接保存 SHA 不变」当前不可能

T1/T4 的 headline 验收是 `crlf-bom`/`lf`/`utf16le` 打开后不动、直接 Ctrl+S、SHA 不变（`plan.md:20,22`）。但：

- `saveFile` 取 `currentMarkdown()`（`App.tsx:1319`），它经 `editor.getMarkdown()` + repair；findings B3 已实测 `lf.md` **不打字**直接保存也会多出 `  \n`（软换行变硬换行），SHA 必变。
- `saveFile` 首次保存分支：`originalText !== null && !saveWarned && originalText !== text`（`App.tsx:1328`）会弹「保存前对比」，不会直接写回；T1 设置了 `originalText = text`，但 `currentMarkdown()` 与 `text` 不一定相等。
- T4 的探针 `:72` 明确「不依赖新前端：保存消息直接由 CDP `page.evaluate` 发出」，所以 T4 的 SHA 断言只测宿主，**不测前端 Ctrl+S**；T1 的宿主段测前端，会撞上上面两条。

修：宿主记录 `originalBytes`/`originalText`；若前端发来的 `text` 与打开时 LF 文本完全相等，直接回「未改动」并跳过写；或 T1 的 host 文档 `saveFile` 在 `dirty === false` 时发 `noop`/原文标记，不走 `currentMarkdown`。T4 的「不改保存」必须走前端 `Ctrl+S`，不能只发 postMessage；补 `lf.md` 不改保存 SHA 不变。若放弃「SHA 不变」，就要在计划和验收里明确「允许规范化，只保证 BOM/EOL」，不能让 tester 按 SHA 断言。

## H4（major）`/__doc` 与消息通道的安全边界

- `/__doc` 是回环 HTTP，**本机任何进程**都能 GET 到完整正文；计划只写「仅 GET/405」，没有 `Host` 校验、没有 `Cache-Control: no-store`、没有「不加 CORS 头」的声明。本机恶意程序/另一个浏览器页面（若 CORS 配置不当）可读；至少加 Host 校验与 no-store，并明确不返回 `Access-Control-Allow-Origin`。
- `postMessage`：T3 `:56` 只校验 `e.Source` 是 `http://127.0.0.1:<port>/index.html`；页面里的 XSS/任意脚本仍能以该 origin 发 `{type:'save', text:'…'}`，把 currentPath 覆盖成任意内容。`e.Source` 不是授权，`currentPath` 只限制「哪个文件」，不限制「写什么」。要么接受「页面被攻破时最多覆盖当前文件」（写进 ADR），要么加 CSP/禁用任意 HTML 注入，并给 save 加一次性 token（`/__doc` 返回、`postMessage` 带上）。
- **T4 伪造 path 期望矛盾**：T3 `:56` 说「消息里的路径/文件名一律忽略并记日志」；T4 `:73` 却要求 `path:"C:\\Windows\\win.ini"` 的 save 返回 `PATH_CHANGED`。按 T3 实现会忽略 path 并写 currentPath（可能把样本文件写坏），按 T4 实现要拒绝带 path 的消息。先统一协议：**带 path 字段的 save 一律拒绝**，返回 `PATH_CHANGED`，并记日志；T3 的「忽略」改成「拒绝」。
- `/__doc` 返回 `readOnly` 必须真实（见 H2），不能固定 false。

## H5（major）T1/T2 两套保存状态

T1 `:13` 定义 `saving`、`saveError`、`pendingSave`（保存中再按只记一次，完成后用最新正文再发一次）。T2 `:38` 又写 `savingRef` + `pendingSaveRef`（同一套逻辑的 ref 版）。同一 App 里两套状态会出现：

- 一套认为在保存中，另一套仍允许 `Ctrl+S`；
- 回包的 `id` 与 pending 集合由哪套维护不一致；
- T2 `:39` 的 `saveAndSwitch` 守卫与 T1 的状态机没有共同定义。

修：T1 的状态机作为唯一实现，T2 只在 `App.tsx` 里加「切文档/新建时等当前写回结束」的守卫，不再新建 `savingRef`/`pendingSaveRef`；两处共享 `pendingIds` 与 `id` 生成器。

另外 T2 `:37` 说转发后重新 `fetch('/__doc')`，T3 `:59` 说转发后更新 `currentPath` 再 reload；计划没写顺序。应明确「宿主先更新 currentPath → reload → 页面 fetch 拿新 meta」，且 fetch 的 `mtime`/`fileName` 与宿主日志对得上；失败立即清 `hostDoc`（T2 已写）。

## H6（blocker）T1 的宿主副本早于 T3

计划 `:4`：A 组「宿主验收用独立副本 `.tmp/host-a`（`Copy-Item host/bin .tmp/host-a -Recurse`，再把 `.tmp/build-a/*` 覆盖进 www）」。计划 `:26`：T1 宿主段「等 T3 落地后由根代理放行」。

时间线是：T1 开始 → 复制 `host/bin` 到 `.tmp/host-a`；T3 之后才改 `host/Program.cs` 并 `host/build.ps1` 重建 `host/bin`。T1 的 `.tmp/host-a` 里仍是**没有 `/__doc`、没有 WebMessageReceived** 的旧宿主；T1 的宿主段会 404/超时，必失败。

修：T3 落地后**重新** `Copy-Item host/bin .tmp/host-a`（保留 T1 的 `.tmp/build-a` 覆盖），或把 T1 宿主段做成「先跑 `host/build.ps1`，再复制」。并在计划里写明 `.tmp/host-a` 的生成时机，不要只写「复制 host/bin」。

**启动识别**：T1 `:12` 只写「`/__doc` 404/非 JSON → 浏览器」。Vite dev 的 SPA fallback 会返回 200 HTML，`response.json()` 抛错能兜住；但**网络失败/5xx** 没有分支。宿主存在但 `/__doc` 失败时，不能静默回退 localStorage 旧草稿（findings B1 正是这个症状）。补：`fetch` 抛错或 5xx → 显示可见错误横幅，`hostDoc = null`，不载入旧稿；只有 404/明确非宿主才走浏览器路径。

## T4/T5 核对

### T4
- 九类样本覆盖 `crlf-bom`、`lf`、`mixed`、`utf16le`、`gbk`、`readonly`、`big13`、`huge33`、`notxt`（`plan.md:72-73`），方向对；`notxt`/`gbk` 受 H1 影响，`readonly` 受 H2 硬编码 readOnly 影响，`mixed` 已允许 UNVERIFIED。
- **探针触发方式**：T4 `:72` 明确「不依赖新前端：保存消息直接由 CDP `page.evaluate` 发出」。这只能证明宿主写回，不能证明 T1 的 `Ctrl+S → 状态机 → postMessage`；T1 的 `host-save-acceptance` 要覆盖前端按键，T4 不能替代。两者都保留，报告里分开写「宿主协议」与「前端路径」。
- **伪造 path**：与 T3 协议矛盾（H4），先统一「带 path 拒绝」。
- **SHA 不改**：T4 直接发消息可能让「不改保存 SHA 不变」假绿（宿主收到的是 `/__doc` 的 LF 文本，能还原原字节），而真实前端 `Ctrl+S` 会经 `currentMarkdown` 改写；必须让前端参与（H3）。

### T5
- 0.19.0/CHANGELOG/README/AGENTS 的改法（`plan.md:74-76`）与 findings S3 对齐；`npm install --package-lock-only` 由根代理做，合理。
- 30 个零引用截图：findings S5 实测 30 个 / 2,007,292 B（全在 round-05），计划 `:85,93` 的 30 与「只交清单、不执行 git」正确；`git ls-files shots` 仍应是 214，`git status` 无删除，T5 不自己执行 git。
- 产物重建顺序 `npm run build → host/build.ps1 → installer.ps1 → portable.ps1`（`:91`）正确；850,000 硬线与 791–793 KB 预算来自 findings S4，合理。
- `.md` 关联不做、不写注册表，符合 S4 与 AGENTS 的产品决策边界。

## 逐项核对记录

### T3
- 编码顺序 BOM→严格 UTF-8→GBK 对「UTF-8 中文」和「GBK」在多数样本上可行；但 GBK 宽松解码/编码与无 BOM UTF-16 是 H1。
- `File.Replace` 临时文件同目录、3 参 `null`、只读/占用异常、`Resolve` 长路径，方向均对；copy 回退、mtime、endsWithNewline 是 H2。
- `mixed` 逐行 EOL 与 Markdown 序列化冲突，T4 已允许 UNVERIFIED；应在 `/__doc` 记录行数并在不匹配时拒绝（H2）。
- `/__doc` 只 GET、405、404、413、409、不回完整路径：方向对；Host/no-store/CORS、postMessage 授权、伪造 path 矛盾是 H4。
- `e.Source` 校验、路径只取 currentPath、消息带 path 拒绝（应改成拒绝，不是忽略）：H4。

### T1
- `/__doc` 初始化 `originalText`/`eolRef`/`baselineRef`/`risks`，方向对；`readOnly` 从 `/__doc` 而非 localStorage 取，方向对；标题/状态栏，方向对。
- 保存状态机、10 秒超时、`id` 配对、另存为 `forget`，方向对。
- **不改直接保存 SHA** 与现有序列化冲突（H3）；**宿主副本早于 T3**（H6）；**fetch 网络失败**回退旧稿（H6）。

### T2
- 冷启动草稿确认放在 `/__doc` 成功后、载入前，方向对；转发后重新 fetch、旧路径失效，方向对。
- 重入与 T1 重复（H5）；保存中切文档的旧回包 `id` 守卫需与 T1 合并。

### T4/T5
- 见上；T4 的 notxt/gbk/readonly/mixed 受 H1/H2 影响；T5 通过。

### 通用
- 文件归属：A T1/T2 串行改 `src/App.tsx`、状态栏、cache、验收脚本；B T3→T4→T5 串行改 host/ADR/文档/package；两组零并发重叠成立。`package.json` 只 T5，`package-lock` 根代理；成立。
- 构建纪律：A `.tmp/host-a` + `.tmp/build-a`，B `.tmp/host-r6` + `host/build.ps1`，CDP 9337/9338 隔离；**但 `.tmp/host-a` 复制时机与 T3 冲突**（H6）。
- 可独立复现：T4 的样本生成、SHA、宿主日志可复现；T1 的宿主段需 T3 后重做；真实系统对话框/中文路径/网络盘仍是 UNVERIFIED，计划已列。

## 做对的地方（别改过头）

1. T3 把「页面不拿路径、宿主只写 currentPath、消息里的路径忽略/拒绝」作为授权边界，方向正确；ADR-0006 把这些写成决策，是这轮最该保留的结构。
2. T3 的 BOM→严格 UTF-8→GBK 三段判定、同目录临时文件 + `File.Replace`、保留 BOM/EOL、mtime 校验，是正确骨架；只需把「严格」补到 GBK 与 UTF-16，把 copy 回退换掉。
3. T4 的九类样本 + SHA 对照 + 宿主日志错误码，是能独立复现的验收设计；T5 的 30 个零引用清单不照 STATE 旧数字执行，方向对。

---

### 附：本次审查证据

- `host/Program.cs` 当前无 `/__doc`、无 `WebMessageReceived`（grep 为空），T1/T3 的依赖关系真实存在。
- `App.tsx:1319-1337`（`saveFile` 首次对比）、`:1260-1303`（`commitSave`）、`:1305-1310`（`currentMarkdown`）；`findings-bug.md:64-72`（`lf.md` 不改保存也变 `  \n`）。
- `.NET Encoding.GetEncoding(936)` 默认 replacement fallback：`plan.md:55` 未指定异常回退。
- `findings-bug.md:181-186`：`window.__sidelightHost` 可伪造、`postMessage` 无授权、XSS 未验。
- `findings-ship.md:59-64`：0.18.0 安装包 788,878 / 硬线 850,000，写回预算 +2.5–3.5 KB；T5 预算合理。
- 未改产品文件、未 commit；未生成新截图。
