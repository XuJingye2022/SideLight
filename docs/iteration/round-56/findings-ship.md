# 安装与启动侦察（finder-ship，第 56 轮）

轮前 HEAD `882eb49`（= startSha），工作树干净。只读产品代码，未碰 `release/`。

## 本轮实测（health）

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| 首屏 gzip | **297,656 B**（raw 961,180，files=3），内部 310,000 / 硬线 320,000，余 22,344 | `npm run verify` PASS；`node scripts/measure-first-screen.mjs` → `.tmp/r56-ship-measure.log` |
| 测试 | 37 个文件 **462** 条，0 失败 | `npm test` → `.tmp/r56-ship-test.log` |
| `dist` | 3,863,832 B；最大 `index-*.js` 922,489 B（gzip 289,444）；KaTeX/Mermaid 惰性 chunk 都在包内 | `dist/` 实测 |
| 安装包干跑 | **1,309,221 B**，payload FileVersion 0.32.1.0 = `package.json` 0.32.1 | `packaging/installer.ps1 -AssocDryRun` → `.tmp/assoc-dryrun-setup.exe` |
| 打包预检 | setup 与 payload 同批、版本一致，**0 UNVERIFIED** | `verify-installer.ps1 -Setup .tmp\assoc-dryrun-setup.exe -PreflightOnly` |
| 体积线一致性 | `installer.ps1:97-101`（45,000,000 只 WARN）、`installer.ps1:126`（50,000,000 硬）、`portable.ps1:16`（50,000,000）、`verify-installer.ps1:76-83`、CI `measure-first-screen.mjs:21-22`（310,000/320,000）全部与 BRIEF 一致 | 源码 |
| WebView2 门 | 缺运行时 `MessageBox` + `Abort`，与 `packaging/README.md:18` 的「中止安装」一致 | `packaging/installer.nsi:124-125` |

未做：便携包（`portable.ps1` 会写 `release/Sidelight-0.32.1-win-x64-portable.zip`，红线禁止）；真实安装/HKCU（沙箱限制，`packaging/README.md:47-51`）。

## F1（P1）BRIEF 过期两轮，Top 5 里两条已经 fixed

- `docs/iteration/BRIEF.md:6`：「第 54 轮；HEAD `5b38dfa`」。实际 HEAD 是 `882eb49`，`5b38dfa` 是第 54 轮批末同步提交。
- `BRIEF.md:13-14` 的 Top 5 #2 B-101、#3 B-105，`BACKLOG.md:40`、`:44` 已记「第 55 轮 fixed」。
- 影响：planner 照 BRIEF 会重排已完成的活；5 路 finder 的查重口径也跟着错。
- 建议：开轮前用 `git rev-parse HEAD` + BACKLOG 复核 BRIEF 的「当前 / 版本 / Top 5」三块。

## F2（P2）首屏字节与测试条数的文档数字过期（已挂给 scribe，不重复计 actionable）

- 实测 297,656 B / 37 文件 462 条；文档仍写 296,055 B / 33–34 文件 442 条：
  `README.md:114`、`README.md:171`、`AGENTS.md:74`、`AGENTS.md:39`、`BRIEF.md:7`、`METRICS.md:8`、`STATE.md:54`。
- 与 `docs/iteration/round-55/impl.md:51` 同一条（该处已写「现 37/462、297,656 B，待 scribe」）；本轮只补全文件行号。
- `METRICS.md` 还缺 54–55 批的行（表头 v2 只到 51–53），同属 scribe 收口。

## F3（P2）直接跑宿主的 `www` 比 `dist` 旧，打包链不受影响

- `host/build.ps1:71` 把 `dist/*` 拷进 `host/bin/www`；现在 `host/bin/www/index.html` 为 03:22:28，`dist/index.html` 为 05:41:47（本轮 verify 重建）。
- 安装包 `packaging/installer.nsi:138-140` 与便携包 `packaging/portable.ps1:55` 都从 `dist` 取，所以产物里是新 UI。
- 风险面只在「直接跑 `host/bin/Sidelight.exe`」：会看到第 55 轮（`==高亮==`、暖纸主题）之前的界面，容易把「新功能没出现」判成产品失败。
- 建议：跑宿主冒烟前先 `host\build.ps1` 刷新 `www`，或让冒烟脚本断言 `www/index.html` 的 mtime ≥ `dist`。

## 余量提示（观察项）

硬线余 22,344 B；`scripts/measure-first-screen.mjs:77` 的告警线是「余量 < 硬线 5%」= 16,000 B。按近几轮 +0.6～1.6 KB/轮，约 4–10 轮会触发 WARN。CI（`ci.yml:39`、`release.yml:82`/`155`）走脚本默认值，门本身与 BRIEF 一致，无阻断。

结论：**本轮 0 发布阻断项**（打包链、版本门、体积线均通过）。
