# 第 99 轮计划（单轮 A）· revision 1

> revision 1（2026-11-20）：按 `plan-review.md` 修 CR-1~CR-6；落点 CR-1→A3-S1、CR-2→A1-4、CR-3→A1-3、CR-4→A1-1/A2-2、CR-5→A3、CR-6→A1-2；范围不变。

做：**修订快照与批注迁移**（队列第 6 条，B-226）。

## 现状
批注只有单份（`annotations.ts:520,535`，`git grep revisions -- src` exit 1）；`shiftAnnotations`（`:568`）未接产品；退出源码的整篇替换按引文重定位、命中不到就丢（`App.tsx:4778-4784`）。

## 体积（硬线 320,000）
基线 gzip **313,888 B**、余 **6,112 B**（复量；BRIEF 的 312,423 是第 93 轮）。净增估 **+1,000–1,200 B** → ≈314,900–315,100。门禁 `--max 315500`；超线砍 A3-S3（留单测）。

## 任务

### A1 数据层：`src/lib/revisions.ts` + 单测
files: `src/lib/revisions.ts`(新)、`src/lib/revisions.test.ts`(新)、`package.json`(test 链尾)

1. `REVISIONS_DIR='revisions'`、`MAX_REVISIONS=8`，`<id>.json`；`revisionDigest(key,text)` 对 canonical（LF）文本算 FNV-1a → 8 位十六进制 id；**bytes 另算** `TextEncoder.encode(bytesText).length`（缺省 = text；CR-4：不能拿 `key+'\0'+text` 的编码长度当 bytes）。
2. `buildRevision(key,text,annotations,notes,savedAt,bytesText=text)` → `{v:1,id,key,savedAt,bytes,annotations,notes}`；`serializeRevision`/`parseRevision`（坏 JSON、`v!==1`、缺 id → null；批注归一用 `parseAnnotationStore(JSON.stringify({v:2,annotations,notes}))`）。**不存正文**（1 MB 双写）：「diff 对比」按批注级比较（quote/replacement/priority/reviewStatus），要正文 diff 再升 v2 存 `body`≤64 KiB 并加迁移（CR-6）。
3. `migrationOf(oldIndex,newIndex,oldSize,newSize)` → `{changeStart,delta}|null`：p/s 是公共前缀/后缀（`s≤min(len)−p`）；旧 `[p,oldLen−s)` 与新 `[p,newLen−s)` 任一含 `'\n'` 或 >512 → null；`changeStart=oldIndex.positions[p]`（缺 → null）；`delta=newLen−oldLen`；**CR-3 门**：还需 `newSize−oldSize===delta` 且 `newIndex.positions[p]===oldIndex.positions[p]`，否则 null。
4. `migrateAnnotations(list,move,docSize)`：`shiftAnnotations` 后丢（CR-2）①`delta<0 && from>=changeStart && from<changeStart−delta` ②`from<1` ③`to<=from` ④`to>docSize`；`move===null` 回 `[]`。`pruneRevisions(entries,key,max,keep?)` 只算同 key，savedAt 降序（同值按 name），`keep` 必留，返删名。
5. `writeRevision(parent,key,text,annotations,notes,bytesText=text)`：`.sidelight`→`revisions`(create)；同 id 已存在直接返回；写完用 `dir.entries()`（同 `trash.ts:372`）读 `{key,savedAt}` 按 4 删旧；错误全吞返 null。
6. 测试（假 FSA 抄 `cache.test.ts:88-161`，补 `entries()`）：往返、id、bytes（LF/CRLF）、坏文件、prune 9→8、`migrationOf` 八例（插删、跨块、两端同、断开超 512、`positions[p]` 缺、位置差 +2/delta=0、size 差≠delta）、`migrateAnnotations` 六例（起点被删 10..16/删 10..14、删 1..6 盖 3..9、`to<=from`、`to>docSize`、`null`→`[]`、正常平移）、`writeRevision` 幂等/第 9 份删最旧/他 key 不动。

验收：`node --experimental-strip-types src/lib/revisions.test.ts` fail 0（≥16 条）；`npm test` **59 文件 810+N 条 0 fail**；静态门（新文件加 `--untracked`）`git grep -n --untracked 'migrationOf\|pruneRevisions\|digest' -- src` 0 → ≥3。

### A2 接线：`src/App.tsx`
files: `src/App.tsx`（`annotations.ts` 不改）

1. `docNotesRef`（`:465` 旁，照 `annotationsRef` 渲染期同步）；`recordRevision(key,text,bytesText)`：先同步取 `annotationsRef`/`docNotesRef` 快照，再 `cacheDirFor()` → `writeRevision`。
2. `performCommit:3463`：`const ok = finishSaved(...)`；`if (ok) void recordRevision(cacheKey(target.name), normalized, withEol)`——**digest 用 normalized（LF）、bytes 用 withEol（CR-4）**；身份变/写失败/正文没变早退（`:3400`）不写。
3. `applySource:4775`：`setMarkdown` 前拍 `oldIndex`/`oldSize`（`doc.content.size`），同步 dispatch（`:1277-1281`）后取 `newIndex`/`newSize`、`move=migrationOf(...)`、`docSize=newSize`；命中照旧，未命中且 `move` 非空 → `migrateAnnotations([item],move,docSize)[0]`，否则丢。
4. **不动** `onTransaction` 的 `transaction.mapping`。

验收：`npm run build`、`measure-first-screen --max 315500` 都 exit 0；E2E 见 A3。

### A3 门禁 + E2E + 收口
files: `.tmp/e2e-r99-a.mjs`、`.tmp/r99-*.json`、`round-99/impl.md`、`BACKLOG.md`

E2E（ego CDP 57270、1440×900，假 FSA/假流抄 `.tmp/r98-tester-agent.mjs`；**载入前写 `localStorage['sidelight.settings.v1']='{"autoSave":false,"settingsVersion":2}'`**）：
- S1 快照（CR-1）：打开 `a.md` → 分析 1 条 → 打 1 字（打开不算脏）→ 2 s 内 `Ctrl+S`（保存先取消自动保存）→ 1.6 s 后 `revisions/` 恰 1 个 json：`v==1`、`key=='a'`、`bytes==a.md` 磁盘字节、`quote` 同卡片；Ctrl+S 前 0 write。再存无改动 → 仍 1 个 + 「没有改动，未写入。」。
- S2 迁移：源码框在引文**前**插 1 字（delta=+1）→ 退出：`.note` 1 张、`from/to` 各 +1、`.annot` 仍盖该段；同长替换（delta=0）→ 引文失配但 `from/to` 不变；负向删整段（含 `'\n'`）→ 仍丢（CR-5）。
- S3 保留：连存 10 次（每次改 1 字）→ 该 key json = 8。
- 回归 `.tmp/r98-tester-agent.mjs` 38/38、`.tmp/e2e-r97-a1-status.mjs` 44/44；截图 `shots/round-99/annotations-migrated.png`。
- `npm test` 59 文件 0 fail；`git diff --stat` 不含 `src/styles.css`；BACKLOG P2 加 `B-226 | fixed | 批注 | 修订快照与批注迁移 | …证据… | 99`；impl.md ≤4 KB；不写 README/CHANGELOG；不 push、不动 `release/`。

## 风险
1. 文本偏移 ≠ 文档位置：守卫（含 `'\n'`、>512、`positions[p]` 缺、size 差≠delta 或前缀位置不同）任一命中即 null 走旧路径，再由 `from<1`/`to<=from`/`to>docSize` 兜底；S2 三向 + 回归覆盖。
2. 每次保存多 ≤9 次小 json 读写（fire-and-forget，异常全吞）。
