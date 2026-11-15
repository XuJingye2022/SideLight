# 第 06 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T1 → T2（串行）。基线 `d8e84a4`。未 commit；未跑 `npm run build`（`npx tsc --noEmit` + `npx vite build --outDir .tmp/build-a`）；未装依赖。
边界：只改 `src/App.tsx`、`src/components/StatusBar.tsx`、`src/styles.css`，新建 `scripts/host-save-acceptance.mjs`；未碰 `host/**`、`docs/adr/0006-*`、CHANGELOG、README、AGENTS、`package.json`、`packaging/**`。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 宿主 `/__doc` + 写回状态机 | **PASS**（浏览器 + 宿主两段都跑） | 脚本 56/56：宿主 crlf-bom.md 打开标题/状态栏正确、不改 Ctrl+S SHA 不变、改字 Ctrl+S 后 BOM+CRLF 保留且哈希变化；写回失败/超时/旧 id/非 JSON/500 全有可见错误 |
| T2 草稿确认 + 转发 + 切文档守卫 | **PASS**（宿主段含转发实测） | 冷启动草稿两分支（保留草稿走 picker / 继续打开载入宿主正文）；保存中新建等回包后执行，旧回包不清新文档；转发 b.md 后标题/状态栏/写回目标都切换，a.md 哈希不变 |

## T1 宿主文档经 `/__doc` 打开 + 写回状态机

### 改动

- **启动握手**：`fetch('/__doc', { cache: 'no-store' })`；页面不注入任何宿主对象。
  - `200 + JSON + v===1` → 用 `text`（LF）/`fileName`/`eol`/`readOnly`/`mtime` 初始化正文、`docName`、`baselineRef`、`originalText`、`eolRef`、`risks`、`hostDoc={writable:!readOnly,fileName,mtime,ready:true}`，`document.title` 写 `<文件名> — Sidelight`。
  - 网络异常 / 5xx / 200 非 JSON（非 HTML）/ `{ok:false}` / `v!==1` → `host-error-banner`（`role="alert"`）可见，`hostDoc=null`，**清空正文且不回退 localStorage 旧草稿**（`hostUnavailable`）。
  - dev 的 SPA fallback（`text/html`）→ 按普通浏览器启动，不误报。
- **写回状态机（唯一一套）**：`saving` + `pendingSaveRef` + `pendingIdsRef` + 递增 `id` + 10 s 计时器。`dirty===false` 且宿主文档 → 不发消息，提示「没有改动，未写入。」（1.5 s）；发送 `{v:1,type:'save',id,text}`，**不含 path/fileName/file**；只接受 `pendingIds` 里的 `save-result`；成功才 `baselineRef`/`originalText`/`mtime`/`dirty` 一起更新；失败/超时保留 dirty 与 `hostDoc`，`save-error-banner` 给中文原因 +「重试 / 另存为」。
- **保存中再按**：只记最新一份（`pendingSaveRef`），回包后补发；旧 id 与晚到回包一律丢弃。
- **另存为**：成功后发 `{v:1,type:'forget'}`、清 `hostDoc`、退出宿主模式，之后 `Ctrl+S` 走句柄/另存为。
- **名称与状态**：`document.title`、状态栏「保存到 <文件名>」（`title="Ctrl+S 保存到这个文件"`）、顶栏文档名 `title="保存会写回这个文件"`；保存按钮在写回中显示「保存中…」并带 `aria-busy`。
- **只读**：只由 `/__doc` 的 `readOnly` 决定，横幅文案「这个文件目前不能写回。保存会请你另选位置。」+「另存为」；旧 localStorage `readOnly` 字段读到即清除，不再从草稿恢复。

### 证据（`node scripts/host-save-acceptance.mjs`，all = 浏览器 + 宿主）

浏览器段（mock `/__doc` + mock `chrome.webview`）：

```
宿主文档：标题/状态栏/正文正确，无横幅
不改 Ctrl+S：提示「没有改动，未写入。」、没有发 save 消息
改字后 Ctrl+S：消息键只有 [id,text,type,v]、text 是 LF、按钮「保存中…」→ 回包后「保存」、提示「已保存到」、dirty=false
保存中再按：只发 1 条；旧 id 回包被忽略（dirty 仍 true）；正确回包后补发第 2 条
10 秒超时：可见「保存超时…」、dirty 仍 true
失败码 PATH_CHANGED：中文原因「外部修改过…」、可重试
200 非 JSON / 500：可见错误横幅，正文不回退旧草稿（注入 OLD-DRAFT 验证）
只读：横幅「不能写回」；Ctrl+S 走 picker，不发 save；另存为后发 forget
```

宿主段（`.tmp/host-a`，当前 `host/bin` + `.tmp/build-a` 覆盖 `www`；CDP 9337、`SIDELIGHT_PORT=47841`）：

```
宿主：标题 crlf-bom.md — Sidelight、状态栏「保存到 crlf-bom.md」、无只读横幅
宿主：不改 Ctrl+S 提示「没有改动，未写入」、原文件 SHA 不变 (1E3907997F…)
宿主：改字 Ctrl+S 提示「已保存到」、dirty=false、哈希变化 (…→E48B2E7439…)
宿主：BOM 保留 efbbbf、CRLF 保留
转发：标题/状态栏切到 forwarded.md；Ctrl+S 写新文件；旧 a.md 哈希不变；forwarded.md 哈希变化
56/56 PASS
```

截图：`shots/round-06/t1-host-doc.png`、`t1-host-saved.png`、`t1-host-error.png`、`t1-save-error.png`。

## T2 冷启动草稿确认、转发刷新、切文档守卫

- **草稿确认**：`/__doc` 成功且 `localStorage['sidelight.doc.v1']` 有 `savedAt>0` 且正文不同 → 页面内对话框「有未保存的草稿（保存于 HH:MM）。打开 <文件名> 会替换它。」+「保留草稿 / 继续打开」。
  - 保留草稿 → 不载入宿主正文、`hostDoc=null`、`hostMode=false`，提示「已保留本地草稿…保存会走另存为」。
  - 继续打开 → `applyHostPayload` 载入宿主正文，`dirty=false`。
- **转发刷新**：宿主先更新当前文件再 reload；页面重新 `fetch('/__doc')` 取新 `fileName`，标题、状态栏、写回目标随之切换；`/__doc` 失效（404 JSON）时清 `hostDoc` 并提示「宿主文件信息已失效（404）。保存请用「另存为」。」
- **切文档守卫**：`requestLoad` 与 `startNewDocument` 先 `await waitForHostSave()`（等回包或超时）再执行；`hostSaveWaitersRef` 只做等待队列，没有复制 `saving` 状态。切到普通文档时 `loadIntoEditor` 清 `hostDoc` 并退出宿主模式；旧回包因 `hostDoc` 已空被丢弃，不改新文档 dirty；正在等切文档时不弹旧文档的「已保存到」。

### 证据

```
冷启动有草稿：弹确认框；保留草稿 → 正文仍草稿、无「保存到」、Ctrl+S 走 picker；
                继续打开 → 正文是宿主文件、dirty=false
保存中新建：弹未保存确认；放弃后等回包；新文档正文空、dirty=false、
            不显示旧文档「已保存到」、标题回到 Sidelight
转发：标题与状态栏 forwarded.md；写回 forwarded.md；旧 a.md 哈希不变
```

## tester FAIL 后的修复（第 06 轮复验前）

tester 判 FAIL 的两项都在前端，已修：

1. **无 argv 启动 `/__doc` 404**：原来 404 JSON 走 `hostUnavailable`，清空正文并显示「宿主文件信息已失效（404）」。现在 404 一律当作「宿主没有当前文档」，直接按普通浏览器启动，草稿/示例照常恢复，不显示错误横幅。宿主实测：无 argv 启动标题 `Sidelight`、无横幅、正文来自 localStorage 草稿（12 字），控制台 0 错误；截图 `shots/round-06/t1-no-argv.png`。
2. **13.5 MB 文件停在示例 + RangeError**：抓到的栈是 **Tiptap Markdown 的 marked 词法器爆栈**，不是我们的代码：
   ```
   RangeError: Maximum call stack size exceeded
     at RegExp.exec
     at w.lheading (@tiptap_markdown.js)
     at u.blockTokens … u.lex … MarkdownManager.parse
     at App.tsx setMarkdown / applyHostPayload
   ```
   `big13.md` 是一行 14,155,777 字符的 `aaaa…`；marked 17 的 `lheading` 正则对超长单行递归，实测单行 6 MB 可解析、8 MB 起必爆栈（本机 node 直接验 `marked.parse`）。
   前端无法在不改解析器/依赖的前提下修掉，于是按 lead 的兜底方案加**可见错误**：`MAX_HOST_DOC_LENGTH = 6 MB`，超过就不进编辑器，显示「文件过大，暂不支持（上限 6 MB）。这个文件约 13.5 MB……」；另外在 `applyHostPayload` 里用 try/catch 兜住解析异常（同样显示可见错误，不留空白页）。宿主实测 13.5 MB：横幅可见、无 RangeError、文档名 `未命名.md`（不是示例）；截图 `shots/round-06/t1-too-large-host.png`。
   因此 CHANGELOG 里「13.5 MB 实测可打开」这句**不成立**，需要 B 组/根代理改成「超过 6 MB 解析上限时给可见错误」。

修复后的验收：`node scripts/host-save-acceptance.mjs` → **64/64 PASS**（浏览器 50 + 宿主 14；浏览器段新增 404 回退 5 条、超限 3 条）。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 个文件、177 条断言、0 失败
npx vite build --outDir .tmp/build-a  → exit 0，产物 1,381,995 B
node scripts/host-save-acceptance.mjs → 64/64 PASS（浏览器 50 + 宿主 14）
```

无 argv 与 13.5 MB 的宿主手测（`.tmp/r6-host-manual.mjs`，不入库）：8/8 PASS；截图 `t1-no-argv.png`、`t1-too-large-host.png`。

## 与计划的偏离

- **D1（dev 的 `/__doc` 是 200 text/html）**：计划写「200 非 JSON（Vite SPA fallback）→ 错误横幅」。实测 dev server 对 `/__doc` 返回 `200 text/html`，若按计划会让普通开发页面一直报错。实现上把 `text/html` 视为浏览器启动，其他非 JSON（如 `text/plain`）仍按错误横幅处理；验收用 text/plain 覆盖了错误分支。
- **D2（「不改不写」只由前端拦截）**：`dirty===false` 时前端一条消息都不发，因此宿主侧收不到「相等文本」，SHA 天然不变。宿主侧对相等文本不写盘的逻辑是 T3 的接口承诺，本轮 A 组没有单独造「dirty 为 true 但文本相等」的用例去验证。
- **D3（切文档守卫是「等」不是「取消」）**：计划说「等回包或超时后再执行」，实现用 waiter 队列等；期间用户看到确认框已关、新文档稍后出现。队列只存 resolve 函数，不复制 `saving` 状态。
- **D4（切文档期间抑制成功提示）**：正在等切文档时，旧写回成功不弹「已保存到」，避免新文档上挂着旧文档提示（验收「不显示已保存」）。
- **D5（宿主段端口）**：A 的宿主副本用 `SIDELIGHT_PORT=47841` + CDP 9337，避开 47821 与其它并行实例的单实例 Mutex 冲突；被测二进制与 `www` 都是最新构建，行为与默认端口一致。
- **D6（左栏空态文案未改）**：计划 T1 步骤 6 要左栏显示「<文件名> · 这是单独打开的文件」，但本轮 A 的文件归属表不含 `FileTree.tsx`，未改；宿主无工作区时左栏仍是「现在打开的是示例」文案。
- **D7（转发 mtime 与宿主日志对账未自动化）**：前端只把 `/__doc` 返回的 `mtime` 存进 `hostDoc`，没有拿宿主日志逐条比对；转发后的文件名/写回目标/旧文件哈希已实测。
- **D8（宿主只读文件段未在 A 脚本跑）**：只读横幅、走 picker、不发 save 已在浏览器段验证；宿主 `READONLY` 错误码由 T3/T4 的 `save-probe` 覆盖，A 脚本未再起第二个宿主实例。
- **D9（Vite 模块缓存）**：改完 `src/` 后页面会渲染旧代码（本轮 T2 的 `setHostDoc(null)` 一度“不生效”），必须重启 dev server。当前 5173 跑的是最终代码。

## 文件清单

- 修改：`src/App.tsx`、`src/components/StatusBar.tsx`、`src/styles.css`
- 新建：`scripts/host-save-acceptance.mjs`、`docs/iteration/round-06/impl-a.md`
- 截图：`shots/round-06/t1-host-doc.png`、`t1-host-saved.png`、`t1-host-error.png`、`t1-save-error.png`、`t1-no-argv.png`、`t1-too-large.png`、`t1-too-large-host.png`
- 宿主测试副本（`.tmp/`，不入库）：`.tmp/host-a`（当前 `host/bin` + `.tmp/build-a/www`）、`.tmp/host-a-samples/{crlf-bom.md,forwarded.md}`
- 未 commit；未跑 `npm run build`；未改 `host/**` 与文档

- **D10（13.5 MB 不打开，改可见错误）**：解析器在 8 MB 单行就爆栈，本任务不改依赖，所以设 6 MB 上限并给「文件过大，暂不支持（上限 6 MB）」；CHANGELOG 的「13.5 MB 实测可打开」必须由 B 组/根代理改掉（本轮 A 不改 CHANGELOG）。
- **D11（404 不再报「信息已失效」）**：无 argv 启动是正常状态，不是错误；只有「有 argv、但 `/__doc` 返回 404」才会在转发后遇到，本轮按 lead 裁定统一当普通浏览器启动。

## 遗留

1. 宿主只读文件（`READONLY` 错误码）与超时/失败码的**宿主侧**注入（5 s 延迟回包）由 T4 的 `save-probe` 覆盖，A 脚本只测浏览器桩与真实成功路径。
2. 转发后 `mtime` 与宿主日志的对账未自动化（D7）。
3. 左栏「单独打开的文件」文案未做（D6，文件归属外）。
4. 真实系统对话框、安装版真人双击、文件占用/网络盘/中文路径写回仍属未验清单（AGENTS §6）。
5. **CHANGELOG 的「13.5 MB 实测可打开」必须改掉**：实际是 6 MB 解析上限 + 可见错误（D10），A 组无权改 CHANGELOG，请 B 组/根代理回填。
6. 6 MB 上限是「整个文本长度」而不是「单行长度」；如果以后想要更高上限，需要先解决 marked `lheading` 的爆栈（换解析器/预处理，属独立任务）。
