# 第 02 轮 · 独立验收（tester）

日期：2026-11-15。基线 `7f6058e`，v0.16.3。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173`（验收开始时曾掉线，根代理重启后确认服务最新代码：`/src/App.tsx` 含 `__slState`，`useDialogFocus.ts` 可加载）；CDP `http://127.0.0.1:9222`。

方法：先按门禁、UI、宿主、打包的顺序自己跑；得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。宿主测试期间按根代理提示先结束浏览器检查，避免 Vite 监听 `host/bin` 时的整页 reload / EBUSY 噪声；该噪声本身不作为产品缺陷。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，113 modules，203 ms | `.tmp/r2-build.log` |
| `npm test` | **15 个文件、165 条断言、0 失败**，exit 0 | `.tmp/r2-test.log` |
| `npm run roundtrip` | exit 0；当前应用 **3 / 7 完全保真**（03 脚注、05 行内 HTML、07 公式全保真；02 表格、04 引用式链接、空行仍有 diff） | `.tmp/r2-roundtrip.log` |

- `dist` 合计 **1,395,531 B**（round-01 为 1,392,880 B，T3 的 UI 改动 +2,651 B）。
- `dist/assets/index-DR3Uybpb.js` **1,089.69 kB / gzip 341.13 kB**；CSS **49.08 kB / gzip 12.60 kB**。
- chunk 警告仍在：`(!) Some chunks are larger than 500 kB after minification`，属既有问题，不是本轮回归。

## T1 双击第二个文件不丢字：**PASS**

- `powershell -ExecutionPolicy Bypass -File host/build.ps1` → exit 0；`host/bin/Sidelight.exe`、`www/index.html`、`Sidelight.exe.config` 存在。
- `node host/test-forward.mjs` → **12/12 PASS**（dirty-no、dirty-yes、race、reload-race 各例的第二进程都 exit 0）。
- 自写最小复现 `.tmp/r2-forward-repro.mjs`（CDP 9336）→ **10/10 PASS**：

```text
PASS 复现1 脏文档草稿已写入
PASS 复现1 日志 forward dirty=1
PASS 复现1 选否后正文未替换 (sendkeys=0 name=a.md)
PASS 复现2 脏文档草稿已写入
PASS 复现2 日志 forward dirty=1
PASS 复现2 选是后已替换为 b.md (sendkeys=0 name=b.md)
PASS 复现3 无脏不弹框直接换 (dirty0=true name=b.md)
PASS 复现3 没有调用确认框（日志无 cancelled/confirmed）
PASS 复现4 第一次转发触发 navigation starting
PASS 复现4 reload 中转发不丢，最终 b.md (queued=true drained=true name=b.md)
```

`host.log` 顺序（复现 4，reload 场景）：

```text
start args=…\d.md
secondary mutex=Global\Sidelight
pipe sent …\d.md
forward dirty=0 …\d.md
navigation starting https://sidelight.local/index.html
start args=…\b.md
pipe sent …\b.md
forward queued …\b.md
nav completed success=True status=Unknown
forward drained …\b.md
forward dirty=0 …\b.md
navigation starting https://sidelight.local/index.html
```

结论：脏判断读 `window.__slState.dirty`；选「否」`localStorage.text` 与 `name` 保持 first + DIRTY-MARK；选「是」换成 second；无脏时不弹框；reload 中转发入队、最终应用最后一个路径，无 `forward failed`。测试结束 `Sidelight` 进程数 0。

## T2 长路径与启动失败：**PASS（含 2 项 UNVERIFIED）**

`node host/test-failure.mjs` → **6/6 PASS**：

```text
long fixture len=309
PASS longpath-plain：300+ 字符路径能打开 — len=309 marker=true missing=false failed=false
PASS longpath-prefixed：300+ 字符路径能打开 — len=313 marker=true missing=false failed=false
PASS nowww：标题是「Sidelight 启动失败」 — title=[Sidelight 启动失败]
PASS nowww：主动关窗后 exit 1、日志说重新解压 — exit=1 cue=true
PASS datadir-fail：三级全失败时标题「Sidelight 启动失败」、正文说无法创建数据目录、exit 1 — title=[Sidelight 启动失败] body=true exit=1 failed=true
PASS datadir：日志有 data dir= 且编辑器可用 — data dir=…\host\bin\webview2-data kind=portable
summary: 6/6 PASS
```

自写独立复核 `.tmp/r2-t2-extra.mjs`：

```text
long path length = 313 （自己逐级造目录，非复用官方 fixture）
PASS 自造 300+ 路径：CDP 起来 (313 chars)
PASS 自造 300+ 路径：正文含标记
PASS 坏 www：标题「Sidelight 启动失败」 (title=[Sidelight 启动失败] 190ms)
PASS 坏 www：关窗后 8s 内 exit 1 (exit=1)
PASS 坏 www：日志说重新解压
PASS build.ps1 复制 Sidelight.exe.config (bin\Sidelight.exe.config)
PASS app.manifest 已编进 exe（csc /win32manifest）
PASS app.manifest 不复制到 host/bin（按计划只需 config）
```

- 我的 `app.manifest` 属性正则一开始写成 `longPathAware="true"`，误报 FAIL；实际文件是元素 `<ws2016:longPathAware>true</ws2016:longPathAware>`（`host/app.manifest:14`），手工确认正确。`app.manifest` 按计划是 `/win32manifest` 编进 exe，不是复制到 `host/bin`；`Sidelight.exe.config` 则确实被复制，并进 zip。**如果按「两份文件都要复制进 zip」的字面要求，manifest 这一项不满足；按计划与 Windows 机制，嵌入才是正确做法，需根代理确认口径。**
- 300+ 字符路径的**保存**未测（打开已验）。
- **UNVERIFIED**：`%LOCALAPPDATA%` 与 `%TEMP%` 数据目录的**成功**分支。本机沙箱两级都不可写，日志 `kind=portable`；失败分支由 `datadir-fail` 覆盖。计划允许记 UNVERIFIED，下一轮在有可写用户目录的机器上补。
- 启动失败窗口 190 ms 出现，主动关窗后 exit 1，符合「8 s 看门狗只是兜底，测试不靠它」。
- 独立复测 8 s 看门狗：坏 `www` 副本启动后**不关窗**，进程在 **8,060 ms** 自动 `exit 1`（`.tmp/r2-watchdog.log`），没有挂死。

## T3 UI：模拟标注 / 对比度 / 对话框焦点：**PASS（有 1 条非阻塞残留）**

独立脚本 `.tmp/r2-ui.mjs`（dev 5173 + CDP 9222）结果：

**U1 模拟标注**

```text
PASS U1 无 Key 有本地模拟提示 (未配置 API Key，下面是本地模拟批注，不调用模型)
PASS U1 三张卡都有「模拟」胶囊 (mock=3 notes=3)
PASS U1 分析按钮标「模拟」 (分析选中（模拟）)
PASS U1 模拟胶囊对比：底色非透明、字色 --ink (rgb(213, 205, 189) / rgb(29, 32, 35))
PASS U1 设置里显示「未配置」 (未配置：分析会用本地模拟批注)
PASS U1 有假 Key 时无模拟提示 (notice=0)
PASS U1 有假 Key 时按钮不标模拟 (分析本段 / null)
PASS U1 有 Key 时设置不显示未配置
```

**U3 对比度 / 字号 / focus-visible**（WCAG 2.x 相对亮度公式，取页面解析后的变量）

```text
PASS U3 亮色 --ink-faint/--paper ≥4.8 (#666c72 on #f6f4ee = 4.83)
PASS U3 亮色 --ink-faint/--paper-raised ≥5.2 (5.23)
PASS U3 亮色 白字/--mark ≥5.4 (5.40 (mark=#9a5b1c))
PASS U3 暗色 --ink-faint/--paper ≥6.8 (#9aa0a6 on #15171a = 6.80)
PASS U3 暗色 --ink-faint/--paper-raised ≥6.2 (6.26)
PASS U3 .note-head ≥12px (12px)
PASS U3 .status-bar ≥12px (12px)
PASS U3 .note-actions button ≥12px (12px)
PASS U3 .rail-goal-label ≥12px (12px)
PASS U3 .rail-goal-retry ≥12px (12px)
PASS U3 .dialog-note ≥12px (12px)
PASS U3 :focus-visible outline ≥2px ({"tag":"BUTTON","text":"插入 ▾","outlineWidth":"2px","outlineStyle":"solid","outlineColor":"rgb(43, 109, 100)"})
```

**非阻塞残留**：全页字号审计仍发现 8 类可见文字低于 12px：`button.mono` 11px、视图切换按钮 11.5px、`.rail-head`/`.rail-title`/`.rail-count` 11.5px、`.rail-goal`/`.rail-goal-text` 11px。计划点名的 6 类全部 12px，因此按计划验收判 PASS；但「关键小字全部 ≥12px」的目标没有完全覆盖，建议下一轮把 `.rail-goal-text`、`.rail-head` 等一起抬到 12px。

**U2 三个对话框**

```text
PASS U2 设置 aria-modal=true / aria-labelledby 指向存在的 h2 / 初始焦点在框内
PASS U2 设置 背景 inert (inert=6/6)
PASS U2 设置 Tab×12 不逃逸、Shift+Tab×3 不逃逸
PASS U2 设置 Esc 关闭、焦点回 opener「设置」、inert 移除
PASS U2 保存确认 aria-modal=true / focusInside / inert=5/5 / Tab 不逃逸 / Esc 关闭+inert 移除
PASS U2 切换文档 aria-modal=true / focusInside / inert=5/5 / Tab 不逃逸 / Esc 关闭+inert 移除
```

切换框 Esc 后的 `activeElement` 实测为被点的文件树项 `交稿前看一眼.md`，即 opener；设置框逐字验证了「焦点回设置」。保存框的 opener 是编辑器，未逐字断言文本。

- 旧 Edge 翻译扩展噪声再次出现：`Cannot read properties of undefined (reading 'map') at chrome-extension://nmhdhpibnnopknkmonacoephklnflpho/offscreen/offscreenTranslate.js:96`。来源是 `chrome-extension://`，不是 `localhost:5173`；产品页面 `pageerror` 为 0。本轮 `node scripts/acceptance.mjs` 恰好 11/11 PASS（未触发该噪声），`npm run shot` 则打印了这条扩展噪声但 exit 0、产品断言全过。

## T3 门禁：`npm run shot` + acceptance

- `npm run shot`：`katex delta: 0`、`source has currency: true`、`source has inline math: true`；`console errors:` 只有上面那条 chrome-extension 噪声，产品功能项全过。
- `node scripts/acceptance.mjs http://localhost:5173` → **11/11 PASS**：草稿、货币、查找、公式、字体、表格、导出 HTML、frontmatter、脚注、行内 HTML、无控制台错误。没有出现「只有扩展噪声的 1 项 FAIL」。

## T4 便携 zip + 图标：**PASS（SmartScreen/真人双击 UNVERIFIED）**

`node packaging/verify-portable.mjs` → **6/6 PASS**：

```text
PASS zip 能解压
PASS zip 条目齐全（exe/config/ico/README/LICENSE/www） — entries=30
PASS zip 不含 webview2-data / host.log / *.ps1
PASS 截图能拍到窗口（含标题栏图标）
PASS 解压后 spawn 可用：.ProseMirror=1、控制台 0 错误（只看 sidelight.local）
PASS 关窗后进程 0
summary: 6/6 PASS
```

独立核对：

- `release/Sidelight-0.16.3-win-x64-portable.zip`：**900,752 B**，SHA256 `63DA8F372D4EFC156E16AF21E42B390680C387BE2B55BF4EF62B620B2C58DFCC`，低于 940,000 B 门槛。
- zip 共 30 条目，含 `Sidelight\Sidelight.exe`、`Sidelight\Sidelight.exe.config`、`Sidelight\sidelight.ico`、`Sidelight\README.txt`、`Sidelight\LICENSE`、`Sidelight\www\index.html`；无 `webview2-data`、`host.log`、`*.ps1`。
- 解压出的 `www/index.html` 与 CSS 哈希和当前 `dist` 完全一致；JS 内含 `__slState`、`rail-notice-mock`、`aria-modal`，证明 zip 里的前端是 T3 之后的新产物，不是 impl-b 警告的旧 dist。
- 图标：`idCount=5`；第 5 条目数据偏移处首 4 字节 `89 50 4E 47`（PNG）；`[System.Drawing.Icon]::new(...,32,32).ToBitmap().GetPixel(16,16)` = `ff2b6d64`（#2b6d64）；`shots/round-02/t4-portable.png` 为 1280×820，窗口标题栏可见青绿图标。
- `HKCU:\Software\Classes\Sidelight.md` 跑前/跑后均为 False，无注册表写入。
- **UNVERIFIED**：真人资源管理器双击、MOTW/SmartScreen 交互；按计划只能记 UNVERIFIED，不计入 PASS 证据。

## T5 文档与仓库卫生：**PASS（2026-11-15 复验）**

初次验收判 FAIL：ADR-0004 的载荷/zip 数字仍是根代理最终重建前的旧值，`README.md:51` 也还是旧 dist 字节，`host/README.md` 与 ADR 的缺口段仍写「无图标 / 长路径未测」，且 `docs/CHANGELOG.md` 被越界改写历史。builder2 修复后，本轮只复验 T5 与必要回归（`npm test`、`packaging/verify-portable.mjs`、`git status`），不重跑全轮。

通过的项：

```text
README 0 命中：被当成标题分隔线 / 被转义成 / 脚注定义被删 / 还没做 /
                第二版原型 / 跑在浏览器里 / 没有 Tauri 壳
README 命中：3 / 7、C# WebView2 宿主、没有安装器
ci.yml：concurrency、permissions、timeout-minutes: 15
README / ADR-0004 / host README 中 2,376,980 / 900,028 / 1,392,880 均 0 命中
README / ADR-0004 / host README 中「无图标」「长路径未测」均 0 命中
```

复验数字（命令输出与文档一致）：

```powershell
# 载荷取数命令（ADR-0004:42 原文）
(Get-ChildItem host\bin -File | Where-Object Name -in 'Sidelight.exe','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','Sidelight.exe.config' | Measure-Object Length -Sum).Sum + (Get-ChildItem host\bin\www -Recurse -File | Measure-Object Length -Sum).Sum
# 2,379,631   → ADR-0004:45 写 2,379,631；www 1,395,531

(Get-Item release\Sidelight-0.16.3-win-x64-portable.zip).Length
# 900,752     → ADR-0004:47 写 900,752
(Get-FileHash release\Sidelight-0.16.3-win-x64-portable.zip -Algorithm SHA256).Hash
# 63DA8F372D4EFC156E16AF21E42B390680C387BE2B55BF4EF62B620B2C58DFCC → ADR-0004:47 一致

(Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum
# 1,395,531   → README.md:51 写 1,395,531
```

- ADR-0004:53 已写「长路径已测（309/313 字符，带与不带 `\\?\` 前缀都能打开，见 `host/test-failure.mjs`）」；`host/README.md:95` 同样写已测。图标不再列入缺口。
- `git diff docs/CHANGELOG.md` 为空，`docs/CHANGELOG.md` 不再出现在 `git status`；历史测试数已还原。
- `npm test` → **165 条、0 失败**；`node packaging/verify-portable.mjs` → **6/6 PASS**（zip 解压、条目、无 webview2-data/host.log/ps1、spawn 后 `.ProseMirror`=1 且控制台 0、关窗进程 0）。
- 复验结束 `Sidelight` 进程数 0。

T5 判定改为 **PASS**。初次 FAIL 的三项均已按实测修正，修复只动文档，未引入代码改动。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| round-01 货币不吞字 | PASS：acceptance `PASS 货币不吞字`、shot `katex delta: 0` / `source has currency: true` | `.tmp/r2-acceptance.log`、`.tmp/r2-shot.log` |
| round-01 字体只发 woff2 | PASS：acceptance `PASS 字体已加载 (faces=20 loaded=2)`；dist 仍 19 个 woff2 / 256,168 B | 同上 |
| `node scripts/acceptance.mjs` | **11/11 PASS** | `.tmp/r2-acceptance.log` |
| `node scripts/host-smoke.mjs --fsa` | **7/7 PASS**（窗口、渲染、argv、单实例、FSA 真实写盘 hash 95ef210b→270e9b0a） | `.tmp/r2-host-smoke.log` |
| 控制台错误 | 产品页 0；唯一噪声来自 `chrome-extension://…offscreenTranslate.js`（Edge 翻译扩展） | `.tmp/r2-shot.log`、`.tmp/r2-ui.log` |

宿主测试期间没有打开页面，因此没有触发「Vite 监听 host/bin 导致整页 reload / EBUSY」；该噪声记录在案，不算产品缺陷。测试结束 `Sidelight` 进程 0，9335/9337 端口均无监听。

## 截图抽查

| 文件 | 大小/尺寸 | 观察 |
| :--- | :--- | :--- |
| `shots/round-02/t3-u1.png` | 133,065 B / 1440×900 | 非空白；3 张卡各带「模拟」胶囊、页边模拟提示、按钮「分析本段（模拟）」 |
| `shots/round-02/t3-u3.png` | 133,893 B / 1440×900 | 非空白；键盘焦点在「插入」上有 2px 青绿描边 |
| `shots/round-02/t3-u3-dark.png` | 136,027 B / 1440×900 | 非空白；暗色变量生效 |
| `shots/round-02/t3-u2.png` | 136,588 B / 1440×900 | 非空白；设置框覆盖、背景压暗 |
| `shots/round-02/t3-u2-save.png` / `t3-u2-switch.png` | 111,168 / 103,891 B | 非空白；保存确认与切换文档框 |
| `shots/round-02/t4-portable.png` | 94,545 B / 1280×820 | 非空白；窗口标题「Sidelight（便携数据目录）」，标题栏图标可见 |

## 范围与卫生

- `git status`：16 个已跟踪文件改动（`.github/workflows/ci.yml`、`README.md`、`docs/adr/0004`、`host/{Program.cs,README.md,build.ps1,send-keys.ps1}`、`src/App.tsx`、3 个组件、`src/styles.css` 与 4 张旧截图）；新增未跟踪：`docs/iteration/round-02/`、`host/{Sidelight.exe.config,app.manifest,test-failure.mjs,test-forward.mjs}`、`packaging/`、`shots/round-02/`、`src/components/useDialogFocus.ts`。`docs/CHANGELOG.md` 已不在改动列表。
- `git diff --stat`：16 文件，511 insertions / 88 deletions。`src/` 改动与 T3 文件清单一致；`host/` 与 `packaging/` 符合 T1/T2/T4；`package.json`、`scripts/`、`.gitignore`、`vite.config.ts` 未改。
- `release/*.zip` 被 `.gitignore` 的 `*.zip` 忽略（`git check-ignore` 命中）；`dist`、`host/bin`（含 `webview2-data`、`host.log`）、`.tmp` 也都被忽略，未进版本控制。
- 无新增运行时依赖；`package.json` 依赖段零改动。
- 密钥/调试残留：diff、新增源码与脚本搜索 `sk-`、`api_key`、`password`、`secret`、`Bearer` 无命中；`src/` / `host/` diff 无 `console.log`、`debugger`。
- 测试副作用：acceptance / shot / host-smoke 重写了 `shots/acceptance.png`、`shots/round-01/t1-currency.png`、`shots/round-01/t3-{window,fsa}.png`，属既有脚本行为；提交时由根代理决定一并提交或还原。
- 越界改动已处理：`docs/CHANGELOG.md` 的历史数字已还原，`git diff docs/CHANGELOG.md` 为空，不再出现在 `git status`。

## 与实施报告对照

- `impl-a.md` 的 U1/U3/U2 结论与我的实测一致；其 acceptance 记录 10/11（扩展噪声），我这次跑到 11/11；两种结果都证明产品功能项全 PASS。其 D2（Vite 监听 `host/bin` 的 reload/EBUSY）与我收到的环境提示一致，本轮按非产品缺陷记录。
- `impl-b.md` 的 T1 12/12、T2 6/6、T4 6/6 与我复跑一致；它主动声明了 zip 里的 `www` 是旧 dist、需根代理重建，根代理确实重建了 zip（900,752 B），我确认 zip 内前端已是 T3 后产物。
- `impl-b.md` 的 T5 记录（2,376,980 / 900,029）是根代理最终重建前的旧值；初次验收因此判 FAIL。builder2 已把 ADR/README/host README 更新到最终实测值，我复算一致（2,379,631 / 1,395,531 / 900,752），故 T5 复验 PASS。
- 实施者报告称 `bin` 的 `app.manifest` 被复制/进 zip 的口径不存在：计划只要求 config 复制进 bin、manifest 用 `/win32manifest` 嵌入；实际也是这样。

## 最终判定

**PASS（复验范围：T5 + `npm test` + `packaging/verify-portable.mjs` + `git status`；T1–T4 结论沿用初次全量验收）**

- 初次 FAIL 的三项（ADR/README/host README 旧数字、过期缺口、CHANGELOG 越界）已按实测修正并复算一致；旧值 2,376,980 / 900,028 / 1,392,880 在三个文档中 0 残留。
- 产品与门禁：build/test/roundtrip、acceptance 11/11、host smoke 7/7、T1 12/12、T2 6/6、T3 UI 全过、T4 6/6；复验的 `npm test` 165/0 与 `verify-portable` 6/6 仍通过。
- 仍保留的 UNVERIFIED（非本轮新增失败）：T2 的 `%LOCALAPPDATA%`/`%TEMP%` 数据目录成功分支；T4 的真人双击/资源管理器解压/SmartScreen；长路径下的保存。
- 非阻塞残留：T3 仍有 8 类 11–11.5px 小字（计划点名的 6 类已全 12px）；`app.manifest` 按计划嵌入 exe 而非复制进 zip；Edge 翻译扩展的 `chrome-extension://` 控制台噪声。
