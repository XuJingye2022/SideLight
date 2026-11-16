# 第 26 轮简报（重开恢复、批注协议、提示词、高分屏）

## 来源

用户直接报告的 7 项；诊断计划见 `docs/iteration/round-26/plan.md`（已逐条给出文件:行证据）。

## 本轮范围

- #1 关闭重开：恢复文件夹/单文件句柄、当前文档、批注；Ctrl+S 原地写回。
- #6 高 DPI：Windows 宿主声明 PerMonitorV2，setup/窗口清晰。
- #2 #3 #5 的底层：提示词缩短、整体评价/未定位协议、重跑替换纯函数。
- 不做：#4 链接/公式键盘（第 27 轮）、#7 DeepSeek 搜索（第 27/28 轮）、Typora 功能（后续）。

## 三个并行组

| 组 | 范围 | 文件 |
| --- | --- | --- |
| B | 宿主批注端点和 DPI | `host/Program.cs`、`host/app.manifest`、`host/*.config`、`scripts/host-*.mjs` |
| C | 批注协议 v2、提示词、设置迁移、重跑替换纯函数 | `src/lib/annotations.ts`、`prompt.ts`、`settings.ts`、`ai.ts`、测试、`scripts/annotation-flow.mjs` |
| A（C 完成后） | 会话恢复 + App 接线 + 整体评价 UI | `src/lib/session.ts`、`src/App.tsx`、`MarginRail.tsx`、`styles.css` |

## 门禁

- `tsc`、`npm test`（新增 session/prompt 测试要登记到 package.json）、`npm run roundtrip`。
- 新脚本必须先红后绿：`session-acceptance`、`host-annotation-acceptance`、`annotation-flow`。
- 首屏 ≤286,000；界面截图 `shots/round-26/`。
- 版本 0.32.0；发布 0.32.0。

## 必须诚实标注

- WebView2 重启后 FSA 权限是否保留、真实 150%/200% 屏、真模型提示词质量、macOS 真机、网络盘/只读目录。
- 旧会话里已经丢弃的那条批注无法找回。
