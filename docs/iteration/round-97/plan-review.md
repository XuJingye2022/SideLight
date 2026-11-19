# 第 97 轮计划审查（critic · revision 1 复核）

结论：**PASS**。上一版 1 条 P1 + 4 条 P2 全部落地；本轮新发现 3 条 P2（不阻塞，按修法改一句）。

## 上一版漏洞：已修

- **P1-1 同 id 双份**：A1-3 的 `claimed` 去重把 `kept` 收成「本窗 fresh 没认领的 closed」，`merged` 仍按旧 id 复用 → 同句重跑回 3 条。与 `annotations.ts:395-421` 的实际写法相容，还顺带消掉旧版「窗外 pending 被复用却留在 kept」的同 id 残留。单测「条数不变 + `new Set(ids).size===length`」能钉住。
- **P2-1 旧结项不可见**：取舍第 9 行 + A3-1「恰 1 卡」把边界写成预期；`MarginRail.tsx:99`、`App.tsx:2430,2445` 不动自洽（UI 四态内部仍是 `pending`，照常出卡）。
- **P2-2 两套关闭语义**：A2-5 定案 + A3-7 验一条，既有采纳/忽略行为不改，可行。
- **P2-3 几何**：A3-6 (a)(b) 已补，口径与第 94 轮一致。
- **P2-4 wont-fix 落盘**：A3-4 第 3 卡覆盖，store 断言含三态。

## 复核通过（本轮亲验）

- HEAD `40b651f`，工作树只多 `docs/iteration/round-97/`；`dist` mtime 02:13（第 96 轮构建，未过期）。
- 重跑 `node scripts/measure-first-screen.mjs --max 315000`：gzip **313,360** / headroom **1,640** / PASS，与计划数一致，与硬线 320,000 不冲突。
- tsc 面：`Annotation` 加必填字段后，直接字面量只有 `annotations.test.ts:470`（`:449/:498/:502` 是 `as Annotation[]`、`:490` 是派生），只补这一处正确。
- 迁移落盘链路成立：`restoreAnnotationsFor`（`App.tsx:2495-2509`）→ `setAnnotations` → 写盘 effect（`:2084-2111`，600 ms 防抖）→ A3-1 等 1,600 ms 够；前提是 quote 能找到。
- 夹具成立：`mockItems`（`ai.ts:271-325`）≥3 句必出 evaluation + revision + evaluation 与一条 overall → A3-6(a) 的 `.rail-overall`、A3-7 的 `.note-revision` 都在。
- 换行风险真实：卡内容宽约 296 px（320 − 22 padding − 2 border），kind + 模拟 + 两 select + index + 3×8 gap 已到 ~300 px；A3-6(b) 量得到，三级 fallback 够。

## 新增 P2

**P2-5（A3-7 必假红）** 场景 4/5 把第 1 卡 `resolved`、第 3 卡 `wont-fix` 带到场景 7。场景 7 只把 revision 卡改 `wont-fix` 再采纳，删掉一张后仍剩 2 张 `is-closed`，「`.note.is-closed` 0」必红。修法：场景 7 开头把另两张改回 `open`（推荐），或改断「2 张且是它们」。

**P2-6（A3-1 理由错）**「accepted 那条带 `replacement`，否则解析丢弃」不成立：`parseAnnotationStore`/`normalizeStoredAnnotation`（`annotations.ts:318-344`）不看 replacement，只有模型输出的 `readLine`（`:144-145`）才要求。真前提是 quote 能在载入后的正文里找到，否则 `restoreAnnotationsFor` 把它转成 unresolved，store 只剩 2 条。修法：A3-1 改写成「三条 quote 都取 note.md 里存在的原句」，并断重开后 store 仍 3 条。

**P2-7（fallback 与断言冲突）** 体积 fallback ①「`.note.is-closed` 虚线」、③「`resolved` 配色删一块」会直接打掉 A3-3 的 `dashed` 与三态异色断言。修法：先削 ④ 内联 / `.note-index`（卡 `aria-label` 已带「第 N 处」）；真动 ①③ 就在 `impl.md` 同步改 A3-3 期望。

## 时间

A1/A2 与第 95 轮同形，可做完；A3 七场只在场景 1、2 各起一次页，3–7 连跑（场景 7 按 P2-5 先清状态），别 reload 两次。
