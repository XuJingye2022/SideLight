# 第 85 轮测试报告（tester 独立验收）

- 结论：**PASS-WITH-UNVERIFIED**（3 任务全过；2 项口径不可按字面复现，见末节）。
- 轮前 `startSha` = `a29a3005fb9e65e5c3a0feb4ba5dd02871580a13`；dev 5175 实测 HTTP 200；CDP 9222–9226 单次探测全无监听，改用 ego 浏览器 CDP `127.0.0.1:54280`，未反复重试。真机脚本/夹具由 tester 自写，数字全部取自本轮自跑（`.tmp/r85-tester-a1.mjs`、`.tmp/r85-tester-www.mjs`）。

## 门禁

| 门 | 命令（日志） | 结果 |
| :--- | :--- | :--- |
| 测试 | `npm test`（`.tmp/r85-tester-npm-test-final.log`） | **50 文件 641 条，641 pass / 0 fail**（逐文件汇总；A1 单任务时点 = 50−1 文件、641−3 条 = 49/638） |
| 构建 + 首屏 | `npm run verify`（`.tmp/r85-tester-verify.log`） | PASS，首屏 gzip **306,144 B** ≤ 310,000（余 3,856 / 硬线余 13,856） |
| 往返 | `npm run roundtrip` | 未跑：未动编辑器与序列化 |
| 回归 | `scripts/keyboard-acceptance.mjs`（ego CDP 54280，`.tmp/r85-tester-keyboard.log`） | **52/52 PASS**，exit 0；被覆盖的 `shots/round-05/` 3 张已 `git checkout --` 还原 |

## A1 B-211 替换零反馈

- 单测 `findBarState.test.ts` **8/8**（含 1 / 3 / 0 / −1）。
- 静态（HEAD 对照）：`replaceNoticeText` HEAD 0（exit 1）→ 工作树 **3 文件**（`App.tsx` 5、`findBarState.test.ts` 5、`findBarState.ts` 1）；`show(replaceNoticeText` HEAD 0 → `App.tsx` **4 处**。
- 真机 **11/11**（自造夹具「苹果/橘子/香蕉/柚子」）：手打 3 处「苹果」→「全部替换」为「橘子」→ toast **`替换了 3 处`**、正文「橘子」3/「苹果」0、计数条 `无结果`；单条「替换」→ **`替换了 1 处`**（香蕉 1 / 橘子 2）；0 命中（查「西瓜」）两替换钮 disabled，只在「替换为」框按 Enter → **`没有可替换的匹配`** 且正文逐字未变。
- `0 pageerror`；console 4 条 404 经响应 URL 定位全为 `/__doc`（脚本自己 route 的宿主文档桩），与本功能无关。

## A2 B-126 宿主 www 停旧

- 真机默认目录：`--check` **exit 0**「98 个文件逐字节相同；多余 0 个」；无参镜像 exit 0「删除 0 个多余文件」。www 实测 **98 文件 3,904,182 B**、入口 `assets/index-DwKBa80S.js`，与当次 dist 逐路径字节相同。
- 夹具 **13/13**（`--dist/--www` 指向 `.tmp`）：缺 1 → exit 1；只多 1 → exit 0 且报「多余 1」；同路径字节差 → exit 1；镜像覆盖过期 `index.html` 并删旧 chunk、随后 `--check` exit 0；`www/index.html` 换成目录制造拷贝失败 → exit 0、报文含「拷贝失败：index.html」「并存」，其余已拷、旧多余**未删**、index.html 未被提前写（证「先拷完再删」「index.html 最后」）；缺 www / 缺 dist/index.html →「跳过」exit 0。
- 回归：`host\bin\www` 改名后实测 `npm run build` **exit 0**（尾行「跳过：…不做镜像」，`.tmp/r85-tester-build-nowww.log`），还原后镜像 + `--check` 均 0。
- 红线：脚本只 import `node:fs`/`node:path`/`node:url`（`scripts/host-www.mjs:14-16`）；`package.json` 只改 scripts；`host/build.ps1`、`release/` 未动。

## A3 B-140 CHANGELOG 标题区间

- `changelog.test.ts` **3/3**。
- 负向（tester 自跑）：标题上界临时改回 74 → **exit 1、1 红 2 绿**，报文 `标题上界 74 与正文最大轮次 84 不一致：标题应写到 84`；还原后 3/3（`.tmp/r85-tester-changelog-{negative,positive}.log`）。
- 静态：`git grep -c '29–74' HEAD -- docs/CHANGELOG.md` = 1 → 工作树 **0**；`29–84` 在 `docs/CHANGELOG.md:5` **1 处**；diff 只动标题行。
- 收尾：按同一门，tester 写第 85 轮小节后标题同步到 `29–85`（否则测试必红），复跑 3/3、`npm test` 仍 50/641 0 fail。故提交后「29–84 = 1」不再成立，验收证据以本节的工作树时点为准。

## UNVERIFIED / 口径偏差

1. A2「改前 `--check` exit 1（缺 66 / 内容差 1 / 多余 66）」的精确三元组不可复现（www 已被镜像）；缺/差判 exit 1 已由自造夹具与一处对照证明，历史三数只来自计划侧测量。
2. 计划的 www「3,904,017 B / `index-CNeHEEPe.js`」是 A1 改动前的 dist 快照（plan-review P2-1）；重建后入口 hash 与字节必变，按实质断言（check 0、多余 0、与 dist 逐字节同）验收。
3. 「`git grep '29–74'` 全库 0」不成立：`docs/iteration/round-84/findings-bug.md:16` 有 1 条历史记录引用旧标题（非本轮引入、不在改动范围，未动）；限定 `docs/CHANGELOG.md` 为 0。
4. 未验：真实宿主 WebView2 内 www 呈现（本机历史 INIT-FAIL）、真 IME、原生打印，均与本批不相关。

## 证据

- `.tmp/r85-tester-{a1,www}.json`；`.tmp/r85-tester-{npm-test-final,verify,keyboard,changelog-negative,changelog-positive,build-nowww}.log`；截图 `shots/round-85/a1-replace-{all,zero}-toast.png`（执行侧提供，本轮未另截）。
