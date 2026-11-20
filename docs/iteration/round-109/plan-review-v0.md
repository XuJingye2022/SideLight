# 第 109 轮计划审查（critic）

**结论：REVISE**。2 条 P1（体积门不可达、静态验收必红）+ 3 条 P2；范围与设计核过，不用重做。

## 独立复核（HEAD `56628d6` 的 dist）
- `node scripts/measure-first-screen.mjs`：gzip **315,171** / raw 1,022,573 / 余硬线 4,829；`--max 313000` 实测 **FAIL exit 1**（headroom −2,171）。`MarginRail-D54bhGqh.js` gzip9 **6,778** → 真实首载 **321,949**，超 320,000 **1,949**（B-229 open）。
- §0 基线可复现：r102 探针 `oneMoreSave read:81/wrote:1/listed:1`、第 10 篇首存 `read:73`；`revisions.test.ts` 24/24。
- 机制与落点对：`:218-223` 存在性探测、`:228-238` 逐档读 + `parseRevision`；`RevisionEntry`/`pruneRevisions`（`:140-172`）本就按 name/key/savedAt 设计，改文件名来源**签名不动**；`parseRevision` 是包内唯一引用（App 只 import 另三个）。

## 漏洞
- **CR-1（P1）体积门不可达**：plan.md:51-54 的 312,423 / 7,577 是第 93 轮旧数（实测 315,171 / 4,829，差 2,748）；门 `--max 313000` 低于改前 2,171，A2 在实现前就 exit 1。§3 又只写「UI 净增 0」，漏记 B-229 已超硬线 1,949。
  修：A2 先 build 量改前门，门取改前 +≤250（≈315,430），chunk 不变 6,778、合计=门+chunk；test.md 给门/chunk/合计三数，写明「B-229 超线 1,949，本轮不新增破线口径」。
- **CR-2（P1）静态门必红**：`parseRevision\(` 在 revisions.ts 实测 **2 行**（`:71` 声明、`:233` 调用），删调用后仍剩 1，计划要求 0。修：模式改 `= parseRevision\(`（改前 1 :233 → 0）；`.getFile()` 1（`:232`）→0 已核，可用。
- **CR-3（P2）写盘被列目录失败绑死**：新顺序先 `entries()` 再写；列目录一抛错，外层 catch 让这次快照**完全不写**（改前是先写后列）。修：列目录单独 `try/catch → []`（失败只跳过清理），写入与 prune 照常。
- **CR-4（P2）名字解析缺失败面**：`<keyHash>-abc.json` 的 `parseInt(…,36)` 为 NaN，参与 savedAt 排序会乱序、误删或误留。修：段数/正整数/8 位 id 校验，坏名回 null 跳过，加 1 条单测；entries 保留 `kind==='file'` 守卫。
- **CR-5（P2）新测 ② 打桩不自洽**：「1000/2000/3000 写 9 份」只有 3 个时刻，断不出「留最新」。修：9 个递增打桩（1000…9000），断留下的是最大 8 份、删的是 1000。

## 判为没问题
- 范围：只 revisions.ts + 测试 + `.tmp`，不碰 App/CSS/宿主/依赖/release，2 任务 25 分钟可行。
- 设计：keyHash-savedAt-id 命名让清理只列名不读内容；旧格式不读不删（R1）在 0.32.1 未发版前提下成立。
- 红线/回归：缓存仍在 `.sidelight/revisions/`；快照 JSON 结构不动；`pruneRevisions` 纯函数测试不动；无其它消费者。
- 门槛形态合格：用「内容读 0 次」机制门 + 改前探针 81 读，不是无实现路径的墙钟；R3 真实 FSA 记 UNVERIFIED 合理。
- 流程：B-239 尚未入池，轮前由 lead 补一行 open（不判漏洞）。
