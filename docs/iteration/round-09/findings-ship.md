# 第 09 轮 · 发布与优化发现（ship）

侦察对象：`D:\Documents\SidelightProgram`，HEAD `875297e`（产品基线 `47e5602`，0.21.0）。
只读侦察，未改 `src/`、`host/`、`package.json`、`.github/`。本文所有字节均为本机实测。
本轮规格以 `docs/iteration/round-09/brief.md:12` 为准：宿主记最近 8 篇、页面不拿完整路径、可清除、浏览器隐藏。

**一句话结论**：版本 **0.22.0**；最多 +4.2 KB 安装包，46,665 B 余量够（11–22 倍）；CI 首跑还要再补一个 `release/` 创建，本轮**不设必过**；隐私必须写「只存本机路径与时间、不上传、可清除」。

---

## S1 CI：`windows-host` 首跑有两个一行级红点，本轮不设为必过（高）

### 红点 1：`.tmp` 缺失（brief 已提，已复现机制）

**证据**

- `.gitignore:8` 忽略 `.tmp/`，所以 GitHub 新 checkout 里**没有 `.tmp` 目录**。
- `.github/workflows/ci.yml:55-70`：先 `actions/cache@v4`（path `.tmp/wv2`、`.tmp/nsis`），再
  `ci.yml:65` 用 `Test-Path .tmp/wv2/lib/net462/...` 判断是否要下载；缓存未命中时走
  `ci.yml:66` 的 `Invoke-WebRequest -Uri ... -OutFile .tmp/wv2.zip`。
- 本机复现同样的写法（目标目录故意不存在）：
  `Invoke-WebRequest -Uri 'https://example.com' -OutFile '.tmp\r9-ship\no-such-dir\x.zip'`
  → `ERROR: 未能找到路径"...\x.zip"的一部分`。`-OutFile` **不会**创建父目录，整步抛错，job 失败。
- 对照：`ci.yml:74-77` 的 NSIS 步骤先 `New-Item -ItemType Directory -Force .tmp/nsis`，所以那一步不会这样红。
- 缓存命中时可以蒙过去（`.tmp/wv2` 被还原 ⇒ `.tmp` 存在），所以**只在首跑/缓存失效时红**，与 `STATE.md:80` 记的「首跑红」一致。

**一行修复**（加在 `ci.yml` 的 `Fetch WebView2 SDK (pinned)` 步第一行，与 NSIS 步对称）：

```yaml
      - name: Fetch WebView2 SDK (pinned)
        run: |
          New-Item -ItemType Directory -Force .tmp | Out-Null
          if (-not (Test-Path .tmp/wv2/lib/net462/Microsoft.Web.WebView2.Core.dll)) {
```

### 红点 2：`release/` 缺失，`makensis` 直接失败（brief 未提，本轮新发现）

**证据**

- `.gitignore:10` 忽略 `release/`，新 checkout 里没有该目录。
- `packaging/installer.ps1` **不创建** `release/`；`packaging/installer.nsi:21` 写死
  `OutFile "..\release\Sidelight-${APPVERSION}-win-x64-setup.exe"`。
- 本机用同一份 NSIS 3.11（`.tmp/nsis/nsis-3.11/makensis.exe`）做最小复现：输出目录不存在时
  `makensis` 退出码 **1**，stderr `Can't open output file`，且**不会**自动建目录（`.tmp/r9-ship/nsis-probe/`）。
- 对照：`packaging/portable.ps1:56` 有 `New-Item -ItemType Directory -Force -Path $release`，所以便携包脚本没这个问题；`installer.ps1` 漏了同一行。
- 后果：`.tmp` 修好之后，CI 会红在 `Build NSIS installer`（`ci.yml:88`），而且 `ci.yml:92` 的
  `Get-ChildItem release/Sidelight-*-win-x64-setup.exe` 也会跟着炸。

**一行修复**（`packaging/installer.ps1`，紧接 `$root` 定义之后，`+` 为新增）：

```powershell
$root = Split-Path -Parent $PSScriptRoot
+New-Item -ItemType Directory -Force -Path (Join-Path $root 'release') | Out-Null
```

> 这两行都在「发布脚本健壮性」范围内，可交给同一名 builder，不碰产品行为。

### 首跑步骤（根代理执行）

1. 落上面两行；本地先验一次：删掉空 `release/` 后直接跑 `packaging\installer.ps1`，应能出新包（不动 `dist`/`host/bin`）。
2. 推到分支，在 GitHub 用 `workflow_dispatch` 手动触发 **CI**（`ci.yml:6` 已有该触发器），只观察 `windows-host`。
3. 逐步核对：`npm ci` → `npm run build` → SDK 缓存/下载 → NSIS 下载 → `host/build.ps1`（`ci.yml:82`）→
   `host-smoke`（`ci.yml:85`）→ `installer.ps1`（`ci.yml:88`）→ Checksums（`ci.yml:90-94`）→ artifact（`ci.yml:96-100`）。
4. 红了只贴**失败步的日志**，不要先改代码猜：`windows-host` 剩下最可能的两个环境未知项是
   (a) runner 会话里 WebView2 能不能起窗（`scripts/host-smoke.mjs` 要连 CDP 9333 等 `.ProseMirror` 可见，`host-smoke.mjs:125,144`），
   (b) sourceforge 下载 NSIS 被限速/改页（`ci.yml:76`，随后 `ci.yml:78-79` 的 SHA 会抛）。
5. 绿一次后连跑 3 次（3 次 push 或 3 次 dispatch），再决定是否摘 `continue-on-error`。

### 本轮是否设为必过：**不设**

- `ci.yml:42` 的 `continue-on-error: true` 保留。理由：这个 job **一次都没在 GitHub 上跑过**；
  两处修复只是消除已知必然红，还剩上面两个环境未知项。现在改必过，会把 0.22.0 的合并卡在一件
  与本轮功能无关、且无法本地复现的事上。
- 必过的仍是 `gate`（`ci.yml:22-35`，Linux build + test）。
- 摘线的门槛写进 plan：**修复后连续 3 次 `windows-host` 绿 + 1 次 `install-verify` dispatch 绿**，
  然后删 `ci.yml:42` 这一行，并在 `AGENTS.md:70` 与 `STATE.md` 记「CI 已含 Windows 宿主与安装包，阻断」。
- 另注：`install-verify`（`ci.yml:102-106`）依赖 `windows-host` 的 artifact；`windows-host` 若挂着
  `continue-on-error` 却失败，artifact 不存在，`install-verify` 会跟着红。首跑只看 `windows-host`，先别同时 dispatch 全部 job。

**难度** S（两行 + 观察）。

---

## S2 版本：功能档，建议 0.22.0（中）

**证据**

- 语义化规则：`AGENTS.md:58`「修复 +0.0.1，功能 +0.1.0，破坏性 +1.0.0」。
- 本轮是三件**用户可见的新能力**：最近文件列表（`docs/typora-gap.md:62` 记「最近文件 | 无」）、
  点击重新打开、清除；再加宿主新协议与一份新本地文件。
- 宿主行为与磁盘格式有新增但**不破坏**旧数据：`.sidelight` 草稿/批注、`/__doc` 协议、`.md` 关联都不动，
  新增的只是 `%LOCALAPPDATA%\Sidelight\recent.json`，所以不到 1.0.0。
- 版本号只在一处：`package.json:3`；`installer.ps1:8`、`portable.ps1` 从它只读，产物名自动变。

**建议**：0.22.0。若实施中砍到只剩「浏览器隐藏入口」，降为 0.21.1 并在 CHANGELOG 只写实际做的项。

**CHANGELOG 草稿**（中文，日期 2026-11-16；方括号由 releaser 按脚本输出回填，只写一次，见 S5）：

```markdown
## 0.22.0 — 2026-11-16

最近打开：文件菜单列出最近 8 篇文档，点一下重新打开，可清除；只记本机路径与时间。

- 宿主记录最近 8 篇文档（完整路径、显示名、打开时间），写 `%LOCALAPPDATA%\Sidelight\recent.json`
  （UTF-8 无 BOM，临时文件 + 原子替换）；页面只拿到路径的哈希键、显示名与时间，
  `/__recent` 不返回完整路径、`Cache-Control: no-store`、只认 `Host: 127.0.0.1:47821`。
- 文件菜单在「打开文件夹…」下面内联「最近打开」：最新在最上，重复打开去重并置顶，
  超过 8 条丢最旧的；长文件名截断，悬停看全名。
- 点一行重新打开：文件还在就直接打开（走原有脏检查）；文件已移动或删除时给一条可操作提示，
  保留该行，不清空列表、不崩。
- 「清除」两步确认：清空列表并删除 `recent.json`；不碰文档、草稿与批注。
- 浏览器（没有宿主桥）不显示「最近打开」，也不写路径；README 写明「仅桌面版」。
- 隐私：最近文件只存本机路径与时间，不上传、不进正文、不进导出；清除立即删除整张列表。
- 测试 16 个文件 [TBD] 条；体积：构建产物 [TBD] B；安装包 [TBD] B（SHA256 `[TBD]`）、
  便携 zip [TBD] B（SHA256 `[TBD]`）。
- 未验：真人安装后最近列表跨重启、文件移动/删除后的提示、`recent.json` 写失败（只读目录或磁盘满）、
  多实例转发时的列表刷新、卸载后 `recent.json` 保留（按现有约定保留用户数据）。
```

**难度** S。

---

## S3 体积：预计 +2.1–4.2 KB，46,665 B 够，余量 11–22 倍（中）

### 现状（实测）

| 项 | 字节 | 出处 |
| :--- | ---: | :--- |
| 安装包 0.21.0 | **803,335** | `release/Sidelight-0.21.0-win-x64-setup.exe` |
| 硬线 | 850,000 | `packaging/installer.ps1:4,92` |
| 余量 | **46,665** | 850,000 − 803,335 |
| 便携 zip | 880,851（门槛 940,000） | `packaging/portable.ps1:15` |
| `dist` 合计 | 1,398,672（JS 1,128,204 / CSS 55,309） | `Get-ChildItem dist -Recurse` |
| 主 chunk 告警线 | 1,228,800（`chunkSizeWarningLimit: 1200`） | `README.md:57` |

压缩系数（从 zip 条目实测，`System.IO.Compression` 读 `release\...portable.zip`）：
JS 1,128,204 → 347,740（**30.8%**）；`Sidelight.exe` 70,656 → 29,207（**41.3%**）；CSS 55,309 → 13,673（24.7%）；
安装包/zip = 803,335 / 880,851 = **91.2%**（NSIS 的 LZMA 比 deflate 再好约 9%）。

### 本轮两个 spike（`.tmp/r9-ship/`，不进产品）

1. **前端 spike**：按 brief 写一版真实形状的实现（`recent-spike.tsx`，143 行：`RecentEntry`、`/__recent` 拉取、
   `recent-open`/`recent-clear` postMessage、截断、相对时间、空态、清除两步确认），用仓库自带
   `rolldown 1.2.19 --minify`（React external）打包：
   源码 4,530 B → **min 3,285 B**（72.5%）→ gzip 1,656 B。
2. **宿主 spike**：`spike-base.cs`（空 WinForms）3,072 B → `spike-recent.cs`（107 行 RecentStore：JSON 读写、
   8 条上限、去重、哈希键、清除）**9,216 B**，即 **+6,144 B** exe；gzip 增量 3,173 B。
   （同轮参照：第 8 轮 `host/Program.cs` +300 行，exe 64,512 → 70,656，也是 +6,144 B，见 `docs/iteration/round-08/impl-b.md:47`。）

### 预算

| 改动 | 源码量 | 产物增量 | 安装包增量 |
| :--- | ---: | ---: | ---: |
| 最近文件前端（FileMenu 60–80 行 + App 接线 30–40 行 + CSS 20–30 行） | 4–6 KB | JS +3.0–3.6 KB、CSS +0.4–0.8 KB | 0.5–1.3 KB |
| 最近文件宿主（`Program.cs` 100–140 行：存储、键、两条消息、一条 GET） | 4–7 KB | exe +4–7 KB | 1.6–2.9 KB |
| **合计** | **8–13 KB** | — | **+2.1–4.2 KB** |

- 校准口径（凭实测，不拍脑袋）：安装包增量 ≈ 新增原始字节 × 0.24–0.31。第 7→8 轮实测：
  `dist` 1,389,367 → 1,398,672（+9,305，`round-08/impl-b.md:46`）、exe 64,512 → 70,656（+6,144，`:47`），
  setup 799,631（`round-07/impl-b.md:77`）→ 803,335（`round-08/impl-b.md:46`）只 +3,704，比值 0.24。
- **预计 0.22.0 安装包 805,400–807,600 B**；发布后余量约 42–45 KB。
- 46,665 B **够**，是估算上限的 **11 倍**、下限的 **22 倍**。
- 预算写法（进 plan，可执行）：安装包 **≤810,000 B 通过**；**815,000 B 内部预警**；**850,000 B 硬线不动**。
  zip ≤940,000 不动；主 chunk 预计 ~1,131,700 B，离 1,228,800 还有约 97 KB。
- 真正的风险不是字节，是范围：缩略图、显示完整路径、MRU 20+、跨设备同步，任意一项都能吃掉 5–15 KB。plan 里把这几项写成不做。

**难度** S（按预算执行）。

---

## S4 隐私：README 缺「数据与隐私」节，最近文件必须先有公开说法（高）

**证据**

- `README.md` 全文没有隐私节：`Select-String -Path README.md -Pattern '隐私|不上传'` → **0 命中**；
  只有 `README.md:34` 说草稿「只存本机，不发网络」，`README.md:36` 说缓存位置。
- `README.md:43` 说密钥明文在 localStorage；`src/components/SettingsDialog.tsx:41` 有一句「密钥只存在这台机器的
  本地存储里，不会上传」，但那是设置对话框，不是发布文档。
- 本轮新增的是**路径**（比草稿更敏感）：必须写清存哪、谁能读、怎么删。`AGENTS.md:15` 也把
  「隐私声明」列为必须回到人的对外承诺项——**这句要产品负责人点头**，代码合并不等于可以发。
- 卸载不删 `%LOCALAPPDATA%\Sidelight`（`packaging/README.md:24`）：`recent.json` 也会留下，
  所以「可清除」必须写成用户能自己执行的唯一删除路径。

**建议：README 加三处（措辞可直接用）**

1) `README.md:34` 之后（「现在能做什么」）加一条：

> - 最近打开：桌面版「文件」菜单的「打开文件夹…」下面列出最近 8 篇文档，最新在最上，点一下重新打开；「清除」两步确认后立即清空。浏览器里没有宿主桥，不显示这一项。

2) 在 `README.md:53`「## 依赖与体积」之前新增一节（三句，替换句即下面三条）：

```markdown
## 数据与隐私

- 最近文件只存本机：完整路径、显示名与最近打开时间写在 `%LOCALAPPDATA%\Sidelight\recent.json`，不上传，不进正文、不进导出。页面只拿到路径的哈希键，拿不到完整路径。
- 「清除」立即清空整张列表并删除该文件；卸载不删这个目录（与草稿、批注一样），要彻底清掉就在卸载后手动删 `%LOCALAPPDATA%\Sidelight`。
- 草稿与批注在文档同级的 `.sidelight/`，密钥在浏览器本地存储；没有遥测，启动不联网，AI 请求只发你在设置里填的接口。
```

3) `packaging/README.md:24` 卸载段补一句（保持与 README 同一说法）：

> 最近文件列表（`%LOCALAPPDATA%\Sidelight\recent.json`）也保留；清除列表请用应用里「文件 → 最近打开 → 清除」，或卸载后手动删该文件。

**验收口径（可测）**

- `recent.json` 里只有路径、显示名、时间戳与哈希键，**没有正文**；`/__recent` 响应里**没有** `\` 或盘符
  （页面无完整路径）。用浏览器或 Trace 抓一份响应即可断言。
- 全仓 `grep -rn 'recent' src host | grep -i 'fetch\|http'` 只应命中宿主回环 `/__recent`，不得有外网地址。
- README/发布说明里出现的「不上传」必须与代码一致：本轮不得引入任何遥测或远程请求。

**难度** S（纯文档，但需产品负责人确认措辞）。

---

## S5 发布清单：0.22.0 必须按「dist → host → installer → portable → verify」重打，字节与 SHA 只写一处（中）

**证据（顺序有硬依赖）**

- `host/build.ps1:12-20` 先要求 `dist/index.html` 与 `.tmp/wv2`；`:59` 把 `dist/*` 复制进 `host/bin/www`。
  **先打安装包再改 `dist`，产物就是旧前端。**
- `packaging/installer.ps1:9-25` 同时要求 `host\bin` 五件与 `dist\index.html`；`:84-92` 打印字节、估算
  `EstimatedSize`、超 850,000 直接 `exit 1`。
- `installer.ps1:8` 从 `package.json` 只读版本，产物名自动变（`README.md:41` 的旧文件名要手改）。
- 字节/SHA 历史上已漂移：`CHANGELOG.md:39` 与 `:51` 两版都写「产物体积与校验和见 0.21.0」；现在记字节的地方至少 5 处
  （`README.md:55`、`:66`、`CHANGELOG.md:14`、`STATE.md:52-55`、`packaging/README.md:57`）。
- `verify-installer.ps1` 本沙箱 HKCU 不可观测（`:112-120`、`:137-139` 走 `Unverified`，`:192` 汇总），
  所以本轮最多 PASS + 2–3 条 UNVERIFIED，不能写成「已验」。

**0.22.0 重建顺序（根代理串行执行，`release/` 不进版本控制）**

1. 改 `package.json:3` → `0.22.0`；`CHANGELOG.md` 顶部加 S2 的条目；README/AGENTS/STATE/packaging README 的
   版本与体积占位先写 `[TBD]` 或「见 CHANGELOG」。同时更新文档点：
   `README.md:41` 安装包名 → 0.22.0；`README.md:130` 下一步；`AGENTS.md:70-72`（功能清单、CI 句、未验清单）；
   `docs/typora-gap.md:62` 最近文件 → 有（8 条，可清除）；`docs/adr/0009-*.md` 新建；
   `README.md:105` 的 ADR 范围改成 0001–0009（现在写 0001–0007，0008 已漏）。
2. `npm run build` —— **全程只跑这一次**，避免并发写 `dist/`。
3. `powershell -ExecutionPolicy Bypass -File host\build.ps1`（编入最近文件宿主代码，复制新 `dist`）。
4. `powershell -ExecutionPolicy Bypass -File packaging\installer.ps1` → 记 `setup=` 字节与 `sha256=`。
5. `powershell -ExecutionPolicy Bypass -File packaging\portable.ps1` → 记 `zip=` 字节与 SHA。
6. `powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1` → 记 PASS 与 UNVERIFIED（本沙箱最多 3 条：
   HKCU 卸载项、开始菜单快捷方式、dry-run 包）。
7. 校验和独立复核（不抄脚本输出）：

```powershell
Get-FileHash release\Sidelight-0.22.0-win-x64-setup.exe -Algorithm SHA256
Get-FileHash release\Sidelight-0.22.0-win-x64-portable.zip -Algorithm SHA256
Get-ChildItem release | Select-Object Name,Length
```

8. 把两个字节 + 两个 SHA256 写进 `CHANGELOG.md` 的 0.22.0 条目（**只这一处**）；`README.md:55`、`:66`、
   `STATE.md:52-55`、`packaging/README.md:57` 改成「见 CHANGELOG 0.22.0」，`packaging/README.md:57` 的
   「0.21.0 实测 803,335 / 余量 46,665」替换为新数字与预算。
9. 门槛复核：安装包 ≤810,000（目标）/850,000（硬线）；zip ≤940,000；主 chunk <1,228,800。
   偏差 >3 KB 先写原因再发，**不抬硬线**。
10. 不提交 `release/`（`.gitignore:10`）；0.21.0 两个包留着作回滚。
11. 交给人：按下面「真人验收步骤」做，外加安装器三条历史 UNVERIFIED（HKCU 卸载项、开始菜单、真人双击/SmartScreen）。

**难度** S（按顺序执行）。

---

## 版本建议

**0.22.0**（`package.json:3`）。功能档：最近文件是新的用户可见能力，宿主多一条只读 GET 与两条消息，
磁盘多一个 `recent.json`；旧数据与旧协议不动，所以不是 1.0.0。降档条件：功能被砍到只剩浏览器隐藏入口 → 0.21.1。

## 真人验收步骤（最近文件 5 步）

前置：在真机装 `release/Sidelight-0.22.0-win-x64-setup.exe`（per-user），准备一个含 ≥10 个 `.md` 的文件夹。

1. **基线**：启动 → 文件 → 打开文件夹 → 依次打开 3 个文档 → 完全退出再启动 → 打开「文件」，
   「最近打开」按时间倒序列出这 3 个，最后打开的在最上（对照基线截图 `shots/round-09/baseline-file-menu-0.21.0.png`，0.21.0 只有 4 项）。
2. **去重与上限**：继续打开到 9 个 → 列表只显示 8 个，最早的不见了；重开列表里已有的文档 → 不出现重复行，该行跳到最上。
3. **失效路径**：把其中一个 `.md` 改名或移到别的目录 → 点它那一行 → 出现「文件不在了/可能被移动」类提示，
   其余行仍能打开，菜单不崩、不清空。
4. **显示与隐私**：长文件名被截断，悬停能看到全名；列表与悬停都只显示文件名，**看不到盘符或完整路径**；
   用资源管理器打开 `%LOCALAPPDATA%\Sidelight\recent.json`，内容只有路径、文件名、时间，**没有正文**。
5. **清除**：点「清除」→ 再点「确认清除？」→ 列表空；关掉应用再开仍空；`%LOCALAPPDATA%\Sidelight\recent.json`
   已不存在。之后重新打开一个文档，列表从 1 条重新开始。

判定：5 步全过才算真人验收通过；任一步失败记 FAIL 并附截图。第 4 步的文件内容检查是隐私声明的唯一硬证据，不能跳。

## 优化机会（3 条）

1. **体积门槛与字节散在 5 处（重复）**：`packaging/installer.ps1:4,92`（850,000）、`portable.ps1:15`（940,000）、
   `README.md:66`、`packaging/README.md:57`、`STATE.md:52-55`。历史已漂移：第 7 轮同一 HEAD 重编比发布包小 176 B
   （`docs/iteration/round-07/findings-ship.md:19-20,124`）；0.18.0 与 0.19.0 的体积行都只写「见 0.21.0」（`CHANGELOG.md:39,51`）。
   建议门槛只留在 `packaging/` 一处脚本（或 `package.json` 字段），
   README 只写「见 CHANGELOG」。收益：少一次发布前对数，**0 运行时成本**。
2. **打包脚本输出目录不对称（首跑红根因）**：`portable.ps1:56` 建 `release/`，`installer.ps1` 不建；
   `makensis` 不会自建（本机复现 exit 1）。补一行即可，但同时说明「两个入口脚本对同一前置条件的假设不一致」，
   建议把「前置检查 + 建目录」抽成一个 3 行函数两边共用。收益：新机器/CI 首跑少一类红。
3. **KaTeX 仍全量进首屏（体积唯一大杠杆，本轮不动）**：主 chunk 1,128,204 B，其中 KaTeX 约 77,008 B gzip
   （第 5 轮实测，`docs/iteration/round-05/findings-ship.md:47`）。惰性 alias 需同时伪装 `render` 与 `renderToString`，
   风险高；本轮体积余量充足，**建议留到有专门时间窗时做**，不要在 0.22.0 混进来。

## 附：复现命令

```powershell
# 体积与压缩系数
Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z=[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 'release\Sidelight-0.21.0-win-x64-portable.zip'))
$z.Entries | Sort-Object CompressedLength -Descending | Select-Object -First 12 FullName,Length,CompressedLength
# spike
node node_modules/rolldown/bin/cli.mjs 'D:/Documents/SidelightProgram/.tmp/r9-ship/recent-spike.tsx' --external react -f esm -m -o 'D:/Documents/SidelightProgram/.tmp/r9-ship/recent-spike.min.js'
# makensis 不建输出目录
.tmp\nsis\nsis-3.11\makensis.exe /V1 .tmp\r9-ship\nsis-probe\probe.nsi   # exit 1, "Can't open output file"
```
