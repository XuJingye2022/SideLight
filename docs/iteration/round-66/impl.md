# 第 66 轮 impl（executor）

startSha `8314072`；CDP 9222；dev 5175 未重启。

## 状态

A1（B-143 源码态停笔排自动保存与草稿）与 A2（一次停笔只写一份 + 1 MB 不加重）均 **DONE**，明细见下。

## 改动

- `src/App.tsx`
  - 草稿三支（localStorage ≤256 KiB / 宿主 / `.sidelight/drafts` 2,500 ms）从 `onUpdate` 的 300 ms 回调抽成 `scheduleDraft(text)`，`onUpdate` 改调 `scheduleDraftRef.current(draft)`；新增 `scheduleDraftRef`。
  - 源码脏 effect 改存 `sourceDirtyNowRef`（复用 `normalizeForBaseline`；无基线取 `sourceText !== sourceBaselineRef`），删 `persistDocKey(sourceText)`（由 `scheduleDraft` 第一支接管）。
  - 新 effect 声明在 `:3631-3635` ref 赋值**之后**，deps `[sourceMode, sourceText, originalText]`：源码改过字且 `sourceDirtyNowRef` 真时排 `scheduleAutoSaveRef` + `scheduleDraftRef(sourceText)`。`scheduleDraftRef` 与 `scheduleAutoSaveRef` 同处赋值。
  - `cancelAutoSave`/`runAutoSave`/`scheduleAutoSave` 改走 `autoSaveScheduledRef` 去重（见「偏差」）。`runAutoSave`/`performCommit`/`currentMarkdown` 未动。
- `docs/iteration/BACKLOG.md`：P1 表补 B-143、B-144（证据引 `findings-code.md`）。
- 脚本 `.tmp/e2e-r66-impl-a1.mjs`、`.tmp/e2e-r66-impl-a2.mjs`。

## 门禁

- `tsc --noEmit` exit 0；`npm run verify` exit 0，首屏 **gzip 301,073 B**（改前 300,980，+93），内部 310,000 / 硬线 320,000。
- `npm test` **40 文件 520 条全过**，0 失败。`roundtrip` 未跑（未改编辑器/序列化）。

## A1（`.tmp/r66-impl-a1.json`；改前 `.tmp/r66-finder-autosave-source.json`）

- 100 KB + 开：源码打 `B` → chip「自动保存排队中」≤300 ms（轮询 0 ms；改前恒为旧「已自动保存」）→ 3.2 s 后 100,010→100,011、尾 `…\nB\n`、chip 回 `auto-save-ok`；**文档写 1 / 草稿 0**。
- 1 MB + 开：1,000,012→1,000,013、尾 `Q`、chip ok；文档 1 / 草稿 0；`sidelight.doc.v1` 里是上一篇 small 的 100,011 字，**无整篇**。
- 1 MB + 关：`big.md` 不变；`.sidelight/drafts/big.md` 出现（尾 `R`）；文档 0 / 草稿 1。
- 负向：新 `未命名.md` 停笔 3.2 s，`__fsState.files` 2→2、无新增键。

## A2（`.tmp/r66-impl-a2.json`、`.tmp/r62-b2.json`）

- 源码 100 KB + 关：文档 0 写、草稿 1 写（含 `K`）。
- 1 MB 源码 10 字（关，3 轮）：totalMs **2,911 / 2,775 / 2,824**，p50 **2,824 ≤2,900**（改前 2,618）；long task 最大 232，无 >1,000；`big.md` 不变，草稿每轮 1 写。
- 1 MB 源码 10 字（开，3 轮）：totalMs **2,845 / 2,897 / 2,733**，p50 **2,845**；long task 最大 251；每轮 +10（1,000,022/32/42），最终盘上整串 **=== textarea 值**；文档 3 写 / 草稿 0。
- 编辑器两腿（`node .tmp/e2e-r62-b2.mjs 9222`）：开 `autoWriteBytes 36,029` / `autoDraftWrites 0` / `autoDocWrites 1`（与 `.tmp/r63-tester-b2.log` 一致）；关 `docWrites 0` / `draftWrites 1`（36,008 B）。

## 偏差

- 按 `plan-review-r2` P1-5 给 `scheduleAutoSave` 加同步去重（计划外最小改动，已记入 B-143）：不加则源码逐键多一帧 App 渲染，1 MB 每次含 `countText`，「开」腿必红、「关」腿又测不到。
- 1 MB 两档未并入 B1：本轮在 A2 直接测完，B1 复跑本脚本即可。
- 无截图：chip 是既有 UI，只改时机，DOM 文案已由 E2E 断言。

## 新踩坑

1. 验「+1 字节」时光标别停在末尾换行之后：`normalizeForBaseline` 会给末尾无换行的串补 `\n`（第 48 轮规则），N 变 N+2；放换行之前即可。
2. 源码态排程若在 `scheduleAutoSave` 里先 cancel 再置 true，每键多一帧 App 渲染；必须用同步 ref 去重。
3. 新建文档是 `Ctrl+Alt+N`；`Ctrl+N` 被浏览器拿走，会用错键把负向用例变成新开窗口。

## CHANGELOG 建议

源码模式的改动现在也参与停笔自动保存与停笔草稿（>256 KiB 文档不再只有内存一份）；状态栏在源码态显示「自动保存排队中」。
