# 第 08 轮 发布与安装发现（ship）

侦察对象：`D:\Documents\SidelightProgram`，HEAD `94ceeda`（`d65164a` 之后只有文档提交），工作树只有未跟踪的 `shots/round-08/`。`package.json` 版本 0.20.0。本轮只读产品文件；没有跑 `npm run build`，没有启 dev server，没有装依赖，没有写注册表，没有改 `src/`、`host/`、`packaging/`。

方法：

1. 读指定文件、`src/App.tsx` 保存路径、`host/Program.cs` 窗口与写回逻辑、`packaging/*.ps1`。
2. 用 `git diff --numstat d5e7b8d d65164a` 量第 07 轮真实改动，校准「源码字节 → `dist` 字节 → 安装包字节」的换算率。
3. 在 `.tmp/r8-ship/` 做一次 `Invoke-WebRequest` 写盘探测，验证 CI 的 WebView2 下载步骤在干净 runner 上会不会失败（命令与输出见 S1）。
4. 查 GitHub 官方文档确认 `needs` 在依赖 job 失败时的行为（S1）。

没有截图：ship 视角的证据是字节数、退出码、文件行号与命令输出，不是界面。

## 字节基线（实测，2026-11-15）

| 项 | 值 | 证据 |
| :--- | ---: | :--- |
| 版本 / HEAD | 0.20.0 / `94ceeda` | `package.json:3`、`git log --oneline -3` |
| `dist` 总计 | 1,389,367 B | `Get-ChildItem dist -Recurse \| Measure-Object Length -Sum` |
| 主 JS `index-Gtf_lquI.js` | 1,119,687 B | `dist/assets/` |
| CSS | 54,521 B | `dist/assets/index-B2L3wcEC.css` |
| 安装包 0.20.0 | 799,631 B | `release\Sidelight-0.20.0-win-x64-setup.exe` |
| 安装包硬线 | 850,000 B | `packaging/installer.ps1:4`、`:92` |
| **硬线余量** | **50,369 B** | 850,000 − 799,631 |
| 便携 zip 0.20.0 | 876,034 B | `release\Sidelight-0.20.0-win-x64-portable.zip` |
| zip 门槛 | 940,000 B | `packaging/portable.ps1:15` |
| 宿主载荷（五件） | 1,002,020 B | `host\bin` 的 exe + 2 dll + loader + config |
| 安装包 / 载荷 | 33.4% | 799,631 / 2,391,387 |
| 测试 | 16 文件 188 条 | `package.json` scripts、`AGENTS.md:70` |

## S1 `windows-host` 本轮不能设必过：至今没有 remote，且首跑大概率被 `.tmp` 目录挡死（高）

**证据**

1. **没有 remote，所以不可能跑过。** `git remote -v` 输出为空；`.github/workflows/ci.yml` 从 `cb36110`（第 01 轮）就在仓库里。没有 push 目标就没有 GitHub Actions 运行记录。`docs/iteration/STATE.md:88` 记「真实仓库地址与署名等对外信息，首发前由产品负责人最终确认」，说明推远端本身是对外动作，不是本轮代理能自己决定的。
2. **首跑会在 WebView2 步骤失败。** `.gitignore:8` 忽略 `.tmp/`；`ci.yml:55-61` 先 `actions/cache`（首跑 miss，不会创建目录）；`ci.yml:66` 直接 `Invoke-WebRequest -OutFile .tmp/wv2.zip`，前面没有 `New-Item`。本机复现（Windows PowerShell 5.1；CI 用 pwsh 7，走同一个 .NET 文件写入 API，预期相同，未在 pwsh 7 实跑）：

   ```text
   命令：Invoke-WebRequest -Uri 'https://example.com' -OutFile '.tmp\r8-ship\no-such-dir\probe.html' -UseBasicParsing
   输出：ERR: 未能找到路径"D:\Documents\SidelightProgram\.tmp\r8-ship\no-such-dir\probe.html"的一部分。
   ```

   即 `-OutFile` 不会创建父目录。对照 `ci.yml:74-76` 的 NSIS 步骤先 `New-Item -ItemType Directory -Force .tmp/nsis`，只有 WebView2 步骤漏了。修法 1 行：在 `ci.yml:65` 前加 `New-Item -ItemType Directory -Force .tmp | Out-Null`。
3. **NSIS 预下载本身没问题。** `ci.yml:72-79` 只下载并校验 zip，`packaging/installer.ps1:32-38` 自己会解压到 `.tmp/nsis/nsis-3.11`，所以不要删这两步，也不要在 CI 里再解压一次。
4. **`continue-on-error: true` 只保流程颜色，不保证下游能跑。** `ci.yml:42` 让 host 失败时整次 run 仍为绿；但 `install-verify` 有 `needs: windows-host`（`ci.yml:105`）。GitHub 文档：依赖 job 失败或跳过时，下游 job 默认跳过，除非用 `always()`（[Using jobs in a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs#defining-prerequisite-jobs)）。job 级 `continue-on-error` 是否让 `needs` 视为成功，官方文档没有明说，社区两种说法都有；就算它放行，host 红的 run 里也没有可用 artifact。结论：host 红时 `install-verify` 不可依赖，这是可接受的，但必须在计划里写明。
5. **其余首跑风险，未验证：** SourceForge 下载可能被限流/改链（失败点是哈希不符，`ci.yml:79`）；`host-smoke.mjs` 会启动 WinForms 窗口、用 CDP 9333 连接并写 `shots/round-01`，在无交互桌面的托管 runner 上能否跑通没验过；`playwright-core` 走 `connectOverCDP` 不需要本地浏览器二进制，这一点不是风险。

**影响**

本轮把 `windows-host` 设成必过 = 把一个从未运行、且首跑大概率红的 job 设成合并门。所有 PR 会一直红，团队会学会忽略 CI。

**建议**

- 本轮**不设必过**，保留 `continue-on-error: true`；同时修掉 `.tmp` 这一行，让首跑有机会绿。
- 首跑用 `workflow_dispatch` 手动触发（`ci.yml:6` 已允许），不要等 push。连续 3 次绿后再删 `continue-on-error`（`ci.yml:41` 的注释本来就是这么写的）。
- 首跑失败时的降级顺序（按优先级）：
  1. 只在「下载工具」步骤失败：加 `New-Item`；仍失败就把 SDK/NSIS 作为 release artifact 或 actions cache 预先上传，CI 只校验哈希。
  2. 只在 `host-smoke` 失败（无桌面/WebView2）：拆 job——`windows-build`（build host + installer + upload）可先设必过，`windows-smoke`（GUI）继续 advisory。
  3. 只在 `install-verify` 失败：它本来就只在 `workflow_dispatch` 跑，保持手动，不阻断 PR。
  4. 全绿但耗时超 25 分钟：把 SDK/NSIS 缓存 key 固定（已有），或只在 tag/手动时出安装包，PR 只跑 `gate`。
- `install-verify` **仍只 `workflow_dispatch`**（`ci.yml:103-104`）。理由：它写 HKCU、装/卸真实软件，属发布前检查，不是 PR 检查；每次 push 都跑会拖慢并污染 runner 状态。等 host 稳定绿、仓库公开后，再考虑在 tag 发布流程里自动跑它。

**难度** S（1 行修复 + 决策）；拆分 job 是 M。

## S2 自动保存 + 关闭保护 + 最近文件是功能，版本应为 0.21.0；关闭保护还必须改宿主（高）

**证据**

- 语义化规则：`AGENTS.md:58`「修复 +0.0.1，功能 +0.1.0，破坏性 +1.0.0」。
- 三项都是**新增用户可见能力**：`docs/typora-gap.md:62` 记「最近文件 | 无」；`src/App.tsx` 全文 `beforeunload` 匹配数为 **0**（`Select-String -Path src\App.tsx -Pattern 'beforeunload'` → 0 条），浏览器关页没有任何保护；宿主只有 `form.FormClosed` 日志（`host/Program.cs:131`），**没有 `FormClosing`**，点 × 或 Alt+F4 立即关。
- 自动保存今天只有「草稿」：`src/App.tsx:578-610` 在 `onUpdate` 里写 localStorage，并在 800 ms 后写 `.sidelight/drafts`（`:603-608`），不是写回文件；`docs/typora-gap.md:31` 把「自动保存与草稿恢复」记成「有」，指的是草稿恢复，容易被读成自动保存，文档要改（见 S4）。
- 关闭保护不是纯前端活：宿主必须加 `FormClosing`（`Program.cs:109-133` 是窗口创建段），否则「宿主窗口关闭也要问」无法实现。这会让 `Sidelight.exe` 变字节、安装包必须重打——0.20.1 这种补丁号会低估改动范围。
- 已有可复用件：`window.__slState.dirty`（`App.tsx:469-472`）与宿主的 `ReadDirtyAsync`（`Program.cs:1061-1091`）。宿主关窗确认最省的实现是**宿主原生 MessageBox**：`FormClosing` 里 `e.Cancel = true` → 读 `__slState.dirty` → 弹「保存并关闭 / 放弃并关闭 / 取消」（Yes/No/Cancel），Yes 发 `postMessage` 保存、等回包（最多 10 s）再 `Close()`，页面未加载完就直接关。约 40 行 C#，前端零改动。
- 反方论点：关窗丢改动本身是数据丢失缺陷，可以按修复发 0.20.1。但同轮还带两个明确的新功能与一个新设置项，按 `AGENTS.md:58` 取高者，仍是 0.21.0。

**建议**

- 版本 **0.21.0**。`package.json:3` 改版本；`installer.ps1` 与 `verify-installer.ps1` 从 `package.json` 读版本，产物名自动变，不需要手改脚本。
- 关闭保护优先用宿主原生对话框（含「保存并关闭」）。浏览器路径加 `beforeunload`，但提示文案由浏览器控制、不能自定义中文，验收只断言「会拦」。
- 自动保存只在「有可写句柄」时开：宿主文档（`hostDoc.writable`）或另存为拿到的 `saveTargetRef`。示例文档、argv 只读、无句柄一律不自动保存，避免把「下载副本」变成默认行为。
- 自动保存必须复用 `requestSave` 的差异门（`App.tsx:1691-1716`），且**不能弹确认框**：`losses.length > 0 && !saveWarned` 时暂停自动保存并给持久提示「这篇文档有会改写的写法，自动保存已暂停，Ctrl+S 手动保存」。

**难度** M（前端 3 项）；宿主关窗 M（约 40 行 C# + 冒烟脚本加一条）。

## S3 体积余量够：预计安装包 +1.6–2.4 KB，JS +4–6 KB；50,369 B 有约 20 倍余量（中）

**换算率（用第 07 轮实测校准，不是拍脑袋）**

- 第 07 轮：`d5e7b8d → d65164a`，`src` 净 +508 行（App.tsx +203/−116、SaveDialog +58/−20、risk.ts +320、styles.css +63，`diff.test.ts` 81 行不进 `dist`），约 17.3 KB 源码。
- 同期 `dist` 1,382,298 → 1,389,367 = **+7,069 B**（41% 源码字节）；安装包 794,843 → 799,631 = **+4,788 B**，减去关联组件页实测 +2,656 B（第 07 轮 S4 对照编译），前端部分 **+2,132 B**（约 12.3% 源码字节，约 30% `dist` 增量）。
- 模型：`dist` 增量 ≈ 源码 × 0.41；安装包增量 ≈ 源码 × 0.12–0.13。

**本轮估算**

| 改动 | 源码量 | `dist` 增量 | 安装包增量 |
| :--- | ---: | ---: | ---: |
| 自动保存（App.tsx 90–130 行 + settings.ts 10 行 + SettingsDialog 15 行 + StatusBar 8 行） | 5–6.5 KB | 2.0–2.7 KB | 0.6–0.8 KB |
| 最近文件（新 `lib/recent.ts` 60–80 行 + FileMenu 40–50 行 + App 接线 30–40 行 + CSS 20 行） | 5.5–7 KB | 2.3–2.9 KB | 0.7–0.9 KB |
| 宿主关窗保护（Program.cs 30–50 行，exe 1–2 KB） | 1.5–2.5 KB | — | 0.3–0.7 KB |
| **合计** | **12–16 KB** | **JS +4–6 KB，CSS +0.5–1 KB** | **+1.6–2.4 KB** |

**结论**

- 50,369 B **够**，约 20 倍余量。0.21.0 预计 801,200–802,000 B，之后余量仍约 48 KB。
- 预算写法（进 plan，可执行）：安装包 **≤805,000 B** 为通过；820,000 B 为内部预警（打包含这两条打印）；850,000 B 硬线不动。`portable.ps1:15` 的 940,000 B 不动。
- 主 JS 预计 1,124,000–1,126,000 B，离 `chunkSizeWarningLimit: 1200`（1,228,800 B）还有约 100 KB，不需要动构建配置。
- 真正的风险不是字节，是范围膨胀：自动保存「历史版本/备份文件/每分钟快照」或最近文件「显示完整路径/缩略图」会在一天内吃掉 10–20 KB。plan 里把这三项之外的东西明确写成不做。

**难度** S（按预算执行）。

## S4 文档：README 两节、AGENTS §6、差距表与一处隐私说明都要改，否则会写出假承诺（中）

**证据**

- `README.md:32-36` 讲新建/另存为/保存/草稿，**没有任何自动保存或关闭保护**；`README.md:38-48` 的「现在不能做什么」也没提「关窗可能丢改动」。
- `README.md:35` 说草稿「保存成功后删草稿」，自动保存上线后要写清「自动保存写的是原文件，草稿只是兜底」，否则用户不知道磁盘上哪份是最新。
- `AGENTS.md:70` 仍写「CI 只在 Linux 跑 build + test；Windows 宿主与安装包尚未进 CI」——`ci.yml:37-100` 已有 `windows-host`，准确说法是「已写、未首跑」；同段功能清单没有自动保存/关闭保护/最近文件。
- `AGENTS.md:72` 未验清单没有本轮新增项。
- `docs/typora-gap.md:31` 把「自动保存与草稿恢复」记成「有」（实际只有草稿恢复）；`:62` 最近文件「无」。本轮做完要改成「自动保存（写回原文件，可关）+ 草稿恢复」与「最近文件：有，8 条，可清除」。
- 隐私：`README.md` 没有隐私节；只有 `SettingsDialog.tsx:41` 一句「密钥只存在这台机器的本地存储里，不会上传」。最近文件要存路径，必须有一句公开说明，否则发布说明里「不上传」缺依据。

**建议**

- `README.md`「现在能做什么」加 3 条（放在第 34 行保存那段之后）：
  1. 「自动保存：有可写落点时，停笔约 1.5 秒自动写盘，状态栏显示『已自动保存 HH:MM』；设置里可关。输入法组合、要改写的写法未确认、文件被外部修改时不写。」
  2. 「关闭保护：浏览器关页或宿主关窗时，有未保存改动会先问；宿主给『保存并关闭 / 放弃并关闭 / 取消』。」
  3. 「最近文件：文件菜单列出最近 8 个，可清除；文件不在了会给提示，不会假装能打开。」
- `README.md`「现在不能做什么」加 1 条：「自动保存遇到文件被占用、只读、网络盘、浏览器重新授权时还没验；Windows 注销/关机无法可靠拦截。」
- `README.md:40` 安装包名改 `0.21.0`；`:54` 与 `:65` 的体积/校验和改成「见 CHANGELOG 0.21.0」（单一来源，见 S5）；`:72` 测试条数以 `npm test` 输出为准。
- 新增「数据与隐私」小节（放「依赖与体积」之后），3 句：
  - 「密钥、草稿、批注、最近文件都只存在这台机器；没有遥测，启动不联网。」
  - 「最近文件只存本地路径与最近打开时间，存在本机存储里，不上传；『清除最近文件』会立即删除整张列表。」
  - 「`.sidelight/` 里的草稿与批注跟着文档目录走；卸载不删 `%LOCALAPPDATA%\Sidelight`。」
- `AGENTS.md:70`：版本 0.21.0；功能清单加「自动保存、关闭保护、最近文件」；CI 句改成「CI 有 `gate`（Linux）与 `windows-host`（Windows，未首跑），安装验证仅手动」。
- `AGENTS.md:72` 未验清单加：宿主关窗确认真人路径、自动保存遇文件占用/只读/网络盘/权限过期、IME 组合期间自动保存、注销/关机拦截、最近文件跨重启与删除文件后的提示。
- `packaging/README.md:56-57` 预算行更新到 0.21.0 实测（硬线仍 850,000，关联 +2,369 B 的历史保留）。

**难度** S（纯文档，30–40 分钟）。

## S5 发布清单：0.21.0 必须按「dist → host → installer → portable → verify」重打，字节与 SHA 只写一处（中）

**证据**

- 顺序有硬依赖：`host/build.ps1:59` 把 `dist` 复制进 `host/bin/www`；`packaging/installer.ps1:9-26` 同时要求 `host\bin` 五件与 `dist\index.html`；`portable.ps1` 用同一份 `host/bin`。先打安装包再改 `dist`，产物就是旧前端。
- 关闭保护改 `Program.cs`，所以 0.21.0 的 exe 会变；`installer.ps1:45-49` 用载荷字节算 `EstimatedSize`，数字会跟着动。
- 硬线与打印：`installer.ps1:4`、`:90`、`:92`（超 850,000 打印载荷占比并 `exit 1`）；`portable.ps1:15`、`:69`。两条门槛都不需要改。
- 字节/SHA 散点多，历史上已漂移过：第 07 轮同一 HEAD 重编比发布包小 176 B（第 07 轮 S5）。现在记字节的地方至少 5 处：`README.md:40`、`:65`、`docs/CHANGELOG.md:13`、`docs/iteration/STATE.md:52-55`、`packaging/README.md:57`。
- `verify-installer.ps1` 会静默装/卸并断言目录、HKCU 卸载项、开始菜单；本沙箱 HKCU 不可观测时，卸载项与快捷方式三条走 `Unverified`（`verify-installer.ps1:106-126`），不能当已验。

**0.21.0 重建顺序（根代理串行执行）**

1. `package.json:3` 改 `0.21.0`；`docs/CHANGELOG.md` 顶部加条目；README/AGENTS/STATE 的版本与体积占位改成 `[TBD]` 或「见 CHANGELOG」。
2. `npm run build`（全程只跑这一次，避免并发写 `dist/`）。
3. `powershell -ExecutionPolicy Bypass -File host\build.ps1`（编入关闭保护，复制新 `dist`）。
4. `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1`（记 `setup=` 字节与 `sha256=`）。
5. `powershell -ExecutionPolicy Bypass -File packaging\portable.ps1`（记 `zip=` 字节与 SHA）。
6. `powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1`（记 PASS 与 UNVERIFIED；本沙箱最多三条）。
7. 把两个产物的字节 + SHA256 写进 `CHANGELOG.md` 的 0.21.0 条目，只此一处；`README.md:54`、`:65` 改成指向 CHANGELOG；`STATE.md` 只写一行摘要。
8. 不提交 `release/`（`.gitignore:10` 已忽略）；0.20.0 两个包保留作回滚。

**验收口径**

- 安装包 ≤850,000 B（预算目标 ≤805,000 B）；zip ≤940,000 B；主 chunk <1,228,800 B。
- `dist` 增量与 S3 预算偏差 >3 KB 时，先写清原因再发，不抬硬线。
- 覆盖升级（0.20.0 装着的机器直接装 0.21.0）没验过，写 UNVERIFIED；NSIS per-user 同目录覆盖理论上可行，但卸载项/开始菜单是否重建要真人确认。
- **隐私声明要写「最近文件存本地」**：是。写进新增的「数据与隐私」小节，与「密钥/草稿/批注不上传」同一段；同时确认自动保存与最近文件没有引入任何网络请求（两条功能都只碰 `localStorage`/文件句柄/宿主 postMessage）。

**难度** S（按顺序执行）。

## 版本建议：0.21.0

- 结论：**0.21.0**，不是 0.20.1。三项都是用户可见的新能力，还带一个新设置项与宿主改动；按 `AGENTS.md:58` 的功能档走。
- 没有破坏性变更：`.sidelight` 缓存格式、宿主 `/__doc` 协议、`.md` 关联都不动，所以不是 1.0.0。
- 若实施中砍掉自动保存或最近文件、只留关闭保护，仍建议 0.21.0（宿主行为变更 + 新对话框），并在 CHANGELOG 只写实际做了的项。
- `CHANGELOG.md` 草稿（中文，日期 2026-11-15；方括号由 releaser 按 `installer.ps1`/`portable.ps1` 输出填）：

```markdown
## 0.21.0 — 2026-11-15

自动保存、关闭保护与最近文件。

- 自动保存：有可写落点时，停笔约 1.5 秒自动写盘，状态栏显示「已自动保存 HH:MM」；设置里可关。输入法组合期间、保存差异门未确认、文件被外部修改、没有可写句柄时不写；失败时状态栏给原因，改动保留，可重试。
- 关闭保护：浏览器关页与宿主关窗时，有未保存改动先确认。宿主在 `FormClosing` 里给「保存并关闭 / 放弃并关闭 / 取消」；页面尚未加载完成时直接关闭。
- 最近文件：文件菜单列出最近 8 个文档，可单个移除或全部清除；文件不存在时提示原因并可从列表移除。列表只存本机路径与打开时间，不上传。
- 隐私：新增「数据与隐私」小节；密钥、草稿、批注、最近文件都只在本机，没有遥测，启动不联网。
- 文档：README「能做什么 / 不能做什么」、AGENTS §6、`packaging/README.md` 与差距表同步更新。
- 测试：[N] 个文件 [M] 条。
- 体积：构建产物 [X] B；安装包 [Y] B（SHA256 `[...]`）、便携 zip [Z] B（SHA256 `[...]`）。
- 未验：宿主关窗确认的真人路径、自动保存遇文件占用/只读/网络盘/浏览器重新授权、输入法组合期间自动保存、Windows 注销/关机拦截、最近文件跨重启与文件删除后的提示、覆盖升级。
```

## 真人验收步骤（5 步，宿主里做）

前置：装 0.21.0，或直接跑 `host\bin\Sidelight.exe`（需要 `dist` 已复制进 `host/bin/www`）。准备一个可写目录和两个 `.md` 文件。

1. **自动保存写盘**：双击 `a.md` 打开，改一句话，等状态栏出现「已自动保存 HH:MM」；用记事本打开 `a.md`，确认这句已经写进去。
2. **关窗保护 + 保存并关闭**：再改一句，**1 秒内**点标题栏 ×（赶在 debounce 前）；必须弹确认；选「取消」窗口不关、正文还在；再关，选「保存并关闭」，重开 `a.md` 确认最后一句在。
3. **自动保存关掉也不丢**：设置里关自动保存；改一句后关窗，仍要弹确认（关闭保护不依赖自动保存）；选「放弃并关闭」，重开确认这句**不在**（证明是选择，不是静默丢）。
4. **最近文件**：分别打开 `a.md`、`b.md` 和另一个文件；文件菜单「最近文件」有这 3 条；重启宿主后仍在；在资源管理器里删掉其中一个，再点它，出现「文件不存在」类提示且能移除；点「清除最近文件」，列表空、重启后仍空。
5. **失败可见**：把 `a.md` 设只读（或放到网络盘），改一句等自动保存；必须出现失败提示且改动不丢；改回可写后手动 `Ctrl+S` 能成功。只读/网络盘做不了就记 UNVERIFIED。

## 优化机会（3 条）

1. **保存状态机抽成 hook**：`src/App.tsx` 118,869 B、3,032 行（非空 2,807），保存相关代码横跨 `finishSaved`（1527）、`performCommit`（1579）、`performSaveAs`（1638）、`requestSave`（1692）、`sendHostSave`（1748）、`hostSaveSuccess`（1781）。自动保存再往这里塞 100+ 行，会到 3,200 行。抽 `useDocumentSave`（输入 dirty/handle/hostDoc，输出 save 与 autoSave 状态）能降低这三项后续改动的回归成本；不改行为，纯重构。
2. **版本/字节/门槛单一来源**：`850000` 在 `installer.ps1:4` 与 `:92` 各写一次，`940000` 在 `portable.ps1:15`，字节与 SHA 散在 5 处（S5）。抽 `packaging/common.ps1` 放常量，README 改成指向 CHANGELOG，能消掉上一轮已经出现过的数字漂移。
3. **CI 与打包脚本去重**：`ci.yml:117-143` 的「装 → 断言 HKCU/开始菜单 → 卸 → 断言清理」和 `packaging/verify-installer.ps1` 是同一套逻辑的两份实现。让 CI 直接调 `verify-installer.ps1`（加 `-Ci` 开关跳过本沙箱专用重定向），少约 30 行重复，也保证两处断言不会一边改一边忘。顺带把 `.tmp` 创建放进同一个脚本，S1 的坑只修一处。

## UNVERIFIED 与限制

- **GitHub 首跑没发生**：仓库没有 remote，无法触发 Actions；`windows-2022` 在 2026-11 是否仍可用没有核实（`ci.yml:38` 的注释是推测）。`.tmp` 修复只是静态验证 + 本机 `Invoke-WebRequest` 行为复现，没在真实 runner 上跑过。
- **宿主关窗确认**：没有交互桌面，未实跑；`FormClosing` + `__slState.dirty` 的方案只做了静态设计。Alt+F4、任务栏关闭、注销/关机（`WM_QUERYENDSESSION`）三条路径行为不同，注销/关机可能不给确认时间，按「无法可靠拦截」写文档。
- **自动保存真实场景**：文件被占用、只读、网络盘、中文长路径、浏览器句柄重新授权（`requestPermission` 需要用户手势）都没验。宿主外部修改冲突由 `Program.cs:613` 的 mtime/size 检查兜底，前端怎么呈现未验。
- **IME**：没有输入法测试环境，组合期间自动保存只能写实现与代码审查，不能判 PASS。
- **最近文件**：跨重启、清除、文件删除后的提示都没实跑；浏览器与宿主是同一个固定 origin `127.0.0.1:47821`（ADR-0005），localStorage 应该共享，但未验。
- **体积数字**：S3 是预算，不是打包结果；最终以 `installer.ps1` 与 `portable.ps1` 打印为准。换算率来自第 07 轮单轮样本（±5 个百分点），新代码若大量复用已有函数会更省。
- 本轮没有改任何产品文件；`.tmp/r8-ship/` 只留一次 `Invoke-WebRequest` 探测。`shots/round-08/` 未新增截图（ship 视角无界面证据）。
