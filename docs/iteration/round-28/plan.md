# 第 28 轮计划（首启空白、关闭文档、工作区保存）

## 背景

用户装 0.32.0 后报三个问题：
1. 新软件打开有 Demo；
2. 新软件无法新建；
3. Demo 无法关闭，也无法保存在选定工作区。

## 根因

- 首次启动 fallback 用 `SAMPLE` + `示例 · 侧灯.md`；示例是 dirty 状态。
- `newDocument()` 在 dirty 时弹「未保存确认」，用户会以为新建坏了。
- 文档无句柄时 `performSaveAs` 永远调系统 `showSaveFilePicker`，不会落到已打开的工作区。

## 任务

| 任务 | 内容 | 验收 |
| --- | --- | --- |
| T1 | 首启 fallback 改空正文 `未命名.md`；旧 localStorage 示例名也丢弃 | 清存储后空白、dirty=false；旧示例名不再出现 |
| T2 | 文件菜单加「关闭文档」；新建立即空白 | 干净关闭清空；脏关闭三选一，取消不改 |
| T3 | 工作区有真实目录且当前无句柄时，Ctrl+S 在根目录建 `未命名.md`/`未命名 2.md` 并刷新树 | picker 0、树选中、文件落盘；显式另存为仍 picker |
| T4 | 文档/版本 0.32.1 | README/AGENTS/CHANGELOG、STATE |

## 结果

- session 18/18、newfile 23/23、keyboard 49/49、npm test 17/248、首屏 285,783。
- 发布 0.32.1（Windows setup 824,595 / zip 910,360；macOS 待 release）。
- UNVERIFIED：真实 WebView2 新建/工作区保存、`未命名 2` 冲突、真实 FSA 权限、DPI 150/200、真模型/DeepSeek。
