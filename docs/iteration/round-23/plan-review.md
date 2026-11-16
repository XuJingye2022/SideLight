# 第 23 轮 · 计划审查（critic，快速）

审查对象：`docs/iteration/round-23/plan.md`（v0.30.4）。
审查范围：T1–T5 与预算；只报 blocker。未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

四条 blocker：

| 编号 | 级别 | 问题 | 证据 | 最小修法 |
| :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:13` 要求「打开文件（文件夹与单个文件）载入后读 `.sidelight/drafts`」，但 `readCacheText(dir,...)` 需要父目录句柄；`openSingleFile` 走 `showOpenFilePicker`，没有目录，`parentDirectory` 返回 null，读不到 `.sidelight`。计划把单文件与文件夹并列，单文件路径必失败/只弹 localStorage 草稿。 | `plan.md:10-13`；`cache.ts:87-113`（`ensureCacheDir`/`findCacheDir` 需 parent）；`workspace.ts` 的 `pickFile`/`openSingleFile` | 只对有目录句柄的文档读 `.sidelight`；`openSingleFile` 走 localStorage 草稿或明确的「单文件无目录草稿」提示；`pendingDraft` 的 `source` 加 `'none'` 来源，避免读失败后状态栏仍显示「草稿」。 |
| H2 | blocker | T3 `:53` 的缓存事务是「复制到 trash → 删原文件 → 删原缓存」，并说任一步失败回滚「保留原文件与原缓存」。若第 ④ 步只删掉了 `drafts`、`annotations` 中一份，另一份删除失败时，已删的原缓存无法从 trash 恢复（trash 只有副本，原键已空），回滚不完整；同样，`restoreFromTrash` 当前只恢复 `.md`/`.current.md`，缓存搬回失败会留下半恢复。 | `plan.md:47-55`；`findings-fix.md:57-81`（F2 缓存先搬后删的失败）；`trash.ts`/`App.tsx` 的 `removeFile` | 缓存改成「先复制+校验 → 删文件 → 再用可回滚的 rename/move 删原缓存」；或先 `move` 原缓存到 trash（可逆），失败逐项搬回；第 ④ 步失败必须能从 trash 把已删的那份搬回；`restoreFromTrash` 对 `.draft`/`.json` 失败也保留 trash 副本并提示。 |
| H3 | blocker | T5 `:93` 要求「序列化前删除 doc 末尾空段落」，但 `serializeDocument(editor: MarkdownSource)` 只拿到 `getMarkdown()` 字符串，**没有 doc 节点**，无法区分「末尾空段落」与「正文中的空段落」；`trailingNewlines` 改成 CRLF 后，`output.replace(/\n+$/,'')` 仍按 LF 处理，CRLF 的 `\r` 可能残留/错位。 | `plan.md:91-94`；`serializeDocument.ts:35-50`（只有 `getMarkdown`/`trailingNewlines`） | 在 `getMarkdown()` 字符串层面识别并删除**尾部**空段落/`&nbsp;`（只处理 `\n{2,}$` 之后的空段），不声称操作 doc；`trailingNewlines` 与 `output.replace` 用同一 `(\r\n|\n)` 计数并保留 CRLF；补「CRLF 0–5 × 3 次」单测。 |
| H4 | blocker | 预算从 285,000 放宽到 **286,000**（+1,097），但 T1 160–230、T2 40–80、T3 180–250、T4 120–180、T5 60–100 合计约 560–840 行，且 `App.tsx`/`trash.ts`/`cache.ts`/`workspace.ts` 都进首屏；砍序 `7(T5)→5(T4)→6(T4)` 只砍 T4/T5，若 T1–T3 已超 286,000 无法回退。 | `plan.md:4,113-114,125-128`；STATE 的 284,903/97 B | 先单独量 T1/T2/T3 的 build-a 字节；若 T1–T3 已超 286,000，必须砍 T3 的 `.current.md`/SHA 或 T1 的 256 KiB 守卫并写「延后」，不能只砍 T4/T5；`286,000` 例外只在 T1–T3 实测后写入 STATE。 |

## 逐项备注

- T1 的 `pendingDraft` 单文档 `docToken` 去重、`persistDocKey` 三路门方向对；单文件无目录是 H1。
- T2 的 `pickFile` 在 `getFile()` 后看 `size`、5.88 MB 拒绝方向对；`File.size` 字节口径与 5.5 MiB 文案一致。
- T3 的 `arrayBuffer` + SHA-256、BOM 字节保留、GBK 当前正文 UTF-8 提示方向对；缓存事务/撤销是 H2。
- T4 的 `\$` 跳过与 `\\$` 还原、脚注 `CONT` 4 空格/tab 方向对；`risk` 的 `math-escape`/`footnote-loss` 要避免把用户主动删当损失。
- T5 的 CRLF 0–5 矩阵方向对；`serializeDocument` 无 doc 节点是 H3。
- 文件归属 A T1–T3 / B T4–T5 零重叠；每任务 build-a+measure 可复现。

未改产品文件、未 commit。
