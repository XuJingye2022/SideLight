# 第 03 轮 · 缺陷侦察（finder: bug）

日期：2026-11-15。仓库 `D:\Documents\SidelightProgram`，commit `b434f25`（产品代码同 `6c9c2b0`）。
环境：Windows 11、Node 24.21.0、无管理员；dev `http://localhost:5173`；CDP `http://127.0.0.1:9222`；宿主 `host/bin/Sidelight.exe`（512 行 `host/Program.cs`，`Sidelight.exe.config` + `app.manifest` 已就位，exe 时间 18:06:58 晚于 Program.cs 17:55:40，**未重建宿主**）。
方法：只读产品代码。自写探针 `.tmp/r3-probe.mjs`（宿主 + CDP 9341 读 `performance`）、`.tmp/r3-navmatrix.mjs`（`.tmp/r3-host/` 副本里逐页导航 A/B）、`.tmp/r3-events.mjs`（CDP 网络/页面事件时间线）、`.tmp/r3-blocked.mjs`（停滞期渲染器是否应答）、`.tmp/r3-browser.mjs`（dev + CDP 9222 焦点/新建/错误路径）。每次探针结束 `Stop-Process Sidelight`，结束进程数 0。
未改动 `src/`、`host/`、`scripts/`、`dist/`；未跑 `npm run build`。

## 冷启动结论（本轮最重要）

**2.0 s 不在应用、不在宿主启动顺序、不在数据目录，而在 WebView2 的 `https://sidelight.local` 虚拟主机映射路径：每次导航阻塞渲染器主线程约 1.9 s，正文/子资源在 2.0 s 后才到。**

### 1. 基线 3 次（宿主无 argv，`host/bin`）

| 次 | FP | FCP | DCL | responseEnd | JS/CSS 请求开始 | JS 堆 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 2,084 | 2,184 | 2,074 | 6 | 2,014 | 7.1 MB |
| 2 | 2,084 | 2,200 | 2,074 | 6 | 2,016 | 7.1 MB |
| 3 | 2,088 | 2,188 | 2,074 | 7 | 2,017 | 7.1 MB |

宿主日志（第 1 次，毫秒级）：`start` 18:19:15.470 → `data dir` 15.476 → `controller ready` 15.647（+177）→ `navigate` 15.649 → `nav completed` 17.724（**+2,071**）。页面 `timeOrigin − 进程启动 = 204 ms`。
同进程 reload：FCP 2,044 / DCL 2,019 / JS+CSS 请求开始 2,012 ms。**不是首启效应。**

### 2. 逐个排除（同一台机、同一时段）

| 候选 | 实验 | 结果 | 判定 |
| :--- | :--- | :--- | :--- |
| 应用 JS / React / KaTeX | 映射主机上一个 **0 脚本 0 子资源**的空白页 | DCL **2,011** / FCP 2,040 | **排除** |
| `www` 文件数（实测 22 个，不是 30） | 空白页 0 个子资源仍 2 s | 同上 | **排除** |
| localStorage / 草稿恢复 | 空白页无 JS；`draftLen=131` 也是 reload 后仍 2 s | 同上 | **排除** |
| WebView2 数据目录 / 首启建 profile | `.tmp/r3-host/` 拷贝（无 `webview2-data`，全新 profile）与 `host/bin`（14 MB 旧 profile） | 两者都 2 s；日志 `kind=portable` | **排除** |
| 宿主启动顺序（先窗后 WebView2） | 窗口 107 ms（上轮）、`navigate` +179 ms；导航完成 +2,071 ms | 窗口早于导航，2 s 全在导航内 | **排除**（顺序不是根因） |
| 宿主 UI 线程同步 IO | 2 s 内宿主无工作可做（`navigate` 后无日志）；阻塞采样未成功（`.tmp/r3-responding.txt` 未生成） | 2 s 发生在渲染器侧（`Runtime.evaluate` 不应答），空白页同样慢，宿主同步 IO 解释不了 | **排除（未做 Responding 采样）** |
| GPU | `--disable-gpu` | FCP 2,184 | **排除** |
| 渲染器被当后台窗口节流 | `--disable-features=CalculateNativeWinOcclusion`、`--disable-backgrounding-occluded-windows` | FCP 2,188 / 2,188 | **排除** |
| https / 证书 | 同一映射的 `http://sidelight.local/blank.html` | DCL **2,015** | **排除**（与 TLS 无关） |

### 3. 决定性 A/B（同一个 WebView2 进程内逐页导航，`.tmp/r3-navmatrix.json`）

| 目标 | DCL | FCP |
| :--- | ---: | ---: |
| `https://sidelight.local/blank.html`（空白，无 JS） | **2,011** | 2,040 |
| `https://sidelight.local/css.html`（只加 CSS） | 2,012 | 2,044 |
| `https://sidelight.local/classic.html`（经典 script） | 2,010 | 2,036 |
| `https://sidelight.local/mod.html`（module script） | 2,011 | 2,028 |
| **`http://127.0.0.1:5199/blank.html`（同一份文件，回环 HTTP）** | **28** | 60 |
| `http://127.0.0.1:5199/mod.html`（CSS+JS 都有） | 11 | 32 |
| `https://sidelight.local/index.html`（应用） | 2,074 | 2,188 |

**同一份字节、同一个 WebView2、同一秒：映射主机 2,011 ms，回环 HTTP 28 ms。差 72 倍。**

### 4. 停滞点精确到毫秒（CDP 事件时间线，`.tmp/r3-events.json`）

```text
virt blank: +3ms frameStartedLoading | +3ms req /blank.html | +4ms resp 200
            +2011ms frameNavigated | +2016ms data 122B | +2018ms DCL/load
virt app:   +4ms req /index.html | +5ms resp 200
            +2015ms frameNavigated | +2022ms req assets/*.js + *.css
```

响应头 4 ms 就到，**响应体与 document 提交要等 2,011 ms**。CDP `Runtime.evaluate` 采样：`+114 ms … +1,764 ms` 渲染器主线程 **不应答**，`+1,998 ms` 恢复应答，DCL 2,017 ms。即 **渲染器主线程被阻塞约 1.9 s**，不是慢在解析或 JS 上（trace 里同样没有长任务）。

### 5. 根因判断与验证方法

**最可能的根因（1 条）**：`SetVirtualHostNameToFolderMapping` 的服务路径 —— 每次导航的响应体投递与提交握手阻塞渲染器主线程约 2.0 s。它与页面内容、协议、GPU、数据目录、宿主启动顺序全部无关，只与「目标是映射主机」有关。`sidelight.local` 用 `.local`（mDNS 保留域）只是次要嫌疑：`http` 与 `https` 映射同样慢，说明不是 TLS 或证书；但**「换成非 `.local` 主机名」还没验证**，它能进一步区分「名字解析」与「映射实现」。

**验证方法（都能用现有探针，不需要改产品代码）**：
1. 把 `APP_URL` 换成 `http://127.0.0.1:<端口>/index.html`，宿主内用 `TcpListener` 直接发 `www` 文件（约 80 行、无依赖、无管理员、不触发防火墙提示）。同一 WebView2 里回环 HTTP 已实测 **DCL 28 ms / FCP 60 ms**，这是最快拿到 ≤100 ms 的路径。验收加一条「宿主 FCP ≤ 500 ms」。
2. 若不想动服务方式：把映射主机名改成非 `.local`（如 `app.sidelight.test`）再跑 `.tmp/r3-probe.mjs`；仍慢则改 `WebResourceRequested` + `CreateWebResourceResponse` 再 A/B。
3. 每改一次跑 `node .tmp/r3-probe.mjs --exe <新 exe> --label <名>` + `node scripts/host-smoke.mjs`，比较 FCP 与 `nav completed` 间隔。

**影响**：双击 `.md` 打开、转发第二个文件（内部 `location.reload()`）、任何 reload，都是 2 s 白屏。安装包「轻量」验收线无法定，用户第一次打开会怀疑没启动。**难度**：M（改宿主 + 门禁；验证只要 S）。

### 6. 本轮未处理的旧项（复现，不新增编号）

- 每次启动都复现 `%LOCALAPPDATA%` 与 `%TEMP%` 两级 `data dir candidate failed → kind=portable`（`host.log` 每次都写）。与第 2 轮一致，装到只读目录会撞启动失败；本轮未再验失败窗行为。

## B1 宿主每次导航固定 2.0 s：虚拟主机映射阻塞渲染器（详见上节）

- 现象：窗口 107 ms 可见，内容 2.0 s 后出现；每次导航（含 reload、含空白页）都固定多 2.0 s。
- 复现：`node .tmp/r3-probe.mjs --exe host/bin/Sidelight.exe --label base`；`node .tmp/r3-navmatrix.mjs`。
- 证据：上节基线表、A/B 表、事件时间线与阻塞采样；`.tmp/r3-probe-base{1,2,3}.json`、`.tmp/r3-navmatrix.json`、`.tmp/r3-events.json`。
- 影响：核心入口（双击 `.md`）2 s 白窗；转发一次再加 2 s；FCP 验收线不可定。
- 建议：改回环 HTTP 服务 `www`（首选，已实测 28 ms 量级）；或换非 `.local` 映射名 / `WebResourceRequested` 做 A/B。
- 难度：M。

## B2 没有「新建」入口；空工作区显示的是示例正文，文件树却说「还没有打开文件夹」

- 现象：清空 `localStorage` 后 reload，正文是「侧灯 / 这是 Sidelight 的原型。…」示例，文件树写「还没有打开文件夹」，`localStorage` 的 `name` 为 `null`，没有任何「新建 / 另存为」按钮。20 个按钮全文：`分析本段（模拟）| 导出 ▾ | 保存 | 设置 | 插入 ▾ | H1 | H2 | B | I | S | </> | 专注 | 打字机 | 源码 | 预览 | 文件 | 大纲 | 打开文件夹 | 打开文件 | 试用示例`。
- 复现：`node .tmp/r3-browser.mjs`（清 `localStorage` → reload）。
- 证据：脚本输出 `FAIL 有「新建」入口`、`EMPTY-STATE {"name":null,"body":"侧灯 这是 Sidelight 的原型。…","treeText":"还没有打开文件夹…"}`、`PAGEERRORS: []`。
- 影响：第一次使用无法从空白开始写；用户分不清「示例」与「我的未命名文档」，Ctrl+S 得到 `未命名.md` 下载，内容其实是示例。体验与「首次使用可信」目标冲突。
- 建议：顶栏加「新建」（清正文、名 `未命名.md`、`dirty=false`）；空状态只在有示例时显示示例，并在正文上方标「这是示例，可新建空白文档」；「试用示例」与空状态二选一，不要同时出现。
- 难度：S。

## B3 错误路径没有用户可读文案：401 铺原始 JSON，断网显示英文 `Failed to fetch`，提示 6 s 自消失且无重试

- 现象（代码路径确定，UI 文本本轮未能实测）：`fetch` 失败时 `setNotice(messageOf(error))` 直接显示 `error.message`。401/429 的 message 是 ``模型接口返回 ${status}：${原始响应体前 200 字}``；断网时 `fetch` 抛 `TypeError: Failed to fetch`，英文原样进提示。
- 复现：把 `localStorage` 的 `sidelight.apiKey.v1` 设假 key，拦截模型域名返回 401，点「分析本段」。**本轮实测未触发请求**（没有选区；`notice` 为空），所以「UI 实际显示什么」标 **未验证**；代码路径已读。
- 证据：`src/lib/ai.ts:63`–`:65`（`throw new Error('模型接口返回 ...' + detail.slice(0,200))`）、`src/lib/ai.ts:43`（`fetch` 无 `catch`）、`src/App.tsx:538` / `:569` / `:632`（`setNotice(messageOf(error))`）、`src/App.tsx:838`–`:841`（`notice` 6 000 ms 自动清空，无重试按钮）；`.tmp/r3-browser.log` 的 `ERROR-401` / `ERROR-OFFLINE` 记录。
- 影响：桌面首发用户多数只有一把 key。401 时看到一屏 JSON 不知道是 key 错了；断网看到英文，两秒后提示就消失。第 2 轮简报已把「401 铺原始 JSON、断网只显示 Failed to fetch」列为待办，本轮确认仍在。
- 建议：在 `ai.ts` / `search.ts` 抛结构化错误（`kind: 'auth' | 'rate' | 'network' | 'server'`），UI 映射中文：401「密钥无效，去设置里检查」+ 直接开设置；429「请求太频繁，稍后再试」；`TypeError` →「网络不可用，检查网络后重试」；提示里加「重试」按钮，`notice` 只在错误态保留到用户处理。
- 难度：S。

## B4 没打开文件夹时 Ctrl+S 静默下载到系统下载目录，不弹保存确认，用户不知道文件去了哪

- 现象：空工作区按 Ctrl+S，浏览器直接产生下载 `未命名.md`（导出 `未命名.html` 同理），**没有**「保存前对比」对话框；页面无提示、无路径显示。有目录句柄时才走真实写盘。
- 复现：`node .tmp/r3-browser.mjs`（`SAVE-DIALOG {"modal":0}`、`downloads=["未命名.html","未命名.md"]`）。
- 证据：同脚本输出；`src/App.tsx:1315`–`:1320`（`downloadFile` 用 `anchor.download`）、`:1089`（`saveFile`）、`:1025` / `:1035`（`commitSave` 的 catch 才有提示）。
- 影响：桌面应用里 Ctrl+S 的预期是「覆盖当前文件」。未打开文件夹时文件落到下载目录，界面不变、无路径，用户找不到刚保存的内容；与「保存前对比」承诺不一致（该框只在有句柄时出现）。本轮无法判断宿主里 WebView2 的下载落点（未验证）。
- 建议：无文件句柄时把「保存」降级为显式「另存为 / 导出」，或弹一次「还没打开文件夹，保存会下载到系统下载目录」的确认；状态栏显示当前文档是否有磁盘位置。
- 难度：S。

## 已验证通过（别再重复调查）

- **三个对话框焦点/inert 回归：PASS**。设置框 `aria-modal=1`、背景 `inert=5`、Tab×8 不逃逸、Esc 关闭后 `inert=0`、焦点回「设置」按钮、**关闭后正文可点击并输入**（`焦点回归-甲` 进正文）；有脏改动时打开设置 `inert=6` 且 `.ProseMirror` 在 inert 内（`dialogProbe` 全部 PASS）。
- 空文档导出可用：`导出 ▾` → HTML，产生 `未命名.html`；Markdown 项存在。
- 页面无 `pageerror`（`PAGEERRORS: []`）。
- `www` 实际 **22 个文件**（zip 30 条目是含 exe/config/ico/README/LICENSE 的口径，见第 2 轮 test.md）；STATE 待办里「30 个」需改。
- 上轮 test.md 的非阻塞项：11–11.5 px 小字（`.rail-head` 等）仍在，属体验 finder 范围；Edge 扩展 `chrome-extension://` 噪声仍在，不影响产品页。

## 未验证（诚实标注 + 补法）

| 项 | 为什么没测 | 怎么补 |
| :--- | :--- | :--- |
| 输入法组合期间打开对话框 | 本机无法可靠驱动 IME；CDP `insertText` 不产生 `compositionstart` | 用真实微软拼音，`compositionstart` 后点「设置」，看 `compositionend` 是否落在关闭后的正文 |
| 保存确认框（`pendingSave`）的 Tab/Esc | 无目录句柄时 Ctrl+S 走下载，不弹此框 | 宿主里「打开文件夹」后改字再 Ctrl+S |
| 切换文档对话框焦点回归 | 需文件树里有 ≥2 个文件；本轮没开真目录 | 同上，用 `host/send-keys.ps1` 选 `.tmp` 目录 |
| 脏改动 + Ctrl+S + 立刻第二次转发 / 转发排队期间保存 / 连续两次转发 | 每条都要真目录与两次进程启动，超出本轮时间 | 扩 `host/test-forward.mjs`：保存后 150 ms 内启动第二实例；转发排队中按 Ctrl+S；断言最终文档与磁盘内容一致 |
| 401 / 断网的真实 UI 文本 | 分析请求未触发（无选区） | 先选中文字再点「分析本段」，或直接给 `ai.ts` 写单测断言抛错文案 |
| 只有 frontmatter 的文档、可新建性 | 第 2 轮已验 frontmatter 保存字节一致；本轮无新建入口可验 | B2 修完后补「新建 → 只写 frontmatter → 保存 → 重开」 |
| 宿主里 Ctrl+S 的下载落点 | 需真目录与 WebView2 下载事件 | 宿主内点保存，抓 `DownloadStarting` 或查 `%USERPROFILE%\Downloads` |

## 代码优化机会（最多 3 条）

### O1 宿主：`SetVirtualHostNameToFolderMapping` 换成进程内回环 HTTP + 统一 `ApplyDoc`

- 事实：`host/Program.cs:246`–`:248` 用映射；`BuildApplyScript`（`:307`–`:332`）与 `DOC_KEY`（`:17`，前端 `src/App.tsx` 也有一份）跨语言重复。映射路径实测每次导航 2.0 s，回环 HTTP 实测 28 ms。
- 收益：一次改动同时解决冷启动与「转发两次就两次白屏」；前端不再依赖 `sidelight.local` 这个域名，dev 与打包同源。
- 风险：要在宿主里起 `TcpListener`（约 80 行）并处理端口占用；必须复跑 `scripts/host-smoke.mjs` 与新增 FCP 断言。难度 M。

### O2 转发前等脏标记最多轮询 3 s（30 × 100 ms）

- 事实：`host/Program.cs:361`–`:391` 的 `ReadDirtyAsync` 每 100 ms 查一次 `typeof window.__slState`，最多 30 次；`ApplyForwardAsync` 在 UI 线程上 `await` 它，转发被拖慢最多 3 s，且与 B1 的 2 s 导航叠加。
- 收益：改成前端在挂载时 `chrome.webview.postMessage({ready:true})`（或 `AddScriptToExecuteOnDocumentCreated` 里先写一个标记），宿主收到消息即读脏标记；没有 WebView2 消息通道时用一次 `ExecuteScriptAsync` 重试 5 次即可。风险：要兼容 reload 期间的排队，需重跑 `host/test-forward.mjs` 12 例。难度 S。

### O3 `src/App.tsx` 约 2,100 行，保存/序列化/草稿写入仍三处重复

- 事实：`saveFile`（`:1089`）、`commitSave`（`:1025` 附近）、`downloadFile`（`:1315`）各自拼一遍导出与提示；第 2 轮记的「三处重复序列化 / 草稿写入」未变。B4 与 B3 都落在这个文件的 catch 链上。
- 收益：抽 `persist(kind: 'save' | 'download' | 'export')` 后，B3 的错误映射与 B4 的「无句柄降级」各改一处；`npm test` 现有 15 个文件可加纯函数测试。风险：改动面大，按函数抽、不换架构。难度 M。
