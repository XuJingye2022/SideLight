# 宿主改用固定回环端口 origin（`http://127.0.0.1:47821`）

第 02 轮之前，宿主用 `SetVirtualHostNameToFolderMapping` 把 `host\bin\www` 挂到 `https://sidelight.local/`，再导航 `index.html`。这个方案保住了 origin 与 File System Access，但首屏有约 2 秒的固定下限：同一份字节、同一个 WebView2 里实测，映射主机的 `DOMContentLoaded` 是 2,011 ms、FCP 2,040 ms；CDP 采样显示渲染器主线程在 `+114…+1,764 ms` 之间完全不应答。

候选方案实测（同一台机器、同一份前端）：

| 方案 | origin | DCL | FCP |
| :--- | :--- | ---: | ---: |
| `SetVirtualHostNameToFolderMapping` | `https://sidelight.local/` | 2,011 ms | 2,040 ms |
| `WebResourceRequested` 拦截并回内存 | `https://sidelight.local/`（origin 保住） | — | 2,392 ms |
| 本机回环 HTTP 服务 | `http://127.0.0.1:<port>/` | **28 ms** | **60 ms** |

第 03 轮在本机复测（`host/fcp-probe.mjs`，真实宿主 + 真实 `dist`）：首屏 FCP **296 ms**，第二个实例转发触发的 reload FCP **52 ms**。数字比 finder 的 A/B 大，因为测量包含了宿主注入与草稿恢复；量级一致，都远低于 500 ms 的验收线。

## 决定

- 宿主自己起 `TcpListener(IPAddress.Loopback, 47821)`，只读服务 `host\bin\www`；页面 origin 恒为 `http://127.0.0.1:47821`。
- **端口固定，不随机**。随机端口每次启动都换 origin，`localStorage` 会跟着换分区：API Key、草稿、批注缓存每次启动都丢。固定端口换来的是「origin 跨启动稳定」，这正是 `localStorage` 能用的前提。
- **端口被占用就失败**：写 `loopback port busy 47821`，弹「端口 47821 被占用，请关闭占用它的程序后重开」，`exit 1`。不静默换端口，也不回退虚拟主机——两者都会把 origin 换掉，等于让用户再丢一次数据。
- 服务只处理 `GET`/`HEAD`；MIME 白名单 `.html .css .js .woff2 .svg .png .ico .json`；响应带 `Content-Type`、`Content-Length`、`Connection: close`、`Cache-Control: no-store`。
- 目录穿越：`Uri.UnescapeDataString` 失败 400；含 `..`、反斜杠、盘符冒号、`//` 开头 403；`Path.GetFullPath` 后必须在 `www` 内，否则 403；扩展名白名单外 404。每次拒绝写 `loopback refused path=… reason=…`。
- 只监听 `127.0.0.1`（`IPAddress.Loopback`），局域网不可达。这是本地静态资源服务，不接外部输入，不代理任何网络请求。

## 代价：旧 origin 的 localStorage 丢一次

`https://sidelight.local` 上的 `sidelight.settings.v1`、`sidelight.doc.v1`、`sidelight.annotations.*` 不会迁移到 `http://127.0.0.1:47821`，升级后用户会丢一次设置与草稿。

**迁移策略：首次公开发布前允许一次性丢失，本轮不做跨 origin 迁移。** 理由：

1. 当前没有任何对外发布的安装包，用户只有本机原型使用者；迁移代码要读旧 origin 的存储，必须先把旧 origin 挂起来跑一段脚本，成本高于收益。
2. 一旦首次公开发布，origin 就变成兼容性承诺；之后再换 origin 必须做迁移（用隐藏窗口打开旧 origin 读取并转存），所以本轮把 origin 定死。

## 验收

- `node host/fcp-probe.mjs`：FCP 首屏 296 ms、转发 reload 52 ms、两次冷启动 origin 一致、设置与无句柄草稿仍在、穿越 4 类全部 403、`.js/.css/.woff2` 的 Content-Type 正确、`HEAD /index.html` 200 且无 body。
- `node host/fcp-probe.mjs --busy`：先占住 47821，宿主日志 `loopback port busy 47821`、错误窗、exit 1。
- `node scripts/host-smoke.mjs --fsa`：7/7 PASS（窗口、渲染、argv、单实例、真实文件读写）。
