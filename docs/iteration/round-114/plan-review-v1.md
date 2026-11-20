# 第 114 轮计划审查（critic，v1）

结论：**REVISE**（2 条 P1、4 条 P2；不改方向，改读路径写法、体积口径与验收断言）。轮前 `531b650` 已核，工作树只多 `docs/iteration/round-114/`。

## 已核
- 写侧 `App.tsx:3395-3407` → `revisions.ts:236`；`Revision`（`:19-27`）无正文；两 helper 私有（`:203`/`:219`）；读侧 src 0 命中。
- `revisions.test.ts` 实跑 28/28、`fakeDir.reads` 在；test 链含它（62 文件），28→35、884→891 对。
- 回归脚本 `check(` = 43/57/33；r101 `:217`/`:461`/`:529`、r105 `:190`/`:191` 全对，D4 避让成立。实测门 **315,218**（余 4,782）；`MarginRail-Ba9-fGtt.js` gzip9 **6,916**。

## 漏洞

**CR-1（P1）读路径可能建目录。** `revisions.ts:197-200` 的 `revisionsDir` 带 `{create:true}`；A1 只导出两个名字 helper，却只写「列目录，失败回 `[]`」，没约束 create。复用或照抄它，打开「在审」就在工作区建 `.sidelight` 与 `revisions` 两个空目录——只读入口变写入口；七例与 A2 只数 `getFile`，测不出。
修法：照 `cache.ts:104-114` 不带 create 开目录，throw → `[]`；A1 加「`.sidelight` 不存在 → `[]` 且未建目录」（35→36、`npm test` ≥892）；A2 断言打开后 0 create/write/remove。

**CR-2（P1）常驻 chunk 与 B-229 冲突，基线过期。** D3 让 `revisionList` 静态进 `MarginRail` chunk，而 B-229 超线正是这个 chunk。计划写 6,884 / 合计 322,097；实测 gzip9 **6,916**、合计 **322,134**，已超 320,000 **2,134 B**。计划自估 +1,016，修正后余量只有 984 B，自估已超 7,900 上限；「距硬线 ≥4,100」只对门口径成立。
修法：二选一。①`openReview` 里 `await import()`（照 `export.ts` 先例），chunk 保持 6,916；②lead 明批静态进 chunk，改基线、重算上限，「距硬线」必须带 chunk 报。A2 同时报门 / chunk / 合计。

**CR-3（P2）savedAt 来源未定。** 文件名与 JSON 各有时刻；JSON 缺字段回落 0（`revisions.ts:87`）。E2E 复制首份 JSON 改名补 7 份时两者可不同 → 排序/显示全同或 1970，降序与时间格式断言必红或假绿。
修法：savedAt 取文件名 base36 时刻（清理同源），JSON 只作坏档回落；E2E 两种都写；显示本地时区 + `padStart(2,'0')`。

**CR-4（P2）验收口径不闭合。** ①「打开前 `getFile` 0」没限定目录，开文档时批注/草稿读盘也走它，必假红；②只数读不数写，CR-1 测不出；③异步读没写用 `reviewRunRef` 挡过期 `snapData`（关面板/换文档）；④D4 说复用 `.rail-diff-row`，验收查 `.rail-snap-row`，没写两类同挂，任选一种红一条。
修法：计数只认 `.sidelight/revisions/`（开前 0 读 0 写、开后 >0 读 0 写）；补「读取中关闭/换文档 → 无过期行」；行定 `li.rail-snap-row.rail-diff-row`，标题/空态用 `.rail-snap-title`/`.rail-snap-empty`。

**CR-5（P2）「回不到某一版」降级成一句说明，没批准人。** 理由成立（快照不存正文，回滚要每次停笔多存全文），但这是用户看得见的能力，按 AGENTS 第 1 节要产品负责人点头；计划只写 README+面板各一行。
修法：lead 开工前确认「只做清单、不做回滚」；BACKLOG 加 P2（如 B-248，另轮评估），README 与面板文案引同一条；B-247 单独记 fixed。

**CR-6（P2）位置未写明。** `:901` 是 portal 里 `</ul>` 之后——新段实际落在「在审文件」对话框内（D4 避让理由只在同一 sheet 成立），入口仍叫「在审」，用户不会为看快照点它。
修法：明写位置与路径，入口文案改「在审 / 快照」；若改放批注页签，用新 `.rail-snap-rows`（不复用 `.rail-diff-rows`），D4 约束解除。

## 体积判定
门 315,218 / 上限 315,900 放行。真实首载现在 322,134，B-229 仍 open；按 CR-2 后不得再报「距硬线 ≥4,100」。A2 时间偏紧（新 E2E + 3 回归 + build/test），回归先跑 r101。
