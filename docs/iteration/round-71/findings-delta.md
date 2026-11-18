# 第 71 轮 finder-delta（轮间回归）

只读，未改产品代码。轮前 `startSha`=HEAD `612e370`（第 70 轮 B-152）。改动面 `git diff 605b5ff..612e370`：`src/App.tsx`（removeFile `:2866-2939`）、`src/lib/workspace.ts`（`fallbackTargets` `:367-385`）、`src/lib/workspace.test.ts`；未碰编辑器/序列化/表格/公式/Mermaid 代码。dev 5175 未重启；CDP 9226，跑前 `node .tmp/reset.mjs 9226`（`{"reset":true,"closed":1}`）。

**结论：无新回归（0 条）。**

## 跑过的相邻路径
`.tmp/e2e-r71-delta.mjs` → `.tmp/r71-delta.json`：`passAll:true`、`pageerror:0`。

T1 非活动文件删除（第 70 轮验收只测活动删除）：
- 打开脏 `a.md`（打「脏A」）→ 删树里的 `b.md`：52 ms 出「已移到回收站：b.md」+ 撤销；title/active 仍 `a.md`，脏字未丢，树 `[a.md,c.md]`；0 pageerror。
- 撤销：`b.md` 回树、「已恢复 b.md」、当前仍 `a.md`、`__vfs` 内容 `# 乙\n\n第二篇\n` 原样。
- `Ctrl+S`：只 1 次 `write:a.md`（含「脏A」）、0 次触 `b.md`、未建 `未命名.md`。
- 打开 `c.md`：表格 1、行内公式 `.katex` 1，均正常渲染。

T2 唯一文件删除（候选为空分支；第 70 轮只测「候选全读不出」）：
- 删 `only.md` → title `未命名.md`、active null、树空、47 ms 提示 + 撤销、toast 无「读不出」附注。
- 撤销：`only.md` 回树；重开内容完整；打「再写」后 `Ctrl+S` →「已保存 only.md」、`get('only.md')` 含「再写」、未建 `未命名.md`；0 pageerror。

## 判读
- 两条路径均未出现保存落点错、撤销失效、脏字丢失或控制台报错；非活动删除未受候选快照计算影响（`src/App.tsx:2867` 只读树）。
- 焦点：撤销后 `activeElement` 落 `BODY`（toast 按钮被替换），对应回调本轮未改，非新回归。
- UNVERIFIED：真实 FSA 磁盘与 WebView2 宿主内的删除/撤销（沿用第 70 轮结论）。
