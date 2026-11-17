# 第 57 轮实现（executor）

startSha `c5fa04a`，三任务全做、无回滚。门禁：`tsc --noEmit` 0；`npm test` 37 文件 **473 条**全绿；`npm run verify` PASS（gzip **297,823 B**）。

## B1 B-004 宿主 `/__asset`（完成）

- `host/Program.cs`：`MimeMap` 补 `.jpg/.jpeg/.webp/.gif/.bmp`；`AssetImageExtensions` 白名单（不放 svg：能在宿主 origin 跑脚本）；先存 `rawTarget` 再截 query，新增 `HandleAssetRequest`（同 `/__doc` 的 Host 校验、只 GET/HEAD、`path` 先 `UnescapeDataString`（失败 400）再拒 `/` 开头、`\`、`..`、`:`、空；`GetFullPath` 须在文档目录前缀内；白名单 + 存在性；`WriteResponse` 自带 `no-store`、无 CORS）与 `QueryParam`。
- `src/lib/assetResolve.ts`：纯函数 `hostAssetUrl`（编码正常化后的相对路径；非相对、`/` 开头、`\`、`:`、解码后 `..` 或 `/` 一律 null）。
- `src/App.tsx:4509-4544`：两个分支写进**同一个** effect（`hostDoc.ready` → `hostAssetUrl`，否则 FSA），分开写会互相覆盖。
- `assetResolve.test.ts`：+3 条。

证据 `.tmp/r57-b1-asset.log`（`.tmp/e2e-r57-b1-asset.mjs`，直连宿主 loopback）**10/10 PASS**：`?path=图 1.jpg` 200 + `image/jpeg` + sha256 同源；`cors=null`、`no-store`；`../`、`%2e%2e%2f…`、`/abs.png` 均 403；`missing.png`、`示例.md` 404；无 `path` 400；`/__doc` 回归 200 不泄路径。`host\build.ps1` 过（bin 4,910,680 B），`--version` **0.32.1**。

**UNVERIFIED**：宿主窗口内真图渲染——本沙箱 WebView2 初始化失败（`host/bin/host.log` 的 `INIT-FAIL … 0x8000FFFF`），loopback 仍起（端点结论有效），`.tmp/e2e-r57-b1-host-render.mjs` 未过。

## A2 B-118 暖纸弱文字（完成）

`styles.css:77` 与 `themes.ts:24` 同改 `--ink-faint: #7a6b54 → #736349`（paper **4.798** / panel **4.541**，亮度 0.1305 > `--ink-soft` 0.1142）。`themes.test.ts` 抽出 `cssVars(selector)`（P2-2 扩 helper，没删子项），+3 条：暖纸双底 ≥4.5 且比 soft 浅、`:root` 与深色档同口径、两个入口都吃 `var(--ink-faint)`。

证据 `.tmp/r57-a2-contrast.log`（CDP 9222，`data-theme=sepia`）两条 computed **4.798 / 4.798**；截图 `shots/round-56/sepia-faint-fixed.png`。注：空工作区下背景落到 body 的 `--paper`，panel 档由单测覆盖。

## B2 B-108 设置面板页脚（完成，前提已变）

**计划前提在 HEAD 上不成立**：`.dialog` 本有 `padding: 20px`，两档两位置 `footer.bottom ≤ dialog.bottom`、间距 21 px 全成立，「切字/出框」不复现（同第 54 轮）。真残项只有溢出：`scrollHeight-clientHeight` = **152 px**（1440×900）/ **432 px**（1000×620），BACKLOG 的 78 px 已被第 55 轮主题选项撑大。最小改动：`.dialog-actions` 加 `border-top: 1px solid var(--line)`；高度上限未动。

证据 `.tmp/r57-b2-dialog-after.log`：两档 ×（顶/底）`footerInside=true`、`gap=21`、`overflow=152/432`；聚焦 `.dialog-textarea` 后 `fieldBottom 426 < footerTop 542`。截图 `shots/round-56/settings-footer-1000x620.png`。

## 收尾

467 → 470（B1）→ **473**（A2）；改 7 文件，无新依赖、未改版本、未动 `release/`。
CHANGELOG 一行：`- 宿主单文件打开时正文相对图片能显示（新增 /__asset，只回文档目录下的 png/jpg/jpeg/webp/gif/bmp，越界与 ../ 403、无 CORS）；暖纸弱文字 --ink-faint 提到 AA（paper 4.80 / panel 4.54）；设置面板页脚加分隔线。`

## 新踩坑

1. `$out = & Sidelight.exe --version` 不捕获输出（winexe 无控制台，PowerShell 赋值形式不等不读）；要用 `| Out-String` 或重定向。
2. WebView2 初始化失败时 `RunErrorForm` 会挂住宿主进程，第二次 spawn 被单实例 mutex 转发后即退，CDP 永远连不上；判宿主没起来先看 `host/bin/host.log` 的 `INIT-FAIL`；此时 loopback 仍可用。
3. `.status-chip-quiet` 开局不存在（要有选区/元数据/宿主文件名）；E2E 须先点段落、打字、`Shift+Home`，否则断言恒 missing。
