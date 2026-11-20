# 第 109 轮计划审查（critic，revision 1）

**结论：PASS**。CR-1…CR-5 全部核掉，无新 P0/P1；3 条 P2 不阻塞。revision 0 见 `plan-review-v0.md`。

## 独立复核（HEAD `56628d6`）
- 体积：gzip **315,171**（raw 1,022,573、余 4,829）；`MarginRail-D54bhGqh.js` gzip9 **6,778** → 合计 **321,949**（超线 1,949）。§0/§3 其余数复算一致：门 315,421、门上限 322,199、内部预算超 5,171。
- 静态：`src/lib/revisions.ts` 的 `\.getFile\(\)` **1**（:232）、`= parseRevision\(` **1**（:233）、`export function parseRevision\(` **1**（:71）——与 A1 验收逐条相同。
- 基线：重跑 `.tmp/r102-probe-revisions.mjs` → `oneMoreSave{read:81,wrote:1,listed:1}`、第 10 篇首存 `read:73`；`revisions.test.ts` 24/24。
- 落点：`:214-249` 外层吞错、`:218-238` 探测+逐档读；产品唯一调用 `App.tsx:3403`（recordRevision ← `:3502`），无读取方；`parseRevision` 只剩测试引用。

## CR 复核（全部已修）
- CR-1 门=315,171+250=315,421，chunk 6,778 不变；§6 要「门/chunk/合计」三数 +「B-229 超线 1,949，不新增破线口径」。
- CR-2 模式改 `= parseRevision\(`（1→0），并补「声明仍 1、禁删函数」。
- CR-3 §1① 列目录单独 try/catch 取 []，写盘照常、不返 null；新测 ③ 覆盖。
- CR-4 `parseRevisionName` 失败面写全（3 段/段 1=keyHash/正整数 base36/8 位 hex，坏名回 null），`kind` 守卫保留。
- CR-5 9 次打桩 1000…9000、第 10 次 10000 写他键，断「留 2000…9000、删 1000」。

## P2
- **CR-6 静态三条没写搜索范围**：`src/lib` 其他文件仍有 18 处 `.getFile()`（trash 11、workspace 3、annotations 2、cache 2），按目录 grep 的「→0」必假红。修：验收写全命令 `git grep -nE '\.getFile\(\)' -- src/lib/revisions.ts`（1→0），三条同口径。
- **CR-7 备选与 A1 验收冲突**：§3 超门备选「同键 ≤8 份才读内容」会让 `.getFile()` 不为 0，A1 仍写 0。修：写明「备选须回 planner 改 A1 静态与 test ① 口径，executor 不得自改口径」。
- **CR-8「改前 gzip」依赖未重建的 dist**（CR-1 残项）：A2 在 A1 之后才 measure；中途若跑过 `npm run build`，读到的是新构建。修：写明 dist 只在 verify 时重建、门固定 315,421；若已重建，附 `dist/index.html` mtime 并注明门取自轮前 HEAD 实测。

## 判为没问题
- 范围/红线：只 `revisions.ts`+测试+`.tmp`；不碰 App/CSS/宿主/依赖/`release/`；缓存仍在 `.sidelight/revisions/`；JSON 结构、`MAX_REVISIONS`、`pruneRevisions` 签名不动。
- 正确性：同内容检测改由文件名后缀 `-<id>.json` 承担，与旧 `getFileHandle` 探测等价；「先列名→写盘→并入清理」不改幂等与 8 份轮转；旧格式不读不删（R1）在未发版 0.32.1 成立。
- 门槛形态：机制门「内容读 0 次」+ 探针基线 81 合格；R3 墙钟 UNVERIFIED 合理；2 任务 25 分钟可行。
