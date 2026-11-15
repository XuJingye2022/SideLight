# 第 03 轮 · 实施报告 B（builder2）

执行人：builder2。顺序 T1 → T2。基线 `b434f25`（产品代码同 `6c9c2b0`）。
纪律：未跑 `npm run build`；T1/T2 只用现有 `dist`（1,395,531 B）与 `host/build.ps1` 的 `host/bin`；未 commit；结束进程清零。`src/**`、`package.json`、`README.md`、`vite.config.ts` 一行未碰。

---

## T1 固定回环端口 origin —— PASS

### 改动

- `host/Program.cs`
  - 删掉 `SetVirtualHostNameToFolderMapping`，改 `TcpListener(IPAddress.Loopback, 47821)` 后台 accept；`APP_URL` 改成 `http://127.0.0.1:47821/index.html`。
  - 只处理 `GET`/`HEAD`（其余 405）；响应带 `Content-Type`、`Content-Length`、`Connection: close`、`Cache-Control: no-store`；MIME 白名单 `.html .css .js .woff2 .svg .png .ico .json`。
  - 穿越防护：`Uri.UnescapeDataString` 失败 400；含 `..`、反斜杠、盘符冒号、`//` 开头 403；`Path.GetFullPath` 后必须在 `www` 内否则 403；扩展名白名单外 404；每次拒绝写 `loopback refused path=… reason=…`。
  - 端口被占用：`loopback port busy 47821` → 错误窗「端口 47821 被占用，请关闭占用它的程序后重开」→ `exit 1`。不换端口、不回退虚拟主机。`SIDELIGHT_PORT` 仅作测试覆盖。
  - argv 注入、单实例、脏确认/排队链路原样保留。
- `host/fcp-probe.mjs`（新）：六条验收 + `--busy` 用例。
- `host/README.md`：新增「回环 origin（固定端口 47821）」段（端口占用处置、MIME、穿越规则、旧 origin 一次性丢失）。
- `docs/adr/0005-loopback-fixed-origin.md`（新）：三组读数（映射 2,011/2,040 ms、WRR 2,392 ms、回环 28/60 ms）、固定端口理由、旧 origin localStorage 一次性丢失与「首次公开发布前允许」的迁移策略。

### 门禁输出

```text
node host/fcp-probe.mjs
PASS FCP 首屏 ≤500ms — fcp=296ms
PASS origin 两次启动一致（127.0.0.1:47821） — origin1=http://127.0.0.1:47821
PASS 设置与无句柄草稿跨两次冷启动仍在 — originSame=true settingsSame=true docSame=true
PASS FCP 转发 reload ≤500ms — fcp=52ms applied=true name=forward.md
PASS 穿越防护 4 类（.. / %2e%2e / ..%2f / 绝对或 UNC） — dotdot=403 encoded-dotdot=403 encoded-slash=403 absolute-or-unc=403
PASS Content-Type 与 HEAD（.js/.css/.woff2；HEAD 200 无 body） — js=text/javascript css=text/css woff2=font/woff2 head=200 len=588 body=0
summary: 6/6 PASS

node host/fcp-probe.mjs --busy
PASS busy：端口 47821 被占用时错误窗 + exit 1，不换端口 — exit=1 busyLog=true
summary: 1/1 PASS

node scripts/host-smoke.mjs --fsa
PASS 窗口：document.title 为 Sidelight
PASS 渲染：.ProseMirror 存在、控制台 0 错误 — errors=0
PASS argv：标记行进正文、只注入一次、页面稳定（不无限重载） — runs=1 done=1 navType=reload framenavigated=0 stable=true
PASS 单实例：第二进程 exit 0、窗口仍为 1
PASS FSA：系统文件夹对话框出现（#32770，msedgewebview2）
PASS FSA：文件夹对话框返回、文件树读到 sample.md — elapsed=6757ms
PASS FSA：真实写盘（哈希变化 + 读回改动字符）
summary: 7/7 PASS
```

### 偏离

- **改了 `scripts/host-smoke.mjs`（计划外文件）**：回环 origin 下页面约 60–300 ms 就加载完，Playwright 连上时两次导航常常已经发生，旧的 `framenavigated === 2` 断言变成 `0`（实测）。改成「`sl:argv-runs=1` + `navType=reload` + 1.2 s 内 `timeOrigin` 不变（不无限重载）」三条守不变量，`framenavigated` 只作参考。这是**测试正确性修复**，不是放宽产品断言：无限重载仍会被稳定性检查与守卫命中。`scripts/` 不在本轮 B 的声明文件边界内，特此标出，请根代理复核。
- 旧 origin `https://sidelight.local` 的 `sidelight.settings.v1` 与 `sidelight.doc.v1` 会丢一次；ADR-0005 与 `host/README.md` 都写明，本轮不做迁移。
- FCP 首屏 296 ms 比 finder 的 60 ms 大，因为包含宿主注入与草稿恢复；仍在 500 ms 验收线内。

---

## T2 NSIS per-user 安装包 —— 构建 PASS；安装/卸载运行 UNVERIFIED

### 改动

- `packaging/installer.nsi`（新，注释全 ASCII、文件 UTF-8+BOM）：`RequestExecutionLevel user`、`InstallDir "$LOCALAPPDATA\Programs\Sidelight"`、`SetCompressor /SOLID lzma` + `DictSize 32`；载荷 = `host\bin` 五件 + `dist\*` 作 `www\` + `packaging\sidelight.ico` + `LICENSE` + `packaging\README.txt`；开始菜单快捷方式；`WriteUninstaller`；HKCU 卸载项 7 值 + `EstimatedSize`；卸载删目录/快捷方式/卸载项，**不删** `%LOCALAPPDATA%\Sidelight`。
- **运行时检查**：`SetRegView 32` 读 HKLM EdgeUpdate `pv` → `SetRegView 64` 再读 → HKCU 读 → 枚举 `$PROGRAMFILES` / `$PROGRAMFILES64` 下的 `msedgewebview2.exe`；全缺 → `MessageBox`「需要 Microsoft WebView2 运行时。下载：…」+ `Abort`，不复制任何文件。
  - 调试中修掉两个真 bug：`$PROGRAMFILES(X86)` 不是 NSIS 常量（会拼成 `C:\Program Files (x86)(X86)`），已改用 `$PROGRAMFILES`/`$PROGRAMFILES64`；`FindFirst` 不能通配目录，改成枚举版本目录再 `IfFileExists`。
- `packaging/installer.ps1`（新）：`.tmp/nsis/nsis-3.11` 缺就下官方 zip；`makensis /V2` 传 `APPVERSION`（从 `package.json` 只读）与 `ESTSIZE`；打印实测字节、`P+10,000` 门槛、硬报警 840,000 B、SHA256；超硬线打印载荷占比并 exit 1。
- `packaging/verify-installer.ps1`（新）：静默安装 → 断言目录四件、HKCU 卸载项 7 值、开始菜单快捷方式 → 静默卸载 → 断言目录/卸载项/快捷方式都没了且 `%LOCALAPPDATA%\Sidelight` 仍在 → 另测不写 HKLM。脚本开头把 `TEMP` 指到 `.tmp\nsis-temp`（本机默认 `%TEMP%` 对子进程不可写，NSIS 会弹 `NSIS Error`）。
- `packaging/README.md`（新）：安装/卸载步骤、per-user 路径、SmartScreen、WebView2 要求与下载链接、静默安装、构建与验收、不写 HKLM 不做 `.md` 关联。
- `packaging/README.txt`：加一行指向同目录 `README.md`。

### 构建结果（实测）

```text
version=0.17.0
setup=826537 B  release\Sidelight-0.17.0-win-x64-setup.exe
sha256=F71F30583CBD2F6622A3C98DBE61E1B48AE06F4992F7A94E19A1C408EB61D517
threshold(P+10000)=836537 B
hard=840000 B  estimatedSize=2329 KB
installer_exit=0
```

体积 826,537 B：低于硬报警 840,000 B，也低于本次门槛 836,537 B（门槛按本轮实测 P+10,000 定，写在这里备下轮回归用）。版本号取的是 `package.json` 当前的 0.17.0（A 组 T5 已升版，本任务只读，未改）。

### 安装/卸载运行：UNVERIFIED（环境限制，已定位）

`verify-installer.ps1` 的实际输出：

```text
PASS 运行时存在（pv=157.0.4341.46 loader=True）
UNVERIFIED 安装未落盘，缺：Sidelight.exe, www\index.html, uninstall.exe, Sidelight.exe.config
  本机代理环境拒绝 NSIS 进程写 %LOCALAPPDATA%（探测安装器里 CreateDirectory/FileOpen 失败，cmd/PowerShell 同路径可写）。
```

定位过程（用 `csc`/`makensis` 写了一个最小探测安装器）：同一个 NSIS 进程里 `CreateDirectory "$LOCALAPPDATA\ProbeDir3"` 与 `FileOpen "$OUTDIR\written.txt"` 都失败、`WriteRegStr HKCU` 不落盘，但 `FileWrite` 到工作区 `$TEMP` 成功；同一时刻用 `cmd`/PowerShell 写 `%LOCALAPPDATA%\Programs` 与 HKCU 都正常。也就是说**不是安装器脚本的错**，是当前代理环境对 NSIS 进程的用户目录/注册表写入被拒。另一个环境坑：默认 `%TEMP%` 对子进程不可写，NSIS 会弹 `NSIS Error`；`verify-installer.ps1` 已把 `TEMP` 指到工作区，正常机器上无副作用。

**手动复验（10 秒）**：在交互式桌面双击 `release\Sidelight-0.17.0-win-x64-setup.exe`（无需管理员），确认装到 `%LOCALAPPDATA%\Programs\Sidelight`、开始菜单有 Sidelight；再运行该目录的 `uninstall.exe`，确认 `%LOCALAPPDATA%\Sidelight` 仍在。之后重跑 `verify-installer.ps1` 的断言部分即可。

**静态验收（自动化已过）**：`.nsi` 含运行时检查文案 1 处、`Abort` 1 处、per-user `InstallDir` 1 处、HKCU 卸载项 1 处、`%LOCALAPPDATA%\Sidelight` 保留注释 1 处，无 HKLM 卸载项写入。

### 偏离 / UNVERIFIED

- 安装/卸载的**运行**验收 UNVERIFIED（原因与手动复验见上）；不写成 PASS。
- 运行时缺失分支（真正卸载 WebView2 需要管理员）只做静态验收，UNVERIFIED，补法：在没装 WebView2 的机器或新用户配置里跑 `verify-installer.ps1` 的安装段，断言出现下载指引且不复制文件。
- 未签名安装包会被 SmartScreen 拦一次，未自动化验证。
- `release/` 里还有第 02 轮留下的 `Sidelight-0.16.3-win-x64-portable.zip`；本轮新安装器是 0.17.0，最终应由根代理在重建 `dist` 后统一重打。

---

## 收尾

- 所有自己启动的 `Sidelight.exe` 已停止（计数 0）；未留临时服务。
- 新增：`host/fcp-probe.mjs`、`packaging/installer.nsi`、`packaging/installer.ps1`、`packaging/verify-installer.ps1`、`packaging/README.md`、`docs/adr/0005-loopback-fixed-origin.md`；修改：`host/Program.cs`、`host/README.md`、`packaging/README.txt`、`scripts/host-smoke.mjs`（见 T1 偏离）。
- 未 commit。
