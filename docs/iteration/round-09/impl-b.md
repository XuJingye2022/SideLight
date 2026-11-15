# 第 09 轮 · 实施报告 B（builder2）

执行人：builder2。T3（宿主最近记录 + 日志）→ T4（CI 两行 + 0.22.0 文档）。未 commit、未跑 `npm run build`；`src/**`、`scripts/**` 未改。结束 `Sidelight` 进程 0。

---

## T3 最近记录、`/__recent`、日志脱敏 —— 完成

### 改动（`host/Program.cs`，约 +430 行）

- **状态目录**：`ResolveStateDir()` 顺序 `%LOCALAPPDATA%\Sidelight` → exe 同级 `state`（便携）→ `%TEMP%\Sidelight`（易失）→ 禁用。写探针判断可写；测试用 `SIDELIGHT_STATE_DIR` / `SIDELIGHT_STATE_KIND` 覆盖。日志只记 `state dir kind=`。
- **`recent.json`**：`{"v":1,"seq":N,"items":[{id,path,name,dir,openedAt,size,mtime}]}`，UTF-8 无 BOM、`AtomicWrite` 原子替换；损坏 → `recent.json.bad-<ticks>` + 空表；上限 8；键为 `GetFullPath`（去 `\\?\`）+ `OrdinalIgnoreCase`；同键更新 `seq`/`openedAt` 并置顶；`id` = 规范化路径（小写）SHA256 前 16 位；`seq` 单调递增。写失败记 `lastError`，`/__recent` 下一次带出，不挡打开。
- **记录点**：`SetCurrentDoc` 从 `Main` 开头移到互斥锁获取之后；`RecordOpen` 只在主实例、打开成功后调用（argv 注入成功后、`OpenByPath` 成功、`open-recent` 成功）。第二实例只转发路径串。
- **`/__recent`**：只 GET（405）、Host 只认 `127.0.0.1:47821`（403）、`no-store`、无 CORS；`state` 三态 `ok|volatile|disabled`；`items:[{id,seq,name,dir}]`（无 `openedAt`/`path`）；`dir` 用 `/` 分隔、无盘符/反斜杠/`..`，同名同目录扩到更多段；禁用时带 `reason:"NO_STATE_DIR"`。
- **消息**：`open-recent{id,seq}`、`recent-remove{id,seq}`、`recent-clear{id}`、`recent-restore{id}`，统一 `*-result{ok}` / `{ok:false,error}`；带 `path`/`fileName`/`file` → `BAD_REQUEST`；错误码 `STALE|FILE_GONE|READONLY|ENCODING|TOO_LARGE|BAD_REQUEST|IO|NO_STATE_DIR`。clear 存内存快照供 restore（重启后 `STALE`）。
- **共用打开**：新增 `OpenByPath(path, source)`（脏确认 → `ReadDocMeta` → `SetCurrentDoc` → 注入 → `RecordOpen`），argv/单实例转发/`open-recent` 三处共用；`ApplyForwardAsync` 改成调用它。
- **日志**：`LogPath()` 只输出 basename；`start args`、`pipe sent`（改记 `bytes=`，不再记载荷）、`pipe received`、`forward queued/ignored/applied/drained`、`open failed`、下载路径、数据目录候选、`loopback listening` 全部脱敏；首次启动旧 `host.log` 归档 `host.log.bad` + `log migrated`，超过 1 MB 轮转 `host.log.1`（最多两个文件）。

### 探针（`node host/recent-probe.mjs`，exit 0）

```text
PASS 9 次打开后列表 8 条 — count=8
PASS 顺序：最近打开在最前（doc9）
PASS 重复打开去重并置顶（doc5 第一、仍 8 条）
PASS /__recent：无 openedAt/path，dir 无盘符/反斜杠/..
PASS /__recent：Cache-Control no-store
PASS /__recent：Host evil → 403
PASS open-recent：成功打开
PASS open-recent：旧 seq → STALE
PASS open-recent：伪造 path → BAD_REQUEST
PASS open-recent：文件已删 → FILE_GONE
PASS recent-clear：清空
PASS recent-restore：恢复快照
PASS recent-remove：移除一条
PASS recent-remove：再删 → STALE
PASS 损坏 recent.json：备份 + 空表
PASS 日志：首跑迁移旧日志（host.log.bad + log migrated）
PASS 日志：无完整路径（无盘符、无用户目录）
PASS 日志：超过 1 MB 轮转为 host.log.1
PASS TEMP 回退：state=volatile
summary: 19/19 PASS
```

调试中修掉两处真泄露：`pipe sent` 原本把 **base64 载荷**写进日志；`loopback listening`/`data dir`/下载路径把完整路径写进日志。

---

## T4 CI 两行 + 0.22.0 文档 —— 完成

- `.github/workflows/ci.yml`：`Fetch WebView2 SDK` 第一步加 `New-Item -ItemType Directory -Force .tmp`；`continue-on-error: true` 保留；文件内写明首跑只 dispatch `windows-host`；`install-verify` 改 `if: github.event_name == 'workflow_dispatch' && success()`，失败时跳过而非连带必红。
- `packaging/installer.ps1`：`$root` 后建 `release/`。实测删空 `release/` 后单跑脚本能出包：**807,491 B**（硬线 850,000，0.22.0 预算 ≤810,000 满足）。
- `package.json` → **0.22.0**；`package-lock` 仍 0.21.0（根代理 `npm install --package-lock-only` 同步）。
- `docs/CHANGELOG.md`：`## 0.22.0 — 2026-11-16`（最近打开、日志脱敏/迁移/轮转、CI 两行、隐私事实、体积 `[TBD]`、未验清单）。
- `README.md`：能做什么加「最近打开」；新增 `## 数据与隐私`（节首标「待产品负责人确认后再作为对外承诺」，只写事实：`recent.json` 本机、页面只拿哈希 id、清除可选、日志可能含文件名、`host.log*` 可删、草稿/批注在 `.sidelight/`、卸载保留、无遥测）；包名 0.22.0；ADR 范围 0001–0009；宿主层字节改「见 CHANGELOG 0.22.0」。
- `AGENTS.md` §6：0.22.0、最近打开、未验清单（真人重启、`recent.json` 写失败、网络盘失效、卸载保留、日志迁移）。
- `packaging/README.md` 卸载段补 `recent.json` 与日志；`docs/typora-gap.md` 最近文件行改「有（8 条，可清除，仅桌面版）」；新增 `docs/adr/0009-recent-files.md`。

**门禁**：`host/build.ps1` exit 0；`node host/recent-probe.mjs` 19/19 PASS；`npm test` exit 0；`node -e version` → 0.22.0；README 含「数据与隐私」「日志可能含文件名」「待产品负责人确认」；ADR-0009 含 `recent.json`/`open-recent`/`log migrated`/`UNVERIFIED`。

---

## 遗留

1. `[TBD]`：CHANGELOG 0.22.0 的体积与 SHA，等根代理最终重建后回填（本地包 807,491 B 的 SHA 不作数）。
2. `package-lock.json` 仍是 0.21.0，需根代理同步并验收。
3. **隐私承诺待产品负责人确认**：README「数据与隐私」只写事实，确认后才可作为对外承诺。
4. UNVERIFIED：真人重启后最近列表、`recent.json` 写失败（只读状态目录）、网络盘失效、卸载保留 `%LOCALAPPDATA%\Sidelight`、真实升级场景的日志迁移。
5. 探针的 `open-recent` 成功会触发页面 reload，`post()` 已带重试；若前端大改导航方式，需要复核该等待逻辑。

---

## 补记：argv 打开也记录最近（tester 反馈）

- `host/Program.cs`：argv 不再在 `AddScriptToExecuteOnDocumentCreatedAsync` 后直接 `RecordOpen`。新增 `argvOpened` 守卫；首个 `NavigationCompleted` 成功后调用 `ApplyArgvOpenAsync(pendingFile)` → `OpenByPath(path, "argv")`，与转发/`open-recent` 共用同一套「脏确认 → 元数据 → 注入 → `RecordOpen`」。只在主实例、互斥锁之后；失败不记录。
- 日志现在有 `open applied source=argv file=doc1.md`；`record` 走同一条路径。
- `host/recent-probe.mjs` 加第 7 组：清空 `recent.json` 后带文件启动 → `/__recent` 只有该条（count=1, doc1.md）→ 用 `open-recent` 重开成功。
- 同时修正损坏 JSON 用例的期望：启动 argv 会立刻写入这一条，所以「备份 + 旧表已丢（只剩 argv 这一条）」才算通过。
- 复跑：`host/build.ps1` exit 0；`node host/recent-probe.mjs` **21/21 PASS**，exit 0。
---

## 补记：tester 三处 FAIL 的修复

1. **CI `.tmp`**：`New-Item -ItemType Directory -Force .tmp | Out-Null` 之前只加在 NSIS 步骤；现在 WebView2 下载步骤的第一行也建 `.tmp`（`ci.yml:66`），首跑不再因父目录缺失而红。
2. **argv 三次导航**：`OpenByPath` 注入的脚本末尾是无条件 `location.reload()`；argv 的正文已由 document-created 脚本注入过一次，再走 `OpenByPath` 会多一次 reload（navStarts=3）。判定为**重复导航**，修宿主：`OpenByPath(path, source, inject)` 加 `inject` 参数，argv 用 `inject=false`（只统一元数据/日志/`RecordOpen`，不注入）。修后 `host-smoke` 的 `navStarts=2` 恢复，argv 仍能写入最近。
3. **fcp-probe 转发日志键**：日志从 `forward applied` 改成 `open applied source=forward`，探针匹配改成 `/open applied source=forward|forward applied/`。
4. 复跑：`host/build.ps1` exit 0；`host-smoke --fsa` **7/7**（navStarts=2）；`fcp-probe` **6/6**（applied=true）；`recent-probe` **21/21**。