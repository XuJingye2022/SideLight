# 第 109 轮测试报告（tester 独立验收）

结论：**PASS**。A1/A2 验收标准逐条独立复验通过；门禁 `verify`/`npm test` exit 0；未改产品范围之外的文件。

- 轮前 startSha：`56628d693e382f0ac0fee2805c97969c959b63fd`（未读 `impl.md`；只读 `plan.md`、`git diff`、BACKLOG）。
- 改动：`git diff --stat` 只 2 个源文件（`src/lib/revisions.ts`、`src/lib/revisions.test.ts`，152+/30−），无 `App.tsx`/`styles.css`/`package.json` 改动。

## 门禁

| 命令 | 结果 |
| :--- | :--- |
| `npm run verify -- --max 315421` | **exit 0 / PASS**：gzip **315,220 B**（raw 1,022,532，headroom 201，上限 315,421）；内部预算 310,000 超 **5,220 B** 只 WARN；build（tsc+vite+host-www）全过 |
| `npm test` | **exit 0**：62 文件 **877 条 / 877 pass / 0 fail**（日志 `.tmp/r109-tester-npmtest.log`） |
| `roundtrip` | 不跑：未动编辑器与 markdown 序列化（plan 明示） |

## A1（快照命名 + 零内容读清理）

- 单测：`node --experimental-strip-types src/lib/revisions.test.ts` → **28 tests / 28 pass / 0 fail**（≥28 达标）。
- 静态计数（用 node 逐行数，避免 PowerShell `Select-String` 行号偏移；HEAD 侧 `git show HEAD:src/lib/revisions.ts`）：
  - `.getFile()` **1（HEAD `:232`）→ 0**
  - `= parseRevision\(` **1（HEAD `:233`）→ 0**
  - `export function parseRevision\(` 1（`:71`）→ **仍 1**
- 行为不变（单测 + 独立探针双证）：同正文连写两次 → 写 1 次、1 个文件；同键连写 9 次 → 留 **8** 份，最旧删、最新在。
- 单测③ 列目录失败仍写盘：单测「列目录失败仍写快照」通过；独立探针 entries 抛错时 **返回 id 非 null、写 1 次、文件 2 个、内容读 0**。
- 单测④ 坏名不参与清理：单测「坏名不参与清理」通过；独立探针预置 `<keyHash>-abc.json` 与 `<keyHash>-0-x1.json`，9 次连写后坏名 **2 个仍在**、有效份 **8**、`removeEntry` 不碰坏名。

## A2（探针 + 体积）

- 交付探针 `.tmp/r109-probe-revisions.mjs`（3,658 B）实跑：`oneMoreSaveAfter80 {getFile:0,text:0,wrote:1,listed:1}`、`tenthDocFirstSave {getFile:0,text:0}`、`after9SavesSameKey 8`、`oldFormatKept true`；旁证 `filesAfter80 80`、全量 81 次写 `getFile 0 / text 0`。
- 独立复算 `.tmp/r109-tester-revisions.mjs`（自写，未沿用交付脚本结构）**0 failures**：
  - 预置 80 份后保存：`{getFile:0,text:0,wrote:1,listed:1}`、文件数 +1；
  - 第 10 篇首存：`{getFile:0,text:0,wrote:1,listed:1}`，他键 72 份原样；
  - 同键 9 连写：留 **8** 份，文件名逐份 = 探针自算的 `<键哈希>-<base36 时刻>-<8 位 id>.json`（如 `c33ae30a-rs-92908aeb.json`）；8 份逐个 `parseRevision`，`key`/`savedAt`/`id` 与文件名 **8/8 自洽**；
  - 旧格式 `deadbeef.json`：仍在、内容读 **0**、本次仍写 1 份；
  - 坏名 2 个仍在、有效 8 份；别键 48 份原样、`removeEntry` **0**；同正文两次只 1 写 1 文件。
- 交付物：`docs/iteration/round-109/impl.md` 3,423 B（≤4 KB）。

## 体积三数（B-229 口径，只记）

门 **315,220**（≤315,421，exit 0）/ 常驻懒 chunk `MarginRail-DlKTSYQT.js` gzip9 **6,779**（raw 19,108，round 108 为 6,778）/ 合计 **321,999**，超硬线 320,000 **1,999 B**。B-229 改前已超线 1,949，本轮不新增破线口径，仍 `open`。

## 回归

- `node .tmp/r99-tester-a.mjs`（ego CDP 57270、1440×900、假 FSA，第 99 轮快照 E2E）**32/32 PASS**、0 pageerror：S1 保存后 revisions 恰 1 个 json，新文件名 `2b24d044-mwo8km1b-bb3fc423.json`，`v==1/key=="a"/id 8 位/bytes 73 == 磁盘 73/7 字段无正文/引文同卡片`；S2 批注迁移 from/to 1/23→2/24 等 8 条不回归；S3 连存 10 次 `counts [2,3,4,5,6,7,8,8,8,8]`、末态 8 份全 key `a`。跑完已 `git checkout -- shots/round-99/` 还原。

## 偏差与说明（不判 FAIL）

- 用 node 数行而非 PowerShell `Select-String`（后者在本机对同一文件给的行号比实际少 3，如 `export function parseRevision(` 报 68 实为 71）；两种口径计数一致。
- 独立探针首跑 2 条红为探针自身时钟起点 off-by-one（第 1 次保存记 1999），修正后 0 红；产品代码未改。
- 旧格式快照不读不删（R1）：升级后同正文会再写一份新格式，迁移另轮做。

## UNVERIFIED

- 真实 FSA / 网络盘的实际墙钟成本（R3：只证明「内容读 0 次」，未验列目录 O(条目) 的真实耗时）。
- 真 WebView2 宿主；原生打印/真实中文 IME 与本轮无关未跑。
