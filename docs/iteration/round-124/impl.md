# 第 124 轮实现（executor）

轮前 `ff22b67`。A1/A2 全做完，门禁全绿。

## 1. 任务状态

- **A1 完成（B-257）**：`App.tsx` 加 `revisionEpoch` 代际（`:494-495`）、`recordRevision` 改 `await writeRevision` 取 id、`if (id)` 才递增（`:3410-3412`）、`<MarginRail>` 传 `revisionEpoch={revisionEpoch}`（`:6048`）；`MarginRail.tsx` 加 Props（`:69-70`）/解构（`:141`）/`snapSeqRef`+`loadedEpochRef`（`:322-325`）/`loadSnapshots` 双 ref 判据（`:377-391`）/`[revisionEpoch, reviewActive]` effect（`:393-402`）/`openReview` 同步 `loadedEpochRef`（`:413-414`）。epoch 路径不推 `reviewRunRef`。
- 新 `src/lib/revisionRefresh.test.ts` 4 条静态门（照 `railModalGate.test.ts` 口径，注释先摘掉），挂 `npm test` 链尾。
- **A2 完成**：`.tmp/e2e-r124-a1-snap-refresh.mjs` → `.tmp/r124-a1-snap-refresh.json`，**PASS 10/10**、0 pageerror。

## 2. 门禁结果

| 命令 | 结果 |
| :--- | :--- |
| 负向 m1（删 `!reviewActive`） | 3 pass / **1 fail**，exit 1 |
| 负向 m2（删 `snapSeqRef` 双判据） | 3 pass / **1 fail**，exit 1 |
| 负向 m3（`if (id)` 改无条件） | 3 pass / **1 fail**，exit 1 |
| 还原后新测试 | **4/4** exit 0；两文件 SHA256 与备份逐字同 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **65 文件 / 917 条 / 0 fail**（基线 64/913，+4） |
| `npm run build`（verify 内） | exit 0 |
| `npm run verify` | **PASS**，首屏 gzip **315,726 B**（基线 315,685，净 **+41**；阈值 ≤315,845 ✓；硬线余 4,274 ✓） |
| `MarginRail-CsQwh5S0.js` gzip9 | **7,495**（基线 7,416，+79；阈值 ≤7,816 ✓） |
| B-229 合计 | 315,726+7,495=**323,221**（+120，仍 `open`，只记） |
| `roundtrip` | 未跑（未改编辑器/序列化） |

静态门：`git grep -n --untracked revisionEpoch -- src` 改前（HEAD）**0 行 exit 1** → 改后 **App 2 行 / MarginRail 8 行 / 测试 11 行**。`git status --porcelain`：3 个 `M` + 1 个 `??`；`git diff --numstat -- src/styles.css` 空。

**偏差**：预填「MarginRail 4 行」实测 **8 行**（7 代码 + 1 注释）：guard/赋值/deps 各一行，加 Props、解构、`useRef`、`openReview` 同步共 7 行；App 侧 2 行与预填一致。

## 3. A2 实测（ego CDP 57270，1440×900，假 FSA + 假 fetch，autoSave 开）

前闸门（critic #5）：dev server 的 `/src/App.tsx` 与 `MarginRail.tsx` 均含 `revisionEpoch`、`snapSeqRef`（新模块），否则整链按旧逻辑假红。

- 打 1 字、不等自动保存立刻开「在审」：`snaps 0`、空态「保存一次后才会记录。」、`diskRevisions 0`、`panelOpen true`。
- 等磁盘出现快照（≤8 s）：`snaps.length 1 === diskRevisions 1`、`snapEmpty null`、`panelOpen true`、toast「已保存 a.md」。
- revisions 目录 `entries()` 计数：`scans 0 → 2`，**恰 +2**（写侧扫描 1 + epoch 重读 1）。
- 关面板后改 1 字 `Ctrl+S`：`scans 2→3`（**+1**，无后台重读）、磁盘 `1→2`；重开 `scans +1`、行数 **2 = 磁盘 2 份**、`snapEmpty null`。
- 0 pageerror。

回归：`.tmp/r114-tester-e2e.mjs` **27/27**、`.tmp/e2e-r101-review.mjs` **57/57**、`.tmp/e2e-r123-a1-rename-snap.mjs` **12/12**（critic #6）。

截图：无（0 样式改动）。`if (id)` 注释按备注写「新写或同 id 已存在都算」。

## 4. CHANGELOG 一行建议

`修复：「在审文件」面板开着时，自动保存写入的修订快照要等下次开面板才出现（保存成功即重读清单）。`

## 5. 新踩坑

1. 静态门数「解构字段」不能用 `revisionEpoch,`：effect 的 deps `[revisionEpoch, reviewActive]` 也命中，要连行首两空格与换行一起数。
2. A2 的「开面板即空态」要等 `.rail-snap-empty` 出现再采样（固定 900 ms 会误判成「没刷新」）。
3. `reset.mjs` 收尾会关掉它建的页，`r114-tester-e2e.mjs` 按 `pages()[0]` 取页会拿到 undefined；先跑 `.tmp/r124-open-page.mjs` 留一个 5175 页。

未做：B-257 的 BACKLOG 登记（该文件不在 A1 files 内，留 lead/scribe）。
