# 第 27 轮 · 最终验收（tester，v0.32.0）

日期：2026-11-16。v0.32.0；产品提交 `c035a1d`，HEAD `b148e0e`（仅 docs/STATE 领先）。本机 Windows；未改产品代码、未 commit。

## #4 Typora 快键 / 编辑：PASS（覆盖项）

- `keyboard-acceptance` **49/49**：Ctrl+K 就地链接（Tab URL/Enter 成链接、Esc 不改）、Ctrl+M 行内公式 Enter/Esc、表格 Tab 走格、Ctrl+1、Ctrl+/ 源码/Esc、Ctrl+Shift+1、正文 Tab 两空格 + XYZ 不丢。
- Ctrl+P 浮层过滤/Enter、Ctrl+1–6/0 全组合、Ctrl+Shift+3/L、浅/深截图未逐项复核，**UNVERIFIED**。

## #5 DPI / 宿主冒烟：PASS-WITH-UNVERIFIED

- DPI 3 项 PASS：清单 true/pm、exe.config 无 WinForms、`GetProcessDpiAwareness=2`；150%/200% 真机 **UNVERIFIED**。
- `host-smoke` **11/11**：DPI、窗口、渲染、加速键 Ctrl+K/P/F、argv、单实例、FSA 对话框、树读取、真实写盘全过。
- 真实 150/200% 缩放截图与高 DPI 交互仍 **UNVERIFIED**。

## #1/#2/#3 关联

- session **15/15**、annotation-flow **8/8**、host-annotation **6/6** 均通过；`/__annotations` 无缓存 200 空 v2 store、GET text 与磁盘一致。

## #6 DeepSeek

- 12 条搜索单测通过；真实 DeepSeek Key/接口 **UNVERIFIED**。

## 发布 / 文档 / 仓库：PASS

- Release **v0.32.0** 四资产 checksum 全一致；CI #41 与 Release #15 全绿。
- README/AGENTS/CHANGELOG 0.32.0/248/285,997；STATE 1–27；round-26/27 plan/test 齐；`git status` 干净；HEAD 领先 tag 仅 docs/STATE，`src` 0 改动。
- 无密钥/证书入库，release/dist/.tmp/host/bin 未入库。

## 判定

**PASS-WITH-UNVERIFIED**

- 49/49 键盘、host-smoke 11/11、host-annotation 6/6、发布/CI 全通过。
- 真实 macOS/Finder/Dock、真实签名/公证、DPI 150/200、真实 DeepSeek、真模型质量、Ctrl+P/1–6/0 全组合仍 UNVERIFIED。
