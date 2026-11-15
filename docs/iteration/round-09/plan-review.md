# 第 09 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-09/plan.md`（基线 `875297e`，v0.21.0）。
审查方式：读计划、三份 findings、`host/Program.cs` 的启动/互斥/转发/日志段、`src/components/FileMenu.tsx`、`src/styles.css`；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（日志仍有完整路径，含升级前的旧日志）、H2（`/__recent` 契约与 `open-recent` 错误码自相矛盾）、H4（`open-recent` 的脏检查没有可用的「保存后继续打开」路径）是 blocker；H3/H5/H6 为 major。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T3 的脱敏清单漏了 `forward applied`：现 `Program.cs:1302` 就写完整路径；findings B1 也记了同一行。轮转只把 `host.log` 改成 `host.log.1`，**升级后旧的 `host.log` 里已有完整路径仍保留**，首跑轮转还会把旧路径搬进 `.1`；`ClearRecent` 只清列表，不碰日志。 | `plan.md:57`（LogPath 清单）；`host/Program.cs:1302`（`forward applied`）；`findings-bug.md:56-60`（完整路径样例）、`:38`（清除不删日志） | `LogPath` 覆盖 `forward applied`/`pipe sent`/`pipe received`/`start args`/`open failed` 等全部路径；首次升级做一次性迁移（把旧 `host.log` 归档为 `.bad` 或直接删除并写 `log migrated`）；隐私文案写「日志可能含文件名」；`ClearRecent` 文案不暗示清日志 | T3 |
| H2 | blocker | T3 的 `/__recent` 契约自相矛盾：T3 `:48` 说只回 `{id,seq,name,dir}`、`openedAt` 只留 `recent.json`；T3 `:55` 又回 `openedAt`。更硬的是 `dir`：T3 `:55` 一边要「父目录最后 1–2 段」，一边要求「不含 `\`」，探针 `:58` 又断言响应无 `\`——两段拼接必然有分隔符，三者不能同时成立。`open-recent-result` 的 T3 白名单只有 `STALE/FILE_GONE/BAD_REQUEST/IO`，T2 `:34` 却要 `READONLY/ENCODING/TOO_LARGE`。 | `plan.md:34,48,55-56`；`findings-ux.md:116-121`（`dir` 例 `文档\草稿`）；`findings-bug.md:42`（编码/只读码） | 固定 `/__recent` 形状：`{id,seq,name,dir}`（`dir` 用数组或 `/` 分隔，不用 `\`，不带盘符/`..`），`openedAt` 只留宿主；`open-recent-result` 白名单补齐 `READONLY/ENCODING/TOO_LARGE/PATH_CHANGED` 或明确映射；T1/T2/T3 共用一张字段表，探针按表断言 | T3/T2/T1 |
| H3 | major | T3 的 `/__recent` 写失败、`recent-clear`/`recent-remove` 失败没有明确回包：`RecordOpen` 的原子写失败只「记日志」，页面看到的是旧列表；T1 `:15` 的清除失败要求 error toast 且保留列表，但 T3 `:56` 的 `recent-clear`/`recent-remove` 没写 `ok:false` 与错误码。`recent.json` 在 `%TEMP%` 回退时会被系统清理，T1 没有「易失」提示。 | `plan.md:52-58`；`findings-bug.md:47-52`（写失败/损坏/目录不可写）；`plan.md:15`（清除失败态） | `draft-save` 式回包：`{v:1,type:'recent-clear-result',ok,error}`、`recent-remove-result`；写失败不挡打开但 `/__recent` 回 `state:'degraded'` 或在页面显示原因；TEMP 状态在 `/__recent` 带 `volatile:true`，T1 显示「本次会话有效」 | T3/T1 |
| H4 | blocker | T1 `:14` 说「先走现有脏检查（`requestSave` 的 switch/`pendingSwitch`），确认后发 `open-recent`」，但 `requestSave('switch')` 现有的后续是 `performSwitch()`（切到 `pendingSwitch` 里预先存好的文档），没有「保存完再打开最近项」的参数；`pendingSwitch` 也没有 `after` 的现成接法。结果是：脏文档点最近项 → 用户点「保存并切换」→ 切到旧目标/或无动作，刚点的最近项不会打开。 | `plan.md:14`；`App.tsx:1674-1688`（`runSave`/`performSwitch`）、`:1861-1866`（`requestSave('switch')`）、`pendingSwitch` 类型 `:197`；`findings-ux.md:234`（必须走 `requestSave` 的 switch） | 给 `requestSave` 增加 `after?: () => void`，或给 `pendingSwitch` 增加 `after` 并在 `performSwitch` 调用；`open-recent` 只在确认/保存成功后发；补「脏文档点最近项 → 保存并切换后打开的是最近项，不是旧 pendingSwitch」断言 | T1 |
| H5 | major | T2 的错误文案依赖 `open-recent-result` 的 `READONLY/ENCODING/TOO_LARGE`，但 T3 的白名单不包含（H2）；`STALE` 的「刷新后再点」没有防重复点击/焦点保持；`recent-remove` 失败保留行的逻辑与 T1 清除失败 toast 两套实现，容易一边清空一边报错。 | `plan.md:34,39-41`；`plan.md:56`；`findings-ux.md:191-195`（失效提示） | 由 T3 统一错误码表，T2 只做文案映射；`STALE` 时禁用当前行直到 `/__recent` 返回；`recent-remove` 与 `recent-clear` 共用一个 `recentError` 处理函数；补「remove 失败行仍在」「STALE 后同一行不重复发」 | T2 |
| H6 | major | T4 的 0.22.0 文档与隐私句要求「产品负责人确认」（`plan.md:86` 已写），但验收 `:82-84` 没有任何「确认记录」字段；`package.json`/`package-lock` 同步交给根代理，T4 只改 `package.json` 版本；CI 两行修复不设为必过，首跑仍可能红在 WebView2/NSIS 下载，计划已写「不设必过」，但 `install-verify` 依赖 `windows-host` artifact，失败时仍会连带红。 | `plan.md:75-86`；`findings-ship.md:58-78`（首跑步骤与 `install-verify` 依赖）、`:181`（隐私需产品负责人点头） | T4 验收加一条「README 隐私句的来源/确认记录」（例如 `impl-b.md` 记「产品负责人确认：是/待确认」，UNVERIFIED 不写成已发布承诺）；`install-verify` 在 `windows-host` 失败时跳过或标 advisory；`package-lock` 由根代理 `npm install --package-lock-only` 并纳入 T4 验收 | T4 |

---

## H1（blocker）日志仍有完整路径，旧日志还留着

findings-bug `:56` 的实测样例：

```
start args=D:\...\b.md
pipe sent D:\...\b.md
forward ignored D:\...\b.md
```

计划 `:57` 只列了 `start args=`/`pipe sent`/`pipe received`/`forward ignored`/`open failed path=`，**漏了 `forward applied`**（`Program.cs:1302`）。按 T3 的 `LogPath` 改法，这一行仍会把完整路径写进 `host.log`。

轮转也有边界：

- `host.log` → `host.log.1`，最多 2 个文件；**首次升级时旧 `host.log` 里已有完整路径**，轮转只是把它改名，不会清掉。用户把便携目录发出去、或按 README 发日志排障，仍会泄露历史路径。
- `recent-clear` 只清列表（findings B1 `:38` 明确要求不要暗示清日志）；README 的「清除立即删表」不能写成「隐私已清」。

修：

1. `LogPath` 覆盖全部带路径的日志点（含 `forward applied`），并加一条 `Select-String host/bin/host.log 'D:\','C:\Users'` 0 命中；
2. 首次升级做一次性迁移：把旧 `host.log` 归档为 `host.log.bad`（或删除）并写 `log migrated`，避免旧路径继续留在安装目录；
3. README/ADR 写「日志可能含文件名，删除日志可清」；`ClearRecent` 不假装清日志。

## H2（blocker）`/__recent` 契约与错误码

T3 `:48`：

> `/__recent` 只回 `{id,seq,name,dir}`（`openedAt` 只留在 `recent.json`）

T3 `:55`：

> 200 `{v:1,items:[{id,seq,name,dir,openedAt}]}`

两边不一致。`openedAt` 不是路径，但它是契约字段，A 组按 T1 写的类型会 `tsc` 报错，或者 T3 多返回字段被当成未定义。

更硬的是 `dir`：

- T1 `:55` 要「父目录最后 1–2 段」，U2 的样例是 `文档\草稿`（含 `\`）；
- T3 `:55` 又要求 `dir`「不含盘符/`\`/`..`」，探针 `:58` 断言 `/__recent` 响应**无 `\`**。

两者不能同时成立。修：`dir` 用**数组** `["文档","草稿"]` 或 `/` 分隔的字符串（如 `文档/草稿`），明确不含盘符、反斜杠、`..`；T1 渲染时用 `/` 或自拼两行；T3 探针只断言无盘符、无反斜杠、无完整路径。

错误码：T3 `:56` 的 `open-recent-result` 只有 `STALE|FILE_GONE|BAD_REQUEST|IO`；T2 `:34` 要 `READONLY|ENCODING|TOO_LARGE|PATH_CHANGED`。`OpenByPath` 若返回这些码，T3 要么映射到 `IO`（T2 文案就错），要么补白名单。修：在 T3 定义完整错误码表，T2 按表给文案；探针覆盖每个码。

## H3（major）状态目录与失败回包

- `recent.json` 写入失败：T3 `:57` 只「记日志」，`RecordOpen` 不挡打开；页面 `/__recent` 会拿到旧列表，用户以为刚打开的文件没进列表。需要 `state:'degraded'`/`lastError` 或页面一行「最近记录写入失败」。
- `recent-clear`/`recent-remove`：T1 `:15` 要求失败时 toast 错误并保持列表；T3 `:56` 没有 `recent-clear-result`/`recent-remove-result` 的 `ok:false,error`，实现者只能猜。
- `%TEMP%` 回退：T3 `:52` 允许，但 T1 没有「易失」提示；`%TEMP%` 被系统清理后列表消失，用户会以为记录丢失。`/__recent` 带 `volatile:true`，T1 在标题/空态写「临时目录，重启后可能清空」。
- `recent.json` 损坏备份 `recent.json.bad-<ticks>`：方向对；要确保备份失败不挡启动。

修：统一 `{v:1,ok,error?}` 回包；`/__recent` 增加 `state`/`volatile`；T1/T2 按统一字段处理；探针覆盖写失败/503/损坏。

## H4（blocker）`open-recent` 的脏检查没有「保存后打开」接点

T1 `:14`：

> 先走现有脏检查（`requestSave` 的 `'switch'`/`pendingSwitch`，不新开路径）；确认后发 `{v:1,type:'open-recent',id,seq}`

但当前 `requestSave('switch')` 的 `runSave` 在目标 `switch` 时调用 `performSwitch()`（`App.tsx:1686`），而 `performSwitch` 用的是 `pendingSwitch` 里预先存好的 `{text,name,file,after}`（`:1663-1672`）；`pendingSwitch` 是 `requestLoad` 设置的旧文档目标。`open-recent` 没有把「保存完打开最近项」塞进这个链路：

- 脏文档点最近项 → `requestSave('switch')` 可能在 `pendingSwitch` 为空时直接 `performSwitch` 无动作；
- 或 `pendingSwitch` 指向之前某个切换目标，保存后打开的是旧目标，不是刚点的最近项。

修：`requestSave` 增加 `after?: () => void`（或 `SaveTarget` 带回调），`performSwitch`/`runSave` 在成功保存后调用 `after`；`open-recent` 用 `requestSave('switch', () => sendOpenRecent(id,seq))`。补「脏文档点最近项 → 保存并切换后打开的是最近项」与「取消保存后不打开」两例。

## H5（major）T2 的错误文案与 T3 白名单不一致

T2 `:34` 按 `FILE_GONE`/`READONLY`/`ENCODING`/`TOO_LARGE`/`STALE`/`IO` 分文案，T3 `:56` 只定义 `STALE|FILE_GONE|BAD_REQUEST|IO`。必须先在 T3 补全白名单（或映射），否则 T2 的「只读/编码/过大」分支永远不触发，用户只看到 `IO` 的泛化文案。

另：`STALE` 时 T2 只刷新列表并提示再点；连续点同一行会重复发 `open-recent`。刷新期间禁用该行，`/__recent` 返回后按新 `seq` 重新启用；`recent-remove` 失败保留行要复用 T1 的 `recentError` 处理，不要两套。

## H6（major）T4 隐私与 CI

- README 新增「数据与隐私」是对外承诺；`AGENTS.md:15` 要求回人。计划 `:86` 已写「需产品负责人确认」，但 T4 验收 `:82-84` 没有「确认」字段。修：`impl-b.md` 记「产品负责人确认：待确认/已确认」；未确认前 README 措辞用「计划」或标 UNVERIFIED，不写成已发布承诺。
- CI：`.tmp` 与 `release/` 两行修复方向对；`continue-on-error` 保留是对的。但 `install-verify` 依赖 `windows-host` artifact，`windows-host` 失败时 `install-verify` 会连带红（findings S1 `:77-78`）。首跑只 dispatch `windows-host`；`install-verify` 保持手动且不依赖失败 artifact。
- 体积：0.21.0 803,335 + 2.1–4.2 KB ≈805.5–807.6 KB < 810,000，预算够；`package-lock` 由根代理 `npm install --package-lock-only` 同步，T4 只改 `package.json` 版本。

## 逐项核对记录

### T3
- `SetCurrentDoc` 移到互斥锁之后、`RecordOpen` 只在主实例成功分支（argv/forward/open-recent）——方向对；第二实例只转发，不记录。
- `id` = 路径 SHA256 前 16 位、`seq` 单调递增、`open-recent` 只收 `{id,seq}`、`seq` 不匹配 `STALE`——方向对；`seq` 在同一路径重开后递增，旧列表项点回会 STALE，T2 刷新后重试，符合「不点 A 开 B」。
- `/__recent` Host 校验/no-store/仅 GET、`dir` 不含路径——方向对；`dir` 的 `\` 契约与 `openedAt` 冲突（H2）。
- 状态目录 `%LOCALAPPDATA%`→便携→`%TEMP%`、`recent.json` 原子写、损坏备份——方向对；写失败/清除失败/`volatile` 回包缺（H3）。
- 日志脱敏轮转——方向对，但漏 `forward applied` 与旧日志（H1）。

### T1
- 菜单结构、`max-height: calc(100vh - 46px)`、`overflow: hidden auto`、两行条目、`title`、空态/`host-error`/`no-host`、清除+撤销——方向对，与 U1–U5 实测一致。
- `recent-clear` 的失败处理与 `recent-restore` 快照、`STALE` 刷新——与 T3 的字段/回包需要对齐（H2/H3）。
- 脏检查用 `requestSave('switch')` 但没有「保存后打开最近项」接点（H4）。

### T2
- 失效条目保留、按错误码文案、`recent-remove`/重试——方向对；依赖 T3 完整错误码（H2/H5）。
- `STALE` 时刷新再点、remove 失败保留——需要防重复点击与统一错误处理。

### T4
- CI 两行、0.22.0、隐私节、体积预算、重建顺序——方向对；隐私需人确认（H6）；`install-verify` 依赖失败 artifact。
- `package.json` 只改版本、`package-lock` 根代理同步——成立。

### 通用
- 文件归属：A T1/T2 串行 `src/`；B T3/T4 串行 `host/`、文档、CI；零并发重叠成立。
- 构建纪律：A `.tmp/build-a`/`.tmp/host-a`，B `.tmp/host-b`；根代理最终 build；成立。
- 可独立复现：T1/T2 浏览器段用 mock；T3 的最近列表/日志/错误码可用 `recent-probe`；宿主真实段依赖 T3；真机双击/Alt+F4/卸载保留保持 UNVERIFIED。

## 做对的地方（别改过头）

1. T3 把 `id`（路径哈希）与 `seq` 分开、`open-recent` 只收 `{id,seq}`、禁止 path 字段，是从根上防「点 A 开 B」的正确结构。
2. T3 的 `/__recent` Host/no-store/仅 GET、`dir` 不含完整路径，与 `/__doc` 的安全边界一致；方向对。
3. T1 的菜单 `max-height`/`overflow-y`/两行条目/`role=menuitem` 复用了现有键盘处理器，是 U1/U2/U5 的最小修法。

---

### 附：本次审查证据

- `host/Program.cs:1302`（`forward applied` 完整路径）；`plan.md:57` 的 LogPath 清单。
- `plan.md:48` 与 `:55`（`/__recent` 的 `{id,seq,name,dir}` 与 `openedAt`）、`:34` 与 `:56`（错误码）。
- `App.tsx:1663-1688`（`performSwitch`/`runSave`）、`:1861-1866`（`requestSave('switch')`）。
- `findings-bug.md:56-60,74-79`；`findings-ux.md:68-101,116-121,234`；`findings-ship.md:58-78,181`。
- 未改产品文件、未 commit；未生成新截图。
