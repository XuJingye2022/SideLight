# 第 60 轮 finder-code（代码与性能）

范围：HEAD `5384410`（= 轮前 startSha，本轮无 diff），第 57–59 轮改动周围。窗口：CDP 9225 + http://localhost:5175。
基线：`npx tsc --noEmit` 退出 0；`npm test` 全绿（末段 5+9 条 0 失败），无新问题。
脚本/数据：`.tmp/e2e-r60-finder-{code,probe,1mbtoc}.mjs` → `.tmp/r60-finder-{code,probe,1mbtoc}.json`、同名 `.log`。

## F1（P1）文档有 `[TOC]` 时逐键变慢：每次击键全篇重建目录装饰

同窗口 A/B，20 键，键后 `setTimeout(0)` 延迟：

| 文档 | 顶层段落 | 目录条目 | 逐键 p50 / p95 |
| :--- | ---: | ---: | :--- |
| 100 KB 无 `[TOC]` | 1097 | 0 | **25 / 41 ms** |
| 100 KB 有 `[TOC]` | 1098 | 59 | **44 / 46 ms** |
| 1 MB 无 `[TOC]` | 11214 | 0 | **61 / 66 ms** |
| 1 MB 有 `[TOC]` | 11215 | 592 | **90 / 92 ms** |

另测：载入无回归（100 KB 60–67 ms，1 MB 427/649 ms，长任务仅 `[427,75]`）；滚动、保存（2 次 `getFile` + 1 写）、源码切换（进 58 / 退 82 ms）正常。`[TOC]` 打开即渲染（`toc-small`：1 个 `.sl-toc`、3 条），击键后不重挂——不是挂载晚。

**根因**：`src/lib/tocRender.ts:108-114` 的 `apply` 只判 `docChanged`，`previous.active` 为真时每键都 `build()`：`buildTocDecorations` 全顶层 `doc.forEach`（`:61-63`）+ `tocEntries(doc)` → `extractOutline(doc)`（`src/lib/toc.ts:31-33`，再扫全篇），然后 `DecorationSet.create`。但 widget key 含标题签名（`tocRender.ts:77`，`toc@pos-signature`），正文不改标题时签名不变、DOM 被复用——**两遍全篇扫描换不来任何视觉变化**。100 KB +19 ms（+76%），1 MB +29 ms（+47%），随文档与条目数上涨。

**建议**：`active` 时只在「`steps` 切片含 `[toc]`（可复用 `maybeTocTouched`）或改动区间命中 heading / `[TOC]` 段落」才重建，位置缓存在插件 state；其余击键返回 `previous`。验收：100 KB 带 `[TOC]` 的逐键 p50 与同尺寸无 `[TOC]` 差 ≤5 ms，目录 3 条仍可点跳转。

## F2（P1）全局搜索的 Enter 无 busy 守卫：一次查询可全量读盘两遍（竞态 + 读放大）

64 个 md 的工作区里输入 `needle`，连按两次回车（隔 15 ms），`window.__fsLog` 记 **`getFile` 130 次**（= 2×64 + 2），`note` 仍只有一份「2 处；跳过 1 个…」，结果行 2 条无重复（`.tmp/r60-finder-code.json` 的 `search.getFileCount`、`filesInWorkspace=64`，单次搜索 73 ms）。

**根因**：`src/components/GlobalSearch.tsx:76-80` Enter 直接 `void run()`，`run()`（`:28-51`）开头没有 `if (busy) return`；只有按钮 `disabled={busy}`（`:88`）挡鼠标。按住回车（键重复）即并发多轮 `collectDocs`，每轮最多读 200 个文件（`src/lib/globalSearch.ts:6`）；两轮都吃了 1 MiB 文档时多读约 200 MiB，`setHits/setNote` 后完成者覆盖前者，计数可能对不上。
同一路径小浪费：`collectDocs`（`globalSearch.ts:136-141`）先读全文再判 `overBytes` 丢弃，超过 1 MiB 的文件整篇读入后才跳过（本轮实测 1 个）。可先用句柄 `getFile().size` 预筛。

**建议**：`run()` 开头加 `if (busy) return`（一行）+ `collectDocs` 用 `size` 预筛。验收：连按两次回车，`getFile` 次数不超过「文件数 + 1」。

## 未入池说明

BACKLOG.md 未改（本轮多路 finder 并发写同一文件）。建议 lead 入池：F1 → `B-125`（P1 编辑/性能）、F2 → `B-126`（P1 查找）。已查重：与 B-115（1 MB 源码切换）、B-116（逐键全文序列化）、B-120（自动保存双写）、B-106（TOC 功能）都不是同一路径。

## 未做

1 MB 保存 / 源码切换 / 自动保存次数按 B-115、B-120 既有结论未复测；排序与大纲面板对逐键的影响未隔离（F1 的 A/B 只差一行 `[TOC]`，无此混淆）。
