# 第 02 轮 · 发布、体积与优化 · 发现

侦察时间：2026-11-15 17:17–17:55（Asia/Shanghai）。只读侦察：只写本文件、`.tmp/`、`shots/round-02/`。
环境：Windows 11 22631、Node 24.21.0 / npm 11.19.0、无管理员、无 7-Zip、WebView2 运行时 157.0.4341.46。
应用：`http://localhost:5173`（dev，仅 `::1`）。CDP：`http://127.0.0.1:9224`。宿主 CDP：`9334`（本轮临时开）。
未跑 `npm run build`，未装系统级依赖，未写注册表，未改 `src/` 与 `host/`。

## 结论摘要

1. **便携 zip 现在就能出**：内容 2.24 MB，打成 zip **880,260 B（0.84 MB）**，.NET ZipFile 57 ms。三种打法的实测对比见 S1，7-Zip SFX 不划算。
2. **图标不需要等设计稿**：用系统 `csc.exe` + `System.Drawing` 生成 16/24/32/48/256 的多尺寸 `.ico`（23,724 B、96 ms）。**关键坑**：纯 PNG 条目的 `.ico` 在 .NET 宿主里解不出正确颜色（S2）。
3. **冷启动有一个未解释的 2 秒下限**：窗口 106.6 ms 就可见，但页面 FCP 2,196 ms，而同机浏览器 FCP 288 ms（dev）/ 168–184 ms（prod，第 1 轮）。每条导航（含 reload）都慢约 2.0 s，不是首启效应（S3）。**这条不查清，安装包验收线定不下来。**
4. `.md` 关联在 HKCU 可做，但抢不到默认程序：UserChoice 有哈希保护（S4）。且"接管 .md"是用户看得见的能力，按 AGENTS.md 要产品负责人点头。
5. 仓库体积的 86.5% 是 `shots/`（4.41 MB / 61 个跟踪文件）；ADR-0004 的 bin 读数两种口径都已过期；README 有一整段事实错误；CI 大概率能跑，但缺 3 项（S5）。

---

## S1 便携 zip：可做，推荐 .NET ZipFile；7-Zip SFX 不划算

**dry-run 清单**（`.tmp/r2-portable/stage/Sidelight`，28 个文件，**2,351,293 B = 2.24 MB**）

| 项 | 文件 | 字节 | 进 zip | 进 git |
| :--- | :--- | ---: | :--- | :--- |
| 宿主 | `Sidelight.exe` | 15,872 | 是 | 否（`host/bin/` 已忽略，`.gitignore:9`） |
| SDK 程序集 | `Microsoft.Web.WebView2.Core.dll` | 703,328 | 是 | 否 |
| SDK 程序集 | `Microsoft.Web.WebView2.WinForms.dll` | 38,792 | 是 | 否 |
| 加载器 | `WebView2Loader.dll` | 194,912 | 是 | 否 |
| 前端 | `www/`（`dist` 22 个文件） | 1,392,880 | 是 | 否（`dist` 已忽略） |
| 许可 | `LICENSE` | 1,079 | 是 | 是 |
| 说明 | 需新写 1 页用户 `README.txt`（本轮用 `host/README.md` 占位，4,430 B） | ≈4,430 | 是 | 是 |
| **合计** | | **2,351,293** | | |

**三种打法实测**（同一份 2,351,293 B 内容，本机，`.tmp/r2-portable/`）

| 打法 | 产物 | 用时 | 条目名分隔符 | 备注 |
| :--- | ---: | ---: | :--- | :--- |
| `Compress-Archive -CompressionLevel Optimal` | 880,820 B | 875 ms | **反斜杠**（`Sidelight\LICENSE`） | PS 5.1 只有 Optimal/Fastest/NoCompression，没有 level 9 |
| `.NET ZipFile::CreateFromDirectory(..., $true)` | **880,260 B** | **57 ms** | **反斜杠**（`Sidelight\LICENSE`） | .NET Framework 的已知行为，Windows 资源管理器/Expand-Archive 正常 |
| `tar.exe -a -c`（bsdtar / libarchive） | 882,116 B | 65 ms | **正斜杠**（`Sidelight/LICENSE`，31 条含目录项） | 唯一写出规范分隔符的内置工具 |
| `7zr a -t7z -mx=9`（本轮下载 602,624 B 的 7zr.exe 到 `.tmp`） | 745,768 B | 165 ms | — | 7zr **不支持写 zip**：`-tzip` 报 `Unsupported archive type`；只能当 SFX 载荷 |

**7-Zip SFX 的账**：载荷 745,768 B 比 deflate 少 134,492 B（−15%），但自解压模块本身通常 +130 KB 上下（**未核实**：本机无 7-Zip，SFX 模块要另下 extra 包，还要 LGPL 分发）。净收益≈0。代价是：多一个第三方二进制、自解压要写临时目录再启动（每次启动多一次解包）、SmartScreen/杀软对 SFX 更敏感。**不建议。**

**其它实测**

- 解包回来 28 个文件，与 staging 逐文件一致；从解包目录直接启动成功：`title='Sidelight'`、`webview2procs=18`、`nav completed success=True`（`.tmp/r2-coldstart-result.txt`）。
- Windows 11 自带解压即可，不需要管理员；`Expand-Archive` 把反斜杠条目正确建出 `Sidelight\www\assets\...`。
- **不要打进 zip 的**：`webview2-data/`（本次测量已 11,504,173 B，11.0 MB）、`host.log`（无上限增长，现在 10 KB）。
- 打包脚本必须在 staging 里断言 `webview2-data` 不存在，否则体积一次涨 11 MB。

**风险**

1. 未签名 exe 第一次运行会被 SmartScreen 拦（"Windows 已保护你的电脑"→更多信息→仍要运行）。zip 从网上下载会带 MOTW，解出的 exe 继承它，提示必现。三条发布路径都有这个代价（ADR-0004:44）。
2. 数据目录：`%LOCALAPPDATA%\Sidelight\WebView2` 写失败时退回 **exe 同级** `webview2-data`（`host/Program.cs:94-113`）。放 U 盘/只读目录时这 11 MB 写不进去，而失败分支只弹一个模态框、不退出（本轮 17:26:07 实测卡住：`INIT-FAIL System.IO.FileNotFoundException: www/index.html 不存在` 后 MessageBox 阻塞进程）。见 O1。
3. zip 条目用反斜杠，Windows 内解压没问题，macOS/Linux 解压会得到一个名字带反斜杠的平铺文件。目标平台是 Windows，可接受；若要跨平台，用 `tar.exe -a`。

**难度**：S（打包脚本约 60 行）

---

## S2 图标：多尺寸 .ico 可零下载生成；但纯 PNG 条目在 .NET 宿主里坏掉

**做法验证**：`.tmp/r2-icon/mkico.cs`（约 150 行 C# 5）用系统 `csc.exe` 编译（exit 0），96 ms 生成 7 个尺寸。图形直接沿用 `index.html:6-9` 的内联标记：`#2b6d64` 圆点，半径 6/16。

| 产物 | 条目 | 字节 | 结论 |
| :--- | :--- | ---: | :--- |
| `sidelight-png.ico` | 16/24/32/48/64/128/256，**全部 PNG** | 13,347 | **不可用**（见下） |
| `sidelight-mixed.ico` | 16/24/32/48 用 32bpp BMP DIB + 256 用 PNG | **23,724** | **可用**，也是 Windows 惯例 |

**关键证据**（`System.Drawing.Icon` 实测，本机 .NET Framework 4.8）

```text
== sidelight-png.ico ==
  size  16: got 16x16 center=32e13dff      # 期望 ff2b6d64，实际是垃圾色
  size  32: got 32x32 center=d13a3276
  size 256: FAILED 请求的范围扩展超过了数组的结尾。
== sidelight-mixed.ico ==
  size  16: got 16x16 center=ff2b6d64      # 正确
  size  32: got 32x32 center=ff2b6d64
  size  48: got 48x48 center=ff2b6d64
  size 256: got 48x48                       # Icon 读不了 PNG 条目，退回最大 DIB
```

结论：**纯 PNG 的 .ico 只能给资源管理器看，给 `form.Icon` 用会花屏或抛异常**。正确做法是"小尺寸 DIB + 256 PNG"的混合 ico。ICO 头已核对：5 个条目、偏移连续、第 5 条以 `\x89P` 开头（PNG 魔数）。

**工作量**：生成器 1 个文件、150 行、零下载、96 ms；产品侧只改两处——`host/build.ps1` 加 `/win32icon:sidelight.ico`，`host/Program.cs` 加 `form.Icon = new Icon(...)`（任务栏/Alt-Tab 才认）。合计 **0.5 人日以内**。

**需要设计稿吗？不需要（现在）**。理由三条：
1. 应用现有标识就是那个 `#2b6d64` 圆点（`index.html:6`），占位图标是它的加粗版，不是新发明的图形。
2. 占位图标是**一个命令重生成**的：换掉 `Render()` 里的形状即可，尺寸与容器不用重做。
3. 但"对外标识"属于品牌决策，首发前要产品负责人确认一次。给他两个问题就够：这个圆点是不是最终标记？大尺寸要不要字标？

**建议占位方案**：混合 ico（16/24/32/48 DIB + 256 PNG）+ 一张 512 PNG 备用；`shots/round-02/icon-placeholder-256.png` 是本轮生成的预览（青绿圆 + 浅色内环）。**难度**：S

---

## S3 冷启动：窗口 106.6 ms，页面 FCP 2,196 ms，有一个固定的 2 秒下限

**方法**：进程启动 → `Process.MainWindowHandle` 首次非 0（.NET 只返回可见顶层窗口），各跑 3 次取中位；页面侧在真实 WebView2 里开 CDP 9334 读 `performance`。启动用 `Start-Process -RedirectStandardOutput`：**不重定向时 GUI 子进程继承 stdout 管道，命令永远不返回**（本轮踩了两次，两次都要 kill）。

**窗口可见**（`.tmp/r2-coldstart-result.txt`，从便携 staging 目录启动）

| 轮 | windowMs | 标题 | WebView2 进程数 |
| :--- | ---: | :--- | ---: |
| 1 | 125.5 | Sidelight | 18 |
| 2 | 86.0 | Sidelight | 19 |
| 3 | 106.6 | Sidelight | 18 |
| **中位** | **106.6** | | |

**同一轮的宿主日志时间线**（`host.log`，毫秒级）

```text
17:27:28.425 start args=
17:27:28.611 controller ready runtime=157.0.4341.46   (+186 ms)
17:27:28.612 navigate https://sidelight.local/index.html
17:27:30.685 nav completed success=True               (+2,073 ms)
```

**宿主内页面指标**（CDP 9334，`page.evaluate(performance)`）

| 指标 | 值 |
| :--- | ---: |
| `responseEnd` | 6 ms |
| `domContentLoadedEventEnd` / `loadEventEnd` | 2,077 ms |
| `first-paint` | 2,096 ms |
| **`first-contentful-paint`** | **2,196 ms** |
| 资源数 / 传输 | 2（js、css）/ 0 B（本地虚拟主机） |
| JS 堆 | 7.3 MB |
| `ProseMirror` 节点 | 1 |
| reload 后（同进程，第 2、3 次导航） | FCP 2,040 / 2,040 ms，DCL 2,010 / 2,013 ms |

**对照**（同机同一时段）

| 场景 | DCL | FCP | 来源 |
| :--- | ---: | ---: | :--- |
| 宿主 WebView2（每次导航） | 2,077 ms | 2,196 ms | 本轮 |
| dev `localhost:5173`（cache off，新建上下文） | 164 ms | 288 ms | 本轮，64 个请求 |
| prod `localhost:5199`（第 1 轮） | 77–81 ms | 168–184 ms | `docs/iteration/round-01/findings-ship.md` S4 |

机器没变慢（浏览器基线复现了第 1 轮的数字），所以 **2 秒是宿主侧的真实开销**：`responseEnd` 6 ms 之后到 DCL 之间有约 2.07 s 的空白，而 reload 也一样，排除"首次创建 profile"的解释。已知它不在 CDP 上：不设 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` 的 3 次窗口测量里，`navigate → nav completed` 同样稳定在 2.07 s。**根因未定位**，候选（按怀疑度）：渲染进程被当作后台窗口节流、虚拟主机映射的首字节之外有 IPC 延迟、`GetPixel` 无关；需要在宿主里做 A/B（最小空白页 vs 应用页、Windows 焦点前后、`--disable-gpu`）。

**对验收线的影响**：现在能承诺的只有"窗口 ≤ 300 ms"。页面内容当前 2.2 s，达不到"轻量"的产品底线；在根因查清前不要写"冷启动 < 1.5 s"这种验收线。建议本轮验收线写成两条：**窗口可见 ≤ 300 ms（已达标：106.6 ms）**、**宿主 FCP 记为基线 2,196 ms，下一轮必须降到 ≤ 1,000 ms 或给出根因**。

**难度**：S（测量已固化在 `.tmp/r2-coldstart2.ps1` + `.tmp/r2-fcp.mjs`）；根因定位 M

---

## S4 `.md` 关联：HKCU 能注册，但抢不到默认程序；卸载要手动清

**本机现状（只读，本轮实测）**

```text
HKCU\...\Explorer\FileExts\.md\UserChoice   不存在
OpenWithProgids                              空
OpenWithList                                 a（记事本）, MRUList
HKCR\.md 默认值                              空（没有 Content Type）
HKCR\Markdown / HKCR\Sidelight.md            都不存在
```

这是"干净机器"的形态：现在写 `HKCU\Software\Classes\.md` 会立刻生效。但真实用户的机器上装了 VS Code / Typora / Obsidian 时几乎一定有 `UserChoice`，那时写 `HKCU\Software\Classes` **不生效**。

**方案（不写注册表，只描述）**

| 键（全部 HKCU，无需管理员） | 值 | 作用 |
| :--- | :--- | :--- |
| `Software\Classes\Sidelight.md` | `(default)` = `Sidelight Document` | 自定义 ProgId |
| `...\Sidelight.md\DefaultIcon` | `"<exe路径>",0` | 图标 |
| `...\Sidelight.md\shell\open\command` | `"<exe路径>" "%1"` | 打开动作（宿主已支持 argv，`host/Program.cs:32`） |
| `Software\Classes\.md\OpenWithProgids` | `Sidelight.md` = 空 | 让 Sidelight 出现在「打开方式」 |
| `Software\Classes\Applications\Sidelight.exe` | `FriendlyAppName`、`SupportedTypes\.md` | 让它在「打开方式 → 更多应用」里可被发现 |

**行为与风险**

1. **默认程序竞争**：Windows 10/11 用 `UserChoice` 决定双击行为，且该键带一个由扩展名+SID+ProgId+时间戳算出的哈希。程序自己写这个键会被系统判定无效（Win11 会提示"应用默认设置已重置"）。所以 portable zip **不能也不该**抢默认；正确做法是注册 ProgId + OpenWithProgids，然后引导用户**自己**在「设置 → 默认应用 → .md → 选择 Sidelight」点一次。要么就只提供"右键 → 打开方式"。
2. **便携路径会漂移**：`shell\open\command` 里是绝对路径。用户把文件夹从 `下载\` 挪到 `D:\Tools\`，关联就指向一个不存在的 exe（资源管理器报错，不静默回退）。对策：注册与反注册都做成脚本（`register-md.ps1` / `unregister-md.ps1`），写进 README.txt 的"移动文件夹后重新运行"。
3. **卸载清理**（portable 没有卸载器，只能给脚本）：删 `HKCU\Software\Classes\Sidelight.md`、删 `Applications\Sidelight.exe` 整棵、删 `.md\OpenWithProgids` 下的 `Sidelight.md` 值（**只删这个值，不要删整个键**，否则会毁掉别的编辑器的 OpenWith 项）、可选删 `%LOCALAPPDATA%\Sidelight`。若用户手动设过 UserChoice，脚本不要碰它。
4. **升级风险**：ProgId 名固定（`Sidelight.md`）才能跨版本覆盖；不要用带版本号的名字，否则每升级一次就多一个残留 ProgId。
5. **产品决策**：按 AGENTS.md 第 1 节，"要砍或加一个用户看得见的能力"必须回到产品负责人。接管 `.md` 双击就是这个级别的事——默认不接管、只出现在「打开方式」，是更省事的默认值。

**难度**：S（脚本）/ M（如果要处理 UserChoice 的各种失败态）

---

## S5 体积、仓库、CI 与文档：四处读数过期，shots 占仓库 86.5%

**体积分区（本轮实测）**

| 目录 | 文件数 | 字节 | MB | git 跟踪 | 进发布包 |
| :--- | ---: | ---: | ---: | :--- | :--- |
| `dist` | 22 | 1,392,880 | 1.33 | 否 | 是（作为 `www/`） |
| `host/bin` 合计 | 226 | 14,889,995 | 14.20 | 否 | 否 |
| ├ `webview2-data/` | 199 | 12,524,913 | 11.94 | 否 | **绝不** |
| ├ `host.log` | 1 | 10,043 | 0.01 | 否 | 否 |
| └ 载荷（exe+3 dll+`www`） | 26 | 2,345,784 | 2.24 | 否 | 是 |
| `shots`（磁盘） | 100 | 4,408,446 | 4.20 | **61 个 / 4,408,385 B** | 否 |
| `fixtures` | 8 | 1,565 | 0.0015 | 是（8） | 否 |
| `src` | 51 | 270,576 | 0.26 | 是 | 否 |
| `docs` | 20 | 194,783 | 0.19 | 是 | 否 |
| **git 跟踪合计** | 179 | **5,096,858** | **4.86** | | |

`shots` 占跟踪字节的 **86.5%**；`git count-objects -v` = 228 个松散对象、**4.58 MiB**。`.gitignore` 已排除 `dist`、`host/bin/`、`.tmp/`、`*.zip`、`.edge-profile*`，没有漏洞。

**用户数据会边跑边长**：本轮跑宿主约 12 次，`webview2-data` 从 11,504,173 B 长到 12,524,913 B（+1.0 MB / 12 次），文件数 196→199。`host/bin` 目录合计因此从 13.86 MB 变成 14.89 MB，而**载荷始终是 2,345,784 B**。这正好说明 ADR 里那个"bin 合计"为什么不可复现——同一个目录，读数取决于跑过几次宿主。

`shots` 的提交噪声本轮也复现了：`git status` 显示 ` M shots/acceptance.png`（验收脚本改写了已跟踪截图），加上 `?? shots/round-02/`（39 个新文件）。

**该进 git / 该进发布包**

| 内容 | git | 发布包 | 理由 |
| :--- | :--- | :--- | :--- |
| `src/`、`docs/`、`fixtures/`、`host/*.cs/*.ps1/README.md` | 是 | 否 | 源码与文档 |
| `dist/`、`host/bin/` | 否（已忽略） | 是（拷成 `www/`） | 构建产物，每版重生成 |
| `shots/` 里 `docs/qa-report.md` 与各轮报告引用的图 | 是 | 否 | 证据 |
| `shots/` 里其它截图 | **建议移出** | 否 | 现在 61 个全跟踪、4.41 MB，第 2 轮又新增 39 个文件 |
| `.ico`、`packaging/*.ps1`、`README.txt` | 是 | 是（脚本不进 zip） | 发布资产要可复现 |
| `release/*.zip` | 否（加 `release/` 到 `.gitignore`） | — | 产物 |

**ADR-0004 的 bin 读数**：`docs/adr/0004-webview2-host-before-admin.md:20` 写"`bin` 合计 3,165,041 B（含 SDK 程序集与 dist 副本）"。现在同一个目录 **14,889,995 B**（含 11.94 MB `webview2-data`），载荷 **2,345,784 B**。3,165,041 是第 1 轮字体修复**之前**的账（≈2.21 MB dist + 0.94 MB SDK）。这一条要改成两个数：**载荷 2.35 MB / 工作目录随运行时长（现在 14.9 MB，用户数据不计）**，并注明用户数据不进发布包。

**CI 能不能在 GitHub 上真跑**：能，且我找到了最容易翻车的那一项已经过了。

- `ci.yml:1-12`：`ubuntu-latest`、`node-version-file: .nvmrc`（内容 `24`）、`cache: npm`、`npm ci && npm run build && npm test`。语法与参数都有效。
- lockfile 与 `package.json` 同步：deps/devDeps 键逐个相同、139 个包、`npm ci --dry-run` **exit 0**（466 ms）。
- **跨平台原生依赖都在 lockfile 里**（这是 Vite/Rollup 时代最常见的 CI 翻车点）：`@rolldown/binding-linux-x64-gnu@1.2.19`、`lightningcss-linux-x64-gnu@1.33.0`、`@typescript/typescript-linux-x64@7.0.2`（TS 7 是原生编译版，本机只装了 win32-x64 包，lockfile 里有全部平台）。
- `node --experimental-strip-types` 在 Node 24.21 仍被接受（`strip-types ok v24.21.0`），`npm test` 的 15 条命令不会因参数被删而失败。
- 缺口 3 个：① 没有 `timeout-minutes` 与 `concurrency`（卡死会占 6 小时，连推 3 次会排队烧额度）；② 没有 `permissions: contents: read`；③ 宿主完全不在 CI 里——`windows-latest` 自带 .NET Framework `csc.exe`，可以加一个只跑 `host/build.ps1` 的 job，让"宿主能编"不再是本机一次性事实。
- 小瑕疵：`package-lock.json:3` 的 `version` 还是 `0.8.0`（`package.json` 是 `0.16.3`）。`npm ci` 不因此失败，但它说明 lockfile 很久没随版本号重生成。

**README 的事实错误**（逐条对过 `docs/roundtrip-report.md`）

| 位置 | 现在写的 | 实测 |
| :--- | :--- | :--- |
| `README.md:104` | "三类内容是真的被改坏：YAML frontmatter 被当成标题分隔线、行内 HTML 被转义成 `&lt;div&gt;`、脚注定义被删" | **三类都已逐字节保真**：`roundtrip-report.md:197` 03-footnotes「完全保真」、`:199` 05-html-block「完全保真」、`:201` 07-math「完全保真」；`:195` 01-obsidian-note 只差 1 个空行，不是 frontmatter 被改 |
| `README.md:106` | "修法是三个兜底……这三条还没做" | frontmatter 与 HTML 块按原文保留**已经做了**（`roundtrip-report.md:5` 描述的"当前应用"流程），只剩"未编辑不写盘"和"保存前展示变化"两条是部分做 |
| `README.md:5` | "当前仓库是第二版原型，跑在浏览器里，还没套 Tauri 壳" | 已有原生 WebView2 宿主并跑通五项验收（`README.md:60` 自己写了）；"跑在浏览器里"过期 |
| `README.md:39` | "没有 Tauri 壳，没有安装包" | 没有安装包对；"没有 Tauri 壳"会被读成没有原生外壳，应改成"没有安装器" |
| `README.md:102` | "3 / 7 完全保真" | 对，`roundtrip-report.md:13` 一致；**不要动** |
| `README.md:51` | "1,392,880 B、JS 1.0 MB、字体 256,168 B（19 个）" | 全对（dist 22 个文件、JS 1,087,724 B、19 个 woff2） |
| `README.md:88` | "`fixtures/markdown/` 7 个真实 .md 样本" | 对（7 个 .md；`fixtures/` 下另有 1 个 `sample-image.svg`） |

真正的剩余往返损失只有三类，README 该换的是这三条：引用式链接被改写成行内链接（`roundtrip-report.md:222-230`）、表格对齐/空格被重新格式化（`:209-220`）、空行差异（`:203-207`、`:232-236`）。

**体积门禁脚本的验收指标**（建议 `scripts/size-gate.mjs`，读文件系统，不依赖构建）

| 指标 | 现在 | 门禁 | 失败时 |
| :--- | ---: | ---: | :--- |
| `dist` 合计 | 1,392,880 B | ≤ 1,450,000 B | fail |
| 首屏 JS gzip | 336,179 B | ≤ 300,000 B（warn）/ ≤ 250,000 B（fail） | 分档 |
| 字体（19 个 woff2） | 256,168 B | ≤ 260,000 B | fail |
| 便携 zip | 880,260 B | ≤ 950,000 B | fail |
| staging 载荷 | 2,351,293 B | ≤ 2,400,000 B | fail |
| `shots/` 跟踪字节 | 4,408,385 B | ≤ 2,000,000 B | fail |
| git 松散对象 | 4.58 MiB | ≤ 6 MiB | warn |
| 窗口可见 | 106.6 ms | ≤ 300 ms | fail |
| 宿主 FCP | 2,196 ms | ≤ 1,000 ms（S3 查清前记 warn） | warn |

**难度**：S（读数与文档）/ M（shots 瘦身要改 61 个引用）

---

## 便携 zip 方案（planner 可直接执行的第一步）

**任务：新增 `packaging/portable.ps1`，产出 `release/Sidelight-0.16.3-win-x64-portable.zip`。**

只做打包，不构建前端、不改 `src/` 与 `host/`。前置是 `host/build.ps1` 已经跑过（`host/bin` 存在）。

```powershell
# 输入：host/bin/{Sidelight.exe, *.dll, www/}、dist/、LICENSE、packaging/README.txt、packaging/sidelight.ico
# 输出：release/Sidelight-0.16.3-win-x64-portable.zip + release/SHA256SUMS.txt
$stage = ".tmp/portable/Sidelight"
# 1) 清空 staging；断言 host/bin/www/index.html 存在
# 2) 拷 exe + 3 个 dll + www + LICENSE + README.txt（+ sidelight.ico 供宿主窗口用）
# 3) 断言 staging 里没有 webview2-data、没有 host.log（有就 throw，避免 +11 MB）
# 4) Add-Type System.IO.Compression.FileSystem
#    [IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
# 5) 打印：staging 字节数、zip 字节数、压缩比、SHA256；超过 950,000 B 就 exit 1
```

**为什么用 .NET ZipFile**：同样内容 880,260 B / 57 ms，`Compress-Archive` 是 880,820 B / 875 ms（慢 15 倍、大 560 B），两者都写反斜杠条目；`tar.exe -a` 写正斜杠但大 1.9 KB。零下载、零管理员。

**目录结构（zip 内）**

```text
Sidelight/
  Sidelight.exe
  Microsoft.Web.WebView2.Core.dll
  Microsoft.Web.WebView2.WinForms.dll
  WebView2Loader.dll
  sidelight.ico            # build.ps1 的 /win32icon 同时嵌进 exe，这份给运行时用
  README.txt               # 1 页：怎么用、WebView2 前提、SmartScreen、移动文件夹注意
  LICENSE
  www/
    index.html
    assets/                # 21 个（1 js + 1 css + 19 woff2）
```

**验收步骤（双击即可跑，8 条）**

1. 资源管理器右键 zip → 全部解压 → 得到 `Sidelight\` 目录（不许出现在 zip 里看到 `webview2-data`）。
2. **不弹 UAC**；双击 `Sidelight.exe`，≤ 1 s 出窗口，标题 `Sidelight`，正文是编辑器（不是白屏）。当前实测 106.6 ms。
3. 窗口里「打开文件夹」选一个真实目录，能列出 `.md`；打开一个文件，`Ctrl+S` 后磁盘哈希变化（第 1 轮已 PASS，装包后重验）。
4. 再双击一次 exe：仍只有一个窗口，第二个进程 exit 0。
5. 把 `sample.md` 拖到 exe 上（或命令行 `Sidelight.exe sample.md`）：正文是该文件内容，状态栏文件名正确。
6. 首次运行出现 SmartScreen：README.txt 写明「更多信息 → 仍要运行」；记录这是未签名的已知代价。
7. 检查解压目录没有多出 `webview2-data`（说明 `%LOCALAPPDATA%` 可写）；再看 `%LOCALAPPDATA%\Sidelight\WebView2` 是否生成。
8. 删除整个目录：除 `%LOCALAPPDATA%\Sidelight` 外不留垃圾；`register-md` 若跑过，用 `unregister-md.ps1` 清干净。

**同批要改的三个文件**（都很小）：`.gitignore` 加 `release/`；`host/build.ps1` 加 `/win32icon:`（图标）；`packaging/README.txt` 新写。

**不在这一步做**：`.md` 关联脚本（S4，等产品决策）、签名、自动更新、NSIS/WiX（要管理员）。

---

## 代码 / 资产优化机会（最多 3 条）

**O1 `ResolveUserDataDir` 的探针与回退顺序**（`host/Program.cs:94-113`，难度 S）
现状：先写固定名 `.write-probe`，失败就把 11 MB 用户数据写进 exe 同级。问题有三个：① 探针名固定，残留/并发会让可写目录被误判为不可写——本轮两次看到 `appdata unusable`（`host.log` 17:26:07、17:27:28），而同一时刻我手动往这个目录写文件是成功的；② 回退目标是 exe 同级，U 盘/只读目录直接失败；③ 初始化失败只弹模态框，不退出，脚本化场景会永久卡住。
做法：探针用 `Guid.NewGuid()` 名并 `try/finally` 删除；回退顺序改 `%LOCALAPPDATA%` → `%TEMP%\Sidelight\WebView2` → exe 同级；`catch` 里先 `Log("INIT-FAIL …")` 再 `Environment.Exit(1)`（保留 MessageBox 也可以，但不要让它成为唯一出口）。收益：便携包在只读介质上可启动，冒烟脚本不再挂死。

**O2 剪掉 KaTeX 里不用的字面**（`dist/assets/*.woff2`，难度 S/M）
现状：19 个 woff2 共 256,168 B。常用公式只用到 Main/Math/Size/AMS；Fraktur 22,664 B、SansSerif 34,588 B、Caligraphic 13,820 B、Typewriter 13,568 B、Script 9,644 B，合计 **94,284 B（占字体 37%）**，只有在特定 `\mathfrak`/`\mathsf`/`\mathcal`/`\texttt` 下才会请求。
做法：在 `scripts/vite-woff2-only.mjs` 旁边加一个 face 白名单，构建后删未列出的 woff2，并同步改 CSS 的 `@font-face`；门禁用 `fixtures/markdown/07-math.md` + 一轮人工抽查。收益：zip 约 −40 KB、dist −94 KB。风险：用了被剪字面的文档公式会退回系统字体（视觉差异，不丢内容）。

**O3 CI 加固 + 宿主 job**（`.github/workflows/ci.yml`，难度 S）
现状：单个 ubuntu job，无超时、无并发取消、无权限声明，宿主不在 CI。
做法：加 `timeout-minutes: 15`、`concurrency: {group: ci-${{ github.ref}}, cancel-in-progress: true}`、`permissions: contents: read`；再加一个 `windows-latest` job（`needs: gate`，下载 `dist` artifact 后跑 `powershell -File host/build.ps1`，断言 `host/bin/Sidelight.exe` 存在）。收益：把"宿主能编"从本机一次性事实变成每次 push 的事实，也顺带证明便携包的 5 个输入在干净机器上都拿得到。风险：Windows runner 的 `csc.exe` 路径同样是 `Framework64\v4.0.30319`，本机与 runner 版本可能不同（未验证 runner 上的 `csc` 版本）。

---

## 附：本轮证据文件（都在 `.tmp/`，可直接搬进 `scripts/`）

| 文件 | 用途 |
| :--- | :--- |
| `.tmp/r2-portable/` | staging、3 种 zip、解包运行副本 |
| `.tmp/r2-coldstart2.ps1` / `.tmp/r2-coldstart-result.txt` | 窗口冷启动 3 次取中位（含宿主日志时间线） |
| `.tmp/r2-fcp.mjs` / `.tmp/r2-fcp-reload.mjs` | 宿主内 FCP / reload 对比（CDP 9334） |
| `.tmp/r2-browser-baseline.mjs` | 浏览器 dev 基线复测（CDP 9224） |
| `.tmp/r2-icon/mkico.cs` / `.exe` / `sidelight-mixed.ico` | 多尺寸 ico 生成器与产物 |
| `shots/round-02/icon-placeholder-256.png` | 占位图标预览 |

## 未验证项

1. 宿主 2 秒下限的根因（候选：窗口节流、虚拟主机 IPC、GPU 路径）。测法：宿主里换成最小 `about:blank`+一个 `<h1>` 的页面，再逐步加回 js/css。
2. 7-Zip SFX 的实际体积（自解压模块 130 KB 是经验值，本机无 7-Zip，未下载 extra 包）。
3. GitHub `windows-latest` 上 `csc.exe` 的具体版本与 `host/build.ps1` 能否直接跑。
4. SmartScreen 在真实下载渠道（浏览器下载 zip）后的具体拦截文案；本轮 zip 是本机生成的，没有 MOTW。
5. 中文路径/长路径下从 zip 解压再启动（属缺陷 finder 的 S 项，本轮未测）。
