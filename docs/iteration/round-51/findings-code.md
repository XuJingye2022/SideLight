# 第 51 轮 · 代码与性能侦察（finder-code）

- 轮前 `startSha` fb6fe9a；HEAD a523a58。`git diff --stat fb6fe9a..HEAD` 只有 5 个流程文档 + `scripts/iteration/metrics.mjs`，**src/ 零改动** → 本轮不查 diff，转查最近 3 轮改过的保存链/基线归一化周边。
- 基线：`npx tsc --noEmit` exit 0（0 错误）；`npm test` exit 0（fail 0）。
- 实测脚本：`.tmp/e2e-r51-finder-code.mjs`，原始日志 `.tmp/e2e-r51-finder-code.log`，CDP 9225，`node .tmp/reset.mjs 9225` 后跑，连跑两次读数一致。

## 实测（dev server 5175，CJK 密文，含标题/列表/代码围栏）

| 指标 | 100 KB | 1 MB |
| :--- | :--- | :--- |
| 源字节 / 正文字符 | 102,469 / 38,495 | 1,048,787 / 396,172 |
| 载入 `sl-load-start`→`sl-sync-done` | 24.9 ms（parse 21.9） | 2,125.2 ms（parse 2,087.6，占 98%） |
| 逐键 p50 / p95 / max（26 键，间隔 90 ms） | 2.4 / 3.2 / 5.7 ms | 18.6 / 20.9 / 21.3 ms |
| longtask（>50 ms）次数 / 总时长 | 0 / 0 ms | 0 / 0 ms |
| 两次跑 p50 · p95 复现 | 2.4 · 3.2 | 18.0/18.6 · 19.7/20.9 |

- 逐键延迟随字节线性放大（10 倍正文 ≈ 7.7 倍延迟），与「每个键做整篇序列化」的代码路径吻合（`src/App.tsx:910`，见 F-1 证据链）。
- 滚动探针失效：`.doc-scroll` 选择器没命中真实容器，`window.scrollBy` 后 `before == after`（23,409 / 240,363 均未变），滚动开销本轮 **UNVERIFIED**，需按真实滚动容器重写探针。
- `1 MB 载入 2,087.6 ms` 与 AGENTS 记的「1 MB 载入 1,284 ms」不同；本轮文档 CJK 字符多（396 k 字符）、dev 未压缩，**不构成回归结论**，数字口径要写清。

## F-1（P1，B-006 的实测补证，不新增计数）保存 = 无改动也整篇重写 + 写前整篇读回

证据链（工作区文件目标，非宿主）：
1. `src/App.tsx:3447-3452` `saveFile()` → `requestSave('file')`。
2. `src/App.tsx:3004` 只有 `goal === 'host'` 有 `!dirty` 守卫；`'file'` 无。改一个字没改也照样往下走。
3. `src/App.tsx:3018` → `prepareSave()`（`src/App.tsx:2927-2931`）：`serializeDocument` 整篇 + `normalizeForBaseline` 副本 + CRLF 时 `.replace(/\n/g,'\r\n')` 再一份。
4. `src/App.tsx:2813` `previousText = await target.handle.getFile()...text()`：**每次写盘前把旧文件整篇读回**（只为写后身份校验回滚用），自动保存同样走这条（`3324` → `performCommit`）。
5. `src/lib/workspace.ts:270-277` `writeNode` 直接 `createWritable/write/close`，不与磁盘现状比较。

因此一次「停笔 → 自动保存」（2 s 防抖，`src/App.tsx:3355-3357`）至少 1 份整篇序列化 + 2 份整篇副本 + 1 次整篇读 + 1 次整篇写；再加 `onUpdate` 逐键那次（`910`）和 300 ms 派生链（`923-928`，5 个全文 repair）就是 B-006 的「4 份全文」。按本轮实测，1 MB 逐键那 18.6 ms 里含一次整篇序列化（未单独隔离）。
建议（不改红线）：给 `'file'` 目标补与 host 同形的 `!dirty` 早退；把 `previousText` 改为写后再读（或只在身份校验失败时读）——成功路径可省一次 1 MB 读。

## F-2（P2，B-205 可结项：1 MB 逐键已有数）逐键是 O(全文)，上限外推不可忽视

`src/App.tsx:905-913`：每个 `onUpdate` 都用 `contentRef.current()`（= `serializeBodyNow`，`src/App.tsx:2906-2914`）序列化**整篇**再与基线比。实测 100 KB 2.4 ms → 1 MB 18.6 ms，线性；`MAX_DOC_BYTES` 允许 5.5 MiB（`src/lib/workspace.ts:241`），按同斜率外推约 100 ms/键（**外推，未实测**）。当前 1 MB 下无 longtask，不阻塞；建议 backlog 记 B-205 为「1 MB p95 20.9 ms，已测」，并把 5.5 MiB 逐键留作下一轮可测项（先做个 5.5 MiB 载入能否完成的可行性判断）。
优先级的现实做法：脏判定改「长度先比 + 300 ms 派生时再整篇比」，逐键只做 O(1) 拒绝。

## 查重结论

F-1 = `B-006`（open，勿重复计数）；F-2 补 `B-205`（deferred）。本轮未发现新的 P0，未改产品代码。
