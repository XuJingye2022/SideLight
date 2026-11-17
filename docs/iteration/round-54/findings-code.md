# 第 54 轮 finder-code（代码与性能）

范围：HEAD `b01a4e6`（== 轮前 startSha，本轮无 diff），查最近 3 轮改动周围（52 `86ba2d1`、51 `823c1d4`、50 回滚项）与保存链。
环境：dev 5175、CDP 9225、`node .tmp/reset.mjs 9225` 后跑；原始读数 `.tmp/r54-finder-code.json`、`.tmp/r54-finder-log.json`、`.tmp/r54-finder-draft.json`。

## 基线（可复现，全绿）

| 门 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npx tsc --noEmit` | exit 0 | — |
| `npm test` | exit 0，fail 0（34 文件 442 条） | — |
| `npm run roundtrip` | exit 0，rich 5/7 / source 7/7；`06-task-list -0 +1` 与 `04-reference-links` 均为既有项（`86ba2d1` 前同值） | `docs/roundtrip-report.md:26` |
| 1 MB 载入 | 1,808 ms（第 52 轮 B-013 修复仍有效，第 51 轮基线 110.9 s） | `.tmp/r54-finder-code.json` → `loadBig` |
| 无改动 `Ctrl+S` | 0 次 `getFile` / 0 次写盘，提示「没有改动，未写入。」（第 51 轮 F1 回归通过） | 同上 → `noChangeSave` |

## F1（P1）一次停笔写 2 份全文：草稿副本必被随后保存作废，1 MB 下 4 个键写 5,000,074 B

**实测**（1 MB 文档，`autoSave: true`，假 FSA 记录每次 `createWritable/write/close` 的时间与字节）：

- 连续打 4 个键、间隔 1.3 s：草稿写 **4 次 × 1,000,013 B = 4,000,058 B**，正文写 **1 次 = 1,000,016 B**，合计 **5,000,074 B**；草稿在保存成功后全部删除（`finalDrafts: []`）。`.tmp/r54-finder-draft.json`
- 单次停笔的时间线（`.tmp/r54-finder-log.json`）：t=8,710 ms 写 `.sidelight/drafts/big.md` 1,000,013 B → t=9,640 ms `getFile big.md` → t=9,645 ms 写 `big.md` 1,000,013 B。草稿比正式保存早 0.9 s，写完只等一次保存就丢弃。
- 同一停笔的主线程 long task：**169 / 63 / 89 ms**（合计 321 ms）。1 MB 正文在一次停笔里被整篇序列化两次（derive 300 ms 一次、`prepareSave` 2 s 一次）。`.tmp/r54-finder-code.json` → `autoSaveBig.longtasks`
- 100 KB 同构：草稿 100,011 B + 正文 100,011 B = 200,022 B/停笔（`autoSaveSmall.counts: writable 2, close 2`）。

**代码**：`src/App.tsx:999-1027` 在有磁盘目录且 `dirty` 时无条件排 800 ms 草稿写，早于 `src/App.tsx:3467-3469` 的 2 s 自动保存；保存成功后 `src/App.tsx:1019-1023` 再补删这条草稿。≤256 KB 文档另写一份 localStorage 副本（`src/App.tsx:989-990`）。

**建议**：`autoSave` 开 + 有写盘目标时，草稿副本只在「保存被跳过或失败」时写（或把草稿去抖放到自动保存之后；大文档沿用 256 KB 常数做门槛）。预计 1 MB 停笔写盘 2,000,026 B → 1,000,013 B，主线程少一次全文写与一次序列化。

## F2（P2，仅观察）保存写后仍多取一次文件句柄

`src/App.tsx:2916` 写前取回滚基线（`reusableDiskText` 命中，1 MB 下正文读回 0 次 —— 第 51 轮 F1 优化有效），写后又一次 `getFile()`（`.tmp/r54-finder-log.json` t=9,650）。只取元数据、不读正文，成本可忽略；列此备查，不建议本轮动。

## 竞态核查（未发现放大）

- 自动保存到点前 100 ms 按 `Ctrl+S`：写盘 2 次（1 份草稿 + 1 份正文），与纯自动保存同值，**没有**「手动 + 自动各写一份正文」。`.tmp/r54-finder-code.json` → `raceSave.counts`
- 保存成功后草稿删净；无残留 `.sidelight/drafts/*`。

## 未验

- 真实磁盘（非内存假 FSA）下 1 MB 写的实际耗时与 IO 抖动。
- 草稿写失败（只读目录）时的可见错误路径 —— 无真环境。
- 保存链 long task 是否随文档规模线性增长（只测 100 KB / 1 MB 两点）。
