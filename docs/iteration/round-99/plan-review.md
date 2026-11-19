# 第 99 轮计划审查（critic）· revision 1 复审

审 `docs/iteration/round-99/plan.md` revision 1（修订快照与批注迁移，B-226）。上一版 6 条逐条核过：**CR-1/2/3/4/6 已修**；**CR-5 只修了文件引用，S2 仍不覆盖迁移分支** → 1 条 P1，其余 4 条 P2。

## 已核实（实跑/读取）

- HEAD `4182ed2` = startSha，工作区只有 `docs/iteration/round-99/` 未跟踪。`node scripts/measure-first-screen.mjs --max 315500` 实测 gzip **313,888**、余 1,612、PASS（硬线 320,000 余 6,112），与计划一致。
- CR-1：`settings.ts:38` 的键名对、`:134` 认 `autoSave:false`；`App.tsx:3615-3618` 无脏不写 —— S1 的「打 1 字 + 关自动保存」可绕。CR-2：丢弃规则①与 `shiftAnnotations:573-581` 语义一致。CR-3：`buildTextIndex:287-297` 的 positions 口径手算「插 1 字 / 删 1 字 / 删 2 字」三例 `positions[p]` 恒等，`size−delta` 门挡得住包裹节点 +2；不会误伤正常平移。CR-4：`bytesText=withEol` 与 `:3415` 写盘同源。
- `.tmp/r98-tester-agent.mjs:45-137` 假 FSA 有 `entries()` 与 `__vfs.files`；`.tmp/e2e-r97-a1-status.mjs` 在。无新依赖、不碰 CSS/宿主/版本，写 `.sidelight/revisions/` 合规。

## 漏洞

- **P1-1（P1）S2 用例证明不了 A2-3 的迁移接线**：`findRange` 命中优先（`App.tsx:4778-4784`）。「引文**前**插 1 字」引文未变，走的是旧引文重定位；「同长替换 delta=0」即使 oldIndex 在 `setMarkdown` 之后才拍（delta 恒 0、positions 恒等）也全过 —— 迁移接错仍全绿。修：S2 改「引文**中间**插 1 字 → 引文失配 → 期望 `from` 不变、`to`+1」（删 1 字则 `to`−1）；from/to 读 `.sidelight/annotations/a.json`（写盘有 600 ms 防抖，`App.tsx:2107-2132`），别从 DOM 猜。
- **P2-1（P2）记录点只挂 `performCommit:3463`**：新文档首存走 `saveIntoWorkspace:3367`（`finishSaved` 早于 `setActiveFile:3368`，`fileRef` 还是旧文档）、另存为 `:3490`/`:3551` 都不记。修：`recordRevision` 显式收 `parent`（主路 `cacheDirFor()`、`saveIntoWorkspace` 用 `root`）；另存为拿不到父句柄就写进 plan 的「不覆盖」。
- **P2-2（P2）`revisionDigest(key,text)` 的 key 是否进哈希没定死**：只哈希文本时，两份同文本文件撞同一 `<id>.json`，「同 id 直接返回」让第二篇 0 快照、prune 也按错 key 计数。修：哈希 `key+'\0'+text`（与 bytes 口径无关），加「同文本不同 key → id 不同」单测。
- **P2-3（P2）超线退路无效**：A3 的文件全在 `.tmp/`、`impl.md`、BACKLOG，不进首屏，砍 S3 省 0 B。修：超 315,500 时先量净增，真要退就抬 `--max` 到 316,500（离硬线仍 3,500），或砍产品代码（`parseRevision`/prune）。
- **P2-4（P2）快照语义没写清**：默认 `autoSave:true`（`settings.ts:67`），`runAutoSave:3952` 也走 `performCommit` → 每次停笔 2 s 就写/删一份（≤9 次小 json IO），8 档只剩「最近 8 次停顿」。修：写明「含自动保存」；若只想留人工保存，`performCommit` 加 `manual` 形参（`requestSave` 传 true），S3 覆盖。

## 结论

**REVISE**（1 条 P1：S2 用例不覆盖迁移分支）。只改 A3 的 S2 一行（加「引文中间插/删」用例）即可执行；范围、体积、红线判断不用改。
