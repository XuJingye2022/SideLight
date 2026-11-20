# 第 130 轮 tester 独立验收（B-261 对话清空按文档身份）

判定：**PASS**。未读 `impl.md`；只读 `plan.md`、`git diff`、`BACKLOG.md`，全部从零复验，真机用自写脚本 `.tmp/r130-tester-chat-reset.mjs`。

## 1 静态门与负向

- 新静态门：`node --experimental-strip-types src/lib/railChatReset.test.ts` → **5/5 pass、exit 0**（`.tmp/r130-tester-restored2.log`）。5 条各自钉住接线，非空转。
- 负向（备份 `.tmp/r130-tester-marginrail.bak`，把 `MarginRail.tsx:201` 的 `}, [docKey])` 改成 `}, [docName])`）→ **pass 3 / fail 2、exit 1**，恰为 T3「对话清空 effect 依赖 `[docKey]`」与 T4「面板 effect 仍依赖 `[docName]`」（计数 T3=0、T4=2），T1/T2/T5 仍绿；按 SHA256 `D1A9D2FB6E1C0CDC…` 拷回后 **5/5 exit 0**（`.tmp/r130-tester-negative.log`）。
- 源码事实：`App.tsx:501` `docInstance` state、`:2656` 换篇点 `+1`（紧跟 `activeDocIdRef.current += 1`）、`:6106` `docKey={docInstance}`；`MarginRail.tsx:65` Props `docKey: number`、`:149` 解构、`:201` `}, [docKey])`；`:367` 面板 effect 仍 `}, [docName])`（B-249 不回归）。
- 工作树（A2 写文档后复量，`docs/` 不在口径内）：`git status --porcelain -- src package.json` 恰 **4 条**（3 M + 1 `??`）、`git diff --name-only -- src package.json` 恰 **3 文件**（`package.json` / `src/App.tsx` / `src/components/MarginRail.tsx`）。

## 2 门禁

- `npm run verify -- --max 316300` → **exit 0 PASS**：门 gzip **316,056 B**（raw 1,025,373、files 3、headroom 244），≤ 验收线 316,183；常驻 `MarginRail-DUOL7uLQ.js` raw 22,282 / gzip9（node `zlib` level 9）**7,880**；B-229 口径合计 **323,936**（超硬线 3,936，仍 `open`，归 B-229）。（`.tmp/r130-tester-verify.log`）
- `npm test` → **67 文件 938 条 0 fail**（逐文件 `tests`/`pass` 求和 938、`fail` 全 0，`.tmp/r130-tester-npm-test.log`）。
- `roundtrip` 不跑：未动编辑器与 markdown 序列化。

## 3 真机 before/after（ego CDP 57270、1440×900、清 storage、无 Key mock、自造假 FSA 记 ops）

模块身份门两阶段相符：after `/src/MarginRail.tsx` 133,174 B + `/src/App.tsx` 785,265 B（`docKey`/`setDocInstance` 均 true）；before 132,566 / 784,011（均 false）。

- **after 4/4、0 pageerror**（`.tmp/r130-tester-e2e-after.json`）：S1 对话 2 条后 `Ctrl+Alt+N` → turn **2→0**、`.rail-chat-empty` 1、`__slState.name==='未命名.md'`、无 `.dialog`；S2 `a/note.md`→`b/note.md`（两处 `name` 均 `note.md`）→ turn **2→0**、空态 1、正文「乙篇正文。」；S3 2 条对话时正文打 1 字 + `Ctrl+S` → `dirty` 回 false、turn 仍 **2**、`write:b/note.md` **1** 次。
- **before**（`git stash push -- src/App.tsx src/components/MarginRail.tsx`，跑完 `git stash pop`）**S1/S2 FAIL、S3 PASS、E0 PASS**，脚本 `asExpected=true`、exit 0（`.tmp/r130-tester-e2e-before.json`）：S1/S2 切换后 turn 仍 2、空态 0、正文已换（正是缺陷）。复原复核：`git stash list` 空、两文件 SHA256 与改后逐字同（`MarginRail` `D1A9D2FB…`）、模块门回 true、5/5 复绿，改后 after 再跑 **4/4**（`.tmp/r130-tester-after-run2.log`）。
- 截图：`shots/round-130/chat-reset-tester.png`（b/note.md 空对话态，栏宽 320）；交付截图 `shots/round-130/chat-reset.png` 目视为同一态。

## 4 回归

- `.tmp/r116-tester-speaker.mjs` → **10/10、0 pageerror**、RED 空（`.tmp/r130-tester-r116.log`）。
- 交付脚本 `.tmp/e2e-r116-speaker.mjs --phase after` → 8 条署名断言 + S2 全 OK、RED 空（`.tmp/r130-tester-r116-delivered.log`）；跑后 `git checkout -- shots/round-116/` 还原。

## 5 文档

- `BACKLOG.md:138` B-261 在 P2 段末（`## Deferred` 之前）标 `fixed`，证据 = r123 JSON + r130 三份 JSON + `MarginRail.tsx:191-194`、轮次 `123/130`；`BACKLOG.md:74` B-229 追加第 130 轮复测行（门 316,056 + chunk 7,880 = 323,936）。
- `impl.md` 含 316,033 口径与「真实首载 = 门 + chunk 仍超 320,000，归 B-229」（第 33–35 行）。

## 6 偏差与残余（不判 FAIL）

- 任务书写「回归 r116-tester-speaker 8/8」，该 tester 版脚本实为 **10** 条（多 AX 树与删 span 反事实），全绿；交付脚本 8 条亦全过。
- plan §5 已知：宿主 `applyHostPayload` 换篇不 bump（真宿主未验）；干净时再点当前文件会重载并清空对话（记录）；`:367` 面板 effect 仍按 `docName`，异目录同名 + 面板正开着时上一份在审行不即时清（打开时按路径重读，`railModalGate.test.ts:92-98` 钉着）。
- FAIL 项：无。

## UNVERIFIED

真 WebView2 宿主、真 FSA、真实中文 IME；真宿主换篇对话清空（只静态核 `applyHostPayload` 不 bump）。
