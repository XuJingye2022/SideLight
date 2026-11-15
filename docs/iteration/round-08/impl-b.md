# 第 08 轮 · 实施报告 B（builder2）

执行人：builder2。只做 T5：宿主草稿协议 + 关窗三选一 + 0.21.0 文档。未 commit、未跑 `npm run build`；`src/**`、`scripts/**` 未改。结束 `Sidelight` 进程 0。

---

## T5 宿主草稿与关窗守卫 —— 完成

### 改动

- `host/Program.cs`（约 +430 行）
  - `FormClosing` → `async void OnFormClosing`：`closeConfirmed` 早退；否则 `e.Cancel = true`；`closePending` 为真直接返回（**再次点 × 不发第二条**）；`await ReadDirtyAsync()`；`"0"` → `closeConfirmed=true` 再 `form.Close()`；`"1"`/unknown → 发一次 `{v:1,type:'close-request'}`。5 s 计时器只记 `close-request timeout 5s`，窗口保持、`closePending` 不清。
  - `close-answer`：`cancel` → `closePending=false`（可再问）；`discard` → 先 `ClearDraft()`（失败只记日志）再 `closeConfirmed=true` 关窗；`save-draft` → `WriteDraft(text)`，成功才关，失败保持窗口 + `MessageBox` 可见错误并 `closePending=false`。
  - `/__draft`：只 GET（405）、Host 只认 `127.0.0.1:47821`（403）、`Cache-Control: no-store`、无 CORS；无文档 404、无草稿 404 `{exists:false}`、>6 MB 413 `TOO_LARGE`、非 UTF-8 409 `ENCODING`；200 返回 `{v:1,exists:true,mtime,size,text}`。
  - 草稿键：`CacheKey(fileName)` 镜像 `src/lib/cache.ts`（去扩展名、非安全字符换 `-`、合并 `-`、40 截断，**>40 保留前 36 + `-` + 4 位 FNV-1a 哈希**）。路径固定 `<文档目录>\.sidelight\drafts\<key>.md`，不接受页面路径；UTF-8 无 BOM、LF、同目录临时文件 + `File.Replace`（回退 `MoveFileEx`）。
  - 协议：`draft-save` → `draft-save-result`（`ok/bytes/mtime` 或 `NO_PATH/TOO_LARGE/IO`）、`draft-clear` → `draft-clear-result`、`close-request` / `close-answer`。
- `host/draft-probe.mjs`（新）：快照 `host/bin` 到 `.tmp/host-b`（www 优先 `.tmp/build-a`），CDP 9341，13 项断言。
- `docs/adr/0008-host-draft-and-close-guard.md`（新）：背景、决定、协议表、`FormClosing` 九步流程、错误码、隐私（只存本机）、否决方案、验收与 UNVERIFIED。
- 0.21.0：`package.json`；CHANGELOG `## 0.21.0 — 2026-11-15`（草稿兜底、关窗三选一、自动保存安全子集、设置/菜单临界修复、体积 `[TBD]`、未验清单）；README 加草稿/隐私句与关窗未验项；AGENTS §6 状态、功能与未验清单。

### 探针结果（`node host/draft-probe.mjs`，exit 0）

```text
PASS draft-save：键 .sidelight/drafts/note.md、内容 LF — ok=true exists=true bytes=19
PASS 草稿 mtime 新于原文件 — draft=1794755452063 doc=1794755329723
PASS /__draft 读回草稿、no-store — status=200 cache=no-store
PASS draft-clear 删除草稿 — ok=true
PASS 重开后 /__draft 仍返回该草稿 — status=200
PASS 关窗 dirty=0：直接关闭 — alive=false
PASS dirty=1：只发一次 close-request（再次点 × 不重复） — reqs=1 alive=true
PASS 5 s 无答案：窗口保持、仍未重复请求 — reqs=1 alive=true
PASS close-answer cancel：窗口保持、可再次询问 — alive=true
PASS cancel 后再次点 ×：发出第二条 close-request — reqs=2
PASS discard：草稿已清并关闭 — closed=true draft=false
PASS save-draft：写草稿后关闭 — closed=true text="saved on close\n"
PASS 落点：.sidelight 只在文档目录 — D:\Documents\SidelightProgram\.tmp\host-b\docs\.sidelight
summary: 13/13 PASS
```

### 门禁

`host/build.ps1` exit 0；`npm test` exit 0；`node -e version` → 0.21.0；CHANGELOG 有 0.21.0；README 含「草稿只存本机」；ADR-0008 含 `FormClosing` / `close-answer` / `draft-save` / `5 s` / `UNVERIFIED`。

### 体积（0.21.0 最终产物）

- dist **1,398,672 B**；setup **803,335 B**（SHA256 `C9F9793F32EC818254DCF389C9DFC4992C5B92E51717ED43C9A6D8ABE78323C0`）；便携 zip **880,851 B**（SHA256 `AFA109BFF7242BE67EA6FF992BF606AA23E17FB345475D68EB32E151D90FC674`）。
- host/bin（排除 webview2-data）**1,008,164 B** + www/ 1,398,672 B = 载荷 **2,406,836 B**；Sidelight.exe 64,512 → **70,656 B**（+6,144）。
- 安装包从 799,631 涨到 803,335（+3,704 B），硬线 850,000 余量 46,665 B。README / CHANGELOG / ADR-0004 / ADR-0008 已回填，[TBD] 与旧数 0 命中。

---

## 遗留

1. **前端接入未完成（A 组 T1）**：`.tmp/build-a` 与 `dist` 里还没有 `draft-save` / `close-request` 字符串，探针用页面 `postMessage` 直接驱动协议，**「打字 → 自动 draft-save」的真实 UI 路径未验**；A 接完后需重跑一次（探针已留出真实页面交互的位置）。
2. **`CacheKey` >40 的哈希格式**：宿主用「前 36 + `-` + 4 位 FNV-1a（小写 hex）」。当前 `src/lib/cache.ts` 仍是纯 40 截断、没有哈希；T1 落地时若用别的哈希算法/长度，宿主与浏览器会对同一长文件名算出不同键，必须对齐（≤40 的文件名两边一致，已由探针覆盖）。
3. `save-draft` 写失败（只读目录）的可见错误路径 **UNVERIFIED**：自动化会被模态框卡住，只做了代码路径与 `MessageBox` 的静态检查。
4. 真实 Alt+F4、注销/关机、真实 IME 组合输入下的关窗 **UNVERIFIED**。
5. `package-lock` 仍 0.20.0（根代理同步）；体积已在 0.21.0 最终产物上回填，无 `[TBD]`。

---

## 收尾补记（0.21.0 最终产物 + 两项门禁）

- `packaging/verify-installer.ps1` **PASS**（3 UNVERIFIED：HKCU 卸载项、开始菜单快捷方式；关联静态断言与 dry-run 静默安装均 PASS）。
  - 第一次运行卡死：`Start-Process` 走 ShellExecute，在未签名 exe 上弹「打开文件 - 安全警告」模态框，静默安装被挡住。已在脚本里加 `Start-NoShell`（`ProcessStartInfo.UseShellExecute = $false`，CreateProcess 路径）替换 4 处启动（安装器、装后程序、卸载器、dry-run 包），重跑通过。这是本沙箱环境行为，不影响产物。
- `node host/draft-probe.mjs` **13/13 PASS**（同上一节的输出，键/写读/mtime/no-store/四路关窗/5 s/落点全过）。
- 测试数 188 → **192**（README / AGENTS / CHANGELOG）。