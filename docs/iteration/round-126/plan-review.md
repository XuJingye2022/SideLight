# 第 126 轮计划复审（critic）· rev 1 · HEAD `8bc0d4a`

**结论：REVISE**（P1×1、P2×2）。上一版：P1-1 已修（`tabIndex={-1}` + 点空白验收）、P1-2 已修（改按切片，唯 `onKeyDown=` 语义见 P2）、P2-3 已修（`matchMedia`）、P2-5 已修、P2-6 已修（行号更正正确）、**P2-4 只修 MarginRail 一侧，App 侧新门按字面永假（P1）**。方案本体（抽屉 Tab 环回 + 面板与抽屉不同时在场）仍可行、在范围内、25 分钟做得完。

## 复核（真机 1024×700，ego CDP 57270，`Emulation.setDeviceMetricsOverride`）
- 抽屉 4 站：`.rail-close`/`.rail-diff-open`/`.rail-review-open`/`#rail-tab-notes`；从 notes 页签 Tab → `.stats-trigger`，其中心 `elementFromPoint` = `.rail-backdrop`，改前红成立。
- P1-1 修法复验（与 `.tmp/r126-critic-probe.json` 同值）：不设 tabindex 点 `.rail-title` → `activeElement=MAIN#editor.doc-scroll`，再 Tab → `.ProseMirror`；JS 给 aside 补 `tabindex="-1"` 后同点 → `ASIDE#margin-rail`，再 Tab → `.rail-close`（均在抽屉内）。
- 接线核对：`MarginRail.tsx:451`（aside）、`:458`（.rail-close 旧 label）、`useDialogFocus.ts:6`（FOCUSABLE 未导出）、`App.tsx:955-958`（openRail 已 rAF 聚焦 .rail-close）、`:4483-4491`（Esc 先面板后抽屉，各自还焦点）、`:5083` + `:6177`（openStatsDetail 走普通 prop，加 deps 安全）、`:6024/6074/6122`、`:2431`（resize→setTick）；`.margin-rail{position:relative}` 确在 `styles.css:1147-1148`；test 链 65 条（→66 成立）。体积沿用上轮实测 315,738（同 HEAD、`git status` 仅 `docs/iteration/round-126/`），预算 315,900 余 162 B。

## P1 混合版本门按字面永假（§4，rev 1 新增）
dev 交付的是 esbuild 转换后的模块（实测 fetch）：`/src/App.tsx` 775,467 B，`<MarginRail` 渲染成 `_jsxDEV(MarginRail,{ appDialogOpen, … })`，属性是对象键——`drawerOpen={…}` 到页面必成 `drawerOpen: …`，故「断 `drawerOpen=` 0/1」两相都 0，永远判混合版本，「不符就 touch」也救不了。`/src/components/MarginRail.tsx` 127,591 B：`tabIndex: -1` 2 次、`tabIndex={-1}` **0** 次，「含 `tabIndex={-1}`」同样永假；`onKeyDown: ` 4 次（既有内联）。§4 的 `matchMedia` 也不是版本标记：`App.tsx:1905` 改前已有 `window.matchMedia('(max-width: 1119px)')`，两相都真。
**修法**：针换成转换后仍存在的字面——App 断 `drawerOpen` 0→1（或 `drawerOpen: railOpen`），MarginRail 断 `onRailKeyDown` 0→2（原样正确）、`tabIndex={-1}` 换 `tabIndex: -1` 或删；两相用 `const appDialogOpen` 做阳性对照。`drawerOpen={`/`tabIndex={-1}` 只留给读磁盘的静态门。

## P2 §3.4 的 `onKeyDown=` 计数会撞既有内联
`MarginRail.tsx` 现有 4 处 `onKeyDown={(event) => …}`（501/567/712/825），加 aside 后全文件 `onKeyDown=` = 5，按「各 1」字面写必红。
**修法**：写 `count(railSource,'onKeyDown={onRailKeyDown}')===1`（上一版原话），`const onRailKeyDown` 各 1 不变。

## P2 省字节回退与 A2 验收冲突
§1 回退顺序「门超砍 A2.1 再 A2.2」，但 A2 正向验收（抽屉开着 `.stats-trigger` + Enter → 面板不在背板下）只由 A2.2 保证，砍了必红。
**修法**：写明 A2.2 不可砍；先砍 A2.1（鼠标路径已由 StatsDetail 的 outside-mousedown 关掉，仅「键盘开抽屉且面板已开」降 UNVERIFIED），仍超再砍 A1 的 `getClientRects`。

范围合规：只做 F1 + A2 顺带，不碰 F2/F3/B-253，不改 BACKLOG/STATE，不 push、不动 `release/`。
