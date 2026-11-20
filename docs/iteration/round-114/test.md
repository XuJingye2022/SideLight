# 第 114 轮独立验收：修订快照读接口 + 只读清单（B-247）

轮前 `531b650`。tester 未读 `impl.md`，按 `plan.md`/`plan-acceptance.md`、`git diff`、`BACKLOG.md` 复验。

**判定：PASS-WITH-UNVERIFIED**（0 FAIL；1 条体积预算偏差见 §3，不判 FAIL；真 FSA/网络盘/WebView2 未跑）。

## 0 范围与门禁

- `git diff --stat` 6 文件 +224/−5（`App.tsx`、`MarginRail.tsx`、`styles.css`、`revisions.ts`、`revisions.test.ts`、`README.md`）+ 新 `revisionList.ts` 3,416 B；无 `package.json`、无新依赖、无 `release/`。
- `npm run verify -- --max 315900` **PASS / exit 0**；首屏 gzip **315,464 B**（raw 1,023,553）。
- `npm test` **62 文件 892 条 0 fail**（`.tmp/r114-tester-npm-test.log`）；`roundtrip` 未跑（未动编辑器/序列化）。

## 1 A1 读接口 + 单测

- `^test(` HEAD **28** → **36**，新增 8 条逐名核对（计划 a–h 全在、删 0 条）；`node --experimental-strip-types src/lib/revisions.test.ts` → **36/36 0 fail**。
- 静态（贴改前）：`listRevisions` HEAD **0 行 exit 1** → **11 行**；新文件 `getDirectoryHandle\([^)]*create` **0**、`revisionsDir(` **0**（均 exit 1），正向对照 `getDirectoryHandle` **2 行**（`:44`/`:45` 无 create；未跟踪文件用 `git grep --no-index`）。
- 自写独立探针 `.tmp/r114-tester-snap.mjs`（自带假 FSA）**9/9**：无 `.sidelight` 与无 revisions 都 `[]` 且 creates 0；文件名时刻优先于 JSON 的 0 与非零值；他键/坏名/旧格式不入列且只读 1 份；10 份 → 8 行降序只读 8；坏档跳过不补位；`max=3` 生效。
- 写侧既有 4 条仍绿：同正文两次 1 份、第 9 份留 8、写快照不读旧正文、旧格式不读不删。

## 2 A2 十四例（自写 `.tmp/r114-tester-e2e.mjs`）

ego CDP 57270、1440×900（另测 1024×700）、自造假 FSA（`ops` 记 `read:`/`dir:`/`miss:`/`create:`/`write:`/`remove:`）→ **27/27 断言、0 pageerror / 0 console error**；截图 `shots/round-114/revision-snapshots.png`。

1. 无 `.sidelight`：`.sidelight/` 下内容读/成功开目录/create/write/remove **全 0**（只有探不存在目录的失败查找），root 无 `.sidelight`；空态句 + 标题「修订快照」。
2. `Ctrl+S` 一次 → `R` 恰 **1** 份。3. 补 7 份（+60 s、8 位 hex id、名与 JSON `savedAt` 同值）+ 坏名 1 + 他键 1，含 1 份 JSON `savedAt:0`。
4. 面板：行 **8**、`read:.sidelight/revisions/` **8**（坏名/他键 0 读）、该目录 `dir:` 1、`.sidelight/` 下写 **0**；`ul.rail-snap-rows > li` 且同挂 `rail-snap-row rail-diff-row`。
5. 8 行时刻严格降序，逐行 label = Node 自算的 `MM-DD HH:MM:SS · N B · 批注 N 条（open M）`。
6. 首行匹配 `/^\d\d-\d\d \d\d:\d\d:\d\d$/`；7. `savedAt:0` 行显文件名时刻（非 1970）；8. total/open 逐行一致。
9. `.rail-snap-note` 逐字等于 `README.md` 同句。10. 无工作区：只出「先点「打开文件夹」…」，`.rail-snap` **0**。
11. 读取中关面板（`getFile` 延迟 250 ms，读已开始）：关后 overlay/`.rail-snap`/行 **全 0**；延迟归零重开 → 8 行照常。
12. 面板开着换文档（`inert` 挡真人点击，程序派发 tree click 走同一 docName 路径）→ 切 b.md、面板收、`.rail-snap` **0**、旧行 **0**。
13. 两档视口：sheet `scrollWidth-clientWidth` **0/0**、rect 在视口内。14. 0 pageerror；在审列表仍 **1 行**（a.md）与开前/收尾同值、无跨区、b.md 空态照常。

## 3 体积三数（并报偏差）

- 门 **exit 0**、gzip **315,464 B**（距本轮门 436、距硬线 320,000 余 4,536）；同工具链重建 HEAD（临时 worktree）315,211 → 本轮净 **+253**。
- 常驻 `MarginRail-*.js` raw 20,820 / gzip9 **7,337**；基线 6,916（同法重建 HEAD 得 19,597 / 6,916，与计划基线一致）→ **超上限 6,980 共 357 B**。
- 新惰性 `revisionList-*.js` raw 1,062 / gzip9 **616**（按口径不计首屏/合计）。
- 合计（门+常驻 chunk）**322,801**，超硬线 **2,801 B**（HEAD 同日 322,127，本轮 +674）；**B-229 仍 open**，只报数。

**偏差（不判 FAIL）**：计划 §1 只给 `App.tsx`≈+100 / CSS≈+200 留量，漏算 `MarginRail.tsx` 本体（≈+421 gzip9），6,980 这条线不可达；硬门与首屏硬线都没破，功能/文案都是计划逐条要求，未发现可无损省下的 357 B。建议下一轮按实测重定常驻 chunk 预算。

## 4 回归与卫生

- `e2e-r100-diff` **43/43**、`e2e-r101-review` **57/57**、`r105-tester-e2e` **33/33**，0 错误；之后 `git checkout -- shots/round-100 shots/round-101 shots/round-105`，`git status` 无这三目录。
- 计划要求 B-247/B-248 先入池，实施后 `BACKLOG.md` 无这两行 → 本轮由 tester 补入（B-247 `fixed`、B-248 `deferred`）。

## 5 UNVERIFIED

真 FSA / 网络盘 / OneDrive 占位文件 / WebView2 宿主内的快照清单（本轮全走假 FSA；CDP 9222–9226 无监听，真机走 ego 57270）；`getFile` 失败与权限拒绝只有单测。真实中文 IME、原生打印未跑。
