# 第 53 轮计划审查（critic）· revision 1

审 A1/A2/B1 与 B0（P1 与高风险）。已核对存在：`App.tsx:1054-1076`（setMarkdown 同步 dispatch）、`:2269/:2281`、`:2305`、`:2787-2834`、`:2905-2913`、`:4161-4180`、`:5350-5381`；`styles.css:128-134`、`:212-225`；`lib/settings.ts:37`（STEP 10，130/150/180/200 都能从 UI 到达）。第 1 版审查留 `.tmp/r53-plan-review-v1.md`。
结论：**REVISE**（P1×3、P2×2）。

## 上一版漏洞核对

- H1 **已修**：`plan.md:28` 删掉 overflow 步骤并显式禁给 5 个容器加 `overflow`；`:30` 补 200% 菜单开启 + `elementFromPoint` + 点中生效。
- H2 **已修**：`plan.md:14` 只常驻源码、预览仍整块卸载、`:2129` 守卫与 `:2181` deps 不动；验收有「预览态仍无 `.ProseMirror`」。
- H3 **已修**：`plan.md:16` 改 `textContent` 并写明不用 `innerText`。
- H4/H5 修复不完整 → R2/R3；H6（时间）→ R4。

## R1 [P1] B1 ② 在 `:2798` 传「当前 doc」会被写盘期间的新输入污染

`finishSaved` 在若干 `await` 之后才执行（写盘链 `App.tsx:2916-2933`）。写盘期间打字会让 `contentVersionRef` 前进（`:1777`），但收尾只有 epoch/docId/path 守卫（`:2787-2795`），`savedContentVersionRef`（`:2815`）只写不读。此时传 `editor.state.doc` 会把**没落盘的字**记进基线，`doc.eq` 判等 → 脏点灭、关窗确认与自动保存漏掉这批字。
修：在序列化处（`performCommit` 入口）一并捕获 doc 快照，随 `normalized` 传到 `finishSaved`；或序列化时记 `contentVersionRef`，收尾不等于该值就传 null（退回文本比较）。补验收：打桩把写盘延迟 50 ms，期间打 2 个字，断言收尾后 `dirty===true`，再 `Ctrl+S` 会真写。

## R2 [P1] B1 ③ 只覆盖 `setMarkdown` 分支，漏 skipReparse 出口

② 让源码保存那条路给 `baselineDocRef=null`；而「源码框没改就退出」走 `applySource` 的 `skipReparse`（`:4161-4163`），③ 的条件整段不执行 → 回编辑后 `baselineDocRef` 一直 null，退化成每键整篇序列化（正是 B1 要消掉的 91 ms）。含引用式链接定义的文档载入即进源码（`:2305`），这条路径不罕见。
修：把重记挪到 `:4180` 脏比较旁、放在 `if (!skipReparse)` **之外**——`normalizeForBaseline(sourceText, originalText) === baselineRef.current` 时 `baselineDocRef.current = editor.state.doc`（该比较已算过，零额外成本）。验收补「源码保存 → 不改源码退出 → 30 键 p50 仍达门槛」。

## R3 [P1] 探针 5–30 ms 区间没有对应动作，与门槛仍可能互斥（H5 残留）

改前 126 ms 里 91 ms 是序列化（`findings-code.md:10`），换成 `doc.eq` 后底噪约 35 ms + doc 比较。探针 10 ms → p50≈45 ms；20 ms → ≈55 ms，都超 `plan.md:40` 的「≤42 ms」。计划只写「5–30 ms 记 impl.md」。
修：探针 ≤5 ms 用原门槛；5–30 ms 同时把验收改「p50 ≤ 改前 1/2 且 0 条 >100 ms long task」或直接走 ④ 退路；>30 ms 只走 ④。探针值写进 `impl.md`。

## R4 [P2] A2 的 8 min 与验收体量不匹配

`plan.md:6` 给 A2 8 min，却要 4 档缩放 + 2 档 100% 基线 + 3 个菜单开启 + 截图 + 3 门禁。修：A2 只测 130/200% 与 3 个菜单；100% 的恒等用 `calc(1120px/1)=1120px` 静态核对代替实测；150/180% 有余量再补。

## R5 [P2] A1 的时延与打点断言缺「源码框不改」前提

`:16` 的「出 ≤300 ms」「`sl-parse-done` 前后同值」只在源码框没改时成立；改过源码退出必走 `setMarkdown`（`:1066-1073`），解析会打点、耗时不保 300 ms。修：这两条写明前提，另加功能断言「源码框改一段 → 退出 → 正文含新内容且 `Ctrl+Z` 可撤销」。

## 备注

- B1 ④ 的 `doc.eq` 语义正确：结构相等即「无改动」，撤销回基线判干净；`:2909` 的「没变别写」仍在，多算出的脏不会多写一次盘。
