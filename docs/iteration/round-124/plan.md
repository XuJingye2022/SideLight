# 第 124 轮计划（P2：在审面板开着时快照不刷新）

## 0. 范围
只修第 123 轮 finder F2：面板开着时自动保存写入的快照不刷新，空态「保存一次后才会记录。」与磁盘矛盾（`.tmp/r123-finder-bug-def.json`：reviewLater `snaps:[]`、`snapEmpty` 该句、`diskRevisions:1`、toast「已保存 a.md」；重开 1 行）。BACKLOG 尚无 ID，建议登记 **B-257**（B-256 已被改名竞态占用）。不碰在审列表重扫（B-231/B-234）、快照回滚（B-248）、B-229、B-255/B-256；不加依赖、不改 CSS、不改编辑器/序列化（`roundtrip` 不跑）。

## 1. 现状（`ff22b67`）
根因：`MarginRail.tsx:370-382` 的 `loadSnapshots` 只在 `openReview()`（`:385-406`）调一次；批注行有内存合并 `applyLiveReviewRow`（`:416-422`），快照段 `snapData`（`:323`）没有。写侧 `App.tsx:3397-3409` 的 `recordRevision` 在 `performCommit:3504` 保存成功后 fire-and-forget，`revisions.ts:300-345` 的 `writeRevision` 返回 id 或 null。面板有效期靠 `reviewRunRef`（`:318`，关面板/切页签/换文档 +1）。

## 2. 体积（先算）
- 实测门 gzip **315,685**（measure PASS，余硬线 **4,315**）；`MarginRail-*.js` gzip9 **7,416**（raw 21,053）；B-229 合计 **323,101**。任务书 312,423 是第 93 轮数字（BRIEF 未更新），按实测算。
- 预估：App.tsx +≈180 字符 → 门 **+60~110 B**；MarginRail.tsx +≈700 字符 → chunk **+180~300 B**；测试不进包。
- 阈值：门 ≤**315,845**、chunk ≤**7,816**；硬线 320,000 门口径不破（余 ≥4,155）。门+chunk 仍超线属 B-229，本轮 +≤400。

## 3. A1 修复（B-257）
files：`src/App.tsx`、`src/components/MarginRail.tsx`、`src/lib/revisionRefresh.test.ts`、`package.json`

1. `App.tsx:490` 后加 `const [revisionEpoch, setRevisionEpoch] = useState(0)`（注释记第 124 轮）。
2. `recordRevision`（`:3397-3409`）：`const id = await writeRevision(...)`；`if (id) setRevisionEpoch((value) => value + 1)`；`if (!dir) return`、`void` 写法与 deps 不动。
3. `<MarginRail`（`:6017-6040`）`getRevisionSource` 后加 `revisionEpoch={revisionEpoch}`。
4. `MarginRail.tsx`：Props（`:68`）与解构（`:138`）各加 `revisionEpoch: number`；`reviewRunRef`（`:318`）旁加 `snapSeqRef` 与 `loadedEpochRef = useRef(revisionEpoch)`；`loadSnapshots`（`:370-382`）发起时 `const seq = snapSeqRef.current + 1; snapSeqRef.current = seq`，两处判据改 `reviewRunRef.current === run && snapSeqRef.current === seq`；`loadSnapshots` 后、`openReview` 前加
   `useEffect(() => { if (revisionEpoch === loadedEpochRef.current || !reviewActive) return; loadedEpochRef.current = revisionEpoch; loadSnapshots(reviewRunRef.current) }, [revisionEpoch, reviewActive])`；
   `openReview`（`:392` 后）加 `loadedEpochRef.current = revisionEpoch`（打开即现读，effect 不重读）。
5. 新 `src/lib/revisionRefresh.test.ts` 4 条静态门（照 `railModalGate.test.ts` 读源码），挂 `npm test` 链尾：① epoch 声明恰 1；② `setRevisionEpoch` 恰 1、在 `await writeRevision(` 后、受 `if (id)` 守卫；③ `revisionEpoch={revisionEpoch}` 1 处 + Props/解构各 1；④ effect 有 `!reviewActive` 早退、`loadSnapshots` 判据含双 ref、epoch 路径无 `reviewRunRef.current += 1`。

验收：负向（备份 SHA256 后做在改后代码上）删 `!reviewActive` / 删 `snapSeqRef` 判据 / `if (id)` 改无条件 → 各 1 红 exit 1，还原 4/4；`npm test` **65 文件 917 条 0 fail**（基线 64/913）；`npm run build` exit 0；`git grep -n --untracked revisionEpoch -- src` 改前 0（exit 1，对照 `reviewRunRef` 5 行）→ App 2 + MarginRail 4 + 测试；`git diff --stat` 只 4 文件、`styles.css` 0 行。

风险：**epoch 路径不许推进 `reviewRunRef`**——`openReview` 的 `finally`（`:403-405`）按同一个 run 判 busy，读盘期间推进会让 `reviewBusy` 永真、列表停在「正在读…」；所以用 `snapSeqRef` 做「后发起者胜出」，`reviewRunRef` 只判面板有效期。面板关着时 effect 早退、不更新 `loadedEpochRef`、不读目录；下次开面板由 `openReview` 现读。每次保存多一次 App 渲染，无首屏影响。空态文案不动：重扫后与磁盘一致；首次保存不记快照属 B-226 已知限制。

## 4. A2 证据与回归
files：`.tmp/e2e-r124-a1-snap-refresh.mjs`、`.tmp/r124-a1-snap-refresh.json`（不改产品代码）

1. 照 `.tmp/e2e-r123-finder-bug-def.mjs` 的 F2 段写独立脚本（ego CDP 57270、`node .tmp/reset.mjs 57270`、1440×900、假 FSA + 假 fetch、autoSave 开）：a.md 打 1 字（不等自动保存）→ 立刻开「在审」→ `waitForFunction` 等磁盘快照数变化（≤8 s）。
2. revisions 目录 `entries()` 加计数；四个时点采磁盘份数、`.rail-snap-row` 行数、`snapEmpty`、`panelOpen`、toast、pageerror。
3. 断言：① reviewImmediate `snaps.length===0` 且空态在；② reviewLater `snaps.length === diskRevisions`（≥1）、`snapEmpty===null`、`panelOpen`、toast 含「已保存 a.md」；③ entries 计数 reviewLater 比 reviewImmediate 恰 **+2**（写侧扫描 1 + epoch 重读 1）；④ 关面板后改 1 字 `Ctrl+S` 只 **+1**（无后台重读），重开行数 = 磁盘份数；⑤ 0 pageerror。
4. 体积：`npm run verify` + measure + chunk gzip9，对照 §2 阈值记净增。回归：`.tmp/r114-tester-e2e.mjs` 27/27、`.tmp/e2e-r101-review.mjs` 57/57。

验收：断言全 true、0 pageerror；门 ≤315,845、chunk ≤7,816、硬线不破；回归通过；`npm test` 65/917/0。风险：r123 脚本夹带 F3（对话上下文，未修），只留 F2 段；CDP 9222 不可用，统一走 57270。

## 5. 回滚
单轮单提交，`git revert` 即可（无迁移、无 CSS、无依赖）。不 push、不改 `release/`、版本 0.32.1、CHANGELOG 只写 `## Unreleased`（scribe 收尾）。A1 ≈12 min、A2 ≈10 min。
