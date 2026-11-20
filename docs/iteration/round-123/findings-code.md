# 第 123 轮 finder-code 报告（复查，不改代码）

- 轮次 123，轮前 startSha `dcc31f1`（=HEAD，0 产品改动、工作树干净）
- 角色：代码与性能（只读）；dev `http://localhost:5175`、ego 浏览器 CDP 57270、1440×900、假 FSA（9222 不可用）
- **结论：2 条新问题（1 P1 + 1 P2）**；未重复已修 / 已回滚 / 队列条目
- 基线：`npx tsc --noEmit` exit 0；`npm test` **64 文件 910 条 0 fail**（`.tmp/r123-finder-npmtest.log`）；`verify` 未复跑（0 改动，沿用第 122 轮 315,559 B），不重复 B-229

## F1（P1）批注改档后 600 ms 内切换文档，改动被静默丢掉

- 复现（真机 `.tmp/r123-finder-code2.mjs` → `.tmp/r123-finder-code2.json`）：假工作区 a.md/b.md，种子 `.sidelight/annotations/a.json`（一条 `reviewStatus:"open"`）；打开 a.md → 卡片状态下拉选 `resolved` → **立刻**点文件树 b.md → 等 1,600 ms 后磁盘 a.json 仍 `reviewStatus:"open"`、`priority:"none"`；重开 a.md 下拉仍 `open`。对照组：改 `wont-fix` 后等 1,000 ms 再切，磁盘与重开都是 `wont-fix`（同一探针同轮跑出）。
- 机制：批注写盘 effect 用 600 ms 防抖（`src/App.tsx:2120-2147`），cleanup 无条件 `clearTimeout`；切文档时新篇的 `setAnnotations` 触发依赖变化 → 旧计时器被清掉，旧篇改动从未写盘。timer 回调又现读 `fileRef.current`/`cacheDirFor`（`:2133-2134`），即使不清也会拿旧数据写新文档的键，属同一处设计缺口。
- 影响：复核状态与紧急度共用这一条存储；Review Mode 的「改档 → 马上点下一篇」流程会静默丢决定，无提示、无撤销。触发窗口 600 ms，人动作快时可撞上。
- 修法提示：切文档/卸载前 flush 当前 `annotations`（用切换前 file 的 dir+key）；或把待写数据连同文档身份入队，切走后按旧身份落盘。

## F2（P2）对话记录只按 docName 清空：同名文档沿用上一篇的对话

- 复现（真机 `.tmp/r123-finder-code.mjs` → `.tmp/r123-finder-code.json`）：空白文档对话页签发一句（无 Key 走模拟回复，2 条 turn）→ `Ctrl+Alt+N` 新建文档（标题仍 `未命名.md`、正文 `'\n'`）→ 对话记录仍 2 条、`.rail-chat-empty` 0，上一篇的「我：…／侧灯：…」原样留着。
- 机制：清空 effect 只依赖 `docName`（`src/components/MarginRail.tsx:181-184`），而「新建文档」恒命名 `未命名.md`（`src/App.tsx:3189-3195`）；不同目录里的同名文件同样不触发清空。
- 影响：界面把上一篇的对话当本篇历史；送模型的 system 节选用当前正文（`getChatContext`），属展示与理解误导，不是上下文串味。
- 修法提示：改用文档身份键（路径/句柄 + 载入 epoch 或 activeDocId）判清空，不要只用 basename。

## 查重与未重复

- 已修清单里的双页签 / 五档 / 四态 / [AGENT] / 修订快照清单 / diff / 在审列表 / 焦点与体积条目均未重复；B-229（门+常驻 chunk）、B-253（窄窗抽屉压确认框）仍 open；B-233 / B-238 / B-246 / B-248 仍 deferred。
- 与同轮 finder-ui 的侧栏/对话几何、抽屉焦点方向不重叠（`.tmp/r123-finder-ui*.json` 只读查重，未引用其结论）。

## UNVERIFIED

- 真 FSA / 网络盘写延迟：假 FSA 是内存 Map，600 ms 窗口在真盘上的可撞概率未量；真 WebView2 宿主、真实中文 IME、真实屏幕阅读器未跑。
