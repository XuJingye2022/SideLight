# 会话恢复：只存句柄，不存正文

0.31.x 每次重开都从空工作区开始：上次打开的文件夹、文件与批注全丢。根因是只把路径写进 localStorage，没有可重新取回的文件句柄（File System Access 的 `FileSystemHandle` 不能序列化进 localStorage）。

0.32.0 用 IndexedDB 存句柄做恢复；正文与批注仍只在磁盘与 `.sidelight/`。

## 决定

- **IndexedDB 只存句柄与元数据**：目录句柄、最近文件的句柄、当前文档标识、工作区显示名。正文、批注、草稿一律不进 IndexedDB（正文在磁盘，草稿/批注在 `.sidelight/`，与 0.30.x 一致）。
- **权限三态**：恢复时对每个句柄查 `queryPermission({mode:'readwrite'})`：
  1. `granted`：直接恢复文件夹、当前文件与批注；
  2. `prompt`：恢复到「最近打开」列表，点一下再 `requestPermission`；拿到授权后 `Ctrl+S` 在原地保存；
  3. `denied` / 句柄失效：从恢复列表移除，不阻塞启动。
- **失败退化**：IndexedDB 不可用、句柄失效、权限被拒，都退化为现有的「最近打开」列表；不弹阻塞式对话框，不丢磁盘上的草稿与批注。
- **不写正文到浏览器存储**：恢复只重新打开文件，不缓存正文，避免一份正文两个真相。
- **宿主批注端点**：页面通过宿主读写文档同级 `.sidelight/annotations/<CacheKey>.json`：
  - `GET /__annotations`：只认当前文档；没有文件回 404；上限 512 KiB；超过回 413。
  - `annotations-save`：页面消息 `{v:1,type,id,text}`，原子写同一路径，回 `annotations-save-result`；只读回 `READONLY`，目录不可写回 `IO`；带 `path/fileName/file` 一律 `BAD_REQUEST`。
  - `CacheKey` 与前端 `src/lib/cache.ts` 同一套（FNV-1a 截断规则），保证浏览器与宿主指向同一文件。
- **协议 v2**：批注文件从 `Annotation[]` 升为 `{v:2,annotations,notes}`；读兼容旧数组，写统一 v2，迁移前把旧文件备份为 `.json.bak-<时间>`。

## 否决的方案

- **把正文写进 IndexedDB 做恢复**：等于第二份正文，保存/草稿/批注会出现三份状态；查询与清理也会变复杂。
- **只存路径不存句柄**：macOS 与 Windows 上都无法在不重新选择的情况下拿回写权限，等于没恢复。
- **恢复失败弹模态框**：每次启动都可能被权限提示打断；改为静默退化到最近打开。
- **宿主直接读页面 localStorage**：宿主进程无法访问 WebView2 的 localStorage，且会破坏「页面只拿 id」的边界。

## 未验

- 真实重开后的权限授予（Windows 与 macOS 的 `queryPermission` 行为）。
- 旧会话里已经被丢弃的一条批注不可恢复（它从未落盘）。
- 150% / 200% 缩放屏上的恢复界面。
- macOS 的快捷键与恢复路径（本机是 Windows）。

## 状态

2026-11-16 接受（0.32.0）。
