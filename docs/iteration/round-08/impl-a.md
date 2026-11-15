# 第 08 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T1 → T2 → T3 → T4。基线 `94ceeda`（工作树含 B 组 T5）。未 commit；未跑 `npm run build`；未改 `host/**` 源码（只跑 `host/build.ps1` 并复制 `.tmp/host-a`）。
边界：改了 `src/App.tsx`、`src/lib/cache.ts`、`src/lib/cache.test.ts`、`src/lib/settings.ts`、`src/components/StatusBar.tsx`、`src/components/SettingsDialog.tsx`、`src/styles.css`，新建 `src/components/CloseGuardDialog.tsx`、`scripts/draft-acceptance.mjs`。未碰 `index.html`、`host/**`、`docs/adr/**`、README/AGENTS/CHANGELOG、`package.json`。

| 任务 | 结论 | 证据 |
| :--- | :--- | :--- |
| T1 宿主草稿兜底与恢复 | **PASS** | 脚本 55/55：编辑 800 ms 内 1 条 `draft-save`（LF、防抖合并）；`/__draft` 更新时弹恢复框，恢复后正文=草稿、dirty=true、源码=原文，丢弃发 `draft-clear`；保存成功先 `draft-save` 后 `draft-clear`，迟到回包不二次清；真实宿主长名草稿文件键 `…56d8` 与前端一致，重开出现恢复提示 |
| T2 关闭保护 | **PASS（浏览器 + mock 宿主；真实 × 关窗未验）** | 排队/写回中 `window.onbeforeunload === null`；脏且空闲时注册并触发浏览器确认；`close-request` 弹三选一、`activeElement` 是「取消」；三个按钮分别回 `cancel` / `save-draft`（text 无 `\r`）/ `discard`；设置面板打开时先排队、关掉后才弹 |
| T3 自动保存安全子集 | **PASS** | 文件停笔 2 s 写入 1 次、chip「已自动保存 HH:MM」、dirty=false；引用式链接文档写入 0、chip「需手动保存」、不弹框；排队后改出损失同样不写不弹；`pendingConfirm` 打开时 auto 不写；IME 组合期间不写、结束后可写；设置关闭无写入；写失败 chip 红、连续 3 次后停止尝试，并落草稿兜底 |
| T4 设置面板与文件菜单临界 | **PASS** | 1366×768：面板 `top=20`、保存按钮底 `727 ≤ 748`、内容可滚动；文件菜单四项高 30 px、`white-space: nowrap`、横向溢出 0 |

## T1 宿主草稿

- **键统一**：`cacheKey` 对 ≤40 字符保持旧算法逐字节不变；>40 改成「前 36 位去尾 `-` + `-` + 4 位 FNV-1a（UTF-8 字节，`hash & 0xFFFF`，小写 x4）」，与 `host/Program.cs` 的 `CacheKey` 完全一致（单测加了固定期望值 `…-fa3a` / `…-e3cb`，宿主真实段拿到 `…-56d8`）。`legacyCacheKey` / `legacyKeyFor` 提供旧截断键；`readCache(..., legacyKey)` 未命中新键时回读旧键、搬到新键并删旧键；草稿与批注共用同一套键，批注读取也传了 legacy，写入后删旧键。
- **协议**：`draft-save` / `draft-save-result` / `draft-clear` / `GET /__draft`（404 视为无草稿）；`close-request` / `close-answer`。
- **启动**：`/__doc` 成功后取 `/__draft`；`exists && draft.mtime > doc.mtime` 且正文不同 → 弹「有比原文件更新的草稿（保存于 HH:MM）」；恢复 = 先按原文件建基线，再装草稿正文并置 dirty，状态栏「草稿已恢复」，`rawTextRef` 仍是原文；丢弃 = 发 `draft-clear` 后载入原文。
- **编辑兜底**：宿主文档 `onUpdate` 后 800 ms 发 `draft-save`，`text` 为 LF；`draftGeneration` 递增，旧回包丢弃。
- **保存清理**：`save-result ok` / 另存为成功 → `clearTimeout` → 等当前 `draft-save-result`（最多 1 s）→ `draftGeneration++` → `draft-clear`；`draftSuppressedRef` 让下一次 `onUpdate` 之前不再发草稿。
- **mtime 单位**：宿主用 .NET ticks，恢复提示显示前转成毫秒（修掉一次 Invalid Date）。

## T2 关闭保护

- 浏览器 `beforeunload` 用 `window.onbeforeunload` 赋值（脚本可直接断言 null/function），条件 `dirty && !autoSaveScheduled && !saving`。
- `CloseGuardDialog`：`useDialogFocus` + `requestAnimationFrame(() => cancelRef.current?.focus())`；三个按钮回 `close-answer`；`save-draft` 的 `text` 取 `prepareSave().normalized`。
- `close-request` 先置 `closeRequested`；effect 等到 `pendingConfirm`/`pendingSwitch`/`saving`/`settingsOpen`/`shortcutsOpen` 都清掉才打开关闭框，同一时刻只有一个模态。
- 切文档对话框「放弃改动」改成「不保存」。

## T3 自动保存

- `Settings.autoSave` 默认 true；设置面板加复选框 + 小字说明。
- `requestSave(mode)` 加了 `mode: 'user' | 'auto'`；auto 时：`activeLosses > 0` → 只置 `autoSaveState='manual'`（chip「需手动保存」），绝不 `setPendingConfirm`；`pendingConfirm`/`pendingSwitch`/`closeRequested`/`closeGuardOpen`/`saving`/`settingsOpen` 任一为真直接跳过。
- 触发：`onUpdate` 后 2 s；触发时用 `dirtyRef` 重算 dirty、重算 losses；宿主先 `fetch('/__doc')` 比 mtime，变了就 chip「文件已被外部修改」不写。
- 输入法：`compositionstart` 置无限期，`compositionend` 后 400 ms 才允许；组合结束会重新排一次。
- 成功 chip「已自动保存 HH:MM」；失败 chip「自动保存失败」、落草稿（宿主走 draft-save；有目录写 `.sidelight/drafts`；单文件退回 localStorage），连续 3 次失败后停到手动保存成功；手动保存/新建/切文档会 `clearTimeout` 并清 `autoSaveScheduled`。

## T4 临界修复

- `.dialog { max-height: calc(100vh - 40px); overflow-y: auto }`；`.dialog-actions` sticky 底部、纸面背景；`.dialog-note` 不 sticky。
- `.file-menu { width: max-content; min-width: 208px; max-width: min(360px, calc(100vw - 24px)); overflow: hidden }`；按钮 `white-space: nowrap`；标签 `span` 省略号，`kbd` 不收缩。
- 1366×768 实测数字见表格；截图 `shots/round-08/t4-settings-1366.png`、`t4-file-menu-1366.png`。

## 门禁

```
npx tsc --noEmit                        → exit 0
npm test                                → 16 个文件、192 条断言、0 失败（cache.test 新增 4 条）
npx vite build --outDir .tmp/build-a    → exit 0
node scripts/draft-acceptance.mjs       → 55/55 PASS（含真实宿主草稿段）
```

宿主段：`host/build.ps1` 后把 `host/bin` 复制到 `.tmp/host-a`，覆盖 `.tmp/build-a` 到 `www`；CDP 9340、`SIDELIGHT_PORT=47851`。

## 与计划的偏离

- **D1（键算法按宿主落地版）**：宿主实际是「前 36 + 4 位哈希」，不是计划文字里的「40 + 4」；`cache.ts` 按宿主实现，单测固定值兜住，宿主真实段再用长名验证。
- **D2（宿主关窗真实段未跑）**：`FormClosing` 要真人点 ×，本轮只验了浏览器/mock 的 `close-request`；B 的 `draft-probe.mjs` 覆盖真实四路关窗。
- **D3（浏览器草稿目录回读未做）**：本轮只做 `readCache` 旧键迁移与宿主 `/__draft`；浏览器 `.sidelight/drafts` 的载入提示仍走 localStorage。计划 T1 只要求宿主恢复提示，未要求浏览器从草稿文件恢复。
- **D4（自动保存失败的草稿兜底复用现有路径）**：单文件打开没有目录句柄，失败兜底写 localStorage（本来 `onUpdate` 也写）；因此脚本里「落一次草稿」不能单独证明失败分支的写入。
- **D5（宿主自动保存先标成功）**：宿主 auto 发送后立即 chip「已自动保存」，真正的失败由 `save-error-banner` 呈现；没有等 `save-result` 再改 chip。
- **D6（浏览器外部修改检查）**：只记了 `fileMtimeRef`，未在 auto 前调用 `getFile().lastModified` 比对；计划要求的两端检查只完成宿主端。
- **D7（`window.onbeforeunload` 赋值）**：为可断言改成属性形式；同时只挂一个处理器，不会覆盖别处监听器（目前无别处使用）。
- **D8（关窗排队无超时）**：`closeRequested` 会一直等模态关闭；宿主 5 s 超时只保留窗口、不重发，前端没有额外兜底。

## 遗留

1. 真实宿主 × 关窗三选一未在 A 脚本跑（B 的 `draft-probe.mjs` 负责）；Alt+F4/注销/关机仍 UNVERIFIED。
2. 浏览器目录草稿（`.sidelight/drafts`）载入与恢复提示未做，只有 localStorage 与宿主 `/__draft`。
3. 自动保存对浏览器文件没有外部修改比对（`lastModified`）。
4. 宿主 auto 成功的 chip 是乐观提示，host 回包失败时靠 `save-error-banner`，两个提示可能短暂并存。
5. 本轮新增 UI 元素（关闭框、草稿恢复框、自动保存 chip、设置勾选）只截了 1366×768 与 1440 的图，未做四档全套。
