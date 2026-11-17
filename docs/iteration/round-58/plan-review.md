# 第 58 轮 plan-review rev2（critic，只读）

输入 `docs/iteration/round-58/plan.md`（revision 1）。本轮只核上一版 H1–H4 是否修掉，并给剩余风险。未改产品代码、未跑 E2E、未跑门禁。结论 **PASS（PASS-WITH-NOTES）**。

## 上一版 P1 复核（全部已修）

| 洞 | 状态 | 证据 |
| :--- | :--- | :--- |
| H1 两个新测试文件不跑 | 已修 | A2 文件表末有 `package.json`（plan.md:14），B1 同（:28）；A2 验收写「37 → 39 个文件（`test` 脚本补两条）」（:22），B1 写「37 → 39 个文件」（:30）。实测 `package.json:15` 的 `test` 脚本按 `&&` 切正好 37 条，37+2=39 口径成立。 |
| H2 原文 `\[TOC\]` 被反向还原 | 已修 | 步骤 1 写「原文 `\[TOC\]` 计数 > 0 整条不还原（第 49 轮实体口径）」「小写 `includes('[toc]')` 快路径」（:16）；单测（:21）与验收（:22）各有「原文 `\[TOC\]` 打开→保存字节不变」。 |
| H3 B1 纯函数签名/符号名对不上 | 已修 | :29 已拆 `searchWorkspace(docs: { path, text }[], query, limits)` 纯函数 + `collectDocs(files)` async 循环 `readNode` 并逐个 catch；点结果 `openWorkspaceFile(node)` + `setQuery` + `setFindOpen(true)`。已核：`readNode` async 且无句柄/超 5.5 MiB 抛错（workspace.ts:292-302）、`flattenFiles:356`、`openWorkspaceFile:2479`、`setQuery` 声明 App.tsx:434（:5277 是传给 `FindBar` 的 prop 位）、`useDialogFocus` 用法 :1143、`jumpTo(item: OutlineItem)` :4377-4383。 |
| H4 验收第一步不可执行 | 已修 | B1 :30 改成按 `.tmp/e2e-r58-finder.mjs:31-150` 的 drop + 递归 `mkDir(tree)` 合成句柄（两层子目录、3 个 md、文字内嵌）；B2 :35 同步复用并删掉 `.tmp/r58-ws` 那句。已核 finder 脚本 31-150 行确有 `installVfs`/`mkDir`/`drop` 与 `getAsFileSystemHandle` 复原。 |

H5/H6（P2）也一并落地：`applyRepairs(markdown, original)` 抽到 `serializeDocument.ts`，两处调用点已核实同链（serializeDocument.ts:54-56 与 App.tsx:1001-1009，草稿链的 `original` 就是 `rawTextRef.current`）；超时砍法已定序（:23）。

## 剩余风险（P2，不阻塞）

**R1（P2，A2 验收）字节保真断言会空转。** 第 51 轮起无改动 `Ctrl+S` 不写盘（App.tsx:3214-3216 提示「没有改动，未写入。」），所以「打开含 `\[TOC\]` 的文档 → 保存 → 逐字节不变」若一次都不打字，`writes` 为空，断言恒绿却什么也没验。
修：打开后在**非标记行**改一个字（如把某行「甲」改为「乙」），保存后断言写出文本等于「原文只做这一处替换」的期望串，且 `\[TOC\]` 那一行原样。不要用「打字再删掉」——脏标记按基线比对会回到干净，又不写盘。

**R2（P2，A2 渲染）转义文档仍会显示目录。** marked 把 `\[TOC\]` 与 `[TOC]` 都解析成文字 `[TOC]`，`isTocParagraph` 分不出两者，于是作者特意转义的那一行也会挂上 `.sl-toc`——字节保真但显示上出现「字面标记 + 目录」。
修：二选一并写进 impl——① 在 impl 里记为已知限制；② 渲染入口也拿 `original`：原文未转义 `[TOC]` 计数为 0 时不挂 widget。

**R3（P2，A2 widget）装饰器键与逐事务成本。** `key` 只写「随文档变」，同文档两个 `[TOC]` 会撞键；AGENTS 第 8 节要求键带上会变的那一维（`toc-${pos}-${hash}`）。另外若每次事务都全篇 `descendants` 扫一遍，1 MB 文档逐键会多一遍 O(n)。
修：widget key 用 `toc@${pos}-${hash}`；扫描只在 `doc.eq` 变化时做，或按 `[toc]` 小写快路径先短路。

## 备注

- plan.md:35 残留一句修订说明「删 `.tmp/r58-ws` 一句」，不影响执行，planner 顺手删掉即可。
- A1 的门禁只要 `verify`+`test`，可接受（只改输入判定，不动序列化）；其验收断言只查引号，不看 `\[乙\]` 转义，与计划 :11 的豁免一致，不算漏洞。
