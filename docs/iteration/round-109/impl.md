# 第 109 轮实现报告（executor）

- 轮次 109，startSha `56628d6`，报告目录 `docs/iteration/round-109`。
- A1、A2 全部 DONE；只改 2 个产品文件 + 1 个探针 + 本文件。无界面改动，无截图；未跑 roundtrip（未动编辑器与序列化）。

## A1 快照命名 + 零内容读清理 — DONE

改动文件：
- `src/lib/revisions.ts`：新增私有 `revisionKeyHash` / `revisionFileName` / `parseRevisionName`；`writeRevision` 改为「列文件名（单独 try/catch，失败取 []）→ 见 `-<id>.json` 后缀即同内容已在、返回 → 写盘 → 新条目并入集合再 `pruneRevisions`」。`parseRevision` 保留未删（产品侧已无调用，可从包内摇掉）。
- `src/lib/revisions.test.ts`：假目录加 `reads` 记录与 `failEntries` 开关、`ensureRevisionsDir`；原两条写入断言改「`-<id>.json` 后缀 + 条数」；9 份轮转改打桩 `Date.now`（1000…10000）；新增 4 条。

命令结果：
- `node --experimental-strip-types src/lib/revisions.test.ts` → tests **28** / pass 28 / fail 0（改前 24 条）。
- 静态（`git grep -nE … -- src/lib/revisions.ts`；改前计数 1/1/1）：`.getFile()` 1（:232）→ **0**（exit 1）；`= parseRevision\(` 1（:233）→ **0**（exit 1）；`export function parseRevision\(` 1（:71）→ **仍 1**（exit 0）。
- `npx tsc --noEmit` exit 0；`npm test` exit 0（全量 62 文件 877 条，轮前 62/873）。
- 行为不变：同正文连写两次 1 文件；第 9 份后同键 8 个；列目录失败仍写盘（测③）；坏名不参与清理（测④）。

## A2 探针 + 门禁 + 体积 — DONE

- 新建 `.tmp/r109-probe-revisions.mjs`：计数分 `getFile / text / wrote / listed`，四场景。
- 探针输出：`oneMoreSaveAfter80 {getFile:0,text:0,wrote:1,listed:1}`（轮前 r102 同场景 read:81）；`tenthDocFirstSave {getFile:0,text:0}`（轮前 read:73）；`after9SavesSameKey 8`；`oldFormatKept true`（旧格式文件仍在且 0 读）。
- 体积：`npm run verify -- --max 315421` **exit 0**，实测 gzip **315,220 B**（≤315,421，余 201）；轮前 315,171 → 净 **+49 B**。门 = 轮前 315,171 + 250 = 315,421；dist 只在 verify 重建，实测取自该次构建。
- 三数：门 **315,421** / `MarginRail-*.js` chunk gzip9 **6,779**（轮前 6,778，chunk 名随主 chunk hash 变）/ 合计 **321,999**。B-229 仍超硬线：轮前 321,949 超 1,949，本轮 +50 → 超 1,999；本轮不新增破线口径，只报三数。
- 日志：`.tmp/r109-a1-tests.log`、`.tmp/r109-a2-probe.log`、`.tmp/r109-npm-test.log`（62 文件 877 条 0 fail）、`.tmp/r109-verify.log`（复跑同值）。本机 `*>` 写 UTF-16LE，读要 `toString('utf16le')`。

## CHANGELOG 建议一行

- 修订快照清理只读文件名：每次保存不再读取全部快照正文（80 份时 81 次读 → 0 次），文件名改 `<键哈希>-<保存时刻>-<正文 id>.json`，旧格式不读不删。

## 新踩坑（≤3）

1. 快照「同正文已在」不能按完整文件名判：同正文两次保存的 savedAt 不同，只有 `-<id>.json` 后缀稳定，去重必须按后缀。
2. 列目录失败要 `entries.length = 0` 清掉半截结果，否则半份清单会参与 prune，删掉本次没读到的旧快照。
3. `parseRevision` 别顺手删：静态门要求声明仍 1，单测也靠它解析；产品侧只失去调用、靠摇树减体积。
