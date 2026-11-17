# finder-code（第 56 轮，round=56）

端口 9225，HEAD `882eb49`（工作树干净，本轮 diff 为空，只查最近 3 轮改动周围）。
基线：`npx tsc --noEmit` = 0 错误；`npm test` 退出码 0，37 个文件 462 条，0 失败（把各文件 `ℹ tests` 求和，`.tmp/r56-finder-npmtest.log`）。
读数文件：`.tmp/r56-finder-perf.json`、`.tmp/r56-finder-autosave.json`；脚本 `.tmp/e2e-r56-finder-perf.mjs`、`.tmp/e2e-r56-finder-autosave.mjs`。

## F1（P1）每次按键都用全文序列化做脏判定，逐键主线程开销随文档线性涨

`src/App.tsx:973-981` 的 `onUpdate` 在每个带 `addToHistory` 的事务里同步执行
`contentRef.current().replace(/\r\n/g, '\n') !== baselineRef.current`，
而 `contentRef` 就是 `src/App.tsx:3112` 的 `serializeBodyNow()`（`src/App.tsx:3101-3110` 的
`serializeDocument(editor, …)`）——整篇重序列化 + 一次全文 replace + 一次全文比较，**每个按键一次**。
同函数 `src/App.tsx:989-1001` 已把 markdown/正则/draft 这类全文派生物延后 300 ms，注释写明
「避免每个键都做全文正则」，但 977-981 的脏判定没走这条路。

实测（末段末尾连打 20 个拉丁字符，CDP 9225，keydown 捕获后 setTimeout(0)/rAF 各记一次）：

| 文档 | 字符/段 | keydown 处理 p50 / p95 | 下一帧 p50 / p95 | 20 键墙钟 |
| :--- | :--- | :--- | :--- | :--- |
| 98,014 字 / 2,801 段 | 100 KB 档 | **60 / 66 ms** | 22 / 32 ms | 639 ms |
| 980,014 字 / 28,001 段 | 1 MB 档 | **230 / 252 ms** | 102 / 121 ms | 2,493 ms |

1 MB 档比第 53 轮 B-116 记的 p50 126 / p95 149 更高，但测法不同（B-116 未留脚本），
所以两条都按本轮实测报，不与 B-116 直接比。100 KB 是常见章节长度，60 ms/键已能感到迟滞。

建议：脏判定挪到 300 ms 派生路径里做（那里本来就要序列化一次），或先用
`transaction.docChanged` + `doc.nodeSize`/长度做廉价前置筛，只在长度相等时才全文比较。
验收口径：100 KB 逐键处理 p95 ≤ 20 ms、1 MB ≤ 60 ms（同一脚本复测）。

## F2（P2）一次停笔写两份全文 + 两次 getFile；草稿在保存必然成功时也写

`.tmp/r56-finder-autosave.json`：100 KB 文档只停笔 1 个字符，2 s 防抖后依次写
`.sidelight/drafts/big.md` 98,014 B、`big.md` 98,015 B，前后共 2 次 `getFile`；
连打 5 个字符也只有 1 轮（98,019 / 98,020 B），防抖本身正常，不是每键写盘。
1 MB 档同一次停笔写 2,940,106 B（3 次 write），期间 88–114 ms long task 4 条。
草稿写在 `src/App.tsx:1017-1043`（800 ms），文件写在随后的保存链；两条都不看
「本次保存是否必然成功」。建议：有可写句柄时只在保存失败/无句柄时写草稿；
读回改比 mtime/size，别整篇取回。验收：100 KB 停笔写盘 ≤ 1 份全文。

## 已测无问题（不作为 finding）

- 1 MB 载入：parse 1,486 ms / dispatch 259 / serialize 51 / sync 31 ≈ **1.83 s**（`.mark` 取同名最后一条），
  与第 52 轮 2.9 s 基线同档，第 55 轮 `inlineSyntax` 默认关没拖慢解析。1 MB 的 `loadMs` 读数（40 ms）
  不可信：复用了同一路径 `big.md`，等待条件在旧内容里已成立，以 marks 为准。
- 100 KB 载入 183 ms（parse 55 ms）、滚动到底 812 ms 且 0 long task、源码进 154 / 退 149 ms（`textarea.source-editor` 出现/退出生效）。
- 无改动再按 `Ctrl+S`：`__fsLog` 0 条、toast「没有改动，未写入。」——第 51 轮修复仍成立。
- 手动保存：100 KB 33 ms（写 98,034 B）、1 MB 141 ms（写 980,034 B），磁盘尾部含追加文本。

## UNVERIFIED

- 自动保存的两次 `getFile` 是否真读整篇（`File.text()` 次数没单独计；只数到 `getFile`）。
- 1 MB 档 keydown 样本 n=40：脚本第二次 `installObservers` 装了重复监听，值成对重复，p50 有效、次数翻倍。
- `inlineSyntax` 打开时的逐键/载入开销：本轮只测默认关。
