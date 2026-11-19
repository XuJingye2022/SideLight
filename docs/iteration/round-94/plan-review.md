# 第 94 轮计划审查（critic · rev.1 复审）

结论 **PASS**（0 P0/P1，4 条 P2）。红线与体积复核过：无新依赖、不碰 Tiptap schema / 保存链 / `.sidelight`；`MarginRail` 走 `lazy()`（`src/App.tsx:20-21`）不计首屏；`styles.css` 只有 `:309` 一处 260px，改 320 为 +0；print 块隐藏 `.margin-rail`（`:2729`）；`npm test` 无组件渲染 MarginRail，加 prop 不会红。

## 上一版 3 条 P1 逐条复核（均已修）

- **P1-1 floor 丢 chrome 底**：修了。步 2 的 flowBottom 起点改 `max(.rail-head 底, .rail-tabs 底) − railRect.top`（≥0），再进 `panel.children` 循环；验收 ④ 补「首卡 ≥ 页签底+2 + elementFromPoint」。`top` 删硬底 40 后由 `max(natural, floor+12)` 兜底（flowBottom ≥58 > 40−12，无空档）。
- **P1-2 [−2, 4] 不可达**：修了。改 ① 每卡 `top === max(natural, 上卡底+12)` ±1（首卡 floor=flowBottom）、② 往返 ≤1 px、③ 严格递增，与 `App.tsx:2397-2408` 的 `floor = top + height`、`Math.round` 逐项对得上。模拟流必出 meta（`src/lib/ai.ts:267,278`）→ `.rail-goal` 恒在，flowBottom 走 goal/notice 底；第三段「自然位」按夹具量级可达（段 3 natural ≈230，goal+mock 提示底 ≈134）。
- **P1-3 guard 吞气泡**：修了。guard 只包 flowBottom/tops/railSpace，气泡段 `App.tsx:2417-2429` 留外面。
- P2-1 也已修：`BACKLOG.md:14` 有 B-221（planned）。

## 4 条 P2（不影响 PASS，执行时照改）

1. 自然位分支写「reload 后」，但场景 A 先 `localStorage.clear()`、正文是 `setContent` 灌的，reload 即空。要写明「reload 后重灌同一夹具」（照场景 B 措辞），否则该行跑不了；`natural−flowBottom ≥ 40` 建议同时断言或记录实读数，别让它静默变空。
2. 场景 B 的回包格式没写：`readSse` 只认 `data: {...}`（`src/lib/ai.ts:132-177`），内容再按 JSON Lines 切（`annotations.ts:122-138`）；evaluation 的 `quote` 必须能在夹具里定位，否则进未定位、卡 0。建议写死 `data: {"choices":[{"delta":{"content":"{\"kind\":\"evaluation\",\"quote\":\"<段 2 首句原文>\",\"note\":\"…\"}\\n"}}]}`。`{apiKey:'e2e', baseUrl:'http://localhost:5175/__mock'}` 形状对（`settings.ts:38,155` 只看 apiKey）。
3. 两个 `role=tabpanel` 无 `aria-labelledby`：补 `rail-tab-<tab>`；`<aside aria-label="页边批注">` 现在也装对话，宜改中性标签。
4. 验收 ② 的「往返 ≤1 px」暗含滚动不变：切对话时 notes 面板 `hidden`，若该面板（卡+spacer）撑起页面高度，`scrollTop` 会被夹，`coordsAtPos` 的 natural 随之变。本夹具（≈520 px < 900）测不出，真实长批注文档会。改：断言前要求 `scrollHeight` 不变，或把该条限定 `scrollTop=0`。

工作量：25 分钟可完成；门禁 `npm run build` / `npm run verify`（≤313,000 B，余量约 300 B，超了按计划先删 hint）/ `npm test` 57 文件 778 条。
