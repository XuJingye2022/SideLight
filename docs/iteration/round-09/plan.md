# 第 09 轮 · 计划（rev2）

基线 `875297e`（v0.21.0 产品代码 `47e5602`）。4 个任务：A 组（builder，前端）T1→T2 串行；B 组（builder2，宿主/发布）T3→T4 串行，可并行于 A。本轮只做宿主已知的最近打开，浏览器重开不做。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`；宿主真实段用 `.tmp/host-a` 副本（`Copy-Item host/bin .tmp/host-a -Recurse`，覆盖 `.tmp/build-a/*` 进 `www`，CDP 9340）。B 用 `host/build.ps1`，产物与探针在 `.tmp/host-b`（CDP 9341）。`package.json` 只归 T4；`package-lock` 由根代理 `npm install --package-lock-only` 同步并纳入 T4 验收。

## T1 文件菜单「最近打开」：列表、键盘、空态、清除与撤销（U1–U5/H3/H4）｜A 组（builder，先做）

- **目标**：桌面版文件菜单在 4 个动作之后内联「最近打开」标题 + 最多 8 条两行条目 + 分隔线 + 「清除最近记录」；键盘可遍历；短窗口可滚动；浏览器无宿主整段不渲染；清除/撤销/失败都有明确反馈；脏文档点最近项能「保存成功后打开」。
- **为什么现在**：U1 实测 8 条两行菜单高 584 px，1024×600 裁 17 px、960×500 裁 117 px 且滚轮无效；U2 实测无父目录时同名文件无法区分；U3/U4 需要三态与「隐藏而非禁用」（禁用行对比度 1.74:1）；H4 实测 `requestSave('switch')` 只会切 `pendingSwitch` 里的旧目标，没有「保存后打开最近项」的接点。
- **文件**：`src/components/FileMenu.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/recent-acceptance.mjs`（新）
- **步骤**
  1. 数据获取：启动与每次打开菜单时 `fetch('/__recent', {cache:'no-store'})`；宿主判定仍用 `window.chrome?.webview`。响应三态：`state:'disabled'` → 显示一行 `--ink-soft` 原因（不用 `disabled`）；`state:'volatile'` → 标题旁小字「临时目录，重启可能丢失」；`state:'ok'` 正常渲染；请求失败/非 JSON 也走「读不出来，重开应用再试」。
  2. 菜单结构：4 动作 → `<div role="separator">` → `<div role="presentation">最近打开</div>` → 条目 `<button role="menuitem" className="recent-item" title={`${name} · ${dir}`}>`（两行 `recent-name` / `recent-dir`，`dir` 是宿主给的 `/` 分隔串）→ 分隔线 → `<button role="menuitem">清除最近记录</button>`；标题与分隔线不加 `menuitem`；空态一行灰字；`no-host` 整段不渲染。
  3. 打开条目（H4）：统一走 `requestSave({ goal: 'switch', after: () => sendOpenRecent(id, seq) })`——**给 `requestSave` 增加 `after?: () => void`**，由成功保存/无需保存的 `runSave` 分支在切换前调用；取消或保存失败不调用。`sendOpenRecent` 只发 `{v:1,type:'open-recent',id,seq}`，成功后由宿主 reload，页面重新 `/__doc`。不得直接调 `performSwitch` 或复用旧 `pendingSwitch`。
  4. 清除与撤销：不弹模态，发 `{v:1,type:'recent-clear',id}`；成功 → 关菜单、焦点回触发器、toast「已清除最近记录。」6 秒（只清列表，不删文档/草稿/批注/host.log）+「撤销」`action` → `{v:1,type:'recent-restore',id}`；失败（`ok:false`）→ `kind:'error'`「清除失败：<原因>。最近记录还在。」并保持列表。
  5. 统一 `recentError(error)` 处理函数（T1/T2 共用）：`ok:false` 的 `error` 按 T3 错误码表映射文案，供 clear/remove/restore 与 open-recent 共用，杜绝两套实现。
  6. CSS：`.file-menu { max-height: calc(100vh - 46px); overflow: hidden auto; overscroll-behavior: contain }`；`.recent-item` 两行（column、`gap:1px`、覆盖 `justify-content:space-between`）；`recent-name`/`recent-dir` 单行省略，`dir` 用 `var(--text-xs)` + `--ink-faint`。
  7. `scripts/recent-acceptance.mjs`：`addInitScript` 注入假 `window.chrome.webview.postMessage` 并路由 `/__recent`；宿主真实段用 `.tmp/host-a`（T3 后由根代理放行）。
- **验收（脚本全 PASS）**
  1. 无宿主：菜单没有「最近」字样（4 项、130 px）；`state:'disabled'` 显示原因行且菜单可用；`state:'volatile'` 显示「临时目录」小字。
  2. 8 条：同名文件靠 `dir` 区分；长名 `title` 含全名；`ArrowDown` 连按 12 次依次过 4 动作 → 8 条 → 清除，`Home`/`End`/`Esc` 正常。
  3. 1024×600 与 960×500：菜单滚到底可见「清除最近记录」，`End` 后 `.app` 不整体上移；1440/1280/1024×768 无滚动条。
  4. **脏文档点最近项**：出现保存确认 →「保存并切换」→ 保存成功后发出的 `open-recent` 的 `id/seq` 是**刚点的那条**（不是旧 `pendingSwitch`）；「取消」→ 不发 `open-recent`、不切文档。
  5. 清除成功/失败/撤销：成功 toast + `recent-restore`；失败 toast 为 error 且列表不变。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/recent-acceptance.mjs`
- **风险与回退**：`requestSave` 加 `after` 影响四条保存路径（`saveFile`/`saveAsCopy`/`saveAndSwitch`/宿主写回），要逐条确认不误触发；`recent-restore` 依赖宿主持有快照，宿主重启后失效（文档写明）。回退：`git checkout -- src/` 并删脚本。
- **难度** M ｜ **量级** 220–300 行

## T2 失效条目：保留 + 「从列表移除」+ 按错误码映射（B2/B3/H5）｜A 组（builder，T1 后）

- **目标**：点失效条目时**保留**该行，给具体原因（不存在 / 只读 / 编码 / 过大 / 网络/IO / 列表过期），并提供「从列表移除」；`STALE` 期间禁用该行直到刷新完成；remove 与 clear 共用一套错误处理。
- **为什么现在**：B2 实测转发已删除文件时界面完全无变化、argv 只回「宿主返回 409」；B3 证明不能用列表下标重开；H5 指出 T2 的文案若依赖未定义的错误码，只读/编码/过大分支永远不触发。
- **文件**：`src/App.tsx`、`src/components/FileMenu.tsx`、`src/styles.css`、`scripts/recent-acceptance.mjs`（扩用例）
- **步骤**
  1. **只做映射**：按 T3 的错误码表 `STALE | FILE_GONE | READONLY | ENCODING | TOO_LARGE | BAD_REQUEST | IO | NO_STATE_DIR` 给文案（文件不存在或已移动 / 只能只读打开 / 编码无法识别 / 文件超过 6 MB / 请求被拒 / 读取失败，可能是网络盘或权限问题 / 最近记录功能不可用）；不新增码、不改 T1 的 `recentError` 结构。
  2. 失败 toast：`kind:'error'` 不自动消失，带「从列表移除」（`{v:1,type:'recent-remove',id,seq}`）与「重试」（重发 `open-recent`）。
  3. `STALE`：立即重新拉 `/__recent`，刷新期间把该行 `disabled`（仅此临时态允许 disabled）并按新 `seq` 重新启用；防重复点击（同一行在飞时忽略二次点击）。
  4. 移除失败（`ok:false`）复用 T1 的 `recentError`，行保留并提示；成功则重新拉列表使该行消失。不做自动移除，不做按路径打开。
- **验收（扩脚本）**
  1. `error:'FILE_GONE'` → toast 含「文件不存在」、两个按钮、**列表行仍在**；点移除 → 发 `recent-remove`、重新拉取后该行消失。
  2. `READONLY`/`ENCODING`/`TOO_LARGE` 各出现不同文案（不是同一句泛化「打开失败」）。
  3. `STALE` → 触发一次 `/__recent`；刷新前该行不可点，刷新后按新 `seq` 可点；连续点击只发一次。
  4. 移除失败 → toast 为 error、行保留；与清除失败共用同一套文案函数（脚本断言错误文案来自同一映射）。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/recent-acceptance.mjs`
- **风险与回退**：`disabled` 只用于 STALE 临时态，其余不可用态用隐藏/正常色，避免回到 U4 的低对比问题。回退：`git checkout -- src/`。
- **难度** S–M ｜ **量级** 90–140 行

## T3 宿主最近记录：存储、`/__recent`、`open-recent`/clear/remove、日志脱敏轮转（B1/B3/B5/H1/H2/H3）｜B 组（builder2，先做）

- **目标**：宿主在主实例、成功打开后记录最近 8 篇；`/__recent` 契约固定；`open-recent` 只收 `{id,seq}`；clear/restore/remove 都有 `ok:false` 回包；`host.log` 只记 basename、含 `forward applied`、首跑迁移旧日志并轮转；新增 ADR-0009。
- **为什么现在**：B1 实测日志里 `start args`/`pipe sent`/`forward ignored` 都是完整路径且无轮转（`forward applied` 同样有）；B3 实测 `SetCurrentDoc` 在互斥锁之前；B5 没有通用状态目录；H2 指出 `dir` 的 `\` 契约与「无路径」要求冲突，错误码两边不一致。
- **文件**：`host/Program.cs`、`host/recent-probe.mjs`（新）、`docs/adr/0009-recent-files.md`（新）
- **步骤**
  1. **错误码表（先定，T2 只映射）**：`STALE`（seq 不匹配）、`FILE_GONE`（不存在/已移动/是目录/无权限/网络 IO）、`READONLY`、`ENCODING`、`TOO_LARGE`、`BAD_REQUEST`（消息带 `path`/`fileName`/`file` 或字段非法）、`IO`、`NO_STATE_DIR`（无可用状态目录）；全部消息回 `{v:1,type:'<X>-result',id,ok:false,error}`，成功 `{ok:true}`。
  2. **状态目录**：`ResolveStateDir()`：`%LOCALAPPDATA%\Sidelight`（与 `WebView2` 平级）→ 便携（exe 同级可写）→ `%TEMP%\Sidelight`（标易失）；全失败 → 禁用最近，`/__recent` 回 `state:'disabled'`。日志 `state dir=... kind=localappdata|portable|temp|none`。
  3. `recent.json`：`{"v":1,"seq":N,"items":[{id,path,name,dir,openedAt,size,mtime}]}`，原子写（`AtomicWrite`，UTF-8 无 BOM）；损坏 → 备份 `recent.json.bad-<ticks>`（备份失败不挡启动）+ 空表；上限 8；键 = `Path.GetFullPath`（去 `\\?\`）`OrdinalIgnoreCase`；同键更新 `openedAt`/`seq` 并置顶；`id` = 规范化路径 SHA256 前 16 位；`seq` 单调递增。**写失败**：`RecordOpen` 不挡打开，记日志，并把内存里的 `lastError` 记为 `IO`（下一次 `/__recent` 带出）。
  4. **记录点（唯一）**：`RecordOpen(path)` 只在主实例（持 `Global\Sidelight` 之后）且打开成功后调用（argv 成功、`ApplyForwardAsync` 成功、`open-recent` 成功）；`Main` 的 `SetCurrentDoc(pendingFile)` 移到互斥锁判断之后；第二实例只转发路径串、不开文档、不记录。
  5. **契约（H2）**：`GET /__recent`（Host 校验照 `/__doc`、`no-store`、仅 GET）→ 200 `{v:1,state:'ok'|'volatile',items:[{id,seq,name,dir}],lastError?}`；`state:'disabled'` 时 `items:[]` 且带 `reason`；**`openedAt` 只留在 `recent.json`，响应里没有**；`dir` 用 `/` 分隔（如 `文档/草稿`），不含盘符、反斜杠、`..` 与完整路径；两条 `name+dir` 相同时宿主扩到 3 段。
  6. 消息：`open-recent{id,seq}` → `open-recent-result{ok}` 或 `{ok:false,error}`；`recent-remove{id,seq}`、`recent-clear{id}`、`recent-restore{id}` 同构回包（clear 保留内存快照供 restore，宿主重启后回 `STALE`）；`open-recent` 消息里出现 `path`/`fileName`/`file` → `BAD_REQUEST`。打开走新建 `OpenByPath(path, source)`（argv/转发/open-recent 三处共用），成功记录、失败给码。
  7. **日志（H1）**：`LogPath(s)` 统一输出 basename，覆盖 `start args=`、`pipe sent`、`pipe received`、`forward ignored`、**`forward applied`**、`open failed path=`；首次启动检测到旧 `host.log` 且未迁移 → 归档为 `host.log.bad`（失败则删除）并写 `log migrated`，保证升级后旧完整路径不再留在安装目录；`Log` 改静态 `StreamWriter` + 1 MB 轮转（`host.log` → `host.log.1`，最多 2 个）。
  8. `host/recent-probe.mjs`：9 个 argv 依次打开 → 8 条、去重置顶、顺序；`/__recent` 形状按字段表（无 `openedAt`、`dir` 无 `\`/盘符/`..`）、`state` 三态；`open-recent` 正常/旧 `seq`→`STALE`/删除文件→`FILE_GONE`/伪造 `path`→`BAD_REQUEST`/只读与编码样本→对应码；clear→restore→remove 成功与失败回包；损坏 JSON 备份；`%TEMP%` 回退→`state:'volatile'`；`host.log` 无完整路径、含 `log migrated`、轮转文件存在。
  9. `docs/adr/0009-recent-files.md`：背景、决定（状态目录、格式、上限去重、id/seq、只收取 id、错误码、日志脱敏/迁移/轮转、清除与撤销）、隐私（只存本机路径与时间、不上传、页面无路径、**日志可能含文件名、删除日志可清**）、否决方案、UNVERIFIED（真实用户 `%LOCALAPPDATA%` 可写、网络盘卡顿、真人重启后列表）。
- **验收**
  1. `powershell -File host/build.ps1; node host/recent-probe.mjs` exit 0：9→8、去重、契约、错误码、clear/restore/remove、日志五项全 PASS。
  2. `Invoke-WebRequest http://127.0.0.1:47821/__recent` 返回 `{v,state,items:[{id,seq,name,dir}]}`，**无 `openedAt`、无 `\`、无盘符**；`Host: evil` → 403；响应头含 `Cache-Control: no-store`。
  3. `Select-String host/bin/host.log -SimpleMatch 'D:\','C:\Users'` 0 命中；升级场景下 `host.log.bad` 存在且含 `log migrated`。
- **门禁**：`powershell -File host/build.ps1; node host/recent-probe.mjs`
- **风险与回退**：`SetCurrentDoc` 移位改动启动顺序，argv/转发要复测；`id` 用 SHA256 前 16 位，同一路径大小写不同要归并；旧日志迁移只做一次，失败不挡启动。回退：`git checkout -- host/ docs/adr/0009-*.md` 并删探针。
- **难度** L ｜ **量级** 340–440 行

## T4 CI 两行修复 + 0.22.0 文档与隐私（S1–S5/H6）｜B 组（builder2，T3 后）

- **目标**：修掉 `windows-host` 首跑两个必然红（`.tmp`、`release/`），仍不设必过且首跑只 dispatch `windows-host`；版本 0.22.0 与文档；隐私句先写事实、注明「待产品负责人确认」；体积预算 ≤810,000 B（预警 815,000，硬线 850,000 不动）。
- **为什么现在**：S1 实测 `Invoke-WebRequest -OutFile` 不建父目录、`makensis` 缺 `release/` 时 exit 1；S4 实测 README 没有隐私节；S5 要求字节与 SHA 只写 CHANGELOG 一处。
- **文件**：`.github/workflows/ci.yml`、`packaging/installer.ps1`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`package.json`、`packaging/README.md`、`docs/typora-gap.md`
- **步骤**
  1. `ci.yml`：`Fetch WebView2 SDK (pinned)` 第一行加 `New-Item -ItemType Directory -Force .tmp | Out-Null`；保留 `continue-on-error: true`；文件头写首跑计划：**只 dispatch `windows-host`**，绿 3 次后再跑 `install-verify`（它依赖 `windows-host` artifact，失败时跳过而非连带必红，可加 `if: success()` 明确）。
  2. `packaging/installer.ps1`：`$root` 后加 `New-Item -ItemType Directory -Force -Path (Join-Path $root 'release') | Out-Null`；本地删空 `release/` 后单跑脚本验证能出包。
  3. `package.json` 只改 `"version": "0.22.0"`；`package-lock.json` 不手改，由根代理 `npm install --package-lock-only` 同步后**纳入本任务验收**（`Select-String package-lock.json -SimpleMatch '"version": "0.22.0"'`）。
  4. `docs/CHANGELOG.md` 顶部加 `## 0.22.0 — 2026-11-16`（最近打开、去重上限、失效提示与移除、清除与撤销、日志脱敏/迁移/轮转、CI 两行、隐私事实；字节/SHA 只写这里 `[TBD]`）。
  5. README：加最近打开一条（「桌面版…浏览器里不显示」；「宿主模式里用『打开文件…』经页面文件选择器打开的文件不进最近列表」）；新增「## 数据与隐私」节，**只写事实、不写承诺**：最近文件存 `%LOCALAPPDATA%\Sidelight\recent.json`（本机路径与时间、不上传、不进正文与导出；页面只拿哈希 id）；清除立即删表但仍保留日志与草稿；**日志可能含文件名，删除 `host.log*` 可清**；卸载保留该目录；草稿与批注在 `.sidelight/`；无遥测、启动不联网。在节首标「（待产品负责人确认后再作为对外承诺）」。
  6. `AGENTS.md §6`：0.22.0、最近打开、未验清单（真人重启后列表、`recent.json` 写失败、网络盘失效、卸载保留、日志迁移）；`packaging/README.md` 卸载段补 `recent.json` 与日志说明；`docs/typora-gap.md` 最近文件行改「有（8 条，可清除，仅桌面版）」；README ADR 范围 0001–0009、包名 0.22.0、体积行「见 CHANGELOG 0.22.0」。
  7. 发布重建顺序写进 `impl-b.md`（根代理执行）：`npm run build` → `host/build.ps1` → `installer.ps1` → `portable.ps1` → `verify-installer.ps1` → 独立 `Get-FileHash` 复核 → 字节/SHA 只回填 CHANGELOG。
- **验收**
  1. `Select-String .github/workflows/ci.yml -SimpleMatch 'New-Item -ItemType Directory -Force .tmp'` ≥1、`continue-on-error: true` 仍在、含「只 dispatch windows-host」注释；`Select-String packaging/installer.ps1 -SimpleMatch "Join-Path $root 'release'"` ≥1；删空 `release/` 后脚本本地实跑能出包。
  2. `node -e "console.log(require('./package.json').version)"` = `0.22.0`；`package-lock.json` 内版本同步为 0.22.0；CHANGELOG 含 `## 0.22.0 — 2026-11-16`；README 含「数据与隐私」「日志可能含文件名」「待产品负责人确认」，无「803,335」旧数、无「已承诺/已清理日志」类措辞。
  3. `Test-Path docs/adr/0009-recent-files.md` = True；`AGENTS.md` 含 `0.22.0`；`impl-b.md` 记「隐私承诺：待产品负责人确认」；`npm test` 0 失败。
- **门禁**：上述命令 + `npm test`
- **风险与回退**：CI 首跑仍可能红（runner 无桌面、SourceForge 限流），不设必过；隐私措辞对外承诺需人确认，未确认前 README 只写事实并标注；`[TBD]` 由根代理回填。回退：`git checkout -- .github/workflows/ci.yml packaging/installer.ps1 README.md AGENTS.md docs/CHANGELOG.md package.json packaging/README.md docs/typora-gap.md`。
- **难度** S–M ｜ **量级** 140–200 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/components/FileMenu.tsx`、`src/App.tsx`、`src/styles.css`、`scripts/recent-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/components/FileMenu.tsx`、`src/styles.css`、`scripts/recent-acceptance.mjs`（扩用例） |
| T3 | B（builder2，先做） | `host/Program.cs`、`host/recent-probe.mjs`、`docs/adr/0009-recent-files.md` |
| T4 | B（builder2，T3 后） | `.github/workflows/ci.yml`、`packaging/installer.ps1`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`package.json`、`packaging/README.md`、`docs/typora-gap.md`（`package-lock.json` 由根代理同步） |

- 两组零重叠：A 只碰 `src/` 与新验收脚本；B 只碰 `host/`、CI、打包脚本、文档与 `package.json`。`package.json` 只归 T4；`npm test` 文件数仍 16。
- 跨组契约（由本计划固定）：`/__recent` = `{v,state:'ok'|'volatile'|'disabled',items:[{id,seq,name,dir}],lastError?}`，`dir` 用 `/` 分隔；消息 `open-recent`/`recent-remove`/`recent-clear`/`recent-restore`，回包 `{ok}` / `{ok:false,error}`，错误码表见 T3 第 1 条；`openedAt` 只留宿主。
- 跨组依赖：T1/T2 用 mock 验收；宿主真实段等 T3 落地后由根代理重做 `.tmp/host-a` 再跑。
- 报告：A 组 `docs/iteration/round-09/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-09/t1-*.png`、`t2-*.png`。

## 本轮不做（写进下轮建议）

**浏览器最近重开**：页面 FSA 拿不到绝对路径、没有 handle 持久化；要做得先解决 origin 私有存储与权限重新授权。文件树删除/重命名、缩略图/预览、MRU 超过 8 条、跨设备同步、列表内显示完整路径同样不做（后者与隐私边界冲突）。

## 本轮 Demo（≤3 条用户可见变化）

1. 桌面版「文件」菜单多出「最近打开」：最多 8 条两行，同名文件可区分；点一下在当前窗口重开；脏文档先保存再打开。
2. 文件被删/改名后点它，给具体原因并保留该行，可「从列表移除」或「重试」；清除后能撤销。
3. 960×500 短窗口里菜单能滚到底；浏览器里不显示这一段；README 有事实性的「数据与隐私」说明。

## 风险最高的任务

**T3**。它同时改记录点、状态目录、协议、错误码与日志：`SetCurrentDoc` 移位改启动顺序；`id+seq` 若与页面错位会「点 A 打开 B」进而写错文件；日志脱敏漏 `forward applied` 或旧日志不迁移，隐私承诺当场破。缓解是 `host/recent-probe.mjs` 的六组断言（9→8 去重、契约与 `dir` 无 `\`、错误码逐码、clear/restore/remove 失败回包、日志无完整路径且 `log migrated`、`state` 三态）。次高是 T1：`requestSave` 新增 `after` 会牵动四条保存路径，写错就出现「保存了却没打开」或「没保存却切文档」。

## 下一轮建议主题

**浏览器侧最近/恢复 + 隐私确认落地**：给 FSA 加 handle 持久化（IndexedDB）与权限重新授权，做浏览器版最近 8 条；产品负责人确认隐私措辞后改为正式承诺；补真实 IME、Alt+F4/注销、网络盘失效条目与 CI `windows-host` 首跑观察。
