# 第 22 轮计划（六路第二批侦察）

## 目标

验证第 21 轮修复是否闭合，并把剩余 P0/P1 挖到可实施粒度。本轮不修产品代码。

## 实际任务

| 路 | 关注 | 产物 |
| --- | --- | --- |
| fix | C1 脚注、D1 删除恢复的对抗用例 | findings-fix.md |
| markdown | 公式 `\$`、CRLF 尾部空行、表格复用 | findings-markdown.md |
| data | 浏览器草稿、打开文件大小门、多标签、草稿提示 | findings-data.md |
| perf | 100 KB/1 MB 逐键、内存 | findings-perf.md |
| ux | 窄窗批注、查找入口、设置分组、Tab、视图状态 | findings-ux.md |
| install | 运行中安装/卸载、第二次启动、macOS Finder、版本 | findings-install.md |

## 验收

- 六份报告都含复现、证据、影响、S/M/L。
- 每条只报新问题或第 21 轮修复缺口。
- 结果用于第 23–25 轮修复。

## 结果

- 主干修复闭合；仍发现：D2 草稿通道、D3 打开文件门、M1 `\$`、F2 窄窗、F4 Tab、I1/I4、真实 1 MB 载入约 54 s。
- 证据在 `docs/iteration/round-22/findings-*.md` 与 `shots/round-22/`。
