# 第 06 轮 · 实施报告 B（builder2）

执行人：builder2。顺序 T3 → T4 → T5，均完成。未 commit、未跑 `npm run build`；`src/**`、`index.html`、`scripts/` 未改。结束 `Sidelight` 进程 0。

---

## T3 宿主 `/__doc` 与写回通道 —— 完成

### 改动

- `host/Program.cs`（约 +420 行）
  - `GET /__doc`：只认 `Host: 127.0.0.1:47821`（否则 403）、只 GET（其余 405）、`Cache-Control: no-store`、无 CORS、JSON 无完整路径。无当前文档 404；文件没了 409 `FILE_GONE`；>32 MB 413 `TOO_LARGE`；编码判不出 409 `ENCODING`。成功回 `{v,ok,fileName,encoding,bom,eol,endsWithNewline,lineCount,size,mtime,readOnly,text}`（text 为 LF）。
  - 编码判定：BOM（UTF-8 / UTF-16LE / UTF-16BE）→ 严格 UTF-8（`new UTF8Encoding(false,true)`）→ 严格 GBK（`Encoding.GetEncoding(936, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback)`）；都失败或解出 NUL → `ENCODING`。**从不使用替换回退**。
  - `WebMessageReceived`：只接受来源 `http://127.0.0.1:47821/index.html`；`save`（`id` 幂等、`text` ≤32 MB）与 `forget`；消息里出现 `path` / `fileName` / `file` 任一字段 → `BAD_REQUEST`，不写盘；只写宿主 `currentPath`。
  - 写回：不改不写（正文与打开时相同 → 回 ok、不碰磁盘）；`ReadOnly` 属性 → `READONLY`；`mtime`（`LastWriteTimeUtc.Ticks`）或 `size` 变化 → `PATH_CHANGED`；按原 EOL 还原（crlf/lf，mixed 用逐行序列且行数不符 → `EOL_MISMATCH`）；按原编码严格编码（失败 → `ENCODING`，绝不写 `?`）；有 BOM 才补；结尾换行按 `endsWithNewline`。
  - 原子写：同目录 `.sidelight-tmp-<guid>` + `Flush(true)` → `File.Replace(temp, target, null)`；失败回退 `MoveFileEx(temp, target, REPLACE_EXISTING|WRITE_THROUGH)`（P/Invoke）；**无任何 `File.Copy` 直写目标**；失败删临时文件、原文件不变。
  - 启动 argv 与单实例转发都 `SetCurrentDoc`（转发先更新再 reload）；目录 argv → `FILE_GONE`。
- `host/build.ps1`：加 `/r:System.Web.Extensions.dll`（`JavaScriptSerializer`）。
- `docs/adr/0006-argv-writeback.md`（新）：背景、决定（宿主唯一写者 / 页面不拿路径 / 不注入 `window.__sidelightHost` / 信息只从 `/__doc` 取）、协议表与错误码、编码与 EOL 规则、原子写与回退、生命周期、边界（只覆盖当前文件，页面被攻破最坏覆盖这一个）、否决方案、验收。

### 证据

```text
GET /__doc -> 200  Cache-Control: no-store  JSON 无 D:\ 或 Documents 路径
Host: evil -> 403      POST /__doc -> 405
```

探针实测（见 T4）覆盖：BOM/CRLF、LF、mixed、UTF-16LE、GBK、只读、13.5 MB、33 MB、非法字节、PATH_CHANGED、伪造 path、前端 Ctrl+S。

**调试中发现并修掉一个真 bug**：`File.Replace` 的参数顺序写反（`Replace(target, temp)` 会把目标移进临时文件、目标消失）。探针的 UTF-16 保存用例暴露了它（目标文件失踪、临时文件残留旧内容），改成 `File.Replace(temp, target, null)` 后恢复；这正是「原子写必须实测」的理由。

---

## T4 写回验收探针 + CHANGELOG 0.19.0 + 文档状态 —— 完成

### 改动

- `host/save-probe.mjs`（新）：快照 `host/bin` 到 `.tmp/host-r6/host`（www 优先用 A 组 `.tmp/build-a`，否则 `dist`），生成 9 类样本到 `.tmp/host-r6/samples`，CDP 9338 逐样本起宿主。
- `docs/CHANGELOG.md`：加 `## 0.19.0 — 2026-11-15`（写回通道、BOM/EOL/mixed、严格 GBK、原子替换、`/__doc` 授权、10 s 超时、转发可写、横幅改文案、测试 16/177、体积 `[TBD]`、未验清单）；0.18.0 的「快捷键清单见 README」改成实际快捷键。
- `README.md`：修 `:32` 的 `` `n- 双击 `` 字面量（拆成三条列表）、删「主题切换」、`171` → `177`、安装包名 `0.19.0`、ADR 范围 `0001–0006`、加 ADR-0006 决策行、宿主层写回说明、体积数字改 `[TBD]`（0.19.0 重建后回填）。
- `AGENTS.md`：版本 0.19.0、§3 测试数口径 0.19.0、§6 静止句「只能另存为」改成可写回、未验清单加「写回（文件占用/只读/网络盘/中文路径/真人双击）」。
- `packaging/README.md`：`.md` 关联本轮不做（含 `OpenWithProgids` 备忘），体积预算 850,000 B / 预计 +3 KB。

### 探针实测（两次运行都 21/21 PASS，exit 0）

```text
PASS crlf-bom：UTF-8 BOM + CRLF 判定
PASS __doc：Cache-Control no-store、无 CORS、无完整路径
PASS lf：LF 无 BOM 判定
PASS mixed：混合换行判定 / 行数变化 → EOL_MISMATCH / 同行数保存保留逐行 EOL
PASS utf16le-bom：UTF-16LE + BOM 判定 / 保存保留 BOM 与 UTF-16LE
PASS gbk：严格解码无 U+FFFD / 不改保存 SHA 不变 / 保存严格 GBK 不写 ?
PASS readonly：readOnly=true、保存回 READONLY、SHA 不变、无临时文件残留
PASS big13：13.5 MB 打开并写回
PASS huge33：33 MB → 413 TOO_LARGE
PASS notxt：非法字节 → 409 ENCODING
PASS 外部改文件后保存 → PATH_CHANGED、不写盘
PASS 伪造 path → BAD_REQUEST，样本与 win.ini 都不变
PASS 前端 Ctrl+S 不改保存：SHA 不变（docFetches=1）
PASS 前端输入后保存：BOM/CRLF 保留、dirty=false、SHA 变化
summary: 21/21 PASS
```

前端两段走真实 `Ctrl+S`（A 组的 `.tmp/build-a` 已接 `/__doc`），不是直接发 `postMessage`。

### 门禁

`npm test` exit 0；`Select-String README.md` 的 `` `n- 双击 `` /「主题切换」/「171 条」/`0.18.0-win-x64-setup` 全部 **0 命中**；CHANGELOG 有 0.19.0、AGENTS 有 0.19.0。

---

## T5 版本 0.19.0、shots 清单、产物重建 —— 完成

- `package.json` → `"version": "0.19.0"`；`package-lock.json` 未动（等根代理 `npm install --package-lock-only`）。
- `.tmp/shots-zero.csv`：**30 行 / 2,007,292 B**（排除 `shots/round-06`、`.git`、`node_modules`、`release`、`.tmp`、`shots` 自身），每一条都在 `git ls-files shots` 里；与 STATE 的「43 个 / 3.1 MB」旧数差 13 个，原因是本轮重扫（`round-05` 30 个是唯一历史零引用）。
- 执行（交给根代理，我不跑 git 写操作）：

  ```powershell
  $paths = (Import-Csv .tmp/shots-zero.csv).Path
  git rm -- $paths
  ```

  删除后 `shots` 约 184 个 / 14.38 MB。删除前抽 2–3 个人工确认（文件名匹配可能漏「只写路径」的引用）。
- 产物重建顺序（根代理）：`npm run build` → `host/build.ps1` → `packaging/installer.ps1` → `packaging/portable.ps1`，记字节与 SHA256 回填 CHANGELOG/README 的 `[TBD]`；安装包硬线 850,000 B，预计 791–793 KB。
- `.md` 关联本轮不做（`packaging/installer.nsi` 中 `OpenWithProgids` / `UserChoice` **0 命中**，未写任何关联注册表）。

---

## 遗留

1. **`[TBD]` 待回填**：README 打包产物体积、宿主层安装包/zip 字节与 SHA；CHANGELOG 0.19.0 的「体积」。取最终重建实测。
2. `package-lock.json` 仍 0.18.0，等根代理同步。
3. `.tmp/shots-zero.csv` 的 `git rm` 由根代理执行；本轮未删任何截图。
4. 未验：文件被占用（`FILE_LOCKED` 分支未在探针覆盖）、网络盘、中文长路径、真人双击下的写回与保存对话框、`.md` 关联（本轮不做）。

---

## 收尾补记（0.19.0 产物重建 + A 组修复后）

- **大文件口径改成 6 MB**：A 组查明 13.5 MB 的根因是 marked 词法器爆栈，现改为解析上限 **6 MB**；超过时显示「文件过大，暂不支持（上限 6 MB）」并清空正文，不再停在示例。README/CHANGELOG 的「13.5 MB 实测可打开」已按此改写，并写明「正文不再走 localStorage，改由 `/__doc` + `postMessage` 承载」。
- **最终产物**：dist **1,382,298 B**；便携 zip **873,775 B**（SHA256 `8E5C57986AF3515DA37A8683BC2A250C4184F85F9B06B18C9D63710EDA48A4D4`）；setup **794,843 B**（SHA256 `649FBA924E14F8AB12F409CE49065E53AE8CB9989D6C435D5E8424A2E204A0E3`）。README/CHANGELOG/ADR-0004 已更新，ADR 载荷 **2,374,078 B**（991,780 + 1,382,298）。
- **复验**：`node scripts/host-smoke.mjs --fsa` **7/7 PASS**（标题断言已改成「以 Sidelight 结尾」，因为产品标题现在是「文件名 — Sidelight」）；`node host/fcp-probe.mjs` **6/6 PASS** —— A 的 404 回退修复后，第二次冷启动（无 argv）能正确回退到草稿，先前的 5/6 失败已消失。
- 旧体积/SHA（1,381,995 / 873,641 / 794,620 / 上一版两个 SHA / 2,373,775）在 README/CHANGELOG/ADR 中 0 命中。