# 第 112 轮 finder-code 报告（复查，不改代码）

- 轮次：112；startSha `e27e3d5`（=HEAD，本轮 0 产品改动）
- 角色：代码与性能（只读）
- 环境：dev `http://localhost:5175`（HTTP 200，未重启）；ego 浏览器 CDP 57270、1440×900；假 FSA 注入工作区
- **结论：0 条新 P0/P1/P2**。`p0p1_count: 0`、`actionable_count: 0`（允许 0 条）
- 门禁基线：`npx tsc --noEmit` exit 0（0 行报错）；`npm test` exit 0（链尾 `pass 3 / fail 0`，未新增失败）
- 原始读数：`.tmp/r112-finder-code.json`、`.tmp/r112-finder-cards.json`、`.tmp/r112-finder-scroll2.json`、`.tmp/r112-finder-chat.json`、`.tmp/r112-finder-esc.json`
- 脚本：`.tmp/r112-finder-{code,cards,scroll2,chat,esc}.mjs`（0 pageerror / 0 console error）

## 已测项（真机读数，非估算）

| 项 | 读数 | 对照 |
| :--- | :--- | :--- |
| 100 KB 载入（点击→`sl-sync-done` 增量） | 91 ms | — |
| 100 KB 逐键（keydown→编辑器 DOM 变更） | p50 2.2–2.5 / p95 2.6–5.1 ms | 20 键 |
| 1 MB 载入 | 1,443 ms | 既有基线 2.9 s（第 52 轮）只记不判 |
| 1 MB 逐键 | p50 23.1 / p95 24.1 ms | 20 键 |
| 1 MB 进源码（到 textarea 出现） | 486 ms | 第 64 轮口径含布局，不可直比 |
| 源码态 Esc 退出（焦点在按钮 / textarea / body 三种起点） | 3/3 回 `edit` 且焦点回 `.ProseMirror` | `.tmp/r112-finder-esc.json` |
| 自动保存写盘（100 KB / 1 MB 各停笔一次） | 正文 **1 次** write（100,064 B / 1,000,055 B）+ 修订快照 **1 次**（104 / 103 B），删除 0 | 无重复全文序列化、无写放大 |

## 已排除的候选（数据在，但不构成问题）

1. **「批注卡多时滚动掉帧」不成立**：0 张 vs 100 张待处理卡的 `.doc-scroll` 逐帧小步滚动各 3 遍——0 卡 p95 18.1/18.2/18.2、max 18.1/18.6/18.6；100 卡 p95 18.1/18.2/**27.2**、max 18.2/18.6/**68.2**。3 遍里 2 遍与 0 卡逐值相同，第 3 遍单帧尖峰不能归因到卡片数（`src/App.tsx:2436-2485` 的排布 effect 每 tick 仍逐卡 `coordsAtPos`+`offsetHeight`，但 100 卡实测未产生稳定成本）。只记读数，不入池。
2. **「对话发送前全文抽取再截 2,000 字」无可见成本**：`src/App.tsx:6009` 的 `getChatContext` 先 `readBlocks(editor)`（每次遍历全部顶层块 + `textContent`）再 `join('\n\n')`，`src/lib/chat.ts:31-36` 才截 2,000 字。1 MB（≈22,000 块）实测 Enter→首个流式字符 4 ms、收流 78–127 ms，与 100 KB（2–3 ms / 60–139 ms）无可分辨差异。不入池。
3. **修订快照清理不放大**：停笔自动保存后 `.sidelight/revisions/` 只 1 次 create+write（104 B），无 `getFile`、无逐档删除；与第 109 轮 B-239 结论一致，无新回归。

## UNVERIFIED

- 真实 FSA 与真实 WebView2 宿主（本机宿主 `INIT-FAIL`，沿用既有口径）；真实中文 IME。
- 上表「逐键」为本轮自写探针口径（keydown→首个 DOM 变更），与第 56/66 轮「逐键 p50」口径不同，**不可与历史数值相减判回归**；只作本轮绝对值。
- `npm test` 只取总退出码与链尾计数（未逐文件汇总条数）；本轮 0 产品改动，条数以第 111 轮记 62 文件 879 条为准。

## 与发现池的关系

- 未新增条目：本轮 0 条可复现、可度量的新问题。
- 未触碰既有条目（B-229 体积口径仍 open，属 lead 定口径，不重复计）。
