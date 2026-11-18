# 第 85 轮执行报告（A，3 任务）

起点 `a29a300`；未 commit / 未 push / 未改 `release/`；版本 0.32.1。浏览器走 ego CDP 54280（9222–9226 无监听，只试 1 次）；日志/脚本 `.tmp/r85-*`。

## A1 B-211 替换零反馈 → DONE
- `findBarState.ts` 新 `replaceNoticeText`（>0「替换了 N 处」，否则「没有可替换的匹配」）；测试 +1（1/3/0/−1）。
- `App.tsx`：`replaceCurrent` 0 命中 `show(0)` 后 return、成功 `show(1)`；`replaceEvery` 两条成功出口 `show(matches.length)`（0 命中不加）；两处 deps 补 `show`。`FindBar.tsx` 未动。
- 单测 **8/8**；静态 3 文件、`show(replaceNoticeText` **4** 处。
- 真机 **8/8**（`.tmp/e2e-r85-a1-replace-notice.mjs`、`.tmp/r85-a1-replace.json`，0 错误）：「全部替换」→「替换了 3 处」+ 乙词 3/甲词 0 +「无结果」；「替换」→「替换了 1 处」；0 命中「替换为」Enter →「没有可替换的匹配」且两钮 disabled。截图 `shots/round-85/a1-replace-{all,zero}-toast.png`。

## A2 B-126 宿主 www 停旧 → DONE（数字按当轮重建）
- 新 `scripts/host-www.mjs`（零依赖）：无参镜像 = 先拷 dist 全部（index.html 最后），全成功才删多余；失败停在并存、警告 exit 0；`--check` 只比 dist 侧路径+字节（`Buffer.equals`），缺/差定 exit code、多余只打印；任一边缺「跳过」exit 0。
- `package.json` build 链尾 `&& node scripts/host-www.mjs`。
- 改前 `--check`：**exit 1**「缺 66 / 内容差 1 / 多余 66」，入口 dist `index-CNeHEEPe.js` / www `index-BxH_Xt2Z.js`。
- 改后：`verify` 过、gzip **306,144 B**；`--check` **exit 0**、多余 **0**、www 与 dist 逐字节同：**98 文件 / 3,904,182 B / 入口 `assets/index-DwKBa80S.js`**。
- 自检 `.tmp/r85-www-selfcheck.mjs` **5/5**（缺/多/字节差/镜像/写失败并存）；回归 www 改名 → `--check`、`npm run build` 都「跳过」exit 0，还原后镜像再 check 0。日志 `.tmp/r85-www-*.log`、`.tmp/r85-final-check.log`。
- 备注（plan-review P2-1）：验收的 98/3,904,017/`index-CNeHEEPe.js` 是 A1 前 dist 快照；A1 重建后入口 hash 与字节必变（实测如上）。实质断言（check 0、多余 0、与当次 dist 逐路径同字节）全成立。`README.md:232` 留 scribe。

## A3 B-140 CHANGELOG 区间过期 → DONE
- `docs/CHANGELOG.md:5` 改「第 29–84 轮」（只动这一行）；新 `src/lib/changelog.test.ts` 3 条（标题格式 / 上界 = 正文最大轮次 / 下界 ≤ 最早轮次；无 Unreleased 节算过），挂 `npm test` 链尾。
- 3/3；负向把上界临时改回 74 → **exit 1、1 红**，报文含 74 与 84，改回 3/3。
- 静态当前 docs/src：「29–84」1 命中、「29–74」0；全库另 1 命中在历史 `round-84/findings-bug.md:16`（不改）。BACKLOG B-140 补 fixed 注记（避开两字面量）。

## 总门禁
`tsc` 0；`npm test` A1 后 49/638、A3 后 **50 文件 641 条** 0 fail；`verify` 过、gzip **306,144 B**；`host-www --check` exit 0。未跑 roundtrip（未动编辑器/序列化）。

## CHANGELOG 建议一行
「替换不再静默（A1，B-211）；`host-www.mjs` 让 `npm run build` 同步宿主 www（A2，B-126）；CHANGELOG 标题区间机械门（A3，B-140）。」

## 新踩坑
1. 沙箱禁止 Node 子进程默认管道 stdio（EPERM：`spawnSync` status=null、stdout 空）；自检改 `openSync(log,'w')` 交 fd 再读文件。
2. `Rename-Item -NewName` 只收名字不收路径；传 `host\bin\www.r85-bak` 报「表示路径或设备名称」。
3. www 字节/入口名必须在 A1 重建 dist 之后量（plan-review P2-1）。

## 交付面
executor 不 commit。改动：`src/App.tsx`、`src/lib/findBarState{,test}.ts`、`src/lib/changelog.test.ts`（新）、`scripts/host-www.mjs`（新）、`package.json`、`docs/CHANGELOG.md`、`docs/iteration/BACKLOG.md`、`shots/round-85/`。
