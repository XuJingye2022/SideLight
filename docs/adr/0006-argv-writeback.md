# 写回通道：宿主是唯一写者，页面拿不到路径（`/__doc` + `postMessage`）

第 05 轮之前，宿主打开文件只做一件事：把正文以 base64 写进 `localStorage`，页面 reload 后本地恢复。磁盘写回走 File System Access（用户先选目录）。这条路径对「双击一个 `.md` 打开」不成立：没有目录句柄，保存只能下载副本；`localStorage` 也装不下大文件，还会把 BOM、CRLF、GBK 一并抹掉。

本轮把「宿主打开的那一个文件」的读写收进宿主：页面只拿正文与元数据，不拿路径；写回只由宿主执行。

## 决定

- **宿主是唯一写者。** 页面通过 `GET /__doc` 拿正文与元数据，通过 `window.chrome.webview.postMessage` 发保存请求，结果用 `postMessage` 回。
- **页面永远拿不到完整路径。** `/__doc` 只回 `fileName`，不回目录；不注入 `window.__sidelightHost`，不把路径写进 DOM 或 localStorage。
- 写回目标只取宿主自己的 `currentPath`（argv 或单实例转发记录的那一个文件）。消息里出现 `path` / `fileName` / `file` 任一字段 → `BAD_REQUEST`，不写盘。
- 只接受来源 `http://127.0.0.1:47821/index.html`、只接受 `Host: 127.0.0.1:47821`；`/__doc` 只允许 GET（其余 405），带 `Cache-Control: no-store`，不加任何 CORS 头。

## 协议

`GET /__doc`（无当前文档 → 404；文件没了 → 409 `FILE_GONE`；>32 MB → 413 `TOO_LARGE`；编码判不出 → 409 `ENCODING`）：

```json
{"v":1,"ok":true,"fileName":"note.md","encoding":"utf-8|gbk|utf-16le|utf-16be","bom":true,
 "eol":"crlf|lf|mixed","endsWithNewline":true,"lineCount":42,"size":1234,"mtime":639303456907465313,
 "readOnly":false,"text":"LF 归一化后的正文"}
```

`postMessage`：

| 消息 | 说明 |
| :--- | :--- |
| `{v:1,type:"save",id,text}` | `text` 为 LF 正文，≤32 MB。同一 `id` 幂等：重复请求回同一结果，不重复写盘。 |
| `{v:1,type:"forget"}` | 清掉当前文档（页面不再持有正文时）。 |

回包 `{v:1,type:"save-result",id,ok:true,bytes,mtime}` 或 `{...,ok:false,error:<code>}`。
错误码：`BAD_REQUEST`、`READONLY`、`FILE_LOCKED`、`PATH_CHANGED`、`FILE_GONE`、`ENCODING`、`TOO_LARGE`、`EOL_MISMATCH`、`IO`。

## 编码与换行判定（严格，不猜）

1. BOM：`EF BB BF` → UTF-8；`FF FE` → UTF-16LE；`FE FF` → UTF-16BE。
2. 无 BOM：严格 UTF-8（`new UTF8Encoding(false, true)`）→ 严格 GBK（`Encoding.GetEncoding(936, ExceptionFallback, ExceptionFallback)`）→ 都不行回 `ENCODING`。
3. 解出文本含 `\u0000`（疑似无 BOM 的 UTF-16）→ `ENCODING`。
4. **绝不使用替换回退**：GBK 解码失败不回 U+FFFD，编码失败绝不写 `?`；保存含 emoji 的 GBK 文件会失败并提示另存为 UTF-8，这是预期。
5. 换行按打开时记录：`crlf` 全 CRLF、`lf` 全 LF；`mixed` 用逐行 EOL 序列，行数与打开时 `lineCount` 不符 → `EOL_MISMATCH`（不按多数静默改写）。
6. 结尾：`text.TrimEnd('\n')` 后，仅当原文件以换行结尾才补一个。

## 写盘与原子性

1. 「不改不写」：收到的 LF 正文与打开时完全相同 → 回 `ok`，不碰磁盘（SHA 自然不变）。
2. 写前校验：存在性 → `ReadOnly` 属性 → `mtime`（`LastWriteTimeUtc.Ticks`）与 `size` 与打开时比对 → `PATH_CHANGED`。
3. 同目录临时文件 `.sidelight-tmp-<guid>`，写完 `Flush(true)`；`File.Replace(target, temp, null)` 替换；失败退回 `MoveFileEx(temp, target, REPLACE_EXISTING|WRITE_THROUGH)`（P/Invoke）。**任何分支都不 `File.Copy` 直写目标**。
4. 失败删临时文件、原文件保持原样；成功后更新 `size/mtime/`正文基准。
5. 路径一律走 `Resolve()` 的 `\\?\` 长路径前缀。
6. 日志只记文件名、字节数、错误码，不写正文、不写完整路径（`fileName` 只用于日志与 `/__doc`）。

## 生命周期

- 启动 argv 指向的文件：`SetCurrentDoc` 读元数据；目录或缺文件 → `FILE_GONE`，窗口标题提示打不开。
- 单实例转发：**先**更新 `currentPath/currentMeta`，再注入正文并 reload；页面 reload 后 `fetch('/__doc')` 才会拿到一致的 `fileName/mtime`。
- 页面被攻破的最坏情况：能覆盖**当前这一个文件**（宿主只认 `currentPath`），拿不到其他路径、不能遍历目录。这是本轮明确接受的边界。

## 否决的方案

- **页面拿路径自己写**：路径进页面后，XSS/恶意 Markdown 可写任意文件；且页面写盘要重做 FSA 授权。
- **注入 `window.__sidelightHost` 直接传路径**：同样是路径泄露，且绕过 `/__doc` 的 Host/来源校验。
- **宽松解码 + 标记替换符**：`?`/U+FFFD 会静默损坏 GBK 原件，违反「不丢字」底线。
- **`File.Copy(temp, target, true)`**：非原子，写一半断电/崩溃会把原文件截断。

## 验收

- `node host/save-probe.mjs`：9 类样本 + 不改保存经前端 `Ctrl+S`（SHA 不变）+ 伪造 `path` 被拒。
- `GET /__doc` 返回 JSON、无完整路径、`Cache-Control: no-store`；`Host: evil` → 403；POST → 405。
