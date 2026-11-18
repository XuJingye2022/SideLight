# 第 62 轮 finder-code（代码与性能）

HEAD `12f36e4`（轮前 startSha 同值，本轮无代码 diff）；只查最近 3 轮（59–61）改动周围。

## 门禁基线
- `npx tsc --noEmit`：exit 0，无输出。
- `npm test`：40 个文件 **508 条全过**（逐文件汇总，与 BRIEF 一致）。

## 环境与协议
- CDP 9225、dev `http://localhost:5175`；每脚本前 `node .tmp/reset.mjs 9225`。
- 假 FSA 工作区（`.tmp/r51-fsa.mjs`）计时；1 MB 文档 1,048,661 B / 368,771 字符 / 11,214 段。
- 载入从空白页（`blank.md` 不含末尾标记）切入、等 `sl-sync-done` 标记增加，避开第 56 轮记录的「末尾标记假阳」。

## F1（P1，重复 B-115，补新基线）1 MB 进/退源码仍有 0.4–1.0 s 级卡顿
- 进源码：按键到 `textarea.source-editor` 值满 = **432 / 1,039 ms**（两次），其后 longtask **781 ms**，最长帧间隔 **1,000 ms**；第一次 432 ms、long 274 ms。
- 退源码：按键到编辑器重新出内容 = **520 / 475 ms**，longtask **429 / 381 ms**，帧间隔 **500 / 433 ms**（不含之后 setContent 重排）。
- 与 B-115 记录的「进 p50 9.9 s / 退 2.1 s」差一个数量级：**记录值与本轮协议不同源，门槛前必须按本节重测**（common.md「性能门槛先测基线再定」）。
- 第二次进源码比第一次慢 2.4×（432 → 1,039 ms，long 274 → 781 ms）。两条取值路径在 `src/App.tsx:4372-4381`：首次走 `rawTextRef`（原文直用），之后走 `currentMarkdown()` 全篇序列化。**机制未证实（UNVERIFIED）**，需加标记区分两条路径。
- 证据：`.tmp/e2e-r62-finder-115-long.mjs`、`.tmp/r62-finder-115-long.json`、`.tmp/r62-finder-115.json`。

## F2（P1，重复 B-120，HEAD 复现）停笔一次仍写两份全文
- 100 KB 文档（36,027 字符）停笔窗口内：`.sidelight/drafts/kb100.md` 写 **36,028 字符 @t=6285** → 905 ms 后自动保存写 `kb100.md` **36,029 字符 @t=7190**；另有 2 次 `getFile`。合计落盘 **72,057 字符 ≈ 文件 2 倍**，1 MB 档 ≈ 2 MB 写。
- 草稿 800 ms（`src/App.tsx:3460`）与自动保存 2,000 ms（`:3614-3621`）两套定时器互不取消，自动保存成功后再删草稿：**这笔草稿写在成功后必然作废**。
- 手动 `Ctrl+S` 路径干净：一次 `write`、无整篇读回（`:3065-3069` 的 `reusableDiskText` 快照生效），不属本条。
- 证据：`.tmp/r62-finder-code.json` 的 `cases.kb100.autoOps`。

## F3（P2，非回归）1 MB 载入/滚动/逐键/保存现状
- 载入到 `sl-sync-done`：**491 / 632 ms**，期间一条 **442 ms** longtask（首屏前阻塞）。
- 滚到文末：**0 条 longtask**（`scrollLong: []`）。逐键 20 键：p50 **83 ms** / p95 **95 ms**（第 56 轮基线 147/154，本机更快）。
- `Ctrl+S`：**48 ms**，一次 `write` 368,791 字符，`close` 后只有一次 `getFile`（取 mtime/size，不读全文）；磁盘 368,791 字符。
- 100 KB：载入 172 ms、逐键 p50 47 / p95 69 ms、进/退源码 90 / 96 ms、保存 12 ms。
- 结论：59–61 轮改动（全局搜索、列表态、TOC 重建）**未带来新的载入/滚动/逐键/保存回退**；442 ms 首屏 longtask 记 P2，未达 P1。

## 未能测
- 真宿主（WebView2 `INIT-FAIL`）与真实 IME；B-121 相对图 404 需真宿主渲染，本轮未验。
