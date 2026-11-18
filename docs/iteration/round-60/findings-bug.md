# 第 60 轮 缺陷侦察报告（finder-bug）

环境：HEAD `5384410f`（= 轮前 startSha），dev `5175`，CDP 9222，1280×800，每步前 `reset.mjs 9222`。只读，未改产品代码。
脚本：`.tmp/e2e-r60-finder{,-b,-c,-d,-e}.mjs`；读数 `.tmp/r60-finder-{a,b,c,d,e}.json`。

## F1 P1 全局搜索点中「当前文档」的命中：整篇重新读盘重解析，1 MB 文档冻结 3.4 s（B-127）

- 位置：`src/App.tsx:2520-2533`（`openGlobalSearchHit` 无条件 `openWorkspaceFile(node)` → `readNode` + `requestLoad`；没有「命中的就是当前文档」的短路）。
- 复现：假工作区里放 1 MB 文档 `big.md` → 打开它 → `Ctrl+Shift+F` 搜「锚点词」→ 点第 1 条命中。
- 证据（`.tmp/r60-finder-d.json`）：点击 → 查找条可用 **890 ms**，→ 文档稳定 **3,407 ms**；点击后 `big.md` 的 `getFile` 再被调用 **3 次**（该窗口 reads 7 → 10），编辑器内容整体替换（`innerText` 长度 123,696 → 123,691，回到载入时的值）。
- 期望：命中在当前文档时只回填查找条并把光标移到命中行；实际是整篇重载，1 MB 文档点击一次冻结约 3.4 s，光标、滚动位置与撤销历史回到「刚打开」状态（同轮小文档复现：`.tmp/r60-finder-a.json` 的 `searchCurrentDirty.after` 同样是整篇重载后 `dirty:false`，另多出 2 次写盘，与既存 B-120 同源）。
- 建议：`openGlobalSearchHit` 里先比 `node.path === activeFile?.path`；命中同一篇时只 `setQuery(term)` + `setFindOpen(true)`，不调 `requestLoad`。

## F2 P1 全局搜索 0 命中时漏报「跳过 N 个文件」，给出错误结论（B-128）

- 位置：`src/components/GlobalSearch.tsx:37-42`（0 命中分支提前 `return`，跳过数拼装在 `:45-46` 之后，永远走不到）。
- 复现：工作区三项——`a.md` 正常；`broken.md` 的 `getFile` 抛 `NotAllowedError`；`huge.md` 超过 1 MiB 且全文只有「独特词」。搜「独特词」。
- 证据（`.tmp/r60-finder-e.json`）：`note` = 「没有匹配的文本」、`empty` = 「没有结果。」、hits = 0；**同一状态**搜「普通文本」= 「1 处；跳过 2 个读不到或超过 1 MiB 的文件」。即「跳过」提示只在有命中时出现。
- 期望：0 命中时也应说明有多少文件没搜（「没有匹配；另有 2 个文件未搜：读不到或超过 1 MiB」），否则用户会把「文件太大没搜」读成「全文没有这个词」。
- 建议：把 `collected.skipped` / `collected.capped` 的拼装移到 0 命中分支之前，复用到无命中文案。

## 顺带核过、无问题的路径（正向证据）

- 脏文档换文档：文件树点另一篇 → 确认框「这篇还有没保存的改动 / 取消 / 不保存 / 保存并切换」（`.tmp/r60-finder-c.json` `viaTree.dialogState`）；经全局搜索切换时因自动保存已落盘而 `dirty:false`，无确认框属正常，不是丢改动。
- 撤销不跨文档：b.md 里连按 3 次 `Ctrl+Z`，标题与正文都不变（`.tmp/r60-finder-b.json` `crossDocUndo.landed` 与 `afterUndo` 相同）。
- 已知不重复计数：自动保存一次停笔写两份全文（`a.md(20)`、`a.md(21)`；`.tmp/r60-finder-c.json` `beforeClick.writes`）＝ B-120，已 open；`[TOC]` 段落后仍显示字面 `[TOC]` ＝ 第 58 轮交付截图 `shots/round-58/toc-editor.png` 的既定形态，未计。`[TOC]` 重命名标题后目录项同步（`tocRetitle.tocItems` = 乙 / 小节二）。
- 200 处上限提示正常：1 MB 文档搜「锚点词」→ 「200 处；只显示前 200 处」。

## 未测（UNVERIFIED）

- 真宿主单文件文档下的全局搜索（宿主 WebView2 本机 `INIT-FAIL`，只测浏览器）。
- 关掉自动保存后「脏文档 + 全局搜索切换」是否弹确认框（未找到开关）。
- `[TOC]` 在引用块/列表内的渲染（被切换确认框挡住，未取证）。
