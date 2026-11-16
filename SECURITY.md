# 安全策略

## 支持的版本

| 版本 | 安全更新 |
| :--- | :--- |
| 0.30.x | 支持 |
| < 0.30 | 只建议升级到最新版 |

## 报告渠道（两态，按仓库当前设置）

**状态 A：私有漏洞报告已开启**（GitHub → Settings → Code security → Private vulnerability reporting）

用这个入口，内容不公开：
<https://github.com/XuJingye2022/SideLight/security/advisories/new>

**状态 B：私有漏洞报告未开启**（当前状态，`enabled=false`）

不要在公开 Issue 里写漏洞细节。先开一个 Issue，**加上 `security` 标签**，标题写「需要私下报告渠道」，正文只写「我有一个安全问题，需要私下渠道」；维护者看到标签后会开启私有通道或另约方式。**不要在 Issue 里贴复现代码、Key、正文或完整路径。**

本仓库目前**没有公开的安全邮箱**；不要向任何自称维护者的地址发信。

## 报告里写什么

- 版本（`package.json` / Release 页）、平台（Windows 11/10、macOS 15+/13–14）、安装方式（setup / portable / macOS zip / dev）。
- 复现步骤与影响（能读到什么、能改什么、是否需要用户交互）。
- 日志片段**先脱敏**：删掉 Key、正文、完整路径。

不要附：API Key、文档正文、`%LOCALAPPDATA%` 下的完整路径、证书或 `.env`。

## 范围

在范围内：

- 前端（`src/`）：XSS、Markdown/HTML 渲染、导出、剪贴板。
- Windows 宿主（`host/`）：本地 HTTP 服务、`/__doc`、`/__draft`、`/__recent`、写回、消息校验。
- macOS 宿主（`host-mac/`）：同一套协议、WKWebView 桥、签名/打包脚本。
- 打包与发布（`packaging/`、`.github/workflows/`）：安装器、更新、Secret 使用。

不在范围内：

- Tiptap / ProseMirror / KaTeX 等上游依赖的漏洞（请报给上游，同时欢迎告知我们）。
- 需要攻击者已控制本机、或已能读写用户文件的场景。
- 社会工程、垃圾邮件、物理访问。
- 你自己配置的第三方 AI / 搜索服务的行为。

## 信任边界（当前实现）

- 本地 HTTP 只绑 `127.0.0.1:47821`；校验 `Host: 127.0.0.1:47821`，不匹配回 403；不加 CORS 头；`Cache-Control: no-store`。
- 页面**拿不到完整文件路径**：`/__doc` 回 `fileName` 与元数据，`/__recent` 回 `{id, seq, name, dir}`（`dir` 只含目录段）。
- 写回只写宿主记录的当前文件；页面消息里出现 `path`/`fileName`/`file` 一律 `BAD_REQUEST`。
- 页面被攻破的最坏情况是覆盖**当前这一个文档**；不能遍历目录、不能写其他文件。
- `.sidelight/` 缓存（草稿、批注、trash）只在本机，不会上传；只有宿主按当前文档读写。

## 密钥边界

- AI 与搜索的 Key 由用户自己填，**明文存在页面 localStorage**（`sidelight.settings.v1`），随 WebView 配置目录落盘；没有系统钥匙串集成。
- Key 只发往用户配置的端点（AI `baseUrl`、搜索服务商）；本仓库没有自建中转服务器。
- 维护者**永远不会**索要你的 Key。报告问题时不要附 Key。
- Apple 签名证书与公证密码只在 GitHub Secrets 里；仓库不存证书、`.p12`、`.p8`。

## 日志脱敏

- 路径日志只记 basename（`start args`、`forward applied`、`open failed` 等）。
- **例外**：`navigation starting`/`navigate` 与 `permission` 会记录完整 URI（含本地地址与页面路径）；这些行不含文档正文，但可能暴露页面地址。
- Windows 的 `host.log*` 在安装目录（或 `host/bin`），删除即可清；macOS 宿主不落盘日志。
- 报告问题时请先删掉日志里的完整路径再贴。

## 响应时限、披露与赏金

- 响应时限：**待产品负责人确认**（目标：3 个工作日内首次回复）。
- 披露窗口：**待产品负责人确认**（参考：修复发布后 90 天公开细节，双方可协商提前）。
- 赏金：**待产品负责人确认**（当前无赏金计划）。

## 安全建议（非承诺）

- 只从 Release 页下载；核对 `SHA256SUMS-<版本>.txt`。
- 不用来历不明的 `dist/` 或宿主二进制。
- 发现可疑行为时先断网、保留日志（脱敏后）再报告。
