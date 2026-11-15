# 第 09 轮 · 独立验收（tester）

日期：2026-11-16。基线 `875297e`（产品代码 `47e5602`），v0.22.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，118 modules，**0 warning**，208 ms | `.tmp/r9-build.log` |
| `npm test` | **16 个文件、192 条断言、0 失败** | `.tmp/r9-test.log` |
| `npm run roundtrip` | exit 0；**3 / 7 完全保真**（03/05/07） | `.tmp/r9-roundtrip.log` |

- `dist` **1,404,769 B**；主 chunk `index-CrNEvjJ4.js` **1,133.42 kB / gzip 354.55 kB**；CSS 56.18 kB / gzip 13.86 kB。

## T1 最近菜单：**PASS**

`node scripts/recent-acceptance.mjs` → **57/57 PASS**：

- 无宿主：菜单没有「最近」字样，只有 4 项，高 130 px；`disabled` 显示原因行且动作仍可用；`volatile` 显示「临时目录，重启可能丢失」。
- 8 条全部渲染；同名文件靠父目录区分（`文档/1 号目录` / `文档/3 号目录`）；长名 `title` 含全名；两条分隔线 + 标题 + 清除项。
- 键盘：ArrowDown 12 次到「清除最近记录」，Home/End/Esc 正常。
- 960×500 与 1024×600：菜单出现滚动，滚轮能到底，End 后清除项在视口内，`.app` 不上移；1440×900 / 1280×800 / 1024×768 无滚动条。
- 清除成功 toast + 撤销 `recent-restore`；清除失败保持列表并给 error；脏文档点最近项先 save，成功后 `open-recent` 的 id/seq 是刚点那条，取消不发 `open-recent`；宿主真实段点最近项重开成功。
- 真实重启列表：**UNVERIFIED**。

## T2 失效条目：**PASS**

- `FILE_GONE`：toast 含「文件不存在或已移动」，带「从列表移除」「重试」，列表行仍在；移除发 `recent-remove` 后行消失；重试重发 `open-recent`。
- `READONLY` / `ENCODING` / `TOO_LARGE` 分别是「只能只读打开」/「编码无法识别」/「超过 6 MB」，不是同一句泛化文案。
- `STALE`：刷新期间该行 disabled，重复点击只发一次请求，刷新后按新 seq 可点。
- 移除失败：复用同一映射文案「只能只读打开」，行保留。

## T3 宿主最近记录：**PASS-WITH-UNVERIFIED**
`node host/recent-probe.mjs` → **21/21 PASS**：

- 9 次 argv 打开 → 8 条；最近在最前；重复打开去重置顶仍 8 条。
- `/__recent` 无 `openedAt`/`path`，`dir` 无盘符/反斜杠/`..`；`Cache-Control: no-store`；`Host: evil` 403。
- `open-recent` 成功、旧 seq → `STALE`、伪造 path → `BAD_REQUEST`、删除文件 → `FILE_GONE`。
- `recent-clear` 清空、`recent-restore` 恢复、`recent-remove` 移除，再删旧 seq → `STALE`。
- 损坏 `recent.json` 备份 `recent.json.bad-*`；日志首跑迁移 `host.log.bad` + `log migrated`；日志无完整路径；超过 1 MB 轮转 `host.log.1`；TEMP 回退 `state=volatile`；argv 写入并可重开。
- **UNVERIFIED**：真实 `%LOCALAPPDATA%\Sidelight\recent.json`。本沙箱对 `%LOCALAPPDATA%\Sidelight` 写入被拒，宿主按设计回退到 portable，`recent.json` 落在 `host/bin/state/`；`recent-probe` 用 `SIDELIGHT_STATE_DIR` override 验证协议，但没有验证真实用户路径。
- `forward applied` 日志缺口已修复：复验 `host/fcp-probe.mjs` **6/6**、`host-smoke --fsa` **7/7**，转发 `applied=true`。

## T4 版本 / 产物 / CI / 文档：**PASS**

- 版本/lock **0.22.0**；release 只有 0.22.0：zip **887,922 B / `A31D7FDA…`**、setup **809,542 B / `0F8579D3…`**；README/CHANGELOG/ADR-0004 的 1,404,769 / 两个 SHA / 192 条一致；ADR-0004 载荷 **2,425,221 B**（1,020,452 + 1,404,769）；ADR-0009 存在；README「数据与隐私」首仍标「待产品负责人确认」；旧数 0 命中，`[TBD]` 0。
- `packaging/installer.ps1` 建 `release/`；`verify-installer` PASS（3 项 HKCU/快捷方式 UNVERIFIED）。
- CI：`Fetch WebView2 SDK` 步的 `run` 第一行已加 `New-Item -ItemType Directory -Force .tmp`，在 `Invoke-WebRequest ... .tmp/wv2.zip` 之前；diff 已复核。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| recent-acceptance | **57/57 PASS** | `.tmp/r9-recent-acceptance.log` |
| recent-probe | **21/21 PASS** | `.tmp/r9-recent-probe.log` |
| draft-acceptance | **58/58 PASS**（文件菜单按动作名称，不写死条数） | `.tmp/r9fix-draft.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp/r9-host-save.log` |
| keyboard-acceptance | **28/28 PASS** | `.tmp/r9-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r9-theme.log` |
| export-math-acceptance | **10/10 PASS** | `.tmp/r9-export-math.log` |
| host-smoke --fsa | **7/7 PASS**（argv `navStarts=2`） | `.tmp/r9fix-host-smoke.log` |
| fcp-probe | **6/6 PASS**（转发 `applied=true`） | `.tmp/r9fix-fcp.log` |
| acceptance dev 5173 | **11/11 PASS** | `.tmp/r9-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp/r9-acceptance-prod.log` |
| verify-installer 0.22.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r9-verify-installer.log` |
| verify-portable | **6/6 PASS**、26 条目 | `.tmp/r9-verify-portable.log` |

- 回归复验全部通过：draft 58/58、recent 57/57、host-smoke 7/7、fcp 6/6、recent-probe 21/21；此前 56/57、6/7、5/6 已修复。

## 范围与卫生

- `git status`：24 个已跟踪文件改动、0 删除、12 项未跟踪（`docs/adr/0009`、`docs/iteration/round-09/**`、`scripts/recent-acceptance.mjs`、`host/recent-probe.mjs`、`shots/round-09/**`、本报告）；`git diff --stat` 24 文件，997 insertions / 100 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`package-lock` 0.22.0。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-{window,fsa}.png`、`shots/round-02/t4-portable.png`、`shots/round-06/t1-host-error.png` 被回归脚本重写（既有行为）。

## 与实施报告对照

- `impl-a.md` 的 T1/T2 结论与 57/57 一致；`draft-acceptance` 已改为按动作名称检查，不再写死 4 条。
- `impl-b.md` 的 T3 21/21 与探针一致；`forward applied` 与 argv `inject=false` 已修复，fcp 6/6、host-smoke 7/7；CI 已在 WebView2 下载前建 `.tmp`。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1/T2/T3/T4 功能与门禁通过；recent 57/57、recent-probe 21/21、draft 58/58、host-save 64/64、keyboard 28/28、theme 16/16、export 10/10、host-smoke 7/7、fcp 6/6、acceptance dev/prod 11/11、installer/portable 通过。
- 复验修复：CI 已在 WebView2 下载前建 `.tmp`；argv `inject=false` 后 `navStarts=2`；`forward applied` 恢复后转发 `applied=true`；draft T4 按动作名称检查。
- 产物：dist 1,404,769 B、zip 887,922 B / `A31D7FDA…`、setup 809,542 B / `0F8579D3…`；README/CHANGELOG/ADR-0004/ADR-0009 对齐，旧数/TBD 0 命中。
- **UNVERIFIED（不凑 PASS）**：真实 `%LOCALAPPDATA%\Sidelight\recent.json`（沙箱回退 portable）、真实重启列表、`recent.json` 写失败、网络盘失效、卸载保留、真实 HKCU/双击/IME、真实日志迁移。
