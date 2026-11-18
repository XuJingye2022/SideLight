# 第 64 轮 finder-code 报告（代码与性能）

HEAD `368431c` = 本轮 `startSha`（`git rev-parse HEAD` 同值），本轮无产品代码改动；本角色未改产品代码。

## 门禁基线
- `npx tsc --noEmit`：exit 0，无输出。
- `npm test`：exit 0，**40 个文件 513 条，0 fail**（本轮直跑聚合）。
- `npm run verify` / `roundtrip`：本轮无 `src/` 改动，未跑。

## 实测（CDP 9225，假 FSA 工作区，先 `node .tmp/reset.mjs 9225`）
夹具：`.tmp/e2e-r64-finder-code.mjs` → `.tmp/r64-finder-code.json`；`.tmp/e2e-r64-toc-perf.mjs` → `.tmp/r64-finder-toc.json`。

| 档 | 载入 | 段/字符 | 逐键 p50/p95 | 停笔 5 s 窗口写盘 |
| :--- | :--- | :--- | :--- | :--- |
| 100 KB | 155 ms | 1,097 / 35,832 | 23 / 35 ms | 1 次 `write` 36,032 字符，草稿 0 次 |
| 1 MB | 654 ms | 11,214 / 366,995 | 80 / 83 ms | 1 次 `write` 368,784 字符，草稿 0 次，`getFile` 2，全文读 0 |
| 1 MB + `[TOC]`（550 标题） | 448 ms | 11,215 | 正文 61 / 65、标题内 77 / 80 | 未测 |

- 1 MB 停笔窗口：`createWritable` → `write` → `close` → `getFile` 全在同一毫秒级（假 fs 6 ms 内）；B-120 的 2,500 ms 草稿兜底在 1 MB 也没有触发重复写。
- 手动 `Ctrl+S` 在自动保存已清脏后：19 ms、0 op、「没有改动，未写入。」（B-006 期望路径）；有改动的 1 MB `Ctrl+S` 本轮未单独重量。

## 发现

### F1（P2）第 62 轮 finder 的 `cases.mb1` 是假读数，不能再当 1 MB 基线
- 证据：`.tmp/r62-finder-code.json` 的 `cases.mb1` 为 `loadMs 70`、`paras 1097`、`typing.p50 77`；真实 1 MB 本轮实测载入 **654 ms**、**11,214 段**、逐键 p50 **80**。`paras` 与 100 KB 档完全同值，`sourceLen 368,791` 说明 1 MB 文本直到源码切换时才进 DOM。
- 根因：该脚本 `loadDoc` 只等正文含「末尾标记」，而上一档 100 KB 文档也以同一标记结尾；`waitForFunction` 立即满足，点击后没等真正换文档，随后的段落数/逐键都在旧文档上测。
- 影响：`.tmp/r62-finder-code.json` 的 `cases.mb1` 载入与逐键段不可引用；第 62 轮报告 F3 的 1 MB 数字取自另一脚本（`.tmp/e2e-r62-finder-mb.mjs`），未受影响。
- 建议：夹具每档用唯一尾标记 + 正文字符数门槛。本轮两脚本已按此写（`末尾标记KB100` / `末尾标记MB1`，1 MB 门槛 300,000 字符）。

### F2（P2）1 MB + `[TOC]` 在标题里逐键比正文贵 16 ms/键，未达 P1
- 证据：同一文档正文段落 p50 61 / p95 65 ms；H2 标题内 p50 77 / p95 80 ms；目录 HTML 由 58,468 → 58,478 字符（确认按 B-129 规则重建），无 >50 ms longtask。目录节点是 `<button class="sl-toc-item">`。
- 判断：B-129 的「正文事务只映射」成立；标题内整目录重建是 16 ms 级，不立案，只留基线。

### F3（P2，验证）B-120 在 1 MB 档成立
- 1 MB 停笔 5 s：`autoWrites = ["mb1.md:368784"]`、`draftWrites 0`、`draftCreate 0`、`counts.text 0`、`getFile 2`（取 size/mtime）。对照第 62 轮改前 100 KB 的 72,057 字符双写。

## 判定
本轮 **0 个新 P0/P1**（`actionable_count = 0`）。BACKLOG 仍 open 的 P1 只有 B-115（1 MB 进源码 ~9.8 s，本轮未复测、未动）。
未测：真实磁盘/真实 FSA（假 fs 写入 6 ms 内完成，无法分离「真盘上保存成功前 2,500 ms 草稿兜底会不会先写整篇」）；真实宿主 WebView2（本机 INIT-FAIL）；真实 IME；有改动的 1 MB 手动保存耗时。
