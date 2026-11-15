# 第 04 轮 · 实施报告 B（builder2）

执行人：builder2。只做 T5a（宿主下载落点 + readOnly 标记），T5b 等根代理放行。
时间盒：50 分钟。未 commit；结束 `Sidelight` 进程 0。`src/**`、`packaging/**`、`AGENTS.md`、`README.md`、`docs/CHANGELOG.md` 一行未碰。

---

## T5a 结果

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| `DownloadStarting` 接住下载 | **PASS（宿主侧）** | 日志 `download starting name=doc.md result=… handled=true mode=env`；导出与 Ctrl+S 两条都触发 |
| 文件真的落盘 | **UNVERIFIED（环境）** | `download state=Interrupted reason=FileFailed bytes=0`，见下 |
| 文件名防越界 | PASS | 取 `Path.GetFileName(默认 ResultFilePath)`，只写 basename |
| 两条分支都 `Handled = true` | PASS | env 分支与 SaveFileDialog 分支都在设置 `ResultFilePath` 后置 `Handled=true`；取消时 `Handled=true` + `Cancel=true` |
| 日志记最终路径 | PASS | `download starting name=… result=… handled=true mode=env|dialog` |
| argv 文档注入 `readOnly: true` | PASS | 探针读 `localStorage['sidelight.doc.v1']` → `readOnly=true` |
| 真实 SaveFileDialog | UNVERIFIED | 探针只走 `SIDELIGHT_DOWNLOAD_DIR` 分支，真对话框需要人工点 |

### 改动

- `host/Program.cs`
  - `core.DownloadStarting += OnDownloadStarting;`（注册在 `EnsureCoreWebView2Async` 之后、导航之前）。
  - `OnDownloadStarting` 在 UI/STA 线程同步处理：取默认 `e.ResultFilePath` 的 basename（见下「API 差异」）；有 `SIDELIGHT_DOWNLOAD_DIR` 就 `Directory.CreateDirectory` + `e.ResultFilePath = Path.Combine(dir, name)`，否则弹 `SaveFileDialog`（`FileName = name`、`InitialDirectory` 用上次目录或 `Downloads`、`OverwritePrompt`）；取消 → `e.Cancel = true`。**两条分支都 `e.Handled = true`**，并写日志。
  - `DownloadOperation.StateChanged` 记 `download state=<state> reason=<InterruptReason> bytes=<n> path=<path>`（调试与探针判定用）。
  - `core.Profile.DefaultDownloadFolderPath` 设到上次目录/下载目录（对测试环境是唯一可写候选）。
  - `BuildApplyScript` 注入的 JSON 从 `{text,name,savedAt}` 改成 `{text,name,savedAt,readOnly:true}`（argv 与转发共用），A 组 T4 可直接读。
- `host/download-probe.mjs`（新）：在独立快照 `.tmp/host-t5a` 上跑（拷 `host/bin`，排除 `webview2-data`/`host.log`），CDP 9336。
- `host/README.md`：加一段「下载落点」（env 覆盖、SaveFileDialog、Handled、日志、SDK 差异、沙箱限制）。

### API 差异（与计划不同，已核 IDL）

SDK 1.0.4314.35 的 `ICoreWebView2DownloadStartingEventArgs` **没有 `SuggestedFileName`**（查了 `WebView2.idl` 与 dll 字符串表；计划里那句按旧文档写的）。改用它的默认 `ResultFilePath`：文档写明默认值就是「下载目录 + 建议文件名」，取 `Path.GetFileName(...)` 同样只保留 basename，越界防护不变。IDL 里有 `Cancel` / `ResultFilePath` / `Handled` / `GetDeferral` / `DownloadOperation`。

### 探针实测

```text
PASS argv 注入的文档带 readOnly 标记 — readOnly=true name=doc.md
UNVERIFIED 导出 → Markdown 落盘到指定目录 — DownloadStarting 已触发（name/result/handled=true），但 Chromium 写下载文件被拒：state=Interrupted reason=FileFailed
UNVERIFIED 保存降级（picker=undefined）→ 下载落盘 — DownloadStarting 已触发，但 Chromium 写下载文件被拒：reason=FileFailed
summary: 1/1 PASS，2 UNVERIFIED（环境：Chromium 下载写文件被拒）
```

**为什么是 UNVERIFIED 而不是 PASS**：宿主已经把事件接住、把目标路径写进 `e.ResultFilePath`、把 `Handled=true` 打上，日志三要素都在；但 WebView2 的浏览器进程在 `D:\…\.tmp\host-t5a\downloads\doc.md` 上 `CreateFile` 直接失败（`reason=FileFailed`，`bytes=0`）。换过三个目录都不行：快照内 `downloads/`、`.tmp/host-t5a-dl/`、甚至 `webview2-data/dl/`（浏览器进程自己的数据目录内）——同一现象。探测进程（Node/PowerShell）对同一路径可写。判断是本沙箱对浏览器进程下载写文件的限制，与第 2/3 轮「NSIS 写 AppData 被拒」「HKCU 写入被吞」同类。真机（交互式桌面）上应当正常；**真实 SaveFileDialog 与真实落盘都标 UNVERIFIED**。

**探针环境坑（已修）**：Playwright 连上 CDP 会把下载行为改成 `allowAndName` 并截走下载，宿主收不到 `DownloadStarting`（现象是 Playwright 报 `download` 事件、宿主零日志、目录空）。探针在连上后显式 `Browser.setDownloadBehavior {behavior:'default', eventsEnabled:false}` + `Page.setDownloadBehavior {behavior:'default'}` 恢复 WebView2 处理，事件才出现。后续任何测宿主动作的探针都要注意这一点。

### 集成段（picker 设为 undefined → 保存降级 → DownloadStarting）

**状态：待 A 组 T1。** 探针里已经写了这一段：`window.showSaveFilePicker = undefined` → `Ctrl+S` → 等文件。A 的 T1/T2 还没合入（`src/` 本轮无改动），当前跑的是既有「无句柄 Ctrl+S 下载副本」分支；宿主事件同样触发，同样卡在 `FileFailed`。等 T1 合入后这段会自动走 `showSaveFilePicker` 缺失的降级分支，断言不用改；落盘仍受同一环境限制，届时按 UNVERIFIED/真机复验处理。

### 回归

```text
node scripts/host-smoke.mjs --fsa → 7/7 PASS（exit 0）
```

新 origin、argv、单实例、FSA 真实写盘都没退化；`readOnly` 字段加进注入 JSON 之后前端照常加载（前端此时不读它）。

---

## 收尾与遗留

- `.tmp/host-t5a`（快照）、`.tmp/host-t5a-dl`（弃用目录）都在 `.tmp` 下，已 gitignore；`host/bin` 未与快照共用。
- 未 commit；`Sidelight` 进程 0。
- 遗留：① 文件真正落盘与真实 SaveFileDialog 待真机复验；② 集成段待 A 组 T1 合入后重跑 `node host/download-probe.mjs`（断言已就位）；③ T5b 未开始，等放行。

---

## T5b（不依赖 A 的部分）—— 完成

| # | 改动 | 结果 |
| :--- | :--- | :--- |
| 1 | `AGENTS.md` §3/§5/§6/§7：图落 `shots/round-NN/`、安装包步骤改 Windows 流程、§6 改成 0.17.0 桌面应用（新建/另存为留 `[T1/T2 后确认]`）、§7 改三处交接 | 负向断言 0 命中；`per-user`/`安装器`/`CHANGELOG` 命中 |
| 2 | `README.md`：B1–B10 全部落地（CHANGELOG 链接、删重复视图句、不能做什么补新建占位与 `.md` 关联、中文输入法未验、FCP 统一 304 ms、跑起来加宿主与打包命令、目录树补 host/packaging/scripts/docs/iteration/release、技术决策加 ADR-0004/0005、下一步改掉已完成项） | `0.16.4`/`再套 Tauri 壳`/重复视图句 0 命中 |
| 3 | `docs/CHANGELOG.md` 0.17.0：删 0.16.4–0.16.9 引用、补货币不吞字/应用图标/171 条/未验项、ADR-0005 与打包说明加链接 | 0.16.4–0.16.9 0 命中，四条正向命中 |
| 4 | `.github/workflows/ci.yml`：加 `windows-host`（`windows-2022`、SDK/NSIS 版本+SHA256、build → host-smoke → installer → 校验和 → upload-artifact；首次 `continue-on-error: true` 不阻塞）与 `install-verify`（仅 `workflow_dispatch`） | `windows-2022`/`WV2_SHA256`/`NSIS_SHA256`/`installer.ps1`/`upload-artifact` 各命中 |
| 5 | `packaging/README.md`：删「拒写」过期说法，沙箱三条限制改成 TEMP 不可写、HKCU 不可观测、WebView2 下载写盘受限 | 「拒写」0 命中 |
| 6 | `packaging/installer.ps1`：硬线 840,000 → **850,000**，删 `$threshold = $p + 10000` 死代码；未重打安装包 | `850000` 命中、无 `threshold` |
| 7 | `docs/iteration/round-04/shots-untrack.txt`：37 个零引用截图路径，一行一个，**未执行任何 `git rm`** | 37 行；`git ls-files shots` 仍 132 |

门禁：`npm test` exit 0；上述 `Select-String` 全部达标。

待 A：README/AGENTS 的 `[T1/T2 后确认]` 两处、CHANGELOG 新能力条目、`download-probe.mjs` 的集成段，等 A 组 T1/T2 与根代理放行后再改。
---

## T5b 收尾（A 组 T1–T4 PASS 后）—— 完成

**最终产物（根代理重建）**：`dist` 1,406,633 B；便携 zip 907,266 B，SHA256 `6E523A4C87488558ED032711C4A79A87394BC7EEB7FC217E713A826077AA54BA`；NSIS setup 829,472 B，SHA256 `89FEC195064742D5C8DD77132933598AA0086E87AE2F3D7DA920078732EF2EBC`；硬线 850,000，余量 20,528 B。

| # | 改动 | 结果 |
| :--- | :--- | :--- |
| 1 | `AGENTS.md` §6 与 `README.md` 的 `[T1/T2 后确认]` 换成实际能力：文件菜单（新建/另存为/打开文件/打开文件夹）、树头「＋ 新建文件」、示例徽标、无句柄保存走系统保存对话框、保存成功持久提示、只读打开横幅、源码模式导出取当前内容；README「不能做什么」删掉「没有新建与另存为」，「下一步」改成中文输入法与 `.md` 关联 | 占位 0 命中；README/AGENTS 正向断言命中 |
| 2 | `docs/CHANGELOG.md` 0.17.0：补 5 条新增/修复、体积 1,406,633 B、setup 829,472 B / zip 907,266 B 与两个新 SHA256；测试 16 文件 171 条 | `0.16.4–0.16.9` 0 命中；四条正向命中 |
| 3 | `README.md` 体积：打包产物 1,406,633 B、安装包 829,472 B、便携 zip 907,266 B；`docs/adr/0004` 载荷改 **2,398,413 B**（可执行与 SDK 991,780 + www 1,406,633）、`webview2-data` 15,267,266 B、zip/setup 新字节与新 SHA256 | 复算一致 |
| 4 | 集成段：`node host/download-probe.mjs`（先 `host/build.ps1` 拷新 dist）——`showSaveFilePicker=undefined` 下 `Ctrl+S` 走降级，宿主 `DownloadStarting` 触发并 `handled=true mode=env`；落盘仍 `FileFailed`（沙箱） | 保存降级段 **UNVERIFIED（落盘）**，事件与 Handled 已证 |
| 5 | 重跑：文档断言全过；`npm test` exit 0；`node packaging/verify-installer.ps1` exit 0（PASS：运行时/安装写入/装后启动 title=`Sidelight` + `http://127.0.0.1:47821` 200/卸载清理/用户数据保留/不写 HKLM；UNVERIFIED：HKCU 与开始菜单在本沙箱不可观测） | 通过 |

集成段结论：A 的 T1 落地后，保存降级链路（picker 不可用 → 下载 → 宿主 DownloadStarting）已经打通到宿主层；唯一未验的是 Chromium 在沙箱里写下载文件（`reason=FileFailed`），与第 3 轮同类环境限制，真机复验即可。