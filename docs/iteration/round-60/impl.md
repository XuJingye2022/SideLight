# 第 60 轮 A 轮实现（executor）

HEAD `5384410`；dev `5175`；CDP 9222（E2E 前 `reset.mjs 9222`）。未 commit/push、未改版本、未动 `release/`。读数在 `.tmp/r60-impl-*.json`（`-before`=改前红）。

## A1 搜索 0 命中报跳过 + Enter 守卫（B-128）✅

`src/components/GlobalSearch.tsx`：`run()` 加 `busyRef` 同步闸门（`busy` 状态下一次渲染才生效，同 tick 双 Enter 仍读到 `false`，会并发两轮 `collectDocs`）；`collected/report/parts` 移到分支之前，0 命中与有命中共用「跳过 N 个 / 只显示前 200 处 / 文件太多」拼接。

`.tmp/e2e-r60-impl-a1-search.mjs`（3 文件，2 个 1.1 MiB）：note 改后「没有匹配的文本；跳过 2 个读不到或超过 1 MiB 的文件」，改前漏跳过句；empty「没有结果。」；同 tick 双 Enter 的 `getFile` 改后 3（上限 4）、改前 6。exit 0 / 改前 2。截图 `shots/round-60/a1-search-skip.png`。

## A2 点当前文档命中不重载（B-127）✅

`src/App.tsx` `openGlobalSearchHit`：先 `setQuery` + `setFindOpen`；`activeFile?.path === node.path` 时不调 `openWorkspaceFile`；编辑模式在 rAF 里聚焦 `.find-input`（`autoFocus` 只在挂载时生效，卸载还原焦点会抢回正文）。源码/预览下查找条锁定（`App.tsx:5352-5357`），只验编辑模式。

`.tmp/e2e-r60-impl-a2-samedoc.mjs`（1 MB 文档，`sidelight.settings.v1` 先关自动保存）：干净文档改后 `getFile(big.md)`/`sl-parse-done`/`scrollTop`/`innerText` 全 0 增量、`findValue`=锚点词、焦点=`.find-input`，改前 `getFile` +3、`sl-parse-done` +1；脏文档改后 `dirty` 仍 true、改动仍在、`getFile` 与 parse 0 增量、点回正文 Ctrl+Z 生效，改前 `getFile` +1。exit 0 / 改前 2。

## A3 发布预检判 Fail + 差距表 39/4（B-125）✅

- `packaging/verify-installer.ps1`：setup FileVersion 前三段 ≠ `package.json` 版本 → `Fail`；`-PreflightOnly` 收尾 `exit ([int]($script:failed -gt 0))`，summary 分 PASS/FAIL；payload 对比保留，改完补回 BOM。
- `docs/typora-gap.md`：文件列表/全局搜索/TOC 移入「有」（36→39），TOC 与 emoji 拆行（emoji 留「缺」），删两个空子节，缺 6→4，更新「建议的下一批」。`README.md:97`、`AGENTS.md:74` 改 39/4；`packaging/README.md:43` 改「版本不符记 FAIL、非零退出」。
- 验收：`-PreflightOnly` → `FAIL …0.31.1.0（前三段 0.31.1），package.json 是 0.32.1…` + `preflight FAIL（1 FAIL / 1 UNVERIFIED）`、exit 1（改前 UNVERIFIED / exit 0）；`-Setup host\bin\Sidelight.exe -PreflightOnly` → `preflight PASS（0 UNVERIFIED）`、exit 0；`.tmp/r60-impl-a3-gapcheck.mjs` → 表头 39/4 = 条目 39/4、子节 1/1/2 合计 4、exit 0；`Select-String` 的 `35 项`/`缺 7 项`/`36 项有`/`6 项缺`/`UNVERIFIED（不 FAIL）` 各 0（改前各 1）。

## 门禁

`npx tsc --noEmit` 0；`npm test` 0（40 文件，末段 0 失败）；`npm run verify` PASS，首屏 gzip **299,759 B**（内部 310,000 / 硬线 320,000）；`roundtrip` 未跑（未改编辑器/序列化）。改动文件：`src/components/GlobalSearch.tsx`、`src/App.tsx`、`packaging/verify-installer.ps1`、`packaging/README.md`、`docs/typora-gap.md`、`README.md`、`AGENTS.md`。

## CHANGELOG 一行建议

修复：全局搜索 0 命中也会报「跳过 N 个…」，连按回车不再重复读盘；点当前文档的命中不再整篇重载；`-PreflightOnly` 对旧批次包判 FAIL 并非零退出。

## 新踩坑

1. `edit` 工具改 `packaging/*.ps1` 会抹掉 UTF-8 BOM：Windows PowerShell 5.1 按 ANSI 读中文，改完要 `[IO.File]::WriteAllText($p, $text, New-Object Text.UTF8Encoding($true))` 补回，再用 `git diff` 确认首行没变。
2. `FindBar` 的 `autoFocus` 不可靠：`useDialogFocus` 的卸载清理是 passive effect，会在挂载期 `autoFocus` 之后把焦点还给打开者；要落在查找框得自己 rAF 聚焦。
3. PowerShell `ConvertFrom-Json` 读无 BOM 的 UTF-8 JSON 会按 ANSI 解码并报错：中文读数用 `read` 或 node。
