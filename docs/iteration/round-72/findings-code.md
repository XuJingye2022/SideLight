# 第 72 轮 finder-code：代码与性能

范围：本轮 diff（HEAD `4cccb03`，仅文档）与最近 3 轮代码改动（第 69 轮 B-149、第 70 轮 B-152；第 71 轮无代码）。CDP 9225，dev server `localhost:5175`。

## 门禁基线

- `npx tsc --noEmit` exit 0（`.tmp/r72-fc-tsc.log`）。
- `npm test`：40 个测试文件 **524 通过 / 0 失败**（`.tmp/r72-fc-test.log`）。
- E2E：`.tmp/e2e-r72-fc-perf.mjs` → `.tmp/r72-fc-perf.json`；`.tmp/e2e-r72-fc-delta.mjs` → `.tmp/r72-fc-delta.json`；两轮 0 控制台错误 / 0 pageerror。

## 实测（100 KB 与 1 MB，多节点夹具）

| 项 | 1 MB（1,000,012 字符） | 100 KB（100,010 字符） |
| :--- | :--- | :--- |
| 打开到可编辑 | 2,563 ms（long task 1,303 / 291 ms） | 1,917 ms（含上一场景退源码的 4,091 ms 长任务） |
| 编辑态逐键 10 字 | 1,674 ms，每键 70–130 ms 长任务 | 721 ms，0 条 long task |
| `Ctrl+S` 到「已保存」 | 185 ms，`sl-parse-done` +0 | — |
| 进源码 | 1,069 ms（long task 83 / 890 / 67 ms） | — |
| 源码态 7 字 | 1,769 ms，103–255 ms/键（= B-139 已记 P2） | — |
| 改字后退出源码 | 源码框收起 4,495 ms，`sl-parse-done` +1，结尾新字在正文末尾，遮罩路径正常（= B-144，4.4 s 级与第 67 轮 4,470 一致） | — |
| 滚动两跳（100 KB） | — | 每跳 ~296 ms 含 250 ms 等待，**0 条 long task**，`scrollTop` 到 60,000 |

写盘次数（`window.__fsState.files` 的 set/delete 计数）：1 MB 停笔 3.6 s 窗口 **1 次** `big.md` 写 1,000,023 B + 草稿 **0 写**；100 KB 停笔 **1 次** `small.md` 写 100,020 B + 草稿 **0 写**。B-120/B-148 的「一次停笔一份全文」仍成立。改字退出源码同样只 1 次写（`big.md` 1,000,031），草稿 0 写。

## 第 70 轮路径：删活动文件 + 下一候选读不出

夹具 `[a.md, big6.md(6 MiB，超 5.5 MiB), c.md, small.md]`，在 `a.md` 里删除它：

- 确认框点击 → 「已移到回收站：a.md」**112 ms**；树里 `big6.md` 被跳过，活动文档切到 `c.md`（标题 `c.md — Sidelight`、正文「丙 第三篇」、`.is-active` 正确）。
- 写盘只有 trash 两条 + `delete:a.md`、`delete:.sidelight/drafts/a.md`、`delete:.sidelight/annotations/a.json`，无多余全文写。
- 删除后再按 `Ctrl+S`：提示「没有改动，未写入。」，`a.md` **未被写回**（文件列表里没有 `a.md`）。B-152 修复在未读候选路径上成立，0 错误。

## 第 69 轮路径：源码态组合输入 + `Esc` 退出

100 KB 文档源码框 `Input.imeSetComposition('zhong')`（值 100,010 → 100,015）后按 `Esc`：

- `Esc` → 源码框收起 **169 ms**（`settleSourceComposition` 先 blur 等 `compositionend`），无提示拦退。
- 收尾值进了正文与盘（`small.md` 100,015，首 5 字符 `zhong`，行首第 1 段 `zhong# 小文档…`），提示「已保存 small.md」。这是第 69 轮已记录的 H4 行为：CDP 合成组合在 blur 时提交的是原始串，真输入法会提交候选字（真 IME / WebView2 仍未验）。
- `Ctrl+S` 组合中拦截（`src/App.tsx:3353-3354`）本轮未复测，读代码确认仍在 `requestSave` 顶部且早于 `cancelAutoSaveRef`。

## 结论

**本轮 0 条新 P0/P1。** 第 69/70 轮两个新代码路径实测按预期工作；保存/自动保存/草稿无重复全文序列化与写放大；1 MB 读数与第 64/65/67 轮基线同量级。

## 观察（P2，不阻塞，未入池）

1. `settleSourceComposition` 的收尾函数无论成功或拦退都会把 `sourceComposingRef.current` 置 false（`src/App.tsx:4560`）。若走「拦退」分支（`live` 变短，`:4565`），组合标记已清，之后 `Ctrl+S` / 自动保存不再拦未提交组合。真输入法丢字才走到；CDP `blur` 必派 `compositionend`，**本轮无法复现，UNVERIFIED**。
2. 每次保存成功都会把同一路径的 `.sidelight/drafts/<名>` 删除两次（`.tmp/r72-fc-perf.json` 的 `idleOps` 两条同毫秒 `delete`）。无数据影响，只是多一次目录查找。
