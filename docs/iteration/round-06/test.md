# 第 06 轮 · 独立验收（tester）

日期：2026-11-15。基线 `d8e84a4`，v0.19.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222/9337/9338。

方法：先按 T1 → T2 → T3 → T4 → T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，116 modules，**0 warning**，279 ms | `.tmp/r6fix-build.log` |
| `npm test` | **16 个文件、177 条断言、0 失败** | `.tmp/r6-test.log` |
| `npm run roundtrip` | exit 0；**3 / 7 完全保真**（03/05/07 保真） | `.tmp/r6-roundtrip.log` |

- `dist` **1,382,298 B**；主 chunk `index-BtVooq8-.js` **1,113.59 kB / gzip 348.53 kB**；CSS 53.54 kB / gzip 13.38 kB。

## T1 宿主文档 + 写回前端：**PASS-WITH-UNVERIFIED**

- `node scripts/host-save-acceptance.mjs` → **64/64 PASS**（标题/状态栏、无改动不写、保存中、旧 id 丢弃、排队补发、10 秒超时、错误码、只读另存为、冷启动保留草稿/继续打开、转发、双 Ctrl+S 只一条消息、404 恢复草稿、6 MB 上限）。
- `node host/save-probe.mjs` → **21/21 PASS**（crlf/mixed/utf16/gbk/readonly/big13/huge33/notxt、PATH_CHANGED、伪造 path → BAD_REQUEST、前端不改保存）。
- 无 argv 启动（`.tmp/host-r6test`）：标题 **`Sidelight`**、无「宿主文件信息已失效」；正文是示例；写入 localStorage 草稿后重启，正文恢复 `DRAFT-R6-FIX`，无 404 横幅。
- 13.5 MB（`big10mb.md`，13,568,906 B）：显示「文件过大，暂不支持（上限 6 MB）。这个文件约 8.8 MB，这次没有载入正文……」；无 `Maximum call stack size exceeded`，不再停在示例文档。
- 5.9 MB 样本（`big5_9.md`）：标题 `big5_9.md — Sidelight`、正文长度 >1 MB、无错误横幅。
- 写回样本手工复验：`crlf-bom.md` 不改 Ctrl+S「没有改动，未写入」且 SHA 不变；改字后 SHA 变化、BOM `EF BB BF`、CRLF 计数 4 不变、`dirty=false`。GBK 中文无 U+FFFD，改字保存仍 GBK、无 `?`；UTF-16LE 保存保留 `FF FE` BOM；readonly 横幅且原 SHA 不变；33 MB 显示 413 错误。
- 安全：GET `/__doc` 200、`Cache-Control: no-store`、JSON 无完整路径；`Host: evil` 403；POST 405。
- **UNVERIFIED**：真实文件占用、网络盘、中文长路径、真人双击、真实系统保存对话框；这些本机无法造出稳定条件。

## T2 冷启动确认 / 转发 / 双击保存：**PASS**

- `host-save-acceptance` 的冷启动段：有草稿时弹「保留草稿 / 继续打开」；选保留正文仍是草稿、不显示「保存到」；选继续正文是宿主文件、`dirty=false`。
- 转发段：标题与状态栏切到 `forwarded.md`；`Ctrl+S` 写新文件；旧 `a.md` SHA 不变、新文件哈希变化。
- 连按两次 `Ctrl+S`：只发一条 save 消息；保存中再派发只排队一次，完成后补发一次，旧 id 回包被忽略。
- 上述均在 A 脚本 64/64 内，日志 `.tmp/r6fix-host-save.log`。

## T3 宿主写回协议 / 编码 / 原子替换：**PASS**

- `host/save-probe.mjs` **21/21 PASS**：UTF-8 BOM+CRLF、LF、mixed EOL、UTF-16LE BOM、GBK 严格解码/编码、readonly、big13 读写、huge33 413、notxt 409、PATH_CHANGED、伪造 path → BAD_REQUEST（样本与 `win.ini` 不变）、`Cache-Control: no-store`、无 CORS、无完整路径。
- `host-save-acceptance` 64/64 覆盖 save 请求无 `path/fileName/file`、id 幂等/排队、10 秒超时、失败重试、另存为后 forget、只读横幅。
- 手工补充：33 MB 可见 413 错误；Host/POST/Cache/路径安全全部通过。

## T4 安全与验收探针：**PASS**

- 手工 HTTP：`GET /__doc`（Host 正确）200 + JSON；`Host: evil` → **403**；`POST /__doc` → **405**；响应 `Cache-Control: no-store`；JSON 无 `C:\...` 路径。
- `save-probe` 伪造 `path` / `fileName` / `file` → `BAD_REQUEST`，样本与 `win.ini` SHA 不变；临时文件无残留。
- 33 MB → 413；notxt → 409；readonly → READONLY；均符合 ADR-0006。

## T5 版本 / 产物 / 文档：**PASS（ADR-0004 载荷旧值一项）**

- `package.json` 与 `package-lock.json` 均 **0.19.0**；`release/` 只有 `Sidelight-0.19.0-win-x64-portable.zip` **873,775 B**（`8E5C5798…A4D4`）与 `setup.exe` **794,843 B**（`649FBA92…A0E3`）。
- README/AGENTS/CHANGELOG 的 0.19.0、体积 **1,382,298**、两个 SHA、16 文件 177 条与实测一致；README/CHANGELOG 写「6 MB 上限」；旧数 1,381,995 / 873,641 / 794,620 / A7508F84 / 6B40B13C 0 命中；CHANGELOG 0.19.0 无 `[TBD]`。
- `docs/adr/0006-argv-writeback.md` 存在且协议与实测一致；它不含版本/体积/SHA 字段。
- **非阻断旧值**：`docs/adr/0004-webview2-host-before-admin.md:45` 写载荷 **2,374,078 B**（991,780 + 1,382,298），但当前 exe+dll 为 1,002,020，实测载荷 **2,384,318 B**；exe 在 T3 写回实现后增长 10,240 B，ADR 未同步。
- `docs/iteration/round-06/shots-untrack.txt` 的 30 个零引用截图已删除：`git status` 30 个 `D`，`git ls-files shots` 相应减少；未执行其他删除。
- `release/`、`host/bin/`、`dist/` 未入库；`npm test` 未挂新脚本，仍 177 条；无密钥/调试残留。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| keyboard-acceptance | **28/28 PASS** | `.tmp/r6-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r6-theme.log` |
| export-math-acceptance | **10/10 PASS** | `.tmp/r6-export-math.log` |
| acceptance dev 5173 | **11/11 PASS**（faces=20/20） | `.tmp/r6fix-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS**（faces=16/16） | `.tmp/r6fix-acceptance-prod.log` |
| host-smoke --fsa | **7/7 PASS**（标题「host-argv.md — Sidelight」、`navStarts=2`） | `.tmp/r6fix-host-smoke.log` |
| fcp-probe | **6/6 PASS**（FCP 212 ms、reload 64 ms、草稿/设置保留） | `.tmp/r6fix-fcp.log` |
| verify-installer 0.19.0 | exit 0；装/启/卸/数据保留 PASS；HKCU/开始菜单 3 项 UNVERIFIED | `.tmp/r6fix-verify-installer.log` |
| verify-portable | **6/6 PASS**、26 条目 | `.tmp/r6fix-verify-portable.log` |

## 范围与卫生

- `git status`：17 个已跟踪文件改动、30 个 `shots/round-05/` 删除、12 项未跟踪（`docs/adr/0006`、`docs/iteration/round-06/**`、`host/save-probe.mjs`、`scripts/host-save-acceptance.mjs`、`shots/round-06/**`、本报告）；`git diff --stat` 47 文件，987 insertions / 41 deletions。
- 30 个删除全部是 `shots/round-05/` 零引用图，无其他越界删除；新增/修改与任务文件清单一致。
- `release/`、`host/bin/`、`dist/` 未入库；无密钥、无调试残留；`package-lock` 0.19.0。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-{window,fsa}.png`、`shots/round-02/t4-portable.png` 被回归脚本重写（既有行为）。

## 与实施报告对照

- `impl-b.md` 的 T3/T4 结论（A 64/64、B 21/21、编码/只读/大文件 API）与我的复跑一致；13.5 MB 的 UI 修复也已复验（6 MB 上限、无栈错误、5.9 MB 可开）。
- `impl-a.md` 的 T1 结论与我的实测一致；初次验收发现的 13.5 MB 栈溢出与无 argv 404 草稿问题均已修复。
- 未发现验收项造假；ADR-0004 载荷数值是唯一非阻断文档旧值。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1、T2、T3、T4、T5 全部达到本轮计划验收；build（0 warning）/test（177）/roundtrip 通过；A 64/64、B 21/21、host-smoke 7/7、fcp 6/6、acceptance dev/prod 11/11、installer/portable 通过。
- **UNVERIFIED（不凑 PASS）**：真实文件占用、网络盘、中文长路径、真人双击、真实系统保存对话框、HKCU/快捷方式/默认安装路径。
- 非阻断：`ADR-0004` 载荷 2,374,078 与当前实测 2,384,318 差 10,240 B（exe 在 T3 后增长，文档未同步）；13.5 MB 提示里的「约 8.8 MB」是按正文长度估算，不是文件字节；30 张 shots 删除为计划内清理。
