# finder-code（第 58 轮，round=58）

端口 9225；HEAD `25146504`，工作树干净（本轮 diff 只有 docs，src 最新改动是第 57 轮 `b0ea777`）。
基线：`npx tsc --noEmit` 退出码 0，0 错误；`npm test` 退出码 0，0 失败（37 个 `*.test.ts`）。
读数：`.tmp/r58-finder-perf.json`（脚本 `.tmp/e2e-r56-finder-perf.mjs` 原样复用，与第 56 轮同口径）、
`.tmp/r58-finder-autosave.log`（脚本 `.tmp/e2e-r56-finder-autosave.mjs`）。

## 同脚本对照：没有性能回归

| 项 | 100 KB（98,014 字 / 2,801 段） | 1 MB（980,014 字 / 28,001 段） |
| :--- | :--- | :--- |
| 载入 | 192 ms（marks 86 ms） | marks `sl-load-start`→`sl-sync-done` 1,857 ms；长任务 1,930 ms |
| 逐键 p50 / p95 | 49 / 69 ms（第 56 轮 60 / 66） | 144 / 151 ms（第 56 轮 230 / 252） |
| 手动保存 | 42 ms，写 98,034 B | 188 ms，写 980,034 B |
| 源码进 / 退 | 159 / 153 ms | 未测（B-115） |
| 滚动到底 | 0 long task | 0 long task |

无改动 `Ctrl+S`：`__fsLog` 0 条、toast「没有改动，未写入。」——B-006 仍成立。
1 MB 载入仍有单条 1,930 ms 长任务（第 52 轮后已知，无新回归）。

## F1（P2）自动保存一次停笔写两份全文，草稿在保存必然成功时也写

`.tmp/r58-finder-autosave.log`（100 KB 文档，末段只打 1 个字符）：t=4691 写
`.sidelight/drafts/big.md` **98,014 B**；t=5589 再写 `big.md` **98,015 B**；前后 2 次 `getFile`（整篇读回）。
连打 5 字符同样只有 1 轮（98,019 / 98,020 B），防抖正常，不是每键写盘。
按 1 MB 等比例缩放即每次停笔写 ≈2 MB、读 ≈2 MB；第 56 轮同脚本记同现象（`docs/iteration/round-56/findings-code.md` F2），
但池里没有条目。落点：草稿计时 800 ms `src/App.tsx:1022-1051`（`:1050` 是延时）、localStorage 兜底 `:1013`、
`writeDraftFallback` `src/App.tsx:3469-3485`、正文写入 `:3534`；自动保存 2 s 防抖 `:3561-3568`。
`finishSaved` 随后删掉刚写的草稿（探针末 `draftKeys: []`），所以这 98 KB 是白写：保存必然成功时仍先写一份全文。
改法：有可写句柄时只在保存失败/无句柄时写草稿；读回改比 mtime/size。
验收：100 KB 停笔写盘 ≤ 1 份全文、`getFile` ≤ 1 次。

## F2（P2）宿主单文件文档：相对图先按裸相对路径请求一次，再换 `/__asset`

`src/lib/assetImage.ts:56` 的 `waitResolve = isRelativeAsset(src) && getAssetDocPath() !== ''`；
宿主模式 `src/App.tsx:4549-4551` 恒把 docPath 设成 `''`，于是为 `false`，
第 62 行先 `paint(src)` 写裸 `assets/x.png`（宿主 origin 下 404），随后 t=65-67 才换成 `/__asset?path=…`。
工作区模式第 39 轮已用同一判据避免这次请求，宿主分支（第 57 轮新加）漏了。
影响：每张相对图多 1 次 404 请求（宿主全局 `Cache-Control: no-store`，`host/Program.cs:1504`），无数据风险。
改法：判据改成「相对图且（有 docPath 或 resolver 为宿主）」，即宿主模式同样先不写 src。
UNVERIFIED：真宿主未渲染（本机 `host/bin/host.log` INIT-FAIL），只在代码与端点层可证；浏览器按 404 计数未测。

## UNVERIFIED

- 1 MB `loadMs` 读数（2,143 ms）含点击前的旧文档等待，以 marks 为准（判据同第 56 轮）。
- 宿主模式行为全部未在真 WebView2 里跑过（本机 INIT-FAIL）。
- `npm test` 总条数未逐文件求和，只确认退出码 0、0 失败。
