# 第 125 轮实现（executor）

轮前 `startSha=d32b72b`；改动只 4 个源文件 + 本轮 E2E/截图。未 commit、未 push、未动 `release/`、未改版本。

## A1 对话上下文跟选区/光标走

**状态：完成。** 4 个源文件，`git diff --stat -- src`：

```
 src/App.tsx                   | 10 ++++-
 src/components/MarginRail.tsx | 16 ++++---
 src/lib/chat.test.ts          | 99 +++++++++++++++++++++++++++++++++++++++++++
 src/lib/chat.ts               | 31 +++++++++++++-
 4 files changed, 147 insertions(+), 9 deletions(-)
```

- `src/lib/chat.ts`：新 `chatContextFor(blocks, from, to, limit = CHAT_CONTEXT_LIMIT)`（`:28-52`）。规则：有选区 → `buildContext` 取覆盖块；无选区且光标在**第一块内**（含文首）→ 全文（块文本 `\n\n` 连）取开头 `limit` 字；其余 → `buildContext` 的「段 + 前后各一段」。`buildContext(…, limit)` **显式传 limit**（默认 1500 会静默少 25%）；`[before, selection, after]` 以 `\n\n` 连后过 `chatContextOf(…, limit)`。按 review C-5 落地「第一块内」特例（点第一段与打开即问同一条路径，落差消失）；C-3 的 2,600 块边界在单测里避开（光标写 2,700）。
- `src/App.tsx:6034-6041`：`getChatContext` → `getChatSource`，返回 `{ blocks: readBlocks(editor), from, to }`，含 `viewMode === 'edit'` 守卫（非编辑视图压成 `from:1,to:1` → 开头切片，不给 null）。App **未** import `chatContextFor`（它在常驻 chunk）。
- `src/components/MarginRail.tsx`：prop 类型改 `getChatSource`（`:56`）、解构（`:138`）、`send()` 里 `const source = getChatSource(); const docText = source ? chatContextFor(...) : ''`（`:218-220`，全文件 `chatContextFor(` 恰 1 处），空态说明句改新文案（`:799`，本轮唯一新增文案）。
- `src/lib/chat.test.ts`：25 → **31** 条（⑥ 静态门按 prop 段取；C-1 的开头切片断言并进 ⑤，不新增第 7 条，保持任务书的 923）。② 用 2,700；④ 断 `length === CHAT_CONTEXT_LIMIT` + 末字 `…`；①②③ 断 `> 1,500`。

### 门禁（A1）
- `npx tsc --noEmit`：**exit 0**。
- `node --experimental-strip-types src/lib/chat.test.ts`：**31/31 pass，exit 0**。
- 负向（去掉 `buildContext` 的第 4 参）：**4 红 exit 1**（①②③④ 全红，≥3 的要求满足；`.tmp/r125-impl-negative.log`）；还原后 **31/31 exit 0**。
- 静态门（`git show HEAD:src/App.tsx`）：`indexOf('getChatSource')` = **−1**；HEAD `MarginRail.tsx` 的 `chatContextFor` = **−1**。

## A2 真机证据 + 空态文案

**状态：完成。** 脚本 `.tmp/e2e-r125-a1-chat-context.mjs`（ego CDP 57270、1440×900、假 FSA + 假 `/chat/completions`、`node .tmp/reset.mjs 57270` 后跑）→ `.tmp/r125-a1-chat-context.json`，**S0–S5 全 PASS、allPass true、0 pageerror**：

| 场景 | 实测 |
| :-- | :-- |
| S0 夹具 | 2,638 字，两枚标记都在 |
| S1 打开即问 | `systemLength 2147`（= 改前同一数值）、`hasHead true`、`hasTail false` |
| S2 选末段 17 字 | 选区逐字 `结尾标记乙：最后一段讲收尾与修订，`（17 字）；`hasTail true`、`hasHead false`、system **含这 17 字**、`systemLength 223 ≤2,150`、`lastUser` 逐字相等 |
| S3 光标末段不选 | 选区 0；`hasTail true`、`hasHead false`、`systemLength 223` |
| S4 空白文档 | system 含「（当前文档还没有正文）」（`systemLength 150`） |
| S5a 预览 | `#rail-panel-chat` = **0**（`.rail-tabs` 也 0，rail 整块卸载） |
| S5b 源码态程序化发送 | 面板在但 `panelWidth 0`；`hasHead true`、`hasTail false`、`systemLength 2147`（守卫生效；进源码前光标在第 2/3 段，半守卫只会得到 <1,900，见 review C-2） |
| 截图 | `shots/round-125/chat-context.png`（1 张） |

- 回归：`.tmp/r96-tester-a1a2.mjs` **42/42 PASS**；`.tmp/e2e-r96-a1-chat.mjs` **33/33 PASS**（两条都 0 pageerror，未因口径变化改断言）。r96 脚本会覆写 `shots/round-96/rail-chat.png`，已 `git checkout --` 还原（不属本轮证据）。

## 体积（先算后量，实测）
- `npm run verify` **exit 0 / PASS**：`raw 1,024,574 / gzip 315,738`（HEAD 315,726 → **+12 B**），门阈 315,876 ✓（余 138），硬线 320,000 余 4,262。
- 常驻 chunk `MarginRail-DrxNXyli.js`：raw 21,617 / **gzip9 7,681** ≤ 7,795 ✓（HEAD 7,495 → +186 B，比估算 +90~180 高 6 B）。
- **B-229 复测合计 = 315,738 + 7,681 = 323,419**（HEAD 323,221 → **+198 B**；超硬线 **3,419 B**，仍 `open`，本轮只记不修）。
- `roundtrip` 未跑（未动编辑器/序列化）。

## 偏差与未验
- S2/S3 的 `systemLength` 只有 223（计划表只写 ≤2,150）：该夹具末段只有 32 字，`buildContext` 的选区口径是「覆盖块 + 前后各一段」，2000 上限只在截断时体现；`hasTail`/逐字包含/`lastUser` 三项都成立，不判 FAIL。
- 计划 §3.3 想在一张截图里同时给「末段选中 + 对话页签」：页边栏与正文同滚（`.doc-layout` 在 `.doc-scroll` 内，rail 的 y 随 scrollTop 从 136 → −4,505），文末时对话页签必然出屏；本轮取文首截图（页签 + 空态新句 + 状态栏「选区 15 字」），末段 17 字选区由 S2 的 JSON 逐字证据承担。
- UNVERIFIED：真 WebView2 宿主、真实 IME、真实模型（假 fetch）；CDP 9222–9226 无监听。

## CHANGELOG 一行建议
- 对话页的上下文跟选区/光标走：有选区用选区、光标所在段带前后各一段，刚打开或光标在第一段时仍取开头 2000 字（`src/lib/chat.ts` 的 `chatContextFor`；预览/源码态按文首取）。

## 新踩坑
1. **dev server 的 Vite transform cache 交付了旧的 `MarginRail.tsx` 转换**：文件里空态已是新句、`fetch('/src/components/MarginRail.tsx')` 却回旧句（同一模块的新逻辑又在跑）；`(Get-Item 文件).LastWriteTime = Get-Date` 后立刻恢复。判「文案没落地」前先 fetch 交付字节，别只看磁盘。
2. **页边栏与正文同滚**：`.doc-layout` 在 `.doc-scroll` 内，rail 的 `y` 随 `scrollTop` 变化（实测 136 → −4,505）。想用截图同时证明「文末选中 + 右侧页签」做不到，别为它改布局。
3. **`buildContext` 的选区口径按「覆盖块」取整段**：选一个 17 字的小段，节选就只有该段 + 前后段尾（223 B 的 system），不是 2000 字上限没生效——断上限要用跨块长选区（单测 ④）。
