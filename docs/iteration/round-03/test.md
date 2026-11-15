# 第 03 轮 · 独立验收（tester）

日期：2026-11-15。基线 `b434f25`，v0.17.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173`（验收期间一直 200）；CDP `9222`。

方法：先按 T1 → T2 → T3 → T4 → T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，113 modules，217 ms | `.tmp/r3-build.log` |
| `npm test` | **16 个文件、171 条断言、0 失败**，exit 0（含 `errorCopy` 6 条） | `.tmp/r3-test.log` |
| `npm run roundtrip` | exit 0；当前应用 **3 / 7 完全保真**（03/05/07 保真，02/04/空行仍有 diff） | `.tmp/r3-roundtrip.log` |
| 版本 | `node -e "require('./package.json').version"` = **0.17.0** | — |

- `dist` 合计 **1,400,644 B**（与根代理给的一致）。
- `dist/assets/index-BTV3L2lu.js` **1,093.24 kB / gzip 342.34 kB**；CSS **50.64 kB / gzip 12.94 kB**。
- chunk 警告仍在：`(!) Some chunks are larger than 500 kB after minification`，属既有问题，不是本轮回归。

## T1 宿主固定回环 origin 与冷启动：**PASS**

`node host/fcp-probe.mjs` → **6/6 PASS**：

```text
PASS FCP 首屏 ≤500ms — fcp=304ms
PASS origin 两次启动一致（127.0.0.1:47821） — origin1=http://127.0.0.1:47821
PASS 设置与无句柄草稿跨两次冷启动仍在 — originSame=true settingsSame=true docSame=true
PASS FCP 转发 reload ≤500ms — fcp=64ms applied=true name=forward.md
PASS 穿越防护 4 类（.. / %2e%2e / ..%2f / 绝对或 UNC） — dotdot=403 encoded-dotdot=403 encoded-slash=403 absolute-or-unc=403
PASS Content-Type 与 HEAD（.js/.css/.woff2；HEAD 200 无 body） — js=text/javascript css=text/css woff2=font/woff2 head=200 len=588 body=0
summary: 6/6 PASS
```

`node host/fcp-probe.mjs --busy` → **1/1 PASS**：先占住 47821，宿主 `exit=1`，日志含 `loopback port busy 47821`，没有换端口。

自写两次冷启动复核 `.tmp/r3-origin.mjs`（CDP 9342）：

```text
PASS 两次启动 origin 一致 (http://127.0.0.1:47821 / http://127.0.0.1:47821)
PASS settings 跨冷启动保留
PASS 草稿跨冷启动保留且正文恢复 (docSame=true body=true)
```

- FCP 实测 304 ms / 64 ms；比 `impl-b` 记录的 296 / 52 ms 略慢，仍远低于 500 ms，属测量波动。
- `node scripts/host-smoke.mjs --fsa` → **7/7 PASS**（窗口、渲染、argv、单实例、FSA 真实写盘 hash `c2a40b8b→f2ce1a6d`）。
- 结束时 `Sidelight` 进程 0，47821 无监听。

## T2 NSIS per-user 安装器：**PASS（3 项环境 UNVERIFIED）**

`powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1` → exit 0：

```text
PASS 运行时存在（pv=157.0.4341.46 loader=True）
PASS 安装写入 …\.tmp\install-verify（exe / config / ico / uninstall / SDK dll / www/index.html）
PASS 装后程序可启动：title=[Sidelight] http=200
UNVERIFIED HKCU 卸载项不可观测（本沙箱 HKCU 写入被环境吞掉）
UNVERIFIED 开始菜单快捷方式不可观测（同上）
PASS 卸载清理：安装目录已删除
UNVERIFIED HKCU 卸载项删除不可观测（同上）
PASS 用户数据保留（C:\Users\WINDOWS\AppData\Local\Sidelight）
PASS 不写 HKLM 卸载项
summary: PASS（3 UNVERIFIED：HKCU/快捷方式在本沙箱不可观测）
```

- 手工 `/S /D=.tmp\install-verify` 复装一次（`.tmp/r3-install-manual.mjs`）：安装 exit 0，目录含 `Sidelight.exe`、config、ico、`uninstall.exe`、3 个 DLL、`www/index.html`；静默卸载 exit 0、目录删除。安装器与卸载都未写 HKLM。
- 手工运行时窗口标题为 **`Sidelight（便携数据目录）`**，回环 200；官方 `verify-installer.ps1` 那次拿到精确的 `Sidelight`。后缀来自本沙箱 `%LOCALAPPDATA%`/`%TEMP%` 数据目录回退，不是安装器缺陷；正式用户目录可写时标题应为 `Sidelight`，此点记环境差异。
- 产物：`release/Sidelight-0.17.0-win-x64-setup.exe` **827,198 B**，SHA256 `251FB3BDA666158EB57DFA4EBA2ADBFFFEE41F8A66630EB8A4A72232E92762E4`，低于 840,000 B 硬线和 `P+10,000` 门槛。
- 静态核对 `.nsi`：`RequestExecutionLevel user`、per-user `InstallDir`、运行时检查 `MessageBox` + `Abort` 各 1 处、卸载保留 `%LOCALAPPDATA%\Sidelight` 注释、无 HKLM 卸载项写入。
- **UNVERIFIED**：WebView2 运行时缺失分支（真正卸载运行时需管理员，只做静态验收）；HKCU 卸载项与开始菜单快捷方式的实际写入/删除；SmartScreen 与真人双击（计划已列 UNVERIFIED）。

## T3 窄窗 + 错误反馈 + 小字：**PASS（1 条非阻塞差异）**

独立脚本 `.tmp/r3-ui.mjs`（dev 5173 + CDP 9222）：

```text
PASS T3 1024 无横向溢出 (1024/1024)
PASS T3 1024 保存/设置/源码/预览不被裁
PASS T3 1024 批注抽屉打开且焦点在抽屉
PASS T3 1024 Esc 关抽屉且焦点回「批注」
PASS T3 1024 键盘开抽屉、点遮罩关且回焦点
PASS T3 1119 无横向溢出 (1119/1119) / 四按钮不被裁
PASS T3 1120 无横向溢出 (1120/1120) / 四按钮不被裁
PASS T3 1120 页边栏可见
```

错误文案（路由拦截 `/chat/completions`）：

```text
PASS T3 401 文案可操作 ({"role":"alert","text":"API Key 无效或没有权限。下一步：打开设置检查 Key 和接口地址。","action":"打开设置"})
PASS T3 401 提示 7s 后仍在
PASS T3 401 点「打开设置」打开设置框
PASS T3 断网 文案可操作 ({"text":"连不上接口地址。下一步：检查网络，或确认设置里的「接口地址」没填错。","action":"打开设置"})
PASS T3 500 文案可操作且不铺原始响应 ({"text":"模型接口返回 500。下一步：稍后重试；还不行就换模型或接口地址。","action":"重试"})
```

- 401/断网/500 都是 `role="alert"`、不自动消失（401 实测 7 s 仍在）；原始响应 `RAW-SECRET-401/500` 不出现在可见文案。
- **差异（非阻塞）**：500 的 toast `title` / `.toast-text` 的 `title` 都是 `null`，原始响应也没有进任何 `title`；计划写「原始响应只在 `title`」。用户可见文案正确且不泄漏，但调试详情缺失，建议补 `title` 或折叠详情。
- 保存/导出失败：

```text
PASS T3 无句柄保存提示含「下载」且仍 dirty (dirty=true)
PASS T3 导出失败提示且仍 dirty (dirty=true)
```

- 7 个选择器全部 **12px**：`.field span`、`.rail-goal`、`.sidebar-tabs button`、`.rail-notice`、`.file-tree-name`、`.find-count`、`.risk-banner button`。其中 `.rail-notice` 在当前自然状态没有出现，用同类节点量规则（与 `impl-a` D5 一致）；其余 6 个是自然状态实测。
- `npm test` 含 `errorCopy.test.ts` 6 条（401/403、429、network、500、unknown、detail 不进文案），全绿。
- 401/断网/500 拦截产生 3 条 `Failed to load resource` 控制台记录，是测试主动注入的请求失败，不是产品错误。

## T4 示例 / 未命名 / 试用示例：**PASS**

独立脚本 `.tmp/r3-t4.mjs`：

```text
PASS T4 首屏文档名含「示例」 (示例 · 未命名.md)
PASS T4 首屏树文案「现在打开的是示例」
PASS T4 首屏正文仍是示例
PASS T4 首屏页边提示「当前是示例」
PASS T4 首屏原有关键按钮名仍在
PASS T4 试用示例打开 开始写.md (doc=开始写.md)
PASS T4 树选中项与文档名一致 + aria-current (active=开始写.md aria=true)
PASS T4 全页无「新建」
PASS T4 示例态原有关键按钮名仍在
PASS T4 T3 新「批注」按钮存在
PASS T4 抽屉关闭控件存在
```

截图：`shots/round-03/t4-first.png`、`t4-demo.png`。`t4-demo.png` 中 `开始写.md` 在树里高亮，正文换成该篇。

## T5 版本 + CHANGELOG + 仓库卫生：**PASS**

```text
node -e "require('./package.json').version"                 → 0.17.0
README 0 命中：1,392,880 / 1,395,531 / 165 / 162 / 没有安装器
README 命中：安装器、127.0.0.1:47821、171、1,400,644
CHANGELOG 0.17.0：第 5 行，含「便携」「转发前确认」，[TBD] 0 命中
.gitattributes：*.webp / *.jpg / *.exe binary（保留 *.png / *.ico）
.gitignore：release/ 命中；`git check-ignore release/...` 通过
vite.config.ts：'**/host/bin/**' 与 '**/release/**' 各 1
git ls-files shots：108（本轮没删截图）
ADR-0004 载荷取数命令 → 2,389,352（988,708 + 1,400,644），与文档一致
```

- ADR-0004 的 zip 904,736 B / setup 827,198 B 与两个 SHA256 均与 `release/` 实测一致。
- `docs/CHANGELOG.md` 的 0.16.3/0.16.2 历史测试数仍为 162（未被改成当前值），0.17.0 写了 1,400,644 / 904,736 / 827,198。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| round-01 货币/字体 | PASS：acceptance 前 7 项含货币、字体；`npm run shot` `katex delta: 0` / `source has currency: true` / `console errors: none` | `.tmp/r3-fix-acceptance.log`、`.tmp/r3-shot.log` |
| round-02 转发确认 | **12/12 PASS**（复验：dirty-no / dirty-yes / race / reload-race 全过；reload-race 改为最终内容 + 守卫 + `timeOrigin` 稳定，不再依赖中间态） | `.tmp/r3-fix-forward.log` |
| portable verify | **6/6 PASS**（0.17.0 zip，解压/spawn/0 控制台错误/退出 0） | `.tmp/r3-verify-portable.log` |
| host-smoke --fsa | **7/7 PASS**，`navigation starting` 强断言恢复为恰好 2 条（`navStarts=2`） | `.tmp/r3-fix-smoke.log` |
| `npm run shot` | PASS（产品断言全过） | `.tmp/r3-shot.log` |
| `node scripts/acceptance.mjs` | **11/11 PASS**（复验） | `.tmp/r3-fix-acceptance.log` |
| `npm test` | **171 条、0 失败**（复验） | `.tmp/r3-fix-test.log` |

**复验修复**：`scripts/acceptance.mjs` 在点「试用示例」后先处理切换确认框（选「放弃改动」），复跑 11/11 全 PASS；`host/test-forward.mjs` 的 reload-race 改为断言最终内容 `third.md`、`sl:argv-runs=1`、1.2 s 内 `timeOrigin` 稳定、无 `forward failed`，不再要求 `queued/drained` 中间态，复跑 12/12；`host-smoke.mjs` 从 `host.log` 本次启动段数 `navigation starting`，恢复「恰好 2 条」强断言（`navStarts=2`），`framenavigated` 只作参考。三项都是验收脚本修复，产品行为未改。

## 范围与卫生

- `git status`：24 个已跟踪文件改动，主要是 T1/T2/T3/T4/T5 文件，加上三个验收脚本与测试截图；新增未跟踪：`docs/adr/0005`、`docs/iteration/round-03/**`、`host/fcp-probe.mjs`、`packaging/{README.md,installer.nsi,installer.ps1,verify-installer.ps1}`、`shots/round-03/**`、`src/lib/errorCopy.test.ts`。
- `git diff --stat`：24 文件，707 insertions / 121 deletions；`package.json` 只改版本与 test 行；`src/`、`host/`、`packaging/` 与各任务边界基本一致。
- **测试脚本改动（复验已接受）**：`scripts/acceptance.mjs` 处理 T4 的「试用示例」切换框；`host/test-forward.mjs` 的 reload-race 改为最终内容 + 守卫 + `timeOrigin` 稳定；`scripts/host-smoke.mjs` 用 `host.log` 的 `navigation starting` 恢复「恰好 2 条」强断言。三个都不在产品计划文件清单里，但都是验收脚本适配，未改产品行为。
- **越界 1（builder2）**：`scripts/host-smoke.mjs` 改动经两轮修订后已恢复强断言（`navStarts=2`），改法合理；首版曾弱化为 `framenavigated<=2`，已在复验版修正。
- **越界 2（lead/收尾）**：`AGENTS.md` 把测试数从 15/165 改成 16/171；不在 T5 文件清单里，但内容与实测一致，属必要的门禁文档回填。
- `shots/acceptance.png`、`t1-currency.png`、`t3-{window,fsa}.png`、`round-02/t4-portable.png` 被 acceptance / shot / host-smoke / portable verify 重写；既有脚本副作用，不是产品改动。
- `release/`、`host/bin/`、`dist/` 均未进版本控制；`git check-ignore` 命中。无新增运行时依赖、无密钥、无调试残留。

## 与实施报告对照

- `impl-a.md` 的 T3/T4/T5 结论与我的实测一致；D5 说明 `.rail-notice` 只有规则级证据，我的探针复算 12px，一致。
- `impl-b.md` 的 T1 6/6、`--busy` 1/1、host-smoke 7/7 与我的复跑一致；其 T2 报告写「安装/卸载运行 UNVERIFIED（NSIS 写用户目录被拒）」，但我在当前环境跑 `verify-installer.ps1` 已能装到 `.tmp\install-verify`、启动、卸载并保留数据，只有 HKCU/快捷方式仍 UNVERIFIED；报告该段落后于最终环境，结论方向不冲突。
- `impl-b.md` 主动标出了 `scripts/host-smoke.mjs` 越界；首版弱化了 `framenavigated` 断言，复验版已用 `host.log` 的 `navStarts=2` 恢复强断言，最终可接受。
- 未发现验收项造假；初次验收的 2 个回归失败已由脚本修复并在本轮复验通过。

## 最终判定

**PASS-WITH-UNVERIFIED（复验范围：`acceptance`、`host/test-forward`、`host-smoke --fsa`、`npm test`；T1–T5 结论沿用初次全量验收）**

- 复验结果：`node scripts/acceptance.mjs` **11/11 PASS**；`node host/test-forward.mjs` **12/12 PASS**；`node scripts/host-smoke.mjs --fsa` **7/7 PASS**（`navStarts=2`，恰好重载一次）；`npm test` **171/0**。初次 FAIL 的两个回归脚本已修复，未改产品行为。
- T1、T2、T3、T4、T5 全部达到计划验收；build/test/roundtrip、fcp-probe、busy、installer、UI、onboarding、portable、host-smoke 均通过。
- **仍 UNVERIFIED（不阻断本轮）**：
  - T2：HKCU 卸载项与开始菜单快捷方式的写入/删除（本沙箱 HKCU 不可观测）；`%LOCALAPPDATA%\Programs\Sidelight` **默认安装路径**（自动化用 `/D` 指到 `.tmp\install-verify`）；WebView2 运行时缺失分支（卸载运行时需管理员，仅静态验收）。
  - T4：真人资源管理器双击、MOTW/SmartScreen 交互（未自动化）。
- 非阻断残留：500 toast 的原始响应没有进 `title`（与计划字面不符，可见文案正确且不泄漏）；T2 手工安装标题带「（便携数据目录）」是沙箱数据目录回退，官方 verify 拿到精确 `Sidelight`；`AGENTS.md` 与 3 个验收脚本属计划外但合理的收尾/测试修复。
