# 第 51 轮计划审查（critic）· revision 1 复核

结论：**PASS**。审 P1 六条（A1/A2/A3/B1/B2/B3），P2 未审；只读，未改产品代码。上一版 R1–R6 逐条核对，R1/R2/R3 已修掉，R4–R6 也已采纳；无新 P0/P1，余 4 条 P2 不阻塞。

## R1–R3 复核（实测 `src/App.tsx`）

**R1 已修。** 只对 `goal==='file'` 短路；`saveFile:3447-3453` 宿主走 `'host'`、否则 `'file'`，另存为 `:3485`/`:3449`/`:4663`/`:5173`/`:5181` 全走 `saveAsCopyRef`，`:2978-2980` 直接派 `performSaveAs`，不进 `performCommit`。判据 `dirtyRef`：`:621` 声明、`:911` 在 `onUpdate` 同步写（非 effect 滞后），`:743` 只镜像——打字后下一次按键前已 true。无落点不拦，空文档仍能建文件。

**R2 已修。** 新建 `.tmp/r51-fsa.mjs`（`r30-fsa.mjs` 有 200+ 旧脚本 import，不改）；`r30-fsa.mjs:34/:36` 确为 `Date.now()`，改后按 path 存 meta、只在 `close()`（`:67`）后 +1000，三计数分开；假 fs 已有 `showDirectoryPicker:192`/`showSaveFilePicker:193`，「不动字点另存为仍写盘」可测。`diskRef{text,size,mtime}`+单 setter 覆盖 `:1047/:1092/:1159/:2159/:2719/:3554`；`:1047` 传 `initial.raw` 保住空串，回滚 `:2837-2845` 拿 `''` 不再跳过。

**R3 已修。** `:3891` 确为 `event.key==='=' || '+'`、`:3896` 只认 `'-'`；计划写明插 `:3891` 之前、`preventDefault()` 后 return、用 `event.code`+shiftKey，验收补 `--editor-size` 不变。键位重叠消掉。

**R4–R6 已采纳。** `#root{zoom;height:calc(100vh/zoom)}`（`:107-111`、`:125` 不动）+130% 明写必有横条；B1 前后同脚本同 seed（`.tmp/e2e-r51-bug-4.mjs:5-11` 已核）+100 KB 拐点；B2 加 `dataset.fullscreen` 断言 + `git grep -nE`。另核 `settings.ts:68-105` 逐字段回填（加 `pageZoom` 要补 type/默认/回填）、`ShortcutsDialog.tsx:43-49` 正是「视图与字号」组、`:3690` 是 `productCombo` 起点（计划写 `:3699` 实为 `saveFile()`，小笔误不影响方案）。

## 另记（P2，均不阻塞）

**N1（P2）｜A1：mtime 只异步补，首存可能读全文。** 载入站点先存 `mtime:null` 再异步 `getFile()`；若 E2E 在 promise 落地前打字保存，会走「mtime 未知也读」→ `text=1`，验收「1 MB 打一字 `text=0`」假红。修：`:2159` 直接复用加载时已有的一次 `getFile()`（`:2196-2201` 同一 promise）同时填 size/mtime，验收先断言 mtime 已非 null。

**N2（P2）｜A1②的插入位置与 dirty 清理。** `normalized===baseline→return true` 要放在 `deleting`/`generation` 身份守卫（`:2802-2809`）之后，否则删除中保存会从 false 变 true 并继续切换；短路不进 `finishSaved` 时顺手 `dirtyRef.current = false`（真脏但序列化等于基线时，状态栏不会一直挂脏）。

**N3（P2）｜A1 外部改动验收要写清改动方式。** 假 fs 只在 `writable.close()` 动 mtime，外部改必须经 writable 写，否则同尺寸改动 + 无 mtime 变化会命中缓存，`text≥1` 假红。

**N4（P2）｜B1 目标与兜底冲突。** 「110.9 s→≤30,000 ms」是硬验收，但同段又写「热点在 marked/tiptap-markdown 内 → UNVERIFIED」。请标顺序：先按 profile 前三决定写优化还是写 UNVERIFIED，别到点既没优化也没记录。

## 已核无阻塞
- 计划与 HEAD 一致：`fb6fe9a` 是 HEAD `a523a58` 的祖先（`git merge-base --is-ancestor` exit 0），多出的一笔是 v2 流程文档提交，startSha 仍可作 diff 基点。
- 引用有效：`requestSave:2997`、`performCommit:2791`、读回 `:2813`、`finishSaved:2693/:2719`、`--editor-size:1801`、`setFontSize:1804-1807`、`.app` min-width `:125`、`host/Program.cs:1491`、A3 四处视图钮 `:4956-4999`、`data-safety-acceptance.mjs:128/148/309`（上一版已核，本轮任务未变）。
- 单测/体积：A1 动保存链须加/改单测（上一版 `:3554` 一类），`npm test` 33 文件 432 条不许降；A2 只加 CSS 变量与 keydown 分支，首屏 gzip 增量 <1 KB，不触 310,000 B。
