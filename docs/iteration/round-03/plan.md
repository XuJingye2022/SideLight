# 第 03 轮 · 计划（rev2）

基线 `b434f25`（产品代码同 `6c9c2b0`），v0.16.3。5 个任务：B 组（builder2，宿主与安装器）T1→T2，A 组（builder，UI 与文档）T3→T4→T5。
**构建纪律**：任何实施者不跑 `npm run build`；builder 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`；builder2 用 T1 后的 `host/build.ps1`（只复制现有 `dist` 1,395,531 B 与 `host/bin`）；最终 `npm run build` 与重打 zip/安装器由根代理串行做。任务编号 T，发现编号 B/S/U。

## T1 宿主改固定端口回环 HTTP：origin 固定，导航不再 +2 s（B1/H1/H2）｜B 组（builder2，先做）

- **目标**：宿主用 `TcpListener` 在**固定端口 47821** 服务 `www`，页面 origin 恒为 `http://127.0.0.1:47821`；首屏与转发后 reload 的 FCP ≤500 ms；FSA、argv、单实例保持。
- **为什么现在**：B1 是本轮最重要一条。同一份字节实测：映射主机 DCL 2,011 ms / FCP 2,040 ms，回环 HTTP DCL 28 ms / FCP 60 ms；CDP 采样显示 `+114…+1,764 ms` 渲染器主线程完全不应答。**WebResourceRequested 备选已被实测否掉**（origin 保住但 FCP 2,392 ms），所以只有回环 HTTP 能解 2 s；随机端口会让 origin 每次启动都变、API Key 与草稿每次丢（H1），因此必须固定端口。
- **文件**：`host/Program.cs`、`host/fcp-probe.mjs`（新）、`host/README.md`、`docs/adr/0005-loopback-fixed-origin.md`（新）
- **步骤**
  1. `TcpListener(IPAddress.Loopback, 47821)` 起后台线程 accept；只处理 `GET`/`HEAD`，其余 405；响应带 `Content-Type`、`Content-Length`、`Connection: close`、`Cache-Control: no-store`；MIME 表至少覆盖 `.html .css .js .woff2 .svg .png .ico .json`。
  2. 目录穿越防护：`Uri.UnescapeDataString` 抛异常 → 400；拒绝含 `..`、反斜杠、盘符、UNC 的路径；`Path.GetFullPath` 后用 `StartsWith(wwwFull + separator, StringComparison.OrdinalIgnoreCase)`，否则 403；扩展名白名单外 404；每次拒绝写 `loopback refused path=...`。
  3. **端口占用即失败**：绑不上就写 `loopback port busy 47821`、弹错误窗「端口 47821 被占用，请关闭占用它的程序后重开」并 `Environment.Exit(1)`；**不静默换端口、不回退虚拟主机**（回退会再换 origin）。`SIDELIGHT_PORT` 只作测试覆盖。
  4. `APP_URL = "http://127.0.0.1:47821/index.html"`；`PermissionRequested` 继续 Grant `FileReadWrite`；argv 注入、单实例、脏判断链路不动。
  5. 旧 origin `https://sidelight.local` 的 localStorage（`sidelight.settings.v1`、`sidelight.doc.v1`）**丢一次**：预发布的一次性代价，本轮不做跨 origin 迁移；写进 `host/README.md` 与新 ADR-0005（含回环 vs 映射 vs WRR 三组读数、固定端口理由、迁移策略「首次公开发布前允许」）。
  6. `host/fcp-probe.mjs`：spawn 宿主（CDP 9341），断言首屏 FCP ≤500 ms；起第二实例转发文件，断言 reload FCP ≤500 ms；**同一条脚本内连续冷启动两次**，第一次写入 `sidelight.settings.v1` 与一份无句柄草稿，第二次断言两者仍在且 `location.origin` 两次相同；用 `node:http` 发原始路径测穿越 4 类；`HEAD /index.html` 断言 200 + `Content-Length`。
- **验收**：`node host/fcp-probe.mjs` 六条全 PASS：
  1. `PASS FCP 首屏 ≤500ms` 2. `PASS FCP 转发 reload ≤500ms` 3. `PASS origin 两次启动一致（127.0.0.1:47821）`
  4. `PASS 设置与无句柄草稿跨两次冷启动仍在` 5. `PASS 穿越防护 4 类（.. / %2e%2e / ..%2f / 绝对或 UNC）`
  6. `PASS Content-Type 与 HEAD`（`.js` → `text/javascript`、`.css` → `text/css`、`.woff2` → `font/woff2`；`HEAD` 200 且无 body）
  - 端口占用：先占住 47821 再启动 → 错误窗 + exit 1，日志 `loopback port busy 47821`（probe 的 `--busy` 用例）。
  - `node scripts/host-smoke.mjs --fsa` 全 PASS（窗口、渲染、argv、单实例、FSA 真实写盘），证明新 origin 下 FSA 未退化。
- **门禁**：`powershell -ExecutionPolicy Bypass -File host/build.ps1; node host/fcp-probe.mjs; node scripts/host-smoke.mjs --fsa`
- **风险与回退**：origin 换名导致旧 localStorage 一次性丢失（预发布接受，写入 ADR-0005）；固定端口可能与本机其它程序冲突（错误窗给处置办法）；不复用端口就得走回退虚拟主机（已明确禁止）。回退：`git checkout -- host/`，删 `fcp-probe.mjs` 与 ADR-0005。
- **难度** M ｜ **量级** 200–280 行

## T2 NSIS per-user 安装包 + WebView2 运行时检查（S1/H3）｜B 组（builder2，T1 后）

- **目标**：`release/Sidelight-<版本>-win-x64-setup.exe` 体积按 T1 后实测重定；无 UAC 装进 `%LOCALAPPDATA%\Programs\Sidelight`；**WebView2 运行时缺失时给下载指引并中止安装**（不许「装成功但打不开」）；卸载不删用户数据。
- **为什么现在**：S1 实测 NSIS 3.11 便携版零管理员可用，原型含 ico/README/LICENSE 共 800,098 B，比便携 zip 900,752 B 小 11.2%；H3 指出安装器不查运行时，而 `host/Program.cs` 的 `CreateAsync` 失败只会给「无法创建 WebView2 环境」，用户会拿到一个打不开的安装。
- **文件**：`packaging/installer.nsi`（新）、`packaging/installer.ps1`（新）、`packaging/verify-installer.ps1`（新）、`packaging/README.md`（新，安装说明）、`packaging/README.txt`（加一行指向 README.md）
- **步骤**
  1. `installer.nsi`：`RequestExecutionLevel user`、`InstallDir "$LOCALAPPDATA\Programs\Sidelight"`、`SetCompressor /SOLID lzma` + `DictSize 32`；载荷 = `host\bin` 5 个文件（exe、3 dll、`Sidelight.exe.config`）+ `dist\*` 作 `www\` + `packaging\sidelight.ico` + `LICENSE` + `packaging\README.txt`；`CreateShortcut "$SMPROGRAMS\Sidelight.lnk"`；`WriteUninstaller`；**注释只用 ASCII**（中文注释会让 `makensis` 报 `Bad text encoding` 并 exit 1）。
  2. **运行时检查（安装前）**：查 `HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}` 的 `pv`，或 `msedgewebview2.exe` 存在；缺失则 `MessageBox` 写「需要 Microsoft WebView2 运行时。下载：https://go.microsoft.com/fwlink/p/?LinkId=2124703 装完再运行本安装器」，随后 `Abort`，不复制任何文件。
  3. 卸载段：`RMDir /r "$INSTDIR"`、删开始菜单快捷方式、删 HKCU 卸载键；**绝不删** `%LOCALAPPDATA%\Sidelight`（WebView2 数据），完成页写「用户数据未删除」。
  4. HKCU 卸载项 `Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight`：DisplayName、DisplayVersion、Publisher、DisplayIcon、InstallLocation、UninstallString、EstimatedSize。
  5. `installer.ps1`：`.tmp\nsis\nsis-3.11` 不存在就下载官方 zip 并 `Expand-Archive`；`makensis /V2`；**先打印实测字节 P**，门槛取 `P + 10,000` 写进 `impl-b.md`，硬报警线 840,000 B（超线先打印各文件占比，不改门槛）；打印 SHA256；版本号从 `package.json` 只读。
  6. `verify-installer.ps1`：先断言本机 WebView2 运行时存在；`setup.exe /S` → 30 s 内断言 `$INSTDIR` 四件（exe、`www/index.html`、`uninstall.exe`、`Sidelight.exe.config`）、HKCU 卸载项 7 值、快捷方式；`uninstall.exe /S` → 断言 `$INSTDIR`/快捷方式/卸载项都没了、`%LOCALAPPDATA%\Sidelight` 仍在；失败打印残留并 exit 1。
  7. `packaging/README.md`：安装/卸载步骤、per-user 路径、SmartScreen「更多信息 → 仍要运行」、WebView2 运行时要求与下载链接、卸载保留用户数据。
- **验收**
  1. `powershell -File packaging/installer.ps1` exit 0，打印实测字节 P 与 `P + 10,000` 门槛，产物 ≤ 门槛且 ≤840,000 B。
  2. `powershell -File packaging/verify-installer.ps1` 五段 PASS：运行时存在 / 安装写入 / 注册项与快捷方式 / 卸载清理 / 用户数据保留。
  3. 不写 HKLM：跑前跑后 `Test-Path 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight'` 都是 False。
  4. 运行时缺失分支：本机 WebView2 不能卸载（需管理员），只做静态验收（`.nsi` 里有检查 + `MessageBox` + `Abort` 三条）并**标 UNVERIFIED**，补法写进 `impl-b.md`。
- **门禁**：`powershell -File packaging/installer.ps1; powershell -File packaging/verify-installer.ps1`
- **风险与回退**：测试真实写入当前用户 profile（脚本必须卸载并清理）；NSIS 编码坑；未签名 SmartScreen 无法自动化；门槛靠实测、不猜。回退：删 `packaging/installer.*`、`verify-installer.ps1`、`packaging/README.md`，还原 `README.txt` 一行。
- **难度** M ｜ **量级** 280–360 行

## T3 窄窗 + 错误反馈 + 小字达标（U1/U2/U5/H4）｜A 组（builder，先做）

- **目标**：≤1119px 不横向滚动、按钮不被裁；401/断网/500/保存/导出失败都给中文「原因 + 下一步」，错误提示不自动消失；7 个指定选择器抬到 12px。
- **为什么现在**：U1 在 1024 下把「保存 / 设置 / 源码 / 预览」裁出视口（溢出 96px）；U2 实测 401 铺原始 JSON、断网只有英文 `Failed to fetch`、6 s 自动消失、保存与导出失败**连提示都没有**（只有 `pageerror`）；U5 仍有 11–11.5px 的用户可见文字。
- **文件**：`src/App.tsx`、`src/styles.css`、`src/lib/ai.ts`、`src/lib/errorCopy.test.ts`（新）、`src/components/**`（必要时）、`package.json`（只加测试脚本一行；T5 再改版本号，同一实施者串行）
- **步骤**
  1. 窄窗：`@media (max-width: 1119px)` 内 `.app{min-width:0}`、`.topbar`/`.toolbar{height:auto;flex-wrap:wrap}`、`.doc-layout{grid-template-columns:minmax(0,1fr)}`、`.margin-rail{display:none}`；顶栏加「批注」开关（`aria-expanded`），窄窗时页边栏变固定定位抽屉：打开时焦点进抽屉、`Esc` 关闭、关闭后焦点回「批注」按钮、遮罩点掉也回焦点；1440 布局不动。
  2. 错误模型：`ai.ts` 抛结构化错误 `{ kind: 'auth'|'rate'|'network'|'server'|'unknown', status?, detail? }`，并在 `ai.ts` 导出**纯函数** `errorCopy(err): { text; action?: 'settings' | 'retry' }`（不新增 `lib/` 文件，`messageOf` 就在 `ai.ts`）。
  3. toast 改对象：`notice: { text, kind: 'info'|'error', action?: { label, onClick } }`；错误 `role="alert"`、**不自动消失**、带「打开设置」或「重试」；普通提示保持 6 s；删掉 `/失败|错误|无法|不能/` 正则（约 20 个 `setNotice` 调用点，漏改被 `tsc` 抓）。
  4. 保存/导出兜底：`downloadFile`、`exportAs`、无句柄保存分支各包 `try/catch`；成功「已导出 <名>」，失败「导出失败：<中文原因>」。**失败后 `window.__slState.dirty` 必须仍为 true**（成功写盘后才 false）。
  5. 12px 逐项（7 个选择器）：`.field span`、`.rail-goal`、`.sidebar-tabs button`、`.rail-notice`、`.file-tree-name`、`.find-count`、`.risk-banner button`；定义 `--text-xs: 12px` 替换。可留不动：`.rail-title`、`.rail-count`、`.rail-empty-sub`、`.toolbar button.mono`、`.table-bar-*`、`.popover-*`、10px 装饰（非正文指令或空间受限，写进 impl-a）。
  6. `src/lib/errorCopy.test.ts`：401/403 → auth、429 → rate、`TypeError`/`Failed to fetch` → network、500 → server、未知 → unknown；断言每类文案含「下一步」关键词且 401 带 `action: 'settings'`；挂进 `package.json` 的 `test` 脚本（只加一条 `node --experimental-strip-types src/lib/errorCopy.test.ts`）。
- **验收（dev 5173 + CDP 9222/9223，数值 `getComputedStyle` 现算）**
  - 窄窗：1024 / 1119 / 1120 三档 `documentElement.scrollWidth === clientWidth`；「保存 / 设置 / 源码 / 预览」右缘 ≤ `innerWidth`；1024 下「批注」抽屉：点开 → 焦点在抽屉内、`Esc` → 关闭且焦点回「批注」按钮；截图 `shots/round-03/t3-narrow.png`。
  - 401：路由拦截 401 → toast 含「API Key 无效」、`role="alert"`、有「打开设置」、7 s 后仍在；点击后打开设置对话框。
  - 断网 `route.abort()` → 「连不上接口地址」；500 → 「模型接口返回 500」，原始响应只在 `title`。
  - 保存/导出：无句柄 Ctrl+S → 提示含「下载」且 `__slState.dirty === true`；把 `URL.createObjectURL` 打桩抛错后导出 → 有「导出失败」toast 且 `dirty === true`。
  - 小字：上列 7 个选择器计算字号 ≥12；截图 `t3-small.png`。
  - `npm test` 新增 `errorCopy` 用例全绿。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a`
- **风险与回退**：`notice` 改对象波及约 20 个调用点（`tsc` 兜底）；窄窗抽屉与对话框 `inert` 交互要复测；新增「批注」按钮会改 Tab 顺序（T4 已按名字核对，不再数总数）。回退：`git checkout -- src/ package.json` 并删 `errorCopy.test.ts`。
- **难度** M ｜ **量级** 280–380 行

## T4 示例 / 未命名 / 「还没有打开文件夹」不再矛盾（U3 文案部分/H5）｜A 组（builder，T3 后）

- **目标**：首次打开时文档名、正文、文件树三处一致；点「试用示例」真的打开第一篇并有选中态；不加「新建」。
- **为什么现在**：U3 实测三处矛盾（名字 `未命名.md`、树写「还没有打开文件夹」、正文 230 字示例）；点「试用示例」只换了树、正文与名字没变、树里没有选中项，用户会以为点了没反应。
- **文件**：`src/App.tsx`、`src/components/FileTree.tsx`
- **步骤**
  1. 初始文档名改成 `示例 · 未命名.md`，页边栏顶部加一句「当前是示例，可以直接改」；不改 `requestLoad` 与保存链路。
  2. 文件树空状态文案「还没有打开文件夹」→「现在打开的是示例」，三个按钮保留；`onOpenDemo` 里 **`const demo = demoWorkspace()` 只取一次**，`setWorkspace(demo)` 后把同一对象的首篇传给 `requestLoad`。
  3. 示例文件树项按 `path` 加 `aria-current="true"`（`is-active` 样式已有，比较用的是 path，不是对象身份）。
- **验收（tester 复现：dev 5173 + CDP 9222）**
  - 清 localStorage 刷新：文档名含「示例」，树文本含「现在打开的是示例」且不含「还没有打开文件夹」，正文首句仍是示例；截图 `t4-first.png`。
  - 点「试用示例」：文档名 = 示例第一篇名字、正文换成该篇；`.tree-file.is-active` 的文本 = 当前文档名，且同一元素 `aria-current="true"`（**按 path/文本验证，不数按钮总数**）。
  - 按名字核对按钮：T3 新增的「批注」与抽屉关闭控件存在；原 20 个按钮名逐个存在；页面文本没有「新建」。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a`
- **风险与回退**：初始 `dirty=false`，`requestLoad` 不会弹确认框；示例空状态文案与文件树空状态是同一个组件，注意别把「打开文件夹」的空态文案一起改掉（只改示例态）。回退：`git checkout -- src/`。
- **难度** S ｜ **量级** 40–70 行

## T5 版本 0.17.0 + CHANGELOG + README + 仓库卫生（S2/S3/H6）｜A 组（builder，T4 后）

- **目标**：`package.json` 升 0.17.0；CHANGELOG 补 0.17.0 与两轮漏记；README 只由本任务改（安装器、宿主 origin）；ADR 数字现场取；`release/` 忽略、Vite 不再监听 `host/bin` 与 `release`；**本轮不删 `shots/`**。
- **为什么现在**：S2 说两轮改动一条都没进 CHANGELOG、按语义化规则应升 0.17.0；S3 的 `shots/` 清理本轮不做（`docs/iteration/**` 有 94 处 `shots/` 引用，删 106 张会全断链，H6），只做零风险的仓库卫生。
- **文件**：`package.json`（版本行，T3 已加过测试脚本）、`docs/CHANGELOG.md`、`README.md`、`docs/adr/0004-webview2-host-before-admin.md`、`.gitignore`、`.gitattributes`、`vite.config.ts`
- **步骤**
  1. `package.json` 只改 `"version"` 为 `0.17.0`；`package-lock.json` 不动（根代理最终 build 时处理）。
  2. `docs/CHANGELOG.md` 顶部加 `## 0.17.0 — 2026-11-15`（日期写实，不留 `[日]`），覆盖安装器、窄窗、错误文案、示例文案、宿主冷启动与 origin 变更、转发确认、长路径、体积；并补第 1、2 轮漏记条目。安装包字节与宿主 FCP 写 `[TBD]` 由根代理回填。
  3. README：只本任务改。宿主一段改成「回环固定端口 `127.0.0.1:47821`」；安装器一句**以 T2 结果为条件**——T2 PASS 写「有 per-user 安装器（`release/Sidelight-<版本>-win-x64-setup.exe`，见 `packaging/README.md`，无需管理员）」，T2 未 PASS 则保留「没有安装器」并在 `impl-a.md` 标未完成；根代理在 T2 结束后放行此条。
  4. ADR-0004 载荷：现场跑 `(Get-ChildItem host\bin -File | Measure-Object Length -Sum).Sum + (Get-ChildItem host\bin\www -Recurse -File | Measure-Object Length -Sum).Sum`，把命令与实测值都写进 ADR（当前基线 2,379,631 B，T1/T2 后会变），并写「工作目录含 `webview2-data`，不进发布包」。
  5. `.gitignore` 加 `release/`；`.gitattributes` 补二进制规则 `*.webp binary`、`*.jpg binary`、`*.exe binary`（现有 `*.png`/`*.ico` 保留）；`vite.config.ts` 的 `watch.ignored` 加 `'**/host/bin/**'` 与 `'**/release/**'`。
  6. **不动 `shots/`**：不加 `shots/**` 规则、不 `git rm --cached`；理由（94 处引用会断链）写进 `impl-a.md` 与下轮建议。
- **验收（可命令化）**
  - `node -e "console.log(require('./package.json').version)"` = `0.17.0`。
  - `Select-String docs/CHANGELOG.md -SimpleMatch '## 0.17.0 — 2026-11-15'` ≥1，且不含 `[日]`；第 1、2 轮关键词（「便携」「转发前确认」）各 ≥1。
  - `(git ls-files shots | Measure-Object -Line).Lines` 仍是 108（证明确实没删）。
  - `git check-ignore -v release/x.zip` 命中；`Select-String vite.config.ts -SimpleMatch '**/host/bin/**','**/release/**'` 各 ≥1。
  - ADR-0004 含取数命令与实测值，且 tester 复算一致；README 不含「没有安装器」（T2 PASS 时）或按条件保留。
- **门禁**：上述命令 + `npm test`（0 失败；不跑 `npm run build`）
- **风险与回退**：README 的安装器句依赖 T2，用条件句 + 根代理放行；ADR 数字必须现场取、不抄旧值；CHANGELOG `[TBD]` 留到发布就是假数字，必须回填。回退：`git checkout -- package.json docs/CHANGELOG.md README.md docs/adr/0004-*.md .gitignore .gitattributes vite.config.ts`。
- **难度** S ｜ **量级** 70–100 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | B（builder2，先做） | `host/Program.cs`、`host/fcp-probe.mjs`、`host/README.md`、`docs/adr/0005-loopback-fixed-origin.md` |
| T2 | B（builder2，T1 后） | `packaging/installer.nsi`、`packaging/installer.ps1`、`packaging/verify-installer.ps1`、`packaging/README.md`、`packaging/README.txt` |
| T3 | A（builder，先做） | `src/App.tsx`、`src/styles.css`、`src/lib/ai.ts`、`src/lib/errorCopy.test.ts`、`src/components/**`、`package.json`（测试脚本行） |
| T4 | A（builder，T3 后） | `src/App.tsx`、`src/components/FileTree.tsx` |
| T5 | A（builder，T4 后） | `package.json`（版本行）、`docs/CHANGELOG.md`、`README.md`、`docs/adr/0004-*.md`、`.gitignore`、`.gitattributes`、`vite.config.ts` |

- 两组零重叠：B 只碰 `host/`、`packaging/`、`docs/adr/0005-*.md`；A 只碰 `src/`、`package.json`、`docs/CHANGELOG.md`、`README.md`、`docs/adr/0004-*.md`、`.gitignore`、`.gitattributes`、`vite.config.ts`。**README 只有 T5 改**（T2 不再碰）；`package.json` 只有 builder 改（T3 测试脚本行、T5 版本行，串行）。
- 跨组交接：T1 的 FCP 与 T2 的安装包字节由根代理回填 T5 的 `[TBD]` 与 README 条件句；`dist`/`host/bin` 最终重建由根代理做。
- 报告：A 组 `docs/iteration/round-03/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-03/t*-*.png`。

## 本轮不做（写进下轮建议）

「新建 / 另存为」（用户可见能力，待产品负责人点头）、`.md` 文件关联（同上，且抢不到默认程序）、`shots/` 清理与 94 处引用同步（本轮只记录，不删）、KaTeX 拆包与字体白名单、CI windows 宿主 job、`src/App.tsx` 拆分、真模型联网、`filter-repo` 历史瘦身、签名证书（花钱）、skip link / `aria-keyshortcuts` / 帮助面板、760px 再窄一档。

## 本轮 Demo（≤3 条用户可见变化）

1. 双击 `.md` 打开时正文几乎立刻出现（FCP 2.2 s → ≤500 ms 量级），转发第二个文件不再多等 2 s；设置与草稿在重启后仍在（origin 固定）。
2. 1024 宽窗口不再横向滚动，保存 / 设置 / 源码 / 预览都在；401/断网/保存/导出失败都说清下一步且不自动消失。
3. 双击 setup.exe 无需管理员装到当前用户；缺 WebView2 运行时时安装器直接给下载指引，不会「装好了打不开」。

## 风险最高的任务

**T1**。它换掉 origin 与服务方式（`https://sidelight.local` → 固定 `http://127.0.0.1:47821`），FSA、argv、单实例、脏判断都要在新 origin 上重跑，旧 origin 的 localStorage 一次性丢失且本轮不做迁移；固定端口被占时只能报错退出，没有兜底。证据充分（回环 28/60 ms 对映射 2,011 ms、WRR 2,392 ms，同一 WebView2 内 A/B），且验收用两次冷启动证明 origin 稳定。次高是 T2：卸载段误删 `%LOCALAPPDATA%\Sidelight` 即用户数据损失，验收已单列一段。

## 下一轮建议主题

**从「能装」到「能开始写」**：先做「新建 / 另存为」（本轮唯一被砍的用户可见能力，需产品负责人点头），再补键盘可达性（skip link、快捷键提示、帮助面板）与首次使用状态收口；发布侧接 CI windows 宿主 job、`.md` 关联决策、KaTeX 拆包与 `shots/` 清理（先同步 94 处引用）；把窗口 107 ms 与 FCP ≤500 ms 写成固定验收线。
