# 第 109 轮计划（planner；revision 1）

> revision 1（2026-11-20）：按 `plan-review.md` 修 CR-1…CR-5（2 P1 + 3 P2）；任务仍 A1/A2，不扩范围。

- 轮次 109；起点 `56628d6`（= HEAD）；报告 `docs/iteration/round-109/`。
- 范围：只做用户队列这条 P1（修订快照清理每保存一次读全部快照）。单轮 2 任务；不排 P2、不改界面、不加依赖。

## 0 基线（HEAD 实测）

- r102 探针：80 份时再保存 1 次 `read:81 / wrote:1 / listed:1`；第 10 篇首存 `read:73`。
- `revisions.test.ts` 24 条 pass、0 fail。
- 首屏 gzip **315,171**（余 4,829）；`MarginRail-*.js` gzip9 **6,778** → 真实首载 **321,949**，超线 **1,949**（B-229 open）。
- 机制：`src/lib/revisions.ts:218-238` 每次保存先 `getFileHandle` 探测、再遍历目录逐档 `getFile().text()` + `parseRevision`；消费者只有 `App.tsx:3502` 与测试。

## 1 设计（已定）

- 文件名 `<keyHash>-<savedAt36>-<id>.json`：`keyHash = revisionDigest(key,'')`，`id = revisionDigest(key, 正文)`。
- `writeRevision` 五步：①`entries()` 单独 `try/catch`，失败取 `[]`——只跳过「同正文已在」与清理，**写盘照常**、不得返回 null（可能多写一份）②只收 `kind==='file'`、`.json`、`startsWith(keyHash+'-')` 且名字可解析的条目 ③见后缀 `-<id>.json` 即同正文已在，返回 id ④写盘 ⑤新条目并入集合再 `pruneRevisions(same, key, MAX_REVISIONS, name)`。
- `parseRevisionName` 失败面：`split('-')` 3 段、段 1 === keyHash、段 2 正整数 base36、段 3 去 `.json` 后 8 位 `[0-9a-f]{8}`；否则回 null 且**不进集合**（不排序、不探测、不清理）。
- `pruneRevisions` 签名/算法不变，`savedAt` 改由文件名给；旧格式 `<id>.json` 不读不删（R1）。

## 2 任务

### A1 快照命名 + 零内容读清理

- files：`src/lib/revisions.ts`、`src/lib/revisions.test.ts`；`backlog_id` 空（建议入池 B-239）。
- steps：
  1. 加私有 `revisionFileName` / `parseRevisionName`（按 §1 失败面；不新增导出，`parseRevision` 保留）。
  2. 重写 `writeRevision` 的「存在性 + 清理」段（`:218-245`）按 §1 五步；列目录失败不得让本次快照不写。
  3. 文件名断言（`:284`、`:297-300`）改「`-<id>.json` 后缀 + 条数」；9 份轮转改打桩 `Date.now` 每次 +1000（1000…10000，第 10 次写他键）+ 9 份不同正文，断「留 2000…9000 八份、`-1000-` 被删」（try/finally 还原）。
  4. 新增 4 条：①他键零内容读（fake 目录计 `getFile`/`text`，a→b→a 后 b 未被读）②预置旧格式 `deadbeef.json`，保存后仍在且 `getFile` 0 ③`entries()` 抛错仍返回 id、新文件已写（只跳过清理）④坏名 `<keyHash>-abc.json` 不参与清理：超 8 份后坏名仍在、有效份仍 8。
- acceptance：
  - `node --experimental-strip-types src/lib/revisions.test.ts` → `fail 0`、条数 ≥ 28。
  - 静态（贴改前计数）：`.getFile()` 1（`:232`）→ 0；`= parseRevision\(` 1（`:233`）→ 0；`export function parseRevision\(` 1（`:71`）→ **仍 1**（禁删函数）。
  - 行为不变：同正文连写两次 1 文件；第 9 份后同键 8 个。
- gate：`npm test` exit 0。risk：R1、R4。

### A2 探针 + 门禁 + 体积实测

- files：`.tmp/r109-probe-revisions.mjs`（新建）、`docs/iteration/round-109/impl.md`（≤4 KB）
- steps：
  1. 抄 r102 探针骨架（不改 r102，留作对照），计数分 `getFile / text / wrote / listed`；场景：10 篇 × 8 份后再保存、第 10 篇首存、同键第 9 份轮转、旧格式在场。
  2. 先 `node scripts/measure-first-screen.mjs` 记改前 gzip（期望 315,171）；再跑探针、`npm test`、verify，门 / chunk / 合计三数写 `impl.md`。
- acceptance：探针 `oneMoreSaveAfter80:{getFile:0,text:0,wrote:1,listed:1}`、`tenthDocFirstSave:{getFile:0,text:0}`、`after9SavesSameKey:8`、`oldFormatKept:true`；`npm run verify -- --max 315421` exit 0 且实测 ≤ 315,421。
- gate：同两条；不改编辑器与序列化，不跑 `roundtrip`。

## 3 体积预算

- 门 = §0 的 **315,171 + 250 = 315,421**（原 313,000 比改前低 2,171，实现前 exit 1）；内部预算 310,000 已超 **5,171**（WARN）。
- UI 净增 **0 B**；只动 `revisions.ts`：删 ~18 行、增 ~10 行，`parseRevision` 失去产品引用可摇掉（~260 B raw）→ **−200…+250 B gzip**。
- B-229：真实首载 = 实测 + 常驻 chunk **6,778**（不变）= 门上限 **322,199**；改前 321,949 已超线 1,949，**本轮不新增破线口径**，只报「门 / chunk / 合计」。
- 超门：先内联 helper 复测；仍超走备选（只加键前缀、同键 ≤8 份才读内容），A2 门改「他键 0 读、同键 ≤8 读」并写明。

## 4 风险

- R1 旧格式不读不删：升级后同正文会再写一份新格式（开发机专属），迁移另轮做。
- R2 同毫秒同键两份正文：id 与名字不同，不覆盖。
- R3 列目录仍 O(全部条目) 元数据（≤1,600 条）；真实 FSA / 网络盘墙钟 **UNVERIFIED**，本批只定「内容读 0 次」。
- R4 `keyHash` 8 位在 1,600 篇下碰撞约 0.03%，只互删历史，正文与批注不受影响。
- R5 `Date.now` 回拨次序偏差，同改前。

## 5 不做

- 不改 `App.tsx`、快照 JSON 结构、界面与依赖；不 push、不动 `release/`；不截图。

## 6 tester 独立验收

1. 自写 `.tmp/r109-tester-revisions.mjs`（不读 `impl.md`）复算 A2 四场景：内容读 0、`wrote 1`、`listed 1`、同键 8 份。
2. 用 `parseRevision` 逐份解析剩余文件，断 `key`/`savedAt` 自洽；`git diff --stat` 只含两个文件。
3. 静态三条、`revisions.test.ts`、`npm test`、`npm run verify -- --max 315421`；首屏 B 独立复核（门必须 **315,421**），test.md 记「门 / chunk / 合计」三数 + 「B-229 已超线 1,949，本轮不新增破线口径」。
4. `writeRevision` 仍有 `getFile`/`text()` 即 FAIL 并引行号；`entries()` 抛错场景单独复跑（不许返回 null）。
