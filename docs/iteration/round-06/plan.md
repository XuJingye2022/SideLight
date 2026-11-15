# 第 06 轮 · 计划（rev2）

基线 `d8e84a4`（v0.18.0）。5 个任务：A 组（builder，前端）T1→T2 串行；B 组（builder2，宿主/发布）T3→T4→T5 串行，可并行于 A。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`。B 用 `host/build.ps1`，产物与样本在 `.tmp/host-r6`。**宿主副本时机**：`.tmp/host-a` 只在 **T3 落地后** 从当前 `host/bin` 重新复制，再把 `.tmp/build-a/*` 覆盖进它的 `www`（T1 前半只跑浏览器段，宿主段由根代理在 T3 后放行）。CDP：A 用 9222/9337，B 用 9338；各自 `browser.newContext()`。`package.json` 只归 T5（0.19.0），package-lock 由根代理同步。

## T1 宿主文档经 `/__doc` 打开 + 写回状态机（B1/B3/U2/U3/H3/H6）｜A 组（builder，先做）

- **目标**：双击/命令行打开的 `.md` 由宿主 `/__doc` 提供正文；`Ctrl+S` 走宿主写回并有「保存中 / 成功 / 失败可重试 / 10 秒超时」四态；**没有改动时 `Ctrl+S` 不写盘**（SHA 不变）；标题与状态栏显示文件名；argv 文档初始化 `originalText`/`eolRef`/基线；另存为后清宿主路径；可写时删只读横幅。
- **为什么现在**：B1 实测 13.5 MB 文件因 localStorage 配额注入失败且被吞，页面显示上一篇旧文档；B3 实测 argv 文档 `originalText=null`、`eolRef='lf'`、`risks=[]`，CRLF/BOM 文件保存后无 BOM 且整篇变 LF；U2 窗口标题只有 `Sidelight`；U3 保存无进行中状态。**H3**：`currentMarkdown()` 会把段内软换行改成 `  \n`，所以「不改直接保存 SHA 不变」只能靠「脏时不发写回」实现。
- **文件**：`src/App.tsx`、`src/components/StatusBar.tsx`、`src/styles.css`、`scripts/host-save-acceptance.mjs`（新）
- **步骤**
  1. 启动握手：`fetch('/__doc', { cache:'no-store' })`；**不注入 `window.__sidelightHost`**。分支：200+JSON → 用 `text`（已 LF 归一化）、`fileName`、`encoding`、`eol`、`endsWithNewline`、`lineCount`、`readOnly`、`mtime` 初始化 `docName`/`baselineRef`/`originalText`/`eolRef`/`risks`/`hostDoc={writable:!readOnly,fileName,mtime,ready:true}`；**404 且响应不是 JSON** → 按普通浏览器启动；**网络异常、5xx、200 但非 JSON（Vite SPA fallback）→ 显示可见错误横幅，`hostDoc=null`，绝不回退到旧 localStorage 草稿**；`{ok:false}` → 同一错误横幅，不载入任何正文。
  2. 保存状态机（**本任务唯一实现**，T2 不再新建 ref）：`saving`、`saveError`、`pendingSave`（保存中再按只记一次，回包后用最新正文再发一次）、`pendingIds` 集合、递增 `id`。`hostDoc.ready !== true` 时 `Ctrl+S` 不发写回。
  3. **不改不写**：`dirty === false` 且是宿主文档 → 不发 `save`，给一次 1.5 s 提示「没有改动，未写入」（保证 SHA 不变）；宿主侧同样对「收到的 `text` 与打开时 LF 文本完全相等」直接回 `ok` 不写盘（双重保险）。
  4. 写回请求：`postMessage({v:1,type:'save',id,text})`，`text` LF 归一化、**不含任何路径字段**；只接受 `id ∈ pendingIds` 的 `save-result`；10 s 无回包 → 超时态（不自动重发，可重试）。成功后才 `finishSaved`（清 dirty、更新 `baselineRef`/`originalText`、`persist` 提示「已保存到 <文件名>」）；失败保留 dirty 与 `hostDoc`，按错误码给中文原因 + 「重试 / 另存为」。
  5. 另存为成功后发 `{v:1,type:'forget'}` 并清 `hostDoc`；此后 `Ctrl+S` 走现有句柄/另存为路径。
  6. 名称与状态：`document.title = '<文件名> — Sidelight'`；状态栏加 `.status-chip-quiet`「保存到 <文件名>」（`title="Ctrl+S 保存到这个文件"`，仅宿主文档）；顶栏文档名 `title="保存会写回这个文件"`；宿主文档的左栏空态改成「<文件名> · 这是单独打开的文件」。
  7. 只读横幅只在 `hostDoc.writable === false` 时出现（文案「这个文件目前不能写回。保存会请你另选位置」+「另存为」）；`readOnly` 不再从 localStorage 恢复，读到旧字段即清除；补「保存中」按钮态样式。
  8. `scripts/host-save-acceptance.mjs`：浏览器段即时可跑；宿主段在 T3 落地、`.tmp/host-a` 重做后跑（见构建纪律）。
- **验收（脚本全 PASS；浏览器段随时、宿主段 T3 后）**
  1. `crlf-bom.md`：标题 `crlf-bom.md — Sidelight`、状态栏含「保存到 crlf-bom.md」、无只读横幅；**不输入任何字符直接 `Ctrl+S` → 提示「没有改动，未写入」、原文件 SHA 不变**（`lf.md`、`utf16le-bom.md` 同）。
  2. 改一个字再 `Ctrl+S`：文件仍有 `EF BB BF`、CRLF 计数不变、`git diff --numstat` 1 行、`__slState.dirty === false`、提示含「已保存到」。
  3. `readonly-attr.md`：打开时即显示只读横幅（`/__doc` 的 `readOnly=true` 来自文件属性）；`Ctrl+S` 给「另存为」路径，原文件 SHA 不变。
  4. 失败与时序：宿主侧注入 5 s 延迟 → 超时态出现；晚到回包按 `id` 丢弃；`fetch` 返回 500 → 可见错误横幅、不显示旧草稿、`hostDoc === null`。
  5. 另存为：改到新位置后 `hostDoc` 清空，再改字 `Ctrl+S` 走 picker，旧文件 SHA 不变。
  6. 浏览器（dev 5173，`/__doc` 404 非 JSON）：现有保存/另存为行为不变，不出现任何「写回」字样。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/host-save-acceptance.mjs`（宿主段等 T3 落地后由根代理放行）
- **风险与回退**：`/__doc` 是完整正文 JSON，32 MB 上限下内存 2–3 倍；`dirty=false` 的「不写」会让「保存」看起来没反应，用提示补足；旧 `readOnly` 字段清理要幂等。回退：`git checkout -- src/` 并删脚本。
- **难度** M ｜ **量级** 240–320 行

## T2 冷启动草稿确认、转发后刷新、切文档守卫（S1/S2/H5）｜A 组（builder，T1 后）

- **目标**：冷启动打开文件前若 localStorage 有未保存草稿先确认（S1）；单实例转发后页面拿到新文件信息、旧路径立即失效（S2）；保存中切换文档不清新文档的 dirty（与 T1 同一套状态机）。
- **为什么现在**：S1 实测宿主启动直接把正文写进 `sidelight.doc.v1`，上次草稿被静默替换；S2 实测注入脚本只注册一次、转发后信息仍是第一篇；B4 实测连按两次 `Ctrl+S` 触发两次保存。
- **文件**：`src/App.tsx`、`src/lib/cache.ts`、`scripts/host-save-acceptance.mjs`（扩三组用例）
- **步骤**
  1. 草稿确认：`/__doc` 成功且 `localStorage['sidelight.doc.v1']` 有 `savedAt > 0`、正文与宿主正文不同 → 先弹「有未保存的草稿（保存于 <时间>）。打开 <文件名> 会替换它。」按钮「继续打开」/「保留草稿」。取消 → 不载入宿主正文、`hostDoc=null`（不写回）、恢复草稿并提示；继续 → 载入宿主正文。
  2. 转发刷新时序写死：**宿主先更新 `currentPath`/`currentMeta` → reload → 页面 `fetch('/__doc')` → 核对返回的 `fileName`/`mtime`** → 才把 `hostDoc.ready` 置 true；`fetch` 失败或 404 → 立即清 `hostDoc` 并提示「宿主文件信息已失效，保存请用另存为」。
  3. **切文档/新建守卫**（唯一新增逻辑，不新建 `savingRef`/`pendingSaveRef`）：若 T1 的 `saving` 为真，等回包或超时后再执行；旧回包 `id ∉ pendingIds` 一律忽略，不清新文档 dirty。
- **验收（脚本全 PASS）**
  1. 冷启动带草稿：注入 `{text:'草稿-OLD', savedAt: Date.now()}` + 启动宿主 `x.md` → 出现确认框；「保留草稿」→ 正文仍 `草稿-OLD`、`hostDoc===null`、`Ctrl+S` 走 picker；「继续打开」→ 正文是 `x.md`、`dirty===false`。
  2. 转发：先开 `a.md` 再转发 `b.md` → `/__doc` 的 `fileName==='b.md'` 且 `mtime` 与宿主日志一致；状态栏「保存到 b.md」；`Ctrl+S` 写 `b.md`，`a.md` SHA 不变。
  3. 保存中切文档：宿主注入 2 s 延迟，保存中切到另一篇 → 旧回包不清新文档 dirty、不显示「已保存」。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/host-save-acceptance.mjs`
- **风险与回退**：草稿确认是页面内对话框（复用 `useDialogFocus`）；转发后 fetch 与页面加载有竞态，失败即失效而非重试旧稿。回退：`git checkout -- src/`。
- **难度** S–M ｜ **量级** 100–150 行

## T3 宿主 `/__doc` 与写回通道：严格编码、原子写、授权（H1/H2/H4）｜B 组（builder2，先做）

- **目标**：`GET /__doc` 提供正文与元数据；写回只写 argv 记录的当前路径；严格编码判定、保留 BOM/EOL；不含 copy 直写的原子替换；mtime 校验；错误码；日志；ADR-0006。
- **为什么现在**：B1/B2/B3/B5 证明 localStorage 通道不承载大文件与编码；写回若宽松解码或非原子写会毁原件。**H1**：`Encoding.GetEncoding(936)` 默认替换回退会把非法字节变成 U+FFFD 替换符、编码失败写成 `?`；**H2**：`File.Copy` 覆盖不是原子操作。
- **文件**：`host/Program.cs`、`docs/adr/0006-argv-writeback.md`（新）
- **步骤**
  1. `GET /__doc`：只允许 GET（其余 405）；**只接受 `Host: 127.0.0.1:47821`，否则 403**；响应头 `Cache-Control: no-store`，**不加任何 CORS 头**。无当前文档 → 404。有则读字节并判定：BOM（`EF BB BF`/`FF FE`/`FE FF`）→ 严格 UTF-8（`new UTF8Encoding(false,true)`）→ 严格 GBK（`Encoding.GetEncoding(936, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback)`）→ 全部失败或**解出文本含 `\u0000`（疑似无 BOM UTF-16）→ 409 `{v:1,ok:false,error:"ENCODING"}`**。文件缺失 → 409 `FILE_GONE`；> 32 MB → 413 `TOO_LARGE`。成功返回 `{v:1,fileName,encoding,bom,eol:'crlf'|'lf'|'mixed',endsWithNewline,lineCount,size,mtime,readOnly,text}`，`text` LF 归一化，**不含任何完整路径**；`readOnly` 取 `File.GetAttributes` 的 `ReadOnly`；`mtime` 用 `File.GetLastWriteTimeUtc(...).Ticks`。
  2. 消息通道 `WebMessageReceived`：只接受 `{v:1,type:'save',id,text}`（`text` ≤32 MB、LF）与 `{v:1,type:'forget'}`；校验 `e.Source` 是 `http://127.0.0.1:47821/index.html`；**消息里出现 `path`/`fileName`/`file` 任一字段 → 一律 `BAD_REQUEST` 并拒绝写盘**（不忽略、不写 currentPath）。路径只取宿主字段 `currentPath`。写盘串行（信号量），同一 `id` 幂等。
  3. 不改不写：收到的 `text` 与打开时 LF 文本完全相等 → 回 `ok`（`bytes=原 size`）**且不写盘**（SHA 天然不变）。
  4. 落盘：`currentPath` 存在性 → `ReadOnly` 属性（`READONLY`）→ `mtime`/`size` 与打开时比对（`PATH_CHANGED`）→ 按原 `eol` 还原（`crlf` 全 CRLF、`lf` 全 LF；`mixed` 用打开时记的逐行 EOL 序列，**行数与 `/__doc` 的 `lineCount` 不符 → `EOL_MISMATCH`**，不静默按多数改写）→ 按原 `encoding` 编码（严格 GBK 编码失败 → `ENCODING`，**绝不写 `?`**）→ 有 BOM 才补 → 结尾：`text.TrimEnd('\n')` 后仅当 `endsWithNewline` 为真补一个 `\n`。写入用同目录临时文件 `.sidelight-tmp-<guid>` + `File.Replace(target, temp, null)`（3 参显式 `null`）；`File.Replace` 失败时用 `MoveFileEx(temp, target, REPLACE_EXISTING|WRITE_THROUGH)`（P/Invoke），**任何分支都不得 `File.Copy` 直写目标**；失败保留原文件、删临时文件。全程走 `Resolve()` 的 `\\?\` 路径。
  5. 回包：`{v:1,type:'save-result',id,ok:true,bytes,mtime}` 或 `ok:false,error:'BAD_REQUEST'|'READONLY'|'FILE_LOCKED'|'PATH_CHANGED'|'FILE_GONE'|'ENCODING'|'TOO_LARGE'|'EOL_MISMATCH'|'IO'`；异常映射：`IOException`→`FILE_LOCKED`、`UnauthorizedAccessException`→`READONLY`、其余→`IO`。日志只记文件名、字节数、错误码，不写正文。
  6. 启动/转发：argv 与单实例转发都更新 `currentPath`/`currentMeta`（转发**先**更新再 reload）；目录作 argv → `FILE_GONE` + 可见错误。
  7. ADR-0006：背景、决定（宿主唯一写者、页面不拿路径、不注入 `window.__sidelightHost`、信息只从 `/__doc` 取）、协议表（字段/错误码/`forget`）、写盘与回退、生命周期、S1/S2、边界（只覆盖 argv 一个文件；页面被攻破最多覆盖当前文件，写进 ADR）、否决方案、验收。
- **验收**：`powershell -File host/build.ps1` 后 T4 探针全 PASS；`Invoke-WebRequest http://127.0.0.1:47821/__doc` 返回 JSON 且**无完整路径**、带 `Cache-Control: no-store`；伪造 `Host: evil` → 403；`Select-String host/Program.cs -SimpleMatch '/__doc','WebMessageReceived','File.Replace','MoveFileEx','ExceptionFallback','BAD_REQUEST'` 各 ≥1。
- **门禁**：`powershell -ExecutionPolicy Bypass -File host/build.ps1; node host/save-probe.mjs`（探针由 T4 提供，先合并后跑）
- **风险与回退**：`MoveFileEx` 的 P/Invoke 与长路径前缀组合要实测；`mixed` 行数不符一律拒绝（宁可让用户另存为）；GBK 严格编码会让含 emoji 的 GBK 文件保存失败，这是预期（提示换 UTF-8 另存）。回退：`git checkout -- host/ docs/adr/0006-*.md`。
- **难度** L ｜ **量级** 340–440 行

## T4 写回验收探针 + CHANGELOG 0.19.0 + 文档状态（H3/H4）｜B 组（builder2，T3 后）

- **目标**：样本证明编码/换行/BOM/只读/大文件/授权/不改不写 7 类符合预期；**「不改保存」走真实前端 `Ctrl+S`**；写 0.19.0 CHANGELOG；README/AGENTS 状态对齐。
- **为什么现在**：附 B 的「预期字节」没有脚本就无法独立复现；S3 列了 README 五处假话；**H3** 要求 SHA 断言必须经前端路径，直接 `postMessage` 只能证明宿主、不能证明产品。
- **文件**：`host/save-probe.mjs`（新）、`docs/CHANGELOG.md`、`README.md`、`AGENTS.md`、`packaging/README.md`
- **步骤**
  1. `host/save-probe.mjs`：生成样本到 `.tmp/host-r6/samples/`（`crlf-bom`、`lf`、`mixed-eol-bom`、`utf16le-bom`、`gbk`、`readonly-attr`、`big13`、`huge33`、`notxt`），起 `.tmp/host-r6`（CDP 9338；`www` 用 **T1 的 `.tmp/build-a`**，宿主用当前 `host/bin`）。
  2. **前端路径段（H3）**：`crlf-bom`/`lf`/`utf16le-bom` 打开后不输入，用 CDP 按 `Ctrl+S` → 断言提示「没有改动，未写入」、原文件 SHA 不变；再输入一个字后 `Ctrl+S` → BOM/CRLF 保留、`git diff --numstat` 1 行、`dirty=false`。
  3. **宿主协议段**：`gbk` 打开无 U+FFFD、不改保存 SHA 不变（严格解码 + 严格编码）；`notxt` → 409 `ENCODING`（页面可见错误）；`huge33` → 413 `TOO_LARGE`；`readonly-attr` → 打开即只读横幅、保存回 `READONLY`、SHA 不变、无临时文件残留；外部改文件后保存 → `PATH_CHANGED`；save 消息带 `path` → `BAD_REQUEST`（win.ini 未变，样本文件未变）；`mixed` 行数被改后保存 → `EOL_MISMATCH`（或按 ADR 记 UNVERIFIED）。
  4. `docs/CHANGELOG.md` 顶部加 `## 0.19.0 — 2026-11-15`（写回通道、BOM/EOL、10 s 超时、转发可写、清路径、横幅改文案、测试数、体积 `[TBD]`、未验清单），补 0.18.0 与 0.17.0 之间的空行。
  5. README/AGENTS 按 S3 逐条改（`:32` 拆列表并改写回事实、`:38` 包名 0.19.0、`:44` 删「主题切换」、`:69` 测试数、`:101` ADR 0001–0006、`:62` 体积 `[TBD]`、`:124` 下一步、补 ADR-0006 决策行）；AGENTS §6 未验清单加「写回：文件占用/只读/网络盘/中文路径/真人双击」。
  6. `packaging/README.md`：补「`.md` 关联本轮不做」与体积预算（850,000 硬线，预计 +3 KB）。
- **验收**：`node host/save-probe.mjs` 打印每样本 PASS/FAIL 且 exit 0（允许写明原因的 UNVERIFIED 行）；`Select-String README.md -SimpleMatch '`n- 双击','主题切换','171 条','0.18.0-win-x64-setup'` 0 命中；`Select-String docs/CHANGELOG.md -SimpleMatch '## 0.19.0 — 2026-11-15'` ≥1；`Select-String AGENTS.md -SimpleMatch '0.19.0'` ≥1；`npm test` 0 失败。
- **门禁**：`powershell -File host/build.ps1; node host/save-probe.mjs; npm test`
- **风险与回退**：探针依赖 T1 的前端构建与 T3 的宿主，根代理在两者完成后放行；`huge33` 生成 33 MB 文件需清理；`[TBD]` 由根代理回填。回退：`git checkout -- host/ docs/CHANGELOG.md README.md AGENTS.md packaging/README.md`。
- **难度** M ｜ **量级** 280–380 行

## T5 版本 0.19.0、shots 清单交接、产物重建（S5）｜B 组（builder2，T4 后）

- **目标**：版本升 0.19.0；重新生成零引用截图清单交根代理（不执行 git）；给出产物重建步骤与体积预算；`.md` 关联明确本轮不做。
- **为什么现在**：S5 实测 STATE 的「43 个 / 3.1 MB」已过期，实际历史零引用 **30 个 / 2,007,292 B**；版本与产物必须同一次收尾。
- **文件**：`package.json`、`.tmp/shots-zero.csv`（生成物，不提交）
- **步骤**
  1. `package.json` 只改 `"version": "0.19.0"`；package-lock 不动（根代理 `npm install --package-lock-only`）。
  2. 用 S5 的扫描脚本重新生成清单（排除 `shots/round-06/`、`.git`、`node_modules`、`release`、`.tmp`），导出 `.tmp/shots-zero.csv`，记录条数与字节；与 STATE 的 43 对照写清差异。
  3. 清单与核对说明写进 `impl-b.md` 交根代理执行 `git rm -- $paths`；本任务不做任何 git 写操作。
  4. 产物重建顺序（根代理执行）：`npm run build` → `host/build.ps1` → `packaging/installer.ps1` → `packaging/portable.ps1` → 记字节与 SHA256，回填 CHANGELOG/README 的 `[TBD]`；预算 850,000 B 硬线、预计 791–793 KB。
  5. `.md` 关联本轮不做（memo：只加 `OpenWithProgids`、不承诺默认程序、`/S` 静默不装），写进 README「不能做什么」一句与下轮建议。
- **验收**：`node -e "console.log(require('./package.json').version)"` = `0.19.0`；`.tmp/shots-zero.csv` 数据行（不含表头）**= 30** 且每条都在 `git ls-files shots` 里；`git status --porcelain` 无 `shots/` 删除；`Select-String packaging/installer.nsi -SimpleMatch 'OpenWithProgids','UserChoice'` 0 命中。
- **门禁**：上述命令 + `npm test`
- **风险与回退**：文件名匹配可能漏「只写路径」的引用，抽 2–3 个人工确认后交根代理；版本改了但产物未重建会造成包名不符，重建顺序写死。回退：`git checkout -- package.json`，删 `.tmp/shots-zero.csv`。
- **难度** S ｜ **量级** 40–70 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/components/StatusBar.tsx`、`src/styles.css`、`scripts/host-save-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/lib/cache.ts`、`scripts/host-save-acceptance.mjs`（扩用例） |
| T3 | B（builder2，先做） | `host/Program.cs`、`docs/adr/0006-argv-writeback.md` |
| T4 | B（builder2，T3 后） | `host/save-probe.mjs`、`docs/CHANGELOG.md`、`README.md`、`AGENTS.md`、`packaging/README.md` |
| T5 | B（builder2，T4 后） | `package.json`、`.tmp/shots-zero.csv`（生成物） |

- 两组零重叠：A 只碰 `src/` 与新验收脚本；B 只碰 `host/`、`docs/adr/0006`、文档、`packaging/`、`package.json`。`package.json` 只归 T5；`package-lock.json` 由根代理同步；`npm test` 文件数不变。
- 宿主副本：`.tmp/host-a` 在 **T3 落地后** 由根代理从当前 `host/bin` 重新复制并覆盖 `.tmp/build-a`（CDP 9337）；B 用 `.tmp/host-r6`（`host/build.ps1`，CDP 9338）；T4 的 `www` 用 T1 的 `.tmp/build-a`。
- 跨组依赖与放行顺序：T3 落地 → 重做 `.tmp/host-a` → T1 宿主段；T1 与 T3 都完成 → T4 探针；T4 完成 → T5；根代理最终 build 后重建产物。
- 报告：A 组 `docs/iteration/round-06/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-06/t*-*.png`。

## 本轮不做（写进下轮建议）

`.md` 关联（memo 已定只加 `OpenWithProgids`，等产品负责人定）；外部修改三选一对话框（本轮 `PATH_CHANGED` 报错不覆盖，last-write-wins 之外不做交互）；KaTeX 惰性化（S1 证据已备，独立 spike）；磁盘满/UNC/符号链接端到端样本；`shots` 实际 `git rm`（根代理做）。

## 本轮 Demo（≤3 条用户可见变化）

1. 双击/命令行打开的 `.md` 不再只读：`Ctrl+S` 写回原文件，标题与状态栏显示文件名；没改动时按保存会提示「没有改动，未写入」，原文件字节不变。
2. 写回保留 BOM 与换行（CRLF/UTF-16 原样）；保存中按钮显示「保存中…」，失败说原因、不丢改动、可重试。
3. 13.5 MB 大文件能打开（不再显示上一篇旧文档）；GBK 文件不乱码，严格编码失败会提示换 UTF-8，不会写成 `?`。

## 风险最高的任务

**T3**。它是唯一能改坏用户原文件的改动：严格编码（GBK 双向、NUL 判定）、逐行 EOL 与 `lineCount` 校验、无 copy 的原子替换、mtime 校验、只写 `currentPath` 的授权，任一处错位就是「写错文件」或「毁原件」。缓解是 T4 的九类样本逐字节验收（含带 `path` 的伪造消息必须 `BAD_REQUEST`）+ T1 前端路径的「不改不写、SHA 不变」硬断言。次高是 T1：`/__doc` 是完整正文，32 MB 上限下内存与 JSON 序列化要实测，且 fetch 的 5xx/非 JSON 分支不能让旧草稿复活。

## 下一轮建议主题

**写回真实场景 + KaTeX spike**：宿主内补外部修改三选一、磁盘满/UNC/符号链接、真人双击与中文路径写回；同时做 KaTeX 惰性化 spike（shim + 双 CSS + woff2 插件改造，成功标准与 kill criteria 已在 findings-ship 备好）；`.md` 关联按 memo 走产品决策。
