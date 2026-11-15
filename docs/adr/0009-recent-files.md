# 最近打开：状态目录、`recent.json`、只收 id 的重开通道

宿主能打开文件，但没有「最近打开」：用户每次都要重新找路径。补这个能力时有两个风险：页面若拿到路径，恶意内容就能写任意文件；日志已经记录了完整路径（含用户名与目录结构），升级后还会留在安装目录。

本轮只做最近 8 篇、可清除/撤销，并把日志脱敏。

## 决定

- **状态目录**：`%LOCALAPPDATA%\Sidelight`（与 WebView2 配置平级）→ 便携（exe 同级 `state`）→ `%TEMP%\Sidelight`（标易失）→ 全失败则禁用最近（`state:"disabled"`，`reason:"NO_STATE_DIR"`）。
- **格式**：`recent.json`，`{"v":1,"seq":N,"items":[{id,path,name,dir,openedAt,size,mtime}]}`，UTF-8 无 BOM，同目录临时文件 + `File.Replace`（回退 `MoveFileEx`）原子写。
- **上限与去重**：最多 8 条；键是规范化路径（`GetFullPath` 去掉 `\\?\`，`OrdinalIgnoreCase`）；同路径再次打开只更新 `seq`/`openedAt` 并置顶。
- **id 与 seq**：`id` = 规范化路径（小写）的 SHA256 前 16 位十六进制；`seq` 单调递增。页面只拿 `id` + `seq`，重开消息只收这两个字段。
- **记录点（唯一）**：`RecordOpen` 只在主实例（持有 `Global\Sidelight`/`Local\Sidelight` 之后）、且打开成功后调用——argv 成功、单实例转发成功、`open-recent` 成功。第二实例只转发路径串，不开文档、不记录。
- **`/__recent`**：只 GET、Host 只认 `127.0.0.1:47821`、`Cache-Control: no-store`、无 CORS；回 `{v:1,state:'ok'|'volatile'|'disabled',items:[{id,seq,name,dir}],lastError?,reason?}`。`openedAt` 只留在磁盘；`dir` 用 `/` 分隔，不含盘符、反斜杠与 `..`，同名同目录时扩到更多段。
- **消息**：`open-recent{id,seq}`、`recent-remove{id,seq}`、`recent-clear{id}`、`recent-restore{id}`；回 `*-result{ok}` 或 `{ok:false,error}`。消息里出现 `path`/`fileName`/`file` 一律 `BAD_REQUEST`。
- **错误码**：`STALE`（id 不存在或 seq 不匹配）、`FILE_GONE`、`READONLY`、`ENCODING`、`TOO_LARGE`、`BAD_REQUEST`、`IO`、`NO_STATE_DIR`。写失败一律 `ok:false`。
- **清除与撤销**：`recent-clear` 把当前列表存进内存快照再清空并写盘；`recent-restore` 用快照恢复（只可撤销一次，宿主重启后回 `STALE`）。
- **日志**：所有路径日志点只记 basename（`start args`、`pipe sent`、`pipe received`、`forward ignored`、`forward applied`、`open failed`、下载路径、状态目录候选）；`pipe sent` 不再记录载荷。首次启动把旧 `host.log` 归档为 `host.log.bad`（失败则删除）并写 `log migrated`；之后超过 1 MB 轮转 `host.log.1`，最多保留两个文件。

## 隐私

- `recent.json` 只存本机路径与时间，不上传；不写进正文，也不进导出。
- 页面只拿哈希 `id`，拿不到路径；`open-recent` 由宿主按 `id` 查自己的表，不接受页面路径。
- 日志可能含文件名（`host.log`、`host.log.1`、旧 `host.log.bad`）：删除 `host.log*` 可清。
- 草稿与批注在文档同目录 `.sidelight/`，与本目录无关。
- 卸载保留 `%LOCALAPPDATA%\Sidelight`（含 `recent.json`、WebView2 配置与日志）。

## 否决的方案

- **页面持有路径并自己重开**：路径进页面后可写任意文件。
- **只在内存里记最近**：重启即丢，用户还是找不到文件。
- **`%TEMP%` 作为首选**：清理临时目录就丢，用户也找不到。
- **无限列表**：隐私与性能都变差；8 条够用。
- **继续把完整路径写日志**：泄露用户名与目录结构，升级后还留在安装目录。

## 验收

- `node host/recent-probe.mjs` 19 项断言：9 次打开 → 8 条、去重置顶、契约无路径、Host 403、no-store、`open-recent` 成功/`STALE`/`FILE_GONE`/`BAD_REQUEST`、clear/restore/remove、损坏 JSON 备份、日志无完整路径 + `log migrated` + 轮转、TEMP 回退 `volatile`。
- 真人重启后列表、`recent.json` 写失败（只读状态目录）、网络盘失效、卸载保留、日志迁移的真实升级场景 **UNVERIFIED**。

## 状态

2026-11-16 接受。0.22.0 最终产物：setup 809,542 B（SHA256 `0F8579D374D58897C91E4D3E26D6E5A428AA174586EAD7119DB1EEE74FA1DF42`）、便携 zip 887,922 B（SHA256 `A31D7FDA68E9A16AB630BC6FA3823AEC08E775413DCB8254F1613DD2FB3ED25E`）；构建产物 1,404,769 B。
