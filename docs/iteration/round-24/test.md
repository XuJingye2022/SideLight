# 第 24 轮验收（体验三项）

## 判定

PASS-WITH-UNVERIFIED（实现与 keyboard 证据；1024 抽屉/FindBar 未自动化）。

## 证据

- keyboard 37/37：正文 Tab 插两空格后输入 XYZ 不丢；表格 Tab 不插空格；文档开头仍让给 skip link。
- 首屏 285,781 B ≤286,000；`npm test` 234 条。
- 文件菜单「查找替换…」可打开 FindBar（手工/代码路径）；示例补 Ctrl+F。
- 分析后 ≤1119px 自动 `openRail()`；「批注」按钮 aria-label/title 条数。

## UNVERIFIED

- 1024×768 分析抽屉与 FindBar 无自动化断言。
- 真实 IME/macOS 未验。

## 范围

- 只改 App/styles/示例；无密钥；无发布（随 0.31.1 发布）。
