# 第 17 轮 · A 组实施报告（T1 → T4）

日期：2026-11-16。基线 v0.30.0。未 commit；未跑 `npm run build`。
边界：`src/App.tsx`、`src/lib/workspace.ts`、`scripts/stale-save-acceptance.mjs`（新）、`scripts/bigfile-acceptance.mjs`（新）、本报告。**未新建** `refresh-race-acceptance.mjs` 与 `perf-longdoc.mjs`。

| 任务 | 结论 | 证据 |
| :--- | :--- | :--- |
| T1 保存竞态 | **PARTIAL（核心 PASS，B4/B5 未测）** | `stale-save-acceptance` **4/4**：慢写 2.5 s + 切 b.md 选不保存 → 2.8 s 后标题/正文仍是 b.md；旧回包不改身份；随后 Ctrl+S 写 b.md；a.md 恢复旧内容（写入中途身份变化时 abort/回写旧文）。实现 `loadEpochRef`/`activeDocIdRef`/写后身份校验、`finishSaved(expected)`、`requestLoad` 等 `waitForCommit`、`refreshTree` 排队合并、刷新不再删已写文件。**未做**：`refresh-race-acceptance.mjs`、慢刷新中改名（B4）、保存撞刷新（B5）脚本 |
| T2 回包前丢字 | **PASS** | `host-save-acceptance` **64/64**。`contentVersionRef`/`sentTextRef.version` 比较；回包版本落后时保 dirty/旧基线、不清草稿、`pendingHostSave` 补发一次（`lastResentVersionRef` 同版本不重复）；`clearHostDraft` 只在 `dirtyRef===false` 时调用 |
| T3 大文件 | **PARTIAL** | `bigfile-acceptance` **3/3**：6.1 MiB 在 2 s 内报「文件太大，暂不支持（上限 5.5 MiB）」且旧文档不变；5.2 MiB 可打开。`workspace.ts` 导出 `MAX_DOC_BYTES=5,767,168`，`readNode` 先 `getFile().size` 再 `text()`；`loadIntoEditor` localStorage 加 try/catch。**未做**：2 MiB+「正在载入…」与取消路径、树行超限标记、QuotaExceeded 可见提示 |
| T4 性能 | **PARTIAL** | `dirty` 改为 `contentVersion !== savedContentVersion`（撤销历史退回文本比对）；`onUpdate` 删掉每键第二次 `serializeDocument`；`countText/extractOutline` 180 ms 防抖；`>256 KB` 不写整篇 localStorage。**未做**：四组件 memo、`perf-longdoc.mjs`、p95/render 次数 |

## 关键实现

- `finishSaved(name,target,...,expected?)`：epoch/docId/path 不匹配直接返回 false，不动 activeFile/docName/baseline/dirty。
- `performCommit`：起手记 epoch/docId/path 与旧正文；`writeNode` 加 `guard`，写到一半身份变化就 `abort()` 回滚；写后再次校验，不匹配时把旧正文写回并按失败收尾；只有 `deletingRef` 才「删了再删」；刷新不再删刚写文件。
- `refreshTree` 单飞改排队：`pendingRefreshRef` 保存最后一次参数，finally 里再跑一次；`refreshTreeRef` 自引用避免死循环。
- 切文档/新建/改名/删除 `loadEpoch++`/`activeDocId++`；`requestLoad` 同时等 host save 与本地 commit。
- T2 版本补发；T3 上限；T4 版本化 dirty 与统计防抖。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 文件、205 条、0 失败
npx vite build --outDir .tmp/build-a  → exit 0
stale-save-acceptance                 → 4/4 PASS
host-save-acceptance                  → 64/64 PASS
bigfile-acceptance                    → 3/3 PASS
tree 49/49 · theme 27/27（43/48 适用 + 5 排除）· keyboard 35/35 · newfile 23/23 · rename 22/22
measure --max 285000                  → 284,730 gzip PASS（余 270 B；基线 284,210，+520 B）
```

## 1 MB p95

**UNVERIFIED**：没有 `perf-longdoc.mjs`，本轮未测输入 p95；只完成每键单次序列化与统计防抖，memo 未做，无法给可信数字。

## 遗留

1. `refresh-race-acceptance.mjs` 未建，B4/B5 只有代码路径与 stale 用例，未单独验收慢刷新中改名/保存撞刷新。
2. T3 的 2 MiB 载入提示/取消、超限树行标记、配额提示未做。
3. T4 四组件 memo、render 计数、perf 脚本与 p95 全部未做；本轮 T4 不能按计划验收。
4. 首屏 +520 B（284,730），仍在 285,000 内余 270 B；新增代码主要是竞态收尾。
5. 截图：`shots/round-17/t1-race-ui.png`。
