# 第 82 轮计划审查（critic）

结论：**PASS-WITH-NOTES**（无 P0/P1，5 条 P2 修法）。审 A1/A2 两条高风险（App 启动链、共享对话框 hook）；A3 只核文件与选择器存在性。

## 环境复核（影响验收可复现性）
- dev `localhost:5175` 返回 200，但只监听 `[::1]:5175`（pid 13528）——用 `127.0.0.1:5175` 探是 False，别据此判「dev 没起」。
- 9222 无监听；ego CDP **54280 LISTENING**（pid 90032）。计划「CDP 不可用改 ego 54280」可行，真机门按 54280 走。
- `.tmp/e2e-r79-a3-note-actions.mjs` 存在，A3 复用成立。

## 事实核对（均成立）
- `assetImage.ts:56` 确为 `isRelativeAsset(src) && getAssetDocPath() !== ''`；`App.tsx:1254`/`:2375` 与计划一致。
- `setMarkdown` 同步 dispatch（`App.tsx:1198-1201`）→「装 resolver 早于 setMarkdown」有效；`:2373-2375` 既有注释本来就要求这个顺序。host 侧 `recoverHostDraft`（`:3628`）先 `applyHostPayload` 再二次 `setMarkdown`（`:3635`），入口覆盖够。
- `useDialogFocus.ts:34-35` 取 `focusables()[0]`；`:48-63` 首尾都用未过滤数组（`FOCUSABLE` 的 `button:not([disabled])` 命中全部 radio）→ 诊断成立。`radioGroup.ts:36-39` 保证组内恰 1 个 `tabIndex=0`；主题组是 DOM 第一个可聚焦区（`SettingsDialog.tsx:74-93`）→ `tabbables()[0]` 必是选中项。
- `styles.css:1612-1617`（`.toolbar-group > button`）、`:1933-1945`（`.stats-trigger`）、`:1388-1395`（只核）行号对齐；斜体钮 `App.tsx:5659`、父组 `:5624`；`:131-133` 是 `box-sizing:border-box` → `min-width:24px` 即总宽 24，不会把钮撑到 40。`min-width: 24px` 改前全文件 0 处。
- QuickOpen 首个可聚焦是 `.quick-open-input`（`QuickOpen.tsx:62-64`，关闭钮在后）→ A2 ④ 不会假红。

## 漏洞与修法
| ID | 级别 | 问题 | 修法 |
| :-- | :-- | :-- | :-- |
| R82-1 | P2 | A2 验收②括号「改前 Shift+Tab 离框」不成立：改前初始焦点是 `focusables()[0]`=「浅色」，它本身就是 Tab 环 `first`，Shift+Tab 同样回绕到「保存」，与改后同果。真正区分的是第二步（「保存」按 Tab 回绕目标：改前落 `tabIndex=-1` 的「浅色」，改后落选中项） | 删该括号断言；before/after 对照只记「保存→Tab 后的 activeElement」，改前存「浅色」读数 |
| R82-2 | P2 | A1 新标志置/清点少了 2 处：`hostModeRef` 有 5 处赋值（`App.tsx:1256,1338,2427,3023,3123`），计划只同步 3 处。`:3023`（保留草稿）与 `:3123`（另存为后退出宿主）会把 `true` 留下；无工作区时后续相对图从「浏览器破图」变「图片未找到」占位（无数据风险） | `setHostAssetMode` 与 `hostModeRef.current =` 成对写（抽 `markHostMode(bool)` 一次写完两处）；E2E 至少覆盖一次宿主→普通文档 |
| R82-3 | P2 | A1 的「`/__asset` 恰 1」易假红：dev 是 `StrictMode`，载入 effect 双跑，且 `App.tsx:4953-4955` 的 cleanup 会 `clearAssetCache()` 推代际，前一次 bind 与后一次可能各发一次 | 门槛改 `裸请求 === 0 && /__asset 请求数 >= 1`；精确次数只写日志，或按 URL 去重后再断 |
| R82-4 | P2 | A1「两个 resolver 抽成 `useCallback`」没写依赖：若把回调加进 `:4981` 的 effect 依赖且回调不稳定，setup/cleanup 每渲染跑一次，`clearAssetCache()` 反复清缓存、图片反复解析 | 明确 `useCallback(..., [])`（函数体只读 `workspaceRef`/`hostAssetUrl`），effect 依赖保持 `[workspace, editor, hostDoc]` 不动 |
| R82-5 | P2 | A3 验收只写「记最小项」，改前最小可能不是斜体钮（`< >` 那类窄钮未必 21 px），改后也看不出是哪钮达标 | 改前/改后各记三个具名 rect：`.toolbar button.italic`、`.stats-trigger`、`.note-actions button`；另记 1000×620 的工具栏换行数与 `scrollWidth-clientWidth` 作负向对照 |

## 未审
三条在 BACKLOG 均为 P2，只审其高风险面（启动链 / 共享 hook）；BACKLOG 收口由 scribe 批末处理。
