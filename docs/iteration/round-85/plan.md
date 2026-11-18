# 第 85 轮计划（单轮 A，3 任务）· revision 1

按 `plan-review.md` 修 H1/H2/H3；任务、顺序与范围不变（只清 3 条 P2）。环境：起 `a29a300`；dev 5175；CDP 9222–9226 无监听（连不上就单测/构建/静态，各试 1 次记 UNVERIFIED）。日志 `.tmp/r85-*`；不 push、不改 `release/`。预检：`npm test` 49 文件 637 条 0 fail；`CHANGELOG.md:5` 标题 29–74 而同节最高 84；dist 与 www 分叉。用户点名 3 条回归已收口（第 83 轮 A1 复核）。

## A1 B-211 替换零反馈（串行 1）

病根：`replaceCurrent`（`App.tsx:2138-2145`）与 `replaceEvery`（`:2147-2231`，出口 `:2206-2208`/`:2229-2230`）只 dispatch+focus，无 `show()`；`show` 在 `:475`。`FindBar.tsx:80` 把 0 命中画成「无结果」，「替换为」Enter（`:121-127`）却照调 `onReplace`。
文件：`src/lib/findBarState{,test}.ts`、`src/App.tsx`；`FindBar.tsx` 不动。
① `findBarState.ts` 加 `replaceNoticeText(replaced)`：`>0` → `替换了 ${replaced} 处`，否则 `没有可替换的匹配`。② `replaceCurrent`：`previewMode` 早退不动；`if (!editor) return` 与 0 命中 `show(replaceNoticeText(0))` 后 return 分写；替换成功后 `show(replaceNoticeText(1))`。③ `replaceEvery` **不加** 0 命中 `show`（H3：0 命中时唯一调用点 `:5807` 的钮 disabled、Enter 只走 `onReplace`；guard 保留）；两条成功出口各 `show(replaceNoticeText(matches.length))`；两处依赖数组补 `show`。④ 测试 +1 条（1 / 3 / 0 / −1）。
验收：① `node --experimental-strip-types src/lib/findBarState.test.ts` 8/8 ② `npm test` **49 文件 638 条** 0 fail ③ `git grep -c replaceNoticeText -- src` 0→**3 文件**、`git grep -c "show(replaceNoticeText" -- src/App.tsx` 0→**4** ④ 浏览器 1 次（CDP 或 ego；连不上记 UNVERIFIED）：3 处「全部替换」→`.toast-text`=`替换了 3 处`；「替换」→`替换了 1 处`；0 命中只在「替换为」按 Enter →`没有可替换的匹配`（不写成「全部替换 0 命中」）。

## A2 B-126 宿主 www 停旧（串行 2）

病根：`host/build.ps1:27` 删、`:71` 拷，只有跑它才同步；`npm run build`（`package.json:12`）只写 dist → 分叉。实测两边各 98 文件：路径重合 32（31 内容同，`index.html` 同长 1,582 B 却不同）；dist 缺 66 个新 chunk，www 多 66 个旧 chunk 2,768,873 B（每次换 hash 再叠 ~2.8 MB，并集比对永远 exit 1）。
文件：新 `scripts/host-www.mjs`（`node:fs`/`node:path` 零依赖）、`package.json` build 链尾 `&& node scripts/host-www.mjs`。build.ps1 不动；`README.md:232` 交 scribe。
用法：`[--check] [--dist <dir>] [--www <dir>]`；缺省 `dist` / `host\bin\www`（按脚本位置解析仓库根），后两只换目标（H2）。
① 无参 = 镜像（H1）：a) 任一边缺（www 不存在 / dist 无 `index.html`）→「跳过」exit 0；b) 先覆盖拷贝 dist 全部文件，`index.html` **最后**；c) 全部拷成功后才删 www 里 dist 没有的路径（先收集再删）；d) 任一步失败停在「新旧并存」（不删不回滚），警告 + exit 0 + 提示「宿主可能正在运行，关掉后重跑 `npm run build`」。禁止先删后拷。
② `--check` 只比 dist 侧：逐路径比**内容字节**（`Buffer.equals`，不是只比长度），缺/差各 1 条；不一致打印前 5 条 + 两边入口 chunk 名 + **多余 N**（只打印，不进 exit code）；dist 侧无差异 exit 0（多余不清零也算过），有差异 exit 1；任一边缺「跳过」exit 0（Linux CI 无 `host/bin`）。
③ 自检（H2）：`.tmp/r85-www-selfcheck.mjs` 用 `.tmp/r85-www-{dist,www}` 跑四例：缺文件 exit 1 / 多文件 exit 0 且「多余 1」/ 字节差 exit 1 / 镜像（造多余文件与过期 index.html → 无参跑完多余没了、index.html 同 dist、再 `--check` exit 0）。
验收：① 改前 `--check` → **exit 1**（含两入口名、缺 66 / 差 1 / 多余 66）② `npm run verify` 过、首屏 gzip ≤310,000 B（第 84 轮 306,003 B）③ `--check` → **exit 0**、多余 **0**、www 98 文件 3,904,017 B、入口 `index-CNeHEEPe.js` ④ 自检四例全过（`.tmp/r85-www-selfcheck.log`）⑤ 回归：www 改名后 `--check` exit 0 +「跳过」、缺失时 `npm run build` 仍 exit 0 ⑥ `npm test` 仍 638 条。门禁 verify/test。风险：拷贝失败只警告；dist 与 host/bin 都 gitignore。

## A3 B-140 CHANGELOG 区间过期（串行 3）

病根：标题 29–74，同节已到 84（`:7`）；第 69 轮改过又漂 → 加机械门。
文件：`docs/CHANGELOG.md:5`、新 `src/lib/changelog.test.ts`、`package.json` test 链尾、`docs/iteration/BACKLOG.md` B-140 行。
① 标题改 `## Unreleased（第 29–84 轮，未发版）`（en dash）。② 新测试 `node:fs` 读 `docs/CHANGELOG.md`（照 `mathStyle.test.ts:17`）：`## Unreleased` 到下一个 `## ` 之间只找 `^\*\*第 (\d+) 轮`，断言标题形如 `## Unreleased（第 A–B 轮，未发版）` 且 `B` = 最大 N、`A ≤ 最小 N`（失败信息带两数）；无该节（发版后）→ 跳过 + `assert.ok(true)`，注释写「发版时换 0.x 条目、删本测试」。③ 追加到 test 链尾。④ BACKLOG B-140 补 `**第 85 轮 fixed**`（测试路径 + 负向输出）。
验收：① `node --experimental-strip-types src/lib/changelog.test.ts` 3/3 ② 负向：标题临时改回 29–74 → **fail**（含 74/84）→ 改回 3/3 ③ `npm test` **50 文件 ≥641 条** 0 fail ④ `git grep`「29–84」1 命中、「29–74」0（改前 1）⑤ 只动标题行与 BACKLOG。

**合计**：`npm test` 49→**50 文件**、637→**≥641 条** 0 fail；`npm run verify` 过、首屏 ≤310,000 B；不动编辑器/序列化，不跑 roundtrip。收口 `git status --short` 只多 `App.tsx`、`findBarState{,test}.ts`、`changelog.test.ts`、`scripts/host-www.mjs`、`package.json`、`docs/CHANGELOG.md`、`BACKLOG.md`、`round-85/`。交 scribe：README:232 删 B-126 条并重编号；写第 85 轮小节时同步标题 29–85（否则 A3 新测试红）；BACKLOG 三条状态与证据。
