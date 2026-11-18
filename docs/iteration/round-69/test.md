# 第 69 轮 test（tester 独立验收）

**结论：PASS**（含 1 条 UNVERIFIED）。B1 delta 回归 8 项全绿、偏差均 <10%；B2（B-149）两个组合出口从零复验通过。轮前 `2f5259f`，本报告后 commit 推进 HEAD。

## 门禁
- `npm run verify` exit 0：首屏 gzip **301,886 B**（内部 310,000，余 18,114；轮前 301,694，+192）。`.tmp/r69-tester-verify.log`
- `npm test` exit 0：**40 文件 520 条，pass 520 / fail 0**。`.tmp/r69-tester-test.log`
- `roundtrip` 未跑：diff 只含 `src/App.tsx` 的保存/退出路径，不涉编辑器内核与 markdown 序列化。

## B1 delta 回归（8/8 绿）
| 项 | 实测 | 门槛 | 结论 |
| :--- | :--- | :--- | :--- |
| B-115 1 MB 进 p50 / 退 p50 | 1,170 / 294 ms（p95 1,377 / 337） | ≤1,500 / ≤600 | 绿 |
| B-115 100 KB 进 / 退 p50 | 125 / 57 ms | ≤200 / ≤400 | 绿 |
| scrollDiff | 7 + 20 次全 0 | 全 0 | 绿 |
| parse | 1 MB 3→3；100 KB 4→4 | 3→3 | 绿 |
| A1（B-148） | 6/6；1 MB 改字退出 4,538 ms、`big.md` 1 写、drafts 0 | ≤5,330 | 绿 |
| A2（B-145） | 12/12；提交后 2,028 ms 写 100,011 | 全绿 | 绿 |
| A3（B-146/147） | 13/13；Tab 60 次 0 逃出 | 全绿 | 绿 |
| 编辑停笔 1 写 / 0 草稿 | 100 KB：文档 1 写 36,029 B / 草稿 0；`autoSave:false` 文档 0 / 草稿 1 | 同值 | 绿 |
| exitSourceEdited | 5,108 ms（另两口径 4,479 / 4,538） | ≤5,330 | 绿 |

- 证据：`.tmp/r62-b1-a.json`（e2e-r62-b1-a.mjs）、`.tmp/r69-tester-mask.json`（e2e-r66-impl-b1.mjs）、`.tmp/r69-tester-a1.json`、`.tmp/r69-tester-a2.json`、`.tmp/r69-tester-a3.json`（e2e-r68-impl-a{1,2,3}.mjs）、`.tmp/r62-b2.json`（e2e-r62-b2.mjs）、`.tmp/r69-tester-code.json`（e2e-r68-finder-code.mjs）。
- 遮罩路径：1 MB 未改 5 轮进 1,227 / 退 310 ms、parse 3→3、`__maskSeen` 0；改 10 字退出总 **4,479 ms**、遮罩第二帧 105 ms、`elementFromPoint` 命中遮罩非 textarea、4,120 ms 长任务晚于遮罩帧、parse 3→4、焦点回 `.ProseMirror`。100 KB 改字退出 151 ms。
- **偏差 >10%：无**。相对 `.tmp/r68-delta.json` 基线：1 MB 进 −2.9% / 退 −2.0%，100 KB 进 +0.8% / 退 0%，exitSourceEdited −1.6% / +5.0%，编辑停笔同值；全脚本 0 控制台错误。

## B2（B-149）PASS — `.tmp/e2e-r69-tester-b2.mjs` → `.tmp/r69-tester-b2.json`
- **第二出口（Ctrl+S）**：100 KB 源码 `imeSetComposition('zhong')`（textarea 100,015、含拼音）→ `Ctrl+S` **0 写**（文档与草稿都算）、盘不变 100,010、提示「**先完成候选字，再保存。**」、仍留源码。
- **提交后**：`Input.insertText('中')` → 100,011 无 zhong；`Ctrl+S` **恰 1 写** `small.md:100011`，`count('中')` 2,323→2,324、无 zhong、无草稿；3.1 s 后 0 额外写。
- **第三出口（Esc 退出）**：组合→提交「中」→ `Esc` 退出到编辑，正文首段「中# 小文档…」、`count('中')` 2,324（+1）、无 zhong；**1,597 ms** 写盘（≤3,400），终盘 100,011 无拼音、0 草稿。
- **边界（未提交组合按 Esc）**：未走拦退分支——blur 前 value 100,015，`compositionend` 事件 data `zhong`、value 未变短，退出窗口 **0 写**，按 H4 放行退出（代码 `src/App.tsx:4531-4566` 只在「value 变短」时拦退）。组合结束后可退已由 A2 s4/s4b 覆盖（再写 100,016→100,017）。
- 代码核对：`requestSave` 组合门 `src/App.tsx:3330-3335`（`sourceMode && sourceComposingRef.current` → 提示 + return）；`settleSourceComposition` `:4531-4566`（blur + 等 `compositionend` ≤300 ms，短则拦退）；`switchView` 收尾值 `:4570-4584`、`switchViewRef` `:4717`。0 控制台错误。

## UNVERIFIED
- 真实中文 IME（CDP `imeSetComposition` 造组合；真输入法候选字上屏时序、真 blur 提交内容）与 WebView2 宿主内同一路径；真实 FSA 与真实磁盘文件（合成工作区）。
- **注意（已知边界，非本轮回归）**：CDP 合成组合未提交时按 Esc 会退出并把原始串写入正文（A2 s4 写 100,016 含 `zhong`），与真输入法「blur 提交候选字」不同；拦退分支需真 IME 才能触发，记 UNVERIFIED。
