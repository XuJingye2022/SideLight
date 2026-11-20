# 第 130 轮计划审查（critic · revision 1 复核）

**结论：PASS（P0 0 / P1 0 / P2 3）**。上版 H1–H6 全修掉；H4 落点改 P2 段末反而更对（r123 `findings-code.md:15` 原文标 **F2（P2）**，B-251…B-260 也在 P2 段末）。余 3 条按修法改字面即可，不阻塞。

## 独立复核（本机实测）
- HEAD `79dba64`=startSha；仅 `docs/iteration/round-130/` 未跟踪；`docInstance` 在 `src` **0 命中**，新名不撞。
- 体积实测：gate raw 1,025,343 / gzip **316,033** / headroom 3,967；`MarginRail-Cej3jE1X.js` raw 22,271 / gzip9 **7,869**；合计 **323,902**（超线 3,902）。与 §1 逐字节同；316,033+150=316,183 算术对；66/933+5=67/938 对。
- 行号全对：`App.tsx:496`、`:2649`（loadIntoEditor 内首个 `activeDocIdRef.current += 1`）、`:6097`（唯一 `docName={docName}`；`<MarginRail>` 唯一渲染点，新增必填 prop 不会漏改别处）；`MarginRail.tsx:60/143/174-181/191-194/360`；`:360` 由 `railModalGate.test.ts:92-98` 钉着，不动正确。
- 机制：换篇各口径都落 `loadIntoEditor`；保存不经过它；`activeDocIdRef` 保存也 +1（`:3594`）→ 不能当判据，计划判断正确。
- 负向可达：`[docKey]` 改回 `[docName]` → T3=0、T4=2，恰 2 红，T1/T2/T5 仍绿。✓
- 上版逐条：H1 门拆两条且不靠注释、§3.4 删「删注释」✓；H2 恰 2 红 ✓；H3 `git status --porcelain -- src package.json` 4 条（3 M+1 ??）✓；H4 `fixed`+证据+123/130、改到 P2 段末 ✓；H5 B-229 本轮三数+impl 口径 ✓；H6 两条验收（≤316,183 且 `--max 316300` exit 0）✓。

## 漏洞（3 条，全 P2）
| id | 说明 | 修法 |
| :--- | :--- | :--- |
| P2-1 | S3 期望 `write:r130-ws/a/note.md` 与 S2 结束态矛盾：S2 结束时打开的是 `b/note.md`。且假 FSA 的 `__vfs.ops` 记相对工作区根的路径（`write:a/note.md`），根名只出现在 `data-path`（真 FSA 的 path 含根名见 `workspace.ts:88/99`，假 FSA 的 files 键不含）。按字面写必 0 命中 → S3 假红 | 写明 S3 承接 S2 的 `b/note.md`（或先重开 a），断 `ops.filter((o) => o === 'write:b/note.md').length >= 1`；别带 `r130-ws/` 前缀 |
| P2-2 | §4.1 模块门只 fetch `MarginRail.tsx`，但 App.tsx 也改了。若 Vite 交付旧 App 模块（AGENTS §8 记过两次，第 62/126 轮），MarginRail 门绿而 S1/S2 恒红 → 误判「没修」 | 同门再 fetch `/src/App.tsx`：after 含 `setDocInstance`、before 不含（esbuild 转译后标识符仍在；别断 `docKey={`（会变对象键 `docKey:`）或 `docKey: number`（类型标注被剥））；门后全新 `page.goto` 再跑场景（r129 口径） |
| P2-3 | §3.4 降型「`docName`/`docKey` 合并成 `doc: {…}`」在 gate 上大概率不省字节：省 1 个 prop 名（≈20 B raw），换对象字面量（≈35 B raw）+ 两处 `doc.name` 改写，gzip 大致持平 | 先量再决定；合并 prop 只当记录，仍超就按计划停手交 lead 并记 B-229，别把它当有效降型 |

## 结论
PASS。三条 P2 按上表改字面后再跑 A2；其余（范围、红线、体积口径、before/after 设计）照计划执行。
