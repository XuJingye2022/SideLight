# 第 99 轮实现（executor）· B-226 修订快照与批注迁移

## A1 `src/lib/revisions.ts`（新）— DONE
`REVISIONS_DIR='revisions'`、`MAX_REVISIONS=8`、`<id>.json`。`revisionDigest` 对 `key+'\0'+LF 正文` 算 FNV-1a → 8 位十六进制（键进哈希防撞，plan-review P2-2 采用）。`buildRevision` 只存 7 字段、不存正文；`bytes` 按 `bytesText`（缺省 = text）的 UTF-8 字节。`parseRevision` 坏 JSON/`v!==1`/缺 id → null，批注走 `parseAnnotationStore` 归一。`migrationOf` 公共前后缀夹出单点编辑，`'\n'`、>512、`newSize−oldSize!==delta`、`positions[p]` 不等任一命中回 null。`migrateAnnotations` 平移后丢「起点落在被删区间」与 `from<1`/`to<=from`/`to>docSize`，`move===null` 回 `[]`。`pruneRevisions` 同键 savedAt 降序（同值按 name）、`keep` 必留。`writeRevision` 建目录、同 id 直接返回、写完 `entries()` 读回 `{key,savedAt}` 清理、错误全吞回 null。

`revisions.test.ts` **24 条**（假 FSA 带 `entries()`）；`package.json` test 链尾已接。门：`node --experimental-strip-types src/lib/revisions.test.ts` → tests 24 / pass 24 / fail 0。

## A2 `src/App.tsx` — DONE
新 `docNotesRef`（渲染期同步）+ `recordRevision(key,text,bytesText)`（先同步拍 `annotationsRef`/`docNotesRef`，再 `cacheDirFor()` → `writeRevision`）。`performCommit` 在 `finishSaved` 成功分支 `if (ok) recordRevision(cacheKey(target.name), normalized, withEol)`（digest 用 LF、bytes 用写盘文本）；身份变/写失败/正文没变早退不写。`applySource` 在 `setMarkdown` 前后拍 `buildTextIndex`/`content.size`，`move=migrationOf(...)`；引文命中照旧，失配且 move 非空走 `migrateAnnotations`。`annotations.ts` 与 `onTransaction` mapping 未动。偏差：首存（`saveIntoWorkspace`）与另存为不记快照。

## A3 门禁 / E2E — DONE
`.tmp/e2e-r99-a.mjs`（ego CDP 57270、1440×900、假 FSA、`autoSave:false`）**35/35 PASS**、0 pageerror（`.tmp/r99-impl-a.json`）：
- S1：Ctrl+S 前 `a.md` 0 write；1.6 s 后 `revisions/` 恰 1 个 json（v 1、key a、bytes 145 = 磁盘字节、quote 同卡片、7 字段无正文）；无改动再存仍 1 个 +「没有改动，未写入。」
- S2：引文前插 1 字 → `.note` 1 张、from/to 各 +1、`.annot` 仍盖该段；**引文中间插 1 字（引文失配）→ from 不变、to +1**（critic P1-1 要的迁移证据，S2d）；同长替换 → 失配但 from/to 不变；删整段（含 `'\n'`）→ 仍丢。
- S3：连存 10 次 → 同 key json = 8。
- 回归 `.tmp/r98-tester-agent.mjs` **38/38**、`.tmp/e2e-r97-a1-status.mjs` **44/44**。

`npm test` **59 文件 834 条 0 fail**（`.tmp/r99-impl-npm-test.log`）；`roundtrip` rich 7/9 + source 9/9；`npm run build` exit 0（入口 `assets/index-DZODd5RI.js`）；`measure-first-screen --max 315500` gzip **314,726 B**（基线 313,888 → 净 **+838**；距硬线 320,000 余 5,274）exit 0。
静态门：`migrationOf|pruneRevisions` HEAD **0 行**（exit 1）→ **21 行 / 3 文件**；含 `digest` 全门 HEAD **2** 行（`trash.ts:77`）→ 30 行。
`git diff --stat` 只有 `package.json` + `src/App.tsx`，不含 `src/styles.css`。截图 `shots/round-99/annotations-migrated.png`（`.annot` 盖住引文 + 插入字，卡片 1 张）。

CHANGELOG 建议一行：`- 保存后留最近 8 份修订快照；退出源码的整篇替换按单点编辑迁移批注（B-226）`（本轮不写 README/CHANGELOG）。

## 新材料里的坑
1. 计划静态门含 `digest` 时 HEAD 已 2 命中（`trash.ts`），按字面「改前 0」会误判「改动没落地」；先 `git grep HEAD -- src` 量基线再定口径。
2. `migrateAnnotations` 的「起点被删」必须按**平移前** from 判：平移后 `from>=changeStart` 的集合变成「编辑点之后」，照计划字面抄会误删正确条目。
3. 「引文前插 1 字」走老 `findRange` 命中路径，证明不了迁移接线；要证得在引文**中间**插字，并读注解 store 的 from/to（DOM 猜不出）。
