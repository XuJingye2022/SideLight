# 第 27 轮计划（键盘、链接/公式、Typora 快键、DeepSeek 搜索）

## 目标

修完用户报告的第 4 项（链接/公式纯键盘与美观），并吸收 Typora 调研里成本低的键盘项；补第 7 项 DeepSeek 搜索。

## 任务

| 任务 | 内容 | 验收 |
| --- | --- | --- |
| K1 | Ctrl+K 链接浮层：选区变链接、Tab/Shift+Tab、Enter 保存、Esc 取消 | keyboard 用例、浅/深截图 |
| K2 | Ctrl+M / Ctrl+Shift+M 行内/块级公式编辑；Enter/Shift+Enter/Esc | 公式提交/取消、焦点回正文 |
| K3 | Typora 快键：Ctrl+P 快速打开（lazy）、Ctrl+1–6/0、Ctrl+/ 源码、表格 Tab/Ctrl+Enter、侧栏 Ctrl+Shift+1/3/L | keyboard 49/49、首屏不超 |
| K4 | DeepSeek 搜索：`POST https://api.deepseek.com/v1/tools/search`、同 Key、错误码 | 单测请求/解析/错误 |
| K5 | 宿主关闭浏览器加速键，让 Ctrl+K/P/F 到页面 | host-smoke 加速键断言 |

## 约束

- 不新增运行时依赖；QuickOpen 必须 lazy；首屏 ≤286,000。
- 链接/公式就地浮层，不用 `window.prompt`。
- macOS 快捷键、真实 DeepSeek（无 Key）、真实 IME 标 UNVERIFIED。

## 结果

- keyboard 49/49；host-smoke 11/11（含 FSA）；DeepSeek 12 条单测；首屏 285,997。
- 发布 0.32.0（Windows 824,473 / 910,519 B，macOS 906,060 B）。
