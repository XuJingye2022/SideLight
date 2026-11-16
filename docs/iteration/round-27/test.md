# 第 27 轮 · 验收（tester，v0.32.0）

日期：2026-11-16。v0.32.0，HEAD/tag `64710ad`。本机 Windows；未改产品代码、未 commit。

## #4 Typora 快键 / 编辑：PASS（覆盖项）

- `keyboard-acceptance` **49/49**：Ctrl+K 就地链接（Tab URL/Enter 成链接、Esc 不改）、Ctrl+M 行内公式 Enter/ Esc、表格 Tab 走格、Ctrl+1 H1、Ctrl+/ 源码/Esc、Ctrl+Shift+1 大纲；正文 Tab 两空格 + XYZ 不丢。
- Ctrl+P 浮层过滤/Enter、Ctrl+1–6/0 全组合、Ctrl+Shift+3/L 没有逐项断言，**UNVERIFIED**；浅/深截图未全部复核。

## #5 DPI / host-smoke：FAIL（整体 8/8 未达成）

- DPI 3 项 PASS：清单 true/pm、exe.config 无 WinForms、进程 `GetProcessDpiAwareness=2`；本机 100%，150/200% **UNVERIFIED**。
- host-smoke 前 8 项（DPI/窗口/渲染/加速键/argv/单实例）通过，随后 **FSA 崩溃**：`quick-open-backdrop` 拦截「打开文件夹…」点击，30 s 超时；Ctrl+P 打开的 Quick Open 未关闭。整体不能按 8/8 记。
- FSA 树读取仍 **UNVERIFIED**。

## #1/#2/#3 关联

- session 15/15、annotation-flow 8/8 通过；host-annotation **5/6**，`GET /__annotations` 文本不一致。

## 发布 / 文档 / 仓库

- README/AGENTS/CHANGELOG 0.32.0/248/285,997；无 TBD/旧包名。
- **Release v0.32.0 API 404**；本地 release 只有 0.31.1 setup，无四资产/`SHA256SUMS-0.32.0.txt`。
- STATE 仅到 25 行；round-27 plan 不存在；round-26/27 证据未补全。
- 工作区仅截图/报告未跟踪；无密钥/证书。

## 判定

**FAIL**

- host-smoke 在 Quick Open 遮罩处崩溃，未达 8/8；host-annotation 5/6。
- Release v0.32.0 不存在，四资产/checksum 无法验。
- STATE/round-27 证据缺失；DPI 150/200、真实 Mac/签名、真实 DeepSeek、真实宿主重开仍 UNVERIFIED。
