Sidelight（macOS）
=================

这是 Sidelight 的 macOS 应用。zip 根目录里有 Sidelight.app 与本说明。

安装
----

1. 把 Sidelight.app 拖进「应用程序」（或任意固定目录）。
2. 首次打开按下面的 Gatekeeper 步骤走一遍。
3. 每次更新（换新的 .app）后，Gatekeeper 步骤要重做一次。

Gatekeeper：三种情况
--------------------

macOS 15 及更新：
  a. 双击 Sidelight.app，出现「Apple 无法验证…」时点「完成」（只有「完成」是正常的）。
  b. 打开「系统设置 → 隐私与安全性」，在「安全性」一栏点「仍要打开」。
  c. 再双击一次 Sidelight.app，点「打开」。

macOS 13–14：
  a. 在 Finder 里右键（或按住 Control 点）Sidelight.app，选「打开」。
  b. 在弹窗里再点「打开」。

命令行去隔离（可选，适合脚本）：
  xattr -dr com.apple.quarantine "/Applications/Sidelight.app"
  路径含空格时要加引号。

如果系统提示「已损坏，无法打开」，先不要重新下载：
  1) 确认 zip 的 SHA256 与 Release 页的 SHA256SUMS-*.txt 一致；
  2) 再执行上面的 xattr 命令；
  3) 仍然失败再反馈。

签名状态
--------

- **未签名、未公证**：Release 说明首行会写明。按上面 Gatekeeper 步骤打开即可。
- **已签名并公证**：Release 说明首行会写明。首次打开通常不再需要额外步骤。
- 同一个版本可能先后出现两种包（先 ad-hoc、后签名），以 Release 说明为准。

Intel 与 Apple Silicon
----------------------

- 本包是 Universal（arm64 + x86_64），Apple Silicon 与 Intel Mac 都能运行，要求 macOS 13 或更新。
- 0.28.1 及更早的 `-macos-arm64.zip` 只支持 Apple Silicon；不确定芯片时看「 菜单 → 关于本机 → 芯片」。

数据位置
--------

- 最近文件与 WebView 数据：~/Library/Application Support/Sidelight
- 草稿与批注：文档同目录 .sidelight/drafts、.sidelight/annotations
- 删除的文件：工作区 .sidelight/trash（不自动清理）
- 卸载 App 不会删上面这些目录；要彻底清掉请手动删除。
- 换包/升级不丢数据；同一时间只保留一个 Sidelight.app。

校验
----

shasum -a 256 Sidelight-<版本>-macos-universal.zip
与 Release 页的 SHA256SUMS-<版本>.txt 对照。
