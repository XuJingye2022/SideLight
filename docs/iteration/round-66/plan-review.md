# 第 66 轮 plan 审查（critic）

结论：**REVISE**。6 条（P1 4 / P2 2），都能在计划文本内改掉；方案可行、无红线冲突（不换 Tiptap、不加依赖、不改 `release/`；不动序列化，`roundtrip` 可不跑）。

核对源：`src/App.tsx:2122-2137`、`:3178-3194`、`:3522-3654`、`:4338-4429`、`:5731`、`src/styles.css:1809-1828`、`.tmp/r63-tester-b2.log`。计划引的行号基本对得上（`:682`、`:1080`、`:3179`、`:4338`、`:4392`）。A1 的 `activeLosses` 风险复核过：`risk.ts` 只拦「定义没了但 URL 还在」，源码态写原文，风险低，可留 impl。

## P1-1 A1 从源码 effect 调 `scheduleAutoSaveRef` 会存下「少一字」的旧文本
`:2122` 的 effect 声明在 ref 同步 effect（`:3631-3635`）**之前**，同 commit 内按声明序跑，所以 `scheduleAutoSaveRef.current()` 仍是上一渲染的 `scheduleAutoSave` → 2 s 后旧 `runAutoSave`→`prepareSave`→`currentMarkdown`（`:3178`）读旧 `sourceText`。编辑器模式不受影响（`serializeBodyNow` 现读编辑器与 ref）；源码模式返回 state 闭包：少最后一字，随后 `finishSaved` 又清 dirty、chip 报「已自动保存」。A1 验收第 1 条会红。
修：排程放进**声明在 `:3631-3635` 之后**的新 effect（`[sourceMode, sourceText, originalText]`），或给 `sourceText` 加 ref 让 `currentMarkdown` 读 ref。草稿支安全（文本按参数传）。

## P1-2 B2「第一条 longtask 晚于该 rAF」在 1 MB 下必然红
源码态每次重渲染都算 `countText(splitFrontmatter(sourceText).body)`（`:5731`；B-139 实测 ~120 ms/键）。`setApplyingSource(true)` 自身触发一次全量重渲染 → 遮罩绘制前已有 ~120 ms 长任务，「第二个 rAF ≤150 ms」也被它吃满。
修：改成「**≥1,000 ms 那条**的 `startTime` 晚于 `maskRafAt`」，50–200 ms 渲染任务写进说明；rAF 预算放宽到 ≤250 ms 并记实测。

## P1-3 B2 遮罩可见性无证据（可假绿）
计划允许截图拿不到就 UNVERIFIED、以 DOM 时间戳为准，但时间戳只证顺序：`.source-layout` 没有 `position: relative`（`src/styles.css:1809-1828`），textarea 高 72vh，遮罩按普通流转插在后面会落到折叠线以下或被盖住，测试照样绿。
修：`.source-layout` 加 `position: relative`，遮罩 `position:absolute; inset:0` + z-index 盖住文本框；验收在第二个 rAF 里记 `getBoundingClientRect()` 与 `document.elementFromPoint(中心)`（须命中），写进结果 JSON 作硬证据。

## P1-4 A2 漏了 A1 重构的编辑器模式草稿回归（B-120）
A1 第 2 步抽取 `onUpdate` 草稿三支（`:1034-1076`），这是 B-120 已修路径；`npm test` 无覆盖（`cache.test.ts` 只测 cache 层）。A2 的「停笔分两档」按上下文只在源码态，编辑器模式无人看。
修：A2 补第 63 轮口径两条编辑器腿（100 KB：开=1 次 write ~36,029 B + 草稿 0；关=文档 0 + 草稿 1），数据在 `.tmp/r63-tester-b2.log`。

## P2-1 A1 的 chip 断言判别不了
finder 基线里源码打字前 chip 已是「已自动保存 11:26」（`.tmp/r66-finder-autosave-source.json`），「文案变『已自动保存』」恒真。
修：改断 `autoSavedAt` 变化或 `.auto-save-saved` 类切换；同一分钟内时间戳不变，别只比子串。

## P2-2 引用与选择器要统一
`.tmp/r63-tester-b2.json` 不存在（数字在 `.tmp/r63-tester-b2.log`：`write:36029`、`autoDraftWrites:0`）；第 5 行「其余 5 路」应为 4 路；第 2 步 `source-applying` 与验收 `[data-source-applying]` 二选一（建议都挂：类给 CSS，data 给测试）。

## 其余通过
B1 门槛与本轮实测一致（1 MB 进 1,172 / 100 KB 116 ms）；B2 的 `switchView` 单点覆盖成立（`toggleSource`/`backToRich`/Esc→`toggleSourceRef`/`togglePreview` 都走 `:4392`）；`exportAs`（`:4528`）无遮罩已写进未验，可接受。
提醒：A1+A2 含 1 MB 用例与两道门禁，25 分钟偏紧；A2 打字档未写 autoSave 开关，建议「关」测开销、「开」测写盘。
