# 第 04 轮 · 独立验收（tester）

日期：2026-11-15。基线 `bff19f9`，v0.17.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 一直 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4 → T5a → T5b → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，114 modules，214 ms | `.tmp/r4-build.log` |
| `npm test` | **16 个文件、171 条断言、0 失败**，exit 0 | `.tmp/r4-test.log` |
| `npm run roundtrip` | exit 0；当前应用 **3 / 7 完全保真**（03/05/07 保真，02/04/空行仍有 diff） | `.tmp/r4-roundtrip.log` |

- `dist` 合计 **1,406,633 B**，与根代理给的一致。
- `dist/assets/index-Tx6OjPkG.js` **1,098.17 kB / gzip 343.65 kB**；CSS **51.70 kB / gzip 13.09 kB**；>500 kB chunk 警告仍在（既有问题）。

## T1 保存落点与 dirty 基线：**PASS（真实系统对话框 UNVERIFIED）**

`node scripts/save-acceptance.mjs http://localhost:5173` → **25/25 PASS**：

```text
PASS 首次保存调用了 picker
PASS 打桩 picker 下有文件、正文写入
PASS 首次保存没有走下载
PASS 提示含「已保存」与文件名 (已保存 示例 · 未命名.md)
PASS 保存后 dirty=false
PASS 10 秒后「已保存」仍在
PASS 第二次保存不再弹 picker (1 -> 1)
PASS 第二次写入同一文件且内容更新
PASS 不支持 picker 时有下载
PASS 提示含「无法确认落点」 / 不含「已保存」 / dirty 仍为 true
PASS 取消后提示「已取消保存」/ 无「已保存」/ dirty=true / 正文不变
PASS 六态 1–6：打字 true、撤销回基线 false、保存成功 false、再打字 true、撤销回保存基线 false、载入后初始 false
```

自写独立复核 `.tmp/r4-t1-extra.mjs` → **8/8 PASS**：首次 picker 落盘 + `dirty=false`；第二次 `Ctrl+S` picker 计数 `1 -> 1` 且内容更新；撤销回保存基线 `dirty=false`；取消后「已取消保存」、无残留成功、正文不变、`dirty=true`；降级下载有下载事件、提示「无法确认落点」、不含「已保存」、`dirty=true`。

- **UNVERIFIED**：真实系统保存对话框（本机只打桩 picker / OPFS，未真人点一次）。补法：安装版打开无句柄文档，按 Ctrl+S 选真实路径并重开。
- 脚本的宿主段（`.tmp/host-base`）本轮未单独跑；T4 的只读文档保存走同一 `saveAsFile` 路径，算间接覆盖。

## T2 文件菜单 / 新建 / 另存为：**PASS**

`node scripts/filemenu-acceptance.mjs http://localhost:5173` → **31/31 PASS**：

- 空状态、示例态、真实文件夹态都有「文件」按钮与四项菜单（新建 / 另存为… / 打开文件… / 打开文件夹…）；示例态与文件夹态「打开文件夹/打开文件」仍可点。
- 菜单 `Esc` 关闭后 `activeElement` 是「文件」按钮。
- 示例态有「示例」徽标、写明「改动不写盘，保存会另存为」、无「＋ 新建文件」。
- 真实文件夹树头有「＋ 新建文件」「打开其他文件夹」；新建后树里出现 **`未命名.md`**，`.is-active`/`aria-current` 命中，正文空、`dirty=false`，`Ctrl+S` 不弹 picker 直接写盘。
- 无文件夹「新建」→ `未命名.md`、空正文、`dirty=false`，保存走 picker。
- 脏改动点「新建」→ 出现未保存确认；选取消后正文与 dirty 原样。
- 另存为（打桩 picker）→ 新文件写入、文件名更新、`dirty=false`、提示「已保存」；示例态保存走 picker、不改文件树。

## T3 导出当前模式内容 + IME：**PASS（真实 IME UNVERIFIED）**

`node scripts/export-acceptance.mjs` → **7/7 PASS**：

```text
exports: ["示例 · 未命名.html","示例 · 未命名.txt","示例 · 未命名.md"]
PASS HTML 导出含源码模式最新标记
PASS TXT 导出含源码模式最新标记
PASS Markdown 导出含源码模式最新标记
PASS 三个文件名都跟文档名
PASS HTML 导出仍含正文先前写的一句
```

`node scripts/ime-composition.mjs` → **12/12 PASS**：正文/标题/代码块/表格/源码五处组合输入都只上屏一次、一次 Ctrl+Z 撤回整词；组合中输入 `Ctrl+S` 后提交只上屏一次；页面无脚本错误。

- **UNVERIFIED**：真实中文输入法、候选窗、宿主内 IME。本机只用 CDP `Input.imeSetComposition` / `insertText` 模拟。

## T4 宿主 argv 只读横幅：**PASS（真人双击/SmartScreen UNVERIFIED）**

- `powershell -ExecutionPolicy Bypass -File host\build.ps1` → exit 0；随后 `node scripts/readonly-acceptance.mjs` → **14/14 PASS**（`.tmp/host-t4`，CDP 9335）。
- 自写 `.tmp/r4-readonly-own.mjs`（`.tmp/host-t4`，端口 47834 / CDP 9338）→ **5/5 PASS**：argv 文档出现只读横幅（`role=status` +「另存为」）、`__slState.readOnly=true`、8 秒后横幅仍在；打桩 picker 后 `Ctrl+S` 走另存为、横幅撤掉、`readOnly=false`、提示「已保存」、**原文件 SHA256 不变**（`10EABE08…`）。
- 负向：`readonly-acceptance` 的「打开文件（有句柄）」断言普通文件**没有**只读横幅、`readOnly=false`、正文是普通文件内容。
- 截图：`shots/round-04/t4-readonly.png`、`t4-normal.png`。
- **UNVERIFIED**：真人双击 exe、资源管理器解压、MOTW/SmartScreen；真实系统保存对话框（同上）。

## T5a 宿主下载落点：**PASS（事件）/ UNVERIFIED（落盘）**

`node host/download-probe.mjs`（`.tmp/host-t5a`，CDP 9336）：

```text
PASS argv 注入的文档带 readOnly 标记 — readOnly=true name=doc.md
UNVERIFIED 导出 → Markdown 落盘到指定目录 — DownloadStarting 已触发（name/result/handled=true），但 Chromium 写下载文件被拒：state=Interrupted reason=FileFailed
UNVERIFIED 保存降级（picker=undefined）→ 下载落盘 — DownloadStarting 已触发，但 Chromium 写下载文件被拒：reason=FileFailed
summary: 1/1 PASS，2 UNVERIFIED（环境：Chromium 下载写文件被拒）
```

- `host.log` 两段都有 `download starting name=doc.md result=…\downloads\doc.md handled=true mode=env`；第一条来自导出，第二条来自 T1 后的保存降级（picker 设为 undefined）。
- **落盘 UNVERIFIED**：`download state=Interrupted reason=FileFailed bytes=0`，`downloads/` 为空。事件接住、路径设置、`handled=true` 已证；浏览器进程写文件被沙箱拒绝与第 2/3 轮 NSIS/HKCU 限制同类，真机补验。
- 真实 `SaveFileDialog` 分支（无 `SIDELIGHT_DOWNLOAD_DIR`）未走，UNVERIFIED。

## T5b 文档 / CI / 仓库卫生：**PASS（有 3 处非阻断文档旧句）**

通过的断言：

```text
AGENTS：'浏览器原型'/'未接 Tauri 壳'/'Tauri 接上之后' 0 命中；含 per-user/安装器/CHANGELOG/新建与另存为
README：'0.16.4'/'再套 Tauri 壳'/'[T1/T2 后确认]' 0 命中；含 CHANGELOG/ADR-0005/新建与另存为
README 体积：1,406,633 B、安装包 829,472 B、便携 zip 907,266 B
CHANGELOG：0.17.0 无 '0.16.4–0.16.9'、无 '[TBD]'；含货币不再吞字/171 条/ADR-0005/新建/另存为
CI：windows-2022、WV2_SHA256、NSIS_SHA256、installer.ps1、upload-artifact、windows-host 均命中
packaging/README.md：无「拒写」；installer.ps1 硬线 850000，未再出现 840000/threshold 死代码
docs/iteration/round-04/shots-untrack.txt：37 行；git ls-files shots = 132（未执行 git rm）
ADR-0004 载荷取数命令 → 2,398,413 B，与文档一致；zip/setup 新 SHA256 与实测一致
```

**非阻断文档旧句**（建议收尾修）：

1. `docs/adr/0004-webview2-host-before-admin.md:39` 标题仍写「第 03 轮实测」，正文已是第 04 轮。
2. 同文件 `:61` 仍写「GitHub Actions windows-latest 可用…换 Tauri」，计划 T5b 第 7 步要求改成「CI 出包成熟后再评估」，未改。
3. `packaging/README.md:41` 仍写硬报警线 840,000 B，`packaging/installer.ps1` 已改 850,000 B。
4. `README.md` 只写体积，没有新 SHA；SHA 在 CHANGELOG 与 ADR-0004 中与实测一致。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| `node scripts/acceptance.mjs` | **11/11 PASS** | `.tmp/r4-acceptance.log` |
| `npm run shot` | PASS：`katex delta: 0`、`source has currency: true`、`console errors: none` | `.tmp/r4-shot.log` |
| `node scripts/host-smoke.mjs --fsa` | **7/7 PASS**（argv `navStarts=2`、FSA hash `0ca2d9ea→d39d21fa`） | `.tmp/r4-host-smoke.log` |
| `packaging/verify-installer.ps1` | **exit 0**；装/启/卸/数据保留 PASS；HKCU/开始菜单 3 项 UNVERIFIED | `.tmp/r4-verify-installer.log` |
| `node host/fcp-probe.mjs` | **6/6 PASS**（FCP 216 ms、转发 reload 60 ms、origin/持久化/穿越/MIME） | `.tmp/r4-fcp.log` |
| `node packaging/verify-portable.mjs` | **6/6 PASS** | `.tmp/r4-verify-portable.log` |

## 范围与卫生

- `git status`：18 个已跟踪文件改动；17 项未跟踪（`docs/iteration/round-04/**`、`host/download-probe.mjs`、5 个新验收脚本、`src/components/FileMenu.tsx`、`shots/round-04/**`、本报告）。`git diff --stat`：18 文件，661 insertions / 82 deletions。
- `package.json` 未改；`npm test` 仍是 **16 文件 171 条**，新验收脚本没有挂进门禁、没有污染计数。
- `release/`、`host/bin/`、`dist/` 均未进版本控制（`git check-ignore` 命中 release/；`git ls-files release host/bin dist` 为空）。
- 无密钥、无调试残留：diff 与新脚本搜索 `sk-`、`api_key`、`password`、`secret` 无命中；`src/` / `host/` diff 无 `console.log`、`debugger`。
- `shots/round-01/t3-fsa.png` 被 host-smoke 重写；`shots/round-04/` 32 张新图；属测试副作用，不是产品改动。
- `host/README.md` 被 T5a 改（下载落点说明），不在 plan T5a 文件清单中，但内容与实测一致，属必要文档。

## 与实施报告对照

- `impl-a.md` 的 T1–T4 结论与我的实测一致；`save-acceptance` 25/25、`filemenu` 31/31、`export` 7/7、`ime` 12/12、`readonly` 14/14 均能复跑。
- `impl-b.md` 的 T5a 事件/handled 结论与我的日志一致；其「落盘 FileFailed」判断正确，已按 UNVERIFIED 记录；T5b 主断言通过，但 ADR-0004 的 Tauri 触发句与 packaging README 的 840/850 未同步（impl-b 未提，属遗漏）。
- `impl-b.md` 说 T5b 未开始，但工作树中 T5b 文档已由根代理收尾落地；我按工作树验收。
- 未发现验收项造假；所有 PASS 都有可复跑命令或日志。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1、T2、T3、T4、T5a（事件）、T5b 均达到计划验收；门禁 build/test/roundtrip 与全部回归通过。
- **UNVERIFIED（按计划不凑 PASS）**：
  - T1：真实系统保存对话框（只打桩 picker）。
  - T3：真实中文输入法/候选窗/宿主 IME（只 CDP 模拟）。
  - T4：真人双击/SmartScreen；真实系统保存对话框。
  - T5a：宿主下载**落盘**（Chromium `FileFailed`，事件与 handled 已证）；真实 SaveFileDialog 分支。
  - T2：HKCU 卸载项、开始菜单快捷方式、`%LOCALAPPDATA%\Programs\Sidelight` 默认安装路径（自动化用 `/D` 到 `.tmp`）。
  - T5b：无（文档主断言通过）；3–4 处旧句为非阻断收尾项。
- 非阻断文档旧句：ADR-0004 第 03 轮标题与旧 Tauri 触发句、packaging README 的 840,000（代码已 850,000）、README 未写新 SHA。建议提交前顺手修掉，不影响本轮产品判定。
