# 第 118 轮计划审查（B-244）

结论：**PASS**。改法、范围、体积与验收方向成立；6 条 P2 在跑时按修法改，不改范围/门槛。

## 已核（HEAD `8acf11a`，本机实跑）

- 缺陷成立：`MarginRail.tsx:764` 开标签确无 tabIndex（r112 快照 `.tmp/r112-finder-ui3.json`：`tabIndex:-1`、`attr:false`、`logFocusableByTab:false`）。
- 落点与样式在：`styles.css:1542-1546`（`max-height:calc(100vh - 300px)` + `overflow-y:auto`）、`:192-195`（全局 `:focus-visible`，`--focus-ring:2px solid`，`:26`）；`role`/`aria-live`/`aria-busy`/`aria-label`/`ref` 都在 `:764`。
- 机械门不破：`chat.test.ts:206/284` 的 `/<div\b[^>]*className="rail-chat-log"[^>]*>/` 加属性仍匹配；该文件现 24 条（`^test(` 实计）；`npm test` **62 文件 896 条 0 fail**（本机重跑合计）。
- 体积同数：`node scripts/measure-first-screen.mjs --dir dist --max 320000` = gzip **315,509** / raw 1,023,714 / files 3 / 余 4,491 / PASS；`MarginRail-DLBLEtnF.js` raw 20,960 / gzip9 **7,392**；B-229 合计 322,901。轮前 `--max 315800` 余 291（与 r117 同门），+≤12 B 风险低。
- 方案可行：`overflow-y:auto` 元素 `tabIndex=0` 后，PageUp/Home/End 由浏览器默认键位滚它；Tab 序 log→textarea、Shift+Tab 反向落 log 都成立（中间无聚焦元素，r112 backward 首项是「新对话」）。恒 0 不随流式跳 Tab 站的理由成立。
- 范围：只 B-244；不做 B-229/B-233 等，无越界；红线不涉（无依赖、无编辑器/schema；CSS 只 R2 例外）。

## P2

- **H-1 交付检查必假红**：Vite 交付编译后 JS，`fetch('/src/components/MarginRail.tsx')` 里只有 `tabIndex: 0`（`:533` 的批注卡已有），`tabIndex={0}` 永不出现；改成断 `tabIndex: 0` 又会被 `:533` 假绿。修：取 `className: "rail-chat-log"` 起 400 字片段断 `tabIndex: 0`，或删该步、只认 after 的 `log.tabIndex===0`。
- **H-2 滚动断言顺序错**：End 已置 max，其后 PageDown 增 0。修：Home→PageDown（增）→End（max），或每步前复位 `scrollTop`。
- **H-3 keyboard-acceptance 默认连僵尸 5173/9222**（脚本 `:6-7`）。修：A2 写明 `node scripts/keyboard-acceptance.mjs http://localhost:5175` + `SIDELIGHT_CDP=http://127.0.0.1:57270`。
- **H-4 溢出夹具用的是 1,600 字长提问**，不是题述「长回答」（mock 回答很短）。同一滚动容器、机制等价，可留；impl 写清口径，若要贴合原症状可复用 r96 的假 SSE 拉长 assistant 消息。
- **H-5 25 分钟偏满**：A1（before/after 双跑 + verify + 负向）+ A2 五套回归。保序 r112（滚动）、r96（42 断言）先跑，r108/r111/keyboard 可交 tester；超时记路径、不缩断言。
- **H-6 引用错**：312,423 在 `round-117/plan.md:11`，不是 `test.md:22`（那行是 315,509 门值）。
