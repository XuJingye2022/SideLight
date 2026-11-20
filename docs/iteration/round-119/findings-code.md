# 第 119 轮 finder-code 报告（复查，不改代码）

- 轮次：119；startSha `83a70f2`（=HEAD，本轮 0 产品改动、工作树干净）
- 角色：代码与性能（只读）
- 环境：dev `http://localhost:5175`（HTTP 200，未重启）；ego 浏览器 CDP 57270、1440×900；假 FSA 注入工作区（9222 不可用）
- **结论：0 条新 P0/P1/P2**（`p0p1_count: 0`、`actionable_count: 0`，允许 0 条）
- 门禁基线：`npx tsc --noEmit` exit 0（0 行报错）；`npm test` exit 0（0 fail，未新增失败；本轮未逐文件汇总条数，参照第 116 轮记 62 文件 895 条）
- 原始读数：`.tmp/r119-finder-code.json`、`.tmp/r119-bench-revision.mjs`
- 脚本：`.tmp/r119-finder-code.mjs`（沿用第 112 轮探针，0 pageerror / 0 console error）

## 已测项（真机读数，非估算）

| 项 | 本轮读数 | 第 112 轮同探针 |
| :--- | :--- | :--- |
| 100 KB 载入（点击→`sl-sync-done` 增量） | 105 ms | 91 ms |
| 100 KB 逐键（keydown→编辑器首个 DOM 变更） | p50 2.4 / p95 5.6 ms | 2.2–2.5 / 5.1 |
| 1 MB 载入 | 1,024 ms | 1,443 ms |
| 1 MB 逐键 | p50 14.4 / p95 15.8 ms | 23.1 / 24.1 |
| 1 MB 进源码（到 `textarea.source-editor` 出现） | 414 ms | 486 ms |
| 1 MB 退源码（Esc→`viewMode=edit`） | 410 ms（含脚本 300 ms 等待） | — |
| 100 KB 停笔自动保存 ops | 正文 **1 次** write 100,064 B + 快照 1 次（create+write 104 B） | 同 |
| 1 MB 停笔自动保存 ops | 正文 **1 次** write 1,000,055 B + 快照 1 次（create+write 103 B） | 同 |
| 已保存后 `Ctrl+S`（干净态） | **0 次** 写盘（按 B-006 设计早退） | 同 |

结论：最近 5 轮（114–118）的侧栏/对话/快照改动**没有**在载入、逐键、保存、源码切换四条主路径上产生可测回退；同探针数值持平或更好（口径与第 56/66 轮不同，不作相减判回归）。

## 已排除的候选（读数在，不构成本轮问题）

1. **保存路径上的修订快照记录**：`recordRevision`（`src/App.tsx:3502`）保存成功后 `void` 起异步链路 → `writeRevision`（`src/lib/revisions.ts:240-285`）。它对整篇正文做 **2 次全文 UTF-8 编码**（`revisionDigest` 的 `${key}\0${text}` 模板 + `buildRevision` 的 `new TextEncoder().encode(bytesText).length`，`:34`/`:60`），Node 同一 V8 实测 1 MB 正文 **3.2–4.6 ms**（`.tmp/r119-bench-revision.mjs`），改用逐码点计长只要 0.9–1.1 ms；每次保存还枚举整个共享 `revisions` 目录（按前缀筛同键，`:259-267`），条目数 = 8 × 文档数。绝对值约为一次 1 MB 写盘的 1%，第 112 轮已记「快照 1 次、无重复全文序列化」，本轮**只留读数，不入池**（B-239 已去掉内容读）。
2. **同名跨目录的缓存键共键**不成立：写（`App.tsx:2140` 的 `cacheDirFor`→`parentDirectory(space, file.path)`）与读（`src/lib/reviewFiles.ts:148-159`）都取**文件自己目录**的 `.sidelight`，不同目录里的 `a.md` 各自隔离；`getRevisionSource`（`App.tsx:6022`）与 `recordRevision` 同口径。
3. **第 115 轮 Tab 守卫的侧效应**（`App.tsx:5888-5890`）：`view.dom.contains` 提前 return 后，源码 textarea 与 skip-link 上按 Tab 不再被送回页首（第 115 轮已登记）；静态复核未发现送丢焦点的路径。

## UNVERIFIED

- 真实 FSA 磁盘上 `dir.entries()` 的枚举成本（假 FSA 是内存 Map，只测出 JS 侧 O(8×文档数) 的形状）；真实 WebView2 宿主（本机 `INIT-FAIL` 未变）；真实中文 IME。
- 「逐键」为本轮探针口径（keydown→首个 DOM 变更），与第 56/66 轮不同口径，**不可与历史数值相减判回归**。
- 复用第 112 轮脚本时其 `OUT` 常量仍指 `.tmp/r112-finder-code.json`，本次运行覆盖了该文件；以另存的 `.tmp/r119-finder-code.json` 为准。

## 与发现池的关系

- 未新增条目：本轮 0 条可复现、可度量的新问题。
- B-229（首屏门与常驻 `MarginRail-*.js` chunk 口径）仍 `open`，属 lead 定口径，不重复计。
