# 第 112 轮 finder-bug（只读复查，未改产品代码）

startSha `e27e3d5`；dev `localhost:5175`；真机 ego 浏览器 CDP 57270（隔离 context，1440×560、假 FSA `a.md`、无 Key mock 流 + 假 fetch 401）。
探针：`.tmp/r112-finder-bug.mjs` → `.tmp/r112-finder-bug.json`（0 pageerror）。查重：已修清单与 B-229 均未重复。

## F1（P1）流式回复每来一个字都把对话记录拽回底部，用户上翻读不了

- 复现：对话页签先发 4 句把 `.rail-chat-log` 灌满（scrollHeight 517 > clientHeight 260），第 5 句发送后把 `log.scrollTop` 置 0，等 520 ms。
- 实际：`scrollTop` 0 → **344**（= scrollHeight−clientHeight，即强制贴底）；收流后 386。每个 delta 都跳一次，期间无法留在上方读历史。
- 期望：源码注释自己写的是「用户可能已经往上翻了，这里不强制——只在整轮变化时滚一次」（`src/components/MarginRail.tsx:173-175`），实际 effect 依赖 `[turns, railTab]`（`:176-181`），而 `turns` 逐 delta 变（`:200-203` 的 `appendDelta`），于是每次都执行 `log.scrollTop = log.scrollHeight`（`:180`）。第 104 轮 B-232 给这个 effect 加 `railTab` 时没有一起处理。
- 建议：贴底前判「是否已接近底」（`scrollHeight - scrollTop - clientHeight < 32` 才滚），或只在「轮数 +1 / 页签切换」时滚，不跟 delta。
- 证据：`.tmp/r112-finder-bug.json` 的 `scroll`（`setTo:0`、`afterDeltas:344`、`target:344`）；`shots/round-112/chat-scroll-yank.png`。

## F2（P2）401 后留下 16 px 高的空助理气泡

- 复现：写入假 Key（`sidelight.settings.v1`）+ 假 fetch 对 `/chat/completions` 返 401，对话页签发送一句，2.2 s 后读 DOM。
- 实际：`.rail-chat-turn` 2 条（1 user、**1 assistant 且 textContent 空**，高 16 px、`display:block`）＋ `.rail-chat-error`「API Key 无效或没有权限…」；空气泡一直留到点「新对话」。原因：`send()` 先把空 assistant 占位塞进 `turns`（`src/components/MarginRail.tsx:188`），`catch` 只写 `chatError`（`:205-207`），渲染时空文本不判空（`:714-718`）。
- 期望：失败时不留一条「回复了但什么都没有」的气泡（读屏 `role="log"` 里也是一条空消息）。
- 建议：`catch` 里记下占位索引、失败时移除末条空 assistant；或渲染时对「末条 assistant 为空且不 busy 且 chatError 非空」不渲染。
- 证据：`.tmp/r112-finder-bug.json` 的 `error401`（`bubble:{text:"",height:16}`）；`shots/round-112/chat-401-empty-bubble.png`。

## F3（P2）修订快照只写不读：磁盘上最多 8 份，界面上看不到也回不去

- 复现（静态）：`git grep -nE 'readRevision|listRevisions' -- src` **0 命中**；`revisions` 在运行时代码里只被 `App.tsx:81` 引入 `writeRevision`/`migrateAnnotations`，`src/components/` 无任何引用；`parseRevision` 只被 `revisions.test.ts` 用。写盘路径 `App.tsx:3392-3400` 每次保存成功 fire-and-forget 一份 `.sidelight/revisions/<键哈希>-<时刻>-<正文id>.json`，`pruneRevisions` 留 8 份。
- 实际：用户队列第 6 条「修订快照与批注迁移」的迁移半边（`migrateAnnotations`）有接线，快照半边只有存储：读者既看不到「哪几版」，也不能回到某一版；快照只在磁盘里轮转。
- 期望：至少一条只读入口（例如「在审」面板旁列当前篇最近 N 份快照与时间），或明确记录「快照只作内部兜底、无界面」。
- 建议：若本轮不排 UI，就在 README/BACKLOG 把这条写成已知边界，避免被当成已完成的可回滚历史。
- 证据：`src/lib/revisions.ts:13`（`REVISIONS_DIR`）、`:246`（`writeRevision`）、`:151`（`pruneRevisions`）；`src/App.tsx:81`、`:3392-3400`。

## 已验正常

页签/空态/无 Key mock 提示正常；长 URL（180 字符无空格）不撑破气泡（turn 310/310、log 310/310、栏 320/320）；8 条消息时贴底本身正确（257=257）；矮视口 560 下 log 260 px、两钮可见。
