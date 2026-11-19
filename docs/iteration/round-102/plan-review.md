# 第 102 轮计划审查（critic · revision 1 复核）· REVISE

审 `docs/iteration/round-102/plan.md`（revision 1，**6,133 B**）。CR-1/2/4 已落实；**CR-3 的删法经实测会让修复完全失效（1 条 P1）**，另 1 条反向用例期望错（P2）。范围、体积、红线、25 分钟都不用改。

## 复核实测

- HEAD `bdd0c17`；`node scripts/measure-first-screen.mjs --max 400000` → gzip **315,146** PASS；`dist/assets/MarginRail-drYIOrhj.js` raw 18,336 / gzip **6,489**；门+chunk **321,635**，与计划、B-229 一致。`--max 315200`（余 54 B）与 chunk ≤6,760（余 271 B）口径可行。
- 静态基线：`git grep -c 'rail-tab-notes' -- src`=**1**；`requestAnimationFrame`（`MarginRail.tsx:375`）=**1**；`MarginRail.tsx` 的 `document.activeElement`=**0**；`lastTabRef`=**0**。计划四条判据对；`useRef`/`useEffect` 确在 `:1` 导入。
- 落点与 `App.tsx:6026-6030`（先 `setRailTab('notes')` 再 `runAnalysis`）、`MarginRail.tsx:636-642`（对话面板 `hidden`）、页签 `:351-381` 相符。

## 上一版 CR 落实

- CR-1 **已修**：A2-5 加了「填输入 → 点正文 → 合成点击 `.rail-chat-generate` → 200/1,800 ms 焦点仍 `.ProseMirror` 且批注面板可见」，能测出守卫条件性。
- CR-2 **已修**：A2-6 与验收 5 改为「门 315,146 + 新 chunk X = 新总 Y，B-229 超线 Y−320,000」，实跑 `--max 315200`、chunk ≤6,760，不再写「B-229 未变」。
- CR-4 **已修**：「出圈」段写明 `findings-code.md` F1（P1）交 lead 入池、单开一轮。
- CR-3 **采错**：见 CR-5。

## 漏洞

- **CR-5（P1）守卫读到的不是 `body`，修复不会生效**：`hidden`/`disabled` 落地时浏览器并不同步 blur。本页实测（ego 浏览器 CDP 57270、React 19.3.1）：① 聚焦按钮的祖先加 `hidden`（或按钮 `disabled=true`）后，同步 / microtask / `setTimeout(0)` / `MessageChannel` / 第一个 rAF 读 `document.activeElement` **仍是那个按钮**，到第二个 rAF 才回 `BODY`；② 用页面自身 React 19.3.1 挂最小组件（点击后把祖先置 `hidden`），`useEffect([open])` 里读到的 `activeElement` 是 `#probe-btn`，不是 `BODY`。因此 A1-2 的 `if (document.activeElement !== document.body) return` 在键盘与鼠标两条路径都早退，`#rail-tab-notes` 永远拿不到焦点，A2-2/A2-3 必红。旧 CR-3 的「`panel.contains(active)` 不可达」来自 1.8 s 后才采样的 T3/S3，晚于下一次绘制，结论作废。**修**：守卫反过来——`const active = document.activeElement; const chat = document.getElementById('rail-panel-chat'); if (active && active !== document.body && !chat?.contains(active)) return`。正文（CR-1 用例）、页签自身、其他可见控件早退；只有焦点已丢（`body`/null）或在被收起的对话面板里时才接管。不要只留 `body` 判据。
- **CR-6（P2）A2-4 ④ 的期望与 Chrome 实际相反**：真实鼠标点页签会把焦点给页签（实测：聚焦 `.ProseMirror` 后 `ego_click('#rail-tab-chat')`，`activeElement='rail-tab-chat'`、`aria-selected=true`）。所以「焦点仍 `.ProseMirror`」在任何实现下都红。**修**：④ 改用合成点击（`page.evaluate(() => document.getElementById('rail-tab-notes')?.click())`，与 CR-1 同法）再断言焦点仍 `.ProseMirror`；或断言「焦点在刚点的页签」。

## 结论

**REVISE**——只改 A1 守卫（CR-5）与 A2-4 ④（CR-6）。产品方案、体积口径、范围不变；改完按 v3 直接进执行，不再复审。
