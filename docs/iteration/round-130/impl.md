# 第 130 轮执行报告（executor · A1 / A2）

轮前 `79dba64`（startSha），工作树只有未跟踪 `docs/iteration/round-130/`；dev 5175 未重启；CDP 9222–9226 不可用，真机走 ego 57270。

## A1 对话按文档身份清空（B-261）— DONE

改动（3 个源文件 + `package.json`）：

- `src/App.tsx:496-501` 新增 `docInstance` state；`:2654-2656` 在 `loadIntoEditor` 的 `activeDocIdRef.current += 1` 后 `setDocInstance((value) => value + 1)`（deps 不加）；`:6106` 传 `docKey={docInstance}`。
- `src/components/MarginRail.tsx:60-65` Props `docKey: number`、`:149` 解构、`:198-201` 对话清空 effect 改依赖 `[docKey]`；`:367` 的对比/在审面板 effect 仍 `[docName]`（`railModalGate.test.ts:92-98` 钉着）。
- 新 `src/lib/railChatReset.test.ts` 5 条静态门（先摘块注释、再按行剥 `//`），挂 `package.json` test 链尾。

门禁：`npx tsc --noEmit` exit 0；`npm test` **67 文件 938 条 0 fail**；新门 **5/5**。

负向（`MarginRail.tsx:201` 的 `[docKey]` 改回 `[docName]`）：**恰 2 红**（T3 实际 0、T4 实际 2），T1/T2/T5 仍绿（3 pass / 2 fail，exit 1），逐字节还原后 5/5。证据 `.tmp/r130-negative.log`、`.tmp/r130-restored.log`。

`git status --porcelain -- src package.json` = **4 条（3 M + 1 ??）**；`git diff --numstat` 只 3 文件（package.json 1/1、App.tsx 9/0、MarginRail.tsx 10/3），A2 写文档前量。

## A2 真机 before/after + 文档 — DONE

- 新 `.tmp/e2e-r130-chat-reset.mjs --phase after|before`（ego 57270、1440×900、清 storage 后 reload、无 Key 走 mock、假 FSA 记 `__vfs.ops`）。
- 模块门 `.tmp/r130-module-gate.json`：after `railDocKey:true` + `appSetDocInstance:true`，before 双 `false`，两阶段 `ok:true`（App 与 MarginRail 都查，防旧 App 模块误判）。
- after `.tmp/r130-e2e-after.json` **4/4 PASS**：
  - S1 新建文档（未命名 → 未命名）后 turn 2 → **0**、`.rail-chat-empty` 1、`__slState.name='未命名.md'`、无 `.dialog`；
  - S2 异目录同名（`a/note.md` → `b/note.md`，两处 name 均 `note.md`）后 turn 2 → **0**、空态 1、正文「乙篇正文。」；
  - S3 承接 b/note.md：2 条对话时正文打 1 字 + `Ctrl+S` → dirty 回 false、turn 仍 **2**、`write:b/note.md` 恰 1 次；
  - 0 pageerror / console error。
- before（`git stash push -- src/App.tsx src/components/MarginRail.tsx`）`.tmp/r130-e2e-before.json`：S1/S2 **FAIL**（turn 仍 2）、S3/E0 PASS，asExpected=true；`git stash pop` 复原，`MarginRail.tsx` 与备份逐字节相等。
- 截图 `shots/round-130/chat-reset.png`（切到 b/note.md 后对话空态 + 树里两篇同名 note.md）。

## 体积与门禁

- HEAD（129 轮）口径：门 **316,033**（raw 1,025,343）+ `MarginRail-*.js` gzip9 **7,869** = **323,902**（超硬线 3,902，B-229 open）。任务书的「312,423 / 余 7,577」是第 93 轮旧值。
- 本轮 `npm run verify -- --max 316300` **exit 0 PASS**：门 gzip **316,056**（raw 1,025,373；净 **+23 B**，≤ 本轮预算 316,183、距硬线余 3,944）；`MarginRail-DUOL7uLQ.js` raw 22,282 / gzip9 **7,880**（+11）；合计 **323,936**（对 129 轮 +34，超硬线 **3,936**，仍归 B-229）。未触发 §3.4 降型。
- 口径：按 316,033 门口径量；真实首载 = 门 + 常驻 chunk = 323,936 仍超 320,000，归 B-229，口径 lead 定。
- 回归 `.tmp/r116-tester-speaker.mjs`：**10/10 OK**、RED []（计划写 8/8，该脚本现有 10 条 T1–T10）。`roundtrip` 未跑（未动编辑器/序列化）。

## CHANGELOG 一行建议

修复：新建文档或切到另一个目录的同名文档时，右侧对话记录不再残留上一篇的内容。

## 新踩坑

- 对话清空的判据只能用文档实例计数：`docName` 是 basename（新建恒 `未命名.md`、异目录同名相同），`activeDocIdRef` 也不行（保存也 +1）。
- 负向只需改一处：把 `[docKey]` 改回 `[docName]` 恰好 2 红（T3=0、T4=2），能同时证明另一处 `[docName]` effect 被 T4 钉住。
