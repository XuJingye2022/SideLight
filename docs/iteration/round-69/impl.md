# 第 69 轮 impl（executor）

轮前 HEAD=`2f5259f`；端口 9222（E2E 前 `node .tmp/reset.mjs 9222`）；dev 5175 未重启；版本 0.32.1 未动。

## B1｜delta 回归 — PASS（`.tmp/r68-delta.json` `allPass:true`，合成脚本 `.tmp/r69-delta-compose.mjs`）

- **B-115**（`.tmp/e2e-r62-b1-a.mjs` → `.tmp/r69-b115-scroll.json`）：1 MB 进 p50 **1,205**（≤1,500）、退 **300**（≤600）；100 KB 进 **124**（≤200）、退 **57**（≤400）；`scrollDiff` 7+20 轮全 0；parse 3→3、4→4；0 错误。轮前 1,232/312（−2.2%/−3.8%）。
- **遮罩 / parse**（`.tmp/e2e-r66-impl-b1.mjs` → `.tmp/r69-b115.json`，最终代码复跑）：三案 verdict 全 true；未改动进 1,206 / 退 302、无遮罩、parse 3→3；改 10 字退出 **4,551** ≤5,330、遮罩 105 ms 于第二帧、长任务晚于遮罩、parse 3→4；100 KB 147 ms。
- **A1** `.tmp/e2e-r68-impl-a1.mjs` → `.tmp/r69-a1.json` 6/6：1 写 1,000,013、drafts 0；再退 0 写；`autoSave:false` 草稿 1、盘不变。
- **A2** → `.tmp/r69-a2.json` 12/12；**A3** → `.tmp/r69-a3.json` 13/13（未改 UI，无截图）。
- **B-120** `.tmp/e2e-r62-b2.mjs` → `.tmp/r62-b2.json`：文档 1 写 / 草稿 0；`autoSave:false` 文档 0 / 草稿 1。
- **`exitSourceEdited`** `.tmp/e2e-r68-finder-code.mjs` → `.tmp/r69-code.json`：1 MB 改 10 字退出 **5,160** ≤5,330（轮前同脚本 5,194，−0.7%；遮罩 4,520 上屏），ops 仅 `big.md:1000033`（无草稿）；100 KB 700 ms。
- plan 写的 `e2e-r67-delta.mjs` 实为保存/撤销/中途退出三案，不含 B-115；B-115 由 `e2e-r62-b1-a` + `e2e-r66-impl-b1` 覆盖。偏差均 <10%。

## B2｜B-149 组合第二、三出口 — 完成（先测后修）

- **先测红**（`.tmp/r69-b2-before.json` ×2）：组合中 Ctrl+S 写 `small.md:100015`（起首 `zhong`）、无提示。
- **修**（`src/App.tsx`）：① `requestSave:3330-3335` 组合门 → 「先完成候选字，再保存。」；② `settleSourceComposition:4531-4566`：blur → 等一次 `compositionend`（≤300 ms）→ 读现值；等不到且 value 变短 → 「先完成候选字，再退出。」留在源码；③ `switchView:4568-4583` 退出前先收尾，现值经 `pendingSourceLiveRef`（`:654`）交延迟的 `applySource`（`:4594-4600`）。文本仍在则放行（A2 的 Esc 断言不假红）。
- **后测绿**（`.tmp/e2e-r68-impl-b2.mjs` → `.tmp/r69-b2-after.json`，allPass:true、0 错误）：组合中 Ctrl+S 0 写 + 提示 ×2；提交后 Ctrl+S 写 100,011（中 +1、无 zhong）×2；提交后 Esc 正文首字「中」、1,597/1,591 ms 写盘 ×2；未提交 Esc：blur 后 `compositionend`（data=zhong）、value 长度不变 → 不拦退。
- **UNVERIFIED**：CDP 合成 IME blur 提交原始串 zhong（场景 C 仍落拼音；真 IME 应提交「中」）；拦退分支造不出；真 IME / WebView2。

## 门禁

tsc exit 0；`npm test` 40 文件 **520 条 pass 520 / fail 0**；`npm run verify` PASS，gzip **301,886 B**（余 18,114；+192）。roundtrip 未跑（未动内核与序列化）。

## BACKLOG / CHANGELOG

B-149 → `fixed`（P1）。CHANGELOG：源码态组合中输入 Ctrl+S 不再写未提交拼音（提示「先完成候选字，再保存。」），退出源码先等 `compositionend`（≤300 ms），候选字丢才拦退。

## 新踩坑

1. 提示气泡类名是 `.toast`/`.toast-text`（`role=status`），不是 `.notice`；按后者取恒空会假红。
2. CDP `imeSetComposition` 下 blur 会派 `compositionend`，但提交原始组合串（zhong），不能证明真 IME 行为。
3. Esc 链在 `switchView` 后紧跟 `focusEditor()`，textarea 先被 blur；判「仍在组合」只能在 `switchView` 入口读 `sourceComposingRef`。
