# 第 57 轮验收（tester）

判定：**PASS-WITH-UNVERIFIED**（B1 / A2 / B2 的验收口全部过；宿主 WebView2 窗口内显示不可达，见末节）
轮前 startSha `c5fa04a`；验收后 commit 使 head 不同。

## 门禁（各跑一次）

- `npm run verify` → exit 0；`tsc --noEmit` 含在 build 里；首屏 gzip **297,823 B**（total raw 961,958），内部 310,000 余 12,177，硬线 320,000 余 22,177。日志 `.tmp/test-r57-verify.log`。
- `npm test` → **37 个文件 473 条，fail 0**（`ℹ tests` 求和；`.tmp/test-r57-npmtest.log`）。A2 文本里的 470 是「只做 A2」的增量口径：473 = 470 + B1 的 3 条 `assetResolve` 新测，非缺测。
- `powershell -ExecutionPolicy Bypass -File host\build.ps1` → OK `host\bin\Sidelight.exe`（3 条既有 warning，0 error）；`--version` = **0.32.1**（PowerShell 管道收不到 winexe 的 stdout，用 `cmd /c "... > file"` 取到；FileVersion 0.32.1.0）。日志 `.tmp/test-r57-hostbuild.log`。

## B1 宿主 `/__asset`：PASS（端点层）

自写探针 `.tmp/r57-tester-asset.ps1`（不读 impl 日志，自带夹具 `.tmp/r57-host/docs/`：`图 1.jpg`、`sub/a.png`，上级 `.tmp/r57-host/secret.txt`；宿主以 `SIDELIGHT_PORT=47901` 起并载入 `docs/probe.md`），输出 `.tmp/r57-tester-asset.log`：

| 请求 | 结果 |
| :--- | :--- |
| `/__asset?path=%E5%9B%BE%201.jpg`（图 1.jpg） | **200**，`image/jpeg`，16 B，SHA256 `122922E9…56F7` 与源文件同 |
| `?path=../secret.txt` | **403** |
| `?path=%2e%2e%2fsecret.txt` | **403** |
| `?path=/docs/abs.png`（绝对路径） | **403** |
| `?path=..%5Csecret.txt`（反斜杠） | **403** |
| `?path=sub/a.png` | 200，`image/png`（文档目录内子目录允许） |
| `?path=missing.png` / `?path=probe.md` | 404 / 404（非位图按 404） |
| `/__asset`（无 path） | 400 |

九次响应均**没有** `Access-Control-Allow-Origin`，`Cache-Control: no-store`；`/__doc` 仍 200 且不含仓库根路径。前端 `hostAssetUrl()`（越界口径与 `resolveAssetSegments` 一致）由 `npm test` 的 5 条新测覆盖；`src/App.tsx:4509-4520` 在 `hostDoc?.ready` 下改走 `/__asset`，与工作区 FSA 解析器写在同一个 effect，互斥覆盖风险已消除。

## A2 暖纸弱文字：PASS

- 静态（可直接复算）：`html[data-theme='sepia']` 的 `--ink-faint` 已从 `#7a6b54` 变 `#736349`，`--paper #f4e8d2` → **4.798:1**，`--panel #efe2c9` → **4.541:1**（改前 4.267 / 4.039，红→绿）；亮度高于 `--ink-soft #6b5d48`（层次未反）。`src/styles.css:77` 与 `src/lib/themes.ts:24` 同值，`themes.test.ts` 的「清单值 = CSS 值」仍过。
- E2E 真浏览器（CDP 9222，`.tmp/e2e-r57-tester.mjs`，日志 `.tmp/r57-tester-e2e.log`）：走设置面板点「暖纸」再保存，`data-theme=sepia`；造出选区得到 `.status-chip-quiet`：`rgb(115,99,73)` on `rgb(244,232,210)` = **4.798**；`.file-tree-empty-sub` 同为 **4.798**（12 px），两项 ≥4.5。截图 `shots/round-56/sepia-faint-fixed.png`。

## B2 设置面板页脚：PASS

同一脚本量两档（`.dialog` / `.dialog-actions`，矩形取整）：

| 视口 | 框 | 页脚 | footer.bottom ≤ dialog.bottom | 距框底 | overflow |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1440×900 | 20–880 | 822–859 | **是** | 21 px | 152（1010−858） |
| 1000×620 | 20–600 | 542–579 | **是** | 21 px | 432（1010−578） |

- 高度上限未动：两档 computed `max-height` = 860 / 580 px（`calc(100vh - 40px)`），`padding-bottom` 20 px。
- 滚到底：最后一块内容底 808 / 528，页脚顶 822 / 542，内容不再被 sticky 底板永久压住；新加的 `border-top: 1px` computed 1 px，截图里分隔线可见。
- 任务文本里的「现 78 px」是第 54 轮旧读数（当时 `scrollHeight 936`）；第 55 轮加主题按钮行后内容变高，现值为上表 152 / 432 —— 记录口径已更新，不是回归。
- 截图 `shots/round-56/settings-footer-1000x620.png`（1000×620、滚到底）。

## 回归

- `node scripts/theme-acceptance.mjs http://localhost:5175` → **27/27 PASS**，48 样本矩阵 applicable 43/48 全过（`.tmp/r57-tester-reg-theme.log`）。该脚本会覆盖 `shots/round-05/t2-*.png`，已 `git checkout -- shots/round-05` 还原。
- E2E 页面 0 条 console error / pageerror（脚本 `ERRORS []`）。

## UNVERIFIED

- 宿主 WebView2 窗口里「单文件文档的相对图真的画出来」：本机会话 `CreateCoreWebView2ControllerAsync` 报 `0x8000FFFF`，宿主日志 `host/bin/host.log` 的 `INIT-FAIL`；loopback 在 init 失败后仍可服务（本次端点用的是同一真实宿主进程），但窗口渲染不可达，也没有 CDP 9339 可连。
- `/__asset` 的 HEAD 分支与 `Host` 头不匹配 → 403 分支未单独测（`Host` 校验代码与 `/__doc` 同源，仅静态看）。
- 真实磁盘/FSA 保存字节、真实中文 IME 与本轮改动无关，沿用前几轮的 UNVERIFIED。
