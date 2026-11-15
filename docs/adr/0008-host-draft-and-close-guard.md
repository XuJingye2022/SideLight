# 宿主草稿与关窗守卫：草稿落在文档同目录，关窗先问再走

宿主打开的文档以前没有草稿落点：编辑只存在页面内存里，关窗即丢失；关窗也没有询问，脏文档静默消失。浏览器路径（FSA）有 `.sidelight` 缓存，宿主路径没有。

本轮补两件事：宿主把草稿写到文档同目录的 `.sidelight/drafts/`；关窗时先问「取消 / 存草稿 / 丢弃」。

## 决定

- **草稿键与浏览器一致**：用 `cacheKey(fileName)` 同一套算法——去扩展名、非安全字符换 `-`、合并连续 `-`、40 字符截断，超长时保留前 36 字符并加 `-` 与 4 位哈希（避免长中文标题撞键）。
- 路径固定为 `<文档目录>\.sidelight\drafts\<key>.md`，**不接受页面给的任何路径**。写 UTF-8 无 BOM、LF，同目录临时文件 + `File.Replace`（回退 `MoveFileEx`）原子替换。
- `/__draft` 只读：严格 UTF-8、6 MB 上限、`Cache-Control: no-store`、Host 只认 `127.0.0.1:47821`、无 CORS；404 = 没有草稿，200 = `{v:1,exists:true,mtime,size,text}`。
- 关窗三选一：`close-request` 由宿主发，页面回 `close-answer`（`cancel` / `save-draft` / `discard`）。

## 协议

| 消息 | 回包 | 说明 |
| :--- | :--- | :--- |
| `{v:1,type:"draft-save",id,text}` | `draft-save-result` | 写草稿；失败码 `NO_PATH` / `TOO_LARGE` / `IO`。 |
| `{v:1,type:"draft-clear",id}` | `draft-clear-result` | 删除草稿（保存成功后调用）。 |
| `{v:1,type:"close-request"}` | — | 宿主发出，只发一次。 |
| `{v:1,type:"close-answer",action,text?}` | — | `cancel` / `save-draft`（带 `text`）/ `discard`。 |

## 关窗流程（`FormClosing`）

1. `closeConfirmed` 为真 → 放行（第二次进入直接关）。
2. 否则先 `e.Cancel = true`；`closePending` 为真 → 直接返回（**再次点 × 不重复发请求**）。
3. 置 `closePending`，`await ReadDirtyAsync()`（禁止 `.Result`，UI 线程会死锁）。
4. `dirty = "0"` → `closeConfirmed = true`，再 `form.Close()`。
5. `"1"` / unknown（页面没挂载）→ 发一次 `close-request`；**5 s 无答案只保留窗口，不清 `closePending`**（超时只记日志）。
6. `cancel` → `closePending = false`（下次点 × 可再问）。
7. `save-draft` → 用回传 `text` 写草稿；**写成功才** `closeConfirmed = true` 并关窗；失败保持窗口、`closePending = false`、弹可见错误（提示先「另存为」）。
8. `discard` → **先 `draft-clear`**（失败只记日志、继续）再 `closeConfirmed = true` 并关窗。
9. `FormClosed` 只记日志。Alt+F4 与任务栏关闭走同一个 `FormClosing`；注销/关机（`SessionEnding`）本轮不处理，标 UNVERIFIED。

## 错误码

沿用写回通道：`BAD_REQUEST`、`NO_PATH`、`TOO_LARGE`、`IO`、`ENCODING`（`/__draft` 读到非 UTF-8 时）。

## 隐私

- 草稿只写本机：文档同目录 `.sidelight/drafts/`，不发网络、不写仓库、不写 `%TEMP%`。
- 卸载安装包不会删文档目录里的 `.sidelight`（它不是安装目录）。

## 否决的方案

- **草稿写 `localStorage`**：宿主 6 MB 文档装不下，且关窗时页面可能已经卸载。
- **草稿写 `%TEMP%`**：换机器/清理临时目录就丢，用户也找不到。
- **关窗静默丢弃**：即本轮要修的问题。
- **同步阻塞读 dirty（`.Result`）**：WebView2 回调在 UI 线程，会死锁。
- **页面给路径**：路径进页面后可写任意文件。

## 验收

- `node host/draft-probe.mjs`：13 项断言（键、写读、mtime 新于原文、`/__draft`、`draft-clear`、重开仍在、dirty=0 直接关、只发一次、5 s 无答案、cancel 留窗、cancel 后可再问、discard 清草稿后关、save-draft 写草稿后关、落点只在文档目录）。
- 真实 Alt+F4、注销/关机、真实 IME 组合输入下的关窗 **UNVERIFIED**；`save-draft` 写失败（只读目录）的可见错误路径也 **UNVERIFIED**（自动化会卡在模态框上）。

## 状态

2026-11-15 接受。0.24.0 产物：setup 811,756 B（SHA256 `4F06530B18E82AE51866A62633CEAF015723D481FE51754152950BBF183593D4`）、便携 zip 891,471 B（SHA256 `E06F2E2EB2514D5027BA12D6A9DFA34AADF304B134F9A198A466C2D9F7452EE5`）；构建产物 1,413,750 B。
