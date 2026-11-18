# 第 81 轮计划审查·复核（critic）

判定：**PASS**。上一版 3 条 P1 均已修；无新 P0/P1。下列 4 条 P2 执行时顺手处理，不必再复审。

## 上一版漏洞复核

| 编号 | 状态 | 证据（plan.md 指 revision 1） |
| :--- | :--- | :--- |
| P1-1 | 已修 | `plan.md:20-24`：主门换机制断言（`sl-source-stats`：c1−c0=0、c2−c0=0、c4−c0=1），保留 `:6035` 静态门，次门槛按 before 实测 p50−5 ms，份额 <25 ms 且降幅不足时保留改动记 UNVERIFIED。核过：`countText(` 现为 5 处（`App.tsx:596/1119/1155/1205/6035`），删 1 加 1 仍 5 处；我上轮实测 share 15.8–20 ms，与该主门配套成立 |
| P1-2 | 已修 | `plan.md:33-39`：清理挂到 `:1129-1132` 的 `dirtyNow===false` 翻转；D1' 改为「开设置→等草稿→取消→Ctrl+Z→≤600 ms drafts=0」，`:36` 要求改前同脚本 D1'=1；`discardDraftFor` 声明在 finishSaved（`:3040`）前、`:3117` 补依赖；次触发列 (a)/(b) 二选一。已核 `:3164-3168`、`:3376-3379` 是两条早退，`:3668` 是 runAutoSave 脏门，`:3793-3799` 取消后会重排 2 s 自动保存——撤销先落地，路径成立 |
| P1-3 | 已修 | `plan.md:35`：主名 ≥41 字符（`cache.ts:69-73` 只在 cacheKey≠legacyCacheKey 时非 null），先塞 `<current>.md` 与 `<legacy>.md`，Ctrl+S 后两键都不在、改前 legacy=1；`r30-fsa.mjs:6,:197-203` 的 `files` 是 Map 且默认建 `.sidelight/drafts`，塞/删路径可行 |

## 已核事实（执行者不用再查）

- `finishSaved` 现只删 oldName/name 两主键（`App.tsx:3109-3114`），legacy 确未删；`:3117` 依赖为 `[cacheDirFor,hostDoc,rememberDisk]`。
- 草稿定时器 `stale()` 含 `!dirtyRef.current`（`:769-774`）：撤销后重排的 2.5 s 计时器自行空转，D1'「再等 2.5 s 仍 0」不会被自己重写推翻。
- A3：`App.tsx:4793/4826`、`export.ts:33,110` 未动；我现跑 `node --experimental-strip-types src/lib/export.test.ts` = **27 pass / 0 fail**。
- 环境实测：dev 5175 返回 200；9222–9226 全闭，脚本必须改走 ego（54280）。设置「取消」在 `SettingsDialog.tsx:233`。

## 剩余 P2（不阻塞）

1. A2 若选 (b) `requestSave:3376-3379`，D2 改成「400 ms 后再 Ctrl+S」后主触发已在 300 ms 清完，场景零判别力。定死 (a)；或 (b) 场景 400 ms 后再塞一份草稿、再 Ctrl+S 断 drafts=0。
2. A1 次门槛「每键 longTask p50 ≤ before−5 ms」未定义 after 数组变短/为空的口径。补：after 无 longtask 记达标；条数不同改比「同一 10 键窗口 longTask 总时长」。
3. A2 反例「`autoSave:false` 与保存失败仍留草稿、重开同篇不弹恢复」两句互斥：草稿比磁盘新时 `:2457-2458` 必弹。拆两断——失败/关自动保存→草稿仍在；保存成功后再开→不弹。
4. 新脚本照抄 r64 骨架会写死 `127.0.0.1:9222`（现全闭）。改 `SIDELIGHT_CDP ?? http://127.0.0.1:54280`，并按 `common.md:12` 先跑 `node .tmp/reset.mjs`；ego 只试 1 次，失败记 UNVERIFIED。
