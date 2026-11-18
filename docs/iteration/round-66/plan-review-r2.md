# 第 66 轮 plan 审查（critic · revision 1 复核）

结论：**REVISE**（新 P1 2 / P2 3）。上一版 P1-1～P1-4 已修好，方案可行、无红线冲突。计划 6,404 B 超 6 KB 上限，顺手压回。首版审查留在 `plan-review.md`。

## 上一版修复核对（通过）
P1-1：新 effect 放在 `:3631-3635` 之后成立——ref effect 的依赖链（scheduleAutoSave←runAutoSave←prepareSave←currentMarkdown←sourceText）每键换引用，同 commit 先赋 ref，`:3178` 取到新串；删 `:2132-2136` 与 `:682` 守卫等价；`finishSaved`（`:2955/:2967/:2981`）把基线/originalText/dirty 一起更新，保存后闸门自动关。P1-2/P1-3/P1-4：断言与加固到位（`:1778` 无 position、`:1811` 72vh 已核；A2 数字与 `.tmp/r63-tester-b2.log` 一致）。P2-1 的「排队中」是真判别式，P2-2 已改。

## P1-5（新）A1 给 1 MB 源码逐键多加一次 App 渲染，A2 门槛挂错档
`scheduleAutoSave`（`:3622-3629`）每次先 `cancelAutoSave`→`:3527 setAutoSaveScheduled(false)` 再 `(true)`；源码态该 state 平时为 false，新 effect 每键都调，两 update 成批 → 每键多一次 App 渲染；1 MB 单次渲染含 `:5731 countText` ≈120 ms（B-139：10 键 11 条 ~120 ms）。A2 的 2,900 ms 挂在「关」档（off 时 `:3623` 立即 return，测不到），而 2,618 ms 基线原本是「开」的测法；`settings.autoSave` 默认 true（`settings.ts:54`）→ 默认配置每键约 +120 ms，与 A2 标题「不加重卡顿」相反，验收看不见。
修：门槛改挂「开」腿（同一段 10 键记 typingMs，改前 2,618），「关」腿只验写盘；超门槛就给 scheduleAutoSave 加 `autoSaveScheduledRef` 去重（只在 false↔true 时 setState），或把 Δ 写进 impl 记取舍。

## P1-6（新）B2 遮罩期间键盘输入仍进 textarea，应用后静默丢失
遮罩只挡指针（不可聚焦 div），textarea 仍可编辑。Esc 退出源码时 `:4038-4041` 先 toggleSource 再 `focusEditor()`，而编辑块 `hidden={sourceMode}`（`:5625`）被 `styles.css:326` 收成 visibility:hidden，`focusEditor`（`:351`）聚焦不进去 → 焦点仍留在 textarea。应用期间键入的字进 `setSourceText`，延迟的 `applySource` 却用点击时闭包 → 被 setMarkdown 覆盖，之后 `currentMarkdown()` 取编辑器内容，字永久丢失（100 KB ~0.6 s、1 MB ~4.5 s 窗口）。
修：应用期间 textarea 加 `readOnly={applyingSource}`（或把焦点移到遮罩）；验收加「期间键入 3 字，完成后正文与 textarea 都不含」，证明被拒而非被吞。

## P2-3 源码态缺输入法组合闸门
`composeUntilRef` 只在编辑器 DOM 上设置（`:3656-3674`），`:3551` 的闸门在源码态恒为 0；停笔 2 s 撞上组合暂停会把拼音片段写进文件。修：textarea 加 `onCompositionStart/End` 置同一 ref，结束时补排一次；真 IME 记 UNVERIFIED。

## P2-4 B2 验收三处口径
① `auto-save-ok` 是 tone 类（`StatusBar.tsx:75`，源自 autoSaveState），排队中与已保存同类 → 判别不了，删掉或改断 label 文本；② `longtask` 非 buffered entry 类型，observer 须在点击前装好，否则抓不到 4,262 ms 那条；③「第二个 rAF」写明是测试自己的双 rAF，窗口节流（两帧 >500 ms）记 UNVERIFIED 不判红。

## P2-5 遮罩无兜底
`applySource` 抛错或 rAF 被节流时 `applyingSourceRef` 永真、遮罩永驻，视图切换全失效直到刷新（工具栏在遮罩外可点）。修：try/finally 清状态与 ref，并加 setTimeout 兜底（第二帧 >500 ms 直接 apply）。

## 其余
B1 门槛与本轮实测一致；B2 单点覆盖成立；A1 删 persistDocKey 不丢行为；`exportAs` 无遮罩已写未验。A1+A2 25 分钟仍偏紧（上一版已提示，revision 又加 A2 两腿），建议 1 MB 两档并入 B1。
